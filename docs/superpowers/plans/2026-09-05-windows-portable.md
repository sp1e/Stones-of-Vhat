# Portable Windows Courtyard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the existing PC courtyard as an offline portable Windows x64 executable, retaining the separate PC web build.

**Architecture:** A sandboxed Electron shell serves the unchanged production renderer from a privileged local app://game/ origin. A separate desktop manifest contains no runtime npm dependencies: Vite has already bundled Three and Rapier. File serving has a small asset allowlist, denied external navigation/network/permissions, and persistent user-data storage independent of portable extraction.

**Tech Stack:** Existing Three/Rapier/Vite/Playwright; Electron 44.2.0; electron-builder 26.15.3.

---

## Scope and file map

Work only in C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation, branch codex/vadstena-runtime-foundation. Wait for browser implementation and review gates before taking ownership of package.json or README. Coordinator owns this plan and team-state.md.

Create:
- game/desktop/package.json — minimal packaged app identity.
- game/desktop/policy.mjs — URL, asset path and permission policy, independent of Electron.
- game/desktop/main.mjs — Electron lifecycle and hardened window/protocol.
- game/electron-builder.yml — local unsigned x64 portable and unpacked packaging.
- game/scripts/build-desktop.mjs — Vite production build with desktop base/output.
- game/tests/desktopPolicy.test.mjs — native real policy tests.
- game/desktop-tests/app.spec.mjs — actual unpacked executable and persistence/security tests.
- docs/superpowers/plans/2026-09-05-windows-portable-results.md — evidence and artifact details.

Modify:
- game/package.json, package-lock.json — exact dev dependencies and scripts only.
- game/tests/browserFoundation.test.mjs — extend its script contract, retain all existing assertions.
- game/.gitignore — ignore /desktop/renderer/ and /release/.
- game/vite.config.ts — exclude generated renderer, release and test-profile paths from development watching; keep existing base and diagnostics boundary.
- game/README.md — actual commands/artifact/profile location and limitations.

Generated and ignored:
- game/desktop/renderer/ — desktop-only production output.
- game/release/win-unpacked/ — real unpacked distribution.
- game/release/Vadstena-0.1.0-win-x64-portable.exe — portable distribution.
- game/.playtest/desktop-* — test profile and captures.

No mobile work, engine rewrite, IPC bridge, Node access in renderer, updater, website changes, publication, signing certificate discovery, or installer. Gore preference still defaults on; this milestone does not add gore visuals or NPCs.

## Security checkpoint during implementation

Defender detected and quarantined the first generated unpacked Vadstena.exe as Trojan:Win32/Cinjo.O!cl (events 1116/1117). Builds and launches stopped; no assistant restored quarantine or modified Defender. Simon then explicitly reported allowing the files himself. The generated exe remained absent. Read-only checks matched the cached 158,199,548-byte Electron Windows x64 ZIP to the independently fetched official release SHA-256: 4021363e3090d67a144ebedb90765cf193b0e61f300c519c83f0174502a481da. The base electron.exe is also NotSigned; whole-file SHA-256 07b043bf9b0a0ac14a82fac0b612b7b7ed13cde727d706d74e41a45278ab51f1, executable .text SHA-256 5f886a6a215947a50097991314ec54f60bde33387a429eff0bc5c417e5d024d3.

These are provenance checks, not proof that the detection was false. Resume with one controlled unpacked build from this verified base, compare its .text before launching, and stop again if Defender quarantines or raises a new detection. Keep the detection, user's allowance and test limitations in the final results. No security exclusions, settings changes or quarantine restoration by the assistant.

## Task 1: Secure desktop build and executable acceptance

One owner implements the closely coupled shell/build/test task. Tests come before production code. Browser code is not redesigned. Any discovered interface mismatch gets a concrete regression and a documented adjustment, not weakened acceptance.

- [ ] **Step 1: Write policy tests and observe the missing feature.**

Create game/tests/desktopPolicy.test.mjs:

```js
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

test('desktop policy confines files and pointer lock to the local game', async () => {
  assert.ok(existsSync(new URL('../desktop/policy.mjs', import.meta.url)),
    'desktop policy must exist');
  const { isGameUrl, assetPath, permitsPointerLock } =
    await import('../desktop/policy.mjs');
  assert.equal(isGameUrl('app://game/'), true);
  assert.equal(isGameUrl('app://game/assets/main-123.js'), true);
  for (const url of ['https://game/', 'app://evil/', 'app://game:80/',
    'app://user@game/', 'file:///C:/secret', 'not a url', 'app://game.evil/']) {
    assert.equal(isGameUrl(url), false, url);
  }
  const root = resolve('test-renderer');
  assert.equal(assetPath(root, 'app://game/'), join(root, 'index.html'));
  assert.equal(assetPath(root, 'app://game/assets/main-A1.js'),
    join(root, 'assets', 'main-A1.js'));
  for (const url of ['app://game/secret.txt', 'app://game/assets/%2e%2e%2fsecret',
    'app://game/assets/a%5cb.js', 'app://game/assets/a:b.js',
    'app://game/assets/%00.js', 'app://game/assets/%zz',
    'app://evil/assets/main.js', 'app://game/assets/../package.json']) {
    assert.equal(assetPath(root, url), null, url);
  }
  assert.equal(permitsPointerLock('pointerLock', 'app://game/', true), true);
  assert.equal(permitsPointerLock('pointerLock', 'app://game/', false), false);
  assert.equal(permitsPointerLock('media', 'app://game/', true), false);
  assert.equal(permitsPointerLock('pointerLock', 'https://evil/', true), false);
});
```

Run from game: `rtk proxy node --test tests/desktopPolicy.test.mjs`.
Expected FAIL at "desktop policy must exist". Record the actual failure.

- [ ] **Step 2: Add the executable integration test before creating the shell/build.**

Create game/desktop-tests/app.spec.mjs:

```js
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { _electron as electron } from 'playwright';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const executablePath = join(root, 'release', 'win-unpacked', 'Vadstena.exe');

test('packaged Windows app renders offline, is sandboxed, and persists preferences',
  { timeout: 180_000 }, async () => {
    assert.ok(existsSync(executablePath), 'packaged Vadstena.exe must exist');
    await mkdir(join(root, '.playtest'), { recursive: true });
    const profileParent = await mkdtemp(join(root, '.playtest', 'desktop-profile-'));
    const profile = join(profileParent, 'new-profile');
    assert.equal(existsSync(profile), false);
    async function launch() {
      return electron.launch({
        executablePath,
        chromiumSandbox: true,
        args: ['--user-data-dir=' + profile, '--enable-unsafe-swiftshader'],
        timeout: 60_000,
      });
    }
    let app = await launch();
    try {
      let page = await app.firstWindow();
      await page.waitForFunction(() => {
        const start = document.querySelector('#start');
        return start instanceof HTMLButtonElement && !start.disabled;
      });
      assert.equal(page.url(), 'app://game/');
      assert.equal(existsSync(profile), true);
      assert.equal(await page.locator('canvas').count(), 1);
      assert.equal(await page.locator('#gore').isChecked(), true);
      assert.deepEqual(await page.evaluate(() => ({
        require: typeof window.require, process: typeof window.process,
        diagnostics: typeof window.__yard,
      })), { require: 'undefined', process: 'undefined', diagnostics: 'undefined' });
      const settings = await app.evaluate(({ BrowserWindow }) => {
        const preferences = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
        return { sandbox: preferences.sandbox, nodeIntegration: preferences.nodeIntegration,
          contextIsolation: preferences.contextIsolation, webSecurity: preferences.webSecurity };
      });
      assert.deepEqual(settings, { sandbox: true, nodeIntegration: false,
        contextIsolation: true, webSecurity: true });
      assert.equal(await page.evaluate(() => window.open('about:blank')), null);
      assert.equal(await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().length), 1);
      assert.equal(await page.evaluate(() => {
        try { new Function('return 1')(); return 'allowed'; }
        catch { return 'blocked'; }
      }), 'blocked');
      assert.equal(await page.evaluate(async () => {
        try { await fetch('https://example.com/'); return 'allowed'; }
        catch { return 'blocked'; }
      }), 'blocked');
      assert.equal(await page.evaluate(async () =>
        (await fetch('app://game/package.json')).status), 404);
      await page.locator('#controls summary').click();
      await page.locator('#gore').uncheck();
      await page.screenshot({ path: join(root, '.playtest', 'desktop-exe-menu.png') });
      await app.close();
      app = await launch();
      page = await app.firstWindow();
      await page.waitForFunction(() => {
        const start = document.querySelector('#start');
        return start instanceof HTMLButtonElement && !start.disabled;
      });
      assert.equal(await page.locator('#gore').isChecked(), false);
      assert.equal(page.url(), 'app://game/');
    } finally { await app?.close(); }
  });
```

Run `rtk proxy node --test desktop-tests/app.spec.mjs`.
Expected assertion FAIL "packaged Vadstena.exe must exist", not a missing Playwright/runtime error. Actual Windows windows may appear during this focused executable playtest; do not run a fleet of visible background processes. Add actual resource-error observation around initial load (before deliberate blocked requests) and a visible pointer-lock/movement test if supported. Do not weaken sandbox to make automation work. Record any native pointer-lock limitation separately from Chromium browser coverage.

- [ ] **Step 3: Implement the small policy and shell.**

game/desktop/policy.mjs:

```js
import { join } from 'node:path';

export function isGameUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'app:' && url.hostname === 'game' &&
      url.port === '' && url.username === '' && url.password === '';
  } catch { return false; }
}

export function assetPath(root, value) {
  if (!isGameUrl(value)) return null;
  try {
    const pathname = decodeURIComponent(new URL(value).pathname);
    if (pathname === '/' || pathname === '/index.html') return join(root, 'index.html');
    if (!/^\/assets\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(js|css|wasm|png|jpg|webp|svg|woff2)$/.test(pathname)) return null;
    return join(root, 'assets', pathname.slice('/assets/'.length));
  } catch { return null; }
}

export function permitsPointerLock(permission, url, isMainFrame) {
  return permission === 'pointerLock' && isMainFrame === true && isGameUrl(url);
}
```

game/desktop/package.json:

```json
{
  "name": "vadstena-desktop",
  "productName": "Vadstena",
  "version": "0.1.0",
  "description": "Vadstena: Den åttonde klangen — PC physics courtyard",
  "author": "Game1",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "main": "main.mjs"
}
```

game/desktop/main.mjs:

```js
import { app, BrowserWindow, protocol, session, dialog } from 'electron';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetPath, isGameUrl, permitsPointerLock } from './policy.mjs';

const rendererRoot = join(dirname(fileURLToPath(import.meta.url)), 'renderer');
const csp = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'";
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};
app.setName('Vadstena');
app.setAppUserModelId('se.sp1e.vadstena');
const profileOverride = app.commandLine.getSwitchValue('user-data-dir');
const profilePath = profileOverride || join(app.getPath('appData'), 'Vadstena');
mkdirSync(profilePath, { recursive: true });
app.setPath('userData', profilePath);
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}]);
let window;

app.whenReady().then(async () => {
  protocol.handle('app', async (request) => {
    const file = assetPath(rendererRoot, request.url);
    if (!file || !['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 404 });
    try {
      const bytes = await readFile(file);
      return new Response(request.method === 'HEAD' ? null : bytes, {
        headers: {
          'Content-Type': mime[extname(file)] || 'application/octet-stream',
          'Content-Security-Policy': csp,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch { return new Response(null, { status: 404 }); }
  });
  const gameSession = session.defaultSession;
  gameSession.webRequest.onBeforeRequest((details, callback) =>
    callback({ cancel: !isGameUrl(details.url) }));
  const ownContents = (contents) => !!window && !window.isDestroyed() &&
    contents === window.webContents;
  gameSession.setPermissionCheckHandler((contents, permission, origin, details) =>
    ownContents(contents) && permitsPointerLock(permission,
      details.requestingUrl ?? origin, details.isMainFrame));
  gameSession.setPermissionRequestHandler((contents, permission, callback, details) =>
    callback(ownContents(contents) && permitsPointerLock(permission,
      details.requestingUrl, details.isMainFrame)));
  window = new BrowserWindow({
    title: 'Vadstena: Den åttonde klangen',
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    backgroundColor: '#15231f',
    show: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, webviewTag: false, spellcheck: false,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isGameUrl(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('ready-to-show', () => window?.show());
  await window.loadURL('app://game/');
}).catch((error) => {
  console.error('Vadstena desktop startup failed:', error);
  dialog.showErrorBox('Vadstena kunde inte starta', 'Programfilerna kunde inte läsas. Packa upp eller hämta programmet igen.');
  app.exit(1);
});
app.on('window-all-closed', () => app.quit());
```

Use installed Electron 44 types/source to correct any proven API mismatch before proceeding; preserve the security contract. Default persistent session and stable appData profile must survive portable temporary extraction. No custom test-only production API.

- [ ] **Step 4: Add exact dependencies, build scripts and package configuration.**

Before installing, extend the existing exact devDependency assertion in browserFoundation.test.mjs to the following and observe its mismatch against the current package:

```js
assert.deepEqual(pkg.devDependencies, {
  '@types/three': '0.185.4',
  electron: '44.2.0',
  'electron-builder': '26.15.3',
  playwright: '1.63.0',
  typescript: '7.0.2',
  vite: '8.2.2',
});
```

From game run `rtk proxy npm install --save-dev --save-exact electron@44.2.0 electron-builder@26.15.3`, then `rtk proxy npm audit`. Codacy MCP is unavailable; disclose the gap, do not install a substitute scanner. Inspect any audit findings and dependency changes before claiming safe completion.

game/scripts/build-desktop.mjs:

```js
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  root,
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  base: '/',
  build: { outDir: 'desktop/renderer', emptyOutDir: true },
});
```

game/electron-builder.yml:

```yaml
appId: se.sp1e.vadstena
productName: Vadstena
electronVersion: 44.2.0
directories:
  app: desktop
  output: release
files:
  - main.mjs
  - policy.mjs
  - package.json
  - renderer/**/*
  - '!node_modules/**/*'
electronDist: node_modules/electron/dist
asar: true
npmRebuild: false
win:
  executableName: Vadstena
  target:
    - target: portable
      arch:
        - x64
  requestedExecutionLevel: asInvoker
  signExecutable: false
portable:
  artifactName: Vadstena-${version}-win-${arch}-portable.${ext}
```

Add scripts without replacing existing ones:
```json
{
  "electron:runtime": "node node_modules/electron/install.js",
  "build:desktop": "tsc --noEmit && node scripts/build-desktop.mjs",
  "pack:desktop": "npm run build:desktop && npm run electron:runtime && electron-builder --config electron-builder.yml --win --x64 --dir --publish never",
  "dist:desktop": "npm run build:desktop && npm run electron:runtime && electron-builder --config electron-builder.yml --win portable --x64 --publish never",
  "test:desktop": "node --test desktop-tests/*.spec.mjs"
}
```

Extend browserFoundation.test.mjs's exact script-object assertion first and observe the expected mismatch before package script edits. Add /desktop/renderer/ and /release/ to game/.gitignore. Keep root .gitignore untouched.

Evidence-driven build adjustment: the installed Electron 44 package has no postinstall lifecycle script; its runtime install is lazy. Explicit electron:runtime invokes the pinned package's own checksum-validating installer. Builder's supported electronDist points to that unpacked npm-owned runtime, taking its copy path rather than the observed failing extracted-directory rename. Do not point at release/win-unpacked.tmp. The first ASAR unexpectedly collected the parent game's production node_modules; the explicit exclusion above must pass the actual archive-content regression before acceptance.

Development watcher adjustment: a live preview watched generated Electron profile DevToolsActivePort and crashed with EBUSY; it also reloaded for generated renderer and Electron license HTML. Extend the existing Vite server object, retaining all other configuration:

```ts
server: {
  host: '127.0.0.1',
  watch: { ignored: ['**/.playtest/**', '**/release/**', '**/desktop/renderer/**'] },
},
```

Add a failing config assertion for these exact exclusions before the edit, then exercise generated-path changes without a page reload in browser QA. This is independent of Defender; no root-cause relationship is claimed.

- [ ] **Step 5: Verify actual behavior and artifacts.**

Run from game, inspect every exit status:
```powershell
rtk proxy npm run check
rtk proxy npm run build
rtk proxy npm run test:browser
rtk proxy npm run pack:desktop
rtk proxy npm run test:desktop
rtk proxy npm run dist:desktop
```

Expected: all native/browser tests and strict types pass; both web and desktop renderer builds remain functional; packaged exe renders real Three/Rapier offline; persistent gore false survives full process relaunch; renderer has no require/process/diagnostic globals and effective sandbox stays on.

Before the first post-allowance executable launch, run this read-only Node module from game (for example with `rtk proxy node --input-type=module -e`); it must match the independently verified base code section:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
function textHash(path) {
  const bytes = readFileSync(path);
  const pe = bytes.readUInt32LE(0x3c);
  assert.equal(bytes.readUInt32LE(pe), 0x4550);
  const count = bytes.readUInt16LE(pe + 6);
  const table = pe + 24 + bytes.readUInt16LE(pe + 20);
  for (let index = 0; index < count; index += 1) {
    const section = table + index * 40;
    const name = bytes.toString('ascii', section, section + 8).split('\0')[0];
    if (name !== '.text') continue;
    const size = bytes.readUInt32LE(section + 16);
    const offset = bytes.readUInt32LE(section + 20);
    assert.ok(offset + size <= bytes.length);
    return createHash('sha256').update(bytes.subarray(offset, offset + size)).digest('hex');
  }
  throw new Error('PE .text section missing');
}
const expected = '5f886a6a215947a50097991314ec54f60bde33387a429eff0bc5c417e5d024d3';
assert.equal(textHash('node_modules/electron/dist/electron.exe'), expected);
assert.equal(textHash('release/win-unpacked/Vadstena.exe'), expected);
console.log('Generated executable code section matches verified Electron base.');
```

This deliberately does not label the detection false or validate every runtime behavior. Resource/signature edits are outside .text; inspect the actual ASAR and run the remaining acceptance checks separately.

Perform a focused visible Windows pointer-lock check of the real executable: start through actual button, assert pointerLockElement is canvas, actual movement changes rendered view, Escape returns pause panel. Use Playwright Electron automation rather than adding production diagnostics. Browser simulation ticks are already tested independently. If OS focus/automation prevents pointer lock, retain that as an explicit unverified limitation and do not describe it as passed.

Attempt the same launch smoke against the actual portable executable, with an isolated profile. If self-extraction prevents Playwright attachment, diagnose the launcher and use a narrowly scoped process/startup check; label exactly which behavior was tested on unpacked versus portable. Do not terminate unrelated Electron/Chrome processes.

Inspect file size, SHA-256, version and Authenticode status:
```powershell
rtk proxy powershell -NoProfile -Command "Get-Item -LiteralPath 'release/Vadstena-0.1.0-win-x64-portable.exe' | Select-Object FullName,Length,VersionInfo"
rtk proxy powershell -NoProfile -Command "Get-FileHash -Algorithm SHA256 -LiteralPath 'release/Vadstena-0.1.0-win-x64-portable.exe'"
rtk proxy powershell -NoProfile -Command "Get-AuthenticodeSignature -LiteralPath 'release/Vadstena-0.1.0-win-x64-portable.exe' | Select-Object Status"
```

Expected: nonzero actual artifact, recorded hash/version, NotSigned. Do not claim SmartScreen reputation or absence of warnings. Do not upload. Software-GPU test evidence is not hardware performance evidence.

- [ ] **Step 6: Document, self-review, commit owned files, then independent spec and quality review.**

README additions must give the actual build commands, executable path, PC controls, %APPDATA%/Vadstena profile (portable does not mean all state travels beside exe), unsigned status, offline behavior, prototype scope and known test limits. Results document must record actual RED/GREEN, commands/counts, exact artifact bytes/hash/signature, pointer-lock evidence and separate portable/unpacked outcomes.

Run `rtk proxy git diff --check`, stage only the enumerated implementation files, run `rtk proxy git diff --cached --check`, then commit as `feat: package PC courtyard as portable Windows app`. Never commit artifacts/node_modules/test profiles or other owner's changes. Return exact commit, evidence, owned files and concerns.

## Coordinator self-review

Coverage: PC web retained; Windows portable added; defaults/persistence verified; signed distribution not promised. Historical chapter, magic and gore engine remain later milestones. Security has explicit path/permission/network boundaries; exact dependencies verified by primary published sources. No source code depends on test diagnostics. Build and tests are local and recoverable.

Startup-order correction during implementation: Electron 44's installed electron.d.ts explicitly requires an existing directory before app.setPath. The original draft created it after ready, which was too late for a first-run default profile. The plan now creates it synchronously before setPath, and the executable test uses an initially absent child profile to cover first-run creation instead of only an already-existing temporary directory. This does not establish the cause of any separate observed native launch error; runtime stderr must still be checked.

Primary references:
- [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol/)
- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron 44 session API](https://raw.githubusercontent.com/electron/electron/v44.2.0/docs/api/session.md)
- [Builder 26.15.3 Windows options](https://unpkg.com/app-builder-lib@26.15.3/out/options/winOptions.d.ts)
- [Playwright Electron launch](https://playwright.dev/docs/api/class-electron)

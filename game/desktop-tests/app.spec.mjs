import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { _electron as electron } from 'playwright';
import { listPackage } from '@electron/asar';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const executablePath = join(root, 'release', 'win-unpacked', 'Vadstena.exe');

test('desktop archive contains only the shell and bundled renderer', () => {
  const archivePath = join(root, 'release', 'win-unpacked', 'resources', 'app.asar');
  assert.ok(existsSync(archivePath), 'packaged app.asar must exist');
  const paths = listPackage(archivePath).map(path => path.replaceAll('\\', '/'));
  assert.equal(paths.some(path => path === '/node_modules' || path.startsWith('/node_modules/')), false, 'desktop archive must not copy runtime npm dependencies');
  assert.deepEqual(paths.filter(path => !path.slice(1).includes('/')).sort(), ['/main.mjs', '/package.json', '/policy.mjs', '/renderer']);
});

test('packaged Windows app renders offline, is sandboxed, and persists preferences', { timeout: 180000 }, async t => {
  assert.ok(existsSync(executablePath), 'packaged Vadstena.exe must exist');
  await mkdir(join(root, '.playtest'), { recursive: true });
  const profileParent = await mkdtemp(join(root, '.playtest', 'desktop-profile-'));
  const profile = join(profileParent, 'new-profile');
  assert.equal(existsSync(profile), false, 'first launch must create its own missing profile directory');
  async function launch() {
    return electron.launch({ executablePath, chromiumSandbox: true, args: ['--user-data-dir=' + profile, '--enable-unsafe-swiftshader'], timeout: 60000 });
  }
  async function ready(page) {
    await page.waitForFunction(() => {
      const start = document.querySelector('#start');
      return start instanceof HTMLButtonElement && !start.disabled;
    });
  }
  let app = await launch();
  app.process().stderr?.on('data', bytes => process.stderr.write(bytes));
  try {
    let page = await app.firstWindow();
    const resourceErrors = [];
    page.on('pageerror', error => resourceErrors.push(error.message));
    page.on('requestfailed', request => resourceErrors.push(request.url() + ': ' + request.failure()?.errorText));
    page.on('response', response => { if (response.status() >= 400) resourceErrors.push(response.url() + ': ' + response.status()); });
    page.on('console', message => { if (message.type() === 'error') resourceErrors.push(message.text()); });
    // Observe a complete renderer load, including resources requested before firstWindow resolved.
    await page.reload();
    await ready(page);
    assert.deepEqual(resourceErrors, [], 'initial renderer must load without resource or CSP errors');
    assert.equal(page.url(), 'app://game/');
    assert.deepEqual(await app.evaluate(({ app, session }) => ({ userData: app.getPath('userData'), sessionData: app.getPath('sessionData'), storage: session.defaultSession.getStoragePath() })), { userData: profile, sessionData: profile, storage: profile });
    assert.equal(await page.locator('canvas').count(), 1);
    t.diagnostic('GPU: ' + JSON.stringify(await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return { vendor: gl.getParameter(info?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR), renderer: gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) };
    })));
    assert.equal(await page.locator('#gore').isChecked(), true);
    assert.deepEqual(await page.evaluate(() => ({ require: typeof window.require, process: typeof window.process, diagnostics: typeof window.__yard })), { require: 'undefined', process: 'undefined', diagnostics: 'undefined' });
    const settings = await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: p.sandbox, nodeIntegration: p.nodeIntegration, contextIsolation: p.contextIsolation, webSecurity: p.webSecurity };
    });
    assert.deepEqual(settings, { sandbox: true, nodeIntegration: false, contextIsolation: true, webSecurity: true });
    assert.equal(await page.evaluate(() => window.open('about:blank')), null);
    assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    assert.equal(await page.evaluate(() => { try { new Function('return 1')(); return 'allowed'; } catch { return 'blocked'; } }), 'blocked');
    assert.equal(await page.evaluate(async () => { try { await fetch('https://example.com/'); return 'allowed'; } catch { return 'blocked'; } }), 'blocked');
    assert.equal(await page.evaluate(async () => (await fetch('app://game/package.json')).status), 404);
    await page.locator('#controls summary').click();
    await page.locator('#gore').uncheck();
    await page.screenshot({ path: join(root, '.playtest', 'desktop-exe-menu.png') });
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.show();
      window.focus();
      window.webContents.focus();
    });
    await page.bringToFront();
    await page.waitForFunction(() => document.hasFocus());
    await page.locator('#start').click();
    await page.waitForFunction(() => document.pointerLockElement instanceof HTMLCanvasElement && !document.querySelector('#crosshair').hidden);
    // Let the physical props settle so gravity alone cannot satisfy the movement assertion.
    let before = await page.locator('canvas').screenshot();
    let stable = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await page.waitForTimeout(500);
      const idle = await page.locator('canvas').screenshot();
      stable = before.equals(idle);
      before = idle;
      if (stable) break;
    }
    assert.equal(stable, true, 'the idle courtyard must have a stable rendered baseline');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    const after = await page.locator('canvas').screenshot();
    assert.equal(before.equals(after), false, 'holding W must change the rendered courtyard view');
    await page.screenshot({ path: join(root, '.playtest', 'desktop-exe-game.png') });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.pointerLockElement === null && document.querySelector('#crosshair').hidden && !document.querySelector('#panel').hidden);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await ready(page);
    assert.equal(await page.locator('#gore').isChecked(), false);
    assert.equal(page.url(), 'app://game/');
  } finally {
    await app?.close();
  }
});

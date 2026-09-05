# M1A playable courtyard implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (selected) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the real physics courtyard playable in a local desktop browser, with a restrained first-person view, pause/settings and verified restart cleanup.
**Architecture:** The existing fixed clock drives Rapier independently of rendering; a Three view interpolates snapshots and owns its GPU resources. DOM input/menu adapters own browser listeners and user consent to pointer lock. Keep one renderer across world restarts.
**Tech Stack:** Three 0.185.1, Vite 8.2.2, Rapier compat 0.20.0, native Node tests and Playwright Chromium.

---

## File map

Work only in C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation.
- game/package.json: add browser/build scripts, retain existing scripts/dependencies.
- game/tests/browserFoundation.test.mjs: extend its exact scripts contract with the four required browser/build commands before changing package.json; browser builder owns this narrow adjustment.
- game/vite.config.ts: nested-path build, local-only server.
- game/index.html: loading/paused PC UI, accessibility and recovery messaging.
- game/src/vite-env.d.ts: Vite client types.
- game/src/style.css: sparse HUD and legible paused panel across PC window sizes.
- game/src/render/yardView.ts: Three scene, deterministic stone texture, interpolation and disposal.
- game/src/input/browserInput.ts: physical keys, logical actions, mouse look and listener ownership.
- game/src/main.ts: lifecycle, pause, preference UI, fixed loop and read-only dev diagnostics.
- game/browser/yard.spec.mjs: real Chromium interaction, screenshots, restart/resource checks.
- game/README.md and docs/superpowers/plans/2026-09-05-playable-courtyard-results.md: measured results and clear scope.

Prerequisites: reviewed browser foundation and physical courtyard plans. Do not change approved spec, deploy, add remote, create another worktree, or claim magic/NPC/ragdoll/gore effects are present. This is M1A, not completed M1. Use rtk shell prefix and apply_patch. Missing Codacy MCP remains a disclosed limitation.

## Task 1: Playable browser surface

- [ ] Create browser tests before browser production files, then install the pinned Chromium runtime using `rtk node game/node_modules/playwright/cli.js install chromium`. This is the test browser, not a project package addition.

~~~js
// game/browser/yard.spec.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../.playtest/', import.meta.url));
let server;
let browser;
before(async () => {
  await mkdir(output, { recursive: true });
  server = await createServer({ configFile: false, root, base: '/vadstena/', logLevel: 'error', server: { host: '127.0.0.1', port: 4173, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
});
after(async () => { await browser?.close(); await server?.close(); });
async function ready(page) {
  await page.goto('http://127.0.0.1:4173/vadstena/');
  await page.waitForFunction(() => !document.querySelector('#start')?.disabled && !!window.__yard, { }, { timeout: 5000 });
}
test('desktop movement, pause, preferences and ten in-place restarts', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await ready(page);
    assert.equal(await page.locator('#gore').isChecked(), true);
    await page.screenshot({ path: output + '/desktop-menu.png' });
    await page.locator('#start').click();
    await page.waitForFunction(() => window.__yard().running && document.pointerLockElement?.tagName === 'CANVAS');
    const start = await page.evaluate(() => window.__yard());
    await page.keyboard.down('KeyW');
    await page.waitForFunction(tick => window.__yard().tick >= tick + 35, start.tick);
    await page.keyboard.up('KeyW');
    const moved = await page.evaluate(() => window.__yard());
    assert.ok(moved.position.z < start.position.z - 1);
    await page.screenshot({ path: output + '/desktop-play.png' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__yard().running);
    const paused = await page.evaluate(() => window.__yard().tick);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 160)));
    assert.equal(await page.evaluate(() => window.__yard().tick), paused);
    await page.locator('summary').click();
    await page.locator('#gore').uncheck();
    await page.reload();
    await page.waitForFunction(() => !!window.__yard && !document.querySelector('#start').disabled);
    assert.equal(await page.locator('#gore').isChecked(), false);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const baseline = await page.evaluate(() => window.__yard());
    for (let i = 1; i <= 10; i++) {
      await page.locator('#restart').click();
      await page.waitForFunction(count => window.__yard().restarts === count && !document.querySelector('#start').disabled, i);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(() => window.__yard());
      assert.equal(state.running, false);
      assert.deepEqual(state.counts, baseline.counts);
      assert.deepEqual(state.gpu, baseline.gpu);
      assert.equal(await page.locator('canvas').count(), 1);
      assert.equal(await page.locator('#gore').isChecked(), false);
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
test('context loss pauses and exposes recovery, not a frozen blank game', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  try {
    await ready(page);
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Context-loss extension unavailable');
      extension.loseContext();
    });
    await page.locator('#reload:not([hidden])').waitFor();
    assert.equal(await page.locator('#start').isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__yard().running), false);
  } finally { await context.close(); }
});
~~~

- [ ] Run `rtk node --test game/browser/yard.spec.mjs`. Expected RED: page has no playable start UI. A missing browser executable, occupied port, or module-load failure is a harness error, not successful RED; fix harness first.

- [ ] Add scripts to existing package.json (retain every existing field):

~~~json
"dev": "vite --host 127.0.0.1",
"build": "tsc --noEmit && vite build",
"preview": "vite preview --host 127.0.0.1",
"test:browser": "node --test browser/*.spec.mjs"
~~~

- [ ] Create game/vite.config.ts and game/src/vite-env.d.ts:

~~~ts
// game/vite.config.ts
import { defineConfig } from 'vite';
export default defineConfig({ base: '/vadstena/', server: { host: '127.0.0.1' } });
~~~
~~~ts
// game/src/vite-env.d.ts
/// <reference types="vite/client" />
~~~

- [ ] Create game/index.html:

~~~html
<!doctype html>
<html lang="sv">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#141d1c"><link rel="icon" href="data:,"><title>Vadstena — Teknikgården</title></head>
<body>
<div id="viewport" aria-label="Tredimensionell teknikgård"></div>
<header id="hud"><span class="eyebrow">VADSTENA · DEN ÅTTONDE KLANGEN</span><span id="hint">TEKNIKGÅRD / M1A</span></header>
<div id="crosshair" hidden aria-hidden="true">·</div>
<main id="panel">
  <span class="eyebrow">EN SPELBAR FYSIKSTUDIE</span>
  <h1>Tyngden före<br>klangen.</h1>
  <p class="intro">En stilla gård. Sten under fötterna. Ännu har ingenting vaknat.</p>
  <p id="status" role="status">Laddar fysik och grafik…</p>
  <div class="buttons"><button id="start" disabled>Gå in i gården <span aria-hidden="true">→</span></button><button id="restart" class="secondary" disabled>Börja om</button><button id="reload" hidden>Ladda om sidan</button></div>
  <details><summary>Kontroller och inställningar</summary>
    <p>WASD — gå · Mus — se dig omkring<br>Shift — spring · Mellanslag — hoppa<br>C — håll för att huka · Esc — pausa</p>
    <label class="setting"><input id="gore" type="checkbox" checked> Gore aktiverat</label>
    <p class="small">På från start. Valet sparas lokalt. Den här teknikgården har ännu inga NPC:er, strids- eller goreeffekter.</p>
    <p id="storage-status" class="small" role="status"></p>
  </details>
  <p class="scope">Testa trappan till vänster, den låga passagen till höger och föremålen på gården. Prototypgeometri — inte en historisk rekonstruktion.</p>
</main>
<footer id="footer">FYSIKPROTOTYP <span>WASD · MUS · ESC</span></footer>
<script type="module" src="/src/main.ts"></script>
</body></html>
~~~

- [ ] Create game/src/style.css:

~~~css
:root{font-family:Georgia,'Times New Roman',serif;color:#e8e4d4;background:#141d1c;font-synthesis:none;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;overflow:hidden}button,input,summary{font:inherit}button,summary,input{cursor:pointer}button:focus-visible,summary:focus-visible,input:focus-visible{outline:2px solid #f3d795;outline-offset:5px}[hidden]{display:none!important}
#viewport,#viewport canvas{position:fixed;inset:0;width:100%;height:100%;display:block}
#hud{position:fixed;top:28px;left:32px;right:32px;display:flex;justify-content:space-between;gap:24px;pointer-events:none;text-shadow:0 2px 5px #000}
.eyebrow,#hint,#footer{font:10px/1.5 system-ui,sans-serif;letter-spacing:.2em}#hint{color:#d8c7a3}
#panel{position:absolute;left:6vw;top:50%;transform:translateY(-50%);width:min(460px,88vw);max-height:80dvh;overflow:auto;padding:30px;background:linear-gradient(120deg,#172220f5,#172220e3);border:1px solid #b7a87c48;box-shadow:0 30px 100px #0007}
h1{font-size:clamp(38px,4vw,58px);line-height:1.02;font-weight:400;letter-spacing:-.045em;margin:22px 0;color:#f0e8d4}.intro{font-size:17px;line-height:1.5;color:#c2c9bb;max-width:320px}#status{font:12px/1.6 system-ui,sans-serif;color:#e4ce99;min-height:20px}
.buttons{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}button{border:1px solid #c3ad79;background:#d2ba83;color:#18211e;padding:13px 18px;font:600 12px system-ui,sans-serif;letter-spacing:.035em}button span{margin-left:24px}.secondary{background:transparent;color:#e2d5b6;border-color:#8c927678}button:disabled{opacity:.45;cursor:wait}
details{border-top:1px solid #a6a98930;padding-top:16px}summary{font:12px system-ui,sans-serif;color:#ded6bf}details p,.setting{font:12px/1.8 system-ui,sans-serif;color:#c2c9bb}.setting{display:flex;align-items:center;gap:9px}input{accent-color:#dbc38c;width:17px;height:17px}.small{font-size:11px!important}.scope{font:10px/1.7 system-ui,sans-serif;color:#afb7a8;margin-top:22px}#footer{position:fixed;bottom:22px;left:32px;right:32px;display:flex;justify-content:space-between;color:#d7d6c4;pointer-events:none;text-shadow:0 2px 4px #000}
#crosshair{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font:28px system-ui,sans-serif;color:#f6e6b7;pointer-events:none;text-shadow:0 1px 3px #000}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
~~~

- [ ] Create game/src/input/browserInput.ts:

~~~ts
import { createActionBuffer } from './actionBuffer.ts';
import type { Action } from './actionBuffer.ts';
import type { MoveIntent } from '../physics/yard.ts';
const bindings: Record<string, Action> = { KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', KeyC: 'crouch' };
export function createBrowserInput(onPause: () => void) {
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const actions = createActionBuffer();
  const keys = new Set<string>();
  let active = false;
  let yaw = 0;
  let pitch = 0;
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.code === 'Escape' || event.code === 'Tab') { event.preventDefault(); onPause(); return; }
    const action = bindings[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    actions.press(action);
  }, options);
  document.addEventListener('keyup', event => {
    const action = bindings[event.code];
    if (!action) return;
    keys.delete(event.code);
    if (![...keys].some(key => bindings[key] === action)) actions.release(action);
  }, options);
  document.addEventListener('mousemove', event => {
    if (!active) return;
    yaw -= event.movementX * 0.002;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - event.movementY * 0.002));
  }, options);
  return {
    setActive(next: boolean) { active = next; actions.setActive(next); if (!next) keys.clear(); },
    sample(): MoveIntent {
      const state = actions.sample();
      return { right: Number(state.held.includes('right')) - Number(state.held.includes('left')), forward: Number(state.held.includes('forward')) - Number(state.held.includes('backward')), yaw, sprint: state.held.includes('sprint'), crouch: state.held.includes('crouch'), jump: state.pressed.includes('jump') };
    },
    look: () => ({ yaw, pitch }),
    resetLook() { yaw = 0; pitch = 0; },
    dispose() { active = false; actions.setActive(false); keys.clear(); abort.abort(); },
  };
}
~~~

- [ ] Create game/src/render/yardView.ts:

~~~ts
import * as THREE from 'three';
import type { BodyDefinition } from '../content/yardLayout.ts';
import type { YardSnapshot } from '../physics/yard.ts';
export function createYardView(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#53625c');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#53625c', 20, 60);
  scene.add(new THREE.HemisphereLight('#d6e7d9', '#343029', 2));
  const sun = new THREE.DirectionalLight('#ffdfaa', 3);
  sun.position.set(-8, 18, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 45 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(75, 1, 0.06, 80);
  camera.rotation.order = 'YXZ';
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#3c4038';
  context.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let column = -1; column < 5; column++) {
    const tone = 90 + ((row * 17 + column * 13 + 100) % 22);
    context.fillStyle = 'rgb(' + tone + ',' + (tone + 3) + ',' + (tone - 5) + ')';
    context.fillRect(column * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
  }
  const stoneTexture = new THREE.CanvasTexture(canvas);
  stoneTexture.colorSpace = THREE.SRGBColorSpace;
  stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(12, 12);
  const meshes = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  let disposed = false;
  function clearMeshes() {
    for (const mesh of meshes.values()) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
    meshes.clear();
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  return {
    canvas: renderer.domElement,
    reset(layout: readonly BodyDefinition[]) {
      clearMeshes();
      for (const body of layout) {
        const shape = body.shape;
        const geometry = shape.kind === 'box' ? new THREE.BoxGeometry(...shape.size) : shape.kind === 'ball' ? new THREE.IcosahedronGeometry(shape.radius, 2) : new THREE.CylinderGeometry(shape.radius, shape.radius, shape.height, 20);
        const material = new THREE.MeshStandardMaterial({ color: body.id === 'floor' ? '#ffffff' : body.color, roughness: 0.92, ...(body.id === 'floor' ? { map: stoneTexture } : {}) });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = body.id !== 'floor';
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshes.set(body.id, mesh);
      }
    },
    render(state: YardSnapshot, alpha: number, yaw: number, pitch: number) {
      for (const body of state.bodies) {
        const mesh = meshes.get(body.id)!;
        mesh.position.set(body.previousPosition.x, body.previousPosition.y, body.previousPosition.z).lerp(position.set(body.position.x, body.position.y, body.position.z), alpha);
        mesh.quaternion.set(body.previousRotation.x, body.previousRotation.y, body.previousRotation.z, body.previousRotation.w).slerp(rotation.set(body.rotation.x, body.rotation.y, body.rotation.z, body.rotation.w), alpha);
      }
      camera.position.set(state.player.previousEye.x, state.player.previousEye.y, state.player.previousEye.z).lerp(position.set(state.player.eye.x, state.player.eye.y, state.player.eye.z), alpha);
      camera.rotation.set(pitch, yaw, 0);
      renderer.render(scene, camera);
    },
    resize,
    diagnostics: () => ({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 }),
    dispose() {
      if (disposed) return;
      disposed = true;
      clearMeshes();
      stoneTexture.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
~~~

- [ ] Create game/src/main.ts:

~~~ts
import './style.css';
import { createYard } from './physics/yard.ts';
import type { Yard } from './physics/yard.ts';
import { createYardView } from './render/yardView.ts';
import { createFixedStepper } from './runtime/fixedStep.ts';
import { createBrowserInput } from './input/browserInput.ts';
import { createPreferenceStore } from './settings/preferenceStore.ts';

const panel = document.querySelector<HTMLElement>('#panel')!;
const start = document.querySelector<HTMLButtonElement>('#start')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const reload = document.querySelector<HTMLButtonElement>('#reload')!;
const status = document.querySelector<HTMLElement>('#status')!;
const gore = document.querySelector<HTMLInputElement>('#gore')!;
const crosshair = document.querySelector<HTMLElement>('#crosshair')!;
const preferences = createPreferenceStore(() => localStorage);
function showPreference() {
  const state = preferences.read();
  gore.checked = state.value.goreEnabled;
  document.querySelector<HTMLElement>('#storage-status')!.textContent = state.status === 'unavailable' ? 'Lagring är blockerad. Valet gäller bara den här sessionen.' : state.status === 'invalid' ? 'Det sparade valet kunde inte läsas. Standardinställningen används.' : '';
}
showPreference();

{
  let yard: Yard | undefined;
  let view: ReturnType<typeof createYardView> | undefined;
  let running = false;
  let interpolate = false;
  let failed = false;
  let disposed = false;
  let busy = true;
  let restarts = 0;
  let frame = 0;
  let last = performance.now();
  let tick = 0;
  let advance = createFixedStepper();
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const input = createBrowserInput(() => pause());
  function pause(message = 'Pausat — gården väntar.') {
    running = false;
    interpolate = false;
    input.setActive(false);
    advance(0, false, () => {});
    panel.hidden = false;
    crosshair.hidden = true;
    if (!failed) status.textContent = message;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function fatal(message: string) {
    failed = true;
    pause();
    status.textContent = message;
    start.disabled = restart.disabled = true;
    reload.hidden = false;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(frame);
    input.dispose();
    abort.abort();
    yard?.destroy();
    view?.dispose();
    if (import.meta.env.DEV) delete (window as Window & { __yard?: unknown }).__yard;
  }
  async function replaceWorld() {
    if (busy || failed || disposed) return;
    busy = true;
    pause('Återställer gården…');
    start.disabled = restart.disabled = true;
    try {
      const fresh = await createYard();
      if (disposed) { fresh.destroy(); return; }
      yard?.destroy();
      yard = fresh;
      view!.reset(fresh.layout);
      advance = createFixedStepper();
      tick = 0;
      input.resetLook();
      restarts++;
      status.textContent = 'Gården är återställd.';
      start.disabled = restart.disabled = false;
    } catch { fatal('Gården kunde inte återställas. Ladda om sidan.'); }
    finally { busy = false; }
  }
  start.addEventListener('click', () => {
    if (busy || failed || disposed || !view) return;
    try {
      view.canvas.requestPointerLock()?.catch(() => pause('Muslåset kunde inte startas. Klicka på Gå in igen.'));
    } catch { pause('Muslåset stöds inte här. Prova en annan datorwebbläsare.'); }
  }, options);
  restart.addEventListener('click', () => { void replaceWorld(); }, options);
  reload.addEventListener('click', () => location.reload(), options);
  gore.addEventListener('change', () => { preferences.setGore(gore.checked); showPreference(); }, options);
  document.addEventListener('pointerlockchange', () => {
    if (!busy && !failed && view && document.pointerLockElement === view.canvas && !document.hidden) {
      running = true;
      input.setActive(true);
      panel.hidden = true;
      crosshair.hidden = false;
      last = performance.now();
    } else pause();
  }, options);
  document.addEventListener('pointerlockerror', () => pause('Muslåset nekades. Klicka på Gå in igen.'), options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);
  window.addEventListener('blur', () => pause(), options);
  window.addEventListener('pagehide', dispose, options);
  window.addEventListener('resize', () => view?.resize(), options);
  async function boot() {
    try {
      view = createYardView(document.querySelector<HTMLElement>('#viewport')!);
      view.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fatal('Grafikanslutningen bröts. Ladda om sidan för att fortsätta.'); }, options);
      const fresh = await createYard();
      if (disposed) { fresh.destroy(); return; }
      yard = fresh;
      view.reset(yard.layout);
      busy = false;
      start.disabled = restart.disabled = false;
      status.textContent = 'Redo. Klicka för att låsa musen och gå in.';
      if (import.meta.env.DEV) {
        (window as Window & { __yard?: () => unknown }).__yard = () => ({ running, tick, restarts, position: yard!.snapshot().player.position, counts: yard!.counts(), gpu: view!.diagnostics() });
      }
      function loop(now: number) {
        if (disposed || failed) return;
        const elapsed = (now - last) / 1000;
        last = now;
        const result = advance(elapsed, running, () => { yard!.step(input.sample()); interpolate = true; });
        tick = result.tick;
        const look = input.look();
        view!.render(yard!.snapshot(), running && interpolate ? result.alpha : 1, look.yaw, look.pitch);
        frame = requestAnimationFrame(loop);
      }
      frame = requestAnimationFrame(loop);
    } catch { fatal('Fysik eller WebGL2 kunde inte startas. Prova en uppdaterad datorwebbläsare.'); }
  }
  void boot();
}
~~~

- [ ] Run `rtk npm --prefix game run check`, `rtk npm --prefix game run build`, `rtk npm --prefix game run test:browser`. Fix actual observed problems through failing regression tests. Browser timing assertions must wait for simulation ticks, not infer movement from a screenshot.
- [ ] Inspect PC menu and gameplay screenshots visually. Fix illegible controls, clipped panels, blocked gameplay space or incorrect geometry with a documented browser reproduction, then recapture. Check multiple PC window sizes. Record viewport/browser/renderer; headless software rendering is not a hardware 60 FPS result.
- [ ] Exercise visibility/blur and held-key clearing in the browser before completion. Add a browser regression test if behavior fails. Check nested /vadstena/ production preview loads, no resource 404s, no uncaught errors, no dev diagnostics in production.
- [ ] Update README with actual local start URL/commands, controls, implemented M1A functions and explicitly absent magic/combat/NPC/ragdoll/final assets. Record validation evidence and screenshot paths in the results document.
- [ ] Run `rtk git diff --check`; scoped commit `feat: make the physics courtyard playable in browser`.
- [ ] Independent spec review followed by quality review. Resolve findings, rerun final integrated checks and show the local preview. No deployment.

## Controller self-review

The final chapter is not reduced: telekinesis/ranged spells are M1B, ragdoll/severing M2, historical streets M3, chapter progression M4. The interactive M1A yard independently proves the camera/movement/fixed-loop/browser lifecycle. Gore starts enabled through the tested store but no gore graphics are claimed. Mouse capture requires an explicit click; Escape, blur, hidden document and lock loss clear input and stop simulated time. Restart keeps one renderer and frees the prior world. The user explicitly deferred mobile development on 2026-09-05; the old mobile branch, screen and acceptance test have been removed from this plan. PC window resizing remains required. A separate Windows portable .exe packaging plan follows the PC web build. Resource-count checks complement ownership review; they do not prove unlimited memory stability or final performance budgets.

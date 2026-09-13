import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { build, createServer } from 'vite';
import { chromium } from 'playwright';

// Environment lab browser checks. Chromium/SwiftShader: functional and resource evidence, not hardware FPS.
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const captures = join(root, '.playtest', 'environment');
const PORT = 4182;
const labUrl = `http://127.0.0.1:${PORT}/vadstena/environment-lab.html`;
let server;
let browser;

before(async () => {
  await mkdir(captures, { recursive: true });
  server = await createServer({
    configFile: join(root, 'vite.config.ts'), root, logLevel: 'error',
    server: { host: '127.0.0.1', port: PORT, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

function observeFailures(page) {
  const failures = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });
  page.on('requestfailed', (request) => failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`); });
  return () => assert.deepEqual(failures, []);
}
const lab = (page) => page.evaluate(() => window.__environmentLab?.() ?? null);
const frames = (page, count = 2) => page.evaluate(async (total) => {
  for (let index = 0; index < total; index += 1) await new Promise((resolve) => requestAnimationFrame(resolve));
}, count);
async function openReady(page) {
  await page.goto(labUrl);
  assert.equal(await page.locator('html').getAttribute('data-fixture'), 'ENVIRONMENT_LAB_ONLY');
  await page.waitForFunction(() => { const state = window.__environmentLab?.(); return state && !state.busy; });
  await frames(page);
}
/** Clicks start and returns where the click left the mouse; pointer-lock look deltas are measured from there. */
async function play(page) {
  const bounds = await page.locator('#start').boundingBox();
  await page.locator('#start').click();
  await page.waitForFunction(() => window.__environmentLab().running && document.pointerLockElement instanceof HTMLCanvasElement);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
async function ticks(page, count) {
  const start = (await lab(page)).tick;
  await page.waitForFunction(({ start, count }) => window.__environmentLab().tick >= start + count, { start, count });
}
async function pauseWithEscape(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__environmentLab().running);
}
async function restartAt(page, spawnId, tower = 'partial') {
  const before = (await lab(page)).restarts;
  await page.locator('#spawn').selectOption(spawnId);
  await page.locator('#tower').selectOption(tower);
  await page.locator('#restart').click();
  await page.waitForFunction((count) => { const state = window.__environmentLab(); return state.restarts === count && !state.busy; }, before + 1);
  await frames(page);
}

test('dev lab boots, walks with real input and pauses on Esc, blur, hidden tab and pointer unlock', { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    const initial = await lab(page);
    assert.equal(initial.running, false);
    assert.equal(initial.spawnId, 'radhus-approach');
    assert.ok(initial.counts.bodies > 100, `bodies ${initial.counts.bodies}`);
    assert.equal(await page.locator('#environment-viewport canvas').count(), 1);
    assert.equal(await page.locator('#panel').isVisible(), true);
    assert.equal(await page.locator('#provenance').getAttribute('open'), null, 'provenance panel starts collapsed');
    await page.screenshot({ path: join(captures, 'menu-1440x900.png') });

    await play(page);
    assert.equal(await page.locator('#panel').isVisible(), false);
    const start = (await lab(page)).position;
    await page.keyboard.down('KeyW');
    await ticks(page, 60);
    await page.keyboard.up('KeyW');
    const walked = (await lab(page)).position;
    assert.ok(walked.z < start.z - 2, `W must move the capsule forward: ${start.z} -> ${walked.z}`);

    await pauseWithEscape(page);
    const frozen = (await lab(page)).tick;
    await page.waitForTimeout(160);
    assert.equal((await lab(page)).tick, frozen, 'Esc pause freezes the simulation');

    for (const boundary of ['blur', 'hidden', 'pointer-unlock']) {
      await play(page);
      await page.keyboard.down('KeyW');
      await ticks(page, 5);
      if (boundary === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      if (boundary === 'hidden') await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      if (boundary === 'pointer-unlock') await page.evaluate(() => document.exitPointerLock());
      await page.waitForFunction(() => !window.__environmentLab().running);
      if (boundary === 'hidden') await page.evaluate(() => { delete document.hidden; });
      const paused = await lab(page);
      await page.waitForTimeout(120);
      assert.equal((await lab(page)).tick, paused.tick, `${boundary} freezes the simulation`);
      await play(page);
      await ticks(page, 15);
      const resumed = await lab(page);
      assert.ok(Math.abs(resumed.position.z - paused.position.z) < 0.03, `${boundary}: held W must be cleared, moved ${paused.position.z - resumed.position.z}`);
      await page.keyboard.up('KeyW');
      await pauseWithEscape(page);
    }

    await page.setViewportSize({ width: 1024, height: 700 });
    await frames(page, 3);
    const canvas = await page.locator('#environment-viewport canvas').boundingBox();
    assert.ok(canvas && Math.abs(canvas.width - 1024) < 2 && Math.abs(canvas.height - 700) < 2, `canvas ${JSON.stringify(canvas)}`);
    await page.screenshot({ path: join(captures, 'menu-1024x700.png') });
    assertNoFailures();
  } finally { await context.close(); }
});

test('route views at 1440×900 and 1024×700 with renderer counts', { timeout: 240_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  const views = [
    { spawn: 'radhus-approach', yaw: 0, pitch: 0.02 },
    { spawn: 'storgata-north', yaw: 0, pitch: 0 },
    { spawn: 'portik-east', yaw: Math.PI / 2, pitch: 0 },
    { spawn: 'courtyard-1', yaw: 2.8, pitch: 0.14 },
    { spawn: 'open-space', yaw: 0, pitch: 0.18 },
    { spawn: 'church-gate', yaw: 0.2, pitch: 0.22 },
  ];
  const report = { environment: 'Chromium headless, SwiftShader (software WebGL), Windows 11; not hardware performance', views: [] };
  try {
    await openReady(page);
    for (const [size, suffix] of [[{ width: 1440, height: 900 }, '1440x900'], [{ width: 1024, height: 700 }, '1024x700']]) {
      await page.setViewportSize(size);
      for (const view of views) {
        await restartAt(page, view.spawn);
        const mouse = await play(page);
        const look = (await lab(page)).look;
        // browserInput.ts: yaw -= movementX * 0.002, pitch -= movementY * 0.002.
        await page.mouse.move(mouse.x - (view.yaw - look.yaw) / 0.002, mouse.y - (view.pitch - look.pitch) / 0.002, { steps: 4 });
        await ticks(page, 20);
        await frames(page, 3);
        const state = await lab(page);
        assert.ok(Math.abs(state.look.yaw - view.yaw) < 0.02, `${view.spawn} yaw ${state.look.yaw}`);
        await page.screenshot({ path: join(captures, `view-${view.spawn}-${suffix}.png`) });
        if (suffix === '1440x900') {
          const sample = await page.evaluate(async () => {
            const first = window.__environmentLab(), started = performance.now();
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const last = window.__environmentLab();
            return { ticksPerSecond: ((last.tick - first.tick) * 1000) / (performance.now() - started), gpu: last.gpu };
          });
          report.views.push({ spawn: view.spawn, zone: state.zone, ...sample });
        }
        await pauseWithEscape(page);
      }
    }
    await writeFile(join(captures, 'renderer-report.json'), JSON.stringify(report, null, 2));
    assertNoFailures();
  } finally { await context.close(); }
});

test('a rejected pointer-lock request stays paused with a visible recovery message', { timeout: 60_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('simulated pointer-lock denial'));
  });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    await page.locator('#start').click();
    await page.locator('#status').filter({ hasText: /kunde inte låsa muspekaren/i }).waitFor();
    assert.equal((await lab(page)).running, false);
    assert.equal(await page.locator('#panel').isVisible(), true);
    assert.equal(await page.locator('#start').isEnabled(), true);
    assertNoFailures();
  } finally { await context.close(); }
});

test('ten restarts keep physics and GPU resources flat; the tower hypothesis swaps real colliders', { timeout: 180_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    await restartAt(page, 'radhus-approach');
    const baseline = await lab(page);
    // renderer.info counts uploaded resources, which depends on what is in view, so every round uses the same spawn.
    for (let round = 1; round <= 10; round += 1) {
      await restartAt(page, 'radhus-approach');
      await frames(page, 2);
      const state = await lab(page);
      assert.deepEqual(state.counts, baseline.counts, `physics counts after restart ${round}`);
      assert.deepEqual({ geometries: state.gpu.geometries, textures: state.gpu.textures, programs: state.gpu.programs },
        { geometries: baseline.gpu.geometries, textures: baseline.gpu.textures, programs: baseline.gpu.programs }, `GPU after restart ${round}`);
      assert.equal(await page.locator('#environment-viewport canvas').count(), 1);
      assert.equal(state.running, false);
    }
    await restartAt(page, 'radhus-approach', 'complete');
    const complete = await lab(page);
    assert.equal(complete.towerHypothesis, 'complete');
    assert.ok(complete.bodyIds.includes('radhuset-tower-complete') && !complete.bodyIds.includes('radhuset-tower-partial'));
    await restartAt(page, 'radhus-approach', 'partial');
    assert.ok((await lab(page)).bodyIds.includes('radhuset-tower-partial'));
    assertNoFailures();
  } finally { await context.close(); }
});

test('real WebGL context loss stops the simulation and restore requires an explicit resume', { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    const baseline = await lab(page);
    await play(page);
    await ticks(page, 10);
    await page.evaluate(() => {
      const canvas = document.querySelector('#environment-viewport canvas');
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WEBGL_lose_context unavailable; lifecycle was not exercised');
      window.__restoreEnvironmentContext = () => extension.restoreContext();
      extension.loseContext();
    });
    await page.waitForFunction(() => window.__environmentLab().graphicsLost === true);
    const lost = await lab(page);
    assert.equal(lost.running, false);
    assert.equal(await page.locator('#start').isDisabled(), true);
    assert.equal(await page.locator('#restart').isDisabled(), true);
    await page.waitForTimeout(200);
    assert.equal((await lab(page)).tick, lost.tick, 'no simulation while graphics are lost');
    await page.evaluate(() => window.__restoreEnvironmentContext());
    await page.waitForFunction(() => window.__environmentLab().graphicsLost === false);
    await frames(page, 4);
    const restored = await lab(page);
    assert.equal(restored.running, false, 'restore must not resume on its own');
    assert.equal(restored.tick, lost.tick);
    assert.deepEqual(restored.counts, baseline.counts);
    assert.equal(restored.gpu.textures, baseline.gpu.textures, 'textures re-uploaded after restore');
    assert.equal(await page.locator('#start').isEnabled(), true);
    await page.waitForTimeout(150);
    assert.equal((await lab(page)).tick, lost.tick);
    await page.screenshot({ path: join(captures, 'context-restored-1440x900.png') });
    await play(page);
    await ticks(page, 5);
    await pauseWithEscape(page);
    assertNoFailures();
  } finally { await context.close(); }
});

test('context loss while a restart is loading keeps the graphics-lost message, not a ready prompt', { timeout: 60_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    const before = (await lab(page)).restarts;
    // Same task: the restart has started awaiting createYard when the (synchronously dispatched) loss arrives.
    await page.evaluate(() => {
      document.querySelector('#restart').click();
      document.querySelector('#environment-viewport canvas').dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    });
    await page.waitForFunction((count) => { const state = window.__environmentLab(); return state.restarts === count && !state.busy; }, before + 1);
    await frames(page, 2);
    const state = await lab(page);
    assert.equal(state.graphicsLost, true);
    assert.match(await page.locator('#status').textContent(), /grafiken tappades/i, 'the finished restart must not claim the lab is ready');
    assert.equal(await page.locator('#start').isDisabled(), true);
    await page.evaluate(() => document.querySelector('#environment-viewport canvas').dispatchEvent(new Event('webglcontextrestored')));
    assert.match(await page.locator('#status').textContent(), /grafiken är återställd/i);
    assert.equal(await page.locator('#start').isEnabled(), true);
    assertNoFailures();
  } finally { await context.close(); }
});

test('a frame failure is terminal: no further frames, the world and canvas are released, reload stays available', { timeout: 60_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.addInitScript(() => {
    const frame = window.requestAnimationFrame;
    window.__environmentFrames = 0;
    window.requestAnimationFrame = function requestFrame(callback) { window.__environmentFrames += 1; return frame.call(this, callback); };
  });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    await play(page);
    await ticks(page, 5);
    assert.equal((await lab(page)).listening, true);
    // Real fault inside the frame: every draw call throws from now on.
    await page.evaluate(() => {
      for (const prototype of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
        for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
          if (prototype[name]) prototype[name] = () => { throw new Error('simulated draw failure'); };
        }
      }
    });
    await page.waitForFunction(() => window.__environmentLab().failed === true);
    await page.locator('#reload').waitFor({ state: 'visible' });
    assert.match(await page.locator('#status').textContent(), /avbröts av ett fel/i);
    const failed = await lab(page);
    assert.equal(failed.running, false);
    assert.equal(failed.listening, false, 'lab listeners are aborted');
    assert.equal(await page.evaluate(() => document.pointerLockElement), null);
    assert.deepEqual(failed.counts, { bodies: 0, colliders: 0 }, 'the owned physics world is destroyed');
    assert.equal(await page.locator('#environment-viewport canvas').count(), 0, 'the renderer and its canvas are released');
    const scheduled = await page.evaluate(() => window.__environmentFrames);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__environmentFrames), scheduled, 'no frames are scheduled after a terminal failure');
    assert.equal(await page.locator('#start').isDisabled(), true);
    assert.equal(await page.locator('#restart').isDisabled(), true);
    // Late events after the failure must not rewrite the terminal message.
    await page.evaluate(() => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); });
    assert.match(await page.locator('#status').textContent(), /avbröts av ett fel/i);
    await Promise.all([page.waitForEvent('load'), page.locator('#reload').click()]);
    await page.waitForFunction(() => { const state = window.__environmentLab?.(); return state && !state.busy && !state.failed; });
    assertNoFailures();
  } finally { await context.close(); }
});

test('a late pointer-lock rejection never overwrites a terminal failure or a lost-graphics message', { timeout: 90_000 }, async () => {
  for (const fault of ['frame-failure', 'context-loss']) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.addInitScript(() => {
      // The browser answers the lock request only when the test says so.
      HTMLCanvasElement.prototype.requestPointerLock = () => new Promise((_, reject) => {
        window.__rejectEnvironmentLock = () => reject(new Error('simulated late pointer-lock denial'));
      });
    });
    const page = await context.newPage();
    const assertNoFailures = observeFailures(page);
    try {
      await openReady(page);
      await page.locator('#start').click();
      await page.waitForFunction(() => typeof window.__rejectEnvironmentLock === 'function');
      if (fault === 'frame-failure') {
        await page.evaluate(() => {
          for (const prototype of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
            for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
              if (prototype[name]) prototype[name] = () => { throw new Error('simulated draw failure'); };
            }
          }
        });
        await page.waitForFunction(() => window.__environmentLab().failed === true);
      } else {
        await page.evaluate(() => document.querySelector('#environment-viewport canvas').dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
        await page.waitForFunction(() => window.__environmentLab().graphicsLost === true);
      }
      const expected = fault === 'frame-failure' ? /avbröts av ett fel/i : /grafiken tappades/i;
      assert.match(await page.locator('#status').textContent(), expected);
      await page.evaluate(() => window.__rejectEnvironmentLock());
      await frames(page, 3).catch(() => undefined);
      await page.waitForTimeout(100);
      assert.match(await page.locator('#status').textContent(), expected, `${fault}: the late rejection must not replace the message`);
      assert.equal((await lab(page)).running, false);
      assertNoFailures();
    } finally { await context.close(); }
  }
});

test('pagehide teardown releases canvas, diagnostics and frame loop, and ignores a late pointer-lock rejection', { timeout: 60_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.addInitScript(() => {
    const frame = window.requestAnimationFrame;
    window.__environmentFrames = 0;
    window.requestAnimationFrame = function requestFrame(callback) { window.__environmentFrames += 1; return frame.call(this, callback); };
    HTMLCanvasElement.prototype.requestPointerLock = () => new Promise((_, reject) => {
      window.__rejectEnvironmentLock = () => reject(new Error('simulated late pointer-lock denial'));
    });
  });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await openReady(page);
    assert.equal(await page.locator('#environment-viewport canvas').count(), 1);
    await page.locator('#start').click();
    await page.waitForFunction(() => typeof window.__rejectEnvironmentLock === 'function');
    const before = await page.locator('#status').textContent();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
    assert.equal(await page.evaluate(() => typeof window.__environmentLab), 'undefined', 'diagnostics hook removed');
    assert.equal(await page.locator('#environment-viewport canvas').count(), 0, 'renderer canvas released');
    const scheduled = await page.evaluate(() => window.__environmentFrames);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__environmentFrames), scheduled, 'no frames after teardown');
    await page.evaluate(() => window.__rejectEnvironmentLock());
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#status').textContent(), before, 'a rejection after teardown must not touch the panel');
    assertNoFailures();
  } finally { await context.close(); }
});

test('unavailable WebGL gives a reload recovery with no canvas, simulation or frame loop', { timeout: 60_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('environment-webgl-failed-once')) return;
    sessionStorage.setItem('environment-webgl-failed-once', '1');
    const original = HTMLCanvasElement.prototype.getContext, frame = window.requestAnimationFrame;
    window.__environmentBootFrames = 0;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
      return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : original.call(this, type, ...args);
    };
    window.requestAnimationFrame = function requestFrame(callback) { window.__environmentBootFrames += 1; return frame.call(this, callback); };
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(labUrl);
    await page.locator('#reload').waitFor({ state: 'visible' });
    assert.match(await page.locator('#status').textContent(), /grafiken kunde inte starta/i);
    assert.equal(await page.locator('#environment-viewport canvas').count(), 0);
    assert.equal(await page.evaluate(() => typeof window.__environmentLab), 'undefined');
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__environmentBootFrames), 0);
    assert.equal(await page.locator('#start').isDisabled(), true);
    await Promise.all([page.waitForEvent('load'), page.locator('#reload').click()]);
    await page.waitForFunction(() => { const state = window.__environmentLab?.(); return state && !state.busy; });
    assert.equal(await page.locator('#environment-viewport canvas').count(), 1);
    assert.deepEqual(pageErrors, []);
  } finally { await context.close(); }
});

test('the normal production build excludes the environment lab, its sentinel and environment content', { timeout: 120_000 }, async () => {
  // Negative control: the sentinel and content ids must exist in the sources, or their absence proves nothing.
  assert.match(await readFile(join(root, 'src/lab/environmentLab.ts'), 'utf8'), /ENVIRONMENT_LAB_ONLY/);
  assert.match(await readFile(join(root, 'src/content/environment/landmarks.ts'), 'utf8'), /st-per-west-tower/);
  assert.ok(existsSync(join(root, 'environment-lab.html')));
  const outDir = join(captures, 'production');
  await build({ configFile: join(root, 'vite.config.ts'), root, logLevel: 'error', build: { outDir, emptyOutDir: true } });
  assert.ok(existsSync(join(outDir, 'index.html')));
  assert.equal(existsSync(join(outDir, 'environment-lab.html')), false);
  const files = (await readdir(outDir, { recursive: true })).filter((file) => /\.(js|html)$/.test(file));
  assert.ok(files.length > 0);
  for (const file of files) {
    const text = await readFile(join(outDir, file), 'utf8');
    assert.ok(!/ENVIRONMENT_LAB_ONLY|environment-lab\.html|st-per-west-tower|radhuset-hall-core|house-variant-h5/.test(text), `environment code leaked into ${file}`);
  }
});

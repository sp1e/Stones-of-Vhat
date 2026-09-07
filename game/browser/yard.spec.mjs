import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { build, createServer, preview } from 'vite';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const captures = join(root, '.playtest');
const devUrl = 'http://127.0.0.1:4173/vadstena/';
let server;
let browser;

before(async () => {
  await mkdir(captures, { recursive: true });
  server = await createServer({
    configFile: false,
    root,
    base: '/vadstena/',
    define: { __YARD_DIAGNOSTICS__: 'true' },
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 4173, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

function observeFailures(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const resourceFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    resourceFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) resourceFailures.push(`${response.status()} ${response.url()}`);
  });
  return () => assert.deepEqual(
    { pageErrors, consoleErrors, resourceFailures },
    { pageErrors: [], consoleErrors: [], resourceFailures: [] },
  );
}

async function waitForReady(page) {
  await page.goto(devUrl);
  await page.locator('#start').waitFor({ state: 'visible' });
  await assert.doesNotReject(page.locator('#start').click({ trial: true }));
  await page.waitForFunction(() => {
    const button = document.querySelector('#start');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
}

async function waitAnimationFrames(page, count = 2) {
  await page.evaluate(async (frames) => {
    for (let index = 0; index < frames; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, count);
}

test('desktop movement, explicit pause, preference persistence, input clearing and ten clean restarts', { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  await waitForReady(page);

  assert.equal(await page.locator('#gore').isChecked(), true);
  assert.equal(await page.locator('#panel').isVisible(), true);
  assert.equal(await page.locator('#controls').getAttribute('open'), null);
  await page.screenshot({ path: join(captures, 'desktop-menu.png') });

  await page.locator('#start').click();
  await page.waitForFunction(() => window.__yard?.().running === true && document.pointerLockElement instanceof HTMLCanvasElement);
  const initial = await page.evaluate(() => window.__yard());
  await page.keyboard.down('KeyW');
  await page.waitForFunction((tick) => window.__yard().tick >= tick + 35, initial.tick);
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() => window.__yard());
  assert.ok(moved.position.z < initial.position.z - 1, `expected forward movement; ${initial.position.z} -> ${moved.position.z}`);
  await page.screenshot({ path: join(captures, 'desktop-play.png') });

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__yard().running === false);
  const pausedTick = await page.evaluate(() => window.__yard().tick);
  await page.waitForTimeout(160);
  assert.equal(await page.evaluate(() => window.__yard().tick), pausedTick);

  await page.locator('#controls summary').click();
  await page.locator('#gore').uncheck();
  await page.reload();
  await page.waitForFunction(() => {
    const button = document.querySelector('#start');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  assert.equal(await page.locator('#gore').isChecked(), false);

  await waitAnimationFrames(page);
  const baseline = await page.evaluate(() => window.__yard());
  for (let restart = 1; restart <= 10; restart += 1) {
    await page.locator('#restart').click();
    await page.waitForFunction((expected) => {
      const state = window.__yard();
      const start = document.querySelector('#start');
      return state.restarts === expected && start instanceof HTMLButtonElement && !start.disabled;
    }, restart);
  }
  await waitAnimationFrames(page);
  const restarted = await page.evaluate(() => window.__yard());
  assert.deepEqual(restarted.counts, baseline.counts);
  assert.deepEqual(restarted.gpu, baseline.gpu);
  assert.equal(await page.locator('#viewport canvas').count(), 1);
  assert.equal(restarted.running, false);
  assert.equal(await page.locator('#gore').isChecked(), false);

  // Synthetic window blur deliberately exercises the runtime boundary that a real
  // browser invokes when focus leaves the game while a physical key is held.
  await page.locator('#start').click();
  await page.waitForFunction(() => window.__yard().running === true);
  await page.keyboard.down('KeyW');
  await page.waitForFunction((tick) => window.__yard().tick >= tick + 4, restarted.tick);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => window.__yard().running === false);
  const afterBlur = await page.evaluate(() => window.__yard());
  await page.locator('#start').click();
  await page.waitForFunction((tick) => window.__yard().running && window.__yard().tick >= tick + 12, afterBlur.tick);
  const afterResume = await page.evaluate(() => window.__yard());
  assert.ok(Math.abs(afterResume.position.z - afterBlur.position.z) < 0.03, 'held movement must clear across blur/pause');
  await page.keyboard.up('KeyW');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1024, height: 700 });
  await waitAnimationFrames(page);
  const canvasBox = await page.locator('#viewport canvas').boundingBox();
  assert.ok(canvasBox && Math.abs(canvasBox.width - 1024) < 1 && Math.abs(canvasBox.height - 700) < 1);

  assertNoFailures();
  await context.close();
});

test('a rejected pointer-lock request remains paused and explains recovery', { timeout: 30_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('simulated pointer-lock denial'));
  });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  await waitForReady(page);
  await page.locator('#start').click();
  await page.locator('#status').filter({ hasText: /kunde inte låsa muspekaren/i }).waitFor();
  assert.equal(await page.evaluate(() => window.__yard().running), false);
  assert.equal(await page.locator('#panel').isVisible(), true);
  assert.equal(await page.locator('#start').isEnabled(), true);
  assertNoFailures();
  await context.close();
});

test('real WebGL context loss enters a fatal recovery state', { timeout: 30_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  await waitForReady(page);
  const supported = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  assert.equal(supported, true, 'Chromium test runtime must expose WEBGL_lose_context');
  await page.locator('#reload').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#start').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__yard().running), false);
  assertNoFailures();
  await context.close();
});

test('production preview serves the nested base path and strips development diagnostics', { timeout: 60_000 }, async () => {
  await build({ configFile: join(root, 'vite.config.ts'), root, logLevel: 'error' });
  const production = await preview({
    configFile: join(root, 'vite.config.ts'),
    root,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await page.goto('http://127.0.0.1:4174/vadstena/');
    await page.waitForFunction(() => {
      const button = document.querySelector('#start');
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    assert.equal(await page.evaluate(() => typeof window.__yard), 'undefined');
    assertNoFailures();
  } finally {
    await context.close();
    production.httpServer.close();
  }
});

test('development watcher excludes generated desktop, release and test-profile directories', { timeout: 30_000 }, async () => {
  const configured = await createServer({
    configFile: join(root, 'vite.config.ts'), root, logLevel: 'error',
    server: { host: '127.0.0.1', port: 4174, strictPort: true },
  });
  try {
    await configured.listen();
    // The watcher may already have emitted ready while Vite was initializing.
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (Object.keys(configured.watcher.getWatched()).some(path => path.replaceAll('\\', '/').endsWith('/src/render'))) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const watched = Object.keys(configured.watcher.getWatched()).map(path => path.replaceAll('\\', '/'));
    assert.ok(watched.some(path => path.endsWith('/src/render')), 'production source must remain watched');
    const normalizedRoot = root.replaceAll('\\', '/');
    for (const generated of ['desktop/renderer', 'release', '.playtest']) {
      assert.equal(watched.some(path => path === `${normalizedRoot}/${generated}` || path.startsWith(`${normalizedRoot}/${generated}/`)), false, `${generated} must not be watched`);
    }
  } finally {
    await configured.close();
  }
});

test('a real BFCache restoration reloads the disposed page into a fresh paused game', { timeout: 60_000 }, async () => {
  await build({ configFile: join(root, 'vite.config.ts'), root, logLevel: 'error' });
  const production = await preview({
    configFile: join(root, 'vite.config.ts'),
    root,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 4180, strictPort: true },
  });
  let fullBrowser;
  let context;
  try {
    fullBrowser = await chromium.launch({
      channel: 'chromium',
      headless: true,
      ignoreDefaultArgs: ['--disable-back-forward-cache'],
      args: ['--enable-unsafe-swiftshader'],
    });
    context = await fullBrowser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.addEventListener('pagehide', (event) => {
        if (event.persisted) window.sessionStorage.setItem('yard:test:pagehide-persisted', 'true');
      });
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) window.sessionStorage.setItem('yard:test:pageshow-persisted', 'true');
      });
    });
    const assertNoFailures = observeFailures(page);
    await page.goto('http://127.0.0.1:4180/vadstena/');
    await page.waitForFunction(() => !document.querySelector('#start').disabled);
    await page.locator('#controls summary').click();
    await page.locator('#gore').uncheck();
    await page.goto('http://localhost:4180/vadstena/');
    await page.waitForFunction(() => !document.querySelector('#start').disabled);
    await page.goBack({ waitUntil: 'commit' });
    await page.waitForFunction(() => (
      window.sessionStorage.getItem('yard:test:pagehide-persisted') === 'true'
      && window.sessionStorage.getItem('yard:test:pageshow-persisted') === 'true'
    ));
    await page.waitForFunction(() => document.querySelectorAll('#viewport canvas').length === 1, undefined, { timeout: 5_000 });
    await page.waitForFunction(() => !document.querySelector('#start').disabled);

    assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.type), 'reload');
    assert.equal(await page.locator('#gore').isChecked(), false);
    assert.equal(await page.locator('#panel').isVisible(), true);
    await page.locator('#start').click();
    await page.waitForFunction(() => document.pointerLockElement instanceof HTMLCanvasElement && !document.querySelector('#crosshair').hidden);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#crosshair').hidden);
    assertNoFailures();
  } finally {
    await context?.close();
    await fullBrowser?.close();
    production.httpServer.close();
  }
});

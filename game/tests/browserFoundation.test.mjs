import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const url = new URL('../src/settings/preferenceStore.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('browser toolchain uses the exact approved dependencies', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.dependencies, {
    '@dimforge/rapier3d-compat': '0.20.0',
    three: '0.185.1',
  });
  assert.deepEqual(pkg.devDependencies, {
    '@types/three': '0.185.4',
    playwright: '1.63.0',
    typescript: '7.0.2',
    vite: '8.2.2',
  });
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=24.12.0 <25');
  assert.deepEqual(pkg.scripts, {
    test: 'node --test tests/*.test.mjs',
    typecheck: 'tsc --noEmit',
    check: 'npm run typecheck && npm test',
  });
});

test('preferences persist across stores and expose independent snapshots', () => {
  assert.equal(typeof api.createPreferenceStore, 'function');
  assert.equal(api.PREFERENCE_KEY, 'vadstena.preferences.v1');
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const store = api.createPreferenceStore(() => storage);
  const initial = store.read();
  assert.deepEqual(initial, { value: { version: 1, goreEnabled: true }, status: 'default' });
  assert.equal(data.size, 0);
  initial.value.goreEnabled = false;
  initial.status = 'invalid';
  assert.deepEqual(store.read(), { value: { version: 1, goreEnabled: true }, status: 'default' });
  const saved = store.setGore(false);
  assert.deepEqual(saved, { value: { version: 1, goreEnabled: false }, status: 'saved' });
  saved.value.goreEnabled = true;
  assert.equal(store.read().value.goreEnabled, false);
  assert.equal(data.get(api.PREFERENCE_KEY), '{"version":1,"goreEnabled":false}');
  assert.deepEqual(api.createPreferenceStore(() => storage).read(), {
    value: { version: 1, goreEnabled: false }, status: 'saved',
  });
});

test('invalid stored bytes are preserved while preferences use defaults', () => {
  assert.equal(typeof api.createPreferenceStore, 'function');
  const data = new Map([[api.PREFERENCE_KEY, 'broken']]);
  const store = api.createPreferenceStore(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }));
  assert.deepEqual(store.read(), { value: { version: 1, goreEnabled: true }, status: 'invalid' });
  assert.equal(data.get(api.PREFERENCE_KEY), 'broken');
});

test('unavailable storage retains changes for the session', () => {
  assert.equal(typeof api.createPreferenceStore, 'function');
  const store = api.createPreferenceStore(() => { throw new Error('storage denied'); });
  assert.deepEqual(store.read(), { value: { version: 1, goreEnabled: true }, status: 'unavailable' });
  assert.deepEqual(store.setGore(false), { value: { version: 1, goreEnabled: false }, status: 'unavailable' });
  assert.equal(store.read().value.goreEnabled, false);
});

test('quota errors retain the requested preference for the session', () => {
  assert.equal(typeof api.createPreferenceStore, 'function');
  const store = api.createPreferenceStore(() => ({
    getItem: () => null,
    setItem: () => { throw new Error('quota exceeded'); },
  }));
  assert.deepEqual(store.setGore(false), { value: { version: 1, goreEnabled: false }, status: 'unavailable' });
  assert.deepEqual(store.read(), { value: { version: 1, goreEnabled: false }, status: 'unavailable' });
});

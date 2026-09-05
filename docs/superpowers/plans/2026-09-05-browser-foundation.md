# M1A browser foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (already selected by the user) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the browser/physics toolchain and connect the approved gore preference to resilient browser storage.
**Architecture:** Keep the existing pure preference codec and inject the storage boundary. Browser rendering and the real Rapier yard are separate, subsequent executable plans; this foundation alone is not a playable game or completed M1.
**Tech Stack:** Node 24, TypeScript 7.0.2, Vite 8.2.2, Three 0.185.1, Rapier compat 0.20.0, Playwright 1.63.0.

---

## Context and file ownership

Continue in C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation, branch codex/vadstena-runtime-foundation. M0 passed final review at 86ab5a9. Do not change the original checkout, website, remote configuration, or the approved design. All shell commands start with rtk. Use apply_patch for edits. Codacy MCP is unavailable: report the limitation, do not install its CLI manually. npm audit is supplementary.

- Modify game/package.json: exact dependency versions, keep existing scripts.
- Generate game/package-lock.json: npm installation only.
- Create game/tests/browserFoundation.test.mjs: dependency contract and actual storage behavior.
- Create game/src/settings/preferenceStore.ts: synchronous browser storage boundary, no DOM or rendering.
- Create docs/superpowers/plans/2026-09-05-browser-foundation-results.md: observed RED/GREEN, audit and review evidence.

## Task 1: Toolchain and resilient preference storage

- [ ] Write game/tests/browserFoundation.test.mjs:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const url = new URL('../src/settings/preferenceStore.ts', import.meta.url);
const { createPreferenceStore, PREFERENCE_KEY } = existsSync(url) ? await import(url.href) : {};
function storage(initial = new Map()) {
  return { getItem: key => initial.get(key) ?? null, setItem: (key, value) => initial.set(key, value) };
}
test('browser and physics dependencies are pinned', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.dependencies, { '@dimforge/rapier3d-compat': '0.20.0', three: '0.185.1' });
  assert.equal(pkg.devDependencies.vite, '8.2.2');
  assert.equal(pkg.devDependencies['@types/three'], '0.185.4');
  assert.equal(pkg.devDependencies.playwright, '1.63.0');
});
test('new profile enables gore, explicit false survives a new store', () => {
  assert.equal(typeof createPreferenceStore, 'function');
  const port = storage();
  const first = createPreferenceStore(() => port);
  assert.deepEqual(first.read(), { value: { version: 1, goreEnabled: true }, status: 'default' });
  assert.equal(first.setGore(false).status, 'saved');
  const second = createPreferenceStore(() => port);
  assert.deepEqual(second.read(), { value: { version: 1, goreEnabled: false }, status: 'saved' });
  const copy = second.read();
  copy.value.goreEnabled = true;
  assert.equal(second.read().value.goreEnabled, false);
});
test('invalid stored data is reported without overwriting it', () => {
  assert.equal(typeof createPreferenceStore, 'function');
  const values = new Map([[PREFERENCE_KEY, 'broken']]);
  const store = createPreferenceStore(() => storage(values));
  assert.equal(store.read().status, 'invalid');
  assert.equal(store.read().value.goreEnabled, true);
  assert.equal(values.get(PREFERENCE_KEY), 'broken');
});
test('storage getter denial still permits session preferences', () => {
  assert.equal(typeof createPreferenceStore, 'function');
  const store = createPreferenceStore(() => { throw new Error('denied'); });
  assert.equal(store.read().status, 'unavailable');
  assert.deepEqual(store.setGore(false), { value: { version: 1, goreEnabled: false }, status: 'unavailable' });
});
test('write failure preserves the current session choice', () => {
  assert.equal(typeof createPreferenceStore, 'function');
  const port = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const store = createPreferenceStore(() => port);
  assert.equal(store.setGore(false).status, 'unavailable');
  assert.equal(store.read().value.goreEnabled, false);
});
~~~

- [ ] Run `rtk node --test game/tests/browserFoundation.test.mjs`. Expected: five assertion failures (missing dependency contract / missing function), not a module loader failure.

- [ ] Replace game/package.json with:

~~~json
{
  "name": "vadstena-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.12.0 <25" },
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm test"
  },
  "dependencies": {
    "@dimforge/rapier3d-compat": "0.20.0",
    "three": "0.185.1"
  },
  "devDependencies": {
    "@types/three": "0.185.4",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.2.2"
  }
}
~~~

- [ ] Run `rtk npm --prefix game install`, immediately `rtk npm --prefix game audit`. Codacy/Trivy cannot be run without its missing MCP tool; record that gap. Stop on new vulnerabilities and resolve them before proceeding.

- [ ] Create game/src/settings/preferenceStore.ts:

~~~ts
import { decodePreferences, encodePreferences } from './preferences.ts';
import type { Preferences } from './preferences.ts';

export const PREFERENCE_KEY = 'vadstena.preferences.v1';
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type StoredPreference = {
  value: Preferences;
  status: 'default' | 'saved' | 'invalid' | 'unavailable';
};

export function createPreferenceStore(getStorage: () => StoragePort) {
  let state: StoredPreference;
  try {
    const decoded = decodePreferences(getStorage().getItem(PREFERENCE_KEY));
    state = { value: decoded.value, status: decoded.source };
  } catch {
    state = { value: { version: 1, goreEnabled: true }, status: 'unavailable' };
  }
  function read(): StoredPreference {
    return { value: { ...state.value }, status: state.status };
  }
  return {
    read,
    setGore(enabled: boolean): StoredPreference {
      state = { value: { version: 1, goreEnabled: enabled }, status: 'saved' };
      try {
        getStorage().setItem(PREFERENCE_KEY, encodePreferences(state.value));
      } catch {
        state.status = 'unavailable';
      }
      return read();
    },
  };
}
~~~

- [ ] Run `rtk npm --prefix game run check`. Expected: strict typecheck and 21 tests pass.
- [ ] Write the results document with actual commands, totals, audit outcome and security limitation (do not fabricate elapsed time or scanner results).
- [ ] Run `rtk git diff --check`; stage only the five owned files and commit `feat: prepare browser physics toolchain and preference storage`.
- [ ] Obtain independent spec review, then code-quality review. Fix findings through the same implementer and repeat the affected review.

## Controller self-review

Coverage: this bounded plan covers toolchain and preference persistence only. M1A movement/world/view are the next separate subsystem plans; M1B telekinesis/projectiles and M2 ragdolls/severing remain explicitly unimplemented. It does not shrink the approved chapter scope.
Types: StoredPreference.status maps the codec source plus unavailable; value copies prevent mutation through reads.
Failure behavior: loading invalid data does not overwrite user storage; write/getter denial preserves the session choice.
No placeholder code or undefined production helpers are required.


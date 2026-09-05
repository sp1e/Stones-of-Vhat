import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const url = new URL('../src/input/actionBuffer.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('inactive input ignores presses until activated', () => {
  assert.equal(typeof api.createActionBuffer, 'function');
  const buffer = api.createActionBuffer();

  buffer.press('primary');
  buffer.setActive(true);

  assert.deepEqual(buffer.sample(), { held: [], pressed: [] });
});

test('active input tracks held actions and reports a press once', () => {
  assert.equal(typeof api.createActionBuffer, 'function');
  const buffer = api.createActionBuffer();
  buffer.setActive(true);

  buffer.press('forward');
  buffer.press('forward');

  assert.deepEqual(buffer.sample(), { held: ['forward'], pressed: ['forward'] });
  buffer.press('forward');
  assert.deepEqual(buffer.sample(), { held: ['forward'], pressed: [] });
});

test('a quick tap remains pressed for one sample', () => {
  assert.equal(typeof api.createActionBuffer, 'function');
  const buffer = api.createActionBuffer();
  buffer.setActive(true);

  buffer.press('jump');
  buffer.release('jump');

  assert.deepEqual(buffer.sample(), { held: [], pressed: ['jump'] });
  assert.deepEqual(buffer.sample(), { held: [], pressed: [] });
});

test('deactivation clears held and pending actions', () => {
  assert.equal(typeof api.createActionBuffer, 'function');
  const buffer = api.createActionBuffer();
  buffer.setActive(true);
  buffer.press('primary');
  buffer.press('secondary');

  buffer.setActive(false);
  buffer.setActive(true);

  assert.deepEqual(buffer.sample(), { held: [], pressed: [] });
});

test('mutating a snapshot does not mutate the buffer', () => {
  assert.equal(typeof api.createActionBuffer, 'function');
  const buffer = api.createActionBuffer();
  buffer.setActive(true);
  buffer.press('forward');

  const snapshot = buffer.sample();
  snapshot.held.push('primary');

  assert.deepEqual(buffer.sample(), { held: ['forward'], pressed: [] });
});

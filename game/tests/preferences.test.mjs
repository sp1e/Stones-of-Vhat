import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const url = new URL('../src/settings/preferences.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('decodes null as default preferences', () => {
  assert.equal(typeof api.decodePreferences, 'function', 'missing decodePreferences export');
  assert.deepEqual(api.decodePreferences(null), {
    value: { version: 1, goreEnabled: true },
    source: 'default',
  });
});

test('decodes valid saved preferences', () => {
  assert.equal(typeof api.decodePreferences, 'function', 'missing decodePreferences export');
  assert.deepEqual(api.decodePreferences('{"version":1,"goreEnabled":false}'), {
    value: { version: 1, goreEnabled: false },
    source: 'saved',
  });
});

test('round-trips preferences through the encoder', () => {
  assert.equal(typeof api.decodePreferences, 'function', 'missing decodePreferences export');
  assert.equal(typeof api.encodePreferences, 'function', 'missing encodePreferences export');
  const value = { version: 1, goreEnabled: false };
  const encoded = api.encodePreferences(value);
  assert.equal(encoded, '{"version":1,"goreEnabled":false}');
  assert.deepEqual(api.decodePreferences(encoded).value, value);
});

test('falls back to invalid preferences for malformed or incompatible values', () => {
  assert.equal(typeof api.decodePreferences, 'function', 'missing decodePreferences export');
  for (const raw of [
    '{',
    'null',
    '[]',
    'false',
    '{"version":2,"goreEnabled":false}',
    '{"version":1,"goreEnabled":"false"}',
    '{"version":1}',
  ]) {
    assert.deepEqual(api.decodePreferences(raw), {
      value: { version: 1, goreEnabled: true },
      source: 'invalid',
    });
  }
});

test('returns fresh fallback values without mutating shared state', () => {
  assert.equal(typeof api.decodePreferences, 'function', 'missing decodePreferences export');
  api.decodePreferences(null).value.goreEnabled = false;
  assert.equal(api.decodePreferences(null).value.goreEnabled, true);
});

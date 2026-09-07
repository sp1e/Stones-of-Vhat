import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

test('desktop policy confines files and pointer lock to the local game', async () => {
  assert.ok(existsSync(new URL('../desktop/policy.mjs', import.meta.url)), 'desktop policy must exist');
  const { isGameUrl, assetPath, permitsPointerLock } = await import('../desktop/policy.mjs');
  assert.equal(isGameUrl('app://game/'), true);
  assert.equal(isGameUrl('app://game/assets/main-123.js'), true);
  for (const url of ['https://game/', 'app://evil/', 'app://game:80/', 'app://user@game/', 'file:///C:/secret', 'not a url', 'app://game.evil/']) {
    assert.equal(isGameUrl(url), false, url);
  }
  const root = resolve('test-renderer');
  assert.equal(assetPath(root, 'app://game/'), join(root, 'index.html'));
  assert.equal(assetPath(root, 'app://game/assets/main-A1.js'), join(root, 'assets', 'main-A1.js'));
  for (const url of ['app://game/secret.txt', 'app://game/assets/%2e%2e%2fsecret', 'app://game/assets/a%5cb.js', 'app://game/assets/a:b.js', 'app://game/assets/%00.js', 'app://game/assets/%zz', 'app://evil/assets/main.js', 'app://game/assets/../package.json']) {
    assert.equal(assetPath(root, url), null, url);
  }
  assert.equal(permitsPointerLock('pointerLock', 'app://game/', true), true);
  assert.equal(permitsPointerLock('pointerLock', 'app://game/', false), false);
  assert.equal(permitsPointerLock('media', 'app://game/', true), false);
  assert.equal(permitsPointerLock('pointerLock', 'https://evil/', true), false);
});

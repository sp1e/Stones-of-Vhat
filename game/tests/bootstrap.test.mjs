import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('game package is private ESM with native tests and strict checking', () => {
  const packageUrl = new URL('../package.json', import.meta.url);
  assert.equal(existsSync(packageUrl), true, 'game/package.json is missing');
  const pkg = JSON.parse(readFileSync(packageUrl, 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.mjs');
  assert.equal(pkg.scripts.typecheck, 'tsc --noEmit');
  const config = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
  assert.equal(config.compilerOptions.strict, true);
  assert.equal(config.compilerOptions.lib.includes('ESNext.Disposable'), true, 'Rapier disposal declarations require ESNext.Disposable');
  assert.equal(config.compilerOptions.erasableSyntaxOnly, true);
});

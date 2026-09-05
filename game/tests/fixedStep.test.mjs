import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const url = new URL('../src/runtime/fixedStep.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('advances a fixed cadence consistently across common render rates', () => {
  assert.equal(typeof api.createFixedStepper, 'function');

  for (const hz of [30, 60, 144]) {
    const advance = api.createFixedStepper();
    const ticks = [];

    for (let frame = 0; frame < hz * 10; frame += 1) {
      advance(1 / hz, true, (dt, tick) => {
        assert.equal(dt, 1 / 60);
        ticks.push(tick);
      });
    }

    assert.deepEqual(ticks, Array.from({ length: 600 }, (_, index) => index + 1));
  }
});

test('retains a fractional remainder between frames', () => {
  assert.equal(typeof api.createFixedStepper, 'function');

  const advance = api.createFixedStepper();
  const first = advance(1 / 120, true, () => assert.fail('too early'));
  assert.equal(first.steps, 0);
  assert.equal(first.alpha, 0.5);

  const second = advance(1 / 120, true, () => {});
  assert.equal(second.steps, 1);
  assert.ok(second.alpha < 1e-8);
});

test('clears paused time so paused debt does not leak into resumed simulation', () => {
  assert.equal(typeof api.createFixedStepper, 'function');

  const advance = api.createFixedStepper();
  advance(1 / 120, true, () => assert.fail('too early'));
  advance(20, false, () => assert.fail('paused callback must not run'));

  const first = advance(1 / 120, true, () => assert.fail('paused debt must not leak'));
  assert.equal(first.steps, 0);

  const second = advance(1 / 120, true, () => {});
  assert.equal(second.steps, 1);
  assert.equal(second.tick, 1);
});

test('caps work per frame and reports dropped excess elapsed time', () => {
  assert.equal(typeof api.createFixedStepper, 'function');

  const advance = api.createFixedStepper();
  advance(1 / 120, true, () => assert.fail('seed remainder must not step'));

  let callbacks = 0;
  const first = advance(2.005, true, () => {
    callbacks += 1;
  });
  assert.equal(callbacks, 8);
  assert.equal(first.steps, 8);
  assert.ok(Math.abs(first.alpha - 0.5) < 1e-8);
  assert.ok(Math.abs(first.droppedSeconds - (2.005 - 8 / 60)) < 1e-8);

  const second = advance(0, true, () => assert.fail('whole-step debt must be dropped'));
  assert.equal(second.steps, 0);
  assert.ok(Math.abs(second.alpha - 0.5) < 1e-8);

  const third = advance(1 / 120, true, () => {});
  assert.equal(third.steps, 1);
  assert.equal(third.tick, 9);
});

test('invalid elapsed time clears residual state without advancing ticks', () => {
  assert.equal(typeof api.createFixedStepper, 'function');

  for (const delta of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const advance = api.createFixedStepper();
    advance(1 / 120, true, () => assert.fail('too early'));
    const invalid = advance(delta, true, () => assert.fail('invalid delta callback'));
    assert.equal(invalid.tick, 0);
    assert.equal(invalid.steps, 0);

    const after = advance(1 / 120, true, () => assert.fail('invalid delta must clear residual'));
    assert.equal(after.steps, 0);
  }
});

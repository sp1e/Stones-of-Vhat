import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
const url = new URL('../src/input/gripInput.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};
function setup() { assert.equal(typeof api.createGripInput, 'function'); const input = api.createGripInput(); input.setActive(true); return input; }

test('hold input acquires once, throws once and releases on button up', () => {
  const input = setup();
  input.button(2, true);
  assert.equal(input.sample(0, 0).acquire, true);
  input.setHolding(true);
  assert.equal(input.sample(0, 0).acquire, false);
  input.button(0, true);
  assert.equal(input.sample(0, 0).throwPressed, true);
  assert.equal(input.sample(0, 0).throwPressed, false);
  input.button(2, false);
  assert.equal(input.sample(0, 0).wanted, false);
});
test('toggle is session state and input loss clears all pending actions', () => {
  const input = setup();
  input.setToggle(true);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).wanted, true);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).wanted, false);
  input.button(2, true); input.button(0, true); input.wheel(100); input.rotate(true); input.motion(20, 40);
  input.setActive(false); input.button(2, true);
  input.setActive(true);
  assert.deepEqual(input.sample(0, 0), { wanted: false, acquire: false, throwPressed: false, yaw: 0, pitch: 0, distanceDelta: 0, rotateYaw: 0, rotatePitch: 0 });
});
test('rotation consumes mouse motion without camera motion and wheel is bounded', () => {
  const input = setup();
  assert.equal(input.motion(40, 20), false);
  input.button(2, true); input.sample(0, 0); input.setHolding(true); input.rotate(true);
  assert.equal(input.motion(40, 20), true);
  input.wheel(-10000);
  const sample = input.sample(1, 0.2);
  assert.equal(sample.yaw, 1); assert.equal(sample.pitch, 0.2);
  assert.equal(sample.rotateYaw, -0.12); assert.equal(sample.rotatePitch, -0.08);
  assert.equal(sample.distanceDelta, -0.5);
  assert.equal(input.sample(1, 0.2).rotateYaw, 0);
  input.setActive(false);
  assert.equal(input.motion(100, 100), false);
});
test('failed pickup leaves camera free and a thrown toggle grip can acquire on the next click', () => {
  const input = setup();
  input.setToggle(true);
  input.button(2, true); input.button(2, false);
  input.setHolding(false); // Feedback before sampling must preserve the pending acquire.
  assert.equal(input.sample(0, 0).acquire, true);
  input.setHolding(false); input.rotate(true);
  assert.equal(input.motion(20, 0), false);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).acquire, true);
  input.setHolding(true);
  input.button(0, true); input.button(0, false);
  assert.equal(input.sample(0, 0).throwPressed, true);
  input.setHolding(false);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).acquire, true);
});

test('primary pressed before a confirmed acquisition does not queue a delayed throw', () => {
  const input = setup();
  input.button(2, true);
  input.button(0, true);
  const acquisition = input.sample(0, 0);
  assert.equal(acquisition.acquire, true);
  assert.equal(acquisition.throwPressed, false);
  input.setHolding(true);
  assert.equal(input.sample(0, 0).throwPressed, false);
  input.button(0, false); input.button(0, true);
  assert.equal(input.sample(0, 0).throwPressed, true);
});

test('distinct consecutive-tick clicks can acquire after a failed pickup in hold and toggle modes', async () => {
  const { createYard } = await import('../src/physics/yard.ts');
  const idle = { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false };
  for (const toggle of [false, true]) {
    const yard = await createYard({ layout: [
      { id: 'floor', shape: { kind: 'box', size: [20, 1, 20] }, position: { x: 0, y: -0.5, z: 0 }, color: '#777777' },
      { id: 'prop', shape: { kind: 'box', size: [0.6, 0.6, 0.6] }, position: { x: 0, y: 0.31, z: 4 }, mass: 2, color: '#777777' },
    ] });
    try {
      for (let tick = 0; tick < 60; tick++) yard.step(idle);
      const input = setup(); input.setToggle(toggle);
      input.button(2, true);
      const missed = input.sample(Math.PI, 0);
      assert.equal(missed.acquire, true);
      yard.step(idle, missed);
      assert.equal(yard.snapshot().grip.heldId, null);
      input.setHolding(false);
      input.button(2, false); input.button(2, true);
      const state = yard.snapshot();
      const prop = state.bodies.find(body => body.id === 'prop').position;
      const pitch = Math.atan2(prop.y - state.player.eye.y, state.player.eye.z - prop.z);
      const nextClick = input.sample(0, pitch);
      assert.equal(nextClick.acquire, true, 'next command represents a distinct physical click');
      yard.step(idle, nextClick);
      assert.equal(yard.snapshot().grip.heldId, 'prop', `consecutive click must acquire in ${toggle ? 'toggle' : 'hold'} mode`);
      input.setHolding(true);
      const held = input.sample(0, pitch);
      assert.equal(held.acquire, false, 'continued button holding emits no acquisition pulse');
      yard.step(idle, held);
      assert.equal(yard.snapshot().grip.heldId, 'prop');
    } finally { yard.destroy(); }
  }
});

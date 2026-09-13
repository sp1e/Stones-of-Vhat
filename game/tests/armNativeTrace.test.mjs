import assert from 'node:assert/strict';
import test from 'node:test';
import R from '@dimforge/rapier3d-compat';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { dt, poseNear } from './bodyMotionHelpers.mjs';

await R.init();

test('arm trace samples the existing one animation and eight physical native steps exactly', async () => {
  const original = R.World.prototype.step;
  const observed = [];
  let arm;
  try {
    R.World.prototype.step = function (...args) {
      const result = original.apply(this, args);
      const poses = [];
      this.forEachRigidBody(body => poses.push({
        position: { ...body.translation() }, rotation: { ...body.rotation() },
      }));
      observed.push({ dt: this.timestep, poses });
      return result;
    };
    arm = await createArmFixture();
    assert.equal(arm.snapshot().interval.nativeTrace, undefined);
    assert.equal(observed.length, 1);

    arm.setActive(true);
    arm.step();
    const animation = arm.snapshot();
    assert.ok(animation.interval.nativeTrace, 'animation must publish its native trace');
    assert.equal(animation.interval.nativeTrace.samples.length, 2);
    assert.equal(observed.length, 2);

    arm.handoff({ worldEpoch: animation.worldEpoch, atTick: animation.tick, impulse: null });
    const boundary = arm.snapshot();
    observed.length = 0;
    arm.step();
    const state = arm.snapshot();
    const trace = state.interval.nativeTrace;
    assert.equal(observed.length, 8);
    assert.equal(trace.samples.length, 9);
    assert.equal(state.tick, animation.tick + 1);
    for (let i = 0; i <= 8; i++) {
      assert.equal(trace.samples[i].offsetS, i * dt / 8);
      for (const [index, entry] of trace.samples[i].bodies.entries()) {
        assert.deepEqual(entry.ref, state.interval.bodies[index].ref);
        if (i > 0) {
          poseNear(entry.endpoint.bodyOriginWorld, observed[i - 1].poses[index], 1e-12, 1e-7);
        }
      }
    }
    for (let index = 0; index < 2; index++) {
      const zero = trace.samples[0].bodies[index].endpoint;
      assert.equal(zero.authority, 'physics');
      assert.deepEqual(zero.comVelocityWorldMps, boundary.segments[index].comVelocityWorldMps);
      assert.deepEqual(state.interval.bodies[index].discontinuities, ['authority']);
    }

    const intact = arm.snapshot();
    trace.samples[1].bodies[0].endpoint.colliders[0].shape.size[0] = 999;
    trace.samples[1].bodies[0].endpoint.bodyOriginWorld.position.x = 999;
    state.segments[0].binding.boneToBody.position.x = 999;
    state.segments[0].jointAnchorLocal.x = 999;
    assert.deepEqual(arm.snapshot(), intact);

    arm.setActive(false);
    const paused = arm.snapshot();
    assert.equal(arm.step(), false);
    assert.deepEqual(arm.snapshot(), paused);
    assert.equal(observed.length, 8);
  } finally {
    R.World.prototype.step = original;
    arm?.destroy();
  }
});

test('native trace capture failure invalidates the whole arm owner without exposing a partial interval', async () => {
  const arm = await createArmFixture();
  const original = R.RigidBody.prototype.localCom;
  try {
    arm.setActive(true);
    arm.step();
    const retained = arm.snapshot();
    assert.ok(retained.interval.nativeTrace, 'completed trace required before failure');
    arm.handoff({ worldEpoch: retained.worldEpoch, atTick: retained.tick, impulse: null });
    let calls = 0;
    R.RigidBody.prototype.localCom = function (...args) {
      if (++calls === 6) throw new Error('injected native trace capture failure');
      return original.apply(this, args);
    };
    assert.throws(() => arm.step(), /trace capture failure/);
    assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
    assert.throws(() => arm.snapshot(), /destroyed/i);
    assert.equal(retained.interval.toTick, 1);
    assert.equal(retained.interval.nativeTrace.samples.length, 2);
  } finally {
    R.RigidBody.prototype.localCom = original;
    arm.destroy();
  }
});

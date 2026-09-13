import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { poseNear, vecNear } from './bodyMotionHelpers.mjs';

const url = new URL('../src/lab/armLabTrace.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('arm trace frame projects detached historical geometry from measured native samples', async () => {
  assert.equal(typeof api.armTraceFrame, 'function');
  const arm = await createArmFixture();
  try {
    arm.setActive(true);
    arm.step();
    const before = arm.snapshot();
    arm.handoff({ worldEpoch: before.worldEpoch, atTick: before.tick, impulse: null });
    arm.step();
    arm.setActive(false);
    const snapshot = arm.snapshot();
    const snapshotClone = structuredClone(snapshot);

    const finalFrame = api.armTraceFrame(snapshot, 8);
    assert.equal(finalFrame.offsetS, snapshot.interval.dtS);
    for (let index = 0; index < snapshot.segments.length; index++) {
      const frameSegment = finalFrame.segments[index];
      const ownerSegment = snapshot.segments[index];
      assert.deepEqual(Object.keys(frameSegment).sort(), [
        'anchorWorld', 'bodyOriginWorld', 'boneWorld', 'colliderWorld', 'comWorld',
      ]);
      poseNear(frameSegment.bodyOriginWorld, ownerSegment.bodyOriginWorld, 1e-6, 1e-6);
      poseNear(frameSegment.boneWorld, ownerSegment.boneWorld, 1e-6, 1e-6);
      poseNear(frameSegment.colliderWorld, ownerSegment.colliderWorld, 1e-6, 1e-6);
      vecNear(frameSegment.comWorld, ownerSegment.comWorld, 1e-6);
      vecNear(frameSegment.anchorWorld, snapshot.metrics.anchorsWorld[index], 1e-6);
      vecNear(finalFrame.anchorsWorld[index], snapshot.metrics.anchorsWorld[index], 1e-6);
    }

    const firstFrame = api.armTraceFrame(snapshot, 0);
    assert.notDeepEqual(firstFrame.segments[0].bodyOriginWorld, finalFrame.segments[0].bodyOriginWorld);

    finalFrame.segments[0].bodyOriginWorld.position.x = 999;
    finalFrame.segments[0].comWorld.x = 999;
    assert.deepEqual(snapshot, snapshotClone);
    assert.deepEqual(arm.snapshot(), snapshotClone);

    for (const index of [-1, .5, 9, Number.NaN]) {
      assert.throws(() => api.armTraceFrame(snapshot, index), /sample|index/i);
    }
  } finally {
    arm.destroy();
  }
});

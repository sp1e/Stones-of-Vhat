import assert from 'node:assert/strict';
import test from 'node:test';

import { armContactFrame } from '../src/lab/armContactFrame.ts';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import { composeRigid } from '../src/physics/poseBinding.ts';
import { FIXED_DT } from '../src/runtime/fixedStep.ts';
import { armTraceFrame } from '../src/lab/armLabTrace.ts';
import { Matrix4, Quaternion, Vector3 } from 'three';

const identity = { x: 0, y: 0, z: 0, w: 1 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rotationDistance = (a, b) => Math.min(
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w),
  Math.hypot(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w),
);
const matrix = pose => new Matrix4().compose(
  new Vector3(pose.position.x, pose.position.y, pose.position.z),
  new Quaternion(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w).normalize(),
  new Vector3(1, 1, 1),
);
const poseFromMatrix = value => {
  const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
  value.decompose(position, rotation, scale);
  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
  };
};
const independentCompose = (a, b) => poseFromMatrix(matrix(a).multiply(matrix(b)));

async function physicalInterval() {
  const arm = await createArmFixture();
  arm.setActive(true);
  assert.equal(arm.step(), true);
  const boundary = arm.snapshot();
  assert.equal(arm.queueHandoff({ worldEpoch: boundary.worldEpoch, atTick: boundary.tick, impulse: null }), true);
  assert.equal(arm.step(), true);
  arm.setActive(false);
  return { arm, snapshot: arm.snapshot() };
}

test('exports the completed-contact inspection helper', () => {
  assert.equal(typeof armContactFrame, 'function');
});

test('samples real physical contact geometry at zero, an interior model time and dt', async () => {
  const { arm, snapshot } = await physicalInterval();
  try {
    assert.equal(snapshot.interval.nativeTrace.samples.length, 9);
    const motion = createContactMotion(snapshot.interval);
    const times = [0, FIXED_DT * 4.5 / 8, FIXED_DT];
    for (const offsetS of times) {
      const frame = armContactFrame(snapshot, offsetS);
      assert.equal(frame.offsetS, offsetS);
      assert.equal(frame.worldEpoch, snapshot.worldEpoch);
      assert.equal(frame.fromTick, snapshot.interval.fromTick);
      assert.equal(frame.toTick, snapshot.interval.toTick);
      assert.equal(frame.model, motion.model);
      assert.equal(frame.segments.length, snapshot.segments.length);
      for (const [index, segment] of frame.segments.entries()) {
        const source = snapshot.segments[index];
        const expected = motion.sample({ ...source.ref, colliderId: 'shape' }, offsetS);
        const intervalBody = snapshot.interval.bodies.find(body => body.ref.bodyId === source.ref.bodyId);
        const expectedCom = composeRigid(expected.bodyOriginWorld, {
          position: intervalBody.from.comLocal,
          rotation: identity,
        }).position;
        assert.deepEqual(segment.ref, source.ref);
        assert.deepEqual(segment.bodyOriginWorld, expected.bodyOriginWorld);
        assert.deepEqual(segment.colliderWorld, expected.colliderWorld);
        assert.ok(distance(segment.comWorld, expectedCom) < 1e-12);
        assert.deepEqual(frame.anchorsWorld[index], segment.anchorWorld);
      }
    }
  } finally {
    arm.destroy();
  }
});

test('reconstructs rotating COM from body-local offset instead of world-COM lerp', async () => {
  const { arm, snapshot } = await physicalInterval();
  try {
    const sampleIndex = 4;
    const a = snapshot.interval.nativeTrace.samples[sampleIndex];
    const b = snapshot.interval.nativeTrace.samples[sampleIndex + 1];
    const offsetS = (a.offsetS + b.offsetS) / 2;
    const frame = armContactFrame(snapshot, offsetS);
    const segment = frame.segments.find(item => item.ref.bodyId === 'forearm');
    const from = a.bodies.find(item => item.ref.bodyId === 'forearm').endpoint.comWorld;
    const to = b.bodies.find(item => item.ref.bodyId === 'forearm').endpoint.comWorld;
    const linear = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 };
    const body = snapshot.interval.bodies.find(item => item.ref.bodyId === 'forearm');
    const expected = independentCompose(segment.bodyOriginWorld, {
      position: body.from.comLocal,
      rotation: identity,
    }).position;
    assert.ok(distance(segment.comWorld, expected) < 1e-12);
    assert.ok(distance(segment.comWorld, linear) > 1e-12,
      'a rotating body-local COM should not be reconstructed by lerping world COM samples');
  } finally {
    arm.destroy();
  }
});

test('independently reconstructs bone, collider, anchor and COM full transforms at interior time', async () => {
  const { arm, snapshot } = await physicalInterval();
  try {
    const offsetS = FIXED_DT * 3.25 / 8;
    const frame = armContactFrame(snapshot, offsetS);
    for (const segment of frame.segments) {
      const source = snapshot.segments.find(item => item.ref.bodyId === segment.ref.bodyId);
      const body = snapshot.interval.bodies.find(item => item.ref.bodyId === segment.ref.bodyId);
      const collider = body.from.colliders.find(item => item.ref.colliderId === 'shape');
      const bone = poseFromMatrix(matrix(segment.bodyOriginWorld).multiply(matrix(source.binding.boneToBody).invert()));
      const expectedCollider = independentCompose(segment.bodyOriginWorld, collider.localPose);
      const anchor = independentCompose(segment.bodyOriginWorld, { position: source.jointAnchorLocal, rotation: identity });
      const com = independentCompose(segment.bodyOriginWorld, { position: body.from.comLocal, rotation: identity });
      assert.ok(distance(segment.boneWorld.position, bone.position) < 1e-12);
      assert.ok(rotationDistance(segment.boneWorld.rotation, bone.rotation) < 1e-12);
      assert.ok(distance(segment.colliderWorld.position, expectedCollider.position) < 1e-12);
      assert.ok(rotationDistance(segment.colliderWorld.rotation, expectedCollider.rotation) < 1e-12);
      assert.ok(distance(segment.anchorWorld, anchor.position) < 1e-12);
      assert.ok(distance(segment.comWorld, com.position) < 1e-12);
    }
  } finally {
    arm.destroy();
  }
});

test('agrees with measured native-boundary geometry within normalization tolerance', async () => {
  const { arm, snapshot } = await physicalInterval();
  try {
    for (const sampleIndex of [0, 4, 8]) {
      const measured = armTraceFrame(snapshot, sampleIndex);
      const derived = armContactFrame(snapshot, snapshot.interval.nativeTrace.samples[sampleIndex].offsetS);
      for (let index = 0; index < measured.segments.length; index++) {
        for (const key of ['bodyOriginWorld', 'boneWorld', 'colliderWorld']) {
          assert.ok(distance(measured.segments[index][key].position, derived.segments[index][key].position) < 1e-12);
          assert.ok(rotationDistance(measured.segments[index][key].rotation, derived.segments[index][key].rotation) < 1e-7);
        }
        assert.ok(distance(measured.segments[index].comWorld, derived.segments[index].comWorld) < 1e-6);
        assert.ok(distance(measured.segments[index].anchorWorld, derived.segments[index].anchorWorld) < 1e-12);
      }
    }
  } finally {
    arm.destroy();
  }
});

test('rejects incomplete intervals, invalid model times and stale segment references', async () => {
  const initialArm = await createArmFixture();
  try {
    assert.throws(() => armContactFrame(initialArm.snapshot(), 0), /completed|contact motion|interval/i);
  } finally {
    initialArm.destroy();
  }
  const { arm, snapshot } = await physicalInterval();
  try {
    for (const offset of [NaN, Infinity, -Number.EPSILON, FIXED_DT + Number.EPSILON]) {
      assert.throws(() => armContactFrame(snapshot, offset), /finite|within|offset/i);
    }
    const stale = structuredClone(snapshot);
    stale.segments[0].ref.worldEpoch = 'stale';
    assert.throws(() => armContactFrame(stale, 0), /segment|epoch|ref|stale/i);
    const missing = structuredClone(snapshot);
    missing.segments.pop();
    assert.throws(() => armContactFrame(missing, 0), /segment|complete|two/i);
  } finally {
    arm.destroy();
  }
});

test('returns detached geometry and remains valid after the captured owner is destroyed', async () => {
  const { arm, snapshot } = await physicalInterval();
  arm.destroy();
  const before = structuredClone(snapshot);
  const frame = armContactFrame(snapshot, FIXED_DT / 3);
  frame.segments[0].bodyOriginWorld.position.x = 999;
  frame.anchorsWorld.length = 0;
  assert.deepEqual(snapshot, before);
  const again = armContactFrame(snapshot, FIXED_DT / 3);
  assert.notEqual(again.segments[0].bodyOriginWorld.position.x, 999);
  assert.equal(again.anchorsWorld.length, 2);
});

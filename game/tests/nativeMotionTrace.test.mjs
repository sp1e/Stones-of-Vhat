import assert from 'node:assert/strict';
import test from 'node:test';
import R from '@dimforge/rapier3d-compat';
import { createBodyMotion } from '../src/physics/bodyMotion.ts';
import { rigid } from '../src/physics/poseBinding.ts';
import { zero, dt, q } from './bodyMotionHelpers.mjs';
await R.init();

function fixture(rotation = { x: 0, y: 0, z: 0, w: 1 }) {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = dt / 8;
  const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).setLinvel(2, 0, 0).setRotation(rotation));
  const collider = world.createCollider(R.ColliderDesc.ball(.1).setMass(1).setRotation(rotation), body);
  const second = world.createRigidBody(R.RigidBodyDesc.fixed());
  const otherCollider = world.createCollider(R.ColliderDesc.ball(.1), second);
  world.step();
  let shape = { kind: 'ball', radius: .1 };
  const motion = createBodyMotion(world, [
    { bodyId: 'body', body, colliders: [{ colliderId: 'shape', collider, role: 'blocker', shape: () => shape }] },
    { bodyId: 'second', body: second, colliders: [{ colliderId: 'shape', collider: otherCollider, role: 'blocker', shape: () => shape }] },
  ]);
  return { world, body, collider, second, otherCollider, motion,
    setShape: value => { collider.setShape(new R.Ball(value.radius)); otherCollider.setShape(new R.Ball(value.radius)); shape = value; },
    destroy() { motion.destroy(); world.free(); } };
}

test('native trace publishes actual curved native boundaries atomically with detached full endpoints', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    const initial = f.motion.read();
    assert.equal(initial.nativeTrace, undefined);
    f.motion.beginNativeTrace();
    const observed = [{ ...f.body.translation() }];
    for (let i = 1; i <= 8; i++) {
      f.world.step(); observed.push({ ...f.body.translation() });
      f.motion.captureNativeStep(i * dt / 8);
      assert.deepEqual(f.motion.read(), initial);
    }
    f.motion.completeStep();
    const result = f.motion.read(), trace = result.nativeTrace;
    assert.equal(trace.kind, 'measured-native-boundaries');
    assert.equal(trace.samples.length, 9);
    assert.equal(result.toTick, 1);
    for (let i = 0; i <= 8; i++) {
      assert.equal(trace.samples[i].offsetS, i * dt / 8);
      assert.equal(trace.samples[i].bodies.length, 2);
      assert.deepEqual(trace.samples[i].bodies[0].endpoint.bodyOriginWorld.position, observed[i]);
      f.motion.assertRef(trace.samples[i].bodies[0].ref);
      f.motion.assertRef(trace.samples[i].bodies[0].endpoint.colliders[0].ref);
    }
    const middle = observed[4], chordY = (observed[0].y + observed[8].y) / 2;
    assert.ok(Math.abs(middle.y - chordY) > 1e-5, 'native middle must differ from endpoint chord');
    assert.deepEqual(trace.samples[8].bodies[0].endpoint, result.bodies[0].to);
    const retained = f.motion.read();
    trace.samples[0].bodies[0].endpoint.colliders[0].shape.radius = 999;
    trace.samples[0].bodies[0].endpoint.colliders[0].localPose.position.x = 999;
    trace.samples[0].bodies[0].ref.bodyId = 'tampered';
    assert.deepEqual(f.motion.read(), retained);
    f.world.step(); f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace, undefined);
    assert.equal(retained.nativeTrace.samples.length, 9);
  } finally { f.destroy(); }
});

test('native trace accepts sign-equivalent body and collider rotations without rewriting recorded endpoints', () => {
  const negative = rotation => Object.fromEntries(Object.entries(rotation).map(([key, value]) => [key, -value]));
  for (const rotation of [q([1, 0, 0], 0), q([1, 0, 0], .7), q([0, 1, 0], 1.3), q([0, 0, 1], 2.1)]) {
    const f = fixture(rotation);
    try {
      const initial = f.motion.read();
      f.body.setRotation(negative(f.body.rotation()), true);
      f.collider.setRotationWrtParent(negative(f.collider.rotationWrtParent()));
      assert.doesNotThrow(() => f.motion.beginNativeTrace(), `q/-q begin must preserve pose continuity: ${JSON.stringify({
        initial: initial.bodies[0].to, bodyRotation: f.body.rotation(), colliderRotation: f.collider.rotationWrtParent(),
        bodyPosition: f.body.translation(), colliderPosition: f.collider.translationWrtParent(),
      })}`);
      f.motion.captureNativeStep(dt / 2);
      f.body.setRotation(negative(f.body.rotation()), true);
      f.collider.setRotationWrtParent(negative(f.collider.rotationWrtParent()));
      assert.doesNotThrow(() => f.motion.captureNativeStep(dt), 'q/-q collider boundary must retain pose continuity');
      const recordedRotation = { ...f.body.rotation() };
      const recordedColliderRotation = { ...f.collider.rotationWrtParent() };
      f.body.setRotation(negative(f.body.rotation()), true);
      f.collider.setRotationWrtParent(negative(f.collider.rotationWrtParent()));
      assert.doesNotThrow(() => f.motion.completeStep(), 'q/-q final endpoint must compare as same orientation');
      const completed = f.motion.read();
      assert.deepEqual(completed.bodies[0].from, initial.bodies[0].to);
      const recorded = completed.nativeTrace.samples.at(-1).bodies[0].endpoint;
      assert.deepEqual(recorded.bodyOriginWorld.rotation, rigid({ position: zero, rotation: recordedRotation }).rotation);
      assert.deepEqual(recorded.colliders[0].localPose.rotation, rigid({ position: zero, rotation: recordedColliderRotation }).rotation);
      assert.ok(completed.nativeTrace.samples.at(-1).bodies[0].endpoint.bodyOriginWorld.rotation.w * recordedRotation.w > 0);
      assert.ok(completed.bodies[0].to.bodyOriginWorld.rotation.w * recordedRotation.w < 0);
    } finally { f.destroy(); }
  }
});

test('native trace final endpoint accepts an isolated native quaternion sign flip', () => {
  for (const target of ['body', 'collider']) {
    const f = fixture(q([0, 1, 0], 1.3));
    try {
      f.motion.beginNativeTrace(); f.motion.captureNativeStep(dt);
      const original = target === 'body' ? f.body.rotation() : f.collider.rotationWrtParent();
      const negative = { x: -original.x, y: -original.y, z: -original.z, w: -original.w };
      if (target === 'body') f.body.setRotation(negative, true);
      else f.collider.setRotationWrtParent(negative);
      assert.doesNotThrow(() => f.motion.completeStep(), `${target} final q/-q must compare as same orientation`);
    } finally { f.destroy(); }
  }
});

test('native trace rejects changed rotations at begin and final while leaving the exact prior draft recoverable', () => {
  for (const target of ['body', 'collider']) {
    const f = fixture();
    try {
      const initial = f.motion.read();
      const original = target === 'body' ? { ...f.body.rotation() } : { ...f.collider.rotationWrtParent() };
      const set = rotation => target === 'body' ? f.body.setRotation(rotation, true) : f.collider.setRotationWrtParent(rotation);
      set(q([0, 1, 0], .01));
      assert.throws(() => f.motion.beginNativeTrace(), /pose|continuity/i);
      assert.deepEqual(f.motion.read(), initial);
      set(original); f.motion.beginNativeTrace(); f.motion.captureNativeStep(dt);
      set(q([0, 1, 0], .01));
      assert.throws(() => f.motion.completeStep(), /changed|final/i);
      assert.deepEqual(f.motion.read(), initial);
      set(original); f.motion.completeStep();
      assert.equal(f.motion.read().nativeTrace.samples.length, 2);
    } finally { f.destroy(); }
  }
});

test('rotation comparison tolerance never relaxes final non-rotation endpoint fields', () => {
  const f = fixture();
  try {
    f.motion.beginNativeTrace(); f.motion.captureNativeStep(dt);
    const initial = f.motion.read();
    // These reader faults isolate the exact full-endpoint publication check.
    for (const method of ['translation', 'worldCom', 'localCom', 'linvel', 'angvel', 'mass', 'isSleeping']) {
      const original = f.body[method];
      try {
        f.body[method] = function (...args) {
          const value = original.apply(this, args);
          return method === 'mass' ? value + 1e-10 : method === 'isSleeping' ? !value
            : { ...value, x: value.x + 1e-10 };
        };
        assert.throws(() => f.motion.completeStep(), /changed|final/i, method);
        assert.deepEqual(f.motion.read(), initial, method);
      } finally { f.body[method] = original; }
    }
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.length, 2);
  } finally { f.destroy(); }
});

test('native trace rejects invalid timing nesting and unfinished completion without replacing publication', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    const initial = f.motion.read();
    assert.throws(() => f.motion.captureNativeStep(dt), /begin|active/i);
    f.motion.beginNativeTrace();
    assert.throws(() => f.motion.beginNativeTrace(), /active|nested/i);
    assert.throws(() => f.motion.completeStep(), /final|unfinished/i);
    for (const offset of [NaN, Infinity, -1, 0, dt + 1e-6]) {
      assert.throws(() => f.motion.captureNativeStep(offset), /offset|finite|increas|duration/i);
      assert.deepEqual(f.motion.read(), initial);
    }
    f.motion.captureNativeStep(dt / 2);
    assert.throws(() => f.motion.captureNativeStep(dt / 2), /increas/i);
    assert.throws(() => f.motion.completeStep(), /final|unfinished/i);
    f.motion.captureNativeStep(dt + 5e-13);
    assert.throws(() => f.motion.captureNativeStep(dt), /increas/i);
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.at(-1).offsetS, dt);
    f.motion.beginNativeTrace();
    for (let i = 1; i <= 16; i++) f.motion.captureNativeStep(i * dt / 16);
    assert.throws(() => f.motion.captureNativeStep(dt), /sixteen|16|limit/i);
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.length, 17);
  } finally { f.destroy(); }
});

test('native trace rejects teleports but admits handoff fields and retains intermediate discontinuities', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    const initial = f.motion.read(), position = f.body.translation();
    f.body.setTranslation({ ...position, x: position.x + .1 }, true);
    assert.throws(() => f.motion.beginNativeTrace(), /pose|continuity/i);
    assert.deepEqual(f.motion.read(), initial);
    f.body.setTranslation(position, true);
    f.collider.setTranslationWrtParent({ x: .1, y: 0, z: 0 });
    assert.throws(() => f.motion.beginNativeTrace(), /pose|continuity/i);
    f.collider.setTranslationWrtParent(zero);
    f.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
    f.body.setLinvel({ x: 3, y: 0, z: 0 }, true);
    f.motion.beginNativeTrace();
    f.collider.setTranslationWrtParent({ x: .2, y: 0, z: 0 });
    assert.throws(() => f.motion.captureNativeStep(dt / 2), /collider|pose/i);
    assert.deepEqual(f.motion.read(), initial);
    f.collider.setTranslationWrtParent(zero);
    f.setShape({ kind: 'ball', radius: .2 });
    f.motion.captureNativeStep(dt / 2);
    f.body.setBodyType(R.RigidBodyType.Dynamic, true);
    f.setShape({ kind: 'ball', radius: .1 });
    f.motion.captureNativeStep(dt);
    f.motion.completeStep();
    assert.deepEqual(f.motion.read().bodies[0].discontinuities, ['shape', 'authority']);
  } finally { f.destroy(); }
});

test('native endpoint failure does not append a half sample and may be corrected before retry', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    f.motion.beginNativeTrace();
    const before = f.motion.read(), original = f.second.mass;
    try {
      f.second.mass = () => NaN;
      assert.throws(() => f.motion.captureNativeStep(dt), /finite/i);
      assert.deepEqual(f.motion.read(), before);
    } finally { f.second.mass = original; }
    f.motion.captureNativeStep(dt);
    f.body.setLinvel({ x: 9, y: 0, z: 0 }, true);
    assert.throws(() => f.motion.completeStep(), /changed|final/i);
    assert.deepEqual(f.motion.read(), before);
    f.body.setLinvel(before.bodies[0].to.comVelocityWorldMps, true);
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.length, 2);
  } finally { f.destroy(); }
});

test('native trace validates live collider membership before each capture and clears draft on destroy', () => {
  for (const phase of ['begin', 'capture', 'complete']) {
    const f = fixture();
    try {
      assert.equal(typeof f.motion.beginNativeTrace, 'function');
      const before = f.motion.read();
      if (phase !== 'begin') f.motion.beginNativeTrace();
      if (phase === 'complete') f.motion.captureNativeStep(dt);
      f.world.removeCollider(f.otherCollider, true);
      assert.throws(() => phase === 'begin' ? f.motion.beginNativeTrace()
        : phase === 'capture' ? f.motion.captureNativeStep(dt) : f.motion.completeStep(), /collider|reference/i);
      assert.deepEqual(f.motion.read(), before);
      f.motion.destroy();
      for (const action of [() => f.motion.beginNativeTrace(), () => f.motion.captureNativeStep(dt),
        () => f.motion.completeStep(), () => f.motion.read()]) assert.throws(action, /destroyed/i);
    } finally { f.destroy(); }
  }
});

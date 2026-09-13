import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { dt, identity, pose, q, vecNear, poseNear } from './bodyMotionHelpers.mjs';
import { createArmFixture } from '../src/physics/armFixture.ts';

const url = new URL('../src/physics/contactMotion.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('exports the detached contact-motion compiler', () => {
  assert.equal(typeof api.createContactMotion, 'function');
});

const clone = value => structuredClone(value);
const rotated = (rotation, value) => {
  const v = new Vector3(value.x, value.y, value.z).applyQuaternion(
    new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w).normalize(),
  );
  return { x: v.x, y: v.y, z: v.z };
};
const endpoint = (worldEpoch, bodyId, offsetS, options = {}) => {
  const angle = options.angle ?? offsetS * 12;
  const origin = pose({ x: offsetS * 12, y: 1, z: 0 }, q([0, 0, 1], angle));
  const comLocal = { x: .05, y: 0, z: 0 };
  const comOffset = rotated(origin.rotation, comLocal);
  return {
    bodyOriginWorld: origin,
    comLocal,
    comWorld: {
      x: origin.position.x + comOffset.x,
      y: origin.position.y + comOffset.y,
      z: origin.position.z + comOffset.z,
    },
    comVelocityWorldMps: { x: 1, y: 2, z: 3 },
    angularVelocityWorldRadps: { x: 0, y: 0, z: 12 },
    authority: options.authority ?? 'physics', massKg: 2, sleeping: false,
    colliders: [
      {
        ref: { worldEpoch, bodyId, colliderId: 'blade' },
        role: 'blocker',
        localPose: pose({ x: .2, y: 0, z: 0 }, q([0, 1, 0], .2)),
        shape: { kind: 'box', size: [.4, .2, .1] },
      },
      {
        ref: { worldEpoch, bodyId, colliderId: 'nav' },
        role: 'navigation',
        localPose: pose(),
        shape: { kind: 'capsule', halfHeight: .2, radius: .1 },
      },
    ],
  };
};
const interval = (sampleOffsets = [0, dt / 2, dt]) => {
  const worldEpoch = 'epoch-1', bodyId = 'arm';
  const samples = sampleOffsets.map(offsetS => ({
    offsetS,
    bodies: [{ ref: { worldEpoch, bodyId }, endpoint: endpoint(worldEpoch, bodyId, offsetS) }],
  }));
  return {
    worldEpoch,
    kind: 'completed',
    fromTick: 4,
    toTick: 5,
    dtS: dt,
    bodies: [{
      ref: { worldEpoch, bodyId },
      from: clone(samples[0].bodies[0].endpoint),
      to: clone(samples.at(-1).bodies[0].endpoint),
      discontinuities: [],
    }],
    nativeTrace: { kind: 'measured-native-boundaries', samples },
  };
};

test('compiles blocker tracks into a frozen detached facade and excludes navigation colliders', () => {
  assert.equal(api.CONTACT_MOTION_MODEL, 'native-boundary-origin-lerp-shortest-slerp');
  assert.ok(Object.isFrozen(api.CONTACT_MOTION_LIMITS));
  const input = interval(), original = clone(input);
  const motion = api.createContactMotion(input);
  assert.ok(Object.isFrozen(motion));
  assert.deepEqual(
    { model: motion.model, worldEpoch: motion.worldEpoch, fromTick: motion.fromTick, toTick: motion.toTick, dtS: motion.dtS },
    { model: api.CONTACT_MOTION_MODEL, worldEpoch: 'epoch-1', fromTick: 4, toTick: 5, dtS: dt },
  );
  const colliders = motion.colliders();
  assert.equal(colliders.length, 1);
  assert.equal(colliders[0].ref.colliderId, 'blade');
  assert.equal(colliders[0].radiusFromBodyOriginM, .2 + Math.hypot(.2, .1, .05));
  input.nativeTrace.samples[0].bodies[0].endpoint.bodyOriginWorld.position.x = 99;
  input.bodies[0].from.colliders[0].shape.size[0] = 99;
  assert.deepEqual(original, interval());
  assert.equal(motion.sample(motion.colliders()[0].ref, 0).bodyOriginWorld.position.x, 0);
  colliders[0].shape.size[0] = 99;
  colliders[0].ref.colliderId = 'changed';
  assert.equal(motion.colliders()[0].shape.size[0], .4);
  assert.equal(motion.colliders()[0].ref.colliderId, 'blade');
});

test('samples exact measured knots and uses the right half-open span derivative', () => {
  const motion = api.createContactMotion(interval());
  const ref = motion.colliders()[0].ref;
  const zero = motion.sample(ref, 0);
  const knot = motion.sample(ref, dt / 2);
  const end = motion.sample(ref, dt);
  assert.equal(zero.spanIndex, 0);
  assert.equal(knot.spanIndex, 1);
  assert.equal(end.spanIndex, 1);
  assert.equal(knot.spanStartS, dt / 2);
  assert.equal(knot.spanEndS, dt);
  poseNear(zero.bodyOriginWorld, endpoint('epoch-1', 'arm', 0).bodyOriginWorld, 1e-12, 1e-12);
  poseNear(knot.bodyOriginWorld, endpoint('epoch-1', 'arm', dt / 2).bodyOriginWorld, 1e-12, 1e-12);
  poseNear(end.bodyOriginWorld, endpoint('epoch-1', 'arm', dt).bodyOriginWorld, 1e-12, 1e-12);
  vecNear(knot.originVelocityWorldMps, { x: 12, y: 0, z: 0 }, 1e-12);
  vecNear(knot.angularVelocityWorldRadps, { x: 0, y: 0, z: 12 }, 1e-10);
  assert.ok(Math.abs(knot.pointSpeedBoundMps - (12 + 12 * motion.colliders()[0].radiusFromBodyOriginM)) < 1e-10);
  const retained = motion.sample(ref, dt / 4);
  retained.bodyOriginWorld.position.x = 99;
  retained.colliderWorld.position.x = 99;
  assert.notEqual(motion.sample(ref, dt / 4).bodyOriginWorld.position.x, 99);
});

test('uses constant-rate shortest SLERP for small angular spans', () => {
  const value = interval([0, dt]);
  const first = value.nativeTrace.samples[0].bodies[0].endpoint;
  const last = value.nativeTrace.samples[1].bodies[0].endpoint;
  setOrigin(first, { x: 0, y: 0, z: 0 }, identity);
  setOrigin(last, { x: 0, y: 0, z: 0 }, q([0, 0, 1], .06));
  value.bodies[0].from = clone(first);
  value.bodies[0].to = clone(last);
  allEndpoints(value, endpoint => {
    endpoint.colliders[0].shape = { kind: 'ball', radius: .0005 };
    endpoint.colliders[0].localPose = pose({ x: 31, y: 0, z: 0 }, identity);
  });

  const motion = api.createContactMotion(value);
  const ref = motion.colliders()[0].ref;
  const quarter = motion.sample(ref, dt / 4);
  const quarterAngle = 2 * Math.atan2(
    Math.hypot(
      quarter.bodyOriginWorld.rotation.x,
      quarter.bodyOriginWorld.rotation.y,
      quarter.bodyOriginWorld.rotation.z,
    ),
    Math.abs(quarter.bodyOriginWorld.rotation.w),
  );
  assert.ok(Math.abs(quarterAngle - .015) < 1e-13, `quarter angle was ${quarterAngle}`);
  vecNear(quarter.colliderWorld.position, {
    x: 31 * Math.cos(.015),
    y: 31 * Math.sin(.015),
    z: 0,
  }, 1e-12);

  const h = dt * 1e-5;
  const before = motion.sample(ref, dt / 2 - h).colliderWorld.position;
  const after = motion.sample(ref, dt / 2 + h).colliderWorld.position;
  const centeredSpeed = Math.hypot(
    after.x - before.x,
    after.y - before.y,
    after.z - before.z,
  ) / (2 * h);
  const frame = motion.sample(ref, dt / 2);
  assert.ok(Math.abs(frame.pointSpeedBoundMps - 111.6018) < 1e-10);
  assert.ok(
    centeredSpeed <= frame.pointSpeedBoundMps + 1e-9,
    `centered speed ${centeredSpeed} exceeded ${frame.pointSpeedBoundMps}`,
  );
});

const rejects = (mutate, pattern = /./) => {
  const value = interval();
  mutate(value);
  assert.throws(() => api.createContactMotion(value), pattern);
};

test('rejects invalid interval and measured-trace envelopes before tracking', () => {
  const cases = [
    [x => { x.kind = 'initial'; }, /completed/i],
    [x => { x.worldEpoch = ''; }, /epoch/i],
    [x => { x.fromTick = -1; }, /tick/i],
    [x => { x.toTick = 7; }, /adjacent|tick/i],
    [x => { x.dtS = dt + 1e-9; }, /duration|fixed|dt/i],
    [x => { delete x.nativeTrace; }, /trace/i],
    [x => { x.nativeTrace.kind = 'guessed'; }, /measured/i],
    [x => { x.nativeTrace.samples = x.nativeTrace.samples.slice(0, 1); }, /sample/i],
    [x => { x.nativeTrace.samples[0].offsetS = 1e-6; }, /zero|start|offset/i],
    [x => { x.nativeTrace.samples.at(-1).offsetS = dt - 1e-6; }, /duration|end|offset/i],
    [x => { x.nativeTrace.samples[1].offsetS = 0; }, /increasing|time|offset/i],
    [x => { x.nativeTrace.samples[1].offsetS = NaN; }, /finite|time|offset/i],
    [x => { x.bodies = []; x.nativeTrace.samples.forEach(s => s.bodies = []); }, /body/i],
    [x => {
      for (const body of x.bodies) {
        for (const endpoint of [body.from, body.to]) {
          endpoint.colliders.forEach(collider => { collider.role = 'navigation'; });
        }
      }
      x.nativeTrace.samples.forEach(sample => sample.bodies.forEach(body => {
        body.endpoint.colliders.forEach(collider => { collider.role = 'navigation'; });
      }));
    }, /blocker/i],
  ];
  for (const [mutate, pattern] of cases) rejects(mutate, pattern);
});

test('validates semantic body and collider membership independent of array and object-key order', () => {
  const reordered = interval();
  reordered.bodies[0].from.colliders.reverse();
  reordered.bodies[0].to.colliders.reverse();
  reordered.nativeTrace.samples.forEach(sample => sample.bodies[0].endpoint.colliders.reverse());
  assert.equal(api.createContactMotion(reordered).colliders().length, 1);
  const cases = [
    x => { x.bodies[0].ref.worldEpoch = 'stale'; },
    x => { x.bodies[0].ref.bodyId = ''; },
    x => { x.nativeTrace.samples[1].bodies[0].ref.bodyId = 'other'; },
    x => { x.nativeTrace.samples[1].bodies.push(clone(x.nativeTrace.samples[1].bodies[0])); },
    x => { x.nativeTrace.samples[1].bodies[0].endpoint.colliders.pop(); },
    x => { x.nativeTrace.samples[1].bodies[0].endpoint.colliders[0].ref.colliderId = 'other'; },
    x => { x.nativeTrace.samples[1].bodies[0].endpoint.colliders.push(clone(x.nativeTrace.samples[1].bodies[0].endpoint.colliders[0])); },
    x => { x.bodies[0].to.colliders[0].shape.size[0] = .5; },
    x => { x.nativeTrace.samples[1].bodies[0].endpoint.massKg = 3; },
    x => { x.nativeTrace.samples[1].bodies[0].endpoint.comLocal.x = .06; },
    x => { x.nativeTrace.samples[1].bodies[0].endpoint.colliders[0].localPose.position.x = .21; },
  ];
  for (const mutate of cases) rejects(mutate, /identity|member|duplicate|missing|extra|match|constant|collider|body/i);
});

test('enforces boundary equality and explicit authority-only discontinuity semantics', () => {
  const changed = interval();
  changed.bodies[0].from.authority = 'animation';
  changed.bodies[0].from.comVelocityWorldMps = { x: 0, y: 0, z: 0 };
  changed.bodies[0].from.angularVelocityWorldRadps = { x: 0, y: 0, z: 0 };
  changed.bodies[0].from.massKg = 1;
  changed.bodies[0].from.sleeping = true;
  changed.bodies[0].discontinuities = ['authority'];
  assert.equal(api.createContactMotion(changed).colliders().length, 1);
  rejects(x => { x.bodies[0].discontinuities = ['shape']; }, /shape|discontinuity/i);
  rejects(x => { x.bodies[0].discontinuities = ['authority', 'authority']; }, /duplicate|discontinuity/i);
  rejects(x => { x.bodies[0].discontinuities = ['authority']; }, /authority|change|discontinuity/i);
  rejects(x => { x.bodies[0].from.authority = 'animation'; }, /authority|discontinuity|match/i);
  rejects(x => { x.bodies[0].from.bodyOriginWorld.position.x = .01; }, /boundary|match|from/i);
  rejects(x => { x.bodies[0].to.comWorld.x += .01; }, /boundary|match|final|to/i);
});

const allEndpoints = (value, fn) => {
  value.bodies.forEach(body => {
    fn(body.from);
    fn(body.to);
  });
  value.nativeTrace.samples.forEach(sample => sample.bodies.forEach(body => fn(body.endpoint)));
};
const setOrigin = (value, position, rotation) => {
  value.bodyOriginWorld = pose(position, rotation);
  const offset = rotated(rotation, value.comLocal);
  value.comWorld = {
    x: position.x + offset.x,
    y: position.y + offset.y,
    z: position.z + offset.z,
  };
};
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

test('compiles the real arm animation and eight measured physics spans without changing its owner', async () => {
  const arm = await createArmFixture();
  try {
    arm.setActive(true);
    assert.equal(arm.step(), true);
    const animation = arm.snapshot(), before = clone(animation);
    const animatedMotion = api.createContactMotion(animation.interval);
    assert.equal(animatedMotion.colliders().length, 4);
    assert.equal(animatedMotion.sample(animatedMotion.colliders()[0].ref, dt).spanIndex, 0);
    assert.deepEqual(arm.snapshot(), before);
    assert.equal(arm.queueHandoff({ worldEpoch: animation.worldEpoch, atTick: animation.tick, impulse: null }), true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    const physical = arm.snapshot(), physicalBefore = clone(physical);
    const physicalMotion = api.createContactMotion(physical.interval);
    assert.equal(physical.interval.nativeTrace.samples.length, 9);
    assert.equal(physicalMotion.sample(physicalMotion.colliders()[0].ref, dt).spanIndex, 7);
    assert.deepEqual(arm.snapshot(), physicalBefore);
    const ref = physicalMotion.colliders()[0].ref;
    arm.destroy();
    assert.doesNotThrow(() => physicalMotion.sample(ref, dt / 2));
  } finally {
    arm.destroy();
  }
});

test('composes a noncommuting interpolated origin with the constant local collider pose', () => {
  const value = interval([0, dt]);
  const qa = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .3)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .2)).normalize();
  const worldDelta = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), .4);
  const qb = worldDelta.clone().multiply(qa).normalize();
  const a = { x: qa.x, y: qa.y, z: qa.z, w: qa.w };
  const b = { x: qb.x, y: qb.y, z: qb.z, w: qb.w };
  setOrigin(value.nativeTrace.samples[0].bodies[0].endpoint, { x: -.3, y: .7, z: .2 }, a);
  setOrigin(value.nativeTrace.samples[1].bodies[0].endpoint, { x: .4, y: 1.1, z: -.1 }, b);
  value.bodies[0].from = clone(value.nativeTrace.samples[0].bodies[0].endpoint);
  value.bodies[0].to = clone(value.nativeTrace.samples[1].bodies[0].endpoint);
  const motion = api.createContactMotion(value);
  const ref = motion.colliders()[0].ref;
  const frame = motion.sample(ref, dt / 2);
  const expectedOriginQ = qa.clone().slerp(qb, .5).normalize();
  const local = value.nativeTrace.samples[0].bodies[0].endpoint.colliders[0].localPose;
  const expectedOffset = new Vector3(local.position.x, local.position.y, local.position.z).applyQuaternion(expectedOriginQ);
  vecNear(frame.colliderWorld.position, {
    x: .05 + expectedOffset.x,
    y: .9 + expectedOffset.y,
    z: .05 + expectedOffset.z,
  }, 1e-12);
  const expectedColliderQ = expectedOriginQ.clone().multiply(new Quaternion(
    local.rotation.x, local.rotation.y, local.rotation.z, local.rotation.w,
  )).normalize();
  poseNear(frame.colliderWorld, {
    position: frame.colliderWorld.position,
    rotation: { x: expectedColliderQ.x, y: expectedColliderQ.y, z: expectedColliderQ.z, w: expectedColliderQ.w },
  }, 1e-12, 1e-12);
  vecNear(frame.angularVelocityWorldRadps, { x: 0, y: 0, z: .4 / dt }, 1e-10);
  const colliderA = new Vector3(local.position.x, local.position.y, local.position.z).applyQuaternion(qa).add(new Vector3(-.3, .7, .2));
  const colliderB = new Vector3(local.position.x, local.position.y, local.position.z).applyQuaternion(qb).add(new Vector3(.4, 1.1, -.1));
  const naive = colliderA.add(colliderB).multiplyScalar(.5);
  assert.ok(new Vector3(
    frame.colliderWorld.position.x,
    frame.colliderWorld.position.y,
    frame.colliderWorld.position.z,
  ).distanceTo(naive) > 1e-4);
});

test('handles q/-q, zero rotation, and multispan reversal without changing right-span derivatives', () => {
  const signed = interval();
  const middle = signed.nativeTrace.samples[1].bodies[0].endpoint.bodyOriginWorld.rotation;
  for (const key of ['x', 'y', 'z', 'w']) middle[key] *= -1;
  const ref = { worldEpoch: 'epoch-1', bodyId: 'arm', colliderId: 'blade' };
  assert.ok(Number.isFinite(api.createContactMotion(signed).sample(ref, dt / 2).pointSpeedBoundMps));
  const still = interval([0, dt]);
  allEndpoints(still, endpoint => setOrigin(endpoint, { x: 0, y: 1, z: 0 }, identity));
  vecNear(api.createContactMotion(still).sample(ref, dt / 2).angularVelocityWorldRadps, { x: 0, y: 0, z: 0 }, 1e-12);
  const reversal = interval();
  const positions = [0, 1, 0];
  reversal.nativeTrace.samples.forEach((sample, index) => setOrigin(sample.bodies[0].endpoint, { x: positions[index], y: 1, z: 0 }, identity));
  reversal.bodies[0].from = clone(reversal.nativeTrace.samples[0].bodies[0].endpoint);
  reversal.bodies[0].to = clone(reversal.nativeTrace.samples[2].bodies[0].endpoint);
  const motion = api.createContactMotion(reversal);
  const frame = motion.sample(ref, dt / 2);
  assert.equal(frame.spanIndex, 1);
  vecNear(frame.originVelocityWorldMps, { x: -120, y: 0, z: 0 }, 1e-10);
});

test('accepts exact path limits and rejects values just outside without clamping', () => {
  const exact = interval([0, dt]);
  const radius = .2 + Math.hypot(.2, .1, .05);
  const startX = 32 - radius - 128 * dt;
  setOrigin(exact.nativeTrace.samples[0].bodies[0].endpoint, { x: startX, y: 0, z: 0 }, identity);
  setOrigin(exact.nativeTrace.samples[1].bodies[0].endpoint, { x: 32 - radius, y: 0, z: 0 }, q([0, 1, 0], Math.PI / 4));
  exact.bodies[0].from = clone(exact.nativeTrace.samples[0].bodies[0].endpoint);
  exact.bodies[0].to = clone(exact.nativeTrace.samples[1].bodies[0].endpoint);
  allEndpoints(exact, endpoint => {
    endpoint.comVelocityWorldMps = { x: 128, y: 0, z: 0 };
    endpoint.angularVelocityWorldRadps = { x: 128, y: 0, z: 0 };
  });
  const ref = { worldEpoch: 'epoch-1', bodyId: 'arm', colliderId: 'blade' };
  assert.ok(Math.abs(api.createContactMotion(exact).sample(ref, dt).originVelocityWorldMps.x - 128) < 1e-10);
  rejects(value => {
    allEndpoints(value, endpoint => { endpoint.comVelocityWorldMps = { x: 128 + 1e-9, y: 0, z: 0 }; });
  }, /speed|128|velocity/i);
  rejects(value => {
    allEndpoints(value, endpoint => { endpoint.angularVelocityWorldRadps = { x: 128 + 1e-9, y: 0, z: 0 }; });
  }, /omega|angular|128/i);
  rejects(value => {
    const endpoint = value.nativeTrace.samples[1].bodies[0].endpoint;
    setOrigin(endpoint, { x: 128 * (dt / 2) + 1e-9, y: 1, z: 0 }, endpoint.bodyOriginWorld.rotation);
  }, /origin|speed|128/i);
  rejects(value => {
    const endpoint = value.nativeTrace.samples[1].bodies[0].endpoint;
    setOrigin(endpoint, endpoint.bodyOriginWorld.position, q([0, 0, 1], Math.PI / 4 + .01));
  }, /angle|span/i);
  rejects(x => { allEndpoints(x, e => { e.bodyOriginWorld.position.x = 32; e.comWorld.x = 32; }); }, /extent|32|domain/i);
});

test('rejects unsafe geometry, native values, fixed teleports, and tiny-span derivative overflow', () => {
  rejects(x => { allEndpoints(x, e => { e.colliders[0].shape = { kind: 'capsule', halfHeight: .1, radius: .1 }; }); }, /unsupported|blocker/i);
  rejects(x => { allEndpoints(x, e => { e.colliders[0].shape.size[0] = .00099; }); }, /0.001|minimum|dimension/i);
  const nav = interval();
  allEndpoints(nav, e => { e.colliders[1].shape.halfHeight = 0; });
  assert.doesNotThrow(() => api.createContactMotion(nav));
  rejects(x => { allEndpoints(x, e => { e.comWorld.x = Number.MAX_VALUE; }); }, /float32|representable/i);
  rejects(x => { allEndpoints(x, e => { e.bodyOriginWorld.rotation = clone({ x: 0, y: 0, z: 0, w: 0 }); }); }, /quaternion/i);
  rejects(x => { allEndpoints(x, e => { e.bodyOriginWorld.scale = { x: 1, y: 2, z: 1 }; }); }, /scale|rigid/i);
  rejects(x => { allEndpoints(x, e => { e.authority = 'fixed'; }); }, /fixed|move/i);
  const tiny = interval([0, 1e-310, dt]);
  setOrigin(tiny.nativeTrace.samples[1].bodies[0].endpoint, { x: 1, y: 1, z: 0 }, identity);
  tiny.bodies[0].from = clone(tiny.nativeTrace.samples[0].bodies[0].endpoint);
  tiny.bodies[0].to = clone(tiny.nativeTrace.samples[2].bodies[0].endpoint);
  assert.throws(() => api.createContactMotion(tiny), /finite|overflow|representable|derived/i);
});

test('rejects invalid sample domains and supports deeply frozen input', () => {
  const motion = api.createContactMotion(deepFreeze(interval()));
  const ref = motion.colliders()[0].ref;
  assert.throws(() => motion.sample({ ...ref, worldEpoch: 'stale' }, 0), /stale/i);
  assert.throws(() => motion.sample({ ...ref, bodyId: 'missing' }, 0), /body/i);
  assert.throws(() => motion.sample({ ...ref, colliderId: 'missing' }, 0), /collider/i);
  for (const offset of [NaN, Infinity, -Number.EPSILON, dt + Number.EPSILON]) {
    assert.throws(() => motion.sample(ref, offset), /finite|within|offset|range/i);
  }
});

test('preserves exact nonrotation scale semantics and reports malformed references descriptively', () => {
  rejects(x => { x.bodies[0].from.bodyOriginWorld.scale = { x: 1, y: 1, z: 1 }; }, /boundary|match|scale/i);
  rejects(x => { x.nativeTrace.samples[1].bodies[0].endpoint.colliders[0].role = 'invalid'; }, /role/i);
  rejects(x => { x.nativeTrace.samples[1].bodies[0].endpoint.authority = 'invalid'; }, /authority/i);
  rejects(x => { x.nativeTrace.samples[1].bodies[0].endpoint.colliders[1].shape = { kind: 'pyramid', height: 1 }; }, /geometry|tag|unsupported/i);
  const motion = api.createContactMotion(interval());
  assert.throws(() => motion.sample(null, 0), /invalid.*reference/i);
  assert.throws(() => motion.sample({}, 0), /invalid.*reference/i);
});

test('keeps finite zero and proportionally tiny angular derivatives across a tiny span', () => {
  const still = interval([0, 1e-310, dt]);
  const first = still.nativeTrace.samples[0].bodies[0].endpoint;
  setOrigin(still.nativeTrace.samples[1].bodies[0].endpoint, first.bodyOriginWorld.position, first.bodyOriginWorld.rotation);
  still.bodies[0].from = clone(first);
  still.bodies[0].to = clone(still.nativeTrace.samples[2].bodies[0].endpoint);
  assert.doesNotThrow(() => api.createContactMotion(still));

  const rotating = interval([0, 1e-310, dt]);
  setOrigin(rotating.nativeTrace.samples[1].bodies[0].endpoint, { x: 0, y: 1, z: 0 }, q([1, 0, 0], 2e-310));
  rotating.bodies[0].from = clone(rotating.nativeTrace.samples[0].bodies[0].endpoint);
  rotating.bodies[0].to = clone(rotating.nativeTrace.samples[2].bodies[0].endpoint);
  const frame = api.createContactMotion(rotating).sample({
    worldEpoch: 'epoch-1',
    bodyId: 'arm',
    colliderId: 'blade',
  }, 0);
  assert.ok(Math.abs(frame.angularVelocityWorldRadps.x - 2) < 1e-12);
});

const renameEndpointBody = (value, bodyId) => value.colliders.forEach(collider => {
  collider.ref.bodyId = bodyId;
});
const withBodies = (count) => {
  const value = interval();
  const bodyTemplate = value.bodies[0];
  const sampleTemplates = value.nativeTrace.samples.map(sample => sample.bodies[0]);
  value.bodies = Array.from({ length: count }, (_, index) => {
    const body = clone(bodyTemplate);
    body.ref.bodyId = `body-${index}`;
    renameEndpointBody(body.from, body.ref.bodyId);
    renameEndpointBody(body.to, body.ref.bodyId);
    return body;
  });
  value.nativeTrace.samples.forEach((sample, sampleIndex) => {
    sample.bodies = Array.from({ length: count }, (_, index) => {
      const body = clone(sampleTemplates[sampleIndex]);
      body.ref.bodyId = `body-${index}`;
      renameEndpointBody(body.endpoint, body.ref.bodyId);
      return body;
    });
  });
  return value;
};

test('accepts exact body, collider, sample, and minimum-shape limits and rejects the next value', () => {
  assert.equal(api.createContactMotion(withBodies(64)).colliders().length, 64);
  assert.throws(() => api.createContactMotion(withBodies(65)), /body.*limit/i);
  const tooMany = withBodies(64);
  allEndpoints(tooMany, endpoint => {
    const extra = clone(endpoint.colliders[1]);
    extra.ref.colliderId = 'extra-navigation';
    endpoint.colliders.push(extra);
  });
  assert.throws(() => api.createContactMotion(tooMany), /collider.*limit/i);
  const offsets = Array.from({ length: 17 }, (_, index) => index === 16 ? dt : index * dt / 16);
  assert.doesNotThrow(() => api.createContactMotion(interval(offsets)));
  assert.throws(
    () => api.createContactMotion(interval(Array.from(
      { length: 18 },
      (_, index) => index === 17 ? dt : index * dt / 17,
    ))),
    /17|sample/i,
  );
  const ball = interval();
  allEndpoints(ball, endpoint => { endpoint.colliders[0].shape = { kind: 'ball', radius: .0005 }; });
  assert.equal(api.createContactMotion(ball).colliders()[0].shape.kind, 'ball');
  rejects(x => {
    allEndpoints(x, endpoint => { endpoint.colliders[0].shape = { kind: 'ball', radius: .000499 }; });
  }, /0.001|diameter|minimum/i);
  const cylinder = interval();
  allEndpoints(cylinder, endpoint => {
    endpoint.colliders[1].shape = { kind: 'cylinder', radius: .1, height: .2 };
  });
  assert.doesNotThrow(() => api.createContactMotion(cylinder));
});

const permutedIdentityInterval = (reverseBodies, reverseSampleZeroColliders) => {
  const value = withBodies(2);
  const bodyIds = ['z-body', 'A-body'];
  value.bodies.forEach((body, index) => {
    body.ref.bodyId = bodyIds[index];
    for (const endpoint of [body.from, body.to]) {
      renameEndpointBody(endpoint, body.ref.bodyId);
      endpoint.colliders[0].ref.colliderId = 'z';
      endpoint.colliders[1].ref.colliderId = 'A';
      endpoint.colliders[1].role = 'blocker';
      endpoint.colliders[1].shape = { kind: 'box', size: [.1, .1, .1] };
    }
  });
  value.nativeTrace.samples.forEach((sample, sampleIndex) => {
    sample.bodies.forEach((body, index) => {
      body.ref.bodyId = bodyIds[index];
      renameEndpointBody(body.endpoint, body.ref.bodyId);
      body.endpoint.colliders[0].ref.colliderId = 'z';
      body.endpoint.colliders[1].ref.colliderId = 'A';
      body.endpoint.colliders[1].role = 'blocker';
      body.endpoint.colliders[1].shape = { kind: 'box', size: [.1, .1, .1] };
      if (sampleIndex === 0 && reverseSampleZeroColliders) body.endpoint.colliders.reverse();
    });
    if (sampleIndex % 2 === 1) sample.bodies.reverse();
  });
  if (reverseBodies) value.bodies.reverse();
  return value;
};

test('returns blocker colliders in deterministic code-unit body and collider identity order', () => {
  const expected = [['A-body', 'A'], ['A-body', 'z'], ['z-body', 'A'], ['z-body', 'z']];
  for (const reverseBodies of [false, true]) {
    for (const reverseSampleZeroColliders of [false, true]) {
      const actual = api.createContactMotion(permutedIdentityInterval(reverseBodies, reverseSampleZeroColliders))
        .colliders().map(collider => [collider.ref.bodyId, collider.ref.colliderId]);
      assert.deepEqual(actual, expected);
    }
  }
});

test('rejects positive navigation dimensions that underflow to zero in float32', () => {
  const dimensions = [
    { kind: 'box', size: [1e-50, .1, .1] },
    { kind: 'ball', radius: 1e-50 },
    { kind: 'capsule', halfHeight: 0, radius: 1e-50 },
    { kind: 'capsule', halfHeight: 1e-50, radius: .1 },
    { kind: 'cylinder', height: .1, radius: 1e-50 },
    { kind: 'cylinder', height: 1e-50, radius: .1 },
  ];
  for (const shape of dimensions) {
    rejects(value => {
      allEndpoints(value, endpoint => { endpoint.colliders[1].shape = clone(shape); });
    }, /float32|representable|underflow|zero/i);
  }
});

test('densely validates every navigation box dimension, including sparse holes', () => {
  const sparseSizes = [new Array(3)];
  for (let missingIndex = 0; missingIndex < 3; missingIndex += 1) {
    const size = [.1, .1, .1];
    delete size[missingIndex];
    sparseSizes.push(size);
  }

  for (const size of sparseSizes) {
    const value = interval();
    allEndpoints(value, endpoint => {
      endpoint.colliders[1].shape = { kind: 'box', size: clone(size) };
    });
    assert.throws(
      () => api.createContactMotion(value),
      /box|dimension|size|geometry|finite/i,
    );
  }
});

test('compiles a detached physical interval after owner destruction and matches every measured collider knot', async () => {
  const arm = await createArmFixture();
  let detachedInterval;
  try {
    arm.setActive(true);
    assert.equal(arm.step(), true);
    const animation = arm.snapshot();
    assert.equal(arm.queueHandoff({
      worldEpoch: animation.worldEpoch,
      atTick: animation.tick,
      impulse: null,
    }), true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    detachedInterval = arm.snapshot().interval;
  } finally {
    arm.destroy();
  }

  const motion = api.createContactMotion(detachedInterval);
  assert.equal(motion.colliders().length, 4);
  assert.equal(detachedInterval.nativeTrace.samples.length, 9);
  for (const colliderRecord of motion.colliders()) {
    for (const [sampleIndex, sample] of detachedInterval.nativeTrace.samples.entries()) {
      const body = sample.bodies.find(entry => entry.ref.bodyId === colliderRecord.ref.bodyId);
      const collider = body.endpoint.colliders.find(entry => entry.ref.colliderId === colliderRecord.ref.colliderId);
      const originQ = new Quaternion(
        body.endpoint.bodyOriginWorld.rotation.x,
        body.endpoint.bodyOriginWorld.rotation.y,
        body.endpoint.bodyOriginWorld.rotation.z,
        body.endpoint.bodyOriginWorld.rotation.w,
      ).normalize();
      const localQ = new Quaternion(
        collider.localPose.rotation.x,
        collider.localPose.rotation.y,
        collider.localPose.rotation.z,
        collider.localPose.rotation.w,
      ).normalize();
      const offset = new Vector3(
        collider.localPose.position.x,
        collider.localPose.position.y,
        collider.localPose.position.z,
      ).applyQuaternion(originQ);
      const expectedColliderQ = originQ.clone().multiply(localQ).normalize();
      const frame = motion.sample(colliderRecord.ref, sample.offsetS);
      assert.equal(frame.spanIndex, Math.min(sampleIndex, 7));
      poseNear(frame.bodyOriginWorld, body.endpoint.bodyOriginWorld, 1e-12, 1e-12);
      poseNear(frame.colliderWorld, {
        position: {
          x: body.endpoint.bodyOriginWorld.position.x + offset.x,
          y: body.endpoint.bodyOriginWorld.position.y + offset.y,
          z: body.endpoint.bodyOriginWorld.position.z + offset.z,
        },
        rotation: {
          x: expectedColliderQ.x,
          y: expectedColliderQ.y,
          z: expectedColliderQ.z,
          w: expectedColliderQ.w,
        },
      }, 1e-12, 1e-12);
    }
  }
});

test('rejects pure-angular derivative overflow across a tiny span', () => {
  const value = interval([0, 1e-310, dt]);
  const first = value.nativeTrace.samples[0].bodies[0].endpoint;
  setOrigin(
    value.nativeTrace.samples[1].bodies[0].endpoint,
    first.bodyOriginWorld.position,
    q([1, 0, 0], 1e-10),
  );
  value.bodies[0].from = clone(first);
  value.bodies[0].to = clone(value.nativeTrace.samples[2].bodies[0].endpoint);
  assert.throws(() => api.createContactMotion(value), /omega|angular|finite|representable/i);
});

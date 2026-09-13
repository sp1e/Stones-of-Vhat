import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import RAPIER from '@dimforge/rapier3d-compat';
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import {
  axisAngle,
  castFixture,
  dt,
  identity,
  intervalFixture,
  motionFixture,
  obbSeparation,
  pose,
  targetRef,
  transformPointLocal,
  vec,
} from './contactPairFixtures.mjs';

const queryUrl = new URL('../src/physics/contactPairQuery.ts', import.meta.url);
const api = existsSync(queryUrl) ? await import(queryUrl.href) : {};

test('provides a bounded world-free contact pair query', async () => {
  assert.equal(typeof api.createContactPairQuery, 'function');
  assert.equal(typeof await api.createContactPairQuery(), 'function');
});

test('does not initialize Rapier until the factory is called and shares one concurrent initialization', () => {
  const script = String.raw`
    const originalInstantiate = WebAssembly.instantiate;
    let calls = 0;
    WebAssembly.instantiate = async (...args) => {
      calls += 1;
      return originalInstantiate(...args);
    };
    try {
      const api = await import('./src/physics/contactPairQuery.ts?lazy-init-success');
      await new Promise(resolve => setTimeout(resolve, 20));
      if (calls !== 0) throw new Error('Rapier initialized during import');
      const factories = await Promise.all([
        api.createContactPairQuery(),
        api.createContactPairQuery(),
        api.createContactPairQuery(),
      ]);
      if (calls !== 1 || factories.some(value => typeof value !== 'function')) {
        throw new Error('Rapier initialization was not shared once');
      }
    } finally {
      WebAssembly.instantiate = originalInstantiate;
    }
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: new URL('..', import.meta.url),
    stdio: 'pipe',
  }));
});

test('propagates sync and async native initialization failures without an unhandled rejection', () => {
  for (const mode of ['sync', 'async']) {
    const script = String.raw`
      const mode = ${JSON.stringify(mode)};
      const originalInstantiate = WebAssembly.instantiate;
      const unhandled = [];
      process.on('unhandledRejection', reason => unhandled.push(reason));
      WebAssembly.instantiate = (...args) => {
        if (mode === 'sync') throw new Error('deliberate-wasm-init-probe');
        return Promise.reject(new Error('deliberate-wasm-init-probe'));
      };
      try {
        const api = await import('./src/physics/contactPairQuery.ts?lazy-init-failure-' + mode);
        await new Promise(resolve => setTimeout(resolve, 20));
        if (unhandled.length !== 0) throw new Error('import caused an unhandled rejection');
        let failure;
        try { await api.createContactPairQuery(); } catch (error) { failure = error; }
        await new Promise(resolve => setTimeout(resolve, 20));
        if (!failure || !String(failure).includes('deliberate-wasm-init-probe')) {
          throw new Error('factory did not propagate initialization failure');
        }
        if (unhandled.length !== 0) throw new Error('factory failure became unhandled');
      } finally {
        WebAssembly.instantiate = originalInstantiate;
      }
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${mode} init child failed:\n${result.stderr}`);
    assert.equal(result.stderr, '');
  }
});

test('exports the reviewed immutable limits and evidence tag', () => {
  assert.deepEqual(api.CONTACT_QUERY_LIMITS, {
    guardM: .00005,
    maxBracketM: .001,
    maxNativeCalls: 128,
    predictionM: 256,
  });
  assert.ok(Object.isFrozen(api.CONTACT_QUERY_LIMITS));
  assert.equal(api.CONTACT_QUERY_EVIDENCE, 'declared-motion-model-empirical-native-guard');
});

test('brackets the analytical crossing of two balls and returns detached world/local geometry', async () => {
  const query = await api.createContactPairQuery();
  const motion = motionFixture({ points: [vec(0, 0, -1), vec(0, 0, 1)] });
  const cast = castFixture();
  const result = query(motion, cast, targetRef(motion));
  const analyticalTOI = (1 - .2 / Math.SQRT2) / 120;
  assert.equal(result.kind, 'hit');
  assert.ok(result.lowerS <= analyticalTOI && analyticalTOI <= result.upperS);
  assert.equal(result.upperS, result.timeOfImpactS);
  assert.equal(result.intervalFraction, result.upperS / dt);
  assert.ok(result.uncertaintyBoundM <= .001);
  assert.equal(result.uncertaintyBoundM, result.bracketTravelM + .0001);
  assert.equal(result.identity.target.colliderId, 'target');
  assert.equal(result.evidence, api.CONTACT_QUERY_EVIDENCE);
  assert.deepEqual(
    result.geometry.projectileWitnessLocal,
    transformPointLocal(result.geometry.projectileWorld, result.geometry.projectileWitnessWorld),
  );
  assert.deepEqual(
    result.geometry.targetWitnessBodyLocal,
    transformPointLocal(result.geometry.targetBodyOriginWorld, result.geometry.targetWitnessWorld),
  );
  assert.deepEqual(
    result.geometry.targetWitnessColliderLocal,
    transformPointLocal(result.geometry.targetColliderWorld, result.geometry.targetWitnessWorld),
  );
  assert.ok(Math.abs(Math.hypot(...Object.values(result.geometry.projectileNormalWorld)) - 1) <= 1e-12);
  assert.ok(Math.hypot(
    result.geometry.projectileNormalWorld.x + result.geometry.targetNormalWorld.x,
    result.geometry.projectileNormalWorld.y + result.geometry.targetNormalWorld.y,
    result.geometry.projectileNormalWorld.z + result.geometry.targetNormalWorld.z,
  ) <= 1e-6);
  const retained = structuredClone(result);
  result.identity.target.colliderId = 'changed';
  result.geometry.projectileWitnessWorld.x = 999;
  cast.startPose.position.x = 999;
  assert.deepEqual(query(motion, castFixture(), targetRef(motion)), retained);
});

test('keeps all three analytical ball noncrossings as misses', async () => {
  const query = await api.createContactPairQuery();
  for (const points of [
    [vec(0, 0, -1), vec(0, 0, -1)],
    [vec(0, 0, 1), vec(0, 0, 1)],
    [vec(0, .201, -1), vec(0, .201, 1)],
  ]) {
    const motion = motionFixture({ points });
    const result = query(motion, castFixture(), targetRef(motion));
    assert.equal(result.kind, 'miss');
    assert.ok(!('geometry' in result));
  }
});

test('reports initial overlap or guard contact without cut geometry', async () => {
  const query = await api.createContactPairQuery();
  for (const x of [0, .20005]) {
    const motion = motionFixture({ points: [vec(x), vec(x)] });
    const result = query(motion, castFixture({ start: vec(), end: vec() }), targetRef(motion));
    assert.equal(result.kind, 'initial-blocked');
    assert.equal(result.earliestPossibleS, 0);
    assert.equal(result.reason, 'overlap-or-within-guard');
    assert.ok(!('geometry' in result));
  }
});

test('rejects malformed identity, shape, coordinates, extent, and speed before native queries', async () => {
  const query = await api.createContactPairQuery();
  const motion = motionFixture({ points: [vec(0, 0, -1), vec(0, 0, 1)] });
  const ref = targetRef(motion);
  const cases = [
    cast => { cast.worldEpoch = 'stale'; },
    cast => { cast.fromTick += 1; cast.toTick += 1; },
    cast => { cast.castId = ''; },
    cast => { cast.projectileId = ''; },
    cast => { cast.shape = { kind: 'capsule', radius: .1, halfHeight: .1 }; },
    cast => { cast.shape = { kind: 'ball', radius: .00049 }; },
    cast => { cast.shape = { kind: 'ball', radius: 1e-50 }; },
    cast => { cast.shape = { kind: 'box', size: [.1, .1] }; },
    cast => { const size = [.1, .1, .1]; delete size[1]; cast.shape = { kind: 'box', size }; },
    cast => { cast.shape = { kind: 'box', size: [.1, .1, .00099] }; },
    cast => { cast.endPosition.x = NaN; },
    cast => { cast.startPose.rotation.w = 0; },
    cast => { cast.startPose.scale = { x: 2, y: 1, z: 1 }; },
    cast => { cast.endPosition.x = cast.startPose.position.x + 128 * dt + 1e-8; },
    cast => { cast.startPose.position.x = 31.95; cast.endPosition.x = 31.95; cast.shape = { kind: 'ball', radius: .1 }; },
  ];
  for (const mutate of cases) {
    const cast = castFixture({ start: vec(), end: vec() });
    mutate(cast);
    assert.throws(() => query(motion, cast, ref), /identity|epoch|tick|nonempty|shape|geometry|dimension|diameter|float32|finite|quaternion|scale|speed|128|extent|32/i);
  }
  assert.throws(() => query(motion, castFixture(), { ...ref, colliderId: 'unknown' }), /collider|target|registered|unknown/i);
  assert.throws(() => query(motion, castFixture(), { ...ref, bodyId: '' }), /body|nonempty|target/i);
  assert.throws(() => query({ ...motion, dtS: dt / 2 }, castFixture(), ref), /fixed|interval|tick/i);
});

test('retains analytical large wall, floor, and 10mm wall controls within the bounded domain', async () => {
  const query = await api.createContactPairQuery();
  const controls = [
    {
      name: 'wall',
      target: vec(.65, 5, 0),
      targetShape: { kind: 'box', size: [.2, 20, 10] },
      start: vec(0, 1, 0), end: vec(40 * dt, 1, 0),
      projectileShape: { kind: 'box', size: [.12, .01, .12] },
      analytical: .01225,
      missStart: vec(0, 1, 5.0602), missEnd: vec(40 * dt, 1, 5.0602),
    },
    {
      name: 'floor',
      target: vec(0, -.1, 0),
      targetShape: { kind: 'box', size: [10, .2, 10] },
      start: vec(0, .5, 0), end: vec(0, .5 - 40 * dt, 0),
      projectileShape: { kind: 'box', size: [.12, .01, .12] },
      analytical: .012375,
      missStart: vec(5.0602, .5, 0), missEnd: vec(5.0602, .5 - 40 * dt, 0),
    },
    {
      name: '10mm wall',
      target: vec(.5, 0, 0),
      targetShape: { kind: 'box', size: [.01, 2, 2] },
      start: vec(), end: vec(40 * dt),
      projectileShape: { kind: 'box', size: [.12, .01, .12] },
      analytical: .010875,
      missStart: vec(0, 0, 1.0602), missEnd: vec(40 * dt, 0, 1.0602),
    },
  ];
  for (const control of controls) {
    for (const shift of control.name === '10mm wall' ? [0, 15, -15] : [0, 15, -15]) {
      const translated = value => vec(value.x + shift, value.y + shift, value.z + shift);
      const motion = motionFixture({
        points: [translated(control.target), translated(control.target)],
        shape: control.targetShape,
      });
      const cast = castFixture({
        start: translated(control.start),
        end: translated(control.end),
        shape: control.projectileShape,
      });
      const result = query(motion, cast, targetRef(motion));
      assert.equal(result.kind, 'hit', `${control.name} at shift ${shift}`);
      assert.ok(result.lowerS <= control.analytical && control.analytical <= result.upperS);
      assert.ok(40 * Math.abs(result.upperS - control.analytical) <= .00015);
      assert.ok(result.nativeCalls <= 7);
    }
    const missMotion = motionFixture({
      points: [control.target, control.target],
      shape: control.targetShape,
    });
    assert.equal(query(missMotion, castFixture({
      start: control.missStart,
      end: control.missEnd,
      shape: control.projectileShape,
    }), targetRef(missMotion)).kind, 'miss', `${control.name} matched close miss`);
  }

  assert.throws(() => motionFixture({
    points: [vec(31.65, 36, 31), vec(31.65, 36, 31)],
    shape: { kind: 'box', size: [.2, 20, 10] },
  }), /extent|32/i);
  const missMotion = motionFixture({
    points: [vec(.5, 0, .0611), vec(.5, 0, .0611)],
    shape: { kind: 'box', size: [.01, .01, .001] },
  });
  assert.equal(query(missMotion, castFixture({
    start: vec(), end: vec(40 * dt), shape: { kind: 'box', size: [.12, .01, .12] },
  }), targetRef(missMotion)).kind, 'miss');
  const wall = motionFixture({
    points: [vec(.65, 5, 0), vec(.65, 5, 0)],
    shape: { kind: 'box', size: [.2, 20, 10] },
  });
  const nextToWall = query(wall, castFixture({
    start: vec(.48998, 1, 0), end: vec(.48998, 1, 0),
    shape: { kind: 'box', size: [.12, .01, .12] },
  }), targetRef(wall));
  assert.equal(nextToWall.kind, 'initial-blocked');
  assert.ok(!('geometry' in nextToWall));
});

const adversarialMotion = (radius, halfTravel, clearance) => motionFixture({
  points: [vec(-halfTravel, 2 * radius + clearance), vec(halfTravel, 2 * radius + clearance), vec()],
  offsets: [0, dt / 2, dt],
  shape: { kind: 'ball', radius },
});

test('keeps the first uncertainty and cumulative travel through all two-span adversaries', async () => {
  const query = await api.createContactPairQuery();
  for (const clearance of [-.00002, 0, .00002]) {
    const motion = adversarialMotion(.01, .005, clearance);
    const result = query(motion, castFixture({
      start: vec(), end: vec(), shape: { kind: 'ball', radius: .01 },
    }), targetRef(motion));
    assert.equal(result.kind, 'inconclusive');
    assert.equal(result.reason, 'width');
    assert.ok(result.earliestPossibleS < dt / 2);
    assert.ok(result.checkedThroughS > dt / 2);
  }
  for (const clearance of [-.00002, 0, .00002]) {
    const motion = adversarialMotion(.1, .01, clearance);
    const sampledTimes = [];
    const observedMotion = {
      ...motion,
      sample(ref, time) {
        sampledTimes.push(time);
        return motion.sample(ref, time);
      },
    };
    const result = query(observedMotion, castFixture({
      start: vec(), end: vec(), shape: { kind: 'ball', radius: .1 },
    }), targetRef(motion));
    assert.equal(result.kind, 'inconclusive');
    assert.equal(result.reason, 'budget');
    assert.equal(result.nativeCalls, 128);
    assert.ok(result.earliestPossibleS < dt / 2);
    assert.equal(result.checkedThroughS, sampledTimes.at(-1), 'checkedThroughS is the last evaluated sample');
  }
});

test('does not erase uncertainty at knots, stationary spans, reversals, or a guarded prune equality', async () => {
  const query = await api.createContactPairQuery();
  const cases = [
    motionFixture({ points: [vec(.4), vec(.2), vec(.4)], offsets: [0, dt / 2, dt] }),
    motionFixture({ points: [vec(.20008), vec(.20008)] }),
    motionFixture({ points: [vec(.20008), vec(.20008), vec(.4)], offsets: [0, dt / 2, dt] }),
  ];
  for (const motion of cases) {
    const result = query(motion, castFixture({ start: vec(), end: vec() }), targetRef(motion));
    assert.equal(result.kind, 'inconclusive');
    assert.equal(result.reason, 'graze');
    assert.ok(result.earliestPossibleS <= dt / 2);
  }
  const nativeBall = new RAPIER.Ball(.1);
  const nativeDistance = nativeBall.contactShape(vec(), identity, nativeBall, vec(.3), identity, 256).distance;
  const equalityMotion = motionFixture({ points: [vec(.3), vec(.3)] });
  const equality = query(equalityMotion, castFixture({
    start: vec(), end: vec(nativeDistance - api.CONTACT_QUERY_LIMITS.guardM),
  }), targetRef(equalityMotion));
  assert.equal(equality.kind, 'inconclusive');
  assert.equal(equality.reason, 'graze');
  assert.ok(equality.nativeCalls > 2, 'strict equality must not use a guarded prune');
});

test('orders terminal handling before creating a new uncertainty latch', async () => {
  const query = await api.createContactPairQuery();
  const clearTerminalMotion = motionFixture({ points: [vec(.3), vec(.3)] });
  const clearTerminal = query(clearTerminalMotion, castFixture({
    start: vec(), end: vec(.099925),
  }), targetRef(clearTerminalMotion));
  assert.equal(clearTerminal.kind, 'miss', 'terminal distance in (guard, 2guard] is clear without prior uncertainty');
  assert.equal(clearTerminal.nativeCalls, 2);

  const guardTerminalMotion = motionFixture({ points: [vec(.3), vec(.3)] });
  const guardTerminal = query(guardTerminalMotion, castFixture({
    start: vec(), end: vec(.099951),
  }), targetRef(guardTerminalMotion));
  assert.equal(guardTerminal.kind, 'inconclusive');
  assert.equal(guardTerminal.reason, 'graze');
  assert.ok(guardTerminal.earliestPossibleS <= dt);

  const priorMotion = motionFixture({
    points: [vec(.20008), vec(.20008), vec(.3)],
    offsets: [0, dt / 2, dt],
  });
  const prior = query(priorMotion, castFixture({ start: vec(), end: vec() }), targetRef(priorMotion));
  assert.equal(prior.kind, 'inconclusive');
  assert.equal(prior.reason, 'graze');
  assert.ok(prior.earliestPossibleS < dt);
});

test('turns native failures and malformed native output into conservative inconclusive results',
  { concurrency: false }, async () => {
  const query = await api.createContactPairQuery();
  const motion = motionFixture({ points: [vec(0, 0, -1), vec(0, 0, 1)] });
  const ref = targetRef(motion), cast = castFixture();
  const original = RAPIER.Shape.prototype.contactShape;
  try {
    RAPIER.Shape.prototype.contactShape = function injectedFirstFailure() {
      throw new Error('injected native failure');
    };
    const first = query(motion, cast, ref);
    assert.deepEqual({ kind: first.kind, reason: first.reason, earliest: first.earliestPossibleS, calls: first.nativeCalls },
      { kind: 'inconclusive', reason: 'native-geometry', earliest: 0, calls: 1 });

    let sawUncertainty = false;
    RAPIER.Shape.prototype.contactShape = function injectedAfterUncertainty(...args) {
      if (sawUncertainty) throw new Error('injected after uncertainty');
      const value = original.apply(this, args);
      if (value?.distance <= 2 * api.CONTACT_QUERY_LIMITS.guardM) sawUncertainty = true;
      return value;
    };
    const later = query(motion, cast, ref);
    assert.equal(later.kind, 'inconclusive');
    assert.equal(later.reason, 'native-geometry');
    assert.ok(later.earliestPossibleS < later.checkedThroughS);

    RAPIER.Shape.prototype.contactShape = () => null;
    assert.equal(query(motion, cast, ref).kind, 'inconclusive');
    RAPIER.Shape.prototype.contactShape = () => ({ distance: NaN });
    assert.equal(query(motion, cast, ref).kind, 'inconclusive');
    RAPIER.Shape.prototype.contactShape = () => ({
      distance: .1,
      point1: vec(NaN), point2: vec(), normal1: vec(1), normal2: vec(-1),
    });
    const malformed = query(motion, cast, ref);
    assert.equal(malformed.kind, 'inconclusive');
    assert.equal(malformed.reason, 'native-geometry');
    for (const invalid of [
      { distance: .1, point1: vec(), point2: vec(.1), normal1: vec(2), normal2: vec(-2) },
      { distance: .1, point1: vec(), point2: vec(.1), normal1: vec(1), normal2: vec(1) },
      { distance: .1, point1: vec(), point2: vec(.2), normal1: vec(1), normal2: vec(-1) },
    ]) {
      RAPIER.Shape.prototype.contactShape = () => invalid;
      const result = query(motion, cast, ref);
      assert.equal(result.kind, 'inconclusive');
      assert.equal(result.reason, 'native-geometry');
      assert.ok(!('geometry' in result));
    }
    let contactCalls = 0;
    RAPIER.Shape.prototype.contactShape = () => {
      contactCalls += 1;
      return contactCalls === 1
        ? { distance: .1, point1: vec(), point2: vec(.1), normal1: vec(1), normal2: vec(-1) }
        : { distance: -.1, point1: vec(), point2: vec(-.1), normal1: vec(1), normal2: vec(-1) };
    };
    const unbracketed = query(motion, cast, ref);
    assert.equal(unbracketed.kind, 'inconclusive');
    assert.equal(unbracketed.reason, 'unbracketed');
    RAPIER.Shape.prototype.contactShape = () => ({
      distance: 0,
      point1: vec(NaN), point2: vec(NaN), normal1: vec(NaN), normal2: vec(NaN),
    });
    assert.equal(query(motionFixture({ points: [vec(), vec()] }), castFixture({ start: vec(), end: vec() }),
      targetRef(motionFixture({ points: [vec(), vec()] }))).kind, 'initial-blocked');
  } finally {
    RAPIER.Shape.prototype.contactShape = original;
  }
  assert.equal(query(motion, cast, ref).kind, 'hit', 'native method restoration must be proven');
});

test('reports a nonincreasing declared span as an explicit stall', async () => {
  const query = await api.createContactPairQuery();
  const motion = motionFixture({ points: [vec(.4), vec(.4)] });
  const malformedFrameMotion = {
    ...motion,
    sample(ref, time) {
      return { ...motion.sample(ref, time), spanEndS: time };
    },
  };
  const result = query(malformedFrameMotion, castFixture({ start: vec(), end: vec() }), targetRef(motion));
  assert.equal(result.kind, 'inconclusive');
  assert.equal(result.reason, 'stall');
  assert.equal(result.checkedThroughS, 0);
});

const quaternion = value => new Quaternion(value.x, value.y, value.z, value.w).normalize();
const plainQuaternion = value => ({ x: value.x, y: value.y, z: value.z, w: value.w });
const add = (a, b) => vec(a.x + b.x, a.y + b.y, a.z + b.z);
const scaled = (value, amount) => vec(value.x * amount, value.y * amount, value.z * amount);
const composeFixturePose = (body, local) => {
  const bodyRotation = quaternion(body.rotation);
  const offset = new Vector3(local.position.x, local.position.y, local.position.z).applyQuaternion(bodyRotation);
  const rotation = bodyRotation.multiply(quaternion(local.rotation)).normalize();
  return pose(add(body.position, vec(offset.x, offset.y, offset.z)), plainQuaternion(rotation));
};
const movingPose = (record, time) => {
  const magnitude = Math.hypot(record.omega.x, record.omega.y, record.omega.z);
  const delta = magnitude === 0 ? quaternion(identity) : quaternion(axisAngle(record.omega, magnitude * time));
  const body = pose(
    add(record.start, scaled(record.velocity, time)),
    plainQuaternion(delta.multiply(quaternion(record.initial)).normalize()),
  );
  return composeFixturePose(body, record.local);
};
const obbReference = (projectile, target) => {
  const steps = 65536;
  const separation = time => obbSeparation(
    { ...movingPose(projectile, time), half: projectile.half },
    { ...movingPose(target, time), half: target.half },
  );
  if (separation(0) <= 0) return 0;
  for (let index = 1; index <= steps; index += 1) {
    if (separation(index * dt / steps) > 0) continue;
    let lower = (index - 1) * dt / steps, upper = index * dt / steps;
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const middle = (lower + upper) / 2;
      if (separation(middle) <= 0) upper = middle;
      else lower = middle;
    }
    return upper;
  }
  return null;
};
const nativeMotionForObb = (target, shift) => {
  const shifted = point => vec(point.x + shift, point.y + shift, point.z + shift);
  const bodyAt = time => ({
    position: shifted(add(target.start, scaled(target.velocity, time))),
    rotation: (() => {
      const magnitude = Math.hypot(target.omega.x, target.omega.y, target.omega.z);
      if (magnitude === 0) return target.initial;
      return plainQuaternion(quaternion(axisAngle(target.omega, magnitude * time)).multiply(quaternion(target.initial)).normalize());
    })(),
  });
  return motionFixture({
    points: [bodyAt(0).position, bodyAt(dt).position],
    rotations: [bodyAt(0).rotation, bodyAt(dt).rotation],
    shape: { kind: 'box', size: target.half.map(value => 2 * value) },
    localPose: target.local,
  });
};
const castForObb = (projectile, shift) => {
  const shifted = point => vec(point.x + shift, point.y + shift, point.z + shift);
  const start = movingPose(projectile, 0), end = movingPose(projectile, dt);
  return castFixture({
    start: shifted(start.position),
    end: shifted(end.position),
    rotation: start.rotation,
    shape: { kind: 'box', size: projectile.half.map(value => 2 * value) },
  });
};

test('retains the original Z-axis 36-case matrix at all required translations', async context => {
  const query = await api.createContactPairQuery();
  let hits = 0, misses = 0, maxCalls = 0, maxErrorM = 0, maxBracketM = 0;
  for (const vertical of [false, true]) for (const speed of [8, 16, 40])
    for (const targetSpeed of [-3, 3]) for (const degrees of [0, 180, 360]) {
      const projectile = {
        half: vertical ? [.005, .06, .06] : [.06, .005, .06],
        start: vec(-.24 - speed * dt / 2), velocity: vec(speed), initial: identity, omega: vec(),
        local: pose(),
      };
      const target = {
        half: [.2, .045, .045], start: vec(-.09, .02), velocity: vec(targetSpeed),
        initial: axisAngle(vec(0, 0, 1), .35), omega: vec(0, 0, degrees * Math.PI / 180),
        local: pose(vec(.09, -.02), axisAngle(vec(0, 0, 1), -.20)),
      };
      const reference = obbReference(projectile, target);
      for (const shift of [0, 31, -31]) {
        const motion = nativeMotionForObb(target, shift);
        const result = query(motion, castForObb(projectile, shift), targetRef(motion));
        maxCalls = Math.max(maxCalls, result.nativeCalls);
        if (reference === null) {
          misses += 1;
          assert.equal(result.kind, 'miss');
        } else {
          hits += 1;
          assert.equal(result.kind, 'hit');
          assert.ok(result.lowerS <= reference && reference <= result.upperS);
          maxErrorM = Math.max(maxErrorM, speed * Math.abs(result.upperS - reference));
          maxBracketM = Math.max(maxBracketM, result.bracketTravelM);
          assert.ok(speed * Math.abs(result.upperS - reference) <= .00015);
        }
      }
    }
  assert.deepEqual({ hits, misses }, { hits: 99, misses: 9 });
  assert.ok(maxCalls <= 22);
  assert.ok(maxBracketM <= .000400001);
  context.diagnostic(`Z36 translations: hits=${hits} misses=${misses} maxCalls=${maxCalls} maxErrorM=${maxErrorM} maxBracketM=${maxBracketM}`);
});

test('retains the cast-locked general-3D 36-case matrix and independent 15-axis OBB controls', async context => {
  const query = await api.createContactPairQuery();
  let hits = 0, misses = 0, maxCalls = 0, maxErrorM = 0, maxBracketM = 0;
  for (const vertical of [false, true]) for (const speed of [8, 16, 40])
    for (const targetSpeed of [-3, 3]) for (const targetOmega of [0, Math.PI, 2 * Math.PI]) {
      const projectile = {
        half: vertical ? [.005, .06, .06] : [.06, .005, .06],
        start: vec(-.25 - speed * dt / 2), velocity: vec(speed),
        initial: axisAngle(vec(2, 1, -1), .18), omega: vec(),
        local: pose(vec(.012, .008, -.01), axisAngle(vec(1, -3, 2), .27)),
      };
      const omegaAxis = new Vector3(2, -1, 1).normalize().multiplyScalar(targetOmega);
      const target = {
        half: [.2, .045, .045], start: vec(-.06, .015, .01), velocity: vec(targetSpeed),
        initial: axisAngle(vec(1, 2, 3), .6), omega: vec(omegaAxis.x, omegaAxis.y, omegaAxis.z),
        local: pose(vec(.09, -.02, .035), axisAngle(vec(-2, 1, 3), -.31)),
      };
      const reference = obbReference(projectile, target);
      for (const shift of [0, 31, -31]) {
        const motion = nativeMotionForObb(target, shift);
        const result = query(motion, castForObb(projectile, shift), targetRef(motion));
        maxCalls = Math.max(maxCalls, result.nativeCalls);
        if (reference === null) {
          misses += 1;
          assert.equal(result.kind, 'miss');
        } else {
          hits += 1;
          assert.equal(result.kind, 'hit');
          assert.ok(result.lowerS <= reference && reference <= result.upperS);
          maxErrorM = Math.max(maxErrorM, speed * Math.abs(result.upperS - reference));
          maxBracketM = Math.max(maxBracketM, result.bracketTravelM);
          assert.ok(speed * Math.abs(result.upperS - reference) <= .00015);
          assert.ok(result.uncertaintyBoundM <= .001);
        }
      }
    }
  assert.deepEqual({ hits, misses }, { hits: 99, misses: 9 });
  assert.ok(maxCalls <= 23);
  assert.ok(maxBracketM <= .000400001);
  context.diagnostic(`general3D36 translations: hits=${hits} misses=${misses} maxCalls=${maxCalls} maxErrorM=${maxErrorM} maxBracketM=${maxBracketM}`);
});

test('derives every exposed local contact frame from the nonidentity hit-time poses', async context => {
  const query = await api.createContactPairQuery();
  const omegaAxis = new Vector3(2, -1, 1).normalize().multiplyScalar(2 * Math.PI);
  const projectile = {
    half: [.06, .005, .06], start: vec(-.25 - 40 * dt / 2), velocity: vec(40),
    initial: axisAngle(vec(2, 1, -1), .18), omega: vec(),
    local: pose(vec(.012, .008, -.01), axisAngle(vec(1, -3, 2), .27)),
  };
  const target = {
    half: [.2, .045, .045], start: vec(-.06, .015, .01), velocity: vec(-3),
    initial: axisAngle(vec(1, 2, 3), .6), omega: vec(omegaAxis.x, omegaAxis.y, omegaAxis.z),
    local: pose(vec(.09, -.02, .035), axisAngle(vec(-2, 1, 3), -.31)),
  };
  const motion = nativeMotionForObb(target, 0), cast = castForObb(projectile, 0), ref = targetRef(motion);
  const result = query(motion, cast, ref);
  assert.equal(result.kind, 'hit');
  const frame = motion.sample(ref, result.upperS);
  assert.deepEqual(result.geometry.targetBodyOriginWorld, frame.bodyOriginWorld);
  assert.deepEqual(result.geometry.targetColliderWorld, frame.colliderWorld);
  assert.deepEqual(result.geometry.projectileWorld, {
    position: {
      x: cast.startPose.position.x + (cast.endPosition.x - cast.startPose.position.x) * result.intervalFraction,
      y: cast.startPose.position.y + (cast.endPosition.y - cast.startPose.position.y) * result.intervalFraction,
      z: cast.startPose.position.z + (cast.endPosition.z - cast.startPose.position.z) * result.intervalFraction,
    },
    rotation: cast.startPose.rotation,
  });
  const worldMatrix = worldPose => new Matrix4().compose(
    new Vector3(worldPose.position.x, worldPose.position.y, worldPose.position.z),
    quaternion(worldPose.rotation),
    new Vector3(1, 1, 1),
  );
  const pointWorld = (worldPose, localPoint) => {
    const value = new Vector3(localPoint.x, localPoint.y, localPoint.z).applyMatrix4(worldMatrix(worldPose));
    return vec(value.x, value.y, value.z);
  };
  const normalWorld = (worldPose, localNormal) => {
    const rotation = new Matrix3().setFromMatrix4(worldMatrix(worldPose));
    const value = new Vector3(localNormal.x, localNormal.y, localNormal.z).applyMatrix3(rotation);
    return vec(value.x, value.y, value.z);
  };
  const reconstructed = [
    [pointWorld(result.geometry.projectileWorld, result.geometry.projectileWitnessLocal),
      result.geometry.projectileWitnessWorld],
    [pointWorld(result.geometry.targetColliderWorld, result.geometry.targetWitnessColliderLocal),
      result.geometry.targetWitnessWorld],
    [pointWorld(result.geometry.targetBodyOriginWorld, result.geometry.targetWitnessBodyLocal),
      result.geometry.targetWitnessWorld],
    [normalWorld(result.geometry.targetColliderWorld, result.geometry.targetNormalColliderLocal),
      result.geometry.targetNormalWorld],
    [normalWorld(result.geometry.targetBodyOriginWorld, result.geometry.targetNormalBodyLocal),
      result.geometry.targetNormalWorld],
  ];
  let maximumError = 0;
  for (const [actual, reference] of reconstructed) {
    const error = Math.hypot(actual.x - reference.x, actual.y - reference.y, actual.z - reference.z);
    maximumError = Math.max(maximumError, error);
    assert.ok(error <= 1e-12);
  }
  for (const normal of [
    result.geometry.targetNormalWorld,
    result.geometry.targetNormalColliderLocal,
    result.geometry.targetNormalBodyLocal,
  ]) {
    assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) <= 1e-12);
  }
  context.diagnostic(`nonidentity local-frame maximum error=${maximumError}`);
});

test('queries the real eight-span arm tracks without changing the owner and survives owner destruction', async () => {
  const query = await api.createContactPairQuery();
  const arm = await createArmFixture();
  let motion, ref, casts, retained;
  try {
    arm.setActive(true);
    assert.equal(arm.step(), true);
    const animation = arm.snapshot();
    assert.equal(arm.queueHandoff({ worldEpoch: animation.worldEpoch, atTick: animation.tick, impulse: null }), true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    const snapshot = arm.snapshot(), before = structuredClone(snapshot), counts = arm.counts();
    motion = createContactMotion(snapshot.interval);
    assert.equal(snapshot.interval.nativeTrace.samples.length, 9);
    const target = motion.colliders().find(collider => collider.ref.bodyId === 'forearm');
    assert.ok(target);
    assert.ok(Math.hypot(target.localPose.position.x, target.localPose.position.y, target.localPose.position.z) > 0);
    ref = target.ref;
    const middle = motion.sample(ref, dt / 2).colliderWorld.position;
    casts = [
      { kind: 'box', size: [.12, .01, .12] },
      { kind: 'box', size: [.01, .12, .12] },
    ].map((shape, index) => castFixture({
      worldEpoch: motion.worldEpoch,
      fromTick: motion.fromTick,
      castId: `actual-arm-${index}`,
      projectileId: `actual-arm-projectile-${index}`,
      start: vec(middle.x - .5, middle.y, middle.z),
      end: vec(middle.x + .5, middle.y, middle.z),
      shape,
    }));
    retained = casts.map(cast => query(motion, cast, ref));
    assert.ok(retained.every(result => result.kind === 'hit'));
    assert.deepEqual(arm.snapshot(), before);
    assert.deepEqual(arm.counts(), counts);
  } finally {
    arm.destroy();
  }
  assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
  assert.deepEqual(casts.map(cast => query(motion, cast, ref)), retained);
});

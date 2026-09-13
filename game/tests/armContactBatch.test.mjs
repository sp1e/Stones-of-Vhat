import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import RAPIER from '@dimforge/rapier3d-compat';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import { FIXED_DT } from '../src/runtime/fixedStep.ts';

const batchUrl = new URL('../src/physics/armContactBatch.ts', import.meta.url);
const api = existsSync(batchUrl) ? await import(batchUrl.href) : {};

const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });
const identity = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
const cast = (snapshot, {
  castId = 'cast', projectileId = 'projectile',
  start = vector(), end = vector(), shape = { kind: 'box', size: [.12, .01, .12] },
} = {}) => ({
  worldEpoch: snapshot.worldEpoch,
  fromTick: snapshot.interval.fromTick,
  toTick: snapshot.interval.toTick,
  castId,
  projectileId,
  shape: structuredClone(shape),
  startPose: { position: { ...start }, rotation: { ...identity } },
  endPosition: { ...end },
});

async function physicalArm() {
  const arm = await createArmFixture();
  arm.setActive(true);
  assert.equal(arm.step(), true);
  const animated = arm.snapshot();
  assert.equal(arm.queueHandoff({ worldEpoch: animated.worldEpoch, atTick: animated.tick, impulse: null }), true);
  assert.equal(arm.step(), true);
  arm.setActive(false);
  const snapshot = arm.snapshot();
  const motion = createContactMotion(snapshot.interval);
  const forearm = motion.colliders().find(entry => entry.ref.bodyId === 'forearm');
  assert.ok(forearm);
  const center = motion.sample(forearm.ref, FIXED_DT / 2).colliderWorld.position;
  return {
    arm,
    snapshot,
    horizontal: cast(snapshot, {
      castId: 'horizontal', projectileId: 'horizontal-blade',
      start: vector(center.x - .5, center.y, center.z),
      end: vector(center.x + .5, center.y, center.z),
    }),
    z: cast(snapshot, {
      castId: 'z', projectileId: 'z-blade',
      start: vector(center.x, center.y, center.z - .5),
      end: vector(center.x, center.y, center.z + .5),
    }),
  };
}

test('provides the bounded owner-retained arm contact batch', () => {
  assert.equal(typeof api.createArmContactBatch, 'function');
});

test('exports immutable whole-batch limits and validates allowance before owner capture', async () => {
  assert.deepEqual(api.ARM_CONTACT_LIMITS, { maxNativeCalls: 512, maxCasts: 8 });
  assert.ok(Object.isFrozen(api.ARM_CONTACT_LIMITS));
  for (const maxNativeCalls of [-1, .5, 513, NaN, Infinity, '128', null]) {
    let snapshots = 0;
    const owner = { snapshot() { snapshots += 1; throw new Error('must not capture'); } };
    await assert.rejects(api.createArmContactBatch(owner, { maxNativeCalls }), /allowance|native|integer|512/i);
    assert.equal(snapshots, 0);
  }
  const script = String.raw`
    const originalInstantiate = WebAssembly.instantiate;
    let initializationCalls = 0;
    WebAssembly.instantiate = async (...args) => {
      initializationCalls += 1;
      return originalInstantiate(...args);
    };
    try {
      const api = await import('./src/physics/armContactBatch.ts?invalid-option-preflight');
      let snapshots = 0;
      const owner = { snapshot() { snapshots += 1; throw new Error('owner capture must not run'); } };
      let failure;
      try { await api.createArmContactBatch(owner, { maxNativeCalls: null }); } catch (error) { failure = error; }
      await new Promise(resolve => setTimeout(resolve, 20));
      if (!failure || initializationCalls !== 0 || snapshots !== 0) {
        throw new Error('invalid option reached initialization or owner capture');
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

test('keeps the pure validator source free of Rapier shape construction', () => {
  const source = readFileSync(new URL('../src/physics/contactPairQuery.ts', import.meta.url), 'utf8');
  const validation = source.slice(source.indexOf('function validateCast('), source.indexOf('function prepare('));
  assert.ok(validation.length > 0);
  assert.doesNotMatch(validation, /new\s+RAPIER\.(?:Ball|Cuboid)/);
});

test('creates at the actual initial boundary, consumes an empty completed tick once, and destroys only the wrapper', async () => {
  const arm = await createArmFixture();
  try {
    const batch = await api.createArmContactBatch(arm);
    await assert.rejects(async () => batch.queryTick([]), /completed|initial/i);
    arm.setActive(true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    const before = arm.snapshot();
    const result = batch.queryTick([]);
    assert.deepEqual({
      epoch: result.worldEpoch,
      from: result.fromTick,
      to: result.toTick,
      calls: result.nativeCalls,
      remaining: result.remainingNativeCalls,
      families: result.families,
    }, {
      epoch: before.worldEpoch,
      from: before.interval.fromTick,
      to: before.interval.toTick,
      calls: 0,
      remaining: 512,
      families: [],
    });
    assert.deepEqual(result.snapshot, before);
    result.snapshot.interval.bodies.length = 0;
    assert.deepEqual(arm.snapshot(), before);
    assert.throws(() => batch.queryTick([]), /consumed|tick|replay/i);
    assert.throws(() => batch.queryTick([cast(before)]), /consumed|tick|replay/i);
    assert.deepEqual(arm.snapshot(), before);
    assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
    batch.destroy();
    batch.destroy();
    assert.throws(() => batch.queryTick([]), /destroy|closed/i);
    assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
  } finally {
    arm.destroy();
  }
});

test('creates from an actual completed boundary and propagates retained-owner destruction', async () => {
  const arm = await createArmFixture();
  let batch;
  try {
    arm.setActive(true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    batch = await api.createArmContactBatch(arm, { maxNativeCalls: 0 });
  } finally {
    arm.destroy();
  }
  assert.throws(() => batch.queryTick([]), /destroy/i);
  batch.destroy();
});

test('queries the full physical owner with one snapshot and one compilation without stepping',
  { concurrency: false }, async context => {
  const { arm, snapshot, horizontal, z } = await physicalArm();
  const batch = await api.createArmContactBatch(arm);
  const originalSnapshot = arm.snapshot;
  const originalStep = arm.step;
  const originalStructuredClone = globalThis.structuredClone;
  let snapshotCalls = 0, compilationCalls = 0;
  try {
    arm.snapshot = () => {
      snapshotCalls += 1;
      return originalSnapshot();
    };
    arm.step = () => { throw new Error('queryTick must not step the owner'); };
    globalThis.structuredClone = function observedContactMotionCompilation(...args) {
      const stack = new Error().stack ?? '';
      if (args[0]?.kind === 'completed' && /at createContactMotion/.test(stack)) compilationCalls += 1;
      return originalStructuredClone(...args);
    };
    const result = batch.queryTick([z, horizontal]);
    assert.equal(snapshotCalls, 1);
    assert.equal(compilationCalls, 1);
    assert.equal(result.families.length, 2);
    assert.deepEqual(result.families.map(family => family.identity.castId), ['horizontal', 'z']);
    assert.ok(result.families.every(family => family.candidates.length === 4));
    const blocked = result.families[0];
    assert.equal(blocked.kind, 'blocked');
    assert.equal(blocked.earliestPossibleS, 0);
    assert.equal('hit' in blocked, false);
    assert.equal(blocked.candidates.find(candidate => candidate.identity.target.bodyId === 'upper-arm').kind, 'initial-blocked');
    assert.equal(blocked.candidates.find(candidate => candidate.identity.target.bodyId === 'forearm').kind, 'hit');
    const clearZ = result.families[1];
    assert.equal(clearZ.kind, 'hit');
    assert.equal(clearZ.hit.identity.target.bodyId, 'forearm');
    assert.notEqual(clearZ.candidates.find(candidate => candidate.identity.target.bodyId === 'upper-arm').kind, 'initial-blocked');
    assert.equal(result.nativeCalls, result.families.reduce((sum, family) => sum + family.nativeCalls, 0));
    assert.equal(result.remainingNativeCalls, 512 - result.nativeCalls);
    assert.ok(result.nativeCalls <= 512);
    assert.deepEqual(result.snapshot, snapshot);
    result.families[0].candidates.length = 0;
    result.snapshot.interval.bodies.length = 0;
    assert.deepEqual(originalSnapshot(), snapshot);
    context.diagnostic(`physical batch calls=${result.nativeCalls}; horizontal=${blocked.kind}; z=${clearZ.kind}:${clearZ.hit.identity.target.bodyId}`);
  } finally {
    globalThis.structuredClone = originalStructuredClone;
    arm.snapshot = originalSnapshot;
    arm.step = originalStep;
    batch.destroy();
    arm.destroy();
  }
});

test('enforces 0, 127, 128 and measured C+127/C+128 reserve boundaries with real pairs', async context => {
  const { arm, z } = await physicalArm();
  const wrappers = [];
  try {
    for (const allowance of [0, 127]) {
      const batch = await api.createArmContactBatch(arm, { maxNativeCalls: allowance });
      wrappers.push(batch);
      const result = batch.queryTick([z]);
      assert.equal(result.nativeCalls, 0);
      assert.equal(result.remainingNativeCalls, allowance);
      assert.equal(result.families[0].kind, 'unresolved');
      assert.equal(result.families[0].queriedCount, 0);
      assert.equal(result.families[0].unqueriedCount, 4);
      assert.ok(result.families[0].candidates.every(candidate => candidate.kind === 'unqueried'
        && candidate.earliestPossibleS === 0 && candidate.nativeCalls === 0
        && !('checkedThroughS' in candidate)));
    }
    const control = await api.createArmContactBatch(arm, { maxNativeCalls: 128 });
    wrappers.push(control);
    const controlResult = control.queryTick([z]);
    const cost = controlResult.nativeCalls;
    assert.ok(Number.isInteger(cost) && cost > 0 && cost <= 128);
    assert.equal(controlResult.families[0].queriedCount, 1);
    assert.equal(controlResult.families[0].unqueriedCount, 3);
    assert.equal(controlResult.remainingNativeCalls, 128 - cost);

    const below = await api.createArmContactBatch(arm, { maxNativeCalls: cost + 127 });
    wrappers.push(below);
    const belowResult = below.queryTick([z]);
    assert.equal(belowResult.families[0].queriedCount, 1);
    assert.equal(belowResult.remainingNativeCalls, 127);

    const exact = await api.createArmContactBatch(arm, { maxNativeCalls: cost + 128 });
    wrappers.push(exact);
    const exactResult = exact.queryTick([z]);
    assert.equal(exactResult.families[0].queriedCount, 2);
    assert.ok(exactResult.nativeCalls > cost);
    assert.equal(exactResult.remainingNativeCalls, cost + 128 - exactResult.nativeCalls);
    context.diagnostic(`first real pair C=${cost}; C+127 queried=1; C+128 queried=2`);
  } finally {
    for (const wrapper of wrappers) wrapper.destroy();
    arm.destroy();
  }
});

test('validates every dense cast before work, caps eight, rejects collision-safe duplicates, and canonicalizes permutations', async () => {
  const { arm, snapshot, z } = await physicalArm();
  const wrappers = [];
  try {
    const invalidBatch = await api.createArmContactBatch(arm);
    wrappers.push(invalidBatch);
    const invalid = structuredClone(z);
    invalid.castId = '';
    let nativeCalls = 0;
    const original = RAPIER.Shape.prototype.contactShape;
    try {
      RAPIER.Shape.prototype.contactShape = function observedNativeCall(...args) {
        nativeCalls += 1;
        return original.apply(this, args);
      };
      assert.throws(() => invalidBatch.queryTick([z, invalid]), /cast|nonempty/i);
      const stale = structuredClone(z);
      stale.worldEpoch = 'stale-epoch';
      assert.throws(() => invalidBatch.queryTick([z, stale]), /identity|epoch/i);
      const wrongTicks = structuredClone(z);
      wrongTicks.fromTick -= 1;
      wrongTicks.toTick -= 1;
      assert.throws(() => invalidBatch.queryTick([z, wrongTicks]), /identity|tick/i);
      assert.equal(nativeCalls, 0);
      const valid = invalidBatch.queryTick([z]);
      assert.ok(valid.nativeCalls > 0);
    } finally {
      RAPIER.Shape.prototype.contactShape = original;
    }

    for (const allowance of [0, 512]) {
      const batch = await api.createArmContactBatch(arm, { maxNativeCalls: allowance });
      wrappers.push(batch);
      const invalidLate = structuredClone(z);
      invalidLate.projectileId = '';
      assert.throws(() => batch.queryTick([z, invalidLate]), /projectile|nonempty/i);
      const retry = batch.queryTick([z]);
      assert.ok(retry.families.length === 1);
    }

    const sparseBatch = await api.createArmContactBatch(arm, { maxNativeCalls: 0 });
    wrappers.push(sparseBatch);
    const sparse = [z, structuredClone(z)];
    delete sparse[1];
    assert.throws(() => sparseBatch.queryTick(sparse), /dense|sparse/i);
    const eight = Array.from({ length: 8 }, (_, index) => cast(snapshot, {
      castId: `cast-${index}`, projectileId: `projectile-${index}`,
    }));
    assert.equal(sparseBatch.queryTick(eight).families.length, 8);

    const nineBatch = await api.createArmContactBatch(arm, { maxNativeCalls: 0 });
    wrappers.push(nineBatch);
    assert.throws(() => nineBatch.queryTick([...eight, cast(snapshot, { castId: 'nine', projectileId: 'nine' })]), /8|casts/i);

    const duplicateBatch = await api.createArmContactBatch(arm, { maxNativeCalls: 0 });
    wrappers.push(duplicateBatch);
    assert.throws(() => duplicateBatch.queryTick([z, structuredClone(z)]), /duplicate|tuple/i);
    const punctuation = [
      cast(snapshot, { castId: 'a', projectileId: 'b|c' }),
      cast(snapshot, { castId: 'a|b', projectileId: 'c' }),
    ];
    assert.equal(duplicateBatch.queryTick(punctuation).families.length, 2);

    const a = cast(snapshot, { castId: 'A', projectileId: 'two' });
    const b = cast(snapshot, { castId: 'B', projectileId: 'one' });
    const first = await api.createArmContactBatch(arm, { maxNativeCalls: 0 });
    const second = await api.createArmContactBatch(arm, { maxNativeCalls: 0 });
    wrappers.push(first, second);
    assert.deepEqual(first.queryTick([b, a]), second.queryTick([a, b]));
  } finally {
    for (const wrapper of wrappers) wrapper.destroy();
    arm.destroy();
  }
});

test('shares real nonzero work across eight families and retains a stable explicit pending suffix', async context => {
  const { arm, z } = await physicalArm();
  const batch = await api.createArmContactBatch(arm, { maxNativeCalls: 256 });
  const defaultBatch = await api.createArmContactBatch(arm);
  try {
    const casts = Array.from({ length: 8 }, (_, index) => ({
      ...structuredClone(z),
      castId: `shared-${index}`,
      projectileId: `shared-projectile-${index}`,
    }));
    const result = batch.queryTick(casts);
    const candidates = result.families.flatMap(family => family.candidates);
    assert.equal(result.families.length, 8);
    assert.equal(candidates.length, 32);
    assert.equal(result.nativeCalls, result.families.reduce((sum, family) => sum + family.nativeCalls, 0));
    assert.equal(result.remainingNativeCalls, 256 - result.nativeCalls);
    assert.ok(result.nativeCalls > 0 && result.nativeCalls <= 256);
    const firstPending = candidates.findIndex(candidate => candidate.kind === 'unqueried');
    assert.ok(firstPending > 0 && firstPending < candidates.length);
    assert.ok(candidates.slice(0, firstPending).every(candidate => candidate.kind !== 'unqueried'));
    assert.ok(candidates.slice(firstPending).every(candidate => candidate.kind === 'unqueried'
      && candidate.earliestPossibleS === 0 && candidate.nativeCalls === 0));
    assert.ok(result.families.filter(family => family.queriedCount > 0).length > 1);
    context.diagnostic(`eight-family shared work=${result.nativeCalls}; remaining=${result.remainingNativeCalls}; pending starts=${firstPending}/32`);

    const defaultResult = defaultBatch.queryTick(casts);
    assert.equal(defaultResult.families.length, 8);
    assert.equal(defaultResult.families.flatMap(family => family.candidates).length, 32);
    assert.ok(defaultResult.nativeCalls > 0 && defaultResult.nativeCalls <= 512);
    assert.equal(defaultResult.nativeCalls,
      defaultResult.families.reduce((sum, family) => sum + family.nativeCalls, 0));
    assert.equal(defaultResult.remainingNativeCalls, 512 - defaultResult.nativeCalls);
    context.diagnostic(`diagnostic default512 eight-family work=${defaultResult.nativeCalls}; remaining=${defaultResult.remainingNativeCalls}`);
  } finally {
    batch.destroy();
    defaultBatch.destroy();
    arm.destroy();
  }
});

test('canonicalizes cast and owner-roster permutations under measured constrained native work', async context => {
  const { arm, z } = await physicalArm();
  const wrappers = [];
  const originalSnapshot = arm.snapshot;
  const reversedSnapshot = () => {
    const value = originalSnapshot();
    value.interval.bodies.reverse();
    for (const sample of value.interval.nativeTrace.samples) sample.bodies.reverse();
    return value;
  };
  try {
    const a = { ...structuredClone(z), castId: 'A', projectileId: 'two' };
    const b = { ...structuredClone(z), castId: 'B', projectileId: 'one' };
    const control = await api.createArmContactBatch(arm, { maxNativeCalls: 128 });
    wrappers.push(control);
    const firstCost = control.queryTick([a]).nativeCalls;
    assert.ok(firstCost > 0);
    const allowance = firstCost + 127;

    const normal = await api.createArmContactBatch(arm, { maxNativeCalls: allowance });
    wrappers.push(normal);
    arm.snapshot = reversedSnapshot;
    const reversed = await api.createArmContactBatch(arm, { maxNativeCalls: allowance });
    wrappers.push(reversed);
    arm.snapshot = originalSnapshot;
    const normalResult = normal.queryTick([b, a]);
    arm.snapshot = reversedSnapshot;
    const reversedResult = reversed.queryTick([a, b]);
    assert.ok(normalResult.nativeCalls > 0);
    assert.equal(normalResult.remainingNativeCalls, 127);
    assert.equal(reversedResult.remainingNativeCalls, 127);
    assert.deepEqual(normalResult.families, reversedResult.families);
    assert.deepEqual(
      { nativeCalls: normalResult.nativeCalls, remainingNativeCalls: normalResult.remainingNativeCalls },
      { nativeCalls: reversedResult.nativeCalls, remainingNativeCalls: reversedResult.remainingNativeCalls },
    );
    assert.notDeepEqual(normalResult.snapshot.interval.bodies, reversedResult.snapshot.interval.bodies);
    context.diagnostic(`diagnostic separate wrappers: constrained allowance=${allowance}, work=${normalResult.nativeCalls}`);
  } finally {
    arm.snapshot = originalSnapshot;
    for (const wrapper of wrappers) wrapper.destroy();
    arm.destroy();
  }
});

test('rejects replay variants without native work and permits the next actual owner interval', async () => {
  const { arm, snapshot, z } = await physicalArm();
  const batch = await api.createArmContactBatch(arm, { maxNativeCalls: 128 });
  const originalContact = RAPIER.Shape.prototype.contactShape;
  let nativeCalls = 0;
  try {
    RAPIER.Shape.prototype.contactShape = function observedReplayWork(...args) {
      nativeCalls += 1;
      return originalContact.apply(this, args);
    };
    const consumed = batch.queryTick([z]);
    assert.ok(consumed.nativeCalls > 0);
    assert.equal(nativeCalls, consumed.nativeCalls);
    const consumedCalls = nativeCalls;
    assert.throws(() => batch.queryTick([z]), /consumed|replay|tick/i);
    assert.equal(nativeCalls, consumedCalls);
    assert.throws(() => batch.queryTick([cast(snapshot, { castId: 'changed', projectileId: 'changed' })]), /consumed|replay|tick/i);
    assert.equal(nativeCalls, consumedCalls);
    assert.throws(() => batch.queryTick([]), /consumed|replay|tick/i);
    assert.equal(nativeCalls, consumedCalls);
    arm.setActive(true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    const next = arm.snapshot();
    assert.equal(batch.queryTick([cast(next)]).toTick, next.tick);
    assert.ok(nativeCalls > consumedCalls);
  } finally {
    RAPIER.Shape.prototype.contactShape = originalContact;
    batch.destroy();
    arm.destroy();
  }
});

test('rejects substituted or changed owner topology before native work and accepts sign-equivalent local rotations', async () => {
  const { arm, z } = await physicalArm();
  const batch = await api.createArmContactBatch(arm);
  const originalSnapshot = arm.snapshot;
  const originalContact = RAPIER.Shape.prototype.contactShape;
  let nativeCalls = 0;
  try {
    RAPIER.Shape.prototype.contactShape = function observedTopologyWork(...args) {
      nativeCalls += 1;
      return originalContact.apply(this, args);
    };
    arm.snapshot = () => {
      const value = originalSnapshot();
      value.counts = { bodies: 2, colliders: 3, joints: 1 };
      value.interval.bodies = value.interval.bodies.slice(0, 2);
      return value;
    };
    assert.throws(() => batch.queryTick([z]), /complete|4-body|roster/i);
    assert.equal(nativeCalls, 0);

    arm.snapshot = () => {
      const value = originalSnapshot();
      value.interval.bodies[0].from.colliders[0].localPose.position.x += 1e-9;
      return value;
    };
    assert.throws(() => batch.queryTick([z]), /topology|capture|changed|interval/i);
    assert.equal(nativeCalls, 0);

    arm.snapshot = () => {
      const value = originalSnapshot();
      for (const endpoint of [value.interval.bodies[0].from, value.interval.bodies[0].to]) {
        endpoint.colliders[0].role = 'navigation';
      }
      return value;
    };
    assert.throws(() => batch.queryTick([z]), /blocker|role|topology/i);
    assert.equal(nativeCalls, 0);

    arm.snapshot = () => {
      const value = originalSnapshot();
      for (const endpoint of [value.interval.bodies[0].from, value.interval.bodies[0].to]) {
        endpoint.colliders[0].localPose.scale = { x: 1.000001, y: 1, z: 1 };
      }
      return value;
    };
    assert.throws(() => batch.queryTick([z]), /scale|rigid/i);
    assert.equal(nativeCalls, 0);

    arm.snapshot = () => {
      const value = originalSnapshot();
      value.tick += 1;
      return value;
    };
    assert.throws(() => batch.queryTick([z]), /tick|interval/i);
    assert.equal(nativeCalls, 0);

    arm.snapshot = () => {
      const value = originalSnapshot();
      for (const body of value.interval.bodies) for (const endpoint of [body.from, body.to]) {
        const q = endpoint.colliders[0].localPose.rotation;
        q.x *= -1; q.y *= -1; q.z *= -1; q.w *= -1;
      }
      for (const sample of value.interval.nativeTrace.samples) for (const body of sample.bodies) {
        const q = body.endpoint.colliders[0].localPose.rotation;
        q.x *= -1; q.y *= -1; q.z *= -1; q.w *= -1;
      }
      return value;
    };
    assert.equal(batch.queryTick([z]).families.length, 1);
    assert.ok(nativeCalls > 0);
  } finally {
    arm.snapshot = originalSnapshot;
    RAPIER.Shape.prototype.contactShape = originalContact;
    batch.destroy();
    arm.destroy();
  }
});

test('closes after an injected post-consumption exception and leaves independent native work healthy',
  { concurrency: false }, async () => {
  const { arm, z } = await physicalArm();
  const wrappers = [];
  const original = RAPIER.Shape.prototype.contactShape;
  try {
    const control = await api.createArmContactBatch(arm, { maxNativeCalls: 128 });
    wrappers.push(control);
    const firstCost = control.queryTick([z]).nativeCalls;
    assert.ok(firstCost > 0);

    const failing = await api.createArmContactBatch(arm);
    wrappers.push(failing);
    let calls = 0;
    RAPIER.Shape.prototype.contactShape = function injectedPostWork(...args) {
      calls += 1;
      const value = original.apply(this, args);
      if (calls !== firstCost + 1 || !value) return value;
      return Object.defineProperty({ ...value }, 'distance', {
        enumerable: true,
        get() { throw new Error('injected post-work distance failure'); },
      });
    };
    assert.throws(() => failing.queryTick([z]), /injected post-work/i);
    assert.ok(calls > firstCost);
    const callsAfterFailure = calls;
    assert.throws(() => failing.queryTick([z]), /closed|destroy/i);
    assert.equal(calls, callsAfterFailure);
  } finally {
    RAPIER.Shape.prototype.contactShape = original;
  }
  try {
    const healthy = await api.createArmContactBatch(arm, { maxNativeCalls: 128 });
    wrappers.push(healthy);
    assert.ok(healthy.queryTick([z]).nativeCalls > 0);
  } finally {
    for (const wrapper of wrappers) wrapper.destroy();
    arm.destroy();
  }
});

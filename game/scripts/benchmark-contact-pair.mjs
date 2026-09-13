// CPU-only diagnostic for the accepted pair API, not a frame-time acceptance test.
import assert from 'node:assert/strict';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createContactPairQuery, CONTACT_QUERY_LIMITS } from '../src/physics/contactPairQuery.ts';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { castFixture, motionFixture, targetRef, vec, dt } from '../tests/contactPairFixtures.mjs';

const query = await createContactPairQuery();
const crossing = motionFixture({ points: [vec(0, 0, -1), vec(0, 0, 1)] });
const crossingCast = castFixture();
const grazing = motionFixture({
  points: [vec(-.01, .19998), vec(.01, .19998), vec()],
  offsets: [0, dt / 2, dt],
});
const grazingCasts = Array.from({ length: 4 }, (_, index) => castFixture({
  start: vec(), end: vec(), castId: `budget-cast-${index}`, projectileId: `budget-projectile-${index}`,
}));

// Capture the complete real owner once. No world survives into timed queries.
const arm = await createArmFixture();
let armMotion;
try {
  arm.setActive(true);
  assert.equal(arm.step(), true);
  const animated = arm.snapshot();
  assert.equal(arm.queueHandoff({
    worldEpoch: animated.worldEpoch, atTick: animated.tick, impulse: null,
  }), true);
  assert.equal(arm.step(), true);
  arm.setActive(false);
  armMotion = createContactMotion(arm.snapshot().interval);
} finally {
  arm.destroy();
}
assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
const armRefs = armMotion.colliders().map(collider => collider.ref);
const forearm = armRefs.find(ref => ref.bodyId === 'forearm');
assert.ok(forearm);
const center = armMotion.sample(forearm, dt / 2).colliderWorld.position;
const armCast = castFixture({
  worldEpoch: armMotion.worldEpoch, fromTick: armMotion.fromTick,
  castId: 'complete-arm-query', projectileId: 'arm-blade',
  start: vec(center.x - .5, center.y, center.z),
  end: vec(center.x + .5, center.y, center.z),
  shape: { kind: 'box', size: [.12, .01, .12] },
});

const cases = [
  { name: 'analytic-moving-ball', run: () => [query(crossing, crossingCast, targetRef(crossing))] },
  { name: 'one-128-call-graze', run: () => [query(grazing, grazingCasts[0], targetRef(grazing))] },
  { name: 'four-budget-pairs-512-calls', run: () => grazingCasts.map(cast => query(grazing, cast, targetRef(grazing))) },
  { name: 'complete-four-collider-arm', run: () => armRefs.map(ref => query(armMotion, armCast, ref)) },
];
const compact = results => results.map(result => ({
  body: result.identity.target.bodyId,
  kind: result.kind,
  reason: result.reason ?? null,
  calls: result.nativeCalls,
  lowerS: result.lowerS ?? result.earliestPossibleS ?? null,
  upperS: result.upperS ?? result.checkedThroughS ?? null,
}));
const warmups = 20;
const samples = 80;
const measurements = cases.map(candidate => {
  const expected = compact(candidate.run());
  for (let index = 0; index < warmups; index += 1) assert.deepEqual(compact(candidate.run()), expected);
  const elapsed = [];
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    const results = candidate.run();
    elapsed.push(performance.now() - started);
    // Stability assertions are deliberately outside each measured duration.
    assert.deepEqual(compact(results), expected);
  }
  const ordered = [...elapsed].sort((a, b) => a - b);
  return {
    name: candidate.name,
    outcomes: expected,
    nativeCallsPerSample: expected.reduce((sum, result) => sum + result.calls, 0),
    durationMs: {
      minimum: ordered[0],
      median: (ordered[(ordered.length - 1) >> 1] + ordered[ordered.length >> 1]) / 2,
      p95: ordered[Math.ceil(ordered.length * .95) - 1],
      maximum: ordered.at(-1),
      mean: elapsed.reduce((sum, value) => sum + value, 0) / samples,
    },
  };
});
assert.equal(measurements[1].nativeCallsPerSample, CONTACT_QUERY_LIMITS.maxNativeCalls);
assert.equal(measurements[2].nativeCallsPerSample, 4 * CONTACT_QUERY_LIMITS.maxNativeCalls);
assert.equal(measurements[3].outcomes.length, 4);

console.log(JSON.stringify({
  scope: 'Node CPU diagnostic only; not browser, Electron, GPU, whole-frame or 60fps acceptance',
  timingIncludes: 'caller-side target lookup/cloning and output arrays, pair preparation, motion sampling, native contacts, detached results and incidental GC; arm case reuses target refs',
  timingExcludes: 'initialization, world capture/step, motion compilation, renderer, ordering and stability assertions',
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model ?? 'unknown' },
  workloadIsolation: 'ordinary local execution; other machine work is uncontrolled',
  warmupsPerCase: warmups,
  samplesPerCase: samples,
  limits: CONTACT_QUERY_LIMITS,
  measurements,
}, null, 2));

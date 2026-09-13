import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import { CONTACT_QUERY_EVIDENCE, CONTACT_QUERY_LIMITS } from '../src/physics/contactPairQuery.ts';
import { FIXED_DT } from '../src/runtime/fixedStep.ts';
import { castFixture } from './contactPairFixtures.mjs';

const familyUrl = new URL('../src/physics/contactFamily.ts', import.meta.url);
const api = existsSync(familyUrl) ? await import(familyUrl.href) : {};

test('provides the pure declared-contact-family resolver', () => {
  assert.equal(typeof api.resolveContactFamily, 'function');
});

const familyIdentity = Object.freeze({
  worldEpoch: 'family-epoch',
  fromTick: 20,
  toTick: 21,
  castId: 'cast-family',
  projectileId: 'projectile-family',
});
const ref = (bodyId, colliderId = 'shape') => ({
  worldEpoch: familyIdentity.worldEpoch,
  bodyId,
  colliderId,
});
const base = target => ({
  identity: { ...familyIdentity, target: structuredClone(target) },
  evidence: CONTACT_QUERY_EVIDENCE,
  nativeCalls: 1,
});
const miss = target => ({ ...base(target), kind: 'miss' });
const initial = target => ({
  ...base(target), kind: 'initial-blocked', earliestPossibleS: 0, reason: 'overlap-or-within-guard',
});
const inconclusive = (target, earliestPossibleS, checkedThroughS = earliestPossibleS, reason = 'graze') => ({
  ...base(target), kind: 'inconclusive', earliestPossibleS, checkedThroughS, reason,
});
const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });
const pose = position => ({ position: position ?? vector(), rotation: { x: 0, y: 0, z: 0, w: 1 } });
const geometry = () => ({
  projectileWorld: pose(vector(.1, .2, .3)),
  targetBodyOriginWorld: pose(vector(.4, .5, .6)),
  targetColliderWorld: pose(vector(.7, .8, .9)),
  projectileWitnessWorld: vector(1, 2, 3),
  targetWitnessWorld: vector(4, 5, 6),
  projectileWitnessLocal: vector(7, 8, 9),
  targetWitnessColliderLocal: vector(10, 11, 12),
  targetWitnessBodyLocal: vector(13, 14, 15),
  projectileNormalWorld: vector(1),
  targetNormalWorld: vector(-1),
  targetNormalColliderLocal: vector(-1),
  targetNormalBodyLocal: vector(-1),
});
const hit = (target, lowerS, upperS) => {
  const bracketTravelM = .0004;
  return {
    ...base(target),
    kind: 'hit',
    lowerS,
    upperS,
    timeOfImpactS: upperS,
    intervalFraction: upperS / FIXED_DT,
    bracketTravelM,
    uncertaintyBoundM: bracketTravelM + 2 * CONTACT_QUERY_LIMITS.guardM,
    geometry: geometry(),
  };
};
const unqueried = target => ({
  identity: { ...familyIdentity, target: structuredClone(target) },
  kind: 'unqueried',
  evidence: 'not-queried-family-budget',
  reason: 'family-budget',
  earliestPossibleS: 0,
  nativeCalls: 0,
});
const manifestFor = (targets, identity = familyIdentity) => ({
  identity: structuredClone(identity),
  expectedBlockers: targets.map(target => structuredClone(target)),
});
const resolve = candidates => api.resolveContactFamily(
  manifestFor(candidates.map(candidate => candidate.identity.target)),
  candidates,
);
const frontierIds = result => result.frontier.map(target => target.bodyId);

test('resolves the approved pure first-contact ordering table', () => {
  const empty = api.resolveContactFamily(manifestFor([]), []);
  assert.equal(empty.kind, 'clear');
  assert.deepEqual(empty.frontier, []);
  assert.deepEqual({ queried: empty.queriedCount, unqueried: empty.unqueriedCount, calls: empty.nativeCalls },
    { queried: 0, unqueried: 0, calls: 0 });

  const allMiss = resolve([miss(ref('a')), miss(ref('b'))]);
  assert.equal(allMiss.kind, 'clear');
  assert.deepEqual(allMiss.frontier, []);

  const onlyHit = resolve([hit(ref('only'), .001, .002)]);
  assert.equal(onlyHit.kind, 'hit');
  assert.equal(onlyHit.hit.identity.target.bodyId, 'only');
  assert.deepEqual(frontierIds(onlyHit), ['only']);

  const onlyUnknown = resolve([inconclusive(ref('unknown'), .003)]);
  assert.equal(onlyUnknown.kind, 'unresolved');
  assert.equal(onlyUnknown.earliestPossibleS, .003);
  assert.deepEqual(frontierIds(onlyUnknown), ['unknown']);

  for (const candidates of [
    [initial(ref('block'))],
    [initial(ref('block-b')), initial(ref('block-a'))],
    [initial(ref('block')), unqueried(ref('pending'))],
    [initial(ref('block')), inconclusive(ref('unknown'), 0)],
  ]) {
    const result = resolve(candidates);
    assert.equal(result.kind, 'blocked');
    assert.equal(result.earliestPossibleS, 0);
    assert.equal('hit' in result, false);
  }
  const blockedFrontier = resolve([
    initial(ref('block')),
    initial(ref('other-block')),
    unqueried(ref('pending')),
    inconclusive(ref('unknown'), 0),
  ]);
  assert.deepEqual(frontierIds(blockedFrontier), ['block', 'other-block', 'pending', 'unknown']);

  const separated = resolve([hit(ref('later'), .009, .010), hit(ref('first'), .001, .002)]);
  assert.equal(separated.kind, 'hit');
  assert.equal(separated.hit.identity.target.bodyId, 'first');
  assert.deepEqual(frontierIds(separated), ['first']);

  for (const candidates of [
    [hit(ref('a'), .001, .006), hit(ref('b'), .006, .009)],
    [hit(ref('a'), .001, .007), hit(ref('b'), .005, .006)],
    [inconclusive(ref('earlier-unknown'), .001), hit(ref('later-hit'), .005, .006)],
  ]) {
    const result = resolve(candidates);
    assert.equal(result.kind, 'unresolved');
    assert.equal('hit' in result, false);
  }

  const laterUnknown = resolve([hit(ref('first'), .001, .002), inconclusive(ref('later-unknown'), .003)]);
  assert.equal(laterUnknown.kind, 'hit');
  assert.deepEqual(frontierIds(laterUnknown), ['first']);

  const nontransitive = resolve([
    hit(ref('c'), .009, .011),
    hit(ref('a'), .001, .010),
    hit(ref('b'), .005, .006),
  ]);
  assert.equal(nontransitive.kind, 'unresolved');
  assert.deepEqual(frontierIds(nontransitive), ['a', 'b']);
  assert.equal(nontransitive.earliestPossibleS, .001);

  const allUnknown = resolve([
    inconclusive(ref('late'), .009),
    inconclusive(ref('early'), .001),
    inconclusive(ref('middle'), .005),
  ]);
  assert.equal(allUnknown.kind, 'unresolved');
  assert.deepEqual(frontierIds(allUnknown), ['early', 'late', 'middle']);
  assert.equal(allUnknown.earliestPossibleS, .001);
});

test('never clears partial family work and accounts actual calls', () => {
  const pendingFirst = resolve([unqueried(ref('pending')), hit(ref('later'), .004, .005)]);
  assert.equal(pendingFirst.kind, 'unresolved');
  assert.equal(pendingFirst.earliestPossibleS, 0);
  assert.deepEqual(frontierIds(pendingFirst), ['later', 'pending']);

  const partialMisses = resolve([miss(ref('miss-a')), miss(ref('miss-b')), unqueried(ref('pending'))]);
  assert.equal(partialMisses.kind, 'unresolved');
  assert.deepEqual({ queried: partialMisses.queriedCount, unqueried: partialMisses.unqueriedCount,
    calls: partialMisses.nativeCalls }, { queried: 2, unqueried: 1, calls: 2 });

  const expensiveMiss = miss(ref('expensive-miss'));
  expensiveMiss.nativeCalls = 37;
  const measuredHit = hit(ref('measured-hit'), .004, .005);
  measuredHit.nativeCalls = 12;
  const actualCalls = resolve([expensiveMiss, measuredHit, unqueried(ref('budget-stop'))]);
  assert.equal(actualCalls.nativeCalls, 49);
  assert.deepEqual({ queried: actualCalls.queriedCount, unqueried: actualCalls.unqueriedCount },
    { queried: 2, unqueried: 1 });
});

const permutations = values => {
  if (values.length < 2) return [values.slice()];
  return values.flatMap((value, index) => permutations(values.filter((_, other) => other !== index))
    .map(rest => [value, ...rest]));
};

test('manifest and result permutations are stable and tuple identities never collide', () => {
  const candidates = [
    hit(ref('a|b', 'c'), .001, .004),
    hit(ref('a', 'b|c'), .003, .005),
    miss(ref('other', 'shape')),
    inconclusive(ref('z', 'shape'), .010),
    miss(ref('same-name-a', 'same')),
    miss(ref('same-name-b', 'same')),
  ];
  const canonical = api.resolveContactFamily(manifestFor(candidates.map(candidate => candidate.identity.target)), candidates);
  for (const expectedBlockers of permutations(candidates.map(candidate => candidate.identity.target))) {
    for (const results of permutations(candidates.slice(0, 3))) {
      const reordered = [...results, ...candidates.slice(3)];
      assert.deepEqual(api.resolveContactFamily(manifestFor(expectedBlockers), reordered), canonical);
    }
  }
  assert.deepEqual(canonical.candidates.map(candidate => [candidate.identity.target.bodyId, candidate.identity.target.colliderId]), [
    ['a', 'b|c'], ['a|b', 'c'], ['other', 'shape'], ['same-name-a', 'same'], ['same-name-b', 'same'], ['z', 'shape'],
  ]);
});

test('returns rebuilt detached records, siblings, frontier and selected hit', () => {
  const selectedInput = hit(ref('selected'), .001, .002);
  const missInput = { ...miss(ref('later')), geometry: geometry(), hit: selectedInput, custom: { unsafe: true } };
  const manifest = manifestFor([selectedInput.identity.target, missInput.identity.target]);
  manifest.identity.extra = 'ignore';
  manifest.expectedBlockers[0].extra = 'ignore';
  const result = api.resolveContactFamily(manifest, [missInput, selectedInput]);
  assert.equal(result.kind, 'hit');
  assert.deepEqual(Object.keys(result.identity).sort(), ['castId', 'fromTick', 'projectileId', 'toTick', 'worldEpoch']);
  assert.deepEqual(Object.keys(result.candidates.find(candidate => candidate.kind === 'miss')).sort(),
    ['evidence', 'identity', 'kind', 'nativeCalls']);
  assert.deepEqual(Object.keys(result.frontier[0]).sort(), ['bodyId', 'colliderId', 'worldEpoch']);
  assert.notStrictEqual(result.hit, result.candidates.find(candidate => candidate.kind === 'hit'));
  assert.notStrictEqual(result.hit.geometry, result.candidates.find(candidate => candidate.kind === 'hit').geometry);
  assert.notStrictEqual(result.candidates[0].identity.target, result.candidates[1].identity.target);

  const retained = structuredClone(result);
  const retainedInputs = structuredClone({ manifest, selectedInput, missInput });
  result.hit.geometry.projectileWorld.position.y = 98;
  assert.equal(result.candidates.find(candidate => candidate.kind === 'hit').geometry.projectileWorld.position.y,
    retained.candidates.find(candidate => candidate.kind === 'hit').geometry.projectileWorld.position.y);
  assert.deepEqual({ manifest, selectedInput, missInput }, retainedInputs);
  result.candidates.find(candidate => candidate.kind === 'hit').geometry.projectileWorld.position.z = 97;
  assert.equal(result.hit.geometry.projectileWorld.position.z, retained.hit.geometry.projectileWorld.position.z);
  result.frontier[0].bodyId = 'mutated-frontier';
  assert.equal(result.hit.identity.target.bodyId, 'selected');

  selectedInput.geometry.projectileWorld.position.x = 99;
  selectedInput.identity.target.bodyId = 'mutated-input';
  manifest.identity.castId = 'mutated-manifest';
  assert.equal(result.candidates.find(candidate => candidate.kind === 'hit').identity.target.bodyId, 'selected');
  const again = api.resolveContactFamily(
    manifestFor([ref('selected'), ref('later')]),
    [miss(ref('later')), hit(ref('selected'), .001, .002)],
  );
  assert.deepEqual(again, retained);
});

function expectInvalid(manifest, candidates, pattern = /contact|family|identity|candidate|collider|manifest|invalid|must|limit|duplicate|pair|native|expected/i) {
  const retainedManifest = structuredClone(manifest);
  const retainedCandidates = structuredClone(candidates);
  assert.throws(() => api.resolveContactFamily(manifest, candidates), pattern);
  assert.deepEqual(manifest, retainedManifest);
  assert.deepEqual(candidates, retainedCandidates);
}

test('rejects malformed manifests, sparse lists and incomplete or ambiguous membership', () => {
  const oneRef = ref('one');
  const oneMiss = miss(oneRef);
  expectInvalid(null, []);
  expectInvalid({ identity: familyIdentity, expectedBlockers: {} }, []);
  const sparseExpected = new Array(1);
  expectInvalid({ identity: familyIdentity, expectedBlockers: sparseExpected }, []);
  const sparseCandidates = new Array(1);
  expectInvalid(manifestFor([oneRef]), sparseCandidates);

  for (const [field, value] of [
    ['worldEpoch', ''], ['fromTick', -1], ['fromTick', 1.5], ['toTick', 22], ['castId', ' '], ['projectileId', ''],
  ]) {
    const identity = { ...familyIdentity, [field]: value };
    expectInvalid(manifestFor([oneRef], identity), [oneMiss]);
  }
  const tooMany = Array.from({ length: 129 }, (_, index) => ref(`body-${index}`));
  expectInvalid(manifestFor(tooMany), tooMany.map(miss));
  expectInvalid(manifestFor([oneRef, oneRef]), [oneMiss]);
  expectInvalid(manifestFor([oneRef]), [oneMiss, oneMiss]);
  expectInvalid(manifestFor([oneRef, ref('missing')]), [oneMiss]);
  expectInvalid(manifestFor([oneRef]), [miss(ref('unknown'))]);
  expectInvalid(manifestFor([oneRef]), [oneMiss, miss(ref('surplus'))]);

  for (const [field, value] of [
    ['worldEpoch', ''], ['worldEpoch', 'other-epoch'],
    ['bodyId', ''], ['bodyId', ' '], ['colliderId', ''], ['colliderId', ' '],
  ]) {
    const expectedManifest = manifestFor([oneRef]);
    expectedManifest.expectedBlockers[0][field] = value;
    expectInvalid(expectedManifest, [oneMiss]);
    const candidate = miss(oneRef);
    candidate.identity.target[field] = value;
    expectInvalid(manifestFor([oneRef]), [candidate]);
  }
});

test('rejects oversized and mismatched list lengths before walking their records', () => {
  const failIfWalked = (array, label) => new Proxy(array, {
    getOwnPropertyDescriptor(target, property) {
      if (property === '0') throw new Error(`${label} record was walked`);
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
    get(target, property, receiver) {
      if (property === '0') throw new Error(`${label} record was read`);
      return Reflect.get(target, property, receiver);
    },
  });
  const oversizedExpected = failIfWalked(Array.from({ length: 129 }, () => ref('unused')), 'expected');
  assert.throws(() => api.resolveContactFamily({ identity: familyIdentity, expectedBlockers: oversizedExpected }, []),
    /limit|128|count/i);
  const oversizedCandidates = failIfWalked(Array.from({ length: 129 }, () => miss(ref('unused'))), 'candidate');
  assert.throws(() => api.resolveContactFamily(manifestFor([]), oversizedCandidates), /limit|128|count/i);
  const surplusCandidate = failIfWalked([miss(ref('surplus'))], 'candidate');
  assert.throws(() => api.resolveContactFamily(manifestFor([]), surplusCandidate), /surplus|count|length|membership/i);
});

test('rejects mixed identity, evidence, call-count and timing records before selection', () => {
  const target = ref('valid');
  const validHit = hit(target, .001, .002);
  expectInvalid(manifestFor([target]), [{ ...miss(target), kind: 'unsupported-candidate-kind' }]);
  expectInvalid(manifestFor([target]), [{ ...initial(target), reason: 'wrong-initial-reason' }]);
  expectInvalid(manifestFor([target]), [{ ...initial(target), nativeCalls: 0 }]);
  for (const [field, value] of [
    ['worldEpoch', 'other'], ['fromTick', 19], ['toTick', 22], ['castId', 'other'], ['projectileId', 'other'],
  ]) {
    const candidate = structuredClone(validHit);
    candidate.identity[field] = value;
    expectInvalid(manifestFor([target]), [candidate]);
  }
  for (const mutate of [
    candidate => { candidate.evidence = 'wrong'; },
    candidate => { candidate.nativeCalls = 0; },
    candidate => { candidate.nativeCalls = 129; },
    candidate => { candidate.lowerS = -1; },
    candidate => { candidate.upperS = FIXED_DT + Number.EPSILON; },
    candidate => { candidate.lowerS = .003; candidate.upperS = .002; candidate.timeOfImpactS = .002; candidate.intervalFraction = .002 / FIXED_DT; },
    candidate => { candidate.timeOfImpactS = candidate.upperS + Number.EPSILON; },
    candidate => { candidate.intervalFraction += Number.EPSILON; },
    candidate => { candidate.bracketTravelM = -1; },
    candidate => { candidate.uncertaintyBoundM += Number.EPSILON; },
    candidate => { candidate.bracketTravelM = CONTACT_QUERY_LIMITS.maxBracketM; candidate.uncertaintyBoundM = candidate.bracketTravelM + 2 * CONTACT_QUERY_LIMITS.guardM; },
    candidate => { candidate.lowerS = Number.NaN; },
    candidate => { candidate.upperS = Number.POSITIVE_INFINITY; },
  ]) {
    const candidate = structuredClone(validHit);
    mutate(candidate);
    expectInvalid(manifestFor([target]), [candidate]);
  }

  const ordinary = inconclusive(target, .003, .002);
  assert.equal(api.resolveContactFamily(manifestFor([target]), [ordinary]).kind, 'unresolved',
    'accepted pair budget semantics allow earliestPossibleS after checkedThroughS');
  for (const candidate of [
    { ...ordinary, reason: 'unknown' },
    { ...ordinary, nativeCalls: 0 },
    { ...ordinary, earliestPossibleS: -1 },
    { ...ordinary, checkedThroughS: FIXED_DT + Number.EPSILON },
    { ...ordinary, reason: 'budget', nativeCalls: 127 },
    { ...ordinary, reason: 'budget', nativeCalls: 1 },
  ]) expectInvalid(manifestFor([target]), [candidate]);
  const budget = { ...ordinary, reason: 'budget', nativeCalls: 128 };
  assert.equal(api.resolveContactFamily(manifestFor([target]), [budget]).kind, 'unresolved');
  const preNative = { ...ordinary, reason: 'native-geometry', nativeCalls: 0 };
  assert.equal(api.resolveContactFamily(manifestFor([target]), [preNative]).kind, 'unresolved');

  for (const candidate of [
    { ...unqueried(target), evidence: CONTACT_QUERY_EVIDENCE },
    { ...unqueried(target), reason: 'budget' },
    { ...unqueried(target), nativeCalls: 1 },
    { ...unqueried(target), earliestPossibleS: Number.EPSILON },
    { ...unqueried(target), checkedThroughS: 0 },
  ]) expectInvalid(manifestFor([target]), [candidate]);

  const malformedAfterWinner = miss(ref('malformed'));
  malformedAfterWinner.nativeCalls = 0;
  expectInvalid(manifestFor([target, malformedAfterWinner.identity.target]), [validHit, malformedAfterWinner]);
});

test('rejects malformed hit geometry and strips geometry from every non-hit result', () => {
  const target = ref('geometry');
  const validHit = hit(target, .001, .002);
  const mutations = [
    candidate => { delete candidate.geometry; },
    candidate => { candidate.geometry.projectileWorld.position.x = Number.NaN; },
    candidate => { candidate.geometry.targetBodyOriginWorld.rotation.w = 0; },
    candidate => { candidate.geometry.targetColliderWorld.rotation.w = .999; },
    candidate => { candidate.geometry.projectileWorld.scale = { x: 1, y: 2, z: 1 }; },
    candidate => { candidate.geometry.projectileWitnessWorld.x = Number.POSITIVE_INFINITY; },
    candidate => { candidate.geometry.projectileNormalWorld = vector(.5); },
    candidate => { candidate.geometry.targetNormalBodyLocal = vector(0, 0, 0); },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(validHit);
    mutate(candidate);
    expectInvalid(manifestFor([target]), [candidate]);
  }

  const malicious = [
    { ...miss(ref('miss')), geometry: geometry(), hit: validHit },
    { ...initial(ref('block')), geometry: geometry(), hit: validHit },
    { ...inconclusive(ref('unknown'), .001), geometry: geometry(), hit: validHit },
    { ...unqueried(ref('pending')), geometry: geometry(), hit: validHit },
  ];
  const result = resolve(malicious);
  assert.equal(result.kind, 'blocked');
  for (const candidate of result.candidates) {
    assert.equal('geometry' in candidate, false);
    assert.equal('hit' in candidate, false);
  }
  assert.equal('hit' in result, false);
  assert.equal('geometry' in result, false);
});

function authoredEndpoint(worldEpoch, definition, position) {
  const colliderRef = { worldEpoch, bodyId: definition.bodyId, colliderId: definition.colliderId ?? 'shape' };
  return {
    bodyOriginWorld: pose(position),
    comLocal: vector(),
    comWorld: { ...position },
    comVelocityWorldMps: vector(),
    angularVelocityWorldRadps: vector(),
    authority: 'physics',
    massKg: 1,
    sleeping: false,
    colliders: [{
      ref: colliderRef,
      role: 'blocker',
      localPose: pose(vector()),
      shape: structuredClone(definition.shape),
    }],
  };
}

function completeMotionFixture(definitions, {
  worldEpoch = 'complete-family-epoch',
  fromTick = 40,
  offsets = [0, FIXED_DT],
} = {}) {
  for (const definition of definitions) assert.equal(definition.points.length, offsets.length);
  const samples = offsets.map((offsetS, index) => ({
    offsetS,
    bodies: definitions.map(definition => ({
      ref: { worldEpoch, bodyId: definition.bodyId },
      endpoint: authoredEndpoint(worldEpoch, definition, definition.points[index]),
    })),
  }));
  return createContactMotion({
    worldEpoch,
    kind: 'completed',
    fromTick,
    toTick: fromTick + 1,
    dtS: FIXED_DT,
    bodies: definitions.map((definition, index) => ({
      ref: { worldEpoch, bodyId: definition.bodyId },
      from: structuredClone(samples[0].bodies[index].endpoint),
      to: structuredClone(samples.at(-1).bodies[index].endpoint),
      discontinuities: [],
    })),
    nativeTrace: { kind: 'measured-native-boundaries', samples },
  });
}

function manifestFromMotion(motion, cast, expectedBlockers = motion.colliders().map(collider => collider.ref)) {
  return {
    identity: {
      worldEpoch: cast.worldEpoch,
      fromTick: cast.fromTick,
      toTick: cast.toTick,
      castId: cast.castId,
      projectileId: cast.projectileId,
    },
    expectedBlockers,
  };
}

function queryCompleteFamily(query, motion, cast, targetOrder = motion.colliders().map(collider => collider.ref), manifestOrder) {
  const results = targetOrder.map(target => query(motion, cast, target));
  return api.resolveContactFamily(manifestFromMotion(motion, cast, manifestOrder), results);
}

test('real Rapier complete families preserve shield, thin-wall, clear, tie and initial-block outcomes', async () => {
  const { createContactPairQuery } = await import('../src/physics/contactPairQuery.ts');
  const query = await createContactPairQuery();
  const ball = { kind: 'ball', radius: .01 };
  const movingDefinitions = [
    { bodyId: 'shield', shape: ball, points: [vector(-.45), vector(-.35)] },
    { bodyId: 'arm', shape: ball, points: [vector(0), vector(0)] },
    { bodyId: 'farther-body', shape: ball, points: [vector(.45), vector(.45)] },
  ];
  const runMoving = definitions => {
    const motion = completeMotionFixture(definitions);
    const cast = castFixture({
      worldEpoch: motion.worldEpoch,
      fromTick: motion.fromTick,
      castId: 'moving-shield-cast',
      projectileId: 'moving-shield-projectile',
      start: vector(-1),
      end: vector(1),
      shape: ball,
    });
    const refs = motion.colliders().map(collider => collider.ref);
    const result = queryCompleteFamily(query, motion, cast, refs.slice().reverse(), refs.slice().reverse());
    assert.equal(result.candidates.length, definitions.length);
    assert.ok(result.candidates.every(candidate => candidate.kind === 'hit'));
    assert.equal(result.kind, 'hit');
    assert.equal(result.hit.identity.target.bodyId, 'shield');
    return result;
  };
  const moving = runMoving(movingDefinitions);
  assert.deepEqual(runMoving(movingDefinitions.slice().reverse()), moving);

  const wallMotion = completeMotionFixture([
    { bodyId: 'thin-wall', shape: { kind: 'box', size: [.01, 1, 1] }, points: [vector(-.2), vector(-.2)] },
    { bodyId: 'arm', shape: ball, points: [vector(.25), vector(.25)] },
  ]);
  const wallCast = castFixture({
    worldEpoch: wallMotion.worldEpoch, fromTick: wallMotion.fromTick,
    castId: 'thin-wall-cast', projectileId: 'thin-wall-projectile',
    start: vector(-1), end: vector(1), shape: ball,
  });
  const wallResult = queryCompleteFamily(query, wallMotion, wallCast);
  assert.equal(wallResult.kind, 'hit');
  assert.equal(wallResult.hit.identity.target.bodyId, 'thin-wall');

  const clearMotion = completeMotionFixture(movingDefinitions.map(definition => ({
    ...definition,
    points: definition.points.map(point => ({ ...point, y: 1 })),
  })));
  const clearCast = castFixture({
    worldEpoch: clearMotion.worldEpoch, fromTick: clearMotion.fromTick,
    castId: 'clear-cast', projectileId: 'clear-projectile',
    start: vector(-1), end: vector(1), shape: ball,
  });
  const clear = queryCompleteFamily(query, clearMotion, clearCast);
  assert.equal(clear.kind, 'clear');
  assert.ok(clear.candidates.every(candidate => candidate.kind === 'miss'));

  const tiedMotion = completeMotionFixture([
    { bodyId: 'tie-b', shape: ball, points: [vector(), vector()] },
    { bodyId: 'tie-a', shape: ball, points: [vector(), vector()] },
  ]);
  const tiedCast = castFixture({
    worldEpoch: tiedMotion.worldEpoch, fromTick: tiedMotion.fromTick,
    castId: 'tie-cast', projectileId: 'tie-projectile', start: vector(-1), end: vector(1), shape: ball,
  });
  const tied = queryCompleteFamily(query, tiedMotion, tiedCast);
  assert.equal(tied.kind, 'unresolved');
  assert.deepEqual(frontierIds(tied), ['tie-a', 'tie-b']);
  assert.equal('hit' in tied, false);

  const nearWallMotion = completeMotionFixture([
    { bodyId: 'near-wall', shape: { kind: 'box', size: [.01, 1, 1] }, points: [vector(), vector()] },
    { bodyId: 'later-arm', shape: ball, points: [vector(.5), vector(.5)] },
  ]);
  const nearWallCast = castFixture({
    worldEpoch: nearWallMotion.worldEpoch, fromTick: nearWallMotion.fromTick,
    castId: 'near-wall-cast', projectileId: 'near-wall-projectile',
    start: vector(-.015), end: vector(1), shape: ball,
  });
  const nearWall = queryCompleteFamily(query, nearWallMotion, nearWallCast);
  assert.equal(nearWall.kind, 'blocked');
  assert.equal(nearWall.earliestPossibleS, 0);
  assert.equal('hit' in nearWall, false);
});

test('real earlier uncertainty prevents selecting a later native pair hit under every ordering', async context => {
  const { createContactPairQuery } = await import('../src/physics/contactPairQuery.ts');
  const query = await createContactPairQuery();
  const ball = { kind: 'ball', radius: .01 };
  const definitions = [
    {
      bodyId: 'earlier-uncertain', shape: ball,
      points: [vector(-.005, .01998), vector(.005, .01998), vector()],
    },
    {
      bodyId: 'later-hit', shape: ball,
      points: [vector(1), vector(.5), vector()],
    },
  ];
  let retained;
  let diagnostic;
  for (const sourceOrder of [definitions, definitions.slice().reverse()]) {
    const motion = completeMotionFixture(sourceOrder, { offsets: [0, FIXED_DT / 2, FIXED_DT] });
    const cast = castFixture({
      worldEpoch: motion.worldEpoch, fromTick: motion.fromTick,
      castId: 'earlier-uncertain-cast', projectileId: 'stationary-projectile',
      start: vector(), end: vector(), shape: ball,
    });
    const refs = motion.colliders().map(collider => collider.ref);
    const pairs = refs.map(target => query(motion, cast, target));
    const earlier = pairs.find(candidate => candidate.identity.target.bodyId === 'earlier-uncertain');
    const later = pairs.find(candidate => candidate.identity.target.bodyId === 'later-hit');
    assert.equal(earlier.kind, 'inconclusive');
    assert.equal(earlier.reason, 'width');
    assert.equal(later.kind, 'hit');
    assert.ok(earlier.earliestPossibleS < later.lowerS);
    diagnostic ??= { earlier: earlier.earliestPossibleS, lower: later.lowerS, upper: later.upperS };
    for (const manifestOrder of [refs, refs.slice().reverse()]) {
      for (const resultOrder of [pairs, pairs.slice().reverse()]) {
        const result = api.resolveContactFamily(manifestFromMotion(motion, cast, manifestOrder), resultOrder);
        assert.equal(result.kind, 'unresolved');
        assert.deepEqual(frontierIds(result), ['earlier-uncertain', 'later-hit']);
        assert.equal('hit' in result, false);
        assert.equal('geometry' in result, false);
        assert.equal('geometry' in result.candidates.find(candidate => candidate.identity.target.bodyId === 'earlier-uncertain'), false);
        const diagnosticHit = result.candidates.find(candidate => candidate.identity.target.bodyId === 'later-hit');
        assert.equal(diagnosticHit.kind, 'hit');
        assert.equal('geometry' in diagnosticHit, true);
        retained ??= result;
        assert.deepEqual(result, retained);
      }
    }
  }
  context.diagnostic(`earlier earliest=${diagnostic.earlier}s; later=[${diagnostic.lower},${diagnostic.upper}]s`);
});

test('complete physical arm family blocks at the upper arm and resolves a real clear-muzzle forearm path', async context => {
  const { createContactPairQuery } = await import('../src/physics/contactPairQuery.ts');
  const query = await createContactPairQuery();
  const arm = await createArmFixture();
  let motion, refs, horizontalCast, zCast, horizontalPairs, zPairs, blocked, clearMuzzle, before;
  try {
    arm.setActive(true);
    assert.equal(arm.step(), true);
    const animated = arm.snapshot();
    assert.equal(arm.queueHandoff({ worldEpoch: animated.worldEpoch, atTick: animated.tick, impulse: null }), true);
    assert.equal(arm.step(), true);
    arm.setActive(false);
    before = arm.snapshot();
    const counts = arm.counts();
    assert.equal(before.interval.nativeTrace.samples.length, 9);
    motion = createContactMotion(before.interval);
    refs = motion.colliders().map(collider => collider.ref);
    assert.equal(refs.length, 4);
    const forearm = refs.find(target => target.bodyId === 'forearm');
    assert.ok(forearm);
    const center = motion.sample(forearm, FIXED_DT / 2).colliderWorld.position;
    const common = {
      worldEpoch: motion.worldEpoch,
      fromTick: motion.fromTick,
      shape: { kind: 'box', size: [.12, .01, .12] },
    };
    horizontalCast = castFixture({
      ...common, castId: 'complete-arm-horizontal', projectileId: 'arm-horizontal-blade',
      start: vector(center.x - .5, center.y, center.z), end: vector(center.x + .5, center.y, center.z),
    });
    zCast = castFixture({
      ...common, castId: 'complete-arm-z', projectileId: 'arm-z-blade',
      start: vector(center.x, center.y, center.z - .5), end: vector(center.x, center.y, center.z + .5),
    });
    horizontalPairs = refs.map(target => query(motion, horizontalCast, target));
    zPairs = refs.map(target => query(motion, zCast, target));
    blocked = api.resolveContactFamily(manifestFromMotion(motion, horizontalCast), horizontalPairs);
    assert.equal(horizontalPairs.find(candidate => candidate.identity.target.bodyId === 'upper-arm').kind, 'initial-blocked');
    assert.equal(horizontalPairs.find(candidate => candidate.identity.target.bodyId === 'forearm').kind, 'hit');
    assert.equal(blocked.kind, 'blocked');
    assert.equal(blocked.earliestPossibleS, 0);
    assert.equal('hit' in blocked, false);
    assert.equal(blocked.candidates.find(candidate => candidate.identity.target.bodyId === 'forearm').kind, 'hit');

    clearMuzzle = api.resolveContactFamily(manifestFromMotion(motion, zCast), zPairs);
    assert.notEqual(zPairs.find(candidate => candidate.identity.target.bodyId === 'upper-arm').kind, 'initial-blocked');
    assert.equal(clearMuzzle.kind, 'hit');
    assert.equal(clearMuzzle.hit.identity.target.bodyId, 'forearm');
    assert.deepEqual(arm.snapshot(), before);
    assert.deepEqual(arm.counts(), counts);
  } finally {
    arm.destroy();
  }
  assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
  const blockedAfterDestroy = api.resolveContactFamily(manifestFromMotion(motion, horizontalCast),
    refs.map(target => query(motion, horizontalCast, target)));
  const zAfterDestroy = api.resolveContactFamily(manifestFromMotion(motion, zCast),
    refs.map(target => query(motion, zCast, target)));
  assert.deepEqual(refs.map(target => query(motion, horizontalCast, target)), horizontalPairs);
  assert.deepEqual(refs.map(target => query(motion, zCast, target)), zPairs);
  assert.deepEqual(blockedAfterDestroy, blocked);
  assert.deepEqual(zAfterDestroy, clearMuzzle);
  context.diagnostic(`horizontal=${horizontalPairs.map(candidate => `${candidate.identity.target.bodyId}:${candidate.kind}`).join(',')}; z=${zPairs.map(candidate => `${candidate.identity.target.bodyId}:${candidate.kind}`).join(',')}`);
});

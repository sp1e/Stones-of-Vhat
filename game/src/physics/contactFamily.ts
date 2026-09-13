import type { ColliderRef } from './bodyMotion.ts';
import { CONTACT_MOTION_LIMITS } from './contactMotion.ts';
import {
  CONTACT_QUERY_EVIDENCE,
  CONTACT_QUERY_LIMITS,
  type ContactPairGeometry,
  type ContactPairResult,
} from './contactPairQuery.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';

type PairIdentity = ContactPairResult['identity'];
export type ContactFamilyIdentity = Omit<PairIdentity, 'target'>;
export type ContactFamilyManifest = {
  identity: ContactFamilyIdentity;
  expectedBlockers: readonly ColliderRef[];
};
export type UnqueriedContact = {
  identity: PairIdentity;
  kind: 'unqueried';
  evidence: 'not-queried-family-budget';
  reason: 'family-budget';
  earliestPossibleS: 0;
  nativeCalls: 0;
};
export type ContactCandidateResult = ContactPairResult | UnqueriedContact;
export type ContactFamilyResult = {
  identity: ContactFamilyIdentity;
  evidence: 'declared-candidate-family';
  nativeCalls: number;
  queriedCount: number;
  unqueriedCount: number;
  candidates: ContactCandidateResult[];
  frontier: ColliderRef[];
} & (
  | { kind: 'clear' }
  | { kind: 'hit'; hit: Extract<ContactPairResult, { kind: 'hit' }> }
  | { kind: 'blocked'; earliestPossibleS: 0 }
  | { kind: 'unresolved'; earliestPossibleS: number }
);

type Data = Record<string, unknown>;
type Hit = Extract<ContactPairResult, { kind: 'hit' }>;

function data(value: unknown, label: string): Data {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a data object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must be a plain data object`);
  }
  return value as Data;
}

function denseArray(value: unknown, label: string, maximum: number, exactLength?: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a dense array`);
  if (value.length > maximum) throw new Error(`${label} exceeds the ${maximum} record limit`);
  if (exactLength !== undefined && value.length !== exactLength) {
    throw new Error(`${label} length must exactly match expected family membership`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) throw new Error(`${label} must not contain sparse entries`);
  }
  return value;
}

function nonempty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty`);
  return value;
}

function tick(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a safe nonnegative integer`);
  }
  return value as number;
}

function identity(value: unknown, label: string): ContactFamilyIdentity {
  const raw = data(value, label);
  const fromTick = tick(raw.fromTick, `${label}.fromTick`);
  const toTick = tick(raw.toTick, `${label}.toTick`);
  if (toTick !== fromTick + 1) throw new Error(`${label} ticks must be adjacent`);
  return {
    worldEpoch: nonempty(raw.worldEpoch, `${label}.worldEpoch`),
    fromTick,
    toTick,
    castId: nonempty(raw.castId, `${label}.castId`),
    projectileId: nonempty(raw.projectileId, `${label}.projectileId`),
  };
}

function colliderRef(value: unknown, label: string): ColliderRef {
  const raw = data(value, label);
  return {
    worldEpoch: nonempty(raw.worldEpoch, `${label}.worldEpoch`),
    bodyId: nonempty(raw.bodyId, `${label}.bodyId`),
    colliderId: nonempty(raw.colliderId, `${label}.colliderId`),
  };
}

function sameIdentity(a: ContactFamilyIdentity, b: ContactFamilyIdentity): boolean {
  return a.worldEpoch === b.worldEpoch
    && a.fromTick === b.fromTick
    && a.toTick === b.toTick
    && a.castId === b.castId
    && a.projectileId === b.projectileId;
}

function refKey(value: ColliderRef): string {
  return JSON.stringify([value.bodyId, value.colliderId]);
}

function compareRef(a: ColliderRef, b: ColliderRef): number {
  return a.bodyId < b.bodyId ? -1 : a.bodyId > b.bodyId ? 1
    : a.colliderId < b.colliderId ? -1 : a.colliderId > b.colliderId ? 1 : 0;
}

function nativeScalar(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new Error(`${label} must be finite and float32 representable`);
  }
  return value;
}

function intervalTime(value: unknown, label: string): number {
  const result = nativeScalar(value, label);
  if (result < 0 || result > FIXED_DT) throw new Error(`${label} must be within the fixed interval`);
  return result;
}

function vector(value: unknown, label: string): { x: number; y: number; z: number } {
  const raw = data(value, label);
  return {
    x: nativeScalar(raw.x, `${label}.x`),
    y: nativeScalar(raw.y, `${label}.y`),
    z: nativeScalar(raw.z, `${label}.z`),
  };
}

function unitVector(value: unknown, label: string): { x: number; y: number; z: number } {
  const result = vector(value, label);
  if (Math.abs(Math.hypot(result.x, result.y, result.z) - 1) > 1e-4) {
    throw new Error(`${label} must be unit length`);
  }
  return result;
}

function pose(value: unknown, label: string): ContactPairGeometry['projectileWorld'] {
  const raw = data(value, label);
  const position = vector(raw.position, `${label}.position`);
  const rotationRaw = data(raw.rotation, `${label}.rotation`);
  const rotation = {
    x: nativeScalar(rotationRaw.x, `${label}.rotation.x`),
    y: nativeScalar(rotationRaw.y, `${label}.rotation.y`),
    z: nativeScalar(rotationRaw.z, `${label}.rotation.z`),
    w: nativeScalar(rotationRaw.w, `${label}.rotation.w`),
  };
  if (Math.abs(Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w) - 1) > 1e-6) {
    throw new Error(`${label} quaternion must be nonzero and unit length`);
  }
  if (raw.scale !== undefined) {
    const scale = vector(raw.scale, `${label}.scale`);
    if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
      throw new Error(`${label} must not have nonunit scale`);
    }
    return { position, rotation, scale };
  }
  return { position, rotation };
}

function geometry(value: unknown): ContactPairGeometry {
  const raw = data(value, 'Hit geometry');
  return {
    projectileWorld: pose(raw.projectileWorld, 'Hit geometry.projectileWorld'),
    targetBodyOriginWorld: pose(raw.targetBodyOriginWorld, 'Hit geometry.targetBodyOriginWorld'),
    targetColliderWorld: pose(raw.targetColliderWorld, 'Hit geometry.targetColliderWorld'),
    projectileWitnessWorld: vector(raw.projectileWitnessWorld, 'Hit geometry.projectileWitnessWorld'),
    targetWitnessWorld: vector(raw.targetWitnessWorld, 'Hit geometry.targetWitnessWorld'),
    projectileWitnessLocal: vector(raw.projectileWitnessLocal, 'Hit geometry.projectileWitnessLocal'),
    targetWitnessColliderLocal: vector(raw.targetWitnessColliderLocal, 'Hit geometry.targetWitnessColliderLocal'),
    targetWitnessBodyLocal: vector(raw.targetWitnessBodyLocal, 'Hit geometry.targetWitnessBodyLocal'),
    projectileNormalWorld: unitVector(raw.projectileNormalWorld, 'Hit geometry.projectileNormalWorld'),
    targetNormalWorld: unitVector(raw.targetNormalWorld, 'Hit geometry.targetNormalWorld'),
    targetNormalColliderLocal: unitVector(raw.targetNormalColliderLocal, 'Hit geometry.targetNormalColliderLocal'),
    targetNormalBodyLocal: unitVector(raw.targetNormalBodyLocal, 'Hit geometry.targetNormalBodyLocal'),
  };
}

function pairIdentity(value: unknown, expected: ContactFamilyIdentity): PairIdentity {
  const raw = data(value, 'Candidate identity');
  const candidateIdentity = identity(raw, 'Candidate identity');
  if (!sameIdentity(candidateIdentity, expected)) throw new Error('Candidate identity must match the family identity');
  const target = colliderRef(raw.target, 'Candidate target');
  if (target.worldEpoch !== expected.worldEpoch) throw new Error('Candidate target must match the family world epoch');
  return { ...candidateIdentity, target };
}

function nativeCalls(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > CONTACT_QUERY_LIMITS.maxNativeCalls) {
    throw new Error('Candidate nativeCalls must be an integer within the pair-query limit');
  }
  return value as number;
}

function rebuildCandidate(value: unknown, expected: ContactFamilyIdentity): ContactCandidateResult {
  const raw = data(value, 'Contact candidate');
  const candidateIdentity = pairIdentity(raw.identity, expected);
  const calls = nativeCalls(raw.nativeCalls);
  if (raw.kind === 'unqueried') {
    if (raw.evidence !== 'not-queried-family-budget' || raw.reason !== 'family-budget'
      || raw.earliestPossibleS !== 0 || calls !== 0 || Object.hasOwn(raw, 'checkedThroughS')) {
      throw new Error('Unqueried family-budget evidence is invalid');
    }
    return {
      identity: candidateIdentity,
      kind: 'unqueried',
      evidence: 'not-queried-family-budget',
      reason: 'family-budget',
      earliestPossibleS: 0,
      nativeCalls: 0,
    };
  }
  if (raw.evidence !== CONTACT_QUERY_EVIDENCE) throw new Error('Candidate pair evidence is invalid');
  if (raw.kind === 'miss') {
    if (calls < 1) throw new Error('A pair miss requires at least one native call');
    return { identity: candidateIdentity, evidence: CONTACT_QUERY_EVIDENCE, nativeCalls: calls, kind: 'miss' };
  }
  if (raw.kind === 'initial-blocked') {
    if (calls < 1 || raw.earliestPossibleS !== 0 || raw.reason !== 'overlap-or-within-guard') {
      throw new Error('Initial-blocked pair evidence is invalid');
    }
    return {
      identity: candidateIdentity,
      evidence: CONTACT_QUERY_EVIDENCE,
      nativeCalls: calls,
      kind: 'initial-blocked',
      earliestPossibleS: 0,
      reason: 'overlap-or-within-guard',
    };
  }
  if (raw.kind === 'hit') {
    if (calls < 1) throw new Error('A pair hit requires at least one native call');
    const lowerS = intervalTime(raw.lowerS, 'Hit lowerS');
    const upperS = intervalTime(raw.upperS, 'Hit upperS');
    const timeOfImpactS = intervalTime(raw.timeOfImpactS, 'Hit timeOfImpactS');
    const intervalFraction = nativeScalar(raw.intervalFraction, 'Hit intervalFraction');
    const bracketTravelM = nativeScalar(raw.bracketTravelM, 'Hit bracketTravelM');
    const uncertaintyBoundM = nativeScalar(raw.uncertaintyBoundM, 'Hit uncertaintyBoundM');
    if (lowerS > upperS || upperS !== timeOfImpactS || intervalFraction !== upperS / FIXED_DT
      || bracketTravelM < 0
      || uncertaintyBoundM !== bracketTravelM + 2 * CONTACT_QUERY_LIMITS.guardM
      || uncertaintyBoundM > CONTACT_QUERY_LIMITS.maxBracketM) {
      throw new Error('Hit bracket evidence is invalid');
    }
    return {
      identity: candidateIdentity,
      evidence: CONTACT_QUERY_EVIDENCE,
      nativeCalls: calls,
      kind: 'hit',
      lowerS,
      upperS,
      timeOfImpactS,
      intervalFraction,
      bracketTravelM,
      uncertaintyBoundM,
      geometry: geometry(raw.geometry),
    };
  }
  if (raw.kind === 'inconclusive') {
    const reasons = ['budget', 'graze', 'native-geometry', 'unbracketed', 'width', 'stall'] as const;
    if (!reasons.some(reason => reason === raw.reason)) throw new Error('Inconclusive pair reason is invalid');
    const reason = raw.reason as (typeof reasons)[number];
    if (reason === 'budget' ? calls !== CONTACT_QUERY_LIMITS.maxNativeCalls
      : reason !== 'native-geometry' ? calls < 1 : false) {
      throw new Error('Inconclusive pair nativeCalls are invalid for its reason');
    }
    return {
      identity: candidateIdentity,
      evidence: CONTACT_QUERY_EVIDENCE,
      nativeCalls: calls,
      kind: 'inconclusive',
      earliestPossibleS: intervalTime(raw.earliestPossibleS, 'Inconclusive earliestPossibleS'),
      checkedThroughS: intervalTime(raw.checkedThroughS, 'Inconclusive checkedThroughS'),
      reason,
    };
  }
  throw new Error('Unsupported contact candidate kind');
}

function copyHit(value: Hit): Hit {
  return {
    ...value,
    identity: { ...value.identity, target: { ...value.identity.target } },
    geometry: geometry(value.geometry),
  };
}

export function resolveContactFamily(
  manifest: ContactFamilyManifest,
  candidates: readonly ContactCandidateResult[],
): ContactFamilyResult {
  const rawManifest = data(manifest, 'Contact family manifest');
  const familyIdentity = identity(rawManifest.identity, 'Contact family identity');
  const rawExpected = denseArray(
    rawManifest.expectedBlockers,
    'Expected blocker list',
    CONTACT_MOTION_LIMITS.maxColliders,
  );
  const expected = rawExpected.map((value, index) => colliderRef(value, `Expected blocker ${index}`));
  const expectedKeys = new Set<string>();
  for (const blocker of expected) {
    if (blocker.worldEpoch !== familyIdentity.worldEpoch) throw new Error('Expected blocker world epoch must match the family');
    const key = refKey(blocker);
    if (expectedKeys.has(key)) throw new Error('Duplicate expected blocker reference');
    expectedKeys.add(key);
  }
  const rawCandidates = denseArray(
    candidates,
    'Contact candidate list',
    CONTACT_MOTION_LIMITS.maxColliders,
    expected.length,
  );
  const copied = rawCandidates.map(candidate => rebuildCandidate(candidate, familyIdentity));
  const candidateKeys = new Set<string>();
  for (const candidate of copied) {
    const key = refKey(candidate.identity.target);
    if (candidateKeys.has(key)) throw new Error('Duplicate contact candidate result');
    if (!expectedKeys.has(key)) throw new Error('Unknown or surplus contact candidate result');
    candidateKeys.add(key);
  }
  if (candidateKeys.size !== expectedKeys.size) throw new Error('Contact family has a missing candidate result');
  copied.sort((a, b) => compareRef(a.identity.target, b.identity.target));
  const nonMisses = copied.filter(candidate => candidate.kind !== 'miss');
  const confirmed = nonMisses.flatMap(candidate => (
    candidate.kind === 'hit' ? [candidate.upperS]
      : candidate.kind === 'initial-blocked' ? [0] : []
  ));
  const upper = confirmed.length ? Math.min(...confirmed) : undefined;
  const earliest = (candidate: ContactCandidateResult): number => (
    candidate.kind === 'hit' ? candidate.lowerS
      : candidate.kind === 'initial-blocked' || candidate.kind === 'unqueried' ? 0
        : candidate.kind === 'inconclusive' ? candidate.earliestPossibleS : Number.POSITIVE_INFINITY
  );
  const frontierCandidates = nonMisses.filter(candidate => upper === undefined || earliest(candidate) <= upper);
  const baseResult = {
    identity: familyIdentity,
    evidence: 'declared-candidate-family' as const,
    nativeCalls: copied.reduce((sum, candidate) => sum + candidate.nativeCalls, 0),
    queriedCount: copied.filter(candidate => candidate.kind !== 'unqueried').length,
    unqueriedCount: copied.filter(candidate => candidate.kind === 'unqueried').length,
    candidates: copied,
    frontier: frontierCandidates.map(candidate => ({ ...candidate.identity.target })).sort(compareRef),
  };
  if (!nonMisses.length) return { ...baseResult, kind: 'clear' };
  if (copied.some(candidate => candidate.kind === 'initial-blocked')) {
    return { ...baseResult, kind: 'blocked', earliestPossibleS: 0 };
  }
  const onlyFrontier = frontierCandidates.length === 1 ? frontierCandidates[0] : undefined;
  if (onlyFrontier?.kind === 'hit') {
    return { ...baseResult, kind: 'hit', hit: copyHit(onlyFrontier) };
  }
  return {
    ...baseResult,
    kind: 'unresolved',
    earliestPossibleS: Math.min(...frontierCandidates.map(earliest)),
  };
}

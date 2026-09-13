import type { ArmFixture, ArmSnapshot } from './armFixture.ts';
import type { ColliderRef } from './bodyMotion.ts';
import { createContactMotion } from './contactMotion.ts';
import type { ContactShape } from './contactMotion.ts';
import {
  CONTACT_QUERY_LIMITS,
  createContactPairQuery,
  validateLinearContactCast,
  type LinearContactCast,
} from './contactPairQuery.ts';
import {
  resolveContactFamily,
  type ContactCandidateResult,
  type ContactFamilyManifest,
  type ContactFamilyResult,
} from './contactFamily.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';

export const ARM_CONTACT_LIMITS = Object.freeze({ maxNativeCalls: 512, maxCasts: 8 });

export type ArmContactBatchResult = {
  worldEpoch: string;
  fromTick: number;
  toTick: number;
  nativeCalls: number;
  remainingNativeCalls: number;
  snapshot: ArmSnapshot;
  families: ContactFamilyResult[];
};

type StoredCollider = {
  ref: ColliderRef;
  role: 'blocker';
  shape: ContactShape;
  localPose: RigidTransform;
  radiusFromBodyOriginM: number;
};

const OWNER_BODY_IDS = ['floor', 'forearm', 'upper-arm', 'wall'] as const;
const compareCodeUnits = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const compareRef = (a: ColliderRef, b: ColliderRef): number => (
  compareCodeUnits(a.bodyId, b.bodyId) || compareCodeUnits(a.colliderId, b.colliderId)
);

function denseArray(value: unknown, label: string, maximum?: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a dense array`);
  if (maximum !== undefined && value.length > maximum) throw new Error(`${label} exceeds the ${maximum} record limit`);
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index)) throw new Error(`${label} must be a dense array`);
  }
  return value;
}

function nonempty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty`);
  return value;
}

function nativeScalar(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new Error(`${label} must be finite and float32 representable`);
  }
  return value;
}

function localPose(value: unknown, label: string): RigidTransform {
  if (!value || typeof value !== 'object') throw new Error(`${label} must be a rigid pose`);
  const input = value as RigidTransform;
  nativeScalar(input.position?.x, `${label}.position.x`);
  nativeScalar(input.position?.y, `${label}.position.y`);
  nativeScalar(input.position?.z, `${label}.position.z`);
  nativeScalar(input.rotation?.x, `${label}.rotation.x`);
  nativeScalar(input.rotation?.y, `${label}.rotation.y`);
  nativeScalar(input.rotation?.z, `${label}.rotation.z`);
  nativeScalar(input.rotation?.w, `${label}.rotation.w`);
  if (input.scale) {
    nativeScalar(input.scale.x, `${label}.scale.x`);
    nativeScalar(input.scale.y, `${label}.scale.y`);
    nativeScalar(input.scale.z, `${label}.scale.z`);
  }
  return rigid(input);
}

function contactShape(value: unknown, label: string): { shape: ContactShape; radiusM: number } {
  if (!dimensionalGeometry(value)) throw new Error(`${label} has invalid geometry`);
  if (value.kind === 'box') {
    const size = denseArray(value.size, `${label} box size`, 3);
    if (size.length !== 3) throw new Error(`${label} box must have three dimensions`);
    const checked = size.map((item, index) => nativeScalar(item, `${label}.size[${index}]`));
    if (checked.some(item => item < .001 || Math.fround(item) === 0)) {
      throw new Error(`${label} box dimensions must be at least 0.001m`);
    }
    return {
      shape: { kind: 'box', size: checked as [number, number, number] },
      radiusM: Math.hypot(checked[0]! / 2, checked[1]! / 2, checked[2]! / 2),
    };
  }
  if (value.kind === 'ball') {
    const radius = nativeScalar(value.radius, `${label}.radius`);
    if (radius * 2 < .001 || Math.fround(radius) === 0) {
      throw new Error(`${label} ball diameter must be at least 0.001m`);
    }
    return { shape: { kind: 'ball', radius }, radiusM: radius };
  }
  throw new Error(`${label} has unsupported blocker geometry`);
}

function dimensionalGeometry(value: unknown): value is { kind: string; size?: unknown; radius?: unknown } {
  return !!value && typeof value === 'object' && 'kind' in value;
}

function sameShape(a: ContactShape, b: ContactShape): boolean {
  return a.kind === b.kind && (a.kind === 'ball' && b.kind === 'ball'
    ? a.radius === b.radius
    : a.kind === 'box' && b.kind === 'box'
      && a.size.length === b.size.length && a.size.every((value, index) => value === b.size[index]));
}

function quaternionChord(a: RigidTransform['rotation'], b: RigidTransform['rotation']): number {
  return Math.min(
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w),
    Math.hypot(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w),
  );
}

function sameLocalPose(a: RigidTransform, b: RigidTransform): boolean {
  return a.position.x === b.position.x && a.position.y === b.position.y && a.position.z === b.position.z
    && quaternionChord(a.rotation, b.rotation) <= 2e-7;
}

function topologyCollider(
  value: unknown,
  worldEpoch: string,
  bodyId: string,
  label: string,
): StoredCollider {
  if (!value || typeof value !== 'object') throw new Error(`${label} collider is invalid`);
  const raw = value as Record<string, unknown>;
  const ref = raw.ref as Record<string, unknown> | undefined;
  if (!ref || ref.worldEpoch !== worldEpoch || ref.bodyId !== bodyId || ref.colliderId !== 'shape') {
    throw new Error(`${label} collider reference must match the retained owner roster`);
  }
  if (raw.role !== 'blocker') throw new Error(`${label} collider must retain blocker role`);
  const checkedShape = contactShape(raw.shape, `${label} collider`);
  const checkedPose = localPose(raw.localPose, `${label} collider local pose`);
  return {
    ref: { worldEpoch, bodyId, colliderId: 'shape' },
    role: 'blocker',
    shape: checkedShape.shape,
    localPose: checkedPose,
    radiusFromBodyOriginM: Math.hypot(
      checkedPose.position.x,
      checkedPose.position.y,
      checkedPose.position.z,
    ) + checkedShape.radiusM,
  };
}

function sameTopology(actual: StoredCollider, expected: StoredCollider): boolean {
  return actual.ref.worldEpoch === expected.ref.worldEpoch
    && actual.ref.bodyId === expected.ref.bodyId
    && actual.ref.colliderId === expected.ref.colliderId
    && actual.role === expected.role
    && sameShape(actual.shape, expected.shape)
    && sameLocalPose(actual.localPose, expected.localPose)
    && actual.radiusFromBodyOriginM === expected.radiusFromBodyOriginM;
}

function snapshotTopology(snapshot: ArmSnapshot, expected?: readonly StoredCollider[]): {
  snapshot: ArmSnapshot;
  roster: StoredCollider[];
} {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Arm snapshot is invalid');
  const worldEpoch = nonempty(snapshot.worldEpoch, 'Arm snapshot world epoch');
  if (!Number.isSafeInteger(snapshot.tick) || snapshot.tick < 0) throw new Error('Arm snapshot tick is invalid');
  if (!snapshot.counts || snapshot.counts.bodies !== 4 || snapshot.counts.colliders !== 4 || snapshot.counts.joints !== 1) {
    throw new Error('Arm contact batch requires the complete 4-body, 4-collider, 1-joint owner');
  }
  const interval = snapshot.interval;
  if (!interval || interval.worldEpoch !== worldEpoch) throw new Error('Arm interval epoch must match its snapshot');
  if (interval.kind === 'initial') {
    if (snapshot.tick !== 0 || interval.fromTick !== 0 || interval.toTick !== 0 || interval.dtS !== 0) {
      throw new Error('Arm initial interval must be the tick-0 boundary');
    }
  } else if (interval.kind === 'completed') {
    if (!Number.isSafeInteger(interval.fromTick) || interval.fromTick < 0
      || interval.toTick !== interval.fromTick + 1 || snapshot.tick !== interval.toTick || interval.dtS !== FIXED_DT) {
      throw new Error('Arm completed interval must match its adjacent fixed tick');
    }
  } else {
    throw new Error('Arm interval kind is invalid');
  }
  const bodies = denseArray(interval.bodies, 'Arm interval body roster', OWNER_BODY_IDS.length);
  if (bodies.length !== OWNER_BODY_IDS.length) throw new Error('Arm contact batch requires the complete named body roster');
  const byId = new Map<string, unknown>();
  for (const value of bodies) {
    if (!value || typeof value !== 'object') throw new Error('Arm interval body record is invalid');
    const raw = value as Record<string, unknown>;
    const ref = raw.ref as Record<string, unknown> | undefined;
    const bodyId = nonempty(ref?.bodyId, 'Arm interval body id');
    if (ref?.worldEpoch !== worldEpoch || byId.has(bodyId)) throw new Error('Arm body reference is stale or duplicated');
    byId.set(bodyId, value);
  }
  if (OWNER_BODY_IDS.some(bodyId => !byId.has(bodyId))) {
    throw new Error('Arm contact batch requires floor, forearm, upper-arm, and wall');
  }
  const roster: StoredCollider[] = [];
  for (const bodyId of OWNER_BODY_IDS) {
    const raw = byId.get(bodyId) as Record<string, unknown>;
    const from = raw.from as Record<string, unknown> | undefined;
    const to = raw.to as Record<string, unknown> | undefined;
    if (!from || !to) throw new Error(`Arm body ${bodyId} endpoints are invalid`);
    const fromColliders = denseArray(from.colliders, `Arm body ${bodyId} from colliders`, 1);
    const toColliders = denseArray(to.colliders, `Arm body ${bodyId} to colliders`, 1);
    if (fromColliders.length !== 1 || toColliders.length !== 1) {
      throw new Error(`Arm body ${bodyId} must retain exactly one collider`);
    }
    const fromTopology = topologyCollider(fromColliders[0], worldEpoch, bodyId, `Arm body ${bodyId} from`);
    const toTopology = topologyCollider(toColliders[0], worldEpoch, bodyId, `Arm body ${bodyId} to`);
    if (!sameTopology(fromTopology, toTopology)) throw new Error(`Arm body ${bodyId} topology changed across the interval`);
    const retained = expected?.find(item => item.ref.bodyId === bodyId && item.ref.colliderId === 'shape');
    if (retained && !sameTopology(toTopology, retained)) throw new Error(`Arm body ${bodyId} topology changed after capture`);
    roster.push(toTopology);
  }
  if (expected && (expected.length !== roster.length || roster.some(item => !expected.some(other => sameTopology(item, other))))) {
    throw new Error('Arm owner topology no longer matches the retained complete roster');
  }
  return { snapshot: structuredClone(snapshot), roster: roster.sort((a, b) => compareRef(a.ref, b.ref)) };
}

function verifyCompiledRoster(
  compiled: ReturnType<typeof createContactMotion>,
  expected: readonly StoredCollider[],
): void {
  const actual = compiled.colliders();
  if (actual.length !== expected.length) throw new Error('Compiled contact roster is incomplete');
  for (const retained of expected) {
    const collider = actual.find(item => item.ref.bodyId === retained.ref.bodyId
      && item.ref.colliderId === retained.ref.colliderId);
    if (!collider || collider.ref.worldEpoch !== retained.ref.worldEpoch
      || !sameShape(collider.shape, retained.shape)
      || !sameLocalPose(collider.localPose, retained.localPose)
      || collider.radiusFromBodyOriginM !== retained.radiusFromBodyOriginM) {
      throw new Error('Compiled contact roster does not match the retained owner topology');
    }
  }
}

export async function createArmContactBatch(
  arm: ArmFixture,
  options: { maxNativeCalls?: number } = {},
): Promise<{
  queryTick(casts: readonly LinearContactCast[]): ArmContactBatchResult;
  destroy(): void;
}> {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Arm contact batch options must contain an optional native-call allowance');
  }
  const allowance = options.maxNativeCalls === undefined
    ? ARM_CONTACT_LIMITS.maxNativeCalls
    : options.maxNativeCalls;
  if (!Number.isSafeInteger(allowance) || allowance < 0 || allowance > ARM_CONTACT_LIMITS.maxNativeCalls) {
    throw new Error('Arm contact native-call allowance must be a safe integer from 0 through 512');
  }
  const pairQuery = await createContactPairQuery();
  const captured = snapshotTopology(arm.snapshot());
  let roster: StoredCollider[] = captured.roster;
  const worldEpoch = captured.snapshot.worldEpoch;
  let lastConsumedTick = -1;
  let closed = false;

  return {
    queryTick(inputCasts: readonly LinearContactCast[]): ArmContactBatchResult {
      if (closed) throw new Error('Arm contact batch is destroyed or closed');
      const current = snapshotTopology(arm.snapshot(), roster);
      const snapshot = current.snapshot;
      if (snapshot.worldEpoch !== worldEpoch) throw new Error('Arm contact batch cannot switch owner epoch');
      if (snapshot.interval.kind !== 'completed') throw new Error('Arm contact batch requires a completed interval');
      const casts = denseArray(inputCasts, 'Arm contact cast list', ARM_CONTACT_LIMITS.maxCasts);
      const detached = casts.map(cast => validateLinearContactCast({
        worldEpoch,
        fromTick: snapshot.interval.fromTick,
        toTick: snapshot.interval.toTick,
        dtS: snapshot.interval.dtS,
      }, cast as LinearContactCast));
      const identities = new Set<string>();
      for (const cast of detached) {
        const key = JSON.stringify([cast.castId, cast.projectileId]);
        if (identities.has(key)) throw new Error('Duplicate cast and projectile identity tuple');
        identities.add(key);
      }
      detached.sort((a, b) => compareCodeUnits(a.castId, b.castId)
        || compareCodeUnits(a.projectileId, b.projectileId));
      if (snapshot.interval.toTick <= lastConsumedTick) throw new Error('Arm contact interval was already consumed');
      const motion = createContactMotion(snapshot.interval);
      verifyCompiledRoster(motion, roster);
      const blockers = motion.colliders().map(collider => ({ ...collider.ref })).sort(compareRef);
      const manifests: ContactFamilyManifest[] = detached.map(cast => ({
        identity: {
          worldEpoch: cast.worldEpoch,
          fromTick: cast.fromTick,
          toTick: cast.toTick,
          castId: cast.castId,
          projectileId: cast.projectileId,
        },
        expectedBlockers: blockers.map(blocker => ({ ...blocker })),
      }));
      lastConsumedTick = snapshot.interval.toTick;
      try {
        let remainingNativeCalls = allowance;
        const families: ContactFamilyResult[] = [];
        for (let castIndex = 0; castIndex < detached.length; castIndex++) {
          const cast = detached[castIndex]!;
          const candidates: ContactCandidateResult[] = [];
          for (const target of blockers) {
            if (remainingNativeCalls >= CONTACT_QUERY_LIMITS.maxNativeCalls) {
              remainingNativeCalls -= CONTACT_QUERY_LIMITS.maxNativeCalls;
              const candidate = pairQuery(motion, cast, target);
              if (!Number.isInteger(candidate.nativeCalls) || candidate.nativeCalls < 0
                || candidate.nativeCalls > CONTACT_QUERY_LIMITS.maxNativeCalls) {
                throw new Error('Pair query returned an invalid native-call count');
              }
              remainingNativeCalls += CONTACT_QUERY_LIMITS.maxNativeCalls - candidate.nativeCalls;
              candidates.push(candidate);
            } else {
              candidates.push({
                identity: {
                  worldEpoch: cast.worldEpoch,
                  fromTick: cast.fromTick,
                  toTick: cast.toTick,
                  castId: cast.castId,
                  projectileId: cast.projectileId,
                  target: { ...target },
                },
                kind: 'unqueried',
                evidence: 'not-queried-family-budget',
                reason: 'family-budget',
                earliestPossibleS: 0,
                nativeCalls: 0,
              });
            }
          }
          families.push(resolveContactFamily(manifests[castIndex]!, candidates));
        }
        const nativeCalls = allowance - remainingNativeCalls;
        if (!Number.isInteger(nativeCalls) || nativeCalls < 0 || nativeCalls > allowance
          || families.reduce((sum, family) => sum + family.nativeCalls, 0) !== nativeCalls) {
          throw new Error('Arm contact batch native-call accounting is inconsistent');
        }
        return {
          worldEpoch,
          fromTick: snapshot.interval.fromTick,
          toTick: snapshot.interval.toTick,
          nativeCalls,
          remainingNativeCalls,
          snapshot,
          families,
        };
      } catch (error) {
        closed = true;
        roster = [];
        throw error;
      }
    },
    destroy(): void {
      if (closed) return;
      closed = true;
      roster = [];
    },
  };
}

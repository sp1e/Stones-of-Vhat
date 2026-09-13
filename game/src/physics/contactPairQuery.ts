import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { ColliderRef } from './bodyMotion.ts';
import {
  CONTACT_MOTION_MODEL,
  type ContactShape,
  type createContactMotion,
} from './contactMotion.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';
import type { Vec3 } from '../content/yardLayout.ts';

export const CONTACT_QUERY_LIMITS = Object.freeze({
  guardM: .00005,
  maxBracketM: .001,
  maxNativeCalls: 128,
  predictionM: 256,
});
export const CONTACT_QUERY_EVIDENCE = 'declared-motion-model-empirical-native-guard' as const;

type Motion = ReturnType<typeof createContactMotion>;
export type LinearContactCast = {
  worldEpoch: string;
  fromTick: number;
  toTick: number;
  castId: string;
  projectileId: string;
  shape: ContactShape;
  startPose: RigidTransform;
  endPosition: Vec3;
};
export type ContactIntervalIdentity = {
  worldEpoch: string;
  fromTick: number;
  toTick: number;
  dtS: number;
};

export function validateLinearContactCast(
  interval: ContactIntervalIdentity,
  cast: LinearContactCast,
): LinearContactCast {
  return validateCast(interval, cast).cast;
}
type PairIdentity = {
  worldEpoch: string;
  fromTick: number;
  toTick: number;
  castId: string;
  projectileId: string;
  target: ColliderRef;
};
type PairBase = {
  identity: PairIdentity;
  evidence: typeof CONTACT_QUERY_EVIDENCE;
  nativeCalls: number;
};
export type ContactPairGeometry = {
  projectileWorld: RigidTransform;
  targetBodyOriginWorld: RigidTransform;
  targetColliderWorld: RigidTransform;
  projectileWitnessWorld: Vec3;
  targetWitnessWorld: Vec3;
  projectileWitnessLocal: Vec3;
  targetWitnessColliderLocal: Vec3;
  targetWitnessBodyLocal: Vec3;
  projectileNormalWorld: Vec3;
  targetNormalWorld: Vec3;
  targetNormalColliderLocal: Vec3;
  targetNormalBodyLocal: Vec3;
};
export type ContactPairResult = PairBase & (
  | { kind: 'miss' }
  | { kind: 'initial-blocked'; earliestPossibleS: 0; reason: 'overlap-or-within-guard' }
  | {
    kind: 'hit';
    lowerS: number;
    upperS: number;
    timeOfImpactS: number;
    intervalFraction: number;
    bracketTravelM: number;
    uncertaintyBoundM: number;
    geometry: ContactPairGeometry;
  }
  | {
    kind: 'inconclusive';
    earliestPossibleS: number;
    checkedThroughS: number;
    reason: 'budget' | 'graze' | 'native-geometry' | 'unbracketed' | 'width' | 'stall';
  }
);

type Prepared = {
  motion: Motion;
  cast: LinearContactCast;
  target: ColliderRef;
  targetRadiusM: number;
  projectileShape: RAPIER.Shape;
  nativeTargetShape: RAPIER.Shape;
  projectileVelocity: Vec3;
  projectileSpeedMps: number;
  identity: PairIdentity;
};

let initialization: Promise<void> | undefined;
const length = (value: Vec3): number => Math.hypot(value.x, value.y, value.z);
const subtract = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const detachedPose = (value: RigidTransform): RigidTransform => ({
  position: { ...value.position },
  rotation: { ...value.rotation },
});

function nonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty`);
}

function scalar(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new Error(`${label} must be finite and float32 representable`);
  }
  return value;
}

function vector(value: Vec3, label: string): Vec3 {
  if (!value || typeof value !== 'object') throw new Error(`${label} must be a finite vector`);
  return {
    x: scalar(value.x, `${label}.x`),
    y: scalar(value.y, `${label}.y`),
    z: scalar(value.z, `${label}.z`),
  };
}

function pose(value: RigidTransform, label: string): RigidTransform {
  if (!value || typeof value !== 'object' || !value.position || !value.rotation) {
    throw new Error(`${label} must be a rigid pose`);
  }
  vector(value.position, `${label}.position`);
  scalar(value.rotation.x, `${label}.rotation.x`);
  scalar(value.rotation.y, `${label}.rotation.y`);
  scalar(value.rotation.z, `${label}.rotation.z`);
  scalar(value.rotation.w, `${label}.rotation.w`);
  if (value.scale) vector(value.scale, `${label}.scale`);
  return rigid(value);
}

function checkedShape(value: ContactShape, label: string): { value: ContactShape; radiusM: number } {
  if (!value || typeof value !== 'object' || !('kind' in value)) throw new Error(`${label} shape is invalid`);
  if (value.kind === 'box') {
    if (!Array.isArray(value.size) || value.size.length !== 3) {
      throw new Error(`${label} box shape must have three dimensions`);
    }
    for (let index = 0; index < 3; index++) {
      if (!Object.hasOwn(value.size, index)) throw new Error(`${label} box dimensions must be dense own entries`);
    }
    const size = Array.from({ length: 3 }, (_, index) => scalar(value.size[index]!, `${label}.size[${index}]`));
    if (size.some(dimension => dimension < .001 || Math.fround(dimension) === 0)) {
      throw new Error(`${label} box full dimensions must be at least 0.001m and nonzero in float32`);
    }
    const copied: ContactShape = { kind: 'box', size: size as [number, number, number] };
    return {
      value: copied,
      radiusM: Math.hypot(size[0]! / 2, size[1]! / 2, size[2]! / 2),
    };
  }
  if (value.kind === 'ball') {
    const radius = scalar(value.radius, `${label}.radius`);
    if (radius * 2 < .001 || Math.fround(radius) === 0) {
      throw new Error(`${label} ball diameter must be at least 0.001m and nonzero in float32`);
    }
    return { value: { kind: 'ball', radius }, radiusM: radius };
  }
  throw new Error(`${label} has an unsupported shape geometry`);
}

function nativeShape(value: ContactShape): RAPIER.Shape {
  return value.kind === 'box'
    ? new RAPIER.Cuboid(value.size[0] / 2, value.size[1] / 2, value.size[2] / 2)
    : new RAPIER.Ball(value.radius);
}

function sameRef(a: ColliderRef, b: ColliderRef): boolean {
  return a.worldEpoch === b.worldEpoch && a.bodyId === b.bodyId && a.colliderId === b.colliderId;
}

function validateCast(
  interval: ContactIntervalIdentity,
  inputCast: LinearContactCast,
): { cast: LinearContactCast; radiusM: number } {
  if (!interval || typeof interval !== 'object') throw new Error('Contact interval identity must be an object');
  nonempty(interval.worldEpoch, 'Contact interval world epoch');
  if (!Number.isSafeInteger(interval.fromTick) || interval.fromTick < 0
    || !Number.isSafeInteger(interval.toTick) || interval.toTick !== interval.fromTick + 1) {
    throw new Error('Contact interval requires safe nonnegative adjacent ticks');
  }
  if (interval.dtS !== FIXED_DT) throw new Error('Contact interval requires the fixed duration');
  if (!inputCast || typeof inputCast !== 'object') throw new Error('Cast must be an object');
  nonempty(inputCast.worldEpoch, 'Cast world epoch');
  nonempty(inputCast.castId, 'Cast id');
  nonempty(inputCast.projectileId, 'Projectile id');
  if (inputCast.worldEpoch !== interval.worldEpoch || inputCast.fromTick !== interval.fromTick
    || inputCast.toTick !== interval.toTick) {
    throw new Error('Cast identity must exactly match the contact interval epoch and ticks');
  }
  const startPose = pose(inputCast.startPose, 'Projectile start pose');
  const endPosition = vector(inputCast.endPosition, 'Projectile end position');
  const projectile = checkedShape(inputCast.shape, 'Projectile');
  const projectileVelocity = {
    x: (endPosition.x - startPose.position.x) / FIXED_DT,
    y: (endPosition.y - startPose.position.y) / FIXED_DT,
    z: (endPosition.z - startPose.position.z) / FIXED_DT,
  };
  vector(projectileVelocity, 'Projectile velocity');
  const projectileSpeedMps = length(projectileVelocity);
  if (!Number.isFinite(projectileSpeedMps) || projectileSpeedMps > 128) {
    throw new Error('Projectile origin speed exceeds 128m/s');
  }
  for (const [label, center] of [['start', startPose.position], ['end', endPosition]] as const) {
    if ([center.x, center.y, center.z].some(component => Math.abs(component) + projectile.radiusM > 32)) {
      throw new Error(`Projectile ${label} extent exceeds the 32m contact domain`);
    }
  }
  return {
    cast: {
      worldEpoch: inputCast.worldEpoch,
      fromTick: inputCast.fromTick,
      toTick: inputCast.toTick,
      castId: inputCast.castId,
      projectileId: inputCast.projectileId,
      shape: projectile.value,
      startPose: detachedPose(startPose),
      endPosition: { ...endPosition },
    },
    radiusM: projectile.radiusM,
  };
}

function prepare(motion: Motion, inputCast: LinearContactCast, inputTarget: ColliderRef): Prepared {
  if (!motion || typeof motion !== 'object' || motion.model !== CONTACT_MOTION_MODEL
    || typeof motion.colliders !== 'function' || typeof motion.sample !== 'function') {
    throw new Error('Contact pair query requires the accepted contact motion model');
  }
  nonempty(motion.worldEpoch, 'Motion world epoch');
  if (!Number.isSafeInteger(motion.fromTick) || motion.fromTick < 0
    || !Number.isSafeInteger(motion.toTick) || motion.toTick !== motion.fromTick + 1
    || motion.dtS !== FIXED_DT) {
    throw new Error('Contact pair query requires an adjacent fixed-tick motion interval');
  }
  if (!inputTarget || typeof inputTarget !== 'object') throw new Error('Target reference is invalid');
  nonempty(inputTarget.worldEpoch, 'Target world epoch');
  nonempty(inputTarget.bodyId, 'Target body id');
  nonempty(inputTarget.colliderId, 'Target collider id');
  if (inputTarget.worldEpoch !== motion.worldEpoch) throw new Error('Target belongs to a stale world epoch');
  const colliders = motion.colliders();
  if (!Array.isArray(colliders)) throw new Error('Contact motion collider membership is invalid');
  const targetRecord = colliders.find(collider => sameRef(collider.ref, inputTarget));
  if (!targetRecord) throw new Error('Target is not a registered blocker collider');
  const cast = validateLinearContactCast({
    worldEpoch: motion.worldEpoch,
    fromTick: motion.fromTick,
    toTick: motion.toTick,
    dtS: motion.dtS,
  }, inputCast);
  const target = checkedShape(targetRecord.shape, 'Target');
  const targetRadiusM = scalar(targetRecord.radiusFromBodyOriginM, 'Target radius from body origin');
  if (targetRadiusM < 0) throw new Error('Target radius from body origin must be nonnegative');
  const projectileVelocity = {
    x: (cast.endPosition.x - cast.startPose.position.x) / FIXED_DT,
    y: (cast.endPosition.y - cast.startPose.position.y) / FIXED_DT,
    z: (cast.endPosition.z - cast.startPose.position.z) / FIXED_DT,
  };
  vector(projectileVelocity, 'Projectile velocity');
  const projectileSpeedMps = length(projectileVelocity);
  const targetRef = { ...inputTarget };
  return {
    motion,
    cast,
    target: targetRef,
    targetRadiusM,
    projectileShape: nativeShape(cast.shape),
    nativeTargetShape: nativeShape(target.value),
    projectileVelocity,
    projectileSpeedMps,
    identity: {
      worldEpoch: cast.worldEpoch,
      fromTick: cast.fromTick,
      toTick: cast.toTick,
      castId: cast.castId,
      projectileId: cast.projectileId,
      target: { ...targetRef },
    },
  };
}

function localPoint(worldPose: RigidTransform, worldPoint: Vec3): Vec3 {
  const rotation = new Quaternion(
    worldPose.rotation.x,
    worldPose.rotation.y,
    worldPose.rotation.z,
    worldPose.rotation.w,
  ).normalize().conjugate();
  const result = new Vector3(
    worldPoint.x - worldPose.position.x,
    worldPoint.y - worldPose.position.y,
    worldPoint.z - worldPose.position.z,
  ).applyQuaternion(rotation);
  return { x: result.x, y: result.y, z: result.z };
}

function localDirection(worldPose: RigidTransform, worldDirection: Vec3): Vec3 {
  const rotation = new Quaternion(
    worldPose.rotation.x,
    worldPose.rotation.y,
    worldPose.rotation.z,
    worldPose.rotation.w,
  ).normalize().conjugate();
  const result = new Vector3(worldDirection.x, worldDirection.y, worldDirection.z).applyQuaternion(rotation);
  return { x: result.x, y: result.y, z: result.z };
}

function base(prepared: Prepared, nativeCalls: number): PairBase {
  return {
    identity: structuredClone(prepared.identity),
    evidence: CONTACT_QUERY_EVIDENCE,
    nativeCalls,
  };
}

function inconclusive(
  prepared: Prepared,
  nativeCalls: number,
  earliestPossibleS: number,
  checkedThroughS: number,
  reason: Extract<ContactPairResult, { kind: 'inconclusive' }>['reason'],
): ContactPairResult {
  return { ...base(prepared, nativeCalls), kind: 'inconclusive', earliestPossibleS, checkedThroughS, reason };
}

function projectilePose(prepared: Prepared, time: number): RigidTransform {
  const fraction = time / FIXED_DT;
  return {
    position: {
      x: prepared.cast.startPose.position.x + (prepared.cast.endPosition.x - prepared.cast.startPose.position.x) * fraction,
      y: prepared.cast.startPose.position.y + (prepared.cast.endPosition.y - prepared.cast.startPose.position.y) * fraction,
      z: prepared.cast.startPose.position.z + (prepared.cast.endPosition.z - prepared.cast.startPose.position.z) * fraction,
    },
    rotation: { ...prepared.cast.startPose.rotation },
  };
}

function geometry(
  projectileWorld: RigidTransform,
  targetBodyOriginWorld: RigidTransform,
  targetColliderWorld: RigidTransform,
  contact: RAPIER.ShapeContact,
  projectileNormalWorld: Vec3,
  targetNormalWorld: Vec3,
): ContactPairGeometry {
  const projectileWitnessWorld = { ...contact.point1 };
  const targetWitnessWorld = { ...contact.point2 };
  return {
    projectileWorld: detachedPose(projectileWorld),
    targetBodyOriginWorld: detachedPose(targetBodyOriginWorld),
    targetColliderWorld: detachedPose(targetColliderWorld),
    projectileWitnessWorld,
    targetWitnessWorld,
    projectileWitnessLocal: localPoint(projectileWorld, projectileWitnessWorld),
    targetWitnessColliderLocal: localPoint(targetColliderWorld, targetWitnessWorld),
    targetWitnessBodyLocal: localPoint(targetBodyOriginWorld, targetWitnessWorld),
    projectileNormalWorld: { ...projectileNormalWorld },
    targetNormalWorld: { ...targetNormalWorld },
    targetNormalColliderLocal: localDirection(targetColliderWorld, targetNormalWorld),
    targetNormalBodyLocal: localDirection(targetBodyOriginWorld, targetNormalWorld),
  };
}

function queryPair(prepared: Prepared): ContactPairResult {
  const guard = CONTACT_QUERY_LIMITS.guardM;
  let time = 0;
  let nativeCalls = 0;
  let lastEvaluatedS = 0;
  let cumulativeTravelM = 0;
  let uncertainty: { time: number; travelM: number } | undefined;

  while (nativeCalls < CONTACT_QUERY_LIMITS.maxNativeCalls) {
    const frame = prepared.motion.sample(prepared.target, time);
    const projectileWorld = projectilePose(prepared, time);
    const relativeSpeedMps = prepared.projectileSpeedMps + frame.pointSpeedBoundMps;
    if (!Number.isFinite(relativeSpeedMps) || relativeSpeedMps < 0
      || !Number.isFinite(frame.spanEndS) || frame.spanEndS < time || frame.spanEndS > FIXED_DT
      || !Number.isFinite(frame.pointSpeedBoundMps) || frame.pointSpeedBoundMps < 0) {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'native-geometry');
    }
    let contact: RAPIER.ShapeContact | null;
    try {
      nativeCalls += 1;
      contact = prepared.projectileShape.contactShape(
        projectileWorld.position,
        projectileWorld.rotation,
        prepared.nativeTargetShape,
        frame.colliderWorld.position,
        frame.colliderWorld.rotation,
        CONTACT_QUERY_LIMITS.predictionM,
      );
    } catch {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'native-geometry');
    }
    if (!contact || !Number.isFinite(contact.distance)) {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'native-geometry');
    }
    // Overlap records may not carry regular surface data, so initial blocking is
    // deliberately decided before trusting any native witness or normal.
    if (time === 0 && contact.distance <= guard) {
      return {
        ...base(prepared, nativeCalls),
        kind: 'initial-blocked',
        earliestPossibleS: 0,
        reason: 'overlap-or-within-guard',
      };
    }
    let point1: Vec3, point2: Vec3, normal1: Vec3, normal2: Vec3;
    try {
      point1 = vector(contact.point1, 'Native projectile witness');
      point2 = vector(contact.point2, 'Native target witness');
      normal1 = vector(contact.normal1, 'Native projectile normal');
      normal2 = vector(contact.normal2, 'Native target normal');
    } catch {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'native-geometry');
    }
    const normal1Length = length(normal1), normal2Length = length(normal2);
    const opposition = length({ x: normal1.x + normal2.x, y: normal1.y + normal2.y, z: normal1.z + normal2.z });
    const signedResidual = subtract(subtract(point2, point1), {
      x: contact.distance * normal1.x,
      y: contact.distance * normal1.y,
      z: contact.distance * normal1.z,
    });
    if (Math.abs(normal1Length - 1) > 1e-4 || Math.abs(normal2Length - 1) > 1e-4
      || opposition > 1e-4 || length(signedResidual) > guard) {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'native-geometry');
    }
    const projectileNormalWorld = {
      x: normal1.x / normal1Length,
      y: normal1.y / normal1Length,
      z: normal1.z / normal1Length,
    };
    const targetNormalWorld = {
      x: normal2.x / normal2Length,
      y: normal2.y / normal2Length,
      z: normal2.z / normal2Length,
    };
    lastEvaluatedS = time;
    if (contact.distance <= -guard) {
      if (!uncertainty) return inconclusive(prepared, nativeCalls, time, time, 'unbracketed');
      // Cumulative travel is integrated with each traversed span's own speed
      // bound; a later, slower span must not shrink an earlier uncertainty.
      const bracketTravelM = cumulativeTravelM - uncertainty.travelM;
      const uncertaintyBoundM = bracketTravelM + 2 * guard;
      if (!Number.isFinite(bracketTravelM) || bracketTravelM < 0 || !Number.isFinite(uncertaintyBoundM)) {
        return inconclusive(prepared, nativeCalls, uncertainty.time, time, 'stall');
      }
      if (uncertaintyBoundM > CONTACT_QUERY_LIMITS.maxBracketM) {
        return inconclusive(prepared, nativeCalls, uncertainty.time, time, 'width');
      }
      return {
        ...base(prepared, nativeCalls),
        kind: 'hit',
        lowerS: uncertainty.time,
        upperS: time,
        timeOfImpactS: time,
        intervalFraction: time / FIXED_DT,
        bracketTravelM,
        uncertaintyBoundM,
        geometry: geometry(
          projectileWorld,
          frame.bodyOriginWorld,
          frame.colliderWorld,
          contact,
          projectileNormalWorld,
          targetNormalWorld,
        ),
      };
    }
    if (time === FIXED_DT) {
      if (!uncertainty && contact.distance > guard) return { ...base(prepared, nativeCalls), kind: 'miss' };
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'graze');
    }
    if (!uncertainty && contact.distance <= 2 * guard) {
      uncertainty = { time, travelM: cumulativeTravelM };
    }
    const remainingS = frame.spanEndS - time;
    const relativeVelocity = subtract(prepared.projectileVelocity, frame.originVelocityWorldMps);
    const planeBoundMps = Math.max(0, dot(relativeVelocity, projectileNormalWorld))
      + length(cross(projectileNormalWorld, frame.angularVelocityWorldRadps)) * prepared.targetRadiusM;
    if (!Number.isFinite(remainingS) || remainingS < 0 || !Number.isFinite(planeBoundMps)) {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'stall');
    }
    // These strict guards prove only the remainder of the current declared
    // span. Sampling its right endpoint selects the next span's derivatives.
    const scalarClear = contact.distance > guard
      && contact.distance - guard > relativeSpeedMps * remainingS;
    const planeClear = contact.distance > guard
      && contact.distance - guard > planeBoundMps * remainingS;
    let next: number;
    if (scalarClear || planeClear || relativeSpeedMps === 0) {
      next = frame.spanEndS;
    } else if (contact.distance > 2 * guard) {
      next = Math.min(frame.spanEndS, time + .9 * (contact.distance - guard) / relativeSpeedMps);
    } else {
      next = Math.min(frame.spanEndS, time + 2 * guard / relativeSpeedMps);
    }
    if (!Number.isFinite(next) || !(next > time)) {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'stall');
    }
    const travel = relativeSpeedMps * (next - time);
    if (!Number.isFinite(travel) || travel < 0) {
      return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, time, 'stall');
    }
    cumulativeTravelM += travel;
    time = next;
  }
  return inconclusive(prepared, nativeCalls, uncertainty?.time ?? time, lastEvaluatedS, 'budget');
}

export async function createContactPairQuery(): Promise<(
  motion: Motion,
  cast: LinearContactCast,
  target: ColliderRef,
) => ContactPairResult> {
  initialization ??= Promise.resolve().then(() => RAPIER.init()).then(() => undefined);
  await initialization;
  return (motion, cast, target) => queryPair(prepare(motion, cast, target));
}

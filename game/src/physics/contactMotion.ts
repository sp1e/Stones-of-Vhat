import type { BodyEndpoint, ColliderRef, MotionInterval, MotionShape } from './bodyMotion.ts';
import type { Vec3 } from '../content/yardLayout.ts';
import { composeRigid, rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';
import { Quaternion } from 'three';
import { FIXED_DT } from '../runtime/fixedStep.ts';

export const CONTACT_MOTION_MODEL = 'native-boundary-origin-lerp-shortest-slerp' as const;
export const CONTACT_MOTION_LIMITS = Object.freeze({
  extentM: 32,
  maxOriginSpeedMps: 128,
  maxRecordedOmegaRadps: 128,
  maxSpanAngleRad: Math.PI / 4,
  maxBodies: 64,
  maxColliders: 128,
});

export type ContactShape =
  | { kind: 'box'; size: readonly [number, number, number] }
  | { kind: 'ball'; radius: number };
export type ContactCollider = {
  ref: ColliderRef;
  shape: ContactShape;
  localPose: RigidTransform;
  radiusFromBodyOriginM: number;
};
export type ContactMotionFrame = {
  offsetS: number;
  spanIndex: number;
  spanStartS: number;
  spanEndS: number;
  bodyOriginWorld: RigidTransform;
  colliderWorld: RigidTransform;
  originVelocityWorldMps: Vec3;
  angularVelocityWorldRadps: Vec3;
  pointSpeedBoundMps: number;
};

type Span = {
  startS: number;
  endS: number;
  from: RigidTransform;
  to: RigidTransform;
  originVelocityWorldMps: Vec3;
  angularVelocityWorldRadps: Vec3;
  pointSpeedBoundMps: number;
};
type Track = { collider: ContactCollider; spans: Span[] };

const quat = (value: RigidTransform['rotation']) => new Quaternion(value.x, value.y, value.z, value.w).normalize();
const length = (value: Vec3) => Math.hypot(value.x, value.y, value.z);
const copyPose = (value: RigidTransform): RigidTransform => {
  const result = rigid(value);
  return value.scale ? { ...result, scale: { ...value.scale } } : result;
};
const trackKey = (bodyId: string, colliderId: string) => JSON.stringify([bodyId, colliderId]);
const compareCodeUnits = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function nativeScalar(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new Error(`${label} must be finite and native float32 representable`);
  }
  return value;
}
function checkedVector(value: Vec3, label: string): Vec3 {
  if (!value || typeof value !== 'object') throw new Error(`${label} must be a finite vector`);
  return {
    x: nativeScalar(value.x, `${label}.x`),
    y: nativeScalar(value.y, `${label}.y`),
    z: nativeScalar(value.z, `${label}.z`),
  };
}
function checkedSpeed(value: Vec3, limit: number, label: string): void {
  const magnitude = length(value);
  if (!Number.isFinite(magnitude) || magnitude > limit) throw new Error(`${label} exceeds ${limit}`);
}
function checkedPose(value: RigidTransform, label: string): RigidTransform {
  if (!value || typeof value !== 'object' || !value.rotation) throw new Error(`${label} must be a rigid pose`);
  checkedVector(value.position, `${label}.position`);
  nativeScalar(value.rotation.x, `${label}.rotation.x`);
  nativeScalar(value.rotation.y, `${label}.rotation.y`);
  nativeScalar(value.rotation.z, `${label}.rotation.z`);
  nativeScalar(value.rotation.w, `${label}.rotation.w`);
  if (value.scale) checkedVector(value.scale, `${label}.scale`);
  const result = rigid(value);
  checkedVector(result.position, `${label}.position`);
  nativeScalar(result.rotation.x, `${label}.rotation.x`);
  nativeScalar(result.rotation.y, `${label}.rotation.y`);
  nativeScalar(result.rotation.z, `${label}.rotation.z`);
  nativeScalar(result.rotation.w, `${label}.rotation.w`);
  return value.scale ? { ...result, scale: { ...value.scale } } : result;
}
function nonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty`);
}
function checkedShape(value: MotionShape, label: string): MotionShape {
  if (!value || typeof value !== 'object' || !('kind' in value)) throw new Error(`${label} has an invalid geometry tag`);
  switch (value.kind) {
    case 'box': {
      if (!Array.isArray(value.size) || value.size.length !== 3) throw new Error(`${label} box must have three dimensions`);
      const size = Array.from(
        { length: 3 },
        (_, index) => nativeScalar(value.size[index]!, `${label}.size[${index}]`),
      );
      if (size.some(item => item <= 0 || Math.fround(item) === 0)) {
        throw new Error(`${label} box dimensions must be positive and nonzero in float32`);
      }
      return { kind: 'box', size: size as [number, number, number] };
    }
    case 'ball': {
      const radius = nativeScalar(value.radius, `${label}.radius`);
      if (radius <= 0 || Math.fround(radius) === 0) {
        throw new Error(`${label} ball radius must be positive and nonzero in float32`);
      }
      return { kind: 'ball', radius };
    }
    case 'cylinder': {
      const radius = nativeScalar(value.radius, `${label}.radius`);
      const height = nativeScalar(value.height, `${label}.height`);
      if (radius <= 0 || height <= 0 || Math.fround(radius) === 0 || Math.fround(height) === 0) {
        throw new Error(`${label} cylinder dimensions must be positive and nonzero in float32`);
      }
      return { kind: 'cylinder', radius, height };
    }
    case 'capsule': {
      const radius = nativeScalar(value.radius, `${label}.radius`);
      const halfHeight = nativeScalar(value.halfHeight, `${label}.halfHeight`);
      if (radius <= 0 || Math.fround(radius) === 0 || halfHeight < 0
        || (halfHeight > 0 && Math.fround(halfHeight) === 0)) {
        throw new Error(`${label} capsule dimensions must be nonnegative and nonzero in float32 when positive`);
      }
      return { kind: 'capsule', radius, halfHeight };
    }
    default: throw new Error(`${label} has an unsupported geometry tag`);
  }
}
const sameVector = (a: Vec3, b: Vec3) => a.x === b.x && a.y === b.y && a.z === b.z;
function samePose(a: RigidTransform, b: RigidTransform): boolean {
  if (!sameVector(a.position, b.position)) return false;
  if ((a.scale === undefined) !== (b.scale === undefined) || (a.scale && b.scale && !sameVector(a.scale, b.scale))) return false;
  const qa = quat(a.rotation), qb = quat(b.rotation);
  return Math.min(
    Math.hypot(qa.x - qb.x, qa.y - qb.y, qa.z - qb.z, qa.w - qb.w),
    Math.hypot(qa.x + qb.x, qa.y + qb.y, qa.z + qb.z, qa.w + qb.w),
  ) <= 2e-7;
}
function sameShape(a: MotionShape, b: MotionShape): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'box' && b.kind === 'box') return a.size.length === b.size.length && a.size.every((v, i) => v === b.size[i]);
  if (a.kind === 'ball' && b.kind === 'ball') return a.radius === b.radius;
  if (a.kind === 'cylinder' && b.kind === 'cylinder') return a.radius === b.radius && a.height === b.height;
  return a.kind === 'capsule' && b.kind === 'capsule' && a.radius === b.radius && a.halfHeight === b.halfHeight;
}
const colliderMap = (endpoint: BodyEndpoint) => new Map(endpoint.colliders.map(collider => [collider.ref.colliderId, collider]));
function sameColliders(a: BodyEndpoint, b: BodyEndpoint): boolean {
  if (a.colliders.length !== b.colliders.length) return false;
  const bb = colliderMap(b);
  return a.colliders.every(collider => {
    const other = bb.get(collider.ref.colliderId);
    return !!other
      && collider.ref.worldEpoch === other.ref.worldEpoch
      && collider.ref.bodyId === other.ref.bodyId
      && collider.role === other.role
      && sameShape(collider.shape, other.shape)
      && samePose(collider.localPose, other.localPose);
  });
}
function sameEndpoint(a: BodyEndpoint, b: BodyEndpoint): boolean {
  return samePose(a.bodyOriginWorld, b.bodyOriginWorld)
    && sameVector(a.comLocal, b.comLocal)
    && sameVector(a.comWorld, b.comWorld)
    && sameVector(a.comVelocityWorldMps, b.comVelocityWorldMps)
    && sameVector(a.angularVelocityWorldRadps, b.angularVelocityWorldRadps)
    && a.authority === b.authority
    && a.massKg === b.massKg
    && a.sleeping === b.sleeping
    && sameColliders(a, b);
}
function sameBoundaryStable(a: BodyEndpoint, b: BodyEndpoint): boolean {
  return samePose(a.bodyOriginWorld, b.bodyOriginWorld)
    && sameVector(a.comLocal, b.comLocal)
    && sameVector(a.comWorld, b.comWorld)
    && sameColliders(a, b);
}
function sameMeasuredConstants(a: BodyEndpoint, b: BodyEndpoint): boolean {
  return a.authority === b.authority
    && a.massKg === b.massKg
    && sameVector(a.comLocal, b.comLocal)
    && sameColliders(a, b);
}

function validateEndpoint(raw: BodyEndpoint, worldEpoch: string, bodyId: string, expectedColliderIds?: Set<string>): BodyEndpoint {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.colliders)) throw new Error(`Body ${bodyId} endpoint is invalid`);
  if (!['fixed', 'animation', 'physics'].includes(raw.authority)) throw new Error(`Body ${bodyId} authority is invalid`);
  const massKg = nativeScalar(raw.massKg, `Body ${bodyId} mass`);
  if (massKg < 0) throw new Error(`Body ${bodyId} mass must be nonnegative`);
  if (typeof raw.sleeping !== 'boolean') throw new Error(`Body ${bodyId} sleeping must be boolean`);
  const ids = new Set<string>();
  const colliders = raw.colliders.map((collider, index) => {
    if (!collider || typeof collider !== 'object' || !collider.ref) throw new Error(`Body ${bodyId} collider ${index} is invalid`);
    if (collider.ref.worldEpoch !== worldEpoch || collider.ref.bodyId !== bodyId) throw new Error(`Collider identity does not match world and body: ${bodyId}`);
    nonempty(collider.ref.colliderId, `Body ${bodyId} collider id`);
    if (ids.has(collider.ref.colliderId)) throw new Error(`Duplicate collider identity: ${bodyId}/${collider.ref.colliderId}`);
    ids.add(collider.ref.colliderId);
    if (collider.role !== 'blocker' && collider.role !== 'navigation') throw new Error(`Collider role is invalid: ${bodyId}/${collider.ref.colliderId}`);
    const shape = checkedShape(collider.shape, `Collider ${bodyId}/${collider.ref.colliderId}`);
    if (collider.role === 'blocker') {
      if (shape.kind !== 'box' && shape.kind !== 'ball') throw new Error(`Unsupported blocker shape for ${bodyId}/${collider.ref.colliderId}`);
      if (shape.kind === 'box' && shape.size.some(value => value < .001)) {
        throw new Error('Blocker box full dimensions must be at least 0.001m');
      }
      if (shape.kind === 'ball' && shape.radius * 2 < .001) {
        throw new Error('Blocker ball diameter must be at least 0.001m');
      }
    }
    return { ref: { worldEpoch, bodyId, colliderId: collider.ref.colliderId }, role: collider.role,
      localPose: checkedPose(collider.localPose, `Collider ${bodyId}/${collider.ref.colliderId} local pose`),
      shape };
  });
  if (!colliders.length) throw new Error(`Body ${bodyId} must contain a collider`);
  if (expectedColliderIds && (ids.size !== expectedColliderIds.size || Array.from(expectedColliderIds).some(id => !ids.has(id)))) {
    throw new Error(`Collider membership must exactly match for body ${bodyId}`);
  }
  const comVelocityWorldMps = checkedVector(raw.comVelocityWorldMps, `Body ${bodyId} COM velocity`);
  const angularVelocityWorldRadps = checkedVector(raw.angularVelocityWorldRadps, `Body ${bodyId} angular velocity`);
  checkedSpeed(comVelocityWorldMps, CONTACT_MOTION_LIMITS.maxOriginSpeedMps, `Body ${bodyId} endpoint COM speed`);
  checkedSpeed(angularVelocityWorldRadps, CONTACT_MOTION_LIMITS.maxRecordedOmegaRadps, `Body ${bodyId} recorded omega`);
  return {
    bodyOriginWorld: checkedPose(raw.bodyOriginWorld, `Body ${bodyId} origin`),
    comLocal: checkedVector(raw.comLocal, `Body ${bodyId} local COM`),
    comWorld: checkedVector(raw.comWorld, `Body ${bodyId} world COM`),
    comVelocityWorldMps, angularVelocityWorldRadps,
    authority: raw.authority, massKg, sleeping: raw.sleeping, colliders,
  };
}

function shortestAngularVelocity(from: RigidTransform, to: RigidTransform, durationS: number): Vec3 {
  const delta = quat(to.rotation).multiply(quat(from.rotation).conjugate()).normalize();
  if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
  const sine = Math.hypot(delta.x, delta.y, delta.z);
  if (sine === 0) return { x: 0, y: 0, z: 0 };
  const speed = 2 * Math.atan2(sine, Math.max(0, delta.w)) / durationS;
  return {
    x: delta.x / sine * speed,
    y: delta.y / sine * speed,
    z: delta.z / sine * speed,
  };
}

function shortestAngle(from: RigidTransform, to: RigidTransform): number {
  const delta = quat(to.rotation).multiply(quat(from.rotation).conjugate()).normalize();
  if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
  return 2 * Math.atan2(Math.hypot(delta.x, delta.y, delta.z), Math.max(0, delta.w));
}

function interpolate(from: RigidTransform, to: RigidTransform, t: number): RigidTransform {
  if (t === 0) return copyPose(from);
  if (t === 1) return copyPose(to);
  const fromRotation = quat(from.rotation);
  const worldDelta = quat(to.rotation).multiply(fromRotation.clone().conjugate()).normalize();
  if (worldDelta.w < 0) {
    worldDelta.set(-worldDelta.x, -worldDelta.y, -worldDelta.z, -worldDelta.w);
  }
  const sineHalfAngle = Math.hypot(worldDelta.x, worldDelta.y, worldDelta.z);
  let rotation = fromRotation;
  if (sineHalfAngle !== 0) {
    const halfAngle = Math.atan2(sineHalfAngle, Math.max(0, worldDelta.w));
    const fractionHalfAngle = t * halfAngle;
    const vectorScale = Math.sin(fractionHalfAngle) / sineHalfAngle;
    const fractionDelta = new Quaternion(
      worldDelta.x * vectorScale,
      worldDelta.y * vectorScale,
      worldDelta.z * vectorScale,
      Math.cos(fractionHalfAngle),
    );
    rotation = fractionDelta.multiply(fromRotation).normalize();
  }
  return {
    position: {
      x: from.position.x + (to.position.x - from.position.x) * t,
      y: from.position.y + (to.position.y - from.position.y) * t,
      z: from.position.z + (to.position.z - from.position.z) * t,
    },
    rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
  };
}

export function createContactMotion(interval: MotionInterval) {
  const source = structuredClone(interval);
  if (source.kind !== 'completed') throw new Error('Contact motion requires a completed interval');
  nonempty(source.worldEpoch, 'World epoch');
  if (!Number.isSafeInteger(source.fromTick) || source.fromTick < 0
    || !Number.isSafeInteger(source.toTick) || source.toTick !== source.fromTick + 1) {
    throw new Error('Contact motion requires safe nonnegative adjacent ticks');
  }
  if (source.dtS !== FIXED_DT) throw new Error('Contact motion requires the fixed interval duration');
  if (!Array.isArray(source.bodies) || !source.bodies.length) throw new Error('Contact motion requires at least one body');
  if (source.bodies.length > CONTACT_MOTION_LIMITS.maxBodies) throw new Error('Contact motion body limit exceeded');
  const rawColliderCount = source.bodies.reduce(
    (sum, body) => sum + (Array.isArray(body.from?.colliders) ? body.from.colliders.length : 0),
    0,
  );
  if (rawColliderCount > CONTACT_MOTION_LIMITS.maxColliders) throw new Error('Contact motion collider limit exceeded');
  const trace = source.nativeTrace;
  if (!trace) throw new Error('Contact motion requires a measured native trace');
  if (trace.kind !== 'measured-native-boundaries') throw new Error('Contact motion requires measured native boundaries');
  if (!Array.isArray(trace.samples) || trace.samples.length < 2 || trace.samples.length > 17) {
    throw new Error('Native trace requires 2 to 17 samples');
  }
  const samples = trace.samples;
  if (samples[0]!.offsetS !== 0) throw new Error('Native trace must start at zero offset');
  if (samples[samples.length - 1]!.offsetS !== source.dtS) throw new Error('Native trace must end at the interval duration');
  for (let index = 0; index < samples.length; index++) {
    const offset = samples[index]!.offsetS;
    if (!Number.isFinite(offset)) throw new Error('Native trace sample time must be finite');
    if (index > 0 && offset <= samples[index - 1]!.offsetS) {
      throw new Error('Native trace sample times must be strictly increasing');
    }
  }

  const bodyIds = new Set<string>();
  const bodies = source.bodies.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || !raw.ref) throw new Error(`Body record ${index} is invalid`);
    if (raw.ref.worldEpoch !== source.worldEpoch) throw new Error('Body identity does not match world epoch');
    nonempty(raw.ref.bodyId, 'Body id');
    if (bodyIds.has(raw.ref.bodyId)) throw new Error(`Duplicate body identity: ${raw.ref.bodyId}`);
    bodyIds.add(raw.ref.bodyId);
    if (!Array.isArray(raw.discontinuities)) throw new Error(`Body ${raw.ref.bodyId} discontinuities are invalid`);
    const seenDiscontinuities = new Set<string>();
    for (const item of raw.discontinuities as string[]) {
      if (item !== 'shape' && item !== 'authority') throw new Error(`Unknown discontinuity for body ${raw.ref.bodyId}`);
      if (seenDiscontinuities.has(item)) throw new Error(`Duplicate discontinuity for body ${raw.ref.bodyId}`);
      seenDiscontinuities.add(item);
    }
    if (seenDiscontinuities.has('shape')) throw new Error(`Shape discontinuity is unsupported for body ${raw.ref.bodyId}`);
    const from = validateEndpoint(raw.from, source.worldEpoch, raw.ref.bodyId);
    const colliderIds = new Set(from.colliders.map(collider => collider.ref.colliderId));
    const to = validateEndpoint(raw.to, source.worldEpoch, raw.ref.bodyId, colliderIds);
    return { id: raw.ref.bodyId, from, to, colliderIds, authorityDiscontinuity: seenDiscontinuities.has('authority') };
  });
  let totalColliders = 0;
  for (const body of bodies) totalColliders += body.colliderIds.size;
  if (totalColliders > CONTACT_MOTION_LIMITS.maxColliders) throw new Error('Contact motion collider limit exceeded');

  const measured = samples.map((sample, sampleIndex) => {
    if (!sample || !Array.isArray(sample.bodies)) throw new Error(`Native sample ${sampleIndex} body membership is invalid`);
    const entries = new Map<string, BodyEndpoint>();
    for (const entry of sample.bodies) {
      if (!entry || !entry.ref || entry.ref.worldEpoch !== source.worldEpoch) throw new Error(`Native sample ${sampleIndex} body identity does not match world`);
      nonempty(entry.ref.bodyId, `Native sample ${sampleIndex} body id`);
      if (!bodyIds.has(entry.ref.bodyId)) throw new Error(`Native sample ${sampleIndex} has an unknown extra body`);
      if (entries.has(entry.ref.bodyId)) throw new Error(`Native sample ${sampleIndex} has a duplicate body`);
      const expected = bodies.find(body => body.id === entry.ref.bodyId)!;
      entries.set(entry.ref.bodyId, validateEndpoint(entry.endpoint, source.worldEpoch, entry.ref.bodyId, expected.colliderIds));
    }
    if (entries.size !== bodies.length) throw new Error(`Native sample ${sampleIndex} has missing body membership`);
    return entries;
  });

  for (const body of bodies) {
    const first = measured[0]!.get(body.id)!;
    if (body.authorityDiscontinuity) {
      if (body.from.authority === first.authority) throw new Error(`Authority discontinuity has no boundary authority change for body ${body.id}`);
      if (!sameBoundaryStable(body.from, first)) throw new Error(`Authority boundary fields do not match for body ${body.id}`);
    } else if (!sameEndpoint(body.from, first)) throw new Error(`From boundary does not match first measured sample for body ${body.id}`);
    if (!body.authorityDiscontinuity && body.from.authority !== first.authority) throw new Error(`Authority change requires an explicit discontinuity for body ${body.id}`);
    const last = measured[measured.length - 1]!.get(body.id)!;
    if (!sameEndpoint(body.to, last)) throw new Error(`Final measured sample does not match to boundary for body ${body.id}`);
    for (let index = 1; index < measured.length; index++) {
      const previous = measured[index - 1]!.get(body.id)!;
      const current = measured[index]!.get(body.id)!;
      if (!sameMeasuredConstants(first, current)) throw new Error(`Measured body and collider fields must remain constant for body ${body.id}`);
      if (first.authority === 'fixed' && !samePose(previous.bodyOriginWorld, current.bodyOriginWorld)) {
        throw new Error(`Fixed body cannot move between measured knots: ${body.id}`);
      }
    }
  }

  const tracks = new Map<string, Track>();
  let blockerCount = 0;
  for (const body of bodies) {
    const sampleBodies = measured.map(sample => sample.get(body.id)!);
    for (const collider of sampleBodies[0]!.colliders) {
      if (collider.role !== 'blocker') continue;
      blockerCount++;
      if (collider.shape.kind !== 'box' && collider.shape.kind !== 'ball') {
        throw new Error('Unsupported blocker shape');
      }
      const halfExtent = collider.shape.kind === 'box'
        ? Math.hypot(collider.shape.size[0] / 2, collider.shape.size[1] / 2, collider.shape.size[2] / 2)
        : collider.shape.radius;
      const radiusFromBodyOriginM = nativeScalar(length(collider.localPose.position) + halfExtent,
        `Collider ${collider.ref.bodyId}/${collider.ref.colliderId} radius from body origin`);
      for (const endpoint of sampleBodies) {
        const position = endpoint.bodyOriginWorld.position;
        if ([position.x, position.y, position.z].some(
          component => Math.abs(component) + radiusFromBodyOriginM > CONTACT_MOTION_LIMITS.extentM,
        )) {
          throw new Error(`Blocker body origin exceeds the ${CONTACT_MOTION_LIMITS.extentM}m contact-motion extent`);
        }
      }
      const record: ContactCollider = {
        ref: structuredClone(collider.ref), shape: structuredClone(collider.shape),
        localPose: copyPose(collider.localPose), radiusFromBodyOriginM,
      };
      const spans: Span[] = [];
      for (let index = 0; index < samples.length - 1; index++) {
        const start = samples[index]!;
        const end = samples[index + 1]!;
        const from = copyPose(sampleBodies[index]!.bodyOriginWorld);
        const to = copyPose(sampleBodies[index + 1]!.bodyOriginWorld);
        const durationS = end.offsetS - start.offsetS;
        const originVelocityWorldMps = {
          x: (to.position.x - from.position.x) / durationS,
          y: (to.position.y - from.position.y) / durationS,
          z: (to.position.z - from.position.z) / durationS,
        };
        checkedVector(originVelocityWorldMps, `Derived origin velocity for span ${index}`);
        checkedSpeed(originVelocityWorldMps, CONTACT_MOTION_LIMITS.maxOriginSpeedMps, `Derived origin speed for span ${index}`);
        const angle = shortestAngle(from, to);
        // Axis-angle round-tripping can put the exact pi/4 boundary one ulp high.
        if (!Number.isFinite(angle) || angle - CONTACT_MOTION_LIMITS.maxSpanAngleRad > 4 * Number.EPSILON) {
          throw new Error(`Rotation angle exceeds the contact-motion span limit for span ${index}`);
        }
        const angularVelocityWorldRadps = shortestAngularVelocity(from, to, durationS);
        checkedVector(angularVelocityWorldRadps, `Derived world omega for span ${index}`);
        const pointSpeedBoundMps = nativeScalar(length(originVelocityWorldMps)
          + length(angularVelocityWorldRadps) * radiusFromBodyOriginM, `Derived point-speed bound for span ${index}`);
        spans.push({ startS: start.offsetS, endS: end.offsetS, from, to, originVelocityWorldMps,
          angularVelocityWorldRadps, pointSpeedBoundMps });
      }
      tracks.set(trackKey(record.ref.bodyId, record.ref.colliderId), { collider: record, spans });
    }
  }
  if (!blockerCount) throw new Error('Contact motion requires at least one blocker collider');
  const orderedTracks = Array.from(tracks.values()).sort((a, b) => (
    compareCodeUnits(a.collider.ref.bodyId, b.collider.ref.bodyId)
      || compareCodeUnits(a.collider.ref.colliderId, b.collider.ref.colliderId)
  ));
  // This facade interpolates measured native boundaries. It is neither a solver
  // substep nor evidence that an unobserved full turn or solver CCD path is safe.
  const facade = {
    model: CONTACT_MOTION_MODEL,
    worldEpoch: source.worldEpoch,
    fromTick: source.fromTick,
    toTick: source.toTick,
    dtS: source.dtS,
    colliders: (): ContactCollider[] => orderedTracks.map(track => structuredClone(track.collider)),
    sample(ref: ColliderRef, offsetS: number): ContactMotionFrame {
      if (!ref || typeof ref !== 'object' || typeof ref.worldEpoch !== 'string' || typeof ref.bodyId !== 'string' || typeof ref.colliderId !== 'string') {
        throw new Error('Invalid collider reference');
      }
      if (ref.worldEpoch !== source.worldEpoch) throw new Error('Stale world collider reference');
      const sameBody = Array.from(tracks.values()).some(track => track.collider.ref.bodyId === ref.bodyId);
      if (!sameBody) throw new Error('Unknown body reference');
      const track = tracks.get(trackKey(ref.bodyId, ref.colliderId));
      if (!track) throw new Error('Unknown collider reference');
      if (!Number.isFinite(offsetS) || offsetS < 0 || offsetS > source.dtS) {
        throw new Error('Contact sample offset must be finite and within the completed interval');
      }
      let spanIndex = track.spans.length - 1;
      for (let index = 0; index < track.spans.length; index++) {
        if (offsetS < track.spans[index]!.endS) {
          spanIndex = index;
          break;
        }
      }
      const span = track.spans[spanIndex]!;
      const bodyOriginWorld = interpolate(
        span.from,
        span.to,
        (offsetS - span.startS) / (span.endS - span.startS),
      );
      return {
        offsetS, spanIndex, spanStartS: span.startS, spanEndS: span.endS,
        bodyOriginWorld, colliderWorld: composeRigid(bodyOriginWorld, track.collider.localPose),
        originVelocityWorldMps: structuredClone(span.originVelocityWorldMps),
        angularVelocityWorldRadps: structuredClone(span.angularVelocityWorldRadps),
        pointSpeedBoundMps: span.pointSpeedBoundMps,
      };
    },
  };
  return Object.freeze(facade);
}

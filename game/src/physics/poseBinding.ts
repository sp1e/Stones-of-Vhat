import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { Rotation, Vec3 } from '../content/yardLayout.ts';

export type RigidTransform = { position: Vec3; rotation: Rotation; scale?: Vec3 };
export type BoneBinding = { version: 1; boneToBody: RigidTransform };
export type PoseSample = { tick: number; bodyOriginWorld: RigidTransform };
const quaternion = (q: Rotation) => new Quaternion(q.x, q.y, q.z, q.w);

export function finiteVector(v: Vec3): Vec3 {
  if (![v.x, v.y, v.z].every(Number.isFinite)) throw new Error('Vector must be finite');
  return { x: v.x, y: v.y, z: v.z };
}

export function rigid(t: RigidTransform): RigidTransform {
  const position = finiteVector(t.position);
  if (t.scale && (![t.scale.x, t.scale.y, t.scale.z].every(Number.isFinite)
    || [t.scale.x, t.scale.y, t.scale.z].some(v => Math.abs(v - 1) > 1e-8))) {
    throw new Error('Rigid scale must be identity');
  }
  const q = t.rotation;
  const largest = Math.max(Math.abs(q.x), Math.abs(q.y), Math.abs(q.z), Math.abs(q.w));
  if (![q.x, q.y, q.z, q.w].every(Number.isFinite) || largest === 0) {
    throw new Error('Invalid rigid quaternion');
  }
  // Scale first so both subnormal and huge finite inputs normalize without overflow.
  const normalized = new Quaternion(q.x / largest, q.y / largest, q.z / largest, q.w / largest).normalize();
  return { position, rotation: { x: normalized.x, y: normalized.y, z: normalized.z, w: normalized.w } };
}

export function rotateVector(q: Rotation, v: Vec3): Vec3 {
  const rotation = rigid({ position: { x: 0, y: 0, z: 0 }, rotation: q }).rotation;
  const p = finiteVector(v);
  const result = new Vector3(p.x, p.y, p.z).applyQuaternion(quaternion(rotation));
  return { x: result.x, y: result.y, z: result.z };
}

export function composeRigid(a: RigidTransform, b: RigidTransform): RigidTransform {
  const aa = rigid(a), bb = rigid(b);
  const p = rotateVector(aa.rotation, bb.position);
  const q = quaternion(aa.rotation).multiply(quaternion(bb.rotation));
  return rigid({ position: { x: aa.position.x + p.x, y: aa.position.y + p.y, z: aa.position.z + p.z }, rotation: q });
}

export function inverseRigid(t: RigidTransform): RigidTransform {
  const value = rigid(t), q = quaternion(value.rotation).conjugate();
  const p = rotateVector(q, { x: -value.position.x, y: -value.position.y, z: -value.position.z });
  return rigid({ position: p, rotation: q });
}

function checkedBind(binding: BoneBinding): RigidTransform {
  if (binding.version !== 1) throw new Error('Unsupported bind version');
  return rigid(binding.boneToBody);
}

export function worldBodyFromBone(bone: RigidTransform, binding: BoneBinding): RigidTransform {
  return composeRigid(bone, checkedBind(binding));
}

export function worldBoneFromBody(body: RigidTransform, binding: BoneBinding): RigidTransform {
  return composeRigid(body, inverseRigid(checkedBind(binding)));
}

export function localBoneFromBody(parent: RigidTransform, body: RigidTransform, binding: BoneBinding): RigidTransform {
  return composeRigid(inverseRigid(parent), worldBoneFromBody(body, binding));
}

export function sampledVelocity(from: PoseSample, to: PoseSample, comLocal: Vec3, dtS: number) {
  if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Sample duration must be positive and finite');
  if (!Number.isSafeInteger(from.tick) || !Number.isSafeInteger(to.tick) || from.tick < 0 || to.tick !== from.tick + 1) {
    throw new Error('Samples must have adjacent ticks');
  }
  const a = rigid(from.bodyOriginWorld), b = rigid(to.bodyOriginWorld);
  const offset = { position: finiteVector(comLocal), rotation: { x: 0, y: 0, z: 0, w: 1 } };
  const ca = composeRigid(a, offset).position, cb = composeRigid(b, offset).position;
  const delta = quaternion(b.rotation).multiply(quaternion(a.rotation).conjugate()).normalize();
  // Exactly pi has no recoverable direction from two samples. Canonicalize the axis
  // lexicographically so q and -q choose the same tie, including signed zero w.
  const firstAxisComponent = [delta.x, delta.y, delta.z].find(component => component !== 0) ?? 1;
  if (delta.w < 0 || (delta.w === 0 && firstAxisComponent < 0)) {
    delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
  }
  const sine = Math.hypot(delta.x, delta.y, delta.z);
  const factor = sine < 1e-12 ? 2 / dtS : 2 * Math.atan2(sine, Math.max(0, delta.w)) / (sine * dtS);
  return {
    comVelocityWorldMps: finiteVector({ x: (cb.x - ca.x) / dtS, y: (cb.y - ca.y) / dtS, z: (cb.z - ca.z) / dtS }),
    angularVelocityWorldRadps: finiteVector({ x: delta.x * factor, y: delta.y * factor, z: delta.z * factor }),
  };
}

export type PointImpulse = { bodyId: string; impulseWorldNs: Vec3; pointWorld: Vec3 };
export type AnimatedTarget = { id: string; bodyOriginWorld: RigidTransform };

// Keep the pure transform API independent of Rapier's float32 storage boundary.
function nativeScalar(value: number): number {
  const rounded = Math.fround(value);
  if (!Number.isFinite(value) || !Number.isFinite(rounded)) {
    throw new Error('Native float32 value must be finite and representable');
  }
  return rounded;
}

function nativeVector(value: Vec3): Vec3 {
  return { x: nativeScalar(value.x), y: nativeScalar(value.y), z: nativeScalar(value.z) };
}

function nativePose(value: RigidTransform): RigidTransform {
  const result = rigid(value);
  return {
    position: nativeVector(result.position),
    rotation: { ...nativeVector(result.rotation), w: nativeScalar(result.rotation.w) },
  };
}

function assertNativeState(body: RAPIER.RigidBody): void {
  nativePose({ position: body.translation(), rotation: body.rotation() });
  nativePose({ position: body.nextTranslation(), rotation: body.nextRotation() });
  nativeVector(body.worldCom());
  nativeVector(body.localCom());
  nativeVector(body.linvel());
  nativeVector(body.angvel());
  nativeVector(body.effectiveInvMass());
  nativeScalar(body.mass());
  const inertia = body.effectiveWorldInvInertia();
  for (const component of [inertia.m11, inertia.m12, inertia.m13, inertia.m22, inertia.m23, inertia.m33]) nativeScalar(component);
}

function validateImpulseResponse(
  body: RAPIER.RigidBody,
  impulse: Vec3,
  point: Vec3,
  velocity: ReturnType<typeof sampledVelocity>,
): void {
  const inverseMass = nativeScalar(body.invMass());
  const inversePrincipal = nativeVector(body.invPrincipalInertia());
  const maximumInverseInertia = Math.max(inversePrincipal.x, inversePrincipal.y, inversePrincipal.z);
  const com = nativeVector(body.worldCom());
  const lever = nativeVector({ x: point.x - com.x, y: point.y - com.y, z: point.z - com.z });
  const productBound = (a: number, b: number) => nativeScalar(Math.abs(a) * Math.abs(b));
  const sumBound = (a: number, b: number) => nativeScalar(a + b);
  // Kinematic effective inverse mass/inertia are zero. Use the real stored mass and
  // principal inverse inertia before conversion. Axis locks cannot increase these
  // bounds: |I^-1 * torque|_component <= max(eigenvalue) * ||torque||_1.
  // Absolute intermediate bounds may reject extreme cancelling inputs; this is
  // float32 safety, not a gameplay force/velocity clamp.
  const torqueBounds = {
    x: sumBound(productBound(lever.y, impulse.z), productBound(lever.z, impulse.y)),
    y: sumBound(productBound(lever.z, impulse.x), productBound(lever.x, impulse.z)),
    z: sumBound(productBound(lever.x, impulse.y), productBound(lever.y, impulse.x)),
  };
  const torqueL1 = sumBound(sumBound(torqueBounds.x, torqueBounds.y), torqueBounds.z);
  const angularDeltaBound = productBound(maximumInverseInertia, torqueL1);
  for (const axis of ['x', 'y', 'z'] as const) {
    sumBound(Math.abs(velocity.comVelocityWorldMps[axis]), productBound(impulse[axis], inverseMass));
    sumBound(Math.abs(velocity.angularVelocityWorldRadps[axis]), angularDeltaBound);
  }
}

/** The owner must invalidate its publisher and dispose its world after a native write failure. */
export function createPoseAuthority(
  members: readonly { id: string; body: RAPIER.RigidBody }[],
  assertLive: (id: string) => void,
  dtS: number,
  onFatal: (error: unknown) => void,
) {
  if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Sample duration must be positive and finite');
  if (nativeScalar(dtS) <= 0) throw new Error('Native float32 sample duration must be positive');
  nativeScalar(1 / dtS);
  if (typeof onFatal !== 'function') throw new Error('An owner fatal-error callback is required');
  // Own the registration list, not the native bodies; caller mutation cannot change membership.
  let registered = members.map(member => ({ ...member }));
  const entries = new Map(registered.map(member => [member.id, member]));
  if (!registered.length || entries.size !== registered.length || registered.some(member => !member.id.trim())) {
    throw new Error('Duplicate or empty authority member');
  }
  if (new Set(registered.map(member => member.body)).size !== registered.length) {
    throw new Error('Duplicate physical body alias in pose authority');
  }
  const assertPositionKinematic = (body: RAPIER.RigidBody): void => {
    if (body.bodyType() !== RAPIER.RigidBodyType.KinematicPositionBased) {
      throw new Error('Pose authority requires position-based kinematic bodies');
    }
  };
  for (const member of registered) {
    assertLive(member.id);
    assertPositionKinematic(member.body);
  }
  let mode: 'animation' | 'physics' | 'destroyed' = 'animation';
  let boundary = -1;
  let pendingTick: number | undefined;
  let history = new Map<string, PoseSample[]>();
  const alive = () => { if (mode === 'destroyed') throw new Error('Pose authority destroyed'); };
  const bodyPose = (body: RAPIER.RigidBody) => rigid({ position: { ...body.translation() }, rotation: { ...body.rotation() } });
  const destroy = (): void => {
    mode = 'destroyed';
    history.clear();
    entries.clear();
    registered = [];
    pendingTick = undefined;
  };
  const writeNative = (write: () => void): void => {
    try {
      write();
    } catch (error) {
      destroy();
      try { onFatal(error); } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Fatal native pose write and owner teardown failure');
      }
      throw new Error('Fatal native pose write; owning world invalidated', { cause: error });
    }
  };
  const nextTick = (tick: number): void => {
    if (!Number.isSafeInteger(tick) || tick < 0 || tick !== boundary + 1) {
      throw new Error('Operation requires adjacent completed ticks');
    }
  };
  return {
    mode: () => mode,
    animate(tick: number, targets: readonly AnimatedTarget[]): boolean {
      alive();
      if (mode !== 'animation') return false;
      nextTick(tick);
      if (boundary < 0) throw new Error('Capture the initial completed boundary before animation');
      if (pendingTick !== undefined) throw new Error('Animation target already queued');
      const targetMap = new Map(targets.map(target => [target.id, target]));
      if (targetMap.size !== registered.length || targets.length !== registered.length) {
        throw new Error('Animation requires every member exactly once');
      }
      const prepared = registered.map(member => {
        assertLive(member.id);
        assertPositionKinematic(member.body);
        const target = targetMap.get(member.id);
        if (!target) throw new Error('Missing animation member');
        const pose = nativePose(target.bodyOriginWorld);
        const current = nativePose(bodyPose(member.body));
        const comLocal = nativeVector(member.body.localCom());
        // A finite target may still imply a nonrepresentable velocity at this dt.
        const velocity = sampledVelocity(
          { tick: boundary, bodyOriginWorld: current },
          { tick, bodyOriginWorld: pose }, comLocal, dtS,
        );
        nativeVector(velocity.comVelocityWorldMps);
        nativeVector(velocity.angularVelocityWorldRadps);
        const localComPose = { position: comLocal, rotation: { x: 0, y: 0, z: 0, w: 1 } };
        nativeVector(composeRigid(current, localComPose).position);
        nativeVector(composeRigid(pose, localComPose).position);
        return { body: member.body, pose };
      });
      writeNative(() => {
        for (const target of prepared) {
          target.body.setNextKinematicTranslation(target.pose.position);
          target.body.setNextKinematicRotation(target.pose.rotation);
        }
        for (const target of prepared) assertNativeState(target.body);
      });
      pendingTick = tick;
      return true;
    },
    /** Owner-only: call after the existing successful fixed world.step, never to advance time. */
    capture(tick: number): void {
      alive();
      nextTick(tick);
      if (pendingTick !== undefined && pendingTick !== tick) throw new Error('Capture does not consume queued animation tick');
      // Invalid ownership/tick requests are recoverable validation errors; a world
      // that silently produced nonfinite native state is not safe to publish.
      for (const member of registered) assertLive(member.id);
      writeNative(() => { for (const member of registered) assertNativeState(member.body); });
      const next = new Map<string, PoseSample[]>();
      for (const member of registered) {
        assertLive(member.id);
        next.set(member.id, [
          ...(history.get(member.id) ?? []).slice(-1),
          { tick, bodyOriginWorld: bodyPose(member.body) },
        ]);
      }
      history = next;
      boundary = tick;
      pendingTick = undefined;
    },
    handoff(tick: number, impulse?: PointImpulse) {
      alive();
      if (mode !== 'animation') throw new Error('Already transferred to physics');
      if (tick !== boundary) throw new Error('Handoff requires current completed boundary');
      if (pendingTick !== undefined) throw new Error('Handoff cannot consume an old boundary with queued animation targets');
      const prepared = registered.map(member => {
        assertLive(member.id);
        assertPositionKinematic(member.body);
        const samples = history.get(member.id);
        if (!samples || samples.length !== 2) throw new Error('Handoff needs two-sample history');
        const from = samples[0]!, to = samples[1]!;
        if (to.tick !== tick) throw new Error('History is not at handoff boundary');
        const current = nativePose(bodyPose(member.body)), latest = to.bodyOriginWorld;
        const difference = Math.hypot(current.position.x - latest.position.x, current.position.y - latest.position.y, current.position.z - latest.position.z);
        // Float32 storage does not preserve unit length exactly. Geodesic angles
        // compare normalized rotations, not the small storage-length difference.
        const angular = 2 * Math.acos(Math.min(1, Math.abs(
          quaternion(current.rotation).normalize().dot(quaternion(latest.rotation).normalize()),
        )));
        if (difference > 1e-6 || angular > 1e-5) throw new Error('Body moved outside completed history');
        const velocity = sampledVelocity(from, to, { ...member.body.localCom() }, dtS);
        return {
          id: member.id, body: member.body, bodyOriginWorld: current,
          comVelocityWorldMps: nativeVector(velocity.comVelocityWorldMps),
          angularVelocityWorldRadps: nativeVector(velocity.angularVelocityWorldRadps),
        };
      });
      let point: { body: RAPIER.RigidBody; impulseWorldNs: Vec3; pointWorld: Vec3 } | undefined;
      if (impulse) {
        const member = entries.get(impulse.bodyId);
        if (!member) throw new Error('Unknown impulse body');
        point = { body: member.body, impulseWorldNs: nativeVector(impulse.impulseWorldNs), pointWorld: nativeVector(impulse.pointWorld) };
        validateImpulseResponse(member.body, point.impulseWorldNs, point.pointWorld, prepared.find(record => record.id === impulse.bodyId)!);
      }
      // Every member and optional effect has passed validation before the first native setter.
      writeNative(() => {
        for (const member of prepared) {
          member.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
          member.body.setLinvel(member.comVelocityWorldMps, true);
          member.body.setAngvel(member.angularVelocityWorldRadps, true);
        }
        if (point) point.body.applyImpulseAtPoint(point.impulseWorldNs, point.pointWorld, true);
        for (const member of prepared) assertNativeState(member.body);
      });
      mode = 'physics';
      return prepared.map(({ body, ...record }) => structuredClone(record));
    },
    destroy,
  };
}

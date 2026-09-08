import RAPIER from '@dimforge/rapier3d-compat';
import type { Rotation, Vec3 } from '../content/yardLayout.ts';
import { FIXED_DT as dt } from '../runtime/fixedStep.ts';

export type GripCommand = {
  // One fixed-tick sample: wanted is a level; acquire and throwPressed are
  // consumed event pulses. Adjacent true samples can represent distinct clicks.
  wanted: boolean; acquire: boolean; throwPressed: boolean;
  yaw: number; pitch: number; distanceDelta: number;
  rotateYaw: number; rotatePitch: number;
};
export type GripSnapshot = {
  status: 'idle' | 'ready' | 'holding' | 'blocked' | 'released' | 'thrown' | 'invalid';
  candidateId: string | null; heldId: string | null; mass: number | null;
  distance: number; target: Vec3 | null; impulse: number; torqueImpulse: number;
  joints: number; contacts: number;
  reason: 'none' | 'input' | 'range' | 'eye-overlap' | 'speed' | 'sight' | 'error' | 'released';
};
export const GRIP_LIMITS = Object.freeze({ range: 6, breakRange: 7.5, mass: 35,
  minDistance: 1.8, maxDistance: 5.5, maxError: 3, force: 350,
  acceleration: 22, torque: 25, speed: 12, angularSpeed: 8, throwSpeed: 8, throwImpulse: 40,
  targetSpeed: 6, targetAcceleration: 40 });
const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
const scale = (v: Vec3, n: number): Vec3 => ({ x: v.x * n, y: v.y * n, z: v.z * n });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const cap = (v: Vec3, maximum: number) => scale(v, Math.min(1, maximum / Math.max(1e-9, length(v))));
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
function multiply(a: Rotation, b: Rotation): Rotation {
  return { x: a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
    y: a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
    z: a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
    w: a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z };
}
function axisRotation(axis: Vec3, angle: number): Rotation {
  const s = Math.sin(angle / 2);
  return { ...scale(axis, s), w: Math.cos(angle / 2) };
}
function angularError(target: Rotation, current: Rotation): Vec3 {
  const q = multiply(target, { x: -current.x, y: -current.y, z: -current.z, w: current.w });
  const sign = q.w < 0 ? -1 : 1;
  const vector = { x: q.x * sign, y: q.y * sign, z: q.z * sign };
  const norm = length(vector);
  return scale(vector, 2 * Math.atan2(norm, Math.abs(q.w)) / Math.max(norm, 1e-9));
}
function pd(error: Vec3, velocity: Vec3, kp: number, kd: number): Vec3 {
  return scale(sub(scale(error, kp), scale(velocity, kd + kp * dt)), 1 / (1 + kd * dt + kp * dt * dt));
}

export function createGrip(world: RAPIER.World, bodies: ReadonlyMap<string, RAPIER.RigidBody>, player: RAPIER.RigidBody) {
  let held: { id: string; body: RAPIER.RigidBody; rotation: Rotation; radius: number; target: Vec3; targetVelocity: Vec3 } | null = null;
  let state: GripSnapshot = { status: 'idle', candidateId: null, heldId: null, mass: null,
    distance: 3, target: null, impulse: 0, torqueImpulse: 0, joints: 0, contacts: 0, reason: 'none' };
  const release = (status: GripSnapshot['status'] = 'released', reason: GripSnapshot['reason'] = 'released', keepHover = false) => {
    held = null;
    state = { ...state, status, reason, candidateId: keepHover ? state.candidateId : null,
      heldId: null, mass: null, target: null, impulse: 0, torqueImpulse: 0, contacts: 0 };
  };
  function step(eye: Vec3, command?: GripCommand): void {
    const valid = command && [command.yaw, command.pitch, command.distanceDelta, command.rotateYaw, command.rotatePitch, eye.x, eye.y, eye.z].every(Number.isFinite)
      && [command.wanted, command.acquire, command.throwPressed].every(value => typeof value === 'boolean');
    if (!valid) {
      release(command ? 'invalid' : 'idle', command ? 'input' : 'released'); return;
    }
    const direction = { x: -Math.sin(command.yaw) * Math.cos(command.pitch), y: Math.sin(command.pitch), z: -Math.cos(command.yaw) * Math.cos(command.pitch) };
    state.impulse = 0; state.torqueImpulse = 0; state.candidateId = null;
    const pick = world.castRay(new RAPIER.Ray(eye, direction), GRIP_LIMITS.range, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, player);
    const candidate = pick?.collider.parent();
    const entry = candidate && [...bodies].find(([, body]) => body.handle === candidate.handle);
    if (entry && candidate?.isDynamic() && candidate.mass() > 0 && candidate.mass() <= GRIP_LIMITS.mass) state.candidateId = entry[0];
    if (!command.wanted) release('idle', 'released', true);
    if (!held && command.wanted && command.acquire && entry && state.candidateId) {
      const body = entry[1];
      const collider = body.collider(0);
      // Current authored props have one centered collider. Bounding radius is
      // used only to keep the eye outside a held object, never as a sweep shape.
      const bounds = collider.shape;
      let radius = 0;
      if (bounds instanceof RAPIER.Cuboid) radius = length(bounds.halfExtents);
      else if (bounds instanceof RAPIER.Ball) radius = bounds.radius;
      else if (bounds instanceof RAPIER.Cylinder) radius = Math.hypot(bounds.radius, bounds.halfHeight);
      else { release('blocked'); return; }
      held = { id: entry[0], body, rotation: { ...body.rotation() }, radius,
        target: { ...body.translation() }, targetVelocity: { x: 0, y: 0, z: 0 } };
      state.distance = clamp(length(sub(body.translation(), eye)), Math.max(GRIP_LIMITS.minDistance, radius + 0.4), GRIP_LIMITS.maxDistance);
    }
    if (!held) {
      if (state.status === 'idle' || state.status === 'ready') state.status = state.candidateId ? 'ready' : 'idle';
      return;
    }
    const { body, radius } = held;
    const position = body.translation();
    const mass = body.mass();
    const fromEye = sub(position, eye);
    const eyeDistance = length(fromEye);
    if (eyeDistance > GRIP_LIMITS.breakRange) { release('released', 'range'); return; }
    if (eyeDistance < radius + 0.35) { release('released', 'eye-overlap'); return; }
    if (![...Object.values(position), ...Object.values(body.linvel()), ...Object.values(body.angvel())].every(Number.isFinite) ||
        length(body.linvel()) > GRIP_LIMITS.speed || length(body.angvel()) > GRIP_LIMITS.angularSpeed) { release('released', 'speed'); return; }
    const sight = world.castRay(new RAPIER.Ray(eye, scale(fromEye, 1 / eyeDistance)), eyeDistance, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, body.collider(0), player);
    if (sight) { release('blocked', 'sight'); return; }
    state.distance = clamp(state.distance + clamp(command.distanceDelta, -0.5, 0.5), Math.max(GRIP_LIMITS.minDistance, radius + 0.4), GRIP_LIMITS.maxDistance);
    const requestedTarget = add(eye, scale(direction, state.distance));
    // Look changes are checked at the current body's range. Wheel expansion
    // goes through the target slew instead of turning into a large aim jump.
    const aimAtCurrentRange = add(eye, scale(direction, Math.min(state.distance, eyeDistance)));
    if (length(sub(aimAtCurrentRange, position)) > GRIP_LIMITS.maxError ||
        length(sub(held.target, position)) > GRIP_LIMITS.maxError) { release('released', 'error'); return; }
    const targetError = sub(requestedTarget, held.target);
    const desiredTargetVelocity = cap(scale(targetError, 1 / dt), GRIP_LIMITS.targetSpeed);
    held.targetVelocity = add(held.targetVelocity, cap(sub(desiredTargetVelocity, held.targetVelocity), GRIP_LIMITS.targetAcceleration * dt));
    const targetAdvance = cap(scale(held.targetVelocity, dt), length(targetError));
    let target = add(held.target, targetAdvance);
    const displacement = sub(target, position);
    // Real collider shape and current rotation, translational sweep only.
    // stopAtPenetration=false permits moving upward from resting floor contact.
    const sweep = world.castShape(position, body.rotation(), displacement, body.collider(0).shape,
      0.015, 1, false, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, body.collider(0), player);
    if (sweep) {
      target = add(position, scale(displacement, Math.max(0, sweep.time_of_impact - 0.02)));
      held.targetVelocity = { x: 0, y: 0, z: 0 };
    }
    held.target = { ...target };
    if (command.throwPressed) {
      body.applyImpulse(scale(direction, Math.min(mass * GRIP_LIMITS.throwSpeed, GRIP_LIMITS.throwImpulse)), true);
      release('thrown'); return;
    }
    const acceleration = cap(add(pd(sub(target, position), body.linvel(), 90, 19), { x: 0, y: 9.81, z: 0 }), GRIP_LIMITS.acceleration);
    const impulse = cap(scale(acceleration, mass * dt), GRIP_LIMITS.force * dt);
    const yawRotation = axisRotation({ x: 0, y: 1, z: 0 }, clamp(command.rotateYaw, -0.12, 0.12));
    const pitchRotation = axisRotation({ x: Math.cos(command.yaw), y: 0, z: -Math.sin(command.yaw) }, clamp(command.rotatePitch, -0.12, 0.12));
    held.rotation = multiply(pitchRotation, multiply(yawRotation, held.rotation));
    const qLength = Math.hypot(held.rotation.x, held.rotation.y, held.rotation.z, held.rotation.w);
    held.rotation = { x: held.rotation.x/qLength, y: held.rotation.y/qLength, z: held.rotation.z/qLength, w: held.rotation.w/qLength };
    const angularAcceleration = cap(pd(angularError(held.rotation, body.rotation()), body.angvel(), 60, 15), 25);
    const inertia = body.effectiveAngularInertia();
    const angularImpulse = cap(scale({
      x: inertia.m11 * angularAcceleration.x + inertia.m12 * angularAcceleration.y + inertia.m13 * angularAcceleration.z,
      y: inertia.m21 * angularAcceleration.x + inertia.m22 * angularAcceleration.y + inertia.m23 * angularAcceleration.z,
      z: inertia.m31 * angularAcceleration.x + inertia.m32 * angularAcceleration.y + inertia.m33 * angularAcceleration.z,
    }, dt), GRIP_LIMITS.torque * dt);
    body.applyImpulse(impulse, true);
    body.applyTorqueImpulse(angularImpulse, true);
    state = { ...state, status: 'holding', reason: 'none', heldId: held.id, mass, target: { ...target }, impulse: length(impulse), torqueImpulse: length(angularImpulse) };
  }
  return {
    step,
    release(): void { release(); },
    snapshot(): GripSnapshot {
      let contacts = 0;
      if (held) {
        const collider = held.body.collider(0);
        world.contactPairsWith(collider, other => world.contactPair(collider, other, manifold => {
          for (let index = 0; index < manifold.numSolverContacts(); index++) {
            if (manifold.solverContactDist(index) <= 0.002) contacts++;
          }
        }));
      }
      return { ...state, target: state.target ? { ...state.target } : null, contacts,
        joints: world.impulseJoints.len() + world.multibodyJoints.len() };
    },
  };
}

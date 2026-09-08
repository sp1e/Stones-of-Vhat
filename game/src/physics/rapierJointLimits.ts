import RAPIER from '@dimforge/rapier3d-compat';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';

export type AngularLimit = { axis: 3 | 4 | 5; min: number; max: number };
export type AngularJointSpec = {
  kind: 'spherical' | 'generic';
  lockedMask: number;
  frame1: RigidTransform;
  frame2: RigidTransform;
  limits: readonly AngularLimit[];
};

/** Version-locked bridge to raw angular axes; public Rapier generic limits are absent. */
export function createAngularJoint(
  world: RAPIER.World,
  parent: RAPIER.RigidBody,
  child: RAPIER.RigidBody,
  spec: AngularJointSpec,
) {
  if (RAPIER.version() !== '0.20.0') throw new Error('Angular adapter requires Rapier 0.20.0');
  if (typeof world.impulseJoints.raw.jointSetLimits !== 'function') {
    throw new Error('Raw angular limit API unavailable');
  }
  if (parent === child || world.bodies.get(parent.handle) !== parent
    || world.bodies.get(child.handle) !== child) {
    throw new Error('Joint bodies must belong to this world');
  }

  const frame1 = rigid(spec.frame1), frame2 = rigid(spec.frame2);
  for (const frame of [frame1, frame2]) {
    if (!Object.values(frame.position).every(value => Number.isFinite(Math.fround(value)))) {
      throw new Error('Joint frame position must be representable as finite float32');
    }
  }
  if (spec.kind !== 'generic' && spec.kind !== 'spherical') throw new Error('Unsupported joint kind');
  if (!Number.isInteger(spec.lockedMask) || spec.lockedMask < 0 || spec.lockedMask > 63) {
    throw new Error('Invalid locked-axis mask');
  }
  if (spec.kind === 'spherical' && spec.lockedMask !== 7) {
    throw new Error('Spherical joints require translation-locked mask 7');
  }

  const seen = new Set<number>();
  const limits = spec.limits.map(limit => {
    if (![3, 4, 5].includes(limit.axis)) throw new Error('Invalid raw angular axis');
    if (seen.has(limit.axis)) throw new Error('Duplicate angular axis');
    seen.add(limit.axis);
    if (!Number.isFinite(limit.min) || !Number.isFinite(limit.max) || limit.min > limit.max
      || limit.min < -Math.PI || limit.max > Math.PI) {
      throw new Error('Invalid angular bounds');
    }
    return { ...limit };
  });

  const descriptor = spec.kind === 'spherical'
    ? RAPIER.JointData.spherical(frame1.position, frame2.position)
    : RAPIER.JointData.generic(frame1.position, frame2.position, { x: 1, y: 0, z: 0 }, spec.lockedMask);
  const joint = world.createImpulseJoint(descriptor, parent, child, true);
  try {
    joint.setLocalFrame1(frame1.position, frame1.rotation);
    joint.setLocalFrame2(frame2.position, frame2.rotation);
    joint.setContactsEnabled(false);
    for (const limit of limits) {
      world.impulseJoints.raw.jointSetLimits(joint.handle, limit.axis, limit.min, limit.max);
    }
    const readLimits = () => limits.map(limit => {
      if (!joint.isValid()) throw new Error('Joint destroyed');
      const raw = world.impulseJoints.raw;
      if (!raw.jointLimitsEnabled(joint.handle, limit.axis)) throw new Error('Angular limit was not enabled');
      return {
        axis: limit.axis,
        min: raw.jointLimitsMin(joint.handle, limit.axis),
        max: raw.jointLimitsMax(joint.handle, limit.axis),
      };
    });
    for (const [index, actual] of readLimits().entries()) {
      const expected = limits[index]!;
      if (Math.abs(actual.min - expected.min) > 1e-6 || Math.abs(actual.max - expected.max) > 1e-6) {
        throw new Error('Angular limit readback mismatch');
      }
    }
    return { joint, readLimits };
  } catch (error) {
    world.removeImpulseJoint(joint, true);
    throw error;
  }
}

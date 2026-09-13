import { Quaternion, Vector3 } from 'three';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import { FIXED_DT } from '../src/runtime/fixedStep.ts';

export const dt = FIXED_DT;
export const identity = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
export const vec = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const pose = (position = vec(), rotation = identity) => ({
  position: { ...position },
  rotation: { ...rotation },
});
export const axisAngle = (axis, angle) => {
  const value = new Quaternion().setFromAxisAngle(
    new Vector3(axis.x, axis.y, axis.z).normalize(),
    angle,
  );
  return { x: value.x, y: value.y, z: value.z, w: value.w };
};

const endpoint = (worldEpoch, bodyId, bodyPose, shape, localPose) => ({
  bodyOriginWorld: structuredClone(bodyPose),
  comLocal: vec(),
  comWorld: { ...bodyPose.position },
  comVelocityWorldMps: vec(),
  angularVelocityWorldRadps: vec(),
  authority: 'physics',
  massKg: 1,
  sleeping: false,
  colliders: [{
    ref: { worldEpoch, bodyId, colliderId: 'target' },
    role: 'blocker',
    localPose: structuredClone(localPose),
    shape: structuredClone(shape),
  }],
});

export function intervalFixture({
  points,
  rotations = points.map(() => identity),
  offsets = points.map((_, index) => index * dt / (points.length - 1)),
  shape = { kind: 'ball', radius: .1 },
  localPose = pose(),
  worldEpoch = 'query-epoch',
  fromTick = 10,
} = {}) {
  if (points.length !== offsets.length || points.length !== rotations.length) {
    throw new Error('Fixture point, rotation, and offset counts must match');
  }
  const bodyId = 'target-body';
  const samples = points.map((point, index) => ({
    offsetS: offsets[index],
    bodies: [{
      ref: { worldEpoch, bodyId },
      endpoint: endpoint(worldEpoch, bodyId, pose(point, rotations[index]), shape, localPose),
    }],
  }));
  return {
    worldEpoch,
    kind: 'completed',
    fromTick,
    toTick: fromTick + 1,
    dtS: dt,
    bodies: [{
      ref: { worldEpoch, bodyId },
      from: structuredClone(samples[0].bodies[0].endpoint),
      to: structuredClone(samples.at(-1).bodies[0].endpoint),
      discontinuities: [],
    }],
    nativeTrace: { kind: 'measured-native-boundaries', samples },
  };
}

export function motionFixture(options) {
  return createContactMotion(intervalFixture(options));
}

export function castFixture({
  start = vec(-1),
  end = vec(1),
  rotation = identity,
  shape = { kind: 'ball', radius: .1 },
  worldEpoch = 'query-epoch',
  fromTick = 10,
  castId = 'cast-1',
  projectileId = 'projectile-1',
} = {}) {
  return {
    worldEpoch,
    fromTick,
    toTick: fromTick + 1,
    castId,
    projectileId,
    shape: structuredClone(shape),
    startPose: pose(start, rotation),
    endPosition: { ...end },
  };
}

export function targetRef(motion) {
  return motion.colliders()[0].ref;
}

export function transformPointLocal(worldPose, worldPoint) {
  const q = new Quaternion(
    worldPose.rotation.x,
    worldPose.rotation.y,
    worldPose.rotation.z,
    worldPose.rotation.w,
  ).normalize().conjugate();
  const value = new Vector3(
    worldPoint.x - worldPose.position.x,
    worldPoint.y - worldPose.position.y,
    worldPoint.z - worldPose.position.z,
  ).applyQuaternion(q);
  return { x: value.x, y: value.y, z: value.z };
}

export function obbSeparation(a, b) {
  const axes = [vec(1), vec(0, 1), vec(0, 0, 1)];
  const qa = new Quaternion(a.rotation.x, a.rotation.y, a.rotation.z, a.rotation.w).normalize();
  const qb = new Quaternion(b.rotation.x, b.rotation.y, b.rotation.z, b.rotation.w).normalize();
  const aa = axes.map(axis => new Vector3(axis.x, axis.y, axis.z).applyQuaternion(qa));
  const bb = axes.map(axis => new Vector3(axis.x, axis.y, axis.z).applyQuaternion(qb));
  const delta = new Vector3(
    b.position.x - a.position.x,
    b.position.y - a.position.y,
    b.position.z - a.position.z,
  );
  const tests = [...aa, ...bb, ...aa.flatMap(axis => bb.map(other => axis.clone().cross(other)))];
  let separation = -Infinity;
  for (const axis of tests) {
    if (axis.lengthSq() < 1e-24) continue;
    axis.normalize();
    let radius = 0;
    for (let index = 0; index < 3; index += 1) {
      radius += a.half[index] * Math.abs(axis.dot(aa[index]));
      radius += b.half[index] * Math.abs(axis.dot(bb[index]));
    }
    separation = Math.max(separation, Math.abs(delta.dot(axis)) - radius);
  }
  return separation;
}

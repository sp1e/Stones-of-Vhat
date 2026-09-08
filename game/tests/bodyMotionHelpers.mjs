// game/tests/bodyMotionHelpers.mjs
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
export const zero = { x: 0, y: 0, z: 0 };
export const identity = { x: 0, y: 0, z: 0, w: 1 };
export const dt = 1 / 60;
export const q = (axis, angle) => {
  const v = new Quaternion().setFromAxisAngle(new Vector3(...axis), angle);
  return { x: v.x, y: v.y, z: v.z, w: v.w };
};
export const pose = (position = zero, rotation = identity) => ({ position: { ...position }, rotation: { ...rotation } });
export const vecNear = (a, b, epsilon = 1e-6) => assert.ok(
  Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z) <= epsilon,
  `${JSON.stringify(a)} differs from ${JSON.stringify(b)} by more than ${epsilon}`,
);
export const angle = (a, b) => {
  const qa = new Quaternion(a.x,a.y,a.z,a.w).normalize();
  const qb = new Quaternion(b.x,b.y,b.z,b.w).normalize();
  return 2*Math.acos(Math.min(1,Math.abs(qa.dot(qb))));
};
export const poseNear = (a,b,p=1e-6,r=1e-6) => {
  vecNear(a.position,b.position,p);
  assert.ok(angle(a.rotation,b.rotation)<=r, `rotation error ${angle(a.rotation,b.rotation)}`);
};
export const finite = value => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `nonfinite ${value}`);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) finite(item);
};
export const withoutEpoch = value => {
  if (Array.isArray(value)) return value.map(withoutEpoch);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'worldEpoch').map(([key,item]) => [key,withoutEpoch(item)]));
  return value;
};

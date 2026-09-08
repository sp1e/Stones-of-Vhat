import R from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import assert from 'node:assert/strict';
import { createArmFixture } from '../src/physics/armFixture.ts';

const vec = p => new Vector3(p.x, p.y, p.z);
const quat = q => new Quaternion(q.x, q.y, q.z, q.w).normalize();
const originalStep = R.World.prototype.step;
let recording = false, samples = [];
function capture(world) {
  const result = [];
  world.forEachCollider(collider => {
    const body = collider.parent();
    if (!body?.isDynamic()) return;
    result.push({ handle: collider.handle, bodyPosition: body.translation(), bodyRotation: body.rotation(),
      localPosition: collider.translationWrtParent(), localRotation: collider.rotationWrtParent(),
      colliderPosition: collider.translation(), colliderRotation: collider.rotation() });
  });
  return result.sort((a, b) => a.handle - b.handle);
}
R.World.prototype.step = function (...args) {
  if (recording && !samples.length) samples.push(capture(this));
  const result = originalStep.apply(this, args);
  if (recording) samples.push(capture(this));
  return result;
};
const results = [];
try {
  for (const phase of [30, 264]) {
    const fixture = await createArmFixture();
    try {
      fixture.setActive(true);
      for (let i = 0; i < phase; i++) fixture.step();
      const initial = fixture.snapshot();
      fixture.handoff({ worldEpoch: initial.worldEpoch, atTick: initial.tick, impulse: null });
      let maxCenterErrorM = 0, maxCornerErrorM = 0, maxAngleErrorRad = 0, centerWorst = null, cornerWorst = null;
      let nativeSteps = 0;
      for (let outer = 0; outer < 60; outer++) {
        samples = [];
        recording = true;
        fixture.step();
        recording = false;
        assert.equal(samples.length, 9);
        nativeSteps += 8;
        for (let inner = 1; inner < 8; inner++) for (let colliderIndex = 0; colliderIndex < 2; colliderIndex++) {
          const start = samples[0][colliderIndex], end = samples[8][colliderIndex], actual = samples[inner][colliderIndex];
          assert.equal(start.handle, actual.handle);
          assert.equal(start.handle, end.handle);
          const bodyQ = quat(start.bodyRotation).slerp(quat(end.bodyRotation), inner / 8);
          const predictedQ = bodyQ.clone().multiply(quat(start.localRotation));
          const predictedCenter = vec(start.bodyPosition).lerp(vec(end.bodyPosition), inner / 8)
            .add(vec(start.localPosition).applyQuaternion(bodyQ));
          const actualCenter = vec(actual.colliderPosition), actualQ = quat(actual.colliderRotation);
          const centerError = predictedCenter.distanceTo(actualCenter);
          if (centerError > maxCenterErrorM) { maxCenterErrorM = centerError; centerWorst = { outer: outer + 1, inner, colliderIndex }; }
          maxAngleErrorRad = Math.max(maxAngleErrorRad, predictedQ.angleTo(actualQ));
          for (const x of [-.2, .2]) for (const y of [-.045, .045]) for (const z of [-.045, .045]) {
            const corner = new Vector3(x, y, z);
            const error = corner.clone().applyQuaternion(predictedQ).add(predictedCenter)
              .distanceTo(corner.applyQuaternion(actualQ).add(actualCenter));
            if (error > maxCornerErrorM) { maxCornerErrorM = error; cornerWorst = { outer: outer + 1, inner, colliderIndex }; }
          }
        }
      }
      results.push({ phase, outerIntervals: 60, nativeSteps, maxCenterErrorM, centerWorst, maxCornerErrorM, cornerWorst, maxAngleErrorRad });
    } finally { recording = false; fixture.destroy(); }
  }
} finally { R.World.prototype.step = originalStep; }
assert.equal(R.World.prototype.step, originalStep);
assert.ok(results.every(r => Number.isFinite(r.maxCenterErrorM) && r.maxCenterErrorM > .001));
console.log(JSON.stringify({ version: R.version(), methodology: 'Actual existing World.step observations only; no body writes or solver changes. Compare interior poses to outer body-origin lerp + shortest quaternion SLERP composed with fixed local collider pose. Normalize native float32 quaternions before interpolation and angleTo.', results, assertions: 'PASS' }, null, 2));

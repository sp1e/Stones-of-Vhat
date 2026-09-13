// Read-only adjacent-proxy diagnostic for the future authored severing fixture.
// This does not remove a joint or prove a post-cut instability.
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { createArmFixture } from '../src/physics/armFixture.ts';

const reports = [];
let destroyedWorlds = 0;
for (const phase of [0, 1, 30, 90]) {
  const arm = await createArmFixture();
  try {
    arm.setActive(true);
    for (let tick = 0; tick < phase; tick++) assert.equal(arm.step(), true);
    const snapshot = arm.snapshot();
    const segments = ['upper-arm', 'forearm'].map(bodyId => {
      const segment = snapshot.segments.find(entry => entry.ref.bodyId === bodyId);
      const body = snapshot.interval.bodies.find(entry => entry.ref.bodyId === bodyId);
      const shape = body?.to.colliders.find(entry => entry.ref.colliderId === 'shape')?.shape;
      assert.ok(segment && shape?.kind === 'box');
      return {
        pose: segment.colliderWorld,
        native: new RAPIER.Cuboid(shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2),
      };
    });
    const [upper, lower] = segments;
    const contact = upper.native.contactShape(
      upper.pose.position, upper.pose.rotation,
      lower.native, lower.pose.position, lower.pose.rotation, .1,
    );
    assert.ok(contact && Number.isFinite(contact.distance));
    assert.deepEqual(arm.snapshot(), snapshot);
    assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
    reports.push({ phase, signedDistanceM: contact.distance, counts: arm.counts() });
  } finally {
    arm.destroy();
    assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
    destroyedWorlds++;
  }
}
console.log(JSON.stringify({
  scope: 'read-only current adjacent proxy geometry; no joint removal or severing acceptance',
  source: 'current working-tree arm fixture; record revision and dirty state separately',
  destroyedWorlds,
  reports,
}, null, 2));

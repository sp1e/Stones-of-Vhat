// Supplemental phase survey, not a replacement for retained controller/browser gates.
// Setup deliberately advances each fresh owner. All casts use the real controller.
import assert from 'node:assert/strict';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createArmSlicer } from '../src/lab/armSlicer.ts';

const cases = [];
let completedTeardownBlocks = 0;
for (const handoffTick of [1, 30, 57, 90]) for (const physicalAge of [0, 1, 4, 12, 30]) {
  for (const speed of [16, 40]) for (const blade of ['horizontal', 'vertical']) {
    const arm = await createArmFixture();
    let slicer;
    try {
      slicer = await createArmSlicer(arm);
      arm.setActive(true);
      for (let tick = 0; tick < handoffTick; tick++) assert.equal(slicer.step(), true);
      const atHandoff = arm.snapshot();
      const com = atHandoff.segments.find(segment => segment.ref.bodyId === 'forearm').comWorld;
      arm.handoff({
        worldEpoch: atHandoff.worldEpoch, atTick: atHandoff.tick,
        impulse: { bodyId: 'forearm', impulseWorldNs: { x: 1.8, y: 0, z: 0 },
          pointWorld: { ...com, y: com.y + .02 } },
      });
      for (let tick = 0; tick < physicalAge; tick++) assert.equal(slicer.step(), true);
      const born = arm.snapshot();
      assert.equal(born.tick, handoffTick + physicalAge);
      assert.equal(born.mode, 'physics');
      assert.equal(born.handoff.tick, handoffTick);
      if (physicalAge > 0) assert.equal(born.lastPhysicsStep.nativeSteps, 8);
      else assert.equal(born.lastPhysicsStep, null);
      const center = born.segments.find(segment => segment.ref.bodyId === 'forearm').colliderWorld.position;
      assert.ok(slicer.enqueue({ blade,
        startPosition: { ...center, z: center.z + .6 },
        velocityMps: { x: 0, y: 0, z: -speed }, lifetimeTicks: 30,
      }));
      let record;
      for (let age = 0; age < 30; age++) {
        assert.equal(slicer.step(), true);
        record = slicer.read().recent[0];
        if (record) break;
      }
      assert.ok(record, 'bounded cast must terminate or expire');
      assert.equal(record.birthTick, born.tick);
      assert.equal(record.family.candidates.length, 4);
      assert.deepEqual(record.family.candidates.map(candidate => candidate.identity.target)
        .sort((a, b) => a.bodyId.localeCompare(b.bodyId)),
      ['floor', 'forearm', 'upper-arm', 'wall'].map(bodyId => ({
        worldEpoch: born.worldEpoch, bodyId, colliderId: 'shape',
      })));
      assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
      cases.push({ handoffTick, physicalAge, speed, blade, kind: record.kind,
        target: record.selectedCollider?.bodyId ?? null, ageTicks: record.ageTicks,
        terminalIntervalNativeCalls: record.family.nativeCalls,
        frontier: record.family.frontier.map(ref => {
          const candidate = record.family.candidates.find(item => {
            const target = item.identity.target;
            return target.worldEpoch === ref.worldEpoch && target.bodyId === ref.bodyId
              && target.colliderId === ref.colliderId;
          });
          assert.ok(candidate, 'frontier reference must resolve to its full candidate');
          return { body: ref.bodyId, kind: candidate.kind, reason: candidate.reason ?? null };
        }),
      });
    } finally {
      try { slicer?.destroy(); }
      finally { arm.destroy(); }
      completedTeardownBlocks++;
    }
  }
}
const counts = {};
for (const row of cases) counts[row.kind] = (counts[row.kind] ?? 0) + 1;
console.log(JSON.stringify({ cases: cases.length, completedTeardownBlocks, counts,
  nonHits: cases.filter(row => row.kind !== 'hit'),
  physicalAgeZero: cases.filter(row => row.physicalAge === 0),
}, null, 2));

// Retain the read-only boundary-born trajectory diagnostic for later live-cast work.
// This is not the unfinished owner batch, a frame benchmark, or a visible spell.
import assert from 'node:assert/strict';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createContactMotion } from '../src/physics/contactMotion.ts';
import { createContactPairQuery } from '../src/physics/contactPairQuery.ts';
import { resolveContactFamily } from '../src/physics/contactFamily.ts';
import { FIXED_DT } from '../src/runtime/fixedStep.ts';

const query = await createContactPairQuery();
const orientations = [
  { name: 'horizontal', size: [.12, .01, .12] },
  { name: 'vertical', size: [.01, .12, .12] },
];
const reports = [];
let destroyedWorlds = 0;

for (const birthTick of [1, 30, 90]) for (const physical of [false, true]) {
  for (const speed of [16, 40]) for (const orientation of orientations) {
    const arm = await createArmFixture();
    try {
      arm.setActive(true);
      for (let tick = 0; tick < birthTick; tick += 1) assert.equal(arm.step(), true);
      const born = arm.snapshot();
      assert.equal(born.tick, birthTick);
      const forearm = born.segments.find(segment => segment.ref.bodyId === 'forearm');
      assert.ok(forearm);
      let position = { ...forearm.colliderWorld.position, z: forearm.colliderWorld.position.z + .6 };
      if (physical) {
        assert.equal(arm.queueHandoff({
          worldEpoch: born.worldEpoch,
          atTick: born.tick,
          impulse: {
            bodyId: 'forearm', impulseWorldNs: { x: 1.8, y: 0, z: 0 },
            pointWorld: { ...forearm.comWorld, y: forearm.comWorld.y + .02 },
          },
        }), true);
      }
      const castId = `boundary-${birthTick}-${physical}-${speed}-${orientation.name}`;
      const stepReports = [];
      let terminal;
      for (let age = 1; age <= 30; age += 1) {
        assert.equal(arm.step(), true);
        const snapshot = arm.snapshot();
        const counts = arm.counts();
        assert.equal(snapshot.interval.fromTick, birthTick + age - 1);
        assert.equal(snapshot.tick, birthTick + age);
        const motion = createContactMotion(snapshot.interval);
        const refs = motion.colliders().map(collider => collider.ref);
        assert.deepEqual(refs.map(ref => ref.bodyId), ['floor', 'forearm', 'upper-arm', 'wall']);
        const endPosition = { ...position, z: position.z - speed * FIXED_DT };
        const cast = {
          worldEpoch: born.worldEpoch,
          fromTick: motion.fromTick, toTick: motion.toTick,
          castId, projectileId: `${castId}-blade`,
          shape: { kind: 'box', size: [...orientation.size] },
          startPose: { position: { ...position }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          endPosition,
        };
        const candidates = refs.map(ref => query(motion, cast, ref));
        const family = resolveContactFamily({
          identity: {
            worldEpoch: cast.worldEpoch, fromTick: cast.fromTick, toTick: cast.toTick,
            castId: cast.castId, projectileId: cast.projectileId,
          },
          expectedBlockers: refs,
        }, candidates);
        assert.deepEqual(arm.snapshot(), snapshot, 'query must not change the current owner');
        assert.deepEqual(arm.counts(), counts);
        assert.ok(family.nativeCalls <= 512, 'four bounded pair queries at most');
        assert.ok(candidates.every(candidate => candidate.kind !== 'initial-blocked'), 'clear boundary muzzle/control');
        stepReports.push({
          age, tick: snapshot.tick, kind: family.kind, calls: family.nativeCalls,
          candidates: candidates.map(candidate => ({ body: candidate.identity.target.bodyId, kind: candidate.kind })),
        });
        if (family.kind !== 'clear') {
          terminal = family.kind === 'hit'
            ? { kind: 'hit', target: family.hit.identity.target.bodyId, age,
              secondsAfterBirth: (age - 1) * FIXED_DT + family.hit.upperS }
            : { kind: family.kind, age };
          break;
        }
        position = endPosition;
      }
      terminal ??= { kind: 'expired', age: 30 };
      assert.equal(terminal.kind, 'hit', castId);
      assert.equal(terminal.target, 'forearm', castId);
      reports.push({
        birthTick, mode: physical ? 'physics-with-ui-impulse' : 'animation', speedMps: speed,
        orientation: orientation.name, terminal, steps: stepReports,
        totalNativeCalls: stepReports.reduce((sum, step) => sum + step.calls, 0),
      });
    } finally {
      arm.destroy();
      assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
      destroyedWorlds += 1;
    }
  }
}
assert.equal(reports.length, 24);
assert.equal(destroyedWorlds, 24);
console.log(JSON.stringify({
  scope: 'boundary-born complete-family trajectory diagnostic; not native-performance, visible UI, damage or severing acceptance',
  source: 'current working-tree modules at execution; record Git revision and dirty state separately',
  cases: reports.length, destroyedWorlds, reports,
}, null, 2));

# Rapier raw angular-limit diagnostic

Date: 2026-09-08. Runtime: installed `@dimforge/rapier3d-compat` **0.20.0**. Baseline gameplay source: `b4c6a06`; Grip changes were being implemented separately and are not imported by this diagnostic.

## Outcome and scope

The raw API can impose angular limits on the tested spherical/generic joint in rotated local frames. **Generic joint masks describe locked axes in observed 0.20.0 behavior**, despite installed comments calling them free axes. This is a useful version-specific failure shield, not full B01/P01/P02 ragdoll acceptance or a reason to switch engines.

The read-only physics worker ran 24 meaningful cases: spherical/generic, three angular axes, positive/negative torque, limited/unlimited. The coordinator independently reran three generic AngX cases (limited mask 7, unlimited mask 7, unlimited mask 56) and reproduced the distinction. No production source, dependency, asset, desktop package or security setting changed for this probe. Transient worlds were created in memory and freed in `finally`.

## Fixture and observed measurements

- Fixed parent at the origin; 1 kg dynamic ball, radius 0.2 m, starting at `(0.5, 0, 0)`.
- Parent anchor zero; child anchor `(-0.5, 0, 0)`; both joint frames rotated +90 degrees about Z.
- No gravity. Connected-body contacts disabled. 600 fixed steps at 1/60 s.
- Applied torque magnitude 0.02 N m through per-step impulses. Limited interval +/-0.3 rad.
- Angular excursion measured by accumulated shortest quaternion increments projected onto the intended world axis; anchor error measured from the transformed child anchor to parent origin.

Worker measurements below matched between spherical and the corrected generic mask to the shown precision, for both torque signs:

| Local/raw angular axis | World torque direction | Limited peak absolute angle (rad) | Unlimited accumulated angle (rad) | Limited peak angular speed (rad/s) |
| --- | --- | --- | --- | --- |
| AngX / 3 | +Y | 0.30001 | 3.76151 | 0.2118 |
| AngY / 4 | -X | 0.30000 | 62.59929 | 0.8542 |
| AngZ / 5 | +Z | 0.30001 | 3.76151 | 0.2118 |

Final limited angles were +/-0.30000 rad. Maximum limited anchor error was approximately 3e-7 m in this simple scene. Transforms and velocities remained finite. Explicit world freeing is not a measured memory-leak result.

| Generic mask | Translation | Rotation |
| --- | --- | --- |
| 0 | Free | Free |
| LinX \| LinY \| LinZ = 7 | Locked | Free |
| AngX \| AngY \| AngZ = 56 | Free | Locked |
| 63 | Locked | Locked |

The initial mask-56 angular control did not rotate. That was an invalid limit demonstration, not a successful constrained-joint result. Changing to mask 7 allowed the unlimited control to move and made the limited comparison meaningful. Coordinator raw outputs for local AngX/world Y: limited mask 7 `0.30000000165297935` rad; unlimited mask 7 `3.7615141677763937` rad; unlimited mask 56 approximately `3.46e-24` rad.

## Reproduction core

Run this diagnostic from `game/` using `rtk proxy node --input-type=module -e` with the code as its argument. It is a query/solver experiment, not a gameplay adapter or automated chapter test.

```js
import R from '@dimforge/rapier3d-compat';
await R.init();
const dt = 1 / 60;
const zero = { x: 0, y: 0, z: 0 };
const anchor = { x: -0.5, y: 0, z: 0 };
const frame = { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 };
for (const [mask, limited] of [[7, true], [7, false], [56, false]]) {
  const world = new R.World(zero);
  world.timestep = dt;
  try {
    const parent = world.createRigidBody(R.RigidBodyDesc.fixed());
    const child = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0.5, 0, 0));
    world.createCollider(R.ColliderDesc.ball(0.2).setMass(1), child);
    const joint = world.createImpulseJoint(
      R.JointData.generic(zero, anchor, { x: 1, y: 0, z: 0 }, mask), parent, child, true,
    );
    joint.setLocalFrame1(zero, frame);
    joint.setLocalFrame2(anchor, frame);
    joint.setContactsEnabled(false);
    if (limited) world.impulseJoints.raw.jointSetLimits(joint.handle, 3, -0.3, 0.3);
    for (let step = 0; step < 600; step++) {
      child.applyTorqueImpulse({ x: 0, y: 0.02 * dt, z: 0 }, true);
      world.step();
    }
    const q = child.rotation();
    console.log({ version: R.version(), mask, limited,
      angleY: 2 * Math.atan2(q.y, q.w), position: child.translation(), angular: child.angvel() });
  } finally { world.free(); }
}
```

For a single spherical case use `JointData.spherical(zero, anchor)` with the same local frames/raw limit. The worker's full matrix varied raw axes 3/4/5, corresponding world torque +Y/-X/+Z and torque sign. The compact coordinator reproduction above does not itself reproduce the matrix's peak/accumulated-angle measurements.

`R.version()` returned `0.20.0`; `R.RawJointAxis` is absent. The worker read back enabled limits with float32 bounds about -0.3000000119/+0.3000000119. A future adapter must version-check and validate actual API behavior, not assume this raw enum is exported.

## Still open before rigg approval

Combined axes and swing/twist coupling, anatomical cone shape, dynamic-parent mass ratios, strong impacts, gravity/full chains, motors against limits, animated pose and velocity transfer, contact filtering after sever, skinning and packaged assets remain untested here. The next B01 implementation needs behavioral RED/GREEN tests for that adapter and the actual representative rig, followed by ordered independent reviews. None of the 26 chapter acceptance IDs is marked complete by this diagnostic.

Sources: [research technical dossier](../../research/deep-research/2026-09-08/technical-dossier.md), installed `dist/dynamics/impulse_joint.d.ts` and WASM bindings, the read-only worker's executed matrix and the coordinator's independently executed reproduction. The final research reports remain unchanged; this new observation is deliberately recorded outside them.

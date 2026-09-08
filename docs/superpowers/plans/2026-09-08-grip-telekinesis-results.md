# M1B-1 Grip results

## Current delivery stage

Physics core implemented and ready for independent review. Browser input, session setting, main lifecycle wiring and presentation are planned but not implemented at this checkpoint. This is not yet a playable Grip browser delivery.

Owned implementation files: `game/src/physics/grip.ts`, `game/src/physics/yard.ts`, `game/tests/grip.test.mjs`. The plan is `2026-09-08-grip-telekinesis.md`. No staging, commit, desktop build, executable launch, dependency change, publication or deployment performed by the implementation worker.

## Observed RED and GREEN

- Initial `rtk proxy node --test tests/grip.test.mjs`: 15 tests, 14 failed, 1 passed. Thirteen failures were behavioral missing-Grip assertions (aimed real body expected held ID `prop`, actual `undefined`, or missing null snapshot). One test could not import the not-yet-created controller. The render-grouping test passed vacuously; it was immediately strengthened to require actual acquisition and a throw.
- Additional RED command using `--test-name-pattern='35 kg|authored stone collider|held prop collides|identical fixed'`: all four failed on missing Grip acquisition before production implementation.
- First implemented core run: 15/18 passed, strict TypeScript passed. Rapid repeated wheel input released at distance 5.3 instead of reaching 5.5. This was corrected by evaluating large look changes at the body's current range while wheel movement passes through the bounded target filter.
- Two fixture assumptions were corrected without changing production physics: the sphere can keep rolling after release, so the test now bounds energy using release kinetic energy plus available gravitational energy; the step sweep intentionally leaves a margin, so the fixture adds rotation to generate actual physical contacts while remaining held.
- Added explicit sleeping-barrel snapshot assertion first failed (`undefined` versus `true`), then the detached `sleeping` field was implemented using Rapier `isSleeping()`.
- `rtk proxy node --test tests/grip.test.mjs`: 18/18 passed, 0 failures, approximately 0.49 s runner duration.
- `rtk proxy npm run check`: TypeScript passed, 50/50 native tests passed, 0 failures, approximately 1.29 s native runner duration.
- `rtk git diff --check`: passed.
- Independent spec review found the first corner fixture contacted only its side wall. Per-obstacle real Rapier assertions reproduced RED (`actual end-wall contact ticks: 0`) before correction. Moving the end wall from z=2.3 to z=2.6 produced side-only 59 contact ticks; corner 39 side-wall and 87 end-wall contact ticks while continuously held. Maximum measured solver-contact penetration was 0 m in both cases. The corrected test asserts both surfaces separately and a 25 mm penetration ceiling; no controller change was needed.
- Independent quality review identified a minor stale-hover status. A focused test reproduced `ready !== idle` after aiming away. The fix clears candidate metadata on missing/invalid input and explicit release, recomputes ready/idle for current aim, and preserves a current valid hover when the grip button is released. `rtk proxy npm run check` then passed strict TypeScript and 51/51 native tests (19 Grip tests).

The RTK wrapper prints a pre-existing missing-hook notice. No runtime error or TypeScript warning was observed in the final checks.

## Physics tuning and measurements

Current hypotheses: 35 kg eligibility, 6 m acquire range, 7.5 m break range, 1.8–5.5 m hold distance, 3 m error release, 350 N total force cap, 22 m/s² acceleration cap including gravity assistance, 25 N·m torque cap, 40 N·s throw budget with desired velocity increment 8 m/s. Target movement is limited to 6 m/s and 40 m/s². The controller uses fixed 1/60 s impulses and world-space inertia for torque; no accumulating forces, integral term, prop teleport, prop rotation overwrite or kinematic conversion is used.

Measured with identical 0.6 m cubic props, settled first, then aimed pickup and level hold. Values are simulation measurements from the current runtime, not human ratings of weight or final tuning:

| Mass kg | Peak force N | Peak speed m/s | Height after 1 s | Height after 2 s | Height after 4 s | Force-cap ticks in 20 s | Throw velocity increment m/s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5 | 11.00 | 3.383 | 1.614 | 1.624 | 1.624 | 0 | 8.000 |
| 2 | 44.00 | 3.383 | 1.614 | 1.624 | 1.624 | 0 | 8.000 |
| 10 | 220.00 | 3.383 | 1.614 | 1.624 | 1.624 | 0 | 4.000 |
| 15 | 330.00 | 3.383 | 1.614 | 1.624 | 1.624 | 0 | 2.667 |
| 18 | 350.00 | 3.183 | 1.611 | 1.624 | 1.624 | 16 | 2.222 |
| 35 | 350.00 | 0.600 | 0.447 | 0.770 | 1.622 | 199 | 1.143 |

The starting cube center was approximately 0.3 m above the floor. The 35 kg envelope lifts slowly because 350 N is only slightly greater than its weight. Mass-proportional assistance intentionally makes lighter free responses similar until a cap saturates. The authored 18 kg barrel uses a separate cylinder test and is verified sleeping before pickup; it remains gripped and lifts above 1.1 m.

Tests also verify nearest geometry selection, fixed-wall/overweight/range rejection, actual plank wall/corner contacts while held, step contacts while rotating, capsule separation, finite motion during repeated aim reversals, 90/180-degree release, detached state, one-shot throws, release without latent commands, and ten clean world lifecycles with zero joints. `contacts` counts solver contacts with distance at most 2 mm after simulation, not merely potential broad-phase pairs. Range and sight loss are tested separately with unchanged velocity and zero new impulse on the release step.

Identical commands at the same 240 simulation steps produce exactly equal current-runtime snapshots when grouped as 30, 60 and 144 Hz render frames. This does not claim bit-identical replay across platforms or builds.

## Browser and image evidence

No new browser Grip acceptance or active-Grip image exists at the core checkpoint. The coordinator verified the prior six browser regressions before this implementation; they have not yet been rerun with the new core by this worker. Browser integration follows ordered core review.

## Limits and subsequent work

Center-of-mass control and conservative center-to-eye line of sight are intentional for the current loose props. Actual collider/current-orientation sweeps cover translational target motion; bounded torque and Rapier contacts handle rotation, and this is not a proof of continuous rotational swept clearance. The controller has no joined-chain support or final subjective weight validation. Shared Focus, projectile contact, pose-transfer/joint experiments, skinned-arm/export spikes, NPC/gore presentation, historical environment, all of P03/M1B, desktop repackaging and publication are outside this checkpoint.

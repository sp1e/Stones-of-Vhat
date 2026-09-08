# M1B-1 Grip results

## Current delivery stage

The PC browser Grip slice is complete and independently approved. Physics core was committed as `1bb5bfe`; browser input, the session setting, lifecycle wiring, held presentation and the final pulse-contract correction are included in the browser-stage delivery. The final state passes strict TypeScript, 57 native tests, all nine browser cases, production build, visual inspection and independent spec/quality review.

Owned implementation files include the physics core, `game/src/input/gripInput.ts`, `game/src/input/browserInput.ts`, `game/src/main.ts`, `game/src/render/yardView.ts`, `game/src/style.css`, `game/index.html`, `game/tests/gripInput.test.mjs` and `game/browser/yard.spec.mjs`. The plan is `2026-09-08-grip-telekinesis.md`. This document accompanies the browser-stage delivery commit. No desktop build, executable launch, dependency change, remote publication or deployment was performed.

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
- Browser-stage RED preceded production changes: `rtk proxy node --test tests/gripInput.test.mjs` failed 4/4 on the missing `createGripInput` function. The three new focused browser cases failed 3/3 on missing detached diagnostics (`undefined !== null`), with the game otherwise starting successfully.
- Initial browser-stage GREEN: four input tests passed, strict TypeScript and 55 native tests passed, and all three focused browser Grip cases passed in 77.29 s. Their durations were 17.98 s for interactions/toggle, 16.09 s for release/focus/pointer-lock lifecycle and 42.72 s for ten warmed Grip restarts.
- Self-review added a pre-acquisition-primary regression: it failed `true !== false` before changing the throw input condition from desired grip to confirmed holding. The five input tests and all 56 native tests subsequently passed with strict TypeScript. The click edge is consumed and cannot become a delayed throw after acquisition.
- `rtk proxy npm run test:browser`: 9/9 passed, zero failures, 130.01 s total. This includes all six prior browser regressions and the three new Grip cases.
- Visual polish moved the tether origin 0.4 m in front of the camera instead of keeping its first endpoint on the camera plane and raised opacity from 0.55 to 0.8. The same line geometry/material are reused. The focused interaction/capture test passed again in 18.61 s; the latest capture visibly shows the line. No physics or input changed after the full nine-case suite.
- The coordinator independently reran the complete final browser suite after tether polish: 9/9 passed, zero failures, 106.46 s total; the warmed ten-Grip-restart case took 44.00 s. This verifies the final visual implementation with all six baseline and three new browser cases. The coordinator also independently observed strict TypeScript plus 56 native tests passing and inspected the final visible tether capture.
- `rtk proxy npm run build`: strict TypeScript and Vite build passed, 18 modules. Output JS is approximately 3.401 MB minified / 1.235 MB gzip. Vite reports its existing large-chunk advisory; no dependency was added or chunking claim made.
- Final `rtk git diff --check`: passed. Self-review confirmed no per-frame GPU resource allocation, additional asset, mutable diagnostics, gore codec change, or out-of-scope desktop change.
- Final spec review found a cross-input/core contract mismatch: a failed acquisition followed by a distinct right click on the next physics tick produces adjacent `acquire=true` pulses, which the core incorrectly treated as a held button level. A new real input-buffer-to-Rapier regression reproduced `null !== 'prop'` before the fix. The core now consumes acquisition/throw pulses directly; physical-button edge suppression remains in the input buffer, and `wanted` remains the continuous level. Both hold and toggle consecutive-click cases pass, as do existing one-shot-throw and no-latent-reacquisition tests. Strict TypeScript and all 57 native tests pass. The subsequent production build also passes, with the same pre-existing chunk-size advisory.
- Independent targeted spec recheck passed: all 25 physics/input tests plus the reviewer's original 8 kg hold/toggle reproduction and extended checks passed. Post-fix focused browser rerun passed all three Grip cases in 76.80 s (interaction 17.93 s, held-release/focus 15.70 s, ten warmed restarts 42.52 s). Production remains unchanged during the fresh quality review and coordinator's final full-browser rerun.
- The coordinator's complete final post-pulse browser rerun passed 9/9 with zero failures in 105.78 s; the warmed ten-Grip-restart case took 43.09 s. This is evidence for the final implementation, including the corrected pulse contract.
- Final independent spec review: PASS after the consecutive-click correction. Final independent quality review: APPROVE, no actionable findings; 25 focused physics/input tests, an additional EventTarget routing/disposal probe, diff checks and production diagnostics stripping all passed. No production changes followed these approvals.

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

The actual capture is [active Grip](../../../game/.playtest/grip-active.png). The implementer and coordinator inspected the 1440×900 image: the stone is visibly lifted and highlighted, the crosshair remains clear and the compact upper-right hint does not overlap the brand. The final capture has a clear, fine gold tether from the lower-right grip origin to the held stone; its earlier camera-plane origin was visually ineffective.

Focused browser acceptance uses real Playwright mouse/keyboard events and detached readonly snapshots: hold/acquire, wheel distance, R+mouse torque rotation with unchanged camera, throw, failed-pickup look recovery, toggle throw followed by next-click acquisition, real right-button release and falling, pause, synthetic window blur, real `document.exitPointerLock()`, menu inactivity, independent saved gore=false, and session-only Grip toggle reset on reload. A separate warmed-tether case acquires before recording GPU counts and then repeats acquisition/restart ten times with equal GPU and physics counts, zero joints and one canvas. All three cases assert zero page errors, console errors, failed requests and HTTP error responses.

## Limits and subsequent work

Center-of-mass control and conservative center-to-eye line of sight are intentional for the current loose props. Actual collider/current-orientation sweeps cover translational target motion; bounded torque and Rapier contacts handle rotation, and this is not a proof of continuous rotational swept clearance. The controller has no joined-chain support or final subjective weight validation. Shared Focus, projectile contact, pose-transfer/joint experiments, skinned-arm/export spikes, NPC/gore presentation, historical environment, all of P03/M1B, desktop repackaging and publication are outside this checkpoint.

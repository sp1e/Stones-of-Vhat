# Native motion history and paused arm inspection

Date: 2026-09-13. Project: Stones of Vhat (legacy technical paths: Vadstena/Game1).

## Acceptance boundary

This increment is a prerequisite for B02a moving-target contact, not the full contact query. It captures actual outer-owner native boundaries and derives read-only historical render frames. It does not expose the solver's continuous path, internal CCD subdivisions, a complete humanoid, cutting, gore or accepted gameplay projectiles.

The normal courtyard and its physics/Grip input remain unchanged. The arm retains eight existing 1/480-second native steps inside one 1/60-second authoritative physical interval; animation/bootstrap retain one 1/60 step. Solver settings, impulses, torque and physical acceptance thresholds are not loosened.

## Accepted core and arm capture

- `20d9cf5`: bounded atomic trace core, independent SPEC PASS and QUALITY APPROVE, parent strict/native 113/113 PASS (15.236 s).
- `bf1910b`: actual arm-native capture and detached binding/anchor snapshot fields. Writer observed the expected missing-trace RED 0/2 before production; combined arm/trace GREEN 15/15. Independent SPEC repeated 15/15 (75.419 s), including 59 physical phases with `failed: []`; ordered QUALITY ran focused 2/2 and typecheck. Parent strict/native 115/115 PASS (52.924 s).
- `003a657` and `1ece98c`: pure historical body/bone/collider/COM/anchor derivation. Missing-function RED then focused GREEN; exact-output-key RED then removal of unneeded metadata. Independent SPEC PASS and QUALITY APPROVE; parent focused 1/1 PASS (1.539 s). Supplementary read-only quality controls exercised deriving after owner destruction, reordered body entries, missing/mismatched sample data, frozen input and detached output mutation.

The publisher retains sample zero plus at most 16 native boundaries. Offsets are finite, strictly increasing and bounded by the fixed outer interval; the final sample must match the completed endpoint before atomic publication. Failed validation preserves the prior publication; the arm owner tears down on fatal capture failure. Snapshots and trace data are detached. Sample zero may reflect a boundary handoff without replacing the previous interval's `from` endpoint.

Rotation equality uses comparison-only normalized quaternion sign equivalence with a reviewed 2e-7 chord tolerance. This accommodates observed native float32 setter normalization, while nonrotation fields remain exact. It is not a relaxation of the physical/contact gates; original captured endpoint values are retained.

## UI and integrated acceptance

Task 4 implements default-collapsed controls, explicit historical banner/time, current metrics labeled current, frame selection only while paused, no physics/tick mutation, and cleared selection after live/resume/reset/handoff/context loss/pagehide. Mere blur while already paused preserves the selected historical view. Six reusable axes distinguish body, animation frame and collider at lengths 12/18/24 cm, with their GPU resources prewarmed in live mode and explicitly disposed on teardown.

Writer evidence on the final source:

- Missing inspector RED 0/1 (range count 0 versus 1), then feature GREEN 1/1.
- Paused-blur regression RED 0/1 (selection wrongly cleared), then GREEN after removing the over-broad generic pause clear.
- Visual-fit RED 0/1 (expanded sidebar taller than 900 px), then GREEN after compacting only the expanded panel. All labels, metrics, controls, caveats and footer remain visible at 1440×900; sidebar width is 330 px with approximately 1110 px of scene remaining. The default closed layout remains unchanged.
- Final full arm browser suite **5/5 PASS**, zero failures/skips, 54.28 s; strict typecheck PASS. Actual context loss/recovery and reset preserve GPU counts and one canvas.

Independent final SPEC PASS followed actual code and screenshots. Review tightened the movement assertion to compare historical segment geometry rather than whole frames whose timestamps necessarily differ. No source/visual specification finding remains. Parent independently inspected zero/middle captures after the fit correction: full panel/live control, explicit current-versus-historical labeling, measured time and visible axes; pose changes over half of one 1/60 interval are subtle, not dramatic motion.

Parent final native suite **116/116 PASS**, zero failures/skips, 99.470 s. Final `npm run build` (strict typecheck plus production build) passed, retaining the existing large-chunk warning: approximately 3,407 kB JavaScript before gzip. The normal production entry excludes the dev lab; the dedicated browser assertion checks that boundary.

Final ordered **QUALITY APPROVE** followed code, cross-layer ownership/lifecycle inspection and direct review of the corrected images. Parent combined browser regression **14/14 PASS**, zero failures/skips, **218.596 s**, exit 0: all nine existing courtyard/Grip cases and all five arm cases. The synthetic unavailable-WebGL case intentionally logged the expected context-creation error and passed its recovery assertions; this is not an unexpected production failure. Parent reopened both final-run images (same live tick 190; sample 0 at 3.150000 s versus sample 4 at 3.158333 s): complete expanded controls/footnote, visible time/banner/axes and unchanged current metrics. Test-owned browsers and servers closed.

**This bounded native-history/paused-inspection increment is accepted.** It does not close the full B02a query or chapter. Screenshot/SwiftShader evidence is not hardware FPS acceptance. No Windows rebuild/launch or website deployment was performed.

## Trace cost observation — not an FPS benchmark

Parent ran three real-arm Node trials after phase-30 handoff without an impulse, each measuring 600 physical outer ticks plus one snapshot per tick (4,800 native steps). Elapsed times: 2118.532 /1737.721 /2581.614 ms. This includes detailed trace capture and detached snapshot copying. Prior pre-trace observations were 268.714 /182.480 /184.449 ms, from a different run/day; they do not establish a controlled ratio or isolate causes.

The additional cost is material. Before scaling to multiple actors, measure the real frame budget, identify capture/copy cost and preserve the atomicity/purity contracts while optimizing. No browser FPS, shipping-hardware target or full-game performance gate is claimed by these observations.

## Publication

The user created public `sp1e/Stones-of-Vhat` and authorized uploading the project. The initial GitHub README was preserved in merge `d960d00`; source/test/documentation history, including Claude's pinned `20d9cf5` base, was uploaded. Project setup and reviewed frame adapter are published through `425b0ed` at the time of this record. Later UI work needs its own verification and publication checkpoint.

Final publication checkpoint: accepted inspector source/results **0d4d1a22558a238120bbe546bb0a93d9a43af095** was pushed without force and verified on both `main` and `codex/vadstena-runtime-foundation`. This following documentation update records that completed outcome. A fresh local dev preview serves both yard and arm lab at port 5173, separately HTTP-verified; it is not a website deployment.

Only tracked project files/history were included. Dependencies, generated builds/executables and the untracked local research working cache were not uploaded. A bounded independent publication audit found no blocker in 98 tracked paths, 206 unique file blobs and 43 commits at `dc713bd`; this is neither comprehensive security certification nor blanket clearance to redistribute source images/models.

## Reproduction

From the implementation worktree's `game` directory:

```powershell
rtk proxy node --test tests/nativeMotionTrace.test.mjs tests/armNativeTrace.test.mjs tests/armLabTrace.test.mjs
rtk proxy npm run check
rtk proxy npm run build
rtk proxy node --test browser/armLab.spec.mjs
```

Do not run overlapping browser suites from the Claude worktree on the same test ports. Windows packaging/launch, Defender changes and website deployment are outside this increment.

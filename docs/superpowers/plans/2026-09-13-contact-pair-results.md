# Contact pair query — bounded acceptance and CPU observation

2026-09-13. Accepted implementation after ordered independent SPEC PASS and fresh QUALITY APPROVE, followed by coordinator verification. Source: `game/src/physics/contactPairQuery.ts`; retained tests/helpers: `game/tests/contactPairQuery.test.mjs` and `contactPairFixtures.mjs`. Dependency: accepted constant-rate motion compiler12b4a36. Exact contract: `2026-09-13-contact-pair-query-plan.md`.

## What is implemented

One cast-locked box/ball projectile against one moving box/ball blocker over a completed1/60s interval. The query uses detached native-boundary motion and real Rapier `Shape.contactShape`, without a live world, handle lookup, stepping or historical restoration. An async factory lazily initializes the native module; queries themselves are synchronous.

Output distinguishes miss, initial-blocked, hit bracket with detached contact-time world/local geometry, and conservative inconclusive. The first uncertainty survives all motion spans. Bracket travel integrates every span's bound. Fixed limits are unchanged:50µm empirical guard,1mm maximum uncertainty including two guards,128 native calls per pair,32m whole-geometry coordinate domain,128m/s projectile-origin speed. No initial-blocked/inconclusive result exposes cutting geometry.

This does not choose the first of several colliders, deliver damage, sever anatomy, spawn gore, create a projectile or demonstrate a visible spell. The subsequent family-ordering plan and owner/lifecycle integration remain required.

## Honest TDD and review history

The writer observed the missing-query RED before implementation, followed by actual advancement/preflight and budget checked-through regressions. Initial14/14 focused and typecheck passing were **not acceptance**: independent SPEC found three issues.

1. Terminal75µm positive separation was newly latched as uncertain although the completed interval was proved clear. Full endpoint handling now precedes creation of a new uncertainty latch. Earlier genuine uncertainty is still retained.
2. Eager module-import Rapier initialization could reject before the caller invoked/awaited the factory. Parent independently reproduced the unhandled rejection by intercepting `WebAssembly.instantiate` in an isolated subprocess. Lazy shared initialization is now created inside the async factory; retained subprocess controls cover no import initialization, concurrent calls, synchronous and asynchronous failure. An initial attempt to assign readonly `RAPIER.init` failed with TypeError and was not valid failure evidence.
3. The original Z36 regression's22-call gate had accidentally become23 and lacked the frozen0.4mm bracket assertion. Original gates are restored; production already met them. No numerical acceptance threshold was widened.

Those corrections began with targeted3/3 RED. One intermediate assertion wrongly expected the endpoint itself despite an earlier uncertainty latch; it was corrected as a test expectation, not reported as an additional production defect. Retained nonidentity frame checks were subsequently strengthened from duplicate inverse formulas to independent forward Matrix4 point/Matrix3 normal reconstruction, without normalizing away output errors. Final SPEC PASS was followed by a fresh QUALITY review, with no further source changes requested.

## Final coordinator evidence

Commands run from `game`, using the required RTK wrapper:

- `rtk proxy node --test tests/contactPairQuery.test.mjs`: **18/18 PASS**, zero failures/skips,4502.4357ms on final source/tests.
- `rtk proxy npm run check`: strict TypeScript and **155/155 native tests PASS**, zero failures/skips,35451.7627ms. Includes the unchanged59-phase arm handoff stability sweep and all existing runtime/Grip/trace controls.
- `rtk proxy npm run build`: **PASS**, Vite build519ms. Existing3,407.42kB minified main chunk advisory remains; no warning threshold or dependency changed.
- `rtk git diff --check`: PASS before staging. Exact staged paths and whitespace are checked again when committing.

Retained numerical results (metres unless labeled):

| Control | Result | Maximum native calls | Maximum TOI-position error | Maximum bracket travel |
| --- | --- | --- | --- | --- |
| Z36 at0/+31/−31 |99hits,9misses|22|0.00012844029550117264m|0.00040000000000001146m|
| Cast-locked general3D36 at0/+31/−31 |99hits,9misses|23|0.00014958135379095072m|0.00040000000000006697m|
| Analytic moving balls |bracket contains analytical first crossing|14|checked by time bracket|0.0003m|
| Large wall/floor and10mmwall, in-domain shifts |hits, matched misses and initial block correct|≤7 for hit controls|analytical bracket checks|within fixed gate|

The table's approximately0.0004m is **0.4mm**, not0.4m. General3D passes the unchanged0.15mm position-error gate narrowly; it does not justify widening it. Maximum nonidentity forward frame-reconstruction error is1.249000902703301e-16. Saved eight-span physical arm results remain identical after owner destruction. Querying leaves the live snapshot, tick and body/collider/joint counts unchanged.

All small two-span latch adversaries retain earlier uncertainty and return inconclusive-width; the larger grazing controls consume128 calls and return inconclusive-budget. A budget result is not a miss. `checkedThroughS` is the last evaluated time, which can precede a conservative next possible-contact time after an advance.

The independent QUALITY reviewer also ran a read-only seeded diagnostic of1500 two-span real-Rapier ball pairs: seed913, LCG1664525*x+1013904223, translations0/+29/−29, radii0.5mm..0.2m. An independent quadratic relative-line/sphere reference found830hits,623misses,32inconclusives,15initial blocks; no missed analytic crossing, hit bracket excluding first crossing, or inconclusive earliest time later than crossing. Maximum128calls. This supplemental probe was executed by the reviewer, **not retained as an automated test or independently rerun by the coordinator**; its reproduction recipe is in the review transcript. It is supplementary, not a replacement for the retained suites.

## Reproducible CPU observation, not FPS acceptance

New parent diagnostic `game/scripts/benchmark-contact-pair.mjs` received read-only review. It captures and destroys the real arm before all timing, verifies zero remaining bodies/colliders/joints, and reuses detached motion. Per workload: one baseline invocation,20explicit warmups,80timed samples. Stability checks sit outside timers. Review corrected the even-sample median to the mean of the two middle observations and clarified caller-side costs; the corrected script was rerun after native/build gates, without a competing test suite.

Reproduce: `rtk proxy node scripts/benchmark-contact-pair.mjs`. Recorded environment: Nodev24.16.0,win32x64,AMD Ryzen AI7PRO350 with Radeon860M. Other machine work remains uncontrolled. Times include caller target lookup/cloning/output arrays, pair preflight, motion sampling, native contacts, result allocation and incidental GC; arm case reuses refs. They exclude initialization, world capture/step, motion compilation, ordering, rendering and result assertions.

| Workload | Native calls per sample | Median ms | P95 ms | Maximum ms |
| --- | --- | --- | --- | --- |
| Analytic moving ball |14|0.11620|0.58300|3.48560|
| One exhausting graze |128|0.56685|0.81150|0.90420|
| Four independent exhausting pairs |512|2.01910|2.42420|3.09730|
| Complete four-collider captured arm |30|0.20575|0.36740|0.86860|

These are bounded end-to-end Node workload observations, not isolated native-contact timings, comparable wrapper costs, browser/Electron/whole-frame timings or60fps acceptance. The512-call case repeats the same grazing geometry with four distinct cast/projectile IDs; it is not a complete-world family. A provisional512-call shared lab-tick ledger is a future conservative work ceiling informed by this observation, not a proven hardware frame budget.

The real complete-arm case is an important ordering negative control: floor miss9calls; forearm hit8calls at roughly3.996..3.999ms; **upper-arm initial-blocked at0,1call**; wall hit12calls at13.165..13.169ms. The horizontal projectile starts inside the upper arm. A global query must stop at0, not select the later forearm. The visible lab must use a genuinely clear muzzle for a valid forearm-first shot; silently excluding the upper arm is not an acceptable fix.

## Remaining limitations and next implementation

Evidence is for the declared constant-rate interpolation model with an empirical float32 guard, not a certified continuous native-solver trajectory or arbitrary brief-graze guarantee. Frozen double OBB SAT controls use dense sampling/bisection and share the authored pose evaluator; they do not independently certify interpolation. Full-city broad phase/query-local coordinates are outside the32m lab domain and must not constrain Claude's environment design.

Installed Rapier's high-level contact wrapper frees temporary native allocations on successful calls but lacks `finally` around a genuine internal native exception. Prototype-injected outer failures test result classification/restoration, not that internal cleanup. No genuine WASM failure/leak was reproduced; no raw-wrapper/vendor/dependency patch is made or safety certification claimed.

Next: exact complete-declared-family ordering with no arbitrary tie winner, then an independently owner-bound candidate wrapper/shared fixed-tick work ledger and cast identity/lifecycle. Only after those gates, render the Slicer contact-time geometry and verify actual browser interaction/resources. Symmetric player/NPC injury, swords, ragdolls and default-on gore remain approved downstream features, not implemented by this numerical foundation.

No browser acceptance run is required or claimed for this nonvisual module. No Windows rebuild/launch, Defender setting, website deployment, engine change, environment edit or personal-memory update occurred. Publication of accepted source is recorded separately from local validation.

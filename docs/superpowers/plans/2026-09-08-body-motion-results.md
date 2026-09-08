# Body motion / pose handoff — execution evidence

Date: 2026-09-08. Status: **bounded core implemented, independently spec/quality reviewed and native-verified**, not full B01 acceptance. Baseline `45832f7` had strict types and 57/57 native tests freshly verified by the coordinator. Final core strict/native gate is **76/76 PASS** (57 prior +19 core); the browser/build chronology and scope are explicit below. The arm/adapter/lab has separate acceptance.

## Scope and allocation

Core implementation follows [the reviewed executable plan](2026-09-08-body-motion-handoff.md): rigid nonidentity bone/body bindings, sampled COM and world angular velocity, detached adjacent motion intervals, epoch-bound identity and in-place animation-to-physics ownership transfer. The normal Grip snapshot, controls and body counts are preserved. The later procedural arm, raw joint adapter and dev-only lab have their own stage; no NPC, full ragdoll, gore presentation or engine choice is implied here.

`body_core_implementation` was the sole core production writer; coordinator owns diagnostics/status and independently checks behavior. Separate spec and quality reviews have passed. All native engine evidence uses the installed Rapier compat 0.20.0, no dependency changes.

## Observed test-first sequence (implementer report)

- Rigid math: 3/3 missing-export assertion failures, then 3/3 pass. An additional unsafe terminal tick assertion failed before the endpoint safe-integer guard was corrected.
- Interval/identity: 4/4 missing-API failures, then pass. Scoped interval/yard/Grip suite 32/32 plus strict types passed.
- Authority: three existing mathematical tests remained green while three new handoff/queued-target/fatal-owner assertions failed; after implementation 6/6 passed.
- Real offset-COM multi-member lifecycle and matched point-impulse integration passed immediately after the implementation. This is additional integration coverage, **not** a newly observed RED.
- Huge/subnormal finite quaternion cases produced a targeted RED. Robust max-component normalization fixed overflow/underflow rather than allowing a zero quaternion from finite inputs.
- Physical-world membership, object aliases and caller-mutated registration records received failing regressions before corrections. Exact halfturn q/-q also failed (+188.495559 versus -188.495559 rad/s), then passed with a deterministic lexicographic axis tie at w=0. The true rotation direction at exactly pi cannot be recovered from two samples; the canonical tie only removes representation dependence.

The writer's first full stable core checkpoint passed strict checking and 70/70 native tests (57 prior +13 core). This predates the subsequent native float32 safety finding below and is not the final acceptance count.

## Parent review refinements and reproduction

Before production implementation the parent required both adjacent ticks to be safe integers, finite computed velocities, rejection of a current-boundary handoff when the next animation targets are queued, and a required owning-world fatal callback. Ordinary validation errors leave every member untouched; unexpected native setter failure destroys the controller and requires owner teardown so no partially changed world is published.

The parent independently created two simultaneously live worlds with one body/ball each, giving equal native numeric handles. Registering world B's body/collider under world A was accepted by the initial contains(handle) implementation, and the published origin incorrectly came from B at x=9. Exact cached object membership was available: worldA.getRigidBody(handle) equaled A's body but not B's. This is a real ownership defect, not a synthetic physics result; failing regressions now cover exact body/collider membership, aliases and caller-owned record mutation. Both diagnostic worlds were freed. The independent spec reviewer inspected the corrected ownership guards.

Independent spec review reused `grip_ui_spec` after the runtime rejected a fresh agent spawn with its thread-limit error; the reviewer did not implement this core. It independently verified the exact-halfturn correction on all three axes and inspected intervals, yard preservation, lifecycle and reference membership. It then found a native-bound numerical issue: finite JavaScript 1e40 animation positions/impulses overflow Rapier float32 silently. Additional representable-input controls also overflowed: mass 1e-10 with impulse 1e30; and mass 1 with impulse 1e30 at lever distance 1e30. These produced Infinity/NaN without throwing, bypassing a throw-only fatal handler.

The writer corrected this test-first with native float32 representability and derived-impulse bounds before any setter, plus post-write poison detection and owner teardown. While kinematic, Rapier's effective inverse mass/world inertia are zero; preflight instead uses actual inverse mass and a conservative maximum inverse-principal-inertia times L1 torque bound. This may reject extreme cancelling inputs and is explicitly a numerical safety boundary, not a gameplay balance clamp. The reviewer independently agreed with the spectral/L1 derivation. Seven invalid two-member preflight cases leave current/next native poses and velocities unchanged, with zero fatal callbacks; actual native poisoning after bypassed scheduling invokes owner teardown. The publisher rejects nonfinite COM/localCOM/velocities/mass without replacing its last interval. Writer stable numeric-fix gate: strict **73/73 native**, scoped **16/16**; final independent recheck is pending.

## Parent normal-browser regression

`rtk proxy npm run test:browser`: **9/9 PASS**, 186.239 s, run on the core snapshot while the pure authority edge-case review proceeded. This includes movement/preferences/restarts, pointer-lock denial, actual WebGL loss, nested production base with diagnostics stripped, watcher exclusions, real full-Chromium BFCache, and all three actual-input Grip cases. The suite's production builds passed. All test-owned servers and browsers closed normally. SwiftShader functional/resource results do not constitute hardware FPS acceptance; this is not yet the final arm/lab regression.

## Bounded publication-cost diagnostic

The coordinator compared the committed pre-core yard from `45832f7` with the current yard in one Node process, alternating order for four rounds. Each world ran 200 warm-up idle steps followed by 3,000 measured steps, with 21/21 bodies/colliders and finally-based destruction. Baseline source was loaded directly from Git, its TypeScript stripped in memory and imports resolved to the same installed dependencies; no source or dependency files were edited.

Per-step means in microseconds, rounds 0–3: baseline 41.176, 15.867, 15.280, 19.629; current 83.133, 71.743, 76.748, 73.145. Excluding the first warm-up-sensitive round, detached publication adds roughly 0.06 ms per idle physics tick in this tiny native fixture. This is an explicit cost observation, **not** browser render timing, hardware FPS, representative NPC performance or a chapter budget pass. It does not isolate the cause of browser-suite duration variation.

## Final ordered reviews and core gate

Independent spec reviewer `grip_ui_spec`: **PASS**, 16/16 scoped tests plus six independent real-Rapier numeric reproductions rejected before any current/next state mutation. Its three-axis exact-halfturn controls also passed.

Subsequent independent quality reviewer `grip_ui_quality` found three additional material defects, each retained as a failing regression before correction:

- Ordinary native quaternion rounding caused 15 of 40 unchanged Z-angle handoffs to fail their movement check. Normalize both quaternions in the geodesic comparison; retain the original 1e-5 threshold. All 40 now pass.
- Pose authority accepted the same physical body under two valid authored IDs, unlike the publisher. It now rejects native-body aliases before mutation.
- The generic isKinematic check admitted velocity-based kinematics, for which setNextKinematic targets are ineffective. Construction and each live animation/handoff operation now require KinematicPositionBased; no new velocity-based path is implied.

Final quality verdict **APPROVE**, no remaining actionable findings. Reviewer independently ran 19/19 scoped tests (0.768 s), strict types, yard diff whitespace check and 16 extra axis/sign/unchanged-versus-moved controls. Reviews were read-only and ordered.

Final coordinator `rtk proxy npm run check`: **strict +76/76 PASS**, native 2288.698 ms. The coordinator's production build passed earlier in this core increment (3,404.99 kB JS / 1,236.66 kB gzip, existing size advisory), and normal browser regression passed 9/9 as described above. The later pure authority review fixes have fresh strict/native coverage; the combined arm/lab stage will run the full post-integration build/browser gate again. Do not mislabel that forthcoming gate as already run.

Core file inventory: `game/src/physics/poseBinding.ts`, `bodyMotion.ts`, minimal `yard.ts` integration, `game/tests/bodyMotionHelpers.mjs`, `poseBinding.test.mjs`, `bodyMotion.test.mjs`; reviewed core plan and this evidence document accompany them. Next: execute the separately reviewed arm/adapter/lab plan, preserve the normal yard and retain all 76 native cases.

No desktop build/launch, Defender mutation, website publication, package installation or personal-memory update is part of this work. User-owned research work/source cache is preserved.

## Subsequent completed arm integration

Core implementation is committed as `4bbb42c`. The separately accepted [arm stage](2026-09-08-arm-lab-results.md) eventually required its preregistered eight native physical substeps per authoritative 1/60 interval after genuine phase failures. Only the owner comments on `completeStep` and `capture` were clarified to describe authoritative integration batches; no core behavior changed. The normal yard still uses its existing native step.

Fresh coordinator final combined gates on that frozen integration: **strict +104/104 native PASS** (19.472 s), **web build PASS**, **13/13 browser PASS** (168.918 s). Final independent arm spec and quality reviews approved, with a separate 759-phase dense physical diagnostic. These subsequent gates supersede the earlier pending combined-validation note, while retaining its chronological evidence. B01a is complete at the bounded core/arm level; full B01 and the chapter remain open.

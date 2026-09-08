# Procedural arm and joint lab — execution evidence

Date: 2026-09-08. Status: **B01a arm implemented and locally accepted: independent SPEC PASS /QUALITY APPROVE, strict 104/104 native PASS, fresh 13/13 browser PASS and web build PASS**. The failed four-step candidate and its earlier 103/13 gates remain historical evidence below. This is a bounded two-segment B01a fixture, not full B01, a humanoid ragdoll, anatomical cone or severing engine.

## Provenance and scope

- Core baseline: `4bbb42c`, stable identity/completed intervals/pose authority, independent spec then quality PASS, parent strict 76/76 native PASS.
- Reviewed [arm/joint/lab plan](2026-09-08-arm-joint-lab.md) and [original diagnostic controls](2026-09-08-arm-contact-probe-results.md) preserved in `5047564`.
- Fresh `arm_lab_implementation` is the sole writer for nine new source/test/HTML/CSS files. Parent owns this results file, handoff, index and final gates; no normal yard or core changes belong to the arm writer.
- Installed Rapier compat 0.20.0 and Three 0.185.1 retained. Authoritative outer step remains 1/60. The original arm used maxCcdSubsteps=4 and four solver iterations; the reviewed correction below explicitly changes only arm integration/settings. The normal yard's settings/counts/controls remain unchanged.

## Observed RED/GREEN

Writer observed 14 missing-adapter failures, then 14 real-engine passes; seven missing-arm-API failures, then seven passes. A subsequent native float32 frame-overflow assertion failed before its adapter guard was added. Cross-world membership and complete preallocation validation remain covered. The detached snapshot / no public handles / point-impulse-once integration test passed immediately and is not falsely labeled RED.

The initial native arm checkpoint had 15 adapter tests and eight arm tests (**23/23 PASS** independently rerun by `arm_lab_spec`, 828 ms). The 12 axis/sign matrix tests compare 24 actual limited/unlimited worlds. Generic masks 7 and 56 have explicit rotational and translational controls; a locked joint cannot masquerade as a working limit. Later regression counts and final results are recorded chronologically below.

Browser feature absence produced RED (missing lab data-fixture); normal production exclusion already passed and is reported as a guard. The writer's first complete lab browser run passed **4/4**, 21.21 s. Formatting/final freeze and parent full regression are separate pending gates.

## Original measured contact and energy controls (before phase correction)

All rows run 600 physical ticks at 1/60 s. The original authored control remains unstepped before its first torque impulse, with independent initial mechanical energy 44.685 J. It does not refresh native mass caches to alter first-tick behavior. Input-work allowance uses angular speeds immediately before and after torque impulses, before contacts/integration.

| Case | Peak anchor mm | Peak penetration mm | Projected X / Y rad | Peak speed m/s | Peak omega rad/s | Wall ticks | Wall impulse Ns | Max positive energy excess J |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| Limited authored control, internal budget 4 | 0.717706 | 0.655031 | 0.355597 / 0.388038 | 4.792970 | 18.329600 | 571 | 13.381190 | 0 |
| Matched unlimited control, budget 4 | 1.297815 | 0.415254 | 1.642964 / 1.974633 | 4.794990 | 15.444140 | 566 | 5.860335 | 0 |
| Bound animated arm, transfer +1.8 Ns off-COM impulse | 2.380562 | 0.494537 | 0.355519 / 0.363046 | 4.891068 | 27.235356 | 577 | 68.051824 | 0 |

Unchanged gates: 5 mm anchor/penetration; limited projected X/Y <=0.40 rad with both moving >0.01; unlimited both >0.60; speed <=12 m/s; omega <=50 rad/s; mechanical energy <= initial energy + absolute torque-work allowance +5 J. The bound variant's initial post-impulse mechanical energy is 45.810006 J; peak subsequent sampled mechanical energy 44.683120 J. Positive excess is initialized at zero; zero means no measured positive excess, not exact energy conservation.

The default-budget negative control still shows **20.286311 mm** anchor error and correctly fails the physical acceptance bound. Its test passes by detecting that bad configuration. The production adapter/diagnostic path has small numeric differences from the earlier transient probe (for example 0.717706 versus 0.801046 mm limited peak); preserve both measurements instead of claiming byte-identical trajectories. Both meet the same locked gate. The deeper engine reason for the internal-budget effect remains unresolved.

Joint-frame projections are not anatomical swing/twist. Penetration is negative solver-contact distance, not a deepest-overlap oracle. Contact counts are sampled solver contact activity, not unique persistent contact identities. Total wall impulse sums sampled native normal impulses.

## Identity, handoff and lifecycle

Two persistent position-kinematic segments use nonidentity bone/body binds and actual offset collider COMs; after completed animation history they change in place to dynamic. Full fixture count stays four bodies, four colliders, one joint (two arm segments plus fixed floor/wall). Total segment mass stays 3 kg. Immediate pose, bone and COM limits remain 2 mm/1 degree, sampled velocities within 2e-5, mass within 1e-6 kg.

Tests cover unchanged references, local offsets, ownership revocation, one contact-point impulse, detached records, no handle leaks, current boundary queues, stale epochs, pause clearing, repeated destruction in animation/physics, fatal second-setter teardown and exact same-command 30/60/144 render grouping. The independent spec reviewer additionally mutated a caller-owned queued command after submission: the detached owned command still transferred once, both arm members alone gained the authority discontinuity, and a new fixture had a new epoch.

## Actual visual inspection

Writer and parent each opened all six generated PNGs, not just their filenames:

- `game/.playtest/arm-lab-before.png`: visible warm-colored segments, COM/anchor markers, paused animation ownership.
- `game/.playtest/arm-lab-handoff.png`: same camera and visible paused pose, physics ownership, transfer disabled; no rest-pose snap.
- `game/.playtest/arm-lab-contact.png`: arm visibly on the floor after a run with real wall contact/positive impulse history; displayed gap/penetration remain bounded.
- `game/.playtest/arm-lab-reset.png`: initial state after ten resets at 1024×700; primary controls are visible, lower explanatory text remains scrollable in the sidebar.
- `game/.playtest/arm-lab-context-restored.png`: actual WebGL loss/restoration returns visible paused geometry/markers; no automatic simulation resume.
- `game/.playtest/arm-lab-boot-recovered.png`: explicit reload recovers from deliberately injected unavailable WebGL. This is synthetic boot-failure coverage, not a claim of naturally occurring hardware failure.

The fixed camera is on the arm side of the wall. Geometry is deliberately plain diagnostic geometry, not final arm art or a medieval environment. The lab is a separate development entry; normal production must exclude its HTML and code. Screenshots are ignored reproducible local artifacts, not committed game assets.

## Independent quality finding: user-selected animation phase

The final stable-file spec review passed, including 23/23 native tests and independent queue/COM/native-failure probes. The subsequent independent quality review passed the same 23 tests and raw-write cleanup/retry, but extended the actual bound-arm handoff beyond the single tick-30 acceptance case. With the same +1.8 Ns impulse and 600 physical ticks, transfer at tick 60 produced a 5.147353 mm peak anchor gap; at ticks 70 and 210 the projected Y peaks were 0.426351 and 0.446892 rad. These violate the unchanged 5 mm /0.40 rad gates using only a duration the lab user can freely select.

The finding is accepted, not dismissed as visual-only or full-humanoid scope. The sole writer retained those phases in a real failing regression: 55 sampled phases across the authored 4*pi-second animation cycle, including 1, 5, every fifteenth tick through 750, 70, 754 and 755. Each runs the same impulse and 600 physical ticks. This is a sampled grid, not a proof of every possible phase or arbitrary time horizon.

| Solver iterations / maxCcdSubsteps / PGS iterations | Peak anchor mm | Peak projected X / Y rad | Failing sampled phases |
| --- | ---: | --- | ---: |
| 4 /4 /1 | 8.021676 | 0.393098 /0.474465 | 11 |
| 8 /4 /1 | 9.026900 | 0.375961 /0.383560 | 8 |
| 8 /4 /4 | 12.003047 | 0.377449 /0.396312 | 15 |
| 8 /8 /1 | 12.010109 | 0.367779 /0.373145 | 10 |
| 32 /8 /1 | 11.641494 | 0.353058 /0.352305 | 3 |

Disabling per-body CCD for the 8/8/1 bound-arm variant reproduced the same sampled results, then CCD was restored. All these failed configurations had measured positive energy excess zero, speed <=5.066 m/s and omega <=42.348 rad/s; those passing metrics do not cancel the anchor/angle failures. No configuration in this table was accepted. The original 4/4/1 grid failed phases 60, 70, 105, 195, 210, 345, 360, 375, 465, 585 and 705; its worst gap was at 585 and worst projected Y at 705.

The earlier table remains pre-correction budget-four/tick-30 evidence. Parent fully reviewed and recorded an exact [physical integration addendum](2026-09-08-arm-joint-lab.md): preserve one authoritative 1/60 command/publication interval, original animation/COM-history semantics and core/yard code, but try four explicit 1/240 native physical steps and measure every internal substep. The independent quality reviewer confirmed contract compatibility, not empirical success. This is explicit, not an undisclosed native-timestep reduction or wider tolerance. The sole writer is authorized to implement the exact addendum test-first; parent full browser regression remains held until the fix and ordered spec/quality rechecks settle.

## Corrected physical batch: writer RED/GREEN checkpoint

The approved four-native-step candidate passed all 55 phases without using the eight-step fallback. Physical batches use four native 1/240 steps, eight solver iterations and maxCcdSubsteps four, while animation/bootstrap stay one native 1/60 step and all authoritative commands/publications stay 1/60. The original yard and core files are unchanged.

Every one of the 132,000 physical native-step samples was measured: maximum anchor gap **0.565386 mm**, penetration **0.504986 mm**, projected X/Y **0.357194 /0.360999 rad**, speed **5.067120 m/s**, omega **38.279820 rad/s**, maximum positive energy excess **0 J**. The same locked 5 mm /0.40 rad /12 m/s /50 rad/s /+5 J gates apply. The 55 phases are sampled empirical controls, not universal stability proof.

The writer observed new native-count/dt/detached-sample/once-only-point-impulse and third-native-step fatal assertions fail before the correction and pass afterward. Strict checking passed. Parent fully read the revised arm implementation and these tests. Writer's final scoped 27/27 native cases passed, and its final strengthened bootstrap/animation timing, matched controls and phase tests passed 3/3. These strengthen test instrumentation; they do not change the frozen production implementation.

## Four-step candidate contact controls (before dense failure)

These values were independently reproduced by the coordinator's complete native run. Each of the 600 authoritative physical ticks contains four native samples; maxima inspect all 2,400 samples, not just outer endpoints.

| Corrected case | Peak anchor mm | Peak penetration mm | Projected X / Y rad | Peak speed m/s | Peak omega rad/s | Wall outer /native steps | Wall impulse Ns | Positive energy excess J |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| Matched limited | 0.055275 | 0.128844 | 0.350083 /0.350083 | 4.910028 | 17.652998 | 568 /2268 | 8.638860 | 0 |
| Matched unlimited | 0.416620 | 0.020218 | 3.141292 /3.141396 | 4.875957 | 11.220407 | 567 /2266 | 4.043982 | 0 |
| Actual bound arm, handoff at tick 30 | 0.150914 | 0.185852 | 0.350044 /0.350128 | 5.033833 | 29.609659 | 576 /2301 | 61.489801 | 0 |

Both limited axes move and stop within the original gate; the matched unlimited arm rotates freely. Large unlimited projected coordinates remain diagnostics, not anatomical angles. Bound-arm initial post-impulse energy is 45.810006 J and maximum subsequent sampled energy 44.693171 J. Original 4/4 limited/unlimited and budget-one negative values reproduced unchanged in the same coordinator run.

## Coordinator four-step integration gates (insufficient for final acceptance)

- `rtk proxy npm run check`: strict TypeScript and **103/103 native tests PASS**, zero failed/skipped, 12,917.158 ms. This includes the full 55-phase/every-native-sample matrix with the same maxima reported above, all 76 core/baseline cases and the 27 arm/adapter cases.
- `rtk proxy npm run build`: **PASS**, Vite build 340 ms; JS 3,404.99 kB /gzip 1,236.66 kB. Existing large-bundle advisory remains. The ordinary production graph still has 20 modules and excludes the dev lab.
- `rtk proxy npm run test:browser`: **13/13 PASS**, zero failed/skipped, 136,719.449 ms. All nine normal-yard regressions plus four lab cases passed, including actual full-Chromium BFCache for the yard, ten acquired-Grip restarts, ten arm resets, lab production exclusion, real WebGL loss/restoration and labeled synthetic boot-failure recovery. The intentional unavailable-WebGL case emitted the expected Three context-creation error and then recovered; it is not an unexplained failing test.
- Parent opened all six **freshly regenerated** lab PNGs after this run. Before/handoff retain the same paused tick 46 and visible pose; contact capture is tick 181 with real wall-contact/impulse history. Reset is readable at 1024×700; restored and recovered graphics are visibly paused and usable.
- After browser completion the writer changed only two core API **comments**, describing completed authoritative integration batches rather than exactly one native call. Parent checked the two-line diff; no core behavior changed. The strict/native/build gate covers the final source. All test-owned browsers/servers closed.

The previous preview was no longer live. Parent started a new Vite preview at `http://127.0.0.1:5173/vadstena/` (owned execution session 3553); both the yard and `/vadstena/arm-lab.html` returned HTTP 200 with the expected entries. It is intentionally left available. These tests use SwiftShader and do not establish hardware FPS or full-actor performance.

## Ordered reviews and denser four-step failure

Fresh corrected spec recheck ran under independent `arm_joint_probe` because the runtime rejected a fresh reviewer spawn with its thread-limit error. The reused reviewer authored no arm/core production code. **SPEC PASS**, independently 27/27 native (12.309 s), strict types and diff whitespace. It additionally instrumented 65 outer ticks /260 native steps: frozen outer quarter-torque waveform/frame, including the sign transition, and unchanged authoritative tick/interval throughout every inner step. A separate phase-70 actual impulse probe reconciled 94 outer wall-contact ticks /370 native contact steps /23.9144979911 Ns. Injected third-inner measurement failure freed all bodies/colliders/joints and invalidated snapshot/step, supplementing the committed native-step-failure test.

Subsequent quality recheck's 28 supplemental phases passed 67,200 native samples: worst gap **3.391543 mm** at phase 584 /physical outer tick 34 /substep 3, penetration 0.323868 mm, projected X/Y 0.354594 /0.357792 rad, speed 5.060295 m/s, omega 36.591047 rad/s. Phases 754/755 repeat the earlier 55 grid, so this adds 26 unique phases (81 distinct total), not 83 distinct phases.

Parent then requested one bounded dense sweep of every first-cycle handoff phase 1–755 because adjacent initial phases had substantially different peaks. It **stopped on failure at phase 264**: anchor **5.882782135 mm**, physical outer tick 34 /native substep 2, exceeding the unchanged 5 mm gate. Phases 1–263 passed; 633,600 native samples were measured through the completed failing phase 264. The earlier larger-but-passing peak was 4.482815 mm at phase 26. Other global maxima through the failure were penetration 0.653839 mm, projected X/Y 0.359630 /0.386333 rad, speed 5.099675 m/s, omega 41.465981 rad/s and positive energy excess zero. Only the anchor gate failed.

Quality verdict: **NOT APPROVED; original P2 remains open.** The 103 native /13 browser passes, original 55-grid and supplemental passes do not supersede this failure. All six fresh screenshots were also independently inspected; no additional visual/lifecycle finding was reported.

Parent authorized **only the preregistered eight-native-step 1/480 fallback** from the reviewed addendum, retaining eight solver iterations /maxCcdSubsteps four /CCD and the unchanged authoritative 1/60 input schedule, impulse, geometry and tolerances. Phase 264 must become a retained RED regression, with challenging phases 26/37/584 included. Preserve original controls and the four-quarter pair; add a matched eight-step pair and explicit eight-step timing/snapshot assertions. The dense 1–755 diagnostic precedes another combined browser run. No further automatic solver tuning or fallback is authorized if that measured candidate also fails.

Source is not yet accepted/committed for this arm stage. Coordinator-owned staging of the prior candidate will be refreshed with explicit paths after acceptance. Final independent spec/quality and integration checks remain pending for the eight-step source.

No Windows executable is rebuilt/launched, no Defender setting changes, no public deployment or dependency installation. Full rig, skinning/caps/gore, moving-projectile contact and the broader engine decision remain open.

## Eight-native-step fallback: implemented and native/spec verified

Writer reproduced phase 264 RED at 5.882782135 mm and a native-count RED (`4 !== 8`) before switching the production constant to eight and clarifying its two corresponding comments. No other production behavior, geometry or settings changed. It preserved the original controls and four-quarter pair, added the distinct eight-step pair, and expanded the normal phase matrix to 59 by including 26/37/264/584. Every native sample remains measured; no threshold, contact requirement or phase restriction changed.

The frozen candidate uses eight native 1/480 physical steps per authoritative 1/60 interval, eight solver iterations, maxCcdSubsteps four and CCD on. Parent's fresh `rtk proxy npm run check` passed strict types and **104/104 native tests**, zero failed/skipped, 19,472.112 ms. Parent's fresh web build passed (843 ms Vite build), with the same 20-module ordinary production graph, 3,404.99 kB JS /1,236.66 kB gzip and existing bundle advisory. Renewed browser acceptance is deliberately held until dense quality finishes.

Coordinator-reproduced maxima across all native samples, 600 authoritative physical ticks per case:

| Eight-step case | Peak anchor mm | Peak penetration mm | Projected X / Y rad | Peak speed m/s | Peak omega rad/s | Wall outer /native steps | Wall impulse Ns | Positive energy excess J |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| Matched limited | 0.070447 | 0.244446 | 0.351004 /0.350080 | 4.983270 | 18.939042 | 576 /4593 | 64.518040 | 0 |
| Matched unlimited | 0.361137 | 0.427551 | 1.835011 /2.224293 | 4.984965 | 15.858611 | 576 /4580 | 5.866363 | 0 |
| Actual bound arm, tick-30 transfer | 0.198961 | 0.189209 | 0.351979 /0.352227 | 5.045362 | 27.359551 | 578 /4611 | 63.448113 | 0 |
| Normal 59-phase matrix | 0.492230 | 0.529594 | 0.352997 /0.355221 | 5.070297 | 39.245305 | All cases contact | Per-case | 0 |

The 59-phase matrix contains 283,200 physical native samples. Bound tick-30 initial energy remains 45.810006 J and maximum sampled energy is 44.693474 J. Original controls and four-quarter measurements reproduced unchanged in the same native run.

Independent fallback **SPEC PASS** from `arm_joint_probe`: 28/28 scoped native (21.467 s), strict types and diff check. Its additional phase-264 probe instrumented 65 outer ticks /520 native calls: all eight equal/opposite torque pairs matched the frozen outer frame/waveform, including its sign change, and the point impulse occurred exactly once. Tick/interval publication remained unchanged within every batch. Actual contact history reconciled 42 outer contact ticks /319 native contact steps /11.0427943077 Ns. This does not replace the still-running dense 1–755 quality check or fresh browser regression.

## Final independent dense quality acceptance

The subsequent `arm_lab_quality` recheck is **APPROVE**, original P2 closed at this bounded fixture scope. Source stayed frozen while it ran the dense first-cycle diagnostic and separate longer durations:

| Diagnostic | Distinct phases | Native samples | Peak anchor mm | Peak penetration mm | Peak projected X / Y rad | Peak speed m/s | Peak omega rad/s | Positive energy excess J |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| Every integer handoff tick 1–755 | 755 | 3,624,000 | 0.519445 | 0.676288 | 0.354980 /0.360147 | 5.093192 | 40.558999 | 0 |
| 1001, 1379, 2027, 3011 | 4 | 19,200 | 0.418395 | 0.315323 | 0.351185 /0.355514 | 5.025451 | 20.981355 | 0 |

Total **759 distinct handoff phases /3,643,200 intermediate native samples**. Dense peak locations: anchor phase 54 /outer tick 32 /substep 1; penetration 277 /32 /2; projected X 710 /32 /3; Y 596 /33 /2; speed 603 /32 /2; omega 169 /35 /3. Each scenario used the same normal lab point impulse and 600 authoritative physical ticks.

All unchanged **upper** stability bounds passed. Finite state, mass/counts, eight-sample batches, authoritative interval timing and per-phase real wall-contact history also passed. The separate normal 59-phase suite and matched limited/unlimited controls prove actual movement and lower excursion requirements; the dense probe below is not mislabeled as checking those lower bounds itself. It allows the explicitly visible +1e-6 J numerical assertion tolerance on the +5 J upper energy gate, with actual measured positive excess zero.

This dense diagnostic is supplementary and is **not one of the 104 normal tests**. It is empirical acceptance of this fixture/time horizon, not universal phase stability, arbitrary-duration humanoid stability, anatomical correctness or hardware performance. The original bad configurations remain reproducible; no passing row erases their failures.

### Exact dense diagnostic reproduction

Run from `game/` with `rtk proxy node --input-type=module -e`, passing the following JavaScript as the argument. This is the reviewer-executed in-memory source, preserved for reproduction; the reviewer made no file edits. For its separately executed long-duration run, change only `phases` to `[1001,1379,2027,3011]`. It stops at the first failing scenario after measuring that scenario's full 600 outer ticks. Native timing instrumentation is separately covered by the normal tests and independent SPEC probes.

```js
import assert from 'node:assert/strict';import{createArmFixture}from'./src/physics/armFixture.ts';
function finite(v){if(typeof v==='number')assert.ok(Number.isFinite(v));else if(v&&typeof v==='object')for(const part of Object.values(v))finite(part);}
const phases=Array.from({length:755},(_,i)=>i+1);
const peaks={anchor:{v:0},penetration:{v:0},x:{v:0},y:{v:0},speed:{v:0},omega:{v:0},energyExcess:{v:0}},failures=[];
let measuredSteps=0;
for(const phase of phases){const arm=await createArmFixture();try{arm.setActive(true);for(let i=0;i<phase;i++)arm.step();const before=arm.snapshot(),com=before.segments[1].comWorld;arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:{bodyId:'forearm',impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{...com,y:com.y+.02}}});const phaseFailures={phase,violations:new Set()};
for(let outer=1;outer<=600;outer++){arm.step();const s=arm.snapshot();finite(s);assert.equal(s.tick,phase+outer);assert.deepEqual(s.counts,{bodies:4,colliders:4,joints:1});assert.equal(s.interval.dtS,1/60);assert.equal(s.interval.toTick,phase+outer);const native=s.lastPhysicsStep;assert.ok(native&&native.samples.length>0);assert.equal(native.nativeSteps,8);assert.equal(native.samples.length,native.nativeSteps);assert.ok(Math.abs(native.nativeDtS*native.nativeSteps-1/60)<1e-8);
for(const[sub,sample]of native.samples.entries()){measuredSteps++;const m=sample.metrics;assert.ok(Math.abs(m.massKg-3)<1e-6);const vals={anchor:m.anchorGapM,penetration:m.penetrationM,x:Math.abs(m.projectedRadXYZ[0]),y:Math.abs(m.projectedRadXYZ[1]),speed:m.maxSpeedMps,omega:m.maxOmegaRadps,energyExcess:m.mechanicalJ-(sample.energyAllowanceJ-5)};for(const[k,v]of Object.entries(vals)){assert.ok(Number.isFinite(v));if(v>peaks[k].v)peaks[k]={v,phase,outer,sub:sub+1};}const bounds={anchor:.005,penetration:.005,x:.40,y:.40,speed:12,omega:50,energyExcess:5+1e-6};for(const[k,b]of Object.entries(bounds))if(vals[k]>b)phaseFailures.violations.add(k);}
}const contact=arm.snapshot().contacts;assert.ok(contact.wallTicks>10&&contact.wallNativeSteps>=contact.wallTicks&&contact.wallImpulseNs>0);if(phaseFailures.violations.size){console.log(JSON.stringify({failedPhase:phase,violations:[...phaseFailures.violations],peaks,measuredSteps}));throw new Error('Dense phase sweep found a locked-gate failure');}if(phase%25===0)console.log(JSON.stringify({completedPhase:phase,measuredSteps,peaks}));
}finally{arm.destroy();}}
console.log(JSON.stringify({phases,measuredSteps,peaks,failures}));assert.equal(failures.length,0);
```

## Final local delivery gate and file inventory

After the eight-step dense diagnostic and independent ordered approvals, parent reran the complete browser suite: **13/13 PASS**, no failures/skips, **168,917.527 ms**. All nine original courtyard/Grip cases and four lab cases passed against this exact frozen eight-step implementation. The final ten acquired-Grip restarts took 51.131 s. This supersedes the four-step browser run for acceptance; it is not an inferred pass from the native suite. Test-owned browsers and servers closed normally.

Parent opened all six regenerated eight-step PNGs again. Before and handoff are both paused at tick 48 with the same visible pose; contact capture is tick 184, supported by real wall contact and positive native impulse history. Actual context restoration is visibly paused at tick 12, boot-reload recovery at tick zero, and the ten-reset view remains readable at 1024×700. No source change followed the final strict/native/build/browser checks. Normal production still excludes this development entry. The owned 5173 preview is left available.

Arm delivery consists of nine new files: `game/arm-lab.html`, `game/browser/armLab.spec.mjs`, `game/src/lab/armLab.ts`, `armLabView.ts`, `armLab.css`, `game/src/physics/armFixture.ts`, `rapierJointLimits.ts`, `game/tests/armFixture.test.mjs`, `rapierJointLimits.test.mjs`. Two existing core owner comments were clarified in `bodyMotion.ts` and `poseBinding.ts`, with no behavioral edits. The reviewed plan/addendum and this results record accompany the source; parent stages only these explicit paths. Coordinator README/handoff/next-slice documentation follows separately. Original research `work/` cache remains untouched and untracked.

Next is [B02a moving-contact planning](2026-09-08-moving-contact-next-slice.md), not an already implemented projectile. Full B01 anatomy/hip-knee/full-body load, B02 damage/cut-zone ordering, B03 skin/caps/gore and B07 actual package assets remain open before the broader engine decision. No Windows rebuild/launch, Defender mutation, dependency installation, publication or personal-memory update occurred.

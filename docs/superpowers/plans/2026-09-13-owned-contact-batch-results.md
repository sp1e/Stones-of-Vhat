# Owner-bound contact batch — evidence and boundaries

Date: 2026-09-13. Baseline5d7e56d9a1370ebdf5f3f604b2e6951cbb626cd5. Four source/test paths only: pure cast validator extraction in `contactPairQuery.ts`/test, new `armContactBatch.ts`/test. Companion plan/design define the accepted numerical and ownership scope. Coordinator owns this record; workers do not publish.

## Acceptance state

Final independent **SPEC PASS** after corrections, then fresh Astra/high **QUALITY APPROVE**, each independently34/34 focused tests (21 pair +13 batch). Parent final focused34/34 PASS5554.287ms; full strict/native **183/183 PASS45323.785ms**, zero failures/skips/cancellations. Parent production build PASS (671ms Vite portion) and whitespace PASS; unchanged3,407.42kB bundle advisory is not a new failure or browser-performance claim. Source is accepted; coordinator performs exact-path commit/publication separately. No production/test edits followed these gates.

QUALITY additionally retained one wrapper through24 consecutive owner ticks (12 animation,12 physics), two casts per tick, instrumented1,056 actual calls overall. Every per-tick total matched the ledger; query preserved owner snapshots, sibling outputs were detached and counts stayed4/4/1. This was a read-only inline supplemental probe, not a newly retained regression or universal stress guarantee.

## Implemented contract

`validateLinearContactCast` is pure: same accepted rigid geometry/identity/domain/speed validation, detached normalized output, no Rapier initialization/native allocation/contact. Ordinary JS shape construction is excluded by source review; the subprocess instruments actual WASM initialization/intoRaw/contact, not readonly ESM constructor reassignment. Existing pair numerical algorithm,50µm guard,1mm uncertainty and128 native calls per pair remain unchanged.

The arm-specific wrapper captures the actual named floor/forearm/upper-arm/wall roster (4 bodies/4 colliders/1 joint), retaining complete blocker shape/local-pose topology. It captures one snapshot and compiles one complete interval per query; casts cannot supply their own snapshot, subset or motion facade. Moving world pose/velocity and animation→physics ownership are not mistaken for topology changes. Sign-equivalent local quaternions use the existing2e-7 normalized chord tolerance.

All0..8 casts are validated before work, including when allowance is zero. Code-unit tuple ordering determines bounded work, not arbitrary victim selection. A shared default512 allowance reserves128 per pair and refunds unused calls. Insufficient remaining reserve produces complete explicit `unqueried` records at earliest0; it never silently omits obstacles or invents a checked-through time. Empty transactions consume their tick too. Preflight failures are retryable; successful/consumed same-tick calls are not. A post-consumption exception publishes no partial batch and permanently closes the wrapper.

Destroying the wrapper leaves its arm untouched. The budget is explicitly **per retained wrapper lifetime**, not a process-global security registry. Separate wrappers in permutation/budget tests are diagnostic controls only; the next live controller retains one wrapper with its owner and does not replenish a same-tick budget by recreation.

## TDD and ordered review corrections

- Missing public validator RED (18 pass/1 fail), minimal GREEN19/19; normalized/detached direct controls followed through RED→GREEN. Native-init/allocation-free checks run in an isolated subprocess.
- Missing owner factory RED0/1, minimal GREEN1/1. Creation/preflight RED1pass/3fail→GREEN4/4. Nonempty transaction RED4pass/6fail→GREEN10/10. Subsequent self-review controls grew the initial batch suite to11.
- First independent SPEC reproduced two real edge cases: explicit `{maxNativeCalls:null}` silently defaulted512, and a box dimension missing its own index could inherit a prototype value. Both were retained RED→GREEN: default only undefined, validate options before initialization/capture, and require three own array entries. The density edge existed in the old private check; this correction enforces the newly public dense-data contract without changing the contact algorithm.
- SPEC also required coverage that zero-budget examples could not establish: real constrained cross-family work, nonzero order permutations, native-instrumented replay, mixed epoch/tick rejection with zero work/retry, and one compilation. These were test-coverage additions, not claims that all corresponding production behaviors were originally broken.
- Compilation observation instruments the actual compiler's completed-interval `structuredClone` call with a source-coupled stack check, restored in finally. This is an implementation-specific regression, not a general compiler profiler or a readonly-export monkeypatch.

## Retained real-owner observations

| Control | Observed result |
| --- | --- |
| Physical two-cast full owner |66 actual calls; horizontal cast blocked at0 by upper-arm, later forearm diagnostic hit not selected; free Z cast selects forearm |
| First canonical candidate |MeasuredC=9; C+127 queries1 candidate; C+128 queries2 |
| Eight casts, allowance256 |135 calls,121 remaining,8 families/32 candidates; stable unqueried suffix starts at flattened index15 |
| Eight casts, default512 |288 calls,224 remaining,8 families/32 candidates, exact family-sum accounting |
| Cast and complete owner-roster permutation |Allowance136,9 calls,127 remaining; identical canonical family results |
| Repeated/changed/empty query after nonzero consumption |Throws with no new native calls; a real later owner interval is allowed |
| Injected post-work distance getter exception |No partial return; closed wrapper rejects retry; restored independent native query healthy |

The256 case exhausts the **usable reserve**, not all256 calls. Remaining121 is intentionally too small to reserve another128-call pair. The exception is an injected JS boundary, not proof of a genuine internal WASM failure or vendor temporary-allocation cleanup.

## Boundary-born follow-up diagnostic

Parent retained and independently reviewed `game/scripts/probe-boundary-slicer.mjs`; rerun after the source corrections returned exit0,24 cases and24 destroyed worlds. Birth ticks1/30/90 × animation/physical handoff with the existing1.8N·s positive-X impulse ×16/40m/s × horizontal/vertical. The muzzle is the **actual current boundary** forearm collider center+Z.6m, moving−Z; never retrospective midpoint aim. Every interval checks all4 blockers and preserves the owner.

All24 select the forearm without initial blocks.16m/s has one clear interval then age2 contact (30.114..31.002ms after birth);40m/s contacts at age1 (12.084..12.364ms). Calls: animation16=21–22, physical16=76, animation40=15, physical40=39. This supplemental script uses pair/family orchestration, not the new batch ledger, and its≤512 assertion is only4×128 arithmetic. The initial run was WIP; the corrected-source rerun is also a local precommit run, with accepted final source to be committed only after remaining gates. No native FPS or visible-flight claim follows.

## Next implementation and exclusions

`2026-09-13-live-slicer-plan.md` has independent contract PASS for the next nine-path controller/contact-frame/PC UI increment, conditional on this dependency's final acceptance. Its actual boundary-born shots, per-fixed-step querying,30/60/144Hz replay, bounded last-cast geometry, lifecycle cancellation and paused contact-time view must receive their own native/browser/visual acceptance.

No full humanoid ragdoll, anatomy damage, prepared severing, blood, sword, player/NPC impairment, new Windows executable or website deployment is delivered by this contact batch. Those remain central approved project work, not implied by green collision tests. Gore remains default-on in the product requirements; its toggle must not change physical injury rules.

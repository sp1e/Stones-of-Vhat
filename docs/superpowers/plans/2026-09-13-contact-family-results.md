# First-blocker family resolver — execution record

2026-09-13. **Accepted after SPEC PASS, fresh QUALITY APPROVE and coordinator full gates.** Publication is recorded separately. Exact contract: `2026-09-13-contact-family-plan.md`. Source/test: `game/src/physics/contactFamily.ts` and `game/tests/contactFamily.test.mjs`. Accepted dependency: pair query74d8f7a, motion compiler12b4a36.

## Implemented boundary

Pure, stateless resolution of one declared family of box/ball contact results. Every expected blocker has exactly one validated pair result or an explicitly unqueried family-budget record. Missing/unknown/duplicate/mixed-epoch data rejects; an unqueried collider is uncertain at0, never an implicit miss. Arrays are capped and membership counts checked before expensive record rebuilding.

The first-contact frontier uses the smallest confirmed upper contact/blocking time. Exact ties, overlapping possibilities and earlier uncertainty stay unresolved. Initial-blocked at0 restricts travel without choosing a damage victim. A hit is selected only when its entire bracket is definitely earlier than every other possible contact. Code-unit identity order is presentation/work determinism, not physical priority. Nontransitive overlap A=[1,10],B=[5,6],C=[9,11]ms retains only A/B, not C.

Outputs rebuild known fields with detached identities/geometry; selected hit, candidates and frontier do not alias. Unresolved families may retain valid pair-hit geometry inside diagnostic candidates, but have no selected top-level hit/geometry. Pair evidence, times, call counts, geometry finiteness and normals are checked without relaxing numerical gates. Legitimate budget earliestPossibleS>checkedThroughS remains allowed. This selector does not initialize/query native physics or change a world.

Completeness is **relative to the caller's declared manifest**. An empty manifest with no records resolves clear only for that empty declared set. A separate owner-bound wrapper must prove that the real laboratory world was completely represented. No generic whole-world collision, cast delivery or damage guarantee is claimed here.

## TDD and independent review

Fresh Sol/high writer owned only the two new paths. Observed missing-feature RED (`resolveContactFamily` undefined), minimal1/1 GREEN, ordering RED against the intentional placeholder then GREEN, and preflight/detachment RED with4expected failures then GREEN. Parent source inspection identified unbounded record rebuilding on oversized invalid candidate lists; writer retained a proxy-based record-walk RED, then capped sizes/counts before traversal and restored GREEN. This proves that bounded-list boundary, not universal resistance to arbitrary hostile JavaScript.

An intermediate test rerun failed only because an error regex was too narrow; it was corrected without a production change. A typecheck caught optional-frontier narrowing and was corrected. Neither is claimed as a new physics defect.

Independent SPEC inspected the whole source and ran focused tests/typecheck. Source selection logic was correct, but required test-only omissions were found and completed:

- Earlier real inconclusive contact now rebuilds both SOURCE orders, independently permutes manifest/results, and deep-compares all2×2×2=8 complete resolutions.
- Expected and candidate target refs explicitly test empty/mismatched epoch and empty/whitespace body/collider IDs.
- Unsupported candidate kind, wrong initial-block reason and zero-call initial block explicitly reject.

Those additions did not change production and are reported as coverage completion, not a fabricated new production RED. Final independent **SPEC PASS**,12/12 focused576.333ms; prior independent typecheck PASS and subsequent writer typecheck PASS. Fresh Astra/high **QUALITY APPROVE** after its own12/12 focused644.217ms. Its read-only finite-assignment diagnostic covered512 three-candidate families/4913 concrete time assignments, agreeing on frontier and result kind; maximum128-candidate/16384-call accounting also agreed. That diagnostic was inline, not a retained automated test or coordinator rerun. A prior old-reviewer resume failed at the native runtime limit; another fresh reviewer was subsequently available, so final quality was not replaced by self-review.

## Retained real native outcomes

The tests call the accepted real Rapier pair query; the multi-body tracks below are explicitly authored synthetic trajectories, not native solver measurements or rendered shield/NPC assets. The arm case separately captures the actual physical owner.

| Control | Family result |
| --- | --- |
| Moving small proxy named shield, arm proxy, farther-body proxy |Shield is the definite first hit; source reversal gives identical result|
|10mm box wall before arm proxy |Wall selected|
|Matched translated clear path |All candidates miss; clear|
|Two coincident target proxies |Unresolved, both frontier IDs, no arbitrary selected hit|
|Muzzle next to thin wall |Blocked at0, no selected hit|
|Earlier real graze/width uncertainty before later definite hit |Unresolved, both frontier IDs; later geometry diagnostic only|
|Complete actual arm, horizontal shot beginning inside upper-arm |Blocked at0, no selected forearm|
|Complete actual arm, free Z-directed muzzle through forearm |Forearm selected; upper-arm/floor/wall all miss|

The earlier uncertain target remains at earliest possible0.0023659412629902354s, before later hit bracket[0.01633170008460184,0.016335033417935175]s. Tests assert the relationship and unchanged eight-order resolution, not a new tuned numeric/call threshold.

Actual arm snapshot has9measured boundaries for8physical native spans. Horizontal candidate kinds: floor miss, forearm hit, upper-arm initial-blocked, wall hit. Z-directed candidate kinds: floor miss, forearm hit, upper-arm miss, wall miss. Full snapshot, tick and4body/4collider/1joint counts stay unchanged by query/resolution. Saved pair/family outputs remain identical after owner destruction, with zero remaining bodies/colliders/joints. A selected proxy forearm is not an anatomical severing event.

## Coordinator gates

Final parent commands from `game`:

- `rtk proxy node --test tests/contactFamily.test.mjs`: **12/12 PASS**, zero failures/skips,568.6014ms on final tests/source.
- `rtk proxy npm run check`: strict TypeScript and **167/167 native PASS**, zero failures/skips,34593.5269ms, including unchanged59-phase arm sweep and pair/Grip/runtime controls.
- `rtk proxy npm run build`: **PASS**, Vite476ms; unchanged3,407.42kB main chunk advisory, no threshold/dependency change.
- `rtk git diff --check`: PASS; exact staged whitespace checked again before commit.

No production/test changes followed these gates. The prior12/12 parent576.9853ms and155/155 pair-only baseline are historical, not substituted for these final runs. No browser acceptance belongs to this nonvisual module.

## Following work and limits

Next reviewed contract is `2026-09-13-owned-contact-batch-plan.md`: actual owner roster binding, pure shared cast preflight, one batch per completed tick, shared512-call allowance and explicit pending records. It must not start production before this family's acceptance. Its bound is per retained owner-wrapper lifetime, not a global process-wide registry or hardware FPS result. The later live controller must query inside each relevant successful fixed step and own one wrapper per owner lifetime.

Then visible Slicer flight/contact-time inspection, fixed input/lifecycle identity and genuine browser verification. Regional injuries for player and NPC, swords, jointed full-body ragdolls, prepared limb cuts and default-on optional gore remain approved downstream mechanics, not delivered by this pure ordering module. No Windows build/launch, Defender change, browser feature, website deployment, environment edit, dependency change or personal-memory write belongs to this acceptance.

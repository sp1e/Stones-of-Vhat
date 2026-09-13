# First-blocker family resolution — executable plan

> Required workflow: subagent-driven-development, observed RED → GREEN, independent SPEC then fresh QUALITY. The direction is already approved; continue without a routine user checkpoint. This plan needs independent contract review before implementation.

## Goal and boundary

**Execution outcome2026-09-13:** accepted after independent SPEC PASS and fresh QUALITY APPROVE; parent12/12 focused,167/167 strict/native PASS34.594s, production build/whitespace PASS. Test-only SPEC coverage omissions and bounded-list RED→GREEN correction are recorded in `2026-09-13-contact-family-results.md`. Original checklist below preserves the preregistered requirements; this outcome supersedes its unchecked markers. Next implementation is the reviewed owner-bound batch, not damage or visible spell acceptance.

Choose a definite first contact only when the full declared candidate family establishes it. A shield, wall, earlier graze or initial muzzle block must prevent a later limb from becoming a selected hit. This is the pure ordering layer of B02a, not the live owner-completeness wrapper, work ledger, cast lifecycle, damage, severing or visible spell. Those are subsequent integration tasks, not hidden claims of this module.

The accepted contact-motion and pair-query APIs remain unchanged. Use TypeScript, detached data and existing native tests; no new packages, worlds, UI, runtime input or physics settings. Sole writer owns only `game/src/physics/contactFamily.ts` and `game/tests/contactFamily.test.mjs`. Existing fixture helper, pair source, owner and all coordinator/Claude paths are read-only. No worker Git writes.

Read `2026-09-13-contact-ordering-design.md`, pair-query plan/results, `contactPairQuery.ts`, `bodyMotion.ts`, `fixedStep.ts`, and the existing fixture helper. This plan intentionally separates correctness of ordering relative to an explicit manifest from proof that that manifest represents the live world. The later arm wrapper must bind its manifest to the actual owner; deriving it from a caller's arbitrary compiled subset is insufficient.

## Exact API

```ts
type PairIdentity = ContactPairResult['identity'];
export type ContactFamilyIdentity = Omit<PairIdentity, 'target'>;
export type ContactFamilyManifest = {
  identity: ContactFamilyIdentity;
  expectedBlockers: readonly ColliderRef[];
};
export type UnqueriedContact = {
  identity: PairIdentity;
  kind: 'unqueried';
  evidence: 'not-queried-family-budget';
  reason: 'family-budget';
  earliestPossibleS: 0;
  nativeCalls: 0;
};
export type ContactCandidateResult = ContactPairResult | UnqueriedContact;
export type ContactFamilyResult = {
  identity: ContactFamilyIdentity;
  evidence: 'declared-candidate-family';
  nativeCalls: number;
  queriedCount: number;
  unqueriedCount: number;
  candidates: ContactCandidateResult[];
  frontier: ColliderRef[];
} & (
  | { kind: 'clear' }
  | { kind: 'hit'; hit: Extract<ContactPairResult, { kind: 'hit' }> }
  | { kind: 'blocked'; earliestPossibleS: 0 }
  | { kind: 'unresolved'; earliestPossibleS: number }
);
export function resolveContactFamily(
  manifest: ContactFamilyManifest,
  candidates: readonly ContactCandidateResult[],
): ContactFamilyResult;
```

No injection/oracle, async initialization, module registry or native calls. The pair import must be type-only where possible; import its existing scalar evidence/limits as needed (its module initialization is lazy). The whole result is fresh detached data. Known fields are rebuilt; unknown caller fields cannot smuggle a `hit`, selected target or geometry into non-hit variants. A result is not an authenticated damage token.

## Preflight

1. Manifest and all candidates must be data objects; expected/candidate lists must be dense arrays. Expected blockers may be empty and may have at most the compiler's128 collider bound. An empty declared family plus empty candidates resolves clear **relative to that empty manifest**, not to any owner. The later owner wrapper rejects an incomplete empty/subset roster.
2. Require nonempty epoch/cast/projectile/body/collider strings, safe nonnegative adjacent ticks, and exact epoch/tick/cast/projectile/ref equality. Compare individual tuple fields or collision-free tuple keys, not delimiter-joined IDs. Collider IDs can repeat across different bodies. Reject duplicate expected refs, duplicate results, missing/unknown refs, mixed identities and surplus candidates before publishing a selection.
3. All pair evidence tags must equal `CONTACT_QUERY_EVIDENCE`. Ordinary pair nativeCalls is an integer in[0,128], with miss/hit/initial-blocked requiring at least1. Only inconclusive-native-geometry may carry0 for a pre-native failure; every other inconclusive reason requires at least1, and inconclusive-budget requires exactly128. Unqueried must have its own exact tag/reason, zero calls and earliest0; it must not masquerade as a pair result or claim checkedThroughS. Rebuild only its specified fields.
4. Times are finite in[0,FIXED_DT]. Hit lowerS≤upperS, upperS===timeOfImpactS, intervalFraction===upperS/FIXED_DT. Bracket travel is finite/nonnegative; uncertainty equals bracketTravelM+2*guardM and is≤maxBracketM. Use exact arithmetic equality for fields computed by the existing pair API, not a new loose tolerance. This validates records, not the physics of authored synthetic records.
5. Inconclusive reasons are exactly the accepted pair enum, earliestPossibleS and checkedThroughS each in interval. Do **not** require earliestPossibleS≤checkedThroughS: the accepted pair budget can stop after a proved-clear advance before sampling its next time. Initial-blocked must have exact reason and earliest0. Unsupported kind/reason rejects, not miss.
6. Hit geometry must contain all specified poses/vectors, with finite float32-representable components. Poses must have nonzero finite unit quaternions within1e-6 norm error and no nonunit scale; normals within1e-4 length of1. Do not normalize or recompute/widen the accepted contact. Rebuild the three poses and nine vector fields explicitly; preserve values. The original pair layer remains responsible for witness consistency and numerical interpolation; this selector does not replay geometry. Non-hit variants expose no geometry, even if extra fields were submitted.
7. Validate the complete input before selecting any victim. Sum checked call counts for diagnostics (≤128*128); this module does not enforce the future whole-tick ledger. Input/result mutation must not alter retained inputs, sibling output records, selected-hit data or a later resolution.

## Selection algorithm

Canonical order is code-unit bodyId then colliderId, independent of locale and insertion order. Sort output candidates/frontier only for repeatable display; it is never physical tie-breaking.

- Ignore misses in the temporal comparison.
- For hits, earliest possible time is lowerS and confirmed upper time is upperS.
- For initial blocks, earliest and confirmed blocking-decision time are0. This is not proof of penetration or usable cutting geometry.
- For inconclusive records, earliest is earliestPossibleS; no confirmed upper time.
- For unqueried records, earliest is0; no confirmed upper time.

Let U be the minimum confirmed upper/initial-decision time, or unbounded if none exists. Do not serialize Infinity. The frontier is every non-miss with earliest≤U, or all non-misses if there is no U. Do not use transitive overlap groups or sort by hit upper time to choose a target.

If all candidates are miss (including the empty declared family), return clear and an empty frontier. If any initial block exists, return blocked at0; keep every frontier record for uncertain identity, and do not expose `hit`. Otherwise, if the frontier consists of exactly one hit, return hit with a separately detached copy. This is equivalent to its upper bound being strictly earlier than every other possible contact. Equality remains unresolved. Every other case returns unresolved at the minimum earliest time of its frontier. There is no selected target, top-level geometry or `hit` property for unresolved/blocked/clear. Legitimate pair-hit records inside `candidates` retain their geometry for diagnostics even when the family is blocked/unresolved; they are not selected victims. Other candidate variants have no geometry. The later cast owner terminates blocked/unresolved travel; this stateless resolver itself does not advance or deliver anything.

## Test-first tasks

- [ ] Observe missing `resolveContactFamily` RED using existsSync/dynamic import, then minimal implementation. Add contract groups through observed RED→GREEN; do not start with an already complete implementation.
- [ ] Pure ordering table: all misses/empty, one hit, single inconclusive, single/multiple initial blocks, initial plus unqueried/inconclusive at0, definitely separated hits, exact equality, intersecting brackets, earlier inconclusive versus later hit, later inconclusive excluded by an earlier hit. Retain A=[1,10],B=[5,6],C=[9,11] in milliseconds: U6, frontier A/B only. An all-inconclusive frontier includes all unresolved records, not only its earliest one.
- [ ] Permute manifest and result order independently. Assert deep-equal whole results, including code-unit ordering, queried/unqueried counts, distinct same-name colliders on different bodies and punctuation-containing IDs that defeat delimiter keys. Hit copy and candidate copy may not alias.
- [ ] Retain unqueried0 versus later hit, all queried misses plus one unqueried, and actual total-call accounting. No clear path on partial work. Missing result is invalid; explicitly unqueried is unresolved.
- [ ] Table-driven invalids for sparse lists, every identity field, missing/unknown/duplicate refs, bounds/timing/NaN/Infinity, mismatched evidence/reasons/call counts and malformed hit geometry. Assert throw, input unchanged, no returned selection. Retain allowed budget earliest>checkedThrough boundary and absence of cut geometry on all non-hit variants, including malicious extra fields.
- [ ] Real Rapier controls use existing motionFixture/castFixture/query; combine independently authored body intervals into one complete fixture with consistent native samples. Query every compiled collider, derive the explicit expected manifest from that complete authored source. Moving shield → arm → farther body,10mmwall interception, matched clear path, exact coincident targets and near-wall initial block; permute physical/source registration order. Do not replace native collision with an injected result oracle. Pure time tables above remain explicitly synthetic.
- [ ] Retain the independently reproduced real earlier-uncertain control: stationary projectile ball radius.01 at origin; earlier target radius.01 at(-.005,.01998,0)→(.005,.01998,0)→(0,0,0); later target radius.01 at(1,0,0)→(.5,0,0)→(0,0,0), matching0/dt/2/dt knots and distinct body IDs in one complete interval. Existing pair gives earlier inconclusive-width around.002365941263s and later hit around[.016331700085,.016335033418]s. Assert outcome relationships, not new numeric/call-count gates: earlier earliest<later.lower, family unresolved, both frontier IDs, no selected hit/top-level geometry, later geometry only in diagnostic candidates. Independently permute source/manifest/result order and retain identical resolution.
- [ ] Real existing arm: capture full snapshot after animation then eight-span physical handoff, compile, query all4blockers and resolve the known horizontal shot that starts inside upper-arm. Assert blocked at0 and **no selected forearm**, despite its later pair hit. Compare owner snapshot/counts/tick before and after; repeat from saved data after destroy. Also select a clear-muzzle trajectory (e.g. along Z through forearm center), verify its actual complete-family first blocker instead of excluding upper-arm to force a hit.
- [ ] Focused `rtk proxy node --test tests/contactFamily.test.mjs`, typecheck, self-review. Return exact RED/GREEN and limits without Git writes.
- [ ] Independent SPEC then fresh QUALITY; same writer fixes real findings. Parent reads final diff, runs focused and full strict/native/build/whitespace, exact-path commit and authorized canonical publication after acceptance.

## Following integration, not silently included

Use the measured pair workload to preregister a lab-specific shared fixed-tick ceiling of512 native calls (provisional CPU work bound, not60fps acceptance). Reserve128 before each pair, debit actual calls, remaining<128 becomes explicit unqueried0. All casts in one tick share the same ledger and have a finite command cap. Bind the independently owned complete collider roster before any family work; validate all cast commands before work even at zero budget. The source wrapper and live-cast generation/delivery contract require their own exact TDD plan after this pure module. See existing ordering/lab notes for pause, stale topology, exactly-once effects and visible contact-time frames.

No sword, injury, gore, NPC, full body, historical environment, Windows or website acceptance is implied by this ordering foundation.

## Independent pre-implementation review

Astra/high contract review **PASS**, after clarifying selected versus diagnostic geometry and impossible native-call/reason combinations. Reviewer inspected accepted pair arithmetic/budget semantics and independently reproduced the two-target earlier-uncertain native control above. Manifest-relative completeness, nontransitive frontier and explicit later owner/work-ledger boundary accepted. Production implementation may now start with one fresh writer; implementation SPEC and QUALITY gates still follow.

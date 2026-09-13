# Owner-bound contact batch implementation plan

> Required workflow: subagent-driven-development, test-driven-development, ordered independent SPEC then QUALITY. No routine user checkpoint. **Production is gated on family-resolver acceptance and this plan's contract review.** The existing sole family writer must finish before these coupled edits start.

## Goal, ownership and dependencies

Read the real arm owner's complete interval, resolve every blocker for up to8 casts, and enforce one bounded query batch per completed tick. Retain512 maximum native calls shared across all casts. No arbitrary submitted motion/subset, no owner step or mutation, no damage/visual/cast-advancement claim. Read the full `2026-09-13-owned-contact-batch-design.md`, accepted pair/family plans and actual `armFixture.ts`, `bodyMotion.ts`, `contactMotion.ts`, `contactPairQuery.ts`, `contactFamily.ts`, `fixedStep.ts` and existing pair fixture helper.

Sole next writer owns exactly:

- `game/src/physics/contactPairQuery.ts` — extract pure cast validation only; preserve the numerical query algorithm.
- `game/tests/contactPairQuery.test.mjs` — retain all tests/gates and add direct validation controls.
- NEW `game/src/physics/armContactBatch.ts`.
- NEW `game/tests/armContactBatch.test.mjs`.

Everything else is read-only, including arm owner, accepted motion/family/helper, browser/runtime, dependencies, coordinator docs and Claude's environment. Parent handles Git/docs/final full suites. No native allocation/query oracle, new package, world-step/solver change or worker Git write.

## Task1: pure shared cast validation

Export this small data contract from the existing pair module:

```ts
export type ContactIntervalIdentity = {
  worldEpoch: string; fromTick: number; toTick: number; dtS: number;
};
export function validateLinearContactCast(
  interval: ContactIntervalIdentity, cast: LinearContactCast,
): LinearContactCast;
```

It validates/detaches the **same** cast contract already implemented by pair preflight: nonempty exact epoch/IDs, safe nonnegative adjacent interval ticks, dt===FIXED_DT, cast tick match, finite float32-representable fields, dense positive box/ball dimensions with1mm minimum full feature, rigid normalized start pose with existing scale policy, whole endpoint extents≤32m, finite velocity≤128m/s. No clamping, native shape construction, Rapier initialization, world, handles or contact call. Preserve accepted coordinate and quaternion behavior exactly.

Split existing private shape checking from the `new RAPIER.Cuboid/Ball` construction as needed; do not duplicate cast validation in the batch module. `prepare` keeps its existing accepted-motion/target membership checks, invokes this pure helper and then constructs native shapes/derived private data for the unchanged query algorithm. Do not generalize supported geometry or expose native preflight objects publicly.

- [ ] Direct missing-helper RED, then observe invalid/boundary/copy cases through RED→GREEN.
- [ ] Retain the existing pair rejection table/frozen numerical controls. New subprocess direct-validator test instruments WebAssembly initialization and actual native shape-allocation/contact methods to prove validation neither initializes nor allocates/queries native shapes. Restore in finally; subprocess isolation for module-init controls. Do not assign readonly Rapier exports to spy on constructors; ordinary JavaScript shape-object construction is also excluded by the helper's source/contract review, but do not claim that a native-allocation spy independently proves absence of JS constructors. Valid normalizations, extents, dense/sparse shape data, float32 underflow and source/result mutation remain covered.
- [ ] Focused pair suite and typecheck before the owner wrapper; no unrelated pair algorithm edits.

## Task2: exact owner-bound API

```ts
export const ARM_CONTACT_LIMITS = Object.freeze({ maxNativeCalls: 512, maxCasts: 8 });
export type ArmContactBatchResult = {
  worldEpoch: string; fromTick: number; toTick: number;
  nativeCalls: number; remainingNativeCalls: number;
  snapshot: ArmSnapshot;
  families: ContactFamilyResult[];
};
export async function createArmContactBatch(
  arm: ArmFixture, options?: { maxNativeCalls?: number },
): Promise<{
  queryTick(casts: readonly LinearContactCast[]): ArmContactBatchResult;
  destroy(): void;
}>;
```

Default allowance512; optional smaller allowance must be a safe integer0..512. Validate options before initialization/owner capture. This bounded lab option supports actual work-boundary controls, not a frame-time promise or gameplay setting. Do not add maxCasts override.

Await the existing pair factory once. Then capture the retained actual owner's snapshot once for initialization and store detached epoch/expected refs. Support creation at tick0 with its initial interval; do not try to compile/query that initial interval. Require the accepted named owner roster: body IDs exactly floor/forearm/upper-arm/wall, one `shape` blocker collider each, complete matching body/collider refs and counts4/4/1. Initial and completed snapshots can initialize the wrapper. This explicit arm-specific contract must reject a substituted consistently reduced2/3-collider snapshot rather than accept it as the whole world. It is not a security defense against a deliberately forged owner implementation.

Store complete detached collider descriptors with that roster: ref, blocker role, shape and local rigid pose, not refs alone. This fixture's topology is fixed for the wrapper lifetime. Require matching shape numbers and local translation exactly; compare local quaternion orientation sign-equivalently after normalization with the compiler's existing2e-7 chord tolerance, without rewriting query geometry. Validate scale under the existing rigid policy. The compiled radius is derived from stored local-offset length plus shape radius (box half-diagonal/ball radius); require it to match that deterministic derivation. Do not compare moving body-origin world poses, velocities or animation/physics authority to the creation snapshot. The compiler separately validates those actual interval fields. A future severing/topology-changing owner needs an explicitly revised contract, not a silent bypass here.

Retain one wrapper per arm lifetime. `destroy()` is idempotent, clears wrapper state and rejects future queries without destroying/changing the retained arm. A destroyed arm's snapshot error propagates. The factory must not leak a world because it creates none. Browser generation guarding/disposal of late factory results belongs to its subsequent caller.

## Per-tick transaction

1. Reject a destroyed/failed wrapper. Read `arm.snapshot()` exactly once for this invocation. Require completed interval, same captured epoch, snapshot.tick===interval.toTick, fixed adjacent interval, unchanged complete named roster/counts including matching from/to endpoints. No caller snapshot/roster/motion parameter exists.
2. Check dense cast array length0..8 before traversing/allocating. Validate and detach **every** cast using the pure helper; reject duplicate `(castId,projectileId)` tuples using collision-free keys. Sort by code-unit castId then projectileId. A malformed later cast is an error before any native work, even with zero budget or after an earlier cast that would exhaust it.
3. Reject an interval with toTick≤last consumed tick; no cache/replay native work. Input/owner/preflight errors before consumption are retryable without spending work. Compile `createContactMotion(snapshot.interval)` exactly once, verify its whole collider list equals the independently stored owner roster, and prepare every family manifest from that roster.
4. Mark this interval consumed before the first pair operation (including an empty batch). Initialize its one allowance. Iterate sorted casts × sorted full roster. If remaining≥128, reserve128, run the real pair and refund128−actual calls; actual count must be an integer0..128. Otherwise create the exact accepted `UnqueriedContact`: family-budget, own not-queried evidence, earliest0, calls0, no checkedThrough. No later pair may jump the stable pending prefix. Never silently omit remaining colliders/casts.
5. Resolve each complete family through `resolveContactFamily`; return only after the entire batch succeeds. Any unexpected exception after consumption closes the wrapper, discards partial output and prevents retry with a replenished allowance. Underlying pair-native failures ordinarily return inconclusive and consume their actual calls; they are not wrapper exceptions or misses.
6. Return actual used and remaining allowance, canonical families and the already detached captured snapshot. Do not alias input casts/owner state or sibling results. No retained result cache; mutating a returned result cannot affect a later tick. One family selected hit is not a damage delivery event. Zero casts returns0 used, all allowance remaining, empty families, but still consumes that completed interval.

A new wrapper for the same owner could mathematically create another ledger. The later live controller must own one wrapper per owner lifetime and never recreate it for same-tick retry. This plan does not claim a global process-wide budget registry; its enforceable contract is per retained owner-wrapper lifetime. A reset must destroy wrapper and arm, then create a new epoch.

## Task3: retained native and transaction controls

- [ ] Observe missing factory RED, add creation at actual tick0/completed tick, reject initial-interval query, malformed budget and closed wrapper. Destroy wrapper leaves actual4/4/1 owner intact; owner destroy makes retained wrapper unusable.
- [ ] Actual arm capture/one-animation-step/eight-span physical handoff; every query uses all4 actual blockers, preserves owner snapshot/tick/counts and saved contact-time data. Reproduce horizontal muzzle inside upper-arm -> blocked0, no selected forearm; clear Z-directed muzzle through forearm -> actual selected forearm without exclusions. Query calls `snapshot()` exactly once, compile once and never `arm.step()` itself; read-only instrumentation restores methods in finally.
- [ ] Budgets0/127 give all explicit unqueried0;128 reserves one real pair and leaves other candidates unresolved; prove actual calls debited rather than128. Derive cheap-pair actual cost in a separately captured control, then use cost+128/cost+127 to prove exact remaining reserve boundaries without hard-coding incidental native iteration counts. Full default512 batch has used≤512. Use the real complete roster; do not inject fake pair costs.
- [ ] Two casts/projectiles in the same tick,8 allowed/9 rejected, duplicate tuple and delimiter-collision-safe IDs, permutations yield deep-equal canonical family records for the same owner interval. To compare repeated permutations without violating replay, use separate wrappers strictly in this diagnostic test and explain this does not exercise a live controller's lifetime budget. Production caller must retain one wrapper.
- [ ] Same-tick duplicate, changed request and empty-then-nonempty all reject without native work. A real next owner step permits its next interval. Invalid later cast at zero/default allowance spends no calls and allows valid retry. Sparse arrays, mixed epoch/ticks and malformed owner snapshots/subset roster reject before native work.
- [ ] Temporarily instrument a native boundary to throw unexpectedly after at least one earlier pair has completed (e.g. a failing distance getter on an otherwise returned contact record); wrapper publishes nothing, closes and cannot retry. Restore in finally and verify healthy independent wrapper/native queries afterwards. This is an injected exception boundary, not proof of a genuine WASM failure or vendor cleanup.
- [ ] Pause does not cause a query or queued cast by itself: wrapper has no timer/input. Test the later live controller separately for input/debt semantics rather than claiming them here.
- [ ] Focused pair + arm-batch suites, strict types, self-review. Report exact counts, RED/GREEN, identities, work accounting and ownership limits; no worker Git.

## Acceptance and next automatic work

Independent implementation SPEC then fresh QUALITY after any corrections. Parent reviews exact delta, retained pair gates, full native/typecheck/build/whitespace, commits only accepted exact paths and publishes through verified sp1e canonical refs. No browser/Windows/site release for this nonvisual module.

Then implement the fixed-boundary live cast controller and visible Slicer contact view. Query each completed interval inside the fixed-step callback immediately after owner.step, never only the last interval after a multi-step render frame. Blocked/unresolved stops travel, pause/reset/loss clears casts/debt, generations prevent stale async results,30/60/144Hz commands retain results. Exactly-once anatomy damage and default-on gore remain subsequent systems, not implied by this transaction wrapper.

## Independent contract review

Reused non-family Sol/high reviewer inspected the actual owner/pair source and returned **PASS**. The exact reserve test is feasible using first real candidate costC measured with allowance128, then allowancesC+127/C+128 on separate diagnostic wrappers. Full topology versus moving world-pose comparison has been clarified above from its review. Native totals must equal sum of returned family calls and remaining===allowance−nativeCalls. Review accepts preflight retry, post-consumption closure, original unqueried tags and explicitly per-wrapper lifetime bounds. This is next-plan acceptance only; no source starts before family implementation acceptance.

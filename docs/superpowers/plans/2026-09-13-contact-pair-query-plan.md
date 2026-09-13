# Bounded contact pair query implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans. Continue automatically within the approved scope; retain TDD and ordered independent reviews. This plan must pass numerical/SPEC review and the contact-motion dependency must be accepted before its production writer starts.

**Goal:** Query one cast-locked box/ball projectile against one compiled moving collider over a completed 1/60-second interval, with honest hit brackets, initial blocking and unresolved-contact outcomes.

**Architecture:** An asynchronous initializer prepares the installed Rapier module; the returned synchronous pair-query function uses detached motion and `Shape.contactShape`, never a live physics world. Conservative advancement is bounded per native span; uncertainty and accumulated travel survive span transitions. This is one candidate layer, not global blocker ordering or damage delivery.

**Tech Stack:** Existing Rapier compat0.20.0, Three.js rigid transforms, TypeScript and native Node tests. No dependency, engine, renderer, input, world-step or physics-threshold change.

## Read-only dependencies and ownership

Use `contactMotion.ts` after its independent acceptance. Read its exact exported facade, `poseBinding.ts`, installed `dist/geometry/shape.d.ts` and `contact.d.ts`, and both frozen probe scripts. Source evidence and limitations are in `2026-09-13-contact-query-design.md` and `2026-09-13-contact-3d-probe-results.md`.

Sole writer owns new `game/src/physics/contactPairQuery.ts`, `game/tests/contactPairQuery.test.mjs` and `game/tests/contactPairFixtures.mjs`. All other files, especially `contactMotion.ts`, arm/runtime/UI, Claude's namespace, dependency files and coordinator docs are read-only. No staging/commits by implementer. If the accepted motion API is insufficient, return a concrete integration request rather than quietly modifying its contract.

## Exact public contract

Export `CONTACT_QUERY_LIMITS = Object.freeze({ guardM: .00005, maxBracketM: .001, maxNativeCalls: 128, predictionM: 256 })` and `CONTACT_QUERY_EVIDENCE = 'declared-motion-model-empirical-native-guard'`.

```ts
type Motion = ReturnType<typeof createContactMotion>;
export type LinearContactCast = {
  worldEpoch: string; fromTick: number; toTick: number;
  castId: string; projectileId: string;
  shape: ContactShape;
  startPose: RigidTransform;
  endPosition: Vec3;
};
type PairIdentity = {
  worldEpoch: string; fromTick: number; toTick: number;
  castId: string; projectileId: string; target: ColliderRef;
};
type PairBase = {
  identity: PairIdentity;
  evidence: typeof CONTACT_QUERY_EVIDENCE;
  nativeCalls: number;
};
export type ContactPairGeometry = {
  projectileWorld: RigidTransform;
  targetBodyOriginWorld: RigidTransform;
  targetColliderWorld: RigidTransform;
  projectileWitnessWorld: Vec3; targetWitnessWorld: Vec3;
  projectileWitnessLocal: Vec3;
  targetWitnessColliderLocal: Vec3; targetWitnessBodyLocal: Vec3;
  projectileNormalWorld: Vec3; targetNormalWorld: Vec3;
  targetNormalColliderLocal: Vec3; targetNormalBodyLocal: Vec3;
};
export type ContactPairResult = PairBase & (
  | { kind: 'miss' }
  | { kind: 'initial-blocked'; earliestPossibleS: 0; reason: 'overlap-or-within-guard' }
  | { kind: 'hit'; lowerS: number; upperS: number;
      timeOfImpactS: number; intervalFraction: number;
      bracketTravelM: number; uncertaintyBoundM: number;
      geometry: ContactPairGeometry }
  | { kind: 'inconclusive'; earliestPossibleS: number; checkedThroughS: number;
      reason: 'budget' | 'graze' | 'native-geometry' | 'unbracketed'
        | 'width' | 'stall' }
);
export async function createContactPairQuery(): Promise<(
  motion: Motion, cast: LinearContactCast, target: ColliderRef,
) => ContactPairResult>;
```

Import existing public types; keep helper types private unless specified. Cast orientation is constant for the interval. Target rotation is the compiled per-span model. Shape local offsets are baked into projectile `startPose`; do not add a projectile rotation curve or physics body. Stable cast/projectile IDs are data, not a damage-deduplication registry. Global winner selection and exactly-once delivery follow in separate tasks.

## Preflight and retained ownership

- Initialize Rapier once with a module-local promise; propagate initialization failure honestly. No `World`, bodies, colliders, handles, native time advance or owner restoration.
- Require the accepted motion model, exact matching worldEpoch/adjacent fromTick/toTick and fixed dt. Nonempty cast/projectile IDs, well-formed target ref and registered blocker membership. Unknown, stale or unsupported input throws a descriptive error before native queries; it is not a miss. Reject malformed cast data even if geometry would be far away.
- Detach cast/target values locally. Validate rigid start pose and finite float32 positions, positive float32 box/ball dimensions, minimum full dimension/diameter1mm, origin travel speed≤128m/s. Radius is box half-diagonal or ball radius. Both endpoint centers plus this radius must fit each[-32,32]axis; the linear path is then bounded. Do not silently clamp or skip a collider.
- Return fresh finite data; mutating a result must not change another result, caller input or compiled motion. No global cache keyed only by user ID and no output references to mutable native query objects.
- Target metadata comes from `motion.colliders()` and samples from `motion.sample()`. This layer does not filter a caster's anatomy or choose among blockers; those are explicit owning combat/global-query responsibilities.

## Numerical algorithm to implement

1. Set `time=0`, global nativeCalls0, cumulative travel0, earliest uncertainty unset. At every time use the target's right-span frame. The projectile center is LERP(start,end,time/dt), with constant normalized start rotation.
2. Current relative point-speed bound = projectile center speed + target frame pointSpeedBoundMps. Advance only up to the current target span end. The bracket's travel measure integrates this bound over each traversed span, not final-span speed×total duration.
3. Call projectileShape.contactShape(projectile pose, target shape/pose, prediction256). Enforce a global128call ceiling across all spans. Unexpected throw, null or nonfinite distance gives explicit inconclusive-native-geometry with conservative earliestPossibleS. Never turn a native failure into a miss. Witness/normal validation follows the initial-block test below.
4. At time0, distance≤guard returns initial-blocked **without** trusting/returning cut normals or witnesses. This test precedes ordinary unit-normal requirements: overlap records may not be regular surface contacts.
5. For ordinary geometry, all four point/normal vectors must be finite. Require each normal length within1e-4 of1, opposition residual≤1e-4, and `|point2-point1-distance*normal1|≤guard`. Validate before normalizing output. `contactShape` data is already world-space. Do not apply body transforms to its world witnesses a second time.
6. At distance≤-guard, require prior uncertainty. Without it return inconclusive-unbracketed. Otherwise set `lowerS=firstUncertaintyS` and compute integrated bracketTravelM from that first uncertain time to current time; `uncertaintyBoundM=bracketTravelM+2*guard`. A hit requires uncertaintyBoundM≤1mm. Wider brackets return inconclusive-width, retaining earliest uncertainty. `upperS=timeOfImpactS=current time`, `intervalFraction=time/dt`, geometry is evaluated at that upper-time pose. This is bounded empirical-model contact evidence, not an exact mathematical first-contact instant.
7. For a nonterminal sample, latch the current time as first uncertainty if absent whenever distance≤2guard, **before** any prune or zero-speed shortcut. With distance>guard, a scalar separation bound or fixed-world separating-plane bound may prove the **remaining current span** clear. Set `n=normalized validated normal1` and `remainingS=spanEndS-time`. The plane bound is `max(0,(projectileVelocity-targetOriginVelocity)·n) + |n × targetWorldOmega|*targetRadiusFromBodyOrigin`. Scalar prune requires `distance>guard && distance-guard>relativeSpeed*remainingS`; plane prune requires `distance>guard && distance-guard>planeBound*remainingS`. Both inequalities are strict. A successful span prune jumps to its end, accounts for travel and keeps any earlier uncertainty. It never clears the uncertainty latch.
8. Otherwise, if distance>2guard, step `.9*(distance-guard)/relativeSpeed`. Within2guard retain the first uncertainty and step `2guard/relativeSpeed`. Clip to current span end, not the whole interval. For relativeSpeed0, advance to span end conservatively: `-guard<distance≤guard` is unresolved with the current/prior uncertainty retained, never a clear span or division by zero. A nonfinite or nonincreasing time advance gives inconclusive-stall. Validate all derived scalar/vector values.
9. The full-interval endpoint check occurs after penetration/geometry handling but before trying another advancement. At that endpoint, return miss only if no unresolved uncertainty remains and distance>guard. Otherwise return inconclusive-graze, using any retained uncertainty or the endpoint itself as earliestPossibleS. This avoids a terminal guard-band contact becoming a false miss or an artificial no-progress failure. At budget exhaustion return inconclusive-budget; earliestPossibleS is the earliest retained uncertainty or conservative end of the time range already proved clear, never a later convenient sample. `checkedThroughS` means evaluated time, not proof of continuous native motion.
10. Derive local witnesses with inverse contact-time projectile/body/collider rigid transforms. Derive local normals with inverse rotations only. Return detached target identity and current timing; non-hit variants have no geometry property.

Do not add a generic injected distance oracle to production solely to test errors. Existing runtime functions/prototypes can be temporarily instrumented in tests with finally restoration if a real native error needs reproduction; ordinary hit/miss controls must use real Rapier queries.

## Task 1 — pair query and retained controls

- [ ] Write `contactPairQuery.test.mjs` with dynamic-import/existsSync assertion for createContactPairQuery, observe correct missing-feature RED, then implement initialization and preflight through small RED→GREEN groups.

```js
const queryUrl = new URL('../src/physics/contactPairQuery.ts', import.meta.url);
const api = existsSync(queryUrl) ? await import(queryUrl.href) : {};
test('provides a bounded world-free contact pair query', async () => {
  assert.equal(typeof api.createContactPairQuery, 'function');
  assert.equal(typeof await api.createContactPairQuery(), 'function');
});
```

- [ ] Add `contactPairFixtures.mjs` as test-only authored interval construction and independent analytic/OBB geometry helpers. Keep it outside production imports. Fixture records explicitly represent synthetic test trajectories, not measurements of a real arm. Construct complete matching from/to/native samples accepted by createContactMotion; actual-arm tests separately use the real fixture and saved snapshots.
- [ ] Add analytic ball crossing, both frozen-target negative controls, offsetY=.201 miss, exact time/fraction assertions and detached world/local witness checks before implementing contact advancement. Required scaled analytic TOI is `(1-.2/Math.SQRT2)/120`; assert `lowerS≤analyticalTOI≤upperS`, `upperS===timeOfImpactS` and `intervalFraction===upperS/dt`, not exact equality of the upper bound with the analytical first time. Both centers travel2m in1/60, i.e.120m/s each, within the locked128m/s stress domain.
- [ ] Implement the bounded algorithm above through observed RED→GREEN, then retain the exact locked-projectile36-case general3D matrix at origins0/+31/-31 from `probe-contact-3d.mjs`, plus the earlier Z-axis matrix. Bake constant projectile local transform into start pose; target keeps independent body/local transforms. Compare against independent SAT geometry. Preserve maximum1mm uncertainty and the frozen fixtures'0.15mm observed TOI-position regression gate; do not raise gates after failures.
- [ ] Retain the actual large wall/floor and10mmwall analytical controls, in-domain translations, matched close misses, initial overlap/within-guard and start-next-to-wall. Initial blocked result has no cut geometry. Out-of-domain large-shape translations reject instead of silently moving the world.
- [ ] Retain all three small two-span uncertainty-latch adversaries and at least the radius.1 earlier-hit128call exhaustion case from the frozen probe. Assert the earliest possible contact remains earlier than the knot/later penetration. No reset at knots; cumulative travel uses both span speeds. Add exact-knot, stationary and velocity-reversal cases, a guard-boundary prune equality, and a stationary guard-band span followed by departure. No zero-speed branch may erase or postpone earlier uncertainty.
- [ ] Retain actual arm read-only sampling across eight spans with horizontal/vertical cast shapes and nonidentity collider-local geometry. Confirm owner snapshot/tick/counts unchanged, including querying saved data after owner destruction. Do not claim actual-arm anatomical damage or continuous solver accuracy.
- [ ] Retain all malformed/stale/shape/coordinate/speed inputs and result/input mutation checks. Invalid initialization/native output is not a miss. Native failure on the first sample retains earliestPossibleS0; failure after an uncertain crossing retains that earlier uncertainty. When temporarily instrumenting native calls, restore in finally, prove restoration and do not run those controls concurrently with other native users.
- [ ] Run `rtk proxy node --test tests/contactPairQuery.test.mjs`, then `rtk proxy npm run typecheck`. Self-review and return source paths, honest RED/GREEN evidence, results and remaining limits. No Git writes.

## Task 2 — acceptance and automatic next step

Planning review: independent Astra/high numerical/SPEC **PASS**, including installed Rapier world-space witness semantics, plane-closing sign and cross-span latch/travel bounds. The three requested wording clarifications (strict guarded prune with unit working normal, latch before zero-speed shortcuts, and lower/upper bracket semantics) are incorporated above without changing fixture gates. This is plan acceptance only; production starts after the contact-motion implementation dependency is accepted.

- [ ] Independent SPEC review of actual code/tests against this contract and frozen diagnostics, then implementer fixes relevant findings with regression coverage.
- [ ] Fresh ordered QUALITY review; resolve correctness, coordinate/uncertainty/order and resource concerns before acceptance.
- [ ] Parent focused checks, full strict/native suite, production build and whitespace check; exact-path commit only after acceptance. No visual/browser acceptance claim for this pairwise numerical module.
- [ ] Continue automatically to global first-blocker ordering and cast identity/lifecycle, then the visible arm-lab Slicer demonstration. A pairwise hit does not complete the full B02a acceptance matrix.

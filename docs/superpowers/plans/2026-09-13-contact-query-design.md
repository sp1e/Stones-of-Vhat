# B02a pairwise contact — dependent design working note

Status: design preparation while the contact-motion compiler is implemented; **not an executable approved plan, query implementation, or accepted collision result**. Coordinator-owned. It consolidates the frozen diagnostics and independent numerical review, so the next writer does not restart research.

Update: the motion dependency is accepted as12b4a36, and the exact [pair-query implementation plan](2026-09-13-contact-pair-query-plan.md) has independent numerical/SPEC PASS. Its sole writer is active. The prose below remains design context; use that executable plan for current API/predicates. Pair-query source and visible contact acceptance are still pending.

The extended general3D, large-geometry and cross-span uncertainty controls are now preserved and independently reproduced in [the3D diagnostic results](2026-09-13-contact-3d-probe-results.md). Use those exact retained fixtures in the executable query plan; do not replace failure controls with easier paths.

## Purpose and authority

The next visible combat demonstration needs a cast-locked thin magic blade meeting a moving arm with correct contact identity, time and local frames. This pairwise layer only supplies candidate contact evidence. Damage, sword attacks, incapacitation, severing, gore and player injury consume it later; no hidden damage is applied by reading a query.

Use the current detached `createContactMotion` facade after its acceptance. Preserve native integration, sample count and its explicitly declared piecewise body-origin LERP / shortest SLERP model. A cast trajectory is authored linear motion, not falsely labelled a measured native trace. It exists for precisely the same completed 1/60 interval as its targets. Spawning is at the interval's beginning boundary, not retroactive halfway through a completed step.

## Proposed pair API to lock after probes

One asynchronous factory initializes the existing Rapier module once; repeated pair queries are synchronous, allocate no live physics world, and do not mutate owners. Projectile descriptor carries worldEpoch, fromTick, toTick, castId, projectileId, constant orientation, box/ball volume, start position and end position. Identity/time validation occurs before any native call. Sampling the projectile is simple linear position interpolation with constant orientation; no unobserved rotating blade is smuggled through this interface.

Target descriptor is a stable collider ref resolved through the compiled motion facade. Candidate output discriminates:

- `miss`: declared model found no contact under its bounded numerical policy; never means a generic physical CCD certificate.
- `initial-blocked`: overlap or uncertainty at offset0; stops permitted travel but supplies no trusted cutting angle or normal.
- `hit`: bracket [lowerS,upperS], contact-time body/collider/projectile poses, detached explicitly world/local witnesses and normals, stable IDs, native-call count and empirical error-policy tag.
- `inconclusive`: earliestPossibleS, checked time, reason and count; no trusted damage/cut geometry. Reasons cover budget, unresolved graze, malformed native geometry, unbracketed penetration, excessive bracket width or numerical progress failure.

Do not expose native handles. Stable data is not automatically current data: the eventual consumer revalidates epoch, cast state and collider/anatomy membership before committing one effect.

## Conservative advancement decisions

Retain the frozen probe's 50 micrometre empirical distance guard and 1mm contact-bracket budget as preregistered engineering gates. They are not formal guarantees for every Rapier shape/aspect ratio; next probes must cover the actual large wall/floor geometry and noncommuting 3D rotations before acceptance. No widening after a failed run.

At each current time, resolve the right target span and evaluate the actual composed collider pose with `Shape.contactShape`. Installed 0.20.0 declarations explicitly return world-space contact data. A 256m prediction covers the bounded ±32m geometry domain; an unexpected null/malformed record is inconclusive, not a miss.

For a target span, origin velocity and world SLERP axis are constant. The scalar point-speed bound combines projectile translation and target origin/rotational-radius bounds. Native distance minus the guard bounds a conservative advancement only **within that span**. The world-fixed separating-plane bound uses relative velocity projected onto the validated normal plus `|normal × omega| * radius`; it cannot be carried across a knot where angular or origin velocity changes.

Maintain a single earliest-uncertainty latch across all spans. Once a near/grazing encounter is unresolved, a later positive distance or knot cannot erase the possibility of an earlier contact. Later penetration is a usable first-contact bracket only when the entire uncertainty bracket meets the locked width gate; otherwise report inconclusive. This prevents a briefly crossed arm from turning into a false miss, or a later torso contact masquerading as the first hit.

Initial distance within the guard is blocked/uncertain, not a regular surface hit. Noninitial negative distance without a preceding defensible bracket is inconclusive. Native-call budget is finite across the entire pair, not refreshed per span. End-time equality and floating-point lack of progress are explicit cases. Every native normal/witness must be finite; usable normals must be approximately unit, opposite and consistent with signed witness separation before any normalization for output. Name the transform used for every local record.

## Candidate ordering after pair acceptance

Compare all blocker candidates at common physical offset seconds. A definite first candidate requires its bracket upper bound to be strictly earlier than every competitor's earliest possible time. Overlapping brackets form an explicit ambiguous blocker set; stable identity sorts presentation but cannot decide physical precedence. Earlier inconclusive candidates block later definite damage. Exact-tie policy and stable delivery identity will be implemented/tested separately, not inferred from array order.

The initial cast excludes the caster's anatomy explicitly at the owning combat layer, never all `navigation` geometry indiscriminately without the motion compiler's role validation. A thin wall, shield/prop, arm and farther body must share the same ordering pass.

## Required measurement cases

1. Analytic balls: radius0.1, starts(-1,0,0)/(0,0,-1), ends(1,0,0)/(0,0,1), all within1/60. Analytic TOI `(1-.2/sqrt(2))/120`; frozen target start and end both miss, target Y=.201 also misses. Preserve original1s/0.5s low-level native-cast controls separately for unit comparisons.
2. Frozen 36-box matrix: horizontal/vertical blade,8/16/40m/s, target±3m/s and0/180/360deg/s, independent local offsets/rotations and translated-origin controls. Do not silently alter those authored trajectories.
3. Noncommuting initial world/local rotations and a constant general3D world axis; independent full15-axis double-precision OBB SAT time control, with quantified scan uncertainty and no blanket claim about arbitrarily short grazes.
4. Actual measured arm tracks with all eight native spans and changed trajectory at contact; both blade orientations. A chord-only negative control must remain visibly different where documented.
5. Large existing floor and wall,10mm thin wall, clean misses and guard-band grazes. Translations must respect the **whole geometry** ±32m extent; +31m is not valid for a20m-tall wall with its sphere radius. Use justified in-domain shifts for large fixtures.
6. Earlier uncertain near/graze in one span followed by later penetration in another. Earliest uncertainty must survive; no later false certainty. Exact knot contact, zero motion, budget exhaustion and no-progress controls.
7. Moving shield, thin wall, arm and farther body in permuted registration order; overlapping/tied brackets and an earlier inconclusive blocker. Local/world witness transforms against independently composed contact-time poses.

The next executable plan will map these cases to exact owned source/test files and retain TDD evidence before production code. Parent continues automatically after track acceptance; no new user design approval is required for these existing technical requirements.

## Environment integration boundary

Claude's authored route spans well beyond the arm lab's ±32m query domain and may contain more than the bounded track compiler's64bodies/128colliders. Those are deliberate first-query limits, not approved city dimensions or a reason to shrink his level. Before connecting combat to that environment, implement a conservative spatial candidate policy and a verified query-local coordinate frame (or another measured numerical solution) that includes every possible nearer blocker. Do not pass only convenient nearby bodies and claim global earliest contact. Static large surfaces and cylinder/capsule blockers need explicit supported handling; the current box/ball lab is not the whole-world combat adapter.

Also retain a cumulative travel bound across uncertainty spans: sum each span's point-speed bound × traversed duration. Using only the final span's speed across the whole uncertainty period can understate bracket error after a velocity change. The independent two-span shallow-contact diagnostic is being preserved as a permanent negative control for this issue and for resetting the uncertainty latch.

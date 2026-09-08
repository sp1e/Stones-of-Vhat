# Next bounded slice: time-aware Slicer contact (B02a)

Status: **continuation brief, not an executable plan or implemented projectile**. It follows the approved chapter and [research adoption](2026-09-08-research-adoption.md). The prerequisite bounded arm/lab is now independently spec/quality approved, with strict 104/104 native, 13/13 browser and web build PASS; see [arm results](2026-09-08-arm-lab-results.md). Write and review the exact B02a executable plan next. No new game-design interview is needed to continue this unchanged scope.

## Why this follows the arm

The research's B02 depends on B01's motion/identity contract but explicitly permits contact fixtures before a full rig. The current arm gives nonidentity local collider poses, animated and physical motion, epoch references and actual completed intervals. It does not close B01's hip/knee, full-body stairs/wall, anatomical-limit or 24-body budget requirements. Those remain separate; neither this arm nor a passing contact query locks the engine choice.

Relevant inputs:

- [Research B01–B04 backlog](../../research/deep-research/2026-09-08/implementation-backlog.md).
- [Measured relative linear contact](2026-09-08-relative-contact-probe-results.md), including analytical crossing, matched near miss, seconds-versus-fraction units, local witness transforms and non-unit start-overlap caveats.
- `game/src/physics/bodyMotion.ts`: detached `initial` or adjacent `completed` interval, body/collider refs, origin/COM distinction, endpoint local collider poses and explicit shape/authority discontinuities.
- `game/src/physics/armFixture.ts`: the accepted procedural arm and its reviewed physical-integration addendum. Animation uses one native 1/60 step and physics eight native 1/480 steps inside the same authoritative 1/60 interval; the fallback passed dense acceptance. Its `lastPhysicsStep` samples are diagnostic metrics, **not full collider-pose trajectories**. If measured contact accuracy needs native-step poses, specify and review that bounded history extension first; do not pretend the current two endpoints or COM/anchor metrics already supply it. Do not add hidden anatomy obstacles to the normal Grip yard.
- Approved Slicer direction: cast-locked horizontal/vertical plane, prepared anatomical zones later, closest blocker before farther damage. No arbitrary mesh cutting.

## Deliverable

One small contact-query module and reproducible fixture extension that reports **which collider is first, when contact happens and the contact frame**, with no damage, severing, gore effects, Focus economy or full spell UI yet. Make the same run inspectable in a separate development view. Reuse the current world and record types; do not introduce an ECS, second live physics authority, engine replacement or new dependencies by default.

Before writing production code, write and fully review the executable TDD plan with exact fixtures, tolerances and APIs. A prior successful two-ball query is a test seed, not an adequate rotating-arm implementation.

## Decisions the executable plan must make explicit

1. **Time and ordering.** Consume one completed 1/60 interval; distinguish contact seconds from normalized interval fractions. Do not advance the physics world during a read/query. Document spawn/muzzle timing and whether an initial-overlap result blocks travel without pretending it is a normal surface hit.
2. **Identity.** Contact records carry world epoch, projectile/cast identity, body and collider identity, plus an explicit contact sequence/ordinal when needed. No native handles escape. Two distinct projectiles must not merge, and one delivered contact must not later become duplicate damage. Define revalidation at the eventual consumer boundary rather than reusing stale candidates after topology changes.
3. **Relative motion.** Use both projectile and target endpoint trajectories, including collider-local transforms. Body origin is not collider center or COM. Preserve the crossing case that both frozen-endpoint controls miss. Declare interpolation assumptions: two endpoint poses alone do not reconstruct a curved or collision-deflected path between them. Treat the result as contact on the declared motion model, with a measured error bound, not exact recovery of every internal solver trajectory.
4. **Rotation.** Pick a bounded query/subdivision approach only after measured rotating non-sphere controls. Declare the error model, maximum supported per-interval rotation, iteration/substep ceiling and inconclusive result behavior. Endpoint quaternions cannot reveal an unobserved full turn; do not silently interpret an unsupported spin or teleport as a short smooth arc. Native linear casts alone do not prove angular CCD; an expanded safety volume is not an anatomical cut hit.
5. **Blocking.** Compare candidates at common physical time, including a moving shield/prop, an intervening thin wall and another body behind the arm. Define deterministic ties independently of array/registration order. A farther target cannot take damage through a nearer blocker.
6. **Discontinuities.** Initial interval, crouch shape change and authority transfer are not interchangeable with smooth rigid interpolation. Explicitly reject or handle each supported case; do not interpolate a changing capsule as if its geometry were constant.
7. **Output validity.** Return detached finite values, named world/local frames, validated usable normals and witnesses at contact-time poses. Never turn malformed/overlap geometry into a trusted cut-plane angle. Preserve native float32 boundary safeguards from the core. Declare the supported coordinate extent and include float32 precision in the contact error budget: a finite representable coordinate does not by itself guarantee millimetre accuracy. Add a translated-origin control within that declared extent.

## Minimum test matrix

- Reproduce the analytic 0.4292893218813453 s two-ball crossing and matched offset-Y=0.201 m miss, including both frozen-target negative controls and equivalent time/fraction parameterization. Keep the original one-second query as a low-level reference; additionally time-scale the exact paths into one 1/60 interval so the production completed-interval API is exercised without changing its fixed-step contract. That scaled case is a query stress control, not a gameplay speed.
- Actual arm collider motion, horizontal and vertical cast planes, and independent collider-local offsets/rotations. A static spherical control is insufficient for this group.
- Proposed research stress values: projectile speeds 8/16/40 m/s, target translation in both directions, target angular rates 0/180/360 degrees/s. These are fixture stress values, not decided gameplay balance. Lock the full authored trajectory and uncertainty tolerance before measuring.
- A 10 mm test wall with the research's proposed maximum 1 mm contact-position error, unless the executable plan first documents a more defensible bound. Do not increase an already locked bound after failure. Include matched close misses so conservative broad-phase candidates cannot masquerade as actual hits.
- Moving shield in front of arm, body behind arm, simultaneous/tied candidates, start overlap and muzzle next to a wall. Prove earliest blocker using an independent analytical/high-resolution control with its own quantified error.
- New epoch, stale collider, detached output mutation, two projectiles in one tick and repeated delivery of one contact. No full damage graph is added merely to test event identity.
- Same fixed commands under 30/60/144 Hz render grouping; pause/restart clears queued casts and time debt. Failures leave no half-applied future damage.

Record both passing and failing measurements. If rotational/closest-contact acceptance fails, isolate the query/frame/order issue first. Alternative engines or helper representations require evidence and a scoped decision, not a silent change to the game vision.

## Team, verification and boundaries

Use the established team workflow: one coupled production writer, independent spec then quality review, parent-owned final checks/status/index. A read-only analytical/query probe may run alongside useful implementation/planning. Read only the relevant installed API declarations and primary-source references; preserve the user-owned research work/source cache.

Preserve the accepted Grip behavior, core/arm native tests, normal browser tests and lab resource/recovery cases. Require actual visual inspection of the new contact demonstration, not screenshot existence alone. Keep web production free of development entries. No mobile, desktop rebuild/launch, Defender changes, publication, final NPC assets or full gore claim is part of this next query slice.

After B02a: a first playable ranged spell can consume the reviewed contact contract; full B02 damage ordering/zone angles, B01 complete-rig stability, B03 skinned prepared severing and B07 packaged asset validation remain tracked before the broader B04 engine decision.

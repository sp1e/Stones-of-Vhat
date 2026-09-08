# Next slice: B01a body motion and physical pose handoff

Date: 2026-09-08. Status: **bounded implementation brief, not implemented and not an executable TDD plan yet**. Prepared from the completed research and a read-only inspection of the current Grip runtime. Continue after the Grip input/UI review gate, within Simon's existing authorization to develop the approved PC game; no new design interview is needed for this unchanged scope.

## Outcome

Give moving-contact queries a trustworthy identity and motion interval, then exercise animation-to-physics transfer with one procedural two-segment arm and a narrow installed-version joint adapter. This is a reusable prerequisite and representative fixture, not a complete humanoid, final asset, anatomical-limit validation or finished B01 milestone.

Keep the current Three.js/TypeScript/Rapier dependencies. Reuse the existing world and body map; do not introduce a general ECS, new engine or parallel authority over physical transforms. One implementation owner first writes/reviews the executable tests and plan, observes RED, implements, then receives independent spec and quality review.

## Important current distinction

`yard.ts` exposes stable authored body strings and detached pre/post body poses. Its `position` comes from `body.translation()` (body origin), while `velocity` comes from `body.linvel()` (center-of-mass velocity). They coincide for current centered props, not necessarily for an offset collider or bone binding. The new contract must explicitly name **body origin, COM and bone origin**, not silently treat them as the same point.

`main.ts`'s existing `generation` only guards asynchronous world replacement. A future retained collider/contact reference needs the simulation world's epoch in its own identity; a reused authored name or Rapier handle must not revive old contact data.

## Bounded proposed ownership

| Area | Responsibility |
| --- | --- |
| `game/src/physics/bodyMotion.ts` | Small body/collider identity registry with private Rapier handles, world epoch, named collider-local poses and explicit query roles. Publish detached, completed `{worldEpoch, tick, dtS, bodies}` intervals around the existing fixed step. Include body pose, COM and velocities with unambiguous units/frames. |
| `game/src/physics/poseBinding.ts` | Validated rigid bone-to-body bindings, world/local conversions, two-sample COM velocity and shortest-quaternion angular velocity. Atomic handoff at an explicit fixed-step boundary; animation stops owning transferred bodies. |
| `game/src/physics/rapierJointLimits.ts` | Narrow Rapier 0.20.0 limit adapter, validated local frames and raw angular axes. Isolate the measured generic-mask semantics/version assumptions; no invented top-level `RawJointAxis` dependency. |
| `yard.ts` and focused test fixtures | Minimal interval/epoch integration, invalidation on destroy, and one procedural arm with declared masses/binds/limits. Preserve the existing centered-prop Grip scope and all browser regressions. |

These filenames/API shapes are planning proposals. Resolve exact signatures in the executable plan, avoiding duplicate state and speculative features without a fixture consumer.

## Required RED contracts

| Case | What must actually be demonstrated |
| --- | --- |
| Identity | Body/collider identities survive motion and authority transfer; a new world rejects old refs despite reused authored names. Duplicate registration fails before partial allocation. |
| Motion intervals | Static, dynamic and animated bodies belong to the same adjacent fixed-step boundaries. Reads do not advance time; mutation of any returned pose/collider record cannot affect the simulation. Initial interval is explicit. |
| Bind round trip | Translated/rotated parent and nonidentity bind round-trip through world body, world bone and local bone. Reject zero/nonfinite quaternion and unsupported non-rigid scale. Identity-only tests are insufficient. |
| COM velocity | A rotating arm with a stationary character root still transfers COM motion. Quaternion sign reversal does not change angular velocity. Missing history or invalid sample duration fails before mutation. |
| Atomic handoff | Bent moving arm does not snap to rest pose; preregister the research's proposed 2 mm/1 degree immediate-pose tolerance for this fixture. IDs/counts/mass stay constant, velocities survive, animator cannot overwrite afterward, and a subsequent point impulse is applied once. |
| Joint positive controls | Both torque signs and rotated frames for raw axes 3/4/5. Unlimited controls must really rotate past the bound. Distinguish generic mask 7 from mask 56 so locked rotation cannot falsely prove working limits. |
| Coupled physical fixture | Dynamic parent, gravity, a wall and both enabled axes; finite motion, declared anchor/contact limits, mass/body counts and measured excursions/energy. A projected single quaternion component does not establish anatomical swing/twist. |
| Lifecycle | Destroy during animation and after transfer, idempotent disposal, rejected stale refs/queued transfers, repeated worlds with no retained bodies/joints/controllers. |
| Replay | Same animation samples, handoff tick and impulse under 30/60/144 Hz render grouping produce the same same-build trajectory. Pause does not create samples, time debt or delayed handoff. |

Lock fixture tolerances before measuring; label them engineering test limits, not user-approved gameplay balance. Add visible pose/contact evidence when this fixture receives a rendered view. Pure mathematics or raw API readback alone cannot close playable ragdoll acceptance.

## Follow-on and explicit deferrals

B02 consumes these intervals: first the analytically known crossing/near miss, then non-spherical rotation, all nearer blockers and blocked starting volume. Endpoint interpolation alone is not rotational CCD. Do not rewind one body after the world has already resolved its contacts. Revalidate identities after later anatomy changes.

Defer full-body production (11–24 bodies), final anatomical cones, nine sever connections, damage transactions, real skinned/clothed assets, caps/LOD, connected-anatomy Grip, checkpoint schema, B07 resource-policy changes and B04 final engine choice. The complete approved chapter and gore-on-default requirement remain unchanged.

## Evidence to load

- [Adopted research order and decisions](2026-09-08-research-adoption.md).
- [Research backlog B01/B02](../../research/deep-research/2026-09-08/implementation-backlog.md), including proposed immediate-handoff tolerances and motion/identity dependency.
- [Technical dossier](../../research/deep-research/2026-09-08/technical-dossier.md): fixed-step order, contact identity/revalidation and bone/body pose equations.
- [Measured joint controls and remaining limits](2026-09-08-rapier-joint-probe-results.md).
- [Relative-contact positive/negative controls](2026-09-08-relative-contact-probe-results.md).
- Current `game/src/physics/yard.ts`, installed Rapier `dist/dynamics/rigid_body.d.ts` (`localCom`, `worldCom`), and existing Grip/yard lifecycle and replay tests.

No code, fixture, test run, dependency change or asset was produced by this brief itself.

# Physical courtyard implementation results

Date: 2026-09-05. Scope: the real Rapier world, authored prototype content, capsule movement, and native integration tests. This module is not a playable browser build yet; rendering and browser controls remain the following integration stage. Geometry is a gameplay prototype, not historical reconstruction.

## Delivered contract

- `game/src/content/yardLayout.ts`: typed metre-scale layout with stable IDs, one floor, four walls, five stairs, high block, rotated ramp, low passage, and five dynamic wood/stone props. Twenty authored rigid bodies plus the player capsule.
- `game/src/physics/yard.ts`: singleton Rapier initialization; fixed/dynamic body creation with matching box, ball, and cylinder colliders; a kinematic first-person capsule; walking, sprinting, crouching, jump/gravity, collision sliding, autostep, slope thresholds, ground snap, dynamic impulses, interpolation snapshots, and idempotent disposal.
- `game/tests/yard.test.mjs`: nine real-physics acceptance tests with legitimate layout/spawn injection. No Rapier mocks or test-only simulation mutators.

The world explicitly performs one initialization `world.step()` after construction to publish fresh colliders to the query pipeline. Initial poses are recorded after this warmup. Every live `step(intent)` then performs exactly one step at `FIXED_DT` (1/60 second). Stance changes update collider shapes and propagate body positions without extra simulation steps. Standing clearance queries exclude the player body/collider and sensors.

Destroy removes the character controller before freeing its world and clears pose/body maps. Ten fresh worlds verify body/collider counts of 2/2 for the floor fixture, then 0/0 after repeated destruction. Snapshots and interpolation fields are detached; invalid non-finite movement axes/yaw reject before changing state. Duplicate authored IDs reject before allocating a world. `step` and `snapshot` fail clearly after destruction.

## Observed RED and GREEN

Before implementation, `rtk node --test game/tests/yard.test.mjs` reported six failures and zero passes. Each failure was the meaningful assertion `createYard must provide the real physics simulation`, with actual `undefined` versus expected `function`. The conditional import avoided a missing-module loader failure.

The first implementation passed five of six tests. The unchanged diagonal-distance assertion caught inconsistent large-floor contact behavior: straight travel was 4.129799 m while diagonal travel was 4.194910 m. Direct real-Rapier trajectory experiments reproduced the issue with the default 0.0001 m normal nudge. Setting `controller.setNormalNudgeFactor(0.002)` made the original yaw-zero checks pass but did not resolve the general instability. Subsequent independent review found stalls at rotated headings. The nudge override has now been removed; the default is retained. The initial yaw-zero coverage and corresponding stability claim were insufficient.

After this correction, all six original tests passed. A seventh acceptance test additionally verified the authored world's 21 bodies/colliders, five physical props including the cylinder and ball, and climbing the actual 0.18-radian ramp. Extra assertions in the original tests verify 2 m/s crouch travel, foot-preserving stance changes, and previous-eye continuity. These additional acceptance checks passed against the existing implementation and did not require new production changes.

Initial yaw-zero measurements, retained as historical evidence of the limited first verification:

| Input | Observed metres |
| --- | ---: |
| Forward walk | 4.200085 |
| Diagonal walk | 4.199150 |
| Sprint | 6.800295 |
| Crouch | 2.000000 |

The initial `rtk npm run check` passed 29 tests. After the review correction described below, the final check passes strict TypeScript with zero diagnostics and all 31 tests (22 existing plus 9 physics tests), zero failures/skips. Checks use the installed `@dimforge/rapier3d-compat` 0.20.0 and actual WASM physics. No Rapier initialization deprecation warning appeared in these runs. RTK itself printed its existing no-hook notice.

## Review correction: heading-independent grounded movement

The expanded regression first failed against the committed implementation with exactly zero horizontal travel on yaw-zero rightward walking at tick 32, despite a nominal 0.07 m tick. It also exposed vertical jitter above 0.015 m. Rotated cases supplied by independent review had one-second direction differences above 0.06 m; the original tolerances were not weakened.

A direct Rapier trace at the stalled tick reported requested movement `(0.07, -0.016667, 0)`, floor normal `(0, 0.9999999404, 0)`, and returned movement `(0, 0.002, 0)`. The rounding leaves a tiny downward component after normal projection. Rapier's non-sliding-slope branch can then remove horizontal movement because the horizontal tangent direction degenerates for a normal parallel to up. This diagnosis is consistent with the engine's [slope decomposition and non-slip handling source](https://docs.rs/rapier3d/latest/src/rapier3d/control/character_controller.rs.html#624-711) and the observed real-WASM trace. Increasing normal nudge only changed which headings reproduced the defect.

The fix uses built-in ground snapping for adhesion when a bounded downward centre-foot ray confirms nearby support below the slide-angle threshold. Supported non-jumping movement has zero artificial downward velocity. Airborne movement, unsupported contacts, and steep contacts retain gravity; jump remains unchanged. The ray reaches only capsule half-segment plus radius, collision offset, and 0.05 m. It excludes the player and sensors. A support capsule cast was investigated but rejected after a near-tangent cast returned an invalid-looking sideways normal for the same flat box. The support ray avoids that numerical path. Every movement still passes through the controller's full capsule sweep against all obstacles, with exactly one live world step and no unchecked position correction.

The controller authorized this ground-adhesion adjustment as an implementation detail. It replaces the original universal grounded `-1 m/s` downward preload, keeps the public API unchanged, and restores Rapier's default normal nudge. Regression coverage verifies:

- 32 headings spaced by 11.25 degrees, plus explicit negative PI/8 and PI/4 yaw; eight signed axial/diagonal inputs per heading; 120 movement ticks after settling. Every walking tick must advance more than 0.06 m, remain grounded, and change height by less than 0.015 m. One-second travel must remain within 0.05 m of 4.2 m, with directional spread below 0.05 m.
- Descent of the authored ramp and five stairs, no upward bump above 0.03 m per tick, and landing on the floor.
- Leaving a two-metre ledge, becoming airborne, falling, and landing; a 60-degree slope retains gravity and passive sliding.
- All original wall, stair ascent, low-roof stance, jump, dynamic impulse, authored-body, detached-snapshot, invalid-input, and lifecycle checks.

Observed current metrics over 272 fresh worlds and 32,640 walking ticks: horizontal movement 0.06932778–0.07000065 m per tick; one-second travel 4.199164–4.199999 m; maximum vertical tick delta 0.007391 m; standing centre height range 0.858110–0.867381 m. These are measured tolerances, not a claim of perfectly jitter-free movement or proof for every possible scene. No new dependency or engine patch was required.

## Integration and review notes

Installed `dist/**/*.d.ts` APIs were checked for capsule construction, character movement, impulses, clearance queries, collider shape changes, collider-position propagation, and controller removal. No unsupported `updateSceneQueries` call, type suppression, DOM dependency, Three dependency, or public world handle was introduced.

Importing Rapier exposed its `Symbol.dispose` declaration requirement. The controller separately added `ESNext.Disposable` to the compiler libraries in prerequisite commit `28b64c1`; target, strict checking, and `skipLibCheck` were unchanged. That configuration fix is not part of this physics builder's file ownership.

Self-review covered authored dimensions and stable IDs, movement transforms, stance clearance/feet, immutable snapshot boundaries, fixed-step count, and lifecycle cleanup. Independent review belongs to the coordinator. The requested Codacy MCP tool is unavailable; no Codacy security scan was performed, and this gap is not represented as a pass. No weapons, ragdolls, browser renderer, dependency changes, remote publication, or original-checkout edits are included in this implementation.

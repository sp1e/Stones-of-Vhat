# Physical courtyard implementation results

Date: 2026-09-05. Scope: the real Rapier world, authored prototype content, capsule movement, and native integration tests. This module is not a playable browser build yet; rendering and browser controls remain the following integration stage. Geometry is a gameplay prototype, not historical reconstruction.

## Delivered contract

- `game/src/content/yardLayout.ts`: typed metre-scale layout with stable IDs, one floor, four walls, five stairs, high block, rotated ramp, low passage, and five dynamic wood/stone props. Twenty authored rigid bodies plus the player capsule.
- `game/src/physics/yard.ts`: singleton Rapier initialization; fixed/dynamic body creation with matching box, ball, and cylinder colliders; a kinematic first-person capsule; walking, sprinting, crouching, jump/gravity, collision sliding, autostep, slope thresholds, ground snap, dynamic impulses, interpolation snapshots, and idempotent disposal.
- `game/tests/yard.test.mjs`: seven real-physics acceptance tests with legitimate layout/spawn injection. No Rapier mocks or test-only simulation mutators.

The world explicitly performs one initialization `world.step()` after construction to publish fresh colliders to the query pipeline. Initial poses are recorded after this warmup. Every live `step(intent)` then performs exactly one step at `FIXED_DT` (1/60 second). Stance changes update collider shapes and propagate body positions without extra simulation steps. Standing clearance queries exclude the player body/collider and sensors.

Destroy removes the character controller before freeing its world and clears pose/body maps. Ten fresh worlds verify body/collider counts of 2/2 for the floor fixture, then 0/0 after repeated destruction. Snapshots and interpolation fields are detached; invalid non-finite movement axes/yaw reject before changing state. Duplicate authored IDs reject before allocating a world. `step` and `snapshot` fail clearly after destruction.

## Observed RED and GREEN

Before implementation, `rtk node --test game/tests/yard.test.mjs` reported six failures and zero passes. Each failure was the meaningful assertion `createYard must provide the real physics simulation`, with actual `undefined` versus expected `function`. The conditional import avoided a missing-module loader failure.

The first implementation passed five of six tests. The unchanged diagonal-distance assertion caught inconsistent large-floor contact behavior: straight travel was 4.129799 m while diagonal travel was 4.194910 m. Direct real-Rapier trajectory experiments reproduced the issue with the default 0.0001 m normal nudge. Setting `controller.setNormalNudgeFactor(0.002)` stabilized the near-tangent capsule/floor casts while retaining the specified 0.01 m collision offset, movement speeds, and test tolerances. This additional explicit controller setting is the only movement-tuning deviation from the initial contract.

After this correction, all six original tests passed. A seventh acceptance test additionally verified the authored world's 21 bodies/colliders, five physical props including the cylinder and ball, and climbing the actual 0.18-radian ramp. Extra assertions in the original tests verify 2 m/s crouch travel, foot-preserving stance changes, and previous-eye continuity. These additional acceptance checks passed against the existing implementation and did not require new production changes.

Measured one-second travel after settling on the isolated floor:

| Input | Observed metres |
| --- | ---: |
| Forward walk | 4.200085 |
| Diagonal walk | 4.199150 |
| Sprint | 6.800295 |
| Crouch | 2.000000 |

Final `rtk npm run check` from `game/` passed strict TypeScript with zero diagnostics and all 29 tests (22 existing plus 7 physics tests), zero failures/skips. Checks use the installed `@dimforge/rapier3d-compat` 0.20.0 and actual WASM physics. No Rapier initialization deprecation warning appeared in these runs. RTK itself printed its existing no-hook notice.

## Integration and review notes

Installed `dist/**/*.d.ts` APIs were checked for capsule construction, character movement, impulses, clearance queries, collider shape changes, collider-position propagation, and controller removal. No unsupported `updateSceneQueries` call, type suppression, DOM dependency, Three dependency, or public world handle was introduced.

Importing Rapier exposed its `Symbol.dispose` declaration requirement. The controller separately added `ESNext.Disposable` to the compiler libraries in prerequisite commit `28b64c1`; target, strict checking, and `skipLibCheck` were unchanged. That configuration fix is not part of this physics builder's file ownership.

Self-review covered authored dimensions and stable IDs, movement transforms, stance clearance/feet, immutable snapshot boundaries, fixed-step count, and lifecycle cleanup. Independent review belongs to the coordinator. The requested Codacy MCP tool is unavailable; no Codacy security scan was performed, and this gap is not represented as a pass. No weapons, ragdolls, browser renderer, dependency changes, remote publication, or original-checkout edits are included in this implementation.

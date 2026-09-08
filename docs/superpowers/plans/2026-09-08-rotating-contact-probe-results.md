# B02a rotating-contact and missing-history diagnostics

Date: 2026-09-08. Installed Rapier compat **0.20.0**, existing arm baseline **063c1e7**. These are reproducible experimental diagnostics, **not a production contact API or B02 acceptance**. The read-only worker prepared the controls; the coordinator read both complete sources, preserved them under `game/scripts/`, and independently reproduced all assertions before trace implementation.

## Decision: record actual native boundaries before arm contact integration

The accepted arm runs eight native steps per authoritative 1/60 interval. Its existing endpoint publisher cannot recover the intermediate collision-deflected trajectory. Temporarily observing actual `World.step()` calls, without changing bodies, impulses or solver settings, quantifies the difference from outer body-origin linear interpolation plus shortest quaternion SLERP composed with the real nonidentity collider-local pose:

| Handoff phase, no added impulse | Physical outer intervals / native steps | Worst collider-center deviation | Worst corner deviation |
| --- | --- | --- | --- |
| 30 | 60 /480 | 16.706409 mm | 25.583832 mm |
| 264 | 60 /480 | 20.589544 mm | 34.368503 mm |

Both worst centers occur in physical interval 33, native boundary 5, upper segment. Both worst corners occur in interval 33, boundary 4, forearm. Native float32 quaternions are normalized before comparison. The observer is restored in `finally`, each fixture is destroyed, and the script asserts restoration and deviation above 1 mm. This is a **negative control for endpoint-only reconstruction**, not a failure of the accepted arm's joint-stability gates. No change to the accepted eight-step integrator is justified by this result.

The next bounded implementation is therefore atomic, detached **measured-native-boundary history** and a paused inspector. These samples still do not reveal motion inside a native step or internal CCD sub-solves. A later query must explicitly define interpolation and uncertainty between consecutive samples. Recording them alone does not certify 1 mm continuous-path accuracy.

## Installed API and experimental query

Installed declarations under `game/node_modules/@dimforge/rapier3d-compat/dist/geometry/` expose `Shape.castShape` and `Shape.contactShape`, but no nonlinear/angular shape-cast method. The frozen script also asserts that `Shape.prototype.castNonlinear` is absent.

Unlike `castShape`'s **local** witnesses and normals, `contactShape` returns **world-space** points and normals. A rotated-frame control places the first box at (10,2,3) with +90-degree Z rotation. The observed `point1` is approximately (10.199999809,2.099999905,3.200000048); its local Y is -0.2. Its world normal points +X, while the cast's corresponding local normal points -Y. Finite values, unit length, normal opposition and witness separation are checked explicitly. Do not double-transform world-space contact records.

The experimental conservative-advancement query uses native distance at declared poses with an **empirical 50 micrometre guard**, at most **128 native calls**, and explicit `inconclusive-*` results for exhausted, grazing, malformed or insufficiently bracketed cases. This is not a formal native numerical-error guarantee. A fixed separating-plane closing-speed bound includes both translations and constant-axis rotational radius bounds; it can certify the two authored Z-clearance misses without expanding them into hits. Initial distance within the uncertainty band is labelled overlap-or-uncertain, never trusted as an anatomical surface cut.

The authored matrix contains 36 trajectories: horizontal/vertical thin boxes, projectile speeds 8/16/40 m/s, target speeds -3/+3 m/s, and Z angular rates 0/180/360 degrees/s. Target dimensions are the arm cuboid dimensions, with separate nonzero collider-local translation and rotation. These are **synthetic Z-axis trajectories**, not the live articulated arm, arbitrary 3D rotation or decided spell balance. All paths last 1/60 s. Query poses are repeated with +31 m translation in all axes; native distances at reference contact are additionally sampled at -31 m.

An independent double-precision oriented-rectangle SAT control scans 65,536 intervals and bisects detected crossings. Its largest relative-motion grid bound is **0.011418153 mm**. That bound quantifies sampling uncertainty; it does not prove the scan cannot miss arbitrarily short grazes. The explicit close-miss fixtures instead have constant analytic Z clearance.

| Frozen diagnostic measurement | Reproduced result |
| --- | --- |
| Matrix at original and +31 m origins | 33 hits /3 separating-plane misses at each origin |
| Largest native-query call count in matrix | 22 |
| Largest TOI-derived projectile-position error against control | 0.128440296 mm |
| Largest relative-motion bracket width | 0.400000000 mm |
| Control contact outside returned bracket | 0 cases, both origins |
| Largest native distance magnitude at reference contact, shifts 0/+31/-31 | 0.001707813 mm |
| 10 mm wall, analytical contact 0.008375 s | Query upper time 0.008377912735 s; position error 0.116509382 mm |

The first scalar-distance-only variant exhausted all **128 calls** for both a 0.2 mm and a 1 mm sustained near miss. Those failures are preserved in the same executable script. With the separating-plane bound, these matched cases return genuine misses after **20** and **14** calls respectively. Do not call the old budget exhaustion a collision or remove this control.

## Common-time blocking control

The same projectile is independently queried against four synthetic blockers. Reference first contact times are:

1. Moving shield: **0.005114797317 s**.
2. Fixed 10 mm wall: **0.008375000000 s**.
3. Moving/rotating arm-shaped box: **0.011125609610 s**.
4. Farther box: **0.015000000000 s**.

The native-query brackets all contain their control times and are mutually disjoint in that order, despite registration being wall/behind/arm/shield. This demonstrates the candidate method on one frozen scene. Deterministic overlapping-time ties, stable cast/contact identities, consumer revalidation, initial-overlap policy, general shape support and actual fixture integration still require production design and tests.

## Reproduction

From the implementation worktree's `game/` directory:

```powershell
rtk proxy node scripts/probe-moving-contact.mjs
rtk proxy node scripts/probe-arm-native-chord.mjs
```

Both commands print their complete measured JSON and fail if the frozen regression assertions fail. They are separate diagnostics, not additional cases in `npm test`, not Vite entries and not shipped gameplay. The contact diagnostic uses no physics world. The arm diagnostic observes and destroys transient real worlds. Neither changes dependencies, security settings, desktop artifacts or the normal courtyard.

## Still open

Complete B02a query implementation and visual Slicer fixture; bounded general rotation and interpolation over native sample pairs; strict coordinate/shape-domain validation and calibrated error budget; initial-overlap/muzzle behavior; deterministic earliest ambiguous contact; stable identities and duplicate delivery; pause/reset cast lifecycle. Full B01 humanoid, B02 damage/zone ordering, B03 prepared severing, B07 packaged assets and B04 engine decision remain open. No ranged-combat, gore-engine, hardware FPS or chapter acceptance follows from these experiments.

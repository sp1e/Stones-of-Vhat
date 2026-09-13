# General 3D and cross-span contact diagnostics

Date: 2026-09-13. Installed Rapier compat0.20.0, existing Three.js/Node24 toolchain. This is a reproducible diagnostic, **not a production query, first-playable ranged spell, general CCD certificate or anatomical cut acceptance**.

Independent Astra/high numerical worker authored the cases in memory, then preserved the exact assertion-gated script at `game/scripts/probe-contact-3d.mjs`. The coordinator read that complete file and independently ran `rtk proxy node scripts/probe-contact-3d.mjs` from game/: exit0, all regression assertions PASS, approximately4.97s. No live physics world, native solver setting, dependency, owner state or runtime production file was changed by these probes.

## General rotations and actual large geometry

The full36-case matrix varies thin-box orientation, projectile8/16/40m/s, target±3m/s and target angular rates0/π/2π rad/s. Initial body rotations, world angular axes and collider-local rotations/offsets are independently nonidentity and noncommuting. The exact authored values live in the script. Pose uses constant world angular rotation multiplied on the left of the initial body rotation, followed by the local collider transform.

The original diagnostic allows projectile omega0.5rad/s; a second matrix locks projectile omega0 to match the approved Slicer direction. Each case runs at origins0/+31/-31m with conservative whole-geometry extent assertions. All variants retain the empirical50µm distance guard,128native-call ceiling and1mm bracket gate.

| Reproduced matrix | Outcomes | Max calls | Max projectile-position bound error | Max bracket travel | Reference outside bracket |
| --- | --- | ---: | ---: | ---: | ---: |
| General primitive, projectile omega0.5 | 99hits/9plane misses | 23 | 0.146355mm | 0.400000mm | 0 |
| Cast-locked projectile omega0 | 99hits/9plane misses | 23 | 0.149581mm | 0.400000mm | 0 |
| Actual large arm wall/floor, origins0/±15m | 6hits | 7 | 0.100971mm | 0.200000mm | 0 |

The 0.15mm frozen measured-error assertion passed unchanged, including the locked-projectile matrix. Maximum native distance magnitude at reference contact was0.001649mm for the general matrix and0.001614mm for locked projectile. Maximum normal-length error was3.6303e-7, normal-opposition error3.0139e-7 and signed world-witness residual0.001992mm. These are measurements of these authored fixtures, not native error guarantees for every valid shape.

The independent double-precision geometry control tests all15OBB separating axes, scans65536time subdivisions and bisects detected crossings. Its maximum grid travel bound is0.011442mm. It shares the authored pose evaluator, so is independent of Rapier geometry, not an independent proof of pose interpolation. The scan can miss arbitrarily brief grazes; a null reference alone is not a no-hit certificate. Matched native separating-plane cases and analytical ball controls supply distinct evidence.

Large wall size[.2,20,10], center(.65,5,0), blade at(0,1,0) moving40m/s in+X: analytical contact0.012250s. Large floor size[10,.2,10], center(0,-.1,0), blade at(0,.5,0) moving40m/s in-Y: analytical contact0.012375s. Shifts±15m satisfy the conservative32m sphere extent. Shifts+31m are explicitly rejected for these large targets. The initial diagnostic wall-placement variant is also retained, not erased.

## Earlier contact lost by resetting uncertainty — retained failure control

Two balls of radius0.01m: projectile stationary at origin; target follows(-.005,y,0)→(.005,y,0)→(0,0,0) over two equal1/120s spans. The first span is shallow penetration, tangency or20µm clearance. The second span penetrates deeply.

| y | First-span analytical contact | Correct preserved uncertainty | Incorrect reset at knot |
| --- | --- | --- | --- |
| .01998 | .003421497036s | inconclusive-width,7.901535mm,63calls | false first-hit time .008633011235s |
| .02000 | tangent .004166666667s | inconclusive-width,7.734347mm,59calls | false first-hit time .008640494232s |
| .02002 | no hit;20µm clearance | inconclusive-width,7.556496mm,55calls | later apparent hit .008647962464s |

The first two rows assert that the real earlier contact precedes the incorrectly reset bracket. The near-miss row remains appropriately unresolved under the50µm native guard despite the independent analytic geometry. Resetting makes the later bracket appear only0.2mmwide, hiding the prior uncertainty.

All six larger-ball variants (radius0.1m, half-travel0.01m, each clearance with preserved/reset latch) exhaust the original128calls. These inconclusive-budget results are preserved. They are neither misses nor a reason to silently increase the budget or loosen contact gates.

## Locked consequences for next implementation

1. Carry the first possible-contact uncertainty through every native span.
2. Integrate point-speed travel across spans when bounding bracket width; do not multiply the final span's speed by the whole uncertain duration.
3. Conservative advancement and fixed-world separating-plane pruning end at the current span boundary. Use `|normal × worldOmega| * radius` for each rotating shape.
4. Interpret `contactShape` witnesses/normals as world-space; validate finite/unit/opposition/signed-separation relationships before exposing a cut frame.
5. Preserve explicit inconclusive results. Global ordering must not allow an earlier inconclusive blocker to be bypassed by a later definite hit.

The current detached contact-motion compiler is being implemented separately. Query adaptation, actual-arm integration, candidate ordering, identity/revalidation and visible cast lifecycle remain open. No Windows executable or website deployment follows from this diagnostic.

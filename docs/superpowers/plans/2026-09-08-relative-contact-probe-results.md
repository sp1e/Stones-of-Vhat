# Relative linear contact diagnostic

Date: 2026-09-08. Installed Rapier compat **0.20.0**. This is a development-side query diagnostic prompted by B02 in the completed research; it does not implement a projectile, moving anatomical rig or severing system.

## Measured result

A relative shape-pair cast detects the crossing target that both endpoint-frozen controls miss. The read-only physics worker ran four bounded query cases with analytical/control assertions; the coordinator independently reproduced the crossing, frozen-start, frozen-end and near-miss results. No game files, dependencies, builds, desktop applications or security settings changed for the queries. No physics world was required.

Crossing fixture: two balls of radius 0.1 m. Projectile starts `(-1,0,0)` with velocity `(2,0,0)` m/s. Target starts `(0,0,-1)` with velocity `(0,0,2)` m/s. Query interval 1 s; `targetDistance=0`, `stopAtPenetration=true`.

Relative displacement `r=(-1,0,1)` and velocity `u=(2,0,-2)` give `|r+u*t|^2=0.2^2`. First contact is analytically `(1-0.2/sqrt(2))/2 = 0.4292893218813453` s.

| Case / control | Observed result |
| --- | --- |
| Relative crossing | TOI 0.4292893409729004 s; analytical error about 1.91e-8 s. |
| Target frozen at start | No hit. |
| Target frozen at end `(0,0,1)` | No hit. |
| Matched target offset Y=0.201 m | No hit; minimum center distance exceeds combined radius 0.2 m. |
| Same path in 0.5 s, both velocities doubled | TOI 0.2146446704864502 s. |
| Same half-second path expressed as full displacement with maxToi=1 | Fraction 0.4292893409729004; multiplied by 0.5 s exactly matches the time-form result. |
| Initially overlapping balls moving apart, stop flag true | Immediate TOI 0. |
| Same exiting overlap, stop flag false | No hit. |

## Witness and overlap caveats

For identity frames, both local witnesses transformed by their own center at TOI gave the same world contact point `(-0.0707106590, 0, -0.0707106590)`. With different constant ball frames (+90 degrees around Z and +90 around Y), the worker measured world witness separation 1.05e-8 m and transformed normal-opposition error 1.69e-7.

The initial-overlap result did not provide an ordinary unit surface normal: the measured normal lengths were 0.75 and the witnesses were inside the spheres. B02 must explicitly handle start overlap and validate/normalize usable contact data. It must not assume every returned overlap geometry is a unit normal or regular surface contact. Constant ball orientation in these tests validates coordinate transforms; it is not a rotating-arm test.

## Compact reproduction

Run from `game/` using `rtk proxy node --input-type=module -e` with this code as its argument:

```js
import R from '@dimforge/rapier3d-compat';
await R.init();
const q = { x: 0, y: 0, z: 0, w: 1 };
const zero = { x: 0, y: 0, z: 0 };
const ball1 = new R.Ball(0.1), ball2 = new R.Ball(0.1);
const p1 = { x: -1, y: 0, z: 0 }, v1 = { x: 2, y: 0, z: 0 };
const p2 = { x: 0, y: 0, z: -1 }, v2 = { x: 0, y: 0, z: 2 };
const cast = (target, velocity) => ball1.castShape(p1, q, v1, ball2, target, q, velocity, 0, 1, true);
console.log({
  version: R.version(), analytical: (1 - 0.2 / Math.SQRT2) / 2,
  hit: cast(p2, v2), frozenStart: cast(p2, zero),
  frozenEnd: cast({ x: 0, y: 0, z: 1 }, zero),
  nearMiss: cast({ ...p2, y: 0.201 }, v2),
});
```

The compact reproduction covers the coordinator's subset; time-unit, rotated-frame and overlap observations above are worker measurements from separate transient cases, not output of this one snippet.

## Consequences for B02

Retain both shapes' motion over an interval, name TOI units explicitly, and transform witnesses using each shape's own contact-time pose. Use the analytic crossing as a positive control that a frozen-scene implementation must fail, alongside a matched near miss.

Still open: rotation with non-spherical shapes, actual animation samples, earliest blocker across the world, thin-wall/muzzle semantics, physical substep ordering, identity/revalidation after anatomy changes and idempotent damage. No full C01-C05 or chapter acceptance ID is closed by this linear-query experiment. B01's stable body/motion/identity contract still precedes production B02 integration.

Sources: [research contact dossier](../../research/deep-research/2026-09-08/technical-dossier.md), installed `dist/geometry/shape.d.ts` / `toi.d.ts`, worker experiments and coordinator reproduction. Original research reports are preserved unchanged.

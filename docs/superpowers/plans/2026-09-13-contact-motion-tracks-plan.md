# Contact motion tracks implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans. Execute automatically within the approved scope; Simon explicitly removed routine approval checkpoints on 2026-09-13. Keep automated tests and independent spec/quality review.

**Goal:** Make the completed measured-native arm history consumable as a bounded, detached, time-addressable collider-motion model before implementing the Slicer contact query.

**Architecture:** Compile one completed 1/60-second interval into private immutable collider tracks. Interpolate body origins and shortest quaternion arcs between measured native boundaries, then compose the constant collider-local transform. Return detached time/geometry/velocity records without accessing, restoring or stepping a Rapier world.

**Tech Stack:** Existing TypeScript, Three.js quaternion math, Rapier-owned detached motion records, native Node tests. No dependencies, engine changes, UI or physics solver modifications.

## Scope and inputs

This is the first executable portion of the existing B02a continuation brief, not completion of B02a. Read `2026-09-08-moving-contact-next-slice.md` and the frozen rotating-contact diagnostics. Native-history Tasks 1–5 are accepted at `0d4d1a2`; public baseline is `661636e`. Parent baseline `npm run check`: 116/116, zero failures, 83.098 s on this run. Frozen 36-case rotating diagnostic independently reproduced its assertions before this plan.

Do not enter Claude's `environment-blockout` worktree as a writer. Only the coordinator changes plan/status files. Only the assigned implementer changes the two files below. The user-owned research `work/` cache is untouched.

## Locked API and numerical model

Create `game/src/physics/contactMotion.ts`, exporting:

```ts
export const CONTACT_MOTION_MODEL = 'native-boundary-origin-lerp-shortest-slerp' as const;
export const CONTACT_MOTION_LIMITS = Object.freeze({
  extentM: 32, maxOriginSpeedMps: 128, maxRecordedOmegaRadps: 128,
  maxSpanAngleRad: Math.PI / 4, maxBodies: 64, maxColliders: 128,
});
export type ContactShape = { kind: 'box'; size: readonly [number, number, number] }
  | { kind: 'ball'; radius: number };
export type ContactCollider = {
  ref: ColliderRef; shape: ContactShape; localPose: RigidTransform;
  radiusFromBodyOriginM: number;
};
export type ContactMotionFrame = {
  offsetS: number; spanIndex: number; spanStartS: number; spanEndS: number;
  bodyOriginWorld: RigidTransform; colliderWorld: RigidTransform;
  originVelocityWorldMps: Vec3; angularVelocityWorldRadps: Vec3;
  pointSpeedBoundMps: number;
};
export function createContactMotion(interval: MotionInterval): {
  readonly model: typeof CONTACT_MOTION_MODEL;
  readonly worldEpoch: string; readonly fromTick: number;
  readonly toTick: number; readonly dtS: number;
  colliders(): ContactCollider[];
  sample(ref: ColliderRef, offsetS: number): ContactMotionFrame;
};
```

Use existing `ColliderRef`, `MotionInterval`, `RigidTransform` and `Vec3` types. The returned facade is frozen. Internally own a detached copy; `colliders()` and `sample()` return fresh detached data. No exposed native handles, meshes, buffers or mutable internal arrays. Invalid/unsupported requests throw descriptive errors, never return an empty collider set or a fake miss. The eventual query translates unsupported preparation into an explicit inconclusive result.

Validation before publishing the facade:

- Nonempty epoch and unique nonempty body/collider identities, exact epoch/body membership at all boundaries. Match by IDs, not registration order; deterministic collider enumeration sorts bodyId then colliderId using code-unit comparison. At most 64 bodies and 128 total colliders, checked before constructing tracks.
- `kind === completed`, safe nonnegative adjacent tick integers, `dtS === FIXED_DT`. Required trace kind `measured-native-boundaries`, 2–17 samples, exact initial offset 0/final offset FIXED_DT and finite strictly increasing offsets. No endpoint-only fallback. Empty body sets reject.
- Every sample has exactly the interval's bodies and collider identities; no duplicates/missing/extra. All endpoint numeric fields finite; mass nonnegative; runtime authority/role/shape tags valid, sleeping boolean. Rigid scales identity and quaternions valid via existing `rigid` normalization. Do not treat finite but huge nonrepresentable positions/velocities as acceptable.
- Sample 0 body/local poses, COM local/world, collider role/shape must match `from` physically; only boundary authority, velocity, mass/sleep changes are admissible under an explicitly recorded authority discontinuity. Without that flag compare all fields. Last sample must match `to` completely. Use exact nonrotation field comparison, normalized sign-equivalent quaternion chord tolerance 2e-7 only for rotations. Compare semantic IDs and fields rather than object key/array order. Reject unknown or duplicate discontinuity tags.
- A shape discontinuity rejects the interval. Shape, role, collider-local pose, COM local, mass and authority must be constant across every measured sample (COM world, velocities and sleeping may change); authority flag is allowed only for an actual from-to boundary change at sample 0. Mid-span authority/geometry changes reject. Fixed bodies must remain stationary across samples; do not interpolate a fixed-body teleport.
- All blocker colliders support boxes/balls only. Validate positive representable dimensions; minimum full box dimension / ball diameter 0.001 m. Navigation colliders are deliberately not spell blockers; still validate identity/finite geometry and consistency but do not silently drop an unsupported blocker. Capsule/cylinder blockers explicitly reject in this increment.
- An interval with no blocker colliders explicitly rejects; it does not publish an empty query set. Every positive dimension must remain positive and finite after float32 conversion.
- For every blocker, radius bound = length(localPose.position) + half-diagonal(box) or radius(ball). For every body-origin endpoint, each `abs(position axis) + radius <= 32`. This conservative sphere-based extent also bounds rotation between knots. Bound local pose and all stored velocities before native use. The known endpoint COM speed and derived origin speed must not exceed 128 m/s; recorded endpoint omega norm <=128 rad/s. An all-zero velocity record is NOT evidence that motion between samples was stationary.
- Each span's shortest rotation angle <=pi/4 and derived origin speed <=128 m/s, without clamping. q and -q are equivalent. These are query-domain limits, not alterations to animation or world integration. Endpoint gates cannot detect unobserved complete turns; the model string declares interpolation only and must never be described as continuous solver-path recovery or certified CCD.
- Every derived world omega component and point-speed bound must be finite at compilation, including for very short strictly increasing sample spans. A tiny-span overflow regression is mandatory; never defer this failure to the native query.

Sampling:

```ts
// At internal knots select the right span [a,b); at dt select the final span.
// alpha=(offsetS-a.offsetS)/(b.offsetS-a.offsetS)
// body position = linear interpolation of body-origin positions.
// body rotation = shortest normalized quaternion SLERP.
// colliderWorld = composeRigid(bodyOriginWorld, constantColliderLocalPose).
// origin velocity = (b.origin-a.origin)/(b.offsetS-a.offsetS).
// world angular axis comes from qB * inverse(qA), not inverse(qA) * qB.
// pointSpeedBound = length(originVelocity) + length(omega)*radiusFromBodyOriginM.
```

Do not interpolate collider centers directly or substitute COM for body origin. Exact 0/dt/native knots retain the corresponding normalized measured body pose. Reject unknown/stale ref, negative/out-of-range/nonfinite time. No time clamping, world stepping, simulated state changes, hidden sample subdivision or shader geometry.

## Task 1 — motion compiler and sampler

**Files:** create `game/src/physics/contactMotion.ts` and `game/tests/contactMotion.test.mjs` only.

- [x] Write a missing-feature test using the existing dynamic-import pattern, then observe its assertion failure before creating production code:

```js
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { createArmFixture } from '../src/physics/armFixture.ts';
const url = new URL('../src/physics/contactMotion.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};
test('contact motion compiles measured arm tracks without changing the owner', async () => {
  assert.equal(typeof api.createContactMotion, 'function');
  const arm = await createArmFixture();
  try {
    arm.setActive(true); arm.step();
    const before = arm.snapshot();
    arm.handoff({ worldEpoch: before.worldEpoch, atTick: before.tick, impulse: null });
    arm.step(); arm.setActive(false);
    const snapshot = arm.snapshot(), saved = structuredClone(snapshot);
    const motion = api.createContactMotion(snapshot.interval);
    assert.equal(motion.model, 'native-boundary-origin-lerp-shortest-slerp');
    assert.equal(motion.colliders().length, 4);
    for (const collider of motion.colliders()) {
      const frame = motion.sample(collider.ref, snapshot.interval.dtS);
      assert.equal(frame.spanIndex, 7);
      assert.equal(frame.offsetS, snapshot.interval.dtS);
    }
    assert.deepEqual(arm.snapshot(), saved);
  } finally { arm.destroy(); }
});
```

Run `rtk proxy node --test tests/contactMotion.test.mjs` from game/. Expected RED: createContactMotion is undefined, not a missing-import syntax error.

- [x] Implement the smallest compiler/sampler preserving the locked API and first test, run GREEN.
- [x] Add focused RED→GREEN controls in small groups for each validation/sampling behavior above. Use real detached arm intervals plus small synthetic intervals made from their records, not mocked Rapier results. Explicit controls must include:
  - Real physical 8-span arm; animation 1-span arm; handoff sample0 authority. Build after owner.destroy and sample without owner access.
  - Independent 3D noncommuting rotations with nonzero collider-local offset/rotation and different COM; compare against separate Three.js vector/quaternion reference math. Midpoint collider path must differ from naive collider-center LERP.
  - Actual measured knots must equal composed measured poses at 0, all internal knots and dt; internal knot picks right span. q/-q representation controls.
  - Reordered body/collider records succeed; changed identity/epoch, duplicate/missing/extra identities fail. Mutation of original interval and returned colliders/frame leaves subsequent samples unchanged. Frozen input succeeds.
  - Every invalid boundary/timing/sample-count, geometry/authority/role change, invalid number/scale/quaternion, extent, minimum shape size, derived-speed and recorded-omega limit. Test exact allowed limits and just-over rejection where representable; no stale candidate may survive rejected construction.
  - Fixed-body movement rejects. Constant unsupported blocker rejects, navigation does not become a blocker. Ref/time errors reject.
- [x] Run focused tests and strict typecheck, self-review, report actual RED/GREEN evidence. Do not stage or commit: coordinator owns all Git writes.

## Task 2 — independent acceptance and continuation

- [x] Independent SPEC review against every locked requirement; implementer fixes relevant findings with retained regression tests.
- [x] Ordered fresh QUALITY review of actual source/tests, math/identity/frame boundaries and unnecessary scope; resolve important findings.
- [ ] Parent focused tests, `rtk proxy npm run check`, `rtk proxy npm run build`, whitespace check, exact-path commit. No browser/visual claim for this nonvisual increment.
- [ ] Coordinator records measured evidence and proceeds to pairwise native query planning/implementation automatically. No routine user gate.

## Next dependent query design (not accepted as implemented by this plan)

Implementation acceptance evidence: [contact-motion results](2026-09-13-contact-motion-results.md). Final source has21/21 focused,137/137 strict/native and production build PASS, with ordered SPEC PASS and QUALITY APPROVE. Both initial SPEC and subsequent QUALITY defects are retained as regression tests; importantly the small-angle sampler uses true constant-rate shortest interpolation rather than installed Three's NLERP shortcut. Coordinator commit/status follows without a routine user gate.

Planning review: independent Astra/high numerical and SPEC review passed after the explicit no-blocker and finite-derived-rate clauses above were added. This does not replace the later implementation review.

Query one declared projectile against track spans using installed Rapier `contactShape`, not a second world. Preserve the 50 micrometre empirical numerical guard, 1 mm contact bracket gate, explicit budgets/inconclusive states, world-space contact witnesses, and independent analytic/OBB controls from diagnostics. Keep an uncertainty latch across every span after a possible graze; native distance advancing and separating-plane pruning may only apply to the current span. A hit is definitely first only if its upper time precedes every other candidate's earliest possible time; overlapping candidate brackets form an explicit ambiguous blocker set, never a damage target chosen by array order. Stable IDs order presentation only. Plan and review that dependent algorithm before integration; this track compiler alone proves none of those query results.

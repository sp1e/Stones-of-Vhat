# Native Motion Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one optional detached record of the arm's measured native integration boundaries and inspect those recorded poses while the development lab is paused.

**Architecture:** The body-motion registry owns an unpublished bounded trace draft and publishes it atomically with its existing completed interval. The arm records the existing one animation step or eight physics steps without changing integration. The development view derives historical frames from detached endpoints and bindings, never writes them back to physics, and clears selection on live/resume/reset/context loss.

**Tech Stack:** TypeScript, Rapier 0.20.0, Three.js 0.185.1, Node test runner, Playwright, Vite.

---

## Scope and fixed contracts

This is the B02a prerequisite, not the B02a moving-shape query implementation. No overlap/sweep query, interpolated trajectory, collision certificate, CCD subsolve capture, physical restore, gameplay integration, desktop packaging, dependency update, deployment, or publication is included.

Execute in `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`, branch `codex/vadstena-runtime-foundation`, source baseline `063c1e7`, integration baseline `1461b4e` (parent diagnostic-only commit). Preserve the untracked `docs/research/deep-research/2026-09-08/work/` directory and parent's diagnostic scripts. Every shell command begins with `rtk`; use `apply_patch` for edits. Commands below run from `game/` unless explicitly stated otherwise. No staging or committing during this bounded writer assignment; parent owns final integration and review.

`MotionInterval.nativeTrace` is optional and absent on initial/untraced publications. A trace has `kind: 'measured-native-boundaries'` and samples `{offsetS,bodies:[{ref,endpoint}]}`. Every endpoint uses the existing `BodyEndpoint`, including collider references, shape descriptions and local poses. Sample zero records the current boundary after an optional handoff; body and local collider poses must match the prior publication, but velocity, mass, sleep, shape and authority may differ. Samples are not a continuous solver path. Future interpolation must state its own assumptions.

`beginNativeTrace()` rejects nesting and preflights every live registered reference before capturing. `captureNativeStep(offsetS)` requires an active trace, finite strictly increasing offsets in `(0,FIXED_DT]`, at most sixteen native steps, and canonicalizes values within `1e-12` of `FIXED_DT`. Collider-local pose changes are rejected both at begin and between adjacent samples. Failed begin/capture/complete calls preserve the previous publication and the exact previous draft without appending a partial sample. Completion requires the final offset equal to `FIXED_DT` and the current full endpoints equal to the last recorded endpoints. A recoverable capture failure may be corrected and retried; owner native-write failure destroys the arm as before. Destroy clears both draft and retained interval data. Untraced completion continues to work and drops an earlier trace.

The renderer shows sampled body, bone and collider coordinate frames and sampled COM/anchor positions. It retains one current interval, no playback history. The range selects indices `0..N` only while paused. A visible viewport caption and inspector text name historical inspection and recorded time. Main metrics remain labelled as the live boundary. Resume, live button, reset, handoff and context loss clear historical selection. Inspection changes no tick, authority, pending handoff, native body or solver settings.

## File map

Task 1 review correction: quaternion rotation comparisons normalize robustly and accept either sign at a maximum quaternion chord distance of `2e-7` (about `4e-7` radians). This comparison-only accommodation preserves the actual endpoint representation and exact comparison of every non-rotation field. The original JSON equality failed real Rapier sign-flip controls separately at begin and final completion. An initial `1e-7` chord bound passed identity/X0.7/Y1.3 controls but failed the native collider-local Z2.1 control: measured normalized chord `1.33062449532271e-7`, angular drift `2.661248990645422e-7` radians. Parent approved `2e-7` based on that evidence. A real change of `.01` radians still rejects; setter perturbations beyond the declared bound reject. This is representation safety and changes neither arm stability thresholds nor the proposed 1 mm contact-query requirement.

Regression evidence: isolated begin and final sign-flip cases observed RED before the comparison change; `.01`-radian negative control passed. After the narrow correction, the body/collider matrix, exact non-rotation control and existing suite passed 15/15 (478.6562 ms). The exactness control changes fields by `1e-10` and confirms final publication still rejects translation, COM, velocity and mass changes, plus a sleep toggle. Current Task 1 code/test snippets below include the review correction.

- Create `game/src/physics/nativeMotionTrace.ts`: bounded draft lifecycle and pose continuity checks using existing endpoint/ref types.
- Modify `game/src/physics/bodyMotion.ts`: optional trace types, live full capture and atomic trace publication.
- Modify `game/src/physics/armFixture.ts`: capture existing native boundaries; detach bindings and joint-local anchors in snapshots.
- Create `game/src/lab/armLabTrace.ts`: pure sampled render-state derivation.
- Modify `game/src/lab/armLabView.ts`: sampled visual transforms and reusable coordinate axes, resource disposal.
- Modify `game/src/lab/armLab.ts`, `game/src/lab/armLab.css`, `game/arm-lab.html`: optional paused inspector and lifecycle reset.
- Create `game/tests/nativeMotionTrace.test.mjs`, `game/tests/armNativeTrace.test.mjs`, `game/tests/armLabTrace.test.mjs`: real Rapier contract and derived-frame tests.
- Modify `game/browser/armLab.spec.mjs`: inspector interaction, real context recovery and screenshots.
- Parent owns results/status documentation and final index updates.

### Task 1: Trace contract, atomicity and bounded storage

**Files:** create `game/tests/nativeMotionTrace.test.mjs`, create `game/src/physics/nativeMotionTrace.ts`, modify `game/src/physics/bodyMotion.ts`.

- [x] **Step 1: Add the failing real-Rapier tests.** Create `game/tests/nativeMotionTrace.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import R from '@dimforge/rapier3d-compat';
import { createBodyMotion } from '../src/physics/bodyMotion.ts';
import { rigid } from '../src/physics/poseBinding.ts';
import { zero, dt, q } from './bodyMotionHelpers.mjs';
await R.init();

function fixture(rotation = { x: 0, y: 0, z: 0, w: 1 }) {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = dt / 8;
  const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).setLinvel(2, 0, 0).setRotation(rotation));
  const collider = world.createCollider(R.ColliderDesc.ball(.1).setMass(1).setRotation(rotation), body);
  const second = world.createRigidBody(R.RigidBodyDesc.fixed());
  const otherCollider = world.createCollider(R.ColliderDesc.ball(.1), second);
  world.step();
  let shape = { kind: 'ball', radius: .1 };
  const motion = createBodyMotion(world, [
    { bodyId: 'body', body, colliders: [{ colliderId: 'shape', collider, role: 'blocker', shape: () => shape }] },
    { bodyId: 'second', body: second, colliders: [{ colliderId: 'shape', collider: otherCollider, role: 'blocker', shape: () => shape }] },
  ]);
  return { world, body, collider, second, otherCollider, motion,
    setShape: value => { collider.setShape(new R.Ball(value.radius)); otherCollider.setShape(new R.Ball(value.radius)); shape = value; },
    destroy() { motion.destroy(); world.free(); } };
}

test('native trace publishes actual curved native boundaries atomically with detached full endpoints', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    const initial = f.motion.read();
    assert.equal(initial.nativeTrace, undefined);
    f.motion.beginNativeTrace();
    const observed = [{ ...f.body.translation() }];
    for (let i = 1; i <= 8; i++) {
      f.world.step(); observed.push({ ...f.body.translation() });
      f.motion.captureNativeStep(i * dt / 8);
      assert.deepEqual(f.motion.read(), initial);
    }
    f.motion.completeStep();
    const result = f.motion.read(), trace = result.nativeTrace;
    assert.equal(trace.kind, 'measured-native-boundaries');
    assert.equal(trace.samples.length, 9);
    assert.equal(result.toTick, 1);
    for (let i = 0; i <= 8; i++) {
      assert.equal(trace.samples[i].offsetS, i * dt / 8);
      assert.equal(trace.samples[i].bodies.length, 2);
      assert.deepEqual(trace.samples[i].bodies[0].endpoint.bodyOriginWorld.position, observed[i]);
      f.motion.assertRef(trace.samples[i].bodies[0].ref);
      f.motion.assertRef(trace.samples[i].bodies[0].endpoint.colliders[0].ref);
    }
    const middle = observed[4], chordY = (observed[0].y + observed[8].y) / 2;
    assert.ok(Math.abs(middle.y - chordY) > 1e-5, 'native middle must differ from endpoint chord');
    assert.deepEqual(trace.samples[8].bodies[0].endpoint, result.bodies[0].to);
    const retained = f.motion.read();
    trace.samples[0].bodies[0].endpoint.colliders[0].shape.radius = 999;
    trace.samples[0].bodies[0].endpoint.colliders[0].localPose.position.x = 999;
    trace.samples[0].bodies[0].ref.bodyId = 'tampered';
    assert.deepEqual(f.motion.read(), retained);
    f.world.step(); f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace, undefined);
    assert.equal(retained.nativeTrace.samples.length, 9);
  } finally { f.destroy(); }
});

test('native trace accepts sign-equivalent body and collider rotations without rewriting recorded endpoints', () => {
  const negative = rotation => Object.fromEntries(Object.entries(rotation).map(([key, value]) => [key, -value]));
  for (const rotation of [q([1, 0, 0], 0), q([1, 0, 0], .7), q([0, 1, 0], 1.3), q([0, 0, 1], 2.1)]) {
    const f = fixture(rotation);
    try {
      const initial = f.motion.read();
      f.body.setRotation(negative(f.body.rotation()), true);
      f.collider.setRotationWrtParent(negative(f.collider.rotationWrtParent()));
      assert.doesNotThrow(() => f.motion.beginNativeTrace(), `q/-q begin must preserve pose continuity: ${JSON.stringify({
        initial: initial.bodies[0].to, bodyRotation: f.body.rotation(), colliderRotation: f.collider.rotationWrtParent(),
        bodyPosition: f.body.translation(), colliderPosition: f.collider.translationWrtParent(),
      })}`);
      f.motion.captureNativeStep(dt / 2);
      f.body.setRotation(negative(f.body.rotation()), true);
      f.collider.setRotationWrtParent(negative(f.collider.rotationWrtParent()));
      assert.doesNotThrow(() => f.motion.captureNativeStep(dt), 'q/-q collider boundary must retain pose continuity');
      const recordedRotation = { ...f.body.rotation() };
      const recordedColliderRotation = { ...f.collider.rotationWrtParent() };
      f.body.setRotation(negative(f.body.rotation()), true);
      f.collider.setRotationWrtParent(negative(f.collider.rotationWrtParent()));
      assert.doesNotThrow(() => f.motion.completeStep(), 'q/-q final endpoint must compare as same orientation');
      const completed = f.motion.read();
      assert.deepEqual(completed.bodies[0].from, initial.bodies[0].to);
      const recorded = completed.nativeTrace.samples.at(-1).bodies[0].endpoint;
      assert.deepEqual(recorded.bodyOriginWorld.rotation, rigid({ position: zero, rotation: recordedRotation }).rotation);
      assert.deepEqual(recorded.colliders[0].localPose.rotation, rigid({ position: zero, rotation: recordedColliderRotation }).rotation);
      assert.ok(completed.nativeTrace.samples.at(-1).bodies[0].endpoint.bodyOriginWorld.rotation.w * recordedRotation.w > 0);
      assert.ok(completed.bodies[0].to.bodyOriginWorld.rotation.w * recordedRotation.w < 0);
    } finally { f.destroy(); }
  }
});

test('native trace final endpoint accepts an isolated native quaternion sign flip', () => {
  for (const target of ['body', 'collider']) {
    const f = fixture(q([0, 1, 0], 1.3));
    try {
      f.motion.beginNativeTrace(); f.motion.captureNativeStep(dt);
      const original = target === 'body' ? f.body.rotation() : f.collider.rotationWrtParent();
      const negative = { x: -original.x, y: -original.y, z: -original.z, w: -original.w };
      if (target === 'body') f.body.setRotation(negative, true);
      else f.collider.setRotationWrtParent(negative);
      assert.doesNotThrow(() => f.motion.completeStep(), `${target} final q/-q must compare as same orientation`);
    } finally { f.destroy(); }
  }
});

test('native trace rejects changed rotations at begin and final while leaving the exact prior draft recoverable', () => {
  for (const target of ['body', 'collider']) {
    const f = fixture();
    try {
      const initial = f.motion.read();
      const original = target === 'body' ? { ...f.body.rotation() } : { ...f.collider.rotationWrtParent() };
      const set = rotation => target === 'body' ? f.body.setRotation(rotation, true) : f.collider.setRotationWrtParent(rotation);
      set(q([0, 1, 0], .01));
      assert.throws(() => f.motion.beginNativeTrace(), /pose|continuity/i);
      assert.deepEqual(f.motion.read(), initial);
      set(original); f.motion.beginNativeTrace(); f.motion.captureNativeStep(dt);
      set(q([0, 1, 0], .01));
      assert.throws(() => f.motion.completeStep(), /changed|final/i);
      assert.deepEqual(f.motion.read(), initial);
      set(original); f.motion.completeStep();
      assert.equal(f.motion.read().nativeTrace.samples.length, 2);
    } finally { f.destroy(); }
  }
});

test('rotation comparison tolerance never relaxes final non-rotation endpoint fields', () => {
  const f = fixture();
  try {
    f.motion.beginNativeTrace(); f.motion.captureNativeStep(dt);
    const initial = f.motion.read();
    // These reader faults isolate the exact full-endpoint publication check.
    for (const method of ['translation', 'worldCom', 'localCom', 'linvel', 'angvel', 'mass', 'isSleeping']) {
      const original = f.body[method];
      try {
        f.body[method] = function (...args) {
          const value = original.apply(this, args);
          return method === 'mass' ? value + 1e-10 : method === 'isSleeping' ? !value
            : { ...value, x: value.x + 1e-10 };
        };
        assert.throws(() => f.motion.completeStep(), /changed|final/i, method);
        assert.deepEqual(f.motion.read(), initial, method);
      } finally { f.body[method] = original; }
    }
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.length, 2);
  } finally { f.destroy(); }
});

test('native trace rejects invalid timing nesting and unfinished completion without replacing publication', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    const initial = f.motion.read();
    assert.throws(() => f.motion.captureNativeStep(dt), /begin|active/i);
    f.motion.beginNativeTrace();
    assert.throws(() => f.motion.beginNativeTrace(), /active|nested/i);
    assert.throws(() => f.motion.completeStep(), /final|unfinished/i);
    for (const offset of [NaN, Infinity, -1, 0, dt + 1e-6]) {
      assert.throws(() => f.motion.captureNativeStep(offset), /offset|finite|increas|duration/i);
      assert.deepEqual(f.motion.read(), initial);
    }
    f.motion.captureNativeStep(dt / 2);
    assert.throws(() => f.motion.captureNativeStep(dt / 2), /increas/i);
    assert.throws(() => f.motion.completeStep(), /final|unfinished/i);
    f.motion.captureNativeStep(dt + 5e-13);
    assert.throws(() => f.motion.captureNativeStep(dt), /increas/i);
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.at(-1).offsetS, dt);
    f.motion.beginNativeTrace();
    for (let i = 1; i <= 16; i++) f.motion.captureNativeStep(i * dt / 16);
    assert.throws(() => f.motion.captureNativeStep(dt), /sixteen|16|limit/i);
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.length, 17);
  } finally { f.destroy(); }
});

test('native trace rejects teleports but admits handoff fields and retains intermediate discontinuities', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    const initial = f.motion.read(), position = f.body.translation();
    f.body.setTranslation({ ...position, x: position.x + .1 }, true);
    assert.throws(() => f.motion.beginNativeTrace(), /pose|continuity/i);
    assert.deepEqual(f.motion.read(), initial);
    f.body.setTranslation(position, true);
    f.collider.setTranslationWrtParent({ x: .1, y: 0, z: 0 });
    assert.throws(() => f.motion.beginNativeTrace(), /pose|continuity/i);
    f.collider.setTranslationWrtParent(zero);
    f.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
    f.body.setLinvel({ x: 3, y: 0, z: 0 }, true);
    f.motion.beginNativeTrace();
    f.collider.setTranslationWrtParent({ x: .2, y: 0, z: 0 });
    assert.throws(() => f.motion.captureNativeStep(dt / 2), /collider|pose/i);
    assert.deepEqual(f.motion.read(), initial);
    f.collider.setTranslationWrtParent(zero);
    f.setShape({ kind: 'ball', radius: .2 });
    f.motion.captureNativeStep(dt / 2);
    f.body.setBodyType(R.RigidBodyType.Dynamic, true);
    f.setShape({ kind: 'ball', radius: .1 });
    f.motion.captureNativeStep(dt);
    f.motion.completeStep();
    assert.deepEqual(f.motion.read().bodies[0].discontinuities, ['shape', 'authority']);
  } finally { f.destroy(); }
});

test('native endpoint failure does not append a half sample and may be corrected before retry', () => {
  const f = fixture();
  try {
    assert.equal(typeof f.motion.beginNativeTrace, 'function');
    f.motion.beginNativeTrace();
    const before = f.motion.read(), original = f.second.mass;
    try {
      f.second.mass = () => NaN;
      assert.throws(() => f.motion.captureNativeStep(dt), /finite/i);
      assert.deepEqual(f.motion.read(), before);
    } finally { f.second.mass = original; }
    f.motion.captureNativeStep(dt);
    f.body.setLinvel({ x: 9, y: 0, z: 0 }, true);
    assert.throws(() => f.motion.completeStep(), /changed|final/i);
    assert.deepEqual(f.motion.read(), before);
    f.body.setLinvel(before.bodies[0].to.comVelocityWorldMps, true);
    f.motion.completeStep();
    assert.equal(f.motion.read().nativeTrace.samples.length, 2);
  } finally { f.destroy(); }
});

test('native trace validates live collider membership before each capture and clears draft on destroy', () => {
  for (const phase of ['begin', 'capture', 'complete']) {
    const f = fixture();
    try {
      assert.equal(typeof f.motion.beginNativeTrace, 'function');
      const before = f.motion.read();
      if (phase !== 'begin') f.motion.beginNativeTrace();
      if (phase === 'complete') f.motion.captureNativeStep(dt);
      f.world.removeCollider(f.otherCollider, true);
      assert.throws(() => phase === 'begin' ? f.motion.beginNativeTrace()
        : phase === 'capture' ? f.motion.captureNativeStep(dt) : f.motion.completeStep(), /collider|reference/i);
      assert.deepEqual(f.motion.read(), before);
      f.motion.destroy();
      for (const action of [() => f.motion.beginNativeTrace(), () => f.motion.captureNativeStep(dt),
        () => f.motion.completeStep(), () => f.motion.read()]) assert.throws(action, /destroyed/i);
    } finally { f.destroy(); }
  }
});
```

- [x] **Step 2: Observe RED.** Run `rtk proxy node --test tests/nativeMotionTrace.test.mjs`. Observed five assertion failures because `beginNativeTrace` was undefined, not module-load errors (5 tests, 0 pass, 5 fail; 245.1249 ms).

- [x] **Step 3: Add the minimal bounded trace implementation.** Create `game/src/physics/nativeMotionTrace.ts`:

```ts
import type { BodyEndpoint, MotionInterval, NativeMotionSample, NativeMotionTrace } from './bodyMotion.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function samePose(a: RigidTransform, b: RigidTransform): boolean {
  const { rotation: rotationA, ...restA } = a, { rotation: rotationB, ...restB } = b;
  if (!same(restA, restB)) return false;
  const qa = rigid({ position: a.position, rotation: rotationA }).rotation;
  const qb = rigid({ position: b.position, rotation: rotationB }).rotation;
  // Comparison only: q/-q represent one orientation. The 2e-7 quaternion chord
  // bound (~4e-7 rad) allows float32 re-normalization, not positional/query error.
  // Recorded endpoint values are retained; every non-rotation field stays exact.
  const chord = Math.min(
    Math.hypot(qa.x - qb.x, qa.y - qb.y, qa.z - qb.z, qa.w - qb.w),
    Math.hypot(qa.x + qb.x, qa.y + qb.y, qa.z + qb.z, qa.w + qb.w),
  );
  return chord <= 2e-7;
}
const sameLocalPoses = (a: BodyEndpoint, b: BodyEndpoint) => a.colliders.length === b.colliders.length
  && a.colliders.every((collider, index) => same(collider.ref, b.colliders[index]!.ref)
    && samePose(collider.localPose, b.colliders[index]!.localPose));
function sameEndpoint(a: BodyEndpoint, b: BodyEndpoint): boolean {
  const { bodyOriginWorld: poseA, colliders: collidersA, ...restA } = a;
  const { bodyOriginWorld: poseB, colliders: collidersB, ...restB } = b;
  const metadata = (colliders: BodyEndpoint['colliders']) => colliders.map(({ localPose, ...rest }) => rest);
  return same(restA, restB) && same(metadata(collidersA), metadata(collidersB))
    && samePose(poseA, poseB) && sameLocalPoses(a, b);
}

/** Owner observations only; no interpolation, native stepping or solver-subsolve claims. */
export function createNativeMotionTrace(capture: () => NativeMotionSample['bodies']) {
  let draft: NativeMotionTrace | undefined;
  return {
    begin(interval: MotionInterval): void {
      if (draft) throw new Error('Native trace already active');
      const bodies = capture();
      for (const [index, body] of bodies.entries()) {
        const previous = interval.bodies[index]!.to;
        if (!samePose(body.endpoint.bodyOriginWorld, previous.bodyOriginWorld) || !sameLocalPoses(body.endpoint, previous)) {
          throw new Error('Native trace requires pose continuity with previous publication');
        }
      }
      draft = { kind: 'measured-native-boundaries', samples: [{ offsetS: 0, bodies }] };
    },
    capture(offsetS: number): void {
      if (!draft) throw new Error('Begin an active native trace before capture');
      if (draft.samples.length >= 17) throw new Error('Native trace limit is sixteen native steps');
      if (!Number.isFinite(offsetS)) throw new Error('Native offset must be finite');
      if (Math.abs(offsetS - FIXED_DT) <= 1e-12) offsetS = FIXED_DT;
      if (offsetS <= draft.samples[draft.samples.length - 1]!.offsetS || offsetS > FIXED_DT) {
        throw new Error('Native offset must increase within the fixed duration');
      }
      const bodies = capture();
      const previous = draft.samples[draft.samples.length - 1]!.bodies;
      for (const [index, body] of bodies.entries()) {
        if (!sameLocalPoses(body.endpoint, previous[index]!.endpoint)) {
          throw new Error('Native trace collider local pose changed between samples');
        }
      }
      draft.samples.push({ offsetS, bodies });
    },
    prepare(current: NativeMotionSample['bodies']): NativeMotionTrace | undefined {
      if (!draft) return undefined;
      const last = draft.samples[draft.samples.length - 1]!;
      if (last.offsetS !== FIXED_DT) throw new Error('Native trace has unfinished final offset');
      if (last.bodies.length !== current.length || !last.bodies.every((body, index) =>
        same(body.ref, current[index]!.ref) && sameEndpoint(body.endpoint, current[index]!.endpoint))) {
        throw new Error('Native endpoint changed since final capture');
      }
      return draft;
    },
    clear(): void { draft = undefined; },
  };
}
```

In `bodyMotion.ts`, add the import and types below. Add `nativeTrace?: NativeMotionTrace;` immediately after `MotionInterval.dtS`.

```ts
import { createNativeMotionTrace } from './nativeMotionTrace.ts';

export type NativeMotionSample = {
  offsetS: number;
  bodies: { ref: BodyRef; endpoint: BodyEndpoint }[];
};
export type NativeMotionTrace = {
  kind: 'measured-native-boundaries';
  samples: NativeMotionSample[];
};
```

Insert this full-capture helper after `assertRef` and before the returned owner API. It preflights all references before reading any endpoint.

```ts
  const captureBodies = (): NativeMotionSample['bodies'] => {
    for (const source of sources) {
      const ref = { worldEpoch, bodyId: source.bodyId };
      assertRef(ref);
      for (const collider of source.colliders) assertRef({ ...ref, colliderId: collider.colliderId });
    }
    return sources.map(source => ({
      ref: { worldEpoch, bodyId: source.bodyId }, endpoint: capture(source),
    }));
  };
  const nativeTrace = createNativeMotionTrace(captureBodies);
```

Replace the existing returned `completeStep` method with these three methods:

```ts
    /** Owner-only: begin after boundary handoff, before the first native step. */
    beginNativeTrace(): void { alive(); nativeTrace.begin(interval); },
    /** Measured owner-native boundary, not a CCD subsolve or continuous path. */
    captureNativeStep(offsetS: number): void { alive(); nativeTrace.capture(offsetS); },
    /** Publish only after all native writes and captures succeed; never advances time. */
    completeStep(): void {
      alive();
      const current = captureBodies();
      const trace = nativeTrace.prepare(current);
      const bodies = interval.bodies.map((previous, index) => {
        const from = previous.to, to = current[index]!.endpoint;
        const sequence = [from, ...(trace?.samples.map(sample => sample.bodies[index]!.endpoint) ?? []), to];
        const discontinuities: ('shape' | 'authority')[] = [];
        const shapes = (endpoint: BodyEndpoint) => JSON.stringify(endpoint.colliders.map(collider => collider.shape));
        if (sequence.some((endpoint, i) => i > 0 && shapes(endpoint) !== shapes(sequence[i - 1]!))) {
          discontinuities.push('shape');
        }
        if (sequence.some((endpoint, i) => i > 0 && endpoint.authority !== sequence[i - 1]!.authority)) {
          discontinuities.push('authority');
        }
        return { ref: previous.ref, from, to, discontinuities };
      });
      interval = { worldEpoch, kind: 'completed', fromTick: interval.toTick, toTick: interval.toTick + 1,
        dtS: FIXED_DT, bodies, ...(trace ? { nativeTrace: trace } : {}) };
      nativeTrace.clear();
    },
```

In `destroy()`, insert these lines before `interval.bodies = [];`:

```ts
      nativeTrace.clear();
      delete interval.nativeTrace;
```

- [x] **Step 4: Observe GREEN.** Run `rtk proxy node --test tests/nativeMotionTrace.test.mjs tests/bodyMotion.test.mjs`, then `rtk npm run typecheck`. Observed 11/11 pass (498.8077 ms), successful typecheck, and clean `git diff --check`. The existing untraced yard suite is unchanged. Execution pauses here for independent core specification and quality review before Task 2.

### Task 2: Capture the arm's real native boundaries without changing its integration

**Files:** create `game/tests/armNativeTrace.test.mjs`, modify `game/src/physics/armFixture.ts`.

- [ ] **Step 1: Add the failing integration tests.** Create `game/tests/armNativeTrace.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import R from '@dimforge/rapier3d-compat';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { dt, poseNear } from './bodyMotionHelpers.mjs';
await R.init();

test('arm trace samples the existing one animation and eight physical native steps exactly', async () => {
  const original = R.World.prototype.step, observed = [];
  let arm;
  try {
    R.World.prototype.step = function (...args) {
      const result = original.apply(this, args), poses = [];
      this.forEachRigidBody(body => poses.push({ position: { ...body.translation() }, rotation: { ...body.rotation() } }));
      observed.push({ dt: this.timestep, poses });
      return result;
    };
    arm = await createArmFixture();
    assert.equal(arm.snapshot().interval.nativeTrace, undefined);
    assert.equal(observed.length, 1);
    arm.setActive(true); arm.step();
    const animation = arm.snapshot();
    assert.ok(animation.interval.nativeTrace, 'animation must publish its native trace');
    assert.equal(animation.interval.nativeTrace.samples.length, 2);
    assert.equal(observed.length, 2);
    arm.handoff({ worldEpoch: animation.worldEpoch, atTick: animation.tick, impulse: null });
    const boundary = arm.snapshot();
    observed.length = 0;
    arm.step();
    const state = arm.snapshot(), trace = state.interval.nativeTrace;
    assert.equal(observed.length, 8);
    assert.equal(trace.samples.length, 9);
    assert.equal(state.tick, animation.tick + 1);
    for (let i = 0; i <= 8; i++) {
      assert.equal(trace.samples[i].offsetS, i * dt / 8);
      for (const [index, entry] of trace.samples[i].bodies.entries()) {
        assert.deepEqual(entry.ref, state.interval.bodies[index].ref);
        if (i > 0) poseNear(entry.endpoint.bodyOriginWorld, observed[i - 1].poses[index], 1e-12, 1e-7);
      }
    }
    for (let index = 0; index < 2; index++) {
      const zero = trace.samples[0].bodies[index].endpoint;
      assert.equal(zero.authority, 'physics');
      assert.deepEqual(zero.comVelocityWorldMps, boundary.segments[index].comVelocityWorldMps);
      assert.deepEqual(state.interval.bodies[index].discontinuities, ['authority']);
    }
    const intact = arm.snapshot();
    trace.samples[1].bodies[0].endpoint.colliders[0].shape.size[0] = 999;
    trace.samples[1].bodies[0].endpoint.bodyOriginWorld.position.x = 999;
    state.segments[0].binding.boneToBody.position.x = 999;
    state.segments[0].jointAnchorLocal.x = 999;
    assert.deepEqual(arm.snapshot(), intact);
    arm.setActive(false);
    const paused = arm.snapshot();
    assert.equal(arm.step(), false); assert.deepEqual(arm.snapshot(), paused);
    assert.equal(observed.length, 8);
  } finally { R.World.prototype.step = original; arm?.destroy(); }
});

test('native trace capture failure invalidates the whole arm owner without exposing a partial interval', async () => {
  const arm = await createArmFixture(), original = R.RigidBody.prototype.localCom;
  try {
    arm.setActive(true); arm.step();
    const retained = arm.snapshot();
    assert.ok(retained.interval.nativeTrace, 'completed trace required before failure');
    arm.handoff({ worldEpoch: retained.worldEpoch, atTick: retained.tick, impulse: null });
    let calls = 0;
    R.RigidBody.prototype.localCom = function (...args) {
      if (++calls === 6) throw new Error('injected native trace capture failure');
      return original.apply(this, args);
    };
    assert.throws(() => arm.step(), /trace capture failure/);
    assert.deepEqual(arm.counts(), { bodies: 0, colliders: 0, joints: 0 });
    assert.throws(() => arm.snapshot(), /destroyed/i);
    assert.equal(retained.interval.toTick, 1);
    assert.equal(retained.interval.nativeTrace.samples.length, 2);
  } finally { R.RigidBody.prototype.localCom = original; arm.destroy(); }
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test tests/armNativeTrace.test.mjs`. Expect assertions that completed arm traces are missing. No production arm edits until those failures have been observed.

- [ ] **Step 3: Record the existing boundaries.** In `armFixture.ts`, insert `motion!.beginNativeTrace();` immediately after the `try {` inside `step()`, before `const samples`. Insert `motion!.captureNativeStep(FIXED_DT);` immediately after the animation branch `world.step()`. Insert `motion!.captureNativeStep((substep + 1) * PHYSICS_NATIVE_DT);` immediately after the physics loop `world.step()`. These are the complete added statements:

```ts
          motion!.beginNativeTrace();
```

```ts
            motion!.captureNativeStep(FIXED_DT);
```

```ts
              motion!.captureNativeStep((substep + 1) * PHYSICS_NATIVE_DT);
```

In snapshot segment records, immediately after `ref`, add these detached frame definitions:

```ts
            binding: structuredClone(s.binding),
            jointAnchorLocal: { ...(index === 0 ? adapter.joint.anchor1() : adapter.joint.anchor2()) },
```

No changes to bootstrap, timestep, solver iterations, CCD settings, torque, impulse, energy/work accumulation, measurement order, tick increment, authority capture, or completion ordering.

- [ ] **Step 4: Observe GREEN and retain physical acceptance.** Run `rtk proxy node --test tests/armNativeTrace.test.mjs tests/armFixture.test.mjs`, then `rtk npm run typecheck`. Existing exact probe, phase sweep, negative controls, 600-tick stability, one-shot impulse, eight-step counts and owner-failure tests must pass at the existing thresholds.

### Task 3: Pure historical render frames

**Files:** create `game/tests/armLabTrace.test.mjs`, create `game/src/lab/armLabTrace.ts`.

- [ ] **Step 1: Add failing tests with graceful missing-module detection.** Create `game/tests/armLabTrace.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { poseNear, vecNear } from './bodyMotionHelpers.mjs';
const url = new URL('../src/lab/armLabTrace.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('historical render frames derive recorded body bone collider COM and anchors without mutating owner', async () => {
  assert.equal(typeof api.armTraceFrame, 'function');
  const arm = await createArmFixture();
  try {
    arm.setActive(true); arm.step();
    const before = arm.snapshot();
    arm.handoff({ worldEpoch: before.worldEpoch, atTick: before.tick, impulse: null });
    arm.step(); arm.setActive(false);
    const state = arm.snapshot(), retained = structuredClone(state);
    const final = api.armTraceFrame(state, 8);
    assert.equal(final.offsetS, state.interval.dtS);
    for (let index = 0; index < 2; index++) {
      poseNear(final.segments[index].bodyOriginWorld, state.segments[index].bodyOriginWorld);
      poseNear(final.segments[index].boneWorld, state.segments[index].boneWorld);
      poseNear(final.segments[index].colliderWorld, state.segments[index].colliderWorld);
      vecNear(final.segments[index].comWorld, state.segments[index].comWorld);
      vecNear(final.anchorsWorld[index], state.metrics.anchorsWorld[index]);
    }
    const first = api.armTraceFrame(state, 0);
    assert.notDeepEqual(first.segments[0].bodyOriginWorld, final.segments[0].bodyOriginWorld);
    first.segments[0].bodyOriginWorld.position.x = 999;
    first.segments[0].comWorld.x = 999;
    assert.deepEqual(state, retained);
    assert.deepEqual(arm.snapshot(), retained);
    for (const bad of [-1, .5, 9, NaN]) assert.throws(() => api.armTraceFrame(state, bad), /sample|index/i);
  } finally { arm.destroy(); }
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test tests/armLabTrace.test.mjs`. Expect missing `armTraceFrame` assertion.

- [ ] **Step 3: Add the pure frame derivation.** Create `game/src/lab/armLabTrace.ts`:

```ts
import type { ArmSnapshot } from '../physics/armFixture.ts';
import { composeRigid, worldBoneFromBody } from '../physics/poseBinding.ts';

/** Inspection only. Returns detached recorded frames; never restores the owner. */
export function armTraceFrame(snapshot: ArmSnapshot, sampleIndex: number) {
  const sample = snapshot.interval.nativeTrace?.samples[sampleIndex];
  if (!Number.isInteger(sampleIndex) || !sample) throw new Error('Invalid native sample index');
  const segments = snapshot.segments.map(segment => {
    const entry = sample.bodies.find(body => body.ref.worldEpoch === segment.ref.worldEpoch
      && body.ref.bodyId === segment.ref.bodyId);
    if (!entry) throw new Error('Native sample missing registered segment');
    const endpoint = entry.endpoint;
    const collider = endpoint.colliders.find(collider => collider.ref.colliderId === 'shape');
    if (!collider) throw new Error('Native sample missing registered collider');
    return {
      bodyOriginWorld: structuredClone(endpoint.bodyOriginWorld),
      boneWorld: worldBoneFromBody(endpoint.bodyOriginWorld, segment.binding),
      colliderWorld: composeRigid(endpoint.bodyOriginWorld, collider.localPose),
      comWorld: { ...endpoint.comWorld },
      anchorWorld: composeRigid(endpoint.bodyOriginWorld, {
        position: segment.jointAnchorLocal, rotation: { x: 0, y: 0, z: 0, w: 1 },
      }).position,
    };
  });
  return { offsetS: sample.offsetS, segments, anchorsWorld: segments.map(segment => segment.anchorWorld) };
}
```

- [ ] **Step 4: Observe GREEN.** Run `rtk proxy node --test tests/armLabTrace.test.mjs`, then `rtk npm run typecheck`.

### Task 4: Paused inspector UI, lifecycle and reusable renderer frames

**Files:** modify `game/browser/armLab.spec.mjs`, `game/arm-lab.html`, `game/src/lab/armLab.ts`, `game/src/lab/armLabView.ts`, `game/src/lab/armLab.css`.

- [ ] **Step 1: Add the failing browser acceptance case.** Append to `game/browser/armLab.spec.mjs`:

```js
test('paused native inspector changes rendered history only and clears across live resume reset and context recovery', { timeout: 60_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(() => window.__armLab?.() != null);
    assert.equal(await page.locator('#native-sample').count(), 1, 'native inspector range must exist');
    await page.locator('#native-inspector summary').click();
    assert.equal(await page.locator('#native-sample').isDisabled(), true);
    await page.locator('#animate').click();
    await page.waitForFunction(() => window.__armLab().tick >= 30);
    await page.locator('#pause').click();
    await page.locator('#handoff').click();
    const handoffTick = await page.evaluate(() => window.__armLab().tick);
    await page.locator('#animate').click();
    await page.waitForFunction(tick => window.__armLab().tick >= tick + 34, handoffTick);
    await page.locator('#pause').click(); await frames(page);
    const before = await page.evaluate(() => window.__armLab());
    const select = async value => {
      await page.locator('#native-sample').focus();
      await page.keyboard.press('Home');
      for (let index = 0; index < value; index++) await page.keyboard.press('ArrowRight');
      await frames(page);
    };
    await select(0);
    const first = await page.evaluate(() => window.__armLab());
    assert.equal(first.inspection.sampleIndex, 0);
    assert.match(await page.locator('#inspection-banner').textContent(), /historisk/i);
    await page.screenshot({ path: join(captures, 'arm-lab-native-zero.png') });
    await select(4);
    const middle = await page.evaluate(() => window.__armLab());
    assert.equal(middle.inspection.sampleIndex, 4);
    assert.notDeepEqual(middle.inspection.frame.segments, first.inspection.frame.segments);
    for (const state of [first, middle]) {
      assert.equal(state.tick, before.tick); assert.equal(state.mode, before.mode);
      assert.equal(state.pending, false); assert.equal(state.running, false);
      assert.deepEqual(state.segments, before.segments);
      assert.deepEqual(state.interval, before.interval);
    }
    assert.match(await page.locator('#native-time').textContent(), /4 \/ 8/);
    await page.screenshot({ path: join(captures, 'arm-lab-native-middle.png') });
    await page.locator('#native-live').click();
    assert.equal((await page.evaluate(() => window.__armLab())).inspection, null);
    await select(2);
    await page.locator('#animate').click();
    await page.waitForFunction(tick => window.__armLab().tick > tick, before.tick);
    assert.equal((await page.evaluate(() => window.__armLab())).inspection, null);
    assert.equal(await page.locator('#native-sample').isDisabled(), true);
    await page.locator('#pause').click(); await select(3);
    await page.evaluate(() => {
      const gl = document.querySelector('#lab-viewport canvas').getContext('webgl2');
      const extension = gl.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Context extension unavailable');
      window.__restoreTraceContext = () => extension.restoreContext(); extension.loseContext();
    });
    await page.waitForFunction(() => window.__armLab().graphicsLost);
    assert.equal((await page.evaluate(() => window.__armLab())).inspection, null);
    assert.equal(await page.locator('#native-sample').isDisabled(), true);
    await page.evaluate(() => window.__restoreTraceContext());
    await page.waitForFunction(() => !window.__armLab().graphicsLost); await frames(page);
    const restored = await page.evaluate(() => window.__armLab());
    assert.equal(restored.running, false); assert.equal(restored.inspection, null);
    assert.deepEqual(restored.gpu, before.gpu);
    await select(1);
    await page.locator('#reset').click();
    await page.waitForFunction(() => window.__armLab()?.tick === 0); await frames(page);
    const reset = await page.evaluate(() => window.__armLab());
    assert.equal(reset.inspection, null); assert.equal(reset.interval.nativeTrace, undefined);
    assert.equal(await page.locator('#native-sample').isDisabled(), true);
    assert.deepEqual(reset.gpu, before.gpu);
    assert.equal(await page.locator('#lab-viewport canvas').count(), 1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test --test-name-pattern="paused native inspector" browser/armLab.spec.mjs`. Expect the explicit range-count assertion to fail with `0 !== 1`.

- [ ] **Step 3: Add the HTML and CSS controls.** In `game/arm-lab.html`, insert this block before the existing footnote. Change the diagnostic term `Steg` to `Aktuell gräns · steg`, `Ledavstånd` to `Aktuellt ledavstånd`, and `Kontaktpenetration` to `Aktuell kontaktpenetration` so historical visuals do not imply historical metrics.

```html
        <details id="native-inspector">
          <summary>Inspektera senaste delstegen</summary>
          <p>Uppmätta native-gränser. Ingen kontinuerlig solverbana eller CCD-delsteg.</p>
          <label for="native-sample">Inspelad gräns i senaste intervallet</label>
          <input id="native-sample" type="range" min="0" max="0" value="0" step="1" disabled />
          <p id="native-time" aria-live="polite">Ingen färdig inspelning.</p>
          <button id="native-live" disabled>Visa aktuell pose</button>
          <p>Historisk inspektion ändrar inte fysiken. Axlar visar kropp, animationsram och collider; röd X, grön Y, blå Z.</p>
        </details>
```

Replace the empty viewport section with:

```html
      <section id="lab-viewport" aria-label="Tredimensionellt armprov">
        <p id="inspection-banner" hidden></p>
      </section>
```

Append to `game/src/lab/armLab.css`:

```css
#native-inspector { margin-top:20px; border-top:1px solid #40534a; padding-top:14px; font-size:12px; }
#native-inspector summary { cursor:pointer; color:var(--lab-highlight); line-height:1.5; }
#native-inspector p { color:var(--lab-muted); line-height:1.5; }
#native-inspector label { display:block; line-height:1.5; }
#native-sample { width:100%; margin:14px 0 4px; accent-color:var(--lab-focus); }
#native-inspector summary:focus-visible,#native-sample:focus-visible { outline:3px solid var(--lab-focus); outline-offset:3px; }
#native-time { font-variant-numeric:tabular-nums; }
#native-live { width:100%; font-size:12px; padding:9px 11px; }
#inspection-banner { position:absolute; top:18px; left:18px; right:18px; z-index:1; margin:0; padding:12px 16px; background:#172421ed; border:1px solid var(--lab-focus); color:var(--lab-highlight); font-size:13px; line-height:1.5; pointer-events:none; }
```

- [ ] **Step 4: Add sampled render transforms and reusable axes.** In `armLabView.ts`, import `armTraceFrame`:

```ts
import { armTraceFrame } from './armLabTrace.ts';
```

Before `let disposed = false`, allocate the six reusable axes:

```ts
  const frames = [0, 1].map(() => [.12, .18, .24].map(size => {
    const axes = new THREE.AxesHelper(size);
    axes.renderOrder = 3;
    const materials = Array.isArray(axes.material) ? axes.material : [axes.material];
    for (const material of materials) {
      material.depthTest = false;
      material.depthWrite = false;
      material.transparent = true;
      material.opacity = 0;
    }
    scene.add(axes);
    return axes;
  }));
```

Change `setPose` parameter type from `THREE.Mesh` to `THREE.Object3D`. Replace the `render` method with:

```ts
    render(snapshot: ArmSnapshot, sampleIndex: number | null = null): void {
      if (disposed) return;
      const historical = sampleIndex === null ? null : armTraceFrame(snapshot, sampleIndex);
      const segments = historical?.segments ?? snapshot.segments;
      const anchorPoints = historical?.anchorsWorld ?? snapshot.metrics.anchorsWorld;
      for (const [index, item] of [upper, lower].entries()) {
        const segment = segments[index]!;
        setPose(item, segment.colliderWorld);
        const center = segment.comWorld;
        com[index]!.position.set(center.x, center.y, center.z);
        const anchor = anchorPoints[index]!;
        anchors[index]!.position.set(anchor.x, anchor.y, anchor.z);
        const poses = [segment.bodyOriginWorld, segment.boneWorld, segment.colliderWorld];
        for (const [frameIndex, axes] of frames[index]!.entries()) {
          for (const material of Array.isArray(axes.material) ? axes.material : [axes.material]) {
            material.opacity = historical ? 1 : 0;
          }
          setPose(axes, poses[frameIndex]!);
        }
      }
      renderer.render(scene, camera);
    },
```

Before `scene.clear()` in destroy, add:

```ts
      for (const axes of frames.flat()) {
        axes.geometry.dispose();
        for (const material of Array.isArray(axes.material) ? axes.material : [axes.material]) material.dispose();
      }
```

Axes remain in the render traversal with opacity zero in live mode, ensuring their GPU resources are allocated on the initial frame. Inspection changes opacity and transforms only. Context recovery therefore rebuilds the same resource count in either mode.

- [ ] **Step 5: Wire the inspector into the lab owner.** Import `armTraceFrame` into `armLab.ts`:

```ts
import { armTraceFrame } from './armLabTrace.ts';
```

After the existing `mass` element declaration, add:

```ts
  const nativeSample = element<HTMLInputElement>('#native-sample');
  const nativeTime = element<HTMLElement>('#native-time');
  const nativeLive = element<HTMLButtonElement>('#native-live');
  const inspectionBanner = element<HTMLElement>('#inspection-banner');
  let sampleIndex: number | null = null;
  function clearInspection(): void { sampleIndex = null; }
```

At the end of `update()` add:

```ts
    const trace = state?.interval.nativeTrace;
    const available = !!trace && !running && !loading && !graphicsLost;
    if (!available) clearInspection();
    nativeSample.disabled = !available;
    nativeSample.max = String((trace?.samples.length ?? 1) - 1);
    nativeSample.value = String(sampleIndex ?? (trace?.samples.length ?? 1) - 1);
    nativeLive.disabled = sampleIndex === null;
    inspectionBanner.hidden = sampleIndex === null;
    if (trace && state) {
      const index = sampleIndex ?? trace.samples.length - 1;
      const offset = trace.samples[index]!.offsetS;
      const label = `Delsteg ${index} / ${trace.samples.length - 1} · t = ${(state.interval.fromTick * state.interval.dtS + offset).toFixed(6)} s · +${(offset * 1000).toFixed(3)} ms`;
      nativeTime.textContent = `${sampleIndex === null ? 'Aktuell pose. Inspelning:' : 'Historisk inspektion:'} ${label}`;
      inspectionBanner.textContent = `Historisk inspektion · ${label}. Fysiken är pausad. Kropp / animationsram / collider visas med axellängd 12 / 18 / 24 cm.`;
    } else nativeTime.textContent = 'Ingen färdig inspelning.';
```

At the start of `reset()` before `pause()`, add `clearInspection();`. In the start-click callback before `running = true`, add `clearInspection();`. In the handoff-click callback before reading its state, add `clearInspection();`. In the context-lost callback before `graphicsLost = true`, add `clearInspection();`. In the pagehide callback before `pause()`, add `clearInspection();`.

After the reset click listener add the following listeners:

```ts
  nativeSample.addEventListener('input', () => {
    if (!arm || running || loading || graphicsLost) return;
    const state = arm.snapshot(), index = Number(nativeSample.value);
    if (!Number.isInteger(index) || !state.interval.nativeTrace?.samples[index]) return;
    sampleIndex = index;
    view.render(state, sampleIndex);
    update();
  }, { signal: events.signal });
  nativeLive.addEventListener('click', () => {
    clearInspection();
    if (arm) view.render(arm.snapshot());
    update();
  }, { signal: events.signal });
```

In `frame()`, replace `if (arm) view.render(arm.snapshot());` with:

```ts
      if (arm) view.render(arm.snapshot(), sampleIndex);
```

Replace the `window.__armLab` assignment with:

```ts
  window.__armLab = () => {
    if (!arm) return null;
    const snapshot = arm.snapshot();
    return { ...snapshot, running, resets, graphicsLost, gpu: view.resources(),
      inspection: sampleIndex === null ? null : { sampleIndex, frame: armTraceFrame(snapshot, sampleIndex) } };
  };
```

In the boot catch controls list append `'#native-live'` (the range is already disabled in authored HTML).

- [ ] **Step 6: Observe GREEN.** Run `rtk proxy node --test --test-name-pattern="paused native inspector" browser/armLab.spec.mjs`, then `rtk npm run typecheck`. Run `rtk proxy node --test browser/armLab.spec.mjs` for the full existing browser lab gate. Existing main buttons and WebGL/boot/reset cases must pass.

### Task 5: Review and final acceptance

- [ ] **Step 1: Run the full relevant validation.** Run `rtk npm run check`, `rtk npm run build`, and `rtk proxy node --test browser/armLab.spec.mjs`. No desktop command is authorized. Capture concise test totals and any existing warnings separately from failures.
- [ ] **Step 2: Inspect screenshots.** Open `.playtest/arm-lab-native-zero.png` and `.playtest/arm-lab-native-middle.png` with the image tool. Confirm visible historical caption, recorded time, body/bone/collider axes, unchanged main controls, no sidebar overflow at 1440×900, and actual sampled pose differences. Parent must also view these images before declaring acceptance. Do not claim a continuous path or dramatic visible motion from one 1/60-second interval.
- [ ] **Step 3: Review exact scope.** From the worktree root run `rtk git diff --check` and `rtk git status --short`. Verify only the files mapped above changed and the research directory remains untouched. Send parent modified paths, RED/GREEN evidence, screenshot paths, and any unresolved limitation. Parent runs independent specification review followed by code-quality review and owns final documentation/integration.

## Self-review before execution

All sample pose/frame data are detached and derived before rendering. Historical shape rendering uses the arm fixture's invariant boxes; the trace itself preserves any shape discontinuities, and this bounded inspector does not promise arbitrary shape recreation. Geometry, native integration and existing acceptance thresholds remain unchanged.

Plan author self-review: tasks cover trace bounds/time validation, live-reference checks, pose continuity at begin, handoff field discontinuities, full endpoint check at completion, recoverable failure, destruction, detached snapshots, real native boundary observations, no extra world steps, paused inspection, live/resume/reset/context clearing, resource stability and final screenshots. Preparation changed only this plan.

Execution checkpoint, 2026-09-13: Task 1 passed independent specification and quality review and is committed as `20d9cf5`. Task 2 observed RED 0/2 on missing traces, then GREEN 15/15 combined arm/native-trace tests. Independent specification review repeated 15/15 (75.419 s, all 59 physical phases with `failed: []`); ordered quality review approved after 2/2 focused tests and typecheck. Coordinator full strict/native check passed 115/115 (52.924 s). Task 2 adds only actual-boundary capture and detached binding/anchor fields; dynamics and thresholds are unchanged. Tasks 3–5 remain unexecuted: no historical frame adapter, inspector UI, fresh browser/visual acceptance or full moving-contact-query acceptance is claimed.

Later same-day checkpoint: Task 3 is implemented (`003a657` plus reviewed output narrowing), independent SPEC PASS and QUALITY APPROVE, parent focused 1/1 PASS. The pure adapter exposes only body/bone/collider/COM/anchor historical geometry; no physics access or restore. Task 4 is now in progress under a new sole writer with browser RED first; its acceptance and Task 5 remain pending. The earlier Tasks 3–5-unexecuted sentence is superseded by this dated progression, not evidence of completed UI.

Final same-day checkpoint: **Tasks 1–5 complete and accepted at this bounded scope.** Task 4 observed missing-range RED, paused-blur RED and expanded-layout-fit RED followed by GREEN; final independent SPEC and ordered QUALITY pass. Parent final native 116/116, strict types/build, and combined browser 14/14 all PASS; both final screenshots inspected. Exact evidence, preserved review corrections and performance limitations are in `2026-09-13-native-motion-trace-results.md`. Earlier task-status sentences and unchecked execution-template boxes remain a historical recipe, not the current completion state. The moving-contact query and continuous-path accuracy are not accepted by this increment.

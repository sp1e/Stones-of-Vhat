# Grip Telekinesis Implementation Plan

**Paused draft, 2026-09-08 15:24:** Only Tasks 1–3 have been written; renderer/main/HTML/browser sections are incomplete. No Grip tests or production code have been created/run. Core physics Tasks 1–2 received internal review approval, but user pause supersedes execution. Before continuing, read repository-root `.continue-here.md` for required actual-held input feedback and missing safety scenarios. Do not execute this draft as a complete playable implementation plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The coordinator owns independent spec and quality review; the assigned implementation worker executes inline without further delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver M1B-1, playable physical Grip (acquire, lift/pull, rotate, place/release, throw) in the existing PC courtyard browser prototype.

**Architecture:** `physics/grip.ts` owns a bounded real-Rapier controller without Three or DOM dependencies. Yard owns its lifetime and provides detached snapshots; browser input emits fixed-step commands, and the existing renderer/HUD consumes snapshots. Right-click hold is the default, with an explicitly session-only toggle setting independent of the existing gore codec.

**Tech Stack:** TypeScript, Three 0.185.1, Rapier 0.20.0, Vite, Node native tests, Playwright; no added dependencies or assets.

---

## Ownership and verification contract

Worktree: `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`, branch already selected by coordinator. Base at review: `607fc0a`. Run commands from `game/` unless specified. Every shell command starts `rtk`. Edit with `apply_patch`. Do not touch `docs/research/deep-research`, desktop source/builds/packages, Windows acceptance notes, or coordinator `team-state.md`.

Baseline is 32 passing native tests plus six existing browser regressions. Observe actual RED before production edits. Record commands and failing assertions, then GREEN counts, in the results document. The code below is the initial implementation, not a claim of validated tuning; change a parameter only against a failing behavioral check and document the result. Approval of this plan is internal coordinator review, not another user approval gate.

Files and responsibilities:

| File | Responsibility |
| --- | --- |
| `game/src/physics/grip.ts` (new) | Selection, limits, detached Grip status, bounded linear/angular impulses |
| `game/src/physics/yard.ts` | Controller ownership, fixed-step integration, explicit release, body velocity snapshots |
| `game/src/input/gripInput.ts` (new) | Browser-independent grip button/motion state and edge consumption |
| `game/src/input/browserInput.ts` | Active-only DOM event routing and camera/rotation separation |
| `game/src/main.ts` | Commands, pause/restart release, session setting, readonly diagnostics, compact hint |
| `game/src/render/yardView.ts` | Held material highlight and one disposable line |
| `game/index.html` | Honest Grip wording, controls and session setting |
| `game/src/style.css` | Compact hint wrapping only if visual inspection requires it |
| `game/tests/grip.test.mjs`, `game/tests/gripInput.test.mjs` (new) | Actual physics and input behavior |
| `game/browser/yard.spec.mjs` | Real mouse/keyboard Grip acceptance beside six regressions |
| `docs/superpowers/plans/2026-09-08-grip-telekinesis-results.md` (new) | Observed evidence, parameters, limitations |

The player is the existing kinematic capsule; held props always remain dynamic. Never use per-frame `setTranslation`, `setRotation`, velocity overwrites, kinematic conversion, or accumulating forces for Grip. Existing capsule resizing is outside this constraint and remains unchanged.

## Task 1: Real-physics Grip selection and control

- [ ] **Step 1: Add the initial failing real-physics tests to `game/tests/grip.test.mjs`.**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createYard } from '../src/physics/yard.ts';

const idle = { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false };
const box = (id, size, position, mass) => ({ id, shape: { kind: 'box', size }, position, color: '#777777', ...(mass === undefined ? {} : { mass }) });
const floor = box('floor', [40, 1, 40], { x: 0, y: -0.5, z: 0 });
const prop = (id = 'prop', mass = 8, z = 4) => box(id, [0.6, 0.6, 0.6], { x: 0, y: 0.31, z }, mass);
const pose = (yard, id = 'prop') => yard.snapshot().bodies.find(body => body.id === id);
const command = (extra = {}) => ({ wanted: true, acquire: false, throwPressed: false, yaw: 0, pitch: 0, distanceDelta: 0, rotateYaw: 0, rotatePitch: 0, ...extra });
function aim(yard, id = 'prop') {
  const eye = yard.snapshot().player.eye;
  const point = pose(yard, id).position;
  const dx = point.x - eye.x, dy = point.y - eye.y, dz = point.z - eye.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
function run(yard, ticks, grip, movement = {}) {
  for (let tick = 0; tick < ticks; tick++) yard.step({ ...idle, ...movement }, grip);
}
async function fixture(layout, exercise) {
  const yard = await createYard({ layout: [floor, ...layout] });
  try { run(yard, 60); await exercise(yard); } finally { yard.destroy(); }
}
function acquire(yard, id = 'prop') {
  const angles = aim(yard, id);
  yard.step(idle, command({ ...angles, acquire: true }));
  assert.equal(yard.snapshot().grip?.heldId, id, 'an aimed eligible real body must acquire');
  return angles;
}

test('Grip acquires the nearest visible dynamic body and reports detached stable identity', async () => {
  await fixture([prop(), prop('far', 8, 2)], yard => {
    acquire(yard);
    const snapshot = yard.snapshot();
    assert.equal(snapshot.grip.mass, 8);
    snapshot.grip.target.x = 900;
    snapshot.bodies.find(body => body.id === 'prop').velocity.x = 900;
    assert.notEqual(yard.snapshot().grip.target.x, 900);
    assert.notEqual(pose(yard).velocity.x, 900);
  });
});

test('Grip cannot select through a fixed wall or select overweight or out-of-range bodies', async () => {
  for (const layout of [
    [prop(), box('wall', [3, 3, 0.3], { x: 0, y: 1.5, z: 6 })],
    [prop('prop', 50)],
    [prop('prop', 8, -2)],
  ]) await fixture(layout, yard => {
    yard.step(idle, command({ ...aim(yard), acquire: true }));
    assert.equal(yard.snapshot().grip?.heldId, null);
  });
});

test('Grip lifts and holds with finite bounded speed, then release restores falling', async () => {
  await fixture([prop()], yard => {
    acquire(yard);
    const before = pose(yard).position.y;
    for (let tick = 0; tick < 180; tick++) {
      yard.step(idle, command());
      const body = pose(yard);
      assert.ok(Object.values(body.position).every(Number.isFinite));
      assert.ok(Math.hypot(...Object.values(body.velocity)) < 12);
      assert.equal(yard.snapshot().grip.heldId, 'prop');
      assert.ok(yard.snapshot().grip.impulse <= 700 / 60 + 1e-6);
    }
    const lifted = pose(yard).position.y;
    assert.ok(lifted > before + 0.8, `lift ${before} -> ${lifted}`);
    yard.releaseGrip();
    assert.equal(yard.snapshot().grip.heldId, null);
    run(yard, 90);
    assert.ok(pose(yard).position.y < lifted - 0.6);
  });
});

test('Grip rotation applies finite torque and a throw command cannot throw twice', async () => {
  await fixture([prop()], yard => {
    acquire(yard);
    run(yard, 90, command());
    const before = pose(yard).rotation;
    run(yard, 30, command({ rotateYaw: 0.025 }));
    const after = pose(yard).rotation;
    assert.ok(Math.abs(before.w * after.w + before.x * after.x + before.y * after.y + before.z * after.z) < 0.99);
    assert.ok(Math.hypot(...Object.values(pose(yard).angularVelocity)) < 8);
    yard.step(idle, command({ throwPressed: true }));
    assert.equal(yard.snapshot().grip.heldId, null);
    const speed = pose(yard).velocity.z;
    yard.step(idle, command({ throwPressed: true }));
    assert.ok(Math.abs(pose(yard).velocity.z - speed) < 0.5);
    assert.ok(speed < -5);
  });
});

test('Grip releases on malformed input, missing command, excessive aim change and lost sight', async () => {
  for (const next of [undefined, command({ yaw: NaN }), command({ pitch: Infinity }), command({ yaw: Math.PI / 2 }), command({ yaw: Math.PI })]) {
    await fixture([prop()], yard => {
      acquire(yard);
      run(yard, 90, command());
      yard.step(idle, next);
      assert.equal(yard.snapshot().grip.heldId, null);
      assert.ok(Object.values(pose(yard).position).every(Number.isFinite));
    });
  }
});

test('ten Grip world lifecycles retain body/collider/joint counts and destroy cleanly', async () => {
  for (let cycle = 0; cycle < 10; cycle++) {
    const yard = await createYard({ layout: [floor, prop()] });
    run(yard, 60);
    const baseline = yard.counts();
    acquire(yard);
    run(yard, 30, command());
    assert.deepEqual(yard.counts(), baseline);
    assert.equal(yard.snapshot().grip.joints, 0);
    yard.destroy();
    yard.destroy();
    assert.deepEqual(yard.counts(), { bodies: 0, colliders: 0 });
  }
});
```

- [ ] **Step 2: Observe RED.** Run `rtk node --test tests/grip.test.mjs`. Expected behavioral assertion: aimed body must acquire (`undefined !== 'prop'`); fixed-wall/mass test expects `null` but no Grip snapshot exists. Missing `releaseGrip` must not be the only observed failure.

- [ ] **Step 3: Add `game/src/physics/grip.ts` with the following complete controller.**

```ts
import RAPIER from '@dimforge/rapier3d-compat';
import type { Rotation, Vec3 } from '../content/yardLayout.ts';
import { FIXED_DT as dt } from '../runtime/fixedStep.ts';

export type GripCommand = {
  wanted: boolean; acquire: boolean; throwPressed: boolean;
  yaw: number; pitch: number; distanceDelta: number;
  rotateYaw: number; rotatePitch: number;
};
export type GripSnapshot = {
  status: 'idle' | 'ready' | 'holding' | 'blocked' | 'released' | 'thrown' | 'invalid';
  candidateId: string | null; heldId: string | null; mass: number | null;
  distance: number; target: Vec3 | null; impulse: number; torqueImpulse: number;
  joints: number;
};
export const GRIP_LIMITS = Object.freeze({ range: 6, breakRange: 7.5, mass: 35,
  minDistance: 1.8, maxDistance: 5.5, maxError: 3, force: 700,
  acceleration: 30, torque: 100, speed: 12, angularSpeed: 8, throwSpeed: 8, throwImpulse: 200 });
const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
const scale = (v: Vec3, n: number): Vec3 => ({ x: v.x * n, y: v.y * n, z: v.z * n });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const cap = (v: Vec3, maximum: number) => scale(v, Math.min(1, maximum / Math.max(1e-9, length(v))));
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
function multiply(a: Rotation, b: Rotation): Rotation {
  return { x: a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
    y: a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
    z: a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
    w: a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z };
}
function axisRotation(axis: Vec3, angle: number): Rotation {
  const s = Math.sin(angle / 2);
  return { ...scale(axis, s), w: Math.cos(angle / 2) };
}
function angularError(target: Rotation, current: Rotation): Vec3 {
  const q = multiply(target, { x: -current.x, y: -current.y, z: -current.z, w: current.w });
  const sign = q.w < 0 ? -1 : 1;
  const vector = { x: q.x * sign, y: q.y * sign, z: q.z * sign };
  const norm = length(vector);
  return scale(vector, 2 * Math.atan2(norm, Math.abs(q.w)) / Math.max(norm, 1e-9));
}
function pd(error: Vec3, velocity: Vec3, kp: number, kd: number): Vec3 {
  return scale(sub(scale(error, kp), scale(velocity, kd + kp * dt)), 1 / (1 + kd * dt + kp * dt * dt));
}

export function createGrip(world: RAPIER.World, bodies: ReadonlyMap<string, RAPIER.RigidBody>, player: RAPIER.RigidBody) {
  let held: { id: string; body: RAPIER.RigidBody; rotation: Rotation; radius: number } | null = null;
  let state: GripSnapshot = { status: 'idle', candidateId: null, heldId: null, mass: null,
    distance: 3, target: null, impulse: 0, torqueImpulse: 0, joints: 0 };
  let acquireDown = false;
  let throwDown = false;
  const release = (status: GripSnapshot['status'] = 'released') => {
    held = null;
    state = { ...state, status, heldId: null, mass: null, target: null, impulse: 0, torqueImpulse: 0 };
  };
  function step(eye: Vec3, command?: GripCommand): void {
    const valid = command && [command.yaw, command.pitch, command.distanceDelta, command.rotateYaw, command.rotatePitch, eye.x, eye.y, eye.z].every(Number.isFinite)
      && [command.wanted, command.acquire, command.throwPressed].every(value => typeof value === 'boolean');
    if (!valid) {
      release(command ? 'invalid' : 'idle'); acquireDown = false; throwDown = false; return;
    }
    const acquireEdge = command.acquire && !acquireDown;
    const throwEdge = command.throwPressed && !throwDown;
    acquireDown = command.acquire;
    throwDown = command.throwPressed;
    const direction = { x: -Math.sin(command.yaw) * Math.cos(command.pitch), y: Math.sin(command.pitch), z: -Math.cos(command.yaw) * Math.cos(command.pitch) };
    state.impulse = 0; state.torqueImpulse = 0; state.candidateId = null;
    const pick = world.castRay(new RAPIER.Ray(eye, direction), GRIP_LIMITS.range, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, player);
    const candidate = pick?.collider.parent();
    const entry = candidate && [...bodies].find(([, body]) => body.handle === candidate.handle);
    if (entry && candidate?.isDynamic() && candidate.mass() > 0 && candidate.mass() <= GRIP_LIMITS.mass) state.candidateId = entry[0];
    if (!command.wanted) release('idle');
    if (!held && command.wanted && acquireEdge && entry && state.candidateId) {
      const body = entry[1];
      const collider = body.collider(0);
      // Current authored props have one centered collider. Bounding radius is
      // used only to keep the eye outside a held object, never as a sweep shape.
      const bounds = collider.shape;
      let radius = 0;
      if (bounds instanceof RAPIER.Cuboid) radius = length(bounds.halfExtents);
      else if (bounds instanceof RAPIER.Ball) radius = bounds.radius;
      else if (bounds instanceof RAPIER.Cylinder) radius = Math.hypot(bounds.radius, bounds.halfHeight);
      else { release('blocked'); return; }
      held = { id: entry[0], body, rotation: { ...body.rotation() }, radius };
      state.distance = clamp(length(sub(body.translation(), eye)), Math.max(GRIP_LIMITS.minDistance, radius + 0.4), GRIP_LIMITS.maxDistance);
    }
    if (!held) { if (state.status === 'idle' && state.candidateId) state.status = 'ready'; return; }
    const { body, radius } = held;
    const position = body.translation();
    const mass = body.mass();
    const fromEye = sub(position, eye);
    const eyeDistance = length(fromEye);
    if (eyeDistance > GRIP_LIMITS.breakRange || eyeDistance < radius + 0.35 ||
        ![...Object.values(position), ...Object.values(body.linvel()), ...Object.values(body.angvel())].every(Number.isFinite) ||
        length(body.linvel()) > GRIP_LIMITS.speed || length(body.angvel()) > GRIP_LIMITS.angularSpeed) { release(); return; }
    const sight = world.castRay(new RAPIER.Ray(eye, scale(fromEye, 1 / eyeDistance)), eyeDistance, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, body.collider(0), player);
    if (sight) { release('blocked'); return; }
    state.distance = clamp(state.distance + clamp(command.distanceDelta, -0.5, 0.5), Math.max(GRIP_LIMITS.minDistance, radius + 0.4), GRIP_LIMITS.maxDistance);
    let target = add(eye, scale(direction, state.distance));
    const displacement = sub(target, position);
    if (length(displacement) > GRIP_LIMITS.maxError) { release(); return; }
    // Real collider shape and current rotation, translational sweep only.
    // stopAtPenetration=false permits moving upward from resting floor contact.
    const sweep = world.castShape(position, body.rotation(), displacement, body.collider(0).shape,
      0.015, 1, false, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, body.collider(0), player);
    if (sweep) target = add(position, scale(displacement, Math.max(0, sweep.time_of_impact - 0.02)));
    if (throwEdge) {
      body.applyImpulse(scale(direction, Math.min(mass * GRIP_LIMITS.throwSpeed, GRIP_LIMITS.throwImpulse)), true);
      release('thrown'); return;
    }
    const acceleration = cap(add(pd(sub(target, position), body.linvel(), 90, 19), { x: 0, y: 9.81, z: 0 }), GRIP_LIMITS.acceleration);
    const impulse = cap(scale(acceleration, mass * dt), GRIP_LIMITS.force * dt);
    const yawRotation = axisRotation({ x: 0, y: 1, z: 0 }, clamp(command.rotateYaw, -0.12, 0.12));
    const pitchRotation = axisRotation({ x: Math.cos(command.yaw), y: 0, z: -Math.sin(command.yaw) }, clamp(command.rotatePitch, -0.12, 0.12));
    held.rotation = multiply(pitchRotation, multiply(yawRotation, held.rotation));
    const qLength = Math.hypot(held.rotation.x, held.rotation.y, held.rotation.z, held.rotation.w);
    held.rotation = { x: held.rotation.x/qLength, y: held.rotation.y/qLength, z: held.rotation.z/qLength, w: held.rotation.w/qLength };
    const angularAcceleration = cap(pd(angularError(held.rotation, body.rotation()), body.angvel(), 60, 15), 25);
    const inertia = body.effectiveAngularInertia();
    const angularImpulse = cap(scale({
      x: inertia.m11 * angularAcceleration.x + inertia.m12 * angularAcceleration.y + inertia.m13 * angularAcceleration.z,
      y: inertia.m21 * angularAcceleration.x + inertia.m22 * angularAcceleration.y + inertia.m23 * angularAcceleration.z,
      z: inertia.m31 * angularAcceleration.x + inertia.m32 * angularAcceleration.y + inertia.m33 * angularAcceleration.z,
    }, dt), GRIP_LIMITS.torque * dt);
    body.applyImpulse(impulse, true);
    body.applyTorqueImpulse(angularImpulse, true);
    state = { ...state, status: 'holding', heldId: held.id, mass, target: { ...target }, impulse: length(impulse), torqueImpulse: length(angularImpulse) };
  }
  return {
    step,
    release(): void { release(); acquireDown = false; throwDown = false; },
    snapshot(): GripSnapshot { return { ...state, target: state.target ? { ...state.target } : null, joints: world.impulseJoints.len() + world.multibodyJoints.len() }; },
  };
}
```

- [ ] **Step 4: Integrate controller ownership in `game/src/physics/yard.ts`.** Add imports:

```ts
import { createGrip } from './grip.ts';
import type { GripCommand, GripSnapshot } from './grip.ts';
```

Add these fields inside `BodyPose` and `YardSnapshot` respectively:

```ts
  velocity: Vec3;
  angularVelocity: Vec3;
```

```ts
  grip: GripSnapshot;
```

Immediately after `let previousEye = eyePosition();`, insert:

```ts
    const grip = createGrip(world, bodies, player);
```

Replace the step signature with `step(intent: MoveIntent, gripCommand?: GripCommand): void {`. Immediately before the existing live `world.step();` after `grounded = controller.computedGrounded();`, insert:

```ts
        grip.step(eyePosition(), gripCommand);
```

Add a sibling method before `snapshot()`:

```ts
      releaseGrip(): void { assertAlive(); grip.release(); },
```

Replace the `BodyPose` return inside `snapshot()` with:

```ts
            return { id, position: { ...body.translation() }, rotation: { ...body.rotation() },
              previousPosition: { ...old.position }, previousRotation: { ...old.rotation },
              velocity: { ...body.linvel() }, angularVelocity: { ...body.angvel() } };
```

Add `grip: grip.snapshot(),` next to the existing snapshot `player` field. Add `grip.release();` before `destroyed = true;` inside `destroy()`. Existing `counts()` shape remains unchanged to preserve M1A lifecycle assertions.

- [ ] **Step 5: Run GREEN and static checking.** Run `rtk node --test tests/grip.test.mjs`, then `rtk npm run check`. Correct actual API/type issues against the installed declarations. Expected six new tests pass alongside all 32 baseline tests. Do not weaken motion assertions to accommodate instability. Commit only after Task 2 safety additions pass and coordinator permits the owned-file commit.

## Task 2: Obstacle, plank, range and release safety

- [ ] **Step 1: Append these executable behavioral tests to `game/tests/grip.test.mjs` before any safety adjustments.**

```js
test('Grip pulls the real plank off the floor and rotates without unstable angular speed', async () => {
  await fixture([box('prop', [2.4, 0.14, 0.35], { x: 0, y: 0.08, z: 4 }, 8)], yard => {
    acquire(yard);
    for (let tick = 0; tick < 180; tick++) {
      yard.step(idle, command({ rotateYaw: tick > 90 ? 0.02 : 0 }));
      assert.equal(yard.snapshot().grip.heldId, 'prop');
      assert.ok(Math.hypot(...Object.values(pose(yard).angularVelocity)) < 8);
      assert.ok(yard.snapshot().grip.torqueImpulse <= 100 / 60 + 1e-6);
    }
    assert.ok(pose(yard).position.y > 1);
  });
});

test('Grip bounds wheel distance and can lower and place a held body', async () => {
  await fixture([prop()], yard => {
    acquire(yard);
    run(yard, 120, command({ distanceDelta: -100 }));
    assert.equal(yard.snapshot().grip.distance, 1.8);
    run(yard, 120, command({ distanceDelta: 100 }));
    assert.equal(yard.snapshot().grip.distance, 5.5);
    run(yard, 90, command({ pitch: -0.22 }));
    yard.step(idle, command({ wanted: false }));
    run(yard, 120);
    assert.ok(pose(yard).position.y < 0.35);
    assert.equal(yard.snapshot().grip.heldId, null);
  });
});

test('held body cannot be pulled through a wall and sight loss releases before force', async () => {
  await fixture([prop(), box('wall', [0.3, 3, 8], { x: 2, y: 1.5, z: 2 })], yard => {
    acquire(yard);
    run(yard, 90, command());
    for (let tick = 0; tick < 180; tick++) {
      yard.step(idle, command({ yaw: -0.7 }));
      assert.ok(pose(yard).position.x < 1.95);
    }
  });
  await fixture([prop(), box('screen', [0.3, 3, 3], { x: 1, y: 1.5, z: 5.5 })], yard => {
    acquire(yard);
    run(yard, 60, command());
    let released = false;
    for (let tick = 0; tick < 100; tick++) {
      yard.step({ ...idle, right: 1 }, command());
      if (yard.snapshot().grip.heldId === null) { released = true; break; }
    }
    assert.equal(released, true);
    assert.equal(yard.snapshot().grip.impulse, 0);
  });
});

test('release has no latent throw or automatic reacquisition and restarts begin empty', async () => {
  await fixture([prop()], yard => {
    acquire(yard);
    yard.releaseGrip();
    const previous = pose(yard).velocity.z;
    yard.step(idle, command({ throwPressed: true }));
    assert.equal(yard.snapshot().grip.heldId, null);
    assert.ok(Math.abs(pose(yard).velocity.z - previous) < 0.5);
    run(yard, 30, command());
    assert.equal(yard.snapshot().grip.heldId, null);
  });
  await fixture([prop()], yard => assert.equal(yard.snapshot().grip.heldId, null));
});
```

- [ ] **Step 2: Run `rtk node --test tests/grip.test.mjs`.** If these already pass, retain them as acceptance regressions; they are not evidence of a new RED. If they fail, record the failing behavior before changing the implementation. Real floor cast behavior and anisotropic inertia come from independently checked Rapier 0.20.0 APIs; do not switch back to sphere sweeps or scalar mass torque.

- [ ] **Step 3: Run `rtk npm run check`.** Expect 42 native tests when Task 1 and 2 are complete. Record exact observed counts if test subdivision changes. The endpoint shape sweep does not prove continuous rotational swept clearance; bounded torque and Rapier contacts enforce physical rotation. Center-to-eye visibility is deliberately conservative, including when only one end of the plank is visible.

## Task 3: Input edge buffer and session toggle

- [ ] **Step 1: Create `game/tests/gripInput.test.mjs`.**

```js
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
const url = new URL('../src/input/gripInput.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};
function setup() { assert.equal(typeof api.createGripInput, 'function'); const input = api.createGripInput(); input.setActive(true); return input; }

test('hold input acquires once, throws once and releases on button up', () => {
  const input = setup();
  input.button(2, true);
  assert.equal(input.sample(0, 0).acquire, true);
  assert.equal(input.sample(0, 0).acquire, false);
  input.button(0, true);
  assert.equal(input.sample(0, 0).throwPressed, true);
  assert.equal(input.sample(0, 0).throwPressed, false);
  input.button(2, false);
  assert.equal(input.sample(0, 0).wanted, false);
});
test('toggle is session state and input loss clears all pending actions', () => {
  const input = setup();
  input.setToggle(true);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).wanted, true);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).wanted, false);
  input.button(2, true); input.button(0, true); input.wheel(100); input.rotate(true); input.motion(20, 40);
  input.setActive(false); input.button(2, true);
  input.setActive(true);
  assert.deepEqual(input.sample(0, 0), { wanted: false, acquire: false, throwPressed: false, yaw: 0, pitch: 0, distanceDelta: 0, rotateYaw: 0, rotatePitch: 0 });
});
test('rotation consumes mouse motion without camera motion and wheel is bounded', () => {
  const input = setup();
  assert.equal(input.motion(40, 20), false);
  input.button(2, true); input.rotate(true);
  assert.equal(input.motion(40, 20), true);
  input.wheel(-10000);
  const sample = input.sample(1, 0.2);
  assert.equal(sample.yaw, 1); assert.equal(sample.pitch, 0.2);
  assert.equal(sample.rotateYaw, -0.12); assert.equal(sample.rotatePitch, -0.08);
  assert.equal(sample.distanceDelta, -0.5);
  assert.equal(input.sample(1, 0.2).rotateYaw, 0);
  input.setActive(false);
  assert.equal(input.motion(100, 100), false);
});
```

- [ ] **Step 2: Observe RED with `rtk node --test tests/gripInput.test.mjs`.** Expected assertion: `createGripInput` must be a function.

- [ ] **Step 3: Add `game/src/input/gripInput.ts`.**

```ts
import type { GripCommand } from '../physics/grip.ts';
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
export function createGripInput() {
  let active = false, toggle = false, wanted = false, rotating = false;
  let acquire = false, throwPressed = false, distanceDelta = 0, rotateYaw = 0, rotatePitch = 0;
  const buttons = new Set<number>();
  function clear(): void {
    wanted = false; rotating = false; acquire = false; throwPressed = false;
    distanceDelta = 0; rotateYaw = 0; rotatePitch = 0; buttons.clear();
  }
  return {
    setActive(value: boolean): void { active = value; if (!active) clear(); },
    setToggle(value: boolean): void { toggle = value; clear(); },
    button(button: number, down: boolean): void {
      if (!down) { buttons.delete(button); if (button === 2 && !toggle) wanted = false; return; }
      if (!active || buttons.has(button)) return;
      buttons.add(button);
      if (button === 2) { wanted = toggle ? !wanted : true; acquire ||= wanted; }
      if (button === 0 && wanted) throwPressed = true;
    },
    rotate(value: boolean): void { rotating = active && value; },
    motion(x: number, y: number): boolean {
      if (!active || !wanted || !rotating) return false;
      if (!Number.isFinite(x) || !Number.isFinite(y)) { clear(); return true; }
      rotateYaw = clamp(rotateYaw - x * 0.004, 0.12);
      rotatePitch = clamp(rotatePitch - y * 0.004, 0.12);
      return true;
    },
    wheel(delta: number): void { if (active && wanted && Number.isFinite(delta)) distanceDelta = clamp(distanceDelta + delta * 0.002, 0.5); },
    sample(yaw: number, pitch: number): GripCommand {
      const result = { wanted: active && wanted, acquire, throwPressed, yaw, pitch, distanceDelta, rotateYaw, rotatePitch };
      acquire = false; throwPressed = false; distanceDelta = 0; rotateYaw = 0; rotatePitch = 0;
      return result;
    },
  };
}
```

- [ ] **Step 4: Run `rtk node --test tests/gripInput.test.mjs`.** Expected 3/3 pass.

- [ ] **Step 5: Integrate in `game/src/input/browserInput.ts`.** Add `import { createGripInput } from './gripInput.ts';`, create `const grip = createGripInput();` beside `actions`. Add the following branches before `MOVEMENT_KEYS` lookup in the event handlers:

```ts
    // keydown, after pause-key handling
    if (event.code === 'KeyR') { event.preventDefault(); grip.rotate(true); return; }
```

```ts
  // replace the one-line keyup handler
  document.addEventListener('keyup', (event) => {
    if (event.code === 'KeyR') grip.rotate(false);
    releaseCode(event.code);
  }, { signal: controller.signal });
```

Add `if (grip.motion(event.movementX, event.movementY)) return;` after the active guard in `mousemove`. Add these listeners:

```ts
  document.addEventListener('mousedown', (event) => {
    if (!active || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault(); grip.button(event.button, true);
  }, { signal: controller.signal });
  document.addEventListener('mouseup', (event) => grip.button(event.button, false), { signal: controller.signal });
  document.addEventListener('contextmenu', (event) => { if (active) event.preventDefault(); }, { signal: controller.signal });
  document.addEventListener('wheel', (event) => {
    if (!active) return;
    event.preventDefault(); grip.wheel(event.deltaY);
  }, { signal: controller.signal, passive: false });
```

Add `grip.setActive(next);` inside `setActive` beside `actions.setActive(next);`, and `grip.setActive(false);` inside `dispose`. Replace the returned object with:

```ts
  return { setActive, sample, look, resetLook, dispose,
    sampleGrip: () => grip.sample(yaw, pitch), setGripToggle: grip.setToggle };
```

DOM integration stays pending GREEN until the real browser test in Task 5 is added and run; pure input GREEN alone does not prove pointer-lock lifecycle behavior.

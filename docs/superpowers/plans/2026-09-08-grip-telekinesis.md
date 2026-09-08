# Grip Telekinesis Implementation Plan

**Status:** Complete PC browser Grip slice. Strict TypeScript, 57 native tests, final nine-case browser suite, production build and visual inspection passed. Independent final spec review passed and quality review approved without actionable findings. This plan accompanies the browser-stage delivery commit; core foundation is `1bb5bfe`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The coordinator owns independent spec and quality review; the assigned implementation worker executes inline without further delegation. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver M1B-1, playable physical Grip (acquire, lift/pull, rotate, place/release, throw) in the existing PC courtyard browser prototype.

**Architecture:** `physics/grip.ts` owns a bounded real-Rapier controller without Three or DOM dependencies. Yard owns its lifetime and provides detached snapshots; browser input emits fixed-step commands, and the existing renderer/HUD consumes snapshots. Right-click hold is the default, with an explicitly session-only toggle setting independent of the existing gore codec.

**Tech Stack:** TypeScript, Three 0.185.1, Rapier 0.20.0, Vite, Node native tests, Playwright; no added dependencies or assets.

---

## Ownership and verification contract

Worktree: `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`, branch `codex/vadstena-runtime-foundation`. Resumed base: `b4c6a06`. Run commands from `game/` unless specified. Every shell command starts `rtk`. Edit with `apply_patch`. Do not touch `docs/research/deep-research`, desktop source/builds/packages, Windows acceptance notes, or coordinator `team-state.md`.

Research integration: the coordinator read all ten final research documents, and the implementer read `docs/research/deep-research/2026-09-08/technical-dossier.md`. Its sections 1–2 inform fixed-step render-grouping tests, target slew, inertia-aware torque, and conservative initial budgets: 350 N, 22 m/s², 25 N·m, 40 N·s throw budget, desired throw increment 8 m/s. These are unvalidated tuning hypotheses. The retained prototype envelope remains 35 kg/6 m; mass-proportional PD assistance intentionally gives similar free response until a budget saturates, while heavy throws become slower. No subjective weight-feel claim follows from those numeric tests. COM grip is sufficient for these loose props; joined chains, pose-transfer, moving volumetric contact and skinned-arm/export spikes precede final NPC production. This slice does not complete research P03 or all of M1B; shared Focus, spells, NPCs, gore presentation and historical assets remain separate work.

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

- [x] **Step 1: Add the initial failing real-physics tests to `game/tests/grip.test.mjs`.**

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

test('Grip hover metadata follows aim and clears on input loss, invalid input and explicit release', async () => {
  await fixture([prop()], yard => {
    const hover = () => yard.step(idle, command({ ...aim(yard), wanted: false }));
    hover();
    assert.equal(yard.snapshot().grip.status, 'ready');
    assert.equal(yard.snapshot().grip.candidateId, 'prop');
    yard.step(idle, command({ yaw: Math.PI }));
    assert.equal(yard.snapshot().grip.status, 'idle');
    assert.equal(yard.snapshot().grip.candidateId, null);
    for (const clear of [() => yard.step(idle), () => yard.step(idle, command({ yaw: NaN })), () => yard.releaseGrip()]) {
      hover();
      assert.equal(yard.snapshot().grip.candidateId, 'prop');
      clear();
      assert.equal(yard.snapshot().grip.candidateId, null);
    }
    acquire(yard);
    yard.step(idle, command({ ...aim(yard), wanted: false }));
    assert.equal(yard.snapshot().grip.heldId, null);
    assert.equal(yard.snapshot().grip.status, 'ready');
    assert.equal(yard.snapshot().grip.candidateId, 'prop', 'button-up retains the current valid hover');
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
      assert.ok(yard.snapshot().grip.impulse <= 350 / 60 + 1e-6);
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
    assert.ok(speed < -4.5);
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

- [x] **Step 2: Observe RED.** Run `rtk node --test tests/grip.test.mjs`. Expected behavioral assertion: aimed body must acquire (`undefined !== 'prop'`); fixed-wall/mass test expects `null` but no Grip snapshot exists. Missing `releaseGrip` must not be the only observed failure.

- [x] **Step 3: Add `game/src/physics/grip.ts` with the following complete controller.**

```ts
import RAPIER from '@dimforge/rapier3d-compat';
import type { Rotation, Vec3 } from '../content/yardLayout.ts';
import { FIXED_DT as dt } from '../runtime/fixedStep.ts';

export type GripCommand = {
  // One fixed-tick sample: wanted is a level; acquire and throwPressed are
  // consumed event pulses. Adjacent true samples can represent distinct clicks.
  wanted: boolean; acquire: boolean; throwPressed: boolean;
  yaw: number; pitch: number; distanceDelta: number;
  rotateYaw: number; rotatePitch: number;
};
export type GripSnapshot = {
  status: 'idle' | 'ready' | 'holding' | 'blocked' | 'released' | 'thrown' | 'invalid';
  candidateId: string | null; heldId: string | null; mass: number | null;
  distance: number; target: Vec3 | null; impulse: number; torqueImpulse: number;
  joints: number; contacts: number;
  reason: 'none' | 'input' | 'range' | 'eye-overlap' | 'speed' | 'sight' | 'error' | 'released';
};
export const GRIP_LIMITS = Object.freeze({ range: 6, breakRange: 7.5, mass: 35,
  minDistance: 1.8, maxDistance: 5.5, maxError: 3, force: 350,
  acceleration: 22, torque: 25, speed: 12, angularSpeed: 8, throwSpeed: 8, throwImpulse: 40,
  targetSpeed: 6, targetAcceleration: 40 });
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
  let held: { id: string; body: RAPIER.RigidBody; rotation: Rotation; radius: number; target: Vec3; targetVelocity: Vec3 } | null = null;
  let state: GripSnapshot = { status: 'idle', candidateId: null, heldId: null, mass: null,
    distance: 3, target: null, impulse: 0, torqueImpulse: 0, joints: 0, contacts: 0, reason: 'none' };
  const release = (status: GripSnapshot['status'] = 'released', reason: GripSnapshot['reason'] = 'released', keepHover = false) => {
    held = null;
    state = { ...state, status, reason, candidateId: keepHover ? state.candidateId : null,
      heldId: null, mass: null, target: null, impulse: 0, torqueImpulse: 0, contacts: 0 };
  };
  function step(eye: Vec3, command?: GripCommand): void {
    const valid = command && [command.yaw, command.pitch, command.distanceDelta, command.rotateYaw, command.rotatePitch, eye.x, eye.y, eye.z].every(Number.isFinite)
      && [command.wanted, command.acquire, command.throwPressed].every(value => typeof value === 'boolean');
    if (!valid) {
      release(command ? 'invalid' : 'idle', command ? 'input' : 'released'); return;
    }
    const direction = { x: -Math.sin(command.yaw) * Math.cos(command.pitch), y: Math.sin(command.pitch), z: -Math.cos(command.yaw) * Math.cos(command.pitch) };
    state.impulse = 0; state.torqueImpulse = 0; state.candidateId = null;
    const pick = world.castRay(new RAPIER.Ray(eye, direction), GRIP_LIMITS.range, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, player);
    const candidate = pick?.collider.parent();
    const entry = candidate && [...bodies].find(([, body]) => body.handle === candidate.handle);
    if (entry && candidate?.isDynamic() && candidate.mass() > 0 && candidate.mass() <= GRIP_LIMITS.mass) state.candidateId = entry[0];
    if (!command.wanted) release('idle', 'released', true);
    if (!held && command.wanted && command.acquire && entry && state.candidateId) {
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
      held = { id: entry[0], body, rotation: { ...body.rotation() }, radius,
        target: { ...body.translation() }, targetVelocity: { x: 0, y: 0, z: 0 } };
      state.distance = clamp(length(sub(body.translation(), eye)), Math.max(GRIP_LIMITS.minDistance, radius + 0.4), GRIP_LIMITS.maxDistance);
    }
    if (!held) {
      if (state.status === 'idle' || state.status === 'ready') state.status = state.candidateId ? 'ready' : 'idle';
      return;
    }
    const { body, radius } = held;
    const position = body.translation();
    const mass = body.mass();
    const fromEye = sub(position, eye);
    const eyeDistance = length(fromEye);
    if (eyeDistance > GRIP_LIMITS.breakRange) { release('released', 'range'); return; }
    if (eyeDistance < radius + 0.35) { release('released', 'eye-overlap'); return; }
    if (![...Object.values(position), ...Object.values(body.linvel()), ...Object.values(body.angvel())].every(Number.isFinite) ||
        length(body.linvel()) > GRIP_LIMITS.speed || length(body.angvel()) > GRIP_LIMITS.angularSpeed) { release('released', 'speed'); return; }
    const sight = world.castRay(new RAPIER.Ray(eye, scale(fromEye, 1 / eyeDistance)), eyeDistance, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, body.collider(0), player);
    if (sight) { release('blocked', 'sight'); return; }
    state.distance = clamp(state.distance + clamp(command.distanceDelta, -0.5, 0.5), Math.max(GRIP_LIMITS.minDistance, radius + 0.4), GRIP_LIMITS.maxDistance);
    const requestedTarget = add(eye, scale(direction, state.distance));
    // Look changes are checked at the current body's range. Wheel expansion
    // goes through the target slew instead of turning into a large aim jump.
    const aimAtCurrentRange = add(eye, scale(direction, Math.min(state.distance, eyeDistance)));
    if (length(sub(aimAtCurrentRange, position)) > GRIP_LIMITS.maxError ||
        length(sub(held.target, position)) > GRIP_LIMITS.maxError) { release('released', 'error'); return; }
    const targetError = sub(requestedTarget, held.target);
    const desiredTargetVelocity = cap(scale(targetError, 1 / dt), GRIP_LIMITS.targetSpeed);
    held.targetVelocity = add(held.targetVelocity, cap(sub(desiredTargetVelocity, held.targetVelocity), GRIP_LIMITS.targetAcceleration * dt));
    const targetAdvance = cap(scale(held.targetVelocity, dt), length(targetError));
    let target = add(held.target, targetAdvance);
    const displacement = sub(target, position);
    // Real collider shape and current rotation, translational sweep only.
    // stopAtPenetration=false permits moving upward from resting floor contact.
    const sweep = world.castShape(position, body.rotation(), displacement, body.collider(0).shape,
      0.015, 1, false, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, body.collider(0), player);
    if (sweep) {
      target = add(position, scale(displacement, Math.max(0, sweep.time_of_impact - 0.02)));
      held.targetVelocity = { x: 0, y: 0, z: 0 };
    }
    held.target = { ...target };
    if (command.throwPressed) {
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
    state = { ...state, status: 'holding', reason: 'none', heldId: held.id, mass, target: { ...target }, impulse: length(impulse), torqueImpulse: length(angularImpulse) };
  }
  return {
    step,
    release(): void { release(); },
    snapshot(): GripSnapshot {
      let contacts = 0;
      if (held) {
        const collider = held.body.collider(0);
        world.contactPairsWith(collider, other => world.contactPair(collider, other, manifold => {
          for (let index = 0; index < manifold.numSolverContacts(); index++) {
            if (manifold.solverContactDist(index) <= 0.002) contacts++;
          }
        }));
      }
      return { ...state, target: state.target ? { ...state.target } : null, contacts,
        joints: world.impulseJoints.len() + world.multibodyJoints.len() };
    },
  };
}
```

- [x] **Step 4: Integrate controller ownership in `game/src/physics/yard.ts`.** Add imports:

```ts
import { createGrip } from './grip.ts';
import type { GripCommand, GripSnapshot } from './grip.ts';
```

Add these fields inside `BodyPose` and `YardSnapshot` respectively:

```ts
  velocity: Vec3;
  angularVelocity: Vec3;
  sleeping: boolean;
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
              velocity: { ...body.linvel() }, angularVelocity: { ...body.angvel() }, sleeping: body.isSleeping() };
```

Add `grip: grip.snapshot(),` next to the existing snapshot `player` field. Add `grip.release();` before `destroyed = true;` inside `destroy()`. Existing `counts()` shape remains unchanged to preserve M1A lifecycle assertions.

- [x] **Step 5: Run GREEN and static checking.** Run `rtk node --test tests/grip.test.mjs`, then `rtk npm run check`. Correct actual API/type issues against the installed declarations. Expected six new tests pass alongside all 32 baseline tests. Do not weaken motion assertions to accommodate instability. Commit only after Task 2 safety additions pass and coordinator permits the owned-file commit.

## Task 2: Obstacle, plank, range and release safety

- [x] **Step 1: Append these executable behavioral tests to `game/tests/grip.test.mjs` before any safety adjustments.**

```js
test('Grip pulls the real plank off the floor and rotates without unstable angular speed', async () => {
  await fixture([box('prop', [2.4, 0.14, 0.35], { x: 0, y: 0.08, z: 4 }, 8)], yard => {
    acquire(yard);
    for (let tick = 0; tick < 180; tick++) {
      yard.step(idle, command({ rotateYaw: tick > 90 ? 0.02 : 0 }));
      assert.equal(yard.snapshot().grip.heldId, 'prop');
      assert.ok(Math.hypot(...Object.values(pose(yard).angularVelocity)) < 8);
      assert.ok(yard.snapshot().grip.torqueImpulse <= 25 / 60 + 1e-6);
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
    assert.equal(yard.snapshot().grip.reason, 'sight');
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

- [x] **Step 2: Append the research and review safety fixtures below before running the new tests.**

```js
test('a sleeping settled barrel lifts with its real cylinder collider', async () => {
  await fixture([{ id: 'prop', shape: { kind: 'cylinder', radius: 0.36, height: 0.9 }, position: { x: 0, y: 0.46, z: 4 }, mass: 18, color: '#777777' }], yard => {
    run(yard, 300);
    assert.equal(pose(yard).sleeping, true, 'barrel fixture must actually be sleeping');
    acquire(yard);
    run(yard, 180, command());
    assert.equal(yard.snapshot().grip.heldId, 'prop');
    assert.ok(pose(yard).position.y > 1.1);
  });
});
test('0.5, 2, 10 and 15 kg props obey force budgets and heavier throws saturate', async () => {
  const increments = [];
  for (const mass of [0.5, 2, 10, 15]) await fixture([prop('prop', mass)], yard => {
    acquire(yard);
    run(yard, 180, command());
    assert.equal(yard.snapshot().grip.heldId, 'prop');
    assert.ok(yard.snapshot().grip.impulse <= 350 / 60 + 1e-6);
    const before = pose(yard).velocity.z;
    yard.step(idle, command({ throwPressed: true }));
    const increment = before - pose(yard).velocity.z;
    increments.push(increment);
    assert.ok(Math.abs(increment - Math.min(8, 40 / mass)) < 0.05, `mass=${mass}, increment=${increment}`);
  });
  assert.ok(increments[2] < increments[1]);
  assert.ok(increments[3] < increments[2]);
});
test('a held plank actually contacts wall and corner during torque rotation without tunnelling', async (t) => {
  const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
  const { createGrip } = await import('../src/physics/grip.ts');
  await RAPIER.init();
  for (const corner of [false, true]) {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    try {
      world.timestep = 1 / 60;
      world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 20).setTranslation(0, -0.5, 0).setFriction(0.7));
      const side = world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 1.5, 4).setTranslation(1.55, 1.5, 2));
      const end = corner ? world.createCollider(RAPIER.ColliderDesc.cuboid(2.5, 1.5, 0.15).setTranslation(0, 1.5, 2.6)) : null;
      const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.86, 8));
      world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.3), player);
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true).setTranslation(0, 0.08, 4));
      const plank = world.createCollider(RAPIER.ColliderDesc.cuboid(1.2, 0.07, 0.175).setMass(8).setFriction(0.7), body);
      for (let tick = 0; tick < 60; tick++) world.step();
      const grip = createGrip(world, new Map([['prop', body]]), player);
      const eye = { x: 0, y: 1.61, z: 8 };
      const step = input => { grip.step(eye, input); world.step(); };
      step(command({ acquire: true, pitch: Math.atan2(body.translation().y - eye.y, eye.z - body.translation().z) }));
      assert.equal(grip.snapshot().heldId, 'prop');
      for (let tick = 0; tick < 180; tick++) step(command());
      let sideContacts = 0, endContacts = 0, maximumPenetration = 0;
      function contactsWith(obstacle) {
        let count = 0;
        if (obstacle) world.contactPair(plank, obstacle, manifold => {
          for (let index = 0; index < manifold.numSolverContacts(); index++) {
            const distance = manifold.solverContactDist(index);
            if (distance <= 0.002) count++;
            maximumPenetration = Math.max(maximumPenetration, -distance);
          }
        });
        return Number(count > 0);
      }
      for (let tick = 0; tick < 240; tick++) {
        step(command({ yaw: -Math.min(0.18, tick * 0.003), rotateYaw: 0.012 }));
        assert.equal(grip.snapshot().heldId, 'prop', `must exercise contacts while held, tick=${tick}`);
        sideContacts += contactsWith(side); endContacts += contactsWith(end);
        assert.ok(Math.hypot(...Object.values(body.linvel())) < 12);
      }
      assert.ok(sideContacts > 5, `actual side-wall contact ticks: ${sideContacts}`);
      if (corner) assert.ok(endContacts > 5, `actual end-wall contact ticks: ${endContacts}`);
      assert.ok(maximumPenetration < 0.025, `maximum solver contact penetration ${maximumPenetration}`);
      t.diagnostic(JSON.stringify({ corner, sideContacts, endContacts, maximumPenetration }));
    } finally { world.free(); }
  }
});
test('range and sight guards release before applying an impulse', async () => {
  const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
  const { createGrip } = await import('../src/physics/grip.ts');
  await RAPIER.init();
  for (const blocked of [false, true]) {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    try {
      const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.5, 8));
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.5, 4));
      world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.3, 0.3).setMass(2), body);
      if (blocked) world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 2, 1).setTranslation(1.5, 1.5, 6));
      world.step();
      const grip = createGrip(world, new Map([['prop', body]]), player);
      grip.step({ x: 0, y: 1.5, z: 8 }, command({ acquire: true }));
      assert.equal(grip.snapshot().heldId, 'prop');
      const velocity = { ...body.linvel() };
      grip.step(blocked ? { x: 3, y: 1.5, z: 8 } : { x: 0, y: 1.5, z: 12 }, command());
      assert.equal(grip.snapshot().heldId, null);
      assert.equal(grip.snapshot().reason, blocked ? 'sight' : 'range');
      assert.equal(grip.snapshot().impulse, 0);
      assert.equal(grip.snapshot().torqueImpulse, 0);
      assert.deepEqual({ ...body.linvel() }, velocity);
    } finally { world.free(); }
  }
});
test('identical fixed-step commands produce identical Grip outcomes at 30, 60 and 144 Hz render grouping', async () => {
  const { createFixedStepper } = await import('../src/runtime/fixedStep.ts');
  const outcomes = [];
  for (const hz of [30, 60, 144]) await fixture([prop()], yard => {
    const advance = createFixedStepper();
    const initialAim = aim(yard);
    let ticks = 0;
    for (let frame = 0; ticks < 240 && frame < 2000; frame++) advance(1 / hz, true, () => {
      if (ticks >= 240) return;
      const input = ticks === 0 ? command({ ...initialAim, acquire: true }) : command({
        rotateYaw: ticks >= 100 && ticks < 140 ? 0.01 : 0,
        throwPressed: ticks === 180,
      });
      yard.step(idle, input); ticks++;
      if (ticks === 1) assert.equal(yard.snapshot().grip?.heldId, 'prop');
      if (ticks === 181) assert.equal(yard.snapshot().grip.status, 'thrown');
    });
    assert.equal(ticks, 240);
    outcomes.push({ body: pose(yard), grip: yard.snapshot().grip });
  });
  assert.deepEqual(outcomes[1], outcomes[0]);
  assert.deepEqual(outcomes[2], outcomes[0]);
});

test('the 35 kg envelope lifts slowly while force saturation stays bounded', async () => {
  await fixture([prop('prop', 35)], yard => {
    acquire(yard);
    const start = pose(yard).position.y;
    let saturated = 0;
    for (let tick = 0; tick < 1200; tick++) {
      yard.step(idle, command());
      assert.equal(yard.snapshot().grip.heldId, 'prop');
      assert.ok(yard.snapshot().grip.impulse <= 350 / 60 + 1e-6);
      saturated += Number(yard.snapshot().grip.impulse > 349 / 60);
    }
    assert.ok(pose(yard).position.y > start + 0.8);
    assert.ok(saturated > 30, `expected force budget saturation, got ${saturated}`);
  });
});
test('the authored stone collider lifts and bounded aim reversals do not accumulate energy', async () => {
  await fixture([{ id: 'prop', shape: { kind: 'ball', radius: 0.3 }, position: { x: 0, y: 0.31, z: 4 }, mass: 6, color: '#777777' }], yard => {
    acquire(yard);
    run(yard, 180, command());
    for (let tick = 0; tick < 360; tick++) {
      yard.step(idle, command({ yaw: tick % 12 < 6 ? 0.2 : -0.2 }));
      assert.equal(yard.snapshot().grip.heldId, 'prop');
      assert.ok(Math.hypot(...Object.values(pose(yard).velocity)) < 6);
    }
    const released = pose(yard);
    yard.releaseGrip();
    run(yard, 120);
    const landed = pose(yard);
    const kineticBound = Math.hypot(...Object.values(released.velocity)) ** 2 + 2 * 9.81 * released.position.y;
    assert.ok(Math.hypot(...Object.values(landed.velocity)) ** 2 <= kineticBound + 0.1, 'release must not inject energy; a sphere may retain rolling momentum');
  });
});
test('held prop collides with a step while lowering and walking never drags it through the player', async () => {
  await fixture([prop(), box('step', [2, 0.6, 2], { x: 0, y: 0.3, z: 2.3 })], yard => {
    acquire(yard); run(yard, 180, command());
    let contacts = 0;
    for (let tick = 0; tick < 180; tick++) {
      yard.step(idle, command({ pitch: -0.22, distanceDelta: 0.02, rotatePitch: 0.012 }));
      assert.equal(yard.snapshot().grip.heldId, 'prop');
      contacts += Number(yard.snapshot().grip.contacts > 0);
      assert.ok(pose(yard).position.y > 0.55);
    }
    assert.ok(contacts > 5);
    for (let tick = 0; tick < 120; tick++) {
      yard.step({ ...idle, forward: 1 }, command({ distanceDelta: -0.1 }));
      const state = yard.snapshot();
      const point = pose(yard).position;
      assert.ok(Math.hypot(point.x - state.player.position.x, point.z - state.player.position.z) > 0.5);
    }
  });
});
```

- [x] **Step 3: Run `rtk node --test tests/grip.test.mjs`.** If these already pass, retain them as acceptance regressions; they are not evidence of a new RED. If they fail, record the failing behavior before changing the implementation. Real floor cast behavior and anisotropic inertia come from independently checked Rapier 0.20.0 APIs; do not switch back to sphere sweeps or scalar mass torque. Adjust a physically misplaced fixture only when its geometry demonstrably misses the named condition, and preserve the assertion that contact occurs while still held. Do not pass an obstruction test by letting an unrelated early release bypass contact.

- [x] **Step 4: Run `rtk npm run check`.** Expect 51 native tests when Task 1 and 2 are complete. Record exact observed counts if test subdivision changes. The endpoint shape sweep does not prove continuous rotational swept clearance; bounded torque and Rapier contacts enforce physical rotation. Center-to-eye visibility is deliberately conservative, including when only one end of the plank is visible. Render-grouping equality is a same-runtime check, not cross-platform bit-identical replay.

## Task 3: Input edge buffer and session toggle

- [x] **Step 1: Create `game/tests/gripInput.test.mjs`.**

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
  input.setHolding(true);
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
  input.button(2, true); input.sample(0, 0); input.setHolding(true); input.rotate(true);
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
test('failed pickup leaves camera free and a thrown toggle grip can acquire on the next click', () => {
  const input = setup();
  input.setToggle(true);
  input.button(2, true); input.button(2, false);
  input.setHolding(false); // Feedback before sampling must preserve the pending acquire.
  assert.equal(input.sample(0, 0).acquire, true);
  input.setHolding(false); input.rotate(true);
  assert.equal(input.motion(20, 0), false);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).acquire, true);
  input.setHolding(true);
  input.button(0, true); input.button(0, false);
  assert.equal(input.sample(0, 0).throwPressed, true);
  input.setHolding(false);
  input.button(2, true); input.button(2, false);
  assert.equal(input.sample(0, 0).acquire, true);
});

test('primary pressed before a confirmed acquisition does not queue a delayed throw', () => {
  const input = setup();
  input.button(2, true);
  input.button(0, true);
  const acquisition = input.sample(0, 0);
  assert.equal(acquisition.acquire, true);
  assert.equal(acquisition.throwPressed, false);
  input.setHolding(true);
  assert.equal(input.sample(0, 0).throwPressed, false);
  input.button(0, false); input.button(0, true);
  assert.equal(input.sample(0, 0).throwPressed, true);
});

test('distinct consecutive-tick clicks can acquire after a failed pickup in hold and toggle modes', async () => {
  const { createYard } = await import('../src/physics/yard.ts');
  const idle = { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false };
  for (const toggle of [false, true]) {
    const yard = await createYard({ layout: [
      { id: 'floor', shape: { kind: 'box', size: [20, 1, 20] }, position: { x: 0, y: -0.5, z: 0 }, color: '#777777' },
      { id: 'prop', shape: { kind: 'box', size: [0.6, 0.6, 0.6] }, position: { x: 0, y: 0.31, z: 4 }, mass: 2, color: '#777777' },
    ] });
    try {
      for (let tick = 0; tick < 60; tick++) yard.step(idle);
      const input = setup(); input.setToggle(toggle);
      input.button(2, true);
      const missed = input.sample(Math.PI, 0);
      assert.equal(missed.acquire, true);
      yard.step(idle, missed);
      assert.equal(yard.snapshot().grip.heldId, null);
      input.setHolding(false);
      input.button(2, false); input.button(2, true);
      const state = yard.snapshot();
      const prop = state.bodies.find(body => body.id === 'prop').position;
      const pitch = Math.atan2(prop.y - state.player.eye.y, state.player.eye.z - prop.z);
      const nextClick = input.sample(0, pitch);
      assert.equal(nextClick.acquire, true, 'next command represents a distinct physical click');
      yard.step(idle, nextClick);
      assert.equal(yard.snapshot().grip.heldId, 'prop', `consecutive click must acquire in ${toggle ? 'toggle' : 'hold'} mode`);
      input.setHolding(true);
      const held = input.sample(0, pitch);
      assert.equal(held.acquire, false, 'continued button holding emits no acquisition pulse');
      yard.step(idle, held);
      assert.equal(yard.snapshot().grip.heldId, 'prop');
    } finally { yard.destroy(); }
  }
});
```

- [x] **Step 2: Observe RED with `rtk node --test tests/gripInput.test.mjs`.** Expected assertion: `createGripInput` must be a function.

- [x] **Step 3: Add `game/src/input/gripInput.ts`.**

```ts
import type { GripCommand } from '../physics/grip.ts';
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
export function createGripInput() {
  let active = false, toggle = false, wanted = false, rotating = false, holding = false, sampled = false;
  let acquire = false, throwPressed = false, distanceDelta = 0, rotateYaw = 0, rotatePitch = 0;
  const buttons = new Set<number>();
  function clear(): void {
    wanted = false; rotating = false; holding = false; sampled = false; acquire = false; throwPressed = false;
    distanceDelta = 0; rotateYaw = 0; rotatePitch = 0; buttons.clear();
  }
  return {
    setActive(value: boolean): void { active = value; if (!active) clear(); },
    setToggle(value: boolean): void { toggle = value; clear(); },
    setHolding(value: boolean): void {
      holding = active && value;
      if (sampled && !holding && !acquire) wanted = false;
      sampled = false;
    },
    button(button: number, down: boolean): void {
      if (!down) { buttons.delete(button); if (button === 2 && !toggle) wanted = false; return; }
      if (!active || buttons.has(button)) return;
      buttons.add(button);
      if (button === 2) { wanted = toggle ? !wanted : true; acquire ||= wanted; }
      if (button === 0 && holding) throwPressed = true;
    },
    rotate(value: boolean): void { rotating = active && value; },
    motion(x: number, y: number): boolean {
      if (!active || !holding || !rotating) return false;
      if (!Number.isFinite(x) || !Number.isFinite(y)) { clear(); return true; }
      rotateYaw = clamp(rotateYaw - x * 0.004, 0.12);
      rotatePitch = clamp(rotatePitch - y * 0.004, 0.12);
      return true;
    },
    wheel(delta: number): void { if (active && wanted && Number.isFinite(delta)) distanceDelta = clamp(distanceDelta + delta * 0.002, 0.5); },
    sample(yaw: number, pitch: number): GripCommand {
      const result = { wanted: active && wanted, acquire, throwPressed, yaw, pitch, distanceDelta, rotateYaw, rotatePitch };
      sampled = true;
      acquire = false; throwPressed = false; distanceDelta = 0; rotateYaw = 0; rotatePitch = 0;
      return result;
    },
  };
}
```

- [x] **Step 4: Run `rtk node --test tests/gripInput.test.mjs`.** Expected 5/5 pass.

- [x] **Step 5: Integrate in `game/src/input/browserInput.ts`.** Add `import { createGripInput } from './gripInput.ts';`, create `const grip = createGripInput();` beside `actions`. Add the following branches before `MOVEMENT_KEYS` lookup in the event handlers:

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
    sampleGrip: () => grip.sample(yaw, pitch), setGripToggle: grip.setToggle, setGripHolding: grip.setHolding };
```

DOM integration stays pending GREEN until the real browser test in Task 5 is added and run; pure input GREEN alone does not prove pointer-lock lifecycle behavior.

## Task 4: Real browser RED, lifecycle wiring and compact presentation

- [x] **Step 1: Append this test to `game/browser/yard.spec.mjs` before browser/main/render/HTML production changes.** It uses the existing Vite/Chromium fixture and failure observer. The only page state it reads is detached diagnostics; aiming and actions use actual Playwright mouse/keyboard events.

```js
test('physical Grip supports hold, wheel, rotation, throw, toggle recovery and pause/restart', { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  let mouseX = 0, mouseY = 0;
  async function start() {
    const bounds = await page.locator('#start').boundingBox();
    mouseX = bounds.x + bounds.width / 2; mouseY = bounds.y + bounds.height / 2;
    await page.locator('#start').click();
    await page.waitForFunction(() => window.__yard().running);
  }
  async function motion(dx, dy) {
    mouseX += dx; mouseY += dy;
    await page.mouse.move(mouseX, mouseY);
  }
  async function aimAngles(yaw, pitch) {
    const look = await page.evaluate(() => window.__yard().look);
    const yawDelta = Math.atan2(Math.sin(yaw - look.yaw), Math.cos(yaw - look.yaw));
    await motion(-yawDelta / 0.002, -(pitch - look.pitch) / 0.002);
  }
  async function aimAt(id) {
    const angles = await page.evaluate((bodyId) => {
      const state = window.__yard().snapshot;
      const point = state.bodies.find(body => body.id === bodyId).position;
      const eye = state.player.eye;
      return { yaw: Math.atan2(eye.x - point.x, eye.z - point.z),
        pitch: Math.atan2(point.y - eye.y, Math.hypot(point.x - eye.x, point.z - eye.z)) };
    }, id);
    await aimAngles(angles.yaw, angles.pitch);
  }
  async function ticks(count) {
    const before = await page.evaluate(() => window.__yard().tick);
    await page.waitForFunction(({ before, count }) => window.__yard().tick >= before + count, { before, count });
  }
  try {
    await waitForReady(page);
    const initial = await page.evaluate(() => window.__yard());
    assert.equal(initial.snapshot?.grip.heldId, null, 'detached Grip diagnostics must exist before start');
    assert.equal(initial.running, false);
    await start();
    await ticks(30);
    await aimAt('stone');
    await page.mouse.down({ button: 'right' });
    await page.waitForFunction(() => window.__yard().snapshot.grip.heldId === 'stone');
    await aimAngles(0, 0);
    await ticks(90);
    const held = await page.evaluate(() => window.__yard());
    assert.ok(held.snapshot.bodies.find(body => body.id === 'stone').position.y > 1);
    assert.equal(await page.evaluate(() => {
      const copy = window.__yard();
      copy.look.yaw = 900;
      copy.snapshot.grip.target.x = 900;
      copy.snapshot.bodies[0].position.x = 900;
      const fresh = window.__yard();
      return fresh.look.yaw !== 900 && fresh.snapshot.grip.target.x !== 900 && fresh.snapshot.bodies[0].position.x !== 900;
    }), true, 'window diagnostics must return detached state');
    await page.mouse.wheel(0, -200);
    await ticks(10);
    assert.ok(await page.evaluate(distance => window.__yard().snapshot.grip.distance < distance, held.snapshot.grip.distance));
    const beforeRotate = await page.evaluate(() => window.__yard().look);
    const oldRotation = await page.evaluate(() => window.__yard().snapshot.bodies.find(body => body.id === 'stone').rotation);
    await page.keyboard.down('KeyR');
    for (let turn = 0; turn < 6; turn++) { await motion(20, -5); await ticks(2); }
    await page.keyboard.up('KeyR');
    await ticks(30);
    assert.deepEqual(await page.evaluate(() => window.__yard().look), beforeRotate);
    const rotated = await page.evaluate(() => window.__yard().snapshot.bodies.find(body => body.id === 'stone').rotation);
    assert.ok(Math.abs(oldRotation.x * rotated.x + oldRotation.y * rotated.y + oldRotation.z * rotated.z + oldRotation.w * rotated.w) < 0.99);
    await page.screenshot({ path: join(captures, 'grip-active.png') });
    await page.mouse.click(mouseX, mouseY, { button: 'left' });
    await ticks(2);
    assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), null);
    await page.mouse.up({ button: 'right' });

    await aimAngles(0, 1.1);
    await page.mouse.click(mouseX, mouseY, { button: 'right' });
    await ticks(2);
    const failedLook = await page.evaluate(() => window.__yard().look);
    await page.keyboard.down('KeyR'); await motion(40, 0); await page.keyboard.up('KeyR');
    assert.notEqual((await page.evaluate(() => window.__yard().look)).yaw, failedLook.yaw, 'R must not freeze camera after failed pickup');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__yard().running);
    await page.locator('#controls summary').click();
    await page.locator('#grip-toggle').check();
    await page.locator('#gore').uncheck();
    await page.locator('#restart').click();
    await page.waitForFunction(() => window.__yard().restarts === 1 && !document.querySelector('#start').disabled);
    const paused = await page.evaluate(() => window.__yard());
    await page.keyboard.down('KeyR'); await page.mouse.move(1300, 100); await page.keyboard.up('KeyR');
    await page.mouse.click(1300, 100, { button: 'right' });
    assert.deepEqual((await page.evaluate(() => window.__yard())).look, paused.look);
    assert.equal(await page.locator('#gore').isChecked(), false);
    assert.equal(await page.locator('#grip-toggle').isChecked(), true);
    await start(); await ticks(30);
    assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), null, 'start click must not acquire or throw');
    await aimAt('stone');
    await page.mouse.click(mouseX, mouseY, { button: 'right' });
    await page.waitForFunction(() => window.__yard().snapshot.grip.heldId === 'stone');
    await aimAngles(0, 0); await ticks(90);
    await page.mouse.click(mouseX, mouseY, { button: 'left' }); await ticks(2);
    await aimAt('crate-a');
    await page.mouse.click(mouseX, mouseY, { button: 'right' });
    await page.waitForFunction(() => window.__yard().snapshot.grip.heldId === 'crate-a');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__yard().running);
    assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), null, 'pause releases immediately without another physics tick');
    await start(); await ticks(10);
    assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), null);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__yard().running);
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#start').disabled);
    await page.locator('#controls summary').click();
    assert.equal(await page.locator('#grip-toggle').isChecked(), false, 'Grip toggle is explicitly session-only');
    assert.equal(await page.locator('#gore').isChecked(), false, 'gore false remains independently persisted');
    assertNoFailures();
  } finally { await context.close(); }
});
```

- [x] **Step 2: Run `rtk node --test --test-name-pattern="physical Grip" browser/yard.spec.mjs`.** Expected RED at the initial detached Grip diagnostics assertion. A startup/import error is not sufficient. Record the observed assertion before integration.

- [x] **Step 3: Edit `game/src/main.ts` with these exact integration changes.** Expand the existing Yard type import and replace Diagnostics:

```ts
import type { Yard, YardSnapshot } from './physics/yard.ts';
type Diagnostics = {
  running: boolean; tick: number; restarts: number;
  position: { x: number; y: number; z: number };
  counts: { bodies: number; colliders: number };
  gpu: { geometries: number; textures: number; programs: number };
  look: { yaw: number; pitch: number };
  snapshot: YardSnapshot | null;
};
```

Add next to `goreCheckbox`:

```ts
const gripToggle = requireElement<HTMLInputElement>('#grip-toggle');
const hint = requireElement<HTMLElement>('#hint');
gripToggle.checked = false;
```

Add `yard?.releaseGrip();` immediately after `input?.setActive(false);` inside `pause()`. Replace the one-line `advance` callback inside `renderFrame`:

```ts
    const result = advance(elapsed, running, () => {
      if (!yard || !input) return;
      yard.step(input.sample(), input.sampleGrip());
      input.setGripHolding(yard.snapshot().grip.heldId !== null);
    });
```

Replace the `view.render(yard.snapshot(), ...)` call with:

```ts
    const snapshot = yard.snapshot();
    view.render(snapshot, running && !resumedNeedsStep ? result.alpha : 1, look.yaw, look.pitch);
    hint.textContent = !running ? 'GRIP / M1B-1' : snapshot.grip.heldId
      ? `${snapshot.grip.mass?.toFixed(1)} KG · ${snapshot.grip.distance.toFixed(1)} M · R ROTERA · VÄNSTERKLICK KASTA`
      : snapshot.grip.candidateId ? 'HÖGERKLICK · GRIP' : 'SIKTA PÅ ETT FYSISKT OBJEKT · HÖGERKLICK GRIP';
```

Immediately after `input = createBrowserInput(() => pause());` add:

```ts
    input.setGripToggle(gripToggle.checked);
    gripToggle.addEventListener('change', () => {
      yard?.releaseGrip();
      input?.setGripToggle(gripToggle.checked);
    }, { signal: lifecycle.signal });
```

Add fields to the object returned by the existing development-only `window.__yard` getter:

```ts
        look: input?.look() ?? { yaw: 0, pitch: 0 },
        snapshot: yard?.snapshot() ?? null,
```

Do not expose yard/controller/renderer references or a setter on the window. `replaceWorld` already pauses before replacing, resets look, and begins paused; the session toggle remains in the same input object across restarts. `dispose()` releases through `yard.destroy()`.

- [x] **Step 4: Edit `game/src/render/yardView.ts` to add one owned tether and held highlight.** After `scene.add(worldRoot);`, insert:

```ts
  const tetherGeometry = new THREE.BufferGeometry();
  const tetherPoints = new Float32Array(6);
  tetherGeometry.setAttribute('position', new THREE.BufferAttribute(tetherPoints, 3));
  const tetherMaterial = new THREE.LineBasicMaterial({ color: '#d9b66c', transparent: true, opacity: 0.8 });
  const tether = new THREE.Line(tetherGeometry, tetherMaterial);
  tether.frustumCulled = false;
  tether.visible = false;
  scene.add(tether);
```

Inside `reset()` after its disposed guard, insert `tether.visible = false;`. Inside the pose loop after `mesh.quaternion.slerpQuaternions(...)`, insert:

```ts
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.set(snapshot.grip.heldId === pose.id ? '#b9924f' : '#000000');
      material.emissiveIntensity = snapshot.grip.heldId === pose.id ? 0.28 : 0;
```

After `camera.rotation.set(...)` and before `renderer.render(...)`, insert:

```ts
    const heldMesh = snapshot.grip.heldId ? meshes.get(snapshot.grip.heldId) : undefined;
    tether.visible = heldMesh !== undefined;
    if (heldMesh) {
      tetherPoints.set([
        camera.position.x + Math.cos(yaw) * 0.25 - Math.sin(yaw) * Math.cos(pitch) * 0.4,
        camera.position.y - 0.25 + Math.sin(pitch) * 0.4,
        camera.position.z - Math.sin(yaw) * 0.25 - Math.cos(yaw) * Math.cos(pitch) * 0.4,
        heldMesh.position.x, heldMesh.position.y, heldMesh.position.z,
      ]);
      tetherGeometry.getAttribute('position').needsUpdate = true;
    }
```

In `dispose()`, immediately before `texture.dispose();`, insert:

```ts
    tetherGeometry.dispose();
    tetherMaterial.dispose();
```

The two GPU resources are allocated once per view and reused through restarts. No particle system, additional renderer, texture or asset loader is added.

- [x] **Step 5: Edit `game/index.html`.** Replace title, hint and intro with these exact elements:

```html
    <title>Vadstena · Grip M1B-1</title>
      <p id="hint">GRIP / M1B-1</p>
      <p class="intro">Lyft sten, vrid trä och känn hur gårdens föremål svarar. Ett första prov av Grip.</p>
```

Add the following rows after the existing mouse control row:

```html
            <div><dt>Höger mus</dt><dd>Håll för Grip. Släpp greppet.</dd></div>
            <div><dt>Vänster mus</dt><dd>Kasta det hållna objektet</dd></div>
            <div><dt>R + mus</dt><dd>Rotera det hållna objektet</dd></div>
            <div><dt>Mushjul</dt><dd>Ändra avståndet</dd></div>
```

Add before the gore checkbox:

```html
          <label class="check-row" for="grip-toggle"><input id="grip-toggle" type="checkbox" /><span>Växla Grip med högerklick</span></label>
          <p class="fine-print">Grip-valet gäller den här sessionen. I växelläge släpper nästa högerklick objektet. Paus släpper alltid.</p>
```

Keep the existing gore default, storage text and honest prototype/NPC/gore scope statements. Append this specific CSS rule in `game/src/style.css` to keep the single hint compact at common PC widths:

```css
#hint { max-width: min(38rem, 55vw); text-align: right; line-height: 1.6; }
```

- [x] **Step 6: Run `rtk npm run check` then the focused browser command from Step 2.** Expected 56 native tests and the new focused Grip browser test pass. Fix an actual observed failure with a narrow regression first when the existing test does not already reproduce it. If Playwright pointer-lock motion quantization changes the aim by a pixel, read the updated look and repeat bounded real mouse aim correction; do not add mutable diagnostics or replace mouse events with direct simulation calls.

## Task 5: Focus-loss, placement and warm-resource browser acceptance

- [x] **Step 1: Append these two further browser tests and the shared helper to `game/browser/yard.spec.mjs` before implementing lifecycle/render changes.** The main interaction test above covers toggle, throw, rotation and failed-pickup look; these separate cases cover held-state lifecycle and repeated warm rendering without putting all work under one timeout.

```js
async function startAndHoldStone(page) {
  const bounds = await page.locator('#start').boundingBox();
  let x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.locator('#start').click();
  await page.waitForFunction(() => window.__yard().running);
  let state = await page.evaluate(() => window.__yard());
  await page.waitForFunction(tick => window.__yard().tick > tick + 20, state.tick);
  state = await page.evaluate(() => window.__yard());
  const eye = state.snapshot.player.eye;
  const point = state.snapshot.bodies.find(body => body.id === 'stone').position;
  const yaw = Math.atan2(eye.x - point.x, eye.z - point.z);
  const pitch = Math.atan2(point.y - eye.y, Math.hypot(point.x - eye.x, point.z - eye.z));
  const difference = Math.atan2(Math.sin(yaw - state.look.yaw), Math.cos(yaw - state.look.yaw));
  x -= difference / 0.002; y -= (pitch - state.look.pitch) / 0.002;
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.waitForFunction(() => window.__yard().snapshot.grip.heldId === 'stone');
  state = await page.evaluate(() => window.__yard());
  x += state.look.yaw / 0.002; y += state.look.pitch / 0.002;
  await page.mouse.move(x, y);
  await page.waitForFunction(tick => window.__yard().tick >= tick + 75, state.tick);
  assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), 'stone');
}

test('held Grip releases on real button-up, focus loss and pointer-lock loss without latent actions', { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await waitForReady(page);
    assert.equal((await page.evaluate(() => window.__yard())).snapshot?.grip.heldId, null);
    await startAndHoldStone(page);
    const beforeRelease = await page.evaluate(() => window.__yard());
    await page.mouse.up({ button: 'right' });
    await page.waitForFunction(() => window.__yard().snapshot.grip.heldId === null);
    await page.waitForFunction(tick => window.__yard().tick > tick + 90, beforeRelease.tick);
    const afterRelease = await page.evaluate(() => window.__yard());
    assert.ok(afterRelease.snapshot.bodies.find(body => body.id === 'stone').position.y < beforeRelease.snapshot.bodies.find(body => body.id === 'stone').position.y - 0.5);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__yard().running);
    for (const boundary of ['blur', 'pointerlock']) {
      await startAndHoldStone(page);
      if (boundary === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      else await page.evaluate(() => document.exitPointerLock());
      await page.waitForFunction(() => !window.__yard().running);
      const paused = await page.evaluate(() => window.__yard());
      assert.equal(paused.snapshot.grip.heldId, null);
      await page.mouse.up({ button: 'right' });
      await page.locator('#start').click();
      await page.waitForFunction(tick => window.__yard().running && window.__yard().tick > tick + 15, paused.tick);
      assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), null);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !window.__yard().running);
    }
    assertNoFailures();
  } finally { await context.close(); }
});

test('ten acquired Grip restarts preserve warmed tether GPU and physics resources', { timeout: 180_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const assertNoFailures = observeFailures(page);
  try {
    await waitForReady(page);
    assert.equal((await page.evaluate(() => window.__yard())).snapshot?.grip.heldId, null);
    await startAndHoldStone(page);
    await waitAnimationFrames(page, 3);
    const warm = await page.evaluate(() => window.__yard());
    for (let restart = 1; restart <= 10; restart++) {
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !window.__yard().running);
      await page.mouse.up({ button: 'right' });
      await page.locator('#restart').click();
      await page.waitForFunction(count => window.__yard().restarts === count && !document.querySelector('#start').disabled, restart);
      assert.equal(await page.evaluate(() => window.__yard().snapshot.grip.heldId), null);
      await startAndHoldStone(page);
      await waitAnimationFrames(page, 3);
      const state = await page.evaluate(() => window.__yard());
      assert.deepEqual(state.counts, warm.counts);
      assert.deepEqual(state.gpu, warm.gpu);
      assert.equal(state.snapshot.grip.joints, 0);
      assert.equal(await page.locator('#viewport canvas').count(), 1);
    }
    assertNoFailures();
  } finally { await context.close(); }
});
```

- [x] **Step 2: Observe their RED with `rtk node --test --test-name-pattern="held Grip releases|ten acquired Grip" browser/yard.spec.mjs` before Task 4 production changes.** Expected assertion failure for absent snapshot diagnostics. The synthetic window blur exercises the same registered boundary as an OS focus loss; pointer-lock loss uses the browser's real `exitPointerLock()` API. No simulation state is injected.

## Task 6: Full acceptance, visual inspection and owned-file delivery

- [x] **Step 1: Run the full existing browser suite plus three new Grip cases with `rtk npm run test:browser`.** Expected nine passing browser tests, including actual BFCache restore, production diagnostics removal, movement/preferences, ten clean restarts, context loss, and pointer-lock rejection. Record actual counts and runtime. Run `rtk npm run build` after native/browser acceptance; do not run desktop builds or any executable.

- [x] **Step 2: Inspect the actual image `game/.playtest/grip-active.png` with `view_image`.** Check the held body is visibly lifted, the highlight/tether are readable, the crosshair stays clear, the hint does not overlap the brand, and the original sparse courtyard layout remains intact. If an adjustment is required, keep it within the existing highlight, line, or hint layout; repeat only the affected visual/browser check.

- [x] **Step 3: Self-review the exact diff with `rtk git diff --check` and `rtk git diff -- game/src game/tests/grip.test.mjs game/tests/gripInput.test.mjs game/browser/yard.spec.mjs game/index.html`.** Confirm no dynamic-body teleport/kinematic conversion, no per-frame resource creation, no unbounded impulse accumulation, no DOM or Three dependency in physics, no mutable window diagnostics, and no gore codec changes. The physics tests must show force and torque budgets, actual held contacts, conservative release reasons, and mass-dependent saturated throws. GPU counts after repeated resets remain covered by the existing regression.

- [x] **Step 4: Create `docs/superpowers/plans/2026-09-08-grip-telekinesis-results.md` using `apply_patch`, recording actual observed evidence under this required structure.** The implementation writer supplies real command outputs and measurements; these fields are factual reports written after running, not assumed results:

```markdown
# M1B-1 Grip results

## Delivered scope

Describe the verified Grip interactions, session toggle and browser-only delivery.

## Observed RED and GREEN

Record each executed command, original failing assertion, later pass count, and relevant runtime.

## Physics tuning and safety observations

Record final force, acceleration, torque, throw and target-slew limits; measured lift/throw behavior; obstacle/plank contact results; release reasons; same-runtime 30/60/144 grouping result.

## Browser and image evidence

Link the actual active-Grip capture and report input, pause/restart, gore persistence, diagnostics stripping and errors observed.

## Limits and subsequent work

State that tuning is provisional and no subjective weight study, joined-chain validation, full P03/M1B, NPC/gore presentation, engine migration, historical scene, desktop repackaging, publication or deployment was completed here.
```

- [x] **Step 5: Send the coordinator the ready diff and evidence for independent spec review followed by quality review.** Address concrete findings with regression coverage. Stage only these owned paths after coordinator release readiness; research reports remain coordinator-owned and `docs/research/deep-research/2026-09-08/work` stays untracked and untouched:

```powershell
rtk git add game/src/physics/grip.ts game/src/physics/yard.ts game/src/input/gripInput.ts game/src/input/browserInput.ts game/src/main.ts game/src/render/yardView.ts game/src/style.css game/index.html game/tests/grip.test.mjs game/tests/gripInput.test.mjs game/browser/yard.spec.mjs docs/superpowers/plans/2026-09-08-grip-telekinesis.md docs/superpowers/plans/2026-09-08-grip-telekinesis-results.md
rtk git diff --cached --stat
rtk git commit -m "feat: add bounded physical Grip to the PC courtyard"
```

No broad staging, branch publication, merging, deployment, dependency changes or desktop package updates are authorized by this slice. Return `DONE` or `DONE_WITH_CONCERNS` with exact files, observed verification, committed SHA if committed, and remaining product limitations.

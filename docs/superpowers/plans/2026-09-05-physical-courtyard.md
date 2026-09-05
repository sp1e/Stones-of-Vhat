# M1A physical courtyard implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (selected) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a real, independently testable Rapier courtyard and first-person capsule with jumping, crouching, steps and movable objects.
**Architecture:** Authored data supplies both physical shapes and future render geometry. A single world owns its bodies/controller; fixed simulation snapshots are detached plain data, ready for render interpolation. No Three objects, DOM, hidden variable-dt stepping, weapons or final historical assets.
**Tech Stack:** Rapier compat 0.20.0, TypeScript, existing native Node tests and fixed 1/60 clock.

---

## File map and constraints

Workdir: C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation.
- Create game/src/content/yardLayout.ts: prototype geometry contract and authored test courtyard.
- Create game/src/physics/yard.ts: world/controller ownership, fixed movement and snapshots.
- Create game/tests/yard.test.mjs: actual Rapier integration tests, not physics mocks.
- Create docs/superpowers/plans/2026-09-05-physical-courtyard-results.md: observed validation evidence.

All commands begin rtk, edits use apply_patch. Do not touch other checkout, deploy, install unapproved tools, or claim this is the finished chapter. Browser toolchain/storage foundation must pass review first. Existing M0 modules remain unchanged.

## Task 1: Real world and player

- [ ] Add game/tests/yard.test.mjs:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const url = new URL('../src/physics/yard.ts', import.meta.url);
const { createYard } = existsSync(url) ? await import(url.href) : {};
const floor = { id: 'floor', shape: { kind: 'box', size: [40, 1, 40] }, position: { x: 0, y: -0.5, z: 0 }, color: '#666666' };
const idle = { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false };
async function make(options = {}) {
  assert.equal(typeof createYard, 'function');
  return createYard({ layout: [floor], ...options });
}
function run(yard, frames, intent = idle) {
  for (let i = 0; i < frames; i++) yard.step(intent);
  return yard.snapshot();
}
test('capsule settles, jumps once and lands on the physical floor', async () => {
  const yard = await make();
  try {
    let state = run(yard, 90);
    assert.ok(state.player.grounded);
    assert.ok(Math.abs(state.player.position.y - 0.86) < 0.06);
    const groundY = state.player.position.y;
    yard.step({ ...idle, jump: true });
    state = run(yard, 12);
    assert.ok(state.player.position.y > groundY + 0.35);
    state = run(yard, 120);
    assert.ok(state.player.grounded);
    assert.ok(Math.abs(state.player.position.y - groundY) < 0.02);
  } finally { yard.destroy(); }
});
test('diagonal movement is normalized and sprint is faster', async () => {
  async function distance(intent) {
    const yard = await make();
    try {
      run(yard, 60);
      const before = yard.snapshot().player.position;
      const after = run(yard, 60, intent).player.position;
      return Math.hypot(after.x - before.x, after.z - before.z);
    } finally { yard.destroy(); }
  }
  const straight = await distance({ ...idle, forward: 1 });
  const diagonal = await distance({ ...idle, forward: 1, right: 1 });
  assert.ok(Math.abs(straight - 4.2) < 0.08);
  assert.ok(Math.abs(diagonal - straight) < 0.05);
  assert.ok(await distance({ ...idle, forward: 1, sprint: true }) > straight + 2);
});
test('walls stop travel and low steps can be climbed', async () => {
  const obstacle = (id, size, position) => ({ id, shape: { kind: 'box', size }, position, color: '#555555' });
  const wall = await make({ layout: [floor, obstacle('wall', [6, 3, 0.4], { x: 0, y: 1.5, z: 5 })] });
  try {
    run(wall, 60);
    const state = run(wall, 120, { ...idle, forward: 1 });
    assert.ok(state.player.position.z > 5.48);
  } finally { wall.destroy(); }
  const step = await make({ layout: [floor, obstacle('step', [4, 0.22, 6], { x: 0, y: 0.11, z: 2 })] });
  try {
    run(step, 60);
    const state = run(step, 80, { ...idle, forward: 1 });
    assert.ok(state.player.position.z < 4);
    assert.ok(state.player.position.y > 1.03);
  } finally { step.destroy(); }
});
test('crouching fits a low passage and standing waits for clearance', async () => {
  const roof = { id: 'roof', shape: { kind: 'box', size: [4, 0.3, 4] }, position: { x: 0, y: 1.35, z: 8 }, color: '#555555' };
  const yard = await make({ layout: [floor, roof], spawn: { x: 0, y: 0.57, z: 8 }, crouched: true });
  try {
    let state = run(yard, 60);
    assert.equal(state.player.crouched, true);
    state = run(yard, 90, { ...idle, forward: 1 });
    assert.ok(state.player.position.z < 5.5);
    state = run(yard, 30);
    assert.equal(state.player.crouched, false);
    assert.ok(state.player.position.y > 0.8);
  } finally { yard.destroy(); }
});
test('character pushes a real dynamic body', async () => {
  const crate = { id: 'crate', shape: { kind: 'box', size: [0.6, 0.6, 0.6] }, position: { x: 0, y: 0.4, z: 6 }, color: '#663311', mass: 3 };
  const yard = await make({ layout: [floor, crate] });
  try {
    run(yard, 60);
    const before = yard.snapshot().bodies.find(body => body.id === 'crate').position.z;
    run(yard, 90, { ...idle, forward: 1 });
    const after = yard.snapshot().bodies.find(body => body.id === 'crate').position.z;
    assert.ok(after < before - 0.4);
  } finally { yard.destroy(); }
});
test('snapshots cannot mutate simulation and ten lifecycles release ownership', async () => {
  for (let i = 0; i < 10; i++) {
    const yard = await make();
    assert.deepEqual(yard.counts(), { bodies: 2, colliders: 2 });
    const state = yard.snapshot();
    state.player.position.x = 999;
    state.bodies[0].position.y = 999;
    assert.notEqual(yard.snapshot().player.position.x, 999);
    assert.notEqual(yard.snapshot().bodies[0].position.y, 999);
    yard.destroy();
    yard.destroy();
    assert.deepEqual(yard.counts(), { bodies: 0, colliders: 0 });
    assert.throws(() => yard.step(idle), /destroyed/);
  }
});
~~~

- [ ] Run `rtk node --test game/tests/yard.test.mjs`. Expected: six assertion failures identifying absent createYard.

- [ ] Create game/src/content/yardLayout.ts:

~~~ts
export type Vec3 = { x: number; y: number; z: number };
export type Rotation = Vec3 & { w: number };
export type Shape =
  | { kind: 'box'; size: readonly [number, number, number] }
  | { kind: 'ball'; radius: number }
  | { kind: 'cylinder'; radius: number; height: number };
export type BodyDefinition = {
  id: string;
  shape: Shape;
  position: Vec3;
  rotation?: Rotation;
  color: string;
  mass?: number;
};
const box = (id: string, size: readonly [number, number, number], position: Vec3, color: string, mass?: number): BodyDefinition =>
  ({ id, shape: { kind: 'box', size }, position, color, ...(mass === undefined ? {} : { mass }) });
export const YARD_LAYOUT: readonly BodyDefinition[] = [
  box('floor', [24, 1, 24], { x: 0, y: -0.5, z: 0 }, '#64665c'),
  box('north', [24, 3, 0.6], { x: 0, y: 1.5, z: -12 }, '#747566'),
  box('south', [24, 3, 0.6], { x: 0, y: 1.5, z: 12 }, '#747566'),
  box('west', [0.6, 3, 24], { x: -12, y: 1.5, z: 0 }, '#747566'),
  box('east', [0.6, 3, 24], { x: 12, y: 1.5, z: 0 }, '#747566'),
  ...Array.from({ length: 5 }, (_, i) => box('stair-' + i, [3, (i + 1) * 0.22, 0.8], { x: -5, y: (i + 1) * 0.11, z: -1 - i * 0.8 }, '#8b8a76')),
  box('high-block', [2, 1.3, 2], { x: 2, y: 0.65, z: -5 }, '#808571'),
  { ...box('ramp', [3, 0.3, 5], { x: 6, y: 0.5, z: -6 }, '#808571'), rotation: { x: Math.sin(0.09), y: 0, z: 0, w: Math.cos(0.09) } },
  box('passage-roof', [4, 0.3, 3], { x: 6, y: 1.35, z: 3 }, '#626758'),
  box('passage-left', [0.4, 1.2, 3], { x: 4, y: 0.6, z: 3 }, '#626758'),
  box('passage-right', [0.4, 1.2, 3], { x: 8, y: 0.6, z: 3 }, '#626758'),
  box('crate-a', [0.8, 0.8, 0.8], { x: -1.5, y: 0.5, z: 3 }, '#85664a', 12),
  box('crate-b', [0.7, 0.7, 0.7], { x: -2, y: 0.5, z: 1 }, '#76553b', 9),
  { id: 'barrel', shape: { kind: 'cylinder', radius: 0.36, height: 0.9 }, position: { x: 1, y: 0.55, z: 1 }, color: '#78604c', mass: 18 },
  { id: 'stone', shape: { kind: 'ball', radius: 0.3 }, position: { x: 0, y: 0.5, z: 4 }, color: '#999b8c', mass: 6 },
  box('plank', [2.4, 0.14, 0.35], { x: -3, y: 0.3, z: 4 }, '#69553f', 8),
];
~~~

- [ ] Create game/src/physics/yard.ts. Read the installed Rapier 0.20 declarations if an API differs; do not cast away a mismatch. The controller is removed before freeing its owning world.

~~~ts
import RAPIER from '@dimforge/rapier3d-compat';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { YARD_LAYOUT } from '../content/yardLayout.ts';
import type { BodyDefinition, Vec3, Rotation, Shape } from '../content/yardLayout.ts';

let initialization: Promise<void> | undefined;
const identity: Rotation = { x: 0, y: 0, z: 0, w: 1 };
const radius = 0.3;
const standingHalf = 0.55;
const crouchingHalf = 0.25;
export type MoveIntent = { right: number; forward: number; yaw: number; sprint: boolean; crouch: boolean; jump: boolean };
export type BodyPose = { id: string; position: Vec3; previousPosition: Vec3; rotation: Rotation; previousRotation: Rotation };
export type YardSnapshot = { bodies: BodyPose[]; player: { position: Vec3; eye: Vec3; previousEye: Vec3; grounded: boolean; crouched: boolean } };

function colliderDescription(shape: Shape) {
  if (shape.kind === 'ball') return RAPIER.ColliderDesc.ball(shape.radius);
  if (shape.kind === 'cylinder') return RAPIER.ColliderDesc.cylinder(shape.height / 2, shape.radius);
  return RAPIER.ColliderDesc.cuboid(shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2);
}
export async function createYard(options: { layout?: readonly BodyDefinition[]; spawn?: Vec3; crouched?: boolean } = {}) {
  initialization ??= RAPIER.init();
  await initialization;
  const layout = options.layout ?? YARD_LAYOUT;
  if (new Set(layout.map(item => item.id)).size !== layout.length) throw new Error('Duplicate body id');
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_DT;
  const bodies = new Map<string, RAPIER.RigidBody>();
  for (const definition of layout) {
    const dynamic = definition.mass !== undefined;
    const desc = dynamic ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
    desc.setTranslation(definition.position.x, definition.position.y, definition.position.z);
    if (definition.rotation) desc.setRotation(definition.rotation);
    if (dynamic) desc.setCcdEnabled(true);
    const body = world.createRigidBody(desc);
    const collider = colliderDescription(definition.shape).setFriction(0.7);
    if (definition.mass !== undefined) collider.setMass(definition.mass);
    world.createCollider(collider, body);
    bodies.set(definition.id, body);
  }
  let crouched = options.crouched ?? false;
  let half = crouched ? crouchingHalf : standingHalf;
  const spawn = options.spawn ?? { x: 0, y: 1, z: 8 };
  const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z));
  const playerCollider = world.createCollider(RAPIER.ColliderDesc.capsule(half, radius), player);
  const controller = world.createCharacterController(0.01);
  controller.enableAutostep(0.25, 0.35, false);
  controller.enableSnapToGround(0.2);
  controller.setMaxSlopeClimbAngle(Math.PI / 4);
  controller.setMinSlopeSlideAngle(Math.PI * 50 / 180);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.setCharacterMass(80);
  // Publish new colliders to Rapier's query pipeline before the first live tick.
  world.step();
  let grounded = false;
  let verticalSpeed = 0;
  let destroyed = false;
  const previous = new Map<string, { position: Vec3; rotation: Rotation }>();
  function eye(): Vec3 {
    const pos = player.translation();
    return { x: pos.x, y: pos.y + half + radius - 0.1, z: pos.z };
  }
  let previousEye = eye();
  function requireLive() {
    if (destroyed) throw new Error('Yard is destroyed');
  }
  function recordPrevious() {
    previousEye = eye();
    for (const [id, body] of bodies) previous.set(id, { position: { ...body.translation() }, rotation: { ...body.rotation() } });
  }
  recordPrevious();
  return {
    layout,
    step(intent: MoveIntent): void {
      requireLive();
      if (![intent.right, intent.forward, intent.yaw].every(Number.isFinite)) throw new Error('Movement must be finite');
      recordPrevious();
      const targetHalf = intent.crouch ? crouchingHalf : standingHalf;
      if (targetHalf !== half) {
        const pos = player.translation();
        const next = { x: pos.x, y: pos.y + targetHalf - half, z: pos.z };
        const blocked = targetHalf > half && world.intersectionWithShape(next, identity, new RAPIER.Capsule(targetHalf, radius), RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, playerCollider, player);
        if (!blocked) {
          half = targetHalf;
          crouched = half === crouchingHalf;
          playerCollider.setShape(new RAPIER.Capsule(half, radius));
          player.setTranslation(next, true);
          world.propagateModifiedBodyPositionsToColliders();
        }
      }
      if (grounded && intent.jump && !crouched) verticalSpeed = 5.5;
      else if (grounded && verticalSpeed <= 0) verticalSpeed = -1;
      else verticalSpeed = Math.max(-30, verticalSpeed - 18 * FIXED_DT);
      const length = Math.max(1, Math.hypot(intent.right, intent.forward));
      const speed = crouched ? 2 : intent.sprint ? 6.8 : 4.2;
      const right = intent.right / length * speed * FIXED_DT;
      const forward = intent.forward / length * speed * FIXED_DT;
      const desired = { x: right * Math.cos(intent.yaw) - forward * Math.sin(intent.yaw), y: verticalSpeed * FIXED_DT, z: -right * Math.sin(intent.yaw) - forward * Math.cos(intent.yaw) };
      controller.computeColliderMovement(playerCollider, desired);
      const movement = controller.computedMovement();
      if (verticalSpeed > 0 && movement.y < desired.y - 0.001) verticalSpeed = 0;
      const position = player.translation();
      player.setNextKinematicTranslation({ x: position.x + movement.x, y: position.y + movement.y, z: position.z + movement.z });
      grounded = controller.computedGrounded();
      world.step();
    },
    snapshot(): YardSnapshot {
      requireLive();
      return {
        bodies: [...bodies].map(([id, body]) => {
          const prior = previous.get(id)!;
          return { id, position: { ...body.translation() }, previousPosition: { ...prior.position }, rotation: { ...body.rotation() }, previousRotation: { ...prior.rotation } };
        }),
        player: { position: { ...player.translation() }, eye: eye(), previousEye: { ...previousEye }, grounded, crouched },
      };
    },
    counts(): { bodies: number; colliders: number } {
      if (destroyed) return { bodies: 0, colliders: 0 };
      return { bodies: world.bodies.len(), colliders: world.colliders.len() };
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      world.removeCharacterController(controller);
      world.free();
      bodies.clear();
      previous.clear();
    },
  };
}
export type Yard = Awaited<ReturnType<typeof createYard>>;
~~~

- [ ] Run `rtk npm --prefix game run check`. Expected: 28 tests pass (22 existing plus six new) and strict typecheck succeeds. If a real physics assertion fails, inspect trajectories/API semantics and correct the implementation; do not weaken the assertion to hide incorrect physics.
- [ ] Add any demonstrated regression test before fixing it. Validate ramp travel with the same real-world fixture pattern if slope behavior exposes a defect.
- [ ] Record RED/GREEN, real Rapier version, fixed timestep, one initialization warm-up step, lifecycle results and limitations in the results document.
- [ ] Run `rtk git diff --check`; stage only owned files and commit `feat: add real courtyard physics and capsule movement`.
- [ ] Independent spec review, then quality review; resolve findings before renderer integration.

## Controller self-review

### Verified integration adjustment

Importing Rapier exposed 36 TS2550 errors in its Symbol.dispose declarations. The coordinator owns game/tsconfig.json and game/tests/bootstrap.test.mjs for this narrow adjustment. Added and observed this assertion fail before changing configuration:

~~~js
assert.equal(config.compilerOptions.lib.includes('ESNext.Disposable'), true, 'Rapier disposal declarations require ESNext.Disposable');
~~~

Changed only the compiler library list to:

~~~json
"lib": ["ES2022", "DOM", "ESNext.Disposable"]
~~~

The bootstrap assertion and strict typecheck now pass. ES2022 output target and full declaration checking remain intact; no skipLibCheck or runtime dependency change was used. Physics trajectory validation remains the builder's responsibility.

The builder's unchanged movement test required controller.setNormalNudgeFactor(0.002) to avoid near-tangent floor-cast stalls. Rapier describes this parameter as a small contact-normal distance and cautions against values large enough to introduce bumps; see [upstream controller source](https://docs.rs/rapier3d/latest/src/rapier3d/control/character_controller.rs.html). The local metre-scale value was verified against straight/diagonal travel, stairs, ramp, roof and dynamic pushing. This is targeted numerical tuning, not bypassed collision detection.

### Quality finding: extend movement coverage before integration

The initial movement test covered yaw zero only. Independent quality review reproduced stalls at yaw PI/8 and PI/4; 0.002 is therefore not a complete fix. Add rotated-direction coverage before correcting production code. The acceptance regression is:

~~~js
for (const yaw of [0, Math.PI / 8, -Math.PI / 8, Math.PI / 4, -Math.PI / 4, Math.PI / 2, Math.PI]) {
  for (const direction of [{ forward: 1 }, { forward: -1 }, { forward: 1, right: 1 }]) {
    await withYard({}, yard => {
      let previous = run(yard, 60).player.position;
      for (let tick = 0; tick < 120; tick++) {
        const current = run(yard, 1, { ...direction, yaw }).player.position;
        const distance = Math.hypot(current.x - previous.x, current.z - previous.z);
        assert.ok(distance > 0.06 && distance < 0.08, 'flat-floor walking must not stall at rotated yaw');
        previous = current;
      }
    });
  }
}
~~~

Use the same real 40m floor fixture; preserve all existing movement-distance and collision assertions. Investigate contact stability and vertical jitter, not just a single passing angle. No teleporting through contacts, no filtered-out floor collision, and no extra world steps per public step. Record the demonstrated cause, justified correction, RED/GREEN and review follow-up in the results document.

This implements M1A physics only, not the entire M1. Flat floor colliders avoid decorative cobble jitter. Authored ramps, low passage, stairs, walls and four prop types give the subsequent playable view useful movement/interaction checks. Standing uses volume clearance, not just a head ray. World snapshots have no shared mutable physics state; destroy is a real lifecycle API, not a test-only hook. Nine-link severing, magic, NPCs, final historical reconstruction and saves remain in their approved later milestones. No renderer or browser is claimed here.

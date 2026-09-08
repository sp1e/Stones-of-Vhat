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

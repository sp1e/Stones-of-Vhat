import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const url = new URL('../src/physics/yard.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};
const idle = { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false };
const floor = { id: 'floor', shape: { kind: 'box', size: [40, 1, 40] }, position: { x: 0, y: -0.5, z: 0 }, color: '#77736b' };
const box = (id, size, position, mass) => ({ id, shape: { kind: 'box', size }, position, color: '#746655', ...(mass === undefined ? {} : { mass }) });
const run = (yard, ticks, intent = {}) => {
  for (let tick = 0; tick < ticks; tick += 1) yard.step({ ...idle, ...intent });
  return yard.snapshot();
};
async function withYard(options, exercise) {
  assert.equal(typeof api.createYard, 'function', 'createYard must provide the real physics simulation');
  const yard = await api.createYard({ layout: [floor], ...options });
  try { return await exercise(yard); } finally { yard.destroy(); }
}

test('capsule settles on a real floor, jumps, and lands', async () => {
  await withYard({}, (yard) => {
    const settled = run(yard, 90).player;
    assert.equal(settled.grounded, true);
    assert.ok(Math.abs(settled.position.y - 0.86) < 0.06);
    run(yard, 1, { jump: true });
    const airborne = run(yard, 12).player;
    assert.ok(airborne.position.y > settled.position.y + 0.35);
    assert.equal(airborne.grounded, false);
    const landed = run(yard, 120).player;
    assert.equal(landed.grounded, true);
    assert.ok(Math.abs(landed.position.y - settled.position.y) < 0.02);
  });
});

test('walk, diagonal movement, and sprint use physical distances', async () => {
  const distance = async (intent) => withYard({}, (yard) => {
    const start = run(yard, 60).player.position;
    const end = run(yard, 60, intent).player.position;
    return Math.hypot(end.x - start.x, end.z - start.z);
  });
  const straight = await distance({ forward: 1 });
  const diagonal = await distance({ right: 1, forward: 1 });
  const sprint = await distance({ forward: 1, sprint: true });
  const crouch = await distance({ forward: 1, crouch: true });
  assert.ok(Math.abs(straight - 4.2) < 0.08, `walk distance ${straight}`);
  assert.ok(Math.abs(diagonal - straight) < 0.05, `diagonal distance ${diagonal}`);
  assert.ok(sprint > straight + 2, `sprint distance ${sprint}`);
  assert.ok(Math.abs(crouch - 2) < 0.08, `crouch distance ${crouch}`);
});

test('flat-floor walking does not stall at rotated headings or signed diagonals', async () => {
  const headings = new Set([-Math.PI / 8, -Math.PI / 4, ...Array.from({ length: 32 }, (_, index) => index * Math.PI / 16)]);
  for (const yaw of headings) {
    const distances = [];
    for (const axes of [{ forward: 1 }, { forward: -1 }, { right: 1 }, { right: -1 }, { right: 1, forward: 1 }, { right: -1, forward: -1 }, { right: -1, forward: 1 }, { right: 1, forward: -1 }]) {
      await withYard({}, (yard) => {
        let previous = run(yard, 60).player.position;
        const start = previous;
        for (let tick = 0; tick < 120; tick += 1) {
          const current = run(yard, 1, { ...axes, yaw }).player;
          const advance = Math.hypot(current.position.x - previous.x, current.position.z - previous.z);
          assert.ok(advance > 0.06, `flat-floor stall: yaw=${yaw}, axes=${JSON.stringify(axes)}, tick=${tick}, advance=${advance}, y=${current.position.y}`);
          assert.equal(current.grounded, true);
          assert.ok(Math.abs(current.position.y - previous.y) < 0.015, `floor vertical jitter at yaw=${yaw}, tick=${tick}`);
          previous = current.position;
          if (tick === 59) distances.push(Math.hypot(previous.x - start.x, previous.z - start.z));
        }
      });
    }
    for (const distance of distances) assert.ok(Math.abs(distance - 4.2) < 0.05, `yaw=${yaw}, distance=${distance}`);
    assert.ok(Math.max(...distances) - Math.min(...distances) < 0.05, `heading-dependent travel at yaw=${yaw}: ${distances}`);
  }
});

test('ground adhesion descends the authored ramp and stairs and releases at a ledge', async () => {
  assert.equal(typeof api.createYard, 'function');
  const authored = await api.createYard();
  const layout = authored.layout;
  authored.destroy();
  for (const fixture of [
    { layout: [floor, layout.find((body) => body.id === 'ramp')], spawn: { x: 6, y: 3, z: -7.9 }, ticks: 90 },
    { layout: [floor, ...layout.filter((body) => body.id.startsWith('stair-'))], spawn: { x: -5, y: 3, z: -4.2 }, ticks: 80 },
  ]) {
    await withYard(fixture, (yard) => {
      const start = run(yard, 90).player;
      assert.ok(start.position.y > 1.7);
      let previous = start.position;
      for (let tick = 0; tick < fixture.ticks; tick += 1) {
        const current = run(yard, 1, { forward: -1 }).player.position;
        assert.ok(current.y < previous.y + 0.03, `unexpected upward bump while descending: ${previous.y} -> ${current.y}`);
        previous = current;
      }
      const end = run(yard, 60).player;
      assert.equal(end.grounded, true);
      assert.ok(Math.abs(end.position.y - 0.86) < 0.03);
      assert.ok(end.position.z > start.position.z + 4.5);
    });
  }
  await withYard({ layout: [floor, box('ledge', [4, 2, 4], { x: 0, y: 1, z: 8 })], spawn: { x: 0, y: 3, z: 8 } }, (yard) => {
    const start = run(yard, 90).player;
    assert.ok(start.position.y > 2.8);
    const falling = run(yard, 45, { forward: 1 }).player;
    assert.equal(falling.grounded, false);
    assert.ok(falling.position.y < start.position.y - 0.1);
    const landed = run(yard, 120).player;
    assert.equal(landed.grounded, true);
    assert.ok(Math.abs(landed.position.y - 0.86) < 0.03);
  });
  const steep = { ...box('steep-slope', [4, 0.3, 8], { x: 0, y: 3, z: 0 }), rotation: { x: Math.sin(Math.PI / 6), y: 0, z: 0, w: Math.cos(Math.PI / 6) } };
  await withYard({ layout: [floor, steep], spawn: { x: 0, y: 7, z: -1 } }, (yard) => {
    const start = run(yard, 30).player.position;
    const slipped = run(yard, 60).player.position;
    assert.ok(slipped.y < start.y - 0.5, 'steep support must retain downward gravity');
    assert.ok(slipped.z > start.z + 0.3, 'the capsule must slide along the steep slope');
  });
});

test('capsule stops at walls and autosteps onto low stone steps', async () => {
  await withYard({ layout: [floor, box('wall', [6, 3, 0.4], { x: 0, y: 1.5, z: 5 })] }, (yard) => {
    run(yard, 60);
    const stopped = run(yard, 120, { forward: 1 }).player;
    assert.ok(stopped.position.z > 5.48, `wall stop z ${stopped.position.z}`);
  });
  await withYard({ layout: [floor, box('step', [4, 0.22, 6], { x: 0, y: 0.11, z: 2 })] }, (yard) => {
    run(yard, 60);
    const stepped = run(yard, 80, { forward: 1 }).player;
    assert.ok(stepped.position.z < 4, `step progress z ${stepped.position.z}`);
    assert.ok(stepped.position.y > 1.03, `step height y ${stepped.position.y}`);
  });
});

test('low roof blocks standing until the crouched capsule leaves it', async () => {
  await withYard({}, (yard) => {
    const standing = run(yard, 60).player;
    const crouching = run(yard, 1, { crouch: true }).player;
    assert.equal(crouching.crouched, true);
    assert.ok(Math.abs(crouching.position.y - standing.position.y + 0.3) < 0.02);
    assert.ok(Math.abs(crouching.eye.y - standing.eye.y + 0.6) < 0.02);
    const upright = run(yard, 1).player;
    assert.equal(upright.crouched, false);
    assert.ok(Math.abs(upright.position.y - standing.position.y) < 0.02);
    assert.deepEqual(upright.previousEye, crouching.eye);
  });
  await withYard({
    layout: [floor, box('roof', [4, 0.3, 4], { x: 0, y: 1.35, z: 8 })],
    spawn: { x: 0, y: 0.57, z: 8 }, crouched: true,
  }, (yard) => {
    assert.equal(run(yard, 60).player.crouched, true);
    const exited = run(yard, 90, { forward: 1 }).player;
    assert.ok(exited.position.z < 5.5, `exit z ${exited.position.z}`);
    const standing = run(yard, 30).player;
    assert.equal(standing.crouched, false);
    assert.ok(standing.position.y > 0.8);
  });
});

test('capsule transfers impulses to a dynamic crate', async () => {
  await withYard({ layout: [floor, box('crate', [0.6, 0.6, 0.6], { x: 0, y: 0.4, z: 6 }, 3)] }, (yard) => {
    const before = run(yard, 60).bodies.find((body) => body.id === 'crate').position.z;
    const after = run(yard, 90, { forward: 1 }).bodies.find((body) => body.id === 'crate').position.z;
    assert.ok(after < before - 0.4, `crate moved from ${before} to ${after}`);
  });
});

test('authored prototype includes five physical props and a climbable rotated ramp', async () => {
  assert.equal(typeof api.createYard, 'function');
  const yard = await api.createYard();
  let ramp;
  try {
    assert.equal(yard.layout.length, 20);
    assert.equal(new Set(yard.layout.map((body) => body.id)).size, 20);
    assert.equal(yard.layout.filter((body) => body.mass !== undefined).length, 5);
    assert.deepEqual(yard.counts(), { bodies: 21, colliders: 21 });
    const settled = run(yard, 120);
    for (const id of ['crate-a', 'crate-b', 'barrel', 'stone', 'plank']) {
      const body = settled.bodies.find((pose) => pose.id === id);
      assert.ok(Number.isFinite(body.position.y) && body.position.y > 0);
    }
    ramp = yard.layout.find((body) => body.id === 'ramp');
    assert.equal(ramp.rotation.x, Math.sin(0.09));
  } finally { yard.destroy(); }
  await withYard({ layout: [floor, ramp], spawn: { x: 6, y: 1, z: -2 } }, (slopeYard) => {
    run(slopeYard, 60);
    const climbed = run(slopeYard, 60, { forward: 1 }).player;
    assert.ok(climbed.position.z < -5.8, `ramp progress z ${climbed.position.z}`);
    assert.ok(climbed.position.y > 1.4, `ramp climb y ${climbed.position.y}`);
    assert.equal(climbed.grounded, true);
  });
});

test('ten world lifecycles keep snapshots detached and release all bodies', async () => {
  for (let index = 0; index < 10; index += 1) {
    await withYard({}, (yard) => {
      assert.deepEqual(yard.counts(), { bodies: 2, colliders: 2 });
      run(yard, 2);
      const baseline = yard.snapshot();
      const detached = yard.snapshot();
      detached.bodies[0].position.y = 500;
      detached.bodies[0].previousPosition.y = 500;
      detached.bodies[0].rotation.w = 500;
      detached.bodies[0].previousRotation.w = 500;
      detached.player.position.y = 500;
      detached.player.eye.y = 500;
      detached.player.previousEye.y = 500;
      assert.deepEqual(yard.snapshot(), baseline);
      for (const invalid of [{ right: NaN }, { forward: Infinity }, { yaw: NaN }]) {
        assert.throws(() => yard.step({ ...idle, ...invalid }), /finite/i);
        assert.deepEqual(yard.snapshot(), baseline);
      }
      yard.destroy();
      yard.destroy();
      assert.deepEqual(yard.counts(), { bodies: 0, colliders: 0 });
      assert.throws(() => yard.step(idle), /destroyed/i);
      assert.throws(() => yard.snapshot(), /destroyed/i);
    });
  }
  await assert.rejects(api.createYard({ layout: [floor, floor] }), /duplicate/i);
});

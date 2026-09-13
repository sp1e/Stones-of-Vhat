import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const environmentUrl = new URL('../src/content/environment/index.ts', import.meta.url);
const content = existsSync(environmentUrl) ? await import(environmentUrl.href) : {};
const physics = await import(new URL('../src/physics/yard.ts', import.meta.url).href);

const IDLE = { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false };
const WALK_STEP = 4.2 / 60;
const STANDING_CENTRE = 0.86;

function environment(options) {
  assert.equal(typeof content.buildEnvironment, 'function', 'buildEnvironment must exist');
  return content.buildEnvironment(options);
}
const finite = (vector) => [vector.x, vector.y, vector.z].every(Number.isFinite);
// yard.ts: forward moves along (-sin yaw, -cos yaw).
const headingTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z));

/**
 * Returns the id of a rendered solid element (not ground) whose volume contains the capsule axis at the
 * capsule's height. Reads element geometry, not the body list given to physics, so a dropped collider is caught.
 */
function solidAt(elements, position, removed = new Set()) {
  const bottom = position.y - 0.85, top = position.y + 0.85;
  for (const element of elements) {
    if (element.collision !== 'solid' || element.role === 'ground' || removed.has(element.id)) continue;
    const { geometry: g, position: p } = element;
    const halfHeight = g.kind === 'box' ? g.size[1] / 2 : g.height / 2;
    if (p.y + halfHeight <= bottom + 0.05 || p.y - halfHeight >= top - 0.05) continue;
    const dx = position.x - p.x, dz = position.z - p.z;
    if (g.kind === 'cylinder') {
      if (Math.hypot(dx, dz) < g.radius) return element.id;
      continue;
    }
    const localX = dx * Math.cos(element.yaw) - dz * Math.sin(element.yaw), localZ = dx * Math.sin(element.yaw) + dz * Math.cos(element.yaw);
    if (Math.abs(localX) < g.size[0] / 2 && Math.abs(localZ) < g.size[2] / 2) return element.id;
  }
  return null;
}
/** Negative controls name the bodies they remove; everything else must still be physically present. */
function withoutBodies(built, predicate) {
  const removed = new Set(built.bodies.filter(predicate).map((body) => body.id));
  assert.ok(removed.size > 0, 'negative control must remove at least one body');
  return { built: { ...built, bodies: built.bodies.filter((body) => !removed.has(body.id)) }, removed };
}

async function withWorld(built, options, exercise) {
  const yard = await physics.createYard({ layout: built.bodies, ...options });
  try { return await exercise(yard); } finally {
    yard.destroy();
    assert.deepEqual(yard.counts(), { bodies: 0, colliders: 0 });
  }
}
function settle(yard, ticks = 45) {
  for (let tick = 0; tick < ticks; tick += 1) yard.step(IDLE);
  return yard.snapshot().player;
}
/** Walks straight on a fixed heading and checks every tick for tunnelling into solids. */
function walk(yard, built, yaw, ticks, removed = new Set()) {
  let previous = yard.snapshot().player.position;
  for (let tick = 0; tick < ticks; tick += 1) {
    yard.step({ ...IDLE, forward: 1, yaw });
    const current = yard.snapshot().player.position;
    assert.ok(finite(current), `non-finite position at tick ${tick}`);
    const inside = solidAt(built.elements, current, removed);
    assert.equal(inside, null, `capsule inside ${inside} at ${JSON.stringify(current)}`);
    previous = current;
  }
  return previous;
}

async function walkRoute(built, route) {
  return withWorld(built, { spawn: built.spawn }, (yard) => {
    let player = settle(yard);
    const reached = [];
    let ticks = 0, distance = 0;
    for (const waypoint of route.waypoints.slice(1)) {
      const segment = Math.hypot(waypoint.x - player.position.x, waypoint.z - player.position.z);
      const budget = Math.ceil((segment / WALK_STEP) * 1.6) + 60;
      const arrival = waypoint.checkpoint ? 0.9 : 0.6;
      let arrived = false;
      for (let tick = 0; tick < budget; tick += 1) {
        if (Math.hypot(waypoint.x - player.position.x, waypoint.z - player.position.z) < arrival) { arrived = true; break; }
        const before = player.position;
        yard.step({ ...IDLE, forward: 1, yaw: headingTo(before, waypoint) });
        player = yard.snapshot().player;
        ticks += 1;
        assert.ok(finite(player.position), `${route.id}: non-finite position`);
        const moved = Math.hypot(player.position.x - before.x, player.position.y - before.y, player.position.z - before.z);
        assert.ok(moved <= WALK_STEP + 0.3, `${route.id}: teleport-sized step ${moved} at ${JSON.stringify(before)}`);
        distance += Math.hypot(player.position.x - before.x, player.position.z - before.z);
        const inside = solidAt(built.elements, player.position);
        assert.equal(inside, null, `${route.id}: capsule tunnelled into ${inside} at ${JSON.stringify(player.position)}`);
      }
      assert.ok(arrived, `${route.id}: stuck before ${waypoint.checkpoint ?? JSON.stringify(waypoint)} at ${JSON.stringify(player.position)}`);
      if (waypoint.checkpoint) reached.push(waypoint.checkpoint);
    }
    const final = settle(yard, 30);
    return { reached, ticks, distance, final };
  });
}

test('route data: unique checkpoints, both routes start at the spawn and share the church end', () => {
  const built = environment();
  const ids = built.checkpoints.map((checkpoint) => checkpoint.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(built.routes.map((route) => route.id).sort(), ['alley', 'portik']);
  for (const route of built.routes) {
    const first = route.waypoints[0];
    assert.equal(first.checkpoint, 'radhus-approach');
    assert.ok(Math.hypot(first.x - built.spawn.x, first.z - built.spawn.z) < 1e-9);
    assert.equal(route.waypoints.at(-1).checkpoint, 'st-per-north');
    for (const waypoint of route.waypoints) if (waypoint.checkpoint) assert.ok(ids.includes(waypoint.checkpoint), waypoint.checkpoint);
  }
});

test('the real capsule walks both routes through every named checkpoint without tunnelling', { timeout: 120_000 }, async () => {
  const built = environment();
  const results = {};
  for (const route of built.routes) {
    const result = await walkRoute(built, route);
    assert.deepEqual(result.reached, route.waypoints.slice(1).filter((waypoint) => waypoint.checkpoint).map((waypoint) => waypoint.checkpoint));
    assert.equal(result.final.grounded, true, `${route.id} ends grounded`);
    assert.ok(Math.abs(result.final.position.y - (content.PLATEAU_TOP + STANDING_CENTRE)) < 0.06, `${route.id} ends on the plateau, y=${result.final.position.y}`);
    results[route.id] = { ticks: result.ticks, seconds: +(result.ticks / 60).toFixed(1), metres: +result.distance.toFixed(1) };
  }
  const passage = new Set(built.routes.find((route) => route.id === 'portik').waypoints.map((waypoint) => waypoint.checkpoint));
  const alley = new Set(built.routes.find((route) => route.id === 'alley').waypoints.map((waypoint) => waypoint.checkpoint));
  assert.ok(passage.has('portik-west') && !alley.has('portik-west'), 'the routes are genuine alternatives');
  assert.ok(alley.has('alley-bend') && !passage.has('alley-bend'));
  console.log(`route walk (capsule, 4.2 m/s, 60 Hz): ${JSON.stringify(results)}`);
});

test('a facade rejects the capsule; the same walk passes once that house is removed', async () => {
  const built = environment();
  const spawn = { x: 0, y: 1, z: 2 }, yaw = Math.PI / 2;
  const blocked = await withWorld(built, { spawn }, (yard) => { settle(yard); return walk(yard, built, yaw, 120); });
  assert.ok(blocked.x > -2.45, `facade stop x=${blocked.x}`);
  const control = withoutBodies(built, (body) => body.id.startsWith('storgata-w4-'));
  const open = await withWorld(control.built, { spawn }, (yard) => { settle(yard); return walk(yard, control.built, yaw, 120, control.removed); });
  assert.ok(open.x < -5, `negative control must pass the removed facade, x=${open.x}`);
});

test('the closed courtyard gate rejects the capsule; removing only the gate opens it', async () => {
  const built = environment();
  const spawn = { x: 15.5, y: 1, z: 16 }, yaw = -Math.PI / 2;
  const blocked = await withWorld(built, { spawn }, (yard) => { settle(yard); return walk(yard, built, yaw, 90); });
  assert.ok(blocked.x < 16.7, `gate stop x=${blocked.x}`);
  const control = withoutBodies(built, (body) => body.id === 'courtyard-2-closed-gate');
  const open = await withWorld(control.built, { spawn }, (yard) => { settle(yard); return walk(yard, control.built, yaw, 90, control.removed); });
  assert.ok(open.x > 18, `negative control must pass the open gateway, x=${open.x}`);
});

test('the churchyard wall rejects the capsule while its gate steps lead onto the plateau', async () => {
  const built = environment();
  const wall = await withWorld(built, { spawn: { x: 8, y: 1, z: -26 } }, (yard) => { settle(yard); return walk(yard, built, 0, 90); });
  assert.ok(wall.z > -29.45, `wall stop z=${wall.z}`);
  await withWorld(built, { spawn: { x: 0, y: 1, z: -26 } }, (yard) => {
    settle(yard);
    const through = walk(yard, built, 0, 120);
    const player = settle(yard, 30);
    assert.ok(through.z < -31, `gate passage z=${through.z}`);
    assert.equal(player.grounded, true);
    assert.ok(Math.abs(player.position.y - (content.PLATEAU_TOP + STANDING_CENTRE)) < 0.05, `autostep onto plateau y=${player.position.y}`);
  });
});

test('escape sweep: twelve headings from every checkpoint stay inside the map', { timeout: 180_000 }, async () => {
  const built = environment();
  const { minX, maxX, minZ, maxZ } = built.bounds;
  for (const checkpoint of built.checkpoints) {
    await withWorld(built, { spawn: checkpoint.position }, (yard) => {
      settle(yard, 20);
      for (let heading = 0; heading < 12; heading += 1) {
        // 7 s of sprint (≈ 48 m) per heading; the walk continues from wherever the previous heading ended.
        for (let tick = 0; tick < 420; tick += 1) {
          yard.step({ ...IDLE, forward: 1, sprint: true, yaw: (heading * Math.PI) / 6 });
          if (tick % 15 !== 14) continue;
          const { position } = yard.snapshot().player;
          assert.ok(finite(position) && position.y > -1, `${checkpoint.id} fell or broke at heading ${heading}`);
          assert.ok(position.x > minX && position.x < maxX && position.z > minZ && position.z < maxZ,
            `${checkpoint.id} escaped the map at heading ${heading}: ${JSON.stringify(position)}`);
        }
      }
    });
  }
});

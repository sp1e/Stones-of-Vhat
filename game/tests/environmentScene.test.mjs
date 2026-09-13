import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';

const sceneUrl = new URL('../src/render/environment/sceneBuilder.ts', import.meta.url);
const render = existsSync(sceneUrl) ? await import(sceneUrl.href) : {};
const content = await import(new URL('../src/content/environment/index.ts', import.meta.url).href);

function build(options) {
  assert.equal(typeof render.buildEnvironmentScene, 'function', 'buildEnvironmentScene must exist');
  const environment = content.buildEnvironment(options);
  const scene = render.buildEnvironmentScene(environment);
  scene.root.updateMatrixWorld(true);
  return { environment, scene };
}
function tagged(root) {
  const byId = new Map();
  root.traverse((object) => {
    const id = object.userData?.environmentId;
    if (id === undefined) return;
    assert.equal(byId.has(id), false, `${id} rendered twice`);
    byId.set(id, object);
  });
  return byId;
}
/** World bounds of a mesh or every instance of an instanced mesh. */
function worldBounds(object) {
  const box = new THREE.Box3();
  if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
  if (object.isInstancedMesh) {
    const matrix = new THREE.Matrix4(), instance = new THREE.Box3();
    for (let index = 0; index < object.count; index += 1) {
      object.getMatrixAt(index, matrix);
      instance.copy(object.geometry.boundingBox).applyMatrix4(matrix).applyMatrix4(object.matrixWorld);
      box.union(instance);
    }
    return box;
  }
  return box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
}
/** Independent collider bounds from the physics body descriptor, not from render code. */
function bodyBounds(body) {
  const yaw = 2 * Math.atan2(body.rotation?.y ?? 0, body.rotation?.w ?? 1);
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  const [w, h, d] = body.shape.kind === 'box' ? body.shape.size : [body.shape.radius * 2, body.shape.height, body.shape.radius * 2];
  const hx = body.shape.kind === 'box' ? (w * c + d * s) / 2 : w / 2, hz = body.shape.kind === 'box' ? (w * s + d * c) / 2 : d / 2;
  return { min: [body.position.x - hx, body.position.y - h / 2, body.position.z - hz], max: [body.position.x + hx, body.position.y + h / 2, body.position.z + hz] };
}
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;

test('every baseline element is rendered exactly once and nothing else is tagged', () => {
  const { environment, scene } = build();
  try {
    const rendered = tagged(scene.root);
    assert.deepEqual([...rendered.keys()].sort(), environment.elements.map((element) => element.id).sort());
    for (const element of environment.elements) {
      assert.equal(rendered.get(element.id).userData.collision, element.collision, element.id);
    }
  } finally { scene.dispose(); }
});

test('solid meshes occupy exactly the collider volume within 1 mm', () => {
  const { environment, scene } = build();
  try {
    const rendered = tagged(scene.root);
    assert.ok(environment.bodies.length > 100);
    for (const body of environment.bodies) {
      const mesh = rendered.get(body.id);
      assert.ok(mesh?.isMesh, `${body.id} has no mesh`);
      const actual = worldBounds(mesh), expected = bodyBounds(body);
      for (const axis of [0, 1, 2]) {
        const key = ['x', 'y', 'z'][axis];
        assert.ok(near(actual.min[key], expected.min[axis], 0.001) && near(actual.max[key], expected.max[axis], 0.001),
          `${body.id} ${key}: render ${actual.min[key]}..${actual.max[key]} vs collider ${expected.min[axis]}..${expected.max[axis]}`);
      }
    }
  } finally { scene.dispose(); }
});

test('render-only geometry stays inside the envelope its collision class promises', () => {
  const { environment, scene } = build();
  try {
    const rendered = tagged(scene.root);
    for (const element of environment.elements) {
      if (element.collision === 'solid') continue;
      const b = worldBounds(rendered.get(element.id));
      const { geometry: g, position: p } = element;
      if (g.kind === 'crown') {
        assert.ok(b.min.y >= p.y - g.radius * 0.8 - 0.005 && b.max.y <= p.y + g.radius * 0.8 + 0.005, `${element.id} crown height`);
        assert.ok(Math.hypot(Math.max(Math.abs(b.min.x - p.x), Math.abs(b.max.x - p.x)), 0) <= g.radius + 0.005, `${element.id} crown x`);
        assert.ok(Math.max(Math.abs(b.min.z - p.z), Math.abs(b.max.z - p.z)) <= g.radius + 0.005, `${element.id} crown z`);
      } else if (g.kind === 'cobble-patch') {
        assert.ok(b.max.y <= p.y + g.stoneHeight + 0.001, `${element.id} cobbles rise ${b.max.y - p.y}`);
        const reach = Math.hypot(g.size[0], g.size[1]) / 2 + 0.15;
        assert.ok(Math.max(Math.abs(b.min.x - p.x), Math.abs(b.max.x - p.x), Math.abs(b.min.z - p.z), Math.abs(b.max.z - p.z)) <= reach, `${element.id} cobbles spill`);
        assert.equal(rendered.get(element.id).count, g.count);
      } else if (g.kind === 'plane') {
        assert.ok(near(b.min.y, p.y, 1e-6) && near(b.max.y, p.y, 1e-6), `${element.id} plane height`);
      } else if (g.kind === 'gable-roof' || g.kind === 'pyramid-roof') {
        assert.ok(near(b.min.y, p.y, 0.001) && near(b.max.y, p.y + g.rise, 0.001), `${element.id} roof base/ridge ${b.min.y}..${b.max.y}`);
      } else if (g.kind === 'box') {
        assert.ok(near(b.max.y - b.min.y, g.size[1], 0.001), `${element.id} box height`);
      }
    }
  } finally { scene.dispose(); }
});

test('every tree trunk reaches into the rendered underside of its own crown', () => {
  const { environment, scene } = build();
  try {
    const rendered = tagged(scene.root);
    const crowns = environment.elements.filter((element) => element.geometry.kind === 'crown');
    assert.ok(crowns.length >= 3, 'negative control: the route has trees to check');
    const probe = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    for (const crown of crowns) {
      const trunk = environment.elements.find((element) => element.id === crown.id.replace(/-crown$/, '-trunk'));
      assert.equal(trunk?.geometry.kind, 'cylinder', `${crown.id} has no trunk`);
      const trunkTop = trunk.position.y + trunk.geometry.height / 2;
      // Cast down the trunk axis through a double-sided copy so the crown's inward-facing underside is hit too.
      const mesh = rendered.get(crown.id), copy = new THREE.Mesh(mesh.geometry, probe);
      copy.matrixWorld.copy(mesh.matrixWorld);
      const origin = new THREE.Vector3(trunk.position.x, crown.position.y + crown.geometry.radius + 1, trunk.position.z);
      const hits = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0)).intersectObject(copy, false);
      assert.ok(hits.length >= 2, `${crown.id} does not cover its trunk axis`);
      const underside = hits.at(-1).point.y, top = hits[0].point.y;
      assert.ok(trunkTop >= underside + 0.05, `${crown.id} floats: trunk top ${trunkTop.toFixed(2)} below crown underside ${underside.toFixed(2)}`);
      assert.ok(trunkTop <= top - 0.3, `${trunk.id} pokes through its crown: ${trunkTop.toFixed(2)} vs crown top ${top.toFixed(2)}`);
    }
    probe.dispose();
  } finally { scene.dispose(); }
});

test('seeded detail is deterministic between builds', () => {
  const first = build(), second = build();
  try {
    const a = tagged(first.scene.root), b = tagged(second.scene.root);
    for (const element of first.environment.elements.filter((candidate) => candidate.geometry.kind === 'cobble-patch' || candidate.geometry.kind === 'crown')) {
      const left = a.get(element.id), right = b.get(element.id);
      if (left.isInstancedMesh) assert.deepEqual([...left.instanceMatrix.array], [...right.instanceMatrix.array], element.id);
      else assert.deepEqual([...left.geometry.getAttribute('position').array], [...right.geometry.getAttribute('position').array], element.id);
    }
  } finally { first.scene.dispose(); second.scene.dispose(); }
});

test('dispose releases every geometry, material and texture the scene created, idempotently, across ten builds', () => {
  for (let round = 0; round < 10; round += 1) {
    const { scene } = build({ towerHypothesis: round % 2 === 0 ? 'partial' : 'complete' });
    const owned = new Set();
    scene.root.traverse((object) => {
      if (object.geometry) owned.add(object.geometry);
      for (const material of [object.material ?? []].flat()) {
        owned.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) owned.add(value);
      }
    });
    assert.ok(owned.size > 20);
    const released = new Set();
    for (const resource of owned) resource.addEventListener('dispose', () => released.add(resource));
    const stats = scene.stats();
    assert.ok(stats.meshes > 100 && stats.textures > 5, `stats ${JSON.stringify(stats)}`);
    scene.dispose();
    scene.dispose();
    assert.equal(released.size, owned.size, `released ${released.size} of ${owned.size}`);
    assert.equal(scene.root.children.length, 0);
  }
});

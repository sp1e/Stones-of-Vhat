import * as THREE from 'three';
import type { Environment, EnvironmentElement } from '../../content/environment/index.ts';
import { boxGeometry, cobbleInstances, crownGeometry, cylinderGeometry, gableRoofGeometry, planeGeometry, pyramidRoofGeometry } from './geometry.ts';
import { createEnvironmentMaterials } from './materials.ts';
import type { EnvironmentMaterials } from './materials.ts';

// Builds one Three.js object per environment element from the same data that produced the colliders.
// No physics writes, no per-frame work; the caller owns the returned root and must call dispose().

export type EnvironmentScene = ReturnType<typeof buildEnvironmentScene>;

function createObject(element: EnvironmentElement, materials: EnvironmentMaterials): THREE.Mesh | THREE.InstancedMesh {
  const { geometry: g } = element;
  const material = materials.get(element.material), tile = materials.tileSize(element.material);
  switch (g.kind) {
    case 'box': return new THREE.Mesh(boxGeometry(g.size[0], g.size[1], g.size[2], tile), material);
    case 'cylinder': return new THREE.Mesh(cylinderGeometry(g.radius, g.height, tile), material);
    case 'gable-roof': return new THREE.Mesh(gableRoofGeometry(g.width, g.depth, g.rise, g.overhang, tile), material);
    case 'pyramid-roof': return new THREE.Mesh(pyramidRoofGeometry(g.width, g.depth, g.rise, g.overhang, tile), material);
    case 'plane': return new THREE.Mesh(planeGeometry(g.size[0], g.size[1], tile), material);
    case 'crown': return new THREE.Mesh(crownGeometry(g.radius, g.seed), material);
    case 'cobble-patch': {
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), material, g.count);
      const { matrices, tones } = cobbleInstances(g.size, g.stoneHeight, g.count, g.seed);
      const tone = new THREE.Color();
      matrices.forEach((matrix, index) => {
        stones.setMatrixAt(index, matrix);
        const value = tones[index] ?? 1;
        stones.setColorAt(index, tone.setRGB(value, value, value));
      });
      stones.instanceMatrix.needsUpdate = true;
      if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
      stones.computeBoundingBox();
      stones.computeBoundingSphere();
      return stones;
    }
  }
}

export function buildEnvironmentScene(environment: Environment) {
  const materials = createEnvironmentMaterials();
  const root = new THREE.Group();
  root.name = 'environment';
  const objects: (THREE.Mesh | THREE.InstancedMesh)[] = [];
  let triangles = 0;
  for (const element of environment.elements) {
    const object = createObject(element, materials);
    object.name = element.id;
    object.position.set(element.position.x, element.position.y, element.position.z);
    object.rotation.set(0, element.yaw, 0);
    object.userData = { environmentId: element.id, collision: element.collision };
    object.castShadow = element.collision !== 'surface' && element.collision !== 'inset' && element.role !== 'ground';
    object.receiveShadow = true;
    // Static scenery: compute matrices once instead of every frame.
    object.matrixAutoUpdate = false;
    object.updateMatrix();
    const geometry = object.geometry;
    const faces = (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
    triangles += faces * (object instanceof THREE.InstancedMesh ? object.count : 1);
    objects.push(object);
    root.add(object);
  }
  const counts = {
    meshes: objects.length,
    instanced: objects.filter((object) => object instanceof THREE.InstancedMesh).length,
    triangles: Math.round(triangles),
  };
  let disposed = false;
  return {
    root,
    stats: () => ({ ...counts, textures: materials.textureCount() }),
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const object of objects) {
        root.remove(object);
        object.geometry.dispose();
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
      objects.length = 0;
      materials.dispose();
    },
  };
}

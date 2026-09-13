import * as THREE from 'three';
import { createRandom } from './random.ts';

// Blockout geometry with UVs in metres divided by the material tile size, so detail keeps human scale.

type V3 = readonly [number, number, number];
type UV = readonly [number, number];

function fromTriangles(triangles: readonly (readonly [V3, V3, V3])[], uvs: readonly (readonly [UV, UV, UV])[]): THREE.BufferGeometry {
  const positions = new Float32Array(triangles.length * 9), coordinates = new Float32Array(triangles.length * 6);
  triangles.forEach((triangle, index) => {
    triangle.forEach((vertex, corner) => positions.set(vertex, index * 9 + corner * 3));
    (uvs[index] ?? []).forEach((uv, corner) => coordinates.set(uv, index * 6 + corner * 2));
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(coordinates, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function boxGeometry(width: number, height: number, depth: number, tile: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute('uv');
  const faces: readonly (readonly [number, number])[] = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
  faces.forEach(([u, v], face) => {
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = face * 4 + vertex;
      uv.setXY(index, (uv.getX(index) * u) / tile, (uv.getY(index) * v) / tile);
    }
  });
  uv.needsUpdate = true;
  return geometry;
}

export function cylinderGeometry(radius: number, height: number, tile: number): THREE.BufferGeometry {
  // 16 segments include the ±X/±Z extremes, so the mesh bounds equal the cylinder collider bounds.
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 16, 1);
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, (uv.getX(index) * 2 * Math.PI * radius) / tile, (uv.getY(index) * height) / tile);
  uv.needsUpdate = true;
  return geometry;
}

/** Ridge along local Z at y = rise; eaves at y = 0. */
export function gableRoofGeometry(width: number, depth: number, rise: number, overhang: number, tile: number): THREE.BufferGeometry {
  const hw = width / 2 + overhang, hd = depth / 2 + overhang;
  const A: V3 = [-hw, 0, hd], B: V3 = [-hw, 0, -hd], C: V3 = [0, rise, -hd], D: V3 = [0, rise, hd];
  const E: V3 = [hw, 0, hd], F: V3 = [hw, 0, -hd];
  const slope = Math.hypot(hw, rise) / tile;
  const left = (v: V3): UV => [v[2] / tile, v[1] === 0 ? 0 : slope];
  const flat = (v: V3): UV => [v[0] / tile, v[1] / tile];
  const under = (v: V3): UV => [v[0] / tile, v[2] / tile];
  const triangles: (readonly [V3, V3, V3])[] = [[A, D, C], [A, C, B], [E, F, C], [E, C, D], [A, E, D], [B, C, F], [A, B, F], [A, F, E]];
  const uvs = triangles.map((triangle, index) => triangle.map(index < 4 ? left : index < 6 ? flat : under) as unknown as readonly [UV, UV, UV]);
  return fromTriangles(triangles, uvs);
}

export function pyramidRoofGeometry(width: number, depth: number, rise: number, overhang: number, tile: number): THREE.BufferGeometry {
  const hw = width / 2 + overhang, hd = depth / 2 + overhang;
  const A: V3 = [-hw, 0, hd], B: V3 = [-hw, 0, -hd], E: V3 = [hw, 0, hd], F: V3 = [hw, 0, -hd], apex: V3 = [0, rise, 0];
  const triangles: (readonly [V3, V3, V3])[] = [[A, E, apex], [E, F, apex], [F, B, apex], [B, A, apex], [A, B, F], [A, F, E]];
  const uv = (v: V3): UV => [(v[0] + v[2]) / tile, (v[1] * 1.5) / tile];
  return fromTriangles(triangles, triangles.map((triangle) => triangle.map(uv) as unknown as readonly [UV, UV, UV]));
}

export function planeGeometry(width: number, depth: number, tile: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, (uv.getX(index) * width) / tile, (uv.getY(index) * depth) / tile);
  uv.needsUpdate = true;
  return geometry;
}

/** Clustered, flattened blobs that never leave the sphere of `radius` squashed to 0.8 in height. */
export function crownGeometry(radius: number, seed: number): THREE.BufferGeometry {
  const random = createRandom(seed);
  const blobs = [{ r: radius * 0.62, x: 0, y: 0, z: 0 }];
  for (let index = 0; index < 6; index += 1) {
    const r = radius * (0.36 + random() * 0.14), angle = random() * Math.PI * 2, reach = (radius - r) * (0.45 + random() * 0.55);
    const lift = (random() * 2 - 1) * (radius - r) * 0.5;
    blobs.push({ r, x: Math.cos(angle) * reach, y: lift, z: Math.sin(angle) * reach });
  }
  const parts = blobs.map((blob) => new THREE.IcosahedronGeometry(blob.r, 1).translate(blob.x, blob.y, blob.z));
  const total = parts.reduce((sum, part) => sum + part.getAttribute('position').count, 0);
  const positions = new Float32Array(total * 3);
  let offset = 0;
  const inward = new Map<string, number>();
  parts.forEach((part, blobIndex) => {
    const source = part.getAttribute('position'), blob = blobs[blobIndex]!;
    for (let index = 0; index < source.count; index += 1) {
      const x = source.getX(index), y = source.getY(index), z = source.getZ(index);
      const key = `${blobIndex}:${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      if (!inward.has(key)) inward.set(key, 0.86 + random() * 0.14);
      const factor = inward.get(key)!;
      // Pull shared vertices toward the blob centre only, keeping faces closed and bounds inside the envelope.
      positions.set([blob.x + (x - blob.x) * factor, (blob.y + (y - blob.y) * factor) * 0.8, blob.z + (z - blob.z) * factor], offset);
      offset += 3;
    }
    part.dispose();
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(total * 2).map((_, index) => (positions[Math.floor(index / 2) * 3 + (index % 2) * 2] ?? 0) / 2), 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

/** Jittered grid of small stones inside a patch; heights never exceed `stoneHeight`. */
export function cobbleInstances(size: readonly [number, number], stoneHeight: number, count: number, seed: number) {
  const random = createRandom(seed);
  const rows = Math.max(1, Math.round(Math.sqrt((count * size[1]) / size[0]))), columns = Math.ceil(count / rows);
  const cellX = size[0] / columns, cellZ = size[1] / rows;
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const matrices: THREE.Matrix4[] = [], tones: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % columns, row = Math.floor(index / columns);
    const x = -size[0] / 2 + (column + 0.5 + (random() - 0.5) * 0.5) * cellX;
    const z = -size[1] / 2 + (row + 0.5 + (random() - 0.5) * 0.5) * cellZ;
    rotation.setFromAxisAngle(up, random() * Math.PI);
    const scale = new THREE.Vector3(Math.min(cellX, 0.2) * (0.75 + random() * 0.25), 2 * stoneHeight * (0.8 + random() * 0.2), Math.min(cellZ, 0.22) * (0.75 + random() * 0.25));
    matrices.push(matrix.compose(new THREE.Vector3(x, 0, z), rotation, scale).clone());
    tones.push(0.82 + random() * 0.3);
  }
  return { matrices, tones };
}

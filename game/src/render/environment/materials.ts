import * as THREE from 'three';
import { MATERIAL_COLORS } from '../../content/environment/index.ts';
import type { MaterialKey } from '../../content/environment/index.ts';
import { createRandom } from './random.ts';

// Self-authored procedural detail textures (greyscale, tinted by the shared palette). No image assets.

const SIZE = 128;
type Pattern = 'earth' | 'grass' | 'flagstones' | 'ashlar' | 'brick' | 'plaster' | 'planks' | 'fence' | 'shingles' | 'tiles' | 'bark' | 'foliage';
type Spec = { pattern: Pattern | null; tile: number; roughness: number; surface?: boolean; flat?: boolean };

const SPECS: Readonly<Record<MaterialKey, Spec>> = {
  'packed-earth': { pattern: 'earth', tile: 4, roughness: 1, surface: true },
  'worn-grass': { pattern: 'grass', tile: 4, roughness: 1, surface: true },
  'stone-patch': { pattern: 'flagstones', tile: 3, roughness: 0.95, surface: true },
  cobbles: { pattern: null, tile: 1, roughness: 0.9, surface: true },
  limestone: { pattern: 'ashlar', tile: 3, roughness: 0.92 },
  brick: { pattern: 'brick', tile: 1.6, roughness: 0.9 },
  plaster: { pattern: 'plaster', tile: 3, roughness: 0.97 },
  timber: { pattern: 'planks', tile: 2, roughness: 0.85 },
  'dark-timber': { pattern: 'planks', tile: 2, roughness: 0.85 },
  'roof-shingle': { pattern: 'shingles', tile: 2, roughness: 0.95 },
  'roof-tile': { pattern: 'tiles', tile: 2, roughness: 0.9 },
  'plank-fence': { pattern: 'fence', tile: 2, roughness: 0.9 },
  bark: { pattern: 'bark', tile: 1.5, roughness: 1 },
  foliage: { pattern: 'foliage', tile: 2, roughness: 1, flat: true },
  'foliage-dark': { pattern: 'foliage', tile: 2, roughness: 1, flat: true },
  'opening-dark': { pattern: null, tile: 1, roughness: 1 },
};

/** Tileable value noise on an 8×8 lattice. */
function latticeNoise(random: () => number): (x: number, y: number) => number {
  const cells = 8, values = Array.from({ length: cells * cells }, random);
  const at = (i: number, j: number) => values[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells] ?? 0;
  return (x, y) => {
    const u = (x / SIZE) * cells, v = (y / SIZE) * cells, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const top = at(i, j) * (1 - fu) + at(i + 1, j) * fu, bottom = at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu;
    return top * (1 - fv) + bottom * fv;
  };
}

function shade(pattern: Pattern, seed: number): (x: number, y: number) => number {
  const random = createRandom(seed), low = latticeNoise(random), grain = () => random();
  const rowTone = Array.from({ length: 32 }, () => 0.82 + random() * 0.18);
  const offsets = Array.from({ length: 32 }, () => Math.floor(random() * 40));
  switch (pattern) {
    case 'earth': return (x, y) => 0.78 + 0.14 * low(x, y) + 0.08 * grain();
    case 'grass': return (x, y) => 0.7 + 0.22 * low(x, y) + 0.1 * grain();
    case 'plaster': return (x, y) => 0.88 + 0.08 * low(x, y) + 0.03 * grain();
    case 'foliage': return (x, y) => 0.65 + 0.25 * low(x * 2, y * 2) + 0.1 * grain();
    case 'bark': return (x, y) => 0.68 + 0.2 * low(x * 3, y / 4) + 0.08 * grain();
    case 'flagstones': return (x, y) => {
      const cell = 32, i = Math.floor(x / cell), j = Math.floor(y / cell), joint = Math.min(x % cell, y % cell, cell - (x % cell), cell - (y % cell));
      return joint < 1.5 ? 0.5 : (rowTone[(i * 7 + j * 3) % 32] ?? 0.9) - 0.05 * grain();
    };
    case 'ashlar': return (x, y) => {
      const row = Math.floor(y / 16), shifted = (x + (offsets[row % 32] ?? 0)) % SIZE, block = Math.floor(shifted / 40);
      const mortar = y % 16 < 1.5 || shifted % 40 < 1.5;
      return mortar ? 0.62 : (rowTone[(row * 5 + block) % 32] ?? 0.9) - 0.04 * grain();
    };
    case 'brick': return (x, y) => {
      const row = Math.floor(y / 8), shifted = (x + (row % 2) * 12) % SIZE, mortar = y % 8 < 1 || shifted % 24 < 1;
      return mortar ? 0.72 : (rowTone[(row * 3 + Math.floor(shifted / 24)) % 32] ?? 0.9) - 0.06 * grain();
    };
    case 'planks': case 'fence': return (x, y) => {
      const column = Math.floor(x / 16), gap = x % 16 < (pattern === 'fence' ? 2.5 : 1);
      return gap ? (pattern === 'fence' ? 0.3 : 0.55) : (rowTone[column % 32] ?? 0.9) + 0.05 * Math.sin(y * 0.35 + column * 1.7) - 0.05 * grain();
    };
    case 'shingles': return (x, y) => {
      const row = Math.floor(y / 10), shifted = (x + (row % 2) * 6) % SIZE, edge = y % 10 < 1.5 || shifted % 12 < 1;
      return edge ? 0.55 : (rowTone[(row + Math.floor(shifted / 12)) % 32] ?? 0.85) - 0.06 * grain();
    };
    case 'tiles': return (x, y) => {
      const edge = y % 12 < 1.5;
      return edge ? 0.55 : 0.8 + 0.18 * Math.abs(Math.sin((x * Math.PI) / 10)) - 0.05 * grain();
    };
  }
}

function detailTexture(pattern: Pattern, seed: number): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4), sample = shade(pattern, seed);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const value = Math.round(255 * Math.min(1, Math.max(0, sample(x, y)))), index = (y * SIZE + x) * 4;
      data[index] = value; data[index + 1] = value; data[index + 2] = value; data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type EnvironmentMaterials = ReturnType<typeof createEnvironmentMaterials>;

export function createEnvironmentMaterials() {
  const textures: THREE.Texture[] = [];
  const materials = new Map<MaterialKey, THREE.MeshStandardMaterial>();
  (Object.keys(SPECS) as MaterialKey[]).forEach((key, index) => {
    const spec = SPECS[key];
    const map = spec.pattern ? detailTexture(spec.pattern, 1009 + index * 97) : null;
    if (map) textures.push(map);
    const material = new THREE.MeshStandardMaterial({
      color: MATERIAL_COLORS[key], map, roughness: spec.roughness, metalness: 0, flatShading: spec.flat ?? false,
    });
    material.name = `environment:${key}`;
    if (spec.surface) {
      // Coplanar surface patches sit millimetres above the ground; offset keeps them from z-fighting at distance.
      material.polygonOffset = true;
      material.polygonOffsetFactor = -2;
      material.polygonOffsetUnits = -2;
    }
    materials.set(key, material);
  });
  let disposed = false;
  return {
    get(key: MaterialKey): THREE.MeshStandardMaterial {
      const material = materials.get(key);
      if (!material) throw new Error(`Unknown environment material ${key}`);
      return material;
    },
    tileSize: (key: MaterialKey): number => SPECS[key].tile,
    textureCount: (): number => textures.length,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const material of materials.values()) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}

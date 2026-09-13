import type { Vec3 } from '../yardLayout.ts';
import type { CollisionClass, ElementGeometry, ElementRole, EnvironmentElement, MaterialKey } from './types.ts';

// Reusable blockout kit: element constructors, six house variants (DR-04), three tree forms (DR-08).

const QUARTER = Math.PI / 2;
/** Rounds authoring noise and removes negative zero so data compares deterministically. */
export const round = (value: number): number => (Math.round(value * 1e6) / 1e6) || 0;

type ElementSpec = {
  id: string; objectId: string; componentId: string; role: ElementRole; collision: CollisionClass;
  geometry: ElementGeometry; position: Vec3; yaw?: number; material: MaterialKey;
};
export function element(spec: ElementSpec): EnvironmentElement {
  return {
    id: spec.id, objectId: spec.objectId, componentId: spec.componentId, role: spec.role, collision: spec.collision,
    geometry: spec.geometry,
    position: { x: round(spec.position.x), y: round(spec.position.y), z: round(spec.position.z) },
    yaw: round(spec.yaw ?? 0), material: spec.material,
  };
}

/** Plank plot fence between two points on one axis (DR-06). */
export function fence(id: string, from: { x: number; z: number }, to: { x: number; z: number }): EnvironmentElement {
  const alongX = Math.abs(to.x - from.x) >= Math.abs(to.z - from.z);
  const length = alongX ? Math.abs(to.x - from.x) : Math.abs(to.z - from.z);
  return element({
    id, objectId: 'plot-boundaries', componentId: 'plank-fence', role: 'boundary', collision: 'solid', material: 'plank-fence',
    geometry: { kind: 'box', size: alongX ? [length, 1.8, 0.1] : [0.1, 1.8, length] },
    position: { x: (from.x + to.x) / 2, y: 0.9, z: (from.z + to.z) / 2 },
  });
}

/** Render-only ground surface; `layer` separates coplanar patches by 4 mm steps, never above 30 mm. */
export function plane(id: string, material: 'packed-earth' | 'worn-grass' | 'stone-patch', x: number, z: number,
  width: number, depth: number, options: { groundY?: number; layer?: number; yaw?: number } = {}): EnvironmentElement {
  const layer = Math.min(5, Math.max(0, options.layer ?? 0));
  return element({
    id, objectId: 'route-surfaces', componentId: material, role: 'surface', collision: 'surface', material,
    geometry: { kind: 'plane', size: [width, depth] },
    position: { x, y: (options.groundY ?? 0) + 0.004 * (layer + 1), z }, yaw: options.yaw ?? 0,
  });
}

export function cobbles(id: string, x: number, z: number, width: number, depth: number, seed: number, groundY = 0): EnvironmentElement {
  return element({
    id, objectId: 'route-surfaces', componentId: 'cobbles', role: 'surface', collision: 'surface', material: 'cobbles',
    geometry: { kind: 'cobble-patch', size: [width, depth], stoneHeight: 0.025, count: Math.round(width * depth * 14), seed },
    position: { x, y: groundY, z },
  });
}

export type TreeForm = 'broad' | 'pollard' | 'fruit';
const TREE_FORMS: Readonly<Record<TreeForm, { trunkRadius: number; crownRadius: number; crownCentre: number }>> = {
  broad: { trunkRadius: 0.3, crownRadius: 2.8, crownCentre: 5.0 },
  pollard: { trunkRadius: 0.38, crownRadius: 1.7, crownCentre: 4.1 },
  fruit: { trunkRadius: 0.16, crownRadius: 1.5, crownCentre: 3.9 },
};
// The trunk ends a quarter radius below the crown centre, inside the crown's central blob, so crowns never float.
const TRUNK_INTO_CROWN = 0.25;
export function tree(id: string, form: TreeForm, x: number, z: number, seed: number, groundY = 0): EnvironmentElement[] {
  const spec = TREE_FORMS[form];
  const objectId = `tree-form-${form}`;
  const trunkHeight = spec.crownCentre - spec.crownRadius * TRUNK_INTO_CROWN;
  return [
    element({ id: `${id}-trunk`, objectId, componentId: 'trunk', role: 'vegetation', collision: 'solid', material: 'bark',
      geometry: { kind: 'cylinder', radius: spec.trunkRadius, height: trunkHeight },
      position: { x, y: groundY + trunkHeight / 2, z } }),
    element({ id: `${id}-crown`, objectId, componentId: 'crown', role: 'vegetation', collision: 'overhead',
      material: form === 'pollard' ? 'foliage-dark' : 'foliage',
      geometry: { kind: 'crown', radius: spec.crownRadius, seed }, position: { x, y: groundY + spec.crownCentre, z } }),
  ];
}

// Houses are authored in a local frame: width along local X, depth along local Z, front face at +depth/2.
type LocalPart = {
  componentId: string; role: ElementRole; collision: CollisionClass; geometry: ElementGeometry;
  local: Vec3; localYaw?: number; material: MaterialKey;
};
export type HouseVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type Dimensions = { width: number; depth: number };

const solidBox = (componentId: string, role: ElementRole, material: MaterialKey, size: [number, number, number], local: Vec3): LocalPart =>
  ({ componentId, role, collision: 'solid', material, geometry: { kind: 'box', size }, local });
const inset = (material: MaterialKey, width: number, height: number, x: number, y: number, depth: number): LocalPart =>
  ({ componentId: 'openings', role: 'detail', collision: 'inset', material, geometry: { kind: 'box', size: [width, height, 0.06] }, local: { x, y, z: depth / 2 + 0.015 } });
const gable = (width: number, depth: number, height: number, rise: number, overhang: number, eavesToStreet: boolean, material: MaterialKey): LocalPart => ({
  componentId: 'roof', role: 'roof', collision: 'overhead', material,
  geometry: eavesToStreet ? { kind: 'gable-roof', width: depth, depth: width, rise, overhang } : { kind: 'gable-roof', width, depth, rise, overhang },
  local: { x: 0, y: height, z: 0 }, localYaw: eavesToStreet ? QUARTER : 0,
});
function shell(d: Dimensions, plinth: number, height: number, walls: MaterialKey): LocalPart[] {
  return [
    solidBox('plinth', 'structure', 'limestone', [d.width + 0.16, plinth, d.depth + 0.16], { x: 0, y: plinth / 2, z: 0 }),
    solidBox('walls', 'structure', walls, [d.width, height - plinth, d.depth], { x: 0, y: plinth + (height - plinth) / 2, z: 0 }),
  ];
}
const threshold = (doorWidth: number, doorX: number, depth: number): LocalPart =>
  solidBox('threshold', 'step', 'limestone', [doorWidth + 0.4, 0.18, 0.4], { x: doorX, y: 0.09, z: depth / 2 + 0.28 });

const VARIANTS: Readonly<Record<HouseVariant, { defaults: Dimensions; parts: (d: Dimensions) => LocalPart[] }>> = {
  // H1 booth: one storey, eaves to street.
  h1: { defaults: { width: 4.6, depth: 5 }, parts: (d) => [
    ...shell(d, 0.3, 2.8, 'dark-timber'), gable(d.width, d.depth, 2.8, 1.7, 0.35, true, 'roof-shingle'),
    inset('opening-dark', 0.9, 1.8, 0, 0.3 + 0.9, d.depth), inset('opening-dark', 0.5, 0.4, d.width / 2 - 0.9, 1.6, d.depth),
    threshold(0.9, 0, d.depth),
  ] },
  // H2 gable-timber: one and a half storeys, gable to street.
  h2: { defaults: { width: 6, depth: 9 }, parts: (d) => [
    ...shell(d, 0.35, 3.8, 'timber'), gable(d.width, d.depth, 3.8, 3.2, 0.3, false, 'roof-shingle'),
    inset('dark-timber', 1.0, 1.9, -d.width / 2 + 1.4, 0.35 + 0.95, d.depth),
    inset('opening-dark', 0.6, 0.5, d.width / 2 - 1.5, 1.7, d.depth), inset('opening-dark', 0.6, 0.5, 0, 3.0, d.depth),
    threshold(1.0, -d.width / 2 + 1.4, d.depth),
  ] },
  // H3 stone ground floor with a plastered timber upper storey, eaves to street.
  h3: { defaults: { width: 8, depth: 8 }, parts: (d) => [
    solidBox('plinth', 'structure', 'limestone', [d.width + 0.16, 0.4, d.depth + 0.16], { x: 0, y: 0.2, z: 0 }),
    solidBox('walls-ground', 'structure', 'limestone', [d.width, 2.5, d.depth], { x: 0, y: 1.65, z: 0 }),
    solidBox('walls-upper', 'structure', 'plaster', [d.width, 2.9, d.depth], { x: 0, y: 4.35, z: 0 }),
    gable(d.width, d.depth, 5.8, 2.6, 0.3, true, 'roof-tile'),
    inset('dark-timber', 1.1, 2.0, d.width / 2 - 1.8, 0.4 + 1.0, d.depth),
    inset('opening-dark', 0.6, 0.6, -d.width / 2 + 2, 1.8, d.depth),
    inset('opening-dark', 0.7, 0.8, -d.width / 2 + 2, 4.3, d.depth), inset('opening-dark', 0.7, 0.8, d.width / 2 - 2, 4.3, d.depth),
    threshold(1.1, d.width / 2 - 1.8, d.depth),
  ] },
  // H4 narrow gable house with a rear lean-to.
  h4: { defaults: { width: 4.6, depth: 10 }, parts: (d) => [
    ...shell(d, 0.35, 4.4, 'plaster'), gable(d.width, d.depth, 4.4, 3.0, 0.3, false, 'roof-shingle'),
    solidBox('lean-to', 'structure', 'timber', [3.0, 2.4, 2.6], { x: 0, y: 1.2, z: -d.depth / 2 - 1.3 }),
    { componentId: 'lean-to-roof', role: 'roof', collision: 'overhead', material: 'roof-shingle',
      geometry: { kind: 'box', size: [3.3, 0.12, 2.9] }, local: { x: 0, y: 2.46, z: -d.depth / 2 - 1.3 } },
    inset('dark-timber', 0.9, 1.9, -0.9, 0.35 + 0.95, d.depth), inset('opening-dark', 0.5, 0.5, 1.2, 1.8, d.depth),
    inset('opening-dark', 0.5, 0.6, 0, 3.5, d.depth), threshold(0.9, -0.9, d.depth),
  ] },
  // H5 portik house: a real 2.6 m wide and 2.6 m high gateway through the whole depth.
  h5: { defaults: { width: 10, depth: 8 }, parts: (d) => {
    const side = (d.width - 2.6) / 2, centre = 1.3 + side / 2;
    const plinthWidth = side + 0.08, plinthCentre = 1.3 + plinthWidth / 2;
    return [
      solidBox('plinth', 'structure', 'limestone', [plinthWidth, 0.35, d.depth + 0.16], { x: -plinthCentre, y: 0.175, z: 0 }),
      solidBox('plinth', 'structure', 'limestone', [plinthWidth, 0.35, d.depth + 0.16], { x: plinthCentre, y: 0.175, z: 0 }),
      solidBox('walls', 'structure', 'plaster', [side, 5.05, d.depth], { x: -centre, y: 2.875, z: 0 }),
      solidBox('walls', 'structure', 'plaster', [side, 5.05, d.depth], { x: centre, y: 2.875, z: 0 }),
      solidBox('lintel', 'structure', 'timber', [2.6, 2.8, d.depth], { x: 0, y: 4.0, z: 0 }),
      solidBox('passage-sill', 'step', 'limestone', [2.6, 0.1, 0.4], { x: 0, y: 0.05, z: d.depth / 2 - 0.2 }),
      { componentId: 'passage-floor', role: 'surface', collision: 'surface', material: 'stone-patch',
        geometry: { kind: 'plane', size: [2.6, d.depth - 0.4] }, local: { x: 0, y: 0.008, z: -0.2 } },
      gable(d.width, d.depth, 5.4, 2.8, 0.3, true, 'roof-shingle'),
      inset('opening-dark', 0.7, 0.7, -centre, 4.0, d.depth), inset('opening-dark', 0.7, 0.7, centre, 4.0, d.depth),
      inset('opening-dark', 0.5, 0.5, -centre, 1.7, d.depth),
    ];
  } },
  // H6 low workshop with wide doors and a rear store.
  h6: { defaults: { width: 9, depth: 6 }, parts: (d) => [
    ...shell(d, 0.3, 3.1, 'timber'), gable(d.width, d.depth, 3.1, 1.9, 0.4, true, 'roof-shingle'),
    solidBox('rear-store', 'structure', 'dark-timber', [d.width - 3, 2.0, 2.2], { x: -1, y: 1.0, z: -d.depth / 2 - 1.1 }),
    { componentId: 'rear-store-roof', role: 'roof', collision: 'overhead', material: 'roof-shingle',
      geometry: { kind: 'box', size: [d.width - 2.7, 0.12, 2.5] }, local: { x: -1, y: 2.06, z: -d.depth / 2 - 1.1 } },
    inset('dark-timber', 2.2, 2.1, -d.width / 2 + 2.0, 0.3 + 1.05, d.depth), inset('opening-dark', 0.7, 0.5, d.width / 2 - 1.6, 1.7, d.depth),
    threshold(2.2, -d.width / 2 + 2.0, d.depth),
  ] },
};
export const HOUSE_VARIANTS: readonly HouseVariant[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export type Facing = '+x' | '-x' | '+z';
const FACING_YAW: Readonly<Record<Facing, number>> = { '+x': QUARTER, '-x': -QUARTER, '+z': 0 };

/**
 * Places a house by its street front. `front` is the facade line coordinate, `from`/`to` the span along the
 * street, `jitter` a small heading change in radians for irregular facade lines (DR-11).
 */
export function placeHouse(id: string, variant: HouseVariant, placement: {
  facing: Facing; front: number; from: number; to: number; depth?: number; jitter?: number;
}): EnvironmentElement[] {
  const definition = VARIANTS[variant];
  const width = Math.abs(placement.to - placement.from);
  const dimensions = { width, depth: placement.depth ?? definition.defaults.depth };
  const along = (placement.from + placement.to) / 2;
  const half = dimensions.depth / 2;
  const centre = placement.facing === '+x' ? { x: placement.front - half, z: along }
    : placement.facing === '-x' ? { x: placement.front + half, z: along } : { x: along, z: placement.front - half };
  const yaw = FACING_YAW[placement.facing] + (placement.jitter ?? 0);
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const counts = new Map<string, number>();
  const parts = definition.parts(dimensions);
  const totals = new Map<string, number>();
  for (const part of parts) totals.set(part.componentId, (totals.get(part.componentId) ?? 0) + 1);
  return parts.map((part) => {
    const index = (counts.get(part.componentId) ?? 0) + 1;
    counts.set(part.componentId, index);
    const suffix = (totals.get(part.componentId) ?? 1) > 1 ? `-${index}` : '';
    return element({
      id: `${id}-${part.componentId}${suffix}`, objectId: `house-variant-${variant}`, componentId: part.componentId,
      role: part.role, collision: part.collision, geometry: part.geometry, material: part.material,
      position: { x: centre.x + part.local.x * cos + part.local.z * sin, y: part.local.y, z: centre.z - part.local.x * sin + part.local.z * cos },
      yaw: yaw + (part.localYaw ?? 0),
    });
  });
}

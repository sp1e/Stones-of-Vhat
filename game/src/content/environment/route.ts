import { cobbles, element, fence, placeHouse, plane, tree } from './kit.ts';
import { PLATEAU_TOP } from './landmarks.ts';
import type { Checkpoint, EnvironmentElement, Route } from './types.ts';

// Connective route (DR-01): Rådhus approach → Storgata → portik or alley → open space → S:t Per.
// Authored blockout metres; no georeferencing, no traced map, no measured street widths.

export const MAP_BOUNDS = { minX: -30.3, maxX: 32.3, minZ: -80.3, maxZ: 52.3 } as const;
export const SPAWN = { x: 0, y: 1, z: 47 } as const;

const ground = element({
  id: 'site-ground', objectId: 'site-ground', componentId: 'base', role: 'ground', collision: 'solid', material: 'packed-earth',
  geometry: { kind: 'box', size: [82, 1, 152] }, position: { x: 1, y: -0.5, z: -14 },
});

function houses(): EnvironmentElement[] {
  return [
    // Rådhus approach, west side.
    ...placeHouse('approach-w1', 'h1', { facing: '+x', front: -9, from: 50, to: 45.4, jitter: 0.01 }),
    ...placeHouse('approach-w2', 'h3', { facing: '+x', front: -9, from: 43, to: 35, jitter: -0.012 }),
    // Storgata west row (fronts toward +x).
    ...placeHouse('storgata-w1', 'h2', { facing: '+x', front: -3.0, from: 29, to: 22, jitter: 0.02 }),
    ...placeHouse('storgata-w2', 'h4', { facing: '+x', front: -3.4, from: 22, to: 17.4, jitter: -0.015 }),
    ...placeHouse('storgata-w3', 'h5', { facing: '+x', front: -3.0, from: 17.4, to: 7.4 }),
    ...placeHouse('storgata-w4', 'h6', { facing: '+x', front: -2.7, from: 7.4, to: -1, jitter: 0.012 }),
    // Storgata east row (fronts toward -x); the gap at z 19–21 leads to courtyard 2.
    ...placeHouse('storgata-e1', 'h3', { facing: '-x', front: 3.2, from: 30, to: 21, jitter: -0.01 }),
    ...placeHouse('storgata-e2', 'h6', { facing: '-x', front: 2.6, from: 19, to: 10, jitter: 0.008 }),
    ...placeHouse('storgata-e3a', 'h1', { facing: '-x', front: 3.0, from: 10, to: 5.4, jitter: -0.006 }),
    ...placeHouse('storgata-e3b', 'h4', { facing: '-x', front: 3.0, from: 5.4, to: 0.8, jitter: 0.018 }),
    // Storgata dead-ends against two houses facing north (+z toward the street).
    ...placeHouse('street-end-s1a', 'h2', { facing: '+z', front: -1, from: -11, to: -4, jitter: 0.01 }),
    ...placeHouse('street-end-s1b', 'h3', { facing: '+z', front: -1, from: -4, to: 4.9, jitter: -0.008 }),
    // East alley: its south leg runs between s1b and e4.
    ...placeHouse('alley-e4', 'h2', { facing: '-x', front: 6.8, from: 0.8, to: -8, depth: 5.2 }),
    // Lane west and the open space edges.
    ...placeHouse('lane-w5', 'h1', { facing: '+x', front: -18, from: -2, to: -6.6, jitter: -0.01 }),
    ...placeHouse('open-w1', 'h6', { facing: '+x', front: -23.5, from: -11, to: -19.4, depth: 4.2, jitter: 0.015 }),
    ...placeHouse('open-w2', 'h1', { facing: '+x', front: -24, from: -20.5, to: -25.1, jitter: -0.02 }),
    ...placeHouse('open-e1', 'h2', { facing: '-x', front: 14, from: -9.5, to: -16.5, jitter: 0.012 }),
    ...placeHouse('open-e2', 'h1', { facing: '-x', front: 15, from: -19, to: -23.6, jitter: -0.01 }),
  ];
}

function boundaries(): EnvironmentElement[] {
  const f = (id: string, x0: number, z0: number, x1: number, z1: number) => fence(`fence-${id}`, { x: x0, z: z0 }, { x: x1, z: z1 });
  return [
    f('approach-north', -14, 52, 22, 52),
    f('approach-west-1', -9, 52, -9, 50),
    f('approach-west-2', -9, 45.4, -9, 43),
    f('approach-west-3', -9, 35, -9, 29),
    f('east-boundary', 22, 52, 22, -30.3),
    f('courtyard-2-east-north', 17, 30, 17, 17.2),
    f('courtyard-2-east-south', 17, 14.8, 17, 10),
    f('courtyard-2-south', 8.6, 10, 17, 10),
    f('courtyard-1-north', -22, 17.4, -13.4, 17.4),
    f('courtyard-1-west', -22, 17.4, -22, -2),
    f('courtyard-1-east', -11, 7.4, -11, -1),
    f('courtyard-1-south', -15.8, -2, -11, -2),
    f('lane-east', -15.8, -2, -15.8, -8),
    f('west-pocket', -30, -6.6, -23, -6.6),
    f('west-boundary', -30, -6.6, -30, -30.3),
    f('backlot-south', 12, -8, 22, -8),
    // The blocked threshold: a closed plank gate between two posts in courtyard 2 (DR-06).
    element({ id: 'courtyard-2-closed-gate', objectId: 'plot-boundaries', componentId: 'closed-gate', role: 'boundary', collision: 'solid',
      material: 'dark-timber', geometry: { kind: 'box', size: [0.12, 1.9, 2.0] }, position: { x: 17, y: 0.97, z: 16 } }),
    ...[17.1, 14.9].map((z, index) => element({ id: `courtyard-2-gate-post-${index + 1}`, objectId: 'plot-boundaries', componentId: 'gate-post',
      role: 'boundary', collision: 'solid', material: 'dark-timber', geometry: { kind: 'box', size: [0.2, 2.1, 0.2] }, position: { x: 17, y: 1.05, z } })),
  ];
}

function furnishing(): EnvironmentElement[] {
  const cover = (componentId: string, material: 'dark-timber' | 'timber' | 'limestone', size: [number, number, number], x: number, z: number, yaw = 0) =>
    element({ id: `open-space-${componentId}`, objectId: 'open-space-cover', componentId, role: 'cover', collision: 'solid', material,
      geometry: { kind: 'box', size }, position: { x, y: size[1] / 2, z }, yaw });
  return [
    cover('cart', 'dark-timber', [1.5, 1.1, 2.8], -8, -18, 0.35),
    cover('timber-stack', 'timber', [3.2, 1.0, 1.2], 6, -14),
    cover('wall-fragment', 'limestone', [3.5, 1.2, 0.6], 10, -24, -0.2),
    element({ id: 'courtyard-1-well', objectId: 'courtyard-furnishing', componentId: 'well', role: 'cover', collision: 'solid', material: 'limestone',
      geometry: { kind: 'cylinder', radius: 0.9, height: 0.85 }, position: { x: -14.5, y: 0.425, z: 2 } }),
    ...tree('courtyard-1-tree', 'fruit', -19.5, 12, 11),
    ...tree('courtyard-2-tree', 'pollard', 13.2, 24, 23),
    ...tree('open-space-tree', 'broad', -19, -25, 37),
  ];
}

function surfaces(): EnvironmentElement[] {
  return [
    plane('approach-grass-west', 'worn-grass', -6.5, 40, 4, 16, { yaw: 0.05 }),
    plane('approach-earth-track', 'packed-earth', 0, 38, 3.2, 18, { layer: 1, yaw: -0.03 }),
    plane('approach-stone-door', 'stone-patch', 8.2, 34, 2.8, 3.6, { layer: 2 }),
    cobbles('approach-cobbles', 3.5, 32.5, 7, 5, 101),
    plane('storgata-earth', 'packed-earth', 0, 12, 3.4, 30, { layer: 1, yaw: 0.01 }),
    plane('storgata-grass-west', 'worn-grass', -2.3, 20, 0.8, 8, { layer: 2 }),
    plane('storgata-grass-east', 'worn-grass', 2.0, 4, 0.7, 6, { layer: 2 }),
    cobbles('portik-mouth-cobbles', -0.6, 12.4, 4.2, 4.6, 202),
    plane('storgata-stone-end', 'stone-patch', 0.8, 0.2, 5, 2, { layer: 3 }),
    plane('courtyard-1-grass', 'worn-grass', -16.5, 8, 9, 14),
    plane('courtyard-1-stone', 'stone-patch', -14.5, 2, 3.4, 3.4, { layer: 1 }),
    plane('courtyard-2-grass', 'worn-grass', 13.5, 20, 6, 16),
    plane('alley-earth', 'packed-earth', 5.85, -4, 1.8, 10, { layer: 1 }),
    plane('lane-earth', 'packed-earth', -16.9, -5, 2.2, 6, { layer: 1 }),
    plane('open-space-stone', 'stone-patch', -2, -20, 6, 4, { layer: 1, yaw: 0.2 }),
    plane('open-space-grass-west', 'worn-grass', -20, -22, 8, 10),
    plane('open-space-grass-east', 'worn-grass', 10, -24, 6, 8, { yaw: -0.15 }),
    cobbles('church-gate-cobbles', 0, -26.8, 7, 3.6, 303),
  ];
}

export function routeElements(): EnvironmentElement[] {
  return [ground, ...houses(), ...boundaries(), ...furnishing(), ...surfaces()];
}

const checkpoint = (id: string, label: string, x: number, z: number, groundY = 0): Checkpoint =>
  ({ id, label, position: { x, y: groundY + 1, z }, radius: 1.2 });

export const CHECKPOINTS: readonly Checkpoint[] = [
  checkpoint('radhus-approach', 'Rådhusansats', SPAWN.x, SPAWN.z),
  checkpoint('storgata-north', 'Storgatan norr', 0, 26),
  checkpoint('storgata-narrows', 'Storgatans smalaste del', 0, 15),
  checkpoint('portik-east', 'Portikens gatumynning', -1.8, 12.4),
  checkpoint('portik-west', 'Portikens gårdssida', -12.2, 12.4),
  checkpoint('courtyard-1', 'Västra gården', -16.9, 5),
  checkpoint('lane-west', 'Västra gången', -16.9, -4),
  checkpoint('courtyard-2', 'Östra gården', 14.5, 16),
  checkpoint('alley-mouth', 'Östra grändens mynning', 4, -0.1),
  checkpoint('alley-bend', 'Grändens krök', 5.85, -3.5),
  checkpoint('open-space', 'Öppen plats', -4, -16),
  checkpoint('church-gate', 'Kyrkogårdsporten', 0, -27.5),
  checkpoint('st-per-north', 'S:t Per, norra sidan', 0, -40, PLATEAU_TOP),
];

const at = (id: string) => {
  const found = CHECKPOINTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown checkpoint ${id}`);
  return { x: found.position.x, z: found.position.z, checkpoint: id };
};

export const ROUTES: readonly Route[] = [
  { id: 'portik', waypoints: [
    at('radhus-approach'), at('storgata-north'), at('storgata-narrows'), at('portik-east'), at('portik-west'),
    at('courtyard-1'), at('lane-west'), { x: -16.9, z: -9.5 }, at('open-space'), at('church-gate'), at('st-per-north'),
  ] },
  { id: 'alley', waypoints: [
    at('radhus-approach'), at('storgata-north'), at('storgata-narrows'), { x: 0.5, z: 0.2 }, at('alley-mouth'),
    { x: 5.85, z: -0.1 }, at('alley-bend'), { x: 5.85, z: -10 }, at('open-space'), at('church-gate'), at('st-per-north'),
  ] },
];

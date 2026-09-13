import { element, plane } from './kit.ts';
import type { EnvironmentElement, TowerHypothesis } from './types.ts';

// Rådhuset (DR-02) and the whole church of S:t Per with its churchyard (DR-03, DR-06, DR-07).
// Phase-tagged silhouettes only; every size is authored blockout, not measurement.

export const PLATEAU_TOP = 0.45;
const QUARTER = Math.PI / 2;

function radhuset(hypothesis: TowerHypothesis): EnvironmentElement[] {
  const objectId = 'radhuset';
  const shared = [
    element({ id: 'radhuset-hall-core', objectId, componentId: 'hall-core', role: 'structure', collision: 'solid', material: 'limestone',
      geometry: { kind: 'box', size: [11, 7.5, 22] }, position: { x: 15.5, y: 3.75, z: 41 } }),
    element({ id: 'radhuset-hall-roof', objectId, componentId: 'hall-roof', role: 'roof', collision: 'overhead', material: 'roof-tile',
      geometry: { kind: 'gable-roof', width: 11, depth: 22, rise: 5, overhang: 0.3 }, position: { x: 15.5, y: 7.5, z: 41 } }),
    element({ id: 'radhuset-hall-door', objectId, componentId: 'hall-openings', role: 'detail', collision: 'inset', material: 'dark-timber',
      geometry: { kind: 'box', size: [0.06, 2.4, 1.6] }, position: { x: 9.985, y: 1.2, z: 34 } }),
    ...[33.5, 48].map((z, index) => element({ id: `radhuset-hall-window-${index + 1}`, objectId, componentId: 'hall-openings', role: 'detail',
      collision: 'inset', material: 'opening-dark', geometry: { kind: 'box', size: [0.06, 1.3, 0.8] }, position: { x: 9.985, y: 5.2, z } })),
  ];
  const tower = hypothesis === 'partial'
    ? [element({ id: 'radhuset-tower-partial', objectId, componentId: 'tower-partial', role: 'structure', collision: 'solid', material: 'limestone',
      geometry: { kind: 'box', size: [5, 9, 5] }, position: { x: 7.5, y: 4.5, z: 41 } })]
    : [
      element({ id: 'radhuset-tower-complete', objectId, componentId: 'tower-complete', role: 'structure', collision: 'solid', material: 'limestone',
        geometry: { kind: 'box', size: [5, 21, 5] }, position: { x: 7.5, y: 10.5, z: 41 } }),
      element({ id: 'radhuset-tower-complete-roof', objectId, componentId: 'tower-complete-roof', role: 'roof', collision: 'overhead', material: 'roof-shingle',
        geometry: { kind: 'pyramid-roof', width: 5, depth: 5, rise: 6, overhang: 0.2 }, position: { x: 7.5, y: 21, z: 41 } }),
    ];
  return [...shared, ...tower];
}

/** Later-phase geometry kept in the catalogue so the baseline filter has a real negative control (DR-02). */
export const LATER_PHASE_ELEMENTS: readonly EnvironmentElement[] = [
  element({ id: 'radhuset-lantern-1691', objectId: 'radhuset', componentId: 'lantern-1691', role: 'roof', collision: 'overhead', material: 'dark-timber',
    geometry: { kind: 'box', size: [2, 2.5, 2] }, position: { x: 15.5, y: 13.75, z: 41 } }),
];

function stPer(): EnvironmentElement[] {
  const objectId = 'st-per', g = PLATEAU_TOP;
  return [
    element({ id: 'st-per-west-tower', objectId, componentId: 'west-tower', role: 'structure', collision: 'solid', material: 'brick',
      geometry: { kind: 'box', size: [9, 32, 9] }, position: { x: -15.5, y: g + 16, z: -55 } }),
    element({ id: 'st-per-west-tower-roof', objectId, componentId: 'west-tower-roof', role: 'roof', collision: 'overhead', material: 'roof-shingle',
      geometry: { kind: 'pyramid-roof', width: 9, depth: 9, rise: 7, overhang: 0.2 }, position: { x: -15.5, y: g + 32, z: -55 } }),
    element({ id: 'st-per-nave', objectId, componentId: 'nave', role: 'structure', collision: 'solid', material: 'limestone',
      geometry: { kind: 'box', size: [27, 11, 18] }, position: { x: 2.5, y: g + 5.5, z: -55 } }),
    element({ id: 'st-per-nave-roof', objectId, componentId: 'nave-roof', role: 'roof', collision: 'overhead', material: 'roof-tile',
      geometry: { kind: 'gable-roof', width: 18, depth: 27, rise: 9, overhang: 0.4 }, position: { x: 2.5, y: g + 11, z: -55 }, yaw: QUARTER }),
    element({ id: 'st-per-choir', objectId, componentId: 'choir', role: 'structure', collision: 'solid', material: 'limestone',
      geometry: { kind: 'box', size: [10, 9, 10] }, position: { x: 21, y: g + 4.5, z: -55 } }),
    element({ id: 'st-per-choir-roof', objectId, componentId: 'choir-roof', role: 'roof', collision: 'overhead', material: 'roof-tile',
      geometry: { kind: 'gable-roof', width: 10, depth: 10, rise: 6, overhang: 0.3 }, position: { x: 21, y: g + 9, z: -55 }, yaw: QUARTER }),
    element({ id: 'st-per-portal', objectId, componentId: 'openings', role: 'detail', collision: 'inset', material: 'dark-timber',
      geometry: { kind: 'box', size: [2.0, 3.2, 0.06] }, position: { x: 4, y: g + 1.6, z: -45.985 } }),
    ...[-6, 0, 9, 13].map((x, index) => element({ id: `st-per-nave-window-${index + 1}`, objectId, componentId: 'openings', role: 'detail',
      collision: 'inset', material: 'opening-dark', geometry: { kind: 'box', size: [1.2, 4, 0.06] }, position: { x, y: g + 5.5, z: -45.985 } })),
    element({ id: 'st-per-tower-window', objectId, componentId: 'openings', role: 'detail', collision: 'inset', material: 'opening-dark',
      geometry: { kind: 'box', size: [0.8, 2.2, 0.06] }, position: { x: -15.5, y: g + 20, z: -50.485 } }),
  ];
}

function churchyard(): EnvironmentElement[] {
  const objectId = 'st-per-churchyard', g = PLATEAU_TOP;
  const wall = (id: string, size: [number, number, number], x: number, z: number) => element({
    id: `st-per-churchyard-${id}`, objectId, componentId: 'enclosure-wall', role: 'boundary', collision: 'solid', material: 'limestone',
    geometry: { kind: 'box', size }, position: { x, y: size[1] / 2, z } });
  const step = (index: number, top: number, z: number) => element({
    id: `st-per-churchyard-gate-step-${index}`, objectId, componentId: 'gate-steps', role: 'step', collision: 'solid', material: 'limestone',
    geometry: { kind: 'box', size: [3.6, top, 0.45] }, position: { x: 0, y: top / 2, z } });
  const post = (index: number, x: number) => element({
    id: `st-per-churchyard-gate-post-${index}`, objectId, componentId: 'gate-posts', role: 'boundary', collision: 'solid', material: 'limestone',
    geometry: { kind: 'box', size: [0.7, 2.4, 0.8] }, position: { x, y: 1.2, z: -30 } });
  return [
    element({ id: 'st-per-churchyard-plateau', objectId, componentId: 'plateau', role: 'ground', collision: 'solid', material: 'packed-earth',
      geometry: { kind: 'box', size: [62, g, 50.3] }, position: { x: 1, y: g / 2, z: -54.85 } }),
    wall('wall-north-west', [28.5, 1.75, 0.6], -15.75, -30),
    wall('wall-north-east', [30.5, 1.75, 0.6], 16.75, -30),
    wall('wall-west', [0.6, 1.75, 49.7], -30, -55.15),
    wall('wall-east', [0.6, 1.75, 49.7], 32, -55.15),
    wall('wall-south', [62.6, 1.75, 0.6], 1, -80),
    step(1, 0.15, -29.025),
    step(2, 0.3, -29.475),
    post(1, -1.85),
    post(2, 1.85),
    plane('st-per-churchyard-grass', 'worn-grass', 1, -55, 60, 48, { groundY: g }),
    plane('st-per-churchyard-path', 'stone-patch', 2, -38, 2.2, 15.7, { groundY: g, layer: 1, yaw: -0.2573 }),
  ];
}

export function landmarkElements(hypothesis: TowerHypothesis): EnvironmentElement[] {
  return [...radhuset(hypothesis), ...stPer(), ...churchyard()];
}

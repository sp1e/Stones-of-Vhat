import type { BodyDefinition } from '../yardLayout.ts';
import { LATER_PHASE_ELEMENTS, landmarkElements } from './landmarks.ts';
import { PROVENANCE } from './provenance.ts';
import { CHECKPOINTS, MAP_BOUNDS, ROUTES, SPAWN, routeElements } from './route.ts';
import type { Environment, EnvironmentElement, MaterialKey, PhaseLayer, TowerHypothesis } from './types.ts';

export type * from './types.ts';
export { PROVENANCE } from './provenance.ts';
export { PLATEAU_TOP } from './landmarks.ts';

/** Neutral placeholder palette shared by collision debug colours and render materials (DR-04, DR-12). */
export const MATERIAL_COLORS: Readonly<Record<MaterialKey, string>> = {
  'packed-earth': '#6c604e', 'worn-grass': '#5d6843', 'stone-patch': '#7b776d', cobbles: '#837d71',
  limestone: '#a39d8e', brick: '#8a4d3b', plaster: '#b3a893', timber: '#6d5641', 'dark-timber': '#47392c',
  'roof-shingle': '#4a423b', 'roof-tile': '#76493a', 'plank-fence': '#675644', bark: '#4d3f33',
  foliage: '#4e5e39', 'foliage-dark': '#3e4c30', 'opening-dark': '#211b17',
};

const recordKey = (element: EnvironmentElement): string => `${element.objectId}/${element.componentId}`;
const LAYERS: ReadonlyMap<string, PhaseLayer> = new Map(PROVENANCE.map((record) => [`${record.objectId}/${record.componentId}`, record.phase.layer]));

function uniqueById(elements: readonly EnvironmentElement[]): EnvironmentElement[] {
  const byId = new Map<string, EnvironmentElement>();
  for (const candidate of elements) if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
  return [...byId.values()];
}

/** Every authored element, including both tower hypotheses and excluded later-phase geometry. */
export const ELEMENT_CATALOGUE: readonly EnvironmentElement[] = uniqueById([
  ...routeElements(), ...landmarkElements('partial'), ...landmarkElements('complete'), ...LATER_PHASE_ELEMENTS,
]);

function toBody(element: EnvironmentElement): BodyDefinition {
  const { geometry } = element;
  if (geometry.kind !== 'box' && geometry.kind !== 'cylinder') throw new Error(`${element.id}: ${geometry.kind} cannot be a collider`);
  const body: BodyDefinition = {
    id: element.id,
    shape: geometry.kind === 'box' ? { kind: 'box', size: geometry.size } : { kind: 'cylinder', radius: geometry.radius, height: geometry.height },
    position: { ...element.position },
    color: MATERIAL_COLORS[element.material],
  };
  return element.yaw === 0 ? body : { ...body, rotation: { x: 0, y: Math.sin(element.yaw / 2), z: 0, w: Math.cos(element.yaw / 2) } };
}

/** Builds the playable 1510 baseline. Later-phase and time-fracture elements never enter it. */
export function buildEnvironment(options: { towerHypothesis?: TowerHypothesis } = {}): Environment {
  const towerHypothesis = options.towerHypothesis ?? 'partial';
  if (towerHypothesis !== 'partial' && towerHypothesis !== 'complete') throw new Error(`Unknown tower hypothesis: ${String(towerHypothesis)}`);
  const candidates = [...routeElements(), ...landmarkElements(towerHypothesis), ...LATER_PHASE_ELEMENTS];
  const elements = candidates.filter((candidate) => {
    const layer = LAYERS.get(recordKey(candidate));
    if (!layer) throw new Error(`${candidate.id} has no provenance record ${recordKey(candidate)}`);
    return layer === 'baseline-1510';
  });
  return {
    towerHypothesis,
    elements,
    bodies: elements.filter((candidate) => candidate.collision === 'solid').map(toBody),
    spawn: { ...SPAWN },
    bounds: { ...MAP_BOUNDS },
    checkpoints: CHECKPOINTS,
    routes: ROUTES,
  };
}

import type { BodyDefinition, Vec3 } from '../yardLayout.ts';

// Environment blockout data. Metres, Y up, route toward -Z. Authored, not georeferenced (DR-01).

export type CollisionClass = 'solid' | 'overhead' | 'surface' | 'inset';
export type ElementRole = 'ground' | 'structure' | 'step' | 'boundary' | 'vegetation' | 'cover' | 'surface' | 'roof' | 'detail';
export type MaterialKey =
  | 'packed-earth' | 'worn-grass' | 'stone-patch' | 'cobbles'
  | 'limestone' | 'brick' | 'plaster' | 'timber' | 'dark-timber'
  | 'roof-shingle' | 'roof-tile' | 'plank-fence' | 'bark' | 'foliage' | 'foliage-dark' | 'opening-dark';

/** Gable ridge and pyramid apex sit above `position`; `position.y` is the roof base. Ridge runs along local Z. */
export type ElementGeometry =
  | { kind: 'box'; size: readonly [number, number, number] }
  | { kind: 'cylinder'; radius: number; height: number }
  | { kind: 'gable-roof'; width: number; depth: number; rise: number; overhang: number }
  | { kind: 'pyramid-roof'; width: number; depth: number; rise: number; overhang: number }
  | { kind: 'plane'; size: readonly [number, number] }
  | { kind: 'crown'; radius: number; seed: number }
  | { kind: 'cobble-patch'; size: readonly [number, number]; stoneHeight: number; count: number; seed: number };

export type EnvironmentElement = {
  readonly id: string;
  readonly objectId: string;
  readonly componentId: string;
  readonly role: ElementRole;
  readonly collision: CollisionClass;
  readonly geometry: ElementGeometry;
  readonly position: Vec3;
  readonly yaw: number;
  readonly material: MaterialKey;
};

export type PhaseLayer = 'baseline-1510' | 'later-phase' | 'time-fracture';
export type EvidenceClass = 'documented' | 'interpretation' | 'gameplay-invention' | 'measured';
export type Phase = { readonly layer: PhaseLayer; readonly fromYear?: number; readonly toYear?: number };

export type ProvenanceRecord = {
  readonly objectId: string;
  readonly componentId: string;
  readonly intendedYearOrPhase: string;
  readonly phase: Phase;
  readonly evidenceClass: EvidenceClass;
  readonly sourcePageFigure: readonly string[];
  readonly measurementScope: string;
  readonly uncertainty: string;
  readonly designChange: string;
  readonly rightsStatus: string;
};

export type TowerHypothesis = 'partial' | 'complete';

export type Checkpoint = { readonly id: string; readonly label: string; readonly position: Vec3; readonly radius: number };
export type RouteId = 'portik' | 'alley';
/** Ordered waypoints; named ones are checkpoints, the rest are steering aids. */
export type Route = { readonly id: RouteId; readonly waypoints: readonly { readonly x: number; readonly z: number; readonly checkpoint?: string }[] };

export type Environment = {
  readonly towerHypothesis: TowerHypothesis;
  readonly elements: readonly EnvironmentElement[];
  readonly bodies: readonly BodyDefinition[];
  readonly spawn: Vec3;
  readonly bounds: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
  readonly checkpoints: readonly Checkpoint[];
  readonly routes: readonly Route[];
};

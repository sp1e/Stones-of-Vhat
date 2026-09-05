export type Vec3 = { x: number; y: number; z: number };
export type Rotation = { x: number; y: number; z: number; w: number };
export type Shape =
  | { kind: 'box'; size: readonly [number, number, number] }
  | { kind: 'ball'; radius: number }
  | { kind: 'cylinder'; radius: number; height: number };
export type BodyDefinition = {
  id: string;
  shape: Shape;
  position: Vec3;
  rotation?: Rotation;
  color: string;
  mass?: number;
};

// Gameplay prototype geometry, not historical reconstruction. Metres, Y up, -Z forward.
export const YARD_LAYOUT: readonly BodyDefinition[] = [
  { id: 'floor', shape: { kind: 'box', size: [24, 1, 24] }, position: { x: 0, y: -0.5, z: 0 }, color: '#77766b' },
  { id: 'wall-north', shape: { kind: 'box', size: [24, 3, 0.6] }, position: { x: 0, y: 1.5, z: -12 }, color: '#8b887d' },
  { id: 'wall-south', shape: { kind: 'box', size: [24, 3, 0.6] }, position: { x: 0, y: 1.5, z: 12 }, color: '#8b887d' },
  { id: 'wall-west', shape: { kind: 'box', size: [0.6, 3, 24] }, position: { x: -12, y: 1.5, z: 0 }, color: '#8b887d' },
  { id: 'wall-east', shape: { kind: 'box', size: [0.6, 3, 24] }, position: { x: 12, y: 1.5, z: 0 }, color: '#8b887d' },
  { id: 'stair-1', shape: { kind: 'box', size: [3, 0.22, 0.8] }, position: { x: -5, y: 0.11, z: -1 }, color: '#999387' },
  { id: 'stair-2', shape: { kind: 'box', size: [3, 0.44, 0.8] }, position: { x: -5, y: 0.22, z: -1.8 }, color: '#999387' },
  { id: 'stair-3', shape: { kind: 'box', size: [3, 0.66, 0.8] }, position: { x: -5, y: 0.33, z: -2.6 }, color: '#999387' },
  { id: 'stair-4', shape: { kind: 'box', size: [3, 0.88, 0.8] }, position: { x: -5, y: 0.44, z: -3.4 }, color: '#999387' },
  { id: 'stair-5', shape: { kind: 'box', size: [3, 1.1, 0.8] }, position: { x: -5, y: 0.55, z: -4.2 }, color: '#999387' },
  { id: 'high-block', shape: { kind: 'box', size: [2, 1.3, 2] }, position: { x: 2, y: 0.65, z: -5 }, color: '#8f8b7f' },
  { id: 'ramp', shape: { kind: 'box', size: [3, 0.3, 5] }, position: { x: 6, y: 0.5, z: -6 }, rotation: { x: Math.sin(0.09), y: 0, z: 0, w: Math.cos(0.09) }, color: '#786950' },
  { id: 'passage-roof', shape: { kind: 'box', size: [4, 0.3, 3] }, position: { x: 6, y: 1.35, z: 3 }, color: '#8a8375' },
  { id: 'passage-west', shape: { kind: 'box', size: [0.4, 1.2, 3] }, position: { x: 4, y: 0.6, z: 3 }, color: '#918c7e' },
  { id: 'passage-east', shape: { kind: 'box', size: [0.4, 1.2, 3] }, position: { x: 8, y: 0.6, z: 3 }, color: '#918c7e' },
  { id: 'crate-a', shape: { kind: 'box', size: [0.8, 0.8, 0.8] }, position: { x: -1.5, y: 0.5, z: 3 }, mass: 12, color: '#80694c' },
  { id: 'crate-b', shape: { kind: 'box', size: [0.7, 0.7, 0.7] }, position: { x: -2, y: 0.5, z: 1 }, mass: 9, color: '#8d7555' },
  { id: 'barrel', shape: { kind: 'cylinder', radius: 0.36, height: 0.9 }, position: { x: 1, y: 0.55, z: 1 }, mass: 18, color: '#695a43' },
  { id: 'stone', shape: { kind: 'ball', radius: 0.3 }, position: { x: 0, y: 0.5, z: 4 }, mass: 6, color: '#aaa69b' },
  { id: 'plank', shape: { kind: 'box', size: [2.4, 0.14, 0.35] }, position: { x: -3, y: 0.3, z: 4 }, mass: 8, color: '#766047' },
];

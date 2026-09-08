import type RAPIER from '@dimforge/rapier3d-compat';
import type { Shape, Vec3 } from '../content/yardLayout.ts';
import { finiteVector, rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';

export type BodyRef = { worldEpoch: string; bodyId: string };
export type ColliderRef = BodyRef & { colliderId: string };
export type MotionShape = Shape | { kind: 'capsule'; halfHeight: number; radius: number };
export type MotionNames = { bodyId: string; colliderIds: readonly string[] };
export type MotionSource = {
  bodyId: string;
  body: RAPIER.RigidBody;
  colliders: readonly {
    colliderId: string;
    collider: RAPIER.Collider;
    role: 'blocker' | 'navigation';
    shape: () => MotionShape;
  }[];
};
export type BodyEndpoint = {
  bodyOriginWorld: RigidTransform;
  comLocal: Vec3;
  comWorld: Vec3;
  comVelocityWorldMps: Vec3;
  angularVelocityWorldRadps: Vec3;
  authority: 'fixed' | 'animation' | 'physics';
  massKg: number;
  sleeping: boolean;
  colliders: { ref: ColliderRef; role: 'blocker' | 'navigation'; localPose: RigidTransform; shape: MotionShape }[];
};
export type MotionInterval = {
  worldEpoch: string;
  kind: 'initial' | 'completed';
  fromTick: number;
  toTick: number;
  dtS: number;
  bodies: { ref: BodyRef; from: BodyEndpoint; to: BodyEndpoint; discontinuities: ('shape' | 'authority')[] }[];
};

export function preflightMotionNames(names: readonly MotionNames[]): void {
  const bodies = new Set<string>();
  for (const name of names) {
    if (!name.bodyId.trim()) throw new Error('Empty body id');
    if (bodies.has(name.bodyId)) throw new Error(`Duplicate body id: ${name.bodyId}`);
    bodies.add(name.bodyId);
    const colliders = new Set<string>();
    for (const id of name.colliderIds) {
      if (!id.trim()) throw new Error('Empty collider id');
      if (colliders.has(id)) throw new Error(`Duplicate collider id: ${name.bodyId}/${id}`);
      colliders.add(id);
    }
  }
}

/** Detached completed intervals; the caller retains ownership of the Rapier world. */
export function createBodyMotion(world: RAPIER.World, sources: readonly MotionSource[]) {
  sources = sources.map(source => ({ ...source, colliders: source.colliders.map(collider => ({ ...collider })) }));
  preflightMotionNames(sources.map(source => ({ bodyId: source.bodyId, colliderIds: source.colliders.map(collider => collider.colliderId) })));
  const registeredBodies = new Set<RAPIER.RigidBody>();
  const registeredColliders = new Set<RAPIER.Collider>();
  for (const source of sources) {
    if (world.getRigidBody(source.body.handle) !== source.body) throw new Error('Body belongs to a different world owner');
    if (registeredBodies.has(source.body)) throw new Error('Duplicate physical body alias');
    registeredBodies.add(source.body);
    for (const entry of source.colliders) {
      if (world.getCollider(entry.collider.handle) !== entry.collider || entry.collider.parent() !== source.body) {
        throw new Error('Collider belongs to a different world or body owner');
      }
      if (registeredColliders.has(entry.collider)) throw new Error('Duplicate physical collider alias');
      registeredColliders.add(entry.collider);
    }
  }
  const worldEpoch = crypto.randomUUID();
  const entries = new Map(sources.map(source => [source.bodyId, source]));
  let destroyed = false;
  const alive = () => { if (destroyed) throw new Error('Motion registry destroyed'); };
  const finiteMass = (mass: number): number => {
    if (!Number.isFinite(mass)) throw new Error('Body mass must be finite');
    return mass;
  };
  const capture = (source: MotionSource): BodyEndpoint => ({
    bodyOriginWorld: rigid({ position: { ...source.body.translation() }, rotation: { ...source.body.rotation() } }),
    comLocal: finiteVector(source.body.localCom()),
    comWorld: finiteVector(source.body.worldCom()),
    comVelocityWorldMps: finiteVector(source.body.linvel()),
    angularVelocityWorldRadps: finiteVector(source.body.angvel()),
    authority: source.body.isFixed() ? 'fixed' : source.body.isDynamic() ? 'physics' : 'animation',
    massKg: finiteMass(source.body.mass()),
    sleeping: source.body.isSleeping(),
    colliders: source.colliders.map(collider => {
      const position = collider.collider.translationWrtParent(), rotation = collider.collider.rotationWrtParent();
      if (!position || !rotation || collider.collider.parent()?.handle !== source.body.handle) {
        throw new Error('Collider must remain attached to its registered body');
      }
      return {
        ref: { worldEpoch, bodyId: source.bodyId, colliderId: collider.colliderId },
        role: collider.role,
        localPose: rigid({ position: { ...position }, rotation: { ...rotation } }),
        shape: structuredClone(collider.shape()),
      };
    }),
  });
  let interval: MotionInterval = {
    worldEpoch, kind: 'initial', fromTick: 0, toTick: 0, dtS: 0,
    bodies: sources.map(source => {
      const endpoint = capture(source);
      return { ref: { worldEpoch, bodyId: source.bodyId }, from: structuredClone(endpoint), to: endpoint, discontinuities: [] };
    }),
  };
  function assertRef(ref: BodyRef | ColliderRef): void {
    alive();
    if (ref.worldEpoch !== worldEpoch) throw new Error('Stale world reference');
    const entry = entries.get(ref.bodyId);
    if (!entry || world.getRigidBody(entry.body.handle) !== entry.body) throw new Error('Unknown body reference');
    if ('colliderId' in ref) {
      const collider = entry.colliders.find(collider => collider.colliderId === ref.colliderId);
      if (!collider || world.getCollider(collider.collider.handle) !== collider.collider || collider.collider.parent() !== entry.body) {
        throw new Error('Unknown collider reference');
      }
    }
  }
  return {
    worldEpoch,
    ref(bodyId: string): BodyRef {
      const ref = { worldEpoch, bodyId };
      assertRef(ref);
      return ref;
    },
    assertRef,
    read(): MotionInterval { alive(); return structuredClone(interval); },
    /** Owner-only: publish once after each successful fixed world.step; this never steps Rapier. */
    completeStep(): void {
      alive();
      const bodies = interval.bodies.map(previous => {
        assertRef(previous.ref);
        const source = entries.get(previous.ref.bodyId)!;
        const from = previous.to, to = capture(source);
        const discontinuities: ('shape' | 'authority')[] = [];
        if (JSON.stringify(from.colliders.map(collider => collider.shape)) !== JSON.stringify(to.colliders.map(collider => collider.shape))) {
          discontinuities.push('shape');
        }
        if (from.authority !== to.authority) discontinuities.push('authority');
        return { ref: previous.ref, from, to, discontinuities };
      });
      interval = { worldEpoch, kind: 'completed', fromTick: interval.toTick, toTick: interval.toTick + 1, dtS: FIXED_DT, bodies };
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      entries.clear();
      registeredBodies.clear();
      registeredColliders.clear();
      sources = [];
      interval.bodies = [];
    },
  };
}
export type BodyMotion = ReturnType<typeof createBodyMotion>;

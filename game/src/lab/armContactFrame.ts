import type { ArmSnapshot } from '../physics/armFixture.ts';
import { createContactMotion } from '../physics/contactMotion.ts';
import { composeRigid, worldBoneFromBody } from '../physics/poseBinding.ts';

const IDENTITY = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
const SEGMENT_IDS = Object.freeze(['upper-arm', 'forearm'] as const);

/**
 * Derived contact-model geometry for read-only inspection. This samples the
 * completed motion model; it neither restores the owner nor exposes a measured
 * inner solver boundary.
 */
export function armContactFrame(snapshot: ArmSnapshot, offsetS: number) {
  if (!snapshot || typeof snapshot !== 'object' || snapshot.interval?.kind !== 'completed') {
    throw new Error('Contact inspection requires a completed arm interval');
  }
  if (snapshot.worldEpoch !== snapshot.interval.worldEpoch || snapshot.tick !== snapshot.interval.toTick) {
    throw new Error('Contact inspection snapshot does not match its owner interval');
  }
  if (!Array.isArray(snapshot.segments) || snapshot.segments.length !== SEGMENT_IDS.length) {
    throw new Error('Contact inspection requires the complete two-segment arm');
  }
  for (let index = 0; index < snapshot.segments.length; index++) {
    if (!Object.hasOwn(snapshot.segments, index)) throw new Error('Contact inspection segment list must be dense');
  }
  const segmentIds = new Set(snapshot.segments.map(segment => segment.ref?.bodyId));
  if (segmentIds.size !== SEGMENT_IDS.length || SEGMENT_IDS.some(bodyId => !segmentIds.has(bodyId))) {
    throw new Error('Contact inspection requires the exact upper-arm and forearm segment references');
  }

  const motion = createContactMotion(snapshot.interval);
  const segments = snapshot.segments.map(segment => {
    if (!segment.ref || segment.ref.worldEpoch !== snapshot.worldEpoch
      || !SEGMENT_IDS.includes(segment.ref.bodyId as typeof SEGMENT_IDS[number])) {
      throw new Error('Contact inspection segment reference is stale or unknown');
    }
    const body = snapshot.interval.bodies.find(entry => entry.ref.worldEpoch === snapshot.worldEpoch
      && entry.ref.bodyId === segment.ref.bodyId);
    if (!body) throw new Error(`Missing completed interval segment: ${segment.ref.bodyId}`);
    const collider = body.from.colliders.find(entry => entry.ref.worldEpoch === snapshot.worldEpoch
      && entry.ref.bodyId === segment.ref.bodyId && entry.ref.colliderId === 'shape');
    if (!collider || body.from.colliders.length !== 1 || body.to.colliders.length !== 1) {
      throw new Error(`Missing exact segment collider: ${segment.ref.bodyId}/shape`);
    }
    const sampled = motion.sample({ ...segment.ref, colliderId: 'shape' }, offsetS);
    const bodyOriginWorld = structuredClone(sampled.bodyOriginWorld);
    const anchorWorld = composeRigid(bodyOriginWorld, {
      position: segment.jointAnchorLocal,
      rotation: IDENTITY,
    }).position;
    const comWorld = composeRigid(bodyOriginWorld, {
      position: body.from.comLocal,
      rotation: IDENTITY,
    }).position;
    return {
      ref: structuredClone(segment.ref),
      bodyOriginWorld,
      boneWorld: worldBoneFromBody(bodyOriginWorld, segment.binding),
      colliderWorld: structuredClone(sampled.colliderWorld),
      comWorld,
      anchorWorld,
    };
  });

  return {
    source: 'completed-owner-contact-motion' as const,
    model: motion.model,
    worldEpoch: motion.worldEpoch,
    fromTick: motion.fromTick,
    toTick: motion.toTick,
    offsetS,
    segments,
    anchorsWorld: segments.map(segment => ({ ...segment.anchorWorld })),
  };
}

export type ArmContactFrame = ReturnType<typeof armContactFrame>;

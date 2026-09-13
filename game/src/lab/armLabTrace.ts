import type { ArmSnapshot } from '../physics/armFixture.ts';
import { composeRigid, worldBoneFromBody } from '../physics/poseBinding.ts';

const identity = { x: 0, y: 0, z: 0, w: 1 };

/** Inspection-only historical geometry; this never restores or advances the owner. */
export function armTraceFrame(snapshot: ArmSnapshot, sampleIndex: number) {
  const trace = snapshot.interval.nativeTrace;
  if (!Number.isInteger(sampleIndex) || sampleIndex < 0) {
    throw new Error('Native trace sample index must be a nonnegative integer');
  }
  const sample = trace?.samples[sampleIndex];
  if (!sample) throw new Error('Native trace sample index is unavailable');

  const segments = snapshot.segments.map(segment => {
    const sampleBody = sample.bodies.find(entry =>
      entry.ref.worldEpoch === segment.ref.worldEpoch && entry.ref.bodyId === segment.ref.bodyId,
    );
    if (!sampleBody) throw new Error(`Missing registered segment sample: ${segment.ref.bodyId}`);
    const collider = sampleBody.endpoint.colliders.find(entry => entry.ref.colliderId === 'shape');
    if (!collider) throw new Error(`Missing registered collider: ${segment.ref.bodyId}/shape`);

    const bodyOriginWorld = structuredClone(sampleBody.endpoint.bodyOriginWorld);
    const anchorWorld = composeRigid(bodyOriginWorld, {
      position: segment.jointAnchorLocal,
      rotation: identity,
    }).position;
    return {
      bodyOriginWorld,
      boneWorld: worldBoneFromBody(bodyOriginWorld, segment.binding),
      colliderWorld: composeRigid(bodyOriginWorld, collider.localPose),
      comWorld: { ...sampleBody.endpoint.comWorld },
      anchorWorld,
    };
  });

  return {
    offsetS: sample.offsetS,
    segments,
    anchorsWorld: segments.map(segment => segment.anchorWorld),
  };
}

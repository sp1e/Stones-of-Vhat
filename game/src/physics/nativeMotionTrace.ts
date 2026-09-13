import type { BodyEndpoint, MotionInterval, NativeMotionSample, NativeMotionTrace } from './bodyMotion.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function samePose(a: RigidTransform, b: RigidTransform): boolean {
  const { rotation: rotationA, ...restA } = a, { rotation: rotationB, ...restB } = b;
  if (!same(restA, restB)) return false;
  const qa = rigid({ position: a.position, rotation: rotationA }).rotation;
  const qb = rigid({ position: b.position, rotation: rotationB }).rotation;
  // Comparison only: q/-q represent one orientation. The 2e-7 quaternion chord
  // bound (~4e-7 rad) allows float32 re-normalization, not positional/query error.
  // Recorded endpoint values are retained; every non-rotation field stays exact.
  const chord = Math.min(
    Math.hypot(qa.x - qb.x, qa.y - qb.y, qa.z - qb.z, qa.w - qb.w),
    Math.hypot(qa.x + qb.x, qa.y + qb.y, qa.z + qb.z, qa.w + qb.w),
  );
  return chord <= 2e-7;
}
const sameLocalPoses = (a: BodyEndpoint, b: BodyEndpoint) => a.colliders.length === b.colliders.length
  && a.colliders.every((collider, index) => same(collider.ref, b.colliders[index]!.ref)
    && samePose(collider.localPose, b.colliders[index]!.localPose));
function sameEndpoint(a: BodyEndpoint, b: BodyEndpoint): boolean {
  const { bodyOriginWorld: poseA, colliders: collidersA, ...restA } = a;
  const { bodyOriginWorld: poseB, colliders: collidersB, ...restB } = b;
  const metadata = (colliders: BodyEndpoint['colliders']) => colliders.map(({ localPose, ...rest }) => rest);
  return same(restA, restB) && same(metadata(collidersA), metadata(collidersB))
    && samePose(poseA, poseB) && sameLocalPoses(a, b);
}

/** Owner observations only; no interpolation, native stepping or solver-subsolve claims. */
export function createNativeMotionTrace(capture: () => NativeMotionSample['bodies']) {
  let draft: NativeMotionTrace | undefined;
  return {
    begin(interval: MotionInterval): void {
      if (draft) throw new Error('Native trace already active');
      const bodies = capture();
      for (const [index, body] of bodies.entries()) {
        const previous = interval.bodies[index]!.to;
        if (!samePose(body.endpoint.bodyOriginWorld, previous.bodyOriginWorld) || !sameLocalPoses(body.endpoint, previous)) {
          throw new Error('Native trace requires pose continuity with previous publication');
        }
      }
      draft = { kind: 'measured-native-boundaries', samples: [{ offsetS: 0, bodies }] };
    },
    capture(offsetS: number): void {
      if (!draft) throw new Error('Begin an active native trace before capture');
      if (draft.samples.length >= 17) throw new Error('Native trace limit is sixteen native steps');
      if (!Number.isFinite(offsetS)) throw new Error('Native offset must be finite');
      if (Math.abs(offsetS - FIXED_DT) <= 1e-12) offsetS = FIXED_DT;
      if (offsetS <= draft.samples[draft.samples.length - 1]!.offsetS || offsetS > FIXED_DT) {
        throw new Error('Native offset must increase within the fixed duration');
      }
      const bodies = capture();
      const previous = draft.samples[draft.samples.length - 1]!.bodies;
      for (const [index, body] of bodies.entries()) {
        if (!sameLocalPoses(body.endpoint, previous[index]!.endpoint)) {
          throw new Error('Native trace collider local pose changed between samples');
        }
      }
      draft.samples.push({ offsetS, bodies });
    },
    prepare(current: NativeMotionSample['bodies']): NativeMotionTrace | undefined {
      if (!draft) return undefined;
      const last = draft.samples[draft.samples.length - 1]!;
      if (last.offsetS !== FIXED_DT) throw new Error('Native trace has unfinished final offset');
      if (last.bodies.length !== current.length || !last.bodies.every((body, index) =>
        same(body.ref, current[index]!.ref) && sameEndpoint(body.endpoint, current[index]!.endpoint))) {
        throw new Error('Native endpoint changed since final capture');
      }
      return draft;
    },
    clear(): void { draft = undefined; },
  };
}

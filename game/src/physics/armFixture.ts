import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { createBodyMotion, preflightMotionNames } from './bodyMotion.ts';
import type { BodyMotion, MotionSource } from './bodyMotion.ts';
import {
  composeRigid, inverseRigid, worldBodyFromBone, worldBoneFromBody,
  createPoseAuthority, rigid, finiteVector,
} from './poseBinding.ts';
import type { BoneBinding, PointImpulse, RigidTransform } from './poseBinding.ts';
import { createAngularJoint } from './rapierJointLimits.ts';
import type { Rotation, Vec3 } from '../content/yardLayout.ts';

const zero = { x: 0, y: 0, z: 0 }, identity = { x: 0, y: 0, z: 0, w: 1 };
const pose = (position: Vec3 = zero, rotation: Rotation = identity): RigidTransform =>
  rigid({ position, rotation });
const quat = (q: Rotation) => new Quaternion(q.x, q.y, q.z, q.w);
const axis = (v: Vec3, angle: number): Rotation => {
  const q = new Quaternion().setFromAxisAngle(new Vector3(v.x, v.y, v.z), angle);
  return { x: q.x, y: q.y, z: q.z, w: q.w };
};
const frame = axis({ x: 0, y: 0, z: 1 }, Math.PI / 2);
const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
type MeasurementInput = {
  world: RAPIER.World;
  bodies: readonly RAPIER.RigidBody[];
  colliders: readonly RAPIER.Collider[];
  floor: RAPIER.Collider;
  wall: RAPIER.Collider;
  joint: RAPIER.ImpulseJoint;
};

/** Detached diagnostics of this fixture, not anatomical swing/twist coordinates. */
export function measureArmState(input: MeasurementInput) {
  const { world, bodies, colliders, floor, wall, joint } = input;
  if (bodies.length !== 2) throw new Error('Arm measurement requires two bodies');
  let kineticJ = 0, potentialJ = 0, maxSpeedMps = 0, maxOmegaRadps = 0, massKg = 0;
  for (const body of bodies) {
    const rotation = body.rotation();
    const v = finiteVector(body.linvel()), omega = finiteVector(body.angvel());
    rigid({ position: body.translation(), rotation });
    const com = finiteVector(body.worldCom()), inertia = finiteVector(body.principalInertia());
    const worldInertia = quat(rotation).multiply(quat(body.principalInertiaLocalFrame()));
    const localOmega = new Vector3(omega.x, omega.y, omega.z).applyQuaternion(worldInertia.conjugate());
    kineticJ += .5 * body.mass() * length(v) ** 2
      + .5 * (inertia.x * localOmega.x ** 2 + inertia.y * localOmega.y ** 2 + inertia.z * localOmega.z ** 2);
    potentialJ += body.mass() * 9.81 * com.y;
    massKg += body.mass();
    maxSpeedMps = Math.max(maxSpeedMps, length(v));
    maxOmegaRadps = Math.max(maxOmegaRadps, length(omega));
  }

  const anchorsWorld = [joint.anchor1(), joint.anchor2()].map((anchor, index) => {
    const body = bodies[index]!;
    return composeRigid(pose(body.translation(), body.rotation()), pose(anchor)).position;
  });
  const a = anchorsWorld[0]!, b = anchorsWorld[1]!;
  const parentFrame = quat(bodies[0]!.rotation()).multiply(quat(joint.frameX1()));
  const childFrame = quat(bodies[1]!.rotation()).multiply(quat(joint.frameX2()));
  const relative = parentFrame.conjugate().multiply(childFrame).normalize();
  if (relative.w < 0) relative.set(-relative.x, -relative.y, -relative.z, -relative.w);
  const projectedRadXYZ = [relative.x, relative.y, relative.z].map(value => 2 * Math.atan2(value, relative.w));

  let penetrationM = 0, wallContacts = 0, floorContacts = 0, wallImpulseNs = 0;
  for (const collider of colliders) {
    for (const obstacle of [wall, floor]) {
      world.contactPair(collider, obstacle, manifold => {
        for (let index = 0; index < manifold.numSolverContacts(); index++) {
          const distance = manifold.solverContactDist(index);
          if (!Number.isFinite(distance)) throw new Error('Nonfinite solver contact');
          penetrationM = Math.max(penetrationM, -distance);
          if (obstacle === wall) wallContacts++;
          else floorContacts++;
        }
        for (let index = 0; index < manifold.numContacts(); index++) {
          const impulse = manifold.contactImpulse(index);
          if (!Number.isFinite(impulse)) throw new Error('Nonfinite contact impulse');
          if (obstacle === wall) wallImpulseNs += impulse;
        }
      });
    }
  }
  return {
    anchorGapM: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
    anchorsWorld, projectedRadXYZ, kineticJ, potentialJ, mechanicalJ: kineticJ + potentialJ,
    massKg, maxSpeedMps, maxOmegaRadps, penetrationM, wallContacts, floorContacts, wallImpulseNs,
  };
}

export type ArmHandoffCommand = { worldEpoch: string; atTick: number; impulse: PointImpulse | null };
const PHYSICS_SUBSTEPS = 8;
const PHYSICS_NATIVE_DT = FIXED_DT / PHYSICS_SUBSTEPS;
type NativeSample = { metrics: ReturnType<typeof measureArmState>; energyAllowanceJ: number };
type PhysicsStep = { nativeDtS: number; nativeSteps: number; samples: NativeSample[] };
let initialization: Promise<void> | undefined;

export async function createArmFixture() {
  preflightMotionNames(['upper-arm', 'forearm', 'floor', 'wall']
    .map(bodyId => ({ bodyId, colliderIds: ['shape'] })));
  initialization ??= RAPIER.init();
  await initialization;

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_DT;
  world.numSolverIterations = 8;
  // Arm-only native solver budget; physics uses eight explicitly measured native
  // steps per authoritative 1/60 tick. Bootstrap/animation remain one 1/60 step.
  world.maxCcdSubsteps = 4;
  let destroyed = false, active = false, tick = 0, physicalTicks = 0;
  let motion: BodyMotion | undefined;
  let authority: ReturnType<typeof createPoseAuthority> | undefined;
  let pending: ArmHandoffCommand | null = null;
  let energyAllowanceJ = 0, wallContactTicks = 0, wallNativeSteps = 0, wallImpulseNs = 0;
  let lastPhysicsStep: PhysicsStep | null = null;
  type TransferReport = ReturnType<ReturnType<typeof createPoseAuthority>['handoff']>;
  let transfer: { tick: number; report: TransferReport } | null = null;
  const alive = () => { if (destroyed) throw new Error('Arm fixture destroyed'); };

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    active = false;
    pending = null;
    transfer = null;
    lastPhysicsStep = null;
    authority?.destroy();
    motion?.destroy();
    authority = undefined;
    motion = undefined;
    world.free();
  }

  try {
    const bindings: BoneBinding[] = [
      { version: 1, boneToBody: pose({ x: .12, y: .03, z: .01 }, axis({ x: 0, y: 1, z: 0 }, .25)) },
      { version: 1, boneToBody: pose({ x: .09, y: -.02, z: -.01 }, axis({ x: 0, y: 0, z: 1 }, -.20)) },
    ];
    const bonePoses = (sampleTick: number) => {
      const t = sampleTick * FIXED_DT;
      const upper = pose({ x: -.4, y: 1.5, z: 0 }, axis({ x: 0, y: 1, z: 0 }, .07 * Math.sin(t)));
      const bend = quat(frame)
        .multiply(quat(axis({ x: 1, y: 0, z: 0 }, .10 * Math.sin(1.5 * t))))
        .multiply(quat(axis({ x: 0, y: 1, z: 0 }, .14 + .05 * Math.sin(2 * t))))
        .multiply(quat(frame).conjugate());
      return [upper, composeRigid(upper, pose({ x: .4, y: 0, z: 0 }, bend))];
    };
    const names = ['upper-arm', 'forearm'];
    const initialBones = bonePoses(0);
    const segments = names.map((id, index) => {
      const binding = bindings[index]!, bodyPose = worldBodyFromBone(initialBones[index]!, binding);
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(bodyPose.position.x, bodyPose.position.y, bodyPose.position.z)
        .setRotation(bodyPose.rotation).setCanSleep(false).setCcdEnabled(true));
      const colliderLocal = composeRigid(inverseRigid(binding.boneToBody), pose({ x: .2, y: 0, z: 0 }));
      const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(.2, .045, .045)
        .setTranslation(colliderLocal.position.x, colliderLocal.position.y, colliderLocal.position.z)
        .setRotation(colliderLocal.rotation).setMass(index ? 1 : 2).setFriction(.5).setRestitution(0), body);
      return { id, body, collider, binding };
    });
    const obstacles = [
      { id: 'floor', position: { x: 0, y: -.1, z: 0 }, size: [10, .2, 10] as const },
      { id: 'wall', position: { x: .65, y: 5, z: 0 }, size: [.2, 20, 10] as const },
    ].map(definition => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(definition.position.x, definition.position.y, definition.position.z));
      const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(
        definition.size[0] / 2, definition.size[1] / 2, definition.size[2] / 2,
      ).setFriction(.5).setRestitution(0), body);
      return { ...definition, body, collider };
    });

    const localFrame1 = composeRigid(inverseRigid(bindings[0]!.boneToBody), pose({ x: .4, y: 0, z: 0 }, frame));
    const localFrame2 = composeRigid(inverseRigid(bindings[1]!.boneToBody), pose(zero, frame));
    const adapter = createAngularJoint(world, segments[0]!.body, segments[1]!.body, {
      kind: 'generic', lockedMask: 39, frame1: localFrame1, frame2: localFrame2,
      limits: [{ axis: 3, min: -.35, max: .35 }, { axis: 4, min: -.35, max: .35 }],
    });
    const sources: MotionSource[] = [
      ...segments.map(s => ({
        bodyId: s.id, body: s.body,
        colliders: [{
          colliderId: 'shape', collider: s.collider, role: 'blocker' as const,
          shape: () => ({ kind: 'box' as const, size: [.4, .09, .09] as const }),
        }],
      })),
      ...obstacles.map(o => ({
        bodyId: o.id, body: o.body,
        colliders: [{
          colliderId: 'shape', collider: o.collider, role: 'blocker' as const,
          shape: () => ({ kind: 'box' as const, size: o.size }),
        }],
      })),
    ];

    // One bootstrap step; fixed/kinematic members retain their authored bent pose.
    world.step();
    motion = createBodyMotion(world, sources);
    const refs = segments.map(s => motion!.ref(s.id));
    authority = createPoseAuthority(
      segments, id => motion!.assertRef(refs[names.indexOf(id)]!), FIXED_DT, () => destroy(),
    );
    authority.capture(0);
    const measurement: MeasurementInput = {
      world, bodies: segments.map(s => s.body), colliders: segments.map(s => s.collider),
      floor: obstacles[0]!.collider, wall: obstacles[1]!.collider, joint: adapter.joint,
    };
    const counts = () => destroyed
      ? { bodies: 0, colliders: 0, joints: 0 }
      : { bodies: world.bodies.len(), colliders: world.colliders.len(), joints: world.impulseJoints.len() };

    const validateCommand = (command: ArmHandoffCommand) => {
      alive();
      if (command.worldEpoch !== motion!.worldEpoch) throw new Error('Stale world handoff');
      if (!Number.isSafeInteger(command.atTick) || command.atTick !== tick) {
        throw new Error('Handoff requires current boundary');
      }
      if (tick < 1) throw new Error('Handoff needs two-sample history');
      if (command.impulse) {
        if (!names.includes(command.impulse.bodyId)) throw new Error('Unknown impulse body');
        finiteVector(command.impulse.impulseWorldNs);
        finiteVector(command.impulse.pointWorld);
      }
    };
    const handoff = (command: ArmHandoffCommand) => {
      validateCommand(command);
      const report = authority!.handoff(tick, command.impulse ?? undefined);
      try {
        world.timestep = PHYSICS_NATIVE_DT;
        transfer = { tick, report };
        pending = null;
        physicalTicks = 0;
        energyAllowanceJ = measureArmState(measurement).mechanicalJ + 5;
      } catch (error) {
        destroy();
        throw error;
      }
    };

    return {
      counts, destroy, handoff,
      setActive(value: boolean): void {
        alive();
        active = value;
        if (!active) pending = null;
      },
      queueHandoff(command: ArmHandoffCommand): boolean {
        validateCommand(command);
        if (!active || authority!.mode() !== 'animation' || pending) return false;
        pending = structuredClone(command);
        return true;
      },
      step(): boolean {
        alive();
        if (!active) return false;
        if (pending) handoff(pending);
        try {
          motion!.beginNativeTrace();
          const samples: NativeSample[] = [];
          if (authority!.mode() === 'animation') {
            const bones = bonePoses(tick + 1);
            authority!.animate(tick + 1, segments.map((s, index) => ({
              id: s.id, bodyOriginWorld: worldBodyFromBone(bones[index]!, s.binding),
            })));
            world.step();
            motion!.captureNativeStep(FIXED_DT);
            samples.push({ metrics: measureArmState(measurement), energyAllowanceJ });
          } else {
            const parentJoint = quat(segments[0]!.body.rotation()).multiply(quat(adapter.joint.frameX1()));
            // Freeze the original outer-tick waveform and world frame. Eight
            // equal impulses sum to the unchanged authored outer torque impulse.
            const torque = new Vector3(
              .03 * (Math.floor(physicalTicks / 60) % 2 === 0 ? 1 : -1),
              .01 * Math.sin(2 * physicalTicks * FIXED_DT + 1), 0,
            ).applyQuaternion(parentJoint).multiplyScalar(FIXED_DT).divideScalar(PHYSICS_SUBSTEPS);
            const torqueMagnitude = torque.length();
            for (let substep = 0; substep < PHYSICS_SUBSTEPS; substep++) {
              const beforeOmega = segments.map(s => length(s.body.angvel()));
              segments[1]!.body.applyTorqueImpulse(torque, true);
              segments[0]!.body.applyTorqueImpulse(torque.clone().negate(), true);
              // Work is measured before this substep's gravity/contact solve.
              for (let index = 0; index < 2; index++) {
                energyAllowanceJ += torqueMagnitude * (beforeOmega[index]! + length(segments[index]!.body.angvel())) / 2;
              }
              world.step();
              motion!.captureNativeStep((substep + 1) * PHYSICS_NATIVE_DT);
              samples.push({ metrics: measureArmState(measurement), energyAllowanceJ });
            }
          }

          // One completed authoritative interval, only after the entire native
          // integration batch succeeds. An inner failure invalidates the owner.
          tick++;
          authority!.capture(tick);
          motion!.completeStep();
          wallContactTicks += Number(samples.some(sample => sample.metrics.wallContacts > 0));
          wallNativeSteps += samples.filter(sample => sample.metrics.wallContacts > 0).length;
          wallImpulseNs += samples.reduce((sum, sample) => sum + sample.metrics.wallImpulseNs, 0);
          if (authority!.mode() === 'physics') {
            physicalTicks++;
            lastPhysicsStep = { nativeDtS: PHYSICS_NATIVE_DT, nativeSteps: PHYSICS_SUBSTEPS, samples };
          }
          return true;
        } catch (error) {
          destroy();
          throw error;
        }
      },
      snapshot() {
        alive();
        return {
          worldEpoch: motion!.worldEpoch, tick, mode: authority!.mode(), active, pending: pending !== null,
          counts: counts(), interval: motion!.read(), metrics: measureArmState(measurement), energyAllowanceJ,
          contacts: { wallTicks: wallContactTicks, wallNativeSteps, wallImpulseNs },
          lastPhysicsStep: structuredClone(lastPhysicsStep),
          handoff: structuredClone(transfer),
          segments: segments.map((s, index) => ({
            ref: { ...refs[index]! },
            binding: structuredClone(s.binding),
            jointAnchorLocal: { ...(index === 0 ? adapter.joint.anchor1() : adapter.joint.anchor2()) },
            bodyOriginWorld: pose(s.body.translation(), s.body.rotation()),
            boneWorld: worldBoneFromBody(pose(s.body.translation(), s.body.rotation()), s.binding),
            colliderWorld: pose(s.collider.translation(), s.collider.rotation()),
            comWorld: { ...s.body.worldCom() }, comVelocityWorldMps: { ...s.body.linvel() },
            angularVelocityWorldRadps: { ...s.body.angvel() }, massKg: s.body.mass(),
          })),
        };
      },
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
export type ArmFixture = Awaited<ReturnType<typeof createArmFixture>>;
export type ArmSnapshot = ReturnType<ArmFixture['snapshot']>;

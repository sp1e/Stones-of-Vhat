import RAPIER from '@dimforge/rapier3d-compat';
import { YARD_LAYOUT } from '../content/yardLayout.ts';
import type { BodyDefinition, Rotation, Shape, Vec3 } from '../content/yardLayout.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { createGrip } from './grip.ts';
import type { GripCommand, GripSnapshot } from './grip.ts';

export type MoveIntent = {
  right: number;
  forward: number;
  yaw: number;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
};
export type BodyPose = {
  sleeping: boolean;
  velocity: Vec3;
  angularVelocity: Vec3;
  id: string;
  position: Vec3;
  previousPosition: Vec3;
  rotation: Rotation;
  previousRotation: Rotation;
};
export type YardSnapshot = {
  grip: GripSnapshot;
  bodies: BodyPose[];
  player: {
    position: Vec3;
    eye: Vec3;
    previousEye: Vec3;
    grounded: boolean;
    crouched: boolean;
  };
};

const RADIUS = 0.3;
const STANDING_HALF = 0.55;
const CROUCHING_HALF = 0.25;
const COLLISION_OFFSET = 0.01;
const SLIDE_ANGLE = 50 * Math.PI / 180;
const IDENTITY: Rotation = { x: 0, y: 0, z: 0, w: 1 };
let initialization: Promise<void> | undefined;

function colliderDescription(shape: Shape): RAPIER.ColliderDesc {
  switch (shape.kind) {
    case 'box': return RAPIER.ColliderDesc.cuboid(shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2);
    case 'ball': return RAPIER.ColliderDesc.ball(shape.radius);
    case 'cylinder': return RAPIER.ColliderDesc.cylinder(shape.height / 2, shape.radius);
  }
}

export async function createYard(options: {
  layout?: readonly BodyDefinition[];
  spawn?: Vec3;
  crouched?: boolean;
} = {}) {
  const layout = options.layout ?? YARD_LAYOUT;
  const ids = new Set<string>();
  for (const definition of layout) {
    if (ids.has(definition.id)) throw new Error(`Duplicate body id: ${definition.id}`);
    ids.add(definition.id);
  }

  initialization ??= RAPIER.init();
  await initialization;
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_DT;
  const bodies = new Map<string, RAPIER.RigidBody>();
  const previous = new Map<string, { position: Vec3; rotation: Rotation }>();

  try {
    for (const definition of layout) {
      const description = definition.mass === undefined ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true);
      description.setTranslation(definition.position.x, definition.position.y, definition.position.z);
      description.setRotation(definition.rotation ?? IDENTITY);
      const body = world.createRigidBody(description);
      const collider = colliderDescription(definition.shape).setFriction(0.7);
      if (definition.mass !== undefined) collider.setMass(definition.mass);
      world.createCollider(collider, body);
      bodies.set(definition.id, body);
    }

    let crouched = options.crouched ?? false;
    let half = crouched ? CROUCHING_HALF : STANDING_HALF;
    const spawn = options.spawn ?? { x: 0, y: 1, z: 8 };
    const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z));
    const playerCollider = world.createCollider(RAPIER.ColliderDesc.capsule(half, RADIUS).setFriction(0.7), player);
    const controller = world.createCharacterController(COLLISION_OFFSET);
    controller.enableAutostep(0.25, 0.35, false);
    controller.enableSnapToGround(0.2);
    controller.setMaxSlopeClimbAngle(Math.PI / 4);
    controller.setMinSlopeSlideAngle(SLIDE_ANGLE);
    controller.setApplyImpulsesToDynamicBodies(true);
    controller.setCharacterMass(80);

    // One explicit initialization step publishes fresh colliders to Rapier's query pipeline.
    // Every subsequent step(intent) advances exactly one FIXED_DT; there are no hidden live steps.
    world.step();
    let destroyed = false;
    let grounded = false;
    let verticalVelocity = 0;
    const eyePosition = (): Vec3 => {
      const position = player.translation();
      return { x: position.x, y: position.y + half + RADIUS - 0.1, z: position.z };
    };
    let previousEye = eyePosition();
    const grip = createGrip(world, bodies, player);
    const recordPrevious = () => {
      for (const [id, body] of bodies) previous.set(id, { position: { ...body.translation() }, rotation: { ...body.rotation() } });
    };
    recordPrevious();
    const assertAlive = () => {
      if (destroyed) throw new Error('Yard has been destroyed');
    };

    return {
      layout,
      step(intent: MoveIntent, gripCommand?: GripCommand): void {
        assertAlive();
        if (![intent.right, intent.forward, intent.yaw].every(Number.isFinite)) throw new Error('Movement axes and yaw must be finite');
        recordPrevious();
        previousEye = eyePosition();
        if (intent.crouch !== crouched) {
          const nextHalf = intent.crouch ? CROUCHING_HALF : STANDING_HALF;
          const position = player.translation();
          const nextPosition = { x: position.x, y: position.y + nextHalf - half, z: position.z };
          const nextShape = new RAPIER.Capsule(nextHalf, RADIUS);
          const blocked = !intent.crouch && world.intersectionWithShape(nextPosition, IDENTITY, nextShape, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, playerCollider, player) !== null;
          if (!blocked) {
            playerCollider.setShape(nextShape);
            player.setTranslation(nextPosition, true);
            world.propagateModifiedBodyPositionsToColliders();
            half = nextHalf;
            crouched = intent.crouch;
          }
        }

        // On a nearby non-sliding support, snap-to-ground supplies adhesion.
        // Constant downward input can make Rapier's float slope decomposition
        // mistake a level contact for slipping and discard horizontal movement.
        // A centre-foot ray verifies support without a near-tangent shape cast.
        // Unsupported and steep contacts still receive gravity, and every
        // movement still goes through the KCC's full capsule collision sweep.
        const support = grounded ? world.castRayAndGetNormal(
          new RAPIER.Ray(player.translation(), { x: 0, y: -1, z: 0 }),
          half + RADIUS + COLLISION_OFFSET + 0.05, true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, playerCollider, player,
        ) : null;
        const supported = support !== null && support.normal.y / Math.hypot(support.normal.x, support.normal.y, support.normal.z) > Math.cos(SLIDE_ANGLE);
        if (grounded && intent.jump && !crouched) verticalVelocity = 5.5;
        else if (supported) verticalVelocity = 0;
        else if (grounded) verticalVelocity = -1;
        else verticalVelocity = Math.max(-30, verticalVelocity - 18 * FIXED_DT);
        const divisor = Math.max(1, Math.hypot(intent.right, intent.forward));
        const speed = crouched ? 2 : intent.sprint ? 6.8 : 4.2;
        const right = intent.right / divisor;
        const forward = intent.forward / divisor;
        const cos = Math.cos(intent.yaw);
        const sin = Math.sin(intent.yaw);
        const desired = {
          x: (right * cos - forward * sin) * speed * FIXED_DT,
          y: verticalVelocity * FIXED_DT,
          z: (-right * sin - forward * cos) * speed * FIXED_DT,
        };
        controller.computeColliderMovement(playerCollider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
        const movement = controller.computedMovement();
        if (verticalVelocity > 0 && movement.y < desired.y - 0.001) verticalVelocity = 0;
        const position = player.translation();
        player.setNextKinematicTranslation({ x: position.x + movement.x, y: position.y + movement.y, z: position.z + movement.z });
        grounded = controller.computedGrounded();
        grip.step(eyePosition(), gripCommand);
        world.step();
      },
      releaseGrip(): void { assertAlive(); grip.release(); },
      snapshot(): YardSnapshot {
        assertAlive();
        return {
          grip: grip.snapshot(),
          bodies: Array.from(bodies, ([id, body]) => {
            const old = previous.get(id)!;
            return { id, position: { ...body.translation() }, rotation: { ...body.rotation() },
              previousPosition: { ...old.position }, previousRotation: { ...old.rotation },
              velocity: { ...body.linvel() }, angularVelocity: { ...body.angvel() }, sleeping: body.isSleeping() };
          }),
          player: { position: { ...player.translation() }, eye: eyePosition(), previousEye: { ...previousEye }, grounded, crouched },
        };
      },
      counts(): { bodies: number; colliders: number } {
        return destroyed ? { bodies: 0, colliders: 0 } : { bodies: world.bodies.len(), colliders: world.colliders.len() };
      },
      destroy(): void {
        if (destroyed) return;
        grip.release();
        destroyed = true;
        bodies.clear();
        previous.clear();
        world.removeCharacterController(controller);
        world.free();
      },
    };
  } catch (error) {
    world.free();
    throw error;
  }
}

export type Yard = Awaited<ReturnType<typeof createYard>>;

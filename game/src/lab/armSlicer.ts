import type { ArmFixture } from '../physics/armFixture.ts';
import { createArmContactBatch } from '../physics/armContactBatch.ts';
import type { ArmSnapshot } from '../physics/armFixture.ts';
import type { ContactFamilyResult } from '../physics/contactFamily.ts';
import type { ColliderRef } from '../physics/bodyMotion.ts';
import {
  validateLinearContactCast,
  type LinearContactCast,
} from '../physics/contactPairQuery.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import type { Vec3 } from '../content/yardLayout.ts';

export const ARM_SLICER_LIMITS = Object.freeze({
  maxCasts: 8,
  maxLifetimeTicks: 30,
  maxRecent: 16,
  defaultSpeedMps: 16,
});

export type ArmSlicerBlade = 'horizontal' | 'vertical';
export type ArmSlicerIdentity = {
  worldEpoch: string;
  generation: number;
  serial: number;
  castId: string;
  projectileId: string;
};
export type ArmSlicerCommand = {
  blade: ArmSlicerBlade;
  startPosition: Vec3;
  velocityMps: Vec3;
  lifetimeTicks: number;
};
export type ArmSlicerTerminalRecord = ArmSlicerIdentity & {
  kind: 'hit' | 'blocked' | 'unresolved' | 'expired';
  blade: ArmSlicerBlade;
  shape: LinearContactCast['shape'];
  birthTick: number;
  birthTimeS: number;
  terminalTick: number;
  terminalTimeS: number;
  ageTicks: number;
  elapsedS: number;
  terminalOffsetS: number;
  startPosition: Vec3;
  intervalStartPosition: Vec3;
  intervalEndPosition: Vec3;
  plannedEndPosition: Vec3;
  terminalPosition: Vec3;
  velocityMps: Vec3;
  selectedCollider?: ColliderRef;
  family: ContactFamilyResult;
  snapshot: ArmSnapshot;
};

type CastState = ArmSlicerIdentity & {
  blade: ArmSlicerBlade;
  shape: LinearContactCast['shape'];
  birthTick: number;
  ageTicks: number;
  lifetimeTicks: number;
  startPosition: Vec3;
  position: Vec3;
  plannedEndPosition: Vec3;
  velocityMps: Vec3;
};

const IDENTITY = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });
let controllerGeneration = 0;
function nextGeneration(): number {
  if (controllerGeneration >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Arm slicer controller generation exhausted');
  }
  controllerGeneration++;
  return controllerGeneration;
}
const SHAPES = Object.freeze({
  horizontal: Object.freeze({ kind: 'box' as const, size: Object.freeze([.12, .01, .12] as const) }),
  vertical: Object.freeze({ kind: 'box' as const, size: Object.freeze([.01, .12, .12] as const) }),
});

const copyVector = (value: Vec3): Vec3 => ({ x: value.x, y: value.y, z: value.z });
const addScaled = (position: Vec3, velocity: Vec3, seconds: number): Vec3 => ({
  x: position.x + velocity.x * seconds,
  y: position.y + velocity.y * seconds,
  z: position.z + velocity.z * seconds,
});
const shapeFor = (blade: ArmSlicerBlade): LinearContactCast['shape'] => structuredClone(SHAPES[blade]);

function checkedBlade(value: unknown): ArmSlicerBlade {
  if (value !== 'horizontal' && value !== 'vertical') {
    throw new Error('Slicer blade must be horizontal or vertical');
  }
  return value;
}

function checkedVector(value: unknown, label: string): Vec3 {
  if (!value || typeof value !== 'object') throw new Error(`${label} must be a finite vector`);
  const candidate = value as Vec3;
  for (const component of [candidate.x, candidate.y, candidate.z]) {
    if (!Number.isFinite(component) || !Number.isFinite(Math.fround(component))) {
      throw new Error(`${label} must be finite and float32 representable`);
    }
  }
  return copyVector(candidate);
}

function checkedLifetime(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1
    || (value as number) > ARM_SLICER_LIMITS.maxLifetimeTicks) {
    throw new Error('Slicer lifetime must be a safe integer from 1 through 30');
  }
  return value as number;
}

function checkedVelocity(value: unknown): Vec3 {
  const velocity = checkedVector(value, 'Slicer velocity');
  if (Math.hypot(velocity.x, velocity.y, velocity.z) > 40) {
    throw new Error('Slicer velocity must not exceed 40 m/s');
  }
  return velocity;
}

function checkedBoundary(snapshot: ArmSnapshot, epoch: string, expectedTick: number): void {
  if (snapshot.worldEpoch !== epoch || snapshot.tick !== expectedTick) {
    throw new Error('Arm slicer owner boundary changed outside this controller');
  }
}

export async function createArmSlicer(
  arm: ArmFixture,
  options: { maxNativeCalls?: number } = {},
) {
  const batch = await createArmContactBatch(arm, options);
  let initial: ArmSnapshot;
  try {
    initial = arm.snapshot();
  } catch (error) {
    batch.destroy();
    throw error;
  }
  const worldEpoch = initial.worldEpoch;
  let expectedTick = initial.tick;
  let generation: number;
  try {
    generation = nextGeneration();
  } catch (error) {
    batch.destroy();
    throw error;
  }
  let serial = 0;
  let closed = false;
  let queued: CastState[] = [];
  let active: CastState[] = [];
  let recent: ArmSlicerTerminalRecord[] = [];
  let events: ArmSlicerTerminalRecord[] = [];
  const counters = {
    accepted: 0,
    cancelled: 0,
    hit: 0,
    blocked: 0,
    unresolved: 0,
    expired: 0,
  };

  const clearPending = (clearRecent: boolean): void => {
    queued = [];
    active = [];
    events = [];
    if (clearRecent) recent = [];
  };
  const alive = (): void => {
    if (closed) throw new Error('Arm slicer controller is destroyed or closed');
  };
  const closeFrom = (error: unknown): never => {
    closed = true;
    clearPending(true);
    batch.destroy();
    throw error;
  };
  const detachedState = (cast: CastState) => structuredClone({
    worldEpoch: cast.worldEpoch,
    generation: cast.generation,
    serial: cast.serial,
    castId: cast.castId,
    projectileId: cast.projectileId,
    blade: cast.blade,
    shape: cast.shape,
    birthTick: cast.birthTick,
    ageTicks: cast.ageTicks,
    lifetimeTicks: cast.lifetimeTicks,
    startPosition: cast.startPosition,
    position: cast.position,
    plannedEndPosition: cast.plannedEndPosition,
    velocityMps: cast.velocityMps,
  });

  const controller = {
    enqueue(input: ArmSlicerCommand): (ArmSlicerIdentity & { startPosition: Vec3 }) | null {
      alive();
      let boundary: ArmSnapshot;
      try {
        boundary = arm.snapshot();
      } catch (error) {
        return closeFrom(error);
      }
      checkedBoundary(boundary, worldEpoch, expectedTick);
      if (!boundary.active || queued.length + active.length >= ARM_SLICER_LIMITS.maxCasts) return null;

      const blade = checkedBlade(input?.blade);
      const startPosition = checkedVector(input?.startPosition, 'Slicer start position');
      const velocityMps = checkedVelocity(input?.velocityMps);
      const lifetimeTicks = checkedLifetime(input?.lifetimeTicks);
      const shape = shapeFor(blade);
      const interval = {
        worldEpoch,
        fromTick: expectedTick,
        toTick: expectedTick + 1,
        dtS: FIXED_DT,
      };
      const firstEnd = addScaled(startPosition, velocityMps, FIXED_DT);
      const plannedEndPosition = addScaled(startPosition, velocityMps, lifetimeTicks * FIXED_DT);
      const preflight = (position: Vec3, endPosition: Vec3) => validateLinearContactCast(interval, {
        worldEpoch,
        fromTick: expectedTick,
        toTick: expectedTick + 1,
        castId: 'slicer-preflight',
        projectileId: 'slicer-preflight',
        shape,
        startPose: { position, rotation: IDENTITY },
        endPosition,
      });
      preflight(startPosition, firstEnd);
      preflight(plannedEndPosition, plannedEndPosition);

      const nextSerial = serial + 1;
      const prefix = `${worldEpoch}:${generation}:${nextSerial}`;
      const identity: ArmSlicerIdentity = {
        worldEpoch,
        generation,
        serial: nextSerial,
        castId: `slicer-cast:${prefix}`,
        projectileId: `slicer-projectile:${prefix}`,
      };
      const cast: CastState = {
        ...identity,
        blade,
        shape,
        birthTick: expectedTick,
        ageTicks: 0,
        lifetimeTicks,
        startPosition,
        position: copyVector(startPosition),
        plannedEndPosition,
        velocityMps,
      };
      queued.push(cast);
      serial = nextSerial;
      counters.accepted++;
      return structuredClone({ ...identity, startPosition });
    },

    step(): boolean {
      alive();
      try {
        const boundary = arm.snapshot();
        checkedBoundary(boundary, worldEpoch, expectedTick);
        if (!boundary.active) return false;

        const pending = [...active, ...queued];
        const prepared = pending.map(cast => {
          const endPosition = addScaled(cast.position, cast.velocityMps, FIXED_DT);
          const interval = { worldEpoch, fromTick: expectedTick, toTick: expectedTick + 1, dtS: FIXED_DT };
          const linear = validateLinearContactCast(interval, {
            worldEpoch,
            fromTick: expectedTick,
            toTick: expectedTick + 1,
            castId: cast.castId,
            projectileId: cast.projectileId,
            shape: cast.shape,
            startPose: { position: cast.position, rotation: IDENTITY },
            endPosition,
          });
          validateLinearContactCast(interval, {
            ...linear,
            startPose: { position: cast.plannedEndPosition, rotation: IDENTITY },
            endPosition: cast.plannedEndPosition,
          });
          return { cast, linear, endPosition };
        });

        if (!arm.step()) return false;
        const nextTick = expectedTick + 1;
        if (!prepared.length) {
          expectedTick = nextTick;
          return true;
        }

        const result = batch.queryTick(prepared.map(item => item.linear));
        if (result.worldEpoch !== worldEpoch || result.fromTick !== expectedTick
          || result.toTick !== nextTick || result.snapshot.tick !== nextTick
          || result.families.length !== prepared.length) {
          throw new Error('Arm slicer received a mismatched contact batch');
        }
        const byIdentity = new Map(result.families.map(family => [
          JSON.stringify([family.identity.castId, family.identity.projectileId]), family,
        ]));
        const nextActive: CastState[] = [];
        const terminal: ArmSlicerTerminalRecord[] = [];
        for (const item of prepared) {
          const family = byIdentity.get(JSON.stringify([item.cast.castId, item.cast.projectileId]));
          if (!family || family.identity.worldEpoch !== worldEpoch
            || family.identity.fromTick !== expectedTick || family.identity.toTick !== nextTick) {
            throw new Error('Arm slicer contact family identity is incomplete or stale');
          }
          const completedAge = item.cast.ageTicks + 1;
          if (family.kind === 'clear' && completedAge < item.cast.lifetimeTicks) {
            nextActive.push({ ...item.cast, ageTicks: completedAge, position: copyVector(item.endPosition) });
            continue;
          }
          const kind: ArmSlicerTerminalRecord['kind'] = family.kind === 'clear' ? 'expired' : family.kind;
          const offsetS = family.kind === 'hit' ? family.hit.upperS
            : family.kind === 'blocked' || family.kind === 'unresolved' ? family.earliestPossibleS
              : FIXED_DT;
          if (!Number.isFinite(offsetS) || offsetS < 0 || offsetS > FIXED_DT) {
            throw new Error('Arm slicer terminal offset is outside the completed interval');
          }
          const terminalPosition = addScaled(item.cast.position, item.cast.velocityMps, offsetS);
          const elapsedS = item.cast.ageTicks * FIXED_DT + offsetS;
          const birthTimeS = item.cast.birthTick * FIXED_DT;
          const record: ArmSlicerTerminalRecord = {
            worldEpoch,
            generation: item.cast.generation,
            serial: item.cast.serial,
            castId: item.cast.castId,
            projectileId: item.cast.projectileId,
            kind,
            blade: item.cast.blade,
            shape: structuredClone(item.cast.shape),
            birthTick: item.cast.birthTick,
            birthTimeS,
            terminalTick: nextTick,
            terminalTimeS: birthTimeS + elapsedS,
            ageTicks: completedAge,
            elapsedS,
            terminalOffsetS: offsetS,
            startPosition: copyVector(item.cast.startPosition),
            intervalStartPosition: copyVector(item.cast.position),
            intervalEndPosition: copyVector(item.endPosition),
            plannedEndPosition: copyVector(item.cast.plannedEndPosition),
            terminalPosition,
            velocityMps: copyVector(item.cast.velocityMps),
            ...(family.kind === 'hit' ? { selectedCollider: structuredClone(family.hit.identity.target) } : {}),
            family: structuredClone(family),
            snapshot: structuredClone(result.snapshot),
          };
          terminal.push(record);
        }
        if (byIdentity.size !== prepared.length) throw new Error('Arm slicer contact batch contained surplus identities');

        active = nextActive;
        queued = [];
        expectedTick = nextTick;
        for (const record of terminal) {
          counters[record.kind]++;
          recent.push(structuredClone(record));
          events.push(structuredClone(record));
        }
        recent = recent.slice(-ARM_SLICER_LIMITS.maxRecent);
        events = events.slice(-ARM_SLICER_LIMITS.maxRecent);
        return true;
      } catch (error) {
        return closeFrom(error);
      }
    },

    cancel(): void {
      alive();
      counters.cancelled += queued.length + active.length;
      clearPending(false);
    },

    clearHistory(): void {
      alive();
      counters.cancelled += queued.length + active.length;
      generation = nextGeneration();
      clearPending(true);
    },

    read() {
      alive();
      return structuredClone({
        worldEpoch,
        expectedTick,
        generation,
        active: active.map(detachedState),
        queued: queued.map(detachedState),
        recent,
        counters,
      });
    },

    drainEvents(): ArmSlicerTerminalRecord[] {
      alive();
      const result = structuredClone(events);
      events = [];
      return result;
    },

    destroy(): void {
      if (closed) return;
      closed = true;
      clearPending(true);
      batch.destroy();
    },
  };
  return controller;
}

export type ArmSlicer = Awaited<ReturnType<typeof createArmSlicer>>;

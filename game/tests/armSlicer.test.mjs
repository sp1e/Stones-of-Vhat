import assert from 'node:assert/strict';
import test from 'node:test';
import RAPIER from '@dimforge/rapier3d-compat';

import { ARM_SLICER_LIMITS, createArmSlicer } from '../src/lab/armSlicer.ts';
import { createArmFixture } from '../src/physics/armFixture.ts';
import { createFixedStepper, FIXED_DT } from '../src/runtime/fixedStep.ts';

const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });

function defaultCommand(arm, overrides = {}) {
  const snapshot = arm.snapshot();
  const center = snapshot.segments.find(segment => segment.ref.bodyId === 'forearm').colliderWorld.position;
  return {
    blade: 'horizontal',
    startPosition: { x: center.x, y: center.y, z: center.z + .6 },
    velocityMps: vector(0, 0, -ARM_SLICER_LIMITS.defaultSpeedMps),
    lifetimeTicks: ARM_SLICER_LIMITS.maxLifetimeTicks,
    ...overrides,
  };
}

test('arm slicer publishes the immutable laboratory limits', async () => {
  assert.deepEqual(ARM_SLICER_LIMITS, {
    maxCasts: 8,
    maxLifetimeTicks: 30,
    maxRecent: 16,
    defaultSpeedMps: 16,
  });
  assert.equal(Object.isFrozen(ARM_SLICER_LIMITS), true);
  assert.equal(typeof createArmSlicer, 'function');
});

test('retains one owner-bound controller and records a genuine boundary-born forearm hit', async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  try {
    assert.equal(slicer.enqueue(defaultCommand(arm)), null, 'paused input must not become latent');
    arm.setActive(true);
    const command = defaultCommand(arm);
    const submitted = slicer.enqueue(command);
    assert.ok(submitted?.castId && submitted?.projectileId);
    command.startPosition.z = 99;
    command.velocityMps.z = 0;
    assert.equal(slicer.step(), true);
    assert.equal(slicer.read().recent.length, 0);
    assert.equal(slicer.step(), true);
    const state = slicer.read();
    assert.equal(state.active.length, 0);
    assert.equal(state.queued.length, 0);
    assert.equal(state.recent.length, 1);
    const record = state.recent[0];
    assert.equal(record.birthTimeS, record.birthTick * FIXED_DT);
    assert.equal(record.terminalTimeS, record.birthTimeS + record.elapsedS);
    assert.equal(record.kind, 'hit');
    assert.equal(record.family.kind, 'hit');
    assert.equal(record.family.candidates.length, 4);
    assert.equal(record.selectedCollider.bodyId, 'forearm');
    assert.equal(record.birthTick, 0);
    assert.equal(record.ageTicks, 2);
    assert.ok(record.elapsedS > FIXED_DT && record.elapsedS < 2 * FIXED_DT);
    assert.deepEqual(record.startPosition, submitted.startPosition);
    assert.notEqual(record.terminalPosition.z, 99);
    assert.equal(arm.snapshot().tick, 2);

    const firstEvents = slicer.drainEvents();
    assert.equal(firstEvents.length, 1);
    assert.equal(firstEvents[0].projectileId, submitted.projectileId);
    firstEvents[0].family.candidates.length = 0;
    assert.deepEqual(slicer.drainEvents(), []);
    assert.equal(slicer.read().recent[0].family.candidates.length, 4);
  } finally {
    slicer.destroy();
    assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
    arm.destroy();
  }
});

test('reproduces the 24 boundary-born animation and physical handoff controls', { timeout: 60_000 }, async context => {
  let cases = 0;
  for (const birthTick of [1, 30, 90]) for (const mode of ['animation', 'physics']) {
    for (const speed of [16, 40]) for (const blade of ['horizontal', 'vertical']) {
      const arm = await createArmFixture();
      const slicer = await createArmSlicer(arm);
      try {
        arm.setActive(true);
        while (arm.snapshot().tick < birthTick) assert.equal(slicer.step(), true);
        if (mode === 'physics') {
          const boundary = arm.snapshot();
          const center = boundary.segments.find(segment => segment.ref.bodyId === 'forearm').comWorld;
          arm.handoff({
            worldEpoch: boundary.worldEpoch,
            atTick: boundary.tick,
            impulse: {
              bodyId: 'forearm',
              impulseWorldNs: vector(1.8, 0, 0),
              pointWorld: { x: center.x, y: center.y + .02, z: center.z },
            },
          });
        }
        const identity = slicer.enqueue(defaultCommand(arm, {
          blade,
          velocityMps: vector(0, 0, -speed),
        }));
        assert.ok(identity);
        let terminalSteps = 0;
        while (!slicer.read().recent.length && terminalSteps < ARM_SLICER_LIMITS.maxLifetimeTicks) {
          assert.equal(slicer.step(), true);
          terminalSteps++;
        }
        const record = slicer.read().recent[0];
        assert.ok(record, `${birthTick}/${mode}/${speed}/${blade} did not terminate within 30 owner steps`);
        assert.ok(terminalSteps >= 1 && terminalSteps <= ARM_SLICER_LIMITS.maxLifetimeTicks);
        assert.equal(record.kind, 'hit', `${birthTick}/${mode}/${speed}/${blade}`);
        assert.equal(record.selectedCollider.bodyId, 'forearm');
        assert.equal(record.family.candidates.length, 4);
        assert.deepEqual(new Set(record.family.candidates.map(candidate => candidate.identity.target.bodyId)),
          new Set(['floor', 'forearm', 'upper-arm', 'wall']));
        assert.equal(record.ageTicks, speed === 16 ? 2 : 1);
        assert.equal(record.birthTick, birthTick);
        assert.equal(record.terminalTick, birthTick + record.ageTicks);
        assert.ok(record.elapsedS > 0 && record.elapsedS <= record.ageTicks * FIXED_DT);
        assert.equal(slicer.drainEvents().length, 1);
        assert.equal(slicer.drainEvents().length, 0);
        assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
        cases++;
      } finally {
        slicer.destroy();
        arm.destroy();
      }
    }
  }
  context.diagnostic(`verified ${cases}/24 boundary-born slicer cases`);
});

test('validates commands before identity allocation and shares the eight-cast queue and active cap', async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  try {
    arm.setActive(true);
    for (const change of [
      { blade: 'diagonal' },
      { velocityMps: vector(41, 0, 0) },
      { velocityMps: vector(NaN, 0, 0) },
      { lifetimeTicks: 0 },
      { lifetimeTicks: 31 },
      { lifetimeTicks: 1.5 },
      { startPosition: vector(31.99, 0, 0), velocityMps: vector(40, 0, 0) },
    ]) assert.throws(() => slicer.enqueue(defaultCommand(arm, change)), /blade|velocity|lifetime|extent|32|finite/i);
    assert.equal(slicer.read().counters.accepted, 0);
    const identities = [];
    for (let index = 0; index < 8; index++) identities.push(slicer.enqueue(defaultCommand(arm, {
      velocityMps: vector(0, 0, 1),
    })));
    assert.equal(slicer.enqueue(defaultCommand(arm)), null);
    assert.deepEqual(identities.map(identity => identity.serial), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(new Set(identities.map(identity => identity.castId)).size, 8);
    assert.equal(slicer.read().queued.length, 8);
    assert.equal(slicer.step(), true);
    assert.equal(slicer.read().active.length, 8);
    assert.equal(slicer.enqueue(defaultCommand(arm)), null);
  } finally {
    slicer.destroy();
    arm.destroy();
  }
});

test('rejects a valid first interval whose planned final endpoint leaves the cast domain', async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  try {
    arm.setActive(true);
    const before = slicer.read();
    assert.throws(() => slicer.enqueue(defaultCommand(arm, {
      startPosition: vector(20, 0, 0),
      velocityMps: vector(40, 0, 0),
      lifetimeTicks: 30,
    })), /extent|32|domain/i);
    const rejected = slicer.read();
    assert.equal(arm.snapshot().tick, 0);
    assert.deepEqual(rejected, before);
    const accepted = slicer.enqueue(defaultCommand(arm, { velocityMps: vector(0, 0, 1) }));
    assert.ok(accepted);assert.equal(accepted.serial, 1);
  } finally {
    slicer.destroy();
    arm.destroy();
  }
});

test('distinguishes cancellation from presentation-history invalidation without resetting the batch ledger', async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  try {
    arm.setActive(true);
    const first = slicer.enqueue(defaultCommand(arm, { velocityMps: vector(0, 0, 1), lifetimeTicks: 3 }));
    assert.ok(first);
    assert.equal(slicer.step(), true);
    assert.equal(slicer.read().active.length, 1);
    slicer.cancel();
    assert.equal(slicer.read().active.length, 0);
    assert.equal(slicer.read().recent.length, 0);
    assert.equal(slicer.drainEvents().length, 0);
    arm.setActive(false);
    assert.equal(slicer.enqueue(defaultCommand(arm)), null);
    arm.setActive(true);
    const resumed = slicer.enqueue(defaultCommand(arm, { velocityMps: vector(0, 0, 1), lifetimeTicks: 1 }));
    assert.ok(resumed);
    assert.equal(slicer.step(), true);
    assert.equal(slicer.read().recent[0].kind, 'expired');
    const beforeGeneration = slicer.read().generation;
    slicer.clearHistory();
    assert.equal(slicer.read().recent.length, 0);
    assert.equal(slicer.read().generation, beforeGeneration + 1);
    const after = slicer.enqueue(defaultCommand(arm, { velocityMps: vector(0, 0, 1), lifetimeTicks: 1 }));
    assert.ok(after);
    assert.notEqual(after.generation, resumed.generation);
    assert.equal(slicer.step(), true, 'the retained batch must accept the next owner interval');
    assert.equal(slicer.read().recent[0].kind, 'expired');
  } finally {
    slicer.destroy();
    arm.destroy();
  }
});

test('bounds recent records and terminal events independently and returns detached data', async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  try {
    arm.setActive(true);
    for (let index = 0; index < 18; index++) {
      const command = defaultCommand(arm, { velocityMps: vector(0, 0, 1), lifetimeTicks: 1 });
      assert.ok(slicer.enqueue(command));
      assert.equal(slicer.step(), true);
    }
    const state = slicer.read();
    assert.equal(state.recent.length, 16);
    assert.deepEqual(state.recent.map(record => record.serial), Array.from({ length: 16 }, (_, index) => index + 3));
    state.recent[0].terminalPosition.z = 999;
    state.counters.expired = 0;
    assert.notEqual(slicer.read().recent[0].terminalPosition.z, 999);
    assert.equal(slicer.read().counters.expired, 18);
    const delivered = slicer.drainEvents();
    assert.equal(delivered.length, 16);
    delivered[0].family.candidates.length = 0;
    assert.equal(slicer.drainEvents().length, 0);
    assert.equal(slicer.read().recent[0].family.candidates.length, 4);
  } finally {
    slicer.destroy();
    arm.destroy();
  }
});

test('terminates honestly at uncertainty and closes on stale or exceptional owner advancement', async () => {
  const unresolvedArm = await createArmFixture();
  const unresolved = await createArmSlicer(unresolvedArm, { maxNativeCalls: 0 });
  try {
    unresolvedArm.setActive(true);
    assert.ok(unresolved.enqueue(defaultCommand(unresolvedArm)));
    assert.equal(unresolved.step(), true);
    const record = unresolved.read().recent[0];
    assert.equal(record.kind, 'unresolved');
    assert.equal(record.terminalOffsetS, 0);
    assert.deepEqual(record.terminalPosition, record.intervalStartPosition);
    assert.equal(record.family.candidates.length, 4);
    assert.ok(record.family.candidates.every(candidate => candidate.kind === 'unqueried'));
  } finally {
    unresolved.destroy();
    unresolvedArm.destroy();
  }

  const staleArm = await createArmFixture();
  const stale = await createArmSlicer(staleArm);
  try {
    staleArm.setActive(true);
    assert.equal(staleArm.step(), true);
    assert.throws(() => stale.step(), /boundary|outside|stale/i);
    assert.throws(() => stale.read(), /destroy|closed/i);
    assert.deepEqual(staleArm.counts(), { bodies: 4, colliders: 4, joints: 1 });
  } finally {
    stale.destroy();
    staleArm.destroy();
  }

  const failingArm = await createArmFixture();
  const failing = await createArmSlicer(failingArm);
  const originalStep = failingArm.step;
  try {
    failingArm.setActive(true);
    assert.ok(failing.enqueue(defaultCommand(failingArm)));
    failingArm.step = () => { throw new Error('injected owner step failure'); };
    assert.throws(() => failing.step(), /injected owner step failure/);
    assert.throws(() => failing.read(), /destroy|closed/i);
    assert.deepEqual(failingArm.counts(), { bodies: 4, colliders: 4, joints: 1 });
  } finally {
    failingArm.step = originalStep;
    failing.destroy();
    failingArm.destroy();
  }
});

test('closes atomically when terminal publication fails after the owner step', { concurrency: false }, async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  const originalClone = globalThis.structuredClone;
  const originalContact = RAPIER.Shape.prototype.contactShape;
  let familyClones = 0, nativeCalls = 0;
  try {
    arm.setActive(true);
    assert.ok(slicer.enqueue(defaultCommand(arm, { velocityMps: vector(0, 0, 1), lifetimeTicks: 1 })));
    assert.ok(slicer.enqueue(defaultCommand(arm, { velocityMps: vector(0, 0, 1), lifetimeTicks: 1 })));
    RAPIER.Shape.prototype.contactShape = function observedAtomicWork(...args) {
      nativeCalls++;
      return originalContact.apply(this, args);
    };
    globalThis.structuredClone = function failSecondTerminalFamily(value, options) {
      if (value?.evidence === 'declared-candidate-family' && ++familyClones === 2) {
        throw new Error('injected second terminal publication failure');
      }
      return originalClone(value, options);
    };
    assert.throws(() => slicer.step(), /injected second terminal publication failure/);
    assert.equal(familyClones, 2);assert.ok(nativeCalls > 0);
    assert.equal(arm.snapshot().tick, 1);assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
    const callsAfterFailure = nativeCalls;
    for (const operation of [
      () => slicer.read(),
      () => slicer.drainEvents(),
      () => slicer.step(),
      () => slicer.enqueue(defaultCommand(arm)),
    ]) assert.throws(operation, /destroy|closed/i);
    assert.equal(nativeCalls, callsAfterFailure,'closed retries must not recreate or query a batch ledger');
    assert.equal(arm.snapshot().tick, 1,'closed retry must not advance the owner');
  } finally {
    globalThis.structuredClone = originalClone;
    RAPIER.Shape.prototype.contactShape = originalContact;
    slicer.destroy();
    assert.deepEqual(arm.counts(), { bodies: 4, colliders: 4, joints: 1 });
    arm.destroy();
  }
});

test('keeps blocked, expiry and contact records semantically distinct', async () => {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  try {
    arm.setActive(true);
    const boundary = arm.snapshot();
    const center = boundary.segments.find(segment => segment.ref.bodyId === 'forearm').colliderWorld.position;
    assert.ok(slicer.enqueue({
      blade: 'horizontal',
      startPosition: { x: center.x - .5, y: center.y, z: center.z },
      velocityMps: vector(40, 0, 0),
      lifetimeTicks: 30,
    }));
    assert.equal(slicer.step(), true);
    const blocked = slicer.read().recent[0];
    assert.equal(blocked.kind, 'blocked');
    assert.equal(blocked.terminalOffsetS, 0);
    assert.equal(blocked.selectedCollider, undefined);
    assert.equal(blocked.family.candidates.find(candidate => candidate.identity.target.bodyId === 'upper-arm').kind,
      'initial-blocked');
    assert.equal(blocked.family.candidates.find(candidate => candidate.identity.target.bodyId === 'forearm').kind,
      'hit');
    assert.equal('damage' in blocked, false);
    assert.equal('anatomy' in blocked, false);

    assert.ok(slicer.enqueue(defaultCommand(arm, {
      velocityMps: vector(0, 0, 1),
      lifetimeTicks: 30,
    })));
    for (let count = 0; count < 30; count++) assert.equal(slicer.step(), true);
    const expired = slicer.read().recent.at(-1);
    assert.equal(expired.kind, 'expired');
    assert.equal(expired.terminalOffsetS, FIXED_DT);
    assert.equal(expired.selectedCollider, undefined);
    assert.ok(Math.hypot(
      expired.terminalPosition.x - expired.plannedEndPosition.x,
      expired.terminalPosition.y - expired.plannedEndPosition.y,
      expired.terminalPosition.z - expired.plannedEndPosition.z,
    ) < 1e-12);
  } finally {
    slicer.destroy();
    arm.destroy();
  }
});

async function cadenceOutcome(hz, firstElapsed = 1 / hz) {
  const arm = await createArmFixture();
  const slicer = await createArmSlicer(arm);
  const advance = createFixedStepper();
  let injected = false;
  try {
    arm.setActive(true);
    let frames = 0;
    while (arm.snapshot().tick < 8) {
      const elapsed = frames === 0 ? firstElapsed : 1 / hz;
      advance(elapsed, true, () => {
        if (!injected && arm.snapshot().tick === 0) {
          injected = true;
          assert.ok(slicer.enqueue(defaultCommand(arm, { blade: 'horizontal' })));
          assert.ok(slicer.enqueue(defaultCommand(arm, { blade: 'vertical' })));
        }
        assert.equal(slicer.step(), true);
      });
      frames++;
      assert.ok(frames < 10_000);
    }
    return slicer.read().recent.map(record => ({
      serial: record.serial,
      castId: record.castId
        .replace(record.worldEpoch, '<epoch>')
        .replace(`:${record.generation}:`, ':<generation>:'),
      projectileId: record.projectileId
        .replace(record.worldEpoch, '<epoch>')
        .replace(`:${record.generation}:`, ':<generation>:'),
      blade: record.blade,
      kind: record.kind,
      birthTick: record.birthTick,
      terminalTick: record.terminalTick,
      elapsedS: record.elapsedS,
      selectedBody: record.selectedCollider?.bodyId ?? null,
      candidates: record.family.candidates.map(candidate => ({
        bodyId: candidate.identity.target.bodyId,
        kind: candidate.kind,
      })),
    }));
  } finally {
    slicer.destroy();
    arm.destroy();
  }
}

test('fixed-step command replay is cadence-invariant and keeps the first interval in an eight-step catch-up frame', async () => {
  const at30 = await cadenceOutcome(30);
  const at60 = await cadenceOutcome(60);
  const at144 = await cadenceOutcome(144);
  const catchup = await cadenceOutcome(60, .25);
  assert.deepEqual(at30, at60);
  assert.deepEqual(at144, at60);
  assert.deepEqual(catchup, at60);
  assert.equal(at60.length, 2);
  assert.deepEqual(at60.map(record => record.birthTick), [0, 0]);
  assert.equal(new Set(at60.map(record => record.castId)).size, 2);
  assert.equal(new Set(at60.map(record => record.projectileId)).size, 2);
  assert.ok(at60.every(record => record.castId !== record.projectileId));
  assert.ok(at60.every(record => record.terminalTick >= 1));
});

test('controller generation keeps identities distinct if a destroyed diagnostic controller is recreated', async () => {
  const arm = await createArmFixture();
  arm.setActive(true);
  const first = await createArmSlicer(arm);
  const firstIdentity = first.enqueue(defaultCommand(arm));
  first.destroy();
  const second = await createArmSlicer(arm);
  try {
    const secondIdentity = second.enqueue(defaultCommand(arm));
    assert.ok(firstIdentity && secondIdentity);
    assert.notEqual(secondIdentity.generation, firstIdentity.generation);
    assert.notEqual(secondIdentity.castId, firstIdentity.castId);
    assert.notEqual(secondIdentity.projectileId, firstIdentity.projectileId);
  } finally {
    second.destroy();
    arm.destroy();
  }
});

import R from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import assert from 'node:assert/strict';

await R.init();
const DT = 1 / 60, GUARD = .00005, CALL_BUDGET = 128, GRID_STEPS = 65536;
const BRACKET_GATE_M = .001, EXTENT_M = 32;
const v = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
const axisAngle = (axis, angle) => new Quaternion().setFromAxisAngle(axis.clone().normalize(), angle);
const AXES = [v(1), v(0, 1), v(0, 0, 1)];

// Detached authored trajectories only: no World, owner mutation or recovered CCD.
// Each body follows an origin line and a constant WORLD angular axis, then its
// nonidentity collider-local transform is composed at the requested time.
function box(h, p, velocity = v(), initial = new Quaternion(), omega = v(),
  local = v(), localRotation = new Quaternion()) {
  const radius = local.length() + Math.hypot(...h);
  return { h, p, velocity, initial, omega, local, localRotation, radius,
    speed: velocity.length() + omega.length() * radius, native: new R.Cuboid(...h) };
}
function pose(shape, time, shift = 0) {
  const bodyRotation = axisAngle(shape.omega.length() ? shape.omega : v(1), shape.omega.length() * time)
    .multiply(shape.initial);
  return {
    p: shape.p.clone().addScaledVector(shape.velocity, time)
      .add(shape.local.clone().applyQuaternion(bodyRotation)).addScalar(shift),
    q: bodyRotation.multiply(shape.localRotation),
  };
}
function assertDomain(shape, shift = 0) {
  assert.ok(shape.h.every(h => Number.isFinite(h) && 2 * h >= .001
    && Number.isFinite(Math.fround(h)) && Math.fround(h) > 0));
  assert.ok(shape.velocity.length() <= 128 && shape.omega.length() <= 128);
  assert.ok(shape.omega.length() * DT <= Math.PI / 4);
  assert.ok(Number.isFinite(shape.speed) && Number.isFinite(shape.radius));
  for (const time of [0, DT]) {
    const origin = shape.p.clone().addScaledVector(shape.velocity, time).addScalar(shift);
    for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(origin[axis]) + shape.radius <= EXTENT_M);
  }
}
function contact(a, b, time, shift = 0) {
  const A = pose(a, time, shift), B = pose(b, time, shift);
  // Both shapes, including geometry, stay inside [-32,32]^3. Prediction 256 m
  // exceeds the entire domain diagonal; null remains an inconclusive native result.
  return a.native.contactShape(A.p, A.q, b.native, B.p, B.q, 256);
}
const frameMetrics = { maxNormalLengthError: 0, maxOppositionError: 0, maxSignedWitnessResidualM: 0 };
function checkFrame(c) {
  assert.ok(Number.isFinite(c.distance));
  for (const point of [c.point1, c.point2, c.normal1, c.normal2]) {
    for (const axis of ['x', 'y', 'z']) assert.ok(Number.isFinite(point[axis]));
  }
  const n1 = v(c.normal1.x, c.normal1.y, c.normal1.z);
  const n2 = v(c.normal2.x, c.normal2.y, c.normal2.z);
  const gap = v(c.point2.x - c.point1.x, c.point2.y - c.point1.y, c.point2.z - c.point1.z);
  const lengthError = Math.max(Math.abs(n1.length() - 1), Math.abs(n2.length() - 1));
  const opposition = n1.clone().add(n2).length();
  // contactShape points/normals are WORLD-space. No second rigid transform.
  const residual = gap.sub(n1.multiplyScalar(c.distance)).length();
  assert.ok(lengthError <= .00001 && opposition <= .00001);
  assert.ok(residual <= GUARD);
  frameMetrics.maxNormalLengthError = Math.max(frameMetrics.maxNormalLengthError, lengthError);
  frameMetrics.maxOppositionError = Math.max(frameMetrics.maxOppositionError, opposition);
  frameMetrics.maxSignedWitnessResidualM = Math.max(frameMetrics.maxSignedWitnessResidualM, residual);
}

// Independent double-precision OBB GEOMETRY test: 3 face axes per box and 9
// edge cross-products. The authored pose evaluator is shared, not an independent
// test of interpolation code. A 65536-grid scan plus crossing bisection can miss
// arbitrarily brief grazes. Its Lipschitz travel bound quantifies grid spacing,
// not a global no-contact certificate. Never turn a null reference into that claim.
function sat(a, b, time) {
  const A = pose(a, time), B = pose(b, time);
  const aa = AXES.map(n => n.clone().applyQuaternion(A.q));
  const bb = AXES.map(n => n.clone().applyQuaternion(B.q));
  const delta = B.p.clone().sub(A.p);
  const tests = [...aa, ...bb, ...aa.flatMap(n => bb.map(m => n.clone().cross(m)))];
  let separation = -Infinity;
  for (const axis of tests) {
    if (axis.lengthSq() < 1e-24) continue;
    const n = axis.clone().normalize();
    let radius = 0;
    for (let j = 0; j < 3; j++) radius += a.h[j] * Math.abs(n.dot(aa[j])) + b.h[j] * Math.abs(n.dot(bb[j]));
    separation = Math.max(separation, Math.abs(delta.dot(n)) - radius);
  }
  return separation;
}
function reference(a, b) {
  const boundM = (a.speed + b.speed) * DT / GRID_STEPS;
  if (sat(a, b, 0) <= 0) return { time: 0, boundM };
  for (let i = 1; i <= GRID_STEPS; i++) {
    if (sat(a, b, i * DT / GRID_STEPS) > 0) continue;
    let lo = (i - 1) * DT / GRID_STEPS, hi = i * DT / GRID_STEPS;
    for (let j = 0; j < 40; j++) {
      const mid = (lo + hi) / 2;
      if (sat(a, b, mid) <= 0) hi = mid; else lo = mid;
    }
    return { time: hi, boundM };
  }
  return { time: null, boundM };
}

// Experimental conservative advancement: GUARD is empirical, not a formal
// Rapier error bound. Fixed-plane pruning includes arbitrary world angular axes.
function query(a, b, shift = 0) {
  assertDomain(a, shift); assertDomain(b, shift);
  const speed = a.speed + b.speed;
  let time = 0, uncertain = null;
  for (let calls = 1; calls <= CALL_BUDGET; calls++) {
    const c = contact(a, b, time, shift);
    if (!c || !Number.isFinite(c.distance)) return { status: 'inconclusive-native', calls };
    const n = v(c.normal1.x, c.normal1.y, c.normal1.z), length = n.length();
    if (!Number.isFinite(length) || Math.abs(length - 1) > .001) return { status: 'inconclusive-normal', calls };
    n.divideScalar(length);
    if (calls === 1 && c.distance <= GUARD) return { status: 'initial-overlap-or-uncertain', calls };
    if (c.distance <= -GUARD) {
      if (uncertain === null) return { status: 'inconclusive-unbracketed', calls };
      const widthM = speed * (time - uncertain);
      const status = widthM + 2 * GUARD <= BRACKET_GATE_M ? 'hit' : 'inconclusive-width';
      if (status === 'hit') checkFrame(c);
      return { status, calls, lo: uncertain, hi: time, widthM };
    }
    if (time === DT || speed === 0 || c.distance > GUARD + speed * (DT - time)) {
      return { status: uncertain === null ? 'miss' : 'inconclusive-graze', calls };
    }
    const approach = Math.max(0, a.velocity.clone().sub(b.velocity).dot(n));
    const angular = n.clone().cross(a.omega).length() * a.radius + n.clone().cross(b.omega).length() * b.radius;
    if (c.distance > GUARD && c.distance - GUARD > (approach + angular) * (DT - time)) {
      return { status: uncertain === null ? 'miss-plane' : 'inconclusive-graze', calls };
    }
    let step;
    if (c.distance > 2 * GUARD) step = .9 * (c.distance - GUARD) / speed;
    else { uncertain ??= time; step = 2 * GUARD / speed; }
    const next = Math.min(DT, time + step);
    if (!(next > time)) return { status: 'inconclusive-stall', calls };
    time = next;
  }
  return { status: 'inconclusive-budget', calls: CALL_BUDGET };
}
function measured(a, b, shifts) {
  const ref = reference(a, b);
  const results = shifts.map(shift => {
    const result = query(a, b, shift);
    const distanceAtReferenceM = ref.time === null ? null : contact(a, b, ref.time, shift).distance;
    if (ref.time !== null) {
      assert.equal(result.status, 'hit');
      assert.ok(result.lo <= ref.time && ref.time <= result.hi, 'reference must lie in hit bracket');
      assert.ok(result.widthM + 2 * GUARD <= BRACKET_GATE_M);
      assert.ok(a.speed * Math.abs(result.hi - ref.time) <= .00015);
      assert.ok(Math.abs(distanceAtReferenceM) <= .00001);
    } else assert.equal(result.status, 'miss-plane', 'scan absence alone is not a miss certificate');
    return { shift, ...result, errorM: ref.time === null ? null : a.speed * Math.abs(result.hi - ref.time),
      distanceAtReferenceM };
  });
  return { reference: ref, results };
}
function matrix(projectileOmegaRadps) {
  const cases = [];
  for (const vertical of [false, true]) for (const speed of [8, 16, 40])
    for (const targetSpeed of [-3, 3]) for (const targetOmegaRadps of [0, Math.PI, 2 * Math.PI]) {
      const projectile = box(vertical ? [.005, .06, .06] : [.06, .005, .06],
        v(-.25 - speed * DT / 2), v(speed), axisAngle(v(2, 1, -1), .18),
        v(1, 2, -1).normalize().multiplyScalar(projectileOmegaRadps),
        v(.012, .008, -.01), axisAngle(v(1, -3, 2), .27));
      const target = box([.2, .045, .045], v(-.06, .015, .01), v(targetSpeed),
        axisAngle(v(1, 2, 3), .6), v(2, -1, 1).normalize().multiplyScalar(targetOmegaRadps),
        v(.09, -.02, .035), axisAngle(v(-2, 1, 3), -.31));
      cases.push({ vertical, speed, targetSpeed, targetOmegaRadps,
        ...measured(projectile, target, [0, 31, -31]) });
    }
  return { projectileOmegaRadps, cases };
}
// Original general primitive controls retained; omega=0 is the cast-locked
// production direction. Neither matrix is an implementation of that production API.
const rotatingProjectile = matrix(.5);
const lockedProjectile = matrix(0);
const large = ['wall', 'floor'].map(type => {
  const projectile = type === 'wall'
    ? box([.06, .005, .06], v(0, 1, 0), v(40))
    : box([.06, .005, .06], v(0, .5, 0), v(0, -40, 0));
  const target = type === 'wall' ? box([.1, 10, 5], v(.65, 5, 0)) : box([5, .1, 5], v(0, -.1, 0));
  const analyticalTimeS = type === 'wall' ? .01225 : .012375;
  const result = measured(projectile, target, [0, 15, -15]);
  assert.ok(Math.abs(result.reference.time - analyticalTimeS) <= 1e-14);
  // +/-31 would violate whole-geometry extent for these large targets.
  assert.throws(() => assertDomain(target, 31));
  return { type, analyticalTimeS, ...result };
});
// Preserve the first measured large-wall placement as well as the actual arm
// wall placement above; do not silently erase the earlier diagnostic variant.
const initialWallControl = measured(box([.06, .005, .06], v(-.5, 1, 0), v(40)),
  box([.1, 10, 5], v(.1, 5, 0)), [0, 15, -15]);
assert.ok(Math.abs(initialWallControl.reference.time - .011) <= 1e-14);

// Two balls: a stationary projectile and target P0 -> P1 -> P2 in two 1/120s
// spans. Shallow penetration/tangency/20um clearance precedes a later deep hit.
// Accumulated travel integrates each span speed. Resetting the uncertainty latch
// is intentionally WRONG and retained as a negative control.
function adversarial(radius, halfTravel, y, resetLatch) {
  const ball = new R.Ball(radius), rotation = new Quaternion(), spanDT = DT / 2;
  const points = [v(-halfTravel, y), v(halfTravel, y), v()];
  assert.ok(2 * radius >= .001);
  for (const point of points) for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(point[axis]) + radius <= EXTENT_M);
  let uncertainTravel = null, uncertainTimeS = null, firstUncertainS = null, calls = 0, travel = 0;
  for (let span = 0; span < 2; span++) {
    if (resetLatch) { uncertainTravel = null; uncertainTimeS = null; }
    const start = points[span], velocity = points[span + 1].clone().sub(start).divideScalar(spanDT);
    const speed = velocity.length();
    assert.ok(speed <= 128);
    let time = 0;
    while (calls < CALL_BUDGET) {
      calls++;
      const position = start.clone().addScaledVector(velocity, time);
      const c = ball.contactShape(v(), rotation, ball, position, rotation, 256);
      assert.ok(c && Number.isFinite(c.distance));
      if (c.distance <= -GUARD) {
        const widthM = uncertainTravel === null ? null : travel + speed * time - uncertainTravel;
        const status = widthM === null ? 'inconclusive-unbracketed'
          : widthM + 2 * GUARD <= BRACKET_GATE_M ? 'hit' : 'inconclusive-width';
        return { status, calls, span, loS: uncertainTimeS, timeS: span * spanDT + time, widthM, firstUncertainS };
      }
      if (time === spanDT) break;
      const n = v(c.normal1.x, c.normal1.y, c.normal1.z).normalize();
      const approach = Math.max(0, -velocity.dot(n));
      // Prune only to THIS span end, even after an earlier uncertain encounter.
      if (c.distance > GUARD && c.distance - GUARD > approach * (spanDT - time)) { time = spanDT; continue; }
      let step;
      if (c.distance > 2 * GUARD) step = .9 * (c.distance - GUARD) / speed;
      else {
        uncertainTravel ??= travel + speed * time;
        uncertainTimeS ??= span * spanDT + time;
        firstUncertainS ??= span * spanDT + time;
        step = 2 * GUARD / speed;
      }
      const next = Math.min(spanDT, time + step);
      if (!(next > time)) return { status: 'inconclusive-stall', calls, firstUncertainS };
      time = next;
    }
    if (calls >= CALL_BUDGET) return { status: 'inconclusive-budget', calls, firstUncertainS };
    travel += speed * spanDT;
  }
  return { status: uncertainTravel === null ? 'miss' : 'inconclusive-graze', calls, firstUncertainS };
}
function adversaries(radius, halfTravel) {
  return [-.00002, 0, .00002].map(clearance => {
    const y = 2 * radius + clearance;
    const firstSegmentAnalyticS = clearance > 0 ? null
      : (halfTravel - Math.sqrt(Math.max(0, (2 * radius) ** 2 - y ** 2))) / (2 * halfTravel / (DT / 2));
    return { radius, halfTravel, y, clearance, firstSegmentAnalyticS,
      latch: adversarial(radius, halfTravel, y, false),
      reset: adversarial(radius, halfTravel, y, true) };
  });
}
const latchControls = adversaries(.01, .005);
for (const control of latchControls) {
  assert.equal(control.latch.status, 'inconclusive-width');
  assert.ok(control.latch.widthM + 2 * GUARD > BRACKET_GATE_M);
  assert.equal(control.reset.status, 'hit');
  assert.equal(control.reset.span, 1);
  assert.ok(control.reset.widthM + 2 * GUARD <= BRACKET_GATE_M);
  assert.ok(control.latch.calls <= CALL_BUDGET);
  if (control.firstSegmentAnalyticS !== null) {
    assert.ok(control.latch.firstUncertainS <= control.firstSegmentAnalyticS);
    assert.ok(control.firstSegmentAnalyticS < control.reset.loS,
      'resetting the latch must falsely select a later contact');
  }
}
// Retain the earlier larger-ball failure instead of relaxing 128 calls.
const exhaustedControls = adversaries(.1, .01);
for (const control of exhaustedControls) for (const result of [control.latch, control.reset]) {
  assert.equal(result.status, 'inconclusive-budget');
  assert.equal(result.calls, CALL_BUDGET);
}
function summarize(cases) {
  const results = cases.flatMap(c => c.results);
  return {
    total: cases.length,
    statuses: results.reduce((counts, r) => { counts[r.status] = (counts[r.status] || 0) + 1; return counts; }, {}),
    maxCalls: Math.max(...results.map(r => r.calls)),
    maxErrorM: Math.max(...results.map(r => r.errorM || 0)),
    maxBracketM: Math.max(...results.map(r => r.widthM || 0)),
    maxNativeReferenceM: Math.max(...results.map(r => Math.abs(r.distanceAtReferenceM || 0))),
    maxGridM: Math.max(...cases.map(c => c.reference.boundM)),
    referenceOutsideBracket: cases.flatMap(c => c.results.filter(r => r.status === 'hit'
      && !(r.lo <= c.reference.time && c.reference.time <= r.hi))).length,
  };
}
const summaries = { rotatingProjectile: summarize(rotatingProjectile.cases), lockedProjectile: summarize(lockedProjectile.cases),
  large: summarize(large), frameMetrics };
assert.equal(R.version(), '0.20.0');
for (const summary of [summaries.rotatingProjectile, summaries.lockedProjectile]) {
  assert.equal(summary.total, 36);
  assert.deepEqual(summary.statuses, { hit: 99, 'miss-plane': 9 });
  assert.ok(summary.maxCalls <= 23);
  assert.ok(summary.maxErrorM <= .00015);
  assert.ok(summary.maxBracketM <= .000400001);
  assert.ok(summary.maxGridM <= .000012);
  assert.equal(summary.referenceOutsideBracket, 0);
}
assert.equal(summaries.large.maxCalls, 7);
console.log(JSON.stringify({
  version: R.version(), constants: { DT, GUARD, CALL_BUDGET, BRACKET_GATE_M, GRID_STEPS, EXTENT_M },
  rotatingProjectile, lockedProjectile, large, initialWallControl, latchControls, exhaustedControls,
  summary: { ...summaries, regressionAssertions: 'PASS' },
}));

import R from '@dimforge/rapier3d-compat';
import assert from 'node:assert/strict';
await R.init();
const DT = 1 / 60, GUARD = 0.00005, BUDGET = 128;
const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
const q = a => ({ x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) });
const rotate = (p, a) => v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a), p.z);
const plus = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
const norm = p => Math.hypot(p.x, p.y, p.z);
function shape(h, start, velocity = v(), angle = 0, omega = 0, local = v(), localAngle = 0) {
  return { h, native: new R.Cuboid(...h), start, velocity, angle, omega, local, localAngle,
    speed: norm(velocity) + Math.abs(omega) * (norm(local) + Math.hypot(...h)) };
}
function pose(s, t, shift = 0) {
  const a = s.angle + s.omega * t;
  return { p: plus(plus(s.start, v(s.velocity.x * t + shift, s.velocity.y * t + shift, s.velocity.z * t + shift)), rotate(s.local, a)), a: a + s.localAngle };
}
function contact(a, b, t, shift = 0) {
  const ap = pose(a, t, shift), bp = pose(b, t, shift);
  return a.native.contactShape(ap.p, q(ap.a), b.native, bp.p, q(bp.a), 256);
}
// Independent double-precision rectangle SAT. All fixtures rotate about Z;
// Z overlaps in hit cases and separates in matched close misses.
// The 65536-point scan can miss arbitrarily brief grazes. Its Lipschitz grid
// bound quantifies sampling uncertainty, not a global no-hit certificate.
// The two authored Z-offset misses instead have exact constant Z clearance:
// rotations about Z and translation along X preserve their 0.2/1 mm gap.
function sat(a, b, t) {
  const A = pose(a, t), B = pose(b, t);
  let separation = Math.abs(A.p.z - B.p.z) - a.h[2] - b.h[2];
  for (const angle of [A.a, A.a + Math.PI / 2, B.a, B.a + Math.PI / 2]) {
    const x = Math.cos(angle), y = Math.sin(angle);
    const distance = Math.abs((A.p.x - B.p.x) * x + (A.p.y - B.p.y) * y);
    const ra = a.h[0] * Math.abs(Math.cos(A.a - angle)) + a.h[1] * Math.abs(Math.sin(A.a - angle));
    const rb = b.h[0] * Math.abs(Math.cos(B.a - angle)) + b.h[1] * Math.abs(Math.sin(B.a - angle));
    separation = Math.max(separation, distance - ra - rb);
  }
  return separation;
}
function reference(a, b) {
  const n = 65536, boundM = (a.speed + b.speed) * DT / n;
  if (sat(a, b, 0) <= 0) return { time: 0, boundM };
  for (let i = 1; i <= n; i++) if (sat(a, b, i * DT / n) <= 0) {
    let lo = (i - 1) * DT / n, hi = i * DT / n;
    for (let j = 0; j < 40; j++) { const mid = (lo + hi) / 2; if (sat(a, b, mid) <= 0) hi = mid; else lo = mid; }
    return { time: hi, boundM };
  }
  return { time: null, boundM };
}
// Experimental conservative advancement with an explicit uncertainty band.
// Guard is empirical, not a formally established Rapier distance-error bound.
function query(a, b, shift = 0, planePrune = true) {
  const speed = a.speed + b.speed;
  let t = 0, uncertain = null;
  for (let calls = 1; calls <= BUDGET; calls++) {
    const c = contact(a, b, t, shift);
    if (!c || !Number.isFinite(c.distance)) return { status: 'inconclusive-native', calls };
    if (calls === 1 && c.distance <= GUARD) return { status: 'initial-overlap-or-uncertain', distance: c.distance, calls };
    if (c.distance <= -GUARD) {
      if (uncertain === null) return { status: 'inconclusive-unbracketed', calls };
      const widthM = speed * (t - uncertain);
      return { status: widthM + 2 * GUARD <= .001 ? 'hit' : 'inconclusive-width', lo: uncertain, hi: t, widthM, distance: c.distance, calls, contact: c };
    }
    if (t === DT) return { status: uncertain === null ? 'miss' : 'inconclusive-graze', calls };
    if (speed === 0 || c.distance > GUARD + speed * (DT - t)) return { status: uncertain === null ? 'miss' : 'inconclusive-graze', calls };
    // A world-fixed separating plane can rule out the rest of this segment.
    // These fixtures have constant world angular axis Z. Rotation contributes
    // |normal x omega| * radius; rotating around the plane normal costs zero.
    if (planePrune && c.distance > GUARD) {
      const n = c.normal1, length = norm(n);
      if (!Number.isFinite(length) || length < .999 || length > 1.001) return { status: 'inconclusive-normal', calls };
      const approach = Math.max(0, ((a.velocity.x - b.velocity.x) * n.x + (a.velocity.y - b.velocity.y) * n.y + (a.velocity.z - b.velocity.z) * n.z) / length);
      const angular = Math.hypot(n.x, n.y) / length * (Math.abs(a.omega) * (norm(a.local) + Math.hypot(...a.h)) + Math.abs(b.omega) * (norm(b.local) + Math.hypot(...b.h)));
      if (c.distance - GUARD > (approach + angular) * (DT - t)) return { status: uncertain === null ? 'miss-plane' : 'inconclusive-graze', calls };
    }
    let step;
    if (c.distance > 2 * GUARD) step = .9 * (c.distance - GUARD) / speed;
    else { uncertain ??= t; step = 2 * GUARD / speed; }
    const next = Math.min(DT, t + step);
    if (!(next > t)) return { status: 'inconclusive-stall', calls };
    t = next;
  }
  return { status: 'inconclusive-budget', calls: BUDGET };
}
const cases = [];
for (const vertical of [false, true]) for (const speed of [8, 16, 40]) for (const targetSpeed of [-3, 3]) for (const degrees of [0, 180, 360]) {
  const projectile = shape(vertical ? [.005, .06, .06] : [.06, .005, .06], v(-.24 - speed * DT / 2, 0, 0), v(speed));
  const arm = shape([.2, .045, .045], v(-.09, .02), v(targetSpeed), .35, degrees * Math.PI / 180, v(.09, -.02), -.20);
  const ref = reference(projectile, arm), result = query(projectile, arm), translated = query(projectile, arm, 31);
  const compact = r => ({ status: r.status, calls: r.calls, lo: r.lo, hi: r.hi, widthM: r.widthM,
    errorM: ref.time !== null && r.hi !== undefined ? speed * Math.abs(r.hi - ref.time) : null });
  const nativeDistanceAtReferenceM = ref.time === null ? null : [0, 31, -31].map(shift => contact(projectile, arm, ref.time, shift).distance);
  cases.push({ vertical, speed, targetSpeed, degrees, ref, result: compact(result), translated: compact(translated), nativeDistanceAtReferenceM });
}
const projectile = shape([.06, .005, .06], v(-.5), v(40));
const wall = shape([.005, .5, .5], v(-.1));
const shield = shape([.01, .2, .2], v(-.24), v(3), .10, 2 * Math.PI);
const arm = shape([.2, .045, .045], v(.15), v(-3), .35, 2 * Math.PI, v(.09, -.02), -.20);
const behind = shape([.08, .1, .1], v(.24));
const blockers = [wall, behind, arm, shield].map((b, i) => ({ id: ['wall', 'behind', 'arm', 'shield'][i], ref: reference(projectile, b), query: query(projectile, b) }));
const misses = [.0002, .001].map(clearance => {
  const b = shape([.2, .045, .045], v(0, 0, .105 + clearance), v(-3), .35, 2 * Math.PI);
  return { clearance, reference: reference(projectile, b), scalarOnly: query(projectile, b, 0, false), query: query(projectile, b) };
});
const aFrame = shape([.1, .2, .3], v(10, 2, 3), v(), Math.PI / 2);
const bFrame = shape([.1, .15, .2], v(10.35, 2, 3));
const frame = contact(aFrame, bFrame, 0);
const cast = aFrame.native.castShape(aFrame.start, q(aFrame.angle), v(1), bFrame.native, bFrame.start, q(0), v(), 0, 1, true);
const frameLocals = {
  contactLocal1: rotate(v(frame.point1.x - 10, frame.point1.y - 2, frame.point1.z - 3), -Math.PI / 2),
  contactLocal2: v(frame.point2.x - 10.35, frame.point2.y - 2, frame.point2.z - 3),
};
const summary = {
  total: cases.length,
  statuses: cases.reduce((a, c) => { const key = c.result.status + '/' + c.translated.status; a[key] = (a[key] || 0) + 1; return a; }, {}),
  maxCalls: Math.max(...cases.flatMap(c => [c.result.calls, c.translated.calls])),
  maxErrorM: Math.max(...cases.flatMap(c => [c.result.errorM || 0, c.translated.errorM || 0])),
  maxBracketM: Math.max(...cases.flatMap(c => [c.result.widthM || 0, c.translated.widthM || 0])),
  maxControlGridM: Math.max(...cases.map(c => c.ref.boundM)),
  maxNativeDistanceAtReferenceM: Math.max(...cases.flatMap(c => c.nativeDistanceAtReferenceM || []).map(Math.abs)),
  referenceOutsideBracket: cases.filter(c => c.result.status === 'hit' && !(c.result.lo <= c.ref.time && c.ref.time <= c.result.hi)).length,
};
// Regression gates apply only to these frozen diagnostic trajectories, not to
// arbitrary motion, general native-query accuracy, or B02 gameplay acceptance.
assert.equal(R.version(), '0.20.0');
assert.equal(typeof R.Shape.prototype.castNonlinear, 'undefined');
assert.equal(cases.length, 36);
assert.deepEqual(summary.statuses, { 'hit/hit': 33, 'miss-plane/miss-plane': 3 });
assert.ok(summary.maxCalls <= 22);
assert.ok(summary.maxErrorM <= .00015, 'TOI-derived projectile motion error exceeds 0.15 mm');
assert.ok(summary.maxBracketM <= .000400001);
assert.ok(summary.maxControlGridM <= .000012);
assert.ok(summary.maxNativeDistanceAtReferenceM <= .00001, 'native distance at analytic contact exceeds 10 micrometres');
assert.equal(summary.referenceOutsideBracket, 0);
for (const c of cases) for (const result of [c.result, c.translated]) {
  if (c.ref.time === null) assert.equal(result.status, 'miss-plane');
  else {
    assert.equal(result.status, 'hit');
    assert.ok(result.lo <= c.ref.time && c.ref.time <= result.hi);
    assert.ok(result.lo >= 0 && result.hi <= DT);
  }
}
for (const miss of misses) {
  assert.equal(miss.reference.time, null);
  assert.equal(miss.scalarOnly.status, 'inconclusive-budget');
  assert.equal(miss.scalarOnly.calls, BUDGET);
  assert.equal(miss.query.status, 'miss-plane');
  assert.ok(miss.query.calls <= 20);
}
const byReference = [...blockers].sort((a, b) => a.ref.time - b.ref.time);
const byQuery = [...blockers].sort((a, b) => a.query.hi - b.query.hi);
assert.deepEqual(byReference.map(b => b.id), ['shield', 'wall', 'arm', 'behind']);
assert.deepEqual(byQuery.map(b => b.id), byReference.map(b => b.id));
for (let i = 0; i < byQuery.length; i++) {
  const b = byQuery[i];
  assert.equal(b.query.status, 'hit');
  assert.ok(b.query.lo <= b.ref.time && b.ref.time <= b.query.hi);
  if (i) assert.ok(byQuery[i - 1].query.hi < b.query.lo, 'ordering brackets overlap');
}
assert.equal(blockers[0].ref.time, .008375);
assert.ok(40 * Math.abs(blockers[0].query.hi - .008375) < .00015);
function checkFrame(c) {
  assert.ok(Number.isFinite(c.distance));
  for (const p of [c.point1, c.point2, c.normal1, c.normal2]) for (const value of Object.values(p)) assert.ok(Number.isFinite(value));
  assert.ok(Math.abs(norm(c.normal1) - 1) < .00001);
  assert.ok(Math.abs(norm(c.normal2) - 1) < .00001);
  assert.ok(norm(plus(c.normal1, c.normal2)) < .00001);
  const gap = v(c.point2.x - c.point1.x, c.point2.y - c.point1.y, c.point2.z - c.point1.z);
  assert.ok(Math.abs(norm(gap) - Math.abs(c.distance)) < .00001);
}
for (const c of [frame, ...blockers.map(b => b.query.contact)]) checkFrame(c);
assert.ok(Math.abs(frame.point1.x - 10.2) < .000001, 'contactShape points must be world-space');
assert.ok(Math.abs(frameLocals.contactLocal1.y + .2) < .000001);
assert.ok(Math.abs(frame.normal1.x - 1) < .000001);
assert.ok(Math.abs(cast.witness1.y + .2) < .000001, 'castShape witnesses must be local-space');
assert.ok(Math.abs(cast.normal1.y + 1) < .000001, 'castShape normals must be local-space');
summary.regressionAssertions = 'PASS';
console.log(JSON.stringify({ version: R.version(), nativeNonlinear: typeof R.Shape.prototype.castNonlinear,
  constants: { DT, GUARD, BUDGET }, summary, frame, frameLocals, cast, blockers, misses, cases }, null, 2));

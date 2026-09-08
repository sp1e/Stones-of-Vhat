# Body motion and physical pose handoff Implementation Plan

> **Execution record (2026-09-08):** Core implemented in `4bbb42c`; independent spec and quality reviews passed, with final core strict +76/76 native tests. See [execution evidence](2026-09-08-body-motion-results.md). The code blocks and unchecked steps below preserve the original plan, not the current source. Review-driven float32, ownership, fatal-owner and quaternion corrections in the committed implementation supersede the earlier examples; do not blindly replay them over working code.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish epoch-safe completed motion intervals and an in-place, velocity-preserving animation-to-physics handoff, ready for the next procedural two-segment arm stage.

**Architecture:** Keep the existing Rapier world authoritative. Attach a small detached interval publisher to the yard's existing bodies and navigation capsule, and prove rigid bone/body bindings and all-member transfer with real offset-COM bodies. This executable core is independent of the subsequent two-segment arm, raw joint adapter and dev-only visual lab; no body recreation, ECS, humanoid, damage, severing, asset loading or normal-yard interaction expansion is included.

**Tech Stack:** Existing TypeScript, Node's test runner, Three 0.185.1 math and Rapier compat 0.20.0; fixed simulation step 1/60 s.

---

Status: executable **core** implementation plan, not an implementation or acceptance result. Baseline is `45832f7` on `codex/vadstena-runtime-foundation`. Parent freshly verified strict typechecking and 57 native tests. Preserve all nine existing browser tests. Commands below run from `C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\runtime-foundation\game` unless a different directory is stated. Prefix shell commands with `rtk`; use `apply_patch` for edits. Preserve the untracked research `work/` directory. Do not install dependencies, change security settings, build desktop packages or publish anything.

The parent explicitly split execution after an independent coupled arm/contact diagnostic exposed an unresolved solver/CCD anchor error. This file contains complete executable Tasks 1-4 only. The subsequent arm/adapter/lab stage receives its own complete plan after that diagnostic is isolated. No arm stability, anatomical limits, playable ragdoll or full B01 acceptance follows from completing this core.

This plan implements the accepted [B01a brief](2026-09-08-body-motion-next-slice.md), using the [installed-version joint measurements](2026-09-08-rapier-joint-probe-results.md), [relative-contact observations](2026-09-08-relative-contact-probe-results.md), [research adoption](2026-09-08-research-adoption.md), [technical dossier](../../research/deep-research/2026-09-08/technical-dossier.md) and [B01/B02 backlog](../../research/deep-research/2026-09-08/implementation-backlog.md). The parent additionally reproduced offset-COM kinematic rotation and in-place body-type conversion in installed 0.20.0: origin `(3,2,1)`, local COM `(1,0,0)`, Z rotation 0.1 rad in one tick gives COM velocity approximately `(-0.299749374,5.990009308,0)` and omega Z=6, preserved on conversion to dynamic.

## Locked contracts and acceptance limits

- World epoch is a fresh `crypto.randomUUID()` string per world, independent of simulation randomness and resilient to module/HMR reload. Public body reference is `{worldEpoch, bodyId}`; collider reference also has `colliderId`, unique within its body. Rapier handles and objects never appear in published records. No unregister/re-register under an old identity is supported in this slice.
- Tick 0 is the explicit post-bootstrap query publication. Its interval is `kind:'initial', fromTick:0, toTick:0, dtS:0`. Bootstrap is the yard's existing one initialization step, not an added step. Each live step publishes exactly one interval from tick N to N+1 with `dtS=1/60`. Reading does not call `world.step()` or advance a tick.
- Every body, including static blockers, dynamic props and the animated navigation capsule, has both endpoints in that same interval. `bodyOriginWorld`, `comWorld`, `comLocal`, `comVelocityWorldMps`, and `angularVelocityWorldRadps` explicitly distinguish origins, units and frames. Collider local pose and shape are endpoint data. A crouch shape change is marked `shape`; consumers must not treat it as a smooth rigid sweep. An animation-to-physics conversion is marked `authority`. Future B02 must define how it handles these discontinuities.
- Rigid transforms permit only identity scale, finite translation and finite nonzero quaternion; normalize the quaternion on entry. Bind version is 1. `worldBody = worldBone * boneToBody`; `worldBone = worldBody * inverse(boneToBody)`; `localBone = inverse(worldParentBone) * worldBone`.
- Handoff is synchronous at an already completed boundary, before the next animation target or `world.step()`. Validate every member, adjacent history, current boundary, live epoch and the optional impulse before the first setter. Compute velocity from COM motion, not root displacement. Keep existing body poses, change their types in place, set COM velocity and world omega, revoke animation authority, then apply the optional point impulse once. Validation failure leaves every member untouched. An unexpected native setter failure aborts/frees the owning fixture; it must never publish a partially changed world.
- Core engineering tolerances are locked before measurements: immediate handoff origin/COM/bone position <=0.002 m, quaternion geodesic angle <=pi/180; immediate COM/omega velocity error <=2e-5 in their stated units; mass error <=1e-6 kg. These are fixture engineering limits, not anatomical-cone proof or gameplay balance. Joint/contact tolerances belong to the subsequent explicitly measured fixture plan.
- Failure against a locked solver threshold is a real failure. Record the measured case and isolate its cause; do not increase thresholds, remove controls, add helper bodies, change engines or silently reduce the matrix to obtain GREEN.

## Files and ownership

| Path | Responsibility |
| --- | --- |
| `game/src/physics/poseBinding.ts` | Rigid math, sampled COM/omega and one small authority controller. |
| `game/src/physics/bodyMotion.ts` | Preflight names, detached endpoints, world epoch, stale-reference validation. |
| `game/src/physics/yard.ts` | Register existing bodies/player; publish around the existing initialization/live steps; invalidate on destroy. |
| `game/tests/bodyMotionHelpers.mjs` | Shared independent numerical test assertions, not production code. |
| `game/tests/poseBinding.test.mjs` | Nontrivial transform, COM history and all-member atomic validation tests. |
| `game/tests/bodyMotion.test.mjs` | Identity, intervals, shape discontinuity and yard preservation. |

The normal yard snapshot and rendering API stay compatible. Add `yard.motionInterval()` and `yard.assertMotionRef(ref)` separately; do not inject epoch into existing `YardSnapshot`, which would needlessly change replay comparisons. The independent arm fixture is executable evidence, not an invisible obstacle added to normal play.

## Task 1: Rigid transforms and sampled velocities

**Files:** Create `game/src/physics/poseBinding.ts`, `game/tests/bodyMotionHelpers.mjs`, `game/tests/poseBinding.test.mjs`.

- [ ] **Step 1: Add the complete shared test helpers.**

```js
// game/tests/bodyMotionHelpers.mjs
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
export const zero = { x: 0, y: 0, z: 0 };
export const identity = { x: 0, y: 0, z: 0, w: 1 };
export const dt = 1 / 60;
export const q = (axis, angle) => {
  const v = new Quaternion().setFromAxisAngle(new Vector3(...axis), angle);
  return { x: v.x, y: v.y, z: v.z, w: v.w };
};
export const pose = (position = zero, rotation = identity) => ({ position: { ...position }, rotation: { ...rotation } });
export const vecNear = (a, b, epsilon = 1e-6) => assert.ok(
  Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z) <= epsilon,
  `${JSON.stringify(a)} differs from ${JSON.stringify(b)} by more than ${epsilon}`,
);
export const angle = (a, b) => {
  const qa = new Quaternion(a.x,a.y,a.z,a.w).normalize();
  const qb = new Quaternion(b.x,b.y,b.z,b.w).normalize();
  return 2*Math.acos(Math.min(1,Math.abs(qa.dot(qb))));
};
export const poseNear = (a,b,p=1e-6,r=1e-6) => {
  vecNear(a.position,b.position,p);
  assert.ok(angle(a.rotation,b.rotation)<=r, `rotation error ${angle(a.rotation,b.rotation)}`);
};
export const finite = value => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `nonfinite ${value}`);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) finite(item);
};
export const withoutEpoch = value => {
  if (Array.isArray(value)) return value.map(withoutEpoch);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'worldEpoch').map(([key,item]) => [key,withoutEpoch(item)]));
  return value;
};
```

- [ ] **Step 2: Write these failing mathematical tests.** The dynamic import deliberately produces an assertion failure for missing exports rather than hiding the RED behind a missing file.

```js
// game/tests/poseBinding.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { zero, identity, dt, q, pose, vecNear, poseNear } from './bodyMotionHelpers.mjs';
const url = new URL('../src/physics/poseBinding.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};

test('rigid bone binding round trips through a translated rotated parent and nonidentity bind', () => {
  assert.equal(typeof api.worldBodyFromBone,'function');
  const parent=pose({x:3,y:2,z:-4},q([0,1,0],0.7));
  const local=pose({x:0.3,y:0.6,z:-0.2},q([1,0,0],-0.4));
  const bind={version:1,boneToBody:pose({x:0.18,y:-0.07,z:0.09},q([0,0,1],0.35))};
  const bone=api.composeRigid(parent,local);
  const body=api.worldBodyFromBone(bone,bind);
  assert.ok(Math.hypot(body.position.x-bone.position.x,body.position.y-bone.position.y,body.position.z-bone.position.z)>0.1);
  poseNear(api.worldBoneFromBody(body,bind),bone);
  poseNear(api.localBoneFromBody(parent,body,bind),local);
});

test('rigid inputs reject zero/nonfinite rotation, translation, scale and bind version', () => {
  assert.equal(typeof api.rigid,'function');
  for(const invalid of [pose(zero,{x:0,y:0,z:0,w:0}),pose(zero,{...identity,w:NaN}),
    pose({x:Infinity,y:0,z:0}),{...pose(),scale:{x:1,y:2,z:1}},
    {...pose(),scale:{x:2,y:2,z:2}},{...pose(),scale:{x:-1,y:1,z:1}}]) {
    assert.throws(()=>api.rigid(invalid),/rigid|finite|quaternion|scale/i);
  }
  assert.throws(()=>api.worldBodyFromBone(pose(),{version:2,boneToBody:pose()}),/version/i);
  poseNear(api.rigid({...pose(),scale:{x:1,y:1,z:1}}),pose());
});

test('stationary body origin rotating offset COM has nonzero velocity and shortest sign-equivalent omega', () => {
  assert.equal(typeof api.sampledVelocity,'function');
  const from={tick:4,bodyOriginWorld:pose({x:3,y:2,z:1})};
  const to={tick:5,bodyOriginWorld:pose({x:3,y:2,z:1},q([0,0,1],0.1))};
  const actual=api.sampledVelocity(from,to,{x:1,y:0,z:0},dt);
  vecNear(actual.comVelocityWorldMps,{x:(Math.cos(.1)-1)/dt,y:Math.sin(.1)/dt,z:0});
  vecNear(actual.angularVelocityWorldRadps,{x:0,y:0,z:6});
  const negative=structuredClone(to);
  for(const key of ['x','y','z','w']) negative.bodyOriginWorld.rotation[key]*=-1;
  const equivalent=api.sampledVelocity(from,negative,{x:1,y:0,z:0},dt);
  vecNear(equivalent.comVelocityWorldMps,actual.comVelocityWorldMps);
  vecNear(equivalent.angularVelocityWorldRadps,actual.angularVelocityWorldRadps);
  const wrapped=api.sampledVelocity(
    {tick:1,bodyOriginWorld:pose(zero,q([0,1,0],Math.PI-.02))},
    {tick:2,bodyOriginWorld:pose(zero,q([0,1,0],-Math.PI+.02))},zero,dt);
  vecNear(wrapped.angularVelocityWorldRadps,{x:0,y:.04/dt,z:0});
  for(const badDt of [0,-1,NaN,Infinity]) assert.throws(()=>api.sampledVelocity(from,to,zero,badDt),/duration/i);
  for(const badTick of [4,6,NaN]) assert.throws(()=>api.sampledVelocity(from,{...to,tick:badTick},zero,dt),/adjacent/i);
});
```

- [ ] **Step 3: Observe RED.** Run `rtk proxy node --test tests/poseBinding.test.mjs`. Expect the three tests to fail on missing functions. Record actual RED output in the execution report.
- [ ] **Step 4: Implement the exact pure transform/velocity code.**

```ts
// game/src/physics/poseBinding.ts
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { Rotation, Vec3 } from '../content/yardLayout.ts';

export type RigidTransform = { position: Vec3; rotation: Rotation; scale?: Vec3 };
export type BoneBinding = { version: 1; boneToBody: RigidTransform };
export type PoseSample = { tick: number; bodyOriginWorld: RigidTransform };
const quaternion = (q: Rotation) => new Quaternion(q.x,q.y,q.z,q.w);
export function finiteVector(v: Vec3): Vec3 {
  if (![v.x,v.y,v.z].every(Number.isFinite)) throw new Error('Vector must be finite');
  return {x:v.x,y:v.y,z:v.z};
}
export function rigid(t: RigidTransform): RigidTransform {
  const position=finiteVector(t.position);
  if (t.scale && (![t.scale.x,t.scale.y,t.scale.z].every(Number.isFinite)
    || [t.scale.x,t.scale.y,t.scale.z].some(v=>Math.abs(v-1)>1e-8))) throw new Error('Rigid scale must be identity');
  const q=t.rotation;
  if (![q.x,q.y,q.z,q.w].every(Number.isFinite) || Math.hypot(q.x,q.y,q.z,q.w)<1e-12)
    throw new Error('Invalid rigid quaternion');
  const normalized=quaternion(q).normalize();
  return {position,rotation:{x:normalized.x,y:normalized.y,z:normalized.z,w:normalized.w}};
}
export function rotateVector(q: Rotation,v: Vec3): Vec3 {
  const rotation=rigid({position:{x:0,y:0,z:0},rotation:q}).rotation;
  const p=finiteVector(v);
  const result=new Vector3(p.x,p.y,p.z).applyQuaternion(quaternion(rotation));
  return {x:result.x,y:result.y,z:result.z};
}
export function composeRigid(a: RigidTransform,b: RigidTransform): RigidTransform {
  const aa=rigid(a),bb=rigid(b),p=rotateVector(aa.rotation,bb.position);
  const q=quaternion(aa.rotation).multiply(quaternion(bb.rotation));
  return rigid({position:{x:aa.position.x+p.x,y:aa.position.y+p.y,z:aa.position.z+p.z},rotation:q});
}
export function inverseRigid(t: RigidTransform): RigidTransform {
  const value=rigid(t),q=quaternion(value.rotation).conjugate();
  const p=rotateVector(q,{x:-value.position.x,y:-value.position.y,z:-value.position.z});
  return rigid({position:p,rotation:q});
}
function checkedBind(binding: BoneBinding): RigidTransform {
  if(binding.version!==1) throw new Error('Unsupported bind version');
  return rigid(binding.boneToBody);
}
export function worldBodyFromBone(bone: RigidTransform,binding: BoneBinding): RigidTransform {
  return composeRigid(bone,checkedBind(binding));
}
export function worldBoneFromBody(body: RigidTransform,binding: BoneBinding): RigidTransform {
  return composeRigid(body,inverseRigid(checkedBind(binding)));
}
export function localBoneFromBody(parent: RigidTransform,body: RigidTransform,binding: BoneBinding): RigidTransform {
  return composeRigid(inverseRigid(parent),worldBoneFromBody(body,binding));
}
export function sampledVelocity(from: PoseSample,to: PoseSample,comLocal: Vec3,dtS: number) {
  if(!Number.isFinite(dtS)||dtS<=0) throw new Error('Sample duration must be positive and finite');
  if(!Number.isSafeInteger(from.tick)||from.tick<0||to.tick!==from.tick+1) throw new Error('Samples must have adjacent ticks');
  const a=rigid(from.bodyOriginWorld),b=rigid(to.bodyOriginWorld);
  const ca=composeRigid(a,{position:finiteVector(comLocal),rotation:{x:0,y:0,z:0,w:1}}).position;
  const cb=composeRigid(b,{position:comLocal,rotation:{x:0,y:0,z:0,w:1}}).position;
  const delta=quaternion(b.rotation).multiply(quaternion(a.rotation).conjugate()).normalize();
  if(delta.w<0) delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
  const sine=Math.hypot(delta.x,delta.y,delta.z);
  const factor=sine<1e-12 ? 2/dtS : 2*Math.atan2(sine,Math.max(0,delta.w))/(sine*dtS);
  return {
    comVelocityWorldMps:{x:(cb.x-ca.x)/dtS,y:(cb.y-ca.y)/dtS,z:(cb.z-ca.z)/dtS},
    angularVelocityWorldRadps:{x:delta.x*factor,y:delta.y*factor,z:delta.z*factor},
  };
}
```

The RAPIER import is used by the authority portion in Task 3; keep it there through the coupled implementation. Do not add any extra generic transform framework.

- [ ] **Step 5: Verify GREEN and strict types.** Run `rtk proxy node --test tests/poseBinding.test.mjs` then `rtk npm run typecheck`. Expect 3 passing tests and no compiler errors.
- [ ] **Step 6: Commit these three files only.** Run `rtk git add src/physics/poseBinding.ts tests/bodyMotionHelpers.mjs tests/poseBinding.test.mjs`, then `rtk git commit -m "feat: define rigid bone bindings and sampled COM motion"`.

## Task 2: Stable identity and completed intervals

**Files:** Create `game/src/physics/bodyMotion.ts` and `game/tests/bodyMotion.test.mjs`; modify `game/src/physics/yard.ts`.

- [ ] **Step 1: Add these RED tests.**

```js
// game/tests/bodyMotion.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import { createYard } from '../src/physics/yard.ts';
import { zero,identity,dt,pose,withoutEpoch } from './bodyMotionHelpers.mjs';
const url=new URL('../src/physics/bodyMotion.ts',import.meta.url);
const api=existsSync(url)?await import(url.href):{};
const idle={right:0,forward:0,yaw:0,sprint:false,crouch:false,jump:false};
const floor={id:'floor',shape:{kind:'box',size:[40,1,40]},position:{x:0,y:-.5,z:0},color:'#777777'};
const prop={id:'prop',shape:{kind:'box',size:[.4,.4,.4]},position:{x:0,y:2,z:0},color:'#777777',mass:2};

test('identity preflight rejects duplicate bodies and collider names before allocation',async()=>{
  assert.equal(typeof api.preflightMotionNames,'function');
  await R.init(); const world=new R.World(zero);
  try {
    const names=[{bodyId:'arm',colliderIds:['shape']}];
    for(const invalid of [[...names,...names],[{bodyId:'arm',colliderIds:['shape','shape']}],
      [{bodyId:'',colliderIds:['shape']}],[{bodyId:'arm',colliderIds:['']}]] ) {
      let allocations=0;
      assert.throws(()=>{api.preflightMotionNames(invalid);allocations++;world.createRigidBody(R.RigidBodyDesc.dynamic());},/duplicate|empty/i);
      assert.equal(allocations,0);assert.equal(world.bodies.len(),0);assert.equal(world.colliders.len(),0);
    }
  } finally {world.free();}
});

test('yard publishes one detached adjacent interval for static dynamic and animated navigation bodies',async()=>{
  const yard=await createYard({layout:[floor,prop]});
  try {
    assert.equal(typeof yard.motionInterval,'function');
    const initial=yard.motionInterval();
    assert.equal(initial.kind,'initial');assert.equal(initial.dtS,0);
    assert.equal(initial.fromTick,0);assert.equal(initial.toTick,0);
    assert.equal(initial.bodies.length,3);
    for(const body of initial.bodies) assert.deepEqual(body.from,body.to);
    const initialRef=initial.bodies.find(b=>b.ref.bodyId==='prop').ref;
    for(let tick=0;tick<5;tick++) {
      const before=yard.motionInterval();
      yard.step({...idle,forward:1});
      const current=yard.motionInterval();
      assert.equal(current.kind,'completed');assert.equal(current.fromTick,tick);assert.equal(current.toTick,tick+1);assert.equal(current.dtS,dt);
      assert.equal(current.worldEpoch,initial.worldEpoch);
      for(let index=0;index<current.bodies.length;index++) assert.deepEqual(current.bodies[index].from,before.bodies[index].to);
      assert.deepEqual(current.bodies.find(b=>b.ref.bodyId==='prop').ref,initialRef);
      const snapshot=yard.motionInterval(),copy=yard.motionInterval();
      copy.bodies[0].from.bodyOriginWorld.position.x=999;
      copy.bodies[0].to.comWorld.x=999;
      copy.bodies[0].to.colliders[0].localPose.position.x=999;
      copy.bodies[0].to.colliders[0].shape.size[0]=999;
      copy.bodies[0].ref.bodyId='bad';copy.bodies[0].to.colliders[0].ref.colliderId='bad';
      assert.deepEqual(yard.motionInterval(),snapshot);
      assert.equal(yard.motionInterval().toTick,tick+1);
      assert.ok(!JSON.stringify(snapshot).includes('handle'));
    }
    const state=yard.motionInterval();
    assert.equal(state.bodies.find(b=>b.ref.bodyId==='floor').to.authority,'fixed');
    assert.equal(state.bodies.find(b=>b.ref.bodyId==='prop').to.authority,'physics');
    const player=state.bodies.find(b=>b.ref.bodyId==='player');
    assert.equal(player.to.authority,'animation');assert.equal(player.to.colliders[0].role,'navigation');
    assert.ok(player.to.bodyOriginWorld.position.z<player.from.bodyOriginWorld.position.z);
  } finally {yard.destroy();}
});

test('crouch publishes actual old/new capsule and marks its shape discontinuity',async()=>{
  const yard=await createYard({layout:[floor]});
  try {
    assert.equal(typeof yard.motionInterval,'function');
    const before=yard.motionInterval().bodies.find(b=>b.ref.bodyId==='player');
    yard.step({...idle,crouch:true});
    const player=yard.motionInterval().bodies.find(b=>b.ref.bodyId==='player');
    assert.deepEqual(player.from,before.to);
    assert.equal(player.from.colliders[0].shape.halfHeight,.55);
    assert.equal(player.to.colliders[0].shape.halfHeight,.25);
    assert.deepEqual(player.discontinuities,['shape']);
    assert.notEqual(player.from.bodyOriginWorld.position.y,player.to.bodyOriginWorld.position.y);
  } finally {yard.destroy();}
});

test('same authored names in a new world have a fresh epoch and reject old body and collider refs',async()=>{
  const first=await createYard({layout:[floor,prop]});
  let oldBody,oldCollider,oldInterval;
  try {
    assert.equal(typeof first.motionInterval,'function');
    oldInterval=first.motionInterval();oldBody=oldInterval.bodies[1].ref;
    oldCollider=oldInterval.bodies[1].to.colliders[0].ref;
    first.assertMotionRef(oldBody);first.assertMotionRef(oldCollider);
  } finally {first.destroy();}
  assert.throws(()=>first.assertMotionRef(oldBody),/destroyed/i);
  const second=await createYard({layout:[floor,prop]});
  try {
    const current=second.motionInterval();assert.notEqual(current.worldEpoch,oldInterval.worldEpoch);
    assert.deepEqual(withoutEpoch(current),withoutEpoch(oldInterval));
    for(const ref of [oldBody,oldCollider,{...current.bodies[1].ref,bodyId:'missing'}]) assert.throws(()=>second.assertMotionRef(ref),/stale|unknown/i);
    assert.deepEqual(second.counts(),{bodies:3,colliders:3});
  } finally {second.destroy();}
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test tests/bodyMotion.test.mjs`. Expect missing `preflightMotionNames` and missing `yard.motionInterval` assertions. Existing yard tests must remain green.
- [ ] **Step 3: Implement the complete interval publisher.** It wraps existing bodies; creation and destruction remain the owner's responsibility.

```ts
// game/src/physics/bodyMotion.ts
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Shape,Vec3 } from '../content/yardLayout.ts';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';
import { FIXED_DT } from '../runtime/fixedStep.ts';

export type BodyRef={worldEpoch:string;bodyId:string};
export type ColliderRef=BodyRef & {colliderId:string};
export type MotionShape=Shape|{kind:'capsule';halfHeight:number;radius:number};
export type MotionNames={bodyId:string;colliderIds:readonly string[]};
export type MotionSource={bodyId:string;body:RAPIER.RigidBody;colliders:readonly {
  colliderId:string;collider:RAPIER.Collider;role:'blocker'|'navigation';shape:()=>MotionShape;
}[]};
export type BodyEndpoint={
  bodyOriginWorld:RigidTransform;comLocal:Vec3;comWorld:Vec3;
  comVelocityWorldMps:Vec3;angularVelocityWorldRadps:Vec3;
  authority:'fixed'|'animation'|'physics';massKg:number;sleeping:boolean;
  colliders:{ref:ColliderRef;role:'blocker'|'navigation';localPose:RigidTransform;shape:MotionShape}[];
};
export type MotionInterval={
  worldEpoch:string;kind:'initial'|'completed';fromTick:number;toTick:number;dtS:number;
  bodies:{ref:BodyRef;from:BodyEndpoint;to:BodyEndpoint;discontinuities:('shape'|'authority')[]}[];
};
export function preflightMotionNames(names:readonly MotionNames[]):void {
  const bodies=new Set<string>();
  for(const name of names) {
    if(!name.bodyId.trim()) throw new Error('Empty body id');
    if(bodies.has(name.bodyId)) throw new Error(`Duplicate body id: ${name.bodyId}`);
    bodies.add(name.bodyId);
    const colliders=new Set<string>();
    for(const id of name.colliderIds) {
      if(!id.trim()) throw new Error('Empty collider id');
      if(colliders.has(id)) throw new Error(`Duplicate collider id: ${name.bodyId}/${id}`);
      colliders.add(id);
    }
  }
}
export function createBodyMotion(world:RAPIER.World,sources:readonly MotionSource[]) {
  preflightMotionNames(sources.map(s=>({bodyId:s.bodyId,colliderIds:s.colliders.map(c=>c.colliderId)})));
  const worldEpoch=crypto.randomUUID();
  const entries=new Map(sources.map(s=>[s.bodyId,s]));
  let destroyed=false;
  const alive=()=>{if(destroyed) throw new Error('Motion registry destroyed');};
  const capture=(s:MotionSource):BodyEndpoint=>({
    bodyOriginWorld:rigid({position:{...s.body.translation()},rotation:{...s.body.rotation()}}),
    comLocal:{...s.body.localCom()},comWorld:{...s.body.worldCom()},
    comVelocityWorldMps:{...s.body.linvel()},angularVelocityWorldRadps:{...s.body.angvel()},
    authority:s.body.isFixed()?'fixed':s.body.isDynamic()?'physics':'animation',
    massKg:s.body.mass(),sleeping:s.body.isSleeping(),
    colliders:s.colliders.map(c=>{
      const p=c.collider.translationWrtParent(),q=c.collider.rotationWrtParent();
      if(!p||!q||c.collider.parent()?.handle!==s.body.handle) throw new Error('Collider must remain attached to its registered body');
      return {ref:{worldEpoch,bodyId:s.bodyId,colliderId:c.colliderId},role:c.role,
        localPose:rigid({position:{...p},rotation:{...q}}),shape:structuredClone(c.shape())};
    }),
  });
  let interval:MotionInterval={worldEpoch,kind:'initial',fromTick:0,toTick:0,dtS:0,
    bodies:sources.map(s=>{const endpoint=capture(s);return {
      ref:{worldEpoch,bodyId:s.bodyId},from:structuredClone(endpoint),to:endpoint,discontinuities:[],
    };})};
  function assertRef(ref:BodyRef|ColliderRef):void {
    alive();
    if(ref.worldEpoch!==worldEpoch) throw new Error('Stale world reference');
    const entry=entries.get(ref.bodyId);
    if(!entry||!world.bodies.contains(entry.body.handle)) throw new Error('Unknown body reference');
    if('colliderId' in ref) {
      const c=entry.colliders.find(c=>c.colliderId===ref.colliderId);
      if(!c||!world.colliders.contains(c.collider.handle)||c.collider.parent()?.handle!==entry.body.handle)
        throw new Error('Unknown collider reference');
    }
  }
  return {
    worldEpoch,
    ref(bodyId:string):BodyRef {const ref={worldEpoch,bodyId};assertRef(ref);return ref;},
    assertRef,
    read():MotionInterval {alive();return structuredClone(interval);},
    completeStep():void {
      alive();
      const bodies=interval.bodies.map(previous=>{
        assertRef(previous.ref);
        const source=entries.get(previous.ref.bodyId)!;
        const from=previous.to,to=capture(source);
        const discontinuities:('shape'|'authority')[]=[];
        if(JSON.stringify(from.colliders.map(c=>c.shape))!==JSON.stringify(to.colliders.map(c=>c.shape))) discontinuities.push('shape');
        if(from.authority!==to.authority) discontinuities.push('authority');
        return {ref:previous.ref,from,to,discontinuities};
      });
      interval={worldEpoch,kind:'completed',fromTick:interval.toTick,toTick:interval.toTick+1,dtS:FIXED_DT,bodies};
    },
    destroy():void {if(destroyed)return;destroyed=true;entries.clear();sources=[];interval.bodies=[];},
  };
}
export type BodyMotion=ReturnType<typeof createBodyMotion>;
```

`completeStep()` is deliberately an owner-only publisher operation called directly after an existing successful step; it never steps Rapier. Do not export it through the yard public facade. Owners must not call it without advancing the fixed step. The arm and yard integrations below each have exactly one call after their single live `world.step()`.

- [ ] **Step 4: Apply these exact yard integration edits.** Add imports:

```ts
import { createBodyMotion, preflightMotionNames } from './bodyMotion.ts';
import type { BodyRef, ColliderRef, MotionSource } from './bodyMotion.ts';
```

Replace the existing `const ids = new Set<string>();` loop, before `RAPIER.init()`, with:

```ts
  preflightMotionNames([
    ...layout.map(definition => ({ bodyId: definition.id, colliderIds: ['shape'] })),
    { bodyId: 'player', colliderIds: ['capsule'] },
  ]);
```

Immediately after the existing `previous` map declaration add:

```ts
  const motionSources: MotionSource[] = [];
```

Replace the loop's `world.createCollider(collider, body);` with:

```ts
      const physicalCollider = world.createCollider(collider, body);
      motionSources.push({ bodyId: definition.id, body, colliders: [{
        colliderId: 'shape', collider: physicalCollider, role: 'blocker',
        shape: () => definition.shape,
      }] });
```

Immediately after the existing `world.step();` initialization call and before `let destroyed = false;` add:

```ts
    motionSources.push({ bodyId: 'player', body: player, colliders: [{
      colliderId: 'capsule', collider: playerCollider, role: 'navigation',
      shape: () => ({ kind: 'capsule', halfHeight: half, radius: RADIUS }),
    }] });
    const motion = createBodyMotion(world, motionSources);
```

Immediately after the live step's existing `world.step();` add:

```ts
        motion.completeStep();
```

Immediately before the existing `releaseGrip()` method add:

```ts
      motionInterval() { assertAlive(); return motion.read(); },
      assertMotionRef(ref: BodyRef | ColliderRef): void { assertAlive(); motion.assertRef(ref); },
```

Inside `destroy()`, immediately after `destroyed = true;`, add:

```ts
        motion.destroy();
        motionSources.length = 0;
```

Do not change the old `previous`, `snapshot`, KCC, input or Grip logic. The existing centered-prop `velocity` field retains its meaning; the new interval is the explicit contract for future consumers. A layout authoring the reserved `player` ID now fails before allocation.

- [ ] **Step 5: Verify GREEN.** Run `rtk proxy node --test tests/bodyMotion.test.mjs tests/yard.test.mjs tests/grip.test.mjs`, then `rtk npm run typecheck`. Expect all four new interval tests, existing yard/Grip tests and strict types to pass. Confirm default `yard.counts()` remains `{bodies:21,colliders:21}`.
- [ ] **Step 6: Commit only these files.** Run `rtk git add src/physics/bodyMotion.ts src/physics/yard.ts tests/bodyMotion.test.mjs`, then `rtk git commit -m "feat: publish epoch-safe completed body motion intervals"`.

## Task 3: Atomic ownership transfer

**Files:** Append to `game/src/physics/poseBinding.ts` and `game/tests/poseBinding.test.mjs`.

- [ ] **Step 1: Append the following RED integration test.**

```js
test('all-member handoff validation fails before any native body mutation',async()=>{
  assert.equal(typeof api.createPoseAuthority,'function');
  const R=(await import('@dimforge/rapier3d-compat')).default;await R.init();
  const world=new R.World(zero);world.timestep=dt;
  try {
    const bodies=[0,1].map(x=>{
      const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x,2,0));
      world.createCollider(R.ColliderDesc.ball(.1).setTranslation(.15,0,0).setMass(1),body);
      return body;
    });
    world.step();let rejectSecond=false;
    const authority=api.createPoseAuthority(bodies.map((body,index)=>({id:String(index),body})),
      id=>{if(rejectSecond&&id==='1')throw new Error('Stale world reference');},dt);
    authority.capture(0);
    const states=()=>bodies.map(b=>({type:b.bodyType(),p:{...b.translation()},q:{...b.rotation()},v:{...b.linvel()},w:{...b.angvel()}}));
    const initial=states();
    assert.throws(()=>authority.handoff(0),/history/i);assert.deepEqual(states(),initial);
    authority.animate(1,bodies.map((body,index)=>({id:String(index),bodyOriginWorld:pose({...body.translation(),y:2.01},q([0,0,1],.1))})));
    world.step();authority.capture(1);
    const before=states();rejectSecond=true;
    assert.throws(()=>authority.handoff(1),/stale/i);assert.deepEqual(states(),before);
    rejectSecond=false;
    for(const invalid of [{bodyId:'unknown',impulseWorldNs:zero,pointWorld:zero},
      {bodyId:'0',impulseWorldNs:{x:NaN,y:0,z:0},pointWorld:zero},
      {bodyId:'0',impulseWorldNs:zero,pointWorld:{x:Infinity,y:0,z:0}}]) {
      assert.throws(()=>authority.handoff(1,invalid),/unknown|finite/i);assert.deepEqual(states(),before);
    }
    assert.throws(()=>authority.handoff(2),/boundary/i);assert.deepEqual(states(),before);
    const report=authority.handoff(1);
    assert.equal(authority.mode(),'physics');assert.equal(report.length,2);
    for(let index=0;index<2;index++) {
      assert.ok(bodies[index].isDynamic());poseNear({position:bodies[index].translation(),rotation:bodies[index].rotation()},
        {position:before[index].p,rotation:before[index].q},.002,Math.PI/180);
      vecNear(bodies[index].linvel(),report[index].comVelocityWorldMps,2e-5);
      vecNear(bodies[index].angvel(),report[index].angularVelocityWorldRadps,2e-5);
    }
    const after=states();
    assert.equal(authority.animate(2,[]),false);assert.deepEqual(states(),after);
    assert.throws(()=>authority.handoff(1),/already/i);assert.deepEqual(states(),after);
    authority.destroy();authority.destroy();
    assert.throws(()=>authority.capture(2),/destroyed/i);
  }finally{world.free();}
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test tests/poseBinding.test.mjs`. Expect the new missing `createPoseAuthority` assertion to fail while the mathematical tests remain green.
- [ ] **Step 3: Append this complete authority implementation.**

```ts
export type PointImpulse={bodyId:string;impulseWorldNs:Vec3;pointWorld:Vec3};
export type AnimatedTarget={id:string;bodyOriginWorld:RigidTransform};
export function createPoseAuthority(
  members:readonly {id:string;body:RAPIER.RigidBody}[],
  assertLive:(id:string)=>void,
  dtS:number,
) {
  if(!Number.isFinite(dtS)||dtS<=0) throw new Error('Sample duration must be positive and finite');
  const entries=new Map(members.map(m=>[m.id,m]));
  if(entries.size!==members.length||members.some(m=>!m.id.trim())) throw new Error('Duplicate or empty authority member');
  for(const member of members) if(!member.body.isKinematic()) throw new Error('Authority must start with kinematic bodies');
  let mode:'animation'|'physics'|'destroyed'='animation';
  let boundary=-1;
  let history=new Map<string,PoseSample[]>();
  const alive=()=>{if(mode==='destroyed')throw new Error('Pose authority destroyed');};
  const bodyPose=(body:RAPIER.RigidBody)=>rigid({position:{...body.translation()},rotation:{...body.rotation()}});
  return {
    mode:()=>mode,
    animate(tick:number,targets:readonly AnimatedTarget[]):boolean {
      alive();if(mode!=='animation')return false;
      if(tick!==boundary+1)throw new Error('Animation targets must follow completed boundary');
      const targetMap=new Map(targets.map(t=>[t.id,t]));
      if(targetMap.size!==members.length||targets.length!==members.length)throw new Error('Animation requires every member exactly once');
      const prepared=members.map(member=>{
        assertLive(member.id);
        const target=targetMap.get(member.id);if(!target)throw new Error('Missing animation member');
        return {body:member.body,pose:rigid(target.bodyOriginWorld)};
      });
      for(const target of prepared) {
        target.body.setNextKinematicTranslation(target.pose.position);
        target.body.setNextKinematicRotation(target.pose.rotation);
      }
      return true;
    },
    capture(tick:number):void {
      alive();
      if(tick!==boundary+1)throw new Error('Capture must have adjacent completed ticks');
      const next=new Map<string,PoseSample[]>();
      for(const member of members) {
        assertLive(member.id);
        next.set(member.id,[...(history.get(member.id)??[]).slice(-1),{tick,bodyOriginWorld:bodyPose(member.body)}]);
      }
      history=next;boundary=tick;
    },
    handoff(tick:number,impulse?:PointImpulse) {
      alive();if(mode!=='animation')throw new Error('Already transferred to physics');
      if(tick!==boundary)throw new Error('Handoff requires current completed boundary');
      const prepared=members.map(member=>{
        assertLive(member.id);
        const samples=history.get(member.id);
        if(!samples||samples.length!==2)throw new Error('Handoff needs two-sample history');
        const from=samples[0]!,to=samples[1]!;
        if(to.tick!==tick)throw new Error('History is not at handoff boundary');
        const current=bodyPose(member.body);
        const latest=to.bodyOriginWorld;
        const difference=Math.hypot(current.position.x-latest.position.x,current.position.y-latest.position.y,current.position.z-latest.position.z);
        const angular=2*Math.acos(Math.min(1,Math.abs(quaternion(current.rotation).dot(quaternion(latest.rotation)))));
        if(difference>1e-6||angular>1e-5)throw new Error('Body moved outside completed history');
        const velocity=sampledVelocity(from,to,{...member.body.localCom()},dtS);
        return {id:member.id,body:member.body,bodyOriginWorld:current,...velocity};
      });
      let point:{body:RAPIER.RigidBody;impulseWorldNs:Vec3;pointWorld:Vec3}|undefined;
      if(impulse) {
        const member=entries.get(impulse.bodyId);if(!member)throw new Error('Unknown impulse body');
        point={body:member.body,impulseWorldNs:finiteVector(impulse.impulseWorldNs),pointWorld:finiteVector(impulse.pointWorld)};
      }
      for(const member of prepared) {
        member.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);
        member.body.setLinvel(member.comVelocityWorldMps,true);
        member.body.setAngvel(member.angularVelocityWorldRadps,true);
      }
      mode='physics';
      if(point)point.body.applyImpulseAtPoint(point.impulseWorldNs,point.pointWorld,true);
      return prepared.map(({body,...record})=>structuredClone(record));
    },
    destroy():void {if(mode==='destroyed')return;mode='destroyed';history.clear();entries.clear();members=[];},
  };
}
```

- [ ] **Step 4: Verify GREEN.** Run `rtk proxy node --test tests/poseBinding.test.mjs` then `rtk npm run typecheck`. Expect all four tests and strict checking to pass. Observe the last member's stale error leaves the first member kinematic and numerically unchanged.
- [ ] **Step 5: Commit.** Run `rtk git add src/physics/poseBinding.ts tests/poseBinding.test.mjs`, then `rtk git commit -m "feat: transfer pose authority atomically at completed boundaries"`.

## Task 4: Offset-COM integration, replay and core handoff

**Files:** Append to `game/tests/poseBinding.test.mjs`; no extra production abstraction.

- [ ] **Step 1: Append this complete integrated contract test.** It checks actual Rapier COM positions rather than calculating expected velocity with the production `sampledVelocity` helper.

```js
test('real offset-COM bound bodies preserve IDs mass pose velocities and apply a point impulse exactly once',async()=>{
  assert.equal(typeof api.createPoseAuthority,'function');
  const R=(await import('@dimforge/rapier3d-compat')).default;
  const {createBodyMotion}=await import('../src/physics/bodyMotion.ts');
  await R.init();
  for(const transfer of [false,true])for(let lifecycle=0;lifecycle<5;lifecycle++) {
    const world=new R.World(zero);world.timestep=dt;
    let registry,authority;
    try {
      const root=pose({x:3,y:2,z:-4},q([0,1,0],.7));
      const bind={version:1,boneToBody:pose({x:.18,y:-.07,z:.09},q([0,0,1],.35))};
      const bodies=[0,1].map(index=>{
        const bone=api.composeRigid(root,pose({x:index*.8,y:.2,z:0},q([1,0,0],.25)));
        const bodyPose=api.worldBodyFromBone(bone,bind);
        const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(bodyPose.position.x,bodyPose.position.y,bodyPose.position.z).setRotation(bodyPose.rotation));
        const collider=world.createCollider(R.ColliderDesc.ball(.1).setTranslation(.15,.02,0).setMass(index+1),body);
        return {id:String(index),body,collider};
      });
      world.step();
      registry=createBodyMotion(world,bodies.map(m=>({bodyId:m.id,body:m.body,
        colliders:[{colliderId:'shape',collider:m.collider,role:'blocker',shape:()=>({kind:'ball',radius:.1})}]})));
      const refs=bodies.map(m=>registry.ref(m.id));
      authority=api.createPoseAuthority(bodies,id=>registry.assertRef(refs[Number(id)]),dt);
      authority.capture(0);
      const initial=registry.read();
      authority.animate(1,bodies.map((m,index)=>({id:m.id,bodyOriginWorld:api.worldBodyFromBone(
        api.composeRigid(root,pose({x:index*.8,y:.2,z:0},q([1,0,0],.35))),bind)})));
      world.step();authority.capture(1);registry.completeStep();
      const moving=registry.read(),before=bodies.map(m=>({
        origin:pose(m.body.translation(),m.body.rotation()),com:{...m.body.worldCom()},mass:m.body.mass(),
        bone:api.worldBoneFromBody(pose(m.body.translation(),m.body.rotation()),bind),
      }));
      assert.deepEqual(moving.bodies.map(b=>b.ref),refs);
      for(let index=0;index<2;index++) {
        const a=initial.bodies[index].to,b=moving.bodies[index].to;
        assert.ok(Math.hypot(b.comWorld.x-a.comWorld.x,b.comWorld.y-a.comWorld.y,b.comWorld.z-a.comWorld.z)>1e-3);
        assert.ok(Math.hypot(b.comLocal.x,b.comLocal.y,b.comLocal.z)>.1);
      }
      if(transfer) {
        const report=authority.handoff(1);
        for(let index=0;index<2;index++) {
          const body=bodies[index].body,a=initial.bodies[index].to,b=moving.bodies[index].to;
          const expected={x:(b.comWorld.x-a.comWorld.x)/dt,y:(b.comWorld.y-a.comWorld.y)/dt,z:(b.comWorld.z-a.comWorld.z)/dt};
          poseNear(pose(body.translation(),body.rotation()),before[index].origin,.002,Math.PI/180);
          poseNear(api.worldBoneFromBody(pose(body.translation(),body.rotation()),bind),before[index].bone,.002,Math.PI/180);
          vecNear(body.worldCom(),before[index].com,.002);vecNear(body.linvel(),expected,2e-5);
          vecNear(body.angvel(),report[index].angularVelocityWorldRadps,2e-5);
          assert.ok(Math.abs(body.mass()-before[index].mass)<=1e-6);
          registry.assertRef(refs[index]);registry.assertRef(moving.bodies[index].to.colliders[0].ref);
        }
        assert.equal(authority.animate(2,[]),false);
        world.step();authority.capture(2);registry.completeStep();
        assert.deepEqual(registry.read().bodies.map(b=>b.ref),refs);
        for(const record of registry.read().bodies)assert.deepEqual(record.discontinuities,['authority']);
      }
      assert.equal(world.bodies.len(),2);assert.equal(world.colliders.len(),2);
      authority.destroy();authority.destroy();registry.destroy();registry.destroy();
      assert.throws(()=>authority.handoff(1),/destroyed/i);
      assert.throws(()=>registry.assertRef(refs[0]),/destroyed/i);
    }finally{authority?.destroy();registry?.destroy();world.free();}
  }
  // Matched control and impulse runs start from identical actual physical histories.
  const run=async apply=>{
    const world=new R.World(zero);world.timestep=dt;
    try {
      const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,2,0));
      world.createCollider(R.ColliderDesc.ball(.1).setTranslation(.15,0,0).setMass(2),body);
      world.step();const authority=api.createPoseAuthority([{id:'arm',body}],()=>{},dt);
      authority.capture(0);authority.animate(1,[{id:'arm',bodyOriginWorld:pose({x:0,y:2,z:0},q([0,0,1],.1))}]);
      world.step();authority.capture(1);
      const com={...body.worldCom()},point={x:com.x,y:com.y+.1,z:com.z};
      authority.handoff(1,apply?{bodyId:'arm',pointWorld:point,impulseWorldNs:{x:.4,y:0,z:0}}:undefined);
      const after={v:{...body.linvel()},w:{...body.angvel()}};
      assert.throws(()=>authority.handoff(1,{bodyId:'arm',pointWorld:point,impulseWorldNs:{x:.4,y:0,z:0}}),/already/i);
      assert.deepEqual({v:{...body.linvel()},w:{...body.angvel()}},after);
      world.step();authority.capture(2);
      const later={v:{...body.linvel()},w:{...body.angvel()}};
      authority.destroy();return {after,later};
    }finally{world.free();}
  };
  const control=await run(false),hit=await run(true);
  vecNear({x:hit.after.v.x-control.after.v.x,y:hit.after.v.y-control.after.v.y,z:hit.after.v.z-control.after.v.z},{x:.2,y:0,z:0},2e-5);
  assert.ok(hit.after.w.z<control.after.w.z-1,'off-COM impulse must add angular momentum');
  vecNear(hit.later.v,hit.after.v,2e-5);
});
```

- [ ] **Step 2: Run the integrated tests before changing implementation.** Run `rtk proxy node --test tests/poseBinding.test.mjs tests/bodyMotion.test.mjs`. This test may already pass from Tasks 1-3; report it honestly as integration coverage, not a newly observed RED. If it fails, retain its exact contract and repair the responsible Task 1-3 implementation after recording the failure. Do not add an alternative authority or recompute bind matrices.
- [ ] **Step 3: Run the complete core validation once.** Run `rtk npm run check`, `rtk npm run build`, then `rtk npm run test:browser`. Expect strict types, all 57 original native tests plus the new core cases, and all nine original browser tests. The normal yard still has 20 layout bodies, 21 physical bodies/colliders including its player, the same five props, and unchanged Grip eligibility. Browser build/tests are for the parent/executor, not actions the plan-writing worker performs.
- [ ] **Step 4: Commit integration evidence code.** Run `rtk git add tests/poseBinding.test.mjs`, then `rtk git commit -m "test: prove offset-COM transfer identity and lifecycle contracts"`.
- [ ] **Step 5: Have the parent independently review the complete core diff for spec compliance, then code quality.** Fix material findings within these core files and rerun the directly affected tests. Record actual commands/counts/SHAs and limitations in the parent-owned execution status, never claim the not-yet-built arm/lab as complete.

## Core review and next-stage boundary

Self-review coverage: nonidentity parent/bind and rigid rejection are Task 1; zero/nonfinite/nonadjacent samples and sign/wrap omega are Task 1; duplicate preallocation, epoch invalidation, detached initial/adjacent interval records, static/dynamic/navigation bodies and crouch discontinuity are Task 2; complete validation before mutation and animation revocation are Task 3; actual offset-COM pose/velocity/mass/reference preservation, point impulse once, destruction in both modes and repeated lifecycles are Task 4. Existing replay remains exact because the old YardSnapshot was not changed; new epoch-aware interval comparison strips only `worldEpoch` and separately asserts distinct epochs.

The **next independent stage** contains the raw axes 3/4/5 spherical/generic 24-case controls, generic masks 7 versus 56, the coupled moving bent two-segment arm, queued-action epoch invalidation, 30/60/144 render grouping with pause, and a dev-only `arm-lab.html` entry with fixed inspection camera and animate/pause/handoff/reset controls. It must reuse this core and preserve the normal Vite production entry. Its contact/CCD failure evidence must be resolved or explicitly remain a failing acceptance gate; this core does not erase that evidence. The parent requested this split to allow verified pose/identity progress while independently isolating the coupled constraint problem.

Execution is already authorized. Continue with the parent's chosen single production writer and independent reviews; no new execution-choice question is needed.

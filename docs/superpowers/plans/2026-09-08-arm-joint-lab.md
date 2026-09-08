# Procedural arm, joint limits and dev lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exercise the completed body-motion core with a procedural two-segment arm, measured Rapier raw angular limits and a separate dev-only visual inspection lab.

**Architecture:** Reuse `poseBinding.ts` and `bodyMotion.ts` from the [core plan](2026-09-08-body-motion-handoff.md). The arm owns one Rapier world with two persistent segment bodies plus fixed floor/wall bodies; it uses an explicit measured internal substep budget while its sole authoritative outer step remains 1/60 s. The lab has its own HTML entry, fixed camera and controls and is absent from the normal production bundle and normal yard.

**Tech Stack:** Existing TypeScript, Three 0.185.1, Rapier compat 0.20.0, Node tests, Vite and Playwright. No dependency installation or engine change.

---

Status: implementation plan, not working gameplay or acceptance evidence. Execute only after the parent has read/reviewed this whole plan and the core implementation has passed its gates. The core plan stays frozen; this stage adds its own files. Commands run from `C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\runtime-foundation\game`. Prefix shell commands with `rtk` and edit with `apply_patch`. Preserve all unrelated/untracked research work. No desktop build, security change, publication or normal-yard gameplay change belongs to this stage.

## Evidence and unchanged acceptance boundaries

The [24-case raw joint diagnostic](2026-09-08-rapier-joint-probe-results.md) established raw axes 3/4/5 and the observed locked-axis meaning of generic masks. Mask 7 locks translation and leaves rotation free; mask 56 locks rotation and leaves translation free, despite misleading installed comments. A stopped mask-56 angular control is not evidence of limits working.

The [independent two-dynamic-body arm/contact diagnostic](2026-09-08-arm-contact-probe-results.md) then failed its preregistered 5 mm anchor limit: outer dt 1/60, four solver iterations and the default internal budget produced approximately 20.286 mm peak anchor error; twelve iterations alone still produced approximately 19.263 mm. A dt 1/120/twelve-iteration variant also failed at approximately 10.014 mm. Preserve these observations rather than silently substituting the successful setting.

The coordinator independently reproduced the same 1/60/four-iteration fixture with `world.maxCcdSubsteps=4`: limited peak anchor 0.801046 mm, penetration 0.649337 mm, projected X/Y diagnostics 0.35560/0.38810 rad, and 571 wall-contact ticks. Its matched unlimited control moved substantially: anchor 1.297649 mm, penetration 0.442064 mm, projected X/Y 1.64296/1.97463 rad and 566 wall-contact ticks. Per-body CCD off gave the same limited trajectory at budget four. The evidence supports this explicit internal budget for the fixture; it does not isolate the improvement as CCD collision clamping.

Lock the following before running this plan's changed fixtures:

| Measurement | Gate |
| --- | --- |
| Immediate handoff origin, bone and COM displacement | <=0.002 m |
| Immediate handoff quaternion geodesic error | <=pi/180 rad |
| Immediate preserved COM/omega velocity error | <=2e-5 in m/s and rad/s |
| Body/collider counts and identity across transfer | Exactly unchanged; four bodies/four colliders in full fixture, two arm segments |
| Total arm mass | 3 kg, error <=1e-6 kg |
| Single-axis limited accumulated excursion | <=0.315 rad; signed final >=0.28 rad |
| Single-axis unlimited accumulated excursion | Signed >0.6 rad |
| Coupled arm anchor separation | <=0.005 m |
| Contact penetration, floor and wall | <=0.005 m |
| Coupled projected joint-frame X/Y diagnostic, limited run | <=0.40 rad; both axes actually move >0.01 rad |
| Unlimited coupled control | Both projected X/Y peaks >0.60 rad |
| Finite physical state | Every position, quaternion, COM/omega velocity, contact impulse and diagnostic finite |
| Coupled motion envelope | Speed <=12 m/s, omega <=50 rad/s |
| Mechanical energy envelope | Initial mechanical energy + absolute torque-work bound +5 J; no unexplained energy source |

The energy and speed gates are explicit additional engineering bounds; they are not previously measured acceptance results. A failure remains a failure and must be isolated without increasing tolerances, changing engines or adding helper bodies. Quaternion projections are solver diagnostics only. They do not prove an anatomical cone, swing/twist decomposition or full-rig stability. The bent animated handoff is an additional fixture variation and must earn the same relevant gates independently.

## File map

| Path | Responsibility |
| --- | --- |
| `game/src/physics/rapierJointLimits.ts` | Narrow version-checked raw angular adapter, frame validation and readback. |
| `game/src/physics/armFixture.ts` | Persistent two-segment arm, animation/history/transfer queue, physical diagnostics, pause and disposal. |
| `game/tests/rapierJointLimits.test.mjs` | Real spherical/generic axes/signs matrix and mask controls. |
| `game/tests/armFixture.test.mjs` | Contact control matrix, bent handoff, lifecycle and deterministic render grouping. |
| `game/arm-lab.html` | Separate dev-only inspection page, no normal index link. |
| `game/src/lab/armLab.ts` | Lab orchestration, controls, pause/reset lifecycle and DEV-only diagnostics. |
| `game/src/lab/armLabView.ts` | Fixed Three camera, body-bound meshes, anchor/COM markers and explicit disposal. |
| `game/src/lab/armLab.css` | Local lab layout and readable desktop controls. |
| `game/browser/armLab.spec.mjs` | Real browser controls, pause/reset, screenshots and production exclusion. |

No edits to `yard.ts`, `main.ts`, `yardView.ts`, Grip, global styling, normal input or Vite's production entry are required. `arm-lab.html` is served by Vite during development; the default single-page build continues to bundle only `index.html`.

## Task 1: Raw angular adapter and genuine solver controls

**Files:** Create `game/src/physics/rapierJointLimits.ts` and `game/tests/rapierJointLimits.test.mjs`.

- [ ] **Step 1: Write the complete failing solver matrix.**

```js
// game/tests/rapierJointLimits.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import { Quaternion,Vector3 } from 'three';
import { zero,dt,q,pose,finite } from './bodyMotionHelpers.mjs';
const url=new URL('../src/physics/rapierJointLimits.ts',import.meta.url);
const api=existsSync(url)?await import(url.href):{};
await R.init();

function run(kind,axis,sign,limited,mask=7) {
  assert.equal(typeof api.createAngularJoint,'function');
  const world=new R.World(zero);world.timestep=dt;
  try {
    const parent=world.createRigidBody(R.RigidBodyDesc.fixed());
    const child=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.5,0,0));
    world.createCollider(R.ColliderDesc.ball(.2).setMass(1),child);
    const frame=q([0,0,1],Math.PI/2),anchor={x:-.5,y:0,z:0};
    const adapter=api.createAngularJoint(world,parent,child,{kind,lockedMask:mask,
      frame1:pose(zero,frame),frame2:pose(anchor,frame),limits:limited?[{axis,min:-.3,max:.3}]:[]});
    const direction=axis===3?new Vector3(0,1,0):axis===4?new Vector3(-1,0,0):new Vector3(0,0,1);
    let previous=new Quaternion(),accumulated=0,peak=0,anchorError=0;
    for(let tick=0;tick<600;tick++) {
      child.applyTorqueImpulse({x:direction.x*.02*dt*sign,y:direction.y*.02*dt*sign,z:direction.z*.02*dt*sign},true);
      world.step();
      const rotation=child.rotation(),current=new Quaternion(rotation.x,rotation.y,rotation.z,rotation.w).normalize();
      const delta=current.clone().multiply(previous.clone().conjugate()).normalize();
      if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
      const sine=Math.hypot(delta.x,delta.y,delta.z);
      const factor=sine<1e-12?2:2*Math.atan2(sine,Math.max(0,delta.w))/sine;
      accumulated+=factor*(delta.x*direction.x+delta.y*direction.y+delta.z*direction.z);
      peak=Math.max(peak,Math.abs(accumulated));previous=current;
      const tip=new Vector3(anchor.x,anchor.y,anchor.z).applyQuaternion(current).add(new Vector3(...Object.values(child.translation())));
      anchorError=Math.max(anchorError,tip.length());
      finite({p:child.translation(),q:rotation,v:child.linvel(),w:child.angvel()});
    }
    if(limited) {
      assert.deepEqual(adapter.readLimits().map(l=>l.axis),[axis]);
      assert.ok(Math.abs(adapter.readLimits()[0].min+.3)<1e-6);
    }
    return {accumulated,peak,anchorError};
  }finally{world.free();}
}

for(const kind of ['spherical','generic'])for(const axis of [3,4,5])for(const sign of [-1,1]) {
  test(`${kind} raw angular axis ${axis} sign ${sign} limits stop real rotated-frame motion`,()=>{
    const limited=run(kind,axis,sign,true),free=run(kind,axis,sign,false);
    assert.ok(limited.peak<=.315,JSON.stringify(limited));
    assert.ok(limited.accumulated*sign>=.28,JSON.stringify(limited));
    assert.ok(free.accumulated*sign>.6,JSON.stringify(free));
    assert.ok(limited.anchorError<.001,JSON.stringify(limited));
  });
}

test('mask 7 allows rotation while mask 56 locks rotation and allows translation',()=>{
  const free=run('generic',3,1,false,7),locked=run('generic',3,1,false,56);
  assert.ok(free.accumulated>.6);assert.ok(Math.abs(locked.accumulated)<1e-4);
  const translation=mask=>{
    const world=new R.World(zero);world.timestep=dt;
    try {
      const a=world.createRigidBody(R.RigidBodyDesc.fixed()),b=world.createRigidBody(R.RigidBodyDesc.dynamic());
      world.createCollider(R.ColliderDesc.ball(.2).setMass(1),b);
      api.createAngularJoint(world,a,b,{kind:'generic',lockedMask:mask,frame1:pose(),frame2:pose(),limits:[]});
      b.applyImpulse({x:1,y:0,z:0},true);for(let tick=0;tick<60;tick++)world.step();
      return b.translation().x;
    }finally{world.free();}
  };
  assert.ok(Math.abs(translation(7))<.001);assert.ok(translation(56)>.5);
});

test('adapter validates all bounds and rigid frames before joint allocation',()=>{
  assert.equal(typeof api.createAngularJoint,'function');
  const world=new R.World(zero);
  try {
    const a=world.createRigidBody(R.RigidBodyDesc.fixed()),b=world.createRigidBody(R.RigidBodyDesc.dynamic());
    const valid={kind:'generic',lockedMask:7,frame1:pose(),frame2:pose(),limits:[{axis:3,min:-.3,max:.3}]};
    for(const invalid of [{...valid,limits:[{axis:2,min:-.3,max:.3}]},
      {...valid,limits:[{axis:3,min:1,max:-1}]},{...valid,limits:[{axis:3,min:NaN,max:1}]},
      {...valid,limits:[...valid.limits,...valid.limits]},
      {...valid,frame1:{...pose(),scale:{x:1,y:2,z:1}}}]) {
      assert.throws(()=>api.createAngularJoint(world,a,b,invalid),/axis|bound|duplicate|scale/i);
      assert.equal(world.impulseJoints.len(),0);
    }
  }finally{world.free();}
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test tests/rapierJointLimits.test.mjs`. Expect missing `createAngularJoint` assertions; the 12 matrix tests represent 24 independent limited/unlimited solver worlds.
- [ ] **Step 3: Implement the narrow adapter.** Installed declaration locations are `dist/dynamics/impulse_joint.d.ts`, `dist/dynamics/impulse_joint_set.d.ts` and `dist/rapier_wasm3d.d.ts`. Numeric literal axes correspond to the raw enum without importing an absent top-level `RawJointAxis` value.

```ts
// game/src/physics/rapierJointLimits.ts
import RAPIER from '@dimforge/rapier3d-compat';
import { rigid } from './poseBinding.ts';
import type { RigidTransform } from './poseBinding.ts';

export type AngularLimit={axis:3|4|5;min:number;max:number};
export type AngularJointSpec={
  kind:'spherical'|'generic';lockedMask:number;
  frame1:RigidTransform;frame2:RigidTransform;limits:readonly AngularLimit[];
};
export function createAngularJoint(world:RAPIER.World,parent:RAPIER.RigidBody,child:RAPIER.RigidBody,spec:AngularJointSpec) {
  if(RAPIER.version()!=='0.20.0')throw new Error('Angular adapter requires Rapier 0.20.0');
  if(typeof world.impulseJoints.raw.jointSetLimits!=='function')throw new Error('Raw angular limit API unavailable');
  if(parent===child||world.bodies.get(parent.handle)!==parent||world.bodies.get(child.handle)!==child)throw new Error('Joint bodies must belong to this world');
  const frame1=rigid(spec.frame1),frame2=rigid(spec.frame2);
  if(spec.kind!=='generic'&&spec.kind!=='spherical')throw new Error('Unsupported joint kind');
  if(!Number.isInteger(spec.lockedMask)||spec.lockedMask<0||spec.lockedMask>63)throw new Error('Invalid locked-axis mask');
  if(spec.kind==='spherical'&&spec.lockedMask!==7)throw new Error('Spherical joints require translation-locked mask 7');
  const seen=new Set<number>();
  const limits=spec.limits.map(limit=>{
    if(![3,4,5].includes(limit.axis))throw new Error('Invalid raw angular axis');
    if(seen.has(limit.axis))throw new Error('Duplicate angular axis');seen.add(limit.axis);
    if(!Number.isFinite(limit.min)||!Number.isFinite(limit.max)||limit.min>limit.max||limit.min< -Math.PI||limit.max>Math.PI)
      throw new Error('Invalid angular bounds');
    return {...limit};
  });
  const descriptor=spec.kind==='spherical'
    ?RAPIER.JointData.spherical(frame1.position,frame2.position)
    :RAPIER.JointData.generic(frame1.position,frame2.position,{x:1,y:0,z:0},spec.lockedMask);
  const joint=world.createImpulseJoint(descriptor,parent,child,true);
  try {
    joint.setLocalFrame1(frame1.position,frame1.rotation);
    joint.setLocalFrame2(frame2.position,frame2.rotation);
    joint.setContactsEnabled(false);
    for(const limit of limits)world.impulseJoints.raw.jointSetLimits(joint.handle,limit.axis,limit.min,limit.max);
    const readLimits=()=>limits.map(limit=>{
      if(!joint.isValid())throw new Error('Joint destroyed');
      const raw=world.impulseJoints.raw;
      if(!raw.jointLimitsEnabled(joint.handle,limit.axis))throw new Error('Angular limit was not enabled');
      return {axis:limit.axis,min:raw.jointLimitsMin(joint.handle,limit.axis),max:raw.jointLimitsMax(joint.handle,limit.axis)};
    });
    for(const [index,actual] of readLimits().entries()) {
      const expected=limits[index]!;
      if(Math.abs(actual.min-expected.min)>1e-6||Math.abs(actual.max-expected.max)>1e-6)throw new Error('Angular limit readback mismatch');
    }
    return {joint,readLimits};
  }catch(error){world.removeImpulseJoint(joint,true);throw error;}
}
```

- [ ] **Step 4: Verify GREEN.** Run `rtk proxy node --test tests/rapierJointLimits.test.mjs` then `rtk npm run typecheck`. Expect 14 passing tests and strict types. If a raw parameter rejects the numeric literal union in the installed compiler, use the parameter-derived type `Parameters<typeof world.impulseJoints.raw.jointSetLimits>[1]` with the validated literal; do not cast the whole world/raw set to `any`.
- [ ] **Step 5: Commit.** Run `rtk git add src/physics/rapierJointLimits.ts tests/rapierJointLimits.test.mjs`, then `rtk git commit -m "feat: isolate verified Rapier raw angular joint limits"`.

## Task 2: Measured coupled control and the bound animated arm

**Files:** Create `game/src/physics/armFixture.ts` and `game/tests/armFixture.test.mjs`.

The exact old control below starts dynamic and unstepped, matching the published probe. The production arm variation starts kinematic, executes one explicit initialization/query step, publishes tick 0 and subsequently advances once per 1/60 outer tick. It has nonidentity binds and local COM offsets. It must pass separately; the old control's numbers do not establish the new variation's stability.

- [ ] **Step 1: Write these complete physical acceptance tests.**

```js
// game/tests/armFixture.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import { Quaternion,Vector3 } from 'three';
import { createAngularJoint } from '../src/physics/rapierJointLimits.ts';
import { createFixedStepper } from '../src/runtime/fixedStep.ts';
import { zero,dt,q,pose,poseNear,vecNear,finite,withoutEpoch } from './bodyMotionHelpers.mjs';
const url=new URL('../src/physics/armFixture.ts',import.meta.url);
const api=existsSync(url)?await import(url.href):{};
await R.init();

function coupledControl(limited,maxCcdSubsteps=4) {
  assert.equal(typeof api.measureArmState,'function');
  const world=new R.World({x:0,y:-9.81,z:0});world.timestep=dt;
  world.numSolverIterations=4;world.maxCcdSubsteps=maxCcdSubsteps;
  try {
    const bodies=[-.2,.2].map(x=>world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,1.5,0)
      .setLinvel(.6,0,0).setCanSleep(false).setCcdEnabled(true)));
    const colliders=bodies.map((b,index)=>world.createCollider(R.ColliderDesc.cuboid(.2,.045,.045)
      .setMass(index?1:2).setFriction(.5).setRestitution(0),b));
    const floor=world.createCollider(R.ColliderDesc.cuboid(5,.1,5).setTranslation(0,-.1,0).setFriction(.5).setRestitution(0));
    const wall=world.createCollider(R.ColliderDesc.cuboid(.1,10,5).setTranslation(.65,5,0).setFriction(.5).setRestitution(0));
    const frame=q([0,0,1],Math.PI/2);
    const {joint}=createAngularJoint(world,bodies[0],bodies[1],{kind:'generic',lockedMask:39,
      frame1:pose({x:.2,y:0,z:0},frame),frame2:pose({x:-.2,y:0,z:0},frame),
      limits:limited?[{axis:3,min:-.35,max:.35},{axis:4,min:-.35,max:.35}]:[]});
    const input={world,bodies,colliders,floor,wall,joint};
    // Authored masses 2+1 kg, COM height 1.5 m, speed .6 m/s, initial omega zero.
    // Do not refresh native mass caches or step before the original first torque impulse.
    const initialMechanicalJ=44.685;
    const peak={anchor:0,penetration:0,x:0,y:0,energyExcess:0,speed:0,omega:0,wallTicks:0,wallImpulse:0};
    let workBound=0;
    for(let tick=0;tick<600;tick++) {
      const rotation=bodies[0].rotation();
      const frameWorld=new Quaternion(rotation.x,rotation.y,rotation.z,rotation.w).multiply(new Quaternion(frame.x,frame.y,frame.z,frame.w));
      const impulse=new Vector3(.03*(Math.floor(tick/60)%2===0?1:-1),.01*Math.sin(2*tick*dt+1),0).applyQuaternion(frameWorld).multiplyScalar(dt);
      const before=bodies.map(b=>Math.hypot(...Object.values(b.angvel())));
      bodies[1].applyTorqueImpulse(impulse,true);bodies[0].applyTorqueImpulse(impulse.clone().negate(),true);
      for(let index=0;index<2;index++)workBound+=impulse.length()*(before[index]+Math.hypot(...Object.values(bodies[index].angvel())))/2;
      world.step();
      const current=api.measureArmState(input);finite(current);
      peak.anchor=Math.max(peak.anchor,current.anchorGapM);peak.penetration=Math.max(peak.penetration,current.penetrationM);
      peak.x=Math.max(peak.x,Math.abs(current.projectedRadXYZ[0]));peak.y=Math.max(peak.y,Math.abs(current.projectedRadXYZ[1]));
      peak.speed=Math.max(peak.speed,current.maxSpeedMps);peak.omega=Math.max(peak.omega,current.maxOmegaRadps);
      peak.energyExcess=Math.max(peak.energyExcess,current.mechanicalJ-initialMechanicalJ-workBound);
      peak.wallTicks+=Number(current.wallContacts>0);peak.wallImpulse+=current.wallImpulseNs;
    }
    assert.equal(world.bodies.len(),2);assert.equal(world.colliders.len(),4);assert.equal(world.impulseJoints.len(),1);
    assert.ok(Math.abs(api.measureArmState(input).massKg-3)<1e-6);
    return peak;
  }finally{world.free();}
}

test('the exact coupled probe passes at explicit internal budget four with a truly moving unlimited control',()=>{
  const limited=coupledControl(true),unlimited=coupledControl(false);
  for(const measured of [limited,unlimited]) {
    assert.ok(measured.anchor<=.005,JSON.stringify(measured));assert.ok(measured.penetration<=.005,JSON.stringify(measured));
    assert.ok(measured.wallTicks>100&&measured.wallImpulse>0,JSON.stringify(measured));
    assert.ok(measured.speed<=12&&measured.omega<=50,JSON.stringify(measured));
    assert.ok(measured.energyExcess<=5,JSON.stringify(measured));
  }
  assert.ok(limited.x>.01&&limited.y>.01&&limited.x<=.40&&limited.y<=.40,JSON.stringify(limited));
  assert.ok(unlimited.x>.60&&unlimited.y>.60,JSON.stringify(unlimited));
});

test('default internal budget retains its documented failing anchor control',()=>{
  const control=coupledControl(true,1);
  assert.ok(control.anchor>.005,'control must expose the documented default-budget failure');
  assert.ok(Math.abs(control.anchor-.0202863872)<.002,JSON.stringify(control));
});

test('bent moving arm transfers at its boundary with pose mass identity and COM velocity preserved',async()=>{
  assert.equal(typeof api.createArmFixture,'function');
  const arm=await api.createArmFixture();
  try {
    arm.setActive(true);for(let tick=0;tick<30;tick++)arm.step();
    const before=arm.snapshot();
    assert.equal(before.mode,'animation');assert.equal(before.tick,30);
    assert.deepEqual(before.counts,{bodies:4,colliders:4,joints:1});
    assert.ok(Math.abs(before.metrics.projectedRadXYZ[1])>.05,'arm must be bent before transfer');
    for(const segment of before.segments)assert.ok(Math.hypot(...Object.values(segment.comVelocityWorldMps))>.01,'stationary root still has moving COM');
    arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:null});
    const after=arm.snapshot();assert.equal(after.mode,'physics');assert.equal(after.tick,before.tick);
    assert.deepEqual(after.counts,before.counts);
    for(let index=0;index<2;index++) {
      const a=before.segments[index],b=after.segments[index];assert.deepEqual(b.ref,a.ref);
      poseNear(b.bodyOriginWorld,a.bodyOriginWorld,.002,Math.PI/180);poseNear(b.boneWorld,a.boneWorld,.002,Math.PI/180);
      vecNear(b.comWorld,a.comWorld,.002);assert.ok(Math.abs(b.massKg-a.massKg)<=1e-6);
      vecNear(b.comVelocityWorldMps,after.handoff.report[index].comVelocityWorldMps,2e-5);
      vecNear(b.angularVelocityWorldRadps,after.handoff.report[index].angularVelocityWorldRadps,2e-5);
    }
    assert.throws(()=>arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:null}),/already/i);
    arm.step();const interval=arm.snapshot().interval;
    for(const id of ['upper-arm','forearm'])assert.deepEqual(interval.bodies.find(b=>b.ref.bodyId===id).discontinuities,['authority']);
    assert.equal(arm.snapshot().mode,'physics');
  }finally{arm.destroy();}
});

test('the actual bound arm survives dynamic-parent gravity wall contact and both enabled axes',async()=>{
  assert.equal(typeof api.createArmFixture,'function');const arm=await api.createArmFixture();
  try {
    arm.setActive(true);for(let tick=0;tick<30;tick++)arm.step();
    const before=arm.snapshot(),forearm=before.segments[1];
    arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:{bodyId:'forearm',
      impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{x:forearm.comWorld.x,y:forearm.comWorld.y+.02,z:forearm.comWorld.z}}});
    let wallTicks=0,wallImpulse=0;const maxima={anchor:0,penetration:0,x:0,y:0};
    for(let tick=0;tick<600;tick++) {
      arm.step();const state=arm.snapshot();finite(state);
      assert.equal(state.mode,'physics');assert.deepEqual(state.counts,{bodies:4,colliders:4,joints:1});
      assert.ok(Math.abs(state.metrics.massKg-3)<=1e-6);
      maxima.anchor=Math.max(maxima.anchor,state.metrics.anchorGapM);maxima.penetration=Math.max(maxima.penetration,state.metrics.penetrationM);
      maxima.x=Math.max(maxima.x,Math.abs(state.metrics.projectedRadXYZ[0]));maxima.y=Math.max(maxima.y,Math.abs(state.metrics.projectedRadXYZ[1]));
      wallTicks+=Number(state.metrics.wallContacts>0);wallImpulse+=state.metrics.wallImpulseNs;
      assert.ok(state.metrics.maxSpeedMps<=12&&state.metrics.maxOmegaRadps<=50,JSON.stringify(state.metrics));
      assert.ok(state.metrics.mechanicalJ<=state.energyAllowanceJ+1e-6,JSON.stringify(state.metrics));
    }
    assert.ok(wallTicks>10&&wallImpulse>0,`wall ticks ${wallTicks}, impulse ${wallImpulse}`);
    assert.ok(maxima.anchor<=.005&&maxima.penetration<=.005,JSON.stringify(maxima));
    assert.ok(maxima.x>.01&&maxima.y>.01&&maxima.x<=.40&&maxima.y<=.40,JSON.stringify(maxima));
  }finally{arm.destroy();}
});

test('queued handoff is epoch checked consumed once cleared by pause and invalid after destroy',async()=>{
  assert.equal(typeof api.createArmFixture,'function');let oldEpoch;
  for(const transfer of [false,true])for(let lifecycle=0;lifecycle<5;lifecycle++) {
    const arm=await api.createArmFixture();
    try {
      arm.setActive(true);arm.step();arm.step();let state=arm.snapshot();
      if(oldEpoch)assert.throws(()=>arm.queueHandoff({worldEpoch:oldEpoch,atTick:state.tick,impulse:null}),/stale/i);
      const command={worldEpoch:state.worldEpoch,atTick:state.tick,impulse:null};
      assert.equal(arm.queueHandoff(command),true);assert.equal(arm.queueHandoff(command),false);
      arm.setActive(false);state=arm.snapshot();assert.equal(state.pending,false);
      for(let call=0;call<20;call++)assert.equal(arm.step(),false);
      assert.deepEqual(arm.snapshot(),state);assert.equal(arm.queueHandoff(command),false);
      arm.setActive(true);arm.step();assert.equal(arm.snapshot().mode,'animation');
      if(transfer) {
        const now=arm.snapshot();arm.queueHandoff({worldEpoch:now.worldEpoch,atTick:now.tick,impulse:null});arm.step();
        assert.equal(arm.snapshot().mode,'physics');assert.equal(arm.snapshot().pending,false);
      }
      oldEpoch=state.worldEpoch;arm.destroy();arm.destroy();
      assert.deepEqual(arm.counts(),{bodies:0,colliders:0,joints:0});
      assert.throws(()=>arm.queueHandoff(command),/destroyed/i);assert.throws(()=>arm.snapshot(),/destroyed/i);
    }finally{arm.destroy();}
  }
});

test('unexpected second torque setter failure frees the owner and prevents partial publication',async()=>{
  assert.equal(typeof api.createArmFixture,'function');const arm=await api.createArmFixture();
  const original=R.RigidBody.prototype.applyTorqueImpulse;
  try {
    arm.setActive(true);arm.step();arm.step();const state=arm.snapshot();
    arm.handoff({worldEpoch:state.worldEpoch,atTick:state.tick,impulse:null});
    let calls=0;
    R.RigidBody.prototype.applyTorqueImpulse=function(...args) {
      if(++calls===2)throw new Error('injected second torque setter failure');
      return original.apply(this,args);
    };
    assert.throws(()=>arm.step(),/injected second torque setter/);assert.equal(calls,2);
    assert.deepEqual(arm.counts(),{bodies:0,colliders:0,joints:0});
    assert.throws(()=>arm.snapshot(),/destroyed/i);assert.throws(()=>arm.step(),/destroyed/i);
  }finally{R.RigidBody.prototype.applyTorqueImpulse=original;arm.destroy();}
});

test('same fixed-tick arm commands replay exactly under 30 60 144 Hz and pause adds no debt or queued handoff',async()=>{
  assert.equal(typeof api.createArmFixture,'function');const runs=[];const epochs=[];
  for(const hz of [30,60,144]) {
    const arm=await api.createArmFixture(),advance=createFixedStepper(),frames=[];
    try {
      let ticks=0;arm.setActive(true);
      for(let frame=0;ticks<180&&frame<2000;frame++)advance(1/hz,true,()=>{
        if(ticks>=180)return;
        if(ticks===30) {
          const state=arm.snapshot();arm.queueHandoff({worldEpoch:state.worldEpoch,atTick:state.tick,impulse:null});
          arm.setActive(false);const paused=arm.snapshot();
          const result=advance(10,false,()=>assert.fail('pause must not step'));
          assert.equal(result.steps,0);assert.equal(result.alpha,0);assert.equal(arm.step(),false);
          assert.deepEqual(arm.snapshot(),paused);arm.setActive(true);
        }
        if(ticks===45) {
          const state=arm.snapshot(),com=state.segments[1].comWorld;
          arm.queueHandoff({worldEpoch:state.worldEpoch,atTick:state.tick,
            impulse:{bodyId:'forearm',impulseWorldNs:{x:.4,y:0,z:0},pointWorld:{...com,y:com.y+.02}}});
        }
        arm.step();ticks++;frames.push(withoutEpoch(arm.snapshot()));
      });
      assert.equal(ticks,180);assert.equal(frames[30].mode,'animation');assert.equal(frames[45].mode,'physics');
      epochs.push(arm.snapshot().worldEpoch);runs.push(frames);
    }finally{arm.destroy();}
  }
  assert.equal(new Set(epochs).size,3);assert.deepEqual(runs[1],runs[0]);assert.deepEqual(runs[2],runs[0]);
});
```

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test tests/armFixture.test.mjs`. Missing `measureArmState` and `createArmFixture` must fail meaningfully. Do not classify the explicit default-budget negative control as a production failure when its test correctly observes the documented bad configuration.
- [ ] **Step 3: Implement the complete read-only diagnostics and fixture.** The core authority now requires its fourth `onFatal(error)` owner callback. Native failure invalidates the publisher and frees the fixture; ordinary validation errors remain recoverable and do not publish partial state.

```ts
// game/src/physics/armFixture.ts
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion,Vector3 } from 'three';
import { FIXED_DT } from '../runtime/fixedStep.ts';
import { createBodyMotion,preflightMotionNames } from './bodyMotion.ts';
import type { BodyMotion,MotionSource } from './bodyMotion.ts';
import { composeRigid,inverseRigid,worldBodyFromBone,worldBoneFromBody,createPoseAuthority,rigid,finiteVector } from './poseBinding.ts';
import type { BoneBinding,PointImpulse,RigidTransform } from './poseBinding.ts';
import { createAngularJoint } from './rapierJointLimits.ts';
import type { Rotation,Vec3 } from '../content/yardLayout.ts';

const zero={x:0,y:0,z:0},identity={x:0,y:0,z:0,w:1};
const pose=(position:Vec3=zero,rotation:Rotation=identity):RigidTransform=>rigid({position,rotation});
const quat=(q:Rotation)=>new Quaternion(q.x,q.y,q.z,q.w);
const axis=(v:Vec3,angle:number):Rotation=>{
  const q=new Quaternion().setFromAxisAngle(new Vector3(v.x,v.y,v.z),angle);
  return {x:q.x,y:q.y,z:q.z,w:q.w};
};
const frame=axis({x:0,y:0,z:1},Math.PI/2);
const length=(v:Vec3)=>Math.hypot(v.x,v.y,v.z);
type MeasurementInput={world:RAPIER.World;bodies:readonly RAPIER.RigidBody[];colliders:readonly RAPIER.Collider[];
  floor:RAPIER.Collider;wall:RAPIER.Collider;joint:RAPIER.ImpulseJoint};

export function measureArmState(input:MeasurementInput) {
  const {world,bodies,colliders,floor,wall,joint}=input;
  if(bodies.length!==2)throw new Error('Arm measurement requires two bodies');
  let kineticJ=0,potentialJ=0,maxSpeedMps=0,maxOmegaRadps=0,massKg=0;
  for(const body of bodies) {
    const rotation=body.rotation(),v=finiteVector(body.linvel()),omega=finiteVector(body.angvel());
    rigid({position:body.translation(),rotation});const com=finiteVector(body.worldCom());
    const inertia=finiteVector(body.principalInertia());
    const worldInertia=quat(rotation).multiply(quat(body.principalInertiaLocalFrame()));
    const localOmega=new Vector3(omega.x,omega.y,omega.z).applyQuaternion(worldInertia.conjugate());
    kineticJ+=.5*body.mass()*length(v)**2+.5*(inertia.x*localOmega.x**2+inertia.y*localOmega.y**2+inertia.z*localOmega.z**2);
    potentialJ+=body.mass()*9.81*com.y;massKg+=body.mass();
    maxSpeedMps=Math.max(maxSpeedMps,length(v));maxOmegaRadps=Math.max(maxOmegaRadps,length(omega));
  }
  const anchorsWorld=[joint.anchor1(),joint.anchor2()].map((anchor,index)=>{
    const body=bodies[index]!;return composeRigid(pose(body.translation(),body.rotation()),pose(anchor)).position;
  });
  const a=anchorsWorld[0]!,b=anchorsWorld[1]!;
  const parentFrame=quat(bodies[0]!.rotation()).multiply(quat(joint.frameX1()));
  const childFrame=quat(bodies[1]!.rotation()).multiply(quat(joint.frameX2()));
  const relative=parentFrame.conjugate().multiply(childFrame).normalize();
  if(relative.w<0)relative.set(-relative.x,-relative.y,-relative.z,-relative.w);
  const projectedRadXYZ=[relative.x,relative.y,relative.z].map(value=>2*Math.atan2(value,relative.w));
  let penetrationM=0,wallContacts=0,floorContacts=0,wallImpulseNs=0;
  for(const collider of colliders)for(const obstacle of [wall,floor])world.contactPair(collider,obstacle,manifold=>{
    for(let index=0;index<manifold.numSolverContacts();index++) {
      const distance=manifold.solverContactDist(index);if(!Number.isFinite(distance))throw new Error('Nonfinite solver contact');
      penetrationM=Math.max(penetrationM,-distance);if(obstacle===wall)wallContacts++;else floorContacts++;
    }
    for(let index=0;index<manifold.numContacts();index++) {
      const impulse=manifold.contactImpulse(index);if(!Number.isFinite(impulse))throw new Error('Nonfinite contact impulse');
      if(obstacle===wall)wallImpulseNs+=impulse;
    }
  });
  return {anchorGapM:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),anchorsWorld,projectedRadXYZ,
    kineticJ,potentialJ,mechanicalJ:kineticJ+potentialJ,massKg,maxSpeedMps,maxOmegaRadps,
    penetrationM,wallContacts,floorContacts,wallImpulseNs};
}

export type ArmHandoffCommand={worldEpoch:string;atTick:number;impulse:PointImpulse|null};
let initialization:Promise<void>|undefined;
export async function createArmFixture() {
  preflightMotionNames(['upper-arm','forearm','floor','wall'].map(bodyId=>({bodyId,colliderIds:['shape']})));
  initialization??=RAPIER.init();await initialization;
  const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=FIXED_DT;
  world.numSolverIterations=4;world.maxCcdSubsteps=4;
  let destroyed=false,active=false,tick=0,physicalTicks=0;
  let motion:BodyMotion|undefined;
  let authority:ReturnType<typeof createPoseAuthority>|undefined;
  let pending:ArmHandoffCommand|null=null;
  let energyAllowanceJ=0;
  let wallContactTicks=0,wallImpulseNs=0;
  type TransferReport=ReturnType<ReturnType<typeof createPoseAuthority>['handoff']>;
  let transfer:{tick:number;report:TransferReport}|null=null;
  const alive=()=>{if(destroyed)throw new Error('Arm fixture destroyed');};
  function destroy():void {
    if(destroyed)return;destroyed=true;active=false;pending=null;transfer=null;
    authority?.destroy();motion?.destroy();authority=undefined;motion=undefined;world.free();
  }
  try {
    const bindings:BoneBinding[]=[
      {version:1,boneToBody:pose({x:.12,y:.03,z:.01},axis({x:0,y:1,z:0},.25))},
      {version:1,boneToBody:pose({x:.09,y:-.02,z:-.01},axis({x:0,y:0,z:1},-.20))},
    ];
    const bonePoses=(sampleTick:number)=>{
      const t=sampleTick*FIXED_DT;
      const upper=pose({x:-.4,y:1.5,z:0},axis({x:0,y:1,z:0},.07*Math.sin(t)));
      const bend=quat(frame).multiply(quat(axis({x:1,y:0,z:0},.10*Math.sin(1.5*t))))
        .multiply(quat(axis({x:0,y:1,z:0},.14+.05*Math.sin(2*t)))).multiply(quat(frame).conjugate());
      const lower=composeRigid(upper,pose({x:.4,y:0,z:0},bend));
      return [upper,lower];
    };
    const names=['upper-arm','forearm'];
    const initialBones=bonePoses(0);
    const segments=names.map((id,index)=>{
      const binding=bindings[index]!,bodyPose=worldBodyFromBone(initialBones[index]!,binding);
      const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(bodyPose.position.x,bodyPose.position.y,bodyPose.position.z).setRotation(bodyPose.rotation)
        .setCanSleep(false).setCcdEnabled(true));
      const colliderLocal=composeRigid(inverseRigid(binding.boneToBody),pose({x:.2,y:0,z:0}));
      const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.2,.045,.045)
        .setTranslation(colliderLocal.position.x,colliderLocal.position.y,colliderLocal.position.z)
        .setRotation(colliderLocal.rotation).setMass(index?1:2).setFriction(.5).setRestitution(0),body);
      return {id,body,collider,binding};
    });
    const obstacles=[
      {id:'floor',position:{x:0,y:-.1,z:0},size:[10,.2,10] as const},
      {id:'wall',position:{x:.65,y:5,z:0},size:[.2,20,10] as const},
    ].map(definition=>{
      const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(definition.position.x,definition.position.y,definition.position.z));
      const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(definition.size[0]/2,definition.size[1]/2,definition.size[2]/2)
        .setFriction(.5).setRestitution(0),body);return {...definition,body,collider};
    });
    const localFrame1=composeRigid(inverseRigid(bindings[0]!.boneToBody),pose({x:.4,y:0,z:0},frame));
    const localFrame2=composeRigid(inverseRigid(bindings[1]!.boneToBody),pose(zero,frame));
    const adapter=createAngularJoint(world,segments[0]!.body,segments[1]!.body,{kind:'generic',lockedMask:39,
      frame1:localFrame1,frame2:localFrame2,limits:[{axis:3,min:-.35,max:.35},{axis:4,min:-.35,max:.35}]});
    const sources:MotionSource[]=[
      ...segments.map(s=>({bodyId:s.id,body:s.body,colliders:[{colliderId:'shape',collider:s.collider,
        role:'blocker' as const,shape:()=>({kind:'box' as const,size:[.4,.09,.09] as const})}]})),
      ...obstacles.map(o=>({bodyId:o.id,body:o.body,colliders:[{colliderId:'shape',collider:o.collider,
        role:'blocker' as const,shape:()=>({kind:'box' as const,size:o.size})}]})),
    ];
    // The only bootstrap step; all members are fixed/kinematic and retain the authored bent pose.
    world.step();motion=createBodyMotion(world,sources);
    const refs=segments.map(s=>motion!.ref(s.id));
    authority=createPoseAuthority(segments,id=>motion!.assertRef(refs[names.indexOf(id)]!),FIXED_DT,()=>destroy());
    authority.capture(0);
    const measurement:MeasurementInput={world,bodies:segments.map(s=>s.body),colliders:segments.map(s=>s.collider),
      floor:obstacles[0]!.collider,wall:obstacles[1]!.collider,joint:adapter.joint};
    const counts=()=>destroyed?{bodies:0,colliders:0,joints:0}:{bodies:world.bodies.len(),colliders:world.colliders.len(),joints:world.impulseJoints.len()};
    const validateCommand=(command:ArmHandoffCommand)=>{
      alive();if(command.worldEpoch!==motion!.worldEpoch)throw new Error('Stale world handoff');
      if(!Number.isSafeInteger(command.atTick)||command.atTick!==tick)throw new Error('Handoff requires current boundary');
      if(tick<1)throw new Error('Handoff needs two-sample history');
      if(command.impulse) {
        if(!names.includes(command.impulse.bodyId))throw new Error('Unknown impulse body');
        finiteVector(command.impulse.impulseWorldNs);finiteVector(command.impulse.pointWorld);
      }
    };
    const handoff=(command:ArmHandoffCommand)=>{
      validateCommand(command);
      const report=authority!.handoff(tick,command.impulse??undefined);
      transfer={tick,report};pending=null;physicalTicks=0;
      energyAllowanceJ=measureArmState(measurement).mechanicalJ+5;
    };
    return {
      counts,destroy,handoff,
      setActive(value:boolean):void {alive();active=value;if(!active)pending=null;},
      queueHandoff(command:ArmHandoffCommand):boolean {
        validateCommand(command);if(!active||authority!.mode()!=='animation'||pending)return false;
        pending=structuredClone(command);return true;
      },
      step():boolean {
        alive();if(!active)return false;
        if(pending)handoff(pending);
        try {
          if(authority!.mode()==='animation') {
            const bones=bonePoses(tick+1);
            authority!.animate(tick+1,segments.map((s,index)=>({id:s.id,bodyOriginWorld:worldBodyFromBone(bones[index]!,s.binding)})));
          }else{
            const parentJoint=quat(segments[0]!.body.rotation()).multiply(quat(adapter.joint.frameX1()));
            const torque=new Vector3(.03*(Math.floor(physicalTicks/60)%2===0?1:-1),.01*Math.sin(2*physicalTicks*FIXED_DT+1),0)
              .applyQuaternion(parentJoint).multiplyScalar(FIXED_DT);
            const torqueMagnitude=torque.length(),beforeOmega=segments.map(s=>length(s.body.angvel()));
            segments[1]!.body.applyTorqueImpulse(torque,true);segments[0]!.body.applyTorqueImpulse(torque.clone().negate(),true);
            for(let index=0;index<2;index++)energyAllowanceJ+=torqueMagnitude*(beforeOmega[index]!+length(segments[index]!.body.angvel()))/2;
          }
          world.step();tick++;authority!.capture(tick);motion!.completeStep();
          const measured=measureArmState(measurement);
          wallContactTicks+=Number(measured.wallContacts>0);wallImpulseNs+=measured.wallImpulseNs;
          if(authority!.mode()==='physics') {
            physicalTicks++;
          }
          return true;
        }catch(error){destroy();throw error;}
      },
      snapshot() {
        alive();
        return {worldEpoch:motion!.worldEpoch,tick,mode:authority!.mode(),active,pending:pending!==null,
          counts:counts(),interval:motion!.read(),metrics:measureArmState(measurement),energyAllowanceJ,
          contacts:{wallTicks:wallContactTicks,wallImpulseNs},
          handoff:structuredClone(transfer),
          segments:segments.map((s,index)=>({ref:{...refs[index]!},bodyOriginWorld:pose(s.body.translation(),s.body.rotation()),
            boneWorld:worldBoneFromBody(pose(s.body.translation(),s.body.rotation()),s.binding),
            colliderWorld:pose(s.collider.translation(),s.collider.rotation()),
            comWorld:{...s.body.worldCom()},comVelocityWorldMps:{...s.body.linvel()},
            angularVelocityWorldRadps:{...s.body.angvel()},massKg:s.body.mass()})),
        };
      },
    };
  }catch(error){destroy();throw error;}
}
export type ArmFixture=Awaited<ReturnType<typeof createArmFixture>>;
export type ArmSnapshot=ReturnType<ArmFixture['snapshot']>;
```

Measurements are detached numerical data. Contact counts are per-sample solver contacts, not unique contact identities. Penetration is negative solver-contact distance, not a deepest-overlap oracle. The absolute torque-work allowance uses angular speeds immediately before and immediately after applying the impulses, before `world.step()` can change motion through contacts, gravity or constraints. No joint handle, collider handle or body handle appears in the fixture snapshot. A completed interval remains the previous completed interval immediately after a boundary handoff; the separate current boundary state and handoff report reflect the conversion, and the next completed interval marks `authority`.

- [ ] **Step 4: Run the new physics tests and strict checking.** Run `rtk proxy node --test tests/armFixture.test.mjs tests/rapierJointLimits.test.mjs`, then `rtk npm run typecheck`. Expect seven arm tests and 14 adapter tests to pass. Record raw maxima for both the exact control and the changed bound/animated arm; a passing control cannot substitute for a failing bound arm. The injected setter failure proves lifecycle cleanup only; all physical acceptance tests still use real native integration without mocks.
- [ ] **Step 5: Commit the fixture and tests.** Run `rtk git add src/physics/armFixture.ts tests/armFixture.test.mjs`, then `rtk git commit -m "feat: prove bound arm handoff and coupled contact motion"`.

## Task 3: Separate dev-only visual arm lab

**Files:** Create `game/arm-lab.html`, `game/src/lab/armLab.ts`, `game/src/lab/armLabView.ts`, `game/src/lab/armLab.css` and `game/browser/armLab.spec.mjs`.

This is a deliberately labelled technical inspection view. It is not a normal-yard feature, humanoid, final art, anatomical demonstration or production gameplay acceptance. Its fixed camera sits on the negative-X side of the wall with positive Z, so the near wall face cannot obscure the two arm segments. No source import from normal `main.ts` and no new Vite build entry are added.

- [ ] **Step 1: Write complete real-browser tests, including capture paths.**

```js
// game/browser/armLab.spec.mjs
import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer,build} from 'vite';
import {chromium} from 'playwright';
const root=dirname(fileURLToPath(new URL('../package.json',import.meta.url)));
const captures=join(root,'.playtest');let server,browser;
before(async()=>{
  await mkdir(captures,{recursive:true});
  server=await createServer({configFile:join(root,'vite.config.ts'),root,logLevel:'error',
    server:{host:'127.0.0.1',port:4178,strictPort:true}});
  await server.listen();browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
});
after(async()=>{await browser?.close();await server?.close();});
const frames=page=>page.evaluate(async()=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
});

test('dev lab shows the real bound arm, boundary handoff and wall contact with clean pauses and ten resets',{timeout:90_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfailed',request=>errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    assert.equal(await page.locator('html').getAttribute('data-fixture'),'ARM_LAB_ONLY');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    assert.equal(await page.locator('#handoff').isDisabled(),true);
    assert.equal(await page.locator('#lab-viewport canvas').count(),1);
    await frames(page);const baseline=await page.evaluate(()=>window.__armLab());
    assert.deepEqual(baseline.counts,{bodies:4,colliders:4,joints:1});assert.equal(baseline.running,false);
    await page.locator('#animate').click();
    await page.waitForFunction(()=>window.__armLab().tick>=30);
    await page.locator('#pause').click();
    const before=await page.evaluate(()=>window.__armLab());assert.equal(before.mode,'animation');assert.equal(before.running,false);
    await page.screenshot({path:join(captures,'arm-lab-before.png')});
    await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__armLab().tick),before.tick);
    await page.locator('#handoff').click();
    const after=await page.evaluate(()=>window.__armLab());
    assert.equal(after.mode,'physics');assert.equal(after.running,false);assert.equal(after.tick,before.tick);
    assert.deepEqual(after.segments.map(s=>s.ref),before.segments.map(s=>s.ref));
    for(let index=0;index<2;index++) {
      const a=before.segments[index].bodyOriginWorld,b=after.segments[index].bodyOriginWorld;
      assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<=.002);
      const dot=a.rotation.x*b.rotation.x+a.rotation.y*b.rotation.y+a.rotation.z*b.rotation.z+a.rotation.w*b.rotation.w;
      assert.ok(2*Math.acos(Math.min(1,Math.abs(dot)))<=Math.PI/180);
    }
    assert.equal(await page.locator('#handoff').isDisabled(),true);
    await frames(page);await page.screenshot({path:join(captures,'arm-lab-handoff.png')});
    await page.locator('#animate').click();
    await page.waitForFunction(tick=>window.__armLab().tick>=tick+120,after.tick);
    await page.locator('#pause').click();await frames(page);
    const contact=await page.evaluate(()=>window.__armLab());assert.equal(contact.mode,'physics');
    assert.ok(contact.metrics.anchorGapM<=.005&&contact.metrics.penetrationM<=.005);
    assert.ok(contact.contacts.wallTicks>0&&contact.contacts.wallImpulseNs>0,'contact capture requires actual wall contact and impulse history');
    await page.screenshot({path:join(captures,'arm-lab-contact.png')});
    await page.locator('#animate').click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(()=>window.__armLab().running),false);
    const paused=await page.evaluate(()=>window.__armLab().tick);await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>window.__armLab().tick),paused);
    for(let count=1;count<=10;count++) {
      await page.locator('#reset').click();
      await page.waitForFunction(expected=>window.__armLab?.()?.resets===expected,count);
      await frames(page);
      const reset=await page.evaluate(()=>window.__armLab());
      assert.equal(reset.tick,0);assert.equal(reset.running,false);assert.equal(reset.mode,'animation');
      assert.equal(reset.pending,false);assert.notEqual(reset.worldEpoch,before.worldEpoch);
      assert.deepEqual(reset.counts,baseline.counts);assert.deepEqual(reset.gpu,baseline.gpu);
      assert.equal(await page.locator('#lab-viewport canvas').count(),1);
      assert.equal(await page.locator('#handoff').isDisabled(),true);
    }
    await page.setViewportSize({width:1024,height:700});await frames(page);
    const canvas=await page.locator('#lab-viewport canvas').boundingBox();
    assert.ok(canvas&&canvas.width>650&&canvas.height>500);
    await page.screenshot({path:join(captures,'arm-lab-reset.png')});
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('normal production build excludes lab HTML and all lab-only code',{timeout:90_000},async()=>{
  const outDir=join(captures,'arm-lab-production');
  await build({configFile:join(root,'vite.config.ts'),root,logLevel:'error',build:{outDir,emptyOutDir:true}});
  assert.ok(existsSync(join(outDir,'index.html')));assert.equal(existsSync(join(outDir,'arm-lab.html')),false);
  const files=await readdir(outDir,{recursive:true});
  for(const file of files.filter(file=>file.endsWith('.js')||file.endsWith('.html'))) {
    const content=await readFile(join(outDir,file),'utf8');
    assert.ok(!/ARM_LAB_ONLY|Arm fixture destroyed|arm-lab\.html/.test(content),`lab leaked into ${file}`);
  }
});

test('actual WebGL context loss freezes simulation and restores resources before explicit resume',{timeout:45_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);await frames(page);
    const baseline=await page.evaluate(()=>window.__armLab());
    await page.locator('#animate').click();await page.waitForFunction(()=>window.__armLab().tick>=10);
    await page.evaluate(()=>{
      const canvas=document.querySelector('#lab-viewport canvas'),gl=canvas.getContext('webgl2');
      const extension=gl?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WEBGL_lose_context unavailable; lifecycle test was not exercised');
      window.__restoreArmContext=()=>extension.restoreContext();extension.loseContext();
    });
    await page.waitForFunction(()=>window.__armLab().graphicsLost===true);
    const lost=await page.evaluate(()=>window.__armLab());assert.equal(lost.running,false);assert.equal(lost.pending,false);
    for(const selector of ['#animate','#pause','#handoff','#reset'])assert.equal(await page.locator(selector).isDisabled(),true);
    await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__armLab().tick),lost.tick);
    await page.evaluate(()=>window.__restoreArmContext());
    await page.waitForFunction(()=>window.__armLab().graphicsLost===false);await frames(page);await frames(page);
    const restored=await page.evaluate(()=>window.__armLab());
    assert.equal(restored.tick,lost.tick);assert.equal(restored.running,false);assert.equal(restored.pending,false);
    assert.equal(restored.mode,'animation');assert.deepEqual(restored.counts,baseline.counts);assert.deepEqual(restored.gpu,baseline.gpu);
    await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__armLab().tick),lost.tick);
    await page.screenshot({path:join(captures,'arm-lab-context-restored.png')});
    await page.locator('#animate').click();await page.waitForFunction(tick=>window.__armLab().tick>tick,lost.tick);
    await page.locator('#pause').click();
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('synthetic unavailable WebGL boot gives a clear reload recovery with no live simulation or frame loop',{timeout:45_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{
    if(location.origin==='null')return;
    if(sessionStorage.getItem('arm-lab-webgl-failed-once'))return;
    sessionStorage.setItem('arm-lab-webgl-failed-once','1');
    const originalContext=HTMLCanvasElement.prototype.getContext,originalFrame=window.requestAnimationFrame;
    window.__armBootFrames=0;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;
      return originalContext.call(this,type,...args);
    };
    window.requestAnimationFrame=function(callback){window.__armBootFrames++;return originalFrame.call(this,callback);};
  });
  const page=await context.newPage(),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.locator('#reload').waitFor({state:'visible'});
    assert.match(await page.locator('#lab-status').textContent(),/grafiken kunde inte starta/i);
    assert.equal(await page.locator('#lab-viewport canvas').count(),0);
    assert.equal(await page.evaluate(()=>typeof window.__armLab),'undefined');
    await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__armBootFrames),0);
    for(const selector of ['#animate','#pause','#handoff','#reset'])assert.equal(await page.locator(selector).isDisabled(),true);
    await Promise.all([page.waitForEvent('load'),page.locator('#reload').click()]);
    await page.waitForFunction(()=>window.__armLab?.()!=null);await frames(page);
    assert.equal(await page.locator('#reload').isVisible(),false);assert.equal(await page.locator('#lab-viewport canvas').count(),1);
    const recovered=await page.evaluate(()=>window.__armLab());assert.equal(recovered.tick,0);assert.equal(recovered.running,false);
    assert.deepEqual(recovered.counts,{bodies:4,colliders:4,joints:1});assert.deepEqual(pageErrors,[]);
    await page.screenshot({path:join(captures,'arm-lab-boot-recovered.png')});
  }finally{await context.close();}
});
```

This test uses port 4178 and a dedicated ignored output directory so it can coexist with the existing nine browser tests, which use port 4173 and the normal build directory. A PNG file being written is not visual acceptance; Step 6 requires actual image inspection.

- [ ] **Step 2: Observe RED.** Run `rtk proxy node --test browser/armLab.spec.mjs`. Expect the first test to fail because `data-fixture` is missing on the nonexistent lab page. The production-exclusion test may already pass; report that honestly and retain it as a guard.
- [ ] **Step 3: Create the isolated HTML and CSS.**

```html
<!-- game/arm-lab.html -->
<!doctype html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vadstena · Armprov</title>
  </head>
  <body>
    <main id="lab-shell">
      <aside aria-label="Kontroller för armprovet">
        <p class="eyebrow">VADSTENA / UTVECKLINGSPROV</p>
        <h1>Från rörelse<br />till fysik.</h1>
        <p class="intro">Två ledade segment med samma kroppar, massa och pose genom överlämningen.</p>
        <div class="buttons">
          <button id="animate" disabled>Starta animation</button>
          <button id="pause" disabled>Pausa</button>
          <button id="handoff" disabled>Överlämna + impuls</button>
          <button id="reset" disabled>Återställ provet</button>
          <button id="reload" hidden>Ladda om och försök igen</button>
        </div>
        <p id="lab-status" role="status" aria-live="polite">Förbereder armprovet…</p>
        <dl>
          <dt>Steg</dt><dd id="tick">0</dd>
          <dt>Ledavstånd</dt><dd id="gap">—</dd>
          <dt>Kontaktpenetration</dt><dd id="penetration">—</dd>
          <dt>Armmassa</dt><dd id="mass">3 kg</dd>
        </dl>
        <p class="legend"><span class="com-dot"></span> Masscentrum <span class="anchor-dot"></span> Ledankare</p>
        <p class="footnote">Separat teknikvy. Ledkoordinaterna är diagnostik, inte anatomiska gränser. Ingen komplett ragdoll visas.</p>
      </aside>
      <section id="lab-viewport" aria-label="Tredimensionellt armprov"></section>
    </main>
    <script type="module" src="./src/lab/armLab.ts"></script>
  </body>
</html>
```

```css
/* game/src/lab/armLab.css */
:root { font-family:Inter,ui-sans-serif,system-ui,sans-serif; color:#e4e8e1; background:#172421; font-synthesis:none; }
* { box-sizing:border-box; }
body { margin:0; }
#lab-shell { display:grid; grid-template-columns:290px minmax(0,1fr); height:100dvh; min-height:600px; }
aside { padding:34px 25px; border-right:1px solid #40534a; background:#1d2c27; overflow:auto; }
.eyebrow { font-size:10px; letter-spacing:.15em; color:#a5b6a8; margin:0 0 26px; }
h1 { font-family:Georgia,serif; font-size:31px; font-weight:400; line-height:1.13; margin:0 0 18px; }
.intro,.footnote { font-size:13px; line-height:1.6; color:#aebdb2; }
.buttons { display:grid; gap:8px; margin:24px 0 18px; }
button { font:inherit; text-align:left; padding:12px 14px; color:#eef0e9; border:1px solid #57705f; background:#2e4639; border-radius:3px; cursor:pointer; }
button:hover:enabled { background:#3e5c47; }
button:focus-visible { outline:3px solid #d6b875; outline-offset:3px; }
button:disabled { color:#839087; border-color:#36493d; background:#23342a; cursor:default; }
#handoff { border-color:#a47c4b; }
#lab-status { min-height:42px; font-size:13px; line-height:1.5; color:#e1c998; }
dl { display:grid; grid-template-columns:1fr auto; gap:10px; margin:20px 0; font-size:12px; }
dt { color:#aebdb2; } dd { margin:0; font-variant-numeric:tabular-nums; }
.legend { display:flex; align-items:center; flex-wrap:wrap; gap:6px; font-size:11px; color:#b5c6ba; }
.com-dot,.anchor-dot { width:7px; height:7px; border-radius:50%; display:inline-block; background:#7fe0dc; }
.anchor-dot { margin-left:6px; background:#f47e68; }
.footnote { font-size:11px; margin-top:25px; }
#lab-viewport { min-width:0; min-height:0; position:relative; overflow:hidden; }
#lab-viewport canvas { display:block; width:100%; height:100%; }
```

- [ ] **Step 4: Create the complete Three view.** Geometries and materials are allocated once per lab view, reused across fixture resets and explicitly disposed when the view closes.

```ts
// game/src/lab/armLabView.ts
import * as THREE from 'three';
import type { ArmSnapshot } from '../physics/armFixture.ts';
import type { RigidTransform } from '../physics/poseBinding.ts';

export function createArmLabView(host:HTMLElement) {
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','Två fysiska armsegment med markerade masscentrum och ledankare');
  host.append(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#273b34');
  const camera=new THREE.PerspectiveCamera(42,1,.03,40);
  camera.position.set(-1.7,2.2,3.2);camera.lookAt(-.05,.75,0);
  scene.add(new THREE.HemisphereLight('#e5efdd','#2d3930',2));
  const key=new THREE.DirectionalLight('#ffe7bb',3);key.position.set(-3,5,4);scene.add(key);
  const objects:THREE.Mesh[]=[];
  function mesh(geometry:THREE.BufferGeometry,color:string) {
    const item=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.08}));
    objects.push(item);scene.add(item);return item;
  }
  const upper=mesh(new THREE.BoxGeometry(.4,.09,.09),'#c39255');
  const lower=mesh(new THREE.BoxGeometry(.4,.09,.09),'#e2be83');
  const floor=mesh(new THREE.BoxGeometry(10,.2,10),'#657466');floor.position.set(0,-.1,0);
  const wall=mesh(new THREE.BoxGeometry(.2,20,10),'#8d9988');wall.position.set(.65,5,0);
  const com=[0,1].map(()=>mesh(new THREE.SphereGeometry(.014,12,8),'#7fe0dc'));
  const anchors=[0,1].map(()=>mesh(new THREE.SphereGeometry(.011,12,8),'#f47e68'));
  for(const marker of [...com,...anchors]) {
    marker.renderOrder=2;marker.material.depthTest=false;marker.material.transparent=true;marker.material.opacity=.95;
  }
  const grid=new THREE.GridHelper(4,16,'#8b9c87','#566b5c');grid.position.y=.002;scene.add(grid);
  let disposed=false;
  const setPose=(mesh:THREE.Mesh,pose:RigidTransform)=>{
    mesh.position.set(pose.position.x,pose.position.y,pose.position.z);
    mesh.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);
  };
  const resize=()=>{
    if(disposed)return;const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  };
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {
    canvas,
    render(snapshot:ArmSnapshot):void {
      if(disposed)return;
      for(const [index,item] of [upper,lower].entries()) {
        setPose(item,snapshot.segments[index]!.colliderWorld);
        const center=snapshot.segments[index]!.comWorld;com[index]!.position.set(center.x,center.y,center.z);
        const anchor=snapshot.metrics.anchorsWorld[index]!;anchors[index]!.position.set(anchor.x,anchor.y,anchor.z);
      }
      renderer.render(scene,camera);
    },
    resources() {return {geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length??0};},
    destroy():void {
      if(disposed)return;disposed=true;observer.disconnect();
      for(const item of objects) {
        item.geometry.dispose();const materials=Array.isArray(item.material)?item.material:[item.material];
        for(const material of materials)material.dispose();scene.remove(item);
      }
      objects.length=0;grid.geometry.dispose();
      for(const material of Array.isArray(grid.material)?grid.material:[grid.material])material.dispose();
      scene.clear();renderer.dispose();renderer.forceContextLoss();canvas.remove();
    },
  };
}
```

- [ ] **Step 5: Create the complete lab controller.** The fixed step controls physical time; pause clears the fixture queue and the fixed-step accumulator. Handoff while paused changes ownership at the current boundary without advancing any pose. The action explicitly adds a 1.8 N s point impulse matching the bound-arm stress test.

```ts
// game/src/lab/armLab.ts
import './armLab.css';
import {createArmFixture} from '../physics/armFixture.ts';
import type {ArmFixture} from '../physics/armFixture.ts';
import {createFixedStepper} from '../runtime/fixedStep.ts';
import {createArmLabView} from './armLabView.ts';

if(!import.meta.env.DEV)throw new Error('Arm lab is development-only');
document.documentElement.dataset.fixture='ARM_LAB_ONLY';
function element<T extends HTMLElement>(selector:string):T {
  const found=document.querySelector<T>(selector);if(!found)throw new Error(`Missing lab element ${selector}`);return found;
}
function startLab():void {
const host=element<HTMLElement>('#lab-viewport'),view=createArmLabView(host);
const start=element<HTMLButtonElement>('#animate'),pauseButton=element<HTMLButtonElement>('#pause');
const handoffButton=element<HTMLButtonElement>('#handoff'),resetButton=element<HTMLButtonElement>('#reset');
const status=element<HTMLElement>('#lab-status'),tickText=element<HTMLElement>('#tick');
const gap=element<HTMLElement>('#gap'),penetration=element<HTMLElement>('#penetration'),mass=element<HTMLElement>('#mass');
const advance=createFixedStepper(),events=new AbortController();
let arm:ArmFixture|null=null,running=false,loading=false,generation=0,resets=0,created=false;
let graphicsLost=false,lastTime=performance.now(),frameId=0,closed=false;

function pause():void {
  running=false;
  if(arm&&arm.counts().bodies>0)arm.setActive(false);else arm=null;
  advance(0,false,()=>{});lastTime=performance.now();update();
}
function update():void {
  const state=arm?.snapshot();
  start.disabled=loading||!state||running||graphicsLost;
  pauseButton.disabled=loading||!state||!running;
  handoffButton.disabled=loading||!state||state.mode!=='animation'||state.tick<1||graphicsLost;
  resetButton.disabled=loading||graphicsLost;
  start.textContent=state?.mode==='physics'?'Fortsätt fysik':'Starta animation';
  if(loading)status.textContent='Förbereder armprovet…';
  else if(graphicsLost)status.textContent='Grafiken är pausad. Fortsätt när bilden har återställts.';
  else if(state)status.textContent=`${state.mode==='animation'?'Animation äger posen':'Fysik äger posen'} · ${running?'kör':'pausad'}`;
  if(state) {
    tickText.textContent=String(state.tick);gap.textContent=`${(state.metrics.anchorGapM*1000).toFixed(2)} mm`;
    penetration.textContent=`${(state.metrics.penetrationM*1000).toFixed(2)} mm`;mass.textContent=`${state.metrics.massKg.toFixed(2)} kg`;
  }
}
async function reset():Promise<void> {
  pause();const request=++generation;loading=true;arm?.destroy();arm=null;update();
  try {
    const next=await createArmFixture();
    if(request!==generation||closed){next.destroy();return;}
    arm=next;if(created)resets++;created=true;view.render(arm.snapshot());
  }catch(error){if(request===generation)status.textContent=`Armprovet kunde inte starta: ${String(error)}`;}
  finally{if(request===generation){loading=false;update();}}
}
start.addEventListener('click',()=>{
  if(!arm||loading||graphicsLost)return;running=true;arm.setActive(true);lastTime=performance.now();update();
},{signal:events.signal});
pauseButton.addEventListener('click',pause,{signal:events.signal});
handoffButton.addEventListener('click',()=>{
  if(!arm||loading)return;
  const state=arm.snapshot(),center=state.segments[1]!.comWorld;
  try {
    arm.handoff({worldEpoch:state.worldEpoch,atTick:state.tick,impulse:{bodyId:'forearm',
      impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{x:center.x,y:center.y+.02,z:center.z}}});
    view.render(arm.snapshot());update();
  }catch(error){pause();status.textContent=`Överlämningen avbröts: ${String(error)}`;}
},{signal:events.signal});
resetButton.addEventListener('click',()=>void reset(),{signal:events.signal});
window.addEventListener('blur',pause,{signal:events.signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();},{signal:events.signal});
view.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();graphicsLost=true;pause();},{signal:events.signal});
view.canvas.addEventListener('webglcontextrestored',()=>{graphicsLost=false;update();},{signal:events.signal});
window.addEventListener('pagehide',event=>{
  pause();generation++;arm?.destroy();arm=null;
  if(!event.persisted){closed=true;cancelAnimationFrame(frameId);view.destroy();events.abort();delete window.__armLab;}
},{signal:events.signal});
window.addEventListener('pageshow',event=>{if(event.persisted)void reset();},{signal:events.signal});

function frame(now:number):void {
  if(closed)return;const elapsed=(now-lastTime)/1000;lastTime=now;
  try {
    advance(elapsed,running&&!loading&&!graphicsLost,()=>arm?.step());
    if(arm)view.render(arm.snapshot());update();
  }catch(error){running=false;arm?.destroy();arm=null;advance(0,false,()=>{});update();status.textContent=`Armprovet avbröts: ${String(error)}`;}
  frameId=requestAnimationFrame(frame);
}
window.__armLab=()=>arm?{...arm.snapshot(),running,resets,graphicsLost,gpu:view.resources()}:null;
void reset();frameId=requestAnimationFrame(frame);
}
declare global {interface Window {__armLab?:()=>unknown;}}
try {startLab();}catch(error) {
  // WebGL construction occurs before creating a physics world, listeners or RAF loop.
  element<HTMLElement>('#lab-status').textContent=`Grafiken kunde inte starta. Ladda om och försök igen. ${String(error)}`;
  for(const selector of ['#animate','#pause','#handoff','#reset'])element<HTMLButtonElement>(selector).disabled=true;
  const reload=element<HTMLButtonElement>('#reload');reload.hidden=false;
  reload.addEventListener('click',()=>location.reload(),{once:true});
}
```

- [ ] **Step 6: Verify the browser behavior and inspect the real images.** Run `rtk proxy node --test browser/armLab.spec.mjs` and `rtk npm run typecheck`. Expect all four new browser tests and strict checking to pass. Open/view all six actual generated PNGs with the image viewing tool:

  - `game/.playtest/arm-lab-before.png`: two visible bent segments, distinct segment colors, joint/COM markers, readable controls, animation authority and paused status.
  - `game/.playtest/arm-lab-handoff.png`: same fixed camera and same paused pose, physics authority, handoff disabled; no rest-pose snap or hidden mesh.
  - `game/.playtest/arm-lab-contact.png`: physical arm at the wall/floor after running; it remains visible from the camera's negative-X side, with consistent collision-to-visual placement.
  - `game/.playtest/arm-lab-reset.png`: the initial arm restored after ten resets, one canvas, readable controls at 1024×700, no cumulative old meshes.
  - `game/.playtest/arm-lab-context-restored.png`: the actual WebGL context restored, same paused animation pose, visible arm and markers, resources back to baseline, no automatic simulation resume.
  - `game/.playtest/arm-lab-boot-recovered.png`: normal initial rendering after explicit reload from the deliberately injected unavailable-WebGL boot.

If the camera, markers or lighting obscure the arm, adjust only the explicit view/camera code, rerun the four lab browser tests and inspect the new captures. Do not change physical geometry, measured bounds or the main yard to improve an image. Record the final inspected captures and any visible limitations. DOM assertions and screenshot existence do not substitute for seeing the WebGL output. The boot failure is synthetic lifecycle coverage; context loss/restore exercises the real WebGL extension. Neither is a claim that the lab itself has passed real BFCache acceptance.

- [ ] **Step 7: Commit the lab and browser tests.** Run `rtk git add arm-lab.html src/lab/armLab.ts src/lab/armLabView.ts src/lab/armLab.css browser/armLab.spec.mjs`, then `rtk git commit -m "feat: add isolated dev arm inspection lab"`.

## Task 4: Ordered reviews and complete regression handoff

- [ ] **Step 1: Run the combined current native/type gate.** Run `rtk npm run check`. Preserve all original 57 native tests, all added core tests, all 14 adapter tests and all seven arm tests. Record the actual final count from the runner, not an assumed count if the reviewed core added extra tests.
- [ ] **Step 2: Run the normal build and combined browser suite.** Run `rtk npm run build` then `rtk npm run test:browser`. Preserve the original nine browser tests and pass the four lab tests. Confirm the ordinary production output has only the normal entry; the lab remains accessible during `rtk npm run dev` at `/vadstena/arm-lab.html` and is not added to the normal menu.
- [ ] **Step 3: Request the parent's independent spec review, then independent code-quality review.** Required checks include same physical body identities/mass through handoff, actual local COM/bind usage, raw mask/axis controls, correct impulse-work timing, no queue surviving pause/destroy, owner fatal cleanup, exact 1/60 outer step, the explicit arm-only internal budget, collision/view agreement and complete GPU disposal. No extra agent is spawned by the plan-writing worker.
- [ ] **Step 4: Fix material review findings within their owning stage and rerun the relevant tests.** If a physical bound fails, retain the exact failing case and diagnose it. A rendering fix cannot establish solver acceptance; a solver fix cannot establish visible pose acceptance.
- [ ] **Step 5: Report actual outcome and limitations to the parent.** Include changed files, RED/GREEN evidence, maximum anchor/penetration/projected coordinates and energy excess for exact control and animated variation separately, lifecycle/replay results, inspected screenshots, final test counts and local SHAs. Explicitly retain: no full humanoid, anatomical cone, skinning, severing, moving-projectile CCD, normal-yard anatomy Grip, desktop acceptance, distribution or final engine lock.

## Plan self-review map

Task 1 supplies all raw axes, both signs, rotated frames, real unlimited rotation and mask 7/56 translation controls. Task 2 supplies the original exact coupled positive/negative diagnostic, unchanged 5 mm and 0.40 rad gates, the separately gated bent nonidentity-bound moving arm, constant IDs/counts/mass, one transfer/impulse, real wall/ground contacts, dynamic parent, two-axis drive, finite state and measured energy, idempotent destruction, stale queue rejection and same-build 30/60/144 replay with pause clearing. Task 3 supplies a visible dedicated lab using real physical collider poses, actual browser controls, fixed-camera before/after/contact captures backed by observed wall impulses, ten resets, resource checks, actual WebGL loss/restore, labelled synthetic boot-failure recovery and production exclusion. Task 4 preserves the original native/browser gates and ordered independent reviews.

Execution is already authorized. The parent selects the production writer and proceeds after reading this complete plan; no new permission or execution-choice question is required.

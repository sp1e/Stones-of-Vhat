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

test('the exact coupled probe passes at explicit internal budget four with a truly moving unlimited control',context=>{
  const limited=coupledControl(true),unlimited=coupledControl(false);
  context.diagnostic(JSON.stringify({exactControl:{limited,unlimited}}));
  for(const measured of [limited,unlimited]) {
    assert.ok(measured.anchor<=.005,JSON.stringify(measured));assert.ok(measured.penetration<=.005,JSON.stringify(measured));
    assert.ok(measured.wallTicks>100&&measured.wallImpulse>0,JSON.stringify(measured));
    assert.ok(measured.speed<=12&&measured.omega<=50,JSON.stringify(measured));
    assert.ok(measured.energyExcess<=5,JSON.stringify(measured));
  }
  assert.ok(limited.x>.01&&limited.y>.01&&limited.x<=.40&&limited.y<=.40,JSON.stringify(limited));
  assert.ok(unlimited.x>.60&&unlimited.y>.60,JSON.stringify(unlimited));
});

test('default internal budget retains its documented failing anchor control',context=>{
  const control=coupledControl(true,1);
  context.diagnostic(JSON.stringify({defaultBudgetNegativeControl:control}));
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

test('the actual bound arm survives dynamic-parent gravity wall contact and both enabled axes',async context=>{
  assert.equal(typeof api.createArmFixture,'function');const arm=await api.createArmFixture();
  try {
    arm.setActive(true);for(let tick=0;tick<30;tick++)arm.step();
    const before=arm.snapshot(),forearm=before.segments[1];
    arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:{bodyId:'forearm',
      impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{x:forearm.comWorld.x,y:forearm.comWorld.y+.02,z:forearm.comWorld.z}}});
    const initialMechanicalJ=arm.snapshot().metrics.mechanicalJ;
    let wallTicks=0,wallNativeSteps=0,wallImpulse=0;
    const maxima={anchor:0,penetration:0,x:0,y:0,speed:0,omega:0,mechanicalJ:0,energyExcess:0};
    for(let tick=0;tick<600;tick++) {
      arm.step();const state=arm.snapshot();finite(state);
      assert.equal(state.mode,'physics');assert.deepEqual(state.counts,{bodies:4,colliders:4,joints:1});
      assert.ok(Math.abs(state.metrics.massKg-3)<=1e-6);
      assert.equal(state.lastPhysicsStep.samples.length,8);
      wallTicks+=Number(state.lastPhysicsStep.samples.some(sample=>sample.metrics.wallContacts>0));
      for(const sample of state.lastPhysicsStep.samples) {
        const metrics=sample.metrics;
        maxima.anchor=Math.max(maxima.anchor,metrics.anchorGapM);maxima.penetration=Math.max(maxima.penetration,metrics.penetrationM);
        maxima.x=Math.max(maxima.x,Math.abs(metrics.projectedRadXYZ[0]));maxima.y=Math.max(maxima.y,Math.abs(metrics.projectedRadXYZ[1]));
        wallNativeSteps+=Number(metrics.wallContacts>0);wallImpulse+=metrics.wallImpulseNs;
        maxima.speed=Math.max(maxima.speed,metrics.maxSpeedMps);
        maxima.omega=Math.max(maxima.omega,metrics.maxOmegaRadps);
        maxima.mechanicalJ=Math.max(maxima.mechanicalJ,metrics.mechanicalJ);
        maxima.energyExcess=Math.max(maxima.energyExcess,metrics.mechanicalJ-(sample.energyAllowanceJ-5));
        assert.ok(metrics.maxSpeedMps<=12&&metrics.maxOmegaRadps<=50,JSON.stringify(metrics));
        assert.ok(metrics.mechanicalJ<=sample.energyAllowanceJ+1e-6,JSON.stringify(metrics));
      }
    }
    context.diagnostic(JSON.stringify({boundAnimatedVariation:{...maxima,initialMechanicalJ,wallTicks,wallNativeSteps,wallImpulse}}));
    assert.ok(wallTicks>10&&wallImpulse>0,`wall ticks ${wallTicks}, impulse ${wallImpulse}`);
    assert.ok(maxima.anchor<=.005&&maxima.penetration<=.005,JSON.stringify(maxima));
    assert.ok(maxima.x>.01&&maxima.y>.01&&maxima.x<=.40&&maxima.y<=.40,JSON.stringify(maxima));
  }finally{arm.destroy();}
});

function substeppedCoupledControl(limited,nativeSubsteps=4) {
  const world=new R.World({x:0,y:-9.81,z:0});
  world.timestep=dt/nativeSubsteps;
  world.numSolverIterations=8;
  world.maxCcdSubsteps=4;
  try {
    const bodies=[-.2,.2].map(x=>world.createRigidBody(R.RigidBodyDesc.dynamic()
      .setTranslation(x,1.5,0).setLinvel(.6,0,0).setCanSleep(false).setCcdEnabled(true)));
    const colliders=bodies.map((body,index)=>world.createCollider(R.ColliderDesc.cuboid(.2,.045,.045)
      .setMass(index?1:2).setFriction(.5).setRestitution(0),body));
    const floor=world.createCollider(R.ColliderDesc.cuboid(5,.1,5)
      .setTranslation(0,-.1,0).setFriction(.5).setRestitution(0));
    const wall=world.createCollider(R.ColliderDesc.cuboid(.1,10,5)
      .setTranslation(.65,5,0).setFriction(.5).setRestitution(0));
    const frame=q([0,0,1],Math.PI/2);
    const {joint}=createAngularJoint(world,bodies[0],bodies[1],{
      kind:'generic',lockedMask:39,
      frame1:pose({x:.2,y:0,z:0},frame),frame2:pose({x:-.2,y:0,z:0},frame),
      limits:limited?[{axis:3,min:-.35,max:.35},{axis:4,min:-.35,max:.35}]:[],
    });
    const input={world,bodies,colliders,floor,wall,joint};
    // Identical authored initial state, deliberately not stepped/refreshed before
    // its first fractional impulse. Each subdivision count is a distinct control pair.
    const initialMechanicalJ=44.685;
    const peak={anchor:0,penetration:0,x:0,y:0,energyExcess:0,speed:0,omega:0,
      wallTicks:0,wallNativeSteps:0,wallImpulse:0};
    let workBound=0,nativeSteps=0;
    for(let tick=0;tick<600;tick++) {
      const rotation=bodies[0].rotation();
      const frameWorld=new Quaternion(rotation.x,rotation.y,rotation.z,rotation.w)
        .multiply(new Quaternion(frame.x,frame.y,frame.z,frame.w));
      const impulse=new Vector3(.03*(Math.floor(tick/60)%2===0?1:-1),.01*Math.sin(2*tick*dt+1),0)
        .applyQuaternion(frameWorld).multiplyScalar(dt).divideScalar(nativeSubsteps);
      let wallThisOuterTick=false;
      for(let substep=0;substep<nativeSubsteps;substep++) {
        const before=bodies.map(body=>Math.hypot(...Object.values(body.angvel())));
        bodies[1].applyTorqueImpulse(impulse,true);
        bodies[0].applyTorqueImpulse(impulse.clone().negate(),true);
        for(let index=0;index<2;index++) {
          workBound+=impulse.length()*(before[index]+Math.hypot(...Object.values(bodies[index].angvel())))/2;
        }
        world.step();nativeSteps++;
        const current=api.measureArmState(input);finite(current);
        assert.ok(Math.abs(current.massKg-3)<1e-6);
        peak.anchor=Math.max(peak.anchor,current.anchorGapM);
        peak.penetration=Math.max(peak.penetration,current.penetrationM);
        peak.x=Math.max(peak.x,Math.abs(current.projectedRadXYZ[0]));
        peak.y=Math.max(peak.y,Math.abs(current.projectedRadXYZ[1]));
        peak.speed=Math.max(peak.speed,current.maxSpeedMps);
        peak.omega=Math.max(peak.omega,current.maxOmegaRadps);
        peak.energyExcess=Math.max(peak.energyExcess,current.mechanicalJ-initialMechanicalJ-workBound);
        peak.wallNativeSteps+=Number(current.wallContacts>0);
        peak.wallImpulse+=current.wallImpulseNs;
        wallThisOuterTick ||= current.wallContacts>0;
      }
      peak.wallTicks+=Number(wallThisOuterTick);
    }
    assert.equal(nativeSteps,600*nativeSubsteps);
    assert.equal(world.bodies.len(),2);
    assert.equal(world.colliders.len(),4);
    assert.equal(world.impulseJoints.len(),1);
    return peak;
  }finally{world.free();}
}

test('revised four-quarter integrator has matched limited and genuinely moving unlimited controls',context=>{
  const limited=substeppedCoupledControl(true),unlimited=substeppedCoupledControl(false);
  context.diagnostic(JSON.stringify({fourQuarterControls:{limited,unlimited}}));
  for(const measured of [limited,unlimited]) {
    assert.ok(measured.anchor<=.005&&measured.penetration<=.005,JSON.stringify(measured));
    assert.ok(measured.wallTicks>100&&measured.wallImpulse>0,JSON.stringify(measured));
    assert.ok(measured.speed<=12&&measured.omega<=50,JSON.stringify(measured));
    assert.ok(measured.energyExcess<=5,JSON.stringify(measured));
  }
  assert.ok(limited.x>.01&&limited.y>.01&&limited.x<=.40&&limited.y<=.40,JSON.stringify(limited));
  assert.ok(unlimited.x>.60&&unlimited.y>.60,JSON.stringify(unlimited));
});

test('eight-subdivision fallback has matched limited and genuinely moving unlimited controls',context=>{
  const limited=substeppedCoupledControl(true,8),unlimited=substeppedCoupledControl(false,8);
  context.diagnostic(JSON.stringify({eightSubdivisionControls:{limited,unlimited}}));
  for(const measured of [limited,unlimited]) {
    assert.ok(measured.anchor<=.005&&measured.penetration<=.005,JSON.stringify(measured));
    assert.ok(measured.wallTicks>100&&measured.wallImpulse>0,JSON.stringify(measured));
    assert.ok(measured.speed<=12&&measured.omega<=50,JSON.stringify(measured));
    assert.ok(measured.energyExcess<=5,JSON.stringify(measured));
  }
  assert.ok(limited.x>.01&&limited.y>.01&&limited.x<=.40&&limited.y<=.40,JSON.stringify(limited));
  assert.ok(unlimited.x>.60&&unlimited.y>.60,JSON.stringify(unlimited));
});

test('snapshot records and queued effects are detached and one point impulse is never repeated',async()=>{
  const arm=await api.createArmFixture();
  try {
    arm.setActive(true);
    for(let tick=0;tick<30;tick++)arm.step();
    const before=arm.snapshot(),copy=arm.snapshot();
    copy.segments[0].comWorld.x=999;
    copy.segments[0].ref.bodyId='tampered';
    copy.interval.bodies[0].to.colliders[0].shape.size[0]=999;
    copy.metrics.anchorsWorld[0].x=999;
    assert.deepEqual(arm.snapshot(),before);
    assert.doesNotMatch(JSON.stringify(before),/handle/i);
    const com=before.segments[1].comWorld;
    const command={worldEpoch:before.worldEpoch,atTick:before.tick,impulse:{bodyId:'forearm',
      impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{...com,y:com.y+.02}}};
    arm.handoff(command);
    const after=arm.snapshot(),report=after.handoff.report[1];
    vecNear(after.segments[1].comVelocityWorldMps,{...report.comVelocityWorldMps,x:report.comVelocityWorldMps.x+1.8},2e-5);
    assert.ok(Math.hypot(...Object.keys(report.angularVelocityWorldRadps).map(axis=>
      after.segments[1].angularVelocityWorldRadps[axis]-report.angularVelocityWorldRadps[axis]))>.01);
    assert.throws(()=>arm.handoff(command),/already/i);
    assert.equal(arm.queueHandoff(command),false);
    assert.deepEqual(arm.snapshot(),after);
    after.handoff.report[0].comVelocityWorldMps.x=999;
    assert.notEqual(arm.snapshot().handoff.report[0].comVelocityWorldMps.x,999);
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

test('user-controlled handoff phases retain the locked physical gates across one complete animation cycle',async context=>{
  // All authored frequencies repeat together after 4*pi seconds (about754ticks).
  // Cover the cycle at 15-tick intervals, the first/last boundaries, and every
  // exact phase found failing by independent quality review. No phase gating.
  const phases=[...new Set([1,5,26,37,70,264,584,754,755,
    ...Array.from({length:50},(_,index)=>(index+1)*15)])].sort((a,b)=>a-b);
  const failed=[],results=[];
  for(const phase of phases) {
    const arm=await api.createArmFixture();
    try {
      arm.setActive(true);
      for(let tick=0;tick<phase;tick++)arm.step();
      const before=arm.snapshot(),com=before.segments[1].comWorld;
      arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:{bodyId:'forearm',
        impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{...com,y:com.y+.02}}});
      const peak={phase,anchor:0,penetration:0,x:0,y:0,speed:0,omega:0,energyExcess:0,
        wallTicks:0,wallNativeSteps:0,wallImpulse:0};
      for(let tick=0;tick<600;tick++) {
        arm.step();
        const state=arm.snapshot();
        finite(state);
        assert.ok(state.lastPhysicsStep,'completed physics must report every native substep');
        assert.equal(state.lastPhysicsStep.samples.length,8);
        peak.wallTicks+=Number(state.lastPhysicsStep.samples.some(sample=>sample.metrics.wallContacts>0));
        for(const sample of state.lastPhysicsStep.samples) {
          const metrics=sample.metrics;
          assert.ok(Math.abs(metrics.massKg-3)<=1e-6);
          peak.anchor=Math.max(peak.anchor,metrics.anchorGapM);
          peak.penetration=Math.max(peak.penetration,metrics.penetrationM);
          peak.x=Math.max(peak.x,Math.abs(metrics.projectedRadXYZ[0]));
          peak.y=Math.max(peak.y,Math.abs(metrics.projectedRadXYZ[1]));
          peak.speed=Math.max(peak.speed,metrics.maxSpeedMps);
          peak.omega=Math.max(peak.omega,metrics.maxOmegaRadps);
          peak.energyExcess=Math.max(peak.energyExcess,metrics.mechanicalJ-(sample.energyAllowanceJ-5));
          peak.wallNativeSteps+=Number(metrics.wallContacts>0);
          peak.wallImpulse+=metrics.wallImpulseNs;
        }
      }
      results.push(peak);
      if(peak.anchor>.005||peak.penetration>.005||peak.x>.40||peak.y>.40
        ||peak.x<=.01||peak.y<=.01||peak.speed>12||peak.omega>50||peak.energyExcess>5
        ||peak.wallTicks<=10||peak.wallImpulse<=0)failed.push(peak);
    }finally{arm.destroy();}
  }
  const maximum=key=>Math.max(...results.map(result=>result[key]));
  context.diagnostic(JSON.stringify({handoffPhaseSweep:{cases:phases.length,phases,
    anchor:maximum('anchor'),penetration:maximum('penetration'),x:maximum('x'),y:maximum('y'),
    speed:maximum('speed'),omega:maximum('omega'),energyExcess:maximum('energyExcess'),failed}}));
  assert.deepEqual(failed,[],'every sampled user-controlled phase must meet the unchanged gates');
});

test('eight measured native subdivisions publish one detached 60Hz interval and never repeat the point impulse',async()=>{
  const originalStep=R.World.prototype.step,originalImpulse=R.RigidBody.prototype.applyImpulseAtPoint;
  const observed=[];
  let arm;
  let pointImpulses=0;
  try {
    R.World.prototype.step=function(...args){observed.push(this.timestep);return originalStep.apply(this,args);};
    arm=await api.createArmFixture();
    assert.equal(observed.length,1,'bootstrap executes exactly one native step');
    assert.ok(Math.abs(observed[0]-dt)<1e-9);
    assert.equal(arm.snapshot().lastPhysicsStep,null);
    arm.setActive(true);
    for(let tick=0;tick<30;tick++)arm.step();
    assert.equal(observed.length,31,'each animation tick executes one native step');
    for(const nativeDt of observed)assert.ok(Math.abs(nativeDt-dt)<1e-9);
    observed.length=0;
    R.RigidBody.prototype.applyImpulseAtPoint=function(...args){pointImpulses++;return originalImpulse.apply(this,args);};
    const before=arm.snapshot(),com=before.segments[1].comWorld;
    arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:{bodyId:'forearm',
      impulseWorldNs:{x:1.8,y:0,z:0},pointWorld:{...com,y:com.y+.02}}});
    assert.equal(pointImpulses,1);
    arm.step();
    assert.equal(observed.length,8);
    for(const nativeDt of observed)assert.ok(Math.abs(nativeDt-dt/8)<1e-9);
    assert.ok(Math.abs(observed.reduce((sum,value)=>sum+value,0)-dt)<1e-9);
    const after=arm.snapshot();
    assert.equal(after.tick,before.tick+1);
    assert.equal(after.interval.fromTick,before.tick);
    assert.equal(after.interval.toTick,before.tick+1);
    assert.equal(after.interval.dtS,dt);
    assert.equal(after.lastPhysicsStep.nativeSteps,8);
    assert.equal(after.lastPhysicsStep.nativeDtS,dt/8);
    assert.equal(after.lastPhysicsStep.samples.length,8);
    assert.deepEqual(after.lastPhysicsStep.samples[7].metrics,after.metrics);
    after.lastPhysicsStep.samples[0].metrics.anchorsWorld[0].x=999;
    after.lastPhysicsStep.samples[0].energyAllowanceJ=999;
    assert.notEqual(arm.snapshot().lastPhysicsStep.samples[0].metrics.anchorsWorld[0].x,999);
    assert.notEqual(arm.snapshot().lastPhysicsStep.samples[0].energyAllowanceJ,999);
    const initialContacts={...before.contacts};
    for(let tick=0;tick<9;tick++)arm.step();
    assert.equal(pointImpulses,1);
    assert.equal(observed.length,80);
    const final=arm.snapshot();
    assert.ok(final.contacts.wallNativeSteps-initialContacts.wallNativeSteps<=80);
    assert.ok(final.contacts.wallTicks-initialContacts.wallTicks<=10);
    arm.setActive(false);
    const paused=arm.snapshot();
    assert.equal(arm.step(),false);
    assert.deepEqual(arm.snapshot(),paused);
  }finally{
    R.World.prototype.step=originalStep;
    R.RigidBody.prototype.applyImpulseAtPoint=originalImpulse;
    arm?.destroy();
  }
});

test('failure in the third physical native substep invalidates the whole outer batch',async()=>{
  const arm=await api.createArmFixture(),originalStep=R.World.prototype.step;
  try {
    arm.setActive(true);arm.step();arm.step();
    const before=arm.snapshot();
    arm.handoff({worldEpoch:before.worldEpoch,atTick:before.tick,impulse:null});
    let calls=0;
    R.World.prototype.step=function(...args){
      if(++calls===3)throw new Error('injected third native substep failure');
      return originalStep.apply(this,args);
    };
    assert.throws(()=>arm.step(),/third native substep/);
    assert.equal(calls,3);
    assert.deepEqual(arm.counts(),{bodies:0,colliders:0,joints:0});
    assert.throws(()=>arm.snapshot(),/destroyed/i);
    assert.throws(()=>arm.step(),/destroyed/i);
    arm.destroy();
  }finally{R.World.prototype.step=originalStep;arm.destroy();}
});

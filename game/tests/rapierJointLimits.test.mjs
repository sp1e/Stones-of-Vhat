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

test('native frames reject float32 overflow and cross-world bodies before allocating a joint',()=>{
  const world=new R.World(zero),foreign=new R.World(zero);
  try {
    const parent=world.createRigidBody(R.RigidBodyDesc.fixed());
    const child=world.createRigidBody(R.RigidBodyDesc.dynamic());
    const other=foreign.createRigidBody(R.RigidBodyDesc.dynamic());
    const spec={kind:'generic',lockedMask:7,frame1:pose(),frame2:pose(),limits:[]};
    assert.throws(()=>api.createAngularJoint(world,parent,other,spec),/belong.*world/);
    assert.throws(()=>api.createAngularJoint(world,parent,parent,spec),/belong.*world/);
    assert.throws(()=>api.createAngularJoint(world,parent,child,{...spec,frame1:pose({x:1e300,y:0,z:0})}),/float32/);
    assert.equal(world.impulseJoints.len(),0);
  }finally{world.free();foreign.free();}
});

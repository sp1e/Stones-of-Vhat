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

test('registration rejects foreign bodies and colliders even when native handles coincide', async () => {
  await R.init();
  const a = new R.World(zero), b = new R.World(zero);
  try {
    const bodyA = a.createRigidBody(R.RigidBodyDesc.dynamic());
    const colliderA = a.createCollider(R.ColliderDesc.ball(.1), bodyA);
    const bodyB = b.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(9,0,0));
    const colliderB = b.createCollider(R.ColliderDesc.ball(.1), bodyB);
    a.step();b.step();
    assert.equal(bodyA.handle,bodyB.handle); assert.equal(colliderA.handle,colliderB.handle);
    const source = (body,collider) => [{bodyId:'arm',body,colliders:[{colliderId:'shape',collider,role:'blocker',shape:()=>({kind:'ball',radius:.1})}]}];
    assert.throws(()=>api.createBodyMotion(a,source(bodyB,colliderB)),/world|owner/i);
    assert.throws(()=>api.createBodyMotion(a,source(bodyA,colliderB)),/world|owner/i);
    const local = source(bodyA,colliderA)[0];
    assert.throws(()=>api.createBodyMotion(a,[local,{...local,bodyId:'alias'}]),/duplicate|already|alias/i);
    assert.throws(()=>api.createBodyMotion(a,[{...local,colliders:[local.colliders[0],{...local.colliders[0],colliderId:'alias'}]}]),/duplicate|already|alias/i);
    const registrations = source(bodyA,colliderA);
    const registry = api.createBodyMotion(a,registrations);
    const ref = registry.ref('arm');
    registrations[0].body = bodyB;
    registrations[0].colliders[0].collider = colliderB;
    registry.assertRef(ref);
    a.step();registry.completeStep();
    assert.ok(registry.read().bodies[0].to.bodyOriginWorld.position.x < 1);
    registry.destroy();
    assert.equal(a.bodies.len(),1);assert.equal(b.bodies.len(),1);
  } finally {a.free();b.free();}
});

test('nonfinite native endpoint fields cannot replace the last completed publication', async () => {
  await R.init();
  const world = new R.World(zero);
  let registry;
  try {
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic());
    const collider = world.createCollider(R.ColliderDesc.ball(.1).setMass(1),body);
    world.step();
    registry = api.createBodyMotion(world,[{bodyId:'arm',body,colliders:[{colliderId:'shape',collider,role:'blocker',shape:()=>({kind:'ball',radius:.1})}]}]);
    const before = registry.read();
    body.setLinvel({x:Infinity,y:0,z:0},true);
    assert.throws(()=>registry.completeStep(),/finite/i);
    assert.deepEqual(registry.read(),before);
    body.setLinvel(zero,true);
    // These reader faults prove the publication boundary, not engine dynamics.
    for (const field of ['worldCom','localCom','angvel','mass']) {
      const original = body[field];
      try {
        body[field] = () => field === 'mass' ? NaN : {x:NaN,y:0,z:0};
        assert.throws(()=>registry.completeStep(),/finite/i,field);
        assert.deepEqual(registry.read(),before,field);
      } finally {body[field]=original;}
    }
    world.step();registry.completeStep();assert.equal(registry.read().toTick,1);
  } finally {registry?.destroy();world.free();}
});

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

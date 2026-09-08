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
  for (const magnitude of [1e200, 1e-200, Number.MIN_VALUE]) {
    const normalized = api.rigid(pose(zero, {x:magnitude,y:0,z:0,w:magnitude})).rotation;
    assert.ok(Math.abs(Math.hypot(normalized.x, normalized.y, normalized.z, normalized.w)-1) < 1e-14);
    assert.ok(Math.abs(normalized.x-Math.SQRT1_2) < 1e-14);
  }
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
  assert.throws(()=>api.sampledVelocity({...from,tick:Number.MAX_SAFE_INTEGER},{...to,tick:Number.MAX_SAFE_INTEGER+1},zero,dt),/adjacent/i);
  assert.throws(()=>api.sampledVelocity(from,to,{x:1,y:0,z:0},Number.MIN_VALUE),/finite/i);
});

test('exact half-turn omega uses a representation-invariant axis tie break', () => {
  const from = {tick:0,bodyOriginWorld:pose()};
  for (const rotation of [{x:1,y:0,z:0,w:0},{x:0,y:1,z:0,w:0},{x:0,y:0,z:1,w:0}]) {
    const negative = Object.fromEntries(Object.entries(rotation).map(([key,value])=>[key,-value]));
    const a = api.sampledVelocity(from,{tick:1,bodyOriginWorld:pose(zero,rotation)},zero,dt);
    const b = api.sampledVelocity(from,{tick:1,bodyOriginWorld:pose(zero,negative)},zero,dt);
    vecNear(a.angularVelocityWorldRadps,b.angularVelocityWorldRadps);
    assert.ok(Math.abs(Math.hypot(...Object.values(a.angularVelocityWorldRadps))-Math.PI/dt)<1e-6);
  }
});
test('pose authority rejects physical body aliases even when authored references are valid', async () => {
  const R = (await import('@dimforge/rapier3d-compat')).default;
  const {createBodyMotion} = await import('../src/physics/bodyMotion.ts');
  await R.init();
  const world = new R.World(zero);
  let registry;
  try {
    const members = [0,1].map(index=>{
      const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(index,0,0));
      const collider=world.createCollider(R.ColliderDesc.ball(.1).setMass(1),body);
      return {id:String(index),body,collider};
    });
    world.step();
    registry=createBodyMotion(world,members.map(m=>({bodyId:m.id,body:m.body,
      colliders:[{colliderId:'shape',collider:m.collider,role:'blocker',shape:()=>({kind:'ball',radius:.1})}]})));
    const refs=members.map(m=>registry.ref(m.id));
    assert.throws(()=>api.createPoseAuthority([{id:'0',body:members[0].body},{id:'1',body:members[0].body}],
      id=>registry.assertRef(refs[Number(id)]),dt,()=>assert.fail('validation must not invoke fatal cleanup')),/duplicate|alias/i);
    assert.equal(world.bodies.len(),2);assert.ok(members.every(m=>m.body.isKinematic()));
  } finally {registry?.destroy();world.free();}
});

test('pose authority accepts only position-based kinematics at construction and each live operation', async () => {
  const R = (await import('@dimforge/rapier3d-compat')).default;
  await R.init();
  for (const stage of ['constructor','animate','handoff']) {
    const world=new R.World(zero);world.timestep=dt;
    let authority,freed=false,fatalCalls=0;
    try {
      const members=[0,1].map(index=>{
        const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(index,0,0));
        world.createCollider(R.ColliderDesc.ball(.1).setMass(1),body);return {id:String(index),body};
      });
      world.step();
      const states=()=>members.map(({body})=>({type:body.bodyType(),position:{...body.translation()},next:{...body.nextTranslation()},rotation:{...body.rotation()}}));
      const targets=members.map(m=>({id:m.id,bodyOriginWorld:pose({x:Number(m.id)+.1,y:0,z:0})}));
      const onFatal=()=>{fatalCalls++;freed=true;world.free();};
      if (stage!=='constructor') {
        authority=api.createPoseAuthority(members,()=>{},dt,onFatal);authority.capture(0);
        if(stage==='handoff'){authority.animate(1,targets);world.step();authority.capture(1);}
      }
      members[1].body.setBodyType(R.RigidBodyType.KinematicVelocityBased,true);
      const before=states();
      const action=stage==='constructor'?()=>api.createPoseAuthority(members,()=>{},dt,onFatal)
        :stage==='animate'?()=>authority.animate(1,targets):()=>authority.handoff(1);
      assert.throws(action,/position.*kinematic|kinematic.*position/i,stage);
      assert.equal(fatalCalls,0);assert.deepEqual(states(),before);
    } finally {authority?.destroy();if(!freed)world.free();}
  }
});

test('native float32 preflight rejects unrepresentable and derived-overflow inputs before any write', async () => {
  const R = (await import('@dimforge/rapier3d-compat')).default;
  await R.init();
  for (const scenario of ['target', 'targetVelocity', 'impulse', 'point', 'linearProduct', 'angularProduct', 'historyVelocity']) {
    const world = new R.World(zero); world.timestep = dt;
    let freed = false, fatalCalls = 0, authority;
    try {
      const members = [0,1].map(index => {
        const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(index,0,0));
        world.createCollider(R.ColliderDesc.ball(.1).setMass(scenario === 'linearProduct' && index === 1 ? 1e-10 : 1),body);
        return {id:String(index),body};
      });
      world.step();
      authority = api.createPoseAuthority(members,()=>{},dt,()=>{fatalCalls++;freed=true;world.free();});
      authority.capture(0);
      authority.animate(1,members.map(m=>({id:m.id,bodyOriginWorld:pose(m.body.translation())})));
      world.step();authority.capture(1);
      if (scenario === 'historyVelocity') {
        members[1].body.setTranslation({x:1e37,y:0,z:0},true);
        world.step();authority.capture(2);
      }
      const states = () => members.map(({body})=>({type:body.bodyType(),position:{...body.translation()},rotation:{...body.rotation()},
        nextPosition:{...body.nextTranslation()},nextRotation:{...body.nextRotation()},v:{...body.linvel()},w:{...body.angvel()}}));
      const before = states();
      let action;
      if (scenario === 'target' || scenario === 'targetVelocity') {
        action = () => authority.animate(2,[{id:'0',bodyOriginWorld:pose({x:.1,y:0,z:0})},
          {id:'1',bodyOriginWorld:pose({x:scenario === 'target' ? 1e40 : 1e37,y:0,z:0})}]);
      } else {
        const impulse = scenario === 'impulse' ? {x:1e40,y:0,z:0}
          : scenario === 'point' ? zero : {x:1e30,y:0,z:0};
        const point = scenario === 'point' ? {x:0,y:1e40,z:0}
          : scenario === 'angularProduct' ? {x:1,y:1e30,z:0} : {...members[1].body.worldCom()};
        action = () => authority.handoff(scenario === 'historyVelocity' ? 2 : 1,
          scenario === 'historyVelocity' ? undefined : {bodyId:'1',impulseWorldNs:impulse,pointWorld:point});
      }
      assert.throws(action,/float32|representable|overflow/i,scenario);
      assert.equal(fatalCalls,0,scenario);assert.equal(authority.mode(),'animation');assert.deepEqual(states(),before,scenario);
    } finally {authority?.destroy();if(!freed)world.free();}
  }
});

test('silent native pose poisoning is detected and invokes fatal owner teardown', async () => {
  const R = (await import('@dimforge/rapier3d-compat')).default;
  await R.init();
  for (const operation of ['animate','handoff','capture']) {
    const world = new R.World(zero);world.timestep=dt;
    let freed=false,fatalCalls=0,authority;
    try {
      const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
      world.createCollider(R.ColliderDesc.ball(.1).setMass(1),body);world.step();
      authority=api.createPoseAuthority([{id:'arm',body}],()=>{},dt,()=>{fatalCalls++;freed=true;world.free();});
      authority.capture(0);authority.animate(1,[{id:'arm',bodyOriginWorld:pose()}]);world.step();authority.capture(1);
      // Fault injection proves detection/ownership; it is not evidence of native physics correctness.
      if (operation === 'animate') {
        const native = body.setNextKinematicTranslation.bind(body);
        body.setNextKinematicTranslation = value => native({...value,x:Infinity});
        assert.throws(()=>authority.animate(2,[{id:'arm',bodyOriginWorld:pose({x:.1,y:0,z:0})}]),/fatal.*native/i);
      } else if (operation === 'handoff') {
        const native = body.setLinvel.bind(body);
        body.setLinvel = (value,wake) => native({...value,x:Infinity},wake);
        assert.throws(()=>authority.handoff(1),/fatal.*native/i);
      } else {
        // Bypass validated scheduling to reproduce an unexpected poisoned native step.
        body.setNextKinematicTranslation({x:1e38,y:0,z:0});world.step();
        assert.ok(!Number.isFinite(body.linvel().x));
        assert.throws(()=>authority.capture(2),/fatal.*native/i);
      }
      assert.equal(fatalCalls,1);assert.equal(freed,true);assert.equal(authority.mode(),'destroyed');
    } finally {authority?.destroy();if(!freed)world.free();}
  }
});

test('all-member handoff validation fails before any native body mutation',async()=>{
  assert.equal(typeof api.createPoseAuthority,'function');
  const R=(await import('@dimforge/rapier3d-compat')).default;await R.init();
  const world=new R.World(zero);world.timestep=dt;
  let freed=false;const onFatal=()=>{freed=true;world.free();};
  try {
    const bodies=[0,1].map(x=>{
      const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x,2,0));
      world.createCollider(R.ColliderDesc.ball(.1).setTranslation(.15,0,0).setMass(1),body);
      return body;
    });
    world.step();let rejectSecond=false;
    const authority=api.createPoseAuthority(bodies.map((body,index)=>({id:String(index),body})),
      id=>{if(rejectSecond&&id==='1')throw new Error('Stale world reference');},dt,onFatal);
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
  }finally{if(!freed)world.free();}
});


test('ordinary native float32 rotation angles hand off without a false movement error', async () => {
  const R = (await import('@dimforge/rapier3d-compat')).default;
  await R.init();
  const failures = [];
  for (let index=1;index<=40;index++) {
    const radians=index*.025;
    const world = new R.World(zero);world.timestep=dt;
    let freed=false,authority;
    try {
      const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,2,0));
      world.createCollider(R.ColliderDesc.ball(.1).setMass(1).setTranslation(.1,0,0),body);
      world.step();
      authority=api.createPoseAuthority([{id:'arm',body}],()=>{},dt,()=>{freed=true;world.free();});
      authority.capture(0);
      authority.animate(1,[{id:'arm',bodyOriginWorld:pose({x:0,y:2,z:0},q([0,0,1],radians))}]);
      world.step();authority.capture(1);
      const before=pose(body.translation(),body.rotation());
      try {
        const report=authority.handoff(1);
        assert.ok(body.isDynamic());
        poseNear(pose(body.translation(),body.rotation()),before,1e-6,1e-5);
        poseNear(report[0].bodyOriginWorld,before,1e-6,1e-5);
      } catch (error) {failures.push({radians,message:error.message});}
    } finally {authority?.destroy();if(!freed)world.free();}
  }
  assert.deepEqual(failures,[]);
});

test('queued animation targets reject old-boundary transfer until the next capture', async () => {
  assert.equal(typeof api.createPoseAuthority, 'function');
  const R = (await import('@dimforge/rapier3d-compat')).default;
  await R.init();
  const world = new R.World(zero);
  world.timestep = dt;
  let freed = false;
  try {
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    world.createCollider(R.ColliderDesc.ball(.1).setMass(1), body);
    world.step();
    const authority = api.createPoseAuthority([{id: 'arm', body}], () => {}, dt, () => {freed=true;world.free();});
    authority.capture(0);
    authority.animate(1, [{id: 'arm', bodyOriginWorld: pose({x: .1, y: 0, z: 0})}]);
    world.step(); authority.capture(1);
    authority.animate(2, [{id: 'arm', bodyOriginWorld: pose({x: .2, y: 0, z: 0})}]);
    const before = pose(body.translation(), body.rotation());
    assert.throws(() => authority.handoff(1), /queued|pending/i);
    assert.ok(body.isKinematic()); poseNear(pose(body.translation(), body.rotation()), before);
    world.step(); authority.capture(2); authority.handoff(2);
    assert.ok(body.isDynamic());
    authority.destroy();
  } finally {if (!freed) world.free();}
});

test('unexpected native handoff failure invalidates the controller and tears down the owner', async () => {
  assert.equal(typeof api.createPoseAuthority, 'function');
  const R = (await import('@dimforge/rapier3d-compat')).default;
  const {createBodyMotion} = await import('../src/physics/bodyMotion.ts');
  await R.init();
  const world = new R.World(zero); world.timestep = dt;
  let freed = false, fatalCalls = 0;
  let registry, authority;
  try {
    const members = [0, 1].map(index => {
      const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(index, 1, 0));
      const collider = world.createCollider(R.ColliderDesc.ball(.1).setMass(1), body);
      return {id: String(index), body, collider};
    });
    world.step();
    registry = createBodyMotion(world, members.map(m => ({bodyId:m.id, body:m.body,
      colliders:[{colliderId:'shape', collider:m.collider, role:'blocker', shape:()=>({kind:'ball',radius:.1})}]})));
    const refs = members.map(m=>registry.ref(m.id));
    authority = api.createPoseAuthority(members, id=>registry.assertRef(refs[Number(id)]), dt, () => {
      fatalCalls++; registry.destroy(); freed=true; world.free();
    });
    authority.capture(0);
    authority.animate(1,members.map(m=>({id:m.id,bodyOriginWorld:pose({x:Number(m.id),y:1.01,z:0})})));
    world.step(); authority.capture(1);
    // Injection tests failure ownership only; the other integration cases use unmodified native setters.
    members[1].body.setLinvel = () => {throw new Error('Injected native failure');};
    assert.throws(()=>authority.handoff(1), /fatal.*native/i);
    assert.equal(fatalCalls,1); assert.equal(freed,true); assert.equal(authority.mode(),'destroyed');
    assert.throws(()=>registry.read(),/destroyed/i);
    assert.throws(()=>authority.handoff(1),/destroyed/i);
    authority.destroy(); registry.destroy(); assert.equal(fatalCalls,1);
  } finally {authority?.destroy();registry?.destroy();if(!freed)world.free();}
});
test('real offset-COM bound bodies preserve IDs mass pose velocities and apply a point impulse exactly once',async()=>{
  assert.equal(typeof api.createPoseAuthority,'function');
  const R=(await import('@dimforge/rapier3d-compat')).default;
  const {createBodyMotion}=await import('../src/physics/bodyMotion.ts');
  await R.init();
  for(const transfer of [false,true])for(let lifecycle=0;lifecycle<5;lifecycle++) {
    const world=new R.World(zero);world.timestep=dt;
    let registry,authority;
    let freed=false;
    const onFatal=()=>{registry?.destroy();freed=true;world.free();};
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
      authority=api.createPoseAuthority(bodies,id=>registry.assertRef(refs[Number(id)]),dt,onFatal);
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
    }finally{authority?.destroy();registry?.destroy();if(!freed)world.free();}
  }
  // Matched control and impulse runs start from identical actual physical histories.
  const run=async apply=>{
    const world=new R.World(zero);world.timestep=dt;
    let freed=false;
    const onFatal=()=>{freed=true;world.free();};
    try {
      const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,2,0));
      world.createCollider(R.ColliderDesc.ball(.1).setTranslation(.15,0,0).setMass(2),body);
      world.step();const authority=api.createPoseAuthority([{id:'arm',body}],()=>{},dt,onFatal);
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
    }finally{if(!freed)world.free();}
  };
  const control=await run(false),hit=await run(true);
  vecNear({x:hit.after.v.x-control.after.v.x,y:hit.after.v.y-control.after.v.y,z:hit.after.v.z-control.after.v.z},{x:.2,y:0,z:0},2e-5);
  assert.ok(hit.after.w.z<control.after.w.z-1,'off-COM impulse must add angular momentum');
  vecNear(hit.later.v,hit.after.v,2e-5);
});

# Coupled arm/contact diagnostic — 2026-09-08

Status: measured installed-Rapier diagnostic, not full ragdoll acceptance. These probes made no production changes. Each created world was freed in a finally block.

## Question and locked limits

Can a dynamic two-segment arm retain a constrained joint while moving into an actual wall under gravity and two-axis torque?

Preregistered engineering gates: maximum anchor separation **5 mm**, maximum solver-contact penetration **5 mm**, finite state, and limited X/Y projected joint coordinates **0.40 rad** (authored limits ±0.35 rad plus 0.05 diagnostic tolerance). The limits were not raised after failures. Projected quaternion coordinates are diagnostics, **not** anatomical swing/twist or a cone certificate.

Fixture: two 0.4 × 0.09 × 0.09 m cuboids, masses 2 and 1 kg, centers (-0.2,1.5,0)/(0.2,1.5,0), anchors (+0.2,0,0)/(-0.2,0,0), both initial velocity (0.6,0,0), sleep disabled. Local joint frames rotate +90° about Z. Generic mask 39 locks linear XYZ and angular Z; raw axes 3 and 4 limit local X/Y. Connected-body contacts disabled; gravity -9.81 m/s², physical floor and wall, friction 0.5, restitution zero. Wall near face x=0.55 m. Opposed torque on both members, in the moving parent's joint frame: X=±0.03 Nm alternating each second; Y=0.01 sin(2t+1) Nm. Duration 10 s.

Installed dependency: @dimforge/rapier3d-compat 0.20.0. No engine/dependency changes.

## Independent worker controls

| Outer step / solver iterations | Limits | Peak anchor gap mm | Peak penetration mm | Peak projected X / Y rad | Wall-contact ticks | Result |
| --- | --- | ---: | ---: | --- | ---: | --- |
| 1/60 s / 4 | ±0.35 | 20.286 | 0.4207 | 0.364730 / 0.434408 | 571 | FAIL gap and Y |
| 1/60 s / 4 | none | 20.286 | 0.4321 | 1.380083 / 2.368135 | 570 | Moving positive control; FAIL gap |
| 1/120 s / 12 | ±0.35 | 10.014 | 0.0803 | 0.353743 / 0.363988 | 1133 | FAIL gap |
| 1/120 s / 12 | none | 10.014 | 0.0720 | 3.141585 / 3.141587 | 1132 | Moving control; FAIL gap |

The 120 Hz / 12-iteration run was an explicit combined-budget diagnostic after failure, not a replacement for the game's fixed step. Peak total kinetic energy was 33.6074/33.6259 J in the 60 Hz limited/unlimited runs and 33.3595/33.3781 J in the 120 Hz pair. Gravity changes energy, so these peaks are observations, not energy conservation claims. All cases stayed finite.

## Parent reproduction and single-variable controls

The parent independently reproduced the 20.286 mm baseline gap at wall impact (step index 14, four wall contacts, no floor contacts), then varied one setting at a time. All rows below retain the 1/60 s outer step and one world.step() per tick.

| Configuration | Solver iterations | maxCcdSubsteps | Per-body CCD | Limits | Gap mm | Penetration mm | Projected X / Y rad | Wall ticks |
| --- | ---: | ---: | --- | --- | ---: | ---: | --- | ---: |
| Baseline | 4 | 1 | on | ±0.35 | 20.286387 | 0.4207 | 0.364730 / 0.434408 | 571 |
| Iterations only | 12 | 1 | on | ±0.35 | 19.262729 | 0.471954 | 0.374505 / 0.373363 | 566 |
| Internal budget only | 4 | 4 | on | ±0.35 | **0.801046** | **0.649337** | **0.355601 / 0.388103** | **571** |
| CCD disabled control | 4 | 1 | off | ±0.35 | 20.286387 | same baseline | same baseline | 571 |
| Internal budget, CCD off | 4 | 4 | off | ±0.35 | 0.801046 | 0.649337 | 0.355601 / 0.388103 | 571 |
| Matched unlimited | 4 | 4 | on | none | **1.297649** | **0.442064** | **1.642963 / 1.974625** | **566** |

The unlimited case really rotates beyond the limited envelope; the result is not a fully locked joint masquerading as a successful limit. The limited internal-budget case peaks at step 68 with floor and wall contact.

**Narrow decision:** the forthcoming isolated arm fixture may explicitly use maxCcdSubsteps=4 while retaining the 60 Hz authoritative outer step and the original tolerances. Do not alter the normal yard's global settings.

**Cause remains partly unresolved:** disabling per-body CCD did not change either trajectory. Therefore the result does not justify claiming that CCD motion clamping alone caused the failure. Inspection of the installed package sourcemap confirms the JavaScript setter forwards to integrationParameters.maxCcdSubsteps and raw.maxCcdSubsteps; the deeper engine mechanism was not isolated here. A passing fixture is not proof for other mass ratios, arbitrary animation velocities, complete humanoids, anatomical cones or severing.

## Reproduction

Run from game/ with the existing Node 24 / installed dependency, using the project's rtk command prefix. The following is the exact transient parent probe; it prints four controls and frees each world. The subsequent two controls used configurations sub4CcdOff (ccd:false,sub:4) and sub4Unlimited (ccd:true,sub:4,unlimited:true), with the limit loop guarded by if(!cfg.unlimited). No tests are disabled by these diagnostic comparisons.

```js

import R from '@dimforge/rapier3d-compat';
await R.init();
const V=(x=0,y=0,z=0)=>({x,y,z}), Q=(x=0,y=0,z=0,w=1)=>({x,y,z,w});
const mul=(a,b)=>Q(a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z);
const inv=q=>Q(-q.x,-q.y,-q.z,q.w);
const rot=(q,v)=>{const r=mul(mul(q,Q(v.x,v.y,v.z,0)),inv(q));return V(r.x,r.y,r.z)};
const frame=Q(0,0,Math.SQRT1_2,Math.SQRT1_2),a=[V(.2),V(-.2)];
for(const cfg of [{name:'baseline',iters:4,ccd:true,sub:1},{name:'iterations12',iters:12,ccd:true,sub:1},{name:'ccdSubsteps4',iters:4,ccd:true,sub:4},{name:'ccdOffControl',iters:4,ccd:false,sub:1}]){
 const dt=1/60,w=new R.World(V(0,-9.81));w.timestep=dt;w.numSolverIterations=cfg.iters;w.maxCcdSubsteps=cfg.sub;
 try{
 const b=[-.2,.2].map(x=>w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,1.5,0).setLinvel(.6,0,0).setCanSleep(false).setCcdEnabled(cfg.ccd)));
 const c=b.map((body,i)=>w.createCollider(R.ColliderDesc.cuboid(.2,.045,.045).setMass(i?1:2).setFriction(.5).setRestitution(0),body));
 const floor=w.createCollider(R.ColliderDesc.cuboid(5,.1,5).setTranslation(0,-.1,0).setFriction(.5)),wall=w.createCollider(R.ColliderDesc.cuboid(.1,10,5).setTranslation(.65,5,0).setFriction(.5));
 const j=w.createImpulseJoint(R.JointData.generic(a[0],a[1],V(1),39),...b,true);j.setLocalFrame1(a[0],frame);j.setLocalFrame2(a[1],frame);j.setContactsEnabled(false);
 for(const axis of [3,4])w.impulseJoints.raw.jointSetLimits(j.handle,axis,-.35,.35);
 let peak=0,peakStep=0,peakData,penetration=0,wallTicks=0;const angles=[0,0,0];
 for(let step=0;step<600;step++){
 const sign=Math.floor(step/60)%2===0?1:-1,t=rot(mul(b[0].rotation(),frame),V(.03*sign,.01*Math.sin(2*step*dt+1),0));
 b[1].applyTorqueImpulse(V(t.x*dt,t.y*dt,t.z*dt),true);b[0].applyTorqueImpulse(V(-t.x*dt,-t.y*dt,-t.z*dt),true);w.step();
 const p=b.map((body,i)=>{const p=body.translation(),r=rot(body.rotation(),a[i]);return V(p.x+r.x,p.y+r.y,p.z+r.z)});
 const gap=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y,p[0].z-p[1].z);let wt=0,ft=0;
 for(const collider of c)for(const obstacle of [wall,floor])w.contactPair(collider,obstacle,m=>{for(let k=0;k<m.numSolverContacts();k++){penetration=Math.max(penetration,-m.solverContactDist(k));if(obstacle===wall)wt++;else ft++;}});
 if(wt)wallTicks++;
 if(gap>peak){peak=gap;peakStep=step;peakData={anchors:p,positions:b.map(o=>o.translation()),v:b.map(o=>o.linvel()),omega:b.map(o=>o.angvel()),wallContacts:wt,floorContacts:ft};}
 let q=mul(inv(mul(b[0].rotation(),frame)),mul(b[1].rotation(),frame));if(q.w<0)q=Q(-q.x,-q.y,-q.z,-q.w);[q.x,q.y,q.z].forEach((v,i)=>angles[i]=Math.max(angles[i],Math.abs(2*Math.atan2(v,q.w))));
 }
 console.log(JSON.stringify({cfg,anchorPeak:peak,peakStep,peakData,penetration,wallTicks,angles}));
 }finally{w.free();}
}
```

## Separate offset-COM handoff diagnostic

A kinematic body at origin (3,2,1), mass 2 kg and collider-local COM (1,0,0) was rotated by 0.1 rad about Z over 1/60 s without translating the origin. Actual COM moved from (4,2,1) to (3.995004177,2.099833488,1). Endpoint finite difference gives COM velocity (-0.299749374,5.990009308,0) m/s, matching Rapier's kinematic linvel to floating-point precision; omega Z approximately 6 rad/s.

Changing the same body's type to Dynamic and assigning those velocities preserved immediate pose, native handle, 1 body / 1 collider and 2 kg mass. This supports the chosen COM-based transfer implementation, but must still become automated integration coverage with nonidentity bindings, epochs, multiple members and validation failures.

The [Rapier rigid-body guide](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/) supplies background on COM velocity and position-based kinematics. Exact installed 0.20.0 behavior above was measured locally; the guide's version is not used as proof of the raw joint API.

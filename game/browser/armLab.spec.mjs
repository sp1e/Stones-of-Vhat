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

test('paused native inspector changes rendered history only and clears across live resume reset and context recovery',{timeout:60_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfailed',request=>errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  const selectSample=async index=>{
    const range=page.locator('#native-sample');
    await range.focus();await page.keyboard.press('Home');
    for(let step=0;step<index;step++)await page.keyboard.press('ArrowRight');
  };
  const ownerState=state=>({
    tick:state.tick,mode:state.mode,pending:state.pending,running:state.running,
    segments:state.segments,interval:state.interval,
  });
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    assert.equal(await page.locator('#native-sample').count(),1,'native inspector range must exist');
    await page.locator('#native-inspector summary').click();
    assert.equal(await page.locator('#native-sample').isDisabled(),true);
    await page.locator('#animate').click();await page.waitForFunction(()=>window.__armLab().tick>=30);
    await page.locator('#pause').click();await page.locator('#handoff').click();
    const handoff=await page.evaluate(()=>window.__armLab());
    await page.locator('#animate').click();
    await page.waitForFunction(tick=>window.__armLab().tick>=tick+34,handoff.tick);
    await page.locator('#pause').click();await frames(page);
    const before=await page.evaluate(()=>window.__armLab());
    assert.equal(before.running,false);assert.equal(before.pending,false);
    assert.equal(before.interval.nativeTrace.samples.length,9);
    assert.equal(await page.locator('#native-sample').isDisabled(),false);
    const sidebarFits=await page.locator('aside').evaluate(sidebar=>sidebar.scrollHeight<=sidebar.clientHeight+1);
    assert.equal(sidebarFits,true,'expanded native inspector must fit the 1440x900 sidebar');
    const liveBox=await page.locator('#native-live').boundingBox();
    assert.ok(liveBox&&liveBox.y+liveBox.height<=901,'native live control must remain inside the 1440x900 viewport');

    await selectSample(0);await frames(page);
    const first=await page.evaluate(()=>window.__armLab());
    assert.equal(first.inspection.sampleIndex,0);
    assert.match(await page.locator('#inspection-banner').textContent(),/historisk/i);
    assert.deepEqual(ownerState(first),ownerState(before));
    await page.screenshot({path:join(captures,'arm-lab-native-zero.png')});

    await selectSample(4);await frames(page);
    const middle=await page.evaluate(()=>window.__armLab());
    assert.equal(middle.inspection.sampleIndex,4);
    assert.notDeepEqual(middle.inspection.frame.segments,first.inspection.frame.segments);
    assert.deepEqual(ownerState(middle),ownerState(before));
    assert.match(await page.locator('#native-time').textContent(),/4 \/ 8/);
    await page.screenshot({path:join(captures,'arm-lab-native-middle.png')});
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await frames(page);
    const pausedBlur=await page.evaluate(()=>window.__armLab());
    assert.deepEqual(pausedBlur.inspection,middle.inspection);
    assert.deepEqual(ownerState(pausedBlur),ownerState(before));

    await page.locator('#native-live').click();await frames(page);
    assert.equal((await page.evaluate(()=>window.__armLab())).inspection,null);
    await selectSample(2);
    assert.equal((await page.evaluate(()=>window.__armLab())).inspection.sampleIndex,2);
    const resumedAt=await page.evaluate(()=>window.__armLab().tick);
    await page.locator('#animate').click();await page.waitForFunction(tick=>window.__armLab().tick>tick,resumedAt);
    assert.equal((await page.evaluate(()=>window.__armLab())).inspection,null);
    assert.equal(await page.locator('#native-sample').isDisabled(),true);

    await page.locator('#pause').click();await selectSample(3);
    assert.equal((await page.evaluate(()=>window.__armLab())).inspection.sampleIndex,3);
    await page.evaluate(()=>{
      const canvas=document.querySelector('#lab-viewport canvas'),gl=canvas.getContext('webgl2');
      const extension=gl?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WEBGL_lose_context unavailable; native inspector recovery was not exercised');
      window.__restoreArmContext=()=>extension.restoreContext();extension.loseContext();
    });
    await page.waitForFunction(()=>window.__armLab().graphicsLost===true);
    const lost=await page.evaluate(()=>window.__armLab());
    assert.equal(lost.inspection,null);assert.equal(lost.running,false);
    assert.equal(await page.locator('#native-sample').isDisabled(),true);
    await page.evaluate(()=>window.__restoreArmContext());
    await page.waitForFunction(()=>window.__armLab().graphicsLost===false);await frames(page);await frames(page);
    const restored=await page.evaluate(()=>window.__armLab());
    assert.equal(restored.running,false);assert.equal(restored.inspection,null);
    assert.deepEqual(restored.gpu,before.gpu);

    await selectSample(1);assert.equal((await page.evaluate(()=>window.__armLab())).inspection.sampleIndex,1);
    await page.locator('#reset').click();await page.waitForFunction(()=>window.__armLab().tick===0);await frames(page);
    const reset=await page.evaluate(()=>window.__armLab());
    assert.equal(reset.inspection,null);assert.equal(reset.interval.nativeTrace,undefined);
    assert.equal(await page.locator('#native-sample').isDisabled(),true);
    assert.deepEqual(reset.gpu,before.gpu);
    assert.equal(await page.locator('#lab-viewport canvas').count(),1);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

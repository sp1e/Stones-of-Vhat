// game/browser/armLab.spec.mjs
import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
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

test('live Slicer controls cast a real visible contact with mouse and keyboard',{timeout:60_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    assert.equal(await page.locator('#cast-slicer').count(),1);
    assert.equal(await page.locator('#cast-slicer').isDisabled(),true);
    assert.equal(await page.locator('#contact-inspector').getAttribute('open'),null);
    assert.equal(await page.locator('#native-inspector').getAttribute('open'),null);
    assert.match(await page.locator('h1').textContent(),/Skärvprovet/);
    assert.match(await page.locator('.intro').textContent(),/två tekniska segment/i);
    assert.equal(await page.locator('.launch-note').count(),1);
    assert.match(await page.locator('.launch-note').textContent(),/fast.*upprepbart labbkast.*aktuell underarm.*ingen fri sikt/i);
    const disabledCastStyle=await page.locator('#cast-slicer').evaluate(button=>{
      const style=getComputedStyle(button);return {background:style.backgroundColor,color:style.color,cursor:style.cursor};
    });
    await page.locator('#animate').click();
    const enabledCastStyle=await page.locator('#cast-slicer').evaluate(button=>{
      const style=getComputedStyle(button);return {background:style.backgroundColor,color:style.color,cursor:style.cursor};
    });
    assert.notEqual(disabledCastStyle.background,enabledCastStyle.background);
    assert.notEqual(disabledCastStyle.color,enabledCastStyle.color);
    assert.equal(disabledCastStyle.cursor,'default');assert.equal(enabledCastStyle.cursor,'pointer');
    await page.locator('#cast-slicer').click();
    await page.waitForFunction(()=>window.__armLab().slicer.recent.length===1);
    await frames(page);
    const mouse=await page.evaluate(()=>window.__armLab());
    assert.equal(mouse.slicer.recent[0].kind,'hit');
    assert.equal(mouse.slicer.recent[0].blade,'horizontal');
    assert.equal(mouse.slicer.recent[0].selectedCollider.bodyId,'forearm');
    assert.equal(mouse.slicer.recent[0].family.candidates.length,4);
    assert.equal(mouse.slicer.recent[0].family.frontier.length,1);
    assert.equal(mouse.gpu.visible.path,true);
    assert.equal(mouse.gpu.visible.activeBlades,0);
    assert.match(await page.locator('#slicer-status').textContent(),/Senaste kast.*Första träff: underarm/i);
    const firstRead=mouse.slicer.recent;
    await frames(page);
    assert.deepEqual((await page.evaluate(()=>window.__armLab())).slicer.recent,firstRead,'read-only audit must not redeliver events');

    await page.locator('input[value="vertical"]').check();
    await page.locator('#lab-viewport canvas').click({position:{x:20,y:20}});
    await page.keyboard.press('f');
    await page.waitForFunction(id=>window.__armLab().slicer.recent.at(-1)?.serial>id,mouse.slicer.recent[0].serial);
    const keyboard=await page.evaluate(()=>window.__armLab());
    assert.equal(keyboard.slicer.recent.at(-1).blade,'vertical');
    assert.equal(keyboard.slicer.recent.at(-1).kind,'hit');
    assert.notEqual(keyboard.slicer.recent.at(-1).projectileId,mouse.slicer.recent[0].projectileId);

    const accepted=keyboard.slicer.counters.accepted;
    await page.locator('#cast-slicer').focus();
    await page.keyboard.press('f');
    await frames(page);
    assert.equal((await page.evaluate(()=>window.__armLab())).slicer.counters.accepted,accepted,'F on a focused button must not cast');
    await page.screenshot({path:join(captures,'arm-lab-slicer-live.png')});
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('cast status leaves flying state on cancel and preserves only a real prior terminal outcome',{timeout:60_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const status=async()=>page.locator('#slicer-status').evaluate(element=>({
    text:element.textContent,outcome:element.dataset.outcome??'',
  }));
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    await page.locator('#animate').click();
    await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();document.querySelector('#pause').click();
    });
    assert.deepEqual(await status(),{text:'Skärva pausad',outcome:''});
    await page.locator('#animate').click();
    assert.deepEqual(await status(),{text:'Skärva redo',outcome:''});
    await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();window.dispatchEvent(new Event('blur'));
    });
    assert.deepEqual(await status(),{text:'Skärva pausad',outcome:''});

    await page.locator('#animate').click();await page.waitForFunction(()=>window.__armLab().tick>=1);
    await page.locator('#pause').click();await page.locator('#handoff').click();
    assert.deepEqual(await status(),{text:'Skärva pausad',outcome:''});
    await page.locator('#reset').click();await page.waitForFunction(()=>window.__armLab?.()?.resets===1);

    await page.locator('#animate').click();await page.locator('#cast-slicer').click();
    await page.waitForFunction(()=>window.__armLab().slicer.recent.at(-1)?.kind==='hit');
    const completed=await status();assert.match(completed.text,/Första träff: underarm/);assert.equal(completed.outcome,'hit');
    await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();document.querySelector('#pause').click();
    });
    assert.deepEqual(await status(),completed);
    await page.locator('#animate').click();assert.deepEqual(await status(),completed);
    await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();window.dispatchEvent(new Event('blur'));
    });
    assert.deepEqual(await status(),completed);
    await page.locator('#handoff').click();assert.deepEqual(await status(),completed);
    await page.locator('#animate').click();assert.deepEqual(await status(),completed);

    await page.evaluate(()=>{
      const canvas=document.querySelector('#lab-viewport canvas'),gl=canvas.getContext('webgl2');
      const extension=gl?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WEBGL_lose_context unavailable; status invalidation was not exercised');
      window.__restoreArmContext=()=>extension.restoreContext();extension.loseContext();
    });
    await page.waitForFunction(()=>window.__armLab().graphicsLost===true);
    assert.deepEqual(await status(),{text:'Skärva pausad',outcome:''});
    await page.evaluate(()=>window.__restoreArmContext());
    await page.waitForFunction(()=>window.__armLab().graphicsLost===false);
    assert.deepEqual(await status(),{text:'Skärva pausad',outcome:''});
    await page.locator('#animate').click();assert.deepEqual(await status(),{text:'Skärva redo',outcome:''});
  }finally{await context.close();}
});

test('paused contact inspection shows the retained model pose and can return to native or live pose',{timeout:60_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const owner=state=>({tick:state.tick,mode:state.mode,segments:state.segments,interval:state.interval});
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    await page.locator('#animate').click();await page.locator('#cast-slicer').click();
    await page.waitForFunction(()=>window.__armLab().slicer.recent.at(-1)?.kind==='hit');
    await page.locator('#pause').click();
    const before=await page.evaluate(()=>window.__armLab());
    await page.locator('#contact-inspector summary').click();
    assert.equal(await page.locator('#native-inspector').getAttribute('open'),null);
    await page.locator('#inspect-contact').click();await frames(page);
    const inspected=await page.evaluate(()=>window.__armLab());
    assert.equal(inspected.running,false);
    assert.deepEqual(owner(inspected),owner(before));
    assert.equal(inspected.inspection,null);
    assert.equal(inspected.selectedContact.record.kind,'hit');
    assert.equal(inspected.selectedContact.frame.source,'completed-owner-contact-motion');
    assert.equal(inspected.selectedContact.frame.offsetS,inspected.selectedContact.record.terminalOffsetS);
    assert.deepEqual(inspected.selectedContact.record.terminalPosition,
      inspected.selectedContact.record.family.hit.geometry.projectileWorld.position);
    assert.equal(inspected.gpu.visible.inspectionBlade,true);
    assert.equal(inspected.gpu.visible.path,true);
    assert.equal(inspected.gpu.visible.witnesses,2);
    assert.equal(inspected.gpu.visible.normal,true);
    assert.match(await page.locator('#inspection-banner').textContent(),/Kontaktmodell.*härledd/i);
    assert.equal(await page.locator('#native-sample').isDisabled(),false,'native range must be able to replace contact selection');
    assert.equal(await page.locator('#native-live').isDisabled(),false,'live-pose control must escape contact selection');
    await page.screenshot({path:join(captures,'arm-lab-slicer-contact.png')});

    await page.locator('#native-inspector summary').click();
    assert.equal(await page.locator('#contact-inspector').getAttribute('open'),null);
    const range=page.locator('#native-sample');await range.fill('0');await frames(page);
    const native=await page.evaluate(()=>window.__armLab());
    assert.equal(native.selectedContact,null);assert.equal(native.inspection.sampleIndex,0);
    assert.equal(native.gpu.visible.inspectionBlade,false);
    await page.locator('#native-live').click();await frames(page);
    const live=await page.evaluate(()=>window.__armLab());
    assert.equal(live.selectedContact,null);assert.equal(live.inspection,null);assert.equal(live.running,false);

    await page.locator('#contact-inspector summary').click();await page.locator('#inspect-contact').click();
    assert.ok((await page.evaluate(()=>window.__armLab())).selectedContact);
    await page.locator('#animate').click();
    await page.waitForFunction(()=>window.__armLab().running===true);
    assert.equal((await page.evaluate(()=>window.__armLab())).selectedContact,null);
  } finally { await context.close(); }
});

test('rapid casts, pause and blur cancellation, and physical handoff retain honest controller state',{timeout:60_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{
    let now=0,nextId=1,scheduled=false;const queued=new Map();
    Object.defineProperty(performance,'now',{value:()=>now});
    const schedule=()=>{
      if(scheduled)return;scheduled=true;
      setTimeout(()=>{
        scheduled=false;now+=1000/60;
        const callbacks=Array.from(queued.values());queued.clear();
        for(const callback of callbacks)callback(now);
        if(queued.size)schedule();
      },1);
    };
    window.requestAnimationFrame=callback=>{const id=nextId++;queued.set(id,callback);schedule();return id;};
    window.cancelAnimationFrame=id=>queued.delete(id);
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const clickAtTick=(tick,selectors,startSelector=null)=>page.evaluate(({tick,selectors,startSelector})=>new Promise((resolve,reject)=>{
    const probe=()=>{
      const state=window.__armLab();
      if(state.tick>tick){reject(new Error(`missed authoritative tick ${tick}; reached ${state.tick}`));return;}
      if(state.tick===tick){
        for(const selector of selectors)document.querySelector(selector).click();
        resolve(window.__armLab());return;
      }
      requestAnimationFrame(probe);
    };
    if(startSelector)requestAnimationFrame(()=>{
      document.querySelector(startSelector).click();
      probe();
    });
    else probe();
  }),{tick,selectors,startSelector});
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    const boundary=await clickAtTick(30,['#pause','#handoff','#animate','#cast-slicer'],'#animate');
    assert.equal(boundary.mode,'physics');assert.equal(boundary.slicer.queued[0].birthTick,30);
    await page.waitForFunction(()=>window.__armLab().slicer.recent.length===1);
    const physical=await page.evaluate(()=>window.__armLab());
    assert.equal(physical.mode,'physics');assert.equal(physical.slicer.recent[0].kind,'hit');
    assert.equal(physical.slicer.recent[0].birthTick,30);assert.equal(physical.slicer.recent[0].selectedCollider.bodyId,'forearm');

    await page.locator('#pause').click();await page.locator('#reset').click();
    await page.waitForFunction(()=>window.__armLab?.()?.resets===1);
    const uncertainBirth=57;
    const uncertainQueued=await clickAtTick(uncertainBirth,['#pause','#handoff','#animate','#cast-slicer'],'#animate');
    assert.equal(uncertainQueued.tick,uncertainBirth);assert.equal(uncertainQueued.mode,'physics');
    assert.equal(uncertainQueued.slicer.queued[0].birthTick,uncertainBirth);
    assert.equal(uncertainQueued.slicer.queued[0].blade,'horizontal');
    await page.waitForFunction(()=>window.__armLab().slicer.recent.length===1);
    const uncertain=(await page.evaluate(()=>window.__armLab())).slicer.recent.at(-1);
    assert.equal(uncertain.birthTick,uncertainBirth);
    assert.equal(uncertain.family.identity.fromTick,uncertain.birthTick+uncertain.ageTicks-1);
    assert.equal(uncertain.family.identity.toTick,uncertain.family.identity.fromTick+1);
    assert.ok(['hit','unresolved'].includes(uncertain.kind));
    if(uncertain.kind==='unresolved') {
      assert.equal(uncertain.family.frontier[0].bodyId,'forearm');
      assert.equal(uncertain.family.candidates.find(candidate=>candidate.identity.target.bodyId==='forearm').reason,'width');
    } else assert.equal(uncertain.selectedCollider.bodyId,'forearm');
    await writeFile(join(captures,'arm-lab-slicer-physical-57.json'),JSON.stringify({
      queuedBoundary:uncertainQueued,
      terminal:{
        kind:uncertain.kind,blade:uncertain.blade,birthTick:uncertain.birthTick,ageTicks:uncertain.ageTicks,
        snapshot:uncertain.snapshot,family:uncertain.family,
      },
    },null,2));

    const afterUncertain=await page.evaluate(()=>window.__armLab());
    const accepted=afterUncertain.slicer.counters.accepted,recent=afterUncertain.slicer.recent.length;
    await page.locator('#cast-slicer').click({clickCount:2,delay:0});
    await page.waitForFunction(value=>window.__armLab().slicer.counters.accepted>=value,accepted+2);
    await page.waitForFunction(value=>window.__armLab().slicer.recent.length>=value,recent+2);
    const rapid=await page.evaluate(()=>window.__armLab());
    const pair=rapid.slicer.recent.slice(-2);
    assert.equal(pair[0].birthTick,pair[1].birthTick);
    assert.notEqual(pair[0].projectileId,pair[1].projectileId);
    assert.notEqual(pair[0].castId,pair[1].castId);

    const beforePause=rapid.slicer.counters;
    await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();
      document.querySelector('#pause').click();
    });
    const paused=await page.evaluate(()=>window.__armLab());
    assert.equal(paused.running,false);assert.equal(paused.slicer.active.length,0);assert.equal(paused.slicer.queued.length,0);
    assert.ok(paused.slicer.counters.cancelled>=beforePause.cancelled+1);
    assert.equal(paused.slicer.recent.length,rapid.slicer.recent.length,'cancellation is not a miss or terminal result');

    await page.locator('#animate').click();
    await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();
      window.dispatchEvent(new Event('blur'));
    });
    const blurred=await page.evaluate(()=>window.__armLab());
    assert.equal(blurred.running,false);assert.equal(blurred.slicer.active.length,0);assert.equal(blurred.slicer.queued.length,0);
    assert.ok(blurred.slicer.counters.cancelled>=paused.slicer.counters.cancelled+1);
    assert.deepEqual(errors,[]);
  } finally { await context.close(); }
});

test('critical PC controls and normal playfield retain the approved bounds at both target sizes',{timeout:45_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    for(const [width,height,name] of [[1440,900,'1440'],[1024,700,'1024']]) {
      await page.setViewportSize({width,height});await frames(page);
      const layout=await page.evaluate(selectors=>{
        const rect=selector=>{
          const box=document.querySelector(selector).getBoundingClientRect();
          return {left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height};
        };
        return {sidebar:rect('aside'),playfield:rect('#lab-viewport'),controls:selectors.map(rect)};
      },['#cast-slicer','#animate','#pause','#reset','.launch-note']);
      assert.ok(layout.sidebar.width<=width*.25+1,`${name} sidebar must occupy at most 25%`);
      assert.ok(layout.playfield.width>=width*.75-1,`${name} normal area must occupy at least 75%`);
      for(const control of layout.controls) {
        assert.ok(control.width>0&&control.height>0&&control.left>=0&&control.top>=0);
        assert.ok(control.right<=width+1&&control.bottom<=height+1,`${name} critical control must remain visible`);
      }
      await page.screenshot({path:join(captures,`arm-lab-slicer-ready-${name}.png`)});
    }
  }finally{await context.close();}
});

test('loading context loss invalidates the stale async pair and restores one paused fresh owner',{timeout:60_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{
    const originalInstantiate=WebAssembly.instantiate.bind(WebAssembly);
    const originalStreaming=WebAssembly.instantiateStreaming?.bind(WebAssembly);
    let release;const gate=new Promise(resolve=>{release=resolve;});let blocked=true;
    const wait=()=>{if(!blocked)return Promise.resolve();blocked=false;return gate;};
    WebAssembly.instantiate=(...args)=>wait().then(()=>originalInstantiate(...args));
    if(originalStreaming)WebAssembly.instantiateStreaming=(...args)=>wait().then(()=>originalStreaming(...args));
    window.__releaseArmWasm=()=>release();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.locator('#lab-viewport canvas').waitFor();
    assert.equal(await page.locator('#cast-slicer').isDisabled(),true);
    await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>window.__armLab?.()??null),null);
    await page.evaluate(()=>{
      const canvas=document.querySelector('#lab-viewport canvas'),gl=canvas.getContext('webgl2');
      const extension=gl?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WEBGL_lose_context unavailable; loading lifecycle was not exercised');
      window.__restoreArmContext=()=>extension.restoreContext();extension.loseContext();
    });
    await page.waitForFunction(()=>/Grafiken är pausad/.test(document.querySelector('#lab-status').textContent));
    await page.evaluate(()=>window.__releaseArmWasm());await frames(page);
    assert.equal(await page.evaluate(()=>window.__armLab?.()??null),null,'stale loading owner must not publish while lost');
    await page.evaluate(()=>window.__restoreArmContext());
    await page.waitForFunction(()=>window.__armLab?.()!=null);await frames(page);
    const restored=await page.evaluate(()=>window.__armLab());
    assert.equal(restored.loading,false);assert.equal(restored.running,false);assert.equal(restored.tick,0);
    assert.equal(restored.slicer.counters.accepted,0);assert.equal(restored.slicer.recent.length,0);
    assert.equal(await page.locator('#lab-viewport canvas').count(),1);
    assert.equal(await page.locator('#animate').isDisabled(),false);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});

test('BFCache pagehide disposal returns as one paused fresh lab without stale casts',{timeout:60_000},async()=>{
  let cacheBrowser,context;
  try {
    cacheBrowser=await chromium.launch({channel:'chromium',headless:true,ignoreDefaultArgs:['--disable-back-forward-cache'],args:['--enable-unsafe-swiftshader']});
    context=await cacheBrowser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(()=>{
      window.addEventListener('pagehide',event=>sessionStorage.setItem('arm-lab-pagehide-persisted',String(event.persisted)));
      window.addEventListener('pageshow',event=>sessionStorage.setItem('arm-lab-pageshow-persisted',String(event.persisted)));
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const cdp=await context.newCDPSession(page),notUsed=[];
    cdp.on('Page.backForwardCacheNotUsed',event=>notUsed.push(event));await cdp.send('Page.enable');
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    await page.locator('#animate').click();await page.locator('#cast-slicer').click();
    await page.waitForFunction(()=>window.__armLab().slicer.recent.length===1);
    await page.goto('http://127.0.0.1:4178/vadstena/');
    await page.goBack({waitUntil:'commit'});
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    const lifecycle=await page.evaluate(()=>({
      pagehide:sessionStorage.getItem('arm-lab-pagehide-persisted'),
      pageshow:sessionStorage.getItem('arm-lab-pageshow-persisted'),
    }));
    assert.deepEqual(lifecycle,{pagehide:'true',pageshow:'true'},JSON.stringify(notUsed));
    const restored=await page.evaluate(()=>window.__armLab());
    assert.equal(restored.tick,0);assert.equal(restored.running,false);assert.equal(restored.resets,1);
    assert.equal(restored.slicer.recent.length,0);assert.equal(restored.slicer.active.length,0);assert.equal(restored.slicer.queued.length,0);
    assert.equal(await page.locator('#lab-viewport canvas').count(),1);assert.deepEqual(errors,[]);
  }finally{await context?.close();await cacheBrowser?.close();}
});

test('warmed active path and contact rendering remain bounded through ten reset and cast cycles',{timeout:90_000},async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const castAndInspect=async()=>{
    await page.locator('#animate').click();
    const launched=await page.evaluate(()=>{
      document.querySelector('#cast-slicer').click();
      return window.__armLab();
    });
    assert.equal(launched.presentation.length,1);
    assert.equal(launched.gpu.visible.activeBlades,1,'accepted boundary-born cast must render before its first fixed step');
    await page.waitForFunction(()=>window.__armLab().slicer.recent.length===1);
    await page.locator('#pause').click();
    if(await page.locator('#contact-inspector').getAttribute('open')===null)await page.locator('#contact-inspector summary').click();
    await page.locator('#inspect-contact').click();await frames(page);
    const inspected=await page.evaluate(()=>window.__armLab());
    assert.equal(inspected.selectedContact.record.kind,'hit');
    assert.equal(inspected.gpu.visible.activeBlades,0);assert.equal(inspected.gpu.visible.path,true);
    assert.equal(inspected.gpu.visible.inspectionBlade,true);assert.equal(inspected.gpu.visible.witnesses,2);
    assert.equal(inspected.gpu.visible.normal,true);
    return inspected.gpu;
  };
  try {
    await page.goto('http://127.0.0.1:4178/vadstena/arm-lab.html');
    await page.waitForFunction(()=>window.__armLab?.()!=null);
    const warmed=await castAndInspect();
    for(let count=1;count<=10;count++) {
      await page.locator('#reset').click();
      await page.waitForFunction(expected=>window.__armLab?.()?.resets===expected,count);
      const reset=await page.evaluate(()=>window.__armLab());
      assert.equal(reset.slicer.recent.length,0);assert.equal(reset.selectedContact,null);
      assert.equal(await page.locator('#lab-viewport canvas').count(),1);
      assert.deepEqual(await castAndInspect(),warmed,`GPU resources grew after warmed reset/cast cycle ${count}`);
    }
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
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
    await page.locator('#cast-slicer').click();
    await page.waitForFunction(()=>window.__armLab().slicer.recent.length===1);
    const beforeLoss=await page.evaluate(()=>window.__armLab());
    await page.evaluate(()=>{
      const canvas=document.querySelector('#lab-viewport canvas'),gl=canvas.getContext('webgl2');
      const extension=gl?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WEBGL_lose_context unavailable; lifecycle test was not exercised');
      window.__restoreArmContext=()=>extension.restoreContext();extension.loseContext();
    });
    await page.waitForFunction(()=>window.__armLab().graphicsLost===true);
    const lost=await page.evaluate(()=>window.__armLab());assert.equal(lost.running,false);assert.equal(lost.pending,false);
    assert.equal(lost.worldEpoch,beforeLoss.worldEpoch);assert.ok(lost.tick>=beforeLoss.tick);
    assert.equal(lost.slicer.recent.length,0);assert.equal(lost.slicer.active.length,0);assert.equal(lost.slicer.queued.length,0);
    assert.notEqual(lost.slicer.generation,beforeLoss.slicer.generation);
    for(const selector of ['#animate','#pause','#handoff','#reset'])assert.equal(await page.locator(selector).isDisabled(),true);
    await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__armLab().tick),lost.tick);
    await page.evaluate(()=>window.__restoreArmContext());
    await page.waitForFunction(()=>window.__armLab().graphicsLost===false);await frames(page);await frames(page);
    const restored=await page.evaluate(()=>window.__armLab());
    assert.equal(restored.tick,lost.tick);assert.equal(restored.worldEpoch,lost.worldEpoch);
    assert.equal(restored.running,false);assert.equal(restored.pending,false);
    assert.equal(restored.slicer.recent.length,0);assert.equal(restored.slicer.generation,lost.slicer.generation);
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

import './armLab.css';
import { createArmFixture } from '../physics/armFixture.ts';
import type { ArmFixture } from '../physics/armFixture.ts';
import { createFixedStepper } from '../runtime/fixedStep.ts';
import { armTraceFrame } from './armLabTrace.ts';
import { createArmLabView } from './armLabView.ts';

if (!import.meta.env.DEV) throw new Error('Arm lab is development-only');
document.documentElement.dataset.fixture = 'ARM_LAB_ONLY';

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing lab element ${selector}`);
  return found;
}

function startLab(): void {
  // Create WebGL before physics, listeners or RAF so unavailable graphics fails cleanly.
  const host = element<HTMLElement>('#lab-viewport'), view = createArmLabView(host);
  const start = element<HTMLButtonElement>('#animate'), pauseButton = element<HTMLButtonElement>('#pause');
  const handoffButton = element<HTMLButtonElement>('#handoff'), resetButton = element<HTMLButtonElement>('#reset');
  const status = element<HTMLElement>('#lab-status'), tickText = element<HTMLElement>('#tick');
  const gap = element<HTMLElement>('#gap'), penetration = element<HTMLElement>('#penetration');
  const mass = element<HTMLElement>('#mass');
  const nativeSample = element<HTMLInputElement>('#native-sample');
  const nativeTime = element<HTMLElement>('#native-time'), nativeLive = element<HTMLButtonElement>('#native-live');
  const inspectionBanner = element<HTMLElement>('#inspection-banner');
  const advance = createFixedStepper(), events = new AbortController();
  let arm: ArmFixture | null = null;
  let sampleIndex: number | null = null;
  let running = false, loading = false, generation = 0, resets = 0, created = false;
  let graphicsLost = false, lastTime = performance.now(), frameId = 0, closed = false;

  function clearInspection(): void {
    sampleIndex = null;
  }

  function pause(): void {
    running = false;
    if (arm && arm.counts().bodies > 0) arm.setActive(false);
    else arm = null;
    advance(0, false, () => {});
    lastTime = performance.now();
    update();
  }

  function update(): void {
    const state = arm?.snapshot();
    start.disabled = loading || !state || running || graphicsLost;
    pauseButton.disabled = loading || !state || !running;
    handoffButton.disabled = loading || !state || state.mode !== 'animation' || state.tick < 1 || graphicsLost;
    resetButton.disabled = loading || graphicsLost;
    start.textContent = state?.mode === 'physics' ? 'Fortsätt fysik' : 'Starta animation';
    if (loading) status.textContent = 'Förbereder armprovet…';
    else if (graphicsLost) status.textContent = 'Grafiken är pausad. Fortsätt när bilden har återställts.';
    else if (state) {
      status.textContent = `${state.mode === 'animation' ? 'Animation äger posen' : 'Fysik äger posen'} · ${running ? 'kör' : 'pausad'}`;
    }
    if (state) {
      tickText.textContent = String(state.tick);
      gap.textContent = `${(state.metrics.anchorGapM * 1000).toFixed(2)} mm`;
      penetration.textContent = `${(state.metrics.penetrationM * 1000).toFixed(2)} mm`;
      mass.textContent = `${state.metrics.massKg.toFixed(2)} kg`;
    }
    const trace = state?.interval.nativeTrace;
    const available = !!trace && !running && !loading && !graphicsLost;
    if (!available) clearInspection();
    const lastSample = trace ? trace.samples.length - 1 : 0;
    nativeSample.disabled = !available;
    nativeSample.max = String(lastSample);
    nativeSample.value = String(sampleIndex ?? lastSample);
    nativeLive.disabled = sampleIndex === null;
    inspectionBanner.hidden = sampleIndex === null;
    if (trace && state) {
      const index = sampleIndex ?? lastSample;
      const offsetS = trace.samples[index]!.offsetS;
      const label = `Delsteg ${index} / ${lastSample} · t = ${(state.interval.fromTick * state.interval.dtS + offsetS).toFixed(6)} s · +${(offsetS * 1000).toFixed(3)} ms`;
      nativeTime.textContent = `${sampleIndex === null ? 'Aktuell pose. Inspelning:' : 'Historisk inspektion:'} ${label}`;
      inspectionBanner.textContent = sampleIndex === null
        ? 'Ingen färdig inspelning.'
        : `Historisk inspektion: ${label}. Fysiken är pausad. Kropp / animationsram / collider visas med axellängd 12 / 18 / 24 cm.`;
    } else {
      nativeTime.textContent = 'Ingen färdig inspelning.';
      inspectionBanner.textContent = 'Ingen färdig inspelning.';
    }
  }

  async function reset(): Promise<void> {
    clearInspection();
    pause();
    const request = ++generation;
    loading = true;
    arm?.destroy();
    arm = null;
    update();
    try {
      const next = await createArmFixture();
      if (request !== generation || closed) {
        next.destroy();
        return;
      }
      arm = next;
      if (created) resets++;
      created = true;
      view.render(arm.snapshot());
    } catch (error) {
      if (request === generation) status.textContent = `Armprovet kunde inte starta: ${String(error)}`;
    } finally {
      if (request === generation) {
        loading = false;
        update();
      }
    }
  }

  start.addEventListener('click', () => {
    if (!arm || loading || graphicsLost) return;
    clearInspection();
    running = true;
    arm.setActive(true);
    lastTime = performance.now();
    update();
  }, { signal: events.signal });
  pauseButton.addEventListener('click', pause, { signal: events.signal });
  handoffButton.addEventListener('click', () => {
    if (!arm || loading) return;
    clearInspection();
    const state = arm.snapshot(), center = state.segments[1]!.comWorld;
    try {
      arm.handoff({
        worldEpoch: state.worldEpoch, atTick: state.tick,
        impulse: {
          bodyId: 'forearm', impulseWorldNs: { x: 1.8, y: 0, z: 0 },
          pointWorld: { x: center.x, y: center.y + .02, z: center.z },
        },
      });
      view.render(arm.snapshot());
      update();
    } catch (error) {
      pause();
      status.textContent = `Överlämningen avbröts: ${String(error)}`;
    }
  }, { signal: events.signal });
  resetButton.addEventListener('click', () => void reset(), { signal: events.signal });
  nativeSample.addEventListener('input', () => {
    if (!arm || running || loading || graphicsLost) return;
    const state = arm.snapshot(), index = Number(nativeSample.value);
    if (!Number.isInteger(index) || !state.interval.nativeTrace?.samples[index]) return;
    sampleIndex = index;
    view.render(state, index);
    update();
  }, { signal: events.signal });
  nativeLive.addEventListener('click', () => {
    clearInspection();
    if (arm) view.render(arm.snapshot());
    update();
  }, { signal: events.signal });

  window.addEventListener('blur', pause, { signal: events.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  }, { signal: events.signal });
  view.canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    clearInspection();
    graphicsLost = true;
    pause();
  }, { signal: events.signal });
  view.canvas.addEventListener('webglcontextrestored', () => {
    graphicsLost = false;
    update();
  }, { signal: events.signal });
  window.addEventListener('pagehide', event => {
    clearInspection();
    pause();
    generation++;
    arm?.destroy();
    arm = null;
    if (!event.persisted) {
      closed = true;
      cancelAnimationFrame(frameId);
      view.destroy();
      events.abort();
      delete window.__armLab;
    }
  }, { signal: events.signal });
  window.addEventListener('pageshow', event => {
    if (event.persisted) void reset();
  }, { signal: events.signal });

  function frame(now: number): void {
    if (closed) return;
    const elapsed = (now - lastTime) / 1000;
    lastTime = now;
    try {
      advance(elapsed, running && !loading && !graphicsLost, () => arm?.step());
      if (arm) view.render(arm.snapshot(), sampleIndex);
      update();
    } catch (error) {
      running = false;
      arm?.destroy();
      arm = null;
      advance(0, false, () => {});
      update();
      status.textContent = `Armprovet avbröts: ${String(error)}`;
    }
    frameId = requestAnimationFrame(frame);
  }
  window.__armLab = () => {
    if (!arm) return null;
    const snapshot = arm.snapshot();
    return {
      ...snapshot, running, resets, graphicsLost, gpu: view.resources(),
      inspection: sampleIndex === null ? null : { sampleIndex, frame: armTraceFrame(snapshot, sampleIndex) },
    };
  };
  void reset();
  frameId = requestAnimationFrame(frame);
}

declare global { interface Window { __armLab?: () => unknown; } }
try {
  startLab();
} catch (error) {
  element<HTMLElement>('#lab-status').textContent =
    `Grafiken kunde inte starta. Ladda om och försök igen. ${String(error)}`;
  for (const selector of ['#animate', '#pause', '#handoff', '#reset', '#native-live']) {
    element<HTMLButtonElement>(selector).disabled = true;
  }
  const reload = element<HTMLButtonElement>('#reload');
  reload.hidden = false;
  reload.addEventListener('click', () => location.reload(), { once: true });
}

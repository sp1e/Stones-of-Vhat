import './armLab.css';
import { createArmFixture } from '../physics/armFixture.ts';
import type { ArmFixture } from '../physics/armFixture.ts';
import { createFixedStepper, FIXED_DT } from '../runtime/fixedStep.ts';
import { armTraceFrame } from './armLabTrace.ts';
import { armContactFrame } from './armContactFrame.ts';
import {
  ARM_SLICER_LIMITS,
  createArmSlicer,
  type ArmSlicer,
  type ArmSlicerBlade,
  type ArmSlicerTerminalRecord,
} from './armSlicer.ts';
import { createArmLabView, type ArmLabSpell } from './armLabView.ts';

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
  const castButton = element<HTMLButtonElement>('#cast-slicer');
  const bladeInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="slicer-blade"]'));
  const status = element<HTMLElement>('#lab-status'), slicerStatus = element<HTMLElement>('#slicer-status');
  const tickText = element<HTMLElement>('#tick'), gap = element<HTMLElement>('#gap');
  const penetration = element<HTMLElement>('#penetration'), mass = element<HTMLElement>('#mass');
  const nativeSample = element<HTMLInputElement>('#native-sample');
  const nativeTime = element<HTMLElement>('#native-time'), nativeLive = element<HTMLButtonElement>('#native-live');
  const nativeInspector = element<HTMLDetailsElement>('#native-inspector');
  const contactInspector = element<HTMLDetailsElement>('#contact-inspector');
  const inspectContact = element<HTMLButtonElement>('#inspect-contact');
  const contactTime = element<HTMLElement>('#contact-time'), contactFamily = element<HTMLElement>('#contact-family');
  const inspectionBanner = element<HTMLElement>('#inspection-banner');
  const advance = createFixedStepper(), events = new AbortController();
  let arm: ArmFixture | null = null, slicer: ArmSlicer | null = null;
  let sampleIndex: number | null = null;
  let selectedContact: { frame: ReturnType<typeof armContactFrame>; record: ArmSlicerTerminalRecord } | null = null;
  let lastRecord: ArmSlicerTerminalRecord | null = null;
  let running = false, loading = false, generation = 0, resets = 0, created = false;
  let graphicsLost = false, lastTime = performance.now(), frameId = 0, closed = false;
  const presentation = new Map<string, ArmLabSpell & {
    startPosition: { x: number; y: number; z: number };
    velocityMps: { x: number; y: number; z: number };
  }>();

  function selectedBlade(): ArmSlicerBlade {
    return bladeInputs.find(input => input.checked)?.value === 'vertical' ? 'vertical' : 'horizontal';
  }

  function clearSelections(): void {
    sampleIndex = null;
    selectedContact = null;
  }

  function clearPresentation(clearLast = false): void {
    presentation.clear();
    if (clearLast) lastRecord = null;
  }

  function renderView(): void {
    if (!arm) return;
    view.render(arm.snapshot(), {
      nativeSampleIndex: sampleIndex,
      activeSlicers: Array.from(presentation.values()),
      lastCast: selectedContact ? null : lastRecord,
      contactInspection: selectedContact,
    });
  }

  function pause(): void {
    running = false;
    if (slicer) slicer.cancel();
    clearPresentation(false);
    if (arm && arm.counts().bodies > 0) arm.setActive(false);
    else {
      arm = null;
      slicer = null;
    }
    advance(0, false, () => {});
    lastTime = performance.now();
    syncSlicerStatus();
    update();
  }

  function outcomeText(record: ArmSlicerTerminalRecord): string {
    switch (record.kind) {
      case 'hit': return `Senaste kast · Första träff: ${record.selectedCollider?.bodyId === 'forearm' ? 'underarm' : record.selectedCollider?.bodyId ?? 'okänd blockerare'}`;
      case 'blocked': return 'Senaste kast · Kastets start är blockerad';
      case 'unresolved': return 'Senaste kast · Kontakten kunde inte avgöras';
      case 'expired': return 'Senaste kast · Ingen kontakt inom provsträckan';
    }
  }

  function syncSlicerStatus(): void {
    if (lastRecord) {
      slicerStatus.dataset.outcome = lastRecord.kind;
      slicerStatus.textContent = outcomeText(lastRecord);
      return;
    }
    slicerStatus.dataset.outcome = '';
    slicerStatus.textContent = running ? 'Skärva redo' : 'Skärva pausad';
  }

  function publishTerminal(record: ArmSlicerTerminalRecord): void {
    presentation.delete(record.projectileId);
    lastRecord = structuredClone(record);
    slicerStatus.dataset.outcome = record.kind;
    slicerStatus.textContent = outcomeText(record);
  }

  function update(): void {
    const state = arm?.snapshot();
    const ready = !!state && !!slicer;
    start.disabled = loading || !ready || running || graphicsLost;
    pauseButton.disabled = loading || !ready || !running;
    handoffButton.disabled = loading || !ready || state.mode !== 'animation' || state.tick < 1 || graphicsLost;
    resetButton.disabled = loading || graphicsLost;
    castButton.disabled = loading || !ready || !running || graphicsLost;
    for (const input of bladeInputs) input.disabled = loading || !ready || graphicsLost;
    inspectContact.disabled = loading || !ready || !lastRecord || graphicsLost;
    start.textContent = state?.mode === 'physics' ? 'Fortsätt fysik' : 'Starta animation';
    if (loading) status.textContent = 'Förbereder armprovet…';
    else if (graphicsLost) status.textContent = 'Grafiken är pausad. Provet återställs säkert när bilden är tillbaka.';
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
    const nativeAvailable = !!trace && !running && !loading && !graphicsLost;
    const lastSample = trace ? trace.samples.length - 1 : 0;
    nativeSample.disabled = !nativeAvailable;
    nativeSample.max = String(lastSample);
    nativeSample.value = String(sampleIndex ?? lastSample);
    nativeLive.disabled = sampleIndex === null && !selectedContact;
    if (trace && state) {
      const index = sampleIndex ?? lastSample;
      const offsetS = trace.samples[index]!.offsetS;
      const label = `Delsteg ${index} / ${lastSample} · t = ${(state.interval.fromTick * state.interval.dtS + offsetS).toFixed(6)} s · +${(offsetS * 1000).toFixed(3)} ms`;
      nativeTime.textContent = `${sampleIndex === null ? 'Aktuell pose. Inspelning:' : 'Historisk inspektion:'} ${label}`;
    } else nativeTime.textContent = 'Ingen färdig inspelning.';

    if (lastRecord) {
      contactTime.textContent = `${outcomeText(lastRecord)} · ${(lastRecord.elapsedS * 1000).toFixed(3)} ms · ålder ${lastRecord.ageTicks}`;
      contactFamily.textContent = `${lastRecord.family.candidates.length} blockerare · ${lastRecord.family.queriedCount} frågade · ${lastRecord.family.unqueriedCount} ofrågade`;
    } else {
      contactTime.textContent = 'Ingen avslutad skärva.';
      contactFamily.textContent = 'Kandidatfronten visas efter ett avslutat prov.';
    }

    inspectionBanner.hidden = sampleIndex === null && !selectedContact;
    if (selectedContact) {
      inspectionBanner.textContent = `Kontaktmodell: +${(selectedContact.record.terminalOffsetS * 1000).toFixed(3)} ms. Fysiken är pausad; visningen är härledd och återställer inte ägaren.`;
    } else if (sampleIndex !== null && trace && state) {
      const offsetS = trace.samples[sampleIndex]!.offsetS;
      inspectionBanner.textContent = `Historisk native-inspektion: delsteg ${sampleIndex} / ${lastSample} · +${(offsetS * 1000).toFixed(3)} ms. Fysiken är pausad.`;
    }
  }

  async function reset(): Promise<void> {
    clearSelections();
    slicer?.destroy();
    slicer = null;
    arm?.destroy();
    arm = null;
    running = false;
    clearPresentation(true);
    advance(0, false, () => {});
    const request = ++generation;
    loading = true;
    slicerStatus.dataset.outcome = '';
    slicerStatus.textContent = 'Skärva redo';
    update();
    let nextArm: ArmFixture | null = null, nextSlicer: ArmSlicer | null = null;
    try {
      nextArm = await createArmFixture();
      nextSlicer = await createArmSlicer(nextArm);
      if (request !== generation || closed || graphicsLost) {
        nextSlicer.destroy();
        nextArm.destroy();
        return;
      }
      arm = nextArm;
      slicer = nextSlicer;
      nextArm = null;
      nextSlicer = null;
      if (created) resets++;
      created = true;
      renderView();
    } catch (error) {
      nextSlicer?.destroy();
      nextArm?.destroy();
      if (request === generation) {
        status.textContent = `Armprovet kunde inte starta: ${String(error)}`;
        slicerStatus.textContent = 'Kontaktprovet avbröts – återställ';
      }
    } finally {
      if (request === generation) {
        loading = false;
        update();
      }
    }
  }

  function startRunning(): void {
    if (!arm || !slicer || loading || graphicsLost) return;
    clearSelections();
    slicer.cancel();
    clearPresentation(false);
    running = true;
    arm.setActive(true);
    lastTime = performance.now();
    syncSlicerStatus();
    update();
  }

  function cast(): void {
    if (!arm || !slicer || loading || graphicsLost || !running) return;
    const state = arm.snapshot();
    const forearm = state.segments.find(segment => segment.ref.bodyId === 'forearm');
    if (!forearm) throw new Error('Armprovet saknar underarmssegment');
    const center = forearm.colliderWorld.position;
    const command = {
      blade: selectedBlade(),
      startPosition: { x: center.x, y: center.y, z: center.z + .6 },
      velocityMps: { x: 0, y: 0, z: -ARM_SLICER_LIMITS.defaultSpeedMps },
      lifetimeTicks: ARM_SLICER_LIMITS.maxLifetimeTicks,
    };
    const identity = slicer.enqueue(command);
    if (!identity) return;
    presentation.set(identity.projectileId, {
      castId: identity.castId,
      projectileId: identity.projectileId,
      blade: command.blade,
      position: { ...command.startPosition },
      startPosition: { ...command.startPosition },
      velocityMps: { ...command.velocityMps },
    });
    slicerStatus.dataset.outcome = 'flying';
    slicerStatus.textContent = 'Kast på väg';
    renderView();
  }

  start.addEventListener('click', startRunning, { signal: events.signal });
  pauseButton.addEventListener('click', pause, { signal: events.signal });
  castButton.addEventListener('click', cast, { signal: events.signal });
  window.addEventListener('keydown', event => {
    if (event.code !== 'KeyF' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.matches('input,select,button,[contenteditable="true"]') || target.isContentEditable)) return;
    event.preventDefault();
    cast();
  }, { signal: events.signal });
  handoffButton.addEventListener('click', () => {
    if (!arm || !slicer || loading || graphicsLost) return;
    clearSelections();
    slicer.cancel();
    clearPresentation(false);
    const state = arm.snapshot(), center = state.segments[1]!.comWorld;
    try {
      arm.handoff({
        worldEpoch: state.worldEpoch, atTick: state.tick,
        impulse: {
          bodyId: 'forearm', impulseWorldNs: { x: 1.8, y: 0, z: 0 },
          pointWorld: { x: center.x, y: center.y + .02, z: center.z },
        },
      });
      syncSlicerStatus();
      renderView();
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
    selectedContact = null;
    sampleIndex = index;
    renderView();
    update();
  }, { signal: events.signal });
  nativeLive.addEventListener('click', () => {
    clearSelections();
    renderView();
    update();
  }, { signal: events.signal });
  inspectContact.addEventListener('click', () => {
    if (!arm || !lastRecord || loading || graphicsLost) return;
    pause();
    sampleIndex = null;
    try {
      const record = structuredClone(lastRecord);
      selectedContact = { record, frame: armContactFrame(record.snapshot, record.terminalOffsetS) };
      renderView();
      update();
    } catch (error) {
      selectedContact = null;
      slicerStatus.textContent = `Kontaktinspektionen avbröts: ${String(error)}`;
      update();
    }
  }, { signal: events.signal });
  nativeInspector.addEventListener('toggle', () => {
    if (nativeInspector.open) contactInspector.open = false;
  }, { signal: events.signal });
  contactInspector.addEventListener('toggle', () => {
    if (contactInspector.open) nativeInspector.open = false;
  }, { signal: events.signal });

  window.addEventListener('blur', pause, { signal: events.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  }, { signal: events.signal });
  view.canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    clearSelections();
    graphicsLost = true;
    if (loading) {
      generation++;
      loading = false;
    }
    running = false;
    slicer?.clearHistory();
    clearPresentation(true);
    syncSlicerStatus();
    if (arm && arm.counts().bodies > 0) arm.setActive(false);
    advance(0, false, () => {});
    lastTime = performance.now();
    update();
  }, { signal: events.signal });
  view.canvas.addEventListener('webglcontextrestored', () => {
    graphicsLost = false;
    if (!arm && !loading) void reset();
    else update();
  }, { signal: events.signal });
  window.addEventListener('pagehide', event => {
    clearSelections();
    running = false;
    generation++;
    loading = false;
    slicer?.destroy();
    slicer = null;
    arm?.destroy();
    arm = null;
    clearPresentation(true);
    advance(0, false, () => {});
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
      advance(elapsed, running && !loading && !graphicsLost, () => {
        if (!slicer?.step()) return;
        for (const spell of presentation.values()) {
          spell.position.x += spell.velocityMps.x * FIXED_DT;
          spell.position.y += spell.velocityMps.y * FIXED_DT;
          spell.position.z += spell.velocityMps.z * FIXED_DT;
        }
        for (const terminal of slicer.drainEvents()) publishTerminal(terminal);
      });
      renderView();
      update();
    } catch (error) {
      running = false;
      generation++;
      slicer?.destroy();
      slicer = null;
      arm?.destroy();
      arm = null;
      clearSelections();
      clearPresentation(true);
      advance(0, false, () => {});
      update();
      status.textContent = `Armprovet avbröts: ${String(error)}`;
      slicerStatus.textContent = 'Kontaktprovet avbröts – återställ';
    }
    frameId = requestAnimationFrame(frame);
  }
  window.__armLab = () => {
    if (!arm || !slicer) return null;
    const snapshot = arm.snapshot();
    return {
      ...snapshot,
      running,
      loading,
      resets,
      graphicsLost,
      gpu: view.resources(),
      slicer: slicer.read(),
      presentation: structuredClone(Array.from(presentation.values())),
      selectedContact: structuredClone(selectedContact),
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
  for (const selector of ['#animate', '#pause', '#handoff', '#reset', '#cast-slicer', '#native-live', '#inspect-contact']) {
    element<HTMLButtonElement>(selector).disabled = true;
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="slicer-blade"]')) input.disabled = true;
  const reload = element<HTMLButtonElement>('#reload');
  reload.hidden = false;
  reload.addEventListener('click', () => location.reload(), { once: true });
}

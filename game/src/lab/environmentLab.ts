import './environmentLab.css';
import { PROVENANCE, buildEnvironment } from '../content/environment/index.ts';
import type { Environment, EvidenceClass, PhaseLayer, TowerHypothesis } from '../content/environment/index.ts';
import { createBrowserInput } from '../input/browserInput.ts';
import { createYard } from '../physics/yard.ts';
import type { Yard } from '../physics/yard.ts';
import { createEnvironmentView } from '../render/environment/view.ts';
import { createFixedStepper } from '../runtime/fixedStep.ts';

if (!import.meta.env.DEV) throw new Error('Environment lab is development-only');
document.documentElement.dataset.fixture = 'ENVIRONMENT_LAB_ONLY';

declare global { interface Window { __environmentLab?: () => unknown } }

const LANDMARKS = new Set(['radhuset', 'st-per', 'vadstena-slott', 'marten-skinnares-hus', 'klosterkyrkan']);
const EVIDENCE: Readonly<Record<EvidenceClass, string>> = { documented: 'belagt', interpretation: 'tolkning', 'gameplay-invention': 'spelpåhitt', measured: 'uppmätt' };
const LAYER: Readonly<Record<PhaseLayer, string>> = { 'baseline-1510': 'grundfas 1510', 'later-phase': 'senare fas, visas inte', 'time-fracture': 'tidsbrott, visas inte' };
const MESSAGES = {
  loading: 'Stråket byggs …',
  ready: 'Klart. Klicka för att låsa muspekaren och gå in.',
  paused: 'Pausad. Klicka för att fortsätta.',
  lockRejected: 'Kunde inte låsa muspekaren. Tillåt muslås i webbläsaren och försök igen.',
  graphicsLost: 'Grafiken tappades. Simuleringen står still tills bilden är återställd.',
  graphicsRestored: 'Grafiken är återställd. Klicka för att fortsätta.',
  worldFailed: 'Miljöprovet kunde inte startas. Ladda om sidan.',
  frameFailed: 'Miljöprovet avbröts av ett fel. Ladda om sidan.',
  bootFailed: 'Grafiken kunde inte starta. Ladda om och försök igen.',
} as const;

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing lab element ${selector}`);
  return found;
}

function fillPanels(environment: Environment, spawn: HTMLSelectElement, list: HTMLElement): void {
  for (const checkpoint of environment.checkpoints) spawn.add(new Option(checkpoint.label, checkpoint.id));
  for (const record of PROVENANCE.filter((candidate) => LANDMARKS.has(candidate.objectId))) {
    const item = document.createElement('li'), title = document.createElement('strong');
    title.textContent = `${record.objectId} / ${record.componentId}`;
    item.append(title, ` — ${LAYER[record.phase.layer]}, ${EVIDENCE[record.evidenceClass]}: ${record.uncertainty}`);
    list.append(item);
  }
}

function startLab(): void {
  // WebGL first: without it there must be no physics world, listeners or frame loop.
  const host = element<HTMLElement>('#environment-viewport');
  const view = createEnvironmentView(host);
  const panel = element<HTMLElement>('#panel'), status = element<HTMLElement>('#status'), crosshair = element<HTMLElement>('#crosshair');
  const start = element<HTMLButtonElement>('#start'), restart = element<HTMLButtonElement>('#restart'), reload = element<HTMLButtonElement>('#reload');
  const spawnSelect = element<HTMLSelectElement>('#spawn'), towerSelect = element<HTMLSelectElement>('#tower'), zoneLabel = element<HTMLElement>('#zone');
  const events = new AbortController(), listen = { signal: events.signal };
  const input = createBrowserInput(() => pause());
  let yard: Yard | null = null, environment: Environment | null = null, advance = createFixedStepper();
  let tick = 0, restarts = 0, generation = 0, frameId = 0, lastTime = performance.now();
  let busy = true, running = false, graphicsLost = false, failed = false, closed = false, resumedNeedsStep = true;
  let spawnId = 'radhus-approach', tower: TowerHypothesis = 'partial', zone = '';

  function updateControls(): void {
    const blocked = busy || failed || graphicsLost;
    start.disabled = blocked;
    restart.disabled = blocked;
    spawnSelect.disabled = busy || failed;
    towerSelect.disabled = busy || failed;
  }
  function showPanel(message: string): void {
    panel.hidden = false;
    crosshair.hidden = true;
    status.textContent = message;
    updateControls();
  }
  /** One precedence for every idle message, so a late restart cannot overwrite a failure or a lost context. */
  function idleMessage(settled: string): string {
    if (failed) return status.textContent ?? '';
    if (graphicsLost) return MESSAGES.graphicsLost;
    return busy ? MESSAGES.loading : settled;
  }
  function pause(exitLock = true): void {
    running = false;
    input.setActive(false);
    advance(0, false, () => undefined);
    showPanel(idleMessage(MESSAGES.paused));
    if (exitLock && document.pointerLockElement === view.canvas) document.exitPointerLock();
  }
  /** Terminal: only reload recovers, so stop the frame loop and release the owned world and renderer now. */
  function fail(message: string): void {
    if (closed || failed) return;
    failed = true;
    busy = false;
    pause();
    status.textContent = message;
    reload.hidden = false;
    updateControls();
    generation += 1;
    cancelAnimationFrame(frameId);
    events.abort();
    input.dispose();
    yard?.destroy();
    yard = null;
    view.dispose();
  }
  async function replaceWorld(initial: boolean): Promise<void> {
    if (closed || failed || graphicsLost || (busy && !initial)) return;
    const request = ++generation;
    busy = true;
    pause();
    spawnId = spawnSelect.value || spawnId;
    tower = towerSelect.value === 'complete' ? 'complete' : 'partial';
    try {
      const next = buildEnvironment({ towerHypothesis: tower });
      const checkpoint = next.checkpoints.find((candidate) => candidate.id === spawnId) ?? next.checkpoints[0];
      if (!checkpoint) throw new Error('Environment has no checkpoints');
      const fresh = await createYard({ layout: next.bodies, spawn: checkpoint.position });
      if (closed || failed || request !== generation) { fresh.destroy(); return; }
      yard?.destroy();
      yard = fresh;
      environment = next;
      view.setEnvironment(next);
      advance = createFixedStepper();
      tick = 0;
      input.resetLook();
      if (!initial) restarts += 1;
      busy = false;
      showPanel(idleMessage(MESSAGES.ready));
    } catch {
      if (request === generation) fail(MESSAGES.worldFailed);
    }
  }
  async function requestPlay(): Promise<void> {
    if (closed || failed || busy || graphicsLost || document.hidden) return;
    try {
      await view.canvas.requestPointerLock();
    } catch {
      // The answer can arrive after a failure, teardown or context loss; never let it replace those messages.
      if (closed || failed) return;
      running = false;
      input.setActive(false);
      showPanel(idleMessage(MESSAGES.lockRejected));
    }
  }
  function nearestZone(x: number, z: number): string {
    let best = 'Mellan platserna', distance = 10;
    for (const checkpoint of environment?.checkpoints ?? []) {
      const d = Math.hypot(checkpoint.position.x - x, checkpoint.position.z - z);
      if (d < distance) { distance = d; best = checkpoint.label; }
    }
    return best;
  }
  function dispose(): void {
    if (closed) return;
    closed = true;
    generation += 1;
    running = false;
    cancelAnimationFrame(frameId);
    events.abort();
    input.dispose();
    yard?.destroy();
    yard = null;
    view.dispose();
    delete window.__environmentLab;
  }

  function frame(now: number): void {
    if (closed || failed) return;
    const elapsed = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    if (yard && !graphicsLost && !failed) {
      try {
        const active = running && !busy;
        const result = advance(elapsed, active, () => yard?.step(input.sample()));
        tick = result.tick;
        if (active && result.steps > 0) resumedNeedsStep = false;
        const snapshot = yard.snapshot(), look = input.look();
        view.render(snapshot, active && !resumedNeedsStep ? result.alpha : 1, look.yaw, look.pitch);
        const nextZone = nearestZone(snapshot.player.position.x, snapshot.player.position.z);
        if (nextZone !== zone) { zone = nextZone; zoneLabel.textContent = zone; }
      } catch {
        fail(MESSAGES.frameFailed);
        return;
      }
    }
    frameId = requestAnimationFrame(frame);
  }

  start.addEventListener('click', () => { void requestPlay(); }, listen);
  restart.addEventListener('click', () => { void replaceWorld(false); }, listen);
  // Not tied to `events`: a terminal failure aborts every other listener but reload must keep working.
  reload.addEventListener('click', () => window.location.reload(), { once: true });
  window.addEventListener('blur', () => pause(), listen);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, listen);
  document.addEventListener('pointerlockerror', () => { if (!running) showPanel(idleMessage(MESSAGES.lockRejected)); }, listen);
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === view.canvas && !busy && !failed && !graphicsLost && !closed && !document.hidden) {
      running = true;
      input.setActive(true);
      lastTime = performance.now();
      resumedNeedsStep = true;
      panel.hidden = true;
      crosshair.hidden = false;
    } else pause(false);
  }, listen);
  view.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    graphicsLost = true;
    pause();
  }, listen);
  view.canvas.addEventListener('webglcontextrestored', () => {
    graphicsLost = false;
    if (!failed) showPanel(MESSAGES.graphicsRestored);
  }, listen);
  window.addEventListener('pagehide', dispose, listen);
  window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });

  window.__environmentLab = () => {
    const snapshot = yard?.snapshot();
    return {
      running, busy, graphicsLost, failed, listening: !events.signal.aborted, tick, restarts, spawnId, towerHypothesis: tower, zone,
      position: snapshot?.player.position ?? { x: 0, y: 0, z: 0 }, grounded: snapshot?.player.grounded ?? false,
      look: input.look(), counts: yard?.counts() ?? { bodies: 0, colliders: 0 },
      bodyIds: environment?.bodies.map((body) => body.id) ?? [], gpu: view.diagnostics(),
    };
  };
  fillPanels(buildEnvironment(), spawnSelect, element<HTMLElement>('#provenance-list'));
  showPanel(MESSAGES.loading);
  frameId = requestAnimationFrame(frame);
  void replaceWorld(true);
}

try {
  startLab();
} catch {
  element<HTMLElement>('#status').textContent = MESSAGES.bootFailed;
  element<HTMLButtonElement>('#start').disabled = true;
  element<HTMLButtonElement>('#restart').disabled = true;
  const reload = element<HTMLButtonElement>('#reload');
  reload.hidden = false;
  reload.addEventListener('click', () => window.location.reload(), { once: true });
}

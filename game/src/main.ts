import './style.css';
import { createBrowserInput } from './input/browserInput.ts';
import { createYard } from './physics/yard.ts';
import type { Yard } from './physics/yard.ts';
import { createYardView } from './render/yardView.ts';
import type { YardView } from './render/yardView.ts';
import { createFixedStepper } from './runtime/fixedStep.ts';
import { createPreferenceStore } from './settings/preferenceStore.ts';

type Diagnostics = { running: boolean; tick: number; restarts: number; position: { x: number; y: number; z: number }; counts: { bodies: number; colliders: number }; gpu: { geometries: number; textures: number; programs: number } };
declare global { interface Window { __yard?: () => Diagnostics; } }

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Sidan saknar ${selector}.`);
  return element;
}

const host = requireElement<HTMLElement>('#viewport');
const panel = requireElement<HTMLElement>('#panel');
const crosshair = requireElement<HTMLElement>('#crosshair');
const status = requireElement<HTMLElement>('#status');
const storageStatus = requireElement<HTMLElement>('#storage-status');
const startButton = requireElement<HTMLButtonElement>('#start');
const restartButton = requireElement<HTMLButtonElement>('#restart');
const reloadButton = requireElement<HTMLButtonElement>('#reload');
const goreCheckbox = requireElement<HTMLInputElement>('#gore');

const preferences = createPreferenceStore(() => window.localStorage);
const initialPreference = preferences.read();
goreCheckbox.checked = initialPreference.value.goreEnabled;
if (initialPreference.status === 'unavailable') storageStatus.textContent = 'Lokal lagring är inte tillgänglig. Valet gäller bara den här sessionen.';
else if (initialPreference.status === 'invalid') storageStatus.textContent = 'Den sparade inställningen kunde inte läsas. Standardvärdet används.';

let yard: Yard | undefined;
let view: YardView | undefined;
let input: ReturnType<typeof createBrowserInput> | undefined;
let advance = createFixedStepper();
let tick = 0;
let restarts = 0;
let generation = 0;
let busy = true;
let running = false;
let failed = false;
let disposed = false;
let resumedNeedsStep = true;
let frameId = 0;
let lastTimestamp = performance.now();
const lifecycle = new AbortController();

function setButtonsEnabled(enabled: boolean): void { startButton.disabled = !enabled; restartButton.disabled = !enabled; }
function showPausedPanel(message = 'Pausad. Klicka för att återvända till gården.'): void {
  panel.hidden = false;
  crosshair.hidden = true;
  if (!busy && !failed) status.textContent = message;
}
function pause(exitLock = true): void {
  running = false;
  input?.setActive(false);
  tick = advance(0, false, () => undefined).tick;
  showPausedPanel();
  if (exitLock && document.pointerLockElement === view?.canvas) document.exitPointerLock();
}
function fail(message: string): void {
  if (disposed || failed) return;
  failed = true;
  busy = false;
  pause();
  status.textContent = message;
  setButtonsEnabled(false);
  reloadButton.hidden = false;
  cancelAnimationFrame(frameId);
}
function renderFrame(timestamp: number): void {
  if (disposed || failed) return;
  const elapsed = Math.max(0, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;
  if (yard && view && input) {
    const result = advance(elapsed, running, () => yard?.step(input?.sample() ?? { right: 0, forward: 0, yaw: 0, sprint: false, crouch: false, jump: false }));
    tick = result.tick;
    if (running && result.steps > 0) resumedNeedsStep = false;
    const look = input.look();
    view.render(yard.snapshot(), running && !resumedNeedsStep ? result.alpha : 1, look.yaw, look.pitch);
  }
  frameId = requestAnimationFrame(renderFrame);
}
async function replaceWorld(isRestart: boolean): Promise<void> {
  if (disposed || failed || (busy && isRestart)) return;
  const requestedGeneration = ++generation;
  busy = true;
  pause();
  setButtonsEnabled(false);
  status.textContent = isRestart ? 'Gården återställs …' : 'Gården förbereds …';
  try {
    const fresh = await createYard();
    if (disposed || failed || requestedGeneration !== generation) { fresh.destroy(); return; }
    yard?.destroy();
    yard = fresh;
    view?.reset(fresh.layout);
    advance = createFixedStepper();
    tick = 0;
    input?.resetLook();
    if (isRestart) restarts += 1;
    busy = false;
    status.textContent = 'Gården är redo. Klicka för att låsa muspekaren.';
    setButtonsEnabled(true);
  } catch {
    fail('Gården kunde inte startas. Ladda om sidan och kontrollera att WebGL är tillgängligt.');
  }
}
async function requestPlay(): Promise<void> {
  if (disposed || failed || busy || !view || document.hidden) return;
  try { await view.canvas.requestPointerLock(); }
  catch { running = false; input?.setActive(false); showPausedPanel('Kunde inte låsa muspekaren. Tillåt muslås i webbläsaren och försök igen.'); }
}
function dispose(): void {
  if (disposed) return;
  disposed = true;
  generation += 1;
  running = false;
  lifecycle.abort();
  cancelAnimationFrame(frameId);
  input?.dispose();
  yard?.destroy();
  view?.dispose();
  yard = undefined;
  if (__YARD_DIAGNOSTICS__) delete window.__yard;
}
function boot(): void {
  try {
    view = createYardView(host);
    input = createBrowserInput(() => pause());
    view.canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); fail('Grafikanslutningen förlorades. Ladda om sidan för att fortsätta.'); }, { signal: lifecycle.signal });
    window.addEventListener('resize', () => view?.resize(), { signal: lifecycle.signal });
    window.addEventListener('blur', () => pause(), { signal: lifecycle.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, { signal: lifecycle.signal });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === view?.canvas && !busy && !failed && !disposed && !document.hidden) {
        running = true;
        input?.setActive(true);
        lastTimestamp = performance.now();
        resumedNeedsStep = true;
        panel.hidden = true;
        crosshair.hidden = false;
      } else pause(false);
    }, { signal: lifecycle.signal });
    window.addEventListener('pagehide', dispose, { signal: lifecycle.signal });
    startButton.addEventListener('click', () => { void requestPlay(); }, { signal: lifecycle.signal });
    restartButton.addEventListener('click', () => { void replaceWorld(true); }, { signal: lifecycle.signal });
    reloadButton.addEventListener('click', () => window.location.reload(), { signal: lifecycle.signal });
    goreCheckbox.addEventListener('change', () => {
      const saved = preferences.setGore(goreCheckbox.checked);
      storageStatus.textContent = saved.status === 'unavailable' ? 'Lokal lagring är inte tillgänglig. Valet gäller bara den här sessionen.' : '';
    }, { signal: lifecycle.signal });
    if (__YARD_DIAGNOSTICS__) {
      Object.defineProperty(window, '__yard', { configurable: true, writable: false, value: (): Diagnostics => ({
        running, tick, restarts,
        position: yard?.snapshot().player.position ?? { x: 0, y: 0, z: 0 },
        counts: yard?.counts() ?? { bodies: 0, colliders: 0 },
        gpu: view?.diagnostics() ?? { geometries: 0, textures: 0, programs: 0 },
      }) });
    }
    frameId = requestAnimationFrame(renderFrame);
    void replaceWorld(false);
  } catch { fail('WebGL kunde inte startas. Uppdatera grafikdrivrutinen eller prova en annan webbläsare.'); }
}

boot();

import { createActionBuffer } from './actionBuffer.ts';
import { createGripInput } from './gripInput.ts';
import type { Action } from './actionBuffer.ts';
import type { MoveIntent } from '../physics/yard.ts';

const MOVEMENT_KEYS: Readonly<Record<string, Action>> = {
  KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right',
  Space: 'jump', KeyC: 'crouch', ShiftLeft: 'sprint', ShiftRight: 'sprint',
};

export function createBrowserInput(onPause: () => void) {
  const controller = new AbortController();
  const actions = createActionBuffer();
  const grip = createGripInput();
  const physicalKeys = new Set<string>();
  let active = false;
  let yaw = 0;
  let pitch = 0;
  let disposed = false;

  function releaseCode(code: string): void {
    const action = MOVEMENT_KEYS[code];
    physicalKeys.delete(code);
    if (!action) return;
    if (action === 'sprint' && (physicalKeys.has('ShiftLeft') || physicalKeys.has('ShiftRight'))) return;
    actions.release(action);
  }

  document.addEventListener('keydown', (event) => {
    if (!active) return;
    if (event.code === 'Escape' || event.code === 'Tab') {
      event.preventDefault();
      onPause();
      return;
    }
    if (event.code === 'KeyR') { event.preventDefault(); grip.rotate(true); return; }
    const action = MOVEMENT_KEYS[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat || physicalKeys.has(event.code)) return;
    physicalKeys.add(event.code);
    actions.press(action);
  }, { signal: controller.signal });
  document.addEventListener('keyup', (event) => {
    if (event.code === 'KeyR') grip.rotate(false);
    releaseCode(event.code);
  }, { signal: controller.signal });
  document.addEventListener('mousemove', (event) => {
    if (!active) return;
    if (grip.motion(event.movementX, event.movementY)) return;
    yaw -= event.movementX * 0.002;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - event.movementY * 0.002));
  }, { signal: controller.signal });

  document.addEventListener('mousedown', (event) => {
    if (!active || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault(); grip.button(event.button, true);
  }, { signal: controller.signal });
  document.addEventListener('mouseup', (event) => grip.button(event.button, false), { signal: controller.signal });
  document.addEventListener('contextmenu', (event) => { if (active) event.preventDefault(); }, { signal: controller.signal });
  document.addEventListener('wheel', (event) => {
    if (!active) return;
    event.preventDefault(); grip.wheel(event.deltaY);
  }, { signal: controller.signal, passive: false });

  function setActive(next: boolean): void {
    if (disposed) return;
    active = next;
    actions.setActive(next);
    grip.setActive(next);
    if (!next) physicalKeys.clear();
  }
  function sample(): MoveIntent {
    const state = actions.sample();
    const held = new Set(state.held);
    const pressed = new Set(state.pressed);
    return {
      right: Number(held.has('right')) - Number(held.has('left')),
      forward: Number(held.has('forward')) - Number(held.has('backward')),
      yaw,
      sprint: held.has('sprint'),
      crouch: held.has('crouch'),
      jump: pressed.has('jump'),
    };
  }
  function look(): { yaw: number; pitch: number } { return { yaw, pitch }; }
  function resetLook(): void { yaw = 0; pitch = 0; }
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    controller.abort();
    physicalKeys.clear();
    actions.setActive(false);
    grip.setActive(false);
  }
  return { setActive, sample, look, resetLook, dispose,
    sampleGrip: () => grip.sample(yaw, pitch), setGripToggle: grip.setToggle, setGripHolding: grip.setHolding };
}

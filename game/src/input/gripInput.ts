import type { GripCommand } from '../physics/grip.ts';
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
export function createGripInput() {
  let active = false, toggle = false, wanted = false, rotating = false, holding = false, sampled = false;
  let acquire = false, throwPressed = false, distanceDelta = 0, rotateYaw = 0, rotatePitch = 0;
  const buttons = new Set<number>();
  function clear(): void {
    wanted = false; rotating = false; holding = false; sampled = false; acquire = false; throwPressed = false;
    distanceDelta = 0; rotateYaw = 0; rotatePitch = 0; buttons.clear();
  }
  return {
    setActive(value: boolean): void { active = value; if (!active) clear(); },
    setToggle(value: boolean): void { toggle = value; clear(); },
    setHolding(value: boolean): void {
      holding = active && value;
      if (sampled && !holding && !acquire) wanted = false;
      sampled = false;
    },
    button(button: number, down: boolean): void {
      if (!down) { buttons.delete(button); if (button === 2 && !toggle) wanted = false; return; }
      if (!active || buttons.has(button)) return;
      buttons.add(button);
      if (button === 2) { wanted = toggle ? !wanted : true; acquire ||= wanted; }
      if (button === 0 && holding) throwPressed = true;
    },
    rotate(value: boolean): void { rotating = active && value; },
    motion(x: number, y: number): boolean {
      if (!active || !holding || !rotating) return false;
      if (!Number.isFinite(x) || !Number.isFinite(y)) { clear(); return true; }
      rotateYaw = clamp(rotateYaw - x * 0.004, 0.12);
      rotatePitch = clamp(rotatePitch - y * 0.004, 0.12);
      return true;
    },
    wheel(delta: number): void { if (active && wanted && Number.isFinite(delta)) distanceDelta = clamp(distanceDelta + delta * 0.002, 0.5); },
    sample(yaw: number, pitch: number): GripCommand {
      const result = { wanted: active && wanted, acquire, throwPressed, yaw, pitch, distanceDelta, rotateYaw, rotatePitch };
      sampled = true;
      acquire = false; throwPressed = false; distanceDelta = 0; rotateYaw = 0; rotatePitch = 0;
      return result;
    },
  };
}

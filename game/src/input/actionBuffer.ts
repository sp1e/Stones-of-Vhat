export type Action =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'sprint'
  | 'jump'
  | 'crouch'
  | 'interact'
  | 'primary'
  | 'secondary'
  | 'rotate'
  | 'bladeOrientation';

export type ActionSnapshot = {
  held: readonly Action[];
  pressed: readonly Action[];
};

export function createActionBuffer() {
  let active = false;
  const held = new Set<Action>();
  const pressed = new Set<Action>();

  return {
    setActive(next: boolean): void {
      active = next;
      if (!active) {
        held.clear();
        pressed.clear();
      }
    },

    press(action: Action): void {
      if (!active || held.has(action)) {
        return;
      }
      held.add(action);
      pressed.add(action);
    },

    release(action: Action): void {
      held.delete(action);
    },

    sample(): ActionSnapshot {
      const snapshot = {
        held: [...held],
        pressed: [...pressed],
      };
      pressed.clear();
      return snapshot;
    },
  };
}

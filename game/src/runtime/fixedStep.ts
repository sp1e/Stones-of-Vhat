export const FIXED_DT = 1 / 60;
export const MAX_STEPS_PER_FRAME = 8;

const MAX_ADMITTED_SECONDS = 0.25;
const EPSILON = 1e-10;

export type StepResult = {
  tick: number;
  steps: number;
  alpha: number;
  droppedSeconds: number;
};

export function createFixedStepper() {
  let accumulator = 0;
  let tick = 0;

  return function advance(
    elapsedSeconds: number,
    active: boolean,
    onStep: (dt: number, tick: number) => void,
  ): StepResult {
    if (!active || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      accumulator = 0;
      return { tick, steps: 0, alpha: 0, droppedSeconds: 0 };
    }

    const admitted = Math.min(elapsedSeconds, MAX_ADMITTED_SECONDS);
    accumulator += admitted;
    const available = Math.floor((accumulator + EPSILON) / FIXED_DT);
    const steps = Math.min(available, MAX_STEPS_PER_FRAME);

    accumulator = Math.max(0, accumulator - available * FIXED_DT);
    for (let index = 0; index < steps; index += 1) {
      tick += 1;
      onStep(FIXED_DT, tick);
    }

    return {
      tick,
      steps,
      alpha: Math.min(accumulator / FIXED_DT, 1),
      droppedSeconds: elapsedSeconds - admitted + (available - steps) * FIXED_DT,
    };
  };
}

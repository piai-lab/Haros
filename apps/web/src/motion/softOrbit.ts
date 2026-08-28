// FILE: softOrbit.ts
// Purpose: Implement the canonical HarnessOS Soft Orbit click feedback.
// Layer: Brand interaction behavior

export type SoftOrbitState = "idle" | "pressed" | "running" | "queued" | "reduced" | "cancelled";

export interface SoftOrbitSnapshot {
  readonly state: SoftOrbitState;
  readonly queuedTurns: number;
  readonly completedTurns: number;
  readonly reducedMotion: boolean;
}

export interface SoftOrbitControllerOptions {
  readonly duration?: number;
  readonly reducedMotion?: boolean | "auto";
  readonly onStateChange?: (snapshot: SoftOrbitSnapshot) => void;
}

export interface SoftOrbitController {
  readonly trigger: () => void;
  readonly press: () => void;
  readonly release: () => void;
  readonly cancel: () => void;
  readonly destroy: () => void;
  readonly setReducedMotion: (value: boolean | "auto") => void;
  readonly getSnapshot: () => SoftOrbitSnapshot;
}

const DEFAULT_DURATION = 650;
const EASING = "cubic-bezier(.22, 1, .36, 1)";

const systemPrefersReduced = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createSoftOrbitController(
  element: HTMLElement,
  options: SoftOrbitControllerOptions = {},
): SoftOrbitController {
  const duration = options.duration ?? DEFAULT_DURATION;
  let reducedMotion = options.reducedMotion ?? "auto";
  let queuedTurns = 0;
  let completedTurns = 0;
  let running = false;
  let destroyed = false;
  let state: SoftOrbitState = "idle";
  let activeAnimation: Animation | null = null;
  let pressAnimation: Animation | null = null;

  const isReduced = (): boolean =>
    reducedMotion === "auto" ? systemPrefersReduced() : reducedMotion;

  const getSnapshot = (): SoftOrbitSnapshot => ({
    state,
    queuedTurns,
    completedTurns,
    reducedMotion: isReduced(),
  });

  const emit = (nextState: SoftOrbitState): void => {
    state = nextState;
    options.onStateChange?.(getSnapshot());
  };

  const resetVisualState = (): void => {
    element.style.transform = "";
    element.style.willChange = "";
  };

  const playReduced = (): void => {
    activeAnimation?.cancel();
    pressAnimation?.cancel();
    queuedTurns = 0;
    running = true;
    emit("reduced");
    element.style.willChange = "transform";
    activeAnimation = element.animate([{ transform: "scale(.96)" }, { transform: "scale(1)" }], {
      duration: 180,
      easing: EASING,
    });
    activeAnimation.onfinish = () => {
      activeAnimation = null;
      running = false;
      completedTurns += 1;
      resetVisualState();
      emit("idle");
    };
  };

  const runNextTurn = (): void => {
    if (destroyed || running) return;
    if (isReduced()) {
      playReduced();
      return;
    }

    pressAnimation?.cancel();
    pressAnimation = null;
    running = true;
    emit("running");
    element.style.willChange = "transform";
    activeAnimation = element.animate(
      [
        { transform: "rotate(0deg) scale(.96)", offset: 0 },
        { transform: "rotate(330deg) scale(1.015)", offset: 0.8 },
        { transform: "rotate(360deg) scale(1)", offset: 1 },
      ],
      { duration, easing: EASING },
    );
    activeAnimation.onfinish = () => {
      activeAnimation = null;
      running = false;
      completedTurns += 1;
      resetVisualState();
      if (queuedTurns > 0) {
        queuedTurns -= 1;
        runNextTurn();
      } else {
        emit("idle");
      }
    };
  };

  const trigger = (): void => {
    if (destroyed) return;
    if (isReduced()) {
      playReduced();
      return;
    }
    if (running) {
      queuedTurns += 1;
      emit("queued");
      return;
    }
    runNextTurn();
  };

  const press = (): void => {
    if (destroyed || running || isReduced()) return;
    pressAnimation?.cancel();
    element.style.willChange = "transform";
    pressAnimation = element.animate([{ transform: "scale(1)" }, { transform: "scale(.96)" }], {
      duration: 80,
      easing: EASING,
      fill: "forwards",
    });
    emit("pressed");
  };

  const release = (): void => {
    if (destroyed || running) return;
    pressAnimation?.cancel();
    pressAnimation = null;
    resetVisualState();
    emit("idle");
  };

  const cancel = (): void => {
    activeAnimation?.cancel();
    pressAnimation?.cancel();
    activeAnimation = null;
    pressAnimation = null;
    queuedTurns = 0;
    running = false;
    resetVisualState();
    emit("cancelled");
  };

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    activeAnimation?.cancel();
    pressAnimation?.cancel();
    activeAnimation = null;
    pressAnimation = null;
    queuedTurns = 0;
    running = false;
    resetVisualState();
  };

  return {
    trigger,
    press,
    release,
    cancel,
    destroy,
    getSnapshot,
    setReducedMotion(value) {
      reducedMotion = value;
      if (running) cancel();
    },
  };
}

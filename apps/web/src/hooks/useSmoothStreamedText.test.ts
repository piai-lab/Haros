import { describe, expect, it } from "vitest";

import {
  clampSmoothRevealPrefixLength,
  createSmoothRevealState,
  MIN_EMIT_INTERVAL_MS,
  stepSmoothReveal,
  type SmoothRevealState,
} from "./useSmoothStreamedText";

const FRAME_MS = 8;

function drain(state: SmoothRevealState, targetLength: number, startMs: number) {
  const emits: { at: number; count: number }[] = [];
  let emitted = Math.floor(state.shown);
  let now = startMs;
  let frames = 0;
  for (; frames < 10_000; frames += 1) {
    const step = stepSmoothReveal(state, now, targetLength, emitted);
    if (step.emitCount !== null) {
      emits.push({ at: now, count: step.emitCount });
      emitted = step.emitCount;
    }
    if (step.done) break;
    now += FRAME_MS;
  }
  return { emits, frames, state };
}

describe("stepSmoothReveal", () => {
  it("spaces non-final commits by at least the quantization interval", () => {
    const run = drain(createSmoothRevealState(0), 400, 1_000);
    expect(run.emits.length).toBeGreaterThan(1);
    for (let index = 1; index < run.emits.length - 1; index += 1) {
      expect(run.emits[index]!.at - run.emits[index - 1]!.at).toBeGreaterThanOrEqual(
        MIN_EMIT_INTERVAL_MS,
      );
    }
    expect(run.emits.length).toBeLessThan(run.frames / 3);
  });

  it("always emits the final target without waiting for another interval", () => {
    const state: SmoothRevealState = {
      shown: 101.5,
      velocity: 500,
      lastFrameAt: 992,
      lastEmitAt: 996,
    };
    const step = stepSmoothReveal(state, 1_000, 103, 101);
    expect(step).toEqual({ emitCount: 103, done: true });
  });

  it("clamps a background-tab frame instead of dumping the backlog", () => {
    const state = createSmoothRevealState(0);
    stepSmoothReveal(state, 1_000, 500, 0);
    stepSmoothReveal(state, 1_008, 500, 0);
    const shownBefore = state.shown;
    const velocityBefore = state.velocity;
    stepSmoothReveal(state, 61_000, 500, Math.floor(shownBefore));
    expect(state.shown - shownBefore).toBeLessThanOrEqual(
      Math.max(state.velocity, velocityBefore) * 0.05 + 1,
    );
    expect(state.shown).toBeLessThan(500);
  });

  it("sleeps when the target shrinks below the revealed count", () => {
    const state = createSmoothRevealState(200);
    expect(stepSmoothReveal(state, 1_000, 50, 200)).toEqual({ emitCount: null, done: true });
    expect(state.shown).toBe(50);
  });

  it("drains a 10k backlog at the bounded ceiling and settles exactly", () => {
    const run = drain(createSmoothRevealState(0), 10_000, 0);
    expect(run.frames * FRAME_MS).toBeGreaterThanOrEqual(5_000);
    expect(run.emits.at(-1)?.count).toBe(10_000);
  });
});

describe("clampSmoothRevealPrefixLength", () => {
  it("never exposes a lone surrogate while an emoji crosses an emit boundary", () => {
    const text = "a😀b";
    expect(clampSmoothRevealPrefixLength(text, 2)).toBe(1);
    expect(text.slice(0, clampSmoothRevealPrefixLength(text, 2))).toBe("a");
    expect(clampSmoothRevealPrefixLength(text, 3)).toBe(3);
    expect(text.slice(0, clampSmoothRevealPrefixLength(text, 3))).toBe("a😀");
  });
});

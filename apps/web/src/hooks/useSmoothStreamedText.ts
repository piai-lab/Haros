// FILE: useSmoothStreamedText.ts
// Purpose: Reveal streamed assistant text at a steady, adaptive cadence so tokens appear
//          fluidly instead of in the ~100ms network clumps that land in the store.
// Layer: Web UI streaming primitive
// Exports: useSmoothStreamedText, stepSmoothReveal (pure stepper, unit-tested)
// Why: The transport coalesces deltas into one store update per ~100ms
//      (apps/web/src/routes/__root.tsx Throttler), so rendering each clump verbatim looks
//      choppy. This hook drains the already-delivered buffer on requestAnimationFrame at a
//      velocity that adapts to the backlog, low-pass-smooths that velocity so there are
//      no jarring speed jumps, and sleeps between bursts once it catches up. It feeds the
//      same text ChatMarkdown already defers, so the markdown re-parse stays coalesced by
//      useDeferredValue: this hook governs *cadence*, not parse cost.

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

// Drain the current backlog over this window. Kept above the ~100ms network flush so a
// small backlog cushion always remains and the reveal tracks inflow without running dry.
const DRAIN_WINDOW_SECONDS = 0.16;
// Hard ceiling so a single huge flush (e.g. a pasted code block) reveals fast but bounded
// rather than snapping in all at once.
const MAX_CHARS_PER_SECOND = 2000;
// Low-pass factor: how aggressively the live velocity chases the target velocity each
// frame. Smaller is smoother but laggier; ~0.15 ≈ a ~110ms time constant at 60fps.
const VELOCITY_LERP = 0.15;
// Clamp per-frame delta so returning from a backgrounded tab (rAF paused) does not dump
// the whole backlog in a single frame.
const MAX_FRAME_SECONDS = 0.05;
// Minimum spacing between React commits. The reveal float still advances every frame at
// the smoothed velocity; this only batches how often the grown prefix is pushed to state.
export const MIN_EMIT_INTERVAL_MS = 40;

export interface SmoothRevealState {
  shown: number;
  velocity: number;
  lastFrameAt: number;
  lastEmitAt: number;
}

export function createSmoothRevealState(shown: number): SmoothRevealState {
  return { shown, velocity: 0, lastFrameAt: 0, lastEmitAt: 0 };
}

export interface SmoothRevealStep {
  emitCount: number | null;
  done: boolean;
}

export function stepSmoothReveal(
  state: SmoothRevealState,
  nowMs: number,
  targetLength: number,
  emittedCount: number,
): SmoothRevealStep {
  const previousFrameAt = state.lastFrameAt;
  const dt = previousFrameAt ? Math.min((nowMs - previousFrameAt) / 1000, MAX_FRAME_SECONDS) : 0;
  state.lastFrameAt = nowMs;

  if (state.shown > targetLength) state.shown = targetLength;

  const backlog = targetLength - state.shown;
  if (backlog <= 0) {
    state.velocity = 0;
    state.lastFrameAt = 0;
    return { emitCount: null, done: true };
  }

  const targetVelocity = Math.min(MAX_CHARS_PER_SECOND, backlog / DRAIN_WINDOW_SECONDS);
  state.velocity += (targetVelocity - state.velocity) * VELOCITY_LERP;
  state.shown = Math.min(targetLength, state.shown + state.velocity * dt);

  const nextCount = Math.floor(state.shown);
  const caughtUp = nextCount >= targetLength;
  const emitDue =
    nextCount !== emittedCount &&
    (caughtUp || state.lastEmitAt === 0 || nowMs - state.lastEmitAt >= MIN_EMIT_INTERVAL_MS);
  if (emitDue) {
    state.lastEmitAt = nowMs;
  }

  const done = targetLength - state.shown <= 0;
  if (done) {
    state.velocity = 0;
    state.lastFrameAt = 0;
  }
  return { emitCount: emitDue ? nextCount : null, done };
}

/** Never return a prefix ending between a UTF-16 surrogate pair. */
export function clampSmoothRevealPrefixLength(text: string, count: number): number {
  const bounded = Math.max(0, Math.min(count, text.length));
  if (bounded === 0 || bounded >= text.length) {
    return bounded;
  }
  const previous = text.charCodeAt(bounded - 1);
  const next = text.charCodeAt(bounded);
  const splitsSurrogatePair =
    previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
  return splitsSurrogatePair ? bounded - 1 : bounded;
}

/**
 * Smoothly reveal `text` while `isStreaming` is true.
 *
 * - Returns `text` unchanged when not streaming or under prefers-reduced-motion, so
 *   completed messages and reduced-motion users see the exact text with zero animation.
 * - Snaps to the full text the instant streaming ends (no trailing typewriter once the
 *   agent is done).
 * - Text already present on mount is shown immediately; only newly-arriving deltas animate.
 */
export function useSmoothStreamedText(text: string, isStreaming: boolean): string {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = isStreaming && !reduceMotion;

  const [revealed, setRevealed] = useState(text);

  // Latest full text, mirrored post-commit so the rAF loop always reads the current value
  // without re-subscribing the animation effect on every ~100ms delta.
  const targetRef = useRef(text);
  const stateRef = useRef<SmoothRevealState>(createSmoothRevealState(text.length));
  // Character count last pushed to React state — guards against redundant setState when the
  // floored count has not advanced.
  const emittedRef = useRef(text.length);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<(now: number) => void>(() => undefined);

  const cancelFrame = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const scheduleFrame = useCallback(() => {
    if (rafRef.current != null) {
      return;
    }
    rafRef.current = requestAnimationFrame((now) => {
      rafRef.current = null;
      tickRef.current(now);
    });
  }, []);

  // Installed in an effect (not during render — that write would make the
  // whole hook ineligible for React Compiler). The tick reads everything
  // through refs, so a mount-time install stays permanently fresh.
  useEffect(() => {
    tickRef.current = (now: number) => {
      const target = targetRef.current;
      const step = stepSmoothReveal(stateRef.current, now, target.length, emittedRef.current);
      if (step.emitCount !== null) {
        const safeCount = clampSmoothRevealPrefixLength(target, step.emitCount);
        if (safeCount !== emittedRef.current) {
          emittedRef.current = safeCount;
          setRevealed(safeCount >= target.length ? target : target.slice(0, safeCount));
        }
      }
      if (!step.done) {
        scheduleFrame();
      }
    };
  }, [scheduleFrame]);

  useEffect(() => {
    const previousTarget = targetRef.current;
    const isAppendOnly = text.length >= previousTarget.length && text.startsWith(previousTarget);
    targetRef.current = text;

    if (!animate || !isAppendOnly) {
      cancelFrame();
      stateRef.current = createSmoothRevealState(text.length);
      emittedRef.current = text.length;
      setRevealed(text);
      return;
    }

    if (text.length > stateRef.current.shown) {
      scheduleFrame();
    }
  }, [animate, cancelFrame, scheduleFrame, text]);

  useEffect(() => () => cancelFrame(), [cancelFrame]);

  return animate ? revealed : text;
}

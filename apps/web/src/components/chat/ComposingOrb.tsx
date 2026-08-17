// FILE: ComposingOrb.tsx
// Purpose: Runs OmniMind's fixed 20px Composing/Ribbon canvas with product lifecycle guards.
// Layer: Web UI presentation primitive
// Depends on: local copied-adapted painter, shared reduced-motion owner.
//
// Runtime behavior is copied-adapted from thinking-orbs@0.3.1 commit
// bd204b73c9b6660fad7210b1ad48d9dc2adbb89d (src/ThinkingOrb.tsx).
// MIT license: ../../../../../LICENSES/thinking-orbs-MIT.txt

import { useEffect, useRef } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import {
  COMPOSING_ORB_CSS_SIZE,
  COMPOSING_ORB_SPEED,
  COMPOSING_ORB_STATIC_TIME_SECONDS,
  paintComposingOrbFrame,
} from "./composingOrbPainter";

interface ComposingOrbProps {
  readonly theme: "light" | "dark";
  readonly paused?: boolean;
}

export function ComposingOrb({ theme, paused = false }: ComposingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(COMPOSING_ORB_CSS_SIZE * pixelRatio);
    canvas.height = Math.round(COMPOSING_ORB_CSS_SIZE * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return;

    const paint = (timeSeconds: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, COMPOSING_ORB_CSS_SIZE, COMPOSING_ORB_CSS_SIZE);
      paintComposingOrbFrame(context, timeSeconds, theme === "dark");
    };

    if (reducedMotion) {
      paint(COMPOSING_ORB_STATIC_TIME_SECONDS);
      return;
    }

    let animationFrame = 0;
    let running = false;
    const loop = () => {
      paint((performance.now() / 1000) * COMPOSING_ORB_SPEED);
      if (running) animationFrame = window.requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || paused) return;
      running = true;
      animationFrame = window.requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
    };

    // A representative frame is always present, even before visibility is
    // known or while the caller has intentionally paused the loop.
    paint((performance.now() / 1000) * COMPOSING_ORB_SPEED);

    let visible = true;
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            if (visible && document.visibilityState !== "hidden") start();
            else stop();
          });
    observer?.observe(canvas);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!observer && document.visibilityState !== "hidden") start();

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [paused, reducedMotion, theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="block size-5 shrink-0"
      data-composing-orb="official-20px"
    />
  );
}

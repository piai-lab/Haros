// FILE: ThinkingStatus.tsx
// Purpose: Presents the approved Composing orb, rotating hint, and symmetric tide dots.
// Layer: Web UI presentation
// Depends on: existing Timeline lifecycle, local i18n catalog, ComposingOrb.

import { useEffect, useState } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import { ComposingOrb } from "./ComposingOrb";

export const THINKING_HINT_ROTATION_MS = 5_000;

interface ThinkingStatusProps {
  readonly accessibleLabel: string;
  readonly fontSizePx: number;
  readonly hints: readonly string[];
  readonly theme: "light" | "dark";
}

function randomHintIndex(hintCount: number): number {
  if (hintCount <= 1) return 0;
  return Math.floor(Math.random() * hintCount);
}

export function visibleThinkingHint(hint: string): string {
  return hint.replace(/(?:\.{3}|…+)$/u, "");
}

export function ThinkingStatus({ accessibleLabel, fontSizePx, hints, theme }: ThinkingStatusProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [hintIndex, setHintIndex] = useState(() => randomHintIndex(hints.length));

  useEffect(() => {
    if (reducedMotion || hints.length <= 1) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setHintIndex((current) => (current + 1) % hints.length);
    }, THINKING_HINT_ROTATION_MS);
    return () => window.clearInterval(interval);
  }, [hints.length, reducedMotion]);

  const normalizedIndex = hints.length === 0 ? 0 : hintIndex % hints.length;
  const hint = visibleThinkingHint(hints[normalizedIndex] ?? accessibleLabel);

  return (
    <div
      className="omnimind-thinking-status font-system-ui text-[var(--color-text-foreground-secondary)]"
      data-testid="thinking-status"
      role="status"
      aria-label={accessibleLabel}
      aria-live="polite"
      aria-atomic="true"
      style={{ fontSize: `${fontSizePx}px` }}
    >
      <span className="omnimind-thinking-status__visual" aria-hidden="true">
        <ComposingOrb theme={theme} />
        <span className="omnimind-thinking-status__hint-shell">
          <span key={hintIndex} className="omnimind-thinking-status__hint">
            {hint}
          </span>
          <span className="omnimind-thinking-status__dots">
            <i />
            <i />
            <i />
          </span>
        </span>
      </span>
    </div>
  );
}

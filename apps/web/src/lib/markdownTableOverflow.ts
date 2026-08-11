// FILE: markdownTableOverflow.ts
// Purpose: Give rendered Markdown tables container-owned, keyboard-reachable horizontal overflow.
// Layer: Web markdown presentation behavior
// Exports: connectMarkdownTableOverflow, refreshMarkdownTableOverflow

type OverflowCallback = () => void;

const resizeCallbacks = new WeakMap<Element, OverflowCallback>();
let sharedResizeObserver: ResizeObserver | null = null;
let observedViewportCount = 0;

function ensureResizeObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === "undefined") {
    return null;
  }
  sharedResizeObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      resizeCallbacks.get(entry.target)?.();
    }
  });
  return sharedResizeObserver;
}

export function refreshMarkdownTableOverflow(input: {
  frame: HTMLElement;
  viewport: HTMLElement;
  regionLabel: string;
}): void {
  const { frame, viewport, regionLabel } = input;
  const overflowing = viewport.scrollWidth > viewport.clientWidth + 1;
  const atStart = viewport.scrollLeft <= 1;
  const atEnd = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1;

  frame.dataset.overflow = String(overflowing);
  frame.dataset.scrollStart = String(!overflowing || atStart);
  frame.dataset.scrollEnd = String(!overflowing || atEnd);
  viewport.tabIndex = overflowing ? 0 : -1;

  if (overflowing) {
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", regionLabel);
  } else {
    viewport.removeAttribute("role");
    viewport.removeAttribute("aria-label");
  }
}

export function connectMarkdownTableOverflow(input: {
  frame: HTMLElement;
  viewport: HTMLElement;
  regionLabel: string;
}): () => void {
  const { viewport } = input;
  const update = () => refreshMarkdownTableOverflow(input);
  const observer = ensureResizeObserver();

  viewport.addEventListener("scroll", update, { passive: true });
  if (observer) {
    resizeCallbacks.set(viewport, update);
    observer.observe(viewport);
    observedViewportCount += 1;
  }
  update();

  return () => {
    viewport.removeEventListener("scroll", update);
    if (!observer) {
      return;
    }
    observer.unobserve(viewport);
    resizeCallbacks.delete(viewport);
    observedViewportCount -= 1;
    if (observedViewportCount === 0) {
      observer.disconnect();
      sharedResizeObserver = null;
    }
  };
}

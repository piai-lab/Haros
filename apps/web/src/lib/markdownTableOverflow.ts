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

  const overflowValue = String(overflowing);
  const scrollStartValue = String(!overflowing || atStart);
  const scrollEndValue = String(!overflowing || atEnd);
  if (frame.dataset.overflow !== overflowValue) {
    frame.dataset.overflow = overflowValue;
  }
  if (frame.dataset.scrollStart !== scrollStartValue) {
    frame.dataset.scrollStart = scrollStartValue;
  }
  if (frame.dataset.scrollEnd !== scrollEndValue) {
    frame.dataset.scrollEnd = scrollEndValue;
  }

  if (overflowing) {
    if (viewport.tabIndex !== 0) {
      viewport.tabIndex = 0;
    }
    if (viewport.getAttribute("role") !== "region") {
      viewport.setAttribute("role", "region");
    }
    if (viewport.getAttribute("aria-label") !== regionLabel) {
      viewport.setAttribute("aria-label", regionLabel);
    }
  } else {
    if (viewport.tabIndex !== -1) {
      viewport.tabIndex = -1;
    }
    if (viewport.hasAttribute("role")) {
      viewport.removeAttribute("role");
    }
    if (viewport.hasAttribute("aria-label")) {
      viewport.removeAttribute("aria-label");
    }
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

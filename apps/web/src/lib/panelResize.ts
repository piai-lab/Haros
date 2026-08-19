// FILE: panelResize.ts
// Purpose: Pure DOM helpers for chat/split panel resizing — the drag overlay that
//          keeps pointer events in the React layer over Electron <webview>s, the
//          cross-surface occlusion notification, and the composer width feasibility
//          probe. Extracted from the chat route so the route file holds
//          orchestration, not low-level DOM measurement.
// Layer: Web panel layout utilities

import { SINGLE_CHAT_PANE_SCOPE_ID } from "./chatPaneScope";
import { findNearestMeasurableAncestor } from "./domLayout";
import { notifyNativeSurfaceOcclusionChange } from "./nativeSurfaceOcclusion";

export type PanelResizeOutcome = "commit" | "cancel";

export interface PanelResizeSession {
  finish: (outcome: PanelResizeOutcome) => void;
}

/**
 * Owns the document-wide part of one resize gesture. Pointer events can disappear
 * when Electron loses focus, a native surface takes over, or React unmounts the
 * initiating handle. Every caller still owns its local geometry, but all callers
 * get the same idempotent escape paths and exact body-style restoration.
 */
export function createPanelResizeSession(input: {
  cursor: "col-resize" | "row-resize";
  onFinish: (outcome: PanelResizeOutcome) => void;
}): PanelResizeSession {
  const previousBodyCursor = document.body.style.cursor;
  const previousBodyUserSelect = document.body.style.userSelect;
  let active = true;

  const finish = (outcome: PanelResizeOutcome) => {
    if (!active) return;
    active = false;
    window.removeEventListener("blur", cancel);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.body.style.cursor = previousBodyCursor;
    document.body.style.userSelect = previousBodyUserSelect;
    input.onFinish(outcome);
  };
  const cancel = () => finish("cancel");
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      cancel();
    }
  };

  document.body.style.cursor = input.cursor;
  document.body.style.userSelect = "none";
  window.addEventListener("blur", cancel);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return { finish };
}

// Minimum width (px) the composer's left controls cluster needs before it overflows.
// Kept intentionally lean: this is only a soft buffer, since canComposerHandlePanelWidth
// also blocks on real overflow (hasComposerOverflow / overflowsViewport). A smaller value
// lets the right dock and split panes resize across a much wider range before the probe
// stops the drag, while the overflow checks still prevent the composer from clipping.
const COMPOSER_COMPACT_MIN_LEFT_CONTROLS_WIDTH_PX = 160;

// Probe whether the composer can render at `nextWidth` without overflowing its
// viewport or violating its minimum control width. Applies the width, measures,
// then resets — callers own the real commit.
export function canComposerHandlePanelWidth(input: {
  nextWidth: number;
  paneScopeId?: string;
  applyWidth: (width: number) => void;
  resetWidth: () => void;
}): boolean {
  const paneScopeId = input.paneScopeId ?? SINGLE_CHAT_PANE_SCOPE_ID;
  const composerForm = findComposerForm(paneScopeId);
  if (!composerForm) return true;

  // The form can be nested inside boxless wrappers (e.g. ChatView's
  // `display: contents` landing wrapper); measuring those as the viewport would
  // reject every width and freeze dock/split resizing.
  const composerViewport = findNearestMeasurableAncestor(composerForm);
  if (!composerViewport) return true;

  input.applyWidth(input.nextWidth);

  const viewportStyle = window.getComputedStyle(composerViewport);
  const viewportPaddingLeft = Number.parseFloat(viewportStyle.paddingLeft) || 0;
  const viewportPaddingRight = Number.parseFloat(viewportStyle.paddingRight) || 0;
  const viewportContentWidth = Math.max(
    0,
    composerViewport.clientWidth - viewportPaddingLeft - viewportPaddingRight,
  );
  const formRect = composerForm.getBoundingClientRect();
  const composerFooter = composerForm.querySelector<HTMLElement>(
    "[data-chat-composer-footer='true']",
  );
  const composerRightActions = composerForm.querySelector<HTMLElement>(
    "[data-chat-composer-actions='right']",
  );
  const composerRightActionsWidth = composerRightActions?.getBoundingClientRect().width ?? 0;
  const composerFooterGap = composerFooter
    ? Number.parseFloat(window.getComputedStyle(composerFooter).columnGap) ||
      Number.parseFloat(window.getComputedStyle(composerFooter).gap) ||
      0
    : 0;
  const minimumComposerWidth =
    COMPOSER_COMPACT_MIN_LEFT_CONTROLS_WIDTH_PX + composerRightActionsWidth + composerFooterGap;
  const hasComposerOverflow = composerForm.scrollWidth > composerForm.clientWidth + 0.5;
  const overflowsViewport = formRect.width > viewportContentWidth + 0.5;
  const violatesMinimumComposerWidth = composerForm.clientWidth + 0.5 < minimumComposerWidth;

  input.resetWidth();

  return !hasComposerOverflow && !overflowsViewport && !violatesMinimumComposerWidth;
}

// Finds the composer for one pane without depending on CSS selector escaping.
function findComposerForm(paneScopeId: string): HTMLElement | null {
  const composerForms = document.querySelectorAll<HTMLElement>("[data-chat-composer-form='true']");
  for (const composerForm of composerForms) {
    if (composerForm.dataset.chatPaneScope === paneScopeId) {
      return composerForm;
    }
  }
  return null;
}

// Electron <webview> can swallow pointermove during drag; this keeps resizing in the React layer.
export function createPanelResizeOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-panel-resize-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.cursor = "col-resize";
  overlay.style.background = "transparent";
  document.body.append(overlay);
  notifyNativeSurfaceOcclusionChange();
  return overlay;
}

export function removePanelResizeOverlay(overlay: HTMLDivElement): void {
  overlay.remove();
  notifyNativeSurfaceOcclusionChange();
}

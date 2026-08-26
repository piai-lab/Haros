// FILE: chatSelectionActions.ts
// Purpose: Helpers for reading assistant text selections from the transcript without re-render churn.
// Layer: Chat transcript interaction helpers

import {
  resolveTranscriptMarkerRangeFromDom,
  type TranscriptMarkerRange,
} from "./transcriptSelectionSource";

export interface TranscriptSelectionSnapshot {
  assistantMessageId: string;
  visibleText: string;
  markerRange?: TranscriptMarkerRange | undefined;
}

export interface TranscriptAssistantSelectionContext {
  rawText: string;
  markerEnabled: boolean;
}

export interface SelectionActionAnchor {
  anchorX: number;
  selectionTop: number;
  selectionBottom: number;
  placement: "top" | "bottom";
}

function getSelectionRect(selection: Selection): DOMRect | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0,
  );
  if (rects.length > 0) {
    return rects[rects.length - 1] ?? null;
  }
  const boundingRect = range.getBoundingClientRect();
  return boundingRect.width > 0 || boundingRect.height > 0 ? boundingRect : null;
}

// Rect of the active window selection, for positioning floating selection actions.
export function getActiveSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection) {
    return null;
  }
  return getSelectionRect(selection);
}

// `closest()` that escapes open shadow roots (e.g. the @pierre/diffs custom
// element) by hopping from a shadow root to its host element.
export function closestThroughShadow(start: Node | null, selector: string): HTMLElement | null {
  let node: Node | null = start;
  while (node) {
    const element = node instanceof HTMLElement ? node : node.parentElement;
    const match = element?.closest<HTMLElement>(selector) ?? null;
    if (match) {
      return match;
    }
    const root = (element ?? node).getRootNode();
    node = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

function selectionContainerForNode(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest<HTMLElement>("[data-assistant-message-id]") ?? null;
}

export function readTranscriptAssistantSelection(input: {
  container: HTMLElement | null;
  resolveContext?:
    | ((assistantMessageId: string) => TranscriptAssistantSelectionContext | null)
    | undefined;
}): { selection: TranscriptSelectionSnapshot; selectionRect: DOMRect | null } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
    return null;
  }

  const anchorContainer = selectionContainerForNode(selection.anchorNode);
  const focusContainer = selectionContainerForNode(selection.focusNode);
  if (!anchorContainer || !focusContainer || anchorContainer !== focusContainer) {
    return null;
  }
  const { container } = input;
  if (!container || !container.contains(anchorContainer)) {
    return null;
  }

  const assistantMessageId = anchorContainer.dataset.assistantMessageId?.trim() ?? "";
  const visibleText = selection.toString();
  if (assistantMessageId.length === 0 || visibleText.trim().length === 0) {
    return null;
  }

  const context = input.resolveContext?.(assistantMessageId) ?? null;
  const markerRange =
    context?.markerEnabled === true
      ? resolveTranscriptMarkerRangeFromDom({
          range: selection.getRangeAt(0),
          messageBody: anchorContainer,
          rawText: context.rawText,
        })
      : null;

  return {
    selection: {
      assistantMessageId,
      visibleText,
      ...(markerRange ? { markerRange } : {}),
    },
    selectionRect: getSelectionRect(selection),
  };
}

export function resolveSelectionActionAnchor(input: {
  selectionRect: DOMRect | null;
  pointer: { x: number; y: number };
  viewportHeight?: number | undefined;
}): SelectionActionAnchor {
  const viewportHeight =
    input.viewportHeight ??
    (typeof window === "undefined" ? input.pointer.y + 8 : window.innerHeight);

  const anchorX =
    input.selectionRect !== null
      ? input.selectionRect.left + input.selectionRect.width / 2
      : input.pointer.x;
  const selectionTop = input.selectionRect?.top ?? input.pointer.y;
  const selectionBottom = input.selectionRect?.bottom ?? input.pointer.y;
  const availableAbove = selectionTop;
  const availableBelow = viewportHeight - selectionBottom;

  return {
    anchorX,
    selectionTop,
    selectionBottom,
    placement: availableAbove >= availableBelow ? "top" : "bottom",
  };
}

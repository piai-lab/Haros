import { afterEach, describe, expect, it } from "vitest";

import { readTranscriptAssistantSelection } from "./chatSelectionActions";
import {
  activeSelectionIntersectsElement,
  resolveTranscriptMarkerRangeFromDom,
  transcriptSourceRangeAttributes,
} from "./transcriptSelectionSource";

function sourceSpan(text: string, startOffset: number, endOffset: number): HTMLSpanElement {
  const span = document.createElement("span");
  const attributes = transcriptSourceRangeAttributes({ startOffset, endOffset });
  for (const [name, value] of Object.entries(attributes)) {
    span.setAttribute(name, String(value));
  }
  span.textContent = text;
  return span;
}

function mountMessage(...children: Node[]) {
  const container = document.createElement("div");
  const body = document.createElement("div");
  body.dataset.assistantMessageId = "assistant-1";
  body.append(...children);
  container.append(body);
  document.body.append(container);
  return { body, container };
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

describe("transcript selection source projection", () => {
  it("resolves the second repeated phrase without a string search", () => {
    const span = sourceSpan("alpha alpha", 0, 11);
    const { body } = mountMessage(span);
    const text = span.firstChild!;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 11);

    expect(
      resolveTranscriptMarkerRangeFromDom({ range, messageBody: body, rawText: "alpha alpha" }),
    ).toEqual({ startOffset: 6, endOffset: 11, selectedText: "alpha" });
  });

  it("uses the DOM range for reverse selections and preserves visible text", () => {
    const span = sourceSpan("alpha beta", 0, 10);
    const { container } = mountMessage(span);
    const text = span.firstChild!;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(text, 10, text, 6);

    expect(
      readTranscriptAssistantSelection({
        container,
        resolveContext: () => ({ rawText: "alpha beta", markerEnabled: true }),
      })?.selection,
    ).toEqual({
      assistantMessageId: "assistant-1",
      visibleText: "beta",
      markerRange: { startOffset: 6, endOffset: 10, selectedText: "beta" },
    });
  });

  it("resolves an ordered range across multiple source-backed leaves", () => {
    const first = sourceSpan("first", 0, 5);
    const second = sourceSpan(" second", 5, 12);
    const { body } = mountMessage(first, second);
    const range = document.createRange();
    range.setStart(first.firstChild!, 1);
    range.setEnd(second.firstChild!, 4);

    expect(
      resolveTranscriptMarkerRangeFromDom({ range, messageBody: body, rawText: "first second" }),
    ).toEqual({ startOffset: 1, endOffset: 9, selectedText: "irst sec" });
  });

  it("fails closed when any selected leaf is unmappable or the raw message changed", () => {
    const backed = sourceSpan("alpha", 0, 5);
    const unknown = document.createTextNode(" formula");
    const { body } = mountMessage(backed, unknown);
    const acrossUnknown = document.createRange();
    acrossUnknown.setStart(backed.firstChild!, 0);
    acrossUnknown.setEnd(unknown, unknown.textContent?.length ?? 0);

    expect(
      resolveTranscriptMarkerRangeFromDom({
        range: acrossUnknown,
        messageBody: body,
        rawText: "alpha formula",
      }),
    ).toBeNull();

    const backedOnly = document.createRange();
    backedOnly.selectNodeContents(backed);
    expect(
      resolveTranscriptMarkerRangeFromDom({
        range: backedOnly,
        messageBody: body,
        rawText: "omega formula",
      }),
    ).toBeNull();
  });

  it("detects whether the active native selection intersects a file chip", () => {
    const chip = sourceSpan("docs/architecture.md", 0, 18);
    const other = sourceSpan(" other", 18, 24);
    mountMessage(chip, other);
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(chip.firstChild!, 3);
    range.setEnd(other.firstChild!, 2);
    selection.removeAllRanges();
    selection.addRange(range);

    expect(activeSelectionIntersectsElement(chip)).toBe(true);
    expect(activeSelectionIntersectsElement(other)).toBe(true);
    selection.collapse(other.firstChild!, 0);
    expect(activeSelectionIntersectsElement(chip)).toBe(false);
  });

  it("leaves cross-message selections native-only", () => {
    const container = document.createElement("div");
    const firstBody = document.createElement("div");
    firstBody.dataset.assistantMessageId = "assistant-1";
    const first = sourceSpan("first", 0, 5);
    firstBody.append(first);
    const secondBody = document.createElement("div");
    secondBody.dataset.assistantMessageId = "assistant-2";
    const second = sourceSpan("second", 0, 6);
    secondBody.append(second);
    container.append(firstBody, secondBody);
    document.body.append(container);
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(first.firstChild!, 0);
    range.setEnd(second.firstChild!, 6);
    selection.removeAllRanges();
    selection.addRange(range);

    expect(selection.toString()).toContain("first");
    expect(selection.toString()).toContain("second");
    expect(readTranscriptAssistantSelection({ container })).toBeNull();
  });
});

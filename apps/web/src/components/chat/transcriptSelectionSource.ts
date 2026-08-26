// FILE: transcriptSelectionSource.ts
// Purpose: Own the narrow DOM contract that maps finalized assistant text back to raw Markdown.
// Layer: Chat transcript interaction contract

export const TRANSCRIPT_SOURCE_START_ATTRIBUTE = "data-transcript-source-start";
export const TRANSCRIPT_SOURCE_END_ATTRIBUTE = "data-transcript-source-end";

export interface TranscriptSourceRange {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface TranscriptMarkerRange extends TranscriptSourceRange {
  readonly selectedText: string;
}

export function transcriptSourceRangeAttributes(range: TranscriptSourceRange): {
  [TRANSCRIPT_SOURCE_START_ATTRIBUTE]: number;
  [TRANSCRIPT_SOURCE_END_ATTRIBUTE]: number;
} {
  return {
    [TRANSCRIPT_SOURCE_START_ATTRIBUTE]: range.startOffset,
    [TRANSCRIPT_SOURCE_END_ATTRIBUTE]: range.endOffset,
  };
}

export function readTranscriptSourceRange(element: Element): TranscriptSourceRange | null {
  const startOffset = Number.parseInt(
    element.getAttribute(TRANSCRIPT_SOURCE_START_ATTRIBUTE) ?? "",
    10,
  );
  const endOffset = Number.parseInt(
    element.getAttribute(TRANSCRIPT_SOURCE_END_ATTRIBUTE) ?? "",
    10,
  );
  if (
    !Number.isInteger(startOffset) ||
    !Number.isInteger(endOffset) ||
    startOffset < 0 ||
    endOffset <= startOffset
  ) {
    return null;
  }
  return { startOffset, endOffset };
}

export function activeSelectionIntersectsElement(element: Element): boolean {
  const selection = element.ownerDocument.defaultView?.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) {
    return false;
  }
  try {
    return selection.getRangeAt(0).intersectsNode(element);
  } catch {
    return false;
  }
}

function selectedOffsetsInTextNode(
  range: Range,
  node: Text,
): { start: number; end: number } | null {
  let start = 0;
  let end = node.data.length;
  if (range.startContainer === node) {
    start = range.startOffset;
  }
  if (range.endContainer === node) {
    end = range.endOffset;
  }
  return end > start ? { start, end } : null;
}

function textOffsetWithinElement(element: Element, node: Text, offset: number): number {
  const prefix = element.ownerDocument.createRange();
  prefix.selectNodeContents(element);
  prefix.setEnd(node, offset);
  return prefix.toString().length;
}

export function resolveTranscriptMarkerRangeFromDom(input: {
  range: Range;
  messageBody: HTMLElement;
  rawText: string;
}): TranscriptMarkerRange | null {
  const { range, messageBody, rawText } = input;
  if (range.collapsed || !messageBody.contains(range.commonAncestorContainer)) {
    return null;
  }

  const document = messageBody.ownerDocument;
  const showText = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = document.createTreeWalker(messageBody, showText);
  const fragments: TranscriptSourceRange[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    let intersects = false;
    try {
      intersects = range.intersectsNode(textNode);
    } catch {
      return null;
    }
    if (intersects) {
      const selectedOffsets = selectedOffsetsInTextNode(range, textNode);
      if (selectedOffsets) {
        const sourceElement = textNode.parentElement?.closest(
          `[${TRANSCRIPT_SOURCE_START_ATTRIBUTE}][${TRANSCRIPT_SOURCE_END_ATTRIBUTE}]`,
        );
        if (!sourceElement || !messageBody.contains(sourceElement)) {
          return null;
        }
        const sourceRange = readTranscriptSourceRange(sourceElement);
        if (!sourceRange) {
          return null;
        }
        const sourceText = rawText.slice(sourceRange.startOffset, sourceRange.endOffset);
        const renderedSourceText = document.createRange();
        renderedSourceText.selectNodeContents(sourceElement);
        if (renderedSourceText.toString() !== sourceText) {
          return null;
        }
        const localStart = textOffsetWithinElement(sourceElement, textNode, selectedOffsets.start);
        const localEnd = textOffsetWithinElement(sourceElement, textNode, selectedOffsets.end);
        const startOffset = sourceRange.startOffset + localStart;
        const endOffset = sourceRange.startOffset + localEnd;
        if (
          endOffset <= startOffset ||
          startOffset < sourceRange.startOffset ||
          endOffset > sourceRange.endOffset
        ) {
          return null;
        }
        fragments.push({ startOffset, endOffset });
      }
    }
    current = walker.nextNode();
  }

  if (fragments.length === 0) {
    return null;
  }
  let previousEnd = -1;
  for (const fragment of fragments) {
    if (fragment.startOffset < previousEnd) {
      return null;
    }
    previousEnd = fragment.endOffset;
  }
  const startOffset = fragments[0]?.startOffset;
  const endOffset = fragments.at(-1)?.endOffset;
  if (startOffset === undefined || endOffset === undefined || endOffset <= startOffset) {
    return null;
  }
  return {
    startOffset,
    endOffset,
    selectedText: rawText.slice(startOffset, endOffset),
  };
}

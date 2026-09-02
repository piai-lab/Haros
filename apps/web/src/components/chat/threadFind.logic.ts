// FILE: threadFind.logic.ts
// Purpose: Search the complete projected transcript independently of the virtualized DOM.

import { type MessageId } from "@harnessos/contracts";
import { toString as markdownNodeToString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { repairMarkdownTableDelimiters } from "../../lib/markdownTableRepair";
import { deriveDisplayedUserMessageState } from "../../lib/terminalContext";
import { type TimelineEntry } from "../../session-logic";
import type { ChatMessage } from "../../types";
import {
  buildInlineTerminalContextText,
  textContainsInlineTerminalContextLabels,
} from "./userMessageTerminalContexts";

export interface ThreadFindRange {
  startOffset: number;
  endOffset: number;
}

export interface ThreadFindDocument {
  messageId: MessageId;
  text: string;
}

export interface ThreadFindMatch extends ThreadFindRange {
  messageId: MessageId;
  occurrenceIndex: number;
}

export interface ThreadFindHighlight {
  query: string;
  activeMatch: ThreadFindMatch | null;
  scrollRequestId: number | null;
}

type MarkdownProjectionNode = {
  readonly type?: string;
  readonly value?: string;
  readonly children?: readonly MarkdownProjectionNode[];
};

const markdownProjectionParser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

function projectMarkdownNode(node: MarkdownProjectionNode): string {
  if (node.type === "definition" || node.type === "html" || node.type === "thematicBreak") {
    return "";
  }
  if (node.type === "break") return "\n";
  if (node.type === "code" || node.type === "math") return node.value ?? "";
  if (
    node.type === "root" ||
    node.type === "blockquote" ||
    node.type === "list" ||
    node.type === "listItem" ||
    node.type === "table"
  ) {
    return (node.children ?? [])
      .map(projectMarkdownNode)
      .filter((part) => part.length > 0)
      .join("\n");
  }
  if (node.type === "tableRow") {
    return (node.children ?? [])
      .map(projectMarkdownNode)
      .filter((part) => part.length > 0)
      .join(" ");
  }
  // Image alt text is accessible metadata, but it is not a paintable text node
  // in the rendered transcript. Excluding it keeps match counts and highlights
  // on the same user-visible surface.
  return markdownNodeToString(node as never, { includeImageAlt: false });
}

export function projectMarkdownVisibleText(source: string): string {
  try {
    return projectMarkdownNode(markdownProjectionParser.parse(source) as MarkdownProjectionNode);
  } catch {
    // Streaming can temporarily leave incomplete Markdown. The plain source is
    // still searchable until the next parseable projection replaces it.
    return source;
  }
}

export function normalizeFindQuery(query: string): string {
  return query.trim();
}

export function collectCaseInsensitiveSubstringRanges(
  text: string,
  query: string,
): ThreadFindRange[] {
  const needle = normalizeFindQuery(query);
  if (needle.length === 0 || text.length === 0) return [];

  const ranges: ThreadFindRange[] = [];
  const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(escapedNeedle, "giu");
  for (const match of text.matchAll(pattern)) {
    const startOffset = match.index;
    ranges.push({ startOffset, endOffset: startOffset + match[0].length });
  }
  return ranges;
}

function messageHasVisibleMedia(message: ChatMessage): boolean {
  return (message.attachments ?? []).some(
    (attachment) =>
      attachment.type === "image" ||
      attachment.type === "file" ||
      attachment.type === "assistant-selection",
  );
}

export function resolveThreadFindDocumentText(message: ChatMessage): string {
  if (message.role === "user") {
    const displayed = deriveDisplayedUserMessageState(message.text, {
      hideImageOnlyBootstrapPrompt: messageHasVisibleMedia(message),
      messageId: message.id,
    });
    if (displayed.contexts.length === 0) return projectMarkdownVisibleText(displayed.visibleText);
    if (textContainsInlineTerminalContextLabels(displayed.visibleText, displayed.contexts)) {
      return projectMarkdownVisibleText(displayed.visibleText);
    }
    return projectMarkdownVisibleText(
      [buildInlineTerminalContextText(displayed.contexts), displayed.visibleText]
        .filter((part) => part.length > 0)
        .join(" "),
    );
  }
  return projectMarkdownVisibleText(repairMarkdownTableDelimiters(message.text));
}

interface CachedDocumentText {
  sourceText: string;
  documentText: string;
}

export interface ThreadFindDocumentTextCache {
  resolve: (message: ChatMessage) => string;
}

export function createThreadFindDocumentTextCache(): ThreadFindDocumentTextCache {
  const messages = new WeakMap<ChatMessage, CachedDocumentText>();
  return {
    resolve: (message) => {
      const cached = messages.get(message);
      if (cached?.sourceText === message.text) return cached.documentText;
      const documentText = resolveThreadFindDocumentText(message);
      messages.set(message, { sourceText: message.text, documentText });
      return documentText;
    },
  };
}

const defaultDocumentTextCache = createThreadFindDocumentTextCache();

export function collectThreadFindDocuments(
  timelineEntries: readonly TimelineEntry[],
  textCache: ThreadFindDocumentTextCache = defaultDocumentTextCache,
): ThreadFindDocument[] {
  const documents: ThreadFindDocument[] = [];
  for (const entry of timelineEntries) {
    if (entry.kind !== "message") continue;
    const text = textCache.resolve(entry.message);
    if (text.length > 0) documents.push({ messageId: entry.message.id, text });
  }
  return documents;
}

export function findThreadMatches(
  documents: readonly ThreadFindDocument[],
  query: string,
): ThreadFindMatch[] {
  const matches: ThreadFindMatch[] = [];
  for (const document of documents) {
    for (const [occurrenceIndex, range] of collectCaseInsensitiveSubstringRanges(
      document.text,
      query,
    ).entries()) {
      matches.push({ messageId: document.messageId, occurrenceIndex, ...range });
    }
  }
  return matches;
}

export function stepThreadFindIndex(
  matchCount: number,
  currentIndex: number,
  direction: "next" | "previous",
): number {
  if (matchCount <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= matchCount) {
    return direction === "next" ? 0 : matchCount - 1;
  }
  return direction === "next"
    ? (currentIndex + 1) % matchCount
    : (currentIndex - 1 + matchCount) % matchCount;
}

export function resolveThreadFindJump(
  matches: readonly ThreadFindMatch[],
  index: number,
): ThreadFindMatch | null {
  return index >= 0 && index < matches.length ? (matches[index] ?? null) : null;
}

export function eventTargetsInAppBrowser(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "[data-floating-browser-host='true'], [data-floating-browser-panel='true'], [data-browser-panel='true']",
    ) !== null
  );
}

export interface ThreadFindHighlightStore {
  readonly matchHighlightName: string;
  readonly activeHighlightName: string;
  get: () => ThreadFindHighlight | null;
  set: (value: ThreadFindHighlight | null) => void;
  requestNavigation: (value: ThreadFindMatch) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createThreadFindHighlightStore(scopeId = "default"): ThreadFindHighlightStore {
  let current: ThreadFindHighlight | null = null;
  let navigationSequence = 0;
  const listeners = new Set<() => void>();
  const safeScopeId = scopeId.replace(/[^A-Za-z0-9_-]/gu, "-");
  const publish = () => {
    for (const listener of listeners) listener();
  };
  return {
    matchHighlightName: `haros-thread-find-match-${safeScopeId}`,
    activeHighlightName: `haros-thread-find-active-${safeScopeId}`,
    get: () => current,
    set: (value) => {
      current = value ? { ...value, scrollRequestId: null } : null;
      publish();
    },
    requestNavigation: (value) => {
      if (current === null) return;
      navigationSequence += 1;
      current = { ...current, activeMatch: value, scrollRequestId: navigationSequence };
      publish();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// FILE: ChatMarkdown.tsx
// Purpose: Renders assistant and plan markdown with syntax highlighting and local file links.
// Layer: Web chat presentation component
// Exports: ChatMarkdown

import { TriangleAlertIcon } from "~/lib/icons";
import type { MessageId, ProviderMentionReference, ThreadMarker } from "@omnimind/contracts";
import { isLocalAbsolutePath } from "@omnimind/shared/path";
import "katex/dist/katex.min.css";
import React, {
  Children,
  type CSSProperties,
  Suspense,
  isValidElement,
  memo,
  use,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { defaultUrlTransform } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { resolveDiffThemeName, type DiffThemeName } from "../lib/diffRendering";
import { dedentCode, parseCodeFenceInfo } from "../lib/codeFence";
import { pathLooksLikeKnownFile } from "../file-icons";
import { isLocalImageMarkdownSrc } from "../lib/localImageUrls";
import {
  prepareMarkdownTableDelimiters,
  type MarkdownSourceOffsetProjection,
} from "../lib/markdownTableRepair";
import {
  getFileContextMenuPosition,
  showFileReferenceContextMenu,
} from "../lib/fileReferenceContextMenu";
import {
  connectMarkdownTableOverflow,
  refreshMarkdownTableOverflow,
} from "../lib/markdownTableOverflow";
import {
  TABLE_INTEGRITY_ACTUAL_COLUMNS_ATTRIBUTE,
  TABLE_INTEGRITY_EXPECTED_COLUMNS_ATTRIBUTE,
  TABLE_INTEGRITY_FALLBACK_TAG_NAME,
  createTableIntegrityRemarkPlugin,
} from "../lib/remarkTableIntegrity";
import { useTheme } from "../hooks/useTheme";
import { useSmoothStreamedText } from "../hooks/useSmoothStreamedText";
import { useThrottledStreamingValue } from "../hooks/useThrottledStreamingValue";
import { openWorkspaceFileReference, useWorkspaceFileOpener } from "../lib/workspaceFileOpener";
import { resolveMarkdownFileLinkTarget, rewriteMarkdownFileUriHref } from "../markdown-links";
import type { ExpandedImagePreview } from "./chat/ExpandedImagePreview";
import { GeneratedMarkdownImage } from "./chat/GeneratedMarkdownImage";
import { TerminalContextInlineChip } from "./chat/TerminalContextInlineChip";
import type { ParsedTerminalContextEntry } from "../lib/terminalContext";
import { formatInlineTerminalContextLabel } from "./chat/userMessageTerminalContexts";
import {
  COMPOSER_INLINE_CHIP_ICON_LABEL_GAP_CLASS_NAME,
  COMPOSER_INLINE_CHIP_TOKEN_ICON_CLASS_NAME,
} from "./composerInlineChip";
import { LinkChipIcon } from "./LinkChipIcon";
import { InlineAgentChip } from "./chat/InlineAgentChip";
import { InlineLinkChip } from "./InlineLinkChip";
import { InlineMentionChip } from "./chat/InlineMentionChip";
import { InlineSkillChip } from "./chat/InlineSkillChip";
import { InlineSlashCommandChip } from "./chat/InlineSlashCommandChip";
import { MarkdownCodeBlock } from "./chat/MarkdownCodeBlock";
import { MermaidCodeBlock } from "./chat/MermaidCodeBlock";
import {
  COMPOSER_CHIP_SEGMENT_ATTRIBUTE,
  COMPOSER_CHIP_TAG_NAME,
  TERMINAL_CONTEXT_CHIP_INDEX_ATTRIBUTE,
  TERMINAL_CONTEXT_CHIP_TAG_NAME,
  createComposerChipsRemarkPlugin,
  parseComposerChipSegment,
} from "../lib/remarkComposerChips";
import { useI18n } from "../i18n";
import {
  activeSelectionIntersectsElement,
  TRANSCRIPT_SOURCE_END_ATTRIBUTE,
  TRANSCRIPT_SOURCE_START_ATTRIBUTE,
  transcriptSourceRangeAttributes,
  type TranscriptSourceRange,
} from "./chat/transcriptSelectionSource";

const EXTERNAL_HTTP_HREF_PATTERN = /^https?:\/\//i;
// Trailing `:line` / `:line:col` position suffix on a resolved file link. Kept on
// the href (so opening jumps to the line) but stripped for icon/title resolution.
const MARKDOWN_LINK_POSITION_SUFFIX_PATTERN = /:\d+(?::\d+)?$/;
const MARKDOWN_EXTERNAL_LINK_CLASS_NAME =
  "inline font-medium text-[var(--info-foreground)] underline-offset-2 hover:underline";
const MARKDOWN_EXTERNAL_LINK_ICON_CLASS_NAME = `${COMPOSER_INLINE_CHIP_TOKEN_ICON_CLASS_NAME} ${COMPOSER_INLINE_CHIP_ICON_LABEL_GAP_CLASS_NAME}`;

function isExternalHttpHref(href: string | undefined): href is string {
  return typeof href === "string" && EXTERNAL_HTTP_HREF_PATTERN.test(href);
}

class CodeHighlightErrorBoundary extends React.Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface ChatMarkdownProps {
  text: string;
  cwd: string | undefined;
  isStreaming?: boolean;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  onImageExpand?: ((preview: ExpandedImagePreview) => void) | undefined;
  markers?: readonly ThreadMarker[] | undefined;
  /**
   * "user" renders a sent prompt: GFM plus hard line breaks (single newlines
   * survive the way they were typed), no math/KaTeX and no literal-dollar
   * rewriting (`$50` and `$skill` stay verbatim), and composer inline tokens
   * (skills, mentions, agents, bare links) render as the shared chips.
   */
  variant?: "assistant" | "user";
  /** Mention metadata for chip icon resolution; only used by the user variant. */
  mentionReferences?: ReadonlyArray<ProviderMentionReference> | undefined;
  /** Terminal selections rendered as inline chips inside user-message markdown. */
  terminalContexts?: ReadonlyArray<ParsedTerminalContextEntry> | undefined;
  /**
   * Makes GFM task-list checkboxes interactive. Receives the 1-based line of
   * the task item in `text` so the caller can flip that `[ ]` marker at the
   * source (line numbers stay valid because the internal dollar protection is
   * length- and newline-preserving). Without it checkboxes render read-only.
   */
  onTaskToggle?: ((input: { sourceLine: number; checked: boolean }) => void) | undefined;
  /** Canonical assistant Timeline body opt-in; all other Markdown keeps source rendering. */
  mermaidPresentation?: { readonly messageId: MessageId } | undefined;
}

// Source line of the enclosing task-list item, provided by the `li` override.
// The checkbox `input` element is synthesized by mdast-util-to-hast without
// position info, so it cannot read its own source location.
const TaskItemSourceLineContext = React.createContext<number | null>(null);

function MarkdownTaskCheckbox(props: {
  checked: boolean;
  onTaskToggle: ChatMarkdownProps["onTaskToggle"];
}) {
  const { checked, onTaskToggle } = props;
  const sourceLine = React.useContext(TaskItemSourceLineContext);
  const interactive = onTaskToggle !== undefined && sourceLine !== null;
  return (
    <input
      type="checkbox"
      className="chat-markdown-task-checkbox"
      checked={checked}
      disabled={!interactive}
      {...(interactive ? { onChange: () => onTaskToggle({ sourceLine, checked: !checked }) } : {})}
    />
  );
}

const CODE_FENCE_LANGUAGE_REGEX = /(?:^|\s)language-([^\s]+)/;
const MERMAID_FENCE_ORDINAL_ATTRIBUTE = "data-mermaid-ordinal";
type MarkdownRemarkPlugins = NonNullable<
  React.ComponentProps<typeof ReactMarkdown>["remarkPlugins"]
>;
type MarkdownRehypePlugins = NonNullable<
  React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"]
>;
const MARKDOWN_REMARK_PLUGINS: MarkdownRemarkPlugins = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: true }],
];

type RemarkNode = {
  type?: string;
  lang?: string | null;
  children?: RemarkNode[];
  data?: {
    hProperties?: Record<string, unknown>;
  };
};

function mermaidFenceOrdinalRemarkPlugin() {
  return (tree: RemarkNode) => {
    let ordinal = 0;
    const visit = (node: RemarkNode) => {
      if (node.type === "code" && node.lang?.toLowerCase() === "mermaid") {
        ordinal += 1;
        node.data ??= {};
        node.data.hProperties = {
          ...node.data.hProperties,
          [MERMAID_FENCE_ORDINAL_ATTRIBUTE]: ordinal,
        };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
// User prompts are casual typing, not authored markdown: hard-break single
// newlines and skip math entirely (the composer chip plugin is appended per
// render because it closes over the message's mention references).
const USER_MARKDOWN_REMARK_PLUGINS: MarkdownRemarkPlugins = [remarkGfm, remarkBreaks];
const USER_MARKDOWN_REHYPE_PLUGINS: MarkdownRehypePlugins = [];
const LITERAL_DOLLAR_PLACEHOLDER = "\uE000";
// `\$` is two source characters that render as a single `$`. Collapsing it to one placeholder used
// to shorten the protected string, which shifted every downstream offset (thread-marker positions
// are resolved against the raw text but applied against the parsed mdast positions). A two-character
// placeholder keeps `protectLiteralMarkdownDollars` length-preserving so those offsets stay aligned;
// it is restored ahead of the single-char placeholder (the two share no characters, so order is
// only for clarity).
const ESCAPED_DOLLAR_PLACEHOLDER = "\uE001\uE002";

function restoreLiteralDollarPlaceholders(value: string): string {
  return value
    .replaceAll(ESCAPED_DOLLAR_PLACEHOLDER, "$")
    .replaceAll(LITERAL_DOLLAR_PLACEHOLDER, "$")
    .replaceAll(encodeURIComponent(ESCAPED_DOLLAR_PLACEHOLDER), "$")
    .replaceAll(encodeURIComponent(LITERAL_DOLLAR_PLACEHOLDER), "$");
}

function markdownUrlTransform(href: string): string {
  const restoredHref = restoreLiteralDollarPlaceholders(href);
  return rewriteMarkdownFileUriHref(restoredHref) ?? defaultUrlTransform(restoredHref);
}

function focusMarkdownFragment(href: string): void {
  const encodedTargetId = href.slice(1);
  let targetId = encodedTargetId;
  try {
    targetId = decodeURIComponent(encodedTargetId);
  } catch {
    // Keep the literal fragment when malformed percent escapes make decoding impossible.
  }

  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ block: "nearest" });
  target.focus({ preventScroll: true });
}

function restoreLiteralDollarsInNode(node: unknown): void {
  if (!node || typeof node !== "object") {
    return;
  }

  if ("type" in node && node.type === "text" && "value" in node && typeof node.value === "string") {
    node.value = restoreLiteralDollarPlaceholders(node.value);
  }

  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      restoreLiteralDollarsInNode(child);
    }
  }
}

function rehypeRestoreLiteralDollars() {
  return (tree: unknown) => {
    restoreLiteralDollarsInNode(tree);
  };
}

const MARKDOWN_REHYPE_PLUGINS: MarkdownRehypePlugins = [
  [rehypeKatex, { output: "htmlAndMathml", strict: false, throwOnError: false }],
  rehypeRestoreLiteralDollars,
];
type MarkdownTextNode = {
  type: "text";
  value: string;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};
type MarkdownInlineCodeNode = {
  type: "inlineCode";
  value: string;
  position?: MarkdownTextNode["position"];
  data?: {
    hProperties?: Record<string, unknown>;
  };
};
type MarkdownParentNode = {
  type?: string;
  children?: MarkdownNode[];
};
type MarkdownNode =
  | MarkdownTextNode
  | MarkdownInlineCodeNode
  | MarkdownParentNode
  | Record<string, unknown>;
type RenderableThreadMarker = ThreadMarker & { className: string };
type ThreadMarkerFragmentContinuity = {
  readonly continuesBefore: boolean;
  readonly continuesAfter: boolean;
};

// The "active" ring (a transient deep-link highlight) is applied imperatively by the timeline so
// it never re-parses the markdown tree; this className is the stable, parse-time-only part.
function markerClassNameFor(marker: ThreadMarker) {
  return [
    "thread-marker",
    marker.style === "highlight" ? "thread-marker-highlight" : "thread-marker-underline",
    `thread-marker-${marker.color}`,
    marker.done ? "thread-marker-done" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Joins marker fragments split by markdown nodes so bold/code boundaries still read as one mark.
function markerFragmentClassNameFor(
  marker: RenderableThreadMarker,
  continuity: ThreadMarkerFragmentContinuity,
): string {
  return [
    marker.className,
    continuity.continuesBefore ? "thread-marker-continues-before" : "",
    continuity.continuesAfter ? "thread-marker-continues-after" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeRenderableMarkers(input: {
  rawText: string;
  projection: MarkdownSourceOffsetProjection;
  markers: readonly ThreadMarker[] | undefined;
}): RenderableThreadMarker[] {
  const markers = input.markers ?? [];
  const result: RenderableThreadMarker[] = [];
  let previousRawEnd = -1;
  for (const marker of markers.toSorted((left, right) => left.startOffset - right.startOffset)) {
    if (marker.startOffset < previousRawEnd) {
      continue;
    }
    if (marker.endOffset <= marker.startOffset || marker.endOffset > input.rawText.length) {
      continue;
    }
    if (input.rawText.slice(marker.startOffset, marker.endOffset) !== marker.selectedText) {
      continue;
    }
    const renderedStartOffset = input.projection.toRenderedBoundary(marker.startOffset);
    const renderedEndOffset = input.projection.toRenderedBoundary(marker.endOffset);
    if (
      renderedStartOffset === null ||
      renderedEndOffset === null ||
      renderedEndOffset <= renderedStartOffset
    ) {
      continue;
    }
    result.push({
      ...marker,
      startOffset: renderedStartOffset,
      endOffset: renderedEndOffset,
      className: markerClassNameFor(marker),
    });
    previousRawEnd = marker.endOffset;
  }
  return result;
}

function createThreadMarkerRemarkPlugin(input: {
  rawText: string;
  projection: MarkdownSourceOffsetProjection;
  markers: readonly ThreadMarker[] | undefined;
}) {
  const markers = normalizeRenderableMarkers(input);
  return () => (tree: MarkdownNode) => {
    if (markers.length === 0) {
      return;
    }
    applyThreadMarkersToNode(tree, markers);
  };
}

function resolveLinearTextSourceRange(input: {
  node: MarkdownTextNode;
  rawText: string;
  projection: MarkdownSourceOffsetProjection;
}): TranscriptSourceRange | null {
  const renderedStart = input.node.position?.start?.offset;
  const renderedEnd = input.node.position?.end?.offset;
  if (renderedStart === undefined || renderedEnd === undefined) {
    return null;
  }
  const startOffset = input.projection.toRawBoundary(renderedStart);
  const endOffset = input.projection.toRawBoundary(renderedEnd);
  if (startOffset === null || endOffset === null || endOffset <= startOffset) {
    return null;
  }
  const visibleValue = restoreLiteralDollarPlaceholders(input.node.value);
  return input.rawText.slice(startOffset, endOffset) === visibleValue
    ? { startOffset, endOffset }
    : null;
}

function resolveInlineCodeSourceRange(input: {
  node: MarkdownInlineCodeNode;
  rawText: string;
  projection: MarkdownSourceOffsetProjection;
}): TranscriptSourceRange | null {
  const renderedStart = input.node.position?.start?.offset;
  const renderedEnd = input.node.position?.end?.offset;
  if (renderedStart === undefined || renderedEnd === undefined) {
    return null;
  }
  const rawStart = input.projection.toRawBoundary(renderedStart);
  const rawEnd = input.projection.toRawBoundary(renderedEnd);
  if (rawStart === null || rawEnd === null || rawEnd <= rawStart) {
    return null;
  }
  const rawSlice = input.rawText.slice(rawStart, rawEnd);
  let delimiterLength = 0;
  while (rawSlice[delimiterLength] === "`") {
    delimiterLength += 1;
  }
  if (
    delimiterLength === 0 ||
    rawSlice.slice(rawSlice.length - delimiterLength) !== "`".repeat(delimiterLength)
  ) {
    return null;
  }
  const contentStart = delimiterLength;
  const contentEnd = rawSlice.length - delimiterLength;
  const rawContent = rawSlice.slice(contentStart, contentEnd);
  if (rawContent === input.node.value) {
    return {
      startOffset: rawStart + contentStart,
      endOffset: rawStart + contentEnd,
    };
  }
  if (
    rawContent.startsWith(" ") &&
    rawContent.endsWith(" ") &&
    rawContent.trim().length > 0 &&
    rawContent.slice(1, -1) === input.node.value
  ) {
    return {
      startOffset: rawStart + contentStart + 1,
      endOffset: rawStart + contentEnd - 1,
    };
  }
  return null;
}

function createTranscriptSourceRemarkPlugin(input: {
  rawText: string;
  projection: MarkdownSourceOffsetProjection;
}) {
  return () => (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (
        !node ||
        typeof node !== "object" ||
        !("children" in node) ||
        !Array.isArray(node.children)
      ) {
        return;
      }
      const parent = node as MarkdownParentNode;
      parent.children = (parent.children ?? []).map((child) => {
        if (child && typeof child === "object" && "type" in child && child.type === "text") {
          const textNode = child as MarkdownTextNode;
          const range = resolveLinearTextSourceRange({
            node: textNode,
            rawText: input.rawText,
            projection: input.projection,
          });
          if (!range) {
            return child;
          }
          return {
            type: "transcriptSource",
            data: {
              hName: "span",
              hProperties: transcriptSourceRangeAttributes(range),
            },
            children: [child],
          };
        }
        if (child && typeof child === "object" && "type" in child && child.type === "inlineCode") {
          const inlineCodeNode = child as MarkdownInlineCodeNode;
          const range = resolveInlineCodeSourceRange({
            node: inlineCodeNode,
            rawText: input.rawText,
            projection: input.projection,
          });
          if (range) {
            inlineCodeNode.data ??= {};
            inlineCodeNode.data.hProperties = {
              ...inlineCodeNode.data.hProperties,
              ...transcriptSourceRangeAttributes(range),
            };
          }
          return child;
        }
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}

function applyThreadMarkersToNode(node: MarkdownNode, markers: readonly RenderableThreadMarker[]) {
  if (!node || typeof node !== "object" || !("children" in node) || !Array.isArray(node.children)) {
    return;
  }

  const parent = node as MarkdownParentNode;
  // The guard above already proved `children` is an array; `?? []` only satisfies the optional type.
  parent.children = (parent.children ?? []).flatMap((child) => {
    if (child && typeof child === "object" && "type" in child && child.type === "text") {
      return splitTextNodeWithMarkers(child as MarkdownTextNode, markers);
    }
    applyThreadMarkersToNode(child, markers);
    return [child];
  });
}

function splitTextNodeWithMarkers(
  node: MarkdownTextNode,
  markers: readonly RenderableThreadMarker[],
): MarkdownNode[] {
  const startOffset = node.position?.start?.offset;
  const endOffset = node.position?.end?.offset;
  if (startOffset === undefined || endOffset === undefined) {
    return [node];
  }
  const overlappingMarkers: RenderableThreadMarker[] = [];
  for (const marker of markers) {
    if (marker.endOffset <= startOffset) {
      continue;
    }
    if (marker.startOffset >= endOffset) {
      break;
    }
    overlappingMarkers.push(marker);
  }
  if (overlappingMarkers.length === 0) {
    return [node];
  }

  const nodes: MarkdownNode[] = [];
  let cursor = 0;
  for (const marker of overlappingMarkers) {
    const markerStart = Math.max(0, marker.startOffset - startOffset);
    const markerEnd = Math.min(node.value.length, marker.endOffset - startOffset);
    if (markerStart < cursor || markerEnd > node.value.length) {
      continue;
    }
    const absoluteFragmentStart = startOffset + markerStart;
    const absoluteFragmentEnd = startOffset + markerEnd;
    if (markerStart > cursor) {
      nodes.push({
        type: "text",
        value: node.value.slice(cursor, markerStart),
      });
    }
    nodes.push({
      type: "threadMarker",
      data: {
        hName: "span",
        hProperties: {
          className: markerFragmentClassNameFor(marker, {
            continuesBefore: absoluteFragmentStart > marker.startOffset,
            continuesAfter: absoluteFragmentEnd < marker.endOffset,
          }),
          "data-thread-marker-id": marker.id,
          "data-thread-marker-style": marker.style,
          "data-thread-marker-color": marker.color,
        },
      },
      children: [{ type: "text", value: node.value.slice(markerStart, markerEnd) }],
    });
    cursor = markerEnd;
  }
  if (cursor < node.value.length) {
    nodes.push({ type: "text", value: node.value.slice(cursor) });
  }
  return nodes.length > 0 ? nodes : [node];
}
const INLINE_MATH_HINT_REGEX = /[\\^_=+\-*/<>()[\]{}]/;
const ALL_CAPS_DOLLAR_IDENTIFIER_REGEX = /^[A-Z][A-Z0-9_]{1,31}$/;

function isLineStart(value: string, index: number): boolean {
  return index === 0 || value[index - 1] === "\n";
}

function matchFenceDelimiter(
  value: string,
  index: number,
): { marker: "`" | "~"; length: number } | null {
  if (!isLineStart(value, index)) {
    return null;
  }

  const marker = value[index];
  if (marker !== "`" && marker !== "~") {
    return null;
  }

  let cursor = index;
  while (value[cursor] === marker) {
    cursor += 1;
  }

  return cursor - index >= 3 ? { marker, length: cursor - index } : null;
}

function findFenceEndIndex(
  value: string,
  index: number,
  marker: "`" | "~",
  length: number,
): number {
  let cursor = value.indexOf("\n", index);
  if (cursor === -1) {
    return value.length;
  }
  cursor += 1;

  while (cursor < value.length) {
    if (isLineStart(value, cursor) && value[cursor] === marker) {
      let markerEnd = cursor;
      while (value[markerEnd] === marker) {
        markerEnd += 1;
      }
      if (markerEnd - cursor >= length) {
        const lineEnd = value.indexOf("\n", markerEnd);
        return lineEnd === -1 ? value.length : lineEnd + 1;
      }
    }

    const nextLine = value.indexOf("\n", cursor);
    if (nextLine === -1) {
      return value.length;
    }
    cursor = nextLine + 1;
  }

  return value.length;
}

function findInlineCodeEndIndex(value: string, index: number, length: number): number {
  let cursor = index + length;
  while (cursor < value.length) {
    if (value[cursor] !== "`") {
      cursor += 1;
      continue;
    }

    let markerEnd = cursor;
    while (value[markerEnd] === "`") {
      markerEnd += 1;
    }

    if (markerEnd - cursor === length) {
      return markerEnd;
    }
    cursor = markerEnd;
  }

  return value.length;
}

function looksLikeInlineMath(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (ALL_CAPS_DOLLAR_IDENTIFIER_REGEX.test(trimmed)) {
    return false;
  }
  if (INLINE_MATH_HINT_REGEX.test(trimmed)) {
    return true;
  }
  return /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(trimmed);
}

// Reject obvious literal/currency dollars before searching for a closing math delimiter.
function canOpenInlineMath(value: string, index: number): boolean {
  const next = value[index + 1];
  if (!next || /\s|\d/.test(next)) {
    return false;
  }
  return true;
}

// Markdown math delimiters should hug content; loose "$ " endings are treated as prose.
function canCloseInlineMath(value: string, index: number): boolean {
  const previous = value[index - 1];
  if (!previous || /\s/.test(previous)) {
    return false;
  }
  return true;
}

function findInlineMathClosingDollar(value: string, index: number): number {
  let cursor = index;
  while (cursor < value.length) {
    if (value[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (value[cursor] === "$") {
      return canCloseInlineMath(value, cursor) ? cursor : -1;
    }
    cursor += 1;
  }
  return -1;
}

function protectLiteralDollarsInPlainText(value: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] === "\\" && value[cursor + 1] === "$") {
      result += ESCAPED_DOLLAR_PLACEHOLDER;
      cursor += 2;
      continue;
    }

    if (value.startsWith("$$", cursor)) {
      const closingIndex = value.indexOf("$$", cursor + 2);
      if (closingIndex === -1) {
        result += `${LITERAL_DOLLAR_PLACEHOLDER}${LITERAL_DOLLAR_PLACEHOLDER}`;
        cursor += 2;
        continue;
      }
      result += value.slice(cursor, closingIndex + 2);
      cursor = closingIndex + 2;
      continue;
    }

    if (value[cursor] === "$") {
      if (!canOpenInlineMath(value, cursor)) {
        result += LITERAL_DOLLAR_PLACEHOLDER;
        cursor += 1;
        continue;
      }

      const closingIndex = findInlineMathClosingDollar(value, cursor + 1);
      if (closingIndex === -1) {
        result += LITERAL_DOLLAR_PLACEHOLDER;
        cursor += 1;
        continue;
      }

      const content = value.slice(cursor + 1, closingIndex);
      result += looksLikeInlineMath(content)
        ? `$${content}$`
        : `${LITERAL_DOLLAR_PLACEHOLDER}${content}${LITERAL_DOLLAR_PLACEHOLDER}`;
      cursor = closingIndex + 1;
      continue;
    }

    result += value[cursor];
    cursor += 1;
  }

  return result;
}

function findMarkdownBracketEnd(value: string, startIndex: number): number {
  let depth = 0;
  let cursor = startIndex;

  while (cursor < value.length) {
    if (value[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (value[cursor] === "[") {
      depth += 1;
    } else if (value[cursor] === "]") {
      depth -= 1;
      if (depth === 0) {
        return cursor;
      }
    }
    cursor += 1;
  }

  return -1;
}

function findMarkdownParenEnd(value: string, startIndex: number): number {
  let depth = 0;
  let cursor = startIndex;

  while (cursor < value.length) {
    if (value[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (value[cursor] === "(") {
      depth += 1;
    } else if (value[cursor] === ")") {
      depth -= 1;
      if (depth === 0) {
        return cursor;
      }
    }
    cursor += 1;
  }

  return -1;
}

function findInlineMarkdownLinkEnd(value: string, index: number): number {
  const bracketStart = value[index] === "!" && value[index + 1] === "[" ? index + 1 : index;
  if (value[bracketStart] !== "[") {
    return -1;
  }

  const bracketEnd = findMarkdownBracketEnd(value, bracketStart);
  if (bracketEnd === -1 || value[bracketEnd + 1] !== "(") {
    return -1;
  }

  const parenEnd = findMarkdownParenEnd(value, bracketEnd + 1);
  return parenEnd === -1 ? -1 : parenEnd + 1;
}

function protectLiteralDollarsInMarkdownLinks(value: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    const isLinkStart =
      value[cursor] === "[" || (value[cursor] === "!" && value[cursor + 1] === "[");
    if (!isLinkStart) {
      const nextLinkStart = value.indexOf("[", cursor);
      const nextImageStart = value.indexOf("![", cursor);
      const candidates = [nextLinkStart, nextImageStart].filter((candidate) => candidate >= 0);
      const nextIndex = candidates.length > 0 ? Math.min(...candidates) : value.length;
      result += protectLiteralDollarsInPlainText(value.slice(cursor, nextIndex));
      cursor = nextIndex;
      continue;
    }

    const linkEnd = findInlineMarkdownLinkEnd(value, cursor);
    if (linkEnd === -1) {
      result += protectLiteralDollarsInPlainText(value[cursor] ?? "");
      cursor += 1;
      continue;
    }

    // Inline links are parsed after math, so protect route params like `_chat.$threadId.tsx`.
    result += value.slice(cursor, linkEnd).replaceAll("$", LITERAL_DOLLAR_PLACEHOLDER);
    cursor = linkEnd;
  }

  return result;
}

// Tighten single-dollar math so currency and escaped dollars stay literal without touching code spans.
function protectLiteralMarkdownDollars(value: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    const fenceDelimiter = matchFenceDelimiter(value, cursor);
    if (fenceDelimiter) {
      const fenceEndIndex = findFenceEndIndex(
        value,
        cursor,
        fenceDelimiter.marker,
        fenceDelimiter.length,
      );
      result += value.slice(cursor, fenceEndIndex);
      cursor = fenceEndIndex;
      continue;
    }

    if (value[cursor] === "`") {
      let markerEnd = cursor;
      while (value[markerEnd] === "`") {
        markerEnd += 1;
      }
      const inlineCodeEndIndex = findInlineCodeEndIndex(value, cursor, markerEnd - cursor);
      result += value.slice(cursor, inlineCodeEndIndex);
      cursor = inlineCodeEndIndex;
      continue;
    }

    let nextCodeIndex = cursor;
    while (nextCodeIndex < value.length) {
      if (value[nextCodeIndex] === "`" || matchFenceDelimiter(value, nextCodeIndex)) {
        break;
      }
      nextCodeIndex += 1;
    }

    result += protectLiteralDollarsInMarkdownLinks(value.slice(cursor, nextCodeIndex));
    cursor = nextCodeIndex;
  }

  return result;
}

// Returns the raw fence info string (the token after ```), e.g. "ts" or the
// Cursor reference form "173:186:packages/shared/src/model.ts". Parsing into a
// highlighter language + file metadata is handled by `parseCodeFenceInfo`.
function extractRawFenceInfo(className: string | undefined): string {
  const match = className?.match(CODE_FENCE_LANGUAGE_REGEX);
  return match?.[1] ?? "text";
}

function nodeToPlainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => nodeToPlainText(child)).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeToPlainText(node.props.children);
  }
  return "";
}

function transcriptSourceRangeFromHastNode(node: unknown): TranscriptSourceRange | null {
  if (!node || typeof node !== "object") {
    return null;
  }
  const record = node as {
    properties?: Record<string, unknown>;
    children?: unknown[];
  };
  const properties = record.properties;
  if (properties) {
    const rawStart =
      properties[TRANSCRIPT_SOURCE_START_ATTRIBUTE] ?? properties.dataTranscriptSourceStart;
    const rawEnd =
      properties[TRANSCRIPT_SOURCE_END_ATTRIBUTE] ?? properties.dataTranscriptSourceEnd;
    const startOffset =
      typeof rawStart === "number" ? rawStart : Number.parseInt(String(rawStart), 10);
    const endOffset = typeof rawEnd === "number" ? rawEnd : Number.parseInt(String(rawEnd), 10);
    if (
      Number.isInteger(startOffset) &&
      Number.isInteger(endOffset) &&
      startOffset >= 0 &&
      endOffset > startOffset
    ) {
      return { startOffset, endOffset };
    }
  }
  const childRanges = (record.children ?? [])
    .map((child) => transcriptSourceRangeFromHastNode(child))
    .filter((range): range is TranscriptSourceRange => range !== null);
  return childRanges.length === 1 ? (childRanges[0] ?? null) : null;
}

function MarkdownTable({ children, className, ...props }: React.ComponentPropsWithoutRef<"table">) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const regionLabel = t("markdown.table.scrollRegionLabel");

  useEffect(() => {
    const frame = frameRef.current;
    const viewport = viewportRef.current;
    if (!frame || !viewport) {
      return;
    }
    return connectMarkdownTableOverflow({ frame, viewport, regionLabel });
  }, [regionLabel]);

  // Streamed Markdown can add columns without changing the viewport's own size. Re-check
  // after each committed table render; the DOM-only update avoids a second React render.
  useEffect(() => {
    const frame = frameRef.current;
    const viewport = viewportRef.current;
    if (frame && viewport) {
      refreshMarkdownTableOverflow({ frame, viewport, regionLabel });
    }
  }, [children, regionLabel]);

  return (
    <div
      ref={frameRef}
      className="chat-markdown-table-frame"
      data-overflow="false"
      data-scroll-start="true"
      data-scroll-end="true"
    >
      <div ref={viewportRef} className="chat-markdown-table-viewport" tabIndex={-1}>
        <table {...props} className={className}>
          {children}
        </table>
      </div>
    </div>
  );
}

function MarkdownTableIntegrityFallback(props: {
  children?: ReactNode;
  expectedColumns?: string | undefined;
  actualColumns?: string | undefined;
}) {
  const { t } = useI18n();
  const rawSource = nodeToPlainText(props.children);
  return (
    <details className="chat-markdown-table-integrity">
      <summary>
        <TriangleAlertIcon aria-hidden="true" />
        <span>{t("markdown.table.integrityTitle")}</span>
      </summary>
      <div className="chat-markdown-table-integrity__body">
        <p>
          {t("markdown.table.integrityDescription", {
            expected: props.expectedColumns ?? "?",
            actual: props.actualColumns ?? "?",
          })}
        </p>
        <pre>
          <code>{rawSource}</code>
        </pre>
      </div>
    </details>
  );
}

function extractCodeBlock(children: ReactNode): {
  className: string | undefined;
  code: string;
  mermaidOrdinal: number | null;
} | null {
  const childNodes = Children.toArray(children);
  if (childNodes.length !== 1) {
    return null;
  }

  // The single child is the fenced code element. Its rendered `type` is the
  // custom `code` component (not the string "code") once we override `code`
  // below, so detect by shape (a valid element carrying the code text) rather
  // than by tag identity. `pre` only ever wraps a code element in markdown.
  const onlyChild = childNodes[0];
  if (
    !isValidElement<{
      className?: string;
      children?: ReactNode;
      [MERMAID_FENCE_ORDINAL_ATTRIBUTE]?: string | number;
    }>(onlyChild)
  ) {
    return null;
  }

  const rawOrdinal = onlyChild.props[MERMAID_FENCE_ORDINAL_ATTRIBUTE];
  const mermaidOrdinal =
    typeof rawOrdinal === "number"
      ? rawOrdinal
      : typeof rawOrdinal === "string"
        ? Number.parseInt(rawOrdinal, 10)
        : Number.NaN;

  return {
    className: onlyChild.props.className,
    code: nodeToPlainText(onlyChild.props.children),
    mermaidOrdinal: Number.isInteger(mermaidOrdinal) ? mermaidOrdinal : null,
  };
}

const INLINE_CODE_FILE_PATH_MAX_LENGTH = 120;

// Decides whether an inline code span names a file/path that should render as a
// mention chip (icon + medium label), matching how a file reads in the composer.
// Conservative on purpose: requires a recognized filename/extension and rejects
// whitespace and URLs so ordinary prose tokens stay plain inline code.
function inlineCodeFilePath(raw: string): string | null {
  // Strip a pair of surrounding quotes/backticks the author may have wrapped the
  // path in (e.g. `'src/data/social-metrics.ts'`).
  const value = raw.trim().replace(/^['"`]+|['"`]+$/g, "");
  if (
    value.length === 0 ||
    value.length > INLINE_CODE_FILE_PATH_MAX_LENGTH ||
    /\s/.test(value) ||
    value.includes("://")
  ) {
    return null;
  }
  return pathLooksLikeKnownFile(value) ? value : null;
}

// Shared openable file chip: the same mention-chip UI (file icon + medium label)
// used for both assistant markdown file links and inline code that names a file.
// A plain click prefers the surface's in-app viewer (right-dock file pane);
// meta/ctrl-click — or a surface without a viewer — opens the preferred
// external editor. `targetPath` may carry a `:line` suffix (used to open); the
// chip icon and title use the position-free path.
function OpenableFileChip(props: {
  targetPath: string;
  theme: "light" | "dark";
  label?: ReactNode;
  href?: string;
  sourceRange?: TranscriptSourceRange;
}) {
  const { t } = useI18n();
  const opener = useWorkspaceFileOpener();
  const chipPath = props.targetPath.replace(MARKDOWN_LINK_POSITION_SUFFIX_PATTERN, "");
  const revealPath = isLocalAbsolutePath(chipPath) ? chipPath : undefined;
  return (
    <InlineMentionChip
      path={chipPath}
      theme={props.theme}
      selectionMode="document"
      {...(props.sourceRange ? { sourceRange: props.sourceRange } : {})}
      href={props.href ?? props.targetPath}
      onActivate={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const forceExternalEditor = event.metaKey || event.ctrlKey;
        openWorkspaceFileReference(forceExternalEditor ? null : opener, props.targetPath);
      }}
      onContextMenu={(event) => {
        if (activeSelectionIntersectsElement(event.currentTarget)) {
          return;
        }
        const menu = showFileReferenceContextMenu({
          path: chipPath,
          ...(revealPath ? { revealPath } : {}),
          position: getFileContextMenuPosition(event),
          onReferenceInChat: undefined,
          desktopOnly: true,
          t,
        });
        if (menu === false) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        void menu;
      }}
      {...(opener?.prefetchFile
        ? { onHoverPrefetch: () => opener.prefetchFile?.(props.targetPath) }
        : {})}
      {...(props.label !== undefined ? { label: props.label } : {})}
    />
  );
}

// Renders the custom element emitted by the composer-chips remark plugin with the
// shared chip components, so chips in a sent message match the composer exactly.
function ComposerChipElement(props: {
  serializedSegment: string | undefined;
  theme: "light" | "dark";
  mentionReferences: ReadonlyArray<ProviderMentionReference>;
}) {
  const segment = parseComposerChipSegment(props.serializedSegment);
  if (!segment) {
    return null;
  }
  if (segment.type === "skill") {
    return <InlineSkillChip skillName={segment.name} selectionMode="document" />;
  }
  if (segment.type === "mention") {
    return (
      <InlineMentionChip
        path={segment.path}
        theme={props.theme}
        selectionMode="document"
        mentionReferences={props.mentionReferences}
        {...(segment.kind ? { kind: segment.kind } : {})}
      />
    );
  }
  if (segment.type === "agent-mention") {
    return <InlineAgentChip alias={segment.alias} color={segment.color} selectionMode="document" />;
  }
  if (segment.type === "slash-command") {
    return <InlineSlashCommandChip command={segment.command} selectionMode="document" />;
  }
  return <InlineLinkChip url={segment.url} interactive selectionMode="document" />;
}

interface SuspenseShikiCodeBlockProps {
  language: string;
  code: string;
  themeName: DiffThemeName;
  isStreaming: boolean;
}

type SyntaxHighlightingModule = typeof import("../lib/syntaxHighlighting");
let syntaxHighlightingModulePromise: Promise<SyntaxHighlightingModule> | null = null;

function getSyntaxHighlightingModulePromise(): Promise<SyntaxHighlightingModule> {
  syntaxHighlightingModulePromise ??= import("../lib/syntaxHighlighting");
  return syntaxHighlightingModulePromise;
}

const STREAMING_CODE_HIGHLIGHT_INTERVAL_MS = 160;
const STREAMING_CODE_HIGHLIGHT_MAX_INTERVAL_MS = 1_000;
const STREAMING_CODE_HIGHLIGHT_BASE_CHARS = 8_000;
const STREAMING_CODE_HIGHLIGHT_SLOW_CHARS = 80_000;

export function streamingCodeHighlightIntervalMs(codeLength: number): number {
  if (codeLength <= STREAMING_CODE_HIGHLIGHT_BASE_CHARS) {
    return STREAMING_CODE_HIGHLIGHT_INTERVAL_MS;
  }
  const progress = Math.min(
    1,
    (codeLength - STREAMING_CODE_HIGHLIGHT_BASE_CHARS) /
      (STREAMING_CODE_HIGHLIGHT_SLOW_CHARS - STREAMING_CODE_HIGHLIGHT_BASE_CHARS),
  );
  return Math.round(
    STREAMING_CODE_HIGHLIGHT_INTERVAL_MS +
      progress * (STREAMING_CODE_HIGHLIGHT_MAX_INTERVAL_MS - STREAMING_CODE_HIGHLIGHT_INTERVAL_MS),
  );
}

function SuspenseShikiCodeBlock({
  language,
  code: liveCode,
  themeName,
  isStreaming,
}: SuspenseShikiCodeBlockProps) {
  const code = useThrottledStreamingValue(
    liveCode,
    isStreaming,
    streamingCodeHighlightIntervalMs(liveCode.length),
  );
  const syntaxHighlighting = use(getSyntaxHighlightingModulePromise());
  return (
    <LoadedShikiCodeBlock
      syntaxHighlighting={syntaxHighlighting}
      language={language}
      code={code}
      themeName={themeName}
      isStreaming={isStreaming}
    />
  );
}

function LoadedShikiCodeBlock({
  syntaxHighlighting,
  language,
  code,
  themeName,
  isStreaming,
}: SuspenseShikiCodeBlockProps & {
  syntaxHighlighting: SyntaxHighlightingModule;
}) {
  const cacheKey = syntaxHighlighting.createSyntaxHighlightCacheKey(code, language, themeName);
  const cachedHighlightedHtml = !isStreaming
    ? syntaxHighlighting.getCachedSyntaxHighlightedHtml(cacheKey)
    : null;

  if (cachedHighlightedHtml != null) {
    return (
      <div
        className="chat-markdown-shiki"
        dangerouslySetInnerHTML={{ __html: cachedHighlightedHtml }}
      />
    );
  }

  // The uncached path lives in its own component: an early return above must
  // not change this component's hook order once the cache fills.
  return (
    <UncachedShikiCodeBlock
      syntaxHighlighting={syntaxHighlighting}
      cacheKey={cacheKey}
      language={language}
      code={code}
      themeName={themeName}
      isStreaming={isStreaming}
    />
  );
}

function UncachedShikiCodeBlock({
  syntaxHighlighting,
  cacheKey,
  language,
  code,
  themeName,
  isStreaming,
}: SuspenseShikiCodeBlockProps & {
  syntaxHighlighting: SyntaxHighlightingModule;
  cacheKey: string;
}) {
  const highlighter = use(syntaxHighlighting.getSyntaxHighlighterPromise(language));
  const highlightedHtml = syntaxHighlighting.highlightCodeToHtmlWithFallback(
    highlighter,
    code,
    language,
    themeName,
  );

  useEffect(() => {
    if (!isStreaming) {
      syntaxHighlighting.cacheSyntaxHighlightedHtml(cacheKey, highlightedHtml, code);
    }
  }, [cacheKey, code, highlightedHtml, isStreaming, syntaxHighlighting]);

  return (
    <div className="chat-markdown-shiki" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
  );
}

function ChatMarkdown({
  text,
  cwd,
  isStreaming: isStreamingProp,
  className: classNameProp,
  style,
  onImageExpand,
  markers,
  onTaskToggle,
  variant: variantProp,
  mentionReferences,
  terminalContexts,
  mermaidPresentation,
}: ChatMarkdownProps) {
  // Defaults applied with ?? in the body, not in the destructuring: default
  // values in parameter destructuring make React Compiler 1.0.0 bail on the
  // whole component (BuildHIR AssignmentPattern), losing its auto-memoization.
  const isStreaming = isStreamingProp ?? false;
  const className = classNameProp ?? "text-sm leading-[1.7]";
  const variant = variantProp ?? "assistant";
  const mermaidPresentationMessageId = mermaidPresentation?.messageId;
  const { t } = useI18n();
  const { resolvedTheme, engineWebSurfaceThemeSnapshot } = useTheme();
  const diffThemeName = resolveDiffThemeName(resolvedTheme);
  const isUserVariant = variant === "user";
  // Footnote ids are document-global. Scope every Markdown instance so two
  // messages can both use `[^1]` without their references crossing. `useId`
  // stays stable through streaming updates and hydration; punctuation is
  // removed so the generated ids remain straightforward fragment targets.
  const footnoteScopeId = useId().replaceAll(/[^A-Za-z0-9_-]/g, "");
  const footnoteClobberPrefix = `omnimind-footnote-${footnoteScopeId}-`;
  const footnoteLabelId = `${footnoteClobberPrefix}label`;
  const remarkRehypeOptions = useMemo(
    () => ({
      clobberPrefix: footnoteClobberPrefix,
      footnoteLabel: t("markdown.footnotes.label"),
      footnoteBackLabel(referenceIndex: number, rereferenceIndex: number) {
        const reference = `${referenceIndex + 1}${
          rereferenceIndex > 1 ? `-${rereferenceIndex}` : ""
        }`;
        return t("markdown.footnotes.backLabel", { reference });
      },
    }),
    [footnoteClobberPrefix, t],
  );
  // Reveal streamed text at a steady, adaptive cadence so tokens appear fluidly instead of
  // in the ~100ms network clumps that land in the store. No-ops (returns `text`) when not
  // streaming or under reduced motion. Governs cadence only; the deferred value below still
  // bounds the markdown re-parse cost.
  const smoothedText = useSmoothStreamedText(text, isStreaming);
  // Defer the source and its normalization as one unit. Besides avoiding normalization work for
  // stream frames React coalesces, this keeps the integrity fallback's exact source aligned with
  // the mdast positions parsed from the normalized text.
  const deferredSmoothedText = useDeferredValue(smoothedText);
  const renderedSourceText = isStreaming ? deferredSmoothedText : smoothedText;
  const preparedAssistantMarkdown = useMemo(
    () => (isUserVariant ? null : prepareMarkdownTableDelimiters(renderedSourceText)),
    [isUserVariant, renderedSourceText],
  );
  // The dollar rewrite exists to disambiguate math from currency; the user
  // variant has no math, so its text must stay byte-for-byte what was typed.
  // Table repair runs first and can change text length, so the thread-marker
  // plugin below must resolve offsets against the same repaired text.
  const renderedText = useMemo(
    () =>
      isUserVariant
        ? renderedSourceText
        : protectLiteralMarkdownDollars(
            preparedAssistantMarkdown?.renderedText ?? renderedSourceText,
          ),
    [isUserVariant, preparedAssistantMarkdown, renderedSourceText],
  );
  const tableIntegrityRemarkPlugin = useMemo(
    () => createTableIntegrityRemarkPlugin(renderedSourceText),
    [renderedSourceText],
  );
  const transcriptSourceRemarkPlugin = useMemo(
    () =>
      !isUserVariant && !isStreaming && preparedAssistantMarkdown
        ? createTranscriptSourceRemarkPlugin({
            rawText: renderedSourceText,
            projection: preparedAssistantMarkdown.projection,
          })
        : null,
    [isStreaming, isUserVariant, preparedAssistantMarkdown, renderedSourceText],
  );
  const preparedMarkerMarkdown = useMemo(() => prepareMarkdownTableDelimiters(text), [text]);
  // Persisted marker offsets always belong to raw message text. Project their
  // boundaries into the repaired parse source instead of validating them
  // against a string whose delimiter repair may have shifted later nodes.
  const threadMarkerRemarkPlugin = useMemo(
    () =>
      markers && markers.length > 0
        ? createThreadMarkerRemarkPlugin({
            rawText: text,
            projection: preparedMarkerMarkdown.projection,
            markers,
          })
        : null,
    [markers, preparedMarkerMarkdown, text],
  );
  const composerChipsRemarkPlugin = useMemo(
    () =>
      isUserVariant
        ? createComposerChipsRemarkPlugin(
            mentionReferences ?? [],
            (terminalContexts ?? []).map((context, index) => ({
              label: formatInlineTerminalContextLabel(context.header),
              index,
            })),
          )
        : null,
    [isUserVariant, mentionReferences, terminalContexts],
  );
  const mermaidOrdinalPlugin = mermaidPresentationMessageId
    ? mermaidFenceOrdinalRemarkPlugin
    : null;
  const remarkPlugins = useMemo<MarkdownRemarkPlugins>(() => {
    if (composerChipsRemarkPlugin) {
      return [
        ...USER_MARKDOWN_REMARK_PLUGINS,
        composerChipsRemarkPlugin,
        tableIntegrityRemarkPlugin,
      ];
    }
    const assistantPlugins = [
      ...MARKDOWN_REMARK_PLUGINS,
      ...(transcriptSourceRemarkPlugin ? [transcriptSourceRemarkPlugin] : []),
      ...(threadMarkerRemarkPlugin ? [threadMarkerRemarkPlugin] : []),
      tableIntegrityRemarkPlugin,
    ];
    return mermaidOrdinalPlugin ? [...assistantPlugins, mermaidOrdinalPlugin] : assistantPlugins;
  }, [
    composerChipsRemarkPlugin,
    mermaidOrdinalPlugin,
    tableIntegrityRemarkPlugin,
    transcriptSourceRemarkPlugin,
    threadMarkerRemarkPlugin,
  ]);
  const rehypePlugins = isUserVariant ? USER_MARKDOWN_REHYPE_PLUGINS : MARKDOWN_REHYPE_PLUGINS;
  const markdownComponents = useMemo<Components>(
    () => ({
      a({ node: _node, href, children, ...props }) {
        const restoredHref = href ? restoreLiteralDollarPlaceholders(href) : href;
        const isExternalHttp = isExternalHttpHref(restoredHref);
        const isOwnFootnoteFragment =
          restoredHref?.startsWith(`#${footnoteClobberPrefix}`) === true;
        if (isOwnFootnoteFragment) {
          const isFootnoteReference = _node?.properties.dataFootnoteRef === true;
          return (
            <a
              {...props}
              href={restoredHref}
              onClick={(event) => {
                props.onClick?.(event);
                if (event.defaultPrevented) return;
                event.preventDefault();
                focusMarkdownFragment(restoredHref);
              }}
              {...(isFootnoteReference ? { "aria-describedby": footnoteLabelId } : {})}
            >
              {children}
            </a>
          );
        }
        if (isUserVariant && isExternalHttp) {
          // GFM autolinks a pasted URL before the chips plugin can see it; when the
          // link text is just the URL itself, render the composer's link chip so a
          // pasted link looks identical in the composer and in the sent bubble.
          // Authored `[label](url)` links keep the regular anchor treatment below.
          const plainText = nodeToPlainText(children);
          if (
            plainText === restoredHref ||
            restoredHref === `http://${plainText}` ||
            restoredHref === `https://${plainText}`
          ) {
            return <InlineLinkChip url={restoredHref} interactive selectionMode="document" />;
          }
        }
        const targetPath = isExternalHttp ? null : resolveMarkdownFileLinkTarget(restoredHref, cwd);
        if (!targetPath) {
          return (
            <a
              {...props}
              href={restoredHref}
              target="_blank"
              rel="noopener noreferrer"
              className={isExternalHttp ? MARKDOWN_EXTERNAL_LINK_CLASS_NAME : props.className}
            >
              {isExternalHttp ? (
                <LinkChipIcon
                  url={restoredHref}
                  className={MARKDOWN_EXTERNAL_LINK_ICON_CLASS_NAME}
                />
              ) : null}
              {children}
            </a>
          );
        }

        // Local file links keep their openable behavior but adopt the shared
        // mention-chip UI (file icon + medium label). The link text is preserved
        // as the label.
        const sourceRange = transcriptSourceRangeFromHastNode(_node);
        return (
          <OpenableFileChip
            targetPath={targetPath}
            theme={resolvedTheme}
            label={nodeToPlainText(children)}
            {...(sourceRange ? { sourceRange } : {})}
            {...(restoredHref ? { href: restoredHref } : {})}
          />
        );
      },
      pre({ node: _node, children, ...props }) {
        const codeBlock = extractCodeBlock(children);
        if (!codeBlock) {
          return <pre {...props}>{children}</pre>;
        }

        const fence = parseCodeFenceInfo(extractRawFenceInfo(codeBlock.className));
        const code = dedentCode(codeBlock.code);

        const mermaidPresentationId =
          mermaidPresentationMessageId &&
          fence.language.toLowerCase() === "mermaid" &&
          codeBlock.mermaidOrdinal !== null
            ? `${mermaidPresentationMessageId}:${codeBlock.mermaidOrdinal}`
            : null;

        // A streaming info string arrives as `m`, `mer`, `mermai`, then `mermaid`.
        // Do not guess prefixes. Once the explicit Mermaid identity exists, its owner
        // presents one stable generation state without parsing, hashing, or highlighting
        // source. Other streaming fences remain plain source.
        if (isStreaming) {
          if (
            mermaidPresentationId &&
            mermaidPresentationMessageId &&
            codeBlock.mermaidOrdinal !== null
          ) {
            return (
              <MermaidCodeBlock
                code={code}
                fence={fence}
                messageId={mermaidPresentationMessageId}
                ordinal={codeBlock.mermaidOrdinal}
                theme={engineWebSurfaceThemeSnapshot}
                isStreaming
              />
            );
          }
          return (
            <MarkdownCodeBlock code={code} fence={fence}>
              <pre>
                <code>{code}</code>
              </pre>
            </MarkdownCodeBlock>
          );
        }

        if (
          mermaidPresentationId &&
          mermaidPresentationMessageId &&
          codeBlock.mermaidOrdinal !== null
        ) {
          return (
            <MermaidCodeBlock
              code={code}
              fence={fence}
              messageId={mermaidPresentationMessageId}
              ordinal={codeBlock.mermaidOrdinal}
              theme={engineWebSurfaceThemeSnapshot}
            />
          );
        }

        return (
          <MarkdownCodeBlock code={code} fence={fence}>
            <CodeHighlightErrorBoundary fallback={<pre {...props}>{children}</pre>}>
              <Suspense fallback={<pre {...props}>{children}</pre>}>
                <SuspenseShikiCodeBlock
                  language={fence.language}
                  code={code}
                  themeName={diffThemeName}
                  isStreaming={isStreaming}
                />
              </Suspense>
            </CodeHighlightErrorBoundary>
          </MarkdownCodeBlock>
        );
      },
      code({ node: _node, className, children, ...props }) {
        // Fenced blocks carry a `language-*` class and are rendered by `pre`;
        // only inline code (no class) that names a file becomes an openable
        // mention chip. The target is resolved against cwd so it opens like a
        // markdown file link; an unresolvable path still chips on its raw value.
        if (!className) {
          const filePath = inlineCodeFilePath(nodeToPlainText(children));
          if (filePath) {
            const targetPath = resolveMarkdownFileLinkTarget(filePath, cwd) ?? filePath;
            const sourceRange = transcriptSourceRangeFromHastNode(_node);
            return (
              <OpenableFileChip
                targetPath={targetPath}
                theme={resolvedTheme}
                {...(sourceRange ? { sourceRange } : {})}
              />
            );
          }
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      img({ node: _node, src, alt: altProp, ...props }) {
        const alt = altProp ?? "";
        const restoredSrc = src ? restoreLiteralDollarPlaceholders(src) : "";
        if (isLocalImageMarkdownSrc(restoredSrc)) {
          return (
            <GeneratedMarkdownImage
              src={restoredSrc}
              alt={alt}
              cwd={cwd}
              onImageExpand={onImageExpand}
            />
          );
        }
        return <img {...props} src={restoredSrc} alt={alt} loading="lazy" />;
      },
      li({ node, children, ...props }) {
        const isFootnoteDefinition = props.id?.startsWith(`${footnoteClobberPrefix}fn-`) === true;
        if (isFootnoteDefinition) {
          return (
            <li {...props} tabIndex={-1}>
              {children}
            </li>
          );
        }
        // Task items carry their source line down to the checkbox via context.
        const isTaskItem =
          typeof props.className === "string" && props.className.includes("task-list-item");
        const sourceLine = node?.position?.start.line ?? null;
        if (!isTaskItem || sourceLine === null) {
          return <li {...props}>{children}</li>;
        }
        return (
          <li {...props}>
            <TaskItemSourceLineContext.Provider value={sourceLine}>
              {children}
            </TaskItemSourceLineContext.Provider>
          </li>
        );
      },
      input({ node: _node, ...props }) {
        if (props.type === "checkbox") {
          return (
            <MarkdownTaskCheckbox checked={props.checked === true} onTaskToggle={onTaskToggle} />
          );
        }
        return <input {...props} />;
      },
      table({ node: _node, children, ...props }) {
        return <MarkdownTable {...props}>{children}</MarkdownTable>;
      },
      th({ node: _node, children, ...props }) {
        return (
          <th {...props} scope="col">
            {children}
          </th>
        );
      },
      h2({ node: _node, children, ...props }) {
        return (
          <h2 {...props} id={props.id === "footnote-label" ? footnoteLabelId : props.id}>
            {children}
          </h2>
        );
      },
      // Custom elements emitted by the composer-chips remark plugin (user
      // variant only; they never appear in assistant markdown). `Components`
      // only models intrinsic tags, so these entries are typed on their own
      // and cast into the map.
      ...({
        [COMPOSER_CHIP_TAG_NAME]: (props: {
          className?: string | undefined;
          [COMPOSER_CHIP_SEGMENT_ATTRIBUTE]?: string | undefined;
        }) => (
          <ComposerChipElement
            serializedSegment={props[COMPOSER_CHIP_SEGMENT_ATTRIBUTE]}
            theme={resolvedTheme}
            mentionReferences={mentionReferences ?? []}
          />
        ),
        [TERMINAL_CONTEXT_CHIP_TAG_NAME]: (props: {
          [TERMINAL_CONTEXT_CHIP_INDEX_ATTRIBUTE]?: string | undefined;
        }) => {
          const rawIndex = props[TERMINAL_CONTEXT_CHIP_INDEX_ATTRIBUTE];
          const index = rawIndex === undefined ? Number.NaN : Number.parseInt(rawIndex, 10);
          const context = Number.isInteger(index) ? terminalContexts?.[index] : undefined;
          if (!context) {
            return null;
          }
          const tooltipText =
            context.body.length > 0 ? `${context.header}\n${context.body}` : context.header;
          return <TerminalContextInlineChip label={context.header} tooltipText={tooltipText} />;
        },
        [TABLE_INTEGRITY_FALLBACK_TAG_NAME]: (props: {
          children?: ReactNode;
          [TABLE_INTEGRITY_EXPECTED_COLUMNS_ATTRIBUTE]?: string | undefined;
          [TABLE_INTEGRITY_ACTUAL_COLUMNS_ATTRIBUTE]?: string | undefined;
        }) => (
          <MarkdownTableIntegrityFallback
            expectedColumns={props[TABLE_INTEGRITY_EXPECTED_COLUMNS_ATTRIBUTE]}
            actualColumns={props[TABLE_INTEGRITY_ACTUAL_COLUMNS_ATTRIBUTE]}
          >
            {props.children}
          </MarkdownTableIntegrityFallback>
        ),
      } as unknown as Components),
    }),
    [
      cwd,
      diffThemeName,
      engineWebSurfaceThemeSnapshot,
      footnoteClobberPrefix,
      footnoteLabelId,
      isStreaming,
      isUserVariant,
      mentionReferences,
      mermaidPresentationMessageId,
      onImageExpand,
      onTaskToggle,
      resolvedTheme,
      terminalContexts,
    ],
  );

  return (
    <div
      className={`chat-markdown ${isUserVariant ? "chat-markdown--user " : ""}w-full min-w-0 ${className} text-foreground`}
      style={style}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        remarkRehypeOptions={remarkRehypeOptions}
        components={markdownComponents}
        urlTransform={markdownUrlTransform}
      >
        {renderedText}
      </ReactMarkdown>
    </div>
  );
}

export default memo(ChatMarkdown);

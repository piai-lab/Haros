// FILE: pullRequestContext.ts
// Purpose: Shared helpers for pull request context cards — the composer attachment that
//   "Repair" / "Add to chat" in the PR menu create instead of pasting a long prompt into
//   the editor. A card shows a short title + subtitle; its full prompt rides to the
//   Engine in a trailing <pull_request_context> block and is parsed back out to render
//   the same card in the transcript.
// Layer: Web composer utility

import { randomUUID } from "./utils";

/** What the card asks the agent to do. Drives the icon and the accessible labels. */
export const PULL_REQUEST_CONTEXT_SCOPES = [
  "reference",
  "comments",
  "checks",
  "conflicts",
  "everything",
] as const;
export type PullRequestContextScope = (typeof PULL_REQUEST_CONTEXT_SCOPES)[number];

export interface PullRequestContextDraft {
  id: string;
  createdAt: string;
  scope: PullRequestContextScope;
  prNumber: number;
  prUrl: string;
  /** Card headline, e.g. "1 failing check". */
  title: string;
  /** Card detail line, e.g. "Test, lint, build, and smoke". */
  subtitle: string;
  /** Full prompt handed to the Engine; never shown inline. */
  text: string;
}

export interface ParsedPullRequestContextEntry {
  index: number;
  scope: PullRequestContextScope;
  prNumber: number;
  prUrl: string;
  title: string;
  subtitle: string;
  text: string;
}

export interface ExtractedPullRequestContexts {
  promptText: string;
  pullRequestContexts: ParsedPullRequestContextEntry[];
}

const TRAILING_PULL_REQUEST_CONTEXT_BLOCK_PATTERN =
  /\n*<pull_request_context>\n([\s\S]*?)\n<\/pull_request_context>\s*$/;

interface SerializedPullRequestContextEntry {
  readonly scope: PullRequestContextScope;
  readonly prNumber: number;
  readonly prUrl: string;
  readonly title: string;
  readonly subtitle: string;
  readonly text: string;
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function isPullRequestContextScope(value: unknown): value is PullRequestContextScope {
  return (
    typeof value === "string" &&
    (PULL_REQUEST_CONTEXT_SCOPES as ReadonlyArray<string>).includes(value)
  );
}

// Null when the card has nothing to send: an empty prompt would attach a bubble that
// contributes nothing to the message.
export function normalizePullRequestContext(
  draft: PullRequestContextDraft,
): PullRequestContextDraft | null {
  const id = draft.id.trim();
  const text = normalizeText(draft.text);
  const title = normalizeLine(draft.title);
  if (id.length === 0 || text.length === 0 || title.length === 0) {
    return null;
  }
  if (!isPullRequestContextScope(draft.scope)) {
    return null;
  }
  if (!Number.isInteger(draft.prNumber) || draft.prNumber <= 0) {
    return null;
  }
  return {
    id,
    createdAt: draft.createdAt,
    scope: draft.scope,
    prNumber: draft.prNumber,
    prUrl: draft.prUrl.trim(),
    title,
    subtitle: normalizeLine(draft.subtitle),
    text,
  };
}

export function normalizePullRequestContexts(
  contexts: ReadonlyArray<PullRequestContextDraft>,
): PullRequestContextDraft[] {
  const normalized: PullRequestContextDraft[] = [];
  const seenIds = new Set<string>();
  for (const context of contexts) {
    const entry = normalizePullRequestContext(context);
    if (!entry || seenIds.has(entry.id)) {
      continue;
    }
    seenIds.add(entry.id);
    normalized.push(entry);
  }
  return normalized;
}

/**
 * Cards for the same PR + scope replace each other: clicking "Failing checks" twice must
 * not stack two identical bubbles, but a fresher snapshot should win over a stale one.
 */
export function pullRequestContextDedupKey(
  context: Pick<PullRequestContextDraft, "scope" | "prNumber" | "prUrl">,
): string {
  return `${context.scope}␞${context.prNumber}␞${context.prUrl}`;
}

export function formatPullRequestContextTitleSeed(
  contexts: ReadonlyArray<Pick<PullRequestContextDraft, "title" | "prNumber">>,
): string | null {
  const first = contexts[0];
  if (!first) {
    return null;
  }
  return contexts.length === 1
    ? `${first.title} on PR #${first.prNumber}`
    : `PR #${first.prNumber}`;
}

// --- Send-time serialization (cards -> trailing block)

export function buildPullRequestContextBlock(
  contexts: ReadonlyArray<PullRequestContextDraft>,
): string {
  const usable = normalizePullRequestContexts(contexts);
  if (usable.length === 0) {
    return "";
  }
  const payload: SerializedPullRequestContextEntry[] = usable.map((context) => ({
    scope: context.scope,
    prNumber: context.prNumber,
    prUrl: context.prUrl,
    title: context.title,
    subtitle: context.subtitle,
    text: context.text,
  }));
  return ["<pull_request_context>", JSON.stringify(payload), "</pull_request_context>"].join("\n");
}

export function appendPullRequestContextsToPrompt(
  prompt: string,
  contexts: ReadonlyArray<PullRequestContextDraft>,
): string {
  const block = buildPullRequestContextBlock(contexts);
  const trimmed = prompt.trim();
  if (block.length === 0) {
    return trimmed;
  }
  return trimmed.length > 0 ? `${trimmed}\n\n${block}` : block;
}

// --- Display-time extraction (trailing block -> cards)

function parseEntries(block: string): ParsedPullRequestContextEntry[] {
  try {
    const parsed: unknown = JSON.parse(block.trim());
    if (!Array.isArray(parsed)) {
      return [];
    }
    const entries: ParsedPullRequestContextEntry[] = [];
    for (const [index, entry] of parsed.entries()) {
      if (!entry || typeof entry !== "object") {
        return [];
      }
      const candidate = entry as Partial<Record<keyof SerializedPullRequestContextEntry, unknown>>;
      if (
        !isPullRequestContextScope(candidate.scope) ||
        typeof candidate.text !== "string" ||
        candidate.text.trim().length === 0 ||
        typeof candidate.title !== "string" ||
        candidate.title.trim().length === 0 ||
        typeof candidate.prNumber !== "number" ||
        !Number.isInteger(candidate.prNumber) ||
        candidate.prNumber <= 0 ||
        typeof candidate.prUrl !== "string" ||
        typeof candidate.subtitle !== "string"
      ) {
        return [];
      }
      entries.push({
        index: index + 1,
        scope: candidate.scope,
        prNumber: candidate.prNumber,
        prUrl: candidate.prUrl,
        title: candidate.title,
        subtitle: candidate.subtitle,
        text: candidate.text,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export function extractTrailingPullRequestContexts(prompt: string): ExtractedPullRequestContexts {
  const match = TRAILING_PULL_REQUEST_CONTEXT_BLOCK_PATTERN.exec(prompt);
  if (!match) {
    return { promptText: prompt, pullRequestContexts: [] };
  }
  const pullRequestContexts = parseEntries(match[1] ?? "");
  // Only hide a block when every entry can be represented by a card. Malformed
  // or future formats must remain visible and copyable as the original message.
  if (pullRequestContexts.length === 0) return { promptText: prompt, pullRequestContexts: [] };
  const promptText = prompt.slice(0, match.index).replace(/\n+$/, "");
  return { promptText, pullRequestContexts };
}

export function createPullRequestContextDraft(
  input: Omit<PullRequestContextDraft, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): PullRequestContextDraft | null {
  return normalizePullRequestContext({
    id: input.id?.trim() || randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    scope: input.scope,
    prNumber: input.prNumber,
    prUrl: input.prUrl,
    title: input.title,
    subtitle: input.subtitle,
    text: input.text,
  });
}

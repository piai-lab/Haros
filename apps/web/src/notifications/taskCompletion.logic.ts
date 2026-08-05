// FILE: taskCompletion.logic.ts
// Purpose: Detects concrete donor-owned attention and Terminal lifecycle notifications.
// Layer: Notification logic

import {
  defaultTerminalTitleForCliKind,
  type TerminalCliKind,
  type TerminalVisualState,
} from "@omnimind/shared/terminalThreads";
import type { Thread } from "../types";
import { derivePendingApprovals, derivePendingUserInputs } from "../session-logic";

export interface ThreadAttentionCandidate {
  kind: "approval" | "user-input";
  threadId: Thread["id"];
  projectId: Thread["projectId"];
  title: string;
  requestId: string;
  createdAt: string;
  requestKind?: "command" | "file-read" | "file-change" | "permissions";
  summary?: string;
}

interface TerminalNotificationThreadState {
  runningTerminalIds: string[];
  terminalAttentionStatesById: Record<string, "attention" | "review">;
  terminalCliKindsById: Record<string, TerminalCliKind>;
  terminalIds: string[];
  terminalLabelsById: Record<string, string>;
  terminalTitleOverridesById: Record<string, string>;
}

export interface CompletedTerminalCandidate {
  cliKind: TerminalCliKind | null;
  terminalId: string;
  threadId: Thread["id"];
  title: string;
}

export interface TerminalAttentionCandidate {
  cliKind: TerminalCliKind | null;
  terminalId: string;
  threadId: Thread["id"];
  title: string;
}

// Concrete task toasts are for off-screen work; visible Conversations show the result inline.
export function shouldShowThreadNotificationToast(input: {
  threadId: Thread["id"];
  visibleThreadIds: ReadonlySet<Thread["id"]>;
}): boolean {
  return !input.visibleThreadIds.has(input.threadId);
}

function resolveTerminalNotificationState(
  threadState: TerminalNotificationThreadState | undefined,
  terminalId: string,
): TerminalVisualState {
  if (!threadState) return "idle";
  if (threadState.terminalAttentionStatesById?.[terminalId] === "attention") return "attention";
  if ((threadState.runningTerminalIds ?? []).includes(terminalId)) return "running";
  if (threadState.terminalAttentionStatesById?.[terminalId] === "review") return "review";
  return "idle";
}

function resolveTerminalNotificationTitle(
  threadState: TerminalNotificationThreadState | undefined,
  terminalId: string,
): { cliKind: TerminalCliKind | null; title: string } {
  const cliKind = threadState?.terminalCliKindsById?.[terminalId] ?? null;
  const title =
    threadState?.terminalTitleOverridesById?.[terminalId]?.trim() ||
    threadState?.terminalLabelsById?.[terminalId]?.trim() ||
    (cliKind ? defaultTerminalTitleForCliKind(cliKind) : "Terminal");
  return { cliKind, title };
}

export function collectCompletedTerminalCandidates(
  previousByThreadId: Record<string, TerminalNotificationThreadState>,
  nextByThreadId: Record<string, TerminalNotificationThreadState>,
): CompletedTerminalCandidate[] {
  const threadIds = new Set([...Object.keys(previousByThreadId), ...Object.keys(nextByThreadId)]);
  const candidates: CompletedTerminalCandidate[] = [];

  for (const threadId of threadIds) {
    const previousThreadState = previousByThreadId[threadId];
    const nextThreadState = nextByThreadId[threadId];
    const terminalIds = new Set([
      ...(previousThreadState?.terminalIds ?? []),
      ...(nextThreadState?.terminalIds ?? []),
    ]);

    for (const terminalId of terminalIds) {
      const previousState = resolveTerminalNotificationState(previousThreadState, terminalId);
      const nextState = resolveTerminalNotificationState(nextThreadState, terminalId);
      if (nextState !== "review" || previousState === "review") continue;
      const { cliKind, title } = resolveTerminalNotificationTitle(nextThreadState, terminalId);
      candidates.push({
        threadId: threadId as Thread["id"],
        terminalId,
        cliKind,
        title,
      });
    }
  }

  return candidates;
}

function approvalSummary(
  requestKind: "command" | "file-read" | "file-change" | "permissions",
): string {
  switch (requestKind) {
    case "command":
      return "Command approval requested.";
    case "file-read":
      return "File-read approval requested.";
    case "file-change":
      return "File-change approval requested.";
    case "permissions":
      return "Permission approval requested.";
  }
}

export function collectThreadAttentionCandidates(
  previousThreads: readonly Thread[],
  nextThreads: readonly Thread[],
): ThreadAttentionCandidate[] {
  const previousById = new Map(previousThreads.map((thread) => [thread.id, thread] as const));
  const candidates: ThreadAttentionCandidate[] = [];

  for (const thread of nextThreads) {
    const previousThread = previousById.get(thread.id);
    if (!previousThread) continue;

    const previousApprovalIds = new Set(
      derivePendingApprovals(previousThread.activities, previousThread.pendingInteractions).map(
        (approval) => approval.requestId,
      ),
    );
    const previousUserInputIds = new Set(
      derivePendingUserInputs(previousThread.activities, previousThread.pendingInteractions).map(
        (request) => request.requestId,
      ),
    );

    for (const approval of derivePendingApprovals(thread.activities, thread.pendingInteractions)) {
      if (previousApprovalIds.has(approval.requestId)) continue;
      candidates.push({
        kind: "approval",
        threadId: thread.id,
        projectId: thread.projectId,
        title: thread.title,
        requestId: approval.requestId,
        createdAt: approval.createdAt,
        requestKind: approval.requestKind,
      });
    }

    for (const request of derivePendingUserInputs(thread.activities, thread.pendingInteractions)) {
      if (previousUserInputIds.has(request.requestId)) continue;
      candidates.push({
        kind: "user-input",
        threadId: thread.id,
        projectId: thread.projectId,
        title: thread.title,
        requestId: request.requestId,
        createdAt: request.createdAt,
      });
    }
  }

  return candidates.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function collectTerminalAttentionCandidates(
  previousByThreadId: Record<string, TerminalNotificationThreadState>,
  nextByThreadId: Record<string, TerminalNotificationThreadState>,
): TerminalAttentionCandidate[] {
  const threadIds = new Set([...Object.keys(previousByThreadId), ...Object.keys(nextByThreadId)]);
  const candidates: TerminalAttentionCandidate[] = [];

  for (const threadId of threadIds) {
    const previousThreadState = previousByThreadId[threadId];
    const nextThreadState = nextByThreadId[threadId];
    const terminalIds = new Set([
      ...(previousThreadState?.terminalIds ?? []),
      ...(nextThreadState?.terminalIds ?? []),
    ]);

    for (const terminalId of terminalIds) {
      const previousState = resolveTerminalNotificationState(previousThreadState, terminalId);
      const nextState = resolveTerminalNotificationState(nextThreadState, terminalId);
      if (nextState !== "attention" || previousState === "attention") continue;
      const { cliKind, title } = resolveTerminalNotificationTitle(nextThreadState, terminalId);
      candidates.push({
        threadId: threadId as Thread["id"],
        terminalId,
        cliKind,
        title,
      });
    }
  }

  return candidates;
}

export function buildThreadAttentionCopy(candidate: ThreadAttentionCandidate): {
  title: string;
  body: string;
} {
  const normalizedTitle = candidate.title.trim();
  const threadLabel = normalizedTitle.length > 0 ? normalizedTitle : "Untitled thread";
  const summary =
    candidate.summary ??
    (candidate.kind === "approval"
      ? approvalSummary(candidate.requestKind ?? "command")
      : "User input requested.");

  return { title: "Input needed", body: `${threadLabel}: ${summary}` };
}

export function buildTerminalCompletionCopy(candidate: CompletedTerminalCandidate): {
  title: string;
  body: string;
} {
  const terminalLabel = candidate.title.trim() || "Terminal";
  return { title: "Terminal task completed", body: `${terminalLabel} finished working.` };
}

export function buildTerminalAttentionCopy(candidate: TerminalAttentionCandidate): {
  title: string;
  body: string;
} {
  const terminalLabel = candidate.title.trim() || "Terminal";
  return { title: "Terminal input needed", body: `${terminalLabel} needs your attention.` };
}

export const collectInputNeededThreadCandidates = collectThreadAttentionCandidates;
export const buildInputNeededCopy = buildThreadAttentionCopy;

// Donor-owned attention facts still use their concrete creation time to avoid hydration replay.
export function isNotificationRuntimeFreshTimestamp(
  candidateTimestamp: string,
  runtimeStartedAtMs: number,
): boolean {
  const candidateMs = Date.parse(candidateTimestamp);
  if (!Number.isFinite(candidateMs) || !Number.isFinite(runtimeStartedAtMs)) return true;
  return candidateMs > runtimeStartedAtMs;
}

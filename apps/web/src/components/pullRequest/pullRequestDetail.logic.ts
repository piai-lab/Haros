// FILE: pullRequestDetail.logic.ts
// Purpose: Pure helpers shared by every host of the pull request detail surface (the
//          /pull-requests route overlay and the chat right-dock pane): the canonical
//          pane identity key, the "PR #n" tab chip label, the plain-language state
//          descriptor, and the flattened chronological timeline event list.
// Layer: Web domain helpers (no React)
// Exports: pullRequestDetailInputKey, pullRequestPaneTabLabel, pullRequestDetailInputFromPane,
//          describePullRequestState, stripHtmlComments, PullRequestTimelineEvent,
//          buildPullRequestTimelineEvents, pullRequestStackNavigation

import type {
  PullRequestDetail,
  PullRequestDetailInput,
  PullRequestMergeExpectation,
  PullRequestState,
} from "@harnessos/contracts";

import type { RightDockPane } from "~/rightDockStore.logic";

import { pullRequestMarkdownPreview } from "./pullRequestMarkdown.logic";
import { pullRequestStackTargetEntries } from "./pullRequestStack.logic";
import type { AppLocale } from "~/locale";

export type PullRequestStackNavigation = {
  readonly position: number;
  readonly size: number;
  readonly previousNumber: number | null;
  readonly nextNumber: number | null;
};

/**
 * Derive internal stack navigation only from a complete, self-consistent server projection.
 * Older/malformed payloads and any failed authoritative lookup stay inert instead of guessing.
 */
export function pullRequestStackNavigation(
  detail: Pick<PullRequestDetail, "number" | "stack" | "stackMetadataIncomplete">,
): PullRequestStackNavigation | null {
  const stack = detail.stack;
  if (detail.stackMetadataIncomplete || !stack) return null;
  if (
    stack.position > stack.size ||
    stack.entries.length !== stack.size ||
    stack.entries.some((entry, index) => entry.position !== index + 1) ||
    new Set(stack.entries.map((entry) => entry.number)).size !== stack.size ||
    stack.entries[stack.position - 1]?.number !== detail.number
  ) {
    return null;
  }
  return {
    position: stack.position,
    size: stack.size,
    previousNumber: stack.entries[stack.position - 2]?.number ?? null,
    nextNumber: stack.entries[stack.position]?.number ?? null,
  };
}

export function pullRequestMergeExpectation(
  detail: Pick<PullRequestDetail, "number" | "baseBranch" | "stack" | "stackMetadataIncomplete">,
): PullRequestMergeExpectation | null {
  if (detail.stackMetadataIncomplete) return null;
  const stack = detail.stack;
  if (!stack) return { kind: "standalone", baseBranch: detail.baseBranch };
  if (!pullRequestStackNavigation(detail)) return null;
  const targetPullRequestNumbers = pullRequestStackTargetEntries(stack).map((entry) => entry.number);
  if (targetPullRequestNumbers.at(-1) !== detail.number) return null;
  return {
    kind: "stack",
    stackNumber: stack.number,
    stackSize: stack.size,
    selectedPosition: stack.position,
    baseBranch: stack.baseBranch,
    targetPullRequestNumbers,
  };
}

export function pullRequestMergeExpectationsEqual(
  left: PullRequestMergeExpectation | null,
  right: PullRequestMergeExpectation | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.kind !== right.kind || left.baseBranch !== right.baseBranch) return false;
  if (left.kind === "standalone" || right.kind === "standalone") return true;
  return (
    left.stackNumber === right.stackNumber &&
    left.stackSize === right.stackSize &&
    left.selectedPosition === right.selectedPosition &&
    left.targetPullRequestNumbers.length === right.targetPullRequestNumbers.length &&
    left.targetPullRequestNumbers.every(
      (number, index) => number === right.targetPullRequestNumbers[index],
    )
  );
}

/** Canonical identity for one detail surface — used as the React key so switching the
 *  selected pull request remounts the panel (resetting its tab and diff state). */
export function pullRequestDetailInputKey(input: PullRequestDetailInput): string {
  return `${input.projectId}:${input.repository}#${input.number}`;
}

/** Tab chip label shared by the route overlay chip and the right-dock pane tab. */
export function pullRequestPaneTabLabel(number: number): string {
  return `PR #${number}`;
}

/** The detail input a dock "pullRequest" pane points at, or null while the pane is empty.
 *  Single owner of the identity-fields guard so every pane consumer (content, tab icon)
 *  validates the same way. */
export function pullRequestDetailInputFromPane(pane: RightDockPane): PullRequestDetailInput | null {
  if (
    pane.kind !== "pullRequest" ||
    !pane.pullRequestProjectId ||
    !pane.pullRequestRepository ||
    !pane.pullRequestNumber
  ) {
    return null;
  }
  return {
    projectId: pane.pullRequestProjectId,
    repository: pane.pullRequestRepository,
    number: pane.pullRequestNumber,
  };
}

// Plain-language state descriptor shown next to the author line — the state color itself is
// already conveyed by the PullRequestStateGlyph in the header, so this stays neutral text.
// State only, matching git: conflicts are a merge signal and render as their own row.
export function describePullRequestState(
  state: PullRequestState,
  isDraft: boolean,
  locale: AppLocale = "en",
): string {
  if (isDraft && state === "open") return locale === "zh-CN" ? "草稿" : "Draft";
  if (state === "open") return locale === "zh-CN" ? "等待评审" : "Ready for review";
  if (state === "merged") return locale === "zh-CN" ? "已合并" : "Merged";
  return locale === "zh-CN" ? "已关闭" : "Closed";
}

// stripHtmlComments now lives with the rest of the markdown preprocessing.
export { stripHtmlComments } from "./pullRequestMarkdown.logic";

export interface PullRequestTimelineEvent {
  id: string;
  /** ISO timestamp the event sorts by. */
  at: string;
  title: string;
  body: string | null;
}

type PullRequestTimelineSource = Pick<
  PullRequestDetail,
  "createdAt" | "author" | "commits" | "comments" | "mergedAt" | "closedAt"
>;

/** Flattens creation, commits, comments/reviews, and the terminal merge/close event into one
 *  chronologically sorted list. Merged wins over closed: GitHub sets both timestamps on a
 *  merge, and showing "closed" for a merged pull request would misstate what happened. */
export function buildPullRequestTimelineEvents(
  detail: PullRequestTimelineSource,
  locale: AppLocale = "en",
): PullRequestTimelineEvent[] {
  const someone = locale === "zh-CN" ? "有人" : "Someone";
  const events: PullRequestTimelineEvent[] = [
    {
      id: "created",
      at: detail.createdAt,
      title:
        locale === "zh-CN"
          ? `${detail.author?.login ?? someone} 开启了此拉取请求`
          : `${detail.author?.login ?? someone} opened this pull request`,
      body: null,
    },
    ...detail.commits.map((commit) => ({
      id: commit.oid,
      at: commit.committedDate,
      title:
        locale === "zh-CN" ? `提交 ${commit.oid.slice(0, 7)}` : `Commit ${commit.oid.slice(0, 7)}`,
      body: commit.messageHeadline || (locale === "zh-CN" ? "无提交消息。" : "No commit message."),
    })),
    ...detail.comments.map((comment) => ({
      id: comment.id,
      at: comment.createdAt,
      title:
        locale === "zh-CN"
          ? `${comment.author?.login ?? someone} ${comment.kind === "review" ? "完成了评审" : "发表了评论"}`
          : `${comment.author?.login ?? someone} ${comment.kind === "review" ? "reviewed" : "commented"}`,
      // Timeline previews are plain text, so raw markdown/HTML would print literally.
      body: pullRequestMarkdownPreview(comment.body) || null,
    })),
    ...(detail.mergedAt
      ? [
          {
            id: "merged",
            at: detail.mergedAt,
            title: locale === "zh-CN" ? "拉取请求已合并" : "Pull request merged",
            body: null,
          },
        ]
      : []),
    ...(detail.closedAt && !detail.mergedAt
      ? [
          {
            id: "closed",
            at: detail.closedAt,
            title: locale === "zh-CN" ? "拉取请求已关闭" : "Pull request closed",
            body: null,
          },
        ]
      : []),
  ];
  return events.toSorted((left, right) => left.at.localeCompare(right.at));
}

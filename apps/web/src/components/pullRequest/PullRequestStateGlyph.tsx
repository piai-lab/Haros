// FILE: PullRequestStateGlyph.tsx
// Purpose: State glyph for a pull request (open/draft/closed/merged), shared by the list rows,
//          the detail panel header, and the dock tab chip. Icon and color both come from
//          resolvePrStatePresentation — the same mapping the sidebar thread badge and kanban
//          chip use — so every surface renders a given PR state identically.
// Layer: Pull request presentation
// Exports: PullRequestStateGlyph

import type { GitPullRequestMergeability, PullRequestState } from "@omnimind/contracts";

import { cn } from "~/lib/utils";
import {
  PR_STATE_PRESENTATION_ICONS,
  resolvePrStatePresentation,
} from "./pullRequestStatePresentation";
import { useI18n } from "~/i18n";

const SIZE_CLASS_NAME = {
  sm: "size-4",
  md: "size-[1.125rem]",
} as const;

function pullRequestStateKey(
  state: PullRequestState,
  isDraft: boolean,
  mergeability: GitPullRequestMergeability | undefined,
):
  | "pullRequest.stateDraft"
  | "pullRequest.stateConflicts"
  | "pullRequest.stateOpen"
  | "pullRequest.stateMerged"
  | "pullRequest.stateClosed" {
  if (isDraft && state === "open") return "pullRequest.stateDraft";
  if (state === "open" && mergeability === "conflicting") return "pullRequest.stateConflicts";
  if (state === "open") return "pullRequest.stateOpen";
  if (state === "merged") return "pullRequest.stateMerged";
  return "pullRequest.stateClosed";
}

// Draft always shows as draft (a draft isn't heading for a merge); an open non-draft PR
// with conflicts shows the conflict glyph — precedence lives in resolvePrStatePresentation
// so the thread badge, kanban chip, and every PR surface agree.
export function PullRequestStateGlyph({
  state,
  isDraft,
  mergeability,
  size: sizeProp,
  className,
}: {
  state: PullRequestState;
  isDraft: boolean;
  mergeability?: GitPullRequestMergeability | undefined;
  size?: keyof typeof SIZE_CLASS_NAME;
  className?: string;
}) {
  const { t } = useI18n();
  const size = sizeProp ?? "sm";
  const presentation = resolvePrStatePresentation({ state, isDraft, mergeability });
  const Icon = PR_STATE_PRESENTATION_ICONS[presentation.iconKind];
  const stateLabel = t(pullRequestStateKey(state, isDraft, mergeability));
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center", SIZE_CLASS_NAME[size], className)}
      title={stateLabel}
      role="img"
      aria-label={stateLabel}
    >
      <Icon className={cn("size-full", presentation.colorClass)} aria-hidden="true" />
    </span>
  );
}

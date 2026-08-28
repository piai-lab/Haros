import type {
  PullRequestDetail,
  PullRequestStack,
  PullRequestStackEntry,
} from "@harnessos/contracts";

export type PullRequestStackBlocker =
  | { readonly kind: "closed"; readonly number: number }
  | { readonly kind: "draft"; readonly number: number }
  | { readonly kind: "not-ready"; readonly number: number };

export type PullRequestStackAssessment = {
  readonly tone: "ready" | "blocked" | "pending" | "warning" | "complete";
  readonly mergeTargetCount: number;
  readonly canAttemptMerge: boolean;
  readonly blocker: PullRequestStackBlocker | null;
};

/** Entries affected by merging the selected PR, ordered from the base branch upwards. */
export function pullRequestStackTargetEntries(
  stack: PullRequestStack,
): ReadonlyArray<PullRequestStackEntry> {
  return stack.entries.filter(
    (entry) => entry.position <= stack.position && entry.state !== "merged",
  );
}

export function assessPullRequestStack(stack: PullRequestStack): PullRequestStackAssessment {
  const targets = pullRequestStackTargetEntries(stack);
  if (targets.length === 0) {
    return {
      tone: "complete",
      mergeTargetCount: 0,
      canAttemptMerge: false,
      blocker: null,
    };
  }

  const closed = targets.find((entry) => entry.state === "closed");
  if (closed) {
    return {
      tone: "blocked",
      mergeTargetCount: targets.length,
      canAttemptMerge: false,
      blocker: { kind: "closed", number: closed.number },
    };
  }

  const draft = targets.find((entry) => entry.isDraft);
  if (draft) {
    return {
      tone: "blocked",
      mergeTargetCount: targets.length,
      canAttemptMerge: false,
      blocker: { kind: "draft", number: draft.number },
    };
  }

  const conflicting = targets.find(
    (entry) =>
      entry.mergeability === "conflicting" ||
      ["BLOCKED", "DIRTY", "DRAFT"].includes(entry.mergeStateStatus ?? ""),
  );
  if (conflicting) {
    return {
      tone: "blocked",
      mergeTargetCount: targets.length,
      canAttemptMerge: false,
      blocker: { kind: "not-ready", number: conflicting.number },
    };
  }

  if (targets.some((entry) => entry.mergeStateStatus === "UNSTABLE")) {
    return {
      tone: "warning",
      mergeTargetCount: targets.length,
      canAttemptMerge: true,
      blocker: null,
    };
  }

  const pending = targets.some(
    (entry) =>
      entry.mergeability === "unknown" ||
      entry.mergeStateStatus === null ||
      ["BEHIND", "UNKNOWN"].includes(entry.mergeStateStatus),
  );
  if (pending) {
    return {
      tone: "pending",
      mergeTargetCount: targets.length,
      canAttemptMerge: true,
      blocker: null,
    };
  }

  return {
    tone: "ready",
    mergeTargetCount: targets.length,
    canAttemptMerge: true,
    blocker: null,
  };
}

export type PullRequestMergeBlocker =
  | { readonly kind: "metadata-incomplete" }
  | { readonly kind: "conflicting" }
  | PullRequestStackBlocker;

export function pullRequestMergeBlocker(
  detail: Pick<PullRequestDetail, "mergeability" | "stackMetadataIncomplete">,
  stackAssessment: PullRequestStackAssessment | null,
): PullRequestMergeBlocker | null {
  if (detail.stackMetadataIncomplete === true) return { kind: "metadata-incomplete" };
  if (stackAssessment?.canAttemptMerge === false) {
    return stackAssessment.blocker ?? { kind: "not-ready", number: 0 };
  }
  return detail.mergeability === "conflicting" ? { kind: "conflicting" } : null;
}

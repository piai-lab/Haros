// FILE: threadEnvironment.ts
// Purpose: Shared helpers for deriving thread environment intent and fork targets.
// Layer: Web domain helpers
// Exports: thread env resolution + `/fork` target planning

import type { ThreadEnvironmentMode } from "@harnessos/contracts";
import {
  isPendingThreadWorktree,
  resolveThreadEnvironmentMode,
  resolveThreadWorkspaceCwd,
  resolveThreadWorkspaceState,
  type ResolvedThreadWorkspaceState,
} from "@harnessos/shared/threadEnvironment";
import { deriveAssociatedWorktreeMetadata } from "@harnessos/shared/threadWorkspace";
import type { Thread } from "../types";
import type { MessageKey } from "../i18n";

export type ForkThreadTarget = "local" | "worktree";

export interface ResolvedForkThreadEnvironment {
  target: ForkThreadTarget;
  envMode: ThreadEnvironmentMode;
  branch: string | null;
  worktreePath: string | null;
  associatedWorktreePath: string | null;
  associatedWorktreeBranch: string | null;
  associatedWorktreeRef: string | null;
}

export {
  isPendingThreadWorktree,
  resolveThreadEnvironmentMode,
  resolveThreadWorkspaceState,
} from "@harnessos/shared/threadEnvironment";

export interface ThreadEnvironmentPresentation {
  mode: ThreadEnvironmentMode;
  workspaceState: ResolvedThreadWorkspaceState;
  shortLabelKey: "threadEnvironment.local" | "threadEnvironment.worktree";
  localOptionLabelKey: "threadEnvironment.local";
  worktreeOptionLabelKey: "threadEnvironment.worktree";
  worktreeBadgeLabelKey: "threadEnvironment.worktree" | "threadEnvironment.worktreePending" | null;
}

export function resolveThreadEnvironmentPresentation(input: {
  envMode?: ThreadEnvironmentMode | null | undefined;
  worktreePath?: string | null | undefined;
}): ThreadEnvironmentPresentation {
  const mode = resolveThreadEnvironmentMode(input);
  const workspaceState = resolveThreadWorkspaceState(input);

  return {
    mode,
    workspaceState,
    shortLabelKey: mode === "worktree" ? "threadEnvironment.worktree" : "threadEnvironment.local",
    localOptionLabelKey: "threadEnvironment.local",
    worktreeOptionLabelKey: "threadEnvironment.worktree",
    worktreeBadgeLabelKey:
      workspaceState === "worktree-ready"
        ? "threadEnvironment.worktree"
        : workspaceState === "worktree-pending"
          ? "threadEnvironment.worktreePending"
          : null,
  };
}

export interface DiffEnvironmentState {
  pending: boolean;
  cwd: string | null;
  disabledReasonKey: MessageKey | null;
}

// Diff surfaces stay disabled while a worktree-intended chat is still waiting for its path.
export function resolveDiffEnvironmentState(input: {
  projectCwd?: string | null | undefined;
  envMode?: ThreadEnvironmentMode | null | undefined;
  worktreePath?: string | null | undefined;
}): DiffEnvironmentState {
  const pending = isPendingThreadWorktree(input);
  return {
    pending,
    cwd: pending
      ? null
      : resolveThreadWorkspaceCwd({
          projectCwd: input.projectCwd,
          envMode: input.envMode,
          worktreePath: input.worktreePath,
        }),
    disabledReasonKey: pending ? "threadEnvironment.diffPending" : null,
  };
}

// Fork planning keeps "local" attached to the current local checkout. For worktree-backed
// threads that means reusing the existing worktree, while "worktree" always plans a new one.
export function resolveForkThreadEnvironment(input: {
  target: ForkThreadTarget;
  activeRootBranch: string | null;
  sourceThread: Pick<
    Thread,
    | "branch"
    | "envMode"
    | "worktreePath"
    | "associatedWorktreePath"
    | "associatedWorktreeBranch"
    | "associatedWorktreeRef"
  >;
}): ResolvedForkThreadEnvironment {
  const sourceEnvMode = resolveThreadEnvironmentMode({
    envMode: input.sourceThread.envMode,
    worktreePath: input.sourceThread.worktreePath,
  });
  const sourceBranch = input.sourceThread.branch ?? input.activeRootBranch;
  const sourceWorktreePath = input.sourceThread.worktreePath ?? null;
  const sourceAssociatedWorktreePath =
    input.sourceThread.associatedWorktreePath ?? sourceWorktreePath;
  const sourceAssociatedWorktreeBranch =
    input.sourceThread.associatedWorktreeBranch ?? sourceBranch;
  const sourceAssociatedWorktreeRef =
    input.sourceThread.associatedWorktreeRef ?? sourceAssociatedWorktreeBranch;

  if (input.target === "worktree") {
    const associatedWorktree = deriveAssociatedWorktreeMetadata({
      associatedWorktreePath: null,
      associatedWorktreeBranch: sourceBranch,
      associatedWorktreeRef: sourceAssociatedWorktreeRef ?? sourceBranch,
    });
    return {
      target: "worktree",
      envMode: "worktree",
      branch: sourceBranch,
      worktreePath: null,
      ...associatedWorktree,
    };
  }

  // Codex-style "Fork Into Local" stays in the current local checkout, which for a
  // worktree-backed thread means reusing that worktree rather than bouncing to root.
  if (sourceEnvMode === "worktree" && sourceWorktreePath) {
    const associatedWorktree = deriveAssociatedWorktreeMetadata({
      branch: sourceBranch,
      worktreePath: sourceWorktreePath,
      associatedWorktreePath: sourceAssociatedWorktreePath,
      associatedWorktreeBranch: sourceAssociatedWorktreeBranch,
      associatedWorktreeRef: sourceAssociatedWorktreeRef,
    });
    return {
      target: "local",
      envMode: "worktree",
      branch: sourceBranch,
      worktreePath: sourceWorktreePath,
      ...associatedWorktree,
    };
  }

  const associatedWorktree = deriveAssociatedWorktreeMetadata({
    associatedWorktreePath: null,
    associatedWorktreeBranch: null,
    associatedWorktreeRef: null,
  });
  return {
    target: "local",
    envMode: "local",
    branch: sourceBranch,
    worktreePath: null,
    ...associatedWorktree,
  };
}

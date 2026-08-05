import type { ProductWorkspaceId, PullRequestListEntry, PullRequestWorkspaceContext } from "@omnimind/contracts";

type WorkspaceAwarePullRequestEntry = Pick<
  PullRequestListEntry,
  "workspaceId" | "repository" | "number" | "isPinned"
> & {
  readonly workspaceTitle?: string | undefined;
  readonly headBranch?: string | undefined;
  readonly workspaceContexts?: ReadonlyArray<PullRequestWorkspaceContext> | undefined;
};

/** Remote identity for a pull request. A PR belongs to a GitHub repository, not to each local
 * project or worktree that happens to have that repository checked out. */
export function pullRequestListRepositoryIdentity(
  entry: Pick<PullRequestListEntry, "repository" | "number">,
): string {
  return `${entry.repository.trim().toLowerCase()}#${entry.number}`;
}

/** Project associations for a repository-level row, with a legacy fallback for older payloads. */
export function pullRequestListWorkspaceContexts(
  entry: WorkspaceAwarePullRequestEntry,
): PullRequestWorkspaceContext[] {
  if (entry.workspaceContexts && entry.workspaceContexts.length > 0) {
    return [...entry.workspaceContexts];
  }
  return [
    {
      workspaceId: entry.workspaceId,
      workspaceTitle: entry.workspaceTitle ?? String(entry.workspaceId),
      isPinned: entry.isPinned ?? false,
    },
  ];
}

export function pullRequestListEntryHasWorkspace(
  entry: WorkspaceAwarePullRequestEntry,
  workspaceId: ProductWorkspaceId,
): boolean {
  return pullRequestListWorkspaceContexts(entry).some((context) => context.workspaceId === workspaceId);
}

export function pullRequestListWorkspacePin(
  entry: WorkspaceAwarePullRequestEntry,
  workspaceId: ProductWorkspaceId,
): boolean | null {
  return (
    pullRequestListWorkspaceContexts(entry).find((context) => context.workspaceId === workspaceId)
      ?.isPinned ?? null
  );
}

function mergeWorkspaceContexts(
  entries: readonly WorkspaceAwarePullRequestEntry[],
): PullRequestWorkspaceContext[] {
  const byWorkspaceId = new Map<ProductWorkspaceId, PullRequestWorkspaceContext>();
  for (const entry of entries) {
    for (const context of pullRequestListWorkspaceContexts(entry)) {
      const existing = byWorkspaceId.get(context.workspaceId);
      byWorkspaceId.set(
        context.workspaceId,
        existing ? { ...context, isPinned: existing.isPinned || context.isPinned } : context,
      );
    }
  }
  return [...byWorkspaceId.values()].toSorted(
    (left, right) =>
      left.workspaceTitle.localeCompare(right.workspaceTitle) ||
      left.workspaceId.localeCompare(right.workspaceId),
  );
}

function preferredWorkspaceContext(
  entry: Pick<PullRequestListEntry, "headBranch">,
  contexts: readonly PullRequestWorkspaceContext[],
  preferredWorkspaceId: ProductWorkspaceId | undefined,
): PullRequestWorkspaceContext {
  const explicitlyPreferred = preferredWorkspaceId
    ? contexts.find((context) => context.workspaceId === preferredWorkspaceId)
    : undefined;
  if (explicitlyPreferred) return explicitlyPreferred;

  const normalizedHeadBranch = entry.headBranch.trim().toLowerCase();
  return (
    contexts.find(
      (context) => context.workspaceTitle.trim().toLowerCase() === normalizedHeadBranch,
    ) ?? contexts[0]!
  );
}

/** Collapse project/worktree fan-out into one visible row per GitHub PR while retaining every
 * local workspace association. The chosen top-level project is only the context used to open the
 * detail panel; remote identity and aggregate pin state remain repository-level. */
export function coalescePullRequestListEntries(
  entries: readonly PullRequestListEntry[],
  options: { readonly preferredWorkspaceId?: ProductWorkspaceId | undefined } = {},
): PullRequestListEntry[] {
  const entriesByIdentity = new Map<string, PullRequestListEntry[]>();
  for (const entry of entries) {
    const identity = pullRequestListRepositoryIdentity(entry);
    const group = entriesByIdentity.get(identity);
    if (group) group.push(entry);
    else entriesByIdentity.set(identity, [entry]);
  }

  return [...entriesByIdentity.values()].map((group) => {
    const first = group[0]!;
    const contexts = mergeWorkspaceContexts(group);
    const preferred = preferredWorkspaceContext(first, contexts, options.preferredWorkspaceId);
    return {
      ...first,
      workspaceId: preferred.workspaceId,
      workspaceTitle: preferred.workspaceTitle,
      workspaceContexts: contexts,
      isPinned: contexts.some((context) => context.isPinned),
      viewerReviewRequested: group.some((entry) => entry.viewerReviewRequested),
    };
  });
}

/** Update one workspace-owned pin inside an aggregate row without changing its selected context. */
export function updatePullRequestListEntryWorkspacePin<T extends WorkspaceAwarePullRequestEntry>(
  entry: T,
  workspaceId: ProductWorkspaceId,
  isPinned: boolean,
): T {
  if (!pullRequestListEntryHasWorkspace(entry, workspaceId)) return entry;
  if (!entry.workspaceContexts || entry.workspaceContexts.length === 0) {
    return entry.workspaceId === workspaceId ? ({ ...entry, isPinned } as T) : entry;
  }
  const workspaceContexts = entry.workspaceContexts.map((context) =>
    context.workspaceId === workspaceId ? { ...context, isPinned } : context,
  );
  return {
    ...entry,
    workspaceContexts,
    isPinned: workspaceContexts.some((context) => context.isPinned),
  } as T;
}

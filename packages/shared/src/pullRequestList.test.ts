import type { PullRequestListEntry } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  coalescePullRequestListEntries,
  pullRequestListRepositoryIdentity,
  updatePullRequestListEntryWorkspacePin,
} from "./pullRequestList";

function makeEntry(overrides: Partial<PullRequestListEntry> = {}): PullRequestListEntry {
  const entry: PullRequestListEntry = {
    workspaceId: "project-1" as PullRequestListEntry["workspaceId"],
    workspaceTitle: "Project One",
    repository: "acme/widgets",
    number: 1,
    title: "PR 1",
    url: "https://github.com/acme/widgets/pull/1",
    author: null,
    headBranch: "feature-1",
    baseBranch: "main",
    state: "open",
    isDraft: false,
    additions: 1,
    deletions: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    reviewDecision: null,
    viewerReviewRequested: false,
    isPinned: false,
    workspaceContexts: [],
    mergeability: "unknown",
    labels: [],
    ...overrides,
  };
  return {
    ...entry,
    workspaceContexts: overrides.workspaceContexts ?? [
      {
        workspaceId: entry.workspaceId,
        workspaceTitle: entry.workspaceTitle,
        isPinned: entry.isPinned ?? false,
      },
    ],
  };
}

describe("pull request list coalescing", () => {
  it("uses repository and number as the remote identity", () => {
    expect(pullRequestListRepositoryIdentity(makeEntry({ repository: " Acme/Widgets " }))).toBe(
      "acme/widgets#1",
    );
  });

  it("collapses shared-worktree rows and prefers the head-branch worktree", () => {
    const fallback = makeEntry();
    const branchWorktree = makeEntry({
      workspaceId: "project-2" as PullRequestListEntry["workspaceId"],
      workspaceTitle: "feature-1",
    });

    expect(coalescePullRequestListEntries([fallback, branchWorktree])).toEqual([
      {
        ...branchWorktree,
        workspaceContexts: [
          {
            workspaceId: "project-2",
            workspaceTitle: "feature-1",
            isPinned: false,
          },
          {
            workspaceId: "project-1",
            workspaceTitle: "Project One",
            isPinned: false,
          },
        ],
      },
    ]);
  });

  it("prefers pinned context and keeps different remote PRs distinct", () => {
    const first = makeEntry({ workspaceTitle: "feature-1" });
    const pinned = makeEntry({
      workspaceId: "project-2" as PullRequestListEntry["workspaceId"],
      workspaceTitle: "Pinned workspace",
      isPinned: true,
    });
    const otherRepository = makeEntry({ repository: "acme/other" });

    const [shared, other] = coalescePullRequestListEntries([first, pinned, otherRepository]);
    expect(shared).toMatchObject({
      workspaceId: first.workspaceId,
      isPinned: true,
      workspaceContexts: expect.arrayContaining([
        expect.objectContaining({ workspaceId: pinned.workspaceId, isPinned: true }),
      ]),
    });
    expect(other).toMatchObject({ repository: "acme/other" });
  });

  it("keeps an explicitly selected project context stable", () => {
    const first = makeEntry();
    const second = makeEntry({
      workspaceId: "project-2" as PullRequestListEntry["workspaceId"],
      workspaceTitle: "Project Two",
      workspaceContexts: [
        {
          workspaceId: "project-2" as PullRequestListEntry["workspaceId"],
          workspaceTitle: "Project Two",
          isPinned: false,
        },
      ],
    });
    expect(
      coalescePullRequestListEntries([first, second], {
        preferredWorkspaceId: second.workspaceId,
      })[0]?.workspaceId,
    ).toBe(second.workspaceId);
  });

  it("updates one project pin while preserving aggregate pin state", () => {
    const first = makeEntry({ isPinned: true });
    const second = makeEntry({
      workspaceId: "project-2" as PullRequestListEntry["workspaceId"],
      workspaceTitle: "Project Two",
      isPinned: true,
    });
    const aggregate = coalescePullRequestListEntries([first, second])[0]!;
    const firstCleared = updatePullRequestListEntryWorkspacePin(aggregate, first.workspaceId, false);
    const allCleared = updatePullRequestListEntryWorkspacePin(firstCleared, second.workspaceId, false);

    expect(firstCleared.isPinned).toBe(true);
    expect(allCleared.isPinned).toBe(false);
  });
});

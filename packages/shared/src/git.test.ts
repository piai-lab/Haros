import { describe, expect, it } from "vitest";

import {
  WORKTREE_BRANCH_PREFIX,
  buildHarnessOSBranchName,
  buildTemporaryWorktreeBranchName,
  isTemporaryWorktreeBranch,
  resolveUniqueHarnessOSBranchName,
  resolveThreadBranchRegressionGuard,
} from "./git";

describe("isTemporaryWorktreeBranch", () => {
  it("matches generated temporary worktree branches", () => {
    expect(isTemporaryWorktreeBranch(buildTemporaryWorktreeBranchName())).toBe(true);
  });

  it("matches generated temporary worktree branches", () => {
    expect(isTemporaryWorktreeBranch(`${WORKTREE_BRANCH_PREFIX}/deadbeef`)).toBe(true);
    expect(isTemporaryWorktreeBranch(` ${WORKTREE_BRANCH_PREFIX}/DEADBEEF `)).toBe(true);
  });

  it("rejects semantic branch names", () => {
    expect(isTemporaryWorktreeBranch(`${WORKTREE_BRANCH_PREFIX}/feature/demo`)).toBe(false);
    expect(isTemporaryWorktreeBranch("feature/demo")).toBe(false);
    expect(isTemporaryWorktreeBranch("feature/deadbeef")).toBe(false);
    expect(isTemporaryWorktreeBranch("hotfix/deadbeef")).toBe(false);
    expect(isTemporaryWorktreeBranch("bridge/deadbeef")).toBe(false);
    expect(isTemporaryWorktreeBranch("bridge/semantic-branch")).toBe(false);
  });
});

describe("resolveThreadBranchRegressionGuard", () => {
  it("keeps a semantic branch when the next branch is only a temporary worktree placeholder", () => {
    expect(
      resolveThreadBranchRegressionGuard({
        currentBranch: "feature/semantic-branch",
        nextBranch: `${WORKTREE_BRANCH_PREFIX}/deadbeef`,
      }),
    ).toBe("feature/semantic-branch");
  });

  it("accepts real branch changes", () => {
    expect(
      resolveThreadBranchRegressionGuard({
        currentBranch: "feature/old",
        nextBranch: "feature/new",
      }),
    ).toBe("feature/new");
  });

  it("allows clearing the branch", () => {
    expect(
      resolveThreadBranchRegressionGuard({
        currentBranch: "feature/old",
        nextBranch: null,
      }),
    ).toBeNull();
  });
});

describe("buildHarnessOSBranchName", () => {
  it("uses harnessos as the branch namespace", () => {
    expect(buildHarnessOSBranchName("fix toast copy")).toBe("harnessos/fix-toast-copy");
  });

  it("keeps non-HarnessOS namespaces inside the HarnessOS branch", () => {
    expect(buildHarnessOSBranchName("feature/refine-toolbar-actions")).toBe(
      "harnessos/feature/refine-toolbar-actions",
    );
  });

  it("normalizes the canonical prefix before rebuilding the branch", () => {
    expect(buildHarnessOSBranchName("harnessos/refine toolbar actions")).toBe(
      "harnessos/refine-toolbar-actions",
    );
  });

  it("falls back to harnessos/update when no preferred name is provided", () => {
    expect(buildHarnessOSBranchName()).toBe("harnessos/update");
  });
});

describe("resolveUniqueHarnessOSBranchName", () => {
  it("increments suffix when the HarnessOS branch already exists", () => {
    expect(
      resolveUniqueHarnessOSBranchName(
        ["main", "harnessos/fix-toast-copy", "harnessos/fix-toast-copy-2"],
        "fix toast copy",
      ),
    ).toBe("harnessos/fix-toast-copy-3");
  });
});

import { describe, expect, it } from "vitest";

import { shouldStageUntrackedForCheckpoint } from "./CapturePolicy.ts";

describe("shouldStageUntrackedForCheckpoint", () => {
  it("stages untracked files for a repository that has HEAD", () => {
    expect(
      shouldStageUntrackedForCheckpoint({
        hasHeadCommit: true,
        hasTrackedFiles: true,
        untrackedAddPreviouslyFailed: false,
      }),
    ).toBe(true);
  });

  it("stages untracked files for an unborn repository that already has an index", () => {
    expect(
      shouldStageUntrackedForCheckpoint({
        hasHeadCommit: false,
        hasTrackedFiles: true,
        untrackedAddPreviouslyFailed: false,
      }),
    ).toBe(true);
  });

  it("skips git add -A for an unborn repository with no tracked files", () => {
    expect(
      shouldStageUntrackedForCheckpoint({
        hasHeadCommit: false,
        hasTrackedFiles: false,
        untrackedAddPreviouslyFailed: false,
      }),
    ).toBe(false);
  });

  it("skips git add -A after a previous add failure for the same workspace", () => {
    expect(
      shouldStageUntrackedForCheckpoint({
        hasHeadCommit: true,
        hasTrackedFiles: true,
        untrackedAddPreviouslyFailed: true,
      }),
    ).toBe(false);
  });
});

import { ThreadId } from "@omnimind/contracts";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  checkpointDiffQueryKeys,
  checkpointDiffQueryOptions,
  resolveCheckpointDiffQueryDisplayState,
} from "./checkpointDiffQuery";

const threadId = ThreadId.makeUnsafe("thread-id");

describe("checkpointDiffQueryOptions", () => {
  it("uses presentation-owned query keys without Provider authority", () => {
    const key = checkpointDiffQueryKeys.checkpointDiff({
      threadId,
      fromTurnCount: 1,
      toTurnCount: 2,
      ignoreWhitespace: true,
      cacheScope: "turn:abc",
    });

    expect(key).toEqual(["checkpointDiff", threadId, 1, 2, true, "turn:abc"]);
    expect(key).not.toContain("providers");
  });

  it("reports the missing Product capability without calling a donor RPC", async () => {
    const options = checkpointDiffQueryOptions({
      threadId,
      fromTurnCount: 1,
      toTurnCount: 2,
      ignoreWhitespace: true,
      cacheScope: "turn:abc",
    });

    await expect(new QueryClient().fetchQuery(options)).rejects.toThrow(
      "Historical turn and full-conversation diffs are unavailable on the Product runtime surface.",
    );
    expect(options.retry).toBe(false);
    expect(options.refetchInterval).toBe(false);
  });

  it("rejects invalid local ranges before presenting capability state", async () => {
    const options = checkpointDiffQueryOptions({
      threadId,
      fromTurnCount: 3,
      toTurnCount: 2,
      ignoreWhitespace: false,
    });

    expect(options.enabled).toBe(false);
    await expect(new QueryClient().fetchQuery(options)).rejects.toThrow(
      "Checkpoint diff is unavailable.",
    );
  });
});

describe("resolveCheckpointDiffQueryDisplayState", () => {
  it("keeps a previous patch visible while a refetch is in flight", () => {
    expect(
      resolveCheckpointDiffQueryDisplayState({
        isLoading: false,
        isFetching: true,
        data: { diff: "patch" },
        error: new Error("stale"),
      }),
    ).toEqual({ isLoading: false, error: null });
  });
});

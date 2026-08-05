import { ProductWorkspaceId, SYSTEM_RPC_METHODS } from "@omnimind/contracts";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import type { PullRequestServiceShape } from "./pullRequests/Services/PullRequestService";
import { makePullRequestSystemRpcHandlers } from "./wsRpc";

describe("pull-request System RPC handlers", () => {
  it("routes the scoped wire method through PullRequestService", async () => {
    const workspaceId = ProductWorkspaceId.makeUnsafe("workspace-rpc-handler");
    const input = { state: "open" as const, workspaceId };
    const result = { viewer: null, entries: [], errors: [], repositoryBatches: [] };
    const list = vi.fn((_input: Parameters<PullRequestServiceShape["list"]>[0]) =>
      Effect.succeed(result),
    );
    const unused = () => Effect.die("unused pull-request operation");
    const service: PullRequestServiceShape = {
      list,
      reviewRequestCount: unused,
      detail: unused,
      diff: unused,
      action: unused,
      comment: unused,
      setPinned: unused,
    };

    const handlers = makePullRequestSystemRpcHandlers(service);
    await expect(
      Effect.runPromise(handlers[SYSTEM_RPC_METHODS.pullRequestsList](input)),
    ).resolves.toEqual(result);
    expect(list).toHaveBeenCalledExactlyOnceWith(input);
  });
});

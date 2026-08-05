import { describe, expect, it } from "vitest";

import { SystemRpcGroup } from "./rpc";
import { SYSTEM_RPC_METHODS } from "./ws";

describe("SystemRpcGroup pull-request capability", () => {
  it("publishes every pull-request method on the scoped system wire", () => {
    const methods = [
      SYSTEM_RPC_METHODS.pullRequestsList,
      SYSTEM_RPC_METHODS.pullRequestsReviewRequestCount,
      SYSTEM_RPC_METHODS.pullRequestsDetail,
      SYSTEM_RPC_METHODS.pullRequestsDiff,
      SYSTEM_RPC_METHODS.pullRequestsAction,
      SYSTEM_RPC_METHODS.pullRequestsComment,
      SYSTEM_RPC_METHODS.pullRequestsSetPinned,
    ];

    expect(methods.every((method) => SystemRpcGroup.requests.has(method))).toBe(true);
  });
});

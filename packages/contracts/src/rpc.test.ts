import { describe, expect, it } from "vitest";

import {
  WsAutomationCreateRpc,
  WsAutomationGetMemoryRpc,
  WsAutomationResolveProposalRpc,
  WsFeatureRpcGroup,
  WsProjectsDiscoverScriptsRpc,
  WsProjectsProvisionFromGitHubRpc,
  WsPullRequestsReviewRequestCountRpc,
  WsRpcError,
} from "./rpc";

describe("WS RPC contracts", () => {
  it("uses a schema-backed transport error", () => {
    expect(new WsRpcError({ message: "failed" }).message).toBe("failed");
  });

  it("exports the project script discovery RPC", () => {
    expect(WsProjectsDiscoverScriptsRpc).toBeDefined();
    expect(WsProjectsProvisionFromGitHubRpc).toBeDefined();
    expect(WsFeatureRpcGroup.requests.has("projects.provisionFromGitHub")).toBe(true);
  });

  it("exports the automation create RPC", () => {
    expect(WsAutomationCreateRpc).toBeDefined();
    expect(WsAutomationGetMemoryRpc).toBeDefined();
    expect(WsAutomationResolveProposalRpc).toBeDefined();
  });

  it("exports the count-only pull request review RPC", () => {
    expect(WsPullRequestsReviewRequestCountRpc).toBeDefined();
  });
});

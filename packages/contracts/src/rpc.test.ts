import { describe, expect, it } from "vitest";

import {
  WsAutomationCreateRpc,
  WsAutomationGetMemoryRpc,
  WsAutomationResolveProposalRpc,
  WsBootstrapRpcGroup,
  WsFeatureRpcGroup,
  WsProjectsDiscoverScriptsRpc,
  WsProjectsProvisionFromGitHubRpc,
  WsPullRequestsReviewRequestCountRpc,
  WsRpcError,
  WsRpcGroup,
} from "./rpc";
import { ORCHESTRATION_WS_METHODS } from "./orchestration";
import { WS_METHODS } from "./ws";

describe("WS RPC contracts", () => {
  it("exports the additive Effect RPC group", () => {
    expect(WsRpcGroup).toBeDefined();
    expect(WsBootstrapRpcGroup.requests.has("bootstrap.negotiate")).toBe(true);
    expect(WsFeatureRpcGroup.requests.has("bootstrap.negotiate")).toBe(false);
    expect(
      WsFeatureRpcGroup.requests.has(ORCHESTRATION_WS_METHODS.listProviderDeliveryBlockers),
    ).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(ORCHESTRATION_WS_METHODS.reconcileProviderDelivery)).toBe(
      true,
    );
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesList)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesGet)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesBeginLogin)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesAnswerLogin)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesCancelLogin)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesLogout)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesRevealApiKey)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesRefresh)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.projectsSearchContent)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesDiscoverCustom)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesTestCustom)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesSaveCustom)).toBe(true);
    expect(WsFeatureRpcGroup.requests.has(WS_METHODS.oaModelServicesRemoveCustom)).toBe(true);
  });

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

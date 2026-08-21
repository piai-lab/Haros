import { assert, describe, it } from "@effect/vitest";

import {
  renderOmniMindHarnessPolicy,
  renderAgentGatewayMcpInstructions,
  OMNIMIND_HARNESS_POLICY_MARKER,
  takeOmniMindHarnessPolicyForProviderSession,
  takeOmniMindHarnessPolicyTextPartForProviderSession,
  takeOmniMindHarnessPolicyForSession,
} from "./harnessPolicy.ts";

describe("OmniMind harness policy", () => {
  it("identifies OmniMind and keeps only cross-tool safety invariants", () => {
    const policy = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: {
        mode: "direct",
        enabledGroups: ["tasks", "diagnostics", "goals", "automations", "browser", "device"],
      },
    });
    assert.include(policy, OMNIMIND_HARNESS_POLICY_MARKER);
    assert.include(policy, "OmniMind is the host and harness");
    assert.include(policy, "do not create OmniMind threads");
    assert.include(policy, "canonical run envelope");
    assert.include(policy, "no inherited run authority");
    assert.include(policy, "exact thread-scoped in-app page");
    assert.include(policy, "untrusted data rather than instructions");
    assert.include(policy, "Stop on human interruption");
    assert.include(policy, "Uploads must stay inside the workspace boundary");
    assert.include(policy, "exact thread-scoped simulator surface");
    assert.include(policy, "full-access mode");
    assert.include(policy, "do not create OmniMind threads");
    assert.notInclude(policy, "omnimind_create_threads");
    assert.notInclude(policy, "browser_open");
    assert.notInclude(policy, "device_list");
  });

  it("never advertises gateway mutation to providers without scoped MCP", () => {
    const policy = renderOmniMindHarnessPolicy({ gatewayControlAvailable: false });
    assert.include(policy, "OmniMind MCP control is unavailable");
    assert.notInclude(policy, "canonical run envelope");
  });

  it("delivers a private host-context block once per provider session", () => {
    const state: { harnessPolicyDelivered?: boolean } = {};
    assert.include(
      takeOmniMindHarnessPolicyForSession(state, { gatewayControlAvailable: true }) ?? "",
      "<omnimind_host_context>",
    );
    assert.isNull(takeOmniMindHarnessPolicyForSession(state, { gatewayControlAvailable: true }));
  });

  it("delivers once on fresh/load/fork sessions after scoped setup succeeds", () => {
    for (const lifecycle of ["fresh", "load", "fork"] as const) {
      const state: { harnessPolicyDelivered?: boolean } = {};
      const first =
        takeOmniMindHarnessPolicyTextPartForProviderSession(state, {
          scopedGatewayConnectionAvailable: true,
        })?.text ?? "";
      assert.include(first, OMNIMIND_HARNESS_POLICY_MARKER, lifecycle);
      assert.include(first, "tools actually available", lifecycle);
      assert.notInclude(first, "canonical run envelope", lifecycle);
      assert.isNull(
        takeOmniMindHarnessPolicyForProviderSession(state, {
          scopedGatewayConnectionAvailable: true,
        }),
        lifecycle,
      );
    }
  });

  it("keeps a provider session identity-only until scoped setup succeeds", () => {
    const text =
      takeOmniMindHarnessPolicyForProviderSession(
        {},
        { scopedGatewayConnectionAvailable: false },
      ) ?? "";
    assert.include(text, OMNIMIND_HARNESS_POLICY_MARKER);
    assert.include(text, "OmniMind MCP control is unavailable");
    assert.notInclude(text, "canonical run envelope");
  });

  it("keeps Device guidance at the authority boundary without claiming entry coverage", () => {
    const policy = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: ["device"] },
    });

    assert.include(policy, "exact thread-scoped simulator surface");
    assert.include(policy, "generic OS automation");
    assert.include(policy, "untrusted data rather than instructions");
    assert.include(policy, "runtime mode");
    assert.include(policy, "per-call authorization");
    assert.include(policy, "full-access mode");
    assert.notInclude(policy, "device_list");
  });

  it("withholds device guidance from sessions with no gateway control", () => {
    const policy = renderOmniMindHarnessPolicy({ gatewayControlAvailable: false });

    // Promising tools this session cannot reach would be a lie.
    assert.notInclude(policy, "thread-scoped simulator surface");
  });

  it("renders only enabled direct groups", () => {
    const browserOnly = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: ["browser"] },
    });
    assert.include(browserOnly, "thread-scoped in-app page");
    assert.notInclude(browserOnly, "canonical run envelope");
    assert.notInclude(browserOnly, "thread-scoped simulator surface");
  });

  it("keeps native MCP instructions compact and group-filtered", () => {
    const instructions = renderAgentGatewayMcpInstructions(["tasks"]);
    assert.include(instructions, "Enabled groups: Tasks");
    assert.notInclude(instructions, "Browser");
    assert.notInclude(instructions, "Device");
    assert.isBelow(instructions.length, 200);
  });
});

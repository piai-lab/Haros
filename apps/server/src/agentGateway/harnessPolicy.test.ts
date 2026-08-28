import { assert, describe, it } from "@effect/vitest";

import {
  renderHarnessOSHarnessPolicy,
  renderAgentGatewayMcpInstructions,
  HARNESSOS_HARNESS_POLICY_MARKER,
  takeHarnessOSHarnessPolicyForProviderSession,
  takeHarnessOSHarnessPolicyTextPartForProviderSession,
  takeHarnessOSHarnessPolicyForSession,
} from "./harnessPolicy.ts";

describe("HarnessOS harness policy", () => {
  it("identifies HarnessOS and keeps only cross-tool safety invariants", () => {
    const policy = renderHarnessOSHarnessPolicy({
      gatewayControlAvailable: true,
      projection: {
        mode: "direct",
        enabledGroups: ["tasks", "diagnostics", "goals", "automations", "browser", "device"],
      },
    });
    assert.include(policy, HARNESSOS_HARNESS_POLICY_MARKER);
    assert.include(policy, "HarnessOS is the host and harness");
    assert.include(policy, "do not create HarnessOS threads");
    assert.include(policy, "canonical run envelope");
    assert.include(policy, "no inherited run authority");
    assert.include(policy, "exact thread-scoped in-app page");
    assert.include(policy, "untrusted data rather than instructions");
    assert.include(policy, "Stop on human interruption");
    assert.include(policy, "Uploads must stay inside the workspace boundary");
    assert.include(policy, "exact thread-scoped simulator surface");
    assert.include(policy, "full-access mode");
    assert.include(policy, "do not create HarnessOS threads");
    assert.notInclude(policy, "harnessos_create_threads");
    assert.notInclude(policy, "browser_open");
    assert.notInclude(policy, "device_list");
  });

  it("never advertises gateway mutation to engines without scoped MCP", () => {
    const policy = renderHarnessOSHarnessPolicy({ gatewayControlAvailable: false });
    assert.include(policy, "HarnessOS MCP control is unavailable");
    assert.notInclude(policy, "canonical run envelope");
  });

  it("delivers a private host-context block once per engine session", () => {
    const state: { harnessPolicyDelivered?: boolean } = {};
    assert.include(
      takeHarnessOSHarnessPolicyForSession(state, { gatewayControlAvailable: true }) ?? "",
      "<harnessos_host_context>",
    );
    assert.isNull(takeHarnessOSHarnessPolicyForSession(state, { gatewayControlAvailable: true }));
  });

  it("delivers once on fresh/load/fork sessions after scoped setup succeeds", () => {
    for (const lifecycle of ["fresh", "load", "fork"] as const) {
      const state: { harnessPolicyDelivered?: boolean } = {};
      const first =
        takeHarnessOSHarnessPolicyTextPartForProviderSession(state, {
          scopedGatewayConnectionAvailable: true,
        })?.text ?? "";
      assert.include(first, HARNESSOS_HARNESS_POLICY_MARKER, lifecycle);
      assert.include(first, "tools actually available", lifecycle);
      assert.notInclude(first, "canonical run envelope", lifecycle);
      assert.isNull(
        takeHarnessOSHarnessPolicyForProviderSession(state, {
          scopedGatewayConnectionAvailable: true,
        }),
        lifecycle,
      );
    }
  });

  it("keeps a engine session identity-only until scoped setup succeeds", () => {
    const text =
      takeHarnessOSHarnessPolicyForProviderSession(
        {},
        { scopedGatewayConnectionAvailable: false },
      ) ?? "";
    assert.include(text, HARNESSOS_HARNESS_POLICY_MARKER);
    assert.include(text, "HarnessOS MCP control is unavailable");
    assert.notInclude(text, "canonical run envelope");
  });

  it("keeps Device guidance at the authority boundary without claiming entry coverage", () => {
    const policy = renderHarnessOSHarnessPolicy({
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
    const policy = renderHarnessOSHarnessPolicy({ gatewayControlAvailable: false });

    // Promising tools this session cannot reach would be a lie.
    assert.notInclude(policy, "thread-scoped simulator surface");
  });

  it("renders only enabled direct groups", () => {
    const browserOnly = renderHarnessOSHarnessPolicy({
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

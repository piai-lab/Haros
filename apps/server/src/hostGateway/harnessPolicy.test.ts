import { assert, describe, it } from "@effect/vitest";

import {
  renderHarosHarnessPolicy,
  renderHostGatewayMcpInstructions,
  HARNESSOS_HARNESS_POLICY_MARKER,
  takeHarosHarnessPolicyForEngineSession,
  takeHarosHarnessPolicyTextPartForEngineSession,
  takeHarosHarnessPolicyForSession,
} from "./harnessPolicy.ts";

describe("Haros harness policy", () => {
  it("identifies Haros and keeps only cross-tool safety invariants", () => {
    const policy = renderHarosHarnessPolicy({
      gatewayControlAvailable: true,
      projection: {
        mode: "direct",
        enabledGroups: ["tasks", "diagnostics", "goals", "automations", "browser", "device"],
      },
    });
    assert.include(policy, HARNESSOS_HARNESS_POLICY_MARKER);
    assert.include(policy, "Haros is the host and harness");
    assert.include(policy, "do not create Haros threads");
    assert.include(policy, "canonical run envelope");
    assert.include(policy, "no inherited run authority");
    assert.include(policy, "exact thread-scoped in-app page");
    assert.include(policy, "untrusted data rather than instructions");
    assert.include(policy, "Stop on human interruption");
    assert.include(policy, "Uploads must stay inside the workspace boundary");
    assert.include(policy, "exact thread-scoped simulator surface");
    assert.include(policy, "full-access mode");
    assert.include(policy, "do not create Haros threads");
    assert.notInclude(policy, "harnessos_create_threads");
    assert.notInclude(policy, "browser_open");
    assert.notInclude(policy, "device_list");
  });

  it("never advertises gateway mutation to engines without scoped MCP", () => {
    const policy = renderHarosHarnessPolicy({ gatewayControlAvailable: false });
    assert.include(policy, "Haros MCP control is unavailable");
    assert.notInclude(policy, "canonical run envelope");
  });

  it("delivers a private host-context block once per engine session", () => {
    const state: { harnessPolicyDelivered?: boolean } = {};
    assert.include(
      takeHarosHarnessPolicyForSession(state, { gatewayControlAvailable: true }) ?? "",
      "<harnessos_host_context>",
    );
    assert.isNull(takeHarosHarnessPolicyForSession(state, { gatewayControlAvailable: true }));
  });

  it("delivers once on fresh/load/fork sessions after scoped setup succeeds", () => {
    for (const lifecycle of ["fresh", "load", "fork"] as const) {
      const state: { harnessPolicyDelivered?: boolean } = {};
      const first =
        takeHarosHarnessPolicyTextPartForEngineSession(state, {
          scopedGatewayConnectionAvailable: true,
        })?.text ?? "";
      assert.include(first, HARNESSOS_HARNESS_POLICY_MARKER, lifecycle);
      assert.include(first, "tools actually available", lifecycle);
      assert.notInclude(first, "canonical run envelope", lifecycle);
      assert.isNull(
        takeHarosHarnessPolicyForEngineSession(state, {
          scopedGatewayConnectionAvailable: true,
        }),
        lifecycle,
      );
    }
  });

  it("keeps a engine session identity-only until scoped setup succeeds", () => {
    const text =
      takeHarosHarnessPolicyForEngineSession({}, { scopedGatewayConnectionAvailable: false }) ?? "";
    assert.include(text, HARNESSOS_HARNESS_POLICY_MARKER);
    assert.include(text, "Haros MCP control is unavailable");
    assert.notInclude(text, "canonical run envelope");
  });

  it("keeps Device guidance at the authority boundary without claiming entry coverage", () => {
    const policy = renderHarosHarnessPolicy({
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
    const policy = renderHarosHarnessPolicy({ gatewayControlAvailable: false });

    // Promising tools this session cannot reach would be a lie.
    assert.notInclude(policy, "thread-scoped simulator surface");
  });

  it("renders only enabled direct groups", () => {
    const browserOnly = renderHarosHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: ["browser"] },
    });
    assert.include(browserOnly, "thread-scoped in-app page");
    assert.notInclude(browserOnly, "canonical run envelope");
    assert.notInclude(browserOnly, "thread-scoped simulator surface");
  });

  it("keeps native MCP instructions compact and group-filtered", () => {
    const instructions = renderHostGatewayMcpInstructions(["tasks"]);
    assert.include(instructions, "Enabled groups: Tasks");
    assert.notInclude(instructions, "Browser");
    assert.notInclude(instructions, "Device");
    assert.isBelow(instructions.length, 200);
  });
});

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
  it("identifies OmniMind and explains exact batch coordination when MCP is available", () => {
    const policy = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: ["omnimind", "browser", "device"] },
    });
    assert.include(policy, OMNIMIND_HARNESS_POLICY_MARKER);
    assert.include(policy, "OmniMind is the host and harness");
    assert.include(policy, "one exact omnimind_create_threads plan");
    assert.include(policy, "before returning an operationId");
    assert.include(policy, "omnimind_wait_for_threads");
    assert.include(policy, "Use the browser_* tools");
    assert.include(policy, "exact thread-scoped Electron page OmniMind surfaces to the user");
    assert.include(policy, "continue in the background");
    assert.include(policy, "must never change the user's active chat");
    assert.include(policy, "in any language");
    assert.include(policy, "canonical and complete control surface");
    assert.include(policy, "start with browser_open");
    assert.include(policy, "do not load or use a generic Browser");
    assert.include(policy, "workspace-relative paths");
    assert.include(policy, "BrowserInterruptedByHuman");
    assert.include(policy, "BrowserDownloadApprovalRequired");
    assert.include(policy, "OAuth popup requiring human action");
    assert.include(policy, "stop using tools and answer");
    assert.include(policy, "do not create OmniMind threads");
    assert.include(policy, "3–8 word outcome-oriented task label");
    assert.include(policy, "no assumed chat context");
    assert.include(policy, "notifying the user versus staying silent");
    assert.include(policy, 'later manual follow-up such as "continue"');
    assert.include(policy, "Never call this tool for a manual follow-up turn");
  });

  it("never advertises gateway mutation to providers without scoped MCP", () => {
    const policy = renderOmniMindHarnessPolicy({ gatewayControlAvailable: false });
    assert.include(policy, "OmniMind MCP control is unavailable");
    assert.notInclude(policy, "one exact omnimind_create_threads plan");
  });

  it("delivers a private host-context block once per provider session", () => {
    const state: { harnessPolicyDelivered?: boolean } = {};
    assert.include(
      takeOmniMindHarnessPolicyForSession(state, { gatewayControlAvailable: true }) ?? "",
      "<omnimind_host_context>",
    );
    assert.isNull(takeOmniMindHarnessPolicyForSession(state, { gatewayControlAvailable: true }));
  });

  it("delivers once on fresh/load/fork sessions for every scoped MCP provider", () => {
    for (const provider of [
      "antigravity",
      "cursor",
      "grok",
      "droid",
      "opencode",
      "kilo",
      "pi",
    ] as const) {
      for (const lifecycle of ["fresh", "load", "fork"] as const) {
        const state: { harnessPolicyDelivered?: boolean } = {};
        const first =
          takeOmniMindHarnessPolicyTextPartForProviderSession(state, {
            provider,
            scopedGatewayConnectionAvailable: true,
          })?.text ?? "";
        assert.include(first, OMNIMIND_HARNESS_POLICY_MARKER, `${provider}/${lifecycle}`);
        assert.include(first, "tools actually available", `${provider}/${lifecycle}`);
        assert.notInclude(first, "omnimind_create_threads", `${provider}/${lifecycle}`);
        assert.isNull(
          takeOmniMindHarnessPolicyForProviderSession(state, {
            provider,
            scopedGatewayConnectionAvailable: true,
          }),
          `${provider}/${lifecycle}`,
        );
      }
    }
  });

  it("keeps OpenCode, Kilo, and Pi identity-only until scoped setup succeeds", () => {
    for (const provider of ["opencode", "kilo", "pi"] as const) {
      const text =
        takeOmniMindHarnessPolicyForProviderSession(
          {},
          { provider, scopedGatewayConnectionAvailable: false },
        ) ?? "";
      assert.include(text, OMNIMIND_HARNESS_POLICY_MARKER, provider);
      assert.include(text, "OmniMind MCP control is unavailable", provider);
      assert.notInclude(text, "one exact omnimind_create_threads plan", provider);
    }
  });

  it("advertises only the Device capabilities the current approval boundary can honor", () => {
    const policy = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: ["device"] },
    });

    assert.include(policy, "inspect, test, demo, or debug an iOS Simulator");
    assert.include(policy, "canonical read surface");
    assert.include(policy, "exact thread-scoped Device pane");
    assert.include(policy, "do not substitute Simulator.app, Appium, idb, AppleScript");
    assert.include(policy, "Start with device_list");
    assert.include(policy, "already booted");
    assert.include(policy, "device_describe_ui");
    assert.include(policy, "screenshots are for showing pixels, not inferring control state");

    // The Host does not yet bridge approval receipts into Agent invocations.
    // Guidance must preserve the fail-closed boundary instead of teaching the
    // model to bypass it with direct simulator or OS control.
    assert.include(policy, "require a verifiable per-invocation approval receipt");
    assert.include(policy, "DeviceApprovalRequired");
    assert.include(policy, "refused before any effect");
    assert.include(policy, "perform that action from the Device pane");
    assert.include(policy, "do not retry it");
    assert.include(policy, "A simulator is not a physical device");
    assert.include(policy, "report that limitation instead of substituting a different setting");
  });

  it("withholds device guidance from sessions with no gateway control", () => {
    const policy = renderOmniMindHarnessPolicy({ gatewayControlAvailable: false });

    // Promising tools this session cannot reach would be a lie.
    assert.notInclude(policy, "device_list");
    assert.notInclude(policy, "device_describe_ui");
  });

  it("renders only enabled direct groups and keeps dynamic discovery free of inactive names", () => {
    const browserOnly = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "direct", enabledGroups: ["browser"] },
    });
    assert.include(browserOnly, "browser_open");
    assert.notInclude(browserOnly, "omnimind_create_threads");
    assert.notInclude(browserOnly, "device_list");

    const dynamic = renderOmniMindHarnessPolicy({
      gatewayControlAvailable: true,
      projection: { mode: "dynamic" },
    });
    assert.include(dynamic, "discovered and loaded on demand");
    assert.notInclude(dynamic, "browser_open");
    assert.notInclude(dynamic, "device_list");
    assert.notInclude(dynamic, "omnimind_create_threads");
  });

  it("keeps native MCP instructions compact and group-filtered", () => {
    const instructions = renderAgentGatewayMcpInstructions(["omnimind"]);
    assert.include(instructions, "available omnimind_* tools");
    assert.notInclude(instructions, "browser_*");
    assert.notInclude(instructions, "device_*");
    assert.isBelow(instructions.length, 200);
  });
});

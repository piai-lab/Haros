import { PROVIDER_KINDS } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import { resolveProviderExecutionCapabilities } from "./executionCapabilityProjection.ts";
import {
  PROVIDER_EXECUTION_STRUCTURE,
  providerExecutionStructure,
} from "./providerExecutionStructure.ts";

const readyStatus = (provider: (typeof PROVIDER_KINDS)[number]) => ({
  provider,
  status: "ready" as const,
  available: true,
  authStatus: "authenticated" as const,
  supportsAutoRuntimeMode: true,
  checkedAt: "2026-08-25T00:00:00.000Z",
});

describe("provider execution capability projection", () => {
  it("keeps the structural descriptor exhaustive over canonical identity", () => {
    expect(Object.keys(PROVIDER_EXECUTION_STRUCTURE)).toEqual([...PROVIDER_KINDS]);
  });

  it.each(PROVIDER_KINDS)("projects the canonical interaction-mode matrix for %s", (provider) => {
    const result = resolveProviderExecutionCapabilities({
      modelSelection: { provider, model: `${provider}-test` },
      adapterCapabilities: providerExecutionStructure(provider),
      providerStatus: readyStatus(provider),
    });
    expect(result.interactionModes.default).toMatchObject({
      mode: "default", structurallySupported: true, status: "ready",
    });
    expect(result.interactionModes.debug).toMatchObject({
      mode: "debug", structurallySupported: true, status: "ready",
    });
    expect(result.interactionModes.plan).toMatchObject(
      provider === "pi" || provider === "antigravity"
        ? { mode: "plan", structurallySupported: false, reason: "mode-unsupported" }
        : { mode: "plan", structurallySupported: true, status: "ready" },
    );
  });

  it("fails closed when the adapter is not registered", () => {
    const result = resolveProviderExecutionCapabilities({
      modelSelection: { provider: "codex", model: "gpt-test" },
      adapterCapabilities: null,
      providerStatus: readyStatus("codex"),
    });

    expect(result.supportsNativeTurnSteering).toBe(false);
    expect(result.runtimeModes.auto).toMatchObject({
      structurallySupported: false,
      status: "unavailable",
      reason: "adapter-unregistered",
    });
    expect(result.interactionModes.plan).toMatchObject({
      structurallySupported: false,
      status: "unavailable",
      reason: "adapter-unregistered",
    });
  });

  it.each(["omnimind", "pi"] as const)(
    "does not advertise approval-required for Pi-family provider %s without a request bridge",
    (provider) => {
      const result = resolveProviderExecutionCapabilities({
        modelSelection: { provider, model: `${provider}-test` },
        adapterCapabilities: providerExecutionStructure(provider),
        providerStatus: readyStatus(provider),
      });

      expect(result.runtimeModes["full-access"].status).toBe("ready");
      expect(result.runtimeModes["approval-required"]).toMatchObject({
        structurallySupported: false,
        reason: "mode-unsupported",
      });
    },
  );

  it("separates model support from current CLI health for Auto", () => {
    const structure = providerExecutionStructure("claudeAgent");
    const unsupportedModel = resolveProviderExecutionCapabilities({
      modelSelection: {
        provider: "claudeAgent",
        model: "claude-test",
        supportsAutoMode: false,
      },
      adapterCapabilities: structure,
      providerStatus: readyStatus("claudeAgent"),
    });
    expect(unsupportedModel.runtimeModes.auto).toMatchObject({
      structurallySupported: false,
      reason: "model-unsupported",
    });

    const unsupportedCli = resolveProviderExecutionCapabilities({
      modelSelection: { provider: "codex", model: "gpt-test" },
      adapterCapabilities: providerExecutionStructure("codex"),
      providerStatus: { ...readyStatus("codex"), supportsAutoRuntimeMode: false },
    });
    expect(unsupportedCli.runtimeModes.auto).toMatchObject({
      structurallySupported: true,
      status: "unavailable",
      reason: "runtime-version-unsupported",
    });
  });

  it("preserves structural support while transient health is degraded", () => {
    const result = resolveProviderExecutionCapabilities({
      modelSelection: { provider: "codex", model: "gpt-test" },
      adapterCapabilities: providerExecutionStructure("codex"),
      providerStatus: {
        ...readyStatus("codex"),
        status: "warning",
      },
    });

    expect(result.runtimeModes["full-access"]).toMatchObject({
      structurallySupported: true,
      status: "degraded",
      reason: "runtime-degraded",
    });
  });

  it("keeps provider health failures ahead of Auto-version evidence", () => {
    const notInstalled = resolveProviderExecutionCapabilities({
      modelSelection: { provider: "codex", model: "gpt-test" },
      adapterCapabilities: providerExecutionStructure("codex"),
      providerStatus: {
        ...readyStatus("codex"),
        status: "error",
        available: false,
        unavailableReason: "not_installed",
        supportsAutoRuntimeMode: false,
      },
    });
    expect(notInstalled.runtimeModes.auto).toMatchObject({
      structurallySupported: true,
      status: "unavailable",
      reason: "provider-not-installed",
    });

    const unknownVersion = resolveProviderExecutionCapabilities({
      modelSelection: { provider: "codex", model: "gpt-test" },
      adapterCapabilities: providerExecutionStructure("codex"),
      providerStatus: {
        provider: "codex",
        status: "ready",
        available: true,
        authStatus: "authenticated",
        checkedAt: "2026-08-25T00:00:00.000Z",
      },
    });
    expect(unknownVersion.runtimeModes.auto).toMatchObject({
      structurallySupported: true,
      status: "unknown",
      reason: "runtime-health-unknown",
    });
  });
});

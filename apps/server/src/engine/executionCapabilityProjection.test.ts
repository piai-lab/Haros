import { ENGINE_KINDS, type EngineKind } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import { resolveEngineExecutionCapabilities } from "./executionCapabilityProjection.ts";
import {
  ENGINE_EXECUTION_STRUCTURE,
  engineExecutionStructure,
} from "./engineExecutionStructure.ts";

const readyStatus = (engine: (typeof ENGINE_KINDS)[number]) => ({
  engine,
  status: "ready" as const,
  available: true,
  authStatus: "authenticated" as const,
  supportsAutoRuntimeMode: true,
  checkedAt: "2026-08-25T00:00:00.000Z",
});

describe("engine execution capability projection", () => {
  it("projects no execution capability for an engine without registered structure", () => {
    const structure = engineExecutionStructure("unregistered" as EngineKind);
    expect(structure.supportsTurnSteering).toBe(false);
    expect([...structure.supportedRuntimeModes]).toEqual([]);
    expect([...structure.supportedInteractionModes]).toEqual([]);
  });

  it("keeps the structural descriptor exhaustive over canonical identity", () => {
    expect(Object.keys(ENGINE_EXECUTION_STRUCTURE)).toEqual([...ENGINE_KINDS]);
  });

  it.each(ENGINE_KINDS)("projects the canonical interaction-mode matrix for %s", (engine) => {
    const result = resolveEngineExecutionCapabilities({
      engineSelection: { engine, model: `${engine}-test` },
      adapterCapabilities: engineExecutionStructure(engine),
      engineStatus: readyStatus(engine),
    });
    expect(result.interactionModes.default).toMatchObject({
      mode: "default",
      structurallySupported: true,
      status: "ready",
    });
    expect(result.interactionModes.debug).toMatchObject({
      mode: "debug",
      structurallySupported: true,
      status: "ready",
    });
    expect(result.interactionModes.plan).toMatchObject(
      engine === "pi" || engine === "antigravity"
        ? { mode: "plan", structurallySupported: false, reason: "mode-unsupported" }
        : { mode: "plan", structurallySupported: true, status: "ready" },
    );
  });

  it("fails closed when the adapter is not registered", () => {
    const result = resolveEngineExecutionCapabilities({
      engineSelection: { engine: "codex", model: "gpt-test" },
      adapterCapabilities: null,
      engineStatus: readyStatus("codex"),
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

  it.each(["oa", "pi"] as const)(
    "does not advertise approval-required for Pi-family engine %s without a request bridge",
    (engine) => {
      const result = resolveEngineExecutionCapabilities({
        engineSelection: { engine, model: `${engine}-test` },
        adapterCapabilities: engineExecutionStructure(engine),
        engineStatus: readyStatus(engine),
      });

      expect(result.runtimeModes["full-access"].status).toBe("ready");
      expect(result.runtimeModes["approval-required"]).toMatchObject({
        structurallySupported: false,
        reason: "mode-unsupported",
      });
    },
  );

  it("separates model support from current CLI health for Auto", () => {
    const structure = engineExecutionStructure("claude");
    const unsupportedModel = resolveEngineExecutionCapabilities({
      engineSelection: {
        engine: "claude",
        model: "claude-test",
        supportsAutoMode: false,
      },
      adapterCapabilities: structure,
      engineStatus: readyStatus("claude"),
    });
    expect(unsupportedModel.runtimeModes.auto).toMatchObject({
      structurallySupported: false,
      reason: "model-unsupported",
    });

    const unsupportedCli = resolveEngineExecutionCapabilities({
      engineSelection: { engine: "codex", model: "gpt-test" },
      adapterCapabilities: engineExecutionStructure("codex"),
      engineStatus: { ...readyStatus("codex"), supportsAutoRuntimeMode: false },
    });
    expect(unsupportedCli.runtimeModes.auto).toMatchObject({
      structurallySupported: true,
      status: "unavailable",
      reason: "runtime-version-unsupported",
    });
  });

  it("preserves structural support while transient health is degraded", () => {
    const result = resolveEngineExecutionCapabilities({
      engineSelection: { engine: "codex", model: "gpt-test" },
      adapterCapabilities: engineExecutionStructure("codex"),
      engineStatus: {
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

  it("keeps engine health failures ahead of Auto-version evidence", () => {
    const notInstalled = resolveEngineExecutionCapabilities({
      engineSelection: { engine: "codex", model: "gpt-test" },
      adapterCapabilities: engineExecutionStructure("codex"),
      engineStatus: {
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
      reason: "engine-not-installed",
    });

    const unknownVersion = resolveEngineExecutionCapabilities({
      engineSelection: { engine: "codex", model: "gpt-test" },
      adapterCapabilities: engineExecutionStructure("codex"),
      engineStatus: {
        engine: "codex",
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

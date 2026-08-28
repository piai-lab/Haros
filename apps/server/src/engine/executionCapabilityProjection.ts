import type {
  EngineSelection,
  EngineInteractionMode,
  EngineExecutionCapabilities,
  EngineExecutionCapabilityReason,
  EngineExecutionCapabilityStatus,
  RuntimeMode,
  ServerEngineStatus,
} from "@harnessos/contracts";
import { ENGINE_INTERACTION_MODES } from "@harnessos/contracts";

import type { EngineAdapterCapabilities } from "./Services/EngineAdapter.ts";

type EngineExecutionStructureCapabilities = Pick<
  EngineAdapterCapabilities,
  "supportsTurnSteering" | "supportedRuntimeModes" | "supportedInteractionModes"
>;

const RUNTIME_MODES = ["full-access", "auto", "approval-required"] as const;

function healthDisposition(status: ServerEngineStatus | undefined): {
  readonly status: EngineExecutionCapabilityStatus;
  readonly reason?: EngineExecutionCapabilityReason;
} {
  if (!status) {
    return { status: "unknown", reason: "runtime-health-unknown" };
  }
  if (status.unavailableReason === "not_installed") {
    return { status: "unavailable", reason: "engine-not-installed" };
  }
  if (status.authStatus === "unauthenticated") {
    return { status: "unavailable", reason: "authentication-required" };
  }
  if (!status.available || status.status === "error") {
    return { status: "unavailable", reason: "runtime-health-unknown" };
  }
  if (status.status === "warning" || status.authStatus === "unknown") {
    return { status: "degraded", reason: "runtime-degraded" };
  }
  return { status: "ready" };
}

function structuralModeReason(input: {
  readonly mode: RuntimeMode;
  readonly engineSelection: EngineSelection;
  readonly adapterCapabilities: EngineExecutionStructureCapabilities;
}): EngineExecutionCapabilityReason | null {
  if (!input.adapterCapabilities.supportedRuntimeModes?.has(input.mode)) {
    return "mode-unsupported";
  }
  if (input.mode !== "auto" || input.engineSelection.engine !== "claude") {
    return null;
  }
  if (input.engineSelection.supportsAutoMode === false) {
    return "model-unsupported";
  }
  return input.engineSelection.supportsAutoMode === true ? null : "model-capability-unknown";
}

export function resolveEngineExecutionCapabilities(input: {
  readonly engineSelection: EngineSelection;
  readonly adapterCapabilities: EngineExecutionStructureCapabilities | null;
  readonly engineStatus?: ServerEngineStatus | undefined;
}): EngineExecutionCapabilities {
  const engine = input.engineSelection.engine;
  if (!input.adapterCapabilities) {
    const unsupported = (mode: RuntimeMode) => ({
      mode,
      structurallySupported: false,
      status: "unavailable" as const,
      reason: "adapter-unregistered" as const,
    });
    const interactionUnsupported = (mode: EngineInteractionMode) => ({
      mode,
      structurallySupported: false,
      status: "unavailable" as const,
      reason: "adapter-unregistered" as const,
    });
    return {
      engine,
      model: input.engineSelection.model,
      supportsNativeTurnSteering: false,
      runtimeModes: {
        "full-access": unsupported("full-access"),
        auto: unsupported("auto"),
        "approval-required": unsupported("approval-required"),
      },
      interactionModes: {
        default: interactionUnsupported("default"),
        plan: interactionUnsupported("plan"),
        debug: interactionUnsupported("debug"),
        converge: interactionUnsupported("converge"),
        learn: interactionUnsupported("learn"),
      },
    };
  }

  const health = healthDisposition(input.engineStatus);
  const runtimeModes = Object.fromEntries(
    RUNTIME_MODES.map((mode) => {
      const unsupportedReason = structuralModeReason({
        mode,
        engineSelection: input.engineSelection,
        adapterCapabilities: input.adapterCapabilities!,
      });
      if (unsupportedReason) {
        return [
          mode,
          {
            mode,
            structurallySupported: false,
            status: "unavailable" as const,
            reason: unsupportedReason,
          },
        ];
      }
      if (mode === "auto" && health.status !== "unavailable" && health.status !== "unknown") {
        if (input.engineStatus?.supportsAutoRuntimeMode === true) {
          return [
            mode,
            {
              mode,
              structurallySupported: true,
              ...health,
            },
          ];
        }
        return [
          mode,
          {
            mode,
            structurallySupported: true,
            status:
              input.engineStatus?.supportsAutoRuntimeMode === false
                ? ("unavailable" as const)
                : ("unknown" as const),
            reason:
              input.engineStatus?.supportsAutoRuntimeMode === false
                ? ("runtime-version-unsupported" as const)
                : ("runtime-health-unknown" as const),
          },
        ];
      }
      return [
        mode,
        {
          mode,
          structurallySupported: true,
          ...health,
        },
      ];
    }),
  ) as EngineExecutionCapabilities["runtimeModes"];
  const interactionModes = Object.fromEntries(
    ENGINE_INTERACTION_MODES.map((mode) => {
      if (!input.adapterCapabilities!.supportedInteractionModes?.has(mode)) {
        return [
          mode,
          {
            mode,
            structurallySupported: false,
            status: "unavailable" as const,
            reason: "mode-unsupported" as const,
          },
        ];
      }
      return [mode, { mode, structurallySupported: true, ...health }];
    }),
  ) as EngineExecutionCapabilities["interactionModes"];

  return {
    engine,
    model: input.engineSelection.model,
    supportsNativeTurnSteering: input.adapterCapabilities.supportsTurnSteering === true,
    runtimeModes,
    interactionModes,
  };
}

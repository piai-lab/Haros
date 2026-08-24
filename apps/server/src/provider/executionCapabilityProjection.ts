import type {
  ModelSelection,
  ProviderExecutionCapabilities,
  ProviderExecutionCapabilityReason,
  ProviderExecutionCapabilityStatus,
  RuntimeMode,
  ServerProviderStatus,
} from "@omnimind/contracts";

import type { ProviderAdapterCapabilities } from "./Services/ProviderAdapter.ts";

type ProviderExecutionStructureCapabilities = Pick<
  ProviderAdapterCapabilities,
  "supportsTurnSteering" | "supportedRuntimeModes"
>;

const RUNTIME_MODES = ["full-access", "auto", "approval-required"] as const;

function healthDisposition(status: ServerProviderStatus | undefined): {
  readonly status: ProviderExecutionCapabilityStatus;
  readonly reason?: ProviderExecutionCapabilityReason;
} {
  if (!status) {
    return { status: "unknown", reason: "runtime-health-unknown" };
  }
  if (status.unavailableReason === "not_installed") {
    return { status: "unavailable", reason: "provider-not-installed" };
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
  readonly modelSelection: ModelSelection;
  readonly adapterCapabilities: ProviderExecutionStructureCapabilities;
}): ProviderExecutionCapabilityReason | null {
  if (!input.adapterCapabilities.supportedRuntimeModes?.has(input.mode)) {
    return "mode-unsupported";
  }
  if (input.mode !== "auto" || input.modelSelection.provider !== "claudeAgent") {
    return null;
  }
  if (input.modelSelection.supportsAutoMode === false) {
    return "model-unsupported";
  }
  return input.modelSelection.supportsAutoMode === true ? null : "model-capability-unknown";
}

export function resolveProviderExecutionCapabilities(input: {
  readonly modelSelection: ModelSelection;
  readonly adapterCapabilities: ProviderExecutionStructureCapabilities | null;
  readonly providerStatus?: ServerProviderStatus | undefined;
}): ProviderExecutionCapabilities {
  const provider = input.modelSelection.provider;
  if (!input.adapterCapabilities) {
    const unsupported = (mode: RuntimeMode) => ({
      mode,
      structurallySupported: false,
      status: "unavailable" as const,
      reason: "adapter-unregistered" as const,
    });
    return {
      provider,
      model: input.modelSelection.model,
      supportsNativeTurnSteering: false,
      runtimeModes: {
        "full-access": unsupported("full-access"),
        auto: unsupported("auto"),
        "approval-required": unsupported("approval-required"),
      },
    };
  }

  const health = healthDisposition(input.providerStatus);
  const runtimeModes = Object.fromEntries(
    RUNTIME_MODES.map((mode) => {
      const unsupportedReason = structuralModeReason({
        mode,
        modelSelection: input.modelSelection,
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
        if (input.providerStatus?.supportsAutoRuntimeMode === true) {
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
              input.providerStatus?.supportsAutoRuntimeMode === false
                ? ("unavailable" as const)
                : ("unknown" as const),
            reason:
              input.providerStatus?.supportsAutoRuntimeMode === false
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
  ) as ProviderExecutionCapabilities["runtimeModes"];

  return {
    provider,
    model: input.modelSelection.model,
    supportsNativeTurnSteering: input.adapterCapabilities.supportsTurnSteering === true,
    runtimeModes,
  };
}

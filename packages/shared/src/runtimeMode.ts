import type {
  ProviderExecutionCapabilityReason,
  ProviderRuntimeModeCapability,
  RuntimeMode,
} from "@harnessos/contracts";

const RUNTIME_MODE_PRIVILEGE = {
  "approval-required": 0,
  auto: 1,
  "full-access": 2,
} as const satisfies Record<RuntimeMode, number>;

export function runtimeModeEscalatesPrivilege(
  callerRuntimeMode: RuntimeMode,
  targetRuntimeMode: RuntimeMode,
): boolean {
  return RUNTIME_MODE_PRIVILEGE[targetRuntimeMode] > RUNTIME_MODE_PRIVILEGE[callerRuntimeMode];
}

export function isProviderRuntimeModeExecutable(
  capability: ProviderRuntimeModeCapability | undefined,
): capability is ProviderRuntimeModeCapability & { readonly structurallySupported: true } {
  return (
    capability?.structurallySupported === true &&
    (capability.status === "ready" || capability.status === "degraded")
  );
}

export function isProviderRuntimeModePermanentlyUnsupported(
  capability: ProviderRuntimeModeCapability | undefined,
): boolean {
  return isPermanentRuntimeModeCapabilityReason(capability?.reason);
}

export function isPermanentRuntimeModeCapabilityReason(
  reason: ProviderExecutionCapabilityReason | undefined,
): boolean {
  return reason === "mode-unsupported" || reason === "model-unsupported";
}

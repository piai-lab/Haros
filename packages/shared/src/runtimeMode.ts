import type {
  EngineExecutionCapabilityReason,
  EngineRuntimeModeCapability,
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
  capability: EngineRuntimeModeCapability | undefined,
): capability is EngineRuntimeModeCapability & { readonly structurallySupported: true } {
  return (
    capability?.structurallySupported === true &&
    (capability.status === "ready" || capability.status === "degraded")
  );
}

export function isProviderRuntimeModePermanentlyUnsupported(
  capability: EngineRuntimeModeCapability | undefined,
): boolean {
  return isPermanentRuntimeModeCapabilityReason(capability?.reason);
}

export function isPermanentRuntimeModeCapabilityReason(
  reason: EngineExecutionCapabilityReason | undefined,
): boolean {
  return reason === "mode-unsupported" || reason === "model-unsupported";
}

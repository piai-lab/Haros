import type {
  EngineExecutionCapabilityReason,
  EngineKind,
  EngineRuntimeModeCapability,
  RuntimeMode,
} from "@harnessos/contracts";

const RUNTIME_MODE_PRIVILEGE = {
  "approval-required": 0,
  auto: 1,
  "full-access": 2,
} as const satisfies Record<RuntimeMode, number>;

const RUNTIME_MODE_FALLBACK_ORDER = [
  "approval-required",
  "auto",
  "full-access",
] as const satisfies readonly RuntimeMode[];

export const ENGINE_SUPPORTED_RUNTIME_MODES = {
  codex: ["full-access", "auto", "approval-required"],
  claude: ["full-access", "auto", "approval-required"],
  cursor: ["full-access", "approval-required"],
  antigravity: ["full-access"],
  grok: ["full-access", "approval-required"],
  droid: ["full-access", "approval-required"],
  kilo: ["full-access", "approval-required"],
  opencode: ["full-access", "approval-required"],
  pi: ["full-access"],
  deepseek: ["full-access"],
} as const satisfies Record<EngineKind, readonly RuntimeMode[]>;

export function resolveCompatibleRuntimeMode(
  engine: EngineKind,
  requested: RuntimeMode,
): RuntimeMode {
  const supported = new Set<RuntimeMode>(ENGINE_SUPPORTED_RUNTIME_MODES[engine]);
  if (supported.has(requested)) return requested;
  for (const mode of RUNTIME_MODE_FALLBACK_ORDER) {
    if (supported.has(mode)) return mode;
  }
  return "full-access";
}

export function runtimeModeEscalatesPrivilege(
  callerRuntimeMode: RuntimeMode,
  targetRuntimeMode: RuntimeMode,
): boolean {
  return RUNTIME_MODE_PRIVILEGE[targetRuntimeMode] > RUNTIME_MODE_PRIVILEGE[callerRuntimeMode];
}

export function isEngineRuntimeModeExecutable(
  capability: EngineRuntimeModeCapability | undefined,
): capability is EngineRuntimeModeCapability & { readonly structurallySupported: true } {
  return (
    capability?.structurallySupported === true &&
    (capability.status === "ready" || capability.status === "degraded")
  );
}

export function isEngineRuntimeModePermanentlyUnsupported(
  capability: EngineRuntimeModeCapability | undefined,
): boolean {
  return isPermanentRuntimeModeCapabilityReason(capability?.reason);
}

export function isPermanentRuntimeModeCapabilityReason(
  reason: EngineExecutionCapabilityReason | undefined,
): boolean {
  return reason === "mode-unsupported" || reason === "model-unsupported";
}

import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";
import { ModelSelection, ProviderInteractionMode, RuntimeMode } from "./orchestration";
import { EngineKind } from "./engineIdentity";

export const ProviderExecutionCapabilityStatus = Schema.Literals([
  "ready",
  "degraded",
  "unavailable",
  "unknown",
]);
export type ProviderExecutionCapabilityStatus = typeof ProviderExecutionCapabilityStatus.Type;

export const ProviderExecutionCapabilityReason = Schema.Literals([
  "adapter-unregistered",
  "mode-unsupported",
  "model-unsupported",
  "model-capability-unknown",
  "provider-not-installed",
  "authentication-required",
  "runtime-health-unknown",
  "runtime-degraded",
  "runtime-version-unsupported",
]);
export type ProviderExecutionCapabilityReason = typeof ProviderExecutionCapabilityReason.Type;

export const ProviderRuntimeModeCapability = Schema.Struct({
  mode: RuntimeMode,
  structurallySupported: Schema.Boolean,
  status: ProviderExecutionCapabilityStatus,
  reason: Schema.optional(ProviderExecutionCapabilityReason),
});
export type ProviderRuntimeModeCapability = typeof ProviderRuntimeModeCapability.Type;

export const ProviderInteractionModeCapability = Schema.Struct({
  mode: ProviderInteractionMode,
  structurallySupported: Schema.Boolean,
  status: ProviderExecutionCapabilityStatus,
  reason: Schema.optional(ProviderExecutionCapabilityReason),
});
export type ProviderInteractionModeCapability = typeof ProviderInteractionModeCapability.Type;

export const ProviderExecutionCapabilitiesInput = Schema.Struct({
  modelSelection: ModelSelection,
});
export type ProviderExecutionCapabilitiesInput = typeof ProviderExecutionCapabilitiesInput.Type;

export const ProviderExecutionCapabilities = Schema.Struct({
  provider: EngineKind,
  model: TrimmedNonEmptyString,
  supportsNativeTurnSteering: Schema.Boolean,
  runtimeModes: Schema.Struct({
    "full-access": ProviderRuntimeModeCapability,
    auto: ProviderRuntimeModeCapability,
    "approval-required": ProviderRuntimeModeCapability,
  }),
  interactionModes: Schema.Struct({
    default: ProviderInteractionModeCapability,
    plan: ProviderInteractionModeCapability,
    debug: ProviderInteractionModeCapability,
    converge: ProviderInteractionModeCapability,
    learn: ProviderInteractionModeCapability,
  }),
});
export type ProviderExecutionCapabilities = typeof ProviderExecutionCapabilities.Type;

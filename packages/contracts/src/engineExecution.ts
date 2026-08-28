import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";
import { EngineSelection, EngineInteractionMode, RuntimeMode } from "./orchestration";
import { EngineKind } from "./engineIdentity";

export const EngineExecutionCapabilityStatus = Schema.Literals([
  "ready",
  "degraded",
  "unavailable",
  "unknown",
]);
export type EngineExecutionCapabilityStatus = typeof EngineExecutionCapabilityStatus.Type;

export const EngineExecutionCapabilityReason = Schema.Literals([
  "adapter-unregistered",
  "mode-unsupported",
  "model-unsupported",
  "model-capability-unknown",
  "engine-not-installed",
  "authentication-required",
  "runtime-health-unknown",
  "runtime-degraded",
  "runtime-version-unsupported",
]);
export type EngineExecutionCapabilityReason = typeof EngineExecutionCapabilityReason.Type;

export const EngineRuntimeModeCapability = Schema.Struct({
  mode: RuntimeMode,
  structurallySupported: Schema.Boolean,
  status: EngineExecutionCapabilityStatus,
  reason: Schema.optional(EngineExecutionCapabilityReason),
});
export type EngineRuntimeModeCapability = typeof EngineRuntimeModeCapability.Type;

export const EngineInteractionModeCapability = Schema.Struct({
  mode: EngineInteractionMode,
  structurallySupported: Schema.Boolean,
  status: EngineExecutionCapabilityStatus,
  reason: Schema.optional(EngineExecutionCapabilityReason),
});
export type EngineInteractionModeCapability = typeof EngineInteractionModeCapability.Type;

export const EngineExecutionCapabilitiesInput = Schema.Struct({
  engineSelection: EngineSelection,
});
export type EngineExecutionCapabilitiesInput = typeof EngineExecutionCapabilitiesInput.Type;

export const EngineExecutionCapabilities = Schema.Struct({
  engine: EngineKind,
  model: TrimmedNonEmptyString,
  supportsNativeTurnSteering: Schema.Boolean,
  runtimeModes: Schema.Struct({
    "full-access": EngineRuntimeModeCapability,
    auto: EngineRuntimeModeCapability,
    "approval-required": EngineRuntimeModeCapability,
  }),
  interactionModes: Schema.Struct({
    default: EngineInteractionModeCapability,
    plan: EngineInteractionModeCapability,
    debug: EngineInteractionModeCapability,
    converge: EngineInteractionModeCapability,
    learn: EngineInteractionModeCapability,
  }),
});
export type EngineExecutionCapabilities = typeof EngineExecutionCapabilities.Type;

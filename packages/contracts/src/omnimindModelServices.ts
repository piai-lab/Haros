// FILE: omnimindModelServices.ts
// Purpose: Defines the credential-blind OmniMind Agent model-services projection.
// Layer: Shared contracts
// Exports: Read-only list/get schemas used by the Server and Settings renderer.

import { Schema } from "effect";

import { NonNegativeInt, PositiveInt, TrimmedNonEmptyString } from "./baseSchemas";

// Pi treats provider ids as opaque strings, including user-authored Unicode ids
// from models.json. Preserve that identity exactly while excluding path and
// terminal-control ambiguity at the RPC boundary.
const BoundedIdentifier = TrimmedNonEmptyString.check(
  Schema.isMaxLength(256),
  Schema.isPattern(
    /^(?!\.{1,2}$)[^/\\\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/u,
  ),
);
const BoundedDisplayName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(256),
  Schema.isPattern(
    /^(?!\/)(?![A-Za-z]:[\\/])(?!\\\\)(?!(?:file|https?):\/\/)[^\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/iu,
  ),
);
export const OMNIMIND_MODEL_SERVICES_MAX_COUNT = 512;
export const OMNIMIND_MODEL_SERVICE_MODELS_MAX_COUNT = 4_096;
export const OMNIMIND_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT = 256;
export const OMNIMIND_CUSTOM_MODEL_COST_TIERS_MAX_COUNT = 256;

const BoundedModelId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(512),
  Schema.isPattern(/^[^\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/u),
);

export const OmniMindModelServiceModel = Schema.Struct({
  modelId: BoundedModelId,
  displayName: BoundedDisplayName,
  available: Schema.Boolean,
  reasoning: Schema.Boolean,
  input: Schema.Array(Schema.Literals(["text", "image"])).check(Schema.isMaxLength(2)),
  contextWindow: NonNegativeInt,
  maxTokens: NonNegativeInt,
});
export type OmniMindModelServiceModel = typeof OmniMindModelServiceModel.Type;

const BoundedServiceModels = Schema.Array(OmniMindModelServiceModel).check(
  Schema.isMaxLength(OMNIMIND_MODEL_SERVICE_MODELS_MAX_COUNT),
);

export const OmniMindCustomModelServiceApi = Schema.Literals([
  "openai-completions",
  "openai-responses",
  "anthropic-messages",
  "google-generative-ai",
]);
export type OmniMindCustomModelServiceApi = typeof OmniMindCustomModelServiceApi.Type;

const BoundedThinkingLevelValue = Schema.NullOr(
  TrimmedNonEmptyString.check(Schema.isMaxLength(64)),
);
const OmniMindCustomModelThinkingLevelMap = Schema.Struct({
  off: Schema.optional(BoundedThinkingLevelValue),
  minimal: Schema.optional(BoundedThinkingLevelValue),
  low: Schema.optional(BoundedThinkingLevelValue),
  medium: Schema.optional(BoundedThinkingLevelValue),
  high: Schema.optional(BoundedThinkingLevelValue),
  xhigh: Schema.optional(BoundedThinkingLevelValue),
  max: Schema.optional(BoundedThinkingLevelValue),
});

const BoundedEndpointUrl = TrimmedNonEmptyString.check(
  Schema.isMaxLength(4_096),
  Schema.isPattern(/^https?:\/\/[^\s]+$/iu),
);

const NonNegativeFiniteNumber = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));
const OmniMindCustomModelCostRates = {
  input: NonNegativeFiniteNumber,
  output: NonNegativeFiniteNumber,
  cacheRead: NonNegativeFiniteNumber,
  cacheWrite: NonNegativeFiniteNumber,
} as const;
const OmniMindCustomModelCostTier = Schema.Struct({
  inputTokensAbove: NonNegativeFiniteNumber,
  ...OmniMindCustomModelCostRates,
});
const OmniMindCustomModelCost = Schema.Struct({
  ...OmniMindCustomModelCostRates,
  tiers: Schema.optional(
    Schema.Array(OmniMindCustomModelCostTier).check(
      Schema.isMaxLength(OMNIMIND_CUSTOM_MODEL_COST_TIERS_MAX_COUNT),
    ),
  ),
});

export const OmniMindCustomModelServiceModelInput = Schema.Struct({
  modelId: BoundedModelId,
  displayName: Schema.optional(BoundedDisplayName),
  api: Schema.optional(OmniMindCustomModelServiceApi),
  baseUrl: Schema.optional(BoundedEndpointUrl),
  reasoning: Schema.optional(Schema.Boolean),
  thinkingLevelMap: Schema.optional(OmniMindCustomModelThinkingLevelMap),
  input: Schema.optional(
    Schema.Array(Schema.Literals(["text", "image"]))
      .check(Schema.isMinLength(1))
      .check(Schema.isMaxLength(2)),
  ),
  cost: Schema.optional(OmniMindCustomModelCost),
  contextWindow: Schema.optional(PositiveInt),
  maxTokens: Schema.optional(PositiveInt),
});
export type OmniMindCustomModelServiceModelInput = typeof OmniMindCustomModelServiceModelInput.Type;

const BoundedCustomModels = Schema.Array(OmniMindCustomModelServiceModelInput)
  .check(Schema.isMinLength(1))
  .check(Schema.isMaxLength(OMNIMIND_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT));

export const OmniMindCustomModelServiceConfigInput = Schema.Struct({
  serviceId: Schema.NullOr(BoundedIdentifier),
  displayName: BoundedDisplayName,
  api: OmniMindCustomModelServiceApi,
  baseUrl: BoundedEndpointUrl,
  authHeader: Schema.optional(Schema.Boolean),
  models: BoundedCustomModels,
});
export type OmniMindCustomModelServiceConfigInput =
  typeof OmniMindCustomModelServiceConfigInput.Type;

export const OmniMindCustomModelServiceConfig = Schema.Struct({
  serviceId: BoundedIdentifier,
  displayName: BoundedDisplayName,
  api: OmniMindCustomModelServiceApi,
  baseUrl: BoundedEndpointUrl,
  authHeader: Schema.optional(Schema.Boolean),
  models: BoundedCustomModels,
});
export type OmniMindCustomModelServiceConfig = typeof OmniMindCustomModelServiceConfig.Type;

export const OmniMindCustomModelServiceCapability = Schema.Struct({
  protocols: Schema.Tuple([
    Schema.Literal("openai-completions"),
    Schema.Literal("openai-responses"),
    Schema.Literal("anthropic-messages"),
    Schema.Literal("google-generative-ai"),
  ]),
});
export type OmniMindCustomModelServiceCapability = typeof OmniMindCustomModelServiceCapability.Type;

export const OmniMindModelServiceOrigin = Schema.Literals([
  "builtin",
  "models_json",
  "extension",
  "unknown",
]);
export type OmniMindModelServiceOrigin = typeof OmniMindModelServiceOrigin.Type;

export const OmniMindModelServiceAuthMethodType = Schema.Literals(["api_key", "oauth"]);
export type OmniMindModelServiceAuthMethodType = typeof OmniMindModelServiceAuthMethodType.Type;

export const OmniMindModelServiceAuthMethod = Schema.Struct({
  type: OmniMindModelServiceAuthMethodType,
  label: BoundedDisplayName,
  canLogin: Schema.Boolean,
  subscription: Schema.Boolean,
});
export type OmniMindModelServiceAuthMethod = typeof OmniMindModelServiceAuthMethod.Type;

export const OmniMindModelServiceAuthSource = Schema.Literals([
  "stored",
  "runtime",
  "environment",
  "fallback",
  "models_json_key",
  "models_json_command",
  "unknown",
]);
export type OmniMindModelServiceAuthSource = typeof OmniMindModelServiceAuthSource.Type;

export const OmniMindModelServiceAuthState = Schema.Literals([
  "configured",
  "setup_required",
  "refresh_required",
  "unavailable",
]);
export type OmniMindModelServiceAuthState = typeof OmniMindModelServiceAuthState.Type;

const OmniMindModelServiceDescriptorFields = {
  serviceId: BoundedIdentifier,
  providerId: BoundedIdentifier,
  displayName: BoundedDisplayName,
  origin: OmniMindModelServiceOrigin,
  authMethods: Schema.Array(OmniMindModelServiceAuthMethod).check(Schema.isMaxLength(2)),
  authState: OmniMindModelServiceAuthState,
  authSource: Schema.NullOr(OmniMindModelServiceAuthSource),
  storedCredentialType: Schema.NullOr(OmniMindModelServiceAuthMethodType),
  knownModelCount: NonNegativeInt,
  availableModelCount: NonNegativeInt,
  supportsNetworkRefresh: Schema.Boolean,
} as const;

export const OmniMindModelServiceDescriptor = Schema.Union([
  Schema.Struct({
    ...OmniMindModelServiceDescriptorFields,
    catalogState: Schema.Literals(["ready", "empty"]),
    catalogErrorCode: Schema.Null,
  }),
  Schema.Struct({
    ...OmniMindModelServiceDescriptorFields,
    catalogState: Schema.Literals(["stale", "error"]),
    catalogErrorCode: Schema.Literal("catalog_unavailable"),
  }),
]);
export type OmniMindModelServiceDescriptor = typeof OmniMindModelServiceDescriptor.Type;

export const OmniMindModelServicesProjectionErrorCode = Schema.Literal("projection_unavailable");
export type OmniMindModelServicesProjectionErrorCode =
  typeof OmniMindModelServicesProjectionErrorCode.Type;

export const OmniMindModelServicesProjectionIntent = Schema.Literal("add_service");
export type OmniMindModelServicesProjectionIntent =
  typeof OmniMindModelServicesProjectionIntent.Type;

export const OmniMindModelServicesExtensionProjectionState = Schema.Literals([
  "ready",
  "partial",
  "unavailable",
]);
export type OmniMindModelServicesExtensionProjectionState =
  typeof OmniMindModelServicesExtensionProjectionState.Type;

export const OmniMindModelServicesListInput = Schema.Struct({
  intent: Schema.optional(OmniMindModelServicesProjectionIntent),
});
export type OmniMindModelServicesListInput = typeof OmniMindModelServicesListInput.Type;

const BoundedModelServices = Schema.Array(OmniMindModelServiceDescriptor).check(
  Schema.isMaxLength(OMNIMIND_MODEL_SERVICES_MAX_COUNT),
);
const BoundedNonEmptyModelServices = BoundedModelServices.check(Schema.isMinLength(1));

export const OmniMindModelServicesListResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("ready"),
    services: BoundedNonEmptyModelServices,
    connectableServices: BoundedModelServices,
    customApiConfiguration: Schema.optional(OmniMindCustomModelServiceCapability),
    extensionProjectionState: Schema.optional(OmniMindModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("empty"),
    services: Schema.Tuple([]),
    connectableServices: BoundedModelServices,
    customApiConfiguration: Schema.optional(OmniMindCustomModelServiceCapability),
    extensionProjectionState: Schema.optional(OmniMindModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("error"),
    services: Schema.Tuple([]),
    connectableServices: Schema.Tuple([]),
    errorCode: OmniMindModelServicesProjectionErrorCode,
  }),
]);
export type OmniMindModelServicesListResult = typeof OmniMindModelServicesListResult.Type;

export const OmniMindModelServicesGetInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  intent: Schema.optional(OmniMindModelServicesProjectionIntent),
});
export type OmniMindModelServicesGetInput = typeof OmniMindModelServicesGetInput.Type;

export const OmniMindModelServicesGetResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("ready"),
    service: OmniMindModelServiceDescriptor,
    models: Schema.optional(BoundedServiceModels),
    customConfig: Schema.optional(OmniMindCustomModelServiceConfig),
    extensionProjectionState: Schema.optional(OmniMindModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("empty"),
    service: Schema.Null,
    extensionProjectionState: Schema.optional(OmniMindModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("error"),
    service: Schema.Null,
    errorCode: OmniMindModelServicesProjectionErrorCode,
  }),
]);
export type OmniMindModelServicesGetResult = typeof OmniMindModelServicesGetResult.Type;

const AuthRequestId = Schema.String.check(Schema.isUUID(undefined));
const AuthPromptId = Schema.String.check(Schema.isUUID(undefined));
const BoundedInteractionText = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4096));
const BoundedInteractionValue = Schema.String.check(Schema.isMaxLength(65536));

export const OmniMindModelServiceAuthPrompt = Schema.Union([
  Schema.Struct({
    promptId: AuthPromptId,
    type: Schema.Literals(["text", "secret", "manual_code"]),
    message: BoundedInteractionText,
    placeholder: Schema.optional(BoundedInteractionText),
  }),
  Schema.Struct({
    promptId: AuthPromptId,
    type: Schema.Literal("select"),
    message: BoundedInteractionText,
    options: Schema.Array(
      Schema.Struct({
        id: BoundedIdentifier,
        label: BoundedDisplayName,
        description: Schema.optional(BoundedInteractionText),
      }),
    ).check(Schema.isMinLength(1), Schema.isMaxLength(64)),
  }),
]);
export type OmniMindModelServiceAuthPrompt = typeof OmniMindModelServiceAuthPrompt.Type;

export const OmniMindModelServiceAuthEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literals(["info", "progress"]), message: BoundedInteractionText }),
  Schema.Struct({
    type: Schema.Literal("auth_url"),
    url: Schema.String.check(Schema.isMaxLength(4096), Schema.isPattern(/^https?:\/\//iu)),
    instructions: Schema.optional(BoundedInteractionText),
  }),
  Schema.Struct({
    type: Schema.Literal("device_code"),
    userCode: BoundedInteractionText,
    verificationUri: Schema.String.check(
      Schema.isMaxLength(4096),
      Schema.isPattern(/^https?:\/\//iu),
    ),
    intervalSeconds: Schema.optional(NonNegativeInt),
    expiresInSeconds: Schema.optional(NonNegativeInt),
  }),
]);
export type OmniMindModelServiceAuthEvent = typeof OmniMindModelServiceAuthEvent.Type;

export const OmniMindModelServiceAuthResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("pending"),
    requestId: AuthRequestId,
    events: Schema.Array(OmniMindModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
  Schema.Struct({
    state: Schema.Literal("prompt"),
    requestId: AuthRequestId,
    prompt: OmniMindModelServiceAuthPrompt,
    events: Schema.Array(OmniMindModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
  Schema.Struct({
    state: Schema.Literals(["complete", "auth_updated_catalog_failed", "auth_updated_sync_failed"]),
    requestId: AuthRequestId,
    service: OmniMindModelServiceDescriptor,
    events: Schema.Array(OmniMindModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
  Schema.Struct({
    state: Schema.Literals(["cancelled", "failed"]),
    requestId: AuthRequestId,
    errorCode: Schema.Literals(["cancelled", "auth_failed", "request_expired"]),
    events: Schema.Array(OmniMindModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
]);
export type OmniMindModelServiceAuthResult = typeof OmniMindModelServiceAuthResult.Type;

export const OmniMindModelServiceOAuthPromptMode = Schema.Literals([
  "provider_default",
  "interactive",
]);
export type OmniMindModelServiceOAuthPromptMode = typeof OmniMindModelServiceOAuthPromptMode.Type;

export const OmniMindModelServiceBeginLoginInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  authType: OmniMindModelServiceAuthMethodType,
  promptMode: Schema.optional(OmniMindModelServiceOAuthPromptMode),
  origin: Schema.optional(Schema.Literal("extension")),
});
export type OmniMindModelServiceBeginLoginInput = typeof OmniMindModelServiceBeginLoginInput.Type;

export const OmniMindModelServicePollLoginInput = Schema.Struct({
  requestId: AuthRequestId,
  afterEventCount: NonNegativeInt,
  afterPromptId: Schema.optional(AuthPromptId),
});
export type OmniMindModelServicePollLoginInput = typeof OmniMindModelServicePollLoginInput.Type;

export const OmniMindModelServiceAnswerLoginInput = Schema.Struct({
  requestId: AuthRequestId,
  promptId: AuthPromptId,
  value: BoundedInteractionValue,
});
export type OmniMindModelServiceAnswerLoginInput = typeof OmniMindModelServiceAnswerLoginInput.Type;

export const OmniMindModelServiceCancelLoginInput = Schema.Struct({ requestId: AuthRequestId });
export type OmniMindModelServiceCancelLoginInput = typeof OmniMindModelServiceCancelLoginInput.Type;

export const OmniMindModelServiceLogoutInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  origin: Schema.optional(Schema.Literal("extension")),
});
export type OmniMindModelServiceLogoutInput = typeof OmniMindModelServiceLogoutInput.Type;
export const OmniMindModelServiceLogoutResult = Schema.Struct({
  state: Schema.Literals(["complete", "credential_updated_sync_failed"]),
  service: OmniMindModelServiceDescriptor,
});
export type OmniMindModelServiceLogoutResult = typeof OmniMindModelServiceLogoutResult.Type;

export const OmniMindModelServiceRefreshInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  origin: Schema.optional(Schema.Literal("extension")),
});
export type OmniMindModelServiceRefreshInput = typeof OmniMindModelServiceRefreshInput.Type;
export const OmniMindModelServiceRefreshResult = Schema.Struct({
  state: Schema.Literals(["success", "failed", "cancelled", "unsupported"]),
  service: OmniMindModelServiceDescriptor,
});
export type OmniMindModelServiceRefreshResult = typeof OmniMindModelServiceRefreshResult.Type;

const BoundedSecret = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(65_536));

const CredentialEnvironmentVariableName = Schema.String.check(
  Schema.isPattern(/^[A-Za-z_][A-Za-z0-9_]*$/u),
);
const CredentialCommand = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(4_096),
  Schema.isPattern(/^[^\u0000-\u001f\u007f-\u009f]+$/u),
);

export const OmniMindCustomModelServiceCredentialInput = Schema.Union([
  Schema.Struct({ type: Schema.Literal("preserve") }),
  Schema.Struct({ type: Schema.Literal("stored_key"), apiKey: BoundedSecret }),
  Schema.Struct({
    type: Schema.Literal("environment"),
    variableName: CredentialEnvironmentVariableName,
  }),
  Schema.Struct({ type: Schema.Literal("command"), command: CredentialCommand }),
]);
export type OmniMindCustomModelServiceCredentialInput =
  typeof OmniMindCustomModelServiceCredentialInput.Type;

export const OmniMindCustomModelServiceTestInput = Schema.Struct({
  config: OmniMindCustomModelServiceConfigInput,
  credential: OmniMindCustomModelServiceCredentialInput,
  testModelId: BoundedModelId,
});
export type OmniMindCustomModelServiceTestInput = typeof OmniMindCustomModelServiceTestInput.Type;

export const OmniMindCustomModelServiceDiscoveryConfigInput = Schema.Struct({
  serviceId: Schema.NullOr(BoundedIdentifier),
  displayName: BoundedDisplayName,
  api: OmniMindCustomModelServiceApi,
  baseUrl: BoundedEndpointUrl,
});
export type OmniMindCustomModelServiceDiscoveryConfigInput =
  typeof OmniMindCustomModelServiceDiscoveryConfigInput.Type;

export const OmniMindCustomModelServiceDiscoveredModel = Schema.Struct({
  modelId: BoundedModelId,
  displayName: BoundedDisplayName,
});
export type OmniMindCustomModelServiceDiscoveredModel =
  typeof OmniMindCustomModelServiceDiscoveredModel.Type;

const BoundedDiscoveredModels = Schema.Array(OmniMindCustomModelServiceDiscoveredModel)
  .check(Schema.isMinLength(1))
  .check(Schema.isMaxLength(OMNIMIND_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT));

export const OmniMindCustomModelServiceDiscoverInput = Schema.Struct({
  config: OmniMindCustomModelServiceDiscoveryConfigInput,
  credential: OmniMindCustomModelServiceCredentialInput,
});
export type OmniMindCustomModelServiceDiscoverInput =
  typeof OmniMindCustomModelServiceDiscoverInput.Type;

export const OmniMindCustomModelServiceDiscoverResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("success"),
    models: BoundedDiscoveredModels,
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("failed"),
    models: Schema.Tuple([]),
    errorCode: Schema.Literals([
      "invalid_configuration",
      "authentication_failed",
      "connection_failed",
      "catalog_unavailable",
      "response_too_large",
    ]),
  }),
  Schema.Struct({
    state: Schema.Literal("cancelled"),
    models: Schema.Tuple([]),
    errorCode: Schema.Literal("cancelled"),
  }),
]);
export type OmniMindCustomModelServiceDiscoverResult =
  typeof OmniMindCustomModelServiceDiscoverResult.Type;

export const OmniMindCustomModelServiceTestResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("success"),
    models: BoundedServiceModels,
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literals(["failed", "cancelled"]),
    models: Schema.Tuple([]),
    errorCode: Schema.Literals([
      "invalid_configuration",
      "authentication_failed",
      "connection_failed",
      "model_unavailable",
      "cancelled",
    ]),
  }),
]);
export type OmniMindCustomModelServiceTestResult = typeof OmniMindCustomModelServiceTestResult.Type;

export const OmniMindCustomModelServiceSaveInput = Schema.Struct({
  config: OmniMindCustomModelServiceConfigInput,
  credential: OmniMindCustomModelServiceCredentialInput,
});
export type OmniMindCustomModelServiceSaveInput = typeof OmniMindCustomModelServiceSaveInput.Type;

export const OmniMindCustomModelServiceSaveResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literals(["complete", "complete_with_sync_warning"]),
    service: OmniMindModelServiceDescriptor,
  }),
  Schema.Struct({
    state: Schema.Literals([
      "credential_unchanged",
      "credential_removed_retry_required",
      "config_saved_auth_failed",
      "config_saved_sync_failed",
    ]),
    service: Schema.NullOr(OmniMindModelServiceDescriptor),
  }),
]);
export type OmniMindCustomModelServiceSaveResult = typeof OmniMindCustomModelServiceSaveResult.Type;

export const OmniMindCustomModelServiceRemoveInput = Schema.Struct({
  serviceId: BoundedIdentifier,
});
export type OmniMindCustomModelServiceRemoveInput =
  typeof OmniMindCustomModelServiceRemoveInput.Type;

export const OmniMindCustomModelServiceRemoveResult = Schema.Struct({
  state: Schema.Literals(["complete", "complete_with_sync_warning", "blocked_active_operation"]),
  serviceId: BoundedIdentifier,
});
export type OmniMindCustomModelServiceRemoveResult =
  typeof OmniMindCustomModelServiceRemoveResult.Type;

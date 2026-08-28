// FILE: oaModelServices.ts
// Purpose: Defines the credential-blind HarnessOS Agent model-services projection.
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
export const HARNESSOS_MODEL_SERVICES_MAX_COUNT = 512;
export const HARNESSOS_MODEL_SERVICE_MODELS_MAX_COUNT = 4_096;
export const HARNESSOS_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT = 256;
export const HARNESSOS_CUSTOM_MODEL_COST_TIERS_MAX_COUNT = 256;
export const HARNESSOS_CUSTOM_MODEL_HEADERS_MAX_COUNT = 64;

const BoundedModelId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(512),
  Schema.isPattern(/^[^\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/u),
);

export const OAModelServiceModel = Schema.Struct({
  modelId: BoundedModelId,
  displayName: BoundedDisplayName,
  available: Schema.Boolean,
  reasoning: Schema.Boolean,
  input: Schema.Array(Schema.Literals(["text", "image"])).check(Schema.isMaxLength(2)),
  contextWindow: NonNegativeInt,
  maxTokens: NonNegativeInt,
});
export type OAModelServiceModel = typeof OAModelServiceModel.Type;

const BoundedServiceModels = Schema.Array(OAModelServiceModel).check(
  Schema.isMaxLength(HARNESSOS_MODEL_SERVICE_MODELS_MAX_COUNT),
);

export const HarnessOSCustomModelServiceApi = Schema.Literals([
  "openai-completions",
  "openai-responses",
  "anthropic-messages",
  "google-generative-ai",
]);
export type HarnessOSCustomModelServiceApi = typeof HarnessOSCustomModelServiceApi.Type;

const BoundedThinkingLevelValue = Schema.NullOr(
  TrimmedNonEmptyString.check(Schema.isMaxLength(64)),
);
const HarnessOSCustomModelThinkingLevelMap = Schema.Struct({
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
const HarnessOSCustomModelCostRates = {
  input: NonNegativeFiniteNumber,
  output: NonNegativeFiniteNumber,
  cacheRead: NonNegativeFiniteNumber,
  cacheWrite: NonNegativeFiniteNumber,
} as const;
const HarnessOSCustomModelCostTier = Schema.Struct({
  inputTokensAbove: NonNegativeFiniteNumber,
  ...HarnessOSCustomModelCostRates,
});
const HarnessOSCustomModelCost = Schema.Struct({
  ...HarnessOSCustomModelCostRates,
  tiers: Schema.optional(
    Schema.Array(HarnessOSCustomModelCostTier).check(
      Schema.isMaxLength(HARNESSOS_CUSTOM_MODEL_COST_TIERS_MAX_COUNT),
    ),
  ),
});

export const HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API = {
  "openai-completions": [
    "supportsDeveloperRole",
    "supportsReasoningEffort",
    "supportsUsageInStreaming",
    "maxTokensField",
    "requiresToolResultName",
    "requiresAssistantAfterToolResult",
    "requiresThinkingAsText",
    "requiresReasoningContentOnAssistantMessages",
    "supportsOpenAIGrammarTools",
    "supportsStrictMode",
  ],
  "openai-responses": [
    "supportsDeveloperRole",
    "supportsStrictMode",
    "supportsOpenAIGrammarTools",
    "supportsToolSearch",
  ],
  "anthropic-messages": [
    "supportsEagerToolInputStreaming",
    "supportsCacheControlOnTools",
    "supportsTemperature",
    "forceAdaptiveThinking",
    "allowEmptySignature",
    "supportsStrictTools",
    "supportsToolReferences",
  ],
  "google-generative-ai": [],
} as const satisfies Record<HarnessOSCustomModelServiceApi, readonly string[]>;

const HarnessOSCustomModelCompat = Schema.Struct({
  supportsDeveloperRole: Schema.optional(Schema.Boolean),
  supportsReasoningEffort: Schema.optional(Schema.Boolean),
  supportsUsageInStreaming: Schema.optional(Schema.Boolean),
  maxTokensField: Schema.optional(Schema.Literals(["max_completion_tokens", "max_tokens"])),
  requiresToolResultName: Schema.optional(Schema.Boolean),
  requiresAssistantAfterToolResult: Schema.optional(Schema.Boolean),
  requiresThinkingAsText: Schema.optional(Schema.Boolean),
  requiresReasoningContentOnAssistantMessages: Schema.optional(Schema.Boolean),
  supportsOpenAIGrammarTools: Schema.optional(Schema.Boolean),
  supportsStrictMode: Schema.optional(Schema.Boolean),
  supportsToolSearch: Schema.optional(Schema.Boolean),
  supportsEagerToolInputStreaming: Schema.optional(Schema.Boolean),
  supportsCacheControlOnTools: Schema.optional(Schema.Boolean),
  supportsTemperature: Schema.optional(Schema.Boolean),
  forceAdaptiveThinking: Schema.optional(Schema.Boolean),
  allowEmptySignature: Schema.optional(Schema.Boolean),
  supportsStrictTools: Schema.optional(Schema.Boolean),
  supportsToolReferences: Schema.optional(Schema.Boolean),
});

const BoundedHeaderName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(128),
  Schema.isPattern(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u),
);
const HarnessOSCustomModelHeaderSource = Schema.Literals(["external", "environment", "command"]);
export const HarnessOSCustomModelHeaderMetadata = Schema.Struct({
  name: BoundedHeaderName,
  source: HarnessOSCustomModelHeaderSource,
});
export type HarnessOSCustomModelHeaderMetadata = typeof HarnessOSCustomModelHeaderMetadata.Type;
const BoundedHeaderMetadata = Schema.Array(HarnessOSCustomModelHeaderMetadata).check(
  Schema.isMaxLength(HARNESSOS_CUSTOM_MODEL_HEADERS_MAX_COUNT),
);

const HeaderEnvironmentVariableName = Schema.String.check(
  Schema.isPattern(/^[A-Za-z_][A-Za-z0-9_]*$/u),
);
export const HarnessOSCustomModelHeaderMutation = Schema.Union([
  Schema.Struct({ name: BoundedHeaderName, type: Schema.Literal("clear") }),
  Schema.Struct({
    name: BoundedHeaderName,
    type: Schema.Literal("environment"),
    variableName: HeaderEnvironmentVariableName,
  }),
]);
export type HarnessOSCustomModelHeaderMutation = typeof HarnessOSCustomModelHeaderMutation.Type;
const BoundedHeaderMutations = Schema.Array(HarnessOSCustomModelHeaderMutation).check(
  Schema.isMaxLength(HARNESSOS_CUSTOM_MODEL_HEADERS_MAX_COUNT),
);

const HarnessOSCustomModelServiceModelFields = {
  modelId: BoundedModelId,
  displayName: Schema.optional(BoundedDisplayName),
  api: Schema.optional(HarnessOSCustomModelServiceApi),
  baseUrl: Schema.optional(BoundedEndpointUrl),
  reasoning: Schema.optional(Schema.Boolean),
  thinkingLevelMap: Schema.optional(HarnessOSCustomModelThinkingLevelMap),
  input: Schema.optional(
    Schema.Array(Schema.Literals(["text", "image"]))
      .check(Schema.isMinLength(1))
      .check(Schema.isMaxLength(2)),
  ),
  cost: Schema.optional(HarnessOSCustomModelCost),
  compat: Schema.optional(HarnessOSCustomModelCompat),
  contextWindow: Schema.optional(PositiveInt),
  maxTokens: Schema.optional(PositiveInt),
} as const;

export const HarnessOSCustomModelServiceModelInput = Schema.Struct({
  ...HarnessOSCustomModelServiceModelFields,
  headerMutations: Schema.optional(BoundedHeaderMutations),
});
export type HarnessOSCustomModelServiceModelInput =
  typeof HarnessOSCustomModelServiceModelInput.Type;

const HarnessOSCustomModelServiceModelConfig = Schema.Struct({
  ...HarnessOSCustomModelServiceModelFields,
  configuredHeaders: Schema.optional(BoundedHeaderMetadata),
});

const BoundedCustomModels = Schema.Array(HarnessOSCustomModelServiceModelInput)
  .check(Schema.isMinLength(1))
  .check(Schema.isMaxLength(HARNESSOS_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT));

export const HarnessOSCustomModelServiceConfigInput = Schema.Struct({
  serviceId: Schema.NullOr(BoundedIdentifier),
  displayName: BoundedDisplayName,
  api: HarnessOSCustomModelServiceApi,
  baseUrl: BoundedEndpointUrl,
  authHeader: Schema.optional(Schema.Boolean),
  headerMutations: Schema.optional(BoundedHeaderMutations),
  models: BoundedCustomModels,
});
export type HarnessOSCustomModelServiceConfigInput =
  typeof HarnessOSCustomModelServiceConfigInput.Type;

export const HarnessOSCustomModelServiceConfig = Schema.Struct({
  serviceId: BoundedIdentifier,
  displayName: BoundedDisplayName,
  api: HarnessOSCustomModelServiceApi,
  baseUrl: BoundedEndpointUrl,
  authHeader: Schema.optional(Schema.Boolean),
  configuredHeaders: Schema.optional(BoundedHeaderMetadata),
  models: Schema.Array(HarnessOSCustomModelServiceModelConfig)
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(HARNESSOS_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT)),
});
export type HarnessOSCustomModelServiceConfig = typeof HarnessOSCustomModelServiceConfig.Type;

export const HarnessOSCustomModelServiceCapability = Schema.Struct({
  protocols: Schema.Tuple([
    Schema.Literal("openai-completions"),
    Schema.Literal("openai-responses"),
    Schema.Literal("anthropic-messages"),
    Schema.Literal("google-generative-ai"),
  ]),
});
export type HarnessOSCustomModelServiceCapability =
  typeof HarnessOSCustomModelServiceCapability.Type;

export const OAModelServiceOrigin = Schema.Literals([
  "builtin",
  "models_json",
  "extension",
  "unknown",
]);
export type OAModelServiceOrigin = typeof OAModelServiceOrigin.Type;

export const OAModelServiceAuthMethodType = Schema.Literals(["api_key", "oauth"]);
export type OAModelServiceAuthMethodType = typeof OAModelServiceAuthMethodType.Type;

export const OAModelServiceAuthMethod = Schema.Struct({
  type: OAModelServiceAuthMethodType,
  label: BoundedDisplayName,
  canLogin: Schema.Boolean,
  subscription: Schema.Boolean,
});
export type OAModelServiceAuthMethod = typeof OAModelServiceAuthMethod.Type;

export const OAModelServiceAuthSource = Schema.Literals([
  "stored",
  "runtime",
  "environment",
  "fallback",
  "models_json_key",
  "models_json_command",
  "unknown",
]);
export type OAModelServiceAuthSource = typeof OAModelServiceAuthSource.Type;

const CredentialEnvironmentVariableName = Schema.String.check(
  Schema.isPattern(/^[A-Za-z_][A-Za-z0-9_]*$/u),
);
const BoundedSecret = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(65_536));

export const OAModelServiceAuthState = Schema.Literals([
  "configured",
  "setup_required",
  "refresh_required",
  "unavailable",
]);
export type OAModelServiceAuthState = typeof OAModelServiceAuthState.Type;

const OAModelServiceDescriptorFields = {
  serviceId: BoundedIdentifier,
  providerId: BoundedIdentifier,
  displayName: BoundedDisplayName,
  origin: OAModelServiceOrigin,
  authMethods: Schema.Array(OAModelServiceAuthMethod).check(Schema.isMaxLength(2)),
  authState: OAModelServiceAuthState,
  authSource: Schema.NullOr(OAModelServiceAuthSource),
  authEnvironmentVariables: Schema.optional(
    Schema.Array(CredentialEnvironmentVariableName)
      .check(Schema.isMinLength(1))
      .check(Schema.isMaxLength(8)),
  ),
  storedCredentialType: Schema.NullOr(OAModelServiceAuthMethodType),
  knownModelCount: NonNegativeInt,
  availableModelCount: NonNegativeInt,
  supportsNetworkRefresh: Schema.Boolean,
} as const;

export const OAModelServiceDescriptor = Schema.Union([
  Schema.Struct({
    ...OAModelServiceDescriptorFields,
    catalogState: Schema.Literals(["ready", "empty"]),
    catalogErrorCode: Schema.Null,
  }),
  Schema.Struct({
    ...OAModelServiceDescriptorFields,
    catalogState: Schema.Literals(["stale", "error"]),
    catalogErrorCode: Schema.Literal("catalog_unavailable"),
  }),
]);
export type OAModelServiceDescriptor = typeof OAModelServiceDescriptor.Type;

export const OAModelServicesProjectionErrorCode = Schema.Literal("projection_unavailable");
export type OAModelServicesProjectionErrorCode = typeof OAModelServicesProjectionErrorCode.Type;

export const OAModelServicesProjectionIntent = Schema.Literal("add_service");
export type OAModelServicesProjectionIntent = typeof OAModelServicesProjectionIntent.Type;

export const OAModelServicesExtensionProjectionState = Schema.Literals([
  "ready",
  "partial",
  "unavailable",
]);
export type OAModelServicesExtensionProjectionState =
  typeof OAModelServicesExtensionProjectionState.Type;

export const OAModelServicesListInput = Schema.Struct({
  intent: Schema.optional(OAModelServicesProjectionIntent),
});
export type OAModelServicesListInput = typeof OAModelServicesListInput.Type;

const BoundedModelServices = Schema.Array(OAModelServiceDescriptor).check(
  Schema.isMaxLength(HARNESSOS_MODEL_SERVICES_MAX_COUNT),
);
const BoundedNonEmptyModelServices = BoundedModelServices.check(Schema.isMinLength(1));

export const OAModelServicesListResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("ready"),
    services: BoundedNonEmptyModelServices,
    connectableServices: BoundedModelServices,
    customApiConfiguration: Schema.optional(HarnessOSCustomModelServiceCapability),
    extensionProjectionState: Schema.optional(OAModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("empty"),
    services: Schema.Tuple([]),
    connectableServices: BoundedModelServices,
    customApiConfiguration: Schema.optional(HarnessOSCustomModelServiceCapability),
    extensionProjectionState: Schema.optional(OAModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("error"),
    services: Schema.Tuple([]),
    connectableServices: Schema.Tuple([]),
    errorCode: OAModelServicesProjectionErrorCode,
  }),
]);
export type OAModelServicesListResult = typeof OAModelServicesListResult.Type;

export const OAModelServicesGetInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  intent: Schema.optional(OAModelServicesProjectionIntent),
});
export type OAModelServicesGetInput = typeof OAModelServicesGetInput.Type;

export const OAModelServicesGetResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("ready"),
    service: OAModelServiceDescriptor,
    models: Schema.optional(BoundedServiceModels),
    customConfig: Schema.optional(HarnessOSCustomModelServiceConfig),
    extensionProjectionState: Schema.optional(OAModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("empty"),
    service: Schema.Null,
    extensionProjectionState: Schema.optional(OAModelServicesExtensionProjectionState),
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("error"),
    service: Schema.Null,
    errorCode: OAModelServicesProjectionErrorCode,
  }),
]);
export type OAModelServicesGetResult = typeof OAModelServicesGetResult.Type;

const AuthRequestId = Schema.String.check(Schema.isUUID(undefined));
const AuthPromptId = Schema.String.check(Schema.isUUID(undefined));
const BoundedInteractionText = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4096));
const BoundedInteractionValue = Schema.String.check(Schema.isMaxLength(65536));

export const OAModelServiceAuthPrompt = Schema.Union([
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
export type OAModelServiceAuthPrompt = typeof OAModelServiceAuthPrompt.Type;

export const OAModelServiceAuthEvent = Schema.Union([
  Schema.Struct({
    type: Schema.Literals(["info", "progress"]),
    message: BoundedInteractionText,
  }),
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
export type OAModelServiceAuthEvent = typeof OAModelServiceAuthEvent.Type;

export const OAModelServiceAuthResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("pending"),
    requestId: AuthRequestId,
    events: Schema.Array(OAModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
  Schema.Struct({
    state: Schema.Literal("prompt"),
    requestId: AuthRequestId,
    prompt: OAModelServiceAuthPrompt,
    events: Schema.Array(OAModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
  Schema.Struct({
    state: Schema.Literals(["complete", "auth_updated_catalog_failed", "auth_updated_sync_failed"]),
    requestId: AuthRequestId,
    service: OAModelServiceDescriptor,
    events: Schema.Array(OAModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
  Schema.Struct({
    state: Schema.Literals(["cancelled", "failed"]),
    requestId: AuthRequestId,
    errorCode: Schema.Literals(["cancelled", "auth_failed", "request_expired"]),
    events: Schema.Array(OAModelServiceAuthEvent).check(Schema.isMaxLength(64)),
  }),
]);
export type OAModelServiceAuthResult = typeof OAModelServiceAuthResult.Type;

export const OAModelServiceOAuthPromptMode = Schema.Literals(["provider_default", "interactive"]);
export type OAModelServiceOAuthPromptMode = typeof OAModelServiceOAuthPromptMode.Type;

export const OAModelServiceBeginLoginInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  authType: OAModelServiceAuthMethodType,
  promptMode: Schema.optional(OAModelServiceOAuthPromptMode),
  origin: Schema.optional(Schema.Literal("extension")),
});
export type OAModelServiceBeginLoginInput = typeof OAModelServiceBeginLoginInput.Type;

export const OAModelServicePollLoginInput = Schema.Struct({
  requestId: AuthRequestId,
  afterEventCount: NonNegativeInt,
  afterPromptId: Schema.optional(AuthPromptId),
});
export type OAModelServicePollLoginInput = typeof OAModelServicePollLoginInput.Type;

export const OAModelServiceAnswerLoginInput = Schema.Struct({
  requestId: AuthRequestId,
  promptId: AuthPromptId,
  value: BoundedInteractionValue,
});
export type OAModelServiceAnswerLoginInput = typeof OAModelServiceAnswerLoginInput.Type;

export const OAModelServiceCancelLoginInput = Schema.Struct({
  requestId: AuthRequestId,
});
export type OAModelServiceCancelLoginInput = typeof OAModelServiceCancelLoginInput.Type;

export const OAModelServiceLogoutInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  origin: Schema.optional(Schema.Literal("extension")),
});
export type OAModelServiceLogoutInput = typeof OAModelServiceLogoutInput.Type;
export const OAModelServiceLogoutResult = Schema.Struct({
  state: Schema.Literals(["complete", "credential_updated_sync_failed"]),
  service: OAModelServiceDescriptor,
});
export type OAModelServiceLogoutResult = typeof OAModelServiceLogoutResult.Type;

export const OAModelServiceRevealApiKeyInput = Schema.Struct({
  serviceId: BoundedIdentifier,
});
export type OAModelServiceRevealApiKeyInput = typeof OAModelServiceRevealApiKeyInput.Type;
export const OAModelServiceRevealApiKeyResult = Schema.Union([
  Schema.Struct({ state: Schema.Literal("ready"), apiKey: BoundedSecret }),
  Schema.Struct({
    state: Schema.Literal("unavailable"),
    reason: Schema.Literals(["not_stored_api_key", "credential_unavailable"]),
  }),
]);
export type OAModelServiceRevealApiKeyResult = typeof OAModelServiceRevealApiKeyResult.Type;

export const OAModelServiceRefreshInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  origin: Schema.optional(Schema.Literal("extension")),
});
export type OAModelServiceRefreshInput = typeof OAModelServiceRefreshInput.Type;
export const OAModelServiceRefreshResult = Schema.Struct({
  state: Schema.Literals(["success", "failed", "cancelled", "unsupported"]),
  service: OAModelServiceDescriptor,
});
export type OAModelServiceRefreshResult = typeof OAModelServiceRefreshResult.Type;

const CredentialCommand = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(4_096),
  Schema.isPattern(/^[^\u0000-\u001f\u007f-\u009f]+$/u),
);

export const HarnessOSCustomModelServiceCredentialInput = Schema.Union([
  Schema.Struct({ type: Schema.Literal("preserve") }),
  Schema.Struct({ type: Schema.Literal("stored_key"), apiKey: BoundedSecret }),
  Schema.Struct({
    type: Schema.Literal("environment"),
    variableName: CredentialEnvironmentVariableName,
  }),
  Schema.Struct({
    type: Schema.Literal("command"),
    command: CredentialCommand,
  }),
]);
export type HarnessOSCustomModelServiceCredentialInput =
  typeof HarnessOSCustomModelServiceCredentialInput.Type;

export const HarnessOSCustomModelServiceTestInput = Schema.Struct({
  config: HarnessOSCustomModelServiceConfigInput,
  credential: HarnessOSCustomModelServiceCredentialInput,
  testModelId: BoundedModelId,
});
export type HarnessOSCustomModelServiceTestInput = typeof HarnessOSCustomModelServiceTestInput.Type;

export const HarnessOSCustomModelServiceDiscoveryConfigInput = Schema.Struct({
  serviceId: Schema.NullOr(BoundedIdentifier),
  displayName: BoundedDisplayName,
  api: HarnessOSCustomModelServiceApi,
  baseUrl: BoundedEndpointUrl,
  headerMutations: Schema.optional(BoundedHeaderMutations),
});
export type HarnessOSCustomModelServiceDiscoveryConfigInput =
  typeof HarnessOSCustomModelServiceDiscoveryConfigInput.Type;

export const HarnessOSCustomModelServiceDiscoveredModel = Schema.Struct({
  modelId: BoundedModelId,
  displayName: BoundedDisplayName,
});
export type HarnessOSCustomModelServiceDiscoveredModel =
  typeof HarnessOSCustomModelServiceDiscoveredModel.Type;

const BoundedDiscoveredModels = Schema.Array(HarnessOSCustomModelServiceDiscoveredModel)
  .check(Schema.isMinLength(1))
  .check(Schema.isMaxLength(HARNESSOS_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT));

export const HarnessOSCustomModelServiceDiscoverInput = Schema.Struct({
  config: HarnessOSCustomModelServiceDiscoveryConfigInput,
  credential: HarnessOSCustomModelServiceCredentialInput,
});
export type HarnessOSCustomModelServiceDiscoverInput =
  typeof HarnessOSCustomModelServiceDiscoverInput.Type;

export const HarnessOSCustomModelServiceDiscoverResult = Schema.Union([
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
export type HarnessOSCustomModelServiceDiscoverResult =
  typeof HarnessOSCustomModelServiceDiscoverResult.Type;

export const HarnessOSCustomModelServiceTestResult = Schema.Union([
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
export type HarnessOSCustomModelServiceTestResult =
  typeof HarnessOSCustomModelServiceTestResult.Type;

export const HarnessOSCustomModelServiceSaveInput = Schema.Struct({
  config: HarnessOSCustomModelServiceConfigInput,
  credential: HarnessOSCustomModelServiceCredentialInput,
});
export type HarnessOSCustomModelServiceSaveInput = typeof HarnessOSCustomModelServiceSaveInput.Type;

export const HarnessOSCustomModelServiceSaveResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literals(["complete", "complete_with_sync_warning"]),
    service: OAModelServiceDescriptor,
  }),
  Schema.Struct({
    state: Schema.Literals([
      "credential_unchanged",
      "credential_removed_retry_required",
      "config_saved_auth_failed",
      "config_saved_sync_failed",
    ]),
    service: Schema.NullOr(OAModelServiceDescriptor),
  }),
]);
export type HarnessOSCustomModelServiceSaveResult =
  typeof HarnessOSCustomModelServiceSaveResult.Type;

export const HarnessOSCustomModelServiceRemoveInput = Schema.Struct({
  serviceId: BoundedIdentifier,
});
export type HarnessOSCustomModelServiceRemoveInput =
  typeof HarnessOSCustomModelServiceRemoveInput.Type;

export const HarnessOSCustomModelServiceRemoveResult = Schema.Struct({
  state: Schema.Literals(["complete", "complete_with_sync_warning", "blocked_active_operation"]),
  serviceId: BoundedIdentifier,
});
export type HarnessOSCustomModelServiceRemoveResult =
  typeof HarnessOSCustomModelServiceRemoveResult.Type;

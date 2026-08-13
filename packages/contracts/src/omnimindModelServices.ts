// FILE: omnimindModelServices.ts
// Purpose: Defines the credential-blind OmniMind Agent model-services projection.
// Layer: Shared contracts
// Exports: Read-only list/get schemas used by the Server and Settings renderer.

import { Schema } from "effect";

import { NonNegativeInt, TrimmedNonEmptyString } from "./baseSchemas";

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

export const OmniMindModelServicesListInput = Schema.Struct({});
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
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("empty"),
    services: Schema.Tuple([]),
    connectableServices: BoundedModelServices,
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
});
export type OmniMindModelServicesGetInput = typeof OmniMindModelServicesGetInput.Type;

export const OmniMindModelServicesGetResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literal("ready"),
    service: OmniMindModelServiceDescriptor,
    errorCode: Schema.Null,
  }),
  Schema.Struct({
    state: Schema.Literal("empty"),
    service: Schema.Null,
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

export const OmniMindModelServiceBeginLoginInput = Schema.Struct({
  serviceId: BoundedIdentifier,
  authType: OmniMindModelServiceAuthMethodType,
});
export type OmniMindModelServiceBeginLoginInput = typeof OmniMindModelServiceBeginLoginInput.Type;

export const OmniMindModelServiceAnswerLoginInput = Schema.Struct({
  requestId: AuthRequestId,
  promptId: AuthPromptId,
  value: BoundedInteractionValue,
});
export type OmniMindModelServiceAnswerLoginInput = typeof OmniMindModelServiceAnswerLoginInput.Type;

export const OmniMindModelServiceCancelLoginInput = Schema.Struct({ requestId: AuthRequestId });
export type OmniMindModelServiceCancelLoginInput = typeof OmniMindModelServiceCancelLoginInput.Type;

export const OmniMindModelServiceLogoutInput = Schema.Struct({ serviceId: BoundedIdentifier });
export type OmniMindModelServiceLogoutInput = typeof OmniMindModelServiceLogoutInput.Type;
export const OmniMindModelServiceLogoutResult = Schema.Struct({
  state: Schema.Literals(["complete", "credential_updated_sync_failed"]),
  service: OmniMindModelServiceDescriptor,
});
export type OmniMindModelServiceLogoutResult = typeof OmniMindModelServiceLogoutResult.Type;

export const OmniMindModelServiceRefreshInput = Schema.Struct({ serviceId: BoundedIdentifier });
export type OmniMindModelServiceRefreshInput = typeof OmniMindModelServiceRefreshInput.Type;
export const OmniMindModelServiceRefreshResult = Schema.Struct({
  state: Schema.Literals(["success", "failed", "cancelled", "unsupported"]),
  service: OmniMindModelServiceDescriptor,
});
export type OmniMindModelServiceRefreshResult = typeof OmniMindModelServiceRefreshResult.Type;

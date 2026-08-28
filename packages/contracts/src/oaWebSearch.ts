import { Schema } from "effect";

import { NonNegativeInt, TrimmedNonEmptyString } from "./baseSchemas";
import { EditorId } from "./editor";

const Revision = Schema.String.check(
  Schema.isMinLength(64),
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-f0-9]{64}$/u),
);
const ProviderId = TrimmedNonEmptyString.check(Schema.isMaxLength(64));
const ConfigKey = TrimmedNonEmptyString.check(Schema.isMaxLength(128));
const ConfigValue = Schema.String.check(Schema.isMaxLength(16_384));
const RequestIdentity = TrimmedNonEmptyString.check(Schema.isMaxLength(128));

export const OAWebSearchWorkflow = Schema.Literals(["none", "auto-summary", "summary-review"]);
export type OAWebSearchWorkflow = typeof OAWebSearchWorkflow.Type;

export const OAWebSearchProviderSelection = Schema.Union([
  ProviderId,
  Schema.Array(ProviderId).check(Schema.isMinLength(1), Schema.isMaxLength(64)),
]);
export type OAWebSearchProviderSelection = typeof OAWebSearchProviderSelection.Type;

export const OAWebSearchDraftField = Schema.Struct({
  configKey: ConfigKey,
  value: Schema.NullOr(ConfigValue),
});
export type OAWebSearchDraftField = typeof OAWebSearchDraftField.Type;

export const OAWebSearchDraft = Schema.Struct({
  provider: OAWebSearchProviderSelection,
  workflow: OAWebSearchWorkflow,
  autoShowSearchProcess: Schema.Boolean,
  fields: Schema.Array(OAWebSearchDraftField).check(Schema.isMaxLength(128)),
});
export type OAWebSearchDraft = typeof OAWebSearchDraft.Type;

const OAWebSearchProviderField = Schema.Struct({
  id: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  configKey: ConfigKey,
  kind: Schema.Literals(["secret", "url", "text"]),
  role: Schema.Literals(["api-key", "endpoint", "model", "zone"]),
  required: Schema.Boolean,
  environmentVariable: Schema.NullOr(Schema.String.check(Schema.isMaxLength(128))),
  qualifier: Schema.NullOr(Schema.String.check(Schema.isMaxLength(128))),
  value: Schema.NullOr(ConfigValue),
  invalidStoredValue: Schema.Boolean,
});

const OAWebSearchProviderIcon = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("neutral"),
    assetId: Schema.Null,
    admission: Schema.Literal("not-admitted"),
  }),
  Schema.Struct({
    kind: Schema.Literal("local-asset"),
    assetId: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
    assetPath: TrimmedNonEmptyString.check(Schema.isMaxLength(512)),
    admission: Schema.Literal("admitted"),
  }),
]);

const OAWebSearchProvider = Schema.Struct({
  id: ProviderId,
  displayName: TrimmedNonEmptyString.check(Schema.isMaxLength(128)),
  prerequisite: Schema.Literals([
    "none",
    "optional-key",
    "key",
    "endpoint",
    "key-or-session",
    "gemini",
  ]),
  costHint: Schema.Literals(["keyless-shared-quota", "may-charge", "provider-dependent"]),
  participation: Schema.Struct({
    auto: Schema.Boolean,
    all: Schema.Literals(["included", "excluded", "api-only"]),
    explicitOnly: Schema.Boolean,
  }),
  configured: Schema.Boolean,
  configurationState: Schema.Literals([
    "not-required",
    "session-dependent",
    "missing",
    "partial",
    "complete",
  ]),
  missingRequiredConfigKeys: Schema.Array(ConfigKey).check(Schema.isMaxLength(16)),
  structurallyPossible: Schema.Boolean,
  fields: Schema.Array(OAWebSearchProviderField).check(Schema.isMaxLength(16)),
  advancedFileOnly: Schema.Array(Schema.String.check(Schema.isMaxLength(128))).check(
    Schema.isMaxLength(32),
  ),
  settingsGroup: Schema.Literals(["no-setup", "credentials", "advanced"]),
  icon: OAWebSearchProviderIcon,
});

export const OAWebSearchSettingsSnapshot = Schema.Struct({
  state: Schema.Literal("ready"),
  revision: Revision,
  schemaVersion: NonNegativeInt,
  workflow: OAWebSearchWorkflow,
  autoShowSearchProcess: Schema.Boolean,
  provider: OAWebSearchProviderSelection,
  capabilityStatus: Schema.Literals(["possible", "needs-configuration", "file-disabled"]),
  tools: Schema.Struct({
    webSearch: Schema.Struct({
      enabled: Schema.Boolean,
      reason: Schema.Literals(["enabled", "file-disabled"]),
    }),
    sourceCheck: Schema.Struct({
      enabled: Schema.Boolean,
      reason: Schema.Literals(["enabled", "file-disabled"]),
    }),
    fetchContent: Schema.Struct({
      enabled: Schema.Boolean,
      reason: Schema.Literals(["enabled", "file-disabled"]),
    }),
    getSearchContent: Schema.Struct({
      enabled: Schema.Boolean,
      reason: Schema.Literals(["enabled", "file-disabled"]),
    }),
  }),
  providers: Schema.Array(OAWebSearchProvider).check(Schema.isMaxLength(64)),
});
export type OAWebSearchSettingsSnapshot = typeof OAWebSearchSettingsSnapshot.Type;

export const OAWebSearchRecoverySnapshot = Schema.Struct({
  state: Schema.Literal("recovery"),
  reason: Schema.Literals([
    "damaged-json",
    "invalid-root",
    "future-schema",
    "too-large",
    "unsafe-path",
  ]),
  message: Schema.String.check(Schema.isMaxLength(1_024)),
});
export type OAWebSearchRecoverySnapshot = typeof OAWebSearchRecoverySnapshot.Type;

export const OAWebSearchReadResult = Schema.Union([
  OAWebSearchSettingsSnapshot,
  OAWebSearchRecoverySnapshot,
]);
export type OAWebSearchReadResult = typeof OAWebSearchReadResult.Type;

export const OAWebSearchOpenInput = Schema.Struct({});
export type OAWebSearchOpenInput = typeof OAWebSearchOpenInput.Type;
export const OAWebSearchRefreshInput = Schema.Struct({
  knownRevision: Schema.optionalKey(Revision),
});
export type OAWebSearchRefreshInput = typeof OAWebSearchRefreshInput.Type;

export const OAWebSearchMutationInput = Schema.Struct({
  expectedRevision: Revision,
  draft: OAWebSearchDraft,
  allowOverwriteConflict: Schema.optionalKey(Schema.Boolean),
});
export type OAWebSearchMutationInput = typeof OAWebSearchMutationInput.Type;

export const OAWebSearchMutationResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literals(["changed", "unchanged"]),
    snapshot: OAWebSearchSettingsSnapshot,
  }),
  Schema.Struct({
    state: Schema.Literal("conflict"),
    snapshot: OAWebSearchSettingsSnapshot,
  }),
  OAWebSearchRecoverySnapshot,
]);
export type OAWebSearchMutationResult = typeof OAWebSearchMutationResult.Type;

export const OAWebSearchProviderTestInput = Schema.Struct({
  requestId: RequestIdentity,
  providerId: ProviderId,
  draft: OAWebSearchDraft,
});
export type OAWebSearchProviderTestInput = typeof OAWebSearchProviderTestInput.Type;

export const OAWebSearchRecheckInput = Schema.Struct({
  requestId: RequestIdentity,
});
export type OAWebSearchRecheckInput = typeof OAWebSearchRecheckInput.Type;

export const OAWebSearchProbeResult = Schema.Struct({
  state: Schema.Literals(["ready", "degraded", "unavailable", "failed"]),
  provider: Schema.NullOr(ProviderId),
  reason: Schema.Literals([
    "request-succeeded",
    "temporary-failure",
    "route-exhausted",
    "provider-failed",
    "credential-rejected",
    "quota-exhausted",
    "missing-configuration",
    "network-failure",
    "request-cancelled",
  ]),
  requestId: Schema.optionalKey(RequestIdentity),
  durationMs: NonNegativeInt,
});
export type OAWebSearchProbeResult = typeof OAWebSearchProbeResult.Type;

export const OAWebSearchOpenConfigInput = Schema.Struct({ editor: EditorId });
export type OAWebSearchOpenConfigInput = typeof OAWebSearchOpenConfigInput.Type;

export const OAWebSearchGeminiDiagnosticInput = Schema.Struct({
  draft: OAWebSearchDraft,
});
export type OAWebSearchGeminiDiagnosticInput = typeof OAWebSearchGeminiDiagnosticInput.Type;

export const OAWebSearchGeminiDiagnosticResult = Schema.Struct({
  state: Schema.Literals(["available", "unavailable"]),
  browser: Schema.NullOr(Schema.String.check(Schema.isMaxLength(128))),
  profile: Schema.NullOr(Schema.String.check(Schema.isMaxLength(256))),
  account: Schema.NullOr(Schema.String.check(Schema.isMaxLength(512))),
});
export type OAWebSearchGeminiDiagnosticResult = typeof OAWebSearchGeminiDiagnosticResult.Type;

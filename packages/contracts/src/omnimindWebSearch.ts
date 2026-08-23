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

export const OmniMindWebSearchWorkflow = Schema.Literals([
  "none",
  "auto-summary",
  "summary-review",
]);
export type OmniMindWebSearchWorkflow = typeof OmniMindWebSearchWorkflow.Type;

export const OmniMindWebSearchProviderSelection = Schema.Union([
  ProviderId,
  Schema.Array(ProviderId).check(Schema.isMinLength(1), Schema.isMaxLength(26)),
]);
export type OmniMindWebSearchProviderSelection =
  typeof OmniMindWebSearchProviderSelection.Type;

export const OmniMindWebSearchDraftField = Schema.Struct({
  configKey: ConfigKey,
  value: Schema.NullOr(ConfigValue),
});
export type OmniMindWebSearchDraftField = typeof OmniMindWebSearchDraftField.Type;

export const OmniMindWebSearchDraft = Schema.Struct({
  provider: OmniMindWebSearchProviderSelection,
  workflow: OmniMindWebSearchWorkflow,
  autoShowSearchProcess: Schema.Boolean,
  fields: Schema.Array(OmniMindWebSearchDraftField).check(Schema.isMaxLength(128)),
});
export type OmniMindWebSearchDraft = typeof OmniMindWebSearchDraft.Type;

const OmniMindWebSearchProviderField = Schema.Struct({
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

const OmniMindWebSearchProviderIcon = Schema.Union([
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

const OmniMindWebSearchProvider = Schema.Struct({
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
  fields: Schema.Array(OmniMindWebSearchProviderField).check(Schema.isMaxLength(16)),
  advancedFileOnly: Schema.Array(Schema.String.check(Schema.isMaxLength(128))).check(
    Schema.isMaxLength(32),
  ),
  settingsGroup: Schema.Literals(["no-setup", "credentials", "advanced"]),
  icon: OmniMindWebSearchProviderIcon,
});

export const OmniMindWebSearchSettingsSnapshot = Schema.Struct({
  state: Schema.Literal("ready"),
  revision: Revision,
  schemaVersion: NonNegativeInt,
  workflow: OmniMindWebSearchWorkflow,
  autoShowSearchProcess: Schema.Boolean,
  provider: OmniMindWebSearchProviderSelection,
  capabilityStatus: Schema.Literal("possible"),
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
  providers: Schema.Array(OmniMindWebSearchProvider).check(Schema.isMaxLength(64)),
});
export type OmniMindWebSearchSettingsSnapshot =
  typeof OmniMindWebSearchSettingsSnapshot.Type;

export const OmniMindWebSearchRecoverySnapshot = Schema.Struct({
  state: Schema.Literal("recovery"),
  reason: Schema.Literals(["damaged-json", "invalid-root", "future-schema", "unsafe-path"]),
  message: Schema.String.check(Schema.isMaxLength(1_024)),
});
export type OmniMindWebSearchRecoverySnapshot =
  typeof OmniMindWebSearchRecoverySnapshot.Type;

export const OmniMindWebSearchReadResult = Schema.Union([
  OmniMindWebSearchSettingsSnapshot,
  OmniMindWebSearchRecoverySnapshot,
]);
export type OmniMindWebSearchReadResult = typeof OmniMindWebSearchReadResult.Type;

export const OmniMindWebSearchOpenInput = Schema.Struct({});
export type OmniMindWebSearchOpenInput = typeof OmniMindWebSearchOpenInput.Type;
export const OmniMindWebSearchRefreshInput = Schema.Struct({
  knownRevision: Schema.optionalKey(Revision),
});
export type OmniMindWebSearchRefreshInput = typeof OmniMindWebSearchRefreshInput.Type;

export const OmniMindWebSearchMutationInput = Schema.Struct({
  expectedRevision: Revision,
  draft: OmniMindWebSearchDraft,
  allowOverwriteConflict: Schema.optionalKey(Schema.Boolean),
});
export type OmniMindWebSearchMutationInput = typeof OmniMindWebSearchMutationInput.Type;

export const OmniMindWebSearchMutationResult = Schema.Union([
  Schema.Struct({
    state: Schema.Literals(["changed", "unchanged"]),
    snapshot: OmniMindWebSearchSettingsSnapshot,
  }),
  Schema.Struct({
    state: Schema.Literal("conflict"),
    snapshot: OmniMindWebSearchSettingsSnapshot,
  }),
  OmniMindWebSearchRecoverySnapshot,
]);
export type OmniMindWebSearchMutationResult = typeof OmniMindWebSearchMutationResult.Type;

export const OmniMindWebSearchProviderTestInput = Schema.Struct({
  requestId: RequestIdentity,
  providerId: ProviderId,
  draft: OmniMindWebSearchDraft,
});
export type OmniMindWebSearchProviderTestInput =
  typeof OmniMindWebSearchProviderTestInput.Type;

export const OmniMindWebSearchRecheckInput = Schema.Struct({
  requestId: RequestIdentity,
});
export type OmniMindWebSearchRecheckInput = typeof OmniMindWebSearchRecheckInput.Type;

export const OmniMindWebSearchProbeResult = Schema.Struct({
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
export type OmniMindWebSearchProbeResult = typeof OmniMindWebSearchProbeResult.Type;

export const OmniMindWebSearchOpenConfigInput = Schema.Struct({ editor: EditorId });
export type OmniMindWebSearchOpenConfigInput = typeof OmniMindWebSearchOpenConfigInput.Type;

export const OmniMindWebSearchGeminiDiagnosticInput = Schema.Struct({
  draft: OmniMindWebSearchDraft,
});
export type OmniMindWebSearchGeminiDiagnosticInput =
  typeof OmniMindWebSearchGeminiDiagnosticInput.Type;

export const OmniMindWebSearchGeminiDiagnosticResult = Schema.Struct({
  state: Schema.Literals(["available", "unavailable"]),
  browser: Schema.NullOr(Schema.String.check(Schema.isMaxLength(128))),
  profile: Schema.NullOr(Schema.String.check(Schema.isMaxLength(256))),
  account: Schema.NullOr(Schema.String.check(Schema.isMaxLength(512))),
});
export type OmniMindWebSearchGeminiDiagnosticResult =
  typeof OmniMindWebSearchGeminiDiagnosticResult.Type;

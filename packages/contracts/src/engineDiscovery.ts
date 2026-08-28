// FILE: engineDiscovery.ts
// Purpose: Defines engine discovery request/response contracts shared across web and server.
// Layer: Shared contracts
// Exports: engine discovery schemas and inferred types used by the WS/native API.

import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./baseSchemas";
import { EngineOptionDescriptor } from "./model";
import { EngineKind } from "./engineIdentity";

export const ModelPresentationIdentitySource = Schema.Literals([
  "builtin-catalog",
  "runtime-catalog",
  "user-configured",
  "extension",
  "unknown",
]);
export type ModelPresentationIdentitySource = typeof ModelPresentationIdentitySource.Type;

/** Asset-free identity frozen at model admission for historical presentation. */
export const ModelPresentationIdentity = Schema.Struct({
  model: TrimmedNonEmptyString,
  displayName: TrimmedNonEmptyString,
  serviceId: Schema.optional(TrimmedNonEmptyString),
  serviceName: Schema.optional(TrimmedNonEmptyString),
  source: ModelPresentationIdentitySource,
});
export type ModelPresentationIdentity = typeof ModelPresentationIdentity.Type;

export const ENGINE_MODEL_DISCOVERY_ERROR_CODES = {
  starting: "ENGINE_MODEL_DISCOVERY_STARTING",
  authRequired: "ENGINE_MODEL_DISCOVERY_AUTH_REQUIRED",
  configuration: "ENGINE_MODEL_DISCOVERY_CONFIGURATION",
  unavailable: "ENGINE_MODEL_DISCOVERY_UNAVAILABLE",
} as const;
export type EngineModelDiscoveryErrorCode =
  (typeof ENGINE_MODEL_DISCOVERY_ERROR_CODES)[keyof typeof ENGINE_MODEL_DISCOVERY_ERROR_CODES];

export const EngineSkillInterface = Schema.Struct({
  displayName: Schema.optional(TrimmedNonEmptyString),
  shortDescription: Schema.optional(TrimmedNonEmptyString),
});
export type EngineSkillInterface = typeof EngineSkillInterface.Type;

export const EngineSkillDescriptor = Schema.Struct({
  name: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  path: TrimmedNonEmptyString,
  enabled: Schema.Boolean,
  scope: Schema.optional(TrimmedNonEmptyString),
  interface: Schema.optional(EngineSkillInterface),
  dependencies: Schema.optional(Schema.Unknown),
});
export type EngineSkillDescriptor = typeof EngineSkillDescriptor.Type;

export const EngineSkillReference = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
});
export type EngineSkillReference = typeof EngineSkillReference.Type;

export const EngineMentionReference = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
  resourceKind: Schema.optional(Schema.Literals(["file", "directory"])),
});
export type EngineMentionReference = typeof EngineMentionReference.Type;

export const EngineComposerCapabilities = Schema.Struct({
  engine: EngineKind,
  supportsSkillMentions: Schema.Boolean,
  supportsSkillDiscovery: Schema.Boolean,
  supportsNativeSlashCommandDiscovery: Schema.Boolean,
  supportsPluginMentions: Schema.Boolean,
  supportsPluginDiscovery: Schema.Boolean,
  supportsRuntimeModelList: Schema.Boolean,
  supportsThreadCompaction: Schema.optional(Schema.Boolean),
  supportsThreadImport: Schema.optional(Schema.Boolean),
});
export type EngineComposerCapabilities = typeof EngineComposerCapabilities.Type;

export const EngineGetComposerCapabilitiesInput = Schema.Struct({
  engine: EngineKind,
});
export type EngineGetComposerCapabilitiesInput = typeof EngineGetComposerCapabilitiesInput.Type;

export const EngineListSkillsInput = Schema.Struct({
  engine: EngineKind,
  cwd: TrimmedNonEmptyString,
  threadId: Schema.optional(TrimmedNonEmptyString),
  agentDir: Schema.optional(TrimmedNonEmptyString),
  forceReload: Schema.optional(Schema.Boolean),
});
export type EngineListSkillsInput = typeof EngineListSkillsInput.Type;

export const EngineSkillDiscoveryWarning = Schema.Struct({
  source: Schema.Literals(["engine-native", "harnessos-library"]),
  reason: Schema.Literal("discovery-failed"),
});
export type EngineSkillDiscoveryWarning = typeof EngineSkillDiscoveryWarning.Type;

export const EngineListSkillsResult = Schema.Struct({
  skills: Schema.Array(EngineSkillDescriptor),
  source: Schema.optional(TrimmedNonEmptyString),
  cached: Schema.optional(Schema.Boolean),
  warnings: Schema.optional(Schema.Array(EngineSkillDiscoveryWarning)),
});
export type EngineListSkillsResult = typeof EngineListSkillsResult.Type;

// Unified cross-engine skills catalog (HarnessOS portable skills). Descriptors use
// `scope` to carry the origin label ("oa", "codex", "claude", "cursor", ...).
export const EngineSkillsCatalogInput = Schema.Struct({
  cwd: Schema.optional(TrimmedNonEmptyString),
});
export type EngineSkillsCatalogInput = typeof EngineSkillsCatalogInput.Type;

export const EngineSkillsCatalogResult = Schema.Struct({
  skills: Schema.Array(EngineSkillDescriptor),
  harnessosSkillsDir: Schema.optional(TrimmedNonEmptyString),
});
export type EngineSkillsCatalogResult = typeof EngineSkillsCatalogResult.Type;

export const EngineNativeCommandDescriptor = Schema.Struct({
  name: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
});
export type EngineNativeCommandDescriptor = typeof EngineNativeCommandDescriptor.Type;

export const EngineListCommandsInput = Schema.Struct({
  engine: EngineKind,
  cwd: TrimmedNonEmptyString,
  threadId: Schema.optional(TrimmedNonEmptyString),
  binaryPath: Schema.optional(TrimmedNonEmptyString),
  serverUrl: Schema.optional(TrimmedNonEmptyString),
  experimentalWebSockets: Schema.optional(Schema.Boolean),
  agentDir: Schema.optional(TrimmedNonEmptyString),
  forceReload: Schema.optional(Schema.Boolean),
});
export type EngineListCommandsInput = typeof EngineListCommandsInput.Type;

export const EngineListCommandsResult = Schema.Struct({
  commands: Schema.Array(EngineNativeCommandDescriptor),
  source: Schema.optional(TrimmedNonEmptyString),
  cached: Schema.optional(Schema.Boolean),
});
export type EngineListCommandsResult = typeof EngineListCommandsResult.Type;

// Plugin discovery mirrors Codex app-server's marketplace + plugin summary surface.
export const EnginePluginMarketplaceInterface = Schema.Struct({
  displayName: Schema.optional(TrimmedNonEmptyString),
});
export type EnginePluginMarketplaceInterface = typeof EnginePluginMarketplaceInterface.Type;

export const EnginePluginInstallPolicy = Schema.Literals([
  "NOT_AVAILABLE",
  "AVAILABLE",
  "INSTALLED_BY_DEFAULT",
]);
export type EnginePluginInstallPolicy = typeof EnginePluginInstallPolicy.Type;

export const EnginePluginAuthPolicy = Schema.Literals(["ON_INSTALL", "ON_USE"]);
export type EnginePluginAuthPolicy = typeof EnginePluginAuthPolicy.Type;

export const EnginePluginSource = Schema.Struct({
  type: Schema.Literal("local"),
  path: TrimmedNonEmptyString,
});
export type EnginePluginSource = typeof EnginePluginSource.Type;

export const EnginePluginInterface = Schema.Struct({
  displayName: Schema.optional(TrimmedNonEmptyString),
  shortDescription: Schema.optional(TrimmedNonEmptyString),
  longDescription: Schema.optional(TrimmedNonEmptyString),
  developerName: Schema.optional(TrimmedNonEmptyString),
  category: Schema.optional(TrimmedNonEmptyString),
  capabilities: Schema.optional(Schema.Array(TrimmedNonEmptyString)),
  websiteUrl: Schema.optional(TrimmedNonEmptyString),
  privacyPolicyUrl: Schema.optional(TrimmedNonEmptyString),
  termsOfServiceUrl: Schema.optional(TrimmedNonEmptyString),
  defaultPrompt: Schema.optional(Schema.Array(TrimmedNonEmptyString)),
  brandColor: Schema.optional(TrimmedNonEmptyString),
  composerIcon: Schema.optional(TrimmedNonEmptyString),
  logo: Schema.optional(TrimmedNonEmptyString),
  screenshots: Schema.optional(Schema.Array(TrimmedNonEmptyString)),
});
export type EnginePluginInterface = typeof EnginePluginInterface.Type;

export const EnginePluginDescriptor = Schema.Struct({
  id: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  source: EnginePluginSource,
  installed: Schema.Boolean,
  enabled: Schema.Boolean,
  installPolicy: EnginePluginInstallPolicy,
  authPolicy: EnginePluginAuthPolicy,
  interface: Schema.optional(EnginePluginInterface),
});
export type EnginePluginDescriptor = typeof EnginePluginDescriptor.Type;

export const EnginePluginMarketplaceLoadError = Schema.Struct({
  marketplacePath: TrimmedNonEmptyString,
  message: TrimmedNonEmptyString,
});
export type EnginePluginMarketplaceLoadError = typeof EnginePluginMarketplaceLoadError.Type;

export const EnginePluginMarketplaceDescriptor = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
  interface: Schema.optional(EnginePluginMarketplaceInterface),
  plugins: Schema.Array(EnginePluginDescriptor),
});
export type EnginePluginMarketplaceDescriptor = typeof EnginePluginMarketplaceDescriptor.Type;

export const EnginePluginAppSummary = Schema.Struct({
  id: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  installUrl: Schema.optional(TrimmedNonEmptyString),
  needsAuth: Schema.Boolean,
});
export type EnginePluginAppSummary = typeof EnginePluginAppSummary.Type;

export const EngineListPluginsInput = Schema.Struct({
  engine: EngineKind,
  cwd: Schema.optional(TrimmedNonEmptyString),
  threadId: Schema.optional(TrimmedNonEmptyString),
  forceRemoteSync: Schema.optional(Schema.Boolean),
  forceReload: Schema.optional(Schema.Boolean),
});
export type EngineListPluginsInput = typeof EngineListPluginsInput.Type;

export const EngineListPluginsResult = Schema.Struct({
  marketplaces: Schema.Array(EnginePluginMarketplaceDescriptor),
  marketplaceLoadErrors: Schema.Array(EnginePluginMarketplaceLoadError),
  remoteSyncError: Schema.NullOr(TrimmedNonEmptyString),
  featuredPluginIds: Schema.Array(TrimmedNonEmptyString),
  source: Schema.optional(TrimmedNonEmptyString),
  cached: Schema.optional(Schema.Boolean),
});
export type EngineListPluginsResult = typeof EngineListPluginsResult.Type;

export const EngineReadPluginInput = Schema.Struct({
  engine: EngineKind,
  marketplacePath: TrimmedNonEmptyString,
  pluginName: TrimmedNonEmptyString,
  cwd: Schema.optional(TrimmedNonEmptyString),
  threadId: Schema.optional(TrimmedNonEmptyString),
});
export type EngineReadPluginInput = typeof EngineReadPluginInput.Type;

export const EnginePluginDetail = Schema.Struct({
  marketplaceName: TrimmedNonEmptyString,
  marketplacePath: TrimmedNonEmptyString,
  summary: EnginePluginDescriptor,
  description: Schema.optional(TrimmedNonEmptyString),
  skills: Schema.Array(EngineSkillDescriptor),
  apps: Schema.Array(EnginePluginAppSummary),
  mcpServers: Schema.Array(TrimmedNonEmptyString),
});
export type EnginePluginDetail = typeof EnginePluginDetail.Type;

export const EngineReadPluginResult = Schema.Struct({
  plugin: EnginePluginDetail,
  source: Schema.optional(TrimmedNonEmptyString),
  cached: Schema.optional(Schema.Boolean),
});
export type EngineReadPluginResult = typeof EngineReadPluginResult.Type;

export const EngineListModelsInput = Schema.Struct({
  engine: EngineKind,
  binaryPath: Schema.optional(TrimmedNonEmptyString),
  apiEndpoint: Schema.optional(TrimmedNonEmptyString),
  agentDir: Schema.optional(TrimmedNonEmptyString),
  cwd: Schema.optional(TrimmedNonEmptyString),
});
export type EngineListModelsInput = typeof EngineListModelsInput.Type;

export const EngineReasoningEffortDescriptor = Schema.Struct({
  value: TrimmedNonEmptyString,
  label: Schema.optional(TrimmedNonEmptyString),
  description: Schema.optional(TrimmedNonEmptyString),
});
export type EngineReasoningEffortDescriptor = typeof EngineReasoningEffortDescriptor.Type;

export const EngineContextWindowDescriptor = Schema.Struct({
  value: TrimmedNonEmptyString,
  label: TrimmedNonEmptyString,
  isDefault: Schema.optional(Schema.Literal(true)),
});
export type EngineContextWindowDescriptor = typeof EngineContextWindowDescriptor.Type;

export const EngineModelDescriptor = Schema.Struct({
  slug: TrimmedNonEmptyString,
  resolvedModel: Schema.optional(TrimmedNonEmptyString),
  name: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  upstreamProviderId: Schema.optional(TrimmedNonEmptyString),
  upstreamProviderName: Schema.optional(TrimmedNonEmptyString),
  upstreamProviderOrigin: Schema.optional(
    Schema.Literals(["builtin", "models_json", "extension", "unknown"]),
  ),
  optionDescriptors: Schema.optional(Schema.Array(EngineOptionDescriptor)),
  // Codex model/list results are normalized here so the web app can consume both
  // the legacy string array and Remodex-style reasoning objects uniformly.
  supportedReasoningEfforts: Schema.optional(Schema.Array(EngineReasoningEffortDescriptor)),
  defaultReasoningEffort: Schema.optional(TrimmedNonEmptyString),
  supportsFastMode: Schema.optional(Schema.Boolean),
  supportsThinkingToggle: Schema.optional(Schema.Boolean),
  supportsAutoMode: Schema.optional(Schema.Boolean),
  contextWindowOptions: Schema.optional(Schema.Array(EngineContextWindowDescriptor)),
  defaultContextWindow: Schema.optional(TrimmedNonEmptyString),
});
export type EngineModelDescriptor = typeof EngineModelDescriptor.Type;

export const EngineListModelsResult = Schema.Struct({
  models: Schema.Array(EngineModelDescriptor),
  source: Schema.optional(TrimmedNonEmptyString),
  cached: Schema.optional(Schema.Boolean),
});
export type EngineListModelsResult = typeof EngineListModelsResult.Type;

export const EngineListAgentsInput = Schema.Struct({
  engine: EngineKind,
  binaryPath: Schema.optional(TrimmedNonEmptyString),
  cwd: Schema.optional(TrimmedNonEmptyString),
});
export type EngineListAgentsInput = typeof EngineListAgentsInput.Type;

export const EngineAgentDescriptor = Schema.Struct({
  name: TrimmedNonEmptyString,
  displayName: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  model: Schema.optional(TrimmedNonEmptyString),
});
export type EngineAgentDescriptor = typeof EngineAgentDescriptor.Type;

export const EngineListAgentsResult = Schema.Struct({
  agents: Schema.Array(EngineAgentDescriptor),
  source: Schema.optional(TrimmedNonEmptyString),
  cached: Schema.optional(Schema.Boolean),
});
export type EngineListAgentsResult = typeof EngineListAgentsResult.Type;

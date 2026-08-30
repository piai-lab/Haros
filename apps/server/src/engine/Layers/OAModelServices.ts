// FILE: OAModelServices.ts
// Purpose: Projects Pi ModelRuntime provider/auth/catalog facts without resolving secrets.
// Layer: Server provider service implementation

import crypto from "node:crypto";
import path from "node:path";

import type {
  AuthEvent,
  AuthInteraction,
  AuthPrompt,
  AuthOperationOptions,
  Credential,
  CredentialInfo,
  CredentialStore,
  ModelsStore,
  ModelsStoreEntry,
  ModelsStoreOperationOptions,
} from "@earendil-works/pi-ai";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import type {
  HarosCustomModelServiceDiscoveryConfigInput,
  HarosCustomModelServiceCredentialInput,
  HarosCustomModelServiceDiscoverResult,
  HarosCustomModelServiceConfigInput,
  HarosCustomModelServiceConfig,
  HarosCustomModelServiceModelInput,
  HarosCustomModelServiceApi,
  HarosCustomModelServiceRemoveResult,
  HarosCustomModelServiceSaveResult,
  HarosCustomModelServiceTestResult,
  OAModelServiceAuthEvent,
  OAModelServiceAuthPrompt,
  OAModelServiceAuthResult,
  OAModelServiceAuthMethodType,
  OAModelServiceOAuthPromptMode,
  OAModelServiceAuthSource,
  OAModelServiceDescriptor,
  OAModelServiceModel,
  OAModelServicesExtensionProjectionState,
  OAModelServicesListResult,
  OAModelServicesProjectionIntent,
} from "@harnessos/contracts";
import {
  HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API,
  HARNESSOS_CUSTOM_MODEL_COST_TIERS_MAX_COUNT,
  HARNESSOS_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT,
  HARNESSOS_MODEL_SERVICE_MODELS_MAX_COUNT,
  HARNESSOS_MODEL_SERVICES_MAX_COUNT,
} from "@harnessos/contracts";
import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import { CurrentWsConnectionSignal } from "../../wsConnectionSessions.ts";
import {
  createOAModelsConfigReader,
  loadOARuntimeModule,
  readOAPrivateTextFile,
  resolveOAAgentDir,
  type OARuntimeModule,
  type OAPrivateRuntimeFilename,
} from "../oaRuntime.ts";
import {
  createHarosOAuthPageRenderer,
  loadHarosOAuthLogoDataUrl,
} from "../harnessosOAuthCallbackPage.ts";
import { publishOAModelRuntimeMutation } from "../oaModelRuntimeMutation.ts";
import { OAModelServices, type OAModelServicesShape } from "../Services/OAModelServices.ts";
import { EngineService } from "../Services/EngineService.ts";

const MAX_SAFE_LABEL_LENGTH = 256;
const MAX_SAFE_MODEL_ID_LENGTH = 512;
const MAX_AUTH_INTERACTION_TEXT_LENGTH = 4_096;
const AUTH_REQUEST_TIMEOUT_MS = 5 * 60 * 1_000;
const MAX_PENDING_AUTH_REQUESTS = 32;
const CUSTOM_API_PROTOCOLS = [
  "openai-completions",
  "openai-responses",
  "anthropic-messages",
  "google-generative-ai",
] as const;
const CUSTOM_CONNECTION_TEST_PROMPT = "Reply with OK.";
const CUSTOM_CONNECTION_TEST_TIMEOUT_MS = 20_000;
const CUSTOM_MODEL_DISCOVERY_TIMEOUT_MS = 20_000;
const MODEL_SERVICE_REFRESH_TIMEOUT_MS = 20_000;
const MAX_REVEALED_API_KEY_LENGTH = 65_536;
const CUSTOM_MODEL_THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

class InvalidCustomServiceEditError extends Error {}

type ReadTextFile = (filePath: string, signal?: AbortSignal) => Promise<string>;

type CustomApiProtocol = (typeof CUSTOM_API_PROTOCOLS)[number];

function compactThinkingLevelMap(
  value:
    | Partial<Record<(typeof CUSTOM_MODEL_THINKING_LEVELS)[number], string | null | undefined>>
    | undefined,
): Partial<Record<(typeof CUSTOM_MODEL_THINKING_LEVELS)[number], string | null>> | undefined {
  if (!value) return undefined;
  const entries = CUSTOM_MODEL_THINKING_LEVELS.flatMap((level) =>
    value[level] === undefined ? [] : ([[level, value[level]]] as const),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export interface OAModelServicesLiveOptions {
  readonly loadModule?: () => Promise<OARuntimeModule>;
  readonly readTextFile?: ReadTextFile;
  readonly authRequestTimeoutMs?: number;
  readonly modelServiceRefreshTimeoutMs?: number;
  readonly customConnectionTestTimeoutMs?: number;
  readonly customModelDiscoveryTimeoutMs?: number;
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function safeIdentifier(value: string): string | null {
  return value.length > 0 &&
    value.length <= MAX_SAFE_LABEL_LENGTH &&
    value === value.trim() &&
    /^(?!\.{1,2}$)[^/\\\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/u.test(
      value,
    )
    ? value
    : null;
}

function safeModelId(value: string): string | null {
  return value.length > 0 &&
    value.length <= MAX_SAFE_MODEL_ID_LENGTH &&
    value === value.trim() &&
    /^[^\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+$/u.test(value)
    ? value
    : null;
}

function isPathOrUrlShapedLabel(value: string): boolean {
  return (
    value.startsWith("/") ||
    /^[A-Za-z]:[\\/]/u.test(value) ||
    value.startsWith("\\\\") ||
    /^(?:file|https?):\/\//iu.test(value)
  );
}

function safeDisplayName(value: string | undefined, fallback: string): string {
  const normalized = (value ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ")
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const candidate = normalized.slice(0, MAX_SAFE_LABEL_LENGTH);
  return candidate && !isPathOrUrlShapedLabel(candidate) ? candidate : fallback;
}

function normalizedCustomBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("Custom model-service endpoint is invalid");
  }
  return parsed.toString().replace(/\/$/u, "");
}

type CustomCompatField =
  (typeof HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API)[keyof typeof HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API][number];

function projectCustomCompat(
  api: HarosCustomModelServiceApi,
  compat: Record<string, unknown> | undefined,
): Record<string, boolean | string> | undefined {
  if (!compat) return undefined;
  const projected: Record<string, boolean | string> = {};
  for (const field of HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API[
    api
  ] as readonly CustomCompatField[]) {
    const value = compat[field];
    if (typeof value === "boolean") projected[field] = value;
    else if (
      field === "maxTokensField" &&
      (value === "max_completion_tokens" || value === "max_tokens")
    ) {
      projected[field] = value;
    }
  }
  return Object.keys(projected).length > 0 ? projected : undefined;
}

function customCompatForMutation(
  api: HarosCustomModelServiceApi,
  compat: Readonly<Record<string, boolean | string | undefined>> | undefined,
): Record<string, boolean | string> | undefined {
  if (!compat) return undefined;
  const allowed = new Set<string>(HARNESSOS_CUSTOM_MODEL_COMPAT_FIELDS_BY_API[api]);
  if (Object.keys(compat).some((field) => !allowed.has(field))) {
    throw new InvalidCustomServiceEditError();
  }
  return Object.fromEntries(
    Object.entries(compat).filter(
      (entry): entry is [string, boolean | string] => entry[1] !== undefined,
    ),
  );
}

function customProviderConfig(input: HarosCustomModelServiceConfigInput) {
  return {
    name: input.displayName,
    baseUrl: normalizedCustomBaseUrl(input.baseUrl),
    api: input.api,
    ...(input.authHeader !== undefined ? { authHeader: input.authHeader } : {}),
    models: input.models.map((model) => {
      const thinkingLevelMap = compactThinkingLevelMap(model.thinkingLevelMap);
      const effectiveApi = model.api ?? input.api;
      const compat = customCompatForMutation(effectiveApi, model.compat);
      return {
        id: model.modelId,
        ...(model.displayName ? { name: model.displayName } : {}),
        ...(model.api ? { api: model.api } : {}),
        ...(model.baseUrl ? { baseUrl: normalizedCustomBaseUrl(model.baseUrl) } : {}),
        ...(model.reasoning !== undefined ? { reasoning: model.reasoning } : {}),
        ...(thinkingLevelMap ? { thinkingLevelMap } : {}),
        ...(model.input ? { input: [...model.input] } : {}),
        ...(model.cost
          ? {
              cost: {
                input: model.cost.input,
                output: model.cost.output,
                cacheRead: model.cost.cacheRead,
                cacheWrite: model.cost.cacheWrite,
                ...(model.cost.tiers
                  ? { tiers: model.cost.tiers.map((tier) => ({ ...tier })) }
                  : {}),
              },
            }
          : {}),
        ...(compat ? { compat } : {}),
        ...(model.contextWindow !== undefined ? { contextWindow: model.contextWindow } : {}),
        ...(model.maxTokens !== undefined ? { maxTokens: model.maxTokens } : {}),
      };
    }),
  };
}

function clearOmittedCompatAfterApiChange(
  input: HarosCustomModelServiceConfigInput,
  previous: ReturnType<OARuntimeModule["ModelRuntime"]["prototype"]["getModelConfigProvider"]>,
): HarosCustomModelServiceConfigInput {
  if (!previous || !isCustomApiProtocol(previous.api)) return input;
  const previousModels = new Map((previous.models ?? []).map((model) => [model.id, model]));
  let changed = false;
  const models = input.models.map((model) => {
    if (model.compat !== undefined) return model;
    const previousModel = previousModels.get(model.modelId);
    if (!previousModel) return model;
    const previousApi = isCustomApiProtocol(previousModel.api) ? previousModel.api : previous.api;
    const nextApi = model.api ?? input.api;
    if (previousApi === nextApi) return model;
    changed = true;
    return { ...model, compat: {} };
  });
  return changed ? { ...input, models } : input;
}

function customProviderDiscoveryConfig(input: HarosCustomModelServiceDiscoveryConfigInput) {
  return {
    name: input.displayName,
    baseUrl: normalizedCustomBaseUrl(input.baseUrl),
    api: input.api,
  } as const;
}

function headerReferencesForMutation(
  input: HarosCustomModelServiceConfigInput | HarosCustomModelServiceDiscoveryConfigInput,
): ReadonlyArray<import("@harnessos/oa-runtime").ModelConfigHeaderReferenceMutation> {
  const providerReferences = (input.headerMutations ?? []).map((mutation) => ({
    scope: { type: "provider" as const },
    name: mutation.name,
    reference:
      mutation.type === "clear"
        ? ({ type: "clear" } as const)
        : ({
            type: "environment",
            variableName: mutation.variableName,
          } as const),
  }));
  if (!("models" in input)) return providerReferences;
  return [
    ...providerReferences,
    ...input.models.flatMap((model) =>
      (model.headerMutations ?? []).map((mutation) => ({
        scope: { type: "model" as const, modelId: model.modelId },
        name: mutation.name,
        reference:
          mutation.type === "clear"
            ? ({ type: "clear" } as const)
            : ({
                type: "environment",
                variableName: mutation.variableName,
              } as const),
      })),
    ),
  ];
}

function credentialReferenceMutation(
  credential: HarosCustomModelServiceCredentialInput,
):
  | { readonly type: "environment"; readonly variableName: string }
  | { readonly type: "command"; readonly command: string }
  | { readonly type: "clear" }
  | undefined {
  switch (credential.type) {
    case "preserve":
      return undefined;
    case "stored_key":
      return { type: "clear" };
    case "environment":
      return { type: "environment", variableName: credential.variableName };
    case "command":
      return { type: "command", command: credential.command };
  }
}

function isCustomApiProtocol(value: string | undefined): value is CustomApiProtocol {
  return CUSTOM_API_PROTOCOLS.some((protocol) => protocol === value);
}

function isPublicCustomModelCost(cost: {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly tiers?: ReadonlyArray<{
    readonly inputTokensAbove: number;
    readonly input: number;
    readonly output: number;
    readonly cacheRead: number;
    readonly cacheWrite: number;
  }>;
}): boolean {
  const rates = [cost.input, cost.output, cost.cacheRead, cost.cacheWrite];
  if (rates.some((rate) => !Number.isFinite(rate) || rate < 0)) return false;
  if ((cost.tiers?.length ?? 0) > HARNESSOS_CUSTOM_MODEL_COST_TIERS_MAX_COUNT) return false;
  return (cost.tiers ?? []).every((tier) =>
    [tier.inputTokensAbove, tier.input, tier.output, tier.cacheRead, tier.cacheWrite].every(
      (value) => Number.isFinite(value) && value >= 0,
    ),
  );
}

function projectCustomConfig(
  serviceId: string,
  provider: ReturnType<OARuntimeModule["ModelRuntime"]["prototype"]["getModelConfigProvider"]>,
  headerMetadata: ReturnType<
    OARuntimeModule["ModelRuntime"]["prototype"]["getModelConfigProviderHeaderMetadata"]
  >,
): HarosCustomModelServiceConfig | undefined {
  if (!provider?.baseUrl || !isCustomApiProtocol(provider.api) || !provider.models?.length) {
    return undefined;
  }
  if (
    provider.models.some(
      (model) => model.cost !== undefined && !isPublicCustomModelCost(model.cost),
    )
  ) {
    return undefined;
  }
  const providerApi = provider.api;
  const modelHeaders = new Map(
    (headerMetadata?.models ?? []).map((entry) => [entry.modelId, entry.headers]),
  );
  const models = provider.models.flatMap<HarosCustomModelServiceModelInput>((model) => {
    const modelId = safeModelId(model.id);
    if (!modelId) return [];
    const thinkingLevelMap = compactThinkingLevelMap(model.thinkingLevelMap);
    const modelApi = isCustomApiProtocol(model.api) ? model.api : providerApi;
    const compat = projectCustomCompat(modelApi, model.compat);
    return [
      {
        modelId,
        ...(model.name ? { displayName: safeDisplayName(model.name, modelId) } : {}),
        ...(isCustomApiProtocol(model.api) ? { api: model.api } : {}),
        ...(model.baseUrl ? { baseUrl: normalizedCustomBaseUrl(model.baseUrl) } : {}),
        ...(model.reasoning !== undefined ? { reasoning: model.reasoning } : {}),
        ...(thinkingLevelMap ? { thinkingLevelMap } : {}),
        ...(model.input?.filter(
          (kind): kind is "text" | "image" => kind === "text" || kind === "image",
        ).length
          ? {
              input: model.input.filter(
                (kind): kind is "text" | "image" => kind === "text" || kind === "image",
              ),
            }
          : {}),
        ...(model.cost && isPublicCustomModelCost(model.cost)
          ? {
              cost: {
                input: model.cost.input,
                output: model.cost.output,
                cacheRead: model.cost.cacheRead,
                cacheWrite: model.cost.cacheWrite,
                ...(model.cost.tiers?.length
                  ? {
                      tiers: model.cost.tiers.map((tier) => ({ ...tier })),
                    }
                  : {}),
              },
            }
          : {}),
        ...(compat ? { compat } : {}),
        ...(modelHeaders.get(modelId)?.length
          ? { configuredHeaders: modelHeaders.get(modelId) }
          : {}),
        ...(model.contextWindow !== undefined
          ? { contextWindow: Math.max(1, Math.trunc(model.contextWindow)) }
          : {}),
        ...(model.maxTokens !== undefined
          ? { maxTokens: Math.max(1, Math.trunc(model.maxTokens)) }
          : {}),
      },
    ];
  });
  if (models.length === 0) return undefined;
  return {
    serviceId,
    displayName: safeDisplayName(provider.name, serviceId),
    api: provider.api,
    baseUrl: normalizedCustomBaseUrl(provider.baseUrl),
    ...(provider.authHeader !== undefined ? { authHeader: provider.authHeader } : {}),
    ...(headerMetadata?.provider.length ? { configuredHeaders: headerMetadata.provider } : {}),
    models,
  };
}

function safeInteractionText(value: string | undefined, fallback: string): string {
  const normalized = (value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/gu, " ")
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized.slice(0, MAX_AUTH_INTERACTION_TEXT_LENGTH) || fallback;
}

function safeInteractionUrl(value: string): string | null {
  if (value.length > MAX_AUTH_INTERACTION_TEXT_LENGTH) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function projectAuthPrompt(prompt: AuthPrompt): OAModelServiceAuthPrompt {
  const promptId = crypto.randomUUID();
  if (prompt.type === "select") {
    const options = prompt.options.flatMap((option) => {
      const id = safeIdentifier(option.id);
      if (!id) return [];
      return [
        {
          id,
          label: safeDisplayName(option.label, id),
          ...(option.description
            ? { description: safeInteractionText(option.description, "Option") }
            : {}),
        },
      ];
    });
    if (options.length === 0 || options.length > 64) {
      throw new Error("Authentication choices are unavailable");
    }
    return {
      promptId,
      type: "select",
      message: safeInteractionText(prompt.message, "Choose an authentication option"),
      options,
    };
  }
  return {
    promptId,
    type: prompt.type,
    message: safeInteractionText(prompt.message, "Authentication input required"),
    ...(prompt.placeholder
      ? {
          placeholder: safeInteractionText(prompt.placeholder, "Authentication input"),
        }
      : {}),
  };
}

function projectAuthEvent(event: AuthEvent): OAModelServiceAuthEvent | null {
  if (event.type === "info" || event.type === "progress") {
    return {
      type: event.type,
      message: safeInteractionText(event.message, "Authentication update"),
    };
  }
  if (event.type === "auth_url") {
    const url = safeInteractionUrl(event.url);
    return url
      ? {
          type: "auth_url",
          url,
          ...(event.instructions
            ? {
                instructions: safeInteractionText(event.instructions, "Continue authentication"),
              }
            : {}),
        }
      : null;
  }
  const verificationUri = safeInteractionUrl(event.verificationUri);
  return verificationUri
    ? {
        type: "device_code",
        userCode: safeInteractionText(event.userCode, "Code unavailable"),
        verificationUri,
        ...(event.intervalSeconds === undefined
          ? {}
          : {
              intervalSeconds: Math.max(0, Math.trunc(event.intervalSeconds)),
            }),
        ...(event.expiresInSeconds === undefined
          ? {}
          : {
              expiresInSeconds: Math.max(0, Math.trunc(event.expiresInSeconds)),
            }),
      }
    : null;
}

interface PendingAuthPrompt {
  readonly prompt: OAModelServiceAuthPrompt;
  readonly resolve: (value: string) => void;
  readonly reject: (error: Error) => void;
}

interface ModelServiceAuthRequest {
  readonly requestId: string;
  readonly clientId: number;
  readonly serviceId: string;
  readonly authType: OAModelServiceAuthMethodType;
  readonly origin: "extension" | null;
  readonly oauthPromptMode: OAModelServiceOAuthPromptMode | null;
  readonly controller: AbortController;
  readonly connectionSignal: AbortSignal;
  readonly abortOnConnectionClose: () => void;
  readonly events: OAModelServiceAuthEvent[];
  providerDefaultPromptConsumed: boolean;
  deadlineExpired: boolean;
  pendingPrompt?: PendingAuthPrompt;
  outcome?: OAModelServiceAuthResult;
  readonly checkpoints: Set<() => void>;
  timeout?: ReturnType<typeof setTimeout>;
}

function isCredential(value: unknown): value is Credential {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (!("type" in value)) return false;
  if (value.type === "api_key") {
    if ("key" in value && value.key !== undefined && typeof value.key !== "string") return false;
    const env = "env" in value ? value.env : undefined;
    if (
      env !== undefined &&
      (typeof env !== "object" ||
        env === null ||
        Array.isArray(env) ||
        Object.values(env).some((entry) => typeof entry !== "string"))
    ) {
      return false;
    }
    return true;
  }
  return (
    value.type === "oauth" &&
    "access" in value &&
    typeof value.access === "string" &&
    "refresh" in value &&
    typeof value.refresh === "string" &&
    "expires" in value &&
    typeof value.expires === "number" &&
    Number.isFinite(value.expires)
  );
}

class StaticCredentialStore implements CredentialStore {
  private constructor(private readonly credentials: ReadonlyMap<string, Credential>) {}

  static async create(input: {
    readonly authPath: string;
    readonly readTextFile: ReadTextFile;
    readonly signal: AbortSignal;
  }): Promise<StaticCredentialStore> {
    input.signal.throwIfAborted();
    let firstRead: string;
    try {
      firstRead = await input.readTextFile(input.authPath, input.signal);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return new StaticCredentialStore(new Map());
      }
      throw new Error("Model-services credential storage is unavailable");
    }
    let raw: unknown;
    try {
      raw = JSON.parse(firstRead);
    } catch {
      throw new Error("Model-services credential storage is invalid");
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error("Model-services credential storage is invalid");
    }

    const credentials = new Map<string, Credential>();
    const rawCredentials = Object.entries(raw);
    if (rawCredentials.length > HARNESSOS_MODEL_SERVICES_MAX_COUNT) {
      throw new Error("Model-services credential storage is too large");
    }
    for (const [providerId, rawCredential] of rawCredentials) {
      input.signal.throwIfAborted();
      if (!safeIdentifier(providerId) || !isCredential(rawCredential)) {
        throw new Error("Model-services credential storage is invalid");
      }
      // OAuth credentials may contain provider-owned fields such as
      // availableModelIds. They remain inside this task-local runtime because
      // provider filters depend on them; the RPC boundary never serializes a credential.
      credentials.set(providerId, structuredClone(rawCredential));
    }

    return new StaticCredentialStore(credentials);
  }

  providerIds(): ReadonlyArray<string> {
    return [...this.credentials.keys()];
  }

  info(providerId: string): {
    readonly type: OAModelServiceAuthMethodType;
    readonly oauthAccessExpired: boolean;
  } | null {
    const credential = this.credentials.get(providerId);
    if (!credential) return null;
    return {
      type: credential.type,
      oauthAccessExpired: credential.type === "oauth" && credential.expires <= Date.now(),
    };
  }

  async read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
    options?.signal?.throwIfAborted();
    const credential = this.credentials.get(providerId);
    options?.signal?.throwIfAborted();
    return credential ? structuredClone(credential) : undefined;
  }

  async list(options?: AuthOperationOptions): Promise<ReadonlyArray<CredentialInfo>> {
    options?.signal?.throwIfAborted();
    const credentials = [...this.credentials].map(([providerId, credential]) => ({
      providerId,
      type: credential.type,
    }));
    options?.signal?.throwIfAborted();
    return credentials;
  }

  async modify(
    _providerId: string,
    _fn: (current: Credential | undefined) => Promise<Credential | undefined>,
    _options?: AuthOperationOptions,
  ): Promise<Credential | undefined> {
    throw new Error("Read-only model-services credentials cannot be modified");
  }

  async delete(_providerId: string, _options?: AuthOperationOptions): Promise<void> {
    throw new Error("Read-only model-services credentials cannot be deleted");
  }
}

function isModelsStoreEntry(value: unknown): value is ModelsStoreEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "models" in value &&
    Array.isArray(value.models)
  );
}

class StaticModelsStore implements ModelsStore {
  private data: Promise<Record<string, unknown>> | undefined;

  constructor(
    private readonly modelsStorePath: string,
    private readonly readTextFile: ReadTextFile,
  ) {}

  private load(signal?: AbortSignal): Promise<Record<string, unknown>> {
    this.data ??= this.readTextFile(this.modelsStorePath, signal).then(
      (content) => {
        const parsed: unknown = JSON.parse(content);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Invalid model catalog cache");
        }
        return parsed as Record<string, unknown>;
      },
      (error: unknown) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return {};
        }
        throw new Error("Model catalog cache is unavailable");
      },
    );
    return this.data;
  }

  async read(
    providerId: string,
    options?: ModelsStoreOperationOptions,
  ): Promise<ModelsStoreEntry | undefined> {
    options?.signal?.throwIfAborted();
    const entry = (await this.load(options?.signal))[providerId];
    options?.signal?.throwIfAborted();
    if (entry === undefined) return undefined;
    if (!isModelsStoreEntry(entry)) throw new Error("Invalid model catalog cache entry");
    return structuredClone(entry);
  }

  async write(
    _providerId: string,
    _entry: ModelsStoreEntry,
    _options?: ModelsStoreOperationOptions,
  ): Promise<void> {
    throw new Error("Read-only model-services catalog cannot be modified");
  }

  async delete(_providerId: string, _options?: ModelsStoreOperationOptions): Promise<void> {
    throw new Error("Read-only model-services catalog cannot be deleted");
  }
}

function normalizeAuthSource(source: string | undefined): OAModelServiceAuthSource | null {
  switch (source) {
    case "stored":
    case "runtime":
    case "environment":
    case "fallback":
    case "models_json_key":
    case "models_json_command":
      return source;
    default:
      return source ? "unknown" : null;
  }
}

function environmentVariablesFromAuthStatus(input: {
  readonly source?: string;
  readonly label?: string;
}): ReadonlyArray<string> | undefined {
  if (input.source !== "environment") return undefined;
  const names = input.label?.split(", ") ?? [];
  return names.length > 0 &&
    names.length <= 8 &&
    names.every((name) => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(name))
    ? names
    : undefined;
}

type OAModelRuntime = Awaited<ReturnType<OARuntimeModule["ModelRuntime"]["create"]>>;
type HarosExtensionServices = Awaited<ReturnType<OARuntimeModule["createAgentSessionServices"]>>;

async function loadIntentScopedExtensionServices(input: {
  readonly sdk: OARuntimeModule;
  readonly runtime: OAModelRuntime;
  readonly agentDir: string;
  readonly signal: AbortSignal;
}): Promise<HarosExtensionServices> {
  const services = await input.sdk.createAgentSessionServices({
    cwd: input.agentDir,
    agentDir: input.agentDir,
    modelRuntime: input.runtime,
    settingsManager: input.sdk.SettingsManager.create(input.agentDir, input.agentDir, {
      projectTrusted: false,
    }),
    resourceLoaderOptions: {
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    },
    resourceLoaderReloadOptions: {
      resolveProjectTrust: async () => false,
      onMissingPackage: async () => "error",
    },
  });
  try {
    input.signal.throwIfAborted();
    return services;
  } catch (error) {
    services.resourceLoader
      .getExtensions()
      .runtime.invalidate("Model-service Extension operation cancelled");
    throw error;
  }
}

function retireIntentScopedExtensionServices(services: HarosExtensionServices | undefined) {
  if (!services) return;
  services.resourceLoader
    .getExtensions()
    .runtime.invalidate("Model-service Extension operation completed");
}

async function projectModelServices(input: {
  readonly serverBaseDir: string;
  readonly loadModule: () => Promise<OARuntimeModule>;
  readonly readTextFile?: ReadTextFile;
  readonly signal: AbortSignal;
  readonly intent?: OAModelServicesProjectionIntent;
  readonly preparedRuntime?: OAModelRuntime;
  readonly preparedExtensionProjectionState?: OAModelServicesExtensionProjectionState;
}): Promise<{
  readonly all: ReadonlyArray<OAModelServiceDescriptor>;
  readonly listed: ReadonlyArray<OAModelServiceDescriptor>;
  readonly connectable: ReadonlyArray<OAModelServiceDescriptor>;
  readonly modelsByServiceId: ReadonlyMap<string, ReadonlyArray<OAModelServiceModel>>;
  readonly customConfigsByServiceId: ReadonlyMap<string, HarosCustomModelServiceConfig>;
  readonly extensionProjectionState?: OAModelServicesExtensionProjectionState;
}> {
  input.signal.throwIfAborted();
  const sdk = await input.loadModule();
  input.signal.throwIfAborted();
  const agentDir = resolveOAAgentDir(input.serverBaseDir);
  const readTextFile =
    input.readTextFile ??
    ((filePath, signal) => {
      if (path.dirname(filePath) !== agentDir) {
        throw new Error("Model-services read escaped the private agent directory");
      }
      const filename = path.basename(filePath) as OAPrivateRuntimeFilename;
      if (!(["auth.json", "models.json", "models-store.json"] as const).includes(filename)) {
        throw new Error("Model-services requested an unknown private runtime file");
      }
      return readOAPrivateTextFile({
        agentDir,
        filename,
        ...(signal ? { signal } : {}),
      });
    });
  const authPath = path.join(agentDir, "auth.json");
  const modelsPath = path.join(agentDir, "models.json");
  const modelsConfigReader = input.readTextFile
    ? async ({ signal }: { readonly signal?: AbortSignal }) => {
        try {
          return await readTextFile(modelsPath, signal);
        } catch (error) {
          if (isMissingPathError(error)) return undefined;
          throw error;
        }
      }
    : createOAModelsConfigReader(agentDir);
  const credentials = await StaticCredentialStore.create({
    authPath,
    readTextFile,
    signal: input.signal,
  });
  const modelsStore = new StaticModelsStore(path.join(agentDir, "models-store.json"), readTextFile);
  const createProjectionRuntime = async () =>
    sdk.ModelRuntime.create({
      credentials,
      modelsPath: null,
      modelsConfigReader,
      modelsStore,
      allowModelNetwork: false,
      refreshOnCreate: false,
      signal: input.signal,
    });
  const refreshProjectionRuntime = async (
    runtime: Awaited<ReturnType<typeof createProjectionRuntime>>,
  ) => {
    // ModelConfig deliberately retains path-rich parse/composition diagnostics.
    // The read projection cannot serialize those; fail this query with a fixed code.
    if (runtime.getError() !== undefined) {
      throw new Error("Haros model-services configuration is unavailable");
    }
    const refresh = await runtime.refresh({
      allowNetwork: false,
      signal: input.signal,
    });
    if (refresh.aborted) input.signal.throwIfAborted();
    if (runtime.getError() !== undefined) {
      throw new Error("Haros model-services availability is unavailable");
    }
    return refresh;
  };

  let runtime = input.preparedRuntime ?? (await createProjectionRuntime());
  // A prepared runtime has already been refreshed or credential-synchronized by
  // the mutation owner. Projection must stay read-only instead of starting a
  // second all-provider availability pass while that mutation is still open.
  let refresh = input.preparedRuntime
    ? { aborted: false, errors: new Map<string, Error>() }
    : await refreshProjectionRuntime(runtime);
  if (input.preparedRuntime && runtime.getError() !== undefined) {
    throw new Error("Haros model-services prepared runtime is unavailable");
  }
  let extensionProjectionState = input.preparedExtensionProjectionState;
  if (input.intent === "add_service" && !input.preparedRuntime) {
    let extensionServices: HarosExtensionServices | undefined;
    try {
      extensionServices = await loadIntentScopedExtensionServices({
        sdk,
        runtime,
        agentDir,
        signal: input.signal,
      });
      if (runtime.getError() !== undefined) {
        throw new Error("Extension model-service projection is unavailable");
      }
      const extensionResult = extensionServices.resourceLoader.getExtensions();
      extensionProjectionState =
        extensionResult.errors.length > 0 ||
        extensionServices.diagnostics.some((diagnostic) => diagnostic.type === "error")
          ? "partial"
          : "ready";
    } catch {
      input.signal.throwIfAborted();
      extensionProjectionState = "unavailable";
      // A failed extension may have registered providers before throwing. Rebuild the
      // passive projection so half-loaded code cannot become an authority for this response.
      runtime = await createProjectionRuntime();
      refresh = await refreshProjectionRuntime(runtime);
    } finally {
      retireIntentScopedExtensionServices(extensionServices);
    }
  }
  const modelConfigProviderIds = new Set(runtime.getModelConfigProviderIds());
  const registeredProviderIds = new Set(runtime.getRegisteredProviderIds());

  const availableCounts = new Map<string, number>();
  const availableModelKeys = new Set<string>();
  for (const model of runtime.getAvailableSnapshot()) {
    availableCounts.set(model.provider, (availableCounts.get(model.provider) ?? 0) + 1);
    availableModelKeys.add(`${model.provider}\u0000${model.id}`);
  }

  const modelsByServiceId = new Map<string, ReadonlyArray<OAModelServiceModel>>();
  const customConfigsByServiceId = new Map<string, HarosCustomModelServiceConfig>();

  const descriptors = runtime.getProviders().map<OAModelServiceDescriptor>((provider) => {
    const providerId = safeIdentifier(provider.id);
    if (!providerId) {
      throw new Error("Haros model-services provider identity is invalid");
    }
    const knownModelCount = runtime.getModels(provider.id).length;
    const projectedModels = runtime.getModels(provider.id).flatMap<OAModelServiceModel>((model) => {
      const modelId = safeModelId(model.id);
      if (!modelId) return [];
      return [
        {
          modelId,
          displayName: safeDisplayName(model.name, "Model"),
          available: availableModelKeys.has(`${provider.id}\u0000${model.id}`),
          reasoning: model.reasoning,
          input: model.input.filter(
            (kind): kind is "text" | "image" => kind === "text" || kind === "image",
          ),
          contextWindow: Number.isFinite(model.contextWindow)
            ? Math.max(0, Math.trunc(model.contextWindow))
            : 0,
          maxTokens: Number.isFinite(model.maxTokens)
            ? Math.max(0, Math.trunc(model.maxTokens))
            : 0,
        },
      ];
    });
    if (projectedModels.length > HARNESSOS_MODEL_SERVICE_MODELS_MAX_COUNT) {
      throw new Error("Haros model-service catalog is too large");
    }
    modelsByServiceId.set(providerId, projectedModels);
    const customConfig = projectCustomConfig(
      providerId,
      runtime.getModelConfigProvider(provider.id),
      runtime.getModelConfigProviderHeaderMetadata(provider.id),
    );
    if (customConfig) customConfigsByServiceId.set(providerId, customConfig);
    const credentialInfo = credentials.info(provider.id);
    const authStatus = runtime.getProviderAuthStatus(provider.id);
    const authEnvironmentVariables = environmentVariablesFromAuthStatus(authStatus);
    const authState = credentialInfo?.oauthAccessExpired
      ? ("refresh_required" as const)
      : authStatus.configured
        ? ("configured" as const)
        : ("setup_required" as const);
    const availableModelCount =
      authState === "refresh_required" ? 0 : (availableCounts.get(provider.id) ?? 0);
    const hasCatalogError = refresh.errors.has(provider.id);
    const origin = registeredProviderIds.has(provider.id)
      ? ("extension" as const)
      : modelConfigProviderIds.has(provider.id)
        ? ("models_json" as const)
        : ("builtin" as const);
    const authMethods: Array<OAModelServiceDescriptor["authMethods"][number]> = [];
    if (provider.auth.apiKey) {
      authMethods.push({
        type: "api_key",
        label: safeDisplayName(provider.auth.apiKey.name, "API key"),
        canLogin: provider.auth.apiKey.login !== undefined,
        subscription: false,
      });
    }
    if (provider.auth.oauth) {
      authMethods.push({
        type: "oauth",
        label: safeDisplayName(provider.auth.oauth.loginLabel ?? provider.auth.oauth.name, "OAuth"),
        canLogin: true,
        subscription: provider.auth.oauth.isSubscription === true,
      });
    }
    const catalogProjection = hasCatalogError
      ? ({
          catalogState: knownModelCount > 0 ? "stale" : "error",
          catalogErrorCode: "catalog_unavailable",
        } as const)
      : ({
          catalogState: knownModelCount > 0 ? "ready" : "empty",
          catalogErrorCode: null,
        } as const);
    return {
      serviceId: providerId,
      providerId,
      displayName: safeDisplayName(provider.name, providerId),
      origin,
      authMethods,
      authState,
      authSource: normalizeAuthSource(authStatus.source),
      ...(authEnvironmentVariables ? { authEnvironmentVariables } : {}),
      storedCredentialType: credentialInfo?.type ?? null,
      knownModelCount,
      availableModelCount,
      supportsNetworkRefresh: provider.refreshModels !== undefined,
      ...catalogProjection,
    };
  });
  const runtimeProviderIds = new Set(descriptors.map((service) => service.providerId));
  for (const providerId of credentials.providerIds()) {
    if (runtimeProviderIds.has(providerId)) continue;
    descriptors.push({
      serviceId: providerId,
      providerId,
      displayName: providerId,
      origin: "unknown",
      authMethods: [],
      authState: "unavailable",
      authSource: "stored",
      storedCredentialType: credentials.info(providerId)?.type ?? null,
      knownModelCount: 0,
      availableModelCount: 0,
      supportsNetworkRefresh: false,
      catalogState: "error",
      catalogErrorCode: "catalog_unavailable",
    });
  }
  const sorted = descriptors.sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "en"),
  );
  if (sorted.length > HARNESSOS_MODEL_SERVICES_MAX_COUNT) {
    throw new Error("Haros model-services projection is too large");
  }
  return {
    all: sorted,
    listed: sorted.filter(
      (service) =>
        service.authState === "configured" ||
        service.authState === "refresh_required" ||
        service.availableModelCount > 0 ||
        service.origin === "models_json" ||
        service.origin === "unknown",
    ),
    connectable: sorted.filter(
      (service) =>
        (service.origin === "builtin" || service.origin === "extension") &&
        service.authState === "setup_required" &&
        service.authMethods.some((method) => method.canLogin),
    ),
    modelsByServiceId,
    customConfigsByServiceId,
    ...(extensionProjectionState ? { extensionProjectionState } : {}),
  };
}

function unavailableListResult(): OAModelServicesListResult {
  return {
    state: "error",
    services: [],
    connectableServices: [],
    errorCode: "projection_unavailable",
  };
}

export function makeOAModelServicesLive(options: OAModelServicesLiveOptions = {}) {
  return Layer.effect(
    OAModelServices,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const engineService = yield* EngineService;
      const authRequests = new Map<string, ModelServiceAuthRequest>();
      const oauthLogoDataUrl = loadHarosOAuthLogoDataUrl(config.staticDir);
      let mutationTail: Promise<void> = Promise.resolve();
      const project = (signal: AbortSignal, intent?: OAModelServicesProjectionIntent) =>
        projectModelServices({
          serverBaseDir: config.baseDir,
          loadModule: options.loadModule ?? loadOARuntimeModule,
          ...(options.readTextFile ? { readTextFile: options.readTextFile } : {}),
          signal,
          ...(intent ? { intent } : {}),
        });

      const serializeMutation = <A>(operation: () => Promise<A>): Promise<A> => {
        const result = mutationTail.then(operation, operation);
        mutationTail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      };

      const createMutationRuntime = async (signal: AbortSignal) => {
        const agentDir = resolveOAAgentDir(config.baseDir);
        const sdk = await (options.loadModule ?? loadOARuntimeModule)();
        signal.throwIfAborted();
        const runtime = await sdk.ModelRuntime.create({
          authPath: path.join(agentDir, "auth.json"),
          modelsPath: null,
          modelsConfigReader: createOAModelsConfigReader(agentDir),
          modelsStorePath: path.join(agentDir, "models-store.json"),
          allowModelNetwork: false,
          signal,
        });
        return { agentDir, sdk, runtime };
      };

      const withMutationRuntimeForService = async <A>(
        serviceId: string,
        origin: "extension" | undefined,
        signal: AbortSignal,
        operation: (input: {
          readonly agentDir: string;
          readonly sdk: OARuntimeModule;
          readonly runtime: OAModelRuntime;
          readonly extensionLoaded: boolean;
        }) => Promise<A>,
      ): Promise<A> => {
        const mutationRuntime = await createMutationRuntime(signal);
        let extensionServices: HarosExtensionServices | undefined;
        try {
          if (origin === "extension") {
            extensionServices = await loadIntentScopedExtensionServices({
              sdk: mutationRuntime.sdk,
              runtime: mutationRuntime.runtime,
              agentDir: mutationRuntime.agentDir,
              signal,
            });
            if (!mutationRuntime.runtime.getRegisteredProviderIds().includes(serviceId)) {
              throw new Error("Extension model service is unavailable");
            }
          }
          signal.throwIfAborted();
          if (!mutationRuntime.runtime.getProvider(serviceId)) {
            throw new Error("Model service is unavailable");
          }
          return await operation({
            ...mutationRuntime,
            extensionLoaded: extensionServices !== undefined,
          });
        } finally {
          retireIntentScopedExtensionServices(extensionServices);
        }
      };

      const projectPreparedService = async (input: {
        readonly serviceId: string;
        readonly runtime: OAModelRuntime;
        readonly extensionLoaded: boolean;
        readonly signal: AbortSignal;
      }) => {
        const projection = await projectModelServices({
          serverBaseDir: config.baseDir,
          loadModule: options.loadModule ?? loadOARuntimeModule,
          ...(options.readTextFile ? { readTextFile: options.readTextFile } : {}),
          signal: input.signal,
          preparedRuntime: input.runtime,
          ...(input.extensionLoaded ? { preparedExtensionProjectionState: "ready" } : {}),
        });
        const service = projection.all.find((entry) => entry.serviceId === input.serviceId);
        if (!service) throw new Error("Model service is unavailable");
        return service;
      };

      const getProjectedService = async (serviceId: string, signal: AbortSignal) => {
        const projection = await project(signal);
        const service = projection.all.find((entry) => entry.serviceId === serviceId);
        if (!service) throw new Error("Model service is unavailable");
        return service;
      };

      const findProjectedService = async (serviceId: string, signal: AbortSignal) => {
        const projection = await project(signal);
        return projection.all.find((entry) => entry.serviceId === serviceId) ?? null;
      };

      const createCustomPreviewRuntime = async (input: {
        readonly serviceId: string | null;
        readonly credential: HarosCustomModelServiceCredentialInput;
        readonly signal: AbortSignal;
      }) => {
        if (input.serviceId === null && input.credential.type === "preserve") {
          throw new Error("A new custom model service requires a credential source");
        }
        if (input.serviceId !== null) {
          const current = await findProjectedService(input.serviceId, input.signal);
          if (current?.origin !== "models_json") {
            throw new InvalidCustomServiceEditError();
          }
        }
        const sdk = await (options.loadModule ?? loadOARuntimeModule)();
        input.signal.throwIfAborted();
        const agentDir = resolveOAAgentDir(config.baseDir);
        const providerId = input.serviceId ?? "harnessos-custom-preview";
        const credentials: CredentialStore =
          input.credential.type === "preserve"
            ? await StaticCredentialStore.create({
                authPath: path.join(agentDir, "auth.json"),
                readTextFile: (filePath, readSignal) =>
                  readOAPrivateTextFile({
                    agentDir,
                    filename: path.basename(filePath) as OAPrivateRuntimeFilename,
                    ...(readSignal ? { signal: readSignal } : {}),
                  }),
                signal: input.signal,
              })
            : new InMemoryCredentialStore();
        if (input.credential.type === "stored_key") {
          const apiKey = input.credential.apiKey;
          await credentials.modify(providerId, async () => ({ type: "api_key", key: apiKey }), {
            signal: input.signal,
          });
        }
        const runtime = await sdk.ModelRuntime.create({
          credentials,
          modelsPath: null,
          ...(input.serviceId === null
            ? {}
            : {
                modelsConfigReader: createOAModelsConfigReader(agentDir),
              }),
          allowModelNetwork: false,
          refreshOnCreate: false,
          signal: input.signal,
        });
        return {
          sdk,
          runtime,
          providerId,
          credentialReference: credentialReferenceMutation(input.credential),
        };
      };

      const notifyRequest = (request: ModelServiceAuthRequest) => {
        for (const checkpoint of request.checkpoints) checkpoint();
        request.checkpoints.clear();
      };

      const awaitRequestResult = async (
        request: ModelServiceAuthRequest,
        afterEventCount = 0,
        afterPromptId?: string,
        signal?: AbortSignal,
      ): Promise<OAModelServiceAuthResult> => {
        const hasUpdate = () =>
          request.outcome !== undefined ||
          request.events.length > afterEventCount ||
          (request.pendingPrompt?.prompt.promptId ?? null) !== (afterPromptId ?? null);
        while (!hasUpdate()) {
          await new Promise<void>((resolve, reject) => {
            const cleanup = () => {
              request.checkpoints.delete(checkpoint);
              signal?.removeEventListener("abort", onAbort);
            };
            const checkpoint = () => {
              cleanup();
              resolve();
            };
            const onAbort = () => {
              cleanup();
              reject(new DOMException("Authentication polling cancelled", "AbortError"));
            };
            request.checkpoints.add(checkpoint);
            if (signal?.aborted) onAbort();
            else signal?.addEventListener("abort", onAbort, { once: true });
            if (hasUpdate()) checkpoint();
          });
        }
        if (request.outcome) return request.outcome;
        if (!request.pendingPrompt) {
          return {
            state: "pending",
            requestId: request.requestId,
            events: [...request.events],
          };
        }
        return {
          state: "prompt",
          requestId: request.requestId,
          prompt: request.pendingPrompt!.prompt,
          events: [...request.events],
        };
      };

      const finishRequest = (
        request: ModelServiceAuthRequest,
        outcome: OAModelServiceAuthResult,
      ) => {
        request.connectionSignal.removeEventListener("abort", request.abortOnConnectionClose);
        request.outcome = outcome;
        delete request.pendingPrompt;
        if (request.timeout) clearTimeout(request.timeout);
        notifyRequest(request);
        setTimeout(() => {
          if (authRequests.get(request.requestId)?.outcome === outcome) {
            authRequests.delete(request.requestId);
          }
        }, 30_000).unref();
      };

      const runLogin = async (request: ModelServiceAuthRequest) => {
        await serializeMutation(async () => {
          let authenticationUpdated = false;
          let previousService: OAModelServiceDescriptor | undefined;
          try {
            await withMutationRuntimeForService(
              request.serviceId,
              request.origin ?? undefined,
              request.controller.signal,
              async ({ agentDir, sdk, runtime, extensionLoaded }) => {
                const provider = runtime.getProvider(request.serviceId);
                const isConnectableProvider =
                  runtime.getRegisteredProviderIds().includes(request.serviceId) ||
                  !runtime.getModelConfigProviderIds().includes(request.serviceId);
                const supportsRequestedAuth =
                  request.authType === "api_key"
                    ? provider?.auth.apiKey?.login !== undefined
                    : provider?.auth.oauth?.login !== undefined;
                if (!provider || !isConnectableProvider || !supportsRequestedAuth) {
                  throw new Error("Model service does not support the requested login method");
                }
                previousService = await projectPreparedService({
                  serviceId: request.serviceId,
                  runtime,
                  extensionLoaded,
                  signal: request.controller.signal,
                });
                const interaction: AuthInteraction = {
                  signal: request.controller.signal,
                  renderOAuthPage: createHarosOAuthPageRenderer({
                    serviceName: safeDisplayName(provider.name, request.serviceId),
                    logoDataUrl: oauthLogoDataUrl,
                  }),
                  prompt: async (prompt) => {
                    request.controller.signal.throwIfAborted();
                    if (
                      request.authType === "oauth" &&
                      request.oauthPromptMode === "provider_default" &&
                      !request.providerDefaultPromptConsumed &&
                      prompt.type === "select"
                    ) {
                      const providerDefault = prompt.options[0];
                      if (!providerDefault) {
                        throw new Error("Authentication choices are unavailable");
                      }
                      // Pi's own interactive selector starts on the first provider-owned option.
                      // Reuse that ordering instead of teaching the Host provider-specific choices.
                      request.providerDefaultPromptConsumed = true;
                      return providerDefault.id;
                    }
                    const projected = projectAuthPrompt(prompt);
                    return new Promise<string>((resolve, reject) => {
                      const onAbort = () =>
                        reject(new DOMException("Authentication cancelled", "AbortError"));
                      request.controller.signal.addEventListener("abort", onAbort, { once: true });
                      prompt.signal?.addEventListener("abort", onAbort, {
                        once: true,
                      });
                      request.pendingPrompt = {
                        prompt: projected,
                        resolve: (value) => {
                          request.controller.signal.removeEventListener("abort", onAbort);
                          prompt.signal?.removeEventListener("abort", onAbort);
                          resolve(value);
                        },
                        reject,
                      };
                      notifyRequest(request);
                    });
                  },
                  notify: (event) => {
                    const projected = projectAuthEvent(event);
                    if (projected && request.events.length < 64) {
                      request.events.push(projected);
                      notifyRequest(request);
                    }
                  },
                };
                let synchronizationFailed = false;
                try {
                  await runtime.login(request.serviceId, request.authType, interaction);
                } catch (error) {
                  if (!(error instanceof sdk.CredentialSynchronizationError)) throw error;
                  synchronizationFailed = true;
                }
                authenticationUpdated = true;
                publishOAModelRuntimeMutation(agentDir);
                const service = await projectPreparedService({
                  serviceId: request.serviceId,
                  runtime,
                  extensionLoaded,
                  signal: new AbortController().signal,
                });
                if (synchronizationFailed) {
                  finishRequest(request, {
                    state: "auth_updated_sync_failed",
                    requestId: request.requestId,
                    service,
                    events: [...request.events],
                  });
                  return;
                }
                // Login owns credential completion only. The Web immediately presents this
                // result, then invokes the existing provider-scoped refresh mutation as a
                // separate observable operation for dynamic catalogs.
                finishRequest(request, {
                  state: "complete",
                  requestId: request.requestId,
                  service,
                  events: [...request.events],
                });
              },
            );
          } catch {
            if (authenticationUpdated && previousService) {
              finishRequest(request, {
                state: "auth_updated_sync_failed",
                requestId: request.requestId,
                service: previousService,
                events: [...request.events],
              });
              return;
            }
            const cancelled = request.controller.signal.aborted && !request.deadlineExpired;
            finishRequest(request, {
              state: cancelled ? "cancelled" : "failed",
              requestId: request.requestId,
              errorCode: cancelled
                ? "cancelled"
                : request.deadlineExpired
                  ? "request_expired"
                  : "auth_failed",
              events: [...request.events],
            });
          }
        });
      };

      return {
        list: (input = {}) =>
          Effect.promise(async (signal) => {
            try {
              const projection = await project(signal, input.intent);
              const first = projection.listed[0];
              return first
                ? ({
                    state: "ready",
                    services: [first, ...projection.listed.slice(1)],
                    connectableServices: projection.connectable,
                    customApiConfiguration: { protocols: CUSTOM_API_PROTOCOLS },
                    ...(projection.extensionProjectionState
                      ? {
                          extensionProjectionState: projection.extensionProjectionState,
                        }
                      : {}),
                    errorCode: null,
                  } satisfies OAModelServicesListResult)
                : ({
                    state: "empty",
                    services: [],
                    connectableServices: projection.connectable,
                    customApiConfiguration: { protocols: CUSTOM_API_PROTOCOLS },
                    ...(projection.extensionProjectionState
                      ? {
                          extensionProjectionState: projection.extensionProjectionState,
                        }
                      : {}),
                    errorCode: null,
                  } satisfies OAModelServicesListResult);
            } catch {
              signal.throwIfAborted();
              return unavailableListResult();
            }
          }),
        get: (input) =>
          Effect.promise(async (signal) => {
            try {
              const projection = await project(signal, input.intent);
              const service = projection.all.find((entry) => entry.serviceId === input.serviceId);
              return service
                ? ({
                    state: "ready",
                    service,
                    models: projection.modelsByServiceId.get(service.serviceId) ?? [],
                    ...(projection.customConfigsByServiceId.get(service.serviceId)
                      ? {
                          customConfig: projection.customConfigsByServiceId.get(service.serviceId)!,
                        }
                      : {}),
                    ...(projection.extensionProjectionState
                      ? {
                          extensionProjectionState: projection.extensionProjectionState,
                        }
                      : {}),
                    errorCode: null,
                  } as const)
                : ({
                    state: "empty",
                    service: null,
                    ...(projection.extensionProjectionState
                      ? {
                          extensionProjectionState: projection.extensionProjectionState,
                        }
                      : {}),
                    errorCode: null,
                  } as const);
            } catch {
              signal.throwIfAborted();
              return {
                state: "error",
                service: null,
                errorCode: "projection_unavailable",
              } as const;
            }
          }),
        beginLogin: (clientId, input) =>
          Effect.gen(function* () {
            const connectionSignal = yield* CurrentWsConnectionSignal;
            return yield* Effect.promise(async (signal) => {
              const requestId = crypto.randomUUID();
              if (authRequests.size >= MAX_PENDING_AUTH_REQUESTS) {
                return {
                  state: "failed",
                  requestId,
                  errorCode: "request_expired",
                  events: [],
                } as const;
              }
              const controller = new AbortController();
              signal.addEventListener("abort", () => controller.abort(), {
                once: true,
              });
              const abortOnConnectionClose = () => controller.abort();
              if (connectionSignal.aborted) abortOnConnectionClose();
              else
                connectionSignal.addEventListener("abort", abortOnConnectionClose, {
                  once: true,
                });
              const request: ModelServiceAuthRequest = {
                requestId,
                clientId,
                serviceId: input.serviceId,
                authType: input.authType,
                origin: input.origin ?? null,
                oauthPromptMode:
                  input.authType === "oauth" ? (input.promptMode ?? "interactive") : null,
                controller,
                connectionSignal,
                abortOnConnectionClose,
                events: [],
                providerDefaultPromptConsumed: false,
                deadlineExpired: false,
                checkpoints: new Set(),
              };
              request.timeout = setTimeout(() => {
                request.deadlineExpired = true;
                controller.abort();
              }, options.authRequestTimeoutMs ?? AUTH_REQUEST_TIMEOUT_MS);
              authRequests.set(requestId, request);
              void runLogin(request);
              const result = await awaitRequestResult(request);
              if (result.state !== "prompt" && result.state !== "pending") {
                authRequests.delete(request.requestId);
              }
              return result;
            });
          }),
        pollLogin: (clientId, input) =>
          Effect.promise(async (signal) => {
            const request = authRequests.get(input.requestId);
            if (!request || request.clientId !== clientId) {
              return {
                state: "failed",
                requestId: input.requestId,
                errorCode: "request_expired",
                events: [],
              } as const;
            }
            const result = await awaitRequestResult(
              request,
              input.afterEventCount,
              input.afterPromptId,
              signal,
            );
            if (result.state !== "prompt" && result.state !== "pending") {
              authRequests.delete(request.requestId);
            }
            return result;
          }),
        answerLogin: (clientId, input) =>
          Effect.promise(async (signal) => {
            const request = authRequests.get(input.requestId);
            if (!request || request.clientId !== clientId) {
              return {
                state: "failed",
                requestId: input.requestId,
                errorCode: "request_expired",
                events: [],
              } as const;
            }
            signal.addEventListener("abort", () => request.controller.abort(), {
              once: true,
            });
            const pending = request.pendingPrompt;
            if (!pending || pending.prompt.promptId !== input.promptId) {
              return {
                state: "failed",
                requestId: input.requestId,
                errorCode: "request_expired",
                events: [...request.events],
              } as const;
            }
            delete request.pendingPrompt;
            pending.resolve(input.value);
            const result = await awaitRequestResult(request);
            if (result.state !== "prompt" && result.state !== "pending") {
              authRequests.delete(request.requestId);
            }
            return result;
          }),
        cancelLogin: (clientId, input) =>
          Effect.promise(async () => {
            const request = authRequests.get(input.requestId);
            if (!request || request.clientId !== clientId) {
              return {
                state: "failed",
                requestId: input.requestId,
                errorCode: "request_expired",
                events: [],
              } as const;
            }
            delete request.pendingPrompt;
            request.controller.abort();
            const result = await awaitRequestResult(request, Number.MAX_SAFE_INTEGER);
            authRequests.delete(request.requestId);
            return result;
          }),
        logout: (input) =>
          Effect.promise((signal) =>
            serializeMutation(() =>
              withMutationRuntimeForService(
                input.serviceId,
                input.origin,
                signal,
                async ({ agentDir, sdk, runtime, extensionLoaded }) => {
                  const previous = await projectPreparedService({
                    serviceId: input.serviceId,
                    runtime,
                    extensionLoaded,
                    signal,
                  });
                  let synchronizationFailed = false;
                  try {
                    await runtime.logout(input.serviceId, { signal });
                  } catch (error) {
                    if (!(error instanceof sdk.CredentialSynchronizationError)) throw error;
                    synchronizationFailed = true;
                  }
                  publishOAModelRuntimeMutation(agentDir);
                  let service = previous;
                  try {
                    service = await projectPreparedService({
                      serviceId: input.serviceId,
                      runtime,
                      extensionLoaded,
                      signal: new AbortController().signal,
                    });
                  } catch {
                    synchronizationFailed = true;
                  }
                  return {
                    state: synchronizationFailed ? "credential_updated_sync_failed" : "complete",
                    service,
                  } as const;
                },
              ),
            ),
          ),
        revealApiKey: (input) =>
          Effect.promise((signal) =>
            serializeMutation(async () => {
              const agentDir = resolveOAAgentDir(config.baseDir);
              let credential: Credential | undefined;
              try {
                const credentials = await StaticCredentialStore.create({
                  authPath: path.join(agentDir, "auth.json"),
                  readTextFile: (filePath, readSignal) =>
                    options.readTextFile
                      ? options.readTextFile(filePath, readSignal)
                      : readOAPrivateTextFile({
                          agentDir,
                          filename: path.basename(filePath) as OAPrivateRuntimeFilename,
                          ...(readSignal ? { signal: readSignal } : {}),
                        }),
                  signal,
                });
                credential = await credentials.read(input.serviceId, {
                  signal,
                });
              } catch {
                signal.throwIfAborted();
                return {
                  state: "unavailable",
                  reason: "credential_unavailable",
                } as const;
              }
              if (
                credential?.type !== "api_key" ||
                typeof credential.key !== "string" ||
                credential.key.length === 0 ||
                credential.key.length > MAX_REVEALED_API_KEY_LENGTH
              ) {
                return {
                  state: "unavailable",
                  reason: "not_stored_api_key",
                } as const;
              }
              return { state: "ready", apiKey: credential.key } as const;
            }),
          ),
        refresh: (input) =>
          Effect.promise((requestSignal) => {
            const timeoutSignal = AbortSignal.timeout(
              options.modelServiceRefreshTimeoutMs ?? MODEL_SERVICE_REFRESH_TIMEOUT_MS,
            );
            const signal = AbortSignal.any([requestSignal, timeoutSignal]);
            return serializeMutation(() =>
              withMutationRuntimeForService(
                input.serviceId,
                input.origin,
                signal,
                async ({ agentDir, runtime, extensionLoaded }) => {
                  const previous = await projectPreparedService({
                    serviceId: input.serviceId,
                    runtime,
                    extensionLoaded,
                    signal,
                  });
                  if (!runtime.getProvider(input.serviceId)?.refreshModels) {
                    return { state: "unsupported", service: previous } as const;
                  }
                  const refreshed = await runtime.refresh({
                    providers: [input.serviceId],
                    allowNetwork: true,
                    force: true,
                    signal,
                  });
                  if (refreshed.aborted) {
                    return {
                      state: requestSignal.aborted ? "cancelled" : "failed",
                      service: previous,
                    } as const;
                  }
                  if (refreshed.errors.has(input.serviceId)) {
                    return { state: "failed", service: previous } as const;
                  }
                  publishOAModelRuntimeMutation(agentDir);
                  return {
                    state: "success",
                    service: await projectPreparedService({
                      serviceId: input.serviceId,
                      runtime,
                      extensionLoaded,
                      signal,
                    }),
                  } as const;
                },
              ),
            );
          }),
        discoverCustom: (input) =>
          Effect.promise(async (requestSignal) => {
            if (input.config.serviceId === null && input.credential.type === "preserve") {
              return {
                state: "failed",
                models: [],
                errorCode: "authentication_failed",
              } satisfies HarosCustomModelServiceDiscoverResult;
            }
            const timeoutSignal = AbortSignal.timeout(
              options.customModelDiscoveryTimeoutMs ?? CUSTOM_MODEL_DISCOVERY_TIMEOUT_MS,
            );
            const signal = AbortSignal.any([requestSignal, timeoutSignal]);
            let sdk: OARuntimeModule | undefined;
            try {
              const preview = await createCustomPreviewRuntime({
                serviceId: input.config.serviceId,
                credential: input.credential,
                signal,
              });
              sdk = preview.sdk;
              let previewConfig: ReturnType<typeof customProviderDiscoveryConfig>;
              try {
                previewConfig = customProviderDiscoveryConfig(input.config);
              } catch {
                return {
                  state: "failed",
                  models: [],
                  errorCode: "invalid_configuration",
                } satisfies HarosCustomModelServiceDiscoverResult;
              }
              preview.runtime.registerModelConfigProviderPreview(
                preview.providerId,
                previewConfig,
                preview.credentialReference,
                headerReferencesForMutation(input.config),
              );
              const discovered = await preview.runtime.discoverModelConfigProviderModels(
                preview.providerId,
                { signal },
              );
              const models = discovered
                .flatMap(({ id, name }) => {
                  const modelId = safeModelId(id);
                  if (!modelId) return [];
                  return [{ modelId, displayName: safeDisplayName(name, modelId) }];
                })
                .slice(0, HARNESSOS_CUSTOM_MODEL_SERVICE_MODELS_MAX_COUNT);
              if (models.length === 0) {
                return {
                  state: "failed",
                  models: [],
                  errorCode: "catalog_unavailable",
                } satisfies HarosCustomModelServiceDiscoverResult;
              }
              return {
                state: "success",
                models,
                errorCode: null,
              } satisfies HarosCustomModelServiceDiscoverResult;
            } catch (error) {
              if (requestSignal.aborted) {
                return {
                  state: "cancelled",
                  models: [],
                  errorCode: "cancelled",
                } satisfies HarosCustomModelServiceDiscoverResult;
              }
              if (sdk && error instanceof sdk.ModelConfigProviderDiscoveryError) {
                return {
                  state: "failed",
                  models: [],
                  errorCode: error.code === "request_failed" ? "connection_failed" : error.code,
                } satisfies HarosCustomModelServiceDiscoverResult;
              }
              if (error instanceof InvalidCustomServiceEditError) {
                return {
                  state: "failed",
                  models: [],
                  errorCode: "invalid_configuration",
                } satisfies HarosCustomModelServiceDiscoverResult;
              }
              return {
                state: "failed",
                models: [],
                errorCode: "connection_failed",
              } satisfies HarosCustomModelServiceDiscoverResult;
            }
          }),
        testCustom: (input) =>
          Effect.promise(async (requestSignal) => {
            const timeoutSignal = AbortSignal.timeout(
              options.customConnectionTestTimeoutMs ?? CUSTOM_CONNECTION_TEST_TIMEOUT_MS,
            );
            const signal = AbortSignal.any([requestSignal, timeoutSignal]);
            try {
              if (input.config.serviceId === null && input.credential.type === "preserve") {
                return {
                  state: "failed",
                  models: [],
                  errorCode: "authentication_failed",
                } satisfies HarosCustomModelServiceTestResult;
              }
              const preview = await createCustomPreviewRuntime({
                serviceId: input.config.serviceId,
                credential: input.credential,
                signal,
              });
              preview.runtime.registerModelConfigProviderPreview(
                preview.providerId,
                customProviderConfig(input.config),
                preview.credentialReference,
                headerReferencesForMutation(input.config),
              );
              const model = preview.runtime.getModel(preview.providerId, input.testModelId);
              if (!model) {
                return {
                  state: "failed",
                  models: [],
                  errorCode: "model_unavailable",
                } satisfies HarosCustomModelServiceTestResult;
              }
              const response = await preview.runtime.complete(
                model,
                {
                  messages: [
                    {
                      role: "user",
                      content: CUSTOM_CONNECTION_TEST_PROMPT,
                      timestamp: Date.now(),
                    },
                  ],
                },
                { signal, maxTokens: 8 },
              );
              if (response.stopReason === "error" || response.stopReason === "aborted") {
                return {
                  state: requestSignal.aborted ? "cancelled" : "failed",
                  models: [],
                  errorCode: requestSignal.aborted ? "cancelled" : "connection_failed",
                } satisfies HarosCustomModelServiceTestResult;
              }
              const testedModels = input.config.models.flatMap<OAModelServiceModel>(
                ({ modelId }) => {
                  const configuredModel = preview.runtime.getModel(preview.providerId, modelId);
                  if (!configuredModel) return [];
                  return [
                    {
                      modelId: configuredModel.id,
                      displayName: safeDisplayName(configuredModel.name, configuredModel.id),
                      available: true,
                      reasoning: configuredModel.reasoning,
                      input: configuredModel.input.filter(
                        (kind): kind is "text" | "image" => kind === "text" || kind === "image",
                      ),
                      contextWindow: Math.max(0, Math.trunc(configuredModel.contextWindow)),
                      maxTokens: Math.max(0, Math.trunc(configuredModel.maxTokens)),
                    },
                  ];
                },
              );
              return {
                state: "success",
                models: testedModels,
                errorCode: null,
              } satisfies HarosCustomModelServiceTestResult;
            } catch (error) {
              if (requestSignal.aborted) {
                return {
                  state: "cancelled",
                  models: [],
                  errorCode: "cancelled",
                } satisfies HarosCustomModelServiceTestResult;
              }
              if (error instanceof InvalidCustomServiceEditError) {
                return {
                  state: "failed",
                  models: [],
                  errorCode: "invalid_configuration",
                } satisfies HarosCustomModelServiceTestResult;
              }
              return {
                state: "failed",
                models: [],
                errorCode: "connection_failed",
              } satisfies HarosCustomModelServiceTestResult;
            }
          }),
        saveCustom: (input) =>
          Effect.promise((signal) =>
            serializeMutation(async () => {
              const serviceId = input.config.serviceId ?? crypto.randomUUID();
              if (input.config.serviceId === null && input.credential.type === "preserve") {
                throw new Error("A new custom model service requires a credential source");
              }
              const agentDir = resolveOAAgentDir(config.baseDir);
              const sdk = await (options.loadModule ?? loadOARuntimeModule)();
              signal.throwIfAborted();
              const previous =
                input.config.serviceId === null
                  ? null
                  : await findProjectedService(serviceId, signal);
              if (previous && previous.origin !== "models_json") {
                throw new Error("Only a models.json model service can be edited");
              }
              const configForMutation = previous
                ? clearOmittedCompatAfterApiChange(
                    input.config,
                    (await createMutationRuntime(signal)).runtime.getModelConfigProvider(serviceId),
                  )
                : input.config;
              let removedStoredCredential = false;
              let credentialSynchronizationWarning = false;
              if (
                previous &&
                (input.credential.type === "environment" || input.credential.type === "command") &&
                previous.storedCredentialType !== null
              ) {
                try {
                  const { runtime } = await createMutationRuntime(signal);
                  await runtime.logout(serviceId, { signal });
                  removedStoredCredential = true;
                } catch (error) {
                  if (error instanceof sdk.CredentialSynchronizationError) {
                    // Pi removes the durable credential before attempting its
                    // process-local refresh. Continue toward the requested
                    // config reference, while preserving the warning.
                    removedStoredCredential = true;
                    credentialSynchronizationWarning = true;
                  } else {
                    publishOAModelRuntimeMutation(agentDir);
                    return {
                      state: "credential_unchanged",
                      service: previous,
                    } satisfies HarosCustomModelServiceSaveResult;
                  }
                }
                if (removedStoredCredential) {
                  publishOAModelRuntimeMutation(agentDir);
                }
              }
              const credentialReference = credentialReferenceMutation(input.credential);
              let mutation: Awaited<ReturnType<typeof sdk.mutateModelConfigProvider>>;
              try {
                mutation = await sdk.mutateModelConfigProvider(
                  path.join(agentDir, "models.json"),
                  {
                    type: "upsert",
                    providerId: serviceId,
                    provider: customProviderConfig(configForMutation),
                    ...(credentialReference ? { credentialReference } : {}),
                    headerReferences: headerReferencesForMutation(input.config),
                  },
                  { signal },
                );
              } catch (error) {
                if (previous && input.credential.type !== "preserve") {
                  publishOAModelRuntimeMutation(agentDir);
                  let service = previous;
                  try {
                    service = await getProjectedService(serviceId, new AbortController().signal);
                  } catch {
                    // Keep the last safe descriptor when reprojection itself
                    // is unavailable; the editor remains open for retry.
                  }
                  return {
                    state: removedStoredCredential
                      ? "credential_removed_retry_required"
                      : "credential_unchanged",
                    service,
                  } satisfies HarosCustomModelServiceSaveResult;
                }
                throw error;
              }
              if (!mutation.providerIds.includes(serviceId)) {
                throw new Error("Custom model service was not accepted by Pi ModelConfig");
              }
              publishOAModelRuntimeMutation(agentDir);
              let authFailed = false;
              let synchronizationFailed = false;
              if (input.credential.type === "stored_key") {
                const apiKey = input.credential.apiKey;
                try {
                  const { runtime } = await createMutationRuntime(signal);
                  await runtime.login(serviceId, "api_key", {
                    signal,
                    prompt: async () => apiKey,
                    notify: () => undefined,
                  });
                } catch (error) {
                  if (error instanceof sdk.CredentialSynchronizationError)
                    synchronizationFailed = true;
                  else authFailed = true;
                }
              }
              publishOAModelRuntimeMutation(agentDir);
              let service: OAModelServiceDescriptor | null = null;
              try {
                service = await getProjectedService(serviceId, new AbortController().signal);
              } catch {
                synchronizationFailed = true;
              }
              if (!service && !authFailed && !synchronizationFailed) {
                throw new Error("Saved custom model service could not be projected");
              }
              if (authFailed) {
                return {
                  state: "config_saved_auth_failed",
                  service,
                } satisfies HarosCustomModelServiceSaveResult;
              }
              if (synchronizationFailed) {
                return {
                  state: "config_saved_sync_failed",
                  service,
                } satisfies HarosCustomModelServiceSaveResult;
              }
              if (!service) throw new Error("Saved custom model service could not be projected");
              if (credentialSynchronizationWarning) {
                return {
                  state: "complete_with_sync_warning",
                  service,
                } satisfies HarosCustomModelServiceSaveResult;
              }
              return {
                state: "complete",
                service,
              } satisfies HarosCustomModelServiceSaveResult;
            }),
          ),
        removeCustom: (input) =>
          engineService.withModelServiceMutationFence(
            input.serviceId,
            Effect.promise((signal) =>
              serializeMutation(async () => {
                const sessions = await Effect.runPromise(engineService.listSessionsStrict());
                const modelPrefix = `${input.serviceId}/`;
                const ownsLiveSession = sessions.some(
                  (session) =>
                    session.engine === "oa" &&
                    session.model?.startsWith(modelPrefix) === true &&
                    (session.status === "connecting" ||
                      session.status === "ready" ||
                      session.status === "running" ||
                      session.activeTurnId !== undefined),
                );
                if (ownsLiveSession) {
                  return {
                    state: "blocked_active_operation",
                    serviceId: input.serviceId,
                  } satisfies HarosCustomModelServiceRemoveResult;
                }
                const previous = await getProjectedService(input.serviceId, signal);
                if (previous.origin !== "models_json") {
                  throw new Error("Only a models.json model service can be removed");
                }
                const agentDir = resolveOAAgentDir(config.baseDir);
                const sdk = await (options.loadModule ?? loadOARuntimeModule)();
                const { runtime } = await createMutationRuntime(signal);
                let synchronizationFailed = false;
                try {
                  await runtime.logout(input.serviceId, { signal });
                } catch (error) {
                  if (!(error instanceof sdk.CredentialSynchronizationError)) throw error;
                  // Pi deletes the credential before it refreshes the in-memory
                  // provider projection. A synchronization error therefore still
                  // proves that the durable credential was removed; every other
                  // failure leaves models.json intact so the service remains
                  // visible and the cleanup can be retried.
                  synchronizationFailed = true;
                }
                publishOAModelRuntimeMutation(agentDir);
                const mutation = await sdk.mutateModelConfigProvider(
                  path.join(agentDir, "models.json"),
                  { type: "remove", providerId: input.serviceId },
                  { signal },
                );
                if (mutation.providerIds.includes(input.serviceId)) {
                  throw new Error(
                    "Custom model service removal was not accepted by Pi ModelConfig",
                  );
                }
                publishOAModelRuntimeMutation(agentDir);
                return {
                  state: synchronizationFailed ? "complete_with_sync_warning" : "complete",
                  serviceId: input.serviceId,
                } satisfies HarosCustomModelServiceRemoveResult;
              }),
            ),
          ),
      } satisfies OAModelServicesShape;
    }),
  );
}

export const OAModelServicesLive = makeOAModelServicesLive();

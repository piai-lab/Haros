// FILE: OmniMindModelServices.ts
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
import type {
  OmniMindModelServiceAuthEvent,
  OmniMindModelServiceAuthPrompt,
  OmniMindModelServiceAuthResult,
  OmniMindModelServiceAuthMethodType,
  OmniMindModelServiceOAuthPromptMode,
  OmniMindModelServiceAuthSource,
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import { OMNIMIND_MODEL_SERVICES_MAX_COUNT } from "@omnimind/contracts";
import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import { CurrentWsConnectionSignal } from "../../wsConnectionSessions.ts";
import {
  createOmniMindModelsConfigReader,
  loadOmniMindCodingAgentModule,
  readOmniMindPrivateTextFile,
  resolveOmniMindAgentDir,
  type OmniMindCodingAgentModule,
  type OmniMindPrivateRuntimeFilename,
} from "../omnimindAgentRuntime.ts";
import { publishOmniMindModelRuntimeMutation } from "../omnimindModelRuntimeMutation.ts";
import {
  OmniMindModelServices,
  type OmniMindModelServicesShape,
} from "../Services/OmniMindModelServices.ts";

const MAX_SAFE_LABEL_LENGTH = 256;
const MAX_AUTH_INTERACTION_TEXT_LENGTH = 4_096;
const AUTH_REQUEST_TIMEOUT_MS = 5 * 60 * 1_000;
const MAX_PENDING_AUTH_REQUESTS = 32;

type ReadTextFile = (filePath: string, signal?: AbortSignal) => Promise<string>;

export interface OmniMindModelServicesLiveOptions {
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
  readonly readTextFile?: ReadTextFile;
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

function projectAuthPrompt(prompt: AuthPrompt): OmniMindModelServiceAuthPrompt {
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
      ? { placeholder: safeInteractionText(prompt.placeholder, "Authentication input") }
      : {}),
  };
}

function projectAuthEvent(event: AuthEvent): OmniMindModelServiceAuthEvent | null {
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
            ? { instructions: safeInteractionText(event.instructions, "Continue authentication") }
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
          : { intervalSeconds: Math.max(0, Math.trunc(event.intervalSeconds)) }),
        ...(event.expiresInSeconds === undefined
          ? {}
          : { expiresInSeconds: Math.max(0, Math.trunc(event.expiresInSeconds)) }),
      }
    : null;
}

interface PendingAuthPrompt {
  readonly prompt: OmniMindModelServiceAuthPrompt;
  readonly resolve: (value: string) => void;
  readonly reject: (error: Error) => void;
}

interface ModelServiceAuthRequest {
  readonly requestId: string;
  readonly clientId: number;
  readonly serviceId: string;
  readonly authType: OmniMindModelServiceAuthMethodType;
  readonly oauthPromptMode: OmniMindModelServiceOAuthPromptMode | null;
  readonly controller: AbortController;
  readonly connectionSignal: AbortSignal;
  readonly abortOnConnectionClose: () => void;
  readonly events: OmniMindModelServiceAuthEvent[];
  providerDefaultPromptConsumed: boolean;
  pendingPrompt?: PendingAuthPrompt;
  outcome?: OmniMindModelServiceAuthResult;
  readonly checkpoints: Set<() => void>;
  readonly timeout: ReturnType<typeof setTimeout>;
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
    if (rawCredentials.length > OMNIMIND_MODEL_SERVICES_MAX_COUNT) {
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
    readonly type: OmniMindModelServiceAuthMethodType;
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

function normalizeAuthSource(source: string | undefined): OmniMindModelServiceAuthSource | null {
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

async function projectModelServices(input: {
  readonly serverBaseDir: string;
  readonly loadModule: () => Promise<OmniMindCodingAgentModule>;
  readonly readTextFile?: ReadTextFile;
  readonly signal: AbortSignal;
}): Promise<{
  readonly all: ReadonlyArray<OmniMindModelServiceDescriptor>;
  readonly listed: ReadonlyArray<OmniMindModelServiceDescriptor>;
  readonly connectable: ReadonlyArray<OmniMindModelServiceDescriptor>;
}> {
  input.signal.throwIfAborted();
  const sdk = await input.loadModule();
  input.signal.throwIfAborted();
  const agentDir = resolveOmniMindAgentDir(input.serverBaseDir);
  const readTextFile =
    input.readTextFile ??
    ((filePath, signal) => {
      if (path.dirname(filePath) !== agentDir) {
        throw new Error("Model-services read escaped the private agent directory");
      }
      const filename = path.basename(filePath) as OmniMindPrivateRuntimeFilename;
      if (!(["auth.json", "models.json", "models-store.json"] as const).includes(filename)) {
        throw new Error("Model-services requested an unknown private runtime file");
      }
      return readOmniMindPrivateTextFile({
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
    : createOmniMindModelsConfigReader(agentDir);
  const credentials = await StaticCredentialStore.create({
    authPath,
    readTextFile,
    signal: input.signal,
  });
  const modelsStore = new StaticModelsStore(path.join(agentDir, "models-store.json"), readTextFile);
  const runtime = await sdk.ModelRuntime.create({
    credentials,
    modelsPath: null,
    modelsConfigReader,
    modelsStore,
    allowModelNetwork: false,
    refreshOnCreate: false,
    signal: input.signal,
  });
  // ModelConfig deliberately retains path-rich parse/composition diagnostics.
  // The read projection cannot serialize those; fail this query with a fixed code.
  if (runtime.getError() !== undefined) {
    throw new Error("OmniMind model-services configuration is unavailable");
  }
  const refresh = await runtime.refresh({ allowNetwork: false, signal: input.signal });
  if (refresh.aborted) input.signal.throwIfAborted();
  if (runtime.getError() !== undefined) {
    throw new Error("OmniMind model-services availability is unavailable");
  }
  const modelConfigProviderIds = new Set(runtime.getModelConfigProviderIds());

  const availableCounts = new Map<string, number>();
  for (const model of runtime.getAvailableSnapshot()) {
    availableCounts.set(model.provider, (availableCounts.get(model.provider) ?? 0) + 1);
  }

  const descriptors = runtime.getProviders().map<OmniMindModelServiceDescriptor>((provider) => {
    const providerId = safeIdentifier(provider.id);
    if (!providerId) {
      throw new Error("OmniMind model-services provider identity is invalid");
    }
    const knownModelCount = runtime.getModels(provider.id).length;
    const credentialInfo = credentials.info(provider.id);
    const authStatus = runtime.getProviderAuthStatus(provider.id);
    const authState = credentialInfo?.oauthAccessExpired
      ? ("refresh_required" as const)
      : authStatus.configured
        ? ("configured" as const)
        : ("setup_required" as const);
    const availableModelCount =
      authState === "refresh_required" ? 0 : (availableCounts.get(provider.id) ?? 0);
    const hasCatalogError = refresh.errors.has(provider.id);
    const origin = modelConfigProviderIds.has(provider.id)
      ? ("models_json" as const)
      : ("builtin" as const);
    const authMethods: Array<OmniMindModelServiceDescriptor["authMethods"][number]> = [];
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
  if (sorted.length > OMNIMIND_MODEL_SERVICES_MAX_COUNT) {
    throw new Error("OmniMind model-services projection is too large");
  }
  return {
    all: sorted,
    listed: sorted.filter(
      (service) =>
        service.authState === "configured" ||
        service.authState === "refresh_required" ||
        service.availableModelCount > 0 ||
        service.origin !== "builtin",
    ),
    connectable: sorted.filter(
      (service) =>
        service.origin === "builtin" &&
        service.authState === "setup_required" &&
        service.authMethods.some((method) => method.canLogin),
    ),
  };
}

function unavailableListResult(): OmniMindModelServicesListResult {
  return {
    state: "error",
    services: [],
    connectableServices: [],
    errorCode: "projection_unavailable",
  };
}

export function makeOmniMindModelServicesLive(options: OmniMindModelServicesLiveOptions = {}) {
  return Layer.effect(
    OmniMindModelServices,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const authRequests = new Map<string, ModelServiceAuthRequest>();
      let mutationTail: Promise<void> = Promise.resolve();
      const project = (signal: AbortSignal) =>
        projectModelServices({
          serverBaseDir: config.baseDir,
          loadModule: options.loadModule ?? loadOmniMindCodingAgentModule,
          ...(options.readTextFile ? { readTextFile: options.readTextFile } : {}),
          signal,
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
        const agentDir = resolveOmniMindAgentDir(config.baseDir);
        const sdk = await (options.loadModule ?? loadOmniMindCodingAgentModule)();
        signal.throwIfAborted();
        const runtime = await sdk.ModelRuntime.create({
          authPath: path.join(agentDir, "auth.json"),
          modelsPath: null,
          modelsConfigReader: createOmniMindModelsConfigReader(agentDir),
          modelsStorePath: path.join(agentDir, "models-store.json"),
          allowModelNetwork: false,
          signal,
        });
        return { agentDir, sdk, runtime };
      };

      const getProjectedService = async (serviceId: string, signal: AbortSignal) => {
        const projection = await project(signal);
        const service = projection.all.find((entry) => entry.serviceId === serviceId);
        if (!service) throw new Error("Model service is unavailable");
        return service;
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
      ): Promise<OmniMindModelServiceAuthResult> => {
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
        outcome: OmniMindModelServiceAuthResult,
      ) => {
        request.connectionSignal.removeEventListener("abort", request.abortOnConnectionClose);
        request.outcome = outcome;
        delete request.pendingPrompt;
        clearTimeout(request.timeout);
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
          let previousService: OmniMindModelServiceDescriptor | undefined;
          try {
            const { agentDir, sdk, runtime } = await createMutationRuntime(
              request.controller.signal,
            );
            const provider = runtime.getProvider(request.serviceId);
            const isBuiltin = !runtime.getModelConfigProviderIds().includes(request.serviceId);
            const supportsRequestedAuth =
              request.authType === "api_key"
                ? provider?.auth.apiKey?.login !== undefined
                : provider?.auth.oauth?.login !== undefined;
            if (!isBuiltin || !supportsRequestedAuth) {
              throw new Error("Model service does not support the requested login method");
            }
            previousService = await getProjectedService(
              request.serviceId,
              request.controller.signal,
            );
            const interaction: AuthInteraction = {
              signal: request.controller.signal,
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
                  prompt.signal?.addEventListener("abort", onAbort, { once: true });
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
            publishOmniMindModelRuntimeMutation(agentDir);
            let service = await getProjectedService(
              request.serviceId,
              new AbortController().signal,
            );
            if (synchronizationFailed) {
              finishRequest(request, {
                state: "auth_updated_sync_failed",
                requestId: request.requestId,
                service,
                events: [...request.events],
              });
              return;
            }
            let catalogFailed = false;
            if (runtime.getProvider(request.serviceId)?.refreshModels) {
              if (request.controller.signal.aborted) {
                catalogFailed = true;
              } else {
                const refreshed = await runtime.refresh({
                  providers: [request.serviceId],
                  allowNetwork: true,
                  force: true,
                  signal: request.controller.signal,
                });
                catalogFailed = refreshed.aborted || refreshed.errors.has(request.serviceId);
                if (!catalogFailed) {
                  service = await getProjectedService(
                    request.serviceId,
                    new AbortController().signal,
                  );
                }
              }
            }
            finishRequest(request, {
              state: catalogFailed ? "auth_updated_catalog_failed" : "complete",
              requestId: request.requestId,
              service,
              events: [...request.events],
            });
          } catch (error) {
            if (authenticationUpdated && previousService) {
              finishRequest(request, {
                state: "auth_updated_sync_failed",
                requestId: request.requestId,
                service: previousService,
                events: [...request.events],
              });
              return;
            }
            const cancelled = request.controller.signal.aborted;
            finishRequest(request, {
              state: cancelled ? "cancelled" : "failed",
              requestId: request.requestId,
              errorCode: cancelled ? "cancelled" : "auth_failed",
              events: [...request.events],
            });
          }
        });
      };

      return {
        list: () =>
          Effect.promise(async (signal) => {
            try {
              const projection = await project(signal);
              const first = projection.listed[0];
              return first
                ? ({
                    state: "ready",
                    services: [first, ...projection.listed.slice(1)],
                    connectableServices: projection.connectable,
                    errorCode: null,
                  } satisfies OmniMindModelServicesListResult)
                : ({
                    state: "empty",
                    services: [],
                    connectableServices: projection.connectable,
                    errorCode: null,
                  } satisfies OmniMindModelServicesListResult);
            } catch {
              signal.throwIfAborted();
              return unavailableListResult();
            }
          }),
        get: (input) =>
          Effect.promise(async (signal) => {
            try {
              const projection = await project(signal);
              const service = projection.all.find((entry) => entry.serviceId === input.serviceId);
              return service
                ? ({ state: "ready", service, errorCode: null } as const)
                : ({ state: "empty", service: null, errorCode: null } as const);
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
              signal.addEventListener("abort", () => controller.abort(), { once: true });
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
                oauthPromptMode:
                  input.authType === "oauth" ? (input.promptMode ?? "interactive") : null,
                controller,
                connectionSignal,
                abortOnConnectionClose,
                events: [],
                providerDefaultPromptConsumed: false,
                checkpoints: new Set(),
                timeout: setTimeout(() => {
                  controller.abort();
                }, AUTH_REQUEST_TIMEOUT_MS),
              };
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
            signal.addEventListener("abort", () => request.controller.abort(), { once: true });
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
            serializeMutation(async () => {
              const previous = await getProjectedService(input.serviceId, signal);
              const { agentDir, sdk, runtime } = await createMutationRuntime(signal);
              let synchronizationFailed = false;
              try {
                await runtime.logout(input.serviceId, { signal });
              } catch (error) {
                if (!(error instanceof sdk.CredentialSynchronizationError)) throw error;
                synchronizationFailed = true;
              }
              publishOmniMindModelRuntimeMutation(agentDir);
              let service = previous;
              try {
                service = await getProjectedService(input.serviceId, new AbortController().signal);
              } catch {
                synchronizationFailed = true;
              }
              return {
                state: synchronizationFailed ? "credential_updated_sync_failed" : "complete",
                service,
              } as const;
            }),
          ),
        refresh: (input) =>
          Effect.promise((signal) =>
            serializeMutation(async () => {
              const previous = await getProjectedService(input.serviceId, signal);
              const { agentDir, runtime } = await createMutationRuntime(signal);
              if (!runtime.getProvider(input.serviceId)?.refreshModels) {
                return { state: "unsupported", service: previous } as const;
              }
              const refreshed = await runtime.refresh({
                providers: [input.serviceId],
                allowNetwork: true,
                force: true,
                signal,
              });
              if (refreshed.aborted) return { state: "cancelled", service: previous } as const;
              if (refreshed.errors.has(input.serviceId)) {
                return { state: "failed", service: previous } as const;
              }
              publishOmniMindModelRuntimeMutation(agentDir);
              return {
                state: "success",
                service: await getProjectedService(input.serviceId, signal),
              } as const;
            }),
          ),
      } satisfies OmniMindModelServicesShape;
    }),
  );
}

export const OmniMindModelServicesLive = makeOmniMindModelServicesLive();

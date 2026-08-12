// FILE: OmniMindModelServices.ts
// Purpose: Projects Pi ModelRuntime provider/auth/catalog facts without resolving secrets.
// Layer: Server provider service implementation

import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import type {
  AuthOperationOptions,
  Credential,
  CredentialInfo,
  CredentialStore,
  ModelsStore,
  ModelsStoreEntry,
  ModelsStoreOperationOptions,
} from "@earendil-works/pi-ai";
import type {
  OmniMindModelServiceAuthMethodType,
  OmniMindModelServiceAuthSource,
  OmniMindModelServiceDescriptor,
  OmniMindModelServicesListResult,
} from "@omnimind/contracts";
import { OMNIMIND_MODEL_SERVICES_MAX_COUNT } from "@omnimind/contracts";
import { Effect, Layer } from "effect";

import { ServerConfig } from "../../config.ts";
import {
  loadOmniMindCodingAgentModule,
  resolveOmniMindAgentDir,
  type OmniMindCodingAgentModule,
} from "../omnimindAgentRuntime.ts";
import {
  OmniMindModelServices,
  type OmniMindModelServicesShape,
} from "../Services/OmniMindModelServices.ts";

const MAX_SAFE_LABEL_LENGTH = 256;
const MAX_LOCAL_CONFIG_BYTES = 4 * 1024 * 1024;

type ReadTextFile = (filePath: string, signal?: AbortSignal) => Promise<string>;

export interface OmniMindModelServicesLiveOptions {
  readonly loadModule?: () => Promise<OmniMindCodingAgentModule>;
  readonly readTextFile?: ReadTextFile;
}

async function readBoundedPrivateTextFile(input: {
  readonly agentDir: string;
  readonly filePath: string;
  readonly signal?: AbortSignal;
}): Promise<string> {
  input.signal?.throwIfAborted();
  if (path.dirname(input.filePath) !== input.agentDir) {
    throw new Error("Model-services read escaped the private agent directory");
  }
  const leaf = await lstat(input.filePath);
  if (leaf.isSymbolicLink() || !leaf.isFile() || leaf.nlink !== 1) {
    throw new Error("Model-services state is not a private regular file");
  }
  const physicalPath = await realpath(input.filePath);
  if (path.dirname(physicalPath) !== input.agentDir) {
    throw new Error("Model-services state escaped the private agent directory");
  }

  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  const handle = await open(input.filePath, flags);
  try {
    const metadata = await handle.stat();
    if (
      !metadata.isFile() ||
      metadata.dev !== leaf.dev ||
      metadata.ino !== leaf.ino ||
      metadata.nlink !== 1 ||
      metadata.size > MAX_LOCAL_CONFIG_BYTES
    ) {
      throw new Error("Model-services state changed or exceeds the safe read boundary");
    }
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;
    while (bytesRead <= MAX_LOCAL_CONFIG_BYTES) {
      input.signal?.throwIfAborted();
      const remaining = MAX_LOCAL_CONFIG_BYTES + 1 - bytesRead;
      const chunk = new Uint8Array(Math.min(64 * 1024, remaining));
      const read = await handle.read(chunk, 0, chunk.byteLength, bytesRead);
      if (read.bytesRead === 0) break;
      chunks.push(chunk.subarray(0, read.bytesRead));
      bytesRead += read.bytesRead;
    }
    if (bytesRead > MAX_LOCAL_CONFIG_BYTES) {
      throw new Error("Model-services state exceeds the safe read boundary");
    }
    input.signal?.throwIfAborted();
    const content = new Uint8Array(bytesRead);
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(content);
  } finally {
    await handle.close();
  }
}

async function assertPassiveModelsConfigAbsent(modelsPath: string): Promise<void> {
  try {
    const metadata = await lstat(modelsPath);
    if (metadata.isSymbolicLink()) {
      throw new Error("Model-services custom configuration is not physically isolated");
    }
    throw new Error("Model-services custom configuration requires a safe Pi loader");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
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
}> {
  input.signal.throwIfAborted();
  const sdk = await input.loadModule();
  input.signal.throwIfAborted();
  const agentDir = resolveOmniMindAgentDir(input.serverBaseDir);
  const readTextFile =
    input.readTextFile ??
    ((filePath, signal) =>
      readBoundedPrivateTextFile({
        agentDir,
        filePath,
        ...(signal ? { signal } : {}),
      }));
  const authPath = path.join(agentDir, "auth.json");
  const modelsPath = path.join(agentDir, "models.json");
  await assertPassiveModelsConfigAbsent(modelsPath);
  const credentials = await StaticCredentialStore.create({
    authPath,
    readTextFile,
    signal: input.signal,
  });
  const modelsStore = new StaticModelsStore(path.join(agentDir, "models-store.json"), readTextFile);
  const runtime = await sdk.ModelRuntime.create({
    credentials,
    // Pi 0.84.1 reopens models.json without an injectable byte/cancellation/
    // no-follow boundary. Passive Settings reads fail above when that file is
    // present rather than duplicating its schema or making a secret-bearing copy.
    modelsPath: null,
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
    const origin = "builtin" as const;
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
  };
}

function unavailableListResult(): OmniMindModelServicesListResult {
  return { state: "error", services: [], errorCode: "projection_unavailable" };
}

export function makeOmniMindModelServicesLive(options: OmniMindModelServicesLiveOptions = {}) {
  return Layer.effect(
    OmniMindModelServices,
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const project = (signal: AbortSignal) =>
        projectModelServices({
          serverBaseDir: config.baseDir,
          loadModule: options.loadModule ?? loadOmniMindCodingAgentModule,
          ...(options.readTextFile ? { readTextFile: options.readTextFile } : {}),
          signal,
        });

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
                    errorCode: null,
                  } satisfies OmniMindModelServicesListResult)
                : ({
                    state: "empty",
                    services: [],
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
      } satisfies OmniMindModelServicesShape;
    }),
  );
}

export const OmniMindModelServicesLive = makeOmniMindModelServicesLive();

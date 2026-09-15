// FILE: modelServiceChildEnv.ts
// Purpose: Projects stored Haros model-service API keys into engine child env vars.
// Layer: Server engine runtime
// Secrets stay on the server spawn path; the web never receives them.

import type { EngineKind } from "@harnessos/contracts";
import { engineConsumesHarosModelServiceCredentials } from "@harnessos/shared/engineMetadata";

import {
  loadModelServicesSdk,
  readModelServicesPrivateTextFile,
  resolveModelServicesAgentDir,
} from "./modelServicesRuntime.ts";

const OFFICIAL_DEEPSEEK_ORIGIN = "https://api.deepseek.com";
const OFFICIAL_OPENAI_ORIGIN = "https://api.openai.com";

const SERVICE_ENV_BY_ID: Readonly<
  Record<
    string,
    { readonly key: string; readonly baseUrl?: string; readonly officialOrigin?: string }
  >
> = {
  deepseek: {
    key: "DEEPSEEK_API_KEY",
    baseUrl: "DEEPSEEK_BASE_URL",
    officialOrigin: OFFICIAL_DEEPSEEK_ORIGIN,
  },
  openai: {
    key: "OPENAI_API_KEY",
    baseUrl: "OPENAI_BASE_URL",
    officialOrigin: OFFICIAL_OPENAI_ORIGIN,
  },
  anthropic: { key: "ANTHROPIC_API_KEY" },
  google: { key: "GEMINI_API_KEY" },
  gemini: { key: "GEMINI_API_KEY" },
  xai: { key: "XAI_API_KEY" },
  grok: { key: "XAI_API_KEY" },
};

export interface HarosModelServiceProviderHint {
  readonly serviceId: string;
  readonly api?: string;
  readonly baseUrl?: string;
}

export interface ResolveHarosModelServiceChildEnvInput {
  readonly engine: EngineKind;
  readonly storedApiKeys: ReadonlyMap<string, string>;
  readonly providers: ReadonlyArray<HarosModelServiceProviderHint>;
  readonly processEnv?: NodeJS.ProcessEnv;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function unsetInProcess(processEnv: NodeJS.ProcessEnv, key: string): boolean {
  const value = processEnv[key];
  return typeof value !== "string" || value.trim().length === 0;
}

function assignIfUnset(
  target: NodeJS.ProcessEnv,
  processEnv: NodeJS.ProcessEnv,
  key: string,
  value: string | undefined,
): void {
  if (!value || !unsetInProcess(processEnv, key) || target[key] !== undefined) return;
  target[key] = value;
}

export function parseStoredModelServiceApiKeys(authJson: unknown): ReadonlyMap<string, string> {
  if (!isRecord(authJson)) return new Map();
  const keys = new Map<string, string>();
  for (const [serviceId, raw] of Object.entries(authJson)) {
    if (typeof serviceId !== "string" || serviceId.length === 0 || !isRecord(raw)) continue;
    if (raw.type !== "api_key") continue;
    if (typeof raw.key !== "string") continue;
    const key = raw.key.trim();
    if (key.length === 0) continue;
    keys.set(serviceId, key);
  }
  return keys;
}

export function parseModelServiceProviderHints(
  modelsJson: unknown,
): ReadonlyArray<HarosModelServiceProviderHint> {
  if (!isRecord(modelsJson) || !isRecord(modelsJson.providers)) return [];
  const hints: HarosModelServiceProviderHint[] = [];
  for (const [serviceId, raw] of Object.entries(modelsJson.providers)) {
    if (typeof serviceId !== "string" || serviceId.length === 0 || !isRecord(raw)) continue;
    const api = typeof raw.api === "string" ? raw.api : undefined;
    const baseUrl = typeof raw.baseUrl === "string" ? raw.baseUrl.trim() : undefined;
    hints.push({
      serviceId,
      ...(api ? { api } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    });
  }
  return hints;
}

function applyKnownService(
  env: NodeJS.ProcessEnv,
  processEnv: NodeJS.ProcessEnv,
  serviceId: string,
  storedKey: string | undefined,
  provider: HarosModelServiceProviderHint | undefined,
): void {
  const mapping = SERVICE_ENV_BY_ID[serviceId];
  if (!mapping) return;
  assignIfUnset(env, processEnv, mapping.key, storedKey);
  if (!mapping.baseUrl || !provider?.baseUrl) return;
  const origin = originOf(provider.baseUrl);
  if (!origin || origin === mapping.officialOrigin) return;
  assignIfUnset(env, processEnv, mapping.baseUrl, provider.baseUrl);
}

function customProvidersWithKeys(
  storedApiKeys: ReadonlyMap<string, string>,
  providers: ReadonlyArray<HarosModelServiceProviderHint>,
  api: string,
): ReadonlyArray<HarosModelServiceProviderHint & { readonly key: string }> {
  return providers.flatMap((provider) => {
    if (provider.api !== api) return [];
    if (SERVICE_ENV_BY_ID[provider.serviceId]) return [];
    const key = storedApiKeys.get(provider.serviceId);
    return key ? [{ ...provider, key }] : [];
  });
}

export function resolveHarosModelServiceChildEnv(
  input: ResolveHarosModelServiceChildEnvInput,
): NodeJS.ProcessEnv {
  if (!engineConsumesHarosModelServiceCredentials(input.engine)) return {};
  const processEnv = input.processEnv ?? {};
  const env: NodeJS.ProcessEnv = {};
  const providersById = new Map(input.providers.map((provider) => [provider.serviceId, provider]));

  if (input.engine === "deepseek") {
    applyKnownService(
      env,
      processEnv,
      "deepseek",
      input.storedApiKeys.get("deepseek"),
      providersById.get("deepseek"),
    );
    if (env.DEEPSEEK_API_KEY === undefined && unsetInProcess(processEnv, "DEEPSEEK_API_KEY")) {
      const gateways = customProvidersWithKeys(
        input.storedApiKeys,
        input.providers,
        "openai-completions",
      );
      if (gateways.length === 1) {
        assignIfUnset(env, processEnv, "DEEPSEEK_API_KEY", gateways[0]?.key);
        const baseUrl = gateways[0]?.baseUrl;
        if (baseUrl && originOf(baseUrl) !== OFFICIAL_DEEPSEEK_ORIGIN) {
          assignIfUnset(env, processEnv, "DEEPSEEK_BASE_URL", baseUrl);
        }
      }
    }
    return env;
  }

  for (const [serviceId, storedKey] of input.storedApiKeys) {
    applyKnownService(env, processEnv, serviceId, storedKey, providersById.get(serviceId));
  }

  const openaiGateways = customProvidersWithKeys(
    input.storedApiKeys,
    input.providers,
    "openai-completions",
  );
  if (openaiGateways.length === 1) {
    assignIfUnset(env, processEnv, "OPENAI_API_KEY", openaiGateways[0]?.key);
    const baseUrl = openaiGateways[0]?.baseUrl;
    if (baseUrl && originOf(baseUrl) !== OFFICIAL_OPENAI_ORIGIN) {
      assignIfUnset(env, processEnv, "OPENAI_BASE_URL", baseUrl);
    }
  }

  const anthropicGateways = customProvidersWithKeys(
    input.storedApiKeys,
    input.providers,
    "anthropic-messages",
  );
  if (anthropicGateways.length === 1) {
    assignIfUnset(env, processEnv, "ANTHROPIC_API_KEY", anthropicGateways[0]?.key);
  }

  const googleGateways = customProvidersWithKeys(
    input.storedApiKeys,
    input.providers,
    "google-generative-ai",
  );
  if (googleGateways.length === 1) {
    assignIfUnset(env, processEnv, "GEMINI_API_KEY", googleGateways[0]?.key);
  }

  return env;
}

export function hasStoredDeepSeekModelServiceKey(input: {
  readonly storedApiKeys: ReadonlyMap<string, string>;
  readonly providers: ReadonlyArray<HarosModelServiceProviderHint>;
}): boolean {
  if (input.storedApiKeys.has("deepseek")) return true;
  return (
    customProvidersWithKeys(input.storedApiKeys, input.providers, "openai-completions").length === 1
  );
}

export async function loadHarosModelServiceSnapshot(input: {
  readonly agentDir: string;
  readonly readTextFile?: (
    filename: "auth.json" | "models.json",
    signal?: AbortSignal,
  ) => Promise<string>;
  readonly signal?: AbortSignal;
}): Promise<{
  readonly storedApiKeys: ReadonlyMap<string, string>;
  readonly providers: ReadonlyArray<HarosModelServiceProviderHint>;
}> {
  const read = async (filename: "auth.json" | "models.json"): Promise<unknown> => {
    try {
      const raw = input.readTextFile
        ? await input.readTextFile(filename, input.signal)
        : await readModelServicesPrivateTextFile({
            agentDir: input.agentDir,
            filename,
            ...(input.signal ? { signal: input.signal } : {}),
          });
      return JSON.parse(raw) as unknown;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return undefined;
      }
      throw error;
    }
  };
  const [authJson, modelsJson] = await Promise.all([read("auth.json"), read("models.json")]);
  return {
    storedApiKeys: parseStoredModelServiceApiKeys(authJson),
    providers: parseModelServiceProviderHints(modelsJson),
  };
}

export async function loadHarosModelServiceChildEnv(input: {
  readonly engine: EngineKind;
  readonly agentDir: string;
  readonly processEnv?: NodeJS.ProcessEnv;
  readonly readTextFile?: (
    filename: "auth.json" | "models.json",
    signal?: AbortSignal,
  ) => Promise<string>;
  readonly signal?: AbortSignal;
}): Promise<NodeJS.ProcessEnv> {
  if (!engineConsumesHarosModelServiceCredentials(input.engine)) return {};
  const snapshot = await loadHarosModelServiceSnapshot(input);
  return resolveHarosModelServiceChildEnv({
    engine: input.engine,
    storedApiKeys: snapshot.storedApiKeys,
    providers: snapshot.providers,
    processEnv: input.processEnv ?? process.env,
  });
}

export async function resolveHarosModelServicesAgentDir(input: {
  readonly requestedAgentDir?: string;
  readonly serverBaseDir: string;
}): Promise<string> {
  const sdk = await loadModelServicesSdk();
  const requested = input.requestedAgentDir?.trim() || sdk.getAgentDir();
  return resolveModelServicesAgentDir(requested, input.serverBaseDir);
}

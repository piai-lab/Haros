// FILE: harosModelServiceBinding.ts
// Purpose: Matches Haros model-service catalogs onto Engine-native protocols.
// Layer: Server engine runtime
// No protocol conversion. Native catalog wins slug collisions.

import type {
  EngineKind,
  EngineModelDescriptor,
  HarosCustomModelServiceApi,
  HarosCustomModelServiceConfig,
  HarosModelServiceDescriptor,
  HarosModelServiceModel,
} from "@harnessos/contracts";
import {
  engineMatchesHarosModelService,
  engineOverlaysHarosModelServiceCatalog,
  harosModelServiceComposerSlug,
  parseHarosModelServiceComposerSlug,
} from "@harnessos/shared/engineMetadata";

import {
  loadHarosModelServiceSnapshot,
  resolveHarosModelServicesAgentDir,
  type HarosModelServiceProviderHint,
} from "./modelServiceChildEnv.ts";

const OFFICIAL_DEEPSEEK_ORIGIN = "https://api.deepseek.com";
const OFFICIAL_OPENAI_CHAT_BASE_URL = "https://api.openai.com/v1";
const OFFICIAL_ANTHROPIC_ORIGIN = "https://api.anthropic.com";

const KNOWN_SERVICE_API: Readonly<Record<string, HarosCustomModelServiceApi>> = {
  deepseek: "openai-completions",
  openai: "openai-completions",
  anthropic: "anthropic-messages",
  google: "google-generative-ai",
  gemini: "google-generative-ai",
};

export const HARNESSOS_CODEX_MODEL_SERVICE_KEY_ENV = "CODEX_MODEL_SERVICE_API_KEY";

export interface HarosModelServiceBinding {
  readonly engine: EngineKind;
  readonly serviceId: string;
  readonly modelId: string;
  readonly api: HarosCustomModelServiceApi | undefined;
  readonly baseUrl: string | undefined;
  readonly apiKey: string | undefined;
}

export function inferHarosModelServiceApi(
  serviceId: string,
  api?: string,
): HarosCustomModelServiceApi | undefined {
  if (
    api === "openai-completions" ||
    api === "openai-responses" ||
    api === "anthropic-messages" ||
    api === "google-generative-ai"
  ) {
    return api;
  }
  return KNOWN_SERVICE_API[serviceId];
}

export function resolveHarosModelServiceBinding(input: {
  readonly engine: EngineKind;
  readonly model: string | null | undefined;
  readonly storedApiKeys: ReadonlyMap<string, string>;
  readonly providers: ReadonlyArray<HarosModelServiceProviderHint>;
}): HarosModelServiceBinding | null {
  const parsed = parseHarosModelServiceComposerSlug(input.model?.trim() ?? "");
  if (!parsed) return null;
  const provider = input.providers.find((entry) => entry.serviceId === parsed.serviceId);
  const api = inferHarosModelServiceApi(parsed.serviceId, provider?.api);
  if (
    !engineMatchesHarosModelService({
      engine: input.engine,
      serviceId: parsed.serviceId,
      ...(api ? { api } : {}),
    })
  ) {
    return null;
  }
  const apiKey = input.storedApiKeys.get(parsed.serviceId);
  const baseUrl = provider?.baseUrl?.trim();
  return {
    engine: input.engine,
    serviceId: parsed.serviceId,
    modelId: parsed.modelId,
    ...(api ? { api } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
  };
}

export function mergeHarosModelServiceCatalog(input: {
  readonly engine: EngineKind;
  readonly nativeModels: ReadonlyArray<EngineModelDescriptor>;
  readonly services: ReadonlyArray<HarosModelServiceDescriptor>;
  readonly modelsByServiceId: ReadonlyMap<string, ReadonlyArray<HarosModelServiceModel>>;
  readonly customConfigsByServiceId?: ReadonlyMap<string, HarosCustomModelServiceConfig>;
}): ReadonlyArray<EngineModelDescriptor> {
  if (!engineOverlaysHarosModelServiceCatalog(input.engine)) {
    return input.nativeModels;
  }
  const seen = new Set(input.nativeModels.map((model) => model.slug));
  const overlay: EngineModelDescriptor[] = [];
  for (const service of input.services) {
    if (service.authState !== "configured") continue;
    const api = inferHarosModelServiceApi(
      service.serviceId,
      service.api ?? input.customConfigsByServiceId?.get(service.serviceId)?.api,
    );
    if (
      !engineMatchesHarosModelService({
        engine: input.engine,
        serviceId: service.serviceId,
        ...(api ? { api } : {}),
      })
    ) {
      continue;
    }
    const models = input.modelsByServiceId.get(service.serviceId) ?? [];
    for (const model of models) {
      if (!model.available) continue;
      const slug = harosModelServiceComposerSlug(service.serviceId, model.modelId);
      if (seen.has(slug)) continue;
      seen.add(slug);
      overlay.push({
        slug,
        name: model.displayName,
        upstreamProviderId: service.serviceId,
        upstreamProviderName: service.displayName,
        upstreamProviderOrigin: service.origin,
      });
    }
  }
  return overlay.length === 0 ? input.nativeModels : [...input.nativeModels, ...overlay];
}

export function hasMatchingHarosModelServiceBinding(input: {
  readonly engine: EngineKind;
  readonly model: string | null | undefined;
}): boolean {
  if (!engineOverlaysHarosModelServiceCatalog(input.engine)) return false;
  return parseHarosModelServiceComposerSlug(input.model?.trim() ?? "") !== null;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function officialCodexBaseUrl(binding: HarosModelServiceBinding): string | undefined {
  if (binding.baseUrl) return binding.baseUrl;
  if (binding.serviceId === "deepseek") return OFFICIAL_DEEPSEEK_ORIGIN;
  if (binding.api === "openai-completions" || binding.api === "openai-responses") {
    return OFFICIAL_OPENAI_CHAT_BASE_URL;
  }
  return undefined;
}

export function buildCodexModelServiceConfigToml(
  binding: HarosModelServiceBinding,
): string | undefined {
  if (binding.api !== "openai-completions" && binding.api !== "openai-responses") {
    return undefined;
  }
  const baseUrl = officialCodexBaseUrl(binding);
  if (!baseUrl || !binding.apiKey) return undefined;
  const providerId = `haros-${binding.serviceId}`;
  const wireApi = binding.api === "openai-responses" ? "responses" : "chat";
  return [
    `model_provider = ${tomlString(providerId)}`,
    "",
    `[model_providers.${providerId}]`,
    `name = ${tomlString(binding.serviceId)}`,
    `base_url = ${tomlString(baseUrl)}`,
    `env_key = ${tomlString(HARNESSOS_CODEX_MODEL_SERVICE_KEY_ENV)}`,
    `wire_api = ${tomlString(wireApi)}`,
  ].join("\n");
}

export function resolveCodexModelServiceSpawn(binding: HarosModelServiceBinding | null): {
  readonly overlayId?: string;
  readonly extraConfigToml?: string;
  readonly env?: NodeJS.ProcessEnv;
} {
  if (!binding) return {};
  const extraConfigToml = buildCodexModelServiceConfigToml(binding);
  if (!extraConfigToml) return {};
  return {
    overlayId: `haros-${binding.serviceId}`,
    extraConfigToml,
    env: {
      [HARNESSOS_CODEX_MODEL_SERVICE_KEY_ENV]: binding.apiKey ?? "",
    },
  };
}

export function resolveClaudeModelServiceEnv(
  binding: HarosModelServiceBinding | null,
): NodeJS.ProcessEnv {
  if (!binding || binding.api !== "anthropic-messages" || !binding.apiKey) return {};
  const env: NodeJS.ProcessEnv = { ANTHROPIC_API_KEY: binding.apiKey };
  if (binding.baseUrl && !binding.baseUrl.startsWith(OFFICIAL_ANTHROPIC_ORIGIN)) {
    env.ANTHROPIC_BASE_URL = binding.baseUrl;
  }
  return env;
}

export function resolveGrokModelServiceEnv(
  binding: HarosModelServiceBinding | null,
): NodeJS.ProcessEnv {
  if (!binding || (binding.serviceId !== "xai" && binding.serviceId !== "grok") || !binding.apiKey) {
    return {};
  }
  return { XAI_API_KEY: binding.apiKey };
}

export function resolveAntigravityModelServiceEnv(
  binding: HarosModelServiceBinding | null,
): NodeJS.ProcessEnv {
  if (!binding || binding.api !== "google-generative-ai" || !binding.apiKey) return {};
  return { GEMINI_API_KEY: binding.apiKey };
}

export async function loadHarosModelServiceSnapshotForEngine(input: {
  readonly requestedAgentDir?: string;
  readonly serverBaseDir: string;
}): Promise<{
  readonly storedApiKeys: ReadonlyMap<string, string>;
  readonly providers: ReadonlyArray<HarosModelServiceProviderHint>;
} | null> {
  try {
    const agentDir = await resolveHarosModelServicesAgentDir({
      requestedAgentDir: input.requestedAgentDir,
      serverBaseDir: input.serverBaseDir,
    });
    return await loadHarosModelServiceSnapshot({ agentDir });
  } catch {
    return null;
  }
}

export async function loadHarosModelServiceBinding(input: {
  readonly engine: EngineKind;
  readonly model: string | null | undefined;
  readonly requestedAgentDir?: string;
  readonly serverBaseDir: string;
}): Promise<HarosModelServiceBinding | null> {
  if (!hasMatchingHarosModelServiceBinding(input)) return null;
  const snapshot = await loadHarosModelServiceSnapshotForEngine(input);
  if (!snapshot) return null;
  return resolveHarosModelServiceBinding({
    engine: input.engine,
    model: input.model,
    storedApiKeys: snapshot.storedApiKeys,
    providers: snapshot.providers,
  });
}

export function resolveKnownGrokModelServiceEnv(input: {
  readonly storedApiKeys: ReadonlyMap<string, string>;
}): NodeJS.ProcessEnv {
  const apiKey = input.storedApiKeys.get("xai") ?? input.storedApiKeys.get("grok");
  return apiKey ? { XAI_API_KEY: apiKey } : {};
}

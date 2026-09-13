import type { Api, Model, Models, RefreshModelsContext } from "@earendil-works/pi-ai";

export const MODEL_CATALOG_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const MAX_CATALOG_BYTES = 2 * 1024 * 1024;
const MAX_MODELS = 4_096;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

type CatalogModel = Model<Api> & { readonly discoveredAt?: number };

async function readCatalog(response: Response): Promise<ReadonlyArray<string>> {
  if (!response.ok || !response.body) throw new Error("Official model catalog unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_CATALOG_BYTES) throw new Error("Official model catalog too large");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const payload: unknown = JSON.parse(new TextDecoder().decode(body));
  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    throw new Error("Official model catalog invalid");
  }
  const ids = [
    ...new Set(
      payload.data.flatMap((item: unknown) => {
        if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string")
          return [];
        return item.id.length > 0 &&
          item.id.length <= 512 &&
          item.id.trim() === item.id &&
          !CONTROL_CHAR_PATTERN.test(item.id)
          ? [item.id]
          : [];
      }),
    ),
  ];
  if (ids.length === 0 || ids.length > MAX_MODELS)
    throw new Error("Official model catalog invalid");
  return ids;
}

/** Decorate the existing provider so credentials, streams and catalog storage keep their owner. */
export function installOfficialModelCatalog(runtime: Models): void {
  const provider = runtime.getProvider("deepseek");
  if (!provider || provider.baseUrl !== "https://api.deepseek.com") return;
  const baseline = provider.getModels();
  if (!baseline.length) return;
  // Respect custom endpoints and mixed model overrides instead of sending their credentials elsewhere.
  if (baseline.some((model) => new URL(model.baseUrl).origin !== "https://api.deepseek.com"))
    return;
  let models: ReadonlyArray<CatalogModel> = baseline;
  provider.getModels = () => models;
  provider.refreshModels = async (context: RefreshModelsContext) => {
    const stored = context.stored;
    if (stored) {
      const cached = stored.models.filter((model) => model.provider === provider.id);
      const merged = new Map(baseline.map((model) => [model.id, model]));
      for (const model of cached) merged.set(model.id, model);
      if (
        !(await context.publish({
          update: () => {
            models = [...merged.values()];
          },
        }))
      )
        return;
    }
    if (!context.allowNetwork || context.signal.aborted) return;
    if (
      !context.force &&
      stored?.checkedAt &&
      Date.now() - stored.checkedAt < MODEL_CATALOG_SYNC_INTERVAL_MS
    )
      return;
    const auth = await runtime.getAuth(provider.id, { signal: context.signal });
    if (!auth?.auth.apiKey) throw new Error("Official model catalog requires credentials");
    const endpoint = new URL(auth.auth.baseUrl ?? provider.baseUrl!);
    if (endpoint.origin !== "https://api.deepseek.com")
      throw new Error("Official model catalog endpoint changed");
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/u, "")}/models`;
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        ...auth.auth.headers,
        Authorization: `Bearer ${auth.auth.apiKey}`,
      },
      redirect: "error",
      signal: context.signal,
    });
    const ids = await readCatalog(response);
    context.signal.throwIfAborted();
    const checkedAt = Date.now();
    const merged = new Map(models.map((model) => [model.id, model]));
    for (const id of ids) {
      if (merged.has(id)) continue;
      // A /models identity does not declare tools, vision, pricing or reasoning support.
      merged.set(id, {
        id,
        name: id,
        provider: provider.id,
        api: "openai-completions",
        baseUrl: "https://api.deepseek.com",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128_000,
        maxTokens: 4_096,
        discoveredAt: checkedAt,
      });
    }
    if (merged.size > MAX_MODELS) throw new Error("Official model catalog too large");
    const next = [...merged.values()];
    await context.publish({
      persist: { models: next, checkedAt, lastModified: checkedAt },
      update: () => {
        models = next;
      },
    });
  };
}

export function modelDiscoveredAt(model: Model<Api>): number | undefined {
  const value = (model as CatalogModel).discoveredAt;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

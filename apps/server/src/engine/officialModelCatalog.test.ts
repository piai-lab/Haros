import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createModels,
  createProvider,
  InMemoryCredentialStore,
  InMemoryModelsStore,
  type Model,
} from "@earendil-works/pi-ai";
import {
  installOfficialModelCatalog,
  MODEL_CATALOG_SYNC_INTERVAL_MS,
} from "./officialModelCatalog";

const baseline: Model<"openai-completions"> = {
  id: "existing",
  name: "Existing",
  provider: "deepseek",
  api: "openai-completions",
  baseUrl: "https://api.deepseek.com",
  reasoning: false,
  input: ["text"],
  contextWindow: 8192,
  maxTokens: 2048,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
};
async function setup(store = new InMemoryModelsStore()) {
  const credentials = new InMemoryCredentialStore();
  await credentials.modify("deepseek", async () => ({ type: "api_key", key: "test-only-key" }));
  const runtime = createModels({ credentials, modelsStore: store });
  runtime.setProvider(
    createProvider({
      id: "deepseek",
      baseUrl: "https://api.deepseek.com",
      models: [baseline],
      auth: {
        apiKey: {
          name: "Key",
          resolve: async ({ credential }) =>
            credential?.key ? { auth: { apiKey: credential.key } } : undefined,
        },
      },
      api: {
        stream: () => {
          throw new Error("Unused by catalog tests");
        },
        streamSimple: () => {
          throw new Error("Unused by catalog tests");
        },
      },
    }),
  );
  installOfficialModelCatalog(runtime);
  return { runtime, store };
}
afterEach(() => vi.unstubAllGlobals());
describe("official DeepSeek catalog", () => {
  it("uses the configured key only at the official endpoint and restores new identities without network", async () => {
    const request = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) =>
      Response.json({ data: [{ id: "existing" }, { id: "new-model" }, { id: "new-model" }] }),
    );
    vi.stubGlobal("fetch", request);
    const { runtime, store } = await setup();
    expect((await runtime.refresh({ allowNetwork: true, force: true })).errors.size).toBe(0);
    expect(String(request.mock.calls[0]?.[0])).toBe("https://api.deepseek.com/models");
    expect(runtime.getModel("deepseek", "existing")).toEqual(baseline);
    expect(runtime.getModel("deepseek", "new-model")).toMatchObject({
      api: "openai-completions",
      reasoning: false,
      input: ["text"],
    });
    const restored = await setup(store);
    await restored.runtime.refresh({ allowNetwork: false });
    expect(restored.runtime.getModels("deepseek").map((model) => model.id)).toEqual([
      "existing",
      "new-model",
    ]);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("retains the complete previous catalog and timestamp after a failed or malformed response", async () => {
    const { runtime, store } = await setup();
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: [{ id: "new-model" }] }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: [] }));
    vi.stubGlobal("fetch", request);
    await runtime.refresh({ allowNetwork: true, force: true });
    const before = await store.read("deepseek");
    expect(
      (await runtime.refresh({ allowNetwork: true, force: true })).errors.has("deepseek"),
    ).toBe(true);
    expect(
      (await runtime.refresh({ allowNetwork: true, force: true })).errors.has("deepseek"),
    ).toBe(true);
    expect(await store.read("deepseek")).toEqual(before);
    expect(runtime.getModels("deepseek").map((model) => model.id)).toEqual([
      "existing",
      "new-model",
    ]);
  });
  it("respects daily cache freshness while manual synchronization bypasses it", async () => {
    const { runtime, store } = await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [{ id: "new-model" }] })),
    );
    await runtime.refresh({ allowNetwork: true });
    await runtime.refresh({ allowNetwork: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const stored = (await store.read("deepseek"))!;
    await store.write("deepseek", {
      ...stored,
      checkedAt: Date.now() - MODEL_CATALOG_SYNC_INTERVAL_MS - 1,
    });
    await runtime.refresh({ allowNetwork: true });
    await runtime.refresh({ allowNetwork: true, force: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

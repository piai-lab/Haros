import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerConfig } from "../../config.ts";
import { Open, type OpenShape } from "../../open.ts";
import {
  OmniMindWebSearchSettings,
  type OmniMindWebSearchSettingsShape,
} from "../Services/OmniMindWebSearchSettings.ts";
import { OmniMindWebSearchSettingsLive } from "./OmniMindWebSearchSettings.ts";

const cleanups: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of cleanups.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function harness() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omnimind-web-search-settings-"));
  const baseDir = path.join(root, "state");
  fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });
  cleanups.push(root);
  const openInEditor = vi.fn(() => Effect.void);
  const layer = OmniMindWebSearchSettingsLive.pipe(
    Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
    Layer.provideMerge(Layer.succeed(Open, {
      openBrowser: () => Effect.void,
      openInEditor,
    } satisfies OpenShape)),
    Layer.provideMerge(NodeServices.layer),
  );
  const run = <A>(operation: (service: OmniMindWebSearchSettingsShape) => Effect.Effect<A, Error>) =>
    Effect.runPromise(
      Effect.gen(function* () {
        return yield* operation(yield* OmniMindWebSearchSettings);
      }).pipe(Effect.provide(layer)),
    );
  return { root, baseDir, agentDir: path.join(baseDir, "agent"), openInEditor, run };
}

describe("OmniMindWebSearchSettingsLive", () => {
  it("creates the canonical default only when Settings is opened", async () => {
    const test = harness();
    expect(fs.existsSync(test.agentDir)).toBe(false);

    const result = await test.run((service) => service.open());

    expect(result.state).toBe("ready");
    const configPath = path.join(test.agentDir, "web-search.json");
    expect(fs.readFileSync(configPath, "utf8")).toBe(
      '{\n  "schemaVersion": 1,\n  "provider": "auto",\n  "workflow": "summary-review"\n}\n',
    );
    if (process.platform !== "win32") expect(fs.statSync(configPath).mode & 0o777).toBe(0o600);
  });

  it("returns an optimistic conflict without overwriting the external file", async () => {
    const test = harness();
    const opened = await test.run((service) => service.open());
    if (opened.state !== "ready") throw new Error("expected ready snapshot");
    const configPath = path.join(test.agentDir, "web-search.json");
    fs.writeFileSync(configPath, JSON.stringify({ schemaVersion: 1, provider: "exa", workflow: "none", external: true }) + "\n", { mode: 0o600 });

    const result = await test.run((service) => service.mutate({
      expectedRevision: opened.revision,
      draft: { provider: "tavily", workflow: "auto-summary", fields: [] },
    }));

    expect(result.state).toBe("conflict");
    expect(JSON.parse(fs.readFileSync(configPath, "utf8"))).toMatchObject({ provider: "exa", external: true });
  });

  it("single-flights duplicate explicit Provider test identities within one client", async () => {
    const test = harness();
    const opened = await test.run((service) => service.open());
    if (opened.state !== "ready") throw new Error("expected ready snapshot");
    let fetchCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      fetchCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(JSON.stringify({ query: "x", results: [] }), { status: 200 });
    });
    const input = {
      requestId: "same-explicit-action",
      providerId: "searxng",
      draft: {
        provider: "auto",
        workflow: "summary-review",
        fields: [{ configKey: "searxngBaseUrl", value: "https://example.com" }],
      },
    } as const;

    const results = await test.run((service) =>
      Effect.all(
        [service.testProvider(input, "client-a"), service.testProvider(input, "client-a")],
        { concurrency: "unbounded" },
      ),
    );

    expect(results.map(({ state }) => state)).toEqual(["ready", "ready"]);
    expect(fetchCalls).toBe(1);
  });

  it("opens the canonical file server-side without returning its path to the Renderer", async () => {
    const test = harness();
    await test.run((service) => service.open());
    await test.run((service) => service.openConfig("vscode"));
    expect(test.openInEditor).toHaveBeenCalledWith({
      cwd: path.join(fs.realpathSync(test.agentDir), "web-search.json"),
      editor: "vscode",
    });
  });
});

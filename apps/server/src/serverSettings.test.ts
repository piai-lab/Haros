import * as NodeServices from "@effect/platform-node/NodeServices";
import { dirname } from "node:path";
import { DEFAULT_GIT_TEXT_GENERATION_MODEL, DEFAULT_MODEL_BY_PROVIDER } from "@omnimind/contracts";
import { Effect, Fiber, FileSystem, Layer, Option, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { ServerConfig } from "./config";
import { ServerSettingsLive, ServerSettingsService } from "./serverSettings";

const serverConfigLayer = ServerConfig.layerTest(process.cwd(), {
  prefix: "omnimind-settings-test-",
}).pipe(Layer.provide(NodeServices.layer));
const makeTestLayer = Layer.merge(NodeServices.layer, serverConfigLayer);
const testLayer = Layer.merge(makeTestLayer, ServerSettingsLive.pipe(Layer.provide(makeTestLayer)));

const runWithSettings = <A, E>(
  effect: Effect.Effect<A, E, ServerSettingsService | ServerConfig | FileSystem.FileSystem>,
) => Effect.runPromise(effect.pipe(Effect.provide(testLayer)) as Effect.Effect<A, E, never>);

describe("ServerSettingsService", () => {
  it("loads defaults when settings file does not exist", async () => {
    const settings = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        return yield* service.getSettings;
      }),
    );

    expect(settings.providers.codex.binaryPath).toBe("codex");
    expect(settings.providers.grok.binaryPath).toBe("grok");
    expect(settings.defaultThreadEnvMode).toBe("local");
    expect(settings.enableProviderUpdateChecks).toBe(true);
    expect(settings.textGenerationModelSelection).toEqual({
      provider: "codex",
      model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
    });
  });

  it("preserves an explicitly selected previous Git writing model", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(dirname(settingsPath), { recursive: true });
        yield* fs.writeFileString(
          settingsPath,
          JSON.stringify({
            revision: 7,
            migrationVersion: 1,
            settings: {
              textGenerationModelSelection: {
                provider: "codex",
                model: "gpt-5.4-mini",
              },
            },
          }),
        );

        yield* service.start;
        const settings = yield* service.getSettings;
        const persisted = JSON.parse(yield* fs.readFileString(settingsPath)) as {
          migrationVersion: number;
          settings: { textGenerationModelSelection: { model: string } };
        };
        return { settings, persisted };
      }),
    );

    expect(result.settings.textGenerationModelSelection.model).toBe("gpt-5.4-mini");
    expect(result.persisted.migrationVersion).toBe(1);
    expect(result.persisted.settings.textGenerationModelSelection.model).toBe("gpt-5.4-mini");
  });

  it("persists updates and reloads them", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;

        const updated = yield* service.updateSettings({
          enableAssistantStreaming: true,
          enableProviderUpdateChecks: false,
          providers: {
            codex: {
              binaryPath: "/usr/local/bin/codex",
              customModels: ["gpt-custom"],
            },
          },
        });
        const raw = yield* fs.readFileString(settingsPath);
        return { updated, parsed: JSON.parse(raw) as unknown };
      }),
    );

    expect(result.updated.enableAssistantStreaming).toBe(true);
    expect(result.updated.enableProviderUpdateChecks).toBe(false);
    expect(result.updated.providers.codex.binaryPath).toBe("/usr/local/bin/codex");
    expect(result.parsed).toMatchObject({
      revision: 1,
      migrationVersion: 1,
      settings: {
        enableAssistantStreaming: true,
        enableProviderUpdateChecks: false,
        providers: {
          codex: {
            binaryPath: "/usr/local/bin/codex",
            customModels: ["gpt-custom"],
          },
        },
      },
    });
  });

  it("rejects provider-only runtime-catalog switches before persistence", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        const updateExit = yield* Effect.exit(
          service.updateSettings({
            textGenerationModelSelection: { provider: "omnimind" },
          }),
        );
        return {
          updateExit,
          snapshot: yield* service.getSnapshot,
        };
      }),
    );

    expect(result.updateExit._tag).toBe("Failure");
    expect(result.snapshot.revision).toBe(0);
    expect(result.snapshot.settings.textGenerationModelSelection).toEqual({
      provider: "codex",
      model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
    });
  });

  it("persists an explicit runtime-catalog model selection exactly", async () => {
    const selection = {
      provider: "omnimind" as const,
      model: "deepseek/deepseek-v4-pro",
      options: { thinkingLevel: "high" as const },
    };
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        const settings = yield* service.updateSettings({
          textGenerationModelSelection: selection,
        });
        return {
          settings,
          snapshot: yield* service.getSnapshot,
        };
      }),
    );

    expect(result.settings.textGenerationModelSelection).toEqual(selection);
    expect(result.snapshot.revision).toBe(1);
    expect(result.snapshot.settings.textGenerationModelSelection).toEqual(selection);
  });

  it("keeps provider passwords server-only and returns configured flags to clients", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;
        const view = yield* service.updateSettingsView({
          providers: {
            kilo: { serverPassword: "kilo-secret" },
            opencode: { serverPassword: "opencode-secret" },
          },
        });
        const internal = yield* service.getSettings;
        const persisted = yield* fs.readFileString(settingsPath);
        return { view, internal, persisted };
      }),
    );

    expect(result.internal.providers.kilo.serverPasswordConfigured).toBe(true);
    expect(result.internal.providers.opencode.serverPasswordConfigured).toBe(true);
    expect(result.view.providers.kilo).toMatchObject({ serverPasswordConfigured: true });
    expect(result.view.providers.opencode).toMatchObject({ serverPasswordConfigured: true });
    expect(JSON.stringify(result.internal)).not.toContain("kilo-secret");
    expect(JSON.stringify(result.internal)).not.toContain("opencode-secret");
    expect(JSON.stringify(result.view)).not.toContain("kilo-secret");
    expect(JSON.stringify(result.view)).not.toContain("opencode-secret");
    expect(JSON.stringify(result.view)).not.toContain('"serverPassword"');
    expect(result.persisted).not.toContain("kilo-secret");
    expect(result.persisted).not.toContain("opencode-secret");
  });

  it("keeps the customized default prompt out of public views and streams", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const initialView = yield* service.getSettingsView;
        const streamedViewFiber = yield* Stream.runHead(service.streamViews).pipe(
          Effect.forkChild({ startImmediately: true }),
        );
        const mutation = yield* service.mutateOmniMindDefaultPrompt("private one", "private two");
        const streamedView = Option.getOrThrow(yield* Fiber.join(streamedViewFiber));
        return { initialView, mutation, streamedView };
      }).pipe(
        Effect.provide(
          ServerSettingsService.layerTest({
            providers: { omnimind: { defaultPrompt: "private one" } },
          }),
        ),
      ),
    );

    expect(result.mutation.state).toBe("changed");
    expect(result.initialView.providers.omnimind).not.toHaveProperty("defaultPrompt");
    expect(result.streamedView.providers.omnimind).not.toHaveProperty("defaultPrompt");
    expect(JSON.stringify(result.initialView)).not.toContain("private one");
    expect(JSON.stringify(result.streamedView)).not.toContain("private two");
  });

  it("serializes default-prompt compare-and-set so one concurrent edit conflicts", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const mutations = yield* Effect.all(
          [
            service.mutateOmniMindDefaultPrompt(null, "first"),
            service.mutateOmniMindDefaultPrompt(null, "second"),
          ],
          { concurrency: "unbounded" },
        );
        return {
          mutations,
          snapshot: yield* service.getSnapshot,
        };
      }).pipe(Effect.provide(ServerSettingsService.layerTest())),
    );

    expect(result.mutations.map(({ state }) => state).sort()).toEqual(["changed", "conflict"]);
    expect(["first", "second"]).toContain(
      result.snapshot.settings.providers.omnimind.defaultPrompt,
    );
    expect(result.snapshot.revision).toBe(1);
  });

  it("resolves text generation selection away from disabled providers", async () => {
    const settings = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        return yield* service.getSettings;
      }).pipe(
        Effect.provide(
          ServerSettingsService.layerTest({
            textGenerationModelSelection: {
              provider: "antigravity",
              model: DEFAULT_MODEL_BY_PROVIDER.antigravity,
            },
            providers: {
              antigravity: { enabled: false },
            },
          }),
        ),
      ),
    );

    expect(settings.textGenerationModelSelection.provider).toBe("codex");
    expect(settings.textGenerationModelSelection.model).toBe(DEFAULT_MODEL_BY_PROVIDER.codex);
  });
});

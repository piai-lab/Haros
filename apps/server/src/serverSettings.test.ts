import * as NodeServices from "@effect/platform-node/NodeServices";
import { basename, dirname } from "node:path";
import { DEFAULT_GIT_TEXT_GENERATION_MODEL, DEFAULT_MODEL_BY_PROVIDER } from "@omnimind/contracts";
import { Effect, FileSystem, Layer } from "effect";
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
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;
        return {
          settings: yield* service.getSettings,
          settingsFileExists: yield* fs.exists(settingsPath),
        };
      }),
    );

    const { settings } = result;
    expect(settings.providers.codex.binaryPath).toBe("codex");
    expect(settings.providers.grok.binaryPath).toBe("grok");
    expect(settings.defaultThreadEnvMode).toBe("local");
    expect(settings.enableProviderUpdateChecks).toBe(true);
    expect(settings.textGenerationModelSelection).toEqual({
      provider: "codex",
      model: DEFAULT_GIT_TEXT_GENERATION_MODEL,
    });
    expect(settings.agentTools.disabledBuiltInGroups).toEqual(["device"]);
    expect(result.settingsFileExists).toBe(false);
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
          settings: {
            textGenerationModelSelection: { model: string };
            agentTools: { disabledBuiltInGroups: string[] };
          };
        };
        return { settings, persisted };
      }),
    );

    expect(result.settings.textGenerationModelSelection.model).toBe("gpt-5.4-mini");
    expect(result.settings.agentTools.disabledBuiltInGroups).toEqual([]);
    expect(result.persisted.migrationVersion).toBe(2);
    expect(result.persisted.settings).toMatchObject({
      agentTools: { disabledBuiltInGroups: [] },
    });
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
      migrationVersion: 2,
      settings: {
        enableAssistantStreaming: true,
        enableProviderUpdateChecks: false,
        providers: {
          codex: {
            binaryPath: "/usr/local/bin/codex",
            customModels: ["gpt-custom"],
          },
        },
        agentTools: { disabledBuiltInGroups: ["device"] },
      },
    });
  });

  it.each([
    {
      name: "an explicit legacy Device-on choice",
      disabledBuiltInGroups: [] as string[],
      expected: [] as string[],
    },
    {
      name: "an explicit Device-off choice",
      disabledBuiltInGroups: ["device"],
      expected: ["device"],
    },
    {
      name: "unknown bounded group ids",
      disabledBuiltInGroups: ["future-group", "device"],
      expected: ["device", "future-group"],
    },
  ])(
    "preserves $name while migrating the settings envelope",
    async ({ disabledBuiltInGroups, expected }) => {
      const result = await runWithSettings(
        Effect.gen(function* () {
          const service = yield* ServerSettingsService;
          const { settingsPath } = yield* ServerConfig;
          const fs = yield* FileSystem.FileSystem;
          yield* fs.makeDirectory(dirname(settingsPath), { recursive: true });
          yield* fs.writeFileString(
            settingsPath,
            JSON.stringify({
              revision: 4,
              migrationVersion: 1,
              settings: { agentTools: { disabledBuiltInGroups } },
            }),
          );
          yield* service.start;
          return {
            snapshot: yield* service.getSnapshot,
            persisted: JSON.parse(yield* fs.readFileString(settingsPath)) as {
              revision: number;
              migrationVersion: number;
              settings: { agentTools: { disabledBuiltInGroups: string[] } };
            },
          };
        }),
      );

      expect(result.snapshot.revision).toBe(5);
      expect(result.snapshot.settings.agentTools.disabledBuiltInGroups).toEqual(expected);
      expect(result.persisted).toMatchObject({
        revision: 5,
        migrationVersion: 2,
        settings: { agentTools: { disabledBuiltInGroups: expected } },
      });
    },
  );

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

  it("quarantines a corrupt snapshot and uses the fresh Device-off default", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(dirname(settingsPath), { recursive: true });
        yield* fs.writeFileString(settingsPath, "{not-json");
        yield* service.start;
        return {
          settings: yield* service.getSettings,
          originalExists: yield* fs.exists(settingsPath),
          siblingNames: yield* fs.readDirectory(dirname(settingsPath)),
          settingsFileName: basename(settingsPath),
        };
      }),
    );

    expect(result.settings.agentTools.disabledBuiltInGroups).toEqual(["device"]);
    expect(result.originalExists).toBe(false);
    expect(
      result.siblingNames.some((name) => name.startsWith(`${result.settingsFileName}.invalid-`)),
    ).toBe(true);
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

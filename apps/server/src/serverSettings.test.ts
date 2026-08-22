import * as NodeServices from "@effect/platform-node/NodeServices";
import { chmod } from "node:fs/promises";
import { basename, dirname } from "node:path";
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
    expect(settings.agentTools.builtInGroupOverrides).toEqual({});
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
            agentTools: { builtInGroupOverrides: Record<string, Record<string, boolean>> };
          };
        };
        return { settings, persisted };
      }),
    );

    expect(result.settings.textGenerationModelSelection.model).toBe("gpt-5.4-mini");
    expect(result.settings.agentTools.builtInGroupOverrides).toEqual({
      agent: { device: true },
      studio: { device: true },
    });
    expect(result.persisted.migrationVersion).toBe(4);
    expect(result.persisted.settings).toMatchObject({
      agentTools: {
        builtInGroupOverrides: { agent: { device: true }, studio: { device: true } },
      },
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
      migrationVersion: 4,
      settings: {
        enableAssistantStreaming: true,
        enableProviderUpdateChecks: false,
        providers: {
          codex: {
            binaryPath: "/usr/local/bin/codex",
            customModels: ["gpt-custom"],
          },
        },
        agentTools: { builtInGroupOverrides: {} },
      },
    });
  });

  it("retires only the old OmniMind model hint field on the next normal settings save", async () => {
    const retiredKey = ["custom", "Models"].join("");
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
            migrationVersion: 4,
            settings: {
              enableAssistantStreaming: true,
              enableProviderUpdateChecks: false,
              addProjectBaseDirectory: "/tmp/omnimind-projects",
              providers: {
                omnimind: {
                  enabled: false,
                  [retiredKey]: ["legacy/provider-model"],
                  defaultPrompt: "private prompt",
                },
                codex: { customModels: ["custom/codex-model"] },
              },
              agentTools: { builtInGroupOverrides: {} },
            },
          }),
        );

        yield* service.start;
        const rawAfterRead = yield* fs.readFileString(settingsPath);
        const view = yield* service.getSettingsView;
        const internal = yield* service.getSettings;
        yield* service.updateSettings({ enableAssistantStreaming: false });
        const persisted = JSON.parse(yield* fs.readFileString(settingsPath)) as {
          revision: number;
          migrationVersion: number;
          settings: Record<string, unknown> & {
            providers: Record<string, unknown> & {
              omnimind: Record<string, unknown>;
              codex: { customModels: string[] };
            };
          };
        };
        return { rawAfterRead, view, internal, persisted };
      }),
    );

    expect(result.rawAfterRead).toContain(`"${retiredKey}":["legacy/provider-model"]`);
    expect(result.view.providers.omnimind).toEqual({ enabled: false });
    expect(result.internal.providers.omnimind).toEqual({
      enabled: false,
      defaultPrompt: "private prompt",
    });
    expect(result.persisted).toMatchObject({
      revision: 5,
      migrationVersion: 4,
      settings: {
        enableAssistantStreaming: false,
        enableProviderUpdateChecks: false,
        addProjectBaseDirectory: "/tmp/omnimind-projects",
        providers: {
          omnimind: { enabled: false, defaultPrompt: "private prompt" },
          codex: { customModels: ["custom/codex-model"] },
        },
        agentTools: { builtInGroupOverrides: {} },
      },
    });
    expect(result.persisted.settings.providers.omnimind).not.toHaveProperty(retiredKey);
  });

  it.each([
    {
      name: "an explicit legacy Device-on choice",
      disabledBuiltInGroups: [] as string[],
      expected: { agent: { device: true }, studio: { device: true } },
    },
    {
      name: "an explicit Device-off choice",
      disabledBuiltInGroups: ["device"],
      expected: {},
    },
    {
      name: "unknown bounded group ids",
      disabledBuiltInGroups: ["future-group", "device"],
      expected: {
        agent: { "future-group": false },
        chat: { "future-group": false },
        studio: { "future-group": false },
      },
    },
    {
      name: "the disabled legacy OmniMind aggregate",
      disabledBuiltInGroups: ["omnimind", "future-group"],
      expected: {
        agent: {
          automations: false,
          device: true,
          diagnostics: false,
          "future-group": false,
          goals: false,
          tasks: false,
        },
        chat: { "future-group": false },
        studio: {
          automations: false,
          device: true,
          diagnostics: false,
          "future-group": false,
          goals: false,
          tasks: false,
        },
      },
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
              migrationVersion: 2,
              settings: { agentTools: { disabledBuiltInGroups } },
            }),
          );
          yield* service.start;
          return {
            snapshot: yield* service.getSnapshot,
            persisted: JSON.parse(yield* fs.readFileString(settingsPath)) as {
              revision: number;
              migrationVersion: number;
              settings: {
                agentTools: {
                  builtInGroupOverrides: Record<string, Record<string, boolean>>;
                };
              };
            },
          };
        }),
      );

      expect(result.snapshot.revision).toBe(5);
      expect(result.snapshot.settings.agentTools.builtInGroupOverrides).toEqual(expected);
      expect(result.persisted).toMatchObject({
        revision: 5,
        migrationVersion: 4,
        settings: { agentTools: { builtInGroupOverrides: expected } },
      });
    },
  );

  it("performs one monotonic migration when concurrent callers start the service", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(dirname(settingsPath), { recursive: true });
        yield* fs.writeFileString(
          settingsPath,
          JSON.stringify({ revision: 9, migrationVersion: 1, settings: {} }),
        );
        yield* Effect.all([service.start, service.start], { concurrency: "unbounded" });
        return {
          snapshot: yield* service.getSnapshot,
          persisted: JSON.parse(yield* fs.readFileString(settingsPath)) as {
            revision: number;
            migrationVersion: number;
          },
        };
      }),
    );

    expect(result.snapshot.revision).toBe(10);
    expect(result.persisted).toMatchObject({ revision: 10, migrationVersion: 4 });
  });

  it.each([1, 2, 3])("upgrades a raw v%s envelope directly to v4", async (migrationVersion) => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(dirname(settingsPath), { recursive: true });
        yield* fs.writeFileString(
          settingsPath,
          JSON.stringify({
            revision: migrationVersion,
            migrationVersion,
            settings: {
              agentTools: { disabledBuiltInGroups: ["device", "future-group"] },
            },
          }),
        );
        yield* service.start;
        return {
          snapshot: yield* service.getSnapshot,
          persisted: JSON.parse(yield* fs.readFileString(settingsPath)) as {
            migrationVersion: number;
            settings: { agentTools: Record<string, unknown> };
          },
        };
      }),
    );

    expect(result.snapshot.migrationVersion).toBe(4);
    expect(result.snapshot.settings.agentTools.builtInGroupOverrides).toEqual({
      agent: { "future-group": false },
      chat: { "future-group": false },
      studio: { "future-group": false },
    });
    expect(result.persisted.migrationVersion).toBe(4);
    expect(result.persisted.settings.agentTools).not.toHaveProperty("disabledBuiltInGroups");
  });

  it("preserves 32 legacy unknown groups alongside a known Device-on override", async () => {
    const unknownGroups = Array.from({ length: 32 }, (_, index) => `future-${index}`);
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(dirname(settingsPath), { recursive: true });
        yield* fs.writeFileString(
          settingsPath,
          JSON.stringify({
            revision: 8,
            migrationVersion: 3,
            settings: { agentTools: { disabledBuiltInGroups: unknownGroups } },
          }),
        );
        yield* service.start;
        return yield* service.getSnapshot;
      }),
    );

    const overrides = result.settings.agentTools.builtInGroupOverrides;
    expect(overrides.agent?.device).toBe(true);
    expect(overrides.studio?.device).toBe(true);
    for (const group of unknownGroups) {
      expect(overrides.agent?.[group]).toBe(false);
      expect(overrides.chat?.[group]).toBe(false);
      expect(overrides.studio?.[group]).toBe(false);
    }
    expect(Object.keys(overrides.agent ?? {})).toHaveLength(33);
    expect(Object.keys(overrides.chat ?? {})).toHaveLength(32);
    expect(Object.keys(overrides.studio ?? {})).toHaveLength(33);
  });

  it("returns only revision/settings pairs committed under the same semaphore", async () => {
    const observations = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const [, readers] = yield* Effect.all(
          [
            Effect.forEach(
              Array.from({ length: 40 }, (_, index) => index + 1),
              (revision) =>
                service
                  .updateSettings({ addProjectBaseDirectory: String(revision) })
                  .pipe(Effect.andThen(Effect.yieldNow)),
              { concurrency: 1, discard: true },
            ),
            Effect.all(
              Array.from({ length: 4 }, () =>
                Effect.forEach(
                  Array.from({ length: 80 }),
                  () => service.getSnapshot.pipe(Effect.tap(() => Effect.yieldNow)),
                  { concurrency: 1 },
                ),
              ),
              { concurrency: "unbounded" },
            ),
          ] as const,
          { concurrency: "unbounded" },
        );
        return readers.flat();
      }).pipe(Effect.provide(ServerSettingsService.layerTest())),
    );

    for (const snapshot of observations) {
      expect(
        snapshot.revision === 0
          ? snapshot.settings.addProjectBaseDirectory
          : Number(snapshot.settings.addProjectBaseDirectory),
      ).toBe(snapshot.revision === 0 ? "" : snapshot.revision);
    }
  });

  it("fails startup without publishing migrated state when the atomic write cannot commit", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        const settingsDirectory = dirname(settingsPath);
        yield* fs.makeDirectory(settingsDirectory, { recursive: true });
        yield* fs.writeFileString(
          settingsPath,
          JSON.stringify({ revision: 11, migrationVersion: 1, settings: {} }),
        );
        yield* Effect.promise(() => chmod(settingsDirectory, 0o500));
        const startExit = yield* Effect.exit(service.start).pipe(
          Effect.ensuring(Effect.promise(() => chmod(settingsDirectory, 0o700))),
        );
        return {
          startExit,
          snapshot: yield* service.getSnapshot,
          persisted: JSON.parse(yield* fs.readFileString(settingsPath)) as {
            revision: number;
            migrationVersion: number;
          },
        };
      }),
    );

    expect(result.startExit._tag).toBe("Failure");
    expect(result.snapshot.revision).toBe(0);
    expect(result.snapshot.settings.agentTools.builtInGroupOverrides).toEqual({});
    expect(result.persisted).toMatchObject({ revision: 11, migrationVersion: 1 });
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

    expect(result.settings.agentTools.builtInGroupOverrides).toEqual({});
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

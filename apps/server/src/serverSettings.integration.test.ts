import * as NodeServices from "@effect/platform-node/NodeServices";
import { chmod } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { DEFAULT_GIT_TEXT_GENERATION_MODEL, DEFAULT_MODEL_BY_PROVIDER } from "@harnessos/contracts";
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
    expect(settings.engines.codex.binaryPath).toBe("codex");
    expect(settings.engines.grok.binaryPath).toBe("grok");
    expect(settings.defaultThreadEnvMode).toBe("local");
    expect(settings.enableEngineUpdateChecks).toBe(true);
    expect(settings.textGenerationEngineSelection).toEqual({
      engine: "codex",
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
              textGenerationEngineSelection: {
                engine: "codex",
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
            textGenerationEngineSelection: { model: string };
            agentTools: { builtInGroupOverrides: Record<string, Record<string, boolean>> };
          };
        };
        return { settings, persisted };
      }),
    );

    expect(result.settings.textGenerationEngineSelection.model).toBe("gpt-5.4-mini");
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
    expect(result.persisted.settings.textGenerationEngineSelection.model).toBe("gpt-5.4-mini");
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
          enableEngineUpdateChecks: false,
          engines: {
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
    expect(result.updated.enableEngineUpdateChecks).toBe(false);
    expect(result.updated.engines.codex.binaryPath).toBe("/usr/local/bin/codex");
    expect(result.parsed).toMatchObject({
      revision: 1,
      migrationVersion: 4,
      settings: {
        enableAssistantStreaming: true,
        enableEngineUpdateChecks: false,
        engines: {
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
              enableEngineUpdateChecks: false,
              addProjectBaseDirectory: "/tmp/omnimind-projects",
              engines: {
                oa: {
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
            engines: Record<string, unknown> & {
              oa: Record<string, unknown>;
              codex: { customModels: string[] };
            };
          };
        };
        return { rawAfterRead, view, internal, persisted };
      }),
    );

    expect(result.rawAfterRead).toContain(`"${retiredKey}":["legacy/provider-model"]`);
    expect(result.view.engines.oa).toEqual({ enabled: false });
    expect(result.internal.engines.oa).toEqual({
      enabled: false,
      defaultPrompt: "private prompt",
    });
    expect(result.persisted).toMatchObject({
      revision: 5,
      migrationVersion: 4,
      settings: {
        enableAssistantStreaming: false,
        enableEngineUpdateChecks: false,
        addProjectBaseDirectory: "/tmp/omnimind-projects",
        engines: {
          oa: { enabled: false, defaultPrompt: "private prompt" },
          codex: { customModels: ["custom/codex-model"] },
        },
        agentTools: { builtInGroupOverrides: {} },
      },
    });
    expect(result.persisted.settings.engines.oa).not.toHaveProperty(retiredKey);
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
      disabledBuiltInGroups: ["oa", "future-group"],
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

  it("rejects engine-only runtime-catalog switches before persistence", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        const updateExit = yield* Effect.exit(
          service.updateSettings({
            textGenerationEngineSelection: { engine: "oa" },
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
    expect(result.snapshot.settings.textGenerationEngineSelection).toEqual({
      engine: "codex",
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
      engine: "oa" as const,
      model: "deepseek/deepseek-v4-pro",
      options: { thinkingLevel: "high" as const },
    };
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        const settings = yield* service.updateSettings({
          textGenerationEngineSelection: selection,
        });
        return {
          settings,
          snapshot: yield* service.getSnapshot,
        };
      }),
    );

    expect(result.settings.textGenerationEngineSelection).toEqual(selection);
    expect(result.snapshot.revision).toBe(1);
    expect(result.snapshot.settings.textGenerationEngineSelection).toEqual(selection);
  });

  it("keeps engine passwords server-only and returns configured flags to clients", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;
        yield* service.updateEngineCredential("kilo", "kilo-secret");
        const view = yield* service.updateEngineCredential("opencode", "opencode-secret");
        const internal = yield* service.getSettings;
        const settingsFileExists = yield* fs.exists(settingsPath);
        const persisted = settingsFileExists ? yield* fs.readFileString(settingsPath) : "";
        return { view, internal, persisted, settingsFileExists };
      }),
    );

    expect(result.internal.engines.kilo.serverPasswordConfigured).toBe(true);
    expect(result.internal.engines.opencode.serverPasswordConfigured).toBe(true);
    expect(result.view.engines.kilo).toMatchObject({ serverPasswordConfigured: true });
    expect(result.view.engines.opencode).toMatchObject({ serverPasswordConfigured: true });
    expect(JSON.stringify(result.internal)).not.toContain("kilo-secret");
    expect(JSON.stringify(result.internal)).not.toContain("opencode-secret");
    expect(JSON.stringify(result.view)).not.toContain("kilo-secret");
    expect(JSON.stringify(result.view)).not.toContain("opencode-secret");
    expect(JSON.stringify(result.view)).not.toContain('"serverPassword"');
    expect(result.settingsFileExists).toBe(false);
    expect(result.persisted).not.toContain("kilo-secret");
    expect(result.persisted).not.toContain("opencode-secret");
  });

  it("publishes credential state without writing settings JSON or incrementing its revision", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;
        yield* service.updateSettings({ defaultEngine: "codex" });
        const before = yield* fs.readFileString(settingsPath);
        const beforeSnapshot = yield* service.getSnapshot;
        const view = yield* service.updateEngineCredential("kilo", "credential-canary");
        const after = yield* fs.readFileString(settingsPath);
        const afterSnapshot = yield* service.getSnapshot;
        return { before, beforeSnapshot, view, after, afterSnapshot };
      }),
    );

    expect(result.after).toBe(result.before);
    expect(result.afterSnapshot.revision).toBe(result.beforeSnapshot.revision);
    expect(result.view.engines.kilo.serverPasswordConfigured).toBe(true);
    expect(result.afterSnapshot.settings.engines.kilo.serverPasswordConfigured).toBe(true);
    expect(result.after).not.toContain("credential-canary");
  });

  it("projects credentials onto the latest external non-secret settings snapshot", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;
        yield* service.updateSettings({ defaultEngine: "codex" });
        const external = JSON.parse(yield* fs.readFileString(settingsPath)) as {
          revision: number;
          settings: { defaultEngine: string; addProjectBaseDirectory: string };
        };
        external.revision = 9;
        external.settings.defaultEngine = "pi";
        external.settings.addProjectBaseDirectory = "/tmp/external-projects";
        const externalBytes = `${JSON.stringify(external, null, 2)}\n`;
        yield* fs.writeFileString(settingsPath, externalBytes);

        const view = yield* service.updateEngineCredential("kilo", "credential-canary");
        const snapshot = yield* service.getSnapshot;
        return {
          view,
          snapshot,
          persisted: yield* fs.readFileString(settingsPath),
          externalBytes,
        };
      }),
    );

    expect(result.view).toMatchObject({
      defaultEngine: "pi",
      addProjectBaseDirectory: "/tmp/external-projects",
      engines: { kilo: { serverPasswordConfigured: true } },
    });
    expect(result.snapshot.revision).toBe(9);
    expect(result.persisted).toBe(result.externalBytes);
    expect(result.persisted).not.toContain("credential-canary");
  });

  it("does not mutate the credential when the fresh non-secret snapshot cannot be loaded", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        const { settingsPath } = yield* ServerConfig;
        const fs = yield* FileSystem.FileSystem;
        yield* service.start;
        yield* service.updateSettings({ defaultEngine: "codex" });
        yield* service.updateEngineCredential("kilo", "credential-canary");
        const validBytes = yield* fs.readFileString(settingsPath);
        yield* fs.remove(settingsPath);
        yield* fs.makeDirectory(settingsPath);

        const rejected = yield* Effect.exit(service.updateEngineCredential("kilo", ""));
        yield* fs.remove(settingsPath, { recursive: true });
        yield* fs.writeFileString(settingsPath, validBytes);
        const afterRecovery = yield* service.updateSettings({ enableAssistantStreaming: false });
        return { rejected, afterRecovery };
      }),
    );

    expect(result.rejected._tag).toBe("Failure");
    expect(result.afterRecovery.engines.kilo.serverPasswordConfigured).toBe(true);
  });

  it("converges concurrent settings and credential mutations to one fresh projection", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        const firstSubscriber = yield* Stream.runCollect(
          service.streamViews.pipe(Stream.take(2)),
        ).pipe(Effect.forkChild({ startImmediately: true }));
        const secondSubscriber = yield* Stream.runCollect(
          service.streamViews.pipe(Stream.take(2)),
        ).pipe(Effect.forkChild({ startImmediately: true }));
        yield* Effect.yieldNow;
        yield* Effect.all(
          [
            service.updateSettings({
              defaultEngine: "pi",
              addProjectBaseDirectory: "/tmp/latest-projects",
            }),
            service.updateEngineCredential("opencode", "credential-canary"),
          ],
          { concurrency: "unbounded" },
        );
        return {
          first: [...(yield* Fiber.join(firstSubscriber))],
          second: [...(yield* Fiber.join(secondSubscriber))],
          snapshot: yield* service.getSnapshot,
          view: yield* service.getSettingsView,
        };
      }),
    );

    for (const subscriber of [result.first, result.second]) {
      expect(subscriber.at(-1)).toMatchObject({
        defaultEngine: "pi",
        addProjectBaseDirectory: "/tmp/latest-projects",
        engines: { opencode: { serverPasswordConfigured: true } },
      });
    }
    expect(result.snapshot.revision).toBe(1);
    expect(result.view).toMatchObject({
      defaultEngine: "pi",
      addProjectBaseDirectory: "/tmp/latest-projects",
      engines: { opencode: { serverPasswordConfigured: true } },
    });
  });

  it("resets non-secret settings independently from engine credentials", async () => {
    const result = await runWithSettings(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        yield* service.start;
        yield* service.updateSettings({
          defaultEngine: "pi",
          addProjectBaseDirectory: "/tmp/custom",
        });
        yield* service.updateEngineCredential("kilo", "credential-canary");
        const reset = yield* service.resetSettingsView;
        const cleared = yield* service.updateEngineCredential("kilo", "");
        return { reset, cleared };
      }),
    );

    expect(result.reset.defaultEngine).toBe("oa");
    expect(result.reset.addProjectBaseDirectory).toBe("");
    expect(result.reset.engines.kilo.serverPasswordConfigured).toBe(true);
    expect(result.cleared.engines.kilo.serverPasswordConfigured).toBe(false);
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
            engines: { oa: { defaultPrompt: "private one" } },
          }),
        ),
      ),
    );

    expect(result.mutation.state).toBe("changed");
    expect(result.initialView.engines.oa).not.toHaveProperty("defaultPrompt");
    expect(result.streamedView.engines.oa).not.toHaveProperty("defaultPrompt");
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

    expect(result.mutations.map(({ state }) => state).toSorted()).toEqual(["changed", "conflict"]);
    expect(["first", "second"]).toContain(result.snapshot.settings.engines.oa.defaultPrompt);
    expect(result.snapshot.revision).toBe(1);
  });

  it("resolves text generation selection away from disabled engines", async () => {
    const settings = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ServerSettingsService;
        return yield* service.getSettings;
      }).pipe(
        Effect.provide(
          ServerSettingsService.layerTest({
            textGenerationEngineSelection: {
              engine: "antigravity",
              model: DEFAULT_MODEL_BY_PROVIDER.antigravity,
            },
            engines: {
              antigravity: { enabled: false },
            },
          }),
        ),
      ),
    );

    expect(settings.textGenerationEngineSelection.engine).toBe("codex");
    expect(settings.textGenerationEngineSelection.model).toBe(DEFAULT_MODEL_BY_PROVIDER.codex);
  });
});

import * as NodeServices from "@effect/platform-node/NodeServices";
import type { ServerEngineStatus } from "@harnessos/contracts";
import { DEFAULT_SERVER_SETTINGS, ServerEngineUpdateError } from "@harnessos/contracts";
import { describe, it, assert } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path, Sink, Stream } from "effect";
import { TestClock } from "effect/testing";
import * as PlatformError from "effect/PlatformError";
import { ChildProcessSpawner } from "effect/unstable/process";
import { vi } from "vitest";

import { HARNESSOS_CODEX_HOME_OVERLAY_DIR } from "../../codexHomePaths";
import { ServerConfig } from "../../config";
import { ServerSettingsService } from "../../serverSettings";
import { EngineHealth } from "../Services/EngineHealth";
import {
  readEngineStatusCache,
  resolveEngineStatusCachePath,
  writeEngineStatusCache,
} from "../engineStatusCache";
import {
  checkClaudeEngineStatus,
  checkAntigravityEngineStatus,
  checkCodexEngineStatus,
  checkCursorEngineStatus,
  checkGrokEngineStatus,
  checkOpenCodeEngineStatus,
  checkPiEngineStatus,
  hasCustomModelProvider,
  makeDisabledEngineStatus,
  makeCheckClaudeEngineStatus,
  makeCheckCodexEngineStatus,
  makeCheckCursorEngineStatus,
  makeCheckDroidEngineStatus,
  makeCheckGrokEngineStatus,
  makeCheckKiloEngineStatus,
  makeCheckOpenCodeEngineStatus,
  makeEngineHealthLive,
  parseAuthStatusFromOutput,
  parseClaudeAuthStatusFromOutput,
  PACKAGE_MANAGED_PROVIDER_UPDATES,
  engineStatusesEqual,
  EngineHealthLive,
  projectEngineStatusesForSettings,
  readCodexConfigModelProvider,
  resolvePassiveProviderPresence,
  stabilizeEngineStatusesAgainstTransientTimeouts,
} from "./EngineHealth";
import {
  HOMEBREW_ENGINE_UPDATE_TIMEOUT_MS,
  resolvePackageManagedEngineMaintenance,
} from "../engineMaintenance";

// ── Test helpers ────────────────────────────────────────────────────

const encoder = new TextEncoder();

function mockHandle(result: { stdout: string; stderr: string; code: number }) {
  return ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(1),
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(result.code)),
    isRunning: Effect.succeed(false),
    kill: () => Effect.void,
    stdin: Sink.drain,
    stdout: Stream.make(encoder.encode(result.stdout)),
    stderr: Stream.make(encoder.encode(result.stderr)),
    all: Stream.empty,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
  });
}

function mockSpawnerLayer(
  handler: (
    args: ReadonlyArray<string>,
    command: string,
    env: NodeJS.ProcessEnv | undefined,
    options:
      | {
          readonly env?: NodeJS.ProcessEnv;
          readonly windowsVerbatimArguments?: boolean;
        }
      | undefined,
  ) => {
    stdout: string;
    stderr: string;
    code: number;
  },
) {
  return Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make((command) => {
      const cmd = command as unknown as {
        command: string;
        args: ReadonlyArray<string>;
        options?: {
          env?: NodeJS.ProcessEnv;
          windowsVerbatimArguments?: boolean;
        };
      };
      return Effect.succeed(
        mockHandle(handler(cmd.args, cmd.command, cmd.options?.env, cmd.options)),
      );
    }),
  );
}

function failingSpawnerLayer(description: string) {
  return Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() =>
      Effect.fail(
        PlatformError.systemError({
          _tag: "NotFound",
          module: "ChildProcess",
          method: "spawn",
          description,
        }),
      ),
    ),
  );
}

function hangingSpawnerLayer(input: {
  readonly onKill: () => void;
  readonly shouldHang: (args: ReadonlyArray<string>, command: string) => boolean;
}) {
  const handle = ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(2),
    exitCode: Effect.never,
    isRunning: Effect.succeed(true),
    kill: () => Effect.sync(input.onKill),
    stdin: Sink.drain,
    stdout: Stream.never,
    stderr: Stream.never,
    all: Stream.never,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.never,
  });
  return Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make((command) => {
      const cmd = command as unknown as {
        command: string;
        args: ReadonlyArray<string>;
      };
      return input.shouldHang(cmd.args, cmd.command)
        ? Effect.succeed(handle)
        : Effect.succeed(mockHandle({ stdout: "", stderr: "", code: 0 }));
    }),
  );
}

const allProvidersDisabledSettings = {
  engines: {
    oa: { enabled: false },
    codex: { enabled: false },
    claude: { enabled: false },
    cursor: { enabled: false },
    antigravity: { enabled: false },
    grok: { enabled: false },
    droid: { enabled: false },
    kilo: { enabled: false },
    opencode: { enabled: false },
    pi: { enabled: false },
  },
} as const;

const allProvidersDisabledServerSettings = {
  ...DEFAULT_SERVER_SETTINGS,
  engines: {
    oa: { ...DEFAULT_SERVER_SETTINGS.engines.oa, enabled: false },
    codex: { ...DEFAULT_SERVER_SETTINGS.engines.codex, enabled: false },
    claude: { ...DEFAULT_SERVER_SETTINGS.engines.claude, enabled: false },
    cursor: { ...DEFAULT_SERVER_SETTINGS.engines.cursor, enabled: false },
    antigravity: { ...DEFAULT_SERVER_SETTINGS.engines.antigravity, enabled: false },
    grok: { ...DEFAULT_SERVER_SETTINGS.engines.grok, enabled: false },
    droid: { ...DEFAULT_SERVER_SETTINGS.engines.droid, enabled: false },
    kilo: { ...DEFAULT_SERVER_SETTINGS.engines.kilo, enabled: false },
    opencode: { ...DEFAULT_SERVER_SETTINGS.engines.opencode, enabled: false },
    pi: { ...DEFAULT_SERVER_SETTINGS.engines.pi, enabled: false },
  },
} satisfies typeof DEFAULT_SERVER_SETTINGS;

const disabledEngineHealthLayer = EngineHealthLive.pipe(
  Layer.provideMerge(ServerSettingsService.layerTest(allProvidersDisabledSettings)),
  Layer.provideMerge(ServerConfig.layerTest(process.cwd(), { prefix: "engine-health-disabled-" })),
);

const cachedReadyCodexStatus = {
  engine: "codex" as const,
  status: "ready" as const,
  available: true,
  authStatus: "authenticated" as const,
  checkedAt: "2026-06-16T12:00:00.000Z",
  message: "Codex CLI is installed and authenticated.",
} satisfies ServerEngineStatus;

/**
 * Create a temporary CODEX_HOME scoped to the current Effect test.
 * Cleanup is registered in the test scope rather than via Vitest hooks.
 */
function withTempCodexHome(configContent?: string) {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const tmpDir = yield* fileSystem.makeTempDirectoryScoped({ prefix: "harnessos-test-codex-" });
    const runtimeDir = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "harnessos-test-runtime-",
    });

    yield* Effect.acquireRelease(
      Effect.sync(() => {
        // Override the runtime and source homes so ambient state cannot skew
        // the resolved CODEX_HOME during this test.
        const overrides: Record<string, string> = {
          CODEX_HOME: tmpDir,
          HARNESSOS_HOME: runtimeDir,
        };

        const restore: Record<string, string | undefined> = {};
        for (const [key, value] of Object.entries(overrides)) {
          restore[key] = process.env[key];
          process.env[key] = value;
        }
        const originalPortkeyApiKey = process.env.PORTKEY_API_KEY;
        process.env.PORTKEY_API_KEY ??= "test-portkey-key";
        return { restore, originalPortkeyApiKey };
      }),
      ({ restore, originalPortkeyApiKey }) =>
        Effect.sync(() => {
          for (const [key, value] of Object.entries(restore)) {
            if (value !== undefined) {
              process.env[key] = value;
            } else {
              delete process.env[key];
            }
          }
          if (originalPortkeyApiKey !== undefined) {
            process.env.PORTKEY_API_KEY = originalPortkeyApiKey;
          } else {
            delete process.env.PORTKEY_API_KEY;
          }
        }),
    );

    if (configContent !== undefined) {
      yield* fileSystem.writeFileString(path.join(tmpDir, "config.toml"), configContent);
    }

    return { tmpDir, runtimeDir } as const;
  });
}

describe("passive engine presence", () => {
  it("settles from local executable/config facts without running a engine command", () => {
    const observedCommands: string[] = [];
    const presence = resolvePassiveProviderPresence(DEFAULT_SERVER_SETTINGS, (command) => {
      observedCommands.push(command);
      return command === "codex" ? "/test/bin/codex" : null;
    });

    assert.deepStrictEqual(presence, ["oa", "codex", "pi"]);
    assert.deepStrictEqual(observedCommands, [
      "codex",
      "claude",
      "cursor-agent",
      "agy",
      "grok",
      "droid",
      "kilo",
      "opencode",
    ]);
  });

  it("keeps disabled engines out of the settled presence fact", () => {
    const resolveCommand = vi.fn(() => "/unexpected");
    assert.deepStrictEqual(
      resolvePassiveProviderPresence(allProvidersDisabledServerSettings, resolveCommand),
      [],
    );
    assert.strictEqual(resolveCommand.mock.calls.length, 0);
  });
});

it.layer(NodeServices.layer)("EngineHealth", (it) => {
  describe("engine update commands", () => {
    it("delegates native Claude release-channel truth to Claude", () => {
      const definition = PACKAGE_MANAGED_PROVIDER_UPDATES.claude;
      assert.ok(definition);

      const capabilities = resolvePackageManagedEngineMaintenance(definition, {
        binaryPath: "claude",
        realCommandPath: "/Users/test/.local/share/claude/versions/2.1.100/claude",
      });

      assert.strictEqual(capabilities.latestVersionSource, null);
      assert.deepStrictEqual(capabilities.update, {
        command: "claude update",
        executable: "claude",
        args: ["update"],
        lockKey: "claude-native",
      });
    });

    it("keeps Claude's latest Homebrew cask source and command aligned", () => {
      const definition = PACKAGE_MANAGED_PROVIDER_UPDATES.claude;
      assert.ok(definition);

      const capabilities = resolvePackageManagedEngineMaintenance(definition, {
        binaryPath: "/opt/homebrew/bin/claude",
        realCommandPath: "/opt/homebrew/Caskroom/claude-code@latest/2.1.100/claude",
      });

      assert.deepStrictEqual(capabilities.latestVersionSource, {
        kind: "homebrew",
        name: "claude-code@latest",
        homebrewKind: "cask",
      });
      assert.deepStrictEqual(capabilities.update, {
        command: "brew upgrade --cask claude-code@latest",
        executable: "brew",
        args: ["upgrade", "--cask", "claude-code@latest"],
        lockKey: "homebrew",
        timeoutMs: HOMEBREW_ENGINE_UPDATE_TIMEOUT_MS,
      });
    });

    it("registers Antigravity's native updater", () => {
      const definition = PACKAGE_MANAGED_PROVIDER_UPDATES.antigravity;
      assert.ok(definition);

      const capabilities = resolvePackageManagedEngineMaintenance(definition, {
        binaryPath: "agy",
        realCommandPath: "/Users/test/.local/bin/agy",
        commandDirectory: "/Users/test/.local/bin",
      });

      assert.deepStrictEqual(capabilities.update, {
        command: "agy update",
        executable: "agy",
        args: ["update"],
        lockKey: "antigravity-native",
        pathPrepend: "/Users/test/.local/bin",
      });
    });

    it("updates npm-managed Kilo through its matching package manager and PATH", () => {
      const definition = PACKAGE_MANAGED_PROVIDER_UPDATES.kilo;
      assert.ok(definition);

      const capabilities = resolvePackageManagedEngineMaintenance(definition, {
        binaryPath: "kilo",
        realCommandPath:
          "/Users/test/.nvm/versions/node/v24.13.0/lib/node_modules/@kilocode/cli/bin/kilo",
        commandDirectory: "/Users/test/.nvm/versions/node/v24.13.0/bin",
      });

      assert.deepStrictEqual(capabilities.update, {
        command:
          "npm install -g --prefix /Users/test/.nvm/versions/node/v24.13.0 @kilocode/cli@latest",
        executable: "npm",
        args: [
          "install",
          "-g",
          "--prefix",
          "/Users/test/.nvm/versions/node/v24.13.0",
          "@kilocode/cli@latest",
        ],
        lockKey: "npm-global",
        pathPrepend: "/Users/test/.nvm/versions/node/v24.13.0/bin",
      });
    });

    it.effect("stops a hung engine process and persists a failed update state", () =>
      Effect.gen(function* () {
        let killed = false;
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const baseDir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "engine-update-timeout-",
        });
        yield* writeEngineStatusCache({
          filePath: resolveEngineStatusCachePath({
            stateDir: path.join(baseDir, "userdata"),
            engine: "kilo",
          }),
          engine: {
            engine: "kilo",
            status: "ready",
            available: true,
            authStatus: "authenticated",
            checkedAt: "2026-07-15T12:00:00.000Z",
            message: "Kilo CLI is installed and authenticated.",
            version: "7.3.46",
          },
        });
        const settings = {
          ...allProvidersDisabledServerSettings,
          engines: {
            ...allProvidersDisabledServerSettings.engines,
            kilo: {
              ...DEFAULT_SERVER_SETTINGS.engines.kilo,
              enabled: true,
              binaryPath:
                "/Users/test/.nvm/versions/node/v24.13.0/lib/node_modules/@kilocode/cli/bin/kilo",
            },
          },
        } satisfies typeof DEFAULT_SERVER_SETTINGS;
        const layer = makeEngineHealthLive({ engineUpdateTimeoutMs: 20 }).pipe(
          Layer.provideMerge(ServerSettingsService.layerTest(settings)),
          Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
          Layer.provideMerge(
            hangingSpawnerLayer({
              onKill: () => (killed = true),
              shouldHang: (args, command) =>
                command === "npm" &&
                args.join(" ") ===
                  "install -g --prefix /Users/test/.nvm/versions/node/v24.13.0 @kilocode/cli@latest",
            }),
          ),
        );

        const result = yield* Effect.gen(function* () {
          const engineHealth = yield* EngineHealth;
          return yield* TestClock.withLive(engineHealth.updateEngine({ engine: "kilo" }));
        }).pipe(Effect.provide(layer));
        const kilo = result.engines.find((engine) => engine.engine === "kilo");

        assert.strictEqual(killed, true);
        assert.strictEqual(kilo?.updateState?.status, "failed");
        assert.strictEqual(
          kilo?.updateState?.message,
          "Update timed out after 20 milliseconds. The engine process was stopped.",
        );
      }),
    );
  });

  describe("disabled engine handling", () => {
    it("builds an inert status for disabled engines", () => {
      assert.deepStrictEqual(makeDisabledEngineStatus("kilo", "2026-06-16T12:00:00.000Z"), {
        engine: "kilo",
        status: "warning",
        available: false,
        authStatus: "unknown",
        checkedAt: "2026-06-16T12:00:00.000Z",
        message: "Engine is disabled in Haros settings.",
      });
    });

    it("projects disabled settings over cached ready statuses", () => {
      const statuses = projectEngineStatusesForSettings(
        [cachedReadyCodexStatus],
        allProvidersDisabledServerSettings,
        "2026-06-16T12:05:00.000Z",
      );
      const codex = statuses.find((status) => status.engine === "codex");

      assert.strictEqual(statuses.length, 10);
      assert.strictEqual(codex?.available, false);
      assert.strictEqual(codex?.message, "Engine is disabled in Haros settings.");
    });

    it("suppresses cached update advisories when automatic update checks are disabled", () => {
      const statuses = projectEngineStatusesForSettings(
        [
          {
            ...cachedReadyCodexStatus,
            version: "0.129.0",
            versionAdvisory: {
              status: "behind_latest",
              currentVersion: "0.129.0",
              latestVersion: "0.130.0",
              updateCommand: "npm install -g @openai/codex@latest",
              canUpdate: true,
              checkedAt: "2026-06-16T12:00:00.000Z",
              message: "Update available.",
            },
          },
        ],
        { ...DEFAULT_SERVER_SETTINGS, enableEngineUpdateChecks: false },
        "2026-06-16T12:05:00.000Z",
      );
      const codex = statuses.find((status) => status.engine === "codex");

      assert.strictEqual(codex?.available, true);
      assert.strictEqual(codex?.version, "0.129.0");
      assert.strictEqual(codex?.versionAdvisory?.status, "unknown");
      assert.strictEqual(codex?.versionAdvisory?.latestVersion, null);
      assert.strictEqual(codex?.versionAdvisory?.canUpdate, false);
      assert.strictEqual(codex?.versionAdvisory?.updateCommand, null);
    });

    it.effect("does not expose cached ready statuses for disabled engines", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const baseDir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "engine-health-disabled-cache-",
        });
        const cachePath = resolveEngineStatusCachePath({
          stateDir: path.join(baseDir, "userdata"),
          engine: "codex",
        });
        yield* writeEngineStatusCache({
          filePath: cachePath,
          engine: cachedReadyCodexStatus,
        });

        const layer = EngineHealthLive.pipe(
          Layer.provideMerge(ServerSettingsService.layerTest(allProvidersDisabledSettings)),
          Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
        );
        const statuses = yield* Effect.gen(function* () {
          const engineHealth = yield* EngineHealth;
          return yield* engineHealth.getStatuses;
        }).pipe(Effect.provide(layer));
        const codex = statuses.find((status) => status.engine === "codex");
        const cachedCodex = yield* readEngineStatusCache(cachePath);

        assert.strictEqual(codex?.available, false);
        assert.strictEqual(codex?.message, "Engine is disabled in Haros settings.");
        assert.deepStrictEqual(cachedCodex, cachedReadyCodexStatus);
      }),
    );

    it.effect("projects cached ready status when a disabled engine is re-enabled", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const baseDir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "engine-health-enable-cache-",
        });
        const cachePath = resolveEngineStatusCachePath({
          stateDir: path.join(baseDir, "userdata"),
          engine: "codex",
        });
        yield* writeEngineStatusCache({
          filePath: cachePath,
          engine: cachedReadyCodexStatus,
        });

        let spawnCount = 0;
        const layer = EngineHealthLive.pipe(
          Layer.provideMerge(ServerSettingsService.layerTest(allProvidersDisabledSettings)),
          Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
          Layer.provideMerge(
            mockSpawnerLayer((args) => {
              spawnCount += 1;
              const joined = args.join(" ");
              if (joined === "--version") {
                return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
              }
              if (joined === "-c mcp_servers={} login status") {
                return { stdout: '{"authenticated":true}\n', stderr: "", code: 0 };
              }
              throw new Error(`Unexpected args: ${joined}`);
            }),
          ),
        );

        yield* Effect.gen(function* () {
          const engineHealth = yield* EngineHealth;
          const serverSettings = yield* ServerSettingsService;
          const disabledStatuses = yield* engineHealth.getStatuses;
          const disabledCodex = disabledStatuses.find((status) => status.engine === "codex");

          assert.strictEqual(disabledCodex?.available, false);
          assert.strictEqual(disabledCodex?.message, "Engine is disabled in Haros settings.");

          yield* serverSettings.updateSettings({
            engines: {
              codex: {
                enabled: true,
              },
            },
          });

          const currentStatuses = yield* engineHealth.getStatuses;
          const currentCodex = currentStatuses.find((status) => status.engine === "codex");
          assert.strictEqual(currentCodex?.available, true);
          assert.strictEqual(currentCodex?.authStatus, "authenticated");
          assert.notStrictEqual(currentCodex?.message, "Engine is disabled in Haros settings.");
          assert.strictEqual(spawnCount, 0);
        }).pipe(Effect.provide(layer));
      }),
    );

    it.effect("does not offer updates for disabled engines", () =>
      Effect.gen(function* () {
        const engineHealth = yield* EngineHealth;
        const statuses = yield* engineHealth.refresh;

        assert.strictEqual(statuses.length, 10);
        for (const status of statuses) {
          assert.strictEqual(status.available, false);
          assert.strictEqual(status.message, "Engine is disabled in Haros settings.");
          assert.strictEqual(status.versionAdvisory?.status, "unknown");
          assert.strictEqual(status.versionAdvisory?.canUpdate, false);
          assert.strictEqual(status.versionAdvisory?.updateCommand, null);
        }
      }).pipe(Effect.provide(disabledEngineHealthLayer)),
    );

    it.effect("rejects one-click updates for disabled engines", () =>
      Effect.gen(function* () {
        const engineHealth = yield* EngineHealth;
        const error = yield* Effect.flip(engineHealth.updateEngine({ engine: "kilo" }));

        assert.ok(error instanceof ServerEngineUpdateError);
        assert.strictEqual(error.engine, "kilo");
        assert.strictEqual(error.reason, "Engine is disabled in Haros settings.");
      }).pipe(Effect.provide(disabledEngineHealthLayer)),
    );
  });

  describe("startup refresh behavior", () => {
    it.effect("serves cached statuses without spawning engine CLIs on layer startup", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const baseDir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "engine-health-no-boot-refresh-",
        });
        let spawnCount = 0;
        const layer = EngineHealthLive.pipe(
          Layer.provideMerge(ServerSettingsService.layerTest(DEFAULT_SERVER_SETTINGS)),
          Layer.provideMerge(ServerConfig.layerTest(process.cwd(), baseDir)),
          Layer.provideMerge(
            mockSpawnerLayer(() => {
              spawnCount += 1;
              return { stdout: "", stderr: "", code: 0 };
            }),
          ),
        );

        const statuses = yield* Effect.gen(function* () {
          const engineHealth = yield* EngineHealth;
          return yield* engineHealth.getStatuses;
        }).pipe(Effect.provide(layer));

        assert.deepStrictEqual(statuses, []);
        assert.strictEqual(spawnCount, 0);
      }),
    );
  });

  describe("stabilizeEngineStatusesAgainstTransientTimeouts", () => {
    const previousReadyOpenCode = {
      engine: "opencode",
      status: "ready",
      available: true,
      authStatus: "unknown",
      version: "1.15.13",
      checkedAt: "2026-06-04T17:00:00.000Z",
      message: "OpenCode CLI is installed. Configure engine credentials inside OpenCode as needed.",
    } satisfies ServerEngineStatus;

    it("keeps an already usable engine available after a transient command timeout", () => {
      const result = stabilizeEngineStatusesAgainstTransientTimeouts(
        [previousReadyOpenCode],
        [
          {
            engine: "opencode",
            status: "error",
            available: false,
            authStatus: "unknown",
            checkedAt: "2026-06-04T17:01:00.000Z",
            message:
              "OpenCode CLI is installed but failed to run. Timed out while running command.",
          },
        ],
      );

      assert.deepStrictEqual(result, [
        {
          ...previousReadyOpenCode,
          checkedAt: "2026-06-04T17:01:00.000Z",
        },
      ]);
    });

    it("does not stabilize a timeout from a different checked binary", () => {
      const previous = {
        ...previousReadyOpenCode,
        checkedBinaryPath: "/custom/bin/opencode-a",
      } satisfies ServerEngineStatus;
      const next = {
        engine: "opencode",
        status: "error",
        available: false,
        authStatus: "unknown",
        checkedBinaryPath: "/custom/bin/opencode-b",
        checkedAt: "2026-06-04T17:01:00.000Z",
        message: "OpenCode CLI is installed but failed to run. Timed out while running command.",
      } satisfies ServerEngineStatus;

      assert.deepStrictEqual(stabilizeEngineStatusesAgainstTransientTimeouts([previous], [next]), [
        next,
      ]);
      assert.deepStrictEqual(
        stabilizeEngineStatusesAgainstTransientTimeouts(
          [previous],
          [{ ...next, checkedBinaryPath: previous.checkedBinaryPath }],
        ),
        [{ ...previous, checkedAt: next.checkedAt }],
      );
      assert.deepStrictEqual(
        stabilizeEngineStatusesAgainstTransientTimeouts([previousReadyOpenCode], [next]),
        [next],
      );
    });

    it("drops a cached update advisory when a transient timeout prevents verification", () => {
      const previousWithUpdate = {
        ...previousReadyOpenCode,
        versionAdvisory: {
          status: "behind_latest",
          currentVersion: "1.15.13",
          latestVersion: "1.16.0",
          updateCommand: "npm install -g opencode-ai@latest",
          canUpdate: true,
          checkedAt: "2026-06-04T17:00:00.000Z",
          message: "Update available.",
        },
      } satisfies ServerEngineStatus;

      const [result] = stabilizeEngineStatusesAgainstTransientTimeouts(
        [previousWithUpdate],
        [
          {
            engine: "opencode",
            status: "error",
            available: false,
            authStatus: "unknown",
            checkedAt: "2026-06-04T17:01:00.000Z",
            message:
              "OpenCode CLI is installed but failed to run. Timed out while running command.",
          },
        ],
      );

      assert.strictEqual(result?.status, "ready");
      assert.strictEqual(result?.available, true);
      assert.deepStrictEqual(result?.versionAdvisory, {
        status: "unknown",
        currentVersion: "1.15.13",
        latestVersion: null,
        updateCommand: null,
        canUpdate: false,
        checkedAt: "2026-06-04T17:01:00.000Z",
        message: null,
      });
    });

    it("does not hide non-timeout engine failures", () => {
      const unavailableStatus = {
        engine: "opencode",
        status: "error",
        available: false,
        authStatus: "unknown",
        checkedAt: "2026-06-04T17:01:00.000Z",
        message: "OpenCode CLI (`opencode`) is not installed or not on PATH.",
      } satisfies ServerEngineStatus;

      assert.deepStrictEqual(
        stabilizeEngineStatusesAgainstTransientTimeouts(
          [previousReadyOpenCode],
          [unavailableStatus],
        ),
        [unavailableStatus],
      );
    });

    it("keeps an already usable engine ready after a transient auth timeout warning", () => {
      const previousReadyClaude = {
        engine: "claude",
        status: "ready",
        available: true,
        authStatus: "authenticated",
        version: "2.1.162",
        checkedAt: "2026-06-04T17:00:00.000Z",
      } satisfies ServerEngineStatus;

      const result = stabilizeEngineStatusesAgainstTransientTimeouts(
        [previousReadyClaude],
        [
          {
            engine: "claude",
            status: "warning",
            available: true,
            authStatus: "unknown",
            version: "2.1.162",
            checkedAt: "2026-06-04T17:01:00.000Z",
            message:
              "Could not verify Claude authentication status. Timed out while running command.",
          },
        ],
      );

      assert.deepStrictEqual(result, [
        {
          ...previousReadyClaude,
          checkedAt: "2026-06-04T17:01:00.000Z",
        },
      ]);
    });

    it("does not keep a stale Claude auth error after a transient auth timeout", () => {
      const previousUnauthenticatedClaude = {
        engine: "claude",
        status: "error",
        available: true,
        authStatus: "unauthenticated",
        version: "2.1.162",
        checkedAt: "2026-06-04T17:00:00.000Z",
        message: "Claude is not authenticated. Run `claude auth login` and try again.",
      } satisfies ServerEngineStatus;
      const authTimeoutWarning = {
        engine: "claude",
        status: "warning",
        available: true,
        authStatus: "unknown",
        version: "2.1.162",
        checkedAt: "2026-06-04T17:01:00.000Z",
        message: "Could not verify Claude authentication status. Timed out while running command.",
      } satisfies ServerEngineStatus;

      assert.deepStrictEqual(
        stabilizeEngineStatusesAgainstTransientTimeouts(
          [previousUnauthenticatedClaude],
          [authTimeoutWarning],
        ),
        [authTimeoutWarning],
      );
    });
  });

  describe("engineStatusesEqual", () => {
    const readyCursor = {
      engine: "cursor",
      status: "ready",
      available: true,
      authStatus: "unknown",
      version: "2026.06.04-8f81907",
      checkedAt: "2026-06-04T17:00:00.000Z",
      message:
        "Cursor Agent CLI is installed. Sign in with Cursor if a session prompts for authentication.",
      versionAdvisory: {
        status: "current",
        currentVersion: "2026.06.04-8f81907",
        latestVersion: "2026.06.04-8f81907",
        updateCommand: null,
        canUpdate: true,
        checkedAt: "2026-06-04T17:00:00.000Z",
        message: null,
      },
    } satisfies ServerEngineStatus;

    it("ignores top-level and version-advisory checkedAt churn", () => {
      assert.strictEqual(
        engineStatusesEqual(
          [readyCursor],
          [
            {
              ...readyCursor,
              checkedAt: "2026-06-04T17:01:00.000Z",
              versionAdvisory: {
                ...readyCursor.versionAdvisory,
                checkedAt: "2026-06-04T17:01:00.000Z",
              },
            },
          ],
        ),
        true,
      );
    });

    it("detects meaningful version-advisory changes", () => {
      assert.strictEqual(
        engineStatusesEqual(
          [readyCursor],
          [
            {
              ...readyCursor,
              versionAdvisory: {
                ...readyCursor.versionAdvisory,
                status: "behind_latest",
                latestVersion: "2026.06.05-a1b2c3d",
              },
            },
          ],
        ),
        false,
      );
    });

    it("detects Auto capability and probe-binary changes", () => {
      const readyCodex = {
        ...readyCursor,
        engine: "codex",
        supportsAutoRuntimeMode: true,
        autoRuntimeModeBinaryPath: "codex",
      } satisfies ServerEngineStatus;

      assert.strictEqual(
        engineStatusesEqual([readyCodex], [{ ...readyCodex, supportsAutoRuntimeMode: false }]),
        false,
      );
      assert.strictEqual(
        engineStatusesEqual(
          [readyCodex],
          [{ ...readyCodex, autoRuntimeModeBinaryPath: "/custom/bin/codex" }],
        ),
        false,
      );
    });

    it("detects a change in the observed unavailable reason", () => {
      const unavailableCursor = {
        ...readyCursor,
        status: "error",
        available: false,
      } satisfies ServerEngineStatus;

      assert.strictEqual(
        engineStatusesEqual(
          [unavailableCursor],
          [{ ...unavailableCursor, unavailableReason: "not_installed" }],
        ),
        false,
      );
      assert.strictEqual(
        engineStatusesEqual(
          [{ ...unavailableCursor, checkedBinaryPath: "cursor-agent" }],
          [{ ...unavailableCursor, checkedBinaryPath: "agent" }],
        ),
        false,
      );
    });
  });

  // ── checkCodexEngineStatus tests ────────────────────────────────
  //
  // These tests control CODEX_HOME to ensure the custom-engine detection
  // in hasCustomModelProvider() does not interfere with the auth-probe
  // path being tested.

  describe("checkCodexEngineStatus", () => {
    it.effect("returns ready when codex is installed and authenticated", () =>
      Effect.gen(function* () {
        // Point CODEX_HOME at an empty tmp dir (no config.toml) so the
        // default code path (OpenAI engine, auth probe runs) is exercised.
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "authenticated");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status")
              return { stdout: "Logged in\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("uses configured codex binary for version and auth probes", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* makeCheckCodexEngineStatus("/custom/bin/codex");
        assert.strictEqual(status.status, "ready");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/codex");
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status")
              return { stdout: "Logged in\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("propagates verbatim Windows arguments through the Effect command", () => {
      const platform = vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      return Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* makeCheckCodexEngineStatus("C:\\tools(x86)\\codex.cmd");
        assert.strictEqual(status.status, "ready");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command, _env, options) => {
            assert.strictEqual(command, "C:\\Windows\\System32\\cmd.exe");
            assert.strictEqual(options?.windowsVerbatimArguments, true);
            const commandLine = args.at(-1) ?? "";
            if (commandLine.includes('"--version"')) {
              return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            }
            if (commandLine.includes('"-c" "mcp_servers={}" "login" "status"')) {
              return { stdout: "Logged in\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${args.join(" ")}`);
          }),
        ),
        Effect.ensuring(Effect.sync(() => platform.mockRestore())),
      );
    });

    it.effect("uses configured codex home for version, config, and auth probes", () => {
      let sawLoginStatusProbe = false;
      let expectedCodexHome: string | undefined;
      return Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const { tmpDir, runtimeDir } = yield* withTempCodexHome();
        yield* fileSystem.writeFileString(
          path.join(tmpDir, "config.toml"),
          'model_provider = "portkey"\n',
        );
        const configuredHome = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "harnessos-configured-codex-",
        });
        yield* fileSystem.writeFileString(
          path.join(configuredHome, "config.toml"),
          'model_provider = "openai"\n',
        );
        expectedCodexHome = path.join(runtimeDir, HARNESSOS_CODEX_HOME_OVERLAY_DIR);

        const status = yield* makeCheckCodexEngineStatus("codex", configuredHome);
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.message, undefined);
        assert.strictEqual(sawLoginStatusProbe, true);
        assert.notStrictEqual(configuredHome, tmpDir);
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, _command, env) => {
            assert.strictEqual(env?.CODEX_HOME, expectedCodexHome);
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status") {
              sawLoginStatusProbe = true;
              return { stdout: "Logged in\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      );
    });

    it.effect("returns unavailable when codex is missing", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, "not_installed");
        assert.strictEqual(status.message, "Codex CLI (`codex`) is not installed or not on PATH.");
      }).pipe(Effect.provide(failingSpawnerLayer("spawn codex ENOENT"))),
    );

    it.effect("returns unavailable when codex is below the minimum supported version", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, undefined);
        assert.strictEqual(
          status.message,
          "Codex CLI v0.36.0 is too old for Haros. Upgrade to v0.37.0 or newer and restart Haros.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 0.36.0\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("reports Auto unavailable for a supported but older Codex CLI", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.supportsAutoRuntimeMode, false);
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 0.123.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status")
              return { stdout: "Logged in\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unauthenticated when auth probe reports login required", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unauthenticated");
        assert.strictEqual(
          status.message,
          "Codex CLI is not authenticated. Run `codex login` and try again.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status") {
              return { stdout: "", stderr: "Not logged in. Run codex login.", code: 1 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unauthenticated when login status output includes 'not logged in'", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unauthenticated");
        assert.strictEqual(
          status.message,
          "Codex CLI is not authenticated. Run `codex login` and try again.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status")
              return { stdout: "Not logged in\n", stderr: "", code: 1 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns warning when login status command is unsupported", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "warning");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(
          status.message,
          "Codex CLI authentication status command is unavailable in this Codex version.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status") {
              return { stdout: "", stderr: "error: unknown command 'login'", code: 2 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );
  });

  // ── Custom model engine: checkCodexEngineStatus integration ───

  describe("checkCodexEngineStatus with custom model engine", () => {
    it.effect("skips auth probe and returns ready when a custom model engine is configured", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome(
          [
            'model_provider = "portkey"',
            "",
            "[model_providers.portkey]",
            'base_url = "https://api.portkey.ai/v1"',
            'env_key = "PORTKEY_API_KEY"',
          ].join("\n"),
        );
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.engine, "codex");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(
          status.message,
          "Using a custom Codex model engine; OpenAI login check skipped.",
        );
      }).pipe(
        Effect.provide(
          // The spawner only handles --version; if the test attempts
          // "login status" the throw proves the auth probe was NOT skipped.
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            throw new Error(`Auth probe should have been skipped but got args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("still reports error when codex CLI is missing even with custom engine", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome(
          [
            'model_provider = "portkey"',
            "",
            "[model_providers.portkey]",
            'base_url = "https://api.portkey.ai/v1"',
            'env_key = "PORTKEY_API_KEY"',
          ].join("\n"),
        );
        const status = yield* checkCodexEngineStatus;
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
      }).pipe(Effect.provide(failingSpawnerLayer("spawn codex ENOENT"))),
    );
  });

  describe("checkCodexEngineStatus with openai model engine", () => {
    it.effect("still runs auth probe when model_provider is openai", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "openai"\n');
        const status = yield* checkCodexEngineStatus;
        // The auth probe runs and sees "not logged in" → error
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.authStatus, "unauthenticated");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "codex 1.0.0\n", stderr: "", code: 0 };
            if (joined === "-c mcp_servers={} login status")
              return { stdout: "Not logged in\n", stderr: "", code: 1 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );
  });

  // ── parseAuthStatusFromOutput pure tests ──────────────────────────

  describe("parseAuthStatusFromOutput", () => {
    it("exit code 0 with no auth markers is ready", () => {
      const parsed = parseAuthStatusFromOutput({ stdout: "OK\n", stderr: "", code: 0 });
      assert.strictEqual(parsed.status, "ready");
      assert.strictEqual(parsed.authStatus, "authenticated");
    });

    it("JSON with authenticated=false is unauthenticated", () => {
      const parsed = parseAuthStatusFromOutput({
        stdout: '[{"authenticated":false}]\n',
        stderr: "",
        code: 0,
      });
      assert.strictEqual(parsed.status, "error");
      assert.strictEqual(parsed.authStatus, "unauthenticated");
    });

    it("JSON without auth marker is warning", () => {
      const parsed = parseAuthStatusFromOutput({
        stdout: '[{"ok":true}]\n',
        stderr: "",
        code: 0,
      });
      assert.strictEqual(parsed.status, "warning");
      assert.strictEqual(parsed.authStatus, "unknown");
    });
  });

  // ── readCodexConfigModelProvider tests ─────────────────────────────

  describe("readCodexConfigModelProvider", () => {
    it.effect("returns undefined when config file does not exist", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        assert.strictEqual(yield* readCodexConfigModelProvider, undefined);
      }),
    );

    it.effect("returns undefined when config has no model_provider key", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model = "gpt-5-codex"\n');
        assert.strictEqual(yield* readCodexConfigModelProvider, undefined);
      }),
    );

    it.effect("returns the engine when model_provider is set at top level", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model = "gpt-5-codex"\nmodel_provider = "portkey"\n');
        assert.strictEqual(yield* readCodexConfigModelProvider, "portkey");
      }),
    );

    it.effect("returns openai when model_provider is openai", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "openai"\n');
        assert.strictEqual(yield* readCodexConfigModelProvider, "openai");
      }),
    );

    it.effect("ignores model_provider inside section headers", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome(
          [
            'model = "gpt-5-codex"',
            "",
            "[model_providers.portkey]",
            'base_url = "https://api.portkey.ai/v1"',
            'model_provider = "should-be-ignored"',
            "",
          ].join("\n"),
        );
        assert.strictEqual(yield* readCodexConfigModelProvider, undefined);
      }),
    );

    it.effect("handles comments and whitespace", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome(
          [
            "# This is a comment",
            "",
            '  model_provider = "azure"  ',
            "",
            "[profiles.deep-review]",
            'model = "gpt-5-pro"',
          ].join("\n"),
        );
        assert.strictEqual(yield* readCodexConfigModelProvider, "azure");
      }),
    );

    it.effect("handles single-quoted values in TOML", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome("model_provider = 'mistral'\n");
        assert.strictEqual(yield* readCodexConfigModelProvider, "mistral");
      }),
    );
  });

  // ── hasCustomModelProvider tests ───────────────────────────────────

  describe("hasCustomModelProvider", () => {
    it.effect("returns false when no config file exists", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome();
        assert.strictEqual(yield* hasCustomModelProvider, false);
      }),
    );

    it.effect("returns false when model_provider is not set", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model = "gpt-5-codex"\n');
        assert.strictEqual(yield* hasCustomModelProvider, false);
      }),
    );

    it.effect("returns false when model_provider is openai", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "openai"\n');
        assert.strictEqual(yield* hasCustomModelProvider, false);
      }),
    );

    it.effect("returns true when model_provider is portkey", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "portkey"\n');
        assert.strictEqual(yield* hasCustomModelProvider, true);
      }),
    );

    it.effect("returns true when model_provider is azure", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "azure"\n');
        assert.strictEqual(yield* hasCustomModelProvider, true);
      }),
    );

    it.effect("returns true when model_provider is ollama", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "ollama"\n');
        assert.strictEqual(yield* hasCustomModelProvider, true);
      }),
    );

    it.effect("returns true when model_provider is a custom proxy", () =>
      Effect.gen(function* () {
        yield* withTempCodexHome('model_provider = "my-company-proxy"\n');
        assert.strictEqual(yield* hasCustomModelProvider, true);
      }),
    );
  });

  // ── checkClaudeEngineStatus tests ──────────────────────────

  describe("checkClaudeEngineStatus", () => {
    it.effect("returns ready when claude is installed and authenticated", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "authenticated");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "1.0.0\n", stderr: "", code: 0 };
            if (joined === "auth status")
              return {
                stdout: '{"loggedIn":true,"authMethod":"claude.ai"}\n',
                stderr: "",
                code: 0,
              };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("fails closed for Auto when the Claude CLI version is unparseable", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.supportsAutoRuntimeMode, false);
        assert.strictEqual(status.autoRuntimeModeBinaryPath, "claude");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "Claude Code development build\n", stderr: "", code: 0 };
            }
            if (joined === "auth status") {
              return {
                stdout: '{"loggedIn":true,"authMethod":"claude.ai"}\n',
                stderr: "",
                code: 0,
              };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("uses configured claude binary for version and auth probes", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckClaudeEngineStatus(undefined, "/custom/bin/claude");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.autoRuntimeModeBinaryPath, "/custom/bin/claude");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/claude");
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "1.0.0\n", stderr: "", code: 0 };
            if (joined === "auth status")
              return {
                stdout: '{"loggedIn":true,"authMethod":"claude.ai"}\n',
                stderr: "",
                code: 0,
              };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect(
      "strips stale direct Claude credentials from health probes when local OAuth is usable",
      () =>
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const homeDir = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "engine-health-claude-home-",
          });
          const claudeDir = path.join(homeDir, ".claude");
          yield* fileSystem.makeDirectory(claudeDir, { recursive: true });
          yield* fileSystem.writeFileString(
            path.join(claudeDir, ".credentials.json"),
            JSON.stringify({
              claudeAiOauth: {
                accessToken: "local-access-token",
                expiresAt: Date.now() + 60_000,
              },
            }),
          );

          const envKeys = [
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_AUTH_TOKEN",
            "CLAUDE_CODE_OAUTH_TOKEN",
            "ANTHROPIC_BASE_URL",
            "CLAUDE_CODE_USE_BEDROCK",
            "CLAUDE_CODE_USE_VERTEX",
            "CLAUDE_CODE_USE_ANTHROPIC_AWS",
          ] as const;
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const previous = new Map<string, string | undefined>();
              for (const key of envKeys) {
                previous.set(key, process.env[key]);
                delete process.env[key];
              }
              process.env.ANTHROPIC_API_KEY = "stale-api-key";
              process.env.ANTHROPIC_AUTH_TOKEN = "stale-auth-token";
              process.env.CLAUDE_CODE_OAUTH_TOKEN = "stale-oauth-token";
              return previous;
            }),
            (previous) =>
              Effect.sync(() => {
                for (const [key, value] of previous) {
                  if (value === undefined) {
                    delete process.env[key];
                  } else {
                    process.env[key] = value;
                  }
                }
              }),
          );

          const status = yield* makeCheckClaudeEngineStatus(undefined, "claude", homeDir).pipe(
            Effect.provide(
              mockSpawnerLayer((args, command, env) => {
                assert.strictEqual(command, "claude");
                assert.strictEqual(env?.ANTHROPIC_API_KEY, undefined);
                assert.strictEqual(env?.ANTHROPIC_AUTH_TOKEN, undefined);
                assert.strictEqual(env?.CLAUDE_CODE_OAUTH_TOKEN, undefined);

                const joined = args.join(" ");
                if (joined === "--version") return { stdout: "1.0.0\n", stderr: "", code: 0 };
                if (joined === "auth status")
                  return {
                    stdout: '{"loggedIn":true,"authMethod":"claude.ai"}\n',
                    stderr: "",
                    code: 0,
                  };
                throw new Error(`Unexpected args: ${joined}`);
              }),
            ),
          );

          assert.strictEqual(status.engine, "claude");
          assert.strictEqual(status.status, "ready");
          assert.strictEqual(status.authStatus, "authenticated");
        }),
    );

    it.effect("trusts usable Claude OAuth credentials after the SDK probe validates them", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const homeDir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "engine-health-claude-auth-fallback-",
        });
        const claudeDir = path.join(homeDir, ".claude");
        yield* fileSystem.makeDirectory(claudeDir, { recursive: true });
        yield* fileSystem.writeFileString(
          path.join(claudeDir, ".credentials.json"),
          JSON.stringify({
            claudeAiOauth: {
              accessToken: "expired-access-token",
              refreshToken: "refresh-token",
              expiresAt: Date.now() - 60_000,
              subscriptionType: "max",
            },
          }),
        );

        let sdkProbeCalls = 0;
        const status = yield* makeCheckClaudeEngineStatus(
          Effect.sync(() => {
            sdkProbeCalls += 1;
            return "max";
          }),
          "claude",
          homeDir,
        ).pipe(
          Effect.provide(
            mockSpawnerLayer((args) => {
              const joined = args.join(" ");
              if (joined === "--version") {
                return { stdout: "2.1.197\n", stderr: "", code: 0 };
              }
              if (joined === "auth status")
                return {
                  stdout: '{"loggedIn":false,"authMethod":"none","apiProvider":"firstParty"}\n',
                  stderr: "",
                  code: 0,
                };
              throw new Error(`Unexpected args: ${joined}`);
            }),
          ),
        );

        assert.strictEqual(sdkProbeCalls, 1);
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.authStatus, "authenticated");
        assert.strictEqual(status.authType, "max");
        assert.strictEqual(status.authLabel, "Claude Max Subscription");
        assert.strictEqual(status.message, undefined);
      }),
    );

    it.effect("does not trust local Claude OAuth token strings without a live SDK validation", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const homeDir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "engine-health-claude-auth-fallback-no-probe-",
        });
        const claudeDir = path.join(homeDir, ".claude");
        yield* fileSystem.makeDirectory(claudeDir, { recursive: true });
        yield* fileSystem.writeFileString(
          path.join(claudeDir, ".credentials.json"),
          JSON.stringify({
            claudeAiOauth: {
              accessToken: "expired-access-token",
              refreshToken: "stale-refresh-token",
              expiresAt: Date.now() - 60_000,
              subscriptionType: "max",
            },
          }),
        );

        const status = yield* makeCheckClaudeEngineStatus(undefined, "claude", homeDir).pipe(
          Effect.provide(
            mockSpawnerLayer((args) => {
              const joined = args.join(" ");
              if (joined === "--version") {
                return { stdout: "2.1.197\n", stderr: "", code: 0 };
              }
              if (joined === "auth status")
                return {
                  stdout: '{"loggedIn":false,"authMethod":"none","apiProvider":"firstParty"}\n',
                  stderr: "",
                  code: 0,
                };
              throw new Error(`Unexpected args: ${joined}`);
            }),
          ),
        );

        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.authStatus, "unauthenticated");
        assert.strictEqual(status.authType, undefined);
        assert.strictEqual(status.authLabel, undefined);
      }),
    );

    it.effect(
      "keeps Claude unauthenticated when auth status includes a textual login failure",
      () =>
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const homeDir = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "engine-health-claude-auth-text-failure-",
          });
          const claudeDir = path.join(homeDir, ".claude");
          yield* fileSystem.makeDirectory(claudeDir, { recursive: true });
          yield* fileSystem.writeFileString(
            path.join(claudeDir, ".credentials.json"),
            JSON.stringify({
              claudeAiOauth: {
                accessToken: "expired-access-token",
                refreshToken: "refresh-token",
                expiresAt: Date.now() - 60_000,
                subscriptionType: "max",
              },
            }),
          );

          const status = yield* makeCheckClaudeEngineStatus(undefined, "claude", homeDir).pipe(
            Effect.provide(
              mockSpawnerLayer((args) => {
                const joined = args.join(" ");
                if (joined === "--version") {
                  return { stdout: "2.1.197\n", stderr: "", code: 0 };
                }
                if (joined === "auth status")
                  return {
                    stdout: '{"loggedIn":false,"authMethod":"none","apiProvider":"firstParty"}\n',
                    stderr: "Not logged in. Please run /login.\n",
                    code: 0,
                  };
                throw new Error(`Unexpected args: ${joined}`);
              }),
            ),
          );

          assert.strictEqual(status.engine, "claude");
          assert.strictEqual(status.status, "error");
          assert.strictEqual(status.authStatus, "unauthenticated");
          assert.strictEqual(status.authType, undefined);
          assert.strictEqual(status.authLabel, undefined);
          assert.match(status.message ?? "", /not authenticated/i);
        }),
    );

    it.effect(
      "re-probes auth status once when a structured false negative has no credential file to rescue it",
      () =>
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem;
          const homeDir = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "engine-health-claude-auth-retry-",
          });

          let authStatusCalls = 0;
          const status = yield* makeCheckClaudeEngineStatus(undefined, "claude", homeDir, {
            falseNegativeRetryDelayMs: 0,
          }).pipe(
            Effect.provide(
              mockSpawnerLayer((args) => {
                const joined = args.join(" ");
                if (joined === "--version") {
                  return { stdout: "2.1.197\n", stderr: "", code: 0 };
                }
                if (joined === "auth status") {
                  authStatusCalls += 1;
                  // First probe loses a refresh-token rotation race; the retry
                  // observes the settled, rotated token.
                  return authStatusCalls === 1
                    ? {
                        stdout: '{"loggedIn":false,"authMethod":"none"}\n',
                        stderr: "",
                        code: 0,
                      }
                    : {
                        stdout:
                          '{"loggedIn":true,"authMethod":"claude.ai","subscriptionType":"max"}\n',
                        stderr: "",
                        code: 0,
                      };
                }
                throw new Error(`Unexpected args: ${joined}`);
              }),
            ),
          );

          assert.strictEqual(authStatusCalls, 2);
          assert.strictEqual(status.engine, "claude");
          assert.strictEqual(status.status, "ready");
          assert.strictEqual(status.authStatus, "authenticated");
          assert.strictEqual(status.authType, "max");
        }),
    );

    it.effect(
      "stays unauthenticated when the structured false negative persists across the retry",
      () =>
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem;
          const homeDir = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "engine-health-claude-auth-retry-persist-",
          });

          let authStatusCalls = 0;
          const status = yield* makeCheckClaudeEngineStatus(undefined, "claude", homeDir, {
            falseNegativeRetryDelayMs: 0,
          }).pipe(
            Effect.provide(
              mockSpawnerLayer((args) => {
                const joined = args.join(" ");
                if (joined === "--version") {
                  return { stdout: "2.1.197\n", stderr: "", code: 0 };
                }
                if (joined === "auth status") {
                  authStatusCalls += 1;
                  return {
                    stdout: '{"loggedIn":false,"authMethod":"none"}\n',
                    stderr: "",
                    code: 0,
                  };
                }
                throw new Error(`Unexpected args: ${joined}`);
              }),
            ),
          );

          assert.strictEqual(authStatusCalls, 2);
          assert.strictEqual(status.engine, "claude");
          assert.strictEqual(status.status, "error");
          assert.strictEqual(status.authStatus, "unauthenticated");
          assert.match(status.message ?? "", /not authenticated/i);
        }),
    );

    it.effect("returns unavailable when claude is missing", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, "not_installed");
        assert.strictEqual(
          status.message,
          "Claude Agent CLI (`claude`) is not installed or not on PATH.",
        );
      }).pipe(Effect.provide(failingSpawnerLayer("spawn claude ENOENT"))),
    );

    it.effect("returns error when version check fails with non-zero exit code", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.unavailableReason, undefined);
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version")
              return { stdout: "", stderr: "Something went wrong", code: 1 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unauthenticated when auth status reports not logged in", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unauthenticated");
        assert.strictEqual(
          status.message,
          "Claude is not authenticated. Run `claude auth login` and try again.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "1.0.0\n", stderr: "", code: 0 };
            if (joined === "auth status")
              return {
                stdout: '{"loggedIn":false}\n',
                stderr: "",
                code: 1,
              };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unauthenticated when output includes 'not logged in'", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unauthenticated");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "1.0.0\n", stderr: "", code: 0 };
            if (joined === "auth status") return { stdout: "Not logged in\n", stderr: "", code: 1 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns warning when auth status command is unsupported", () =>
      Effect.gen(function* () {
        const status = yield* checkClaudeEngineStatus;
        assert.strictEqual(status.engine, "claude");
        assert.strictEqual(status.status, "warning");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(
          status.message,
          "Claude Agent authentication status command is unavailable in this version of Claude.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "1.0.0\n", stderr: "", code: 0 };
            if (joined === "auth status")
              return { stdout: "", stderr: "error: unknown command 'auth'", code: 2 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );
  });

  describe("checkOpenCodeEngineStatus", () => {
    it.effect("returns ready when opencode is installed", () =>
      Effect.gen(function* () {
        const status = yield* checkOpenCodeEngineStatus;
        assert.strictEqual(status.engine, "opencode");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unknown");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "opencode 1.3.17\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("uses configured opencode binary for version probe", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckOpenCodeEngineStatus("/custom/bin/opencode");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.checkedBinaryPath, "/custom/bin/opencode");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/opencode");
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "opencode 1.3.17\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unavailable when opencode is missing", () =>
      Effect.gen(function* () {
        const status = yield* checkOpenCodeEngineStatus;
        assert.strictEqual(status.engine, "opencode");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, "not_installed");
        assert.strictEqual(
          status.message,
          "OpenCode CLI (`opencode`) is not installed or not on PATH.",
        );
      }).pipe(Effect.provide(failingSpawnerLayer("spawn opencode ENOENT"))),
    );
  });

  describe("checkKiloEngineStatus", () => {
    it.effect("uses configured Kilo binary for version probe", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckKiloEngineStatus("/custom/bin/kilo");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.checkedBinaryPath, "/custom/bin/kilo");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/kilo");
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "kilo 7.2.52\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns not-installed when Kilo CLI is missing", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckKiloEngineStatus();
        assert.strictEqual(status.engine, "kilo");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.unavailableReason, "not_installed");
      }).pipe(Effect.provide(failingSpawnerLayer("spawn kilo ENOENT"))),
    );
  });

  describe("checkDroidEngineStatus", () => {
    it.effect("returns not-installed when Droid CLI is missing", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckDroidEngineStatus();
        assert.strictEqual(status.engine, "droid");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.unavailableReason, "not_installed");
      }).pipe(Effect.provide(failingSpawnerLayer("spawn droid ENOENT"))),
    );
  });

  describe("checkPiEngineStatus", () => {
    it.effect("projects the locked bundled Pi runtime without native discovery", () =>
      Effect.gen(function* () {
        const status = yield* checkPiEngineStatus();
        assert.strictEqual(status.engine, "pi");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.version, "0.84.3");
        assert.strictEqual(
          status.message,
          "Pi 0.84.3 is bundled. Native Pi discovery and state access begin only after you select Pi.",
        );
      }),
    );
  });

  describe("checkAntigravityEngineStatus", () => {
    it.effect("rejects versions that predate --new-project support", () =>
      Effect.gen(function* () {
        const status = yield* checkAntigravityEngineStatus();
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.version, "1.0.11");
        assert.strictEqual(status.unavailableReason, undefined);
        assert.strictEqual(
          status.message,
          "Antigravity CLI 1.0.11 is too old for Haros. Upgrade to 1.0.12 or newer.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "Antigravity CLI 1.0.11\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns not-installed when Antigravity CLI is missing", () =>
      Effect.gen(function* () {
        const status = yield* checkAntigravityEngineStatus();
        assert.strictEqual(status.engine, "antigravity");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.unavailableReason, "not_installed");
      }).pipe(Effect.provide(failingSpawnerLayer("spawn agy ENOENT"))),
    );

    it.effect("returns ready when Antigravity lists authenticated models", () =>
      Effect.gen(function* () {
        const status = yield* checkAntigravityEngineStatus();
        assert.strictEqual(status.engine, "antigravity");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "authenticated");
        assert.strictEqual(status.version, "1.1.2");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "agy");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "Antigravity CLI 1.1.2\n", stderr: "", code: 0 };
            }
            if (joined === "models") {
              return {
                stdout: "Gemini 3.5 Flash (Medium)\nClaude Sonnet 4.6 (Thinking)\n",
                stderr: "",
                code: 0,
              };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("uses the configured Antigravity binary", () =>
      Effect.gen(function* () {
        const status = yield* checkAntigravityEngineStatus("/custom/bin/agy");
        assert.strictEqual(status.status, "ready");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/agy");
            return args.join(" ") === "--version"
              ? { stdout: "1.1.2\n", stderr: "", code: 0 }
              : { stdout: "GPT-OSS 120B (Medium)\n", stderr: "", code: 0 };
          }),
        ),
      ),
    );
  });

  describe("checkGrokEngineStatus", () => {
    it.effect("returns ready when Grok CLI is installed", () => {
      const previousXaiApiKey = process.env.XAI_API_KEY;
      const previousApiKey = process.env.GROK_CODE_XAI_API_KEY;
      delete process.env.XAI_API_KEY;
      delete process.env.GROK_CODE_XAI_API_KEY;
      return Effect.gen(function* () {
        const status = yield* checkGrokEngineStatus;
        assert.strictEqual(status.engine, "grok");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.version, "0.1.0");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "grok 0.1.0\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
        Effect.ensuring(
          Effect.sync(() => {
            if (previousXaiApiKey === undefined) {
              delete process.env.XAI_API_KEY;
            } else {
              process.env.XAI_API_KEY = previousXaiApiKey;
            }
            if (previousApiKey === undefined) {
              delete process.env.GROK_CODE_XAI_API_KEY;
            } else {
              process.env.GROK_CODE_XAI_API_KEY = previousApiKey;
            }
          }),
        ),
      );
    });

    it.effect("marks Grok authenticated when XAI_API_KEY is present", () => {
      const previousXaiApiKey = process.env.XAI_API_KEY;
      const previousApiKey = process.env.GROK_CODE_XAI_API_KEY;
      process.env.XAI_API_KEY = "xai-test-key";
      delete process.env.GROK_CODE_XAI_API_KEY;
      return Effect.gen(function* () {
        const status = yield* checkGrokEngineStatus;
        assert.strictEqual(status.authStatus, "authenticated");
        assert.strictEqual(status.authType, "apiKey");
        assert.strictEqual(status.authLabel, "xAI API Key");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args) => {
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "grok 0.1.0\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
        Effect.ensuring(
          Effect.sync(() => {
            if (previousXaiApiKey === undefined) {
              delete process.env.XAI_API_KEY;
            } else {
              process.env.XAI_API_KEY = previousXaiApiKey;
            }
            if (previousApiKey === undefined) {
              delete process.env.GROK_CODE_XAI_API_KEY;
            } else {
              process.env.GROK_CODE_XAI_API_KEY = previousApiKey;
            }
          }),
        ),
      );
    });

    it.effect("uses configured Grok binary for version probe", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckGrokEngineStatus("/custom/bin/grok");
        assert.strictEqual(status.status, "ready");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/grok");
            const joined = args.join(" ");
            if (joined === "--version") return { stdout: "grok 0.1.0\n", stderr: "", code: 0 };
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unavailable when Grok CLI is missing", () =>
      Effect.gen(function* () {
        const status = yield* checkGrokEngineStatus;
        assert.strictEqual(status.engine, "grok");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, "not_installed");
        assert.strictEqual(status.message, "Grok CLI (`grok`) is not installed or not on PATH.");
      }).pipe(Effect.provide(failingSpawnerLayer("spawn grok ENOENT"))),
    );
  });

  describe("checkCursorEngineStatus", () => {
    it.effect("returns ready when Cursor Agent is authenticated and has models", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "ready");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "authenticated");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command, env) => {
            assert.strictEqual(command, "cursor-agent");
            assert.strictEqual(env?.NO_BROWSER, "true");
            assert.strictEqual(env?.BROWSER, "www-browser");
            assert.strictEqual(env?.CI, "true");
            assert.strictEqual(env?.DEBIAN_FRONTEND, "noninteractive");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "agent 2026.04.27\n", stderr: "", code: 0 };
            }
            if (joined === "status") {
              return { stdout: "Logged in as user@example.com\n", stderr: "", code: 0 };
            }
            if (joined === "models") {
              return { stdout: "gpt-5 - GPT-5\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("maps the old ambiguous agent default to cursor-agent", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckCursorEngineStatus("agent");
        assert.strictEqual(status.status, "ready");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "cursor-agent");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "agent 2026.04.27\n", stderr: "", code: 0 };
            }
            if (joined === "status") {
              return { stdout: "Logged in as user@example.com\n", stderr: "", code: 0 };
            }
            if (joined === "models") {
              return { stdout: "gpt-5 - GPT-5\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("uses configured Cursor Agent binary for version probe", () =>
      Effect.gen(function* () {
        const status = yield* makeCheckCursorEngineStatus("/custom/bin/agent");
        assert.strictEqual(status.status, "ready");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "/custom/bin/agent");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "agent 2026.04.27\n", stderr: "", code: 0 };
            }
            if (joined === "status") {
              return { stdout: "Logged in as user@example.com\n", stderr: "", code: 0 };
            }
            if (joined === "models") {
              return { stdout: "gpt-5 - GPT-5\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect(
      "falls back through configured Cursor editors when no agent command is resolved",
      () =>
        Effect.gen(function* () {
          const originalPath = process.env.PATH;
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              process.env.PATH = "";
            }),
            () =>
              Effect.sync(() => {
                if (originalPath !== undefined) {
                  process.env.PATH = originalPath;
                } else {
                  delete process.env.PATH;
                }
              }),
          );
          const status = yield* makeCheckCursorEngineStatus("/custom/bin/cursor");
          assert.strictEqual(status.status, "ready");
          assert.strictEqual(status.checkedBinaryPath, "/custom/bin/cursor");
        }).pipe(
          Effect.provide(
            mockSpawnerLayer((args, command) => {
              assert.strictEqual(command, "/custom/bin/cursor");
              const joined = args.join(" ");
              if (joined === "agent --version") {
                return { stdout: "cursor 2026.04.27\n", stderr: "", code: 0 };
              }
              if (joined === "agent status") {
                return { stdout: "Logged in as user@example.com\n", stderr: "", code: 0 };
              }
              if (joined === "agent models") {
                return { stdout: "gpt-5 - GPT-5\n", stderr: "", code: 0 };
              }
              throw new Error(`Unexpected args: ${joined}`);
            }),
          ),
        ),
    );

    it.effect("returns unavailable when Cursor Agent is missing", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, "not_installed");
        assert.strictEqual(
          status.message,
          "Cursor Agent CLI (`cursor-agent`) is not installed or not on PATH.",
        );
      }).pipe(Effect.provide(failingSpawnerLayer("spawn cursor-agent ENOENT"))),
    );

    it.effect("returns unavailable when Cursor Agent exits with an error", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "unknown");
        assert.strictEqual(status.unavailableReason, undefined);
        assert.strictEqual(
          status.message,
          "Cursor Agent CLI is installed but failed to run. version failed",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "cursor-agent");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "", stderr: "version failed\n", code: 1 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unauthenticated when Cursor Agent status requires login", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unauthenticated");
        assert.strictEqual(
          status.message,
          "Cursor Agent is not authenticated. Run `cursor-agent login` and try again.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "cursor-agent");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "agent 2026.04.27\n", stderr: "", code: 0 };
            }
            if (joined === "status") {
              return {
                stdout: "",
                stderr:
                  "Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.\n",
                code: 1,
              };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unauthenticated when Cursor Agent says not authenticated", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "unauthenticated");
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "cursor-agent");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "agent 2026.04.27\n", stderr: "", code: 0 };
            }
            if (joined === "status") {
              return { stdout: "Not authenticated\n", stderr: "", code: 1 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns unavailable when Cursor Agent has no account models", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "error");
        assert.strictEqual(status.available, false);
        assert.strictEqual(status.authStatus, "authenticated");
        assert.strictEqual(
          status.message,
          "Cursor Agent is authenticated, but it reports no models available for this account.",
        );
      }).pipe(
        Effect.provide(
          mockSpawnerLayer((args, command) => {
            assert.strictEqual(command, "cursor-agent");
            const joined = args.join(" ");
            if (joined === "--version") {
              return { stdout: "agent 2026.04.27\n", stderr: "", code: 0 };
            }
            if (joined === "status") {
              return { stdout: "Logged in (unable to fetch user details)\n", stderr: "", code: 0 };
            }
            if (joined === "models") {
              return { stdout: "No models available for this account.\n", stderr: "", code: 0 };
            }
            throw new Error(`Unexpected args: ${joined}`);
          }),
        ),
      ),
    );

    it.effect("returns warning when Cursor Agent model discovery fails to spawn", () =>
      Effect.gen(function* () {
        const status = yield* checkCursorEngineStatus;
        assert.strictEqual(status.engine, "cursor");
        assert.strictEqual(status.status, "warning");
        assert.strictEqual(status.available, true);
        assert.strictEqual(status.authStatus, "authenticated");
      }).pipe(
        Effect.provide(
          Layer.succeed(
            ChildProcessSpawner.ChildProcessSpawner,
            ChildProcessSpawner.make((command) => {
              const cmd = command as unknown as {
                command: string;
                args: ReadonlyArray<string>;
              };
              assert.strictEqual(cmd.command, "cursor-agent");
              const joined = cmd.args.join(" ");
              if (joined === "--version") {
                return Effect.succeed(
                  mockHandle({ stdout: "agent 2026.04.27\n", stderr: "", code: 0 }),
                );
              }
              if (joined === "status") {
                return Effect.succeed(
                  mockHandle({ stdout: "Logged in as user@example.com\n", stderr: "", code: 0 }),
                );
              }
              if (joined === "models") {
                return Effect.fail(
                  PlatformError.systemError({
                    _tag: "Unknown",
                    module: "ChildProcess",
                    method: "spawn",
                    description: "models probe failed",
                  }),
                );
              }
              throw new Error(`Unexpected args: ${joined}`);
            }),
          ),
        ),
      ),
    );
  });

  // ── parseClaudeAuthStatusFromOutput pure tests ────────────────────

  describe("parseClaudeAuthStatusFromOutput", () => {
    it("exit code 0 with no auth markers is ready", () => {
      const parsed = parseClaudeAuthStatusFromOutput({ stdout: "OK\n", stderr: "", code: 0 });
      assert.strictEqual(parsed.status, "ready");
      assert.strictEqual(parsed.authStatus, "authenticated");
    });

    it("JSON with loggedIn=true is authenticated", () => {
      const parsed = parseClaudeAuthStatusFromOutput({
        stdout: '{"loggedIn":true,"authMethod":"claude.ai"}\n',
        stderr: "",
        code: 0,
      });
      assert.strictEqual(parsed.status, "ready");
      assert.strictEqual(parsed.authStatus, "authenticated");
    });

    it("JSON with loggedIn=false is unauthenticated", () => {
      const parsed = parseClaudeAuthStatusFromOutput({
        stdout: '{"loggedIn":false}\n',
        stderr: "",
        code: 0,
      });
      assert.strictEqual(parsed.status, "error");
      assert.strictEqual(parsed.authStatus, "unauthenticated");
    });

    it("JSON without auth marker is warning", () => {
      const parsed = parseClaudeAuthStatusFromOutput({
        stdout: '{"ok":true}\n',
        stderr: "",
        code: 0,
      });
      assert.strictEqual(parsed.status, "warning");
      assert.strictEqual(parsed.authStatus, "unknown");
    });
  });
});

import * as Http from "node:http";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { ProductConversationId, ProductWorkspaceId } from "@omnimind/contracts";
import * as Cause from "effect/Cause";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Command from "effect/unstable/cli/Command";
import { FetchHttpClient } from "effect/unstable/http";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, vi } from "vitest";
import { NetService } from "@omnimind/shared/Net";

import { ServerConfig, type ServerConfigShape } from "./config";
import { Open, type OpenShape } from "./open";
import {
  ProductControlPlane,
  type ProductControlPlaneShape,
} from "./product/ProductControlPlane";
import { AnalyticsService } from "./telemetry/Services/AnalyticsService";
import { Server, type ServerShape } from "./effectServer";
import { makeServerShutdownController } from "./serverShutdown";

import {
  CliConfig,
  makeServerStartupLogData,
  recordStartupHeartbeat,
  omnimindCli,
  type CliConfigShape,
} from "./main";

const start = vi.fn(() => undefined);
const stop = vi.fn(() => undefined);
const openBrowser = vi.fn((_target: string) => Effect.void);
let resolvedConfig: ServerConfigShape | null = null;

function getResolvedConfig(): ServerConfigShape | null {
  return resolvedConfig;
}

let serverStopSignal: Effect.Effect<void> = Effect.void;
let retainedSqlClient: SqlClient.SqlClient | null = null;
let releaseServerRuntime = (_sql: SqlClient.SqlClient): Effect.Effect<void, never> => Effect.void;
const serverStart = Effect.acquireRelease(
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    retainedSqlClient = sql;
    resolvedConfig = yield* ServerConfig;
    start();
    return { server: {} as unknown as Http.Server, sql };
  }),
  ({ sql }) =>
    releaseServerRuntime(sql).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          stop();
        }),
      ),
    ),
).pipe(Effect.map(({ server }) => server));
const findAvailablePort = vi.fn((preferred: number) => Effect.succeed(preferred));
let defaultOmniMindHome = "";
const tempHomes = new Set<string>();

function makeTempHome(prefix = "omnimind-main-test-"): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempHomes.add(directory);
  return directory;
}

function permissionMode(filePath: string): number {
  return fs.statSync(filePath).mode & 0o777;
}

// Shared service layer used by this CLI test suite.
const testLayer = Layer.mergeAll(
  Layer.succeed(CliConfig, {
    cwd: "/tmp/omnimind-test-workspace",
    fixPath: Effect.void,
    resolveStaticDir: Effect.undefined,
  } satisfies CliConfigShape),
  Layer.succeed(NetService, {
    canListenOnHost: () => Effect.succeed(true),
    isPortAvailableOnLoopback: () => Effect.succeed(true),
    reserveLoopbackPort: () => Effect.succeed(0),
    findAvailablePort,
  }),
  Layer.succeed(Server, {
    start: serverStart,
    stopSignal: Effect.suspend(() => serverStopSignal),
  } satisfies ServerShape),
  Layer.succeed(Open, {
    openBrowser,
    openInEditor: () => Effect.void,
  } satisfies OpenShape),
  AnalyticsService.layerTest,
  FetchHttpClient.layer,
  NodeServices.layer,
);

const runCli = (args: ReadonlyArray<string>, env: Record<string, string> = {}) => {
  const program = Command.runWith(omnimindCli, { version: "0.0.0-test" })(args).pipe(
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnv({
          env: {
            OMNIMIND_HOME: defaultOmniMindHome,
            OMNIMIND_NO_BROWSER: "true",
            ...env,
          },
        }),
      ),
    ),
  );
  return program as Effect.Effect<void, unknown, never>;
};

beforeEach(() => {
  vi.clearAllMocks();
  defaultOmniMindHome = makeTempHome();
  resolvedConfig = null;
  serverStopSignal = Effect.void;
  retainedSqlClient = null;
  releaseServerRuntime = () => Effect.void;
  start.mockImplementation(() => undefined);
  stop.mockImplementation(() => undefined);
  findAvailablePort.mockImplementation((preferred: number) => Effect.succeed(preferred));
});

afterEach(() => {
  for (const directory of tempHomes) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  tempHomes.clear();
});

it.layer(testLayer)("server CLI command", (it) => {
  it.effect("parses all CLI flags and wires scoped start/stop", () =>
    Effect.gen(function* () {
      const flagHome = makeTempHome("omnimind-main-flag-");

      yield* runCli([
        "--mode",
        "desktop",
        "--port",
        "4010",
        "--host",
        "::1",
        "--home-dir",
        flagHome,
        "--dev-url",
        "http://127.0.0.1:5173",
        "--no-browser",
        "--auth-token",
        "auth-secret",
      ]);

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.mode, "desktop");
      assert.equal(resolvedConfig?.port, 4010);
      assert.equal(resolvedConfig?.host, "::1");
      assert.equal(resolvedConfig?.baseDir, flagHome);
      assert.equal(resolvedConfig?.stateDir, path.join(flagHome, "dev"));
      assert.equal(resolvedConfig?.devUrl?.toString(), "http://127.0.0.1:5173/");
      assert.equal(resolvedConfig?.noBrowser, true);
      assert.equal(resolvedConfig?.authToken, "auth-secret");
      assert.equal(resolvedConfig?.publicUrl, undefined);
      assert.equal(resolvedConfig?.allowInsecureRemote, false);
      assert.equal(resolvedConfig?.autoBootstrapProjectFromCwd, false);
      assert.equal(resolvedConfig?.logWebSocketEvents, false);
      assert.equal(stop.mock.calls.length, 1);
    }),
  );

  it.effect("supports --token as an alias for --auth-token", () =>
    Effect.gen(function* () {
      yield* runCli(["--token", "token-secret"]);

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.authToken, "token-secret");
    }),
  );

  it.effect("creates fresh local state directories with private permissions", () =>
    Effect.gen(function* () {
      if (process.platform === "win32") return;
      const homeDir = makeTempHome("omnimind-main-private-fresh-");

      yield* runCli(["--home-dir", homeDir]);

      const stateDir = path.join(homeDir, "userdata");
      for (const directoryPath of [
        stateDir,
        path.join(stateDir, "secrets"),
        path.join(stateDir, "attachments"),
        path.join(stateDir, "logs"),
        path.join(stateDir, "logs", "terminals"),
      ]) {
        assert.equal(permissionMode(directoryPath), 0o700);
      }
      assert.equal(permissionMode(path.join(stateDir, "logs", "server.log")), 0o600);
    }),
  );

  it.effect("repairs permissions for an upgraded local state directory", () =>
    Effect.gen(function* () {
      if (process.platform === "win32") return;
      const homeDir = makeTempHome("omnimind-main-private-upgrade-");
      const stateDir = path.join(homeDir, "userdata");
      const attachmentDir = path.join(stateDir, "attachments");
      const attachmentPath = path.join(attachmentDir, "existing.bin");
      fs.mkdirSync(attachmentDir, { recursive: true, mode: 0o755 });
      fs.writeFileSync(attachmentPath, "existing", { mode: 0o644 });
      fs.chmodSync(stateDir, 0o755);
      fs.chmodSync(attachmentDir, 0o755);

      yield* runCli(["--home-dir", homeDir]);

      assert.equal(permissionMode(stateDir), 0o700);
      assert.equal(permissionMode(attachmentDir), 0o700);
      assert.equal(permissionMode(attachmentPath), 0o600);
    }),
  );

  it.effect("uses env fallbacks when flags are not provided", () =>
    Effect.gen(function* () {
      const envHome = makeTempHome("omnimind-main-env-");

      yield* runCli([], {
        OMNIMIND_MODE: "desktop",
        OMNIMIND_PORT: "4999",
        OMNIMIND_HOST: "127.0.0.1",
        OMNIMIND_HOME: envHome,
        VITE_DEV_SERVER_URL: "http://localhost:5173",
        OMNIMIND_NO_BROWSER: "true",
        OMNIMIND_AUTH_TOKEN: "env-token",
        OMNIMIND_DESKTOP_SHUTDOWN_TOKEN: "shutdown-token",
      });

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.mode, "desktop");
      assert.equal(resolvedConfig?.port, 4999);
      assert.equal(resolvedConfig?.host, "127.0.0.1");
      assert.equal(resolvedConfig?.baseDir, envHome);
      assert.equal(resolvedConfig?.stateDir, path.join(envHome, "dev"));
      assert.equal(resolvedConfig?.devUrl?.toString(), "http://localhost:5173/");
      assert.equal(resolvedConfig?.noBrowser, true);
      assert.equal(resolvedConfig?.authToken, "env-token");
      assert.equal(resolvedConfig?.desktopShutdownToken, "shutdown-token");
      assert.equal(resolvedConfig?.autoBootstrapProjectFromCwd, false);
      assert.equal(resolvedConfig?.logWebSocketEvents, false);
      assert.equal(findAvailablePort.mock.calls.length, 0);
    }),
  );

  it.effect("consumes desktop shutdown authority before generic child launches", () =>
    Effect.gen(function* () {
      const canonicalKey = "OMNIMIND_DESKTOP_SHUTDOWN_TOKEN";
      const mixedCaseKey = "U1_dEsKtOp_ShUtDoWn_ToKeN";
      const liveToken = "live-process-shutdown-token";
      const injectedToken = "injected-shutdown-token";
      const posixCaseSensitiveSentinel = "posix-case-sensitive-sentinel";
      const originalEntries = Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() === canonicalKey,
      );
      const allCaseVariants = () =>
        Object.keys(process.env).filter((key) => key.toUpperCase() === canonicalKey);
      const matchingLiveKeys = () =>
        Object.keys(process.env).filter((key) =>
          process.platform === "win32" ? key.toUpperCase() === canonicalKey : key === canonicalKey,
        );
      const clearAllCaseVariants = () => {
        for (const key of allCaseVariants()) {
          delete process.env[key];
        }
      };

      clearAllCaseVariants();
      try {
        process.env[process.platform === "win32" ? mixedCaseKey : canonicalKey] = liveToken;
        if (process.platform !== "win32") {
          process.env[mixedCaseKey] = posixCaseSensitiveSentinel;
        }

        yield* runCli([]);

        assert.equal(resolvedConfig?.desktopShutdownToken, liveToken);
        assert.deepEqual(matchingLiveKeys(), []);
        if (process.platform !== "win32") {
          assert.equal(process.env[mixedCaseKey], posixCaseSensitiveSentinel);
        }

        const descendant = spawnSync(
          process.execPath,
          ["-e", `process.stdout.write(process.env.${canonicalKey} ?? "missing")`],
          { encoding: "utf8" },
        );
        assert.equal(descendant.status, 0, descendant.stderr);
        assert.equal(descendant.stdout, "missing");

        resolvedConfig = null;
        yield* runCli([], { OMNIMIND_DESKTOP_SHUTDOWN_TOKEN: injectedToken });
        assert.equal(getResolvedConfig()?.desktopShutdownToken, injectedToken);
        assert.deepEqual(matchingLiveKeys(), []);
      } finally {
        clearAllCaseVariants();
        for (const [key, value] of originalEntries) {
          if (value !== undefined) {
            process.env[key] = value;
          }
        }
      }
    }),
  );

  it.effect("waits for the stop signal before releasing the scoped server runtime", () =>
    Effect.gen(function* () {
      const shutdownController = yield* makeServerShutdownController();
      serverStopSignal = shutdownController.stopSignal;
      let resolveStarted: (() => void) | undefined;
      const started = new Promise<void>((resolve) => {
        resolveStarted = resolve;
      });
      start.mockImplementation(() => {
        resolveStarted?.();
        return undefined;
      });

      const program = yield* runCli([]).pipe(Effect.forkChild);
      yield* Effect.promise(() => started);
      assert.equal(start.mock.calls.length, 1);
      assert.equal(stop.mock.calls.length, 0);

      yield* shutdownController.requestStop;
      yield* Fiber.join(program);
      assert.equal(stop.mock.calls.length, 1);
    }),
  );

  it.effect("keeps SQLite alive through CLI server release and closes it afterward", () =>
    Effect.gen(function* () {
      let releaseRows: ReadonlyArray<{ readonly live: number }> = [];
      releaseServerRuntime = (sql) =>
        sql<{ readonly live: number }>`SELECT 1 AS live`.pipe(
          Effect.tap((rows) =>
            Effect.sync(() => {
              releaseRows = rows;
            }),
          ),
          Effect.asVoid,
          Effect.orDie,
        );

      yield* runCli([]);

      assert.deepEqual(releaseRows, [{ live: 1 }]);
      const releasedClient = retainedSqlClient;
      if (!releasedClient) {
        return yield* Effect.die(new Error("Expected the CLI to acquire a SQLite client"));
      }
      const postReleaseExit = yield* Effect.exit(releasedClient`SELECT 2 AS closed_probe`);
      assert.isTrue(Exit.isFailure(postReleaseExit));
      if (Exit.isFailure(postReleaseExit)) {
        assert.match(Cause.pretty(postReleaseExit.cause), /database is not open/i);
      }
    }),
  );

  it.effect("surfaces CLI server release failures", () =>
    Effect.gen(function* () {
      releaseServerRuntime = () => Effect.die(new Error("synthetic server release failure"));

      const exit = yield* Effect.exit(runCli([]));

      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        assert.match(Cause.pretty(exit.cause), /synthetic server release failure/);
      }
      assert.equal(stop.mock.calls.length, 1);
    }),
  );

  it.effect("omits both server authority secrets from startup log data", () =>
    Effect.gen(function* () {
      yield* runCli([], {
        OMNIMIND_AUTH_TOKEN: "browser-secret",
        OMNIMIND_DESKTOP_SHUTDOWN_TOKEN: "shutdown-secret",
      });
      const config = resolvedConfig;
      if (!config) throw new Error("Expected resolved server config");

      const logData = makeServerStartupLogData(config);
      assert.equal(Object.hasOwn(logData, "authToken"), false);
      assert.equal(Object.hasOwn(logData, "desktopShutdownToken"), false);
      assert.equal(logData.authEnabled, true);
      assert.notInclude(JSON.stringify(logData), "browser-secret");
      assert.notInclude(JSON.stringify(logData), "shutdown-secret");
    }),
  );

  it.effect("prefers --mode over OMNIMIND_MODE", () =>
    Effect.gen(function* () {
      findAvailablePort.mockImplementation((_preferred: number) => Effect.succeed(4666));
      yield* runCli(["--mode", "web"], {
        OMNIMIND_MODE: "desktop",
        OMNIMIND_NO_BROWSER: "true",
      });

      assert.deepStrictEqual(findAvailablePort.mock.calls, [[3773]]);
      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.mode, "web");
      assert.equal(resolvedConfig?.port, 4666);
      assert.equal(resolvedConfig?.host, "127.0.0.1");
    }),
  );

  it.effect("prefers --no-browser over OMNIMIND_NO_BROWSER", () =>
    Effect.gen(function* () {
      yield* runCli(["--no-browser"], {
        OMNIMIND_NO_BROWSER: "false",
      });

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.noBrowser, true);
    }),
  );

  it.effect("lets explicit negative boolean flags override true environment values", () =>
    Effect.gen(function* () {
      yield* runCli(
        [
          "--browser",
          "--no-auto-bootstrap-project-from-cwd",
          "--no-log-websocket-events",
        ],
        {
          OMNIMIND_MODE: "desktop",
          OMNIMIND_NO_BROWSER: "true",
          OMNIMIND_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "true",
          OMNIMIND_LOG_WS_EVENTS: "true",
        },
      );

      assert.equal(resolvedConfig?.noBrowser, false);
      assert.equal(resolvedConfig?.autoBootstrapProjectFromCwd, false);
      assert.equal(resolvedConfig?.logWebSocketEvents, false);
    }),
  );

  it.effect("uses loopback and dynamic port discovery in web mode by default", () =>
    Effect.gen(function* () {
      findAvailablePort.mockImplementation((_preferred: number) => Effect.succeed(5444));
      yield* runCli([]);

      assert.deepStrictEqual(findAvailablePort.mock.calls, [[3773]]);
      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.port, 5444);
      assert.equal(resolvedConfig?.mode, "web");
      assert.equal(resolvedConfig?.host, "127.0.0.1");
    }),
  );

  it.effect("uses fixed localhost defaults in desktop mode", () =>
    Effect.gen(function* () {
      yield* runCli([], {
        OMNIMIND_MODE: "desktop",
        OMNIMIND_NO_BROWSER: "true",
      });

      assert.equal(findAvailablePort.mock.calls.length, 0);
      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.port, 3773);
      assert.equal(resolvedConfig?.host, "127.0.0.1");
      assert.equal(resolvedConfig?.mode, "desktop");
    }),
  );

  it.effect("allows authenticated non-loopback exposure only with explicit insecure opt-in", () =>
    Effect.gen(function* () {
      yield* runCli(
        ["--host", "0.0.0.0", "--auth-token", "remote-secret", "--allow-insecure-remote"],
        {
          OMNIMIND_MODE: "desktop",
          OMNIMIND_NO_BROWSER: "true",
        },
      );

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.mode, "desktop");
      assert.equal(resolvedConfig?.host, "0.0.0.0");
      assert.equal(resolvedConfig?.allowInsecureRemote, true);
    }),
  );

  it.effect("honors insecure remote opt-in from the environment when the CLI flag is absent", () =>
    Effect.gen(function* () {
      yield* runCli(["--host", "0.0.0.0", "--auth-token", "remote-secret"], {
        OMNIMIND_ALLOW_INSECURE_REMOTE: "true",
        OMNIMIND_NO_BROWSER: "true",
      });

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.allowInsecureRemote, true);
    }),
  );

  it.effect("lets an explicit insecure-remote negative override an enabled environment", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        runCli(
          ["--host", "0.0.0.0", "--auth-token", "remote-secret", "--no-allow-insecure-remote"],
          {
            OMNIMIND_ALLOW_INSECURE_REMOTE: "true",
            OMNIMIND_NO_BROWSER: "true",
          },
        ),
      );

      assert.equal(start.mock.calls.length, 0);
      assert.match(String(error), /Refusing plaintext remote access/);
    }),
  );

  it.effect("refuses authenticated plaintext remote exposure without an explicit opt-in", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        runCli(["--host", "0.0.0.0", "--auth-token", "remote-secret"]),
      );

      assert.equal(start.mock.calls.length, 0);
      assert.match(String(error), /Refusing plaintext remote access/);
    }),
  );

  it.effect("uses the HTTPS public origin for remote startup pairing", () =>
    Effect.gen(function* () {
      yield* runCli(
        [
          "--host",
          "0.0.0.0",
          "--auth-token",
          "remote-secret",
          "--public-url",
          "https://omnimind.example.test",
        ],
        { OMNIMIND_NO_BROWSER: "false" },
      );

      assert.equal(resolvedConfig?.publicUrl?.origin, "https://omnimind.example.test");
      assert.equal(openBrowser.mock.calls.length, 1);
      assert.match(
        openBrowser.mock.calls[0]?.[0] ?? "",
        /^https:\/\/omnimind\.example\.test\/pair#token=/,
      );
    }),
  );

  it.effect("supports the HTTPS public origin through environment configuration", () =>
    Effect.gen(function* () {
      yield* runCli([], {
        OMNIMIND_HOST: "192.168.1.50",
        OMNIMIND_AUTH_TOKEN: "remote-secret",
        OMNIMIND_PUBLIC_URL: "https://omnimind.example.test",
      });

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.publicUrl?.origin, "https://omnimind.example.test");
      assert.equal(resolvedConfig?.allowInsecureRemote, false);
    }),
  );

  it.effect("issues pairing through an HTTPS public origin that proxies to loopback", () =>
    Effect.gen(function* () {
      yield* runCli(
        [
          "--host",
          "127.0.0.1",
          "--auth-token",
          "proxy-secret",
          "--public-url",
          "https://proxy.example.test",
        ],
        { OMNIMIND_NO_BROWSER: "false" },
      );

      assert.equal(openBrowser.mock.calls.length, 1);
      assert.match(
        openBrowser.mock.calls[0]?.[0] ?? "",
        /^https:\/\/proxy\.example\.test\/pair#token=/,
      );
    }),
  );

  it.effect("refuses a dev URL exposed through an HTTPS proxy on loopback", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        runCli([
          "--host",
          "127.0.0.1",
          "--auth-token",
          "proxy-secret",
          "--public-url",
          "https://proxy.example.test",
          "--dev-url",
          "http://localhost:5173",
        ]),
      );

      assert.equal(start.mock.calls.length, 0);
      assert.match(String(error), /cannot be combined with VITE_DEV_SERVER_URL/);
    }),
  );

  it.effect("rejects non-root or non-HTTPS public URLs", () =>
    Effect.gen(function* () {
      for (const publicUrl of ["http://omnimind.example.test", "https://omnimind.example.test/app"]) {
        const error = yield* Effect.flip(
          runCli(["--host", "0.0.0.0", "--auth-token", "remote-secret", "--public-url", publicUrl]),
        );
        assert.match(String(error), /must be an HTTPS root origin/);
      }
      assert.equal(start.mock.calls.length, 0);
    }),
  );

  it.effect("refuses non-loopback exposure without authentication", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        runCli(["--host", "0.0.0.0"], {
          OMNIMIND_MODE: "web",
          OMNIMIND_NO_BROWSER: "true",
        }),
      );

      assert.equal(start.mock.calls.length, 0);
      assert.equal(resolvedConfig, null);
      assert.match(String(error), /Refusing to bind OmniMind to non-loopback host 0\.0\.0\.0/);
    }),
  );

  it.effect("refuses authenticated non-loopback exposure with a dev URL", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        runCli(
          [
            "--host",
            "0.0.0.0",
            "--auth-token",
            "remote-secret",
            "--dev-url",
            "http://localhost:5173",
          ],
          {
            OMNIMIND_MODE: "web",
            OMNIMIND_NO_BROWSER: "true",
          },
        ),
      );

      assert.equal(start.mock.calls.length, 0);
      assert.equal(resolvedConfig, null);
      assert.match(
        String(error),
        /Remote server binds cannot be combined with VITE_DEV_SERVER_URL/,
      );
    }),
  );

  it.effect("supports CLI and env for bootstrap/websocket toggles", () =>
    Effect.gen(function* () {
      yield* runCli(["--auto-bootstrap-project-from-cwd"], {
        OMNIMIND_MODE: "desktop",
        OMNIMIND_LOG_WS_EVENTS: "false",
        OMNIMIND_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "false",
        OMNIMIND_NO_BROWSER: "true",
      });

      assert.equal(start.mock.calls.length, 1);
      assert.equal(resolvedConfig?.autoBootstrapProjectFromCwd, true);
      assert.equal(resolvedConfig?.logWebSocketEvents, false);
    }),
  );

  it.effect("rejects invalid boolean environment values instead of treating them as absent", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        runCli([], {
          OMNIMIND_LOG_WS_EVENTS: "sometimes",
        }),
      );

      assert.equal(start.mock.calls.length, 0);
      assert.match(String(error), /Failed to read environment configuration/);
    }),
  );

  it.effect("records a startup heartbeat with Product conversation counts", () =>
    Effect.gen(function* () {
      const recordTelemetry = vi.fn(
        (_event: string, _properties?: Readonly<Record<string, unknown>>) => Effect.void,
      );
      const notUsed = () => Effect.die("Product operation is not used by this test");
      const productControlPlane: ProductControlPlaneShape = {
        createWorkspace: notUsed,
        updateWorkspaceTitle: notUsed,
        setWorkspacePinned: notUsed,
        updateWorkspaceRunCommand: notUsed,
        deleteWorkspace: notUsed,
        createGroup: notUsed,
        updateGroup: notUsed,
        reorderGroups: notUsed,
        deleteGroup: notUsed,
        setConversationGroups: notUsed,
        addConversationGroups: notUsed,
        hasConversation: notUsed,
        createConversation: notUsed,
        updateConversationTitle: notUsed,
        archiveConversation: notUsed,
        restoreConversation: notUsed,
        deleteConversation: notUsed,
        setConversationPinned: notUsed,
        updateConversationNotes: notUsed,
        setConversationBoardState: notUsed,
        addEntryPin: notUsed,
        removeEntryPin: notUsed,
        setEntryPinDone: notUsed,
        setEntryPinLabel: notUsed,
        addEntryMarker: notUsed,
        removeEntryMarker: notUsed,
        setEntryMarkerDone: notUsed,
        setEntryMarkerLabel: notUsed,
        getShellSnapshot: () =>
          Effect.succeed({
            protocolVersion: 1,
            sequence: 0,
            workspaces: [],
            groups: [],
            conversations: ["one", "two"].map((suffix) => ({
              id: ProductConversationId.makeUnsafe(`conversation-${suffix}`),
              workspaceId: ProductWorkspaceId.makeUnsafe(`workspace-${suffix}`),
              title: `Conversation ${suffix}`,
              workspaceKind: "chat" as const,
              revision: 1,
              archivedAt: null,
              isPinned: false,
              notes: "",
              boardState: "active" as const,
              boardStateChangedAt: null,
              latestRunId: null,
              receiptState: null,
              createdAt: "2026-08-05T00:00:00.000Z",
              updatedAt: "2026-08-05T00:00:00.000Z",
            })),
            runtimeCatalog: null,
          }),
        getConversationSnapshot: notUsed,
        putQueueItem: notUsed,
        reorderQueue: notUsed,
        deleteQueueItem: notUsed,
        admitQueueItem: notUsed,
        submitQueueItem: notUsed,
        controlRun: notUsed,
        readFacts: notUsed,
        recoverDispatches: notUsed,
        dispatchPending: notUsed,
        observeRun: notUsed,
        inspectOutbox: notUsed,
      };

      yield* recordStartupHeartbeat.pipe(
        Effect.provideService(ProductControlPlane, productControlPlane),
        Effect.provideService(AnalyticsService, {
          record: recordTelemetry,
          flush: Effect.void,
        }),
      );

      assert.deepEqual(recordTelemetry.mock.calls[0], [
        "server.boot.heartbeat",
        {
          conversationCount: 2,
        },
      ]);
    }),
  );

  it.effect("does not start server for invalid --mode values", () =>
    Effect.gen(function* () {
      yield* runCli(["--mode", "invalid"]);

      assert.equal(start.mock.calls.length, 0);
      assert.equal(stop.mock.calls.length, 0);
    }),
  );

  it.effect("does not start server for invalid --dev-url values", () =>
    Effect.gen(function* () {
      yield* runCli(["--dev-url", "not-a-url"]).pipe(Effect.catch(() => Effect.void));

      assert.equal(start.mock.calls.length, 0);
      assert.equal(stop.mock.calls.length, 0);
    }),
  );

  it.effect("does not start server for out-of-range --port values", () =>
    Effect.gen(function* () {
      yield* runCli(["--port", "70000"]);

      // effect/unstable/cli renders help/errors for parse failures and returns success.
      assert.equal(start.mock.calls.length, 0);
      assert.equal(stop.mock.calls.length, 0);
    }),
  );
});

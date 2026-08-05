/**
 * CliConfig - CLI/runtime bootstrap service definitions.
 *
 * Defines startup-only service contracts used while resolving process config
 * and constructing server runtime layers.
 *
 * @module CliConfig
 */
import OS from "node:os";
import { Config, Data, Effect, FileSystem, Layer, Option, Path, Schema, ServiceMap } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { NetService } from "@omnimind/shared/Net";
import {
  optionalBooleanEnvironmentConfig,
  optionalBooleanFlag,
  resolveBooleanConfig,
  type BooleanFlagInput,
} from "@omnimind/shared/cli";
import {
  DEFAULT_PORT,
  deriveServerPaths,
  normalizeHttpsPublicOrigin,
  preparePrivateServerPaths,
  remoteAccessPolicyError,
  resolveCanonicalWorkspaceRoots,
  resolveStaticDir,
  ServerConfig,
  type RuntimeMode,
  type ServerConfigShape,
} from "./config";
import { fixPath, resolveBaseDir } from "./os-jank";
import { Open } from "./open";
import { ServerAuth } from "./auth/Services/ServerAuth";
import * as SqlitePersistence from "./persistence/Layers/Sqlite";
import { makeServerApplicationLayers } from "./serverLayers";
import { startServerMemoryDiagnostics } from "./memoryDiagnostics";
import { Server } from "./effectServer";
import { ServerLoggerLive } from "./serverLogger";
import { formatHostForUrl, isLoopbackHost, isWildcardHost } from "./startupAccess";
import { AnalyticsServiceLayerLive } from "./telemetry/Layers/AnalyticsService";
import { AnalyticsService } from "./telemetry/Services/AnalyticsService";
import { ProductControlPlane } from "./product/ProductControlPlane";

export class StartupError extends Data.TaggedError("StartupError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

const DESKTOP_SHUTDOWN_TOKEN_ENV_KEY = "OMNIMIND_DESKTOP_SHUTDOWN_TOKEN";

function consumeDesktopShutdownTokenFromProcessEnvironment(): string | undefined {
  const matchingKeys =
    process.platform === "win32"
      ? Object.keys(process.env).filter(
          (key) => key.toUpperCase() === DESKTOP_SHUTDOWN_TOKEN_ENV_KEY,
        )
      : [DESKTOP_SHUTDOWN_TOKEN_ENV_KEY];
  let token: string | undefined;

  for (const key of matchingKeys) {
    token ??= process.env[key];
    delete process.env[key];
  }

  return token;
}

interface CliInput {
  readonly mode: Option.Option<RuntimeMode>;
  readonly port: Option.Option<number>;
  readonly host: Option.Option<string>;
  readonly omnimindHome: Option.Option<string>;
  readonly devUrl: Option.Option<URL>;
  readonly publicUrl: Option.Option<URL>;
  readonly allowInsecureRemote: BooleanFlagInput;
  readonly noBrowser: BooleanFlagInput;
  readonly authToken: Option.Option<string>;
  readonly autoBootstrapProjectFromCwd: BooleanFlagInput;
  readonly logWebSocketEvents: BooleanFlagInput;
}

/**
 * CliConfigShape - Startup helpers required while building server layers.
 */
export interface CliConfigShape {
  /**
   * Current process working directory.
   */
  readonly cwd: string;

  /**
   * Apply OS-specific PATH normalization.
   */
  readonly fixPath: Effect.Effect<void>;

  /**
   * Resolve static web asset directory for server mode.
   */
  readonly resolveStaticDir: Effect.Effect<string | undefined>;
}

/**
 * CliConfig - Service tag for startup CLI/runtime helpers.
 */
export class CliConfig extends ServiceMap.Service<CliConfig, CliConfigShape>()(
  "omnimind/main/CliConfig",
) {
  static readonly layer = Layer.effect(
    CliConfig,
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      return {
        cwd: process.cwd(),
        fixPath: Effect.sync(fixPath),
        resolveStaticDir: resolveStaticDir().pipe(
          Effect.provideService(FileSystem.FileSystem, fileSystem),
          Effect.provideService(Path.Path, path),
        ),
      } satisfies CliConfigShape;
    }),
  );
}

const CliEnvConfig = Config.all({
  mode: Config.string("OMNIMIND_MODE").pipe(
    Config.option,
    Config.map(
      Option.match<RuntimeMode, string>({
        onNone: () => "web",
        onSome: (value) => (value === "desktop" ? "desktop" : "web"),
      }),
    ),
  ),
  port: Config.port("OMNIMIND_PORT").pipe(Config.option, Config.map(Option.getOrUndefined)),
  host: Config.string("OMNIMIND_HOST").pipe(Config.option, Config.map(Option.getOrUndefined)),
  omnimindHome: Config.string("OMNIMIND_HOME").pipe(Config.option, Config.map(Option.getOrUndefined)),
  devUrl: Config.url("VITE_DEV_SERVER_URL").pipe(Config.option, Config.map(Option.getOrUndefined)),
  publicUrl: Config.url("OMNIMIND_PUBLIC_URL").pipe(Config.option, Config.map(Option.getOrUndefined)),
  allowInsecureRemote: optionalBooleanEnvironmentConfig("OMNIMIND_ALLOW_INSECURE_REMOTE"),
  noBrowser: optionalBooleanEnvironmentConfig("OMNIMIND_NO_BROWSER"),
  authToken: Config.string("OMNIMIND_AUTH_TOKEN").pipe(
    Config.option,
    Config.map(Option.getOrUndefined),
  ),
  desktopShutdownToken: Config.string("OMNIMIND_DESKTOP_SHUTDOWN_TOKEN").pipe(
    Config.option,
    Config.map(Option.getOrUndefined),
  ),
  autoBootstrapProjectFromCwd: optionalBooleanEnvironmentConfig(
    "OMNIMIND_AUTO_BOOTSTRAP_PROJECT_FROM_CWD",
  ),
  logWebSocketEvents: optionalBooleanEnvironmentConfig("OMNIMIND_LOG_WS_EVENTS"),
});

const ServerConfigLive = (input: CliInput) =>
  Layer.effect(
    ServerConfig,
    Effect.gen(function* () {
      const cliConfig = yield* CliConfig;
      const { findAvailablePort } = yield* NetService;
      const env = yield* CliEnvConfig.asEffect().pipe(
        Effect.mapError(
          (cause) =>
            new StartupError({ message: "Failed to read environment configuration", cause }),
        ),
      );
      const liveProcessDesktopShutdownToken = yield* Effect.sync(
        consumeDesktopShutdownTokenFromProcessEnvironment,
      );

      const mode = Option.getOrElse(input.mode, () => env.mode);

      const port = yield* Option.match(input.port, {
        onSome: (value) => Effect.succeed(value),
        onNone: () => {
          if (env.port) {
            return Effect.succeed(env.port);
          }
          if (mode === "desktop") {
            return Effect.succeed(DEFAULT_PORT);
          }
          return findAvailablePort(DEFAULT_PORT);
        },
      });

      const devUrl = Option.getOrElse(input.devUrl, () => env.devUrl);
      const configuredPublicUrl = Option.getOrUndefined(input.publicUrl) ?? env.publicUrl;
      const publicUrl = configuredPublicUrl
        ? (normalizeHttpsPublicOrigin(configuredPublicUrl) ?? undefined)
        : undefined;
      if (configuredPublicUrl && publicUrl === undefined) {
        return yield* new StartupError({
          message:
            "OMNIMIND_PUBLIC_URL/--public-url must be an HTTPS root origin without credentials, path, query, or fragment (for example https://omnimind.example.com).",
        });
      }
      const allowInsecureRemote = resolveBooleanConfig(
        input.allowInsecureRemote,
        env.allowInsecureRemote,
        false,
      );
      const configuredHome = Option.getOrUndefined(input.omnimindHome) ?? env.omnimindHome;
      const baseDir = yield* resolveBaseDir(configuredHome);
      const userHomeDir = OS.homedir();
      const derivedPaths = yield* deriveServerPaths(baseDir, devUrl);
      yield* Effect.try({
        try: () => preparePrivateServerPaths(derivedPaths),
        catch: (cause) =>
          new StartupError({ message: "Failed to secure OmniMind's local state directory", cause }),
      });
      const noBrowser = resolveBooleanConfig(input.noBrowser, env.noBrowser, mode === "desktop");
      const authToken = Option.getOrUndefined(input.authToken) ?? env.authToken;
      const desktopShutdownToken = env.desktopShutdownToken ?? liveProcessDesktopShutdownToken;
      const autoBootstrapProjectFromCwd = resolveBooleanConfig(
        input.autoBootstrapProjectFromCwd,
        env.autoBootstrapProjectFromCwd,
        mode === "web",
      );
      // Keep websocket payload logging opt-in in dev. Terminal/TUI traffic is
      // high-volume enough that automatic logging adds noticeable CPU and I/O.
      const logWebSocketEvents = resolveBooleanConfig(
        input.logWebSocketEvents,
        env.logWebSocketEvents,
        false,
      );
      const staticDir = devUrl ? undefined : yield* cliConfig.resolveStaticDir;
      // Omitting Node's host listens on an unspecified address, which exposes
      // the server beyond the local machine on common platforms. Keep every
      // mode loopback-only unless remote access is explicit and authenticated.
      const host = Option.getOrUndefined(input.host) ?? env.host ?? "127.0.0.1";
      const remotePolicyError = remoteAccessPolicyError({
        host,
        authToken,
        devUrl,
        publicUrl,
        allowInsecureRemote,
      });
      if (remotePolicyError) {
        return yield* new StartupError({
          message: remotePolicyError,
        });
      }

      const { homeDir, chatWorkspaceRoot, studioWorkspaceRoot } =
        yield* resolveCanonicalWorkspaceRoots({ homeDir: userHomeDir });

      const config: ServerConfigShape = {
        mode,
        port,
        cwd: cliConfig.cwd,
        homeDir,
        chatWorkspaceRoot,
        studioWorkspaceRoot,
        host,
        baseDir,
        ...derivedPaths,
        staticDir,
        devUrl,
        publicUrl,
        allowInsecureRemote,
        noBrowser,
        authToken,
        desktopShutdownToken,
        autoBootstrapProjectFromCwd,
        logWebSocketEvents,
      } satisfies ServerConfigShape;

      return config;
    }),
  );

const LayerLive = (input: CliInput) => {
  const { runtimeServicesLayer } = makeServerApplicationLayers();

  return Layer.empty.pipe(
    Layer.provideMerge(runtimeServicesLayer),
    Layer.provideMerge(SqlitePersistence.layerConfig),
    Layer.provideMerge(ServerLoggerLive),
    Layer.provideMerge(AnalyticsServiceLayerLive),
    Layer.provideMerge(ServerConfigLive(input)),
  );
};

export const recordStartupHeartbeat = Effect.gen(function* () {
  const analytics = yield* AnalyticsService;
  const productControlPlane = yield* ProductControlPlane;

  const conversationCount = yield* productControlPlane.getShellSnapshot().pipe(
    Effect.map((snapshot) => snapshot.conversations.length),
    Effect.catch((cause) =>
      Effect.logWarning("failed to gather startup Product counts for telemetry", { cause }).pipe(
        Effect.as(0),
      ),
    ),
  );

  yield* analytics.record("server.boot.heartbeat", {
    conversationCount,
  });
});

export function makeServerStartupLogData(config: ServerConfigShape): Record<string, unknown> {
  const safeConfig: Record<string, unknown> = { ...config };
  delete safeConfig.authToken;
  delete safeConfig.desktopShutdownToken;
  delete safeConfig.devUrl;

  return {
    ...safeConfig,
    devUrl: config.devUrl?.toString(),
    authEnabled: Boolean(config.authToken),
  };
}

const makeServerProgram = (input: CliInput) =>
  Effect.gen(function* () {
    const cliConfig = yield* CliConfig;
    const { start, stopSignal } = yield* Server;
    const openDeps = yield* Open;
    const serverAuth = yield* ServerAuth;
    yield* cliConfig.fixPath;

    const config = yield* ServerConfig;
    yield* Effect.sync(() => startServerMemoryDiagnostics({ mode: config.mode }));

    if (!config.devUrl && !config.staticDir) {
      yield* Effect.logWarning(
        "web bundle missing and no VITE_DEV_SERVER_URL; web UI unavailable",
        {
          hint: "Run `bun run --cwd apps/web build` or set VITE_DEV_SERVER_URL for dev mode.",
        },
      );
    }

    yield* start;

    const localUrl = `http://localhost:${config.port}`;
    const bindUrl =
      config.host && !isWildcardHost(config.host)
        ? `http://${formatHostForUrl(config.host)}:${config.port}`
        : localUrl;
    const pairingBaseUrl = config.publicUrl?.origin ?? bindUrl;
    const startupPairingUrl =
      config.publicUrl || !isLoopbackHost(config.host)
        ? yield* serverAuth.issueStartupPairingUrl(pairingBaseUrl).pipe(
            Effect.mapError(
              (cause) =>
                new StartupError({
                  message: "Failed to create the remote-access startup pairing link.",
                  cause,
                }),
            ),
          )
        : undefined;

    yield* Effect.forkChild(recordStartupHeartbeat);

    yield* Effect.logInfo("OmniMind running", makeServerStartupLogData(config));
    if (startupPairingUrl) {
      if (config.allowInsecureRemote && !config.publicUrl) {
        yield* Effect.logWarning(
          "INSECURE REMOTE ACCESS ENABLED: credentials and session traffic are unencrypted",
          {
            pairingUrl: startupPairingUrl,
            hint: "Use only on a trusted LAN. Configure OMNIMIND_PUBLIC_URL behind HTTPS for protected remote access.",
          },
        );
      }
      yield* Effect.logInfo(
        config.publicUrl
          ? "Remote access requires an authenticated owner session"
          : "Insecure remote pairing link created",
        {
          pairingUrl: startupPairingUrl,
          hint:
            isWildcardHost(config.host) && !config.publicUrl
              ? "Replace localhost in this one-time URL with the server's reachable hostname or IP."
              : "Open this one-time URL to establish the first owner session.",
        },
      );
    }

    if (!config.noBrowser) {
      const target = startupPairingUrl ?? config.devUrl?.toString() ?? bindUrl;
      yield* openDeps.openBrowser(target).pipe(
        Effect.catch(() =>
          Effect.logInfo("browser auto-open unavailable", {
            hint: `Open ${target} in your browser.`,
          }),
        ),
      );
    }

    return yield* stopSignal;
  }).pipe(Effect.scoped, Effect.provide(LayerLive(input)));

/**
 * These flags mirrors the environment variables and the config shape.
 */

const modeFlag = Flag.choice("mode", ["web", "desktop"]).pipe(
  Flag.withDescription("Runtime mode. `desktop` keeps loopback defaults unless overridden."),
  Flag.optional,
);
const portFlag = Flag.integer("port").pipe(
  Flag.withSchema(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 }))),
  Flag.withDescription("Port for the HTTP/WebSocket server."),
  Flag.optional,
);
const hostFlag = Flag.string("host").pipe(
  Flag.withDescription("Host/interface to bind (for example 127.0.0.1, 0.0.0.0, or a Tailnet IP)."),
  Flag.optional,
);
const omnimindHomeFlag = Flag.string("home-dir").pipe(
  Flag.withDescription("Base directory for all OmniMind data (equivalent to OMNIMIND_HOME)."),
  Flag.optional,
);
const devUrlFlag = Flag.string("dev-url").pipe(
  Flag.withSchema(Schema.URLFromString),
  Flag.withDescription("Dev web URL to proxy/redirect to (equivalent to VITE_DEV_SERVER_URL)."),
  Flag.optional,
);
const publicUrlFlag = Flag.string("public-url").pipe(
  Flag.withSchema(Schema.URLFromString),
  Flag.withDescription(
    "HTTPS public root origin provided by a TLS-terminating reverse proxy (equivalent to OMNIMIND_PUBLIC_URL).",
  ),
  Flag.optional,
);
const allowInsecureRemoteFlag = optionalBooleanFlag("allow-insecure-remote", {
  description:
    "Explicitly allow unencrypted authenticated remote access on a trusted LAN (equivalent to OMNIMIND_ALLOW_INSECURE_REMOTE).",
});
const noBrowserFlag = optionalBooleanFlag("no-browser", {
  description: "Disable automatic browser opening.",
  negativeName: "browser",
  negativeDescription: "Enable automatic browser opening.",
});
const authTokenFlag = Flag.string("auth-token").pipe(
  Flag.withDescription("Auth token required for WebSocket connections."),
  Flag.withAlias("token"),
  Flag.optional,
);
const autoBootstrapProjectFromCwdFlag = optionalBooleanFlag("auto-bootstrap-project-from-cwd", {
  description: "Create a project for the current working directory on startup when missing.",
});
const logWebSocketEventsFlag = optionalBooleanFlag("log-websocket-events", {
  description:
    "Emit server-side logs for outbound WebSocket push traffic (equivalent to OMNIMIND_LOG_WS_EVENTS).",
  aliases: ["log-ws-events"],
});

const baseServerCommand = Command.make("omnimind", {
  mode: modeFlag,
  port: portFlag,
  host: hostFlag,
  omnimindHome: omnimindHomeFlag,
  devUrl: devUrlFlag,
  publicUrl: publicUrlFlag,
  allowInsecureRemote: allowInsecureRemoteFlag,
  noBrowser: noBrowserFlag,
  authToken: authTokenFlag,
  autoBootstrapProjectFromCwd: autoBootstrapProjectFromCwdFlag,
  logWebSocketEvents: logWebSocketEventsFlag,
}).pipe(Command.withDescription("Run the OmniMind server."));

const serverCommand = baseServerCommand.pipe(
  Command.withHandler((input) => makeServerProgram(input)),
);

export const omnimindCli = serverCommand;

/**
 * EngineHealthLive - Cache-backed engine health service.
 *
 * Seeds engine status from disk cache when available, then refreshes from
 * CLI probes without blocking the rest of server startup.
 *
 * Uses effect's ChildProcessSpawner to run CLI probes natively.
 *
 * @module EngineHealthLive
 */
import * as OS from "node:os";
import type {
  EngineKind,
  ServerSettings,
  ServerEngineAuthStatus,
  ServerEngineStatus,
  ServerEngineStatusState,
  ServerEngineUpdateState,
} from "@harnessos/contracts";
import { ENGINE_KINDS, ServerEngineUpdateError } from "@harnessos/contracts";
import { parseCodexConfigModelProvider } from "@harnessos/shared/codexConfig";
import { decodeJsonResult } from "@harnessos/shared/schemaJson";
import { prepareWindowsSafeProcess } from "@harnessos/shared/windowsProcess";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import {
  Array,
  Cache,
  DateTime,
  Duration,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Layer,
  Option,
  Path,
  PubSub,
  Ref,
  Result,
  Schema,
  Scope,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { isServerEngineEnabled } from "@harnessos/shared/serverSettings";

import { resolveExecutable } from "../../executableLookup.ts";

import {
  compareCodexCliVersions,
  formatCodexCliUpgradeMessage,
  isCodexCliVersionSupported,
  MINIMUM_CODEX_AUTO_REVIEW_CLI_VERSION,
  parseCodexCliVersion,
} from "../codexCliVersion";
import { ServerConfig } from "../../config";
import { buildEngineChildEnvironment } from "../engineChildEnvironment.ts";
import { ServerSettingsService } from "../../serverSettings";
import { isWindowsShellCommandMissingResult } from "../../shell-command-detection";
import {
  buildCursorAgentCommand,
  buildCursorAgentHeadlessEnv,
  DEFAULT_CURSOR_AGENT_BINARY,
  resolveCursorAgentBinaryPath,
} from "../acp/CursorAcpCommand";
import { hasDroidApiKeyEnv, resolveDroidCliBinaryPath } from "../acp/DroidAcpSupport";
import { hasGrokApiKeyEnv } from "../acp/GrokAcpSupport";
import {
  claudeAuthMetadata,
  isStructuredClaudeAuthFalseNegativeCandidate,
  parseClaudeAuthStatusFromOutput,
} from "../claudeAuthStatus";
import { acquireClaudeAuthStatusLock } from "../claudeAuthStatusLock";
import { loadClaudeAgentSdk } from "../claudeAgentSdk.ts";
import { buildClaudeProcessEnv, readClaudeCliCredentialsSummary } from "../claudeProcessEnv";
import {
  detailFromResult,
  extractAuthBoolean,
  extractAuthMethod,
  makeCommandMissingCause,
  nonEmptyTrimmed,
  ENGINE_COMMAND_TIMEOUT_DETAIL,
  toTitleCaseWords,
  type CommandResult,
} from "../engineCliOutput";
import { probeEngineCliVersion } from "../engineCliVersionProbe";
import { EngineHealth, type EngineHealthShape } from "../Services/EngineHealth";
import {
  orderEngineStatuses,
  readEngineStatusCache,
  resolveEngineStatusCachePath,
  writeEngineStatusCache,
} from "../engineStatusCache";
import { makeEngineMaintenanceCommandCoordinator } from "../engineMaintenanceCommandCoordinator";
import {
  enrichEngineStatusWithVersionAdvisory,
  compareSemverVersions,
  makeEngineMaintenanceCapabilities,
  normalizeCommandPath,
  parseGenericCliVersion,
  resolveEngineMaintenanceCapabilitiesEffect,
  type PackageManagedEngineMaintenanceDefinition,
} from "../engineMaintenance";
import { isClaudeAutoModeCliVersionSupported } from "../claudeCliVersion.ts";
import { collectUint8StreamText } from "../../stream/collectUint8StreamText";
import { buildCodexProcessEnv } from "../../codexProcessEnv.ts";

export { parseClaudeAuthStatusFromOutput } from "../claudeAuthStatus";
export type { CommandResult } from "../engineCliOutput";

const DEFAULT_TIMEOUT_MS = 4_000;
const CLAUDE_HEALTH_TIMEOUT_MS = 20_000;
const OPENCODE_HEALTH_TIMEOUT_MS = 20_000;
const CODEX_AUTH_STATUS_ARGS = ["-c", "mcp_servers={}", "login", "status"] as const;
const CODEX_ENGINE = "codex" as const;
const CLAUDE_ENGINE = "claude" as const;
const CURSOR_ENGINE = "cursor" as const;
const ANTIGRAVITY_ENGINE = "antigravity" as const;
const GROK_ENGINE = "grok" as const;
const DROID_ENGINE = "droid" as const;
const KILO_ENGINE = "kilo" as const;
const OPENCODE_ENGINE = "opencode" as const;
const PI_ENGINE = "pi" as const;
const OA_ENGINE = "oa" as const;
const BUNDLED_OA_RUNTIME_VERSION = "0.84.4";
type EngineStatuses = ReadonlyArray<ServerEngineStatus>;
const DISABLED_ENGINE_STATUS_MESSAGE = "Engine is disabled in Haros settings.";
const MINIMUM_ANTIGRAVITY_CLI_VERSION = "1.0.12";

const ENGINES = ENGINE_KINDS;

const engineCommandEnv = (engine: EngineKind): NodeJS.ProcessEnv =>
  buildEngineChildEnvironment({ engine });

const UPDATE_OUTPUT_MAX_BYTES = 10_000;
export const ENGINE_UPDATE_TIMEOUT_MS = 2 * 60_000;

function formatEngineUpdateTimeout(timeoutMs: number): string {
  if (timeoutMs < 1_000) {
    return `${timeoutMs} ${timeoutMs === 1 ? "millisecond" : "milliseconds"}`;
  }
  if (timeoutMs % 60_000 === 0) {
    const minutes = timeoutMs / 60_000;
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  const seconds = timeoutMs / 1_000;
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

function isClaudeNativeCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return (
    normalized.endsWith("/.local/bin/claude") ||
    normalized.endsWith("/.local/bin/claude.exe") ||
    normalized.includes("/.local/share/claude/")
  );
}

function isClaudeLatestHomebrewCommandPath(commandPath: string): boolean {
  return normalizeCommandPath(commandPath).includes("/caskroom/claude-code@latest/");
}

function isOpenCodeNativeCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return (
    normalized.endsWith("/.opencode/bin/opencode") ||
    normalized.endsWith("/.opencode/bin/opencode.exe")
  );
}

function isKiloNativeCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return (
    normalized.endsWith("/.kilo/bin/kilo") ||
    normalized.endsWith("/.local/bin/kilo") ||
    normalized.includes("/.local/share/kilo/bin/")
  );
}

export const PACKAGE_MANAGED_PROVIDER_UPDATES: Partial<
  Record<EngineKind, PackageManagedEngineMaintenanceDefinition>
> = {
  codex: {
    engine: CODEX_ENGINE,
    binaryName: "codex",
    npmPackageName: "@openai/codex",
    homebrew: { name: "codex", kind: "cask" },
    nativeUpdate: null,
  },
  claude: {
    engine: CLAUDE_ENGINE,
    binaryName: "claude",
    npmPackageName: "@anthropic-ai/claude-code",
    homebrew: {
      name: "claude-code",
      kind: "cask",
      variants: [
        {
          name: "claude-code@latest",
          kind: "cask",
          isCommandPath: isClaudeLatestHomebrewCommandPath,
        },
      ],
    },
    nativeUpdate: {
      executable: "claude",
      args: () => ["update"],
      lockKey: "claude-native",
      strategy: "matching-path",
      // Native Claude owns stable/latest channel selection. npm's latest tag cannot
      // tell whether the installed CLI is current for the user's configured channel.
      latestVersionSource: null,
      isCommandPath: isClaudeNativeCommandPath,
    },
  },
  antigravity: {
    engine: ANTIGRAVITY_ENGINE,
    binaryName: "agy",
    // Antigravity is distributed as a native binary and owns its update channel.
    npmPackageName: null,
    homebrew: null,
    latestVersionSource: null,
    nativeUpdate: {
      executable: "agy",
      args: () => ["update"],
      lockKey: "antigravity-native",
      strategy: "always",
    },
  },
  droid: {
    engine: DROID_ENGINE,
    binaryName: "droid",
    npmPackageName: "@factory/cli",
    homebrew: null,
    nativeUpdate: {
      executable: "droid",
      args: () => ["update"],
      lockKey: "droid-native",
      strategy: "always",
    },
  },
  kilo: {
    engine: KILO_ENGINE,
    binaryName: "kilo",
    npmPackageName: "@kilocode/cli",
    homebrew: null,
    nativeUpdate: {
      executable: "kilo",
      args: () => ["upgrade"],
      lockKey: "kilo-native",
      strategy: "matching-path",
      isCommandPath: isKiloNativeCommandPath,
    },
  },
  opencode: {
    engine: OPENCODE_ENGINE,
    binaryName: "opencode",
    npmPackageName: "opencode-ai",
    homebrew: { name: "anomalyco/tap/opencode", kind: "formula" },
    latestVersionSource: { kind: "npm", name: "opencode-ai" },
    nativeUpdate: {
      executable: "opencode",
      args: (installSource) =>
        installSource === "unknown" || installSource === "native"
          ? ["upgrade"]
          : ["upgrade", "--method", installSource],
      lockKey: "opencode-native",
      strategy: "always",
      excludedInstallSources: ["homebrew"],
      isCommandPath: isOpenCodeNativeCommandPath,
    },
  },
  pi: {
    engine: PI_ENGINE,
    binaryName: "pi",
    // Pi is part of the Haros App runtime. App updates own this version;
    // engine maintenance must never mutate it behind the App's back.
    npmPackageName: null,
    homebrew: null,
    latestVersionSource: null,
    nativeUpdate: null,
  },
};

// ── Pure helpers ────────────────────────────────────────────────────
//
// Generic CLI-output parsing lives in ../engineCliOutput; Claude auth-status
// interpretation lives in ../claudeAuthStatus.

function resolveVoiceTranscriptionAvailability(
  authMethod: string | undefined,
): boolean | undefined {
  if (!authMethod) {
    return undefined;
  }
  return authMethod === "chatgpt" || authMethod === "chatgptAuthTokens";
}

// ── Subscription type detection ─────────────────────────────────────
//
// Walks arbitrary JSON output from `<engine> auth status` looking for a
// subscription/plan identifier. Used as a best-effort first pass; the SDK
// probe below is the reliable source when available.

const SUBSCRIPTION_TYPE_KEYS = [
  "subscriptionType",
  "subscription_type",
  "plan",
  "tier",
  "planType",
  "plan_type",
] as const;

const SUBSCRIPTION_CONTAINER_KEYS = ["account", "subscription", "user", "billing"] as const;
const AUTH_METHOD_KEYS = ["authMethod", "auth_method"] as const;
const AUTH_METHOD_CONTAINER_KEYS = ["auth", "account", "session"] as const;

const asNonEmptyString = (v: unknown): Option.Option<string> =>
  typeof v === "string" && v.length > 0 ? Option.some(v) : Option.none();

const asRecord = (v: unknown): Option.Option<Record<string, unknown>> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? Option.some(v as Record<string, unknown>)
    : Option.none();

function findSubscriptionType(value: unknown): Option.Option<string> {
  if (Array.isArray(value)) {
    return Option.firstSomeOf(value.map(findSubscriptionType));
  }
  return asRecord(value).pipe(
    Option.flatMap((record) => {
      const direct = Option.firstSomeOf(
        SUBSCRIPTION_TYPE_KEYS.map((key) => asNonEmptyString(record[key])),
      );
      if (Option.isSome(direct)) return direct;
      return Option.firstSomeOf(
        SUBSCRIPTION_CONTAINER_KEYS.map((key) =>
          asRecord(record[key]).pipe(Option.flatMap(findSubscriptionType)),
        ),
      );
    }),
  );
}

function findAuthMethodDeep(value: unknown): Option.Option<string> {
  if (Array.isArray(value)) {
    return Option.firstSomeOf(value.map(findAuthMethodDeep));
  }
  return asRecord(value).pipe(
    Option.flatMap((record) => {
      const direct = Option.firstSomeOf(
        AUTH_METHOD_KEYS.map((key) => asNonEmptyString(record[key])),
      );
      if (Option.isSome(direct)) return direct;
      return Option.firstSomeOf(
        AUTH_METHOD_CONTAINER_KEYS.map((key) =>
          asRecord(record[key]).pipe(Option.flatMap(findAuthMethodDeep)),
        ),
      );
    }),
  );
}

const decodeUnknownJson = decodeJsonResult(Schema.Unknown);

function extractSubscriptionTypeFromOutput(result: CommandResult): string | undefined {
  const parsed = decodeUnknownJson(result.stdout.trim());
  if (Result.isFailure(parsed)) return undefined;
  return Option.getOrUndefined(findSubscriptionType(parsed.success));
}

function extractClaudeAuthMethodFromOutput(result: CommandResult): string | undefined {
  const parsed = decodeUnknownJson(result.stdout.trim());
  if (Result.isFailure(parsed)) return undefined;
  return Option.getOrUndefined(findAuthMethodDeep(parsed.success));
}

// ── Codex subscription label ────────────────────────────────────────

type CodexPlanTypeLiteral =
  | "free"
  | "go"
  | "plus"
  | "pro"
  | "team"
  | "business"
  | "enterprise"
  | "edu"
  | "self_serve_business_usage_based"
  | "enterprise_cbp_usage_based"
  | "unknown";

function codexAccountAuthLabel(input: {
  readonly type: string | undefined;
  readonly planType: string | undefined;
}): string | undefined {
  if (input.type === "apiKey") return "OpenAI API Key";
  if (!input.planType) return undefined;
  switch (input.planType as CodexPlanTypeLiteral) {
    case "free":
      return "ChatGPT Free Subscription";
    case "go":
      return "ChatGPT Go Subscription";
    case "plus":
      return "ChatGPT Plus Subscription";
    case "pro":
      return "ChatGPT Pro Subscription";
    case "team":
      return "ChatGPT Team Subscription";
    case "self_serve_business_usage_based":
    case "business":
      return "ChatGPT Business Subscription";
    case "enterprise_cbp_usage_based":
    case "enterprise":
      return "ChatGPT Enterprise Subscription";
    case "edu":
      return "ChatGPT Edu Subscription";
    case "unknown":
      return "ChatGPT Subscription";
    default:
      return toTitleCaseWords(input.planType);
  }
}

function extractCodexAccountTypeFromOutput(result: CommandResult): string | undefined {
  const parsed = decodeUnknownJson(result.stdout.trim());
  if (Result.isFailure(parsed)) return undefined;
  const walk = (value: unknown): string | undefined => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        const nested = walk(entry);
        if (nested) return nested;
      }
      return undefined;
    }
    const record = Option.getOrUndefined(asRecord(value));
    if (!record) return undefined;
    const direct = Option.getOrUndefined(
      Option.firstSomeOf(["type", "accountType"].map((key) => asNonEmptyString(record[key]))),
    );
    if (direct) return direct;
    for (const key of ["account", "session", "auth"] as const) {
      const nested = walk(record[key]);
      if (nested) return nested;
    }
    return undefined;
  };
  return walk(parsed.success);
}

// ── Claude SDK capability probe ─────────────────────────────────────
//
// Spawns a lightweight Claude Agent SDK session and reads the
// initialization result. The prompt is a never-yielding AsyncIterable so
// no user message reaches the Anthropic API — we get account metadata
// (including subscription type) from local IPC, then abort the
// subprocess. Used as a fallback when `claude auth status` output
// doesn't include subscription info.

const CAPABILITIES_PROBE_TIMEOUT_MS = 8_000;

function waitForAbortSignal(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

const probeClaudeSubscription = () => {
  const abort = new AbortController();
  return Effect.tryPromise(async () => {
    const { query: claudeQuery } = await loadClaudeAgentSdk();
    const q = claudeQuery({
      // oxlint-disable-next-line require-yield
      prompt: (async function* (): AsyncGenerator<SDKUserMessage> {
        await waitForAbortSignal(abort.signal);
      })(),
      options: {
        persistSession: false,
        abortController: abort,
        settingSources: ["user", "project", "local"],
        allowedTools: [],
        stderr: () => {},
      },
    });
    const init = await q.initializationResult();
    return { subscriptionType: init.account?.subscriptionType };
  }).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        if (!abort.signal.aborted) abort.abort();
      }),
    ),
    Effect.timeoutOption(CAPABILITIES_PROBE_TIMEOUT_MS),
    Effect.result,
    Effect.map((result) => {
      if (Result.isFailure(result)) return undefined;
      return Option.isSome(result.success) ? result.success.value : undefined;
    }),
  );
};

export function parseAuthStatusFromOutput(result: CommandResult): {
  readonly status: ServerEngineStatusState;
  readonly authStatus: ServerEngineAuthStatus;
  readonly voiceTranscriptionAvailable?: boolean;
  readonly message?: string;
} {
  const lowerOutput = `${result.stdout}\n${result.stderr}`.toLowerCase();

  if (
    lowerOutput.includes("unknown command") ||
    lowerOutput.includes("unrecognized command") ||
    lowerOutput.includes("unexpected argument")
  ) {
    return {
      status: "warning",
      authStatus: "unknown",
      message: "Codex CLI authentication status command is unavailable in this Codex version.",
    };
  }

  if (
    lowerOutput.includes("not logged in") ||
    lowerOutput.includes("login required") ||
    lowerOutput.includes("authentication required") ||
    lowerOutput.includes("run `codex login`") ||
    lowerOutput.includes("run codex login")
  ) {
    return {
      status: "error",
      authStatus: "unauthenticated",
      message: "Codex CLI is not authenticated. Run `codex login` and try again.",
    };
  }

  const parsedAuth = (() => {
    const trimmed = result.stdout.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
      return {
        attemptedJsonParse: false as const,
        auth: undefined as boolean | undefined,
        authMethod: undefined as string | undefined,
      };
    }
    try {
      const parsed = JSON.parse(trimmed);
      return {
        attemptedJsonParse: true as const,
        auth: extractAuthBoolean(parsed),
        authMethod: extractAuthMethod(parsed),
      };
    } catch {
      return {
        attemptedJsonParse: false as const,
        auth: undefined as boolean | undefined,
        authMethod: undefined as string | undefined,
      };
    }
  })();

  if (parsedAuth.auth === true) {
    const voiceTranscriptionAvailable = resolveVoiceTranscriptionAvailability(
      parsedAuth.authMethod,
    );
    return {
      status: "ready",
      authStatus: "authenticated",
      ...(voiceTranscriptionAvailable !== undefined ? { voiceTranscriptionAvailable } : {}),
    };
  }
  if (parsedAuth.auth === false) {
    return {
      status: "error",
      authStatus: "unauthenticated",
      message: "Codex CLI is not authenticated. Run `codex login` and try again.",
    };
  }
  if (parsedAuth.attemptedJsonParse) {
    return {
      status: "warning",
      authStatus: "unknown",
      message:
        "Could not verify Codex authentication status from JSON output (missing auth marker).",
    };
  }
  if (result.code === 0) {
    return { status: "ready", authStatus: "authenticated" };
  }

  const detail = detailFromResult(result);
  return {
    status: "warning",
    authStatus: "unknown",
    message: detail
      ? `Could not verify Codex authentication status. ${detail}`
      : "Could not verify Codex authentication status.",
  };
}

// ── Codex CLI config detection ──────────────────────────────────────

/**
 * Engines that use OpenAI-native authentication via `codex login`.
 * When the configured `model_provider` is one of these, the `codex login
 * status` probe still runs. For any other engine value the auth probe
 * is skipped because authentication is handled externally (e.g. via
 * environment variables like `PORTKEY_API_KEY` or `AZURE_API_KEY`).
 */
const OPENAI_AUTH_PROVIDERS = new Set(["openai"]);

/**
 * Read the `model_provider` value from the Codex CLI config file.
 *
 * Looks for the file at `$CODEX_HOME/config.toml` (falls back to
 * `~/.codex/config.toml`). Uses a simple line-by-line scan rather than
 * a full TOML parser to avoid adding a dependency for a single key.
 *
 * Returns `undefined` when the file does not exist or does not set
 * `model_provider`.
 */
export const readCodexConfigModelProvider = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const codexHome = process.env.CODEX_HOME || path.join(OS.homedir(), ".codex");
  const configPath = path.join(codexHome, "config.toml");

  const content = yield* fileSystem
    .readFileString(configPath)
    .pipe(Effect.orElseSucceed(() => undefined));
  if (content === undefined) {
    return undefined;
  }

  return parseCodexConfigModelProvider(content);
});

/**
 * Returns `true` when the Codex CLI is configured with a custom
 * (non-OpenAI) model engine, meaning `codex login` auth is not
 * required because authentication is handled through engine-specific
 * environment variables.
 */
export const hasCustomModelProvider = Effect.map(
  readCodexConfigModelProvider,
  (engine) => engine !== undefined && !OPENAI_AUTH_PROVIDERS.has(engine),
);

// ── Effect-native command execution ─────────────────────────────────

const collectStreamAsString = <E>(stream: Stream.Stream<Uint8Array, E>): Effect.Effect<string, E> =>
  Stream.runFold(
    stream,
    () => "",
    (acc, chunk) => acc + new TextDecoder().decode(chunk),
  );

const runEngineCommand = (
  executable: string,
  args: ReadonlyArray<string>,
  env: NodeJS.ProcessEnv,
) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const prepared = prepareWindowsSafeProcess(executable, args, { env });
    const command = ChildProcess.make(prepared.command, prepared.args, {
      shell: prepared.shell,
      ...(prepared.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
      env,
      // Health probes are non-interactive. Leaving stdin as a pipe can keep CLIs
      // such as Antigravity waiting even after a read-only subcommand has finished.
      stdin: "ignore",
    });

    const child = yield* spawner.spawn(command);

    const [stdout, stderr, exitCode] = yield* Effect.all(
      [
        collectStreamAsString(child.stdout),
        collectStreamAsString(child.stderr),
        child.exitCode.pipe(Effect.map(Number)),
      ],
      { concurrency: "unbounded" },
    );

    return { stdout, stderr, code: exitCode } satisfies CommandResult;
  }).pipe(Effect.scoped);

const runCodexCommand = (
  args: ReadonlyArray<string>,
  executable = "codex",
  env: NodeJS.ProcessEnv = engineCommandEnv(CODEX_ENGINE),
) =>
  runEngineCommand(executable, args, env).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

const runClaudeCommand = (
  args: ReadonlyArray<string>,
  executable = "claude",
  env: NodeJS.ProcessEnv = buildClaudeProcessEnv(),
) =>
  runEngineCommand(executable, args, env).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

const runGrokCommand = (args: ReadonlyArray<string>, executable = "grok") =>
  runEngineCommand(executable, args, engineCommandEnv(GROK_ENGINE)).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

const runOpenCodeCommand = (args: ReadonlyArray<string>, executable = "opencode") =>
  runEngineCommand(executable, args, engineCommandEnv(OPENCODE_ENGINE)).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

const runKiloCommand = (args: ReadonlyArray<string>, executable = "kilo") =>
  runEngineCommand(executable, args, engineCommandEnv(KILO_ENGINE)).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

const runCursorCommand = (
  args: ReadonlyArray<string>,
  executable = DEFAULT_CURSOR_AGENT_BINARY,
) => {
  const command = buildCursorAgentCommand(executable, args);
  return runEngineCommand(command.command, command.args, buildCursorAgentHeadlessEnv()).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(command.command))
        : Effect.succeed(result),
    ),
  );
};

function parseCursorAuthStatusFromOutput(result: CommandResult): {
  readonly status: ServerEngineStatusState;
  readonly authStatus: ServerEngineAuthStatus;
  readonly message?: string;
} {
  const output = `${result.stdout}\n${result.stderr}`;
  const lowerOutput = output.toLowerCase();

  if (
    lowerOutput.includes("unknown command") ||
    lowerOutput.includes("unrecognized command") ||
    lowerOutput.includes("unexpected argument")
  ) {
    return {
      status: "warning",
      authStatus: "unknown",
      message:
        "Cursor Agent authentication status command is unavailable in this Cursor Agent version.",
    };
  }

  if (
    lowerOutput.includes("authentication required") ||
    lowerOutput.includes("not logged in") ||
    lowerOutput.includes("not authenticated") ||
    lowerOutput.includes("unauthenticated") ||
    lowerOutput.includes("login required") ||
    lowerOutput.includes("run 'agent login'") ||
    lowerOutput.includes("run `agent login`") ||
    lowerOutput.includes("run cursor-agent login")
  ) {
    return {
      status: "error",
      authStatus: "unauthenticated",
      message: "Cursor Agent is not authenticated. Run `cursor-agent login` and try again.",
    };
  }

  if (
    lowerOutput.includes("logged in") ||
    lowerOutput.includes("login successful") ||
    lowerOutput.includes("authenticated")
  ) {
    return { status: "ready", authStatus: "authenticated" };
  }

  if (result.code === 0) {
    return {
      status: "warning",
      authStatus: "unknown",
      message: "Cursor Agent is installed, but Haros could not verify authentication status.",
    };
  }

  const detail = detailFromResult(result);
  return {
    status: "warning",
    authStatus: "unknown",
    message: detail
      ? `Could not verify Cursor Agent authentication status. ${detail}`
      : "Could not verify Cursor Agent authentication status.",
  };
}

function cursorModelsOutputHasModels(output: string): boolean {
  return output.split(/\r?\n/u).some((line) => line.trim().length > 0 && line.includes(" - "));
}

function cursorModelsOutputHasNoModels(output: string): boolean {
  return output.toLowerCase().includes("no models available");
}

const runAntigravityCommand = (args: ReadonlyArray<string>, executable = "agy") =>
  runEngineCommand(executable, args, engineCommandEnv(ANTIGRAVITY_ENGINE)).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

// ── Health check ────────────────────────────────────────────────────

async function makeCodexProbeEnv(homePath?: string): Promise<NodeJS.ProcessEnv> {
  const normalizedHomePath = nonEmptyTrimmed(homePath);
  return buildCodexProcessEnv({
    ...(normalizedHomePath ? { homePath: normalizedHomePath } : {}),
  });
}

const readCodexConfigModelProviderForEnv = (env: NodeJS.ProcessEnv) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const codexHome = env.CODEX_HOME?.trim() || path.join(OS.homedir(), ".codex");
    const configPath = path.join(codexHome, "config.toml");

    const content = yield* fileSystem
      .readFileString(configPath)
      .pipe(Effect.orElseSucceed(() => undefined));
    if (content === undefined) {
      return undefined;
    }

    return parseCodexConfigModelProvider(content);
  });

const hasCustomModelProviderForEnv = (env: NodeJS.ProcessEnv) =>
  Effect.map(
    readCodexConfigModelProviderForEnv(env),
    (engine) => engine !== undefined && !OPENAI_AUTH_PROVIDERS.has(engine),
  );

export const makeCheckCodexEngineStatus = (
  binaryPath?: string,
  homePath?: string,
): Effect.Effect<
  ServerEngineStatus,
  never,
  ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path
> => {
  const executable = nonEmptyTrimmed(binaryPath) ?? "codex";
  return Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const probeEnv = yield* Effect.promise(() => makeCodexProbeEnv(homePath));

    // Probe 1: `codex --version` — is the CLI reachable?
    const versionProbe = yield* probeEngineCliVersion(
      runCodexCommand(["--version"], executable, probeEnv),
      DEFAULT_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: CODEX_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Codex CLI (`codex`) is not installed or not on PATH."
            : `Failed to execute Codex CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      };
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: CODEX_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: "Codex CLI is installed but failed to run. Timed out while running command.",
      };
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: CODEX_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `Codex CLI is installed but failed to run. ${detail}`
          : "Codex CLI is installed but failed to run.",
      };
    }
    const version = versionProbe.result;

    const parsedVersion = parseCodexCliVersion(`${version.stdout}\n${version.stderr}`);
    if (parsedVersion && !isCodexCliVersionSupported(parsedVersion)) {
      return {
        engine: CODEX_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: formatCodexCliUpgradeMessage(parsedVersion),
      };
    }
    const supportsAutoRuntimeMode =
      parsedVersion !== null &&
      compareCodexCliVersions(parsedVersion, MINIMUM_CODEX_AUTO_REVIEW_CLI_VERSION) >= 0;

    // Probe 2: `codex login status` — is the user authenticated?
    //
    // Custom model engines (e.g. Portkey, Azure OpenAI proxy) handle
    // authentication through their own environment variables, so `codex
    // login status` will report "not logged in" even when the CLI works
    // fine.  Skip the auth probe entirely for non-OpenAI engines.
    if (yield* hasCustomModelProviderForEnv(probeEnv)) {
      return {
        engine: CODEX_ENGINE,
        status: "ready" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        supportsAutoRuntimeMode,
        checkedAt,
        message: "Using a custom Codex model engine; OpenAI login check skipped.",
      } satisfies ServerEngineStatus;
    }

    const authProbe = yield* runCodexCommand(CODEX_AUTH_STATUS_ARGS, executable, probeEnv).pipe(
      Effect.timeoutOption(DEFAULT_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(authProbe)) {
      const error = authProbe.failure;
      return {
        engine: CODEX_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        supportsAutoRuntimeMode,
        checkedAt,
        message:
          error instanceof Error
            ? `Could not verify Codex authentication status: ${error.message}.`
            : "Could not verify Codex authentication status.",
      };
    }

    if (Option.isNone(authProbe.success)) {
      return {
        engine: CODEX_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        supportsAutoRuntimeMode,
        checkedAt,
        message: "Could not verify Codex authentication status. Timed out while running command.",
      };
    }

    const authOutput = authProbe.success.value;
    const parsed = parseAuthStatusFromOutput(authOutput);
    const codexPlanType = extractSubscriptionTypeFromOutput(authOutput);
    const codexAccountType = extractCodexAccountTypeFromOutput(authOutput);
    const codexLabel =
      parsed.authStatus === "authenticated"
        ? codexAccountAuthLabel({ type: codexAccountType, planType: codexPlanType })
        : undefined;
    const codexAuthType =
      parsed.authStatus === "authenticated"
        ? codexAccountType === "apiKey"
          ? "apiKey"
          : codexPlanType
        : undefined;

    return {
      engine: CODEX_ENGINE,
      status: parsed.status,
      available: true,
      authStatus: parsed.authStatus,
      version: parsedVersion,
      supportsAutoRuntimeMode,
      ...(codexAuthType ? { authType: codexAuthType } : {}),
      ...(codexLabel ? { authLabel: codexLabel } : {}),
      ...(parsed.voiceTranscriptionAvailable !== undefined
        ? { voiceTranscriptionAvailable: parsed.voiceTranscriptionAvailable }
        : {}),
      checkedAt,
      ...(parsed.message ? { message: parsed.message } : {}),
    } satisfies ServerEngineStatus;
  }).pipe(
    Effect.map((status) => ({
      ...status,
      checkedBinaryPath: executable,
      autoRuntimeModeBinaryPath: executable,
    })),
  );
};

export const checkCodexEngineStatus = makeCheckCodexEngineStatus();

// ── Claude Agent health check ───────────────────────────────────────

const CLAUDE_AUTH_FALSE_NEGATIVE_RETRY_DELAY_MS = 1_000;

export const makeCheckClaudeEngineStatus = (
  resolveSubscriptionType?: Effect.Effect<string | undefined>,
  binaryPath?: string,
  homeDir?: string,
  options?: { readonly falseNegativeRetryDelayMs?: number },
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> => {
  const executable = nonEmptyTrimmed(binaryPath) ?? "claude";
  return Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const claudeEnv = buildClaudeProcessEnv(
      homeDir ? { env: process.env, homeDir } : { env: process.env },
    );

    // Probe 1: `claude --version` — is the CLI reachable?
    const versionProbe = yield* probeEngineCliVersion(
      runClaudeCommand(["--version"], executable, claudeEnv),
      CLAUDE_HEALTH_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: CLAUDE_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Claude Agent CLI (`claude`) is not installed or not on PATH."
            : `Failed to execute Claude Agent CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      };
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: CLAUDE_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message:
          "Claude Agent CLI is installed but failed to run. Timed out while running command.",
      };
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: CLAUDE_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `Claude Agent CLI is installed but failed to run. ${detail}`
          : "Claude Agent CLI is installed but failed to run.",
      };
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);
    const supportsAutoRuntimeMode = isClaudeAutoModeCliVersionSupported(parsedVersion);

    // Probe 2: `claude auth status` — is the user authenticated? The command can
    // redeem a single-use rotating OAuth refresh token, so it is serialized with
    // every other `claude auth status` invocation in this process (credential
    // keepalive, concurrent health probes) via the shared lock.
    const runAuthStatusProbe = Effect.acquireUseRelease(
      Effect.promise(() => acquireClaudeAuthStatusLock()),
      () =>
        runClaudeCommand(["auth", "status"], executable, claudeEnv).pipe(
          Effect.timeoutOption(CLAUDE_HEALTH_TIMEOUT_MS),
        ),
      (release) => Effect.sync(release),
    ).pipe(Effect.result);

    const authProbe = yield* runAuthStatusProbe;

    if (Result.isFailure(authProbe)) {
      const error = authProbe.failure;
      return {
        engine: CLAUDE_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        supportsAutoRuntimeMode,
        checkedAt,
        message:
          error instanceof Error
            ? `Could not verify Claude authentication status: ${error.message}.`
            : "Could not verify Claude authentication status.",
      };
    }

    if (Option.isNone(authProbe.success)) {
      return {
        engine: CLAUDE_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        supportsAutoRuntimeMode,
        checkedAt,
        message: "Could not verify Claude authentication status. Timed out while running command.",
      };
    }

    let authOutput = authProbe.success.value;
    let parsed = parseClaudeAuthStatusFromOutput(authOutput);
    const credentialSummary = readClaudeCliCredentialsSummary(
      homeDir ? { env: claudeEnv, homeDir } : { env: claudeEnv },
    );
    // A structured `loggedIn:false` with a clean exit and no local credential
    // record to rescue it (macOS keeps OAuth in the Keychain, not on disk) is
    // the signature of a lost refresh-token rotation race with a concurrent
    // `claude auth status` invocation. Re-probe once after the rotation settles.
    if (
      !credentialSummary.usable &&
      isStructuredClaudeAuthFalseNegativeCandidate(authOutput, parsed)
    ) {
      const retryDelayMs =
        options?.falseNegativeRetryDelayMs ?? CLAUDE_AUTH_FALSE_NEGATIVE_RETRY_DELAY_MS;
      if (retryDelayMs > 0) {
        yield* Effect.sleep(retryDelayMs);
      }
      const retryProbe = yield* runAuthStatusProbe;
      if (Result.isSuccess(retryProbe) && Option.isSome(retryProbe.success)) {
        authOutput = retryProbe.success.value;
        parsed = parseClaudeAuthStatusFromOutput(authOutput);
      }
    }
    const structuredFalseNegative = isStructuredClaudeAuthFalseNegativeCandidate(
      authOutput,
      parsed,
    );
    const credentialProbeSubscriptionType =
      credentialSummary.usable && structuredFalseNegative && resolveSubscriptionType
        ? yield* resolveSubscriptionType
        : undefined;
    // Claude 2.1.x can report `loggedIn:false` from `auth status` while a live
    // SDK init still reads account metadata. Token strings alone are not enough:
    // require the SDK probe before treating the credential file as authenticated.
    const effectiveParsed: ReturnType<typeof parseClaudeAuthStatusFromOutput> =
      credentialProbeSubscriptionType !== undefined
        ? { status: "ready", authStatus: "authenticated" }
        : parsed;
    const useCredentialMetadata = credentialProbeSubscriptionType !== undefined;

    // Determine subscription type from multiple sources (cheapest first):
    // 1. JSON output of `claude auth status` (may or may not contain it)
    // 2. Cached SDK probe (spawns a Claude process on miss, reads
    //    `initializationResult()` for account metadata, then aborts
    //    immediately — no API tokens are consumed)
    let subscriptionType =
      extractSubscriptionTypeFromOutput(authOutput) ??
      credentialProbeSubscriptionType ??
      (useCredentialMetadata ? credentialSummary.subscriptionType : undefined);
    const authMethod =
      extractClaudeAuthMethodFromOutput(authOutput) ??
      (useCredentialMetadata ? "claude.ai" : undefined);
    if (
      !subscriptionType &&
      resolveSubscriptionType &&
      effectiveParsed.authStatus === "authenticated"
    ) {
      subscriptionType = yield* resolveSubscriptionType;
    }
    const authMetadata = claudeAuthMetadata({ subscriptionType, authMethod });

    return {
      engine: CLAUDE_ENGINE,
      status: effectiveParsed.status,
      available: true,
      authStatus: effectiveParsed.authStatus,
      version: parsedVersion,
      supportsAutoRuntimeMode,
      ...(authMetadata ? { authType: authMetadata.type, authLabel: authMetadata.label } : {}),
      checkedAt,
      ...(effectiveParsed.message ? { message: effectiveParsed.message } : {}),
    } satisfies ServerEngineStatus;
  }).pipe(
    Effect.map((status) => ({
      ...status,
      checkedBinaryPath: executable,
      autoRuntimeModeBinaryPath: executable,
    })),
  );
};

export const checkClaudeEngineStatus = makeCheckClaudeEngineStatus();

const withCheckedBinaryPath = (checkedBinaryPath: string) =>
  Effect.map((value: ServerEngineStatus) => ({ ...value, checkedBinaryPath }));

// ── Grok health check ───────────────────────────────────────────────

export const makeCheckGrokEngineStatus = (
  binaryPath?: string,
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const executable = nonEmptyTrimmed(binaryPath) ?? "grok";

    const versionProbe = yield* probeEngineCliVersion(
      runGrokCommand(["--version"], executable),
      DEFAULT_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: GROK_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Grok CLI (`grok`) is not installed or not on PATH."
            : `Failed to execute Grok CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: GROK_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: "Grok CLI is installed but failed to run. Timed out while running command.",
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: GROK_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `Grok CLI is installed but failed to run. ${detail}`
          : "Grok CLI is installed but failed to run.",
      } satisfies ServerEngineStatus;
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);
    const hasApiKey = hasGrokApiKeyEnv();

    return {
      engine: GROK_ENGINE,
      status: "ready" as const,
      available: true,
      authStatus: hasApiKey ? ("authenticated" as const) : ("unknown" as const),
      version: parsedVersion,
      checkedAt,
      ...(hasApiKey
        ? { authType: "apiKey", authLabel: "xAI API Key" }
        : {
            message:
              "Grok CLI is installed. Run `grok` to authenticate locally, or set XAI_API_KEY before starting a session.",
          }),
    } satisfies ServerEngineStatus;
  }).pipe(withCheckedBinaryPath(nonEmptyTrimmed(binaryPath) ?? "grok"));

export const checkGrokEngineStatus = makeCheckGrokEngineStatus();

// ── Droid health check ─────────────────────────────────────────────

const runDroidCommand = (args: ReadonlyArray<string>, executable = "droid") =>
  runEngineCommand(executable, args, engineCommandEnv(DROID_ENGINE)).pipe(
    Effect.flatMap((result) =>
      isWindowsShellCommandMissingResult({ code: result.code, stderr: result.stderr })
        ? Effect.fail(makeCommandMissingCause(executable))
        : Effect.succeed(result),
    ),
  );

export const makeCheckDroidEngineStatus = (
  binaryPath?: string,
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const executable = resolveDroidCliBinaryPath(nonEmptyTrimmed(binaryPath) ?? undefined);

    const versionProbe = yield* probeEngineCliVersion(
      runDroidCommand(["--version"], executable),
      DEFAULT_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: DROID_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Droid CLI (`droid`) is not installed or not on PATH."
            : `Failed to execute Droid CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: DROID_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: "Droid CLI is installed but failed to run. Timed out while running command.",
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: DROID_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `Droid CLI is installed but failed to run. ${detail}`
          : "Droid CLI is installed but failed to run.",
      } satisfies ServerEngineStatus;
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);
    const hasApiKey = hasDroidApiKeyEnv();

    return {
      engine: DROID_ENGINE,
      status: "ready" as const,
      available: true,
      authStatus: hasApiKey ? ("authenticated" as const) : ("unknown" as const),
      version: parsedVersion,
      checkedAt,
      ...(hasApiKey
        ? { authType: "apiKey", authLabel: "Factory API Key" }
        : {
            message:
              "Droid CLI is installed. Haros can use the CLI's cached device-pairing login; run `droid` to authenticate locally if needed, or set FACTORY_API_KEY.",
          }),
    } satisfies ServerEngineStatus;
  }).pipe(withCheckedBinaryPath(nonEmptyTrimmed(binaryPath) ?? "droid"));

export const checkDroidEngineStatus = makeCheckDroidEngineStatus();

// ── OpenCode health check ───────────────────────────────────────────

export const makeCheckOpenCodeEngineStatus = (
  binaryPath?: string,
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const executable = nonEmptyTrimmed(binaryPath) ?? "opencode";

    const versionProbe = yield* probeEngineCliVersion(
      runOpenCodeCommand(["--version"], executable),
      OPENCODE_HEALTH_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: OPENCODE_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "OpenCode CLI (`opencode`) is not installed or not on PATH."
            : `Failed to execute OpenCode CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: OPENCODE_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: `OpenCode CLI is installed but failed to run. ${ENGINE_COMMAND_TIMEOUT_DETAIL}`,
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: OPENCODE_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `OpenCode CLI is installed but failed to run. ${detail}`
          : "OpenCode CLI is installed but failed to run.",
      } satisfies ServerEngineStatus;
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);

    return {
      engine: OPENCODE_ENGINE,
      status: "ready" as const,
      available: true,
      authStatus: "unknown" as const,
      version: parsedVersion,
      checkedAt,
      message: "OpenCode CLI is installed. Configure engine credentials inside OpenCode as needed.",
    } satisfies ServerEngineStatus;
  }).pipe(withCheckedBinaryPath(nonEmptyTrimmed(binaryPath) ?? "opencode"));

export const checkOpenCodeEngineStatus = makeCheckOpenCodeEngineStatus();

// ── Kilo health check ───────────────────────────────────────────────

export const makeCheckKiloEngineStatus = (
  binaryPath?: string,
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const executable = nonEmptyTrimmed(binaryPath) ?? "kilo";

    const versionProbe = yield* probeEngineCliVersion(
      runKiloCommand(["--version"], executable),
      DEFAULT_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: KILO_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Kilo CLI (`kilo`) is not installed or not on PATH."
            : `Failed to execute Kilo CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: KILO_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: "Kilo CLI is installed but failed to run. Timed out while running command.",
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: KILO_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `Kilo CLI is installed but failed to run. ${detail}`
          : "Kilo CLI is installed but failed to run.",
      } satisfies ServerEngineStatus;
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);

    return {
      engine: KILO_ENGINE,
      status: "ready" as const,
      available: true,
      authStatus: "unknown" as const,
      version: parsedVersion,
      checkedAt,
      message: "Kilo CLI is installed. Configure engine credentials inside Kilo as needed.",
    } satisfies ServerEngineStatus;
  }).pipe(withCheckedBinaryPath(nonEmptyTrimmed(binaryPath) ?? "kilo"));

export const checkKiloEngineStatus = makeCheckKiloEngineStatus();

// ── Pi health check ─────────────────────────────────────────────

// Stock Pi is bundled and SDK-backed. Startup health projection deliberately
// remains pure: importing the SDK or invoking the native CLI here would allow
// background startup to discover the user's `.pi` state before explicit use.
export const checkPiEngineStatus = (): Effect.Effect<ServerEngineStatus> =>
  Effect.sync(
    () =>
      ({
        engine: PI_ENGINE,
        status: "ready",
        available: true,
        authStatus: "unknown",
        version: BUNDLED_OA_RUNTIME_VERSION,
        checkedAt: new Date().toISOString(),
        message:
          "Pi 0.84.4 is bundled. Native Pi discovery and state access begin only after you select Pi.",
      }) satisfies ServerEngineStatus,
  );

export const checkOAAgentEngineStatus = (): Effect.Effect<ServerEngineStatus> =>
  Effect.sync(
    () =>
      ({
        engine: OA_ENGINE,
        status: "ready",
        available: true,
        authStatus: "unknown",
        version: BUNDLED_OA_RUNTIME_VERSION,
        checkedAt: new Date().toISOString(),
        message: "Haros is bundled and ready. Add engine credentials before sending.",
      }) satisfies ServerEngineStatus,
  );

// ── Antigravity CLI health check ──────────────────────────────────

export const checkAntigravityEngineStatus = (
  binaryPath?: string,
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const executable = nonEmptyTrimmed(binaryPath) ?? "agy";
    const versionProbe = yield* probeEngineCliVersion(
      runAntigravityCommand(["--version"], executable),
      DEFAULT_TIMEOUT_MS,
    );
    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      return {
        engine: ANTIGRAVITY_ENGINE,
        status: "error",
        available: false,
        authStatus: "unknown",
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Antigravity CLI (`agy`) is not installed or is not on PATH."
            : `Antigravity CLI health check failed: ${String(versionProbe.cause)}`,
      } satisfies ServerEngineStatus;
    }
    if (versionProbe.outcome === "timeout") {
      return {
        engine: ANTIGRAVITY_ENGINE,
        status: "warning",
        available: true,
        authStatus: "unknown",
        checkedAt,
        message: "Antigravity CLI version check timed out.",
      } satisfies ServerEngineStatus;
    }
    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      return {
        engine: ANTIGRAVITY_ENGINE,
        status: "error",
        available: false,
        authStatus: "unknown",
        checkedAt,
        message: detailFromResult(version) ?? "Antigravity CLI version check failed.",
      } satisfies ServerEngineStatus;
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);
    if (
      parsedVersion !== null &&
      compareSemverVersions(parsedVersion, MINIMUM_ANTIGRAVITY_CLI_VERSION) < 0
    ) {
      return {
        engine: ANTIGRAVITY_ENGINE,
        status: "error",
        available: false,
        authStatus: "unknown",
        version: parsedVersion,
        checkedAt,
        message: `Antigravity CLI ${parsedVersion} is too old for Haros. Upgrade to ${MINIMUM_ANTIGRAVITY_CLI_VERSION} or newer.`,
      } satisfies ServerEngineStatus;
    }
    const models = yield* runAntigravityCommand(["models"], executable).pipe(
      Effect.timeoutOption(CLAUDE_HEALTH_TIMEOUT_MS),
      Effect.result,
    );
    if (
      Result.isSuccess(models) &&
      Option.isSome(models.success) &&
      models.success.value.code === 0 &&
      models.success.value.stdout.trim().length > 0
    ) {
      return {
        engine: ANTIGRAVITY_ENGINE,
        status: "ready",
        available: true,
        authStatus: "authenticated",
        version: parsedVersion,
        checkedAt,
        message: "Antigravity CLI is installed, authenticated, and returned available models.",
      } satisfies ServerEngineStatus;
    }
    return {
      engine: ANTIGRAVITY_ENGINE,
      status: "warning",
      available: true,
      authStatus: "unknown",
      version: parsedVersion,
      checkedAt,
      message: "Antigravity CLI is installed, but Haros could not verify login by listing models.",
    } satisfies ServerEngineStatus;
  }).pipe(withCheckedBinaryPath(nonEmptyTrimmed(binaryPath) ?? "agy"));

// ── Cursor health check ─────────────────────────────────────────────

export const makeCheckCursorEngineStatus = (
  binaryPath?: string,
): Effect.Effect<ServerEngineStatus, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* () {
    const checkedAt = new Date().toISOString();
    const executable = resolveCursorAgentBinaryPath(nonEmptyTrimmed(binaryPath));

    const versionProbe = yield* probeEngineCliVersion(
      runCursorCommand(["--version"], executable),
      DEFAULT_TIMEOUT_MS,
    );

    if (versionProbe.outcome === "missing" || versionProbe.outcome === "failure") {
      const error = versionProbe.cause;
      return {
        engine: CURSOR_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        ...(versionProbe.outcome === "missing"
          ? { unavailableReason: "not_installed" as const }
          : {}),
        checkedAt,
        message:
          versionProbe.outcome === "missing"
            ? "Cursor Agent CLI (`cursor-agent`) is not installed or not on PATH."
            : `Failed to execute Cursor Agent CLI health check: ${error instanceof Error ? error.message : String(error)}.`,
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "timeout") {
      return {
        engine: CURSOR_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message:
          "Cursor Agent CLI is installed but failed to run. Timed out while running command.",
      } satisfies ServerEngineStatus;
    }

    if (versionProbe.outcome === "nonzero") {
      const version = versionProbe.result;
      const detail = detailFromResult(version);
      return {
        engine: CURSOR_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "unknown" as const,
        checkedAt,
        message: detail
          ? `Cursor Agent CLI is installed but failed to run. ${detail}`
          : "Cursor Agent CLI is installed but failed to run.",
      } satisfies ServerEngineStatus;
    }
    const version = versionProbe.result;
    const parsedVersion = parseGenericCliVersion(`${version.stdout}\n${version.stderr}`);

    const authProbe = yield* runCursorCommand(["status"], executable).pipe(
      Effect.timeoutOption(DEFAULT_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(authProbe)) {
      const error = authProbe.failure;
      return {
        engine: CURSOR_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        checkedAt,
        message:
          error instanceof Error
            ? `Could not verify Cursor Agent authentication status: ${error.message}.`
            : "Could not verify Cursor Agent authentication status.",
      } satisfies ServerEngineStatus;
    }

    if (Option.isNone(authProbe.success)) {
      return {
        engine: CURSOR_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "unknown" as const,
        version: parsedVersion,
        checkedAt,
        message:
          "Could not verify Cursor Agent authentication status. Timed out while running command.",
      } satisfies ServerEngineStatus;
    }

    const parsedAuth = parseCursorAuthStatusFromOutput(authProbe.success.value);
    if (parsedAuth.authStatus !== "authenticated") {
      return {
        engine: CURSOR_ENGINE,
        status: parsedAuth.status,
        available: true,
        authStatus: parsedAuth.authStatus,
        version: parsedVersion,
        checkedAt,
        ...(parsedAuth.message ? { message: parsedAuth.message } : {}),
      } satisfies ServerEngineStatus;
    }

    const modelsProbe = yield* runCursorCommand(["models"], executable).pipe(
      Effect.timeoutOption(DEFAULT_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(modelsProbe)) {
      const error = modelsProbe.failure;
      return {
        engine: CURSOR_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "authenticated" as const,
        version: parsedVersion,
        checkedAt,
        message:
          error instanceof Error
            ? `Cursor Agent is authenticated, but model discovery failed: ${error.message}.`
            : "Cursor Agent is authenticated, but model discovery failed.",
      } satisfies ServerEngineStatus;
    }

    if (Option.isNone(modelsProbe.success)) {
      return {
        engine: CURSOR_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "authenticated" as const,
        version: parsedVersion,
        checkedAt,
        message:
          "Cursor Agent is authenticated, but model discovery timed out before Haros could verify available models.",
      } satisfies ServerEngineStatus;
    }

    const modelsResult = modelsProbe.success.value;
    const modelsOutput = `${modelsResult.stdout}\n${modelsResult.stderr}`;
    const modelAuth = parseCursorAuthStatusFromOutput(modelsResult);
    if (modelAuth.authStatus === "unauthenticated") {
      return {
        engine: CURSOR_ENGINE,
        status: modelAuth.status,
        available: true,
        authStatus: modelAuth.authStatus,
        version: parsedVersion,
        checkedAt,
        ...(modelAuth.message ? { message: modelAuth.message } : {}),
      } satisfies ServerEngineStatus;
    }
    if (cursorModelsOutputHasNoModels(modelsOutput)) {
      return {
        engine: CURSOR_ENGINE,
        status: "error" as const,
        available: false,
        authStatus: "authenticated" as const,
        version: parsedVersion,
        checkedAt,
        message:
          "Cursor Agent is authenticated, but it reports no models available for this account.",
      } satisfies ServerEngineStatus;
    }
    if (modelsResult.code !== 0) {
      const detail = detailFromResult(modelsResult);
      return {
        engine: CURSOR_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "authenticated" as const,
        version: parsedVersion,
        checkedAt,
        message: detail
          ? `Cursor Agent is authenticated, but model discovery failed. ${detail}`
          : "Cursor Agent is authenticated, but model discovery failed.",
      } satisfies ServerEngineStatus;
    }
    if (!cursorModelsOutputHasModels(modelsOutput)) {
      return {
        engine: CURSOR_ENGINE,
        status: "warning" as const,
        available: true,
        authStatus: "authenticated" as const,
        version: parsedVersion,
        checkedAt,
        message:
          "Cursor Agent is authenticated, but model discovery returned no recognizable model rows.",
      } satisfies ServerEngineStatus;
    }

    return {
      engine: CURSOR_ENGINE,
      status: "ready" as const,
      available: true,
      authStatus: "authenticated" as const,
      version: parsedVersion,
      checkedAt,
    } satisfies ServerEngineStatus;
  }).pipe(withCheckedBinaryPath(nonEmptyTrimmed(binaryPath) ?? DEFAULT_CURSOR_AGENT_BINARY));

export const checkCursorEngineStatus = makeCheckCursorEngineStatus();

// ── Snapshot helpers ────────────────────────────────────────────────

function comparableEngineVersionAdvisory(
  advisory: ServerEngineStatus["versionAdvisory"] | undefined,
): Omit<NonNullable<ServerEngineStatus["versionAdvisory"]>, "checkedAt"> | null {
  if (!advisory) {
    return null;
  }
  const { checkedAt: _checkedAt, ...comparableAdvisory } = advisory;
  return comparableAdvisory;
}

export function engineStatusesEqual(
  left: ReadonlyArray<ServerEngineStatus>,
  right: ReadonlyArray<ServerEngineStatus>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((status, index) => {
    const next = right[index];
    return (
      next !== undefined &&
      status.engine === next.engine &&
      status.status === next.status &&
      status.available === next.available &&
      status.authStatus === next.authStatus &&
      (status.unavailableReason ?? null) === (next.unavailableReason ?? null) &&
      (status.checkedBinaryPath ?? null) === (next.checkedBinaryPath ?? null) &&
      (status.authType ?? null) === (next.authType ?? null) &&
      (status.authLabel ?? null) === (next.authLabel ?? null) &&
      status.voiceTranscriptionAvailable === next.voiceTranscriptionAvailable &&
      status.supportsAutoRuntimeMode === next.supportsAutoRuntimeMode &&
      (status.autoRuntimeModeBinaryPath ?? null) === (next.autoRuntimeModeBinaryPath ?? null) &&
      (status.version ?? null) === (next.version ?? null) &&
      (status.message ?? null) === (next.message ?? null) &&
      JSON.stringify(comparableEngineVersionAdvisory(status.versionAdvisory)) ===
        JSON.stringify(comparableEngineVersionAdvisory(next.versionAdvisory)) &&
      JSON.stringify(status.updateState ?? null) === JSON.stringify(next.updateState ?? null)
    );
  });
}

function isTransientProviderCommandTimeout(status: ServerEngineStatus): boolean {
  return (
    status.status !== "ready" &&
    status.authStatus === "unknown" &&
    (status.message ?? "").includes(ENGINE_COMMAND_TIMEOUT_DETAIL)
  );
}

function wasPreviouslyUsableEngineStatus(status: ServerEngineStatus): boolean {
  return status.available && status.status === "ready";
}

export function stabilizeEngineStatusesAgainstTransientTimeouts(
  previousStatuses: ReadonlyArray<ServerEngineStatus>,
  nextStatuses: ReadonlyArray<ServerEngineStatus>,
): ReadonlyArray<ServerEngineStatus> {
  if (previousStatuses.length === 0) {
    return nextStatuses;
  }

  const previousByEngine = new Map(
    previousStatuses.map((status) => [status.engine, status] as const),
  );

  return nextStatuses.map((status) => {
    const previous = previousByEngine.get(status.engine);
    if (
      !previous ||
      !wasPreviouslyUsableEngineStatus(previous) ||
      !isTransientProviderCommandTimeout(status) ||
      !(
        (previous.checkedBinaryPath === undefined && status.checkedBinaryPath === undefined) ||
        (previous.checkedBinaryPath !== undefined &&
          status.checkedBinaryPath !== undefined &&
          previous.checkedBinaryPath === status.checkedBinaryPath)
      )
    ) {
      return status;
    }

    // A single slow CLI probe should not make an already usable engine look broken.
    // The previous update advisory is network-backed evidence, though, so it must
    // not survive a probe that could not confirm the installed version.
    const stabilizedStatus = {
      ...previous,
      checkedAt: status.checkedAt,
      ...(status.updateState !== undefined ? { updateState: status.updateState } : {}),
    };
    return previous.versionAdvisory
      ? suppressEngineVersionAdvisory(stabilizedStatus)
      : stabilizedStatus;
  });
}

export function isProviderEnabledForSettings(
  engine: EngineKind,
  settings: ServerSettings,
): boolean {
  return isServerEngineEnabled(settings, engine);
}

export function resolvePassiveProviderPresence(
  settings: ServerSettings,
  resolveCommand: (command: string) => string | null = resolveExecutable,
): ReadonlyArray<EngineKind> {
  const recoverable: EngineKind[] = [];
  for (const engine of ENGINES) {
    if (!isProviderEnabledForSettings(engine, settings)) continue;
    if (engine === OA_ENGINE || engine === PI_ENGINE) {
      recoverable.push(engine);
      continue;
    }
    const isRecoverable = (() => {
      switch (engine) {
        case CODEX_ENGINE:
          return (
            settings.engines.codex.customModels.length > 0 ||
            resolveCommand(settings.engines.codex.binaryPath) !== null
          );
        case CLAUDE_ENGINE:
          return (
            settings.engines.claude.customModels.length > 0 ||
            resolveCommand(settings.engines.claude.binaryPath) !== null
          );
        case CURSOR_ENGINE:
          return (
            settings.engines.cursor.customModels.length > 0 ||
            settings.engines.cursor.apiEndpoint.trim().length > 0 ||
            resolveCommand(settings.engines.cursor.binaryPath) !== null
          );
        case ANTIGRAVITY_ENGINE:
          return (
            settings.engines.antigravity.customModels.length > 0 ||
            resolveCommand(settings.engines.antigravity.binaryPath) !== null
          );
        case GROK_ENGINE:
          return (
            settings.engines.grok.customModels.length > 0 ||
            resolveCommand(settings.engines.grok.binaryPath) !== null
          );
        case DROID_ENGINE:
          return (
            settings.engines.droid.customModels.length > 0 ||
            resolveCommand(settings.engines.droid.binaryPath) !== null
          );
        case KILO_ENGINE:
          return (
            settings.engines.kilo.customModels.length > 0 ||
            settings.engines.kilo.serverUrl.trim().length > 0 ||
            resolveCommand(settings.engines.kilo.binaryPath) !== null
          );
        case OPENCODE_ENGINE:
          return (
            settings.engines.opencode.customModels.length > 0 ||
            settings.engines.opencode.serverUrl.trim().length > 0 ||
            resolveCommand(settings.engines.opencode.binaryPath) !== null
          );
      }
    })();
    if (isRecoverable) recoverable.push(engine);
  }
  return recoverable;
}

export function makeDisabledEngineStatus(
  engine: EngineKind,
  checkedAt = new Date().toISOString(),
): ServerEngineStatus {
  return {
    engine,
    status: "warning" as const,
    available: false,
    authStatus: "unknown" as const,
    checkedAt,
    message: DISABLED_ENGINE_STATUS_MESSAGE,
  } satisfies ServerEngineStatus;
}

function isDisabledEngineStatusOverlay(status: ServerEngineStatus): boolean {
  return status.message === DISABLED_ENGINE_STATUS_MESSAGE && status.available === false;
}

function mergeEngineStatusUpdates(
  previousStatuses: ReadonlyArray<ServerEngineStatus>,
  updatedStatuses: ReadonlyArray<ServerEngineStatus>,
): EngineStatuses {
  const statusByEngine = new Map(
    previousStatuses.map((status) => [status.engine, status] as const),
  );
  for (const status of updatedStatuses) {
    statusByEngine.set(status.engine, status);
  }
  return orderEngineStatuses([...statusByEngine.values()]);
}

// Keeps local CLI version/status visible while removing network-backed update metadata.
function makeSuppressedEngineVersionAdvisory(
  status: ServerEngineStatus,
  currentVersion?: string | null,
): NonNullable<ServerEngineStatus["versionAdvisory"]> {
  return {
    status: "unknown",
    currentVersion: currentVersion ?? status.version ?? null,
    latestVersion: null,
    updateCommand: null,
    canUpdate: false,
    checkedAt: status.checkedAt,
    message: null,
  };
}

function suppressEngineVersionAdvisory(status: ServerEngineStatus): ServerEngineStatus {
  return {
    ...status,
    versionAdvisory: makeSuppressedEngineVersionAdvisory(status),
  };
}

// Disabled engines are a settings overlay, not a probe result. Keep the raw
// cached/probed status intact so re-enabling a engine can reuse it immediately.
export function projectEngineStatusesForSettings(
  statuses: ReadonlyArray<ServerEngineStatus>,
  settings: ServerSettings,
  checkedAt = new Date().toISOString(),
): EngineStatuses {
  const statusByEngine = new Map(statuses.map((status) => [status.engine, status] as const));
  const projected: ServerEngineStatus[] = [];

  for (const engine of ENGINES) {
    const status = statusByEngine.get(engine);
    if (!isProviderEnabledForSettings(engine, settings)) {
      const disabledStatus = makeDisabledEngineStatus(engine, status?.checkedAt ?? checkedAt);
      const disabledStatusWithAdvisory = {
        ...disabledStatus,
        versionAdvisory: makeSuppressedEngineVersionAdvisory(disabledStatus, status?.version),
      } satisfies ServerEngineStatus;
      projected.push(
        status?.updateState
          ? { ...disabledStatusWithAdvisory, updateState: status.updateState }
          : disabledStatusWithAdvisory,
      );
      continue;
    }

    if (status && !isDisabledEngineStatusOverlay(status)) {
      projected.push(
        settings.enableEngineUpdateChecks ? status : suppressEngineVersionAdvisory(status),
      );
    }
  }

  return orderEngineStatuses(projected);
}

// ── Layer ───────────────────────────────────────────────────────────

export function makeEngineHealthLive(options?: { readonly engineUpdateTimeoutMs?: number }) {
  const engineUpdateTimeoutMs = options?.engineUpdateTimeoutMs ?? ENGINE_UPDATE_TIMEOUT_MS;
  return Layer.effect(
    EngineHealth,
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const serverConfig = yield* ServerConfig;
      const serverSettings = yield* ServerSettingsService;
      const changesPubSub = yield* Effect.acquireRelease(
        PubSub.unbounded<ReadonlyArray<ServerEngineStatus>>(),
        PubSub.shutdown,
      );
      const refreshScope = yield* Scope.make("sequential");
      yield* Effect.addFinalizer(() => Scope.close(refreshScope, Exit.void));

      const cachePathByEngine = new Map(
        ENGINES.map(
          (engine) =>
            [
              engine,
              resolveEngineStatusCachePath({
                stateDir: serverConfig.stateDir,
                engine,
              }),
            ] as const,
        ),
      );

      const cachedStatuses: EngineStatuses = yield* Effect.forEach(
        ENGINES,
        (engine) =>
          readEngineStatusCache(cachePathByEngine.get(engine)!).pipe(
            Effect.provideService(FileSystem.FileSystem, fileSystem),
          ),
        { concurrency: "unbounded" },
      ).pipe(
        Effect.map((statuses) =>
          orderEngineStatuses(
            statuses.filter(
              (status): status is ServerEngineStatus =>
                status !== undefined && !isDisabledEngineStatusOverlay(status),
            ),
          ),
        ),
      );

      const statusesRef = yield* Ref.make<EngineStatuses>(cachedStatuses);
      const updateStatesRef = yield* Ref.make<ReadonlyMap<EngineKind, ServerEngineUpdateState>>(
        new Map(),
      );
      const refreshFiberRef = yield* Ref.make<Fiber.Fiber<EngineStatuses, never> | null>(null);
      const commandCoordinator = yield* makeEngineMaintenanceCommandCoordinator({
        makeAlreadyRunningError: (engine) =>
          new ServerEngineUpdateError({
            engine: engine as EngineKind,
            reason: "An update is already running for this engine.",
          }),
      });

      // 5-minute TTL cache for the Claude SDK subscription probe. The probe
      // spawns a short-lived `claude` subprocess to read account metadata
      // from the local init handshake; capacity=1 because the probe has no
      // parameters.
      const claudeSubscriptionCache = yield* Cache.make({
        capacity: 1,
        timeToLive: Duration.minutes(5),
        lookup: (_: "claude") => probeClaudeSubscription(),
      });
      const resolveClaudeSubscription = Cache.get(claudeSubscriptionCache, "claude").pipe(
        Effect.map((probe) => probe?.subscriptionType),
      );

      const getEngineBinaryPath = (engine: EngineKind, settings: ServerSettings) => {
        switch (engine) {
          case "oa":
            return null;
          case "codex":
            return settings.engines.codex.binaryPath;
          case "claude":
            return settings.engines.claude.binaryPath;
          case "cursor":
            return settings.engines.cursor.binaryPath;
          case "antigravity":
            return settings.engines.antigravity.binaryPath;
          case "grok":
            return settings.engines.grok.binaryPath;
          case "droid":
            return settings.engines.droid.binaryPath;
          case "kilo":
            return settings.engines.kilo.binaryPath;
          case "opencode":
            return settings.engines.opencode.binaryPath;
          case "pi":
            return settings.engines.pi.binaryPath;
        }
      };

      const resolveEngineMaintenanceBinaryPath = (engine: EngineKind, settings: ServerSettings) => {
        const configuredPath = getEngineBinaryPath(engine, settings);
        // Droid's installer commonly writes outside the PATH inherited by a GUI app.
        // Keep maintenance on the same executable resolution used by health and ACP runtime.
        return engine === DROID_ENGINE ? resolveDroidCliBinaryPath(configuredPath) : configuredPath;
      };

      const getEngineMaintenanceCapabilities = Effect.fn("getEngineMaintenanceCapabilities")(
        function* (engine: EngineKind) {
          const settings = yield* serverSettings.getSettings;
          if (!isProviderEnabledForSettings(engine, settings)) {
            return makeEngineMaintenanceCapabilities({
              engine,
              packageName: null,
              latestVersionSource: null,
              updateExecutable: null,
              updateArgs: [],
              updateLockKey: null,
            });
          }
          if (engine === "cursor") {
            const command = buildCursorAgentCommand(getEngineBinaryPath(engine, settings), [
              "update",
            ]);
            return makeEngineMaintenanceCapabilities({
              engine,
              packageName: null,
              updateExecutable: command.command,
              updateArgs: command.args,
              updateLockKey: "cursor-agent",
            });
          }
          const definition = PACKAGE_MANAGED_PROVIDER_UPDATES[engine];
          if (!definition) {
            return makeEngineMaintenanceCapabilities({
              engine,
              packageName: null,
              updateExecutable: null,
              updateArgs: [],
              updateLockKey: null,
            });
          }
          return yield* resolveEngineMaintenanceCapabilitiesEffect(definition, {
            binaryPath: resolveEngineMaintenanceBinaryPath(engine, settings),
            env: engineCommandEnv(engine),
            platform: process.platform,
          }).pipe(Effect.provideService(FileSystem.FileSystem, fileSystem));
        },
      );

      const applyVolatileProviderState = Effect.fn("applyVolatileProviderState")(function* (
        status: ServerEngineStatus,
      ) {
        const updateStates = yield* Ref.get(updateStatesRef);
        const updateState = updateStates.get(status.engine);
        if (!updateState) {
          const { updateState: _updateState, ...statusWithoutUpdateState } = status;
          return statusWithoutUpdateState;
        }
        return {
          ...status,
          updateState,
        };
      });

      const projectStatusesForCurrentSettings = Effect.fn(
        "projectEngineStatusesForCurrentSettings",
      )(function* (statuses: ReadonlyArray<ServerEngineStatus>) {
        return yield* serverSettings.getSettings.pipe(
          Effect.map((settings) => projectEngineStatusesForSettings(statuses, settings)),
          Effect.catch(() => Effect.succeed(statuses)),
          Effect.flatMap((projected) =>
            Effect.forEach(projected, applyVolatileProviderState, {
              concurrency: "unbounded",
            }),
          ),
        );
      });

      const publishProjectedStatuses = Effect.fn("publishProjectedEngineStatuses")(function* () {
        const rawStatuses = yield* Ref.get(statusesRef);
        const projectedStatuses = yield* projectStatusesForCurrentSettings(rawStatuses);
        yield* PubSub.publish(changesPubSub, projectedStatuses);
        return projectedStatuses;
      });

      const setEngineUpdateState = Effect.fn("setEngineUpdateState")(function* (
        engine: EngineKind,
        state: ServerEngineUpdateState | null,
      ) {
        yield* Ref.update(updateStatesRef, (previous) => {
          const next = new Map(previous);
          if (!state || state.status === "idle") {
            next.delete(engine);
          } else {
            next.set(engine, state);
          }
          return next;
        });

        return yield* publishProjectedStatuses();
      });

      const enrichStatuses = Effect.fn("enrichEngineStatuses")(function* (
        statuses: ReadonlyArray<ServerEngineStatus>,
      ) {
        const settings = yield* serverSettings.ready.pipe(
          Effect.flatMap(() => serverSettings.getSettings),
          Effect.catch(() => Effect.succeed(null)),
        );
        if (settings?.enableEngineUpdateChecks === false) {
          return yield* Effect.forEach(
            statuses.map(suppressEngineVersionAdvisory),
            applyVolatileProviderState,
            { concurrency: "unbounded" },
          );
        }

        const enriched = yield* Effect.forEach(
          statuses,
          (status) =>
            getEngineMaintenanceCapabilities(status.engine).pipe(
              Effect.flatMap((capabilities) =>
                enrichEngineStatusWithVersionAdvisory(status, capabilities),
              ),
              Effect.catch(() =>
                Effect.succeed({
                  ...status,
                  versionAdvisory: {
                    status: "unknown" as const,
                    currentVersion: status.version ?? null,
                    latestVersion: null,
                    updateCommand: null,
                    canUpdate: false,
                    checkedAt: status.checkedAt,
                    message: null,
                  },
                }),
              ),
            ),
          { concurrency: "unbounded" },
        );
        return yield* Effect.forEach(enriched, applyVolatileProviderState, {
          concurrency: "unbounded",
        });
      });

      const checkProviderWhenEnabled = <R>(
        settings: ServerSettings,
        engine: EngineKind,
        check: Effect.Effect<ServerEngineStatus, never, R>,
      ): Effect.Effect<Option.Option<ServerEngineStatus>, never, R> =>
        isProviderEnabledForSettings(engine, settings)
          ? check.pipe(Effect.map(Option.some))
          : Effect.succeed(Option.none());

      const loadEngineStatuses = serverSettings.ready
        .pipe(
          Effect.flatMap(() => serverSettings.getSettings),
          Effect.flatMap((settings) =>
            Effect.all(
              [
                checkProviderWhenEnabled(settings, OA_ENGINE, checkOAAgentEngineStatus()),
                checkProviderWhenEnabled(
                  settings,
                  CODEX_ENGINE,
                  makeCheckCodexEngineStatus(
                    settings.engines.codex.binaryPath,
                    settings.engines.codex.homePath,
                  ),
                ),
                checkProviderWhenEnabled(
                  settings,
                  CLAUDE_ENGINE,
                  makeCheckClaudeEngineStatus(
                    resolveClaudeSubscription,
                    settings.engines.claude.binaryPath,
                    serverConfig.homeDir,
                  ),
                ),
                checkProviderWhenEnabled(
                  settings,
                  CURSOR_ENGINE,
                  makeCheckCursorEngineStatus(settings.engines.cursor.binaryPath),
                ),
                checkProviderWhenEnabled(
                  settings,
                  ANTIGRAVITY_ENGINE,
                  checkAntigravityEngineStatus(settings.engines.antigravity.binaryPath),
                ),
                checkProviderWhenEnabled(
                  settings,
                  GROK_ENGINE,
                  makeCheckGrokEngineStatus(settings.engines.grok.binaryPath),
                ),
                checkProviderWhenEnabled(
                  settings,
                  DROID_ENGINE,
                  makeCheckDroidEngineStatus(settings.engines.droid.binaryPath),
                ),
                checkProviderWhenEnabled(
                  settings,
                  KILO_ENGINE,
                  makeCheckKiloEngineStatus(settings.engines.kilo.binaryPath),
                ),
                checkProviderWhenEnabled(
                  settings,
                  OPENCODE_ENGINE,
                  makeCheckOpenCodeEngineStatus(settings.engines.opencode.binaryPath),
                ),
                checkProviderWhenEnabled(settings, PI_ENGINE, checkPiEngineStatus()),
              ],
              {
                concurrency: "unbounded",
              },
            ),
          ),
        )
        .pipe(
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
          Effect.provideService(FileSystem.FileSystem, fileSystem),
          Effect.provideService(Path.Path, path),
          Effect.map((statuses) =>
            orderEngineStatuses(
              statuses.flatMap((status) => (Option.isSome(status) ? [status.value] : [])),
            ),
          ),
          Effect.flatMap(enrichStatuses),
        );

      const persistStatuses = (statuses: EngineStatuses) =>
        Effect.forEach(
          statuses,
          (status) => {
            const { updateState: _updateState, ...statusToPersist } = status;
            return writeEngineStatusCache({
              filePath: cachePathByEngine.get(status.engine)!,
              engine: statusToPersist,
            }).pipe(
              Effect.provideService(FileSystem.FileSystem, fileSystem),
              Effect.provideService(Path.Path, path),
              Effect.tapError(Effect.logError),
              Effect.ignore,
            );
          },
          { concurrency: "unbounded", discard: true },
        );

      const refreshNow = Effect.gen(function* () {
        const refreshRevision = (yield* serverSettings.getSnapshot).revision;
        // Drop the cached Claude subscription probe so switching accounts (login
        // / logout / add account outside the app) is reflected on the next
        // refresh instead of being pinned to the old account for up to 5 minutes.
        yield* Cache.invalidate(claudeSubscriptionCache, "claude");
        const loadedStatuses = yield* loadEngineStatuses;
        if ((yield* serverSettings.getSnapshot).revision !== refreshRevision) {
          const currentStatuses = yield* Ref.get(statusesRef);
          return yield* projectStatusesForCurrentSettings(currentStatuses);
        }
        const previousRawStatuses = yield* Ref.get(statusesRef);
        const previousStatuses = yield* projectStatusesForCurrentSettings(previousRawStatuses);
        const stabilizedLoadedStatuses = stabilizeEngineStatusesAgainstTransientTimeouts(
          previousRawStatuses,
          loadedStatuses,
        );
        const nextRawStatuses = mergeEngineStatusUpdates(
          previousRawStatuses,
          stabilizedLoadedStatuses,
        );
        const nextStatuses = yield* projectStatusesForCurrentSettings(nextRawStatuses);
        yield* Ref.set(statusesRef, nextRawStatuses);
        if (engineStatusesEqual(previousStatuses, nextStatuses)) {
          return nextStatuses;
        }
        yield* persistStatuses(nextRawStatuses);
        yield* PubSub.publish(changesPubSub, nextStatuses);
        return nextStatuses;
      });

      // Keep a single refresh in flight so repeated config reads do not spawn
      // overlapping CLI probes while the cache already gives us a usable answer.
      const ensureRefreshFiber: Effect.Effect<Fiber.Fiber<EngineStatuses, never>> = Effect.gen(
        function* () {
          const inFlight = yield* Ref.get(refreshFiberRef);
          if (inFlight) {
            return inFlight;
          }
          const refreshFiber = yield* Effect.gen(function* () {
            const refreshExit = yield* Effect.exit(refreshNow);
            if (Exit.isSuccess(refreshExit)) {
              return refreshExit.value;
            }
            // Keep the current in-memory snapshot as the source of truth if a
            // foreground refresh fails after startup.
            const rawStatuses = yield* Ref.get(statusesRef);
            return yield* projectStatusesForCurrentSettings(rawStatuses);
          }).pipe(Effect.ensuring(Ref.set(refreshFiberRef, null)), Effect.forkIn(refreshScope));
          yield* Ref.set(refreshFiberRef, refreshFiber);
          return refreshFiber;
        },
      );

      yield* serverSettings.streamChanges.pipe(
        Stream.runForEach(() => publishProjectedStatuses().pipe(Effect.asVoid)),
        Effect.forkIn(refreshScope),
      );

      const refresh: Effect.Effect<EngineStatuses> = ensureRefreshFiber.pipe(
        Effect.flatMap(Fiber.join),
      );

      const getPassivePresence = serverSettings.ready.pipe(
        Effect.flatMap(() => serverSettings.getSettings),
        Effect.map((settings) => resolvePassiveProviderPresence(settings)),
        Effect.catch(() => Effect.succeed(ENGINES)),
      );

      const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

      const makeUpdateState = (input: {
        readonly status: ServerEngineUpdateState["status"];
        readonly startedAt: string | null;
        readonly finishedAt: string | null;
        readonly message: string | null;
        readonly output?: string | null;
      }): ServerEngineUpdateState => ({
        status: input.status,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        message: input.message,
        output: input.output ?? null,
      });

      const describeUpdateCommandError = (error: unknown): string => {
        if (error instanceof Error && error.message.trim().length > 0) {
          if (error.message.includes("initial is not a function")) {
            return "Update command failed before producing output. Try running the engine update command from a terminal.";
          }
          return error.message;
        }
        if (typeof error === "string" && error.trim().length > 0) {
          return error;
        }
        return "Update command could not be started.";
      };

      const runUpdateCommand = Effect.fn("runEngineUpdateCommand")(function* (input: {
        readonly engine: EngineKind;
        readonly command: string;
        readonly args: ReadonlyArray<string>;
        readonly pathPrepend?: string;
      }) {
        const baseEnv = engineCommandEnv(input.engine);
        const updateEnv = input.pathPrepend
          ? {
              ...baseEnv,
              PATH: [input.pathPrepend, baseEnv.PATH]
                .filter((entry): entry is string => Boolean(entry))
                .join(OS.platform() === "win32" ? ";" : ":"),
            }
          : baseEnv;
        const prepared = prepareWindowsSafeProcess(input.command, input.args, { env: updateEnv });
        const child = yield* spawner.spawn(
          ChildProcess.make(prepared.command, prepared.args, {
            shell: prepared.shell,
            ...(prepared.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
            env: updateEnv,
          }),
        );
        yield* Effect.addFinalizer(() => child.kill().pipe(Effect.ignore));
        const [stdout, stderr, exitCode] = yield* Effect.all(
          [
            collectUint8StreamText({
              stream: child.stdout,
              maxBytes: UPDATE_OUTPUT_MAX_BYTES,
            }),
            collectUint8StreamText({
              stream: child.stderr,
              maxBytes: UPDATE_OUTPUT_MAX_BYTES,
            }),
            child.exitCode.pipe(Effect.map(Number)),
          ],
          { concurrency: "unbounded" },
        );
        return {
          stdout: stdout.text,
          stderr: stderr.text,
          exitCode,
          stdoutTruncated: stdout.truncated,
          stderrTruncated: stderr.truncated,
        };
      });

      const updateEngine: EngineHealthShape["updateEngine"] = Effect.fn(
        "EngineHealth.updateEngine",
      )(function* (input) {
        const engine = input.engine;
        const toUpdateError = (reason: unknown) =>
          new ServerEngineUpdateError({
            engine,
            reason: reason instanceof Error ? reason.message : String(reason),
          });
        const settings = yield* serverSettings.getSettings.pipe(Effect.mapError(toUpdateError));
        if (!isProviderEnabledForSettings(engine, settings)) {
          return yield* new ServerEngineUpdateError({
            engine,
            reason: "Engine is disabled in Haros settings.",
          });
        }
        const capabilities = yield* getEngineMaintenanceCapabilities(engine).pipe(
          Effect.mapError(toUpdateError),
        );
        const update = capabilities.update;
        if (!update) {
          return yield* new ServerEngineUpdateError({
            engine,
            reason: "This engine does not support one-click updates.",
          });
        }

        const run = Effect.gen(function* () {
          // A Homebrew update may legitimately include a tap refresh and a release-asset
          // download before installation. Keep native/npm-style updates on the short bound,
          // but do not kill a healthy Homebrew upgrade after only two minutes.
          const updateTimeoutMs = update.timeoutMs ?? engineUpdateTimeoutMs;
          const startedAt = yield* nowIso;
          yield* setEngineUpdateState(
            engine,
            makeUpdateState({
              status: "running",
              startedAt,
              finishedAt: null,
              message: "Updating engine.",
            }),
          );

          const commandResult = yield* runUpdateCommand({
            engine,
            command: update.executable,
            args: update.args,
            ...(update.pathPrepend ? { pathPrepend: update.pathPrepend } : {}),
          }).pipe(
            Effect.scoped,
            Effect.timeoutOption(Duration.millis(updateTimeoutMs)),
            Effect.result,
          );
          const finishedAt = yield* nowIso;
          if (Result.isFailure(commandResult)) {
            const engines = yield* setEngineUpdateState(
              engine,
              makeUpdateState({
                status: "failed",
                startedAt,
                finishedAt,
                message: describeUpdateCommandError(commandResult.failure),
              }),
            );
            return { engines };
          }
          const result = commandResult.success;
          if (Option.isNone(result)) {
            // The package manager can finish linking the requested version and then stall in
            // cleanup. Reconcile against fresh engine truth before reporting a false failure.
            const reconciledProviders = yield* refreshNow.pipe(Effect.mapError(toUpdateError));
            const reconciled = reconciledProviders.find((status) => status.engine === engine);
            if (reconciled?.available && reconciled.versionAdvisory?.status === "current") {
              const engines = yield* setEngineUpdateState(
                engine,
                makeUpdateState({
                  status: "succeeded",
                  startedAt,
                  finishedAt,
                  message: "Engine version is current after the package manager timed out.",
                }),
              );
              return { engines };
            }
          }
          const output = Option.isSome(result)
            ? [result.value.stderr, result.value.stdout].filter(Boolean).join("\n\n").trim() || null
            : null;
          const failed = Option.isNone(result) || result.value.exitCode !== 0;
          if (failed) {
            const message = Option.isNone(result)
              ? `Update timed out after ${formatEngineUpdateTimeout(updateTimeoutMs)}. The engine process was stopped.`
              : `Update command exited with code ${result.value.exitCode}.`;
            const engines = yield* setEngineUpdateState(
              engine,
              makeUpdateState({
                status: "failed",
                startedAt,
                finishedAt,
                message,
                output: output ? output.slice(0, UPDATE_OUTPUT_MAX_BYTES) : null,
              }),
            );
            return { engines };
          }

          const engines = yield* refreshNow.pipe(Effect.mapError(toUpdateError));
          const refreshed = engines.find((status) => status.engine === engine);
          const refreshedAdvisory = refreshed?.versionAdvisory;
          const stillOutdated = refreshedAdvisory?.status === "behind_latest";
          const stillOutdatedVersions =
            refreshedAdvisory?.currentVersion && refreshedAdvisory.latestVersion
              ? ` (installed ${refreshedAdvisory.currentVersion}, latest ${refreshedAdvisory.latestVersion})`
              : "";
          const finalProviders = yield* setEngineUpdateState(
            engine,
            makeUpdateState({
              status: stillOutdated ? "unchanged" : "succeeded",
              startedAt,
              finishedAt,
              message: stillOutdated
                ? `Update command completed, but Haros still detects an outdated engine version${stillOutdatedVersions}.`
                : "Engine updated.",
              output: output ? output.slice(0, UPDATE_OUTPUT_MAX_BYTES) : null,
            }),
          );
          return { engines: finalProviders };
        });

        return yield* commandCoordinator.withCommandLock({
          targetKey: engine,
          lockKey: update.lockKey,
          onQueued: setEngineUpdateState(
            engine,
            makeUpdateState({
              status: "queued",
              startedAt: null,
              finishedAt: null,
              message: "Waiting for another engine update to finish.",
            }),
          ).pipe(Effect.asVoid),
          run,
        });
      });

      return {
        // Mirror upstream's behavior here: reads consume the latest stable
        // snapshot, while refreshes happen explicitly or from engine streams.
        getStatuses: Ref.get(statusesRef).pipe(Effect.flatMap(projectStatusesForCurrentSettings)),
        getPassivePresence,
        refresh,
        updateEngine,
        get streamChanges() {
          return Stream.fromPubSub(changesPubSub);
        },
      } satisfies EngineHealthShape;
    }),
  );
}

export const EngineHealthLive = makeEngineHealthLive();

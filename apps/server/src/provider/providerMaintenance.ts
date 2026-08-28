import type {
  EngineKind,
  ServerProviderStatus,
  ServerProviderVersionAdvisory,
} from "@harnessos/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";

import { executableCandidates, hasPathSeparator } from "../executableLookup.ts";

const LATEST_VERSION_CACHE_TTL_MS = 60 * 60 * 1_000;
const LATEST_VERSION_TIMEOUT_MS = 4_000;
const ENGINE_UPDATE_ACTION_MESSAGE = "Install the update now or review engine settings.";
// This is a last-resort safety cap, not a normal download deadline. Homebrew may refresh its
// own metadata and taps before fetching a large release asset over a slow GitHub connection.
export const HOMEBREW_PROVIDER_UPDATE_TIMEOUT_MS = 60 * 60_000;

type EngineInstallSource = "npm" | "bun" | "pnpm" | "homebrew" | "native" | "unknown";

interface ParsedSemver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: ReadonlyArray<string>;
}

export interface EngineLatestVersionSource {
  readonly kind: "npm" | "homebrew";
  readonly name: string;
  readonly homebrewKind?: "formula" | "cask";
}

export interface EngineHomebrewPackageDefinition {
  readonly name: string;
  readonly kind: "formula" | "cask";
  readonly isCommandPath?: (commandPath: string) => boolean;
}

export interface EngineMaintenanceCapabilities {
  readonly engine: EngineKind;
  readonly packageName: string | null;
  readonly latestVersionSource: EngineLatestVersionSource | null;
  readonly update: EngineMaintenanceCommandAction | null;
}

export interface EngineMaintenanceCommandAction {
  readonly command: string;
  readonly executable: string;
  readonly args: ReadonlyArray<string>;
  readonly lockKey: string;
  readonly timeoutMs?: number;
  /** Put the selected engine binary's directory first so its package manager matches. */
  readonly pathPrepend?: string;
}

export interface EngineMaintenanceCapabilityResolutionOptions {
  readonly binaryPath?: string | null;
  readonly env?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly realCommandPath?: string | null;
  readonly commandDirectory?: string | null;
}

export interface PackageManagedProviderMaintenanceDefinition {
  readonly engine: EngineKind;
  readonly binaryName: string;
  readonly npmPackageName: string | null;
  readonly homebrew:
    | (EngineHomebrewPackageDefinition & {
        readonly variants?: ReadonlyArray<EngineHomebrewPackageDefinition>;
      })
    | null;
  readonly latestVersionSource?: EngineLatestVersionSource | null;
  readonly nativeUpdate: {
    readonly executable: string;
    readonly args: (installSource: EngineInstallSource) => ReadonlyArray<string>;
    readonly lockKey: string;
    readonly strategy: "always" | "matching-path";
    /** Explicit source for native installs. Null delegates update truth to the engine CLI. */
    readonly latestVersionSource?: EngineLatestVersionSource | null;
    readonly excludedInstallSources?: ReadonlyArray<EngineInstallSource>;
    readonly isCommandPath?: (commandPath: string) => boolean;
  } | null;
}

const latestVersionCache = new Map<
  string,
  { readonly expiresAt: number; readonly version: string | null }
>();
const SEMVER_NUMBER_SEGMENT = /^\d+$/;

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeSemverVersion(version: string): string {
  const [main, prerelease] = version.trim().replace(/^v/, "").split("-", 2);
  const segments = (main ?? "")
    .split(".")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 2) {
    segments.push("0");
  }

  return prerelease ? `${segments.join(".")}-${prerelease}` : segments.join(".");
}

function parseSemver(value: string): ParsedSemver | null {
  const [main = "", prerelease] = normalizeSemverVersion(value).split("-", 2);
  const segments = main.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const [majorSegment, minorSegment, patchSegment] = segments;
  if (
    majorSegment === undefined ||
    minorSegment === undefined ||
    patchSegment === undefined ||
    !SEMVER_NUMBER_SEGMENT.test(majorSegment) ||
    !SEMVER_NUMBER_SEGMENT.test(minorSegment) ||
    !SEMVER_NUMBER_SEGMENT.test(patchSegment)
  ) {
    return null;
  }

  return {
    major: Number.parseInt(majorSegment, 10),
    minor: Number.parseInt(minorSegment, 10),
    patch: Number.parseInt(patchSegment, 10),
    prerelease:
      prerelease
        ?.split(".")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0) ?? [],
  };
}

function comparePrereleaseIdentifier(left: string, right: string): number {
  const leftNumeric = SEMVER_NUMBER_SEGMENT.test(left);
  const rightNumeric = SEMVER_NUMBER_SEGMENT.test(right);

  if (leftNumeric && rightNumeric) {
    return Number.parseInt(left, 10) - Number.parseInt(right, 10);
  }
  if (leftNumeric) {
    return -1;
  }
  if (rightNumeric) {
    return 1;
  }
  return left.localeCompare(right);
}

export function compareSemverVersions(left: string, right: string): number {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
  if (!parsedLeft || !parsedRight) {
    return left.localeCompare(right);
  }

  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major - parsedRight.major;
  }
  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor - parsedRight.minor;
  }
  if (parsedLeft.patch !== parsedRight.patch) {
    return parsedLeft.patch - parsedRight.patch;
  }
  if (parsedLeft.prerelease.length === 0 && parsedRight.prerelease.length === 0) {
    return 0;
  }
  if (parsedLeft.prerelease.length === 0) {
    return 1;
  }
  if (parsedRight.prerelease.length === 0) {
    return -1;
  }

  const length = Math.max(parsedLeft.prerelease.length, parsedRight.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = parsedLeft.prerelease[index];
    const rightIdentifier = parsedRight.prerelease[index];
    if (leftIdentifier === undefined) {
      return -1;
    }
    if (rightIdentifier === undefined) {
      return 1;
    }
    const comparison = comparePrereleaseIdentifier(leftIdentifier, rightIdentifier);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return 0;
}

export function parseGenericCliVersion(output: string): string | null {
  const match = output.match(/\bv?(\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?)\b/);
  return match?.[1] ? normalizeSemverVersion(match[1]) : null;
}

export function normalizeCommandPath(commandPath: string): string {
  return commandPath.replaceAll("\\", "/").toLowerCase();
}

/**
 * npm resolves its global prefix from the `node` binary that runs it, not from
 * npm's own location, so a bare `npm install -g` can write to a different
 * install tree than the one the detected engine binary lives in (e.g. a
 * Homebrew-prefix install checked by HarnessOS while nvm's node makes npm install
 * into nvm's prefix). Derive the prefix that owns the detected binary so the
 * update can pin it explicitly.
 */
export function deriveNpmGlobalPrefix(commandPath: string): string | null {
  // normalizeCommandPath preserves length, so indices map back onto the
  // original string, keeping its casing and separators intact.
  const normalized = normalizeCommandPath(commandPath);
  const unixIndex = normalized.indexOf("/lib/node_modules/");
  if (unixIndex > 0) {
    return commandPath.slice(0, unixIndex);
  }
  const windowsIndex = normalized.indexOf("/npm/node_modules/");
  if (windowsIndex > 0) {
    return commandPath.slice(0, windowsIndex + "/npm".length);
  }
  return null;
}

export function makeProviderMaintenanceCapabilities(input: {
  readonly engine: EngineKind;
  readonly packageName: string | null;
  readonly latestVersionSource?: EngineLatestVersionSource | null;
  readonly updateExecutable: string | null;
  readonly updateArgs: ReadonlyArray<string>;
  readonly updateLockKey: string | null;
  readonly updateTimeoutMs?: number;
  readonly updatePathPrepend?: string | null;
}): EngineMaintenanceCapabilities {
  const update =
    input.updateExecutable === null || input.updateLockKey === null
      ? null
      : {
          command: [input.updateExecutable, ...input.updateArgs]
            .map((part) => (/\s/.test(part) ? `"${part}"` : part))
            .join(" "),
          executable: input.updateExecutable,
          args: input.updateArgs,
          lockKey: input.updateLockKey,
          ...(input.updateTimeoutMs === undefined ? {} : { timeoutMs: input.updateTimeoutMs }),
          ...(nonEmptyString(input.updatePathPrepend)
            ? { pathPrepend: nonEmptyString(input.updatePathPrepend)! }
            : {}),
        };
  return {
    engine: input.engine,
    packageName: input.packageName,
    latestVersionSource:
      input.latestVersionSource !== undefined
        ? input.latestVersionSource
        : input.packageName
          ? { kind: "npm", name: input.packageName }
          : null,
    update,
  };
}

function makeManualOnlyProviderMaintenanceCapabilities(input: {
  readonly engine: EngineKind;
  readonly packageName: string | null;
}): EngineMaintenanceCapabilities {
  return makeProviderMaintenanceCapabilities({
    engine: input.engine,
    packageName: input.packageName,
    updateExecutable: null,
    updateArgs: [],
    updateLockKey: null,
  });
}

function makeNpmGlobalProviderMaintenanceCapabilities(
  definition: PackageManagedProviderMaintenanceDefinition,
  pathPrepend?: string | null,
  commandPath?: string | null,
): EngineMaintenanceCapabilities {
  if (!definition.npmPackageName) {
    return makeManualOnlyProviderMaintenanceCapabilities({
      engine: definition.engine,
      packageName: null,
    });
  }
  const globalPrefix = commandPath ? deriveNpmGlobalPrefix(commandPath) : null;
  return makeProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: definition.npmPackageName,
    updateExecutable: "npm",
    updateArgs: [
      "install",
      "-g",
      ...(globalPrefix ? ["--prefix", globalPrefix] : []),
      `${definition.npmPackageName}@latest`,
    ],
    updateLockKey: "npm-global",
    ...(pathPrepend === undefined ? {} : { updatePathPrepend: pathPrepend }),
  });
}

function makeBunGlobalProviderMaintenanceCapabilities(
  definition: PackageManagedProviderMaintenanceDefinition,
  pathPrepend?: string | null,
): EngineMaintenanceCapabilities {
  if (!definition.npmPackageName) {
    return makeManualOnlyProviderMaintenanceCapabilities({
      engine: definition.engine,
      packageName: null,
    });
  }
  return makeProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: definition.npmPackageName,
    updateExecutable: "bun",
    updateArgs: ["i", "-g", `${definition.npmPackageName}@latest`],
    updateLockKey: "bun-global",
    ...(pathPrepend === undefined ? {} : { updatePathPrepend: pathPrepend }),
  });
}

function makePnpmGlobalProviderMaintenanceCapabilities(
  definition: PackageManagedProviderMaintenanceDefinition,
  pathPrepend?: string | null,
): EngineMaintenanceCapabilities {
  if (!definition.npmPackageName) {
    return makeManualOnlyProviderMaintenanceCapabilities({
      engine: definition.engine,
      packageName: null,
    });
  }
  return makeProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: definition.npmPackageName,
    updateExecutable: "pnpm",
    updateArgs: ["add", "-g", `${definition.npmPackageName}@latest`],
    updateLockKey: "pnpm-global",
    ...(pathPrepend === undefined ? {} : { updatePathPrepend: pathPrepend }),
  });
}

function makeHomebrewProviderMaintenanceCapabilities(
  definition: PackageManagedProviderMaintenanceDefinition,
  homebrewPackage: EngineHomebrewPackageDefinition | null,
  pathPrepend?: string | null,
): EngineMaintenanceCapabilities {
  if (!homebrewPackage) {
    return makeManualOnlyProviderMaintenanceCapabilities({
      engine: definition.engine,
      packageName: definition.npmPackageName,
    });
  }

  return makeProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: null,
    latestVersionSource: resolveLatestVersionSourceForInstallSource(
      definition,
      "homebrew",
      homebrewPackage,
    ),
    updateExecutable: "brew",
    updateArgs:
      homebrewPackage.kind === "cask"
        ? ["upgrade", "--cask", homebrewPackage.name]
        : ["upgrade", homebrewPackage.name],
    updateLockKey: "homebrew",
    updateTimeoutMs: HOMEBREW_PROVIDER_UPDATE_TIMEOUT_MS,
    ...(pathPrepend === undefined ? {} : { updatePathPrepend: pathPrepend }),
  });
}

function resolveLatestVersionSourceForInstallSource(
  definition: PackageManagedProviderMaintenanceDefinition,
  installSource: EngineInstallSource,
  homebrewPackage?: EngineHomebrewPackageDefinition | null,
): EngineLatestVersionSource | null {
  if (definition.latestVersionSource) {
    return definition.latestVersionSource;
  }
  if (
    installSource === "native" &&
    definition.nativeUpdate &&
    definition.nativeUpdate.latestVersionSource !== undefined
  ) {
    return definition.nativeUpdate.latestVersionSource;
  }
  if (installSource === "homebrew" && homebrewPackage) {
    return {
      kind: "homebrew",
      name: homebrewPackage.name,
      homebrewKind: homebrewPackage.kind,
    };
  }
  return definition.npmPackageName ? { kind: "npm", name: definition.npmPackageName } : null;
}

function makeNativeProviderMaintenanceCapabilities(
  definition: PackageManagedProviderMaintenanceDefinition,
  installSource: EngineInstallSource,
  executable?: string | null,
  pathPrepend?: string | null,
): EngineMaintenanceCapabilities | null {
  if (!definition.nativeUpdate) {
    return null;
  }

  return makeProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: installSource === "homebrew" ? null : definition.npmPackageName,
    // Prefer explicit upstream metadata for channels like third-party Homebrew taps,
    // then fall back to the package manager channel when its public API is usable.
    latestVersionSource: resolveLatestVersionSourceForInstallSource(definition, installSource),
    updateExecutable: executable ?? definition.nativeUpdate.executable,
    updateArgs: definition.nativeUpdate.args(installSource),
    updateLockKey: definition.nativeUpdate.lockKey,
    ...(pathPrepend === undefined ? {} : { updatePathPrepend: pathPrepend }),
  });
}

function detectInstallSource(
  definition: PackageManagedProviderMaintenanceDefinition,
  commandPath: string,
): EngineInstallSource {
  if (definition.nativeUpdate?.isCommandPath?.(commandPath)) {
    return "native";
  }
  if (isBunGlobalCommandPath(commandPath)) {
    return "bun";
  }
  if (isPnpmGlobalCommandPath(commandPath)) {
    return "pnpm";
  }
  // Homebrew formulae may embed an npm-style lib/node_modules tree inside Cellar.
  // The outer installation owner must win or a formula gets sent through `npm -g`.
  if (isHomebrewCommandPath(commandPath)) {
    return "homebrew";
  }
  if (isNpmGlobalCommandPath(commandPath)) {
    return "npm";
  }
  return "unknown";
}

function makeProviderMaintenanceForInstallSource(input: {
  readonly definition: PackageManagedProviderMaintenanceDefinition;
  readonly installSource: EngineInstallSource;
  readonly homebrewPackage?: EngineHomebrewPackageDefinition | null;
  readonly executable?: string | null;
  readonly pathPrepend?: string | null;
  /** Path that matched install-source detection, used to pin the install tree. */
  readonly commandPath?: string | null;
}): EngineMaintenanceCapabilities {
  const { definition, installSource, homebrewPackage, executable, pathPrepend, commandPath } =
    input;
  if (
    definition.nativeUpdate?.strategy === "always" &&
    !definition.nativeUpdate.excludedInstallSources?.includes(installSource)
  ) {
    return (
      makeNativeProviderMaintenanceCapabilities(
        definition,
        installSource,
        executable,
        pathPrepend,
      ) ??
      makeManualOnlyProviderMaintenanceCapabilities({
        engine: definition.engine,
        packageName: definition.npmPackageName,
      })
    );
  }
  if (installSource === "native") {
    return (
      makeNativeProviderMaintenanceCapabilities(
        definition,
        installSource,
        executable,
        pathPrepend,
      ) ??
      makeManualOnlyProviderMaintenanceCapabilities({
        engine: definition.engine,
        packageName: definition.npmPackageName,
      })
    );
  }
  if (installSource === "bun") {
    return makeBunGlobalProviderMaintenanceCapabilities(definition, pathPrepend);
  }
  if (installSource === "pnpm") {
    return makePnpmGlobalProviderMaintenanceCapabilities(definition, pathPrepend);
  }
  if (installSource === "npm") {
    return makeNpmGlobalProviderMaintenanceCapabilities(definition, pathPrepend, commandPath);
  }
  if (installSource === "homebrew") {
    return makeHomebrewProviderMaintenanceCapabilities(
      definition,
      homebrewPackage ?? definition.homebrew,
      pathPrepend,
    );
  }
  return makeManualOnlyProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: definition.npmPackageName,
  });
}

function resolveHomebrewPackageForCommandPath(
  definition: PackageManagedProviderMaintenanceDefinition,
  commandPath: string,
): EngineHomebrewPackageDefinition | null {
  const homebrew = definition.homebrew;
  if (!homebrew) {
    return null;
  }
  return homebrew.variants?.find((variant) => variant.isCommandPath?.(commandPath)) ?? homebrew;
}

function isBunGlobalCommandPath(commandPath: string): boolean {
  return normalizeCommandPath(commandPath).includes("/.bun/bin/");
}

function isPnpmGlobalCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return (
    normalized.includes("/.local/share/pnpm/") ||
    normalized.includes("/library/pnpm/") ||
    normalized.includes("/local/share/pnpm/") ||
    normalized.includes("/appdata/local/pnpm/") ||
    normalized.includes("/pnpm/global/")
  );
}

function isNpmGlobalCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return (
    normalized.includes("/node_modules/.bin/") ||
    normalized.includes("/lib/node_modules/") ||
    normalized.includes("/npm/node_modules/")
  );
}

function isHomebrewCommandPath(commandPath: string): boolean {
  const normalized = normalizeCommandPath(commandPath);
  return (
    normalized.includes("/opt/homebrew/caskroom/") ||
    normalized.includes("/usr/local/caskroom/") ||
    normalized.includes("/opt/homebrew/cellar/") ||
    normalized.includes("/usr/local/cellar/") ||
    normalized.includes("/homebrew/cellar/") ||
    normalized.startsWith("/opt/homebrew/bin/") ||
    normalized.startsWith("/usr/local/bin/")
  );
}

export function resolvePackageManagedProviderMaintenance(
  definition: PackageManagedProviderMaintenanceDefinition,
  options?: EngineMaintenanceCapabilityResolutionOptions,
): EngineMaintenanceCapabilities {
  const binaryPath = nonEmptyString(options?.binaryPath);
  if (!binaryPath) {
    return makeManualOnlyProviderMaintenanceCapabilities({
      engine: definition.engine,
      packageName: definition.npmPackageName,
    });
  }

  const commandPaths = [options?.realCommandPath, binaryPath]
    .map(nonEmptyString)
    .filter((value): value is string => value !== null);

  for (const commandPath of commandPaths) {
    const installSource = detectInstallSource(definition, commandPath);
    if (installSource !== "unknown") {
      return makeProviderMaintenanceForInstallSource({
        definition,
        installSource,
        ...(installSource === "homebrew"
          ? { homebrewPackage: resolveHomebrewPackageForCommandPath(definition, commandPath) }
          : {}),
        executable: binaryPath,
        commandPath,
        ...(options?.commandDirectory === undefined
          ? {}
          : { pathPrepend: options.commandDirectory }),
      });
    }
  }

  if (!hasPathSeparator(binaryPath)) {
    return makeProviderMaintenanceForInstallSource({
      definition,
      installSource: "unknown",
      executable: binaryPath,
      ...(options?.commandDirectory === undefined ? {} : { pathPrepend: options.commandDirectory }),
    });
  }

  return makeManualOnlyProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: definition.npmPackageName,
  });
}

export const resolveProviderMaintenanceCapabilitiesEffect = Effect.fn(
  "resolveProviderMaintenanceCapabilitiesEffect",
)(function* (
  definition: PackageManagedProviderMaintenanceDefinition,
  options?: EngineMaintenanceCapabilityResolutionOptions,
) {
  const binaryPath = nonEmptyString(options?.binaryPath) ?? definition.binaryName;
  const fileSystem = yield* FileSystem.FileSystem;
  if (hasPathSeparator(binaryPath)) {
    const realCommandPath =
      nonEmptyString(options?.realCommandPath) ??
      (yield* fileSystem.realPath(binaryPath).pipe(Effect.catch(() => Effect.succeed(binaryPath))));
    return resolvePackageManagedProviderMaintenance(definition, {
      ...options,
      binaryPath,
      realCommandPath,
    });
  }

  // Existence, not executability: this is locating an installation to report on, so an
  // extensionless Windows file still counts even though nothing could spawn it directly.
  //
  // `options.env` is used whole, with no per-key fallback to `process.env`. An earlier version
  // read `options.env.PATH ?? process.env.PATH`, which could report a engine as installed
  // because *this* process can see it while the child environment we were asked about cannot.
  // The production caller passes `buildProviderChildEnvironment(...)`, which always carries PATH.
  for (const candidate of executableCandidates(binaryPath, {
    ...(options?.platform === undefined ? {} : { platform: options.platform }),
    ...(options?.env === undefined ? {} : { env: options.env }),
    allowExtensionlessOnWindows: true,
  })) {
    const exists = yield* fileSystem.exists(candidate.path).pipe(Effect.orElseSucceed(() => false));
    if (!exists) {
      continue;
    }
    const realCommandPath = yield* fileSystem
      .realPath(candidate.path)
      .pipe(Effect.catch(() => Effect.succeed(candidate.path)));
    return resolvePackageManagedProviderMaintenance(definition, {
      ...options,
      binaryPath,
      realCommandPath,
      commandDirectory: candidate.directory,
    });
  }

  // A stale health/advisory cache must not turn a missing CLI into a spawn attempt.
  // Keep the manual command visible, but only expose one-click update after locating a binary.
  return makeManualOnlyProviderMaintenanceCapabilities({
    engine: definition.engine,
    packageName: definition.npmPackageName,
  });
});

function deriveVersionAdvisory(input: {
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
}): Pick<ServerProviderVersionAdvisory, "status" | "message"> {
  if (!input.currentVersion || !input.latestVersion) {
    return { status: "unknown", message: null };
  }
  if (compareSemverVersions(input.currentVersion, input.latestVersion) < 0) {
    return {
      status: "behind_latest",
      message: ENGINE_UPDATE_ACTION_MESSAGE,
    };
  }
  return { status: "current", message: null };
}

export function createProviderVersionAdvisory(input: {
  readonly engine: EngineKind;
  readonly currentVersion: string | null;
  readonly latestVersion?: string | null;
  readonly checkedAt?: string | null;
  readonly maintenanceCapabilities?: EngineMaintenanceCapabilities;
}): ServerProviderVersionAdvisory {
  const capabilities =
    input.maintenanceCapabilities ??
    makeManualOnlyProviderMaintenanceCapabilities({ engine: input.engine, packageName: null });
  const latestVersion = input.latestVersion ?? null;
  const advisory = deriveVersionAdvisory({
    currentVersion: input.currentVersion,
    latestVersion,
  });

  return {
    status: advisory.status,
    currentVersion: input.currentVersion,
    latestVersion,
    // Knowable when a registry can be queried, or when a latest version was already
    // resolved. Self-updating CLIs satisfy neither, so their status is pinned to
    // "unknown" and must not be presented as "an update is waiting".
    latestVersionKnowable: capabilities.latestVersionSource !== null || latestVersion !== null,
    updateCommand: capabilities.update?.command ?? null,
    canUpdate: capabilities.update !== null,
    checkedAt: input.checkedAt ?? null,
    message: advisory.message,
  };
}

const fetchNpmLatestVersion = Effect.fn("fetchNpmLatestVersion")(function* (packageName: string) {
  return yield* Effect.tryPromise(async () => {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(LATEST_VERSION_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { version?: unknown };
    return nonEmptyString(payload.version);
  }).pipe(Effect.catch(() => Effect.succeed(null)));
});

const fetchHomebrewLatestVersion = Effect.fn("fetchHomebrewLatestVersion")(function* (
  source: EngineLatestVersionSource,
) {
  if (source.kind !== "homebrew" || !source.homebrewKind) {
    return null;
  }
  return yield* Effect.tryPromise(async () => {
    const response = await fetch(
      `https://formulae.brew.sh/api/${source.homebrewKind}/${encodeURIComponent(source.name)}.json`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(LATEST_VERSION_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      version?: unknown;
      versions?: { stable?: unknown };
    };
    return nonEmptyString(
      source.homebrewKind === "cask" ? payload.version : payload.versions?.stable,
    );
  }).pipe(Effect.catch(() => Effect.succeed(null)));
});

export const resolveLatestProviderVersion = Effect.fn("resolveLatestProviderVersion")(function* (
  maintenanceCapabilities: EngineMaintenanceCapabilities,
) {
  const source = maintenanceCapabilities.latestVersionSource;
  if (!source) {
    return null;
  }

  const cacheKey =
    source.kind === "homebrew"
      ? `homebrew:${source.homebrewKind ?? "unknown"}:${source.name}`
      : `npm:${source.name}`;
  const cached = latestVersionCache.get(cacheKey);
  const now = DateTime.toEpochMillis(yield* DateTime.now);
  if (cached && cached.expiresAt > now) {
    return cached.version;
  }

  const version =
    source.kind === "homebrew"
      ? yield* fetchHomebrewLatestVersion(source)
      : yield* fetchNpmLatestVersion(source.name);
  latestVersionCache.set(cacheKey, {
    expiresAt: now + LATEST_VERSION_CACHE_TTL_MS,
    version,
  });
  return version;
});

export const enrichProviderStatusWithVersionAdvisory = Effect.fn(
  "enrichProviderStatusWithVersionAdvisory",
)(function* (status: ServerProviderStatus, maintenanceCapabilities: EngineMaintenanceCapabilities) {
  if (!status.available || !status.version) {
    return {
      ...status,
      versionAdvisory: createProviderVersionAdvisory({
        engine: status.engine,
        currentVersion: status.version ?? null,
        checkedAt: status.checkedAt,
        maintenanceCapabilities,
      }),
    };
  }

  const latestVersion = yield* resolveLatestProviderVersion(maintenanceCapabilities);
  return {
    ...status,
    versionAdvisory: createProviderVersionAdvisory({
      engine: status.engine,
      currentVersion: status.version,
      latestVersion,
      checkedAt: DateTime.formatIso(yield* DateTime.now),
      maintenanceCapabilities,
    }),
  };
});

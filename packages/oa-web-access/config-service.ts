import {
  chmodSync,
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  renameSync,
  type Stats,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";

export const WEB_SEARCH_CONFIG_FILENAME = "web-search.json";
export const CURRENT_WEB_SEARCH_SCHEMA_VERSION = 1;
export const MAX_WEB_SEARCH_CONFIG_BYTES = 1024 * 1024;

const PRIVATE_FILE_MODE = 0o600;
const PRIVATE_DIRECTORY_MODE = 0o700;
const O_NOFOLLOW = process.platform === "win32" ? 0 : (constants.O_NOFOLLOW ?? 0);

export type WebSearchConfigRecord = Record<string, unknown>;

export type WebSearchConfigFailureKind =
  | "damaged-json"
  | "invalid-root"
  | "future-schema"
  | "too-large"
  | "unsafe-path";

export class WebSearchConfigError extends Error {
  readonly kind: WebSearchConfigFailureKind;
  readonly configPath: string;

  constructor(kind: WebSearchConfigFailureKind, configPath: string, message: string) {
    super(message);
    this.name = "WebSearchConfigError";
    this.kind = kind;
    this.configPath = configPath;
  }
}

export class WebSearchConfigConflictError extends Error {
  readonly expectedRevision: string;
  readonly actualRevision: string;

  constructor(expectedRevision: string, actualRevision: string) {
    super(
      "Web search settings changed outside this draft. Reload or explicitly overwrite before saving.",
    );
    this.name = "WebSearchConfigConflictError";
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export interface WebSearchConfigSnapshot {
  readonly config: WebSearchConfigRecord;
  readonly revision: string;
  readonly schemaVersion: number;
  readonly exists: boolean;
  readonly mtimeMs: number | null;
}

export interface WebSearchConfigMutation {
  readonly expectedRevision: string;
  /** Closed known-field patch; unknown file-owned fields remain untouched. */
  readonly patch: WebSearchConfigRecord;
  /** Top-level known fields intentionally removed by an explicit user action. */
  readonly remove?: readonly string[];
  readonly allowOverwriteConflict?: boolean;
}

export interface WebSearchConfigMutationResult {
  readonly snapshot: WebSearchConfigSnapshot;
  readonly changed: boolean;
}

export interface WebSearchConfigService {
  readonly configPath: string;
  ensureDefault(): WebSearchConfigSnapshot;
  readSnapshot(): WebSearchConfigSnapshot;
  refresh(): WebSearchConfigSnapshot;
  mutate(input: WebSearchConfigMutation): WebSearchConfigMutationResult;
  subscribeRevision(listener: (revision: string) => void): () => void;
}

/**
 * Process-profile cache: the Server resolves one immutable Agent directory and
 * retains its service for the process lifetime so Settings and every Pi Session
 * share the same revision signal. Entries are never keyed by Session, Thread,
 * Run, or tool call; isolated tests and explicit alternate process profiles use
 * createWebSearchConfigService() instead of adding production cache entries.
 */
const servicesByAgentDir = new Map<string, WebSearchConfigService>();

function defaultConfig(): WebSearchConfigRecord {
  return {
    schemaVersion: CURRENT_WEB_SEARCH_SCHEMA_VERSION,
    provider: "auto",
    workflow: "auto-summary",
    autoOpenBrowser: false,
  };
}

function serializedConfig(config: WebSearchConfigRecord): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function revisionFor(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function parseConfig(
  raw: string,
  configPath: string,
): {
  config: WebSearchConfigRecord;
  schemaVersion: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const parserMessage = error instanceof Error ? error.message : "";
    const position = parserMessage.match(/at position \d+ \(line \d+ column \d+\)$/)?.[0];
    throw new WebSearchConfigError(
      "damaged-json",
      configPath,
      `Failed to parse ${configPath}: not valid JSON${position ? `, ${position}` : ""}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new WebSearchConfigError(
      "invalid-root",
      configPath,
      `Invalid config in ${configPath}: expected a JSON object. The original file was preserved.`,
    );
  }
  const config = parsed as WebSearchConfigRecord;
  const declaredVersion = config.schemaVersion;
  const schemaVersion =
    declaredVersion === undefined
      ? 0
      : typeof declaredVersion === "number" &&
          Number.isInteger(declaredVersion) &&
          declaredVersion >= 0
        ? declaredVersion
        : -1;
  if (schemaVersion < 0) {
    throw new WebSearchConfigError(
      "invalid-root",
      configPath,
      "Web search schemaVersion must be a non-negative integer. The original file was preserved.",
    );
  }
  if (schemaVersion > CURRENT_WEB_SEARCH_SCHEMA_VERSION) {
    throw new WebSearchConfigError(
      "future-schema",
      configPath,
      "Web search settings were written by a newer HarnessOS version. Update HarnessOS before editing this file.",
    );
  }
  return { config, schemaVersion };
}

interface FileIdentity {
  readonly dev: number;
  readonly ino: number;
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function unsafePath(
  configPath: string,
  message = "Web search settings must be a private regular file owned by this profile.",
): WebSearchConfigError {
  return new WebSearchConfigError("unsafe-path", configPath, message);
}

function isMissingPathError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function openPrivateRegularFile(configPath: string): { fd: number; metadata: Stats } {
  const before = lstatSync(configPath);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    throw unsafePath(configPath);
  }

  let fd: number;
  try {
    fd = openSync(configPath, constants.O_RDONLY | O_NOFOLLOW);
  } catch (error) {
    if (
      ["EACCES", "ELOOP", "EMLINK", "ENOTDIR", "EPERM"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    ) {
      throw unsafePath(configPath);
    }
    throw error;
  }
  try {
    const metadata = fstatSync(fd);
    if (!metadata.isFile() || metadata.nlink !== 1 || !sameIdentity(before, metadata)) {
      throw unsafePath(configPath, "Web search settings changed while they were being opened.");
    }
    return { fd, metadata };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function readExisting(
  configPath: string,
  verifyAgentDirectory: () => void,
): WebSearchConfigSnapshot {
  const { fd, metadata } = openPrivateRegularFile(configPath);
  try {
    verifyAgentDirectory();
    if (process.platform !== "win32") fchmodSync(fd, PRIVATE_FILE_MODE);
    if (metadata.size > MAX_WEB_SEARCH_CONFIG_BYTES) {
      throw new WebSearchConfigError(
        "too-large",
        configPath,
        `Web search settings exceed the ${MAX_WEB_SEARCH_CONFIG_BYTES}-byte safety limit. The original file was preserved.`,
      );
    }
    const bytes = Buffer.alloc(metadata.size + 1);
    let total = 0;
    while (total < bytes.length) {
      const count = readSync(fd, bytes, total, bytes.length - total, null);
      if (count === 0) break;
      total += count;
    }
    const after = fstatSync(fd);
    if (
      total !== metadata.size ||
      after.size !== metadata.size ||
      after.nlink !== 1 ||
      !sameIdentity(metadata, after)
    ) {
      throw unsafePath(configPath, "Web search settings changed while they were being read.");
    }
    verifyAgentDirectory();
    const raw = bytes.subarray(0, total).toString("utf8");
    const { config, schemaVersion } = parseConfig(raw, configPath);
    return {
      config,
      revision: revisionFor(raw),
      schemaVersion,
      exists: true,
      mtimeMs: after.mtimeMs,
    };
  } finally {
    closeSync(fd);
  }
}

function absentSnapshot(): WebSearchConfigSnapshot {
  const raw = serializedConfig(defaultConfig());
  return {
    config: defaultConfig(),
    revision: revisionFor(raw),
    schemaVersion: CURRENT_WEB_SEARCH_SCHEMA_VERSION,
    exists: false,
    mtimeMs: null,
  };
}

function writeNoClobber(configPath: string, raw: string): boolean {
  let fd: number | undefined;
  try {
    fd = openSync(
      configPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | O_NOFOLLOW,
      PRIVATE_FILE_MODE,
    );
    writeFileSync(fd, raw, "utf8");
    fsyncSync(fd);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function atomicReplace(configPath: string, raw: string): void {
  const temporaryPath = join(
    dirname(configPath),
    `.${WEB_SEARCH_CONFIG_FILENAME}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  let fd: number | undefined;
  let renamed = false;
  try {
    fd = openSync(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | O_NOFOLLOW,
      PRIVATE_FILE_MODE,
    );
    writeFileSync(fd, raw, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporaryPath, configPath);
    renamed = true;
    if (process.platform !== "win32") chmodSync(configPath, PRIVATE_FILE_MODE);
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (!renamed) {
      try {
        unlinkSync(temporaryPath);
      } catch {
        // Best-effort cleanup; the owned temp name carries no credential in its filename.
      }
    }
  }
}

function migrateKnownConfig(config: WebSearchConfigRecord): WebSearchConfigRecord {
  return {
    ...config,
    schemaVersion: CURRENT_WEB_SEARCH_SCHEMA_VERSION,
  };
}

function isRecord(value: unknown): value is WebSearchConfigRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeKnownPatch(
  current: WebSearchConfigRecord,
  patch: WebSearchConfigRecord,
): WebSearchConfigRecord {
  const merged: WebSearchConfigRecord = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const previous = merged[key];
    merged[key] = isRecord(previous) && isRecord(value) ? mergeKnownPatch(previous, value) : value;
  }
  return merged;
}

export function createWebSearchConfigService(agentDir: string): WebSearchConfigService {
  const resolvedAgentDir = resolve(agentDir);
  const configPath = join(resolvedAgentDir, WEB_SEARCH_CONFIG_FILENAME);
  const listeners = new Set<(revision: string) => void>();
  let agentDirectoryIdentity: FileIdentity | undefined;
  let agentDirectoryPhysicalPath: string | undefined;

  const secureAgentDirectory = (create: boolean): boolean => {
    if (create) mkdirSync(resolvedAgentDir, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    let before: Stats;
    try {
      before = lstatSync(resolvedAgentDir);
    } catch (error) {
      if (!create && isMissingPathError(error)) return false;
      throw error;
    }
    if (!before.isDirectory() || before.isSymbolicLink()) {
      throw unsafePath(
        configPath,
        "The HarnessOS Agent settings directory is not a private directory.",
      );
    }

    let fd: number | undefined;
    try {
      if (process.platform !== "win32") {
        fd = openSync(resolvedAgentDir, constants.O_RDONLY | constants.O_DIRECTORY | O_NOFOLLOW);
        const opened = fstatSync(fd);
        if (!opened.isDirectory() || !sameIdentity(before, opened)) {
          throw unsafePath(
            configPath,
            "The HarnessOS Agent settings directory changed while it was being opened.",
          );
        }
        fchmodSync(fd, PRIVATE_DIRECTORY_MODE);
        before = opened;
      } else {
        chmodSync(resolvedAgentDir, PRIVATE_DIRECTORY_MODE);
      }

      const physical = realpathSync.native(resolvedAgentDir);
      const after = lstatSync(resolvedAgentDir);
      if (!after.isDirectory() || after.isSymbolicLink() || !sameIdentity(before, after)) {
        throw unsafePath(
          configPath,
          "The HarnessOS Agent settings directory changed while it was being secured.",
        );
      }
      if (agentDirectoryIdentity && !sameIdentity(agentDirectoryIdentity, after)) {
        throw unsafePath(
          configPath,
          "The HarnessOS Agent settings directory was replaced during this process.",
        );
      }
      if (agentDirectoryPhysicalPath && agentDirectoryPhysicalPath !== physical) {
        throw unsafePath(
          configPath,
          "The HarnessOS Agent settings directory resolved to a different location.",
        );
      }
      agentDirectoryIdentity ??= { dev: after.dev, ino: after.ino };
      agentDirectoryPhysicalPath ??= physical;
      return true;
    } catch (error) {
      if (["ELOOP", "ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        throw unsafePath(
          configPath,
          "The HarnessOS Agent settings directory changed while it was being secured.",
        );
      }
      throw error;
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  };

  const verifyAgentDirectory = () => {
    secureAgentDirectory(false);
  };

  const readSnapshot = (): WebSearchConfigSnapshot => {
    if (!secureAgentDirectory(false)) return absentSnapshot();
    try {
      return readExisting(configPath, verifyAgentDirectory);
    } catch (error) {
      if (isMissingPathError(error)) return absentSnapshot();
      throw error;
    }
  };

  const publish = (revision: string) => {
    for (const listener of listeners) {
      try {
        listener(revision);
      } catch {
        // A Session owns listener failure and unsubscription; config truth remains on disk.
      }
    }
  };

  return {
    configPath,
    ensureDefault() {
      secureAgentDirectory(true);
      writeNoClobber(configPath, serializedConfig(defaultConfig()));
      verifyAgentDirectory();
      return readExisting(configPath, verifyAgentDirectory);
    },
    readSnapshot,
    refresh() {
      const snapshot = readSnapshot();
      publish(snapshot.revision);
      return snapshot;
    },
    mutate(input) {
      secureAgentDirectory(true);
      const current = readSnapshot();
      if (!input.allowOverwriteConflict && input.expectedRevision !== current.revision) {
        throw new WebSearchConfigConflictError(input.expectedRevision, current.revision);
      }
      const patched = mergeKnownPatch(current.config, input.patch);
      for (const key of input.remove ?? []) delete patched[key];
      const candidate = migrateKnownConfig(patched);
      const raw = serializedConfig(candidate);
      const revision = revisionFor(raw);
      if (revision === current.revision && current.exists) {
        return { snapshot: current, changed: false };
      }
      if (!current.exists) {
        if (!writeNoClobber(configPath, raw)) {
          const raced = readExisting(configPath, verifyAgentDirectory);
          if (!input.allowOverwriteConflict && raced.revision !== input.expectedRevision) {
            throw new WebSearchConfigConflictError(input.expectedRevision, raced.revision);
          }
          atomicReplace(configPath, raw);
        }
      } else {
        atomicReplace(configPath, raw);
      }
      verifyAgentDirectory();
      const snapshot = readExisting(configPath, verifyAgentDirectory);
      publish(snapshot.revision);
      return { snapshot, changed: true };
    },
    subscribeRevision(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The package-owned process-local owner used by Settings and live Extension instances. */
export function getWebSearchConfigService(agentDir: string): WebSearchConfigService {
  const key = resolve(agentDir);
  let service = servicesByAgentDir.get(key);
  if (!service) {
    service = createWebSearchConfigService(key);
    servicesByAgentDir.set(key, service);
  }
  return service;
}

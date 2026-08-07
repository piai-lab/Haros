import { createHash, randomUUID } from "node:crypto";
import * as ChildProcess from "node:child_process";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import {
  CURRENT_DRAFT_KEY,
  LANES,
  LEGACY_DRAFT_KEYS,
  LEGACY_PRODUCT_DATABASE,
  LEGACY_SERVICE_DATABASE,
  PLAN_FORMAT,
  PROFILE_IDENTITIES,
  canonicalProductHome,
  profileRoot,
  type Blocker,
  type DirectFirstPublicPlan,
  type Lane,
  type LanePlan,
  type ProfileIdentity,
  type TargetPlan,
} from "./contracts.ts";
import {
  deleteLegacyProfileDraftKeys,
  inspectProfileDraftKeys,
} from "./chromium-leveldb.ts";
import { classifyLegacyDatabase } from "./sqlite-classifier.ts";
import {
  acquireProductTruthDatabaseLock,
  releaseProductTruthDatabaseLock,
  type ProductTruthDatabaseLock,
} from "./database-lock.ts";

export class DirectFirstPublicError extends Error {
  readonly exitCode: 2 | 3 | 4 | 5 | 6;
  readonly code:
    | "DEFAULT_ROOT_INVALID"
    | "OWNER_NOT_STOPPED"
    | "CLASSIFICATION_BLOCKED"
    | "INSPECTION_UNSAFE"
    | "DESTRUCTION_INCOMPLETE";

  constructor(
    exitCode: 2 | 3 | 4 | 5 | 6,
    code:
      | "DEFAULT_ROOT_INVALID"
      | "OWNER_NOT_STOPPED"
      | "CLASSIFICATION_BLOCKED"
      | "INSPECTION_UNSAFE"
      | "DESTRUCTION_INCOMPLETE",
  ) {
    super(code);
    this.name = "DirectFirstPublicError";
    this.exitCode = exitCode;
    this.code = code;
  }
}

function errnoCode(cause: unknown): string | undefined {
  return (cause as NodeJS.ErrnoException | undefined)?.code;
}

function pathExists(path: string): boolean {
  try {
    FS.lstatSync(path);
    return true;
  } catch (cause) {
    if (errnoCode(cause) === "ENOENT") return false;
    throw cause;
  }
}

function validateExistingAncestry(
  target: string,
  requirePrivateDirectory: boolean,
): void {
  const accountHome = OS.homedir();
  const relative = Path.relative(accountHome, target);
  if (relative.startsWith("..") || Path.isAbsolute(relative))
    throw new Error("DEFAULT_ROOT_INVALID");
  let current = accountHome;
  for (const component of relative.split(Path.sep).filter(Boolean)) {
    current = Path.join(current, component);
    if (!pathExists(current)) break;
    const stat = FS.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("DEFAULT_ROOT_INVALID");
    if (stat.isFile() && stat.nlink !== 1)
      throw new Error("DEFAULT_ROOT_INVALID");
    if (
      requirePrivateDirectory &&
      stat.isDirectory() &&
      process.platform !== "win32" &&
      (stat.mode & 0o022) !== 0
    ) {
      throw new Error("DEFAULT_ROOT_INVALID");
    }
  }
  const expectedReal = Path.join(FS.realpathSync.native(accountHome), relative);
  if (pathExists(target) && FS.realpathSync.native(target) !== expectedReal) {
    throw new Error("DEFAULT_ROOT_INVALID");
  }
}

export function validateDefaultRoot(
  homeArgument: string,
  confirmation?: string,
): string {
  if ((process.env.OMNIMIND_HOME ?? "").trim().length > 0)
    throw new DirectFirstPublicError(2, "DEFAULT_ROOT_INVALID");
  const canonical = canonicalProductHome();
  if (!homeArgument || Path.resolve(homeArgument) !== canonical)
    throw new DirectFirstPublicError(2, "DEFAULT_ROOT_INVALID");
  if (confirmation !== undefined && Path.resolve(confirmation) !== canonical) {
    throw new DirectFirstPublicError(2, "DEFAULT_ROOT_INVALID");
  }
  try {
    validateExistingAncestry(canonical, true);
    for (const lane of LANES)
      validateExistingAncestry(Path.join(canonical, lane), true);
    for (const identity of PROFILE_IDENTITIES)
      validateExistingAncestry(profileRoot(identity), true);
  } catch {
    throw new DirectFirstPublicError(2, "DEFAULT_ROOT_INVALID");
  }
  return canonical;
}

function stoppedProcesses(): DirectFirstPublicPlan["quiescence"] {
  const output = ChildProcess.execFileSync(
    "ps",
    ["-axo", "uid=,pid=,command="],
    {
      encoding: "utf8",
      timeout: 5_000,
    },
  );
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const matches = {
    desktop: false,
    service: false,
    nativeHost: false,
  };
  for (const line of output.split("\n")) {
    const match = /^\s*(\d+)\s+(\d+)\s+(.+)$/u.exec(line);
    if (
      !match ||
      (uid !== null && Number(match[1]) !== uid) ||
      Number(match[2]) === process.pid
    )
      continue;
    const command = match[3] ?? "";
    if (
      /OmniMind\.app|@omnimind\/desktop|apps\/desktop\/dist-electron/iu.test(
        command,
      )
    )
      matches.desktop = true;
    if (/@omnimind\/service|apps\/service\/(?:dist|src\/index)/iu.test(command))
      matches.service = true;
    if (
      /@omnimind\/native-host|apps\/native-host\/(?:dist|src\/index)/iu.test(
        command,
      )
    )
      matches.nativeHost = true;
    if (/scripts\/dev-runner\.ts/iu.test(command)) {
      matches.desktop = true;
      matches.service = true;
      matches.nativeHost = true;
    }
  }
  return {
    desktop: matches.desktop ? "blocked" : "stopped",
    service: matches.service ? "blocked" : "stopped",
    nativeHost: matches.nativeHost ? "blocked" : "stopped",
    profiles: "offline",
  };
}

function ownerState(pid: number): "live" | "dead" | "unknown" {
  try {
    process.kill(pid, 0);
    return "live";
  } catch (cause) {
    if (errnoCode(cause) === "ESRCH") return "dead";
    return "unknown";
  }
}

function lifecycleLockBlocks(
  databasePath: string,
  allowedToken?: string,
): boolean {
  const lock = `${databasePath}.lifecycle-lock`;
  if (!pathExists(lock)) return false;
  try {
    const lockStat = FS.lstatSync(lock);
    const ownerPath = Path.join(lock, "owner.json");
    const ownerStat = FS.lstatSync(ownerPath);
    if (
      !lockStat.isDirectory() ||
      lockStat.isSymbolicLink() ||
      !ownerStat.isFile() ||
      ownerStat.isSymbolicLink() ||
      ownerStat.nlink !== 1
    )
      return true;
    const before = FS.lstatSync(ownerPath, { bigint: true });
    const parsed = JSON.parse(FS.readFileSync(ownerPath, "utf8")) as Record<
      string,
      unknown
    >;
    const after = FS.lstatSync(ownerPath, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs
    )
      return true;
    if (
      !Number.isSafeInteger(parsed.pid) ||
      Number(parsed.pid) <= 0 ||
      typeof parsed.token !== "string"
    )
      return true;
    if (
      allowedToken !== undefined &&
      Number(parsed.pid) === process.pid &&
      parsed.token === allowedToken
    )
      return false;
    return ownerState(Number(parsed.pid)) !== "dead";
  } catch {
    return true;
  }
}

function profileSingletonBlocks(
  profilePath: string,
  allowedToken?: string,
): boolean {
  const lock = Path.join(profilePath, "SingletonLock");
  if (!pathExists(lock)) return false;
  try {
    const stat = FS.lstatSync(lock);
    if (
      allowedToken !== undefined &&
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1
    ) {
      const value = JSON.parse(FS.readFileSync(lock, "utf8")) as Record<
        string,
        unknown
      >;
      return Number(value.pid) !== process.pid || value.token !== allowedToken;
    }
  } catch {
    return true;
  }
  return true;
}

interface PackageClassification {
  readonly status: string;
  readonly disposable: readonly {
    readonly generation: string;
    readonly treeDigest: string;
  }[];
  readonly tombstones: readonly {
    readonly generation: string;
    readonly treeDigest: string;
    readonly name: string;
  }[];
  readonly blocker: boolean;
  readonly references: ReadonlySet<string>;
  readonly stageDigests: ReadonlyMap<string, string>;
}

export type DirectFirstPublicBoundary =
  | "mutation-preflight"
  | "profile-lock-acquired"
  | "database-lock-acquired"
  | "package-renamed"
  | "package-stage-absent"
  | "package-entry-unlinked"
  | "package-directory-removed"
  | "package-tombstone-removed"
  | "profile-key-removed"
  | "profile-reread"
  | "database-unlinked"
  | "directory-fsynced";

export interface DirectFirstPublicTestHooks {
  readonly afterBoundary?: (
    boundary: DirectFirstPublicBoundary,
    target: string,
  ) => void;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashFile(path: string): string {
  return createHash("sha256").update(FS.readFileSync(path)).digest("hex");
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...keys].sort())
  );
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeGeneration(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._@+-]{1,256}$/u.test(value);
}

function safeRelativeFile(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._+-]{1,255}$/u.test(value);
}

function validLoadReport(value: unknown): boolean {
  if (
    !isPlainRecord(value) ||
    !exactKeys(value, [
      "extensionCount",
      "toolNames",
      "commandNames",
      "lifecycleEvents",
    ])
  )
    return false;
  return (
    Number.isSafeInteger(value.extensionCount) &&
    Number(value.extensionCount) >= 0 &&
    [value.toolNames, value.commandNames, value.lifecycleEvents].every(
      (items) =>
        Array.isArray(items) &&
        items.length <= 256 &&
        items.every(
          (item) =>
            typeof item === "string" && item.length > 0 && item.length <= 256,
        ),
    )
  );
}

interface ClosedPackageState {
  readonly references: ReadonlySet<string>;
}

function decodeClosedPackageState(
  value: unknown,
  packageRoot: string,
): ClosedPackageState {
  if (
    !isPlainRecord(value) ||
    !exactKeys(value, [
      "version",
      "currentGeneration",
      "lastKnownGoodGeneration",
      "validatedGenerations",
      "quarantinedGenerations",
    ]) ||
    value.version !== 1 ||
    !isPlainRecord(value.validatedGenerations) ||
    !isPlainRecord(value.quarantinedGenerations)
  ) {
    throw new Error("PACKAGE_STATE_UNKNOWN");
  }
  const references = new Set<string>();
  const validated = new Set<string>();
  for (const [generation, raw] of Object.entries(value.validatedGenerations)) {
    if (
      !safeGeneration(generation) ||
      !isPlainRecord(raw) ||
      !exactKeys(raw, ["artifact", "report", "validatedAt"]) ||
      typeof raw.validatedAt !== "string" ||
      !Number.isFinite(Date.parse(raw.validatedAt)) ||
      !validLoadReport(raw.report) ||
      !isPlainRecord(raw.artifact) ||
      !exactKeys(raw.artifact, [
        "generation",
        "stagePath",
        "manifestSha256",
        "executablePath",
        "executableSha256",
        "executableBytes",
      ])
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    const artifact = raw.artifact;
    if (
      artifact.generation !== generation ||
      artifact.stagePath !== Path.join(packageRoot, "stage", generation) ||
      !safeRelativeFile(artifact.executablePath) ||
      typeof artifact.manifestSha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(artifact.manifestSha256) ||
      typeof artifact.executableSha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(artifact.executableSha256) ||
      !Number.isSafeInteger(artifact.executableBytes) ||
      Number(artifact.executableBytes) <= 0
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    validated.add(generation);
    references.add(generation);
  }
  for (const [generation, raw] of Object.entries(
    value.quarantinedGenerations,
  )) {
    if (
      !validated.has(generation) ||
      !isPlainRecord(raw) ||
      !exactKeys(raw, ["code", "observedAt"]) ||
      typeof raw.code !== "string" ||
      raw.code.length === 0 ||
      typeof raw.observedAt !== "string" ||
      !Number.isFinite(Date.parse(raw.observedAt))
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    references.add(generation);
  }
  for (const candidate of [
    value.currentGeneration,
    value.lastKnownGoodGeneration,
  ]) {
    if (candidate === null) continue;
    if (
      !safeGeneration(candidate) ||
      (candidate !== "pi-runtime-0.81.1-package-empty" &&
        !validated.has(candidate))
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    references.add(candidate);
  }
  if (
    typeof value.currentGeneration === "string" &&
    value.currentGeneration in value.quarantinedGenerations
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  return { references };
}

interface ValidatedStage {
  readonly generation: string;
  readonly treeDigest: string;
}

function validateRemainingTombstone(
  packageRoot: string,
  directory: string,
  generation: string,
  digest: string,
): "full" | "manifest-only" | "empty" {
  const stat = FS.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const entries = FS.readdirSync(directory).sort();
  if (entries.length === 0) return "empty";
  if (entries.length === 1 && entries[0] === "manifest.json") {
    const manifestPath = Path.join(directory, "manifest.json");
    const manifestStat = FS.lstatSync(manifestPath);
    if (
      !manifestStat.isFile() ||
      manifestStat.isSymbolicLink() ||
      manifestStat.nlink !== 1
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    const manifestBytes = FS.readFileSync(manifestPath);
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      throw new Error("PACKAGE_STATE_UNKNOWN");
    }
    if (
      !isPlainRecord(manifest) ||
      !exactKeys(manifest, [
        "schemaVersion",
        "id",
        "version",
        "generation",
        "runtime",
        "executable",
        "source",
        "rights",
        "trust",
        "surfaces",
      ]) ||
      manifest.schemaVersion !== 1 ||
      manifest.generation !== generation ||
      !isPlainRecord(manifest.executable) ||
      !exactKeys(manifest.executable, ["path", "sha256", "bytes"]) ||
      !safeRelativeFile(manifest.executable.path) ||
      typeof manifest.executable.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(manifest.executable.sha256) ||
      !Number.isSafeInteger(manifest.executable.bytes) ||
      Number(manifest.executable.bytes) <= 0 ||
      !isPlainRecord(manifest.rights) ||
      typeof manifest.rights.noticePath !== "string" ||
      !/^\.\.\/\.\.\/licenses\/[A-Za-z0-9._+-]+$/u.test(
        manifest.rights.noticePath,
      ) ||
      typeof manifest.rights.normalizedNoticeSha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(manifest.rights.normalizedNoticeSha256)
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    const notice = Path.resolve(directory, manifest.rights.noticePath);
    if (Path.dirname(notice) !== Path.join(packageRoot, "licenses"))
      throw new Error("PACKAGE_STATE_UNKNOWN");
    const noticeStat = FS.lstatSync(notice);
    if (
      !noticeStat.isFile() ||
      noticeStat.isSymbolicLink() ||
      noticeStat.nlink !== 1
    )
      throw new Error("PACKAGE_STATE_UNKNOWN");
    const normalizedNotice = FS.readFileSync(notice, "utf8")
      .replace(/\r\n/gu, "\n")
      .trimEnd();
    if (sha256(normalizedNotice) !== manifest.rights.normalizedNoticeSha256)
      throw new Error("PACKAGE_STATE_UNKNOWN");
    const expected = sha256(
      `manifest.json\0${sha256(manifestBytes)}\0${manifest.executable.path}\0${manifest.executable.sha256}\0${manifest.executable.bytes}`,
    );
    if (expected !== digest) throw new Error("PACKAGE_STATE_UNKNOWN");
    return "manifest-only";
  }
  const full = validateClosedStage(packageRoot, directory, generation);
  if (full.treeDigest !== digest) throw new Error("PACKAGE_STATE_UNKNOWN");
  return "full";
}

function validateClosedStage(
  packageRoot: string,
  directory: string,
  expectedGeneration?: string,
): ValidatedStage {
  const directoryStat = FS.lstatSync(directory);
  if (
    !directoryStat.isDirectory() ||
    directoryStat.isSymbolicLink() ||
    (process.platform !== "win32" && (directoryStat.mode & 0o022) !== 0)
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const manifestPath = Path.join(directory, "manifest.json");
  const manifestStat = FS.lstatSync(manifestPath);
  if (
    !manifestStat.isFile() ||
    manifestStat.isSymbolicLink() ||
    manifestStat.nlink !== 1
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const manifestBytes = FS.readFileSync(manifestPath);
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error("PACKAGE_STATE_UNKNOWN");
  }
  if (
    !isPlainRecord(manifest) ||
    !exactKeys(manifest, [
      "schemaVersion",
      "id",
      "version",
      "generation",
      "runtime",
      "executable",
      "source",
      "rights",
      "trust",
      "surfaces",
    ]) ||
    manifest.schemaVersion !== 1 ||
    !safeGeneration(manifest.generation) ||
    (expectedGeneration !== undefined &&
      manifest.generation !== expectedGeneration) ||
    typeof manifest.id !== "string" ||
    !manifest.id ||
    typeof manifest.version !== "string" ||
    !manifest.version ||
    !isPlainRecord(manifest.runtime) ||
    !exactKeys(manifest.runtime, ["engine", "version", "compatibility"]) ||
    !isPlainRecord(manifest.executable) ||
    !exactKeys(manifest.executable, ["path", "sha256", "bytes"]) ||
    !isPlainRecord(manifest.source) ||
    !isPlainRecord(manifest.rights) ||
    !exactKeys(manifest.rights, [
      "license",
      "noticePath",
      "normalizedNoticeSha256",
    ]) ||
    !isPlainRecord(manifest.trust) ||
    !isPlainRecord(manifest.surfaces)
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const executablePath = manifest.executable.path;
  const executableDigest = manifest.executable.sha256;
  const executableBytes = manifest.executable.bytes;
  if (
    !safeRelativeFile(executablePath) ||
    typeof executableDigest !== "string" ||
    !/^[0-9a-f]{64}$/u.test(executableDigest) ||
    !Number.isSafeInteger(executableBytes) ||
    Number(executableBytes) <= 0 ||
    typeof manifest.rights.license !== "string" ||
    !manifest.rights.license ||
    typeof manifest.rights.noticePath !== "string" ||
    !/^\.\.\/\.\.\/licenses\/[A-Za-z0-9._+-]+$/u.test(
      manifest.rights.noticePath,
    ) ||
    typeof manifest.rights.normalizedNoticeSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(manifest.rights.normalizedNoticeSha256)
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const executable = Path.join(directory, executablePath);
  const executableStat = FS.lstatSync(executable);
  if (
    !executableStat.isFile() ||
    executableStat.isSymbolicLink() ||
    executableStat.nlink !== 1 ||
    executableStat.size !== Number(executableBytes) ||
    hashFile(executable) !== executableDigest
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  if (
    FS.readdirSync(directory).sort().join("\0") !==
    ["manifest.json", executablePath].sort().join("\0")
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const notice = Path.resolve(directory, manifest.rights.noticePath);
  const licenseRoot = Path.join(packageRoot, "licenses");
  if (Path.dirname(notice) !== licenseRoot)
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const noticeStat = FS.lstatSync(notice);
  if (
    !noticeStat.isFile() ||
    noticeStat.isSymbolicLink() ||
    noticeStat.nlink !== 1
  )
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const normalizedNotice = FS.readFileSync(notice, "utf8")
    .replace(/\r\n/gu, "\n")
    .trimEnd();
  if (sha256(normalizedNotice) !== manifest.rights.normalizedNoticeSha256)
    throw new Error("PACKAGE_STATE_UNKNOWN");
  const treeDigest = sha256(
    `manifest.json\0${sha256(manifestBytes)}\0${executablePath}\0${executableDigest}\0${executableBytes}`,
  );
  return { generation: manifest.generation, treeDigest };
}

function classifyPackage(lanePath: string): PackageClassification {
  const root = Path.join(lanePath, "packages");
  const stage = Path.join(root, "stage");
  const statePath = Path.join(root, "state.json");
  const discarding = Path.join(root, ".discarding");
  if (!pathExists(root))
    return {
      status: "absent",
      disposable: [],
      tombstones: [],
      blocker: false,
      references: new Set(),
      stageDigests: new Map(),
    };
  if (!pathExists(statePath)) {
    const hasChildren =
      (pathExists(stage) && FS.readdirSync(stage).length > 0) ||
      (pathExists(discarding) && FS.readdirSync(discarding).length > 0);
    return hasChildren
      ? {
          status: "blocked",
          disposable: [],
          tombstones: [],
          blocker: true,
          references: new Set(),
          stageDigests: new Map(),
        }
      : {
          status: "empty",
          disposable: [],
          tombstones: [],
          blocker: false,
          references: new Set(),
          stageDigests: new Map(),
        };
  }
  let state: ClosedPackageState;
  try {
    const stat = FS.lstatSync(statePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
      throw new Error();
    state = decodeClosedPackageState(
      JSON.parse(FS.readFileSync(statePath, "utf8")),
      root,
    );
  } catch {
    return {
      status: "blocked",
      disposable: [],
      tombstones: [],
      blocker: true,
      references: new Set(),
      stageDigests: new Map(),
    };
  }
  try {
    const disposable: Array<{ generation: string; treeDigest: string }> = [];
    const tombstones: Array<{
      generation: string;
      treeDigest: string;
      name: string;
    }> = [];
    const stageDigests = new Map<string, string>();
    if (pathExists(stage)) {
      const stageStat = FS.lstatSync(stage);
      if (!stageStat.isDirectory() || stageStat.isSymbolicLink())
        throw new Error();
      for (const generation of FS.readdirSync(stage).sort()) {
        if (!safeGeneration(generation)) throw new Error();
        if (state.references.has(generation)) {
          const validated = validateClosedStage(
            root,
            Path.join(stage, generation),
            generation,
          );
          stageDigests.set(generation, validated.treeDigest);
          continue;
        }
        const validated = validateClosedStage(
          root,
          Path.join(stage, generation),
          generation,
        );
        stageDigests.set(generation, validated.treeDigest);
        disposable.push(validated);
      }
    }
    for (const generation of state.references) {
      if (generation === "pi-runtime-0.81.1-package-empty") continue;
      if (!stageDigests.has(generation)) throw new Error();
    }
    if (pathExists(discarding)) {
      const stat = FS.lstatSync(discarding);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error();
      for (const name of FS.readdirSync(discarding).sort()) {
        const match = /^(.+)\.([0-9a-f]{64})$/u.exec(name);
        const generation = match?.[1];
        const treeDigest = match?.[2];
        if (
          !generation ||
          !treeDigest ||
          !safeGeneration(generation) ||
          state.references.has(generation) ||
          pathExists(Path.join(stage, generation))
        )
          throw new Error();
        validateRemainingTombstone(
          root,
          Path.join(discarding, name),
          generation,
          treeDigest,
        );
        tombstones.push({ generation, treeDigest, name });
      }
    }
    return {
      status:
        disposable.length || tombstones.length ? "disposable-stage" : "closed",
      disposable,
      tombstones,
      blocker: false,
      references: state.references,
      stageDigests,
    };
  } catch {
    return {
      status: "blocked",
      disposable: [],
      tombstones: [],
      blocker: true,
      references: state.references,
      stageDigests: new Map(),
    };
  }
}

export async function inspectDirectFirstPublic(
  canonicalHome: string,
  options?: {
    readonly databaseLockTokens?: ReadonlyMap<string, string>;
    readonly profileLockTokens?: ReadonlyMap<string, string>;
  },
): Promise<DirectFirstPublicPlan> {
  validateDefaultRoot(canonicalHome);
  const quiescence = stoppedProcesses();
  const blockers: Blocker[] = [];
  if (
    quiescence.desktop === "blocked" ||
    quiescence.service === "blocked" ||
    quiescence.nativeHost === "blocked"
  ) {
    throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
  }
  const targets: TargetPlan[] = [];
  const protectedFacts: DirectFirstPublicPlan["protectedFacts"][number][] = [];
  const lanes: LanePlan[] = [];
  const packagePlans = new Map<Lane, PackageClassification>();
  for (const lane of LANES) {
    const lanePath = Path.join(canonicalHome, lane);
    const productPath = Path.join(lanePath, LEGACY_PRODUCT_DATABASE);
    const servicePath = Path.join(lanePath, LEGACY_SERVICE_DATABASE);
    if (
      lifecycleLockBlocks(
        productPath,
        options?.databaseLockTokens?.get(productPath),
      ) ||
      lifecycleLockBlocks(
        servicePath,
        options?.databaseLockTokens?.get(servicePath),
      )
    ) {
      throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
    }
    let product;
    let service;
    try {
      product = classifyLegacyDatabase(productPath, lane, "product");
      service = classifyLegacyDatabase(servicePath, lane, "service");
    } catch {
      throw new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
    }
    protectedFacts.push(product.facts, service.facts);
    blockers.push(...product.blockers, ...service.blockers);
    const currentProduct = Path.join(lanePath, "stores", "product.sqlite");
    const currentService = Path.join(lanePath, "stores", "service.sqlite");
    if (pathExists(currentProduct) && product.plan.status !== "absent") {
      blockers.push({
        code: "CURRENT_STATE_CONTRADICTORY",
        laneOrProfile: lane,
        targetKind: "product",
      });
    }
    if (pathExists(currentService) && service.plan.status !== "absent") {
      blockers.push({
        code: "CURRENT_STATE_CONTRADICTORY",
        laneOrProfile: lane,
        targetKind: "service",
      });
    }
    const packagePlan = classifyPackage(lanePath);
    packagePlans.set(lane, packagePlan);
    if (packagePlan.blocker)
      blockers.push({
        code: "PACKAGE_STATE_UNKNOWN",
        laneOrProfile: lane,
        targetKind: "package",
      });
    for (const [kind, path, classification] of [
      ["product", productPath, product.plan.status],
      ["service", servicePath, service.plan.status],
    ] as const) {
      for (const suffix of ["", "-wal", "-shm"]) {
        if (!pathExists(`${path}${suffix}`)) continue;
        targets.push({
          kind: "database",
          laneOrProfile: lane,
          relativePathOrKey: Path.relative(canonicalHome, `${path}${suffix}`),
          classification,
          action:
            classification === "classified" ||
            classification === "orphan-sidecar"
              ? "remove"
              : "none",
        });
      }
    }
    lanes.push({
      lane,
      product: product.plan,
      service: service.plan,
      package: {
        status: packagePlan.status,
        disposableCount:
          packagePlan.disposable.length + packagePlan.tombstones.length,
      },
    });
  }
  for (const lane of LANES) {
    const plan = packagePlans.get(lane)!;
    const otherLane = lane === "dev" ? "userdata" : "dev";
    const other = packagePlans.get(otherLane)!;
    for (const candidate of plan.disposable) {
      const otherDigest = other.stageDigests.get(candidate.generation);
      if (otherDigest !== undefined && otherDigest !== candidate.treeDigest) {
        blockers.push({
          code: "PACKAGE_STATE_UNKNOWN",
          laneOrProfile: lane,
          targetKind: "package",
        });
        continue;
      }
      const classification = other.references.has(candidate.generation)
        ? `duplicate:${candidate.treeDigest}`
        : `obsolete:${candidate.treeDigest}`;
      targets.push({
        kind: "package-stage",
        laneOrProfile: lane,
        relativePathOrKey: Path.join("packages", "stage", candidate.generation),
        classification,
        action: "remove",
      });
    }
    for (const tombstone of plan.tombstones) {
      const otherDigest = other.stageDigests.get(tombstone.generation);
      if (otherDigest !== undefined && otherDigest !== tombstone.treeDigest) {
        blockers.push({
          code: "PACKAGE_STATE_UNKNOWN",
          laneOrProfile: lane,
          targetKind: "package",
        });
        continue;
      }
      const original = other.references.has(tombstone.generation)
        ? `duplicate:${tombstone.treeDigest}`
        : `obsolete:${tombstone.treeDigest}`;
      targets.push({
        kind: "package-tombstone",
        laneOrProfile: lane,
        relativePathOrKey: Path.join("packages", ".discarding", tombstone.name),
        classification: `resume:${original}`,
        action: "remove",
      });
    }
  }
  const profiles = [];
  for (const identity of PROFILE_IDENTITIES) {
    const root = profileRoot(identity);
    if (profileSingletonBlocks(root, options?.profileLockTokens?.get(root)))
      throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
    let profile;
    try {
      profile = await inspectProfileDraftKeys(identity, root);
    } catch {
      throw new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
    }
    profiles.push(profile);
    for (const [logicalKey, status] of [
      [LEGACY_DRAFT_KEYS[0], profile.v1],
      [LEGACY_DRAFT_KEYS[1], profile.v2],
    ] as const) {
      if (status === "present")
        targets.push({
          kind: "draft-key",
          laneOrProfile: identity,
          relativePathOrKey: logicalKey,
          classification: "legacy-owned-key",
          action: "remove",
        });
    }
    if (
      profile.g1 === "present" &&
      (profile.v1 === "present" || profile.v2 === "present")
    ) {
      blockers.push({
        code: "CURRENT_STATE_CONTRADICTORY",
        laneOrProfile: identity,
        targetKind: "draft-key",
      });
    }
  }
  targets.sort((left, right) =>
    `${left.laneOrProfile}:${left.relativePathOrKey}`.localeCompare(
      `${right.laneOrProfile}:${right.relativePathOrKey}`,
    ),
  );
  blockers.sort((left, right) =>
    `${left.code}:${left.laneOrProfile}:${left.targetKind}`.localeCompare(
      `${right.code}:${right.laneOrProfile}:${right.targetKind}`,
    ),
  );
  return {
    format: PLAN_FORMAT,
    canonicalHome,
    quiescence,
    lanes,
    profiles,
    targets,
    protectedFacts,
    blockers,
  };
}

interface ProfileLock {
  readonly path: string;
  readonly token: string;
  readonly dev: number;
  readonly ino: number;
}

function acquireProfileLock(identity: ProfileIdentity): ProfileLock | null {
  const root = profileRoot(identity);
  if (!pathExists(root)) return null;
  const path = Path.join(root, "SingletonLock");
  const token = randomUUID();
  const descriptor = FS.openSync(path, "wx", 0o600);
  try {
    FS.writeFileSync(
      descriptor,
      `${JSON.stringify({ pid: process.pid, token })}\n`,
    );
    FS.fsyncSync(descriptor);
  } finally {
    FS.closeSync(descriptor);
  }
  const stat = FS.lstatSync(path);
  return { path, token, dev: stat.dev, ino: stat.ino };
}

function releaseProfileLock(lock: ProfileLock): void {
  const stat = FS.lstatSync(lock.path);
  if (stat.dev !== lock.dev || stat.ino !== lock.ino)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const parsed = JSON.parse(FS.readFileSync(lock.path, "utf8")) as Record<
    string,
    unknown
  >;
  if (parsed.pid !== process.pid || parsed.token !== lock.token)
    throw new Error("DESTRUCTION_INCOMPLETE");
  FS.unlinkSync(lock.path);
}

function assertInvocationLocks(
  canonicalHome: string,
  profileLocks: readonly ProfileLock[],
  databaseLocks: readonly ProductTruthDatabaseLock[],
): void {
  validateDefaultRoot(canonicalHome, canonicalHome);
  const profileByRoot = new Map(
    profileLocks.map((lock) => [Path.dirname(lock.path), lock]),
  );
  for (const identity of PROFILE_IDENTITIES) {
    const root = profileRoot(identity);
    if (!pathExists(root)) continue;
    const lock = profileByRoot.get(root);
    if (!lock || profileSingletonBlocks(root, lock.token))
      throw new Error("DESTRUCTION_INCOMPLETE");
    const stat = FS.lstatSync(lock.path);
    if (stat.dev !== lock.dev || stat.ino !== lock.ino)
      throw new Error("DESTRUCTION_INCOMPLETE");
  }
  const databaseByPath = new Map(
    databaseLocks.map((lock) => [lock.databasePath, lock]),
  );
  for (const lane of LANES) {
    const lanePath = Path.join(canonicalHome, lane);
    if (!pathExists(lanePath)) continue;
    for (const filename of [LEGACY_PRODUCT_DATABASE, LEGACY_SERVICE_DATABASE]) {
      const databasePath = Path.join(lanePath, filename);
      const lock = databaseByPath.get(databasePath);
      if (!lock || lifecycleLockBlocks(databasePath, lock.token))
        throw new Error("DESTRUCTION_INCOMPLETE");
      const lockStat = FS.lstatSync(lock.lockPath);
      const ownerStat = FS.lstatSync(Path.join(lock.lockPath, "owner.json"));
      if (
        lockStat.dev !== lock.lockDev ||
        lockStat.ino !== lock.lockIno ||
        ownerStat.dev !== lock.ownerDev ||
        ownerStat.ino !== lock.ownerIno
      )
        throw new Error("DESTRUCTION_INCOMPLETE");
    }
  }
}

function fsyncDirectory(
  directory: string,
  hooks?: DirectFirstPublicTestHooks,
): void {
  if (process.platform === "win32") return;
  const descriptor = FS.openSync(
    directory,
    FS.constants.O_RDONLY | FS.constants.O_DIRECTORY | FS.constants.O_NOFOLLOW,
  );
  try {
    FS.fsyncSync(descriptor);
  } finally {
    FS.closeSync(descriptor);
  }
  hooks?.afterBoundary?.("directory-fsynced", directory);
}

function removeDatabaseTarget(
  canonicalHome: string,
  relativePath: string,
  hooks?: DirectFirstPublicTestHooks,
): void {
  const target = Path.join(canonicalHome, relativePath);
  const parent = Path.dirname(target);
  const stat = FS.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
    throw new Error("DESTRUCTION_INCOMPLETE");
  FS.unlinkSync(target);
  hooks?.afterBoundary?.("database-unlinked", relativePath);
  if (pathExists(target)) throw new Error("DESTRUCTION_INCOMPLETE");
  fsyncDirectory(parent, hooks);
}

function removeClosedStage(
  packageRoot: string,
  directory: string,
  generation: string,
  digest: string,
  hooks?: DirectFirstPublicTestHooks,
): void {
  const validated = validateClosedStage(packageRoot, directory, generation);
  if (validated.treeDigest !== digest)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const manifest = JSON.parse(
    FS.readFileSync(Path.join(directory, "manifest.json"), "utf8"),
  ) as { readonly executable: { readonly path: string } };
  const names = [manifest.executable.path, "manifest.json"];
  for (const [index, name] of names.entries()) {
    if (
      FS.readdirSync(directory).sort().join("\0") !==
      names.slice(index).sort().join("\0")
    )
      throw new Error("DESTRUCTION_INCOMPLETE");
    const target = Path.join(directory, name);
    const stat = FS.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
      throw new Error("DESTRUCTION_INCOMPLETE");
    FS.unlinkSync(target);
    hooks?.afterBoundary?.("package-entry-unlinked", target);
  }
  if (FS.readdirSync(directory).length !== 0)
    throw new Error("DESTRUCTION_INCOMPLETE");
  FS.rmdirSync(directory);
  hooks?.afterBoundary?.("package-directory-removed", directory);
}

function removePackageTombstone(
  canonicalHome: string,
  lane: Lane,
  relativePath: string,
  hooks?: DirectFirstPublicTestHooks,
): void {
  const root = Path.join(canonicalHome, lane, "packages");
  const target = Path.join(canonicalHome, lane, relativePath);
  const discarding = Path.join(root, ".discarding");
  if (Path.dirname(target) !== discarding)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const match = /^(.+)\.([0-9a-f]{64})$/u.exec(Path.basename(target));
  const generation = match?.[1];
  const digest = match?.[2];
  if (!generation || !digest) throw new Error("DESTRUCTION_INCOMPLETE");
  const remaining = validateRemainingTombstone(
    root,
    target,
    generation,
    digest,
  );
  if (remaining === "full") {
    removeClosedStage(root, target, generation, digest, hooks);
  } else {
    if (remaining === "manifest-only") {
      const manifest = Path.join(target, "manifest.json");
      const stat = FS.lstatSync(manifest);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
        throw new Error("DESTRUCTION_INCOMPLETE");
      FS.unlinkSync(manifest);
      hooks?.afterBoundary?.("package-entry-unlinked", manifest);
    }
    if (FS.readdirSync(target).length !== 0)
      throw new Error("DESTRUCTION_INCOMPLETE");
    FS.rmdirSync(target);
    hooks?.afterBoundary?.("package-directory-removed", target);
  }
  hooks?.afterBoundary?.("package-tombstone-removed", relativePath);
  if (FS.readdirSync(discarding).length === 0) FS.rmdirSync(discarding);
  else fsyncDirectory(discarding, hooks);
  fsyncDirectory(root, hooks);
}

function removePackageStage(
  canonicalHome: string,
  lane: Lane,
  target: TargetPlan,
  hooks?: DirectFirstPublicTestHooks,
): void {
  const relativePath = target.relativePathOrKey;
  const stageChild = Path.join(
    canonicalHome,
    lane,
    relativePath.replace(/^packages[\\/]stage[\\/]/u, "packages/stage/"),
  );
  const stage = Path.join(canonicalHome, lane, "packages", "stage");
  if (Path.dirname(stageChild) !== stage)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const discarding = Path.join(canonicalHome, lane, "packages", ".discarding");
  if (!pathExists(discarding)) FS.mkdirSync(discarding, { mode: 0o700 });
  const digest = /^(?:obsolete|duplicate):([0-9a-f]{64})$/u.exec(
    target.classification,
  )?.[1];
  if (!digest) throw new Error("DESTRUCTION_INCOMPLETE");
  const tombstone = Path.join(
    discarding,
    `${Path.basename(stageChild)}.${digest}`,
  );
  if (pathExists(tombstone)) throw new Error("DESTRUCTION_INCOMPLETE");
  FS.renameSync(stageChild, tombstone);
  hooks?.afterBoundary?.("package-renamed", relativePath);
  if (pathExists(stageChild)) throw new Error("DESTRUCTION_INCOMPLETE");
  hooks?.afterBoundary?.("package-stage-absent", relativePath);
  fsyncDirectory(stage, hooks);
  fsyncDirectory(discarding, hooks);
  const packageRoot = Path.join(canonicalHome, lane, "packages");
  const validated = validateClosedStage(
    packageRoot,
    tombstone,
    Path.basename(stageChild),
  );
  if (validated.treeDigest !== digest)
    throw new Error("DESTRUCTION_INCOMPLETE");
  removeClosedStage(
    packageRoot,
    tombstone,
    Path.basename(stageChild),
    digest,
    hooks,
  );
  hooks?.afterBoundary?.(
    "package-tombstone-removed",
    Path.relative(canonicalHome, tombstone),
  );
  if (pathExists(tombstone)) throw new Error("DESTRUCTION_INCOMPLETE");
  if (FS.readdirSync(discarding).length === 0) FS.rmdirSync(discarding);
  fsyncDirectory(Path.dirname(stage), hooks);
}

export async function applyDirectFirstPublic(
  canonicalHome: string,
  hooks?: DirectFirstPublicTestHooks,
): Promise<DirectFirstPublicPlan> {
  const profileLocks: ProfileLock[] = [];
  const databaseLocks: ProductTruthDatabaseLock[] = [];
  let phase: "locks" | "inspection" | "destruction" = "locks";
  try {
    validateDefaultRoot(canonicalHome, canonicalHome);
    for (const identity of PROFILE_IDENTITIES) {
      const lock = acquireProfileLock(identity);
      if (lock) {
        profileLocks.push(lock);
        hooks?.afterBoundary?.("profile-lock-acquired", identity);
      }
    }
    for (const lane of LANES) {
      const lanePath = Path.join(canonicalHome, lane);
      if (!pathExists(lanePath)) continue;
      for (const filename of [
        LEGACY_PRODUCT_DATABASE,
        LEGACY_SERVICE_DATABASE,
      ]) {
        const lock = acquireProductTruthDatabaseLock(
          Path.join(lanePath, filename),
        );
        databaseLocks.push(lock);
        hooks?.afterBoundary?.("database-lock-acquired", `${lane}:${filename}`);
      }
    }
    phase = "inspection";
    validateDefaultRoot(canonicalHome, canonicalHome);
    const databaseLockTokens = new Map(
      databaseLocks.map((lock) => [lock.databasePath, lock.token]),
    );
    const profileLockTokens = new Map(
      profileLocks.map((lock) => [Path.dirname(lock.path), lock.token]),
    );
    const lockOptions = { databaseLockTokens, profileLockTokens };
    const plan = await inspectDirectFirstPublic(canonicalHome, lockOptions);
    if (plan.blockers.length)
      throw new DirectFirstPublicError(4, "CLASSIFICATION_BLOCKED");
    phase = "destruction";
    hooks?.afterBoundary?.("mutation-preflight", canonicalHome);
    assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
    for (const target of plan.targets.filter(
      (candidate) =>
        candidate.action === "remove" &&
        (candidate.kind === "package-stage" ||
          candidate.kind === "package-tombstone"),
    )) {
      assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
      if (target.kind === "package-stage")
        removePackageStage(
          canonicalHome,
          target.laneOrProfile as Lane,
          target,
          hooks,
        );
      else
        removePackageTombstone(
          canonicalHome,
          target.laneOrProfile as Lane,
          target.relativePathOrKey,
          hooks,
        );
    }
    for (const identity of PROFILE_IDENTITIES) {
      assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
      await deleteLegacyProfileDraftKeys(
        identity,
        profileRoot(identity),
        hooks?.afterBoundary,
      );
    }
    for (const target of plan.targets.filter(
      (candidate) =>
        candidate.action === "remove" && candidate.kind === "database",
    )) {
      assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
      removeDatabaseTarget(canonicalHome, target.relativePathOrKey, hooks);
    }
    assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
    validateDefaultRoot(canonicalHome, canonicalHome);
    const finalPlan = await inspectDirectFirstPublic(
      canonicalHome,
      lockOptions,
    );
    if (
      finalPlan.blockers.length ||
      finalPlan.targets.some((target) => target.action === "remove")
    ) {
      throw new DirectFirstPublicError(6, "DESTRUCTION_INCOMPLETE");
    }
    return finalPlan;
  } catch (cause) {
    if (cause instanceof DirectFirstPublicError) throw cause;
    if ((cause as Error).message === "DESTRUCTION_INCOMPLETE")
      throw new DirectFirstPublicError(6, "DESTRUCTION_INCOMPLETE");
    if (phase === "locks")
      throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
    if (phase === "inspection")
      throw new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
    throw new DirectFirstPublicError(6, "DESTRUCTION_INCOMPLETE");
  } finally {
    let releaseFailed = false;
    for (const lock of databaseLocks.reverse()) {
      try {
        releaseProductTruthDatabaseLock(lock);
      } catch {
        releaseFailed = true;
      }
    }
    for (const lock of profileLocks.reverse()) {
      try {
        releaseProfileLock(lock);
      } catch {
        releaseFailed = true;
      }
    }
    if (releaseFailed)
      throw new DirectFirstPublicError(6, "DESTRUCTION_INCOMPLETE");
  }
}

export function sanitizedReceipt(plan: DirectFirstPublicPlan): {
  readonly format: string;
  readonly code: "REBUILD_APPLIED";
  readonly remainingTargets: number;
} {
  return {
    format: plan.format,
    code: "REBUILD_APPLIED",
    remainingTargets: plan.targets.filter(
      (target) => target.action === "remove",
    ).length,
  };
}

export const exactDraftKeysForTest = {
  legacy: LEGACY_DRAFT_KEYS,
  current: CURRENT_DRAFT_KEY,
};

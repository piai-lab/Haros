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
  withProductTruthDatabaseLocks,
  type ProductTruthDatabaseLock,
  type ProductTruthProfileLock as ProfileLock,
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

const WINDOWS_PROCESS_QUERY = String.raw`$ErrorActionPreference='Stop';$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;$rows=@(Get-CimInstance Win32_Process|ForEach-Object{$owner=(Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid).Sid;if($owner -eq $sid){[pscustomobject]@{sid=$owner;pid=[int]$_.ProcessId;executablePath=[string]$_.ExecutablePath;commandLine=[string]$_.CommandLine}}});[pscustomobject]@{currentSid=$sid;rows=$rows}|ConvertTo-Json -Compress -Depth 3`;

function exactObjectKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function markProcessMatches(
  commands: readonly string[],
): Pick<DirectFirstPublicPlan["quiescence"], "desktop" | "service" | "nativeHost"> {
  const matches = {
    desktop: false,
    service: false,
    nativeHost: false,
  };
  for (const command of commands) {
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
  };
}

function stoppedProcesses(): DirectFirstPublicPlan["quiescence"] {
  try {
    let commands: string[];
    if (process.platform === "win32") {
      const output = ChildProcess.execFileSync(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", WINDOWS_PROCESS_QUERY],
        { encoding: "utf8", timeout: 5_000, maxBuffer: 1024 * 1024 },
      );
      const decoded: unknown = JSON.parse(output);
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        Array.isArray(decoded) ||
        !exactObjectKeys(decoded as Record<string, unknown>, ["currentSid", "rows"])
      ) {
        throw new Error("WINDOWS_PROCESS_RESULT_INVALID");
      }
      const { currentSid, rows } = decoded as Record<string, unknown>;
      if (
        typeof currentSid !== "string" ||
        !/^S-\d(?:-\d+)+$/u.test(currentSid) ||
        !Array.isArray(rows) ||
        rows.length > 4096
      ) {
        throw new Error("WINDOWS_PROCESS_RESULT_INVALID");
      }
      commands = rows.flatMap((value) => {
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value) ||
          !exactObjectKeys(value as Record<string, unknown>, [
            "sid",
            "pid",
            "executablePath",
            "commandLine",
          ])
        ) {
          throw new Error("WINDOWS_PROCESS_RESULT_INVALID");
        }
        const row = value as Record<string, unknown>;
        if (
          row.sid !== currentSid ||
          !Number.isSafeInteger(row.pid) ||
          (row.pid as number) <= 0 ||
          typeof row.executablePath !== "string" ||
          typeof row.commandLine !== "string" ||
          row.executablePath.length > 32_768 ||
          row.commandLine.length > 32_768
        ) {
          throw new Error("WINDOWS_PROCESS_RESULT_INVALID");
        }
        return row.pid === process.pid
          ? []
          : [`${row.executablePath}\n${row.commandLine}`];
      });
    } else {
      const output = ChildProcess.execFileSync(
        "ps",
        ["-axo", "uid=,pid=,command="],
        { encoding: "utf8", timeout: 5_000, maxBuffer: 1024 * 1024 },
      );
      const uid = typeof process.getuid === "function" ? process.getuid() : null;
      if (uid === null) throw new Error("POSIX_PROCESS_OWNER_UNKNOWN");
      commands = output.split("\n").flatMap((line) => {
        if (line.trim().length === 0) return [];
        const match = /^\s*(-?\d+)\s+(\d+)\s+(.+)$/u.exec(line);
        if (!match) throw new Error("POSIX_PROCESS_RESULT_INVALID");
        const rowUid = Number(match[1]);
        const pid = Number(match[2]);
        if (!Number.isSafeInteger(rowUid) || !Number.isSafeInteger(pid) || pid <= 0)
          throw new Error("POSIX_PROCESS_RESULT_INVALID");
        return rowUid === uid && pid !== process.pid ? [match[3]!] : [];
      });
    }
    return { ...markProcessMatches(commands), profiles: "offline" };
  } catch (cause) {
    if (cause instanceof DirectFirstPublicError) throw cause;
    throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
  }
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
      !isPlainRecord(parsed) ||
      !exactKeys(parsed, ["createdAt", "pid", "token"]) ||
      !Number.isSafeInteger(parsed.pid) ||
      Number(parsed.pid) <= 0 ||
      typeof parsed.token !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(parsed.token) ||
      typeof parsed.createdAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.createdAt))
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

interface InspectedProfileLockOwner {
  readonly pid: number;
  readonly token: string;
  readonly dev: number;
  readonly ino: number;
  readonly size: number;
  readonly mtimeMs: number;
}

function readProfileLockOwner(path: string): InspectedProfileLockOwner {
  const before = FS.lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1)
    throw new Error("OWNER_NOT_STOPPED");
  const decoded: unknown = JSON.parse(FS.readFileSync(path, "utf8"));
  const after = FS.lstatSync(path);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    !isPlainRecord(decoded) ||
    !exactKeys(decoded, ["pid", "token"]) ||
    !Number.isSafeInteger(decoded.pid) ||
    Number(decoded.pid) <= 0 ||
    typeof decoded.token !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(decoded.token)
  ) throw new Error("OWNER_NOT_STOPPED");
  return {
    pid: Number(decoded.pid),
    token: decoded.token,
    dev: before.dev,
    ino: before.ino,
    size: before.size,
    mtimeMs: before.mtimeMs,
  };
}

function profileSingletonBlocks(
  profilePath: string,
  allowedToken?: string,
): boolean {
  const lock = Path.join(profilePath, "SingletonLock");
  if (!pathExists(lock)) return false;
  try {
    const first = readProfileLockOwner(lock);
    const second = readProfileLockOwner(lock);
    if (
      first.dev !== second.dev ||
      first.ino !== second.ino ||
      first.size !== second.size ||
      first.mtimeMs !== second.mtimeMs ||
      first.pid !== second.pid ||
      first.token !== second.token
    ) return true;
    if (
      allowedToken !== undefined &&
      first.pid === process.pid &&
      first.token === allowedToken
    ) return false;
    return ownerState(first.pid) !== "dead";
  } catch {
    return true;
  }
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
  | "package-rename-preflight"
  | "package-renamed"
  | "package-stage-absent"
  | "package-edge-preflight"
  | "package-entry-unlinked"
  | "package-directory-removed"
  | "package-tombstone-removed"
  | "profile-batch-committed"
  | "profile-reread"
  | "database-rename-preflight"
  | "database-unlinked"
  | "directory-fsynced";

export interface DirectFirstPublicTestHooks {
  readonly afterBoundary?: (
    boundary: DirectFirstPublicBoundary,
    target: string,
  ) => void;
  readonly witness?: DirectApplyWitnessPort;
}

export interface DirectApplyWitnessPort {
  readonly operation: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly barrier?: (
    barrierId: string,
    ordinal: number,
    replaceTarget?: () => void,
  ) => void;
}

async function applyOperation<Result>(
  witness: DirectApplyWitnessPort | undefined,
  operationId: string,
  ordinal: number | "single",
  effect: () => Result | Promise<Result>,
): Promise<Result> {
  witness?.operation(operationId, "before", ordinal);
  const result = await effect();
  witness?.operation(operationId, "after", ordinal);
  return result;
}

function applySyncOperation<Result>(
  witness: DirectApplyWitnessPort | undefined,
  operationId: string,
  ordinal: number | "single",
  effect: () => Result,
): Result {
  witness?.operation(operationId, "before", ordinal);
  const result = effect();
  witness?.operation(operationId, "after", ordinal);
  return result;
}

export interface DirectInspectWitnessPort {
  readonly operation: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly barrier?: (
    barrierId: string,
    ordinal: number,
    replaceTarget?: () => void,
  ) => void;
}

function inspectOperation<Result>(
  witness: DirectInspectWitnessPort | undefined,
  operationId: string,
  ordinal: number | "single",
  effect: () => Result,
): Result {
  witness?.operation(operationId, "before", ordinal);
  const result = effect();
  witness?.operation(operationId, "after", ordinal);
  return result;
}

interface InspectedAncestor {
  readonly requested: string;
  readonly existing: string;
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
  readonly realpath: string;
}

function inspectAncestor(path: string): Omit<InspectedAncestor, "realpath"> {
  let existing = path;
  while (!pathExists(existing)) {
    const parent = Path.dirname(existing);
    if (parent === existing) throw new Error("INSPECTION_UNSAFE");
    existing = parent;
  }
  const stat = FS.lstatSync(existing);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("INSPECTION_UNSAFE");
  return { requested: path, existing, dev: stat.dev, ino: stat.ino, mode: stat.mode };
}

function fixedInspectAncestors(canonicalHome: string): readonly string[] {
  return [
    OS.homedir(),
    canonicalHome,
    ...LANES.map((lane) => Path.join(canonicalHome, lane)),
    ...PROFILE_IDENTITIES.map((identity) => profileRoot(identity)),
    ...LANES.map((lane) => Path.join(canonicalHome, lane, "packages")),
  ];
}

function fixedInspectWitnessTargets(
  canonicalHome: string,
  plan: DirectFirstPublicPlan,
): readonly string[] {
  const databaseMembers = plan.targets
    .filter((target) => target.kind === "database")
    .map((target) => Path.join(canonicalHome, target.relativePathOrKey))
    .filter(pathExists)
    .slice(0, 3);
  const legacyProfiles = plan.profiles
    .filter((profile) => profile.v1 === "present" || profile.v2 === "present")
    .map((profile) => Path.join(profileRoot(profile.identity), "Local Storage", "leveldb"))
    .filter(pathExists)
    .slice(0, 2);
  const packageNodes: string[] = [];
  const packageTarget = plan.targets.find((target) =>
    target.kind === "package-stage" || target.kind === "package-tombstone");
  if (packageTarget !== undefined) {
    const laneRoot = Path.join(canonicalHome, packageTarget.laneOrProfile);
    const packageRoot = Path.join(laneRoot, "packages");
    const generationRoot = Path.join(canonicalHome, packageTarget.laneOrProfile, packageTarget.relativePathOrKey);
    const manifest = Path.join(generationRoot, "manifest.json");
    const executable = pathExists(generationRoot)
      ? FS.readdirSync(generationRoot)
          .map((name) => Path.join(generationRoot, name))
          .find((path) => Path.basename(path) !== "manifest.json" && pathExists(path))
      : undefined;
    for (const candidate of [
      Path.join(packageRoot, "state.json"),
      generationRoot,
      manifest,
      executable,
    ]) if (candidate !== undefined && pathExists(candidate)) packageNodes.push(candidate);
  }
  const profiles = PROFILE_IDENTITIES
    .map((identity) => Path.join(profileRoot(identity), "Local Storage", "leveldb"))
    .filter(pathExists);
  return [...databaseMembers, ...legacyProfiles, ...packageNodes.slice(0, 4), ...profiles].slice(0, 11);
}

function inspectWitnessTarget(
  path: string,
  ordinal: number,
  expectedDataChunks: number,
  chunkOffset: number,
  witness: DirectInspectWitnessPort,
): number {
  const before = FS.lstatSync(path);
  if (before.isSymbolicLink() || (before.isFile() && before.nlink !== 1))
    throw new Error("INSPECTION_UNSAFE");
  witness.barrier?.("inspect-target-to-open", ordinal);
  const flags = process.platform === "win32"
    ? FS.constants.O_RDONLY
    : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  witness.operation("inspect.open-target", "before", ordinal);
  const descriptor = FS.openSync(path, flags);
  try {
    witness.operation("inspect.open-target", "after", ordinal);
  } catch (cause) {
    FS.closeSync(descriptor);
    throw cause;
  }
  try {
    const opened = FS.fstatSync(descriptor);
    if (opened.dev !== before.dev || opened.ino !== before.ino)
      throw new Error("INSPECTION_UNSAFE");
    const bytes = before.isFile() ? FS.readFileSync(descriptor) : Buffer.alloc(0);
    for (let chunk = 0; chunk < expectedDataChunks; chunk += 1) {
      const start = Math.floor((bytes.length * chunk) / expectedDataChunks);
      const end = Math.floor((bytes.length * (chunk + 1)) / expectedDataChunks);
      inspectOperation(witness, "inspect.read-target-chunk", chunkOffset++, () => bytes.subarray(start, end));
    }
    inspectOperation(witness, "inspect.read-target-chunk", chunkOffset++, () => {
      if (before.isDirectory()) FS.readdirSync(path);
      return Buffer.alloc(0);
    });
    inspectOperation(witness, "inspect.sanitize-target-metadata", ordinal, () => ({
      mode: before.mode,
      size: before.size,
      sha256: before.isFile() ? sha256(bytes) : null,
    }));
  } finally {
    let injected: unknown;
    try {
      witness.operation("inspect.close-target", "before", ordinal);
    } catch (cause) {
      injected = cause;
    }
    FS.closeSync(descriptor);
    if (injected !== undefined) throw injected;
    witness.operation("inspect.close-target", "after", ordinal);
  }
  return chunkOffset;
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
  readonly executablePath: string;
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
  return { generation: manifest.generation, treeDigest, executablePath };
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
    readonly witness?: DirectInspectWitnessPort;
  },
): Promise<DirectFirstPublicPlan> {
  const witness = options?.witness;
  canonicalHome = inspectOperation(witness, "inspect.resolve-scope", "single", () => {
    validateDefaultRoot(canonicalHome);
    return canonicalHome;
  });
  const ancestorSeals = fixedInspectAncestors(canonicalHome).map((path, ordinal) => {
    const observed = inspectOperation(witness, "inspect.lstat-ancestor", ordinal, () =>
      inspectAncestor(path));
    const realpath = inspectOperation(witness, "inspect.realpath-ancestor", ordinal, () =>
      FS.realpathSync.native(observed.existing));
    witness?.barrier?.("inspect-ancestor-to-target-enumeration", ordinal);
    return { ...observed, realpath };
  });
  const initialQuiescence = stoppedProcesses();
  const processFields = ["desktop", "service", "nativeHost"] as const;
  const processStates = processFields.map((field, ordinal) => {
    const state = inspectOperation(witness, "inspect.probe-process", ordinal, () =>
      initialQuiescence[field]);
    witness?.barrier?.("inspect-process-identity-to-probe", ordinal);
    if (witness?.barrier !== undefined && stoppedProcesses()[field] !== state)
      throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
    return state;
  });
  const quiescence = {
    ...initialQuiescence,
    desktop: processStates[0]!,
    service: processStates[1]!,
    nativeHost: processStates[2]!,
  };
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
  witness?.operation("inspect.enumerate-targets", "before", "single");
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
  const result: DirectFirstPublicPlan = {
    format: PLAN_FORMAT,
    canonicalHome,
    quiescence,
    lanes,
    profiles,
    targets,
    protectedFacts,
    blockers,
  };
  witness?.operation("inspect.enumerate-targets", "after", "single");
  if (witness !== undefined) {
    const targets = fixedInspectWitnessTargets(canonicalHome, result);
    const chunkCounts = [2, 1, 1, 2, 1, 0, 1, 0, 1, 2, 2] as const;
    if (targets.length !== chunkCounts.length)
      throw new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
    let chunkOffset = 0;
    for (const [ordinal, target] of targets.entries())
      chunkOffset = inspectWitnessTarget(
        target,
        ordinal,
        chunkCounts[ordinal]!,
        chunkOffset,
        witness,
      );
  }
  for (const [ordinal, sealed] of ancestorSeals.entries()) {
    const rechecked = inspectOperation(witness, "inspect.recheck-ancestor", ordinal, () => {
      const observed = inspectAncestor(sealed.requested);
      return { ...observed, realpath: FS.realpathSync.native(observed.existing) };
    });
    if (JSON.stringify(rechecked) !== JSON.stringify(sealed))
      throw new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
  }
  return result;
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

interface ApplyWitnessPathSeal {
  readonly path: string;
  readonly dev: string;
  readonly ino: string;
  readonly mode: string;
  readonly size: string;
  readonly sha256: string;
}

function readApplyWitnessPath(
  path: string,
  ordinal: number,
  dataChunkCount: number,
  chunkOffset: { value: number },
  witness: DirectApplyWitnessPort,
  operationPrefix: "apply" = "apply",
): ApplyWitnessPathSeal {
  const stat = applySyncOperation(
    witness,
    `${operationPrefix}.lstat-target`,
    ordinal,
    () => FS.lstatSync(path, { bigint: true }),
  );
  if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()))
    throw new Error("DESTRUCTION_INCOMPLETE");
  const flags = process.platform === "win32"
    ? FS.constants.O_RDONLY
    : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  const descriptor = applySyncOperation(
    witness,
    `${operationPrefix}.open-target-hash`,
    ordinal,
    () => FS.openSync(path, flags),
  );
  const hash = createHash("sha256");
  try {
    if (stat.isFile()) {
      for (let chunk = 0; chunk < dataChunkCount; chunk += 1) {
        const start = Math.floor((Number(stat.size) * chunk) / dataChunkCount);
        const end = Math.floor((Number(stat.size) * (chunk + 1)) / dataChunkCount);
        applySyncOperation(
          witness,
          `${operationPrefix}.read-target-hash-chunk`,
          chunkOffset.value++,
          () => {
            const buffer = Buffer.alloc(end - start);
            const count = FS.readSync(descriptor, buffer, 0, buffer.length, start);
            if (count !== buffer.length) throw new Error("DESTRUCTION_INCOMPLETE");
            hash.update(buffer);
          },
        );
      }
    }
    applySyncOperation(
      witness,
      `${operationPrefix}.read-target-hash-chunk`,
      chunkOffset.value++,
      () => {
        if (stat.isFile()) {
          const eof = Buffer.alloc(1);
          if (FS.readSync(descriptor, eof, 0, 1, Number(stat.size)) !== 0)
            throw new Error("DESTRUCTION_INCOMPLETE");
        } else {
          FS.readdirSync(path);
        }
      },
    );
  } finally {
    let injected: unknown;
    try {
      witness.operation(`${operationPrefix}.close-target-hash`, "before", ordinal);
    } catch (cause) {
      injected = cause;
    }
    FS.closeSync(descriptor);
    if (injected !== undefined) throw injected;
    witness.operation(`${operationPrefix}.close-target-hash`, "after", ordinal);
  }
  return applySyncOperation(
    witness,
    `${operationPrefix}.seal-target`,
    ordinal,
    () => ({
      path,
      dev: stat.dev.toString(),
      ino: stat.ino.toString(),
      mode: stat.mode.toString(),
      size: stat.size.toString(),
      sha256: hash.digest("hex"),
    }),
  );
}

function assertApplyWitnessPathSeal(expected: ApplyWitnessPathSeal): void {
  const stat = FS.lstatSync(expected.path, { bigint: true });
  if (
    stat.dev.toString() !== expected.dev ||
    stat.ino.toString() !== expected.ino ||
    stat.mode.toString() !== expected.mode ||
    stat.size.toString() !== expected.size ||
    (stat.isFile() && hashFile(expected.path) !== expected.sha256)
  ) throw new Error("DESTRUCTION_INCOMPLETE");
}

function fixedApplyExclusions(canonicalHome: string): readonly string[] {
  return [
    Path.join(canonicalHome, "dev", "packages", "state.json"),
    Path.join(canonicalHome, "userdata", "packages", "state.json"),
    Path.join(profileRoot("omnimind-dev"), "Preferences"),
    Path.join(profileRoot("omnimind"), "Preferences"),
  ];
}

function readApplyExclusion(
  path: string,
  ordinal: number,
  dataChunkCount: number,
  chunkOffset: { value: number },
  witness: DirectApplyWitnessPort,
): ApplyWitnessPathSeal {
  const stat = applySyncOperation(witness, "apply.lstat-exclusion", ordinal, () =>
    FS.lstatSync(path, { bigint: true }));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const flags = process.platform === "win32"
    ? FS.constants.O_RDONLY
    : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  const descriptor = applySyncOperation(witness, "apply.open-exclusion", ordinal, () =>
    FS.openSync(path, flags));
  const hash = createHash("sha256");
  try {
    for (let chunk = 0; chunk < dataChunkCount; chunk += 1) {
      const start = Math.floor((Number(stat.size) * chunk) / dataChunkCount);
      const end = Math.floor((Number(stat.size) * (chunk + 1)) / dataChunkCount);
      applySyncOperation(
        witness,
        "apply.read-exclusion-hash-chunk",
        chunkOffset.value++,
        () => {
          const buffer = Buffer.alloc(end - start);
          const count = FS.readSync(descriptor, buffer, 0, buffer.length, start);
          if (count !== buffer.length) throw new Error("DESTRUCTION_INCOMPLETE");
          hash.update(buffer);
        },
      );
    }
    applySyncOperation(
      witness,
      "apply.read-exclusion-hash-chunk",
      chunkOffset.value++,
      () => {
        const eof = Buffer.alloc(1);
        if (FS.readSync(descriptor, eof, 0, 1, Number(stat.size)) !== 0)
          throw new Error("DESTRUCTION_INCOMPLETE");
      },
    );
  } finally {
    let injected: unknown;
    try {
      witness.operation("apply.close-exclusion", "before", ordinal);
    } catch (cause) {
      injected = cause;
    }
    FS.closeSync(descriptor);
    if (injected !== undefined) throw injected;
    witness.operation("apply.close-exclusion", "after", ordinal);
  }
  return {
    path,
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    mode: stat.mode.toString(),
    size: stat.size.toString(),
    sha256: hash.digest("hex"),
  };
}

interface PathIdentitySeal {
  readonly path: string;
  readonly dev: string;
  readonly ino: string;
  readonly mode: string;
  readonly nlink: string;
  readonly realpath: string;
}

interface DatabaseFileSeal {
  readonly dev: string;
  readonly ino: string;
  readonly size: string;
  readonly mtimeNs: string;
  readonly mode: string;
  readonly nlink: string;
  readonly sha256: string;
}

interface DatabaseTargetSeal extends DatabaseFileSeal {
  readonly relativePath: string;
  readonly ancestors: readonly PathIdentitySeal[];
}

function readAncestorSeal(canonicalHome: string, target: string): readonly PathIdentitySeal[] {
  const accountHome = OS.homedir();
  const relative = Path.relative(accountHome, Path.dirname(target));
  if (relative.startsWith("..") || Path.isAbsolute(relative))
    throw new Error("DESTRUCTION_INCOMPLETE");
  const paths = [accountHome];
  let current = accountHome;
  for (const member of relative.split(Path.sep).filter(Boolean)) {
    current = Path.join(current, member);
    paths.push(current);
  }
  if (!paths.includes(canonicalHome)) throw new Error("DESTRUCTION_INCOMPLETE");
  return paths.map((path) => {
    const stat = FS.lstatSync(path, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("DESTRUCTION_INCOMPLETE");
    return {
      path,
      dev: stat.dev.toString(),
      ino: stat.ino.toString(),
      mode: stat.mode.toString(),
      nlink: stat.nlink.toString(),
      realpath: FS.realpathSync.native(path),
    };
  });
}

function assertAncestorSeal(seal: { readonly ancestors: readonly PathIdentitySeal[] }): void {
  for (const expected of seal.ancestors) {
    const stat = FS.lstatSync(expected.path, { bigint: true });
    const current: PathIdentitySeal = {
      path: expected.path,
      dev: stat.dev.toString(),
      ino: stat.ino.toString(),
      mode: stat.mode.toString(),
      nlink: stat.nlink.toString(),
      realpath: FS.realpathSync.native(expected.path),
    };
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      current.path !== expected.path ||
      current.dev !== expected.dev ||
      current.ino !== expected.ino ||
      current.mode !== expected.mode ||
      current.realpath !== expected.realpath
    ) {
      throw new Error("DESTRUCTION_INCOMPLETE");
    }
  }
}

function readDatabaseFileSeal(target: string): DatabaseFileSeal {
  const before = FS.lstatSync(target, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    throw new Error("DESTRUCTION_INCOMPLETE");
  }
  const flags =
    process.platform === "win32"
      ? FS.constants.O_RDONLY
      : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  const descriptor = FS.openSync(target, flags);
  const hash = createHash("sha256");
  try {
    const opened = FS.fstatSync(descriptor, { bigint: true });
    if (opened.dev !== before.dev || opened.ino !== before.ino || !opened.isFile()) {
      throw new Error("DESTRUCTION_INCOMPLETE");
    }
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    while (true) {
      const count = FS.readSync(descriptor, buffer, 0, buffer.length, position);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
      position += count;
    }
  } finally {
    FS.closeSync(descriptor);
  }
  const after = FS.lstatSync(target, { bigint: true });
  if (
    after.dev !== before.dev ||
    after.ino !== before.ino ||
    after.size !== before.size ||
    after.mtimeNs !== before.mtimeNs ||
    after.mode !== before.mode ||
    after.nlink !== before.nlink
  ) {
    throw new Error("DESTRUCTION_INCOMPLETE");
  }
  return {
    dev: before.dev.toString(),
    ino: before.ino.toString(),
    size: before.size.toString(),
    mtimeNs: before.mtimeNs.toString(),
    mode: before.mode.toString(),
    nlink: before.nlink.toString(),
    sha256: hash.digest("hex"),
  };
}

function readDatabaseTargetSeal(canonicalHome: string, relativePath: string): DatabaseTargetSeal {
  const target = Path.join(canonicalHome, relativePath);
  return {
    relativePath,
    ancestors: readAncestorSeal(canonicalHome, target),
    ...readDatabaseFileSeal(target),
  };
}

function sameDatabaseFileSeal(expected: DatabaseFileSeal, current: DatabaseFileSeal): boolean {
  return (
    expected.dev === current.dev &&
    expected.ino === current.ino &&
    expected.size === current.size &&
    expected.mtimeNs === current.mtimeNs &&
    expected.mode === current.mode &&
    expected.nlink === current.nlink &&
    expected.sha256 === current.sha256
  );
}

function sealDatabaseTargets(
  canonicalHome: string,
  plan: DirectFirstPublicPlan,
): ReadonlyMap<string, DatabaseTargetSeal> {
  return new Map(
    plan.targets
      .filter((target) => target.action === "remove" && target.kind === "database")
      .map((target) => [
        target.relativePathOrKey,
        readDatabaseTargetSeal(canonicalHome, target.relativePathOrKey),
      ]),
  );
}

function removeDatabaseTarget(
  canonicalHome: string,
  seal: DatabaseTargetSeal,
  hooks?: DirectFirstPublicTestHooks,
  databaseOrdinal?: number,
): void {
  const relativePath = seal.relativePath;
  const target = Path.join(canonicalHome, relativePath);
  const parent = Path.dirname(target);
  assertAncestorSeal(seal);
  const current = readDatabaseTargetSeal(canonicalHome, relativePath);
  if (!sameDatabaseFileSeal(current, seal))
    throw new Error("DESTRUCTION_INCOMPLETE");
  const tombstone = Path.join(
    parent,
    `.${Path.basename(target)}.discarding-${randomUUID()}`,
  );
  if (pathExists(tombstone)) throw new Error("DESTRUCTION_INCOMPLETE");
  hooks?.afterBoundary?.("database-rename-preflight", relativePath);
  if (databaseOrdinal !== undefined)
    hooks?.witness?.barrier?.("apply-seal-to-database-unlink", databaseOrdinal);
  assertAncestorSeal(seal);
  FS.renameSync(target, tombstone);
  let removed = false;
  try {
    const moved = readDatabaseFileSeal(tombstone);
    if (!sameDatabaseFileSeal(seal, moved)) {
      assertAncestorSeal(seal);
      if (pathExists(target)) throw new Error("DESTRUCTION_INCOMPLETE");
      FS.renameSync(tombstone, target);
      fsyncDirectory(parent);
      throw new Error("DESTRUCTION_INCOMPLETE");
    }
    assertAncestorSeal(seal);
    if (!sameDatabaseFileSeal(seal, readDatabaseFileSeal(tombstone)))
      throw new Error("DESTRUCTION_INCOMPLETE");
    FS.unlinkSync(tombstone);
    removed = true;
    hooks?.afterBoundary?.("database-unlinked", relativePath);
    if (pathExists(target) || pathExists(tombstone))
      throw new Error("DESTRUCTION_INCOMPLETE");
    fsyncDirectory(parent, hooks);
  } finally {
    if (!removed && pathExists(tombstone) && !pathExists(target)) {
      assertAncestorSeal(seal);
      FS.renameSync(tombstone, target);
      fsyncDirectory(parent);
    }
  }
}

function completeApplyPathEdge(
  target: string,
  targetOrdinal: number,
  hooks: DirectFirstPublicTestHooks | undefined,
): void {
  applySyncOperation(
    hooks?.witness,
    "apply.fsync-target-parent",
    targetOrdinal,
    () => fsyncDirectory(Path.dirname(target)),
  );
  hooks?.witness?.barrier?.("apply-mutation-to-absence", targetOrdinal);
  applySyncOperation(
    hooks?.witness,
    "apply.verify-target-absent",
    targetOrdinal,
    () => {
      if (pathExists(target)) throw new Error("DESTRUCTION_INCOMPLETE");
    },
  );
}

interface PackageEntrySeal extends DatabaseFileSeal {
  readonly name: string;
}

interface PackageTargetSeal {
  readonly lane: Lane;
  readonly relativePath: string;
  readonly generation: string;
  readonly digest: string;
  readonly state: "full" | "manifest-only" | "empty";
  readonly ancestors: readonly PathIdentitySeal[];
  readonly directory: PathIdentitySeal;
  readonly lifecycleState: DatabaseFileSeal;
  readonly entries: readonly PackageEntrySeal[];
}

function readDirectorySeal(path: string): PathIdentitySeal {
  const stat = FS.lstatSync(path, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("DESTRUCTION_INCOMPLETE");
  return {
    path,
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    mode: stat.mode.toString(),
    nlink: stat.nlink.toString(),
    realpath: FS.realpathSync.native(path),
  };
}

function sameDirectoryIdentity(expected: PathIdentitySeal, path: string): boolean {
  const current = readDirectorySeal(path);
  return (
    expected.dev === current.dev &&
    expected.ino === current.ino &&
    expected.mode === current.mode
  );
}

function packageTargetKey(lane: Lane, relativePath: string): string {
  return `${lane}:${relativePath.replaceAll(Path.sep, "/")}`;
}

function readPackageTargetSeal(
  canonicalHome: string,
  target: TargetPlan,
): PackageTargetSeal {
  const lane = target.laneOrProfile as Lane;
  const relativePath = target.relativePathOrKey;
  const path = Path.join(canonicalHome, lane, relativePath);
  const packageRoot = Path.join(canonicalHome, lane, "packages");
  const statePath = Path.join(packageRoot, "state.json");
  const digest = /^(?:obsolete|duplicate|resume:(?:obsolete|duplicate)):([0-9a-f]{64})$/u.exec(
    target.classification,
  )?.[1];
  if (!digest) throw new Error("DESTRUCTION_INCOMPLETE");
  const generation =
    target.kind === "package-stage"
      ? Path.basename(path)
      : /^(.+)\.[0-9a-f]{64}$/u.exec(Path.basename(path))?.[1];
  if (!generation) throw new Error("DESTRUCTION_INCOMPLETE");
  const state =
    target.kind === "package-stage"
      ? "full"
      : validateRemainingTombstone(packageRoot, path, generation, digest);
  const names: string[] = [];
  if (state === "full") {
    const validated = validateClosedStage(packageRoot, path, generation);
    if (validated.treeDigest !== digest) throw new Error("DESTRUCTION_INCOMPLETE");
    names.push(validated.executablePath, "manifest.json");
  } else if (state === "manifest-only") {
    names.push("manifest.json");
  }
  const ancestry = readAncestorSeal(canonicalHome, Path.join(packageRoot, ".seal"));
  return {
    lane,
    relativePath,
    generation,
    digest,
    state,
    ancestors: ancestry.slice(0, -1),
    directory: readDirectorySeal(path),
    lifecycleState: readDatabaseFileSeal(statePath),
    entries: names.map((name) => ({ name, ...readDatabaseFileSeal(Path.join(path, name)) })),
  };
}

function sealPackageTargets(
  canonicalHome: string,
  plan: DirectFirstPublicPlan,
): ReadonlyMap<string, PackageTargetSeal> {
  return new Map(
    plan.targets
      .filter(
        (target) =>
          target.action === "remove" &&
          (target.kind === "package-stage" || target.kind === "package-tombstone"),
      )
      .map((target) => {
        const seal = readPackageTargetSeal(canonicalHome, target);
        return [packageTargetKey(seal.lane, seal.relativePath), seal];
      }),
  );
}

async function witnessApplyTargetSeals(
  canonicalHome: string,
  plan: DirectFirstPublicPlan,
  packageTargetSeals: ReadonlyMap<string, PackageTargetSeal>,
  witness: DirectApplyWitnessPort,
): Promise<readonly ApplyWitnessPathSeal[]> {
  const chunkCounts = [2, 1, 1, 2, 1, 1, 1, 0] as const;
  const targets: Array<{
    readonly path: string;
    readonly profile?: DirectFirstPublicPlan["profiles"][number];
  }> = plan.targets
    .filter((target) => target.action === "remove" && target.kind === "database")
    .map((target) => ({ path: Path.join(canonicalHome, target.relativePathOrKey) }));
  for (const profile of plan.profiles) {
    if (profile.v1 === "absent" && profile.v2 === "absent") continue;
    const source = Path.join(profileRoot(profile.identity), "Local Storage", "leveldb");
    targets.push({ path: source, profile });
  }
  for (const seal of packageTargetSeals.values()) {
    const directory = Path.join(canonicalHome, seal.lane, seal.relativePath);
    const executable = seal.entries.find((entry) => entry.name !== "manifest.json");
    if (executable) targets.push({ path: Path.join(directory, executable.name) });
    const manifest = seal.entries.find((entry) => entry.name === "manifest.json");
    if (manifest) targets.push({ path: Path.join(directory, manifest.name) });
    targets.push({ path: directory });
  }
  if (targets.length !== chunkCounts.length)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const chunkOffset = { value: 0 };
  const seals: ApplyWitnessPathSeal[] = [];
  for (const [ordinal, target] of targets.entries()) {
    if (target.profile !== undefined) {
      applySyncOperation(witness, "apply.lstat-target", ordinal, () => {
        const stat = FS.lstatSync(target.path);
        if (!stat.isDirectory() || stat.isSymbolicLink())
          throw new Error("DESTRUCTION_INCOMPLETE");
      });
      const observed = await applyOperation(
        witness,
        "apply.open-target-hash",
        ordinal,
        () => inspectProfileDraftKeys(
          target.profile!.identity,
          profileRoot(target.profile!.identity),
        ),
      );
      const values = [observed.v1, observed.v2] as const;
      for (let chunk = 0; chunk < chunkCounts[ordinal]!; chunk += 1)
        applySyncOperation(
          witness,
          "apply.read-target-hash-chunk",
          chunkOffset.value++,
          () => values[chunk]!,
        );
      applySyncOperation(
        witness,
        "apply.read-target-hash-chunk",
        chunkOffset.value++,
        () => null,
      );
      applySyncOperation(witness, "apply.close-target-hash", ordinal, () => undefined);
      applySyncOperation(witness, "apply.seal-target", ordinal, () => observed);
      continue;
    }
    seals.push(readApplyWitnessPath(
      target.path,
      ordinal,
      chunkCounts[ordinal]!,
      chunkOffset,
      witness,
    ));
  }
  return seals;
}

function assertPackageState(
  canonicalHome: string,
  seal: PackageTargetSeal,
  directory: string,
  names: readonly string[],
): void {
  assertAncestorSeal(seal);
  if (!sameDirectoryIdentity(seal.directory, directory))
    throw new Error("DESTRUCTION_INCOMPLETE");
  const statePath = Path.join(canonicalHome, seal.lane, "packages", "state.json");
  if (!sameDatabaseFileSeal(seal.lifecycleState, readDatabaseFileSeal(statePath)))
    throw new Error("DESTRUCTION_INCOMPLETE");
  if (FS.readdirSync(directory).sort().join("\0") !== [...names].sort().join("\0"))
    throw new Error("DESTRUCTION_INCOMPLETE");
  for (const name of names) {
    const expected = seal.entries.find((entry) => entry.name === name);
    if (!expected || !sameDatabaseFileSeal(expected, readDatabaseFileSeal(Path.join(directory, name))))
      throw new Error("DESTRUCTION_INCOMPLETE");
  }
}

function removeSealedPackageEntry(
  canonicalHome: string,
  seal: PackageTargetSeal,
  directory: string,
  name: string,
  remainingBefore: readonly string[],
  hooks?: DirectFirstPublicTestHooks,
  transitionOrdinal?: number,
  targetOrdinal?: number,
): void {
  assertPackageState(canonicalHome, seal, directory, remainingBefore);
  const target = Path.join(directory, name);
  hooks?.afterBoundary?.("package-edge-preflight", target);
  if (transitionOrdinal !== undefined)
    hooks?.witness?.barrier?.("apply-seal-to-package-transition", transitionOrdinal);
  if (transitionOrdinal !== undefined)
    hooks?.witness?.operation("apply.transition-package-node", "before", transitionOrdinal);
  assertPackageState(canonicalHome, seal, directory, remainingBefore);
  const tombstone = Path.join(directory, `.${name}.discarding-${randomUUID()}`);
  FS.renameSync(target, tombstone);
  let removed = false;
  try {
    const expected = seal.entries.find((entry) => entry.name === name);
    if (!expected || !sameDatabaseFileSeal(expected, readDatabaseFileSeal(tombstone))) {
      if (pathExists(target)) throw new Error("DESTRUCTION_INCOMPLETE");
      FS.renameSync(tombstone, target);
      throw new Error("DESTRUCTION_INCOMPLETE");
    }
    assertAncestorSeal(seal);
    FS.unlinkSync(tombstone);
    removed = true;
    hooks?.afterBoundary?.("package-entry-unlinked", target);
    if (transitionOrdinal !== undefined)
      hooks?.witness?.operation("apply.transition-package-node", "after", transitionOrdinal);
  } finally {
    if (!removed && pathExists(tombstone) && !pathExists(target))
      FS.renameSync(tombstone, target);
  }
  if (targetOrdinal !== undefined) completeApplyPathEdge(target, targetOrdinal, hooks);
}

function removeClosedStage(
  canonicalHome: string,
  seal: PackageTargetSeal,
  directory: string,
  hooks?: DirectFirstPublicTestHooks,
  transitionOffset?: number,
  targetOffset?: number,
): void {
  const executable = seal.entries.find((entry) => entry.name !== "manifest.json")?.name;
  if (!executable) throw new Error("DESTRUCTION_INCOMPLETE");
  removeSealedPackageEntry(
    canonicalHome,
    seal,
    directory,
    executable,
    [executable, "manifest.json"],
    hooks,
    transitionOffset,
    targetOffset,
  );
  removeSealedPackageEntry(
    canonicalHome,
    seal,
    directory,
    "manifest.json",
    ["manifest.json"],
    hooks,
    transitionOffset === undefined ? undefined : transitionOffset + 1,
    targetOffset === undefined ? undefined : targetOffset + 1,
  );
  assertPackageState(canonicalHome, seal, directory, []);
  hooks?.afterBoundary?.("package-edge-preflight", directory);
  if (transitionOffset !== undefined) {
    hooks?.witness?.barrier?.("apply-seal-to-package-transition", transitionOffset + 2);
    hooks?.witness?.operation("apply.transition-package-node", "before", transitionOffset + 2);
  }
  assertPackageState(canonicalHome, seal, directory, []);
  FS.rmdirSync(directory);
  hooks?.afterBoundary?.("package-directory-removed", directory);
  if (transitionOffset !== undefined)
    hooks?.witness?.operation("apply.transition-package-node", "after", transitionOffset + 2);
  if (targetOffset !== undefined) completeApplyPathEdge(directory, targetOffset + 2, hooks);
}

function removePackageTombstone(
  canonicalHome: string,
  lane: Lane,
  relativePath: string,
  seal: PackageTargetSeal,
  hooks?: DirectFirstPublicTestHooks,
): void {
  const root = Path.join(canonicalHome, lane, "packages");
  const target = Path.join(canonicalHome, lane, relativePath);
  const discarding = Path.join(root, ".discarding");
  if (Path.dirname(target) !== discarding)
    throw new Error("DESTRUCTION_INCOMPLETE");
  if (seal.relativePath !== relativePath || seal.lane !== lane)
    throw new Error("DESTRUCTION_INCOMPLETE");
  if (seal.state === "full") {
    removeClosedStage(canonicalHome, seal, target, hooks, hooks?.witness ? 0 : undefined, hooks?.witness ? 5 : undefined);
  } else {
    if (seal.state === "manifest-only") {
      removeSealedPackageEntry(
        canonicalHome,
        seal,
        target,
        "manifest.json",
        ["manifest.json"],
        hooks,
        hooks?.witness ? 0 : undefined,
        hooks?.witness ? 5 : undefined,
      );
    }
    assertPackageState(canonicalHome, seal, target, []);
    hooks?.afterBoundary?.("package-edge-preflight", target);
    if (hooks?.witness) {
      const ordinal = seal.state === "manifest-only" ? 1 : 0;
      hooks.witness.barrier?.("apply-seal-to-package-transition", ordinal);
      hooks.witness.operation("apply.transition-package-node", "before", ordinal);
    }
    assertPackageState(canonicalHome, seal, target, []);
    FS.rmdirSync(target);
    hooks?.afterBoundary?.("package-directory-removed", target);
    if (hooks?.witness) {
      const ordinal = seal.state === "manifest-only" ? 1 : 0;
      hooks.witness.operation("apply.transition-package-node", "after", ordinal);
      completeApplyPathEdge(target, seal.state === "manifest-only" ? 6 : 5, hooks);
    }
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
  seal: PackageTargetSeal,
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
  const digest = seal.digest;
  if (seal.relativePath !== relativePath || seal.lane !== lane || seal.state !== "full")
    throw new Error("DESTRUCTION_INCOMPLETE");
  const tombstone = Path.join(
    discarding,
    `${Path.basename(stageChild)}.${digest}`,
  );
  if (pathExists(tombstone)) throw new Error("DESTRUCTION_INCOMPLETE");
  assertPackageState(canonicalHome, seal, stageChild, seal.entries.map((entry) => entry.name));
  hooks?.afterBoundary?.("package-rename-preflight", relativePath);
  assertPackageState(canonicalHome, seal, stageChild, seal.entries.map((entry) => entry.name));
  FS.renameSync(stageChild, tombstone);
  let restored = false;
  try {
    assertPackageState(canonicalHome, seal, tombstone, seal.entries.map((entry) => entry.name));
  } catch (cause) {
    if (!pathExists(stageChild) && pathExists(tombstone)) {
      FS.renameSync(tombstone, stageChild);
      restored = true;
    }
    throw cause;
  }
  if (restored) throw new Error("DESTRUCTION_INCOMPLETE");
  hooks?.afterBoundary?.("package-renamed", relativePath);
  if (pathExists(stageChild)) throw new Error("DESTRUCTION_INCOMPLETE");
  hooks?.afterBoundary?.("package-stage-absent", relativePath);
  fsyncDirectory(stage, hooks);
  fsyncDirectory(discarding, hooks);
  removeClosedStage(
    canonicalHome,
    seal,
    tombstone,
    hooks,
    hooks?.witness ? 0 : undefined,
    hooks?.witness ? 5 : undefined,
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
    canonicalHome = await applyOperation(
      hooks?.witness,
      "apply.resolve-scope",
      "single",
      () => {
        validateDefaultRoot(canonicalHome, canonicalHome);
        return canonicalHome;
      },
    );
    return await withProductTruthDatabaseLocks(
      canonicalHome,
      async (locks) => {
        profileLocks.push(...locks.profileLocks);
        databaseLocks.push(...locks.databaseLocks);
        phase = "inspection";
    validateDefaultRoot(canonicalHome, canonicalHome);
    const databaseLockTokens = new Map(
      databaseLocks.map((lock) => [lock.databasePath, lock.token]),
    );
    const profileLockTokens = new Map(
      profileLocks.map((lock) => [Path.dirname(lock.path), lock.token]),
    );
    const lockOptions = { databaseLockTokens, profileLockTokens };
    let plan = await inspectDirectFirstPublic(canonicalHome, lockOptions);
    if (plan.blockers.length)
      throw new DirectFirstPublicError(4, "CLASSIFICATION_BLOCKED");
    const databaseTargetSeals = sealDatabaseTargets(canonicalHome, plan);
    const packageTargetSeals = sealPackageTargets(canonicalHome, plan);
    const sealedPlan = await inspectDirectFirstPublic(canonicalHome, lockOptions);
    if (
      sealedPlan.blockers.length ||
      JSON.stringify(sealedPlan) !== JSON.stringify(plan)
    ) {
      throw new DirectFirstPublicError(6, "DESTRUCTION_INCOMPLETE");
    }
    plan = sealedPlan;
    let applyWitnessSeals: readonly ApplyWitnessPathSeal[] = [];
    let exclusionSeals: readonly ApplyWitnessPathSeal[] = [];
    if (hooks?.witness !== undefined) {
      applyWitnessSeals = await witnessApplyTargetSeals(
        canonicalHome,
        plan,
        packageTargetSeals,
        hooks.witness,
      );
      const exclusionChunkOffset = { value: 0 };
      exclusionSeals = fixedApplyExclusions(canonicalHome).map((path, ordinal) =>
        readApplyExclusion(
          path,
          ordinal,
          [2, 1, 1, 1][ordinal]!,
          exclusionChunkOffset,
          hooks.witness!,
        ));
    }
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
      const packageSeal = packageTargetSeals.get(
        packageTargetKey(target.laneOrProfile as Lane, target.relativePathOrKey),
      );
      if (!packageSeal) throw new Error("DESTRUCTION_INCOMPLETE");
      if (target.kind === "package-stage")
        removePackageStage(
          canonicalHome,
          target.laneOrProfile as Lane,
          target,
          packageSeal,
          hooks,
        );
      else
        removePackageTombstone(
          canonicalHome,
          target.laneOrProfile as Lane,
          target.relativePathOrKey,
          packageSeal,
          hooks,
        );
    }
    for (const identity of PROFILE_IDENTITIES) {
      assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
      const profilePlan = plan.profiles.find((profile) => profile.identity === identity);
      const legacyOrdinal = plan.profiles
        .filter((profile) => profile.v1 === "present" || profile.v2 === "present")
        .findIndex((profile) => profile.identity === identity);
      const profileWitness = hooks?.witness !== undefined && legacyOrdinal >= 0
        ? {
            operation: (
              operationId: string,
              site: "before" | "after",
            ) => {
              if (operationId !== "profile-delete.atomic-batch") return;
              hooks.witness!.operation(
                "apply.remove-legacy-file",
                site,
                legacyOrdinal,
              );
            },
            barrier: (barrierId: string) => {
              if (barrierId === "profile-delete-seal-to-batch")
                hooks.witness!.barrier?.(
                  "apply-seal-to-file-remove",
                  legacyOrdinal,
                );
            },
          }
        : undefined;
      const profileAfter = await deleteLegacyProfileDraftKeys(
        identity,
        profileRoot(identity),
        hooks?.afterBoundary,
        profileWitness,
      );
      if (hooks?.witness !== undefined && legacyOrdinal >= 0) {
        const targetOrdinal = 3 + legacyOrdinal;
        const levelDirectory = Path.join(profileRoot(identity), "Local Storage", "leveldb");
        applySyncOperation(
          hooks.witness,
          "apply.fsync-target-parent",
          targetOrdinal,
          () => fsyncDirectory(levelDirectory),
        );
        hooks.witness.barrier?.("apply-mutation-to-absence", targetOrdinal);
        const verifiedProfile = await applyOperation(
          hooks.witness,
          "apply.verify-target-absent",
          targetOrdinal,
          () => inspectProfileDraftKeys(identity, profileRoot(identity)),
        );
        if (
          profilePlan === undefined ||
          profileAfter.v1 !== "absent" ||
          profileAfter.v2 !== "absent" ||
          verifiedProfile.v1 !== "absent" ||
          verifiedProfile.v2 !== "absent"
        ) throw new Error("DESTRUCTION_INCOMPLETE");
      }
    }
    let databaseOrdinal = 0;
    for (const target of plan.targets.filter(
      (candidate) =>
        candidate.action === "remove" && candidate.kind === "database",
    )) {
      assertInvocationLocks(canonicalHome, profileLocks, databaseLocks);
      const seal = databaseTargetSeals.get(target.relativePathOrKey);
      if (!seal) throw new Error("DESTRUCTION_INCOMPLETE");
      const selectedDatabaseOrdinal = databaseOrdinal++;
      await applyOperation(
        hooks?.witness,
        "apply.unlink-database-member",
        selectedDatabaseOrdinal,
        () => removeDatabaseTarget(
          canonicalHome,
          seal,
          hooks,
          hooks?.witness ? selectedDatabaseOrdinal : undefined,
        ),
      );
      if (hooks?.witness !== undefined)
        completeApplyPathEdge(
          Path.join(canonicalHome, target.relativePathOrKey),
          selectedDatabaseOrdinal,
          hooks,
        );
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
    for (const [ordinal, exclusion] of exclusionSeals.entries())
      applySyncOperation(
        hooks?.witness,
        "apply.verify-exclusion-hash",
        ordinal,
        () => assertApplyWitnessPathSeal(exclusion),
      );
    for (const seal of applyWitnessSeals) {
      if (pathExists(seal.path)) throw new Error("DESTRUCTION_INCOMPLETE");
    }
        return finalPlan;
      },
      (kind, identity) =>
        hooks?.afterBoundary?.(
          kind === "profile" ? "profile-lock-acquired" : "database-lock-acquired",
          identity,
        ),
    );
  } catch (cause) {
    if (cause instanceof DirectFirstPublicError) throw cause;
    if ((cause as Error).message?.startsWith("PORT_FAULT:")) throw cause;
    if ((cause as Error).message === "DESTRUCTION_INCOMPLETE")
      throw new DirectFirstPublicError(6, "DESTRUCTION_INCOMPLETE");
    if (phase === "locks")
      throw new DirectFirstPublicError(3, "OWNER_NOT_STOPPED");
    if (phase === "inspection")
      throw new DirectFirstPublicError(5, "INSPECTION_UNSAFE");
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

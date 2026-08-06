import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import type {
  NativeHostPackageArtifact,
  NativeHostPackageLoadReport,
} from "@omnimind/contracts/native-host";

export const CURATED_PI_PACKAGE_GENERATION =
  "pi.todo@0.81.1+e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2";
export const EMPTY_PI_PACKAGE_GENERATION = "pi-runtime-0.81.1-package-empty";
const CURATED_EXECUTABLE_SHA256 =
  "e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2";
const CURATED_NOTICE_SHA256 = "0457f5bcec3b3b211605dfb5d1a49042fd638f3686a410fe099c24a25af13c48";
const PACKAGE_STATE_VERSION = 1;

const curatedManifest = {
  schemaVersion: 1,
  id: "pi.todo",
  version: "0.81.1",
  generation: CURATED_PI_PACKAGE_GENERATION,
  runtime: {
    engine: "pi",
    version: "0.81.1",
    compatibility: "native-headless",
  },
  executable: {
    path: "todo.ts",
    sha256: CURATED_EXECUTABLE_SHA256,
    bytes: 8848,
  },
  source: {
    npmPackage: "@earendil-works/pi-coding-agent",
    npmVersion: "0.81.1",
    npmIntegrity:
      "sha512-r6ovAsZOgAqbC/aU6s+/dPnv/sGZBuWyZNvi3pXjpbuX5wvp3XvGkQI7/VLvX2o9XpmpFaPUxKNym1WfkN/P8A==",
    npmTarballSha256: "420113c0282160e6181656fd16cf18742f76bf9040ee3dfb9cb67e3e6ad5641c",
    repository: "https://github.com/earendil-works/pi.git",
    revision: "20be4b18d4c57487f8993d2762bace129f0cf7c6",
    repositoryPath: "packages/coding-agent/examples/extensions/todo.ts",
    artifactPath: "package/examples/extensions/todo.ts",
  },
  rights: {
    license: "MIT",
    noticePath: "../../licenses/pi-MIT.txt",
    normalizedNoticeSha256: CURATED_NOTICE_SHA256,
  },
  trust: {
    decision: "curated-exact-source",
    reviewedPermissions: {
      credentials: false,
      filesystem: false,
      network: false,
      process: false,
    },
    isolation: "process-boundary-not-sandbox",
  },
  surfaces: {
    headlessTool: "native",
    tuiCommand: "unsupported",
  },
} as const;

interface ValidatedGeneration {
  readonly artifact: NativeHostPackageArtifact;
  readonly report: NativeHostPackageLoadReport;
  readonly validatedAt: string;
}

interface PackageQuarantineRecord {
  readonly code: string;
  readonly observedAt: string;
}

interface PackageLifecycleState {
  readonly version: 1;
  readonly currentGeneration: string | null;
  readonly lastKnownGoodGeneration: string | null;
  readonly validatedGenerations: Record<string, ValidatedGeneration>;
  readonly quarantinedGenerations: Record<string, PackageQuarantineRecord>;
}

export interface PiPackageLifecycleSnapshot {
  readonly currentGeneration: string | null;
  readonly lastKnownGoodGeneration: string | null;
  readonly quarantinedGenerations: ReadonlyArray<string>;
}

export interface CuratedPiPackageEvidencePaths {
  readonly packageDirectory: string;
  readonly noticePath: string;
}

export class PiPackageLifecycleError extends Error {
  readonly code:
    | "PACKAGE_SOURCE_INVALID"
    | "PACKAGE_STAGE_CONFLICT"
    | "PACKAGE_STATE_INVALID"
    | "PACKAGE_GENERATION_CONFLICT"
    | "PACKAGE_GENERATION_NOT_VALIDATED"
    | "PACKAGE_GENERATION_QUARANTINED"
    | "PACKAGE_GENERATION_STALE"
    | "PACKAGE_ACTIVATION_LEASED"
    | "PACKAGE_NATIVE_VALIDATION_FAILED";

  constructor(code: PiPackageLifecycleError["code"], message: string) {
    super(message);
    this.name = "PiPackageLifecycleError";
    this.code = code;
  }
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizedNoticeDigest(bytes: Buffer): string {
  return sha256(bytes.toString("utf8").replace(/\r\n/gu, "\n").trimEnd());
}

function assertRegularFile(filePath: string, code: PiPackageLifecycleError["code"]): void {
  try {
    const stat = lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
  } catch {
    throw new PiPackageLifecycleError(code, "Package evidence must be a regular non-symlink file.");
  }
}

function assertDirectory(directoryPath: string, code: PiPackageLifecycleError["code"]): void {
  try {
    const stat = lstatSync(directoryPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("not a directory");
  } catch {
    throw new PiPackageLifecycleError(code, "Package stage must be a real non-symlink directory.");
  }
}

function emptyState(): PackageLifecycleState {
  return {
    version: PACKAGE_STATE_VERSION,
    currentGeneration: EMPTY_PI_PACKAGE_GENERATION,
    lastKnownGoodGeneration: EMPTY_PI_PACKAGE_GENERATION,
    validatedGenerations: {},
    quarantinedGenerations: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: ReadonlyArray<string>): boolean {
  const observed = Object.keys(value).toSorted();
  return isDeepStrictEqual(observed, [...keys].toSorted());
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function decodeArtifact(value: unknown): NativeHostPackageArtifact {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "generation",
      "stagePath",
      "manifestSha256",
      "executablePath",
      "executableSha256",
      "executableBytes",
    ]) ||
    typeof value.generation !== "string" ||
    value.generation.length === 0 ||
    value.generation.length > 256 ||
    typeof value.stagePath !== "string" ||
    !path.isAbsolute(value.stagePath) ||
    typeof value.executablePath !== "string" ||
    value.executablePath.length === 0 ||
    value.executablePath.includes("/") ||
    value.executablePath.includes("\\") ||
    !isSha256(value.manifestSha256) ||
    !isSha256(value.executableSha256) ||
    !Number.isSafeInteger(value.executableBytes) ||
    Number(value.executableBytes) <= 0
  ) {
    throw new PiPackageLifecycleError(
      "PACKAGE_STATE_INVALID",
      "Validated Package artifact is invalid.",
    );
  }
  return {
    generation: value.generation,
    stagePath: value.stagePath,
    manifestSha256: value.manifestSha256,
    executablePath: value.executablePath,
    executableSha256: value.executableSha256,
    executableBytes: Number(value.executableBytes),
  };
}

function decodeLoadReport(value: unknown): NativeHostPackageLoadReport {
  const names = (candidate: unknown): candidate is string[] =>
    Array.isArray(candidate) &&
    candidate.length <= 256 &&
    candidate.every((item) => typeof item === "string" && item.length > 0 && item.length <= 256);
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["extensionCount", "toolNames", "commandNames", "lifecycleEvents"]) ||
    !Number.isSafeInteger(value.extensionCount) ||
    Number(value.extensionCount) < 0 ||
    !names(value.toolNames) ||
    !names(value.commandNames) ||
    !names(value.lifecycleEvents)
  ) {
    throw new PiPackageLifecycleError(
      "PACKAGE_STATE_INVALID",
      "Validated Package report is invalid.",
    );
  }
  return {
    extensionCount: Number(value.extensionCount),
    toolNames: [...value.toolNames],
    commandNames: [...value.commandNames],
    lifecycleEvents: [...value.lifecycleEvents],
  };
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
}

function decodeState(value: unknown): PackageLifecycleState {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "currentGeneration",
      "lastKnownGoodGeneration",
      "validatedGenerations",
      "quarantinedGenerations",
    ]) ||
    value.version !== PACKAGE_STATE_VERSION
  ) {
    throw new PiPackageLifecycleError(
      "PACKAGE_STATE_INVALID",
      "Package lifecycle state is invalid.",
    );
  }
  const nullableGeneration = (candidate: unknown) =>
    candidate === null || typeof candidate === "string";
  if (
    !nullableGeneration(value.currentGeneration) ||
    !nullableGeneration(value.lastKnownGoodGeneration) ||
    !isRecord(value.validatedGenerations) ||
    !isRecord(value.quarantinedGenerations)
  ) {
    throw new PiPackageLifecycleError(
      "PACKAGE_STATE_INVALID",
      "Package lifecycle state is invalid.",
    );
  }
  const validatedGenerations: Record<string, ValidatedGeneration> = {};
  for (const [generation, raw] of Object.entries(value.validatedGenerations)) {
    if (
      !generation ||
      !isRecord(raw) ||
      !hasExactKeys(raw, ["artifact", "report", "validatedAt"]) ||
      !validTimestamp(raw.validatedAt)
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STATE_INVALID",
        "Validated Package state is invalid.",
      );
    }
    const artifact = decodeArtifact(raw.artifact);
    if (artifact.generation !== generation) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STATE_INVALID",
        "Validated Package identity is invalid.",
      );
    }
    validatedGenerations[generation] = {
      artifact,
      report: decodeLoadReport(raw.report),
      validatedAt: raw.validatedAt,
    };
  }
  const quarantinedGenerations: Record<string, PackageQuarantineRecord> = {};
  for (const [generation, raw] of Object.entries(value.quarantinedGenerations)) {
    if (
      generation === EMPTY_PI_PACKAGE_GENERATION ||
      !validatedGenerations[generation] ||
      !isRecord(raw) ||
      !hasExactKeys(raw, ["code", "observedAt"]) ||
      typeof raw.code !== "string" ||
      raw.code.length === 0 ||
      raw.code.length > 256 ||
      !validTimestamp(raw.observedAt)
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STATE_INVALID",
        "Package quarantine state is invalid.",
      );
    }
    quarantinedGenerations[generation] = { code: raw.code, observedAt: raw.observedAt };
  }
  const currentGeneration = value.currentGeneration as string | null;
  const lastKnownGoodGeneration = value.lastKnownGoodGeneration as string | null;
  for (const generation of [currentGeneration, lastKnownGoodGeneration]) {
    if (
      generation !== null &&
      generation !== EMPTY_PI_PACKAGE_GENERATION &&
      !validatedGenerations[generation]
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STATE_INVALID",
        "Package generation reference is invalid.",
      );
    }
  }
  if (currentGeneration && quarantinedGenerations[currentGeneration]) {
    throw new PiPackageLifecycleError(
      "PACKAGE_STATE_INVALID",
      "Current Package generation is quarantined.",
    );
  }
  return {
    version: PACKAGE_STATE_VERSION,
    currentGeneration,
    lastKnownGoodGeneration,
    validatedGenerations,
    quarantinedGenerations,
  };
}

function writeStateAtomically(statePath: string, state: PackageLifecycleState): void {
  const temporary = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
  const contents = `${JSON.stringify(state)}\n`;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeSync(descriptor, contents, undefined, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    renameSync(temporary, statePath);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    rmSync(temporary, { force: true });
  }
}

function readCuratedEvidence(input: {
  readonly packageDirectory: string;
  readonly noticePath: string;
}): {
  readonly manifestBytes: Buffer;
  readonly executableBytes: Buffer;
  readonly noticeBytes: Buffer;
} {
  const manifestPath = path.join(input.packageDirectory, "manifest.json");
  const executablePath = path.join(input.packageDirectory, "todo.ts");
  assertDirectory(input.packageDirectory, "PACKAGE_SOURCE_INVALID");
  assertRegularFile(manifestPath, "PACKAGE_SOURCE_INVALID");
  assertRegularFile(executablePath, "PACKAGE_SOURCE_INVALID");
  assertRegularFile(input.noticePath, "PACKAGE_SOURCE_INVALID");
  const manifestBytes = readFileSync(manifestPath);
  const executableBytes = readFileSync(executablePath);
  const noticeBytes = readFileSync(input.noticePath);
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new PiPackageLifecycleError(
      "PACKAGE_SOURCE_INVALID",
      "Curated Package manifest is invalid.",
    );
  }
  if (
    !isDeepStrictEqual(manifest, curatedManifest) ||
    executableBytes.byteLength !== curatedManifest.executable.bytes ||
    sha256(executableBytes) !== curatedManifest.executable.sha256 ||
    normalizedNoticeDigest(noticeBytes) !== curatedManifest.rights.normalizedNoticeSha256
  ) {
    throw new PiPackageLifecycleError(
      "PACKAGE_SOURCE_INVALID",
      "Curated Package source, rights, trust or compatibility evidence did not match.",
    );
  }
  return { manifestBytes, executableBytes, noticeBytes };
}

export function resolveCuratedPiPackageEvidence(
  options: {
    readonly applicationRoot?: string;
    readonly moduleUrl?: string;
  } = {},
): CuratedPiPackageEvidencePaths {
  const applicationRoot = options.applicationRoot?.trim();
  if (applicationRoot && !path.isAbsolute(applicationRoot)) {
    throw new PiPackageLifecycleError(
      "PACKAGE_SOURCE_INVALID",
      "The application root for curated Package evidence must be absolute.",
    );
  }
  const moduleDirectory = path.dirname(fileURLToPath(options.moduleUrl ?? import.meta.url));
  const roots = applicationRoot
    ? [path.resolve(applicationRoot)]
    : [path.resolve(moduleDirectory, "../../../../"), path.resolve(moduleDirectory, "../../../")];
  for (const root of roots) {
    const packageDirectory = path.join(root, "assets", "packages", "pi-todo-0.81.1");
    const noticePath = path.join(root, "assets", "licenses", "pi-MIT.txt");
    if (existsSync(packageDirectory) && existsSync(noticePath)) {
      return { packageDirectory, noticePath };
    }
  }
  throw new PiPackageLifecycleError(
    "PACKAGE_SOURCE_INVALID",
    "Curated Package evidence is unavailable beside the application root.",
  );
}

export class PiPackageLifecycle {
  readonly #packageRoot: string;
  readonly #stageRoot: string;
  readonly #statePath: string;
  #state: PackageLifecycleState;

  constructor(options: { readonly stateDir: string }) {
    this.#packageRoot = path.join(options.stateDir, "packages");
    this.#stageRoot = path.join(this.#packageRoot, "stage");
    this.#statePath = path.join(this.#packageRoot, "state.json");
    mkdirSync(this.#stageRoot, { recursive: true, mode: 0o700 });
    assertDirectory(this.#packageRoot, "PACKAGE_STATE_INVALID");
    assertDirectory(this.#stageRoot, "PACKAGE_STATE_INVALID");
    if (!existsSync(this.#statePath)) {
      this.#state = emptyState();
      this.#persist();
      return;
    }
    assertRegularFile(this.#statePath, "PACKAGE_STATE_INVALID");
    try {
      this.#state = decodeState(JSON.parse(readFileSync(this.#statePath, "utf8")));
    } catch (cause) {
      if (cause instanceof PiPackageLifecycleError) throw cause;
      throw new PiPackageLifecycleError(
        "PACKAGE_STATE_INVALID",
        "Package lifecycle state is invalid.",
      );
    }
    for (const validated of Object.values(this.#state.validatedGenerations)) {
      this.#assertArtifact(validated.artifact);
    }
  }

  #persist(): void {
    writeStateAtomically(this.#statePath, this.#state);
  }

  snapshot(): PiPackageLifecycleSnapshot {
    return {
      currentGeneration: this.#state.currentGeneration,
      lastKnownGoodGeneration: this.#state.lastKnownGoodGeneration,
      quarantinedGenerations: Object.keys(this.#state.quarantinedGenerations).toSorted(),
    };
  }

  stageCurated(input: {
    readonly packageDirectory: string;
    readonly noticePath: string;
  }): NativeHostPackageArtifact {
    const evidence = readCuratedEvidence(input);
    const target = path.join(this.#stageRoot, CURATED_PI_PACKAGE_GENERATION);
    const executablePath = curatedManifest.executable.path;
    const noticeDirectory = path.join(this.#packageRoot, "licenses");
    const stagedNoticePath = path.join(noticeDirectory, "pi-MIT.txt");
    const artifact: NativeHostPackageArtifact = {
      generation: CURATED_PI_PACKAGE_GENERATION,
      stagePath: target,
      manifestSha256: sha256(evidence.manifestBytes),
      executablePath,
      executableSha256: curatedManifest.executable.sha256,
      executableBytes: curatedManifest.executable.bytes,
    };

    if (existsSync(target)) {
      this.#assertArtifact(artifact);
      assertRegularFile(stagedNoticePath, "PACKAGE_STAGE_CONFLICT");
      if (!readFileSync(stagedNoticePath).equals(evidence.noticeBytes)) {
        throw new PiPackageLifecycleError(
          "PACKAGE_STAGE_CONFLICT",
          "The immutable Package notice does not match the curated evidence.",
        );
      }
      return artifact;
    }

    mkdirSync(noticeDirectory, { recursive: true, mode: 0o700 });
    if (existsSync(stagedNoticePath)) {
      assertRegularFile(stagedNoticePath, "PACKAGE_STAGE_CONFLICT");
      if (!readFileSync(stagedNoticePath).equals(evidence.noticeBytes)) {
        throw new PiPackageLifecycleError(
          "PACKAGE_STAGE_CONFLICT",
          "The immutable Package notice does not match the curated evidence.",
        );
      }
    } else {
      writeFileSync(stagedNoticePath, evidence.noticeBytes, { flag: "wx", mode: 0o400 });
      if (process.platform !== "win32") chmodSync(stagedNoticePath, 0o400);
    }

    const temporary = path.join(
      this.#stageRoot,
      `.${CURATED_PI_PACKAGE_GENERATION}.${randomUUID()}`,
    );
    try {
      mkdirSync(temporary, { mode: 0o700 });
      writeFileSync(path.join(temporary, "manifest.json"), evidence.manifestBytes, {
        flag: "wx",
        mode: 0o400,
      });
      writeFileSync(
        path.join(temporary, curatedManifest.executable.path),
        evidence.executableBytes,
        {
          flag: "wx",
          mode: 0o400,
        },
      );
      if (process.platform !== "win32") {
        chmodSync(path.join(temporary, "manifest.json"), 0o400);
        chmodSync(path.join(temporary, curatedManifest.executable.path), 0o400);
        chmodSync(temporary, 0o700);
      }
      try {
        renameSync(temporary, target);
      } catch (cause) {
        if (!existsSync(target)) throw cause;
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
    this.#assertArtifact(artifact);
    return artifact;
  }

  #assertArtifact(artifact: NativeHostPackageArtifact): void {
    const stagePath = path.resolve(artifact.stagePath);
    if (
      path.dirname(stagePath) !== path.resolve(this.#stageRoot) ||
      path.basename(stagePath) !== artifact.generation ||
      artifact.executablePath.includes("/") ||
      artifact.executablePath.includes("\\")
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STAGE_CONFLICT",
        "The Package generation is outside Product-owned immutable stage storage.",
      );
    }
    assertDirectory(artifact.stagePath, "PACKAGE_STAGE_CONFLICT");
    assertRegularFile(path.join(artifact.stagePath, "manifest.json"), "PACKAGE_STAGE_CONFLICT");
    const executablePath = path.join(artifact.stagePath, artifact.executablePath);
    assertRegularFile(executablePath, "PACKAGE_STAGE_CONFLICT");
    const manifestBytes = readFileSync(path.join(artifact.stagePath, "manifest.json"));
    const executableBytes = readFileSync(executablePath);
    if (
      sha256(manifestBytes) !== artifact.manifestSha256 ||
      executableBytes.byteLength !== artifact.executableBytes ||
      sha256(executableBytes) !== artifact.executableSha256
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STAGE_CONFLICT",
        "The immutable Package generation changed after staging.",
      );
    }
  }

  recordValidated(artifact: NativeHostPackageArtifact, report: NativeHostPackageLoadReport): void {
    this.#assertArtifact(artifact);
    const existing = this.#state.validatedGenerations[artifact.generation];
    if (existing) {
      if (
        !isDeepStrictEqual(existing.artifact, artifact) ||
        !isDeepStrictEqual(existing.report, report)
      ) {
        throw new PiPackageLifecycleError(
          "PACKAGE_GENERATION_CONFLICT",
          "A validated Package generation cannot change identity or native load report.",
        );
      }
      return;
    }
    this.#state = {
      ...this.#state,
      validatedGenerations: {
        ...this.#state.validatedGenerations,
        [artifact.generation]: {
          artifact,
          report,
          validatedAt: new Date().toISOString(),
        },
      },
    };
    this.#persist();
  }

  activate(generation: string, activeCurrentGenerationLeaseCount: number): void {
    if (
      generation !== EMPTY_PI_PACKAGE_GENERATION &&
      !this.#state.validatedGenerations[generation]
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_GENERATION_NOT_VALIDATED",
        "Package activation requires a validated generation.",
      );
    }
    if (this.#state.quarantinedGenerations[generation]) {
      throw new PiPackageLifecycleError(
        "PACKAGE_GENERATION_QUARANTINED",
        "A quarantined Package generation cannot be activated.",
      );
    }
    if (this.#state.currentGeneration === generation) return;
    if (
      !Number.isSafeInteger(activeCurrentGenerationLeaseCount) ||
      activeCurrentGenerationLeaseCount < 0
    ) {
      throw new PiPackageLifecycleError(
        "PACKAGE_STATE_INVALID",
        "Active Package generation lease count is invalid.",
      );
    }
    if (activeCurrentGenerationLeaseCount > 0) {
      throw new PiPackageLifecycleError(
        "PACKAGE_ACTIVATION_LEASED",
        "Package activation is refused while the current generation is leased.",
      );
    }
    this.#state = {
      ...this.#state,
      currentGeneration: generation,
    };
    this.#persist();
  }

  assertSelectable(generation: string): void {
    if (this.#state.quarantinedGenerations[generation]) {
      throw new PiPackageLifecycleError(
        "PACKAGE_GENERATION_QUARANTINED",
        "The selected Package generation is quarantined.",
      );
    }
    if (this.#state.currentGeneration !== generation) {
      throw new PiPackageLifecycleError(
        "PACKAGE_GENERATION_STALE",
        "The selected Package generation is no longer current.",
      );
    }
  }

  artifactForGeneration(generation: string): NativeHostPackageArtifact | null {
    if (generation === EMPTY_PI_PACKAGE_GENERATION) return null;
    const validated = this.#state.validatedGenerations[generation];
    if (!validated) {
      throw new PiPackageLifecycleError(
        "PACKAGE_GENERATION_NOT_VALIDATED",
        "The selected Package generation is not validated.",
      );
    }
    this.#assertArtifact(validated.artifact);
    return validated.artifact;
  }

  recordSuccessfulGeneration(generation: string): void {
    if (
      generation !== this.#state.currentGeneration ||
      this.#state.quarantinedGenerations[generation] ||
      (generation !== EMPTY_PI_PACKAGE_GENERATION && !this.#state.validatedGenerations[generation])
    ) {
      return;
    }
    if (this.#state.lastKnownGoodGeneration === generation) return;
    this.#state = { ...this.#state, lastKnownGoodGeneration: generation };
    this.#persist();
  }

  quarantineGeneration(generation: string, code: string): void {
    if (
      generation === EMPTY_PI_PACKAGE_GENERATION ||
      !this.#state.validatedGenerations[generation] ||
      this.#state.quarantinedGenerations[generation]
    ) {
      return;
    }
    const fallback = this.#state.lastKnownGoodGeneration;
    const currentGeneration =
      this.#state.currentGeneration === generation
        ? fallback && fallback !== generation && !this.#state.quarantinedGenerations[fallback]
          ? fallback
          : EMPTY_PI_PACKAGE_GENERATION
        : this.#state.currentGeneration;
    const lastKnownGoodGeneration =
      this.#state.lastKnownGoodGeneration === generation
        ? EMPTY_PI_PACKAGE_GENERATION
        : this.#state.lastKnownGoodGeneration;
    this.#state = {
      ...this.#state,
      currentGeneration,
      lastKnownGoodGeneration,
      quarantinedGenerations: {
        ...this.#state.quarantinedGenerations,
        [generation]: {
          code: code.slice(0, 256),
          observedAt: new Date().toISOString(),
        },
      },
    };
    this.#persist();
  }
}

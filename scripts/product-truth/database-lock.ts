import { randomUUID } from "node:crypto";
import * as FS from "node:fs";
import * as Path from "node:path";

import {
  LANES,
  LEGACY_PRODUCT_DATABASE,
  LEGACY_SERVICE_DATABASE,
  PROFILE_IDENTITIES,
  profileRoot,
  type ProfileIdentity,
} from "./contracts.ts";

export interface ProductTruthDatabaseLock {
  readonly databasePath: string;
  readonly lockPath: string;
  readonly token: string;
  readonly lockDev: number;
  readonly lockIno: number;
  readonly ownerDev: number;
  readonly ownerIno: number;
}

export interface ProductTruthProfileLock {
  readonly path: string;
  readonly token: string;
  readonly dev: number;
  readonly ino: number;
}

interface ProfileLockOwner {
  readonly pid: number;
  readonly token: string;
  readonly dev: number;
  readonly ino: number;
  readonly size: number;
  readonly mtimeMs: number;
}

export interface ProductTruthOwnerLocks {
  readonly profileLocks: readonly ProductTruthProfileLock[];
  readonly databaseLocks: readonly ProductTruthDatabaseLock[];
}

export interface DatabaseLockWitnessPort {
  readonly operation?: (
    operationId: string,
    site: "before" | "after",
    ordinal: number | "single",
  ) => void;
  readonly processState?: (
    pid: number,
    actual: "live" | "dead" | "unknown",
  ) => "live" | "dead" | "unknown";
  readonly barrier?: (
    barrierId: string,
    ordinal: number,
    replaceTarget?: () => void,
  ) => void;
}

function lockOperation<Result>(
  witness: DatabaseLockWitnessPort | undefined,
  operationId: string,
  ordinal: number | "single",
  effect: () => Result,
): Result {
  witness?.operation?.(operationId, "before", ordinal);
  const result = effect();
  witness?.operation?.(operationId, "after", ordinal);
  return result;
}

function openLockDescriptor(
  witness: DatabaseLockWitnessPort | undefined,
  operationId: string,
  ordinal: number,
  effect: () => number,
): number {
  witness?.operation?.(operationId, "before", ordinal);
  const descriptor = effect();
  try {
    witness?.operation?.(operationId, "after", ordinal);
  } catch (cause) {
    FS.closeSync(descriptor);
    throw cause;
  }
  return descriptor;
}

function closeLockDescriptor(
  descriptor: number,
  witness: DatabaseLockWitnessPort | undefined,
  operationId: string,
  ordinal: number,
): void {
  let injected: unknown;
  try {
    witness?.operation?.(operationId, "before", ordinal);
  } catch (cause) {
    injected = cause;
  }
  FS.closeSync(descriptor);
  if (injected !== undefined) throw injected;
  witness?.operation?.(operationId, "after", ordinal);
}

const PROFILE_LOCK_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function errnoCode(cause: unknown): string | undefined {
  return (cause as NodeJS.ErrnoException | undefined)?.code;
}

function syncDirectory(path: string): void {
  if (process.platform === "win32") return;
  const descriptor = FS.openSync(path, FS.constants.O_RDONLY | FS.constants.O_DIRECTORY | FS.constants.O_NOFOLLOW);
  try { FS.fsyncSync(descriptor); } finally { FS.closeSync(descriptor); }
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProfileLockOwner(
  path: string,
  witness?: DatabaseLockWitnessPort,
  ordinal?: number,
  phase?: "existing" | "verify",
): ProfileLockOwner {
  const before = FS.lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1)
    throw new Error("OWNER_NOT_STOPPED");
  const flags = process.platform === "win32"
    ? FS.constants.O_RDONLY
    : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  const openId = phase === "existing" ? "db-lock.open-existing" : "db-lock.open-verify";
  const readId = phase === "existing" ? "db-lock.read-existing" : "db-lock.read-verify";
  const closeId = phase === "existing" ? "db-lock.close-existing" : "db-lock.close-verify";
  const descriptor = phase !== undefined && ordinal !== undefined
    ? openLockDescriptor(witness, openId, ordinal, () => FS.openSync(path, flags))
    : FS.openSync(path, flags);
  let decoded: unknown;
  try {
    const text = phase !== undefined && ordinal !== undefined
      ? lockOperation(witness, readId, ordinal, () => FS.readFileSync(descriptor, "utf8"))
      : FS.readFileSync(descriptor, "utf8");
    decoded = JSON.parse(text);
  } catch (cause) {
    FS.closeSync(descriptor);
    if ((cause as Error).message?.startsWith("PORT_FAULT:")) throw cause;
    throw new Error("OWNER_NOT_STOPPED");
  }
  const after = FS.fstatSync(descriptor);
  if (phase !== undefined && ordinal !== undefined)
    closeLockDescriptor(descriptor, witness, closeId, ordinal);
  else FS.closeSync(descriptor);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    !isPlainRecord(decoded) ||
    Object.keys(decoded).sort().join(",") !== "pid,token" ||
    !Number.isSafeInteger(decoded.pid) ||
    Number(decoded.pid) <= 0 ||
    typeof decoded.token !== "string" ||
    !PROFILE_LOCK_TOKEN.test(decoded.token)
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

function reapProfileLockTombstones(root: string): void {
  for (const name of FS.readdirSync(root)) {
    const acquiring = /^SingletonLock\.acquiring\.(\d+)\.([0-9a-f-]{36})$/iu.exec(name);
    if (acquiring) {
      const path = Path.join(root, name);
      const stat = FS.lstatSync(path);
      const pid = Number(acquiring[1]);
      const token = acquiring[2]!;
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.nlink !== 1 ||
        !Number.isSafeInteger(pid) ||
        pid <= 0 ||
        !PROFILE_LOCK_TOKEN.test(token) ||
        processState(pid) !== "dead"
      ) throw new Error("OWNER_NOT_STOPPED");
      if (stat.size > 0) {
        const owner = readProfileLockOwner(path);
        if (owner.pid !== pid || owner.token !== token)
          throw new Error("OWNER_NOT_STOPPED");
      }
      const current = FS.lstatSync(path);
      if (current.dev !== stat.dev || current.ino !== stat.ino)
        throw new Error("OWNER_NOT_STOPPED");
      FS.unlinkSync(path);
      syncDirectory(root);
      continue;
    }
    const match = /^SingletonLock\.(?:stale|released)\.([0-9a-f-]{36})\.([0-9a-f-]{36})$/iu.exec(name);
    if (!match) continue;
    const path = Path.join(root, name);
    const owner = readProfileLockOwner(path);
    if (
      owner.token !== match[1] ||
      !PROFILE_LOCK_TOKEN.test(match[2]!) ||
      processState(owner.pid) !== "dead"
    ) throw new Error("OWNER_NOT_STOPPED");
    FS.unlinkSync(path);
    syncDirectory(root);
  }
}

export function acquireProductTruthProfileLock(
  identity: ProfileIdentity,
  witness?: DatabaseLockWitnessPort,
  ordinal = 0,
): ProductTruthProfileLock | null {
  const root = profileRoot(identity);
  if (!pathExists(root)) return null;
  const path = Path.join(root, "SingletonLock");
  reapProfileLockTombstones(root);
  if (lockOperation(witness, "db-lock.lstat-existing", ordinal, () => pathExists(path))) {
    const first = readProfileLockOwner(path, witness, 0, "existing");
    witness?.barrier?.("db-lock-record-to-process-probe", 0, () =>
      FS.writeFileSync(path, `${JSON.stringify({ pid: process.pid, token: randomUUID() })}\n`));
    const second = readProfileLockOwner(path);
    if (
      first.dev !== second.dev ||
      first.ino !== second.ino ||
      first.pid !== second.pid ||
      first.token !== second.token ||
      lockOperation(witness, "db-lock.probe-owner", 0, () =>
        observedProcessState(first.pid, witness)) !== "dead" ||
      observedProcessState(second.pid, witness) !== "dead"
    ) throw new Error("OWNER_NOT_STOPPED");
    witness?.barrier?.("db-lock-dead-proof-to-stale-remove", 0, () =>
      FS.writeFileSync(path, `${JSON.stringify({ pid: process.pid, token: randomUUID() })}\n`));
    const current = readProfileLockOwner(path);
    if (
      current.dev !== first.dev ||
      current.ino !== first.ino ||
      current.pid !== first.pid ||
      current.token !== first.token ||
      observedProcessState(current.pid, witness) !== "dead"
    ) throw new Error("OWNER_NOT_STOPPED");
    const stale = `${path}.stale.${first.token}.${randomUUID()}`;
    lockOperation(witness, "db-lock.remove-stale", 0, () => {
      FS.renameSync(path, stale);
      syncDirectory(root);
      const moved = readProfileLockOwner(stale);
      if (moved.dev !== first.dev || moved.ino !== first.ino || moved.token !== first.token)
        throw new Error("OWNER_NOT_STOPPED");
      FS.unlinkSync(stale);
      syncDirectory(root);
    });
  }
  const token = randomUUID();
  const staging = `${path}.acquiring.${process.pid}.${token}`;
  const descriptor = openLockDescriptor(
    witness,
    "db-lock.open-publish",
    ordinal,
    () => FS.openSync(staging, "wx", 0o600),
  );
  try {
    lockOperation(witness, "db-lock.write-publish", ordinal, () =>
      FS.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, token })}\n`));
    lockOperation(witness, "db-lock.fsync-publish", ordinal, () => FS.fsyncSync(descriptor));
  } finally {
    closeLockDescriptor(descriptor, witness, "db-lock.close-publish", ordinal);
  }
  FS.renameSync(staging, path);
  lockOperation(witness, "db-lock.fsync-parent", ordinal, () => syncDirectory(root));
  witness?.barrier?.("db-lock-publish-to-verify", ordinal, () =>
    FS.writeFileSync(path, `${JSON.stringify({ pid: process.pid, token: randomUUID() })}\n`));
  const stat = FS.lstatSync(path);
  const verified = readProfileLockOwner(path, witness, ordinal, "verify");
  if (verified.pid !== process.pid || verified.token !== token)
    throw new Error("OWNER_NOT_STOPPED");
  return { path, token, dev: stat.dev, ino: stat.ino };
}

export function releaseProductTruthProfileLock(
  lock: ProductTruthProfileLock,
  witness?: DatabaseLockWitnessPort,
  ordinal = 0,
): void {
  const stat = FS.lstatSync(lock.path);
  if (stat.dev !== lock.dev || stat.ino !== lock.ino)
    throw new Error("DESTRUCTION_INCOMPLETE");
  const parsed = readProfileLockOwner(lock.path);
  if (parsed.pid !== process.pid || parsed.token !== lock.token)
    throw new Error("DESTRUCTION_INCOMPLETE");
  lockOperation(witness, "db-lock.remove-owned", ordinal, () => {
    const released = `${lock.path}.released.${lock.token}.${randomUUID()}`;
    FS.renameSync(lock.path, released);
    syncDirectory(Path.dirname(lock.path));
    FS.unlinkSync(released);
    syncDirectory(Path.dirname(lock.path));
  });
  lockOperation(witness, "db-lock.verify-absent", ordinal, () => {
    if (pathExists(lock.path)) throw new Error("DESTRUCTION_INCOMPLETE");
  });
}

function readOwner(
  lockPath: string,
  witness?: DatabaseLockWitnessPort,
  ordinal?: number,
  phase?: "existing" | "verify",
): { readonly pid: number; readonly token: string } {
  const lockStat = FS.lstatSync(lockPath);
  const ownerPath = Path.join(lockPath, "owner.json");
  const ownerStat = FS.lstatSync(ownerPath);
  if (!lockStat.isDirectory() || lockStat.isSymbolicLink() || !ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.nlink !== 1) throw new Error("OWNER_NOT_STOPPED");
  const before = FS.lstatSync(ownerPath, { bigint: true });
  const flags = process.platform === "win32"
    ? FS.constants.O_RDONLY
    : FS.constants.O_RDONLY | FS.constants.O_NOFOLLOW;
  const openId = phase === "existing" ? "db-lock.open-existing" : "db-lock.open-verify";
  const readId = phase === "existing" ? "db-lock.read-existing" : "db-lock.read-verify";
  const closeId = phase === "existing" ? "db-lock.close-existing" : "db-lock.close-verify";
  const descriptor = phase !== undefined && ordinal !== undefined
    ? openLockDescriptor(witness, openId, ordinal, () => FS.openSync(ownerPath, flags))
    : FS.openSync(ownerPath, flags);
  let owner: Record<string, unknown>;
  try {
    const text = phase !== undefined && ordinal !== undefined
      ? lockOperation(witness, readId, ordinal, () => FS.readFileSync(descriptor, "utf8"))
      : FS.readFileSync(descriptor, "utf8");
    owner = JSON.parse(text) as Record<string, unknown>;
  } catch (cause) {
    FS.closeSync(descriptor);
    if ((cause as Error).message?.startsWith("PORT_FAULT:")) throw cause;
    throw new Error("OWNER_NOT_STOPPED");
  }
  const after = FS.fstatSync(descriptor, { bigint: true });
  if (phase !== undefined && ordinal !== undefined)
    closeLockDescriptor(descriptor, witness, closeId, ordinal);
  else FS.closeSync(descriptor);
  if (
    before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs ||
    JSON.stringify(Object.keys(owner).sort()) !== JSON.stringify(["createdAt", "pid", "token"]) ||
    !Number.isSafeInteger(owner.pid) || Number(owner.pid) <= 0 ||
    typeof owner.token !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(owner.token) ||
    typeof owner.createdAt !== "string" || !Number.isFinite(Date.parse(owner.createdAt))
  ) throw new Error("OWNER_NOT_STOPPED");
  return { pid: Number(owner.pid), token: owner.token };
}

function processState(pid: number): "live" | "dead" | "unknown" {
  try { process.kill(pid, 0); return "live"; } catch (cause) {
    if (errnoCode(cause) === "ESRCH") return "dead";
    return "unknown";
  }
}

function observedProcessState(
  pid: number,
  witness?: DatabaseLockWitnessPort,
): "live" | "dead" | "unknown" {
  const actual = processState(pid);
  return witness?.processState?.(pid, actual) ?? actual;
}

function reapDatabaseStaging(lockPath: string): void {
  const parent = Path.dirname(lockPath);
  const base = Path.basename(lockPath);
  for (const name of FS.readdirSync(parent)) {
    const match = new RegExp(
      `^${base.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\.acquiring\\.(\\d+)\\.([0-9a-f-]{36})$`,
      "iu",
    ).exec(name);
    if (!match) continue;
    const staging = Path.join(parent, name);
    const stagingStat = FS.lstatSync(staging);
    const pid = Number(match[1]);
    const token = match[2]!;
    if (
      !stagingStat.isDirectory() ||
      stagingStat.isSymbolicLink() ||
      !Number.isSafeInteger(pid) ||
      pid <= 0 ||
      !PROFILE_LOCK_TOKEN.test(token) ||
      processState(pid) !== "dead"
    ) throw new Error("OWNER_NOT_STOPPED");
    const entries = FS.readdirSync(staging);
    if (entries.length !== 1 || entries[0] !== "owner.json")
      throw new Error("OWNER_NOT_STOPPED");
    const ownerPath = Path.join(staging, "owner.json");
    const ownerStat = FS.lstatSync(ownerPath);
    if (!ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.nlink !== 1)
      throw new Error("OWNER_NOT_STOPPED");
    if (ownerStat.size > 0) {
      const owner = readOwner(staging);
      if (owner.pid !== pid || owner.token !== token)
        throw new Error("OWNER_NOT_STOPPED");
    }
    const currentOwner = FS.lstatSync(ownerPath);
    const currentStaging = FS.lstatSync(staging);
    if (
      currentOwner.dev !== ownerStat.dev ||
      currentOwner.ino !== ownerStat.ino ||
      currentStaging.dev !== stagingStat.dev ||
      currentStaging.ino !== stagingStat.ino
    ) throw new Error("OWNER_NOT_STOPPED");
    FS.unlinkSync(ownerPath);
    FS.rmdirSync(staging);
    syncDirectory(parent);
  }
}

function publish(
  lockPath: string,
  token: string,
  witness: DatabaseLockWitnessPort | undefined,
  ordinal: number,
): boolean {
  const staging = `${lockPath}.acquiring.${process.pid}.${token}`;
  FS.mkdirSync(staging, { mode: 0o700 });
  let published = false;
  try {
    const ownerPath = Path.join(staging, "owner.json");
    const descriptor = openLockDescriptor(
      witness,
      "db-lock.open-publish",
      ordinal,
      () => FS.openSync(ownerPath, "wx", 0o600),
    );
    try {
      lockOperation(witness, "db-lock.write-publish", ordinal, () =>
        FS.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() })}\n`));
      lockOperation(witness, "db-lock.fsync-publish", ordinal, () => FS.fsyncSync(descriptor));
    } finally {
      closeLockDescriptor(descriptor, witness, "db-lock.close-publish", ordinal);
    }
    syncDirectory(staging);
    try { FS.renameSync(staging, lockPath); published = true; } catch (cause) {
      if (errnoCode(cause) !== "EEXIST" && errnoCode(cause) !== "ENOTEMPTY") throw cause;
    }
    lockOperation(witness, "db-lock.fsync-parent", ordinal, () =>
      syncDirectory(Path.dirname(lockPath)));
    return published;
  } finally {
    if (!published && FS.existsSync(staging)) FS.rmSync(staging, { recursive: true });
  }
}

export function acquireProductTruthDatabaseLock(
  databasePath: string,
  witness?: DatabaseLockWitnessPort,
  ordinal = 0,
): ProductTruthDatabaseLock {
  const parent = Path.dirname(databasePath);
  const parentStat = FS.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || (process.platform !== "win32" && (parentStat.mode & 0o022) !== 0)) throw new Error("OWNER_NOT_STOPPED");
  const lockPath = `${Path.join(FS.realpathSync.native(parent), Path.basename(databasePath))}.lifecycle-lock`;
  reapDatabaseStaging(lockPath);
  lockOperation(witness, "db-lock.lstat-existing", ordinal, () => pathExists(lockPath));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = randomUUID();
    if (publish(lockPath, token, witness, ordinal)) {
      const lockStat = FS.lstatSync(lockPath);
      const ownerStat = FS.lstatSync(Path.join(lockPath, "owner.json"));
      witness?.barrier?.("db-lock-publish-to-verify", ordinal, () =>
        FS.writeFileSync(
          Path.join(lockPath, "owner.json"),
          `${JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() })}\n`,
        ));
      const verified = readOwner(lockPath, witness, ordinal, "verify");
      if (verified.pid !== process.pid || verified.token !== token)
        throw new Error("OWNER_NOT_STOPPED");
      return { databasePath, lockPath, token, lockDev: lockStat.dev, lockIno: lockStat.ino, ownerDev: ownerStat.dev, ownerIno: ownerStat.ino };
    }
    const owner = attempt === 0
      ? readOwner(lockPath, witness, 0, "existing")
      : readOwner(lockPath);
    if (attempt === 0)
      witness?.barrier?.("db-lock-record-to-process-probe", 0, () =>
        FS.writeFileSync(
          Path.join(lockPath, "owner.json"),
          `${JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() })}\n`,
        ));
    if (
      lockOperation(witness, "db-lock.probe-owner", 0, () =>
        observedProcessState(owner.pid, witness)) !== "dead" ||
      attempt > 0
    ) throw new Error("OWNER_NOT_STOPPED");
    const current = readOwner(lockPath);
    if (current.pid !== owner.pid || current.token !== owner.token || observedProcessState(current.pid, witness) !== "dead") throw new Error("OWNER_NOT_STOPPED");
    if (attempt === 0)
      witness?.barrier?.("db-lock-dead-proof-to-stale-remove", 0, () =>
        FS.writeFileSync(
          Path.join(lockPath, "owner.json"),
          `${JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() })}\n`,
        ));
    const finalCurrent = readOwner(lockPath);
    if (
      finalCurrent.pid !== owner.pid ||
      finalCurrent.token !== owner.token ||
      observedProcessState(finalCurrent.pid, witness) !== "dead"
    ) throw new Error("OWNER_NOT_STOPPED");
    const stale = `${lockPath}.stale.${owner.token}.${randomUUID()}`;
    lockOperation(witness, "db-lock.remove-stale", 0, () => {
      FS.renameSync(lockPath, stale);
      syncDirectory(parent);
      FS.rmSync(stale, { recursive: true });
      syncDirectory(parent);
    });
  }
  throw new Error("OWNER_NOT_STOPPED");
}

export function releaseProductTruthDatabaseLock(
  lock: ProductTruthDatabaseLock,
  witness?: DatabaseLockWitnessPort,
  ordinal = 0,
): void {
  const lockStat = FS.lstatSync(lock.lockPath);
  const ownerStat = FS.lstatSync(Path.join(lock.lockPath, "owner.json"));
  if (lockStat.dev !== lock.lockDev || lockStat.ino !== lock.lockIno || ownerStat.dev !== lock.ownerDev || ownerStat.ino !== lock.ownerIno) throw new Error("DESTRUCTION_INCOMPLETE");
  const owner = readOwner(lock.lockPath);
  if (owner.pid !== process.pid || owner.token !== lock.token) throw new Error("DESTRUCTION_INCOMPLETE");
  lockOperation(witness, "db-lock.remove-owned", ordinal, () => {
    const released = `${lock.lockPath}.released.${lock.token}.${randomUUID()}`;
    FS.renameSync(lock.lockPath, released);
    syncDirectory(Path.dirname(lock.lockPath));
    FS.rmSync(released, { recursive: true });
    syncDirectory(Path.dirname(lock.lockPath));
  });
  lockOperation(witness, "db-lock.verify-absent", ordinal, () => {
    if (pathExists(lock.lockPath)) throw new Error("DESTRUCTION_INCOMPLETE");
  });
}

export async function withProductTruthDatabaseLocks<Result>(
  canonicalHome: string,
  effect: (locks: ProductTruthOwnerLocks) => Promise<Result>,
  afterAcquire?: (
    kind: "profile" | "database",
    identity: string,
  ) => void,
  witness?: DatabaseLockWitnessPort,
): Promise<Result> {
  canonicalHome = lockOperation(
    witness,
    "db-lock.resolve",
    "single",
    () => canonicalHome,
  );
  const profileLocks: ProductTruthProfileLock[] = [];
  const databaseLocks: ProductTruthDatabaseLock[] = [];
  try {
    for (const [ordinal, identity] of PROFILE_IDENTITIES.entries()) {
      const lock = acquireProductTruthProfileLock(identity, witness, ordinal);
      if (lock !== null) {
        profileLocks.push(lock);
        afterAcquire?.("profile", identity);
      }
    }
    let databaseOrdinal = PROFILE_IDENTITIES.length;
    for (const lane of LANES) {
      const lanePath = Path.join(canonicalHome, lane);
      if (!pathExists(lanePath)) continue;
      for (const filename of [LEGACY_PRODUCT_DATABASE, LEGACY_SERVICE_DATABASE]) {
        databaseLocks.push(
          acquireProductTruthDatabaseLock(
            Path.join(lanePath, filename),
            witness,
            databaseOrdinal,
          ),
        );
        afterAcquire?.("database", `${lane}:${filename}`);
        databaseOrdinal += 1;
      }
    }
    return await effect({ profileLocks, databaseLocks });
  } finally {
    let releaseFailure: unknown;
    for (const [reverseIndex, lock] of [...databaseLocks].reverse().entries()) {
      try {
        const ordinal = PROFILE_IDENTITIES.length + databaseLocks.length - reverseIndex - 1;
        witness?.barrier?.("db-lock-owned-to-release", ordinal, () => {
          FS.writeFileSync(
            Path.join(lock.lockPath, "owner.json"),
            `${JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() })}\n`,
          );
        });
        releaseProductTruthDatabaseLock(lock, witness, ordinal);
      } catch (cause) {
        releaseFailure ??= cause;
      }
    }
    for (const [reverseIndex, lock] of [...profileLocks].reverse().entries()) {
      try {
        const ordinal = profileLocks.length - reverseIndex - 1;
        witness?.barrier?.("db-lock-owned-to-release", ordinal, () =>
          FS.writeFileSync(
            lock.path,
            `${JSON.stringify({ pid: process.pid, token: randomUUID() })}\n`,
          ));
        releaseProductTruthProfileLock(lock, witness, ordinal);
      } catch (cause) {
        releaseFailure ??= cause;
      }
    }
    if (releaseFailure !== undefined) throw releaseFailure;
  }
}

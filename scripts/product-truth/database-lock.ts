import { randomUUID } from "node:crypto";
import * as FS from "node:fs";
import * as Path from "node:path";

export interface ProductTruthDatabaseLock {
  readonly databasePath: string;
  readonly lockPath: string;
  readonly token: string;
  readonly lockDev: number;
  readonly lockIno: number;
  readonly ownerDev: number;
  readonly ownerIno: number;
}

function errnoCode(cause: unknown): string | undefined {
  return (cause as NodeJS.ErrnoException | undefined)?.code;
}

function syncDirectory(path: string): void {
  if (process.platform === "win32") return;
  const descriptor = FS.openSync(path, FS.constants.O_RDONLY | FS.constants.O_DIRECTORY | FS.constants.O_NOFOLLOW);
  try { FS.fsyncSync(descriptor); } finally { FS.closeSync(descriptor); }
}

function readOwner(lockPath: string): { readonly pid: number; readonly token: string } {
  const lockStat = FS.lstatSync(lockPath);
  const ownerPath = Path.join(lockPath, "owner.json");
  const ownerStat = FS.lstatSync(ownerPath);
  if (!lockStat.isDirectory() || lockStat.isSymbolicLink() || !ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.nlink !== 1) throw new Error("OWNER_NOT_STOPPED");
  const owner = JSON.parse(FS.readFileSync(ownerPath, "utf8")) as Record<string, unknown>;
  if (!Number.isSafeInteger(owner.pid) || Number(owner.pid) <= 0 || typeof owner.token !== "string" || !/^[0-9a-f-]{36}$/iu.test(owner.token)) throw new Error("OWNER_NOT_STOPPED");
  return { pid: Number(owner.pid), token: owner.token };
}

function processState(pid: number): "live" | "dead" | "unknown" {
  try { process.kill(pid, 0); return "live"; } catch (cause) {
    if (errnoCode(cause) === "ESRCH") return "dead";
    return "unknown";
  }
}

function publish(lockPath: string, token: string): boolean {
  const staging = `${lockPath}.acquiring.${process.pid}.${token}`;
  FS.mkdirSync(staging, { mode: 0o700 });
  let published = false;
  try {
    const ownerPath = Path.join(staging, "owner.json");
    const descriptor = FS.openSync(ownerPath, "wx", 0o600);
    try {
      FS.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() })}\n`);
      FS.fsyncSync(descriptor);
    } finally { FS.closeSync(descriptor); }
    syncDirectory(staging);
    try { FS.renameSync(staging, lockPath); published = true; } catch (cause) {
      if (errnoCode(cause) !== "EEXIST" && errnoCode(cause) !== "ENOTEMPTY") throw cause;
    }
    syncDirectory(Path.dirname(lockPath));
    return published;
  } finally {
    if (!published && FS.existsSync(staging)) FS.rmSync(staging, { recursive: true });
  }
}

export function acquireProductTruthDatabaseLock(databasePath: string): ProductTruthDatabaseLock {
  const parent = Path.dirname(databasePath);
  const parentStat = FS.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || (process.platform !== "win32" && (parentStat.mode & 0o022) !== 0)) throw new Error("OWNER_NOT_STOPPED");
  const lockPath = `${Path.join(FS.realpathSync.native(parent), Path.basename(databasePath))}.lifecycle-lock`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = randomUUID();
    if (publish(lockPath, token)) {
      const lockStat = FS.lstatSync(lockPath);
      const ownerStat = FS.lstatSync(Path.join(lockPath, "owner.json"));
      return { databasePath, lockPath, token, lockDev: lockStat.dev, lockIno: lockStat.ino, ownerDev: ownerStat.dev, ownerIno: ownerStat.ino };
    }
    const owner = readOwner(lockPath);
    if (processState(owner.pid) !== "dead" || attempt > 0) throw new Error("OWNER_NOT_STOPPED");
    const current = readOwner(lockPath);
    if (current.pid !== owner.pid || current.token !== owner.token || processState(current.pid) !== "dead") throw new Error("OWNER_NOT_STOPPED");
    const stale = `${lockPath}.stale.${owner.token}.${randomUUID()}`;
    FS.renameSync(lockPath, stale);
    syncDirectory(parent);
    FS.rmSync(stale, { recursive: true });
    syncDirectory(parent);
  }
  throw new Error("OWNER_NOT_STOPPED");
}

export function releaseProductTruthDatabaseLock(lock: ProductTruthDatabaseLock): void {
  const lockStat = FS.lstatSync(lock.lockPath);
  const ownerStat = FS.lstatSync(Path.join(lock.lockPath, "owner.json"));
  if (lockStat.dev !== lock.lockDev || lockStat.ino !== lock.lockIno || ownerStat.dev !== lock.ownerDev || ownerStat.ino !== lock.ownerIno) throw new Error("DESTRUCTION_INCOMPLETE");
  const owner = readOwner(lock.lockPath);
  if (owner.pid !== process.pid || owner.token !== lock.token) throw new Error("DESTRUCTION_INCOMPLETE");
  const released = `${lock.lockPath}.released.${lock.token}.${randomUUID()}`;
  FS.renameSync(lock.lockPath, released);
  syncDirectory(Path.dirname(lock.lockPath));
  FS.rmSync(released, { recursive: true });
  syncDirectory(Path.dirname(lock.lockPath));
}

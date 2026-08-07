import { randomUUID } from "node:crypto";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";
import { ClassicLevel } from "classic-level";

import {
  CURRENT_DRAFT_KEY,
  LEGACY_DRAFT_KEYS,
  PROFILE_ORIGIN,
  type ProfileIdentity,
  type ProfilePlan,
} from "./contracts.ts";

type RawLevel = ClassicLevel<Buffer, Buffer>;

interface TreeIdentity {
  readonly relativePath: string;
  readonly dev: number;
  readonly ino: number;
  readonly size: number;
  readonly mtimeNs: string;
  readonly mode: number;
  readonly nlink: number;
}

function levelPath(profilePath: string): string {
  return Path.join(profilePath, "Local Storage", "leveldb");
}

function snapshotTree(root: string): TreeIdentity[] {
  if (!FS.existsSync(root)) return [];
  const rootStat = FS.lstatSync(root, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("INSPECTION_UNSAFE");
  const result: TreeIdentity[] = [];
  const walk = (directory: string): void => {
    for (const name of FS.readdirSync(directory).sort()) {
      const path = Path.join(directory, name);
      const stat = FS.lstatSync(path, { bigint: true });
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink !== 1n)) {
        throw new Error("INSPECTION_UNSAFE");
      }
      const relativePath = Path.relative(root, path);
      result.push({
        relativePath,
        dev: Number(stat.dev),
        ino: Number(stat.ino),
        size: Number(stat.size),
        mtimeNs: stat.mtimeNs.toString(),
        mode: Number(stat.mode),
        nlink: Number(stat.nlink),
      });
      if (stat.isDirectory()) walk(path);
      else if (!stat.isFile()) throw new Error("INSPECTION_UNSAFE");
    }
  };
  walk(root);
  return result;
}

function copyTree(source: string, destination: string): void {
  FS.mkdirSync(destination, { mode: 0o700 });
  for (const entry of snapshotTree(source)) {
    const sourcePath = Path.join(source, entry.relativePath);
    const destinationPath = Path.join(destination, entry.relativePath);
    if (FS.lstatSync(sourcePath).isDirectory()) {
      FS.mkdirSync(destinationPath, { mode: 0o700 });
    } else {
      FS.copyFileSync(sourcePath, destinationPath, FS.constants.COPYFILE_EXCL);
      FS.chmodSync(destinationPath, 0o600);
    }
  }
}

function encodedString(value: string): Buffer {
  return Buffer.concat([Buffer.from([1]), Buffer.from(value, "utf8")]);
}

function dataKeys(logicalKey: string): Buffer[] {
  return [Buffer.concat([Buffer.from(`_${PROFILE_ORIGIN}\0`, "utf8"), encodedString(logicalKey)])];
}

async function openRaw(path: string, createIfMissing: boolean): Promise<RawLevel> {
  const database = new ClassicLevel<Buffer, Buffer>(path, {
    keyEncoding: "buffer",
    valueEncoding: "buffer",
    createIfMissing,
    errorIfExists: false,
  });
  await database.open();
  return database;
}

async function hasLogicalKey(database: RawLevel, logicalKey: string): Promise<boolean> {
  let present = false;
  for (const key of dataKeys(logicalKey)) {
    try {
      const value = await database.get(key);
      if (value === undefined) continue;
      if (present) throw new Error("CURRENT_STATE_CONTRADICTORY");
      present = true;
    } catch (cause) {
      const code = (cause as { readonly code?: string }).code;
      if (code !== "LEVEL_NOT_FOUND") throw cause;
    }
  }
  return present;
}

async function readLogicalPresence(database: RawLevel): Promise<{
  readonly v1: boolean;
  readonly v2: boolean;
  readonly g1: boolean;
}> {
  return {
    v1: await hasLogicalKey(database, LEGACY_DRAFT_KEYS[0]),
    v2: await hasLogicalKey(database, LEGACY_DRAFT_KEYS[1]),
    g1: await hasLogicalKey(database, CURRENT_DRAFT_KEY),
  };
}

function toProfilePlan(
  identity: ProfileIdentity,
  presence: { readonly v1: boolean; readonly v2: boolean; readonly g1: boolean },
): ProfilePlan {
  return {
    identity,
    origin: PROFILE_ORIGIN,
    v1: presence.v1 ? "present" : "absent",
    v2: presence.v2 ? "present" : "absent",
    g1: presence.g1 ? "present" : "absent",
  };
}

export async function inspectProfileDraftKeys(
  identity: ProfileIdentity,
  profilePath: string,
): Promise<ProfilePlan> {
  const source = levelPath(profilePath);
  if (!FS.existsSync(source)) return toProfilePlan(identity, { v1: false, v2: false, g1: false });
  const before = snapshotTree(source);
  const scratch = FS.mkdtempSync(Path.join(OS.tmpdir(), `omnimind-profile-${randomUUID()}-`));
  FS.chmodSync(scratch, 0o700);
  const copy = Path.join(scratch, "leveldb");
  let database: RawLevel | undefined;
  try {
    copyTree(source, copy);
    if (JSON.stringify(before) !== JSON.stringify(snapshotTree(source))) {
      throw new Error("INSPECTION_UNSAFE");
    }
    database = await openRaw(copy, false);
    const presence = await readLogicalPresence(database);
    await database.close();
    database = undefined;
    if (JSON.stringify(before) !== JSON.stringify(snapshotTree(source))) {
      throw new Error("INSPECTION_UNSAFE");
    }
    return toProfilePlan(identity, presence);
  } finally {
    await database?.close().catch(() => undefined);
    FS.rmSync(scratch, { recursive: true });
  }
}

export async function deleteLegacyProfileDraftKeys(
  identity: ProfileIdentity,
  profilePath: string,
  afterBoundary?: (boundary: "profile-key-removed" | "profile-reread", target: string) => void,
): Promise<ProfilePlan> {
  const source = levelPath(profilePath);
  if (!FS.existsSync(source)) return toProfilePlan(identity, { v1: false, v2: false, g1: false });
  const database = await openRaw(source, false);
  try {
    const before = await readLogicalPresence(database);
    for (const logicalKey of LEGACY_DRAFT_KEYS) {
      for (const key of dataKeys(logicalKey)) {
        try {
          const value = await database.get(key);
          if (value !== undefined) {
            await database.del(key);
            afterBoundary?.("profile-key-removed", `${identity}:${logicalKey}`);
          }
        } catch (cause) {
          if ((cause as { readonly code?: string }).code !== "LEVEL_NOT_FOUND") throw cause;
        }
      }
    }
    const after = await readLogicalPresence(database);
    afterBoundary?.("profile-reread", identity);
    if (after.v1 || after.v2 || after.g1 !== before.g1) {
      throw new Error("DESTRUCTION_INCOMPLETE");
    }
    return toProfilePlan(identity, after);
  } finally {
    await database.close();
  }
}

export const chromiumLocalStorageDataKeysForTest = dataKeys;

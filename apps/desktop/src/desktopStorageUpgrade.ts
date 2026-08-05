// FILE: desktopStorageUpgrade.ts
// Purpose: Persists a validated, origin-neutral browser-storage handoff for desktop upgrades.
// Layer: Desktop main-process utility

import * as FS from "node:fs";
import * as Path from "node:path";

import type { OmniMindStorageSnapshot } from "@omnimind/contracts";

export const OMNIMIND_STORAGE_SNAPSHOT_FILE_NAME = "omnimind-storage-origin-v1.json";
export const OMNIMIND_STORAGE_SNAPSHOT_MAX_BYTES = 16 * 1024 * 1024;
export const OMNIMIND_STORAGE_SNAPSHOT_MAX_ENTRIES = 2_048;
export const OMNIMIND_STORAGE_SNAPSHOT_MAX_KEY_LENGTH = 512;
export const OMNIMIND_STORAGE_SNAPSHOT_MAX_VALUE_LENGTH = 16 * 1024 * 1024;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isOmniMindStorageKey(key: string): boolean {
  return key.startsWith("omnimind:") || key.startsWith("omnimind.");
}

export function validateOmniMindStorageSnapshot(value: unknown): OmniMindStorageSnapshot | null {
  if (!isPlainRecord(value) || value.version !== 1 || !isPlainRecord(value.entries)) {
    return null;
  }
  if (typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt))) {
    return null;
  }

  const entries = Object.entries(value.entries);
  if (entries.length > OMNIMIND_STORAGE_SNAPSHOT_MAX_ENTRIES) {
    return null;
  }
  for (const [key, entryValue] of entries) {
    if (
      !isOmniMindStorageKey(key) ||
      key.length === 0 ||
      key.length > OMNIMIND_STORAGE_SNAPSHOT_MAX_KEY_LENGTH ||
      typeof entryValue !== "string" ||
      entryValue.length > OMNIMIND_STORAGE_SNAPSHOT_MAX_VALUE_LENGTH
    ) {
      return null;
    }
  }

  const snapshot = value as unknown as OmniMindStorageSnapshot;
  try {
    if (Buffer.byteLength(JSON.stringify(snapshot), "utf8") > OMNIMIND_STORAGE_SNAPSHOT_MAX_BYTES) {
      return null;
    }
  } catch {
    return null;
  }
  return snapshot;
}

export function resolveOmniMindStorageSnapshotPath(userDataPath: string): string {
  return Path.join(userDataPath, OMNIMIND_STORAGE_SNAPSHOT_FILE_NAME);
}

export function readOmniMindStorageSnapshot(snapshotPath: string): OmniMindStorageSnapshot | null {
  try {
    const stats = FS.statSync(snapshotPath);
    if (!stats.isFile() || stats.size > OMNIMIND_STORAGE_SNAPSHOT_MAX_BYTES) {
      return null;
    }
    return validateOmniMindStorageSnapshot(JSON.parse(FS.readFileSync(snapshotPath, "utf8")));
  } catch {
    return null;
  }
}

export async function saveOmniMindStorageSnapshot(
  snapshotPath: string,
  input: unknown,
): Promise<boolean> {
  const snapshot = validateOmniMindStorageSnapshot(input);
  if (!snapshot) {
    return false;
  }

  const current = readOmniMindStorageSnapshot(snapshotPath);
  if (current && Date.parse(current.exportedAt) > Date.parse(snapshot.exportedAt)) {
    return false;
  }

  const parentPath = Path.dirname(snapshotPath);
  const temporaryPath = `${snapshotPath}.${process.pid}.${Date.now()}.tmp`;
  let handle: FS.promises.FileHandle | null = null;
  try {
    await FS.promises.mkdir(parentPath, { recursive: true });
    handle = await FS.promises.open(temporaryPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(snapshot)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await FS.promises.rename(temporaryPath, snapshotPath);
    return true;
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => undefined);
    await FS.promises.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export async function acknowledgeOmniMindStorageSnapshot(snapshotPath: string): Promise<void> {
  await FS.promises.rm(snapshotPath, { force: true }).catch(() => undefined);
}

import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import { describe, expect, it } from "vitest";

import {
  acknowledgeOmniMindStorageSnapshot,
  readOmniMindStorageSnapshot,
  saveOmniMindStorageSnapshot,
  OMNIMIND_STORAGE_SNAPSHOT_MAX_BYTES,
  validateOmniMindStorageSnapshot,
} from "./desktopStorageMigration";

const snapshot = (exportedAt = "2026-07-09T00:00:00.000Z") => ({
  version: 1 as const,
  exportedAt,
  entries: {
    "omnimind:theme": "dark",
    "omnimind.openUsage.enabled": "true",
  },
});

describe("desktopStorageMigration", () => {
  it("round-trips atomically and acknowledges the snapshot", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      await expect(saveOmniMindStorageSnapshot(target, snapshot())).resolves.toBe(true);
      expect(readOmniMindStorageSnapshot(target)).toEqual(snapshot());
      expect(FS.readdirSync(directory)).toEqual(["snapshot.json"]);

      await acknowledgeOmniMindStorageSnapshot(target);
      expect(readOmniMindStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects malformed, disallowed, and oversized snapshots", () => {
    expect(validateOmniMindStorageSnapshot({ version: 1 })).toBeNull();
    expect(
      validateOmniMindStorageSnapshot({
        ...snapshot(),
        entries: { "foreign:theme": "dark" },
      }),
    ).toBeNull();
    expect(
      validateOmniMindStorageSnapshot({
        ...snapshot(),
        entries: { "omnimind:large": "x".repeat(OMNIMIND_STORAGE_SNAPSHOT_MAX_BYTES) },
      }),
    ).toBeNull();
  });

  it("accepts renderer snapshots containing large composer drafts", () => {
    const largeDraft = "x".repeat(2 * 1024 * 1024);

    expect(
      validateOmniMindStorageSnapshot({
        ...snapshot(),
        entries: { "omnimind:composer-drafts:v1": largeDraft },
      })?.entries["omnimind:composer-drafts:v1"],
    ).toBe(largeDraft);
  });

  it("does not replace a newer snapshot with an older export", async () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      await saveOmniMindStorageSnapshot(target, snapshot("2026-07-09T01:00:00.000Z"));
      await expect(
        saveOmniMindStorageSnapshot(target, snapshot("2026-07-09T00:00:00.000Z")),
      ).resolves.toBe(false);
      expect(readOmniMindStorageSnapshot(target)?.exportedAt).toBe("2026-07-09T01:00:00.000Z");
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("treats missing and malformed files as absent", () => {
    const directory = FS.mkdtempSync(Path.join(OS.tmpdir(), "omnimind-storage-migration-"));
    const target = Path.join(directory, "snapshot.json");
    try {
      expect(readOmniMindStorageSnapshot(target)).toBeNull();
      FS.writeFileSync(target, "not json");
      expect(readOmniMindStorageSnapshot(target)).toBeNull();
    } finally {
      FS.rmSync(directory, { recursive: true, force: true });
    }
  });
});

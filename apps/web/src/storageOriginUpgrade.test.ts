import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_LOCAL_STORAGE = globalThis.localStorage;

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  } as Storage;
}

describe("storageOriginUpgrade", () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  afterEach(() => {
    globalThis.localStorage = ORIGINAL_LOCAL_STORAGE;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("imports missing keys without overwriting current-origin state", async () => {
    globalThis.localStorage.setItem("omnimind:theme", "current");
    const { importOmniMindStorageSnapshot } = await import("./storageOriginUpgrade");

    expect(
      importOmniMindStorageSnapshot({
        version: 1,
        exportedAt: "2026-07-09T00:00:00.000Z",
        entries: {
          "omnimind:theme": "snapshot",
          "omnimind:composer-drafts:v1": "draft",
        },
      }),
    ).toBe(true);
    expect(globalThis.localStorage.getItem("omnimind:theme")).toBe("current");
    expect(globalThis.localStorage.getItem("omnimind:composer-drafts:v1")).toBe("draft");
  });

  it("rejects an invalid snapshot before writing any entry", async () => {
    const { importOmniMindStorageSnapshot } = await import("./storageOriginUpgrade");
    expect(
      importOmniMindStorageSnapshot({
        version: 1,
        exportedAt: "2026-07-09T00:00:00.000Z",
        entries: {
          "omnimind:theme": "dark",
          "foreign:theme": "light",
        },
      }),
    ).toBe(false);
    expect(globalThis.localStorage.getItem("omnimind:theme")).toBeNull();
  });

  it("imports snapshots containing large composer drafts", async () => {
    const { importOmniMindStorageSnapshot } = await import("./storageOriginUpgrade");
    const largeDraft = "x".repeat(2 * 1024 * 1024);

    expect(
      importOmniMindStorageSnapshot({
        version: 1,
        exportedAt: "2026-07-09T00:00:00.000Z",
        entries: { "omnimind:composer-drafts:v1": largeDraft },
      }),
    ).toBe(true);
    expect(globalThis.localStorage.getItem("omnimind:composer-drafts:v1")).toBe(largeDraft);
  });

  it("keeps the snapshot retryable after a partial storage failure", async () => {
    const { importOmniMindStorageSnapshot } = await import("./storageOriginUpgrade");
    let writes = 0;
    const storage = createMemoryStorage();
    const setItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      writes += 1;
      if (writes === 2) throw new Error("temporarily unavailable");
      setItem(key, value);
    };
    const snapshot = {
      version: 1 as const,
      exportedAt: "2026-07-09T00:00:00.000Z",
      entries: { "omnimind:theme": "dark", "omnimind:composer-drafts:v1": "draft" },
    };

    expect(importOmniMindStorageSnapshot(snapshot, storage)).toBe(false);
    storage.setItem = setItem;
    expect(importOmniMindStorageSnapshot(snapshot, storage)).toBe(true);
    expect(storage.getItem("omnimind:composer-drafts:v1")).toBe("draft");
  });

  it("acknowledges the desktop snapshot only after a complete bootstrap import", async () => {
    const acknowledgeSnapshot = vi.fn(async () => undefined);
    vi.stubGlobal("window", {
      desktopBridge: {
        storageUpgrade: {
          readSnapshot: () => ({
            version: 1,
            exportedAt: "2026-07-09T00:00:00.000Z",
            entries: { "omnimind:theme": "dark" },
          }),
          acknowledgeSnapshot,
        },
      },
    });

    await import("./storageOriginUpgrade");
    await vi.waitFor(() => expect(acknowledgeSnapshot).toHaveBeenCalledOnce());
    expect(globalThis.localStorage.getItem("omnimind:theme")).toBe("dark");
  });

  it("does not acknowledge when renderer storage rejects a write", async () => {
    const acknowledgeSnapshot = vi.fn(async () => undefined);
    globalThis.localStorage = {
      ...createMemoryStorage(),
      setItem: () => {
        throw new Error("unavailable");
      },
    } as Storage;
    vi.stubGlobal("window", {
      desktopBridge: {
        storageUpgrade: {
          readSnapshot: () => ({
            version: 1,
            exportedAt: "2026-07-09T00:00:00.000Z",
            entries: { "omnimind:theme": "dark" },
          }),
          acknowledgeSnapshot,
        },
      },
    });

    await import("./storageOriginUpgrade");
    expect(acknowledgeSnapshot).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import {
  COMPOSER_DRAFT_STORAGE_KEY_V1,
  COMPOSER_DRAFT_STORAGE_KEY_V2,
  isComposerDraftRecoveryRequired,
  migrateComposerDraftStorageV2,
} from "./composerDraftV2Transcode";

const memoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

const selection = {
  state: "selected",
  engineId: "pi",
  runtimeModelId: "provider/model",
  thinking: "high",
  packageGeneration: "package",
  permissionPolicy: "approval-required",
  enforcement: "host-enforced",
  executionTarget: null,
};

const envelope = () =>
  JSON.stringify({
    version: 7,
    state: {
      draftsByThreadId: {
        thread1: { productQueueTransfer: { requestedSelection: selection } },
      },
      draftThreadsByThreadId: { thread1: { requestedSelection: selection } },
    },
  });

describe("composer draft v2 storage migration", () => {
  let storage: Storage;
  beforeEach(() => {
    storage = memoryStorage();
  });

  it("migrates both inventoried selection paths before deleting v1", () => {
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY_V1, envelope());
    expect(migrateComposerDraftStorageV2(storage)).toBe("migrated");
    const state = JSON.parse(storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V2)!).state;
    expect(
      state.draftsByThreadId.thread1.productQueueTransfer.requestedSelection.runtimeChoice,
    ).toMatchObject({ runtimeModelId: "provider/model", thinking: "high" });
    expect(state.draftThreadsByThreadId.thread1.requestedSelection.runtimeChoice).toMatchObject({
      runtimeModelId: "provider/model",
      thinking: "high",
    });
    expect(storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V1)).toBeNull();
  });

  it("keeps v1 and exposes recovery-required when the v2 write cannot be reread", () => {
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY_V1, envelope());
    const broken = {
      ...storage,
      setItem: (key: string, value: string) => {
        if (key !== COMPOSER_DRAFT_STORAGE_KEY_V2) storage.setItem(key, value);
      },
    } as Storage;
    expect(migrateComposerDraftStorageV2(broken)).toBe("recovery-required");
    expect(storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V1)).toBe(envelope());
    expect(isComposerDraftRecoveryRequired()).toBe(true);
  });

  it("resumes from validated v2 and cleans stale v1 without rewriting v2", () => {
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY_V1, "malformed-old");
    const first = memoryStorage();
    first.setItem(COMPOSER_DRAFT_STORAGE_KEY_V1, envelope());
    migrateComposerDraftStorageV2(first);
    const v2 = first.getItem(COMPOSER_DRAFT_STORAGE_KEY_V2)!;
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY_V2, v2);
    expect(migrateComposerDraftStorageV2(storage)).toBe("recovered-v2");
    expect(storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V2)).toBe(v2);
    expect(storage.getItem(COMPOSER_DRAFT_STORAGE_KEY_V1)).toBeNull();
  });
});

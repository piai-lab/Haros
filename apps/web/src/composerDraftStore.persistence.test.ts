import type { ConversationHistoryPlanId } from "~/historicalConversation";
import { ProjectId, ThreadId } from "@omnimind/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import * as FS from "node:fs";
import * as OS from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { partializeComposerDraftStoreState, useComposerDraftStore } from "./composerDraftStore";
import { COMPOSER_DRAFT_STORAGE_KEY } from "./composerDraftDomain";
import { normalizeCurrentPersistedComposerDraftStoreState } from "./composerDraftPersistence";
import {
  makeImage,
  makeQueuedChatTurn,
  makeQueuedTurn,
  makeTerminalContext,
  modelSelection,
  resetComposerDraftStore,
} from "./composerDraftStoreTestFixtures";
import { createDeferredPersistStorage, flushStorageBeforePageHide } from "./lib/storage";
import {
  INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
  insertInlineTerminalContextPlaceholder,
} from "./lib/terminalContext";

describe("composerDraftStore generation-1 persisted-state hydration", () => {
  const emptyState = {
    draftsByThreadId: {},
    draftThreadsByThreadId: {},
    projectDraftThreadIdByProjectId: {},
    stickyModelSelectionByProvider: {},
    stickyActiveProvider: null,
  };
  it("accepts the exact current empty state", () => {
    expect(normalizeCurrentPersistedComposerDraftStoreState(emptyState)).toEqual(emptyState);
  });

  it.each([null, {}, { draftsByThreadId: {} }])(
    "rejects absent or partial donor state %#",
    (candidate) => {
      expect(() => normalizeCurrentPersistedComposerDraftStoreState(candidate)).toThrow();
    },
  );

  it.each(["stickyModelSelectionByProvider", "stickyActiveProvider"] as const)(
    "rejects missing required current field %s",
    (field) => {
      const candidate = { ...emptyState } as Record<string, unknown>;
      delete candidate[field];
      expect(() => normalizeCurrentPersistedComposerDraftStoreState(candidate)).toThrow();
    },
  );

  it("rejects unknown fields instead of silently stripping them", () => {
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({ ...emptyState, donorField: true }),
    ).toThrow();
    const threadId = ThreadId.makeUnsafe("thread-excess-field");
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftsByThreadId: {
          [threadId]: { prompt: "x", attachments: [], donorField: true },
        },
      }),
    ).toThrow();
  });

  it("rejects a draft-thread without the current entry point", () => {
    const threadId = ThreadId.makeUnsafe("thread-missing-entry-point");
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftThreadsByThreadId: {
          [threadId]: {
            projectId: ProjectId.makeUnsafe("project-missing-entry-point"),
            createdAt: "2026-08-07T00:00:00.000Z",
            runtimeMode: "full-access",
            interactionMode: "default",
            branch: null,
            worktreePath: null,
            workingDirectory: null,
            envMode: "local",
          },
        },
      }),
    ).toThrow();
  });

  it("accepts current project mappings and selections without conversion", () => {
    const projectId = ProjectId.makeUnsafe("project-hydration");
    const threadId = ThreadId.makeUnsafe("thread-hydration");
    const mappingKey = `${projectId}::terminal`;
    const currentState = {
      draftsByThreadId: {
        [threadId]: {
          prompt: "Review these selections",
          attachments: [],
          assistantSelections: [
            {
              id: "assistant-selection-1",
              assistantMessageId: "assistant-message-1",
              text: "selected assistant text",
            },
          ],
          fileComments: [
            {
              id: "file-comment-1",
              path: "src/example.ts",
              startLine: 8,
              endLine: 8,
              text: "selected file text",
            },
          ],
        },
      },
      draftThreadsByThreadId: {
        [threadId]: {
          projectId,
          createdAt: "2026-07-25T00:00:00.000Z",
          runtimeMode: "full-access" as const,
          interactionMode: "default" as const,
          entryPoint: "terminal" as const,
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          envMode: "local" as const,
        },
      },
      projectDraftThreadIdByProjectId: { [mappingKey]: threadId },
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    };

    expect(normalizeCurrentPersistedComposerDraftStoreState(currentState)).toEqual(currentState);
  });

  it("rejects the retired prompt-history string shape", () => {
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftsByThreadId: {
          [ThreadId.makeUnsafe("thread-retired-history")]: {
            prompt: "",
            attachments: [],
            promptHistorySavedDraft: "retired donor draft",
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    { modelSelectionByProvider: {} },
    { activeProvider: null },
  ])("rejects an incomplete per-draft model-selection pair %#", (partial) => {
    const threadId = ThreadId.makeUnsafe("thread-incomplete-model-pair");
    expect(() =>
      normalizeCurrentPersistedComposerDraftStoreState({
        ...emptyState,
        draftsByThreadId: {
          [threadId]: { prompt: "", attachments: [], ...partial },
        },
      }),
    ).toThrow();
  });
});

describe("composerDraftStore generation-1 storage authority", () => {
  const witnessSymbol = Symbol.for("omnimind.composer-draft-witness");
  const emptyState = {
    draftsByThreadId: {},
    draftThreadsByThreadId: {},
    projectDraftThreadIdByProjectId: {},
    stickyModelSelectionByProvider: {},
    stickyActiveProvider: null,
  };
  const distinctState = {
    ...emptyState,
    draftsByThreadId: {
      "thread-web-witness": { prompt: "whole distinct draft", attachments: [] },
    },
  };
  const exactEmptyEnvelope = JSON.stringify({ generation: 1, state: emptyState });
  const exactDistinctEnvelope = JSON.stringify({ generation: 1, state: distinctState });

  const loadWithStorage = async (initial: Readonly<Record<string, string>>) => {
    const values = new Map(Object.entries(initial));
    const storage = {
      getItem: vi.fn((name: string) => {
        if (
          name === "omnimind:composer-drafts:v1" ||
          name === "omnimind:composer-drafts:v2"
        ) {
          throw new Error("legacy draft bytes must not be read");
        }
        return values.get(name) ?? null;
      }),
      setItem: vi.fn((name: string, value: string) => values.set(name, value)),
      removeItem: vi.fn((name: string) => values.delete(name)),
    };
    for (const key of Object.keys(initial)) {
      Object.defineProperty(storage, key, { configurable: true, enumerable: true, value: true });
    }
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const module = await import("./composerDraftStore");
    return { module, storage, values };
  };

  type LoadedStorage = Awaited<ReturnType<typeof loadWithStorage>>;
  type WebCapabilityCase = {
    readonly id: string;
    readonly owner: string;
    readonly family: "normal" | "fault" | "race" | "kill";
    readonly stateId: string;
    readonly operationOrBarrierId: string;
    readonly site: string;
    readonly ordinal: number | "single";
    readonly convergenceStateId: string | "none";
  };

  const loadCapabilityManifest = async (): Promise<readonly WebCapabilityCase[]> => {
    const verifier = await import(
      pathToFileURL(
        path.resolve(
          import.meta.dirname,
          "../../../scripts/product-truth/first-public-capability-verifier.ts",
        ),
      ).href
    ) as {
      readonly generateFirstPublicManifest: () => {
        readonly cases: readonly WebCapabilityCase[];
      };
    };
    return verifier.generateFirstPublicManifest().cases;
  };

  const readGeneration = (fixture: LoadedStorage): unknown => {
    const storage = fixture.module.useComposerDraftStore.persist.getOptions().storage as {
      readonly getItem: (name: string) => unknown;
    };
    return storage.getItem(COMPOSER_DRAFT_STORAGE_KEY);
  };

  const writeGeneration = (fixture: LoadedStorage): void => {
    const storage = fixture.module.useComposerDraftStore.persist.getOptions()
      .storage as unknown as {
      readonly setItem: (
        name: string,
        value: { readonly state: unknown; readonly version: number },
      ) => unknown;
      readonly flush: () => void;
    };
    fixture.module.useComposerDraftStore
      .getState()
      .setPrompt(ThreadId.makeUnsafe("thread-web-witness"), "whole distinct draft");
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY, {
      state: fixture.module.useComposerDraftStore.getState(),
      version: 1,
    });
    storage.flush();
  };

  afterEach(() => {
    Reflect.deleteProperty(globalThis, witnessSymbol);
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("creates and rereads the exact g1 envelope from clean absence", async () => {
    const { storage, values } = await loadWithStorage({});
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      COMPOSER_DRAFT_STORAGE_KEY,
      JSON.stringify({ generation: 1, state: emptyState }),
    );
    expect(storage.getItem.mock.calls.map(([key]) => key)).toEqual([
      COMPOSER_DRAFT_STORAGE_KEY,
      COMPOSER_DRAFT_STORAGE_KEY,
      COMPOSER_DRAFT_STORAGE_KEY,
    ]);
    expect(values.has(COMPOSER_DRAFT_STORAGE_KEY)).toBe(true);
  });

  it("directly witnesses the exact Web read and write operation surfaces", async () => {
    const manifest = await loadCapabilityManifest();
    const readOwner = "apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope";
    const writeOwner = "apps/web/src/composerDraftStore.ts#writeAndVerifyComposerDraftEnvelope";

    const readFixture = await loadWithStorage({});
    readFixture.values.delete(COMPOSER_DRAFT_STORAGE_KEY);
    readFixture.storage.getItem.mockClear();
    readFixture.storage.setItem.mockClear();
    const readObserved: string[] = [];
    Reflect.set(globalThis, witnessSymbol, {
      operation: (operationId: string, site: string, ordinal: number | "single") =>
        readObserved.push(`${operationId}:${site}:${ordinal}`),
    });
    const readStorage = readFixture.module.useComposerDraftStore.persist.getOptions().storage as {
      readonly getItem: (name: string) => unknown;
    };
    readStorage.getItem(COMPOSER_DRAFT_STORAGE_KEY);
    expect(readObserved.sort()).toEqual(
      manifest
        .filter((item) => item.owner === readOwner && item.family === "fault")
        .map((item) => `${item.operationOrBarrierId}:${item.site}:${item.ordinal}`)
        .sort(),
    );

    Reflect.deleteProperty(globalThis, witnessSymbol);
    const exact = JSON.stringify({ generation: 1, state: emptyState });
    const writeFixture = await loadWithStorage({ [COMPOSER_DRAFT_STORAGE_KEY]: exact });
    writeFixture.storage.getItem.mockClear();
    writeFixture.storage.setItem.mockClear();
    const writeObserved: string[] = [];
    Reflect.set(globalThis, witnessSymbol, {
      operation: (operationId: string, site: string, ordinal: number | "single") =>
        writeObserved.push(`${operationId}:${site}:${ordinal}`),
    });
    const writeStorage = writeFixture.module.useComposerDraftStore.persist.getOptions()
      .storage as unknown as {
      readonly setItem: (
        name: string,
        value: { readonly state: unknown; readonly version: number },
      ) => unknown;
      readonly flush: () => void;
    };
    writeStorage.setItem(
      COMPOSER_DRAFT_STORAGE_KEY,
      { state: writeFixture.module.useComposerDraftStore.getState(), version: 1 },
    );
    writeStorage.flush();
    expect(writeObserved.sort()).toEqual(
      manifest
        .filter((item) => item.owner === writeOwner && item.family === "fault")
        .map((item) => `${item.operationOrBarrierId}:${item.site}:${item.ordinal}`)
        .sort(),
    );
  });

  it("directly witnesses every frozen Web read and write normal state", async () => {
    const manifest = await loadCapabilityManifest();
    const readOwner = "apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope";
    const writeOwner = "apps/web/src/composerDraftStore.ts#writeAndVerifyComposerDraftEnvelope";
    const stateFixtures = [
      { suffix: "clean", initial: { unrelated: "preserved" }, accept: true, clearCurrent: true },
      {
        suffix: "v1",
        initial: { unrelated: "preserved", "omnimind:composer-drafts:v1": "opaque-v1" },
        accept: false,
      },
      {
        suffix: "v2",
        initial: { unrelated: "preserved", "omnimind:composer-drafts:v2": "opaque-v2" },
        accept: false,
      },
      {
        suffix: "v1-v2",
        initial: {
          unrelated: "preserved",
          "omnimind:composer-drafts:v1": "opaque-v1",
          "omnimind:composer-drafts:v2": "opaque-v2",
        },
        accept: false,
      },
      {
        suffix: "existing-exact",
        initial: { unrelated: "preserved", [COMPOSER_DRAFT_STORAGE_KEY]: exactEmptyEnvelope },
        accept: true,
      },
      {
        suffix: "partial",
        initial: {
          unrelated: "preserved",
          [COMPOSER_DRAFT_STORAGE_KEY]: JSON.stringify({ generation: 1 }),
        },
        accept: false,
      },
      {
        suffix: "old",
        initial: {
          unrelated: "preserved",
          [COMPOSER_DRAFT_STORAGE_KEY]: JSON.stringify({ generation: 0, state: emptyState }),
        },
        accept: false,
      },
      {
        suffix: "future",
        initial: {
          unrelated: "preserved",
          [COMPOSER_DRAFT_STORAGE_KEY]: JSON.stringify({ generation: 2, state: emptyState }),
        },
        accept: false,
      },
      {
        suffix: "contradictory",
        initial: {
          unrelated: "preserved",
          [COMPOSER_DRAFT_STORAGE_KEY]: JSON.stringify({
            generation: 1,
            state: { ...emptyState, retiredField: true },
          }),
        },
        accept: false,
      },
    ] as const;
    const readWitnessed: string[] = [];
    for (const state of stateFixtures) {
      const fixture = await loadWithStorage(state.initial);
      if ("clearCurrent" in state && state.clearCurrent)
        fixture.values.delete(COMPOSER_DRAFT_STORAGE_KEY);
      fixture.storage.getItem.mockClear();
      fixture.storage.setItem.mockClear();
      const before = Object.fromEntries(fixture.values);
      let caught: unknown;
      let result: unknown;
      try {
        result = readGeneration(fixture);
      } catch (cause) {
        caught = cause;
      }
      if (state.accept) {
        expect(caught, `read normal state ${state.suffix}`).toBeUndefined();
        expect(result).toBeDefined();
        expect(fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY)).toBe(exactEmptyEnvelope);
      } else {
        expect(caught, `read normal state ${state.suffix}`).toBeInstanceOf(Error);
        expect(Object.fromEntries(fixture.values)).toEqual(before);
        expect(fixture.storage.setItem).not.toHaveBeenCalled();
      }
      expect(fixture.values.get("unrelated")).toBe("preserved");
      expect(
        fixture.storage.getItem.mock.calls.filter(([name]) =>
          name === "omnimind:composer-drafts:v1" || name === "omnimind:composer-drafts:v2"),
      ).toEqual([]);
      const selected = manifest.find(
        (item) => item.owner === readOwner && item.family === "normal" &&
          item.stateId === `web-read.${state.suffix}`,
      );
      expect(selected).toBeDefined();
      readWitnessed.push(selected!.id);
    }
    expect(readWitnessed.sort()).toEqual(
      manifest
        .filter((item) => item.owner === readOwner && item.family === "normal")
        .map((item) => item.id)
        .sort(),
    );

    const writeWitnessed: string[] = [];
    for (const state of stateFixtures) {
      const fixture = await loadWithStorage(state.initial);
      if ("clearCurrent" in state && state.clearCurrent)
        fixture.values.delete(COMPOSER_DRAFT_STORAGE_KEY);
      fixture.storage.getItem.mockClear();
      fixture.storage.setItem.mockClear();
      const before = Object.fromEntries(fixture.values);
      let caught: unknown;
      try {
        writeGeneration(fixture);
      } catch (cause) {
        caught = cause;
      }
      if (state.accept) {
        expect(caught, `write normal state ${state.suffix}`).toBeUndefined();
        const written = fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY);
        expect(written).toBeDefined();
        const envelope = JSON.parse(written!) as { generation: unknown; state: unknown };
        expect(envelope.generation).toBe(1);
        expect(() => normalizeCurrentPersistedComposerDraftStoreState(envelope.state)).not.toThrow();
        expect(written).not.toBe(exactEmptyEnvelope);
        expect(fixture.storage.setItem).toHaveBeenCalledTimes(1);
      } else {
        expect(caught, `write normal state ${state.suffix}`).toBeInstanceOf(Error);
        expect(Object.fromEntries(fixture.values)).toEqual(before);
        expect(fixture.storage.setItem).not.toHaveBeenCalled();
      }
      expect(fixture.values.get("unrelated")).toBe("preserved");
      expect(
        fixture.storage.getItem.mock.calls.filter(([name]) =>
          name === "omnimind:composer-drafts:v1" || name === "omnimind:composer-drafts:v2"),
      ).toEqual([]);
      const selected = manifest.find(
        (item) => item.owner === writeOwner && item.family === "normal" &&
          item.stateId === `web-write.${state.suffix}`,
      );
      expect(selected).toBeDefined();
      writeWitnessed.push(selected!.id);
    }
    expect(writeWitnessed.sort()).toEqual(
      manifest
        .filter((item) => item.owner === writeOwner && item.family === "normal")
        .map((item) => item.id)
        .sort(),
    );
  });

  it("directly injects every frozen Web read and write operation fault", async () => {
    const manifest = await loadCapabilityManifest();
    const readOwner = "apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope";
    const writeOwner = "apps/web/src/composerDraftStore.ts#writeAndVerifyComposerDraftEnvelope";
    const readFaults = manifest.filter(
      (item) => item.owner === readOwner && item.family === "fault",
    );
    const readWitnessed: string[] = [];
    for (const selected of readFaults) {
      const fixture = await loadWithStorage({ unrelated: "preserved" });
      fixture.values.delete(COMPOSER_DRAFT_STORAGE_KEY);
      fixture.storage.getItem.mockClear();
      fixture.storage.setItem.mockClear();
      Reflect.set(globalThis, witnessSymbol, {
        operation: (operationId: string, site: string, ordinal: number | "single") => {
          if (
            operationId === selected.operationOrBarrierId &&
            site === selected.site &&
            ordinal === selected.ordinal
          ) {
            readWitnessed.push(selected.id);
            throw new Error(`PORT_FAULT:${operationId}:${site}:${ordinal}`);
          }
        },
      });
      let caught: unknown;
      try {
        readGeneration(fixture);
      } catch (cause) {
        caught = cause;
      } finally {
        Reflect.deleteProperty(globalThis, witnessSymbol);
      }
      expect(caught, selected.id).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain(
        `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
      );
      expect(fixture.values.get("unrelated")).toBe("preserved");
      const current = fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY);
      if (current !== undefined) expect(() => JSON.parse(current)).not.toThrow();
      expect(
        fixture.storage.getItem.mock.calls.filter(([name]) =>
          name === "omnimind:composer-drafts:v1" || name === "omnimind:composer-drafts:v2"),
      ).toEqual([]);
    }
    expect(readWitnessed.sort()).toEqual(readFaults.map((item) => item.id).sort());

    const writeFaults = manifest.filter(
      (item) => item.owner === writeOwner && item.family === "fault",
    );
    const writeWitnessed: string[] = [];
    for (const selected of writeFaults) {
      const fixture = await loadWithStorage({
        unrelated: "preserved",
        [COMPOSER_DRAFT_STORAGE_KEY]: exactEmptyEnvelope,
      });
      fixture.storage.getItem.mockClear();
      fixture.storage.setItem.mockClear();
      Reflect.set(globalThis, witnessSymbol, {
        operation: (operationId: string, site: string, ordinal: number | "single") => {
          if (
            operationId === selected.operationOrBarrierId &&
            site === selected.site &&
            ordinal === selected.ordinal
          ) {
            writeWitnessed.push(selected.id);
            throw new Error(`PORT_FAULT:${operationId}:${site}:${ordinal}`);
          }
        },
      });
      let caught: unknown;
      try {
        writeGeneration(fixture);
      } catch (cause) {
        caught = cause;
      } finally {
        Reflect.deleteProperty(globalThis, witnessSymbol);
      }
      expect(caught, selected.id).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain(
        `PORT_FAULT:${selected.operationOrBarrierId}:${selected.site}:${selected.ordinal}`,
      );
      expect(fixture.values.get("unrelated")).toBe("preserved");
      const current = fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY);
      expect(current).toBeDefined();
      expect(() => JSON.parse(current!)).not.toThrow();
      expect(
        fixture.storage.getItem.mock.calls.filter(([name]) =>
          name === "omnimind:composer-drafts:v1" || name === "omnimind:composer-drafts:v2"),
      ).toEqual([]);
    }
    expect(writeWitnessed.sort()).toEqual(writeFaults.map((item) => item.id).sort());
  });

  it("directly runs every frozen Web read and write separate-writer race", async () => {
    const manifest = await loadCapabilityManifest();
    const readOwner = "apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope";
    const writeOwner = "apps/web/src/composerDraftStore.ts#writeAndVerifyComposerDraftEnvelope";
    const readRaces = manifest.filter(
      (item) => item.owner === readOwner && item.family === "race",
    );
    const readWitnessed: string[] = [];
    for (const selected of readRaces) {
      const fixture = await loadWithStorage({ unrelated: "preserved" });
      fixture.values.delete(COMPOSER_DRAFT_STORAGE_KEY);
      fixture.storage.getItem.mockClear();
      fixture.storage.setItem.mockClear();
      Reflect.set(globalThis, witnessSymbol, {
        operation: () => undefined,
        barrier: (barrierId: string) => {
          if (barrierId !== selected.operationOrBarrierId) return;
          readWitnessed.push(selected.id);
          if (barrierId === "web-read-g1-absence-to-create") {
            fixture.values.set(COMPOSER_DRAFT_STORAGE_KEY, exactDistinctEnvelope);
            return;
          }
          const retiredKey = barrierId === "web-read-v1-to-v2"
            ? "omnimind:composer-drafts:v1"
            : "omnimind:composer-drafts:v2";
          fixture.values.set(retiredKey, "opaque-separate-writer");
          Object.defineProperty(fixture.storage, retiredKey, {
            configurable: true,
            enumerable: true,
            value: true,
          });
        },
      });
      let caught: unknown;
      try {
        readGeneration(fixture);
      } catch (cause) {
        caught = cause;
      } finally {
        Reflect.deleteProperty(globalThis, witnessSymbol);
      }
      if (selected.operationOrBarrierId === "web-read-g1-absence-to-create") {
        expect(caught, selected.id).toBeUndefined();
        expect(fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY)).toBe(exactDistinctEnvelope);
      } else {
        expect(caught, selected.id).toBeInstanceOf(Error);
        expect((caught as Error).message).toContain("PREBASELINE_RESET_REQUIRED");
        expect(fixture.values.has(COMPOSER_DRAFT_STORAGE_KEY)).toBe(false);
      }
      expect(fixture.storage.setItem).not.toHaveBeenCalled();
      expect(fixture.values.get("unrelated")).toBe("preserved");
      expect(
        fixture.storage.getItem.mock.calls.filter(([name]) =>
          name === "omnimind:composer-drafts:v1" || name === "omnimind:composer-drafts:v2"),
      ).toEqual([]);
    }
    expect(readWitnessed.sort()).toEqual(readRaces.map((item) => item.id).sort());

    const writeRaces = manifest.filter(
      (item) => item.owner === writeOwner && item.family === "race",
    );
    const writeWitnessed: string[] = [];
    for (const selected of writeRaces) {
      const fixture = await loadWithStorage({
        unrelated: "preserved",
        [COMPOSER_DRAFT_STORAGE_KEY]: exactEmptyEnvelope,
      });
      fixture.storage.getItem.mockClear();
      fixture.storage.setItem.mockClear();
      Reflect.set(globalThis, witnessSymbol, {
        operation: () => undefined,
        barrier: (barrierId: string) => {
          if (barrierId !== selected.operationOrBarrierId) return;
          writeWitnessed.push(selected.id);
          if (barrierId === "web-write-current-read-to-set") {
            fixture.values.set(
              COMPOSER_DRAFT_STORAGE_KEY,
              JSON.stringify({ state: emptyState, generation: 1 }),
            );
            return;
          }
          const retiredKey = barrierId === "web-write-v1-to-v2"
            ? "omnimind:composer-drafts:v1"
            : "omnimind:composer-drafts:v2";
          fixture.values.set(retiredKey, "opaque-separate-writer");
          Object.defineProperty(fixture.storage, retiredKey, {
            configurable: true,
            enumerable: true,
            value: true,
          });
        },
      });
      let caught: unknown;
      try {
        writeGeneration(fixture);
      } catch (cause) {
        caught = cause;
      } finally {
        Reflect.deleteProperty(globalThis, witnessSymbol);
      }
      if (selected.operationOrBarrierId === "web-write-current-read-to-set") {
        expect(caught, selected.id).toBeUndefined();
        const finalValue = fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY);
        expect(finalValue).toBeDefined();
        const envelope = JSON.parse(finalValue!) as { generation: unknown; state: unknown };
        expect(envelope.generation).toBe(1);
        expect(() => normalizeCurrentPersistedComposerDraftStoreState(envelope.state)).not.toThrow();
        expect(fixture.storage.setItem).toHaveBeenCalledTimes(1);
      } else {
        expect(caught, selected.id).toBeInstanceOf(Error);
        expect((caught as Error).message).toContain("PREBASELINE_RESET_REQUIRED");
        expect(fixture.values.get(COMPOSER_DRAFT_STORAGE_KEY)).toBe(exactEmptyEnvelope);
        expect(fixture.storage.setItem).not.toHaveBeenCalled();
      }
      expect(fixture.values.get("unrelated")).toBe("preserved");
      expect(
        fixture.storage.getItem.mock.calls.filter(([name]) =>
          name === "omnimind:composer-drafts:v1" || name === "omnimind:composer-drafts:v2"),
      ).toEqual([]);
    }
    expect(writeWitnessed.sort()).toEqual(writeRaces.map((item) => item.id).sort());
  });

  it("directly converges every frozen Web durable kill from a whole atomic value", async () => {
    const manifest = await loadCapabilityManifest();
    const owners = [
      "apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope",
      "apps/web/src/composerDraftStore.ts#writeAndVerifyComposerDraftEnvelope",
    ] as const;
    const killCases = manifest.filter(
      (item) => owners.includes(item.owner as (typeof owners)[number]) && item.family === "kill",
    );
    expect(killCases).toHaveLength(2);
    const moduleUrl = pathToFileURL(path.resolve(import.meta.dirname, "composerDraftStore.ts")).href;
    const witnessed: string[] = [];
    for (const selected of killCases) {
      const temporary = FS.mkdtempSync(path.join(OS.tmpdir(), "omnimind-web-storage-kill-"));
      const storageFile = path.join(temporary, "local-storage.json");
      const isWrite = selected.owner === owners[1];
      FS.writeFileSync(
        storageFile,
        JSON.stringify({
          unrelated: "preserved",
          ...(isWrite ? { [COMPOSER_DRAFT_STORAGE_KEY]: exactEmptyEnvelope } : {}),
        }),
        { mode: 0o600 },
      );
      const storagePrelude = `
        const FS = await import("node:fs");
        const Path = await import("node:path");
        const storageFile = ${JSON.stringify(storageFile)};
        const readAll = () => JSON.parse(FS.readFileSync(storageFile, "utf8"));
        const replaceAll = (next) => {
          const scratch = storageFile + "." + process.pid + ".tmp";
          const handle = FS.openSync(scratch, "wx", 0o600);
          try {
            FS.writeSync(handle, JSON.stringify(next));
            FS.fsyncSync(handle);
          } finally {
            FS.closeSync(handle);
          }
          FS.renameSync(scratch, storageFile);
          const parent = FS.openSync(Path.dirname(storageFile), "r");
          try { FS.fsyncSync(parent); } finally { FS.closeSync(parent); }
        };
        const localStorage = {
          getItem(name) { return readAll()[name] ?? null; },
          setItem(name, value) { const next = readAll(); next[name] = value; replaceAll(next); },
          removeItem(name) { const next = readAll(); delete next[name]; replaceAll(next); },
        };
        for (const key of Object.keys(readAll()))
          Object.defineProperty(localStorage, key, { configurable: true, enumerable: true, value: true });
        globalThis.localStorage = localStorage;
      `;
      const killScript = `${storagePrelude}
        globalThis[Symbol.for("omnimind.composer-draft-witness")] = {
          operation(id, site, ordinal) {
            if (id === ${JSON.stringify(selected.operationOrBarrierId)} && site === "after" && ordinal === "single")
              process.kill(process.pid, "SIGKILL");
          },
        };
        const module = await import(${JSON.stringify(moduleUrl)});
        ${isWrite ? `
          module.useComposerDraftStore.getState().setPrompt("thread-web-kill", "durable whole draft");
          const storage = module.useComposerDraftStore.persist.getOptions().storage;
          storage.setItem(${JSON.stringify(COMPOSER_DRAFT_STORAGE_KEY)}, {
            state: module.useComposerDraftStore.getState(),
            version: 1,
          });
          storage.flush();
        ` : ""}
      `;
      try {
        const killed = spawnSync("bun", ["-e", killScript], {
          encoding: "utf8",
          timeout: 10_000,
        });
        expect(killed.signal, `${selected.id}\n${killed.stderr}`).toBe("SIGKILL");
        witnessed.push(selected.id);
        const afterKill = JSON.parse(FS.readFileSync(storageFile, "utf8")) as Record<string, string>;
        expect(afterKill.unrelated).toBe("preserved");
        const current = afterKill[COMPOSER_DRAFT_STORAGE_KEY];
        expect(current).toBeDefined();
        const envelope = JSON.parse(current!) as { generation: unknown; state: unknown };
        expect(envelope.generation).toBe(1);
        expect(() => normalizeCurrentPersistedComposerDraftStoreState(envelope.state)).not.toThrow();
        const durableBytes = FS.readFileSync(storageFile);
        const convergenceScript = `${storagePrelude}
          const module = await import(${JSON.stringify(moduleUrl)});
          const storage = module.useComposerDraftStore.persist.getOptions().storage;
          const result = storage.getItem(${JSON.stringify(COMPOSER_DRAFT_STORAGE_KEY)});
          if (!result || result.version !== 1) process.exit(23);
        `;
        const converged = spawnSync("bun", ["-e", convergenceScript], {
          encoding: "utf8",
          timeout: 10_000,
        });
        expect(converged.status, `${selected.id}\n${converged.stderr}`).toBe(0);
        expect(FS.readFileSync(storageFile)).toEqual(durableBytes);
        expect(selected.convergenceStateId).toBe("web.atomic-value");
      } finally {
        FS.rmSync(temporary, { recursive: true });
      }
    }
    expect(witnessed.sort()).toEqual(killCases.map((item) => item.id).sort());
  }, 30_000);

  it.each([
    ["v1", { "omnimind:composer-drafts:v1": "not-json-v1" }],
    ["v2", { "omnimind:composer-drafts:v2": "not-json-v2" }],
    [
      "v1+v2",
      {
        "omnimind:composer-drafts:v1": "not-json-v1",
        "omnimind:composer-drafts:v2": "not-json-v2",
      },
    ],
    [
      "legacy+g1",
      {
        "omnimind:composer-drafts:v1": "not-json-v1",
        [COMPOSER_DRAFT_STORAGE_KEY]: JSON.stringify({ generation: 1, state: emptyState }),
      },
    ],
  ] as const)("refuses %s presence before reading or writing g1", async (_label, initial) => {
    const { storage, values } = await loadWithStorage(initial);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(Object.fromEntries(values)).toEqual(initial);
  });

  it.each([
    JSON.stringify({ generation: 2, state: emptyState }),
    JSON.stringify({ generation: 1, state: { ...emptyState, unknownField: true } }),
  ])("refuses an invalid current envelope without rewriting it", async (raw) => {
    const values = new Map([[COMPOSER_DRAFT_STORAGE_KEY, raw]]);
    const storage = {
      getItem: vi.fn((name: string) => values.get(name) ?? null),
      setItem: vi.fn((name: string, value: string) => values.set(name, value)),
      removeItem: vi.fn((name: string) => values.delete(name)),
    };
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const module = await import("./composerDraftStore");
    const generationStorage = module.useComposerDraftStore.persist.getOptions().storage as {
      readonly getItem: (name: string) => unknown;
    };
    expect(() => generationStorage.getItem(COMPOSER_DRAFT_STORAGE_KEY)).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(values.get(COMPOSER_DRAFT_STORAGE_KEY)).toBe(raw);
  });
});

describe("composerDraftStore restored source proposed plan", () => {
  const threadId = ThreadId.makeUnsafe("thread-restored-source");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("persists restored plan source metadata with composer drafts", () => {
    const restoredSource = {
      threadId,
      restoredPrompt: "Implement the accepted plan",
      sourceProposedPlan: {
        threadId,
        planId: "plan-restored-source",
      },
    };
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, restoredSource.restoredPrompt);
    store.setRestoredSourceProposedPlan(threadId, restoredSource);

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<
        string,
        {
          restoredSourceProposedPlan?: unknown;
        }
      >;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.restoredSourceProposedPlan).toEqual(
      restoredSource,
    );

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.restoredSourceProposedPlan).toEqual(
      restoredSource,
    );
  });
});

describe("composerDraftStore provider references", () => {
  const threadId = ThreadId.makeUnsafe("thread-provider-refs");

  beforeEach(() => {
    resetComposerDraftStore();
  });

  it("persists selected plugin mentions with regular composer drafts", () => {
    const selectedSkill = { name: "check-code", path: "/skills/check-code" };
    const selectedMention = { name: "linear", path: "plugin://linear" };
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "Use @linear with /check-code");
    store.setSkills(threadId, [selectedSkill]);
    store.setMentions(threadId, [selectedMention]);

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<
        string,
        {
          skills?: Array<Record<string, unknown>>;
          mentions?: Array<Record<string, unknown>>;
        }
      >;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.skills).toEqual([selectedSkill]);
    expect(persistedState.draftsByThreadId?.[threadId]?.mentions).toEqual([selectedMention]);

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.skills).toEqual([selectedSkill]);
    expect(mergedState.draftsByThreadId[threadId]?.mentions).toEqual([selectedMention]);
  });
});

describe("composerDraftStore terminal contexts", () => {
  const threadId = ThreadId.makeUnsafe("thread-dedupe");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
      stickyModelSelectionByProvider: {},
      stickyActiveProvider: null,
    });
  });

  it("deduplicates identical terminal contexts by selection signature", () => {
    const first = makeTerminalContext({ id: "ctx-1" });
    const duplicate = makeTerminalContext({ id: "ctx-2" });

    useComposerDraftStore.getState().addTerminalContexts(threadId, [first, duplicate]);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.terminalContexts.map((context) => context.id)).toEqual(["ctx-1"]);
  });

  it("clears terminal contexts when clearing composer content", () => {
    useComposerDraftStore
      .getState()
      .addTerminalContext(threadId, makeTerminalContext({ id: "ctx-1" }));

    useComposerDraftStore.getState().clearComposerContent(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("inserts terminal contexts at the requested inline prompt position", () => {
    const firstInsertion = insertInlineTerminalContextPlaceholder("alpha beta", 6);
    const secondInsertion = insertInlineTerminalContextPlaceholder(firstInsertion.prompt, 0);

    expect(
      useComposerDraftStore
        .getState()
        .insertTerminalContext(
          threadId,
          firstInsertion.prompt,
          makeTerminalContext({ id: "ctx-1" }),
          firstInsertion.contextIndex,
        ),
    ).toBe(true);
    expect(
      useComposerDraftStore.getState().insertTerminalContext(
        threadId,
        secondInsertion.prompt,
        makeTerminalContext({
          id: "ctx-2",
          terminalLabel: "Terminal 2",
          lineStart: 9,
          lineEnd: 10,
        }),
        secondInsertion.contextIndex,
      ),
    ).toBe(true);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.prompt).toBe(
      `${INLINE_TERMINAL_CONTEXT_PLACEHOLDER} alpha ${INLINE_TERMINAL_CONTEXT_PLACEHOLDER} beta`,
    );
    expect(draft?.terminalContexts.map((context) => context.id)).toEqual(["ctx-2", "ctx-1"]);
  });

  it("omits terminal context text from persisted drafts", () => {
    useComposerDraftStore
      .getState()
      .addTerminalContext(threadId, makeTerminalContext({ id: "ctx-persist" }));

    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<string, { terminalContexts?: Array<Record<string, unknown>> }>;
    };

    expect(
      persistedState.draftsByThreadId?.[threadId]?.terminalContexts?.[0],
      "Expected terminal context metadata to be persisted.",
    ).toMatchObject({
      id: "ctx-persist",
      terminalId: "default",
      terminalLabel: "Terminal 1",
      lineStart: 4,
      lineEnd: 5,
    });
    expect(
      persistedState.draftsByThreadId?.[threadId]?.terminalContexts?.[0]?.text,
    ).toBeUndefined();
  });

  it("hydrates persisted terminal contexts without in-memory snapshot text", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const mergedState = persistApi.getOptions().merge(
      {
        draftsByThreadId: {
          [threadId]: {
            prompt: INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
            attachments: [],
            terminalContexts: [
              {
                id: "ctx-rehydrated",
                threadId,
                createdAt: "2026-03-13T12:00:00.000Z",
                terminalId: "default",
                terminalLabel: "Terminal 1",
                lineStart: 4,
                lineEnd: 5,
              },
            ],
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyModelSelectionByProvider: {},
        stickyActiveProvider: null,
      },
      useComposerDraftStore.getInitialState(),
    );

    expect(mergedState.draftsByThreadId[threadId]?.terminalContexts).toMatchObject([
      {
        id: "ctx-rehydrated",
        terminalId: "default",
        terminalLabel: "Terminal 1",
        lineStart: 4,
        lineEnd: 5,
        text: "",
      },
    ]);
  });

  it("refuses malformed persisted drafts during merge", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    expect(() =>
      persistApi.getOptions().merge(
        {
          draftsByThreadId: {
            [threadId]: {
              prompt: "",
              attachments: "not-an-array",
              terminalContexts: "not-an-array",
            },
          },
          draftThreadsByThreadId: {},
          projectDraftThreadIdByProjectId: {},
        },
        useComposerDraftStore.getInitialState(),
      ),
    ).toThrow();
  });

  it("restores provider-scoped selections without leaking effort across providers", () => {
    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const codexSelection = modelSelection("codex", "gpt-5.6-sol", {
      reasoningEffort: "ultra",
    });
    const cursorSelection = modelSelection("cursor", "cursor-auto", {
      reasoningEffort: "high",
    });
    const mergedState = persistApi.getOptions().merge(
      {
        draftsByThreadId: {
          [threadId]: {
            prompt: "",
            attachments: [],
            modelSelectionByProvider: {
              codex: codexSelection,
              cursor: cursorSelection,
            },
            activeProvider: "cursor",
          },
        },
        draftThreadsByThreadId: {},
        projectDraftThreadIdByProjectId: {},
        stickyModelSelectionByProvider: {},
        stickyActiveProvider: null,
      },
      useComposerDraftStore.getInitialState(),
    );

    const draft = mergedState.draftsByThreadId[threadId];
    expect(draft?.modelSelectionByProvider.codex).toEqual(codexSelection);
    expect(draft?.modelSelectionByProvider.cursor).toEqual(cursorSelection);
    expect(draft?.activeProvider).toBe("cursor");
  });
});

describe("composerDraftStore queued follow-ups", () => {
  const threadId = ThreadId.makeUnsafe("thread-queue");
  let originalRevokeObjectUrl: typeof URL.revokeObjectURL;
  let revokeSpy: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    resetComposerDraftStore();
    originalRevokeObjectUrl = URL.revokeObjectURL;
    revokeSpy = vi.fn();
    URL.revokeObjectURL = revokeSpy;
  });

  afterEach(() => {
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("stores queued turns per thread so route switches can rehydrate them", () => {
    const store = useComposerDraftStore.getState();

    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-1"));

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.queuedTurns).toEqual([
      makeQueuedTurn("queued-1"),
    ]);
  });

  it("keeps queued turns when the live composer draft is cleared", () => {
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "temporary prompt");
    store.setSkills(threadId, [{ name: "check-code", path: "/skills/check-code" }]);
    store.setMentions(threadId, [{ name: "linear", path: "plugin://linear" }]);
    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-1"));
    store.clearComposerContent(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toMatchObject({
      prompt: "",
      skills: [],
      mentions: [],
      queuedTurns: [makeQueuedTurn("queued-1")],
    });
  });

  it("drops the draft entry once the last queued turn is removed", () => {
    const store = useComposerDraftStore.getState();

    store.enqueueQueuedTurn(threadId, makeQueuedTurn("queued-1"));
    store.removeQueuedTurn(threadId, "queued-1");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("persists queued chat turns for refresh and restart rehydration", () => {
    const queuedImage = makeImage({
      id: "queued-image-persisted",
      previewUrl: "data:image/png;base64,AA==",
      name: "queued.png",
    });
    const store = useComposerDraftStore.getState();
    store.enqueueQueuedTurn(threadId, makeQueuedChatTurn("queued-chat-1", queuedImage));

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<string, { queuedTurns?: Array<Record<string, unknown>> }>;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.queuedTurns).toHaveLength(1);

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.queuedTurns).toMatchObject([
      {
        id: "queued-chat-1",
        kind: "chat",
        prompt: "queued chat prompt",
        images: [{ name: "queued.png" }],
        sourceProposedPlan: {
          threadId: "thread-source-plan",
          planId: "plan-1",
        },
        terminalContexts: [{ text: "git status\nOn branch main" }],
      },
    ]);
  });

  it("persists restored proposed-plan source for edited queued sends", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, "implement the queued plan");
    store.setRestoredSourceProposedPlan(threadId, {
      threadId,
      restoredPrompt: "implement the queued plan",
      sourceProposedPlan: {
        threadId: ThreadId.makeUnsafe("thread-source-plan"),
        planId: "plan-1",
      },
    });

    const persistApi = useComposerDraftStore.persist as unknown as {
      getOptions: () => {
        partialize: (state: ReturnType<typeof useComposerDraftStore.getState>) => unknown;
        merge: (
          persistedState: unknown,
          currentState: ReturnType<typeof useComposerDraftStore.getState>,
        ) => ReturnType<typeof useComposerDraftStore.getState>;
      };
    };
    const persistedState = partializeComposerDraftStoreState(
      useComposerDraftStore.getState(),
    ) as unknown as {
      draftsByThreadId?: Record<string, { restoredSourceProposedPlan?: unknown }>;
    };

    expect(persistedState.draftsByThreadId?.[threadId]?.restoredSourceProposedPlan).toEqual({
      threadId,
      restoredPrompt: "implement the queued plan",
      sourceProposedPlan: {
        threadId: "thread-source-plan",
        planId: "plan-1",
      },
    });

    const mergedState = persistApi
      .getOptions()
      .merge(persistedState, useComposerDraftStore.getInitialState());

    expect(mergedState.draftsByThreadId[threadId]?.restoredSourceProposedPlan).toEqual({
      threadId,
      restoredPrompt: "implement the queued plan",
      sourceProposedPlan: {
        threadId: "thread-source-plan",
        planId: "plan-1",
      },
    });
  });

  it("revokes queued chat image blob URLs when a queued turn is removed", () => {
    const queuedImage = makeImage({
      id: "queued-image-blob",
      previewUrl: "blob:queued-image-blob",
    });
    const store = useComposerDraftStore.getState();

    store.enqueueQueuedTurn(threadId, makeQueuedChatTurn("queued-chat-blob", queuedImage));
    store.removeQueuedTurn(threadId, "queued-chat-blob");

    expect(revokeSpy).toHaveBeenCalledWith("blob:queued-image-blob");
  });

  it("revokes queued chat image blob URLs when a draft thread is cleared", () => {
    const queuedImage = makeImage({
      id: "queued-image-thread-clear",
      previewUrl: "blob:queued-image-thread-clear",
    });
    const store = useComposerDraftStore.getState();

    store.setProjectDraftThreadId(ProjectId.makeUnsafe("queue-project"), threadId);
    store.enqueueQueuedTurn(threadId, makeQueuedChatTurn("queued-chat-thread-clear", queuedImage));
    store.clearDraftThread(threadId);

    expect(revokeSpy).toHaveBeenCalledWith("blob:queued-image-thread-clear");
  });
});

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((name: string) => store.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    removeItem: vi.fn((name: string) => {
      store.delete(name);
    }),
  };
}

describe("createDeferredPersistStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers partialize + JSON.stringify off the set() path until flush", () => {
    const base = createMockStorage();
    const partialize = vi.fn((state: { readonly value: number }) => ({ value: state.value }));
    const storage = createDeferredPersistStorage<{ readonly value: number }>({
      getStorage: () => base,
      partialize,
    });

    // Rapid set()s must not serialize: neither partialize nor the base write runs.
    storage.setItem("key", { state: { value: 1 }, version: 2 });
    storage.setItem("key", { state: { value: 2 }, version: 2 });
    storage.setItem("key", { state: { value: 3 }, version: 2 });
    expect(partialize).not.toHaveBeenCalled();
    expect(base.setItem).not.toHaveBeenCalled();

    storage.flush();

    // Serialization happens exactly once, over the latest captured state.
    expect(partialize).toHaveBeenCalledTimes(1);
    expect(partialize).toHaveBeenCalledWith({ value: 3 });
    expect(base.setItem).toHaveBeenCalledTimes(1);
    expect(base.setItem).toHaveBeenCalledWith(
      "key",
      JSON.stringify({ state: { value: 3 }, version: 2 }),
    );
  });

  it("produces the same bytes as createJSONStorage would for the same state", () => {
    const base = createMockStorage();
    type FullState = { readonly a: number; readonly secret: string };
    const storage = createDeferredPersistStorage<FullState, { readonly a: number }>({
      getStorage: () => base,
      partialize: (state) => ({ a: state.a }),
    });

    // zustand passes the full state as value.state at runtime (no config partialize).
    const fullState: FullState = { a: 7, secret: "drop" };
    storage.setItem("key", { state: fullState, version: 5 });
    storage.flush();

    // Identical to createJSONStorage(setItem)(name, JSON.stringify({ state: partialize(s), version })).
    expect(base.setItem).toHaveBeenCalledWith(
      "key",
      JSON.stringify({ state: { a: 7 }, version: 5 }),
    );
  });

  it("also writes the pending value when the debounce fires on its own", () => {
    const base = createMockStorage();
    const partialize = vi.fn((state: { readonly value: number }) => state);
    const storage = createDeferredPersistStorage<{ readonly value: number }>({
      getStorage: () => base,
      partialize,
    });

    storage.setItem("key", { state: { value: 1 }, version: 1 });
    expect(base.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(partialize).toHaveBeenCalledTimes(1);
    expect(base.setItem).toHaveBeenCalledTimes(1);
  });

  it("removeItem cancels a pending write and drops the captured state", () => {
    const base = createMockStorage();
    const partialize = vi.fn((state: { readonly value: number }) => state);
    const storage = createDeferredPersistStorage<{ readonly value: number }>({
      getStorage: () => base,
      partialize,
    });

    storage.setItem("key", { state: { value: 1 }, version: 1 });
    storage.removeItem("key");
    storage.flush();

    expect(partialize).not.toHaveBeenCalled();
    expect(base.setItem).not.toHaveBeenCalled();
    expect(base.removeItem).toHaveBeenCalledWith("key");
  });
});

describe("flushStorageBeforePageHide", () => {
  function makeFakeEnv() {
    const windowListeners = new Map<string, () => void>();
    const documentListeners = new Map<string, () => void>();
    const visibility = { value: "visible" };
    return {
      env: {
        window: {
          addEventListener: (type: string, listener: () => void) => {
            windowListeners.set(type, listener);
          },
        },
        document: {
          addEventListener: (type: string, listener: () => void) => {
            documentListeners.set(type, listener);
          },
          get visibilityState() {
            return visibility.value;
          },
        },
      },
      fireWindow: (type: string) => windowListeners.get(type)?.(),
      fireDocument: (type: string) => documentListeners.get(type)?.(),
      setVisibility: (value: string) => {
        visibility.value = value;
      },
    };
  }

  it("flushes on pagehide, beforeunload, and visibilitychange->hidden", () => {
    const flush = vi.fn();
    const harness = makeFakeEnv();
    flushStorageBeforePageHide(flush, harness.env);

    harness.fireWindow("pagehide");
    expect(flush).toHaveBeenCalledTimes(1);

    harness.fireWindow("beforeunload");
    expect(flush).toHaveBeenCalledTimes(2);

    harness.setVisibility("hidden");
    harness.fireDocument("visibilitychange");
    expect(flush).toHaveBeenCalledTimes(3);
  });

  it("does not flush while the document stays visible", () => {
    const flush = vi.fn();
    const harness = makeFakeEnv();
    flushStorageBeforePageHide(flush, harness.env);

    harness.setVisibility("visible");
    harness.fireDocument("visibilitychange");
    expect(flush).not.toHaveBeenCalled();
  });
});

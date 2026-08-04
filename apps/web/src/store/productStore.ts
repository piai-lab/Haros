import {
  PRODUCT_PROTOCOL_VERSION,
  type ProductConversationId,
  type ProductConversationReadModel,
  type ProductConversationSnapshot,
  type ProductFact,
  type ProductFactBatch,
  type ProductQueueItem,
  type ProductShellSnapshot,
} from "@omnimind/contracts";
import { create } from "zustand";

export type ProductProjectionIssue =
  | "sequence-gap"
  | "overflow"
  | "cursor-ahead"
  | "history-unavailable"
  | "scope-mismatch";

export interface ProductProjectionState {
  readonly shellHydrated: boolean;
  readonly shellSequence: number;
  readonly conversations: ProductShellSnapshot["conversations"];
  readonly runtimeCatalog: ProductShellSnapshot["runtimeCatalog"];
  readonly detailSequenceByConversation: Readonly<Record<string, number>>;
  readonly detailByConversation: Readonly<Record<string, ProductConversationReadModel>>;
  readonly detailRetainCountByConversation: Readonly<Record<string, number>>;
  readonly shellIssue: ProductProjectionIssue | null;
  readonly detailIssueByConversation: Readonly<Record<string, ProductProjectionIssue | null>>;
  readonly reconnectGeneration: number;
}

export const initialProductProjectionState: ProductProjectionState = {
  shellHydrated: false,
  shellSequence: 0,
  conversations: [],
  runtimeCatalog: null,
  detailSequenceByConversation: {},
  detailByConversation: {},
  detailRetainCountByConversation: {},
  shellIssue: null,
  detailIssueByConversation: {},
  reconnectGeneration: 0,
};

export type ProductBatchResult = "applied" | "duplicate" | "resnapshot";

function upsertConversation(
  conversations: ProductShellSnapshot["conversations"],
  conversation: ProductShellSnapshot["conversations"][number],
): ProductShellSnapshot["conversations"] {
  const remaining = conversations.filter((candidate) => candidate.id !== conversation.id);
  return [conversation, ...remaining].toSorted(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.id.localeCompare(right.id),
  );
}

function applyDetailFact(
  readModel: ProductConversationReadModel,
  fact: ProductFact,
): ProductConversationReadModel {
  const change = fact.change;
  if (change.kind === "queue-changed") {
    return { ...readModel, queue: change.queue };
  }
  if (change.kind === "entry-admitted") {
    const entries = readModel.entries.some((entry) => entry.id === change.entry.id)
      ? readModel.entries
      : [...readModel.entries, change.entry];
    const runs = readModel.runs.some((run) => run.id === change.run.id)
      ? readModel.runs
      : [...readModel.runs, change.run];
    return { ...readModel, entries, runs };
  }
  if (change.kind === "entry-delta") {
    const existing = readModel.entries.find((entry) => entry.id === change.entryId);
    const updated = existing
      ? { ...existing, text: `${existing.text}${change.delta}` }
      : {
          id: change.entryId,
          conversationId: change.conversationId,
          runId: change.runId,
          role: "assistant" as const,
          text: change.delta,
          createdAt: change.createdAt,
        };
    return {
      ...readModel,
      entries: existing
        ? readModel.entries.map((entry) => (entry.id === change.entryId ? updated : entry))
        : [...readModel.entries, updated],
      streamingEntryIds: readModel.streamingEntryIds.includes(change.entryId)
        ? readModel.streamingEntryIds
        : [...readModel.streamingEntryIds, change.entryId],
    };
  }
  if (change.kind === "entry-replaced") {
    const exists = readModel.entries.some((entry) => entry.id === change.entry.id);
    return {
      ...readModel,
      entries: exists
        ? readModel.entries.map((entry) =>
            entry.id === change.entry.id ? change.entry : entry,
          )
        : [...readModel.entries, change.entry],
    };
  }
  if (change.kind === "entry-removed") {
    return {
      ...readModel,
      entries: readModel.entries.filter((entry) => entry.id !== change.entryId),
      streamingEntryIds: readModel.streamingEntryIds.filter(
        (entryId) => entryId !== change.entryId,
      ),
    };
  }
  if (change.kind === "entry-streaming") {
    return {
      ...readModel,
      streamingEntryIds: change.streaming
        ? readModel.streamingEntryIds.includes(change.entryId)
          ? readModel.streamingEntryIds
          : [...readModel.streamingEntryIds, change.entryId]
        : readModel.streamingEntryIds.filter((entryId) => entryId !== change.entryId),
    };
  }
  if (change.kind === "runtime-activity") {
    const exists = readModel.activities.some(
      (activity) =>
        activity.runId === change.activity.runId &&
        activity.nativeSequence === change.activity.nativeSequence,
    );
    return exists
      ? readModel
      : {
          ...readModel,
          activities: [
            ...readModel.activities,
            change.activity,
          ],
        };
  }
  if (change.kind === "runtime-recovered") {
    const recoveries = readModel.recoveries ?? [];
    const exists = recoveries.some(
      (recovery) =>
        recovery.runId === change.recovery.runId &&
        recovery.snapshotVersion === change.recovery.snapshotVersion,
    );
    return exists
      ? readModel
      : { ...readModel, recoveries: [...recoveries, change.recovery] };
  }
  if (change.kind === "dispatch-changed") {
    return {
      ...readModel,
      conversation: { ...readModel.conversation, receiptState: change.receipt.receipt.state },
      runs: readModel.runs.map((run) =>
        run.id === change.runId
          ? { ...run, receipt: change.receipt, updatedAt: change.receipt.updatedAt }
          : run,
      ),
    };
  }
  return readModel;
}

function issueFromBatch(batch: ProductFactBatch): ProductProjectionIssue | null {
  if (!batch.resnapshotRequired) return null;
  return batch.reason ?? "history-unavailable";
}

export function applyProductShellSnapshot(
  state: ProductProjectionState,
  snapshot: ProductShellSnapshot,
): ProductProjectionState {
  if (snapshot.sequence < state.shellSequence) return state;
  return {
    ...state,
    shellHydrated: true,
    shellSequence: snapshot.sequence,
    conversations: snapshot.conversations,
    runtimeCatalog: snapshot.runtimeCatalog,
    shellIssue: null,
  };
}

export function applyProductConversationSnapshot(
  state: ProductProjectionState,
  snapshot: ProductConversationSnapshot,
): ProductProjectionState {
  const conversationId = snapshot.readModel.conversation.id;
  const currentSequence = state.detailSequenceByConversation[conversationId] ?? 0;
  if (snapshot.sequence < currentSequence) return state;
  return {
    ...state,
    detailSequenceByConversation: {
      ...state.detailSequenceByConversation,
      [conversationId]: snapshot.sequence,
    },
    detailByConversation: {
      ...state.detailByConversation,
      [conversationId]: snapshot.readModel,
    },
    detailIssueByConversation: {
      ...state.detailIssueByConversation,
      [conversationId]: null,
    },
  };
}

export function applyProductQueueItem(
  state: ProductProjectionState,
  item: ProductQueueItem,
): ProductProjectionState {
  const current = state.detailByConversation[item.conversationId];
  if (!current) return state;
  const queue = [...current.queue.filter((candidate) => candidate.id !== item.id), item].toSorted(
    (left, right) => left.position - right.position || left.id.localeCompare(right.id),
  );
  return {
    ...state,
    detailByConversation: {
      ...state.detailByConversation,
      [item.conversationId]: { ...current, queue },
    },
  };
}

export function applyProductFactBatch(
  state: ProductProjectionState,
  batch: ProductFactBatch,
): { readonly state: ProductProjectionState; readonly result: ProductBatchResult } {
  if (batch.protocolVersion !== PRODUCT_PROTOCOL_VERSION) {
    return { state, result: "resnapshot" };
  }
  const isShell = batch.scope.kind === "shell";
  const conversationId = isShell ? null : batch.scope.conversationId;
  let cursor = isShell
    ? state.shellSequence
    : (state.detailSequenceByConversation[conversationId!] ?? 0);
  if (batch.afterSequence > cursor) {
    const issue: ProductProjectionIssue = "sequence-gap";
    return {
      state: isShell
        ? { ...state, shellIssue: issue }
        : {
            ...state,
            detailIssueByConversation: {
              ...state.detailIssueByConversation,
              [conversationId!]: issue,
            },
          },
      result: "resnapshot",
    };
  }
  const reportedIssue = issueFromBatch(batch);
  if (reportedIssue) {
    return {
      state: isShell
        ? { ...state, shellIssue: reportedIssue }
        : {
            ...state,
            detailIssueByConversation: {
              ...state.detailIssueByConversation,
              [conversationId!]: reportedIssue,
            },
          },
      result: "resnapshot",
    };
  }

  let conversations = state.conversations;
  let detail = conversationId ? state.detailByConversation[conversationId] : undefined;
  let applied = false;
  let detailTombstoned = false;
  for (const fact of batch.facts) {
    if (!isShell && fact.conversationId !== conversationId) {
      return {
        state: {
          ...state,
          detailIssueByConversation: {
            ...state.detailIssueByConversation,
            [conversationId!]: "scope-mismatch",
          },
        },
        result: "resnapshot",
      };
    }
    if (fact.sequence <= cursor) continue;
    if (fact.sequence !== cursor + 1) {
      return {
        state: isShell
          ? { ...state, shellIssue: "sequence-gap" }
          : {
              ...state,
              detailIssueByConversation: {
                ...state.detailIssueByConversation,
                [conversationId!]: "sequence-gap",
              },
            },
        result: "resnapshot",
      };
    }
    cursor = fact.sequence;
    applied = true;
    if (isShell) {
      if (fact.change.kind === "conversation-summary") {
        conversations = upsertConversation(conversations, fact.change.conversation);
      } else if (fact.change.kind === "conversation-tombstone") {
        const tombstoneConversationId = fact.change.conversationId;
        conversations = conversations.filter(
          (conversation) => conversation.id !== tombstoneConversationId,
        );
      }
    } else {
      if (fact.change.kind === "conversation-tombstone") {
        detailTombstoned = true;
        continue;
      }
      if (detail) {
        detail = applyDetailFact(detail, fact);
      }
    }
  }
  if (!applied && batch.highWaterSequence > cursor) {
    return {
      state: isShell
        ? { ...state, shellIssue: "sequence-gap" }
        : {
            ...state,
            detailIssueByConversation: {
              ...state.detailIssueByConversation,
              [conversationId!]: "sequence-gap",
            },
          },
      result: "resnapshot",
    };
  }
  const detailByConversation =
    !isShell && conversationId && detail
      ? { ...state.detailByConversation, [conversationId]: detail }
      : state.detailByConversation;
  const catalogFact = isShell
    ? [...batch.facts].reverse().find((fact) => fact.change.kind === "runtime-catalog")
    : undefined;
  let nextState: ProductProjectionState = isShell
    ? {
        ...state,
        conversations,
        runtimeCatalog:
          catalogFact?.change.kind === "runtime-catalog"
            ? catalogFact.change.catalog
            : state.runtimeCatalog,
        shellSequence: cursor,
        shellIssue: null,
      }
    : {
        ...state,
        detailByConversation,
        detailSequenceByConversation: {
          ...state.detailSequenceByConversation,
          [conversationId!]: cursor,
        },
        detailIssueByConversation: {
          ...state.detailIssueByConversation,
          [conversationId!]: null,
        },
      };
  if (detailTombstoned && conversationId) {
    const detailByConversation = { ...nextState.detailByConversation };
    const detailSequenceByConversation = { ...nextState.detailSequenceByConversation };
    const detailIssueByConversation = { ...nextState.detailIssueByConversation };
    delete detailByConversation[conversationId];
    delete detailSequenceByConversation[conversationId];
    delete detailIssueByConversation[conversationId];
    nextState = {
      ...nextState,
      detailByConversation,
      detailSequenceByConversation,
      detailIssueByConversation,
    };
  }
  return { state: nextState, result: applied ? "applied" : "duplicate" };
}

interface ProductStoreActions {
  readonly setShellSnapshot: (snapshot: ProductShellSnapshot) => void;
  readonly setConversationSnapshot: (snapshot: ProductConversationSnapshot) => void;
  readonly setQueueItem: (item: ProductQueueItem) => void;
  readonly applyFactBatch: (batch: ProductFactBatch) => ProductBatchResult;
  readonly markReconnect: () => void;
  readonly retainConversation: (conversationId: ProductConversationId) => void;
  readonly releaseConversation: (conversationId: ProductConversationId) => void;
  readonly clearConversation: (conversationId: ProductConversationId) => void;
  readonly reset: () => void;
}

export type ProductStore = ProductProjectionState & ProductStoreActions;

export const useProductStore = create<ProductStore>((set, get) => ({
  ...initialProductProjectionState,
  setShellSnapshot: (snapshot) => set((state) => applyProductShellSnapshot(state, snapshot)),
  setConversationSnapshot: (snapshot) =>
    set((state) => applyProductConversationSnapshot(state, snapshot)),
  setQueueItem: (item) => set((state) => applyProductQueueItem(state, item)),
  applyFactBatch: (batch) => {
    const result = applyProductFactBatch(get(), batch);
    set(result.state);
    return result.result;
  },
  markReconnect: () =>
    set((state) => ({ ...state, reconnectGeneration: state.reconnectGeneration + 1 })),
  retainConversation: (conversationId) =>
    set((state) => ({
      ...state,
      detailRetainCountByConversation: {
        ...state.detailRetainCountByConversation,
        [conversationId]: (state.detailRetainCountByConversation[conversationId] ?? 0) + 1,
      },
    })),
  releaseConversation: (conversationId) =>
    set((state) => {
      const current = state.detailRetainCountByConversation[conversationId] ?? 0;
      if (current > 1) {
        return {
          ...state,
          detailRetainCountByConversation: {
            ...state.detailRetainCountByConversation,
            [conversationId]: current - 1,
          },
        };
      }
      const detailRetainCountByConversation = { ...state.detailRetainCountByConversation };
      const detailByConversation = { ...state.detailByConversation };
      const detailSequenceByConversation = { ...state.detailSequenceByConversation };
      const detailIssueByConversation = { ...state.detailIssueByConversation };
      delete detailRetainCountByConversation[conversationId];
      delete detailByConversation[conversationId];
      delete detailSequenceByConversation[conversationId];
      delete detailIssueByConversation[conversationId];
      return {
        ...state,
        detailRetainCountByConversation,
        detailByConversation,
        detailSequenceByConversation,
        detailIssueByConversation,
      };
    }),
  clearConversation: (conversationId) =>
    set((state) => {
      const detailByConversation = { ...state.detailByConversation };
      const detailSequenceByConversation = { ...state.detailSequenceByConversation };
      const detailIssueByConversation = { ...state.detailIssueByConversation };
      delete detailByConversation[conversationId];
      delete detailSequenceByConversation[conversationId];
      delete detailIssueByConversation[conversationId];
      return {
        ...state,
        detailByConversation,
        detailSequenceByConversation,
        detailIssueByConversation,
      };
    }),
  reset: () => set({ ...initialProductProjectionState }),
}));

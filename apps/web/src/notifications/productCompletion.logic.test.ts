import {
  ProductConversationId,
  ProductDispatchId,
  ProductEngineBindingId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductRunId,
  ProductWorkspaceId,
  type ProductConversationReadModel,
  type ProductConversationSummary,
  type ProductDispatchReceipt,
} from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  advanceProductCompletionTracker,
  createProductCompletionTrackerState,
  type ProductCompletionTrackerState,
} from "./productCompletion.logic";

const CONVERSATION_ID = ProductConversationId.makeUnsafe("conversation-1");
const CONVERSATION_2_ID = ProductConversationId.makeUnsafe("conversation-2");
const RUN_1 = ProductRunId.makeUnsafe("run-1");
const RUN_2 = ProductRunId.makeUnsafe("run-2");
const CONVERSATION_2_RUN_1 = ProductRunId.makeUnsafe("conversation-2-run-1");
const CONVERSATION_2_RUN_2 = ProductRunId.makeUnsafe("conversation-2-run-2");
const WORKSPACE_ID = ProductWorkspaceId.makeUnsafe("workspace-1");

function summary(
  receiptState: ProductConversationSummary["receiptState"],
  latestRunId: ProductRunId | null = receiptState === null ? null : RUN_1,
  conversationId: ProductConversationId = CONVERSATION_ID,
): ProductConversationSummary {
  return {
    id: conversationId,
    workspaceId: WORKSPACE_ID,
    title: "Completion truth",
    workspaceKind: "chat",
    revision: 1,
    archivedAt: null,
    isPinned: false,
    notes: "",
    boardState: "active",
    boardStateChangedAt: null,
    latestRunId,
    receiptState,
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
  } as ProductConversationSummary;
}

function receipt(
  state: "pending" | "accepted" | "running" | "rejected" | "delivery_unknown" | "outcome_unknown",
): ProductDispatchReceipt;
function receipt(
  state: "settled",
  outcome: "succeeded" | "failed" | "cancelled",
): ProductDispatchReceipt;
function receipt(
  state:
    | "pending"
    | "accepted"
    | "running"
    | "rejected"
    | "delivery_unknown"
    | "outcome_unknown"
    | "settled",
  outcome: "succeeded" | "failed" | "cancelled" = "succeeded",
): ProductDispatchReceipt {
  if (state === "pending") return { state, lastConfirmedBoundary: "pre-send", blocked: null };
  if (state === "rejected") {
    return { state, code: "rejected", message: "Rejected", retryable: false };
  }
  if (state === "delivery_unknown") {
    return { state, lastConfirmedBoundary: "local-write", abort: null };
  }
  const engineBinding = {
    id: ProductEngineBindingId.makeUnsafe("binding-1"),
    engineId: "pi",
    lineageRef: "lineage-1",
  };
  const resolvedSelection = {
    engineId: "pi",
    runtimeModelId: "model-1",
    engineModeId: null,
    thinking: null,
    permissionPolicy: "approval-required" as const,
    enforcement: "engine-enforced" as const,
    executionTarget: null,
    packageGeneration: "generation-1",
  };
  if (state === "accepted" || state === "running") {
    return state === "accepted"
      ? { state, operationRef: "operation-1", engineBinding, resolvedSelection, abort: null }
      : {
          state,
          evidence: { kind: "accepted-operation", operationRef: "operation-1" },
          engineBinding,
          resolvedSelection,
          abort: null,
        };
  }
  if (state === "outcome_unknown") {
    return {
      state,
      evidence: { kind: "accepted-operation", operationRef: "operation-1" },
      engineBinding,
      resolvedSelection,
      abort: null,
    };
  }
  return {
    state,
    evidence: { kind: "accepted-operation", operationRef: "operation-1" },
    engineBinding,
    resolvedSelection,
    outcome,
    settledAt: "2026-08-05T00:00:02.000Z",
    abort: null,
  };
}

function detail(
  runId: ProductRunId,
  runReceipt: ProductDispatchReceipt,
  olderRuns: ProductConversationReadModel["runs"] = [],
  conversationId: ProductConversationId = CONVERSATION_ID,
): ProductConversationReadModel {
  const conversation = summary(runReceipt.state, runId, conversationId);
  return {
    conversation,
    workspace: {
      id: WORKSPACE_ID,
      access: {
        kind: "chat",
        managedDirectory: null,
        primaryFolder: null,
        executionTarget: null,
        writeAuthority: "read-only-references",
      },
      observedAt: "2026-08-05T00:00:00.000Z",
    },
    entries: [],
    streamingEntryIds: [],
    runs: [
      ...olderRuns,
      {
        id: runId,
        conversationId,
        entryId: ProductEntryId.makeUnsafe(`entry-${runId}`),
        requestedSelection: {
          state: "selected",
          engineId: "pi",
          runtimeModelId: "model-1",
          thinking: null,
          permissionPolicy: "approval-required",
        },
        workspaceObservation: {
          id: WORKSPACE_ID,
          access: {
            kind: "chat",
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references",
          },
          observedAt: "2026-08-05T00:00:00.000Z",
        },
        resources: [],
        packageGeneration: "generation-1",
        receipt: {
          id: ProductOperationReceiptId.makeUnsafe(`receipt-${runId}`),
          dispatchId: ProductDispatchId.makeUnsafe(`dispatch-${runId}`),
          runId,
          receipt: runReceipt,
          updatedAt: "2026-08-05T00:00:02.000Z",
        },
        createdAt: "2026-08-05T00:00:01.000Z",
        updatedAt: "2026-08-05T00:00:02.000Z",
      },
    ],
    activities: [],
    recoveries: [],
    queue: [],
    entryPins: [],
    entryMarkers: [],
  } as ProductConversationReadModel;
}

function advance(
  state: ProductCompletionTrackerState,
  conversation: ProductConversationSummary | null,
  readModel?: ProductConversationReadModel,
) {
  return advanceProductCompletionTracker(state, {
    enabled: true,
    shellHydrated: true,
    conversations: conversation ? [conversation] : [],
    detailByConversation: readModel ? { [CONVERSATION_ID]: readModel } : {},
  });
}

function advanceMany(
  state: ProductCompletionTrackerState,
  conversations: ReadonlyArray<ProductConversationSummary>,
  details: ReadonlyArray<ProductConversationReadModel>,
) {
  return advanceProductCompletionTracker(state, {
    enabled: true,
    shellHydrated: true,
    conversations,
    detailByConversation: Object.fromEntries(
      details.map((readModel) => [readModel.conversation.id, readModel]),
    ),
  });
}

describe("Product completion observation", () => {
  it("acquires one lease for an active shell and does not stack retains on rerender", () => {
    const first = advance(createProductCompletionTrackerState(), summary("running"));
    expect(first.retainConversationIds).toEqual([CONVERSATION_ID]);
    expect(first.releaseConversationIds).toEqual([]);

    const repeated = advance(first.state, summary("running"), detail(RUN_1, receipt("running")));
    expect(repeated.retainConversationIds).toEqual([]);
    expect(repeated.releaseConversationIds).toEqual([]);
  });

  it("waits when shell settles before detail and emits only from the exact successful Run", () => {
    const active = advance(
      createProductCompletionTrackerState(),
      summary("running"),
      detail(RUN_1, receipt("running")),
    );
    const shellFirst = advance(active.state, summary("settled"), detail(RUN_1, receipt("running")));
    expect(shellFirst.candidates).toEqual([]);
    expect(shellFirst.releaseConversationIds).toEqual([]);

    const terminal = advance(
      shellFirst.state,
      summary("settled"),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(
      terminal.candidates.map(({ conversationId, runId }) => ({ conversationId, runId })),
    ).toEqual([{ conversationId: CONVERSATION_ID, runId: RUN_1 }]);
    expect(terminal.releaseConversationIds).toEqual([CONVERSATION_ID]);
  });

  it.each(["failed", "cancelled"] as const)(
    "releases %s without manufacturing success",
    (outcome) => {
      const active = advance(createProductCompletionTrackerState(), summary("running"));
      const terminal = advance(
        active.state,
        summary("settled"),
        detail(RUN_1, receipt("settled", outcome)),
      );
      expect(terminal.candidates).toEqual([]);
      expect(terminal.releaseConversationIds).toEqual([CONVERSATION_ID]);
      expect(terminal.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);
    },
  );

  it.each(["rejected", "delivery_unknown", "outcome_unknown"] as const)(
    "releases %s without treating uncertainty as success",
    (state) => {
      const active = advance(createProductCompletionTrackerState(), summary("running"));
      const terminal = advance(active.state, summary(state), detail(RUN_1, receipt(state)));
      expect(terminal.candidates).toEqual([]);
      expect(terminal.releaseConversationIds).toEqual([CONVERSATION_ID]);
      expect(terminal.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(
        state === "rejected" ? RUN_1 : undefined,
      );
    },
  );

  it.each(["rejected", "delivery_unknown", "outcome_unknown"] as const)(
    "releases a same-Run %s shell even while matching detail is still active",
    (state) => {
      const active = advance(
        createProductCompletionTrackerState(),
        summary("running", RUN_1),
        detail(RUN_1, receipt("running")),
      );
      const shellAhead = advance(
        active.state,
        summary(state, RUN_1),
        detail(RUN_1, receipt("running")),
      );
      expect(shellAhead.candidates).toEqual([]);
      expect(shellAhead.releaseConversationIds).toEqual([CONVERSATION_ID]);
      expect(shellAhead.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(
        state === "rejected" ? RUN_1 : undefined,
      );
    },
  );

  it.each(["delivery_unknown", "outcome_unknown"] as const)(
    "does not persist provisional %s as a handled outcome and re-arms the same Run on active truth",
    (state) => {
      const pending = advance(
        createProductCompletionTrackerState(),
        summary("pending", RUN_1),
        detail(RUN_1, receipt("pending")),
      );
      const unknown = advance(pending.state, summary(state, RUN_1), detail(RUN_1, receipt(state)));
      expect(unknown.candidates).toEqual([]);
      expect(unknown.releaseConversationIds).toEqual([CONVERSATION_ID]);
      expect(unknown.state.handledRunIdByConversation[CONVERSATION_ID]).toBeUndefined();

      const active = advance(
        unknown.state,
        summary("accepted", RUN_1),
        detail(RUN_1, receipt("accepted")),
      );
      expect(active.retainConversationIds).toEqual([CONVERSATION_ID]);
      expect(active.state.armedRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);
    },
  );

  it("emits once after Product reconciles delivery_unknown through the same accepted Run", () => {
    const pending = advance(
      createProductCompletionTrackerState(),
      summary("pending", RUN_1),
      detail(RUN_1, receipt("pending")),
    );
    const unknown = advance(
      pending.state,
      summary("delivery_unknown", RUN_1),
      detail(RUN_1, receipt("delivery_unknown")),
    );
    expect(unknown.candidates).toEqual([]);
    expect(unknown.releaseConversationIds).toEqual([CONVERSATION_ID]);
    expect(unknown.state.handledRunIdByConversation[CONVERSATION_ID]).toBeUndefined();

    const accepted = advance(
      unknown.state,
      summary("accepted", RUN_1),
      detail(RUN_1, receipt("accepted")),
    );
    expect(accepted.retainConversationIds).toEqual([CONVERSATION_ID]);
    expect(accepted.state.armedRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);

    const running = advance(
      accepted.state,
      summary("running", RUN_1),
      detail(RUN_1, receipt("running")),
    );
    expect(running.retainConversationIds).toEqual([]);
    expect(running.releaseConversationIds).toEqual([]);

    const succeeded = advance(
      running.state,
      summary("settled", RUN_1),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(succeeded.candidates.map((candidate) => candidate.runId)).toEqual([RUN_1]);
    expect(succeeded.releaseConversationIds).toEqual([CONVERSATION_ID]);
    expect(succeeded.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);

    const replayActive = advance(
      succeeded.state,
      summary("accepted", RUN_1),
      detail(RUN_1, receipt("accepted")),
    );
    const replaySettled = advance(
      replayActive.state,
      summary("settled", RUN_1),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(replaySettled.candidates).toEqual([]);
    expect(replaySettled.releaseConversationIds).toEqual([CONVERSATION_ID]);
    expect(replaySettled.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);
  });

  it("keeps rejected hydration as a definitive handled history", () => {
    const hydrated = advance(
      createProductCompletionTrackerState(),
      summary("rejected", RUN_1),
      detail(RUN_1, receipt("rejected")),
    );
    expect(hydrated.candidates).toEqual([]);
    expect(hydrated.retainConversationIds).toEqual([]);
    expect(hydrated.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);
  });

  it.each(["rejected", "delivery_unknown", "outcome_unknown"] as const)(
    "arms a newer active exact Run during initial hydration over a stale %s shell",
    (state) => {
      const run1 = detail(RUN_1, receipt(state)).runs[0]!;
      const hydrated = advance(
        createProductCompletionTrackerState(),
        summary(state, RUN_1),
        detail(RUN_2, receipt("running"), [run1]),
      );
      expect(hydrated.retainConversationIds).toEqual([CONVERSATION_ID]);
      expect(hydrated.releaseConversationIds).toEqual([]);
      expect(hydrated.state.armedRunIdByConversation[CONVERSATION_ID]).toBe(RUN_2);

      const succeeded = advance(
        hydrated.state,
        summary("settled", RUN_2),
        detail(RUN_2, receipt("settled", "succeeded"), [run1]),
      );
      expect(succeeded.candidates.map((candidate) => candidate.runId)).toEqual([RUN_2]);
      expect(succeeded.releaseConversationIds).toEqual([CONVERSATION_ID]);
    },
  );

  it("does not resurrect an active detail without a shell Conversation identity at hydration", () => {
    const hydrated = advanceProductCompletionTracker(createProductCompletionTrackerState(), {
      enabled: true,
      shellHydrated: true,
      conversations: [],
      detailByConversation: {
        [CONVERSATION_ID]: detail(RUN_2, receipt("running")),
      },
    });
    expect(hydrated.retainConversationIds).toEqual([]);
    expect(hydrated.state.retainedConversationIds).toEqual(new Set());
    expect(hydrated.state.armedRunIdByConversation).toEqual({});
  });

  it.each(["rejected", "delivery_unknown", "outcome_unknown", null] as const)(
    "keeps a newer active Run armed across a stale %s shell",
    (staleState) => {
      const run1 = detail(RUN_1, receipt("running")).runs[0]!;
      const firstRun = advance(
        createProductCompletionTrackerState(),
        summary("running", RUN_1),
        detail(RUN_1, receipt("running")),
      );
      const newerActiveRun = advance(
        firstRun.state,
        staleState === null ? null : summary(staleState, RUN_1),
        detail(RUN_2, receipt("running"), [run1]),
      );
      expect(newerActiveRun.candidates).toEqual([]);
      expect(newerActiveRun.retainConversationIds).toEqual([]);
      expect(newerActiveRun.releaseConversationIds).toEqual([]);
      expect(newerActiveRun.state.retainedConversationIds).toEqual(new Set([CONVERSATION_ID]));
      expect(newerActiveRun.state.armedRunIdByConversation[CONVERSATION_ID]).toBe(RUN_2);

      const succeededBeforeShellCatchUp = advance(
        newerActiveRun.state,
        staleState === null ? null : summary(staleState, RUN_1),
        detail(RUN_2, receipt("settled", "succeeded"), [run1]),
      );
      expect(succeededBeforeShellCatchUp.candidates.map((candidate) => candidate.runId)).toEqual([
        RUN_2,
      ]);
      expect(succeededBeforeShellCatchUp.releaseConversationIds).toEqual([CONVERSATION_ID]);

      const succeededAfterShellCatchUp = advance(
        newerActiveRun.state,
        summary("settled", RUN_2),
        detail(RUN_2, receipt("settled", "succeeded"), [run1]),
      );
      expect(succeededAfterShellCatchUp.candidates.map((candidate) => candidate.runId)).toEqual([
        RUN_2,
      ]);
      expect(succeededAfterShellCatchUp.releaseConversationIds).toEqual([CONVERSATION_ID]);
    },
  );

  it("does not let an older settled Run notify over a newer active Run", () => {
    const oldRun = detail(RUN_1, receipt("settled", "succeeded")).runs[0]!;
    const active = advance(createProductCompletionTrackerState(), summary("running", RUN_2));
    const stale = advance(
      active.state,
      summary("settled", RUN_2),
      detail(RUN_2, receipt("running"), [oldRun]),
    );
    expect(stale.candidates).toEqual([]);
    expect(stale.releaseConversationIds).toEqual([]);
  });

  it("does not promote an old terminal baseline when shell/detail wobble, then waits for the new Run", () => {
    const initialized = advance(
      createProductCompletionTrackerState(),
      summary("running", RUN_2),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(initialized.retainConversationIds).toEqual([CONVERSATION_ID]);

    const oldTerminal = advance(
      initialized.state,
      summary("settled", RUN_2),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(oldTerminal.candidates).toEqual([]);
    expect(oldTerminal.releaseConversationIds).toEqual([]);

    const newTerminal = advance(
      oldTerminal.state,
      summary("settled", RUN_2),
      detail(RUN_2, receipt("settled", "succeeded")),
    );
    expect(newTerminal.candidates.map((candidate) => candidate.runId)).toEqual([RUN_2]);
    expect(newTerminal.releaseConversationIds).toEqual([CONVERSATION_ID]);
  });

  it("releases an exact terminal baseline without replay when the shell settles the same Run", () => {
    const initialized = advance(
      createProductCompletionTrackerState(),
      summary("running", RUN_1),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    const settled = advance(
      initialized.state,
      summary("settled", RUN_1),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(settled.candidates).toEqual([]);
    expect(settled.releaseConversationIds).toEqual([CONVERSATION_ID]);
    expect(settled.state.retainedConversationIds).toEqual(new Set());
  });

  it("waits when the shell names a newer exact Run that detail does not contain yet", () => {
    const first = advance(
      createProductCompletionTrackerState(),
      summary("running", RUN_1),
      detail(RUN_1, receipt("running")),
    );
    const shellAhead = advance(
      first.state,
      summary("settled", RUN_2),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(shellAhead.candidates).toEqual([]);
    expect(shellAhead.releaseConversationIds).toEqual([]);
    expect(shellAhead.state.retainedConversationIds).toEqual(new Set([CONVERSATION_ID]));
  });

  it("dedupes reconnect/resnapshot wobble while keeping a new Run distinct", () => {
    const active = advance(createProductCompletionTrackerState(), summary("running"));
    const first = advance(
      active.state,
      summary("settled"),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(first.candidates).toHaveLength(1);

    const wobble = advance(first.state, summary("running"), detail(RUN_1, receipt("running")));
    const replay = advance(
      wobble.state,
      summary("settled"),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(replay.candidates).toEqual([]);

    const secondActive = advance(
      replay.state,
      summary("running", RUN_2),
      detail(RUN_2, receipt("running")),
    );
    const second = advance(
      secondActive.state,
      summary("settled", RUN_2),
      detail(RUN_2, receipt("settled", "succeeded")),
    );
    expect(second.candidates.map((candidate) => candidate.runId)).toEqual([RUN_2]);
  });

  it("balances a retained lease and clears handled identity on true Conversation removal", () => {
    const active = advance(
      createProductCompletionTrackerState(),
      summary("running", RUN_1),
      detail(RUN_1, receipt("running")),
    );
    const completed = advance(
      active.state,
      summary("settled", RUN_1),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    const wobble = advance(
      completed.state,
      summary("running", RUN_1),
      detail(RUN_1, receipt("running")),
    );
    const removed = advance(wobble.state, null, detail(RUN_1, receipt("running")));
    expect(removed.releaseConversationIds).toEqual([CONVERSATION_ID]);
    expect(removed.state.handledRunIdByConversation[CONVERSATION_ID]).toBeUndefined();
    expect(removed.state.armedRunIdByConversation[CONVERSATION_ID]).toBeUndefined();
    expect(removed.state.lastShellRunIdByConversation[CONVERSATION_ID]).toBeUndefined();
  });

  it("bounds handled state to one latest identity per live Conversation across many Runs", () => {
    const first = advanceMany(
      createProductCompletionTrackerState(),
      [
        summary("running", RUN_1, CONVERSATION_ID),
        summary("running", CONVERSATION_2_RUN_1, CONVERSATION_2_ID),
      ],
      [
        detail(RUN_1, receipt("running"), [], CONVERSATION_ID),
        detail(CONVERSATION_2_RUN_1, receipt("running"), [], CONVERSATION_2_ID),
      ],
    );
    const firstSettled = advanceMany(
      first.state,
      [
        summary("settled", RUN_1, CONVERSATION_ID),
        summary("settled", CONVERSATION_2_RUN_1, CONVERSATION_2_ID),
      ],
      [
        detail(RUN_1, receipt("settled", "succeeded"), [], CONVERSATION_ID),
        detail(CONVERSATION_2_RUN_1, receipt("settled", "succeeded"), [], CONVERSATION_2_ID),
      ],
    );
    const second = advanceMany(
      firstSettled.state,
      [
        summary("running", RUN_2, CONVERSATION_ID),
        summary("running", CONVERSATION_2_RUN_2, CONVERSATION_2_ID),
      ],
      [
        detail(RUN_2, receipt("running"), [], CONVERSATION_ID),
        detail(CONVERSATION_2_RUN_2, receipt("running"), [], CONVERSATION_2_ID),
      ],
    );
    const secondSettled = advanceMany(
      second.state,
      [
        summary("settled", RUN_2, CONVERSATION_ID),
        summary("settled", CONVERSATION_2_RUN_2, CONVERSATION_2_ID),
      ],
      [
        detail(RUN_2, receipt("settled", "succeeded"), [], CONVERSATION_ID),
        detail(CONVERSATION_2_RUN_2, receipt("settled", "succeeded"), [], CONVERSATION_2_ID),
      ],
    );
    expect(secondSettled.candidates.map((candidate) => candidate.runId)).toEqual([
      RUN_2,
      CONVERSATION_2_RUN_2,
    ]);
    expect(secondSettled.state.handledRunIdByConversation).toEqual({
      [CONVERSATION_ID]: RUN_2,
      [CONVERSATION_2_ID]: CONVERSATION_2_RUN_2,
    });
    expect(Object.keys(secondSettled.state.handledRunIdByConversation)).toHaveLength(2);

    const afterRemoval = advanceMany(
      secondSettled.state,
      [summary("settled", RUN_2, CONVERSATION_ID)],
      [detail(RUN_2, receipt("settled", "succeeded"), [], CONVERSATION_ID)],
    );
    expect(afterRemoval.state.handledRunIdByConversation).toEqual({
      [CONVERSATION_ID]: RUN_2,
    });
  });

  it("does not replay terminal history during initial hydration", () => {
    const hydrated = advance(
      createProductCompletionTrackerState(),
      summary("settled"),
      detail(RUN_1, receipt("settled", "succeeded")),
    );
    expect(hydrated.candidates).toEqual([]);
    expect(hydrated.retainConversationIds).toEqual([]);
    expect(hydrated.state.handledRunIdByConversation[CONVERSATION_ID]).toBe(RUN_1);
  });
});

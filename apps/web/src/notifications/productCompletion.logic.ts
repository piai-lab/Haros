import type {
  ProductConversationId,
  ProductConversationReadModel,
  ProductConversationSummary,
  ProductRun,
  ProductRunId,
} from "@omnimind/contracts";

export interface ProductCompletionCandidate {
  readonly conversationId: ProductConversationId;
  readonly runId: ProductRunId;
  readonly title: string;
  readonly workspaceKind: ProductConversationSummary["workspaceKind"];
}

export interface ProductCompletionTrackerState {
  readonly initialized: boolean;
  readonly retainedConversationIds: ReadonlySet<string>;
  readonly armedRunIdByConversation: Readonly<Record<string, string>>;
  readonly handledRunIdByConversation: Readonly<Record<string, string>>;
  readonly lastShellRunIdByConversation: Readonly<Record<string, string | null>>;
}

export interface ProductCompletionTrackerInput {
  readonly enabled: boolean;
  readonly shellHydrated: boolean;
  readonly conversations: ReadonlyArray<ProductConversationSummary>;
  readonly detailByConversation: Readonly<Record<string, ProductConversationReadModel>>;
}

export interface ProductCompletionTrackerResult {
  readonly state: ProductCompletionTrackerState;
  readonly candidates: ReadonlyArray<ProductCompletionCandidate>;
  readonly retainConversationIds: ReadonlyArray<ProductConversationId>;
  readonly releaseConversationIds: ReadonlyArray<ProductConversationId>;
}

export function createProductCompletionTrackerState(): ProductCompletionTrackerState {
  return {
    initialized: false,
    retainedConversationIds: new Set(),
    armedRunIdByConversation: {},
    handledRunIdByConversation: {},
    lastShellRunIdByConversation: {},
  };
}

function isActiveReceiptState(state: ProductConversationSummary["receiptState"]): boolean {
  return state === "pending" || state === "accepted" || state === "running";
}

function isNonSuccessTerminalShellState(
  state: ProductConversationSummary["receiptState"],
): boolean {
  return state === "rejected" || state === "delivery_unknown" || state === "outcome_unknown";
}

function isTerminalRun(run: ProductRun): boolean {
  const state = run.receipt.receipt.state;
  return (
    state === "rejected" ||
    state === "delivery_unknown" ||
    state === "settled" ||
    state === "outcome_unknown"
  );
}

function hasDefinitiveTerminalOutcome(run: ProductRun): boolean {
  const state = run.receipt.receipt.state;
  return state === "rejected" || state === "settled";
}

function findExactLatestRun(detail: ProductConversationReadModel | undefined): ProductRun | null {
  const latestRunId = detail?.conversation.latestRunId;
  if (!detail || !latestRunId) return null;
  return detail.runs.find((run) => run.id === latestRunId) ?? null;
}

function detailContainsRun(
  detail: ProductConversationReadModel | undefined,
  runId: string | null,
): boolean {
  return Boolean(detail && runId && detail.runs.some((run) => run.id === runId));
}

function releaseOwnedConversation(
  conversationId: string,
  retainedConversationIds: Set<string>,
  armedRunIdByConversation: Record<string, string>,
  releaseConversationIds: ProductConversationId[],
): void {
  if (retainedConversationIds.delete(conversationId)) {
    releaseConversationIds.push(conversationId as ProductConversationId);
  }
  delete armedRunIdByConversation[conversationId];
}

/**
 * Tracks presentation leases with exact Product Run identity. Shell and detail cursors belong to
 * different scopes and are never compared; `latestRunId` correlates the two projections instead.
 */
export function advanceProductCompletionTracker(
  previous: ProductCompletionTrackerState,
  input: ProductCompletionTrackerInput,
): ProductCompletionTrackerResult {
  const retainedConversationIds = new Set(previous.retainedConversationIds);
  const armedRunIdByConversation = { ...previous.armedRunIdByConversation };
  const handledRunIdByConversation = { ...previous.handledRunIdByConversation };
  const lastShellRunIdByConversation = { ...previous.lastShellRunIdByConversation };
  const candidates: ProductCompletionCandidate[] = [];
  const retainConversationIds: ProductConversationId[] = [];
  const releaseConversationIds: ProductConversationId[] = [];

  if (!input.enabled) {
    for (const conversationId of retainedConversationIds) {
      releaseConversationIds.push(conversationId as ProductConversationId);
    }
    return {
      state: createProductCompletionTrackerState(),
      candidates,
      retainConversationIds,
      releaseConversationIds,
    };
  }

  if (!input.shellHydrated) {
    return {
      state: previous,
      candidates,
      retainConversationIds,
      releaseConversationIds,
    };
  }

  const summaryById = new Map(
    input.conversations.map((conversation) => [String(conversation.id), conversation] as const),
  );

  if (!previous.initialized) {
    for (const summary of input.conversations) {
      const conversationId = String(summary.id);
      const shellRunId = summary.latestRunId;
      const detail = input.detailByConversation[conversationId];
      const exactDetailRun = findExactLatestRun(detail);
      lastShellRunIdByConversation[conversationId] = shellRunId;

      const detailIsNewer =
        exactDetailRun !== null &&
        shellRunId !== null &&
        exactDetailRun.id !== shellRunId &&
        detailContainsRun(detail, shellRunId);

      if (!isActiveReceiptState(summary.receiptState) || !shellRunId) {
        if (detailIsNewer && exactDetailRun && !isTerminalRun(exactDetailRun)) {
          retainedConversationIds.add(conversationId);
          retainConversationIds.push(summary.id);
          armedRunIdByConversation[conversationId] = exactDetailRun.id;
          continue;
        }
        if (exactDetailRun && hasDefinitiveTerminalOutcome(exactDetailRun)) {
          handledRunIdByConversation[conversationId] = exactDetailRun.id;
        }
        continue;
      }

      retainedConversationIds.add(conversationId);
      retainConversationIds.push(summary.id);
      if (detailIsNewer) {
        if (hasDefinitiveTerminalOutcome(exactDetailRun)) {
          handledRunIdByConversation[conversationId] = exactDetailRun.id;
        } else if (!isTerminalRun(exactDetailRun)) {
          armedRunIdByConversation[conversationId] = exactDetailRun.id;
        }
        continue;
      }
      if (exactDetailRun && exactDetailRun.id === shellRunId && isTerminalRun(exactDetailRun)) {
        if (hasDefinitiveTerminalOutcome(exactDetailRun)) {
          handledRunIdByConversation[conversationId] = exactDetailRun.id;
        }
        continue;
      }
      if (
        exactDetailRun &&
        exactDetailRun.id !== shellRunId &&
        hasDefinitiveTerminalOutcome(exactDetailRun)
      ) {
        handledRunIdByConversation[conversationId] = exactDetailRun.id;
      }
      armedRunIdByConversation[conversationId] = shellRunId;
    }
    return {
      state: {
        initialized: true,
        retainedConversationIds,
        armedRunIdByConversation,
        handledRunIdByConversation,
        lastShellRunIdByConversation,
      },
      candidates,
      retainConversationIds,
      releaseConversationIds,
    };
  }

  // A handled identity is retained only while its Conversation still exists or owns an observation
  // lease. This bounds the map to one Run per potentially live Conversation.
  for (const conversationId of Object.keys(lastShellRunIdByConversation)) {
    if (!summaryById.has(conversationId) && !retainedConversationIds.has(conversationId)) {
      delete handledRunIdByConversation[conversationId];
      delete armedRunIdByConversation[conversationId];
      delete lastShellRunIdByConversation[conversationId];
    }
  }

  for (const summary of input.conversations) {
    const conversationId = String(summary.id);
    lastShellRunIdByConversation[conversationId] = summary.latestRunId;
    if (!isActiveReceiptState(summary.receiptState) || !summary.latestRunId) continue;
    if (!retainedConversationIds.has(conversationId)) {
      retainedConversationIds.add(conversationId);
      retainConversationIds.push(summary.id);
    }
    if (handledRunIdByConversation[conversationId] !== summary.latestRunId) {
      armedRunIdByConversation[conversationId] = summary.latestRunId;
    }
  }

  const handleTerminalRun = (
    conversationId: string,
    run: ProductRun,
    presentation: ProductConversationSummary,
  ): void => {
    const alreadyHandled = handledRunIdByConversation[conversationId] === run.id;
    const wasArmed = armedRunIdByConversation[conversationId] === run.id;
    const receipt = run.receipt.receipt;
    if (
      wasArmed &&
      !alreadyHandled &&
      receipt.state === "settled" &&
      receipt.outcome === "succeeded"
    ) {
      candidates.push({
        conversationId: presentation.id,
        runId: run.id,
        title: presentation.title,
        workspaceKind: presentation.workspaceKind,
      });
    }
    if (hasDefinitiveTerminalOutcome(run)) {
      handledRunIdByConversation[conversationId] = run.id;
    }
    releaseOwnedConversation(
      conversationId,
      retainedConversationIds,
      armedRunIdByConversation,
      releaseConversationIds,
    );
  };

  for (const conversationId of [...retainedConversationIds]) {
    const summary = summaryById.get(conversationId);
    const previousShellRunId = lastShellRunIdByConversation[conversationId] ?? null;
    const detail = input.detailByConversation[conversationId];
    const exactDetailRun = findExactLatestRun(detail);
    const detailRunId = exactDetailRun?.id ?? null;
    const shellRunId = summary?.latestRunId ?? previousShellRunId;
    const detailIsNewer =
      detailRunId !== null &&
      shellRunId !== null &&
      detailRunId !== shellRunId &&
      detailContainsRun(detail, shellRunId);

    if (!summary) {
      if (detailIsNewer && exactDetailRun && detail) {
        if (isTerminalRun(exactDetailRun)) {
          handleTerminalRun(conversationId, exactDetailRun, detail.conversation);
        } else {
          armedRunIdByConversation[conversationId] = exactDetailRun.id;
        }
        continue;
      }
      releaseOwnedConversation(
        conversationId,
        retainedConversationIds,
        armedRunIdByConversation,
        releaseConversationIds,
      );
      delete handledRunIdByConversation[conversationId];
      delete lastShellRunIdByConversation[conversationId];
      continue;
    }

    lastShellRunIdByConversation[conversationId] = summary.latestRunId;

    if (detailIsNewer && exactDetailRun && detail) {
      if (isTerminalRun(exactDetailRun)) {
        handleTerminalRun(conversationId, exactDetailRun, detail.conversation);
      } else {
        armedRunIdByConversation[conversationId] = exactDetailRun.id;
      }
      continue;
    }

    // The shell names a Run that detail does not yet contain. Its exact identity proves shell is
    // ahead of this detail snapshot; retain until the matching Run receipt arrives.
    if (summary.latestRunId && summary.latestRunId !== detailRunId) {
      continue;
    }

    if (isActiveReceiptState(summary.receiptState)) {
      if (exactDetailRun && !isTerminalRun(exactDetailRun)) {
        armedRunIdByConversation[conversationId] = exactDetailRun.id;
      }
      continue;
    }

    if (isNonSuccessTerminalShellState(summary.receiptState)) {
      if (summary.latestRunId && summary.receiptState === "rejected") {
        handledRunIdByConversation[conversationId] = summary.latestRunId;
      }
      releaseOwnedConversation(
        conversationId,
        retainedConversationIds,
        armedRunIdByConversation,
        releaseConversationIds,
      );
      continue;
    }

    if (summary.receiptState === "settled") {
      if (!exactDetailRun || !isTerminalRun(exactDetailRun)) continue;
      handleTerminalRun(conversationId, exactDetailRun, detail?.conversation ?? summary);
      continue;
    }

    releaseOwnedConversation(
      conversationId,
      retainedConversationIds,
      armedRunIdByConversation,
      releaseConversationIds,
    );
  }

  return {
    state: {
      initialized: true,
      retainedConversationIds,
      armedRunIdByConversation,
      handledRunIdByConversation,
      lastShellRunIdByConversation,
    },
    candidates,
    retainConversationIds,
    releaseConversationIds,
  };
}

export function buildProductCompletionCopy(candidate: ProductCompletionCandidate): {
  readonly title: string;
  readonly body: string;
} {
  return {
    title: candidate.title.trim() || "Untitled conversation",
    body: "Finished working.",
  };
}

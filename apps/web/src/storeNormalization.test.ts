// FILE: storeNormalization.test.ts
// Purpose: Pins the incremental activity accumulator to the `normalizeActivities` fold it replaces.

import { MessageId } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  createThreadActivityAccumulator,
  mergeReadModelThreadDetailWithLiveHotPath,
  normalizeChatMessage,
  normalizeActivities,
  type ThreadActivityAccumulator,
} from "./storeNormalization";
import { makeActivity, makeReadModelThread, makeThread } from "./storeTestFixtures";
import type { Thread } from "./types";

type ThreadActivity = Thread["activities"][number];

describe("normalizeChatMessage text segments", () => {
  it("preserves identity for equal segments and replaces it for a changed boundary", () => {
    const incoming = {
      id: MessageId.makeUnsafe("assistant-segment-normalization"),
      role: "assistant" as const,
      text: "beforeafter",
      textSegments: [
        {
          sequence: 10,
          startedAt: "2026-08-16T00:00:00.000Z",
          endedAt: "2026-08-16T00:00:01.000Z",
          text: "before",
        },
        {
          sequence: 30,
          startedAt: "2026-08-16T00:00:01.000Z",
          endedAt: "2026-08-16T00:00:02.000Z",
          text: "after",
        },
      ],
      turnId: null,
      streaming: false,
      source: "native" as const,
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:02.000Z",
    };
    const first = normalizeChatMessage(incoming, undefined);
    const equalReplay = normalizeChatMessage(
      {
        ...incoming,
        textSegments: incoming.textSegments.map((segment) => ({ ...segment })),
      },
      first,
    );
    expect(equalReplay).toBe(first);

    const changed = normalizeChatMessage(
      {
        ...incoming,
        textSegments: [incoming.textSegments[0]!, { ...incoming.textSegments[1]!, text: "after!" }],
      },
      first,
    );
    expect(changed).not.toBe(first);
    expect(changed.textSegments?.[1]?.text).toBe("after!");
  });

  it("keeps a newer live segmented message without resurrecting boundaries cleared by a snapshot", () => {
    const messageId = MessageId.makeUnsafe("assistant-segment-merge");
    const textSegments = [
      {
        sequence: 10,
        startedAt: "2026-08-16T00:00:00.000Z",
        endedAt: "2026-08-16T00:00:01.000Z",
        text: "before",
      },
      {
        sequence: 30,
        startedAt: "2026-08-16T00:00:01.000Z",
        endedAt: "2026-08-16T00:00:02.000Z",
        text: "after",
      },
    ];
    const previous = makeThread({
      messages: [
        {
          id: messageId,
          role: "assistant",
          text: "beforeafter",
          textSegments,
          turnId: null,
          createdAt: "2026-08-16T00:00:00.000Z",
          completedAt: "2026-08-16T00:00:02.000Z",
          streaming: false,
          source: "native",
        },
      ],
    });
    const olderSnapshot = makeReadModelThread({
      messages: [
        {
          id: messageId,
          role: "assistant",
          text: "before",
          turnId: null,
          streaming: true,
          source: "native",
          createdAt: "2026-08-16T00:00:00.000Z",
          updatedAt: "2026-08-16T00:00:01.000Z",
        },
      ],
    });
    const merged = mergeReadModelThreadDetailWithLiveHotPath(olderSnapshot, previous);
    expect(merged.messages[0]?.text).toBe("beforeafter");
    expect(merged.messages[0]?.textSegments).toBe(textSegments);

    const editedSnapshot = makeReadModelThread({
      messages: [
        {
          id: messageId,
          role: "assistant",
          text: "beforeafter",
          turnId: null,
          streaming: false,
          source: "native",
          createdAt: "2026-08-16T00:00:00.000Z",
          updatedAt: "2026-08-16T00:00:03.000Z",
        },
      ],
    });
    const edited = mergeReadModelThreadDetailWithLiveHotPath(editedSnapshot, previous);
    expect(edited.messages[0]?.textSegments).toBeUndefined();
  });
});

describe("assistant turn provenance hot-path merge", () => {
  const pendingMessageId = MessageId.makeUnsafe("user-provenance");
  const requestedAt = "2026-08-27T02:21:00.000Z";
  const provenance = {
    pendingMessageId,
    turnId: null,
    modelSelection: {
      provider: "oa" as const,
      model: "deepseek/deepseek-v4-pro",
    },
    requestedAt,
  };

  function previousWithLiveProvenance(): Thread {
    return makeThread({
      messages: [
        {
          id: pendingMessageId,
          role: "user",
          text: "Research this",
          turnId: null,
          createdAt: requestedAt,
          streaming: false,
          source: "native",
        },
      ],
      turnProvenance: [provenance],
      updatedAt: requestedAt,
    });
  }

  it("preserves an admitted model while an equally fresh snapshot still lacks the joined turn", () => {
    const merged = mergeReadModelThreadDetailWithLiveHotPath(
      makeReadModelThread({
        updatedAt: requestedAt,
        messages: [],
        turnProvenance: [],
      }),
      previousWithLiveProvenance(),
    );

    expect(merged.turnProvenance).toEqual([provenance]);
  });

  it("prefers a newer edit-resend request and lets a later rollback snapshot remove it", () => {
    const previous = previousWithLiveProvenance();
    const olderEntry = {
      ...provenance,
      modelSelection: { provider: "codex" as const, model: "gpt-5.6" },
      requestedAt: "2026-08-27T02:20:00.000Z",
    };
    const merged = mergeReadModelThreadDetailWithLiveHotPath(
      makeReadModelThread({
        updatedAt: requestedAt,
        messages: [
          {
            id: pendingMessageId,
            role: "user",
            text: "Research this",
            turnId: null,
            streaming: false,
            source: "native",
            createdAt: requestedAt,
            updatedAt: requestedAt,
          },
        ],
        turnProvenance: [olderEntry],
      }),
      previous,
    );
    expect(merged.turnProvenance).toEqual([provenance]);

    const rolledBack = mergeReadModelThreadDetailWithLiveHotPath(
      makeReadModelThread({
        updatedAt: "2026-08-27T02:22:00.000Z",
        messages: [],
        turnProvenance: [],
      }),
      previous,
    );
    expect(rolledBack.turnProvenance).toEqual([]);
  });
});

interface FoldStep {
  readonly changed: boolean;
}

/**
 * The pre-optimisation batch fold: one full `normalizeActivities` call per appended activity.
 * Kept here (and only here) as the oracle the accumulator must reproduce exactly.
 */
function foldWithNormalizeActivities(
  previous: Thread["activities"],
  batch: readonly ThreadActivity[],
): { readonly result: Thread["activities"]; readonly steps: FoldStep[] } {
  let current = previous;
  const steps: FoldStep[] = [];
  for (const activity of batch) {
    const next = normalizeActivities([...current, activity], current);
    steps.push({ changed: next !== current });
    current = next;
  }
  return { result: current, steps };
}

function foldWithAccumulator(
  previous: Thread["activities"],
  batch: readonly ThreadActivity[],
): { readonly result: Thread["activities"]; readonly steps: FoldStep[] } {
  const accumulator: ThreadActivityAccumulator = createThreadActivityAccumulator(previous);
  const steps = batch.map((activity) => ({
    changed: accumulator.append(activity),
  }));
  return { result: accumulator.result(), steps };
}

function expectEquivalent(previous: Thread["activities"], batch: readonly ThreadActivity[]): void {
  const oracle = foldWithNormalizeActivities(previous, batch);
  const accumulated = foldWithAccumulator(previous, batch);

  expect(accumulated.steps).toEqual(oracle.steps);
  expect(accumulated.result).toEqual(oracle.result);
  expect(accumulated.result.map((activity) => activity.id)).toEqual(
    oracle.result.map((activity) => activity.id),
  );
  // Reference-identity contract: both must fall back to `previous` when nothing changed, because
  // the reducer uses `next === thread.activities` to decide whether to write the thread at all.
  expect(accumulated.result === previous).toBe(oracle.result === previous);
}

const richPayload = {
  itemType: "command_execution",
  title: "Ran command",
  detail: "echo hello",
  data: { item: { type: "commandExecution", command: "echo hello" } },
};

describe("createThreadActivityAccumulator", () => {
  it("matches the normalizeActivities fold for appends, in-place merges and exact duplicates", () => {
    const existing = makeActivity({
      id: "activity-command",
      kind: "tool.completed",
      summary: "Ran command",
      createdAt: "2026-07-09T00:00:00.000Z",
      payload: richPayload,
      sequence: 1,
    });
    const previous = [makeActivity({ id: "activity-seed", sequence: 0 }), existing];
    const batch: ThreadActivity[] = [
      makeActivity({ id: "activity-new", sequence: 2 }),
      // Poorer re-delivery of an existing id: must merge in place and report "unchanged".
      makeActivity({
        id: "activity-command",
        kind: existing.kind,
        summary: existing.summary,
        createdAt: existing.createdAt,
        payload: { title: "Ran command" },
        sequence: 1,
      }),
      // Byte-identical re-delivery: must report "unchanged".
      { ...existing },
      // Richer re-delivery of a plain activity: must replace in place at its original index.
      makeActivity({ id: "activity-seed", payload: richPayload, sequence: 0 }),
      makeActivity({ id: "activity-last", sequence: 3 }),
    ];

    expectEquivalent(previous, batch);
  });

  it("matches the fold when the previous list still contains duplicate ids", () => {
    const duplicated = makeActivity({ id: "activity-dup", sequence: 1 });
    const previous = [duplicated, makeActivity({ id: "activity-other", sequence: 2 }), duplicated];

    // The very first append has to report "changed" because dedupe of `previous` alone rewrote
    // the list, exactly like `normalizeActivities` did on its first call.
    expectEquivalent(previous, [{ ...duplicated }]);
    expectEquivalent(previous, [makeActivity({ id: "activity-new", sequence: 3 })]);
  });

  it("matches the fold across the activity cap, including pending-request retention", () => {
    const pendingApproval = makeActivity({
      id: "activity-approval",
      kind: "approval.requested",
      summary: "Approve?",
      createdAt: "2026-07-09T00:00:00.000Z",
      payload: { requestId: "request-1" },
      sequence: 0,
    });
    const resolvedApproval = makeActivity({
      id: "activity-approval-resolved",
      kind: "approval.requested",
      summary: "Approve?",
      createdAt: "2026-07-09T00:00:00.000Z",
      payload: { requestId: "request-2" },
      sequence: 1,
    });
    const previous: ThreadActivity[] = [
      pendingApproval,
      resolvedApproval,
      makeActivity({
        id: "activity-approval-resolution",
        kind: "approval.resolved",
        payload: { requestId: "request-2" },
        sequence: 2,
      }),
      ...Array.from({ length: 2100 }, (_, index) =>
        makeActivity({ id: `activity-bulk-${index}`, sequence: 10 + index }),
      ),
    ];
    const batch = Array.from({ length: 25 }, (_, index) =>
      makeActivity({ id: `activity-batch-${index}`, sequence: 10_000 + index }),
    );

    expectEquivalent(previous, batch);

    const accumulated = foldWithAccumulator(previous, batch).result;
    // The still-pending approval survives the cap; the resolved one is dropped with the rest.
    expect(accumulated.some((activity) => activity.id === pendingApproval.id)).toBe(true);
    expect(accumulated.some((activity) => activity.id === resolvedApproval.id)).toBe(false);
  });

  it("returns the previous array by reference when the whole batch is a no-op", () => {
    const previous = [
      makeActivity({ id: "activity-a", sequence: 0 }),
      makeActivity({ id: "activity-b", sequence: 1 }),
    ];
    const accumulator = createThreadActivityAccumulator(previous);

    expect(accumulator.append({ ...previous[0]! })).toBe(false);
    expect(accumulator.append({ ...previous[1]! })).toBe(false);
    expect(accumulator.result()).toBe(previous);
  });

  it("never mutates the caller's previous array", () => {
    const previous = [makeActivity({ id: "activity-a", sequence: 0 })];
    const snapshot = [...previous];
    const accumulator = createThreadActivityAccumulator(previous);

    accumulator.append(makeActivity({ id: "activity-b", sequence: 1 }));
    accumulator.append(makeActivity({ id: "activity-a", payload: richPayload, sequence: 0 }));

    expect(previous).toEqual(snapshot);
    expect(accumulator.result()).not.toBe(previous);
  });
});

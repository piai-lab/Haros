import { EventId, ThreadId, type OrchestrationEvent } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import {
  isClaimedEngineIntent,
  isEngineIntentEvent,
  isEngineSideEffectIntent,
  isReplaySafeClaimedEngineIntent,
} from "./engineIntentClassification.ts";

describe("engineIntentClassification", () => {
  it("orders archive cleanup with later engine side effects", () => {
    const threadId = ThreadId.makeUnsafe("thread-engine-intent-archive");
    const event = {
      sequence: 1,
      eventId: EventId.makeUnsafe("event-engine-intent-archive"),
      aggregateKind: "thread",
      aggregateId: threadId,
      type: "thread.archived",
      occurredAt: "2026-07-23T20:00:00.000Z",
      payload: {
        threadId,
        archivedAt: "2026-07-23T20:00:00.000Z",
        updatedAt: "2026-07-23T20:00:00.000Z",
      },
    } as OrchestrationEvent;

    expect(isEngineIntentEvent(event)).toBe(true);
    if (!isEngineIntentEvent(event)) return;
    expect(isEngineSideEffectIntent(event)).toBe(true);
    expect(isClaimedEngineIntent(event)).toBe(true);
    expect(isReplaySafeClaimedEngineIntent(event)).toBe(true);
  });
});

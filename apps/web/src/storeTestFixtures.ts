import type { ConversationHistoryActivity } from "~/historicalConversation";
// FILE: storeTestFixtures.ts
// Purpose: Minimal historical activity fixture used by display-derivation tests.

import { EventId, TurnId } from "@omnimind/contracts";

export function makeActivity(overrides: {
  id?: string;
  createdAt?: string;
  kind?: string;
  summary?: string;
  tone?: ConversationHistoryActivity["tone"];
  payload?: ConversationHistoryActivity["payload"];
  turnId?: string;
  sequence?: number;
}): ConversationHistoryActivity {
  return {
    id: EventId.makeUnsafe(overrides.id ?? crypto.randomUUID()),
    createdAt: overrides.createdAt ?? "2026-02-23T00:00:00.000Z",
    kind: overrides.kind ?? "tool.started",
    summary: overrides.summary ?? "Tool call",
    tone: overrides.tone ?? "tool",
    payload: overrides.payload ?? {},
    turnId: overrides.turnId ? TurnId.makeUnsafe(overrides.turnId) : null,
    ...(overrides.sequence !== undefined ? { sequence: overrides.sequence } : {}),
  };
}

import { ThreadId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  historicalSourceDisplayName,
  normalizeHistoricalSourceId,
} from "./historicalSourcePresentation";
import { normalizeThreadSession } from "./storeNormalization";

const session = {
  threadId: ThreadId.makeUnsafe("thread-history"),
  status: "ready" as const,
  providerName: " future-runtime ",
  runtimeMode: "full-access" as const,
  activeTurnId: null,
  lastError: null,
  updatedAt: "2026-08-05T00:00:00.000Z",
};

describe("historical runtime source presentation", () => {
  it("preserves unknown source identifiers as opaque history", () => {
    expect(normalizeThreadSession(session, null)?.provider).toBe("future-runtime");
    expect(normalizeHistoricalSourceId(" future-runtime ")).toBe("future-runtime");
  });

  it("keeps a missing historical source unknown instead of coercing it", () => {
    expect(normalizeThreadSession({ ...session, providerName: null }, null)?.provider).toBeNull();
    expect(normalizeHistoricalSourceId(null)).toBeNull();
    expect(historicalSourceDisplayName(null)).toBe("Runtime");
  });
});

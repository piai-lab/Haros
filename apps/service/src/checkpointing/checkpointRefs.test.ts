import { ThreadId, TurnId } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import {
  checkpointRefForThreadTurn,
  checkpointRefForThreadTurnInManagedFamily,
  checkpointRefForThreadTurnStartInManagedFamily,
  isManagedCheckpointRefForThread,
  parseManagedCheckpointRef,
} from "./checkpointRefs.ts";

describe("managed checkpoint refs", () => {
  const threadId = ThreadId.makeUnsafe("thread-1");

  it("creates canonical OmniMind refs", () => {
    expect(checkpointRefForThreadTurn(threadId, 4)).toMatch(/^refs\/omnimind\/checkpoints\//);
  });

  it("recognizes a structurally valid persisted ref for the same thread", () => {
    const canonical = checkpointRefForThreadTurn(threadId, 4);
    const historical = canonical.replace("refs/omnimind/", "refs/historical/");
    expect(parseManagedCheckpointRef(historical)?.namespace).toBe("historical");
    expect(isManagedCheckpointRefForThread(historical, threadId)).toBe(true);
  });

  it("rejects malformed refs and refs belonging to a different thread", () => {
    expect(parseManagedCheckpointRef("refs/heads/feature")).toBeNull();
    expect(
      isManagedCheckpointRefForThread(
        checkpointRefForThreadTurn(ThreadId.makeUnsafe("thread-2"), 4),
        threadId,
      ),
    ).toBe(false);
  });

  it("reconstructs turn and turn-start refs in an existing managed family", () => {
    const historical = checkpointRefForThreadTurn(threadId, 4).replace(
      "refs/omnimind/",
      "refs/historical/",
    );

    expect(checkpointRefForThreadTurnInManagedFamily(historical, threadId, 0)).toBe(
      historical.replace(/\/turn\/4$/, "/turn/0"),
    );
    expect(
      checkpointRefForThreadTurnStartInManagedFamily(
        historical,
        threadId,
        TurnId.makeUnsafe("turn-1"),
      ),
    ).toMatch(/^refs\/historical\/checkpoints\/.+\/turn-start\//);
  });
});

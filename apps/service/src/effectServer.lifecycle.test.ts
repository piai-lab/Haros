import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { closeServerSystemServices } from "./effectServer.ts";

describe("server system service shutdown", () => {
  it("drains managed attachment cleanup", async () => {
    const order: string[] = [];

    await Effect.runPromise(
      closeServerSystemServices({
        managedAttachmentCleanup: {
          drain: Effect.sync(() => order.push("managed-attachments-drained")),
        },
      }),
    );

    expect(order).toEqual(["managed-attachments-drained"]);
  });
});

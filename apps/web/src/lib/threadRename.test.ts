import { describe, expect, it, vi } from "vitest";

const product = vi.hoisted(() => ({
  getConversationSnapshot: vi.fn(),
  updateConversationTitle: vi.fn(),
}));

vi.mock("../nativeApi", () => ({
  readNativeApi: () => ({
    connected: true,
  }),
}));
vi.mock("../wsNativeApi", () => ({ readProductNativeApi: () => product }));

import { dispatchThreadRename } from "./threadRename";

describe("dispatchThreadRename", () => {
  it("updates existing server threads", async () => {
    product.getConversationSnapshot.mockReset().mockResolvedValue({
      readModel: { conversation: { revision: 2 } },
    });
    product.updateConversationTitle.mockReset().mockResolvedValue({});

    const outcome = await dispatchThreadRename({
      threadId: "thread-server" as never,
      newTitle: "Renamed server thread",
      unchangedTitles: ["New thread"],
    });

    expect(outcome).toBe("renamed");
    expect(product.updateConversationTitle).toHaveBeenCalledTimes(1);
    expect(product.updateConversationTitle.mock.calls[0]?.[0]).toMatchObject({
      conversationId: "thread-server",
      expectedRevision: 2,
      title: "Renamed server thread",
    });
  });
});

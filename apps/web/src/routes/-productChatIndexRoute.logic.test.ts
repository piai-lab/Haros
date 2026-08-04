import { describe, expect, it } from "vitest";

import {
  createProductChatDraftOnce,
  resolveProductChatLanding,
} from "./-productChatIndexRoute.logic";

const base = {
  shellHydrated: true,
  splitViewsHydrated: true,
  productConversationIds: [] as string[],
  localDraftThreadId: null,
  lastThreadRoute: null,
  availableSplitViewIds: new Set<string>(),
  canCreateLocalDraft: true,
};

describe("resolveProductChatLanding", () => {
  it("holds until Product shell identity is hydrated", () => {
    expect(resolveProductChatLanding({ ...base, shellHydrated: false })).toEqual({
      kind: "hold-product-shell",
    });
  });

  it("opens an existing Product Chat without any private draft root", () => {
    expect(
      resolveProductChatLanding({
        ...base,
        productConversationIds: ["product-chat"],
        canCreateLocalDraft: false,
      }),
    ).toEqual({ kind: "navigate", threadId: "product-chat" });
  });

  it("preserves a valid remembered split and drops a stale split", () => {
    expect(
      resolveProductChatLanding({
        ...base,
        productConversationIds: ["product-chat"],
        lastThreadRoute: { threadId: "product-chat", splitViewId: "split-live" },
        availableSplitViewIds: new Set(["split-live"]),
      }),
    ).toEqual({ kind: "navigate", threadId: "product-chat", splitViewId: "split-live" });
    expect(
      resolveProductChatLanding({
        ...base,
        productConversationIds: ["product-chat"],
        lastThreadRoute: { threadId: "product-chat", splitViewId: "split-stale" },
      }),
    ).toEqual({ kind: "navigate", threadId: "product-chat" });
  });

  it("drops a remembered mixed split omitted from the Product-only split inventory", () => {
    expect(
      resolveProductChatLanding({
        ...base,
        productConversationIds: ["product-chat", "product-chat-2"],
        lastThreadRoute: { threadId: "product-chat", splitViewId: "split-mixed-agent" },
        availableSplitViewIds: new Set(["split-product-only"]),
      }),
    ).toEqual({ kind: "navigate", threadId: "product-chat" });
  });

  it("admits only an unsent local draft outside Product inventory", () => {
    expect(resolveProductChatLanding({ ...base, localDraftThreadId: "draft-chat" })).toEqual({
      kind: "navigate",
      threadId: "draft-chat",
    });
  });

  it("auto-opens one local draft and distinguishes unavailable draft bootstrap", async () => {
    expect(resolveProductChatLanding(base)).toEqual({ kind: "create-draft" });
    expect(resolveProductChatLanding({ ...base, canCreateLocalDraft: false })).toEqual({
      kind: "hold-draft-bootstrap",
    });

    const guard = { current: false };
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const create = async () => {
      calls += 1;
      await pending;
      return "draft";
    };
    const first = createProductChatDraftOnce(guard, create);
    const duplicate = createProductChatDraftOnce(guard, create);
    expect(calls).toBe(1);
    expect(await duplicate).toBeNull();
    release();
    expect(await first).toBe("draft");
  });
});

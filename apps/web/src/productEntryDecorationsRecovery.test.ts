import {
  MessageId,
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationSnapshot,
  ThreadId,
  ThreadMarkerId,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchPinnedMessageAdd, type ProductPinApi } from "./pinnedMessages";
import { useProductStore } from "./store/productStore";
import { dispatchThreadMarkerAdd, type ProductMarkerApi } from "./threadMarkers";

const threadId = ThreadId.makeUnsafe("conversation-entry-decoration");
const messageId = MessageId.makeUnsafe("entry-decoration");
const markerId = ThreadMarkerId.makeUnsafe("marker-decoration");
const now = "2026-08-05T00:00:00.000Z";

function transportError(code: "WS_REQUEST_TIMEOUT" | "WS_REQUEST_ABORTED", message: string) {
  return Object.assign(new Error(message), { code });
}

function snapshot(input: {
  readonly pinEntryId?: string;
  readonly marker?: Partial<{
    id: string;
    entryId: string;
    startOffset: number;
    endOffset: number;
    selectedText: string;
    style: "highlight" | "underline";
    color: "yellow" | "blue" | "green" | "pink";
  }>;
}) {
  const marker = input.marker;
  return Schema.decodeUnknownSync(ProductConversationSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 2,
    readModel: {
      conversation: {
        id: threadId,
        workspaceId: "workspace-entry-decoration",
        title: "Entry decorations",
        workspaceKind: "chat",
        revision: 2,
        archivedAt: null,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        latestRunId: null,
        receiptState: null,
        createdAt: now,
        updatedAt: now,
      },
      workspace: {
        id: "workspace-entry-decoration",
        access: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
        observedAt: now,
      },
      entries: [],
      streamingEntryIds: [],
      runs: [],
      activities: [],
      recoveries: [],
      queue: [],
      entryPins:
        input.pinEntryId === undefined
          ? []
          : [{ entryId: input.pinEntryId, label: null, done: false, pinnedAt: now }],
      entryMarkers:
        marker === undefined
          ? []
          : [
              {
                id: marker.id ?? markerId,
                entryId: marker.entryId ?? messageId,
                startOffset: marker.startOffset ?? 0,
                endOffset: marker.endOffset ?? 4,
                selectedText: marker.selectedText ?? "text",
                selectedTextDigest: `sha256:${"0".repeat(64)}`,
                style: marker.style ?? "highlight",
                color: marker.color ?? "yellow",
                label: null,
                done: false,
                createdAt: now,
                updatedAt: now,
              },
            ],
    },
  });
}

function pinApi(
  getConversationSnapshot: ProductPinApi["getConversationSnapshot"],
  addEntryPin: ProductPinApi["addEntryPin"],
): ProductPinApi {
  return {
    getConversationSnapshot: (input) => getConversationSnapshot(input),
    addEntryPin: (input) => addEntryPin(input),
    removeEntryPin: async () => snapshot({}),
    setEntryPinDone: async () => snapshot({}),
    setEntryPinLabel: async () => snapshot({}),
  };
}

function markerApi(
  getConversationSnapshot: ProductMarkerApi["getConversationSnapshot"],
  addEntryMarker: ProductMarkerApi["addEntryMarker"],
): ProductMarkerApi {
  return {
    getConversationSnapshot: (input) => getConversationSnapshot(input),
    addEntryMarker: (input) => addEntryMarker(input),
    removeEntryMarker: async () => snapshot({}),
    setEntryMarkerDone: async () => snapshot({}),
    setEntryMarkerLabel: async () => snapshot({}),
  };
}

beforeEach(() => {
  useProductStore.getState().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Product entry pin response-loss recovery", () => {
  it("publishes a committed timeout resnapshot exactly once without replay", async () => {
    const error = transportError("WS_REQUEST_TIMEOUT", "pin response lost");
    const committed = snapshot({ pinEntryId: messageId });
    const getConversationSnapshot = vi
      .fn<ProductPinApi["getConversationSnapshot"]>()
      .mockResolvedValueOnce(snapshot({}))
      .mockResolvedValueOnce(committed);
    const addEntryPin = vi.fn<ProductPinApi["addEntryPin"]>().mockRejectedValue(error);
    let publications = 0;
    const unsubscribe = useProductStore.subscribe(() => {
      publications += 1;
    });

    await expect(
      dispatchPinnedMessageAdd(threadId, messageId, pinApi(getConversationSnapshot, addEntryPin)),
    ).resolves.toBeUndefined();
    unsubscribe();
    expect(addEntryPin).toHaveBeenCalledOnce();
    expect(publications).toBe(1);
    expect(useProductStore.getState().detailByConversation[String(threadId)]).toBe(
      committed.readModel,
    );
  });

  it("requires the exact entry identity before accepting recovery", async () => {
    const error = transportError("WS_REQUEST_ABORTED", "pin response aborted");
    const api = pinApi(
      vi
        .fn<ProductPinApi["getConversationSnapshot"]>()
        .mockResolvedValueOnce(snapshot({}))
        .mockResolvedValueOnce(snapshot({ pinEntryId: "other-entry" })),
      vi.fn<ProductPinApi["addEntryPin"]>().mockRejectedValue(error),
    );

    await expect(dispatchPinnedMessageAdd(threadId, messageId, api)).rejects.toBe(error);
  });

  it("preserves known and untyped failures without resnapshot", async () => {
    for (const error of [
      Object.assign(new Error("revision conflict"), { code: "PRODUCT_CONVERSATION_REVISION_CONFLICT" }),
      new TypeError("local adapter bug"),
    ]) {
      const getConversationSnapshot = vi
        .fn<ProductPinApi["getConversationSnapshot"]>()
        .mockResolvedValue(snapshot({}));
      const api = pinApi(
        getConversationSnapshot,
        vi.fn<ProductPinApi["addEntryPin"]>().mockRejectedValue(error),
      );
      await expect(dispatchPinnedMessageAdd(threadId, messageId, api)).rejects.toBe(error);
      expect(getConversationSnapshot).toHaveBeenCalledOnce();
    }
  });

  it("preserves the original timeout when authoritative resnapshot fails", async () => {
    const original = transportError("WS_REQUEST_TIMEOUT", "pin response lost");
    const api = pinApi(
      vi
        .fn<ProductPinApi["getConversationSnapshot"]>()
        .mockResolvedValueOnce(snapshot({}))
        .mockRejectedValueOnce(new Error("resnapshot failed")),
      vi.fn<ProductPinApi["addEntryPin"]>().mockRejectedValue(original),
    );

    await expect(dispatchPinnedMessageAdd(threadId, messageId, api)).rejects.toBe(original);
  });
});

describe("Product entry marker response-loss recovery", () => {
  const input = {
    threadId,
    markerId,
    messageId,
    startOffset: 0,
    endOffset: 4,
    selectedText: "text",
    style: "highlight" as const,
    color: "yellow" as const,
  };

  it("publishes a committed timeout resnapshot exactly once without replay", async () => {
    const error = transportError("WS_REQUEST_TIMEOUT", "marker response lost");
    const committed = snapshot({ marker: {} });
    const getConversationSnapshot = vi
      .fn<ProductMarkerApi["getConversationSnapshot"]>()
      .mockResolvedValueOnce(snapshot({}))
      .mockResolvedValueOnce(committed);
    const addEntryMarker = vi
      .fn<ProductMarkerApi["addEntryMarker"]>()
      .mockRejectedValue(error);
    let publications = 0;
    const unsubscribe = useProductStore.subscribe(() => {
      publications += 1;
    });

    await expect(
      dispatchThreadMarkerAdd(input, markerApi(getConversationSnapshot, addEntryMarker)),
    ).resolves.toBeUndefined();
    unsubscribe();
    expect(addEntryMarker).toHaveBeenCalledOnce();
    expect(publications).toBe(1);
    expect(useProductStore.getState().detailByConversation[String(threadId)]).toBe(
      committed.readModel,
    );
  });

  it("requires every marker identity and presentation field to match", async () => {
    const error = transportError("WS_REQUEST_ABORTED", "marker response aborted");
    const api = markerApi(
      vi.fn<ProductMarkerApi["getConversationSnapshot"]>()
        .mockResolvedValueOnce(snapshot({}))
        .mockResolvedValueOnce(snapshot({ marker: { color: "blue" } })),
      vi.fn<ProductMarkerApi["addEntryMarker"]>().mockRejectedValue(error),
    );

    await expect(dispatchThreadMarkerAdd(input, api)).rejects.toBe(error);
  });

  it("preserves the original timeout when authoritative resnapshot fails", async () => {
    const original = transportError("WS_REQUEST_TIMEOUT", "marker response lost");
    const api = markerApi(
      vi
        .fn<ProductMarkerApi["getConversationSnapshot"]>()
        .mockResolvedValueOnce(snapshot({}))
        .mockRejectedValueOnce(new Error("resnapshot failed")),
      vi.fn<ProductMarkerApi["addEntryMarker"]>().mockRejectedValue(original),
    );

    await expect(dispatchThreadMarkerAdd(input, api)).rejects.toBe(original);
  });
});

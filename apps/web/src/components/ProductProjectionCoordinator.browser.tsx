// FILE: productProjectionCoordinator.browser.tsx
// Purpose: Browser proof that an initially failed Product detail remains retained and is
//          resnapshotted on the next transport-open boundary.

import "../index.css";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductConversationSnapshot,
  ProductShellSnapshot,
} from "@omnimind/contracts";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { ProductProjectionCoordinator } from "../productProjectionCoordinator";
import { useProductStore } from "../store/productStore";

const harness = vi.hoisted(() => ({
  conversationSnapshotCalls: 0,
  transportListener: null as null | ((state: "connecting" | "open" | "closed") => void),
  conversationSnapshot: null as unknown,
  shellSnapshot: null as unknown,
}));

vi.mock("../wsNativeApi", () => ({
  readProductNativeApi: () => ({
    getShellSnapshot: vi.fn(async () => harness.shellSnapshot),
    getConversationSnapshot: vi.fn(async () => {
      harness.conversationSnapshotCalls += 1;
      if (harness.conversationSnapshotCalls === 1) {
        throw new Error("initial detail unavailable");
      }
      return harness.conversationSnapshot;
    }),
    readFacts: vi.fn(),
  }),
}));

vi.mock("../wsTransportEvents", () => ({
  addWsTransportStateListener: (listener: (state: "connecting" | "open" | "closed") => void) => {
    harness.transportListener = listener;
    return () => {
      if (harness.transportListener === listener) harness.transportListener = null;
    };
  },
}));

const CONVERSATION_ID = ProductConversationId.makeUnsafe("conversation-reconnect");

describe("Product projection reconnect recovery", () => {
  beforeEach(() => {
    useProductStore.getState().reset();
    harness.conversationSnapshotCalls = 0;
    harness.transportListener = null;
    harness.shellSnapshot = Schema.decodeUnknownSync(ProductShellSnapshot)({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 1,
      runtimeCatalog: null,
      workspaces: [],
      groups: [],
      conversations: [
        {
          id: CONVERSATION_ID,
          workspaceId: "workspace-reconnect",
          title: "Reconnect proof",
          workspaceKind: "chat",
          revision: 1,
          archivedAt: null,
          isPinned: false,
          notes: "",
          boardState: "active",
          boardStateChangedAt: null,
          latestRunId: null,
          receiptState: null,
          createdAt: "2026-08-04T00:00:00.000Z",
          updatedAt: "2026-08-04T00:00:01.000Z",
        },
      ],
    });
    harness.conversationSnapshot = Schema.decodeUnknownSync(ProductConversationSnapshot)({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 2,
      readModel: {
        conversation: {
          id: CONVERSATION_ID,
          workspaceId: "workspace-reconnect",
          title: "Reconnect proof",
          workspaceKind: "chat",
          revision: 1,
          archivedAt: null,
          isPinned: false,
          notes: "",
          boardState: "active",
          boardStateChangedAt: null,
          latestRunId: null,
          receiptState: null,
          createdAt: "2026-08-04T00:00:00.000Z",
          updatedAt: "2026-08-04T00:00:02.000Z",
        },
        workspace: {
          id: "workspace-reconnect",
          access: {
            kind: "chat",
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references",
          },
          observedAt: "2026-08-04T00:00:00.000Z",
        },
        entries: [],
        streamingEntryIds: [],
        runs: [],
        activities: [],
        recoveries: [],
        queue: [],
        entryPins: [],
        entryMarkers: [],
      },
    });
    // ChatView retains before its first direct detail fetch. The coordinator must continue to see
    // this identity even when that fetch fails, so the next open event can resnapshot it.
    useProductStore.getState().retainConversation(CONVERSATION_ID);
  });

  afterEach(async () => {
    await cleanup();
    useProductStore.getState().reset();
  });

  it("resnapshots the retained detail after the first fetch fails", async () => {
    await render(<ProductProjectionCoordinator />);

    await vi.waitFor(() => expect(harness.conversationSnapshotCalls).toBe(1));
    expect(useProductStore.getState().detailByConversation[CONVERSATION_ID]).toBeUndefined();
    expect(useProductStore.getState().detailRetainCountByConversation[CONVERSATION_ID]).toBe(1);

    harness.transportListener?.("open");

    await vi.waitFor(() =>
      expect(useProductStore.getState().detailByConversation[CONVERSATION_ID]).toBeDefined(),
    );
    expect(harness.conversationSnapshotCalls).toBe(2);
    expect(useProductStore.getState().reconnectGeneration).toBe(1);
    expect(useProductStore.getState().detailRetainCountByConversation[CONVERSATION_ID]).toBe(1);
  });

});

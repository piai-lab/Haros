// Purpose: Browser proof that Product Conversation lifecycle actions use the typed Product surface.

import "../index.css";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductWorkspaceId,
  ThreadId,
  type ProductConversationSnapshot,
  type ProductShellSnapshot,
} from "@omnimind/contracts";
import { useState } from "react";
import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import {
  archiveProductConversation,
  deleteProductConversation,
  restoreProductConversation,
  updateProductConversationTitle,
  type ProductConversationArchiveApi,
  type ProductConversationDeleteApi,
  type ProductConversationTitleApi,
} from "../productConversationMutations";

const THREAD_ID = ThreadId.makeUnsafe("browser-conversation-lifecycle");
const CONVERSATION_ID = ProductConversationId.makeUnsafe(THREAD_ID);
const WORKSPACE_ID = ProductWorkspaceId.makeUnsafe("browser-conversation-workspace");
const NOW = "2026-08-05T00:00:00.000Z";

function createSnapshot(input: {
  readonly title: string;
  readonly revision: number;
  readonly archivedAt: string | null;
}): ProductConversationSnapshot {
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: input.revision,
    readModel: {
      conversation: {
        id: CONVERSATION_ID,
        workspaceId: WORKSPACE_ID,
        title: input.title,
        workspaceKind: "chat",
        revision: input.revision,
        archivedAt: input.archivedAt,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        latestRunId: null,
        receiptState: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      workspace: {
        id: WORKSPACE_ID,
        access: {
          kind: "chat",
          managedDirectory: null,
          primaryFolder: null,
          executionTarget: null,
          writeAuthority: "read-only-references",
        },
        observedAt: NOW,
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
  };
}

function LifecycleHarness(props: {
  readonly api: ProductConversationTitleApi &
    ProductConversationArchiveApi &
    ProductConversationDeleteApi;
}) {
  const [state, setState] = useState("ready");
  return (
    <div>
      <p role="status">{state}</p>
      <button
        type="button"
        onClick={() =>
          void updateProductConversationTitle(THREAD_ID, "Renamed in Product", props.api).then(
            (snapshot) => setState(snapshot.readModel.conversation.title),
          )
        }
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() =>
          void archiveProductConversation(THREAD_ID, props.api).then(() => setState("archived"))
        }
      >
        Archive
      </button>
      <button
        type="button"
        onClick={() =>
          void restoreProductConversation(THREAD_ID, props.api).then(() => setState("restored"))
        }
      >
        Restore
      </button>
      <button
        type="button"
        onClick={() =>
          void deleteProductConversation(THREAD_ID, props.api).then(() => setState("deleted"))
        }
      >
        Delete
      </button>
    </div>
  );
}

describe("Product Conversation lifecycle command surface", () => {
  afterEach(async () => cleanup());

  it("renames, archives, restores and deletes through typed Product mutations", async () => {
    let snapshot = createSnapshot({ title: "Original", revision: 1, archivedAt: null });
    const getConversationSnapshot = vi.fn(async () => snapshot);
    const updateConversationTitle = vi.fn(async (input) => {
      snapshot = createSnapshot({
        title: input.title,
        revision: input.expectedRevision + 1,
        archivedAt: snapshot.readModel.conversation.archivedAt,
      });
      return snapshot;
    });
    const archiveConversation = vi.fn(async (input) => {
      snapshot = createSnapshot({
        title: snapshot.readModel.conversation.title,
        revision: input.expectedRevision + 1,
        archivedAt: NOW,
      });
      return snapshot;
    });
    const restoreConversation = vi.fn(async (input) => {
      snapshot = createSnapshot({
        title: snapshot.readModel.conversation.title,
        revision: input.expectedRevision + 1,
        archivedAt: null,
      });
      return snapshot;
    });
    const deleteConversation = vi.fn(async (input) => ({
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: CONVERSATION_ID,
      revision: input.expectedRevision + 1,
      sequence: snapshot.sequence + 1,
    }));
    const shell: ProductShellSnapshot = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      sequence: 6,
      workspaces: [],
      groups: [],
      conversations: [],
      runtimeCatalog: null,
    };
    const api = {
      getConversationSnapshot,
      updateConversationTitle,
      archiveConversation,
      restoreConversation,
      deleteConversation,
      getShellSnapshot: vi.fn(async () => shell),
    } satisfies ProductConversationTitleApi &
      ProductConversationArchiveApi &
      ProductConversationDeleteApi;

    await render(<LifecycleHarness api={api} />);

    await page.getByRole("button", { name: "Rename" }).click();
    await expect.element(page.getByRole("status")).toHaveTextContent("Renamed in Product");
    expect(updateConversationTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: CONVERSATION_ID,
        expectedRevision: 1,
        title: "Renamed in Product",
      }),
    );

    await page.getByRole("button", { name: "Archive" }).click();
    await expect.element(page.getByRole("status")).toHaveTextContent("archived");
    expect(archiveConversation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID, expectedRevision: 2 }),
    );

    await page.getByRole("button", { name: "Restore" }).click();
    await expect.element(page.getByRole("status")).toHaveTextContent("restored");
    expect(restoreConversation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID, expectedRevision: 3 }),
    );

    await page.getByRole("button", { name: "Delete" }).click();
    await expect.element(page.getByRole("status")).toHaveTextContent("deleted");
    expect(deleteConversation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID, expectedRevision: 4 }),
    );
    expect(getConversationSnapshot).toHaveBeenCalledTimes(4);
  });
});

import "../../index.css";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductGroupId,
  ProductWorkspaceId,
} from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { THREAD_DRAG_MIME } from "../chat-drop-overlay/ChatPaneDropOverlay";
import { useProductGroupsUiStore } from "../../productGroupsUiStore";
import { useProductStore } from "../../store/productStore";
import { ProductGroupsList } from "./ProductGroupsList";
import { SidebarProvider } from "../ui/sidebar";

const groupA = ProductGroupId.makeUnsafe("group-a");
const groupB = ProductGroupId.makeUnsafe("group-b");
const conversationId = ProductConversationId.makeUnsafe("conversation-a");

const groupMutations = vi.hoisted(() => ({
  add: vi.fn(async () => undefined),
  create: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  reorder: vi.fn(async () => undefined),
  refresh: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
}));

vi.mock("../../productGroups", () => ({
  addProductConversationGroups: groupMutations.add,
  createProductGroup: groupMutations.create,
  deleteProductGroup: groupMutations.remove,
  reorderProductGroups: groupMutations.reorder,
  refreshProductGroups: groupMutations.refresh,
  setProductConversationGroups: groupMutations.set,
  updateProductGroup: groupMutations.update,
}));

function hydrateGroups() {
  useProductStore.getState().setShellSnapshot({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 1,
    runtimeCatalog: null,
    workspaces: [
      {
        id: ProductWorkspaceId.makeUnsafe("workspace-a"),
        title: "Project A",
        access: {
          kind: "folder-backed",
          managedDirectory: null,
          primaryFolder: "/workspace/a",
          executionTarget: {
            kind: "local",
            targetRef: "/workspace/a",
            observedAt: "2026-08-05T00:00:00.000Z",
          },
          writeAuthority: "primary-folder",
        },
        runCommand: null,
        archivedAt: null,
        visibleInSidebar: true,
        isPinned: false,
        revision: 1,
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:00.000Z",
      },
    ],
    conversations: [
      {
        id: conversationId,
        workspaceId: ProductWorkspaceId.makeUnsafe("workspace-a"),
        title: "Conversation A",
        workspaceKind: "folder-backed",
        revision: 1,
        archivedAt: null,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        latestRunId: null,
        receiptState: null,
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:00.000Z",
      },
    ],
    groups: [
      {
        id: groupA,
        name: "Alpha",
        color: "blue",
        sortOrder: 0,
        revision: 1,
        conversationIds: [conversationId],
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:00.000Z",
      },
      {
        id: groupB,
        name: "Beta",
        color: "green",
        sortOrder: 1,
        revision: 1,
        conversationIds: [],
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:00.000Z",
      },
    ],
  });
  useProductGroupsUiStore.getState().expandGroup(groupA);
}

describe("ProductGroupsList", () => {
  beforeEach(() => {
    localStorage.clear();
    useProductStore.getState().reset();
    useProductGroupsUiStore.setState({ expandedGroupIds: [] });
    vi.clearAllMocks();
    hydrateGroups();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports CRUD and reorder without giving duplicate Conversation rows route ownership", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await render(
      <SidebarProvider>
        <ProductGroupsList
          activeConversationId={conversationId}
          createRequest={0}
          onOpenConversation={vi.fn()}
        />
      </SidebarProvider>,
    );

    const duplicate = document.querySelector(
      `[data-product-group-conversation-id="${conversationId}"]`,
    );
    expect(duplicate).not.toBeNull();
    expect(duplicate?.hasAttribute("aria-current")).toBe(false);
    expect(duplicate?.getAttribute("data-context-current")).toBe("true");

    document.querySelector<HTMLButtonElement>('[aria-label="Move Alpha down"]')?.click();
    await vi.waitFor(() => {
      expect(groupMutations.reorder).toHaveBeenCalledWith([groupB, groupA]);
      expect(
        document.querySelector('[data-product-domain="groups"]')?.hasAttribute("aria-busy"),
      ).toBe(false);
    });

    await page.getByText("Alpha", { exact: true }).hover();
    await page.getByRole("button", { name: "Delete Alpha" }).click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(groupMutations.remove).toHaveBeenCalledWith(groupA);
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-product-domain="groups"]')?.hasAttribute("aria-busy"),
      ).toBe(false);
    });

    await page.getByText("Alpha", { exact: true }).hover();
    await page.getByRole("button", { name: "Edit Alpha" }).click();
    await page.getByLabelText("Group name").fill("Alpha edited");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect(groupMutations.update).toHaveBeenCalledWith(groupA, {
      name: "Alpha edited",
      color: "blue",
    });
    await expect.element(page.getByRole("heading", { name: "Edit group" })).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  it("creates a Group from the section request", async () => {
    await render(
      <SidebarProvider>
        <ProductGroupsList
          activeConversationId={conversationId}
          createRequest={1}
          onOpenConversation={vi.fn()}
        />
      </SidebarProvider>,
    );
    await page.getByLabelText("Group name").fill("Gamma");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect(groupMutations.create).toHaveBeenCalledWith({ name: "Gamma", color: "blue" });
    await expect.element(page.getByRole("heading", { name: "New group" })).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  it("uses exact-set drag by default and additive drag only with the explicit modifier", async () => {
    await render(
      <SidebarProvider>
        <ProductGroupsList
          activeConversationId={conversationId}
          createRequest={0}
          onOpenConversation={vi.fn()}
        />
      </SidebarProvider>,
    );

    const target = page.getByRole("button", { name: /Beta/ }).element().closest("div");
    expect(target).not.toBeNull();
    const transfer = new DataTransfer();
    transfer.setData(THREAD_DRAG_MIME, JSON.stringify({ threadId: conversationId }));
    target?.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
    expect(groupMutations.set).toHaveBeenCalledWith([conversationId], [groupB]);

    target?.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: transfer, altKey: true }),
    );
    expect(groupMutations.add).toHaveBeenCalledWith([conversationId], [groupB]);
  });
});

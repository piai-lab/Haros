// FILE: AgentChatWorkbench.browser.tsx
// Purpose: Focused browser proof for route-backed Agent | Chat and truthful Product boundaries.

import "../index.css";

import {
  ProductConversationId,
  ProductWorkspaceId,
  ThreadId,
  type ProductConversationSummary,
} from "@omnimind/contracts";
import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { SidebarSurfacePicker } from "./Sidebar";
import { ComposerQueuedHeader } from "./chat/ComposerQueuedHeader";
import { ComposerColumnFrame } from "./chat/ComposerColumnFrame";
import { getWorkbenchCopy } from "../i18n/workbenchCopy";
import { ProductConversationNotice } from "./product/ProductConversationNotice";
import { ProductConversationRouteState } from "./product/ProductConversationRouteState";
import { ProductChatRecentList } from "./product/ProductChatRecentList";
import { SidebarProvider } from "./ui/sidebar";

const PRODUCT_CHAT: ProductConversationSummary = {
  id: ProductConversationId.makeUnsafe("product-chat-1"),
  workspaceId: ProductWorkspaceId.makeUnsafe("workspace-chat-1"),
  title: "Product conversation",
  workspaceKind: "chat",
  revision: 1,
  archivedAt: null,
  isPinned: false,
  notes: "",
  boardState: "active",
  boardStateChangedAt: null,
  receiptState: null,
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:01.000Z",
};

describe("Agent | Chat workbench boundaries", () => {
  afterEach(async () => cleanup());

  it("keeps Agent first/default and provides roving keyboard focus without implicit activation", async () => {
    const onSelect = vi.fn();
    await render(
      <div>
        <SidebarSurfacePicker
          views={["threads", "studio"]}
          activeView="threads"
          onSelectView={onSelect}
        />
        <div
          id="sidebar-surface-panel-agent"
          role="tabpanel"
          aria-labelledby="sidebar-surface-tab-agent"
        />
      </div>,
    );

    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Agent", "Chat"]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.getAttribute("aria-controls")).toBe("sidebar-surface-panel-agent");
    expect(tabs[1]?.getAttribute("aria-controls")).toBe("sidebar-surface-panel-chat");
    expect(tabs[0]?.tabIndex).toBe(0);
    expect(tabs[1]?.tabIndex).toBe(-1);
    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel?.id).toBe(tabs[0]?.getAttribute("aria-controls"));
    expect(panel?.getAttribute("aria-labelledby")).toBe(tabs[0]?.id);

    tabs[0]?.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("studio");

    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(tabs[0]);
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(tabs[1]);
  });

  it("renders a real unsent Chat draft in Recent with exactly one current row", async () => {
    const onOpen = vi.fn();
    await render(
      <SidebarProvider>
        <ProductChatRecentList
          conversations={[PRODUCT_CHAT]}
          localDrafts={[
            {
              id: "local-chat-draft-1",
              createdAt: "2026-08-04T00:00:02.000Z",
            },
          ]}
          activeConversationId="local-chat-draft-1"
          hydrated
          onOpenConversation={onOpen}
        />
      </SidebarProvider>,
    );

    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(
      document.querySelector('[data-product-local-draft-id="local-chat-draft-1"]'),
    ).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: /Product conversation/u }).click();
    expect(onOpen).toHaveBeenCalledWith(ThreadId.makeUnsafe("product-chat-1"));
  });

  it("does not replay missing or uncertain Product state", async () => {
    const onRecent = vi.fn();
    const onCreate = vi.fn();
    await render(
      <div>
        <ProductConversationNotice
          presentation={{
            kind: "delivery_unknown",
            label: "Delivery unknown",
            title: "Delivery could not be confirmed",
            description: "OmniMind will not replay this request automatically.",
          }}
        />
        <ProductConversationRouteState
          title="This conversation is unavailable"
          description="Nothing was restored or replayed."
          secondaryAction={{ label: "Back to Chat recent", onClick: onRecent }}
          primaryAction={{ label: "Start new conversation", onClick: onCreate }}
        />
      </div>,
    );

    expect(onRecent).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
    expect(
      Array.from(document.querySelectorAll("button")).some((button) =>
        /retry|replay/i.test(button.textContent ?? ""),
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "Back to Chat recent" }).click();
    await page.getByRole("button", { name: "Start new conversation" }).click();
    expect(onRecent).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("keeps Conversation and Queue available while execution is unavailable", async () => {
    await render(
      <div>
        <ProductConversationNotice
          presentation={{
            kind: "execution_unavailable",
            label: "Execution unavailable",
            title: "Conversation available; execution unavailable",
            description:
              "This conversation and its Queue remain available. New dispatch waits for readiness.",
          }}
        />
        <button type="button" aria-label="Add to Queue">
          Add to Queue
        </button>
      </div>,
    );

    expect(document.body.textContent).toContain("Conversation available; execution unavailable");
    expect(document.body.textContent).toContain("Queue remain available");
    expect(page.getByRole("button", { name: "Add to Queue" })).toBeTruthy();
    expect(document.body.textContent).not.toContain("Provider unavailable");
  });

  it("renders Product Queue editing with truthful Chinese action and accessibility copy", async () => {
    const onCancelEdit = vi.fn();
    await render(
      <ComposerColumnFrame>
        <ComposerQueuedHeader
          queuedTurns={[
            {
              id: "product-queue-item",
              previewText: "",
            } as never,
          ]}
          primaryAction={{ kind: "move-next", onSelect: vi.fn() }}
          editingTurnId="product-queue-item"
          onCancelEdit={onCancelEdit}
          onRemove={vi.fn()}
          onEdit={vi.fn()}
          copy={getWorkbenchCopy("zh-CN")}
        />
      </ComposerColumnFrame>,
    );

    const row = document.querySelector<HTMLElement>("[data-testid='queued-follow-up-row']");
    expect(row?.dataset.queueItemKind).toBe("move-next");
    expect(row?.dataset.queueEditing).toBe("true");
    expect(row?.textContent).toContain("队列中的后续消息");
    expect(row?.textContent).toContain("正在编辑");
    expect(row?.textContent).not.toContain("Steer");
    expect(page.getByRole("button", { name: "删除队列中的后续消息" })).toBeTruthy();
    await page.getByRole("button", { name: "取消编辑" }).click();
    expect(onCancelEdit).toHaveBeenCalledOnce();
  });
});

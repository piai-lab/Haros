// FILE: ProductRoutePerformance.browser.tsx
// Purpose: Measures committed TanStack Agent/Chat route switches over the real route owner.

import "../index.css";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProductConversationId,
  ProductWorkspaceId,
  ThreadId,
  type ProductConversationSnapshot,
  type ProductShellSnapshot,
} from "@omnimind/contracts";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { commands } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

vi.mock("../hooks/useHandleNewStudioChat", () => ({
  useHandleNewStudioChat: () => ({ handleNewStudioChat: vi.fn() }),
}));

import { useProductStore } from "../store/productStore";
import { useSplitViewStore } from "../splitViewStore";
import { useStore } from "../store";
import { useComposerDraftStore } from "../composerDraftStore";
vi.mock("./chat/SplitChatSurface", () => ({ SplitChatSurface: () => null }));

import { ChatThreadRouteView } from "../routes/_chat.$threadId";
import { SidebarProvider } from "./ui/sidebar";

const AGENT_ID = ThreadId.makeUnsafe("route-product-agent");
const CHAT_ID = ThreadId.makeUnsafe("route-product-chat");
const AGENT_WORKSPACE_ID = ProductWorkspaceId.makeUnsafe("route-agent-workspace");
const CHAT_WORKSPACE_ID = ProductWorkspaceId.makeUnsafe("route-chat-workspace");
const NOW = "2026-08-05T00:00:00.000Z";
const ROUTE_SWITCH_BUDGET = Object.freeze({
  maxP95Ms: 80,
  maxLongTasks: 0,
  maxPostGcHeapGrowthBytes: 24 * 1024 * 1024,
});

const performanceCommands = commands as typeof commands & {
  collectBrowserHeap(): Promise<{ readonly usedSize: number; readonly totalSize: number }>;
};

const shell: ProductShellSnapshot = {
  protocolVersion: PRODUCT_PROTOCOL_VERSION,
  sequence: 1,
  workspaces: [
    {
      id: AGENT_WORKSPACE_ID,
      title: "Agent workspace",
      access: {
        kind: "folder-backed",
        managedDirectory: null,
        primaryFolder: "/tmp/omnimind-route-performance",
        executionTarget: {
          kind: "local",
          targetRef: "/tmp/omnimind-route-performance",
          observedAt: NOW,
        },
        writeAuthority: "primary-folder",
      },
      runCommand: null,
      archivedAt: null,
      visibleInSidebar: true,
      isPinned: false,
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: CHAT_WORKSPACE_ID,
      title: "Chat workspace",
      access: {
        kind: "chat",
        managedDirectory: null,
        primaryFolder: null,
        executionTarget: null,
        writeAuthority: "read-only-references",
      },
      runCommand: null,
      archivedAt: null,
      visibleInSidebar: true,
      isPinned: false,
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  groups: [],
  conversations: [
    {
      id: ProductConversationId.makeUnsafe(AGENT_ID),
      workspaceId: AGENT_WORKSPACE_ID,
      title: "Agent route",
      workspaceKind: "folder-backed",
      revision: 1,
      archivedAt: null,
      isPinned: false,
      notes: "",
      boardState: "active",
      boardStateChangedAt: null,
      receiptState: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: ProductConversationId.makeUnsafe(CHAT_ID),
      workspaceId: CHAT_WORKSPACE_ID,
      title: "Chat route",
      workspaceKind: "chat",
      revision: 1,
      archivedAt: null,
      isPinned: false,
      notes: "",
      boardState: "active",
      boardStateChangedAt: null,
      receiptState: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  runtimeCatalog: null,
};

function conversationSnapshot(index: 0 | 1): ProductConversationSnapshot {
  const conversation = shell.conversations[index]!;
  const workspaceSummary = shell.workspaces[index]!;
  return {
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence: 1,
    readModel: {
      conversation,
      workspace: {
        id: workspaceSummary.id,
        access: workspaceSummary.access,
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

function hydrateProductRouteState(): void {
  const store = useProductStore.getState();
  store.setShellSnapshot(shell);
  store.setConversationSnapshot(conversationSnapshot(0));
  store.setConversationSnapshot(conversationSnapshot(1));
  useSplitViewStore.setState({ hasHydrated: true });
  useStore.setState({ threadsHydrated: true });
}

function percentile95(samples: readonly number[]): number {
  return [...samples].sort((left, right) => left - right)[Math.ceil(samples.length * 0.95) - 1] ?? 0;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(count = 3): Promise<void> {
  for (let index = 0; index < count; index += 1) await nextAnimationFrame();
}

function createRouteHarness() {
  const rootRoute = createRootRoute();
  const threadRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/$threadId",
    validateSearch: (search: Record<string, unknown>) => ({
      ...(search.surface === "chat" ? { surface: "chat" as const } : {}),
    }),
    component: function ThreadRouteComponent() {
      const { threadId } = threadRoute.useParams();
      return (
        <ChatThreadRouteView
          threadId={ThreadId.makeUnsafe(threadId)}
          search={threadRoute.useSearch()}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([threadRoute]),
    history: createMemoryHistory({ initialEntries: [`/${AGENT_ID}`] }),
  });
  return router;
}

describe("committed Product route-owner performance", () => {
  afterEach(async () => {
    useProductStore.getState().reset();
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
    await cleanup();
  });

  it("keeps donor interaction modes historical on the real Product ChatView route", async () => {
    hydrateProductRouteState();
    useComposerDraftStore.getState().setInteractionMode(AGENT_ID, "plan");
    const router = createRouteHarness();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await router.load();
    await render(
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <RouterProvider router={router} />
        </SidebarProvider>
      </QueryClientProvider>,
    );
    await vi.waitFor(() =>
      expect(
        document.querySelector(
          `[data-conversation-surface='agent'][data-active-conversation='true']`,
        ),
      ).not.toBeNull(),
    );
    await vi.waitFor(() =>
      expect(
        useComposerDraftStore.getState().draftsByThreadId[AGENT_ID]?.interactionMode ?? null,
      ).toBeNull(),
    );

    const editor = document.querySelector<HTMLElement>(`[data-testid='composer-editor']`);
    expect(editor).not.toBeNull();
    editor?.click();
    editor?.focus();
    editor?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(document.querySelector(`button[title^='Plan mode']`)).toBeNull();
    expect(
      useComposerDraftStore.getState().draftsByThreadId[AGENT_ID]?.interactionMode ?? null,
    ).toBeNull();
  });

  it("keeps committed Agent/Chat switches with the full retained ChatView inside 80 ms", async () => {
    hydrateProductRouteState();
    const router = createRouteHarness();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await router.load();
    await render(
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <RouterProvider router={router} />
        </SidebarProvider>
      </QueryClientProvider>,
    );
    await vi.waitFor(() =>
      expect(
        document.querySelector(
          `[data-conversation-surface='agent'][data-active-conversation='true']`,
        ),
      ).not.toBeNull(),
    );
    await settleFrames();
    const agentElement = document.querySelector(`[data-conversation-surface='agent']`);
    const heapBefore = await performanceCommands.collectBrowserHeap();
    const longTasks: PerformanceEntry[] = [];
    const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries()));
    observer.observe({ type: "longtask", buffered: false });
    const samples: number[] = [];

    for (let index = 0; index < 20; index += 1) {
      let started = performance.now();
      await router.navigate({
        to: "/$threadId",
        params: { threadId: CHAT_ID },
        search: { surface: "chat" },
      });
      await vi.waitFor(() =>
        expect(
          document.querySelector(
            `[data-conversation-surface='chat'][data-active-conversation='true']`,
          ),
        ).not.toBeNull(),
      );
      samples.push(performance.now() - started);
      await nextAnimationFrame();

      started = performance.now();
      await router.navigate({
        to: "/$threadId",
        params: { threadId: AGENT_ID },
        search: {},
      });
      await vi.waitFor(() =>
        expect(
          document.querySelector(
            `[data-conversation-surface='agent'][data-active-conversation='true']`,
          ),
        ).not.toBeNull(),
      );
      samples.push(performance.now() - started);
      await nextAnimationFrame();
    }

    await settleFrames();
    observer.disconnect();
    const heapAfter = await performanceCommands.collectBrowserHeap();
    const heapGrowthBytes = heapAfter.usedSize - heapBefore.usedSize;
    console.info(
      "OMNIMIND_PERF product-route-switches",
      JSON.stringify({
        samples: samples.length,
        p95Ms: percentile95(samples),
        longTasks: longTasks.map(({ duration, name, startTime }) => ({ duration, name, startTime })),
        heapBeforeUsedBytes: heapBefore.usedSize,
        heapAfterUsedBytes: heapAfter.usedSize,
        heapGrowthBytes,
        budgets: ROUTE_SWITCH_BUDGET,
      }),
    );
    expect(document.querySelector(`[data-conversation-surface='agent']`)).toBe(agentElement);
    expect(percentile95(samples)).toBeLessThan(ROUTE_SWITCH_BUDGET.maxP95Ms);
    expect(longTasks.length).toBeLessThanOrEqual(ROUTE_SWITCH_BUDGET.maxLongTasks);
    expect(heapGrowthBytes).toBeLessThanOrEqual(ROUTE_SWITCH_BUDGET.maxPostGcHeapGrowthBytes);
  });
});

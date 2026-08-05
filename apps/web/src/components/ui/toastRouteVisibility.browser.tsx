import "../../index.css";

import {
  PRODUCT_PROTOCOL_VERSION,
  ProjectId,
  ProductConversationSnapshot,
  ProductShellSnapshot,
  ThreadId,
} from "@omnimind/contracts";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { ProductCompletionNotifications } from "../../notifications/productCompletion";
import { useRightDockStore } from "../../rightDockStore";
import type { SplitView } from "../../splitViewStore";
import { useSplitViewStore } from "../../splitViewStore";
import { useProductStore } from "../../store/productStore";

const harness = vi.hoisted(() => ({
  enableToasts: true,
  enableSystem: false,
  toastInputs: [] as Array<Record<string, unknown>>,
}));

vi.mock("../../appSettings", () => ({
  useAppSettings: () => ({
    settings: {
      enableTaskCompletionToasts: harness.enableToasts,
      enableSystemTaskCompletionNotifications: harness.enableSystem,
    },
  }),
}));

vi.mock("./toast", () => ({
  toastManager: {
    add: (input: Record<string, unknown>) => {
      harness.toastInputs.push(input);
      return String(harness.toastInputs.length);
    },
  },
}));

const HOST_ID = "conversation-host";
const TARGET_ID = "conversation-target";
const SPLIT_ID = "split-visible";
const NOW = "2026-08-05T00:00:00.000Z";

function shell(receiptState: "running" | "settled", sequence: number) {
  return Schema.decodeUnknownSync(ProductShellSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence,
    runtimeCatalog: null,
    workspaces: [],
    groups: [],
    conversations: [
      {
        id: TARGET_ID,
        workspaceId: "workspace-target",
        title: "Background Product chat",
        workspaceKind: "chat",
        revision: sequence,
        archivedAt: null,
        isPinned: false,
        notes: "",
        boardState: "active",
        boardStateChangedAt: null,
        latestRunId: "run-target",
        receiptState,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  });
}

function detail(receiptState: "running" | "settled", sequence: number) {
  const engineBinding = { id: "binding-1", engineId: "pi", lineageRef: "lineage-1" };
  const resolvedSelection = {
    engineId: "pi",
    runtimeModelId: "model-1",
    thinking: null,
    permissionPolicy: "approval-required",
    enforcement: "engine-enforced",
    executionTarget: null,
    packageGeneration: "generation-1",
  };
  return Schema.decodeUnknownSync(ProductConversationSnapshot)({
    protocolVersion: PRODUCT_PROTOCOL_VERSION,
    sequence,
    readModel: {
      conversation: shell(receiptState, sequence).conversations[0],
      workspace: {
        id: "workspace-target",
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
      runs: [
        {
          id: "run-target",
          conversationId: TARGET_ID,
          entryId: "entry-target",
          requestedSelection: {
            state: "selected",
            engineId: "pi",
            runtimeModelId: "model-1",
            thinking: null,
            packageGeneration: "generation-1",
            permissionPolicy: "approval-required",
            enforcement: "engine-enforced",
            executionTarget: null,
          },
          workspaceObservation: {
            id: "workspace-target",
            access: {
              kind: "chat",
              managedDirectory: null,
              primaryFolder: null,
              executionTarget: null,
              writeAuthority: "read-only-references",
            },
            observedAt: NOW,
          },
          resources: [],
          packageGeneration: "generation-1",
          receipt: {
            id: "receipt-target",
            dispatchId: "dispatch-target",
            runId: "run-target",
            receipt:
              receiptState === "running"
                ? {
                    state: "running",
                    operationRef: "operation-1",
                    engineBinding,
                    resolvedSelection,
                  }
                : {
                    state: "settled",
                    operationRef: "operation-1",
                    engineBinding,
                    resolvedSelection,
                    outcome: "succeeded",
                    settledAt: NOW,
                  },
            updatedAt: NOW,
          },
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      activities: [],
      recoveries: [],
      queue: [],
      entryPins: [],
      entryMarkers: [],
    },
  });
}

function splitView(): SplitView {
  const panel = {
    panel: null,
    diffTurnId: null,
    diffFilePath: null,
    hasOpenedPanel: false,
    lastOpenPanel: "browser" as const,
  };
  return {
    id: SPLIT_ID,
    sourceThreadId: ThreadId.makeUnsafe(HOST_ID),
    ownerProjectId: ProjectId.makeUnsafe("workspace-target"),
    root: {
      kind: "split",
      id: "root",
      direction: "horizontal",
      ratio: 0.5,
      first: { kind: "leaf", id: "host", threadId: ThreadId.makeUnsafe(HOST_ID), panel },
      second: { kind: "leaf", id: "target", threadId: ThreadId.makeUnsafe(TARGET_ID), panel },
    },
    focusedPaneId: "host",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function createHarnessRoute(initialEntry: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <ProductCompletionNotifications />
        <Outlet />
      </>
    ),
  });
  const threadRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/$threadId",
    validateSearch: (raw: Record<string, unknown>) => ({
      ...(raw.surface === "chat" ? { surface: "chat" as const } : {}),
      ...(typeof raw.splitViewId === "string" ? { splitViewId: raw.splitViewId } : {}),
    }),
    component: () => <div data-testid="route" />,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([threadRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function mount(initialEntry: string) {
  const store = useProductStore.getState();
  store.setShellSnapshot(shell("running", 1));
  store.setConversationSnapshot(detail("running", 1));
  const router = createHarnessRoute(initialEntry);
  await router.load();
  const mounted = await render(<RouterProvider router={router} />);
  await vi.waitFor(() =>
    expect(useProductStore.getState().detailRetainCountByConversation[TARGET_ID]).toBe(1),
  );
  return { mounted, router };
}

async function complete() {
  useProductStore.getState().setShellSnapshot(shell("settled", 2));
  await new Promise((resolve) => setTimeout(resolve, 0));
  useProductStore.getState().setConversationSnapshot(detail("settled", 2));
  await vi.waitFor(() =>
    expect(useProductStore.getState().detailRetainCountByConversation[TARGET_ID]).toBeUndefined(),
  );
}

describe("Product completion route visibility and foreground policy", () => {
  const originalDesktopBridge = Object.getOwnPropertyDescriptor(window, "desktopBridge");

  beforeEach(() => {
    harness.enableToasts = true;
    harness.enableSystem = false;
    harness.toastInputs = [];
    useProductStore.getState().reset();
    useRightDockStore.setState({ dockStateByThreadId: {} });
    useSplitViewStore.setState({
      hasHydrated: true,
      splitViewsById: {},
      splitViewIdBySourceThreadId: {},
    });
    Object.defineProperty(window, "desktopBridge", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
    useProductStore.getState().reset();
    if (originalDesktopBridge) {
      Object.defineProperty(window, "desktopBridge", originalDesktopBridge);
    } else {
      Reflect.deleteProperty(window, "desktopBridge");
    }
  });

  it("suppresses a completion already rendered by the active Chat route", async () => {
    await mount(`/${TARGET_ID}?surface=chat`);
    await complete();
    expect(harness.toastInputs).toEqual([]);
  });

  it("suppresses every Conversation rendered by a real split route", async () => {
    const split = splitView();
    useSplitViewStore.setState({
      splitViewsById: { [SPLIT_ID]: split },
      splitViewIdBySourceThreadId: { [HOST_ID]: SPLIT_ID },
    });
    await mount(`/${HOST_ID}?surface=chat&splitViewId=${SPLIT_ID}`);
    await complete();
    expect(harness.toastInputs).toEqual([]);
  });

  it("uses the rendered active dock pane, not hidden persisted dock state", async () => {
    const dockState = {
      open: true,
      activePaneId: "sidechat-target",
      panes: [
        {
          id: "sidechat-target",
          kind: "sidechat" as const,
          threadId: ThreadId.makeUnsafe(TARGET_ID),
          diffTurnId: null,
          diffFilePath: null,
          filePath: null,
          pullRequestWorkspaceId: null,
          pullRequestRepository: null,
          pullRequestNumber: null,
          pullRequestInitialTab: null,
        },
      ],
    };
    useRightDockStore.setState({ dockStateByThreadId: { [HOST_ID]: dockState } });
    await mount(`/${HOST_ID}?surface=chat`);
    await complete();
    expect(harness.toastInputs).toEqual([]);

    await cleanup();
    useProductStore.getState().reset();
    harness.toastInputs = [];
    useRightDockStore.setState({
      dockStateByThreadId: { [HOST_ID]: { ...dockState, open: false } },
    });
    const { router } = await mount(`/${HOST_ID}?surface=chat`);
    await complete();
    expect(harness.toastInputs).toHaveLength(1);
    const action = harness.toastInputs[0]?.actionProps as { onClick?: () => void } | undefined;
    action?.onClick?.();
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/${TARGET_ID}`));
    expect(router.state.location.search.surface).toBe("chat");
    expect(useProductStore.getState().conversations[0]?.receiptState).toBe("settled");
  });

  it("suppresses the renderer request site while focused and requests background-only otherwise", async () => {
    harness.enableToasts = false;
    harness.enableSystem = true;
    const show = vi.fn(async () => true);
    Object.defineProperty(window, "desktopBridge", {
      configurable: true,
      value: {
        notifications: { isSupported: vi.fn(async () => true), show },
        onMenuAction: () => () => undefined,
      },
    });
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    await mount(`/${HOST_ID}?surface=chat`);
    await complete();
    expect(show).not.toHaveBeenCalled();

    await cleanup();
    useProductStore.getState().reset();
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    await mount(`/${HOST_ID}?surface=chat`);
    await complete();
    await vi.waitFor(() => expect(show).toHaveBeenCalledTimes(1));
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        suppressWhenForeground: true,
        productConversationId: TARGET_ID,
        productSurface: "chat",
      }),
    );
  });

  it("releases its exact observation lease on unmount", async () => {
    const { mounted } = await mount(`/${HOST_ID}?surface=chat`);
    await mounted.unmount();
    expect(useProductStore.getState().detailRetainCountByConversation[TARGET_ID]).toBeUndefined();
  });
});

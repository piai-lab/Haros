// FILE: SingleChatSurface.errorDetails.browser.tsx
// Purpose: Preserve localized Workbench failure summaries while exposing safe Error.message detail.
// Layer: Vitest browser regression

import "../../index.css";

import { ThreadId } from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: {
    localePreference: "en",
    sidebarThreadSortOrder: "updatedAt",
    defaultThreadEnvMode: "local",
  },
  projectId: "project-error-detail",
  projectError: null as unknown,
  sidechatError: null as unknown,
}));

vi.mock("~/appSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/appSettings")>()),
  useAppSettings: () => ({ settings: harness.settings }),
}));
vi.mock("~/hooks/useHandleNewThread", () => ({
  useHandleNewThread: () => ({
    handleNewThread: () => Promise.reject(harness.projectError),
  }),
}));
vi.mock("~/lib/sidechatCreatorRegistry", () => ({
  waitForSidechatCreator: () => Promise.resolve(() => Promise.reject(harness.sidechatError)),
}));
vi.mock("~/hooks/useBrowserPanelDesktopBridge", () => ({
  useBrowserPanelDesktopBridge: () => undefined,
}));
vi.mock("~/hooks/useDeviceEventBridge", () => ({
  useDeviceEventBridge: () => undefined,
}));
vi.mock("~/hooks/useDeviceSupport", () => ({ useDeviceSupport: () => false }));
vi.mock("~/hooks/useRepoDiffTotals", () => ({
  useRepoDiffTotals: () => ({ additions: 0, deletions: 0, fileCount: 0, hasChanges: false }),
}));
vi.mock("~/hooks/useDockPaneRuntimeActivation", () => ({
  useDockPaneRuntimeActivation: () => ({
    activePaneRuntimeMode: "live",
    requestActivePaneLive: vi.fn(),
    requestImmediateHydration: vi.fn(),
  }),
}));
vi.mock("~/components/pullRequest/usePullRequestPaneStateIcon", () => ({
  usePullRequestPaneStateIcon: () => null,
}));
vi.mock("~/components/EditorWorkspaceView", () => ({
  EditorWorkspaceView: (props: { onSelectProject: (projectId: string) => void }) => (
    <button type="button" onClick={() => props.onSelectProject(harness.projectId)}>
      Select project
    </button>
  ),
}));
vi.mock("./RightDock", () => ({
  RightDock: (props: { onAddPane: (kind: "sidechat") => void }) => (
    <button type="button" onClick={() => props.onAddPane("sidechat")}>
      Add side chat
    </button>
  ),
}));
vi.mock("./ChatThreadSurfacePrimitives", () => ({
  ChatMountLoader: () => null,
  DeferredChatView: () => null,
  LazyBrowserPanel: () => null,
  LazyDevicePanel: () => null,
  LazyDiffPanel: () => null,
  noopChatSurfaceAction: () => undefined,
}));

import { I18nProvider } from "~/i18n";
import { ToastProvider, toastManager } from "~/components/ui/toast";
import type { DiffRouteSearch } from "~/diffRouteSearch";
import { SingleChatSurface } from "./SingleChatSurface";

const THREAD_ID = ThreadId.makeUnsafe("single-chat-error-detail");

async function mountSurface(search: DiffRouteSearch) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ToastProvider timeout={0}>
            <div className="relative h-[600px] w-[1000px]">
              <SingleChatSurface threadId={THREAD_ID} search={search} projectId={null} />
            </div>
          </ToastProvider>
        </I18nProvider>
      </QueryClientProvider>
    ),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  return render(<RouterProvider router={router} />);
}

let mounted: Awaited<ReturnType<typeof mountSurface>> | null = null;

describe("SingleChatSurface Workbench error detail", () => {
  afterEach(async () => {
    await mounted?.unmount();
    mounted = null;
    toastManager.close();
    harness.projectError = null;
    harness.sidechatError = null;
  });

  it("keeps the localized project summary and exact Error.message", async () => {
    harness.projectError = new Error("project handoff rejected");
    mounted = await mountSurface({ view: "editor" });
    await page.getByRole("button", { name: "Select project" }).click();

    await expect
      .element(page.getByText("Unable to open project", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText(/The project could not be opened\..*project handoff rejected/),
    ).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).toBeInTheDocument();
  });

  it("uses the localized project fallback for a non-Error value", async () => {
    harness.projectError = { message: "object detail must stay hidden" };
    mounted = await mountSurface({ view: "editor" });
    await page.getByRole("button", { name: "Select project" }).click();

    await expect
      .element(page.getByText("Unable to open project", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).not.toBeInTheDocument();
  });

  it("keeps the localized side-chat summary and exact Error.message", async () => {
    harness.sidechatError = new Error("side-chat creator rejected");
    mounted = await mountSurface({});
    await page.getByRole("button", { name: "Add side chat" }).click();

    await expect
      .element(page.getByText("Could not start side chat", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText(
        /An error occurred while creating the side chat\..*side-chat creator rejected/,
      ),
    ).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).toBeInTheDocument();
  });

  it("uses the localized side-chat fallback for a non-Error value", async () => {
    harness.sidechatError = { message: "object detail must stay hidden" };
    mounted = await mountSurface({});
    await page.getByRole("button", { name: "Add side chat" }).click();

    await expect
      .element(page.getByText("Could not start side chat", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).not.toBeInTheDocument();
  });
});

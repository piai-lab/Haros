// FILE: EnvironmentPanel.errorDetails.browser.tsx
// Purpose: Preserve localized open-folder failure copy while exposing safe shell Error.message detail.
// Layer: Vitest browser regression

import "../../../index.css";

import { ThreadId, type NativeApi } from "@harnessos/contracts";
import type { EnvironmentPanelProps } from "./EnvironmentPanel";
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
  error: null as unknown,
  showInFolder: vi.fn(),
}));
vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({
    preferences: {
      localePreference: "en",
      showEnvironmentUsage: false,
      showEnvironmentRepository: false,
      showEnvironmentPullRequest: false,
      showPullRequestDiffColors: false,
      showEnvironmentEditor: false,
      showEnvironmentRecap: false,
      showEnvironmentPinned: false,
      showEnvironmentMarkers: false,
      showEnvironmentNotepad: false,
    },
  }),
}));
vi.mock("~/env", () => ({ isElectron: true }));
vi.mock("./EnvironmentLocalServersSection", () => ({
  EnvironmentLocalServersSection: () => null,
}));

import { I18nProvider } from "~/i18n";
import { ToastProvider, toastManager } from "~/components/ui/toast";
import { EnvironmentPanel } from "./EnvironmentPanel";

async function renderPanel() {
  window.nativeApi = {
    shell: { showInFolder: harness.showInFolder },
  } as unknown as NativeApi;
  const props = {
    open: true,
    gitCwd: null,
    openInTarget: null,
    isGitRepo: false,
    keybindings: [],
    availableEditors: [],
    activeThreadId: null,
    activeProvider: "oa",
    isStudioChat: true,
    studioFolderPath: "/task/studio-folder",
    showGitActions: false,
    diffOpen: false,
    threadAutomations: [],
    diffTotals: { additions: 0, deletions: 0, fileCount: 0, hasChanges: false },
    branchToolbar: {
      threadId: ThreadId.makeUnsafe("environment-error-detail"),
      onEnvModeChange: vi.fn(),
      envLocked: false,
    },
    pinnedMessages: [],
    threadMarkers: [],
    pinnedMessageTextById: new Map(),
    markerMessageTextById: new Map(),
    notes: "",
    activeProjectId: null,
    onToggleDiff: vi.fn(),
    onOpenAutomation: vi.fn(),
    onJumpToPinnedMessage: vi.fn(),
    onTogglePinnedMessageDone: vi.fn(),
    onUnpinMessage: vi.fn(),
    onRenamePinnedMessage: vi.fn(),
    onJumpToThreadMarker: vi.fn(),
    onToggleThreadMarkerDone: vi.fn(),
    onRemoveThreadMarker: vi.fn(),
    onRenameThreadMarker: vi.fn(),
    onNotesChange: vi.fn(() => Promise.resolve()),
    onClose: vi.fn(),
  } satisfies EnvironmentPanelProps;
  const rootRoute = createRootRoute({
    component: () => (
      <I18nProvider>
        <ToastProvider timeout={0}>
          <div className="relative h-[600px] w-[900px]">
            <EnvironmentPanel {...props} />
          </div>
        </ToastProvider>
      </I18nProvider>
    ),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  return render(<RouterProvider router={router} />);
}

let mounted: Awaited<ReturnType<typeof renderPanel>> | null = null;

describe("Environment open-folder error detail", () => {
  afterEach(async () => {
    await mounted?.unmount();
    mounted = null;
    toastManager.close();
    harness.error = null;
    harness.showInFolder.mockReset();
    delete window.nativeApi;
  });

  it("keeps localized summary and renders shell Error.message with copy affordance", async () => {
    harness.error = new Error("Finder rejected the task folder");
    harness.showInFolder.mockImplementation(() => Promise.reject(harness.error));
    mounted = await renderPanel();
    await page.getByRole("button", { name: "studio-folder", exact: true }).click();

    await expect
      .element(page.getByText("Unable to open folder", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText(/An unknown error occurred\..*Finder rejected the task folder/),
    ).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).toBeInTheDocument();
  });

  it("uses localized fallback and hides non-Error objects", async () => {
    harness.error = { message: "object detail must stay hidden" };
    harness.showInFolder.mockImplementation(() => Promise.reject(harness.error));
    mounted = await renderPanel();
    await page.getByRole("button", { name: "studio-folder", exact: true }).click();

    await expect
      .element(page.getByText("Unable to open folder", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).not.toBeInTheDocument();
  });
});

// FILE: PluginLibrary.browser.tsx
// Purpose: Browser proof for capability-gated HarnessOS Agent package management.
// Layer: Browser UI regression

import "../index.css";

import { ThreadId } from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

const packageId = "a".repeat(64);
const localPackageId = "b".repeat(64);
const fixture = vi.hoisted(() => ({
  capability: true,
  list: vi.fn(),
  listResources: vi.fn(),
  install: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  setResourceEnabled: vi.fn(),
  reload: vi.fn(),
  confirm: vi.fn(),
  locale: "en" as "en" | "zh-CN",
  sourceThread: null as Record<string, unknown> | null,
  sourceProject: null as Record<string, unknown> | null,
}));

vi.mock("../localPreferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../localPreferences")>();
  return {
    ...actual,
    useLocalPreferences: () => ({ preferences: { localePreference: fixture.locale } }),
  };
});

vi.mock("../nativeApi", () => ({
  ensureNativeApi: () => ({
    dialogs: { confirm: fixture.confirm },
    oaEcosystem: {
      list: fixture.list,
      listResources: fixture.listResources,
      install: fixture.install,
      update: fixture.update,
      remove: fixture.remove,
      setResourceEnabled: fixture.setResourceEnabled,
      reload: fixture.reload,
    },
    engine: {
      getComposerCapabilities: async ({ engine }: { engine: string }) => ({
        engine,
        supportsSkillMentions: false,
        supportsSkillDiscovery: false,
        supportsNativeSlashCommandDiscovery: false,
        supportsPluginMentions: false,
        supportsPluginDiscovery: false,
        supportsRuntimeModelList: false,
      }),
    },
    server: { getConfig: async () => ({ cwd: "/workspace" }) },
  }),
  onNativeApiServerCapabilitiesChange: () => () => undefined,
  readNativeApiServerCapabilityState: () => fixture.capability,
}));

vi.mock("../store", () => ({
  useStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock("../storeSelectors", () => ({
  createFirstProjectSelector: () => () => null,
  createThreadSelector: () => () => fixture.sourceThread,
  createProjectSelector: () => () => fixture.sourceProject,
}));
vi.mock("../focusedChatContext", () => ({
  useFocusedChatContext: () => ({
    activeProject: null,
    activeThread: null,
    focusedThreadId: null,
  }),
}));
vi.mock("./SidebarHeaderNavigationControls", () => ({
  SidebarHeaderNavigationControls: () => null,
}));
vi.mock("../hooks/useDesktopTopBarGutter", () => ({
  useDesktopTopBarTrafficLightGutterClassName: () => "",
  useDesktopTopBarWindowControlsGutterClassName: () => "",
}));

import { I18nProvider } from "../i18n";
import { engineDiscoveryQueryKeys } from "../lib/engineDiscoveryReactQuery";
import { PluginLibrary } from "./PluginLibrary";

async function renderLibrary(sourceThreadId: ThreadId | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <PluginLibrary sourceThreadId={sourceThreadId} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { queryClient, screen };
}

describe("PluginLibrary HarnessOS Agent packages", () => {
  beforeEach(() => {
    fixture.capability = true;
    fixture.list.mockReset().mockResolvedValue({
      packages: [
        {
          packageId,
          displayName: "@team/agent-tools",
          kind: "npm",
          installed: true,
          filtered: false,
          manageable: true,
        },
        {
          packageId: localPackageId,
          displayName: "Local package",
          kind: "local",
          installed: true,
          filtered: false,
          manageable: false,
        },
      ],
    });
    fixture.listResources.mockReset().mockResolvedValue({
      resources: [
        {
          packageId,
          resourceType: "skills",
          resourcePath: "skills/review/SKILL.md",
          enabled: true,
        },
      ],
    });
    fixture.install.mockReset();
    fixture.update.mockReset();
    fixture.remove.mockReset();
    fixture.setResourceEnabled.mockReset();
    fixture.reload.mockReset();
    fixture.confirm.mockReset().mockResolvedValue(false);
    fixture.locale = "en";
    fixture.sourceThread = null;
    fixture.sourceProject = null;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("does not advertise package actions without the exact server capability", async () => {
    fixture.capability = false;
    await renderLibrary();

    expect(document.body.textContent).not.toContain("Packages");
    expect(fixture.list).not.toHaveBeenCalled();
  });

  it("keeps passive listing resource-free and resolves one package only after explicit intent", async () => {
    await renderLibrary();
    await page.getByRole("button", { name: "Packages" }).click();

    await expect.poll(() => document.body.textContent).toContain("HarnessOS Agent packages");
    await expect.poll(() => document.body.textContent).toContain("@team/agent-tools");
    expect(fixture.list).toHaveBeenCalledWith();
    expect(fixture.listResources).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("/private/");

    const manageButtons = page.getByRole("button", { name: "Manage resources" }).elements();
    expect(manageButtons).toHaveLength(2);
    expect((manageButtons[1] as HTMLButtonElement).disabled).toBe(true);
    (manageButtons[0] as HTMLButtonElement).click();

    await expect.poll(() => document.body.textContent).toContain("skills/review/SKILL.md");
    expect(fixture.listResources).toHaveBeenCalledWith({ packageId });
  });

  it("reloads resources only for the exact active HarnessOS task", async () => {
    const threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000091");
    fixture.sourceThread = {
      id: threadId,
      projectId: "project-1",
      worktreePath: "/workspace",
      engineSelection: { engine: "oa", model: "deepseek/model" },
      session: { engine: "oa", status: "ready" },
    };
    fixture.sourceProject = { id: "project-1", cwd: "/workspace" };
    fixture.reload.mockResolvedValue({ state: "reloaded" });

    const { queryClient } = await renderLibrary(threadId);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    await page.getByRole("button", { name: "Packages" }).click();
    const reloadButton = page.getByRole("button", { name: "Reload current task" });
    await reloadButton.click();

    await expect.poll(() => fixture.reload.mock.calls.length).toBe(1);
    expect(fixture.reload).toHaveBeenCalledWith({ threadId });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: engineDiscoveryQueryKeys.modelsForEngine("oa"),
    });
    await expect
      .poll(() => document.body.textContent)
      .toContain("Resources were reloaded for the current task.");
  });

  it("keeps reload unavailable when the Library has no active HarnessOS task", async () => {
    await renderLibrary();
    await page.getByRole("button", { name: "Packages" }).click();

    const reloadButton = page.getByRole("button", { name: "Reload current task" }).element();
    expect((reloadButton as HTMLButtonElement).disabled).toBe(true);
    expect(reloadButton.getAttribute("title")).toBe(
      "Open Library from an active HarnessOS Agent task to reload its resources.",
    );
    expect(fixture.reload).not.toHaveBeenCalled();
  });

  it("installs and updates only through the typed package actions", async () => {
    fixture.list.mockResolvedValue({
      packages: [
        {
          packageId,
          displayName: "@team/agent-tools",
          kind: "npm",
          installed: true,
          filtered: false,
          manageable: true,
          updateAvailable: true,
        },
      ],
    });
    fixture.install.mockResolvedValue({ changed: true, snapshot: { packages: [] } });
    fixture.update.mockResolvedValue({ changed: true, snapshot: { packages: [] } });
    await renderLibrary();
    await page.getByRole("button", { name: "Packages" }).click();

    const sourceInput = page.getByPlaceholder("npm:@scope/package");
    await sourceInput.fill("npm:@example/agent-tools@1.0.0");
    await page.getByRole("button", { name: "Install package" }).click();
    await expect.poll(() => fixture.install.mock.calls.length).toBe(1);
    expect(fixture.install).toHaveBeenCalledWith({ source: "npm:@example/agent-tools@1.0.0" });
    await expect.poll(() => sourceInput).toHaveValue("");

    await page.getByRole("button", { name: "Update", exact: true }).click();
    await expect.poll(() => fixture.update.mock.calls.length).toBe(1);
    expect(fixture.update).toHaveBeenCalledWith({ packageId });
    expect(fixture.confirm).not.toHaveBeenCalled();
  });

  it("uses a localized app-owned removal dialog and never the native confirm", async () => {
    fixture.locale = "zh-CN";
    fixture.remove.mockResolvedValue({ packages: [] });
    await renderLibrary();
    await page.getByRole("button", { name: "扩展包" }).click();
    await expect.poll(() => document.body.textContent).toContain("@team/agent-tools");

    const removeButtons = page.getByRole("button", { name: "移除", exact: true }).elements();
    (removeButtons[0] as HTMLButtonElement).click();

    await expect.poll(() => document.body.textContent).toContain("移除 @team/agent-tools？");
    const cancelButton = page.getByRole("button", { name: "取消", exact: true }).element();
    await expect.poll(() => document.activeElement).toBe(cancelButton);
    await page.getByRole("button", { name: "取消", exact: true }).click();
    expect(fixture.remove).not.toHaveBeenCalled();

    (
      page.getByRole("button", { name: "移除", exact: true }).elements()[0] as HTMLButtonElement
    ).click();
    await expect.poll(() => document.body.textContent).toContain("移除 @team/agent-tools？");
    const dialog = page.getByRole("dialog").element();
    const confirmRemoveButton = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "移除",
    );
    expect(confirmRemoveButton).toBeDefined();
    confirmRemoveButton!.click();
    await expect.poll(() => fixture.remove.mock.calls.length).toBe(1);
    expect(fixture.remove).toHaveBeenCalledWith({ packageId });
    expect(fixture.confirm).not.toHaveBeenCalled();
  });
});

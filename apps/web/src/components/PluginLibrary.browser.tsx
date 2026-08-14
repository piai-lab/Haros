// FILE: PluginLibrary.browser.tsx
// Purpose: Browser proof for capability-gated OmniMind Agent package management.
// Layer: Browser UI regression

import "../index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

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
}));

vi.mock("../nativeApi", () => ({
  ensureNativeApi: () => ({
    dialogs: { confirm: fixture.confirm },
    omnimindEcosystem: {
      list: fixture.list,
      listResources: fixture.listResources,
      install: fixture.install,
      update: fixture.update,
      remove: fixture.remove,
      setResourceEnabled: fixture.setResourceEnabled,
      reload: fixture.reload,
    },
    provider: {
      getComposerCapabilities: async ({ provider }: { provider: string }) => ({
        provider,
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

vi.mock("../store", () => ({ useStore: () => null }));
vi.mock("../storeSelectors", () => ({ createFirstProjectSelector: () => () => null }));
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

import { PluginLibrary } from "./PluginLibrary";

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PluginLibrary />
    </QueryClientProvider>,
  );
}

describe("PluginLibrary OmniMind Agent packages", () => {
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
  });

  afterEach(() => {
    document.body.innerHTML = "";
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

    await expect.poll(() => document.body.textContent).toContain("OmniMind Agent packages");
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
});

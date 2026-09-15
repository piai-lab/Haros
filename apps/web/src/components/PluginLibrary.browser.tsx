// FILE: PluginLibrary.browser.tsx
// Purpose: Browser proof for the capability-gated engine discovery library.

import "../index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

vi.mock("../localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: { localePreference: "en" } }),
}));
vi.mock("../store", () => ({ useStore: (selector: (state: unknown) => unknown) => selector({}) }));
vi.mock("../storeSelectors", () => ({
  createFirstProjectSelector: () => () => null,
  createThreadSelector: () => () => null,
  createProjectSelector: () => () => null,
}));
vi.mock("../focusedChatContext", () => ({
  useFocusedChatContext: () => ({ activeProject: null, activeThread: null, focusedThreadId: null }),
}));
vi.mock("./SidebarHeaderNavigationControls", () => ({
  SidebarHeaderNavigationControls: () => null,
}));
vi.mock("../hooks/useDesktopTopBarGutter", () => ({
  useDesktopTopBarTrafficLightGutterClassName: () => "",
  useDesktopTopBarWindowControlsGutterClassName: () => "",
}));
vi.mock("../nativeApi", () => ({
  ensureNativeApi: () => ({
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
}));

import { I18nProvider } from "../i18n";
import { PluginLibrary } from "./PluginLibrary";

async function renderLibrary() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <PluginLibrary />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("PluginLibrary engine discovery", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders engine discovery tabs and does not expose retired package management", async () => {
    await renderLibrary();
    expect(page.getByRole("button", { name: "Plugins" }).elements()).toHaveLength(1);
    expect(page.getByRole("button", { name: "Skills" }).elements()).toHaveLength(1);
    expect(document.body.textContent).not.toContain("Packages");
  });
});

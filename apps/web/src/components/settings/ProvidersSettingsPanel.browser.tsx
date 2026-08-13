// FILE: ProvidersSettingsPanel.browser.tsx
// Purpose: Verifies single-provider update feedback reaches the shared toast lifecycle.
// Layer: Browser UI test

import "../../index.css";

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  type NativeApi,
  type ServerProviderStatus,
} from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AppSettingsSchema } from "~/appSettings";
import { serverQueryKeys } from "~/lib/serverReactQuery";
import { SETTINGS_TARGETS, type SettingsSectionId } from "~/settingsNavigation";
import { createBrowserTestServerConfig } from "~/test/browserHarness";

import { SettingsSidebarNav } from "../SettingsSidebarNav";
import { toastManager } from "../ui/toast";
import { ProvidersSettingsPanel } from "./ProvidersSettingsPanel";

const checkedAt = "2026-08-11T00:00:00.000Z";

function outdatedCodex(): ServerProviderStatus {
  return {
    provider: "codex",
    status: "ready",
    available: true,
    authStatus: "authenticated",
    version: "1.0.0",
    checkedAt,
    versionAdvisory: {
      status: "behind_latest",
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateCommand: "npm install -g @openai/codex@latest",
      canUpdate: true,
      checkedAt,
      message: "Update available.",
    },
  };
}

function ProviderSearchHarness(props: {
  settings: ReturnType<typeof AppSettingsSchema.makeUnsafe>;
  queryClient: QueryClient;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("general");
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    if (!target) return;
    document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [activeSection, target]);
  return (
    <QueryClientProvider client={props.queryClient}>
      <SettingsSidebarNav
        activeSection={activeSection}
        onBack={() => {}}
        onSelectSection={(section, options) => {
          setActiveSection(section);
          setTarget(options?.target ?? null);
        }}
      />
      <ProvidersSettingsPanel
        active={activeSection === "providers"}
        resetEpoch={0}
        settings={props.settings}
        defaults={props.settings}
        updateSettings={() => {}}
      />
    </QueryClientProvider>
  );
}

describe("ProvidersSettingsPanel provider update feedback", () => {
  afterEach(() => {
    toastManager.close();
    delete window.nativeApi;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("moves a single Engine update from loading to success", async () => {
    const updatedCodex: ServerProviderStatus = {
      ...outdatedCodex(),
      version: "1.1.0",
      updateState: {
        status: "succeeded",
        startedAt: checkedAt,
        finishedAt: "2026-08-11T00:00:01.000Z",
        message: "Updated.",
        output: null,
      },
      versionAdvisory: {
        status: "current",
        currentVersion: "1.1.0",
        latestVersion: "1.1.0",
        updateCommand: null,
        canUpdate: false,
        checkedAt,
        message: "Up to date.",
      },
    };
    const initialConfig = {
      ...createBrowserTestServerConfig(checkedAt),
      providers: [outdatedCodex()],
    };
    const updatedConfig = { ...initialConfig, providers: [updatedCodex] };
    const updateProvider = vi.fn().mockResolvedValue({ providers: [updatedCodex] });
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(updatedConfig),
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
        updateProvider,
      },
    } as unknown as NativeApi;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), initialConfig);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const settings = AppSettingsSchema.makeUnsafe({});
    const addToast = vi.spyOn(toastManager, "add");
    const updateToast = vi.spyOn(toastManager, "update");
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <ProvidersSettingsPanel
          active
          resetEpoch={0}
          settings={settings}
          defaults={settings}
          updateSettings={() => {}}
        />
      </QueryClientProvider>,
    );

    (screen.getByRole("button", { name: "Update" }).first().element() as HTMLButtonElement).click();

    await expect.poll(() => updateProvider).toHaveBeenCalledWith({ provider: "codex" });
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "loading", title: "Updating Codex…", timeout: 0 }),
    );
    await expect
      .poll(
        () =>
          updateToast.mock.calls.find(
            ([, toast]) => toast.type === "success" && toast.title === "Codex updated",
          )?.[1].data?.dismissAfterVisibleMs,
      )
      .toBe(3_000);

    await screen.unmount();
    queryClient.clear();
  });

  it("keeps custom model management reachable inside the owning Engine detail", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const settings = AppSettingsSchema.makeUnsafe({
      customCodexModels: ["custom/codex-saved"],
    });
    const updateSettings = vi.fn();
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <ProvidersSettingsPanel
          active
          resetEpoch={0}
          settings={settings}
          defaults={settings}
          updateSettings={updateSettings}
        />
      </QueryClientProvider>,
    );

    await expect.poll(() => document.body.textContent).toContain("custom/codex-saved");
    await screen.getByRole("textbox", { name: "Engine model slug" }).fill("custom/codex-next");
    await screen.getByRole("button", { name: "Add" }).click();
    expect(updateSettings).toHaveBeenCalledWith({
      customCodexModels: ["custom/codex-saved", "custom/codex-next"],
    });

    await screen.unmount();
    queryClient.clear();
  });

  it("does not advertise an independent custom-model editor for stock Pi", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const settings = AppSettingsSchema.makeUnsafe({
      customPiModels: ["anthropic/legacy-pi-hint"],
    });
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <ProvidersSettingsPanel
          active
          resetEpoch={0}
          settings={settings}
          defaults={settings}
          updateSettings={() => {}}
        />
      </QueryClientProvider>,
    );

    const piDisclosure = screen.getByRole("button", { name: "Pi" }).last();
    expect(piDisclosure.element().getAttribute("aria-expanded")).toBe("false");
    await piDisclosure.click();
    await expect.poll(() => document.body.textContent).not.toContain("anthropic/legacy-pi-hint");
    expect(screen.getByRole("textbox", { name: "Engine model slug" }).query()).toBeNull();

    await screen.unmount();
    queryClient.clear();
  });

  it("routes Settings search to the stable Engine details row", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    const screen = await render(
      <ProviderSearchHarness
        settings={AppSettingsSchema.makeUnsafe({})}
        queryClient={queryClient}
      />,
    );

    await screen
      .getByRole("textbox", { name: "Search settings" })
      .fill("independent engine models");
    await screen.getByRole("button", { name: "Independent engine models" }).click();

    await expect.poll(() => document.getElementById(SETTINGS_TARGETS.engineDetails)).toBeTruthy();
    await expect.poll(() => scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Codex" }).last()).toBeTruthy();

    await screen.unmount();
    queryClient.clear();
  });
});

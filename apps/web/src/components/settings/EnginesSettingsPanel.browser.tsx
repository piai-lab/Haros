// FILE: EnginesSettingsPanel.browser.tsx
// Purpose: Verifies single-engine update feedback reaches the shared toast lifecycle.
// Layer: Browser UI test

import "../../index.css";

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  type NativeApi,
  type ServerEngineStatus,
} from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { I18nProvider } from "~/i18n";
import { LOCAL_PREFERENCES_STORAGE_KEY } from "~/localPreferences";
import { serverQueryKeys } from "~/lib/serverReactQuery";
import { SETTINGS_TARGETS, type SettingsSectionId } from "~/settingsNavigation";
import { createBrowserTestServerConfig } from "~/test/browserHarness";

import { SettingsSidebarNav } from "../SettingsSidebarNav";
import { toastManager } from "../ui/toast";
import { EnginesSettingsPanel } from "./EnginesSettingsPanel";

const checkedAt = "2026-08-11T00:00:00.000Z";

function outdatedCodex(): ServerEngineStatus {
  return {
    engine: "codex",
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

function EngineSearchHarness(props: { queryClient: QueryClient }) {
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
      <EnginesSettingsPanel active={activeSection === "engines"} resetEpoch={0} />
    </QueryClientProvider>
  );
}

describe("EnginesSettingsPanel engine update feedback", () => {
  afterEach(() => {
    toastManager.close();
    delete window.nativeApi;
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    localStorage.removeItem(LOCAL_PREFERENCES_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it.each([
    {
      locale: "en" as const,
      theme: "light" as const,
      reorderCodex: "Reorder Codex",
      showAntigravity: "Show Antigravity in the engine picker",
      available: "Available",
      signIn: "Sign in",
      limited: "Limited",
      notInstalled: "Not installed",
      unavailable: "Unavailable",
      summary: "3 available",
    },
    {
      locale: "zh-CN" as const,
      theme: "dark" as const,
      reorderCodex: "调整 Codex 顺序",
      showAntigravity: "在引擎选择器中显示 Antigravity",
      available: "可用",
      signIn: "登录",
      limited: "受限",
      notInstalled: "未安装",
      unavailable: "不可用",
      summary: "3 个可用",
    },
  ])("shows Engine identity and truthful readiness in $locale $theme", async (testCase) => {
    localStorage.setItem(
      LOCAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ localePreference: testCase.locale }),
    );
    document.documentElement.classList.toggle("dark", testCase.theme === "dark");
    const config = {
      ...createBrowserTestServerConfig(checkedAt),
      engines: [
        outdatedCodex(),
        {
          engine: "claude" as const,
          status: "ready" as const,
          available: true,
          authStatus: "unauthenticated" as const,
          checkedAt,
        },
        {
          engine: "cursor" as const,
          status: "warning" as const,
          available: true,
          authStatus: "authenticated" as const,
          checkedAt,
        },
        {
          engine: "antigravity" as const,
          status: "error" as const,
          available: false,
          authStatus: "unknown" as const,
          unavailableReason: "not_installed" as const,
          checkedAt,
        },
        {
          engine: "grok" as const,
          status: "error" as const,
          available: false,
          authStatus: "unknown" as const,
          checkedAt,
        },
      ],
    };
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
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <div style={{ width: 480 }}>
          <I18nProvider>
            <EnginesSettingsPanel active resetEpoch={0} />
          </I18nProvider>
        </div>
      </QueryClientProvider>,
    );

    const rowText = (reorderName: string) =>
      screen.getByRole("button", { name: reorderName }).element().parentElement?.textContent ?? "";
    const codexHandle = screen.getByRole("button", { name: testCase.reorderCodex }).element();
    const codexIcon = codexHandle.nextElementSibling;
    const codexRow = codexHandle.parentElement?.parentElement;
    expect(codexIcon?.getAttribute("aria-hidden")).toBe("true");
    expect(getComputedStyle(codexIcon!).width).toBe("16px");
    expect(codexRow?.scrollWidth).toBeLessThanOrEqual(codexRow?.clientWidth ?? 0);
    expect(rowText(testCase.reorderCodex)).toContain(testCase.available);
    expect(rowText(testCase.locale === "en" ? "Reorder Claude" : "调整 Claude 顺序")).toContain(
      testCase.signIn,
    );
    expect(rowText(testCase.locale === "en" ? "Reorder Cursor" : "调整 Cursor 顺序")).toContain(
      testCase.limited,
    );
    expect(
      rowText(testCase.locale === "en" ? "Reorder Antigravity" : "调整 Antigravity 顺序"),
    ).toContain(testCase.notInstalled);
    expect(rowText(testCase.locale === "en" ? "Reorder Grok" : "调整 Grok 顺序")).toContain(
      testCase.unavailable,
    );
    await expect.element(screen.getByText(testCase.summary)).toBeVisible();
    await expect
      .element(screen.getByRole("switch", { name: testCase.showAntigravity }))
      .toBeEnabled();

    await screen.unmount();
    queryClient.clear();
  });

  it("moves a single Engine update from loading to success", async () => {
    const updatedCodex: ServerEngineStatus = {
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
      engines: [outdatedCodex()],
    };
    const updatedConfig = { ...initialConfig, engines: [updatedCodex] };
    const updateEngine = vi.fn().mockResolvedValue({ engines: [updatedCodex] });
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(updatedConfig),
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
        updateEngine,
      },
    } as unknown as NativeApi;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), initialConfig);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const addToast = vi.spyOn(toastManager, "add");
    const updateToast = vi.spyOn(toastManager, "update");
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
      </QueryClientProvider>,
    );

    (screen.getByRole("button", { name: "Update" }).first().element() as HTMLButtonElement).click();

    await expect.poll(() => updateEngine).toHaveBeenCalledWith({ engine: "codex" });
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
    const savedSettings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      engines: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
        codex: {
          ...DEFAULT_SERVER_SETTINGS_VIEW.engines.codex,
          customModels: ["custom/codex-saved"],
        },
      },
    };
    const updateSettings = vi.fn().mockResolvedValue(savedSettings);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(savedSettings),
        updateSettings,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), savedSettings);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
      </QueryClientProvider>,
    );

    await expect.poll(() => document.body.textContent).toContain("custom/codex-saved");
    await screen.getByRole("textbox", { name: "Engine model slug" }).fill("custom/codex-next");
    await screen.getByRole("button", { name: "Add" }).click();
    expect(updateSettings).toHaveBeenCalledWith({
      engines: {
        codex: { customModels: ["custom/codex-saved", "custom/codex-next"] },
      },
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
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
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

  it("distinguishes unavailable ServerSettings from loading and offers retry", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    const getSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error("disconnected"))
      .mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
      </QueryClientProvider>,
    );

    await expect.element(screen.getByText("Unavailable")).toBeVisible();
    await screen.getByRole("button", { name: "Retry" }).click();
    await expect.poll(() => getSettings).toHaveBeenCalledTimes(2);
    await expect.element(screen.getByText("Automatic CLI update checks")).toBeVisible();

    await screen.unmount();
    queryClient.clear();
  });

  it("does not write a credential when the non-secret engine settings are rejected", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    const updateSettings = vi.fn().mockRejectedValue(new Error("settings rejected"));
    const updateEngineCredential = vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
        updateSettings,
        updateEngineCredential,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
      </QueryClientProvider>,
    );

    await screen.getByRole("button", { name: "Kilo" }).last().click();
    await screen.getByRole("textbox", { name: "Kilo binary path" }).fill("/tmp/kilo-next");
    await screen.getByRole("textbox", { name: "Kilo server password" }).fill("draft-secret");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => updateSettings)
      .toHaveBeenCalledWith({
        engines: { kilo: { binaryPath: "/tmp/kilo-next" } },
      });
    expect(updateEngineCredential).not.toHaveBeenCalled();
    await expect
      .element(screen.getByRole("textbox", { name: "Kilo server password" }))
      .toHaveValue("draft-secret");

    await screen.unmount();
    queryClient.clear();
  });

  it("reports partial success and preserves the credential draft after ordered save", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    const callOrder: string[] = [];
    const updatedSettings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      engines: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
        kilo: { ...DEFAULT_SERVER_SETTINGS_VIEW.engines.kilo, binaryPath: "/tmp/kilo-next" },
      },
    };
    const updateSettings = vi.fn(async () => {
      callOrder.push("settings");
      return updatedSettings;
    });
    const updateEngineCredential = vi.fn(async () => {
      callOrder.push("credential");
      throw new Error("credential rejected");
    });
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(updatedSettings),
        updateSettings,
        updateEngineCredential,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const addToast = vi.spyOn(toastManager, "add");
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
      </QueryClientProvider>,
    );

    await screen.getByRole("button", { name: "Kilo" }).last().click();
    await screen.getByRole("textbox", { name: "Kilo binary path" }).fill("/tmp/kilo-next");
    await screen.getByRole("textbox", { name: "Kilo server password" }).fill("draft-secret");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => callOrder).toEqual(["settings", "credential"]);
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: "Settings saved, but the credential was not",
      }),
    );
    await expect
      .element(screen.getByRole("textbox", { name: "Kilo server password" }))
      .toHaveValue("draft-secret");

    await screen.unmount();
    queryClient.clear();
  });

  it("saves a credential-only draft without mutating ServerSettings JSON fields", async () => {
    const config = createBrowserTestServerConfig(checkedAt);
    const configuredSettings = {
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      engines: {
        ...DEFAULT_SERVER_SETTINGS_VIEW.engines,
        kilo: { ...DEFAULT_SERVER_SETTINGS_VIEW.engines.kilo, serverPasswordConfigured: true },
      },
    };
    const updateSettings = vi.fn();
    const updateEngineCredential = vi.fn().mockResolvedValue(configuredSettings);
    window.nativeApi = {
      server: {
        getConfig: vi.fn().mockResolvedValue(config),
        getSettings: vi.fn().mockResolvedValue(configuredSettings),
        updateSettings,
        updateEngineCredential,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(serverQueryKeys.config(), config);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <EnginesSettingsPanel active resetEpoch={0} />
      </QueryClientProvider>,
    );

    await screen.getByRole("button", { name: "Kilo" }).last().click();
    const password = screen.getByRole("textbox", { name: "Kilo server password" });
    await password.fill("credential-only");
    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => updateEngineCredential)
      .toHaveBeenCalledWith({
        engine: "kilo",
        serverPassword: "credential-only",
      });
    expect(updateSettings).not.toHaveBeenCalled();
    await expect.element(password).toHaveValue("");

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
    const screen = await render(<EngineSearchHarness queryClient={queryClient} />);

    await screen
      .getByRole("textbox", { name: "Search settings" })
      .fill("independent engine models");
    await screen.getByRole("button", { name: "Engine details" }).click();

    await expect.poll(() => document.getElementById(SETTINGS_TARGETS.engineDetails)).toBeTruthy();
    await expect.poll(() => scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Codex" }).last()).toBeTruthy();

    await screen.unmount();
    queryClient.clear();
  });
});

// FILE: BuiltInToolsSettingsPanel.browser.tsx
// Purpose: Verifies built-in Agent tool state rendering and rapid-toggle serialization.
// Layer: Browser UI test

import "../../index.css";

import {
  DEFAULT_SERVER_SETTINGS_VIEW,
  type NativeApi,
  type ServerSettingsView,
} from "@omnimind/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { serverQueryKeys } from "~/lib/serverReactQuery";

import { BuiltInToolsSettingsPanel } from "./BuiltInToolsSettingsPanel";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

const GROUPS = [
  {
    id: "tasks" as const,
    toolCount: 12,
    availableToolCount: 12,
    availability: "available" as const,
    enabled: true,
    effective: true,
  },
  {
    id: "diagnostics" as const,
    toolCount: 4,
    availableToolCount: 4,
    availability: "available" as const,
    enabled: true,
    effective: true,
  },
  {
    id: "goals" as const,
    toolCount: 1,
    availableToolCount: 1,
    availability: "available" as const,
    enabled: true,
    effective: true,
  },
  {
    id: "automations" as const,
    toolCount: 7,
    availableToolCount: 7,
    availability: "available" as const,
    enabled: true,
    effective: true,
  },
  {
    id: "browser" as const,
    toolCount: 22,
    availableToolCount: 22,
    availability: "available" as const,
    enabled: true,
    effective: true,
  },
  {
    id: "device" as const,
    toolCount: 0,
    availableToolCount: 0,
    availability: "unavailable" as const,
    enabled: true,
    effective: false,
  },
] as const;

const EXPLICIT_DEVICE_ENABLED_SETTINGS: ServerSettingsView = {
  ...DEFAULT_SERVER_SETTINGS_VIEW,
  agentTools: { disabledBuiltInGroups: [] },
};

describe("BuiltInToolsSettingsPanel", () => {
  afterEach(() => {
    delete window.nativeApi;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("serializes rapid toggles and keeps the newest intent visible", async () => {
    const first = deferred<ServerSettingsView>();
    const second = deferred<ServerSettingsView>();
    const updateSettings = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    window.nativeApi = {
      server: {
        getSettings: vi.fn().mockResolvedValue(EXPLICIT_DEVICE_ENABLED_SETTINGS),
        getBuiltInToolGroups: vi.fn().mockResolvedValue(GROUPS),
        updateSettings,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.settings(), EXPLICIT_DEVICE_ENABLED_SETTINGS);
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), GROUPS);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const browserSwitch = screen.getByRole("switch", { name: "Allow Agents to use Browser" });
    await expect
      .element(screen.getByRole("switch", { name: "Allow Agents to use Tasks" }))
      .toBeChecked();
    await expect.element(screen.getByText("Available · 12 of 12 tools available")).toBeVisible();
    await expect.element(screen.getByText("Unavailable · 0 of 0 tools available")).toBeVisible();
    await expect
      .element(screen.getByRole("switch", { name: "Allow Agents to use Device" }))
      .toBeEnabled();

    await browserSwitch.click();
    await expect.element(browserSwitch).not.toBeChecked();
    await browserSwitch.click();
    await expect.element(browserSwitch).toBeChecked();
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenNthCalledWith(1, {
      agentTools: { disabledBuiltInGroups: ["browser"] },
    });

    first.resolve({
      ...EXPLICIT_DEVICE_ENABLED_SETTINGS,
      agentTools: { disabledBuiltInGroups: ["browser"] },
    });
    await vi.waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(2));
    expect(updateSettings).toHaveBeenNthCalledWith(2, {
      agentTools: { disabledBuiltInGroups: [] },
    });
    second.resolve(EXPLICIT_DEVICE_ENABLED_SETTINGS);
    await vi.waitFor(() =>
      expect(
        queryClient.getQueryData<ServerSettingsView>(serverQueryKeys.settings())?.agentTools
          .disabledBuiltInGroups,
      ).toEqual([]),
    );
    await expect.element(browserSwitch).toBeChecked();

    await screen.unmount();
    queryClient.clear();
  });

  it("distinguishes the fresh Device-off intent from runtime unavailability", async () => {
    window.nativeApi = {
      server: {
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
        getBuiltInToolGroups: vi.fn().mockResolvedValue(GROUPS),
        updateSettings: vi.fn(),
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), GROUPS);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const deviceSwitch = screen.getByRole("switch", { name: "Allow Agents to use Device" });

    await expect.element(deviceSwitch).not.toBeChecked();
    await expect.element(screen.getByText("Disabled · 0 of 0 tools available")).toBeVisible();

    queryClient.setQueryData(serverQueryKeys.settings(), EXPLICIT_DEVICE_ENABLED_SETTINGS);
    await expect.element(deviceSwitch).toBeChecked();
    await expect.element(screen.getByText("Unavailable · 0 of 0 tools available")).toBeVisible();

    await screen.unmount();
    queryClient.clear();
  });
});

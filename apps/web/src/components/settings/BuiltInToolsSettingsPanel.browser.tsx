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
    id: "omnimind" as const,
    toolCount: 18,
    availableToolCount: 18,
    availability: "available" as const,
    enabled: true,
    effective: true,
  },
  {
    id: "browser" as const,
    toolCount: 9,
    availableToolCount: 9,
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
        getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
        getBuiltInToolGroups: vi.fn().mockResolvedValue(GROUPS),
        updateSettings,
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
    const browserSwitch = screen.getByRole("switch", { name: "Allow Agents to use Browser" });
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
      ...DEFAULT_SERVER_SETTINGS_VIEW,
      agentTools: { disabledBuiltInGroups: ["browser"] },
    });
    await vi.waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(2));
    expect(updateSettings).toHaveBeenNthCalledWith(2, {
      agentTools: { disabledBuiltInGroups: [] },
    });
    second.resolve(DEFAULT_SERVER_SETTINGS_VIEW);
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
});

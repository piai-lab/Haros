// FILE: BuiltInToolsSettingsPanel.browser.tsx
// Purpose: Verifies the three-surface built-in tool matrix and mutation recovery.
// Layer: Browser UI test

import "../../index.css";

import {
  BUILT_IN_TOOL_SURFACES,
  DEFAULT_SERVER_SETTINGS_VIEW,
  type BuiltInToolGroupId,
  type BuiltInToolGroupsResult,
  type NativeApi,
  type ServerSettingsView,
} from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { serverQueryKeys } from "~/lib/serverReactQuery";
import { toastManager } from "~/components/ui/toast";

import { BuiltInToolsSettingsPanel } from "./BuiltInToolsSettingsPanel";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function group(
  id: BuiltInToolGroupId,
  toolCount: number,
  availability: "available" | "degraded" | "unavailable" = "available",
) {
  const availableToolCount =
    availability === "available" ? toolCount : availability === "degraded" ? 1 : 0;
  const unsupportedInChat = id === "tasks" || id === "diagnostics";
  const defaultOff = id === "device";
  const chatDefaultOff = id === "goals" || id === "automations" || defaultOff;
  const cell = (supported: boolean, defaultEnabled: boolean) => ({
    supported,
    defaultEnabled,
    configuredEnabled: supported && defaultEnabled,
    effective: supported && defaultEnabled && availableToolCount > 0,
  });
  return {
    id,
    toolCount,
    availableToolCount,
    availability,
    surfaces: {
      agent: cell(true, !defaultOff),
      chat: cell(!unsupportedInChat, !unsupportedInChat && !chatDefaultOff),
      studio: cell(true, !defaultOff),
    },
  };
}

const GROUP_ROWS = [
  group("tasks", 12),
  group("diagnostics", 4),
  group("goals", 1),
  group("automations", 7),
  group("browser", 22, "degraded"),
  group("device", 12, "unavailable"),
] as const;

function projection(
  settingsRevision = 0,
  builtInGroupOverrides: BuiltInToolGroupsResult["builtInGroupOverrides"] = {},
): BuiltInToolGroupsResult {
  const groups = GROUP_ROWS.map((row) => ({
    id: row.id,
    toolCount: row.toolCount,
    availableToolCount: row.availableToolCount,
    availability: row.availability,
    surfaces: Object.fromEntries(
      BUILT_IN_TOOL_SURFACES.map((surface) => {
        const base = row.surfaces[surface];
        const surfaceOverrides = builtInGroupOverrides[surface];
        const configuredEnabled =
          base.supported && surfaceOverrides && Object.hasOwn(surfaceOverrides, row.id)
            ? surfaceOverrides[row.id] === true
            : base.configuredEnabled;
        return [
          surface,
          {
            ...base,
            configuredEnabled,
            effective: configuredEnabled && row.availableToolCount > 0,
          },
        ];
      }),
    ) as BuiltInToolGroupsResult["groups"][number]["surfaces"],
  }));
  return { settingsRevision, builtInGroupOverrides, groups };
}

describe("BuiltInToolsSettingsPanel", () => {
  afterEach(() => {
    delete window.nativeApi;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders the canonical matrix, including unsupported and unavailable states", async () => {
    const current = projection();
    window.nativeApi = {
      server: {
        getBuiltInToolGroups: vi.fn().mockResolvedValue(current),
        updateSettings: vi.fn(),
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), current);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );

    await expect.element(screen.getByRole("switch", { name: "Use Tasks in Agent" })).toBeChecked();
    await expect
      .element(screen.getByRole("switch", { name: "Use Tasks in Chat" }))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText("Not available in this surface").first()).toBeVisible();
    await expect.element(screen.getByRole("switch", { name: "Use Tasks in Studio" })).toBeChecked();
    await expect
      .element(screen.getByRole("switch", { name: "Use Goals in Chat" }))
      .not.toBeChecked();
    await expect.element(screen.getByRole("switch", { name: "Use Browser in Chat" })).toBeChecked();
    await expect.element(screen.getByText("Enabled, some tools available").first()).toBeVisible();
    await expect
      .element(screen.getByRole("switch", { name: "Use Device in Agent" }))
      .not.toBeChecked();
    await expect.element(screen.getByText("0 of 12 tools currently available")).toBeVisible();

    await screen.unmount();
    queryClient.clear();
  });

  it.each([
    { viewportWidth: 1_100, contentWidth: 700, expectedColumns: 4 },
    { viewportWidth: 815, contentWidth: 451, expectedColumns: 1 },
    { viewportWidth: 390, contentWidth: 390, expectedColumns: 1 },
  ])(
    "keeps the matrix readable without horizontal overflow at $viewportWidth px",
    async ({ viewportWidth, contentWidth, expectedColumns }) => {
      await page.viewport(viewportWidth, 768);
      const current = projection();
      window.nativeApi = {
        server: {
          getBuiltInToolGroups: vi.fn().mockResolvedValue(current),
          updateSettings: vi.fn(),
        },
      } as unknown as NativeApi;
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), current);
      const screen = await render(
        <div data-testid="matrix-host" style={{ width: `${contentWidth}px`, maxWidth: "100%" }}>
          <QueryClientProvider client={queryClient}>
            <BuiltInToolsSettingsPanel active />
          </QueryClientProvider>
        </div>,
      );

      const host = screen.getByTestId("matrix-host").element();
      const taskTitle = screen.getByText("Tasks", { exact: true }).element();
      const taskRow = taskTitle.parentElement?.parentElement;
      const taskControls = screen.getByRole("switch", { name: "Use Tasks in Agent" }).element()
        .parentElement?.parentElement;
      expect(taskRow).not.toBeNull();
      expect(taskControls).not.toBeNull();
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
      expect(getComputedStyle(taskRow!).gridTemplateColumns.split(" ")).toHaveLength(
        expectedColumns,
      );
      expect(getComputedStyle(taskControls!).gridTemplateColumns.split(" ")).toHaveLength(3);
      if (viewportWidth < 1_024) {
        expect(taskTitle.getBoundingClientRect().width).toBeGreaterThan(contentWidth * 0.75);
      }

      await screen.unmount();
      queryClient.clear();
      await page.viewport(1_280, 720);
    },
  );

  it("serializes rapid cross-surface toggles and submits complete override maps", async () => {
    const first = deferred<ServerSettingsView>();
    const second = deferred<ServerSettingsView>();
    const updateSettings = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const getBuiltInToolGroups = vi
      .fn()
      .mockResolvedValueOnce(projection(1, { chat: { browser: false } }))
      .mockResolvedValueOnce(projection(2, { chat: { browser: false }, studio: { goals: false } }));
    window.nativeApi = {
      server: { getBuiltInToolGroups, updateSettings },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), projection());
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const chatBrowser = screen.getByRole("switch", { name: "Use Browser in Chat" });
    const studioGoals = screen.getByRole("switch", { name: "Use Goals in Studio" });

    await chatBrowser.click();
    await studioGoals.click();
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenNthCalledWith(1, {
      agentTools: { builtInGroupOverrides: { chat: { browser: false } } },
    });
    first.resolve(DEFAULT_SERVER_SETTINGS_VIEW);
    await vi.waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(2));
    expect(updateSettings).toHaveBeenNthCalledWith(2, {
      agentTools: {
        builtInGroupOverrides: { chat: { browser: false }, studio: { goals: false } },
      },
    });
    second.resolve(DEFAULT_SERVER_SETTINGS_VIEW);
    await vi.waitFor(() => expect(getBuiltInToolGroups).toHaveBeenCalledTimes(2));
    await expect.element(chatBrowser).not.toBeChecked();
    await expect.element(studioGoals).not.toBeChecked();

    await screen.unmount();
    queryClient.clear();
  });

  it("keeps accepted intent when projection refresh fails and never resends the mutation", async () => {
    const updateSettings = vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW);
    const getBuiltInToolGroups = vi.fn().mockRejectedValue(new Error("offline"));
    window.nativeApi = {
      server: { getBuiltInToolGroups, updateSettings },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), projection(4));
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const chatGoals = screen.getByRole("switch", { name: "Use Goals in Chat" });

    await chatGoals.click();
    await vi.waitFor(() => expect(getBuiltInToolGroups).toHaveBeenCalledTimes(1));
    expect(updateSettings).toHaveBeenCalledTimes(1);
    await expect.element(chatGoals).toBeChecked();
    await expect
      .element(
        screen.getByText(
          "Your choice is saved, but the current tool status could not be refreshed.",
        ),
      )
      .toBeVisible();

    queryClient.setQueryData(
      serverQueryKeys.builtInToolGroups(),
      projection(5, { chat: { goals: true } }),
    );
    await expect
      .element(
        screen.getByText(
          "Your choice is saved, but the current tool status could not be refreshed.",
        ),
      )
      .not.toBeInTheDocument();
    expect(updateSettings).toHaveBeenCalledTimes(1);

    await screen.unmount();
    queryClient.clear();
  });

  it("recovers a committed mutation whose transport response was lost", async () => {
    const accepted = projection(5, { chat: { goals: true } });
    const updateSettings = vi.fn().mockRejectedValue(new Error("response lost"));
    const getBuiltInToolGroups = vi.fn().mockResolvedValue(accepted);
    const addToast = vi.spyOn(toastManager, "add");
    window.nativeApi = {
      server: { getBuiltInToolGroups, updateSettings },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), projection(4));
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const chatGoals = screen.getByRole("switch", { name: "Use Goals in Chat" });

    await chatGoals.click();
    await vi.waitFor(() => expect(getBuiltInToolGroups).toHaveBeenCalledTimes(1));
    await expect.element(chatGoals).toBeChecked();
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(addToast).not.toHaveBeenCalled();

    await screen.unmount();
    queryClient.clear();
  });

  it("rolls back only when recovery proves the mutation was not accepted", async () => {
    const updateSettings = vi.fn().mockRejectedValue(new Error("rejected"));
    const getBuiltInToolGroups = vi.fn().mockResolvedValue(projection(4));
    const addToast = vi.spyOn(toastManager, "add");
    window.nativeApi = {
      server: { getBuiltInToolGroups, updateSettings },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), projection(4));
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const chatGoals = screen.getByRole("switch", { name: "Use Goals in Chat" });

    await chatGoals.click();
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
    await expect.element(chatGoals).not.toBeChecked();
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Could not update built-in tools" }),
    );

    await screen.unmount();
    queryClient.clear();
  });

  it("keeps the choice without retrying when acceptance cannot be confirmed", async () => {
    const updateSettings = vi.fn().mockRejectedValue(new Error("response lost"));
    const getBuiltInToolGroups = vi.fn().mockRejectedValue(new Error("offline"));
    const addToast = vi.spyOn(toastManager, "add");
    window.nativeApi = {
      server: { getBuiltInToolGroups, updateSettings },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), projection(4));
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );
    const chatGoals = screen.getByRole("switch", { name: "Use Goals in Chat" });

    await chatGoals.click();
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
    await expect.element(chatGoals).toBeChecked();
    await expect
      .element(
        screen.getByText(
          "OmniMind could not confirm whether your choice was saved. The current choice is kept until the server status refreshes.",
        ),
      )
      .toBeVisible();
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Could not confirm the setting" }),
    );

    await screen.unmount();
    queryClient.clear();
  });

  it("resets known overrides while preserving bounded unknown keys", async () => {
    const current = projection(3, {
      agent: { browser: false, "future-group": false },
      chat: { goals: true },
    });
    const updateSettings = vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW);
    window.nativeApi = {
      server: {
        getBuiltInToolGroups: vi
          .fn()
          .mockResolvedValue(projection(4, { agent: { "future-group": false } })),
        updateSettings,
      },
    } as unknown as NativeApi;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), current);
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <BuiltInToolsSettingsPanel active />
      </QueryClientProvider>,
    );

    await screen.getByRole("button", { name: "Restore recommended defaults" }).click();
    await vi.waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
    expect(updateSettings).toHaveBeenCalledWith({
      agentTools: { builtInGroupOverrides: { agent: { "future-group": false } } },
    });

    await screen.unmount();
    queryClient.clear();
  });
});

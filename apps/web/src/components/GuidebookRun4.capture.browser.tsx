// FILE: GuidebookRun4.capture.browser.tsx
// Purpose: Reproducible, synthetic, production-component captures for Guidebook Part VI.
// Layer: Browser evidence fixture; this file does not change product behavior.

import "../index.css";

import {
  BUILT_IN_TOOL_SURFACES,
  DEFAULT_SERVER_SETTINGS_VIEW,
  EXTERNAL_MCP_AUDIENCE,
  ProjectId,
  type BuiltInToolGroupId,
  type BuiltInToolGroupsResult,
  type ExternalMcpIntegration,
  type NativeApi,
  type ServerConfig,
  type ServerEngineStatus,
} from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  localePreference: "en" as const,
  updatePreferences: vi.fn(),
  threadShells: [] as unknown[],
  allThreadsMessageless: false,
  projects: [{ id: "guidebook-project" }],
  threadsHydrated: true,
  syncServerReadModel: vi.fn(),
}));

vi.mock("../localPreferences", async (importOriginal) => {
  const original = await importOriginal<typeof import("../localPreferences")>();
  return {
    ...original,
    useLocalPreferences: () => ({
      preferences: {
        ...original.DEFAULT_LOCAL_PREFERENCES,
        localePreference: harness.localePreference,
      },
      defaults: original.DEFAULT_LOCAL_PREFERENCES,
      updatePreferences: harness.updatePreferences,
    }),
  };
});

vi.mock("~/storeSelectors", () => ({
  createThreadShellsSelector: () => () => harness.threadShells,
  createAllThreadsMessagelessSelector: () => () => harness.allThreadsMessageless,
}));

vi.mock("~/store", () => ({
  useStore: (selector: (store: Record<string, unknown>) => unknown) =>
    selector({
      projects: harness.projects,
      threadsHydrated: harness.threadsHydrated,
      syncServerReadModel: harness.syncServerReadModel,
    }),
}));

import { I18nProvider } from "../i18n";
import { serverQueryKeys } from "../lib/serverReactQuery";
import { AdvancedSettingsPanel } from "./settings/AdvancedSettingsPanel";
import { BuiltInToolsSettingsPanel } from "./settings/BuiltInToolsSettingsPanel";
import { EnginesSettingsPanel } from "./settings/EnginesSettingsPanel";
import { ExternalConnectionsSettingsPanel } from "./settings/ExternalConnectionsSettingsPanel";

const CAPTURE_ROOT =
  import.meta.env.VITE_GUIDEBOOK_CAPTURE_ROOT ?? "../../../../docs/guide/assets/captures";
const CHECKED_AT = "2026-08-30T12:00:00.000Z";
const INTEGRATIONS_QUERY_KEY = ["server", "externalMcpIntegrations"] as const;
const PROJECTS_QUERY_KEY = ["orchestration", "externalMcpProjects"] as const;

function CaptureFrame({
  children,
  width = 1160,
  height = 820,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  return (
    <div
      data-testid="capture-frame"
      style={{
        boxSizing: "border-box",
        width,
        height,
        padding: 32,
        background: "var(--background)",
        color: "var(--foreground)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <div data-testid="capture-scroll" style={{ width: "100%", height: "100%", overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function Providers({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleDisclosure(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
  await settleLayout();
}

async function capture(path: string): Promise<void> {
  await settleLayout();
  await page.screenshot({
    element: page.getByTestId("capture-frame"),
    path: `${CAPTURE_ROOT}/${path}`,
  });
}

function engineStatus(
  engine: ServerEngineStatus["engine"],
  overrides: Partial<ServerEngineStatus> = {},
): ServerEngineStatus {
  return {
    engine,
    status: "ready",
    available: true,
    authStatus: "authenticated",
    checkedAt: CHECKED_AT,
    ...overrides,
  };
}

const ENGINE_STATUS_BY_KIND: Partial<
  Record<ServerEngineStatus["engine"], Partial<ServerEngineStatus>>
> = {
  codex: {},
  claude: { authStatus: "unauthenticated" },
  cursor: { status: "warning" },
  antigravity: {
    available: false,
    status: "error",
    authStatus: "unknown",
    unavailableReason: "not_installed",
  },
  grok: {
    available: false,
    status: "error",
    authStatus: "unknown",
  },
};

const ENGINE_STATUSES: ReadonlyArray<ServerEngineStatus> = ENGINE_DESCRIPTORS.flatMap(
  (descriptor) => {
    const overrides = ENGINE_STATUS_BY_KIND[descriptor.kind];
    return overrides === undefined ? [] : [engineStatus(descriptor.kind, overrides)];
  },
);

const SERVER_CONFIG: ServerConfig = {
  cwd: "Guidebook workspace",
  worktreesDir: "Guidebook worktrees",
  keybindingsConfigPath: "Guidebook keybindings",
  keybindings: [],
  issues: [],
  engines: ENGINE_STATUSES,
  availableEditors: [],
};

function toolGroup(
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

const TOOL_GROUP_ROWS = [
  toolGroup("tasks", 12),
  toolGroup("diagnostics", 4),
  toolGroup("goals", 1),
  toolGroup("automations", 7),
  toolGroup("browser", 22, "degraded"),
  toolGroup("device", 12, "unavailable"),
] as const;

const TOOL_PROJECTION: BuiltInToolGroupsResult = {
  settingsRevision: 7,
  builtInGroupOverrides: {},
  groups: TOOL_GROUP_ROWS.map((row) => ({
    id: row.id,
    toolCount: row.toolCount,
    availableToolCount: row.availableToolCount,
    availability: row.availability,
    surfaces: Object.fromEntries(
      BUILT_IN_TOOL_SURFACES.map((surface) => [surface, row.surfaces[surface]]),
    ) as BuiltInToolGroupsResult["groups"][number]["surfaces"],
  })),
};

const PROJECTS = [
  { id: ProjectId.makeUnsafe("guidebook-workspace"), title: "Guidebook workspace" },
  { id: ProjectId.makeUnsafe("release-checklist"), title: "Release checklist" },
] as const;

const CONNECTIONS: ReadonlyArray<ExternalMcpIntegration> = [
  {
    integrationId: "documentation-assistant",
    name: "Documentation assistant",
    audience: EXTERNAL_MCP_AUDIENCE,
    capabilities: ["projects:read", "tasks:create", "tasks:wait", "tasks:read"],
    projectScope: "selected",
    allowedProjects: [PROJECTS[0]],
    createdAt: "2026-08-01T08:00:00.000Z",
    expiresAt: "2099-08-30T08:00:00.000Z",
    lastUsedAt: null,
    pairedAt: "2026-08-01T08:05:00.000Z",
    revokedAt: null,
    rateLimitPerMinute: 30,
    concurrencyLimit: 2,
    clientKind: "other",
    stdio: { command: "haros", args: ["external-mcp"] },
  },
];

function installNativeApi(): void {
  window.nativeApi = {
    server: {
      getConfig: vi.fn().mockResolvedValue(SERVER_CONFIG),
      getSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
      getBuiltInToolGroups: vi.fn().mockResolvedValue(TOOL_PROJECTION),
      updateSettings: vi.fn().mockResolvedValue(DEFAULT_SERVER_SETTINGS_VIEW),
      getAuthSession: vi.fn().mockResolvedValue({ authenticated: false }),
      listExternalMcpIntegrations: vi.fn().mockResolvedValue(CONNECTIONS),
    },
    orchestration: {
      getShellSnapshot: vi.fn().mockResolvedValue({ projects: PROJECTS }),
    },
  } as unknown as NativeApi;
}

describe("Haros Guidebook Run 4 settings captures", () => {
  afterEach(() => {
    delete window.nativeApi;
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    harness.localePreference = "en";
    harness.updatePreferences.mockReset();
    harness.threadShells = [];
    harness.allThreadsMessageless = false;
    harness.projects = [{ id: "guidebook-project" }];
    harness.threadsHydrated = true;
    harness.syncServerReadModel.mockReset();
    vi.restoreAllMocks();
  });

  it("captures Engine settings from canonical descriptors", async () => {
    await page.viewport(1440, 900);
    document.documentElement.classList.remove("dark");
    installNativeApi();
    const queryClient = createQueryClient();
    queryClient.setQueryData(serverQueryKeys.config(), SERVER_CONFIG);
    queryClient.setQueryData(serverQueryKeys.settings(), DEFAULT_SERVER_SETTINGS_VIEW);

    const mounted = await render(
      <Providers queryClient={queryClient}>
        <CaptureFrame>
          <EnginesSettingsPanel active resetEpoch={0} />
        </CaptureFrame>
      </Providers>,
    );

    await expect.element(mounted.getByText("3 available")).toBeVisible();
    await expect.element(mounted.getByRole("button", { name: "Reorder Codex" })).toBeVisible();
    const enginePicker = mounted.getByText("Engine picker").element().closest("section");
    const engineViewport = mounted.getByTestId("capture-scroll").element();
    expect(enginePicker).not.toBeNull();
    engineViewport.scrollTop = enginePicker?.offsetTop ?? 0;
    await capture("capture-15-engine-settings.png");
    await mounted.unmount();
    queryClient.clear();
  });

  it("captures capability settings from a server-owned projection", async () => {
    await page.viewport(1440, 900);
    document.documentElement.classList.remove("dark");
    installNativeApi();
    const queryClient = createQueryClient();
    queryClient.setQueryData(serverQueryKeys.builtInToolGroups(), TOOL_PROJECTION);

    const mounted = await render(
      <Providers queryClient={queryClient}>
        <CaptureFrame>
          <BuiltInToolsSettingsPanel active />
        </CaptureFrame>
      </Providers>,
    );

    await expect.element(mounted.getByRole("switch", { name: "Use Tasks in Agent" })).toBeChecked();
    await expect.element(mounted.getByText("Enabled, some tools available").first()).toBeVisible();
    await capture("capture-16-capability-settings.png");
    await mounted.unmount();
    queryClient.clear();
  });

  it("captures sanitized connection scope and permissions", async () => {
    await page.viewport(1440, 900);
    document.documentElement.classList.remove("dark");
    installNativeApi();
    const queryClient = createQueryClient();
    queryClient.setQueryData(INTEGRATIONS_QUERY_KEY, CONNECTIONS);
    queryClient.setQueryData(PROJECTS_QUERY_KEY, { projects: PROJECTS });

    const mounted = await render(
      <Providers queryClient={queryClient}>
        <CaptureFrame>
          <ExternalConnectionsSettingsPanel active />
        </CaptureFrame>
      </Providers>,
    );

    await mounted.getByText("Guidebook workspace").first().click();
    await mounted.getByRole("button", { name: "Review" }).click();
    await expect.element(mounted.getByText("Documentation assistant")).toBeVisible();
    await expect.element(mounted.getByText("Read other project tasks")).toBeVisible();
    await settleDisclosure();
    const visibleText = mounted.getByTestId("capture-frame").element().textContent ?? "";
    expect(visibleText.toLowerCase()).not.toContain("endpoint");
    expect(visibleText.toLowerCase()).not.toContain("token");
    expect(visibleText).not.toContain("/Users/");
    await capture("capture-17-connection-settings.png");
    await mounted.unmount();
    queryClient.clear();
  });

  it("captures eligible recovery settings with the explanation expanded", async () => {
    await page.viewport(1440, 900);
    document.documentElement.classList.remove("dark");
    installNativeApi();
    const queryClient = createQueryClient();
    queryClient.setQueryData(serverQueryKeys.config(), SERVER_CONFIG);
    queryClient.setQueryData(serverQueryKeys.authSession(), { authenticated: false });

    const mounted = await render(
      <Providers queryClient={queryClient}>
        <CaptureFrame height={640}>
          <AdvancedSettingsPanel active resetEpoch={0} />
        </CaptureFrame>
      </Providers>,
    );

    const repairButton = mounted.getByRole("button", { name: "Repair state" });
    expect((repairButton.element() as HTMLButtonElement).disabled).toBe(false);
    await mounted.getByRole("button", { name: "What this does" }).click();
    await expect.element(mounted.getByText(/Rebuilds local project indexes/)).toBeVisible();
    await settleDisclosure();
    await capture("capture-18-recovery-settings.png");
    await mounted.unmount();
    queryClient.clear();
  });
});

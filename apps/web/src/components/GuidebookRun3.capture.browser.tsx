// FILE: GuidebookRun3.capture.browser.tsx
// Purpose: Reproducible, synthetic, production-component captures for Guidebook Parts III-IV.
// Layer: Browser evidence fixture; this file does not change product behavior.

import "../index.css";

import { ThreadId, type BrowserTabState, type DeviceSetupStep } from "@harnessos/contracts";
import type { FileDiffMetadata } from "@pierre/diffs/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({ settings: { localePreference: "en" } }));

vi.mock("../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "../i18n";
import { FileIcon } from "../lib/icons";
import { AutomationCreatedCard } from "./chat/AutomationCreatedCard";
import { ComposerColumnFrame } from "./chat/ComposerColumnFrame";
import { ComposerSubagentStrip } from "./chat/ComposerSubagentStrip";
import type { ComposerSubagentStripRow } from "./chat/ComposerSubagentStrip.logic";
import { ProposedPlanCard } from "./chat/ProposedPlanCard";
import { EnvironmentLabeledSection, EnvironmentRow } from "./chat/environment/EnvironmentRow";
import { BrowserTabStrip } from "./BrowserTabStrip";
import { DeviceScreen } from "./device/DeviceFrame";
import { DeviceSetupScreen } from "./device/DeviceScreenStates";
import { ReviewFileTreePanel } from "./ReviewFileTreePanel";
import TerminalWorkspaceTabs from "./TerminalWorkspaceTabs";

const CAPTURE_ROOT =
  import.meta.env.VITE_GUIDEBOOK_CAPTURE_ROOT ?? "../../../../docs/guide/assets/captures";

function CaptureFrame({ children, width = 680 }: { children: ReactNode; width?: number }) {
  return (
    <div
      data-testid="capture-frame"
      style={{
        width,
        minHeight: 480,
        padding: 32,
        background: "var(--background)",
        color: "var(--foreground)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

async function capture(path: string): Promise<void> {
  await settleLayout();
  await page.screenshot({
    element: page.getByTestId("capture-frame"),
    path: `${CAPTURE_ROOT}/${path}`,
  });
}

const SUBAGENTS: ReadonlyArray<ComposerSubagentStripRow> = [
  {
    kind: "parent",
    key: "parent:guidebook-main",
    threadId: ThreadId.makeUnsafe("guidebook-main"),
    label: "Back to main task",
  },
  {
    kind: "subagent",
    key: "guidebook-source-review",
    threadId: ThreadId.makeUnsafe("guidebook-source-review"),
    nativeThreadId: "tool-use-source-review",
    primaryLabel: "Source review",
    fullLabel: "Source review (researcher)",
    role: "researcher",
    modelLabel: "Codex",
    statusLabel: "Running",
    statusKind: "running",
    isActive: true,
    isViewed: true,
    isBackground: false,
    accentColor: "#E2A11A",
  },
  {
    kind: "subagent",
    key: "guidebook-contract-check",
    threadId: ThreadId.makeUnsafe("guidebook-contract-check"),
    nativeThreadId: "tool-use-contract-check",
    primaryLabel: "Contract check",
    fullLabel: "Contract check (reviewer)",
    role: "reviewer",
    modelLabel: "Codex",
    statusLabel: "Completed",
    statusKind: "completed",
    isActive: false,
    isViewed: false,
    isBackground: false,
    accentColor: "#4F8A7B",
  },
];

function browserTab(overrides: Partial<BrowserTabState>): BrowserTabState {
  return {
    id: "tab-1",
    title: "Haros local preview",
    url: "http://127.0.0.1:4173",
    status: "live",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    faviconUrl: null,
    lastCommittedUrl: "http://127.0.0.1:4173",
    lastError: null,
    ...overrides,
  };
}

const DEVICE_STEPS: ReadonlyArray<DeviceSetupStep> = [
  { id: "install-xcode", label: "Install Xcode", done: true },
  { id: "accept-xcode-license", label: "Accept the Xcode license", done: true },
  {
    id: "install-ios-runtime",
    label: "Install an iOS runtime",
    detail: "Required before simulator discovery can succeed.",
    done: false,
  },
  { id: "build-device-helper", label: "Build the Haros device helper", done: false },
];

function fileDiff(path: string, additions: number, deletions: number): FileDiffMetadata {
  return {
    cacheKey: path,
    name: path,
    prevName: path,
    hunks: [{ additionLines: additions, deletionLines: deletions }],
  } as FileDiffMetadata;
}

describe("Haros Guidebook Run 3 captures", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.settings.localePreference = "en";
  });

  it("captures proposed-plan review", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="w-[38rem]">
            <ProposedPlanCard
              planMarkdown={
                "# Safer queue repair\n\n1. Reproduce the stale admission.\n2. Preserve the queued request.\n3. Add a focused lifecycle test.\n4. Review the diff before implementation."
              }
              cwd="/synthetic/haros"
              workspaceRoot="/synthetic/haros"
            />
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Safer queue repair")).toBeVisible();
    await capture("capture-07-proposed-plan.png");
    await mounted.unmount();
  });

  it("captures visible subagent lineage", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <ComposerColumnFrame className="w-[38rem] rounded-2xl border border-border bg-card p-4">
            <ComposerSubagentStrip
              items={SUBAGENTS}
              compact={false}
              onCompactChange={() => {}}
              onOpenThread={() => {}}
            />
          </ComposerColumnFrame>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Back to main task")).toBeVisible();
    await capture("capture-08-subagent-lineage.png");
    await mounted.unmount();
  });

  it("captures terminal workspace ownership", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="w-[38rem] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <TerminalWorkspaceTabs
              activeTab="terminal"
              isWorking={true}
              terminalHasRunningActivity={false}
              terminalCount={2}
              workspaceLayout="both"
              onSelectTab={() => {}}
            />
            <div className="h-56 bg-[#111214] p-5 font-mono text-sm text-white/80">
              Terminal content remains owned by the PTY runtime.
            </div>
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Terminal", { exact: true })).toBeVisible();
    await capture("capture-09-terminal-workspace.png");
    await mounted.unmount();
  });

  it("captures a bounded diff review", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const files = [fileDiff("src/queue.ts", 12, 4), fileDiff("src/queue.test.ts", 28, 0)];
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="h-80 w-[24rem] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <ReviewFileTreePanel
              files={files}
              selectedFilePath="src/queue.ts"
              resolvedTheme="light"
              onSelectFile={() => {}}
            />
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("queue.ts")).toBeVisible();
    await capture("capture-10-diff-review.png");
    await mounted.unmount();
  });

  it("captures thread-local browser tabs", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="w-[38rem] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <BrowserTabStrip
              tabs={[
                browserTab({ id: "local", title: "Haros local preview" }),
                browserTab({ id: "docs", title: "API reference", url: "https://example.invalid" }),
              ]}
              activeTabId="local"
              status={{ tone: "default", label: "Local server" }}
              dragRegion={false}
              onSelectTab={() => {}}
              onCloseTab={() => {}}
              onCreateTab={() => {}}
            />
            <div className="flex h-56 items-center justify-center bg-muted/20 text-sm text-muted-foreground">
              Browser content is isolated from this synthetic evidence frame.
            </div>
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Haros local preview")).toBeVisible();
    await capture("capture-11-browser-tabs.png");
    await mounted.unmount();
  });

  it("captures device setup and approval boundary", async () => {
    await page.viewport(760, 620);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="h-[32rem] w-[20rem]">
            <DeviceScreen kind="iPhone" buttonsDisabled>
              <DeviceSetupScreen
                title="Finish device setup"
                description="Haros checks each local prerequisite before device actions are available."
                steps={DEVICE_STEPS}
                footnote="Discovery does not grant action authority."
              />
            </DeviceScreen>
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Finish device setup")).toBeVisible();
    await capture("capture-12-device-setup.png");
    await mounted.unmount();
  });

  it("captures attributed Studio outputs", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="w-[30rem] rounded-2xl border border-border bg-card p-5 shadow-xl">
            <EnvironmentLabeledSection label="Outputs">
              <EnvironmentRow
                icon={<FileIcon className="size-4" />}
                label="Quarterly review.pdf"
                trailing={<span>just now</span>}
              />
              <EnvironmentRow
                icon={<FileIcon className="size-4" />}
                label="Evidence table.xlsx"
                trailing={<span>1 min</span>}
              />
            </EnvironmentLabeledSection>
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Quarterly review.pdf")).toBeVisible();
    await capture("capture-13-studio-outputs.png");
    await mounted.unmount();
  });

  it("captures an accepted automation", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");
    const mounted = await render(
      <Providers>
        <CaptureFrame>
          <div className="w-[34rem]">
            <AutomationCreatedCard
              automationId="guidebook-weekly-check"
              name="Weekly repository check"
              cadenceLabel="Every Monday at 09:00"
              proposalState="accepted"
              onOpen={() => {}}
            />
          </div>
        </CaptureFrame>
      </Providers>,
    );
    await expect.element(mounted.getByText("Weekly repository check")).toBeVisible();
    await capture("capture-14-automation-created.png");
    await mounted.unmount();
  });
});

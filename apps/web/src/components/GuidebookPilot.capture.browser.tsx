// FILE: GuidebookPilot.capture.browser.tsx
// Purpose: Reproducible, synthetic, real-component captures for the Haros Guidebook pilot.
// Layer: Browser evidence fixture; this file does not change product behavior.

import "../index.css";

import { MessageId } from "@harnessos/contracts";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../localPreferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../localPreferences")>();
  return {
    ...actual,
    useLocalPreferences: () => ({ preferences: harness.settings }),
  };
});

import type { QueuedComposerTurn } from "../composerDraftStore";
import { I18nProvider } from "../i18n";
import type { SidebarView } from "./Sidebar.logic";
import { SidebarSurfacePicker } from "./Sidebar";
import { ComposerQueuedHeader } from "./chat/ComposerQueuedHeader";
import { ComposerColumnFrame } from "./chat/ComposerColumnFrame";
import { MessagesTimeline } from "./chat/MessagesTimeline";

const CAPTURE_ROOT =
  import.meta.env.VITE_GUIDEBOOK_CAPTURE_ROOT ?? "../../../../docs/guide/assets/captures";
const CAPTURED_AT = "2026-08-30T12:00:00.000Z";

function CaptureFrame({ children, width = 920 }: { children: ReactNode; width?: number }) {
  return (
    <div
      data-testid="capture-frame"
      style={{
        width,
        minHeight: 460,
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

function SurfaceCapture() {
  const [activeView, setActiveView] = useState<SidebarView>("agent");
  return (
    <CaptureFrame width={720}>
      <div className="w-[22rem] rounded-2xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Haros work surfaces
        </div>
        <div className="flex items-center">
          <SidebarSurfacePicker
            views={["agent", "chat", "studio"]}
            activeView={activeView}
            onSelectView={setActiveView}
          />
        </div>
      </div>
    </CaptureFrame>
  );
}

const queuedTurn: QueuedComposerTurn = {
  id: "guidebook-queued-turn",
  kind: "chat",
  createdAt: CAPTURED_AT,
  previewText: "Run the focused tests after the current analysis finishes",
  prompt: "Run the focused tests after the current analysis finishes",
  images: [],
  files: [],
  assistantSelections: [],
  browserAnnotations: [],
  terminalContexts: [],
  fileComments: [],
  pastedTexts: [],
  skills: [],
  mentions: [],
  selectedEngine: "codex",
  selectedModel: "gpt-5",
  selectedPromptEffort: null,
  engineSelection: { engine: "codex", model: "gpt-5" },
  runtimeMode: "full-access",
  interactionMode: "default",
  envMode: "local",
};

function QueueCapture() {
  return (
    <CaptureFrame>
      <ComposerColumnFrame className="w-[46rem]">
        <div className="mb-3 text-sm text-muted-foreground">
          A turn is running. This follow-up keeps its admitted Engine and model binding.
        </div>
        <ComposerQueuedHeader
          queuedTurns={[queuedTurn]}
          onSteer={() => {}}
          onRemove={() => {}}
          onEdit={() => {}}
          cwd="/synthetic/haros-guidebook"
        />
        <div className="h-28 rounded-b-2xl border border-t-0 border-border bg-background p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Ask a follow-up…</div>
          <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
            <span>Codex · gpt-5</span>
            <span className="rounded-full bg-secondary px-3 py-1">Stop</span>
          </div>
        </div>
      </ComposerColumnFrame>
    </CaptureFrame>
  );
}

function SteeringCapture() {
  return (
    <CaptureFrame>
      <div
        className="h-[420px] w-[46rem] overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        data-guidebook-static-timeline
      >
        <style>{`
          [data-guidebook-static-timeline] *,
          [data-guidebook-static-timeline] *::before,
          [data-guidebook-static-timeline] *::after {
            animation: none !important;
            transition: none !important;
          }
          [data-guidebook-static-timeline] button[aria-label="Copy message"] {
            visibility: hidden !important;
          }
        `}</style>
        <MessagesTimeline
          hasMessages
          isWorking={false}
          activeTurnInProgress={false}
          activeTurnStartedAt={null}
          timelineEntries={[
            {
              id: "guidebook-steer-user",
              kind: "message",
              createdAt: "2026-08-30T11:58:00.000Z",
              message: {
                id: MessageId.makeUnsafe("guidebook-steer-user-message"),
                role: "user",
                text: "Prioritize the failing lifecycle test before continuing the broader review.",
                dispatchMode: "steer",
                createdAt: "2026-08-30T11:58:00.000Z",
                streaming: false,
              },
            },
            {
              id: "guidebook-steer-assistant",
              kind: "message",
              createdAt: "2026-08-30T11:58:04.000Z",
              message: {
                id: MessageId.makeUnsafe("guidebook-steer-assistant-message"),
                role: "assistant",
                text: "I changed course at the next safe boundary and kept the same product Thread.",
                createdAt: "2026-08-30T11:58:04.000Z",
                completedAt: "2026-08-30T11:58:05.000Z",
                streaming: false,
              },
            },
          ]}
          turnDiffSummaryByAssistantMessageId={new Map()}
          nowIso="2026-08-30T11:58:06.000Z"
          expandedWorkGroups={{}}
          onToggleWorkGroup={() => {}}
          onOpenTurnDiff={() => {}}
          revertTurnCountByUserMessageId={new Map()}
          onRevertUserMessage={() => {}}
          isRevertingCheckpoint={false}
          onImageExpand={() => {}}
          markdownCwd="/synthetic/haros-guidebook"
          resolvedTheme="light"
          timestampFormat="locale"
          workspaceRoot="/synthetic/haros-guidebook"
        />
      </div>
    </CaptureFrame>
  );
}

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe("Haros Guidebook pilot captures", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("captures three isolated synthetic product states", async () => {
    await page.viewport(1100, 760);
    document.documentElement.classList.remove("dark");

    const surface = await render(
      <I18nProvider>
        <SurfaceCapture />
      </I18nProvider>,
    );
    const trigger = surface.getByRole("button", { name: "Switch surface" });
    await trigger.click();
    await expect.element(surface.getByRole("menuitemradio", { name: /Studio/ })).toBeVisible();
    await settleLayout();
    await page.screenshot({
      element: surface.getByTestId("capture-frame"),
      path: `${CAPTURE_ROOT}/capture-01-surface-picker.png`,
    });
    await surface.unmount();

    const queue = await render(
      <I18nProvider>
        <QueueCapture />
      </I18nProvider>,
    );
    await expect.element(queue.getByTestId("queued-follow-up-row")).toBeVisible();
    await settleLayout();
    await page.screenshot({
      element: queue.getByTestId("capture-frame"),
      path: `${CAPTURE_ROOT}/capture-02-queued-follow-up.png`,
    });
    await queue.unmount();

    const steering = await render(
      <I18nProvider>
        <SteeringCapture />
      </I18nProvider>,
    );
    await expect.element(steering.getByText("Steering conversation")).toBeVisible();
    await settleLayout();
    await page.screenshot({
      element: steering.getByTestId("capture-frame"),
      path: `${CAPTURE_ROOT}/capture-03-steering-marker.png`,
    });
    await steering.unmount();
  });
});

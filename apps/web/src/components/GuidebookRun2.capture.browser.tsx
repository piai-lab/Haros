// FILE: GuidebookRun2.capture.browser.tsx
// Purpose: Reproducible, synthetic, real-component captures for Guidebook Parts I-II.
// Layer: Browser evidence fixture; this file does not change product behavior.

import "../index.css";

import {
  ApprovalRequestId,
  type EngineKind,
  type EngineModelDescriptor,
  type ModelSlug,
  type ServerEngineStatus,
} from "@harnessos/contracts";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
}));

vi.mock("../localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "../i18n";
import type { PendingApproval } from "../session-logic";
import { ComposerEnginePicker } from "./chat/ComposerEnginePicker";
import { ComposerPendingApprovalPanel } from "./chat/ComposerPendingApprovalPanel";
import { EngineModelPicker } from "./chat/EngineModelPicker";

const CAPTURE_ROOT =
  import.meta.env.VITE_GUIDEBOOK_CAPTURE_ROOT ?? "../../../../docs/guide/assets/captures";
const CHECKED_AT = "2026-08-30T12:00:00.000Z";

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

function engineStatus(
  engine: EngineKind,
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

const ENGINE_STATES: ReadonlyArray<ServerEngineStatus> = [
  engineStatus("codex"),
  engineStatus("claude", { authStatus: "unauthenticated" }),
  engineStatus("cursor", {
    available: false,
    status: "error",
    unavailableReason: "not_installed",
  }),
  engineStatus("grok", { status: "warning" }),
];

const MODEL_OPTIONS: Partial<Record<EngineKind, ReadonlyArray<EngineModelDescriptor>>> = {
  codex: [
    { slug: "gpt-5.4" as ModelSlug, name: "GPT-5.4" },
    { slug: "gpt-5.4-mini" as ModelSlug, name: "GPT-5.4 mini" },
  ],
};

const APPROVAL: PendingApproval = {
  requestId: ApprovalRequestId.makeUnsafe("guidebook-run2-approval"),
  lifecycleGeneration: "guidebook-run2-generation",
  requestKind: "command",
  createdAt: CHECKED_AT,
  detail: 'Bash: {"command":"bun test --filter lifecycle"}',
};

async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe("Haros Guidebook Run 2 captures", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    harness.settings.localePreference = "en";
  });

  it("captures isolated Engine availability", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");

    const engines = await render(
      <I18nProvider>
        <CaptureFrame>
          <div className="flex h-24 w-[34rem] items-end justify-center rounded-2xl border border-border bg-background p-6 shadow-xl">
            <ComposerEnginePicker
              engine="codex"
              engines={ENGINE_STATES}
              open
              onEngineChange={() => {}}
            />
          </div>
        </CaptureFrame>
      </I18nProvider>,
    );
    await expect
      .element(page.getByRole("menuitemradio", { name: /Claude.*Sign in/ }))
      .toBeVisible();
    await settleLayout();
    await page.screenshot({ path: `${CAPTURE_ROOT}/capture-04-engine-availability.png` });
    await engines.unmount();
  });

  it("captures isolated exact-model selection", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");

    const models = await render(
      <I18nProvider>
        <CaptureFrame>
          <div className="flex h-24 w-[34rem] items-end justify-center rounded-2xl border border-border bg-background p-6 shadow-xl">
            <EngineModelPicker
              engine="codex"
              model={"gpt-5.4" as ModelSlug}
              lockedEngine="codex"
              modelOptionsByEngine={MODEL_OPTIONS}
              open
              onEngineModelChange={() => {}}
            />
          </div>
        </CaptureFrame>
      </I18nProvider>,
    );
    await expect.element(page.getByRole("menuitemradio", { name: /GPT-5.4 mini/ })).toBeVisible();
    await settleLayout();
    await page.screenshot({ path: `${CAPTURE_ROOT}/capture-05-exact-model.png` });
    await models.unmount();
  });

  it("captures an isolated permission decision", async () => {
    await page.viewport(760, 560);
    document.documentElement.classList.remove("dark");

    const approval = await render(
      <I18nProvider>
        <CaptureFrame>
          <div className="w-[38rem]">
            <ComposerPendingApprovalPanel
              approval={APPROVAL}
              pendingCount={1}
              isResponding={false}
              onRespond={async () => {}}
            />
          </div>
        </CaptureFrame>
      </I18nProvider>,
    );
    await expect.element(approval.getByText("Approve this command?")).toBeVisible();
    await settleLayout();
    await page.screenshot({
      element: approval.getByTestId("capture-frame"),
      path: `${CAPTURE_ROOT}/capture-06-permission-decision.png`,
    });
    await approval.unmount();
  });
});

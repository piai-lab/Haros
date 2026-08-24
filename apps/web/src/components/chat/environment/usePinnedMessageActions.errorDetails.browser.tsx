// FILE: usePinnedMessageActions.errorDetails.browser.tsx
// Purpose: Keep localized pin/notes failure summaries while exposing safe dispatch Error.message detail.
// Layer: Vitest browser regression

import "../../../index.css";

import { MessageId, ThreadId } from "@omnimind/contracts";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted(() => ({
  settings: { localePreference: "en" },
  pinError: null as unknown,
  notesError: null as unknown,
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

vi.mock("~/pinnedMessages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/pinnedMessages")>()),
  dispatchPinnedMessageAdd: vi.fn(() => Promise.reject(harness.pinError)),
  dispatchThreadNotes: vi.fn(() => Promise.reject(harness.notesError)),
}));

import { I18nProvider } from "~/i18n";
import { ToastProvider, toastManager } from "~/components/ui/toast";
import { usePinnedMessageActions } from "./usePinnedMessageActions";

const THREAD_ID = ThreadId.makeUnsafe("error-detail-thread");
const MESSAGE_ID = MessageId.makeUnsafe("error-detail-message");

function ActionsHarness() {
  const actions = usePinnedMessageActions({ activeThreadId: THREAD_ID, pinnedMessages: [] });
  return (
    <>
      <button type="button" onClick={() => actions.handleTogglePinMessage(MESSAGE_ID)}>
        Pin message
      </button>
      <button
        type="button"
        onClick={() => void actions.handleNotesChange(THREAD_ID, "notes").catch(() => undefined)}
      >
        Save notes
      </button>
    </>
  );
}

async function renderHarness() {
  const rootRoute = createRootRoute({
    component: () => (
      <I18nProvider>
        <ToastProvider timeout={0}>
          <ActionsHarness />
        </ToastProvider>
      </I18nProvider>
    ),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  return render(<RouterProvider router={router} />);
}

let mounted: Awaited<ReturnType<typeof renderHarness>> | null = null;

describe("Environment pin and notes error detail", () => {
  afterEach(async () => {
    await mounted?.unmount();
    mounted = null;
    toastManager.close();
    harness.pinError = null;
    harness.notesError = null;
  });

  it("shows the localized pin summary, raw detail, and copy affordance", async () => {
    harness.pinError = new Error("pin receipt rejected");
    mounted = await renderHarness();
    await page.getByRole("button", { name: "Pin message" }).click();

    await expect
      .element(page.getByText("Failed to update pinned message", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText(/The pinned message change could not be saved\..*pin receipt rejected/),
    ).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).toBeInTheDocument();
  });

  it("uses the localized pin fallback and hides a non-Error object", async () => {
    harness.pinError = { message: "object detail must stay hidden" };
    mounted = await renderHarness();
    await page.getByRole("button", { name: "Pin message" }).click();

    await expect
      .element(page.getByText("Failed to update pinned message", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).not.toBeInTheDocument();
  });

  it("shows the localized notes summary, raw detail, and copy affordance", async () => {
    harness.notesError = new Error("notes receipt rejected");
    mounted = await renderHarness();
    await page.getByRole("button", { name: "Save notes" }).click();

    await expect
      .element(page.getByText("Failed to save notes", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText(/The note change could not be saved\..*notes receipt rejected/),
    ).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).toBeInTheDocument();
  });

  it("uses the localized notes fallback and hides a non-Error object", async () => {
    harness.notesError = { message: "object detail must stay hidden" };
    mounted = await renderHarness();
    await page.getByRole("button", { name: "Save notes" }).click();

    await expect
      .element(page.getByText("Failed to save notes", { exact: true }))
      .toBeInTheDocument();
    expect(
      page.getByText("object detail must stay hidden", { exact: true }),
    ).not.toBeInTheDocument();
    expect(page.getByRole("button", { name: "Copy error" })).not.toBeInTheDocument();
  });
});

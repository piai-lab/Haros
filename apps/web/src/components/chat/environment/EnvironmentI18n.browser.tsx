// FILE: EnvironmentI18n.browser.tsx
// Purpose: Prove Environment-owned labels, placeholders, and ARIA project through both locales.
// Layer: Vitest browser tests

import "../../../index.css";

import {
  MessageId,
  ThreadId,
  ThreadMarkerId,
  type PinnedMessage,
  type ThreadMarker,
} from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "~/i18n";
import { EnvironmentMarkersSection } from "./EnvironmentMarkersSection";
import { EnvironmentNotesSection } from "./EnvironmentNotesSection";
import { EnvironmentPinnedSection } from "./EnvironmentPinnedSection";

const MESSAGE_ID = MessageId.makeUnsafe("environment-i18n-message");
const THREAD_ID = ThreadId.makeUnsafe("environment-i18n-thread");

const marker: ThreadMarker = {
  id: ThreadMarkerId.makeUnsafe("environment-i18n-marker"),
  messageId: MESSAGE_ID,
  startOffset: 0,
  endOffset: 9,
  selectedText: "important",
  style: "highlight",
  color: "yellow",
  label: "Important detail",
  done: false,
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
};

const pin: PinnedMessage = {
  messageId: MESSAGE_ID,
  label: "Pinned detail",
  done: false,
  pinnedAt: "2026-08-15T00:00:00.000Z",
};

function EnvironmentLocaleHarness() {
  const messageTextById = new Map([[MESSAGE_ID, "important task context"]]);
  return (
    <I18nProvider>
      <EnvironmentMarkersSection
        markers={[marker]}
        messageTextById={messageTextById}
        onJump={() => {}}
        onToggleDone={() => {}}
        onRemove={() => {}}
        onRename={() => {}}
      />
      <EnvironmentPinnedSection
        pins={[pin]}
        messageTextById={messageTextById}
        onJump={() => {}}
        onToggleDone={() => {}}
        onUnpin={() => {}}
        onRename={() => {}}
      />
      <EnvironmentNotesSection threadId={THREAD_ID} notes="" onChange={async () => {}} />
    </I18nProvider>
  );
}

describe("Environment locale projection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders Environment labels, placeholders, and actions in English", async () => {
    harness.settings.localePreference = "en";
    await render(<EnvironmentLocaleHarness />);

    expect(page.getByRole("button", { name: "Text markers", exact: true })).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Pinned messages", exact: true })).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Notepad", exact: true })).toBeInTheDocument();
    expect(page.getByPlaceholder("Add notes for this task…")).toBeInTheDocument();
    expect(page.getByRole("checkbox", { name: "Mark done" }).first()).toBeInTheDocument();
  });

  it("renders the same reachable surface in Simplified Chinese", async () => {
    harness.settings.localePreference = "zh-CN";
    await render(<EnvironmentLocaleHarness />);

    expect(page.getByRole("button", { name: "文本标记", exact: true })).toBeInTheDocument();
    expect(page.getByRole("button", { name: "置顶消息", exact: true })).toBeInTheDocument();
    expect(page.getByRole("button", { name: "记事本", exact: true })).toBeInTheDocument();
    expect(page.getByPlaceholder("记录当前任务的临时信息…")).toBeInTheDocument();
    expect(page.getByRole("checkbox", { name: "标记为已完成" }).first()).toBeInTheDocument();
  });
});

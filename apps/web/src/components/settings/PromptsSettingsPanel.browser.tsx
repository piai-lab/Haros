// FILE: PromptsSettingsPanel.browser.tsx
// Purpose: Locks the single-owner Personal Strategy settings journey.
// Layer: Browser UI test

import "../../index.css";

import {
  HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  type NativeApi,
  type OAAgentPromptSnapshot,
} from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { PromptsSettingsPanel } from "./PromptsSettingsPanel";

const INITIAL = "Be direct.";

function snapshot(
  input: {
    content?: string;
    version?: string;
    sourceId?: "AGENTS.override.md" | "AGENTS.md";
    unavailableReason?: "too_large" | "unsupported_text";
  } = {},
): OAAgentPromptSnapshot {
  const sourceId = input.sourceId ?? "AGENTS.md";
  return {
    personalStrategy: input.unavailableReason
      ? {
          availability: "unavailable",
          unavailableReason: input.unavailableReason,
          sourceId,
          displayPath: `~/.oa/agent/${sourceId}`,
          revealPath: `/private/example/.oa/agent/${sourceId}`,
          version: null,
          content: "",
        }
      : {
          availability: "available",
          unavailableReason: null,
          sourceId,
          displayPath: `~/.oa/agent/${sourceId}`,
          revealPath: `/private/example/.oa/agent/${sourceId}`,
          version: input.version ?? "a".repeat(64),
          content: input.content ?? INITIAL,
        },
    maxBytes: HARNESSOS_AGENT_PROMPT_MAX_BYTES,
  };
}

function installApi(
  input: {
    getSnapshot?: NativeApi["oaAgentPrompts"]["getSnapshot"];
    mutate?: NativeApi["oaAgentPrompts"]["mutate"];
    showInFolder?: NativeApi["shell"]["showInFolder"];
  } = {},
) {
  window.nativeApi = {
    oaAgentPrompts: {
      getSnapshot: input.getSnapshot ?? vi.fn().mockResolvedValue(snapshot()),
      mutate: input.mutate ?? vi.fn(),
    },
    shell: { showInFolder: input.showInFolder ?? vi.fn() },
  } as unknown as NativeApi;
}

describe("PromptsSettingsPanel", () => {
  afterEach(() => {
    delete window.nativeApi;
    delete window.desktopBridge;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("shows one Personal Strategy editor and keeps an unsaved draft across section visits", async () => {
    const getSnapshot = vi.fn().mockResolvedValue(snapshot());
    installApi({ getSnapshot });
    const screen = await render(<PromptsSettingsPanel active />);
    const editor = screen.getByRole("textbox", { name: "Personal strategy" });
    await expect.element(editor).toHaveValue(INITIAL);
    expect(screen.getByRole("textbox").elements()).toHaveLength(1);
    await editor.fill("Unsaved");
    await screen.rerender(<PromptsSettingsPanel active={false} />);
    await screen.rerender(<PromptsSettingsPanel active />);
    await expect
      .element(screen.getByRole("textbox", { name: "Personal strategy" }))
      .toHaveValue("Unsaved");
    expect(getSnapshot).toHaveBeenCalledWith({ locale: "en" });
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it("saves and restores the same source with locale and optimistic version", async () => {
    const customized = snapshot({ content: "Be exact.", version: "b".repeat(64) });
    const restored = snapshot({ content: "Factory", version: "c".repeat(64) });
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({ state: "changed", snapshot: customized })
      .mockResolvedValueOnce({ state: "changed", snapshot: restored });
    installApi({ mutate });
    const screen = await render(<PromptsSettingsPanel active />);
    const editor = screen.getByRole("textbox", { name: "Personal strategy" });
    await editor.fill("Be exact.");
    await screen.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenNthCalledWith(1, {
      action: "setPersonalStrategy",
      sourceId: "AGENTS.md",
      expectedVersion: "a".repeat(64),
      locale: "en",
      content: "Be exact.",
    });
    await screen.getByRole("button", { name: "Restore factory default" }).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(mutate).toHaveBeenNthCalledWith(2, {
      action: "restorePersonalStrategy",
      sourceId: "AGENTS.md",
      expectedVersion: "b".repeat(64),
      locale: "en",
    });
    await expect.element(editor).toHaveValue("Factory");
    await screen.unmount();
  });

  it("preserves the draft on conflict and can adopt the fresh value", async () => {
    const external = snapshot({ content: "External", version: "b".repeat(64) });
    installApi({
      mutate: vi.fn().mockResolvedValue({
        state: "conflict",
        reason: "content_changed",
        snapshot: external,
      }),
    });
    const screen = await render(<PromptsSettingsPanel active />);
    const editor = screen.getByRole("textbox", { name: "Personal strategy" });
    await editor.fill("Mine");
    await screen.getByRole("button", { name: "Save" }).click();
    await expect.element(screen.getByText("This setting changed elsewhere")).toBeVisible();
    await expect.element(editor).toHaveValue("Mine");
    await screen.getByRole("button", { name: "Reload current value" }).click();
    await expect.element(editor).toHaveValue("External");
    await screen.unmount();
  });

  it("keeps unavailable content local, reveals the source when supported, and retries reads", async () => {
    const getSnapshot = vi
      .fn()
      .mockRejectedValueOnce(new Error("capacity"))
      .mockResolvedValue(snapshot({ unavailableReason: "too_large" }));
    const showInFolder = vi.fn().mockResolvedValue(undefined);
    window.desktopBridge = { showInFolder: vi.fn() } as unknown as NonNullable<
      typeof window.desktopBridge
    >;
    installApi({ getSnapshot, showInFolder });
    const screen = await render(<PromptsSettingsPanel active />);
    await screen.getByRole("button", { name: "Retry" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Personal strategy" })).toBeDisabled();
    await expect
      .element(
        screen.getByText(
          "This strategy is too large to edit here. Use the location below to make changes.",
        ),
      )
      .toBeVisible();
    await screen.getByRole("button", { name: "Open" }).click();
    expect(showInFolder).toHaveBeenCalledWith("/private/example/.oa/agent/AGENTS.md");
    await screen.unmount();
  });

  it("keeps long content contained and disables invalid text", async () => {
    await page.viewport(480, 620);
    installApi();
    const screen = await render(<PromptsSettingsPanel active />);
    try {
      const editor = screen.getByRole("textbox", { name: "Personal strategy" });
      await editor.fill(Array.from({ length: 1_200 }, (_, index) => `line ${index}`).join("\n"));
      const textarea = editor.element() as HTMLTextAreaElement;
      expect(getComputedStyle(textarea).overflowY).toBe("auto");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth + 1,
      );
      await editor.fill("invalid \u0001 control");
      await expect
        .element(
          screen.getByText(
            "Use valid text without unsupported control characters. Tabs and line breaks are allowed.",
          ),
        )
        .toBeVisible();
      await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    } finally {
      await screen.unmount();
      await page.viewport(1280, 720);
    }
  });
});

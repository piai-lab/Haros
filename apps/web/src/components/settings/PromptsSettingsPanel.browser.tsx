// FILE: PromptsSettingsPanel.browser.tsx
// Purpose: Locks the file-first Prompt settings journey and explicit reload separation.
// Layer: Browser UI test

import "../../index.css";

import {
  ThreadId,
  type NativeApi,
  OmniMindAgentPromptResourceKind,
  OmniMindAgentPromptSnapshot,
} from "@omnimind/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const reloadTargetHarness = vi.hoisted(() => ({
  threadId: null as ReturnType<typeof ThreadId.makeUnsafe> | null,
}));

vi.mock("./promptReloadTarget", () => ({
  resolvePromptReloadThreadId: () => reloadTargetHarness.threadId,
}));

import { PromptsSettingsPanel } from "./PromptsSettingsPanel";

const SOURCES = ["AGENTS.override.md", "AGENTS.md", "AGENTS.MD", "CLAUDE.md", "CLAUDE.MD"] as const;

function snapshot(
  input: {
    readonly global?: string | null;
    readonly globalVersion?: string;
    readonly append?: string | null;
    readonly system?: string | null;
    readonly requested?: OmniMindAgentPromptResourceKind;
  } = {},
): OmniMindAgentPromptSnapshot {
  const requested = input.requested ?? "globalContext";
  const fixed = (kind: "appendSystem" | "system", content: string | null | undefined) => {
    const sourceId =
      kind === "appendSystem" ? ("APPEND_SYSTEM.md" as const) : ("SYSTEM.md" as const);
    return {
      kind,
      sourceId,
      displayPath: `~/.omnimind/agent/${sourceId}`,
      exists: content != null,
      version: content != null && requested === kind ? "c".repeat(64) : null,
      contentLoaded: requested === kind,
      content: requested === kind ? (content ?? null) : null,
    };
  };
  return {
    globalContextCandidates: SOURCES.map((sourceId) => ({
      sourceId,
      displayPath: `~/.omnimind/agent/${sourceId}`,
      exists: sourceId === "AGENTS.md" && input.global != null,
      active: sourceId === "AGENTS.md" && input.global != null,
    })),
    globalContext:
      input.global == null
        ? {
            kind: "globalContext",
            sourceId: null,
            displayPath: null,
            exists: false,
            version: null,
            contentLoaded: requested === "globalContext",
            content: null,
          }
        : {
            kind: "globalContext",
            sourceId: "AGENTS.md",
            displayPath: "~/.omnimind/agent/AGENTS.md",
            exists: true,
            version: input.globalVersion ?? "a".repeat(64),
            contentLoaded: requested === "globalContext",
            content: requested === "globalContext" ? input.global : null,
          },
    appendSystem: fixed("appendSystem", input.append),
    system: fixed("system", input.system),
    maxBytes: 1_000_000,
  };
}

describe("PromptsSettingsPanel", () => {
  afterEach(() => {
    reloadTargetHarness.threadId = null;
    delete window.nativeApi;
    window.localStorage.clear();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("keeps visit, draft cancel, and first empty state side-effect free", async () => {
    const getSnapshot = vi.fn().mockResolvedValue(snapshot());
    const mutate = vi.fn();
    const reload = vi.fn();
    window.nativeApi = {
      omnimindAgentPrompts: { getSnapshot, mutate },
      omnimindEcosystem: { reload },
    } as unknown as NativeApi;

    const screen = await render(<PromptsSettingsPanel active />);
    await expect.element(screen.getByText("This file has not been created.")).toBeVisible();
    expect(mutate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();

    await screen.getByRole("button", { name: "Add instructions" }).click();
    const editor = screen.getByRole("textbox", { name: "Global personal instructions" });
    await editor.fill("draft only");
    await screen.getByRole("button", { name: "Cancel" }).click();
    await expect.element(screen.getByText("This file has not been created.")).toBeVisible();
    expect(mutate).not.toHaveBeenCalled();
    await expect
      .element(screen.getByRole("button", { name: "Reload current conversation resources" }))
      .not.toBeInTheDocument();
    await screen.unmount();
  });

  it("creates the default global file without sending a path or reloading", async () => {
    const created = snapshot({ global: "Be concise.", globalVersion: "b".repeat(64) });
    const mutate = vi.fn().mockResolvedValue({ state: "changed", snapshot: created });
    const reload = vi.fn();
    window.nativeApi = {
      omnimindAgentPrompts: {
        getSnapshot: vi.fn().mockResolvedValue(snapshot()),
        mutate,
      },
      omnimindEcosystem: { reload },
    } as unknown as NativeApi;

    const screen = await render(<PromptsSettingsPanel active />);
    await screen.getByRole("button", { name: "Add instructions" }).click();
    await screen.getByRole("textbox", { name: "Global personal instructions" }).fill("Be concise.");
    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith({
      action: "create",
      resource: "globalContext",
      content: "Be concise.",
    });
    expect(JSON.stringify(mutate.mock.calls)).not.toContain("displayPath");
    expect(reload).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "File locations" }).click();
    await expect.element(screen.getByText("~/.omnimind/agent/AGENTS.md")).toBeVisible();
    await screen.unmount();
  });

  it("preserves a draft on conflict and only replaces it after explicit reload", async () => {
    const initial = snapshot({ global: "old" });
    const fresh = snapshot({ global: "external", globalVersion: "b".repeat(64) });
    window.nativeApi = {
      omnimindAgentPrompts: {
        getSnapshot: vi.fn().mockResolvedValue(initial),
        mutate: vi.fn().mockResolvedValue({
          state: "conflict",
          reason: "content_changed",
          snapshot: fresh,
        }),
      },
      omnimindEcosystem: { reload: vi.fn() },
    } as unknown as NativeApi;

    const screen = await render(<PromptsSettingsPanel active />);
    const editor = screen.getByRole("textbox", { name: "Global personal instructions" });
    await expect.element(editor).toHaveValue("old");
    await editor.fill("mine");
    await screen.getByRole("button", { name: "Save" }).click();
    await expect.element(screen.getByText("The file changed elsewhere")).toBeVisible();
    await expect.element(editor).toHaveValue("mine");

    await screen.getByRole("button", { name: "Reload file" }).click();
    await expect.element(editor).toHaveValue("external");
    await screen.unmount();
  });

  it("keeps advanced files folded and confirms first replacement-file creation", async () => {
    const initial = snapshot();
    const getSnapshot = vi.fn(
      async ({ resource }: { resource?: OmniMindAgentPromptResourceKind }) =>
        snapshot(resource ? { requested: resource } : {}),
    );
    const mutate = vi.fn().mockResolvedValue({
      state: "changed",
      snapshot: snapshot({ system: "replacement", requested: "system" }),
    });
    window.nativeApi = {
      omnimindAgentPrompts: { getSnapshot, mutate },
      omnimindEcosystem: { reload: vi.fn() },
    } as unknown as NativeApi;

    const screen = await render(<PromptsSettingsPanel active />);
    await expect
      .element(screen.getByRole("textbox", { name: "Replacement system instructions" }))
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: /Advanced/ }).click();
    await vi.waitFor(() => expect(getSnapshot).toHaveBeenCalledWith({ resource: "system" }));
    await screen.getByRole("button", { name: "Create file" }).nth(1).click();
    await screen
      .getByRole("textbox", { name: "Replacement system instructions" })
      .fill("replacement");
    await screen.getByRole("button", { name: "Save" }).click();
    await expect
      .element(screen.getByText("Replace the default system instructions?"))
      .toBeVisible();
    expect(mutate).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "Confirm" }).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await screen.unmount();
  });

  it("projects every explicit reload result without changing the saved-file receipt", async () => {
    reloadTargetHarness.threadId = ThreadId.makeUnsafe("00000000-0000-4000-8000-000000000021");
    const reload = vi
      .fn()
      .mockResolvedValueOnce({ state: "reloaded" })
      .mockResolvedValueOnce({ state: "busy" })
      .mockResolvedValueOnce({ state: "no_active_session" })
      .mockResolvedValueOnce({ state: "different_engine" })
      .mockRejectedValueOnce(new Error("reload failed"));
    const mutate = vi.fn().mockResolvedValue({
      state: "changed",
      snapshot: snapshot({ global: "saved again", globalVersion: "b".repeat(64) }),
    });
    window.nativeApi = {
      omnimindAgentPrompts: {
        getSnapshot: vi.fn().mockResolvedValue(snapshot({ global: "saved" })),
        mutate,
      },
      omnimindEcosystem: { reload },
    } as unknown as NativeApi;

    const screen = await render(<PromptsSettingsPanel active />);
    const button = screen.getByRole("button", { name: "Reload current conversation resources" });
    await button.click();
    await expect
      .element(screen.getByText("Reloaded. Messages sent next will use the current files."))
      .toBeVisible();
    await screen.getByRole("textbox", { name: "Global personal instructions" }).fill("saved again");
    await screen.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await expect
      .element(screen.getByText("Reloaded. Messages sent next will use the current files."))
      .not.toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
    await button.click();
    await expect
      .element(
        screen.getByText(
          "This conversation is currently running. The saved files do not change the work in progress.",
        ),
      )
      .toBeVisible();
    await button.click();
    await expect
      .element(
        screen.getByText(
          "No active session needed reloading. The conversation will read the current files when it starts again.",
        ),
      )
      .toBeVisible();
    await button.click();
    await expect
      .element(
        screen.getByText(
          "The remembered conversation no longer uses OmniMind Agent. Start or return to an OmniMind Agent conversation to reload it.",
        ),
      )
      .toBeVisible();
    await button.click();
    await expect
      .element(
        screen.getByText(
          "The files remain saved, but conversation resources could not be reloaded. Try again or start a new conversation.",
        ),
      )
      .toBeVisible();
    expect(reload).toHaveBeenCalledTimes(5);
    await screen.unmount();
  });
});

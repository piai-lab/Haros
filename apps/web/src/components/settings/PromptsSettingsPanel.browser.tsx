// FILE: PromptsSettingsPanel.browser.tsx
// Purpose: Locks the provider-global two-card Prompt settings journey.
// Layer: Browser UI test

import "../../index.css";

import {
  OMNIMIND_AGENT_PROMPT_MAX_BYTES,
  type NativeApi,
  type OmniMindAgentPromptSnapshot,
} from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { PromptsSettingsPanel } from "./PromptsSettingsPanel";

const FACTORY = "Factory default instructions";

function snapshot(
  input: {
    readonly defaultContent?: string;
    readonly defaultCustomized?: boolean;
    readonly defaultVersion?: string;
    readonly customRules?: string | null;
    readonly customVersion?: string;
    readonly customSource?: "AGENTS.override.md" | "AGENTS.md";
    readonly customUnavailableReason?: "too_large" | "unsupported_text";
  } = {},
): OmniMindAgentPromptSnapshot {
  const customRules = input.customRules ?? null;
  const customSource = input.customSource ?? "AGENTS.md";
  return {
    defaultPrompt: {
      content: input.defaultContent ?? FACTORY,
      customized: input.defaultCustomized ?? false,
      version: input.defaultVersion ?? "a".repeat(64),
    },
    customRules: input.customUnavailableReason
      ? {
          availability: "unavailable",
          unavailableReason: input.customUnavailableReason,
          sourceId: customSource,
          displayPath: `~/.omnimind/agent/${customSource}`,
          revealPath: `/private/example/.omnimind/agent/${customSource}`,
          exists: true,
          version: null,
          content: "",
        }
      : customRules === null
        ? {
            availability: "absent",
            unavailableReason: null,
            sourceId: null,
            displayPath: null,
            revealPath: null,
            exists: false,
            version: null,
            content: "",
          }
        : {
            availability: "available",
            unavailableReason: null,
            sourceId: customSource,
            displayPath: `~/.omnimind/agent/${customSource}`,
            revealPath: `/private/example/.omnimind/agent/${customSource}`,
            exists: true,
            version: input.customVersion ?? "b".repeat(64),
            content: customRules,
          },
    maxBytes: OMNIMIND_AGENT_PROMPT_MAX_BYTES,
  };
}

function installApi(input: {
  readonly getSnapshot?: NativeApi["omnimindAgentPrompts"]["getSnapshot"];
  readonly mutate?: NativeApi["omnimindAgentPrompts"]["mutate"];
  readonly reload?: NativeApi["omnimindEcosystem"]["reload"];
  readonly showInFolder?: NativeApi["shell"]["showInFolder"];
}) {
  window.nativeApi = {
    omnimindAgentPrompts: {
      getSnapshot: input.getSnapshot ?? vi.fn().mockResolvedValue(snapshot()),
      mutate: input.mutate ?? vi.fn(),
    },
    omnimindEcosystem: { reload: input.reload ?? vi.fn() },
    shell: { showInFolder: input.showInFolder ?? vi.fn() },
  } as unknown as NativeApi;
}

describe("PromptsSettingsPanel", () => {
  afterEach(() => {
    delete window.nativeApi;
    delete window.desktopBridge;
    window.localStorage.clear();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("shows the factory default on a fresh profile while visit, cancel, and blank rules stay passive", async () => {
    const getSnapshot = vi.fn().mockResolvedValue(snapshot());
    const mutate = vi.fn();
    const reload = vi.fn();
    installApi({ getSnapshot, mutate, reload });

    const screen = await render(<PromptsSettingsPanel active />);
    await expect
      .element(screen.getByRole("textbox", { name: "Default prompt" }))
      .toHaveValue(FACTORY);
    await expect
      .element(
        screen.getByText(
          "OmniMind built-in default. Saved changes apply to tasks and conversations started afterward.",
        ),
      )
      .toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "Custom rules" })).toHaveValue("");
    await expect
      .element(screen.getByText("AGENTS.md will be created on the first non-empty save."))
      .toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Save" }).nth(1)).toBeDisabled();
    for (const title of ["Default prompt", "Custom rules"]) {
      expect(
        [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(
          (heading) => heading.textContent?.trim() === title,
        ),
      ).toHaveLength(1);
    }
    await expect
      .element(screen.getByText("Current conversation resources"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Reload current conversation resources" }))
      .not.toBeInTheDocument();

    const rules = screen.getByRole("textbox", { name: "Custom rules" });
    await rules.fill("draft only");
    await screen.getByRole("button", { name: "Cancel" }).nth(1).click();
    await expect.element(rules).toHaveValue("");
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(mutate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it("retains both unsaved drafts when another Settings section is visited", async () => {
    const getSnapshot = vi.fn().mockResolvedValue(snapshot({ customRules: "Saved rules" }));
    installApi({ getSnapshot });

    const screen = await render(<PromptsSettingsPanel active />);
    const defaultEditor = screen.getByRole("textbox", { name: "Default prompt" });
    const rulesEditor = screen.getByRole("textbox", { name: "Custom rules" });
    await expect.element(defaultEditor).toHaveValue(FACTORY);
    await defaultEditor.fill("Unsaved default draft");
    await rulesEditor.fill("Unsaved rules draft");

    await screen.rerender(<PromptsSettingsPanel active={false} />);
    await expect.element(defaultEditor).not.toBeInTheDocument();
    await screen.rerender(<PromptsSettingsPanel active />);

    await expect
      .element(screen.getByRole("textbox", { name: "Default prompt" }))
      .toHaveValue("Unsaved default draft");
    await expect
      .element(screen.getByRole("textbox", { name: "Custom rules" }))
      .toHaveValue("Unsaved rules draft");
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it("keeps an unavailable custom-rules file local to its card and hides Open without Desktop", async () => {
    installApi({
      getSnapshot: vi.fn().mockResolvedValue(
        snapshot({
          defaultContent: FACTORY,
          customUnavailableReason: "too_large",
        }),
      ),
    });

    const screen = await render(<PromptsSettingsPanel active />);
    await expect
      .element(screen.getByRole("textbox", { name: "Default prompt" }))
      .toHaveValue(FACTORY);
    await expect.element(screen.getByRole("textbox", { name: "Custom rules" })).toBeDisabled();
    await expect
      .element(
        screen.getByText(
          "These custom rules are too large to edit here. Use the location below to make changes.",
        ),
      )
      .toBeVisible();
    await expect.element(screen.getByText("~/.omnimind/agent/AGENTS.md")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open" })).not.toBeInTheDocument();
    await screen.unmount();
  });

  it("offers an actionable retry when the bounded local snapshot read fails", async () => {
    const getSnapshot = vi
      .fn()
      .mockRejectedValueOnce(new Error("capacity"))
      .mockResolvedValue(snapshot());
    installApi({ getSnapshot });

    const screen = await render(<PromptsSettingsPanel active />);
    await expect
      .element(
        screen.getByText(
          "Prompt settings are unavailable right now. Nothing was changed; try again.",
        ),
      )
      .toBeVisible();
    await screen.getByRole("button", { name: "Retry" }).click();
    await expect
      .element(screen.getByRole("textbox", { name: "Default prompt" }))
      .toHaveValue(FACTORY);
    await expect
      .element(
        screen.getByText(
          "OmniMind built-in default. Saved changes apply to tasks and conversations started afterward.",
        ),
      )
      .toBeVisible();
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    await screen.unmount();
  });

  it("saves and restores only the native default segment without automatically reloading", async () => {
    const customized = snapshot({
      defaultContent: "Customized default",
      defaultCustomized: true,
      defaultVersion: "c".repeat(64),
    });
    const restored = snapshot({ defaultVersion: "d".repeat(64) });
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({ state: "changed", snapshot: customized })
      .mockResolvedValueOnce({ state: "changed", snapshot: restored });
    const reload = vi.fn();
    installApi({ mutate, reload });

    const screen = await render(<PromptsSettingsPanel active />);
    await expect
      .element(
        screen.getByText(
          "OmniMind built-in default. Saved changes apply to tasks and conversations started afterward.",
        ),
      )
      .toBeVisible();
    const editor = screen.getByRole("textbox", { name: "Default prompt" });
    await editor.fill("Customized default");
    await screen.getByRole("button", { name: "Save" }).nth(0).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenNthCalledWith(1, {
      action: "setDefault",
      expectedVersion: "a".repeat(64),
      content: "Customized default",
    });
    expect(reload).not.toHaveBeenCalled();
    await expect
      .element(
        screen.getByText(
          "Customized for OmniMind Agent. Saved changes apply to tasks and conversations started afterward.",
        ),
      )
      .toBeVisible();

    await screen.getByRole("button", { name: "Restore factory default" }).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(mutate).toHaveBeenNthCalledWith(2, {
      action: "restoreDefault",
      expectedVersion: "c".repeat(64),
    });
    await expect.element(editor).toHaveValue(FACTORY);
    await expect
      .element(
        screen.getByText(
          "OmniMind built-in default. Saved changes apply to tasks and conversations started afterward.",
        ),
      )
      .toBeVisible();
    expect(reload).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it("creates exact custom rules, exposes only their subdued path, opens it, and preserves conflict drafts", async () => {
    const created = snapshot({ customRules: "Be concise." });
    const external = snapshot({ customRules: "External", customVersion: "c".repeat(64) });
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({ state: "changed", snapshot: created })
      .mockResolvedValueOnce({
        state: "conflict",
        reason: "content_changed",
        snapshot: external,
      });
    const showInFolder = vi.fn().mockResolvedValue(undefined);
    window.desktopBridge = { showInFolder: vi.fn() } as unknown as NonNullable<
      typeof window.desktopBridge
    >;
    installApi({ mutate, showInFolder });

    const screen = await render(<PromptsSettingsPanel active />);
    const editor = screen.getByRole("textbox", { name: "Custom rules" });
    await editor.fill("Be concise.");
    await screen.getByRole("button", { name: "Save" }).nth(1).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenNthCalledWith(1, {
      action: "createCustomRules",
      content: "Be concise.",
    });
    expect(JSON.stringify(mutate.mock.calls)).not.toContain("revealPath");
    await expect.element(screen.getByText("~/.omnimind/agent/AGENTS.md")).toBeVisible();
    expect(document.body.textContent).not.toContain("SYSTEM.md");
    expect(document.body.textContent).not.toContain("APPEND_SYSTEM.md");
    await screen.getByRole("button", { name: "Open" }).click();
    expect(showInFolder).toHaveBeenCalledWith("/private/example/.omnimind/agent/AGENTS.md");

    await editor.fill("Mine");
    await screen.getByRole("button", { name: "Save" }).nth(1).click();
    await expect.element(screen.getByText("This setting changed elsewhere")).toBeVisible();
    await expect.element(editor).toHaveValue("Mine");
    await screen.getByRole("button", { name: "Reload current value" }).click();
    await expect.element(editor).toHaveValue("External");
    await screen.unmount();
  });

  it("uses the default editor base version when another resource refreshes the snapshot", async () => {
    const initial = snapshot({
      defaultContent: "My earlier default",
      defaultCustomized: true,
      defaultVersion: "a".repeat(64),
    });
    const afterRulesSave = snapshot({
      defaultContent: "External newer default",
      defaultCustomized: true,
      defaultVersion: "c".repeat(64),
      customRules: "Saved rules",
    });
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({ state: "changed", snapshot: afterRulesSave })
      .mockResolvedValueOnce({
        state: "conflict",
        reason: "content_changed",
        snapshot: afterRulesSave,
      });
    installApi({ getSnapshot: vi.fn().mockResolvedValue(initial), mutate });

    const screen = await render(<PromptsSettingsPanel active />);
    await screen.getByRole("textbox", { name: "Default prompt" }).fill("My dirty draft");
    await screen.getByRole("textbox", { name: "Custom rules" }).fill("Saved rules");
    await screen.getByRole("button", { name: "Save" }).nth(1).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await screen.getByRole("button", { name: "Restore factory default" }).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(mutate).toHaveBeenNthCalledWith(2, {
      action: "restoreDefault",
      expectedVersion: "a".repeat(64),
    });
    await expect.element(screen.getByText("This setting changed elsewhere")).toBeVisible();
    await expect
      .element(screen.getByRole("textbox", { name: "Default prompt" }))
      .toHaveValue("My dirty draft");
    await screen.unmount();
  });

  it("keeps untouched custom-rules content, source details, and Open action on one snapshot slice", async () => {
    const initial = snapshot({
      customRules: "Rules from A",
      customSource: "AGENTS.md",
      customVersion: "b".repeat(64),
    });
    const afterDefaultSave = snapshot({
      defaultContent: "Customized default",
      defaultCustomized: true,
      defaultVersion: "c".repeat(64),
      customRules: "Rules from B",
      customSource: "AGENTS.override.md",
      customVersion: "d".repeat(64),
    });
    const mutate = vi.fn().mockResolvedValue({ state: "changed", snapshot: afterDefaultSave });
    const showInFolder = vi.fn().mockResolvedValue(undefined);
    window.desktopBridge = { showInFolder: vi.fn() } as unknown as NonNullable<
      typeof window.desktopBridge
    >;
    installApi({
      getSnapshot: vi.fn().mockResolvedValue(initial),
      mutate,
      showInFolder,
    });

    const screen = await render(<PromptsSettingsPanel active />);
    await screen.getByRole("textbox", { name: "Default prompt" }).fill("Customized default");
    await screen.getByRole("button", { name: "Save" }).nth(0).click();
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    await expect
      .element(screen.getByRole("textbox", { name: "Custom rules" }))
      .toHaveValue("Rules from A");
    await expect.element(screen.getByText("~/.omnimind/agent/AGENTS.md")).toBeVisible();
    await expect
      .element(screen.getByText("~/.omnimind/agent/AGENTS.override.md"))
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Open" }).click();
    expect(showInFolder).toHaveBeenCalledWith("/private/example/.omnimind/agent/AGENTS.md");
    await screen.unmount();
  });

  it("keeps long editors contained and returns focus after the delete dialog at a narrow width", async () => {
    await page.viewport(480, 620);
    installApi({ getSnapshot: vi.fn().mockResolvedValue(snapshot({ customRules: "saved" })) });
    const screen = await render(<PromptsSettingsPanel active />);
    try {
      const editor = screen.getByRole("textbox", { name: "Default prompt" });
      await editor.fill(Array.from({ length: 1_200 }, (_, index) => `line ${index}`).join("\n"));
      const textarea = editor.element() as HTMLTextAreaElement;
      expect(getComputedStyle(textarea).overflowY).toBe("auto");
      expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth + 1,
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      deleteButton.element().focus();
      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByText("Delete your custom rules?")).toBeVisible();
      expect(
        document
          .querySelector('[data-slot="alert-dialog-popup"]')
          ?.contains(document.activeElement),
      ).toBe(true);
      await userEvent.keyboard("{Escape}");
      await expect.element(screen.getByText("Delete your custom rules?")).not.toBeInTheDocument();
      await expect.poll(() => document.activeElement).toBe(deleteButton.element());

      await editor.fill("valid tab\tand line\nbut invalid \u0001 control");
      await expect
        .element(
          screen.getByText(
            "Use valid text without unsupported control characters. Tabs and line breaks are allowed.",
          ),
        )
        .toBeVisible();
      await expect.element(screen.getByRole("button", { name: "Save" }).nth(0)).toBeDisabled();
    } finally {
      await screen.unmount();
      await page.viewport(1280, 720);
    }
  });
});

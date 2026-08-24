// FILE: ProjectScriptsControl.browser.tsx
// Purpose: Browser regressions for the chat-header project action control.
// Layer: Browser UI test

import "../index.css";

import { type ProjectScript, type ResolvedKeybindingsConfig } from "@omnimind/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import ProjectScriptsControl, { type NewProjectScriptInput } from "./ProjectScriptsControl";
import { I18nProvider } from "~/i18n";

const harness = vi.hoisted(() => ({ settings: { localePreference: "zh-CN" } }));

vi.mock("~/localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];

async function mountProjectScriptsControl(props?: {
  scripts?: ProjectScript[];
  preferredScriptId?: string | null;
}) {
  const onRunScript = vi.fn();
  const onAddScript = vi.fn<(input: NewProjectScriptInput) => void>();
  const onUpdateScript = vi.fn<(scriptId: string, input: NewProjectScriptInput) => void>();
  const onDeleteScript = vi.fn<(scriptId: string) => void>();
  const host = document.createElement("div");
  document.body.append(host);
  const screen = await render(
    <ProjectScriptsControl
      scripts={props?.scripts ?? []}
      keybindings={EMPTY_KEYBINDINGS}
      preferredScriptId={props?.preferredScriptId ?? null}
      onRunScript={onRunScript}
      onAddScript={onAddScript}
      onUpdateScript={onUpdateScript}
      onDeleteScript={onDeleteScript}
    />,
    { container: host },
  );

  const cleanup = async () => {
    await screen.unmount();
    host.remove();
  };

  return {
    [Symbol.asyncDispose]: cleanup,
    cleanup,
    onRunScript,
    onAddScript,
    onUpdateScript,
    onDeleteScript,
  };
}

describe("ProjectScriptsControl", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens the add-action dialog from the header when no script exists yet", async () => {
    await using _ = await mountProjectScriptsControl();

    await page.getByRole("button", { name: "Add action" }).click();

    await expect.poll(() => document.body.textContent).toContain("Add action");
    expect(document.body.textContent).toContain(
      "Actions are project-scoped commands you can run from the top bar or keybindings.",
    );
  });

  it("runs the primary action and exposes setup actions in the dropdown", async () => {
    const setupScript: ProjectScript = {
      id: "setup",
      name: "Setup",
      command: "bun install",
      icon: "configure",
      runOnWorktreeCreate: true,
    };
    await using control = await mountProjectScriptsControl({
      scripts: [setupScript],
      preferredScriptId: "setup",
    });

    await page.getByRole("button", { name: "Run Setup" }).click();
    expect(control.onRunScript).toHaveBeenCalledWith(setupScript);

    await page.getByLabelText("Action menu").click();
    await expect.poll(() => document.body.textContent).toContain("Setup (setup)");
    await expect.poll(() => document.body.textContent).toContain("Add action");
  });

  it("keeps the edit dialog delete action legible", async () => {
    const setupScript: ProjectScript = {
      id: "setup",
      name: "Setup",
      command: "bun install",
      icon: "configure",
      runOnWorktreeCreate: true,
    };
    await using _ = await mountProjectScriptsControl({
      scripts: [setupScript],
      preferredScriptId: "setup",
    });

    await page.getByLabelText("Action menu").click();
    await expect
      .poll(() => document.querySelector<HTMLButtonElement>('button[aria-label="Edit Setup"]'))
      .not.toBeNull();
    document.querySelector<HTMLButtonElement>('button[aria-label="Edit Setup"]')?.click();

    await expect.poll(() => document.body.textContent).toContain("Edit action");
    const deleteButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "Delete",
    );

    expect(deleteButton?.className).toContain("text-destructive");
    expect(deleteButton?.className).not.toContain("text-destructive-foreground");
  });

  it("renders the add-action journey in simplified Chinese", async () => {
    const screen = await render(
      <I18nProvider>
        <ProjectScriptsControl
          scripts={[]}
          keybindings={EMPTY_KEYBINDINGS}
          onRunScript={vi.fn()}
          onAddScript={vi.fn()}
          onUpdateScript={vi.fn()}
          onDeleteScript={vi.fn()}
        />
      </I18nProvider>,
    );

    await page.getByRole("button", { name: "添加操作" }).click();
    await expect.element(page.getByRole("heading", { name: "添加操作" })).toBeVisible();
    await expect
      .element(page.getByText("操作是项目范围的命令，可从顶部栏或快捷键运行。"))
      .toBeVisible();
    await screen.unmount();
  });
});

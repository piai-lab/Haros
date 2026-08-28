import "../../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ComposerCommandMenu } from "./ComposerCommandMenu";
import type { ComposerCommandItem } from "./ComposerCommandMenu";
import { I18nProvider } from "~/i18n";

const harness = vi.hoisted(() => ({ settings: { localePreference: "zh-CN" } }));

vi.mock("~/localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

async function mountMenu(input: {
  isLoading: boolean;
  triggerKind: "mention" | "skill" | "slash-command" | null;
  emptyStateText?: string;
  items?: ComposerCommandItem[];
  withI18n?: boolean;
}) {
  const host = document.createElement("div");
  document.body.append(host);
  const menu = (
    <ComposerCommandMenu
      items={input.items ?? []}
      resolvedTheme="dark"
      isLoading={input.isLoading}
      triggerKind={input.triggerKind}
      {...(input.emptyStateText === undefined ? {} : { emptyStateText: input.emptyStateText })}
      activeItemId={null}
      onHighlightedItemChange={vi.fn()}
      onSelect={vi.fn()}
    />
  );
  const screen = await render(input.withI18n ? <I18nProvider>{menu}</I18nProvider> : menu, {
    container: host,
  });

  return {
    cleanup: async () => {
      await screen.unmount();
      host.remove();
    },
  };
}

describe("ComposerCommandMenu empty states", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each([
    ["mention", "mention", "Searching mentions…"],
    ["skill", "skill", "Loading skills…"],
    ["slash command", "slash-command", "Loading commands…"],
  ] as const)(
    "shows the %s loading label before results are available",
    async (_label, triggerKind, text) => {
      const menu = await mountMenu({ isLoading: true, triggerKind });

      try {
        await expect.element(page.getByText(text, { exact: true })).toBeVisible();
        if (triggerKind === "mention") {
          await expect.element(page.getByText("Files", { exact: true })).toBeVisible();
        } else {
          expect(document.querySelector('[data-slot="command-list"]')).toBeNull();
        }
      } finally {
        await menu.cleanup();
      }
    },
  );

  it("uses the supplied empty copy after loading completes", async () => {
    const menu = await mountMenu({
      isLoading: false,
      triggerKind: "slash-command",
      emptyStateText: "No commands are available for this engine.",
    });

    try {
      await expect
        .element(page.getByText("No commands are available for this engine.", { exact: true }))
        .toBeVisible();
      expect(document.body.textContent).not.toContain("Loading commands…");
    } finally {
      await menu.cleanup();
    }
  });

  it("renders product-owned menu framing in simplified Chinese", async () => {
    const screen = await render(
      <I18nProvider>
        <ComposerCommandMenu
          items={[]}
          resolvedTheme="dark"
          isLoading
          triggerKind="mention"
          activeItemId={null}
          onHighlightedItemChange={vi.fn()}
          onSelect={vi.fn()}
        />
      </I18nProvider>,
    );

    await expect.element(page.getByText("正在搜索引用…", { exact: true })).toBeVisible();
    await expect.element(page.getByText("文件", { exact: true })).toBeVisible();
    await screen.unmount();
  });

  it("renders complete Chinese built-in presentation without lending it to native collisions", async () => {
    const items: ComposerCommandItem[] = [
      {
        id: "slash:debug",
        type: "slash-command",
        command: "debug",
        label: "/debug",
        description: "将此任务切换到证据优先调试模式",
      },
      {
        id: "slash:goal",
        type: "slash-command",
        command: "goal",
        label: "/goal",
        description: "设置当前任务的持久目标",
      },
      ...(["status", "model", "compact"] as const).map((command) => ({
        id: `engine-command:codex:${command}`,
        type: "engine-native-command" as const,
        engine: "codex" as const,
        command,
        label: `/${command}`,
        description: `Engine native ${command}`,
      })),
    ];
    const menu = await mountMenu({
      isLoading: false,
      triggerKind: "slash-command",
      items,
      withI18n: true,
    });

    try {
      await expect.element(page.getByText("调试", { exact: true })).toBeVisible();
      await expect.element(page.getByText("目标", { exact: true })).toBeVisible();
      for (const title of ["Status", "Model", "Compact"]) {
        await expect.element(page.getByText(title, { exact: true })).toBeVisible();
      }
      expect(document.body.textContent).not.toContain("状态");
      expect(document.body.textContent).not.toContain("压缩上下文");

      const statusTitle = [...document.querySelectorAll("span")].find(
        (element) => element.textContent === "Status",
      );
      const statusRow = statusTitle?.closest('[data-slot="command-item"]');
      expect(statusRow?.querySelector('[data-slot="central-icon"]')).not.toBeNull();
      expect(statusRow?.querySelector("svg")).toBeNull();
    } finally {
      await menu.cleanup();
    }
  });
});

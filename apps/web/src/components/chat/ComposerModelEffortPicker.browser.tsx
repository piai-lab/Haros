import "../../index.css";

import { type ModelSlug, ThreadId } from "@omnimind/contracts";
import { page, userEvent } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ComposerModelEffortPicker } from "./ComposerModelEffortPicker";
import { I18nProvider } from "../../i18n";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("../../appSettings", () => ({
  useAppSettings: () => ({ settings: harness.settings }),
}));

const THREAD_ID = ThreadId.makeUnsafe("thread-grok-model-effort-picker");
const GROK_4_5 = "grok-4.5" as ModelSlug;

describe("ComposerModelEffortPicker", () => {
  it("shows the model list directly when the current Engine has no native options", async () => {
    const firstModel = "cursor/fast" as ModelSlug;
    const secondModel = "cursor/precise" as ModelSlug;
    const onProviderModelChange = vi.fn();
    const screen = await render(
      <ComposerModelEffortPicker
        provider="cursor"
        model={firstModel}
        catalogState="ready"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [],
          codex: [],
          cursor: [
            { slug: firstModel, name: "Cursor Fast" },
            { slug: secondModel, name: "Cursor Precise" },
          ],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onProviderModelChange={onProviderModelChange}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );

    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      trigger.element().focus();
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByRole("menuitemradio", { name: "Cursor Fast" }))
        .toHaveAttribute("aria-checked", "true");
      await expect
        .element(page.getByRole("menuitemradio", { name: "Cursor Precise" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("menuitem", { name: "Cursor Fast" }))
        .not.toBeInTheDocument();

      page.getByRole("menuitemradio", { name: "Cursor Precise" }).element().focus();
      await userEvent.keyboard("{Enter}");
      expect(onProviderModelChange).toHaveBeenCalledWith("cursor", secondModel);
    } finally {
      await screen.unmount();
    }
  });

  it("keeps Grok effort visible in compact layouts before runtime discovery", async () => {
    const screen = await render(
      <ComposerModelEffortPicker
        provider="grok"
        model={GROK_4_5}
        catalogState="ready"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [{ slug: GROK_4_5, name: "Grok 4.5" }],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        hideStatusLabel
        onProviderModelChange={vi.fn()}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );

    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      await expect.element(trigger).toHaveAttribute("title", "Low");
      await expect.element(trigger).toHaveTextContent("Grok 4.5");

      await trigger.click();
      await expect.element(page.getByRole("menuitemradio", { name: "None" })).toBeVisible();
      await expect.element(page.getByRole("menuitemradio", { name: "Low" })).toBeVisible();
      await expect.element(page.getByRole("menuitemradio", { name: "Medium" })).toBeVisible();
      await expect.element(page.getByRole("menuitemradio", { name: "High" })).toBeVisible();
    } finally {
      await screen.unmount();
    }
  });

  it("orders Codex effort before the Fast badge in the combined trigger", async () => {
    const model = "gpt-5.4" as ModelSlug;
    const screen = await render(
      <ComposerModelEffortPicker
        provider="codex"
        model={model}
        catalogState="ready"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [],
          codex: [{ slug: model, name: "GPT-5.4" }],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onProviderModelChange={vi.fn()}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        runtimeModel={{
          slug: model,
          name: "GPT-5.4",
          supportsFastMode: true,
          supportedReasoningEfforts: [{ value: "high" }, { value: "max" }],
          defaultReasoningEffort: "high",
        }}
        modelOptions={{ reasoningEffort: "max", fastMode: true }}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );

    try {
      const trigger = page.getByRole("button", { name: "Model and options" }).element();
      const effort = trigger.querySelector('[data-composer-primary-option="true"]');
      const fast = trigger.querySelector('[data-composer-fast-badge="true"]');
      expect(effort?.textContent).toBe("Max");
      expect(fast).not.toBeNull();
      if (!effort || !fast) throw new Error("Expected effort and Fast summary markers.");
      expect(effort.compareDocumentPosition(fast) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    } finally {
      await screen.unmount();
    }
  });

  it("separates an empty catalog from a failed catalog check", async () => {
    const callbacks = {
      onProviderModelChange: vi.fn(),
      onRefreshModels: vi.fn(),
      onOpenSettings: vi.fn(),
      onPromptChange: vi.fn(),
    };
    const modelOptionsByProvider = {
      omnimind: [],
      claudeAgent: [],
      codex: [],
      cursor: [],
      antigravity: [],
      grok: [],
      droid: [],
      kilo: [],
      opencode: [],
      pi: [],
    };
    const emptyScreen = await render(
      <ComposerModelEffortPicker
        provider="omnimind"
        model={null}
        catalogState="empty"
        modelOptionsByProvider={modelOptionsByProvider}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      await page.getByRole("button", { name: "Model and options" }).click();
      await expect.element(page.getByText("No available models", { exact: true })).toBeVisible();
    } finally {
      await emptyScreen.unmount();
    }

    const errorScreen = await render(
      <ComposerModelEffortPicker
        provider="omnimind"
        model={null}
        catalogState="error"
        modelOptionsByProvider={modelOptionsByProvider}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      await page.getByRole("button", { name: "Model and options" }).click();
      await expect
        .element(page.getByText("Model catalog unavailable", { exact: true }))
        .toBeVisible();
      await expect
        .element(page.getByRole("status").getByText("Model catalog unavailable", { exact: true }))
        .toBeVisible();
      await expect.element(page.getByRole("menuitem", { name: "Refresh models" })).toBeVisible();
      await expect
        .element(page.getByRole("menuitem", { name: "Open Model services" }))
        .toBeVisible();
    } finally {
      await errorScreen.unmount();
    }
  });

  it("keeps cold discovery and stale last-good catalogs distinct", async () => {
    const callbacks = {
      onProviderModelChange: vi.fn(),
      onRefreshModels: vi.fn(),
      onOpenSettings: vi.fn(),
      onPromptChange: vi.fn(),
    };
    const emptyOptions = {
      omnimind: [],
      claudeAgent: [],
      codex: [],
      cursor: [],
      antigravity: [],
      grok: [],
      droid: [],
      kilo: [],
      opencode: [],
      pi: [],
    };
    const checkingScreen = await render(
      <ComposerModelEffortPicker
        provider="omnimind"
        model={null}
        catalogState="checking"
        modelOptionsByProvider={emptyOptions}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      await page.getByRole("button", { name: "Model and options" }).click();
      await expect.element(page.getByText("Checking models", { exact: true })).toBeVisible();
      await expect
        .element(page.getByRole("status").getByText("Checking models", { exact: true }))
        .toBeVisible();
      await expect
        .element(page.getByRole("menuitem", { name: "Refresh models" }))
        .not.toBeInTheDocument();
    } finally {
      await checkingScreen.unmount();
    }

    const staleScreen = await render(
      <ComposerModelEffortPicker
        provider="grok"
        model={GROK_4_5}
        catalogState="stale"
        modelOptionsByProvider={{
          ...emptyOptions,
          grok: [{ slug: GROK_4_5, name: "Grok 4.5" }],
        }}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      await page.getByRole("button", { name: "Model and options" }).click();
      await expect
        .element(page.getByText("Catalog check failed; using saved models", { exact: true }))
        .toBeVisible();
      await expect.element(page.getByRole("menuitem", { name: "Refresh models" })).toBeVisible();
      await expect.element(page.getByRole("menuitem", { name: "Grok 4.5" })).toBeVisible();
    } finally {
      await staleScreen.unmount();
    }
  });

  it("shows settings instead of endless checking when discovery is idle", async () => {
    const screen = await render(
      <ComposerModelEffortPicker
        provider="opencode"
        model={null}
        catalogState="idle"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onProviderModelChange={vi.fn()}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );
    try {
      await page.getByRole("button", { name: "Model and options" }).click();
      await expect
        .element(page.getByRole("status").getByText("Model catalog unavailable", { exact: true }))
        .toBeVisible();
      await expect
        .element(
          page.getByText("Open settings to enable or configure this engine.", {
            exact: true,
          }),
        )
        .toBeVisible();
      await expect
        .element(page.getByRole("menuitem", { name: "Open engine settings" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("menuitem", { name: "Refresh models" }))
        .not.toBeInTheDocument();
    } finally {
      await screen.unmount();
    }
  });

  it("keeps a configured custom model usable while surfacing a failed catalog check", async () => {
    const customModel = "custom/private-model" as ModelSlug;
    const screen = await render(
      <ComposerModelEffortPicker
        provider="antigravity"
        model={customModel}
        catalogState="error"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [],
          codex: [],
          cursor: [],
          antigravity: [{ slug: customModel, name: "Private model" }],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onProviderModelChange={vi.fn()}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );
    try {
      await page.getByRole("button", { name: "Model and options" }).click();
      await expect
        .element(page.getByText("Model catalog unavailable", { exact: true }))
        .toBeVisible();
      await expect.element(page.getByRole("menuitem", { name: "Refresh models" })).toBeVisible();
      await expect
        .element(page.getByRole("menuitem", { name: "Open engine settings" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("menuitemradio", { name: "Private model" }))
        .toBeVisible();
    } finally {
      await screen.unmount();
    }
  });

  it("summarizes an explicit OpenCode Agent ahead of the default Variant", async () => {
    const model = "openai/gpt-5.4" as ModelSlug;
    const screen = await render(
      <ComposerModelEffortPicker
        provider="opencode"
        model={model}
        catalogState="ready"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [{ slug: model, name: "GPT-5.4" }],
          pi: [],
        }}
        onProviderModelChange={vi.fn()}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        runtimeModel={{
          slug: model,
          name: "GPT-5.4",
          upstreamProviderId: "openai",
          upstreamProviderName: "OpenAI",
          supportedReasoningEfforts: [{ value: "medium" }, { value: "high" }],
          defaultReasoningEffort: "medium",
        }}
        runtimeAgents={[
          { name: "build", displayName: "Build" },
          { name: "plan", displayName: "Plan" },
        ]}
        modelOptions={{ agent: "plan" }}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );

    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      await expect.element(trigger).toHaveTextContent("GPT-5.4");
      await expect.element(trigger).toHaveTextContent("Plan");
      await expect.element(trigger).not.toHaveTextContent("Medium");
    } finally {
      await screen.unmount();
    }
  });

  it("includes an explicit non-default context window in the combined summary", async () => {
    const model = "claude-opus-4-6" as ModelSlug;
    const screen = await render(
      <ComposerModelEffortPicker
        provider="claudeAgent"
        model={model}
        catalogState="ready"
        modelOptionsByProvider={{
          omnimind: [],
          claudeAgent: [{ slug: model, name: "Claude Opus 4.6" }],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onProviderModelChange={vi.fn()}
        onRefreshModels={vi.fn()}
        onOpenSettings={vi.fn()}
        threadId={THREAD_ID}
        modelOptions={{ autoCompactWindow: "1m" }}
        prompt=""
        onPromptChange={vi.fn()}
      />,
    );

    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      await expect.element(trigger).toHaveTextContent("Claude Opus 4.6");
      await expect.element(trigger).toHaveTextContent("1M");
    } finally {
      await screen.unmount();
    }
  });

  it("localizes the reachable empty-state recovery path in zh-CN", async () => {
    harness.settings.localePreference = "zh-CN";
    const screen = await render(
      <I18nProvider>
        <ComposerModelEffortPicker
          provider="omnimind"
          model={null}
          catalogState="empty"
          modelOptionsByProvider={{
            omnimind: [],
            claudeAgent: [],
            codex: [],
            cursor: [],
            antigravity: [],
            grok: [],
            droid: [],
            kilo: [],
            opencode: [],
            pi: [],
          }}
          onProviderModelChange={vi.fn()}
          onRefreshModels={vi.fn()}
          onOpenSettings={vi.fn()}
          threadId={THREAD_ID}
          modelOptions={undefined}
          prompt=""
          onPromptChange={vi.fn()}
        />
      </I18nProvider>,
    );
    try {
      const trigger = page.getByRole("button", { name: "模型与选项" });
      await trigger.hover();
      await expect.element(page.getByText("模型与选项", { exact: true })).toBeVisible();
      await trigger.click();
      await expect.element(page.getByText("当前没有可用模型", { exact: true })).toBeVisible();
      await expect.element(page.getByRole("menuitem", { name: "刷新模型" })).toBeVisible();
      await expect.element(page.getByRole("menuitem", { name: "打开模型服务" })).toBeVisible();
    } finally {
      await screen.unmount();
      harness.settings.localePreference = "en";
    }
  });
});

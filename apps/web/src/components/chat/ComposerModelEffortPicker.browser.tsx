import "../../index.css";

import { type ModelSlug, ThreadId } from "@harnessos/contracts";
import { page, userEvent } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { ComposerModelEffortPicker } from "./ComposerModelEffortPicker";
import { I18nProvider } from "../../i18n";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("../../localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

const THREAD_ID = ThreadId.makeUnsafe("thread-grok-model-effort-picker");
const GROK_4_5 = "grok-4.5" as ModelSlug;
const GROK_4_6 = "grok-4.6" as ModelSlug;

describe("ComposerModelEffortPicker", () => {
  it("shows the model list directly when the current Engine has no native options", async () => {
    const firstModel = "cursor/fast" as ModelSlug;
    const secondModel = "cursor/precise" as ModelSlug;
    const onEngineModelChange = vi.fn();
    const screen = await render(
      <ComposerModelEffortPicker
        engine="cursor"
        model={firstModel}
        catalogState="ready"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
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
        onEngineModelChange={onEngineModelChange}
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
      expect(onEngineModelChange).toHaveBeenCalledWith("cursor", secondModel);
    } finally {
      await screen.unmount();
    }
  });

  it("keeps Grok 4.6 effort visible in compact layouts before runtime discovery", async () => {
    const screen = await render(
      <ComposerModelEffortPicker
        engine="grok"
        model={GROK_4_6}
        catalogState="ready"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [{ slug: GROK_4_6, name: "Grok 4.6" }],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        hideStatusLabel
        onEngineModelChange={vi.fn()}
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
      await expect.element(trigger).toHaveAttribute("title", "High");
      await expect.element(trigger).toHaveTextContent("Grok 4.6");

      await trigger.click();
      await expect.element(page.getByRole("menuitemradio", { name: "Low" })).toBeVisible();
      await expect.element(page.getByRole("menuitemradio", { name: "Medium" })).toBeVisible();
      await expect
        .element(page.getByRole("menuitemradio", { name: "High (default)" }))
        .toBeVisible();
      await expect.element(page.getByRole("menuitemradio", { name: "Extra High" })).toBeVisible();
    } finally {
      await screen.unmount();
    }
  });

  it("orders Codex effort before the Fast badge in the combined trigger", async () => {
    const model = "gpt-5.4" as ModelSlug;
    const screen = await render(
      <ComposerModelEffortPicker
        engine="codex"
        model={model}
        catalogState="ready"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
          codex: [{ slug: model, name: "GPT-5.4" }],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onEngineModelChange={vi.fn()}
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
      onEngineModelChange: vi.fn(),
      onRefreshModels: vi.fn(),
      onOpenSettings: vi.fn(),
      onPromptChange: vi.fn(),
    };
    const modelOptionsByEngine = {
      oa: [],
      claude: [],
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
        engine="oa"
        model={null}
        catalogState="empty"
        modelOptionsByEngine={modelOptionsByEngine}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      await expect.element(trigger).toHaveTextContent("No available model");
      await trigger.click();
      await expect.element(page.getByText("No available models", { exact: true })).toBeVisible();
    } finally {
      await emptyScreen.unmount();
    }

    const errorScreen = await render(
      <ComposerModelEffortPicker
        engine="oa"
        model={null}
        catalogState="error"
        modelOptionsByEngine={modelOptionsByEngine}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      await expect.element(trigger).toHaveTextContent("Model catalog unavailable");
      await expect.element(trigger).not.toHaveTextContent("No available model");
      await trigger.click();
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

  it("does not present an idle catalog as an empty catalog", async () => {
    const screen = await render(
      <ComposerModelEffortPicker
        engine="oa"
        model={null}
        catalogState="idle"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onEngineModelChange={vi.fn()}
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
      await expect.element(trigger).toHaveTextContent("Select model");
      await expect.element(trigger).not.toHaveTextContent("No available model");
    } finally {
      await screen.unmount();
    }
  });

  it("keeps cold discovery and stale last-good catalogs distinct", async () => {
    const callbacks = {
      onEngineModelChange: vi.fn(),
      onRefreshModels: vi.fn(),
      onOpenSettings: vi.fn(),
      onPromptChange: vi.fn(),
    };
    const emptyOptions = {
      oa: [],
      claude: [],
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
        engine="oa"
        model={null}
        catalogState="checking"
        modelOptionsByEngine={emptyOptions}
        {...callbacks}
        threadId={THREAD_ID}
        modelOptions={undefined}
        prompt=""
      />,
    );
    try {
      const trigger = page.getByRole("button", { name: "Model and options" });
      await expect.element(trigger).toHaveTextContent("Checking models");
      await expect.element(trigger).not.toHaveTextContent("No available model");
      await trigger.click();
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
        engine="grok"
        model={GROK_4_5}
        catalogState="stale"
        modelOptionsByEngine={{
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
        engine="opencode"
        model={null}
        catalogState="idle"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onEngineModelChange={vi.fn()}
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
        engine="antigravity"
        model={customModel}
        catalogState="error"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
          codex: [],
          cursor: [],
          antigravity: [{ slug: customModel, name: "Private model" }],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onEngineModelChange={vi.fn()}
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
        engine="opencode"
        model={model}
        catalogState="ready"
        modelOptionsByEngine={{
          oa: [],
          claude: [],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [{ slug: model, name: "GPT-5.4" }],
          pi: [],
        }}
        onEngineModelChange={vi.fn()}
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
        engine="claude"
        model={model}
        catalogState="ready"
        modelOptionsByEngine={{
          oa: [],
          claude: [{ slug: model, name: "Claude Opus 4.6" }],
          codex: [],
          cursor: [],
          antigravity: [],
          grok: [],
          droid: [],
          kilo: [],
          opencode: [],
          pi: [],
        }}
        onEngineModelChange={vi.fn()}
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
          engine="oa"
          model={null}
          catalogState="empty"
          modelOptionsByEngine={{
            oa: [],
            claude: [],
            codex: [],
            cursor: [],
            antigravity: [],
            grok: [],
            droid: [],
            kilo: [],
            opencode: [],
            pi: [],
          }}
          onEngineModelChange={vi.fn()}
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

  it("labels a cold catalog check accurately in zh-CN", async () => {
    harness.settings.localePreference = "zh-CN";
    const screen = await render(
      <I18nProvider>
        <ComposerModelEffortPicker
          engine="oa"
          model={null}
          catalogState="checking"
          modelOptionsByEngine={{
            oa: [],
            claude: [],
            codex: [],
            cursor: [],
            antigravity: [],
            grok: [],
            droid: [],
            kilo: [],
            opencode: [],
            pi: [],
          }}
          onEngineModelChange={vi.fn()}
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
      await expect.element(trigger).toHaveTextContent("正在检查模型");
      await expect.element(trigger).not.toHaveTextContent("没有可用模型");
    } finally {
      await screen.unmount();
      harness.settings.localePreference = "en";
    }
  });
});

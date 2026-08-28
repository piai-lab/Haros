import "../../index.css";

import { type ModelSlug, type EngineKind, type ServerEngineStatus } from "@harnessos/contracts";
import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { EngineModelPicker } from "./EngineModelPicker";
import type { EngineModelCatalogState } from "../../hooks/useEngineModelCatalog";
import type { EngineModelOption } from "../../engineModelOptions";
import { FAVORITE_MODEL_STORAGE_KEYS } from "../../lib/modelFavorites";
import { I18nProvider } from "../../i18n";

const i18nHarness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("../../localPreferences", () => ({
  useLocalPreferences: () => ({ preferences: i18nHarness.settings }),
}));

const MODEL_OPTIONS_BY_PROVIDER = {
  oa: [],
  claude: [
    { slug: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { slug: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { slug: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
  ],
  codex: [
    { slug: "gpt-5-codex", name: "GPT-5 Codex" },
    { slug: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
  ],
  cursor: [
    { slug: "auto", name: "Auto" },
    { slug: "composer-2", name: "Composer 2" },
  ],
  grok: [
    { slug: "grok-build-0.1", name: "Grok Build 0.1" },
    { slug: "grok-build", name: "Grok 4.3" },
  ],
  droid: [
    {
      slug: "gpt-5.6-luna",
      name: "GPT-5.6 Luna",
      description: "0.4x Factory token rate",
    },
    { slug: "custom:GPT-5.6-Luna-0", name: "Custom GPT-5.6 Luna" },
  ],
  kilo: [
    {
      slug: "kilo/kilo-auto/free",
      name: "Kilo Auto Free",
      upstreamProviderId: "kilo",
      upstreamProviderName: "Kilo",
    },
  ],
  opencode: [
    {
      slug: "opencode/nemotron-3-super-free",
      name: "Nemotron 3 Super Free",
      upstreamProviderId: "opencode",
      upstreamProviderName: "OpenCode",
    },
    {
      slug: "openai/gpt-5",
      name: "GPT-5",
      upstreamProviderId: "openai",
      upstreamProviderName: "OpenAI",
    },
  ],
  pi: [
    {
      slug: "anthropic/claude-sonnet-4-5",
      name: "Claude Sonnet 4.5",
      upstreamProviderId: "anthropic",
      upstreamProviderName: "Anthropic",
    },
  ],
  antigravity: [
    {
      slug: "Gemini 3.5 Flash",
      name: "Gemini 3.5 Flash",
    },
  ],
} as const satisfies Record<EngineKind, ReadonlyArray<EngineModelOption & { slug: ModelSlug }>>;

const MANY_OPENCODE_MODELS = Array.from({ length: 16 }, (_, index) => ({
  slug: `${index % 2 === 0 ? "openai" : "anthropic"}/model-${index + 1}` as ModelSlug,
  name: `${index % 2 === 0 ? "GPT" : "Claude"} ${index + 1}`,
  upstreamProviderId: index % 2 === 0 ? "openai" : "anthropic",
  upstreamProviderName: index % 2 === 0 ? "OpenAI" : "Anthropic",
})) satisfies ReadonlyArray<EngineModelOption & { slug: ModelSlug }>;

const OPENCODE_FAVORITE_SORT_MODELS = [
  {
    slug: "anthropic/claude-favorite-sort" as ModelSlug,
    name: "Claude Favorite Sort",
    upstreamProviderId: "anthropic",
    upstreamProviderName: "Anthropic",
  },
  {
    slug: "openai/gpt-favorite-sort" as ModelSlug,
    name: "GPT Favorite Sort",
    upstreamProviderId: "openai",
    upstreamProviderName: "OpenAI",
  },
] satisfies ReadonlyArray<EngineModelOption & { slug: ModelSlug }>;

const OPENCODE_DUPLICATE_NAME_MODELS = [
  {
    slug: "deepseek/deepseek-v4-flash" as ModelSlug,
    name: "DeepSeek V4 Flash",
    upstreamProviderId: "deepseek",
    upstreamProviderName: "DeepSeek",
  },
  {
    slug: "opencode-go/deepseek-v4-flash" as ModelSlug,
    name: "DeepSeek V4 Flash",
    upstreamProviderId: "opencode-go",
    upstreamProviderName: "OpenCode Go",
  },
] satisfies ReadonlyArray<EngineModelOption & { slug: ModelSlug }>;

const MANY_CURSOR_MODELS = Array.from({ length: 16 }, (_, index) => ({
  slug: `cursor-model-${index + 1}` as ModelSlug,
  name: `${index % 2 === 0 ? "GPT" : "Claude"} Cursor ${index + 1}`,
  upstreamProviderId: index % 2 === 0 ? "openai" : "anthropic",
  upstreamProviderName: index % 2 === 0 ? "OpenAI" : "Anthropic",
})) satisfies ReadonlyArray<EngineModelOption & { slug: ModelSlug }>;

const CURSOR_FAVORITE_SORT_MODELS = [
  {
    slug: "cursor-claude-favorite-sort" as ModelSlug,
    name: "Claude Cursor Favorite Sort",
    upstreamProviderId: "anthropic",
    upstreamProviderName: "Anthropic",
  },
  {
    slug: "cursor-gpt-favorite-sort" as ModelSlug,
    name: "GPT Cursor Favorite Sort",
    upstreamProviderId: "openai",
    upstreamProviderName: "OpenAI",
  },
] satisfies ReadonlyArray<EngineModelOption & { slug: ModelSlug }>;

const LONG_MODEL_NAME =
  "Private deployment with a deliberately very long shared prefix and a final disambiguating suffix";

const PI_FAVORITE_SORT_MODELS = [
  {
    slug: "anthropic/claude-pi-favorite-sort" as ModelSlug,
    name: "Claude Pi Favorite Sort",
    upstreamProviderId: "anthropic",
    upstreamProviderName: "Anthropic",
  },
  {
    slug: "openai/gpt-pi-favorite-sort" as ModelSlug,
    name: "GPT Pi Favorite Sort",
    upstreamProviderId: "openai",
    upstreamProviderName: "OpenAI",
  },
] satisfies ReadonlyArray<EngineModelOption & { slug: ModelSlug }>;

async function mountPicker(props: {
  engine: EngineKind;
  model: ModelSlug;
  lockedEngine: EngineKind | null;
  engines?: ReadonlyArray<ServerEngineStatus>;
  loadingEngineModels?: Partial<Record<EngineKind, boolean>>;
  catalogStateByEngine?: Partial<Record<EngineKind, EngineModelCatalogState>>;
  onSelectionCommitted?: () => void;
  onEngineBrowse?: (engine: EngineKind) => void;
  modelOptionsByEngine?: Record<EngineKind, ReadonlyArray<EngineModelOption & { slug: ModelSlug }>>;
  locale?: "en" | "zh-CN";
}) {
  i18nHarness.settings.localePreference = props.locale ?? "en";
  const host = document.createElement("div");
  document.body.append(host);
  const onEngineModelChange = vi.fn();
  const screen = await render(
    <I18nProvider>
      <EngineModelPicker
        engine={props.engine}
        model={props.model}
        lockedEngine={props.lockedEngine}
        modelOptionsByEngine={props.modelOptionsByEngine ?? MODEL_OPTIONS_BY_PROVIDER}
        {...(props.loadingEngineModels ? { loadingEngineModels: props.loadingEngineModels } : {})}
        {...(props.catalogStateByEngine
          ? { catalogStateByEngine: props.catalogStateByEngine }
          : {})}
        {...(props.engines ? { engines: props.engines } : {})}
        {...(props.onSelectionCommitted
          ? { onSelectionCommitted: props.onSelectionCommitted }
          : {})}
        {...(props.onEngineBrowse ? { onEngineBrowse: props.onEngineBrowse } : {})}
        onEngineModelChange={onEngineModelChange}
      />
    </I18nProvider>,
    { container: host },
  );

  return {
    onEngineModelChange,
    cleanup: async () => {
      await screen.unmount();
      host.remove();
    },
  };
}

describe("EngineModelPicker", () => {
  it.todo(
    "uses the same Engine to Model to native-options control structure for empty and started threads",
  );
  it.todo("changes only the desired next-turn Engine before send admission");
  it.todo("fails closed when the target Engine has no authoritative selectable model");

  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    i18nHarness.settings.localePreference = "en";
  });

  it("does not present a loading catalog as an empty catalog", async () => {
    const mounted = await mountPicker({
      engine: "oa",
      model: "" as ModelSlug,
      lockedEngine: "oa",
      catalogStateByEngine: { oa: "checking" },
    });

    try {
      const trigger = page.getByRole("button");
      await expect.element(trigger).toHaveTextContent("Checking models");
      await expect.element(trigger).not.toHaveTextContent("No available model");
    } finally {
      await mounted.cleanup();
    }
  });

  it.each([
    ["ready", "Select model"],
    ["empty", "No available model"],
    ["error", "Model catalog unavailable"],
  ] as const)(
    "labels a settled %s catalog accurately without a selection",
    async (state, label) => {
      const mounted = await mountPicker({
        engine: "oa",
        model: "" as ModelSlug,
        lockedEngine: "oa",
        catalogStateByEngine: { oa: state },
      });

      try {
        await expect.element(page.getByRole("button")).toHaveTextContent(label);
      } finally {
        await mounted.cleanup();
      }
    },
  );

  it("shows engine submenus when engine switching is allowed", async () => {
    const mounted = await mountPicker({
      engine: "claude",
      model: "claude-opus-4-6",
      lockedEngine: null,
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text).toContain("Codex");
        expect(text).toContain("Claude");
        expect(text).not.toContain("Claude Sonnet 4.6");
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("reports explicit engine browse without treating the root picker as Pi intent", async () => {
    const onEngineBrowse = vi.fn();
    const mounted = await mountPicker({
      engine: "claude",
      model: "claude-opus-4-6",
      lockedEngine: null,
      onEngineBrowse,
      engines: [
        {
          engine: "pi",
          status: "ready",
          available: true,
          authStatus: "authenticated",
          checkedAt: "2026-08-10T00:00:00.000Z",
        },
      ],
    });

    try {
      await page.getByRole("button").click();
      expect(onEngineBrowse).not.toHaveBeenCalledWith("pi");

      await page.getByRole("menuitem", { name: "Pi" }).click();
      await vi.waitFor(() => {
        expect(onEngineBrowse).toHaveBeenCalledWith("pi");
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows models directly when the engine is locked mid-thread", async () => {
    const mounted = await mountPicker({
      engine: "claude",
      model: "claude-opus-4-6",
      lockedEngine: "claude",
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text).toContain("Claude Sonnet 4.6");
        expect(text).toContain("Claude Haiku 4.5");
        expect(text).not.toContain("Codex");
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("dispatches the canonical slug when a model is selected", async () => {
    const mounted = await mountPicker({
      engine: "claude",
      model: "claude-opus-4-6",
      lockedEngine: "claude",
    });

    try {
      await page.getByRole("button").click();
      await page.getByRole("menuitemradio", { name: "Claude Sonnet 4.6" }).click();

      expect(mounted.onEngineModelChange).toHaveBeenCalledWith("claude", "claude-sonnet-4-6");
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps a long model label truncated without losing its full name or selected check", async () => {
    const mounted = await mountPicker({
      engine: "antigravity",
      model: "private-long-model",
      lockedEngine: "antigravity",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        antigravity: [{ slug: "private-long-model", name: LONG_MODEL_NAME }],
      },
    });

    try {
      await page.getByRole("button").click();
      const row = page.getByRole("menuitemradio", { name: LONG_MODEL_NAME });
      await expect.element(row).toHaveAttribute("aria-checked", "true");
      const element = row.element() as HTMLElement;
      expect(element.getAttribute("title")).toBe(LONG_MODEL_NAME);
      expect(element.querySelector(".truncate")).not.toBeNull();
      expect(element.querySelector("svg")).not.toBeNull();
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps long grouped model copy inside a 480px viewport", async () => {
    await page.viewport(480, 620);
    i18nHarness.settings.localePreference = "zh-CN";
    const mounted = await mountPicker({
      engine: "opencode",
      model: MANY_OPENCODE_MODELS[0]!.slug,
      lockedEngine: "opencode",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        opencode: MANY_OPENCODE_MODELS.map((model, index) => ({
          ...model,
          name: `${LONG_MODEL_NAME} ${index + 1}`,
        })),
      },
      locale: "zh-CN",
    });

    try {
      await page.getByRole("button").click();
      const popup = document.querySelector<HTMLElement>(".composer-picker-menu-fixed");
      expect(popup).not.toBeNull();
      const rect = popup!.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(-1);
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth + 1);
      expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
    } finally {
      await mounted.cleanup();
      await page.viewport(1280, 720);
    }
  });

  it("shows live Droid cost multipliers without adding one to BYOK models", async () => {
    const mounted = await mountPicker({
      engine: "droid",
      model: "gpt-5.6-luna",
      lockedEngine: "droid",
    });

    try {
      await page.getByRole("button").click();

      const rows = Array.from(document.querySelectorAll('[role="menuitemradio"]'));
      const pricedRow = rows.find((row) => row.textContent?.includes("GPT-5.6 Luna"));
      const byokRow = rows.find((row) => row.textContent?.includes("Custom GPT-5.6 Luna"));

      expect(pricedRow?.textContent).toContain("0.4×");
      expect(pricedRow?.querySelector('[title="0.4x Factory token rate"]')).not.toBeNull();
      expect(byokRow?.textContent).not.toContain("×");
      await expect
        .element(
          page.getByRole("menuitemradio", {
            name: "GPT-5.6 Luna 0.4x Factory token rate",
          }),
        )
        .toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("notifies after a model selection commits so the composer can refocus", async () => {
    const onSelectionCommitted = vi.fn();
    const mounted = await mountPicker({
      engine: "grok",
      model: "grok-build",
      lockedEngine: "grok",
      onSelectionCommitted,
    });

    try {
      await page.getByRole("button").click();
      await page.getByRole("menuitemradio", { name: "Grok 4.3" }).click();

      await vi.waitFor(() => {
        expect(onSelectionCommitted).toHaveBeenCalledTimes(1);
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("groups upstream OpenCode models by engine label", async () => {
    const mounted = await mountPicker({
      engine: "opencode",
      model: "openai/gpt-5",
      lockedEngine: "opencode",
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text).toContain("OpenCode");
        expect(text).toContain("Nemotron 3 Super Free");
        expect(text).toContain("OpenAI");
        expect(text).toContain("GPT-5");
      });
      expect(document.querySelector('[data-model-service-icon="brand"]')).not.toBeNull();
      for (const modelName of ["Nemotron 3 Super Free", "GPT-5"]) {
        expect(
          page
            .getByRole("menuitemradio", { name: modelName })
            .element()
            .querySelector('[data-model-service-icon="brand"]'),
        ).not.toBeNull();
      }
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows OpenCode search when the engine has at least fifteen models", async () => {
    const mounted = await mountPicker({
      engine: "opencode",
      model: MANY_OPENCODE_MODELS[0]!.slug,
      lockedEngine: "opencode",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        opencode: MANY_OPENCODE_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();

      await expect.element(page.getByPlaceholder("Search models or engines")).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("filters OpenCode models by upstream engine name", async () => {
    const mounted = await mountPicker({
      engine: "opencode",
      model: MANY_OPENCODE_MODELS[0]!.slug,
      lockedEngine: "opencode",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        opencode: MANY_OPENCODE_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();
      await page.getByPlaceholder("Search models or engines").fill("Anthropic");

      await vi.waitFor(() => {
        expect(document.body.textContent ?? "").toContain("Claude 2");
      });

      await expect
        .element(page.getByRole("menuitemradio", { name: "Claude 2" }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("menuitemradio", { name: "GPT 1" }))
        .not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows favourited OpenCode models in their own top category", async () => {
    const mounted = await mountPicker({
      engine: "opencode",
      model: "anthropic/claude-favorite-sort",
      lockedEngine: "opencode",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        opencode: OPENCODE_FAVORITE_SORT_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.indexOf("Anthropic")).toBeLessThan(text.indexOf("OpenAI"));
      });

      await page.getByRole("button", { name: "Add GPT Favorite Sort to favourites" }).click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.indexOf("Favourites")).toBeLessThan(text.indexOf("Anthropic"));
        expect(text.indexOf("GPT Favorite Sort")).toBeGreaterThan(text.indexOf("Favourites"));
        expect(text.indexOf("GPT Favorite Sort")).toBeLessThan(text.indexOf("Anthropic"));
      });
      await expect
        .element(page.getByRole("menuitemradio", { name: "GPT Favorite Sort — OpenAI" }))
        .toBeInTheDocument();
      expect(
        Array.from(document.querySelectorAll('[role="menuitemradio"]')).filter((element) =>
          element.textContent?.includes("GPT Favorite Sort"),
        ),
      ).toHaveLength(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("distinguishes same-name favourite models by their upstream engine", async () => {
    localStorage.setItem(
      FAVORITE_MODEL_STORAGE_KEYS.opencode,
      JSON.stringify(OPENCODE_DUPLICATE_NAME_MODELS.map((model) => model.slug)),
    );
    const mounted = await mountPicker({
      engine: "opencode",
      model: OPENCODE_DUPLICATE_NAME_MODELS[0]!.slug,
      lockedEngine: "opencode",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        opencode: OPENCODE_DUPLICATE_NAME_MODELS,
      },
    });

    try {
      const activeModelIcon = document.querySelector<HTMLElement>(
        'button [data-model-service-icon-level="model"]',
      );
      expect(
        (
          activeModelIcon?.getAttribute("src") ??
          activeModelIcon?.style.maskImage ??
          ""
        ).toLowerCase(),
      ).toContain("deepseek");

      await page.getByRole("button").click();

      await expect
        .element(page.getByRole("menuitemradio", { name: "DeepSeek V4 Flash — DeepSeek" }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("menuitemradio", { name: "DeepSeek V4 Flash — OpenCode Go" }))
        .toBeInTheDocument();
      await expect
        .element(
          page.getByRole("button", {
            name: "Remove DeepSeek V4 Flash — DeepSeek from favourites",
          }),
        )
        .toBeInTheDocument();
      await expect
        .element(
          page.getByRole("button", {
            name: "Remove DeepSeek V4 Flash — OpenCode Go from favourites",
          }),
        )
        .toBeInTheDocument();
      expect(
        Array.from(document.querySelectorAll('[role="menuitemradio"]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(["DeepSeek V4 FlashDeepSeek", "DeepSeek V4 FlashOpenCode Go"]);
      const modelIcons = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="menuitemradio"] [data-model-service-icon-level="model"]',
        ),
      );
      expect(modelIcons).toHaveLength(2);
      expect(
        modelIcons.every((element) =>
          (element.getAttribute("src") ?? element.style.maskImage)
            .toLowerCase()
            .includes("deepseek"),
        ),
      ).toBe(true);
    } finally {
      await mounted.cleanup();
    }
  });

  it("filters Cursor models by upstream engine name", async () => {
    const mounted = await mountPicker({
      engine: "cursor",
      model: MANY_CURSOR_MODELS[0]!.slug,
      lockedEngine: "cursor",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        cursor: MANY_CURSOR_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();
      await page.getByPlaceholder("Search models or engines").fill("Anthropic");

      await vi.waitFor(() => {
        expect(document.body.textContent ?? "").toContain("Claude Cursor 2");
      });

      await expect
        .element(page.getByRole("menuitemradio", { name: "Claude Cursor 2" }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("menuitemradio", { name: "GPT Cursor 1" }))
        .not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows favourited Cursor models in their own top category", async () => {
    const mounted = await mountPicker({
      engine: "cursor",
      model: "cursor-claude-favorite-sort",
      lockedEngine: "cursor",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        cursor: CURSOR_FAVORITE_SORT_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.indexOf("Anthropic")).toBeLessThan(text.indexOf("OpenAI"));
      });

      await page
        .getByRole("button", { name: "Add GPT Cursor Favorite Sort to favourites" })
        .click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.indexOf("Favourites")).toBeLessThan(text.indexOf("Anthropic"));
        expect(text.indexOf("GPT Cursor Favorite Sort")).toBeGreaterThan(
          text.indexOf("Favourites"),
        );
        expect(text.indexOf("GPT Cursor Favorite Sort")).toBeLessThan(text.indexOf("Anthropic"));
      });
      await expect
        .element(page.getByRole("menuitemradio", { name: "GPT Cursor Favorite Sort — OpenAI" }))
        .toBeInTheDocument();
      expect(
        Array.from(document.querySelectorAll('[role="menuitemradio"]')).filter((element) =>
          element.textContent?.includes("GPT Cursor Favorite Sort"),
        ),
      ).toHaveLength(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows favourited Pi models in their own top category", async () => {
    const mounted = await mountPicker({
      engine: "pi",
      model: "anthropic/claude-pi-favorite-sort",
      lockedEngine: "pi",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        pi: PI_FAVORITE_SORT_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.indexOf("Anthropic")).toBeLessThan(text.indexOf("OpenAI"));
      });

      await page.getByRole("button", { name: "Add GPT Pi Favorite Sort to favourites" }).click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.indexOf("Favourites")).toBeLessThan(text.indexOf("Anthropic"));
        expect(text.indexOf("GPT Pi Favorite Sort")).toBeGreaterThan(text.indexOf("Favourites"));
        expect(text.indexOf("GPT Pi Favorite Sort")).toBeLessThan(text.indexOf("Anthropic"));
      });
      await expect
        .element(page.getByRole("menuitemradio", { name: "GPT Pi Favorite Sort — OpenAI" }))
        .toBeInTheDocument();
      expect(
        Array.from(document.querySelectorAll('[role="menuitemradio"]')).filter((element) =>
          element.textContent?.includes("GPT Pi Favorite Sort"),
        ),
      ).toHaveLength(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it("localizes favorite grouping and favorite actions in zh-CN", async () => {
    localStorage.setItem(
      FAVORITE_MODEL_STORAGE_KEYS.opencode,
      JSON.stringify([OPENCODE_FAVORITE_SORT_MODELS[0]!.slug]),
    );
    const mounted = await mountPicker({
      engine: "opencode",
      model: OPENCODE_FAVORITE_SORT_MODELS[0]!.slug,
      lockedEngine: "opencode",
      locale: "zh-CN",
      modelOptionsByEngine: {
        ...MODEL_OPTIONS_BY_PROVIDER,
        opencode: OPENCODE_FAVORITE_SORT_MODELS,
      },
    });

    try {
      await page.getByRole("button").click();
      await expect.element(page.getByText("收藏", { exact: true })).toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "取消收藏 Claude Favorite Sort — Anthropic" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "收藏 GPT Favorite Sort" }))
        .toBeVisible();
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows a loading skeleton instead of fallback models for loading engines", async () => {
    const mounted = await mountPicker({
      engine: "cursor",
      model: "auto",
      lockedEngine: "cursor",
      loadingEngineModels: { cursor: true },
    });

    try {
      await page.getByRole("button").click();

      await expect.element(page.getByLabelText("Loading models")).toBeInTheDocument();
      await expect
        .element(page.getByRole("menuitemradio", { name: "Auto" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("menuitemradio", { name: "Composer 2" }))
        .not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows sign-in state while keeping the desired Engine reachable", async () => {
    const mounted = await mountPicker({
      engine: "codex",
      model: "gpt-5-codex",
      lockedEngine: null,
      engines: [
        {
          engine: "codex",
          status: "ready",
          available: true,
          authStatus: "authenticated",
          checkedAt: "2026-04-10T10:00:00.000Z",
        },
        {
          engine: "claude",
          status: "error",
          available: false,
          authStatus: "unauthenticated",
          checkedAt: "2026-04-10T10:00:00.000Z",
        },
      ],
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text).toContain("Codex");
        expect(text).toContain("Claude");
        expect(text).toContain("Sign in");
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("shows checking state while keeping the desired Engine reachable", async () => {
    const mounted = await mountPicker({
      engine: "codex",
      model: "gpt-5-codex",
      lockedEngine: null,
      engines: [
        {
          engine: "codex",
          status: "ready",
          available: true,
          authStatus: "authenticated",
          checkedAt: "2026-04-10T10:00:00.000Z",
        },
      ],
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text).toContain("Claude");
        expect(text).toContain("Checking");
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps warning engines selectable when they are still available", async () => {
    const mounted = await mountPicker({
      engine: "codex",
      model: "gpt-5-codex",
      lockedEngine: null,
      engines: [
        {
          engine: "codex",
          status: "ready",
          available: true,
          authStatus: "authenticated",
          checkedAt: "2026-04-10T10:00:00.000Z",
        },
        {
          engine: "claude",
          status: "warning",
          available: true,
          authStatus: "unknown",
          checkedAt: "2026-04-10T10:00:00.000Z",
          message: "Could not verify auth status.",
        },
      ],
    });

    try {
      await page.getByRole("button").click();

      await vi.waitFor(() => {
        expect(document.body.textContent ?? "").toContain("Claude");
      });

      await expect.element(page.getByText("Sign in")).not.toBeInTheDocument();
      await expect.element(page.getByText("Unavailable")).not.toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });
});

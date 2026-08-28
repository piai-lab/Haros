import { afterAll, beforeAll, expect, test } from "bun:test";
import { chromium, type Browser } from "playwright";
import { expect as playwrightExpect } from "playwright/test";

import {
  startCuratorServer,
  type CuratorProviderPersistenceResult,
} from "../../../packages/oa-web-access/curator-server";

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
});

const availability = Object.fromEntries(
  [
    "all",
    "openai",
    "brave",
    "parallel",
    "parallel-mcp",
    "tinyfish",
    "search1api",
    "searchinfinity",
    "querit",
    "tavily",
    "firecrawl",
    "jina",
    "serpdive",
    "kagi",
    "bocha",
    "ollama",
    "searxng",
    "duckduckgo",
    "perplexity",
    "exa",
    "gemini",
    "anysearch",
    "xai",
    "brightdata",
    "serpbase",
    "serper",
    "valyu",
  ].map((id) => [id, id === "all" || id === "exa" || id === "tavily"]),
) as Parameters<typeof startCuratorServer>[0]["availableProviders"];

async function waitForText(page: Awaited<ReturnType<Browser["newPage"]>>, pattern: RegExp) {
  await playwrightExpect(page.locator(".hero-desc")).toHaveText(pattern);
}

async function runSwitch(input: {
  queries: string[];
  persistence: CuratorProviderPersistenceResult;
  failQueries?: ReadonlySet<string>;
}) {
  let searchCount = 0;
  const handle = await startCuratorServer(
    {
      mode: "review",
      queries: input.queries,
      sessionToken: `provider-truth-${crypto.randomUUID()}`,
      timeout: 30,
      availableProviders: availability,
      defaultProvider: "exa",
      searchProvider: "auto",
      summaryModels: [],
      defaultSummaryModel: null,
      presentation: { locale: "zh-CN", theme: "light" },
    },
    {
      onSubmit() {},
      onCancel() {},
      async onProviderChange() {
        return input.persistence;
      },
      async onAddSearch(query, provider) {
        searchCount += 1;
        if (input.failQueries?.has(query)) throw new Error("synthetic search failure");
        return [
          {
            answer: `answer for ${query}`,
            results: [{ title: "Result", url: "https://example.com", domain: "example.com" }],
            provider: provider ?? "tavily",
          },
        ];
      },
      onAddSearchResults() {},
      async onSummarize() {
        throw new Error("not used");
      },
      async onRewriteQuery(query) {
        return query;
      },
    },
  );
  const page = await browser.newPage();
  try {
    await page.goto(handle.url);
    await page.locator('.provider-btn[data-provider="tavily"]').click();
    return { page, searchCount: () => searchCount, close: () => handle.close() };
  } catch (error) {
    await page.close();
    handle.close();
    throw error;
  }
}

test("Curator Provider switch tells the truth for persistence and search outcomes", async () => {
  const cases = [
    {
      input: { queries: ["one"], persistence: { state: "saved" } as const },
      expected: /已将 Tavily 设为默认，并重新搜索当前结果/,
    },
    {
      input: {
        queries: ["one"],
        persistence: { state: "conflict", reason: "revision-conflict" } as const,
      },
      expected: /已用 Tavily 重新搜索，但默认服务未保存/,
      recovery: /配置文件已发生变化/,
    },
    {
      input: {
        queries: ["one"],
        persistence: { state: "failed", reason: "write-failed" } as const,
      },
      expected: /已用 Tavily 重新搜索，但默认服务未保存/,
      recovery: /无法保存默认服务/,
    },
    {
      input: {
        queries: ["one"],
        persistence: { state: "saved" } as const,
        failQueries: new Set(["one"]),
      },
      expected: /已将 Tavily 设为默认，但重新搜索未完成/,
      failedCount: 1,
    },
    {
      input: {
        queries: ["one", "two", "three"],
        persistence: { state: "saved" } as const,
        failQueries: new Set(["two", "three"]),
      },
      expected: /已将 Tavily 设为默认；部分搜索已完成，但仍有搜索失败/,
      failedCount: 2,
    },
  ];

  for (const item of cases) {
    const result = await runSwitch(item.input);
    try {
      await waitForText(result.page, item.expected);
      if (item.recovery) {
        await playwrightExpect(result.page.locator("#error-banner")).toHaveText(item.recovery);
      }
      if (item.failedCount) {
        await playwrightExpect(result.page.locator(".result-card.error")).toHaveCount(
          item.failedCount,
        );
      }
      expect(result.searchCount()).toBe(item.input.queries.length);
    } finally {
      await result.page.close();
      result.close();
    }
  }
}, 30_000);

test("Curator Provider switch without queries only reports persistence", async () => {
  for (const item of [
    {
      persistence: { state: "saved" } as const,
      expected: /已将 Tavily 设为默认服务/,
    },
    {
      persistence: { state: "conflict", reason: "revision-conflict" } as const,
      expected: /未能将默认服务更改为 Tavily/,
    },
  ]) {
    const result = await runSwitch({ queries: [], persistence: item.persistence });
    try {
      await waitForText(result.page, item.expected);
      expect(await result.page.locator(".hero-desc").textContent()).not.toContain("重新搜索");
      expect(result.searchCount()).toBe(0);
    } finally {
      await result.page.close();
      result.close();
    }
  }
}, 10_000);

async function openInteractivePage(mode: "observer" | "review") {
  const handle = await startCuratorServer(
    {
      mode,
      queries: ["keyboard result"],
      sessionToken: `${mode}-${crypto.randomUUID()}`,
      timeout: 30,
      availableProviders: availability,
      defaultProvider: "exa",
      searchProvider: "auto",
      summaryModels: [{ value: "synthetic", label: "Synthetic", provider: "test" }],
      defaultSummaryModel: "synthetic",
      presentation: { locale: "en", theme: "light" },
    },
    {
      onSubmit() {},
      onCancel() {},
      async onProviderChange() {
        return { state: "saved" };
      },
      async onAddSearch() {
        return [];
      },
      onAddSearchResults() {},
      async onSummarize() {
        return {
          summary: "Synthetic summary",
          meta: {
            model: "synthetic",
            durationMs: 1,
            tokenEstimate: 2,
            fallbackUsed: false,
            edited: false,
          },
        };
      },
      async onRewriteQuery(query) {
        return query;
      },
    },
  );
  const page = await browser.newPage({ viewport: { width: 360, height: 700 } });
  await page.goto(handle.url);
  handle.pushResult(0, {
    answer: "A complete result body",
    results: [{ title: "Source", url: "https://example.com/source", domain: "example.com" }],
    provider: "exa",
  });
  handle.searchesDone();
  await playwrightExpect(page.locator(".result-card")).toHaveCount(1);
  return { handle, page };
}

test("observer and review results expose keyboard expansion without horizontal overflow", async () => {
  for (const mode of ["observer", "review"] as const) {
    const { handle, page } = await openInteractivePage(mode);
    try {
      const expand = page.getByRole("button", { name: "Collapse search result" });
      await playwrightExpect(expand).toHaveAttribute("aria-expanded", "true");
      await expand.focus();
      await page.keyboard.press("Enter");
      await playwrightExpect(
        page.getByRole("button", { name: "Expand search result" }),
      ).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Space");
      await playwrightExpect(
        page.getByRole("button", { name: "Collapse search result" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);

      const consequence = page.locator(".provider-switch-consequence");
      if (mode === "review") {
        await playwrightExpect(consequence).toContainText("sets the new default");
      } else {
        await playwrightExpect(consequence).toBeHidden();
      }
    } finally {
      await page.close();
      handle.close();
    }
  }
}, 20_000);

test("summary inspector removes background settlement controls from focus and accessibility", async () => {
  const { handle, page } = await openInteractivePage("review");
  try {
    await playwrightExpect(page.locator("#summary-input")).toHaveValue("Synthetic summary");
    await playwrightExpect(page.locator("#summary-heading")).toBeFocused();
    expect(
      await page
        .locator("#summary-panel")
        .evaluate((panel) => panel.contains(document.activeElement)),
    ).toBe(true);
    const actionBar = page.locator(".action-bar");
    await playwrightExpect(actionBar).toBeHidden();
    await playwrightExpect(actionBar).toHaveAttribute("aria-hidden", "true");
    expect(
      await actionBar.evaluate((element) => (element as HTMLElement & { inert: boolean }).inert),
    ).toBe(true);
    await playwrightExpect(page.locator("#btn-send")).not.toBeFocused();

    await page.locator("#btn-summary-back").click();
    await playwrightExpect(actionBar).toBeVisible();
    expect(
      await actionBar.evaluate((element) => (element as HTMLElement & { inert: boolean }).inert),
    ).toBe(false);
    await playwrightExpect(actionBar).not.toHaveAttribute("aria-hidden", "true");
    await playwrightExpect(page.locator("#btn-send")).toBeFocused();
    expect(
      await page.evaluate(
        () =>
          document.activeElement !== document.body &&
          !(document.activeElement as HTMLElement).hidden,
      ),
    ).toBe(true);
  } finally {
    await page.close();
    handle.close();
  }
}, 20_000);

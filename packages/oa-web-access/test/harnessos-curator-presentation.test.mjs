import assert from "node:assert/strict";
import test from "node:test";

import { generateCuratorPage } from "../curator-page.ts";
import { startCuratorServer } from "../curator-server.ts";

const providerIds = [
  "broad",
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
];

function availability() {
  return Object.fromEntries(providerIds.map((id) => [id, id === "all" || id === "exa"]));
}

function page(presentation) {
  return generateCuratorPage(
    ["HarnessOS Agent web access"],
    "opaque-test-token",
    20,
    availability(),
    "exa",
    "auto",
    [],
    null,
    presentation,
  );
}

function inlineScript(html) {
  const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const script = matches.map((match) => match[1]).findLast((value) => value.trim().length > 0);
  assert.ok(script);
  return script;
}

const warmLightThemeSnapshot = {
  accent: "rgb(133, 77, 14)",
  border: "rgba(46, 35, 21, 0.12)",
  borderStrong: "rgba(46, 35, 21, 0.22)",
  danger: "rgb(180, 45, 38)",
  elevatedSurface: "rgb(255, 247, 232)",
  hoverSurface: "rgba(46, 35, 21, 0.06)",
  primaryBackground: "rgb(46, 35, 21)",
  primaryBackgroundHover: "rgb(65, 49, 29)",
  primaryText: "rgb(255, 251, 244)",
  secondaryBackground: "rgba(46, 35, 21, 0.07)",
  secondaryBackgroundHover: "rgba(46, 35, 21, 0.11)",
  success: "rgb(38, 132, 76)",
  surface: "rgb(255, 251, 244)",
  surfaceUnder: "rgb(250, 242, 226)",
  text: "rgb(46, 35, 21)",
  textDim: "rgb(135, 119, 98)",
  textMuted: "rgb(100, 83, 61)",
  warning: "rgb(180, 105, 16)",
};

test("Curator freezes HarnessOS locale/theme and ships executable self-contained bilingual UI", () => {
  const english = page({ locale: "en", theme: "dark" });
  const chinese = page({ locale: "zh-CN", theme: "light" });

  assert.match(english, /<html lang="en" data-theme="dark" data-surface-mode="review">/);
  assert.match(chinese, /<html lang="zh-CN" data-theme="light" data-surface-mode="review">/);
  assert.match(chinese, /HarnessOS 网络访问/);
  assert.match(chinese, /直接发送所选结果，不生成摘要/);
  assert.match(chinese, />全部<\/button>/);
  assert.match(chinese, /勾选要采用的结果/);
  assert.match(chinese, /已用 \{provider\} 重新搜索，但默认服务未保存/);
  assert.match(chinese, /已将 \{provider\} 设为默认，但重新搜索未完成/);
  assert.match(chinese, /未能将默认服务更改为 \{provider\}/);
  assert.match(chinese, /部分搜索已完成，但仍有搜索失败/);
  assert.match(chinese, /切换服务会将其设为默认，并重新搜索当前结果；可能消耗服务额度/);
  assert.match(chinese, /展开搜索结果/);
  assert.match(chinese, /t\("expandResult"\)/);
  assert.match(chinese, /aria-expanded="false"/);
  assert.match(chinese, /actionBar\.inert = false/);
  assert.doesNotMatch(chinese, /position: fixed;\s*z-index: 24;\s*top: 14px/);
  assert.ok(chinese.indexOf('id="result-cards"') < chinese.indexOf('id="add-search"'));
  assert.ok(chinese.indexOf('id="add-search"') < chinese.indexOf('id="summary-panel"'));
  assert.ok(chinese.indexOf('id="summary-panel"') < chinese.indexOf('<footer class="action-bar">'));
  assert.match(chinese, /successfulSearches > 0/);
  assert.match(chinese, /btnSummaryBack/);
  assert.doesNotMatch(chinese, /btnSummary返回|btnSummary预览|maybe自动GenerateSummary/);
  assert.doesNotThrow(() => new Function(inlineScript(english)));
  assert.doesNotThrow(() => new Function(inlineScript(chinese)));

  for (const html of [english, chinese]) {
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com/i);
    assert.doesNotMatch(html, /pi-web-access|Glimpse|\bTUI\b/i);
    assert.match(html, /<script src="\/assets\/marked\.min\.js\?session=/);
    assert.match(html, /<img src="\/assets\/provider-icons\/exa\.svg\?session=/);
    assert.match(html, /class="provider-icon"/);
    assert.match(html, /class="source-link"[^>]+target="_blank"/);
  }
});

test("HarnessOS presentation projects one resolved custom palette instead of re-owning theme presets", () => {
  const custom = page({
    locale: "zh-CN",
    theme: "light",
    themeSnapshot: warmLightThemeSnapshot,
  });

  assert.match(custom, /"themeSnapshot":\{"accent":"rgb\(133, 77, 14\)"/);
  assert.match(custom, /applyResolvedThemeSnapshot\(\)/);
  assert.match(custom, /"--bg": snapshot\.surface/);
  assert.match(custom, /"--btn-primary": snapshot\.primaryBackground/);
  assert.match(custom, /"--timer-urgent-fg": snapshot\.danger/);
  assert.doesNotThrow(() => new Function(inlineScript(custom)));
});

test("observer uses the same bilingual page but removes review settlement controls", () => {
  const observer = generateCuratorPage(
    ["HarnessOS Agent web access"],
    "opaque-observer-token",
    20,
    availability(),
    "exa",
    "auto",
    [],
    null,
    { locale: "zh-CN", theme: "dark" },
    "observer",
  );

  assert.match(observer, /data-surface-mode="observer"/);
  assert.match(observer, /搜索结果会实时显示在这里，Agent 将自动继续/);
  assert.match(observer, /surfaceMode = DATA\.mode === "observer" \? "observer" : "review"/);
  assert.match(observer, /observerMode = surfaceMode === "observer"/);
  assert.match(observer, /interactiveReview = surfaceMode === "review"/);
  assert.doesNotMatch(observer, /workflow = observerMode/);
  assert.match(observer, /html\[data-surface-mode="observer"\] \.action-bar/);
  assert.doesNotMatch(observer, /html\[data-surface-mode="observer"\][^}]*\.summary-panel,/);
  assert.match(observer, /id="summary-readonly" class="summary-readonly hidden"/);
  assert.match(observer, /typeof data\.summary === "string"/);
  assert.match(observer, /summaryReadonly\.innerHTML = sanitizeMarkdownHtml/);
  assert.match(observer, /html\[data-surface-mode="observer"\] \.expired-overlay/);
  assert.match(
    observer,
    /id="expired-overlay" class="expired-overlay hidden" aria-live="polite" aria-hidden="true"/,
  );
  assert.match(observer, /es\.addEventListener\("terminal"/);
  assert.match(observer, /if \(heroStatus\) heroStatus\.textContent = ""/);
  assert.match(observer, /搜索可能仍在继续；如需查看，请重试当前页面/);
  assert.match(observer, /observerMode \? "disconnectedObserver" : "disconnectedReview"/);
  assert.match(observer, /html\[data-surface-mode="observer"\] \.provider-switch-consequence/);
  assert.doesNotThrow(() => new Function(inlineScript(observer)));
});

test("Curator loopback responses prohibit storage and referrer leakage", async (t) => {
  const handle = await startCuratorServer(
    {
      queries: ["test"],
      sessionToken: "server-test-token",
      timeout: 20,
      availableProviders: availability(),
      defaultProvider: "exa",
      searchProvider: "auto",
      summaryModels: [],
      defaultSummaryModel: null,
      presentation: { locale: "en", theme: "light" },
    },
    {
      onSubmit() {},
      onCancel() {},
      onProviderChange() {},
      async onAddSearch() {
        return [];
      },
      onAddSearchResults() {},
      async onSummarize() {
        return {
          summary: "",
          meta: { model: null, durationMs: 0, tokenEstimate: 0, fallbackUsed: true, edited: false },
        };
      },
      async onRewriteQuery(query) {
        return query;
      },
    },
  );
  t.after(() => handle.close());

  const response = await fetch(handle.url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);

  const pageUrl = new URL(handle.url);
  const asset = await fetch(
    new URL(
      `/assets/marked.min.js?session=${encodeURIComponent(pageUrl.searchParams.get("session"))}`,
      pageUrl,
    ),
  );
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("cache-control"), "no-store");
  assert.equal(asset.headers.get("referrer-policy"), "no-referrer");
  assert.match(await asset.text(), /marked/i);

  const providerIcon = await fetch(
    new URL(
      `/assets/provider-icons/exa.svg?session=${encodeURIComponent(pageUrl.searchParams.get("session"))}`,
      pageUrl,
    ),
  );
  assert.equal(providerIcon.status, 200);
  assert.equal(providerIcon.headers.get("content-type"), "image/svg+xml");
  assert.equal(providerIcon.headers.get("cache-control"), "no-store");
  assert.match(await providerIcon.text(), /<svg/i);
});

test("observer server is read-only, never times out, and terminalizes without review settlement", async (t) => {
  const cancellations = [];
  const handle = await startCuratorServer(
    {
      mode: "observer",
      queries: ["test"],
      sessionToken: "observer-server-token",
      timeout: 1,
      availableProviders: availability(),
      defaultProvider: "exa",
      searchProvider: "auto",
      summaryModels: [],
      defaultSummaryModel: null,
      presentation: { locale: "en", theme: "light" },
    },
    {
      onSubmit() {
        throw new Error("observer submitted");
      },
      onCancel(reason) {
        cancellations.push(reason);
      },
      onProviderChange() {
        throw new Error("observer changed provider");
      },
      async onAddSearch() {
        throw new Error("observer searched");
      },
      onAddSearchResults() {},
      async onSummarize() {
        throw new Error("observer summarized");
      },
      async onRewriteQuery() {
        throw new Error("observer rewrote");
      },
    },
  );
  t.after(() => handle.close());

  const pageUrl = new URL(handle.url);
  const token = pageUrl.searchParams.get("session");
  const mutation = await fetch(new URL("/provider", pageUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, provider: "exa" }),
  });
  assert.equal(mutation.status, 409);
  assert.deepEqual(await mutation.json(), { ok: false, code: "observer-read-only" });

  const invalidSession = await fetch(new URL("/state?session=wrong", pageUrl));
  assert.equal(invalidSession.status, 403);
  assert.deepEqual(await invalidSession.json(), { ok: false, code: "invalid-session" });

  handle.pushResult(0, { answer: "answer", results: [], provider: "exa" });
  handle.searchesDone();
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  assert.deepEqual(cancellations, []);
  const eventStream = fetch(new URL(`/events?session=${encodeURIComponent(token)}`, pageUrl)).then(
    (response) => response.text(),
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  handle.completeObserver("summary-sent", "## Final summary\n\nVisible in the tail.");
  const events = await eventStream;
  assert.match(events, /event: terminal/);
  assert.match(events, /Final summary/);
  assert.match(events, /Visible in the tail/);
  assert.deepEqual(cancellations, []);
});

test("provider switch reports canonical persistence truth before acknowledging the request", async (t) => {
  for (const expected of [
    { state: "saved" },
    { state: "conflict", reason: "revision-conflict" },
    { state: "failed", reason: "write-failed" },
  ]) {
    const handle = await startCuratorServer(
      {
        mode: "review",
        queries: ["test"],
        sessionToken: `provider-${expected.state}`,
        timeout: 30,
        availableProviders: availability(),
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
          return expected;
        },
        async onAddSearch() {
          return [];
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
    t.after(() => handle.close());
    const pageUrl = new URL(handle.url);
    const invalidProvider = await fetch(new URL("/provider", pageUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: pageUrl.searchParams.get("session"),
        provider: "not-a-provider",
      }),
    });
    assert.equal(invalidProvider.status, 400);
    assert.deepEqual(await invalidProvider.json(), { ok: false, code: "invalid-provider" });
    const response = await fetch(new URL("/provider", pageUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: undefined,
        token: pageUrl.searchParams.get("session"),
        provider: "exa",
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, persistence: expected });
  }
});

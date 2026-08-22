import assert from "node:assert/strict";
import test from "node:test";

import { generateCuratorPage } from "../curator-page.ts";
import { startCuratorServer } from "../curator-server.ts";

const providerIds = [
  "all", "openai", "brave", "parallel", "parallel-mcp", "tinyfish", "search1api",
  "searchinfinity", "querit", "tavily", "firecrawl", "jina", "serpdive", "kagi",
  "bocha", "ollama", "searxng", "duckduckgo", "perplexity", "exa", "gemini",
  "anysearch", "xai", "brightdata", "serpbase", "serper", "valyu",
];

function availability() {
  return Object.fromEntries(providerIds.map(id => [id, id === "all" || id === "exa"]));
}

function page(presentation) {
  return generateCuratorPage(
    ["OmniMind Agent web access"],
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
  const script = matches.map(match => match[1]).findLast(value => value.trim().length > 0);
  assert.ok(script);
  return script;
}

test("Curator freezes OmniMind locale/theme and ships executable self-contained bilingual UI", () => {
  const english = page({ locale: "en", theme: "dark" });
  const chinese = page({ locale: "zh-CN", theme: "light" });

  assert.match(english, /<html lang="en" data-theme="dark">/);
  assert.match(chinese, /<html lang="zh-CN" data-theme="light">/);
  assert.match(chinese, /OmniMind 网络访问/);
  assert.match(chinese, /直接发送所选结果，不生成摘要/);
  assert.match(chinese, />全部<\/button>/);
  assert.match(chinese, /勾选要采用的结果/);
  assert.match(chinese, /btnSummaryBack/);
  assert.doesNotMatch(chinese, /btnSummary返回|btnSummary预览|maybe自动GenerateSummary/);
  assert.doesNotThrow(() => new Function(inlineScript(english)));
  assert.doesNotThrow(() => new Function(inlineScript(chinese)));

  for (const html of [english, chinese]) {
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com/i);
    assert.doesNotMatch(html, /pi-web-access|Glimpse|\bTUI\b/i);
    assert.match(html, /<script src="\/assets\/marked\.min\.js\?session=/);
    assert.match(html, /class="source-link"[^>]+target="_blank"/);
  }
});

test("Curator loopback responses prohibit storage and referrer leakage", async (t) => {
  const handle = await startCuratorServer({
    queries: ["test"],
    sessionToken: "server-test-token",
    timeout: 20,
    availableProviders: availability(),
    defaultProvider: "exa",
    searchProvider: "auto",
    summaryModels: [],
    defaultSummaryModel: null,
    presentation: { locale: "en", theme: "light" },
  }, {
    onSubmit() {},
    onCancel() {},
    onProviderChange() {},
    async onAddSearch() { return []; },
    onAddSearchResults() {},
    async onSummarize() { return { summary: "", meta: { model: null, durationMs: 0, tokenEstimate: 0, fallbackUsed: true, edited: false } }; },
    async onRewriteQuery(query) { return query; },
  });
  t.after(() => handle.close());

  const response = await fetch(handle.url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);

  const pageUrl = new URL(handle.url);
  const asset = await fetch(new URL(`/assets/marked.min.js?session=${encodeURIComponent(pageUrl.searchParams.get("session"))}`, pageUrl));
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("cache-control"), "no-store");
  assert.equal(asset.headers.get("referrer-policy"), "no-referrer");
  assert.match(await asset.text(), /marked/i);
});

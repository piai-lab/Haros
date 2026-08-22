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

  assert.match(english, /<html lang="en" data-theme="dark" data-surface-mode="review">/);
  assert.match(chinese, /<html lang="zh-CN" data-theme="light" data-surface-mode="review">/);
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
	assert.match(html, /<img src="\/assets\/provider-icons\/exa\.svg\?session=/);
	assert.match(html, /class="provider-icon"/);
    assert.match(html, /class="source-link"[^>]+target="_blank"/);
  }
});

test("observer uses the same bilingual page but removes review settlement controls", () => {
  const observer = generateCuratorPage(
    ["OmniMind Agent web access"],
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
  assert.match(observer, /observerMode = DATA\.mode === "observer"/);
  assert.match(observer, /html\[data-surface-mode="observer"\] \.action-bar/);
  assert.match(observer, /es\.addEventListener\("terminal"/);
  assert.doesNotThrow(() => new Function(inlineScript(observer)));
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

	const providerIcon = await fetch(new URL(`/assets/provider-icons/exa.svg?session=${encodeURIComponent(pageUrl.searchParams.get("session"))}`, pageUrl));
	assert.equal(providerIcon.status, 200);
	assert.equal(providerIcon.headers.get("content-type"), "image/svg+xml");
	assert.equal(providerIcon.headers.get("cache-control"), "no-store");
	assert.match(await providerIcon.text(), /<svg/i);
});

test("observer server is read-only, never times out, and terminalizes without review settlement", async (t) => {
  const cancellations = [];
  const handle = await startCuratorServer({
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
  }, {
    onSubmit() { throw new Error("observer submitted"); },
    onCancel(reason) { cancellations.push(reason); },
    onProviderChange() { throw new Error("observer changed provider"); },
    async onAddSearch() { throw new Error("observer searched"); },
    onAddSearchResults() {},
    async onSummarize() { throw new Error("observer summarized"); },
    async onRewriteQuery() { throw new Error("observer rewrote"); },
  });
  t.after(() => handle.close());

  const pageUrl = new URL(handle.url);
  const token = pageUrl.searchParams.get("session");
  const mutation = await fetch(new URL("/provider", pageUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, provider: "exa" }),
  });
  assert.equal(mutation.status, 409);

  handle.pushResult(0, { answer: "answer", results: [], provider: "exa" });
  handle.searchesDone();
  await new Promise(resolve => setTimeout(resolve, 1_200));
  assert.deepEqual(cancellations, []);
  handle.completeObserver("summary-sent");
  assert.deepEqual(cancellations, []);
});

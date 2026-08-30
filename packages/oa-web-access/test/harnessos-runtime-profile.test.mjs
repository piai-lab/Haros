import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { WebSearchSessionAvailability } from "../availability.ts";
import { createWebSearchConfigService } from "../config-service.ts";
import { SearchProviderError, SearchRouteExhaustedError } from "../gemini-search.ts";
import { makeOAWebAccessExtension, OA_WEB_ACCESS_EXTENSION_PATH } from "../index.ts";

const CANONICAL_TOOLS = ["web_search", "source_check", "fetch_content", "get_search_content"];

test("Haros profile respects file-level tool switches while keeping canonical names and no TUI surfaces", async () => {
  const root = await mkdtemp(join(tmpdir(), "harnessos-web-profile-"));
  const service = createWebSearchConfigService(join(root, "agent"));
  const initial = service.ensureDefault();
  service.mutate({
    expectedRevision: initial.revision,
    patch: {
      webSearch: { enabled: false },
      tools: {
        webSearch: { enabled: false },
        sourceCheck: { enabled: false },
        fetchContent: { enabled: false },
        getSearchContent: { enabled: false },
      },
      toolNames: { webSearch: "renamed_search" },
    },
  });

  const tools = [];
  const commands = [];
  const shortcuts = [];
  makeOAWebAccessExtension({ configService: service })({
    registerTool(tool) {
      tools.push(tool);
    },
    registerCommand(name) {
      commands.push(name);
    },
    registerShortcut(name) {
      shortcuts.push(name);
    },
    on() {},
  });

  assert.deepEqual(
    tools.map(({ name }) => name),
    [],
  );
  assert.deepEqual(commands, []);
  assert.deepEqual(shortcuts, []);

  const disabled = service.readSnapshot();
  service.mutate({
    expectedRevision: disabled.revision,
    patch: {
      tools: {
        webSearch: { enabled: true },
        fetchContent: { enabled: true },
      },
    },
  });
  const partialTools = [];
  makeOAWebAccessExtension({ configService: service })({
    registerTool(tool) {
      partialTools.push(tool);
    },
    registerCommand() {},
    registerShortcut() {},
    on() {},
  });
  assert.deepEqual(
    partialTools.map(({ name }) => name),
    ["web_search", "fetch_content"],
  );
  const webSearch = partialTools.find(({ name }) => name === "web_search");
  assert.match(webSearch.description, /use broad for bounded multi-source coverage/);
  assert.match(
    webSearch.description,
    /use all only when maximum coverage justifies substantially higher cost and latency/,
  );
  assert.doesNotMatch(webSearch.description, /API_KEY|SearXNG|OpenAI or xAI/);
});

function ownedTool(name) {
  return {
    name,
    sourceInfo: {
      path: OA_WEB_ACCESS_EXTENSION_PATH,
      source: "inline",
      scope: "temporary",
      origin: "top-level",
    },
  };
}

test("route exhaustion removes only owned search tools and config revision restores them", async () => {
  const root = await mkdtemp(join(tmpdir(), "harnessos-web-active-set-"));
  const service = createWebSearchConfigService(join(root, "agent"));
  const initial = service.ensureDefault();
  let active = ["read", ...CANONICAL_TOOLS, "foreign_tool"];
  const all = CANONICAL_TOOLS.map(ownedTool);
  const pi = {
    getActiveTools: () => [...active],
    getAllTools: () => all,
    setActiveTools: (names) => {
      active = [...names];
    },
  };
  const availability = new WebSearchSessionAvailability(
    pi,
    service,
    (tool) => tool?.sourceInfo?.path === OA_WEB_ACCESS_EXTENSION_PATH,
  );
  availability.start();

  availability.noteSearchFailure(
    new SearchRouteExhaustedError("quota", [{ provider: "exa", kind: "quota", error: "HTTP 429" }]),
  );
  assert.equal(availability.status, "unavailable");
  assert.deepEqual(active, ["read", "fetch_content", "get_search_content", "foreign_tool"]);

  service.mutate({
    expectedRevision: initial.revision,
    patch: { exaApiKey: "candidate" },
  });
  assert.equal(availability.status, "possible");
  assert.deepEqual(active, [
    "read",
    "fetch_content",
    "get_search_content",
    "foreign_tool",
    "web_search",
    "source_check",
  ]);
  availability.noteSearchFailure(
    new SearchRouteExhaustedError("quota", [{ provider: "exa", kind: "quota", error: "HTTP 429" }]),
  );
  availability.shutdown();
  const afterShutdown = service.readSnapshot();
  service.mutate({
    expectedRevision: afterShutdown.revision,
    patch: { exaApiKey: "rotated" },
  });
  assert.ok(!active.includes("web_search"), "shutdown must release the revision listener");
});

test("transient, named, and foreign-collision failures never remove tools globally", async () => {
  const root = await mkdtemp(join(tmpdir(), "harnessos-web-degraded-"));
  const service = createWebSearchConfigService(join(root, "agent"));
  service.ensureDefault();
  let active = [...CANONICAL_TOOLS];
  const all = CANONICAL_TOOLS.map(ownedTool);
  const availability = new WebSearchSessionAvailability(
    {
      getActiveTools: () => [...active],
      getAllTools: () => all,
      setActiveTools: (names) => {
        active = [...names];
      },
    },
    service,
    (tool) => tool?.sourceInfo?.path === OA_WEB_ACCESS_EXTENSION_PATH,
  );
  availability.noteSearchFailure(
    new SearchRouteExhaustedError("network", [
      { provider: "exa", kind: "network", error: "offline" },
    ]),
  );
  assert.equal(availability.status, "degraded");
  assert.deepEqual(active, CANONICAL_TOOLS);

  availability.noteSearchFailure(new SearchProviderError("exa", "quota", "named quota", 429, null));
  assert.deepEqual(active, CANONICAL_TOOLS);

  all[0] = { ...ownedTool("web_search"), sourceInfo: { path: "foreign" } };
  availability.noteSearchFailure(
    new SearchRouteExhaustedError("quota", [{ provider: "exa", kind: "quota", error: "HTTP 429" }]),
  );
  assert.ok(active.includes("web_search"), "foreign winner must never be removed");
  assert.ok(!active.includes("source_check"), "owned source_check follows global route exhaustion");
});

test("Haros route exhaustion points to Settings and never leaks Pi slash commands", async () => {
  const root = await mkdtemp(join(tmpdir(), "harnessos-web-error-copy-"));
  const service = createWebSearchConfigService(join(root, "agent"));
  const initial = service.ensureDefault();
  service.mutate({
    expectedRevision: initial.revision,
    patch: {
      workflow: "none",
      searchRouting: { providers: ["brave"], fallbackOn: ["network"] },
    },
  });
  const tools = [];
  let active = [...CANONICAL_TOOLS];
  makeOAWebAccessExtension({ configService: service })({
    registerTool(tool) {
      tools.push(tool);
    },
    registerCommand() {},
    registerShortcut() {},
    on() {},
    appendEntry() {},
    getActiveTools: () => [...active],
    getAllTools: () => tools.map(({ name }) => ownedTool(name)),
    setActiveTools: (names) => {
      active = [...names];
    },
  });
  const search = tools.find(({ name }) => name === "web_search");
  const result = await search.execute("call", { query: "test", workflow: "none" });
  const text = result.content.map((item) => item.text ?? "").join("\n");
  assert.match(text, /Development > Web search/);
  assert.doesNotMatch(text, /\/login|\/websearch|\/curator/);
});

test("source_check route evidence removes and restores the owned search tool pair", async () => {
  const root = await mkdtemp(join(tmpdir(), "harnessos-source-check-active-set-"));
  const service = createWebSearchConfigService(join(root, "agent"));
  const initial = service.ensureDefault();
  service.mutate({
    expectedRevision: initial.revision,
    patch: {
      braveApiKey: "test-key",
      searchRouting: { providers: ["brave"], fallbackOn: ["quota"] },
    },
  });
  const previousFetch = globalThis.fetch;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const tools = [];
  const handlers = new Map();
  let active = [...CANONICAL_TOOLS];
  makeOAWebAccessExtension({ configService: service })({
    registerTool(tool) {
      tools.push(tool);
    },
    registerCommand() {},
    registerShortcut() {},
    on(name, handler) {
      handlers.set(name, handler);
    },
    appendEntry() {},
    getActiveTools: () => [...active],
    getAllTools: () => tools.map(({ name }) => ownedTool(name)),
    setActiveTools: (names) => {
      active = [...names];
    },
  });
  const sourceCheck = tools.find(({ name }) => name === "source_check");

  try {
    globalThis.fetch = async () => new Response("quota", { status: 429 });
    await sourceCheck.execute("failure", { claim: "route evidence" });
    assert.ok(!active.includes("web_search"));
    assert.ok(!active.includes("source_check"));

    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          output: [
            { type: "web_search_call", action: { sources: [] } },
            { type: "message", content: [{ type: "output_text", text: "No sources." }] },
          ],
        }),
        { status: 200 },
      );
    await sourceCheck.execute("success", { claim: "route evidence", provider: "openai" });
    assert.deepEqual(new Set(active), new Set(CANONICAL_TOOLS));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAiKey;
    await handlers.get("session_shutdown")?.();
  }
});

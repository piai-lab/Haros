import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createWebSearchConfigService } from "../config-service.ts";
import { makeOAWebAccessExtension } from "../index.ts";

function makeHarness(configService, curatorPresenter) {
  const tools = [];
  const handlers = new Map();
  const entries = [];
  makeOAWebAccessExtension({ configService, curatorPresenter })({
    registerTool(tool) {
      tools.push(tool);
    },
    registerCommand() {},
    registerShortcut() {},
    on(event, handler) {
      handlers.set(event, handler);
    },
    appendEntry(type, data) {
      entries.push({ type, data });
    },
  });
  return {
    tools,
    handlers,
    entries,
    tool(name) {
      const tool = tools.find((candidate) => candidate.name === name);
      assert.ok(tool, `missing ${name}`);
      return tool;
    },
  };
}

function configureCurator(configService) {
  const snapshot = configService.ensureDefault();
  configService.mutate({
    expectedRevision: snapshot.revision,
    patch: {
      provider: "exa",
      workflow: "summary-review",
      exaApiKey: "test-only-key",
      curatorTimeoutSeconds: 60,
    },
  });
}

function makePresenter() {
  const requests = [];
  const settlements = [];
  return {
    requests,
    settlements,
    async snapshot() {
      return { locale: "en", theme: "dark" };
    },
    async present(request) {
      requests.push(request);
      return { kind: "presented", tabId: `tab-${request.surfaceId}` };
    },
    async settle(input) {
      settlements.push(input);
    },
  };
}

async function waitFor(predicate, message) {
  const deadline = Date.now() + 5_000;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function submitRaw(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("session");
  assert.ok(token);
  const response = await fetch(new URL("/submit", url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, selected: [], rawResults: true }),
  });
  assert.equal(response.status, 200, await response.text());
}

function extensionContext(root, branch = []) {
  return {
    model: undefined,
    modelRegistry: {
      getAvailable: () => [],
      find: () => undefined,
    },
    cwd: root,
    hasUI: true,
    isProjectTrusted: () => false,
    sessionManager: { getBranch: () => branch },
    ui: { setWidget() {} },
  };
}

test("canonical default search auto-summarizes without presenting Curator", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.exa.ai/answer")) {
      return new Response(
        JSON.stringify({
          answer: "Default workflow answer",
          citations: [
            {
              title: "Default workflow source",
              url: "https://example.test/default-workflow",
              text: "Evidence for the default workflow",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return originalFetch(url, init);
  };

  const root = await mkdtemp(join(tmpdir(), "harnessos-web-default-workflow-"));
  const configService = createWebSearchConfigService(join(root, "agent"));
  const initial = configService.ensureDefault();
  configService.mutate({
    expectedRevision: initial.revision,
    patch: { exaApiKey: "test-only-key" },
  });
  const presenter = makePresenter();
  const harness = makeHarness(configService, presenter);
  const result = await harness
    .tool("web_search")
    .execute(
      "default-workflow-call",
      { query: "default workflow", provider: "exa" },
      undefined,
      undefined,
      extensionContext(root),
    );

  assert.equal(presenter.requests.length, 0);
  assert.equal(result.details.summary.workflow, "auto-summary");
  assert.match(result.content[0].text, /default workflow/i);
  assert.equal(result.details.responseId, result.details.searchId);
  assert.match(
    result.content[0].text,
    new RegExp(
      `get_search_content\\(\\{ responseId: "${result.details.responseId}", queryIndex: 0 \\}\\)`,
    ),
  );
  const stored = await harness
    .tool("get_search_content")
    .execute("default-workflow-read", { responseId: result.details.responseId, queryIndex: 0 });
  assert.doesNotMatch(stored.content[0].text, /^Error:/);
  assert.match(stored.content[0].text, /Default workflow source/);
  await harness.handlers.get("session_shutdown")?.();
});

test("Haros named Provider errors point to Settings without leaking upstream commands or paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "harnessos-web-error-projection-"));
  const configService = createWebSearchConfigService(join(root, "agent"));
  configService.ensureDefault();
  const harness = makeHarness(configService, makePresenter());
  const result = await harness
    .tool("web_search")
    .execute(
      "named-provider-error",
      { query: "provider error", provider: "xai", workflow: "none" },
      undefined,
      undefined,
      extensionContext(root),
    );
  const serialized = JSON.stringify(result);
  assert.match(serialized, /Development > Web search/);
  assert.doesNotMatch(serialized, /\/login|web-search\.json|\.pi\//);
});

test("auto-summary and none can observe live results without becoming pending review", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.exa.ai/answer")) {
      const query = JSON.parse(String(init?.body ?? "{}")).query ?? "query";
      return new Response(
        JSON.stringify({
          answer: `Observed answer for ${query}`,
          citations: [
            {
              title: `Observed source for ${query}`,
              url: `https://example.test/${encodeURIComponent(query)}`,
              text: `Observed evidence for ${query}`,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return originalFetch(url, init);
  };

  const root = await mkdtemp(join(tmpdir(), "harnessos-web-observer-"));
  const configService = createWebSearchConfigService(join(root, "agent"));
  const initial = configService.ensureDefault();
  configService.mutate({
    expectedRevision: initial.revision,
    patch: { exaApiKey: "test-only-key", autoOpenBrowser: true },
  });
  const presenter = makePresenter();
  const harness = makeHarness(configService, presenter);
  const updates = [];
  const context = extensionContext(root);

  const summaryResult = await harness
    .tool("web_search")
    .execute(
      "observer-summary",
      { query: "observer summary", provider: "exa" },
      undefined,
      (update) => updates.push(update),
      context,
    );
  assert.equal(summaryResult.details.summary.workflow, "auto-summary");
  assert.equal(presenter.requests.length, 1);
  assert.deepEqual(presenter.settlements[0], {
    toolCallId: "observer-summary",
    surfaceId: presenter.requests[0].surfaceId,
    preserveTab: true,
  });
  assert.match(JSON.stringify(updates), /"status":"observing"/);
  assert.doesNotMatch(
    JSON.stringify(updates),
    /"status":"pending"|waiting-for-user|session=|curatorUrl/,
  );

  const rawResult = await harness
    .tool("web_search")
    .execute(
      "observer-raw",
      { query: "observer raw", provider: "exa", workflow: "none" },
      undefined,
      (update) => updates.push(update),
      context,
    );
  assert.equal(rawResult.details.summary, undefined);
  assert.equal(presenter.requests.length, 2);
  assert.deepEqual(presenter.settlements[1], {
    toolCallId: "observer-raw",
    surfaceId: presenter.requests[1].surfaceId,
    preserveTab: true,
  });

  const rejectedService = createWebSearchConfigService(join(root, "rejected", "agent"));
  const rejectedInitial = rejectedService.ensureDefault();
  rejectedService.mutate({
    expectedRevision: rejectedInitial.revision,
    patch: { exaApiKey: "test-only-key", autoOpenBrowser: true },
  });
  const rejectedPresenter = makePresenter();
  rejectedPresenter.snapshot = async () => ({ locale: "zh-CN", theme: "dark" });
  rejectedPresenter.present = async (request) => {
    rejectedPresenter.requests.push(request);
    throw new Error("typed handoff rejected");
  };
  const rejectedHarness = makeHarness(rejectedService, rejectedPresenter);
  const rejectedUpdates = [];
  const rejectedResult = await rejectedHarness
    .tool("web_search")
    .execute(
      "observer-rejected",
      { query: "observer rejected", provider: "exa" },
      undefined,
      (update) => rejectedUpdates.push(update),
      context,
    );
  assert.equal(
    rejectedResult.details.summary.workflow,
    "auto-summary",
    "observer failure must not fail the search workflow",
  );
  assert.match(JSON.stringify(rejectedUpdates), /搜索仍在继续/);
  assert.equal(rejectedPresenter.settlements.length, 1);
  await rejectedHarness.handlers.get("session_shutdown")?.();
  assert.equal(
    rejectedPresenter.settlements.length,
    1,
    "failed observer handoff must settle exactly once",
  );

  await harness.handlers.get("session_shutdown")?.();
  assert.equal(
    presenter.settlements.length,
    2,
    "terminal observers must not settle twice on shutdown",
  );
});

test("Session instances isolate stored results and shutdown cleanup", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url) =>
    new Response(
      `<!doctype html><article><h1>${url}</h1><p>instance content for ${url}</p></article>`,
      { status: 200, headers: { "content-type": "text/html" } },
    );

  const root = await mkdtemp(join(tmpdir(), "harnessos-web-instance-"));
  const left = makeHarness(createWebSearchConfigService(join(root, "left", "agent")));
  const right = makeHarness(createWebSearchConfigService(join(root, "right", "agent")));
  const context = { model: undefined, modelRegistry: {}, cwd: root, isProjectTrusted: () => false };

  const leftFetch = await left
    .tool("fetch_content")
    .execute("left-call", { url: "https://93.184.216.34/left" }, undefined, undefined, context);
  const rightFetch = await right
    .tool("fetch_content")
    .execute("right-call", { url: "https://93.184.216.34/right" }, undefined, undefined, context);

  const leftId = leftFetch.details.responseId;
  const rightId = rightFetch.details.responseId;
  assert.notEqual(leftId, rightId);
  const leftRead = await left
    .tool("get_search_content")
    .execute("left-read", { responseId: leftId });
  assert.match(leftRead.content[0].text, /left/);
  const crossRead = await right
    .tool("get_search_content")
    .execute("cross-read", { responseId: leftId });
  assert.match(crossRead.content[0].text, /No stored results/i);

  await left.handlers.get("session_shutdown")?.();
  const rightRead = await right
    .tool("get_search_content")
    .execute("right-read", { responseId: rightId });
  assert.match(rightRead.content[0].text, /right/);
});

test(
  "call terminal, Run abort, session_tree, and shutdown clean only their lifecycle scope",
  { timeout: 20_000 },
  async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });
    globalThis.fetch = async (url, init) => {
      const target = String(url);
      if (target.startsWith("https://api.exa.ai/answer")) {
        const query = JSON.parse(String(init?.body ?? "{}")).query ?? "query";
        return new Response(
          JSON.stringify({
            answer: `Answer for ${query}`,
            citations: [
              {
                title: `Source for ${query}`,
                url: `https://example.test/${encodeURIComponent(query)}`,
                text: `Evidence for ${query}`,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(url, init);
    };

    const root = await mkdtemp(join(tmpdir(), "harnessos-web-lifecycle-"));
    const baseService = createWebSearchConfigService(join(root, "primary", "agent"));
    configureCurator(baseService);
    let revisionListeners = 0;
    const configService = {
      ...baseService,
      subscribeRevision(listener) {
        revisionListeners += 1;
        const unsubscribe = baseService.subscribeRevision(listener);
        return () => {
          revisionListeners -= 1;
          unsubscribe();
        };
      },
    };
    const presenter = makePresenter();
    const harness = makeHarness(configService, presenter);
    const context = extensionContext(root);
    await harness.handlers.get("session_start")?.({}, context);
    assert.equal(revisionListeners, 1);

    const first = harness
      .tool("web_search")
      .execute("call-first", { query: "first", provider: "exa" }, undefined, undefined, context);
    const second = harness
      .tool("web_search")
      .execute("call-second", { query: "second", provider: "exa" }, undefined, undefined, context);
    await waitFor(() => presenter.requests.length === 2, "two Curators were not presented");
    await submitRaw(presenter.requests.find((request) => request.toolCallId === "call-first"));
    const firstResult = await first;
    assert.match(firstResult.content[0].text, /first/i);
    await waitFor(
      () => presenter.settlements.some((item) => item.toolCallId === "call-first"),
      "first call was not settled",
    );
    assert.equal(
      presenter.settlements.some((item) => item.toolCallId === "call-second"),
      false,
      "terminal cleanup leaked into another pending call",
    );
    const secondStillPending = await Promise.race([
      second.then(() => false),
      new Promise((resolve) => setTimeout(() => resolve(true), 30)),
    ]);
    assert.equal(secondStillPending, true);

    const runAbort = new AbortController();
    const runOne = harness
      .tool("web_search")
      .execute(
        "run-call-one",
        { query: "run one", provider: "exa" },
        runAbort.signal,
        undefined,
        context,
      );
    const runTwo = harness
      .tool("web_search")
      .execute(
        "run-call-two",
        { query: "run two", provider: "exa" },
        runAbort.signal,
        undefined,
        context,
      );
    const independent = harness
      .tool("web_search")
      .execute(
        "independent-call",
        { query: "independent", provider: "exa" },
        undefined,
        undefined,
        context,
      );
    await waitFor(() => presenter.requests.length === 5, "Run-scoped Curators were not presented");
    runAbort.abort();
    await Promise.all([runOne, runTwo]);
    await waitFor(
      () =>
        ["run-call-one", "run-call-two"].every((callId) =>
          presenter.settlements.some((item) => item.toolCallId === callId),
        ),
      "Run abort did not settle all calls owned by that Run",
    );
    assert.equal(
      presenter.settlements.some((item) => item.toolCallId === "independent-call"),
      false,
      "Run abort leaked into an independent call",
    );

    const secondaryService = createWebSearchConfigService(join(root, "secondary", "agent"));
    configureCurator(secondaryService);
    const secondaryPresenter = makePresenter();
    const secondary = makeHarness(secondaryService, secondaryPresenter);
    const secondaryContext = extensionContext(root);
    const secondaryPending = secondary
      .tool("web_search")
      .execute(
        "secondary-call",
        { query: "secondary", provider: "exa" },
        undefined,
        undefined,
        secondaryContext,
      );
    await waitFor(
      () => secondaryPresenter.requests.length === 1,
      "secondary Session Curator was not presented",
    );

    await harness.handlers.get("session_tree")?.({}, extensionContext(root, []));
    await Promise.all([second, independent]);
    await waitFor(
      () =>
        ["call-second", "independent-call"].every((callId) =>
          presenter.settlements.some((item) => item.toolCallId === callId),
        ),
      "session_tree did not clean the previous branch",
    );
    assert.equal(
      secondaryPresenter.settlements.some((item) => item.toolCallId === "secondary-call"),
      false,
      "session_tree leaked into another Extension instance",
    );

    await secondary.handlers.get("session_shutdown")?.();
    await secondaryPending;
    assert.equal(
      secondaryPresenter.settlements.some((item) => item.toolCallId === "secondary-call"),
      true,
    );
    await harness.handlers.get("session_shutdown")?.();
    assert.equal(revisionListeners, 0, "Session shutdown retained the config revision listener");
  },
);

test(
  "recoverable presentation stays pending while fatal presentation settles with a typed error",
  { timeout: 10_000 },
  async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith("https://api.exa.ai/answer")) {
        const query = JSON.parse(String(init?.body ?? "{}")).query ?? "query";
        return new Response(
          JSON.stringify({
            answer: `Answer for ${query}`,
            citations: [{ title: "Source", url: "https://example.test/source" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(url, init);
    };

    const root = await mkdtemp(join(tmpdir(), "harnessos-web-presentation-"));
    const recoverableService = createWebSearchConfigService(join(root, "recoverable", "agent"));
    configureCurator(recoverableService);
    const recoverablePresenter = makePresenter();
    recoverablePresenter.present = async (request) => {
      recoverablePresenter.requests.push(request);
      return { kind: "recoverable-error", message: "Browser pane is temporarily unavailable" };
    };
    const recoverableHarness = makeHarness(recoverableService, recoverablePresenter);
    const updates = [];
    const recoverablePending = recoverableHarness
      .tool("web_search")
      .execute(
        "recoverable-call",
        { query: "recoverable", provider: "exa" },
        undefined,
        (update) => updates.push(update),
        extensionContext(root),
      );
    await waitFor(
      () => updates.some((update) => update.details?.presentationError),
      "recoverable presentation did not publish a retryable pending activity",
    );
    assert.equal(
      await Promise.race([
        recoverablePending.then(() => false),
        new Promise((resolve) => setTimeout(() => resolve(true), 30)),
      ]),
      true,
    );
    assert.doesNotMatch(JSON.stringify(updates), /session=|curatorUrl/);
    assert.match(JSON.stringify(updates), /surfaceId/);
    await recoverableHarness.handlers.get("session_shutdown")?.();
    await recoverablePending;
    assert.equal(recoverablePresenter.settlements.length, 1);

    const fatalService = createWebSearchConfigService(join(root, "fatal", "agent"));
    configureCurator(fatalService);
    const fatalPresenter = makePresenter();
    fatalPresenter.present = async (request) => {
      fatalPresenter.requests.push(request);
      return { kind: "fatal-error", message: "Host handoff protocol rejected the request" };
    };
    const fatalHarness = makeHarness(fatalService, fatalPresenter);
    const fatal = await fatalHarness
      .tool("web_search")
      .execute(
        "fatal-call",
        { query: "fatal", provider: "exa" },
        undefined,
        undefined,
        extensionContext(root),
      );
    assert.equal(fatal.details.phase, "curator-presentation-error");
    assert.match(fatal.content[0].text, /could not present source review/i);
    assert.doesNotMatch(JSON.stringify(fatal), /session=|curatorUrl/);
    await waitFor(
      () => fatalPresenter.settlements.length === 1,
      "fatal presentation was not settled",
    );
    await fatalHarness.handlers.get("session_shutdown")?.();
    assert.equal(
      fatalPresenter.settlements.length,
      1,
      "shutdown settled an already-terminal call twice",
    );

    const rejectedService = createWebSearchConfigService(join(root, "rejected", "agent"));
    configureCurator(rejectedService);
    const rejectedPresenter = makePresenter();
    rejectedPresenter.present = async (request) => {
      rejectedPresenter.requests.push(request);
      throw new Error("Browser handoff rejected before returning a typed result");
    };
    const rejectedHarness = makeHarness(rejectedService, rejectedPresenter);
    const rejected = await rejectedHarness
      .tool("web_search")
      .execute(
        "rejected-call",
        { query: "rejected", provider: "exa" },
        undefined,
        undefined,
        extensionContext(root),
      );
    assert.equal(rejected.details.phase, "curator-presentation-error");
    assert.match(rejected.content[0].text, /could not present source review/i);
    assert.doesNotMatch(JSON.stringify(rejected), /Open manually|session=|curatorUrl/);
    await waitFor(
      () => rejectedPresenter.settlements.length === 1,
      "rejected presentation was not settled",
    );
    await rejectedHarness.handlers.get("session_shutdown")?.();
    assert.equal(
      rejectedPresenter.settlements.length,
      1,
      "shutdown settled a rejected presentation twice",
    );
  },
);

import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createWebSearchConfigService } from "../config-service.ts";
import {
	mutateWebSearchSettings,
	projectWebSearchSettings,
	testWebSearchProvider,
} from "../settings-runtime.ts";

async function withoutProviderEnvironment(names, run) {
	const original = new Map(names.map((name) => [name, process.env[name]]));
	for (const name of names) delete process.env[name];
	try {
		return await run();
	} finally {
		for (const [name, value] of original) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	}
}

test("Settings projection uses auto-summary when workflow is absent", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-default-workflow-"));
	await writeFile(join(agentDir, "web-search.json"), JSON.stringify({
		schemaVersion: 1,
		provider: "auto",
	}) + "\n", { mode: 0o600 });
	const projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
	assert.equal(projection.workflow, "auto-summary");
	assert.equal(projection.autoShowSearchProcess, false);
});

test("Settings projection returns literal expressions and credential-blind runtime descriptors", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-projection-"));
	await writeFile(join(agentDir, "web-search.json"), JSON.stringify({
		schemaVersion: 1,
		provider: "auto",
		workflow: "summary-review",
		tavilyApiKey: "$TAVILY_API_KEY",
		exaApiKey: "!security find-generic-password -w -s synthetic",
	}) + "\n", { mode: 0o600 });
	const projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
	const tavily = projection.providers.find(({ id }) => id === "tavily");
	const exa = projection.providers.find(({ id }) => id === "exa");
	assert.equal(tavily.fields.find(({ configKey }) => configKey === "tavilyApiKey").value, "$TAVILY_API_KEY");
	assert.equal(exa.fields.find(({ configKey }) => configKey === "exaApiKey").value, "!security find-generic-password -w -s synthetic");
	assert.deepEqual(tavily.icon, {
		kind: "local-asset",
		assetId: "tavily",
		assetPath: "/web-access/provider-icons/tavily.svg",
		admission: "admitted",
	});
	assert.equal(tavily.costHint, "may-charge");
});

test("Provider descriptors own structural possibility including Gemini browser cookies", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-structural-"));
	await writeFile(join(agentDir, "web-search.json"), JSON.stringify({
		schemaVersion: 1,
		provider: "auto",
		workflow: "summary-review",
		allowBrowserCookies: true,
	}) + "\n", { mode: 0o600 });
	const projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
	assert.equal(projection.providers.find(({ id }) => id === "gemini")?.structurallyPossible, true);
	assert.equal(projection.providers.find(({ id }) => id === "exa")?.structurallyPossible, true);
	assert.equal(projection.providers.find(({ id }) => id === "tavily")?.structurallyPossible, false);
});

test("Provider configuration state requires every descriptor-owned prerequisite", async () => {
  const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-prerequisites-"));
  const configPath = join(agentDir, "web-search.json");
  await writeFile(
    configPath,
    JSON.stringify({
      schemaVersion: 1,
      brightdataApiKey: "synthetic",
    }) + "\n",
    { mode: 0o600 },
  );
  let projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
  let brightData = projection.providers.find(({ id }) => id === "brightdata");
  assert.equal(brightData.configurationState, "partial");
  assert.equal(brightData.configured, false);
  assert.deepEqual(brightData.missingRequiredConfigKeys, ["brightdataSerpZone"]);

  await writeFile(
    configPath,
    JSON.stringify({
      schemaVersion: 1,
      brightdataApiKey: "synthetic",
      brightdataSerpZone: "synthetic-zone",
    }) + "\n",
    { mode: 0o600 },
  );
  projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
  brightData = projection.providers.find(({ id }) => id === "brightdata");
  assert.equal(brightData.configurationState, "complete");
  assert.equal(brightData.configured, true);
  assert.deepEqual(brightData.missingRequiredConfigKeys, []);
  assert.equal(
    projection.providers.find(({ id }) => id === "exa")?.configurationState,
    "not-required",
  );
});

test("Provider configuration projection preserves alternative credential and session paths", async () => {
	await withoutProviderEnvironment([
		"OPENAI_API_KEY",
		"XAI_API_KEY",
		"GEMINI_API_KEY",
		"GOOGLE_GEMINI_BASE_URL",
		"CLOUDFLARE_API_KEY",
	], async () => {
		const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-alternatives-"));
		const configPath = join(agentDir, "web-search.json");
		const project = async (config) => {
			await writeFile(configPath, JSON.stringify({ schemaVersion: 1, ...config }) + "\n", { mode: 0o600 });
			return projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
		};
		const state = (projection, id) => projection.providers.find((provider) => provider.id === id);

		let projection = await project({});
		assert.deepEqual(
			[state(projection, "openai").configurationState, state(projection, "xai").configurationState],
			["session-dependent", "session-dependent"],
		);
		assert.equal(state(projection, "openai").structurallyPossible, true);
		assert.equal(state(projection, "xai").structurallyPossible, true);

		projection = await project({ xaiSearchModel: "synthetic-model" });
		assert.equal(state(projection, "xai").configurationState, "session-dependent");
		assert.equal(state(projection, "xai").configured, false);

		projection = await project({ openaiApiKey: "synthetic", xaiApiKey: "synthetic" });
		assert.equal(state(projection, "openai").configurationState, "complete");
		assert.equal(state(projection, "xai").configurationState, "complete");

		projection = await project({ geminiBaseUrl: "https://example.invalid" });
		assert.equal(state(projection, "gemini").configurationState, "partial");
		assert.deepEqual(state(projection, "gemini").missingRequiredConfigKeys, ["geminiApiKey"]);

		projection = await project({ cloudflareApiKey: "synthetic" });
		assert.equal(state(projection, "gemini").configurationState, "partial");
		assert.deepEqual(state(projection, "gemini").missingRequiredConfigKeys, ["geminiBaseUrl"]);

		projection = await project({
			geminiBaseUrl: "https://gateway.ai.cloudflare.com/v1/example",
			cloudflareApiKey: "synthetic",
		});
		assert.equal(state(projection, "gemini").configurationState, "complete");

		projection = await project({ geminiApiKey: "synthetic" });
		assert.equal(state(projection, "gemini").configurationState, "complete");
		projection = await project({ allowBrowserCookies: true });
		assert.equal(state(projection, "gemini").configurationState, "complete");
	});
});

test("Provider Settings grouping follows descriptor connection roles", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-groups-"));
	await writeFile(join(agentDir, "web-search.json"), JSON.stringify({ schemaVersion: 1 }) + "\n", { mode: 0o600 });
	const projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
	const group = (id) => projection.providers.find((provider) => provider.id === id)?.settingsGroup;
	assert.equal(group("tavily"), "credentials");
	assert.equal(group("brave"), "credentials");
	assert.equal(group("parallel-mcp"), "advanced");
	assert.equal(group("searxng"), "advanced");
	assert.equal(group("exa"), "no-setup");
});

test("Settings projects the same file-level tool policy used by registration", async () => {
  const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-tools-"));
  const configPath = join(agentDir, "web-search.json");
  await writeFile(
    configPath,
    JSON.stringify({
      schemaVersion: 1,
      webSearch: { enabled: false },
      tools: {
        sourceCheck: { enabled: true },
        fetchContent: { enabled: false },
      },
    }) + "\n",
    { mode: 0o600 },
  );
  let projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
  assert.deepEqual(projection.tools, {
    webSearch: { enabled: false, reason: "file-disabled" },
    sourceCheck: { enabled: true, reason: "enabled" },
    fetchContent: { enabled: false, reason: "file-disabled" },
    getSearchContent: { enabled: true, reason: "enabled" },
  });

  await writeFile(
    configPath,
    JSON.stringify({
      schemaVersion: 1,
      webSearch: { enabled: true },
      tools: {
        webSearch: { enabled: false },
        sourceCheck: { enabled: false },
        fetchContent: { enabled: true },
        getSearchContent: { enabled: false },
      },
    }) + "\n",
    { mode: 0o600 },
  );
  projection = projectWebSearchSettings(createWebSearchConfigService(agentDir).readSnapshot());
  assert.deepEqual(projection.tools, {
    webSearch: { enabled: false, reason: "file-disabled" },
    sourceCheck: { enabled: false, reason: "file-disabled" },
    fetchContent: { enabled: true, reason: "enabled" },
    getSearchContent: { enabled: false, reason: "file-disabled" },
  });
});

test("closed Settings mutation preserves unknown file-owned fields", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-mutation-"));
	const configPath = join(agentDir, "web-search.json");
	await writeFile(configPath, JSON.stringify({
		schemaVersion: 1,
		provider: "auto",
		workflow: "summary-review",
		advancedExternalShape: { keep: [1, 2, 3] },
	}) + "\n", { mode: 0o600 });
	const service = createWebSearchConfigService(agentDir);
	const before = service.readSnapshot();
	mutateWebSearchSettings(service, {
		expectedRevision: before.revision,
		draft: {
			provider: "tavily",
			workflow: "none",
			autoShowSearchProcess: true,
			fields: [{ configKey: "tavilyApiKey", value: "synthetic-tavily-key" }],
		},
	});
	const written = JSON.parse(await readFile(configPath, "utf8"));
	assert.deepEqual(written.advancedExternalShape, { keep: [1, 2, 3] });
	assert.equal(written.provider, "tavily");
	assert.equal(written.workflow, "none");
	assert.equal(written.autoOpenBrowser, true);
});

test("Provider draft test uses unsaved candidate through the formal runtime without writing", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-test-"));
	const service = createWebSearchConfigService(agentDir);
	service.ensureDefault();
	const beforeBytes = await readFile(service.configPath, "utf8");
	const originalFetch = globalThis.fetch;
	let requestUrl = "";
	globalThis.fetch = async (input) => {
		requestUrl = String(input);
		return new Response(JSON.stringify({
			query: "connectivity",
			number_of_results: 1,
			results: [{ title: "Result", url: "https://example.com", content: "ok" }],
		}), { status: 200, headers: { "content-type": "application/json" } });
	};
	try {
		const result = await testWebSearchProvider({
			service,
			provider: "searxng",
			draft: {
				provider: "auto",
				workflow: "summary-review",
				autoShowSearchProcess: false,
				fields: [{ configKey: "searxngBaseUrl", value: "https://example.com" }],
			},
		});
		assert.equal(result.state, "ready");
		assert.match(requestUrl, /^https:\/\/example\.com\/search\?/);
		assert.equal(await readFile(service.configPath, "utf8"), beforeBytes);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("Provider draft test projects quota and network failures without exposing diagnostics", async () => {
  const agentDir = await mkdtemp(join(tmpdir(), "omnimind-web-settings-test-errors-"));
  const service = createWebSearchConfigService(agentDir);
  service.ensureDefault();
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("synthetic quota", { status: 429 });
    const quota = await testWebSearchProvider({
      service,
      provider: "tavily",
      draft: {
        provider: "auto",
        workflow: "auto-summary",
        autoShowSearchProcess: false,
        fields: [{ configKey: "tavilyApiKey", value: "synthetic" }],
      },
    });
    assert.deepEqual(
      { state: quota.state, provider: quota.provider, reason: quota.reason },
      { state: "failed", provider: "tavily", reason: "quota-exhausted" },
    );

    globalThis.fetch = async () => {
      throw new TypeError("synthetic network failure");
    };
    const network = await testWebSearchProvider({
      service,
      provider: "searxng",
      draft: {
        provider: "auto",
        workflow: "auto-summary",
        autoShowSearchProcess: false,
        fields: [{ configKey: "searxngBaseUrl", value: "https://example.com" }],
      },
    });
    assert.deepEqual(
      { state: network.state, provider: network.provider, reason: network.reason },
      { state: "failed", provider: "searxng", reason: "network-failure" },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

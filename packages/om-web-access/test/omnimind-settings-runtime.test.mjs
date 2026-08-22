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
	assert.deepEqual(tavily.icon, { kind: "neutral", assetId: null, admission: "not-admitted" });
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
			fields: [{ configKey: "tavilyApiKey", value: "synthetic-tavily-key" }],
		},
	});
	const written = JSON.parse(await readFile(configPath, "utf8"));
	assert.deepEqual(written.advancedExternalShape, { keep: [1, 2, 3] });
	assert.equal(written.provider, "tavily");
	assert.equal(written.workflow, "none");
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

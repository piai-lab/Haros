import assert from "node:assert/strict";
import { after, test } from "node:test";

import initializeExtension from "../index.ts";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

test("answer mode stores original fetched content instead of its answer presentation", async () => {
	const originalContent = "Original page content. ".repeat(60);
	globalThis.fetch = async () => new Response(
		`<!doctype html><html><head><title>Stored Page</title></head><body><article><h1>Stored Page</h1><p>${originalContent}</p></article></body></html>`,
		{ status: 200, headers: { "content-type": "text/html" } },
	);
	const tools = [];
	const entries = [];
	initializeExtension({
		registerTool(tool) { tools.push(tool); },
		registerCommand() {},
		registerShortcut() {},
		on() {},
		appendEntry(type, data) { entries.push({ type, data }); },
	});
	const tool = tools.find(registered => registered.name === "fetch_content");
	assert.ok(tool);

	const result = await tool.execute(
		"call",
		{ url: "https://93.184.216.34/page", mode: "answer", prompt: "What does it say?" },
		undefined,
		undefined,
		{ model: undefined, modelRegistry: {}, cwd: process.cwd(), isProjectTrusted: () => false },
	);
	assert.match(result.details.error, /Page answer failed/);
	assert.equal(entries.find(entry => entry.type === "web-search-results")?.data?.type, "fetch");
	const getSearchContent = tools.find(registered => registered.name === "get_search_content");
	assert.ok(getSearchContent);
	const stored = await getSearchContent.execute("read", { responseId: result.details.responseId, urlIndex: 0 });
	assert.match(stored.content[0].text, /Original page content/);
	assert.doesNotMatch(stored.content[0].text, /Page answer failed/);
});

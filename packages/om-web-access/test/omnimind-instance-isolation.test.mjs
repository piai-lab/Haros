import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createWebSearchConfigService } from "../config-service.ts";
import { makeOmniMindWebAccessExtension } from "../index.ts";

function makeHarness(configService) {
	const tools = [];
	const handlers = new Map();
	const entries = [];
	makeOmniMindWebAccessExtension({ configService })({
		registerTool(tool) { tools.push(tool); },
		registerCommand() {},
		registerShortcut() {},
		on(event, handler) { handlers.set(event, handler); },
		appendEntry(type, data) { entries.push({ type, data }); },
	});
	return {
		tools,
		handlers,
		entries,
		tool(name) {
			const tool = tools.find(candidate => candidate.name === name);
			assert.ok(tool, `missing ${name}`);
			return tool;
		},
	};
}

test("Session instances isolate stored results and shutdown cleanup", async (t) => {
	const originalFetch = globalThis.fetch;
	t.after(() => { globalThis.fetch = originalFetch; });
	globalThis.fetch = async (url) => new Response(
		`<!doctype html><article><h1>${url}</h1><p>instance content for ${url}</p></article>`,
		{ status: 200, headers: { "content-type": "text/html" } },
	);

	const root = await mkdtemp(join(tmpdir(), "omnimind-web-instance-"));
	const left = makeHarness(createWebSearchConfigService(join(root, "left", "agent")));
	const right = makeHarness(createWebSearchConfigService(join(root, "right", "agent")));
	const context = { model: undefined, modelRegistry: {}, cwd: root, isProjectTrusted: () => false };

	const leftFetch = await left.tool("fetch_content").execute(
		"left-call",
		{ url: "https://93.184.216.34/left" },
		undefined,
		undefined,
		context,
	);
	const rightFetch = await right.tool("fetch_content").execute(
		"right-call",
		{ url: "https://93.184.216.34/right" },
		undefined,
		undefined,
		context,
	);

	const leftId = leftFetch.details.responseId;
	const rightId = rightFetch.details.responseId;
	assert.notEqual(leftId, rightId);
	const leftRead = await left.tool("get_search_content").execute("left-read", { responseId: leftId });
	assert.match(leftRead.content[0].text, /left/);
	const crossRead = await right.tool("get_search_content").execute("cross-read", { responseId: leftId });
	assert.match(crossRead.content[0].text, /No stored results/i);

	await left.handlers.get("session_shutdown")?.();
	const rightRead = await right.tool("get_search_content").execute("right-read", { responseId: rightId });
	assert.match(rightRead.content[0].text, /right/);
});

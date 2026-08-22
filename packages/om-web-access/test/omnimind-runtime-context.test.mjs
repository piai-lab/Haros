import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createWebSearchConfigService } from "../config-service.ts";
import {
	bindExtensionApiToWebAccessContext,
	bindToCurrentWebAccessContext,
	createWebAccessInstanceContext,
	currentWebAccessContext,
	currentWebSearchConfigService,
	runWithWebAccessContext,
} from "../runtime-context.ts";

function registerContextProbe(context, emitter, ready) {
	let tool;
	const api = bindExtensionApiToWebAccessContext({
		registerTool(definition) { tool = definition; },
	}, context);
	runWithWebAccessContext(context, () => {
		api.registerTool({
			name: "context_probe",
			description: "test",
			parameters: {},
			async execute(callId) {
				const expected = context.configService.configPath;
				assert.equal(currentWebSearchConfigService().configPath, expected);
				await Promise.resolve();
				assert.equal(currentWebSearchConfigService().configPath, expected);
				await new Promise((resolve) => setTimeout(resolve, 1));
				assert.equal(currentWebSearchConfigService().configPath, expected);
				return new Promise((resolve) => {
					emitter.once(callId, bindToCurrentWebAccessContext(() => {
						resolve(currentWebAccessContext()?.configService.configPath);
					}));
					ready();
				});
			},
		});
	});
	return tool;
}

test("Pi callbacks, promises, timers, and external EventEmitters retain exact instances", async () => {
	const root = await mkdtemp(join(tmpdir(), "omnimind-web-context-"));
	const leftContext = createWebAccessInstanceContext({
		configService: createWebSearchConfigService(join(root, "left")),
		profile: "omnimind",
	});
	const rightContext = createWebAccessInstanceContext({
		configService: createWebSearchConfigService(join(root, "right")),
		profile: "omnimind",
	});
	const emitter = new EventEmitter();
	let readyCount = 0;
	let releaseReady;
	const bothReady = new Promise((resolve) => { releaseReady = resolve; });
	const ready = () => {
		readyCount++;
		if (readyCount === 2) releaseReady();
	};
	const left = registerContextProbe(leftContext, emitter, ready);
	const right = registerContextProbe(rightContext, emitter, ready);
	const leftResult = left.execute("left");
	const rightResult = right.execute("right");
	await bothReady;

	// Emit outside either AsyncLocalStorage scope; explicit EventEmitter binding
	// must still restore the instance that registered each listener.
	emitter.emit("right");
	emitter.emit("left");
	assert.equal(await leftResult, leftContext.configService.configPath);
	assert.equal(await rightResult, rightContext.configService.configPath);
});

test("OmniMind injected config never falls back to the upstream Pi directory", async () => {
	const root = await mkdtemp(join(tmpdir(), "omnimind-web-config-boundary-"));
	const previous = process.env.PI_CODING_AGENT_DIR;
	process.env.PI_CODING_AGENT_DIR = join(root, "legacy-pi");
	try {
		const productService = createWebSearchConfigService(join(root, "omnimind-agent"));
		const context = createWebAccessInstanceContext({
			configService: productService,
			profile: "omnimind",
		});
		assert.notEqual(currentWebSearchConfigService().configPath, productService.configPath);
		runWithWebAccessContext(context, () => {
			assert.equal(currentWebSearchConfigService().configPath, productService.configPath);
		});
	} finally {
		if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = previous;
	}
});

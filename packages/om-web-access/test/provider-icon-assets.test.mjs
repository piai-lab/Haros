import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const searchModuleUrl = new URL("../gemini-search.ts", import.meta.url).href;
const assetDirectory = new URL("../assets/provider-icons/", import.meta.url);

const EXPECTED_HASHES = {
	"bocha.svg": "42074dd95a9ae5241d11288150d76a62f19f71ef9a7414e777c0f047d7ce28b7",
	"brave.svg": "449057da04dcbf2e11895c6ba8923ae2e82db98b89b55af8c52e202c25a3cc9a",
	"exa.svg": "b1ae01ccce6798d7b9a129807e0fb9b0629cc035f4ead27d6300ab2adde792bb",
	"firecrawl.svg": "7264c67a690a63dda3cc0084f2d58ce9bf97f808fcd24d6bd622194f80fc0013",
	"gemini.svg": "87d5b3c4be75a66f54c1936482a263df68185545b741129badd1b7c2449c18d3",
	"jina.svg": "dbb78d6217774ddde8c57a6f5c94a3294c59e99c4a1e6ec786e409648b9bdb84",
	"kagi.svg": "8ce5fee709556d7b37f2194df569c3693578cd864502879e59472dbe2342f9b6",
	"ollama.svg": "3a268218fb2e6e81fa31df70f70b51331625047794db81db21d35359428fae7a",
	"openai.svg": "a595df6b423920c67a7f8f73c063e4bfb72d415948097b6cac063a2366bb5186",
	"perplexity.svg": "c66c64e9e3c273ef6c235f743808d67ffa7d482e8cbe4a79496a42b60333e1fe",
	"search1api.svg": "81d5fe1295044aa2aee8c14659d25145a843f1190837fbc6ce7555a4ac79648e",
	"searxng.svg": "8754bf48f2105bcbf45986aabcc6859bf15ccf530dcc5bd4ecedcd66248628b1",
	"tavily.svg": "a701298ee19fd81a87fc07abe9adc944de8caf8083f194d58d9b8ee21811f7d4",
};

test("admitted provider assets are exact, local, and descriptor-owned", async () => {
	const { SEARCH_PROVIDER_RUNTIME_DEFINITIONS } = await import(searchModuleUrl);
	const admitted = SEARCH_PROVIDER_RUNTIME_DEFINITIONS.filter(({ icon }) => icon.kind === "local-asset");
	assert.deepEqual(
		admitted.map(({ icon }) => `${icon.assetId}.svg`).sort(),
		Object.keys(EXPECTED_HASHES).sort(),
	);
	assert.deepEqual(
		(await readdir(assetDirectory)).filter((name) => name.endsWith(".svg")).sort(),
		Object.keys(EXPECTED_HASHES).sort(),
	);
	for (const descriptor of admitted) {
		const fileName = `${descriptor.icon.assetId}.svg`;
		assert.equal(descriptor.icon.assetPath, `/web-access/provider-icons/${fileName}`);
		const bytes = await readFile(new URL(fileName, assetDirectory));
		assert.equal(createHash("sha256").update(bytes).digest("hex"), EXPECTED_HASHES[fileName]);
		assert.doesNotMatch(
			bytes.toString("utf8"),
			/<script|javascript:|<image\b|(?:href|src)=["']https?:\/\//iu,
		);
	}
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";
import { test } from "node:test";

const searchModuleUrl = new URL("../gemini-search.ts", import.meta.url).href;
const assetDirectory = new URL("../assets/provider-icons/", import.meta.url);

const EXPECTED_HASHES = {
	"anysearch.ico": "30c4f28070675f7b860d74dae8b378cd197e9c1b88067d803c185070b7a95544",
	"bocha.svg": "bf96c5c287da443c310570db48a270121af57d559f849227aea27cc61b86f244",
	"brave.svg": "76ec345aefa225be34525da172d62c7a7ae80280bc062dc9776e24187b9d110c",
	"bright-data.png": "c9b3cb09c1cf5f0715fee4cbdfff0316f9cbce636832b3f01fe190ffb2019544",
	"duckduckgo.svg": "82648474f6ddd359747a4bdb843b326bca081d6c0fa15230d0fe3451d2316d63",
	"exa.svg": "8d8113b2d6796bc680cccba6578a1487e49407adf08bbe20fccd949b59a8371a",
	"firecrawl.svg": "98993b111d1cb75edd0b1ce3a1e8bd3f85dcf5548072ffb959ac97ffe69ade59",
	"gemini.svg": "8ab0a9bafec11f7e69bcb9fc4ffd8f1bc927d1ddcbbb6ff36dee5ae8b5a9d602",
	"jina.svg": "dbb78d6217774ddde8c57a6f5c94a3294c59e99c4a1e6ec786e409648b9bdb84",
	"kagi.svg": "8ce5fee709556d7b37f2194df569c3693578cd864502879e59472dbe2342f9b6",
	"ollama.svg": "3a268218fb2e6e81fa31df70f70b51331625047794db81db21d35359428fae7a",
	"openai.svg": "a595df6b423920c67a7f8f73c063e4bfb72d415948097b6cac063a2366bb5186",
	"parallel.svg": "3a2a862adaa498692933a73503720066a362fb9a14100f9cafec5754a6cd6db0",
	"perplexity.svg": "8353f3ab20822f1a933224b0ea32cc39f0c32d5740f4af8c254b0f418e0a3a70",
	"querit.png": "499e5eecc9f201cba297735c4d92e3af0f58e48df8b26b5b4365919ec6a37998",
	"search1api.svg": "4cbb94ff861a06d447808d8746f230d244733857d465feaa0a80022ed6339f6e",
	"searchinfinity.png": "5cf994fa84f105c25e93402c5bc538e9baf07bbd6948948b5dff5ce766f0dcf3",
	"searxng.svg": "4a2fec312abb559030f07fd53a3b8e6ffcd93d32ec0f8cf7ad12b79a3cead88f",
	"serpbase.svg": "b6fcc86374275b91eb68b445e6f621523dcfac235af16875ead24c2b3223a58a",
	"serpdive.png": "8ba2bc8f2b63c500ce236e36679fa60e3b17d37c045f9d55f1d323da3d185b70",
	"serper.png": "ddf56544724514caad2df06e97fcae8507e4fba2ddb94a3ec62345db6aec0a70",
	"tavily.svg": "2dec98b9ce5a9dd1edc52d4f8a4de7bbabe82f710dd224931f19c6bf5e3ccaff",
	"tinyfish.png": "8be481f16a3c84f43571caa753381fc74a81a898fbe4d310470b341662f05fd9",
	"valyu.ico": "edaad19e2231adf18eb9d94c114aac2221b23e0992de1c5a214d37da1fbe86e8",
	"xai.svg": "89eb7de9f0d02a41cfecd9109e253d7fd3529e27467dee4254faa67f3ac21451",
};

const EXPECTED_DESCRIPTOR_ASSETS = {
	openai: "openai.svg", exa: "exa.svg", brave: "brave.svg", parallel: "parallel.svg",
	"parallel-mcp": "parallel.svg", tinyfish: "tinyfish.png", search1api: "search1api.svg",
	searchinfinity: "searchinfinity.png", querit: "querit.png", tavily: "tavily.svg",
	firecrawl: "firecrawl.svg", jina: "jina.svg", serpdive: "serpdive.png", kagi: "kagi.svg",
	bocha: "bocha.svg", ollama: "ollama.svg", searxng: "searxng.svg",
	duckduckgo: "duckduckgo.svg", perplexity: "perplexity.svg", gemini: "gemini.svg",
	anysearch: "anysearch.ico", xai: "xai.svg", brightdata: "bright-data.png",
	serpbase: "serpbase.svg", serper: "serper.png", valyu: "valyu.ico",
};

test("all provider identities project exact pinned local brand assets", async () => {
	const { SEARCH_PROVIDER_RUNTIME_DEFINITIONS } = await import(searchModuleUrl);
	assert.equal(SEARCH_PROVIDER_RUNTIME_DEFINITIONS.length, 26);
	assert.deepEqual(
		Object.fromEntries(SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map(({ id, icon }) => [
			id,
			icon.kind === "local-asset" ? icon.assetPath.split("/").at(-1) : null,
		])),
		EXPECTED_DESCRIPTOR_ASSETS,
	);

	const assetNames = (await readdir(assetDirectory))
		.filter((name) => [".svg", ".png", ".ico"].includes(extname(name)))
		.sort();
	assert.deepEqual(assetNames, Object.keys(EXPECTED_HASHES).sort());

	for (const fileName of assetNames) {
		const bytes = await readFile(new URL(fileName, assetDirectory));
		assert.equal(createHash("sha256").update(bytes).digest("hex"), EXPECTED_HASHES[fileName]);
		if (fileName.endsWith(".svg")) {
			assert.doesNotMatch(
				bytes.toString("utf8"),
				/<script|javascript:|<image\b|(?:href|src)=["']https?:\/\//iu,
			);
		}
	}
});

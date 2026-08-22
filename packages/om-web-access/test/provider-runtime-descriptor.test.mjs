import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const searchModuleUrl = new URL("../gemini-search.ts", import.meta.url).href;

const EXPECTED_AUTO_ORDER = [
	"searxng", "openai", "exa", "brave", "parallel", "tinyfish",
	"search1api", "searchinfinity", "querit", "tavily", "firecrawl",
	"jina", "serpdive", "kagi", "bocha", "ollama", "perplexity", "gemini",
];

const EXPECTED_ALL_ORDER = [
	"searxng", "openai", "exa", "brave", "parallel", "tinyfish",
	"search1api", "searchinfinity", "querit", "tavily", "firecrawl",
	"jina", "serpdive", "kagi", "ollama", "perplexity", "gemini", "bocha",
];

const EXPECTED_CURATOR_ORDER = [
	"openai", "exa", "brave", "parallel", "parallel-mcp", "tinyfish",
	"search1api", "searchinfinity", "querit", "tavily", "firecrawl",
	"jina", "serpdive", "kagi", "bocha", "ollama", "searxng",
	"duckduckgo", "perplexity", "gemini", "anysearch", "xai",
	"brightdata", "serpbase", "serper", "valyu",
];

const PROVIDER_SOURCE_FILES = {
	openai: ["openai-search.ts"],
	exa: ["exa.ts"],
	brave: ["brave.ts"],
	parallel: ["parallel.ts"],
	"parallel-mcp": ["parallel-mcp.ts", "parallel.ts"],
	tinyfish: ["tinyfish.ts"],
	search1api: ["search1api.ts"],
	searchinfinity: ["searchinfinity.ts"],
	querit: ["querit.ts"],
	tavily: ["tavily.ts"],
	firecrawl: ["firecrawl.ts"],
	jina: ["jina-search.ts"],
	serpdive: ["serpdive.ts"],
	kagi: ["kagi.ts"],
	bocha: ["bocha.ts"],
	ollama: ["ollama.ts"],
	searxng: ["searxng.ts"],
	duckduckgo: ["duckduckgo.ts"],
	perplexity: ["perplexity.ts"],
	gemini: ["gemini-api.ts", "gemini-web-config.ts", "gemini-web.ts"],
	anysearch: ["anysearch.ts"],
	xai: ["xai-search.ts"],
	brightdata: ["brightdata.ts"],
	serpbase: ["serpbase.ts"],
	serper: ["serper.ts"],
	valyu: ["valyu.ts"],
};

test("provider descriptor preserves upstream auto and all ordering", async () => {
	const {
		getAllSearchProviderOrder,
		getAutoSearchProviderOrder,
		RESOLVED_SEARCH_PROVIDERS,
		SEARCH_PROVIDER_RUNTIME_DEFINITIONS,
	} = await import(searchModuleUrl);

	assert.deepEqual(getAutoSearchProviderOrder(), EXPECTED_AUTO_ORDER);
	assert.deepEqual(getAllSearchProviderOrder(), EXPECTED_ALL_ORDER);
	assert.equal(new Set(RESOLVED_SEARCH_PROVIDERS).size, RESOLVED_SEARCH_PROVIDERS.length);
	assert.deepEqual(
		SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map(({ id }) => id),
		RESOLVED_SEARCH_PROVIDERS,
	);
	for (const descriptor of SEARCH_PROVIDER_RUNTIME_DEFINITIONS) {
		assert.equal(
			descriptor.allOrder === null,
			descriptor.all === "excluded",
			`${descriptor.id} all participation and order must agree`,
		);
	}
});

test("provider descriptor preserves Curator-native order and labels", async () => {
	const { getSearchProviderPresentation } = await import(searchModuleUrl);
	const presentation = getSearchProviderPresentation();
	assert.deepEqual(presentation.map(({ id }) => id), EXPECTED_CURATOR_ORDER);
	assert.equal(presentation.find(({ id }) => id === "jina")?.curatorLabel, "Jina");
	assert.equal(presentation.find(({ id }) => id === "ollama")?.curatorLabel, "Ollama");
});

test("Gemini owns auto-always and all-API-only availability semantics", async () => {
	const { SEARCH_PROVIDER_RUNTIME_DEFINITIONS } = await import(searchModuleUrl);
	const gemini = SEARCH_PROVIDER_RUNTIME_DEFINITIONS.find(({ id }) => id === "gemini");
	assert.ok(gemini);
	assert.equal(gemini.all, "api-only");
	assert.equal(await gemini.isAvailableForAuto({}), true);
	assert.equal(typeof gemini.isAvailableForAll, "function");
});

test("credential-blind presentation fields are backed by each provider's real read path", async () => {
	const { SEARCH_PROVIDER_RUNTIME_DEFINITIONS } = await import(searchModuleUrl);
	assert.deepEqual(
		Object.keys(PROVIDER_SOURCE_FILES).sort(),
		SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map(({ id }) => id).sort(),
	);

	for (const descriptor of SEARCH_PROVIDER_RUNTIME_DEFINITIONS) {
		const source = (await Promise.all(
			PROVIDER_SOURCE_FILES[descriptor.id].map((file) =>
				readFile(new URL(`../${file}`, import.meta.url), "utf8")
			),
		)).join("\n");
		for (const field of descriptor.fields) {
			assert.match(source, new RegExp(`\\b${field.configKey}\\b`), `${descriptor.id}.${field.configKey}`);
			if (field.environmentVariable) {
				assert.match(source, new RegExp(`\\b${field.environmentVariable}\\b`), `${descriptor.id}.${field.environmentVariable}`);
			}
		}
	}
});

test("cost hints do not claim a permanent free tier", async () => {
	const { SEARCH_PROVIDER_RUNTIME_DEFINITIONS } = await import(searchModuleUrl);
	const allowed = new Set(["keyless-shared-quota", "may-charge", "provider-dependent"]);
	for (const descriptor of SEARCH_PROVIDER_RUNTIME_DEFINITIONS) {
		assert.equal(allowed.has(descriptor.costHint), true, descriptor.id);
	}
});

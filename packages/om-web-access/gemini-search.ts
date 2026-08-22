import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { activityMonitor } from "./activity.ts";
import { CredentialResolutionError } from "./credential-source.ts";
import { getApiKey, getVersionedApiBase, fetchGeminiApi, isGatewayConfigured, isGeminiApiAvailable, redactGeminiApiResponse } from "./gemini-api.ts";
import { getGeminiWebAvailabilityDiagnostic, isGeminiWebAvailable, queryWithCookies } from "./gemini-web.ts";
import { isPerplexityAvailable, searchWithPerplexity, type SearchResult, type SearchResponse, type SearchOptions } from "./perplexity.ts";
import { isExaAvailable, searchWithExa } from "./exa.ts";
import { isBraveAvailable, searchWithBrave } from "./brave.ts";
import { isOpenAISearchAvailable, searchWithOpenAI } from "./openai-search.ts";
import { isParallelAvailable, searchWithParallel } from "./parallel.ts";
import { isParallelMcpAvailable, searchWithParallelMcp } from "./parallel-mcp.ts";
import { isTinyFishAvailable, searchWithTinyFish } from "./tinyfish.ts";
import { isSearch1APIAvailable, searchWithSearch1API } from "./search1api.ts";
import { isSearchinfinityAvailable, searchWithSearchinfinity } from "./searchinfinity.ts";
import { isQueritAvailable, searchWithQuerit } from "./querit.ts";
import { isTavilyAvailable, searchWithTavily } from "./tavily.ts";
import { isFirecrawlAvailable, searchWithFirecrawl } from "./firecrawl.ts";
import { isJinaSearchAvailable, searchWithJina } from "./jina-search.ts";
import { isSerpdiveAvailable, searchWithSerpdive } from "./serpdive.ts";
import { isKagiAvailable, searchWithKagi } from "./kagi.ts";
import { isBochaAvailable, searchWithBocha } from "./bocha.ts";
import { isOllamaAvailable, searchWithOllama } from "./ollama.ts";
import { isSearXNGAvailable, searchWithSearXNG } from "./searxng.ts";
import { isDuckDuckGoAvailable, searchWithDuckDuckGo } from "./duckduckgo.ts";
import { isAnySearchAvailable, searchWithAnySearch } from "./anysearch.ts";
import { isXaiSearchAvailable, searchWithXai } from "./xai-search.ts";
import { isBrightDataAvailable, searchWithBrightData } from "./brightdata.ts";
import { isSerpBaseAvailable, searchWithSerpBase } from "./serpbase.ts";
import { isSerperAvailable, searchWithSerper } from "./serper.ts";
import { isValyuAvailable, searchWithValyu } from "./valyu.ts";
import { getWebSearchConfigPath, readWebSearchConfig } from "./utils.ts";

type ProviderConfigFieldKind = "secret" | "url" | "text";
type ProviderConfigFieldRole = "api-key" | "endpoint" | "model" | "zone";
type ProviderPrerequisite = "none" | "optional-key" | "key" | "endpoint" | "key-or-session" | "gemini";
type ProviderCostHint = "keyless-shared-quota" | "may-charge" | "provider-dependent";

export interface SearchProviderConfigFieldDescriptor {
	readonly id: string;
	readonly configKey: string;
	readonly kind: ProviderConfigFieldKind;
	readonly role: ProviderConfigFieldRole;
	readonly required: boolean;
	readonly environmentVariable?: string;
	readonly qualifier?: string;
}

interface SearchProviderRuntimeOptions extends SearchOptions {
	readonly includeContent?: boolean;
	readonly extensionContext?: ExtensionContext;
}

export type SearchProviderIcon =
	| {
		readonly kind: "neutral";
		readonly assetId: null;
		readonly admission: "not-admitted";
	}
	| {
		readonly kind: "local-asset";
		readonly assetId: string;
		readonly assetPath: string;
		readonly admission: "admitted";
	};

interface SearchProviderRuntimeDescriptor<Id extends string = string> {
	readonly id: Id;
	readonly displayName: string;
	readonly curatorLabel?: string;
	readonly curatorOrder: number;
	readonly prerequisite: ProviderPrerequisite;
	readonly costHint: ProviderCostHint;
	readonly autoOrder: number | null;
	readonly allOrder: number | null;
	readonly all: "included" | "excluded" | "api-only";
	readonly fields: readonly SearchProviderConfigFieldDescriptor[];
	readonly advancedFileOnly: readonly string[];
	readonly icon: SearchProviderIcon;
	readonly isStructurallyPossible?: (
		config: Readonly<Record<string, unknown>>,
		configured: boolean,
	) => boolean;
	readonly autoEligible?: (options: SearchProviderRuntimeOptions) => boolean;
	readonly autoCredentialFailureIsFatal?: boolean;
	readonly isAvailable: (options: SearchProviderRuntimeOptions) => boolean | Promise<boolean>;
	readonly isAvailableForAuto?: (options: SearchProviderRuntimeOptions) => boolean | Promise<boolean>;
	readonly isAvailableForAll?: (options: SearchProviderRuntimeOptions) => boolean | Promise<boolean>;
	readonly search: (query: string, options: SearchProviderRuntimeOptions) => Promise<SearchResponse>;
	readonly searchForAuto?: (query: string, options: SearchProviderRuntimeOptions) => Promise<SearchResponse>;
	readonly searchForAll?: (query: string, options: SearchProviderRuntimeOptions) => Promise<SearchResponse>;
}

const admittedProviderIcon = (assetId: string, extension = "svg"): SearchProviderIcon => ({
	kind: "local-asset",
	assetId,
	assetPath: `/web-access/provider-icons/${assetId}.${extension}`,
	admission: "admitted",
});

const keyField = (
	configKey: string,
	environmentVariable: string,
	qualifier?: string,
): SearchProviderConfigFieldDescriptor => ({
	id: configKey,
	configKey,
	kind: "secret",
	role: "api-key",
	required: true,
	environmentVariable,
	...(qualifier ? { qualifier } : {}),
});

const optionalKeyField = (
	configKey: string,
	environmentVariable: string,
	qualifier?: string,
): SearchProviderConfigFieldDescriptor => ({
	...keyField(configKey, environmentVariable, qualifier),
	required: false,
});

const textField = (
	configKey: string,
	role: Extract<ProviderConfigFieldRole, "endpoint" | "model" | "zone">,
	options: { readonly required?: boolean; readonly environmentVariable?: string; readonly qualifier?: string } = {},
): SearchProviderConfigFieldDescriptor => ({
	id: configKey,
	configKey,
	kind: role === "endpoint" ? "url" : "text",
	role,
	required: options.required ?? false,
	...(options.environmentVariable ? { environmentVariable: options.environmentVariable } : {}),
	...(options.qualifier ? { qualifier: options.qualifier } : {}),
});
export type SearchProviderErrorKind =
	| "transient"
	| "quota"
	| "network"
	| "credential"
	| "config"
	| "auth"
	| "invalid-request"
	| "invalid-response"
	| "aborted"
	| "unknown";

export interface SearchRoutingConfig {
	providers: ResolvedSearchProvider[];
	fallbackOn: Array<Extract<SearchProviderErrorKind, "transient" | "quota" | "network" | "invalid-response">>;
}

export class SearchProviderError extends Error {
	readonly provider: ResolvedSearchProvider;
	readonly kind: SearchProviderErrorKind;
	readonly status?: number;
	readonly causeError: unknown;

	constructor(
		provider: ResolvedSearchProvider,
		kind: SearchProviderErrorKind,
		message: string,
		status: number | undefined,
		cause: unknown,
	) {
		super(`${provider} search failed (${kind}): ${message}`);
		this.name = "SearchProviderError";
		this.provider = provider;
		this.kind = kind;
		this.status = status;
		this.causeError = cause;
	}
}

export interface SearchRouteFailure {
	readonly provider: ResolvedSearchProvider;
	readonly kind: SearchProviderErrorKind;
	readonly error: string;
}

/** Auto or configured routing exhausted every structurally eligible candidate. */
export class SearchRouteExhaustedError extends Error {
	readonly failures: readonly SearchRouteFailure[];
	readonly route: "auto" | "configured";
	readonly structuralCandidateCount: number;

	constructor(
		message: string,
		failures: readonly SearchRouteFailure[],
		route: "auto" | "configured" = "auto",
		structuralCandidateCount = failures.length,
	) {
		super(message);
		this.name = "SearchRouteExhaustedError";
		this.failures = failures;
		this.route = route;
		this.structuralCandidateCount = structuralCandidateCount;
	}
}

export interface ProviderSearchResponse extends SearchResponse {
	provider: ResolvedSearchProvider;
}

export interface ProviderSearchFailure {
	provider: ResolvedSearchProvider;
	error: string;
}

export interface AttributedSearchResponse extends SearchResponse {
	provider: ResolvedSearchProvider | "all";
	providerResponses?: ProviderSearchResponse[];
	providerErrors?: ProviderSearchFailure[];
}

const configPath = () => getWebSearchConfigPath();
const DEFAULT_SEARCH_MODEL = "gemini-3.6-flash";
const VALID_ROUTING_KINDS = ["transient", "quota", "network", "invalid-response"] as const;

type SearchConfig = {
	searchProvider: SearchProviderSelection;
	searchProviderConfigured: boolean;
	searchRouting?: SearchRoutingConfig;
	searchModel?: string;
};

function getSearchConfig(): SearchConfig {
	const raw = readWebSearchConfig();

	const searchModel = normalizeSearchModel(raw.searchModel);
	const searchProvider = normalizeSearchProviderSelection(
		raw.searchProvider ?? raw.provider,
		`provider in ${configPath()}`,
	);
	const searchProviderConfigured =
		(Object.hasOwn(raw, "searchProvider") || Object.hasOwn(raw, "provider")) &&
		searchProvider !== "auto";
	return {
		searchProvider,
		searchProviderConfigured,
		...(Object.hasOwn(raw, "searchRouting") ? { searchRouting: normalizeSearchRouting(raw.searchRouting) } : {}),
		...(searchModel ? { searchModel } : {}),
	};
}

function normalizeSearchRouting(value: unknown): SearchRoutingConfig {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`searchRouting in ${configPath()} must be an object`);
	}
	const raw = value as Record<string, unknown>;
	const providers = normalizeResolvedProviderList(raw.providers, `searchRouting.providers in ${configPath()}`);
	if (!Array.isArray(raw.fallbackOn) || raw.fallbackOn.length === 0) {
		throw new Error(`searchRouting.fallbackOn in ${configPath()} must be a non-empty array`);
	}
	const fallbackOn: SearchRoutingConfig["fallbackOn"] = [];
	for (const kind of raw.fallbackOn) {
		if (typeof kind !== "string" || !VALID_ROUTING_KINDS.includes(kind as typeof VALID_ROUTING_KINDS[number])) {
			throw new Error(`searchRouting.fallbackOn in ${configPath()} may only contain transient, quota, network, or invalid-response`);
		}
		if (!fallbackOn.includes(kind as SearchRoutingConfig["fallbackOn"][number])) {
			fallbackOn.push(kind as SearchRoutingConfig["fallbackOn"][number]);
		}
	}
	return { providers, fallbackOn };
}

export function getConfiguredSearchRouting(): SearchRoutingConfig | undefined {
	const config = getSearchConfig();
	return config.searchProviderConfigured ? undefined : config.searchRouting;
}

function normalizeSearchModel(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function normalizeResolvedProviderList(value: unknown, label: string): ResolvedSearchProvider[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`${label} must be a non-empty array`);
	}
	const providers: ResolvedSearchProvider[] = [];
	for (const provider of value) {
		const normalized = typeof provider === "string" ? provider.trim().toLowerCase() : "";
		if (!RESOLVED_SEARCH_PROVIDERS.includes(normalized as ResolvedSearchProvider)) {
			throw new Error(`${label} contains an invalid provider: ${String(provider)}`);
		}
		if (providers.includes(normalized as ResolvedSearchProvider)) {
			throw new Error(`${label} must not contain duplicates: ${normalized}`);
		}
		providers.push(normalized as ResolvedSearchProvider);
	}
	return providers;
}

export function normalizeSearchProviderSelection(value: unknown, label = "provider"): SearchProviderSelection {
	if (Array.isArray(value)) return normalizeResolvedProviderList(value, label);
	const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
	return SEARCH_PROVIDERS.includes(normalized as SearchProvider) ? normalized as SearchProvider : "auto";
}

export interface FullSearchOptions extends SearchOptions {
	provider?: SearchProviderSelection;
	includeContent?: boolean;
	extensionContext?: ExtensionContext;
}

function requireProviderResult(provider: string, result: SearchResponse | null): SearchResponse {
	if (result) return result;
	throw new Error(`${provider} search returned no results.`);
}

/**
 * The exact runtime definition is also the sole source of the credential-blind
 * Settings/Curator projection. A provider must not be added to routing without
 * acquiring a visible identity and deterministic neutral asset fallback here.
 */
export const SEARCH_PROVIDER_RUNTIME_DEFINITIONS = [
	{
		id: "openai", displayName: "OpenAI", prerequisite: "key-or-session", costHint: "provider-dependent",
		curatorOrder: 0,
		autoOrder: 1, allOrder: 1, all: "included", icon: admittedProviderIcon("openai"),
		fields: [keyField("openaiApiKey", "OPENAI_API_KEY"), textField("openaiSearchModel", "model")],
		advancedFileOnly: ["openaiResponsesBaseUrl", "openaiSearchProviders"],
		autoEligible: shouldTryOpenAIInAuto,
		isAvailable: (options) => isOpenAISearchAvailable(options.extensionContext),
		search: (query, options) => searchWithOpenAI(query, options, options.extensionContext),
	},
	{
		id: "exa", displayName: "Exa", prerequisite: "optional-key", costHint: "keyless-shared-quota",
		curatorOrder: 1,
		autoOrder: 2, allOrder: 2, all: "included", icon: admittedProviderIcon("exa"),
		fields: [optionalKeyField("exaApiKey", "EXA_API_KEY"), textField("exaBaseUrl", "endpoint", { environmentVariable: "EXA_BASE_URL" })],
		advancedFileOnly: [], autoCredentialFailureIsFatal: true,
		isAvailable: () => isExaAvailable(),
		search: async (query, options) => requireProviderResult("Exa", await searchWithExa(query, options)),
	},
	{
		id: "brave", displayName: "Brave", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 2,
		autoOrder: 3, allOrder: 3, all: "included", icon: admittedProviderIcon("brave"),
		fields: [keyField("braveApiKey", "BRAVE_API_KEY"), textField("braveBaseUrl", "endpoint", { environmentVariable: "BRAVE_BASE_URL" })],
		advancedFileOnly: [], isAvailable: () => isBraveAvailable(), search: searchWithBrave,
	},
	{
		id: "parallel", displayName: "Parallel", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 3,
		autoOrder: 4, allOrder: 4, all: "included", icon: admittedProviderIcon("parallel"),
		fields: [keyField("parallelApiKey", "PARALLEL_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isParallelAvailable(), search: searchWithParallel,
	},
	{
		id: "parallel-mcp", displayName: "Parallel MCP", prerequisite: "optional-key", costHint: "keyless-shared-quota",
		curatorOrder: 4,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("parallel"),
		fields: [optionalKeyField("parallelApiKey", "PARALLEL_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isParallelMcpAvailable(), search: searchWithParallelMcp,
	},
	{
		id: "tinyfish", displayName: "TinyFish", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 5,
		autoOrder: 5, allOrder: 5, all: "included", icon: admittedProviderIcon("tinyfish", "png"),
		fields: [keyField("tinyfishApiKey", "TINYFISH_API_KEY")], advancedFileOnly: ["tinyfish"],
		isAvailable: () => isTinyFishAvailable(), search: searchWithTinyFish,
	},
	{
		id: "search1api", displayName: "Search1API", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 6,
		autoOrder: 6, allOrder: 6, all: "included", icon: admittedProviderIcon("search1api"),
		fields: [keyField("search1apiApiKey", "SEARCH1API_KEY")], advancedFileOnly: ["search1api"],
		isAvailable: () => isSearch1APIAvailable(), search: searchWithSearch1API,
	},
	{
		id: "searchinfinity", displayName: "Searchinfinity", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 7,
		autoOrder: 7, allOrder: 7, all: "included", icon: admittedProviderIcon("searchinfinity", "png"),
		fields: [keyField("searchinfinityApiKey", "SEARCHINFINITY_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isSearchinfinityAvailable(), search: searchWithSearchinfinity,
	},
	{
		id: "querit", displayName: "Querit", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 8,
		autoOrder: 8, allOrder: 8, all: "included", icon: admittedProviderIcon("querit", "png"),
		fields: [keyField("queritApiKey", "QUERIT_API_KEY")], advancedFileOnly: ["querit"],
		isAvailable: () => isQueritAvailable(), search: searchWithQuerit,
	},
	{
		id: "tavily", displayName: "Tavily", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 9,
		autoOrder: 9, allOrder: 9, all: "included", icon: admittedProviderIcon("tavily"),
		fields: [keyField("tavilyApiKey", "TAVILY_API_KEY"), textField("tavilyBaseUrl", "endpoint", { environmentVariable: "TAVILY_BASE_URL" })],
		advancedFileOnly: [], isAvailable: () => isTavilyAvailable(), search: searchWithTavily,
	},
	{
		id: "firecrawl", displayName: "Firecrawl", prerequisite: "endpoint", costHint: "provider-dependent",
		curatorOrder: 10,
		autoOrder: 10, allOrder: 10, all: "included", icon: admittedProviderIcon("firecrawl"),
		fields: [textField("firecrawlBaseUrl", "endpoint", { required: true, environmentVariable: "FIRECRAWL_BASE_URL" }), optionalKeyField("firecrawlApiKey", "FIRECRAWL_API_KEY")],
		advancedFileOnly: ["firecrawlApiVersion", "firecrawlFreshScrape"],
		isAvailable: () => isFirecrawlAvailable(), search: searchWithFirecrawl,
	},
	{
		id: "jina", displayName: "Jina Search", curatorLabel: "Jina", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 11,
		autoOrder: 11, allOrder: 11, all: "included", icon: admittedProviderIcon("jina"),
		fields: [keyField("jinaApiKey", "JINA_API_KEY")], advancedFileOnly: ["jina"],
		isAvailable: () => isJinaSearchAvailable(), search: searchWithJina,
	},
	{
		id: "serpdive", displayName: "SERPdive", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 12,
		autoOrder: 12, allOrder: 12, all: "included", icon: admittedProviderIcon("serpdive", "png"),
		fields: [keyField("serpdiveApiKey", "SERPDIVE_API_KEY"), textField("serpdiveModel", "model", { environmentVariable: "SERPDIVE_MODEL" })],
		advancedFileOnly: [], isAvailable: () => isSerpdiveAvailable(), search: searchWithSerpdive,
	},
	{
		id: "kagi", displayName: "Kagi", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 13,
		autoOrder: 13, allOrder: 13, all: "included", icon: admittedProviderIcon("kagi"),
		fields: [keyField("kagiApiKey", "KAGI_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isKagiAvailable(), search: searchWithKagi,
	},
	{
		id: "bocha", displayName: "Bocha", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 14,
		autoOrder: 14, allOrder: 17, all: "included", icon: admittedProviderIcon("bocha"),
		fields: [keyField("bochaApiKey", "BOCHA_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isBochaAvailable(), search: searchWithBocha,
	},
	{
		id: "ollama", displayName: "Ollama Cloud", curatorLabel: "Ollama", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 15,
		autoOrder: 15, allOrder: 14, all: "included", icon: admittedProviderIcon("ollama"),
		fields: [keyField("ollamaApiKey", "OLLAMA_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isOllamaAvailable(), search: searchWithOllama,
	},
	{
		id: "searxng", displayName: "SearXNG", prerequisite: "endpoint", costHint: "provider-dependent",
		curatorOrder: 16,
		autoOrder: 0, allOrder: 0, all: "included", icon: admittedProviderIcon("searxng"),
		fields: [textField("searxngBaseUrl", "endpoint", { required: true, environmentVariable: "SEARXNG_BASE_URL" })],
		advancedFileOnly: ["searxngHeaders", "ssrf"], isAvailable: () => isSearXNGAvailable(), search: searchWithSearXNG,
	},
	{
		id: "duckduckgo", displayName: "DuckDuckGo", prerequisite: "none", costHint: "keyless-shared-quota",
		curatorOrder: 17,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("duckduckgo"), fields: [], advancedFileOnly: [],
		isAvailable: () => isDuckDuckGoAvailable(), search: searchWithDuckDuckGo,
	},
	{
		id: "perplexity", displayName: "Perplexity", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 18,
		autoOrder: 16, allOrder: 15, all: "included", icon: admittedProviderIcon("perplexity"),
		fields: [keyField("perplexityApiKey", "PERPLEXITY_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isPerplexityAvailable(), search: searchWithPerplexity,
	},
	{
		id: "gemini", displayName: "Gemini", prerequisite: "gemini", costHint: "provider-dependent",
		curatorOrder: 19,
		autoOrder: 17, allOrder: 16, all: "api-only", icon: admittedProviderIcon("gemini"),
		fields: [optionalKeyField("geminiApiKey", "GEMINI_API_KEY", "Gemini"), textField("geminiBaseUrl", "endpoint", { environmentVariable: "GOOGLE_GEMINI_BASE_URL", qualifier: "Gemini" }), optionalKeyField("cloudflareApiKey", "CLOUDFLARE_API_KEY", "Cloudflare")],
		advancedFileOnly: ["allowBrowserCookies", "chromeProfile", "geminiWebModel"],
		isStructurallyPossible: (config, configured) => configured || config.allowBrowserCookies === true,
		isAvailable: async () => isGeminiApiAvailable() || !!(await isGeminiWebAvailable()),
		isAvailableForAuto: () => true,
		isAvailableForAll: () => isGeminiApiAvailable(),
		search: async (query, options) => requireProviderResult("Gemini", await searchWithGemini(query, options, true)),
		searchForAuto: async (query, options) => requireProviderResult("Gemini", await searchWithGemini(query, options, false)),
		searchForAll: async (query, options) => requireProviderResult("Gemini API", await searchWithGeminiApi(query, options)),
	},
	{
		id: "anysearch", displayName: "AnySearch", prerequisite: "optional-key", costHint: "keyless-shared-quota",
		curatorOrder: 20,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("anysearch", "ico"),
		fields: [optionalKeyField("anysearchApiKey", "ANYSEARCH_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isAnySearchAvailable(), search: searchWithAnySearch,
	},
	{
		id: "xai", displayName: "xAI", prerequisite: "key-or-session", costHint: "provider-dependent",
		curatorOrder: 21,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("xai"),
		fields: [optionalKeyField("xaiApiKey", "XAI_API_KEY"), textField("xaiSearchModel", "model")], advancedFileOnly: [],
		isAvailable: (options) => isXaiSearchAvailable(options.extensionContext),
		search: (query, options) => searchWithXai(query, options, options.extensionContext),
	},
	{
		id: "brightdata", displayName: "Bright Data", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 22,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("bright-data", "png"),
		fields: [keyField("brightdataApiKey", "BRIGHTDATA_API_KEY"), textField("brightdataSerpZone", "zone", { required: true, environmentVariable: "BRIGHTDATA_SERP_ZONE", qualifier: "SERP" })],
		advancedFileOnly: ["brightdataUnlockerZone"], isAvailable: () => isBrightDataAvailable(), search: searchWithBrightData,
	},
	{
		id: "serpbase", displayName: "SerpBase", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 23,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("serpbase"),
		fields: [keyField("serpbaseApiKey", "SERPBASE_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isSerpBaseAvailable(), search: searchWithSerpBase,
	},
	{
		id: "serper", displayName: "Serper", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 24,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("serper", "png"),
		fields: [keyField("serperApiKey", "SERPER_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isSerperAvailable(), search: searchWithSerper,
	},
	{
		id: "valyu", displayName: "Valyu", prerequisite: "key", costHint: "may-charge",
		curatorOrder: 25,
		autoOrder: null, allOrder: null, all: "excluded", icon: admittedProviderIcon("valyu", "ico"),
		fields: [keyField("valyuApiKey", "VALYU_API_KEY")], advancedFileOnly: [],
		isAvailable: () => isValyuAvailable(), search: searchWithValyu,
	},
] as const satisfies readonly SearchProviderRuntimeDescriptor[];

export type ResolvedSearchProvider = typeof SEARCH_PROVIDER_RUNTIME_DEFINITIONS[number]["id"];
export const RESOLVED_SEARCH_PROVIDERS = SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map(({ id }) => id) as readonly ResolvedSearchProvider[];
export const SEARCH_PROVIDERS = ["auto", "all", ...RESOLVED_SEARCH_PROVIDERS] as const;
export type SearchProvider = typeof SEARCH_PROVIDERS[number];
export type SearchProviderSelection = SearchProvider | ResolvedSearchProvider[];
export type SearchProviderAvailability = Record<ResolvedSearchProvider | "all", boolean>;

export interface SearchProviderPresentation {
	readonly id: ResolvedSearchProvider;
	readonly displayName: string;
	readonly curatorLabel: string;
	readonly prerequisite: ProviderPrerequisite;
	readonly costHint: ProviderCostHint;
	readonly participation: {
		readonly auto: boolean;
		readonly all: "included" | "excluded" | "api-only";
		readonly explicitOnly: boolean;
	};
	readonly fields: readonly SearchProviderConfigFieldDescriptor[];
	readonly advancedFileOnly: readonly string[];
	readonly icon: SearchProviderIcon;
}

export function getSearchProviderPresentation(): readonly SearchProviderPresentation[] {
	return [...SEARCH_PROVIDER_RUNTIME_DEFINITIONS]
		.sort((left, right) => left.curatorOrder - right.curatorOrder)
		.map((descriptor) => ({
		id: descriptor.id,
		displayName: descriptor.displayName,
		curatorLabel: "curatorLabel" in descriptor ? descriptor.curatorLabel : descriptor.displayName,
		prerequisite: descriptor.prerequisite,
		costHint: descriptor.costHint,
		participation: {
			auto: descriptor.autoOrder !== null,
			all: descriptor.all,
			explicitOnly: descriptor.autoOrder === null && descriptor.all === "excluded",
		},
		fields: descriptor.fields,
		advancedFileOnly: descriptor.advancedFileOnly,
		icon: descriptor.icon,
	}));
}

export function isSearchProviderStructurallyPossible(
	provider: ResolvedSearchProvider,
	config: Readonly<Record<string, unknown>>,
	configured: boolean,
): boolean {
	const descriptor = runtimeDescriptor(provider);
	return descriptor.isStructurallyPossible?.(config, configured) ?? (
		descriptor.prerequisite === "none"
		|| descriptor.prerequisite === "optional-key"
		|| configured
	);
}

export async function getSearchProviderAvailability(
	options: SearchProviderRuntimeOptions = {},
): Promise<SearchProviderAvailability> {
	const entries = await Promise.all(
		SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map(async (descriptor) => [
			descriptor.id,
			await descriptor.isAvailable(options),
		] as const),
	);
	const available = Object.fromEntries(entries) as Record<ResolvedSearchProvider, boolean>;
	const allAvailability = await Promise.all(
		ALL_SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map((descriptor) =>
			descriptor.isAvailableForAll
				? descriptor.isAvailableForAll(options)
				: available[descriptor.id]
		),
	);
	const all = allAvailability.some(Boolean);
	return { all, ...available };
}

export function getAutoSearchProviderOrder(options: { readonly preferOpenAI?: boolean } = {}): readonly ResolvedSearchProvider[] {
	return AUTO_SEARCH_PROVIDER_RUNTIME_DEFINITIONS
		.filter((descriptor) => descriptor.id !== "openai" || options.preferOpenAI !== false)
		.map((descriptor) => descriptor.id);
}

function runtimeDescriptor(provider: ResolvedSearchProvider): SearchProviderRuntimeDescriptor<ResolvedSearchProvider> {
	const descriptor = SEARCH_PROVIDER_RUNTIME_DEFINITIONS.find((candidate) => candidate.id === provider);
	if (!descriptor) throw new Error(`Unknown search provider: ${provider}`);
	return descriptor as SearchProviderRuntimeDescriptor<ResolvedSearchProvider>;
}

const AUTO_SEARCH_PROVIDER_RUNTIME_DEFINITIONS: readonly SearchProviderRuntimeDescriptor<ResolvedSearchProvider>[] = SEARCH_PROVIDER_RUNTIME_DEFINITIONS
	.filter((descriptor) => descriptor.autoOrder !== null)
	.sort((left, right) => (left.autoOrder ?? 0) - (right.autoOrder ?? 0));

// Explicit-only providers are absent by descriptor contract. Gemini's all-mode
// executor is API-only and never falls through to browser cookies.
const ALL_SEARCH_PROVIDER_RUNTIME_DEFINITIONS: readonly SearchProviderRuntimeDescriptor<ResolvedSearchProvider>[] = SEARCH_PROVIDER_RUNTIME_DEFINITIONS
	.filter((descriptor) => descriptor.all !== "excluded")
	.sort((left, right) => (left.allOrder ?? 0) - (right.allOrder ?? 0));

export function getAllSearchProviderOrder(): readonly ResolvedSearchProvider[] {
	return ALL_SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map((descriptor) => descriptor.id);
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function isAbortError(err: unknown): boolean {
	return errorMessage(err).toLowerCase().includes("abort");
}

function shouldTryOpenAIInAuto(options: SearchOptions): boolean {
	if (options.recencyFilter) return false;
	if (typeof options.numResults === "number" && Number.isFinite(options.numResults) && Math.floor(options.numResults) !== 5) {
		return false;
	}
	return true;
}

async function searchWithGemini(
	query: string,
	options: SearchOptions,
	strictErrors: boolean,
): Promise<SearchResponse | null> {
	const errors: string[] = [];

	try {
		const apiResult = await searchWithGeminiApi(query, options);
		if (apiResult) return apiResult;
	} catch (err) {
		if (err instanceof CredentialResolutionError || isAbortError(err)) throw err;
		errors.push(`Gemini API: ${errorMessage(err)}`);
	}

	try {
		const webResult = await searchWithGeminiWeb(query, options);
		if (webResult) return webResult;
		const diagnostic = getGeminiWebAvailabilityDiagnostic();
		if (diagnostic) errors.push(`Gemini Web: ${diagnostic}`);
	} catch (err) {
		if (isAbortError(err)) throw err;
		errors.push(`Gemini Web: ${errorMessage(err)}`);
	}

	if (strictErrors && errors.length > 0) {
		throw new Error(`Gemini search failed:\n  - ${errors.join("\n  - ")}`);
	}

	return null;
}

function providerErrorStatus(message: string): number | undefined {
	const match = message.match(/\b(?:error|status|http)\s+(\d{3})\b/i);
	if (!match) return undefined;
	return Number(match[1]);
}

function classifyProviderError(provider: ResolvedSearchProvider, err: unknown): SearchProviderError {
	if (err instanceof SearchProviderError) return err;
	const message = errorMessage(err);
	const lower = message.toLowerCase();
	const status = providerErrorStatus(message);
	let kind: SearchProviderErrorKind = "unknown";
	if (err instanceof CredentialResolutionError || /(?:api )?key (?:not found|missing)|credential resolution/.test(lower)) {
		kind = "credential";
	} else if (isAbortError(err)) {
		kind = "aborted";
	} else if (provider === "xai" && status === 403 && /spending[- ]limit|(?:no|out of) credits?|insufficient quota|quota (?:exceeded|exhausted)|credits? (?:exhausted|depleted|used up)/.test(lower)) {
		kind = "quota";
	} else if (status === 401 || status === 403) {
		kind = "auth";
	} else if (status === 400 || status === 422) {
		kind = "invalid-request";
	} else if (status === 402 || status === 429) {
		kind = "quota";
	} else if (status !== undefined && (status === 408 || status === 425 || status >= 500)) {
		kind = "transient";
	} else if (/rate limit|quota|too many requests/.test(lower)) {
		kind = "quota";
	} else if (/unauthorized|forbidden|permission denied/.test(lower)) {
		kind = "auth";
	} else if (/bad request|invalid request/.test(lower)) {
		kind = "invalid-request";
	} else if (/invalid json|no parseable response|no parseable results|invalid response|returned empty response/.test(lower)) {
		kind = "invalid-response";
	} else if (/temporar|service unavailable|server error/.test(lower)) {
		kind = "transient";
	} else if (err instanceof TypeError || /fetch failed|network|econnreset|econnrefused|enotfound|etimedout|timed out|socket/.test(lower)) {
		kind = "network";
	} else if (/invalid or missing|invalid config|failed to parse|must be an? |configuration/.test(lower)) {
		kind = "config";
	}
	return new SearchProviderError(provider, kind, message, status, err);
}

async function searchWithResolvedProvider(
	provider: ResolvedSearchProvider,
	query: string,
	options: FullSearchOptions,
): Promise<AttributedSearchResponse> {
	const result = await runtimeDescriptor(provider).search(query, options);
	return { ...result, provider };
}

async function isResolvedProviderAvailable(provider: ResolvedSearchProvider, options: FullSearchOptions): Promise<boolean> {
	return runtimeDescriptor(provider).isAvailable(options);
}

function providerLabel(provider: ResolvedSearchProvider): string {
	return runtimeDescriptor(provider).displayName;
}

async function searchWithAllProvider(
	provider: ResolvedSearchProvider,
	query: string,
	options: FullSearchOptions,
): Promise<AttributedSearchResponse> {
	const descriptor = runtimeDescriptor(provider);
	const result = await (descriptor.searchForAll ?? descriptor.search)(query, options);
	return { ...result, provider };
}

async function searchWithProviders(
	query: string,
	options: FullSearchOptions,
	selectedProviders?: ResolvedSearchProvider[],
): Promise<AttributedSearchResponse> {
	const providers = selectedProviders ?? (await Promise.all(ALL_SEARCH_PROVIDER_RUNTIME_DEFINITIONS.map(async (descriptor) => ({
		provider: descriptor.id,
		available: await (descriptor.isAvailableForAll ?? descriptor.isAvailable)(options),
	})))).filter((entry) => entry.available).map((entry) => entry.provider);
	if (providers.length === 0) {
		throw new Error("No eligible configured search provider is available for provider \"all\".");
	}

	const settled = await Promise.allSettled(
		providers.map((provider) => selectedProviders
			? searchWithResolvedProvider(provider, query, options)
			: searchWithAllProvider(provider, query, options)),
	);
	if (options.signal?.aborted) throw new Error("Aborted");

	const successes: AttributedSearchResponse[] = [];
	const failures: Array<{ provider: ResolvedSearchProvider; error: string }> = [];
	for (let index = 0; index < settled.length; index++) {
		const outcome = settled[index];
		if (outcome.status === "fulfilled") {
			successes.push(outcome.value);
		} else {
			failures.push({ provider: providers[index], error: errorMessage(outcome.reason) });
		}
	}
	if (successes.length === 0) {
		const label = selectedProviders ? "Selected-provider" : "All-provider";
		throw new Error(`${label} search failed:\n  - ${failures.map(({ provider, error }) => `${providerLabel(provider)}: ${error}`).join("\n  - ")}`);
	}

	const results: SearchResult[] = [];
	const seenResultUrls = new Set<string>();
	const inlineContent: NonNullable<SearchResponse["inlineContent"]> = [];
	const seenInlineUrls = new Set<string>();
	for (const response of successes) {
		for (const result of response.results) {
			if (seenResultUrls.has(result.url)) continue;
			seenResultUrls.add(result.url);
			results.push(result);
		}
		for (const content of response.inlineContent ?? []) {
			if (seenInlineUrls.has(content.url)) continue;
			seenInlineUrls.add(content.url);
			inlineContent.push(content);
		}
	}

	const answerSections = successes.map((response) =>
		`## ${providerLabel(response.provider as ResolvedSearchProvider)}\n\n${response.answer || "(No answer text returned.)"}`
	);
	if (failures.length > 0) {
		answerSections.push(
			`## Provider errors\n\n${failures.map(({ provider, error }) => `- **${providerLabel(provider)}:** ${error}`).join("\n")}`,
		);
	}

	return {
		provider: "all",
		answer: answerSections.join("\n\n"),
		results,
		providerResponses: successes as ProviderSearchResponse[],
		...(failures.length > 0 ? { providerErrors: failures } : {}),
		...(inlineContent.length > 0 ? { inlineContent } : {}),
	};
}

async function searchWithConfiguredRouting(
	query: string,
	options: FullSearchOptions,
	routing: SearchRoutingConfig,
): Promise<AttributedSearchResponse> {
	const diagnostics: string[] = [];
	const failures: SearchRouteFailure[] = [];
	let structuralCandidateCount = 0;
	for (const provider of routing.providers) {
		if (!(await isResolvedProviderAvailable(provider, options))) {
			diagnostics.push(`${provider}: unavailable`);
			continue;
		}
		structuralCandidateCount++;
		try {
			return await searchWithResolvedProvider(provider, query, options);
		} catch (err) {
			const classified = classifyProviderError(provider, err);
			diagnostics.push(`${provider} [${classified.kind}]: ${errorMessage(err)}`);
			failures.push({ provider, kind: classified.kind, error: errorMessage(err) });
			if (!routing.fallbackOn.includes(classified.kind as SearchRoutingConfig["fallbackOn"][number])) {
				throw classified;
			}
		}
	}
	throw new SearchRouteExhaustedError(
		`Configured search routing exhausted:\n  - ${diagnostics.join("\n  - ")}`,
		failures,
		"configured",
		structuralCandidateCount,
	);
}

export async function search(query: string, options: FullSearchOptions = {}): Promise<AttributedSearchResponse> {
	const config = getSearchConfig();
	const provider = options.provider === undefined || options.provider === "auto"
		? config.searchProvider
		: options.provider;
	if (Array.isArray(provider)) {
		return searchWithProviders(query, options, normalizeResolvedProviderList(provider, "provider"));
	}
	if (provider === "all") return searchWithProviders(query, options);
	if (provider !== "auto") return searchWithResolvedProvider(provider, query, options);
	if (!config.searchProviderConfigured && config.searchRouting) {
		return searchWithConfiguredRouting(query, options, config.searchRouting);
	}

	const fallbackFailures: SearchRouteFailure[] = [];
	const recordFallback = (candidate: ResolvedSearchProvider, error: unknown) => {
		const classified = classifyProviderError(candidate, error);
		fallbackFailures.push({
			provider: candidate,
			kind: classified.kind,
			error: errorMessage(error),
		});
	};

	for (const descriptor of AUTO_SEARCH_PROVIDER_RUNTIME_DEFINITIONS) {
		if (descriptor.autoEligible && !descriptor.autoEligible(options)) continue;
		const available = await (descriptor.isAvailableForAuto ?? descriptor.isAvailable)(options);
		if (!available) continue;
		try {
			const result = await (descriptor.searchForAuto ?? descriptor.search)(query, options);
			return { ...result, provider: descriptor.id };
		} catch (err) {
			if (
				isAbortError(err) ||
				(descriptor.autoCredentialFailureIsFatal && err instanceof CredentialResolutionError)
			) {
				throw err;
			}
			recordFallback(descriptor.id, err);
		}
	}

	if (fallbackFailures.length > 0) {
		throw new SearchRouteExhaustedError(
			`Auto provider search failed:\n  - ${fallbackFailures
				.map(({ provider, error }) => `${providerLabel(provider)}: ${error}`)
				.join("\n  - ")}`,
			fallbackFailures,
		);
	}

	throw new SearchRouteExhaustedError(
		"No search provider available. Either:\n" +
		"  1. Use /login to sign in with a Codex subscription for OpenAI web search\n" +
		`  2. Set openaiApiKey, braveApiKey, parallelApiKey, tinyfishApiKey, search1apiApiKey, searchinfinityApiKey, queritApiKey, tavilyApiKey, firecrawlBaseUrl, jinaApiKey, serpdiveApiKey, kagiApiKey, ollamaApiKey, searxngBaseUrl, perplexityApiKey, exaApiKey, geminiApiKey, bochaApiKey, or cloudflareApiKey in ${configPath()}\n` +
		"  3. Set OPENAI_API_KEY, BRAVE_API_KEY, PARALLEL_API_KEY, TINYFISH_API_KEY, SEARCH1API_KEY, SEARCHINFINITY_API_KEY, QUERIT_API_KEY, TAVILY_API_KEY, FIRECRAWL_BASE_URL, JINA_API_KEY, SERPDIVE_API_KEY, KAGI_API_KEY, BOCHA_API_KEY, OLLAMA_API_KEY, SEARXNG_BASE_URL, EXA_API_KEY, PERPLEXITY_API_KEY, GEMINI_API_KEY, or CLOUDFLARE_API_KEY env vars\n" +
		"  4. Set GOOGLE_GEMINI_BASE_URL with CLOUDFLARE_API_KEY for Cloudflare AI Gateway routing\n" +
		"  5. Sign into gemini.google.com in a supported Chromium-based browser\n" +
		"  6. Explicitly select provider: \"anysearch\" for anonymous AnySearch, \"xai\" for Grok, \"brightdata\" with brightdataSerpZone for paid Bright Data SERP, \"serpbase\" or \"serper\" for Google SERP, or \"valyu\" for research search",
		[],
	);
}

async function searchWithGeminiApi(query: string, options: SearchOptions = {}): Promise<SearchResponse | null> {
	const requestSignal = AbortSignal.any([
		AbortSignal.timeout(120000),
		...(options.signal ? [options.signal] : []),
	]);
	const apiKey = await getApiKey(requestSignal);
	if (!apiKey && !isGatewayConfigured()) return null;

	const activityId = activityMonitor.logStart({ type: "api", query });

	try {
		const model = getSearchConfig().searchModel ?? DEFAULT_SEARCH_MODEL;
		const body = {
			contents: [{ role: "user", parts: [{ text: query }] }],
			tools: [{ google_search: {} }],
		};

		const res = await fetchGeminiApi(`${getVersionedApiBase()}/models/${model}:generateContent`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: requestSignal,
		}, apiKey);

		if (!res.ok) {
			const errorText = redactGeminiApiResponse(res, await res.text(), apiKey);
			throw new Error(`Gemini API error ${res.status}: ${errorText.slice(0, 300)}`);
		}

		const data = await res.json() as GeminiSearchResponse;
		activityMonitor.logComplete(activityId, res.status);

		const answer = data.candidates?.[0]?.content?.parts
			?.map(p => p.text).filter(Boolean).join("\n") ?? "";

		const metadata = data.candidates?.[0]?.groundingMetadata;
		const results = await resolveGroundingChunks(metadata?.groundingChunks, options.signal);

		if (!answer && results.length === 0) return null;
		return { answer, results };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.toLowerCase().includes("abort")) {
			activityMonitor.logComplete(activityId, 0);
		} else {
			activityMonitor.logError(activityId, message);
		}
		throw err;
	}
}

async function searchWithGeminiWeb(query: string, options: SearchOptions = {}): Promise<SearchResponse | null> {
	const cookies = await isGeminiWebAvailable();
	if (!cookies) return null;

	const prompt = buildSearchPrompt(query, options);
	const activityId = activityMonitor.logStart({ type: "api", query });

	try {
		const text = await queryWithCookies(prompt, cookies, {
			signal: options.signal,
			timeoutMs: 120000,
		});

		activityMonitor.logComplete(activityId, 200);

		const results = extractSourceUrls(text);
		return { answer: text, results };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.toLowerCase().includes("abort")) {
			activityMonitor.logComplete(activityId, 0);
		} else {
			activityMonitor.logError(activityId, message);
		}
		throw err;
	}
}

function buildSearchPrompt(query: string, options: SearchOptions): string {
	let prompt = `Search the web and answer the following question. Include source URLs for your claims.\nFormat your response as:\n1. A direct answer to the question\n2. Cited sources as markdown links\n\nQuestion: ${query}`;

	if (options.recencyFilter) {
		const labels: Record<string, string> = {
			day: "past 24 hours",
			week: "past week",
			month: "past month",
			year: "past year",
		};
		prompt += `\n\nOnly include results from the ${labels[options.recencyFilter]}.`;
	}

	if (options.domainFilter?.length) {
		const includes = options.domainFilter.filter(d => !d.startsWith("-"));
		const excludes = options.domainFilter.filter(d => d.startsWith("-")).map(d => d.slice(1));
		if (includes.length) prompt += `\n\nOnly cite sources from: ${includes.join(", ")}`;
		if (excludes.length) prompt += `\n\nDo not cite sources from: ${excludes.join(", ")}`;
	}

	return prompt;
}

function extractSourceUrls(markdown: string): SearchResult[] {
	const results: SearchResult[] = [];
	const seen = new Set<string>();
	const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
	for (const match of markdown.matchAll(linkRegex)) {
		const url = match[2];
		if (seen.has(url)) continue;
		seen.add(url);
		results.push({ title: match[1], url, snippet: "" });
	}
	return results;
}

async function resolveGroundingChunks(
	chunks: GroundingChunk[] | undefined,
	signal?: AbortSignal,
): Promise<SearchResult[]> {
	if (!chunks?.length) return [];

	const results: SearchResult[] = [];
	for (const chunk of chunks) {
		if (!chunk.web) continue;
		const title = chunk.web.title || "";
		let url = chunk.web.uri || "";

		if (url.includes("vertexaisearch.cloud.google.com/grounding-api-redirect")) {
			const resolved = await resolveRedirect(url, signal);
			if (resolved) url = resolved;
		}

		if (url) results.push({ title, url, snippet: "" });
	}
	return results;
}

async function resolveRedirect(proxyUrl: string, signal?: AbortSignal): Promise<string | null> {
	try {
		const res = await fetch(proxyUrl, {
			method: "HEAD",
			redirect: "manual",
			signal: AbortSignal.any([
				AbortSignal.timeout(5000),
				...(signal ? [signal] : []),
			]),
		});
		return res.headers.get("location") || null;
	} catch {
		return null;
	}
}

interface GeminiSearchResponse {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: string }> };
		groundingMetadata?: {
			webSearchQueries?: string[];
			groundingChunks?: GroundingChunk[];
			groundingSupports?: Array<{
				segment?: { startIndex?: number; endIndex?: number; text?: string };
				groundingChunkIndices?: number[];
			}>;
		};
	}>;
}

interface GroundingChunk {
	web?: { uri?: string; title?: string };
}

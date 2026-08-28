import { activityMonitor } from "./activity.ts";
import type { ExtractedContent } from "./extract.ts";
import { hasCredentialSource, redactCredential, resolveCredential } from "./credential-source.ts";
import { getWebSearchConfigPath, readWebSearchConfig } from "./utils.ts";
import { scopedValue } from "./runtime-context.ts";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const configPath = () => getWebSearchConfigPath();

const RATE_LIMIT = {
	maxRequests: 10,
	windowMs: 60 * 1000,
};

const requestTimestamps = scopedValue<number[]>("perplexity-request-timestamps", () => []);

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

export interface SearchResponse {
	answer: string;
	results: SearchResult[];
	inlineContent?: ExtractedContent[];
}

export interface SearchOptions {
	numResults?: number;
	recencyFilter?: "day" | "week" | "month" | "year";
	domainFilter?: string[];
	signal?: AbortSignal;
}

interface WebSearchConfig {
	perplexityApiKey?: unknown;
}

function loadConfig(): WebSearchConfig {
	return readWebSearchConfig() as WebSearchConfig;
}

async function getApiKey(signal?: AbortSignal): Promise<string> {
	const key = await resolveCredential({
		provider: "Perplexity",
		configuredValue: loadConfig().perplexityApiKey,
		environmentValue: process.env.PERPLEXITY_API_KEY,
		signal,
	});
	if (!key) {
		throw new Error(
			"Perplexity API key not found. Either:\n" +
			`  1. Create ${configPath()} with { "perplexityApiKey": "your-key" }\n` +
			"  2. Set PERPLEXITY_API_KEY environment variable\n" +
			"Get a key at https://perplexity.ai/settings/api"
		);
	}
	return key;
}

function checkRateLimit(): void {
	const now = Date.now();
	const windowStart = now - RATE_LIMIT.windowMs;

	while (requestTimestamps.value.length > 0 && requestTimestamps.value[0] < windowStart) {
		requestTimestamps.value.shift();
	}

	if (requestTimestamps.value.length >= RATE_LIMIT.maxRequests) {
		const waitMs = requestTimestamps.value[0] + RATE_LIMIT.windowMs - now;
		throw new Error(`Rate limited. Try again in ${Math.ceil(waitMs / 1000)}s`);
	}

	requestTimestamps.value.push(now);
}

function validateDomainFilter(domains: string[]): string[] {
	return domains.filter((d) => {
		const domain = d.startsWith("-") ? d.slice(1) : d;
		return /^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/.test(domain);
	});
}

export function isPerplexityAvailable(): boolean {
	return hasCredentialSource({
		provider: "Perplexity",
		configuredValue: loadConfig().perplexityApiKey,
		environmentValue: process.env.PERPLEXITY_API_KEY,
	});
}

export async function searchWithPerplexity(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
	checkRateLimit();

	const activityId = activityMonitor.logStart({ type: "api", query });

	activityMonitor.updateRateLimit({
		used: requestTimestamps.value.length,
		max: RATE_LIMIT.maxRequests,
		oldestTimestamp: requestTimestamps.value[0] ?? null,
		windowMs: RATE_LIMIT.windowMs,
	});

	const apiKey = await getApiKey(options.signal);
	const numResults = typeof options.numResults === "number" && Number.isFinite(options.numResults)
		? Math.max(1, Math.min(Math.floor(options.numResults), 20))
		: 5;

	const requestBody: Record<string, unknown> = {
		model: "sonar",
		messages: [{ role: "user", content: query }],
		max_tokens: 1024,
		return_related_questions: false,
	};

	if (options.recencyFilter) {
		requestBody.search_recency_filter = options.recencyFilter;
	}

	if (options.domainFilter && options.domainFilter.length > 0) {
		const validated = validateDomainFilter(options.domainFilter);
		if (validated.length > 0) {
			requestBody.search_domain_filter = validated;
		}
	}

	let response: Response;
	try {
		response = await fetch(PERPLEXITY_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
			...(options.signal ? { signal: options.signal } : {}),
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const redactedMessage = redactCredential(message, apiKey);
		if (redactedMessage.toLowerCase().includes("abort")) {
			activityMonitor.logComplete(activityId, 0);
		} else {
			activityMonitor.logError(activityId, redactedMessage);
		}
		if (redactedMessage === message) throw err;
		const redactedError = new Error(redactedMessage);
		if (err instanceof Error) redactedError.name = err.name;
		throw redactedError;
	}

	if (!response.ok) {
		activityMonitor.logComplete(activityId, response.status);
		const errorText = redactCredential(await response.text(), apiKey);
		throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
	}

	let data: Record<string, unknown>;
	try {
		data = await response.json();
	} catch (err) {
		activityMonitor.logComplete(activityId, response.status);
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Perplexity API returned invalid JSON: ${message}`);
	}

	const answer = (data.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content || "";
	const citations = Array.isArray(data.citations) ? data.citations : [];

	const results: SearchResult[] = [];
	for (let i = 0; i < Math.min(citations.length, numResults); i++) {
		const citation = citations[i];
		if (typeof citation === "string") {
			results.push({ title: `Source ${i + 1}`, url: citation, snippet: "" });
		} else if (citation && typeof citation === "object" && typeof citation.url === "string") {
			results.push({
				title: citation.title || `Source ${i + 1}`,
				url: citation.url,
				snippet: "",
			});
		}
	}

	activityMonitor.logComplete(activityId, response.status);
	return { answer, results };
}

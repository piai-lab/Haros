// Structured source checking and machine-readable research artifacts.
import { createHash } from "node:crypto";
import { generateId, getResult, storeResult } from "./storage.ts";
import type { SearchResult } from "./perplexity.ts";
import type { ExtractedContent } from "./extract.ts";

export type SourceQuality = "official_docs" | "vendor_docs" | "repo_issue" | "blog" | "forum" | "news" | "unknown";
export type ClaimStatus = "supported" | "contradicted" | "unclear" | "missing-evidence";
export type RecencyFilter = "day" | "week" | "month" | "year";

export interface ResearchSource {
	rank: number;
	url: string;
	title: string;
	snippet?: string;
	fetch_timestamp?: number;
	content_hash?: string;
	quality: SourceQuality;
	fetched?: boolean;
	fetch_error?: string;
}

export interface ResearchPassage {
	passage_id: string;
	source_url: string;
	source_rank: number;
	text: string;
	extraction_span?: { start: number; end: number };
	content_hash?: string;
}

export interface ClaimAssessment {
	claim: string;
	assessment_kind: "heuristic";
	status: ClaimStatus;
	supporting_passages: string[];
	contradicting_passages: string[];
	rationale: string;
	confidence: number;
}

export interface ResearchArtifact {
	id: string;
	type: "research";
	timestamp: number;
	query: string;
	sources: ResearchSource[];
	passages: ResearchPassage[];
	claims?: ClaimAssessment[];
	provider?: string;
	summary?: string;
	content_hash?: string;
	filters?: { recency?: RecencyFilter; domain_include?: string[]; domain_exclude?: string[] };
	errors?: Array<{ query: string; error: string }>;
}

export interface ResearchSearchRequest {
	query: string;
	numResults: number;
	recencyFilter?: RecencyFilter;
	domainFilter?: string[];
}
export interface ResearchSearchResult { url: string; title: string; snippet: string; rank: number }
export interface ResearchSearchResponse { provider: string; results: ResearchSearchResult[]; summary?: string }
export interface ResearchProvider { name: string; search(req: ResearchSearchRequest): Promise<ResearchSearchResponse> }

const OFFICIAL_DOCS_HOSTS = /^(developers\.|docs\.|learn\.|reference\.)|\.github\.io$/i;
const OFFICIAL_DOCS_PATHS = /\/(docs?|reference)(\/|\b)/i;
const VENDOR_DOCS_PATHS = /\/(documentation|docs?)\//i;
const REPO_ISSUE_PATHS = /\/(issues|pull|pulls)\//i;
const BLOG_HOSTS = /(medium\.com|substack\.com|dev\.to|hashnode\.)/i;
const BLOG_PATHS = /\/blogs?\//i;
const FORUM_HOSTS = /(stackoverflow\.com|serverfault\.com|superuser\.com|discourse\.|community\.)/i;
const FORUM_PATHS = /\/(forum|forums|threads)\//i;
const NEWS_HOSTS = /(reuters\.com|bloomberg\.com|techcrunch\.com|theverge\.com|arstechnica\.com|wired\.com|cnet\.com|zdnet\.com)/i;
const NEWS_PATHS = /\/news(\/|$)/i;

export function classifySource(url: string): SourceQuality {
	let host = "";
	let path = "";
	try {
		const parsed = new URL(url);
		host = parsed.hostname;
		path = parsed.pathname;
	} catch {
		return "unknown";
	}
	if (REPO_ISSUE_PATHS.test(path)) return "repo_issue";
	if (OFFICIAL_DOCS_HOSTS.test(host) || OFFICIAL_DOCS_PATHS.test(path)) return "official_docs";
	if (VENDOR_DOCS_PATHS.test(path)) return "vendor_docs";
	if (NEWS_HOSTS.test(host) || NEWS_PATHS.test(path)) return "news";
	if (FORUM_HOSTS.test(host) || FORUM_PATHS.test(path)) return "forum";
	if (BLOG_HOSTS.test(host) || BLOG_PATHS.test(path)) return "blog";
	return "unknown";
}

export function hashContent(text: string): string {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

interface Span { text: string; start: number; end: number }

function tokenize(value: string): string[] {
	const tokens = new Set<string>();
	for (const match of value.normalize("NFKC").toLocaleLowerCase().matchAll(/[\p{L}\p{N}]+/gu)) {
		const term = match[0];
		if (/\p{Script=Han}/u.test(term)) {
			const characters = [...term];
			if (characters.length === 1) tokens.add(term);
			for (let index = 0; index < characters.length - 1; index += 1) {
				tokens.add(characters.slice(index, index + 2).join(""));
			}
		} else if (term.length > 3) {
			tokens.add(term);
		}
	}
	return [...tokens];
}

function extractRelevantSpans(content: string, hint: string): Span[] {
	const sentences: Span[] = [];
	const sentencePattern = /[^.!?。！？]+(?:[.!?。！？]+|$)/gu;
	for (const match of content.matchAll(sentencePattern)) {
		const raw = match[0];
		const text = raw.trim();
		if (text.length > 0 && text.length <= 400) {
			const start = (match.index ?? 0) + raw.indexOf(text);
			sentences.push({ text, start, end: start + text.length });
		}
	}
	const terms = tokenize(hint);
	if (terms.length === 0) return [];
	return sentences
		.map((sentence, index) => ({ sentence, index, score: terms.filter((term) => sentence.text.toLowerCase().includes(term)).length }))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, 3)
		.map(({ sentence }) => sentence);
}

function passageId(sourceRank: number, index: number): string {
	return `p-${sourceRank}-${index}`;
}

export function buildPassages(sources: ResearchSource[], fetched: ExtractedContent[] = [], hint = ""): ResearchPassage[] {
	const passages: ResearchPassage[] = [];
	const fetchedByUrl = new Map(fetched.map((item) => [item.url, item]));
	for (const source of sources) {
		if (source.snippet) {
			passages.push({
				passage_id: passageId(source.rank, 0),
				source_url: source.url,
				source_rank: source.rank,
				text: source.snippet,
				content_hash: hashContent(source.snippet),
			});
		}
		const page = fetchedByUrl.get(source.url);
		if (page && !page.error && page.content) {
			const passageHint = source.snippet?.trim() || hint;
			for (const [index, span] of extractRelevantSpans(page.content, passageHint).entries()) {
				passages.push({
					passage_id: passageId(source.rank, index + 1),
					source_url: source.url,
					source_rank: source.rank,
					text: span.text,
					extraction_span: { start: span.start, end: span.end },
					content_hash: hashContent(span.text),
				});
			}
		}
	}
	return passages;
}

const CONTRADICTION_MARKERS = [
	"not true", "false", "incorrect", "debunked", "retracted", "no longer", "never", "denied", "contrary", "misleading",
	"不正确", "错误", "不实", "已辟谣", "并非", "否认", "从未", "相反", "具有误导性",
];
const SUPPORT_MARKERS = [
	"yes", "true", "correct", "confirmed", "according to", "shows that", "demonstrates", "reported", "verified", "established",
	"证实", "确认", "显示", "表明", "报道", "根据", "支持", "成立", "正确",
];

function containsHan(value: string): boolean {
	return /\p{Script=Han}/u.test(value);
}

function containsPhrase(value: string, phrase: string): boolean {
	const normalizedPhrase = phrase.trim().toLocaleLowerCase();
	if (containsHan(normalizedPhrase)) return value.includes(normalizedPhrase);
	const escaped = normalizedPhrase.split(/\s+/).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
	return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu").test(value);
}

function markerIsNegated(value: string, marker: string): boolean {
	const normalizedMarker = marker.trim().toLocaleLowerCase();
	if (containsHan(normalizedMarker)) {
		const index = value.indexOf(normalizedMarker);
		return index >= 0 && /(?:不|未|没有|并未|无法|不能)\s*$/u.test(value.slice(Math.max(0, index - 8), index));
	}
	const escaped = normalizedMarker.split(/\s+/).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
	const markerPattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu");
	const match = markerPattern.exec(value);
	if (!match || match.index === undefined) return false;
	const matchedMarker = match[0].replace(/^[^a-z0-9]+/i, "");
	const beforeMarker = value.slice(0, match.index + match[0].length - matchedMarker.length);
	return /(?:^|[^\p{L}\p{N}])(?:not|no|never|without)\s+$/iu.test(beforeMarker);
}

function hasPolarityMarker(value: string, markers: string[], allowNegated = false): boolean {
	return markers.some((marker) => containsPhrase(value, marker) && (allowNegated || !markerIsNegated(value, marker)));
}

export function assessClaim(claim: string, passages: ResearchPassage[]): ClaimAssessment {
	const terms = tokenize(claim);
	if (terms.length === 0 || passages.length === 0) {
		return { claim, assessment_kind: "heuristic", status: "missing-evidence", supporting_passages: [], contradicting_passages: [], rationale: "The heuristic found no passages that discuss the claim's terms.", confidence: 0.2 };
	}
	const supporting: string[] = [];
	const contradicting: string[] = [];
	for (const passage of passages) {
		const lower = passage.text.toLowerCase();
		const overlap = terms.filter((term) => containsPhrase(lower, term)).length;
		if (overlap < Math.max(2, Math.ceil(terms.length / 4))) continue;
		const contra = hasPolarityMarker(lower, CONTRADICTION_MARKERS);
		const support = hasPolarityMarker(lower, SUPPORT_MARKERS);
		if (contra && !support) contradicting.push(passage.passage_id);
		else if (support && !contra) supporting.push(passage.passage_id);
	}
	if (contradicting.length > 0 && supporting.length === 0) {
		return { claim, assessment_kind: "heuristic", status: "contradicted", supporting_passages: [], contradicting_passages: contradicting, rationale: `The heuristic found contradiction markers in ${contradicting.length} passage(s) and no support markers.`, confidence: Math.min(0.85, 0.5 + contradicting.length * 0.1) };
	}
	if (supporting.length > 0 && contradicting.length === 0) {
		return { claim, assessment_kind: "heuristic", status: "supported", supporting_passages: supporting, contradicting_passages: [], rationale: `The heuristic found support markers in ${supporting.length} passage(s) and no contradiction markers.`, confidence: Math.min(0.85, 0.5 + supporting.length * 0.1) };
	}
	if (supporting.length > 0 || contradicting.length > 0) {
		return { claim, assessment_kind: "heuristic", status: "unclear", supporting_passages: supporting, contradicting_passages: contradicting, rationale: `The heuristic found ${supporting.length} passage(s) with support markers and ${contradicting.length} with contradiction markers.`, confidence: 0.4 };
	}
	return { claim, assessment_kind: "heuristic", status: "unclear", supporting_passages: [], contradicting_passages: [], rationale: "Passages mention the claim's terms, but the heuristic found no explicit support or contradiction markers.", confidence: 0.3 };
}

interface RankedSearchResult extends SearchResult {
	rank?: number;
}

export interface BuildArtifactInput {
	query: string;
	provider?: string;
	summary?: string;
	results: RankedSearchResult[];
	fetched?: ExtractedContent[];
	recency?: RecencyFilter;
	domainFilter?: string[];
}

export function buildResearchArtifact(input: BuildArtifactInput): ResearchArtifact {
	const filters = input.domainFilter ?? [];
	const fetchedByUrl = new Map((input.fetched ?? []).map((page) => [page.url, page]));
	const sources: ResearchSource[] = [];
	const seen = new Set<string>();
	for (const [index, result] of input.results.entries()) {
		if (seen.has(result.url)) continue;
		seen.add(result.url);
		const page = fetchedByUrl.get(result.url);
		const fetched = Boolean(page && !page.error);
		sources.push({
			rank: result.rank ?? index + 1,
			url: result.url,
			title: result.title,
			snippet: result.snippet,
			quality: classifySource(result.url),
			fetched,
			...(page ? { fetch_timestamp: Date.now() } : {}),
			...(page && !page.error ? { content_hash: hashContent(page.content) } : {}),
			...(page?.error ? { fetch_error: page.error } : {}),
		});
	}
	const passages = buildPassages(sources, input.fetched, input.query);
	const domainInclude = filters.filter((domain) => !domain.startsWith("-"));
	const domainExclude = filters.filter((domain) => domain.startsWith("-")).map((domain) => domain.slice(1));
	return {
		id: generateId(),
		type: "research",
		timestamp: Date.now(),
		query: input.query,
		sources,
		passages,
		...(input.provider !== undefined ? { provider: input.provider } : {}),
		...(input.summary !== undefined ? { summary: input.summary } : {}),
		...(passages.length > 0 ? { content_hash: hashContent(passages.map((passage) => passage.text).join("\n")) } : {}),
		filters: {
			...(input.recency !== undefined ? { recency: input.recency } : {}),
			domain_include: domainInclude,
			domain_exclude: domainExclude,
		},
	};
}

export function withClaimAssessment(artifact: ResearchArtifact, claims: string[]): ResearchArtifact {
	return { ...artifact, claims: claims.map((claim) => assessClaim(claim, artifact.passages)) };
}

export function storeResearchArtifact(artifact: ResearchArtifact): void {
	if (!artifact.id) throw new Error("Research artifact id must not be empty");
	storeResult(artifact.id, { id: artifact.id, type: "research", timestamp: artifact.timestamp, artifact });
}

export function getResearchArtifact(id: string): ResearchArtifact | null {
	const data = getResult(id);
	if (!data || data.type !== "research" || !data.artifact || typeof data.artifact !== "object") return null;
	return data.artifact as ResearchArtifact;
}

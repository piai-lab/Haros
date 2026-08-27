import type { SearchResult } from "./perplexity.ts";
import type { QueryResultData } from "./storage.ts";

export type CanonicalSearchSource = SearchResult;

function cleanInlineText(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function markdownLink(title: string, url: string): string {
  const label = cleanInlineText(title, url).replace(/([\\[\]])/g, "\\$1");
  return `[${label}](${url.replace(/\)/g, "%29")})`;
}

/** Stable first-seen source truth shared by Agent output, summaries and artifact reads. */
export function collectSearchSources(results: readonly QueryResultData[]): CanonicalSearchSource[] {
  const sources = new Map<string, CanonicalSearchSource>();
  for (const result of results) {
    for (const source of result.results) {
      const url = source.url.trim();
      if (!url) continue;
      const existing = sources.get(url);
      if (!existing) {
        sources.set(url, { ...source, url });
        continue;
      }
      if ((!existing.title || existing.title === existing.url) && source.title)
        existing.title = source.title;
      if (!existing.snippet && source.snippet) existing.snippet = source.snippet;
    }
  }
  return [...sources.values()];
}

export function formatSourceDirectory(results: readonly QueryResultData[]): string {
  const sources = collectSearchSources(results);
  const lines = ["## Sources", ""];
  if (sources.length === 0) {
    lines.push("No sources returned.");
    return lines.join("\n");
  }
  for (const source of sources) lines.push(`- ${markdownLink(source.title, source.url)}`);
  return lines.join("\n");
}

export function appendSourceDirectory(body: string, results: readonly QueryResultData[]): string {
  const normalized = body.trim();
  return `${normalized ? `${normalized}\n\n` : ""}${formatSourceDirectory(results)}`;
}

export function formatSummaryInputResult(result: QueryResultData): string {
  if (result.error) {
    return `Query: ${result.query}\nStatus: Error\nError: ${result.error}`;
  }
  const lines = [
    `Query: ${result.query}`,
    `Provider: ${result.provider ?? "unknown"}`,
    `Answer: ${result.answer || "(no answer text returned)"}`,
  ];
  if (result.results.length === 0) {
    lines.push("Sources: none");
    return lines.join("\n");
  }
  lines.push("Sources:");
  for (let index = 0; index < result.results.length; index++) {
    const source = result.results[index];
    lines.push(`${index + 1}. ${cleanInlineText(source.title, source.url)} — ${source.url}`);
  }
  return lines.join("\n");
}

/** Raw tool output keeps answers per query; the caller appends one global source directory. */
export function formatRawQueryResult(result: QueryResultData): string {
  if (result.error) return `Error: ${result.error}`;
  return (
    result.answer.trim() ||
    `Returned ${result.results.length} source${result.results.length === 1 ? "" : "s"} without answer text.`
  );
}

/** Stored search reads are intentionally richer than the default summary handoff. */
export function formatStoredQueryResult(result: QueryResultData): string {
  const lines = [`## Results for: "${result.query}"`, ""];
  if (result.answer.trim()) lines.push(result.answer.trim(), "");
  lines.push("## Sources", "");
  if (result.results.length === 0) {
    lines.push("No sources returned.");
    return lines.join("\n");
  }
  for (const source of result.results) {
    lines.push(`### ${cleanInlineText(source.title, source.url)}`, source.url);
    if (source.snippet?.trim()) lines.push("", source.snippet.trim());
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function formatArtifactHint(
  responseId: string,
  queryCount: number,
  getSearchContentTool: string,
): string {
  const range = queryCount > 1 ? ` Query indexes: 0-${queryCount - 1}.` : " Query index: 0.";
  return `Artifact responseId: ${responseId}.${range} Use ${getSearchContentTool}({ responseId: "${responseId}", queryIndex: 0 }) to read the first stored query.`;
}

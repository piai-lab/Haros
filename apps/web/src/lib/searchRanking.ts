// FILE: searchRanking.ts
// Purpose: Shares source-neutral text ranking across app-owned search surfaces.
// Layer: Web lib
// Exports: text normalization and stable weighted ranking.

export function normalizeSearchText(value: string | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[:/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SearchField {
  value: string | null | undefined;
  weight?: number;
}

interface RankedSearchItem<T> {
  item: T;
  score: number;
  index: number;
}

// Lower scores mean stronger intent: title/name hits beat descriptions, and
// fuzzy matching is reserved for primary fields to avoid noisy long-copy wins.
function compactNormalizedText(value: string): string {
  return value.replace(/\s+/g, "");
}

function scoreSubsequenceMatch(value: string, query: string): number | null {
  if (!query) return 0;

  let queryIndex = 0;
  let firstMatchIndex = -1;
  let previousMatchIndex = -1;
  let gapPenalty = 0;

  for (let valueIndex = 0; valueIndex < value.length; valueIndex += 1) {
    if (value[valueIndex] !== query[queryIndex]) {
      continue;
    }

    if (firstMatchIndex === -1) {
      firstMatchIndex = valueIndex;
    }
    if (previousMatchIndex !== -1) {
      gapPenalty += valueIndex - previousMatchIndex - 1;
    }

    previousMatchIndex = valueIndex;
    queryIndex += 1;
    if (queryIndex === query.length) {
      // The matched span beyond the query length always equals gapPenalty, so
      // fold the former span weighting into a single gap coefficient.
      const lengthPenalty = Math.min(64, value.length - query.length);
      return firstMatchIndex * 2 + gapPenalty * 4 + lengthPenalty;
    }
  }

  return null;
}

function scoreTokenCoverage(value: string, query: string): number | null {
  const tokens = query.split(" ").filter((token) => token.length > 0);
  if (tokens.length <= 1) {
    return null;
  }

  let offset = 0;
  let totalDistance = 0;
  for (const token of tokens) {
    const index = value.indexOf(token, offset);
    if (index === -1) {
      return null;
    }
    totalDistance += index - offset;
    offset = index + token.length;
  }
  return totalDistance;
}

function scoreNormalizedDiscoveryText(
  value: string,
  query: string,
  options?: { allowFuzzy?: boolean },
): number | null {
  if (!query) {
    return 0;
  }
  if (!value) {
    return null;
  }

  const compactValue = compactNormalizedText(value);
  const compactQuery = compactNormalizedText(query);

  if (value === query || compactValue === compactQuery) return 0;
  if (value.startsWith(query) || compactValue.startsWith(compactQuery)) return 10;

  const words = value.split(" ").filter((word) => word.length > 0);
  const wordPrefixIndex = words.findIndex((word) => word.startsWith(query));
  if (wordPrefixIndex !== -1) return 20 + wordPrefixIndex;

  const boundaryIndex = value.indexOf(` ${query}`);
  if (boundaryIndex !== -1) return 30 + boundaryIndex;

  const phraseIndex = value.indexOf(query);
  if (phraseIndex !== -1) return 40 + phraseIndex;

  const tokenCoverageScore = scoreTokenCoverage(value, query);
  if (tokenCoverageScore !== null) return 80 + tokenCoverageScore;

  if (!options?.allowFuzzy) {
    return null;
  }

  const subsequenceScore = scoreSubsequenceMatch(compactValue, compactQuery);
  if (subsequenceScore !== null) return 120 + subsequenceScore;

  return null;
}

function scoreSearchFieldsForNormalizedQuery(
  normalizedQuery: string,
  fields: readonly SearchField[],
): number | null {
  if (!normalizedQuery) {
    return 0;
  }

  let bestScore: number | null = null;
  for (const field of fields) {
    const fieldWeight = field.weight ?? 0;
    const normalizedValue = normalizeSearchText(field.value ?? undefined);
    const fieldScore = scoreNormalizedDiscoveryText(normalizedValue, normalizedQuery, {
      allowFuzzy: fieldWeight === 0,
    });
    if (fieldScore === null) {
      continue;
    }
    const weightedScore = fieldWeight + fieldScore;
    if (bestScore === null || weightedScore < bestScore) {
      bestScore = weightedScore;
    }
  }
  return bestScore;
}

export function rankSearchItems<T>(
  items: readonly T[],
  query: string,
  fieldsForItem: (item: T) => readonly SearchField[],
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [...items];
  }

  return items
    .map((item, index): RankedSearchItem<T> | null => {
      const score = scoreSearchFieldsForNormalizedQuery(
        normalizedQuery,
        fieldsForItem(item),
      );
      return score === null ? null : { item, score, index };
    })
    .filter((entry): entry is RankedSearchItem<T> => entry !== null)
    .toSorted((left, right) => left.score - right.score || left.index - right.index)
    .map((entry) => entry.item);
}

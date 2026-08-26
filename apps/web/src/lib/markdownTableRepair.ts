// GFM rejects an entire table when the delimiter row's cell count differs from
// the header row's, so the block falls back to a paragraph — and there soft line
// breaks render as spaces, collapsing the table into one run-on wall of pipes.
// Models emit this malformation regularly (e.g. a three-column header over a
// `|---|---|` delimiter), so before rendering we repair the delimiter row to the
// header's cell count: pad missing cells with `---`, drop extras. Only the
// delimiter row is ever rewritten; header and body rows stay byte-for-byte.

const DELIMITER_CELL_REGEX = /^:?-+:?$/;
const CODE_FENCE_REGEX = /^ {0,3}(`{3,}|~{3,})(.*)$/;

type FenceState = { readonly marker: string; readonly length: number };

interface MarkdownSourceReplacement {
  readonly rawStart: number;
  readonly rawEnd: number;
  readonly replacement: string;
}

interface MarkdownSourceProjectionSegment {
  readonly rawStart: number;
  readonly rawEnd: number;
  readonly renderedStart: number;
  readonly renderedEnd: number;
}

interface MarkdownSourceProjectionReplacement {
  readonly rawStart: number;
  readonly rawEnd: number;
  readonly renderedStart: number;
  readonly renderedEnd: number;
}

export interface MarkdownSourceOffsetProjection {
  toRawBoundary(renderedOffset: number): number | null;
  toRenderedBoundary(rawOffset: number): number | null;
}

export interface PreparedAssistantMarkdown {
  readonly rawText: string;
  readonly renderedText: string;
  readonly projection: MarkdownSourceOffsetProjection;
}

function isValidBoundary(offset: number, max: number): boolean {
  return Number.isInteger(offset) && offset >= 0 && offset <= max;
}

function createMarkdownSourceOffsetProjection(input: {
  rawLength: number;
  renderedLength: number;
  segments: readonly MarkdownSourceProjectionSegment[];
  replacements: readonly MarkdownSourceProjectionReplacement[];
}): MarkdownSourceOffsetProjection {
  const mapBoundary = (
    offset: number,
    sourceLength: number,
    targetLength: number,
    sourceStartKey: "rawStart" | "renderedStart",
    sourceEndKey: "rawEnd" | "renderedEnd",
    targetStartKey: "rawStart" | "renderedStart",
    targetEndKey: "rawEnd" | "renderedEnd",
  ): number | null => {
    if (!isValidBoundary(offset, sourceLength)) {
      return null;
    }

    for (const replacement of input.replacements) {
      const sourceStart = replacement[sourceStartKey];
      const sourceEnd = replacement[sourceEndKey];
      if (offset === sourceStart) {
        return replacement[targetStartKey];
      }
      if (offset === sourceEnd) {
        return replacement[targetEndKey];
      }
      if (offset > sourceStart && offset < sourceEnd) {
        return null;
      }
    }

    for (const segment of input.segments) {
      const sourceStart = segment[sourceStartKey];
      const sourceEnd = segment[sourceEndKey];
      if (offset < sourceStart || offset > sourceEnd) {
        continue;
      }
      const targetStart = segment[targetStartKey];
      const targetEnd = segment[targetEndKey];
      if (sourceEnd - sourceStart !== targetEnd - targetStart) {
        return null;
      }
      return targetStart + (offset - sourceStart);
    }

    return offset === sourceLength ? targetLength : null;
  };

  return {
    toRawBoundary(renderedOffset) {
      return mapBoundary(
        renderedOffset,
        input.renderedLength,
        input.rawLength,
        "renderedStart",
        "renderedEnd",
        "rawStart",
        "rawEnd",
      );
    },
    toRenderedBoundary(rawOffset) {
      return mapBoundary(
        rawOffset,
        input.rawLength,
        input.renderedLength,
        "rawStart",
        "rawEnd",
        "renderedStart",
        "renderedEnd",
      );
    },
  };
}

function prepareMarkdownSourceReplacements(
  value: string,
  replacements: readonly MarkdownSourceReplacement[],
): PreparedAssistantMarkdown {
  if (replacements.length === 0) {
    return {
      rawText: value,
      renderedText: value,
      projection: {
        toRawBoundary: (offset) => (isValidBoundary(offset, value.length) ? offset : null),
        toRenderedBoundary: (offset) => (isValidBoundary(offset, value.length) ? offset : null),
      },
    };
  }

  const renderedParts: string[] = [];
  const segments: MarkdownSourceProjectionSegment[] = [];
  const projectedReplacements: MarkdownSourceProjectionReplacement[] = [];
  let rawCursor = 0;
  let renderedCursor = 0;

  for (const replacement of replacements) {
    const unchanged = value.slice(rawCursor, replacement.rawStart);
    renderedParts.push(unchanged);
    segments.push({
      rawStart: rawCursor,
      rawEnd: replacement.rawStart,
      renderedStart: renderedCursor,
      renderedEnd: renderedCursor + unchanged.length,
    });
    renderedCursor += unchanged.length;

    const renderedStart = renderedCursor;
    renderedParts.push(replacement.replacement);
    renderedCursor += replacement.replacement.length;
    projectedReplacements.push({
      rawStart: replacement.rawStart,
      rawEnd: replacement.rawEnd,
      renderedStart,
      renderedEnd: renderedCursor,
    });
    rawCursor = replacement.rawEnd;
  }

  const tail = value.slice(rawCursor);
  renderedParts.push(tail);
  segments.push({
    rawStart: rawCursor,
    rawEnd: value.length,
    renderedStart: renderedCursor,
    renderedEnd: renderedCursor + tail.length,
  });
  renderedCursor += tail.length;

  return {
    rawText: value,
    renderedText: renderedParts.join(""),
    projection: createMarkdownSourceOffsetProjection({
      rawLength: value.length,
      renderedLength: renderedCursor,
      segments,
      replacements: projectedReplacements,
    }),
  };
}

function matchCodeFence(line: string): (FenceState & { readonly info: string }) | null {
  const match = CODE_FENCE_REGEX.exec(line);
  if (!match) {
    return null;
  }
  const delimiter = match[1] ?? "";
  return {
    marker: delimiter[0] ?? "`",
    length: delimiter.length,
    info: (match[2] ?? "").trim(),
  };
}

function leadingIndentWidth(line: string): number {
  let width = 0;
  for (const char of line) {
    if (char === " ") {
      width += 1;
    } else if (char === "\t") {
      width += 4;
    } else {
      break;
    }
  }
  return width;
}

// Splits a table row into cells the way GFM does: any unescaped pipe divides
// cells (even inside inline code — GFM requires `\|` there too), and the
// leading/trailing pipes do not delimit extra empty cells.
function splitRowCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return null;
  }
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === "\\" && trimmed[index + 1] === "|") {
      current += "\\|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  if (trimmed.startsWith("|")) {
    cells.shift();
  }
  if (cells.length > 1 && cells[cells.length - 1] === "") {
    cells.pop();
  }
  return cells.length > 0 ? cells : null;
}

function parseDelimiterCells(line: string): string[] | null {
  const cells = splitRowCells(line);
  if (!cells) {
    return null;
  }
  const trimmedCells = cells.map((cell) => cell.trim());
  return trimmedCells.every((cell) => DELIMITER_CELL_REGEX.test(cell)) ? trimmedCells : null;
}

export function prepareMarkdownTableDelimiters(value: string): PreparedAssistantMarkdown {
  if (!value.includes("|") || !value.includes("-")) {
    return prepareMarkdownSourceReplacements(value, []);
  }

  const lines = value.split("\n");
  const lineStartOffsets: number[] = [];
  let sourceOffset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    lineStartOffsets.push(sourceOffset);
    sourceOffset += (lines[index]?.length ?? 0) + (index < lines.length - 1 ? 1 : 0);
  }
  const replacements: MarkdownSourceReplacement[] = [];
  let fence: FenceState | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fenceMatch = matchCodeFence(line);
    if (fence) {
      // A closing fence uses the same marker, at least the opening length, and
      // carries no info string.
      if (
        fenceMatch &&
        fenceMatch.marker === fence.marker &&
        fenceMatch.length >= fence.length &&
        fenceMatch.info === ""
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch.marker, length: fenceMatch.length };
      continue;
    }

    if (index === 0 || leadingIndentWidth(line) >= 4) {
      continue;
    }
    const delimiterCells = parseDelimiterCells(line);
    if (!delimiterCells) {
      continue;
    }

    const header = lines[index - 1] ?? "";
    // Indented code, blockquotes, and delimiter-shaped headers are not the
    // header row of a table this delimiter belongs to.
    if (leadingIndentWidth(header) >= 4 || header.trimStart().startsWith(">")) {
      continue;
    }
    const headerCells = splitRowCells(header);
    if (
      !headerCells ||
      headerCells.every((cell) => DELIMITER_CELL_REGEX.test(cell.trim())) ||
      headerCells.length === delimiterCells.length
    ) {
      continue;
    }
    // Only the first row of a block can be a table header: a pipe-delimited
    // line above means `header` is a body row of an ongoing table (or part of
    // a pipe-heavy paragraph) and this dashed line is content, not a delimiter.
    const preceding = index >= 2 ? (lines[index - 2] ?? "") : "";
    if (preceding.trim() !== "" && preceding.includes("|")) {
      continue;
    }

    const rebuiltCells = delimiterCells.slice(0, headerCells.length);
    while (rebuiltCells.length < headerCells.length) {
      rebuiltCells.push("---");
    }
    const indent = line.slice(0, line.length - line.trimStart().length);
    const lineStartOffset = lineStartOffsets[index] ?? 0;
    replacements.push({
      rawStart: lineStartOffset,
      rawEnd: lineStartOffset + line.length,
      replacement: `${indent}| ${rebuiltCells.join(" | ")} |`,
    });
  }

  return prepareMarkdownSourceReplacements(value, replacements);
}

export function repairMarkdownTableDelimiters(value: string): string {
  return prepareMarkdownTableDelimiters(value).renderedText;
}

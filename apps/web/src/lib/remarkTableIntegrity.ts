// FILE: remarkTableIntegrity.ts
// Purpose: Prevent GFM from silently dropping body cells that exceed a table's header width.
// Layer: Web markdown presentation logic
// Exports: table-integrity custom-element constants, createTableIntegrityRemarkPlugin

export const TABLE_INTEGRITY_FALLBACK_TAG_NAME = "table-integrity-fallback";
export const TABLE_INTEGRITY_EXPECTED_COLUMNS_ATTRIBUTE = "data-expected-columns";
export const TABLE_INTEGRITY_ACTUAL_COLUMNS_ATTRIBUTE = "data-actual-columns";

interface MdastPoint {
  line?: number;
  column?: number;
}

interface MdastPosition {
  start?: MdastPoint;
  end?: MdastPoint;
}

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  position?: MdastPosition;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
}

function lineStartOffsets(input: string): number[] {
  const offsets = [0];
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
}

function offsetForPoint(
  input: string,
  offsets: readonly number[],
  point: MdastPoint | undefined,
): number | null {
  if (!point?.line || !point.column || point.line < 1 || point.column < 1) {
    return null;
  }
  const lineStart = offsets[point.line - 1];
  if (lineStart === undefined) {
    return null;
  }
  const offset = lineStart + point.column - 1;
  return offset <= input.length ? offset : null;
}

function fallbackForTable(
  sourceInput: string,
  sourceLineStarts: readonly number[],
  table: MdastNode,
): MdastNode | null {
  const rows = table.children;
  const headerWidth = rows?.[0]?.children?.length ?? 0;
  if (headerWidth === 0 || !rows) {
    return null;
  }

  let widestBodyRow = headerWidth;
  for (const row of rows.slice(1)) {
    widestBodyRow = Math.max(widestBodyRow, row.children?.length ?? 0);
  }
  if (widestBodyRow <= headerWidth) {
    return null;
  }

  // Delimiter repair can change offsets, but it never adds/removes lines or rewrites the header
  // and body rows. Mapping the parsed table's line/column range back to the pre-repair source
  // therefore preserves the exact Markdown the user or engine supplied.
  const start = offsetForPoint(sourceInput, sourceLineStarts, table.position?.start);
  const end = offsetForPoint(sourceInput, sourceLineStarts, table.position?.end);
  if (start === null || end === null || end < start) {
    return null;
  }

  const fallback: MdastNode = {
    type: "tableIntegrityFallback",
    data: {
      hName: TABLE_INTEGRITY_FALLBACK_TAG_NAME,
      hProperties: {
        dataExpectedColumns: String(headerWidth),
        dataActualColumns: String(widestBodyRow),
      },
    },
    children: [{ type: "text", value: sourceInput.slice(start, end) }],
  };
  if (table.position) {
    fallback.position = table.position;
  }
  return fallback;
}

function replaceMalformedTables(
  sourceInput: string,
  sourceLineStarts: readonly number[],
  node: MdastNode,
): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  node.children = node.children.map((child) => {
    if (child.type === "table") {
      return fallbackForTable(sourceInput, sourceLineStarts, child) ?? child;
    }
    replaceMalformedTables(sourceInput, sourceLineStarts, child);
    return child;
  });
}

/**
 * GFM keeps extra body cells in mdast but drops them while converting the table to HTML.
 * Replace only those lossy tables with an inspectable raw-source fallback. Short body rows
 * remain valid: GFM represents their absent trailing values as empty cells without losing data.
 */
export function createTableIntegrityRemarkPlugin(sourceInput: string) {
  const sourceLineStarts = lineStartOffsets(sourceInput);
  return () => (tree: unknown) => {
    replaceMalformedTables(sourceInput, sourceLineStarts, tree as MdastNode);
  };
}

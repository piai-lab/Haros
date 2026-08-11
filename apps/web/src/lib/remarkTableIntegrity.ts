// FILE: remarkTableIntegrity.ts
// Purpose: Prevent GFM from silently dropping body cells that exceed a table's header width.
// Layer: Web markdown presentation logic
// Exports: table-integrity custom-element constants, createTableIntegrityRemarkPlugin

export const TABLE_INTEGRITY_FALLBACK_TAG_NAME = "table-integrity-fallback";
export const TABLE_INTEGRITY_EXPECTED_COLUMNS_ATTRIBUTE = "data-expected-columns";
export const TABLE_INTEGRITY_ACTUAL_COLUMNS_ATTRIBUTE = "data-actual-columns";

interface MdastPosition {
  start?: { offset?: number };
  end?: { offset?: number };
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

function fallbackForTable(input: string, table: MdastNode): MdastNode | null {
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

  const start = table.position?.start?.offset;
  const end = table.position?.end?.offset;
  if (start === undefined || end === undefined || start < 0 || end < start) {
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
    children: [{ type: "text", value: input.slice(start, end) }],
  };
  if (table.position) {
    fallback.position = table.position;
  }
  return fallback;
}

function replaceMalformedTables(input: string, node: MdastNode): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  node.children = node.children.map((child) => {
    if (child.type === "table") {
      return fallbackForTable(input, child) ?? child;
    }
    replaceMalformedTables(input, child);
    return child;
  });
}

/**
 * GFM keeps extra body cells in mdast but drops them while converting the table to HTML.
 * Replace only those lossy tables with an inspectable raw-source fallback. Short body rows
 * remain valid: GFM represents their absent trailing values as empty cells without losing data.
 */
export function createTableIntegrityRemarkPlugin(input: string) {
  return () => (tree: unknown) => {
    replaceMalformedTables(input, tree as MdastNode);
  };
}

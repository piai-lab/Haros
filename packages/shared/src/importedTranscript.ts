const TRAILING_BROWSER_ANNOTATIONS =
  /\n*<browser_annotations>\n[\s\S]*?\n<\/browser_annotations>\s*$/u;
const EMBEDDED_ASSISTANT_SELECTIONS =
  /\n*<assistant_selection>\n[\s\S]*?\n<\/assistant_selection>(?=\n*(<terminal_context>\n[\s\S]*?\n<\/terminal_context>\s*)?(<file_comments>\n[\s\S]*?\n<\/file_comments>\s*)?(<pasted_text>\n[\s\S]*?\n<\/pasted_text>\s*)?$)/u;

/** Removes source-session-only transport blocks while preserving product-visible text. */
export function sanitizeImportedUserMessageText(text: string): string {
  return text
    .replace(TRAILING_BROWSER_ANNOTATIONS, "")
    .replace(EMBEDDED_ASSISTANT_SELECTIONS, "")
    .replace(/\n+$/u, "");
}

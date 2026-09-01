// FILE: toolCallDetailsFormatting.ts
// Purpose: Format captured tool-call commands and output for transcript detail views.
// Layer: Web transcript presentation utility
// Exports: formatShellCommand, formatShellTranscript, formatToolOutputText,
//          createMarkdownCodeFence
// Depends on: WorkLogToolOutputDetails shape from toolCallDetails

import type { WorkLogToolOutputDetails } from "./toolCallDetails";

export function formatShellCommand(command: string): string {
  return command
    .split(/\r?\n/)
    .map((line, index) => (index === 0 ? `$ ${line}` : line))
    .join("\n");
}

export function formatShellTranscript(
  command: string,
  output: WorkLogToolOutputDetails | undefined,
  options?: {
    stdout?: string;
    stderr?: string;
    clippedNotice?: string;
  },
): string {
  const outputText = formatToolOutputText(output, options);
  return outputText
    ? `${formatShellCommand(command)}\n\n${outputText}`
    : formatShellCommand(command);
}

function outputPart(
  value: string | undefined,
  preview: WorkLogToolOutputDetails["preview"],
  clippedNotice: string | undefined,
): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trimEnd();
  if (!preview) return null;
  const gap = preview.clipped && clippedNotice ? `\n${clippedNotice}\n` : "";
  return `${preview.head}${gap}${preview.tail ?? ""}`.trimEnd();
}

export function formatToolOutputText(
  output: WorkLogToolOutputDetails | undefined,
  options?: {
    stdout?: string;
    stderr?: string;
    clippedNotice?: string;
  },
): string | null {
  if (!output) {
    return null;
  }
  const productOutput = outputPart(output.output, output.preview, options?.clippedNotice);
  const stdout = outputPart(output.stdout, output.stdoutPreview, options?.clippedNotice);
  const stderr = outputPart(output.stderr, output.stderrPreview, options?.clippedNotice);
  const parts = [
    productOutput,
    stdout ? `${options?.stdout ? `${options.stdout}\n` : ""}${stdout}` : null,
    stderr ? `${options?.stderr ? `${options.stderr}\n` : ""}${stderr}` : null,
  ].filter((part): part is string => part !== null && part.trim().length > 0);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function createMarkdownCodeFence(language: string, code: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...Array.from(code.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}${language}\n${code}\n${fence}`;
}

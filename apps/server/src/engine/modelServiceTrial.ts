const TRIAL_REPLY_MAX_CHARS = 8_000;

export function trialReplyText(
  content: ReadonlyArray<{
    readonly type: string;
    readonly text?: string;
    readonly thinking?: string;
  }>,
): string {
  const visible = content
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n")
    .trim();
  if (visible) return visible.slice(0, TRIAL_REPLY_MAX_CHARS);
  return content
    .flatMap((part) => (part.type === "thinking" && part.thinking ? [part.thinking] : []))
    .join("\n")
    .trim()
    .slice(0, TRIAL_REPLY_MAX_CHARS);
}

/** Normalize an opaque model identifier without applying a provider-owned alias or default. */
export function normalizeModelIdentifier(model: string | null | undefined): string | null {
  const trimmed = model?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function trimOrNull<T extends string>(value: T | null | undefined): T | null {
  const trimmed = value?.trim() as T | undefined;
  return trimmed ? trimmed : null;
}

export function parseCursorCliReasoningEffort(model: string): string | undefined {
  const tokens = model.trim().toLowerCase().split("-");
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (
      token === "xhigh" ||
      token === "max" ||
      token === "none" ||
      token === "low" ||
      token === "medium" ||
      token === "high"
    ) {
      return token === "high" && tokens[index - 1] === "extra" ? "xhigh" : token;
    }
  }
  return undefined;
}

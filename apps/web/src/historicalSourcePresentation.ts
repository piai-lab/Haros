export function normalizeHistoricalSourceId(sourceId: string | null | undefined): string | null {
  const normalized = sourceId?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

/** Display an opaque historical runtime source without maintaining a capability registry. */
export function historicalSourceDisplayName(sourceId: string | null | undefined): string {
  return normalizeHistoricalSourceId(sourceId) ?? "Runtime";
}

export function historicalUsageLabel(sourceId: string | null | undefined): string {
  return `${historicalSourceDisplayName(sourceId)} usage`;
}

/** Format an opaque historical model id without consulting a static capability catalog. */
export function historicalModelDisplayName(modelId: string | null | undefined): string | undefined {
  const withoutOptions = modelId?.trim().replace(/\[[^\]]*\]$/u, "");
  const normalized = withoutOptions?.includes("/")
    ? withoutOptions.slice(withoutOptions.lastIndexOf("/") + 1)
    : withoutOptions;
  if (!normalized) return undefined;
  if (normalized.toLowerCase().startsWith("gpt-")) {
    const [, version, ...rest] = normalized.split("-");
    return rest.length === 0
      ? `GPT-${version}`
      : `GPT-${version} ${rest.map(capitalize).join(" ")}`;
  }
  const claudeFamily = normalized.match(/^claude-(haiku|sonnet|opus)-(\d+)-(\d+)(?:-\d{8})?$/i);
  if (claudeFamily) {
    return `Claude ${capitalize(claudeFamily[1]!)} ${claudeFamily[2]}.${claudeFamily[3]}`;
  }
  return normalized.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

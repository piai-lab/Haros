export type WebAccessToolKey = "webSearch" | "sourceCheck" | "fetchContent" | "getSearchContent";

export interface WebAccessToolEnablementConfig {
  readonly webSearch?: { readonly enabled?: boolean };
  readonly tools?: Partial<Record<WebAccessToolKey, { readonly enabled?: boolean }>>;
}

/**
 * Author-compatible file-level tool policy shared by registration and Settings.
 * Runtime route exhaustion remains Session-owned and is intentionally not folded
 * into this persistent/config projection.
 */
export function resolveWebAccessToolEnablement(
  config: WebAccessToolEnablementConfig,
): Readonly<Record<WebAccessToolKey, boolean>> {
  const enabled = (key: WebAccessToolKey): boolean => {
    const override = config.tools?.[key]?.enabled;
    if (typeof override === "boolean") return override;
    return key !== "webSearch" && key !== "sourceCheck"
      ? true
      : config.webSearch?.enabled !== false;
  };
  return {
    webSearch: enabled("webSearch"),
    sourceCheck: enabled("sourceCheck"),
    fetchContent: enabled("fetchContent"),
    getSearchContent: enabled("getSearchContent"),
  };
}

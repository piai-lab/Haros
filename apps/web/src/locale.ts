import { Schema } from "effect";

export const LocalePreference = Schema.Literals(["system", "zh-CN", "en"]);
export type LocalePreference = typeof LocalePreference.Type;
export const DEFAULT_LOCALE_PREFERENCE: LocalePreference = "system";

export type AppLocale = Exclude<LocalePreference, "system">;

export function resolveAppLocale(
  preference: LocalePreference,
  systemLanguages: readonly string[] = globalThis.navigator?.languages ?? [],
): AppLocale {
  if (preference !== "system") return preference;

  const primaryLanguage = systemLanguages[0]?.trim().toLowerCase() ?? "";
  return primaryLanguage === "zh" || primaryLanguage.startsWith("zh-") ? "zh-CN" : "en";
}

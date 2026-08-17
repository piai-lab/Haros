// FILE: thinkingHints.ts
// Purpose: Owns the bilingual, index-aligned atmosphere copy for the live status row.
// Layer: Web i18n catalog

import type { AppLocale } from "../locale";

import enUs from "./thinking-hints.en-US.json";
import zhCn from "./thinking-hints.zh-CN.json";

export const THINKING_HINT_CATALOGS = {
  en: enUs.items,
  "zh-CN": zhCn.items,
} as const satisfies Readonly<Record<AppLocale, readonly string[]>>;

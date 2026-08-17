// FILE: thinkingHints.test.ts
// Purpose: Protects bilingual hint parity and the reviewed 338-item product boundary.
// Layer: Web i18n unit test

import { describe, expect, it } from "vitest";

import { THINKING_HINT_CATALOGS } from "./thinkingHints";

describe("thinking hint catalogs", () => {
  it("keeps the Chinese and English catalogs index-aligned and unique", () => {
    const english = THINKING_HINT_CATALOGS.en;
    const chinese = THINKING_HINT_CATALOGS["zh-CN"];

    expect(english).toHaveLength(338);
    expect(chinese).toHaveLength(english.length);
    expect(new Set(english).size).toBe(english.length);
    expect(new Set(chinese).size).toBe(chinese.length);
    expect(english.every((hint) => hint.trim().length > 0 && hint.length <= 40)).toBe(true);
    expect(chinese.every((hint) => hint.trim().length > 0)).toBe(true);
  });
});

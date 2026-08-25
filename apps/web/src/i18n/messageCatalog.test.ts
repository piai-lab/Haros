import { describe, expect, it } from "vitest";

import { composeMessageCatalog, defineMessageSlice } from "./messageCatalog";

describe("message catalog composition", () => {
  it("requires every slice to close the same English and Chinese key set", () => {
    if (false) {
      // @ts-expect-error The Chinese catalog cannot omit an English message.
      defineMessageSlice({ "missing.title": "Missing" } as const, {} as const);
      defineMessageSlice(
        { "exact.title": "Exact" } as const,
        {
          "exact.title": "精确",
          // @ts-expect-error The Chinese catalog cannot introduce a second key set.
          "extra.title": "额外",
        } as const,
      );
    }

    expect(true).toBe(true);
  });

  it("combines bilingual product domains without changing their keys or values", () => {
    const first = defineMessageSlice(
      { "first.title": "First" } as const,
      { "first.title": "第一项" } as const,
    );
    const second = defineMessageSlice(
      { "second.title": "Second" } as const,
      { "second.title": "第二项" } as const,
    );

    const catalogs = composeMessageCatalog([first, second] as const);

    expect(catalogs.en).toEqual({ "first.title": "First", "second.title": "Second" });
    expect(catalogs["zh-CN"]).toEqual({
      "first.title": "第一项",
      "second.title": "第二项",
    });
  });

  it("rejects a key owned by more than one product domain", () => {
    const first = defineMessageSlice(
      { "shared.title": "First" } as const,
      { "shared.title": "第一项" } as const,
    );
    const second = defineMessageSlice(
      { "shared.title": "Second" } as const,
      { "shared.title": "第二项" } as const,
    );

    expect(() => composeMessageCatalog([first, second] as const)).toThrow(
      "Duplicate i18n message key: shared.title",
    );
  });
});

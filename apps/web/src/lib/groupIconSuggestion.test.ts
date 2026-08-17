import { SPACE_ICON_NAMES } from "@omnimind/contracts";
import { describe, expect, it } from "vitest";

import { suggestGroupIcon } from "./groupIconSuggestion";

describe("suggestGroupIcon", () => {
  it("matches English and Chinese group names", () => {
    expect(suggestGroupIcon("Work")).toBe("bag");
    expect(suggestGroupIcon("Game dev")).toBe("code-brackets");
    expect(suggestGroupIcon("Gaming")).toBe("gamecontroller");
    expect(suggestGroupIcon("研究计划")).toBe("lab");
    expect(suggestGroupIcon("财务分析")).toBe("chart-2");
  });

  it("uses a stable curated fallback", () => {
    const first = suggestGroupIcon("Zzyzx");
    expect(SPACE_ICON_NAMES).toContain(first);
    expect(suggestGroupIcon("Zzyzx")).toBe(first);
    expect(suggestGroupIcon(" ")).toBe(SPACE_ICON_NAMES[0]);
  });
});

import { describe, expect, it } from "vitest";

import { resolveThreadDisplayTitle } from "./threadDisplayTitle";

describe("resolveThreadDisplayTitle", () => {
  it("localizes only the generic title of a proven Terminal thread", () => {
    expect(
      resolveThreadDisplayTitle({
        title: "New terminal",
        isTerminal: true,
        genericTerminalTitle: "新建终端",
      }),
    ).toBe("新建终端");
    expect(
      resolveThreadDisplayTitle({
        title: "New terminal",
        isTerminal: false,
        genericTerminalTitle: "新建终端",
      }),
    ).toBe("New terminal");
  });

  it("preserves meaningful Terminal titles", () => {
    expect(
      resolveThreadDisplayTitle({
        title: "Run release smoke",
        isTerminal: true,
        genericTerminalTitle: "新建终端",
      }),
    ).toBe("Run release smoke");
  });
});

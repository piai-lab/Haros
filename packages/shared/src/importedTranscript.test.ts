import { describe, expect, it } from "vitest";

import { sanitizeImportedUserMessageText } from "./importedTranscript";

describe("sanitizeImportedUserMessageText", () => {
  it("removes source-scoped browser and assistant-selection transport blocks", () => {
    expect(
      sanitizeImportedUserMessageText(
        'Keep this\n\n<assistant_selection>\n- assistant message old:\n  quote\n</assistant_selection>\n\n<browser_annotations>\n{"tabId":"private"}\n</browser_annotations>',
      ),
    ).toBe("Keep this");
  });

  it("preserves ordinary visible text", () => {
    expect(sanitizeImportedUserMessageText("hello\nworld")).toBe("hello\nworld");
  });
});

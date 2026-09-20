import { describe, expect, it } from "vitest";

import {
  composerNeedsModelServiceSetup,
  modelServiceSetupSearch,
  parseModelServiceSetupIntent,
} from "./modelServiceSetup";

describe("modelServiceSetup", () => {
  it("accepts only the DeepSeek key and custom endpoint intents", () => {
    expect(parseModelServiceSetupIntent("deepseek-key")).toBe("deepseek-key");
    expect(parseModelServiceSetupIntent("custom-endpoint")).toBe("custom-endpoint");
    expect(parseModelServiceSetupIntent("engines")).toBeNull();
    expect(parseModelServiceSetupIntent(undefined)).toBeNull();
  });

  it("opens Model services instead of Engine install for Pi-family engines", () => {
    expect(modelServiceSetupSearch("deepseek-key")).toEqual({
      section: "models",
      intent: "deepseek-key",
    });
    expect(composerNeedsModelServiceSetup("pi", "empty")).toBe(true);
    expect(composerNeedsModelServiceSetup("pi", "idle")).toBe(true);
    expect(composerNeedsModelServiceSetup("opencode", "error")).toBe(true);
    expect(composerNeedsModelServiceSetup("codex", "empty")).toBe(false);
    expect(composerNeedsModelServiceSetup("pi", "ready")).toBe(false);
  });
});

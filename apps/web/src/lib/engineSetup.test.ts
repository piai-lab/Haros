import { describe, expect, it } from "vitest";

import { SETTINGS_TARGETS } from "~/settingsSearchMetadata";

import { engineSetupActionKey, engineSetupSearch, parseEngineSetupKind } from "./engineSetup";

describe("engineSetup", () => {
  it("opens Engine details for a specific CLI engine", () => {
    expect(parseEngineSetupKind("codex")).toBe("codex");
    expect(parseEngineSetupKind("pi")).toBe("pi");
    expect(parseEngineSetupKind("oa")).toBeNull();
    expect(engineSetupSearch("cursor")).toEqual({
      section: "engines",
      target: SETTINGS_TARGETS.engineDetails,
      engine: "cursor",
    });
  });

  it("offers install or sign-in only for engines that are not model-service owned", () => {
    expect(engineSetupActionKey("codex", "not_installed")).toBe("composer.installEngine");
    expect(engineSetupActionKey("claude", "sign_in")).toBe("composer.signInEngine");
    expect(engineSetupActionKey("pi", "not_installed")).toBeNull();
    expect(engineSetupActionKey("opencode", "not_installed")).toBeNull();
    expect(engineSetupActionKey("cursor", "ready")).toBeNull();
  });
});

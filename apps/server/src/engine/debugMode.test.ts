import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ENGINE_DEBUG_MODE_PROMPT_PREFIX, withProviderDebugModePrompt } from "./debugMode.ts";

// The retired platform name is derived from the adoption record instead of being
// written here, so this repo carries no retired donor identity outside the record.
function retiredPlatformDonorRepositoryName(): string {
  const record = JSON.parse(
    readFileSync(new URL("../../../../source-adoptions.json", import.meta.url), "utf8"),
  ) as { adopted: ReadonlyArray<{ url: string; paths: ReadonlyArray<string> }> };
  const platformAdoptions = record.adopted.filter(
    (entry) =>
      entry.paths.includes("package.json") &&
      entry.paths.includes("apps/web") &&
      entry.paths.includes("apps/server"),
  );
  expect(platformAdoptions).toHaveLength(1);
  const platformAdoption = platformAdoptions[0];
  if (!platformAdoption) throw new Error("Expected one platform source adoption.");
  const pathname = new URL(platformAdoption.url).pathname;
  return (
    pathname
      .replace(/\.git$/u, "")
      .split("/")
      .at(-1) ?? ""
  );
}

describe("engine Debug mode prompt", () => {
  it("leaves non-Debug turns unchanged", () => {
    expect(withProviderDebugModePrompt({ text: "hello", interactionMode: "default" })).toBe(
      "hello",
    );
    expect(withProviderDebugModePrompt({ text: "plan it", interactionMode: "plan" })).toBe(
      "plan it",
    );
  });

  it("adds evidence and reproduction fallback instructions exactly once", () => {
    const once = withProviderDebugModePrompt({
      text: "Investigate the crash",
      interactionMode: "debug",
    });
    const twice = withProviderDebugModePrompt({ text: once, interactionMode: "debug" });

    expect(once).toContain("observe -> reproduce -> investigate -> fix -> verify");
    expect(once).toContain("Haros Debug mode");
    expect(once.toLowerCase()).not.toContain(retiredPlatformDonorRepositoryName());
    expect(once).toContain('"Reproduced", "Could not reproduce", and "Cancel"');
    expect(once).toContain("send the same instructions as normal text");
    expect(once.split(ENGINE_DEBUG_MODE_PROMPT_PREFIX)).toHaveLength(2);
    expect(twice).toBe(once);
  });
});

import { describe, expect, it } from "vitest";

import { resolvePackagedWorkspaceRuntimeDependencies } from "./resolve-catalog";

describe("resolvePackagedWorkspaceRuntimeDependencies", () => {
  it("keeps external Host runtime dependencies and removes bundled workspace links", () => {
    expect(
      resolvePackagedWorkspaceRuntimeDependencies(
        {
          "@earendil-works/pi-agent-core": "0.81.1",
          "@earendil-works/pi-ai": "0.81.1",
          "@earendil-works/pi-coding-agent": "0.81.1",
          "@omnimind/contracts": "workspace:*",
          effect: "catalog:",
        },
        { effect: "1.2.3" },
        "apps/native-host",
      ),
    ).toEqual({
      "@earendil-works/pi-agent-core": "0.81.1",
      "@earendil-works/pi-ai": "0.81.1",
      "@earendil-works/pi-coding-agent": "0.81.1",
      effect: "1.2.3",
    });
  });
});

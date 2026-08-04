import { describe, expect, it } from "vitest";

import { readBunV1WorkspaceImporters } from "./bun-text-lockfile";

const actualTrailingCommaFixture = `{
  "lockfileVersion": 1,
  "configVersion": 1,
  "workspaces": {
    "": {
      "name": "@omnimind/monorepo",
      "devDependencies": {
        "vitest": "catalog:",
      },
    },
    "apps/web": {
      "name": "@omnimind/web",
      "description": "string content may contain ,} and ,] tokens",
    },
  },
  "packages": {
    "vitest": ["vitest@4.1.10", "", {}, "fixture-digest"],
  },
}
`;

describe("Bun v1 text lockfile", () => {
  it("reads workspace importers from Bun's generated trailing-comma syntax", () => {
    expect(readBunV1WorkspaceImporters(actualTrailingCommaFixture)).toEqual(["", "apps/web"]);
  });

  it("rejects malformed trailing commas instead of normalizing invalid structure", () => {
    expect(() =>
      readBunV1WorkspaceImporters(`{
        "lockfileVersion": 1,
        "workspaces": {,},
        "packages": {},
      }`),
    ).toThrow("valid Bun v1 text lockfile syntax");
  });

  it("requires the Bun v1 importer and package sections", () => {
    expect(() =>
      readBunV1WorkspaceImporters(`{
        "lockfileVersion": 1,
        "workspaces": [],
        "packages": {},
      }`),
    ).toThrow("workspaces object");
    expect(() =>
      readBunV1WorkspaceImporters(`{
        "lockfileVersion": 1,
        "workspaces": {},
      }`),
    ).toThrow("packages object");
  });
});

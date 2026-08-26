import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { planFocusedTestRuns } from "./run-focused-tests.mjs";

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createTemporaryRepository() {
  const root = mkdtempSync(join(tmpdir(), "omnimind-focused-tests-"));
  temporaryRoots.push(root);
  return root;
}

function createRepositoryFixture(root, files) {
  for (const file of files) {
    const path = join(root, file);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "");
  }
}

describe("planFocusedTestRuns", () => {
  it("routes explicit tests through their canonical workspace runners", () => {
    const root = createTemporaryRepository();
    createRepositoryFixture(root, [
      "apps/server/src/example.integration.test.ts",
      "apps/web/src/example.browser.tsx",
      "packages/om-web-access/src/example.test.ts",
    ]);

    const runs = planFocusedTestRuns(
      [
        "apps/server/src/example.integration.test.ts",
        "apps/web/src/example.browser.tsx",
        "packages/om-web-access/src/example.test.ts",
      ],
      root,
    );

    expect(runs.map((run) => run.workspace)).toEqual([
      "apps/server",
      "apps/web",
      "packages/om-web-access",
    ]);
    expect(runs[0]?.args).toContain("src/example.integration.test.ts");
    expect(runs[1]?.args).toContain("focused");
    expect(runs[2]?.args.slice(0, 2)).toEqual(["--test", "--test-concurrency=4"]);
  });

  it("fails before spawning for missing, non-test, or ownerless paths", () => {
    const root = createTemporaryRepository();
    createRepositoryFixture(root, ["apps/server/src/source.ts", "test/orphan.test.ts"]);

    expect(() => planFocusedTestRuns([], root)).toThrow("Usage:");
    expect(() => planFocusedTestRuns(["apps/server/src/source.ts"], root)).toThrow(
      "explicit test files",
    );
    expect(() => planFocusedTestRuns(["apps/server/src/missing.test.ts"], root)).toThrow(
      "does not exist",
    );
    expect(() => planFocusedTestRuns(["test/orphan.test.ts"], root)).toThrow(
      "no supported workspace owner",
    );
  });
});

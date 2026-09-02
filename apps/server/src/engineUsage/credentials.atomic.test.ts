import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeJsonFileAtomic } from "./credentials.ts";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("writeJsonFileAtomic", () => {
  it("keeps concurrent writes independent", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "haros-credential-write-"));
    tempDirectories.push(directory);
    const credentialPath = path.join(directory, "auth.json");

    const results = await Promise.allSettled(
      Array.from({ length: 16 }, (_, index) =>
        writeJsonFileAtomic(credentialPath, { account: index }),
      ),
    );

    expect(results.filter((result) => result.status === "rejected")).toEqual([]);
    const persisted = JSON.parse(await fs.readFile(credentialPath, "utf8")) as {
      account?: unknown;
    };
    expect(persisted.account).toEqual(expect.any(Number));
    expect(await fs.readdir(directory)).toEqual(["auth.json"]);
  });
});

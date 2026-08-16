import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertPatchDigest, assertStockPatchDigest } from "./vendor-omnimind-pi-runtime.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const patchPath = path.join(
  repositoryRoot,
  "patches",
  "pi-coding-agent",
  "0.84.2-model-config-reader.patch",
);
const stockPatchPath = path.join(
  repositoryRoot,
  "patches",
  "@earendil-works%2Fpi-coding-agent@0.84.2.patch",
);

describe("OmniMind Pi vendor generator", () => {
  it("accepts only the exact adopted source patch bytes", async () => {
    const adoptedPatch = await readFile(patchPath);
    expect(assertPatchDigest(adoptedPatch)).toMatch(/^[a-f0-9]{64}$/);

    const changedPatch = Buffer.concat([adoptedPatch, Buffer.from("\n# drift\n")]);
    expect(() => assertPatchDigest(changedPatch)).toThrow("Pi source patch digest must be");
  });

  it("accepts only the exact stock dependency patch bytes", async () => {
    const adoptedPatch = await readFile(stockPatchPath);
    expect(assertStockPatchDigest(adoptedPatch)).toMatch(/^[a-f0-9]{64}$/);

    const changedPatch = Buffer.concat([adoptedPatch, Buffer.from("\n# drift\n")]);
    expect(() => assertStockPatchDigest(changedPatch)).toThrow(
      "Stock Pi dependency patch digest must be",
    );
  });
});

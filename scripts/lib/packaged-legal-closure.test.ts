import { createPackage, extractFile } from "@electron/asar";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { verifyPackagedLegalClosureArchive } from "./packaged-legal-closure";

const roots: string[] = [];
const ARCHIVE_FIXTURE_READY_TIMEOUT_MS = 2_000;

async function waitForArchiveInventory(archive: string): Promise<void> {
  const inventoryPath = "apps/server/dist/client/licenses/packaged-dependencies.json";
  const deadline = Date.now() + ARCHIVE_FIXTURE_READY_TIMEOUT_MS;
  let lastError: unknown;
  while (Date.now() <= deadline) {
    try {
      JSON.parse(extractFile(archive, inventoryPath).toString("utf8"));
      return;
    } catch (error) {
      lastError = error;
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
  }
  throw new Error("ASAR fixture payload did not finish writing", { cause: lastError });
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

async function archiveFixture(
  extraPackage = false,
  includeBundledWebReceipt = true,
): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), "harnessos-legal-asar-"));
  roots.push(root);
  const source = join(root, "source");
  const archive = join(root, "app.asar");
  const packages = [
    "@earendil-works/pi-agent-core",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-client",
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-protocol",
    "@earendil-works/pi-telemetry",
    "@earendil-works/pi-tui",
    "@harnessos/oa-runtime",
  ];
  for (const name of extraPackage ? [...packages, "undisclosed"] : packages) {
    write(
      join(source, "node_modules", ...name.split("/"), "package.json"),
      JSON.stringify({ name, version: name === "undisclosed" ? "1.0.0" : "0.84.4" }),
    );
  }
  const components = packages.map((name) => ({ id: `${name}@0.84.4` }));
  components.push({
    id: "@harnessos/oa-ask@5.0.0-oa.1",
    name: "@harnessos/oa-ask",
    locations: ["bundled:apps/server/dist/index.mjs"],
  } as (typeof components)[number]);
  components.push({
    id: "mermaid@11.17.2",
    name: "mermaid",
    locations: ["bundled:apps/server/dist/client/index.html"],
  } as (typeof components)[number]);
  write(join(source, "apps/server/dist/index.mjs"), "export {};\n");
  if (includeBundledWebReceipt) {
    write(join(source, "apps/server/dist/client/index.html"), "<!doctype html>\n");
  }
  write(
    join(source, "apps/server/dist/client/licenses/packaged-dependencies.json"),
    JSON.stringify({
      schemaVersion: 3,
      derivation: "installed-production-and-bundled-workspace-closure",
      target: { kind: "packaged-target", platform: "fixture", arch: "fixture" },
      componentCount: components.length,
      roots: packages,
      components,
    }),
  );
  write(join(source, "apps/server/dist/client/licenses/sbom.cdx.json"), "{}\n");
  write(join(source, "apps/server/dist/client/licenses/THIRD-PARTY-NOTICES.txt"), "notices\n");
  await createPackage(source, archive);
  // @electron/asar resolves createPackage after calling Writable.end(), not
  // after the output stream's finish event. Under parallel workspace tests the
  // header can therefore be visible before the inventory payload is flushed.
  await waitForArchiveInventory(archive);
  return archive;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("packaged legal closure", () => {
  it("accepts an ASAR only when every packaged dependency is disclosed", async () => {
    const result = verifyPackagedLegalClosureArchive(await archiveFixture());
    expect(result.componentCount).toBe(10);
  });

  it("rejects an undisclosed dependency found in the actual ASAR", async () => {
    const archive = await archiveFixture(true);
    expect(() => verifyPackagedLegalClosureArchive(archive)).toThrow(
      "Undisclosed packaged IDs: undisclosed@1.0.0",
    );
  });

  it("rejects a disclosed bundled dependency when its runtime receipt is absent", async () => {
    const archive = await archiveFixture(false, false);
    expect(() => verifyPackagedLegalClosureArchive(archive)).toThrow(
      "Bundled dependency mermaid@11.17.2 runtime receipt is absent",
    );
  });
});

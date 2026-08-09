import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  collectReleaseDependencyInventory,
  renderReleaseLegalMetadata,
  resolveReleaseDependencyRoots,
  type ReleaseDependencyInventory,
} from "./release-legal-metadata";

const temporaryRoots: string[] = [];
const revision = "0123456789abcdef0123456789abcdef01234567";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function write(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function fixture(
  options: { override?: boolean; manifestDigest?: string; assetDigest?: string } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "omnimind-release-legal-"));
  temporaryRoots.push(root);
  const piNames = [
    "@earendil-works/pi-agent-core",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-client",
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-protocol",
    "@earendil-works/pi-telemetry",
    "@earendil-works/pi-tui",
    "@omnimind/pi-coding-agent",
  ];
  let targetManifest = "";
  for (const name of piNames) {
    const manifest = `${JSON.stringify({ name, version: "0.84.1", license: "MIT" }, null, 2)}\n`;
    const packageDirectory = join(root, "node_modules", ...name.split("/"));
    write(join(packageDirectory, "package.json"), manifest);
    if (name === piNames[0]) targetManifest = manifest;
    else write(join(packageDirectory, "LICENSE"), `packaged ${name}\n`);
  }
  const legalText = "fixture exact legal text";
  write(join(root, "assets/licenses/exact.txt"), legalText);
  write(
    join(root, "assets/licenses/release-legal-overrides.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        entries:
          options.override === false
            ? []
            : [
                {
                  packageIds: [`${piNames[0]}@0.84.1`],
                  license: "MIT",
                  kind: "exact-upstream",
                  assetPath: "assets/licenses/exact.txt",
                  sha256: options.assetDigest ?? sha256(legalText),
                  manifestSha256ByPackageId: {
                    [`${piNames[0]}@0.84.1`]: options.manifestDigest ?? sha256(targetManifest),
                  },
                  revision,
                  sourcePath: "LICENSE",
                  sourceUrl: `https://example.invalid/repository/blob/${revision}/LICENSE`,
                  upstreamLegalTextAbsent: false,
                },
              ],
      },
      null,
      2,
    )}\n`,
  );
  return {
    packageRoot: root,
    repositoryRoot: root,
    roots: piNames.map((name) => ({ name, fromDirectory: root })),
    target: { kind: "development-host" as const, platform: "fixture", arch: "fixture" },
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("release legal metadata", () => {
  it("uses Server and Desktop as repository dependency owners", () => {
    const root = mkdtempSync(join(tmpdir(), "omnimind-release-roots-"));
    temporaryRoots.push(root);
    write(
      join(root, "apps/server/package.json"),
      JSON.stringify({
        dependencies: {
          "@earendil-works/pi-agent-core": "0.84.1",
          "@synara/contracts": "workspace:*",
          effect: "1.0.0",
        },
      }),
    );
    write(
      join(root, "apps/desktop/package.json"),
      JSON.stringify({ dependencies: { electron: "40.10.6", "electron-updater": "6.6.2" } }),
    );

    expect(resolveReleaseDependencyRoots(root)).toEqual([
      {
        name: "@earendil-works/pi-agent-core",
        fromDirectory: join(root, "apps/server"),
      },
      { name: "effect", fromDirectory: join(root, "apps/server") },
      { name: "electron-updater", fromDirectory: join(root, "apps/desktop") },
    ]);
  });

  it("accepts an exact legal source only for the locked package manifest", () => {
    const inventory = collectReleaseDependencyInventory(fixture());
    const target = inventory.components.find(
      (component) => component.name === "@earendil-works/pi-agent-core",
    );
    expect(target?.licenseFiles[0]?.provenance.kind).toBe("exact-upstream");
    expect(target?.licenseFiles[0]?.text).toBe("fixture exact legal text");
  });

  it("fails closed when packaged legal text and an exact override are both absent", () => {
    expect(() => collectReleaseDependencyInventory(fixture({ override: false }))).toThrow(
      "has no packaged legal text or exact override",
    );
  });

  it("fails closed when exact package manifest bytes change", () => {
    expect(() =>
      collectReleaseDependencyInventory(fixture({ manifestDigest: "0".repeat(64) })),
    ).toThrow("override manifest digest changed");
  });

  it("fails closed when the vendored legal text digest changes", () => {
    expect(() =>
      collectReleaseDependencyInventory(fixture({ assetDigest: "0".repeat(64) })),
    ).toThrow("override digest mismatch");
  });

  it("renders deterministically and canonicalizes only controlled SPDX identifiers", () => {
    const inventory = collectReleaseDependencyInventory(fixture());
    const pierre: ReleaseDependencyInventory = {
      ...inventory,
      componentCount: inventory.componentCount + 1,
      components: [
        ...inventory.components,
        {
          ...inventory.components[0]!,
          id: "@pierre/theming@0.0.2",
          name: "@pierre/theming",
          version: "0.0.2",
          license: "apache-2.0",
        },
      ],
    };
    const first = renderReleaseLegalMetadata(pierre, "1.2.3");
    const second = renderReleaseLegalMetadata(pierre, "1.2.3");
    expect(second).toEqual(first);
    expect(first["sbom.cdx.json"]).toContain('"id": "Apache-2.0"');
    expect(first["release-dependencies.json"]).toContain('"license": "apache-2.0"');
  });

  it("does not disclose installed peer dependencies that the packager does not ship", () => {
    const input = fixture();
    const piTuiDirectory = join(input.packageRoot, "node_modules/@earendil-works/pi-tui");
    write(
      join(piTuiDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: "@earendil-works/pi-tui",
          version: "0.84.1",
          license: "MIT",
          peerDependencies: { "peer-only": "1.0.0" },
        },
        null,
        2,
      )}\n`,
    );
    write(
      join(input.packageRoot, "node_modules/peer-only/package.json"),
      `${JSON.stringify({ name: "peer-only", version: "1.0.0", license: "MIT" })}\n`,
    );
    write(join(input.packageRoot, "node_modules/peer-only/LICENSE"), "peer-only license\n");

    const inventory = collectReleaseDependencyInventory(input);
    expect(inventory.components.some((component) => component.name === "peer-only")).toBe(false);
  });

  it("keeps the checked-in real closure complete, including every Pi package", () => {
    const inventory = JSON.parse(
      readFileSync(
        new URL("../../apps/web/public/licenses/release-dependencies.json", import.meta.url),
        "utf8",
      ),
    ) as ReleaseDependencyInventory;
    expect(inventory.componentCount).toBe(inventory.components.length);
    expect(inventory.components.every((component) => component.licenseFiles.length > 0)).toBe(true);
    for (const name of [
      "@earendil-works/pi-agent-core",
      "@earendil-works/pi-ai",
      "@earendil-works/pi-client",
      "@earendil-works/pi-coding-agent",
      "@earendil-works/pi-protocol",
      "@earendil-works/pi-telemetry",
      "@earendil-works/pi-tui",
      "@omnimind/pi-coding-agent",
    ]) {
      expect(inventory.components.some((component) => component.name === name)).toBe(true);
    }
  });
});

// FILE: mac-update-zip.test.ts
// Purpose: Locks down macOS update zip validation and latest-mac.yml patching.
// Layer: Release/build tests
// Depends on: scripts/lib/mac-update-zip.ts.

import { assert, describe, it } from "@effect/vitest";

import {
  assertMacUpdateManifestZipMetadata,
  buildMacUpdateZipSymlinkEntries,
  isZipInfoSymlink,
  resolveMacUpdateManifestFileNames,
  resolveSingleMacUpdateZipFileName,
  resolveSingleTopLevelMacAppBundle,
  updateMacUpdateManifestZipEntry,
  validateMacUpdateManifestZipMetadata,
} from "./lib/mac-update-zip.ts";

describe("mac-update-zip", () => {
  it("detects symlink entries from unzip verbose metadata", () => {
    assert.equal(
      isZipInfoSymlink(
        `  Unix file attributes (120755 octal):            lrwxr-xr-x
  MS-DOS file attributes (00 hex):                none
`,
      ),
      true,
    );
    assert.equal(
      isZipInfoSymlink(
        `  Unix file attributes (100755 octal):            -rwxr-xr-x
  MS-DOS file attributes (00 hex):                none
`,
      ),
      false,
    );
  });

  it("builds Electron framework symlink paths for the top-level app bundle", () => {
    assert.deepStrictEqual(buildMacUpdateZipSymlinkEntries("HarnessOS.app"), [
      "HarnessOS.app/Contents/Frameworks/Electron Framework.framework/Electron Framework",
      "HarnessOS.app/Contents/Frameworks/Electron Framework.framework/Helpers",
      "HarnessOS.app/Contents/Frameworks/Electron Framework.framework/Libraries",
      "HarnessOS.app/Contents/Frameworks/Electron Framework.framework/Resources",
      "HarnessOS.app/Contents/Frameworks/Electron Framework.framework/Versions/Current",
    ]);
  });

  it("resolves exactly one top-level .app from update zip entries", () => {
    assert.equal(
      resolveSingleTopLevelMacAppBundle([
        "__MACOSX/HarnessOS.app/Contents/Info.plist",
        "HarnessOS.app/Contents/Info.plist",
        "HarnessOS.app/Contents/MacOS/HarnessOS",
      ]),
      "HarnessOS.app",
    );

    assert.throws(
      () =>
        resolveSingleTopLevelMacAppBundle([
          "HarnessOS.app/Contents/Info.plist",
          "Other.app/Contents/Info.plist",
        ]),
      /Expected one top-level \.app bundle/,
    );
  });

  it("resolves exactly one macOS update zip artifact", () => {
    assert.equal(
      resolveSingleMacUpdateZipFileName([
        "HarnessOS-0.1.5-arm64.dmg",
        "HarnessOS-0.1.5-arm64.zip",
        "latest-mac.yml",
      ]),
      "HarnessOS-0.1.5-arm64.zip",
    );

    assert.throws(
      () =>
        resolveSingleMacUpdateZipFileName(["HarnessOS-0.1.5-arm64.zip", "HarnessOS-0.1.5-x64.zip"]),
      /Expected one macOS update zip artifact/,
    );
  });

  it("requires at least one macOS update manifest", () => {
    assert.deepStrictEqual(
      resolveMacUpdateManifestFileNames([
        "HarnessOS-0.1.5-arm64.dmg",
        "HarnessOS-0.1.5-arm64.zip",
        "latest-mac.yml",
      ]),
      ["latest-mac.yml"],
    );

    assert.throws(
      () => resolveMacUpdateManifestFileNames(["HarnessOS-0.1.5-arm64.dmg"]),
      /Expected at least one macOS update manifest/,
    );
  });

  it("updates the macOS zip file entry and matching top-level sha", () => {
    const manifest = `version: 0.1.4
files:
  - url: HarnessOS-0.1.4-arm64.zip
    sha512: oldzip
    size: 100
  - url: HarnessOS-0.1.4-arm64.dmg
    sha512: olddmg
    size: 200
path: 'HarnessOS-0.1.4-arm64.zip'
sha512: oldzip
releaseDate: '2026-06-07T12:00:00.000Z'
`;

    const updated = updateMacUpdateManifestZipEntry(manifest, "HarnessOS-0.1.4-arm64.zip", {
      sha512: "newzip",
      size: 12345,
    });

    assert.equal(
      updated,
      `version: 0.1.4
files:
  - url: HarnessOS-0.1.4-arm64.zip
    sha512: newzip
    size: 12345
  - url: HarnessOS-0.1.4-arm64.dmg
    sha512: olddmg
    size: 200
path: 'HarnessOS-0.1.4-arm64.zip'
sha512: newzip
releaseDate: '2026-06-07T12:00:00.000Z'
`,
    );
  });

  it("drops the stale blockMapSize from the repacked zip entry but keeps the dmg blockMapSize", () => {
    const manifest = `version: 0.1.4
files:
  - url: HarnessOS-0.1.4-arm64.zip
    sha512: oldzip
    size: 100
    blockMapSize: 50
  - url: HarnessOS-0.1.4-arm64.dmg
    sha512: olddmg
    size: 200
    blockMapSize: 75
path: 'HarnessOS-0.1.4-arm64.zip'
sha512: oldzip
releaseDate: '2026-06-07T12:00:00.000Z'
`;

    const updated = updateMacUpdateManifestZipEntry(manifest, "HarnessOS-0.1.4-arm64.zip", {
      sha512: "newzip",
      size: 12345,
    });

    assert.equal(
      updated,
      `version: 0.1.4
files:
  - url: HarnessOS-0.1.4-arm64.zip
    sha512: newzip
    size: 12345
  - url: HarnessOS-0.1.4-arm64.dmg
    sha512: olddmg
    size: 200
    blockMapSize: 75
path: 'HarnessOS-0.1.4-arm64.zip'
sha512: newzip
releaseDate: '2026-06-07T12:00:00.000Z'
`,
    );
  });

  it("rejects manifests missing the target zip entry", () => {
    assert.throws(
      () =>
        updateMacUpdateManifestZipEntry(
          `version: 0.1.4
files:
  - url: HarnessOS-0.1.4-arm64.dmg
    sha512: olddmg
    size: 200
releaseDate: '2026-06-07T12:00:00.000Z'
`,
          "HarnessOS-0.1.4-arm64.zip",
          {
            sha512: "newzip",
            size: 12345,
          },
        ),
      /Could not update HarnessOS-0.1.4-arm64.zip entry/,
    );
  });

  it("validates manifest metadata after zip repack", () => {
    const manifest = `version: 0.1.5
files:
  - url: HarnessOS-0.1.5-arm64.zip
    sha512: newzip
    size: 12345
path: HarnessOS-0.1.5-arm64.zip
sha512: newzip
releaseDate: '2026-06-07T12:00:00.000Z'
`;
    const metadata = { sha512: "newzip", size: 12345 };

    assert.deepStrictEqual(
      validateMacUpdateManifestZipMetadata(manifest, "HarnessOS-0.1.5-arm64.zip", metadata),
      {
        manifestHasZipPath: true,
        manifestHasZipSha: true,
        manifestHasZipSize: true,
      },
    );
    assert.deepStrictEqual(
      assertMacUpdateManifestZipMetadata(manifest, "HarnessOS-0.1.5-arm64.zip", metadata),
      {
        manifestHasZipPath: true,
        manifestHasZipSha: true,
        manifestHasZipSize: true,
      },
    );
  });
});

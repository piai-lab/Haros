// FILE: check-brand-identity.ts
// Purpose: Lock the explicitly temporary OmniMind brand source and its platform exports.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const approvedVisualAssetDigests = new Map<string, string>([
  ["assets/brand/icon-light.svg", "c7f97d279356a6cf35b6eb8583b93449fd3082cb4e261c6f3fd9724fb69dd7aa"],
  ["assets/brand/icon-dark.svg", "469171d55f39005f4eef1e1783105460b15c37aa0f392b5d184bcf1d4bd6e560"],
  ["apps/web/public/omnimind-icon-light.svg", "c7f97d279356a6cf35b6eb8583b93449fd3082cb4e261c6f3fd9724fb69dd7aa"],
  ["apps/web/public/omnimind-icon-dark.svg", "469171d55f39005f4eef1e1783105460b15c37aa0f392b5d184bcf1d4bd6e560"],
  ["apps/web/public/favicon.ico", "851e9f2473c33b6fa418ea6cce096689a0c3b4a0d5d83206db6214fb09323777"],
  ["apps/web/public/favicon-16x16.png", "064285070da0355f07dbb3302126f29bdef2137ba6e04474becbd1db886bef11"],
  ["apps/web/public/favicon-32x32.png", "3cd93b6f5b386e3e1c39b48245e258c038a89750652cb5c68e5b644c1de63ec2"],
  ["apps/web/public/apple-touch-icon.png", "12b26647fbf1a7d98e566381aa54b8375135f4df5b97705c64b7536014dfaacb"],
  ["apps/desktop/resources/icon.png", "2867e1f2fbda9d614b65c7441a3b5f648657f78427647064ce4b0054320ea81f"],
  ["apps/desktop/resources/dock-icon.png", "2867e1f2fbda9d614b65c7441a3b5f648657f78427647064ce4b0054320ea81f"],
  ["apps/desktop/resources/icon.ico", "851e9f2473c33b6fa418ea6cce096689a0c3b4a0d5d83206db6214fb09323777"],
  ["apps/desktop/resources/icon.icns", "50d6b9254d3efb45d5fad43c35fd3bf87e0fcbce70ed0d08810be133cdaf6c87"],
]);

export interface BrandIdentityViolation {
  readonly path: string;
  readonly line: number | null;
  readonly text: string;
}

export interface BrandIdentityBinaryFile {
  readonly path: string;
  readonly contents: Uint8Array;
}

export function findVisualBrandAssetViolations(
  files: readonly BrandIdentityBinaryFile[],
  approvedDigests: ReadonlyMap<string, string> = approvedVisualAssetDigests,
): BrandIdentityViolation[] {
  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const violations: BrandIdentityViolation[] = [];
  for (const [path, approvedDigest] of approvedDigests) {
    const file = filesByPath.get(path);
    if (!file) {
      violations.push({ path, line: null, text: "Required temporary brand asset is missing." });
      continue;
    }
    const digest = createHash("sha256").update(file.contents).digest("hex");
    if (digest !== approvedDigest) {
      violations.push({
        path,
        line: null,
        text: "Temporary brand asset changed; repeat the explicit visual calibration.",
      });
    }
  }
  return violations;
}

function main(): void {
  const files = [...approvedVisualAssetDigests.keys()].map((path) => ({
    path,
    contents: readFileSync(path),
  }));
  const violations = findVisualBrandAssetViolations(files);
  if (violations.length === 0) {
    console.log(`temporary OmniMind brand assets verified: ${files.length} source/platform files`);
    return;
  }
  for (const violation of violations) console.error(`${violation.path}: ${violation.text}`);
  process.exitCode = 1;
}

if (import.meta.main) main();

// FILE: appTypographySourceContract.test.ts
// Purpose: Prevent fixed fractional copy sizes from bypassing the persisted app typography scale.
// Layer: Web typography source contract

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const COMPONENTS_ROOT = new URL("../components/", import.meta.url);
const DEVICE_PROJECTION_EXCEPTIONS = [
  "DevicePanel.tsx:text-[9.5px]",
  "device/DeviceScreenStates.tsx:text-[8.5px]",
  "device/DeviceScreenStates.tsx:text-[9.5px]",
];

function componentSourcePaths(directory: URL, prefix = ""): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      return componentSourcePaths(new URL(`${entry.name}/`, directory), `${relativePath}/`);
    }
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [relativePath] : [];
  });
}

describe("app typography source contract", () => {
  it("keeps fixed fractional type sizes confined to the scaled device projection", () => {
    const fractionalUtilities = componentSourcePaths(COMPONENTS_ROOT).flatMap((relativePath) => {
      const source = readFileSync(new URL(relativePath, COMPONENTS_ROOT), "utf8");
      return Array.from(
        source.matchAll(/text-\[[0-9]+\.[0-9]+px\]/g),
        (match) => `${relativePath}:${match[0]}`,
      );
    });

    expect(fractionalUtilities.toSorted()).toEqual(DEVICE_PROJECTION_EXCEPTIONS);
  });
});

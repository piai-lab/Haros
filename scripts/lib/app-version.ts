// FILE: app-version.ts
// Purpose: Maps exact HEAD version tags onto packaged desktop identity.
// Layer: Desktop packaging helper

export const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const VERSION_TAG_PATTERN = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/u;

export interface ParsedVersionTag {
  readonly tag: string;
  readonly version: string;
}

export function isPackagedAppVersion(value: string): boolean {
  if (!APP_VERSION_PATTERN.test(value)) return false;
  return !value.includes("..") && !value.endsWith(".") && !value.endsWith("-");
}

export function parseVersionTag(raw: string): ParsedVersionTag | null {
  const tag = raw.trim();
  const match = VERSION_TAG_PATTERN.exec(tag);
  const version = match?.[1];
  if (!version || !isPackagedAppVersion(version)) {
    return null;
  }
  // git describe appends -<n>-g<sha> or a trailing -g<sha>; those are not release tags.
  if (/-\d+-g[0-9a-f]+$/iu.test(version) || /-g[0-9a-f]{7,}$/iu.test(version)) {
    return null;
  }
  return { tag, version };
}

export function listExactVersionTags(
  rawTags: ReadonlyArray<string>,
): ReadonlyArray<ParsedVersionTag> {
  const seen = new Set<string>();
  const tags: ParsedVersionTag[] = [];
  for (const raw of rawTags) {
    const parsed = parseVersionTag(raw);
    if (!parsed || seen.has(parsed.tag)) continue;
    seen.add(parsed.tag);
    tags.push(parsed);
  }
  return tags;
}

export function requireUniqueHeadVersion(rawTags: ReadonlyArray<string>): ParsedVersionTag {
  const tags = listExactVersionTags(rawTags);
  if (tags.length === 0) {
    throw new Error(
      "HEAD has no version tag. Create an exact tag such as v0.1.0-alpha.1, or pass --build-version.",
    );
  }
  if (tags.length > 1) {
    throw new Error(
      `HEAD has multiple version tags (${tags.map((tag) => tag.tag).join(", ")}); keep exactly one.`,
    );
  }
  const unique = tags[0];
  if (!unique) {
    throw new Error(
      "HEAD has no version tag. Create an exact tag such as v0.1.0-alpha.1, or pass --build-version.",
    );
  }
  return unique;
}

export function resolvePackagedAppVersion(input: {
  readonly explicitVersion: string | undefined;
  readonly headTags: ReadonlyArray<string>;
  readonly allowPackageFallback: boolean;
  readonly packageVersion: string;
}): string {
  if (input.explicitVersion !== undefined) {
    if (!isPackagedAppVersion(input.explicitVersion)) {
      throw new Error(
        `Expected a semver packaged version such as 0.1.0-alpha.1, got '${input.explicitVersion}'.`,
      );
    }
    return input.explicitVersion;
  }
  if (input.allowPackageFallback) {
    if (!isPackagedAppVersion(input.packageVersion)) {
      throw new Error(
        `Expected a semver packaged version such as 0.1.0-alpha.1, got '${input.packageVersion}'.`,
      );
    }
    return input.packageVersion;
  }
  return requireUniqueHeadVersion(input.headTags).version;
}

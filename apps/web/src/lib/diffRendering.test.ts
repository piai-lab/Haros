// FILE: diffRendering.test.ts
// Purpose: Verifies shared git patch helpers used by diff chrome and header badges.
// Layer: Web diff utility tests
// Depends on: Vitest and diffRendering helpers

import { describe, expect, it } from "vitest";
import {
  buildFileDiffRenderKey,
  buildPatchCacheKey,
  fileDiffStatsByPath,
  getRenderablePatch,
  rawPatchByFileRenderKey,
  resolveDiffCopyText,
  resolveFileDiffStatByChangedPath,
  resolveFileDiffPath,
  sortFileDiffsByPath,
  splitRepoRelativePath,
  summarizePatchTotals,
} from "./diffRendering";

function samePathPatch(nextValue: string): string {
  return [
    "diff --git a/src/refresh.ts b/src/refresh.ts",
    "index 1111111..2222222 100644",
    "--- a/src/refresh.ts",
    "+++ b/src/refresh.ts",
    "@@ -1,1 +1,1 @@",
    "-const value = 'before';",
    `+const value = '${nextValue}';`,
    "",
  ].join("\n");
}

describe("buildPatchCacheKey", () => {
  it("returns a stable cache key for identical content", () => {
    const patch = "diff --git a/a.ts b/a.ts\n+console.log('hello')";

    expect(buildPatchCacheKey(patch)).toBe(buildPatchCacheKey(patch));
  });

  it("normalizes outer whitespace before hashing", () => {
    const patch = "diff --git a/a.ts b/a.ts\n+console.log('hello')";

    expect(buildPatchCacheKey(`\n${patch}\n`)).toBe(buildPatchCacheKey(patch));
  });

  it("changes when diff content changes", () => {
    const before = "diff --git a/a.ts b/a.ts\n+console.log('hello')";
    const after = "diff --git a/a.ts b/a.ts\n+console.log('hello world')";

    expect(buildPatchCacheKey(before)).not.toBe(buildPatchCacheKey(after));
  });

  it("changes when cache scope changes", () => {
    const patch = "diff --git a/a.ts b/a.ts\n+console.log('hello')";

    expect(buildPatchCacheKey(patch, "diff-panel:light")).not.toBe(
      buildPatchCacheKey(patch, "diff-panel:dark"),
    );
  });
});

describe("resolveDiffCopyText", () => {
  it("preserves the original patch content for clipboard writes", () => {
    const patch = "diff --git a/a.ts b/a.ts\n+console.log('hello')\n";

    expect(resolveDiffCopyText(patch)).toBe(patch);
  });

  it("preserves mode-only metadata without reconstructing the patch", () => {
    const patch = [
      "diff --git a/script.sh b/script.sh",
      "old mode 100644",
      "new mode 100755",
      "",
    ].join("\n");

    expect(resolveDiffCopyText(patch)).toBe(patch);
  });

  it("preserves every line of a large patch without depending on mounted rows", () => {
    const bodyLines = Array.from({ length: 6000 }, (_, index) => `+line ${index + 1}`);
    const patch = [
      "diff --git a/big.txt b/big.txt",
      "new file mode 100644",
      "index 0000000..1111111",
      "--- /dev/null",
      "+++ b/big.txt",
      "@@ -0,0 +1,6000 @@",
      ...bodyLines,
      "",
    ].join("\n");

    expect(resolveDiffCopyText(patch)).toBe(patch);
  });

  it("does not expose empty or missing patches as copyable", () => {
    expect(resolveDiffCopyText(undefined)).toBeNull();
    expect(resolveDiffCopyText(" \n\t ")).toBeNull();
  });
});

describe("file diff identity helpers", () => {
  const twoFilePatch = [
    "diff --git a/src/one.ts b/src/one.ts",
    "index 1111111..2222222 100644",
    "--- a/src/one.ts",
    "+++ b/src/one.ts",
    "@@ -1,1 +1,1 @@",
    "-const one = 1;",
    "+const one = 2;",
    "diff --git a/src/two.ts b/src/two.ts",
    "index 3333333..4444444 100644",
    "--- a/src/two.ts",
    "+++ b/src/two.ts",
    "@@ -1,1 +1,1 @@",
    "-const two = 1;",
    "+const two = 2;",
    "",
  ].join("\n");

  it("strips a/ and b/ prefixes from parsed file paths", () => {
    const renderable = getRenderablePatch(twoFilePatch, "git-pane:test");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    const paths = renderable.files.map((file) => resolveFileDiffPath(file));
    expect(paths).toContain("src/one.ts");
    expect(paths).toContain("src/two.ts");
  });

  it("derives a unique, stable render key per file", () => {
    const renderable = getRenderablePatch(twoFilePatch, "git-pane:test");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    const keys = renderable.files.map((file) => buildFileDiffRenderKey(file));
    expect(new Set(keys).size).toBe(keys.length);
    // Re-parsing the same patch yields the same identity for selection persistence.
    const reparsed = getRenderablePatch(twoFilePatch, "git-pane:test");
    if (reparsed?.kind !== "files") return;
    expect(reparsed.files.map((file) => buildFileDiffRenderKey(file))).toEqual(keys);
  });

  it("changes the render key when the same file path receives new diff content", () => {
    const first = getRenderablePatch(samePathPatch("first"), "git-pane:refresh");
    const second = getRenderablePatch(samePathPatch("second"), "git-pane:refresh");
    expect(first?.kind).toBe("files");
    expect(second?.kind).toBe("files");
    if (first?.kind !== "files" || second?.kind !== "files") return;

    expect(resolveFileDiffPath(first.files[0]!)).toBe(resolveFileDiffPath(second.files[0]!));
    expect(buildFileDiffRenderKey(first.files[0]!)).not.toBe(
      buildFileDiffRenderKey(second.files[0]!),
    );
  });

  it("keeps binary image diffs as renderable file rows", () => {
    const patch = [
      "diff --git a/assets/screenshot.png b/assets/screenshot.png",
      "index 1111111..2222222 100644",
      "Binary files a/assets/screenshot.png and b/assets/screenshot.png differ",
      "",
    ].join("\n");

    const renderable = getRenderablePatch(patch, "git-pane:binary-image");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    expect(renderable.files).toHaveLength(1);
    const [file] = renderable.files;
    expect(file).toBeDefined();
    if (!file) return;
    expect(resolveFileDiffPath(file)).toBe("assets/screenshot.png");
    expect(file.hunks).toEqual([]);
  });
});

describe("rawPatchByFileRenderKey", () => {
  function exactFileSections(patch: string): Map<string, string> {
    const renderable = getRenderablePatch(patch, "timeline:copy-test");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return new Map();
    return new Map(
      renderable.files.map((file) => [
        resolveFileDiffPath(file),
        rawPatchByFileRenderKey(patch, renderable.files, "timeline:copy-test").get(
          buildFileDiffRenderKey(file),
        ) ?? "",
      ]),
    );
  }

  it("preserves exact Git sections for multiple files", () => {
    const secondHeader = "diff --git a/src/two.ts b/src/two.ts";
    const patch = [
      "diff --git a/src/one.ts b/src/one.ts",
      "index 1111111..2222222 100644",
      "--- a/src/one.ts",
      "+++ b/src/one.ts",
      "@@ -1 +1 @@",
      "-one",
      "+ONE",
      secondHeader,
      "index 3333333..4444444 100644",
      "--- a/src/two.ts",
      "+++ b/src/two.ts",
      "@@ -1 +1 @@",
      "-two",
      "+TWO",
      "",
    ].join("\n");
    const sections = exactFileSections(patch);
    const boundary = patch.indexOf(secondHeader);

    expect(sections.get("src/one.ts")).toBe(patch.slice(0, boundary));
    expect(sections.get("src/two.ts")).toBe(patch.slice(boundary));
  });

  it("preserves ordinary unified sections", () => {
    const secondHeader = "--- old/two.txt";
    const patch = [
      "--- old/one.txt",
      "+++ new/one.txt",
      "@@ -1 +1 @@",
      "-one",
      "+ONE",
      secondHeader,
      "+++ new/two.txt",
      "@@ -1 +1 @@",
      "-two",
      "+TWO",
      "",
    ].join("\n");
    const sections = exactFileSections(patch);
    const boundary = patch.indexOf(secondHeader);

    expect(sections.get("new/one.txt")).toBe(patch.slice(0, boundary));
    expect(sections.get("new/two.txt")).toBe(patch.slice(boundary));
  });

  it("keeps create, delete, pure/changed rename, quoted paths, and binary files copyable", () => {
    const fixtures = [
      [
        "diff --git a/new.ts b/new.ts",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/new.ts",
        "@@ -0,0 +1 @@",
        "+new",
        "",
      ].join("\n"),
      [
        "diff --git a/old.ts b/old.ts",
        "deleted file mode 100644",
        "--- a/old.ts",
        "+++ /dev/null",
        "@@ -1 +0,0 @@",
        "-old",
        "",
      ].join("\n"),
      [
        "diff --git a/src/old.ts b/src/new.ts",
        "similarity index 100%",
        "rename from src/old.ts",
        "rename to src/new.ts",
        "",
      ].join("\n"),
      [
        'diff --git "a/src/old name.ts" "b/src/new name.ts"',
        "similarity index 90%",
        "rename from src/old name.ts",
        "rename to src/new name.ts",
        "--- a/src/old name.ts",
        "+++ b/src/new name.ts",
        "@@ -1 +1 @@",
        "-old",
        "+new",
        "",
      ].join("\n"),
      [
        "diff --git a/assets/image.png b/assets/image.png",
        "index 1111111..2222222 100644",
        "Binary files a/assets/image.png and b/assets/image.png differ",
        "",
      ].join("\n"),
    ];

    for (const patch of fixtures) {
      const renderable = getRenderablePatch(patch, "timeline:edge-copy");
      expect(renderable?.kind).toBe("files");
      if (renderable?.kind !== "files") continue;
      const copies = rawPatchByFileRenderKey(patch, renderable.files, "timeline:edge-copy");
      expect(copies.get(buildFileDiffRenderKey(renderable.files[0]!))).toBe(patch);
    }
  });

  it("keeps valid ---/+++ hunk content inside its ordinary unified section", () => {
    const secondHeader = "--- old/second.txt";
    const patch = [
      "--- old/value.txt",
      "+++ new/value.txt",
      "@@ -1 +1 @@",
      "--- before",
      "+++ after",
      secondHeader,
      "+++ new/second.txt",
      "@@ -1 +1 @@",
      "-second",
      "+SECOND",
      "",
    ].join("\n");
    const renderable = getRenderablePatch(patch, "timeline:ambiguous-copy");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    const copies = rawPatchByFileRenderKey(patch, renderable.files);
    const boundary = patch.indexOf(secondHeader);
    expect(copies.get(buildFileDiffRenderKey(renderable.files[0]!))).toBe(patch.slice(0, boundary));
    expect(copies.get(buildFileDiffRenderKey(renderable.files[1]!))).toBe(patch.slice(boundary));
    expect(rawPatchByFileRenderKey("not a patch", renderable.files)).toEqual(new Map());
  });

  it.each(["LF", "CRLF"] as const)(
    "preserves %s sections, EOF markers, and a missing final newline",
    (lineEnding) => {
      const eol = lineEnding === "CRLF" ? "\r\n" : "\n";
      const patch = [
        "diff --git a/src/eof.txt b/src/eof.txt",
        "index 1111111..2222222 100644",
        "--- a/src/eof.txt",
        "+++ b/src/eof.txt",
        "@@ -1 +1 @@",
        "-before",
        "\\ No newline at end of file",
        "+after",
        "\\ No newline at end of file",
      ].join(eol);
      const renderable = getRenderablePatch(patch, `timeline:${lineEnding}`);
      expect(renderable?.kind).toBe("files");
      if (renderable?.kind !== "files") return;

      expect(
        rawPatchByFileRenderKey(patch, renderable.files).get(
          buildFileDiffRenderKey(renderable.files[0]!),
        ),
      ).toBe(patch);
    },
  );

  it("excludes mbox metadata while preserving repeated-path commit sections in order", () => {
    const firstSection = [
      "diff --git a/src/repeated.ts b/src/repeated.ts",
      "index 1111111..2222222 100644",
      "--- a/src/repeated.ts",
      "+++ b/src/repeated.ts",
      "@@ -1 +1 @@",
      "-one",
      "+two",
      "",
    ].join("\n");
    const secondSection = [
      "diff --git a/src/repeated.ts b/src/repeated.ts",
      "index 2222222..3333333 100644",
      "--- a/src/repeated.ts",
      "+++ b/src/repeated.ts",
      "@@ -1 +1 @@",
      "-two",
      "+three",
      "",
    ].join("\n");
    const firstMetadata = [
      "From 1111111111111111111111111111111111111111 Mon Sep 17 00:00:00 2001",
      "From: Example <example@example.com>",
      "Subject: [PATCH 1/2] first",
      "",
    ].join("\n");
    const secondMetadata = [
      "From 2222222222222222222222222222222222222222 Mon Sep 17 00:00:00 2001",
      "From: Example <example@example.com>",
      "Subject: [PATCH 2/2] second",
      "",
    ].join("\n");
    const patch = `${firstMetadata}\n${firstSection}${secondMetadata}\n${secondSection}-- \n2.50.1 (Apple Git-155)\n`;
    const renderable = getRenderablePatch(patch, "timeline:mbox");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    const copies = rawPatchByFileRenderKey(patch, renderable.files, "timeline:mbox");
    expect(renderable.files).toHaveLength(2);
    expect(copies.get(buildFileDiffRenderKey(renderable.files[0]!))).toBe(firstSection);
    expect(copies.get(buildFileDiffRenderKey(renderable.files[1]!))).toBe(secondSection);
  });

  it("excludes a configurable multiline format-patch signature without parsing its payload", () => {
    const section = samePathPatch("signed");
    const patch = `${section}-- \nHaros release signature\nsecond signature line\n`;
    const renderable = getRenderablePatch(patch, "timeline:custom-mbox-signature");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    expect(
      rawPatchByFileRenderKey(patch, renderable.files).get(
        buildFileDiffRenderKey(renderable.files[0]!),
      ),
    ).toBe(section);
  });

  it("does not confuse signature-like hunk content with mbox metadata", () => {
    const patch = [
      "diff --git a/src/version.txt b/src/version.txt",
      "index 1111111..2222222 100644",
      "--- a/src/version.txt",
      "+++ b/src/version.txt",
      "@@ -1 +1 @@",
      "-- ",
      "+2.50.1",
      "",
    ].join("\n");
    const renderable = getRenderablePatch(patch, "timeline:signature-content");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    expect(
      rawPatchByFileRenderKey(patch, renderable.files).get(
        buildFileDiffRenderKey(renderable.files[0]!),
      ),
    ).toBe(patch);
  });

  it("fails safe for malformed, combined, identity-drifted, and content-drifted input", () => {
    const validPatch = samePathPatch("first");
    const renderable = getRenderablePatch(validPatch, "timeline:fail-safe");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    const malformed = [
      "--- old/refresh.ts",
      "+++ new/refresh.ts",
      "@@ -2 +1 @@",
      "-only-one-old-line",
      "+new-line",
    ].join("\n");
    const combined = [
      "diff --cc src/refresh.ts",
      "index 1111111,2222222..3333333",
      "--- a/src/refresh.ts",
      "+++ b/src/refresh.ts",
      "@@@ -1,1 -1,1 +1,1 @@@",
      "--old",
      "++new",
      "",
    ].join("\n");

    expect(rawPatchByFileRenderKey(malformed, renderable.files)).toEqual(new Map());
    expect(rawPatchByFileRenderKey(combined, renderable.files)).toEqual(new Map());
    expect(rawPatchByFileRenderKey(samePathPatch("different"), renderable.files)).toEqual(
      new Map(),
    );

    const otherPathPatch = validPatch.replaceAll("refresh.ts", "other.ts");
    expect(rawPatchByFileRenderKey(otherPathPatch, renderable.files)).toEqual(new Map());
  });
});

describe("splitRepoRelativePath", () => {
  it("splits a nested path into a trailing-slash dir and leaf name", () => {
    expect(splitRepoRelativePath("src/components/Foo.tsx")).toEqual({
      dir: "src/components/",
      name: "Foo.tsx",
    });
  });

  it("treats a bare filename as having no directory", () => {
    expect(splitRepoRelativePath("README.md")).toEqual({ dir: "", name: "README.md" });
  });
});

describe("sortFileDiffsByPath", () => {
  const outOfOrderPatch = [
    "diff --git a/src/zebra.ts b/src/zebra.ts",
    "index 1111111..2222222 100644",
    "--- a/src/zebra.ts",
    "+++ b/src/zebra.ts",
    "@@ -1,1 +1,1 @@",
    "-const z = 1;",
    "+const z = 2;",
    "diff --git a/src/item10.ts b/src/item10.ts",
    "index 3333333..4444444 100644",
    "--- a/src/item10.ts",
    "+++ b/src/item10.ts",
    "@@ -1,1 +1,1 @@",
    "-const a = 1;",
    "+const a = 2;",
    "diff --git a/src/item2.ts b/src/item2.ts",
    "index 5555555..6666666 100644",
    "--- a/src/item2.ts",
    "+++ b/src/item2.ts",
    "@@ -1,1 +1,1 @@",
    "-const b = 1;",
    "+const b = 2;",
    "",
  ].join("\n");

  it("orders files by natural path order without mutating the input", () => {
    const renderable = getRenderablePatch(outOfOrderPatch, "git-pane:sort");
    expect(renderable?.kind).toBe("files");
    if (renderable?.kind !== "files") return;

    const original = [...renderable.files];
    const sorted = sortFileDiffsByPath(renderable.files);

    // Numeric-aware ordering keeps item2 before item10, and the input is untouched.
    expect(sorted.map((file) => resolveFileDiffPath(file))).toEqual([
      "src/item2.ts",
      "src/item10.ts",
      "src/zebra.ts",
    ]);
    expect(renderable.files).toEqual(original);
  });
});

describe("summarizePatchTotals", () => {
  it("summarizes additions and deletions from a single-file unified patch", () => {
    const patch = [
      "diff --git a/src/example.ts b/src/example.ts",
      "index 1111111..2222222 100644",
      "--- a/src/example.ts",
      "+++ b/src/example.ts",
      "@@ -1,3 +1,4 @@",
      " const stable = true;",
      "-const oldValue = 1;",
      "+const newValue = 1;",
      "+const addedValue = 2;",
      " export { stable };",
      "",
    ].join("\n");

    expect(summarizePatchTotals(patch)).toEqual({ additions: 2, deletions: 1, fileCount: 1 });
  });

  it("includes the changed file count alongside additions and deletions", () => {
    const patch = [
      "diff --git a/src/one.ts b/src/one.ts",
      "index 1111111..2222222 100644",
      "--- a/src/one.ts",
      "+++ b/src/one.ts",
      "@@ -1,2 +1,2 @@",
      " const a = 1;",
      "-const b = 1;",
      "+const b = 2;",
      "diff --git a/src/two.ts b/src/two.ts",
      "index 3333333..4444444 100644",
      "--- a/src/two.ts",
      "+++ b/src/two.ts",
      "@@ -0,0 +1,2 @@",
      "+const c = 3;",
      "+const d = 4;",
      "",
    ].join("\n");

    expect(summarizePatchTotals(patch)).toEqual({ additions: 3, deletions: 1, fileCount: 2 });
  });

  it("returns null when the patch has no file diffs", () => {
    expect(summarizePatchTotals(undefined)).toBeNull();
  });
});

describe("fileDiffStatsByPath", () => {
  it("builds per-file stats from a parsed patch", () => {
    const patch = [
      "diff --git a/src/one.ts b/src/one.ts",
      "index 1111111..2222222 100644",
      "--- a/src/one.ts",
      "+++ b/src/one.ts",
      "@@ -1,2 +1,2 @@",
      "-const one = 1;",
      "+const one = 2;",
      " const stable = true;",
      "diff --git a/src/two.ts b/src/two.ts",
      "index 3333333..4444444 100644",
      "--- a/src/two.ts",
      "+++ b/src/two.ts",
      "@@ -0,0 +1,2 @@",
      "+const two = 2;",
      "+export { two };",
      "",
    ].join("\n");

    expect(fileDiffStatsByPath(patch)).toEqual(
      new Map([
        ["src/one.ts", { additions: 1, deletions: 1 }],
        ["src/two.ts", { additions: 2, deletions: 0 }],
      ]),
    );
  });
});

describe("resolveFileDiffStatByChangedPath", () => {
  it("matches absolute changed-file paths to repo-relative patch stats", () => {
    const stat = { additions: 2, deletions: 1 };
    const statsByPath = new Map([["apps/web/src/App.tsx", stat]]);

    expect(
      resolveFileDiffStatByChangedPath(
        statsByPath,
        "/Users/example/project/apps/web/src/App.tsx",
        2,
      ),
    ).toBe(stat);
  });

  it("does not reuse a sole parsed stat across unrelated files in a multi-file row", () => {
    const statsByPath = new Map([["src/only-patched.ts", { additions: 3, deletions: 0 }]]);

    expect(resolveFileDiffStatByChangedPath(statsByPath, "src/unrelated.ts", 2)).toBeUndefined();
  });

  it("keeps the single-file fallback when the visible row also has one changed file", () => {
    const stat = { additions: 1, deletions: 4 };
    const statsByPath = new Map([["src/generated-name.ts", stat]]);

    expect(resolveFileDiffStatByChangedPath(statsByPath, "provider-reported-name.ts", 1)).toBe(
      stat,
    );
  });

  it("avoids ambiguous basename matches", () => {
    const statsByPath = new Map([
      ["src/a/index.ts", { additions: 1, deletions: 0 }],
      ["src/b/index.ts", { additions: 0, deletions: 1 }],
    ]);

    expect(resolveFileDiffStatByChangedPath(statsByPath, "index.ts", 2)).toBeUndefined();
  });
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ownerPath = "architecture/public-surface.md";
const builtTextExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".svg",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

function parseOwnerDenylist(ownerText) {
  const matches = [...ownerText.matchAll(/^```public-surface-denylist\s*\n([\s\S]*?)^```\s*$/gmu)];
  assert.equal(matches.length, 1, `${ownerPath} must contain exactly one denylist block`);
  const rules = matches[0][1]
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  assert.ok(rules.length > 0, `${ownerPath} denylist must not be empty`);
  assert.equal(new Set(rules).size, rules.length, `${ownerPath} denylist entries must be unique`);
  return rules;
}

function scanText(relativePath, text, rules, surface) {
  const normalizedPath = relativePath.toLocaleLowerCase("en-US");
  const normalizedText = text.toLocaleLowerCase("en-US");
  return rules.flatMap((rule) => {
    const normalizedRule = rule.toLocaleLowerCase("en-US");
    return normalizedPath.includes(normalizedRule) || normalizedText.includes(normalizedRule)
      ? [{ path: relativePath, rule, surface }]
      : [];
  });
}

function isProductionSource(relativePath) {
  if (!/^(apps|packages|scripts)\//u.test(relativePath)) return false;
  if (
    /(^|\/)(dist|dist-electron|fixtures|node_modules|test|tests|__tests__)(\/|$)/u.test(
      relativePath,
    )
  ) {
    return false;
  }
  return !/\.(browser|spec|stories|test)\.[^.]+$/u.test(relativePath);
}

async function existingBuiltRoots() {
  const candidates = [
    "apps/desktop/dist",
    "apps/desktop/dist-electron",
    "apps/server/dist",
    "apps/web/dist",
  ];
  const packageEntries = await readdir(path.join(root, "packages"), { withFileTypes: true });
  for (const entry of packageEntries) {
    if (entry.isDirectory()) candidates.push(`packages/${entry.name}/dist`);
  }
  const roots = [];
  for (const candidate of candidates) {
    try {
      if ((await stat(path.join(root, candidate))).isDirectory()) roots.push(candidate);
    } catch {
      // Build roots are optional during focused source checks.
    }
  }
  return roots;
}

async function builtTextFiles(relativeDirectory) {
  const files = [];
  const visit = async (relativePath) => {
    const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
    for (const entry of entries) {
      const child = path.posix.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile() && builtTextExtensions.has(path.extname(entry.name))) {
        files.push(child);
      }
    }
  };
  await visit(relativeDirectory);
  return files;
}

test("public surface denylist blocks authored and existing built product leakage", async () => {
  const ownerText = await readFile(path.join(root, ownerPath), "utf8");
  const rules = parseOwnerDenylist(ownerText);
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "apps", "packages", "scripts"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(isProductionSource);
  const sourceFindings = [];
  for (const relativePath of tracked) {
    sourceFindings.push(
      ...scanText(
        relativePath,
        await readFile(path.join(root, relativePath), "utf8"),
        rules,
        "source",
      ),
    );
  }

  const builtFindings = [];
  for (const builtRoot of await existingBuiltRoots()) {
    for (const relativePath of await builtTextFiles(builtRoot)) {
      builtFindings.push(
        ...scanText(
          relativePath,
          await readFile(path.join(root, relativePath), "utf8"),
          rules,
          "built",
        ),
      );
    }
  }

  assert.deepEqual([...sourceFindings, ...builtFindings], []);
});

test("leakage check rejects denylisted destinations without blocking upstream or provider URLs", () => {
  const rules = ["tryomnimind.com", "trysynara.com", "@trySynara"];
  const blocked = [
    scanText("apps/web/src/help.ts", "https://tryomnimind.com/docs", rules, "source"),
    scanText("apps/web/dist/app.js", "https://trysynara.com", rules, "built"),
  ].flat();
  const allowed = scanText(
    "apps/web/src/providers.ts",
    "https://github.com/try-synara/synara https://api.deepseek.com/docs",
    rules,
    "source",
  );

  assert.deepEqual(
    blocked.map(({ rule, surface }) => ({ rule, surface })),
    [
      { rule: "tryomnimind.com", surface: "source" },
      { rule: "trysynara.com", surface: "built" },
    ],
  );
  assert.deepEqual(allowed, []);
});

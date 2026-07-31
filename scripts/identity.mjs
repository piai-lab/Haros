import { readFile } from "node:fs/promises";
import path from "node:path";

const LETTER_OR_NUMBER = "[\\p{L}\\p{N}]";
const DISCLOSURE_PATH = "README.md";
const LEGAL_PREFIX = "LICENSES/";

export function parseDenylist(readme) {
  const blocks = [...readme.matchAll(/```identity-denylist\s*\n([\s\S]*?)```/g)];
  if (blocks.length !== 1) {
    throw new Error(`expected one identity-denylist block, found ${blocks.length}`);
  }

  const rules = blocks[0][1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (rules.length === 0 || new Set(rules.map((rule) => rule.toLowerCase())).size !== rules.length) {
    throw new Error("identity-denylist must contain unique rules");
  }

  return rules;
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileRule(rule) {
  const segments = rule.split(/[\s_-]+/).filter(Boolean).map(escapePattern);
  const body = segments.join("[\\s_-]*");
  return new RegExp(`(?<!${LETTER_OR_NUMBER})${body}(?!${LETTER_OR_NUMBER})`, "giu");
}

export function isDisclosurePath(relativePath) {
  const portable = relativePath.split(path.sep).join("/");
  return portable === DISCLOSURE_PATH || portable.startsWith(LEGAL_PREFIX);
}

export function classifyPath(relativePath) {
  const portable = relativePath.split(path.sep).join("/");
  return /(^|\/)(dist|generated|vendor)\//.test(portable) ||
    /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(portable)
    ? "metadata"
    : "author";
}

function locate(text, index) {
  const prefix = text.slice(0, index);
  const lines = prefix.split("\n");
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function inspectText(relativePath, text, rules, surface) {
  const findings = [];
  for (const rule of rules) {
    const matcher = compileRule(rule);
    for (const match of text.matchAll(matcher)) {
      findings.push({
        path: relativePath,
        surface,
        category: classifyPath(relativePath),
        rule,
        ...locate(text, match.index),
      });
    }
  }
  return findings;
}

export async function scanIdentity({
  root,
  trackedFiles,
  runtimeFixtures = [],
  read = readFile,
}) {
  const readme = await read(path.join(root, DISCLOSURE_PATH), "utf8");
  const rules = parseDenylist(readme);
  const allowedRuntime = new Set(runtimeFixtures.map((file) => path.resolve(root, file)));
  const findings = [];

  for (const relativePath of trackedFiles) {
    if (isDisclosurePath(relativePath)) continue;
    const absolutePath = path.resolve(root, relativePath);
    if (allowedRuntime.has(absolutePath)) continue;

    findings.push(...inspectText(relativePath, relativePath, rules, "filename"));

    const buffer = await read(absolutePath);
    if (buffer.includes(0)) continue;
    findings.push(...inspectText(relativePath, buffer.toString("utf8"), rules, "content"));
  }

  return { findings, rules };
}

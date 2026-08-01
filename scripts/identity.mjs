import { readFile } from "node:fs/promises";
import path from "node:path";

const LETTER_OR_NUMBER = "[\\p{L}\\p{N}]";
const DISCLOSURE_PATH = "README.md";
const LEGAL_PREFIX = "LICENSES/";

const REQUIRED_STRUCTURE_FIELDS = [
  "authorRoots",
  "generatedDirectoryNames",
  "maxDirectoryDepth",
  "forbiddenNameTokens",
];

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

export function parseStructurePolicy(readme) {
  const blocks = [...readme.matchAll(/```structure-policy\s*\n([\s\S]*?)```/g)];
  if (blocks.length !== 1) {
    throw new Error(`expected one structure-policy block, found ${blocks.length}`);
  }

  const policy = JSON.parse(blocks[0][1]);
  for (const field of REQUIRED_STRUCTURE_FIELDS) {
    if (policy[field] === undefined) {
      throw new Error(`structure-policy is missing ${field}`);
    }
  }

  for (const field of ["authorRoots", "generatedDirectoryNames", "forbiddenNameTokens"]) {
    const values = policy[field];
    if (
      !Array.isArray(values) ||
      values.length === 0 ||
      values.some((value) => typeof value !== "string" || value.trim() === "") ||
      new Set(values.map((value) => value.toLowerCase())).size !== values.length
    ) {
      throw new Error(`structure-policy ${field} must contain unique non-empty names`);
    }
  }

  if (!Number.isInteger(policy.maxDirectoryDepth) || policy.maxDirectoryDepth < 1) {
    throw new Error("structure-policy maxDirectoryDepth must be a positive integer");
  }

  return policy;
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

function portablePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function nameTokens(segment) {
  const withoutExtensions = segment.replace(/(?:\.[A-Za-z0-9-]+)+$/g, "");
  return withoutExtensions
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function structureFinding(relativePath, rule) {
  return {
    path: relativePath,
    surface: "structure",
    category: "author",
    rule,
    line: 1,
    column: 1,
  };
}

export function scanStructure(paths, policy) {
  const findings = [];
  const allowedRoots = new Set(policy.authorRoots);
  const forbiddenTokens = new Set(policy.forbiddenNameTokens.map((token) => token.toLowerCase()));

  for (const relativePath of paths) {
    const portable = portablePath(relativePath);
    const segments = portable.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    if (segments.length > 1 && !allowedRoots.has(segments[0])) {
      findings.push(structureFinding(portable, `unapproved author root ${JSON.stringify(segments[0])}`));
    }

    const directoryDepth = segments.length - 1;
    if (directoryDepth > policy.maxDirectoryDepth) {
      findings.push(
        structureFinding(
          portable,
          `directory depth ${directoryDepth} exceeds ${policy.maxDirectoryDepth}`,
        ),
      );
    }

    for (const segment of segments) {
      const rejected = nameTokens(segment).find((token) => forbiddenTokens.has(token));
      if (rejected) {
        findings.push(structureFinding(portable, `forbidden name token ${JSON.stringify(rejected)}`));
        break;
      }
    }
  }

  return findings;
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
  sourceFiles = trackedFiles,
  generatedFiles = [],
  runtimeFixtures = [],
  read = readFile,
}) {
  const readme = await read(path.join(root, DISCLOSURE_PATH), "utf8");
  const rules = parseDenylist(readme);
  const structurePolicy = parseStructurePolicy(readme);
  const allowedRuntime = new Set(runtimeFixtures.map((file) => path.resolve(root, file)));
  const findings = scanStructure(sourceFiles, structurePolicy);

  for (const relativePath of sourceFiles) {
    if (isDisclosurePath(relativePath)) continue;
    const absolutePath = path.resolve(root, relativePath);
    if (allowedRuntime.has(absolutePath)) continue;

    findings.push(...inspectText(relativePath, relativePath, rules, "path"));

    const buffer = await read(absolutePath);
    if (buffer.includes(0)) continue;
    findings.push(...inspectText(relativePath, buffer.toString("utf8"), rules, "source"));
  }

  for (const relativePath of generatedFiles) {
    const absolutePath = path.resolve(root, relativePath);
    findings.push(
      ...inspectText(relativePath, relativePath, rules, "generated-path").map((finding) => ({
        ...finding,
        category: "generated",
      })),
    );

    const buffer = await read(absolutePath);
    findings.push(
      ...inspectText(relativePath, buffer.toString("utf8"), rules, "generated-output").map(
        (finding) => ({ ...finding, category: "generated" }),
      ),
    );
  }

  return { findings, rules, structurePolicy };
}

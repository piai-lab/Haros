import path from "node:path";
import { readFile } from "node:fs/promises";

export const DOCUMENT_CONTRACT_PATHS = [
  "AGENTS.md",
  "README.md",
  "source-adoptions.json",
  "SYNARA-INTAKE.md",
  "PI-ECOSYSTEM-INTAKE.md",
  "architecture/README.md",
  "architecture/workbench.md",
  "architecture/public-surface.md",
  "architecture/product-state.md",
  "architecture/execution.md",
  "execution-brief.md",
  "missions/independent-omnimind-v1.md",
  "research/README.md",
];

const REQUIRED_ROUTES = [
  ["README.md", "source-adoptions.json"],
  ["README.md", "architecture/README.md"],
  ["README.md", "architecture/workbench.md"],
  ["README.md", "architecture/public-surface.md"],
  ["README.md", "architecture/product-state.md"],
  ["README.md", "architecture/execution.md"],
  ["README.md", "execution-brief.md"],
  ["README.md", "missions/independent-omnimind-v1.md"],
  ["README.md", "research/README.md"],
  ["README.md", "SYNARA-INTAKE.md"],
  ["README.md", "PI-ECOSYSTEM-INTAKE.md"],
  ["AGENTS.md", "SYNARA-INTAKE.md"],
  ["AGENTS.md", "PI-ECOSYSTEM-INTAKE.md"],
  ["SYNARA-INTAKE.md", "source-adoptions.json"],
  ["SYNARA-INTAKE.md", "research/source-review.md"],
  ["SYNARA-INTAKE.md", "architecture/README.md"],
  ["SYNARA-INTAKE.md", "execution-brief.md"],
  ["SYNARA-INTAKE.md", "missions/independent-omnimind-v1.md"],
  ["PI-ECOSYSTEM-INTAKE.md", "README.md"],
  ["PI-ECOSYSTEM-INTAKE.md", "source-adoptions.json"],
  ["PI-ECOSYSTEM-INTAKE.md", "research/README.md"],
  ["PI-ECOSYSTEM-INTAKE.md", "architecture/README.md"],
  ["PI-ECOSYSTEM-INTAKE.md", "execution-brief.md"],
  ["PI-ECOSYSTEM-INTAKE.md", "missions/independent-omnimind-v1.md"],
  ["architecture/README.md", "workbench.md"],
  ["architecture/README.md", "public-surface.md"],
  ["architecture/README.md", "product-state.md"],
  ["architecture/README.md", "execution.md"],
  ["architecture/README.md", "../execution-brief.md"],
  ["architecture/README.md", "../missions/independent-omnimind-v1.md"],
  ["missions/independent-omnimind-v1.md", "../execution-brief.md"],
  ["research/README.md", "../SYNARA-INTAKE.md"],
  ["research/README.md", "../PI-ECOSYSTEM-INTAKE.md"],
];

const REQUIRED_READ_ORDER = [
  "README.md",
  "SYNARA-INTAKE.md",
  "PI-ECOSYSTEM-INTAKE.md",
  "architecture/README.md",
  "execution-brief.md",
  "missions/independent-omnimind-v1.md",
  "research/README.md",
];

const MACHINE_BLOCKS = [
  { path: "README.md", tag: "identity-denylist", format: "unique-lines" },
  { path: "README.md", tag: "structure-policy", format: "json" },
  {
    path: "architecture/public-surface.md",
    tag: "public-surface-denylist",
    format: "unique-lines",
  },
  { path: "architecture/execution.md", tag: "engine-capability-composition", format: "json" },
  { path: "architecture/workbench.md", tag: "work-surface-ia", format: "json" },
  { path: "architecture/workbench.md", tag: "model-services-ia", format: "json" },
];

function normalize(value) {
  return value.replaceAll("\r\n", "\n");
}

function addFinding(findings, rule, documentPath, message) {
  findings.push({ rule, path: documentPath, message });
}

function blocksFor(text, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("^```" + escaped + "\\s*\\n([\\s\\S]*?)^```\\s*$", "gm");
  return [...text.matchAll(pattern)].map((match) => match[1].trim());
}

function validateReadOrder(findings, documents) {
  const routing = documents.get("AGENTS.md") ?? "";
  let previous = -1;
  for (const target of REQUIRED_READ_ORDER) {
    const index = routing.indexOf(`\`${target}\``);
    if (index === -1) {
      addFinding(
        findings,
        "route.read-order",
        "AGENTS.md",
        `mandatory read route is missing ${target}`,
      );
      continue;
    }
    if (index <= previous) {
      addFinding(
        findings,
        "route.read-order",
        "AGENTS.md",
        `mandatory read route is out of order at ${target}`,
      );
    }
    previous = index;
  }
}

function validateRoutes(findings, documents) {
  for (const [source, target] of REQUIRED_ROUTES) {
    if (!(documents.get(source) ?? "").includes(target)) {
      addFinding(findings, "route.required", source, `required owner route is missing ${target}`);
    }
  }
}

function validateMachineBlocks(findings, documents) {
  for (const definition of MACHINE_BLOCKS) {
    const blocks = blocksFor(documents.get(definition.path) ?? "", definition.tag);
    if (blocks.length !== 1) {
      addFinding(
        findings,
        "machine-block.cardinality",
        definition.path,
        `${definition.tag} must appear exactly once`,
      );
      continue;
    }
    if (definition.format === "json") {
      try {
        JSON.parse(blocks[0]);
      } catch {
        addFinding(
          findings,
          "machine-block.invalid",
          definition.path,
          `${definition.tag} must contain valid JSON`,
        );
      }
      continue;
    }
    const entries = blocks[0]
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (entries.length === 0 || new Set(entries).size !== entries.length) {
      addFinding(
        findings,
        "machine-block.invalid",
        definition.path,
        `${definition.tag} must contain non-empty unique lines`,
      );
    }
  }
}

function isSafeRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]/u).includes("..")
  );
}

function validateDigestFields(findings, value, trail = "source-adoptions") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextTrail = `${trail}.${key}`;
    if (
      /sha256$/iu.test(key) &&
      (typeof child !== "object" || child === null) &&
      (typeof child !== "string" || !/^[0-9a-f]{64}$/u.test(child))
    ) {
      addFinding(
        findings,
        "source-adoptions.digest",
        "source-adoptions.json",
        `${nextTrail} must be a lowercase SHA-256`,
      );
    }
    validateDigestFields(findings, child, nextTrail);
  }
}

function validateSourceAdoptions(findings, documents) {
  const documentPath = "source-adoptions.json";
  let manifest;
  try {
    manifest = JSON.parse(documents.get(documentPath) ?? "");
  } catch {
    addFinding(
      findings,
      "source-adoptions.invalid",
      documentPath,
      "manifest must contain valid JSON",
    );
    return;
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.adopted) ||
    manifest.adopted.length === 0
  ) {
    addFinding(
      findings,
      "source-adoptions.structure",
      documentPath,
      "manifest must declare version 1 and contain a non-empty adopted array",
    );
    return;
  }
  const ids = new Set();
  for (const [index, adoption] of manifest.adopted.entries()) {
    const trail = `adopted[${index}]`;
    if (!adoption || typeof adoption !== "object" || Array.isArray(adoption)) {
      addFinding(
        findings,
        "source-adoptions.structure",
        documentPath,
        `${trail} must be an object`,
      );
      continue;
    }
    for (const field of ["id", "url", "revision", "rights", "mode", "updatePolicy"]) {
      if (typeof adoption[field] !== "string" || adoption[field].trim().length === 0) {
        addFinding(
          findings,
          "source-adoptions.structure",
          documentPath,
          `${trail}.${field} must be a non-empty string`,
        );
      }
    }
    if (typeof adoption.id === "string") {
      if (ids.has(adoption.id))
        addFinding(
          findings,
          "source-adoptions.identity",
          documentPath,
          `duplicate adoption id: ${adoption.id}`,
        );
      ids.add(adoption.id);
    }
    if (typeof adoption.revision === "string" && !/^[0-9a-f]{40}$/u.test(adoption.revision)) {
      addFinding(
        findings,
        "source-adoptions.revision",
        documentPath,
        `${trail}.revision must be a full lowercase Git commit`,
      );
    }
    for (const field of ["paths", "licenseFiles"]) {
      const values = adoption[field];
      if (
        !Array.isArray(values) ||
        values.length === 0 ||
        values.some((entry) => !isSafeRelativePath(entry)) ||
        new Set(values).size !== values.length
      ) {
        addFinding(
          findings,
          "source-adoptions.paths",
          documentPath,
          `${trail}.${field} must contain unique safe relative paths`,
        );
      }
    }
  }
  validateDigestFields(findings, manifest);
}

function validateCurrentState(findings, documents) {
  const campaign = documents.get("missions/independent-omnimind-v1.md") ?? "";
  if (!/^Status: active$/m.test(campaign)) {
    addFinding(
      findings,
      "campaign.structure",
      "missions/independent-omnimind-v1.md",
      "active Campaign must declare Status: active",
    );
  }
  if (!/^Canonical path: `missions\/independent-omnimind-v1\.md`$/m.test(campaign)) {
    addFinding(
      findings,
      "campaign.structure",
      "missions/independent-omnimind-v1.md",
      "Campaign canonical path is missing or changed",
    );
  }
}

/** Validate durable routing and machine structure without duplicating product semantics. */
export async function validateDocumentContract({ root, read = readFile }) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("validateDocumentContract requires a repository root");
  }
  const findings = [];
  const documents = new Map();
  for (const documentPath of DOCUMENT_CONTRACT_PATHS) {
    try {
      const content = await read(path.join(root, documentPath), "utf8");
      documents.set(documentPath, normalize(String(content)));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      addFinding(findings, "document.required", documentPath, "required contract input is missing");
    }
  }
  validateReadOrder(findings, documents);
  validateRoutes(findings, documents);
  validateMachineBlocks(findings, documents);
  validateSourceAdoptions(findings, documents);
  validateCurrentState(findings, documents);
  return findings;
}

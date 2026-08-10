import path from "node:path";
import { readFile } from "node:fs/promises";

export const DOCUMENT_CONTRACT_PATHS = [
  "AGENTS.md",
  "README.md",
  "architecture/README.md",
  "architecture/workbench.md",
  "architecture/public-surface.md",
  "architecture/product-state.md",
  "architecture/execution.md",
  "execution-brief.md",
  "missions/independent-omnimind-v1.md",
  "research/README.md",
  "research/source-update-intake.md",
  "research/decision-record.md",
];

const REQUIRED_ROUTES = [
  ["README.md", "architecture/README.md"],
  ["README.md", "architecture/workbench.md"],
  ["README.md", "architecture/public-surface.md"],
  ["README.md", "architecture/product-state.md"],
  ["README.md", "architecture/execution.md"],
  ["README.md", "execution-brief.md"],
  ["README.md", "missions/independent-omnimind-v1.md"],
  ["README.md", "research/README.md"],
  ["architecture/README.md", "workbench.md"],
  ["architecture/README.md", "public-surface.md"],
  ["architecture/README.md", "product-state.md"],
  ["architecture/README.md", "execution.md"],
  ["architecture/README.md", "../execution-brief.md"],
  ["architecture/README.md", "../missions/independent-omnimind-v1.md"],
  ["missions/independent-omnimind-v1.md", "../execution-brief.md"],
  ["research/README.md", "source-update-intake.md"],
  ["research/README.md", "decision-record.md"],
];

const REQUIRED_READ_ORDER = [
  "README.md",
  "architecture/README.md",
  "execution-brief.md",
  "missions/independent-omnimind-v1.md",
  "research/README.md",
];

const MACHINE_BLOCKS = [
  { path: "README.md", tag: "source-adoptions", format: "json" },
  { path: "README.md", tag: "identity-denylist", format: "unique-lines" },
  { path: "README.md", tag: "structure-policy", format: "json" },
  {
    path: "architecture/public-surface.md",
    tag: "public-surface-denylist",
    format: "unique-lines",
  },
  {
    path: "architecture/execution.md",
    tag: "engine-capability-composition",
    format: "json",
  },
  { path: "architecture/workbench.md", tag: "work-surface-ia", format: "json" },
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

  const decision = documents.get("research/decision-record.md") ?? "";
  if (!/^> \*\*Status: superseded in full on /m.test(decision)) {
    addFinding(
      findings,
      "history.superseded",
      "research/decision-record.md",
      "historical decision record must be explicitly superseded",
    );
  }

  const brief = documents.get("execution-brief.md") ?? "";
  const stageZero = brief.indexOf("| 0    | Authority reset");
  const stageOne = brief.indexOf("| 1    | Exact-source responsibility reset");
  if (stageZero === -1 || stageOne === -1 || stageZero >= stageOne) {
    addFinding(
      findings,
      "execution.stage-order",
      "execution-brief.md",
      "Authority reset must precede exact-source responsibility reset",
    );
  }
}

function validateEngineCapabilityComposition(findings, documents) {
  const documentPath = "architecture/execution.md";
  const blocks = blocksFor(documents.get(documentPath) ?? "", "engine-capability-composition");
  if (blocks.length !== 1) return;

  let policy;
  try {
    policy = JSON.parse(blocks[0]);
  } catch {
    return;
  }
  const expectedCapabilities = [
    "engine-native-ecosystem",
    "compatible-omnimind-library",
    "omnimind-workbench",
  ];
  if (
    JSON.stringify(policy.effectiveCapabilities) !== JSON.stringify(expectedCapabilities) ||
    policy.nativeEcosystemDisposition !== "preserve" ||
    policy.omnimindAssetDelivery !== "adapter-or-session-mount" ||
    policy.enginePrivateHomeMutation !== "forbidden" ||
    policy.identityConflict !== "explicit" ||
    policy.crossEngineDurableState !== "forbidden" ||
    policy.temporaryWebSurfacePresentation !== "current-thread-omnimind-browser" ||
    policy.temporaryWebSurfaceProvenance !== "engine-thread-tool-required" ||
    policy.externalBrowserActivation !== "explicit-user-only" ||
    policy.temporaryWebSurfaceDurability !== "memory-only"
  ) {
    addFinding(
      findings,
      "execution.engine-capability-composition",
      documentPath,
      "Engine native ecosystem must remain the preserved base of additive OmniMind composition",
    );
  }
}

function validateBundledPiRuntimeAdoption(findings, documents) {
  const documentPath = "README.md";
  const blocks = blocksFor(documents.get(documentPath) ?? "", "source-adoptions");
  if (blocks.length !== 1) return;

  let record;
  try {
    const parsed = JSON.parse(blocks[0]);
    record = parsed?.adopted?.find((entry) => entry?.id === "bundled-omnimind-agent-runtime");
  } catch {
    return;
  }

  const expected = {
    url: "https://github.com/earendil-works/pi.git",
    revision: "53fa77ccd8a279eb87e92294ef3687b03ff80112",
    paths: ["vendor/omnimind-pi-coding-agent-0.84.1.tgz"],
    sourcePaths: ["packages/coding-agent"],
    archiveSha256: "16b3ae817e700684e58be750b2edb5a14bc4aac4ac318fcd949e1c9e9ba934a9",
    upstreamPackage: "@earendil-works/pi-coding-agent@0.84.1",
    upstreamPackageIntegrity:
      "sha512-ncAqFrG+iybuPGOhMiZoEHkEzTpJgz3guYD32pD+M7ucc0WeHmauP6wa7qwP8V/KWvsZDVNa5XGsdZ7fkC7w7A==",
    licenseFiles: ["LICENSES/pi-coding-agent-MIT.txt"],
    sharedRuntimeBytes: "unchanged",
    behavioralDifferences: ["package identity", "piConfig.configDir"],
  };
  const actual = record
    ? {
        url: record.url,
        revision: record.revision,
        paths: record.paths,
        sourcePaths: record.sourcePaths,
        archiveSha256: record.archiveSha256,
        upstreamPackage: record.upstreamPackage,
        upstreamPackageIntegrity: record.upstreamPackageIntegrity,
        licenseFiles: record.licenseFiles,
        sharedRuntimeBytes: record.generation?.sharedRuntimeBytes,
        behavioralDifferences: record.generation?.behavioralDifferences,
      }
    : null;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    addFinding(
      findings,
      "source-adoption.bundled-pi-runtime",
      documentPath,
      "bundled OmniMind Agent must retain its exact Pi source, artifact, generation, and legal identity",
    );
  }
}

function validateWorkSurfaceInformationArchitecture(findings, documents) {
  const documentPath = "architecture/workbench.md";
  const blocks = blocksFor(documents.get(documentPath) ?? "", "work-surface-ia");
  if (blocks.length !== 1) return;

  let policy;
  try {
    policy = JSON.parse(blocks[0]);
  } catch {
    return;
  }
  const expected = {
    primaryModes: ["Agent", "Chat"],
    agentSecondary: ["New Agent", "Kanban", "Pull Requests", "Automations"],
    kanbanRoutes: ["/kanban", "/kanban/:projectId"],
    kanbanPrimaryMode: "Agent",
    kanbanCardTarget: "folder-backed Agent Thread",
    projectContextAction: "Open in Kanban",
  };
  if (JSON.stringify(policy) !== JSON.stringify(expected)) {
    addFinding(
      findings,
      "workbench.work-surface-ia",
      documentPath,
      "Kanban must remain the Agent domain's secondary console, not a third primary mode",
    );
  }
}

/**
 * Validate only the durable document graph and machine-readable owner blocks.
 * Product semantics remain in the sole owners and are reviewed as prose/design;
 * this checker deliberately does not turn architecture keywords into executable policy.
 *
 * @param {{ root: string, read?: (path: string, encoding: string) => Promise<string> }} options
 * @returns {Promise<Array<{rule: string, path: string, message: string}>>}
 */
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
  validateCurrentState(findings, documents);
  validateEngineCapabilityComposition(findings, documents);
  validateBundledPiRuntimeAdoption(findings, documents);
  validateWorkSurfaceInformationArchitecture(findings, documents);

  return findings;
}

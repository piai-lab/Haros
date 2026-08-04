import { spawnSync } from "node:child_process";
import path from "node:path";

const REQUIRED_FIELDS = [
  "id",
  "url",
  "revision",
  "paths",
  "rights",
  "mode",
  "changes",
  "updatePolicy",
  "licenseFiles",
];

const ADOPTION_MODES = new Set(["package", "fork", "transplant", "adapt", "mechanism-only"]);
const GIT_OID = /^[0-9a-f]{40}$/i;
const CONTENT_DIGEST = /^(?:sha256:)?[0-9a-f]{64}$/i;
const EXACT_VERSION = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const GIT_SOURCE_HOSTS = new Set(["bitbucket.org", "gitee.com", "github.com", "gitlab.com"]);
const DEPENDENCY_DIRECTORY_NAMES = new Set([".pnpm", ".yarn", "node_modules"]);
const IGNORED_METADATA_FILE_NAMES = new Set([".DS_Store"]);

export function repositoryPath(value) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) return null;
  const portable = value.split(path.sep).join("/").replaceAll("\\", "/");
  const normalized = path.posix.normalize(portable);
  if (
    normalized !== portable ||
    normalized === "." ||
    normalized === "/" ||
    normalized.startsWith("../")
  ) {
    return null;
  }
  return portable.replace(/\/$/, "");
}

export function pathContains(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}/`);
}

function pathsOverlap(left, right) {
  return pathContains(left, right) || pathContains(right, left);
}

function trackedPathExists(candidate, tracked) {
  return tracked.has(candidate) || [...tracked].some((file) => file.startsWith(`${candidate}/`));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function parseHttpsSourceUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (
      parsed.protocol !== "https:" ||
      hostname.length === 0 ||
      hostname === "." ||
      hostname.split(".").some((label) => label.length === 0) ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isImmutableRevision(value, sourceUrl) {
  if (!nonEmptyString(value) || /\s/.test(value)) return false;
  const gitSource =
    sourceUrl.pathname.toLowerCase().endsWith(".git") ||
    GIT_SOURCE_HOSTS.has(sourceUrl.hostname.toLowerCase());
  if (gitSource) return GIT_OID.test(value);
  return GIT_OID.test(value) || CONTENT_DIGEST.test(value) || EXACT_VERSION.test(value);
}

function provenanceRecords(adoptions) {
  const records = [];
  for (const adoption of adoptions) {
    if (!adoption?.provenance) continue;
    const repositoryCommit = adoption.provenance.repositoryCommit;
    const trees = adoption.provenance.trees;
    if (!GIT_OID.test(repositoryCommit ?? "") || !trees || typeof trees !== "object") continue;
    for (const requestedPath of Array.isArray(adoption.paths) ? adoption.paths : []) {
      const portable = repositoryPath(requestedPath);
      const treeEntry = Object.entries(trees).find(
        ([treePath]) => repositoryPath(treePath) === portable,
      );
      if (!portable || !treeEntry || !GIT_OID.test(treeEntry[1] ?? "")) continue;
      records.push({
        adoptionId: adoption.id,
        path: portable,
        repositoryCommit,
        tree: treeEntry[1].toLowerCase(),
      });
    }
  }
  return records;
}

function historicalProvenanceRecords(adoptions) {
  const records = [];
  for (const adoption of adoptions) {
    const provenance = adoption?.provenance;
    if (!provenance?.historicalTrees || !provenance?.origins) continue;
    for (const [historicalPath, tree] of Object.entries(provenance.historicalTrees)) {
      records.push({
        adoptionId: adoption.id,
        path: repositoryPath(historicalPath),
        repositoryCommit: provenance.repositoryCommit,
        tree: typeof tree === "string" ? tree.toLowerCase() : tree,
      });
    }
  }
  return records;
}

export function parseSourceAdoptions(readme) {
  const blocks = [...readme.matchAll(/```source-adoptions\s*\n([\s\S]*?)```/g)];
  if (blocks.length !== 1) {
    throw new Error(`expected one source-adoptions block, found ${blocks.length}`);
  }

  const parsed = JSON.parse(blocks[0][1]);
  if (!parsed || !Array.isArray(parsed.adopted)) {
    throw new Error("source-adoptions must contain an adopted array");
  }
  return parsed.adopted;
}

export function validateSourceAdoptions(adoptions, trackedFiles, { toolRoots = [] } = {}) {
  const tracked = new Set(trackedFiles);
  const errors = [];
  const ids = new Set();
  const adoptedPathRecords = [];

  for (const [index, adoption] of adoptions.entries()) {
    const label = adoption?.id ?? `adopted[${index}]`;
    for (const field of REQUIRED_FIELDS) {
      const value = adoption?.[field];
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        errors.push(`adopted[${index}] is missing ${field}`);
      }
    }

    if (ids.has(adoption?.id)) errors.push(`duplicate source id ${JSON.stringify(adoption.id)}`);
    ids.add(adoption?.id);

    if (!nonEmptyString(adoption?.id)) errors.push(`adopted[${index}] has invalid id`);
    const sourceUrl = parseHttpsSourceUrl(adoption?.url);
    if (!sourceUrl) errors.push(`${label}: source url must be a parsed https URL with a host`);
    if (!sourceUrl || !isImmutableRevision(adoption?.revision, sourceUrl)) {
      errors.push(`${label}: revision must be immutable for the declared source`);
    }
    if (!ADOPTION_MODES.has(adoption?.mode)) errors.push(`${label}: unsupported adoption mode`);
    for (const field of ["rights", "changes", "updatePolicy"]) {
      if (!nonEmptyString(adoption?.[field])) errors.push(`${label}: ${field} must be non-empty text`);
    }

    if (!Array.isArray(adoption?.paths)) errors.push(`${label}: paths must be an array`);
    if (!Array.isArray(adoption?.licenseFiles)) {
      errors.push(`${label}: licenseFiles must be an array`);
    }
    const adoptionPaths = Array.isArray(adoption?.paths) ? adoption.paths : [];
    const normalizedPaths = new Set();
    for (const requestedPath of adoptionPaths) {
      const portable = repositoryPath(requestedPath);
      if (!portable) {
        errors.push(`${label}: invalid adopted path ${JSON.stringify(requestedPath)}`);
        continue;
      }
      if (normalizedPaths.has(portable)) errors.push(`${label}: duplicate adopted path ${portable}`);
      normalizedPaths.add(portable);
      adoptedPathRecords.push({ adoptionId: label, path: portable });
      if (!trackedPathExists(portable, tracked)) {
        errors.push(`${label}: adopted path has no tracked files ${portable}`);
      }
    }

    for (const licenseFile of Array.isArray(adoption?.licenseFiles) ? adoption.licenseFiles : []) {
      const portable = repositoryPath(licenseFile);
      if (!portable || !portable.startsWith("LICENSES/")) {
        errors.push(`${label}: legal text must be under LICENSES/`);
      } else if (!tracked.has(portable)) {
        errors.push(`${label}: missing tracked legal text ${portable}`);
      }
    }

    if (adoption?.provenance !== undefined) {
      const provenance = adoption.provenance;
      if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
        errors.push(`${label}: provenance must be an object`);
        continue;
      }
      if (!GIT_OID.test(provenance.repositoryCommit ?? "")) {
        errors.push(`${label}: provenance repositoryCommit must be a 40-character Git OID`);
      }
      const hasExactTrees =
        provenance.trees && typeof provenance.trees === "object" && !Array.isArray(provenance.trees);
      const hasHistoricalTrees =
        provenance.historicalTrees &&
        typeof provenance.historicalTrees === "object" &&
        !Array.isArray(provenance.historicalTrees);
      const hasOrigins =
        provenance.origins &&
        typeof provenance.origins === "object" &&
        !Array.isArray(provenance.origins);
      if (!hasExactTrees && !(hasHistoricalTrees && hasOrigins)) {
        errors.push(
          `${label}: provenance requires exact trees or historicalTrees plus adapted origins`,
        );
        continue;
      }

      if (hasExactTrees && (hasHistoricalTrees || hasOrigins)) {
        errors.push(`${label}: exact and adapted provenance modes cannot be combined`);
        continue;
      }

      if (hasExactTrees) {
        const treePaths = Object.keys(provenance.trees);
        const normalizedTreePaths = new Set();
        for (const treePath of treePaths) {
          const portable = repositoryPath(treePath);
          if (!portable) {
            errors.push(`${label}: invalid provenance tree path ${JSON.stringify(treePath)}`);
            continue;
          }
          if (normalizedTreePaths.has(portable)) {
            errors.push(`${label}: duplicate provenance tree path ${portable}`);
          }
          normalizedTreePaths.add(portable);
          if (!GIT_OID.test(provenance.trees[treePath] ?? "")) {
            errors.push(`${label}: provenance tree for ${portable} must be a 40-character Git OID`);
          }
        }

        for (const adoptedPath of normalizedPaths) {
          if (!normalizedTreePaths.has(adoptedPath)) {
            errors.push(`${label}: provenance trees is missing adopted path ${adoptedPath}`);
          }
        }
        for (const treePath of normalizedTreePaths) {
          if (!normalizedPaths.has(treePath)) {
            errors.push(`${label}: provenance tree path is not adopted ${treePath}`);
          }
        }
      }

      if (hasHistoricalTrees && hasOrigins) {
        const historicalPaths = new Set();
        for (const [historicalPath, tree] of Object.entries(provenance.historicalTrees)) {
          const portable = repositoryPath(historicalPath);
          if (!portable) {
            errors.push(`${label}: invalid historical tree path ${JSON.stringify(historicalPath)}`);
            continue;
          }
          historicalPaths.add(portable);
          if (!GIT_OID.test(tree ?? "")) {
            errors.push(`${label}: historical tree for ${portable} must be a 40-character Git OID`);
          }
        }

        const originTargets = new Set();
        for (const [targetPath, origin] of Object.entries(provenance.origins)) {
          const target = repositoryPath(targetPath);
          const source = repositoryPath(origin?.sourcePath);
          if (!target) {
            errors.push(`${label}: invalid adapted origin target ${JSON.stringify(targetPath)}`);
            continue;
          }
          originTargets.add(target);
          if (!normalizedPaths.has(target)) {
            errors.push(`${label}: adapted origin target is not adopted ${target}`);
          }
          if (!source) {
            errors.push(`${label}: adapted origin ${target} has invalid sourcePath`);
          } else if (![...historicalPaths].some((root) => pathContains(root, source))) {
            errors.push(`${label}: adapted origin ${target} is outside historical trees: ${source}`);
          }
          if (!nonEmptyString(origin?.changes)) {
            errors.push(`${label}: adapted origin ${target} requires material changes text`);
          }
        }
        for (const adoptedPath of normalizedPaths) {
          if (!originTargets.has(adoptedPath)) {
            errors.push(`${label}: adapted origins is missing adopted path ${adoptedPath}`);
          }
        }
      }
    }
  }

  const records = provenanceRecords(adoptions);
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      if (pathsOverlap(left.path, right.path)) {
        errors.push(
          `exact provenance roots overlap ${left.adoptionId}:${left.path} and ` +
            `${right.adoptionId}:${right.path}`,
        );
      }
    }
  }

  const normalizedToolRoots = [];
  for (const requestedToolRoot of toolRoots) {
    const toolRoot = repositoryPath(requestedToolRoot);
    if (!toolRoot) {
      errors.push(`invalid tool root ${JSON.stringify(requestedToolRoot)}`);
      continue;
    }
    normalizedToolRoots.push(toolRoot);
  }

  for (const toolRoot of normalizedToolRoots) {
    for (const record of adoptedPathRecords) {
      if (pathsOverlap(record.path, toolRoot)) {
        errors.push(
          `adopted source path and tool root overlap ` +
            `${record.adoptionId}:${record.path} and ${toolRoot}`,
        );
      }
    }
  }

  return errors;
}

function git(root, args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

export function trackedRepositoryFiles(root) {
  const result = git(root, ["ls-files", "-z", "--cached"]);
  if (result.status !== 0) throw new Error("cannot enumerate tracked repository files");
  return result.stdout.split("\0").filter(Boolean).sort();
}

export function ignoredVendorSourceFiles(root, generatedDirectoryNames = []) {
  const excludedDirectoryNames = new Set([
    ...DEPENDENCY_DIRECTORY_NAMES,
    ...generatedDirectoryNames,
  ]);
  const excludedPathspecs = [...excludedDirectoryNames]
    .filter((directoryName) => /^[0-9A-Za-z._-]+$/.test(directoryName))
    .flatMap((directoryName) => [
      `:(exclude)vendor/${directoryName}/**`,
      `:(exclude)vendor/**/${directoryName}/**`,
    ]);
  const result = git(root, [
    "ls-files",
    "-z",
    "--others",
    "--ignored",
    "--exclude-standard",
    "--",
    "vendor",
    ...excludedPathspecs,
  ]);
  if (result.status !== 0) throw new Error("cannot enumerate ignored vendor source files");

  return [...new Set(result.stdout.split("\0").filter(Boolean))]
    .map((file) => repositoryPath(file))
    .filter(Boolean)
    .filter((file) => !IGNORED_METADATA_FILE_NAMES.has(path.posix.basename(file)))
    .filter((file) => {
      const nestedSegments = file.split("/").slice(1, -1);
      return !nestedSegments.some((segment) => excludedDirectoryNames.has(segment));
    })
    .sort();
}

function resolveObject(root, specification) {
  const result = git(root, ["rev-parse", "--verify", specification]);
  if (result.status !== 0) return null;
  return result.stdout.trim().toLowerCase();
}

function objectType(root, oid) {
  const result = git(root, ["cat-file", "-t", oid]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function workingDifferences(root, candidateCommit, exactRoot) {
  const tracked = git(root, [
    "diff",
    "--name-status",
    "--no-renames",
    "-z",
    candidateCommit,
    "--",
    exactRoot,
  ]);
  const untracked = git(root, [
    "ls-files",
    "-z",
    "--others",
    "--exclude-standard",
    "--",
    exactRoot,
  ]);
  if (tracked.status !== 0 || untracked.status !== 0) return null;

  const trackedFields = tracked.stdout.split("\0").filter(Boolean);
  const differences = [];
  for (let index = 0; index < trackedFields.length; index += 2) {
    const status = trackedFields[index];
    const changedPath = trackedFields[index + 1];
    if (changedPath) differences.push(`${status} ${JSON.stringify(changedPath)}`);
  }
  for (const addedPath of untracked.stdout.split("\0").filter(Boolean)) {
    differences.push(`A ${JSON.stringify(addedPath)}`);
  }
  return differences;
}

export function validateSourceRepository({
  root,
  adoptions,
  trackedFiles,
  inventoryFiles = trackedFiles,
  ignoredVendorFiles = [],
  toolRoots = [],
  candidate = "HEAD",
}) {
  const errors = validateSourceAdoptions(adoptions, inventoryFiles, { toolRoots });
  if (errors.length > 0) return { errors, exactRoots: [] };

  const records = provenanceRecords(adoptions);
  const exactRoots = records.map((record) => record.path);
  const candidateCommit = resolveObject(root, `${candidate}^{commit}`);
  if (!candidateCommit) errors.push(`candidate is not a commit ${candidate}`);

  for (const record of records) {
    const baselineCommit = resolveObject(root, `${record.repositoryCommit}^{commit}`);
    if (!baselineCommit) {
      errors.push(`${record.adoptionId}: missing provenance commit ${record.repositoryCommit}`);
      continue;
    }

    const baselineObject = resolveObject(root, `${baselineCommit}:${record.path}`);
    if (!baselineObject || objectType(root, baselineObject) !== "tree") {
      errors.push(`${record.adoptionId}: provenance path is not a tree ${record.path}`);
    } else if (baselineObject !== record.tree) {
      errors.push(
        `${record.adoptionId}: provenance tree mismatch ${record.path}; ` +
          `expected ${record.tree}, observed ${baselineObject}`,
      );
    }

    if (candidateCommit) {
      const candidateObject = resolveObject(root, `${candidateCommit}:${record.path}`);
      if (!candidateObject || objectType(root, candidateObject) !== "tree") {
        errors.push(`${record.adoptionId}: candidate path is not a tree ${record.path}`);
      } else if (candidateObject !== record.tree) {
        errors.push(
          `${record.adoptionId}: candidate tree mismatch ${record.path}; ` +
            `expected ${record.tree}, observed ${candidateObject}`,
        );
      }

      const differences = workingDifferences(root, candidateCommit, record.path);
      if (!differences) {
        errors.push(`${record.adoptionId}: cannot inspect exact provenance root ${record.path}`);
      } else if (differences.length > 0) {
        const shown = differences.slice(0, 8).join(", ");
        const remaining = differences.length - 8;
        errors.push(
          `${record.adoptionId}: working exact provenance root differs from candidate ` +
            `${record.path}; expected tree ${record.tree}; observed ${shown}` +
            (remaining > 0 ? `, and ${remaining} more change(s)` : ""),
        );
      }
    }
  }

  for (const record of historicalProvenanceRecords(adoptions)) {
    if (!record.path) continue;
    const baselineCommit = resolveObject(root, `${record.repositoryCommit}^{commit}`);
    if (!baselineCommit) {
      errors.push(`${record.adoptionId}: missing provenance commit ${record.repositoryCommit}`);
      continue;
    }
    const baselineObject = resolveObject(root, `${baselineCommit}:${record.path}`);
    if (!baselineObject || objectType(root, baselineObject) !== "tree") {
      errors.push(`${record.adoptionId}: historical provenance path is not a tree ${record.path}`);
    } else if (baselineObject !== record.tree) {
      errors.push(
        `${record.adoptionId}: historical provenance tree mismatch ${record.path}; ` +
          `expected ${record.tree}, observed ${baselineObject}`,
      );
    }
  }

  for (const adoption of adoptions) {
    const origins = adoption?.provenance?.origins;
    if (!origins) continue;
    const baselineCommit = resolveObject(root, `${adoption.provenance.repositoryCommit}^{commit}`);
    if (!baselineCommit) continue;
    for (const [target, origin] of Object.entries(origins)) {
      const sourcePath = repositoryPath(origin?.sourcePath);
      const sourceObject = sourcePath ? resolveObject(root, `${baselineCommit}:${sourcePath}`) : null;
      if (!sourceObject) {
        errors.push(`${adoption.id}: adapted origin ${target} is missing at ${sourcePath}`);
      }
    }
  }

  const undeclaredVendorAreas = new Map();
  for (const file of new Set([...inventoryFiles, ...ignoredVendorFiles])) {
    const portable = repositoryPath(file);
    if (!portable || !portable.startsWith("vendor/")) continue;
    if (exactRoots.some((exactRoot) => pathContains(exactRoot, portable))) continue;
    const area = portable.split("/").slice(0, 2).join("/");
    if (!undeclaredVendorAreas.has(area)) undeclaredVendorAreas.set(area, portable);
  }
  for (const [area, example] of undeclaredVendorAreas) {
    errors.push(`undeclared vendor content ${area}; observed path ${example}`);
  }

  return { errors, exactRoots: errors.length === 0 ? exactRoots : [] };
}

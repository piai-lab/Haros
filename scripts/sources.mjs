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

function repositoryPath(value) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) return null;
  const portable = value.split(path.sep).join("/").replaceAll("\\", "/");
  const normalized = path.posix.normalize(portable);
  if (normalized !== portable || normalized === "." || normalized.startsWith("../")) return null;
  return portable.replace(/\/$/, "");
}

function trackedPathExists(candidate, tracked) {
  return tracked.has(candidate) || [...tracked].some((file) => file.startsWith(`${candidate}/`));
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

export function validateSourceAdoptions(adoptions, trackedFiles) {
  const tracked = new Set(trackedFiles);
  const errors = [];
  const ids = new Set();

  for (const [index, adoption] of adoptions.entries()) {
    for (const field of REQUIRED_FIELDS) {
      const value = adoption?.[field];
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        errors.push(`adopted[${index}] is missing ${field}`);
      }
    }

    if (ids.has(adoption?.id)) errors.push(`duplicate source id ${JSON.stringify(adoption.id)}`);
    ids.add(adoption?.id);

    if (typeof adoption?.url !== "string" || !/^https:\/\//.test(adoption.url)) {
      errors.push(`${adoption?.id ?? `adopted[${index}]`}: source url must use https`);
    }
    if (typeof adoption?.revision !== "string" || /\s/.test(adoption.revision)) {
      errors.push(`${adoption?.id ?? `adopted[${index}]`}: revision must be an exact token`);
    }
    if (!ADOPTION_MODES.has(adoption?.mode)) {
      errors.push(`${adoption?.id ?? `adopted[${index}]`}: unsupported adoption mode`);
    }

    const adoptionPaths = Array.isArray(adoption?.paths) ? adoption.paths : [];
    const normalizedPaths = new Set();
    for (const requestedPath of adoptionPaths) {
      const portable = repositoryPath(requestedPath);
      if (!portable) {
        errors.push(`${adoption?.id ?? `adopted[${index}]`}: invalid adopted path ${JSON.stringify(requestedPath)}`);
        continue;
      }
      if (normalizedPaths.has(portable)) {
        errors.push(`${adoption.id}: duplicate adopted path ${portable}`);
      }
      normalizedPaths.add(portable);
      if (!trackedPathExists(portable, tracked)) {
        errors.push(`${adoption.id}: adopted path has no tracked files ${portable}`);
      }
    }

    for (const licenseFile of adoption?.licenseFiles ?? []) {
      const portable = repositoryPath(licenseFile);
      if (!portable || !portable.startsWith("LICENSES/")) {
        errors.push(`${adoption.id}: legal text must be under LICENSES/`);
      } else if (!tracked.has(portable)) {
        errors.push(`${adoption.id}: missing tracked legal text ${portable}`);
      }
    }
  }

  return errors;
}

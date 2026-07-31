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

    for (const licenseFile of adoption?.licenseFiles ?? []) {
      const portable = licenseFile.split(path.sep).join("/");
      if (!portable.startsWith("LICENSES/")) {
        errors.push(`${adoption.id}: legal text must be under LICENSES/`);
      } else if (!tracked.has(portable)) {
        errors.push(`${adoption.id}: missing tracked legal text ${portable}`);
      }
    }
  }

  return errors;
}

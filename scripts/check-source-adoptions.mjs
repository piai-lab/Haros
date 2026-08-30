import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const record = JSON.parse(
  await readFile(path.join(repositoryRoot, "source-adoptions.json"), "utf8"),
);

assert.ok(Array.isArray(record.adopted), "source-adoptions.json must contain an adopted array");

const seenIds = new Set();
const missingPaths = [];
for (const adoption of record.adopted) {
  assert.equal(typeof adoption.id, "string", "every adoption needs a string id");
  assert.ok(!seenIds.has(adoption.id), `duplicate adoption id: ${adoption.id}`);
  seenIds.add(adoption.id);

  assert.ok(Array.isArray(adoption.paths), `${adoption.id} must declare retained paths`);
  assert.ok(adoption.paths.length > 0, `${adoption.id} must retain at least one path`);
  for (const relativePath of adoption.paths) {
    assert.equal(typeof relativePath, "string", `${adoption.id} contains a non-string path`);
    assert.equal(path.isAbsolute(relativePath), false, `${adoption.id} contains an absolute path`);
    assert.equal(
      path.normalize(relativePath).startsWith(`..${path.sep}`),
      false,
      `${adoption.id} contains a path outside the repository`,
    );
    try {
      await access(path.join(repositoryRoot, relativePath));
    } catch {
      missingPaths.push({ id: adoption.id, path: relativePath });
    }
  }
}

assert.deepEqual(
  missingPaths,
  [],
  `source-adoptions.json contains missing retained paths:\n${JSON.stringify(missingPaths)}`,
);

console.log(`Verified ${record.adopted.length} source adoptions and their retained paths.`);

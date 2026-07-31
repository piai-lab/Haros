import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseDenylist, scanIdentity } from "../scripts/identity.mjs";
import { parseSourceAdoptions, validateSourceAdoptions } from "../scripts/sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const governingReadme = await import("node:fs/promises").then(({ readFile }) =>
  readFile(path.join(root, "README.md"), "utf8"),
);
const rules = parseDenylist(governingReadme);

test("identity scan detects separated variants without printing source text", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-check-"));
  const compoundRule = rules.find((rule) => /[-_ ]/.test(rule));
  assert.ok(compoundRule);
  const variant = compoundRule.replace(/[-_ ]+/g, " ");
  await writeFile(
    path.join(temporaryRoot, "README.md"),
    `\`\`\`identity-denylist\n${compoundRule}\n\`\`\`\n`,
  );
  await writeFile(path.join(temporaryRoot, "sample.txt"), `prefix ${variant} suffix\n`);

  const result = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "sample.txt"],
  });

  assert.equal(result.findings.length, 1);
  assert.deepEqual(
    {
      path: result.findings[0].path,
      surface: result.findings[0].surface,
      rule: result.findings[0].rule,
    },
    { path: "sample.txt", surface: "content", rule: compoundRule },
  );
});

test("identity scan permits only explicitly injected runtime fixtures", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "identity-fixture-"));
  const rule = rules[0];
  await writeFile(path.join(temporaryRoot, "README.md"), `\`\`\`identity-denylist\n${rule}\n\`\`\`\n`);
  await mkdir(path.join(temporaryRoot, "test"));
  await writeFile(path.join(temporaryRoot, "test", "runtime.txt"), `${rule}\n`);

  const blocked = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "test/runtime.txt"],
  });
  const allowed = await scanIdentity({
    root: temporaryRoot,
    trackedFiles: ["README.md", "test/runtime.txt"],
    runtimeFixtures: ["test/runtime.txt"],
  });

  assert.equal(blocked.findings.length, 1);
  assert.equal(allowed.findings.length, 0);
});

test("source inventory accepts an empty adoption set", () => {
  const document = `\`\`\`source-adoptions\n{"adopted":[]}\n\`\`\``;
  const adoptions = parseSourceAdoptions(document);
  assert.deepEqual(adoptions, []);
  assert.deepEqual(validateSourceAdoptions(adoptions, []), []);
});

test("source inventory requires complete adoption and tracked legal text", () => {
  const errors = validateSourceAdoptions([{ id: "source-one", licenseFiles: ["outside.txt"] }], []);
  assert.ok(errors.some((error) => error.includes("revision")));
  assert.ok(errors.some((error) => error.includes("LICENSES/")));
});

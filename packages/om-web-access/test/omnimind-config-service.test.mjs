import assert from "node:assert/strict";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";

import {
	CURRENT_WEB_SEARCH_SCHEMA_VERSION,
	WebSearchConfigConflictError,
	WebSearchConfigError,
	createWebSearchConfigService,
} from "../config-service.ts";

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "omnimind-web-config-"));
	const agentDir = join(root, "agent");
	await mkdir(agentDir, { recursive: true });
	return { root, agentDir, service: createWebSearchConfigService(agentDir) };
}

test("default creation is no-clobber, private, and deterministic", async () => {
	const { service } = await fixture();
	const first = service.ensureDefault();
	const firstStat = await stat(service.configPath);
	const second = service.ensureDefault();
	const secondStat = await stat(service.configPath);

	assert.equal(first.exists, true);
	assert.equal(
		await readFile(service.configPath, "utf8"),
		'{\n  "schemaVersion": 1,\n  "provider": "auto",\n  "workflow": "summary-review"\n}\n',
	);
	assert.equal(second.revision, first.revision);
	assert.equal(secondStat.mtimeMs, firstStat.mtimeMs);
	if (process.platform !== "win32") assert.equal(firstStat.mode & 0o777, 0o600);
});

test("a racing creator never overwrites the file that appeared first", async () => {
	const { service } = await fixture();
	const external = { schemaVersion: 1, workflow: "none", external: { keep: true } };
	await writeFile(service.configPath, `${JSON.stringify(external)}\n`, { mode: 0o600 });

	const snapshot = service.ensureDefault();
	assert.deepEqual(snapshot.config, external);
});

test("no-op mutation preserves mtime and does not publish invalidation", async () => {
	const { service } = await fixture();
	const snapshot = service.ensureDefault();
	const before = await stat(service.configPath);
	let publications = 0;
	const unsubscribe = service.subscribeRevision(() => publications++);

	const result = service.mutate({
		expectedRevision: snapshot.revision,
		patch: {},
	});
	const after = await stat(service.configPath);
	unsubscribe();

	assert.equal(result.changed, false);
	assert.equal(after.mtimeMs, before.mtimeMs);
	assert.equal(publications, 0);
});

test("explicit mutation migrates known schema and round-trips unknown fields", async () => {
	const { service } = await fixture();
	await writeFile(
		service.configPath,
		`${JSON.stringify({ workflow: "auto-summary", futureProviderField: { nested: 7 } })}\n`,
		{ mode: 0o600 },
	);
	const before = service.readSnapshot();
	assert.equal(before.schemaVersion, 0);

	const result = service.mutate({
		expectedRevision: before.revision,
		patch: { workflow: "none" },
	});
	assert.equal(result.snapshot.schemaVersion, CURRENT_WEB_SEARCH_SCHEMA_VERSION);
	assert.deepEqual(result.snapshot.config.futureProviderField, { nested: 7 });
	assert.equal(result.snapshot.config.workflow, "none");
});

test("closed Settings fields preserve unknown advanced configuration", async () => {
	const { service } = await fixture();
	await writeFile(
		service.configPath,
		`${JSON.stringify({
			schemaVersion: 1,
			provider: "auto",
			workflow: "summary-review",
			futureProviderField: { nested: 7, opaque: { keep: true } },
		})}\n`,
		{ mode: 0o600 },
	);
	const before = service.readSnapshot();
	const result = service.mutate({
		expectedRevision: before.revision,
		patch: { workflow: "none" },
	});
	assert.deepEqual(result.snapshot.config.futureProviderField, {
		nested: 7,
		opaque: { keep: true },
	});
});

test("dirty draft conflicts remain explicit until reload or overwrite", async () => {
	const { service } = await fixture();
	const initial = service.ensureDefault();
	await writeFile(
		service.configPath,
		`${JSON.stringify({ schemaVersion: 1, workflow: "auto-summary" })}\n`,
		{ mode: 0o600 },
	);

	assert.throws(
		() =>
			service.mutate({
				expectedRevision: initial.revision,
				patch: { workflow: "none" },
			}),
		WebSearchConfigConflictError,
	);
	assert.equal(service.readSnapshot().config.workflow, "auto-summary");
});

test("damaged and future schemas preserve original bytes and fail closed", async () => {
	const { service } = await fixture();
	await writeFile(service.configPath, "{ damaged", { mode: 0o600 });
	const damagedBytes = await readFile(service.configPath, "utf8");
	assert.throws(() => service.readSnapshot(), (error) =>
		error instanceof WebSearchConfigError && error.kind === "damaged-json",
	);
	assert.equal(await readFile(service.configPath, "utf8"), damagedBytes);

	const future = `${JSON.stringify({ schemaVersion: 999, provider: "future" })}\n`;
	await writeFile(service.configPath, future, { mode: 0o600 });
	assert.throws(() => service.readSnapshot(), (error) =>
		error instanceof WebSearchConfigError && error.kind === "future-schema",
	);
	assert.equal(await readFile(service.configPath, "utf8"), future);
	await chmod(service.configPath, 0o600);
});

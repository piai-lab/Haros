import {
	chmodSync,
	closeSync,
	constants,
	existsSync,
	fsyncSync,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";

export const WEB_SEARCH_CONFIG_FILENAME = "web-search.json";
export const CURRENT_WEB_SEARCH_SCHEMA_VERSION = 1;

const PRIVATE_FILE_MODE = 0o600;
const PRIVATE_DIRECTORY_MODE = 0o700;
const O_NOFOLLOW = process.platform === "win32" ? 0 : (constants.O_NOFOLLOW ?? 0);

export type WebSearchConfigRecord = Record<string, unknown>;

export type WebSearchConfigFailureKind =
	| "damaged-json"
	| "invalid-root"
	| "future-schema"
	| "unsafe-path";

export class WebSearchConfigError extends Error {
	readonly kind: WebSearchConfigFailureKind;
	readonly configPath: string;

	constructor(kind: WebSearchConfigFailureKind, configPath: string, message: string) {
		super(message);
		this.name = "WebSearchConfigError";
		this.kind = kind;
		this.configPath = configPath;
	}
}

export class WebSearchConfigConflictError extends Error {
	readonly expectedRevision: string;
	readonly actualRevision: string;

	constructor(expectedRevision: string, actualRevision: string) {
		super("Web search settings changed outside this draft. Reload or explicitly overwrite before saving.");
		this.name = "WebSearchConfigConflictError";
		this.expectedRevision = expectedRevision;
		this.actualRevision = actualRevision;
	}
}

export interface WebSearchConfigSnapshot {
	readonly config: WebSearchConfigRecord;
	readonly revision: string;
	readonly schemaVersion: number;
	readonly exists: boolean;
	readonly mtimeMs: number | null;
}

export interface WebSearchConfigMutation {
	readonly expectedRevision: string;
	/** Closed known-field patch; unknown file-owned fields remain untouched. */
	readonly patch: WebSearchConfigRecord;
	/** Top-level known fields intentionally removed by an explicit user action. */
	readonly remove?: readonly string[];
	readonly allowOverwriteConflict?: boolean;
}

export interface WebSearchConfigMutationResult {
	readonly snapshot: WebSearchConfigSnapshot;
	readonly changed: boolean;
}

export interface WebSearchConfigService {
	readonly configPath: string;
	ensureDefault(): WebSearchConfigSnapshot;
	readSnapshot(): WebSearchConfigSnapshot;
	refresh(): WebSearchConfigSnapshot;
	mutate(input: WebSearchConfigMutation): WebSearchConfigMutationResult;
	subscribeRevision(listener: (revision: string) => void): () => void;
}

const servicesByAgentDir = new Map<string, WebSearchConfigService>();

function defaultConfig(): WebSearchConfigRecord {
	return {
		schemaVersion: CURRENT_WEB_SEARCH_SCHEMA_VERSION,
		provider: "auto",
		workflow: "auto-summary",
	};
}

function serializedConfig(config: WebSearchConfigRecord): string {
	return `${JSON.stringify(config, null, 2)}\n`;
}

function revisionFor(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

function parseConfig(raw: string, configPath: string): {
	config: WebSearchConfigRecord;
	schemaVersion: number;
} {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		const parserMessage = error instanceof Error ? error.message : "";
		const position = parserMessage.match(/at position \d+ \(line \d+ column \d+\)$/)?.[0];
		throw new WebSearchConfigError(
			"damaged-json",
			configPath,
			`Failed to parse ${configPath}: not valid JSON${position ? `, ${position}` : ""}`,
		);
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new WebSearchConfigError(
			"invalid-root",
			configPath,
			`Invalid config in ${configPath}: expected a JSON object. The original file was preserved.`,
		);
	}
	const config = parsed as WebSearchConfigRecord;
	const declaredVersion = config.schemaVersion;
	const schemaVersion =
		declaredVersion === undefined
			? 0
			: typeof declaredVersion === "number" &&
				Number.isInteger(declaredVersion) &&
				declaredVersion >= 0
				? declaredVersion
				: -1;
	if (schemaVersion < 0) {
		throw new WebSearchConfigError(
			"invalid-root",
			configPath,
			"Web search schemaVersion must be a non-negative integer. The original file was preserved.",
		);
	}
	if (schemaVersion > CURRENT_WEB_SEARCH_SCHEMA_VERSION) {
		throw new WebSearchConfigError(
			"future-schema",
			configPath,
			"Web search settings were written by a newer OmniMind version. Update OmniMind before editing this file.",
		);
	}
	return { config, schemaVersion };
}

function assertPrivateRegularFile(configPath: string): void {
	const metadata = lstatSync(configPath);
	if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
		throw new WebSearchConfigError(
			"unsafe-path",
			configPath,
			"Web search settings must be a private regular file owned by this profile.",
		);
	}
}

function readExisting(configPath: string): WebSearchConfigSnapshot {
	assertPrivateRegularFile(configPath);
	const raw = readFileSync(configPath, "utf8");
	const { config, schemaVersion } = parseConfig(raw, configPath);
	const metadata = lstatSync(configPath);
	return {
		config,
		revision: revisionFor(raw),
		schemaVersion,
		exists: true,
		mtimeMs: metadata.mtimeMs,
	};
}

function absentSnapshot(): WebSearchConfigSnapshot {
	const raw = serializedConfig(defaultConfig());
	return {
		config: defaultConfig(),
		revision: revisionFor(raw),
		schemaVersion: CURRENT_WEB_SEARCH_SCHEMA_VERSION,
		exists: false,
		mtimeMs: null,
	};
}

function ensurePrivateDirectory(path: string): void {
	mkdirSync(path, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
	if (process.platform !== "win32") chmodSync(path, PRIVATE_DIRECTORY_MODE);
}

function writeNoClobber(configPath: string, raw: string): boolean {
	ensurePrivateDirectory(dirname(configPath));
	let fd: number | undefined;
	try {
		fd = openSync(
			configPath,
			constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | O_NOFOLLOW,
			PRIVATE_FILE_MODE,
		);
		writeFileSync(fd, raw, "utf8");
		fsyncSync(fd);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
		throw error;
	} finally {
		if (fd !== undefined) closeSync(fd);
	}
}

function atomicReplace(configPath: string, raw: string): void {
	ensurePrivateDirectory(dirname(configPath));
	const temporaryPath = join(
		dirname(configPath),
		`.${WEB_SEARCH_CONFIG_FILENAME}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
	);
	let fd: number | undefined;
	let renamed = false;
	try {
		fd = openSync(
			temporaryPath,
			constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | O_NOFOLLOW,
			PRIVATE_FILE_MODE,
		);
		writeFileSync(fd, raw, "utf8");
		fsyncSync(fd);
		closeSync(fd);
		fd = undefined;
		renameSync(temporaryPath, configPath);
		renamed = true;
		if (process.platform !== "win32") chmodSync(configPath, PRIVATE_FILE_MODE);
	} finally {
		if (fd !== undefined) closeSync(fd);
		if (!renamed) {
			try {
				unlinkSync(temporaryPath);
			} catch {
				// Best-effort cleanup; the owned temp name carries no credential in its filename.
			}
		}
	}
}

function migrateKnownConfig(config: WebSearchConfigRecord): WebSearchConfigRecord {
	return {
		...config,
		schemaVersion: CURRENT_WEB_SEARCH_SCHEMA_VERSION,
	};
}

function isRecord(value: unknown): value is WebSearchConfigRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeKnownPatch(
	current: WebSearchConfigRecord,
	patch: WebSearchConfigRecord,
): WebSearchConfigRecord {
	const merged: WebSearchConfigRecord = { ...current };
	for (const [key, value] of Object.entries(patch)) {
		const previous = merged[key];
		merged[key] = isRecord(previous) && isRecord(value)
			? mergeKnownPatch(previous, value)
			: value;
	}
	return merged;
}

export function createWebSearchConfigService(agentDir: string): WebSearchConfigService {
	const resolvedAgentDir = resolve(agentDir);
	const configPath = join(resolvedAgentDir, WEB_SEARCH_CONFIG_FILENAME);
	const listeners = new Set<(revision: string) => void>();

	const readSnapshot = (): WebSearchConfigSnapshot =>
		existsSync(configPath) ? readExisting(configPath) : absentSnapshot();

	const publish = (revision: string) => {
		for (const listener of listeners) {
			try {
				listener(revision);
			} catch {
				// A Session owns listener failure and unsubscription; config truth remains on disk.
			}
		}
	};

	return {
		configPath,
		ensureDefault() {
			if (!existsSync(configPath)) {
				writeNoClobber(configPath, serializedConfig(defaultConfig()));
			}
			const snapshot = readExisting(configPath);
			if (process.platform !== "win32") chmodSync(configPath, PRIVATE_FILE_MODE);
			return snapshot;
		},
		readSnapshot,
		refresh() {
			const snapshot = readSnapshot();
			publish(snapshot.revision);
			return snapshot;
		},
		mutate(input) {
			const current = readSnapshot();
			if (
				!input.allowOverwriteConflict &&
				input.expectedRevision !== current.revision
			) {
				throw new WebSearchConfigConflictError(input.expectedRevision, current.revision);
			}
			const patched = mergeKnownPatch(current.config, input.patch);
			for (const key of input.remove ?? []) delete patched[key];
			const candidate = migrateKnownConfig(patched);
			const raw = serializedConfig(candidate);
			const revision = revisionFor(raw);
			if (revision === current.revision && current.exists) {
				return { snapshot: current, changed: false };
			}
			if (!current.exists) {
				if (!writeNoClobber(configPath, raw)) {
					const raced = readExisting(configPath);
					if (!input.allowOverwriteConflict && raced.revision !== input.expectedRevision) {
						throw new WebSearchConfigConflictError(input.expectedRevision, raced.revision);
					}
					atomicReplace(configPath, raw);
				}
			} else {
				atomicReplace(configPath, raw);
			}
			const snapshot = readExisting(configPath);
			publish(snapshot.revision);
			return { snapshot, changed: true };
		},
		subscribeRevision(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

/** The package-owned process-local owner used by Settings and live Extension instances. */
export function getWebSearchConfigService(agentDir: string): WebSearchConfigService {
	const key = resolve(agentDir);
	let service = servicesByAgentDir.get(key);
	if (!service) {
		service = createWebSearchConfigService(key);
		servicesByAgentDir.set(key, service);
	}
	return service;
}

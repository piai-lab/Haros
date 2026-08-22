import { getWebSearchConfigPath, readWebSearchConfig } from "./utils.ts";

const webSearchConfigPath = () => getWebSearchConfigPath();
const AUTH_PROFILE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

export type AuthFetchRequest = true | string;
export type AuthFetchCache = "session" | "off";

export interface AuthFetchProfile {
	name: string;
	hosts: string[];
	chromeProfile?: string;
	redirects: "same-origin";
	cache: AuthFetchCache;
}

interface AuthFetchConfigRoot {
	authFetch?: unknown;
}

export function resolveAuthFetchProfile(request: AuthFetchRequest): AuthFetchProfile {
	const profiles = loadAuthFetchProfiles();
	if (profiles.length === 0) {
		throw new Error(`auth requires at least one authFetch profile in ${webSearchConfigPath()}`);
	}
	if (request === true) {
		if (profiles.length !== 1) {
			throw new Error("auth: true requires exactly one authFetch profile; use a profile name instead");
		}
		return profiles[0];
	}
	const name = request.trim();
	const profile = profiles.find(candidate => candidate.name === name);
	if (!profile) throw new Error(`Unknown authFetch profile: ${name}`);
	return profile;
}

export function assertAuthFetchUrl(profile: AuthFetchProfile, rawUrl: string): URL {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Authenticated fetch requires an HTTPS URL: ${message}`);
	}
	if (url.protocol !== "https:") throw new Error("Authenticated fetch requires an HTTPS URL");
	const hostname = normalizeHostname(url.hostname);
	if (!profile.hosts.some(host => hostMatches(hostname, host))) {
		throw new Error(`URL host ${hostname} is not allowed by authFetch profile ${profile.name}`);
	}
	return url;
}

export function authFetchRedirectGuard(profile: AuthFetchProfile, from: URL, to: URL): void {
	if (profile.redirects === "same-origin" && to.origin !== from.origin) {
		throw new Error(`Authenticated fetch refused cross-origin redirect: ${from.origin} -> ${to.origin}`);
	}
}

function loadAuthFetchProfiles(): AuthFetchProfile[] {
	const parsed = readWebSearchConfig() as AuthFetchConfigRoot;
	if (parsed.authFetch === undefined || parsed.authFetch === null) return [];
	if (typeof parsed.authFetch !== "object" || Array.isArray(parsed.authFetch)) {
		throw new Error(`authFetch in ${webSearchConfigPath()} must be an object`);
	}
	return Object.entries(parsed.authFetch as Record<string, unknown>).map(([name, value]) => parseProfile(name, value));
}

function parseProfile(name: string, value: unknown): AuthFetchProfile {
	if (!AUTH_PROFILE_NAME_PATTERN.test(name)) {
		throw new Error(`authFetch profile name ${JSON.stringify(name)} must start with a letter and contain only letters, numbers, underscores, or hyphens`);
	}
	if (Array.isArray(value)) {
		return { name, hosts: parseHosts(value, `authFetch.${name}`), redirects: "same-origin", cache: "session" };
	}
	if (!value || typeof value !== "object") {
		throw new Error(`authFetch.${name} in ${webSearchConfigPath()} must be an array of hosts or an object`);
	}
	const config = value as Record<string, unknown>;
	if (!Array.isArray(config.hosts)) {
		throw new Error(`authFetch.${name}.hosts in ${webSearchConfigPath()} must be a non-empty array of hostnames`);
	}
	const redirects = config.redirects ?? "same-origin";
	if (redirects !== "same-origin") {
		throw new Error(`authFetch.${name}.redirects in ${webSearchConfigPath()} must be "same-origin"`);
	}
	const cache = config.cache ?? "session";
	if (cache !== "session" && cache !== "off") {
		throw new Error(`authFetch.${name}.cache in ${webSearchConfigPath()} must be "session" or "off"`);
	}
	const chromeProfile = parseChromeProfile(config.chromeProfile, `authFetch.${name}.chromeProfile`);
	return {
		name,
		hosts: parseHosts(config.hosts, `authFetch.${name}.hosts`),
		...(chromeProfile ? { chromeProfile } : {}),
		redirects,
		cache,
	};
}

function parseHosts(value: unknown[], label: string): string[] {
	if (value.length === 0) throw new Error(`${label} in ${webSearchConfigPath()} must be a non-empty array of hostnames`);
	const hosts = value.map((entry) => {
		if (typeof entry !== "string") throw new Error(`${label} in ${webSearchConfigPath()} must contain only hostnames`);
		return parseHost(entry, label);
	});
	return [...new Set(hosts)];
}

function parseHost(value: string, label: string): string {
	const host = normalizeHostname(value.trim());
	if (!host || host.startsWith(".") || host.endsWith(".") || /\s|[\\/?:#@*]/.test(host)) {
		throw new Error(`${label} in ${webSearchConfigPath()} contains an invalid hostname: ${JSON.stringify(value)}`);
	}
	if (host.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host)) {
		throw new Error(`${label} in ${webSearchConfigPath()} contains an invalid hostname: ${JSON.stringify(value)}`);
	}
	return host;
}

function parseChromeProfile(value: unknown, label: string): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string") throw new Error(`${label} in ${webSearchConfigPath()} must be a string`);
	const normalized = value.trim();
	if (!normalized || normalized === "." || normalized === ".." || normalized.includes("/") || normalized.includes("\\")) {
		throw new Error(`${label} in ${webSearchConfigPath()} must be a profile directory name, not a path`);
	}
	return normalized;
}

function normalizeHostname(hostname: string): string {
	return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function hostMatches(hostname: string, allowedHost: string): boolean {
	return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
}

import { getWebSearchConfigPath, readWebSearchConfig } from "./utils.ts";

const configPath = () => getWebSearchConfigPath();

interface GeminiWebConfig {
	browserCookies?: BrowserCookieSelection;
	allowBrowserCookies?: boolean;
}

const BROWSER_COOKIE_PRESETS = ["helium", "chrome", "brave", "arc", "chromium", "edge"] as const;
export type BrowserCookiePreset = typeof BROWSER_COOKIE_PRESETS[number];

export interface BrowserCookieSelection {
	browser?: BrowserCookiePreset;
	profile?: string;
}

export function normalizeChromeProfile(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function parseBrowserCookies(value: unknown): BrowserCookieSelection | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`browserCookies in ${configPath()} must be an object`);
	}
	const raw = value as Record<string, unknown>;
	if ("profilePath" in raw) {
		throw new Error(`browserCookies.profilePath is not supported; use a browser preset and profile directory name in ${configPath()}`);
	}
	let browser: BrowserCookiePreset | undefined;
	if (raw.browser !== undefined) {
		if (typeof raw.browser !== "string") throw new Error(`browserCookies.browser in ${configPath()} must be a supported browser name`);
		const normalized = raw.browser.trim().toLowerCase();
		const preset = BROWSER_COOKIE_PRESETS.find((candidate) => candidate === normalized);
		if (!preset) {
			throw new Error(`Unsupported browserCookies.browser ${JSON.stringify(raw.browser)} in ${configPath()}`);
		}
		browser = preset;
	}
	if (raw.profile !== undefined && typeof raw.profile !== "string") {
		throw new Error(`browserCookies.profile in ${configPath()} must be a profile directory name`);
	}
	const profile = normalizeChromeProfile(raw.profile);
	if (profile && (profile === "." || profile === ".." || profile.includes("/") || profile.includes("\\"))) {
		throw new Error(`browserCookies.profile in ${configPath()} must be a profile directory name, not a path`);
	}
	return { ...(browser ? { browser } : {}), ...(profile ? { profile } : {}) };
}

function loadConfig(): GeminiWebConfig {
	const raw = readWebSearchConfig() as Record<string, unknown>;
	if (raw.chromeProfile !== undefined) {
		throw new Error(`chromeProfile in ${configPath()} is no longer supported; use browserCookies.profile`);
	}
	return {
		browserCookies: parseBrowserCookies(raw.browserCookies),
		allowBrowserCookies: raw.allowBrowserCookies === true,
	};
}

export function getBrowserCookieSelectionFromConfig(): BrowserCookieSelection {
	return { ...loadConfig().browserCookies };
}

export function isBrowserCookieAccessAllowed(): boolean {
	if (process.env.PI_ALLOW_BROWSER_COOKIES === "1" || process.env.FEYNMAN_ALLOW_BROWSER_COOKIES === "1") {
		return true;
	}
	return (readWebSearchConfig() as GeminiWebConfig).allowBrowserCookies === true;
}

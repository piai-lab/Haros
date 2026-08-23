import { getWebSearchConfigPath, readWebSearchConfig } from "./utils.ts";

const configPath = () => getWebSearchConfigPath();

interface GeminiWebConfig {
	chromeProfile?: string;
	allowBrowserCookies?: boolean;
}

export function normalizeChromeProfile(value: unknown): string | undefined  {
	if (typeof value !== "string") return undefined;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function loadConfig(): GeminiWebConfig {
	return readWebSearchConfig() as GeminiWebConfig;
}

export function getChromeProfileFromConfig(): string | undefined  {
	return loadConfig().chromeProfile;
}

export function isBrowserCookieAccessAllowed(): boolean  {
	if (process.env.PI_ALLOW_BROWSER_COOKIES === "1" || process.env.FEYNMAN_ALLOW_BROWSER_COOKIES === "1") {
		return true;
	}
	return loadConfig().allowBrowserCookies === true;
}

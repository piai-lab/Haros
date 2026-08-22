import { getWebSearchConfigPath, readWebSearchConfig } from "./utils.ts";

const configPath = () => getWebSearchConfigPath();

type FeatureConfig = { image?: { enabled?: unknown } };

function loadFeatureConfig(): FeatureConfig {
	return readWebSearchConfig() as FeatureConfig;
}

export function isImageEnabled(): boolean {
	return loadFeatureConfig().image?.enabled !== false;
}

export function canAttachImages(): boolean {
	try {
		return isImageEnabled();
	} catch {
		return false;
	}
}

import { homedir } from "node:os";
import { join } from "node:path";

export function resolveHarosBuildCacheRoot(
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (platform === "darwin") {
    return join(homedir(), "Library", "Caches", "Haros", "build");
  }
  if (platform === "win32") {
    const localAppData = environment.LOCALAPPDATA;
    return localAppData
      ? join(localAppData, "Haros", "build-cache")
      : join(homedir(), "AppData", "Local", "Haros", "build-cache");
  }
  const xdgCacheHome = environment.XDG_CACHE_HOME;
  return join(xdgCacheHome || join(homedir(), ".cache"), "haros", "build");
}

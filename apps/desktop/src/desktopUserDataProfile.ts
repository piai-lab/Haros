// FILE: desktopUserDataProfile.ts
// Purpose: Resolves HarnessOS's first-public Electron userData path without predecessor reads.

import * as OS from "node:os";
import * as Path from "node:path";

export function resolveDesktopAppDataBase(input?: {
  readonly platform?: NodeJS.Platform;
  readonly env?: NodeJS.ProcessEnv;
  readonly homeDir?: string;
}): string {
  const platform = input?.platform ?? process.platform;
  const env = input?.env ?? process.env;
  const homeDir = input?.homeDir ?? OS.homedir();

  if (platform === "win32") {
    return env.APPDATA || Path.join(homeDir, "AppData", "Roaming");
  }
  if (platform === "darwin") {
    return Path.join(homeDir, "Library", "Application Support");
  }
  return env.XDG_CONFIG_HOME || Path.join(homeDir, ".config");
}

export function resolveDesktopUserDataPath(input: {
  readonly appDataBase: string;
  readonly userDataDirectoryName: string;
  readonly productHome?: string;
}): string {
  const productHome = input.productHome?.trim();
  if (productHome) {
    return Path.join(productHome, "electron", input.userDataDirectoryName);
  }
  return Path.join(input.appDataBase, input.userDataDirectoryName);
}

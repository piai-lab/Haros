// FILE: harnessosHome.ts
// Purpose: Resolves the user-level Haros base directory without Effect, so the backend
// server and the Electron main process agree on one location during early startup.
// Exports: expandHomePath, resolveHarosHomeDirectory, HARNESSOS_HOME_ENV_NAME.

import * as OS from "node:os";
import * as Path from "node:path";

export const HARNESSOS_HOME_ENV_NAME = "HARNESSOS_HOME";
export const DEFAULT_HARNESSOS_HOME_DIRECTORY_NAME = ".harnessos";

/** Expands a leading `~` against the user's home directory; other inputs pass through. */
export function expandHomePath(input: string, homeDirectory: string = OS.homedir()): string {
  if (input === "~") {
    return homeDirectory;
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return Path.join(homeDirectory, input.slice(2));
  }
  return input;
}

/**
 * Resolves the Haros base directory the same way for every process in the install.
 *
 * Deliberately plain Node: the Electron main process needs this before Effect (or even
 * `app.whenReady()`) is available, and the login-shell environment cache has to land in
 * the same place whichever process wrote it first.
 */
export function resolveHarosHomeDirectory(
  options: {
    /** Explicit override; falls back to `HARNESSOS_HOME` from `env`. */
    readonly configuredHome?: string | undefined;
    readonly env?: NodeJS.ProcessEnv;
    readonly homeDirectory?: string;
    /** Flavor-specific default (`.harnessos-canary`), used only when nothing is configured. */
    readonly directoryName?: string;
  } = {},
): string {
  const homeDirectory = options.homeDirectory ?? OS.homedir();
  const configured = (
    options.configuredHome ?? (options.env ?? process.env)[HARNESSOS_HOME_ENV_NAME]
  )?.trim();
  if (!configured) {
    return Path.join(homeDirectory, options.directoryName ?? DEFAULT_HARNESSOS_HOME_DIRECTORY_NAME);
  }
  return Path.resolve(expandHomePath(configured, homeDirectory));
}

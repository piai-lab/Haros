import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER,
  harnessOSDesktopIdentity,
  resolveHarosDesktopFlavor,
} from "@harnessos/shared/desktopIdentity";
import { readWindowsPersistentEnvironment } from "@harnessos/shared/shell";

function environmentValue(environment, name, caseInsensitive) {
  const exactValue = environment[name];
  if (exactValue !== undefined || !caseInsensitive) return exactValue;
  const matchingName = Object.keys(environment).find(
    (candidate) => candidate.toUpperCase() === name,
  );
  return matchingName ? environment[matchingName] : undefined;
}

function configuredSourceDesktopHome(environment, platform, readWindowsEnvironment) {
  const isWindows = platform === "win32";
  const inheritedHome = environmentValue(environment, "HARNESSOS_HOME", isWindows)?.trim();
  if (inheritedHome) return inheritedHome;
  if (!isWindows) return undefined;
  try {
    return environmentValue(readWindowsEnvironment(), "HARNESSOS_HOME", true)?.trim();
  } catch {
    return undefined;
  }
}

export function createSourceDesktopEnvironment({
  environment = process.env,
  homeDirectory = homedir(),
  platform = process.platform,
  readWindowsEnvironment = readWindowsPersistentEnvironment,
} = {}) {
  const flavor = resolveHarosDesktopFlavor({
    isDevelopment: true,
    requestedFlavor: environment.HARNESSOS_DESKTOP_FLAVOR,
  });
  const identity = harnessOSDesktopIdentity(flavor);
  const configuredHome = configuredSourceDesktopHome(environment, platform, readWindowsEnvironment);
  const childEnvironment = {
    ...environment,
    HARNESSOS_DESKTOP_FLAVOR: flavor,
    HARNESSOS_HOME: configuredHome || join(homeDirectory, identity.defaultHomeDirectoryName),
    HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER,
  };
  delete childEnvironment.ELECTRON_RUN_AS_NODE;
  return childEnvironment;
}

function assertCurrentSourceDesktopBuild(desktopDirectory, readBuiltMain) {
  const builtMainPath = join(desktopDirectory, "dist-electron/main.js");
  const builtMain = readBuiltMain(builtMainPath, "utf8");
  if (!builtMain.includes(HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER)) {
    throw new Error(
      "Source desktop build is stale. Run `bun run build:desktop`, then launch it again.",
    );
  }
}

export function spawnSourceDesktop({
  desktopDirectory,
  electronPath,
  environment = process.env,
  homeDirectory = homedir(),
  platform = process.platform,
  readBuiltMain = readFileSync,
  readWindowsEnvironment = readWindowsPersistentEnvironment,
  spawnProcess,
  stdio = "inherit",
  detached,
}) {
  assertCurrentSourceDesktopBuild(desktopDirectory, readBuiltMain);
  return spawnProcess(electronPath, ["dist-electron/main.js"], {
    cwd: desktopDirectory,
    env: createSourceDesktopEnvironment({
      environment,
      homeDirectory,
      platform,
      readWindowsEnvironment,
    }),
    stdio,
    ...(detached === undefined ? {} : { detached }),
  });
}

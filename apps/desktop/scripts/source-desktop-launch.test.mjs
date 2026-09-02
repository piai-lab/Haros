import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV,
  HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER,
} from "@harnessos/shared/desktopIdentity";
import { spawnSourceDesktop } from "./source-desktop-launch.mjs";

function captureSourceDesktopSpawn(environment, overrides = {}) {
  const child = { on: vi.fn() };
  const spawnProcess = vi.fn(() => child);
  const result = spawnSourceDesktop({
    desktopDirectory: "/workspace/apps/desktop",
    electronPath: "/runtime/electron",
    environment,
    homeDirectory: "/Users/tester",
    platform: "darwin",
    readBuiltMain: () => HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER,
    spawnProcess,
    ...overrides,
  });
  return { child, result, spawnProcess };
}

describe("source desktop launch", () => {
  it("spawns current source builds with an isolated development environment", () => {
    const environment = { ELECTRON_RUN_AS_NODE: "1", PATH: "/usr/bin" };
    const { child, result, spawnProcess } = captureSourceDesktopSpawn(environment);
    expect(result).toBe(child);
    expect(spawnProcess).toHaveBeenCalledWith("/runtime/electron", ["dist-electron/main.js"], {
      cwd: "/workspace/apps/desktop",
      env: {
        PATH: "/usr/bin",
        HARNESSOS_DESKTOP_FLAVOR: "development",
        HARNESSOS_HOME: join("/Users/tester", ".harnessos-dev"),
        HARNESSOS_SOURCE_DESKTOP_BUILD_MARKER,
      },
      stdio: "inherit",
    });
    expect(environment).toEqual({ ELECTRON_RUN_AS_NODE: "1", PATH: "/usr/bin" });
  });

  it("preserves an explicit Haros home", () => {
    const readWindowsEnvironment = vi.fn(() => ({
      HARNESSOS_HOME: "C:\\Users\\tester\\persisted-haros-home",
    }));
    const { spawnProcess } = captureSourceDesktopSpawn(
      { HARNESSOS_HOME: "/tmp/custom-haros-home" },
      { platform: "win32", readWindowsEnvironment },
    );
    expect(spawnProcess.mock.calls[0][2].env).toMatchObject({
      HARNESSOS_DESKTOP_FLAVOR: "development",
      HARNESSOS_HOME: "/tmp/custom-haros-home",
    });
    expect(readWindowsEnvironment).not.toHaveBeenCalled();
  });

  it("preserves a persisted Windows Haros home", () => {
    const { spawnProcess } = captureSourceDesktopSpawn(
      {},
      {
        platform: "win32",
        readWindowsEnvironment: () => ({
          HarnessOS_Home: "C:\\Users\\tester\\persisted-haros-home",
        }),
      },
    );
    expect(spawnProcess.mock.calls[0][2].env.HARNESSOS_HOME).toBe(
      "C:\\Users\\tester\\persisted-haros-home",
    );
  });

  it("preserves Canary flavor and storage defaults", () => {
    const { spawnProcess } = captureSourceDesktopSpawn({ HARNESSOS_DESKTOP_FLAVOR: "canary" });
    expect(spawnProcess.mock.calls[0][2].env).toMatchObject({
      HARNESSOS_DESKTOP_FLAVOR: "canary",
      HARNESSOS_HOME: join("/Users/tester", ".harnessos-canary"),
    });
  });

  it("passes an isolated smoke profile through the guarded source launch", () => {
    const smokeHome = "/tmp/haros-desktop-smoke";
    const smokeUserData = join(smokeHome, "electron-user-data");
    const stdio = ["pipe", "pipe", "pipe"];
    const { spawnProcess } = captureSourceDesktopSpawn(
      {
        HARNESSOS_HOME: smokeHome,
        [HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV]: smokeUserData,
      },
      { stdio },
    );
    expect(spawnProcess.mock.calls[0][2].env).toMatchObject({
      HARNESSOS_HOME: smokeHome,
      [HARNESSOS_DESKTOP_SMOKE_USER_DATA_ENV]: smokeUserData,
    });
    expect(spawnProcess.mock.calls[0][2].stdio).toBe(stdio);
  });

  it("rejects stale built desktop output before spawning Electron", () => {
    const spawnProcess = vi.fn();
    expect(() =>
      spawnSourceDesktop({
        desktopDirectory: "/workspace/apps/desktop",
        electronPath: "/runtime/electron",
        environment: {},
        homeDirectory: "/Users/tester",
        platform: "darwin",
        readBuiltMain: () => "stale desktop output",
        spawnProcess,
      }),
    ).toThrow(/desktop build is stale/i);
    expect(spawnProcess).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";

import { DEFAULT_SERVER_SETTINGS_VIEW, type ServerEngineStatus } from "@harnessos/contracts";

import {
  createProviderInstallResetPatch,
  isProviderInstallSettingsDirty,
  engineUpdateFailureMessage,
  validateProviderCustomModelInput,
} from "./EnginesSettingsPanel";

const defaults = DEFAULT_SERVER_SETTINGS_VIEW;

describe("validateProviderCustomModelInput", () => {
  it("normalizes a new Engine-owned custom slug and rejects duplicates", () => {
    expect(
      validateProviderCustomModelInput({
        engine: "codex",
        value: "  custom/codex-next  ",
        savedModels: [],
      }),
    ).toEqual({ model: "custom/codex-next" });
    expect(
      validateProviderCustomModelInput({
        engine: "codex",
        value: "custom/codex-next",
        savedModels: ["custom/codex-next"],
      }),
    ).toEqual({ error: "That custom model is already saved." });
  });
});

describe("isProviderInstallSettingsDirty", () => {
  it("covers every engine install text and boolean field", () => {
    const dirtySettings = [
      { engine: "codex", field: "binaryPath", value: "/opt/codex" },
      { engine: "codex", field: "homePath", value: "/tmp/codex-home" },
      { engine: "claude", field: "binaryPath", value: "/opt/claude" },
      { engine: "cursor", field: "binaryPath", value: "/opt/cursor" },
      { engine: "cursor", field: "apiEndpoint", value: "https://cursor.example" },
      { engine: "antigravity", field: "binaryPath", value: "/opt/agy" },
      { engine: "grok", field: "binaryPath", value: "/opt/grok" },
      { engine: "droid", field: "binaryPath", value: "/opt/droid" },
      { engine: "kilo", field: "binaryPath", value: "/opt/kilo" },
      { engine: "kilo", field: "serverUrl", value: "http://127.0.0.1:5000" },
      { engine: "opencode", field: "binaryPath", value: "/opt/opencode" },
      { engine: "opencode", field: "serverUrl", value: "http://127.0.0.1:5001" },
      { engine: "opencode", field: "experimentalWebSockets", value: true },
      { engine: "pi", field: "binaryPath", value: "/opt/pi" },
      { engine: "pi", field: "agentDir", value: "/tmp/pi-agent" },
    ] as const;

    expect(isProviderInstallSettingsDirty(defaults, defaults)).toBe(false);
    for (const dirty of dirtySettings) {
      const settings = {
        ...defaults,
        engines: {
          ...defaults.engines,
          [dirty.engine]: {
            ...defaults.engines[dirty.engine],
            [dirty.field]: dirty.value,
          },
        },
      };
      expect(isProviderInstallSettingsDirty(settings, defaults)).toBe(true);
    }
  });

  it("uses configured flags instead of unreadable password values", () => {
    expect(isProviderInstallSettingsDirty(defaults, defaults)).toBe(false);
    expect(
      isProviderInstallSettingsDirty(
        {
          ...defaults,
          engines: {
            ...defaults.engines,
            kilo: { ...defaults.engines.kilo, serverPasswordConfigured: true },
          },
        },
        defaults,
      ),
    ).toBe(true);
    expect(
      isProviderInstallSettingsDirty(
        {
          ...defaults,
          engines: {
            ...defaults.engines,
            opencode: { ...defaults.engines.opencode, serverPasswordConfigured: true },
          },
        },
        defaults,
      ),
    ).toBe(true);
  });
});

describe("createProviderInstallResetPatch", () => {
  it("resets public engine fields without routing secrets through ServerSettings", () => {
    const patch = createProviderInstallResetPatch(defaults);

    expect(patch.engines?.codex).toEqual({
      binaryPath: defaults.engines.codex.binaryPath,
      homePath: defaults.engines.codex.homePath,
    });
    expect(patch.engines?.cursor).toEqual({
      binaryPath: defaults.engines.cursor.binaryPath,
      apiEndpoint: defaults.engines.cursor.apiEndpoint,
    });
    expect(patch.engines?.kilo).toEqual({
      binaryPath: defaults.engines.kilo.binaryPath,
      serverUrl: defaults.engines.kilo.serverUrl,
    });
    expect(patch.engines?.opencode).toEqual({
      binaryPath: defaults.engines.opencode.binaryPath,
      serverUrl: defaults.engines.opencode.serverUrl,
      experimentalWebSockets: defaults.engines.opencode.experimentalWebSockets,
    });
    expect(JSON.stringify(patch)).not.toContain("Password");
  });
});

describe("engineUpdateFailureMessage", () => {
  it("does not report success while the refreshed engine is still outdated", () => {
    const engine = {
      engine: "codex",
      status: "ready",
      available: true,
      authStatus: "authenticated",
      checkedAt: "2026-08-10T00:00:00.000Z",
      versionAdvisory: {
        status: "behind_latest",
        currentVersion: "1.0.0",
        latestVersion: "1.1.0",
        updateCommand: "npm install -g @openai/codex@latest",
        canUpdate: true,
        checkedAt: "2026-08-10T00:00:00.000Z",
        message: "Update available.",
      },
    } satisfies ServerEngineStatus;

    expect(engineUpdateFailureMessage(engine, "Update incomplete.")).toBe("Update incomplete.");
  });

  it("keeps raw CLI progress output out of the toast", () => {
    const engine = {
      engine: "opencode",
      status: "warning",
      available: true,
      authStatus: "unknown",
      checkedAt: "2026-08-10T00:00:00.000Z",
      updateState: {
        status: "failed",
        startedAt: "2026-08-10T00:00:00.000Z",
        finishedAt: "2026-08-10T00:00:01.000Z",
        message: "Update command exited with code 1.",
        output: "\u001b[2J[999D Upgrading\n".repeat(100),
      },
    } satisfies ServerEngineStatus;

    expect(engineUpdateFailureMessage(engine, "Update incomplete.")).toBe(
      "Update command exited with code 1.",
    );
  });
});

import { describe, expect, it } from "vitest";

import { DEFAULT_SERVER_SETTINGS_VIEW, type ServerProviderStatus } from "@omnimind/contracts";

import {
  createProviderInstallResetPatch,
  isProviderInstallSettingsDirty,
  providerUpdateFailureMessage,
  validateProviderCustomModelInput,
} from "./ProvidersSettingsPanel";

const defaults = DEFAULT_SERVER_SETTINGS_VIEW;

describe("validateProviderCustomModelInput", () => {
  it("normalizes a new Engine-owned custom slug and rejects duplicates", () => {
    expect(
      validateProviderCustomModelInput({
        provider: "codex",
        value: "  custom/codex-next  ",
        savedModels: [],
      }),
    ).toEqual({ model: "custom/codex-next" });
    expect(
      validateProviderCustomModelInput({
        provider: "codex",
        value: "custom/codex-next",
        savedModels: ["custom/codex-next"],
      }),
    ).toEqual({ error: "That custom model is already saved." });
  });
});

describe("isProviderInstallSettingsDirty", () => {
  it("covers every provider install text and boolean field", () => {
    const dirtySettings = [
      { provider: "codex", field: "binaryPath", value: "/opt/codex" },
      { provider: "codex", field: "homePath", value: "/tmp/codex-home" },
      { provider: "claudeAgent", field: "binaryPath", value: "/opt/claude" },
      { provider: "cursor", field: "binaryPath", value: "/opt/cursor" },
      { provider: "cursor", field: "apiEndpoint", value: "https://cursor.example" },
      { provider: "antigravity", field: "binaryPath", value: "/opt/agy" },
      { provider: "grok", field: "binaryPath", value: "/opt/grok" },
      { provider: "droid", field: "binaryPath", value: "/opt/droid" },
      { provider: "kilo", field: "binaryPath", value: "/opt/kilo" },
      { provider: "kilo", field: "serverUrl", value: "http://127.0.0.1:5000" },
      { provider: "opencode", field: "binaryPath", value: "/opt/opencode" },
      { provider: "opencode", field: "serverUrl", value: "http://127.0.0.1:5001" },
      { provider: "opencode", field: "experimentalWebSockets", value: true },
      { provider: "pi", field: "binaryPath", value: "/opt/pi" },
      { provider: "pi", field: "agentDir", value: "/tmp/pi-agent" },
    ] as const;

    expect(isProviderInstallSettingsDirty(defaults, defaults)).toBe(false);
    for (const dirty of dirtySettings) {
      const settings = {
        ...defaults,
        providers: {
          ...defaults.providers,
          [dirty.provider]: {
            ...defaults.providers[dirty.provider],
            [dirty.field]: dirty.value,
          },
        },
      };
      expect(isProviderInstallSettingsDirty(settings, defaults)).toBe(true);
    }
  });

  it("uses configured flags instead of unreadable password values", () => {
    expect(
      isProviderInstallSettingsDirty(defaults, defaults),
    ).toBe(false);
    expect(
      isProviderInstallSettingsDirty({
        ...defaults,
        providers: {
          ...defaults.providers,
          kilo: { ...defaults.providers.kilo, serverPasswordConfigured: true },
        },
      }, defaults),
    ).toBe(true);
    expect(
      isProviderInstallSettingsDirty(
        {
          ...defaults,
          providers: {
            ...defaults.providers,
            opencode: { ...defaults.providers.opencode, serverPasswordConfigured: true },
          },
        },
        defaults,
      ),
    ).toBe(true);
  });
});

describe("createProviderInstallResetPatch", () => {
  it("resets public provider fields without routing secrets through ServerSettings", () => {
    const patch = createProviderInstallResetPatch(defaults);

    expect(patch.providers?.codex).toEqual({
      binaryPath: defaults.providers.codex.binaryPath,
      homePath: defaults.providers.codex.homePath,
    });
    expect(patch.providers?.cursor).toEqual({
      binaryPath: defaults.providers.cursor.binaryPath,
      apiEndpoint: defaults.providers.cursor.apiEndpoint,
    });
    expect(patch.providers?.kilo).toEqual({
      binaryPath: defaults.providers.kilo.binaryPath,
      serverUrl: defaults.providers.kilo.serverUrl,
    });
    expect(patch.providers?.opencode).toEqual({
      binaryPath: defaults.providers.opencode.binaryPath,
      serverUrl: defaults.providers.opencode.serverUrl,
      experimentalWebSockets: defaults.providers.opencode.experimentalWebSockets,
    });
    expect(JSON.stringify(patch)).not.toContain("Password");
  });
});

describe("providerUpdateFailureMessage", () => {
  it("does not report success while the refreshed provider is still outdated", () => {
    const provider = {
      provider: "codex",
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
    } satisfies ServerProviderStatus;

    expect(providerUpdateFailureMessage(provider, "Update incomplete.")).toBe("Update incomplete.");
  });

  it("keeps raw CLI progress output out of the toast", () => {
    const provider = {
      provider: "opencode",
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
    } satisfies ServerProviderStatus;

    expect(providerUpdateFailureMessage(provider, "Update incomplete.")).toBe(
      "Update command exited with code 1.",
    );
  });
});

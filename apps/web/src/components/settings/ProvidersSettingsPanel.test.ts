import { describe, expect, it } from "vitest";

import type { ServerProviderStatus } from "@omnimind/contracts";

import { type AppSettings, AppSettingsSchema } from "~/appSettings";

import {
  createProviderInstallResetPatch,
  isProviderInstallSettingsDirty,
  providerUpdateFailureMessage,
} from "./ProvidersSettingsPanel";

const defaults = AppSettingsSchema.makeUnsafe({});

describe("isProviderInstallSettingsDirty", () => {
  it("covers every provider install text and boolean field", () => {
    const dirtyPatches = [
      { codexBinaryPath: "/opt/codex" },
      { codexHomePath: "/tmp/codex-home" },
      { claudeBinaryPath: "/opt/claude" },
      { cursorBinaryPath: "/opt/cursor" },
      { cursorApiEndpoint: "https://cursor.example" },
      { antigravityBinaryPath: "/opt/agy" },
      { grokBinaryPath: "/opt/grok" },
      { droidBinaryPath: "/opt/droid" },
      { kiloBinaryPath: "/opt/kilo" },
      { kiloServerUrl: "http://127.0.0.1:5000" },
      { openCodeBinaryPath: "/opt/opencode" },
      { openCodeServerUrl: "http://127.0.0.1:5001" },
      { openCodeExperimentalWebSockets: true },
      { piBinaryPath: "/opt/pi" },
      { piAgentDir: "/tmp/pi-agent" },
    ] satisfies ReadonlyArray<Partial<AppSettings>>;

    expect(isProviderInstallSettingsDirty(defaults, defaults)).toBe(false);
    for (const patch of dirtyPatches) {
      expect(isProviderInstallSettingsDirty({ ...defaults, ...patch }, defaults)).toBe(true);
    }
  });

  it("uses configured flags instead of unreadable password values", () => {
    expect(
      isProviderInstallSettingsDirty({ ...defaults, kiloServerPassword: "secret" }, defaults),
    ).toBe(false);
    expect(
      isProviderInstallSettingsDirty({ ...defaults, kiloServerPasswordConfigured: true }, defaults),
    ).toBe(true);
    expect(
      isProviderInstallSettingsDirty(
        { ...defaults, openCodeServerPasswordConfigured: true },
        defaults,
      ),
    ).toBe(true);
  });
});

describe("createProviderInstallResetPatch", () => {
  it("resets every configured field and writes password values so configured flags clear", () => {
    const patch = createProviderInstallResetPatch({
      ...defaults,
      kiloServerPassword: "",
      openCodeServerPassword: "",
    });

    expect(Object.keys(patch).sort()).toEqual(
      [
        "antigravityBinaryPath",
        "claudeBinaryPath",
        "codexBinaryPath",
        "codexHomePath",
        "cursorApiEndpoint",
        "cursorBinaryPath",
        "droidBinaryPath",
        "grokBinaryPath",
        "kiloBinaryPath",
        "kiloServerPassword",
        "kiloServerUrl",
        "openCodeBinaryPath",
        "openCodeExperimentalWebSockets",
        "openCodeServerPassword",
        "openCodeServerUrl",
        "piAgentDir",
        "piBinaryPath",
      ].sort(),
    );
    expect(patch.kiloServerPassword).toBe("");
    expect(patch.openCodeServerPassword).toBe("");
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

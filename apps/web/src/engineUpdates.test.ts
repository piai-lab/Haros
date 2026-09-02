// FILE: engineUpdates.test.ts
// Purpose: Covers engine-update filtering shared by notifications and settings.
// Layer: Web utility tests
// Exports: Vitest suites for engineUpdates.ts

import type { EngineKind, ServerEngineStatus, ServerSettingsView } from "@harnessos/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createEngineUpdateToastData,
  getNotifiableEngineUpdateStatuses,
  getVisibleEngineUpdateStatuses,
  isEngineLatestVersionKnowable,
  isEngineUpdateActive,
  ENGINE_UPDATE_REQUEST_TIMEOUT_MS,
  ENGINE_UPDATE_SUCCESS_VISIBLE_MS,
  EngineUpdateTimeoutError,
  engineUpdateNotificationKey,
  shouldOfferEngineUpdateAction,
  shouldPromptEngineUpdate,
  shouldShowEngineUpdateStatus,
  withEngineUpdateTimeout,
} from "./engineUpdates";

describe("createEngineUpdateToastData", () => {
  it("keeps progress and failure persistent while giving success one visible-time owner", () => {
    const onClose = vi.fn();

    expect(
      createEngineUpdateToastData({
        stage: "progress",
        closeLabel: "Hide progress",
        onClose,
      }),
    ).toEqual({
      closeLabel: "Hide progress",
      onClose,
      statusMotion: true,
    });
    expect(createEngineUpdateToastData({ stage: "success", onClose })).toEqual({
      compactContextual: true,
      dismissAfterVisibleMs: ENGINE_UPDATE_SUCCESS_VISIBLE_MS,
      onClose,
      statusMotion: true,
    });
    expect(
      createEngineUpdateToastData({ stage: "error", copyText: "npm update", onClose }),
    ).toEqual({
      copyText: "npm update",
      onClose,
      statusMotion: true,
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function engineStatus(
  engine: EngineKind,
  overrides: Partial<ServerEngineStatus> = {},
): ServerEngineStatus {
  return {
    engine,
    status: "ready",
    available: true,
    authStatus: "authenticated",
    version: "1.0.0",
    checkedAt: "2026-06-10T10:00:00.000Z",
    versionAdvisory: {
      status: "behind_latest",
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateCommand: "npm install -g engine@latest",
      canUpdate: true,
      checkedAt: "2026-06-10T10:00:00.000Z",
      message: "Update available.",
    },
    ...overrides,
  };
}

function serverSettings(
  overrides: Partial<ServerSettingsView["engines"]> = {},
): ServerSettingsView {
  const engine = {
    enabled: true,
    binaryPath: "",
    customModels: [],
  };

  return {
    defaultEngine: "oa",
    enableAssistantStreaming: false,
    enableEngineUpdateChecks: true,
    defaultThreadEnvMode: "local",
    addProjectBaseDirectory: "",
    textGenerationEngineSelection: { engine: "codex", model: "gpt-5.4-mini" },
    engines: {
      oa: { enabled: true },
      codex: { ...engine, binaryPath: "codex", homePath: "" },
      claude: { ...engine, binaryPath: "claude", launchArgs: "" },
      cursor: { ...engine, binaryPath: "cursor-agent", apiEndpoint: "" },
      antigravity: { ...engine, binaryPath: "agy" },
      grok: { ...engine, binaryPath: "grok" },
      droid: { ...engine, binaryPath: "droid" },
      kilo: { ...engine, binaryPath: "kilo", serverUrl: "", serverPasswordConfigured: false },
      opencode: {
        ...engine,
        binaryPath: "opencode",
        serverUrl: "",
        serverPasswordConfigured: false,
        experimentalWebSockets: false,
      },
      pi: { ...engine, binaryPath: "pi", agentDir: "" },
      ...overrides,
    },
    skills: { disabled: [] },
    agentTools: { builtInGroupOverrides: {} },
  };
}

describe("getVisibleEngineUpdateStatuses", () => {
  it("excludes engines hidden from Haros so unchecked engines do not nag", () => {
    const result = getVisibleEngineUpdateStatuses({
      engines: [engineStatus("codex"), engineStatus("pi")],
      hiddenEngines: ["pi"],
      serverSettings: serverSettings(),
    });

    expect(result.map((engine) => engine.engine)).toEqual(["codex"]);
  });

  it("excludes server-disabled engines", () => {
    const result = getVisibleEngineUpdateStatuses({
      engines: [engineStatus("codex"), engineStatus("pi")],
      serverSettings: serverSettings({
        pi: { enabled: false, binaryPath: "pi", agentDir: "", customModels: [] },
      }),
    });

    expect(result.map((engine) => engine.engine)).toEqual(["codex"]);
  });

  it("waits for server settings before showing engine updates", () => {
    const result = getVisibleEngineUpdateStatuses({
      engines: [engineStatus("codex")],
      serverSettings: null,
    });

    expect(result).toEqual([]);
  });

  it("excludes engine updates when automatic update checks are disabled", () => {
    const result = getVisibleEngineUpdateStatuses({
      engines: [engineStatus("codex")],
      serverSettings: { ...serverSettings(), enableEngineUpdateChecks: false },
    });

    expect(result).toEqual([]);
  });

  it("can narrow notifications to one-click updates while settings keep manual updates visible", () => {
    const manualOnly = engineStatus("pi", {
      versionAdvisory: {
        status: "behind_latest",
        currentVersion: "1.0.0",
        latestVersion: "1.1.0",
        updateCommand: null,
        canUpdate: false,
        checkedAt: "2026-06-10T10:00:00.000Z",
        message: "Update available.",
      },
    });

    expect(
      getVisibleEngineUpdateStatuses({
        engines: [engineStatus("codex"), manualOnly],
        serverSettings: serverSettings(),
      }).map((engine) => engine.engine),
    ).toEqual(["codex", "pi"]);
    expect(
      getVisibleEngineUpdateStatuses({
        engines: [engineStatus("codex"), manualOnly],
        serverSettings: serverSettings(),
        oneClickOnly: true,
      }).map((engine) => engine.engine),
    ).toEqual(["codex"]);
  });
});

describe("getNotifiableEngineUpdateStatuses", () => {
  it("suppresses cached update advisories until a live version check completes", () => {
    const engines = [engineStatus("claude")];
    const settings = serverSettings();

    expect(
      getNotifiableEngineUpdateStatuses({
        engines,
        serverSettings: settings,
        liveVersionCheckCompleted: false,
      }),
    ).toEqual([]);
    expect(
      getNotifiableEngineUpdateStatuses({
        engines,
        serverSettings: settings,
        liveVersionCheckCompleted: true,
      }).map((engine) => engine.engine),
    ).toEqual(["claude"]);
  });

  it("keeps notifications limited to one-click updates after verification", () => {
    const manualOnly = engineStatus("claude", {
      versionAdvisory: {
        ...engineStatus("claude").versionAdvisory!,
        updateCommand: null,
        canUpdate: false,
      },
    });

    expect(
      getNotifiableEngineUpdateStatuses({
        engines: [manualOnly],
        serverSettings: serverSettings(),
        liveVersionCheckCompleted: true,
      }),
    ).toEqual([]);
  });
});

describe("engineUpdateNotificationKey", () => {
  it("keys by engine/version and ignores ordering", () => {
    const left = engineUpdateNotificationKey([
      engineStatus("pi", {
        versionAdvisory: {
          ...engineStatus("pi").versionAdvisory!,
          latestVersion: "2.0.0",
        },
      }),
      engineStatus("codex"),
    ]);
    const right = engineUpdateNotificationKey([
      engineStatus("codex"),
      engineStatus("pi", {
        versionAdvisory: {
          ...engineStatus("pi").versionAdvisory!,
          latestVersion: "2.0.0",
        },
      }),
    ]);

    expect(left).toBe(right);
  });
});

describe("shouldShowEngineUpdateStatus", () => {
  it("matches the list filter for hidden and server-disabled engines", () => {
    const codex = engineStatus("codex");
    const hiddenPi = engineStatus("pi");
    const settings = serverSettings({
      codex: { enabled: false, binaryPath: "codex", homePath: "", customModels: [] },
    });

    expect(
      shouldShowEngineUpdateStatus({
        engine: codex,
        hiddenEngineSet: new Set(),
        serverSettings: settings,
      }),
    ).toBe(false);
    expect(
      shouldShowEngineUpdateStatus({
        engine: hiddenPi,
        hiddenEngines: ["pi"],
        serverSettings: serverSettings(),
      }),
    ).toBe(false);
  });
});

describe("isEngineUpdateActive", () => {
  it("only treats queued and running engine updates as active", () => {
    const queuedState = {
      status: "queued",
      startedAt: null,
      finishedAt: null,
      message: null,
      output: null,
    } satisfies NonNullable<ServerEngineStatus["updateState"]>;
    const succeededState = {
      ...queuedState,
      status: "succeeded",
    } satisfies NonNullable<ServerEngineStatus["updateState"]>;

    expect(isEngineUpdateActive(engineStatus("codex", { updateState: queuedState }))).toBe(true);
    expect(isEngineUpdateActive(engineStatus("codex", { updateState: succeededState }))).toBe(
      false,
    );
  });
});

describe("engine update feedback timing", () => {
  it("keeps successful update feedback to three visible seconds", () => {
    expect(ENGINE_UPDATE_SUCCESS_VISIBLE_MS).toBe(3_000);
  });
});

describe("withEngineUpdateTimeout", () => {
  it("keeps the transport watchdog beyond the bounded Homebrew update window", () => {
    expect(ENGINE_UPDATE_REQUEST_TIMEOUT_MS).toBe(60 * 60_000 + 15_000);
  });

  it("rejects a engine request that never settles", async () => {
    vi.useFakeTimers();
    const pending = new Promise<never>(() => undefined);
    const request = withEngineUpdateTimeout({
      engine: "kilo",
      request: pending,
      timeoutMs: 1_000,
    });
    const assertion = expect(request).rejects.toMatchObject({
      name: "EngineUpdateTimeoutError",
      engine: "kilo",
      timeoutMs: 1_000,
    } satisfies Partial<EngineUpdateTimeoutError>);

    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it("clears its watchdog when the engine request finishes", async () => {
    vi.useFakeTimers();
    await expect(
      withEngineUpdateTimeout({
        engine: "antigravity",
        request: Promise.resolve("updated"),
        timeoutMs: 1_000,
      }),
    ).resolves.toBe("updated");

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("shouldOfferEngineUpdateAction", () => {
  it("does not offer updates without a confirmed CLI version", () => {
    const unavailable = engineStatus("droid", {
      status: "error",
      available: false,
      version: null,
      versionAdvisory: {
        status: "unknown",
        currentVersion: null,
        latestVersion: null,
        updateCommand: "droid update",
        canUpdate: true,
        checkedAt: "2026-07-15T14:00:00.000Z",
        message: null,
      },
    });

    expect(shouldOfferEngineUpdateAction(unavailable)).toBe(false);
  });

  it("offers updates for installed outdated CLIs", () => {
    expect(shouldOfferEngineUpdateAction(engineStatus("codex"))).toBe(true);
  });

  it("offers native AGY updates even when upstream latest-version metadata is unavailable", () => {
    expect(
      shouldOfferEngineUpdateAction(
        engineStatus("antigravity", {
          versionAdvisory: {
            status: "unknown",
            currentVersion: "1.1.2",
            latestVersion: null,
            updateCommand: "agy update",
            canUpdate: true,
            checkedAt: "2026-07-15T14:00:00.000Z",
            message: null,
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("shouldPromptEngineUpdate", () => {
  // Cursor and Antigravity self-update, so Haros has no registry to read a latest
  // version from and their advisory is pinned to "unknown" forever. Prompting on that
  // left a permanent "Update" badge on a fully up-to-date CLI.
  const selfManaged = engineStatus("cursor", {
    version: "2026.07.09-c59fd9a",
    versionAdvisory: {
      status: "unknown",
      currentVersion: "2026.07.09-c59fd9a",
      latestVersion: null,
      latestVersionKnowable: false,
      updateCommand: "cursor-agent update",
      canUpdate: true,
      checkedAt: "2026-07-15T14:00:00.000Z",
      message: null,
    },
  });

  it("does not prompt when the latest version is unknowable", () => {
    expect(isEngineLatestVersionKnowable(selfManaged)).toBe(false);
    expect(shouldPromptEngineUpdate(selfManaged)).toBe(false);
    // The update itself stays reachable as a manual action.
    expect(shouldOfferEngineUpdateAction(selfManaged)).toBe(true);
  });

  it("still prompts when a lookup source exists but the latest version is missing", () => {
    const transient = engineStatus("antigravity", {
      versionAdvisory: {
        status: "unknown",
        currentVersion: "1.1.2",
        latestVersion: null,
        latestVersionKnowable: true,
        updateCommand: "agy update",
        canUpdate: true,
        checkedAt: "2026-07-15T14:00:00.000Z",
        message: null,
      },
    });

    expect(shouldPromptEngineUpdate(transient)).toBe(true);
  });

  it("assumes a lookup source when an older server omits the flag", () => {
    const legacy = engineStatus("kilo", {
      versionAdvisory: {
        status: "unknown",
        currentVersion: "1.1.2",
        latestVersion: null,
        updateCommand: "kilo update",
        canUpdate: true,
        checkedAt: "2026-07-15T14:00:00.000Z",
        message: null,
      },
    });

    expect(isEngineLatestVersionKnowable(legacy)).toBe(true);
    expect(shouldPromptEngineUpdate(legacy)).toBe(true);
  });

  it("keeps prompting for engines Haros can prove are behind", () => {
    expect(shouldPromptEngineUpdate(engineStatus("codex"))).toBe(true);
  });
});

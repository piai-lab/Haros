import { describe, expect, it, vi } from "vitest";

import type { ServerEngineStatus } from "@harnessos/contracts";
import {
  deriveEnginePickerAvailability,
  isEngineUsable,
  normalizeEngineStatusForLocalConfig,
  engineUnavailableReason,
  resolveEngineSendAvailabilityWithRefresh,
} from "./engineAvailability";

const BASE_STATUS: ServerEngineStatus = {
  engine: "antigravity",
  status: "error",
  available: false,
  authStatus: "unknown",
  checkedAt: "2026-04-17T10:00:00.000Z",
  message: "Antigravity CLI (`agy`) is not installed or not on PATH.",
};

const READY_STATUS: ServerEngineStatus = {
  ...BASE_STATUS,
  available: true,
  status: "ready",
  authStatus: "authenticated",
};

describe("normalizeEngineStatusForLocalConfig", () => {
  it("keeps Antigravity interactive when a custom binary path is configured locally", () => {
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "antigravity",
        status: BASE_STATUS,
        customBinaryPath: "/opt/homebrew/bin/agy",
      }),
    ).toEqual({
      ...BASE_STATUS,
      available: true,
      status: "warning",
      message:
        "Antigravity uses a custom local binary path in this app. Availability will be confirmed when you start a session.",
    });
  });

  it("drops a stale not-installed fact for an unprobed custom binary path", () => {
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "antigravity",
        status: { ...BASE_STATUS, unavailableReason: "not_installed" },
        customBinaryPath: "/opt/homebrew/bin/agy",
      }),
    ).toEqual({
      ...BASE_STATUS,
      available: true,
      status: "warning",
      message:
        "Antigravity uses a custom local binary path in this app. Availability will be confirmed when you start a session.",
    });
  });

  it("applies the same custom-path fallback to Claude", () => {
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "claude",
        status: {
          ...BASE_STATUS,
          engine: "claude",
          message: "Claude Code CLI (`claude`) is not installed or not on PATH.",
        },
        customBinaryPath: "/opt/homebrew/bin/claude",
      }),
    ).toEqual({
      ...BASE_STATUS,
      engine: "claude",
      available: true,
      status: "warning",
      message:
        "Claude uses a custom local binary path in this app. Availability will be confirmed when you start a session.",
    });
  });

  it("marks a custom-path engine ready after a successful session confirms it", () => {
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "opencode",
        status: {
          ...BASE_STATUS,
          engine: "opencode",
          message: "OpenCode CLI (`opencode`) is not installed or not on PATH.",
        },
        customBinaryPath: "/custom/bin/opencode",
        confirmedCustomBinaryPath: "/custom/bin/opencode",
      }),
    ).toEqual({
      engine: "opencode",
      authStatus: "unknown",
      available: true,
      checkedAt: BASE_STATUS.checkedAt,
      status: "ready",
    });
  });

  it("keeps warning when a different custom path was confirmed", () => {
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "opencode",
        status: {
          ...BASE_STATUS,
          engine: "opencode",
          message: "OpenCode CLI (`opencode`) is not installed or not on PATH.",
        },
        customBinaryPath: "/custom/bin/opencode-next",
        confirmedCustomBinaryPath: "/custom/bin/opencode",
      }),
    ).toEqual({
      ...BASE_STATUS,
      engine: "opencode",
      available: true,
      status: "warning",
      message:
        "OpenCode uses a custom local binary path in this app. Availability will be confirmed when you start a session.",
    });
  });

  it("preserves authenticated and unauthenticated statuses", () => {
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "antigravity",
        status: { ...BASE_STATUS, available: true, status: "ready", authStatus: "authenticated" },
        customBinaryPath: "/opt/homebrew/bin/agy",
      }),
    ).toEqual({ ...BASE_STATUS, available: true, status: "ready", authStatus: "authenticated" });

    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "antigravity",
        status: { ...BASE_STATUS, authStatus: "unauthenticated" },
        customBinaryPath: "/opt/homebrew/bin/agy",
      }),
    ).toEqual({ ...BASE_STATUS, authStatus: "unauthenticated" });
  });

  it("does not reuse Auto capability from a different Claude binary", () => {
    const status: ServerEngineStatus = {
      engine: "claude",
      status: "ready",
      available: true,
      authStatus: "authenticated",
      supportsAutoRuntimeMode: true,
      autoRuntimeModeBinaryPath: "claude",
      checkedAt: BASE_STATUS.checkedAt,
    };

    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "claude",
        status,
        customBinaryPath: "/custom/bin/claude",
      }),
    ).toEqual({
      engine: "claude",
      status: "ready",
      available: true,
      authStatus: "authenticated",
      checkedAt: BASE_STATUS.checkedAt,
    });
  });

  it("preserves Auto capability probed from the selected Codex binary", () => {
    const status: ServerEngineStatus = {
      engine: "codex",
      status: "ready",
      available: true,
      authStatus: "authenticated",
      supportsAutoRuntimeMode: true,
      autoRuntimeModeBinaryPath: "/custom/bin/codex",
      checkedBinaryPath: "/custom/bin/codex",
      checkedAt: BASE_STATUS.checkedAt,
    };

    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "codex",
        status,
        customBinaryPath: "/custom/bin/codex",
      }),
    ).toEqual(status);
  });

  it.each(["codex", "claude"] as const)(
    "keeps an older Server's exact %s probe conservatively unavailable",
    (engine) => {
      const customBinaryPath = `/custom/bin/${engine}`;
      const legacyStatus: ServerEngineStatus = {
        ...BASE_STATUS,
        engine,
        autoRuntimeModeBinaryPath: customBinaryPath,
      };

      expect(
        normalizeEngineStatusForLocalConfig({
          engine,
          status: legacyStatus,
          customBinaryPath,
        }),
      ).toEqual(legacyStatus);
      expect(
        normalizeEngineStatusForLocalConfig({
          engine,
          status: legacyStatus,
          customBinaryPath: `${customBinaryPath}-next`,
        }),
      ).toMatchObject({ available: true, status: "warning" });
    },
  );

  it("preserves a non-Codex missing fact only for the exact checked custom binary", () => {
    const checkedStatus: ServerEngineStatus = {
      ...BASE_STATUS,
      engine: "opencode",
      unavailableReason: "not_installed",
      checkedBinaryPath: "/custom/bin/opencode",
    };

    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "opencode",
        status: checkedStatus,
        customBinaryPath: "/custom/bin/opencode",
      }),
    ).toEqual(checkedStatus);
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "opencode",
        status: checkedStatus,
        customBinaryPath: "/custom/bin/opencode-next",
      }),
    ).toMatchObject({ available: true, status: "warning" });
  });

  it("does not reuse a ready fact from a different checked custom binary", () => {
    const checkedStatus: ServerEngineStatus = {
      ...READY_STATUS,
      engine: "opencode",
      checkedBinaryPath: "/custom/bin/opencode-old",
    };

    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "opencode",
        status: checkedStatus,
        customBinaryPath: "/custom/bin/opencode-old",
      }),
    ).toEqual(checkedStatus);
    expect(
      normalizeEngineStatusForLocalConfig({
        engine: "opencode",
        status: checkedStatus,
        customBinaryPath: "/custom/bin/opencode-next",
      }),
    ).toMatchObject({
      engine: "opencode",
      available: true,
      status: "warning",
      authStatus: "authenticated",
    });
  });
});

describe("deriveEnginePickerAvailability", () => {
  it("distinguishes observed missing installation from other unavailable states", () => {
    expect(
      deriveEnginePickerAvailability({
        ...BASE_STATUS,
        unavailableReason: "not_installed",
      }),
    ).toEqual({ disabled: false, state: "not_installed" });
    expect(deriveEnginePickerAvailability(BASE_STATUS)).toEqual({
      disabled: false,
      state: "unavailable",
    });
  });
});

describe("isEngineUsable", () => {
  it("blocks unavailable or unauthenticated engines", () => {
    expect(isEngineUsable(null)).toBe(false);
    expect(isEngineUsable(undefined)).toBe(false);
    expect(isEngineUsable(BASE_STATUS)).toBe(false);
    expect(isEngineUsable({ ...BASE_STATUS, available: true, authStatus: "unauthenticated" })).toBe(
      false,
    );
    expect(isEngineUsable({ ...BASE_STATUS, available: true, authStatus: "authenticated" })).toBe(
      true,
    );
  });
});

describe("resolveEngineSendAvailabilityWithRefresh", () => {
  it("returns usable engines without refreshing", async () => {
    const refreshStatuses = vi.fn(async () => null);

    await expect(
      resolveEngineSendAvailabilityWithRefresh({
        engine: "antigravity",
        statuses: [READY_STATUS],
        refreshStatuses,
      }),
    ).resolves.toMatchObject({ usable: true });
    expect(refreshStatuses).not.toHaveBeenCalled();
  });

  it("rechecks missing engine status before showing the loading block", async () => {
    const refreshStatuses = vi.fn(async () => [READY_STATUS]);

    await expect(
      resolveEngineSendAvailabilityWithRefresh({
        engine: "antigravity",
        statuses: [],
        refreshStatuses,
      }),
    ).resolves.toMatchObject({ usable: true });
    expect(refreshStatuses).toHaveBeenCalledTimes(1);
  });

  it("rechecks stale unauthenticated status before blocking send", async () => {
    const refreshStatuses = vi.fn(async () => [READY_STATUS]);

    await expect(
      resolveEngineSendAvailabilityWithRefresh({
        engine: "antigravity",
        statuses: [
          { ...BASE_STATUS, available: true, status: "error", authStatus: "unauthenticated" },
        ],
        refreshStatuses,
      }),
    ).resolves.toMatchObject({ usable: true });
    expect(refreshStatuses).toHaveBeenCalledTimes(1);
  });

  it("keeps the original blocked reason when refresh fails", async () => {
    await expect(
      resolveEngineSendAvailabilityWithRefresh({
        engine: "antigravity",
        statuses: [{ ...BASE_STATUS, authStatus: "unauthenticated" }],
        refreshStatuses: vi.fn(async () => {
          throw new Error("refresh failed");
        }),
      }),
    ).resolves.toMatchObject({
      usable: false,
      unavailableReason: "Antigravity is not authenticated yet.",
    });
  });
});

describe("engineUnavailableReason", () => {
  it("returns engine-specific guidance", () => {
    expect(engineUnavailableReason({ ...BASE_STATUS, authStatus: "unauthenticated" })).toBe(
      "Antigravity is not authenticated yet.",
    );
    expect(engineUnavailableReason(BASE_STATUS)).toBe(BASE_STATUS.message);
  });
});

// FILE: engineUpdates.ts
// Purpose: Shared engine-update filtering and refresh cadence for global toasts and settings.
// Layer: Web settings/notification utility
// Exports: update candidate helpers, notification keys, and auto-refresh timing.

import type { EngineKind, ServerEngineStatus, ServerSettingsView } from "@harnessos/contracts";

export const ENGINE_UPDATE_INITIAL_REFRESH_DELAY_MS = 10_000;
export const ENGINE_UPDATE_REFRESH_INTERVAL_MS = 60 * 60 * 1_000;
// Count only foreground-visible time. The engine toast routes this through the
// shared visible timer so hovering never turns a completed update into a sticky chip.
export const ENGINE_UPDATE_SUCCESS_VISIBLE_MS = 3_000;
// Homebrew updates may spend time refreshing taps and downloading release assets; the server
// gives that path one hour while retaining the shorter bound for other engine commands.
// This slightly longer client watchdog only owns a transport that outlives the server bound.
export const ENGINE_UPDATE_REQUEST_TIMEOUT_MS = 60 * 60_000 + 15_000;

type EngineUpdateToastStage = "progress" | "success" | "error";

type EngineUpdateToastDataInput = {
  readonly stage: EngineUpdateToastStage;
  readonly closeLabel?: string;
  readonly copyText?: string;
  readonly onClose?: () => void;
};

/**
 * The one visual-state contract for engine update toasts. Callers still own
 * their product copy and update loop, while motion, visible-time dismissal and
 * optional recovery affordances cannot drift between global and Settings flows.
 */
export function createEngineUpdateToastData(input: EngineUpdateToastDataInput) {
  return {
    statusMotion: true as const,
    ...(input.stage === "success"
      ? {
          compactContextual: true as const,
          dismissAfterVisibleMs: ENGINE_UPDATE_SUCCESS_VISIBLE_MS,
        }
      : {}),
    ...(input.closeLabel === undefined ? {} : { closeLabel: input.closeLabel }),
    ...(input.copyText === undefined ? {} : { copyText: input.copyText }),
    ...(input.onClose === undefined ? {} : { onClose: input.onClose }),
  };
}

export class EngineUpdateTimeoutError extends Error {
  readonly engine: EngineKind;
  readonly timeoutMs: number;

  constructor(engine: EngineKind, timeoutMs: number) {
    super("engine_update_timeout");
    this.name = "EngineUpdateTimeoutError";
    this.engine = engine;
    this.timeoutMs = timeoutMs;
  }
}

export async function withEngineUpdateTimeout<T>(input: {
  readonly engine: EngineKind;
  readonly request: Promise<T>;
  readonly timeoutMs?: number;
}): Promise<T> {
  const timeoutMs = input.timeoutMs ?? ENGINE_UPDATE_REQUEST_TIMEOUT_MS;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new EngineUpdateTimeoutError(input.engine, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([input.request, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

type EngineUpdateFilterInput = {
  readonly engines: ReadonlyArray<ServerEngineStatus>;
  readonly hiddenEngines?: ReadonlyArray<EngineKind>;
  readonly serverSettings?:
    | Pick<ServerSettingsView, "engines" | "enableEngineUpdateChecks">
    | null
    | undefined;
  readonly oneClickOnly?: boolean;
};

type EngineUpdateVisibilityInput = {
  readonly engine: ServerEngineStatus;
  readonly hiddenEngines?: ReadonlyArray<EngineKind>;
  readonly hiddenEngineSet?: ReadonlySet<EngineKind>;
  readonly serverSettings?:
    | Pick<ServerSettingsView, "engines" | "enableEngineUpdateChecks">
    | null
    | undefined;
  readonly oneClickOnly?: boolean;
};

export function isEngineUpdateActive(engine: ServerEngineStatus): boolean {
  return engine.updateState?.status === "queued" || engine.updateState?.status === "running";
}

// A engine whose latest version HarnessOS cannot look up (self-updating CLIs such as
// `cursor-agent`) is permanently "unknown". Treating that as an update prompt made its
// row nag forever, so those engines get the update offered as a manual action instead.
export function isEngineLatestVersionKnowable(engine: ServerEngineStatus): boolean {
  return engine.versionAdvisory?.latestVersionKnowable !== false;
}

export function shouldOfferEngineUpdateAction(engine: ServerEngineStatus): boolean {
  const advisory = engine.versionAdvisory;
  return (
    advisory?.canUpdate === true &&
    advisory.updateCommand !== null &&
    (advisory.status === "behind_latest" || advisory.status === "unknown")
  );
}

// Header affordance: reserved for engines HarnessOS can actually assert are outdated.
export function shouldPromptEngineUpdate(engine: ServerEngineStatus): boolean {
  return shouldOfferEngineUpdateAction(engine) && isEngineLatestVersionKnowable(engine);
}

function isEngineEnabled(
  engine: EngineKind,
  serverSettings: Pick<ServerSettingsView, "engines"> | null | undefined,
): boolean {
  if (!serverSettings) {
    return false;
  }
  const engines = serverSettings.engines as Partial<
    Record<EngineKind, { readonly enabled?: boolean }>
  >;
  return engines[engine]?.enabled !== false;
}

// Central visibility gate used by both global toasts and Settings update rows.
export function shouldShowEngineUpdateStatus(input: EngineUpdateVisibilityInput): boolean {
  const advisory = input.engine.versionAdvisory;
  const hiddenEngineSet = input.hiddenEngineSet ?? new Set(input.hiddenEngines ?? []);
  if (
    !advisory ||
    input.serverSettings?.enableEngineUpdateChecks === false ||
    advisory.status !== "behind_latest" ||
    advisory.latestVersion === null ||
    hiddenEngineSet.has(input.engine.engine) ||
    !isEngineEnabled(input.engine.engine, input.serverSettings)
  ) {
    return false;
  }

  return input.oneClickOnly === true
    ? advisory.canUpdate === true && advisory.updateCommand !== null
    : true;
}

export function getVisibleEngineUpdateStatuses(
  input: EngineUpdateFilterInput,
): ServerEngineStatus[] {
  const hiddenEngineSet = new Set(input.hiddenEngines ?? []);
  const oneClickOnly = input.oneClickOnly ?? false;

  return input.engines.filter((engine) =>
    shouldShowEngineUpdateStatus({
      engine,
      serverSettings: input.serverSettings,
      hiddenEngineSet,
      oneClickOnly,
    }),
  );
}

export function getNotifiableEngineUpdateStatuses(
  input: EngineUpdateFilterInput & { readonly liveVersionCheckCompleted: boolean },
): ServerEngineStatus[] {
  if (!input.liveVersionCheckCompleted) {
    return [];
  }
  return getVisibleEngineUpdateStatuses({ ...input, oneClickOnly: true });
}

export function engineUpdateNotificationKey(
  engines: ReadonlyArray<ServerEngineStatus>,
): string | null {
  const parts = engines
    .map((engine) => [engine.engine, engine.versionAdvisory?.latestVersion ?? "unknown"].join(":"))
    .toSorted();

  return parts.length > 0 ? parts.join("|") : null;
}

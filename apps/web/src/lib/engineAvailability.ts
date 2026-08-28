import { type EngineKind, type ServerEngineStatus } from "@harnessos/contracts";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";

export interface EngineSendAvailability {
  readonly engine: EngineKind;
  readonly status: ServerEngineStatus | null;
  readonly usable: boolean;
  readonly unavailableReason: string;
}

export type EnginePickerAvailabilityState =
  | "checking"
  | "ready"
  | "limited"
  | "sign_in"
  | "not_installed"
  | "unavailable";

export interface EnginePickerAvailability {
  readonly disabled: boolean;
  readonly state: EnginePickerAvailabilityState;
}

export function deriveProviderPickerAvailability(
  status: ServerEngineStatus | null | undefined,
): EnginePickerAvailability {
  if (!status) {
    return { disabled: false, state: "checking" };
  }
  if (status.authStatus === "unauthenticated") {
    return { disabled: false, state: "sign_in" };
  }
  if (!status.available) {
    if (status.unavailableReason === "not_installed") {
      return { disabled: false, state: "not_installed" };
    }
    return { disabled: false, state: "unavailable" };
  }
  if (status.status === "warning") {
    return { disabled: false, state: "limited" };
  }
  return { disabled: false, state: "ready" };
}

export type EngineStatusRefresh = () => Promise<readonly ServerEngineStatus[] | null | undefined>;

export function normalizeCustomBinaryPath(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeEngineStatusForLocalConfig(input: {
  engine: EngineKind;
  status: ServerEngineStatus | null | undefined;
  customBinaryPath?: string | null | undefined;
  confirmedCustomBinaryPath?: string | null | undefined;
}): ServerEngineStatus | null {
  const status = input.status ?? null;
  if (!status) {
    return null;
  }

  const customBinaryPath = normalizeCustomBinaryPath(input.customBinaryPath);
  if (!customBinaryPath) {
    return status;
  }

  const checkedBinaryPath = normalizeCustomBinaryPath(status.checkedBinaryPath);
  const legacyAutoBinaryPath = normalizeCustomBinaryPath(status.autoRuntimeModeBinaryPath);
  const hasExactLegacyProbeIdentity =
    checkedBinaryPath === null &&
    (input.engine === "codex" || input.engine === "claude") &&
    legacyAutoBinaryPath === customBinaryPath;
  if (checkedBinaryPath === customBinaryPath || hasExactLegacyProbeIdentity) {
    if (
      status.supportsAutoRuntimeMode === undefined ||
      normalizeCustomBinaryPath(status.autoRuntimeModeBinaryPath) === customBinaryPath
    ) {
      return status;
    }
    const {
      supportsAutoRuntimeMode: _staleAutoSupport,
      autoRuntimeModeBinaryPath: _staleAutoBinaryPath,
      ...statusWithoutStaleAutoCapability
    } = status;
    return statusWithoutStaleAutoCapability;
  }

  const {
    supportsAutoRuntimeMode: _staleAutoSupport,
    autoRuntimeModeBinaryPath: _staleAutoBinaryPath,
    unavailableReason: _staleUnavailableReason,
    checkedBinaryPath: _staleCheckedBinaryPath,
    ...statusWithoutStaleProbeFacts
  } = status;

  // Older servers had no general probe identity. Preserve their positive facts
  // for compatibility, but never carry a fact across an explicit new-path mismatch.
  if (checkedBinaryPath === null && (status.available || status.authStatus !== "unknown")) {
    return statusWithoutStaleProbeFacts;
  }

  if (normalizeCustomBinaryPath(input.confirmedCustomBinaryPath) === customBinaryPath) {
    // Only the exact path used by a successful session can suppress the warning.
    return {
      engine: status.engine,
      available: true,
      status: "ready",
      authStatus: status.authStatus,
      checkedAt: status.checkedAt,
      ...(status.authType ? { authType: status.authType } : {}),
      ...(status.authLabel ? { authLabel: status.authLabel } : {}),
      ...(status.voiceTranscriptionAvailable !== undefined
        ? { voiceTranscriptionAvailable: status.voiceTranscriptionAvailable }
        : {}),
    };
  }

  return {
    ...statusWithoutStaleProbeFacts,
    available: true,
    status: "warning",
    message: `${ENGINE_DISPLAY_NAMES[input.engine]} uses a custom local binary path in this app. Availability will be confirmed when you start a session.`,
  };
}

export function isProviderUsable(status: ServerEngineStatus | null | undefined): boolean {
  if (!status) {
    // Missing status means the health check has not confirmed an installed engine yet.
    return false;
  }
  return status.available && status.authStatus !== "unauthenticated";
}

export function providerUnavailableReason(status: ServerEngineStatus | null | undefined): string {
  if (!status) {
    return "Engine status is still loading.";
  }
  const providerLabel = ENGINE_DISPLAY_NAMES[status.engine] ?? status.engine;
  if (status.authStatus === "unauthenticated") {
    return `${providerLabel} is not authenticated yet.`;
  }
  if (!status.available) {
    return status.message ?? `${providerLabel} is unavailable right now.`;
  }
  return status.message ?? `${providerLabel} has limited availability right now.`;
}

export function findEngineStatus(
  statuses: readonly ServerEngineStatus[],
  engine: EngineKind,
): ServerEngineStatus | null {
  return statuses.find((status) => status.engine === engine) ?? null;
}

// Shared send gate used by chat, Kanban, shortcuts, and handoff flows.
export function resolveProviderSendAvailability(input: {
  readonly engine: EngineKind;
  readonly statuses: readonly ServerEngineStatus[];
}): EngineSendAvailability {
  const status = findEngineStatus(input.statuses, input.engine);
  return {
    engine: input.engine,
    status,
    usable: isProviderUsable(status),
    unavailableReason: providerUnavailableReason(status),
  };
}

function shouldRefreshBeforeBlocking(status: ServerEngineStatus | null): boolean {
  return !status || !status.available || status.authStatus === "unauthenticated";
}

// Re-check a blocked engine once before surfacing stale install/auth state to the user.
export async function resolveProviderSendAvailabilityWithRefresh(input: {
  readonly engine: EngineKind;
  readonly statuses: readonly ServerEngineStatus[];
  readonly refreshStatuses: EngineStatusRefresh;
}): Promise<EngineSendAvailability> {
  const initial = resolveProviderSendAvailability(input);
  if (initial.usable || !shouldRefreshBeforeBlocking(initial.status)) {
    return initial;
  }

  let refreshedStatuses: readonly ServerEngineStatus[] | null | undefined;
  try {
    refreshedStatuses = await input.refreshStatuses();
  } catch {
    refreshedStatuses = null;
  }
  if (!refreshedStatuses) {
    return initial;
  }

  return resolveProviderSendAvailability({
    engine: input.engine,
    statuses: refreshedStatuses,
  });
}

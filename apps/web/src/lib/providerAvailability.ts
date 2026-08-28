import { type ProviderKind, type ServerProviderStatus } from "@harnessos/contracts";
import { PROVIDER_DISPLAY_NAMES } from "@harnessos/shared/providerMetadata";

export interface ProviderSendAvailability {
  readonly provider: ProviderKind;
  readonly status: ServerProviderStatus | null;
  readonly usable: boolean;
  readonly unavailableReason: string;
}

export type ProviderPickerAvailabilityState =
  | "checking"
  | "ready"
  | "limited"
  | "sign_in"
  | "not_installed"
  | "unavailable";

export interface ProviderPickerAvailability {
  readonly disabled: boolean;
  readonly state: ProviderPickerAvailabilityState;
}

export function deriveProviderPickerAvailability(
  status: ServerProviderStatus | null | undefined,
): ProviderPickerAvailability {
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

export type ProviderStatusRefresh = () => Promise<
  readonly ServerProviderStatus[] | null | undefined
>;

export function normalizeCustomBinaryPath(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProviderStatusForLocalConfig(input: {
  provider: ProviderKind;
  status: ServerProviderStatus | null | undefined;
  customBinaryPath?: string | null | undefined;
  confirmedCustomBinaryPath?: string | null | undefined;
}): ServerProviderStatus | null {
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
    (input.provider === "codex" || input.provider === "claudeAgent") &&
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
      provider: status.provider,
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
    message: `${PROVIDER_DISPLAY_NAMES[input.provider]} uses a custom local binary path in this app. Availability will be confirmed when you start a session.`,
  };
}

export function isProviderUsable(status: ServerProviderStatus | null | undefined): boolean {
  if (!status) {
    // Missing status means the health check has not confirmed an installed provider yet.
    return false;
  }
  return status.available && status.authStatus !== "unauthenticated";
}

export function providerUnavailableReason(status: ServerProviderStatus | null | undefined): string {
  if (!status) {
    return "Provider status is still loading.";
  }
  const providerLabel = PROVIDER_DISPLAY_NAMES[status.provider] ?? status.provider;
  if (status.authStatus === "unauthenticated") {
    return `${providerLabel} is not authenticated yet.`;
  }
  if (!status.available) {
    return status.message ?? `${providerLabel} is unavailable right now.`;
  }
  return status.message ?? `${providerLabel} has limited availability right now.`;
}

export function findProviderStatus(
  statuses: readonly ServerProviderStatus[],
  provider: ProviderKind,
): ServerProviderStatus | null {
  return statuses.find((status) => status.provider === provider) ?? null;
}

// Shared send gate used by chat, Kanban, shortcuts, and handoff flows.
export function resolveProviderSendAvailability(input: {
  readonly provider: ProviderKind;
  readonly statuses: readonly ServerProviderStatus[];
}): ProviderSendAvailability {
  const status = findProviderStatus(input.statuses, input.provider);
  return {
    provider: input.provider,
    status,
    usable: isProviderUsable(status),
    unavailableReason: providerUnavailableReason(status),
  };
}

function shouldRefreshBeforeBlocking(status: ServerProviderStatus | null): boolean {
  return !status || !status.available || status.authStatus === "unauthenticated";
}

// Re-check a blocked provider once before surfacing stale install/auth state to the user.
export async function resolveProviderSendAvailabilityWithRefresh(input: {
  readonly provider: ProviderKind;
  readonly statuses: readonly ServerProviderStatus[];
  readonly refreshStatuses: ProviderStatusRefresh;
}): Promise<ProviderSendAvailability> {
  const initial = resolveProviderSendAvailability(input);
  if (initial.usable || !shouldRefreshBeforeBlocking(initial.status)) {
    return initial;
  }

  let refreshedStatuses: readonly ServerProviderStatus[] | null | undefined;
  try {
    refreshedStatuses = await input.refreshStatuses();
  } catch {
    refreshedStatuses = null;
  }
  if (!refreshedStatuses) {
    return initial;
  }

  return resolveProviderSendAvailability({
    provider: input.provider,
    statuses: refreshedStatuses,
  });
}

// FILE: providerUpdates.ts
// Purpose: Shared provider-update filtering and refresh cadence for global toasts and settings.
// Layer: Web settings/notification utility
// Exports: update candidate helpers, notification keys, and auto-refresh timing.

import type { EngineKind, ServerProviderStatus, ServerSettingsView } from "@harnessos/contracts";

export const PROVIDER_UPDATE_INITIAL_REFRESH_DELAY_MS = 10_000;
export const PROVIDER_UPDATE_REFRESH_INTERVAL_MS = 60 * 60 * 1_000;
// Count only foreground-visible time. The provider toast routes this through the
// shared visible timer so hovering never turns a completed update into a sticky chip.
export const PROVIDER_UPDATE_SUCCESS_VISIBLE_MS = 3_000;
// Homebrew updates may spend time refreshing taps and downloading release assets; the server
// gives that path one hour while retaining the shorter bound for other provider commands.
// This slightly longer client watchdog only owns a transport that outlives the server bound.
export const PROVIDER_UPDATE_REQUEST_TIMEOUT_MS = 60 * 60_000 + 15_000;

type ProviderUpdateToastStage = "progress" | "success" | "error";

type ProviderUpdateToastDataInput = {
  readonly stage: ProviderUpdateToastStage;
  readonly closeLabel?: string;
  readonly copyText?: string;
  readonly onClose?: () => void;
};

/**
 * The one visual-state contract for provider update toasts. Callers still own
 * their product copy and update loop, while motion, visible-time dismissal and
 * optional recovery affordances cannot drift between global and Settings flows.
 */
export function createProviderUpdateToastData(input: ProviderUpdateToastDataInput) {
  return {
    statusMotion: true as const,
    ...(input.stage === "success"
      ? {
          compactContextual: true as const,
          dismissAfterVisibleMs: PROVIDER_UPDATE_SUCCESS_VISIBLE_MS,
        }
      : {}),
    ...(input.closeLabel === undefined ? {} : { closeLabel: input.closeLabel }),
    ...(input.copyText === undefined ? {} : { copyText: input.copyText }),
    ...(input.onClose === undefined ? {} : { onClose: input.onClose }),
  };
}

export class ProviderUpdateTimeoutError extends Error {
  readonly provider: EngineKind;
  readonly timeoutMs: number;

  constructor(provider: EngineKind, timeoutMs: number) {
    super("provider_update_timeout");
    this.name = "ProviderUpdateTimeoutError";
    this.provider = provider;
    this.timeoutMs = timeoutMs;
  }
}

export async function withProviderUpdateTimeout<T>(input: {
  readonly provider: EngineKind;
  readonly request: Promise<T>;
  readonly timeoutMs?: number;
}): Promise<T> {
  const timeoutMs = input.timeoutMs ?? PROVIDER_UPDATE_REQUEST_TIMEOUT_MS;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ProviderUpdateTimeoutError(input.provider, timeoutMs));
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

type ProviderUpdateFilterInput = {
  readonly providers: ReadonlyArray<ServerProviderStatus>;
  readonly hiddenProviders?: ReadonlyArray<EngineKind>;
  readonly serverSettings?:
    | Pick<ServerSettingsView, "providers" | "enableProviderUpdateChecks">
    | null
    | undefined;
  readonly oneClickOnly?: boolean;
};

type ProviderUpdateVisibilityInput = {
  readonly provider: ServerProviderStatus;
  readonly hiddenProviders?: ReadonlyArray<EngineKind>;
  readonly hiddenProviderSet?: ReadonlySet<EngineKind>;
  readonly serverSettings?:
    | Pick<ServerSettingsView, "providers" | "enableProviderUpdateChecks">
    | null
    | undefined;
  readonly oneClickOnly?: boolean;
};

export function isProviderUpdateActive(provider: ServerProviderStatus): boolean {
  return provider.updateState?.status === "queued" || provider.updateState?.status === "running";
}

// A provider whose latest version OmniMind cannot look up (self-updating CLIs such as
// `cursor-agent`) is permanently "unknown". Treating that as an update prompt made its
// row nag forever, so those providers get the update offered as a manual action instead.
export function isProviderLatestVersionKnowable(provider: ServerProviderStatus): boolean {
  return provider.versionAdvisory?.latestVersionKnowable !== false;
}

export function shouldOfferProviderUpdateAction(provider: ServerProviderStatus): boolean {
  const advisory = provider.versionAdvisory;
  return (
    advisory?.canUpdate === true &&
    advisory.updateCommand !== null &&
    (advisory.status === "behind_latest" || advisory.status === "unknown")
  );
}

// Header affordance: reserved for providers OmniMind can actually assert are outdated.
export function shouldPromptProviderUpdate(provider: ServerProviderStatus): boolean {
  return shouldOfferProviderUpdateAction(provider) && isProviderLatestVersionKnowable(provider);
}

function isProviderEnabled(
  provider: EngineKind,
  serverSettings: Pick<ServerSettingsView, "providers"> | null | undefined,
): boolean {
  if (!serverSettings) {
    return false;
  }
  return serverSettings.providers[provider]?.enabled !== false;
}

// Central visibility gate used by both global toasts and Settings update rows.
export function shouldShowProviderUpdateStatus(input: ProviderUpdateVisibilityInput): boolean {
  const advisory = input.provider.versionAdvisory;
  const hiddenProviderSet = input.hiddenProviderSet ?? new Set(input.hiddenProviders ?? []);
  if (
    !advisory ||
    input.serverSettings?.enableProviderUpdateChecks === false ||
    advisory.status !== "behind_latest" ||
    advisory.latestVersion === null ||
    hiddenProviderSet.has(input.provider.provider) ||
    !isProviderEnabled(input.provider.provider, input.serverSettings)
  ) {
    return false;
  }

  return input.oneClickOnly === true
    ? advisory.canUpdate === true && advisory.updateCommand !== null
    : true;
}

export function getVisibleProviderUpdateStatuses(
  input: ProviderUpdateFilterInput,
): ServerProviderStatus[] {
  const hiddenProviderSet = new Set(input.hiddenProviders ?? []);
  const oneClickOnly = input.oneClickOnly ?? false;

  return input.providers.filter((provider) =>
    shouldShowProviderUpdateStatus({
      provider,
      serverSettings: input.serverSettings,
      hiddenProviderSet,
      oneClickOnly,
    }),
  );
}

export function getNotifiableProviderUpdateStatuses(
  input: ProviderUpdateFilterInput & { readonly liveVersionCheckCompleted: boolean },
): ServerProviderStatus[] {
  if (!input.liveVersionCheckCompleted) {
    return [];
  }
  return getVisibleProviderUpdateStatuses({ ...input, oneClickOnly: true });
}

export function providerUpdateNotificationKey(
  providers: ReadonlyArray<ServerProviderStatus>,
): string | null {
  const parts = providers
    .map((provider) =>
      [provider.provider, provider.versionAdvisory?.latestVersion ?? "unknown"].join(":"),
    )
    .toSorted();

  return parts.length > 0 ? parts.join("|") : null;
}

// FILE: useProviderStatusRefresh.ts
// Purpose: Shared provider-status refresh hooks — focus/periodic version checks plus an
//          imperative refresh callback for UI affordances (voice auth retry, banners).
// Layer: Web hooks
// Exports: useProviderStatusRefresh, useRefreshProviderStatusesNow

import { useEffect } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import type { ProviderKind, ServerProviderStatus } from "@harnessos/contracts";
import { toastManager } from "../components/ui/toast";
import { readNativeApi } from "../nativeApi";
import { reconcileServerProviderStatuses } from "../lib/serverReactQuery";

export type RefreshProviderStatusesOptions = {
  readonly silent?: boolean;
};

export type RefreshProviderStatusesNow = (
  options?: RefreshProviderStatusesOptions,
) => Promise<readonly ServerProviderStatus[] | null>;

function writeProviderStatusesToConfigCache(
  queryClient: QueryClient,
  providers: readonly ServerProviderStatus[],
  passivePresence?: ReadonlyArray<ProviderKind>,
) {
  return passivePresence
    ? reconcileServerProviderStatuses(queryClient, providers, { passivePresence })
    : reconcileServerProviderStatuses(queryClient, providers);
}

/**
 * Imperative one-shot provider-status refresh: re-checks providers on the server
 * and folds the result into the cached server config. Surfaces failures as a toast.
 */
export function useRefreshProviderStatusesNow(): RefreshProviderStatusesNow {
  const queryClient = useQueryClient();
  return async (options?: RefreshProviderStatusesOptions) => {
    const api = readNativeApi();
    if (!api) return null;
    try {
      const result = await api.server.refreshProviders();
      await writeProviderStatusesToConfigCache(
        queryClient,
        result.providers,
        result.passivePresence?.recoverableProviders,
      );
      return result.providers;
    } catch (error) {
      if (!options?.silent) {
        toastManager.add({
          type: "error",
          title: "Unable to refresh provider status",
          description:
            error instanceof Error ? error.message : "Unknown error refreshing provider status.",
        });
      }
      return null;
    }
  };
}

type ProviderStatusRefreshOptions = {
  readonly enabled?: boolean;
  readonly initialDelayMs?: number;
  readonly intervalMs?: number;
  readonly minIntervalMs?: number;
  readonly refreshOnFocus?: boolean;
  readonly refreshOnFocusAfterLossOnly?: boolean;
  readonly onRefreshSuccess?: () => void;
};

export function useProviderStatusRefresh(options: ProviderStatusRefreshOptions): void {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const initialDelayMs = options.initialDelayMs;
  const intervalMs = options.intervalMs;
  const minIntervalMs = options.minIntervalMs ?? 0;
  const refreshOnFocus = options.refreshOnFocus ?? false;
  const refreshOnFocusAfterLossOnly = options.refreshOnFocusAfterLossOnly ?? false;
  const onRefreshSuccess = options.onRefreshSuccess;

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let disposed = false;
    let hasSuccessfulRefresh = false;
    let startupRefreshPending = false;
    let lastRefreshAttemptAtMs = 0;
    let refreshInFlight: Promise<boolean> | null = null;
    const refreshProviderStatuses = (input?: {
      readonly ignoreMinInterval?: boolean;
    }): Promise<boolean> => {
      if (document.visibilityState !== "visible") {
        return Promise.resolve(false);
      }
      if (refreshInFlight) {
        return refreshInFlight;
      }
      const nowMs = Date.now();
      if (
        input?.ignoreMinInterval !== true &&
        minIntervalMs > 0 &&
        nowMs - lastRefreshAttemptAtMs < minIntervalMs
      ) {
        return Promise.resolve(false);
      }
      const api = readNativeApi();
      if (!api) {
        return Promise.resolve(false);
      }
      lastRefreshAttemptAtMs = nowMs;
      const refresh = api.server
        .refreshProviders()
        .then(async (result) => {
          if (disposed) {
            return false;
          }
          await writeProviderStatusesToConfigCache(
            queryClient,
            result.providers,
            result.passivePresence?.recoverableProviders,
          );
          if (!disposed) {
            hasSuccessfulRefresh = true;
            startupRefreshPending = false;
            onRefreshSuccess?.();
          }
          return true;
        })
        .catch(() => false)
        .finally(() => {
          refreshInFlight = null;
        });
      refreshInFlight = refresh;
      return refresh;
    };

    const runInitialRefresh = async () => {
      const existingRefresh = refreshInFlight;
      if (existingRefresh) {
        await existingRefresh;
      }
      if (disposed || hasSuccessfulRefresh) {
        return;
      }
      startupRefreshPending = true;
      // A failed early focus refresh must not consume the throttle window and
      // suppress the one scheduled startup attempt.
      await refreshProviderStatuses({ ignoreMinInterval: true });
    };

    const initialRefreshId =
      typeof initialDelayMs === "number" && initialDelayMs >= 0
        ? window.setTimeout(() => void runInitialRefresh(), initialDelayMs)
        : null;
    const refreshIntervalId =
      typeof intervalMs === "number" && intervalMs > 0
        ? window.setInterval(() => void refreshProviderStatuses(), intervalMs)
        : null;
    let focusRefreshArmed = refreshOnFocusAfterLossOnly && document.visibilityState !== "visible";
    const armFocusRefresh = () => {
      focusRefreshArmed = true;
    };
    const refreshOnVisible = () => {
      if (document.visibilityState !== "visible") {
        armFocusRefresh();
        return;
      }
      if (refreshOnFocusAfterLossOnly && !focusRefreshArmed) return;
      focusRefreshArmed = false;
      void refreshProviderStatuses({ ignoreMinInterval: startupRefreshPending });
    };

    if (refreshOnFocus) {
      window.addEventListener("focus", refreshOnVisible);
      window.addEventListener("blur", armFocusRefresh);
      document.addEventListener("visibilitychange", refreshOnVisible);
    }

    return () => {
      disposed = true;
      if (initialRefreshId !== null) {
        window.clearTimeout(initialRefreshId);
      }
      if (refreshIntervalId !== null) {
        window.clearInterval(refreshIntervalId);
      }
      if (refreshOnFocus) {
        window.removeEventListener("focus", refreshOnVisible);
        window.removeEventListener("blur", armFocusRefresh);
        document.removeEventListener("visibilitychange", refreshOnVisible);
      }
    };
  }, [
    enabled,
    initialDelayMs,
    intervalMs,
    minIntervalMs,
    onRefreshSuccess,
    queryClient,
    refreshOnFocus,
    refreshOnFocusAfterLossOnly,
  ]);
}

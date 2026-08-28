// FILE: useEngineAuthRefreshOnFocus.ts
// Purpose: Re-probe engine auth status when the window regains focus/visibility,
//   so account changes made outside the app (e.g. `claude login` / logout / adding
//   an account in a terminal) reflect without restarting the app.
// Layer: Web UI hooks
// Exports: useEngineAuthRefreshOnFocus

import { useEngineStatusRefresh } from "./useEngineStatusRefresh";

// Minimum gap between window-focus-triggered engine auth re-probes, so rapid
// focus/visibility changes can't spawn redundant CLI probes on the server.
export const ENGINE_AUTH_REFRESH_MIN_INTERVAL_MS = 15_000;

export function useEngineAuthRefreshOnFocus(options?: { readonly enabled?: boolean }): void {
  useEngineStatusRefresh({
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    // Startup eligibility is owned by EngineHealth's local passive-presence
    // projection. This hook only re-checks auth after a real focus/visibility event.
    minIntervalMs: ENGINE_AUTH_REFRESH_MIN_INTERVAL_MS,
    refreshOnFocus: true,
    refreshOnFocusAfterLossOnly: true,
  });
}

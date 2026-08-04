import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/** Warms code-split route chunks once the browser is idle.
 *
 * Settings is reached through programmatic `navigate()` calls, so the router's
 * intent-based preloading never fires for it. Thread route code is already part
 * of the root route graph; preloading a fabricated thread id would execute real
 * membership loaders against an identity that does not exist.
 */
export function usePreloadRouteChunks() {
  const router = useRouter();

  useEffect(() => {
    const preloadSettings = () => {
      router.preloadRoute({ to: "/settings" }).catch(() => {
        // Preloading is best-effort; navigation falls back to loading on demand.
      });
    };

    if (typeof requestIdleCallback === "function") {
      const idleCallbackId = requestIdleCallback(preloadSettings, { timeout: 5000 });
      return () => cancelIdleCallback(idleCallbackId);
    }
    const timeoutId = setTimeout(preloadSettings, 1500);
    return () => clearTimeout(timeoutId);
  }, [router]);
}

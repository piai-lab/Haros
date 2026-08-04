import { useEffect, useState } from "react";
import type { DesktopBridge, DesktopHealthBridge } from "@omnimind/contracts";

import { useDiffRouteSearch } from "../../hooks/useDiffRouteSearch";
import { getWorkbenchCopy } from "../../i18n/workbenchCopy";
import { useSystemHealthStore } from "../../store/systemHealthStore";
import { Button } from "../ui/button";

export type SystemHealthNoticeOwner = "global" | "product-conversation";

export function resolveSystemHealthNoticeOwner(
  surface: "chat" | undefined,
): SystemHealthNoticeOwner {
  return surface === "chat" ? "product-conversation" : "global";
}

export function SystemHealthCoordinator() {
  const setSnapshot = useSystemHealthStore((state) => state.setSnapshot);
  const routeSearch = useDiffRouteSearch();

  useEffect(() => {
    const bridge = (window.desktopBridge as (DesktopBridge & DesktopHealthBridge) | undefined)
      ?.health;
    if (!bridge) return;
    let disposed = false;
    void bridge.getSnapshot().then((snapshot) => {
      if (!disposed) setSnapshot(snapshot);
    });
    const unsubscribe = bridge.onSnapshot(setSnapshot);
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [setSnapshot]);

  return <SystemHealthNotice owner={resolveSystemHealthNoticeOwner(routeSearch.surface)} />;
}

export function SystemHealthNotice({ owner }: { readonly owner: SystemHealthNoticeOwner }) {
  const snapshot = useSystemHealthStore((state) => state.snapshot);
  const [retrying, setRetrying] = useState(false);
  const copy = getWorkbenchCopy();
  if (!snapshot || owner === "product-conversation") return null;

  const hostUnavailable = ["restarting", "circuitOpen", "unavailable"].includes(
    snapshot.nativeHost.status,
  );
  const serviceUnavailable = ["degraded", "restarting", "unavailable"].includes(
    snapshot.service.status,
  );
  const engineUnavailable = snapshot.engineSelection.status !== "available";
  if (!hostUnavailable && !serviceUnavailable && !engineUnavailable) return null;

  const hostCircuitOpen = snapshot.nativeHost.status === "circuitOpen";
  const message = serviceUnavailable
    ? copy.systemHealthServiceRecovering
    : hostCircuitOpen
      ? copy.systemHealthHostCircuitOpen
      : hostUnavailable
        ? copy.systemHealthHostRestarting
        : copy.systemHealthExecutionUnavailable;

  return (
    <aside
      className="fixed right-4 bottom-4 z-[220] flex max-w-md items-center gap-3 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
      data-system-health-owner="global"
    >
      <span>{message}</span>
      {hostCircuitOpen ? (
        <Button
          size="sm"
          variant="outline"
          disabled={retrying}
          onClick={() => {
            const bridge = (
              window.desktopBridge as (DesktopBridge & DesktopHealthBridge) | undefined
            )?.health;
            if (!bridge) return;
            setRetrying(true);
            void bridge.retryNativeHost().finally(() => setRetrying(false));
          }}
        >
          {copy.systemHealthRetryHost}
        </Button>
      ) : null}
    </aside>
  );
}

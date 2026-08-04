import { useEffect, useState } from "react";
import type { DesktopBridge, DesktopHealthBridge } from "@omnimind/contracts";

import { useSystemHealthStore } from "../../store/systemHealthStore";
import { Button } from "../ui/button";

export function SystemHealthCoordinator() {
  const setSnapshot = useSystemHealthStore((state) => state.setSnapshot);

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

  return <SystemHealthNotice />;
}

function SystemHealthNotice() {
  const snapshot = useSystemHealthStore((state) => state.snapshot);
  const [retrying, setRetrying] = useState(false);
  if (!snapshot) return null;

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
    ? "Product Service is recovering. Existing conversation and workbench state remain available read-only."
    : hostCircuitOpen
      ? "Native Host restart protection is open. Drafts and Queue are preserved; execution remains unavailable."
      : hostUnavailable
        ? "Native Host is restarting. Drafts and Queue are preserved; execution is temporarily unavailable."
        : "Native execution is not connected yet. Drafts and Queue remain available; dispatch is unavailable.";

  return (
    <aside
      className="fixed right-4 bottom-4 z-[220] flex max-w-md items-center gap-3 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
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
          Retry Host
        </Button>
      ) : null}
    </aside>
  );
}

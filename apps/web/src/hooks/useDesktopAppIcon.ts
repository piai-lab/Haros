// FILE: useDesktopAppIcon.ts
// Purpose: Read and mutate the native desktop app-icon preference.
// Layer: Web-to-desktop typed presentation bridge

import { useCallback, useEffect, useRef, useState } from "react";

import type { DesktopAppIcon } from "@harnessos/contracts";
export type DesktopAppIconMutationResult =
  | { readonly state: "saved"; readonly icon: DesktopAppIcon }
  | { readonly state: "failed"; readonly icon: DesktopAppIcon; readonly error: unknown };

type DesktopAppIconBridge = Pick<
  NonNullable<Window["desktopBridge"]>,
  "getAppIcon" | "setAppIcon"
>;

export async function readDesktopAppIconFromNative(
  bridge: DesktopAppIconBridge | undefined,
): Promise<DesktopAppIcon> {
  return bridge?.getAppIcon ? bridge.getAppIcon() : "default";
}

export async function writeDesktopAppIconToNative(
  bridge: DesktopAppIconBridge | undefined,
  icon: DesktopAppIcon,
): Promise<void> {
  if (!bridge) throw new Error("Desktop icon bridge is unavailable.");
  await bridge.setAppIcon(icon);
}

export function useDesktopAppIcon() {
  const [icon, setIcon] = useState<DesktopAppIcon>("default");
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const bridge = window.desktopBridge;
    if (!bridge?.getAppIcon) {
      setLoading(false);
      return;
    }
    let disposed = false;
    void readDesktopAppIconFromNative(bridge)
      .then((value) => {
        if (!disposed) setIcon(value);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const updateIcon = useCallback(
    async (next: DesktopAppIcon): Promise<DesktopAppIconMutationResult> => {
      const requestId = ++requestIdRef.current;
      const previous = icon;
      try {
        await writeDesktopAppIconToNative(window.desktopBridge, next);
        if (requestId === requestIdRef.current) setIcon(next);
        return { state: "saved", icon: next };
      } catch (error) {
        return { state: "failed", icon: previous, error };
      }
    },
    [icon],
  );

  return { icon, loading, updateIcon } as const;
}

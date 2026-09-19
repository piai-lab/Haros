import type { DesktopAppSnapState, DesktopAppSnapWindowEntry, ThreadId } from "@harnessos/contracts";
import { useEffect, useRef, useState } from "react";

import { insertAppSnapCaptureIntoDraft } from "~/appSnapIntake";
import { toastManager } from "../ui/toast";
import { useI18n } from "~/i18n";

const APP_SNAP_WINDOW_LIST_ATTEMPT_LIMIT = 2;

export function appSnapUnavailableMessageKey(
  state: DesktopAppSnapState,
):
  | "composer.appSnapEnableInSettings"
  | "composer.appSnapFinishPermissions"
  | "composer.appSnapStarting"
  | "composer.appSnapUnavailable" {
  if (!state.enabled || state.status === "disabled") return "composer.appSnapEnableInSettings";
  if (state.status === "permission-required") return "composer.appSnapFinishPermissions";
  if (state.status === "starting") return "composer.appSnapStarting";
  return "composer.appSnapUnavailable";
}

export type AppSnapWindowPicker = {
  available: boolean;
  windows: DesktopAppSnapWindowEntry[] | null;
  unavailableMessage: string | null;
  busy: boolean;
  captureWindow: (windowId: number) => void;
};

export function useAppSnapWindows(input: {
  open: boolean;
  threadId?: ThreadId;
}): AppSnapWindowPicker {
  const { t } = useI18n();
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const [windows, setWindows] = useState<DesktopAppSnapWindowEntry[] | null>(null);
  const [state, setState] = useState<DesktopAppSnapState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bridge = window.desktopBridge?.appSnap;
  const threadId = input.threadId;
  const available = Boolean(threadId && bridge?.listWindows && bridge.captureWindow);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!input.open || !bridge?.listWindows) return;

    setWindows(null);
    setError(null);
    setState(null);

    let disposed = false;
    let listedForReadyState = false;
    let windowListAttempts = 0;

    const applyState = (nextState: DesktopAppSnapState) => {
      if (disposed) return;
      setState(nextState);

      if (nextState.status !== "ready") {
        listedForReadyState = false;
        windowListAttempts = 0;
        requestIdRef.current += 1;
        setError(null);
        setWindows([]);
        return;
      }
      if (listedForReadyState || windowListAttempts >= APP_SNAP_WINDOW_LIST_ATTEMPT_LIMIT) {
        return;
      }
      listedForReadyState = true;
      windowListAttempts += 1;

      const requestId = ++requestIdRef.current;
      setError(null);
      setWindows(null);
      void bridge
        .listWindows()
        .then((listed) => {
          if (!disposed && requestIdRef.current === requestId) {
            setWindows(listed);
          }
        })
        .catch((listError) => {
          if (!disposed && requestIdRef.current === requestId) {
            listedForReadyState = false;
            setError(
              listError instanceof Error ? listError.message : t("composer.appSnapListFailed"),
            );
          }
        });
    };

    const unsubscribe = bridge.onState(applyState);
    const requestId = ++requestIdRef.current;
    void bridge
      .getState()
      .then((initialState) => {
        if (!disposed && requestIdRef.current === requestId) applyState(initialState);
      })
      .catch((stateError) => {
        if (!disposed && requestIdRef.current === requestId) {
          setError(
            stateError instanceof Error ? stateError.message : t("composer.appSnapListFailed"),
          );
        }
      });

    return () => {
      disposed = true;
      requestIdRef.current += 1;
      unsubscribe();
    };
  }, [bridge, input.open, t]);

  const captureWindow = (windowId: number) => {
    const activeBridge = window.desktopBridge?.appSnap;
    if (!activeBridge?.captureWindow || !threadId || busy) return;
    setBusy(true);
    void activeBridge
      .captureWindow({ windowId })
      .then(async (capture) => {
        const persistence = await insertAppSnapCaptureIntoDraft(threadId, capture);
        if (persistence === "persisted") {
          await activeBridge.acknowledgeCapture(capture.id).catch(() => undefined);
        }
      })
      .catch((captureError) => {
        toastManager.add({
          type: "error",
          title: t("settings.appsnapCaptureAddFailed"),
          description:
            captureError instanceof Error
              ? captureError.message
              : t("composer.appSnapCaptureFailed"),
          data: { allowCrossThreadVisibility: true },
        });
      })
      .finally(() => {
        if (mountedRef.current) setBusy(false);
      });
  };

  const unavailableMessage =
    error ??
    (state && state.status !== "ready"
      ? state.message?.trim() || t(appSnapUnavailableMessageKey(state))
      : null);

  return { available, windows, unavailableMessage, busy, captureWindow };
}

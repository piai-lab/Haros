// FILE: useWorkbenchEnvironmentController.ts
// Purpose: Own responsive Environment/Plan presentation and focus-restoration lifecycle.
// Layer: Conversation Workbench controller hook

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  PLAN_SIDEBAR_WIDTH_PX,
  resolveEnvironmentAutoSuppressed,
  resolveEnvironmentPanelVisible,
  resolveEnvironmentPresentation,
  resolvePlanSidebarPresentation,
} from "../../../lib/responsiveWorkbench";

export function useWorkbenchEnvironmentController(input: {
  readonly environmentEnabled: boolean;
  readonly planSidebarOpen: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [autoSuppressed, setAutoSuppressed] = useState(false);
  const [temporaryReveal, setTemporaryReveal] = useState(false);
  const responsiveContentRootRef = useRef<HTMLDivElement | null>(null);
  const observedWidthRef = useRef<number | null>(null);
  const temporaryFocusReturnRef = useRef<HTMLElement | null>(null);
  const [planSidebarPresentation, setPlanSidebarPresentation] = useState(() =>
    resolvePlanSidebarPresentation({
      availableWidth: typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerWidth,
    }),
  );

  useLayoutEffect(() => {
    const root = responsiveContentRootRef.current;
    if (!root) return;
    let frameId: number | null = null;
    let nextWidth = root.getBoundingClientRect().width;
    const update = () => {
      frameId = null;
      const previousWidth = observedWidthRef.current;
      observedWidthRef.current = nextWidth;
      if (input.planSidebarOpen) {
        setPlanSidebarPresentation((previous) => {
          const next = resolvePlanSidebarPresentation({ availableWidth: nextWidth });
          return next === previous ? previous : next;
        });
      } else {
        setPlanSidebarPresentation((previous) =>
          previous === "side-by-side" ? previous : "side-by-side",
        );
      }
      if (previousWidth !== null && Math.abs(previousWidth - nextWidth) >= 1) {
        setTemporaryReveal(false);
      }
      const availableWidth = Math.max(
        0,
        nextWidth - (input.planSidebarOpen ? PLAN_SIDEBAR_WIDTH_PX : 0),
      );
      if (input.environmentEnabled) {
        setAutoSuppressed((previouslySuppressed) =>
          resolveEnvironmentAutoSuppressed({ availableWidth, previouslySuppressed }),
        );
      }
    };
    const observer = new ResizeObserver((entries) => {
      nextWidth = entries[0]?.contentRect.width ?? root.getBoundingClientRect().width;
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(update);
    });
    observer.observe(root);
    update();
    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observedWidthRef.current = null;
    };
  }, [input.environmentEnabled, input.planSidebarOpen]);

  const setOpenPreference = useCallback(
    (open: boolean) => {
      if (autoSuppressed) {
        if (open && document.activeElement instanceof HTMLElement) {
          temporaryFocusReturnRef.current = document.activeElement;
        }
        setTemporaryReveal(open);
        return;
      }
      setTemporaryReveal(false);
      setManualOpen(open);
    },
    [autoSuppressed],
  );

  const focusToggleAfterClose = useCallback(
    (environmentPanel: HTMLElement | null, preferredTarget: HTMLElement | null = null) => {
      const environmentToggle =
        environmentPanel
          ?.closest("[data-chat-primary-surface]")
          ?.querySelector<HTMLButtonElement>("[data-environment-toggle]") ?? null;
      const focusTarget =
        preferredTarget?.isConnected &&
        preferredTarget.getClientRects().length > 0 &&
        !preferredTarget.closest("[inert], [aria-hidden='true']")
          ? preferredTarget
          : environmentToggle;
      if (!focusTarget) return;
      window.requestAnimationFrame(() => {
        if (
          !focusTarget.isConnected ||
          focusTarget.getClientRects().length === 0 ||
          focusTarget.closest("[inert], [aria-hidden='true']")
        ) {
          return;
        }
        focusTarget.focus({ preventScroll: true });
      });
    },
    [],
  );

  const closeAfterAction = useCallback(() => {
    const activeElement = document.activeElement;
    const environmentPanel =
      activeElement instanceof HTMLElement
        ? activeElement.closest<HTMLElement>("[data-environment-panel]")
        : null;
    setTemporaryReveal(false);
    setManualOpen(false);
    focusToggleAfterClose(environmentPanel);
  }, [focusToggleAfterClose]);

  const dismissTemporaryReveal = useCallback((_environmentPanel: HTMLElement | null) => {
    setTemporaryReveal(false);
  }, []);

  const presentation = resolveEnvironmentPresentation({
    manualOpen,
    autoSuppressed,
    temporaryReveal,
  });
  const visible = resolveEnvironmentPanelVisible({
    environmentEnabled: input.environmentEnabled,
    environmentPanelOpen: presentation !== "hidden",
  });
  const previousPresentationRef = useRef(presentation);
  useLayoutEffect(() => {
    const previousPresentation = previousPresentationRef.current;
    previousPresentationRef.current = presentation;
    if (previousPresentation === "hidden" || presentation !== "hidden") return;
    const activeElement = document.activeElement;
    const environmentPanel = responsiveContentRootRef.current?.querySelector<HTMLElement>(
      "[data-environment-panel]",
    );
    const preferredTarget = temporaryFocusReturnRef.current;
    temporaryFocusReturnRef.current = null;
    if (
      environmentPanel &&
      (preferredTarget ||
        (activeElement instanceof HTMLElement && environmentPanel.contains(activeElement)))
    ) {
      focusToggleAfterClose(environmentPanel, preferredTarget);
    }
  }, [focusToggleAfterClose, presentation]);

  return {
    closeAfterAction,
    dismissTemporaryReveal,
    planSidebarExclusive: input.planSidebarOpen && planSidebarPresentation === "exclusive",
    planSidebarPresentation,
    presentation,
    responsiveContentRootRef,
    setOpenPreference,
    visible,
  } as const;
}

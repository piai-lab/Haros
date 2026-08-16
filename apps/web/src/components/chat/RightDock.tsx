// FILE: RightDock.tsx
// Purpose: Tabbed multi-pane right sidebar shell (browser, diff, terminal, sidechat, git).
// Layer: Chat right-dock UI
// Depends on: ui/sidebar primitive, right-dock pane metadata, and a caller-provided pane renderer.

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import {
  type DockPaneRuntimeMode,
  EMPTY_PANE_ID_SET,
  reconcileKeepMountedPaneIds,
} from "~/lib/dockPaneActivation";
import { PanelRightCloseIcon, PlusIcon } from "~/lib/icons";
import type {
  RightDockPane,
  RightDockPaneKind,
  RightDockThreadState,
} from "~/rightDockStore.logic";
import { resolveActivePane } from "~/rightDockStore.logic";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { Menu, MenuItem, MenuTrigger } from "../ui/menu";
import {
  Sidebar,
  SIDEBAR_OFFCANVAS_MOTION_CLASS,
  SIDEBAR_OFFCANVAS_MOTION_SUPPRESSED_CLASS,
  SidebarProvider,
  SidebarRail,
} from "../ui/sidebar";
import { CHAT_BACKGROUND_CLASS_NAME } from "./composerPickerStyles";
import { ComposerPickerMenuPopup } from "./ComposerPickerMenuPopup";
import {
  CHAT_SURFACE_HEADER_ROW_CLASS_NAME,
  DOCK_HEADER_ICON_BUTTON_CLASS,
  SurfaceTabChip,
} from "./chatHeaderControls";
import {
  getRightDockPaneMeta,
  rightDockPaneLabelKey,
  type RightDockLauncherItem,
  resolveRightDockPaneIcon,
} from "./rightDockPaneMeta";
import { useDesktopTopBarWindowControlsGutterClassName } from "~/hooks/useDesktopTopBarGutter";

// Shared sizing defaults for dock hosts: the resize floor for a single readable pane and the
// "half the shell, but never cramped" opening width. The thread route tunes its own values
// around the composer; simpler hosts (e.g. the /pull-requests route) use these as-is.
export const RIGHT_DOCK_MIN_WIDTH = 26 * 16;
export const RIGHT_DOCK_DEFAULT_WIDTH = "max(28rem, calc(50vw - 8rem))";

// Pane kinds whose content has a natural width, opened at that size rather than
// at the even split. The device pane frames a portrait phone, so its useful
// width is whatever lets the phone reach full height: a ~19.5:9 chassis stays
// height-bound well past 480px, and opening narrower only shrinks the device
// while leaving empty space above and below it.
const RIGHT_DOCK_PREFERRED_WIDTH: Partial<Record<RightDockPaneKind, number>> = {
  device: 38 * 16,
};

interface RightDockProps {
  state: RightDockThreadState;
  minWidth: number;
  defaultWidth: string;
  shouldAcceptWidth: (context: { nextWidth: number; wrapper: HTMLElement }) => boolean;
  paneLabelOverrides?: Record<string, string | undefined>;
  // Per-pane tab glyph overrides (same shape as label overrides) — e.g. a pull request pane
  // swapping the generic kind icon for its live state glyph.
  paneIconOverrides?: Record<string, ReactNode | undefined>;
  addMenuKinds: readonly RightDockPaneKind[];
  launcherItems?: readonly RightDockLauncherItem[];
  // Single-pane hosts omit selection so their lone tab label is static; multi-pane chat hosts
  // provide the callback and keep the normal selectable-tab behavior.
  onSelectPane?: ((paneId: string) => void) | undefined;
  onClosePane: (paneId: string) => void;
  onCollapse: () => void;
  onOpenChange: (open: boolean) => void;
  onAddPane: (kind: RightDockPaneKind) => void;
  /** Width the primary surface must retain while this dock is split beside it. */
  minimumPrimaryWidth?: number;
  presentation?: "split" | "exclusive";
  motionKey?: string;
  activePaneRuntimeMode?: DockPaneRuntimeMode;
  renderPane: (
    pane: RightDockPane,
    context: { runtimeMode: DockPaneRuntimeMode; isActive: boolean; isVisible: boolean },
  ) => ReactNode;
}

function useRightDockLabel() {
  const { t } = useI18n();
  return (kind: RightDockPaneKind, fallback: string): string =>
    t(rightDockPaneLabelKey(kind, fallback));
}

function RightDockLauncher(props: {
  items: readonly RightDockLauncherItem[];
  onOpen: (kind: RightDockPaneKind) => void;
}) {
  const { t } = useI18n();
  const localizedLabel = useRightDockLabel();
  return (
    <nav
      aria-label={t("workbench.openPanelNavigation")}
      className="flex h-full min-h-0 items-center justify-center overflow-y-auto p-6"
    >
      <div className="flex w-full max-w-sm flex-col gap-1.5">
        {props.items.map(({ kind, Icon, label }) => {
          const visibleLabel = localizedLabel(kind, label);
          return (
            <Button
              key={kind}
              variant="subtle"
              size="xl"
              className="h-11 w-full justify-start gap-3 rounded-xl px-4 text-[length:var(--app-font-size-ui-lg,13px)] font-normal"
              aria-label={t("workbench.openPanel", { panel: visibleLabel })}
              onClick={() => props.onOpen(kind)}
            >
              <Icon className="size-4 shrink-0" />
              <span>{visibleLabel}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

function RightDockTab(props: {
  pane: RightDockPane;
  label: string;
  icon?: ReactNode;
  active: boolean;
  onSelect?: (() => void) | undefined;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <SurfaceTabChip
      active={props.active}
      title={props.label}
      label={props.label}
      labelClassName="max-w-[10rem]"
      icon={props.icon ?? resolveRightDockPaneIcon(props.pane)}
      closeLabel={t("workbench.closePanel", { panel: props.label })}
      onSelect={props.onSelect}
      onClose={props.onClose}
    />
  );
}

// Persist which keep-mounted panes (e.g. terminals) have been activated so they
// stay in the DOM while another tab is selected, pruned to live panes so closed
// panes drop out and the set never leaks across thread switches. The set is
// The rendered set is derived synchronously so a kept pane never unmounts for a
// frame. A layout effect commits that set for the next render without mutating a
// ref during render (which is unsafe when React replays or abandons work).
function useKeepMountedPaneIds(
  panes: readonly RightDockPane[],
  activePane: RightDockPane | null,
): ReadonlySet<string> {
  const [committedPaneIds, setCommittedPaneIds] = useState<ReadonlySet<string>>(EMPTY_PANE_ID_SET);
  const activePaneId = activePane?.id ?? null;
  const activePaneKind = activePane?.kind ?? null;
  const renderedPaneIds = reconcileKeepMountedPaneIds({
    previous: committedPaneIds,
    panes,
    activePaneId,
    activePaneKind,
  });

  useLayoutEffect(() => {
    setCommittedPaneIds((current) => {
      const next = reconcileKeepMountedPaneIds({
        previous: current,
        panes,
        activePaneId,
        activePaneKind,
      });
      if (next.size === current.size && [...next].every((paneId) => current.has(paneId))) {
        return current;
      }
      return next;
    });
  }, [activePaneId, activePaneKind, panes]);

  return renderedPaneIds;
}

export function RightDock(props: RightDockProps) {
  const { t } = useI18n();
  const localizedLabel = useRightDockLabel();
  const activePane = resolveActivePane(props.state);
  const onSelectPane = props.onSelectPane;
  const activePaneRuntimeMode = props.activePaneRuntimeMode ?? "live";
  // The dock is the right-most surface when open, so its header sits under the
  // fixed Windows caption cluster — reserve the same gutter the chat header uses.
  const desktopTopBarWindowControlsGutterClassName =
    useDesktopTopBarWindowControlsGutterClassName();

  const keepMountedPaneIds = useKeepMountedPaneIds(props.state.panes, activePane);
  // The dock opens at its authored balanced/natural width while preserving the
  // primary surface floor. The local shell measurement includes the actual
  // left-navigation state, and later manual drags remain proportional during
  // this open session.
  const contentRef = useRef<HTMLDivElement | null>(null);
  const manualSplitRatioRef = useRef<number | null>(null);
  const previousOpenRef = useRef(props.state.open);
  const minWidth = props.minWidth;
  const minimumPrimaryWidth = props.minimumPrimaryWidth ?? 0;
  const shouldAcceptWidth = props.shouldAcceptWidth;
  const activePaneKind = activePane?.kind ?? null;
  const applyResponsiveWidth = useCallback(() => {
    const wrapper = contentRef.current?.closest<HTMLElement>("[data-slot='sidebar-wrapper']");
    const shell = wrapper?.parentElement;
    if (!wrapper || !shell) return;
    if (props.presentation === "exclusive") {
      wrapper.style.setProperty("--sidebar-width", "100%");
      return;
    }
    if (!props.state.open) {
      wrapper.style.removeProperty("--sidebar-width");
      return;
    }
    const shellWidth = shell.getBoundingClientRect().width;
    if (shellWidth <= 0) return;
    const preferredWidth = activePaneKind ? RIGHT_DOCK_PREFERRED_WIDTH[activePaneKind] : undefined;
    const authoredWidth =
      manualSplitRatioRef.current === null
        ? (preferredWidth ?? Math.round(shellWidth / 2))
        : Math.round(shellWidth * manualSplitRatioRef.current);
    const maximumWidth = Math.max(0, shellWidth - minimumPrimaryWidth);
    const openWidth = Math.min(Math.max(minWidth, authoredWidth), maximumWidth);
    wrapper.style.setProperty("--sidebar-width", `${openWidth}px`);
  }, [activePaneKind, minimumPrimaryWidth, minWidth, props.presentation, props.state.open]);
  useLayoutEffect(() => {
    if (props.state.open && !previousOpenRef.current) {
      // Preserve the existing contract: a fresh open starts from the authored balanced/natural
      // width. Manual drag only owns subsequent resizes during this open session.
      manualSplitRatioRef.current = null;
    }
    previousOpenRef.current = props.state.open;
    applyResponsiveWidth();
  }, [applyResponsiveWidth, props.state.open]);
  useEffect(() => {
    if (!props.state.open || props.presentation === "exclusive") return;
    const wrapper = contentRef.current?.closest<HTMLElement>("[data-slot='sidebar-wrapper']");
    const shell = wrapper?.parentElement;
    if (!wrapper || !shell) return;
    let releaseMotionFrameId: number | null = null;
    const transitionTargets = [
      wrapper.querySelector<HTMLElement>("[data-slot='sidebar-gap']"),
      wrapper.querySelector<HTMLElement>("[data-slot='sidebar-container']"),
    ].filter((element): element is HTMLElement => element !== null);
    const observer = new ResizeObserver(() => {
      // ResizeObserver is delivered after layout and before paint. Apply the local CSS width
      // immediately: another rAF would expose one frame where the shell has resized but the
      // dock still uses the previous budget. This mutates no React/manual-intent state.
      if (releaseMotionFrameId !== null) {
        window.cancelAnimationFrame(releaseMotionFrameId);
      }
      transitionTargets.forEach((element) => {
        element.style.setProperty("transition-duration", "0ms");
      });
      applyResponsiveWidth();
      releaseMotionFrameId = window.requestAnimationFrame(() => {
        releaseMotionFrameId = null;
        transitionTargets.forEach((element) => {
          element.style.removeProperty("transition-duration");
        });
      });
    });
    observer.observe(shell);
    return () => {
      observer.disconnect();
      if (releaseMotionFrameId !== null) window.cancelAnimationFrame(releaseMotionFrameId);
      transitionTargets.forEach((element) => {
        element.style.removeProperty("transition-duration");
      });
    };
  }, [applyResponsiveWidth, props.presentation, props.state.open]);
  const handleManualResize = useCallback((width: number) => {
    const wrapper = contentRef.current?.closest<HTMLElement>("[data-slot='sidebar-wrapper']");
    const shellWidth = wrapper?.parentElement?.getBoundingClientRect().width ?? 0;
    if (shellWidth > 0) {
      manualSplitRatioRef.current = width / shellWidth;
    }
  }, []);
  const handleResponsiveWidthAcceptance = useCallback(
    (context: { nextWidth: number; wrapper: HTMLElement }) => {
      const shellWidth = context.wrapper.parentElement?.getBoundingClientRect().width ?? 0;
      if (shellWidth > 0 && context.nextWidth > shellWidth - minimumPrimaryWidth) {
        return false;
      }
      return shouldAcceptWidth(context);
    },
    [minimumPrimaryWidth, shouldAcceptWidth],
  );
  const renderedPanes = props.state.panes.filter(
    (pane) => pane.id === activePane?.id || keepMountedPaneIds.has(pane.id),
  );
  // Motion allowance keyed to the current motionKey: a key change (reposition/
  // remount) derives straight back to "suppressed" in that same render, and the
  // rAF below re-enables motion once the suppressed frame has painted. Mounting
  // with the dock open starts suppressed for the same reason.
  // Responsive presentation changes must commit their final geometry before
  // paint; they are not drawer open/close animations. Fold the presentation
  // tier into the existing one-frame motion gate so no second motion owner is
  // introduced.
  const chromeMotionKey = `${props.motionKey ?? "default"}:${props.presentation ?? "split"}`;
  const [motionState, setMotionState] = useState<{
    key: string;
    allow: boolean;
  }>(() => ({ key: chromeMotionKey, allow: !props.state.open }));
  const shouldSuppressChromeMotion = !(motionState.key === chromeMotionKey && motionState.allow);

  useEffect(() => {
    if (!shouldSuppressChromeMotion) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      setMotionState({ key: chromeMotionKey, allow: true });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [chromeMotionKey, shouldSuppressChromeMotion]);

  // Smooth drawer-style easing for the open/close slide. `ease-linear` (the
  // sidebar default) reads as stepped/janky on the wide dock; this curve front-
  // loads motion and settles softly. Applied to both the width gap and the
  // sliding container so they stay in lockstep.
  const chromeMotionClass = shouldSuppressChromeMotion
    ? SIDEBAR_OFFCANVAS_MOTION_SUPPRESSED_CLASS
    : SIDEBAR_OFFCANVAS_MOTION_CLASS;
  const responsiveSplitMaxWidthClass =
    props.presentation === "exclusive"
      ? undefined
      : "max-w-[calc(100cqw-var(--right-dock-primary-floor))]";

  return (
    <SidebarProvider
      defaultOpen={false}
      desktopPresentation
      open={props.state.open}
      onOpenChange={props.onOpenChange}
      className={cn(
        "w-auto min-h-0 flex-none bg-transparent",
        props.presentation === "exclusive" && "absolute inset-0 z-20 w-full",
      )}
      data-right-dock-presentation={props.presentation ?? "split"}
      style={
        {
          "--sidebar-width": props.presentation === "exclusive" ? "100%" : props.defaultWidth,
          "--right-dock-primary-floor": `${minimumPrimaryWidth}px`,
        } as CSSProperties
      }
    >
      <Sidebar
        side="right"
        collapsible="offcanvas"
        className={cn(
          "border-l border-[var(--app-surface-divider)] text-foreground",
          chromeMotionClass,
          responsiveSplitMaxWidthClass,
          props.presentation === "exclusive" && "absolute! inset-0! h-full! w-full!",
        )}
        innerClassName={CHAT_BACKGROUND_CLASS_NAME}
        gapClassName={cn(chromeMotionClass, responsiveSplitMaxWidthClass)}
        transparentSurface
        resizable={
          props.presentation === "exclusive"
            ? false
            : {
                minWidth: props.minWidth,
                onResize: handleManualResize,
                shouldAcceptWidth: handleResponsiveWidthAcceptance,
              }
        }
      >
        <div
          ref={contentRef}
          data-right-dock-content
          className="flex h-full min-h-0 w-full flex-col"
        >
          <div
            className={cn(
              CHAT_SURFACE_HEADER_ROW_CLASS_NAME,
              "gap-1 px-1.5",
              desktopTopBarWindowControlsGutterClassName,
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {props.state.panes.map((pane) => (
                <RightDockTab
                  key={pane.id}
                  pane={pane}
                  label={
                    props.paneLabelOverrides?.[pane.id] ??
                    localizedLabel(pane.kind, getRightDockPaneMeta(pane.kind).label)
                  }
                  icon={props.paneIconOverrides?.[pane.id]}
                  active={pane.id === props.state.activePaneId}
                  onSelect={onSelectPane ? () => onSelectPane(pane.id) : undefined}
                  onClose={() => props.onClosePane(pane.id)}
                />
              ))}
            </div>
            {props.state.panes.length > 0 && props.addMenuKinds.length > 0 ? (
              <Menu modal={false}>
                <MenuTrigger
                  render={
                    <Button
                      variant="chrome"
                      size="icon-xs"
                      aria-label={t("workbench.addPanel")}
                      title={t("workbench.addPanel")}
                      className={DOCK_HEADER_ICON_BUTTON_CLASS}
                    />
                  }
                >
                  <PlusIcon className="size-3.5" />
                </MenuTrigger>
                <ComposerPickerMenuPopup align="end" side="bottom" className="w-44 min-w-44">
                  {props.addMenuKinds.map((kind) => {
                    const { Icon, label } = getRightDockPaneMeta(kind);
                    return (
                      <MenuItem key={kind} onClick={() => props.onAddPane(kind)}>
                        <Icon className="size-3.5 shrink-0" />
                        <span>{localizedLabel(kind, label)}</span>
                      </MenuItem>
                    );
                  })}
                </ComposerPickerMenuPopup>
              </Menu>
            ) : null}
            <IconButton
              variant="chrome"
              size="icon-xs"
              label={t("workbench.collapsePanel")}
              tooltip={t("workbench.collapsePanel")}
              tooltipSide="bottom"
              className={DOCK_HEADER_ICON_BUTTON_CLASS}
              onClick={props.onCollapse}
            >
              <PanelRightCloseIcon />
            </IconButton>
          </div>
          <div className="relative min-h-0 flex-1">
            {activePane === null && props.launcherItems ? (
              <RightDockLauncher items={props.launcherItems} onOpen={props.onAddPane} />
            ) : null}
            {renderedPanes.map((pane) => {
              const isActive = pane.id === activePane?.id;
              const isVisible = isActive && props.state.open;
              // Keep-mounted panes that are not the active tab are already
              // hydrated, so they render live (just hidden); the active pane uses
              // the deferred-aware runtime mode from the activation hook.
              const runtimeMode: DockPaneRuntimeMode = isActive ? activePaneRuntimeMode : "live";
              return (
                <div
                  key={pane.id}
                  className={cn(
                    "absolute inset-0 flex min-h-0 w-full",
                    isActive ? undefined : "invisible pointer-events-none",
                  )}
                  aria-hidden={isVisible ? undefined : true}
                  inert={isVisible ? undefined : true}
                  data-right-dock-pane-id={pane.id}
                  data-right-dock-pane-kind={pane.kind}
                  data-right-dock-pane-runtime={runtimeMode}
                  data-right-dock-pane-visible={isVisible ? "true" : "false"}
                  data-native-browser-surface={
                    pane.kind === "browser" && isActive && runtimeMode === "live"
                      ? "true"
                      : undefined
                  }
                >
                  {props.renderPane(pane, { runtimeMode, isActive, isVisible })}
                </div>
              );
            })}
          </div>
        </div>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}

export default RightDock;

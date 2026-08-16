import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "~/lib/utils";
import { CentralIcon } from "~/lib/central-icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPopup,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { ShortcutKbd } from "~/components/ui/shortcut-kbd";
import { useIsMobile } from "~/hooks/useMediaQuery";
import { getLocalStorageItem, setLocalStorageItem } from "~/hooks/useLocalStorage";
import { useI18n } from "~/i18n";
import { Schema } from "effect";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
// 23rem matches the information density of the desktop workbench: project and
// conversation titles remain legible without stealing the 46rem reading column.
const SIDEBAR_WIDTH = "23rem";
const SIDEBAR_WIDTH_MOBILE = "calc(100vw - var(--spacing(3)))";
const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_RESIZE_DEFAULT_MIN_WIDTH = 13 * 16;

/**
 * Soft "drawer" easing for the offcanvas open/close slide, overriding the shell's
 * default `duration-200 ease-linear` (which reads as stepped on wide surfaces). It
 * front-loads the motion and settles softly. Apply to BOTH the sliding container
 * (Sidebar `className`) and the layout `gapClassName` so they animate in lockstep.
 * Shared by the thread sidebar (left) and the right dock so the two slides match.
 */
const SIDEBAR_OFFCANVAS_MOTION_CLASS =
  "duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none motion-reduce:duration-0";

/**
 * Suppresses the slide entirely — for first mount or a reposition/remount where
 * animating from the old geometry would look wrong. `!` beats the base duration/ease.
 */
const SIDEBAR_OFFCANVAS_MOTION_SUPPRESSED_CLASS = "transition-none! duration-0!";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleShortcutLabel: string | null;
  toggleSidebar: () => void;
};

type SidebarResizableOptions = {
  /** When set, releasing with only this many visible pixels commits off-canvas close. */
  dragDismissThreshold?: number;
  maxWidth?: number;
  minWidth?: number;
  onResize?: (width: number) => void;
  shouldAcceptWidth?: (context: {
    currentWidth: number;
    nextWidth: number;
    rail: HTMLButtonElement;
    side: "left" | "right";
    sidebarRoot: HTMLElement;
    wrapper: HTMLElement;
  }) => boolean;
  storageKey?: string;
};

type SidebarResolvedResizableOptions = {
  dragDismissThreshold: number | null;
  maxWidth: number;
  minWidth: number;
  onResize?: (width: number) => void;
  shouldAcceptWidth?: (context: {
    currentWidth: number;
    nextWidth: number;
    rail: HTMLButtonElement;
    side: "left" | "right";
    sidebarRoot: HTMLElement;
    wrapper: HTMLElement;
  }) => boolean;
  storageKey: string | null;
};

type SidebarInstanceContextProps = {
  resizable: SidebarResolvedResizableOptions | null;
  side: "left" | "right";
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);
const SidebarInstanceContext = React.createContext<SidebarInstanceContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen: defaultOpenProp,
  open: openProp,
  onOpenChange: setOpenProp,
  resolveToggleOpen: resolveToggleOpenProp,
  toggleShortcutLabel: toggleShortcutLabelProp,
  desktopPresentation: desktopPresentationProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  /** Keep the same desktop surface mounted through compact native-window widths. */
  desktopPresentation?: boolean;
  /** Resolved user keybinding shown beside the toggle label; null hides the hint. */
  toggleShortcutLabel?: string | null;
  /** Return false for a transient presentation change that must not persist manual intent. */
  onOpenChange?: (open: boolean) => void | false;
  /**
   * Resolves an explicit toggle against the host's semantic presentation. This is
   * needed when a passive preview is visually open but the user's manual intent is
   * still closed: the explicit toggle must promote the preview instead of hiding it.
   */
  resolveToggleOpen?: (presentationOpen: boolean) => boolean;
}) {
  const defaultOpen = defaultOpenProp ?? true;
  const detectedMobile = useIsMobile();
  const isMobile = desktopPresentationProp ? false : detectedMobile;
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    async (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      let shouldPersist = true;
      if (setOpenProp) {
        shouldPersist = setOpenProp(openState) !== false;
      } else {
        _setOpen(openState);
      }

      if (shouldPersist) {
        // Only manual state changes reach the cookie. Responsive presentation can use the same
        // mounted surface without rewriting the user's intent.
        await cookieStore.set({
          expires: Date.now() + SIDEBAR_COOKIE_MAX_AGE * 1000,
          name: SIDEBAR_COOKIE_NAME,
          path: "/",
          value: String(openState),
        });
      }
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile
      ? setOpenMobile((open) => !open)
      : setOpen(resolveToggleOpenProp?.(open) ?? !open);
  }, [isMobile, open, resolveToggleOpenProp, setOpen]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      isMobile,
      open,
      openMobile,
      setOpen,
      setOpenMobile,
      state,
      toggleShortcutLabel: toggleShortcutLabelProp ?? null,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleShortcutLabelProp, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
          className,
        )}
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// Resolves user-facing resizable options into concrete bounds, or null when resizing
// is unavailable (mobile / non-collapsible / disabled). Shared by Sidebar and the
// detached content-seam rail so both agree on identical resize behavior.
function resolveSidebarResizable(
  resizable: boolean | SidebarResizableOptions,
  { collapsible, isMobile }: { collapsible: "offcanvas" | "icon" | "none"; isMobile: boolean },
): SidebarResolvedResizableOptions | null {
  if (isMobile || collapsible === "none" || !resizable) {
    return null;
  }
  const options = typeof resizable === "boolean" ? {} : resizable;
  return {
    dragDismissThreshold: options.dragDismissThreshold ?? null,
    maxWidth: options.maxWidth ?? Number.POSITIVE_INFINITY,
    minWidth: options.minWidth ?? SIDEBAR_RESIZE_DEFAULT_MIN_WIDTH,
    storageKey: options.storageKey ?? null,
    ...(options.onResize ? { onResize: options.onResize } : {}),
    ...(options.shouldAcceptWidth ? { shouldAcceptWidth: options.shouldAcceptWidth } : {}),
  };
}

// Supplies the per-instance sidebar context (side + resolved resize options) to a
// SidebarRail rendered OUTSIDE its <Sidebar> — e.g. the content-seam rail, which must
// stack above the chat card. Without this the detached rail has no resize config and
// silently degrades to toggle-only (the "can't drag" regression). Provide the SAME
// `resizable`/`side` here as on the matching <Sidebar>. Must be used inside a SidebarProvider.
function SidebarInstanceProvider({
  side,
  resizable,
  collapsible: collapsibleProp,
  children,
}: {
  side: "left" | "right";
  resizable: boolean | SidebarResizableOptions;
  collapsible?: "offcanvas" | "icon" | "none";
  children: React.ReactNode;
}) {
  const collapsible = collapsibleProp ?? "offcanvas";
  const { isMobile } = useSidebar();
  const resolvedResizable = React.useMemo(
    () => resolveSidebarResizable(resizable, { collapsible, isMobile }),
    [collapsible, isMobile, resizable],
  );
  const value = React.useMemo<SidebarInstanceContextProps>(
    () => ({ resizable: resolvedResizable, side }),
    [resolvedResizable, side],
  );
  return (
    <SidebarInstanceContext.Provider value={value}>{children}</SidebarInstanceContext.Provider>
  );
}

function Sidebar({
  side: sideProp,
  variant: variantProp,
  collapsible: collapsibleProp,
  resizable: resizableProp,
  className,
  gapClassName,
  innerClassName,
  transparentSurface: transparentSurfaceProp,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  resizable?: boolean | SidebarResizableOptions;
  gapClassName?: string;
  innerClassName?: string;
  transparentSurface?: boolean;
}) {
  const side = sideProp ?? "left";
  const variant = variantProp ?? "sidebar";
  const collapsible = collapsibleProp ?? "offcanvas";
  const resizable = resizableProp ?? false;
  const transparentSurface = transparentSurfaceProp ?? false;
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const resolvedResizable = React.useMemo<SidebarResolvedResizableOptions | null>(
    () => resolveSidebarResizable(resizable, { collapsible, isMobile }),
    [collapsible, isMobile, resizable],
  );
  const instanceContextValue = React.useMemo<SidebarInstanceContextProps>(
    () => ({ side, resizable: resolvedResizable }),
    [resolvedResizable, side],
  );

  if (collapsible === "none") {
    return (
      <SidebarInstanceContext.Provider value={instanceContextValue}>
        <div
          className={cn(
            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
            innerClassName,
            className,
          )}
          data-slot="sidebar"
          {...props}
        >
          {children}
        </div>
      </SidebarInstanceContext.Provider>
    );
  }

  if (isMobile) {
    return (
      <SidebarInstanceContext.Provider value={instanceContextValue}>
        <Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
          <SheetPopup
            className={cn(
              "w-(--sidebar-width) max-w-none bg-sidebar p-0 text-sidebar-foreground",
              className,
            )}
            data-mobile="true"
            data-sidebar="sidebar"
            data-slot="sidebar"
            showCloseButton={false}
            side={side}
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div className={cn("flex h-full w-full flex-col", innerClassName)}>{children}</div>
          </SheetPopup>
        </Sheet>
      </SidebarInstanceContext.Provider>
    );
  }

  const offcanvasHidden = state === "collapsed" && collapsible === "offcanvas";

  return (
    <SidebarInstanceContext.Provider value={instanceContextValue}>
      <div
        className="group peer block text-sidebar-foreground"
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-side={side}
        data-slot="sidebar"
        data-state={state}
        data-variant={variant}
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          className={cn(
            "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
            gapClassName,
          )}
          data-slot="sidebar-gap"
        />
        <div
          className={cn(
            "fixed inset-y-0 z-0 flex h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            // Adjust the padding for floating and inset variants.
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
              : cn(
                  "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
                  // Skip container border when innerClassName provides its own
                  !transparentSurface &&
                    "group-data-[side=left]:border-r group-data-[side=right]:border-l",
                ),
            className,
          )}
          data-slot="sidebar-container"
          {...props}
          aria-hidden={offcanvasHidden ? true : undefined}
          inert={offcanvasHidden ? true : undefined}
        >
          {/* The inner surface is the safe place for visual skinning. The outer shell owns
              fixed positioning, width transitions, and the resize rail hit area. */}
          <div
            className={cn(
              "relative z-0 flex h-full w-full flex-col [container-type:inline-size] group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm/5",
              !transparentSurface && "bg-sidebar",
              innerClassName,
            )}
            data-sidebar="sidebar"
            data-slot="sidebar-inner"
          >
            {children}
          </div>
        </div>
      </div>
    </SidebarInstanceContext.Provider>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleShortcutLabel, toggleSidebar } = useSidebar();
  const { t } = useI18n();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={cn("size-8 rounded-lg", className)}
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            onClick={(event) => {
              onClick?.(event);
              toggleSidebar();
            }}
            size="icon-xs"
            variant="ghost"
            {...props}
          />
        }
      >
        <CentralIcon name="sidebar-hidden-left-wide" />
        <span className="sr-only">{t("nav.toggleSidebar")}</span>
      </TooltipTrigger>
      <TooltipPopup
        align="start"
        side="bottom"
        sideOffset={7}
        className="border-transparent bg-[rgba(28,28,30,0.96)] text-white before:hidden shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
      >
        <span className="inline-flex items-center gap-2 whitespace-nowrap px-0.5 py-0.5 text-xs font-medium">
          <span>{t("nav.toggleSidebar")}</span>
          {toggleShortcutLabel ? (
            <ShortcutKbd
              shortcutLabel={toggleShortcutLabel}
              groupClassName="gap-0.5"
              className="h-4 min-w-4 rounded bg-white/12 px-1 text-[10px] text-white/80"
            />
          ) : null}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}

// Desktop headers lose access to the in-sidebar trigger after an off-canvas close,
// so this companion control reuses the same trigger and only appears when hidden.
// Traffic-light clearance is owned solely by the host header's
// DESKTOP_TOP_BAR_TRAFFIC_LIGHT_GUTTER_CLASS gutter — this control adds no offset of
// its own, so the toggle sits at the same x whether the sidebar is open or closed.
function SidebarHeaderTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { isMobile, open } = useSidebar();

  if (!isMobile && open) {
    return null;
  }

  return <SidebarTrigger className={className} onClick={onClick} {...props} />;
}

function clampSidebarWidth(width: number, options: SidebarResolvedResizableOptions): number {
  return Math.max(options.minWidth, Math.min(width, options.maxWidth));
}

function SidebarRail({
  placement: placementProp,
  className,
  onClick,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ...props
}: React.ComponentProps<"button"> & {
  /** `content-seam` sits on the chat column edge above the card; `sidebar-shell` stays on the sidebar container. */
  placement?: "sidebar-shell" | "content-seam";
}) {
  const { t } = useI18n();
  const placement = placementProp ?? "sidebar-shell";
  const { open, setOpen, toggleSidebar } = useSidebar();
  const sidebarInstance = React.useContext(SidebarInstanceContext);
  const side = sidebarInstance?.side ?? "left";
  const isContentSeam = placement === "content-seam";
  const railRef = React.useRef<HTMLButtonElement | null>(null);
  const suppressClickRef = React.useRef(false);
  const settleCleanupRef = React.useRef<(() => void) | null>(null);
  const settleTimeoutRef = React.useRef<number | null>(null);
  const resizeStateRef = React.useRef<{
    container: HTMLElement;
    gap: HTMLElement;
    moved: boolean;
    pointerId: number;
    pendingWidth: number;
    rail: HTMLButtonElement;
    rafId: number | null;
    retreating: boolean;
    sidebarRoot: HTMLElement;
    side: "left" | "right";
    startWidth: number;
    startX: number;
    transitionTargets: HTMLElement[];
    width: number;
    wrapper: HTMLElement;
  } | null>(null);
  const resolvedResizable = sidebarInstance?.resizable ?? null;
  const canResize = resolvedResizable !== null && open;
  const railLabel = canResize ? t("nav.resizeSidebar") : t("nav.toggleSidebar");
  const railTitle = canResize ? t("nav.dragResizeSidebar") : t("nav.toggleSidebar");

  const applyPendingResize = React.useCallback(() => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || !resolvedResizable) return;

    const rawWidth = Math.min(resizeState.pendingWidth, resolvedResizable.maxWidth);
    const retreating =
      resolvedResizable.dragDismissThreshold !== null && rawWidth < resolvedResizable.minWidth;
    const nextWidth = retreating
      ? resolvedResizable.minWidth
      : clampSidebarWidth(rawWidth, resolvedResizable);
    const accepted =
      resolvedResizable.shouldAcceptWidth?.({
        currentWidth: resizeState.width,
        nextWidth,
        rail: resizeState.rail,
        side: resizeState.side,
        sidebarRoot: resizeState.sidebarRoot,
        wrapper: resizeState.wrapper,
      }) ?? true;
    if (!accepted) return;

    if (retreating) {
      const visibleWidth = Math.max(0, rawWidth);
      const translateX =
        resizeState.side === "left"
          ? visibleWidth - resolvedResizable.minWidth
          : resolvedResizable.minWidth - visibleWidth;
      resizeState.wrapper.style.setProperty("--sidebar-width", `${resolvedResizable.minWidth}px`);
      resizeState.wrapper.style.setProperty("--sidebar-effective-width", `${visibleWidth}px`);
      resizeState.gap.style.setProperty("width", `${visibleWidth}px`);
      resizeState.container.style.setProperty("transform", `translate3d(${translateX}px, 0, 0)`);
      resizeState.sidebarRoot.dataset.resizeRetreating = "true";
      resizeState.retreating = true;
      resizeState.width = resolvedResizable.minWidth;
      return;
    }

    resizeState.gap.style.removeProperty("width");
    resizeState.container.style.removeProperty("transform");
    resizeState.sidebarRoot.removeAttribute("data-resize-retreating");
    resizeState.wrapper.style.setProperty("--sidebar-effective-width", `${nextWidth}px`);
    resizeState.wrapper.style.setProperty("--sidebar-width", `${nextWidth}px`);
    resizeState.retreating = false;
    resizeState.width = nextWidth;
  }, [resolvedResizable]);

  const stopResize = React.useCallback(
    (pointerId: number, outcome: "commit" | "cancel") => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }
      if (resizeState.rafId !== null) {
        window.cancelAnimationFrame(resizeState.rafId);
        resizeState.rafId = null;
        applyPendingResize();
      }
      const dismiss =
        outcome === "commit" &&
        resolvedResizable?.dragDismissThreshold !== null &&
        resolvedResizable?.dragDismissThreshold !== undefined &&
        resizeState.pendingWidth <= resolvedResizable.dragDismissThreshold;
      const restorePreview = outcome === "cancel" || (resizeState.retreating && !dismiss);

      resizeState.transitionTargets.forEach((element) => {
        element.style.removeProperty("transition-duration");
      });
      resizeState.wrapper.removeAttribute("data-sidebar-resizing");
      resizeState.sidebarRoot.removeAttribute("data-resize-retreating");
      document.body.removeAttribute("data-sidebar-resizing");

      if (dismiss) {
        // The below-minimum retreat is a close gesture, not a new committed width.
        // Keep the last valid width intact so a later dock/peek restores it.
        resizeState.wrapper.style.setProperty("--sidebar-width", `${resizeState.startWidth}px`);
        resizeState.wrapper.style.setProperty("--sidebar-effective-width", "0px");
        resizeState.gap.style.setProperty("width", "0px");
        void setOpen(false);
      } else if (restorePreview) {
        resizeState.wrapper.style.setProperty("--sidebar-width", `${resizeState.startWidth}px`);
        resizeState.wrapper.style.setProperty(
          "--sidebar-effective-width",
          `${resizeState.startWidth}px`,
        );
        resizeState.gap.style.removeProperty("width");
        resizeState.container.style.removeProperty("transform");
      } else {
        resizeState.wrapper.style.setProperty(
          "--sidebar-effective-width",
          `${resizeState.width}px`,
        );
        if (resolvedResizable?.storageKey && typeof window !== "undefined") {
          setLocalStorageItem(resolvedResizable.storageKey, resizeState.width, Schema.Finite);
        }
        resolvedResizable?.onResize?.(resizeState.width);
      }

      resizeStateRef.current = null;
      if (resizeState.rail.hasPointerCapture(pointerId)) {
        resizeState.rail.releasePointerCapture(pointerId);
      }
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");

      if (dismiss || restorePreview) {
        const finishSettling = () => {
          if (settleTimeoutRef.current !== null) {
            window.clearTimeout(settleTimeoutRef.current);
            settleTimeoutRef.current = null;
          }
          resizeState.gap.style.removeProperty("width");
          resizeState.container.style.removeProperty("transform");
          resizeState.wrapper.style.removeProperty("--sidebar-effective-width");
          settleCleanupRef.current = null;
        };
        settleCleanupRef.current = finishSettling;
        settleTimeoutRef.current = window.setTimeout(finishSettling, 320);
      } else {
        resizeState.wrapper.style.removeProperty("--sidebar-effective-width");
      }
    },
    [applyPendingResize, resolvedResizable, setOpen],
  );

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event);
      if (event.defaultPrevented) return;
      if (!resolvedResizable || !open || event.button !== 0) return;

      const wrapper = event.currentTarget.closest<HTMLElement>("[data-slot='sidebar-wrapper']");
      const sidebarRoot =
        event.currentTarget.closest<HTMLElement>("[data-slot='sidebar']") ??
        wrapper?.querySelector<HTMLElement>("[data-slot='sidebar']") ??
        null;
      if (!wrapper || !sidebarRoot) {
        return;
      }

      const sidebarContainer = sidebarRoot.querySelector<HTMLElement>(
        "[data-slot='sidebar-container']",
      );
      if (!sidebarContainer) {
        return;
      }

      const startWidth = sidebarContainer.getBoundingClientRect().width;
      const initialWidth = clampSidebarWidth(startWidth, resolvedResizable);
      const sidebarGap = sidebarRoot.querySelector<HTMLElement>("[data-slot='sidebar-gap']");
      if (!sidebarGap) return;
      if (settleTimeoutRef.current !== null) {
        settleCleanupRef.current?.();
      }
      const transitionTargets = [sidebarGap, sidebarContainer];
      transitionTargets.forEach((element) => {
        element.style.setProperty("transition-duration", "0ms");
      });

      event.preventDefault();
      event.stopPropagation();
      resizeStateRef.current = {
        container: sidebarContainer,
        gap: sidebarGap,
        moved: false,
        pointerId: event.pointerId,
        pendingWidth: initialWidth,
        rail: event.currentTarget,
        rafId: null,
        retreating: false,
        sidebarRoot,
        side: sidebarInstance?.side ?? "left",
        startWidth: initialWidth,
        startX: event.clientX,
        transitionTargets,
        width: initialWidth,
        wrapper,
      };
      wrapper.style.setProperty("--sidebar-width", `${initialWidth}px`);
      wrapper.style.setProperty("--sidebar-effective-width", `${initialWidth}px`);
      wrapper.dataset.sidebarResizing = "true";
      document.body.dataset.sidebarResizing = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onPointerDown, open, resolvedResizable, sidebarInstance?.side],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(event);
      if (event.defaultPrevented) return;
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId || !resolvedResizable) return;

      event.preventDefault();
      const delta =
        resizeState.side === "right"
          ? resizeState.startX - event.clientX
          : event.clientX - resizeState.startX;
      if (Math.abs(delta) > 2) {
        resizeState.moved = true;
      }
      resizeState.pendingWidth = resizeState.startWidth + delta;
      if (resizeState.rafId !== null) {
        return;
      }

      resizeState.rafId = window.requestAnimationFrame(() => {
        const activeResizeState = resizeStateRef.current;
        if (!activeResizeState) return;
        activeResizeState.rafId = null;
        applyPendingResize();
      });
    },
    [applyPendingResize, onPointerMove, resolvedResizable],
  );

  const endResizeInteraction = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, outcome: "commit" | "cancel") => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;

      event.preventDefault();
      suppressClickRef.current = resizeState.moved;
      stopResize(event.pointerId, outcome);
    },
    [stopResize],
  );

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerUp?.(event);
    if (event.defaultPrevented) return;
    endResizeInteraction(event, "commit");
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerCancel?.(event);
    if (event.defaultPrevented) return;
    endResizeInteraction(event, "cancel");
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }
    if (resolvedResizable && open) {
      event.preventDefault();
      return;
    }
    toggleSidebar();
  };

  React.useEffect(() => {
    if (!resolvedResizable?.storageKey || typeof window === "undefined") return;
    const rail = railRef.current;
    if (!rail) return;
    const wrapper = rail.closest<HTMLElement>("[data-slot='sidebar-wrapper']");
    if (!wrapper) return;

    const storedWidth = getLocalStorageItem(resolvedResizable.storageKey, Schema.Finite);
    if (storedWidth === null) return;
    const clampedWidth = clampSidebarWidth(storedWidth, resolvedResizable);
    wrapper.style.setProperty("--sidebar-width", `${clampedWidth}px`);
    resolvedResizable.onResize?.(clampedWidth);
  }, [resolvedResizable]);

  React.useEffect(() => {
    return () => {
      if (settleTimeoutRef.current !== null) {
        settleCleanupRef.current?.();
      }
      const resizeState = resizeStateRef.current;
      if (resizeState?.rafId != null) {
        window.cancelAnimationFrame(resizeState.rafId);
      }
      resizeState?.transitionTargets.forEach((element) => {
        element.style.removeProperty("transition-duration");
      });
      resizeState?.wrapper.removeAttribute("data-sidebar-resizing");
      resizeState?.sidebarRoot.removeAttribute("data-resize-retreating");
      resizeState?.wrapper.style.removeProperty("--sidebar-effective-width");
      resizeState?.gap.style.removeProperty("width");
      resizeState?.container.style.removeProperty("transform");
      document.body.removeAttribute("data-sidebar-resizing");
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
  }, []);

  return (
    <button
      aria-label={railLabel}
      className={cn(
        isContentSeam
          ? [
              /* Resize hit-area on the chat card seam. The visible divider is the card's
                 border-inline edge (follows the rounded corner); hovering this rail
                 intensifies that border via :has() in index.css — no overlay line here.
                 This rail lives OUTSIDE <Sidebar>, so `in-data-[side]` cursor variants
                 never match (no [data-side] ancestor). Set the cursor directly:
                 `col-resize` (the ↔ handle) when resizing is available — matching the
                 body cursor used during the drag — else `pointer` for the toggle. */
              "absolute inset-y-0 z-[25] hidden w-4 sm:flex",
              canResize ? "cursor-col-resize" : "cursor-pointer",
              side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
            ]
          : [
              /* Legacy: rail anchored to the sidebar shell (right dock, etc.). */
              "-translate-x-1/2 group-data-[side=left]:-right-4 absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-transparent after:transition-colors hover:after:bg-sidebar-border group-data-[side=right]:left-0 sm:flex [[data-collapsible=offcanvas][data-state=collapsed]_&]:pointer-events-none",
              "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
              "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
              "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
              "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
              "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
            ],
        className,
      )}
      data-sidebar="rail"
      data-placement={placement}
      data-slot="sidebar-rail"
      onClick={handleClick}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={railRef}
      tabIndex={-1}
      title={railTitle}
      type="button"
      {...props}
    />
  );
}

function SidebarInset({
  className,
  children,
  surfaceClassName,
  ...props
}: React.ComponentProps<"main"> & {
  surfaceClassName?: string;
}) {
  return (
    <main
      className={cn(
        // Keep caller layout classes on the outer shell so route-level height and
        // overflow constraints still apply after the inner-surface refactor.
        "relative flex min-h-0 min-w-0 w-full flex-1 flex-col bg-transparent",
        "md:peer-data-[variant=sidebar]:peer-data-[side=left]:peer-data-[state=expanded]:-ms-[var(--sidebar-width)]",
        "md:peer-data-[variant=sidebar]:peer-data-[side=left]:peer-data-[state=expanded]:w-[calc(100%+var(--sidebar-width))]",
        "md:peer-data-[variant=sidebar]:peer-data-[side=left]:peer-data-[state=expanded]:ps-[var(--sidebar-width)]",
        "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2 md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm/5",
        className,
      )}
      data-slot="sidebar-inset"
      {...props}
    >
      {/* Inner surface lives inside the content-box so rounded corners
          and bg are visible even when padding offsets the sidebar area. */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col text-inherit",
          surfaceClassName ?? "bg-background",
        )}
        data-slot="sidebar-inset-surface"
      >
        {children}
      </div>
    </main>
  );
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn("h-8 w-full bg-background shadow-none", className)}
      data-sidebar="input"
      data-slot="sidebar-input"
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2", className)}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2", className)}
      data-sidebar="footer"
      data-slot="sidebar-footer"
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ScrollArea hideScrollbars scrollFade className="h-auto min-h-0 flex-1">
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-2 group-data-[collapsible=icon]:overflow-hidden",
          className,
        )}
        data-sidebar="content"
        data-slot="sidebar-content"
        {...props}
      />
    </ScrollArea>
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    />
  );
}

function SidebarGroupLabel({ className, render, ...props }: useRender.ComponentProps<"div">) {
  const defaultProps = {
    className: cn(
      "flex h-8 shrink-0 items-center rounded-lg px-2 font-medium text-sidebar-foreground text-xs outline-hidden ring-ring/60 transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-1 [&>svg]:size-4 [&>svg]:shrink-0",
      "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
      className,
    ),
    "data-sidebar": "group-label",
    "data-slot": "sidebar-group-label",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps(defaultProps, props),
    render,
  });
}

function SidebarGroupAction({ className, render, ...props }: useRender.ComponentProps<"button">) {
  const defaultProps = {
    className: cn(
      "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-lg p-0 text-sidebar-foreground outline-hidden ring-ring/60 transition-transform hover:bg-[var(--sidebar-accent)] focus-visible:ring-1 [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0",
      // Increases the hit area of the button on mobile.
      "after:-inset-2 after:absolute md:after:hidden",
      "group-data-[collapsible=icon]:hidden",
      className,
    ),
    "data-sidebar": "group-action",
    "data-slot": "sidebar-group-action",
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps(defaultProps, props),
    render,
  });
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full text-sm", className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-item relative", className)}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xl p-2 text-left text-sm outline-hidden ring-ring/60 transition-[width,height,padding] hover:bg-[var(--sidebar-accent)] focus-visible:ring-1 active:bg-[var(--sidebar-accent-active)] active:text-[var(--sidebar-accent-foreground)] disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pe-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-[var(--sidebar-accent-active)] data-[active=true]:text-[var(--sidebar-accent-foreground)] data-[state=open]:hover:bg-[var(--sidebar-accent)] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-8 text-sm",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
        sm: "h-7 text-xs",
      },
      variant: {
        default: "hover:bg-[var(--sidebar-accent)]",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-[var(--sidebar-accent)] hover:shadow-[0_0_0_1px_var(--sidebar-border)]",
      },
    },
  },
);

function SidebarMenuButton({
  isActive: isActiveProp,
  variant: variantProp,
  size: sizeProp,
  tooltip,
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & {
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipPopup>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const isActive = isActiveProp ?? false;
  // `variant`/`size` come from cva's VariantProps, whose types admit an explicit
  // `null` (meaning "use the cva defaultVariants"). Only `undefined` may fall back
  // here, so `??` would not preserve behavior.
  const variant = variantProp === undefined ? "default" : variantProp;
  const size = sizeProp === undefined ? "default" : sizeProp;
  const { isMobile, state } = useSidebar();

  const defaultProps = {
    className: cn(sidebarMenuButtonVariants({ size, variant }), className),
    "data-active": isActive,
    "data-sidebar": "menu-button",
    "data-size": size,
    "data-slot": "sidebar-menu-button",
  };

  const buttonProps = mergeProps<"button">(defaultProps, props);

  const buttonElement = useRender({
    defaultTagName: "button",
    props: buttonProps,
    render,
  });

  if (!tooltip) {
    return buttonElement;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger render={buttonElement as React.ReactElement<Record<string, unknown>>} />
      <TooltipPopup
        align="center"
        hidden={state !== "collapsed" || isMobile}
        side="right"
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  showOnHover: showOnHoverProp,
  render,
  ...props
}: useRender.ComponentProps<"button"> & {
  showOnHover?: boolean;
}) {
  const showOnHover = showOnHoverProp ?? false;
  const defaultProps = {
    className: cn(
      "sidebar-icon-button absolute top-1.5 right-1 flex aspect-square w-5 cursor-pointer p-0 text-sidebar-foreground outline-hidden ring-ring/60 transition-transform [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0",
      // Increases the hit area of the button on mobile.
      "after:-inset-2 after:absolute md:after:hidden",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      showOnHover &&
        "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-[var(--sidebar-accent-foreground)] md:opacity-0",
      className,
    ),
    "data-sidebar": "menu-action",
    "data-slot": "sidebar-menu-action",
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-lg px-1 font-medium text-sidebar-foreground text-xs tabular-nums",
        "peer-data-[active=true]/menu-button:text-[var(--sidebar-accent-foreground)]",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon: showIconProp,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  const showIcon = showIconProp ?? false;
  // Random width between 50 to 90%, chosen once per mount so the bar doesn't
  // jitter on re-renders (lazy state init keeps the impure call out of render).
  const [width] = React.useState(() => `${Math.floor(Math.random() * 40) + 50}%`);

  return (
    <div
      className={cn("flex h-8 items-center gap-2 rounded-lg px-2", className)}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-lg" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-sub-item relative", className)}
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  size: sizeProp,
  isActive: isActiveProp,
  className,
  render,
  ...props
}: useRender.ComponentProps<"a"> & {
  size?: "sm" | "md";
  isActive?: boolean;
}) {
  const size = sizeProp ?? "md";
  const isActive = isActiveProp ?? false;
  const defaultProps = {
    className: cn(
      "-translate-x-px flex h-7 min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-2 text-sidebar-foreground outline-hidden ring-ring/60 hover:bg-[var(--sidebar-accent)] focus-visible:ring-1 active:bg-[var(--sidebar-accent-active)] active:text-[var(--sidebar-accent-foreground)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0",
      "data-[active=true]:bg-[var(--sidebar-accent-active)] data-[active=true]:text-[var(--sidebar-accent-foreground)]",
      size === "sm" && "text-xs",
      size === "md" && "text-sm",
      "group-data-[collapsible=icon]:hidden",
      className,
    ),
    "data-active": isActive,
    "data-sidebar": "menu-sub-button",
    "data-size": size,
    "data-slot": "sidebar-menu-sub-button",
  };

  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(defaultProps, props),
    render,
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeaderTrigger,
  SidebarHeader,
  SidebarInput,
  SidebarInstanceProvider,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SIDEBAR_OFFCANVAS_MOTION_CLASS,
  SIDEBAR_OFFCANVAS_MOTION_SUPPRESSED_CLASS,
  useSidebar,
};

export type { SidebarResizableOptions };

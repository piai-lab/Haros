import type { WsCompatibilityError } from "@omnimind/contracts";
import {
  Outlet,
  createRootRouteWithContext,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { type QueryClient, useQuery } from "@tanstack/react-query";

import { APP_DISPLAY_NAME, APP_VERSION } from "../branding";
import { DesktopWindowControls } from "../components/DesktopWindowControls";
import { AppSnapCoordinator } from "../components/AppSnapCoordinator";
import { AppSnapWelcomeDialog } from "../components/AppSnapWelcomeDialog";
import { FeedbackDialog } from "../components/FeedbackDialog";
import ShortcutsDialog from "../components/ShortcutsDialog";
import { shouldRenderTerminalWorkspace } from "../components/ChatView.logic";
import { Button, dialogActionButtonClassName } from "../components/ui/button";
import { AnchoredToastProvider, ToastProvider } from "../components/ui/toast";
import { useGitProgressToastPreview } from "../components/useGitProgressToastPreview";
import { useFeatureFlags } from "../featureFlags";
import { useFocusedChatContext } from "../focusedChatContext";
import { useFeedbackDialogStore } from "../feedbackDialogStore";
import type { FeedbackThreadContext } from "../feedback";
import { isTerminalFocused } from "../lib/terminalFocus";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { readNativeApi } from "../nativeApi";
import { selectThreadTerminalState, useTerminalStateStore } from "../terminalStateStore";
import {
  addWsCompatibilityIssueListener,
  readLatestWsCompatibilityIssue,
} from "../wsTransportEvents";
import { TaskCompletionNotifications } from "../notifications/taskCompletion";
import { ProductCompletionNotifications } from "../notifications/productCompletion";
import { useAppDensity } from "../hooks/useAppDensity";
import { useAppTypography } from "../hooks/useAppTypography";
import { useSyncDesktopTopBarTrafficLightGutterZoom } from "../hooks/useDesktopTopBarGutter";
import { useTheme } from "../hooks/useTheme";
import { useNativeFontSmoothing } from "../hooks/useNativeFontSmoothing";
import { resolveWorkbenchLocale } from "../i18n/workbenchCopy";
import { ProductProjectionCoordinator } from "../productProjectionCoordinator";
import { SystemHealthCoordinator } from "../components/system-health/SystemHealthCoordinator";

 export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootRouteView,
  errorComponent: RootRouteErrorView,
  head: () => ({
    meta: [{ name: "title", content: APP_DISPLAY_NAME }],
  }),
});

function RootRouteView() {
  useAppTypography();
  useAppDensity();
  useNativeFontSmoothing();
  useSyncDesktopTopBarTrafficLightGutterZoom();
  useTheme();
  useLayoutEffect(() => {
    document.documentElement.lang = resolveWorkbenchLocale(globalThis.navigator?.language);
  }, []);
  const [compatibilityIssue, setCompatibilityIssue] = useState<WsCompatibilityError | null>(() =>
    readLatestWsCompatibilityIssue(),
  );
  useEffect(
    () =>
      addWsCompatibilityIssueListener(setCompatibilityIssue, {
        replayCurrent: true,
      }),
    [],
  );

  // Single mount point for the Windows caption buttons. The cluster is pinned to the
  // window's top-right corner (frameless Windows shell) and renders nothing on macOS,
  // Linux, or the web build, so it is safe to mount unconditionally here — including on
  // the pre-backend "connecting" screen, so the window stays closable before the
  // renderer connects. Top bars reserve space for it via
  // useDesktopTopBarWindowControlsGutterClassName().
  //
  // MUST render LAST: Electron builds the OS drag region by walking elements with
  // `-webkit-app-region` in DOM order, unioning `drag` rects and subtracting `no-drag`
  // rects in sequence. The route headers are full-width `drag-region`s that extend under
  // this cluster, so the cluster's `no-drag` rect has to be subtracted AFTER those drag
  // rects are added — otherwise the OS reclaims the corner as title-bar caption and
  // swallows the click as a window drag (the buttons render but do nothing). Rendering
  // it last in document order guarantees that subtraction wins. (z above dialogs/toasts
  // so it also stays clickable while a modal is open.)
  const desktopWindowControls = <DesktopWindowControls className="fixed top-0 right-0 z-[250]" />;

  if (compatibilityIssue) {
    return (
      <>
        <TransportCompatibilityView issue={compatibilityIssue} />
        {desktopWindowControls}
      </>
    );
  }

  if (!readNativeApi()) {
    return (
      <>
        <div className="flex h-screen flex-col bg-background text-foreground">
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Connecting to {APP_DISPLAY_NAME} server...
            </p>
          </div>
        </div>
        {desktopWindowControls}
      </>
    );
  }

  return (
    <>
      <ToastProvider position="top-center">
        <AnchoredToastProvider>
          <GitProgressToastPreviewDev />
          <ProductProjectionCoordinator />
          <SystemHealthCoordinator />
          <GlobalShortcutsDialog />
          <GlobalFeedbackDialog />
          <ProductCompletionNotifications />
          <TaskCompletionNotifications />
          <AppSnapWelcomeDialog />
          <AppSnapCoordinator />
          <Outlet />
        </AnchoredToastProvider>
      </ToastProvider>
      {desktopWindowControls}
    </>
  );
}

function TransportCompatibilityView({ issue }: { issue: WsCompatibilityError }) {
  const title =
    issue.action === "update-client"
      ? "This OmniMind client needs an update."
      : issue.action === "update-server"
        ? "The OmniMind server needs an update."
        : "OmniMind needs to reconnect with a matching build.";
  const guidance =
    issue.action === "update-client"
      ? "Update or reload this client, then reconnect."
      : issue.action === "update-server"
        ? "Update or restart the server, then reload this client."
        : "Reload the app. If this repeats, restart OmniMind so the client and server use matching builds.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(44rem_16rem_at_top,color-mix(in_srgb,var(--color-amber-500)_16%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--background)_90%,var(--color-black))_0%,var(--background)_55%)]" />
      </div>
      <section className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-8">
        <p className="text-[11px] font-semibold text-muted-foreground">{APP_DISPLAY_NAME}</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{issue.message}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guidance}</p>
        <p className="mt-4 text-xs text-muted-foreground/80">
          Client {APP_VERSION} · Server {issue.serverBuild}
        </p>
        <div className="mt-5">
          <Button
            size="sm"
            className={dialogActionButtonClassName}
            onClick={() => window.location.reload()}
          >
            Reload app
          </Button>
        </div>
      </section>
    </div>
  );
}

function GitProgressToastPreviewDev() {
  const featureFlags = useFeatureFlags();
  const enabled = import.meta.env.DEV && featureFlags["pin-git-progress-toast-preview"];
  useGitProgressToastPreview(enabled);
  return null;
}

 function GlobalShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const { focusedThreadId, activeProject } = useFocusedChatContext();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const keybindings = serverConfigQuery.data?.keybindings ?? [];
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const activeThreadTerminalState = useTerminalStateStore((state) =>
    focusedThreadId
      ? selectThreadTerminalState(state.terminalStateByThreadId, focusedThreadId)
      : null,
  );
  const terminalOpen = activeThreadTerminalState?.terminalOpen ?? false;
  const terminalWorkspaceOpen = shouldRenderTerminalWorkspace({
    presentationMode: activeThreadTerminalState?.presentationMode ?? "drawer",
    terminalOpen,
  });

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action === "show-shortcuts") {
        setOpen(true);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <ShortcutsDialog
      open={open}
      onOpenChange={setOpen}
      keybindings={keybindings}
      projectScripts={activeProject?.kind === "project" ? activeProject.scripts : []}
      platform={platform}
      context={{
        terminalFocus: isTerminalFocused(),
        terminalOpen,
        terminalWorkspaceOpen,
      }}
    />
  );
}

function GlobalFeedbackDialog() {
  const { activeProject, activeThread } = useFocusedChatContext();
  const isOpen = useFeedbackDialogStore((state) => state.isOpen);
  const requestedContext = useFeedbackDialogStore((state) => state.context);
  const setOpen = useFeedbackDialogStore((state) => state.setOpen);
  const context: FeedbackThreadContext = requestedContext ?? {
    provider: activeThread?.modelSelection?.provider ?? null,
    model: activeThread?.modelSelection?.model ?? null,
    projectKind: activeProject?.kind ?? null,
    environmentMode: activeThread?.envMode ?? null,
    runtimeMode: activeThread?.runtimeMode ?? null,
    interactionMode: activeThread?.interactionMode ?? null,
    sessionStatus: activeThread?.session?.status ?? null,
    latestTurnState: activeThread?.latestTurn?.state ?? null,
    messageCount: activeThread?.messages.length ?? 0,
    activityCount: activeThread?.activities.length ?? 0,
    hasPendingApproval: activeThread?.hasPendingApprovals === true,
    hasPendingUserInput: activeThread?.hasPendingUserInput === true,
    hasThreadError: Boolean(activeThread?.error),
  };

  return <FeedbackDialog open={isOpen} context={context} onOpenChange={setOpen} />;
}

function RootRouteErrorView({ error, reset }: ErrorComponentProps) {
  const message = errorMessage(error);
  const details = errorDetails(error);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(44rem_16rem_at_top,color-mix(in_srgb,var(--color-red-500)_16%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--background)_90%,var(--color-black))_0%,var(--background)_55%)]" />
      </div>

      <section className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-8">
        <p className="text-[11px] font-semibold text-muted-foreground">{APP_DISPLAY_NAME}</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Something went wrong.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" className={dialogActionButtonClassName} onClick={() => reset()}>
            Try again
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={dialogActionButtonClassName}
            onClick={() => window.location.reload()}
          >
            Reload app
          </Button>
        </div>

        <details className="group mt-5 overflow-hidden rounded-lg border border-border/70 bg-background/55">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="group-open:hidden">Show error details</span>
            <span className="hidden group-open:inline">Hide error details</span>
          </summary>
          <pre className="max-h-56 overflow-auto border-t border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground/85">
            {details}
          </pre>
        </details>
      </section>
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "An unexpected router error occurred.";
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return "No additional error details are available.";
  }
}

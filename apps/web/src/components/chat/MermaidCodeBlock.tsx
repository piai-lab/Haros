// FILE: MermaidCodeBlock.tsx
// Purpose: Projects settled canonical assistant Mermaid fences into isolated reading UI.
// Layer: Web chat presentation internals

import type { EngineWebSurfaceThemeSnapshot, MessageId } from "@harnessos/contracts";
import { Maximize2, MinusIcon, PanelExpandIcon, PlusIcon, RotateCcwIcon } from "~/lib/icons";
import type { CSSProperties, RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import type { CodeFenceInfo } from "../../lib/codeFence";
import {
  MERMAID_MAX_DIAGRAMS_PER_MESSAGE,
  type MermaidPresentationResult,
  getLatestReadyMermaidPresentation,
  preflightMermaidSource,
  renderMermaidPresentation,
} from "../../lib/mermaidPresentation";
import { Dialog, DialogHeader, DialogPopup, DialogTitle, DialogTrigger } from "../ui/dialog";
import { IconButton } from "../ui/icon-button";
import { Spinner } from "../ui/spinner";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";

type MermaidReadyPresentation = Extract<MermaidPresentationResult, { kind: "ready" }>;
const MERMAID_DIALOG_DEFAULT_MIN_ZOOM = 0.02;
const MERMAID_DIALOG_MAX_ZOOM = 4;

function MermaidDiagramFrame({
  presentation,
  title,
  className,
  style,
}: {
  presentation: MermaidReadyPresentation;
  title: string;
  className: string;
  style?: CSSProperties;
}) {
  return (
    <iframe
      className={className}
      title={title}
      srcDoc={presentation.srcDoc}
      sandbox=""
      referrerPolicy="no-referrer"
      style={{ pointerEvents: "none", ...style }}
    />
  );
}

function MermaidExpandDialog({ presentation }: { presentation: MermaidReadyPresentation }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "manual">("fit");
  const [fitReady, setFitReady] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const measureFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const horizontalRoom = Math.max(1, viewport.clientWidth - 32);
    const verticalRoom = Math.max(1, viewport.clientHeight - 32);
    return Math.max(
      Number.EPSILON,
      Math.min(
        MERMAID_DIALOG_MAX_ZOOM,
        horizontalRoom / presentation.width,
        verticalRoom / presentation.height,
      ),
    );
  }, [presentation.height, presentation.width]);

  const fit = useCallback(() => {
    const nextFitZoom = measureFitZoom();
    if (nextFitZoom === null) return;
    setFitZoom(nextFitZoom);
    setZoom(nextFitZoom);
    setZoomMode("fit");
    setFitReady(true);
  }, [measureFitZoom]);

  useLayoutEffect(() => {
    if (!open) return;
    let frame = requestAnimationFrame(() => {
      const nextFitZoom = measureFitZoom();
      if (nextFitZoom === null) return;
      setFitZoom(nextFitZoom);
      if (zoomMode === "fit") setZoom(nextFitZoom);
      setFitReady(true);
    });
    const viewport = viewportRef.current;
    const observer =
      viewport && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              const nextFitZoom = measureFitZoom();
              if (nextFitZoom === null) return;
              setFitZoom(nextFitZoom);
              if (zoomMode === "fit") setZoom(nextFitZoom);
              setFitReady(true);
            });
          })
        : null;
    if (viewport) observer?.observe(viewport);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [measureFitZoom, open, zoomMode]);

  const minimumZoom = Math.min(MERMAID_DIALOG_DEFAULT_MIN_ZOOM, fitZoom);
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setZoomMode("fit");
      setFitReady(false);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <IconButton
            className="chat-markdown-codeblock__action"
            title={t("markdown.diagram.expand")}
            label={t("markdown.diagram.expand")}
            size="icon-xs"
            variant="ghost"
          >
            <PanelExpandIcon className="size-3" />
          </IconButton>
        }
      />
      <DialogPopup className="h-[92vh] w-[94vw] max-w-none" bottomStickOnMobile={false}>
        <DialogHeader className="pe-12">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <DialogTitle className="truncate">{t("markdown.diagram.title")}</DialogTitle>
            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton label={t("markdown.diagram.fit")} onClick={fit} variant="ghost">
                <Maximize2 className="size-4" />
              </IconButton>
              <IconButton
                label={t("markdown.diagram.zoomOut")}
                onClick={() => {
                  setZoomMode("manual");
                  setZoom((value) => Math.max(minimumZoom, value / 1.25));
                }}
                variant="ghost"
              >
                <MinusIcon className="size-4" />
              </IconButton>
              <IconButton
                label={t("markdown.diagram.zoomIn")}
                onClick={() => {
                  setZoomMode("manual");
                  setZoom((value) => Math.min(MERMAID_DIALOG_MAX_ZOOM, value * 1.25));
                }}
                variant="ghost"
              >
                <PlusIcon className="size-4" />
              </IconButton>
              <IconButton
                label={t("markdown.diagram.resetZoom")}
                onClick={() => {
                  setZoomMode("manual");
                  setZoom(1);
                }}
                variant="ghost"
              >
                <RotateCcwIcon className="size-4" />
              </IconButton>
            </div>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 px-3 pb-3">
          <div
            ref={viewportRef}
            className="h-full min-h-0 w-full overflow-auto rounded-xl border border-border/60 bg-background"
            data-mermaid-dialog-viewport
          >
            <div className="grid min-h-full min-w-full place-items-center p-4">
              <MermaidDiagramFrame
                presentation={presentation}
                title={t("markdown.diagram.title")}
                className="block shrink-0 border-0 bg-transparent"
                style={{
                  width: `${presentation.width * zoom}px`,
                  height: `${presentation.height * zoom}px`,
                  visibility: fitReady ? "visible" : "hidden",
                }}
              />
            </div>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

function useNearTranscriptViewport(elementRef: RefObject<HTMLDivElement | null>): boolean {
  const [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry?.isIntersecting === true),
      { root: null, rootMargin: "100% 0px 100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef]);
  return nearViewport;
}

function waitForMermaidPresentationIdle(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    let idleHandle: number | null = null;
    let finished = false;
    let quiet = false;
    let idle = false;

    const cleanup = () => {
      if (quietTimer !== null) clearTimeout(quietTimer);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      for (const event of ["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "keydown"])
        window.removeEventListener(event, schedule, true);
      document.removeEventListener("visibilitychange", schedule);
      signal.removeEventListener("abort", abort);
    };
    const finish = () => {
      if (finished || !quiet || !idle) return;
      finished = true;
      cleanup();
      resolve();
    };
    const abort = () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new DOMException("Mermaid presentation was superseded", "AbortError"));
    };
    const requestIdle = () => {
      if (document.visibilityState !== "visible") return;
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(
          (deadline) => {
            idleHandle = null;
            if (deadline.didTimeout) {
              requestIdle();
              return;
            }
            idle = true;
            finish();
          },
          { timeout: 250 },
        );
      } else {
        idleHandle = globalThis.setTimeout(() => {
          idleHandle = null;
          idle = true;
          finish();
        }, 0) as unknown as number;
      }
    };
    function schedule() {
      if (quietTimer !== null) clearTimeout(quietTimer);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
        idleHandle = null;
      }
      quiet = false;
      idle = false;
      quietTimer = setTimeout(() => {
        quietTimer = null;
        quiet = true;
        finish();
      }, 250);
      requestIdle();
    }

    if (signal.aborted) {
      abort();
      return;
    }
    for (const event of ["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "keydown"])
      window.addEventListener(event, schedule, true);
    document.addEventListener("visibilitychange", schedule);
    signal.addEventListener("abort", abort, { once: true });
    schedule();
  });
}

interface MermaidCodeBlockProps {
  readonly code: string;
  readonly fence: CodeFenceInfo;
  readonly messageId: MessageId;
  readonly ordinal: number;
  readonly theme: Readonly<EngineWebSurfaceThemeSnapshot>;
  readonly isStreaming?: boolean;
}

function MermaidPendingCodeBlock({
  code,
  fence,
  presentationId,
}: Pick<MermaidCodeBlockProps, "code" | "fence"> & { readonly presentationId: string }) {
  const { t } = useI18n();
  return (
    <div className="chat-markdown-mermaid-breakout" data-mermaid-state="pending">
      <MarkdownCodeBlock
        code={code}
        fence={fence}
        copyEnabled={false}
        presentationId={presentationId}
        variant="diagram"
        wrapControl={false}
      >
        <div className="chat-markdown-mermaid__pending" role="status">
          <Spinner
            aria-hidden="true"
            className="size-4 motion-reduce:animate-none"
            role="presentation"
          />
          <span>{t("markdown.diagram.rendering")}</span>
        </div>
      </MarkdownCodeBlock>
    </div>
  );
}

function MermaidSettledCodeBlock({
  code,
  fence,
  messageId,
  ordinal,
  theme,
}: MermaidCodeBlockProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const presentationId = `${messageId}:${ordinal}`;
  const nearViewport = useNearTranscriptViewport(containerRef);
  const preflight = useMemo(() => preflightMermaidSource(code), [code]);
  const [presentation, setPresentation] = useState<{
    source: string;
    themeKey: string;
    result: MermaidPresentationResult;
  } | null>(() => {
    const latest = getLatestReadyMermaidPresentation(presentationId, code);
    return latest ? { source: code, themeKey: latest.themeKey, result: latest.result } : null;
  });
  const [retryNonce, setRetryNonce] = useState(0);
  const themeKey = useMemo(() => JSON.stringify(theme), [theme]);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const canRender =
    ordinal <= MERMAID_MAX_DIAGRAMS_PER_MESSAGE &&
    preflight.ok &&
    nearViewport &&
    !(
      presentation?.source === code &&
      presentation.themeKey === themeKey &&
      presentation.result.kind === "ready"
    );

  useEffect(() => {
    if (!canRender) return;
    const controller = new AbortController();
    const settledAt = performance.now();
    void waitForMermaidPresentationIdle(controller.signal)
      .then(() => {
        performance.mark("harnessos:mermaid-queued");
        return renderMermaidPresentation({
          source: code,
          theme: themeRef.current,
          signal: controller.signal,
          bypassFailureCache: retryNonce > 0,
          ownerId: presentationId,
          ownerThemeKey: themeKey,
        });
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          performance.measure("harnessos:mermaid-settled-to-ready", {
            start: settledAt,
            end: performance.now(),
          });
          setPresentation((previous) =>
            result.kind === "fallback" &&
            previous?.source === code &&
            previous.result.kind === "ready"
              ? previous
              : { source: code, themeKey, result },
          );
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPresentation((previous) =>
            previous?.source === code && previous.result.kind === "ready"
              ? previous
              : {
                  source: code,
                  themeKey,
                  result: { kind: "fallback", reason: "invalid", retryable: true },
                },
          );
        }
      });
    return () => controller.abort();
  }, [canRender, code, presentationId, retryNonce, themeKey]);

  const currentResult = presentation?.source === code ? presentation.result : null;
  const ready = currentResult?.kind === "ready" ? currentResult : null;
  const actions = ready ? <MermaidExpandDialog presentation={ready} /> : null;
  let policyFailure: MermaidPresentationResult | null = null;
  if (ordinal > MERMAID_MAX_DIAGRAMS_PER_MESSAGE) {
    policyFailure = { kind: "fallback", reason: "budget", retryable: false };
  } else if (!preflight.ok) {
    policyFailure = { kind: "fallback", reason: preflight.reason, retryable: false };
  }
  const failed = currentResult?.kind === "fallback" ? currentResult : policyFailure;
  const state = ready ? "ready" : failed ? "failed" : "pending";
  const preferredWidth = ready
    ? ({ "--mermaid-preferred-inline-size": `${ready.width + 24}px` } as CSSProperties)
    : undefined;

  return (
    <div
      ref={containerRef}
      className="chat-markdown-mermaid-breakout"
      data-mermaid-state={state}
      style={preferredWidth}
    >
      <MarkdownCodeBlock
        code={code}
        fence={fence}
        beforeCopyActions={actions}
        copyEnabled={state !== "pending"}
        copyLabel={t("markdown.diagram.copySource")}
        wrapControl={false}
        presentationId={presentationId}
        variant="diagram"
      >
        {ready ? (
          <div className="chat-markdown-mermaid" aria-label={t("markdown.diagram.title")}>
            <MermaidDiagramFrame
              presentation={ready}
              title={t("markdown.diagram.title")}
              className="chat-markdown-mermaid__frame"
              style={{
                width: `${ready.width}px`,
                height: "auto",
                aspectRatio: `${ready.width} / ${ready.height}`,
              }}
            />
          </div>
        ) : failed ? (
          <div className="chat-markdown-mermaid__fallback" role="status">
            <span>{t("markdown.diagram.renderFailed")}</span>
            {failed.retryable ? (
              <button type="button" onClick={() => setRetryNonce((value) => value + 1)}>
                {t("common.retry")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="chat-markdown-mermaid__pending" role="status">
            <Spinner
              aria-hidden="true"
              className="size-4 motion-reduce:animate-none"
              role="presentation"
            />
            <span>{t("markdown.diagram.rendering")}</span>
          </div>
        )}
      </MarkdownCodeBlock>
    </div>
  );
}

export function MermaidCodeBlock(props: MermaidCodeBlockProps) {
  const presentationId = `${props.messageId}:${props.ordinal}`;
  if (props.isStreaming) {
    return (
      <MermaidPendingCodeBlock
        code={props.code}
        fence={props.fence}
        presentationId={presentationId}
      />
    );
  }
  return <MermaidSettledCodeBlock {...props} />;
}

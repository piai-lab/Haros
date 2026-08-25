// FILE: MermaidCodeBlock.tsx
// Purpose: Projects settled canonical assistant Mermaid fences into isolated reading UI.
// Layer: Web chat presentation internals

import type { EngineWebSurfaceThemeSnapshot, MessageId } from "@omnimind/contracts";
import {
  CodeIcon,
  EyeOpenIcon,
  Maximize2,
  MinusIcon,
  PanelExpandIcon,
  PlusIcon,
  RotateCcwIcon,
} from "~/lib/icons";
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
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";

type MermaidReadyPresentation = Extract<MermaidPresentationResult, { kind: "ready" }>;
const MERMAID_DIALOG_MIN_ZOOM = 0.02;
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
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const horizontalRoom = Math.max(1, viewport.clientWidth - 32);
    const verticalRoom = Math.max(1, viewport.clientHeight - 32);
    setZoom(
      Math.max(
        MERMAID_DIALOG_MIN_ZOOM,
        Math.min(
          MERMAID_DIALOG_MAX_ZOOM,
          horizontalRoom / presentation.width,
          verticalRoom / presentation.height,
        ),
      ),
    );
  }, [presentation.height, presentation.width]);

  useLayoutEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
  }, [fit, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogPopup
        className="h-[min(88vh,64rem)] max-w-[min(94vw,80rem)]"
        bottomStickOnMobile={false}
      >
        <DialogHeader className="pe-12">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <DialogTitle className="truncate">{t("markdown.diagram.title")}</DialogTitle>
            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton label={t("markdown.diagram.fit")} onClick={fit} variant="ghost">
                <Maximize2 className="size-4" />
              </IconButton>
              <IconButton
                label={t("markdown.diagram.zoomOut")}
                onClick={() => setZoom((value) => Math.max(MERMAID_DIALOG_MIN_ZOOM, value / 1.25))}
                variant="ghost"
              >
                <MinusIcon className="size-4" />
              </IconButton>
              <IconButton
                label={t("markdown.diagram.zoomIn")}
                onClick={() => setZoom((value) => Math.min(MERMAID_DIALOG_MAX_ZOOM, value * 1.25))}
                variant="ghost"
              >
                <PlusIcon className="size-4" />
              </IconButton>
              <IconButton
                label={t("markdown.diagram.resetZoom")}
                onClick={() => setZoom(1)}
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

export function MermaidCodeBlock({
  code,
  fence,
  messageId,
  ordinal,
  theme,
}: {
  code: string;
  fence: CodeFenceInfo;
  messageId: MessageId;
  ordinal: number;
  theme: Readonly<EngineWebSurfaceThemeSnapshot>;
}) {
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
  const [modeOverride, setModeOverride] = useState<"source" | "diagram" | null>(null);
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
    setModeOverride(null);
  }, [code]);

  useEffect(() => {
    if (!canRender) return;
    const controller = new AbortController();
    const settledAt = performance.now();
    void waitForMermaidPresentationIdle(controller.signal)
      .then(() => {
        performance.mark("omnimind:mermaid-queued");
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
          performance.measure("omnimind:mermaid-settled-to-ready", {
            start: settledAt,
            end: performance.now(),
          });
          setPresentation({ source: code, themeKey, result });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPresentation({
            source: code,
            themeKey,
            result: { kind: "fallback", reason: "invalid", retryable: true },
          });
        }
      });
    return () => controller.abort();
  }, [canRender, code, presentationId, retryNonce, themeKey]);

  const currentResult = presentation?.source === code ? presentation.result : null;
  const ready = currentResult?.kind === "ready" ? currentResult : null;
  const showDiagram =
    ready?.inline === true && (modeOverride === "diagram" || modeOverride === null);
  const actions = ready ? (
    <>
      {ready.inline ? (
        <IconButton
          className="chat-markdown-codeblock__action"
          onClick={() => setModeOverride(showDiagram ? "source" : "diagram")}
          title={showDiagram ? t("markdown.diagram.showSource") : t("markdown.diagram.showDiagram")}
          label={showDiagram ? t("markdown.diagram.showSource") : t("markdown.diagram.showDiagram")}
          size="icon-xs"
          variant="ghost"
        >
          {showDiagram ? <CodeIcon className="size-3" /> : <EyeOpenIcon className="size-3" />}
        </IconButton>
      ) : null}
      <MermaidExpandDialog presentation={ready} />
    </>
  ) : null;
  const failed = currentResult?.kind === "fallback" && currentResult.retryable;

  return (
    <div ref={containerRef}>
      <MarkdownCodeBlock
        code={code}
        fence={fence}
        beforeCopyActions={actions}
        wrapControl={false}
        wrapped={!showDiagram}
        presentationId={presentationId}
      >
        {showDiagram && ready ? (
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
        ) : (
          <>
            <pre>
              <code>{code}</code>
            </pre>
            {failed ? (
              <div className="chat-markdown-mermaid__fallback" role="status">
                <span>{t("markdown.diagram.renderFailed")}</span>
                <button type="button" onClick={() => setRetryNonce((value) => value + 1)}>
                  {t("common.retry")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </MarkdownCodeBlock>
    </div>
  );
}

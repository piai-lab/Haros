// FILE: TranscriptSelectionAction.tsx
// Purpose: Renders the floating toolbar for assistant transcript selections.
// Layer: Chat transcript interaction UI

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircleIcon, PencilIcon, TextWrapIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { ELEVATED_HOVER_SURFACE_CLASS_NAME } from "~/surfaceStyles";
import { useI18n } from "../../i18n";

interface TranscriptSelectionActionProps {
  anchorX: number;
  selectionTop: number;
  selectionBottom: number;
  placement: "top" | "bottom";
  // Highlight/underline only make sense for transcript text; read-only code
  // surfaces (file preview, diff view) omit them and get an add-only toolbar.
  onHighlight?: (() => void) | undefined;
  onUnderline?: (() => void) | undefined;
  onAddToChat: () => void;
}

function TranscriptSelectionToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "pointer-events-auto inline-flex h-8 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium text-[var(--color-text-foreground)]",
        ELEVATED_HOVER_SURFACE_CLASS_NAME,
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function TranscriptSelectionAction(props: TranscriptSelectionActionProps) {
  const { t } = useI18n();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [measuredPosition, setMeasuredPosition] = useState<{
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) {
      return;
    }
    const { width, height } = toolbar.getBoundingClientRect();
    const selectionTop = props.selectionTop;
    const selectionBottom = props.selectionBottom;
    const availableAbove = selectionTop;
    const availableBelow = window.innerHeight - selectionBottom;
    const placement =
      availableAbove >= height + 8 || availableAbove >= availableBelow ? "top" : "bottom";
    const nextLeft = Math.max(
      8,
      Math.min(Math.round(props.anchorX - width / 2), Math.max(window.innerWidth - width - 8, 8)),
    );
    const unclampedTop = placement === "top" ? selectionTop - height - 8 : selectionBottom + 8;
    const nextTop = Math.max(
      8,
      Math.min(Math.round(unclampedTop), Math.max(window.innerHeight - height - 8, 8)),
    );
    setMeasuredPosition((currentPosition) =>
      currentPosition?.left === nextLeft &&
      currentPosition.top === nextTop &&
      currentPosition.placement === placement
        ? currentPosition
        : { left: nextLeft, top: nextTop, placement },
    );
  }, [
    props.anchorX,
    props.onHighlight,
    props.onUnderline,
    props.placement,
    props.selectionBottom,
    props.selectionTop,
    t,
  ]);
  return (
    <div
      data-transcript-selection-action="true"
      className="pointer-events-none fixed z-50"
      style={{
        left: measuredPosition?.left ?? props.anchorX,
        top: measuredPosition?.top ?? props.selectionTop,
        visibility: measuredPosition === null ? "hidden" : "visible",
      }}
      role="toolbar"
      aria-label={t("selection.actions")}
    >
      <div
        ref={toolbarRef}
        className={cn(
          "pointer-events-auto inline-flex max-w-[calc(100vw-1rem)] items-center gap-0.5 rounded-full border border-[color:var(--color-border)] bg-[var(--color-background-elevated-primary-opaque)] p-0.5 shadow-xl backdrop-blur-xl transition-transform duration-150 hover:scale-[1.01]",
          (measuredPosition?.placement ?? props.placement) === "top"
            ? "origin-bottom"
            : "origin-top",
        )}
      >
        {props.onHighlight ? (
          <TranscriptSelectionToolbarButton
            label={t("selection.highlight")}
            onClick={props.onHighlight}
          >
            <PencilIcon className="size-3.5 shrink-0" />
          </TranscriptSelectionToolbarButton>
        ) : null}
        {props.onUnderline ? (
          <TranscriptSelectionToolbarButton
            label={t("selection.underline")}
            onClick={props.onUnderline}
          >
            <TextWrapIcon className="size-3.5 shrink-0" />
          </TranscriptSelectionToolbarButton>
        ) : null}
        <TranscriptSelectionToolbarButton
          label={t("selection.addToChat")}
          onClick={props.onAddToChat}
        >
          <MessageCircleIcon className="size-3.5 shrink-0" />
        </TranscriptSelectionToolbarButton>
      </div>
    </div>
  );
}

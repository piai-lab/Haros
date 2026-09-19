// FILE: TranscriptSelectionAction.tsx
// Purpose: Renders the floating toolbar for assistant transcript selections.
// Layer: Chat transcript interaction UI

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircleIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { ELEVATED_HOVER_SURFACE_CLASS_NAME } from "~/surfaceStyles";
import { useI18n } from "../../i18n";

interface TranscriptSelectionActionProps {
  anchorX: number;
  selectionTop: number;
  selectionBottom: number;
  placement: "top" | "bottom";
  onAddToChat: () => void;
  onAddToSide?: (() => void) | undefined;
  onAddToNewChat?: (() => void) | undefined;
  sideDisabled?: boolean | undefined;
  disabled?: boolean | undefined;
}

function TranscriptSelectionToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "pointer-events-auto inline-flex h-8 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium text-[var(--color-text-foreground)] disabled:pointer-events-none disabled:opacity-40",
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
  }, [props.anchorX, props.placement, props.selectionBottom, props.selectionTop, t]);
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
        <TranscriptSelectionToolbarButton
          label={t("selection.addToChat")}
          onClick={props.onAddToChat}
          disabled={props.disabled}
        >
          <MessageCircleIcon className="size-3.5 shrink-0" />
        </TranscriptSelectionToolbarButton>
        {props.onAddToSide ? (
          <TranscriptSelectionToolbarButton
            label={t("selection.addToSide")}
            onClick={props.onAddToSide}
            disabled={props.disabled || props.sideDisabled}
          >
            <MessageCircleIcon className="size-3.5 shrink-0" />
          </TranscriptSelectionToolbarButton>
        ) : null}
        {props.onAddToNewChat ? (
          <TranscriptSelectionToolbarButton
            label={t("selection.addToNewChat")}
            onClick={props.onAddToNewChat}
            disabled={props.disabled}
          >
            <MessageCircleIcon className="size-3.5 shrink-0" />
          </TranscriptSelectionToolbarButton>
        ) : null}
      </div>
    </div>
  );
}

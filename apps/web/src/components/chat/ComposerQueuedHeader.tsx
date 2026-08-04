// FILE: ComposerQueuedHeader.tsx
// Purpose: Queued follow-up rows shown as a panel that merges into the top of the
// composer input (each with Steer / Delete / Edit actions). Rounded only on top with
// a flat, borderless bottom that fuses flush onto the composer; spans the full composer
// width while the composer below keeps its own full rounding.
// Layer: Chat composer UI
// Exports: ComposerQueuedHeader

import type { QueuedComposerTurn } from "../../composerDraftStore";
import type { WorkbenchCopy } from "../../i18n/workbenchCopy";
import { ListTodoIcon, PencilIcon, PlayIcon, SteerIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import ChatMarkdown from "../ChatMarkdown";
import {
  ComposerStackedPanelRow,
  ComposerStackedPanelRowMain,
} from "./ComposerStackedPanelContent";
import {
  COMPOSER_STACKED_PANEL_DIVIDER_CLASS_NAME,
  ComposerStackedPanel,
} from "./ComposerStackedPanel";
import {
  COMPOSER_STACKED_PANEL_ICON_CLASS_NAME,
  COMPOSER_STACKED_PANEL_PREVIEW_MARKDOWN_CLASS_NAME,
} from "./composerStackedPanelStyles";
import { QueuedComposerActions } from "./QueuedComposerActions";

function firstNonEmptyLine(value: string): string {
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0)
      ?.trim() ?? ""
  );
}

// Queue previews use the shared markdown renderer for inline chips/emphasis, but
// must stay a single composer row even when the queued prompt is a heading, list,
// or fenced code block.
type QueuePreviewCopy = Pick<WorkbenchCopy, "queueQueuedFollowUp" | "queueCodeBlock">;

export function compactQueuedComposerPreviewMarkdown(
  value: string,
  copy: QueuePreviewCopy,
): string {
  const firstLine = firstNonEmptyLine(value);
  if (firstLine.length === 0) {
    return copy.queueQueuedFollowUp;
  }
  if (/^(?:`{3,}|~{3,})/.test(firstLine)) {
    return copy.queueCodeBlock;
  }
  const normalized = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^- \[[ xX]\]\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
  return normalized.length > 0 ? normalized : copy.queueQueuedFollowUp;
}

interface ComposerQueuedHeaderProps {
  queuedTurns: QueuedComposerTurn[];
  primaryAction: {
    kind: "steer" | "move-next" | "run-next";
    disabled?: boolean;
    onSelect: (queuedTurn: QueuedComposerTurn) => void;
    onMoveNext?: (queuedTurn: QueuedComposerTurn) => void;
  };
  onRemove: (queuedTurnId: string) => void;
  onEdit: (queuedTurn: QueuedComposerTurn) => void;
  editingTurnId?: string | null;
  onCancelEdit?: () => void;
  copy: WorkbenchCopy;
  /** Workspace root used to resolve local file links/mentions inside the parsed preview. */
  cwd?: string | undefined;
  attachedToPrevious?: boolean;
}

export const ComposerQueuedHeader = function ComposerQueuedHeader({
  queuedTurns,
  primaryAction,
  onRemove,
  onEdit,
  editingTurnId,
  onCancelEdit,
  copy,
  cwd,
  attachedToPrevious: attachedToPreviousProp,
}: ComposerQueuedHeaderProps) {
  const attachedToPrevious = attachedToPreviousProp ?? false;
  if (queuedTurns.length === 0) {
    return null;
  }

  return (
    <ComposerStackedPanel attachedToPrevious={attachedToPrevious} className="flex flex-col">
      {queuedTurns.map((queuedTurn, queuedTurnIndex) => {
        const editing = editingTurnId === queuedTurn.id;
        const rowPrimaryAction =
          primaryAction.kind === "run-next" &&
          queuedTurnIndex > 0 &&
          primaryAction.onMoveNext
            ? {
                kind: "move-next" as const,
                onSelect: primaryAction.onMoveNext,
              }
            : primaryAction;
        const LeadingIcon = editing
          ? PencilIcon
          : rowPrimaryAction.kind === "run-next"
            ? PlayIcon
          : rowPrimaryAction.kind === "move-next"
            ? ListTodoIcon
            : SteerIcon;
        return (
          <ComposerStackedPanelRow
            key={queuedTurn.id}
            compact
            data-testid="queued-follow-up-row"
            data-queue-item-kind={rowPrimaryAction.kind}
            data-queue-editing={editing ? "true" : undefined}
            className={cn(queuedTurnIndex > 0 && COMPOSER_STACKED_PANEL_DIVIDER_CLASS_NAME)}
          >
            <ComposerStackedPanelRowMain>
              <LeadingIcon className={COMPOSER_STACKED_PANEL_ICON_CLASS_NAME} />
              <ChatMarkdown
                text={compactQueuedComposerPreviewMarkdown(queuedTurn.previewText, copy)}
                cwd={cwd}
                isStreaming={false}
                className={COMPOSER_STACKED_PANEL_PREVIEW_MARKDOWN_CLASS_NAME}
              />
              {editing ? (
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {copy.queueEditing}
                </span>
              ) : null}
            </ComposerStackedPanelRowMain>
            <QueuedComposerActions
              queuedTurn={queuedTurn}
              primaryAction={rowPrimaryAction}
              primaryActionDisabled={
                rowPrimaryAction.disabled ||
                (rowPrimaryAction.kind === "move-next" && queuedTurnIndex === 0) ||
                (rowPrimaryAction.kind === "run-next" && queuedTurnIndex !== 0)
              }
              editing={editing}
              onCancelEdit={onCancelEdit}
              onRemove={onRemove}
              onEdit={onEdit}
              copy={copy}
            />
          </ComposerStackedPanelRow>
        );
      })}
    </ComposerStackedPanel>
  );
};

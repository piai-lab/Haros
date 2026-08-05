// FILE: QueuedComposerActions.tsx
// Purpose: Inline action cluster (Steer / Delete / Menu) rendered on each queued
// composer row. Used in both the compact and expanded composer layouts so the
// action chrome stays in lockstep across surfaces.
// Layer: Chat composer UI primitive
// Exports: QueuedComposerActions

import { ArrowUpIcon, EllipsisIcon, PlayIcon, SteerIcon, Trash2, XIcon } from "~/lib/icons";

import type { WorkbenchQueuedTurn } from "../../productReadModel";
import type { WorkbenchCopy } from "../../i18n/workbenchCopy";

import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { Menu, MenuItem, MenuTrigger } from "../ui/menu";
import { ComposerPickerMenuPopup } from "./ComposerPickerMenuPopup";

type QueuedComposerActionsProps = {
  queuedTurn: WorkbenchQueuedTurn;
  primaryAction: {
    kind: "steer" | "move-next" | "run-next";
    disabled?: boolean;
    onSelect: (queuedTurn: WorkbenchQueuedTurn) => void;
  };
  primaryActionDisabled?: boolean;
  editing?: boolean;
  onCancelEdit?: (() => void) | undefined;
  onRemove: (queuedTurnId: string) => void;
  onEdit: (queuedTurn: WorkbenchQueuedTurn) => void;
  copy: Pick<
    WorkbenchCopy,
    | "queueSteer"
    | "queueMoveNext"
    | "queueRunNext"
    | "queueCancelEdit"
    | "queueDeleteFollowUp"
    | "queueActions"
    | "queueEditPrompt"
    | "queueDeletePrompt"
  >;
};

function QueuedComposerActions({
  queuedTurn,
  primaryAction,
  primaryActionDisabled,
  editing,
  onCancelEdit,
  onRemove,
  onEdit,
  copy,
}: QueuedComposerActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-0">
      <Button
        variant="subtle"
        size="chip"
        disabled={!editing && primaryActionDisabled}
        data-queue-action={editing ? "cancel-edit" : primaryAction.kind}
        onClick={() => {
          if (editing) {
            onCancelEdit?.();
            return;
          }
          void primaryAction.onSelect(queuedTurn);
        }}
      >
        {editing ? (
          <XIcon />
        ) : primaryAction.kind === "steer" ? (
          <SteerIcon />
        ) : primaryAction.kind === "run-next" ? (
          <PlayIcon />
        ) : (
          <ArrowUpIcon />
        )}
        <span>
          {editing
            ? copy.queueCancelEdit
            : primaryAction.kind === "steer"
              ? copy.queueSteer
              : primaryAction.kind === "run-next"
                ? copy.queueRunNext
                : copy.queueMoveNext}
        </span>
      </Button>
      <IconButton
        variant="ghost"
        size="icon-chip"
        label={copy.queueDeleteFollowUp}
        onClick={() => onRemove(queuedTurn.id)}
      >
        <Trash2 />
      </IconButton>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-chip"
              aria-label={copy.queueActions}
              className="[&_svg]:mx-0"
            />
          }
        >
          <EllipsisIcon />
        </MenuTrigger>
        <ComposerPickerMenuPopup align="end" side="top" sideOffset={6}>
          {editing ? null : (
            <MenuItem onClick={() => onEdit(queuedTurn)}>{copy.queueEditPrompt}</MenuItem>
          )}
          <MenuItem onClick={() => onRemove(queuedTurn.id)}>{copy.queueDeletePrompt}</MenuItem>
        </ComposerPickerMenuPopup>
      </Menu>
    </div>
  );
}

export { QueuedComposerActions };

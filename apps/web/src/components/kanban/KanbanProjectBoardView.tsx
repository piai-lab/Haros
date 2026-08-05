// FILE: KanbanProjectBoardView.tsx
// Purpose: Full 3-column board for one project — drag a Draft card onto In Progress to
//          dispatch its prompt, or reorder drafts; other moves are derived-only.
// Layer: UI component (owns the board DndContext)
// Exports: KanbanProjectBoardView

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRef, useState } from "react";

import { toastManager } from "~/components/ui/toast";
import { dispatchKanbanDraftCard } from "../../lib/kanbanDispatch";
import { KanbanCardView } from "./KanbanCardView";
import { KanbanColumn, parseKanbanColumnDropId } from "./KanbanColumn";
import {
  reorderDraftCardIds,
  type KanbanCard,
  type KanbanColumnKey,
  type KanbanProjectBoard,
} from "./kanban.logic";
import { useKanbanUiStore } from "../../kanbanUiStore";
import { useKanbanDraftDispatchAdmission } from "./useKanbanDraftDispatchAdmission";

function resolveDropColumn(board: KanbanProjectBoard, overId: string): KanbanColumnKey | null {
  const columnDrop = parseKanbanColumnDropId(overId);
  if (columnDrop) {
    return columnDrop.projectId === board.projectId ? columnDrop.column : null;
  }
  // Sortable draft cards are the only non-column droppables on this board.
  return board.draft.some((card) => card.cardId === overId) ? "draft" : null;
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return closestCorners(args);
};

export function KanbanProjectBoardView({
  board,
  onOpenCard,
  onCardContextMenu,
  onNewTask,
  nowMs,
}: {
  board: KanbanProjectBoard;
  onOpenCard: (card: KanbanCard) => void;
  onCardContextMenu?: ((card: KanbanCard, event: React.MouseEvent) => void) | undefined;
  onNewTask: () => void;
  nowMs?: number;
}) {
  const resolveDispatchAdmission = useKanbanDraftDispatchAdmission();
  const setDraftOrder = useKanbanUiStore((state) => state.setDraftOrder);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  // A completed drag still emits a click on the source card; swallow exactly that one
  // so dropping a card never also opens its chat.
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const handleOpenCard = (card: KanbanCard) => {
    if (suppressClickRef.current) {
      return;
    }
    onOpenCard(card);
  };

  const handleDispatchDrop = async (card: KanbanCard) => {
    const runtimeAvailability = resolveDispatchAdmission(card);
    if (!runtimeAvailability.usable) {
      toastManager.add({
        type: "error",
        title: runtimeAvailability.reason,
      });
      return;
    }
    const result = await dispatchKanbanDraftCard({ card });
    if (result.kind === "dispatched") {
      toastManager.add({
        type: "success",
        title: "Draft sent",
        description: card.title,
      });
      return;
    }
    if (result.kind === "open-thread") {
      const description =
        result.reason === "empty"
          ? "Nothing to send yet — write the prompt in the composer."
          : result.reason === "worktree-pending"
            ? "Open the chat to create the worktree with the normal send flow."
            : result.reason === "unsupported-execution-options"
              ? "Open the chat to send skills or structured mentions."
              : "Open the chat to continue this task.";
      toastManager.add({
        type: "info",
        title: "Finish this draft in the chat",
        description,
      });
      onOpenCard(card);
      return;
    }
    if (result.kind === "pending") {
      toastManager.add({
        type: "info",
        title: "Draft is waiting for admission",
        description: "It remains in Draft until the Host confirms the run was accepted.",
      });
      return;
    }
    if (result.kind === "delivery-unknown") {
      toastManager.add({
        type: "warning",
        title: "Delivery could not be confirmed",
        description: "The draft was not resent. Reconciliation must confirm what happened.",
      });
      return;
    }
    if (result.kind === "rejected") {
      toastManager.add({
        type: "error",
        title: "Draft was rejected",
        description: result.message,
      });
      return;
    }
    if (result.kind === "draft-changed") {
      toastManager.add({
        type: "info",
        title: "Edited draft was not sent",
        description: "The earlier transfer was only rechecked; your current draft was preserved.",
      });
      return;
    }
    if (result.kind === "unavailable") {
      toastManager.add({
        type: "error",
        title: "Not connected",
        description: "Reconnect to the server before sending drafts.",
      });
      return;
    }
    toastManager.add({
      type: "error",
      title: "Could not send draft",
      description: result.message,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = board.draft.find((candidate) => candidate.cardId === event.active.id) ?? null;
    setActiveCard(card);
    suppressClickRef.current = true;
  };

  const releaseClickSuppression = () => {
    // The trailing click (if any) fires synchronously after dragend; release on the
    // next tick so regular clicks keep working when the drop happens off-card.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    releaseClickSuppression();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    releaseClickSuppression();
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeId = String(active.id);
    const card = board.draft.find((candidate) => candidate.cardId === activeId);
    if (!card) {
      return;
    }
    const overId = String(over.id);
    const targetColumn = resolveDropColumn(board, overId);
    if (targetColumn === "draft") {
      const visibleCardIds = board.draft.map((draftCard) => draftCard.cardId);
      const nextOrder =
        overId === activeId
          ? null
          : board.draft.some((draftCard) => draftCard.cardId === overId)
            ? reorderDraftCardIds(visibleCardIds, activeId, overId)
            : // Dropped on the column body itself: move to the end.
              reorderDraftCardIds(visibleCardIds, activeId, visibleCardIds.at(-1) ?? activeId);
      if (nextOrder) {
        setDraftOrder(board.projectId, nextOrder);
      }
      return;
    }
    if (targetColumn === "inProgress") {
      // A drag that started before the board re-derived could re-drop a card whose
      // dispatch is still settling; a second drop must not queue another turn.
      if (useKanbanUiStore.getState().optimisticDispatchByThreadId[card.threadId]) {
        return;
      }
      void handleDispatchDrop(card);
      return;
    }
    if (targetColumn === "done") {
      toastManager.add({
        type: "info",
        title: "Done is derived automatically",
        description: "Cards move here when their runs complete.",
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto px-4 pb-4">
        <KanbanColumn
          projectId={board.projectId}
          columnKey="draft"
          cards={board.draft}
          onOpenCard={handleOpenCard}
          onCardContextMenu={onCardContextMenu}
          sortable
          droppable
          activeCard={activeCard}
          onNewCard={onNewTask}
          {...(nowMs !== undefined ? { nowMs } : {})}
        />
        <KanbanColumn
          projectId={board.projectId}
          columnKey="inProgress"
          cards={board.inProgress}
          onOpenCard={handleOpenCard}
          onCardContextMenu={onCardContextMenu}
          droppable
          activeCard={activeCard}
          {...(nowMs !== undefined ? { nowMs } : {})}
        />
        <KanbanColumn
          projectId={board.projectId}
          columnKey="done"
          cards={board.done}
          onOpenCard={handleOpenCard}
          onCardContextMenu={onCardContextMenu}
          droppable
          activeCard={activeCard}
          {...(nowMs !== undefined ? { nowMs } : {})}
        />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <KanbanCardView card={activeCard} isOverlay {...(nowMs !== undefined ? { nowMs } : {})} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

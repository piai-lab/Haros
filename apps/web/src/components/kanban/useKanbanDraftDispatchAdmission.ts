// FILE: useKanbanDraftDispatchAdmission.ts
// Purpose: Gates a board drag with current Product selection and Host catalog facts.
// Layer: Kanban Product UI hook
// Exports: useKanbanDraftDispatchAdmission

import { useComposerDraftStore } from "../../composerDraftStore";
import { useProductStore } from "../../store/productStore";
import type { KanbanCard } from "./kanban.logic";
import { resolveKanbanRuntimeAvailability } from "./kanbanRuntimeSelection";

export function useKanbanDraftDispatchAdmission() {
  const runtimeCatalog = useProductStore((state) => state.runtimeCatalog);

  return (card: KanbanCard) => {
    const requestedSelection =
      useComposerDraftStore.getState().draftThreadsByThreadId[card.threadId]
        ?.requestedSelection ?? null;
    return resolveKanbanRuntimeAvailability(runtimeCatalog, requestedSelection);
  };
}

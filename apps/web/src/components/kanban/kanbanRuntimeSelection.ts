// FILE: kanbanRuntimeSelection.ts
// Purpose: Resolves Kanban execution selections against the sanitized Host catalog.
// Layer: Kanban Product presentation logic (no Provider discovery or status authority)
// Exports: exact catalog selection and availability helpers

import type {
  ProductRequestedSelection,
  ProductRuntimeCatalog,
  ProductRuntimeModel,
} from "@omnimind/contracts";

export type KanbanProductSelection = ProductRequestedSelection;

export type KanbanRuntimeAvailability =
  | {
      readonly usable: true;
      readonly model: ProductRuntimeModel;
      readonly thinking: string | null;
    }
  | { readonly usable: false; readonly reason: string };

/**
 * Host ids currently use `provider/modelId`. Require that identity to agree with
 * all three sanitized catalog fields so a duplicate donor slug can never select
 * a different Host provider.
 */
export function isExactKanbanRuntimeModelIdentity(model: ProductRuntimeModel): boolean {
  return model.id === `${model.provider}/${model.modelId}`;
}

export function resolveKanbanRuntimeModel(
  catalog: ProductRuntimeCatalog,
  selection: ProductRequestedSelection,
): ProductRuntimeModel | undefined {
  if (selection.state !== "selected" || selection.runtimeChoice.kind !== "product-model")
    return undefined;
  const runtimeChoice = selection.runtimeChoice;
  const engine = catalog.engines.find((candidate) => candidate.engineId === selection.engineId);
  if (engine?.modelSelection.kind !== "product-model") return undefined;
  return engine.modelSelection.models.find(
    (candidate) =>
      candidate.id === runtimeChoice.runtimeModelId &&
      isExactKanbanRuntimeModelIdentity(candidate),
  );
}

export function resolveKanbanRuntimeAvailability(
  catalog: ProductRuntimeCatalog | null,
  selection: ProductRequestedSelection | null,
): KanbanRuntimeAvailability {
  if (!selection) {
    return { usable: false, reason: "Select a Host model before starting this task." };
  }
  if (selection.state === "unavailable") {
    return { usable: false, reason: "Select an available Host model before starting this task." };
  }
  if (!catalog) {
    return { usable: false, reason: "Host runtime catalog is unavailable." };
  }
  if (selection.runtimeChoice.kind !== "product-model") {
    return { usable: false, reason: "This Engine resolves its model when sending." };
  }
  const model = resolveKanbanRuntimeModel(catalog, selection);
  if (!model) {
    return { usable: false, reason: "The selected Host model is no longer available." };
  }
  if (!model.available) {
    return { usable: false, reason: `${model.name} is unavailable in the Host.` };
  }
  if (model.auth !== "configured") {
    return {
      usable: false,
      reason:
        model.auth === "missing"
          ? `${model.name} needs Host authentication.`
          : `${model.name} is unavailable in the Host.`,
    };
  }
  const thinking = selection.runtimeChoice.thinking;
  if (
    thinking !== null &&
    !model.thinkingLevels.includes(thinking as (typeof model.thinkingLevels)[number])
  ) {
    return {
      usable: false,
      reason: `The selected thinking level is no longer available for ${model.name}.`,
    };
  }
  return { usable: true, model, thinking };
}

// FILE: KanbanRuntimePicker.tsx
// Purpose: Presents only sanitized Host runtime models for a new Kanban task.
// Layer: Kanban Product presenter
// Exports: KanbanRuntimePicker

import type {
  ProductRuntimeCatalog,
  ProductRuntimeModel,
} from "@omnimind/contracts";
import { useId } from "react";

import { ComposerPickerSelectPopup } from "~/components/chat/ComposerPickerMenuPopup";
import { Select, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { localizeWorkbenchTraitLabel } from "~/i18n/workbenchCopy";
import {
  type KanbanProductSelection,
  isExactKanbanRuntimeModelIdentity,
  resolveKanbanRuntimeModel,
} from "./kanbanRuntimeSelection";

const DEFAULT_THINKING_VALUE = "__host_default__";

function runtimeUnavailableLabel(model: ProductRuntimeModel): string {
  if (!isExactKanbanRuntimeModelIdentity(model)) return "invalid identity";
  if (!model.available || model.auth === "unavailable") return "unavailable";
  if (model.auth === "missing") return "authentication required";
  return "";
}

function canSelectRuntimeModel(model: ProductRuntimeModel): boolean {
  return isExactKanbanRuntimeModelIdentity(model) && model.available && model.auth === "configured";
}

export function KanbanRuntimePicker(props: {
  readonly catalog: ProductRuntimeCatalog | null;
  readonly selection: KanbanProductSelection | null;
  readonly onSelectionChange: (
    model: ProductRuntimeModel,
    thinking: string | null,
  ) => void;
}) {
  const modelLabelId = useId();
  const thinkingLabelId = useId();
  const selected =
    props.catalog && props.selection
      ? resolveKanbanRuntimeModel(props.catalog, props.selection)
      : undefined;
  const selectedThinking =
    props.selection?.state === "selected" ? props.selection.thinking : null;
  const catalogThinking = selectedThinking;
  const selectedIsUsable = selected ? canSelectRuntimeModel(selected) : false;
  const selectedLabel = selected
    ? `${selected.name} · ${selected.provider}`
    : props.selection
      ? `${props.selection.state === "selected" ? props.selection.runtimeModelId : (props.selection.requestedRuntimeModelId ?? "Unknown model")} · unavailable`
      : props.catalog
        ? "Select Host model"
        : "Host models unavailable";

  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="kanban-runtime-picker">
      <span className="sr-only" id={modelLabelId}>
        Host model
      </span>
      <Select
        value={selected?.id ?? ""}
        onValueChange={(value) => {
          if (typeof value !== "string" || !props.catalog) return;
          const model = props.catalog.models.find(
            (candidate) => candidate.id === value && canSelectRuntimeModel(candidate),
          );
          if (!model) return;
          const thinking =
            catalogThinking !== null &&
            model.thinkingLevels.some((level) => level === catalogThinking)
              ? catalogThinking
              : null;
          props.onSelectionChange(model, thinking);
        }}
      >
        <SelectTrigger
          size="sm"
          className="max-w-64"
          aria-labelledby={modelLabelId}
          disabled={!props.catalog}
        >
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <ComposerPickerSelectPopup align="start">
          {props.catalog?.models.map((model) => {
            const unavailable = runtimeUnavailableLabel(model);
            return (
              <SelectItem key={model.id} value={model.id} disabled={!canSelectRuntimeModel(model)}>
                {model.name} · {model.provider}
                {unavailable ? ` · ${unavailable}` : ""}
              </SelectItem>
            );
          })}
        </ComposerPickerSelectPopup>
      </Select>
      {selected && selectedIsUsable && selected.thinkingLevels.length > 0 ? (
        <>
          <span className="sr-only" id={thinkingLabelId}>
            Thinking level
          </span>
          <Select
            value={
              catalogThinking !== null &&
              selected.thinkingLevels.some((level) => level === catalogThinking)
                ? catalogThinking
                : DEFAULT_THINKING_VALUE
            }
            onValueChange={(value) => {
              if (typeof value !== "string") return;
              const thinking =
                value === DEFAULT_THINKING_VALUE
                  ? null
                  : (selected.thinkingLevels.find((level) => level === value) ?? null);
              props.onSelectionChange(selected, thinking);
            }}
          >
            <SelectTrigger size="sm" aria-labelledby={thinkingLabelId}>
              <SelectValue>
                {selectedThinking === null
                  ? "Default"
                  : localizeWorkbenchTraitLabel(selectedThinking)}
              </SelectValue>
            </SelectTrigger>
            <ComposerPickerSelectPopup align="start">
              <SelectItem value={DEFAULT_THINKING_VALUE}>Default</SelectItem>
              {selected.thinkingLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {localizeWorkbenchTraitLabel(level)}
                </SelectItem>
              ))}
            </ComposerPickerSelectPopup>
          </Select>
        </>
      ) : null}
    </div>
  );
}

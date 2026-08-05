// FILE: ProductRuntimePicker.tsx
// Purpose: Selects an exact Host-reported runtime model and thinking level.

import type {
  ProductRequestedSelection,
  ProductRuntimeCatalog,
  ProductRuntimeModel,
} from "@omnimind/contracts";
import { useId } from "react";

import {
  getWorkbenchCopy,
  localizeWorkbenchTraitLabel,
  type WorkbenchCopy,
} from "../../i18n/workbenchCopy";
import { ComposerPickerSelectPopup } from "../chat/ComposerPickerMenuPopup";
import { Select, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export function isProductRuntimeModelSelectable(model: ProductRuntimeModel): boolean {
  return model.available && model.auth === "configured";
}

/** Keep an explicit Host selection durable across catalog/auth changes. */
export function reconcileProductRuntimeSelection(
  catalog: ProductRuntimeCatalog | null,
  current: ProductRequestedSelection | null,
): ProductRequestedSelection {
  const currentId =
    current?.state === "selected" ? current.runtimeModelId : current?.requestedRuntimeModelId;
  const policy = {
    permissionPolicy: "approval-required" as const,
    enforcement: catalog?.capabilities.enforcement ?? "unverified",
    executionTarget: null,
  };
  if (!catalog) {
    return {
      state: "unavailable",
      reason: "catalog-unavailable",
      requestedRuntimeModelId: currentId ?? null,
      ...policy,
    };
  }

  const requestedModel = currentId
    ? (catalog.models.find((candidate) => candidate.id === currentId) ?? null)
    : null;
  if (currentId && (!requestedModel || !isProductRuntimeModelSelectable(requestedModel))) {
    return {
      state: "unavailable",
      reason: requestedModel?.auth === "missing" ? "auth-missing" : "model-unavailable",
      requestedRuntimeModelId: currentId,
      ...policy,
    };
  }

  const model = requestedModel ?? catalog.models.find(isProductRuntimeModelSelectable) ?? null;
  if (!model) {
    return {
      state: "unavailable",
      reason: "model-not-selected",
      requestedRuntimeModelId: null,
      ...policy,
    };
  }
  const currentThinking = current?.state === "selected" ? current.thinking : null;
  const catalogThinking = currentThinking as (typeof model.thinkingLevels)[number] | null;
  const thinking =
    catalogThinking && model.thinkingLevels.includes(catalogThinking)
      ? catalogThinking
      : model.thinkingLevels.includes("medium")
        ? "medium"
        : (model.thinkingLevels[0] ?? null);
  return {
    state: "selected",
    engineId: catalog.engineId,
    runtimeModelId: model.id,
    thinking,
    packageGeneration: catalog.packageGeneration,
    ...policy,
  };
}

function runtimeUnavailableLabel(model: ProductRuntimeModel, copy: WorkbenchCopy): string {
  if (model.auth === "missing") return "authentication required";
  if (!model.available || model.auth === "unavailable") return copy.executionUnavailableLabel;
  return "";
}

export function ProductRuntimePicker(props: {
  readonly catalog: ProductRuntimeCatalog | null;
  readonly copy?: WorkbenchCopy;
  readonly modelId: string | null;
  readonly thinking: string | null;
  readonly onModelChange: (modelId: string) => void;
  readonly onThinkingChange: (thinking: string) => void;
}) {
  const copy = props.copy ?? getWorkbenchCopy();
  const modelLabelId = useId();
  const thinkingLabelId = useId();
  const selected = props.catalog?.models.find((model) => model.id === props.modelId) ?? null;
  const selectedUnavailableLabel = selected ? runtimeUnavailableLabel(selected, copy) : "";
  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="product-runtime-picker">
      <span className="sr-only" id={modelLabelId}>
        Pi {copy.models}
      </span>
      <Select
        value={selected?.id ?? ""}
        onValueChange={(value) => {
          const model = props.catalog?.models.find((candidate) => candidate.id === value);
          if (model && isProductRuntimeModelSelectable(model)) props.onModelChange(model.id);
        }}
      >
        <SelectTrigger
          size="sm"
          className="max-w-52"
          aria-labelledby={modelLabelId}
          disabled={!props.catalog}
        >
          <SelectValue>
            {selected
              ? `${selected.name}${selectedUnavailableLabel ? ` · ${selectedUnavailableLabel}` : ""}`
              : props.catalog
                ? copy.models
                : copy.executionUnavailableLabel}
          </SelectValue>
        </SelectTrigger>
        <ComposerPickerSelectPopup align="start">
          {props.catalog?.models.map((model) => (
            <SelectItem
              key={model.id}
              value={model.id}
              disabled={!isProductRuntimeModelSelectable(model)}
            >
              {model.name} · {model.provider}
              {runtimeUnavailableLabel(model, copy)
                ? ` · ${runtimeUnavailableLabel(model, copy)}`
                : ""}
            </SelectItem>
          ))}
        </ComposerPickerSelectPopup>
      </Select>
      {selected && isProductRuntimeModelSelectable(selected) && selected.thinkingLevels.length > 0 ? (
        <>
          <span className="sr-only" id={thinkingLabelId}>
            {copy.thinkingLevelLabel}
          </span>
          <Select
            value={
              props.thinking && selected.thinkingLevels.includes(props.thinking as never)
                ? props.thinking
                : selected.thinkingLevels[0]
            }
            onValueChange={(value) => {
              if (typeof value === "string") props.onThinkingChange(value);
            }}
          >
            <SelectTrigger size="sm" aria-labelledby={thinkingLabelId}>
              <SelectValue>
                {localizeWorkbenchTraitLabel(props.thinking ?? selected.thinkingLevels[0] ?? "off")}
              </SelectValue>
            </SelectTrigger>
            <ComposerPickerSelectPopup align="start">
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

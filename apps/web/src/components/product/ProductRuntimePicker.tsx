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

function humanizeProviderSegment(value: string): string {
  return value
    .trim()
    .split(/[-_.\s]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/** Live catalog provenance, with a source-id fallback and no static capability table. */
export function productRuntimeModelProvenanceLabel(model: ProductRuntimeModel): string {
  const liveProvider = model.provider.trim();
  if (liveProvider) return liveProvider;
  const providerSegment = model.id.split("/", 1)[0]?.trim() ?? "";
  return humanizeProviderSegment(providerSegment) || "Unknown source";
}

function productRuntimeModelAccessibleName(model: ProductRuntimeModel): string {
  return `${model.name} — ${productRuntimeModelProvenanceLabel(model)}`;
}

/** Keep an explicit Host selection durable across catalog/auth changes. */
export function reconcileProductRuntimeSelection(
  catalog: ProductRuntimeCatalog | null,
  current: ProductRequestedSelection | null,
): ProductRequestedSelection {
  const currentId =
    current?.state === "selected" && current.runtimeChoice.kind === "product-model"
      ? current.runtimeChoice.runtimeModelId
      : current?.state === "unavailable" && current.requestedRuntimeChoice?.kind === "product-model"
        ? current.requestedRuntimeChoice.runtimeModelId
        : null;
  const requestedEngineId =
    current?.state === "selected" ? current.engineId : current?.requestedEngineId;
  const engine =
    catalog?.engines.find((candidate) => candidate.engineId === requestedEngineId) ??
    catalog?.engines.find((candidate) => candidate.engineId === catalog.defaultEngineId) ??
    null;
  const policy = {
    permissionPolicy: "approval-required" as const,
    executionTarget: null,
  };
  if (!catalog || !engine || engine.availability.state !== "available") {
    return {
      state: "unavailable",
      reason:
        engine?.availability.state === "unavailable"
          ? engine.availability.reason
          : "process-unavailable",
      requestedEngineId: requestedEngineId ?? "pi",
      requestedRuntimeChoice: currentId
        ? { kind: "product-model", runtimeModelId: currentId, thinking: null }
        : null,
      packageGeneration: null,
      ...policy,
    };
  }

  if (engine.modelSelection.kind === "engine-session") {
    return {
      state: "selected",
      engineId: engine.engineId,
      runtimeChoice: { kind: "engine-session-current" },
      packageGeneration: null,
      ...policy,
    };
  }

  const requestedModel = currentId
    ? (engine.modelSelection.models.find((candidate) => candidate.id === currentId) ?? null)
    : null;
  if (currentId && (!requestedModel || !isProductRuntimeModelSelectable(requestedModel))) {
    return {
      state: "unavailable",
      reason: requestedModel?.auth === "missing" ? "auth-required" : "model-unavailable",
      requestedEngineId: engine.engineId,
      requestedRuntimeChoice: { kind: "product-model", runtimeModelId: currentId, thinking: null },
      packageGeneration: catalog.packageGeneration,
      ...policy,
    };
  }

  const model =
    requestedModel ?? engine.modelSelection.models.find(isProductRuntimeModelSelectable) ?? null;
  if (!model) {
    return {
      state: "unavailable",
      reason: "model-not-selected",
      requestedEngineId: engine.engineId,
      requestedRuntimeChoice: null,
      packageGeneration: catalog.packageGeneration,
      ...policy,
    };
  }
  const currentThinking =
    current?.state === "selected" && current.runtimeChoice.kind === "product-model"
      ? current.runtimeChoice.thinking
      : null;
  const catalogThinking = currentThinking as (typeof model.thinkingLevels)[number] | null;
  const thinking =
    catalogThinking && model.thinkingLevels.includes(catalogThinking)
      ? catalogThinking
      : model.thinkingLevels.includes("medium")
        ? "medium"
        : (model.thinkingLevels[0] ?? null);
  return {
    state: "selected",
    engineId: engine.engineId,
    runtimeChoice: { kind: "product-model", runtimeModelId: model.id, thinking },
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
  readonly engineId?: string | null;
  readonly onEngineChange?: (engineId: string) => void;
}) {
  const copy = props.copy ?? getWorkbenchCopy();
  const modelLabelId = useId();
  const thinkingLabelId = useId();
  const selectedEngine =
    props.catalog?.engines.find(
      (engine) => engine.engineId === (props.engineId ?? props.catalog?.defaultEngineId),
    ) ?? null;
  const models =
    selectedEngine?.modelSelection.kind === "product-model"
      ? selectedEngine.modelSelection.models
      : [];
  const selected = models.find((model) => model.id === props.modelId) ?? null;
  const selectedUnavailableLabel = selected ? runtimeUnavailableLabel(selected, copy) : "";
  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="product-runtime-picker">
      <Select
        value={selectedEngine?.engineId ?? ""}
        onValueChange={(value) => {
          if (value) props.onEngineChange?.(value);
        }}
      >
        <SelectTrigger size="sm" aria-label="Engine" disabled={!props.catalog}>
          <SelectValue>{selectedEngine?.displayName ?? "Engine unavailable"}</SelectValue>
        </SelectTrigger>
        <ComposerPickerSelectPopup align="start">
          {props.catalog?.engines.map((engine) => (
            <SelectItem
              key={engine.engineId}
              value={engine.engineId}
              disabled={engine.availability.state !== "available"}
            >
              {engine.displayName}
            </SelectItem>
          ))}
        </ComposerPickerSelectPopup>
      </Select>
      {selectedEngine?.modelSelection.kind === "engine-session" ? (
        <span className="text-xs text-muted-foreground">
          Current Engine model and mode resolve when sending · approval required · enforcement
          unverified
        </span>
      ) : null}
      {selectedEngine?.modelSelection.kind === "product-model" ? (
        <>
          <span className="sr-only" id={modelLabelId}>
            Pi {copy.models}
          </span>
          <Select
            value={selected?.id ?? ""}
            onValueChange={(value) => {
              const model = models.find((candidate) => candidate.id === value);
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
                  ? `${productRuntimeModelAccessibleName(selected)}${selectedUnavailableLabel ? ` · ${selectedUnavailableLabel}` : ""}`
                  : props.catalog
                    ? copy.models
                    : copy.executionUnavailableLabel}
              </SelectValue>
            </SelectTrigger>
            <ComposerPickerSelectPopup align="start">
              {models.map((model) => (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  disabled={!isProductRuntimeModelSelectable(model)}
                >
                  {productRuntimeModelAccessibleName(model)}
                  {runtimeUnavailableLabel(model, copy)
                    ? ` · ${runtimeUnavailableLabel(model, copy)}`
                    : ""}
                </SelectItem>
              ))}
            </ComposerPickerSelectPopup>
          </Select>
          {selected &&
          isProductRuntimeModelSelectable(selected) &&
          selected.thinkingLevels.length > 0 ? (
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
                    {localizeWorkbenchTraitLabel(
                      props.thinking ?? selected.thinkingLevels[0] ?? "off",
                    )}
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
        </>
      ) : null}
    </div>
  );
}

import type { MessageKey } from "~/i18n";
import type { EngineModelCatalogState } from "../../hooks/useEngineModelCatalog";

export function resolveComposerModelFallbackMessageKey(
  catalogState: EngineModelCatalogState,
): MessageKey {
  switch (catalogState) {
    case "checking":
      return "composer.checkingModels";
    case "empty":
      return "composer.noAvailableModel";
    case "error":
      return "composer.modelCatalogUnavailable";
    case "idle":
    case "ready":
    case "stale":
      return "composer.selectModel";
  }
}

import type { MessageKey } from "~/i18n";
import type { ProviderModelCatalogState } from "../../hooks/useProviderModelCatalog";

export function resolveComposerModelFallbackMessageKey(
  catalogState: ProviderModelCatalogState,
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

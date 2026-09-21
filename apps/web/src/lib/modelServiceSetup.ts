import type { EngineKind } from "@harnessos/contracts";
import { engineOpensModelServicesSettings } from "@harnessos/shared/engineMetadata";

import { toastManager } from "~/components/ui/toast";
import type { MessageKey } from "~/i18n";
import type { EngineModelCatalogState } from "~/hooks/useEngineModelCatalog";

export const MODEL_SERVICE_SETUP_INTENTS = ["deepseek-key", "custom-endpoint"] as const;
export type ModelServiceSetupIntent = (typeof MODEL_SERVICE_SETUP_INTENTS)[number];

export function parseModelServiceSetupIntent(value: unknown): ModelServiceSetupIntent | null {
  return typeof value === "string" &&
    (MODEL_SERVICE_SETUP_INTENTS as readonly string[]).includes(value)
    ? (value as ModelServiceSetupIntent)
    : null;
}

export function modelServiceSetupSearch(intent: ModelServiceSetupIntent): {
  readonly section: "models";
  readonly intent: ModelServiceSetupIntent;
} {
  return { section: "models", intent };
}

export function composerNeedsModelServiceSetup(
  engine: EngineKind | null | undefined,
  catalogState?: EngineModelCatalogState,
): boolean {
  if (!engine || !engineOpensModelServicesSettings(engine)) return false;
  return (
    catalogState === undefined ||
    catalogState === "empty" ||
    catalogState === "idle" ||
    catalogState === "error"
  );
}

export function notifyMissingComposerModel(input: {
  readonly engine: EngineKind | null;
  readonly catalogState?: EngineModelCatalogState;
  readonly t: (key: MessageKey) => string;
  readonly onAddDeepSeekKey?: () => void;
}): void {
  const needsSetup = composerNeedsModelServiceSetup(input.engine, input.catalogState);
  toastManager.add({
    type: "warning",
    title: input.t(needsSetup ? "composer.addModelServiceToSend" : "composer.modelRequiredToSend"),
    ...(needsSetup && input.onAddDeepSeekKey
      ? {
          actionProps: {
            children: input.t("composer.openModelServices"),
            onClick: input.onAddDeepSeekKey,
          },
        }
      : {}),
  });
}

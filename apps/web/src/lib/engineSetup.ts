import { ENGINE_KINDS, type EngineKind } from "@harnessos/contracts";
import { engineOpensModelServicesSettings } from "@harnessos/shared/engineMetadata";

import { toastManager } from "~/components/ui/toast";
import type { MessageKey } from "~/i18n";
import { SETTINGS_TARGETS } from "~/settingsSearchMetadata";
import type { EnginePickerAvailabilityState } from "./engineAvailability";

export function parseEngineSetupKind(value: unknown): EngineKind | null {
  return typeof value === "string" && (ENGINE_KINDS as readonly string[]).includes(value)
    ? (value as EngineKind)
    : null;
}

export function engineSetupSearch(engine: EngineKind): {
  readonly section: "engines";
  readonly target: typeof SETTINGS_TARGETS.engineDetails;
  readonly engine: EngineKind;
} {
  return {
    section: "engines",
    target: SETTINGS_TARGETS.engineDetails,
    engine,
  };
}

export function engineSetupActionKey(
  engine: EngineKind,
  state: EnginePickerAvailabilityState,
): MessageKey | null {
  if (engineOpensModelServicesSettings(engine)) return null;
  if (state === "not_installed") return "composer.installEngine";
  if (state === "sign_in") return "composer.signInEngine";
  return null;
}

export function notifyBlockedEngineSend(input: {
  readonly engine: EngineKind;
  readonly title: string;
  readonly t: (key: MessageKey) => string;
  readonly state?: EnginePickerAvailabilityState;
  readonly onOpenEngineSettings?: (engine: EngineKind) => void;
}): void {
  const actionKey = input.state ? engineSetupActionKey(input.engine, input.state) : null;
  toastManager.add({
    type: "error",
    title: input.title,
    ...(actionKey && input.onOpenEngineSettings
      ? {
          actionProps: {
            children: input.t(actionKey),
            onClick: () => input.onOpenEngineSettings?.(input.engine),
          },
        }
      : {}),
  });
}

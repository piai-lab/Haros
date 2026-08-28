// FILE: EnvironmentUsageSection.tsx
// Purpose: "Usage" section of the Environment panel — same menu as the header chip.

import type { EngineKind } from "@harnessos/contracts";

import { EngineUsageMenuPopup, useEngineUsageMenuModel } from "~/components/EngineUsageMenuControl";
import { EngineIcon } from "~/components/EngineIcon";
import { MenuTrigger } from "~/components/ui/menu";
import { useI18n } from "~/i18n";

import {
  ENVIRONMENT_ROW_CLASS_NAME,
  ENVIRONMENT_ROW_ICON_CLASS_NAME,
  EnvironmentLabeledSection,
  EnvironmentRowBody,
  EnvironmentRowChevron,
} from "./EnvironmentRow";

export function EnvironmentUsageSection({ engine }: { engine: EngineKind }) {
  const { t } = useI18n();
  const model = useEngineUsageMenuModel(engine);

  if (!model) {
    return null;
  }

  return (
    <EnvironmentLabeledSection label={t("environment.usage")}>
      <EngineUsageMenuPopup engine={engine} model={model} align="start">
        <MenuTrigger
          render={
            <button
              type="button"
              className={ENVIRONMENT_ROW_CLASS_NAME}
              aria-label={model.menuTitle}
            />
          }
        >
          <EnvironmentRowBody
            icon={
              <EngineIcon
                engine={engine}
                tone="header"
                className={ENVIRONMENT_ROW_ICON_CLASS_NAME}
              />
            }
            label={model.primaryRow.remainingLabel}
            trailing={<EnvironmentRowChevron />}
          />
        </MenuTrigger>
      </EngineUsageMenuPopup>
    </EnvironmentLabeledSection>
  );
}

// FILE: EngineUsageMenuControl.tsx
// Purpose: Shared engine-usage chip/menu used in the chat header and Environment panel.

import type { EngineKind } from "@harnessos/contracts";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { type ReactNode } from "react";

import { useAccountCapacity } from "~/hooks/useAccountCapacity";
import {
  deriveProviderUsageDisplayRows,
  selectPrimaryProviderUsageDisplayRow,
  type EngineUsageDisplayRow,
} from "~/lib/providerUsageDisplay";
import type { OpenUsageUsageLine } from "~/lib/openUsageRateLimits";
import type { EngineRateLimit } from "~/lib/rateLimits";

import { ComposerPickerMenuPopup } from "./chat/ComposerPickerMenuPopup";
import { ChatHeaderButton } from "./chat/chatHeaderControls";
import { EngineIcon } from "./EngineIcon";
import { EngineUsagePanelContent } from "./EngineUsagePanelContent";
import { Menu, MenuTrigger } from "./ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

export interface EngineUsageMenuModel {
  menuTitle: string;
  primaryRow: EngineUsageDisplayRow;
  rateLimits: ReadonlyArray<EngineRateLimit>;
  usageLines: ReadonlyArray<OpenUsageUsageLine>;
  notice: string | undefined;
  isLoading: boolean;
}

export function useEngineUsageMenuModel(engine: EngineKind): EngineUsageMenuModel | null {
  const usageSummary = useAccountCapacity({
    engine,
  });
  const usageRows = deriveProviderUsageDisplayRows(usageSummary.rateLimits);
  const primaryRow = selectPrimaryProviderUsageDisplayRow(usageRows);

  if (!primaryRow) {
    return null;
  }

  return {
    menuTitle: `${ENGINE_DISPLAY_NAMES[engine]} usage`,
    primaryRow,
    rateLimits: usageSummary.rateLimits,
    usageLines: usageSummary.usageLines,
    notice: usageSummary.usageNotice,
    isLoading: usageSummary.isLoading,
  };
}

export function EngineUsageMenuPopup({
  engine,
  model,
  align: alignProp,
  children,
}: {
  engine: EngineKind;
  model: EngineUsageMenuModel;
  align?: "start" | "end";
  children: ReactNode;
}) {
  const align = alignProp ?? "end";
  return (
    <Menu modal={false}>
      {children}
      <ComposerPickerMenuPopup align={align} side="bottom" className="w-64 min-w-64">
        <EngineUsagePanelContent
          engine={engine}
          rateLimits={model.rateLimits}
          usageLines={model.usageLines}
          notice={model.notice}
          isLoading={model.isLoading}
          showUsageLines={false}
          showTitle={false}
          className="px-2 pb-1 pt-1"
        />
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

export function EngineUsageMenuControl({ engine }: { engine: EngineKind }) {
  const model = useEngineUsageMenuModel(engine);

  if (!model) {
    return null;
  }

  return (
    <EngineUsageMenuPopup engine={engine} model={model}>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <ChatHeaderButton
                  type="button"
                  tone="plain"
                  className="gap-1.5 px-2"
                  aria-label={model.menuTitle}
                />
              }
            >
              <EngineIcon engine={engine} tone="header" className="size-3.5 shrink-0" />
              <span className="truncate font-normal">{model.primaryRow.remainingLabel}</span>
            </MenuTrigger>
          }
        />
        <TooltipPopup side="bottom">{model.menuTitle}</TooltipPopup>
      </Tooltip>
    </EngineUsageMenuPopup>
  );
}

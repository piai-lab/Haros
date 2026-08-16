// FILE: AutomationCreatedCard.tsx
// Purpose: Transcript card shown when an automation is created from a thread. Replaces the
//          plain "Created automation: …" tool-call line with a glanceable box that mirrors
//          the automations view: clock glyph, automation name, cadence, and an Open action.
// Layer: Chat transcript UI

import {
  AutomationProposalActions,
  automationProposalListQueryKey,
} from "~/components/automation/AutomationProposalActions";
import { Button } from "~/components/ui/button";
import { ClockIcon } from "~/lib/icons";
import { useI18n } from "~/i18n";
import { ensureNativeApi } from "~/nativeApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function AutomationCreatedCard({
  automationId,
  name,
  cadenceLabel,
  proposalState,
  textFontSizePx,
  metaFontSizePx,
  onOpen,
}: {
  readonly automationId: string;
  readonly name: string;
  readonly cadenceLabel: string;
  readonly proposalState?: "pending" | "accepted" | "dismissed";
  readonly textFontSizePx?: number;
  readonly metaFontSizePx?: number;
  readonly onOpen?: () => void;
}) {
  const { t } = useI18n();
  const [currentProposalState, setCurrentProposalState] = useState(proposalState);
  const proposalListQuery = useQuery({
    queryKey: automationProposalListQueryKey,
    queryFn: () => ensureNativeApi().automation.list({ includeArchived: true }),
    enabled: currentProposalState === "pending",
  });

  useEffect(() => {
    setCurrentProposalState(proposalState);
  }, [proposalState]);

  useEffect(() => {
    const durableState = proposalListQuery.data?.definitions.find(
      (definition) => definition.id === automationId,
    )?.proposalState;
    if (durableState === "accepted" || durableState === "dismissed") {
      setCurrentProposalState(durableState);
    }
  }, [automationId, proposalListQuery.data]);

  const proposalDefinition = proposalListQuery.data?.definitions.find(
    (definition) => definition.id === automationId,
  );

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border-light)] bg-[var(--color-background-elevated-primary)] px-3 py-2.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border-light)] bg-[var(--color-background-elevated-secondary)] text-[var(--color-text-foreground)]">
        <ClockIcon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-medium text-[var(--color-text-foreground)]"
          style={textFontSizePx ? { fontSize: `${textFontSizePx}px` } : undefined}
          title={name}
        >
          {name}
        </p>
        {cadenceLabel || currentProposalState ? (
          <p
            className="truncate text-[var(--color-text-foreground-secondary)]"
            style={metaFontSizePx ? { fontSize: `${metaFontSizePx}px` } : undefined}
          >
            {currentProposalState === "pending" ? `${t("automation.suggested")} · ` : ""}
            {cadenceLabel}
            {currentProposalState === "accepted" ? ` · ${t("automation.accepted")}` : ""}
            {currentProposalState === "dismissed" ? ` · ${t("automation.dismissed")}` : ""}
          </p>
        ) : null}
      </div>
      {currentProposalState === "pending" && proposalDefinition ? (
        <AutomationProposalActions
          automationId={automationId}
          expectedDefinitionRevision={proposalDefinition.definitionRevision}
          onResolved={setCurrentProposalState}
        />
      ) : null}
      {onOpen && currentProposalState !== "pending" ? (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onOpen}>
          {t("common.open")}
        </Button>
      ) : null}
    </div>
  );
}

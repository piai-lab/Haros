import { AutomationId, type AutomationProposalState } from "@harnessos/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { useI18n } from "~/i18n";
import { ensureNativeApi } from "~/nativeApi";

export const automationProposalListQueryKey = ["automation-proposals", "include-archived"] as const;

export function AutomationProposalActions({
  automationId,
  expectedDefinitionRevision,
  onResolved,
}: {
  readonly automationId: string;
  readonly expectedDefinitionRevision: number;
  readonly onResolved?: (resolution: Exclude<AutomationProposalState, "pending">) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const resolutionMutation = useMutation({
    mutationFn: (resolution: Exclude<AutomationProposalState, "pending">) =>
      ensureNativeApi().automation.resolveProposal({
        automationId: AutomationId.makeUnsafe(automationId),
        expectedDefinitionRevision,
        resolution,
      }),
    onSuccess: (result, resolution) => {
      onResolved?.(result.definition.proposalState === "dismissed" ? "dismissed" : resolution);
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
      void queryClient.invalidateQueries({ queryKey: automationProposalListQueryKey });
    },
    onError: async (error) => {
      const isConflict = "code" in error && error.code === "AUTOMATION_DEFINITION_CONFLICT";
      if (isConflict) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["automations"] }),
          queryClient.invalidateQueries({ queryKey: automationProposalListQueryKey }),
        ]);
      }
      toastManager.add({
        type: "error",
        title: t(
          isConflict ? "automation.definitionConflictTitle" : "automation.proposalUpdateFailed",
        ),
        description: isConflict
          ? t("automation.definitionConflict")
          : error instanceof Error
            ? error.message
            : String(error),
      });
    },
  });

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={resolutionMutation.isPending}
        onClick={() => resolutionMutation.mutate("dismissed")}
      >
        {t("automation.dismiss")}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={resolutionMutation.isPending}
        onClick={() => resolutionMutation.mutate("accepted")}
      >
        {t("automation.accept")}
      </Button>
    </div>
  );
}

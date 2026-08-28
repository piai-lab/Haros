// FILE: OmniMindThreadCreationCard.tsx
// Purpose: End-of-turn recap for threads created through the OmniMind MCP harness.
// Layer: Chat transcript UI

import { formatModelDisplayName } from "@harnessos/shared/model";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { memo } from "react";

import type { WorkLogOmniMindThreadCreation } from "../../session-logic";
import { ProviderIcon } from "../ProviderIcon";
import { OmniMindLogo } from "../OmniMindLogo";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n";

export const OmniMindThreadCreationCard = memo(function OmniMindThreadCreationCard({
  creation,
  onOpenThread,
}: {
  readonly creation: WorkLogOmniMindThreadCreation;
  readonly onOpenThread?: (threadId: string) => void;
}) {
  const { t } = useI18n();
  const threadMeta = (thread: WorkLogOmniMindThreadCreation["threads"][number]): string => {
    const model = formatModelDisplayName(thread.model) ?? thread.model;
    const environment = t(
      thread.environment === "worktree"
        ? "threadCreation.environmentWorktree"
        : "threadCreation.environmentLocal",
    );
    return `${ENGINE_DISPLAY_NAMES[thread.provider]} · ${model} · ${environment}`;
  };
  const singleThread = creation.threads.length === 1 ? creation.threads[0] : undefined;
  const title = singleThread
    ? t("threadCreation.singleTitle")
    : t("threadCreation.multipleTitle", { count: creation.createdCount });
  const summary = singleThread
    ? singleThread.title
    : t("threadCreation.multipleSummary", {
        created: creation.createdCount,
        requested: creation.requestedCount,
      });

  return (
    <div
      className="overflow-hidden rounded-[0.65rem] border border-[color:var(--color-border-light)] bg-[var(--color-background-elevated-primary)]"
      data-omnimind-thread-creation-card="true"
    >
      <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-background-elevated-secondary)] text-foreground">
          <OmniMindLogo size={22} aria-label="OmniMind" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-system-ui text-[length:var(--app-font-size-ui-lg,13px)] font-medium text-foreground/95">
            {title}
          </p>
          <p className="truncate font-system-ui text-[length:var(--app-font-size-ui-sm,11px)] text-muted-foreground/65">
            {summary}
          </p>
          {singleThread ? (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[length:var(--app-font-size-ui-xs,10px)] text-muted-foreground/52">
              <ProviderIcon provider={singleThread.provider} className="size-3 shrink-0" />
              <span className="truncate">{threadMeta(singleThread)}</span>
            </div>
          ) : null}
        </div>
        {singleThread && onOpenThread ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onOpenThread(singleThread.threadId)}
          >
            {t("threadCreation.openThread")}
          </Button>
        ) : null}
      </div>

      {!singleThread ? (
        <div className="border-t border-[color:var(--color-border-light)]">
          {creation.threads.map((thread) => (
            <div
              key={thread.threadId}
              className="flex min-w-0 items-center gap-2.5 border-t border-[color:var(--color-border-light)] px-3 py-2 first:border-t-0"
            >
              <ProviderIcon provider={thread.provider} className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-system-ui text-[length:var(--app-font-size-ui,12px)] font-medium text-foreground/90">
                  {thread.title}
                </p>
                <p className="truncate font-system-ui text-[length:var(--app-font-size-ui-xs,10px)] text-muted-foreground/52">
                  {threadMeta(thread)}
                </p>
              </div>
              {onOpenThread ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="shrink-0"
                  onClick={() => onOpenThread(thread.threadId)}
                >
                  {t("common.open")}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});

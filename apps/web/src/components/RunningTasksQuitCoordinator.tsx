import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useI18n } from "~/i18n";
import { useLocalPreferences } from "~/localPreferences";
import { useStore } from "~/store";
import { ThreadRunningSpinner } from "~/components/ThreadRunningSpinner";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogPortal,
  AlertDialogViewport,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { commandDialogPopupClassName } from "~/components/ui/command";
import { cn } from "~/lib/utils";
import type { SidebarThreadSummary } from "~/types";

interface RunningTaskSummary {
  readonly id: string;
  readonly title: string;
}

export function filterEligibleRunningTasks(
  threads: ReadonlyArray<SidebarThreadSummary>,
): ReadonlyArray<RunningTaskSummary> {
  return threads
    .filter((thread) => {
      const status = thread.session?.status;
      const orchestrationStatus = thread.session?.orchestrationStatus;
      return (
        thread.archivedAt == null &&
        thread.parentThreadId == null &&
        thread.gatewayOperationId == null &&
        thread.subagentAgentId == null &&
        !thread.hasPendingApprovals &&
        !thread.hasPendingUserInput &&
        thread.latestTurn?.state === "running" &&
        (orchestrationStatus === "starting" ||
          orchestrationStatus === "running" ||
          status === "connecting" ||
          status === "running")
      );
    })
    .map((thread) => ({ id: thread.id, title: thread.title.trim() }))
    .sort(
      (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
    );
}

function listEligibleRunningTasks(): ReadonlyArray<RunningTaskSummary> {
  return filterEligibleRunningTasks(Object.values(useStore.getState().sidebarThreadSummaryById));
}

export function RunningTasksQuitCoordinator() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<ReadonlyArray<RunningTaskSummary> | null>(null);
  const pendingRequestId = useRef<string | null>(null);

  const settle = useCallback(
    (allow: boolean, resume: boolean) => {
      const requestId = pendingRequestId.current;
      if (!requestId) return;
      pendingRequestId.current = null;
      window.desktopBridge?.replyQuitConfirmation({
        requestId,
        phase: "decision",
        allow,
        resume: allow && resume,
        continuationPrompt: t("quit.continuationPrompt"),
      });
      setTasks(null);
    },
    [t],
  );

  useEffect(() => {
    const subscribe = window.desktopBridge?.onQuitConfirmationRequest;
    const reply = window.desktopBridge?.replyQuitConfirmation;
    if (typeof subscribe !== "function" || typeof reply !== "function") return;
    return subscribe((request) => {
      const running = listEligibleRunningTasks();
      reply({
        requestId: request.requestId,
        phase: "ready",
        runningCount: running.length,
        threads: running,
      });
      if (running.length === 0) return;
      pendingRequestId.current = request.requestId;
      setTasks(running);
    });
  }, []);

  return (
    <RunningTasksQuitDialog tasks={tasks} onCancel={() => settle(false, false)} onQuit={settle} />
  );
}

export function RunningTasksQuitDialog({
  tasks,
  onCancel,
  onQuit,
}: {
  readonly tasks: ReadonlyArray<RunningTaskSummary> | null;
  readonly onCancel: () => void;
  readonly onQuit: (allow: boolean, resume: boolean) => void;
}) {
  const { t } = useI18n();
  const { preferences, updatePreferences } = useLocalPreferences();
  const checkboxId = useId();
  const open = tasks !== null && tasks.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogViewport>
          <AlertDialogPrimitive.Popup
            className={cn(
              commandDialogPopupClassName,
              "w-[520px] max-w-[calc(100vw-2rem)] max-h-full text-[12px] before:shadow-none dark:before:shadow-none",
            )}
          >
            {tasks ? (
              <>
                <div className="relative rounded-t-[calc(var(--radius-2xl)-1px)] border-b border-[color:var(--color-border-light)] bg-[var(--color-background-surface-under)] px-4 pt-3 pb-3.5">
                  <AlertDialogPrimitive.Title className="m-0 text-[14px] font-medium leading-5">
                    {t(tasks.length === 1 ? "quit.runningTitleOne" : "quit.runningTitleMany")}
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="m-0 mt-1 text-[13px] leading-[18px] text-muted-foreground">
                    {t("quit.runningDescription")}
                  </AlertDialogPrimitive.Description>
                  <ul className="m-0 mt-3 flex max-h-[40vh] list-none flex-col gap-2 overflow-y-auto p-0">
                    {tasks.map((task) => (
                      <li key={task.id} className="flex min-w-0 items-center gap-2.5">
                        <ThreadRunningSpinner />
                        <span className="truncate text-[13px] leading-[18px]">
                          {task.title || t("quit.untitledTask")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative flex items-center gap-2 px-3 py-2">
                  <label
                    htmlFor={checkboxId}
                    className="flex min-w-0 cursor-pointer select-none items-center gap-2 px-1 text-[12px] leading-[18px] text-muted-foreground"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={preferences.resumeChatsAfterQuit}
                      onCheckedChange={(checked) =>
                        updatePreferences({
                          resumeChatsAfterQuit: checked === true,
                        })
                      }
                    />
                    <span className="truncate">{t("quit.resumeAutomatically")}</span>
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <AlertDialogClose render={<Button variant="ghost" size="sm" />}>
                      {t("quit.cancel")} <span className="text-[11px] opacity-55">Esc</span>
                    </AlertDialogClose>
                    <Button
                      autoFocus
                      size="sm"
                      onClick={() => onQuit(true, preferences.resumeChatsAfterQuit)}
                    >
                      {t("quit.quit")}{" "}
                      <span aria-hidden className="text-[11px] opacity-55">
                        ↵
                      </span>
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </AlertDialogPrimitive.Popup>
        </AlertDialogViewport>
      </AlertDialogPortal>
    </AlertDialog>
  );
}

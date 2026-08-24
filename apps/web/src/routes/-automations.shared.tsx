import {
  type AutomationCreateInput,
  type AutomationDefinition,
  type AutomationId,
  type AutomationListResult,
  type AutomationMemory,
  type AutomationMode,
  type AutomationNotificationPolicy,
  type AutomationRun,
  type AutomationRunResult,
  type AutomationStreamEvent,
  type AutomationUpdateInput,
  type AutomationWorktreeMode,
  type ModelSelection,
  type ProviderKind,
  type RuntimeMode,
  type ThreadId,
} from "@omnimind/contracts";
import { automationRequiresTargetThread } from "@omnimind/shared/automationMode";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { useLocalPreferences } from "~/localPreferences";
import type { Thread } from "~/types";
import {
  ComposerPickerMenuPopup,
  ComposerPickerMenuSubPopup,
} from "~/components/chat/ComposerPickerMenuPopup";
import { ProviderModelPicker } from "~/components/chat/ProviderModelPicker";
import { RUNTIME_AUTO_ICON_ACCENT_CLASS_NAME } from "~/components/chat/composerPickerStyles";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Dialog, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
} from "~/components/ui/menu";
import { TimePicker } from "~/components/ui/time-picker";
import { toastManager } from "~/components/ui/toast";
import {
  hasBlockingAutomationDraftWarnings,
  type AutomationDraftWarning,
  type AutomationDraftWarningId,
} from "~/lib/automationDraft";
import {
  AUTOMATION_FAILURE_POLICY_NEVER,
  automationFailurePolicyOptions,
} from "~/lib/automationFailurePolicy";
import {
  acknowledgedRiskIdsForFormWarnings,
  applyScheduleToForm,
  automationFastIntervalLimitMessage,
  buildAutomationFormWarnings,
  createInputFromForm,
  datetimeLocalFromIso,
  defaultModelSelection,
  formatCadence,
  formatCadenceLong,
  formatClockTime,
  formatDateTime,
  formatNextRun,
  formatSchedule,
  formFromDefinition,
  groupAutomationsByContinuedThread,
  automationsForThread,
  isFormSubmittable,
  isoFromDatetimeLocal,
  modelSelectionForProjectChange,
  projectModelSelection,
  providerOptionsForAutomationEdit,
  providerOptionsForAutomationModelSelection,
  scheduleFromForm,
  scheduleFromKind,
  scheduleKindFromSchedule,
  SCHEDULE_KIND_OPTIONS,
  TIME_OF_DAY_PATTERN,
  updateInputFromForm,
  updateWeeklyScheduleDay,
  updateWeeklyScheduleTime,
  weekdayLabel,
  type AutomationFormState,
  type IntervalUnit,
  type ScheduleKind,
} from "~/lib/automationForm";
import { SkillCubeIcon, WorktreeIcon } from "~/lib/icons";
import { CentralIcon } from "~/lib/central-icons";
import { resolveRuntimeModelDescriptor } from "~/components/chat/runtimeModelCapabilities";
import { resolveProviderDiscoveryCwd } from "~/lib/providerDiscovery";
import {
  normalizeRuntimeModeForProvider,
  providerModelSupportsAutoRuntimeMode,
  providerSupportsAutoRuntimeMode,
} from "~/lib/runtimeMode";
import { findProviderStatus } from "~/lib/providerAvailability";
import { cn } from "~/lib/utils";
import type { AppLocale } from "~/locale";
import { useI18n, type MessageKey } from "~/i18n";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { ensureNativeApi } from "~/nativeApi";
import { buildModelSelection } from "~/providerModelOptions";
import { useProviderModelCatalog } from "~/hooks/useProviderModelCatalog";
import { useProviderStatusesForLocalConfig } from "~/hooks/useProviderStatusesForLocalConfig";
import { useStore } from "~/store";
import { resolveThreadPickerTitle } from "./-chatThreadRoute.logic";

export const automationQueryKey = ["automations"] as const;
export const EMPTY_AUTOMATION_LIST: AutomationListResult = {
  definitions: [],
  runs: [],
  memories: [],
};

export async function settleAutomationUpdateFailure(
  queryClient: QueryClient,
  input: {
    readonly previous: AutomationListResult | undefined;
    readonly optimistic: AutomationListResult | undefined;
    readonly conflict: boolean;
  },
): Promise<void> {
  if (
    input.previous !== undefined &&
    input.optimistic !== undefined &&
    queryClient.getQueryData<AutomationListResult>(automationQueryKey) === input.optimistic
  ) {
    queryClient.setQueryData(automationQueryKey, input.previous);
  }
  if (input.conflict) {
    await queryClient.invalidateQueries({ queryKey: automationQueryKey });
  }
}

function automationWarningPresentation(
  warning: AutomationDraftWarning,
  t: ReturnType<typeof useI18n>["t"],
): { title: string; detail: string } {
  switch (warning.id) {
    case "attachments-not-persisted":
      return {
        title: t("automation.warningContextTitle"),
        detail: t("automation.warningContextDetail"),
      };
    case "missing-schedule":
      return {
        title: t("automation.warningScheduleTitle"),
        detail: t("automation.warningScheduleDetail"),
      };
    case "fast-recurring-interval":
      return {
        title: t("automation.warningFastTitle"),
        detail: t("automation.warningFastDetail"),
      };
    case "full-access":
      return {
        title: t("automation.warningFullAccessTitle"),
        detail: t("automation.warningFullAccessDetail"),
      };
    case "local-checkout":
      return warning.title.startsWith("Auto fallback")
        ? {
            title: t("automation.warningAutoLocalTitle"),
            detail: t("automation.warningAutoLocalDetail"),
          }
        : {
            title: t("automation.warningLocalTitle"),
            detail: t("automation.warningLocalDetail"),
          };
    case "worktree-cleanup":
      return {
        title: t("automation.warningWorktreeTitle"),
        detail: t("automation.warningWorktreeDetail"),
      };
    case "generated-low-confidence":
      return {
        title: t("automation.warningGeneratedTitle"),
        detail: t("automation.warningGeneratedDetail"),
      };
    case "skill-reference":
      return {
        title: t("automation.warningSkillTitle"),
        detail: t("automation.warningSkillDetail"),
      };
  }
}

export {
  acknowledgedRiskIdsForFormWarnings,
  applyScheduleToForm,
  automationFastIntervalLimitMessage,
  buildAutomationFormWarnings,
  createInputFromForm,
  datetimeLocalFromIso,
  defaultModelSelection,
  formatCadence,
  formatCadenceLong,
  formatClockTime,
  formatDateTime,
  formatNextRun,
  formatSchedule,
  formFromDefinition,
  groupAutomationsByContinuedThread,
  automationsForThread,
  isFormSubmittable,
  isoFromDatetimeLocal,
  modelSelectionForProjectChange,
  projectModelSelection,
  providerOptionsForAutomationEdit,
  providerOptionsForAutomationModelSelection,
  scheduleFromForm,
  scheduleFromKind,
  scheduleKindFromSchedule,
  SCHEDULE_KIND_OPTIONS,
  TIME_OF_DAY_PATTERN,
  updateInputFromForm,
  updateWeeklyScheduleDay,
  updateWeeklyScheduleTime,
  weekdayLabel,
  type AutomationFormState,
  type IntervalUnit,
  type ScheduleKind,
};

/** Starter prompts surfaced behind the composer's "Use template" button. */
export const AUTOMATION_TEMPLATES: readonly {
  readonly id: "crashes" | "dependencies" | "standup";
  readonly labelKey: MessageKey;
  readonly nameKey: MessageKey;
  readonly promptKey: MessageKey;
}[] = [
  {
    id: "crashes",
    labelKey: "automation.templateCrashesLabel",
    nameKey: "automation.templateCrashesName",
    promptKey: "automation.templateCrashesPrompt",
  },
  {
    id: "dependencies",
    labelKey: "automation.templateDependenciesLabel",
    nameKey: "automation.templateDependenciesName",
    promptKey: "automation.templateDependenciesPrompt",
  },
  {
    id: "standup",
    labelKey: "automation.templateStandupLabel",
    nameKey: "automation.templateStandupName",
    promptKey: "automation.templateStandupPrompt",
  },
];

export function formatRelativeTime(iso: string | null, locale: AppLocale = "en"): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return locale === "zh-CN" ? "刚刚" : "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return locale === "zh-CN" ? `${minutes}分` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "zh-CN" ? `${hours}小时` : `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === "zh-CN" ? `${days}天` : `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return locale === "zh-CN" ? `${weeks}周` : `${weeks}w`;
  const months = Math.floor(days / 30);
  return locale === "zh-CN" ? `${months}个月` : `${months}mo`;
}

export function runStatusVariant(
  status: AutomationRun["status"],
): "success" | "warning" | "error" | "info" | "outline" {
  switch (status) {
    case "succeeded":
      return "success";
    case "failed":
    case "cancelled":
    case "interrupted":
      return "error";
    case "waiting-for-approval":
    case "skipped":
      return "warning";
    case "running":
    case "claimed":
    case "pending":
      return "info";
  }
}

/** Status-colored dot/icon class for a single run, shared by the detail history and triage rows. */
export function runStatusDotClassName(status: AutomationRun["status"]): string {
  switch (runStatusVariant(status)) {
    case "success":
      return "text-emerald-500";
    case "error":
      return "text-destructive";
    case "warning":
      return "text-amber-500";
    case "info":
      return "text-blue-500";
    case "outline":
      return "text-muted-foreground/50";
  }
}

/**
 * True when a click/keydown originated from an interactive control nested inside a clickable
 * row (delete button, link, input, etc.) rather than the row surface itself. Row components use
 * it to let inner controls handle their own events without also triggering the row's action.
 */
export function isRowInteractiveEventTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement,
): boolean {
  if (!(target instanceof HTMLElement) || target === currentTarget) {
    return false;
  }
  return Boolean(target.closest("button,a,input,textarea,select,[contenteditable='true']"));
}

/**
 * Leading status glyph for a single run row: a quiet check for success, otherwise a
 * status-colored dot. Shared by the detail history and the list triage rows so both
 * surfaces read identically.
 */
export function RunStatusIndicator({
  status,
  className,
}: {
  readonly status: AutomationRun["status"];
  readonly className?: string;
}) {
  if (runStatusVariant(status) === "success") {
    return (
      <CentralIcon
        name="circle-check"
        className={cn("size-3.5 shrink-0 text-muted-foreground/70", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-3.5 shrink-0 items-center justify-center",
        runStatusDotClassName(status),
        className,
      )}
    >
      <span className="block size-1.5 rounded-full bg-current" />
    </span>
  );
}

export function isTriageRun(run: AutomationRun): boolean {
  if (run.status === "waiting-for-approval") {
    return true;
  }
  if (run.result) {
    return run.finishedAt !== null && isUnresolvedTriageResult(run.result);
  }
  return run.status === "failed" || run.status === "cancelled" || run.status === "interrupted";
}

export function isUnresolvedTriageResult(result: AutomationRunResult | null): boolean {
  return Boolean(result && result.unread && result.archivedAt === null);
}

export function unresolvedTriageRuns(runs: readonly AutomationRun[]): AutomationRun[] {
  return runs.filter((run) => isTriageRun(run));
}

export function allVisibleTriageRuns(runs: readonly AutomationRun[]): AutomationRun[] {
  return runs.filter((run) => {
    if (run.result) {
      return run.finishedAt !== null && run.result.archivedAt === null;
    }
    return isTriageRun(run);
  });
}

export function automationAttentionCount(runs: readonly AutomationRun[]): number {
  return unresolvedTriageRuns(runs).length;
}

export function runStatusLabel(status: AutomationRun["status"], locale: AppLocale = "en"): string {
  if (locale === "zh-CN") {
    switch (status) {
      case "pending":
        return "排队中";
      case "claimed":
        return "正在启动";
      case "running":
        return "正在运行";
      case "waiting-for-approval":
        return "等待审批";
      case "succeeded":
        return "已完成";
      case "failed":
        return "失败";
      case "cancelled":
        return "已取消";
      case "interrupted":
        return "已中断";
      case "skipped":
        return "已跳过";
    }
  }
  switch (status) {
    case "pending":
      return "Queued";
    case "claimed":
      return "Starting";
    case "running":
      return "Running";
    case "waiting-for-approval":
      return "Waiting for approval";
    case "succeeded":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "interrupted":
      return "Interrupted";
    case "skipped":
      return "Skipped";
  }
}

export function runResultSummary(run: AutomationRun, locale: AppLocale = "en"): string {
  if (run.result?.summary) return run.result.summary;
  if (run.error) return run.error;
  switch (run.result?.outcome) {
    case "findings":
      return locale === "zh-CN" ? "发现需要审查的内容" : "Found something to review";
    case "no-findings":
      return locale === "zh-CN" ? "未发现问题" : "No findings";
    case "changed-files":
      return locale === "zh-CN" ? "已更改文件" : "Changed files";
    case "needs-attention":
      return locale === "zh-CN" ? "需要处理" : "Needs attention";
    case "unknown":
      return run.threadId
        ? locale === "zh-CN"
          ? "已完成；打开任务查看回复"
          : "Completed; open the task for the reply"
        : locale === "zh-CN"
          ? "已完成"
          : "Completed";
    case undefined:
      return runStatusLabel(run.status, locale);
  }
}

export function runResultTitle(run: AutomationRun): string | null {
  const title = run.result?.title?.trim();
  return title ? title : null;
}

export function canCancelAutomationRun(run: AutomationRun): boolean {
  return (
    run.status === "pending" ||
    run.status === "claimed" ||
    run.status === "running" ||
    run.status === "waiting-for-approval"
  );
}

/**
 * Plain-language warning for a latest run that needs the user's attention, or null when
 * the run ended normally (or is still progressing). Drives the amber glyph and the
 * subtitle warning segment on automation list rows.
 */
export function automationAttentionLabel(
  run: AutomationRun,
  locale: AppLocale = "en",
): string | null {
  switch (run.status) {
    case "waiting-for-approval":
      return locale === "zh-CN" ? "等待审批" : "Waiting for approval";
    case "failed":
      return locale === "zh-CN" ? "上次运行失败" : "Last run failed";
    case "cancelled":
      return locale === "zh-CN" ? "上次运行已取消" : "Last run cancelled";
    case "interrupted":
      return locale === "zh-CN" ? "上次运行已中断" : "Last run interrupted";
    default:
      return null;
  }
}

type LiveAutomationRun = AutomationRun & {
  readonly status: "pending" | "claimed" | "running" | "waiting-for-approval";
};

export function isLiveRun(run: AutomationRun | null): run is LiveAutomationRun {
  return (
    run?.status === "pending" ||
    run?.status === "claimed" ||
    run?.status === "running" ||
    run?.status === "waiting-for-approval"
  );
}

/**
 * Icon + tint for an automation list row's leading status glyph.
 * - Live runs spin with a circular loading glyph.
 * - Completed successful runs show a checkmark circle.
 * - Failed/cancelled/interrupted runs keep the warning exclamation.
 * - Scheduled (enabled with a future next run) shows a clock.
 * - Paused automations show a pause glyph.
 */
export function automationListRowIcon(
  definition: AutomationDefinition,
  latestRun: AutomationRun | null,
): { readonly name: string; readonly className: string } {
  // Pausing prevents future dispatches but does not cancel an in-flight run, so the
  // active run state must take precedence over the definition's enabled flag.
  if (isLiveRun(latestRun)) {
    return {
      name: "loading-circle",
      className: "size-4 animate-spin text-blue-500 motion-reduce:animate-none",
    };
  }
  if (!definition.enabled) {
    return { name: "pause", className: "size-4 text-muted-foreground/40" };
  }
  if (latestRun?.status === "succeeded") {
    return { name: "circle-check", className: "size-4 text-green-500" };
  }
  if (latestRun && automationAttentionLabel(latestRun) !== null) {
    return { name: "exclamation-circle", className: "size-4 text-amber-500" };
  }
  if (definition.nextRunAt) {
    return { name: "clock", className: "size-4 text-foreground/70" };
  }
  return { name: "circle-placeholder-on", className: "size-4 text-foreground/70" };
}

/**
 * Tint for the list row's leading status glyph: dimmed when paused, blue while a run is
 * live, amber when the latest run needs attention, otherwise neutral.
 */
export function automationStatusDotClass(
  definition: AutomationDefinition,
  latestRun: AutomationRun | null,
): string {
  if (!definition.enabled) return "text-muted-foreground/40";
  if (
    latestRun?.status === "running" ||
    latestRun?.status === "pending" ||
    latestRun?.status === "claimed"
  ) {
    return "text-blue-500";
  }
  if (latestRun && automationAttentionLabel(latestRun) !== null) return "text-amber-500";
  return "text-foreground/70";
}

const deletedAutomationIdsInCache = new Set<string>();

function isNewerTimestamp(candidate: string, existing: string): boolean {
  return candidate.localeCompare(existing) > 0;
}

// Snapshots are reconciliation data, so equal timestamps keep the live cache winner.
function isSameOrNewerTimestamp(candidate: string, existing: string): boolean {
  return candidate.localeCompare(existing) >= 0;
}

function mergeDefinitionsByUpdatedAt(
  snapshotDefinitions: readonly AutomationDefinition[],
  previousDefinitions: readonly AutomationDefinition[],
): AutomationDefinition[] {
  const previousById = new Map(
    previousDefinitions.map((definition) => [definition.id, definition]),
  );
  const seen = new Set<string>();
  const definitions: AutomationDefinition[] = [];
  for (const snapshotDefinition of snapshotDefinitions) {
    if (deletedAutomationIdsInCache.has(snapshotDefinition.id)) {
      continue;
    }
    seen.add(snapshotDefinition.id);
    const previousDefinition = previousById.get(snapshotDefinition.id);
    definitions.push(
      previousDefinition &&
        (previousDefinition.definitionRevision > snapshotDefinition.definitionRevision ||
          (previousDefinition.definitionRevision === snapshotDefinition.definitionRevision &&
            isSameOrNewerTimestamp(previousDefinition.updatedAt, snapshotDefinition.updatedAt)))
        ? previousDefinition
        : snapshotDefinition,
    );
  }
  return definitions;
}

function upsertDefinitionByUpdatedAt(
  definitions: readonly AutomationDefinition[],
  incoming: AutomationDefinition,
): AutomationDefinition[] {
  const existing = definitions.find((definition) => definition.id === incoming.id);
  if (
    existing &&
    (existing.definitionRevision > incoming.definitionRevision ||
      (existing.definitionRevision === incoming.definitionRevision &&
        isNewerTimestamp(existing.updatedAt, incoming.updatedAt)))
  ) {
    return [...definitions];
  }
  return existing
    ? definitions.map((definition) => (definition.id === incoming.id ? incoming : definition))
    : [incoming, ...definitions];
}

function mergeRunsByUpdatedAt(
  snapshotRuns: readonly AutomationRun[],
  previousRuns: readonly AutomationRun[],
  visibleAutomationIds?: ReadonlySet<AutomationId>,
): AutomationRun[] {
  const previousById = new Map(previousRuns.map((run) => [run.id, run]));
  const runs: AutomationRun[] = [];
  for (const snapshotRun of snapshotRuns) {
    if (
      deletedAutomationIdsInCache.has(snapshotRun.automationId) ||
      (visibleAutomationIds && !visibleAutomationIds.has(snapshotRun.automationId))
    ) {
      continue;
    }
    const previousRun = previousById.get(snapshotRun.id);
    runs.push(
      previousRun && isSameOrNewerTimestamp(previousRun.updatedAt, snapshotRun.updatedAt)
        ? previousRun
        : snapshotRun,
    );
  }
  return runs;
}

function upsertRunByUpdatedAt(
  runs: readonly AutomationRun[],
  incoming: AutomationRun,
): AutomationRun[] {
  const existing = runs.find((run) => run.id === incoming.id);
  if (existing && isNewerTimestamp(existing.updatedAt, incoming.updatedAt)) {
    return [...runs];
  }
  return existing
    ? runs.map((run) => (run.id === incoming.id ? incoming : run))
    : [incoming, ...runs];
}

function mergeMemoriesByUpdatedAt(
  snapshotMemories: readonly AutomationMemory[],
  previousMemories: readonly AutomationMemory[],
  visibleAutomationIds: ReadonlySet<AutomationId>,
): AutomationMemory[] {
  const previousByAutomationId = new Map(
    previousMemories.map((memory) => [memory.automationId, memory]),
  );
  const seen = new Set<AutomationId>();
  const memories: AutomationMemory[] = [];
  for (const snapshotMemory of snapshotMemories) {
    if (!visibleAutomationIds.has(snapshotMemory.automationId)) {
      continue;
    }
    seen.add(snapshotMemory.automationId);
    const previousMemory = previousByAutomationId.get(snapshotMemory.automationId);
    memories.push(
      previousMemory && isSameOrNewerTimestamp(previousMemory.updatedAt, snapshotMemory.updatedAt)
        ? previousMemory
        : snapshotMemory,
    );
  }
  for (const previousMemory of previousMemories) {
    if (
      !seen.has(previousMemory.automationId) &&
      visibleAutomationIds.has(previousMemory.automationId)
    ) {
      memories.push(previousMemory);
    }
  }
  return memories;
}

function upsertMemoryByUpdatedAt(
  memories: readonly AutomationMemory[],
  incoming: AutomationMemory,
): AutomationMemory[] {
  const existing = memories.find((memory) => memory.automationId === incoming.automationId);
  if (existing && isNewerTimestamp(existing.updatedAt, incoming.updatedAt)) {
    return [...memories];
  }
  return existing
    ? memories.map((memory) => (memory.automationId === incoming.automationId ? incoming : memory))
    : [incoming, ...memories];
}

export function applyAutomationEvent(
  prev: AutomationListResult | undefined,
  event: AutomationStreamEvent,
): AutomationListResult {
  const base = prev ?? EMPTY_AUTOMATION_LIST;
  switch (event.type) {
    case "snapshot": {
      const definitions = mergeDefinitionsByUpdatedAt(event.definitions, base.definitions);
      const visibleAutomationIds = new Set(definitions.map((definition) => definition.id));
      return {
        definitions,
        runs: mergeRunsByUpdatedAt(event.runs, base.runs, visibleAutomationIds),
        memories: mergeMemoriesByUpdatedAt(
          event.memories ?? [],
          base.memories ?? [],
          visibleAutomationIds,
        ),
      };
    }
    case "definition-upserted": {
      if (deletedAutomationIdsInCache.has(event.definition.id)) {
        return base;
      }
      deletedAutomationIdsInCache.delete(event.definition.id);
      const definitions = upsertDefinitionByUpdatedAt(base.definitions, event.definition);
      return { definitions, runs: base.runs, memories: base.memories ?? [] };
    }
    case "definition-deleted":
      deletedAutomationIdsInCache.add(event.automationId);
      return {
        definitions: base.definitions.filter((definition) => definition.id !== event.automationId),
        runs: base.runs.filter((run) => run.automationId !== event.automationId),
        memories: (base.memories ?? []).filter(
          (memory) => memory.automationId !== event.automationId,
        ),
      };
    case "run-upserted": {
      if (deletedAutomationIdsInCache.has(event.run.automationId)) {
        return base;
      }
      const runs = upsertRunByUpdatedAt(base.runs, event.run);
      return { definitions: base.definitions, runs, memories: base.memories ?? [] };
    }
    case "memory-upserted": {
      const currentMemories = base.memories ?? [];
      const memories = upsertMemoryByUpdatedAt(currentMemories, event.memory);
      return { definitions: base.definitions, runs: base.runs, memories };
    }
  }
}

export function useAutomations(onRunStarted?: (threadId: ThreadId) => void) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const showMutationError = (title: MessageKey, error: Error, description = error.message) =>
    toastManager.add({
      type: "error",
      title: t(title),
      description,
    });
  const showDefinitionMutationError = async (fallbackTitle: MessageKey, error: Error) => {
    if ("code" in error && error.code === "AUTOMATION_DEFINITION_CONFLICT") {
      await queryClient.invalidateQueries({ queryKey: automationQueryKey });
      showMutationError(
        "automation.definitionConflictTitle",
        error,
        t("automation.definitionConflict"),
      );
      return;
    }
    showMutationError(fallbackTitle, error);
  };

  const automationsQuery = useQuery({
    queryKey: automationQueryKey,
    queryFn: () => ensureNativeApi().automation.list({}),
  });
  const data = automationsQuery.data ?? EMPTY_AUTOMATION_LIST;

  const createMutation = useMutation({
    mutationFn: (input: AutomationCreateInput) => ensureNativeApi().automation.create(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: automationQueryKey }),
    onError: (error) => showMutationError("automation.createFailed", error),
  });
  const updateMutation = useMutation({
    mutationFn: (input: AutomationUpdateInput) => ensureNativeApi().automation.update(input),
    // Optimistically merge the patch so inline edits on the detail page feel instant; the
    // server's authoritative definition (with recomputed nextRunAt) arrives via the stream.
    onMutate: (input) => {
      const { expectedDefinitionRevision: _expectedDefinitionRevision, ...patch } = input;
      const previous = queryClient.getQueryData<AutomationListResult>(automationQueryKey);
      const optimistic = queryClient.setQueryData<AutomationListResult>(
        automationQueryKey,
        (prev) => {
          const base = prev ?? EMPTY_AUTOMATION_LIST;
          return {
            definitions: base.definitions.map((definition) =>
              definition.id === input.id
                ? ({ ...definition, ...patch } as AutomationDefinition)
                : definition,
            ),
            runs: base.runs,
            memories: base.memories ?? [],
          };
        },
      );
      return { previous, optimistic };
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: automationQueryKey }),
    onError: async (error, _input, context) => {
      const conflict = "code" in error && error.code === "AUTOMATION_DEFINITION_CONFLICT";
      if (context) {
        await settleAutomationUpdateFailure(queryClient, { ...context, conflict });
      } else if (conflict) {
        await queryClient.invalidateQueries({ queryKey: automationQueryKey });
      }
      if (conflict) {
        showMutationError(
          "automation.definitionConflictTitle",
          error,
          t("automation.definitionConflict"),
        );
      } else {
        showMutationError("automation.updateFailed", error);
      }
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (definition: AutomationDefinition) =>
      ensureNativeApi().automation.delete({
        id: definition.id,
        expectedDefinitionRevision: definition.definitionRevision,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: automationQueryKey }),
    onError: (error) => showDefinitionMutationError("automation.deleteFailed", error),
  });
  const runNowMutation = useMutation({
    mutationFn: (definition: AutomationDefinition) =>
      ensureNativeApi().automation.runNow({ automationId: definition.id }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: automationQueryKey });
      if (result.run.threadId) onRunStarted?.(result.run.threadId);
    },
    onError: (error) => showMutationError("automation.runFailed", error),
  });
  const cancelRunMutation = useMutation({
    mutationFn: (run: AutomationRun) => ensureNativeApi().automation.cancelRun({ runId: run.id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: automationQueryKey }),
    onError: (error) => showMutationError("automation.cancelFailed", error),
  });
  const markRunReadMutation = useMutation({
    mutationFn: (input: { readonly run: AutomationRun; readonly unread: boolean }) =>
      ensureNativeApi().automation.markRunRead({ runId: input.run.id, unread: input.unread }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: automationQueryKey }),
    onError: (error) => showMutationError("automation.readStateFailed", error),
  });
  const archiveRunMutation = useMutation({
    mutationFn: (input: { readonly run: AutomationRun; readonly archived: boolean }) =>
      ensureNativeApi().automation.archiveRun({ runId: input.run.id, archived: input.archived }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: automationQueryKey }),
    onError: (error) => showMutationError("automation.archiveFailed", error),
  });

  const runsByAutomationId = new Map<string, AutomationRun[]>();
  for (const run of data.runs) {
    const runs = runsByAutomationId.get(run.automationId) ?? [];
    runs.push(run);
    runsByAutomationId.set(run.automationId, runs);
  }
  for (const runs of runsByAutomationId.values()) {
    runs.sort((left, right) => right.scheduledFor.localeCompare(left.scheduledFor));
  }

  return {
    data,
    isLoading: automationsQuery.isLoading,
    refetch: automationsQuery.refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    runNowMutation,
    cancelRunMutation,
    markRunReadMutation,
    archiveRunMutation,
    runsByAutomationId,
  };
}

/** Subtle labeled pill used in the automation composer toolbar. */
const CHIP_CLASS =
  "gap-1.5 rounded-lg px-2 font-normal text-[var(--color-text-foreground-secondary)]";
type IntervalCadenceOption = {
  readonly amount: string;
  readonly unit: IntervalUnit;
};

/** Interval cadence presets shown by default; second-level intervals are preserved when present. */
const INTERVAL_PRESETS: readonly IntervalCadenceOption[] = [
  { amount: "15", unit: "minutes" },
  { amount: "30", unit: "minutes" },
  { amount: "120", unit: "minutes" },
  { amount: "360", unit: "minutes" },
  { amount: "720", unit: "minutes" },
  { amount: "1440", unit: "minutes" },
];

function intervalOptionValue(option: Pick<IntervalCadenceOption, "amount" | "unit">): string {
  return `${option.unit}:${option.amount}`;
}

function intervalOptionLabel(amount: string, unit: IntervalUnit, locale: AppLocale): string {
  if (locale === "zh-CN") return unit === "seconds" ? `每 ${amount} 秒` : `每 ${amount} 分钟`;
  return unit === "seconds" ? `Every ${amount} sec` : `Every ${amount} min`;
}

/** Heartbeat run-count presets ("" = unlimited). */
const MAX_ITERATION_PRESET_VALUES = ["", "10", "25", "50", "100", "250"] as const;

function maxIterationLabel(value: string, locale: AppLocale): string {
  if (value === "") return locale === "zh-CN" ? "不限次数" : "Unlimited";
  if (locale === "zh-CN") return `${value} 次运行`;
  return value === "1" ? "1 run" : `${value} runs`;
}

export function maxIterationOptions(
  currentValue: string | number | null | undefined,
  locale: AppLocale = "en",
): readonly { readonly value: string; readonly label: string }[] {
  const value = currentValue == null ? "" : String(currentValue).trim();
  const presets = MAX_ITERATION_PRESET_VALUES.map((presetValue) => ({
    value: presetValue,
    label: maxIterationLabel(presetValue, locale),
  }));
  if (!/^\d+$/.test(value) || (MAX_ITERATION_PRESET_VALUES as readonly string[]).includes(value)) {
    return presets;
  }
  return [{ value, label: maxIterationLabel(value, locale) }, ...presets];
}

// Shown at the top of an automation's detail panel when saving or manual run actions need
// one-time risk approval.
export function AutomationApprovalBanner({
  warnings,
  busy,
  onApprove,
  onApproveAndRun,
}: {
  readonly warnings: readonly AutomationDraftWarning[];
  readonly busy: boolean;
  readonly onApprove: () => void;
  readonly onApproveAndRun: () => void;
}) {
  const { t } = useI18n();
  if (warnings.length === 0) {
    return null;
  }
  return (
    <Alert variant="warning">
      <AlertTitle>{t("automation.approvalNeeded")}</AlertTitle>
      <AlertDescription>
        <span>{t("automation.approvalDescription")}</span>
        <ul className="flex flex-col gap-1.5">
          {warnings.map((warning) => {
            const copy = automationWarningPresentation(warning, t);
            return (
              <li key={warning.id} className="text-xs">
                <span className="font-medium text-foreground/90">{copy.title}</span>
                <span className="block">{copy.detail}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onApprove}>
            {t("automation.approve")}
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={onApproveAndRun}>
            {t("automation.approveAndRun")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function AutomationModelPicker({
  value,
  projectCwd,
  onChange,
  onAutoModeSupportChange,
}: {
  readonly value: ModelSelection;
  readonly projectCwd: string | null;
  readonly onChange: (value: ModelSelection) => void;
  readonly onAutoModeSupportChange?: (supported: boolean) => void;
}) {
  const { preferences: settings } = useLocalPreferences();
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const providerStatuses = useProviderStatusesForLocalConfig();
  const [open, setOpen] = useState(false);
  const [piDiscoveryRequested, setPiDiscoveryRequested] = useState(false);
  const [prefetchProviders, setPrefetchProviders] = useState<ReadonlyArray<ProviderKind>>([]);
  const modelHintByProvider: Partial<Record<ProviderKind, string | null>> = {
    [value.provider]: value.model,
  };
  const providerModelDiscoveryCwd = resolveProviderDiscoveryCwd({
    activeThreadWorktreePath: null,
    activeProjectCwd: projectCwd,
    serverCwd: serverConfigQuery.data?.cwd ?? null,
  });
  const {
    modelOptionsByProvider,
    catalogStateByProvider,
    loadingModelProviders,
    runtimeModelsByProvider,
    selectedRuntimeModel,
  } = useProviderModelCatalog({
    selectedProvider: value.provider,
    discoveryEnabled: open,
    piDiscoveryRequested,
    cwd: providerModelDiscoveryCwd,
    modelHintByProvider,
    // The selected Engine is always discovered. Other Engine catalogs start
    // only after their submenu is explicitly opened, avoiding a ten-provider
    // cold-start burst against the Server's bounded expensive-read admission.
    prefetchProviders,
  });
  const providerStatus = findProviderStatus(providerStatuses, value.provider);
  const persistedRuntimeModel =
    value.provider === "claudeAgent" && typeof value.supportsAutoMode === "boolean"
      ? {
          slug: value.model,
          name: value.model,
          supportsAutoMode: value.supportsAutoMode,
        }
      : undefined;
  const autoModeSupported = providerModelSupportsAutoRuntimeMode(
    value.provider,
    selectedRuntimeModel ?? persistedRuntimeModel,
    providerStatus,
  );
  useEffect(() => {
    onAutoModeSupportChange?.(autoModeSupported);
  }, [autoModeSupported, onAutoModeSupportChange]);

  return (
    <ProviderModelPicker
      compact
      provider={value.provider}
      model={value.model}
      lockedProvider={null}
      providers={providerStatuses}
      modelOptionsByProvider={modelOptionsByProvider}
      catalogStateByProvider={catalogStateByProvider}
      loadingModelProviders={loadingModelProviders}
      hiddenProviders={settings.hiddenProviders}
      providerOrder={settings.providerOrder}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setPiDiscoveryRequested(false);
          setPrefetchProviders([]);
        }
      }}
      onProviderBrowse={(provider) => {
        setPrefetchProviders((current) =>
          current.includes(provider) ? current : [...current, provider],
        );
        if (provider === "pi") setPiDiscoveryRequested(true);
      }}
      onProviderModelChange={(provider, model) => {
        const runtimeModel = resolveRuntimeModelDescriptor({
          provider,
          model,
          runtimeModels: runtimeModelsByProvider[provider],
        });
        onChange(buildModelSelection(provider, model, undefined, runtimeModel?.supportsAutoMode));
      }}
    />
  );
}

export function reconcileAutomationFormAutoModeSupport(
  form: AutomationFormState,
  supported: boolean,
): AutomationFormState {
  const modelSelection =
    form.modelSelection.provider === "claudeAgent" &&
    form.modelSelection.supportsAutoMode !== supported
      ? { ...form.modelSelection, supportsAutoMode: supported }
      : form.modelSelection;
  const runtimeMode =
    !supported && form.runtimeMode === "auto" ? "approval-required" : form.runtimeMode;
  return modelSelection !== form.modelSelection || runtimeMode !== form.runtimeMode
    ? { ...form, modelSelection, runtimeMode }
    : form;
}

export function AutomationDialog({
  open,
  editing,
  form,
  projects,
  threads,
  warnings: warningsProp,
  acknowledgedWarningIds: acknowledgedWarningIdsProp,
  onOpenChange,
  onFormChange,
  onToggleWarning,
  onSubmit,
  busy,
}: {
  readonly open: boolean;
  readonly editing: boolean;
  readonly form: AutomationFormState;
  readonly projects: ReturnType<typeof useStore.getState>["projects"];
  readonly threads: readonly Thread[];
  readonly warnings?: readonly AutomationDraftWarning[];
  readonly acknowledgedWarningIds?: ReadonlySet<AutomationDraftWarningId>;
  readonly onOpenChange: (open: boolean) => void;
  readonly onFormChange: (form: AutomationFormState) => void;
  readonly onToggleWarning?: (id: AutomationDraftWarningId, checked: boolean) => void;
  readonly onSubmit: () => void;
  readonly busy: boolean;
}) {
  const { locale, t } = useI18n();
  const warnings: readonly AutomationDraftWarning[] = warningsProp ?? [];
  const acknowledgedWarningIds: ReadonlySet<AutomationDraftWarningId> =
    acknowledgedWarningIdsProp ?? new Set<AutomationDraftWarningId>();
  const setField = <K extends keyof AutomationFormState>(key: K, value: AutomationFormState[K]) =>
    onFormChange({ ...form, [key]: value });
  const projectThreads = threads.filter((thread) => thread.projectId === form.projectId);
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const [selectedModelSupportsAuto, setSelectedModelSupportsAuto] = useState(() =>
    form.modelSelection.provider === "claudeAgent"
      ? form.modelSelection.supportsAutoMode !== false
      : providerSupportsAutoRuntimeMode(form.modelSelection.provider),
  );
  const handleAutoModeSupportChange = useCallback(
    (supported: boolean) => {
      setSelectedModelSupportsAuto(supported);
      const reconciled = reconcileAutomationFormAutoModeSupport(form, supported);
      if (reconciled !== form) {
        onFormChange(reconciled);
      }
    },
    [form, onFormChange],
  );
  const schedule = scheduleFromForm(form);
  const hasFastIntervalLimit = automationFastIntervalLimitMessage(form) !== null;
  const hasBlockingWarning = hasBlockingAutomationDraftWarnings(warnings, acknowledgedWarningIds);
  const submittable = isFormSubmittable(form) && !hasBlockingWarning;
  const intervalValue = intervalOptionValue({
    amount: form.intervalAmount,
    unit: form.intervalUnit,
  });
  const maxIterationPresets = maxIterationOptions(form.maxIterations, locale);
  const intervalPresets = INTERVAL_PRESETS.some(
    (preset) => intervalOptionValue(preset) === intervalValue,
  )
    ? INTERVAL_PRESETS
    : [
        {
          amount: form.intervalAmount,
          unit: form.intervalUnit,
          label: intervalOptionLabel(form.intervalAmount, form.intervalUnit, locale),
        },
        ...INTERVAL_PRESETS,
      ];

  const chooseProject = (projectId: string) => {
    const targetStillMatches =
      form.targetThreadId.length > 0 &&
      threads.some((thread) => thread.id === form.targetThreadId && thread.projectId === projectId);
    const modelSelection = modelSelectionForProjectChange(
      projects,
      form.projectId,
      projectId,
      form.modelSelection,
    );
    onFormChange({
      ...form,
      projectId,
      modelSelection,
      runtimeMode: normalizeRuntimeModeForProvider(form.runtimeMode, modelSelection.provider),
      targetThreadId: targetStillMatches ? form.targetThreadId : "",
    });
  };

  const applyTemplate = (template: (typeof AUTOMATION_TEMPLATES)[number]) =>
    onFormChange({
      ...form,
      name: form.name.trim() ? form.name : t(template.nameKey),
      prompt: t(template.promptKey),
    });

  const submit = () => {
    if (busy || !submittable) return;
    onSubmit();
  };
  const handleOpenChange = (nextOpen: boolean) => {
    if (busy && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup showCloseButton={false} className="max-w-3xl">
        <DialogTitle className="sr-only">
          {t(editing ? "automation.edit" : "automation.new")}
        </DialogTitle>

        <div className="flex items-start gap-3 px-5 pt-5">
          <input
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder={t("automation.titlePlaceholder")}
            aria-label={t("automation.titlePlaceholder")}
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-1 font-system-ui text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("automation.about")}
              title={t("automation.aboutDescription")}
            >
              <CentralIcon name="info-simple" className="size-4" />
            </Button>
            <Menu>
              <MenuTrigger render={<Button variant="outline" size="sm" />}>
                {t("automation.useTemplate")}
              </MenuTrigger>
              <ComposerPickerMenuPopup align="end" className="w-52">
                {AUTOMATION_TEMPLATES.map((template) => (
                  <MenuItem key={template.id} onClick={() => applyTemplate(template)}>
                    {t(template.labelKey)}
                  </MenuItem>
                ))}
              </ComposerPickerMenuPopup>
            </Menu>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.close")}
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              <CentralIcon name="cross-small" className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-3">
          <textarea
            value={form.prompt}
            onChange={(event) => setField("prompt", event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t("automation.promptPlaceholder")}
            aria-label={t("automation.prompt")}
            className="min-h-[15rem] w-full flex-1 resize-none overflow-y-auto bg-transparent font-system-ui text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
          />

          {warnings.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-border/50 pt-3">
              {warnings.map((warning) => {
                const copy = automationWarningPresentation(warning, t);
                return (
                  <label
                    key={warning.id}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    {warning.requiresAcknowledgement ? (
                      <input
                        type="checkbox"
                        checked={acknowledgedWarningIds.has(warning.id)}
                        onChange={(event) => onToggleWarning?.(warning.id, event.target.checked)}
                        className="mt-0.5"
                      />
                    ) : (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                    )}
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{copy.title}</span>
                      <span className="block">{copy.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
          {hasFastIntervalLimit ? (
            <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning">
              {t("automation.fastIntervalLimit")}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-1">
          <div className="flex flex-1 flex-wrap items-center gap-0.5">
            {/* Heartbeat runs inherit the target thread's environment; every other mode
                opens its own thread and therefore picks one. */}
            {automationRequiresTargetThread(form.mode) ? null : (
              <Menu>
                <MenuTrigger render={<Button variant="ghost" size="sm" className={CHIP_CLASS} />}>
                  <WorktreeIcon className="size-4" />
                  <span>
                    {t(
                      form.worktreeMode === "auto"
                        ? "automation.worktreeAuto"
                        : form.worktreeMode === "worktree"
                          ? "automation.worktree"
                          : "automation.local",
                    )}
                  </span>
                  <CentralIcon name="chevron-down-small" className="size-3.5 opacity-60" />
                </MenuTrigger>
                <ComposerPickerMenuPopup align="start" className="w-40">
                  <MenuRadioGroup
                    value={form.worktreeMode}
                    onValueChange={(value) =>
                      setField("worktreeMode", value as AutomationWorktreeMode)
                    }
                  >
                    {(["auto", "worktree", "local"] as const).map((value) => (
                      <MenuRadioItem key={value} value={value}>
                        <span>
                          {t(
                            value === "auto"
                              ? "automation.worktreeAuto"
                              : value === "worktree"
                                ? "automation.worktree"
                                : "automation.local",
                          )}
                        </span>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </ComposerPickerMenuPopup>
              </Menu>
            )}

            <Menu>
              <MenuTrigger render={<Button variant="ghost" size="sm" className={CHIP_CLASS} />}>
                <CentralIcon name="folder-2" className="size-4" />
                <span className="max-w-[10rem] truncate">
                  {selectedProject?.name ?? t("automation.selectProject")}
                </span>
                <CentralIcon name="chevron-down-small" className="size-3.5 opacity-60" />
              </MenuTrigger>
              <ComposerPickerMenuPopup align="start" className="w-56">
                <MenuRadioGroup value={form.projectId} onValueChange={chooseProject}>
                  {projects.map((project) => (
                    <MenuRadioItem key={project.id} value={project.id}>
                      <span className="truncate">{project.name}</span>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </ComposerPickerMenuPopup>
            </Menu>

            <AutomationModelPicker
              value={form.modelSelection}
              projectCwd={selectedProject?.cwd ?? null}
              onChange={(value) => {
                onFormChange({
                  ...form,
                  modelSelection: value,
                  runtimeMode: normalizeRuntimeModeForProvider(form.runtimeMode, value.provider),
                });
              }}
              onAutoModeSupportChange={handleAutoModeSupportChange}
            />

            <Menu>
              <MenuTrigger render={<Button variant="ghost" size="sm" className={CHIP_CLASS} />}>
                <CentralIcon name="clock" className="size-4" />
                <span>{formatCadence(schedule, locale)}</span>
                <CentralIcon name="chevron-down-small" className="size-3.5 opacity-60" />
              </MenuTrigger>
              <ComposerPickerMenuPopup align="start" className="w-56">
                <MenuGroup>
                  <MenuGroupLabel>{t("automation.schedule")}</MenuGroupLabel>
                  <MenuRadioGroup
                    value={form.scheduleKind}
                    onValueChange={(value) => setField("scheduleKind", value as ScheduleKind)}
                  >
                    {SCHEDULE_KIND_OPTIONS.map((option) => (
                      <MenuRadioItem key={option.value} value={option.value}>
                        {t(`automation.scheduleKind.${option.value}` as MessageKey)}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
                {form.scheduleKind === "custom" ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>{t("automation.every")}</MenuGroupLabel>
                      <MenuRadioGroup
                        value={intervalValue}
                        onValueChange={(value) => {
                          const [unit, amount] = value.split(":");
                          if (unit === "seconds" || unit === "minutes") {
                            onFormChange({
                              ...form,
                              intervalUnit: unit,
                              intervalAmount: amount ?? "1",
                            });
                          }
                        }}
                      >
                        {intervalPresets.map((preset) => (
                          <MenuRadioItem
                            key={intervalOptionValue(preset)}
                            value={intervalOptionValue(preset)}
                          >
                            {intervalOptionLabel(preset.amount, preset.unit, locale)}
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                    </MenuGroup>
                  </>
                ) : null}
                {form.scheduleKind === "once" ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>{t("automation.runAt")}</MenuGroupLabel>
                      <div className="px-2 py-1">
                        <input
                          type="datetime-local"
                          step={1}
                          value={form.onceRunAt}
                          onChange={(event) => setField("onceRunAt", event.target.value)}
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </MenuGroup>
                  </>
                ) : null}
                {form.scheduleKind === "cron" ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>{t("automation.scheduleKind.cron")}</MenuGroupLabel>
                      <div className="px-2 py-1">
                        <input
                          value={form.cronExpression}
                          onChange={(event) => setField("cronExpression", event.target.value)}
                          placeholder="0 9 * * *"
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </MenuGroup>
                  </>
                ) : null}
                {form.scheduleKind === "weekly" ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>{t("automation.day")}</MenuGroupLabel>
                      <MenuRadioGroup
                        value={form.dayOfWeek}
                        onValueChange={(value) => setField("dayOfWeek", value)}
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map((value) => (
                          <MenuRadioItem key={value} value={String(value)}>
                            {weekdayLabel(value, locale)}
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                    </MenuGroup>
                  </>
                ) : null}
                {form.scheduleKind === "daily" ||
                form.scheduleKind === "weekdays" ||
                form.scheduleKind === "weekly" ? (
                  <>
                    <MenuSeparator />
                    <MenuSub>
                      <MenuSubTrigger>
                        {t("automation.time")}
                        <span className="ml-auto pr-1 tabular-nums text-muted-foreground">
                          {form.timeOfDay}
                        </span>
                      </MenuSubTrigger>
                      <ComposerPickerMenuSubPopup>
                        <div className="p-1">
                          <TimePicker
                            className="w-44"
                            value={form.timeOfDay}
                            onChange={(value) => setField("timeOfDay", value)}
                          />
                        </div>
                      </ComposerPickerMenuSubPopup>
                    </MenuSub>
                  </>
                ) : null}
                {form.scheduleKind === "daily" ||
                form.scheduleKind === "weekdays" ||
                form.scheduleKind === "weekly" ||
                form.scheduleKind === "cron" ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>{t("automation.timezone")}</MenuGroupLabel>
                      <div className="px-2 py-1">
                        <input
                          value={form.timezone}
                          onChange={(event) => setField("timezone", event.target.value)}
                          placeholder="Europe/Rome"
                          className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </MenuGroup>
                  </>
                ) : null}
              </ComposerPickerMenuPopup>
            </Menu>

            <Menu>
              <MenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("automation.runMode")}
                    title={t("automation.runMode")}
                    className="rounded-lg text-[var(--color-text-foreground-secondary)]"
                  />
                }
              >
                <SkillCubeIcon className="size-4" />
              </MenuTrigger>
              <ComposerPickerMenuPopup align="start" className="w-56">
                <MenuGroup>
                  <MenuGroupLabel>{t("automation.mode")}</MenuGroupLabel>
                  <MenuRadioGroup
                    value={form.mode}
                    onValueChange={(value) => setField("mode", value as AutomationMode)}
                  >
                    <MenuRadioItem value="standalone">{t("automation.standalone")}</MenuRadioItem>
                    <MenuRadioItem value="dedicated">{t("automation.dedicatedTask")}</MenuRadioItem>
                    <MenuRadioItem value="heartbeat">{t("automation.heartbeat")}</MenuRadioItem>
                  </MenuRadioGroup>
                </MenuGroup>
                {/* Only heartbeat continues a thread the user picks; a dedicated automation
                    creates and keeps its own. */}
                {automationRequiresTargetThread(form.mode) ? (
                  <>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>{t("automation.targetTask")}</MenuGroupLabel>
                      {projectThreads.length === 0 ? (
                        <MenuItem disabled>{t("automation.noTasksInProject")}</MenuItem>
                      ) : (
                        <MenuRadioGroup
                          value={form.targetThreadId}
                          onValueChange={(value) => setField("targetThreadId", value)}
                        >
                          {projectThreads.map((thread) => (
                            <MenuRadioItem key={thread.id} value={thread.id}>
                              <span className="truncate">
                                {resolveThreadPickerTitle(thread.title)}
                              </span>
                            </MenuRadioItem>
                          ))}
                        </MenuRadioGroup>
                      )}
                    </MenuGroup>
                  </>
                ) : null}
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>{t("automation.stopWhen")}</MenuGroupLabel>
                  <div className="px-2 py-1">
                    <input
                      value={form.stopWhen}
                      onChange={(event) => setField("stopWhen", event.target.value)}
                      placeholder={t("automation.stopWhenPlaceholder")}
                      className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>{t("automation.failurePolicy")}</MenuGroupLabel>
                  <MenuRadioGroup
                    value={form.stopAfterFailures}
                    onValueChange={(value) => setField("stopAfterFailures", value)}
                  >
                    {automationFailurePolicyOptions(form.stopAfterFailures).map((option) => (
                      <MenuRadioItem key={option.value} value={option.value}>
                        {option.value === AUTOMATION_FAILURE_POLICY_NEVER
                          ? t("automation.failureKeepRunning")
                          : option.value === "1"
                            ? t("automation.failureStopAfterOne")
                            : t("automation.failureStopAfterCount", { count: option.value })}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>{t("automation.maxIterations")}</MenuGroupLabel>
                  <MenuRadioGroup
                    value={form.maxIterations}
                    onValueChange={(value) => setField("maxIterations", value)}
                  >
                    {maxIterationPresets.map((preset) => (
                      <MenuRadioItem key={preset.value || "unlimited"} value={preset.value}>
                        {preset.label}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>{t("automation.notify")}</MenuGroupLabel>
                  <MenuRadioGroup
                    value={form.notificationPolicy}
                    onValueChange={(value) =>
                      setField("notificationPolicy", value as AutomationNotificationPolicy)
                    }
                  >
                    <MenuRadioItem value="all">{t("automation.notifyAll")}</MenuRadioItem>
                    <MenuRadioItem value="failed-runs-only">
                      {t("automation.notifyFailures")}
                    </MenuRadioItem>
                  </MenuRadioGroup>
                </MenuGroup>
              </ComposerPickerMenuPopup>
            </Menu>

            <Menu>
              <MenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("automation.permissions")}
                    title={t("automation.permissions")}
                    className="rounded-lg text-[var(--color-text-foreground-secondary)]"
                  />
                }
              >
                <CentralIcon
                  name={
                    form.runtimeMode === "auto"
                      ? "shield-code"
                      : form.runtimeMode === "full-access"
                        ? "shield-access"
                        : "brain"
                  }
                  className={cn(
                    "size-4",
                    form.runtimeMode === "auto" && RUNTIME_AUTO_ICON_ACCENT_CLASS_NAME,
                  )}
                />
              </MenuTrigger>
              <ComposerPickerMenuPopup align="start" className="w-48">
                <MenuRadioGroup
                  value={form.runtimeMode}
                  onValueChange={(value) => setField("runtimeMode", value as RuntimeMode)}
                >
                  <MenuRadioItem value="approval-required">
                    {t("automation.permissionApproval")}
                  </MenuRadioItem>
                  {selectedModelSupportsAuto ? (
                    <MenuRadioItem value="auto">
                      <CentralIcon
                        name="shield-code"
                        className={cn("size-4", RUNTIME_AUTO_ICON_ACCENT_CLASS_NAME)}
                      />
                      {t("automation.permissionAuto")}
                    </MenuRadioItem>
                  ) : null}
                  <MenuRadioItem value="full-access">
                    {t("automation.permissionFullAccess")}
                  </MenuRadioItem>
                </MenuRadioGroup>
              </ComposerPickerMenuPopup>
            </Menu>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={submit} disabled={busy || !submittable}>
              {t(editing ? "common.save" : "common.create")}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

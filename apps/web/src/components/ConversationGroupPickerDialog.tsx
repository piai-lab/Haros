import type { SpaceId, ThreadId } from "@omnimind/contracts";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useI18n } from "../i18n";
import { CheckIcon, TagIcon } from "../lib/icons";
import { cn } from "../lib/utils";
import type { Project, SidebarThreadSummary, Space } from "../types";
import { ProjectSidebarIcon } from "./ProjectSidebarIcon";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { SearchInput } from "./ui/search-input";

export type ConversationGroupPickerTarget =
  | { readonly kind: "group"; readonly group: Space }
  | { readonly kind: "thread"; readonly thread: SidebarThreadSummary };

const GROUP_COLORS = [
  "text-amber-500",
  "text-orange-500",
  "text-sky-500",
  "text-violet-500",
  "text-emerald-500",
  "text-rose-500",
] as const;

export function conversationGroupColor(groupId: SpaceId): string {
  let hash = 0;
  for (const character of groupId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return GROUP_COLORS[hash % GROUP_COLORS.length] ?? GROUP_COLORS[0];
}

export function ConversationGroupPickerDialog(props: {
  readonly open: boolean;
  readonly target: ConversationGroupPickerTarget | null;
  readonly projects: ReadonlyArray<Project>;
  readonly threads: ReadonlyArray<SidebarThreadSummary>;
  readonly groups: ReadonlyArray<Space>;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmitThreadGroups: (
    threadId: ThreadId,
    groupIds: ReadonlyArray<SpaceId>,
  ) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seededTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!props.open || !props.target) {
      seededTargetRef.current = null;
      return;
    }
    const target = props.target;
    const targetKey = `${target.kind}:${target.kind === "group" ? target.group.id : target.thread.id}`;
    // Snapshot membership only when a picker target opens. Live projection updates during a
    // multi-thread save must not reset the user's remaining selections halfway through.
    if (seededTargetRef.current === targetKey) return;
    seededTargetRef.current = targetKey;
    setQuery("");
    setSubmitting(false);
    setError(null);
    const initialIds: string[] =
      target.kind === "group"
        ? props.threads
            .filter((thread) => (thread.groupIds ?? []).includes(target.group.id))
            .map((thread) => thread.id)
        : [...(target.thread.groupIds ?? [])];
    setSelectedIds(new Set(initialIds));
  }, [props.open, props.target, props.threads]);

  const projectById = useMemo(
    () => new Map(props.projects.map((project) => [project.id, project] as const)),
    [props.projects],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleThreads = useMemo(
    () =>
      props.threads.filter((thread) => {
        if (normalizedQuery.length === 0) return true;
        const project = projectById.get(thread.projectId);
        return (
          thread.title.toLocaleLowerCase().includes(normalizedQuery) ||
          project?.name.toLocaleLowerCase().includes(normalizedQuery) ||
          project?.cwd.toLocaleLowerCase().includes(normalizedQuery)
        );
      }),
    [normalizedQuery, projectById, props.threads],
  );
  const visibleGroups = useMemo(
    () =>
      props.groups.filter(
        (group) =>
          normalizedQuery.length === 0 ||
          group.name.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery, props.groups],
  );

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!props.target || submitting) return;
    const target = props.target;
    let savedChanges = 0;
    let totalChanges = 0;
    let confirmedSelection: Set<string> | null = null;
    setSubmitting(true);
    setError(null);
    try {
      if (target.kind === "thread") {
        await props.onSubmitThreadGroups(
          target.thread.id,
          props.groups.filter((group) => selectedIds.has(group.id)).map((group) => group.id),
        );
      } else {
        confirmedSelection = new Set(
          props.threads
            .filter((thread) => (thread.groupIds ?? []).includes(target.group.id))
            .map((thread) => thread.id),
        );
        const pendingChanges = props.threads.filter((thread) => {
          const current = thread.groupIds ?? [];
          const selected = selectedIds.has(thread.id);
          const hasGroup = current.includes(target.group.id);
          return selected !== hasGroup;
        });
        totalChanges = pendingChanges.length;
        for (const thread of pendingChanges) {
          const current = thread.groupIds ?? [];
          const selected = selectedIds.has(thread.id);
          await props.onSubmitThreadGroups(
            thread.id,
            selected
              ? [...current, target.group.id]
              : current.filter((groupId) => groupId !== target.group.id),
          );
          savedChanges += 1;
          if (selected) confirmedSelection.add(thread.id);
          else confirmedSelection.delete(thread.id);
        }
      }
      props.onOpenChange(false);
    } catch (cause) {
      if (confirmedSelection) setSelectedIds(confirmedSelection);
      const detail = cause instanceof Error ? cause.message : t("groups.saveFailed");
      setError(
        savedChanges > 0
          ? t("groups.partialSaveFailed", {
              saved: savedChanges,
              total: totalChanges,
              detail,
            })
          : detail,
      );
      setSubmitting(false);
    }
  };

  const target = props.target;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target?.kind === "group" ? t("groups.addConversations") : t("groups.addToGroups")}
          </DialogTitle>
          <DialogDescription>
            {target?.kind === "group"
              ? t("groups.addConversationsDescription", { group: target.group.name })
              : t("groups.addToGroupsDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-3">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={target?.kind === "group" ? t("groups.searchConversations") : t("groups.searchGroups")}
            aria-label={target?.kind === "group" ? t("groups.searchConversations") : t("groups.searchGroups")}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {target?.kind === "group"
              ? visibleThreads.map((thread) => {
                  const selected = selectedIds.has(thread.id);
                  const project = projectById.get(thread.projectId);
                  return (
                    <PickerRow
                      key={thread.id}
                      selected={selected}
                      label={thread.title}
                      detail={project?.name}
                      icon={
                        project ? (
                          <ProjectSidebarIcon cwd={project.cwd} expanded={false} />
                        ) : undefined
                      }
                      onClick={() => toggle(thread.id)}
                    />
                  );
                })
              : visibleGroups.map((group) => (
                  <PickerRow
                    key={group.id}
                    selected={selectedIds.has(group.id)}
                    label={group.name}
                    icon={<TagIcon className={cn("size-4", conversationGroupColor(group.id))} />}
                    onClick={() => toggle(group.id)}
                  />
                ))}
            {(target?.kind === "group" ? visibleThreads : visibleGroups).length === 0 ? (
              <p className="px-2 py-8 text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/60">
                {target?.kind === "group" ? t("groups.noConversations") : t("groups.noGroups")}
              </p>
            ) : null}
          </div>
          {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        </DialogPanel>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)} disabled={submitting}>
            {t("groups.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={!target || submitting}>
            {submitting ? t("groups.saving") : t("groups.save")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function PickerRow(props: {
  readonly selected: boolean;
  readonly label: string;
  readonly detail?: string | undefined;
  readonly icon?: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={props.selected}
      onClick={props.onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-hidden hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/45",
        props.selected && "bg-foreground/7",
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        {props.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[length:var(--app-font-size-ui,12px)]">{props.label}</span>
        {props.detail ? (
          <span className="block truncate text-[length:var(--app-font-size-ui-xs,10px)] text-muted-foreground/60">
            {props.detail}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[.25rem] border",
          props.selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-[color:var(--color-border-light)] bg-background",
        )}
      >
        {props.selected ? <CheckIcon className="size-3" /> : null}
      </span>
    </button>
  );
}

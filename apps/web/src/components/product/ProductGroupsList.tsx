import {
  ProductConversationId,
  ProductGroupId,
  ThreadId,
  type ProductConversationSummary,
  type ProductGroupColor,
  type ProductGroupSummary,
} from "@omnimind/contracts";
import { useEffect, useMemo, useState, type DragEvent } from "react";

import { THREAD_DRAG_MIME } from "../chat-drop-overlay/ChatPaneDropOverlay";
import { useProductGroupsController } from "../useProductGroupsController";
import { PencilIcon, Trash2 } from "../../lib/icons";
import { formatRelativeTime } from "../../lib/relativeTime";
import { getWorkbenchCopy } from "../../i18n/workbenchCopy";
import { cn } from "../../lib/utils";
import { useProductGroupsUiStore } from "../../productGroupsUiStore";
import {
  SIDEBAR_ROW_ACTIVE_CLASS_NAME,
  SIDEBAR_ROW_HOVER_CLASS_NAME,
  SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
} from "../../sidebarRowStyles";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

const GROUP_COLORS: ReadonlyArray<ProductGroupColor> = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
];

const GROUP_COLOR_CLASS: Record<ProductGroupColor, string> = {
  gray: "bg-muted-foreground/55",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

function fill(template: string, name: string): string {
  return template.replace("{name}", name);
}

function readDraggedThread(event: DragEvent): ThreadId | null {
  const raw = event.dataTransfer.getData(THREAD_DRAG_MIME);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("threadId" in value)) return null;
    const threadId = value.threadId;
    return typeof threadId === "string" ? ThreadId.makeUnsafe(threadId) : null;
  } catch {
    return null;
  }
}

function isOutcomeUnknown(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "WS_REQUEST_TIMEOUT" || error.code === "WS_REQUEST_ABORTED";
}

function GroupEditor(props: {
  readonly open: boolean;
  readonly group: ProductGroupSummary | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (name: string, color: ProductGroupColor) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ProductGroupColor>("blue");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = props.open;
  const groupId = props.group?.id ?? null;
  const copy = getWorkbenchCopy();

  useEffect(() => {
    if (!open) return;
    setName(props.group?.name ?? "");
    setColor(props.group?.color ?? "blue");
    setSaving(false);
    setError(null);
  }, [groupId, open, props.group?.color, props.group?.name]);

  return (
    <Dialog
      open={open}
      onOpenChange={props.onOpenChange}
    >
      <DialogPopup key={groupId ?? "new-group"}>
        <DialogHeader>
          <DialogTitle>{props.group ? copy.editGroup : copy.newGroup}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="space-y-3">
          <Input
            autoFocus
            value={name}
            maxLength={32}
            aria-label={copy.groupName}
            placeholder={copy.groupName}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.groupColor}>
            {GROUP_COLORS.map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="radio"
                aria-checked={color === candidate}
                aria-label={candidate}
                className={cn(
                  "size-6 rounded-full outline-hidden ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
                  GROUP_COLOR_CLASS[candidate],
                  color === candidate && "ring-2 ring-foreground/60",
                )}
                onClick={() => setColor(candidate)}
              />
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </DialogPanel>
        <DialogFooter>
          <Button variant="ghost" disabled={saving} onClick={() => props.onOpenChange(false)}>
            {copy.groupCancel}
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError(copy.groupEnterName);
                return;
              }
              setSaving(true);
              void props
                .onSubmit(trimmed, color)
                .then(() => props.onOpenChange(false))
                .catch((cause) => {
                  setSaving(false);
                  setError(cause instanceof Error ? cause.message : copy.groupMutationFailed);
                });
            }}
          >
            {saving ? copy.groupSaving : copy.groupSave}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function ProductGroupsList(props: {
  readonly activeConversationId: string | null;
  readonly createRequest: number;
  readonly onOpenConversation: (threadId: ThreadId) => void;
}) {
  const controller = useProductGroupsController();
  const copy = getWorkbenchCopy();
  const expandedIds = useProductGroupsUiStore((state) => state.expandedGroupIds);
  const toggleExpanded = useProductGroupsUiStore((state) => state.toggleGroup);
  const expandGroup = useProductGroupsUiStore((state) => state.expandGroup);
  const [editorGroup, setEditorGroup] = useState<ProductGroupSummary | null | undefined>(undefined);
  const [dropGroupId, setDropGroupId] = useState<ProductGroupId | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [recoveryRefresh, setRecoveryRefresh] = useState(false);
  const conversationsById = useMemo(
    () => new Map(controller.conversations.map((conversation) => [conversation.id, conversation])),
    [controller.conversations],
  );

  useEffect(() => {
    if (props.createRequest > 0) setEditorGroup(null);
  }, [props.createRequest]);

  const runMutation = (operation: () => Promise<unknown>) => {
    setMutationError(null);
    setRecoveryRefresh(false);
    void operation().catch((cause) => {
      setMutationError(cause instanceof Error ? cause.message : copy.groupMutationFailed);
      if (isOutcomeUnknown(cause)) setRecoveryRefresh(true);
    });
  };

  const moveGroup = (group: ProductGroupSummary, offset: -1 | 1) => {
    const currentIndex = controller.groups.findIndex((candidate) => candidate.id === group.id);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= controller.groups.length) return;
    const ordered = controller.groups.map((candidate) => candidate.id);
    const [moved] = ordered.splice(currentIndex, 1);
    if (!moved) return;
    ordered.splice(targetIndex, 0, moved);
    runMutation(() => controller.reorderGroups(ordered));
  };

  return (
    <div data-product-domain="groups" aria-busy={controller.pending || undefined}>
      {controller.groups.length === 0 ? (
        <p className="px-2 py-2 text-xs leading-relaxed text-muted-foreground/55">
          {copy.noGroups}. {copy.noGroupsDescription}
        </p>
      ) : (
        <SidebarMenu className="gap-1" aria-label={copy.conversationGroups}>
          {controller.groups.map((group, index) => {
            const expanded = expandedIds.includes(group.id);
            const conversations = group.conversationIds
              .map((id) => conversationsById.get(id))
              .filter((conversation): conversation is ProductConversationSummary => Boolean(conversation))
              .filter((conversation) => conversation.archivedAt === null);
            return (
              <SidebarMenuItem key={group.id} className="rounded-md">
                <div
                  className={cn(
                    "group/product-group rounded-md",
                    dropGroupId === group.id && "bg-info/10 ring-1 ring-inset ring-info/45",
                  )}
                  onDragOver={(event) => {
                    if (!event.dataTransfer.types.includes(THREAD_DRAG_MIME)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = event.altKey || event.metaKey ? "copy" : "move";
                    setDropGroupId(group.id);
                  }}
                  onDragLeave={() => setDropGroupId((current) => (current === group.id ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDropGroupId(null);
                    const threadId = readDraggedThread(event);
                    if (!threadId) return;
                    if (event.altKey || event.metaKey) {
                      runMutation(() => controller.addConversations([threadId], group.id));
                    } else {
                      runMutation(() => controller.moveConversations([threadId], group.id));
                    }
                    expandGroup(group.id);
                  }}
                >
                  <SidebarMenuButton
                    size="sm"
                    className="h-7 gap-2 rounded-md px-2 text-xs"
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(group.id)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-2 shrink-0 rounded-full", GROUP_COLOR_CLASS[group.color])}
                    />
                    <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground/45">
                      {conversations.length}
                    </span>
                  </SidebarMenuButton>
                  <div className="hidden items-center gap-0.5 px-1 pb-1 group-hover/product-group:flex group-focus-within/product-group:flex">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={fill(copy.groupMoveUp, group.name)}
                      disabled={index === 0 || controller.pending}
                      onClick={() => moveGroup(group, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={fill(copy.groupMoveDown, group.name)}
                      disabled={index === controller.groups.length - 1 || controller.pending}
                      onClick={() => moveGroup(group, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={fill(copy.groupEdit, group.name)}
                      disabled={controller.pending}
                      onClick={() => setEditorGroup(group)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={fill(copy.groupDelete, group.name)}
                      disabled={controller.pending}
                      onClick={() => {
                        if (window.confirm(fill(copy.groupDeleteConfirm, group.name))) {
                          runMutation(() => controller.deleteGroup(group.id));
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                    {props.activeConversationId &&
                    !group.conversationIds.includes(
                      ProductConversationId.makeUnsafe(props.activeConversationId),
                    ) ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={controller.pending}
                        onClick={() =>
                          runMutation(() => controller.addConversations(
                            [ThreadId.makeUnsafe(props.activeConversationId!)],
                            group.id,
                          ))
                        }
                      >
                        {copy.groupAddCurrent}
                      </Button>
                    ) : null}
                  </div>
                  {expanded ? (
                    <SidebarMenu className="gap-1 border-l border-sidebar-border/60 pl-2" aria-label={group.name}>
                      {conversations.length === 0 ? (
                        <p className="px-2 py-1.5 text-[10px] text-muted-foreground/50">
                          {copy.groupDragHint}
                        </p>
                      ) : (
                        conversations.map((conversation) => {
                          const active = props.activeConversationId === conversation.id;
                          return (
                            <SidebarMenuItem
                              key={conversation.id}
                              className="group/product-group-conversation flex items-center rounded-md"
                            >
                              <SidebarMenuButton
                                size="sm"
                                isActive={active}
                                data-context-current={active || undefined}
                                data-product-group-conversation-id={conversation.id}
                                className={cn(
                                  "h-7 gap-2 rounded-md px-2 text-xs",
                                  active
                                    ? SIDEBAR_ROW_ACTIVE_CLASS_NAME
                                    : cn(
                                        SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
                                        SIDEBAR_ROW_HOVER_CLASS_NAME,
                                      ),
                                )}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = "copyMove";
                                  event.dataTransfer.setData(
                                    THREAD_DRAG_MIME,
                                    JSON.stringify({ threadId: conversation.id }),
                                  );
                                }}
                                onClick={() =>
                                  props.onOpenConversation(ThreadId.makeUnsafe(conversation.id))
                                }
                              >
                                <span className="min-w-0 flex-1 truncate text-left">
                                  {conversation.title}
                                </span>
                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/45">
                                  {formatRelativeTime(conversation.updatedAt)}
                                </span>
                              </SidebarMenuButton>
                              <button
                                type="button"
                                className="sr-only shrink-0 focus:not-sr-only group-hover/product-group-conversation:not-sr-only"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  runMutation(() =>
                                    controller.removeConversation(
                                      ThreadId.makeUnsafe(conversation.id),
                                      group.id,
                                    ),
                                  );
                                }}
                              >
                                {fill(copy.groupRemoveConversation, group.name)}
                              </button>
                            </SidebarMenuItem>
                          );
                        })
                      )}
                    </SidebarMenu>
                  ) : null}
                </div>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      )}
      {mutationError ? (
        <div className="mx-2 mt-2 flex items-center gap-2 text-xs text-destructive" role="alert">
          <span className="min-w-0 flex-1">{mutationError}</span>
          {recoveryRefresh ? (
            <Button size="xs" variant="ghost" onClick={() => runMutation(controller.refresh)}>
              {copy.refresh}
            </Button>
          ) : null}
        </div>
      ) : null}
      <GroupEditor
        open={editorGroup !== undefined}
        group={editorGroup ?? null}
        onOpenChange={(open) => {
          if (!open) setEditorGroup(undefined);
        }}
        onSubmit={(name, color) =>
          (editorGroup
            ? controller.updateGroup(editorGroup, name, color)
            : controller.createGroup(name, color)
          ).then(() => undefined)
        }
      />
    </div>
  );
}

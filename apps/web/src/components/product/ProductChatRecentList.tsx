import { ThreadId, type ProductConversationSummary } from "@omnimind/contracts";

import { getWorkbenchCopy } from "../../i18n/workbenchCopy";
import { formatRelativeTime } from "../../lib/relativeTime";
import { cn } from "../../lib/utils";
import {
  SIDEBAR_ROW_ACTIVE_CLASS_NAME,
  SIDEBAR_ROW_HOVER_CLASS_NAME,
  SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME,
} from "../../sidebarRowStyles";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

export interface ProductLocalChatDraftRow {
  readonly id: string;
  readonly createdAt: string;
}

export function ProductChatRecentList(props: {
  readonly conversations: ReadonlyArray<ProductConversationSummary>;
  readonly localDrafts: ReadonlyArray<ProductLocalChatDraftRow>;
  readonly activeConversationId: string | null;
  readonly hydrated: boolean;
  readonly onOpenConversation: (threadId: ThreadId) => void;
}) {
  const copy = getWorkbenchCopy();
  const rowClassName = (active: boolean) =>
    cn(
      "h-7 gap-2 rounded-md px-2 text-xs",
      active
        ? SIDEBAR_ROW_ACTIVE_CLASS_NAME
        : cn(SIDEBAR_ROW_IDLE_TEXT_CLASS_NAME, SIDEBAR_ROW_HOVER_CLASS_NAME),
    );

  return (
    <SidebarMenu className="gap-1" aria-label={copy.recent}>
      {props.conversations.length > 0 || props.localDrafts.length > 0 ? (
        <>
          {props.conversations.map((conversation) => {
            const active = props.activeConversationId === conversation.id;
            const stateLabel = conversation.receiptState?.replaceAll("_", " ") ?? null;
            return (
              <SidebarMenuItem key={conversation.id} className="rounded-md">
                <SidebarMenuButton
                  size="sm"
                  isActive={active}
                  aria-current={active ? "page" : undefined}
                  aria-label={`${conversation.title}${stateLabel ? `, ${stateLabel}` : ""}`}
                  data-product-conversation-id={conversation.id}
                  className={rowClassName(active)}
                  onClick={() => props.onOpenConversation(ThreadId.makeUnsafe(conversation.id))}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{conversation.title}</span>
                  {stateLabel && conversation.receiptState !== "settled" ? (
                    <span className="sr-only">{stateLabel}</span>
                  ) : null}
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/45">
                    {formatRelativeTime(conversation.updatedAt)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          {props.localDrafts.map((draft) => {
            const active = props.activeConversationId === draft.id;
            return (
              <SidebarMenuItem key={draft.id} className="rounded-md">
                <SidebarMenuButton
                  size="sm"
                  isActive={active}
                  aria-current={active ? "page" : undefined}
                  aria-label={`${copy.newChat}, ${copy.unsentDraft}`}
                  data-product-local-draft-id={draft.id}
                  className={rowClassName(active)}
                  onClick={() => props.onOpenConversation(ThreadId.makeUnsafe(draft.id))}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{copy.newChat}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/45">
                    {formatRelativeTime(draft.createdAt)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </>
      ) : (
        <div className="px-2 pt-4 text-center text-[length:var(--app-font-size-ui,12px)] text-muted-foreground/58">
          {props.hydrated ? copy.noRecentChats : copy.loadingRecentChats}
        </div>
      )}
    </SidebarMenu>
  );
}

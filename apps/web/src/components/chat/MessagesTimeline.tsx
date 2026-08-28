// FILE: MessagesTimeline.tsx
// Purpose: Renders the chat transcript rows and lets LegendList own scrolling/follow behavior.
// Layer: Web chat presentation component
// Exports: MessagesTimeline

import {
  type MessageId,
  type ModelSelection,
  type OrchestrationTurnProvenance,
  type ProviderMentionReference,
  ThreadId,
  type ThreadGoalAchievement,
  type ThreadMarker,
  type TurnId,
} from "@harnessos/contracts";
import { PROVIDER_DISPLAY_NAMES } from "@harnessos/shared/providerMetadata";
import { LegendList, type AnchoredEndSpaceConfig, type LegendListRef } from "@legendapp/list/react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  deriveTimelineEntries,
  formatClockDuration,
  formatClockElapsed,
  type WorkLogEntry,
} from "../../session-logic";
import {
  type TurnDiffSummary,
  type WorktreeSetupResolutionAction,
  type WorktreeSetupSnapshot,
  type WorktreeSetupStep,
} from "../../types";
import ChatMarkdown from "../ChatMarkdown";
import { InlineLinkChip } from "../InlineLinkChip";
import {
  BotIcon,
  BrainIcon,
  ChangesIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  GitBranchIcon,
  GoalIcon,
  LoaderIcon,
  type LucideIcon,
  NewThreadIcon,
  PinIcon,
  SteerIcon,
  Undo2Icon,
  WorktreeIcon,
} from "~/lib/icons";
import { ModelIdentityIcon } from "../ModelIdentityIcon";
import { formatProviderModelOptionName } from "../../providerModelOptions";
import { pinActionLabel } from "~/lib/pin";
import { Button } from "../ui/button";
import { composerOverlayScrollMaskImage } from "./composerOverlay";
import { CrossTaskOriginLabel, type CrossTaskOrigin } from "./CrossTaskOriginLabel";
import { OmniMindThreadCreationCard } from "./OmniMindThreadCreationCard";
import { ForkSourceDivider, type ForkSourceReference } from "./ForkSourceDivider";
import { buildExpandedImagePreview, ExpandedImagePreview } from "./ExpandedImagePreview";
import { ProposedPlanCard } from "./ProposedPlanCard";
import { DiffStatLabel } from "./DiffStatLabel";
import { ReviewChangesButton } from "./ReviewChangesButton";
import { FileEntryIcon } from "./FileEntryIcon";
import { InlineMentionChip } from "./InlineMentionChip";
import { InlineSkillChip } from "./InlineSkillChip";
import { InlineAgentChip } from "./InlineAgentChip";
import { MessageActionButton, MESSAGE_ACTION_ICON_CLASS_NAME } from "./MessageActionButton";
import { MessageCopyButton } from "./MessageCopyButton";
import { AssistantSelectionsSummaryChip } from "./AssistantSelectionsSummaryChip";
import { FileAttachmentChip } from "./FileAttachmentChip";
import { FileCommentsSummaryChip } from "./FileCommentsSummaryChip";
import { BrowserAnnotationStrip } from "./BrowserAnnotationStrip";
import { UserMessagePastedTextCard } from "./PastedTextChip";
import { prefersCompactWorkEntryRow, TimelineWorkEntryRow } from "./TimelineWorkEntryRow";
import {
  hasLeadingUserMedia,
  resolveUserTurnMarker,
  type UserTurnMarkerKind,
} from "./userTurnMarker";
import {
  canSubmitUserMessageEdit,
  capOpenWorkEntryRenderChunks,
  chunkTurnProcessItems,
  computeStableMessagesTimelineRows,
  deriveMessagesTimelineRows,
  findLiveReasoningEntryId,
  MAX_VISIBLE_WORK_LOG_ENTRIES,
  planWorkEntryRenderChunks,
  type MessagesTimelineRow,
  type AssistantTurnLayout,
  resolveAssistantMessageCopyState,
  resolveAssistantMessageDisplayText,
  type StableMessagesTimelineRowsState,
  type TurnProcessChunk,
  type TurnProcessItem,
  type TurnProcessPhase,
} from "./MessagesTimeline.logic";
import { summarizeToolCallGroup } from "./toolCallGroup.logic";
import { ToolCallGroupSummaryRow } from "./ToolCallGroupSummaryRow";
import { ThinkingStatus } from "./ThinkingStatus";
import { useTailAnchorScroll } from "./useTailAnchorScroll";
import { useTimelineRowOverlapGuard } from "./useTimelineRowOverlapGuard";
import { useI18n } from "~/i18n";
import {
  deriveDisplayedUserMessageState,
  type ParsedTerminalContextEntry,
} from "~/lib/terminalContext";
import { cn } from "~/lib/utils";
import { MUTED_LABEL_TEXT_CLASS_NAME } from "~/surfaceStyles";
import {
  DEFAULT_CHAT_FONT_SIZE_PX,
  normalizeChatFontSizePx,
  type TimestampFormat,
} from "../../localPreferences";
import {
  CHAT_COLUMN_FRAME_CLASS_NAME,
  CHAT_COLUMN_GUTTER_CLASS_NAME,
} from "./composerPickerStyles";
import { formatDayAwareTimestamp } from "../../timestampFormat";
import {
  buildInlineTerminalContextText,
  textContainsInlineTerminalContextLabels,
} from "./userMessageTerminalContexts";
import { splitPromptIntoDisplaySegments } from "~/composer-editor-mentions";
import {
  getChatMessageFooterTextStyle,
  getChatTranscriptTextStyle,
  getChatTranscriptUserMessageLineHeightPx,
  getChatTranscriptUserMessageTextStyle,
  USER_MESSAGE_BUBBLE_RADIUS_CLASS_NAME,
  USER_MESSAGE_BUBBLE_SHELL_CHROME_CLASS_NAME,
  userMessageBubbleBorderClassName,
} from "./chatTypography";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { DisclosureRegion } from "../ui/DisclosureRegion";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import {
  DISCLOSURE_CLEANUP_BUFFER_MS,
  DISCLOSURE_TRANSITION_MS,
  disclosureContentClassName,
} from "~/lib/disclosureMotion";
import { getAppTypographyScale } from "../../lib/appTypography";
import {
  USER_MESSAGE_COLLAPSED_FADE_LINES,
  USER_MESSAGE_COLLAPSED_MAX_LINES,
  userMessageLikelyOverflows,
} from "./userMessageCollapse";
import { observeUserMessageOverflow } from "./userMessageOverflowObserver";
import {
  resolveActiveTrailSnapshot,
  type ActiveTrailSnapshot,
  type MessageTrailAnchor,
} from "./messageTrail.logic";

// Changed-files list in the per-turn card is capped so large turns stay compact;
// the rest are revealed via an inline "Show more" row.
const MAX_VISIBLE_CHANGED_FILES = 5;
// The composer overlaps the transcript by design, so the list needs extra tail
// space beyond the overlap to keep final cards from sitting flush against it.
const BOTTOM_CONTENT_INSET_PX = 64;
const MESSAGE_HOVER_REVEAL_CLASS_NAME =
  "opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto";
// How long a jumped-to message keeps its highlight tint before fading back out.
const JUMP_HIGHLIGHT_DURATION_MS = 1200;
const MARKER_FINE_SCROLL_RETRY_TIMEOUT_MS = 900;
const MARKER_FINE_SCROLL_MAX_RETRY_FRAMES = 90;
const MESSAGE_SEND_ENTER_ANIMATION_MS = 180;
const EMPTY_TURN_DIFF_FILE_STATS = new Map<string, { additions: number; deletions: number }>();
const turnDiffFileStatsCache = new WeakMap<
  TurnDiffSummary,
  ReadonlyMap<string, { additions: number; deletions: number }>
>();

function turnDiffFileStats(
  summary: TurnDiffSummary | undefined,
): ReadonlyMap<string, { additions: number; deletions: number }> {
  if (!summary) return EMPTY_TURN_DIFF_FILE_STATS;
  const cached = turnDiffFileStatsCache.get(summary);
  if (cached) return cached;
  const stats = new Map(
    summary.files.map((file) => [
      file.path,
      { additions: file.additions ?? 0, deletions: file.deletions ?? 0 },
    ]),
  );
  turnDiffFileStatsCache.set(summary, stats);
  return stats;
}

function reasoningDisclosureDefaultOpen(entry: WorkLogEntry, turnIsLive: boolean): boolean {
  return (
    turnIsLive &&
    entry.tone !== "error" &&
    entry.toolStatus !== "failed" &&
    entry.liveActivity?.state !== "failed"
  );
}
const MESSAGE_SEND_ENTER_CLEANUP_BUFFER_MS = 60;
// Treat any partially visible row (>= 1px) as in view, so the navigation trail's
// "active" tick tracks the topmost rendered row rather than waiting for a turn to
// be substantially on-screen.
const TRAIL_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 0 } as const;
// The deep-link "active" ring is applied imperatively to the rendered marker spans so jumping
// never re-parses a message's markdown tree (the className is purely a CSS box-shadow).
const ACTIVE_MARKER_CLASS_NAME = "thread-marker-active";
const EMPTY_MESSAGE_MARKERS: readonly ThreadMarker[] = [];
const EMPTY_TURN_PROVENANCE: readonly OrchestrationTurnProvenance[] = [];
const EMPTY_THREAD_MARKERS_BY_MESSAGE_ID = new Map<MessageId, readonly ThreadMarker[]>();
const EMPTY_GOAL_ACHIEVEMENTS: readonly ThreadGoalAchievement[] = [];
const EMPTY_GOAL_ACHIEVEMENTS_BY_TURN_ID = new Map<TurnId, ThreadGoalAchievement>();
const EMPTY_MESSAGE_ID_SET: ReadonlySet<MessageId> = new Set();

// Imperative LegendList access goes through these module-level helpers instead of
// inline `ref.current` reads. The timeline's list ref is `listRef ?? fallbackListRef`,
// which React Compiler cannot recognize as a ref, so an inline `.current` read makes it
// infer a `ref.current` dependency that no manual dep array can declare — and the whole
// component bails out with "Existing memoization could not be preserved". Behind an
// opaque module-level call the inferred dependency is the ref object itself, matching the
// hand-written dep arrays. See MessagesTimeline.compiler.test.ts.
function scrollLegendListToEnd(listRef: RefObject<LegendListRef | null>): void {
  void listRef.current?.scrollToEnd?.({ animated: false });
}

function scrollLegendListToIndex(
  listRef: RefObject<LegendListRef | null>,
  params: Parameters<LegendListRef["scrollToIndex"]>[0],
): void {
  void listRef.current?.scrollToIndex(params);
}

function readLegendListState(
  listRef: RefObject<LegendListRef | null>,
): ReturnType<NonNullable<LegendListRef["getState"]>> | undefined {
  return listRef.current?.getState?.();
}

/**
 * Imperative handle the transcript exposes so the Environment panel's pinned-message
 * checklist can scroll the virtualized list to (and briefly flash) a specific message.
 */
export interface MessagesTimelineController {
  scrollToMessage: (messageId: MessageId) => void;
  scrollToMarker: (marker: ThreadMarker) => void;
}

// Keeps the origin/steer marker visually attached to the whole sent-message stack.
// Which marker (if any) applies comes from the shared resolveUserTurnMarker predicate,
// which the timelineHeight estimator also uses — keep presentation-only concerns here.
const USER_TURN_MARKER_PRESENTATION: Record<
  UserTurnMarkerKind,
  { readonly Icon: LucideIcon; readonly label: string }
> = {
  automation: { Icon: ClockIcon, label: "Sent via Automation" },
  agent: { Icon: BotIcon, label: "Sent by agent" },
  steer: { Icon: SteerIcon, label: "Steering conversation" },
};

function UserDispatchModeChip({
  dispatchMode,
  dispatchOrigin,
  hasLeadingMedia,
}: {
  dispatchMode: TimelineMessage["dispatchMode"];
  dispatchOrigin: TimelineMessage["dispatchOrigin"];
  hasLeadingMedia: boolean;
}) {
  const markerKind = resolveUserTurnMarker({ dispatchMode, dispatchOrigin });
  if (!markerKind) {
    return null;
  }

  const { Icon, label } = USER_TURN_MARKER_PRESENTATION[markerKind];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 self-end px-0 text-[11px] font-normal tracking-[0.01em] text-muted-foreground/78",
        hasLeadingMedia ? "mb-3" : "mb-1.5",
      )}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground/75" />
      <span>{label}</span>
    </div>
  );
}

function cssAttributeSelectorValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getMonotonicTimeMs(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

// A marker can split into several spans when its range crosses markdown nodes, so collect every
// rendered span for the marker (used both to scroll into view and to decorate the active ring).
function collectThreadMarkerElements(
  root: ParentNode | null,
  marker: Pick<ThreadMarker, "id" | "messageId">,
): HTMLElement[] {
  if (!root) {
    return [];
  }
  const messageId = cssAttributeSelectorValue(marker.messageId);
  const markerId = cssAttributeSelectorValue(marker.id);
  const selector = `[data-assistant-message-id="${messageId}"] [data-thread-marker-id="${markerId}"]`;
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

function findVisibleThreadMarkerElement(elements: readonly HTMLElement[]): HTMLElement | null {
  for (const element of elements) {
    if (element.getClientRects().length > 0) {
      return element;
    }
  }
  return null;
}

// Per-step status glyph for the worktree setup stepper. Mirrors the active
// task-list card: spinner while active, check when done, hollow node pending.
function WorktreeSetupStepGlyph({ status }: { status: WorktreeSetupStep["status"] }) {
  if (status === "done") {
    // Foreground (black) check, same box as the spinner so done/active nodes match.
    return <CircleCheckIcon className="size-2.5 text-[var(--color-text-foreground)]" />;
  }
  if (status === "active") {
    // Spinner sized to match the pending nodes, in foreground (black) so the
    // active step reads as the current work rather than an accent flourish.
    return <LoaderIcon className="size-2.5 animate-spin text-[var(--color-text-foreground)]" />;
  }
  if (status === "error") {
    return <CircleAlertIcon className="size-2.5 text-destructive" />;
  }
  // Lucide circles render at ~83% of their box, so an 8px ring matches the
  // visible diameter of the size-2.5 spinner/check glyphs.
  return <span className="block size-2 rounded-full border border-[color:var(--color-border)]" />;
}

// Transient "Preparing worktree..." panel: a compact bordered card with a
// git-branch header and a connected stepper. Hugs its content so it reads as a
// status chip rather than a full-width block.
function WorktreeSetupCard({
  steps,
  pendingAction,
  onResolve,
}: {
  steps: ReadonlyArray<WorktreeSetupStep>;
  pendingAction?: WorktreeSetupResolutionAction | null | undefined;
  onResolve?: ((action: WorktreeSetupResolutionAction) => void) | undefined;
}) {
  // The send pipeline only honors a resolution at checkpoints before the turn
  // dispatch, so hide the actions once "Starting session" is underway (or the
  // setup already failed) rather than offering a cancel that can no longer win.
  const canResolve =
    onResolve !== undefined &&
    steps.every((step) => step.status !== "error") &&
    !steps.some((step) => step.id === "start-session" && step.status !== "pending");
  return (
    <div className="w-fit max-w-full rounded-xl border border-[color:var(--color-border-light)] bg-[var(--color-background-elevated-primary)] px-3.5 py-3 font-system-ui shadow-xs">
      <div className="flex items-center gap-2">
        <WorktreeIcon className="size-3.5 shrink-0 text-[var(--color-text-foreground-tertiary)]" />
        <span className="shimmer text-[length:var(--app-font-size-activity,13px)] font-medium text-[var(--color-text-foreground-secondary)]">
          Preparing worktree...
        </span>
      </div>
      <ol className="mt-2 flex flex-col">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className="relative flex items-center gap-2.5 py-[3px]">
              {isLast ? null : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[6.5px] top-1/2 h-full w-px",
                    step.status === "done"
                      ? "bg-[var(--color-text-foreground)]"
                      : "bg-[color:var(--color-border)]",
                  )}
                />
              )}
              <span className="relative z-10 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-elevated-primary)]">
                <WorktreeSetupStepGlyph status={step.status} />
              </span>
              <span
                className={cn(
                  "text-[length:var(--app-font-size-activity,13px)] leading-[1.54]",
                  step.status === "active" || step.status === "done"
                    ? "text-[var(--color-text-foreground)]"
                    : step.status === "error"
                      ? "text-destructive"
                      : "text-[var(--color-text-foreground-tertiary)] opacity-70",
                )}
              >
                {step.label}
                {step.status === "error" ? " — failed" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {canResolve ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <Button
            size="xs"
            variant="outline"
            disabled={pendingAction != null}
            onClick={() => onResolve("work-locally")}
          >
            {pendingAction === "work-locally" ? "Switching to local..." : "Work locally"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={pendingAction != null}
            onClick={() => onResolve("cancel")}
          >
            {pendingAction === "cancel" ? "Cancelling..." : "Cancel"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AssistantTurnAvatar({
  provenance,
}: {
  readonly provenance: OrchestrationTurnProvenance | null;
}) {
  const selection = provenance?.modelSelection ?? null;
  return (
    <div
      aria-hidden="true"
      data-assistant-turn-avatar={selection ? "model" : "generic"}
      className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border-light)] bg-[var(--color-background-elevated-secondary)] text-foreground/80 shadow-[0_1px_2px_rgba(15,23,42,0.08)] max-[560px]:size-7 max-[560px]:rounded-[7.5px]"
    >
      {selection ? (
        <ModelIdentityIcon
          selection={selection}
          historical
          {...(provenance?.modelPresentationIdentity
            ? { identity: provenance.modelPresentationIdentity }
            : {})}
          className="size-5 max-[560px]:size-[18px]"
        />
      ) : (
        <BrainIcon className="size-[18px] max-[560px]:size-4" />
      )}
    </div>
  );
}

function AssistantTurnRowFrame({
  layout,
  timestamp,
  children,
}: {
  readonly layout: AssistantTurnLayout | undefined;
  readonly timestamp: string | null;
  readonly children: ReactNode;
}) {
  if (!layout) return <>{children}</>;
  const selection = layout.provenance?.modelSelection ?? null;
  const modelName =
    layout.provenance?.modelPresentationIdentity?.displayName ??
    (selection
      ? formatProviderModelOptionName({
          provider: selection.provider,
          slug: selection.model,
        })
      : "OmniMind");
  const engineName = selection ? PROVIDER_DISPLAY_NAMES[selection.provider] : null;
  return (
    <div
      className="grid min-w-0 grid-cols-[30px_minmax(0,1fr)] gap-x-3 max-[560px]:grid-cols-[28px_minmax(0,1fr)] max-[560px]:gap-x-2.5"
      data-assistant-turn-response={layout.responseId}
      data-assistant-turn-identity={layout.showIdentity ? "visible" : "continuation"}
    >
      {layout.showIdentity ? <AssistantTurnAvatar provenance={layout.provenance ?? null} /> : null}
      <div className="col-start-2 min-w-0" data-assistant-turn-content="true">
        {layout.showIdentity ? (
          <div className="mb-3 min-h-[30px] font-system-ui max-[560px]:min-h-7">
            <div
              data-assistant-turn-model="true"
              className="truncate font-semibold leading-[1.15] tracking-[-0.012em] text-foreground/92"
              style={{ fontSize: "12.75px" }}
              title={modelName}
            >
              {modelName}
            </div>
            <div
              data-assistant-turn-engine-time="true"
              className="mt-0.5 truncate font-normal leading-[1.2] text-muted-foreground/55 tabular-nums"
              style={{ fontSize: "10.25px" }}
            >
              {engineName && timestamp ? `${engineName} · ${timestamp}` : (timestamp ?? engineName)}
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

interface MessagesTimelineProps {
  hasMessages: boolean;
  isWorking: boolean;
  activeTurnInProgress: boolean;
  activeTurnStartedAt: string | null;
  turnProcessPhase?: TurnProcessPhase;
  /** Transient "New worktree" setup progress; rendered as an ephemeral step card at the tail. */
  worktreeSetup?: WorktreeSetupSnapshot | null;
  /** Action already chosen from the worktree setup card; disables its buttons while it applies. */
  worktreeSetupPendingAction?: WorktreeSetupResolutionAction | null;
  /** Resolve the in-flight worktree preparation (cancel the send or fall back to the local checkout). */
  onResolveWorktreeSetup?: (action: WorktreeSetupResolutionAction) => void;
  followLiveOutput?: boolean;
  emptyStateContent?: ReactNode;
  listRef?: RefObject<LegendListRef | null>;
  /** Receives the scroll-to-message controller so the Environment panel can jump to a pin. */
  controllerRef?: RefObject<MessagesTimelineController | null>;
  /** Message ids currently pinned for the active thread (drives the footer pin toggle state). */
  pinnedMessageIds?: ReadonlySet<MessageId>;
  /** Excludes transient rows from persistent pin affordances. */
  canPinMessage?: (messageId: MessageId) => boolean;
  /** Toggle a message's pinned state from the assistant footer. */
  onTogglePinMessage?: (messageId: MessageId) => void;
  /** True only for persisted, settled assistant messages before the transcript tail. */
  canForkMessage?: (messageId: MessageId) => boolean;
  /** Create a history-only fork through the selected assistant message. */
  onForkMessage?: (messageId: MessageId) => void;
  /** Text markers for assistant messages in the active thread. */
  threadMarkers?: readonly ThreadMarker[];
  /** Recorded goal achievements anchored to the terminal assistant message for their turn. */
  goalAchievements?: readonly ThreadGoalAchievement[];
  /** User messages inserted locally by send actions, eligible for the subtle enter affordance. */
  enteringUserMessageIds?: ReadonlySet<MessageId>;
  /**
   * Just-sent user message to anchor at the top of the viewport for the live turn.
   * While set, the tail spacer reserves the space below it so the streaming response
   * fills the remaining viewport; null releases the reserve after overflow or reader takeover.
   */
  tailAnchorMessageId?: MessageId | null;
  /** Releases a send anchor after the streamed tail permanently exhausts its reserve. */
  onTailAnchorOverflow?: (messageId: MessageId) => void;
  /**
   * Shared flag set by ChatView on send and cleared by the tail-anchor hook once
   * the anchored slide settles; ChatView's auto-follow re-snaps pause while set.
   */
  tailAnchorScrollInFlightRef?: RefObject<boolean> | undefined;
  /** Provenance for a conversation created from another OmniMind task. */
  crossTaskOrigin?: CrossTaskOrigin | null;
  /** Immediate source chat for a forked transcript. */
  forkSource?: ForkSourceReference | null;
  /** Marks the transcript as a temporary chat so user bubbles render the dashed primary outline. */
  isTemporaryThread?: boolean;
  timelineEntries: ReturnType<typeof deriveTimelineEntries>;
  turnProvenance?: readonly OrchestrationTurnProvenance[];
  turnDiffSummaryByAssistantMessageId: Map<MessageId, TurnDiffSummary>;
  nowIso?: string;
  expandedWorkGroups?: Record<string, boolean>;
  onToggleWorkGroup?: (groupId: string) => void;
  onOpenAgentActivity?: (activityId: string) => void;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
  onOpenThread?: (threadId: ThreadId) => void;
  /** Open an automation's detail page from a "created automation" transcript card. */
  onOpenAutomation?: (automationId: string) => void;
  onOpenEngineWebSurface?: (surfaceId: string) => void;
  revertTurnCountByUserMessageId: Map<MessageId, number>;
  onRevertUserMessage: (messageId: MessageId) => void;
  onUndoTurnFiles?: (turnCounts: readonly number[]) => void;
  onEditUserMessage?: (messageId: MessageId, text: string) => boolean | Promise<boolean>;
  /**
   * The user message the edit affordance may target, resolved by the owner from
   * the raw thread messages (the same list the server-side edit policy
   * validates). The timeline must not re-derive this from its own rows: they are
   * createdAt-sorted and include optimistic/filtered entries, so a row-derived
   * target can point at a message the server rejects.
   */
  editableUserMessageId?: MessageId | null;
  activeTurnId?: TurnId | null;
  isRevertingCheckpoint: boolean;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  onIsAtEndChange?: (isAtEnd: boolean) => void;
  /** Emits current + visible sent-message anchors as the viewport scrolls (drives the trail). */
  onTrailHighlightsChange?: (snapshot: ActiveTrailSnapshot) => void;
  onMessagesClickCapture?: ComponentProps<typeof LegendList>["onClickCapture"];
  onMessagesMouseUp?: ComponentProps<typeof LegendList>["onMouseUp"];
  onMessagesPointerCancel?: ComponentProps<typeof LegendList>["onPointerCancel"];
  onMessagesPointerDown?: ComponentProps<typeof LegendList>["onPointerDown"];
  onMessagesPointerUp?: ComponentProps<typeof LegendList>["onPointerUp"];
  onMessagesScroll?: ComponentProps<typeof LegendList>["onScroll"];
  onMessagesTouchEnd?: ComponentProps<typeof LegendList>["onTouchEnd"];
  onMessagesTouchMove?: ComponentProps<typeof LegendList>["onTouchMove"];
  onMessagesTouchStart?: ComponentProps<typeof LegendList>["onTouchStart"];
  onMessagesWheel?: ComponentProps<typeof LegendList>["onWheel"];
  markdownCwd: string | undefined;
  resolvedTheme: "light" | "dark";
  chatFontSizePx?: number;
  timestampFormat: TimestampFormat;
  workspaceRoot: string | undefined;
  /**
   * Right padding (px) applied to the scroll viewport so transcript rows clear a right-edge
   * overlay (e.g. the docked Environment card). The scrollbar stays pinned to the viewport's
   * far right; only the content is inset.
   */
  contentInsetRightPx?: number | undefined;
  /**
   * Bottom padding (px) applied to the scroll viewport so transcript rows clear the
   * floating composer. Passed through `style` (not a class) on purpose: LegendList reads
   * style padding, so it can account for the inset in its own end-space math.
   */
  contentInsetBottomPx?: number | undefined;
  /** Measured distance from the composer's bottom edge to the top of its footer controls. */
  contentInsetBottomClearancePx?: number | undefined;
}

export const MessagesTimeline = memo(function MessagesTimeline({
  hasMessages,
  isWorking,
  activeTurnInProgress,
  activeTurnStartedAt,
  turnProcessPhase,
  worktreeSetup: worktreeSetupProp,
  worktreeSetupPendingAction: worktreeSetupPendingActionProp,
  onResolveWorktreeSetup,
  followLiveOutput: followLiveOutputProp,
  listRef,
  controllerRef,
  pinnedMessageIds,
  canPinMessage,
  onTogglePinMessage,
  canForkMessage,
  onForkMessage,
  threadMarkers: threadMarkersProp,
  goalAchievements: goalAchievementsProp,
  enteringUserMessageIds: enteringUserMessageIdsProp,
  tailAnchorMessageId: tailAnchorMessageIdProp,
  onTailAnchorOverflow,
  tailAnchorScrollInFlightRef,
  crossTaskOrigin: crossTaskOriginProp,
  forkSource: forkSourceProp,
  isTemporaryThread: isTemporaryThreadProp,
  timelineEntries,
  turnProvenance: turnProvenanceProp,
  turnDiffSummaryByAssistantMessageId,
  nowIso,
  expandedWorkGroups,
  onToggleWorkGroup,
  onOpenAgentActivity,
  onOpenTurnDiff,
  onOpenThread,
  onOpenAutomation,
  onOpenEngineWebSurface,
  revertTurnCountByUserMessageId,
  onRevertUserMessage,
  onUndoTurnFiles,
  onEditUserMessage,
  editableUserMessageId,
  activeTurnId,
  isRevertingCheckpoint,
  onImageExpand,
  onIsAtEndChange,
  onTrailHighlightsChange,
  onMessagesClickCapture,
  onMessagesMouseUp,
  onMessagesPointerCancel,
  onMessagesPointerDown,
  onMessagesPointerUp,
  onMessagesScroll,
  onMessagesTouchEnd,
  onMessagesTouchMove,
  onMessagesTouchStart,
  onMessagesWheel,
  markdownCwd,
  resolvedTheme,
  chatFontSizePx: chatFontSizePxProp,
  timestampFormat,
  workspaceRoot,
  emptyStateContent,
  contentInsetRightPx,
  contentInsetBottomPx,
  contentInsetBottomClearancePx,
}: MessagesTimelineProps) {
  const { locale, t, thinkingHints } = useI18n();
  // Prop defaults are resolved in the body rather than in the destructuring pattern:
  // an `AssignmentPattern` in the parameter list makes React Compiler bail out on the
  // entire component (silently, since `panicThreshold` is unset), which would drop
  // memoization for the whole transcript. See MessagesTimeline.compiler.test.ts.
  const worktreeSetup = worktreeSetupProp ?? null;
  const worktreeSetupPendingAction = worktreeSetupPendingActionProp ?? null;
  const followLiveOutput = followLiveOutputProp ?? false;
  const threadMarkers = threadMarkersProp ?? EMPTY_MESSAGE_MARKERS;
  const turnProvenance = turnProvenanceProp ?? EMPTY_TURN_PROVENANCE;
  const enteringUserMessageIds = enteringUserMessageIdsProp ?? EMPTY_MESSAGE_ID_SET;
  const tailAnchorMessageId = tailAnchorMessageIdProp ?? null;
  const forkSource = forkSourceProp ?? null;
  const isTemporaryThread = isTemporaryThreadProp ?? false;
  // Resolve one wall-clock reference per render so every visible row makes the
  // same calendar-day decision, including a render that lands at midnight.
  const timestampNow = nowIso ? new Date(nowIso) : new Date();
  const userMessageBubbleBorderClass = userMessageBubbleBorderClassName(isTemporaryThread);
  // The timeline remounts per thread (and when the agent-activity detail view
  // closes), but the anchor lives above it and survives those remounts. An
  // anchor that is already set at mount time therefore describes a slide that
  // has *already* played — re-entry must land at the anchored end directly
  // rather than replaying the glide from the top of the whole conversation.
  const [inheritedTailAnchorMessageId] = useState<MessageId | null>(
    () => tailAnchorMessageIdProp ?? null,
  );
  const hasInheritedTailAnchor =
    inheritedTailAnchorMessageId !== null && tailAnchorMessageId === inheritedTailAnchorMessageId;
  const [settledTailAnchorMessageId, setSettledTailAnchorMessageId] = useState<MessageId | null>(
    () => inheritedTailAnchorMessageId,
  );
  const tailAnchorSlideInFlight =
    tailAnchorMessageId !== null && tailAnchorMessageId !== settledTailAnchorMessageId;
  const handleTailAnchorSlideFinished = useCallback((messageId: MessageId) => {
    setSettledTailAnchorMessageId((current) => (current === messageId ? current : messageId));
  }, []);
  const crossTaskOrigin = crossTaskOriginProp ?? null;
  const normalizedChatFontSizePx = normalizeChatFontSizePx(
    chatFontSizePxProp ?? DEFAULT_CHAT_FONT_SIZE_PX,
  );
  // Inset rows from the right (overriding the gutter's right padding) without moving the
  // scroll viewport, so the scrollbar stays pinned to the far right while content clears
  // any right-edge overlay. Kept stable so LegendList isn't re-rendered on unrelated updates.
  // The bottom inset clears the floating composer the transcript scrolls under; it is
  // padding on the scroll viewport (not a taller footer) so the list's own footer-layout
  // and initial-scroll machinery is never resized from outside. The mask dissolves rows
  // as they pass behind the composer's glass so nothing remains visible behind its
  // footer controls (see composerOverlayScrollMaskImage).
  const listScrollStyle = useMemo(() => {
    if (!contentInsetRightPx && !contentInsetBottomPx) {
      return undefined;
    }
    const style: CSSProperties & { "--app-chat-content-inset-right"?: string } = {};
    if (contentInsetRightPx) {
      style.paddingRight = contentInsetRightPx;
      style["--app-chat-content-inset-right"] = `${contentInsetRightPx}px`;
    }
    if (contentInsetBottomPx) {
      style.paddingBottom = contentInsetBottomPx;
      const maskImage = composerOverlayScrollMaskImage(
        contentInsetBottomPx,
        contentInsetBottomClearancePx,
      );
      if (maskImage) {
        style.maskImage = maskImage;
        style.WebkitMaskImage = maskImage;
      }
    }
    return style;
  }, [contentInsetBottomClearancePx, contentInsetBottomPx, contentInsetRightPx]);
  const appTypographyScale = useMemo(
    () => getAppTypographyScale(normalizedChatFontSizePx),
    [normalizedChatFontSizePx],
  );
  const chatTypographyStyle = useMemo(
    () => getChatTranscriptTextStyle(normalizedChatFontSizePx),
    [normalizedChatFontSizePx],
  );
  const userMessageTypographyStyle = useMemo(
    () => getChatTranscriptUserMessageTextStyle(normalizedChatFontSizePx),
    [normalizedChatFontSizePx],
  );
  const chatMessageFooterStyle = useMemo(
    () => getChatMessageFooterTextStyle(normalizedChatFontSizePx),
    [normalizedChatFontSizePx],
  );
  const [localExpandedWorkGroups, setLocalExpandedWorkGroups] = useState<Record<string, boolean>>(
    {},
  );
  const expandedWorkGroupsState = expandedWorkGroups ?? localExpandedWorkGroups;
  const handleToggleWorkGroup = useCallback(
    (groupId: string) => {
      if (onToggleWorkGroup) {
        onToggleWorkGroup(groupId);
        return;
      }
      setLocalExpandedWorkGroups((current) => ({
        ...current,
        [groupId]: !(current[groupId] ?? false),
      }));
    },
    [onToggleWorkGroup],
  );
  const [turnProcessOpenState, setTurnProcessOpenState] = useState<
    Record<string, { phase: TurnProcessPhase["kind"]; open: boolean }>
  >({});
  const setTurnProcessOpen = useCallback(
    (rowId: string, phase: TurnProcessPhase["kind"], open: boolean) => {
      setTurnProcessOpenState((current) => ({
        ...current,
        [rowId]: { phase, open },
      }));
    },
    [],
  );
  // Manual open/closed overrides for the collapsed tool-group summary rows,
  // keyed per group. Deliberately separate from expandedWorkGroupsState, whose
  // meaning is "show rows past the live +N cap".
  const [toolGroupSummaryOverrides, setToolGroupSummaryOverrides] = useState<
    Record<string, boolean>
  >({});
  const setToolGroupSummaryOpen = useCallback((groupKey: string, open: boolean) => {
    setToolGroupSummaryOverrides((current) => ({
      ...current,
      [groupKey]: open,
    }));
  }, []);
  // Manual reasoning disclosure choices live at the Timeline owner so they
  // survive a row moving between standalone, leading, inline, and settled
  // projections as new causal events arrive. Automatic live-tail defaults are
  // used only until the user makes an explicit choice for that reasoning group.
  const [reasoningDisclosureOverrides, setReasoningDisclosureOverrides] = useState<
    Record<string, boolean>
  >({});
  const setReasoningDisclosureOpen = useCallback((entryId: string, open: boolean) => {
    setReasoningDisclosureOverrides((current) =>
      current[entryId] === open ? current : { ...current, [entryId]: open },
    );
  }, []);
  const [expandedFileChangesByTurnId, setExpandedFileChangesByTurnId] = useState<
    Record<string, boolean>
  >({});
  // Tracks which turns have their changed-files list expanded past MAX_VISIBLE_CHANGED_FILES.
  const [expandedFileListByTurnId, setExpandedFileListByTurnId] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedUserMessagesById, setExpandedUserMessagesById] = useState<Record<string, boolean>>(
    {},
  );
  const [editingUserMessageId, setEditingUserMessageId] = useState<MessageId | null>(null);
  const [submittingEditedUserMessageId, setSubmittingEditedUserMessageId] =
    useState<MessageId | null>(null);
  // Transient highlight applied to a message jumped-to from the pinned-message checklist.
  const [highlightedMessageId, setHighlightedMessageId] = useState<MessageId | null>(null);
  // Index markers once per update so each assistant row avoids a full marker scan.
  const threadMarkersByMessageId = useMemo<ReadonlyMap<MessageId, readonly ThreadMarker[]>>(() => {
    if (threadMarkers.length === 0) {
      return EMPTY_THREAD_MARKERS_BY_MESSAGE_ID;
    }
    const byMessageId = new Map<MessageId, ThreadMarker[]>();
    for (const marker of threadMarkers) {
      const messageMarkers = byMessageId.get(marker.messageId);
      if (messageMarkers) {
        messageMarkers.push(marker);
      } else {
        byMessageId.set(marker.messageId, [marker]);
      }
    }
    return byMessageId;
  }, [threadMarkers]);
  // Index achievements by the turn whose completion achieved the goal, so each
  // badge anchors to that turn's terminal assistant message. Last one wins per
  // turn (a turn can only end one goal at a time anyway).
  const goalAchievements = goalAchievementsProp ?? EMPTY_GOAL_ACHIEVEMENTS;
  const goalAchievementByTurnId = useMemo<ReadonlyMap<TurnId, ThreadGoalAchievement>>(() => {
    if (goalAchievements.length === 0) {
      return EMPTY_GOAL_ACHIEVEMENTS_BY_TURN_ID;
    }
    const byTurnId = new Map<TurnId, ThreadGoalAchievement>();
    for (const achievement of goalAchievements) {
      if (achievement.turnId !== null) {
        byTurnId.set(achievement.turnId, achievement);
      }
    }
    return byTurnId;
  }, [goalAchievements]);
  const fallbackListRef = useRef<LegendListRef | null>(null);
  const resolvedListRef = listRef ?? fallbackListRef;
  const timelineRootRef = useRef<HTMLDivElement | null>(null);
  const tailAnchorEndSpaceSizeRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    tailAnchorEndSpaceSizeRef.current = null;
  }, [tailAnchorMessageId]);
  const observeTimelineRow = useTimelineRowOverlapGuard();
  useTailAnchorScroll({
    listRef: resolvedListRef,
    timelineRootRef,
    // An inherited anchor already reached its resting position before this
    // mount; the list bootstraps there via `initialScrollAtEnd` instead.
    anchorMessageId: hasInheritedTailAnchor ? null : tailAnchorMessageId,
    anchorScrollInFlightRef: tailAnchorScrollInFlightRef,
    onAnchorSlideFinished: handleTailAnchorSlideFinished,
    onAnchorOverflow: onTailAnchorOverflow,
    contentChangeSignal: timelineEntries,
    anchorEndSpaceSizeRef: tailAnchorEndSpaceSizeRef,
    animateAnchorSlide: !followLiveOutput,
    holdAnchorWhileLive: isWorking || activeTurnInProgress || followLiveOutput,
  });

  const presentedWorktreeSetup = useWorktreeSetupPresentation(worktreeSetup);
  const rawRows = useMemo(
    () =>
      deriveMessagesTimelineRows({
        timelineEntries,
        isWorking,
        worktreeSetup: presentedWorktreeSetup?.snapshot ?? null,
        worktreeSetupOpen: presentedWorktreeSetup?.open ?? false,
        activeTurnInProgress,
        activeTurnId,
        activeTurnStartedAt,
        turnProcessPhase,
        turnDiffSummaryByAssistantMessageId,
        revertTurnCountByUserMessageId,
        turnProvenance,
      }),
    [
      timelineEntries,
      isWorking,
      presentedWorktreeSetup,
      activeTurnInProgress,
      activeTurnId,
      activeTurnStartedAt,
      turnProcessPhase,
      turnDiffSummaryByAssistantMessageId,
      revertTurnCountByUserMessageId,
      turnProvenance,
    ],
  );
  const rows = useStableRows(rawRows);
  const liveReasoningEntryId = useMemo(
    () =>
      activeTurnInProgress || isWorking
        ? findLiveReasoningEntryId(timelineEntries, activeTurnId ?? null)
        : null,
    [activeTurnId, activeTurnInProgress, isWorking, timelineEntries],
  );
  const canRenderForkSourceDivider = forkSource !== null && onOpenThread !== undefined;
  const forkSourceDivider = useMemo(
    () =>
      forkSource && onOpenThread ? (
        <ForkSourceDivider source={forkSource} onOpenSourceThread={onOpenThread} />
      ) : null,
    [forkSource, onOpenThread],
  );
  const forkDividerBeforeRowId = useMemo(() => {
    if (!canRenderForkSourceDivider) {
      return null;
    }
    let lastImportedMessageIndex = -1;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]!;
      if (row.kind === "message" && row.message.source === "fork-import") {
        lastImportedMessageIndex = index;
      }
    }
    return rows[lastImportedMessageIndex + 1]?.id ?? null;
  }, [canRenderForkSourceDivider, rows]);
  const forkDividerAtEnd = canRenderForkSourceDivider && forkDividerBeforeRowId === null;
  // Fixed bottom content inset. The variable space that lets a just-sent
  // message anchor at the viewport top is reserved natively by LegendList's
  // `anchoredEndSpace` below, not by resizing this footer — resizing the footer
  // from outside fights the list's own footer-layout and initial-scroll
  // machinery (visible as send-time scroll jumps).
  const listFooter = useMemo(
    () => (
      <>
        {forkDividerAtEnd ? (
          <div className={cn(CHAT_COLUMN_FRAME_CLASS_NAME, "px-1")}>{forkSourceDivider}</div>
        ) : null}
        <div
          aria-hidden="true"
          data-tail-anchor-spacer="true"
          style={{ height: BOTTOM_CONTENT_INSET_PX }}
        />
      </>
    ),
    [forkDividerAtEnd, forkSourceDivider],
  );
  // Native reserve for the anchored send: LegendList sizes an end space so the
  // anchor row can sit at the viewport top when scrolled to the end, keeps that
  // reserve in sync with measured tail sizes inside its own layout pass, and
  // shrinks it to zero as the streaming response grows (automatic hand-off to
  // follow-the-tail). `anchorOffset` carries the container's own CSS vertical
  // padding, which the list cannot see (it only reads style props), so that
  // "at end" lands the anchor exactly one top-inset below the viewport top.
  const tailAnchorRowIndex = useMemo(() => {
    if (tailAnchorMessageId === null) {
      return -1;
    }
    return rows.findIndex(
      (row) => row.kind === "message" && row.message.id === tailAnchorMessageId,
    );
  }, [rows, tailAnchorMessageId]);
  const [anchorVerticalInsetPx, setAnchorVerticalInsetPx] = useState(0);
  useLayoutEffect(() => {
    if (tailAnchorMessageId === null) {
      return;
    }
    const node: unknown = resolvedListRef.current?.getScrollableNode?.();
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const style = getComputedStyle(node);
    // Only the *class-based* padding belongs here. The composer inset is applied through
    // `style.paddingBottom`, which the list already reads and reserves for itself —
    // counting it twice would push the anchored message a composer-height off the top.
    const bottomPadding = Math.max(
      0,
      (Number.parseFloat(style.paddingBottom) || 0) - (contentInsetBottomPx ?? 0),
    );
    const inset = (Number.parseFloat(style.paddingTop) || 0) + bottomPadding;
    setAnchorVerticalInsetPx((current) => (Math.abs(current - inset) > 0.5 ? inset : current));
  }, [contentInsetBottomPx, resolvedListRef, tailAnchorMessageId]);
  const handleInheritedTailAnchorReady = useCallback(
    ({ size }: { size: number }) => {
      // A timeline remount can inherit an anchor after its response has already
      // overflowed. The slide hook intentionally does not replay on re-entry,
      // so close the same one-way lifecycle boundary from LegendList's first
      // complete measurement instead.
      if (hasInheritedTailAnchor && size <= 0.5 && tailAnchorMessageId !== null) {
        onTailAnchorOverflow?.(tailAnchorMessageId);
      }
    },
    [hasInheritedTailAnchor, onTailAnchorOverflow, tailAnchorMessageId],
  );
  const anchoredEndSpace = useMemo<AnchoredEndSpaceConfig | undefined>(
    () =>
      tailAnchorRowIndex < 0
        ? undefined
        : {
            anchorIndex: tailAnchorRowIndex,
            anchorOffset: anchorVerticalInsetPx,
            onReady: handleInheritedTailAnchorReady,
          },
    [anchorVerticalInsetPx, handleInheritedTailAnchorReady, tailAnchorRowIndex],
  );
  // `anchoredEndSpaceSize` is an internal LegendList signal used to distinguish
  // a live reserve from a true overflow and to expose that boundary to browser
  // regression tests. Its
  // public listener union deliberately omits it, so narrow the internal hook
  // locally rather than weakening the ref type throughout the transcript.
  useEffect(() => {
    const state = resolvedListRef.current?.getState?.();
    const listenForAnchoredEndSpace = state?.listen as
      | ((listenerType: "anchoredEndSpaceSize", callback: (size: number) => void) => () => void)
      | undefined;
    return listenForAnchoredEndSpace?.("anchoredEndSpaceSize", (size) => {
      timelineRootRef.current?.setAttribute("data-anchored-end-space", String(Math.round(size)));
      if (size > 0.5) {
        tailAnchorEndSpaceSizeRef.current = size;
      } else if (tailAnchorEndSpaceSizeRef.current !== null) {
        // Initial zero is only the unmeasured state. Zero becomes exhaustion
        // after this anchor has owned a real positive reserve.
        tailAnchorEndSpaceSizeRef.current = 0;
      }
    });
  }, [resolvedListRef]);
  const firstUserMessageId = useMemo(() => {
    for (const row of rows) {
      if (row.kind === "message" && row.message.role === "user") {
        return row.message.id;
      }
    }
    return null;
  }, [rows]);
  const enteringMessageRowIds = useMessageSendEnterAnimations(rows, enteringUserMessageIds);
  const timelineExtraData = useMemo(
    () => ({
      crossTaskOrigin,
      editingUserMessageId,
      enteringMessageRowIds,
      turnProcessOpenState,
      expandedFileChangesByTurnId,
      expandedFileListByTurnId,
      expandedUserMessagesById,
      expandedWorkGroupsState,
      firstUserMessageId,
      highlightedMessageId,
      pinnedMessageIds,
      reasoningDisclosureOverrides,
      submittingEditedUserMessageId,
      threadMarkersByMessageId,
      toolGroupSummaryOverrides,
    }),
    [
      crossTaskOrigin,
      editingUserMessageId,
      enteringMessageRowIds,
      turnProcessOpenState,
      expandedFileChangesByTurnId,
      expandedFileListByTurnId,
      expandedUserMessagesById,
      expandedWorkGroupsState,
      firstUserMessageId,
      highlightedMessageId,
      pinnedMessageIds,
      reasoningDisclosureOverrides,
      submittingEditedUserMessageId,
      threadMarkersByMessageId,
      toolGroupSummaryOverrides,
    ],
  );
  // Latest rows kept in a ref so the imperative scroll controller can look up a message's
  // index lazily without re-installing the controller on every transcript change.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const jumpHighlightTimeoutRef = useRef<number | null>(null);
  const markerFineScrollFrameRef = useRef<number | null>(null);
  // Marker spans currently carrying the deep-link "active" ring, tracked so the decoration can be
  // toggled imperatively (no markdown re-parse) and reliably cleared on the next jump or teardown.
  const decoratedMarkerElementsRef = useRef<HTMLElement[]>([]);
  const clearActiveMarkerDecoration = useCallback(() => {
    for (const element of decoratedMarkerElementsRef.current) {
      element.classList.remove(ACTIVE_MARKER_CLASS_NAME);
    }
    decoratedMarkerElementsRef.current = [];
  }, []);
  const applyActiveMarkerDecoration = useCallback(
    (elements: readonly HTMLElement[]) => {
      clearActiveMarkerDecoration();
      for (const element of elements) {
        element.classList.add(ACTIVE_MARKER_CLASS_NAME);
      }
      decoratedMarkerElementsRef.current = [...elements];
    },
    [clearActiveMarkerDecoration],
  );
  useEffect(
    () => () => {
      if (jumpHighlightTimeoutRef.current !== null) {
        window.clearTimeout(jumpHighlightTimeoutRef.current);
      }
      if (markerFineScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(markerFineScrollFrameRef.current);
      }
      clearActiveMarkerDecoration();
    },
    [clearActiveMarkerDecoration],
  );
  useEffect(() => {
    if (!controllerRef) {
      return;
    }
    const scrollToMessage = (messageId: MessageId) => {
      const index = rowsRef.current.findIndex(
        (row) => row.kind === "message" && row.message.id === messageId,
      );
      if (index < 0) {
        return false;
      }
      scrollLegendListToIndex(resolvedListRef, {
        index,
        animated: true,
        viewPosition: 0.2,
      });
      return true;
    };
    const clearJumpHighlightAfterDelay = () => {
      if (jumpHighlightTimeoutRef.current !== null) {
        window.clearTimeout(jumpHighlightTimeoutRef.current);
      }
      jumpHighlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null);
        clearActiveMarkerDecoration();
        jumpHighlightTimeoutRef.current = null;
      }, JUMP_HIGHLIGHT_DURATION_MS);
    };
    const cancelPendingMarkerFineScroll = () => {
      if (markerFineScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(markerFineScrollFrameRef.current);
        markerFineScrollFrameRef.current = null;
      }
    };
    const scheduleMarkerFineScroll = (marker: ThreadMarker) => {
      cancelPendingMarkerFineScroll();
      const deadlineMs = getMonotonicTimeMs() + MARKER_FINE_SCROLL_RETRY_TIMEOUT_MS;
      let attempts = 0;
      const tick = () => {
        markerFineScrollFrameRef.current = null;
        const elements = collectThreadMarkerElements(timelineRootRef.current, marker);
        const visibleElement = findVisibleThreadMarkerElement(elements);
        if (visibleElement) {
          applyActiveMarkerDecoration(elements);
          visibleElement.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth",
          });
          return;
        }
        attempts += 1;
        if (getMonotonicTimeMs() <= deadlineMs && attempts < MARKER_FINE_SCROLL_MAX_RETRY_FRAMES) {
          markerFineScrollFrameRef.current = window.requestAnimationFrame(tick);
        }
      };
      markerFineScrollFrameRef.current = window.requestAnimationFrame(tick);
    };
    const controller: MessagesTimelineController = {
      scrollToMessage: (messageId) => {
        cancelPendingMarkerFineScroll();
        clearActiveMarkerDecoration();
        if (!scrollToMessage(messageId)) {
          return;
        }
        setHighlightedMessageId(messageId);
        clearJumpHighlightAfterDelay();
      },
      scrollToMarker: (marker) => {
        clearActiveMarkerDecoration();
        if (!scrollToMessage(marker.messageId)) {
          return;
        }
        setHighlightedMessageId(marker.messageId);
        clearJumpHighlightAfterDelay();
        scheduleMarkerFineScroll(marker);
      },
    };
    controllerRef.current = controller;
    return () => {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [controllerRef, resolvedListRef, applyActiveMarkerDecoration, clearActiveMarkerDecoration]);
  const tailContentRowId = useMemo(() => {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const row = rows[index]!;
      if (row.kind !== "worktree-setup") return row.id;
    }
    return null;
  }, [rows]);
  const tailScrollFrameRef = useRef<number | null>(null);
  const tailScrollTimeoutsRef = useRef<number[]>([]);
  const tailExpansionScrollSuppressedRef = useRef(false);
  const clearTailExpansionScrollTimers = useCallback(() => {
    if (tailScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(tailScrollFrameRef.current);
      tailScrollFrameRef.current = null;
    }
    for (const timeoutId of tailScrollTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    tailScrollTimeoutsRef.current = [];
  }, []);
  const scrollTailExpansionToEnd = useCallback(() => {
    clearTailExpansionScrollTimers();
    if (tailExpansionScrollSuppressedRef.current) {
      return;
    }
    const scrollToEnd = () => {
      scrollLegendListToEnd(resolvedListRef);
    };
    tailScrollFrameRef.current = window.requestAnimationFrame(() => {
      tailScrollFrameRef.current = null;
      scrollToEnd();
    });
    for (const delay of [80, 180, 260]) {
      const timeoutId = window.setTimeout(scrollToEnd, delay);
      tailScrollTimeoutsRef.current.push(timeoutId);
    }
  }, [clearTailExpansionScrollTimers, resolvedListRef]);
  useEffect(() => clearTailExpansionScrollTimers, [clearTailExpansionScrollTimers]);
  const ignoreTimelineImageLoad = useCallback(() => {}, []);
  const latestEditableUserMessageId = editableUserMessageId ?? null;
  const previousRowCountRef = useRef(rows.length);
  useEffect(() => {
    const previousRowCount = previousRowCountRef.current;
    previousRowCountRef.current = rows.length;
    if (previousRowCount > 0 || rows.length === 0) {
      return;
    }
    onIsAtEndChange?.(true);
    const frameId = window.requestAnimationFrame(() => {
      scrollLegendListToEnd(resolvedListRef);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [onIsAtEndChange, resolvedListRef, rows.length]);
  // Sent-message anchors (id + position in the virtualized row list) for the
  // navigation trail. Held in a ref so the viewability callback stays stable and
  // doesn't re-subscribe LegendList on every transcript change.
  const userMessageAnchors = useMemo<MessageTrailAnchor[]>(() => {
    const anchors: MessageTrailAnchor[] = [];
    rows.forEach((row, index) => {
      if (row.kind === "message" && row.message.role === "user") {
        anchors.push({ id: row.message.id, rowIndex: index });
      }
    });
    return anchors;
  }, [rows]);
  const userMessageAnchorsRef = useRef(userMessageAnchors);
  useLayoutEffect(() => {
    userMessageAnchorsRef.current = userMessageAnchors;
  }, [userMessageAnchors]);
  const emitTrailHighlightsForViewport = useCallback(
    (topRowIndex: number, bottomRowIndex: number) => {
      if (!onTrailHighlightsChange || !Number.isFinite(topRowIndex)) {
        return;
      }
      onTrailHighlightsChange(
        resolveActiveTrailSnapshot(userMessageAnchorsRef.current, topRowIndex, bottomRowIndex),
      );
    },
    [onTrailHighlightsChange],
  );
  // Trail highlighting is presentation-only and can be coalesced to one read per frame.
  // At-end ownership remains synchronous so a user gesture cannot lose to auto-follow.
  const listScrollFrameRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (listScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(listScrollFrameRef.current);
        listScrollFrameRef.current = null;
      }
    };
  }, []);
  const handleListScroll = useCallback<NonNullable<MessagesTimelineProps["onMessagesScroll"]>>(
    (event) => {
      onMessagesScroll?.(event);
      const state = readLegendListState(resolvedListRef);
      if (!state) return;
      tailExpansionScrollSuppressedRef.current = !state.isAtEnd;
      if (!state.isAtEnd) {
        clearTailExpansionScrollTimers();
      }
      onIsAtEndChange?.(state.isAtEnd);
      if (listScrollFrameRef.current !== null) return;
      listScrollFrameRef.current = window.requestAnimationFrame(() => {
        listScrollFrameRef.current = null;
        const frameState = readLegendListState(resolvedListRef);
        if (frameState) {
          emitTrailHighlightsForViewport(frameState.start, frameState.end);
        }
      });
    },
    [
      clearTailExpansionScrollTimers,
      emitTrailHighlightsForViewport,
      onIsAtEndChange,
      onMessagesScroll,
      resolvedListRef,
    ],
  );
  const suppressTailExpansionScroll = useCallback(() => {
    tailExpansionScrollSuppressedRef.current = true;
    clearTailExpansionScrollTimers();
  }, [clearTailExpansionScrollTimers]);
  // These retries only preserve an existing bottom stick while tail content
  // settles. A direct user gesture owns the viewport immediately and must
  // cancel every delayed re-stick scheduled by an earlier image/disclosure.
  const handleMessagesPointerCancel = useCallback<
    NonNullable<MessagesTimelineProps["onMessagesPointerCancel"]>
  >(
    (event) => {
      clearTailExpansionScrollTimers();
      onMessagesPointerCancel?.(event);
    },
    [clearTailExpansionScrollTimers, onMessagesPointerCancel],
  );
  const handleMessagesPointerDown = useCallback<
    NonNullable<MessagesTimelineProps["onMessagesPointerDown"]>
  >(
    (event) => {
      clearTailExpansionScrollTimers();
      onMessagesPointerDown?.(event);
    },
    [clearTailExpansionScrollTimers, onMessagesPointerDown],
  );
  const handleMessagesTouchMove = useCallback<
    NonNullable<MessagesTimelineProps["onMessagesTouchMove"]>
  >(
    (event) => {
      suppressTailExpansionScroll();
      onMessagesTouchMove?.(event);
    },
    [onMessagesTouchMove, suppressTailExpansionScroll],
  );
  const handleMessagesTouchStart = useCallback<
    NonNullable<MessagesTimelineProps["onMessagesTouchStart"]>
  >(
    (event) => {
      clearTailExpansionScrollTimers();
      onMessagesTouchStart?.(event);
    },
    [clearTailExpansionScrollTimers, onMessagesTouchStart],
  );
  const handleMessagesWheel = useCallback<NonNullable<MessagesTimelineProps["onMessagesWheel"]>>(
    (event) => {
      suppressTailExpansionScroll();
      onMessagesWheel?.(event);
    },
    [onMessagesWheel, suppressTailExpansionScroll],
  );
  const handleViewableItemsChanged = useCallback<
    NonNullable<ComponentProps<typeof LegendList>["onViewableItemsChanged"]>
  >(
    ({ viewableItems }) => {
      let topIndex = Number.POSITIVE_INFINITY;
      let bottomIndex = Number.NEGATIVE_INFINITY;
      for (const token of viewableItems) {
        if (token.isViewable) {
          topIndex = Math.min(topIndex, token.index);
          bottomIndex = Math.max(bottomIndex, token.index);
        }
      }
      emitTrailHighlightsForViewport(topIndex, bottomIndex);
    },
    [emitTrailHighlightsForViewport],
  );
  useEffect(() => {
    if (!onTrailHighlightsChange) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      const state = readLegendListState(resolvedListRef);
      if (state) {
        emitTrailHighlightsForViewport(state.start, state.end);
      }
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [emitTrailHighlightsForViewport, onTrailHighlightsChange, resolvedListRef, rows.length]);
  const toggleFileChangesExpanded = useCallback((turnId: TurnId) => {
    setExpandedFileChangesByTurnId((current) => ({
      ...current,
      [turnId]: !(current[turnId] ?? true),
    }));
  }, []);
  const toggleFileListExpanded = useCallback((turnId: TurnId) => {
    setExpandedFileListByTurnId((current) => ({
      ...current,
      [turnId]: !(current[turnId] ?? false),
    }));
  }, []);
  const cancelUserMessageEdit = useCallback(() => {
    setEditingUserMessageId(null);
  }, []);
  const startUserMessageEdit = useCallback((messageId: MessageId) => {
    setEditingUserMessageId(messageId);
  }, []);
  const submitUserMessageEdit = useCallback(
    (messageId: MessageId, text: string, allowEmpty = false) => {
      if (!onEditUserMessage) {
        return Promise.resolve();
      }
      const nextText = text.trim();
      if (!nextText && !allowEmpty) {
        return Promise.resolve();
      }
      setSubmittingEditedUserMessageId(messageId);
      // Promise chain instead of async/try-finally: React Compiler does not yet
      // support try/finally, and it would skip optimizing this whole component.
      return Promise.resolve(onEditUserMessage(messageId, nextText))
        .then((saved) => {
          if (saved) {
            cancelUserMessageEdit();
          }
        })
        .finally(() => {
          setSubmittingEditedUserMessageId(null);
        });
    },
    [cancelUserMessageEdit, onEditUserMessage],
  );

  const renderRowContent = (row: MessagesTimelineRow) => (
    <div
      ref={observeTimelineRow}
      className={cn(
        CHAT_COLUMN_FRAME_CLASS_NAME,
        "px-1 transition-colors duration-500",
        (row.kind === "turn-process" && row.phase === "running") ||
          (row.kind === "message" &&
            row.message.role === "assistant" &&
            row.assistantTurnInProgress)
          ? "pb-1"
          : row.kind === "work" ||
              row.kind === "turn-process" ||
              (row.kind === "message" && row.message.role === "assistant")
            ? "pb-2"
            : "pb-4",
        row.kind === "message" && row.message.role === "assistant" ? "group/assistant" : null,
        row.kind === "message" && row.message.id === highlightedMessageId
          ? "rounded-xl bg-[var(--color-background-elevated-secondary)]"
          : null,
        enteringMessageRowIds.has(row.id) ? "chat-message-send-enter" : null,
      )}
      data-timeline-row-kind={row.kind}
      data-message-id={row.kind === "message" ? row.message.id : undefined}
      data-message-role={row.kind === "message" ? row.message.role : undefined}
    >
      {forkDividerBeforeRowId === row.id ? forkSourceDivider : null}
      <AssistantTurnRowFrame
        layout={row.assistantTurnLayout}
        timestamp={
          row.assistantTurnLayout
            ? formatDayAwareTimestamp(
                row.assistantTurnLayout.timestamp,
                timestampFormat,
                timestampNow,
              )
            : null
        }
      >
        {row.kind === "turn-process" &&
          (() => {
            const savedState = turnProcessOpenState[row.id];
            const isOpen =
              savedState?.phase === row.phase ? savedState.open : row.phase === "running";
            const processPanelId = `turn-process-panel-${row.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            const fileDiffStatByPath = turnDiffFileStats(row.turnDiffSummary);
            const renderProcessItem = (item: TurnProcessItem, keyPrefix: string) =>
              item.kind === "work" ? (
                <TimelineWorkEntryRow
                  key={`${keyPrefix}:work:${row.id}:${item.id}`}
                  workEntry={item.entry}
                  chatMetaFontSizePx={appTypographyScale.chatMetaPx}
                  textFontSizePx={appTypographyScale.activityPx}
                  density={prefersCompactWorkEntryRow(item.entry) ? "compact" : "default"}
                  reasoningDefaultOpen={reasoningDisclosureDefaultOpen(
                    item.entry,
                    row.phase === "running" && item.entry.id === liveReasoningEntryId,
                  )}
                  reasoningOpenOverride={reasoningDisclosureOverrides[item.entry.id]}
                  onReasoningOpenChange={setReasoningDisclosureOpen}
                  reasoningIsLive={
                    row.phase === "running" && item.entry.id === liveReasoningEntryId
                  }
                  fileDiffStatByPath={fileDiffStatByPath}
                  markdownCwd={markdownCwd}
                  onImageExpand={onImageExpand}
                  onOpenTurnDiff={onOpenTurnDiff}
                  timestampFormat={timestampFormat}
                  {...(onOpenAgentActivity ? { onOpenAgentActivity } : {})}
                  {...(onOpenAutomation ? { onOpenAutomation } : {})}
                  {...(onOpenEngineWebSurface ? { onOpenEngineWebSurface } : {})}
                  {...((item.entry.turnId ?? row.turnId)
                    ? { turnId: (item.entry.turnId ?? row.turnId)! }
                    : {})}
                />
              ) : (
                <div
                  key={`${keyPrefix}:narration:${row.id}:${item.id}`}
                  className={MUTED_LABEL_TEXT_CLASS_NAME}
                >
                  <ChatMarkdown
                    text={item.message.text}
                    cwd={markdownCwd}
                    isStreaming={false}
                    style={chatTypographyStyle}
                    onImageExpand={onImageExpand}
                  />
                </div>
              );
            const renderProcessChunk = (chunk: TurnProcessChunk) => {
              if (chunk.kind === "item") {
                return renderProcessItem(chunk.item, "turn-process");
              }
              const summary = summarizeToolCallGroup(chunk.entries);
              if (!summary) {
                return chunk.entries.map((entry) =>
                  renderProcessItem({ kind: "work", id: entry.id, entry }, "turn-process"),
                );
              }
              const summaryOverrideKey = `${row.id}:tool-group:${chunk.id}`;
              return (
                <ToolCallGroupSummaryRow
                  key={summaryOverrideKey}
                  summary={summary}
                  open={toolGroupSummaryOverrides[summaryOverrideKey] ?? false}
                  onToggle={(open) => setToolGroupSummaryOpen(summaryOverrideKey, open)}
                  fontSizePx={appTypographyScale.activityPx}
                  renderChildren={() => (
                    <div className="space-y-0.5 pt-0.5">
                      {chunk.entries.map((entry) =>
                        renderProcessItem({ kind: "work", id: entry.id, entry }, "turn-process"),
                      )}
                    </div>
                  )}
                />
              );
            };

            return (
              <div className="mb-1" data-turn-process-phase={row.phase}>
                <Collapsible
                  className="group/turn-process"
                  open={isOpen}
                  onOpenChange={(open) => setTurnProcessOpen(row.id, row.phase, open)}
                >
                  <CollapsibleTrigger
                    aria-controls={processPanelId}
                    className={cn(
                      "inline-flex items-center gap-1 pb-2 text-left transition-colors duration-200 hover:text-foreground",
                      MUTED_LABEL_TEXT_CLASS_NAME,
                    )}
                    style={{ fontSize: `${appTypographyScale.activityPx}px` }}
                  >
                    {row.phase === "running" ? (
                      nowIso ? (
                        <span>
                          {t("timeline.workingFor", {
                            duration:
                              formatClockElapsed(
                                row.createdAt,
                                nowIso,
                                locale === "zh-CN" ? "zh" : "en",
                              ) ?? (locale === "zh-CN" ? "0秒" : "0s"),
                          })}
                        </span>
                      ) : (
                        <WorkingTimer createdAt={row.createdAt} />
                      )
                    ) : (
                      <span>
                        {row.elapsedMs !== null
                          ? t("timeline.workedFor", {
                              duration: formatClockDuration(
                                row.elapsedMs,
                                locale === "zh-CN" ? "zh" : "en",
                              ),
                            })
                          : t("timeline.details")}
                      </span>
                    )}
                    <DisclosureChevron open={isOpen} className="text-muted-foreground/70" />
                  </CollapsibleTrigger>
                  <CollapsiblePanel
                    id={processPanelId}
                    keepMounted
                    aria-hidden={!isOpen}
                    inert={!isOpen ? true : undefined}
                  >
                    <div className={disclosureContentClassName(isOpen, "mb-2.5 space-y-1.5")}>
                      {chunkTurnProcessItems(row.items).map(renderProcessChunk)}
                      {row.phase === "running" ? (
                        <ThinkingStatus
                          accessibleLabel={t("timeline.workingStatus")}
                          fontSizePx={appTypographyScale.activityPx}
                          hints={thinkingHints}
                          theme={resolvedTheme}
                        />
                      ) : null}
                    </div>
                  </CollapsiblePanel>
                </Collapsible>
                <div className="h-px w-full bg-border" />
              </div>
            );
          })()}
        {row.kind === "work" &&
          (() => {
            const groupId = row.id;
            // Creation milestones are reserved for the end-of-turn recap card.
            // The provider's actual OmniMind MCP tool rows remain visible here.
            const groupedEntries = row.groupedEntries.filter(
              (workEntry) => !workEntry.omnimindThreadCreation,
            );
            if (groupedEntries.length === 0) {
              return null;
            }
            const renderEntryRow = (workEntry: WorkLogEntry) => (
              <TimelineWorkEntryRow
                key={`work-row:${workEntry.id}`}
                workEntry={workEntry}
                chatMetaFontSizePx={appTypographyScale.chatMetaPx}
                textFontSizePx={appTypographyScale.activityPx}
                density={prefersCompactWorkEntryRow(workEntry) ? "compact" : "default"}
                reasoningDefaultOpen={reasoningDisclosureDefaultOpen(workEntry, false)}
                reasoningOpenOverride={reasoningDisclosureOverrides[workEntry.id]}
                onReasoningOpenChange={setReasoningDisclosureOpen}
                reasoningIsLive={false}
                markdownCwd={markdownCwd}
                onImageExpand={onImageExpand}
                timestampFormat={timestampFormat}
                {...(onOpenAgentActivity ? { onOpenAgentActivity } : {})}
                {...(onOpenAutomation ? { onOpenAutomation } : {})}
                {...(onOpenEngineWebSurface ? { onOpenEngineWebSurface } : {})}
              />
            );
            const isExpanded = expandedWorkGroupsState[groupId] ?? false;
            const plannedRenderChunks = planWorkEntryRenderChunks(groupedEntries, {
              tailIsLive: false,
            });
            const cappedRenderPlan = capOpenWorkEntryRenderChunks(plannedRenderChunks, {
              expanded: isExpanded,
              maxVisibleEntries: MAX_VISIBLE_WORK_LOG_ENTRIES,
              keep: "last",
              shouldCapEntry: (workEntry) => workEntry.tone === "tool",
            });
            const renderChunks = cappedRenderPlan.chunks;

            return (
              <div>
                <div className="space-y-0.5">
                  {renderChunks.map((chunk) => {
                    if (!chunk.summary) return chunk.entries.map(renderEntryRow);
                    const summary = chunk.summary;
                    const summaryKey = `${groupId}:${chunk.id}`;
                    return (
                      <ToolCallGroupSummaryRow
                        key={`tool-summary:${summaryKey}`}
                        summary={summary}
                        open={toolGroupSummaryOverrides[summaryKey] ?? false}
                        onToggle={(open) => setToolGroupSummaryOpen(summaryKey, open)}
                        fontSizePx={appTypographyScale.activityPx}
                        renderChildren={() => (
                          <div className="space-y-0.5 pt-0.5">
                            {chunk.entries.map(renderEntryRow)}
                          </div>
                        )}
                      />
                    );
                  })}
                </div>
                {cappedRenderPlan.hasOverflow && (
                  <div className="mt-1.5 flex items-center justify-start gap-2 px-0.5">
                    <button
                      type="button"
                      className="font-system-ui text-[var(--color-text-foreground-secondary)] transition-colors duration-150 hover:text-foreground"
                      style={{ fontSize: `${appTypographyScale.uiSmPx}px` }}
                      onClick={() => handleToggleWorkGroup(groupId)}
                    >
                      {isExpanded
                        ? t("common.showLess")
                        : t(
                            cappedRenderPlan.hiddenEntryCount === 1
                              ? "timeline.showMoreToolCall"
                              : "timeline.showMoreToolCalls",
                            { count: cappedRenderPlan.hiddenEntryCount },
                          )}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

        {row.kind === "message" &&
          row.message.role === "user" &&
          (() => {
            const userImages = (row.message.attachments ?? []).filter(
              (
                attachment,
              ): attachment is Extract<
                NonNullable<TimelineMessage["attachments"]>[number],
                { type: "image" }
              > => attachment.type === "image",
            );
            const assistantSelections = (row.message.attachments ?? []).filter(
              (
                attachment,
              ): attachment is Extract<
                NonNullable<TimelineMessage["attachments"]>[number],
                { type: "assistant-selection" }
              > => attachment.type === "assistant-selection",
            );
            const userFiles = (row.message.attachments ?? []).filter(
              (
                attachment,
              ): attachment is Extract<
                NonNullable<TimelineMessage["attachments"]>[number],
                { type: "file" }
              > => attachment.type === "file",
            );
            const displayedUserMessage = deriveDisplayedUserMessageState(row.message.text, {
              hideImageOnlyBootstrapPrompt:
                userImages.length > 0 || userFiles.length > 0 || assistantSelections.length > 0,
              messageId: row.message.id,
            });
            const renderedAssistantSelections =
              assistantSelections.length > 0
                ? assistantSelections
                : displayedUserMessage.assistantSelections.map((selection, index) => ({
                    type: "assistant-selection" as const,
                    id: `fallback-selection-${row.message.id}-${index}`,
                    assistantMessageId: selection.assistantMessageId,
                    text: selection.text,
                  }));
            const terminalContexts = displayedUserMessage.contexts;
            const renderedFileComments = displayedUserMessage.fileComments;
            const renderedPastedTexts = displayedUserMessage.pastedTexts;
            const renderedBrowserAnnotations = displayedUserMessage.browserAnnotations;
            const userMessageText = displayedUserMessage.visibleText;
            const userMessageExpanded = expandedUserMessagesById[row.message.id] ?? false;
            const showUserText = userMessageText.trim().length > 0 || terminalContexts.length > 0;
            const bubbleIsChipOnly =
              showUserText &&
              terminalContexts.length === 0 &&
              hasOnlyInlineSkillChips(userMessageText, row.message.mentions ?? []);
            const canRevertAgentWork = typeof row.revertTurnCount === "number";
            const isEditingThisMessage = editingUserMessageId === row.message.id;
            const isSubmittingThisEdit = submittingEditedUserMessageId === row.message.id;
            const showEditUserMessage =
              Boolean(onEditUserMessage) &&
              row.message.id === latestEditableUserMessageId &&
              (displayedUserMessage.copyText.trim().length > 0 ||
                renderedBrowserAnnotations.length > 0);
            const hasLeadingMedia = hasLeadingUserMedia({
              imageCount: userImages.length,
              fileCount: userFiles.length,
              assistantSelectionCount: renderedAssistantSelections.length,
              browserAnnotationCount: renderedBrowserAnnotations.length,
              fileCommentCount: renderedFileComments.length,
              pastedTextCount: renderedPastedTexts.length,
            });
            const isTailContentRow = row.id === tailContentRowId;
            const showCrossTaskOrigin =
              crossTaskOrigin !== null && row.message.id === firstUserMessageId;
            return (
              <div className="flex w-full flex-col gap-3">
                {showCrossTaskOrigin ? (
                  <CrossTaskOriginLabel
                    origin={crossTaskOrigin}
                    {...(onOpenThread ? { onOpenSourceThread: onOpenThread } : {})}
                  />
                ) : null}
                <div className="flex w-full justify-end">
                  <div
                    className={cn(
                      "group flex flex-col items-end gap-px",
                      isEditingThisMessage ? "w-full max-w-full" : "max-w-[80%]",
                    )}
                  >
                    {/* Keep user-message chrome outside the bubble so the message reads as one simple block. */}
                    {/* The cross-task origin label already attributes this turn to another OmniMind thread,
                      so suppress the dispatch chip here to avoid a duplicate "Sent by …" marker. */}
                    {showCrossTaskOrigin ? null : (
                      <UserDispatchModeChip
                        dispatchMode={row.message.dispatchMode}
                        dispatchOrigin={row.message.dispatchOrigin}
                        hasLeadingMedia={hasLeadingMedia}
                      />
                    )}
                    {renderedAssistantSelections.length > 0 && (
                      <div className="mb-1 flex max-w-[240px] flex-wrap justify-end gap-1.5 self-end">
                        <AssistantSelectionsSummaryChip selections={renderedAssistantSelections} />
                      </div>
                    )}
                    {renderedBrowserAnnotations.length > 0 && (
                      <div className="mb-1 flex w-full max-w-[28rem] justify-end self-end">
                        <BrowserAnnotationStrip
                          annotations={renderedBrowserAnnotations}
                          className="justify-end"
                        />
                      </div>
                    )}
                    {renderedFileComments.length > 0 && (
                      <div className="mb-1 flex max-w-[240px] flex-wrap justify-end gap-1.5 self-end">
                        <FileCommentsSummaryChip comments={renderedFileComments} />
                      </div>
                    )}
                    {renderedPastedTexts.length > 0 && (
                      <div className="mb-1 flex max-w-full flex-col items-end gap-1.5 self-end">
                        {renderedPastedTexts.map((pasted) => (
                          <UserMessagePastedTextCard
                            key={pasted.index}
                            text={pasted.text}
                            metrics={{
                              lineCount: pasted.lineCount,
                              charCount: pasted.charCount,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {userFiles.length > 0 && (
                      <div className="mb-1 flex max-w-[280px] flex-wrap justify-end gap-1.5 self-end">
                        {userFiles.map((file) => (
                          <FileAttachmentChip key={file.id} file={file} />
                        ))}
                      </div>
                    )}
                    {userImages.length > 0 && (
                      <div
                        className={cn(
                          "flex max-w-[240px] flex-wrap justify-end gap-2 self-end",
                          showUserText && "mb-1",
                        )}
                      >
                        {userImages.map((image) => (
                          <UserImageAttachmentThumbnail
                            key={image.id}
                            image={image}
                            userImages={userImages}
                            onImageExpand={onImageExpand}
                            onTimelineImageLoad={
                              isTailContentRow ? scrollTailExpansionToEnd : ignoreTimelineImageLoad
                            }
                            resolvedTheme={resolvedTheme}
                          />
                        ))}
                      </div>
                    )}
                    {isEditingThisMessage ? (
                      <UserMessageEditForm
                        key={row.message.id}
                        initialValue={displayedUserMessage.copyText}
                        disabled={isSubmittingThisEdit || isRevertingCheckpoint}
                        allowEmpty={renderedBrowserAnnotations.length > 0}
                        chatTypographyStyle={userMessageTypographyStyle}
                        borderClassName={userMessageBubbleBorderClass}
                        onCancel={cancelUserMessageEdit}
                        onSubmit={(text) =>
                          void submitUserMessageEdit(
                            row.message.id,
                            text,
                            renderedBrowserAnnotations.length > 0,
                          )
                        }
                      />
                    ) : showUserText ? (
                      <div
                        className={cn(
                          "w-max max-w-full min-w-0 self-end bg-[var(--app-user-message-background)]",
                          USER_MESSAGE_BUBBLE_RADIUS_CLASS_NAME,
                          userMessageBubbleBorderClass,
                          bubbleIsChipOnly
                            ? "py-0.5 px-3"
                            : USER_MESSAGE_BUBBLE_SHELL_CHROME_CLASS_NAME,
                        )}
                      >
                        <UserMessageCollapsibleText
                          text={userMessageText}
                          expanded={userMessageExpanded}
                          chatFontSizePx={normalizedChatFontSizePx}
                          onToggle={() => {
                            setExpandedUserMessagesById((previous) => ({
                              ...previous,
                              [row.message.id]: !(previous[row.message.id] ?? false),
                            }));
                          }}
                        >
                          <UserMessageBody
                            text={userMessageText}
                            mentionReferences={row.message.mentions ?? []}
                            terminalContexts={terminalContexts}
                            chatTypographyStyle={userMessageTypographyStyle}
                            resolvedTheme={resolvedTheme}
                            markdownCwd={markdownCwd}
                          />
                        </UserMessageCollapsibleText>
                      </div>
                    ) : null}
                    {!isEditingThisMessage && (
                      <div
                        className="flex select-none items-center justify-end gap-2 pr-0.5 font-system-ui font-normal text-muted-foreground/45"
                        style={chatMessageFooterStyle}
                      >
                        <p className={cn("tabular-nums", MESSAGE_HOVER_REVEAL_CLASS_NAME)}>
                          {formatDayAwareTimestamp(
                            row.message.createdAt,
                            timestampFormat,
                            timestampNow,
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          {displayedUserMessage.copyText && (
                            <MessageCopyButton
                              text={displayedUserMessage.copyText}
                              className={MESSAGE_HOVER_REVEAL_CLASS_NAME}
                            />
                          )}
                          {showEditUserMessage && (
                            <MessageActionButton
                              label="Edit message"
                              tooltip="Edit and resend"
                              disabled={isRevertingCheckpoint}
                              className={cn(
                                MESSAGE_HOVER_REVEAL_CLASS_NAME,
                                "disabled:text-muted-foreground/35",
                              )}
                              onClick={() => startUserMessageEdit(row.message.id)}
                            >
                              <NewThreadIcon className={MESSAGE_ACTION_ICON_CLASS_NAME} />
                            </MessageActionButton>
                          )}
                          {canRevertAgentWork ? (
                            <MessageActionButton
                              label="Revert to this message"
                              tooltip="Revert to this message"
                              disabled={isRevertingCheckpoint || isWorking}
                              className={cn(
                                MESSAGE_HOVER_REVEAL_CLASS_NAME,
                                "disabled:text-muted-foreground/35",
                              )}
                              onClick={() => onRevertUserMessage(row.message.id)}
                            >
                              <Undo2Icon className={MESSAGE_ACTION_ICON_CLASS_NAME} />
                            </MessageActionButton>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        {row.kind === "message" &&
          row.message.role === "assistant" &&
          (() => {
            const messageText = resolveAssistantMessageDisplayText(row);
            const messageMarkers =
              threadMarkersByMessageId.get(row.message.id) ?? EMPTY_MESSAGE_MARKERS;
            const assistantCopyState = resolveAssistantMessageCopyState({
              text: row.assistantCopyText ?? row.message.text ?? null,
              showCopyButton: row.showAssistantCopyButton,
              streaming: row.assistantCopyStreaming,
            });
            const messagePinned = pinnedMessageIds?.has(row.message.id) ?? false;
            const messageCanPin = canPinMessage?.(row.message.id) ?? true;
            // Offer the pin toggle wherever copy is offered (a complete, terminal answer);
            // keep it visible for an already-pinned message so it can always be unpinned.
            const showPinToggle =
              messageCanPin &&
              Boolean(onTogglePinMessage) &&
              (assistantCopyState.visible || messagePinned);
            const showForkAction =
              assistantCopyState.visible &&
              Boolean(onForkMessage) &&
              (canForkMessage?.(row.message.id) ?? false);
            const turnSummary = row.assistantTurnDiffSummary;
            // `showAssistantCopyButton` is exactly the terminal-message signal
            // (see deriveTerminalAssistantMessageIds). Time now belongs to the
            // response-level identity header rather than this action footer.
            const isTerminalAssistantMessage =
              row.showAssistantCopyButton && !row.assistantTurnInProgress;
            const goalAchievement =
              isTerminalAssistantMessage && row.message.turnId
                ? (goalAchievementByTurnId.get(row.message.turnId) ?? null)
                : null;
            const allTurnWorkEntries = row.turnWorkEntries ?? [];
            const omnimindThreadCreationRecaps = [
              ...new Map(
                allTurnWorkEntries.flatMap((entry) =>
                  entry.omnimindThreadCreation
                    ? [
                        [
                          entry.omnimindThreadCreation.operationId,
                          entry.omnimindThreadCreation,
                        ] as const,
                      ]
                    : [],
                ),
              ).values(),
            ];
            const isTailContentRow = row.id === tailContentRowId;
            return (
              <>
                <div className="group min-w-0 py-0.5">
                  {messageText !== null ? (
                    <div data-assistant-message-id={row.message.id}>
                      <ChatMarkdown
                        text={messageText}
                        cwd={markdownCwd}
                        isStreaming={Boolean(row.message.streaming)}
                        style={chatTypographyStyle}
                        onImageExpand={onImageExpand}
                        markers={messageMarkers}
                        mermaidPresentation={{ messageId: row.message.id }}
                      />
                    </div>
                  ) : null}
                  {!row.assistantTurnInProgress && row.showAssistantCopyButton
                    ? omnimindThreadCreationRecaps.map((creation) => (
                        <div key={creation.operationId} className="mt-2 mb-1">
                          <OmniMindThreadCreationCard
                            creation={creation}
                            {...(onOpenThread
                              ? {
                                  onOpenThread: (createdThreadId) =>
                                    onOpenThread(ThreadId.makeUnsafe(createdThreadId)),
                                }
                              : {})}
                          />
                        </div>
                      ))
                    : null}
                  {(() => {
                    // Hold the end-of-turn changes card (Undo / Review) until the
                    // turn settles. While the turn is live the composer's own
                    // live-changes strip owns this surface; showing the card too
                    // would duplicate it and pre-empt the strip mid-turn.
                    if (!turnSummary || row.assistantTurnInProgress) return null;
                    const checkpointFiles = turnSummary.files;
                    if (checkpointFiles.length === 0) return null;
                    const fileChangesExpanded =
                      expandedFileChangesByTurnId[turnSummary.turnId] ?? true;
                    const fileListExpanded = expandedFileListByTurnId[turnSummary.turnId] ?? false;
                    const checkpointTurnCount = turnSummary.checkpointTurnCount;
                    const checkpointTurnCounts =
                      turnSummary.checkpointTurnCounts ??
                      (checkpointTurnCount === undefined ? [] : [checkpointTurnCount]);
                    const canUndo =
                      turnSummary.status !== "missing" &&
                      turnSummary.status !== "error" &&
                      turnSummary.checkpointRef !== undefined &&
                      !turnSummary.checkpointRef.startsWith("provider-diff:") &&
                      checkpointTurnCounts.length > 0 &&
                      onUndoTurnFiles !== undefined;
                    const totalAdditions = checkpointFiles.reduce(
                      (sum, file) => sum + (file.additions ?? 0),
                      0,
                    );
                    const totalDeletions = checkpointFiles.reduce(
                      (sum, file) => sum + (file.deletions ?? 0),
                      0,
                    );
                    const editedFilesLabel = t(
                      checkpointFiles.length === 1 ? "toolGroup.editSingle" : "toolGroup.edit",
                      { count: checkpointFiles.length },
                    );
                    const firstCheckpointFiles = checkpointFiles.slice(
                      0,
                      MAX_VISIBLE_CHANGED_FILES,
                    );
                    const overflowCheckpointFiles =
                      checkpointFiles.slice(MAX_VISIBLE_CHANGED_FILES);
                    const renderCheckpointFileRow = (
                      file: (typeof checkpointFiles)[number],
                      withFirstReset: boolean,
                    ) => {
                      // Hoisted out of JSX: a `??` inside an `&&` test makes React Compiler
                      // bail out ("Unexpected terminal kind `logical` for logical test block").
                      const additions = file.additions ?? 0;
                      const deletions = file.deletions ?? 0;
                      const hasDiffStat = additions + deletions > 0;
                      return (
                        <button
                          key={file.path}
                          type="button"
                          className={cn(
                            "group/file-row flex w-full items-center gap-2 border-t border-[color:var(--color-border-light)] bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-background-button-secondary-hover)]",
                            withFirstReset && "first:border-t-0",
                          )}
                          onClick={() => onOpenTurnDiff(turnSummary.turnId, file.path)}
                        >
                          <FileEntryIcon
                            pathValue={file.path}
                            kind="file"
                            theme={resolvedTheme}
                            colorMode="inherit"
                            className="size-4 shrink-0 text-[var(--color-icon-secondary)]"
                          />
                          <span
                            className="font-system-ui truncate font-normal text-[var(--color-text-foreground)] underline-offset-2 group-hover/file-row:underline group-focus-visible/file-row:underline"
                            style={{ fontSize: chatTypographyStyle.fontSize }}
                          >
                            {file.path}
                          </span>
                          {hasDiffStat && (
                            <span
                              className="font-system-ui ml-auto shrink-0 tabular-nums"
                              style={{ fontSize: chatTypographyStyle.fontSize }}
                            >
                              <DiffStatLabel additions={additions} deletions={deletions} />
                            </span>
                          )}
                        </button>
                      );
                    };
                    return (
                      <div className="mt-2 mb-1 overflow-hidden rounded-[0.65rem] border border-[color:var(--color-border-light)]">
                        <div
                          className={cn(
                            "flex items-center justify-between gap-3 bg-[color:color-mix(in_srgb,var(--app-user-message-background)_40%,transparent)] px-3 py-1.5",
                            fileChangesExpanded &&
                              "border-b border-[color:var(--color-border-light)]",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ChangesIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <div className="min-w-0">
                              <div
                                className="truncate font-normal text-foreground/92"
                                style={{
                                  fontSize: chatTypographyStyle.fontSize,
                                }}
                              >
                                {editedFilesLabel}
                              </div>
                              {totalAdditions + totalDeletions > 0 ? (
                                <div
                                  className="font-system-ui tabular-nums"
                                  style={{
                                    fontSize: chatTypographyStyle.fontSize,
                                  }}
                                >
                                  <DiffStatLabel
                                    additions={totalAdditions}
                                    deletions={totalDeletions}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {canUndo && (
                              <button
                                type="button"
                                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                                style={{
                                  fontSize: chatTypographyStyle.fontSize,
                                }}
                                onClick={() => onUndoTurnFiles(checkpointTurnCounts)}
                              >
                                Undo
                                <Undo2Icon className="size-3" />
                              </button>
                            )}
                            <ReviewChangesButton
                              style={{ fontSize: chatTypographyStyle.fontSize }}
                              onClick={() => onOpenTurnDiff(turnSummary.turnId)}
                            />
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-[var(--color-background-button-secondary-hover)] hover:text-foreground/80"
                              aria-expanded={fileChangesExpanded}
                              aria-label={
                                fileChangesExpanded
                                  ? "Collapse changed files list"
                                  : "Expand changed files list"
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (!fileChangesExpanded && isTailContentRow) {
                                  scrollTailExpansionToEnd();
                                }
                                toggleFileChangesExpanded(turnSummary.turnId);
                              }}
                              data-scroll-anchor-ignore={isTailContentRow ? true : undefined}
                            >
                              <DisclosureChevron
                                open={fileChangesExpanded}
                                className="text-[var(--color-text-foreground-tertiary)]"
                              />
                            </button>
                          </div>
                        </div>
                        <DisclosureRegion open={fileChangesExpanded}>
                          {firstCheckpointFiles.map((file) => renderCheckpointFileRow(file, true))}
                          {overflowCheckpointFiles.length > 0 ? (
                            <DisclosureRegion open={fileListExpanded}>
                              {overflowCheckpointFiles.map((file) =>
                                renderCheckpointFileRow(file, false),
                              )}
                            </DisclosureRegion>
                          ) : null}
                          {overflowCheckpointFiles.length > 0 ? (
                            <button
                              type="button"
                              className="flex w-full items-center justify-start gap-1.5 border-t border-[color:var(--color-border-light)] bg-transparent px-3 py-2 font-system-ui font-normal text-muted-foreground transition-colors hover:bg-[var(--color-background-button-secondary-hover)] hover:text-foreground"
                              style={{ fontSize: chatTypographyStyle.fontSize }}
                              aria-expanded={fileListExpanded}
                              onClick={() => toggleFileListExpanded(turnSummary.turnId)}
                            >
                              <DisclosureChevron open={fileListExpanded} />
                              <span>
                                {fileListExpanded
                                  ? t("common.showLess")
                                  : t(
                                      overflowCheckpointFiles.length === 1
                                        ? "timeline.showMoreFile"
                                        : "timeline.showMoreFiles",
                                      { count: overflowCheckpointFiles.length },
                                    )}
                              </span>
                            </button>
                          ) : null}
                        </DisclosureRegion>
                      </div>
                    );
                  })()}
                  {(showPinToggle ||
                    showForkAction ||
                    assistantCopyState.visible ||
                    goalAchievement !== null) && (
                    <div
                      className="mt-0.5 flex select-none items-center gap-2 font-system-ui font-normal text-muted-foreground/45 [&>button:first-child]:-ml-[0.4375em]"
                      style={chatMessageFooterStyle}
                    >
                      {showPinToggle ? (
                        // Pin sits at the left edge of the footer, before the copy action. It stays
                        // visible when pinned so it reads as a persistent "this is pinned" marker; an
                        // unpinned message only reveals it on hover, like the other footer actions.
                        // Same Central pin glyph in both states — persistence signals the pinned state.
                        <MessageActionButton
                          label={pinActionLabel("message", messagePinned)}
                          tooltip={messagePinned ? "Unpin from panel" : "Pin to panel"}
                          aria-pressed={messagePinned}
                          className={
                            messagePinned
                              ? "text-muted-foreground/80"
                              : MESSAGE_HOVER_REVEAL_CLASS_NAME
                          }
                          onClick={() => onTogglePinMessage?.(row.message.id)}
                        >
                          <PinIcon className={MESSAGE_ACTION_ICON_CLASS_NAME} />
                        </MessageActionButton>
                      ) : null}
                      {showForkAction ? (
                        <MessageActionButton
                          label={t("timeline.forkMessage")}
                          tooltip={t("timeline.forkMessage")}
                          className={MESSAGE_HOVER_REVEAL_CLASS_NAME}
                          onClick={() => onForkMessage?.(row.message.id)}
                        >
                          <GitBranchIcon className={MESSAGE_ACTION_ICON_CLASS_NAME} />
                        </MessageActionButton>
                      ) : null}
                      {assistantCopyState.visible ? (
                        <MessageCopyButton
                          text={assistantCopyState.text ?? ""}
                          className={MESSAGE_HOVER_REVEAL_CLASS_NAME}
                        />
                      ) : null}
                      {goalAchievement !== null ? (
                        <>
                          <div aria-hidden className="h-3 w-px shrink-0 bg-border" />
                          <p
                            className="flex min-w-0 items-center gap-1.5 tabular-nums"
                            title={goalAchievement.goal}
                          >
                            <GoalIcon className={MESSAGE_ACTION_ICON_CLASS_NAME} />
                            <span className="truncate">
                              {goalAchievement.elapsedMs !== null
                                ? t("conversation.goalAchievedIn", {
                                    duration: formatClockDuration(
                                      goalAchievement.elapsedMs,
                                      locale === "zh-CN" ? "zh" : "en",
                                    ),
                                  })
                                : t("conversation.goalAchieved")}
                            </span>
                          </p>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

        {row.kind === "proposed-plan" && (
          <div className="min-w-0 py-0.5">
            <ProposedPlanCard
              planMarkdown={row.proposedPlan.planMarkdown}
              cwd={markdownCwd}
              workspaceRoot={workspaceRoot}
              chatTypographyStyle={chatTypographyStyle}
            />
          </div>
        )}

        {row.kind === "worktree-setup" && (
          <DisclosureRegion open={row.open}>
            <div className="pt-0.5 pb-1">
              <WorktreeSetupCard
                steps={row.steps}
                pendingAction={worktreeSetupPendingAction}
                onResolve={onResolveWorktreeSetup}
              />
            </div>
          </DisclosureRegion>
        )}
      </AssistantTurnRowFrame>
    </div>
  );

  // Transient rows (for example failed first-send worktree setup) must be able
  // to render even when there are no persisted chat messages yet.
  const hasRenderableTranscriptContent =
    hasMessages || rows.length > 0 || canRenderForkSourceDivider;
  if (!hasRenderableTranscriptContent && !isWorking) {
    if (emptyStateContent) {
      return <div className="flex h-full items-center justify-center">{emptyStateContent}</div>;
    }
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/30">
          Send a message to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <div ref={timelineRootRef} className="contents" data-messages-timeline-root="true">
      <LegendList<MessagesTimelineRow>
        ref={resolvedListRef}
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => renderRowContent(item)}
        estimatedItemSize={90}
        immediateDOMOrder
        // LegendList caches rendered rows, so every local expansion map that changes row content
        // has to be surfaced through extraData.
        extraData={timelineExtraData}
        // Deliberately keyed off the *inherited* anchor rather than
        // `tailAnchorSlideInFlight`: LegendList re-targets the end on every data
        // change while this is true, which would yank a live post-send anchor
        // out of its hold. A remount that inherits an already-settled anchor has
        // no slide to preserve, so bootstrapping at the end is what we want.
        initialScrollAtEnd={tailAnchorMessageId === null || hasInheritedTailAnchor}
        {...(anchoredEndSpace ? { anchoredEndSpace } : {})}
        maintainScrollAtEnd={followLiveOutput && !tailAnchorSlideInFlight}
        maintainScrollAtEndThreshold={0.1}
        {...(tailAnchorMessageId !== null
          ? { maintainVisibleContentPosition: false }
          : !followLiveOutput
            ? { maintainVisibleContentPosition: true }
            : {})}
        onClickCapture={onMessagesClickCapture}
        onMouseUp={onMessagesMouseUp}
        onPointerCancel={handleMessagesPointerCancel}
        onPointerDown={handleMessagesPointerDown}
        onPointerUp={onMessagesPointerUp}
        onScroll={handleListScroll}
        {...(onTrailHighlightsChange
          ? {
              onViewableItemsChanged: handleViewableItemsChanged,
              viewabilityConfig: TRAIL_VIEWABILITY_CONFIG,
            }
          : {})}
        onTouchEnd={onMessagesTouchEnd}
        onTouchMove={handleMessagesTouchMove}
        onTouchStart={handleMessagesTouchStart}
        onWheel={handleMessagesWheel}
        data-chat-scroll-container="true"
        ListFooterComponent={listFooter}
        // `scroll-fade-b` (vendored shadcn 4.12.0 util in index.css) masks the bottom
        // edge so streamed content dissolves toward the composer. It is scroll-aware
        // via `animation-timeline: scroll()`, so the fade clears at the live edge and a
        // pinned or non-scrollable transcript stays crisp (no permanent shadow).
        // With the floating composer the viewport bottom sits *behind* the frosted
        // surface, so the scroll-aware fade is replaced by the fixed composer mask in
        // `listScrollStyle`: rows dissolve through the glass over the editor region and
        // are fully cut before the composer's footer controls.
        className={cn(
          "h-full overflow-x-hidden overscroll-y-contain py-3 [scrollbar-gutter:stable_both-edges] sm:py-4",
          contentInsetBottomPx ? null : "scroll-fade-b",
          CHAT_COLUMN_GUTTER_CLASS_NAME,
        )}
        {...(listScrollStyle ? { style: listScrollStyle } : {})}
      />
    </div>
  );
});

type TimelineMessage = Extract<MessagesTimelineRow, { kind: "message" }>["message"];

// Reuse stable row references so streaming updates only force React work for
// rows whose visible content actually changed.
function useStableRows(rows: MessagesTimelineRow[]): MessagesTimelineRow[] {
  const previousStateRef = useRef<StableMessagesTimelineRowsState>({
    byId: new Map<string, MessagesTimelineRow>(),
    result: [],
  });

  return useMemo(() => reconcileStableTimelineRows(rows, previousStateRef), [rows]);
}

// The reconciliation reads and rewrites the previous-state cache during the memo,
// which the compiler rejects. Keeping it in a module helper that takes the ref
// (module functions aren't compiled) preserves the per-row identity reuse: a
// whole-array useStableValue would drop every row reference whenever any single row
// changed, re-rendering the entire streaming transcript instead of just that row.
function reconcileStableTimelineRows(
  rows: MessagesTimelineRow[],
  previousStateRef: RefObject<StableMessagesTimelineRowsState>,
): MessagesTimelineRow[] {
  const nextState = computeStableMessagesTimelineRows(rows, previousStateRef.current);
  previousStateRef.current = nextState;
  return nextState.result;
}

// Animates only user rows that ChatView identifies as local optimistic sends;
// transcript hydration can add rows too, but should not replay send motion.
function useMessageSendEnterAnimations(
  rows: readonly MessagesTimelineRow[],
  enteringUserMessageIds: ReadonlySet<MessageId>,
): ReadonlySet<string> {
  const [enteringRowIds, setEnteringRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const previousRowIdsRef = useRef<ReadonlySet<string> | null>(null);
  const cleanupTimeoutsRef = useRef<number[]>([]);

  useLayoutEffect(() => {
    applyMessageSendEnterAnimation({
      rows,
      enteringUserMessageIds,
      previousRowIdsRef,
      cleanupTimeoutsRef,
      setEnteringRowIds,
    });
  }, [enteringUserMessageIds, rows]);

  useEffect(
    () => () => {
      for (const timeoutId of cleanupTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      cleanupTimeoutsRef.current = [];
    },
    [],
  );

  return enteringRowIds;
}

// The fresh-row detection compares against the previous layout pass and stamps the
// entering class before paint, so the send motion cannot flash. Running it from a
// module helper (which the compiler doesn't scan) keeps that synchronous setState
// out of the compiled hook without deferring it to a rAF/timeout that would paint a
// frame before the class lands.
function applyMessageSendEnterAnimation(params: {
  rows: readonly MessagesTimelineRow[];
  enteringUserMessageIds: ReadonlySet<MessageId>;
  previousRowIdsRef: RefObject<ReadonlySet<string> | null>;
  cleanupTimeoutsRef: RefObject<number[]>;
  setEnteringRowIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
}): void {
  const { rows, enteringUserMessageIds, previousRowIdsRef, cleanupTimeoutsRef, setEnteringRowIds } =
    params;
  const currentRowIds = new Set(rows.map((row) => row.id));
  const previousRowIds = previousRowIdsRef.current;
  previousRowIdsRef.current = currentRowIds;

  const freshUserRowIds = rows
    .filter(
      (row) =>
        row.kind === "message" &&
        row.message.role === "user" &&
        enteringUserMessageIds.has(row.message.id) &&
        (previousRowIds === null || !previousRowIds.has(row.id)),
    )
    .map((row) => row.id);
  if (freshUserRowIds.length === 0) {
    return;
  }

  setEnteringRowIds((current) => {
    const next = new Set(current);
    for (const rowId of freshUserRowIds) {
      next.add(rowId);
    }
    return next;
  });

  const cleanupTimeout = window.setTimeout(() => {
    cleanupTimeoutsRef.current = cleanupTimeoutsRef.current.filter((id) => id !== cleanupTimeout);
    setEnteringRowIds((current) => {
      const next = new Set(current);
      for (const rowId of freshUserRowIds) {
        next.delete(rowId);
      }
      return next.size === current.size ? current : next;
    });
  }, MESSAGE_SEND_ENTER_ANIMATION_MS + MESSAGE_SEND_ENTER_CLEANUP_BUFFER_MS);
  cleanupTimeoutsRef.current.push(cleanupTimeout);
}

interface WorktreeSetupPresentation {
  snapshot: WorktreeSetupSnapshot;
  open: boolean;
}

// Keeps the transient worktree-setup card mounted through one shared-disclosure
// close animation after ChatView clears the snapshot, mirroring
// useSettledTurnCollapseTransitions' rAF-flip + delayed-cleanup shape.
function useWorktreeSetupPresentation(
  worktreeSetup: WorktreeSetupSnapshot | null,
): WorktreeSetupPresentation | null {
  const [presented, setPresented] = useState<WorktreeSetupPresentation | null>(null);
  const closeFrameRef = useRef<number | null>(null);
  const cleanupTimeoutRef = useRef<number | null>(null);

  const clearCloseTimers = useCallback(() => {
    if (closeFrameRef.current !== null) {
      window.cancelAnimationFrame(closeFrameRef.current);
      closeFrameRef.current = null;
    }
    if (cleanupTimeoutRef.current !== null) {
      window.clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    reconcileWorktreeSetupPresentation({
      worktreeSetup,
      presented,
      clearCloseTimers,
      closeFrameRef,
      cleanupTimeoutRef,
      setPresented,
    });
  }, [worktreeSetup, presented, clearCloseTimers]);

  useLayoutEffect(() => clearCloseTimers, [clearCloseTimers]);

  return presented;
}

// Opens synchronously so the card is mounted before paint, then hands the close off
// to a rAF-flip + delayed unmount. Isolated in a module helper (not compiled) so the
// synchronous open setState stays out of the compiled hook while its exact ordering
// against the close timers is preserved.
function reconcileWorktreeSetupPresentation(params: {
  worktreeSetup: WorktreeSetupSnapshot | null;
  presented: WorktreeSetupPresentation | null;
  clearCloseTimers: () => void;
  closeFrameRef: RefObject<number | null>;
  cleanupTimeoutRef: RefObject<number | null>;
  setPresented: Dispatch<SetStateAction<WorktreeSetupPresentation | null>>;
}): void {
  const {
    worktreeSetup,
    presented,
    clearCloseTimers,
    closeFrameRef,
    cleanupTimeoutRef,
    setPresented,
  } = params;
  if (worktreeSetup) {
    clearCloseTimers();
    setPresented((current) =>
      current?.open && current.snapshot === worktreeSetup
        ? current
        : { snapshot: worktreeSetup, open: true },
    );
    return;
  }
  if (!presented?.open || closeFrameRef.current !== null) {
    return;
  }
  closeFrameRef.current = window.requestAnimationFrame(() => {
    closeFrameRef.current = null;
    setPresented((current) => (current?.open ? { ...current, open: false } : current));
    cleanupTimeoutRef.current = window.setTimeout(() => {
      cleanupTimeoutRef.current = null;
      setPresented(null);
    }, DISCLOSURE_TRANSITION_MS + DISCLOSURE_CLEANUP_BUFFER_MS);
  });
}

// Keep the live clock scoped to tiny leaf components so active Claude turns do
// not force the full transcript tree to re-render every second.
function WorkingTimer({ createdAt }: { createdAt: string }) {
  const { t } = useI18n();
  const textRef = useRef<HTMLSpanElement>(null);
  const initialText = t("timeline.workingFor", {
    duration: formatWorkingTimerNow(createdAt),
  });

  useEffect(() => {
    const updateText = () => {
      if (textRef.current) {
        textRef.current.textContent = t("timeline.workingFor", {
          duration: formatWorkingTimerNow(createdAt),
        });
      }
    };
    updateText();
    const id = window.setInterval(updateText, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [createdAt, t]);

  return <span ref={textRef}>{initialText}</span>;
}

function formatWorkingTimerNow(startIso: string): string {
  return formatClockElapsed(startIso, new Date().toISOString()) ?? "0s";
}

const UserImageAttachmentThumbnail = memo(function UserImageAttachmentThumbnail(props: {
  image: Extract<NonNullable<TimelineMessage["attachments"]>[number], { type: "image" }>;
  userImages: Array<
    Extract<NonNullable<TimelineMessage["attachments"]>[number], { type: "image" }>
  >;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  onTimelineImageLoad: () => void;
  resolvedTheme: "light" | "dark";
}) {
  return (
    <button
      type="button"
      className="flex size-15 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background/82 text-left shadow-[var(--app-shadow-raised-edge)] transition-colors hover:bg-background/94"
      aria-label={`Preview ${props.image.name}`}
      title={props.image.name}
      onClick={() => {
        const preview = buildExpandedImagePreview(props.userImages, props.image.id);
        if (!preview) return;
        props.onImageExpand(preview);
      }}
    >
      {props.image.previewUrl ? (
        <img
          src={props.image.previewUrl}
          alt={props.image.name}
          className="size-full object-cover"
          onLoad={props.onTimelineImageLoad}
          onError={props.onTimelineImageLoad}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <FileEntryIcon
            pathValue={props.image.name}
            kind="file"
            theme={props.resolvedTheme}
            className="size-4 opacity-70"
          />
        </div>
      )}
    </button>
  );
});

// Renders read-only user text with the same inline skill pill treatment as the composer.
function renderUserMessageInlineText(
  text: string,
  keyPrefix: string,
  resolvedTheme: "light" | "dark",
  mentionReferences: ReadonlyArray<ProviderMentionReference> = [],
): ReactNode[] {
  return splitPromptIntoDisplaySegments(text, mentionReferences).flatMap((segment, index) => {
    const key = `${keyPrefix}:${index}`;
    if (segment.type === "text") {
      return segment.text.length > 0 ? [<span key={`${key}:text`}>{segment.text}</span>] : [];
    }
    if (segment.type === "skill") {
      return [
        <InlineSkillChip key={`${key}:skill`} skillName={segment.name} selectionMode="document" />,
      ];
    }
    if (segment.type === "mention") {
      return [
        <InlineMentionChip
          key={`${key}:mention`}
          path={segment.path}
          theme={resolvedTheme}
          selectionMode="document"
          mentionReferences={mentionReferences}
          {...(segment.kind ? { kind: segment.kind } : {})}
        />,
      ];
    }
    if (segment.type === "agent-mention") {
      return [
        <InlineAgentChip
          key={`${key}:agent`}
          alias={segment.alias}
          color={segment.color}
          selectionMode="document"
        />,
      ];
    }
    if (segment.type === "link") {
      return [
        <InlineLinkChip
          key={`${key}:link`}
          url={segment.url}
          interactive
          selectionMode="document"
        />,
      ];
    }
    return [];
  });
}

function hasOnlyInlineSkillChips(
  text: string,
  mentionReferences: ReadonlyArray<ProviderMentionReference> = [],
): boolean {
  const segments = splitPromptIntoDisplaySegments(text, mentionReferences);
  let skillCount = 0;

  for (const segment of segments) {
    if (segment.type === "skill") {
      skillCount += 1;
      continue;
    }
    if (segment.type === "text" && segment.text.trim().length === 0) {
      continue;
    }
    return false;
  }

  return skillCount > 0;
}

// Inline editor for replaying a user message after the following assistant turn is rolled back.
const UserMessageEditForm = memo(function UserMessageEditForm(props: {
  initialValue: string;
  disabled: boolean;
  allowEmpty: boolean;
  chatTypographyStyle: CSSProperties;
  borderClassName: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(props.initialValue);
  const canSubmit = canSubmitUserMessageEdit({
    draft,
    allowEmpty: props.allowEmpty,
    disabled: props.disabled,
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onCancel();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSubmit) {
        props.onSubmit(draft);
      }
    }
  };

  return (
    <form
      className={cn(
        "w-full bg-[var(--app-user-message-background)]",
        USER_MESSAGE_BUBBLE_RADIUS_CLASS_NAME,
        props.borderClassName,
        USER_MESSAGE_BUBBLE_SHELL_CHROME_CLASS_NAME,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          props.onSubmit(draft);
        }
      }}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        disabled={props.disabled}
        rows={1}
        aria-label="Edit message"
        className="max-h-60 min-h-0 w-full resize-none overflow-y-auto border-0 bg-transparent p-0 font-system-ui text-foreground outline-none placeholder:text-muted-foreground/45 disabled:opacity-70"
        style={props.chatTypographyStyle}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="rounded-full px-2.5"
          style={props.chatTypographyStyle}
          disabled={props.disabled}
          onClick={props.onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="xs"
          className="rounded-full px-2.5"
          style={props.chatTypographyStyle}
          disabled={!canSubmit}
        >
          Send
        </Button>
      </div>
    </form>
  );
});

// Measures the clamped message against its content before paint so the fade mask
// never flickers. Kept in a module helper (not compiled) so the synchronous
// overflow setState — unavoidable for a layout measurement — stays out of the
// compiled component.
function measureUserMessageOverflow(
  collapsed: boolean,
  contentRef: RefObject<HTMLDivElement | null>,
  setOverflowing: (overflowing: boolean) => void,
): (() => void) | undefined {
  if (!collapsed) {
    return undefined;
  }
  const element = contentRef.current;
  if (!element) {
    return undefined;
  }
  const measure = () => {
    setOverflowing(element.scrollHeight - element.clientHeight > 1);
  };
  measure();
  return observeUserMessageOverflow(element, measure);
}

// Show more/less for long user messages: a visual max-height clamp (with a fade
// mask) around the fully rendered message instead of the old character slice.
const UserMessageCollapsibleText = memo(function UserMessageCollapsibleText(props: {
  text: string;
  expanded: boolean;
  chatFontSizePx: number;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const { t } = useI18n();
  const [overflowing, setOverflowing] = useState(() => userMessageLikelyOverflows(props.text));
  const collapsed = !props.expanded;

  useLayoutEffect(
    () => measureUserMessageOverflow(collapsed, contentRef, setOverflowing),
    [collapsed, props.text],
  );

  const lineHeightPx = getChatTranscriptUserMessageLineHeightPx(props.chatFontSizePx);
  const clampHeightPx = USER_MESSAGE_COLLAPSED_MAX_LINES * lineHeightPx;
  const fadeStartPx = clampHeightPx - USER_MESSAGE_COLLAPSED_FADE_LINES * lineHeightPx;
  const clamped = collapsed && overflowing;

  return (
    <>
      <div
        id={contentId}
        ref={contentRef}
        data-user-message-clamp={clamped ? "true" : "false"}
        className={cn("min-w-0", collapsed && "overflow-hidden")}
        style={
          collapsed
            ? {
                maxHeight: `${clampHeightPx}px`,
                ...(clamped
                  ? {
                      maskImage: `linear-gradient(to bottom, black ${fadeStartPx}px, transparent 100%)`,
                    }
                  : {}),
              }
            : undefined
        }
      >
        {props.children}
      </div>
      {(clamped || props.expanded) && (
        <button
          type="button"
          data-scroll-anchor-ignore
          className="mt-1 block text-muted-foreground/55 transition-colors duration-150 hover:text-foreground/72"
          style={{ fontSize: `${props.chatFontSizePx}px` }}
          aria-expanded={props.expanded}
          aria-controls={contentId}
          onClick={props.onToggle}
        >
          {props.expanded ? t("common.showLess") : t("common.showMore")}
        </button>
      )}
    </>
  );
});

const UserMessageBody = memo(function UserMessageBody(props: {
  text: string;
  mentionReferences: ReadonlyArray<ProviderMentionReference>;
  terminalContexts: ParsedTerminalContextEntry[];
  chatTypographyStyle: CSSProperties;
  resolvedTheme: "light" | "dark";
  markdownCwd: string | undefined;
}) {
  if (props.terminalContexts.length > 0) {
    const hasEmbeddedInlineLabels = textContainsInlineTerminalContextLabels(
      props.text,
      props.terminalContexts,
    );
    const inlinePrefix = buildInlineTerminalContextText(props.terminalContexts);
    const markdownText = hasEmbeddedInlineLabels
      ? props.text
      : [inlinePrefix, props.text].filter((part) => part.length > 0).join(" ");
    if (markdownText.length === 0) {
      return null;
    }
    return (
      <ChatMarkdown
        text={markdownText}
        cwd={props.markdownCwd}
        variant="user"
        mentionReferences={props.mentionReferences}
        terminalContexts={props.terminalContexts}
        className="font-system-ui wrap-break-word"
        style={props.chatTypographyStyle}
      />
    );
  }

  if (props.text.length === 0) {
    return null;
  }

  if (
    props.terminalContexts.length === 0 &&
    hasOnlyInlineSkillChips(props.text, props.mentionReferences)
  ) {
    return (
      <div
        className="flex max-w-full min-w-0 items-center leading-none text-foreground [&>span]:translate-y-0"
        style={props.chatTypographyStyle}
      >
        {renderUserMessageInlineText(
          props.text,
          "user-message-inline-chip-only",
          props.resolvedTheme,
          props.mentionReferences,
        )}
      </div>
    );
  }

  // Plain sent text renders as markdown (same pipeline as assistant messages);
  // the user variant keeps single newlines, skips math, and renders composer
  // tokens as chips via the composer-chips remark plugin.
  return (
    <ChatMarkdown
      variant="user"
      text={props.text}
      cwd={props.markdownCwd}
      isStreaming={false}
      mentionReferences={props.mentionReferences}
      className="font-system-ui"
      style={props.chatTypographyStyle}
    />
  );
});

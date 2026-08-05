import type { ConversationHistoryActivity } from "~/historicalConversation";
import {
  type AutomationDefinition,
  MessageId,
  type ProductRuntimeCatalog,
  type ProductRequestedSelection,
  type ProjectScript,
  type ProjectEntry,
  type ProjectId,
  type ProviderMentionReference,
  type ProviderSkillReference,
  type PinnedMessage,
  CHAT_TURN_MAX_ATTACHMENTS,
  type ResolvedKeybindingsConfig,
  ThreadId,
  ThreadMarkerId,
  type ThreadMarker,
  type ThreadMarkerColor,
  type ThreadMarkerStyle,
  type TurnId,
  type EditorId,
  type KeybindingCommand,
  RuntimeMode,
  PRODUCT_PROTOCOL_VERSION,
  type ProductConversationSnapshot,
  ProductConversationId,
  ProductDispatchId,
  ProductEntryId,
  ProductOperationReceiptId,
  ProductQueueItemId,
  ProductRunId,
  ProductWorkspaceId,
} from "@omnimind/contracts";
import { automationRequiresTargetThread } from "@omnimind/shared/automationMode";
import { normalizeModelIdentifier } from "../modelIdentifier";
import { threadExportBlockedReason } from "@omnimind/shared/threadExport";
import { pendingConversationRequestInstanceKey } from "~/conversationHistorySummary";
import {
  buildPromptThreadTitleFallback,
  GENERIC_CHAT_THREAD_TITLE,
} from "@omnimind/shared/chatThreads";
import {
  resolveThreadWorkspaceState,
  resolveThreadBranchSourceCwd,
  resolveThreadWorkspaceCwd as resolveSharedThreadWorkspaceCwd,
} from "@omnimind/shared/threadEnvironment";
import { deriveAssociatedWorktreeMetadata } from "@omnimind/shared/threadWorkspace";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Debouncer, useDebouncedValue } from "@tanstack/react-pacer";
import { useNavigate } from "@tanstack/react-router";
import { type LegendListRef } from "@legendapp/list/react";
import {
  GIT_WORKING_TREE_DIFF_LIVE_REFETCH_INTERVAL_MS,
  gitGithubRepositoryQueryOptions,
  gitBranchesQueryOptions,
} from "~/lib/gitReactQuery";
import { projectSearchEntriesQueryOptions } from "~/lib/projectReactQuery";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import {
  type ChatConversationActivitySignal,
  SINGLE_CHAT_PANE_SCOPE_ID,
} from "~/lib/chatPaneScope";
import {
  composerMentionPathNeedsQuoting,
  formatComposerMentionToken,
  filterPromptProviderMentionReferences,
  filterPromptSkillReferences,
  providerMentionReferencesEqual,
  providerSkillReferencesEqual,
  skillMentionPrefix,
} from "~/lib/composerMentions";
import { getLocalFolderBrowseRootPath, isLocalFolderMentionQuery } from "~/lib/localFolderMentions";
import { isElectron } from "../env";
import { isScrollContainerNearBottom } from "../chat-scroll";
import { stripDiffSearchParams } from "../diffRouteSearch";
import { resolveSubagentPresentationForThread } from "../lib/subagentPresentation";
import { isHomeChatContainerProject } from "../lib/chatProjects";
import { isStudioContainerProject } from "../lib/studioProjects";
import {
  buildComposerFileAttachmentsFromFiles,
  cloneComposerImageAttachment,
  effectiveComposerAttachmentCount,
  readFileAsDataUrl,
} from "../lib/composerSend";
import { composerImageBlobKey, persistComposerImageBlob } from "../lib/composerImageBlobStore";
import { extractChatAutomationInvocation } from "../lib/automationIntent";
import {
  acknowledgedRiskIdsForDraft,
  hasBlockingAutomationDraftWarnings,
  type AutomationDraftWarning,
  type AutomationDraftWarningId,
} from "../lib/automationDraft";
import { dispatchThreadRename } from "../lib/threadRename";
import { useHandleNewChatWithThreadHandler } from "../hooks/useHandleNewChat";
import { useComposerDropzone } from "../hooks/useComposerDropzone";
import { useComposerImageIntake } from "../hooks/useComposerImageIntake";
import {
  buildThreadBreadcrumbs,
  buildTranscriptAutoFollowSignal,
  commitAfterRuntimeModePersistence,
  createRuntimeModePersistenceQueue,
  derivePromptHistoryFromMessages,
  enrichSubagentWorkEntries,
  hasFileUndoSettled,
  promptStillMatchesActiveHistoryBrowse,
  type PendingFileUndo,
  type PromptHistoryNavigationState,
  resolveActiveThreadTitle,
  resolveActiveTurnLiveDiffState,
  resolveCycledModelSlug,
  resolveDefaultEnvironmentPanelOpen,
  resolveEnvironmentPanelOpen,
  resolveEnvironmentPanelPreferenceUpdate,
  resolveEnvironmentPanelVisible,
  resolveGitRepoUiState,
  resolveProjectScriptTerminalTarget,
  resolvePromptHistoryNavigation,
  resolveThreadDetailHydration,
  shouldHandlePromptHistoryNavigationKey,
  shouldEnableComposerPastedTextCollapse,
} from "./ChatView.logic";
import {
  createRelevantWorkLogThreadsSelector,
  createThreadLineageSelector,
} from "./ChatView.selectors";
import {
  clampCollapsedComposerCursor,
  type ComposerTrigger,
  collapseExpandedComposerCursor,
  detectComposerTrigger,
  expandCollapsedComposerCursor,
  replaceTextRange,
} from "../composer-logic";
import {
  ensureLeadingSpaceForReplacement,
  extendReplacementRangeForTrailingSpace,
} from "../composerTriggerInsertion";
import {
  createProjectSelector,
  createComposerThreadMentionSourcesSelector,
  createThreadSelector,
} from "../storeSelectors";
import { resolveComposerSlashRootBranch } from "../composerSlashCommands";
import {
  derivePendingApprovals,
  derivePendingUserInputs,
  derivePhase,
  deriveTimelineEntries,
  deriveActiveWorkStartedAt,
  deriveActiveTaskListState,
  deriveActiveBackgroundTasksState,
  findSidebarProposedPlan,
  findLatestProposedPlan,
  deriveWorkLogEntries,
  omitRoutedSubagentWorkEntries,
  hasActionableProposedPlan,
  hasLiveTurnTailWork,
  isLatestTurnSettled,
  type ActiveTaskListState,
} from "../session-logic";
import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
  setPendingUserInputCustomAnswer,
  type PendingUserInputDraftAnswer,
} from "../pendingUserInput";
import { selectRightDockState, useRightDockStore } from "../rightDockStore";
import { useStore } from "../store";
import { RenameThreadDialog } from "./RenameThreadDialog";
import { getThreadFromState } from "../threadDerivation";
import { useWorkspacePathsStore } from "../workspacePathsStore";
import { proposedPlanTitle } from "../proposedPlan";
import {
  DEFAULT_INTERACTION_MODE,
  DEFAULT_RUNTIME_MODE,
  DEFAULT_THREAD_TERMINAL_ID,
  type ChatMessage,
  type Thread,
} from "../types";
import { useTheme } from "../hooks/useTheme";
import { useThreadWorkspaceHandoff } from "../hooks/useThreadWorkspaceHandoff";
import { useComposerCommandMenuItems } from "../hooks/useComposerCommandMenuItems";
import { useTurnDiffSummaries } from "../hooks/useTurnDiffSummaries";
import BranchToolbar from "./BranchToolbar";
import { BrandMark } from "./BrandMark";
import { ThreadWorktreeHandoffDialog } from "./ThreadWorktreeHandoffDialog";
import { resolveShortcutCommand, shortcutLabelForCommand } from "../keybindings";
import PlanSidebar from "./PlanSidebar";
import TerminalWorkspaceTabs from "./TerminalWorkspaceTabs";
import {
  ChevronDownIcon,
  ComposerSendArrowIcon,
  LayoutSidebarIcon,
  LoaderCircleIcon,
  TemporaryThreadIcon,
  TaskListIcon,
} from "~/lib/icons";
import { ComposerQueuedHeader } from "./chat/ComposerQueuedHeader";
import { ComposerLiveChangesHeader } from "./chat/ComposerLiveChangesHeader";
import { ComposerPickerMenuPopup } from "./chat/ComposerPickerMenuPopup";
import { Button } from "./ui/button";
import { Menu, MenuItem, MenuTrigger } from "./ui/menu";
import { randomTerminalId } from "./terminal/terminalIds";
import { cn, isMacPlatform, randomUUID } from "~/lib/utils";
import { toastManager } from "./ui/toast";
import { type NewProjectScriptInput } from "./ProjectScriptsControl";
import {
  commandForProjectScript,
  nextProjectScriptId,
  projectScriptRuntimeEnv,
  projectScriptIdFromCommand,
  type ProjectScriptRunOptions,
  type ProjectScriptRunResult,
} from "~/projectScripts";
import { runProjectCommandInTerminal } from "~/projectTerminalRunner";
import { newCommandId, newMessageId, newThreadId } from "~/lib/utils";
import { readNativeApi } from "~/nativeApi";
import { readProductNativeApi } from "~/wsNativeApi";
import { createProductConversationWithRecovery } from "~/productConversationMutations";
import {
  presentProductConversationMessages,
  presentProductConversationProject,
  presentProductConversationQueue,
  presentProductConversationState,
  presentProductConversationThread,
  type WorkbenchQueuedTurn,
} from "~/productReadModel";
import { useProductStore } from "~/store/productStore";
import { canDispatchProductSubmission, useSystemHealthStore } from "~/store/systemHealthStore";
import { ProductConversationNotice } from "./product/ProductConversationNotice";
import { getWorkbenchCopy } from "~/i18n/workbenchCopy";
import {
  ProductRuntimePicker,
  isProductRuntimeModelSelectable,
  reconcileProductRuntimeSelection,
} from "./product/ProductRuntimePicker";
import { abortProductRun, productControlFailureMessage } from "./product/productRunControl";
import { deleteProductQueueItem, moveProductQueueItemNext } from "./product/productQueueActions";
import { useMarkSettledConversationVisited } from "./chat/useMarkSettledConversationVisited";
import {
  confirmProductQueueOwnershipBeforeDraftClear,
  findExactTransferredProductQueueItem,
  prepareProductQueueTransferAttempt,
} from "~/productQueueReconciliation";
import { promoteThreadCreate } from "~/lib/threadCreatePromotion";
import { readFavoriteModelSlugs } from "~/lib/modelFavorites";
import { resolveFollowUpDispatchMode, useAppSettings } from "../appSettings";
import { isTerminalFocused } from "../lib/terminalFocus";
import { isEditableEventTarget } from "../lib/editableEventTarget";
import {
  type ComposerFileAttachment,
  type ComposerImageAttachment,
  type ComposerAssistantSelectionAttachment,
  type BrowserAnnotationDraft,
  type ComposerInteractionMode,
  type DraftThreadEnvMode,
  type PersistedComposerImageAttachment,
  type QueuedComposerChatTurn,
  type QueuedComposerTurn,
  type RestoredComposerSourceProposedPlan,
  captureComposerPromptHistorySavedDraft,
  useComposerDraftStore,
  useComposerThreadDraft,
} from "../composerDraftStore";
import { useTemporaryThreadStore } from "../temporaryThreadStore";
import { useComposerFocusRequestStore } from "../composerFocusRequestStore";
import { useWorkflowRunUiStore, useWorkflowRunUiThreadState } from "../workflowRunUiStore";
import { appendComposerPromptText } from "../lib/chatReferences";
import {
  insertInlineTerminalContextPlaceholder,
  removeInlineTerminalContextPlaceholder,
  syncTerminalContextsByIds,
  terminalContextIdListsEqual,
  type TerminalContextDraft,
  type TerminalContextSelection,
} from "../lib/terminalContext";
import { registerTerminalContextComposerTarget } from "../lib/terminalContextComposerRegistry";
import { createPastedTextDraft, type PastedTextDraft } from "../lib/composerPastedText";
import type { FileCommentDraft } from "../lib/fileComments";
import {
  deriveContextWindowSelectionStatus,
  deriveCumulativeCostUsd,
  deriveLatestContextWindowSnapshot,
} from "../lib/contextWindow";
import { useComposerVoiceController } from "./chat/useComposerVoiceController";
import {
  composerFooterPlanForTier,
  resolveNextComposerFooterTier,
  shouldUseCompactComposerFooter,
} from "./composerFooterLayout";
import { useTerminalStateStore } from "../terminalStateStore";
import {
  resolveSplitViewFocusedThreadId,
  selectSplitView,
  type SplitViewId,
  type SplitViewPanePanelState,
  useSplitViewStore,
} from "../splitViewStore";
import { ComposerPromptEditor, type ComposerPromptEditorHandle } from "./ComposerPromptEditor";
import { PullRequestThreadDialog } from "./PullRequestThreadDialog";
import { ChatHeader } from "./chat/ChatHeader";
import { dispatchThreadNotes } from "~/pinnedMessages";
import {
  mergeProjectInstructionsIntoThreadNotes,
  useProjectInstructionsStore,
} from "~/projectInstructionsStore";
import {
  ENVIRONMENT_DOCKED_CONTENT_INSET_PX,
  EnvironmentPanel,
  type EnvironmentPanelProps,
} from "./chat/environment/EnvironmentPanel";
import { usePinnedMessageActions } from "./chat/environment/usePinnedMessageActions";
import {
  CHAT_SURFACE_HEADER_DIVIDER_CLASS_NAME,
  CHAT_SURFACE_HEADER_HEIGHT_CLASS,
  CHAT_SURFACE_HEADER_PADDING_X_CLASS,
  CHAT_SURFACE_HEADER_ROW_CLASS_NAME,
} from "./chat/chatHeaderControls";
import { SidebarHeaderNavigationControls } from "./SidebarHeaderNavigationControls";
import { SidebarHeaderTrigger } from "./ui/sidebar";
import {
  useDesktopTopBarTrafficLightGutterClassName,
  useDesktopTopBarWindowControlsGutterClassName,
} from "~/hooks/useDesktopTopBarGutter";
import { useNowMs } from "~/hooks/useNowMs";
import { useThreadRecap } from "~/hooks/useThreadRecap";
import { useRepoDiffTotals } from "~/hooks/useRepoDiffTotals";
import { useIsMobile } from "~/hooks/useMediaQuery";
import {
  acknowledgedRiskIdsForFormWarnings,
  AutomationDialog,
  automationQueryKey,
  createInputFromForm,
  formatCadence,
  automationsForThread,
  isFormSubmittable,
  type AutomationFormState,
  updateInputFromForm,
} from "../routes/-automations.shared";
import { ChatTranscriptPane } from "./chat/ChatTranscriptPane";
import { ThreadDetailHydrationState } from "./chat/ThreadDetailHydrationState";
import type { MessagesTimelineController } from "./chat/MessagesTimeline";
import { buildTurnDiffSummaryByAssistantMessageId } from "./chat/MessagesTimeline.logic";
import { deriveAgentActivityTimelineState } from "./chat/agentActivity.logic";
import { ExpandedImagePreview } from "./chat/ExpandedImagePreview";
import { ComposerCommandItem, ComposerCommandMenu } from "./chat/ComposerCommandMenu";
import {
  ComposerLocalDirectoryMenu,
  type ComposerLocalDirectoryMenuHandle,
} from "./chat/ComposerLocalDirectoryMenu";
import { ContextWindowMeter } from "./chat/ContextWindowMeter";
import { ComposerInputBanners } from "./chat/ComposerInputBanners";
import { ComposerVoiceButton } from "./chat/ComposerVoiceButton";
import { ComposerVoiceRecorderBar } from "./chat/ComposerVoiceRecorderBar";
import { ComposerReferenceAttachments } from "./chat/ComposerReferenceAttachments";
import { ExpandedImageOverlay } from "./chat/ExpandedImageOverlay";
import { TranscriptSelectionActionLayer } from "./chat/TranscriptSelectionActionLayer";
import { useChatTerminalController } from "./chat/useChatTerminalController";
import { useChatAutomationSetup } from "./chat/useChatAutomationSetup";
import { ComposerActiveTaskListCard } from "./chat/ComposerActiveTaskListCard";
import { ComposerSubagentStrip } from "./chat/ComposerSubagentStrip";
import {
  collectForegroundRunningSubagentStripItems,
  deriveComposerSubagentStripItems,
  type ComposerSubagentStripItem,
} from "./chat/ComposerSubagentStrip.logic";
import { WorkflowRunCard } from "./chat/WorkflowRunCard";
import {
  deriveWorkflowRunState,
  type WorkflowSubagentThreadRef,
} from "./chat/WorkflowRunCard.logic";
import { ComposerColumnFrame } from "./chat/ComposerColumnFrame";
import { useTranscriptAssistantSelectionAction } from "./chat/useTranscriptAssistantSelectionAction";
import {
  scrollTranscriptToSettledEnd,
  stopTranscriptScrollAtCurrentOffset,
} from "./chat/transcriptScroll";
import { resolveTranscriptMarkerRange } from "./chat/chatSelectionActions";
import {
  dispatchThreadMarkerAdd,
  dispatchThreadMarkerDoneSet,
  dispatchThreadMarkerLabelSet,
  dispatchThreadMarkerRemove,
} from "../threadMarkers";
import {
  COMPOSER_COMMAND_MENU_FLOATING_WRAPPER_CLASS_NAME,
  COMPOSER_INPUT_SHELL_CLASS_NAME,
  COMPOSER_INPUT_SURFACE_CLASS_NAME,
  COMPOSER_COLUMN_FRAME_CLASS_NAME,
  COMPOSER_EDITOR_PADDING_CLASS_NAME,
  COMPOSER_FOOTER_ROW_CLASS_NAME,
  CHAT_BACKGROUND_CLASS_NAME,
  CHAT_COLUMN_FRAME_CLASS_NAME,
  CHAT_COLUMN_GUTTER_CLASS_NAME,
  ENVIRONMENT_CONTENT_INSET_MOTION_CLASS,
} from "./chat/composerPickerStyles";
import { ProjectPicker } from "./chat/ProjectPicker";
import { FolderClosed } from "./FolderClosed";
import { ThreadErrorBanner } from "./chat/ThreadErrorBanner";
import { deriveLatestRateLimitStatus } from "./chat/RateLimitBanner";
import {
  ACTIVE_TURN_LAYOUT_SETTLE_DELAY_MS,
  appendVoiceTranscriptToPrompt,
  shouldStartActiveTurnLayoutGrace,
  buildLocalDraftThread,
  collectUserMessageBlobPreviewUrls,
  deriveComposerSendState,
  filterSidechatTranscriptMessages,
  hasServerAcknowledgedLocalDispatch,
  resolveNextLocalDispatchSnapshot,
  resolveThreadArtifactWorkspaceRoot,
  WORKTREE_SETUP_ERROR_HOLD_MS,
  worktreeSetupHasError,
  LAST_INVOKED_SCRIPT_BY_PROJECT_KEY,
  LastInvokedScriptByProjectSchema,
  type LocalDispatchSnapshot,
  type WorktreeSetupDispatchOptions,
  PullRequestDialogState,
  revokeBlobPreviewUrl,
  revokeUserMessagePreviewUrls,
} from "./ChatView.logic";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { presentHistoricalConversation } from "../conversationPresentation";
import { useFeatureFlags } from "../featureFlags";
import { useHandleNewThreadForFocusedContext } from "../hooks/useHandleNewThread";
import { resolveThreadHandoffBadgeLabel } from "../lib/threadHandoff";
import {
  resolveDiffEnvironmentState,
  resolveThreadEnvironmentMode,
} from "../lib/threadEnvironment";

// The terminal drawer drags in xterm plus its addons (~223 KB gzip). Both mount points
// are conditional, so loading it lazily keeps the terminal stack out of the initial
// chat bundle and defers the cost to the first time a terminal is actually opened.
const ThreadTerminalDrawer = lazy(() => import("./ThreadTerminalDrawer"));

const ATTACHMENT_PREVIEW_HANDOFF_TTL_MS = 5000;
const EMPTY_ACTIVITIES: ConversationHistoryActivity[] = [];
const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_PINNED_MESSAGES: readonly PinnedMessage[] = [];
const EMPTY_THREAD_MARKERS: readonly ThreadMarker[] = [];
const EMPTY_PINNED_TEXT: ReadonlyMap<MessageId, string> = new Map();
const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];
const EMPTY_PROJECT_ENTRIES: ProjectEntry[] = [];
const NO_PRODUCT_APP_SLASH_COMMANDS: ReadonlySet<string> = new Set();
const LOCAL_PROJECT_DRAFT_CONTEXT = {
  envMode: "local",
  worktreePath: null,
  branch: null,
  lastKnownPr: null,
} as const;
function revokeBlobPreviewUrlsAfterPaint(previewUrls: readonly string[]): void {
  if (previewUrls.length === 0 || typeof window === "undefined") {
    return;
  }
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      for (const previewUrl of previewUrls) {
        revokeBlobPreviewUrl(previewUrl);
      }
    }, 0);
  });
}

// Shared by the live-composer and prompt-history attachment sync effects:
// AppSnap images persist their bytes as IndexedDB blobs (reusing an existing
// blob key when valid), everything else inlines a data URL. Falls back to the
// already-persisted attachments for images whose serialization fails.
async function stagePersistedComposerImageAttachments(input: {
  threadId: ThreadId;
  images: ReadonlyArray<ComposerImageAttachment>;
  getPersistedAttachments: () => PersistedComposerImageAttachment[];
}): Promise<PersistedComposerImageAttachment[]> {
  try {
    const existingPersistedById = new Map(
      input.getPersistedAttachments().map((attachment) => [attachment.id, attachment]),
    );
    const stagedAttachmentById = new Map<string, PersistedComposerImageAttachment>();
    await Promise.all(
      input.images.map(async (image) => {
        try {
          if (image.source?.kind === "appsnap") {
            const existingPersisted = existingPersistedById.get(image.id);
            const expectedBlobKey = composerImageBlobKey(input.threadId, image.id);
            const blobKey =
              existingPersisted?.blobKey === expectedBlobKey
                ? expectedBlobKey
                : await persistComposerImageBlob({
                    threadId: input.threadId,
                    imageId: image.id,
                    file: image.file,
                  });
            stagedAttachmentById.set(image.id, {
              id: image.id,
              name: image.name,
              mimeType: image.mimeType,
              sizeBytes: image.sizeBytes,
              blobKey,
              source: image.source,
            });
            return;
          }
          const dataUrl = await readFileAsDataUrl(image.file);
          stagedAttachmentById.set(image.id, {
            id: image.id,
            name: image.name,
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes,
            dataUrl,
          });
        } catch {
          const existingPersisted = existingPersistedById.get(image.id);
          if (existingPersisted) {
            stagedAttachmentById.set(image.id, existingPersisted);
          }
        }
      }),
    );
    return Array.from(stagedAttachmentById.values());
  } catch {
    const currentImageIds = new Set(input.images.map((image) => image.id));
    return input
      .getPersistedAttachments()
      .filter((attachment) => currentImageIds.has(attachment.id));
  }
}

function eventTargetsComposer(
  event: globalThis.KeyboardEvent,
  composerForm: HTMLFormElement | null,
): boolean {
  if (!composerForm) return false;
  const target = event.target;
  return target instanceof Node ? composerForm.contains(target) : false;
}

function canHandleComposerPickerShortcut(
  event: globalThis.KeyboardEvent,
  composerForm: HTMLFormElement | null,
): boolean {
  if (!composerForm) return false;
  if (eventTargetsComposer(event, composerForm)) return true;
  const target = event.target;
  return (
    target === document.body ||
    target === document.documentElement ||
    document.activeElement === document.body ||
    document.activeElement === document.documentElement
  );
}
const EMPTY_AVAILABLE_EDITORS: EditorId[] = [];
const EMPTY_PENDING_USER_INPUT_ANSWERS: Record<string, PendingUserInputDraftAnswer> = {};
const EMPTY_TERMINAL_RUNTIME_ENV: Record<string, string> = {};
const EMPTY_LAST_INVOKED_SCRIPT_BY_PROJECT: Record<string, string> = {};

const COMPOSER_PATH_QUERY_DEBOUNCE_MS = 120;
const VOICE_RECORDER_ACTION_ARM_DELAY_MS = 250;

function warnVoiceGuard(event: string, details?: Record<string, unknown>) {
  if (!import.meta.env.DEV) {
    return;
  }
  if (details) {
    console.warn(`[voice] ${event}`, details);
    return;
  }
  console.warn(`[voice] ${event}`);
}

/**
 * Send-path handlers that are declared *after* `onSend` in the component body (they depend on
 * state and callbacks that are set up later) yet have to be reachable from it — and, for
 * `send` itself, from the queued-turn dispatcher that is declared before it.
 *
 * Reading a later-declared binding from an earlier one makes React Compiler bail out on the
 * whole component ("Cannot access variable before it is declared") — silently, since
 * `panicThreshold` is unset — which would drop memoization for the single hottest component in
 * the app. Routing those calls through one latest-value ref keeps every reference well-ordered.
 * The ref is only ever read from user-driven send flows, never during render, and it is
 * refreshed in a layout effect so no passive-effect window can serve a stale handler.
 */
interface ChatViewProps {
  threadId: ThreadId;
  conversationSurface: "agent" | "chat";
  conversationActivity?: ChatConversationActivitySignal;
  splitViewId?: SplitViewId | null;
  paneScopeId?: string;
  surfaceMode?: "single" | "split";
  presentationMode?: "default" | "editor";
  isFocusedPane?: boolean;
  panelState?: SplitViewPanePanelState;
  onToggleDiffPanel?: () => void;
  onToggleRightDock?: () => void;
  onToggleBrowserPanel?: () => void;
  onOpenBrowserUrl?: (url: string) => void;
  onOpenTurnDiffPanel?: (turnId: TurnId, filePath?: string) => void;
  onSplitSurface?: () => void;
  onMaximizeSurface?: () => void;
  viewModeAction?: {
    label: string;
    active: boolean;
    onClick: () => void;
  } | null;
  onChangeThreadInSplitPane?: () => void;
  onCloseThreadPane?: () => void;
}

function normalizeRestoredQueuedPrompt(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function composerPromptStillMatchesRestoredQueuedDraft(
  restoredPrompt: string,
  nextPrompt: string,
): boolean {
  const restored = normalizeRestoredQueuedPrompt(restoredPrompt);
  const next = normalizeRestoredQueuedPrompt(nextPrompt);
  if (next.length === 0) {
    return false;
  }
  if (restored.length === 0) {
    return true;
  }
  if (next.includes(restored)) {
    return true;
  }
  if (next.length >= Math.min(16, restored.length) && restored.includes(next)) {
    return true;
  }
  const probe = restored.slice(0, Math.min(48, restored.length));
  return probe.length >= 16 && next.includes(probe);
}

function isProductConversationNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PRODUCT_CONVERSATION_NOT_FOUND"
  );
}

function raiseProductOperationError(error: unknown): never {
  throw error;
}

function productSnapshotIncludesEntry(
  snapshot: ProductConversationSnapshot | null,
  entryId: ProductEntryId,
): snapshot is ProductConversationSnapshot {
  return snapshot?.readModel.entries.some((entry) => entry.id === entryId) ?? false;
}

export default function ChatView({
  threadId,
  conversationSurface,
  conversationActivity,
  splitViewId: splitViewIdProp,
  paneScopeId: paneScopeIdProp,
  surfaceMode: surfaceModeProp,
  presentationMode: presentationModeProp,
  isFocusedPane: isFocusedPaneProp,
  panelState,
  onToggleDiffPanel,
  onToggleRightDock,
  onToggleBrowserPanel,
  onOpenBrowserUrl,
  onOpenTurnDiffPanel,
  onSplitSurface,
  onMaximizeSurface,
  viewModeAction: viewModeActionProp,
  onChangeThreadInSplitPane,
  onCloseThreadPane,
}: ChatViewProps) {
  // Prop defaults are resolved here instead of in the destructuring pattern: an
  // AssignmentPattern in the parameter list makes React Compiler bail out (silently —
  // `panicThreshold` is unset) on this entire component, the hottest one in the app.
  // See ChatView.compiler.test.ts.
  const paneScopeId = paneScopeIdProp ?? SINGLE_CHAT_PANE_SCOPE_ID;
  const surfaceMode = surfaceModeProp ?? "single";
  const presentationMode = presentationModeProp ?? "default";
  const isFocusedPane = isFocusedPaneProp ?? true;
  const viewModeAction = viewModeActionProp ?? null;
  const productConversationId = ProductConversationId.makeUnsafe(threadId);
  const isChatProductSurface = conversationSurface === "chat";
  const productReadModel = useProductStore(
    (store) => store.detailByConversation[productConversationId],
  );
  const productConversationSummary = useProductStore((store) =>
    store.conversations.find((conversation) => conversation.id === productConversationId),
  );
  const productRuntimeCatalog = useProductStore((store) => store.runtimeCatalog);
  const isKnownProductConversation = productConversationSummary !== undefined;
  const productProjectionIssue = useProductStore(
    (store) => store.detailIssueByConversation[productConversationId] ?? null,
  );
  const [productDetailFetchFailed, setProductDetailFetchFailed] = useState(false);
  const systemHealthSnapshot = useSystemHealthStore((store) => store.snapshot);
  const productConversationPresentation = useMemo(
    () =>
      presentProductConversationState({
        readModel: productReadModel,
        isKnownConversation: isKnownProductConversation,
        projectionIssue:
          productReadModel === undefined && productDetailFetchFailed
            ? "history-unavailable"
            : productProjectionIssue,
        health: systemHealthSnapshot,
      }),
    [
      isKnownProductConversation,
      productDetailFetchFailed,
      productProjectionIssue,
      productReadModel,
      systemHealthSnapshot,
    ],
  );
  const workbenchCopy = getWorkbenchCopy();
  const setProductConversationSnapshot = useProductStore((store) => store.setConversationSnapshot);
  const setProductShellSnapshot = useProductStore((store) => store.setShellSnapshot);
  const setProductQueueItem = useProductStore((store) => store.setQueueItem);
  const retainProductConversation = useProductStore((store) => store.retainConversation);
  const releaseProductConversation = useProductStore((store) => store.releaseConversation);
  const retainedProductConversationRef = useRef<ProductConversationId | null>(null);
  const [productQueueEditOverride, setProductQueueEdit] = useState<
    | {
        readonly id: ProductQueueItemId;
        readonly revision: number;
      }
    | null
    | undefined
  >(undefined);
  const ensureProductConversationRetained = useCallback(() => {
    if (retainedProductConversationRef.current === productConversationId) return;
    retainProductConversation(productConversationId);
    retainedProductConversationRef.current = productConversationId;
  }, [productConversationId, retainProductConversation]);
  useEffect(() => {
    if (!isKnownProductConversation) return;
    let cancelled = false;
    ensureProductConversationRetained();
    void readProductNativeApi()
      .getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: productConversationId,
      })
      .then((snapshot) => {
        if (cancelled) return;
        setProductDetailFetchFailed(false);
        setProductConversationSnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) setProductDetailFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    ensureProductConversationRetained,
    isKnownProductConversation,
    productConversationId,
    setProductConversationSnapshot,
  ]);
  useEffect(
    () => () => {
      if (retainedProductConversationRef.current === productConversationId) {
        releaseProductConversation(productConversationId);
        retainedProductConversationRef.current = null;
      }
    },
    [productConversationId, releaseProductConversation],
  );
  const markThreadVisited = useStore((store) => store.markThreadVisited);
  const setStoreThreadError = useStore((store) => store.setError);
  const setStoreThreadWorkspace = useStore((store) => store.setThreadWorkspace);
  const { settings, updateSettings } = useAppSettings();
  const desktopTopBarTrafficLightGutterClassName = useDesktopTopBarTrafficLightGutterClassName();
  const desktopTopBarWindowControlsGutterClassName =
    useDesktopTopBarWindowControlsGutterClassName();
  const setComposerDraftModelSelectionAndSticky = useComposerDraftStore(
    (store) => store.setModelSelectionAndSticky,
  );
  const timestampFormat = settings.timestampFormat;
  const navigate = useNavigate();
  const activeSplitView = useSplitViewStore(
    useMemo(() => selectSplitView(splitViewIdProp ?? null), [splitViewIdProp]),
  );
  const removeThreadFromSplitViews = useSplitViewStore((store) => store.removeThreadFromSplitViews);
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const isEditorRail = presentationMode === "editor";
  const isInactiveSplitPane = surfaceMode === "split" && !isFocusedPane;
  const composerDraft = useComposerThreadDraft(threadId);
  const productQueueEdit =
    productQueueEditOverride !== undefined
      ? productQueueEditOverride
      : (() => {
          const matchingItem = productReadModel?.queue.find(
            (item) => item.text === composerDraft.prompt && composerDraft.prompt.trim().length > 0,
          );
          return matchingItem ? { id: matchingItem.id, revision: matchingItem.revision } : null;
        })();
  useEffect(() => {
    const timer = window.setTimeout(() => setProductQueueEdit(undefined), 0);
    return () => window.clearTimeout(timer);
  }, [productConversationId]);
  const prompt = composerDraft.prompt;
  const composerPromptHistorySavedDraft = composerDraft.promptHistorySavedDraft;
  const composerPromptHistorySavedDraftImages = composerPromptHistorySavedDraft?.images ?? null;
  const composerImages = composerDraft.images;
  const composerFiles = composerDraft.files;
  const composerAssistantSelections = composerDraft.assistantSelections;
  const composerBrowserAnnotations = composerDraft.browserAnnotations;
  const composerFileComments = composerDraft.fileComments;
  const composerTerminalContexts = composerDraft.terminalContexts;
  const composerPastedTexts = composerDraft.pastedTexts;
  const composerSkills = composerDraft.skills;
  const composerMentions = composerDraft.mentions;
  const queuedComposerTurns = composerDraft.queuedTurns;
  const restoredSourceProposedPlan = composerDraft.restoredSourceProposedPlan;
  const composerSendState = useMemo(
    () =>
      deriveComposerSendState({
        prompt,
        imageCount: composerImages.length,
        fileCount: composerFiles.length,
        assistantSelectionCount: composerAssistantSelections.length,
        browserAnnotationCount: composerBrowserAnnotations.length,
        fileCommentCount: composerFileComments.length,
        terminalContexts: composerTerminalContexts,
        pastedTexts: composerPastedTexts,
      }),
    [
      composerAssistantSelections.length,
      composerBrowserAnnotations.length,
      composerFileComments.length,
      composerFiles.length,
      composerImages.length,
      composerTerminalContexts,
      composerPastedTexts,
      prompt,
    ],
  );
  const nonPersistedComposerImageIds = composerDraft.nonPersistedImageIds;
  const durablyPersistedComposerImageIds = composerDraft.persistedAttachments;
  const setComposerDraftPrompt = useComposerDraftStore((store) => store.setPrompt);
  const stageComposerProductQueueTransfer = useComposerDraftStore(
    (store) => store.stageProductQueueTransfer,
  );
  const clearComposerContentForProductQueueTransfer = useComposerDraftStore(
    (store) => store.clearComposerContentForProductQueueTransfer,
  );
  const setComposerDraftPromptHistorySavedDraft = useComposerDraftStore(
    (store) => store.setPromptHistorySavedDraft,
  );
  const restoreComposerDraftPromptHistorySavedDraft = useComposerDraftStore(
    (store) => store.restorePromptHistorySavedDraft,
  );
  const setComposerDraftModelSelection = useComposerDraftStore((store) => store.setModelSelection);
  const setComposerDraftRuntimeMode = useComposerDraftStore((store) => store.setRuntimeMode);
  const setComposerDraftInteractionMode = useComposerDraftStore(
    (store) => store.setInteractionMode,
  );
  const removeQueuedComposerTurnFromDraft = useComposerDraftStore(
    (store) => store.removeQueuedTurn,
  );
  const addComposerDraftImages = useComposerDraftStore((store) => store.addImages);
  const removeComposerDraftImage = useComposerDraftStore((store) => store.removeImage);
  const addComposerDraftFiles = useComposerDraftStore((store) => store.addFiles);
  const removeComposerDraftFile = useComposerDraftStore((store) => store.removeFile);
  const addComposerDraftAssistantSelection = useComposerDraftStore(
    (store) => store.addAssistantSelection,
  );
  const addComposerDraftBrowserAnnotations = useComposerDraftStore(
    (store) => store.addBrowserAnnotations,
  );
  const removeComposerDraftBrowserAnnotation = useComposerDraftStore(
    (store) => store.removeBrowserAnnotation,
  );
  const clearComposerDraftAssistantSelections = useComposerDraftStore(
    (store) => store.clearAssistantSelections,
  );
  const addComposerDraftFileComment = useComposerDraftStore((store) => store.addFileComment);
  const clearComposerDraftFileComments = useComposerDraftStore((store) => store.clearFileComments);
  const insertComposerDraftTerminalContext = useComposerDraftStore(
    (store) => store.insertTerminalContext,
  );
  const addComposerDraftTerminalContexts = useComposerDraftStore(
    (store) => store.addTerminalContexts,
  );
  const removeComposerDraftTerminalContext = useComposerDraftStore(
    (store) => store.removeTerminalContext,
  );
  const addComposerDraftPastedTexts = useComposerDraftStore((store) => store.addPastedTexts);
  const removeComposerDraftPastedText = useComposerDraftStore((store) => store.removePastedText);
  const setComposerDraftTerminalContexts = useComposerDraftStore(
    (store) => store.setTerminalContexts,
  );
  const setComposerDraftSkills = useComposerDraftStore((store) => store.setSkills);
  const setComposerDraftMentions = useComposerDraftStore((store) => store.setMentions);
  const clearComposerDraftPersistedAttachments = useComposerDraftStore(
    (store) => store.clearPersistedAttachments,
  );
  const syncComposerDraftPersistedAttachments = useComposerDraftStore(
    (store) => store.syncPersistedAttachments,
  );
  const syncComposerDraftPromptHistorySavedDraftPersistedAttachments = useComposerDraftStore(
    (store) => store.syncPromptHistorySavedDraftPersistedAttachments,
  );
  const setComposerDraftRestoredSourceProposedPlan = useComposerDraftStore(
    (store) => store.setRestoredSourceProposedPlan,
  );
  const clearComposerDraftContent = useComposerDraftStore((store) => store.clearComposerContent);
  const setDraftThreadContext = useComposerDraftStore((store) => store.setDraftThreadContext);
  const moveDraftThreadToProject = useComposerDraftStore((store) => store.moveDraftThreadToProject);
  const getDraftThreadByProjectId = useComposerDraftStore(
    (store) => store.getDraftThreadByProjectId,
  );
  const getDraftThread = useComposerDraftStore((store) => store.getDraftThread);
  const setProjectDraftThreadId = useComposerDraftStore((store) => store.setProjectDraftThreadId);
  const clearProjectDraftThreadId = useComposerDraftStore(
    (store) => store.clearProjectDraftThreadId,
  );
  const draftThread = useComposerDraftStore(
    (store) => store.draftThreadsByThreadId[threadId] ?? null,
  );
  const hasTemporaryThreadMarker = useTemporaryThreadStore((store) =>
    threadId ? store.temporaryThreadIds[threadId] === true : false,
  );
  const markTemporaryThread = useTemporaryThreadStore((store) => store.markTemporaryThread);
  const clearTemporaryThread = useTemporaryThreadStore((store) => store.clearTemporaryThread);
  const markWorkflowRunDismissed = useWorkflowRunUiStore((store) => store.markDismissed);
  const serverThread = useStore(useMemo(() => createThreadSelector(threadId), [threadId]));
  const threadDetailSyncState = useStore((state) =>
    threadId ? (state.threadDetailSyncById?.[threadId] ?? null) : null,
  );
  const composerThreadSummaries = useStore(
    useMemo(() => createComposerThreadMentionSourcesSelector(), []),
  );
  const composerThreadProjects = useStore((state) => state.projects);
  const crossTaskSourceThreadId =
    serverThread?.creationSource && serverThread.sourceThreadId
      ? serverThread.sourceThreadId
      : null;
  const crossTaskSourceThread = useStore(
    useMemo(() => createThreadSelector(crossTaskSourceThreadId), [crossTaskSourceThreadId]),
  );
  const crossTaskOrigin = useMemo(
    () =>
      crossTaskSourceThreadId
        ? {
            sourceThreadId: crossTaskSourceThreadId,
            sourceProvider: crossTaskSourceThread?.modelSelection?.provider ?? null,
          }
        : null,
    [crossTaskSourceThread?.modelSelection?.provider, crossTaskSourceThreadId],
  );
  const promptRef = useRef(prompt);
  const [isDragOverComposer, setIsDragOverComposer] = useState(false);
  const [expandedImage, setExpandedImage] = useState<ExpandedImagePreview | null>(null);
  const [optimisticUserMessages, setOptimisticUserMessages] = useState<ChatMessage[]>([]);
  const optimisticUserMessagesRef = useRef(optimisticUserMessages);
  // Mirror during the commit, before events or async continuations can observe
  // the new UI with the previous render's preview URLs.
  useLayoutEffect(() => {
    optimisticUserMessagesRef.current = optimisticUserMessages;
  }, [optimisticUserMessages]);
  const composerAssistantSelectionsRef = useRef<ComposerAssistantSelectionAttachment[]>(
    composerAssistantSelections,
  );
  const composerBrowserAnnotationsRef = useRef<BrowserAnnotationDraft[]>(
    composerBrowserAnnotations,
  );
  const composerTerminalContextsRef = useRef<TerminalContextDraft[]>(composerTerminalContexts);
  const composerFileCommentsRef = useRef<FileCommentDraft[]>(composerFileComments);
  const composerPastedTextsRef = useRef<PastedTextDraft[]>(composerPastedTexts);
  const [localDraftErrorsByThreadId, setLocalDraftErrorsByThreadId] = useState<
    Record<ThreadId, string | null>
  >({});
  const [localDispatch, setLocalDispatch] = useState<LocalDispatchSnapshot | null>(null);
  const failedWorktreeSetupDispatchStartedAtRef = useRef<string | null>(null);
  const [isLocalConnecting, _setIsLocalConnecting] = useState(false);
  const [isRevertingCheckpoint, setIsRevertingCheckpoint] = useState(false);
  const [pendingFileUndo, setPendingFileUndo] = useState<PendingFileUndo | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [respondingUserInputRequestKeys] = useState<string[]>([]);
  const [pendingUserInputAnswersByRequestId, setPendingUserInputAnswersByRequestId] = useState<
    Record<string, Record<string, PendingUserInputDraftAnswer>>
  >({});
  const pendingUserInputAnswersByRequestIdRef = useRef(pendingUserInputAnswersByRequestId);
  const [pendingUserInputQuestionIndexByRequestId] = useState<Record<string, number>>({});
  const [planSidebarOpen, setPlanSidebarOpen] = useState(false);
  const [activeTaskListCompact, setActiveTaskListCompact] = useState(false);
  const [subagentStripCompact, setSubagentStripCompact] = useState(false);
  const [workflowRunCardCompact, setWorkflowRunCardCompact] = useState(false);
  const [isComposerFooterCompact, setIsComposerFooterCompact] = useState(false);
  // Width-aware visibility for the footer picker cluster (context meter,
  // model name, traits label). Inputs live in a ref so the resize observer
  // can re-plan without re-subscribing; the sync function is exposed via ref
  // so label changes can re-plan without a resize.
  const [composerFooterTier, setComposerFooterTier] = useState(0);
  const composerFooterTierRef = useRef(0);
  const composerFooterDemotionWidthsRef = useRef<ReadonlyArray<number | undefined>>([]);
  const composerFooterLayoutSyncRef = useRef<(() => void) | null>(null);
  const [secondaryChromePlaceholderHeight, setSecondaryChromePlaceholderHeight] = useState(88);
  // Tracks whether the user explicitly dismissed the sidebar for the active turn.
  const planSidebarDismissedForTurnRef = useRef<string | null>(null);
  // When set, the thread-change reset effect will open the sidebar instead of closing it.
  // Used by "Implement in a new thread" to carry the sidebar-open intent across navigation.
  const planSidebarOpenOnNextThreadRef = useRef(false);
  const [composerHighlightedItemId, setComposerHighlightedItemId] = useState<string | null>(null);
  const [pullRequestDialogState, setPullRequestDialogState] =
    useState<PullRequestDialogState | null>(null);
  const [attachmentPreviewHandoffByMessageId, setAttachmentPreviewHandoffByMessageId] = useState<
    Record<string, string[]>
  >({});
  const [composerCursor, setComposerCursor] = useState(() =>
    collapseExpandedComposerCursor(prompt, prompt.length),
  );
  const [composerTrigger, setComposerTrigger] = useState<ComposerTrigger | null>(() =>
    detectComposerTrigger(prompt, prompt.length),
  );
  const [selectedComposerSkills, setSelectedComposerSkills] = useState<ProviderSkillReference[]>(
    () => composerSkills,
  );
  const [selectedComposerMentions, setSelectedComposerMentions] = useState<
    ProviderMentionReference[]
  >(() => composerMentions);
  const selectedComposerSkillsRef = useRef<ProviderSkillReference[]>(selectedComposerSkills);
  const selectedComposerMentionsRef = useRef<ProviderMentionReference[]>(selectedComposerMentions);
  // The setters below stamp these refs synchronously; layout effects backstop
  // external state changes before another browser event can read stale values.
  useLayoutEffect(() => {
    selectedComposerSkillsRef.current = selectedComposerSkills;
  }, [selectedComposerSkills]);
  useLayoutEffect(() => {
    selectedComposerMentionsRef.current = selectedComposerMentions;
  }, [selectedComposerMentions]);
  const updateSelectedComposerSkills = useCallback(
    (
      next:
        | ProviderSkillReference[]
        | ((existing: ProviderSkillReference[]) => ProviderSkillReference[]),
    ) => {
      const existing = selectedComposerSkillsRef.current;
      const resolved = typeof next === "function" ? next(existing) : next;
      selectedComposerSkillsRef.current = resolved;
      setSelectedComposerSkills(resolved);
      setComposerDraftSkills(threadId, resolved);
    },
    [setComposerDraftSkills, threadId],
  );
  const updateSelectedComposerMentions = useCallback(
    (
      next:
        | ProviderMentionReference[]
        | ((existing: ProviderMentionReference[]) => ProviderMentionReference[]),
    ) => {
      const existing = selectedComposerMentionsRef.current;
      const resolved = typeof next === "function" ? next(existing) : next;
      selectedComposerMentionsRef.current = resolved;
      setSelectedComposerMentions(resolved);
      setComposerDraftMentions(threadId, resolved);
    },
    [setComposerDraftMentions, threadId],
  );
  const [lastInvokedScriptByProjectId, setLastInvokedScriptByProjectId] = useLocalStorage(
    LAST_INVOKED_SCRIPT_BY_PROJECT_KEY,
    EMPTY_LAST_INVOKED_SCRIPT_BY_PROJECT,
    LastInvokedScriptByProjectSchema,
  );
  const legendListRef = useRef<LegendListRef | null>(null);
  const timelineControllerRef = useRef<MessagesTimelineController | null>(null);
  const isAtEndRef = useRef(true);
  const autoFollowThreadIdRef = useRef<ThreadId | null>(null);
  const pendingInteractionAnchorRef = useRef<{
    element: HTMLElement;
    top: number;
  } | null>(null);
  const pendingInteractionAnchorFrameRef = useRef<number | null>(null);
  const showScrollDebouncer = useRef(
    new Debouncer(() => setShowScrollToBottom(true), { wait: 150 }),
  );

  useEffect(() => {
    // Async setState (post-paint) keeps this thread-change reset out of the
    // render->effect->render cascade; the pickers already closed post-commit.
    const settle = window.setTimeout(() => {}, 0);
    return () => window.clearTimeout(settle);
  }, [threadId]);
  useEffect(() => {
    const scrollDebouncer = showScrollDebouncer.current;
    return () => {
      scrollDebouncer.cancel();
      const pendingFrame = pendingInteractionAnchorFrameRef.current;
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
    };
  }, []);
  useEffect(() => {
    // Thread-bound handoff dialog state is reset by the dedicated hook.
  }, [threadId]);
  const composerEditorRef = useRef<ComposerPromptEditorHandle>(null);
  const composerFormRef = useRef<HTMLFormElement>(null);
  const isInteractionActive = useCallback(
    () => conversationActivity?.isActive() ?? true,
    [conversationActivity],
  );
  // Set by whichever mounted GitActionsControl instance (header quick-action or the
  // Environment panel row) last registered — either performs the identical commit &
  // push mutation for this thread's repo, so it doesn't matter which one is "current".
  const commitAndPushTriggerRef = useRef<(() => void) | null>(null);
  const onRegisterCommitAndPushTrigger = useCallback((trigger: (() => void) | null) => {
    commitAndPushTriggerRef.current = trigger;
  }, []);
  const pendingComposerFocusRef = useRef(false);
  const promptHistoryNavigationRef = useRef<PromptHistoryNavigationState | null>(null);
  const applyingPromptHistoryNavigationRef = useRef(false);
  const expectedPromptHistoryPromptRef = useRef<string | null>(null);
  const promptHistoryAppliedPromptRef = useRef<string | null>(null);
  const composerFormHeightRef = useRef(0);
  const composerImagesRef = useRef<ComposerImageAttachment[]>([]);
  const composerFilesRef = useRef<ComposerFileAttachment[]>([]);
  const composerSelectLockRef = useRef(false);
  const composerMenuOpenRef = useRef(false);
  const composerMenuItemsRef = useRef<ComposerCommandItem[]>([]);
  const restoredQueuedSourceProposedPlanRef = useRef<RestoredComposerSourceProposedPlan | null>(
    restoredSourceProposedPlan ?? null,
  );
  const activeComposerMenuItemRef = useRef<ComposerCommandItem | null>(null);
  const localDirectoryMenuRef = useRef<ComposerLocalDirectoryMenuHandle | null>(null);
  const attachmentPreviewHandoffByMessageIdRef = useRef<Record<string, string[]>>({});
  const attachmentPreviewHandoffTimeoutByMessageIdRef = useRef<Record<string, number>>({});
  const sendInFlightRef = useRef(false);
  const sendPreflightInFlightRef = useRef(false);
  const dragDepthRef = useRef(0);
  const terminalOpenByThreadRef = useRef<Record<string, boolean>>({});
  const activatedThreadIdRef = useRef<ThreadId | null>(null);
  useEffect(() => {
    promptHistoryNavigationRef.current = null;
    applyingPromptHistoryNavigationRef.current = false;
    expectedPromptHistoryPromptRef.current = null;
    promptHistoryAppliedPromptRef.current = null;
  }, [threadId]);
  // While a history browse is active the persisted draft prompt holds a
  // recalled entry and the user's real draft snapshot sits in promptHistorySavedDraft.
  // A non-null saved draft with no live navigation state means the browse was
  // interrupted (thread switch, reload, unmount) — put the real draft back.
  useEffect(() => {
    if (promptHistoryNavigationRef.current !== null || composerPromptHistorySavedDraft === null) {
      return;
    }
    restoreComposerDraftPromptHistorySavedDraft(threadId);
    setComposerCursor(
      collapseExpandedComposerCursor(
        composerPromptHistorySavedDraft.prompt,
        composerPromptHistorySavedDraft.prompt.length,
      ),
    );
  }, [composerPromptHistorySavedDraft, restoreComposerDraftPromptHistorySavedDraft, threadId]);
  const setRestoredQueuedSourceProposedPlan = useCallback(
    (targetThreadId: ThreadId, source: RestoredComposerSourceProposedPlan | null) => {
      restoredQueuedSourceProposedPlanRef.current = source;
      setComposerDraftRestoredSourceProposedPlan(targetThreadId, source);
    },
    [setComposerDraftRestoredSourceProposedPlan],
  );
  useEffect(() => {
    restoredQueuedSourceProposedPlanRef.current = restoredSourceProposedPlan ?? null;
  }, [restoredSourceProposedPlan]);

  const setPrompt = useCallback(
    (nextPrompt: string) => {
      setComposerDraftPrompt(threadId, nextPrompt);
    },
    [setComposerDraftPrompt, threadId],
  );
  const discardPromptHistoryNavigationForComposerMutation = useCallback(() => {
    if (promptHistoryNavigationRef.current === null) {
      return;
    }
    // Attachment edits mean the recalled prompt is now the user's draft; do not restore the old one.
    promptHistoryNavigationRef.current = null;
    applyingPromptHistoryNavigationRef.current = false;
    expectedPromptHistoryPromptRef.current = null;
    promptHistoryAppliedPromptRef.current = null;
    setComposerDraftPromptHistorySavedDraft(threadId, null);
  }, [setComposerDraftPromptHistorySavedDraft, threadId]);
  const addComposerImagesToDraft = useCallback(
    (images: ComposerImageAttachment[]) => {
      discardPromptHistoryNavigationForComposerMutation();
      return addComposerDraftImages(threadId, images);
    },
    [addComposerDraftImages, discardPromptHistoryNavigationForComposerMutation, threadId],
  );
  const addComposerFilesToDraft = useCallback(
    (files: ComposerFileAttachment[]) => {
      discardPromptHistoryNavigationForComposerMutation();
      return addComposerDraftFiles(threadId, files);
    },
    [addComposerDraftFiles, discardPromptHistoryNavigationForComposerMutation, threadId],
  );
  const addComposerAssistantSelectionToDraft = useCallback(
    (selection: ComposerAssistantSelectionAttachment) => {
      discardPromptHistoryNavigationForComposerMutation();
      return addComposerDraftAssistantSelection(threadId, selection);
    },
    [
      addComposerDraftAssistantSelection,
      discardPromptHistoryNavigationForComposerMutation,
      threadId,
    ],
  );
  const addComposerTerminalContextsToDraft = useCallback(
    (contexts: TerminalContextDraft[]) => {
      discardPromptHistoryNavigationForComposerMutation();
      addComposerDraftTerminalContexts(threadId, contexts);
    },
    [addComposerDraftTerminalContexts, discardPromptHistoryNavigationForComposerMutation, threadId],
  );
  const addComposerPastedTextsToDraft = useCallback(
    (pastedTexts: PastedTextDraft[]) => {
      discardPromptHistoryNavigationForComposerMutation();
      addComposerDraftPastedTexts(threadId, pastedTexts);
    },
    [addComposerDraftPastedTexts, discardPromptHistoryNavigationForComposerMutation, threadId],
  );
  const addComposerFileCommentToDraft = useCallback(
    (comment: FileCommentDraft) => {
      discardPromptHistoryNavigationForComposerMutation();
      addComposerDraftFileComment(threadId, comment);
    },
    [addComposerDraftFileComment, discardPromptHistoryNavigationForComposerMutation, threadId],
  );
  const removeComposerImageFromDraft = useCallback(
    (imageId: string) => {
      discardPromptHistoryNavigationForComposerMutation();
      removeComposerDraftImage(threadId, imageId);
    },
    [discardPromptHistoryNavigationForComposerMutation, removeComposerDraftImage, threadId],
  );
  const clearComposerAssistantSelectionsFromDraft = useCallback(() => {
    discardPromptHistoryNavigationForComposerMutation();
    clearComposerDraftAssistantSelections(threadId);
  }, [
    clearComposerDraftAssistantSelections,
    discardPromptHistoryNavigationForComposerMutation,
    threadId,
  ]);
  const clearComposerFileCommentsFromDraft = useCallback(() => {
    discardPromptHistoryNavigationForComposerMutation();
    clearComposerDraftFileComments(threadId);
  }, [clearComposerDraftFileComments, discardPromptHistoryNavigationForComposerMutation, threadId]);
  const removeComposerTerminalContextFromDraft = useCallback(
    (contextId: string) => {
      discardPromptHistoryNavigationForComposerMutation();
      const contextIndex = composerTerminalContexts.findIndex(
        (context) => context.id === contextId,
      );
      if (contextIndex < 0) {
        return;
      }
      const nextPrompt = removeInlineTerminalContextPlaceholder(promptRef.current, contextIndex);
      promptRef.current = nextPrompt.prompt;
      setPrompt(nextPrompt.prompt);
      removeComposerDraftTerminalContext(threadId, contextId);
      setComposerCursor(nextPrompt.cursor);
      setComposerTrigger(
        detectComposerTrigger(
          nextPrompt.prompt,
          expandCollapsedComposerCursor(nextPrompt.prompt, nextPrompt.cursor),
        ),
      );
    },
    [
      composerTerminalContexts,
      discardPromptHistoryNavigationForComposerMutation,
      removeComposerDraftTerminalContext,
      setPrompt,
      threadId,
    ],
  );
  const removeComposerPastedTextFromDraft = useCallback(
    (pastedTextId: string) => {
      discardPromptHistoryNavigationForComposerMutation();
      removeComposerDraftPastedText(threadId, pastedTextId);
    },
    [discardPromptHistoryNavigationForComposerMutation, removeComposerDraftPastedText, threadId],
  );
  const removeComposerBrowserAnnotationFromDraft = useCallback(
    (annotationId: string) => {
      discardPromptHistoryNavigationForComposerMutation();
      removeComposerDraftBrowserAnnotation(threadId, annotationId);
    },
    [
      discardPromptHistoryNavigationForComposerMutation,
      removeComposerDraftBrowserAnnotation,
      threadId,
    ],
  );
  // "Show in text field": drop the full pasted text back into the editor (appended
  // to the current prompt) and discard the card so it can be edited as normal text.
  const showComposerPastedTextInField = useCallback(
    (pastedTextId: string) => {
      const pasted = composerPastedTexts.find((entry) => entry.id === pastedTextId);
      if (!pasted) {
        return;
      }
      discardPromptHistoryNavigationForComposerMutation();
      const current = promptRef.current;
      const separator = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
      const nextPrompt = `${current}${separator}${pasted.text}`;
      promptRef.current = nextPrompt;
      setPrompt(nextPrompt);
      removeComposerDraftPastedText(threadId, pastedTextId);
      setComposerCursor(collapseExpandedComposerCursor(nextPrompt, nextPrompt.length));
      setComposerTrigger(detectComposerTrigger(nextPrompt, nextPrompt.length));
      window.requestAnimationFrame(() => {
        composerEditorRef.current?.focusAtEnd();
      });
    },
    [
      composerPastedTexts,
      discardPromptHistoryNavigationForComposerMutation,
      removeComposerDraftPastedText,
      setPrompt,
      threadId,
    ],
  );

  const localDraftError = serverThread ? null : (localDraftErrorsByThreadId[threadId] ?? null);
  const localDraftModelSelection = composerDraft.activeProvider
    ? composerDraft.modelSelectionByProvider[composerDraft.activeProvider]
    : undefined;
  const localDraftThread = useMemo(() => {
    if (!draftThread || !localDraftModelSelection) {
      return undefined;
    }
    return buildLocalDraftThread(threadId, draftThread, localDraftModelSelection, localDraftError);
  }, [draftThread, localDraftError, localDraftModelSelection, threadId]);
  const productPresentationThread = useMemo(() => {
    const presented = presentProductConversationThread(productReadModel);
    const productError = localDraftErrorsByThreadId[threadId] ?? null;
    return presented && productError ? { ...presented, error: productError } : presented;
  }, [localDraftErrorsByThreadId, productReadModel, threadId]);
  const historicalPresentationThread = useMemo(() => {
    const thread = serverThread ?? localDraftThread;
    return thread ? presentHistoricalConversation(thread) : undefined;
  }, [localDraftThread, serverThread]);
  const activeThread = productConversationSummary
    ? productPresentationThread
    : (historicalPresentationThread ?? productPresentationThread);
  useEffect(() => {
    if (
      !pendingFileUndo ||
      !hasFileUndoSettled({
        pending: pendingFileUndo,
        thread: activeThread ?? null,
      })
    ) {
      return;
    }
    // Async setState (post-paint) keeps this settled-undo cleanup out of the
    // render->effect->render cascade.
    const settle = window.setTimeout(() => {
      setPendingFileUndo(null);
      setIsRevertingCheckpoint(false);
    }, 0);
    return () => window.clearTimeout(settle);
  }, [activeThread, pendingFileUndo]);
  const runtimeMode =
    composerDraft.runtimeMode ?? activeThread?.runtimeMode ?? DEFAULT_RUNTIME_MODE;
  const runtimeModePersistenceQueuesRef = useRef(
    new Map<ThreadId, ReturnType<typeof createRuntimeModePersistenceQueue>>(),
  );
  useEffect(() => {
    const existing = runtimeModePersistenceQueuesRef.current.get(threadId);
    if (existing) {
      existing.syncAcknowledgedMode(runtimeMode);
      return;
    }
    runtimeModePersistenceQueuesRef.current.set(
      threadId,
      createRuntimeModePersistenceQueue(runtimeMode),
    );
  }, [runtimeMode, threadId]);
  const isServerThread = serverThread !== undefined && activeThread === serverThread;
  const isLocalDraftThread =
    !isServerThread && localDraftThread !== undefined && activeThread === localDraftThread;
  const isProductConversationThread =
    productReadModel !== undefined ||
    productConversationSummary !== undefined ||
    isLocalDraftThread;
  const interactionMode = isProductConversationThread
    ? DEFAULT_INTERACTION_MODE
    : (composerDraft.interactionMode ?? activeThread?.interactionMode ?? DEFAULT_INTERACTION_MODE);
  useEffect(() => {
    // A persisted donor-era composer draft may outlive its thread's cutover to
    // Product. Product admission cannot encode `plan`, so discard that stale
    // control at the Product conversation boundary instead of presenting it.
    if (isProductConversationThread && composerDraft.interactionMode !== null) {
      setComposerDraftInteractionMode(threadId, null);
    }
  }, [
    composerDraft.interactionMode,
    isProductConversationThread,
    setComposerDraftInteractionMode,
    threadId,
  ]);
  const hasProductActiveRun =
    productReadModel?.runs.some(
      (run) => run.receipt.receipt.state === "accepted" || run.receipt.receipt.state === "running",
    ) ?? false;
  const hasProductUnresolvedRun =
    productReadModel?.runs.some(
      (run) =>
        run.receipt.receipt.state === "delivery_unknown" ||
        run.receipt.receipt.state === "outcome_unknown",
    ) ?? false;
  const canCheckoutPullRequestIntoThread = isLocalDraftThread;
  const diffOpen = panelState?.panel === "diff";
  const browserOpen = panelState?.panel === "browser";
  const resolvedDiffOpen = diffOpen;
  const activeThreadId = activeThread?.id ?? null;
  const activeLatestTurn = activeThread?.latestTurn ?? null;
  // Read once here so memo bodies depend on the turn id instead of the turn object: a
  // `foo?.bar` read inside a memo makes React Compiler infer `foo` as the dependency, which
  // no longer matches the hand-written `foo?.bar` dep and bails the whole component out.
  const activeLatestTurnId = activeLatestTurn?.turnId ?? null;
  const activeLatestTurnStartedAt = activeLatestTurn?.startedAt ?? null;
  const activeLatestTurnState = activeLatestTurn?.state ?? null;
  const activeLatestTurnCompletedAt = activeLatestTurn?.completedAt ?? null;
  const threadActivities = activeThread?.activities ?? EMPTY_ACTIVITIES;
  const hasLiveTurnTail = hasLiveTurnTailWork({
    latestTurn: activeLatestTurn,
    messages: activeThread?.messages ?? EMPTY_MESSAGES,
    activities: threadActivities,
    session: activeThread?.session ?? null,
  });
  const activeContextWindow = useMemo(
    () => deriveLatestContextWindowSnapshot(threadActivities),
    [threadActivities],
  );
  const activeCumulativeCostUsd = useMemo(
    () => deriveCumulativeCostUsd(threadActivities),
    [threadActivities],
  );
  const activeRateLimitStatus = useMemo(
    () => deriveLatestRateLimitStatus(threadActivities),
    [threadActivities],
  );
  const latestTurnSettledByProvider = isLatestTurnSettled(
    activeLatestTurn,
    activeThread?.session ?? null,
  );
  const latestTurnSettled = latestTurnSettledByProvider && !hasLiveTurnTail;
  // `latestTurnSettled` is also false when there is NO started turn (a brand-new
  // chat), because `isLatestTurnSettled` treats a non-existent turn as unsettled.
  // Gate live-turn UI on an actually-started turn so composer chrome cannot
  // appear on a fresh chat just because the repo already has local edits.
  const latestTurnLive = Boolean(activeLatestTurn?.startedAt) && !latestTurnSettled;
  const activeProjectId = activeThread?.projectId ?? draftThread?.projectId ?? null;
  const storedActiveProject = useStore(
    useMemo(() => createProjectSelector(activeProjectId), [activeProjectId]),
  );
  const productPresentationProject = useMemo(
    () => presentProductConversationProject(productReadModel),
    [productReadModel],
  );
  const activeProject = storedActiveProject ?? productPresentationProject;
  const { handleNewThread } = useHandleNewThreadForFocusedContext({
    routeThreadId: threadId,
    splitView: activeSplitView ?? null,
    focusedThreadId: threadId,
    activeThread: activeThread ?? null,
    activeDraftThread: draftThread,
    activeProject: activeProject ?? null,
    activeProjectId,
  });
  const { handleNewChat } = useHandleNewChatWithThreadHandler(handleNewThread);
  const deletePlaceholderTerminalThread = useCallback(
    async (terminalThreadId: ThreadId) => {
      const deleteEmptyTerminalThread = async () => {
        useComposerDraftStore.getState().clearDraftThread(terminalThreadId);
        useTerminalStateStore.getState().clearTerminalState(terminalThreadId);
        removeThreadFromSplitViews(terminalThreadId);
        if (activeSplitView) {
          const nextSplitView = useSplitViewStore.getState().splitViewsById[activeSplitView.id];
          const nextThreadId = nextSplitView
            ? resolveSplitViewFocusedThreadId(nextSplitView)
            : null;
          if (nextSplitView && nextThreadId) {
            await navigate({
              to: "/$threadId",
              params: { threadId: nextThreadId },
              replace: true,
              search: () => ({ splitViewId: nextSplitView.id }),
            });
            return;
          }
        }
        await handleNewChat({ fresh: true });
      };

      try {
        await deleteEmptyTerminalThread();
      } catch (error) {
        console.error("Failed to delete empty terminal thread after closing its last terminal", {
          threadId: terminalThreadId,
          error,
        });
      }
    },
    [activeSplitView, handleNewChat, navigate, removeThreadFromSplitViews],
  );
  const {
    terminalState,
    terminalFocusRequestId,
    requestTerminalFocus,
    terminalWorkspaceOpen,
    terminalWorkspaceTerminalTabActive,
    terminalWorkspaceChatTabActive,
    setTerminalOpen,
    setTerminalPresentationMode,
    setTerminalWorkspaceLayout,
    setTerminalWorkspaceTab,
    setTerminalHeight,
    setTerminalMetadataInStore: storeSetTerminalMetadata,
    setTerminalActivityInStore: storeSetTerminalActivity,
    openChatThreadPageInStore: storeOpenChatThreadPage,
    openTerminalThreadPageInStore: storeOpenTerminalThreadPage,
    newTerminalInStore: storeNewTerminal,
    setActiveTerminalInStore: storeSetActiveTerminal,
    closeTerminalGroupInStore: storeCloseTerminalGroup,
    resizeTerminalSplitInStore: storeResizeTerminalSplit,
    toggleTerminalVisibility,
    expandTerminalWorkspace,
    collapseTerminalWorkspace,
    splitTerminalLeft,
    splitTerminalRight,
    splitTerminalDown,
    splitTerminalUp,
    createNewTerminal,
    createNewTerminalTab,
    createTerminalFromShortcut,
    moveTerminalToNewGroup,
    openNewFullWidthTerminal,
    activateTerminal,
    closeTerminal,
    handleTerminalSessionExited,
    closeActiveWorkspaceView,
  } = useChatTerminalController({
    threadId,
    activeThreadId,
    activeThread,
    activeProjectPresent: activeProject !== undefined,
    isFocusedPane,
    isInteractionActive,
    isServerThread,
    confirmTerminalClose: settings.confirmTerminalTabClose,
    onDeletePlaceholderThread: deletePlaceholderTerminalThread,
  });
  const projectInstructions = useProjectInstructionsStore((state) =>
    activeProjectId ? (state.instructionsByProjectId[activeProjectId] ?? "") : "",
  );
  const setProjectInstructions = useProjectInstructionsStore((state) => state.setInstructions);
  const homeDir = useWorkspacePathsStore((state) => state.homeDir);
  const chatWorkspaceRoot = useWorkspacePathsStore((state) => state.chatWorkspaceRoot);
  const studioWorkspaceRoot = useWorkspacePathsStore((state) => state.studioWorkspaceRoot);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const isHomeChatContainer = isHomeChatContainerProject(activeProject, {
    homeDir,
    chatWorkspaceRoot,
  });
  const isStudioContainer = isStudioContainerProject(activeProject, {
    homeDir,
    chatWorkspaceRoot,
    studioWorkspaceRoot,
  });
  const isContainerLandingProject =
    isHomeChatContainer || isStudioContainer || isChatProductSurface;
  const activeProjectDisplayName = isChatProductSurface
    ? undefined
    : isHomeChatContainer
      ? activeProject?.folderName
      : activeProject?.name;
  const isChatProject = isContainerLandingProject;
  const activeProjectScripts =
    activeProject?.kind === "project" ? activeProject.scripts : undefined;
  const threadLineageThreads = useStore(
    useMemo(() => createThreadLineageSelector(activeThread?.id ?? null), [activeThread?.id]),
  );
  const threadBreadcrumbs = useMemo(
    () => buildThreadBreadcrumbs(threadLineageThreads, activeThread),
    [activeThread, threadLineageThreads],
  );
  // Studio threads are always local. Their optional "Use a folder" cwd is stored separately
  // from Git worktree metadata; the server migration repairs the legacy mixed representation.
  const resolvedThreadEnvMode = isStudioContainer
    ? "local"
    : isServerThread
      ? (activeThread?.envMode ?? null)
      : (draftThread?.envMode ?? null);
  const resolvedThreadWorktreePath = isStudioContainer
    ? null
    : isServerThread
      ? (activeThread?.worktreePath ?? null)
      : (draftThread?.worktreePath ?? null);
  const resolvedThreadWorkingDirectory = isServerThread
    ? (activeThread?.workingDirectory ?? null)
    : (draftThread?.workingDirectory ?? null);
  const diffEnvironmentState = resolveDiffEnvironmentState({
    projectCwd: activeProject?.cwd ?? null,
    envMode: resolvedThreadEnvMode,
    worktreePath: resolvedThreadWorktreePath,
  });
  const diffEnvironmentPending = diffEnvironmentState.pending;
  const diffDisabledReason = diffEnvironmentState.disabledReason;
  const repoDiffBadgeRefreshIntervalMs =
    isFocusedPane && latestTurnLive && !diffEnvironmentPending && !resolvedDiffOpen
      ? GIT_WORKING_TREE_DIFF_LIVE_REFETCH_INTERVAL_MS
      : false;
  const activeThreadAssociatedWorktree = useMemo(
    () =>
      deriveAssociatedWorktreeMetadata({
        branch: activeThread?.branch ?? null,
        worktreePath: activeThread?.worktreePath ?? null,
        ...(activeThread?.associatedWorktreePath !== undefined
          ? { associatedWorktreePath: activeThread.associatedWorktreePath }
          : {}),
        ...(activeThread?.associatedWorktreeBranch !== undefined
          ? { associatedWorktreeBranch: activeThread.associatedWorktreeBranch }
          : {}),
        ...(activeThread?.associatedWorktreeRef !== undefined
          ? { associatedWorktreeRef: activeThread.associatedWorktreeRef }
          : {}),
      }),
    [activeThread],
  );

  const openPullRequestDialog = useCallback(
    (reference?: string) => {
      if (!canCheckoutPullRequestIntoThread) {
        return;
      }
      setPullRequestDialogState({
        initialReference: reference ?? null,
        key: Date.now(),
      });
      setComposerHighlightedItemId(null);
    },
    [canCheckoutPullRequestIntoThread],
  );

  const closePullRequestDialog = useCallback(() => {
    setPullRequestDialogState(null);
  }, []);

  const openOrReuseProjectDraftThread = useCallback(
    async (input: {
      branch: string;
      worktreePath: string | null;
      envMode: DraftThreadEnvMode;
      lastKnownPr?: Thread["lastKnownPr"];
    }) => {
      if (!activeProject) {
        throw new Error("No active project is available for this pull request.");
      }
      const draftThreadContext = {
        branch: input.branch,
        worktreePath: input.worktreePath,
        envMode: input.envMode,
        ...(input.lastKnownPr !== undefined ? { lastKnownPr: input.lastKnownPr } : {}),
      };
      const storedDraftThread = getDraftThreadByProjectId(activeProject.id);
      if (storedDraftThread) {
        setDraftThreadContext(storedDraftThread.threadId, draftThreadContext);
        setProjectDraftThreadId(activeProject.id, storedDraftThread.threadId, draftThreadContext);
        if (storedDraftThread.threadId !== threadId) {
          await navigate({
            to: "/$threadId",
            params: { threadId: storedDraftThread.threadId },
          });
        }
        return;
      }

      const activeDraftThread = getDraftThread(threadId);
      if (
        !isServerThread &&
        activeDraftThread?.projectId === activeProject.id &&
        activeDraftThread.entryPoint === "chat"
      ) {
        setDraftThreadContext(threadId, draftThreadContext);
        setProjectDraftThreadId(activeProject.id, threadId, draftThreadContext);
        return;
      }

      clearProjectDraftThreadId(activeProject.id);
      const nextThreadId = newThreadId();
      setProjectDraftThreadId(activeProject.id, nextThreadId, {
        ...draftThreadContext,
        createdAt: new Date().toISOString(),
        runtimeMode: DEFAULT_RUNTIME_MODE,
        interactionMode: DEFAULT_INTERACTION_MODE,
      });
      await navigate({
        to: "/$threadId",
        params: { threadId: nextThreadId },
      });
    },
    [
      activeProject,
      clearProjectDraftThreadId,
      getDraftThread,
      getDraftThreadByProjectId,
      isServerThread,
      navigate,
      setDraftThreadContext,
      setProjectDraftThreadId,
      threadId,
    ],
  );

  const handlePreparedPullRequestThread = useCallback(
    async (input: {
      branch: string;
      worktreePath: string | null;
      pullRequest: NonNullable<Thread["lastKnownPr"]>;
    }) => {
      await openOrReuseProjectDraftThread({
        branch: input.branch,
        worktreePath: input.worktreePath,
        envMode: input.worktreePath ? "worktree" : "local",
        lastKnownPr: input.pullRequest,
      });
    },
    [openOrReuseProjectDraftThread],
  );

  useMarkSettledConversationVisited({
    ...(conversationActivity ? { activity: conversationActivity } : {}),
    threadId: activeThread?.id ?? null,
    settled: latestTurnSettled,
    completedAt: activeLatestTurn?.completedAt ?? null,
    lastVisitedAt: activeThread?.lastVisitedAt ?? null,
    markVisited: markThreadVisited,
  });

  const hasThreadStarted = Boolean(
    activeThread &&
    (activeThread.latestTurn !== null ||
      activeThread.messages.length > 0 ||
      (productReadModel?.entries.length ?? 0) > 0 ||
      activeThread.session !== null),
  );
  const selectedProvider = "pi" as const;
  const featureFlags = useFeatureFlags();
  const showDebugTaskBanner = import.meta.env.DEV && featureFlags["show-debug-task-banner"];
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const [productRequestedSelection, setProductRequestedSelection] =
    useState<ProductRequestedSelection | null>(null);
  useEffect(() => {
    setProductRequestedSelection((current) =>
      reconcileProductRuntimeSelection(productRuntimeCatalog, current),
    );
  }, [productRuntimeCatalog]);
  const productRuntimeModelId =
    productRequestedSelection?.state === "selected"
      ? productRequestedSelection.runtimeModelId
      : (productRequestedSelection?.requestedRuntimeModelId ?? null);
  const productRuntimeThinking =
    productRequestedSelection?.state === "selected" ? productRequestedSelection.thinking : null;
  const selectedModel = productRuntimeModelId;
  const commitProductRuntimeSelection = useCallback(
    (modelId: string, requestedThinking?: string | null) => {
      const catalog = productRuntimeCatalog;
      const model = catalog?.models.find(
        (candidate) => candidate.id === modelId && isProductRuntimeModelSelectable(candidate),
      );
      if (!catalog || !model) return;
      const catalogThinking = requestedThinking as (typeof model.thinkingLevels)[number] | null;
      const thinking =
        catalogThinking && model.thinkingLevels.includes(catalogThinking)
          ? catalogThinking
          : model.thinkingLevels.includes("medium")
            ? "medium"
            : (model.thinkingLevels[0] ?? null);
      setProductRequestedSelection({
        state: "selected",
        engineId: catalog.engineId,
        runtimeModelId: model.id,
        thinking,
        packageGeneration: catalog.packageGeneration,
        permissionPolicy: "approval-required",
        enforcement: catalog.capabilities.enforcement,
        executionTarget: null,
      });
    },
    [productRuntimeCatalog],
  );
  const phase = derivePhase(activeThread?.session ?? null);
  const isConnecting = isLocalConnecting || phase === "connecting";
  // User messages intentionally have no turn id; assistant messages are the stable
  // bridge for deciding which historical work can fold into visible replies.
  // Memoized on purpose: an inline Set would change identity every render and cascade
  // through the memoized work-log/timeline chain into the virtualized list, which resets
  // in a loop on unstable data.
  const workLogVisibleTurnIds = useMemo(() => {
    const turnIds = new Set<TurnId>();
    for (const message of activeThread?.messages ?? []) {
      if (message.turnId) {
        turnIds.add(message.turnId);
      }
    }
    if (activeLatestTurnId) {
      turnIds.add(activeLatestTurnId);
    }
    return turnIds;
  }, [activeLatestTurnId, activeThread?.messages]);
  const rawWorkLogEntries = useMemo(
    () =>
      deriveWorkLogEntries(threadActivities, activeLatestTurnId ?? undefined, {
        visibleTurnIds: workLogVisibleTurnIds,
        activeTurnId: latestTurnLive ? activeLatestTurnId : null,
        activeTurnStartedAt: activeLatestTurnStartedAt,
        latestTurnState: activeLatestTurnState,
        latestTurnCompletedAt: activeLatestTurnCompletedAt,
      }),
    [
      activeLatestTurnCompletedAt,
      activeLatestTurnId,
      activeLatestTurnStartedAt,
      activeLatestTurnState,
      latestTurnLive,
      threadActivities,
      workLogVisibleTurnIds,
    ],
  );
  const hasWorkLogSubagents = useMemo(
    () => rawWorkLogEntries.some((entry) => (entry.subagents?.length ?? 0) > 0),
    [rawWorkLogEntries],
  );
  const relevantWorkLogThreads = useStore(
    useMemo(
      () =>
        createRelevantWorkLogThreadsSelector({
          workEntries: rawWorkLogEntries,
          parentThreadId: activeThread?.id ?? null,
          enabled: hasWorkLogSubagents,
        }),
      [activeThread?.id, hasWorkLogSubagents, rawWorkLogEntries],
    ),
  );
  const enrichedWorkLogEntries = useMemo(
    () =>
      hasWorkLogSubagents
        ? enrichSubagentWorkEntries(
            rawWorkLogEntries,
            relevantWorkLogThreads,
            activeThread?.id ?? null,
          )
        : rawWorkLogEntries,
    [activeThread?.id, hasWorkLogSubagents, rawWorkLogEntries, relevantWorkLogThreads],
  );
  // Subagents are presented by the composer strip (and their own threads); the
  // transcript drops the routed fan-out rows entirely. The enriched list above is
  // still what feeds the strip-adjacent derivations that need receiver metadata.
  const workLogEntries = useMemo(
    () => omitRoutedSubagentWorkEntries(enrichedWorkLogEntries),
    [enrichedWorkLogEntries],
  );
  // The strip's liveness (running/settled) reads the child thread's own session and
  // tail activities, so retain a detail subscription while a subagent runs; settled
  // subagents stay on whatever the store already holds.
  // Native-CLI parity: while a subagent thread is open, the strip derives from the
  // PARENT thread's activities so all sibling subagents (plus a way back to the
  // main thread) stay visible, with the open subagent marked as viewed.
  const stripParentThreadId = activeThread?.parentThreadId ?? null;
  const stripParentThread = useStore(
    useMemo(() => createThreadSelector(stripParentThreadId), [stripParentThreadId]),
  );
  const stripSourceThreadId = stripParentThread?.id ?? activeThread?.id ?? null;
  const stripSourceActivities = stripParentThread?.activities ?? threadActivities;
  const stripSourceLatestTurnId = stripParentThread
    ? (stripParentThread.latestTurn?.turnId ?? null)
    : (activeLatestTurn?.turnId ?? null);
  const stripSourceLatestTurnState = stripParentThread
    ? (stripParentThread.latestTurn?.state ?? null)
    : activeLatestTurnState;
  const stripSourceLatestTurnStartedAt = stripParentThread
    ? (stripParentThread.latestTurn?.startedAt ?? null)
    : activeLatestTurnStartedAt;
  const stripSourceLatestTurnCompletedAt = stripParentThread
    ? (stripParentThread.latestTurn?.completedAt ?? null)
    : activeLatestTurnCompletedAt;
  const stripVisibleTurnIds = useMemo(() => {
    if (!stripParentThread) {
      return workLogVisibleTurnIds;
    }
    const turnIds = new Set<TurnId>();
    for (const message of stripParentThread.messages) {
      if (message.turnId) {
        turnIds.add(message.turnId);
      }
    }
    if (stripParentThread.latestTurn?.turnId) {
      turnIds.add(stripParentThread.latestTurn.turnId);
    }
    return turnIds;
  }, [stripParentThread, workLogVisibleTurnIds]);
  const stripLiveTurnId = stripParentThread
    ? isLatestTurnSettled(stripParentThread.latestTurn, stripParentThread.session ?? null)
      ? null
      : (stripParentThread.latestTurn?.turnId ?? null)
    : latestTurnSettled
      ? null
      : (activeLatestTurn?.turnId ?? null);
  // Composer-strip source: the strip needs the routed subagent entries the
  // transcript drops, so it derives from the parent thread's own activities.
  const stripRawWorkLogEntries = useMemo(
    () =>
      deriveWorkLogEntries(stripSourceActivities, stripSourceLatestTurnId ?? undefined, {
        visibleTurnIds: stripVisibleTurnIds,
        activeTurnId: stripLiveTurnId,
        activeTurnStartedAt: stripSourceLatestTurnStartedAt,
        latestTurnState: stripSourceLatestTurnState,
        latestTurnCompletedAt: stripSourceLatestTurnCompletedAt,
      }),
    [
      stripLiveTurnId,
      stripSourceActivities,
      stripSourceLatestTurnCompletedAt,
      stripSourceLatestTurnId,
      stripSourceLatestTurnStartedAt,
      stripSourceLatestTurnState,
      stripVisibleTurnIds,
    ],
  );
  const hasStripWorkLogSubagents = useMemo(
    () => stripRawWorkLogEntries.some((entry) => (entry.subagents?.length ?? 0) > 0),
    [stripRawWorkLogEntries],
  );
  const stripRelevantWorkLogThreads = useStore(
    useMemo(
      () =>
        createRelevantWorkLogThreadsSelector({
          workEntries: stripRawWorkLogEntries,
          parentThreadId: stripSourceThreadId,
          enabled: hasStripWorkLogSubagents,
        }),
      [stripSourceThreadId, hasStripWorkLogSubagents, stripRawWorkLogEntries],
    ),
  );
  const stripWorkLogEntries = useMemo(
    () =>
      hasStripWorkLogSubagents
        ? enrichSubagentWorkEntries(
            stripRawWorkLogEntries,
            stripRelevantWorkLogThreads,
            stripSourceThreadId,
          )
        : stripRawWorkLogEntries,
    [
      stripSourceThreadId,
      hasStripWorkLogSubagents,
      stripRawWorkLogEntries,
      stripRelevantWorkLogThreads,
    ],
  );
  const [openAgentActivityId, setOpenAgentActivityId] = useState<string | null>(null);
  const agentActivityTimelineState = useMemo(
    () => deriveAgentActivityTimelineState(workLogEntries),
    [workLogEntries],
  );
  const openAgentActivityDetail = openAgentActivityId
    ? (agentActivityTimelineState.detailById.get(openAgentActivityId) ?? null)
    : null;
  useEffect(() => {
    // Async setState (post-paint) keeps this thread-change reset out of the
    // render->effect->render cascade.
    const settle = window.setTimeout(() => {
      setOpenAgentActivityId(null);
    }, 0);
    return () => window.clearTimeout(settle);
  }, [activeThread?.id]);
  useEffect(() => {
    if (!openAgentActivityId || agentActivityTimelineState.detailById.has(openAgentActivityId)) {
      return;
    }
    // Async setState (post-paint) keeps this stale-detail cleanup out of the
    // render->effect->render cascade.
    const settle = window.setTimeout(() => {
      setOpenAgentActivityId(null);
    }, 0);
    return () => window.clearTimeout(settle);
  }, [agentActivityTimelineState.detailById, openAgentActivityId]);
  const pendingApprovals = useMemo(
    () => derivePendingApprovals(threadActivities, activeThread?.pendingInteractions),
    [activeThread?.pendingInteractions, threadActivities],
  );
  const pendingUserInputs = useMemo(
    () => derivePendingUserInputs(threadActivities, activeThread?.pendingInteractions),
    [activeThread?.pendingInteractions, threadActivities],
  );
  const activePendingUserInput = pendingUserInputs[0] ?? null;
  const activePendingUserInputKey = activePendingUserInput
    ? pendingConversationRequestInstanceKey(
        activePendingUserInput.requestId,
        activePendingUserInput.lifecycleGeneration,
      )
    : null;
  const activePendingDraftAnswers = useMemo(
    () =>
      activePendingUserInputKey
        ? (pendingUserInputAnswersByRequestId[activePendingUserInputKey] ??
          EMPTY_PENDING_USER_INPUT_ANSWERS)
        : EMPTY_PENDING_USER_INPUT_ANSWERS,
    [activePendingUserInputKey, pendingUserInputAnswersByRequestId],
  );
  const activePendingQuestionIndex = activePendingUserInputKey
    ? (pendingUserInputQuestionIndexByRequestId[activePendingUserInputKey] ?? 0)
    : 0;
  const activePendingProgress = useMemo(
    () =>
      activePendingUserInput
        ? derivePendingUserInputProgress(
            activePendingUserInput.questions,
            activePendingDraftAnswers,
            activePendingQuestionIndex,
          )
        : null,
    [activePendingDraftAnswers, activePendingQuestionIndex, activePendingUserInput],
  );
  // Read once here for the same reason as `activeLatestTurnId`: an `activePendingProgress?.x`
  // read inside a memo body makes React Compiler infer `activePendingProgress` as the
  // dependency, which no longer matches the hand-written property-path dep.
  const activePendingResolvedAnswers = useMemo(
    () =>
      activePendingUserInput
        ? buildPendingUserInputAnswers(activePendingUserInput.questions, activePendingDraftAnswers)
        : null,
    [activePendingDraftAnswers, activePendingUserInput],
  );
  const activePendingIsResponding = activePendingUserInputKey
    ? respondingUserInputRequestKeys.includes(activePendingUserInputKey)
    : false;
  const activeProposedPlan = useMemo(() => {
    if (!latestTurnSettled) {
      return null;
    }
    return findLatestProposedPlan(
      activeThread?.proposedPlans ?? [],
      activeLatestTurn?.turnId ?? null,
    );
  }, [activeLatestTurn?.turnId, activeThread?.proposedPlans, latestTurnSettled]);
  const sidebarPlanSourceThreadId = !latestTurnSettled
    ? (activeLatestTurn?.sourceProposedPlan?.threadId ?? null)
    : null;
  const sidebarPlanSourceThread = useStore(
    useMemo(() => createThreadSelector(sidebarPlanSourceThreadId), [sidebarPlanSourceThreadId]),
  );
  const activeThreadPlanThreadId = activeThread?.id ?? null;
  const activeThreadPlanProposedPlans = activeThread?.proposedPlans;
  const sidebarPlanSourceThreadPlanId = sidebarPlanSourceThread?.id ?? null;
  const sidebarPlanSourceThreadProposedPlans = sidebarPlanSourceThread?.proposedPlans;
  const sidebarProposedPlan = useMemo(
    () =>
      findSidebarProposedPlan({
        threads: [
          ...(activeThreadPlanThreadId
            ? [
                {
                  id: activeThreadPlanThreadId,
                  proposedPlans: activeThreadPlanProposedPlans ?? [],
                },
              ]
            : []),
          ...(sidebarPlanSourceThreadPlanId &&
          sidebarPlanSourceThreadPlanId !== activeThreadPlanThreadId
            ? [
                {
                  id: sidebarPlanSourceThreadPlanId,
                  proposedPlans: sidebarPlanSourceThreadProposedPlans ?? [],
                },
              ]
            : []),
        ],
        latestTurn: activeLatestTurn,
        latestTurnSettled,
        threadId: activeThreadPlanThreadId,
      }),
    [
      activeLatestTurn,
      activeThreadPlanProposedPlans,
      activeThreadPlanThreadId,
      latestTurnSettled,
      sidebarPlanSourceThreadPlanId,
      sidebarPlanSourceThreadProposedPlans,
    ],
  );
  const planSidebarLabel = sidebarProposedPlan ? "Plan details" : "Tasks";
  const planSidebarToggleLabel = planSidebarOpen ? `Hide ${planSidebarLabel}` : planSidebarLabel;
  const planSidebarToggleTitle = `${planSidebarOpen ? "Hide" : "Show"} ${planSidebarLabel.toLowerCase()} sidebar`;
  const activeTaskList = useMemo((): ActiveTaskListState | null => {
    if (showDebugTaskBanner) {
      return {
        createdAt: new Date().toISOString(),
        turnId: activeLatestTurn?.turnId ?? null,
        tasks: [
          {
            task: "Inspect banner layout without overlapping transcript text",
            status: "inProgress",
          },
          {
            task: "Confirm compact task banner width",
            status: "pending",
          },
          {
            task: "Verify sidebar task controls",
            status: "completed",
          },
        ],
      };
    }

    // Only while a turn is live: deriveActiveTaskListState falls back to the latest
    // unfinished prior-turn list (follow-up turns, reloads mid-turn), but once the
    // thread is idle the card must clear — providers routinely end a turn without
    // marking every task completed, and an unfinished list must not linger forever.
    return latestTurnSettled
      ? null
      : deriveActiveTaskListState(threadActivities, activeLatestTurn?.turnId);
  }, [activeLatestTurn?.turnId, latestTurnSettled, showDebugTaskBanner, threadActivities]);
  const activeBackgroundTasks = useMemo(
    () =>
      latestTurnSettled
        ? null
        : deriveActiveBackgroundTasksState(threadActivities, activeLatestTurn?.turnId ?? undefined),
    [activeLatestTurn?.turnId, latestTurnSettled, threadActivities],
  );
  // Task tool_use_ids the provider confirmed as backgrounded via task_updated
  // patches (last patch wins, so re-foregrounded tasks drop back out).
  const backgroundedSubagentToolUseIds = useMemo(() => {
    const toolUseIds = new Set<string>();
    for (const activity of stripSourceActivities) {
      if (activity.kind !== "task.updated") {
        continue;
      }
      const payload =
        activity.payload && typeof activity.payload === "object"
          ? (activity.payload as Record<string, unknown>)
          : null;
      const toolUseId = typeof payload?.toolUseId === "string" ? payload.toolUseId : null;
      if (!toolUseId || typeof payload?.isBackgrounded !== "boolean") {
        continue;
      }
      if (payload.isBackgrounded) {
        toolUseIds.add(toolUseId);
      } else {
        toolUseIds.delete(toolUseId);
      }
    }
    return toolUseIds;
  }, [stripSourceActivities]);
  const composerSubagentStripItems = useMemo(
    () =>
      deriveComposerSubagentStripItems({
        workEntries: stripWorkLogEntries,
        liveTurnId: stripLiveTurnId,
        backgroundedProviderThreadIds: backgroundedSubagentToolUseIds,
        viewedThreadId: stripParentThread ? (activeThread?.id ?? null) : null,
        parentRow: stripParentThread
          ? {
              threadId: stripParentThread.id,
              label: stripParentThread.title ?? null,
            }
          : null,
      }),
    [
      activeThread?.id,
      backgroundedSubagentToolUseIds,
      stripLiveTurnId,
      stripParentThread,
      stripWorkLogEntries,
    ],
  );
  // Links workflow agent rows to their subagent child threads (and models) when the
  // Task tool_use_id produced one; agents spawned without a tool call stay unlinked.
  const workflowSubagentThreadsByToolUseId = useMemo(() => {
    const refs = new Map<string, WorkflowSubagentThreadRef>();
    for (const entry of enrichedWorkLogEntries) {
      for (const subagent of entry.subagents ?? []) {
        if (!subagent.providerThreadId) {
          continue;
        }
        refs.set(subagent.providerThreadId, {
          threadId: subagent.resolvedThreadId ?? subagent.threadId,
          model: subagent.model,
          effort: subagent.effort,
        });
      }
    }
    return refs;
  }, [enrichedWorkLogEntries]);
  // Persisted (per-thread) workflow run flags: pausedByUser tells the settled
  // card apart from a plain stop; dismissed retires a settled card the run's
  // activities would otherwise keep visible. Survive reloads via
  // workflowRunUiStore instead of living in component state.
  const workflowRunUiThreadState = useWorkflowRunUiThreadState(activeThreadId);
  const pausedWorkflowTaskIds = useMemo(
    () => new Set(workflowRunUiThreadState.pausedByUser),
    [workflowRunUiThreadState.pausedByUser],
  );
  const dismissedWorkflowTaskIds = useMemo(
    () => new Set(workflowRunUiThreadState.dismissed),
    [workflowRunUiThreadState.dismissed],
  );
  const workflowRunState = useMemo(
    () =>
      deriveWorkflowRunState({
        activities: threadActivities,
        subagentThreadsByToolUseId: workflowSubagentThreadsByToolUseId,
        pausedByUserTaskIds: pausedWorkflowTaskIds,
        dismissedTaskIds: dismissedWorkflowTaskIds,
      }),
    [
      threadActivities,
      workflowSubagentThreadsByToolUseId,
      pausedWorkflowTaskIds,
      dismissedWorkflowTaskIds,
    ],
  );
  const workflowNowMs = useNowMs(workflowRunState !== null && !workflowRunState.settled);
  const showPlanFollowUpPrompt =
    pendingUserInputs.length === 0 &&
    interactionMode === "plan" &&
    latestTurnSettled &&
    hasActionableProposedPlan(activeProposedPlan);
  const activePendingApproval = pendingApprovals[0] ?? null;
  const serverAcknowledgedLocalDispatch = useMemo(
    () =>
      hasServerAcknowledgedLocalDispatch({
        localDispatch,
        phase,
        latestTurn: activeLatestTurn,
        session: activeThread?.session ?? null,
        messages: activeThread?.messages ?? EMPTY_MESSAGES,
        hasPendingApproval: activePendingApproval !== null,
        hasPendingUserInput: activePendingUserInput !== null,
        threadError: activeThread?.error,
      }),
    [
      activeLatestTurn,
      activePendingApproval,
      activePendingUserInput,
      activeThread?.error,
      activeThread?.messages,
      activeThread?.session,
      localDispatch,
      phase,
    ],
  );
  const isSendBusy = localDispatch !== null && !serverAcknowledgedLocalDispatch;
  const activeWorktreeSetup = localDispatch?.worktreeSetup ?? null;
  const isPreparingWorktree = activeWorktreeSetup !== null;
  const hasLiveTurn = isProductConversationThread ? hasProductActiveRun : phase === "running";
  // Providers that clear `activeTurnId` on every terminal event (Claude) would
  // otherwise leave the transcript with no active turn while work is still in
  // progress, collapsing the newest answer into a closed "Worked for" disclosure.
  // The latest turn is the transcript's own notion of "current", so fall back to it.
  const activeTurnIdForTranscript = activeThread?.session?.activeTurnId ?? activeLatestTurnId;
  // Defence in depth against a session stuck at "running" with no turn to
  // complete: nothing would ever drain the composer queue, so messages routed
  // into it would be swallowed. Server-side reconciliation settles these
  // sessions; this keeps the composer usable until it does.
  const {
    automationProjects,
    automationThreads,
    automationData,
    automationUpdateMutation,
    automationDraftForm,
    automationEditingDefinition,
    automationDraftWarnings,
    acknowledgedAutomationWarnings,
    automationDraftOpen,
    setAutomationDraftDialogOpen,
    isAutomationDraftSubmitting,
    setIsAutomationDraftSubmitting,
    automationDraftSubmittingRef,
    pendingAutomationConversation,
    isPendingSetupBubbleId,
    cancelAutomationConversation,
    toggleAutomationWarning,
    updateAutomationDraftForm,
    resetAutomationDraftState,
    openAutomationEditDialog,
  } = useChatAutomationSetup({
    threadId,
    activeProjectId,
    hasLiveTurn,
    promptRef,
    setComposerDraftPrompt,
  });
  const isWorking = hasLiveTurn || isSendBusy || isConnecting || isRevertingCheckpoint;
  const hasStreamingAssistantText =
    activeThread?.messages.some((message) => message.role === "assistant" && message.streaming) ??
    false;
  const activeTurnLayoutLive = isWorking || !latestTurnSettled;
  const [keepSettledActiveTurnLayout, setKeepSettledActiveTurnLayout] = useState(false);
  const previousActiveTurnLayoutLiveRef = useRef(activeTurnLayoutLive);
  const previousActiveTurnLayoutKeyRef = useRef<string | null>(null);
  const activeWorkStartedAt = hasLiveTurnTail
    ? (activeLatestTurn?.startedAt ?? null)
    : hasLiveTurn
      ? deriveActiveWorkStartedAt(activeLatestTurn, activeThread?.session ?? null, null)
      : null;
  const activeTurnLayoutKey =
    activeThreadId === null ? null : `${activeThreadId}:${activeLatestTurn?.turnId ?? "idle"}`;
  const activeTurnInProgress =
    hasProductActiveRun || activeTurnLayoutLive || keepSettledActiveTurnLayout;
  const isComposerApprovalState = activePendingApproval !== null;
  const isComposerEditorDisabled = isConnecting || isComposerApprovalState;
  const productDispatchAvailable = canDispatchProductSubmission(systemHealthSnapshot);
  const canCollapsePastedTextToDraft = shouldEnableComposerPastedTextCollapse({
    isComposerApprovalState,
    hasPendingUserInput: pendingUserInputs.length > 0,
    showPlanFollowUpPrompt,
  });
  const composerFooterHasWideActions = showPlanFollowUpPrompt || activePendingProgress !== null;
  const lastSyncedPendingInputRef = useRef<{
    requestId: string | null;
    questionId: string | null;
  } | null>(null);
  useLayoutEffect(() => {
    if (previousActiveTurnLayoutKeyRef.current !== activeTurnLayoutKey) {
      previousActiveTurnLayoutKeyRef.current = activeTurnLayoutKey;
      previousActiveTurnLayoutLiveRef.current = activeTurnLayoutLive;
      setKeepSettledActiveTurnLayout(false);
      return;
    }

    const shouldStartGrace = shouldStartActiveTurnLayoutGrace({
      previousTurnLayoutLive: previousActiveTurnLayoutLiveRef.current,
      currentTurnLayoutLive: activeTurnLayoutLive,
      latestTurnStartedAt: activeLatestTurn?.startedAt ?? null,
    });
    previousActiveTurnLayoutLiveRef.current = activeTurnLayoutLive;

    if (activeTurnLayoutLive) {
      setKeepSettledActiveTurnLayout(false);
      return;
    }

    if (!shouldStartGrace) {
      return;
    }

    setKeepSettledActiveTurnLayout(true);
    const timeoutId = window.setTimeout(() => {
      setKeepSettledActiveTurnLayout(false);
    }, ACTIVE_TURN_LAYOUT_SETTLE_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeLatestTurn?.startedAt, activeTurnLayoutKey, activeTurnLayoutLive]);

  useEffect(() => {
    const nextCustomAnswer = activePendingProgress?.customAnswer;
    if (typeof nextCustomAnswer !== "string") {
      lastSyncedPendingInputRef.current = null;
      return;
    }
    const nextRequestId = activePendingUserInput?.requestId ?? null;
    const nextQuestionId = activePendingProgress?.activeQuestion?.id ?? null;
    const questionChanged =
      lastSyncedPendingInputRef.current?.requestId !== nextRequestId ||
      lastSyncedPendingInputRef.current?.questionId !== nextQuestionId;
    const textChangedExternally = promptRef.current !== nextCustomAnswer;

    lastSyncedPendingInputRef.current = {
      requestId: nextRequestId,
      questionId: nextQuestionId,
    };

    if (!questionChanged && !textChangedExternally) {
      return;
    }

    promptRef.current = nextCustomAnswer;
    const nextCursor = collapseExpandedComposerCursor(nextCustomAnswer, nextCustomAnswer.length);
    setComposerCursor(nextCursor);
    setComposerTrigger(
      detectComposerTrigger(
        nextCustomAnswer,
        expandCollapsedComposerCursor(nextCustomAnswer, nextCursor),
      ),
    );
    setComposerHighlightedItemId(null);
  }, [
    activePendingProgress?.customAnswer,
    activePendingUserInput?.requestId,
    activePendingProgress?.activeQuestion?.id,
  ]);
  useLayoutEffect(() => {
    attachmentPreviewHandoffByMessageIdRef.current = attachmentPreviewHandoffByMessageId;
  }, [attachmentPreviewHandoffByMessageId]);
  const clearAttachmentPreviewHandoffs = useCallback(() => {
    for (const timeoutId of Object.values(attachmentPreviewHandoffTimeoutByMessageIdRef.current)) {
      window.clearTimeout(timeoutId);
    }
    attachmentPreviewHandoffTimeoutByMessageIdRef.current = {};
    for (const previewUrls of Object.values(attachmentPreviewHandoffByMessageIdRef.current)) {
      for (const previewUrl of previewUrls) {
        revokeBlobPreviewUrl(previewUrl);
      }
    }
    attachmentPreviewHandoffByMessageIdRef.current = {};
    setAttachmentPreviewHandoffByMessageId({});
  }, []);
  useEffect(() => {
    return () => {
      clearAttachmentPreviewHandoffs();
      for (const message of optimisticUserMessagesRef.current) {
        revokeUserMessagePreviewUrls(message);
      }
    };
  }, [clearAttachmentPreviewHandoffs]);
  const handoffAttachmentPreviews = useCallback((messageId: MessageId, previewUrls: string[]) => {
    if (previewUrls.length === 0) return;

    const previousPreviewUrls = attachmentPreviewHandoffByMessageIdRef.current[messageId] ?? [];
    const replacedPreviewUrls = previousPreviewUrls.filter(
      (previewUrl) => !previewUrls.includes(previewUrl),
    );
    revokeBlobPreviewUrlsAfterPaint(replacedPreviewUrls);
    setAttachmentPreviewHandoffByMessageId((existing) => {
      const next = {
        ...existing,
        [messageId]: previewUrls,
      };
      attachmentPreviewHandoffByMessageIdRef.current = next;
      return next;
    });

    const existingTimeout = attachmentPreviewHandoffTimeoutByMessageIdRef.current[messageId];
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
    }
    attachmentPreviewHandoffTimeoutByMessageIdRef.current[messageId] = window.setTimeout(() => {
      const currentPreviewUrls = attachmentPreviewHandoffByMessageIdRef.current[messageId];
      setAttachmentPreviewHandoffByMessageId((existing) => {
        if (!(messageId in existing)) return existing;
        const next = { ...existing };
        delete next[messageId];
        attachmentPreviewHandoffByMessageIdRef.current = next;
        return next;
      });
      delete attachmentPreviewHandoffTimeoutByMessageIdRef.current[messageId];
      // Let React swap the transcript back to persisted /attachments URLs before
      // invalidating blob previews that may still be mounted in the old row.
      if (currentPreviewUrls) {
        revokeBlobPreviewUrlsAfterPaint(currentPreviewUrls);
      }
    }, ATTACHMENT_PREVIEW_HANDOFF_TTL_MS);
  }, []);
  const productMessages = useMemo(
    () => presentProductConversationMessages(productReadModel),
    [productReadModel],
  );
  const productQueuedComposerTurns = useMemo(
    () => presentProductConversationQueue(productReadModel),
    [productReadModel],
  );
  const visibleQueuedComposerTurns = productReadModel
    ? productQueuedComposerTurns
    : queuedComposerTurns;
  const serverMessages = productReadModel ? productMessages : activeThread?.messages;
  const timelineMessages = useMemo(() => {
    const messages = filterSidechatTranscriptMessages(
      serverMessages ?? [],
      Boolean(activeThread?.sidechatSourceThreadId),
    );
    const serverMessagesWithPreviewHandoff =
      Object.keys(attachmentPreviewHandoffByMessageId).length === 0
        ? messages
        : // Spread only fires for the few messages that actually changed;
          // unchanged ones early-return their original reference.
          // In-place mutation would break React's immutable state contract.
          // oxlint-disable-next-line no-map-spread
          messages.map((message) => {
            if (
              message.role !== "user" ||
              !message.attachments ||
              message.attachments.length === 0
            ) {
              return message;
            }
            const handoffPreviewUrls = attachmentPreviewHandoffByMessageId[message.id];
            if (!handoffPreviewUrls || handoffPreviewUrls.length === 0) {
              return message;
            }

            let changed = false;
            let imageIndex = 0;
            const attachments = message.attachments.map((attachment) => {
              if (attachment.type !== "image") {
                return attachment;
              }
              const handoffPreviewUrl = handoffPreviewUrls[imageIndex];
              imageIndex += 1;
              if (!handoffPreviewUrl || attachment.previewUrl === handoffPreviewUrl) {
                return attachment;
              }
              changed = true;
              return {
                ...attachment,
                previewUrl: handoffPreviewUrl,
              };
            });

            return changed ? { ...message, attachments } : message;
          });

    // Ephemeral automation-setup bubbles render after everything else, at the tail.
    // Gated on the originating thread so a same-pane switch never leaks the previous
    // thread's setup into the newly rendered conversation (the reset effect runs after
    // the first render, so the guard must be here too).
    const setupBubbles =
      pendingAutomationConversation && pendingAutomationConversation.threadId === threadId
        ? pendingAutomationConversation.bubbles
        : [];
    // Optimistic messages exist only briefly after a send; skip the full-transcript
    // id Set on the common (streaming-flush) path where there is nothing to reconcile.
    let pendingMessages = optimisticUserMessages;
    if (optimisticUserMessages.length > 0) {
      const serverIds = new Set(serverMessagesWithPreviewHandoff.map((message) => message.id));
      pendingMessages = optimisticUserMessages.filter((message) => !serverIds.has(message.id));
    }
    const withPending =
      pendingMessages.length === 0
        ? serverMessagesWithPreviewHandoff
        : [...serverMessagesWithPreviewHandoff, ...pendingMessages];
    return setupBubbles.length === 0 ? withPending : [...withPending, ...setupBubbles];
  }, [
    activeThread?.sidechatSourceThreadId,
    serverMessages,
    attachmentPreviewHandoffByMessageId,
    optimisticUserMessages,
    pendingAutomationConversation,
    threadId,
  ]);
  const promptHistory = useMemo(() => {
    const activeMessages = serverMessages ?? EMPTY_MESSAGES;
    // Optimistic messages exist only briefly after a send; skip the full-transcript
    // id Set on the common (streaming-flush) path where there is nothing to reconcile.
    if (optimisticUserMessages.length === 0) {
      return derivePromptHistoryFromMessages(activeMessages);
    }
    const activeMessageIds = new Set(activeMessages.map((message) => message.id));
    const pendingOptimisticMessages = optimisticUserMessages.filter(
      (message) => !activeMessageIds.has(message.id),
    );
    return derivePromptHistoryFromMessages([...activeMessages, ...pendingOptimisticMessages]);
  }, [serverMessages, optimisticUserMessages]);
  const timelineEntries = useMemo(
    () =>
      deriveTimelineEntries(
        timelineMessages,
        activeThread?.proposedPlans ?? [],
        agentActivityTimelineState.timelineWorkEntries,
      ),
    [activeThread?.proposedPlans, agentActivityTimelineState.timelineWorkEntries, timelineMessages],
  );
  const enteringUserMessageIds = useMemo<ReadonlySet<MessageId>>(
    () => new Set(optimisticUserMessages.map((message) => message.id)),
    [optimisticUserMessages],
  );
  // The user message a local send anchored at the top of the transcript viewport.
  // Set at the send sites and kept after the turn settles — collapsing the tail
  // spacer when a turn ends would visibly yank the settled transcript. The next
  // send replaces it, and thread switches reset it via the per-thread timeline
  // remount plus the threadId guard at the render site.
  const [tailAnchor] = useState<{
    threadId: ThreadId;
    messageId: MessageId;
  } | null>(null);
  // True from send until the tail-anchor hook finishes sliding the sent message
  // to the viewport top. The auto-follow effect stays quiet while set so the
  // anchored slide has exactly one scroll owner (see useTailAnchorScroll).
  const tailAnchorScrollInFlightRef = useRef(false);
  // --- Pinned messages & notes (per-thread, server-synced through sidepanel commands) ---
  const pinnedMessages = activeThread?.pinnedMessages ?? EMPTY_PINNED_MESSAGES;
  const threadMarkers = activeThread?.threadMarkers ?? EMPTY_THREAD_MARKERS;
  const threadNotes = activeThread?.notes ?? "";
  const pinnedMessageIds = useMemo(
    () => new Set(pinnedMessages.map((pin) => pin.messageId)),
    [pinnedMessages],
  );
  const markerMessageIds = useMemo(
    () => new Set(threadMarkers.map((marker) => marker.messageId)),
    [threadMarkers],
  );
  // Resolve live text for the Environment panel in one transcript pass.
  const { markerMessageTextById, pinnedMessageTextById } = useMemo(() => {
    const needsPinnedText = pinnedMessageIds.size > 0;
    const needsMarkerText = markerMessageIds.size > 0;
    if (!needsPinnedText && !needsMarkerText) {
      return {
        pinnedMessageTextById: EMPTY_PINNED_TEXT,
        markerMessageTextById: EMPTY_PINNED_TEXT,
      };
    }
    const pinnedTextById = new Map<MessageId, string>();
    const markerTextById = new Map<MessageId, string>();
    for (const message of timelineMessages) {
      if (needsPinnedText && pinnedMessageIds.has(message.id)) {
        pinnedTextById.set(message.id, message.text);
      }
      if (needsMarkerText && markerMessageIds.has(message.id)) {
        markerTextById.set(message.id, message.text);
      }
    }
    return {
      pinnedMessageTextById: needsPinnedText ? pinnedTextById : EMPTY_PINNED_TEXT,
      markerMessageTextById: needsMarkerText ? markerTextById : EMPTY_PINNED_TEXT,
    };
  }, [markerMessageIds, pinnedMessageIds, timelineMessages]);
  const {
    handleTogglePinMessage,
    handleTogglePinnedMessageDone,
    handleUnpinMessage,
    handleRenamePinnedMessage,
    handleNotesChange,
  } = usePinnedMessageActions({ activeThreadId, pinnedMessages });
  const handleTogglePinMessageGuarded = useCallback(
    (messageId: MessageId) => {
      // Never pin an ephemeral automation-setup bubble; its id vanishes when setup ends.
      if (isPendingSetupBubbleId(messageId)) {
        return;
      }
      handleTogglePinMessage(messageId);
    },
    [handleTogglePinMessage, isPendingSetupBubbleId],
  );
  // Stable identity: this is forwarded to the memoized MessagesTimeline, so an inline
  // arrow here would defeat its `memo()` and re-derive every row on every keystroke.
  const canPinMessage = useCallback(
    (messageId: MessageId) => !isPendingSetupBubbleId(messageId),
    [isPendingSetupBubbleId],
  );
  const handleCopyProjectInstructionsToNotes = useCallback(() => {
    if (!activeThreadId) {
      return;
    }
    const nextNotes = mergeProjectInstructionsIntoThreadNotes({
      threadNotes,
      projectInstructions,
    });
    if (nextNotes === threadNotes) {
      return;
    }
    void handleNotesChange(activeThreadId, nextNotes)
      .then(() => {
        toastManager.add({
          type: "success",
          title: "Project instructions added to notepad.",
        });
      })
      .catch(() => {
        // `handleNotesChange` already surfaces the save failure through the shared notes toast.
      });
  }, [activeThreadId, handleNotesChange, projectInstructions, threadNotes]);
  const handleJumpToPinnedMessage = useCallback((messageId: MessageId) => {
    timelineControllerRef.current?.scrollToMessage(messageId);
  }, []);
  const handleJumpToThreadMarker = useCallback((marker: ThreadMarker) => {
    timelineControllerRef.current?.scrollToMarker(marker);
  }, []);
  const handleRemoveThreadMarker = useCallback(
    (markerId: ThreadMarkerId) => {
      if (!activeThreadId) {
        return;
      }
      void dispatchThreadMarkerRemove(activeThreadId, markerId).catch((error) => {
        console.error("Failed to remove thread marker", error);
        toastManager.add({
          type: "error",
          title: "Could not remove marker.",
        });
      });
    },
    [activeThreadId],
  );
  const handleToggleThreadMarkerDone = useCallback(
    (markerId: ThreadMarkerId) => {
      if (!activeThreadId) {
        return;
      }
      const marker = threadMarkers.find((candidate) => candidate.id === markerId);
      if (!marker) {
        return;
      }
      void dispatchThreadMarkerDoneSet(activeThreadId, markerId, !marker.done).catch((error) => {
        console.error("Failed to update thread marker", error);
        toastManager.add({
          type: "error",
          title: "Could not update marker.",
        });
      });
    },
    [activeThreadId, threadMarkers],
  );
  const handleRenameThreadMarker = useCallback(
    (markerId: ThreadMarkerId, label: string | null) => {
      if (!activeThreadId) {
        return;
      }
      void dispatchThreadMarkerLabelSet(activeThreadId, markerId, label).catch((error) => {
        console.error("Failed to rename thread marker", error);
        toastManager.add({
          type: "error",
          title: "Could not rename marker.",
        });
      });
    },
    [activeThreadId],
  );
  // Before treating an empty timeline as a genuinely new thread, wait for the
  // detail snapshot: a server thread whose history has not synced yet must show
  // a loading (or failed) transcript state instead of the empty landing.
  const threadDetailHydration = resolveThreadDetailHydration({
    isServerThread,
    hasTimelineEntries: timelineEntries.length > 0,
    detailSyncState: threadDetailSyncState,
  });
  const handleRetryThreadDetailSync = useCallback(() => {
    ensureProductConversationRetained();
    setProductDetailFetchFailed(false);
    void readProductNativeApi()
      .getConversationSnapshot({
        protocolVersion: PRODUCT_PROTOCOL_VERSION,
        conversationId: productConversationId,
      })
      .then(setProductConversationSnapshot)
      .catch(() => setProductDetailFetchFailed(true));
  }, [ensureProductConversationRetained, productConversationId, setProductConversationSnapshot]);
  // Stable identity: this element is forwarded to the memoized MessagesTimeline, so
  // building it inline in JSX would defeat its `memo()` on every keystroke.
  const transcriptEmptyStateContent = useMemo((): ReactNode => {
    if (isEditorRail) {
      return <span aria-hidden="true" />;
    }
    if (threadDetailHydration !== "ready") {
      return (
        <ThreadDetailHydrationState
          onRetry={handleRetryThreadDetailSync}
          state={threadDetailHydration}
        />
      );
    }
    return undefined;
  }, [handleRetryThreadDetailSync, isEditorRail, threadDetailHydration]);
  // Empty top-level threads render the centered landing composer instead of the transcript pane.
  // Home-scoped chats get the global "What should we work on?" copy plus the project picker,
  // while project-scoped drafts reuse the same centered layout with folder-specific copy.
  const isCenteredEmptyLanding =
    timelineEntries.length === 0 &&
    !activeThread?.parentThreadId &&
    !isEditorRail &&
    threadDetailHydration === "ready";
  const isEmptyChatLanding =
    isCenteredEmptyLanding && Boolean(homeDir) && isContainerLandingProject;
  const { turnDiffSummaries, inferredCheckpointTurnCountByTurnId } =
    useTurnDiffSummaries(activeThread);
  const turnDiffSummaryByAssistantMessageId = useMemo(() => {
    const messagesForDiffAnchoring: {
      id: MessageId;
      role: "user" | "assistant" | "system";
      turnId: TurnId | null;
    }[] = [];
    for (const message of timelineMessages) {
      messagesForDiffAnchoring.push({
        id: message.id,
        role: message.role,
        turnId: message.turnId ?? null,
      });
    }
    return buildTurnDiffSummaryByAssistantMessageId({
      turnDiffSummaries: turnDiffSummaries.map((summary) => ({
        ...summary,
        checkpointTurnCount:
          summary.checkpointTurnCount ?? inferredCheckpointTurnCountByTurnId[summary.turnId],
      })),
      messages: messagesForDiffAnchoring,
    });
  }, [inferredCheckpointTurnCountByTurnId, turnDiffSummaries, timelineMessages]);
  const revertTurnCountByUserMessageId = useMemo(() => {
    const byUserMessageId = new Map<MessageId, number>();
    for (let index = 0; index < timelineEntries.length; index += 1) {
      const entry = timelineEntries[index];
      if (!entry || entry.kind !== "message" || entry.message.role !== "user") {
        continue;
      }

      for (let nextIndex = index + 1; nextIndex < timelineEntries.length; nextIndex += 1) {
        const nextEntry = timelineEntries[nextIndex];
        if (!nextEntry || nextEntry.kind !== "message") {
          continue;
        }
        if (nextEntry.message.role === "user") {
          break;
        }
        const summary = turnDiffSummaryByAssistantMessageId.get(nextEntry.message.id);
        if (!summary) {
          continue;
        }
        const turnCount =
          summary.checkpointTurnCount ?? inferredCheckpointTurnCountByTurnId[summary.turnId];
        if (typeof turnCount !== "number") {
          break;
        }
        byUserMessageId.set(entry.message.id, Math.max(0, turnCount - 1));
        break;
      }
    }

    return byUserMessageId;
  }, [inferredCheckpointTurnCountByTurnId, timelineEntries, turnDiffSummaryByAssistantMessageId]);

  const threadWorkspaceCwd = activeProject
    ? resolveSharedThreadWorkspaceCwd({
        projectCwd: activeProject.cwd,
        envMode: resolvedThreadEnvMode,
        worktreePath: resolvedThreadWorktreePath,
        workingDirectory: resolvedThreadWorkingDirectory,
      })
    : null;
  useEffect(() => {
    if (!productReadModel || prompt.length === 0) return;
    const transferred = findExactTransferredProductQueueItem(
      productReadModel.queue,
      composerDraft.productQueueTransfer ?? null,
    );
    if (!transferred) return;

    // Product already owns the stable item named by this exact durable draft
    // marker. Clear both in one Composer store write.
    promptRef.current = "";
    clearComposerDraftContent(threadId, { preservePreviewUrls: true });
    setComposerCursor(0);
    setComposerTrigger(null);
  }, [
    clearComposerDraftContent,
    composerDraft.productQueueTransfer,
    productReadModel,
    prompt,
    threadId,
  ]);
  const threadArtifactWorkspaceRoot = resolveThreadArtifactWorkspaceRoot({
    isStudioContainer,
    projectCwd: activeProject?.cwd ?? null,
    threadWorkspaceCwd,
  });
  const gitCwd = threadWorkspaceCwd;
  const gitBranchSourceCwd = isStudioContainer
    ? threadWorkspaceCwd
    : activeProject
      ? resolveThreadBranchSourceCwd({
          projectCwd: activeProject.cwd,
          worktreePath: resolvedThreadWorktreePath,
        })
      : null;
  const composerTriggerKind = composerTrigger?.kind ?? null;
  const mentionTriggerQuery = composerTrigger?.kind === "mention" ? composerTrigger.query : "";
  const isMentionTrigger = composerTriggerKind === "mention";
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const branchesQuery = useQuery(gitBranchesQueryOptions(gitBranchSourceCwd));
  const localFolderBrowseRootPath = getLocalFolderBrowseRootPath(
    serverConfigQuery.data?.homeDir ?? null,
    isMacPlatform(platform),
  );
  const isLocalFolderBrowserOpen =
    isMentionTrigger && isLocalFolderMentionQuery(mentionTriggerQuery);
  const [debouncedPathQuery, composerPathQueryDebouncer] = useDebouncedValue(
    mentionTriggerQuery,
    { wait: COMPOSER_PATH_QUERY_DEBOUNCE_MS },
    (debouncerState) => ({ isPending: debouncerState.isPending }),
  );
  const effectiveMentionQuery = mentionTriggerQuery.length > 0 ? debouncedPathQuery : "";
  const workspaceEntriesQuery = useQuery(
    projectSearchEntriesQueryOptions({
      cwd: gitCwd,
      query: effectiveMentionQuery,
      enabled: isMentionTrigger && !isLocalFolderBrowserOpen,
      limit: 80,
    }),
  );
  const workspaceEntries = workspaceEntriesQuery.data?.entries ?? EMPTY_PROJECT_ENTRIES;
  const activeRootBranch = useMemo(
    () =>
      resolveComposerSlashRootBranch({
        branches: branchesQuery.data?.branches,
        activeProjectCwd: activeProject?.cwd,
        activeThreadBranch: activeThread?.branch,
      }),
    [activeProject?.cwd, activeThread?.branch, branchesQuery.data?.branches],
  );
  const effectiveComposerTrigger = composerTrigger;
  const effectiveComposerTriggerKind = effectiveComposerTrigger?.kind ?? null;
  // Product exposes only Host-owned typed runtime facts. The current Product
  // catalog has no fast-mode capability, so a donor/static provider mirror must
  // not make the command appear on the Product surface.
  // Export is hidden while the thread is running so archives cannot capture a
  // partial assistant response. Same shared predicate as the server's 409
  // guard, so the composer and the export route cannot drift.
  const canOfferExportCommand =
    isServerThread &&
    activeThread !== undefined &&
    threadExportBlockedReason(activeThread) === null;
  const normalComposerMenuItems = useComposerCommandMenuItems({
    composerTrigger: effectiveComposerTrigger,
    workspaceEntries,
    canOfferExportCommand,
    ...(isProductConversationThread
      ? { surfaceAppSlashCommands: NO_PRODUCT_APP_SLASH_COMMANDS }
      : {}),
    threadMentionSources: {
      threads: composerThreadSummaries,
      projects: composerThreadProjects,
      currentThreadId: threadId,
    },
  });
  const composerMenuItems = normalComposerMenuItems;
  const composerMenuOpen = Boolean(composerTrigger);
  const activeComposerMenuItem = useMemo(
    () =>
      composerMenuItems.find((item) => item.id === composerHighlightedItemId) ??
      composerMenuItems[0] ??
      null,
    [composerHighlightedItemId, composerMenuItems],
  );
  // Keydown can fire as soon as the updated menu commits, before passive effects.
  useLayoutEffect(() => {
    composerMenuOpenRef.current = composerMenuOpen;
    composerMenuItemsRef.current = composerMenuItems;
    activeComposerMenuItemRef.current = activeComposerMenuItem;
  }, [composerMenuOpen, composerMenuItems, activeComposerMenuItem]);
  const nonPersistedComposerImageIdSet = useMemo(() => {
    const durableBlobIds = new Set(
      durablyPersistedComposerImageIds
        .filter((attachment) => Boolean(attachment.blobKey))
        .map((attachment) => attachment.id),
    );
    return new Set(nonPersistedComposerImageIds.filter((id) => !durableBlobIds.has(id)));
  }, [durablyPersistedComposerImageIds, nonPersistedComposerImageIds]);
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;
  const availableEditors = serverConfigQuery.data?.availableEditors ?? EMPTY_AVAILABLE_EDITORS;
  const handoffBadgeLabel = useMemo(
    () => (activeThread ? resolveThreadHandoffBadgeLabel(activeThread) : null),
    [activeThread],
  );
  const handoffBadgeSourceProvider = activeThread?.handoff?.sourceProvider ?? null;
  const handoffBadgeTargetProvider = activeThread?.handoff
    ? activeThread.runtimeIdentity?.kind === "historical-provider"
      ? null
      : null
    : null;
  const activeProjectCwd = activeProject?.cwd ?? null;
  const activeThreadWorktreePath = isStudioContainer ? null : (activeThread?.worktreePath ?? null);
  const hasNativeUserMessages = useMemo(
    () =>
      serverMessages?.some((message) => message.role === "user" && message.source === "native") ??
      false,
    [serverMessages],
  );
  // Left to React Compiler instead of a manual `useMemo`: the hand-written dep array could
  // not be preserved (the compiler cannot prove `threadWorkspaceCwd` is never mutated), which
  // bailed the whole component out of compilation. The empty case returns a module-level
  // constant so its identity is stable no matter how the value is memoized.
  const terminalRuntimeProjectCwd = isStudioContainer ? threadWorkspaceCwd : activeProjectCwd;
  const threadTerminalRuntimeEnv = terminalRuntimeProjectCwd
    ? projectScriptRuntimeEnv({
        project: {
          cwd: terminalRuntimeProjectCwd,
        },
        worktreePath: activeThreadWorktreePath,
      })
    : EMPTY_TERMINAL_RUNTIME_ENV;
  const isGitRepo = resolveGitRepoUiState({
    isStudioContainer,
    queriedIsRepo: branchesQuery.data?.isRepo,
  });
  // Studio never offers "Initialize Git": its reference folder is ordinary cwd context,
  // so Git actions appear only when that selected folder is already a repository.
  const showGitActions = isStudioContainer
    ? Boolean(resolvedThreadWorkingDirectory) && isGitRepo
    : !isContainerLandingProject || Boolean(resolvedThreadWorktreePath);
  const repoDiffTotals = useRepoDiffTotals({
    gitCwd: threadWorkspaceCwd,
    isGitRepo,
    refetchInterval: repoDiffBadgeRefreshIntervalMs,
  });
  // The composer live strip is turn-scoped; repoDiffTotals can include unrelated
  // local edits that existed before the active agent turn started.
  const activeTurnLiveDiffState = useMemo(
    () =>
      resolveActiveTurnLiveDiffState({
        latestTurnId: activeLatestTurn?.turnId ?? null,
        turnDiffSummaries,
        workLogEntries,
      }),
    [activeLatestTurn?.turnId, turnDiffSummaries, workLogEntries],
  );
  const splitTerminalShortcutLabel = useMemo(
    () =>
      shortcutLabelForCommand(keybindings, "terminal.splitRight") ??
      shortcutLabelForCommand(keybindings, "terminal.split"),
    [keybindings],
  );
  const splitTerminalDownShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "terminal.splitDown"),
    [keybindings],
  );
  const newTerminalShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "terminal.new"),
    [keybindings],
  );
  const closeTerminalShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "terminal.close"),
    [keybindings],
  );
  const closeWorkspaceShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "terminal.workspace.closeActive"),
    [keybindings],
  );
  const diffPanelShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "diff.toggle"),
    [keybindings],
  );
  const chatSplitShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "chat.split"),
    [keybindings],
  );
  const onToggleDiff = useCallback(() => {
    if (diffEnvironmentPending && !diffOpen) {
      return;
    }
    if (onToggleDiffPanel) {
      onToggleDiffPanel();
      return;
    }
    void navigate({
      to: "/$threadId",
      params: { threadId },
      replace: true,
      search: (previous) => {
        const rest = stripDiffSearchParams(previous);
        return diffOpen
          ? { ...rest, panel: undefined, diff: undefined }
          : { ...rest, panel: "diff", diff: "1" };
      },
    });
  }, [diffEnvironmentPending, diffOpen, navigate, onToggleDiffPanel, threadId]);
  const onToggleBrowser = useCallback(() => {
    if (onToggleBrowserPanel) {
      onToggleBrowserPanel();
      return;
    }
    void navigate({
      to: "/$threadId",
      params: { threadId },
      replace: true,
      search: (previous) => {
        const rest = stripDiffSearchParams(previous);
        return browserOpen ? { ...rest, panel: undefined } : { ...rest, panel: "browser" };
      },
    });
  }, [browserOpen, navigate, onToggleBrowserPanel, threadId]);
  const openBrowserUrl = useCallback(
    (url: string) => {
      const api = readNativeApi();
      void api?.browser.open({ threadId, initialUrl: url }).catch((error) => {
        toastManager.add({
          type: "error",
          title: "Could not open repository",
          description:
            error instanceof Error ? error.message : "The in-app browser could not open GitHub.",
        });
      });
      if (onOpenBrowserUrl) {
        onOpenBrowserUrl(url);
        return;
      }
      void navigate({
        to: "/$threadId",
        params: { threadId },
        replace: true,
        search: (previous) => ({
          ...stripDiffSearchParams(previous),
          panel: "browser",
        }),
      });
    },
    [navigate, onOpenBrowserUrl, threadId],
  );

  const envLocked = Boolean(
    activeThread &&
    ((serverMessages?.length ?? 0) > 0 ||
      (activeThread.session !== null && activeThread.session.status !== "closed")),
  );
  const isTerminalPrimarySurface = terminalState.entryPoint === "terminal";
  const isTerminalEnvironmentContext =
    isTerminalPrimarySurface || terminalWorkspaceTerminalTabActive;
  // Terminal-only threads should not pay to mount the hidden chat/composer pane.
  const shouldRenderChatPaneContent = !(
    terminalWorkspaceTerminalTabActive && terminalState.workspaceLayout === "terminal-only"
  );
  const secondaryChromeThreadId = activeThread?.id ?? threadId;
  const shouldDeferSecondaryChrome =
    activeThread !== undefined && !isCenteredEmptyLanding && !terminalWorkspaceTerminalTabActive;
  const [secondaryChromeState, setSecondaryChromeState] = useState(() => ({
    threadId: secondaryChromeThreadId,
    ready: true,
  }));
  const secondaryChromeReady =
    !shouldDeferSecondaryChrome ||
    (secondaryChromeState.threadId === secondaryChromeThreadId && secondaryChromeState.ready);

  useEffect(() => {
    if (!shouldDeferSecondaryChrome) {
      setSecondaryChromeState((current) =>
        current.threadId === secondaryChromeThreadId && current.ready
          ? current
          : { threadId: secondaryChromeThreadId, ready: true },
      );
      return;
    }

    setSecondaryChromeState({
      threadId: secondaryChromeThreadId,
      ready: false,
    });
    const frame = window.requestAnimationFrame(() => {
      setSecondaryChromeState({
        threadId: secondaryChromeThreadId,
        ready: true,
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [secondaryChromeThreadId, shouldDeferSecondaryChrome]);
  const setThreadError = useCallback(
    (targetThreadId: ThreadId | null, error: string | null) => {
      if (!targetThreadId) return;
      if (getThreadFromState(useStore.getState(), targetThreadId)) {
        setStoreThreadError(targetThreadId, error);
        return;
      }
      setLocalDraftErrorsByThreadId((existing) => {
        if ((existing[targetThreadId] ?? null) === error) {
          return existing;
        }
        return {
          ...existing,
          [targetThreadId]: error,
        };
      });
    },
    [setStoreThreadError],
  );
  const composerImageAttachmentCount = useCallback(
    () =>
      effectiveComposerAttachmentCount(useComposerDraftStore.getState().draftsByThreadId[threadId]),
    [threadId],
  );
  const commitPreparedComposerImages = useCallback(
    (images: ComposerImageAttachment[]) => addComposerImagesToDraft(images),
    [addComposerImagesToDraft],
  );
  const setComposerImagePreparationError = useCallback(
    (error: string | null) => setThreadError(threadId, error),
    [setThreadError, threadId],
  );
  const {
    addImages: enqueueComposerImages,
    isPreparingImages: isPreparingComposerImages,
    pendingImageCount: pendingComposerImageCount,
  } = useComposerImageIntake({
    threadId,
    existingAttachmentCount: composerImageAttachmentCount,
    commitImages: commitPreparedComposerImages,
    onError: setComposerImagePreparationError,
  });

  const focusComposer = useCallback(() => {
    // Secondary chrome is deferred during thread switches; replay focus once it
    // mounts. A disabled editor (dispatch connecting, pending approval) cannot
    // take focus either, so keep the request pending until it re-enables.
    const editor = composerEditorRef.current;
    if (!secondaryChromeReady || !editor || isComposerEditorDisabled) {
      pendingComposerFocusRef.current = true;
      return;
    }
    pendingComposerFocusRef.current = false;
    editor.focusAtEnd();
  }, [secondaryChromeReady, isComposerEditorDisabled]);
  const toggleComposerFocus = useCallback(() => {
    const editor = composerEditorRef.current;
    if (secondaryChromeReady && editor?.isFocused()) {
      pendingComposerFocusRef.current = false;
      editor.blur();
      return;
    }
    focusComposer();
  }, [focusComposer, secondaryChromeReady]);
  const scheduleComposerFocus = useCallback(() => {
    pendingComposerFocusRef.current = true;
    window.requestAnimationFrame(() => {
      focusComposer();
    });
  }, [focusComposer]);
  // External panels (diff headers, file explorer, preview) bump this nonce after
  // inserting a reference so the composer visibly receives the text.
  const composerFocusRequestNonce = useComposerFocusRequestStore(
    (store) => store.requestsByThreadId[threadId] ?? 0,
  );
  useEffect(() => {
    if (composerFocusRequestNonce > 0) {
      scheduleComposerFocus();
    }
  }, [composerFocusRequestNonce, scheduleComposerFocus]);
  useEffect(() => {
    if (!secondaryChromeReady || !pendingComposerFocusRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      focusComposer();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [focusComposer, secondaryChromeReady, secondaryChromeThreadId]);
  const appendVoiceTranscriptToComposer = useCallback(
    (transcript: string) => {
      const nextPrompt = appendVoiceTranscriptToPrompt(promptRef.current, transcript);
      if (!nextPrompt) {
        return;
      }

      promptRef.current = nextPrompt;
      setPrompt(nextPrompt);
      setComposerCursor(collapseExpandedComposerCursor(nextPrompt, nextPrompt.length));
      setComposerTrigger(detectComposerTrigger(nextPrompt, nextPrompt.length));
      scheduleComposerFocus();
    },
    [scheduleComposerFocus, setPrompt],
  );
  const {
    isVoiceRecording,
    isVoiceTranscribing,
    voiceWaveformLevels,
    voiceRecordingDurationLabel,
    showVoiceNotesControl,
    startComposerVoiceRecording,
    submitComposerVoiceRecording,
    cancelComposerVoiceRecording,
  } = useComposerVoiceController({
    activeProject,
    activeThreadId: activeThread?.id ?? null,
    threadId,
    pendingUserInputCount: pendingUserInputs.length,
    onTranscriptReady: appendVoiceTranscriptToComposer,
    actionArmDelayMs: VOICE_RECORDER_ACTION_ARM_DELAY_MS,
    failureCopy: {
      transcriptionFailedTitle: "Couldn't transcribe voice note",
    },
    onGuardWarning: warnVoiceGuard,
  });
  const addTerminalContextToDraft = useCallback(
    (selection: TerminalContextSelection) => {
      if (!activeThreadId) {
        return;
      }
      discardPromptHistoryNavigationForComposerMutation();
      const snapshot = composerEditorRef.current?.readSnapshot() ?? {
        value: promptRef.current,
        cursor: composerCursor,
        expandedCursor: expandCollapsedComposerCursor(promptRef.current, composerCursor),
        selectionCollapsed: true,
        terminalContextIds: composerTerminalContexts.map((context) => context.id),
      };
      const insertion = insertInlineTerminalContextPlaceholder(
        snapshot.value,
        snapshot.expandedCursor,
      );
      const nextCollapsedCursor = collapseExpandedComposerCursor(
        insertion.prompt,
        insertion.cursor,
      );
      const inserted = insertComposerDraftTerminalContext(
        activeThreadId,
        insertion.prompt,
        {
          id: randomUUID(),
          threadId: activeThreadId,
          createdAt: new Date().toISOString(),
          ...selection,
        },
        insertion.contextIndex,
      );
      if (!inserted) {
        return;
      }
      promptRef.current = insertion.prompt;
      setComposerCursor(nextCollapsedCursor);
      setComposerTrigger(detectComposerTrigger(insertion.prompt, insertion.cursor));
      window.requestAnimationFrame(() => {
        composerEditorRef.current?.focusAt(nextCollapsedCursor);
      });
    },
    [
      activeThreadId,
      composerCursor,
      composerTerminalContexts,
      discardPromptHistoryNavigationForComposerMutation,
      insertComposerDraftTerminalContext,
    ],
  );
  // Terminal-only workspaces intentionally have no mounted composer. Do not
  // publish a global-looking action with nowhere to insert the selection.
  const canAddTerminalContextToChat = activeThread !== undefined && shouldRenderChatPaneContent;
  // Keep the published capability stable while cursor and draft state change;
  // dock terminals should not rerender for ordinary composer edits.
  const addTerminalContextToDraftRef = useRef(addTerminalContextToDraft);
  useLayoutEffect(() => {
    addTerminalContextToDraftRef.current = addTerminalContextToDraft;
  }, [addTerminalContextToDraft]);
  const addRegisteredTerminalContextToDraft = useCallback((selection: TerminalContextSelection) => {
    addTerminalContextToDraftRef.current(selection);
  }, []);
  useLayoutEffect(() => {
    if (!canAddTerminalContextToChat) {
      return;
    }
    return registerTerminalContextComposerTarget(paneScopeId, addRegisteredTerminalContextToDraft);
  }, [addRegisteredTerminalContextToDraft, canAddTerminalContextToChat, paneScopeId]);
  // Collapse an oversized paste into an attachment card above the composer instead
  // of flooding the editor with raw text. The card holds the full content until the
  // user sends or clicks "Show in text field".
  const addPastedTextToDraft = useCallback(
    (text: string) => {
      if (!activeThread) {
        return;
      }
      discardPromptHistoryNavigationForComposerMutation();
      addComposerDraftPastedTexts(activeThread.id, [
        createPastedTextDraft({
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          text,
        }),
      ]);
    },
    [activeThread, addComposerDraftPastedTexts, discardPromptHistoryNavigationForComposerMutation],
  );
  // The terminal's panel toggle mirrors the right dock's collapse control: it shows
  // or hides the side panel only when this thread already has a pane to show.
  const rightDockOpen = useRightDockStore((store) => selectRightDockState(threadId)(store).open);
  const isMobileViewport = useIsMobile();
  // Temporary threads are visually identical to regular chats — they use the same
  // Environment panel + header controls. "Temporary" is purely a sidebar badge +
  // auto-delete-on-leave concern, never a stripped-down chat UI.
  const environmentEnabled = !isEditorRail;
  const environmentUsesFloatingOverlay =
    isTerminalEnvironmentContext || isMobileViewport || rightDockOpen || surfaceMode === "split";
  const environmentDefaultOpen = resolveDefaultEnvironmentPanelOpen({
    environmentEnabled,
    isCenteredEmptyLanding,
    isTerminalPrimarySurface,
    isConstrainedChatLayout: environmentUsesFloatingOverlay,
    settingsDefaultOpen: settings.environmentPanelDefaultOpen,
  });
  // Every close (header toggle or panel action click) stores the cross-chat preference,
  // so a dismissed panel stays closed when switching threads until it is toggled back on.
  // The same toggle also persists to settings so the preference survives reloads.
  const [environmentPanelPreferenceOpen, setEnvironmentPanelPreferenceOpen] = useState<
    boolean | null
  >(null);
  const updateEnvironmentPanelPreference = useCallback(
    (open: boolean, persist: boolean) => {
      const update = resolveEnvironmentPanelPreferenceUpdate({ open, persist });
      setEnvironmentPanelPreferenceOpen(update.userPreferenceOpen);
      if (update.settingsDefaultOpen !== null) {
        updateSettings({
          environmentPanelDefaultOpen: update.settingsDefaultOpen,
        });
      }
    },
    // The state setter is stable, so listing it changes nothing at runtime — but React
    // Compiler infers it as a dependency here and refuses to compile the component when the
    // hand-written array omits it.
    [setEnvironmentPanelPreferenceOpen, updateSettings],
  );
  const setEnvironmentPanelOpenPreference = useCallback(
    (open: boolean) => updateEnvironmentPanelPreference(open, true),
    [updateEnvironmentPanelPreference],
  );
  const closeEnvironmentPanelAfterAction = useCallback(
    () => updateEnvironmentPanelPreference(false, false),
    [updateEnvironmentPanelPreference],
  );
  const environmentPanelOpen = resolveEnvironmentPanelOpen({
    defaultOpen: environmentDefaultOpen,
    userPreferenceOpen: environmentPanelPreferenceOpen,
  });
  const environmentPanelVisible = resolveEnvironmentPanelVisible({
    environmentEnabled,
    environmentPanelOpen,
  });
  const githubRepositoryQuery = useQuery(
    gitGithubRepositoryQueryOptions(gitBranchSourceCwd, environmentPanelVisible),
  );
  const threadRecap = useThreadRecap({
    thread: activeThread,
    cwd: threadWorkspaceCwd,
    enabled: environmentPanelVisible,
    latestTurnSettled,
  });
  const hasRightDockPanes = useRightDockStore(
    (store) => selectRightDockState(threadId)(store).panes.length > 0,
  );
  const setRightDockOpen = useRightDockStore((store) => store.setDockOpen);
  const toggleRightDock = useCallback(() => {
    setRightDockOpen(threadId, !rightDockOpen);
  }, [rightDockOpen, setRightDockOpen, threadId]);
  const terminalDrawerProps = useMemo(
    () => ({
      threadId,
      onTogglePanel: hasRightDockPanes ? toggleRightDock : undefined,
      isPanelOpen: hasRightDockPanes ? rightDockOpen : undefined,
      cwd: gitCwd ?? activeProject?.cwd ?? "",
      runtimeEnv: threadTerminalRuntimeEnv,
      height: terminalState.terminalHeight,
      terminalIds: terminalState.terminalIds,
      terminalLabelsById: terminalState.terminalLabelsById,
      terminalTitleOverridesById: terminalState.terminalTitleOverridesById,
      terminalCliKindsById: terminalState.terminalCliKindsById,
      terminalAttentionStatesById: terminalState.terminalAttentionStatesById ?? {},
      runningTerminalIds: terminalState.runningTerminalIds,
      activeTerminalId: terminalState.activeTerminalId,
      terminalGroups: terminalState.terminalGroups,
      activeTerminalGroupId: terminalState.activeTerminalGroupId,
      focusRequestId: terminalFocusRequestId,
      onSplitTerminal: splitTerminalRight,
      onSplitTerminalDown: splitTerminalDown,
      onNewTerminal: createNewTerminal,
      onNewTerminalTab: createNewTerminalTab,
      onMoveTerminalToGroup: moveTerminalToNewGroup,
      splitShortcutLabel: splitTerminalShortcutLabel ?? undefined,
      splitDownShortcutLabel: splitTerminalDownShortcutLabel ?? undefined,
      newShortcutLabel: newTerminalShortcutLabel ?? undefined,
      closeShortcutLabel: closeTerminalShortcutLabel ?? undefined,
      workspaceCloseShortcutLabel: closeWorkspaceShortcutLabel ?? undefined,
      onActiveTerminalChange: activateTerminal,
      onCloseTerminal: closeTerminal,
      onTerminalSessionExited: handleTerminalSessionExited,
      onCloseTerminalGroup: (groupId: string) => {
        if (!activeThreadId) return;
        storeCloseTerminalGroup(activeThreadId, groupId);
      },
      onHeightChange: setTerminalHeight,
      onResizeTerminalSplit: (groupId: string, splitId: string, weights: number[]) => {
        if (!activeThreadId) return;
        storeResizeTerminalSplit(activeThreadId, groupId, splitId, weights);
      },
      onTerminalMetadataChange: (
        terminalId: string,
        metadata: {
          cliKind: "codex" | "claude" | "antigravity" | null;
          label: string;
        },
      ) => {
        if (!activeThreadId) return;
        storeSetTerminalMetadata(activeThreadId, terminalId, metadata);
      },
      onTerminalActivityChange: (
        terminalId: string,
        activity: {
          hasRunningSubprocess: boolean;
          agentState: "running" | "attention" | "review" | null;
        },
      ) => {
        if (!activeThreadId) return;
        storeSetTerminalActivity(activeThreadId, terminalId, activity);
      },
      ...(canAddTerminalContextToChat ? { onAddTerminalContext: addTerminalContextToDraft } : {}),
    }),
    [
      activeProject?.cwd,
      activateTerminal,
      addTerminalContextToDraft,
      closeTerminal,
      handleTerminalSessionExited,
      closeTerminalShortcutLabel,
      closeWorkspaceShortcutLabel,
      createNewTerminal,
      createNewTerminalTab,
      moveTerminalToNewGroup,
      gitCwd,
      activeThreadId,
      newTerminalShortcutLabel,
      setTerminalHeight,
      splitTerminalRight,
      splitTerminalDown,
      splitTerminalShortcutLabel,
      splitTerminalDownShortcutLabel,
      storeCloseTerminalGroup,
      storeResizeTerminalSplit,
      storeSetTerminalActivity,
      storeSetTerminalMetadata,
      terminalFocusRequestId,
      terminalState.activeTerminalGroupId,
      terminalState.activeTerminalId,
      terminalState.terminalAttentionStatesById,
      terminalState.terminalCliKindsById,
      terminalState.terminalGroups,
      terminalState.terminalHeight,
      terminalState.terminalIds,
      terminalState.terminalLabelsById,
      terminalState.terminalTitleOverridesById,
      terminalState.runningTerminalIds,
      threadId,
      threadTerminalRuntimeEnv,
      toggleRightDock,
      rightDockOpen,
      hasRightDockPanes,
      canAddTerminalContextToChat,
    ],
  );
  const runProjectScript = useCallback(
    async (
      script: ProjectScript,
      options?: ProjectScriptRunOptions,
    ): Promise<ProjectScriptRunResult | null> => {
      const api = readNativeApi();
      if (!api || !activeThreadId || !activeProject || !activeThread) return null;
      if (options?.rememberAsLastInvoked !== false) {
        setLastInvokedScriptByProjectId((current) => {
          if (current[activeProject.id] === script.id) return current;
          return { ...current, [activeProject.id]: script.id };
        });
      }
      const targetCwd = options?.cwd ?? gitCwd ?? activeProject.cwd;
      const baseTerminalId =
        terminalState.activeTerminalId ||
        terminalState.terminalIds[0] ||
        DEFAULT_THREAD_TERMINAL_ID;
      const { shouldCreateNewTerminal, terminalId: targetTerminalId } =
        resolveProjectScriptTerminalTarget({
          baseTerminalId,
          createTerminalId: randomTerminalId,
          hasRunningTerminal: terminalState.runningTerminalIds.length > 0,
          preferNewTerminal: options?.preferNewTerminal,
          terminalOpen: terminalState.terminalOpen,
        });

      setTerminalOpen(true);
      if (shouldCreateNewTerminal) {
        storeNewTerminal(activeThreadId, targetTerminalId);
      } else {
        storeSetActiveTerminal(activeThreadId, targetTerminalId);
      }
      requestTerminalFocus();

      // Nested function so the `try` body holds no value blocks — see the comment on
      // `deleteEmptyTerminalThread` above for why React Compiler requires this shape.
      const runScriptInTargetTerminal = async () => {
        const { metadata } = await runProjectCommandInTerminal({
          api,
          threadId: activeThreadId,
          terminalId: targetTerminalId,
          project: {
            cwd: isStudioContainer ? targetCwd : activeProject.cwd,
          },
          cwd: targetCwd,
          command: script.command,
          worktreePath: options?.worktreePath ?? activeThread.worktreePath ?? null,
          ...(options?.env ? { env: options.env } : {}),
        });
        if (metadata) {
          storeSetTerminalMetadata(activeThreadId, targetTerminalId, {
            cliKind: metadata.cliKind,
            label: metadata.label,
          });
        }
      };

      try {
        await runScriptInTargetTerminal();
        return { terminalId: targetTerminalId };
      } catch (error) {
        setThreadError(
          activeThreadId,
          error instanceof Error ? error.message : `Failed to run script "${script.name}".`,
        );
        if (options?.throwOnError) {
          throw error instanceof Error
            ? error
            : new Error(`Failed to run script "${script.name}".`);
        }
        return null;
      }
    },
    [
      activeProject,
      activeThread,
      activeThreadId,
      gitCwd,
      isStudioContainer,
      requestTerminalFocus,
      setTerminalOpen,
      setThreadError,
      storeNewTerminal,
      storeSetActiveTerminal,
      storeSetTerminalMetadata,
      setLastInvokedScriptByProjectId,
      terminalState.activeTerminalId,
      terminalState.terminalOpen,
      terminalState.runningTerminalIds,
      terminalState.terminalIds,
    ],
  );
  const stopActiveThreadSession = useCallback(async () => {
    const activeRun = [...(productReadModel?.runs ?? [])]
      .toReversed()
      .find(
        (run) =>
          run.receipt.receipt.state === "accepted" || run.receipt.receipt.state === "running",
      );
    if (!activeRun || !productReadModel) return;
    await abortProductRun({
      api: readProductNativeApi(),
      conversationId: productReadModel.conversation.id,
      runId: activeRun.id,
      copy: workbenchCopy,
    });
  }, [productReadModel, workbenchCopy]);
  const {
    handoffBusy,
    worktreeHandoffDialogOpen,
    setWorktreeHandoffDialogOpen,
    worktreeHandoffName,
    setWorktreeHandoffName,
    onHandoffToWorktree,
    onHandoffToLocal,
    confirmWorktreeHandoff,
  } = useThreadWorkspaceHandoff({
    activeProject,
    activeThread,
    activeRootBranch,
    activeThreadAssociatedWorktree,
    isServerThread,
    stopActiveThreadSession,
    runProjectScript,
  });
  const persistProjectScripts = useCallback(
    async (input: {
      projectId: ProjectId;
      projectCwd: string;
      previousScripts: ProjectScript[];
      nextScripts: ProjectScript[];
      keybinding?: string | null;
      keybindingCommand: KeybindingCommand;
    }) => {
      void input;
      throw new Error(
        "Project actions are unavailable until their metadata has a Product-owned persistence contract.",
      );
    },
    [],
  );
  const saveProjectScript = useCallback(
    async (input: NewProjectScriptInput) => {
      if (!activeProject) return;
      const nextId = nextProjectScriptId(
        input.name,
        activeProject.scripts.map((script) => script.id),
      );
      const nextScript: ProjectScript = {
        id: nextId,
        name: input.name,
        command: input.command,
        icon: input.icon,
        runOnWorktreeCreate: input.runOnWorktreeCreate,
      };
      const nextScripts = input.runOnWorktreeCreate
        ? [
            ...activeProject.scripts.map((script) =>
              script.runOnWorktreeCreate ? { ...script, runOnWorktreeCreate: false } : script,
            ),
            nextScript,
          ]
        : [...activeProject.scripts, nextScript];

      await persistProjectScripts({
        projectId: activeProject.id,
        projectCwd: activeProject.cwd,
        previousScripts: activeProject.scripts,
        nextScripts,
        keybinding: input.keybinding,
        keybindingCommand: commandForProjectScript(nextId),
      });
    },
    [activeProject, persistProjectScripts],
  );
  const updateProjectScript = useCallback(
    async (scriptId: string, input: NewProjectScriptInput) => {
      if (!activeProject) return;
      const existingScript = activeProject.scripts.find((script) => script.id === scriptId);
      if (!existingScript) {
        throw new Error("Script not found.");
      }

      const updatedScript: ProjectScript = {
        ...existingScript,
        name: input.name,
        command: input.command,
        icon: input.icon,
        runOnWorktreeCreate: input.runOnWorktreeCreate,
      };
      const nextScripts = activeProject.scripts.map((script) =>
        script.id === scriptId
          ? updatedScript
          : input.runOnWorktreeCreate
            ? { ...script, runOnWorktreeCreate: false }
            : script,
      );

      await persistProjectScripts({
        projectId: activeProject.id,
        projectCwd: activeProject.cwd,
        previousScripts: activeProject.scripts,
        nextScripts,
        keybinding: input.keybinding,
        keybindingCommand: commandForProjectScript(scriptId),
      });
    },
    [activeProject, persistProjectScripts],
  );
  const deleteProjectScript = useCallback(
    async (scriptId: string) => {
      if (!activeProject) return;
      const nextScripts = activeProject.scripts.filter((script) => script.id !== scriptId);

      const deletedName = activeProject.scripts.find((s) => s.id === scriptId)?.name;
      // Resolved before the `try`: a value block (`??`) inside a try body makes React
      // Compiler bail out on the whole component.
      const deletedScriptToastTitle = `Deleted action "${deletedName ?? "Unknown"}"`;

      try {
        await persistProjectScripts({
          projectId: activeProject.id,
          projectCwd: activeProject.cwd,
          previousScripts: activeProject.scripts,
          nextScripts,
          keybinding: null,
          keybindingCommand: commandForProjectScript(scriptId),
        });
        toastManager.add({
          type: "success",
          title: deletedScriptToastTitle,
        });
      } catch (error) {
        toastManager.add({
          type: "error",
          title: "Could not delete action",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
      }
    },
    [activeProject, persistProjectScripts],
  );

  const persistRuntimeModeChange = useCallback(
    async (mode: RuntimeMode): Promise<boolean> => {
      let queue = runtimeModePersistenceQueuesRef.current.get(threadId);
      if (!queue) {
        queue = createRuntimeModePersistenceQueue(runtimeMode);
        runtimeModePersistenceQueuesRef.current.set(threadId, queue);
      }
      return queue.persist(mode, async (_currentMode, nextMode) => {
        setComposerDraftRuntimeMode(threadId, nextMode);
        if (isLocalDraftThread) {
          setDraftThreadContext(threadId, { runtimeMode: nextMode });
        }
        scheduleComposerFocus();
        return true;
      });
    },
    [
      isLocalDraftThread,
      runtimeMode,
      scheduleComposerFocus,
      setComposerDraftRuntimeMode,
      setDraftThreadContext,
      threadId,
    ],
  );
  const handleRuntimeModeChange = useCallback(
    (mode: RuntimeMode) => {
      void persistRuntimeModeChange(mode);
    },
    [persistRuntimeModeChange],
  );

  const handleInteractionModeChange = useCallback(
    (mode: ComposerInteractionMode) => {
      if (isProductConversationThread) return;
      if (mode === interactionMode) return;
      setComposerDraftInteractionMode(threadId, mode);
      if (isLocalDraftThread) {
        setDraftThreadContext(threadId, { interactionMode: mode });
      }
      scheduleComposerFocus();
    },
    [
      interactionMode,
      isLocalDraftThread,
      isProductConversationThread,
      scheduleComposerFocus,
      setComposerDraftInteractionMode,
      setDraftThreadContext,
      threadId,
    ],
  );
  const toggleInteractionMode = useCallback(() => {
    if (isProductConversationThread) return;
    handleInteractionModeChange(interactionMode === "plan" ? "default" : "plan");
  }, [handleInteractionModeChange, interactionMode, isProductConversationThread]);
  const togglePlanSidebar = useCallback(() => {
    setPlanSidebarOpen((open) => {
      if (open) {
        planSidebarDismissedForTurnRef.current =
          activeTaskList?.turnId ?? sidebarProposedPlan?.turnId ?? "__dismissed__";
      } else {
        planSidebarDismissedForTurnRef.current = null;
      }
      return !open;
    });
  }, [activeTaskList?.turnId, sidebarProposedPlan?.turnId]);
  const programmaticScrollUntilRef = useRef(0);
  // The arrow's smooth jump is followed by one exact settle after LegendList
  // has measured the tail. A user gesture invalidates that pending settle.
  const settledScrollRequestRef = useRef(0);
  const settledScrollInFlightRef = useRef(false);
  // Smooth only the first auto-follow after a send; live stream re-sticks stay cheap.
  const animateNextAutoFollowScrollRef = useRef(false);
  const scrollToEnd = useCallback((animated = false) => {
    programmaticScrollUntilRef.current = performance.now() + 200;
    legendListRef.current?.scrollToEnd?.({ animated });
  }, []);
  const clearTranscriptAutoFollow = useCallback(() => {
    const settledScrollTarget = settledScrollInFlightRef.current ? legendListRef.current : null;
    autoFollowThreadIdRef.current = null;
    animateNextAutoFollowScrollRef.current = false;
    settledScrollRequestRef.current += 1;
    settledScrollInFlightRef.current = false;
    programmaticScrollUntilRef.current = 0;
    // A user scroll gesture takes over from any in-flight tail-anchor slide.
    tailAnchorScrollInFlightRef.current = false;
    if (settledScrollTarget) {
      void stopTranscriptScrollAtCurrentOffset(settledScrollTarget);
    }
  }, []);
  const transcriptMessageCount = useMemo(
    () => timelineEntries.filter((entry) => entry.kind === "message").length,
    [timelineEntries],
  );
  const latestTranscriptMessage = useMemo(() => {
    for (let index = timelineEntries.length - 1; index >= 0; index -= 1) {
      const entry = timelineEntries[index];
      if (entry?.kind === "message") {
        return entry.message;
      }
    }
    return null;
  }, [timelineEntries]);
  const transcriptTailKey = latestTranscriptMessage
    ? [
        latestTranscriptMessage.id,
        latestTranscriptMessage.role,
        latestTranscriptMessage.streaming ? "streaming" : "settled",
        latestTranscriptMessage.text.length > 0 ? "content" : "empty",
        latestTranscriptMessage.text.length,
        latestTranscriptMessage.completedAt ?? "",
      ].join(":")
    : "empty";
  const transcriptAutoFollowSignal = buildTranscriptAutoFollowSignal({
    messageCount: transcriptMessageCount,
    tailKey: transcriptTailKey,
  });
  const onIsAtEndChange = useCallback((isAtEnd: boolean) => {
    if (isAtEndRef.current === isAtEnd) return;
    if (
      !isAtEnd &&
      (settledScrollInFlightRef.current || performance.now() < programmaticScrollUntilRef.current)
    ) {
      return;
    }
    isAtEndRef.current = isAtEnd;
    if (isAtEnd) {
      showScrollDebouncer.current.cancel();
      setShowScrollToBottom(false);
    } else {
      showScrollDebouncer.current.maybeExecute();
    }
  }, []);
  const cancelPendingInteractionAnchorAdjustment = useCallback(() => {
    const pendingFrame = pendingInteractionAnchorFrameRef.current;
    if (pendingFrame === null) return;
    pendingInteractionAnchorFrameRef.current = null;
    window.cancelAnimationFrame(pendingFrame);
  }, []);
  const onMessagesClickCaptureBase = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const scrollContainer = legendListRef.current?.getScrollableNode?.();
      if (!(scrollContainer instanceof HTMLElement) || !(event.target instanceof Element)) return;

      const trigger = event.target.closest<HTMLElement>(
        "button, summary, [role='button'], [data-scroll-anchor-target]",
      );
      if (!trigger || !scrollContainer.contains(trigger)) return;
      if (trigger.closest("[data-scroll-anchor-ignore]")) return;

      pendingInteractionAnchorRef.current = {
        element: trigger,
        top: trigger.getBoundingClientRect().top,
      };

      cancelPendingInteractionAnchorAdjustment();
      pendingInteractionAnchorFrameRef.current = window.requestAnimationFrame(() => {
        pendingInteractionAnchorFrameRef.current = null;
        const anchor = pendingInteractionAnchorRef.current;
        pendingInteractionAnchorRef.current = null;
        const activeScrollContainer = legendListRef.current?.getScrollableNode?.();
        if (!(activeScrollContainer instanceof HTMLElement) || !anchor) return;
        if (!anchor.element.isConnected || !activeScrollContainer.contains(anchor.element)) return;

        const nextTop = anchor.element.getBoundingClientRect().top;
        const delta = nextTop - anchor.top;
        if (Math.abs(delta) < 0.5) return;

        activeScrollContainer.scrollTop += delta;
      });
    },
    [cancelPendingInteractionAnchorAdjustment],
  );
  const onMessagesPointerCancelBase = useCallback(() => {
    clearTranscriptAutoFollow();
  }, [clearTranscriptAutoFollow]);
  const onMessagesPointerDownBase = useCallback(() => {
    clearTranscriptAutoFollow();
  }, [clearTranscriptAutoFollow]);
  const onMessagesPointerUpBase = useCallback(() => {}, []);
  const onMessagesScrollBase = useCallback(() => {}, []);
  const onMessagesTouchEndBase = useCallback(() => {}, []);
  const onMessagesTouchMoveBase = useCallback(() => {
    clearTranscriptAutoFollow();
  }, [clearTranscriptAutoFollow]);
  const onMessagesTouchStartBase = useCallback(() => {
    clearTranscriptAutoFollow();
  }, [clearTranscriptAutoFollow]);
  const onMessagesWheelBase = useCallback(() => {
    clearTranscriptAutoFollow();
  }, [clearTranscriptAutoFollow]);
  useLayoutEffect(() => {
    const shouldFollowPendingTurn =
      activeThread?.id !== undefined && autoFollowThreadIdRef.current === activeThread.id;
    if (!isAtEndRef.current && !shouldFollowPendingTurn) {
      return;
    }
    // Re-apply the bottom stick only for real transcript messages; tool/work
    // rows can arrive quickly and should not churn scroll/layout work.
    const frameId = window.requestAnimationFrame(() => {
      // The tail-anchor slide owns the scroll after a send; a re-snap here
      // would hard-jump past the smooth slide mid-flight. Once the anchor
      // settles the spacer keeps the end position exact, so nothing is missed.
      if (tailAnchorScrollInFlightRef.current) {
        return;
      }
      const shouldAnimate = animateNextAutoFollowScrollRef.current;
      animateNextAutoFollowScrollRef.current = false;
      scrollToEnd(shouldAnimate);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeThread?.id, scrollToEnd, transcriptAutoFollowSignal]);
  const {
    pendingTranscriptSelectionAction,
    commitTranscriptAssistantSelection,
    dismissTranscriptSelectionAction,
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
  } = useTranscriptAssistantSelectionAction({
    threadId,
    enabled:
      Boolean(activeThread) &&
      !isInactiveSplitPane &&
      pendingUserInputs.length === 0 &&
      !isComposerApprovalState,
    composerImagesRef,
    composerFilesRef,
    composerAssistantSelectionsRef,
    addComposerAssistantSelectionToDraft,
    canReferenceAssistantSelection: (selection) =>
      !isPendingSetupBubbleId(MessageId.makeUnsafe(selection.assistantMessageId)),
    scheduleComposerFocus,
    onMessagesClickCaptureBase,
    onMessagesPointerCancelBase,
    onMessagesPointerDownBase,
    onMessagesPointerUpBase,
    onMessagesScrollBase,
    onMessagesTouchEndBase,
    onMessagesTouchMoveBase,
    onMessagesTouchStartBase,
    onMessagesWheelBase,
  });
  const createMarkerFromPendingSelection = useCallback(
    (style: ThreadMarkerStyle, color: ThreadMarkerColor) => {
      const pendingSelection = pendingTranscriptSelectionAction;
      if (!pendingSelection || !activeThreadId) {
        return;
      }
      const messageId = MessageId.makeUnsafe(pendingSelection.selection.assistantMessageId);
      if (isPendingSetupBubbleId(messageId)) {
        // Don't mark an ephemeral automation-setup bubble; it disappears when setup ends.
        dismissTranscriptSelectionAction();
        window.getSelection()?.removeAllRanges();
        return;
      }
      const message = timelineMessages.find((candidate) => candidate.id === messageId);
      if (!message) {
        toastManager.add({
          type: "warning",
          title: "Could not find the selected message.",
        });
        return;
      }
      const range = resolveTranscriptMarkerRange({
        messageText: message.text,
        selectedText: pendingSelection.selection.text,
      });
      if (!range) {
        toastManager.add({
          type: "warning",
          title: "Select a unique phrase to mark it.",
          description: "Try including a few more words so OmniMind can find the exact place.",
        });
        return;
      }
      dismissTranscriptSelectionAction();
      window.getSelection()?.removeAllRanges();
      const sameStyleOverlappingMarkers = threadMarkers.filter(
        (marker) =>
          marker.messageId === messageId &&
          marker.style === style &&
          marker.startOffset < range.endOffset &&
          range.startOffset < marker.endOffset,
      );
      if (sameStyleOverlappingMarkers.length > 0) {
        for (const marker of sameStyleOverlappingMarkers) {
          void dispatchThreadMarkerRemove(activeThreadId, marker.id).catch((error) => {
            console.error("Failed to remove thread marker", error);
            toastManager.add({
              type: "error",
              title: "Could not remove marker.",
            });
          });
        }
        return;
      }
      void dispatchThreadMarkerAdd({
        threadId: activeThreadId,
        markerId: ThreadMarkerId.makeUnsafe(crypto.randomUUID()),
        messageId,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        selectedText: message.text.slice(range.startOffset, range.endOffset),
        style,
        color,
      }).catch((error) => {
        console.error("Failed to create thread marker", error);
        toastManager.add({
          type: "error",
          title: "Could not create marker.",
        });
      });
    },
    [
      activeThreadId,
      dismissTranscriptSelectionAction,
      isPendingSetupBubbleId,
      pendingTranscriptSelectionAction,
      threadMarkers,
      timelineMessages,
    ],
  );
  const createHighlightFromPendingSelection = useCallback(() => {
    createMarkerFromPendingSelection("highlight", "yellow");
  }, [createMarkerFromPendingSelection]);
  const createUnderlineFromPendingSelection = useCallback(() => {
    createMarkerFromPendingSelection("underline", "blue");
  }, [createMarkerFromPendingSelection]);

  useLayoutEffect(() => {
    if (isInactiveSplitPane) return;
    const composerForm = composerFormRef.current;
    if (!composerForm) return;
    const measureComposerFormWidth = () => composerForm.clientWidth;
    const syncComposerFooterLayout = () => {
      const composerFormWidth = measureComposerFormWidth();
      const nextCompact = shouldUseCompactComposerFooter(composerFormWidth, {
        hasWideActions: composerFooterHasWideActions,
      });
      setIsComposerFooterCompact((previous) => (previous === nextCompact ? previous : nextCompact));
      // Tier the footer controls by MEASURED overflow: demote one step while
      // the footer row's content is wider than the row, promote back (with
      // hysteresis) when the recorded overflow width is comfortably exceeded.
      const footerRow = composerForm.querySelector<HTMLElement>("[data-chat-composer-footer]");
      if (footerRow) {
        const rowOverflows = footerRow.scrollWidth > footerRow.clientWidth + 1;
        // The leading cluster clips (overflow-hidden) in compact mode instead
        // of growing the row's scrollWidth, so check it directly — a clipped
        // "+"/access-rules cluster must also demote the tier.
        const leadingCluster = footerRow.querySelector<HTMLElement>("[data-chat-composer-leading]");
        const leadingClips =
          nextCompact &&
          leadingCluster !== null &&
          leadingCluster.scrollWidth > leadingCluster.clientWidth + 1;
        const nextStep = resolveNextComposerFooterTier({
          currentTier: composerFooterTierRef.current,
          clientWidth: footerRow.clientWidth,
          isOverflowing: rowOverflows || leadingClips,
          demotionWidths: composerFooterDemotionWidthsRef.current,
        });
        composerFooterDemotionWidthsRef.current = nextStep.demotionWidths;
        if (nextStep.tier !== composerFooterTierRef.current) {
          composerFooterTierRef.current = nextStep.tier;
          setComposerFooterTier(nextStep.tier);
        }
      }
    };
    composerFooterLayoutSyncRef.current = syncComposerFooterLayout;

    const measuredHeight = Math.ceil(composerForm.getBoundingClientRect().height);
    composerFormHeightRef.current = measuredHeight;
    if (measuredHeight > 0) {
      setSecondaryChromePlaceholderHeight((current) =>
        current === measuredHeight ? current : measuredHeight,
      );
    }
    syncComposerFooterLayout();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) return;

      syncComposerFooterLayout();

      const nextHeight = entry.contentRect.height;
      composerFormHeightRef.current = nextHeight;
      const roundedNextHeight = Math.ceil(nextHeight);
      if (roundedNextHeight > 0) {
        setSecondaryChromePlaceholderHeight((current) =>
          current === roundedNextHeight ? current : roundedNextHeight,
        );
      }
    });

    observer.observe(composerForm);
    return () => {
      observer.disconnect();
    };
  }, [activeThread?.id, composerFooterHasWideActions, isInactiveSplitPane]);

  useLayoutEffect(() => {
    if (isInactiveSplitPane || typeof ResizeObserver === "undefined") return;
    const composerForm = composerFormRef.current;
    if (!composerForm) return;

    let previousHeight = composerForm.getBoundingClientRect().height;
    let pendingScrollTimeout: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) return;

      const nextHeight = entry.contentRect.height;
      const heightDelta = nextHeight - previousHeight;
      previousHeight = nextHeight;
      if (Math.abs(heightDelta) < 0.5) return;

      const scrollContainer = legendListRef.current?.getScrollableNode?.();
      // A composer resize can make LegendList report `isAtEnd: false` after the viewport
      // has already changed. Reconstruct the pre-resize viewport so only an existing
      // tail stick is preserved; a user who was already scrolled away stays there.
      const wasNearEndBeforeResize =
        scrollContainer instanceof HTMLElement &&
        isScrollContainerNearBottom({
          scrollTop: scrollContainer.scrollTop,
          clientHeight: scrollContainer.clientHeight + heightDelta,
          scrollHeight: scrollContainer.scrollHeight,
        });
      if (!wasNearEndBeforeResize) return;

      if (pendingScrollTimeout !== null) {
        window.clearTimeout(pendingScrollTimeout);
      }
      pendingScrollTimeout = window.setTimeout(() => {
        pendingScrollTimeout = null;
        scrollToEnd(false);
      }, 0);
    });

    observer.observe(composerForm);
    return () => {
      observer.disconnect();
      if (pendingScrollTimeout !== null) {
        window.clearTimeout(pendingScrollTimeout);
      }
    };
  }, [
    activeThread?.id,
    isInactiveSplitPane,
    scrollToEnd,
    secondaryChromeReady,
    shouldRenderChatPaneContent,
  ]);

  useEffect(() => {
    isAtEndRef.current = true;
    settledScrollRequestRef.current += 1;
    settledScrollInFlightRef.current = false;
    programmaticScrollUntilRef.current = 0;
    showScrollDebouncer.current.cancel();
    // Capture the carried sidebar-open intent synchronously (ref reads/writes stay
    // in render->commit order); defer only the setState so this thread-change reset
    // stays out of the render->effect->render cascade.
    const openPlanSidebar = planSidebarOpenOnNextThreadRef.current;
    planSidebarOpenOnNextThreadRef.current = false;
    planSidebarDismissedForTurnRef.current = null;
    const settle = window.setTimeout(() => {
      setPullRequestDialogState(null);
      setRenameDialogOpen(false);
      setShowScrollToBottom(false);
      setPlanSidebarOpen(openPlanSidebar);
    }, 0);
    return () => window.clearTimeout(settle);
  }, [activeThread?.id]);

  useEffect(() => {
    if (!composerMenuOpen) {
      setComposerHighlightedItemId(null);
      return;
    }
    setComposerHighlightedItemId((existing) =>
      existing && composerMenuItems.some((item) => item.id === existing)
        ? existing
        : (composerMenuItems[0]?.id ?? null),
    );
  }, [composerMenuItems, composerMenuOpen]);

  useEffect(() => {
    // Async setState (post-paint) keeps this thread-change reset out of the
    // render->effect->render cascade.
    const settle = window.setTimeout(() => {
      setIsRevertingCheckpoint(false);
    }, 0);
    return () => window.clearTimeout(settle);
  }, [activeThread?.id]);

  useEffect(() => {
    if (!activeThread?.id || terminalState.terminalOpen || isInactiveSplitPane) return;
    const frame = window.requestAnimationFrame(() => {
      focusComposer();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeThread?.id, focusComposer, isInactiveSplitPane, terminalState.terminalOpen]);

  useEffect(() => {
    composerImagesRef.current = composerImages;
  }, [composerImages]);

  useEffect(() => {
    composerFilesRef.current = composerFiles;
  }, [composerFiles]);

  useEffect(() => {
    composerAssistantSelectionsRef.current = composerAssistantSelections;
  }, [composerAssistantSelections]);

  useEffect(() => {
    composerBrowserAnnotationsRef.current = composerBrowserAnnotations;
  }, [composerBrowserAnnotations]);

  useEffect(() => {
    composerTerminalContextsRef.current = composerTerminalContexts;
  }, [composerTerminalContexts]);

  useEffect(() => {
    composerFileCommentsRef.current = composerFileComments;
  }, [composerFileComments]);

  useEffect(() => {
    composerPastedTextsRef.current = composerPastedTexts;
  }, [composerPastedTexts]);

  useEffect(() => {
    if (!activeThread?.id) return;
    if (!serverMessages || serverMessages.length === 0) {
      return;
    }
    // No optimistic messages → nothing to reconcile; skip the full-transcript id Set
    // this effect would otherwise rebuild on every streaming flush.
    if (optimisticUserMessages.length === 0) {
      return;
    }
    const serverIds = new Set(serverMessages.map((message) => message.id));
    const removedMessages = optimisticUserMessages.filter((message) => serverIds.has(message.id));
    if (removedMessages.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setOptimisticUserMessages((existing) =>
        existing.filter((message) => !serverIds.has(message.id)),
      );
    }, 0);
    for (const removedMessage of removedMessages) {
      const previewUrls = collectUserMessageBlobPreviewUrls(removedMessage);
      if (previewUrls.length > 0) {
        handoffAttachmentPreviews(removedMessage.id, previewUrls);
        continue;
      }
      revokeUserMessagePreviewUrls(removedMessage);
    }
    return () => {
      window.clearTimeout(timer);
    };
  }, [activeThread?.id, handoffAttachmentPreviews, optimisticUserMessages, serverMessages]);

  useEffect(() => {
    promptRef.current = prompt;
    if (
      promptHistoryNavigationRef.current !== null &&
      prompt !== promptHistoryAppliedPromptRef.current
    ) {
      // Another writer (queued-turn restore, automation restore, insertion)
      // replaced the prompt while a history browse was active. The new prompt
      // is authoritative: end the browse and drop the saved pre-browse draft
      // so it cannot clobber this prompt later.
      promptHistoryNavigationRef.current = null;
      expectedPromptHistoryPromptRef.current = null;
      setComposerDraftPromptHistorySavedDraft(threadId, null);
    }
    setComposerCursor((existing) => clampCollapsedComposerCursor(prompt, existing));
  }, [prompt, setComposerDraftPromptHistorySavedDraft, threadId]);

  useLayoutEffect(() => {
    updateSelectedComposerSkills(composerSkills);
    updateSelectedComposerMentions(composerMentions);
  }, [
    composerMentions,
    composerSkills,
    threadId,
    updateSelectedComposerMentions,
    updateSelectedComposerSkills,
  ]);

  useEffect(() => {
    updateSelectedComposerSkills((existing) => {
      const nextSkills = filterPromptSkillReferences(prompt, existing, selectedProvider);
      return providerSkillReferencesEqual(existing, nextSkills) ? existing : nextSkills;
    });
  }, [prompt, selectedProvider, updateSelectedComposerSkills]);

  useEffect(() => {
    updateSelectedComposerMentions((existing) => {
      const nextMentions = filterPromptProviderMentionReferences(prompt, existing);
      return providerMentionReferencesEqual(existing, nextMentions) ? existing : nextMentions;
    });
  }, [prompt, updateSelectedComposerMentions]);

  useLayoutEffect(() => {
    // ChatView stays mounted across thread switches, so clear thread-local overlays before paint.
    setOptimisticUserMessages((existing) => {
      if (existing.length === 0) return existing;
      for (const message of existing) {
        revokeUserMessagePreviewUrls(message);
      }
      return [];
    });
    setExpandedImage(null);
  }, [threadId]);

  useEffect(() => {
    dragDepthRef.current = 0;
    // Async setState (post-paint) keeps this thread-change reset out of the
    // render->effect->render cascade. The pre-paint overlay clear (optimistic
    // messages, expanded image) lives in the layout effect above, so deferring
    // these residual resets by a tick is imperceptible.
    const settle = window.setTimeout(() => {
      setOptimisticUserMessages((existing) => {
        if (existing.length === 0) return existing;
        for (const message of existing) {
          revokeUserMessagePreviewUrls(message);
        }
        return [];
      });
      setLocalDispatch(null);
      setComposerHighlightedItemId(null);
      setComposerCursor(
        collapseExpandedComposerCursor(promptRef.current, promptRef.current.length),
      );
      setComposerTrigger(detectComposerTrigger(promptRef.current, promptRef.current.length));
      setIsDragOverComposer(false);
      setExpandedImage(null);
    }, 0);
    return () => window.clearTimeout(settle);
  }, [threadId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (composerImages.length === 0) {
        const hasDeferredBlobAttachment =
          useComposerDraftStore
            .getState()
            .draftsByThreadId[threadId]?.persistedAttachments.some(
              (attachment) => attachment.blobKey,
            ) ?? false;
        if (hasDeferredBlobAttachment) {
          return;
        }
        clearComposerDraftPersistedAttachments(threadId);
        return;
      }
      const staged = await stagePersistedComposerImageAttachments({
        threadId,
        images: composerImages,
        getPersistedAttachments: () =>
          useComposerDraftStore.getState().draftsByThreadId[threadId]?.persistedAttachments ?? [],
      });
      if (cancelled) {
        return;
      }
      // Stage attachments in persisted draft state first so persist middleware can write them.
      void syncComposerDraftPersistedAttachments(threadId, staged);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    clearComposerDraftPersistedAttachments,
    composerImages,
    syncComposerDraftPersistedAttachments,
    threadId,
  ]);

  useEffect(() => {
    if (
      !composerPromptHistorySavedDraftImages ||
      composerPromptHistorySavedDraftImages.length === 0
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const staged = await stagePersistedComposerImageAttachments({
        threadId,
        images: composerPromptHistorySavedDraftImages,
        getPersistedAttachments: () =>
          useComposerDraftStore.getState().draftsByThreadId[threadId]?.promptHistorySavedDraft
            ?.persistedAttachments ?? [],
      });
      if (cancelled) {
        return;
      }
      void syncComposerDraftPromptHistorySavedDraftPersistedAttachments(threadId, staged);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    composerPromptHistorySavedDraftImages,
    syncComposerDraftPromptHistorySavedDraftPersistedAttachments,
    threadId,
  ]);

  const closeExpandedImage = useCallback(() => {
    setExpandedImage(null);
  }, []);
  const navigateExpandedImage = useCallback((direction: -1 | 1) => {
    setExpandedImage((existing) => {
      if (!existing || existing.images.length <= 1) {
        return existing;
      }
      const nextIndex =
        (existing.index + direction + existing.images.length) % existing.images.length;
      if (nextIndex === existing.index) {
        return existing;
      }
      return { ...existing, index: nextIndex };
    });
  }, []);

  useEffect(() => {
    if (!expandedImage) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeExpandedImage();
        return;
      }
      if (expandedImage.images.length <= 1) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        navigateExpandedImage(-1);
        return;
      }
      if (event.key !== "ArrowRight") return;
      event.preventDefault();
      event.stopPropagation();
      navigateExpandedImage(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeExpandedImage, expandedImage, navigateExpandedImage]);

  useEffect(() => {
    if (!composerMenuOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setComposerHighlightedItemId(null);
      setComposerTrigger(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composerMenuOpen]);

  const activeWorktreePath = isStudioContainer ? null : activeThread?.worktreePath;
  const envMode: DraftThreadEnvMode = isStudioContainer
    ? "local"
    : isServerThread
      ? resolveThreadEnvironmentMode({
          envMode: activeThread?.envMode,
          worktreePath: activeWorktreePath ?? null,
        })
      : (draftThread?.envMode ?? "local");
  const envState = resolveThreadWorkspaceState({
    envMode: resolvedThreadEnvMode,
    worktreePath: resolvedThreadWorktreePath,
  });

  const beginLocalDispatch = useCallback(
    (options?: WorktreeSetupDispatchOptions) => {
      setLocalDispatch((current) => {
        const next = resolveNextLocalDispatchSnapshot(
          options ? { current, activeThread, options } : { current, activeThread },
        );
        if (next !== current) {
          failedWorktreeSetupDispatchStartedAtRef.current = null;
        }
        return next;
      });
    },
    [activeThread],
  );

  const resetLocalDispatch = useCallback(() => {
    failedWorktreeSetupDispatchStartedAtRef.current = null;
    setLocalDispatch(null);
  }, []);

  const localDispatchWorktreeSetupFailed = worktreeSetupHasError(activeWorktreeSetup);
  useEffect(() => {
    if (!serverAcknowledgedLocalDispatch) {
      return;
    }
    // A failed worktree setup would otherwise reset in the same commit that
    // painted the error (thread errors count as acknowledgement), so hold the
    // row briefly before letting it animate out.
    if (localDispatchWorktreeSetupFailed) {
      const failedDispatchStartedAt = localDispatch?.startedAt;
      if (!failedDispatchStartedAt) {
        return;
      }
      const holdTimeout = window.setTimeout(() => {
        setLocalDispatch((current) => {
          if (
            !current ||
            current.startedAt !== failedDispatchStartedAt ||
            !worktreeSetupHasError(current.worktreeSetup)
          ) {
            return current;
          }
          failedWorktreeSetupDispatchStartedAtRef.current = null;
          return null;
        });
      }, WORKTREE_SETUP_ERROR_HOLD_MS);
      return () => window.clearTimeout(holdTimeout);
    }
    resetLocalDispatch();
  }, [
    localDispatch?.startedAt,
    localDispatchWorktreeSetupFailed,
    resetLocalDispatch,
    serverAcknowledgedLocalDispatch,
  ]);

  useEffect(() => {
    if (!activeThreadId) return;
    const previous = terminalOpenByThreadRef.current[activeThreadId] ?? false;
    const current = Boolean(terminalState.terminalOpen);

    if (!previous && current) {
      terminalOpenByThreadRef.current[activeThreadId] = current;
      requestTerminalFocus();
      return;
    } else if (previous && !current) {
      terminalOpenByThreadRef.current[activeThreadId] = current;
      const frame = window.requestAnimationFrame(() => {
        focusComposer();
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    terminalOpenByThreadRef.current[activeThreadId] = current;
  }, [activeThreadId, focusComposer, requestTerminalFocus, terminalState.terminalOpen]);

  useEffect(() => {
    if (!activeThreadId) {
      activatedThreadIdRef.current = null;
      return;
    }
    if (activatedThreadIdRef.current === activeThreadId) {
      return;
    }
    activatedThreadIdRef.current = activeThreadId;
    if (terminalState.entryPoint !== "terminal") {
      return;
    }
    storeOpenTerminalThreadPage(activeThreadId);
  }, [activeThreadId, storeOpenTerminalThreadPage, terminalState.entryPoint]);

  useEffect(() => {
    if (!terminalWorkspaceOpen) {
      return;
    }

    if (terminalState.workspaceActiveTab === "terminal") {
      requestTerminalFocus();
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusComposer();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    focusComposer,
    requestTerminalFocus,
    terminalState.workspaceActiveTab,
    terminalWorkspaceOpen,
  ]);

  const onInterrupt = useCallback(async () => {
    const activeRun = [...(productReadModel?.runs ?? [])]
      .toReversed()
      .find(
        (run) =>
          run.receipt.receipt.state === "accepted" || run.receipt.receipt.state === "running",
      );
    if (!activeRun || !productReadModel) return;
    await abortProductRun({
      api: readProductNativeApi(),
      conversationId: productReadModel.conversation.id,
      runId: activeRun.id,
      copy: workbenchCopy,
    });
  }, [productReadModel, workbenchCopy]);

  // A rejected interrupt (orchestration dispatch timeout, dead runtime) leaves the
  // UI spinning with no explanation, so the stop affordances report it.
  const onInterruptFromStopControl = useCallback(() => {
    void onInterrupt().catch((error: unknown) => {
      toastManager.add({
        type: "error",
        title: workbenchCopy.productStopFailedTitle,
        description:
          error instanceof Error ? error.message : workbenchCopy.productStopFailedDescription,
      });
    });
  }, [onInterrupt, workbenchCopy]);

  const reportNativeTaskControlUnavailable = useCallback(() => {
    toastManager.add({
      type: "warning",
      title: "Task control is unavailable here",
      description:
        "This control no longer dispatches renderer-owned task commands. Use the active Product Run controls while Native Host task facts are integrated.",
    });
  }, []);
  const onStopWorkflowRun = reportNativeTaskControlUnavailable;

  const onBackgroundSubagentStripItem = useCallback(
    (item: ComposerSubagentStripItem) => {
      void item;
      reportNativeTaskControlUnavailable();
    },
    [reportNativeTaskControlUnavailable],
  );

  // Stop goes through the interrupt seam: on a subagent thread the reactor
  // resolves the tool_use_id and stops that task instead of the whole turn.
  // Target the canonical child id derived from the strip source thread —
  // item.threadId can still be the raw tool_use_id while client-side thread
  // resolution lags, which the server would reject as an unknown thread.
  const onStopSubagentStripItem = useCallback(
    (item: ComposerSubagentStripItem) => {
      void item;
      reportNativeTaskControlUnavailable();
    },
    [reportNativeTaskControlUnavailable],
  );

  // Stop-all fans out through the same per-row stop so both paths share one seam.
  const onStopAllSubagentStripItems = reportNativeTaskControlUnavailable;

  // Ctrl+B parity with the native CLI: send every foreground running subagent to
  // the background at once, fanning through the same per-row background dispatch.
  const onBackgroundAllForegroundSubagentStripItems = reportNativeTaskControlUnavailable;

  // Pause is the same stop command; the persisted flag makes the settled card
  // read as paused (with a resume affordance) instead of plain stopped, across
  // reloads too.
  const onPauseWorkflowRun = reportNativeTaskControlUnavailable;

  const onDismissWorkflowRun = useCallback(() => {
    if (!workflowRunState || !activeThreadId) return;
    const { workflowTaskId } = workflowRunState;
    markWorkflowRunDismissed(activeThreadId, workflowTaskId);
  }, [activeThreadId, markWorkflowRunDismissed, workflowRunState]);

  useEffect(() => {
    if (!isFocusedPane) {
      return;
    }

    const handler = (event: globalThis.KeyboardEvent) => {
      if (!composerFormRef.current?.closest("[data-active-conversation='true']")) return;
      if (!activeThreadId || event.defaultPrevented) return;
      // Mirror terminal interrupt semantics without stealing regular copy shortcuts.
      if (
        hasLiveTurn &&
        isMacPlatform(navigator.platform) &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "c" &&
        eventTargetsComposer(event, composerFormRef.current)
      ) {
        event.preventDefault();
        event.stopPropagation();
        onInterruptFromStopControl();
        return;
      }
      // Ctrl+B mirrors the native CLI: background all foreground running
      // subagents. Literal Ctrl on every platform, but stays out of the
      // terminal, where Ctrl+B is real shell input (readline cursor-back,
      // tmux prefix), and out of text-editing surfaces, where Ctrl+B is the
      // native macOS "move cursor back" binding. Silent no-op (event
      // untouched) when nothing qualifies.
      if (
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "b" &&
        !isTerminalFocused() &&
        !isEditableEventTarget(event) &&
        collectForegroundRunningSubagentStripItems(composerSubagentStripItems).length > 0
      ) {
        event.preventDefault();
        event.stopPropagation();
        void onBackgroundAllForegroundSubagentStripItems();
        return;
      }
      const shortcutContext = {
        terminalFocus: isTerminalFocused(),
        terminalOpen: Boolean(terminalState.terminalOpen),
        terminalWorkspaceOpen,
        terminalWorkspaceTerminalOnly: terminalState.workspaceLayout === "terminal-only",
        terminalWorkspaceTerminalTabActive,
        terminalWorkspaceChatTabActive,
      };

      const command = resolveShortcutCommand(event, keybindings, {
        context: shortcutContext,
      });
      if (!command) return;

      if (command === "composer.focus.toggle") {
        if (isComposerApprovalState || isVoiceRecording || isVoiceTranscribing) return;
        event.preventDefault();
        event.stopPropagation();
        toggleComposerFocus();
        return;
      }

      if (command === "terminal.toggle") {
        event.preventDefault();
        event.stopPropagation();
        toggleTerminalVisibility();
        return;
      }

      if (command === "terminal.split" || command === "terminal.splitRight") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalState.terminalOpen) {
          setTerminalOpen(true);
        }
        splitTerminalRight();
        return;
      }

      if (command === "terminal.splitLeft") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalState.terminalOpen) {
          setTerminalOpen(true);
        }
        splitTerminalLeft();
        return;
      }

      if (command === "terminal.splitDown") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalState.terminalOpen) {
          setTerminalOpen(true);
        }
        splitTerminalDown();
        return;
      }

      if (command === "terminal.splitUp") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalState.terminalOpen) {
          setTerminalOpen(true);
        }
        splitTerminalUp();
        return;
      }

      if (command === "terminal.close") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalState.terminalOpen) return;
        closeTerminal(terminalState.activeTerminalId);
        return;
      }

      if (command === "terminal.new") {
        event.preventDefault();
        event.stopPropagation();
        createTerminalFromShortcut();
        return;
      }

      if (command === "terminal.workspace.newFullWidth") {
        event.preventDefault();
        event.stopPropagation();
        openNewFullWidthTerminal();
        return;
      }

      if (command === "terminal.workspace.closeActive") {
        event.preventDefault();
        event.stopPropagation();
        closeActiveWorkspaceView();
        return;
      }

      if (command === "terminal.workspace.terminal") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalWorkspaceOpen) return;
        setTerminalWorkspaceTab("terminal");
        return;
      }

      if (command === "terminal.workspace.chat") {
        event.preventDefault();
        event.stopPropagation();
        if (!terminalWorkspaceOpen) return;
        setTerminalWorkspaceTab("chat");
        return;
      }

      if (command === "diff.toggle") {
        event.preventDefault();
        event.stopPropagation();
        onToggleDiff();
        return;
      }

      if (command === "git.commitAndPush") {
        if (commitAndPushTriggerRef.current) {
          event.preventDefault();
          event.stopPropagation();
          commitAndPushTriggerRef.current();
          return;
        }
        // No registered trigger inside a git-enabled thread means the action just
        // isn't runnable right now (clean tree, behind upstream, action in flight)
        // — tell the user instead of eating the chord silently. Outside git threads
        // the chord falls through untouched.
        if (showGitActions && isGitRepo) {
          event.preventDefault();
          event.stopPropagation();
          toastManager.add({
            type: "info",
            title: "Nothing to commit or push.",
          });
        }
        return;
      }

      if (command === "browser.toggle") {
        event.preventDefault();
        event.stopPropagation();
        if (!isElectron) return;
        onToggleBrowser();
        return;
      }

      if (command === "chat.split") {
        event.preventDefault();
        event.stopPropagation();
        if (surfaceMode === "single" && onSplitSurface) {
          onSplitSurface();
        }
        return;
      }

      const scriptId = projectScriptIdFromCommand(command);
      if (!scriptId || !activeProject) return;
      const script = activeProject.scripts.find((entry) => entry.id === scriptId);
      if (!script) return;
      event.preventDefault();
      event.stopPropagation();
      void runProjectScript(script);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [
    activeProject,
    terminalState.terminalOpen,
    terminalState.activeTerminalId,
    terminalState.workspaceLayout,
    activeThreadId,
    closeTerminal,
    closeActiveWorkspaceView,
    createTerminalFromShortcut,
    setTerminalOpen,
    openNewFullWidthTerminal,
    runProjectScript,
    keybindings,
    splitTerminalDown,
    splitTerminalLeft,
    splitTerminalRight,
    splitTerminalUp,
    terminalWorkspaceChatTabActive,
    terminalWorkspaceOpen,
    terminalWorkspaceTerminalTabActive,
    onToggleBrowser,
    onToggleDiff,
    onInterruptFromStopControl,
    onSplitSurface,
    showGitActions,
    isGitRepo,
    composerSubagentStripItems,
    onBackgroundAllForegroundSubagentStripItems,
    isFocusedPane,
    hasLiveTurn,
    isComposerApprovalState,
    isVoiceRecording,
    isVoiceTranscribing,
    setTerminalWorkspaceTab,
    surfaceMode,
    scheduleComposerFocus,
    toggleComposerFocus,
    toggleTerminalVisibility,
    activeThread,
  ]);

  // Preserve the original "single mic button" contract:
  // first click starts recording, the next click submits/transcribes.
  const toggleComposerVoiceRecording = useCallback(() => {
    if (isVoiceTranscribing) {
      return;
    }
    if (isVoiceRecording) {
      void submitComposerVoiceRecording();
      return;
    }
    void startComposerVoiceRecording();
  }, [
    isVoiceRecording,
    isVoiceTranscribing,
    startComposerVoiceRecording,
    submitComposerVoiceRecording,
  ]);

  // --- Composer attachment entry points -------------------------------------
  const addComposerImages = useCallback(
    (files: readonly File[]) => {
      if (!activeThreadId || files.length === 0) return;

      if (pendingUserInputs.length > 0) {
        toastManager.add({
          type: "error",
          title: "Attach images after answering plan questions.",
        });
        return;
      }

      enqueueComposerImages(files);
    },
    [activeThreadId, enqueueComposerImages, pendingUserInputs.length],
  );

  const removeComposerImage = (imageId: string) => {
    removeComposerImageFromDraft(imageId);
  };

  const addComposerFiles = useCallback(
    (files: readonly File[]) => {
      if (!activeThreadId || files.length === 0) return;

      if (pendingUserInputs.length > 0) {
        toastManager.add({
          type: "error",
          title: "Attach files after answering plan questions.",
        });
        return;
      }

      const { files: nextFiles, error } = buildComposerFileAttachmentsFromFiles({
        files,
        existingAttachmentCount: effectiveComposerAttachmentCount(
          useComposerDraftStore.getState().draftsByThreadId[activeThreadId],
        ),
      });

      const insertedCount = nextFiles.length > 0 ? addComposerFilesToDraft(nextFiles) : 0;
      setThreadError(
        activeThreadId,
        insertedCount < nextFiles.length
          ? `You can attach up to ${CHAT_TURN_MAX_ATTACHMENTS} references per message.`
          : error,
      );
    },
    [activeThreadId, addComposerFilesToDraft, pendingUserInputs.length, setThreadError],
  );

  const removeComposerFile = (fileId: string) => {
    discardPromptHistoryNavigationForComposerMutation();
    removeComposerDraftFile(threadId, fileId);
  };

  const {
    onComposerPaste,
    onComposerDragEnter,
    onComposerDragOver,
    onComposerDragLeave,
    onComposerDrop,
  } = useComposerDropzone({
    addImages: addComposerImages,
    fileSupport: {
      genericFiles: "accept",
      addFiles: addComposerFiles,
    },
    appendReferenceText: (referenceText) => appendComposerPromptText(threadId, referenceText),
    appendPathMentions: (paths) => {
      for (const absolutePath of paths) {
        appendComposerPromptText(threadId, formatComposerMentionToken(absolutePath));
      }
    },
    dragDepthRef,
    focusComposer,
    setIsDragOverComposer,
  });

  const onRevertToTurnCount = useCallback((turnCount: number) => {
    void turnCount;
    toastManager.add({
      type: "warning",
      title: "Conversation rewind is unavailable",
      description:
        "The donor Thread checkpoint command has been retired. Git checkpoints remain available from the Diff workbench while Product conversation rewind has no approved contract.",
    });
  }, []);

  const onUndoTurnFiles = useCallback((turnCounts: readonly number[]) => {
    void turnCounts;
    toastManager.add({
      type: "warning",
      title: "Undo from the Diff workbench",
      description:
        "Per-turn file undo is unavailable until Product entries have a checkpoint binding. Review and restore files from the Diff workbench instead.",
    });
  }, []);
  const clearComposerInput = useCallback(
    (threadId: ThreadId) => {
      promptHistoryNavigationRef.current = null;
      applyingPromptHistoryNavigationRef.current = false;
      expectedPromptHistoryPromptRef.current = null;
      promptRef.current = "";
      setRestoredQueuedSourceProposedPlan(threadId, null);
      clearComposerDraftContent(threadId);
      updateSelectedComposerSkills([]);
      updateSelectedComposerMentions([]);
      setComposerHighlightedItemId(null);
      setComposerCursor(0);
      setComposerTrigger(null);
    },
    [
      clearComposerDraftContent,
      setRestoredQueuedSourceProposedPlan,
      updateSelectedComposerMentions,
      updateSelectedComposerSkills,
    ],
  );

  const createAutomationFromForm = useCallback(
    async (input: {
      readonly form: AutomationFormState;
      readonly warnings: readonly AutomationDraftWarning[];
      readonly acknowledgedWarningIds: ReadonlySet<AutomationDraftWarningId>;
      readonly activityThreadId?: ThreadId | null;
    }): Promise<boolean> => {
      const api = readNativeApi();
      if (!api || !activeProject) {
        return false;
      }
      if (automationDraftSubmittingRef.current) {
        return false;
      }
      if (!isFormSubmittable(input.form)) {
        return false;
      }
      if (hasBlockingAutomationDraftWarnings(input.warnings, input.acknowledgedWarningIds)) {
        return false;
      }
      const acknowledgedRisks = acknowledgedRiskIdsForDraft(
        input.warnings,
        input.acknowledgedWarningIds,
      );
      const activityThreadId =
        input.activityThreadId ?? (isServerThread ? (activeThread?.id ?? null) : null);
      const automationInput = createInputFromForm(input.form, acknowledgedRisks, activityThreadId);
      automationDraftSubmittingRef.current = true;
      setIsAutomationDraftSubmitting(true);
      return await (async () => {
        const definition = await api.automation.create(automationInput);
        void queryClient.invalidateQueries({ queryKey: automationQueryKey });
        clearComposerInput(activeThread?.id ?? threadId);
        resetAutomationDraftState();
        toastManager.add({
          type: "success",
          title: "Automation created",
          description: `${definition.name} - ${formatCadence(definition.schedule)}`,
        });
        return true;
      })()
        .catch((error: unknown) => {
          toastManager.add({
            type: "error",
            title: "Could not create automation",
            description:
              error instanceof Error ? error.message : "OmniMind could not save the automation.",
          });
          return false;
        })
        .finally(() => {
          automationDraftSubmittingRef.current = false;
          setIsAutomationDraftSubmitting(false);
        });
    },
    [
      activeProject,
      activeThread,
      automationDraftSubmittingRef,
      clearComposerInput,
      isServerThread,
      queryClient,
      resetAutomationDraftState,
      setIsAutomationDraftSubmitting,
      threadId,
    ],
  );

  const ensureAutomationTargetThread = useCallback(
    async (input: { readonly titleSeed: string }): Promise<ThreadId | null> => {
      const api = readNativeApi();
      if (!api || !activeProject || !activeThread) {
        toastManager.add({
          type: "warning",
          title: "Chat required",
          description: "Open a chat before creating a chat-bound automation.",
        });
        return null;
      }
      if (isServerThread) {
        return activeThread.id;
      }

      const title = buildPromptThreadTitleFallback(input.titleSeed || GENERIC_CHAT_THREAD_TITLE);
      // Nested function so the `try` body holds no value blocks — see the comment on
      // `deleteEmptyTerminalThread` above for why React Compiler requires this shape.
      const promoteDraftForAutomation = async (): Promise<ThreadId | null> => {
        const result = await promoteThreadCreate({
          threadId: activeThread.id,
          projectId: activeProject.id,
          title,
          worktreePath: activeThread.worktreePath ?? null,
          workingDirectory: activeThread.workingDirectory ?? null,
          createdAt: activeThread.createdAt,
        });
        if (result === "unavailable") {
          toastManager.add({
            type: "error",
            title: "Could not create chat",
            description: "OmniMind could not promote this draft before saving the automation.",
          });
          return null;
        }

        const inheritedProjectInstructions =
          useProjectInstructionsStore.getState().instructionsByProjectId[activeProject.id] ?? "";
        const inheritedThreadNotes = mergeProjectInstructionsIntoThreadNotes({
          threadNotes,
          projectInstructions: inheritedProjectInstructions,
        });
        if (inheritedThreadNotes !== threadNotes && inheritedThreadNotes.trim().length > 0) {
          void dispatchThreadNotes(activeThread.id, inheritedThreadNotes).catch(() => undefined);
        }

        return activeThread.id;
      };

      try {
        return await promoteDraftForAutomation();
      } catch (error) {
        toastManager.add({
          type: "error",
          title: "Could not create chat",
          description:
            error instanceof Error
              ? error.message
              : "OmniMind could not promote this draft before saving the automation.",
        });
        return null;
      }
    },
    [activeProject, activeThread, activeThreadAssociatedWorktree, isServerThread, threadNotes],
  );

  const prepareAutomationFormForCreate = useCallback(
    async (
      form: AutomationFormState,
    ): Promise<{
      readonly form: AutomationFormState;
      readonly activityThreadId: ThreadId | null;
    } | null> => {
      const activityThreadId = isServerThread ? (activeThread?.id ?? null) : null;
      if (!automationRequiresTargetThread(form.mode) || !activeThread) {
        return { form, activityThreadId };
      }
      if (isServerThread || form.targetThreadId !== activeThread.id) {
        return { form, activityThreadId };
      }

      // Draft review can keep the local draft ID in the form; promote it only when
      // the automation is actually submitted so cancelling review leaves no empty thread.
      const targetThreadId = await ensureAutomationTargetThread({
        titleSeed: form.prompt || form.name,
      });
      if (!targetThreadId) {
        return null;
      }
      return {
        form: { ...form, targetThreadId },
        activityThreadId: targetThreadId,
      };
    },
    [activeThread, ensureAutomationTargetThread, isServerThread],
  );

  const updateAutomationFromForm = useCallback(
    async (input: {
      readonly definition: AutomationDefinition;
      readonly form: AutomationFormState;
      readonly warnings: readonly AutomationDraftWarning[];
      readonly acknowledgedWarningIds: ReadonlySet<AutomationDraftWarningId>;
    }): Promise<boolean> => {
      if (automationDraftSubmittingRef.current) {
        return false;
      }
      if (!isFormSubmittable(input.form)) {
        return false;
      }
      if (hasBlockingAutomationDraftWarnings(input.warnings, input.acknowledgedWarningIds)) {
        return false;
      }
      const acknowledgedRisks = acknowledgedRiskIdsForFormWarnings(
        input.warnings,
        input.acknowledgedWarningIds,
      );
      automationDraftSubmittingRef.current = true;
      setIsAutomationDraftSubmitting(true);
      return await (async () => {
        const updated = await automationUpdateMutation.mutateAsync(
          updateInputFromForm(input.definition, input.form, acknowledgedRisks),
        );
        resetAutomationDraftState();
        toastManager.add({
          type: "success",
          title: "Automation updated",
          description: `${updated.name} - ${formatCadence(updated.schedule)}`,
        });
        return true;
      })()
        .catch(() => false)
        .finally(() => {
          automationDraftSubmittingRef.current = false;
          setIsAutomationDraftSubmitting(false);
        });
    },
    [
      automationDraftSubmittingRef,
      automationUpdateMutation,
      resetAutomationDraftState,
      setIsAutomationDraftSubmitting,
    ],
  );

  const submitAutomationDraft = useCallback(async () => {
    if (!automationDraftForm) {
      return;
    }
    if (automationEditingDefinition) {
      await updateAutomationFromForm({
        definition: automationEditingDefinition,
        form: automationDraftForm,
        warnings: automationDraftWarnings,
        acknowledgedWarningIds: acknowledgedAutomationWarnings,
      });
      return;
    }
    if (
      !isFormSubmittable(automationDraftForm) ||
      hasBlockingAutomationDraftWarnings(automationDraftWarnings, acknowledgedAutomationWarnings)
    ) {
      return;
    }
    const preparedCreate = await prepareAutomationFormForCreate(automationDraftForm);
    if (!preparedCreate) {
      return;
    }
    await createAutomationFromForm({
      form: preparedCreate.form,
      warnings: automationDraftWarnings,
      acknowledgedWarningIds: acknowledgedAutomationWarnings,
      activityThreadId: preparedCreate.activityThreadId,
    });
  }, [
    acknowledgedAutomationWarnings,
    automationEditingDefinition,
    automationDraftForm,
    automationDraftWarnings,
    createAutomationFromForm,
    prepareAutomationFormForCreate,
    updateAutomationFromForm,
  ]);

  const restoreQueuedTurnToComposer = useCallback(
    (queuedTurn: WorkbenchQueuedTurn) => {
      if (!activeThread) {
        return;
      }
      const nextPrompt = queuedTurn.kind === "chat" ? queuedTurn.prompt : queuedTurn.text;
      const restoredImages =
        queuedTurn.kind === "chat" ? queuedTurn.images.map(cloneComposerImageAttachment) : [];
      const restoredFiles = queuedTurn.kind === "chat" ? queuedTurn.files : [];
      const restoredAssistantSelections =
        queuedTurn.kind === "chat" ? queuedTurn.assistantSelections : [];
      const restoredBrowserAnnotations =
        queuedTurn.kind === "chat" ? queuedTurn.browserAnnotations : [];
      const restoredFileComments = queuedTurn.kind === "chat" ? queuedTurn.fileComments : [];
      promptRef.current = nextPrompt;
      clearComposerDraftContent(activeThread.id);
      setComposerDraftPrompt(activeThread.id, nextPrompt);
      // Editing a queued turn should recreate the same draft state the user queued.
      setDraftThreadContext(activeThread.id, {
        runtimeMode: queuedTurn.runtimeMode,
        ...("requestedSelection" in queuedTurn
          ? {}
          : { interactionMode: queuedTurn.interactionMode }),
        ...(queuedTurn.kind === "chat" ? { envMode: queuedTurn.envMode } : {}),
      });
      if (queuedTurn.kind === "chat") {
        if (restoredImages.length > 0) {
          addComposerImagesToDraft(restoredImages);
        }
        if (restoredFiles.length > 0) {
          addComposerFilesToDraft(restoredFiles);
        }
        for (const selection of restoredAssistantSelections) {
          addComposerAssistantSelectionToDraft(selection);
        }
        if (restoredBrowserAnnotations.length > 0) {
          addComposerDraftBrowserAnnotations(activeThread.id, restoredBrowserAnnotations);
        }
        for (const comment of restoredFileComments) {
          addComposerFileCommentToDraft(comment);
        }
        if (queuedTurn.terminalContexts.length > 0) {
          addComposerTerminalContextsToDraft(queuedTurn.terminalContexts);
        }
        if (queuedTurn.pastedTexts.length > 0) {
          addComposerPastedTextsToDraft(queuedTurn.pastedTexts);
        }
        updateSelectedComposerSkills(queuedTurn.skills);
        updateSelectedComposerMentions(queuedTurn.mentions);
      } else {
        updateSelectedComposerSkills([]);
        updateSelectedComposerMentions([]);
      }
      setRestoredQueuedSourceProposedPlan(
        activeThread.id,
        queuedTurn.kind === "chat" &&
          "sourceProposedPlan" in queuedTurn &&
          queuedTurn.sourceProposedPlan
          ? {
              threadId: activeThread.id,
              restoredPrompt: nextPrompt,
              sourceProposedPlan: queuedTurn.sourceProposedPlan,
            }
          : null,
      );
      if ("requestedSelection" in queuedTurn) {
        setProductRequestedSelection(queuedTurn.requestedSelection);
      } else {
        setComposerDraftModelSelection(activeThread.id, queuedTurn.modelSelection);
      }
      setComposerDraftRuntimeMode(activeThread.id, queuedTurn.runtimeMode);
      if (!("requestedSelection" in queuedTurn)) {
        setComposerDraftInteractionMode(activeThread.id, queuedTurn.interactionMode);
      }
      setComposerCursor(collapseExpandedComposerCursor(nextPrompt, nextPrompt.length));
      setComposerTrigger(detectComposerTrigger(nextPrompt, nextPrompt.length));
      scheduleComposerFocus();
    },
    [
      activeThread,
      addComposerAssistantSelectionToDraft,
      addComposerDraftBrowserAnnotations,
      addComposerFileCommentToDraft,
      addComposerFilesToDraft,
      addComposerImagesToDraft,
      addComposerTerminalContextsToDraft,
      addComposerPastedTextsToDraft,
      clearComposerDraftContent,
      scheduleComposerFocus,
      setDraftThreadContext,
      setRestoredQueuedSourceProposedPlan,
      setComposerDraftInteractionMode,
      setComposerDraftModelSelection,
      setComposerDraftPrompt,
      setComposerDraftRuntimeMode,
      updateSelectedComposerMentions,
      updateSelectedComposerSkills,
    ],
  );

  const removeQueuedComposerTurn = useCallback(
    (queuedTurnId: string) => {
      if (productReadModel) {
        const item = productReadModel.queue.find((candidate) => candidate.id === queuedTurnId);
        if (!item) return;
        void deleteProductQueueItem({
          api: readProductNativeApi(),
          conversationId: productConversationId,
          item,
        })
          .then((snapshot) => {
            setProductConversationSnapshot(snapshot);
            if (productQueueEdit?.id === item.id) setProductQueueEdit(null);
          })
          .catch((error: unknown) => {
            setThreadError(
              threadId,
              error instanceof Error ? error.message : workbenchCopy.queueDeleteError,
            );
          });
        return;
      }
      removeQueuedComposerTurnFromDraft(threadId, queuedTurnId);
    },
    [
      productConversationId,
      productQueueEdit?.id,
      productReadModel,
      removeQueuedComposerTurnFromDraft,
      setProductConversationSnapshot,
      setThreadError,
      threadId,
      workbenchCopy.queueDeleteError,
    ],
  );

  const sendProductConversation = async (
    e?: { preventDefault: () => void },
    queuedTurn?: QueuedComposerChatTurn,
    requestedDispatchMode: "queue" | "steer" = "queue",
  ): Promise<boolean> => {
    e?.preventDefault();
    if (
      !activeThread ||
      isSendBusy ||
      isConnecting ||
      isVoiceTranscribing ||
      sendPreflightInFlightRef.current ||
      sendInFlightRef.current
    ) {
      return false;
    }

    const liveComposerSnapshot =
      queuedTurn === undefined ? (composerEditorRef.current?.readSnapshot() ?? null) : null;
    const liveDraft = useComposerDraftStore.getState().draftsByThreadId[activeThread.id];
    const livePrompt = queuedTurn?.prompt ?? liveComposerSnapshot?.value ?? promptRef.current;
    const text = (
      livePrompt.trim().length > 0 ? livePrompt : (liveDraft?.prompt ?? promptRef.current)
    ).trim();
    const hasUnsupportedContext = queuedTurn
      ? queuedTurn.images.length > 0 ||
        queuedTurn.files.length > 0 ||
        queuedTurn.assistantSelections.length > 0 ||
        queuedTurn.browserAnnotations.length > 0 ||
        queuedTurn.terminalContexts.length > 0 ||
        queuedTurn.fileComments.length > 0 ||
        queuedTurn.pastedTexts.length > 0 ||
        queuedTurn.skills.length > 0 ||
        queuedTurn.mentions.length > 0
      : Boolean(
          liveDraft &&
          (liveDraft.images.length > 0 ||
            liveDraft.files.length > 0 ||
            liveDraft.assistantSelections.length > 0 ||
            liveDraft.browserAnnotations.length > 0 ||
            liveDraft.terminalContexts.length > 0 ||
            liveDraft.fileComments.length > 0 ||
            liveDraft.pastedTexts.length > 0 ||
            liveDraft.skills.length > 0 ||
            liveDraft.mentions.length > 0),
        );
    if (text.length === 0) return false;
    if (hasUnsupportedContext) {
      setThreadError(
        activeThread.id,
        "Product Conversations currently accept text only. Your draft and references were preserved.",
      );
      return false;
    }

    const threadIdForSend = activeThread.id;
    const messageId = newMessageId();
    const observedAt = new Date().toISOString();
    const productApi = readProductNativeApi();
    const activeProductRun = [...(productReadModel?.runs ?? [])]
      .toReversed()
      .find(
        (run) =>
          run.receipt.receipt.state === "accepted" || run.receipt.receipt.state === "running",
      );
    const unresolvedProductRun = [...(productReadModel?.runs ?? [])]
      .toReversed()
      .find(
        (run) =>
          run.receipt.receipt.state === "delivery_unknown" ||
          run.receipt.receipt.state === "outcome_unknown",
      );
    if (requestedDispatchMode === "steer" && activeProductRun) {
      try {
        const result = await productApi.controlRun({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: productConversationId,
          runId: activeProductRun.id,
          control: "steer",
          text,
        });
        if (result.result !== "applied") {
          raiseProductOperationError(
            new Error(productControlFailureMessage(result, workbenchCopy)),
          );
        }
        if (queuedTurn === undefined) clearComposerInput(threadIdForSend);
        scheduleComposerFocus();
        return true;
      } catch (error) {
        setThreadError(
          threadIdForSend,
          error instanceof Error ? error.message : workbenchCopy.productControlUnsupported,
        );
        return false;
      }
    }
    const freshRuntimeCatalog = await productApi
      .getShellSnapshot()
      .then((snapshot) => {
        setProductShellSnapshot(snapshot);
        return snapshot.runtimeCatalog;
      })
      .catch(() => null);
    const productWorkspaceRoot =
      resolvedThreadWorkingDirectory ?? resolvedThreadWorktreePath ?? activeProject?.cwd ?? null;
    const executionTarget =
      isChatProductSurface || !productWorkspaceRoot
        ? null
        : {
            kind: "local" as const,
            targetRef: productWorkspaceRoot,
            observedAt,
          };
    const workspace =
      isChatProductSurface || executionTarget === null
        ? {
            kind: "chat" as const,
            managedDirectory: null,
            primaryFolder: null,
            executionTarget: null,
            writeAuthority: "read-only-references" as const,
          }
        : activeProject?.kind === "project" || resolvedThreadWorkingDirectory !== null
          ? {
              kind: "folder-backed" as const,
              managedDirectory: null,
              primaryFolder: executionTarget.targetRef,
              executionTarget,
              writeAuthority: "primary-folder" as const,
            }
          : {
              kind: "managed" as const,
              managedDirectory: executionTarget.targetRef,
              primaryFolder: null,
              executionTarget,
              writeAuthority: "managed-directory" as const,
            };
    const requestedRuntimeModel = productRuntimeModelId
      ? (freshRuntimeCatalog?.models.find((model) => model.id === productRuntimeModelId) ?? null)
      : null;
    const requestedThinking = productRuntimeThinking;
    const requestedSelection: ProductRequestedSelection = (() => {
      const policy = {
        permissionPolicy: "approval-required" as const,
        enforcement: "unverified" as const,
        executionTarget,
      };
      if (!freshRuntimeCatalog) {
        return {
          state: "unavailable",
          reason: "catalog-unavailable",
          requestedRuntimeModelId: productRuntimeModelId,
          ...policy,
        };
      }
      if (!productRuntimeModelId) {
        return {
          state: "unavailable",
          reason: "model-not-selected",
          requestedRuntimeModelId: null,
          ...policy,
        };
      }
      if (!requestedRuntimeModel || !requestedRuntimeModel.available) {
        return {
          state: "unavailable",
          reason: requestedRuntimeModel?.auth === "missing" ? "auth-missing" : "model-unavailable",
          requestedRuntimeModelId: productRuntimeModelId,
          ...policy,
        };
      }
      if (requestedRuntimeModel.auth !== "configured") {
        return {
          state: "unavailable",
          reason: requestedRuntimeModel.auth === "missing" ? "auth-missing" : "model-unavailable",
          requestedRuntimeModelId: productRuntimeModelId,
          ...policy,
        };
      }
      if (
        requestedThinking !== null &&
        !requestedRuntimeModel.thinkingLevels.includes(
          requestedThinking as (typeof requestedRuntimeModel.thinkingLevels)[number],
        )
      ) {
        return {
          state: "unavailable",
          reason: "thinking-unsupported",
          requestedRuntimeModelId: productRuntimeModelId,
          ...policy,
        };
      }
      return {
        state: "selected",
        engineId: freshRuntimeCatalog.engineId,
        runtimeModelId: requestedRuntimeModel.id,
        thinking: requestedThinking,
        packageGeneration: freshRuntimeCatalog.packageGeneration,
        ...policy,
      };
    })();
    const proposedQueuePutInput = {
      protocolVersion: PRODUCT_PROTOCOL_VERSION,
      conversationId: productConversationId,
      itemId: productQueueEdit?.id ?? ProductQueueItemId.makeUnsafe(messageId),
      text,
      requestedSelection,
      resources: [],
      expectedRevision: productQueueEdit?.revision ?? null,
    } as const;
    const queuePutInput = prepareProductQueueTransferAttempt(
      liveDraft?.productQueueTransfer ?? null,
      proposedQueuePutInput,
    );

    const finishDraftClear = (): boolean => {
      if (queuedTurn !== undefined) return false;
      const cleared = clearComposerContentForProductQueueTransfer(threadIdForSend, queuePutInput, {
        preservePreviewUrls: true,
      });
      if (!cleared) return false;
      promptHistoryNavigationRef.current = null;
      applyingPromptHistoryNavigationRef.current = false;
      expectedPromptHistoryPromptRef.current = null;
      promptRef.current = "";
      setComposerHighlightedItemId(null);
      setComposerCursor(0);
      setComposerTrigger(null);
      scheduleComposerFocus();
      return true;
    };

    sendInFlightRef.current = true;
    beginLocalDispatch({ expectedUserMessageId: messageId });
    setThreadError(threadIdForSend, null);
    try {
      ensureProductConversationRetained();
      try {
        setProductConversationSnapshot(
          await productApi.getConversationSnapshot({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: productConversationId,
          }),
        );
      } catch (error) {
        if (!isProductConversationNotFound(error)) raiseProductOperationError(error);
        setProductConversationSnapshot(
          await createProductConversationWithRecovery(
            {
              protocolVersion: PRODUCT_PROTOCOL_VERSION,
              conversationId: productConversationId,
              workspaceId: ProductWorkspaceId.makeUnsafe(`${threadIdForSend}:workspace`),
              title: buildPromptThreadTitleFallback(text),
              workspace,
            },
            productApi,
          ),
        );
      }

      const queueItem = await confirmProductQueueOwnershipBeforeDraftClear({
        attempted: queuePutInput,
        stageTransferMarker: (input) => stageComposerProductQueueTransfer(threadIdForSend, input),
        putQueueItem: (input) => productApi.putQueueItem(input),
        getConversationSnapshot: () =>
          productApi.getConversationSnapshot({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: productConversationId,
          }),
        publishQueueItem: setProductQueueItem,
        publishSnapshot: setProductConversationSnapshot,
        clearDraftIfTransferMatches: finishDraftClear,
      });
      setProductQueueEdit(null);

      if (activeProductRun) {
        sendInFlightRef.current = false;
        resetLocalDispatch();
        return true;
      }
      if (unresolvedProductRun) {
        setThreadError(threadIdForSend, workbenchCopy.productRunUnresolved);
        sendInFlightRef.current = false;
        resetLocalDispatch();
        return true;
      }
      if (requestedSelection.state === "unavailable") {
        setThreadError(threadIdForSend, workbenchCopy.productModelRequired);
        sendInFlightRef.current = false;
        resetLocalDispatch();
        return true;
      }
      if (!canDispatchProductSubmission(useSystemHealthStore.getState().snapshot)) {
        sendInFlightRef.current = false;
        resetLocalDispatch();
        return true;
      }
      const entryId = ProductEntryId.makeUnsafe(messageId);
      try {
        const submitted = await productApi.submitQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: productConversationId,
          itemId: queueItem.id,
          expectedRevision: queueItem.revision,
          entryId,
          runId: ProductRunId.makeUnsafe(randomUUID()),
          dispatchId: ProductDispatchId.makeUnsafe(randomUUID()),
          receiptId: ProductOperationReceiptId.makeUnsafe(randomUUID()),
        });
        setProductConversationSnapshot(submitted.snapshot);
      } catch (error) {
        const recovered = await productApi
          .getConversationSnapshot({
            protocolVersion: PRODUCT_PROTOCOL_VERSION,
            conversationId: productConversationId,
          })
          .catch(() => null);
        if (!productSnapshotIncludesEntry(recovered, entryId)) {
          raiseProductOperationError(error);
        }
        setProductConversationSnapshot(recovered);
      }
      sendInFlightRef.current = false;
      resetLocalDispatch();
      return true;
    } catch (error) {
      sendInFlightRef.current = false;
      resetLocalDispatch();
      setThreadError(
        threadIdForSend,
        error instanceof Error ? error.message : workbenchCopy.queuePutError,
      );
      return false;
    }
  };

  const onSend = async (
    e?: { preventDefault: () => void },
    requestedDispatchMode?: "queue" | "steer",
    queuedTurn?: QueuedComposerChatTurn,
  ): Promise<boolean> => {
    const dispatchMode =
      requestedDispatchMode ??
      resolveFollowUpDispatchMode({
        behavior: settings.followUpBehavior,
        hasLiveTurn,
      });
    return sendProductConversation(e, queuedTurn, dispatchMode);
  };
  const onMoveProductQueueItemNext = useCallback(
    async (queuedTurn: WorkbenchQueuedTurn) => {
      if (!productReadModel) return;
      try {
        const snapshot = await moveProductQueueItemNext({
          api: readProductNativeApi(),
          conversationId: productConversationId,
          queue: productReadModel.queue,
          itemId: queuedTurn.id,
        });
        if (snapshot) setProductConversationSnapshot(snapshot);
      } catch (error) {
        setThreadError(
          threadId,
          error instanceof Error ? error.message : workbenchCopy.queueReorderError,
        );
      }
    },
    [
      productConversationId,
      productReadModel,
      setProductConversationSnapshot,
      setThreadError,
      threadId,
      workbenchCopy.queueReorderError,
    ],
  );

  const onRunProductQueueItemNext = useCallback(
    async (queuedTurn: WorkbenchQueuedTurn) => {
      if (!productReadModel) return;
      const queueItem = productReadModel.queue[0];
      if (!queueItem || queueItem.id !== queuedTurn.id) return;
      if (hasProductUnresolvedRun) {
        setThreadError(threadId, workbenchCopy.productRunUnresolved);
        return;
      }
      if (hasProductActiveRun) return;
      if (!canDispatchProductSubmission(useSystemHealthStore.getState().snapshot)) {
        setThreadError(threadId, workbenchCopy.executionUnavailableDescription);
        return;
      }
      try {
        const result = await readProductNativeApi().submitQueueItem({
          protocolVersion: PRODUCT_PROTOCOL_VERSION,
          conversationId: productConversationId,
          itemId: queueItem.id,
          expectedRevision: queueItem.revision,
          entryId: ProductEntryId.makeUnsafe(randomUUID()),
          runId: ProductRunId.makeUnsafe(randomUUID()),
          dispatchId: ProductDispatchId.makeUnsafe(randomUUID()),
          receiptId: ProductOperationReceiptId.makeUnsafe(randomUUID()),
        });
        setProductConversationSnapshot(result.snapshot);
      } catch (error) {
        setThreadError(
          threadId,
          error instanceof Error ? error.message : workbenchCopy.queuePutError,
        );
      }
    },
    [
      hasProductActiveRun,
      hasProductUnresolvedRun,
      productConversationId,
      productReadModel,
      setProductConversationSnapshot,
      setThreadError,
      threadId,
      workbenchCopy,
    ],
  );

  const onEditQueuedComposerTurn = useCallback(
    (queuedTurn: WorkbenchQueuedTurn) => {
      const item = productReadModel?.queue.find((candidate) => candidate.id === queuedTurn.id);
      if (!item) return;
      setProductQueueEdit({ id: item.id, revision: item.revision });
      restoreQueuedTurnToComposer(queuedTurn);
    },
    [productReadModel, restoreQueuedTurnToComposer],
  );
  const onCancelProductQueueEdit = useCallback(() => {
    // The restored composer content remains a normal draft. Cancelling only
    // releases the durable Queue item from edit mode, so neither input nor the
    // original Product-owned item is lost.
    setProductQueueEdit(null);
  }, []);

  const onImplementPlanInNewThread = useCallback(() => {
    toastManager.add({
      type: "warning",
      title: "Start implementation from the Product Queue",
      description:
        "The previous renderer-created implementation thread has been retired. Start a new Agent conversation and submit the plan through its Product Queue.",
    });
  }, []);
  const onResumeWorkflowRun = useCallback(() => {
    toastManager.add({
      type: "warning",
      title: "Resume from a Product conversation",
      description:
        "Renderer-side workflow replay has been retired. Open the Agent conversation and submit the resume intent through its Product Queue.",
    });
  }, []);
  const runtimeUsageContextWindow = activeContextWindow;
  const contextWindowSelectionStatus = useMemo(
    () =>
      deriveContextWindowSelectionStatus({
        activeSnapshot: runtimeUsageContextWindow,
        selectedValue: null,
      }),
    [runtimeUsageContextWindow],
  );
  const useSplitComposerPickerControls = isLocalDraftThread && !hasThreadStarted;
  const composerFooterControlsPlan = useMemo(
    () => composerFooterPlanForTier(composerFooterTier, Boolean(runtimeUsageContextWindow)),
    [composerFooterTier, runtimeUsageContextWindow],
  );
  // The displayed labels changed (model switch, effort change, picker layout):
  // recorded overflow widths no longer apply, so reset to the richest tier and
  // let the measured-overflow loop demote again before paint if needed.
  const composerFooterPlanInputsKey = [
    productRuntimeModelId,
    productRuntimeThinking,
    Boolean(runtimeUsageContextWindow),
    useSplitComposerPickerControls,
  ].join(":");
  useLayoutEffect(() => {
    composerFooterDemotionWidthsRef.current = [];
    composerFooterTierRef.current = 0;
    setComposerFooterTier(0);
    composerFooterLayoutSyncRef.current?.();
  }, [composerFooterPlanInputsKey]);
  // After a tier renders, re-measure before paint: a still-overflowing footer
  // demotes another step until it fits (bounded by COMPOSER_FOOTER_MAX_TIER).
  useLayoutEffect(() => {
    composerFooterLayoutSyncRef.current?.();
  }, [composerFooterTier]);
  const composerPickerControls = (
    <ProductRuntimePicker
      catalog={productRuntimeCatalog}
      copy={workbenchCopy}
      modelId={productRuntimeModelId}
      thinking={productRuntimeThinking}
      onModelChange={(modelId) => commitProductRuntimeSelection(modelId)}
      onThinkingChange={(thinking) =>
        productRuntimeModelId
          ? commitProductRuntimeSelection(productRuntimeModelId, thinking)
          : undefined
      }
    />
  );
  const onEnvModeChange = useCallback(
    (mode: DraftThreadEnvMode) => {
      const nextBranch =
        mode === "worktree"
          ? (activeThread?.branch ?? draftThread?.branch ?? activeRootBranch ?? null)
          : (activeThread?.branch ?? draftThread?.branch ?? null);
      if (isLocalDraftThread) {
        setDraftThreadContext(threadId, {
          envMode: mode,
          ...(mode === "local" ? { worktreePath: null } : {}),
          ...(nextBranch ? { branch: nextBranch } : {}),
        });
      }
      scheduleComposerFocus();
    },
    [
      activeThread,
      activeRootBranch,
      draftThread?.branch,
      hasNativeUserMessages,
      isLocalDraftThread,
      scheduleComposerFocus,
      setDraftThreadContext,
      threadId,
    ],
  );

  const moveEmptyDraftToLocalProject = useCallback(
    (
      projectId: ProjectId,
      options?: {
        restoreComposerFocus?: boolean;
      },
    ) => {
      // Project moves reset branch; the previous project's current branch may not exist here.
      moveDraftThreadToProject(threadId, projectId, LOCAL_PROJECT_DRAFT_CONTEXT);
      if (options?.restoreComposerFocus ?? true) {
        scheduleComposerFocus();
      }
    },
    [moveDraftThreadToProject, scheduleComposerFocus, threadId],
  );

  const handleResetWorkspaceToHome = useCallback(async () => {
    // The inline reset action prevents pointer-down from stealing editor focus. Avoid refocusing
    // an already-focused editor: focusAtEnd would move its cursor and schedule a redundant frame.
    // Picker-menu resets still restore focus because the editor is no longer active in that path.
    const restoreComposerFocus = !composerEditorRef.current?.isFocused();
    if (isLocalDraftThread) {
      if (isStudioContainer) {
        setDraftThreadContext(threadId, {
          envMode: "local",
          branch: null,
          worktreePath: null,
          workingDirectory: null,
          lastKnownPr: null,
        });
        if (restoreComposerFocus) {
          scheduleComposerFocus();
        }
        return;
      }
      if (!isHomeChatContainer) {
        await handleNewChat({ fresh: true });
        return;
      }
      setDraftThreadContext(threadId, {
        envMode: "local",
        worktreePath: null,
        workingDirectory: null,
        branch: null,
        lastKnownPr: null,
      });
      if (restoreComposerFocus) {
        scheduleComposerFocus();
      }
      return;
    }

    if (activeThread) {
      setStoreThreadWorkspace(activeThread.id, {
        envMode: "local",
        worktreePath: null,
        ...(isStudioContainer ? { workingDirectory: null } : {}),
      });
    }
    if (restoreComposerFocus) {
      scheduleComposerFocus();
    }
  }, [
    activeThread,
    hasNativeUserMessages,
    handleNewChat,
    isHomeChatContainer,
    isLocalDraftThread,
    isStudioContainer,
    scheduleComposerFocus,
    setDraftThreadContext,
    setStoreThreadWorkspace,
    studioWorkspaceRoot,
    threadId,
  ]);

  const handleSelectWorkspaceRoot = useCallback(
    (workspaceRoot: string) => {
      if (isStudioContainer) {
        if (isLocalDraftThread) {
          setDraftThreadContext(threadId, {
            envMode: "local",
            branch: null,
            worktreePath: null,
            workingDirectory: workspaceRoot,
          });
        } else if (activeThread) {
          setStoreThreadWorkspace(activeThread.id, {
            envMode: "local",
            branch: null,
            worktreePath: null,
            workingDirectory: workspaceRoot,
          });
        }
        scheduleComposerFocus();
        return;
      }
      if (isLocalDraftThread) {
        setDraftThreadContext(threadId, {
          envMode: "worktree",
          worktreePath: workspaceRoot,
        });
        scheduleComposerFocus();
        return;
      }

      if (activeThread) {
        setStoreThreadWorkspace(activeThread.id, {
          envMode: "worktree",
          worktreePath: workspaceRoot,
        });
      }
      scheduleComposerFocus();
    },
    [
      activeThread,
      hasNativeUserMessages,
      isLocalDraftThread,
      isStudioContainer,
      scheduleComposerFocus,
      setDraftThreadContext,
      setStoreThreadWorkspace,
      threadId,
    ],
  );

  const handleSelectProjectForEmptyDraft = useCallback(
    (projectId: ProjectId) => {
      if (!isLocalDraftThread) {
        return;
      }
      const project = useStore
        .getState()
        .projects.find((candidate) => candidate.id === projectId && candidate.kind === "project");
      if (!project) {
        throw new Error("Selected project is not available.");
      }
      if (draftThread?.projectId === projectId) {
        scheduleComposerFocus();
        return;
      }
      moveEmptyDraftToLocalProject(projectId);
    },
    [
      draftThread?.projectId,
      isLocalDraftThread,
      moveEmptyDraftToLocalProject,
      scheduleComposerFocus,
    ],
  );

  const handleCreateProjectFromPickerPath = useCallback(
    async (workspaceRoot: string) => {
      if (!isLocalDraftThread) return;
      setDraftThreadContext(threadId, {
        envMode: "local",
        branch: null,
        worktreePath: null,
        workingDirectory: workspaceRoot,
      });
      scheduleComposerFocus();
    },
    [isLocalDraftThread, scheduleComposerFocus, setDraftThreadContext, threadId],
  );

  const applyPromptReplacement = useCallback(
    (
      rangeStart: number,
      rangeEnd: number,
      replacement: string,
      options?: { expectedText?: string; cursorOffset?: number },
    ): number | false => {
      const currentText = promptRef.current;
      const safeStart = Math.max(0, Math.min(currentText.length, rangeStart));
      const safeEnd = Math.max(safeStart, Math.min(currentText.length, rangeEnd));
      if (
        options?.expectedText !== undefined &&
        currentText.slice(safeStart, safeEnd) !== options.expectedText
      ) {
        return false;
      }
      const next = replaceTextRange(promptRef.current, rangeStart, rangeEnd, replacement);
      let nextCursor = collapseExpandedComposerCursor(next.text, next.cursor);
      // Apply cursor offset if specified (e.g., -1 to position inside parentheses)
      if (options?.cursorOffset !== undefined) {
        nextCursor = Math.max(0, nextCursor + options.cursorOffset);
      }
      promptRef.current = next.text;
      const activePendingQuestion = activePendingProgress?.activeQuestion;
      if (activePendingQuestion && activePendingUserInputKey) {
        const nextDraftAnswer = setPendingUserInputCustomAnswer(
          pendingUserInputAnswersByRequestIdRef.current[activePendingUserInputKey]?.[
            activePendingQuestion.id
          ],
          next.text,
        );
        const nextRequestAnswers = {
          ...pendingUserInputAnswersByRequestIdRef.current[activePendingUserInputKey],
          [activePendingQuestion.id]: nextDraftAnswer,
        };
        pendingUserInputAnswersByRequestIdRef.current = {
          ...pendingUserInputAnswersByRequestIdRef.current,
          [activePendingUserInputKey]: nextRequestAnswers,
        };
        setPendingUserInputAnswersByRequestId((existing) => ({
          ...existing,
          [activePendingUserInputKey]: nextRequestAnswers,
        }));
      } else {
        setPrompt(next.text);
      }
      setComposerCursor(nextCursor);
      setComposerTrigger(
        detectComposerTrigger(next.text, expandCollapsedComposerCursor(next.text, nextCursor)),
      );
      window.requestAnimationFrame(() => {
        composerEditorRef.current?.focusAt(nextCursor);
      });
      return nextCursor;
    },
    [activePendingProgress?.activeQuestion, activePendingUserInputKey, setPrompt],
  );

  const readComposerSnapshot = useCallback((): {
    value: string;
    cursor: number;
    expandedCursor: number;
    selectionCollapsed: boolean;
    terminalContextIds: string[];
  } => {
    const editorSnapshot = composerEditorRef.current?.readSnapshot();
    if (editorSnapshot) {
      return editorSnapshot;
    }
    return {
      value: promptRef.current,
      cursor: composerCursor,
      expandedCursor: expandCollapsedComposerCursor(promptRef.current, composerCursor),
      selectionCollapsed: true,
      terminalContextIds: composerTerminalContexts.map((context) => context.id),
    };
  }, [composerCursor, composerTerminalContexts]);

  const resolveActiveComposerTrigger = useCallback((): {
    snapshot: {
      value: string;
      cursor: number;
      expandedCursor: number;
      selectionCollapsed: boolean;
    };
    trigger: ComposerTrigger | null;
  } => {
    const snapshot = readComposerSnapshot();
    return {
      snapshot,
      trigger: detectComposerTrigger(snapshot.value, snapshot.expandedCursor),
    };
  }, [readComposerSnapshot]);

  // Shared insertion path for picker selections (threads, paths, local folders).
  // Guarantees the replacement
  // is flanked by a leading space when landing next to a non-whitespace char and
  // absorbs an existing trailing space so we don't end up with double spaces.
  const applyComposerTriggerReplacement = useCallback(
    (params: {
      snapshot: { value: string };
      trigger: ComposerTrigger;
      base: string;
      cursorOffset?: number;
      onApplied?: () => void;
    }): number | false => {
      const { snapshot, trigger, base, cursorOffset, onApplied } = params;
      const replacement = ensureLeadingSpaceForReplacement(
        snapshot.value,
        trigger.rangeStart,
        base,
      );
      const replacementRangeEnd = extendReplacementRangeForTrailingSpace(
        snapshot.value,
        trigger.rangeEnd,
        replacement,
      );
      const options: { expectedText: string; cursorOffset?: number } = {
        expectedText: snapshot.value.slice(trigger.rangeStart, replacementRangeEnd),
      };
      if (cursorOffset !== undefined) {
        options.cursorOffset = cursorOffset;
      }
      const applied = applyPromptReplacement(
        trigger.rangeStart,
        replacementRangeEnd,
        replacement,
        options,
      );
      if (applied !== false) {
        onApplied?.();
        setComposerHighlightedItemId(null);
      }
      return applied;
    },
    [applyPromptReplacement],
  );

  // Replaces the active `@...` token with a completed absolute folder mention.
  const handleSelectLocalDirectoryMention = useCallback(
    (absolutePath: string) => {
      const { snapshot, trigger } = resolveActiveComposerTrigger();
      if (!trigger) return;
      applyComposerTriggerReplacement({
        snapshot,
        trigger,
        base: `${formatComposerMentionToken(absolutePath)} `,
      });
    },
    [applyComposerTriggerReplacement, resolveActiveComposerTrigger],
  );

  // Rewrites the active `@...` mention to an absolute folder path with a trailing separator
  // so the local-folder picker stays open and the user can keep browsing by clicking or typing.
  // Paths that need quoting (spaces, parentheses, …) are written as an unclosed
  // `@"...` so detectComposerTrigger keeps matching while the user descends (#351).
  const handleNavigateLocalFolder = useCallback(
    (absolutePath: string) => {
      const { snapshot, trigger } = resolveActiveComposerTrigger();
      if (!trigger) return;
      const separator = absolutePath.includes("\\") ? "\\" : "/";
      const withTrailingSeparator = absolutePath.endsWith(separator)
        ? absolutePath
        : `${absolutePath}${separator}`;
      const base = composerMentionPathNeedsQuoting(withTrailingSeparator)
        ? `@"${withTrailingSeparator}`
        : `@${withTrailingSeparator}`;
      applyComposerTriggerReplacement({ snapshot, trigger, base });
    },
    [applyComposerTriggerReplacement, resolveActiveComposerTrigger],
  );

  const onSelectComposerItem = useCallback(
    (item: ComposerCommandItem) => {
      if (composerSelectLockRef.current) return;
      composerSelectLockRef.current = true;
      window.requestAnimationFrame(() => {
        composerSelectLockRef.current = false;
      });
      const { snapshot, trigger } = resolveActiveComposerTrigger();
      if (!trigger) return;
      if (item.type === "path") {
        applyComposerTriggerReplacement({
          snapshot,
          trigger,
          base: `${formatComposerMentionToken(item.path)} `,
        });
        return;
      }
      if (item.type === "local-root") {
        handleNavigateLocalFolder(localFolderBrowseRootPath ?? "/");
        return;
      }
      if (item.type === "thread") {
        applyComposerTriggerReplacement({
          snapshot,
          trigger,
          base: `${formatComposerMentionToken(item.mention.name)} `,
          onApplied: () => {
            updateSelectedComposerMentions((existing) => {
              const nextMention = item.mention;
              const nextWithoutSameName = existing.filter(
                (mention) => mention.name !== nextMention.name,
              );
              return [...nextWithoutSameName, nextMention];
            });
          },
        });
        return;
      }
    },
    [
      applyComposerTriggerReplacement,
      handleNavigateLocalFolder,
      localFolderBrowseRootPath,
      updateSelectedComposerMentions,
      resolveActiveComposerTrigger,
    ],
  );
  const onComposerMenuItemHighlighted = useCallback((itemId: string | null) => {
    setComposerHighlightedItemId(itemId);
  }, []);
  const nudgeComposerMenuHighlight = useCallback(
    (key: "ArrowDown" | "ArrowUp") => {
      if (composerMenuItems.length === 0) {
        return;
      }
      const highlightedIndex = composerMenuItems.findIndex(
        (item) => item.id === composerHighlightedItemId,
      );
      const normalizedIndex =
        highlightedIndex >= 0 ? highlightedIndex : key === "ArrowDown" ? -1 : 0;
      const offset = key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (normalizedIndex + offset + composerMenuItems.length) % composerMenuItems.length;
      const nextItem = composerMenuItems[nextIndex];
      setComposerHighlightedItemId(nextItem?.id ?? null);
    },
    [composerHighlightedItemId, composerMenuItems],
  );
  const isComposerMenuLoading =
    composerTriggerKind === "mention" &&
    ((mentionTriggerQuery.length > 0 && composerPathQueryDebouncer.state.isPending) ||
      workspaceEntriesQuery.isLoading ||
      workspaceEntriesQuery.isFetching);

  const onPromptChange = useCallback(
    (
      nextPrompt: string,
      nextCursor: number,
      expandedCursor: number,
      cursorAdjacentToMention: boolean,
      terminalContextIds: string[],
    ) => {
      const expectedPromptHistoryPrompt = expectedPromptHistoryPromptRef.current;
      if (expectedPromptHistoryPrompt !== null) {
        if (nextPrompt === expectedPromptHistoryPrompt) {
          expectedPromptHistoryPromptRef.current = null;
        } else {
          // The user edited past the recalled entry: the edited text is the
          // draft now, so the saved pre-browse draft must not be restored.
          promptHistoryNavigationRef.current = null;
          expectedPromptHistoryPromptRef.current = null;
          setComposerDraftPromptHistorySavedDraft(threadId, null);
        }
      } else if (!applyingPromptHistoryNavigationRef.current) {
        const activePromptHistoryNavigation = promptHistoryNavigationRef.current;
        if (
          activePromptHistoryNavigation !== null &&
          !promptStillMatchesActiveHistoryBrowse({
            state: activePromptHistoryNavigation,
            history: promptHistory,
            nextPrompt,
            appliedPrompt: promptHistoryAppliedPromptRef.current,
          })
        ) {
          promptHistoryNavigationRef.current = null;
          setComposerDraftPromptHistorySavedDraft(threadId, null);
        }
      }
      const restoredQueuedSource = restoredQueuedSourceProposedPlanRef.current;
      if (
        restoredQueuedSource?.threadId === threadId &&
        !composerPromptStillMatchesRestoredQueuedDraft(
          restoredQueuedSource.restoredPrompt,
          nextPrompt,
        )
      ) {
        setRestoredQueuedSourceProposedPlan(threadId, null);
      }
      promptRef.current = nextPrompt;
      setPrompt(nextPrompt);
      if (!terminalContextIdListsEqual(composerTerminalContexts, terminalContextIds)) {
        setComposerDraftTerminalContexts(
          threadId,
          syncTerminalContextsByIds(composerTerminalContexts, terminalContextIds),
        );
      }
      setComposerCursor(nextCursor);
      setComposerTrigger(
        cursorAdjacentToMention ? null : detectComposerTrigger(nextPrompt, expandedCursor),
      );
    },
    [
      composerTerminalContexts,
      promptHistory,
      setPrompt,
      setComposerDraftPromptHistorySavedDraft,
      setComposerDraftTerminalContexts,
      setRestoredQueuedSourceProposedPlan,
      threadId,
    ],
  );

  const onComposerCommandKey = (
    key: "ArrowDown" | "ArrowUp" | "Enter" | "Tab" | "Slash",
    event: KeyboardEvent,
  ) => {
    if (key === "Tab" && event.shiftKey && !isProductConversationThread) {
      toggleInteractionMode();
      return true;
    }

    const { snapshot, trigger } = resolveActiveComposerTrigger();
    const menuIsActive = composerMenuOpenRef.current || trigger !== null;
    if (
      key === "Enter" &&
      !event.shiftKey &&
      !menuIsActive &&
      extractChatAutomationInvocation(snapshot.value) !== null
    ) {
      void onSend(
        undefined,
        resolveFollowUpDispatchMode({
          behavior: settings.followUpBehavior,
          hasLiveTurn,
          useOppositeBehavior: event.metaKey || event.ctrlKey,
        }),
      );
      return true;
    }

    if (menuIsActive && isLocalFolderBrowserOpen) {
      if (key === "ArrowDown") {
        localDirectoryMenuRef.current?.moveHighlight("down");
        return true;
      }
      if (key === "ArrowUp") {
        localDirectoryMenuRef.current?.moveHighlight("up");
        return true;
      }
      if (key === "Enter" || key === "Tab") {
        localDirectoryMenuRef.current?.activateHighlighted();
        return true;
      }
    }

    if (menuIsActive) {
      const currentItems = composerMenuItemsRef.current;
      if (key === "ArrowDown" && currentItems.length > 0) {
        nudgeComposerMenuHighlight("ArrowDown");
        return true;
      }
      if (key === "ArrowUp" && currentItems.length > 0) {
        nudgeComposerMenuHighlight("ArrowUp");
        return true;
      }
      if (key === "Tab" || key === "Enter") {
        const selectedItem = activeComposerMenuItemRef.current ?? currentItems[0];
        if (selectedItem) {
          onSelectComposerItem(selectedItem);
          return true;
        }
      }
    }

    if (
      shouldHandlePromptHistoryNavigationKey({
        key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        menuIsActive,
        hasActivePendingProgress: Boolean(activePendingProgress),
        isComposerApprovalState,
        pendingUserInputCount: pendingUserInputs.length,
      })
    ) {
      const direction = key === "ArrowUp" ? "older" : "newer";
      const previousNavigationState = promptHistoryNavigationRef.current;
      const result = resolvePromptHistoryNavigation({
        direction,
        history: promptHistory,
        currentPrompt: snapshot.value,
        // Line-boundary math needs raw string offsets; the collapsed cursor
        // undercounts inline token chips (mentions, links, slash commands).
        currentExpandedCursor: snapshot.expandedCursor,
        selectionCollapsed: snapshot.selectionCollapsed,
        state: previousNavigationState,
      });
      if (result.handled) {
        promptHistoryNavigationRef.current = result.state;
        if (result.state === null) {
          restoreComposerDraftPromptHistorySavedDraft(threadId);
        } else if (previousNavigationState === null) {
          setComposerDraftPromptHistorySavedDraft(
            threadId,
            captureComposerPromptHistorySavedDraft({
              threadId,
              draft: composerDraft,
              prompt: result.state.draft,
            }),
          );
        }
        applyingPromptHistoryNavigationRef.current = true;
        expectedPromptHistoryPromptRef.current = result.prompt;
        promptHistoryAppliedPromptRef.current = result.prompt;
        promptRef.current = result.prompt;
        setPrompt(result.prompt);
        setComposerCursor(collapseExpandedComposerCursor(result.prompt, result.expandedCursor));
        // Recalled text replaces the whole prompt; suppress trigger detection
        // so an entry ending in a mention/slash token cannot pop a menu that
        // would capture the next arrow keypress.
        setComposerTrigger(null);
        window.requestAnimationFrame(() => {
          applyingPromptHistoryNavigationRef.current = false;
        });
        return true;
      }
    }

    if (key === "Enter" && !event.shiftKey) {
      if (promptHistoryNavigationRef.current !== null) {
        // Sending commits the recalled text as the prompt; drop the saved
        // draft here (not just in the send path) so it cannot linger and
        // resurrect a stale draft if the send is rejected.
        promptHistoryNavigationRef.current = null;
        setComposerDraftPromptHistorySavedDraft(threadId, null);
      }
      expectedPromptHistoryPromptRef.current = null;
      void onSend(
        undefined,
        resolveFollowUpDispatchMode({
          behavior: settings.followUpBehavior,
          hasLiveTurn,
          useOppositeBehavior: event.metaKey || event.ctrlKey,
        }),
      );
      return true;
    }
    return false;
  };
  const onExpandTimelineImage = useCallback((preview: ExpandedImagePreview) => {
    setExpandedImage(preview);
  }, []);
  const onScrollToBottom = useCallback(() => {
    isAtEndRef.current = true;
    showScrollDebouncer.current.cancel();
    setShowScrollToBottom(false);
    const target = legendListRef.current;
    if (!target) {
      return;
    }

    const requestId = settledScrollRequestRef.current + 1;
    settledScrollRequestRef.current = requestId;
    settledScrollInFlightRef.current = true;
    programmaticScrollUntilRef.current = performance.now() + 200;
    void scrollTranscriptToSettledEnd({
      target,
      isCurrent: () =>
        settledScrollRequestRef.current === requestId && legendListRef.current === target,
      beforeFinalScroll: () => {
        programmaticScrollUntilRef.current = performance.now() + 200;
      },
    })
      .then((settled) => {
        if (settledScrollRequestRef.current !== requestId) {
          return;
        }
        settledScrollInFlightRef.current = false;
        if (!settled) {
          return;
        }
        isAtEndRef.current = true;
        showScrollDebouncer.current.cancel();
        setShowScrollToBottom(false);
      })
      .catch(() => {
        if (settledScrollRequestRef.current === requestId) {
          settledScrollInFlightRef.current = false;
        }
      });
  }, []);
  const onOpenTurnDiff = useCallback(
    (turnId: TurnId, filePath?: string) => {
      if (diffEnvironmentPending) {
        return;
      }
      if (onOpenTurnDiffPanel) {
        onOpenTurnDiffPanel(turnId, filePath);
        return;
      }
      void navigate({
        to: "/$threadId",
        params: { threadId },
        search: (previous) => {
          const rest = stripDiffSearchParams(previous);
          return filePath
            ? {
                ...rest,
                panel: "diff",
                diff: "1",
                diffTurnId: turnId,
                diffFilePath: filePath,
              }
            : { ...rest, panel: "diff", diff: "1", diffTurnId: turnId };
        },
      });
    },
    [diffEnvironmentPending, navigate, onOpenTurnDiffPanel, threadId],
  );
  const onReviewComposerLiveChanges = useCallback(() => {
    if (!activeTurnLiveDiffState.turnId) {
      return;
    }
    onOpenTurnDiff(activeTurnLiveDiffState.turnId);
  }, [activeTurnLiveDiffState.turnId, onOpenTurnDiff]);
  const onNavigateToThread = useCallback(
    (nextThreadId: ThreadId) => {
      void navigate({
        to: "/$threadId",
        params: { threadId: nextThreadId },
        search: (previous) =>
          isEditorRail
            ? { ...stripDiffSearchParams(previous), view: "editor" }
            : stripDiffSearchParams(previous),
      });
    },
    [isEditorRail, navigate],
  );
  const onOpenAutomation = useCallback(
    (automationId: string) => {
      void navigate({
        to: "/automations/$automationId",
        params: { automationId },
      });
    },
    [navigate],
  );
  const activeProjectIdForNewChat = activeProject?.id ?? null;
  const onNewEditorChat = useCallback(() => {
    if (!activeProjectIdForNewChat) {
      return;
    }
    // Keep the editor workspace view (and any open file) across the new-thread
    // navigation; the default new-thread flow clears all search params.
    void handleNewThread(activeProjectIdForNewChat, undefined, {
      search: (previous) => ({
        ...stripDiffSearchParams(previous),
        view: "editor",
      }),
    });
  }, [activeProjectIdForNewChat, handleNewThread]);
  const onOpenEditorChat = useCallback(
    (nextThreadId: ThreadId) => {
      storeOpenChatThreadPage(nextThreadId);
      onNavigateToThread(nextThreadId);
    },
    [onNavigateToThread, storeOpenChatThreadPage],
  );
  const onOpenEditorTerminal = useCallback(() => {
    if (!activeThreadId) return;
    setTerminalPresentationMode("workspace");
    setTerminalWorkspaceLayout("terminal-only");
    setTerminalWorkspaceTab("terminal");
    requestTerminalFocus();
  }, [
    activeThreadId,
    requestTerminalFocus,
    setTerminalPresentationMode,
    setTerminalWorkspaceLayout,
    setTerminalWorkspaceTab,
  ]);
  const onCloseEditorTerminal = useCallback(() => {
    void closeTerminal(terminalState.activeTerminalId);
  }, [closeTerminal, terminalState.activeTerminalId]);
  const onRevertUserMessage = useCallback(
    (messageId: MessageId) => {
      const targetTurnCount = revertTurnCountByUserMessageId.get(messageId);
      if (typeof targetTurnCount !== "number") {
        return;
      }
      void onRevertToTurnCount(targetTurnCount);
    },
    [onRevertToTurnCount, revertTurnCountByUserMessageId],
  );
  const onRunProjectScriptFromHeader = useCallback(
    (script: ProjectScript) => {
      void runProjectScript(script);
    },
    [runProjectScript],
  );
  const dismissActiveThreadError = useCallback(() => {
    if (!activeThread) return;
    setThreadError(activeThread.id, null);
  }, [activeThread, setThreadError]);
  // Empty state: no active thread
  if (!activeThread) {
    return (
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col text-[var(--color-text-foreground-secondary)]",
          CHAT_BACKGROUND_CLASS_NAME,
        )}
      >
        {!isElectron && (
          <header className={cn(CHAT_SURFACE_HEADER_DIVIDER_CLASS_NAME, "px-3 py-2 md:hidden")}>
            <div className="flex items-center gap-2">
              <SidebarHeaderTrigger className="size-7 shrink-0" />
              <span className="text-sm font-medium text-[var(--color-text-foreground)]">
                Threads
              </span>
            </div>
          </header>
        )}
        {isElectron && (
          <div
            className={cn(
              CHAT_SURFACE_HEADER_ROW_CLASS_NAME,
              "drag-region px-5",
              desktopTopBarTrafficLightGutterClassName,
              desktopTopBarWindowControlsGutterClassName,
            )}
          >
            <SidebarHeaderNavigationControls />
            <span className="text-xs text-muted-foreground/50">No active thread</span>
          </div>
        )}
        {productConversationSummary ? (
          <ProductConversationNotice presentation={productConversationPresentation} />
        ) : null}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm">Select a thread or create a new one to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeThreadDisplayTitle = resolveActiveThreadTitle({
    title: activeThread.title,
    subagentTitle: activeThread.parentThreadId
      ? resolveSubagentPresentationForThread({
          thread: activeThread,
          threads: threadLineageThreads,
        }).fullLabel
      : null,
    isHomeChat: isChatProject,
    isEmpty: timelineEntries.length === 0,
    emptyChatTitle: workbenchCopy.newChat,
  });

  const handleRenameActiveThread = async (newTitle: string) => {
    if (isProductConversationThread) {
      toastManager.add({
        type: "info",
        title: workbenchCopy.renameUnavailableTitle,
        description: workbenchCopy.renameUnavailableDescription,
      });
      return;
    }
    const outcome = await dispatchThreadRename({
      threadId: activeThread.id,
      newTitle,
      unchangedTitles: [activeThread.title],
    }).catch((error) => {
      toastManager.add({
        type: "error",
        title: "Failed to rename thread",
        description: error instanceof Error ? error.message : "An error occurred.",
      });
      throw error;
    });

    if (outcome === "empty") {
      toastManager.add({
        type: "warning",
        title: "Thread title cannot be empty",
      });
      return;
    }
    if (outcome === "unchanged" || outcome === "unavailable") {
      return;
    }
  };

  const relocateComposerLeadingControls = false;
  const renderComposerLeadingControls = (_options: { iconOnly: boolean }) => null;
  const branchToolbarProps = {
    threadId: activeThread.id,
    onEnvModeChange,
    envLocked,
    onHandoffToWorktree,
    onHandoffToLocal,
    handoffBusy,
    onComposerFocusRequest: scheduleComposerFocus,
    ...(isStudioContainer ? { fixedLocalWorkspaceCwd: threadWorkspaceCwd } : {}),
    ...(canCheckoutPullRequestIntoThread
      ? { onCheckoutPullRequestRequest: openPullRequestDialog }
      : {}),
  };
  const showEmptyLandingBranchToolbar =
    !isProductConversationThread &&
    isCenteredEmptyLanding &&
    activeProject?.kind === "project" &&
    !isHomeChatContainer;
  // Temporary is chosen while starting a chat. Draft metadata covers local reloads;
  // the in-memory marker keeps the badge + auto-delete alive through promotion.
  const isThreadTemporary = draftThread?.isTemporary === true || hasTemporaryThreadMarker;
  const toggleDraftTemporary = () => {
    const next = !isThreadTemporary;
    setDraftThreadContext(threadId, { isTemporary: next });
    if (next) {
      markTemporaryThread(threadId);
    } else {
      clearTemporaryThread(threadId);
    }
  };
  const showEmptyLandingProjectPicker =
    isCenteredEmptyLanding && isLocalDraftThread && activeProject?.kind === "project";
  const showContainerChatWorkspacePicker =
    isEmptyChatLanding && isHomeChatContainer && !isChatProductSurface;
  const emptyLandingProjectChip =
    !showContainerChatWorkspacePicker &&
    !showEmptyLandingProjectPicker &&
    activeProjectDisplayName ? (
      <span className="inline-flex min-w-0 max-w-56 shrink items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-[length:var(--app-font-size-ui-sm,11px)] font-normal text-[var(--color-text-foreground-secondary)] sm:max-w-64">
        <FolderClosed className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{activeProjectDisplayName}</span>
      </span>
    ) : null;
  const showEmptyLandingControls =
    isCenteredEmptyLanding &&
    (isEmptyChatLanding ||
      showEmptyLandingProjectPicker ||
      emptyLandingProjectChip !== null ||
      showEmptyLandingBranchToolbar);
  const emptyLandingControls = showEmptyLandingControls ? (
    <div
      className={cn(
        // Full-width tray under the composer that reads as UNITED but not fused: it carries extra
        // top height (pt-6) and is pulled up by that amount (-mt-5 = 20px, just past the
        // --composer-radius ~19px corner). That hidden top slice sits BEHIND the composer's rounded
        // bottom corners (z-0), so its tint fills those corner notches and its straight full-width
        // top edge stays covered by the composer's solid sides — no gap/poke at the sides. The
        // composer keeps its own rounded shape; the tray keeps its tint + rounded bottom.
        "chat-composer-shell relative z-0 -mt-5 flex min-h-8 min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden !rounded-t-none !rounded-b-[var(--composer-radius)] bg-[color-mix(in_srgb,var(--color-background-elevated-secondary)_76%,var(--color-background-surface)_24%)] px-2 pb-1.5 pt-6 transition-colors duration-150 ease-out motion-reduce:transition-none sm:min-h-7",
        COMPOSER_COLUMN_FRAME_CLASS_NAME,
      )}
    >
      {showContainerChatWorkspacePicker ? (
        <ProjectPicker
          align="start"
          side="top"
          triggerClassName="h-7 py-1"
          showResetToHome={Boolean(
            isStudioContainer ? resolvedThreadWorkingDirectory : resolvedThreadWorktreePath,
          )}
          selectedWorkspaceRoot={
            isStudioContainer ? resolvedThreadWorkingDirectory : resolvedThreadWorktreePath
          }
          onSelectWorkspaceRoot={handleSelectWorkspaceRoot}
          onResetToHome={handleResetWorkspaceToHome}
          {...(!isStudioContainer
            ? {
                onSelectProject: handleSelectProjectForEmptyDraft,
                onCreateProjectFromPath: handleCreateProjectFromPickerPath,
              }
            : {})}
        />
      ) : showEmptyLandingProjectPicker ? (
        <ProjectPicker
          align="start"
          side="top"
          triggerClassName="h-7 py-1"
          selectionMode="project"
          selectedProjectId={activeProject.id}
          selectedWorkspaceRoot={activeProject.cwd}
          showResetToHome
          onSelectProject={handleSelectProjectForEmptyDraft}
          onCreateProjectFromPath={handleCreateProjectFromPickerPath}
          onResetToHome={handleResetWorkspaceToHome}
        />
      ) : (
        emptyLandingProjectChip
      )}
      {/* Reserve the Local/branch slot so project selection fades controls in without resizing. */}
      <div
        aria-hidden={showEmptyLandingBranchToolbar ? undefined : true}
        className={cn(
          "flex min-w-0 flex-1 items-center transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
          showEmptyLandingBranchToolbar
            ? "translate-y-0 opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        {showEmptyLandingBranchToolbar ? (
          <BranchToolbar
            {...branchToolbarProps}
            className="mx-0 min-w-0 flex-1 !justify-start !px-0 !pb-0 !pt-0"
            showBranchSelector={isGitRepo}
          />
        ) : null}
      </div>
      {showEmptyLandingBranchToolbar ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={isThreadTemporary}
          onClick={toggleDraftTemporary}
          title={
            isThreadTemporary
              ? "Temporary chat — deleted when you leave. Click to keep it."
              : "Make this a temporary chat (deleted when you leave)"
          }
          aria-label="Temporary chat"
          className={cn(
            "ml-auto shrink-0 gap-1.5 whitespace-nowrap px-2 text-[length:var(--app-font-size-ui-sm,11px)] font-normal transition-colors sm:px-2.5",
            isThreadTemporary
              ? "text-[var(--color-text-accent)] hover:bg-[var(--color-background-button-secondary-hover)] hover:text-[var(--color-text-accent)]"
              : "text-[var(--color-text-foreground-secondary)] hover:bg-[var(--color-background-button-secondary-hover)] hover:text-[var(--color-text-foreground)]",
          )}
        >
          <TemporaryThreadIcon className="size-3.5" />
          <span className="sr-only sm:not-sr-only">Temporary</span>
        </Button>
      ) : null}
    </div>
  ) : null;

  const threadAutomationItems = automationsForThread(
    automationData.definitions,
    activeThread.id,
  ).map((definition) => ({ definition }));

  // Shared inputs for both Environment panel surfaces (the header Popover when the dock is
  // open, and the docked right column when it is closed) so the two never drift.
  const environmentPanelProps: Omit<EnvironmentPanelProps, "open" | "variant"> = {
    gitCwd: threadWorkspaceCwd,
    openInTarget: threadWorkspaceCwd,
    githubRepository: githubRepositoryQuery.data?.repository ?? null,
    githubRepositories: githubRepositoryQuery.data?.repositories ?? [],
    isGitRepo,
    keybindings,
    availableEditors,
    activeThreadId: activeThread.id,
    activeProvider:
      activeThread.session?.provider ??
      (activeThread.runtimeIdentity?.kind === "historical-provider" ? null : null),
    isStudioChat: isStudioContainer,
    studioFolderPath: isStudioContainer ? resolvedThreadWorkingDirectory : null,
    showGitActions,
    diffOpen: resolvedDiffOpen,
    threadAutomations: threadAutomationItems,
    diffDisabledReason,
    diffTotals: repoDiffTotals,
    branchToolbar: branchToolbarProps,
    recap: threadRecap,
    pinnedMessages,
    threadMarkers,
    pinnedMessageTextById,
    markerMessageTextById,
    notes: threadNotes,
    activeProjectId,
    projectInstructions,
    canCopyProjectInstructionsToNotes: !isLocalDraftThread,
    onProjectInstructionsChange: setProjectInstructions,
    onCopyProjectInstructionsToNotes: handleCopyProjectInstructionsToNotes,
    onToggleDiff,
    onOpenAutomation: openAutomationEditDialog,
    onOpenGithubRepository: openBrowserUrl,
    onJumpToPinnedMessage: handleJumpToPinnedMessage,
    onTogglePinnedMessageDone: handleTogglePinnedMessageDone,
    onUnpinMessage: handleUnpinMessage,
    onRenamePinnedMessage: handleRenamePinnedMessage,
    onJumpToThreadMarker: handleJumpToThreadMarker,
    onToggleThreadMarkerDone: handleToggleThreadMarkerDone,
    onRemoveThreadMarker: handleRemoveThreadMarker,
    onRenameThreadMarker: handleRenameThreadMarker,
    onNotesChange: handleNotesChange,
    onOpenEditorView: viewModeAction?.onClick ?? null,
    onClose: closeEnvironmentPanelAfterAction,
    onRegisterCommitAndPushTrigger,
  };
  // Full-width single chat: overlay plus transcript/composer inset. Floating overlay when the
  // column is already narrow — right dock open or a split pane (same as header compact mode).
  // Terminal surfaces always float so opening Environment never resizes the terminal workspace.
  const environmentAppliesContentInset = environmentPanelVisible && !environmentUsesFloatingOverlay;
  const environmentOverlayVariant = environmentUsesFloatingOverlay ? "floating" : "docked";
  const environmentHeaderState = environmentEnabled
    ? {
        open: environmentPanelVisible,
        onOpenChange: setEnvironmentPanelOpenPreference,
      }
    : null;

  const showComposerLiveChangesHeader = latestTurnLive && activeTurnLiveDiffState.hasChanges;
  const showComposerActiveTaskListCard = Boolean(activeTaskList && !planSidebarOpen);
  const showComposerWorkflowRunCard = workflowRunState !== null;
  const showComposerSubagentStrip = composerSubagentStripItems.length > 0;
  // The workflow card already lists its run and member agents, so the generic
  // "N background agents" footer only counts tasks outside the workflow.
  const composerBackgroundTaskCount = workflowRunState
    ? (activeBackgroundTasks?.taskIds.filter((taskId) => !workflowRunState.taskIds.includes(taskId))
        .length ?? 0)
    : (activeBackgroundTasks?.activeCount ?? 0);

  // Composer layout keeps the task list and footer actions in one render path so
  // follow-up prompts and normal chat mode stay visually in sync.
  const renderActiveTaskListCard = (attachedToPrevious: boolean) =>
    activeTaskList && showComposerActiveTaskListCard ? (
      <ComposerActiveTaskListCard
        activeTaskList={activeTaskList}
        backgroundTaskCount={composerBackgroundTaskCount}
        compact={activeTaskListCompact}
        onCompactChange={setActiveTaskListCompact}
        onOpenSidebar={() => setPlanSidebarOpen(true)}
        attachedToPrevious={attachedToPrevious}
      />
    ) : null;

  const composerSection =
    secondaryChromeReady && shouldRenderChatPaneContent ? (
      <div
        className={cn(isCenteredEmptyLanding ? "w-full overflow-visible" : "contents")}
        data-empty-landing-composer-block={isCenteredEmptyLanding ? "true" : undefined}
      >
        <form
          ref={composerFormRef}
          onSubmit={onSend}
          className="relative z-10 w-full overflow-visible"
          data-chat-composer-form="true"
          data-chat-pane-scope={paneScopeId}
        >
          <ComposerColumnFrame>
            {/* A bare wrapper keeps the normal-flow panels' -mb-px seam onto the input shell
                via margin collapse. */}
            <div>
              {showComposerLiveChangesHeader ? (
                <ComposerLiveChangesHeader
                  fileCount={activeTurnLiveDiffState.fileCount}
                  additions={activeTurnLiveDiffState.additions}
                  deletions={activeTurnLiveDiffState.deletions}
                  onReview={
                    activeTurnLiveDiffState.turnId ? onReviewComposerLiveChanges : undefined
                  }
                />
              ) : null}
              {renderActiveTaskListCard(showComposerLiveChangesHeader)}
              {workflowRunState ? (
                <WorkflowRunCard
                  workflowRun={workflowRunState}
                  nowMs={workflowNowMs}
                  compact={workflowRunCardCompact}
                  onCompactChange={setWorkflowRunCardCompact}
                  onOpenThread={onNavigateToThread}
                  onStop={onStopWorkflowRun}
                  onPause={onPauseWorkflowRun}
                  onResume={onResumeWorkflowRun}
                  onDismiss={onDismissWorkflowRun}
                  attachedToPrevious={
                    showComposerLiveChangesHeader || showComposerActiveTaskListCard
                  }
                />
              ) : null}
              {showComposerSubagentStrip ? (
                <ComposerSubagentStrip
                  items={composerSubagentStripItems}
                  compact={subagentStripCompact}
                  onCompactChange={setSubagentStripCompact}
                  onOpenThread={onNavigateToThread}
                  onBackgroundItem={onBackgroundSubagentStripItem}
                  onStopItem={onStopSubagentStripItem}
                  onStopAll={onStopAllSubagentStripItems}
                  attachedToPrevious={
                    showComposerLiveChangesHeader ||
                    showComposerActiveTaskListCard ||
                    showComposerWorkflowRunCard
                  }
                />
              ) : null}
              <ComposerQueuedHeader
                queuedTurns={visibleQueuedComposerTurns}
                primaryAction={{
                  kind: "run-next",
                  disabled: !productReadModel || hasProductActiveRun || hasProductUnresolvedRun,
                  onSelect: onRunProductQueueItemNext,
                  onMoveNext: onMoveProductQueueItemNext,
                }}
                onRemove={removeQueuedComposerTurn}
                onEdit={onEditQueuedComposerTurn}
                editingTurnId={productReadModel ? (productQueueEdit?.id ?? null) : null}
                onCancelEdit={onCancelProductQueueEdit}
                copy={workbenchCopy}
                cwd={threadWorkspaceCwd ?? undefined}
                attachedToPrevious={
                  showComposerLiveChangesHeader ||
                  showComposerActiveTaskListCard ||
                  showComposerWorkflowRunCard ||
                  showComposerSubagentStrip
                }
              />
            </div>
            <div
              className={cn(
                COMPOSER_INPUT_SHELL_CLASS_NAME,
                composerMenuOpen && !isComposerApprovalState && "overflow-visible",
              )}
            >
              <div
                className={cn(
                  COMPOSER_INPUT_SURFACE_CLASS_NAME,
                  composerMenuOpen && !isComposerApprovalState && "overflow-visible",
                )}
              >
                <ComposerInputBanners
                  roundedTopReset={false}
                  planFollowUp={
                    !activePendingApproval &&
                    pendingUserInputs.length === 0 &&
                    showPlanFollowUpPrompt &&
                    activeProposedPlan
                      ? {
                          id: activeProposedPlan.id,
                          title: proposedPlanTitle(activeProposedPlan.planMarkdown) ?? null,
                        }
                      : null
                  }
                  automationSetup={
                    !activePendingApproval &&
                    pendingUserInputs.length === 0 &&
                    pendingAutomationConversation &&
                    pendingAutomationConversation.threadId === threadId
                      ? { onCancel: cancelAutomationConversation }
                      : null
                  }
                />
                <div
                  className={cn(
                    COMPOSER_EDITOR_PADDING_CLASS_NAME,
                    composerMenuOpen && !isComposerApprovalState && "overflow-visible",
                  )}
                >
                  {composerMenuOpen && !isComposerApprovalState ? (
                    <div className={COMPOSER_COMMAND_MENU_FLOATING_WRAPPER_CLASS_NAME}>
                      {isLocalFolderBrowserOpen ? (
                        <ComposerLocalDirectoryMenu
                          mentionQuery={mentionTriggerQuery}
                          rootLabel={localFolderBrowseRootPath ?? "Local folders unavailable"}
                          homeDir={serverConfigQuery.data?.homeDir ?? null}
                          onSelectEntry={(absolutePath) =>
                            handleSelectLocalDirectoryMention(absolutePath)
                          }
                          onNavigateFolder={handleNavigateLocalFolder}
                          handleRef={localDirectoryMenuRef}
                        />
                      ) : (
                        <ComposerCommandMenu
                          items={composerMenuItems}
                          resolvedTheme={resolvedTheme}
                          isLoading={isComposerMenuLoading}
                          triggerKind={effectiveComposerTriggerKind}
                          activeItemId={activeComposerMenuItem?.id ?? null}
                          onHighlightedItemChange={onComposerMenuItemHighlighted}
                          onSelect={onSelectComposerItem}
                        />
                      )}
                    </div>
                  ) : null}
                  {!isComposerApprovalState &&
                    pendingUserInputs.length === 0 &&
                    isPreparingComposerImages && (
                      <div
                        className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground"
                        role="status"
                      >
                        <LoaderCircleIcon className="size-3.5 animate-spin" />
                        Optimizing {pendingComposerImageCount === 1 ? "image" : "images"}…
                      </div>
                    )}
                  {!isComposerApprovalState &&
                    pendingUserInputs.length === 0 &&
                    (composerAssistantSelections.length > 0 ||
                      composerBrowserAnnotations.length > 0 ||
                      composerFileComments.length > 0 ||
                      composerPastedTexts.length > 0 ||
                      composerFiles.length > 0 ||
                      composerImages.length > 0) && (
                      <ComposerReferenceAttachments
                        assistantSelections={composerAssistantSelections}
                        browserAnnotations={composerBrowserAnnotations}
                        fileComments={composerFileComments}
                        pastedTexts={composerPastedTexts}
                        files={composerFiles}
                        images={composerImages}
                        nonPersistedImageIdSet={nonPersistedComposerImageIdSet}
                        onExpandImage={setExpandedImage}
                        onRemoveAssistantSelections={clearComposerAssistantSelectionsFromDraft}
                        onRemoveBrowserAnnotation={removeComposerBrowserAnnotationFromDraft}
                        onRemoveFileComments={clearComposerFileCommentsFromDraft}
                        onRemovePastedText={removeComposerPastedTextFromDraft}
                        onShowPastedTextInField={showComposerPastedTextInField}
                        onRemoveFile={removeComposerFile}
                        onRemoveImage={removeComposerImage}
                      />
                    )}
                  <ComposerPromptEditor
                    ref={composerEditorRef}
                    value={
                      isComposerApprovalState
                        ? ""
                        : activePendingProgress
                          ? activePendingProgress.customAnswer
                          : prompt
                    }
                    cursor={composerCursor}
                    terminalContexts={
                      !isComposerApprovalState && pendingUserInputs.length === 0
                        ? composerTerminalContexts
                        : []
                    }
                    mentionReferences={selectedComposerMentions}
                    onRemoveTerminalContext={removeComposerTerminalContextFromDraft}
                    onChange={onPromptChange}
                    onCommandKeyDown={onComposerCommandKey}
                    onPaste={onComposerPaste}
                    {...(canCollapsePastedTextToDraft
                      ? { onCollapsePastedText: addPastedTextToDraft }
                      : {})}
                    placeholder={
                      isComposerApprovalState
                        ? workbenchCopy.composerApproval
                        : activePendingProgress
                          ? activePendingProgress.activeQuestion?.options.length === 0
                            ? workbenchCopy.composerQuestion
                            : workbenchCopy.composerQuestionWithOptions
                          : showPlanFollowUpPrompt && activeProposedPlan
                            ? workbenchCopy.composerPlanFeedback
                            : activeThread?.parentThreadId
                              ? workbenchCopy.composerSubagent
                              : hasLiveTurn
                                ? workbenchCopy.composerFollowUp
                                : phase === "disconnected"
                                  ? workbenchCopy.composerFollowUpWithAttachments
                                  : workbenchCopy.composerDefault
                    }
                    disabled={isComposerEditorDisabled}
                  />
                </div>
                {/* Bottom toolbar — hidden while an approval takes over the composer,
                    since the approve/decline actions live in the detached approval card
                    floating above (see ComposerPendingApprovalPanel). */}
                {activePendingApproval ? null : (
                  <div
                    data-chat-composer-footer="true"
                    className={cn(
                      "@container",
                      COMPOSER_FOOTER_ROW_CLASS_NAME,
                      isComposerFooterCompact
                        ? "gap-1.5"
                        : "flex-wrap gap-1.5 sm:flex-nowrap sm:gap-0",
                    )}
                  >
                    <div
                      data-chat-composer-leading="true"
                      className={cn(
                        "flex items-center",
                        isVoiceRecording || isVoiceTranscribing
                          ? "min-w-0 shrink-0 gap-1"
                          : isComposerFooterCompact
                            ? "min-w-0 flex-1 gap-1 overflow-hidden"
                            : "min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-w-max sm:overflow-visible",
                      )}
                    >
                      {relocateComposerLeadingControls
                        ? null
                        : renderComposerLeadingControls({ iconOnly: false })}

                      {!isVoiceRecording && !isVoiceTranscribing ? (
                        <>
                          {interactionMode === "plan" ? (
                            <Button
                              variant="ghost"
                              className="shrink-0 whitespace-nowrap px-2 text-[length:var(--app-font-size-ui-sm,11px)] sm:text-[length:var(--app-font-size-ui-sm,11px)] font-normal text-[var(--color-text-foreground-secondary)] hover:bg-[var(--color-background-button-secondary-hover)] hover:text-[var(--color-text-foreground)] sm:px-3"
                              size="sm"
                              type="button"
                              onClick={toggleInteractionMode}
                              title="Plan mode — click to return to normal build mode"
                            >
                              <TaskListIcon className="size-3.5" />
                              <span className="sr-only sm:not-sr-only">Plan</span>
                            </Button>
                          ) : null}

                          {activeTaskList || sidebarProposedPlan || planSidebarOpen ? (
                            <Button
                              variant="ghost"
                              className="shrink-0 whitespace-nowrap px-2 text-[length:var(--app-font-size-ui-sm,11px)] sm:text-[length:var(--app-font-size-ui-sm,11px)] font-normal sm:px-3"
                              size="sm"
                              type="button"
                              onClick={togglePlanSidebar}
                              title={planSidebarToggleTitle}
                              aria-label={planSidebarToggleTitle}
                            >
                              <LayoutSidebarIcon className="size-3.5" />
                              <span className="sr-only sm:not-sr-only">
                                {planSidebarToggleLabel}
                              </span>
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <div
                      data-chat-composer-actions="right"
                      className={cn(
                        "flex items-center gap-2",
                        isVoiceRecording || isVoiceTranscribing ? "min-w-0 flex-1" : "shrink-0",
                      )}
                    >
                      {!isVoiceRecording &&
                      !isVoiceTranscribing &&
                      runtimeUsageContextWindow &&
                      composerFooterControlsPlan.showContextMeter ? (
                        <ContextWindowMeter
                          usage={runtimeUsageContextWindow}
                          {...(activeCumulativeCostUsd != null
                            ? { cumulativeCostUsd: activeCumulativeCostUsd }
                            : {})}
                          {...(contextWindowSelectionStatus.activeLabel !== undefined
                            ? {
                                activeWindowLabel: contextWindowSelectionStatus.activeLabel,
                              }
                            : {})}
                          {...(contextWindowSelectionStatus.pendingSelectedLabel !== undefined
                            ? {
                                pendingWindowLabel:
                                  contextWindowSelectionStatus.pendingSelectedLabel,
                              }
                            : {})}
                        />
                      ) : null}
                      {!isVoiceRecording && !isVoiceTranscribing ? composerPickerControls : null}
                      {showVoiceNotesControl && (isVoiceRecording || isVoiceTranscribing) ? (
                        <ComposerVoiceRecorderBar
                          disabled={isComposerApprovalState || isConnecting || isSendBusy}
                          isRecording={isVoiceRecording}
                          isTranscribing={isVoiceTranscribing}
                          durationLabel={voiceRecordingDurationLabel}
                          waveformLevels={voiceWaveformLevels}
                          onCancel={() => {
                            if (isVoiceRecording) {
                              void submitComposerVoiceRecording();
                              return;
                            }
                            cancelComposerVoiceRecording();
                          }}
                          onSubmit={() => {
                            void submitComposerVoiceRecording();
                          }}
                        />
                      ) : null}
                      {activePendingProgress ? (
                        <Button
                          type="submit"
                          size="sm"
                          className="rounded-full px-4"
                          disabled={
                            activePendingIsResponding ||
                            (activePendingProgress.isLastQuestion
                              ? !activePendingResolvedAnswers
                              : !activePendingProgress.canAdvance)
                          }
                        >
                          {activePendingIsResponding
                            ? "Submitting..."
                            : activePendingProgress.isLastQuestion
                              ? "Submit answers"
                              : "Next question"}
                        </Button>
                      ) : phase === "running" || hasProductActiveRun ? (
                        <Button
                          type="button"
                          variant="prominent"
                          size="icon-xs"
                          className="sm:size-[26px]"
                          onClick={onInterruptFromStopControl}
                          aria-label="Stop generation"
                          title="Stop the current response. On Mac, press Ctrl+C to interrupt."
                        >
                          <span
                            aria-hidden="true"
                            className="block size-2 rounded-[1px] bg-current"
                          />
                        </Button>
                      ) : pendingUserInputs.length === 0 &&
                        !isVoiceRecording &&
                        !isVoiceTranscribing ? (
                        showPlanFollowUpPrompt ? (
                          prompt.trim().length > 0 ? (
                            <Button
                              type="submit"
                              size="sm"
                              className="h-9 rounded-full px-4 sm:h-8"
                              disabled={isSendBusy || isConnecting}
                            >
                              {isConnecting || isSendBusy ? "Sending..." : "Refine"}
                            </Button>
                          ) : (
                            <div className="flex items-center">
                              <Button
                                type="submit"
                                size="sm"
                                className="h-9 rounded-l-full rounded-r-none px-4 sm:h-8"
                                disabled={isSendBusy || isConnecting}
                              >
                                {isConnecting || isSendBusy ? "Sending..." : "Implement"}
                              </Button>
                              <Menu>
                                <MenuTrigger
                                  render={
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-9 rounded-l-none rounded-r-full border-l-white/12 px-2 sm:h-8"
                                      aria-label="Implementation actions"
                                      disabled={isSendBusy || isConnecting}
                                    />
                                  }
                                >
                                  <ChevronDownIcon className="size-3.5" />
                                </MenuTrigger>
                                <ComposerPickerMenuPopup align="end" side="top">
                                  <MenuItem
                                    disabled={isSendBusy || isConnecting}
                                    onClick={() => void onImplementPlanInNewThread()}
                                  >
                                    Implement in a new thread
                                  </MenuItem>
                                </ComposerPickerMenuPopup>
                              </Menu>
                            </div>
                          )
                        ) : (
                          <>
                            {showVoiceNotesControl ? (
                              <ComposerVoiceButton
                                disabled={isComposerApprovalState || isConnecting || isSendBusy}
                                isRecording={isVoiceRecording}
                                isTranscribing={isVoiceTranscribing}
                                durationLabel={voiceRecordingDurationLabel}
                                onClick={toggleComposerVoiceRecording}
                              />
                            ) : null}
                            <Button
                              type="submit"
                              variant="prominent"
                              size="icon-xs"
                              className="size-7 rounded-full sm:size-7"
                              disabled={
                                isSendBusy ||
                                isConnecting ||
                                isVoiceTranscribing ||
                                isPreparingComposerImages ||
                                !composerSendState.hasSendableContent
                              }
                              data-product-submit-mode={
                                isProductConversationThread
                                  ? productDispatchAvailable
                                    ? "submit"
                                    : "queue-only"
                                  : undefined
                              }
                              aria-label={
                                isConnecting
                                  ? "Connecting"
                                  : isVoiceTranscribing
                                    ? "Transcribing voice note"
                                    : isPreparingComposerImages
                                      ? "Optimizing image"
                                      : isPreparingWorktree
                                        ? "Preparing worktree"
                                        : isSendBusy
                                          ? "Sending"
                                          : isProductConversationThread && !productDispatchAvailable
                                            ? workbenchCopy.queueMessage
                                            : "Send message"
                              }
                            >
                              {isConnecting || isSendBusy || isPreparingComposerImages ? (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  className="animate-spin"
                                  aria-hidden="true"
                                >
                                  <circle
                                    cx="7"
                                    cy="7"
                                    r="5.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeDasharray="20 12"
                                  />
                                </svg>
                              ) : (
                                <ComposerSendArrowIcon
                                  aria-hidden="true"
                                  className="size-5 shrink-0"
                                />
                              )}
                            </Button>
                          </>
                        )
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ComposerColumnFrame>
        </form>
        {emptyLandingControls}
      </div>
    ) : (
      <div
        aria-hidden="true"
        className="w-full overflow-visible"
        data-chat-composer-form="deferred"
      >
        <div
          className={cn(COMPOSER_INPUT_SURFACE_CLASS_NAME, COMPOSER_COLUMN_FRAME_CLASS_NAME)}
          style={{ height: secondaryChromePlaceholderHeight }}
        />
      </div>
    );

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        CHAT_BACKGROUND_CLASS_NAME,
      )}
      onDragEnter={onComposerDragEnter}
      onDragOver={onComposerDragOver}
      onDragLeave={onComposerDragLeave}
      onDrop={onComposerDrop}
    >
      {/* Subtle accent tint over the whole pane while a file is dragged anywhere over it,
          signalling that dropping it will attach the file to the composer. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-50 transition-opacity duration-150",
          "bg-info/8 ring-1 ring-inset ring-info/30",
          isDragOverComposer ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Top bar */}
      <header
        className={cn(
          CHAT_SURFACE_HEADER_DIVIDER_CLASS_NAME,
          !isEditorRail && CHAT_SURFACE_HEADER_PADDING_X_CLASS,
          "flex items-center",
          isEditorRail ? "h-10" : CHAT_SURFACE_HEADER_HEIGHT_CLASS,
          isElectron && "drag-region",
          // The editor-rail chat header sits in the editor's second row (inside the
          // right-side chat pane), not flush against the window edges — the editor's
          // own top bar already reserves both desktop window-control gutters. Applying
          // them here just leaves redundant empty space on the sides.
          !isEditorRail && desktopTopBarTrafficLightGutterClassName,
          !isEditorRail && desktopTopBarWindowControlsGutterClassName,
        )}
      >
        <ChatHeader
          activeThreadId={activeThread.id}
          activeThreadTitle={activeThreadDisplayTitle}
          activeThreadEntryPoint={terminalState.entryPoint}
          activeProvider={
            activeThread.session?.provider ??
            (activeThread.runtimeIdentity?.kind === "historical-provider" ? null : null)
          }
          hideProviderIdentity={isProductConversationThread}
          activeProjectName={isEditorRail ? undefined : activeProjectDisplayName}
          threadBreadcrumbs={threadBreadcrumbs}
          {...(isEditorRail
            ? { className: cn(CHAT_SURFACE_HEADER_PADDING_X_CLASS, "h-full") }
            : {})}
          isSidechat={Boolean(activeThread.sidechatSourceThreadId)}
          hideSidebarControls={isEditorRail}
          hideHandoffControls={
            isProductConversationThread || terminalWorkspaceTerminalTabActive || isEditorRail
          }
          isGitRepo={isGitRepo}
          openInTarget={threadWorkspaceCwd}
          activeProjectScripts={isEditorRail ? undefined : activeProjectScripts}
          preferredScriptId={
            activeProject ? (lastInvokedScriptByProjectId[activeProject.id] ?? null) : null
          }
          keybindings={keybindings}
          availableEditors={availableEditors}
          diffToggleShortcutLabel={diffPanelShortcutLabel}
          handoffBadgeLabel={handoffBadgeLabel}
          handoffBadgeSourceProvider={handoffBadgeSourceProvider}
          handoffBadgeTargetProvider={handoffBadgeTargetProvider}
          gitCwd={threadWorkspaceCwd}
          diffTotals={repoDiffTotals}
          showGitActions={showGitActions && !isEditorRail}
          showDiffToggle={!isEditorRail}
          diffOpen={resolvedDiffOpen}
          diffDisabledReason={diffDisabledReason}
          rightDockOpen={rightDockOpen}
          {...(onToggleRightDock ? { onToggleRightDock } : {})}
          environment={isEditorRail ? null : environmentHeaderState}
          surfaceMode={surfaceMode}
          chatLayoutAction={
            surfaceMode === "single" && onSplitSurface
              ? {
                  kind: "split",
                  label: "Split chat",
                  shortcutLabel: chatSplitShortcutLabel,
                  onClick: onSplitSurface,
                }
              : surfaceMode === "split" && isFocusedPane && onMaximizeSurface
                ? {
                    kind: "maximize",
                    label: "Expand this chat",
                    shortcutLabel: null,
                    onClick: onMaximizeSurface,
                  }
                : null
          }
          editorChatControls={
            isEditorRail && activeProject
              ? {
                  projectId: activeProject.id,
                  activeSurface: terminalWorkspaceTerminalTabActive ? "terminal" : "chat",
                  terminalAvailable: terminalState.terminalOpen,
                  terminalHasRunningActivity: terminalState.runningTerminalIds.length > 0,
                  onNewChat: onNewEditorChat,
                  onNewTerminal: onOpenEditorTerminal,
                  onOpenChat: onOpenEditorChat,
                  onOpenTerminal: onOpenEditorTerminal,
                  onCloseTerminal: onCloseEditorTerminal,
                }
              : null
          }
          changeThreadAction={
            surfaceMode === "split" && isFocusedPane && onChangeThreadInSplitPane
              ? {
                  label: "Change thread",
                  onClick: onChangeThreadInSplitPane,
                }
              : null
          }
          onRunProjectScript={onRunProjectScriptFromHeader}
          onAddProjectScript={saveProjectScript}
          onUpdateProjectScript={updateProjectScript}
          onDeleteProjectScript={deleteProjectScript}
          onToggleDiff={onToggleDiff}
          onRegisterCommitAndPushTrigger={onRegisterCommitAndPushTrigger}
          onNavigateToThread={onNavigateToThread}
          onRenameThread={() => setRenameDialogOpen(true)}
          {...(onCloseThreadPane ? { onCloseThreadPane } : {})}
        />
      </header>

      <RenameThreadDialog
        open={renameDialogOpen}
        currentTitle={activeThread.title}
        onOpenChange={setRenameDialogOpen}
        onSave={handleRenameActiveThread}
      />
      {automationDraftForm ? (
        <AutomationDialog
          open={automationDraftOpen}
          editing={automationEditingDefinition !== null}
          form={automationDraftForm}
          projects={automationProjects}
          threads={automationThreads}
          warnings={automationDraftWarnings}
          acknowledgedWarningIds={acknowledgedAutomationWarnings}
          onToggleWarning={toggleAutomationWarning}
          onOpenChange={setAutomationDraftDialogOpen}
          onFormChange={updateAutomationDraftForm}
          onSubmit={submitAutomationDraft}
          busy={isAutomationDraftSubmitting || automationUpdateMutation.isPending}
        />
      ) : null}

      {/* Error banner */}
      <ProductConversationNotice presentation={productConversationPresentation} />
      <ThreadErrorBanner error={activeThread.error} onDismiss={dismissActiveThreadError} />
      {terminalWorkspaceOpen && !isEditorRail ? (
        <TerminalWorkspaceTabs
          activeTab={terminalState.workspaceActiveTab}
          isWorking={isWorking}
          terminalHasRunningActivity={terminalState.runningTerminalIds.length > 0}
          terminalCount={terminalState.terminalIds.length}
          workspaceLayout={terminalState.workspaceLayout}
          onSelectTab={setTerminalWorkspaceTab}
        />
      ) : null}
      {/* Main content area with optional plan sidebar */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Chat column */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            aria-hidden={terminalWorkspaceTerminalTabActive}
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              terminalWorkspaceTerminalTabActive ? "pointer-events-none invisible" : "",
            )}
          >
            {shouldRenderChatPaneContent && isCenteredEmptyLanding ? (
              <div
                className={cn(
                  "chat-pane-enter flex flex-1 items-center justify-center",
                  CHAT_COLUMN_GUTTER_CLASS_NAME,
                )}
              >
                {/* Center the heading, composer, and suggestion list together as a
                    single group: the suggestions live in normal flow so the whole
                    block (composer + suggestions) stays vertically centered in the
                    view instead of the composer being centered with the list hanging
                    below it. */}
                <div className="flex w-full flex-col justify-center">
                  <div
                    className={cn(
                      "flex flex-col items-center gap-4 px-6 pb-5 text-center select-none",
                      CHAT_COLUMN_FRAME_CLASS_NAME,
                    )}
                  >
                    <BrandMark aria-label="OmniMind logo" className="size-10" />
                    <h2
                      data-testid="empty-landing-heading"
                      className="text-[26px] font-normal leading-[1.15] tracking-[-0.015em] text-foreground/95 sm:text-[30px]"
                    >
                      {isEmptyChatLanding ? (
                        isChatProductSurface ? (
                          workbenchCopy.chatEmptyHeading
                        ) : (
                          workbenchCopy.agentEmptyHeading
                        )
                      ) : (
                        <>
                          What should we do in{" "}
                          {showEmptyLandingProjectPicker ? (
                            <ProjectPicker
                              align="center"
                              side="bottom"
                              selectionMode="project"
                              selectedProjectId={activeProject.id}
                              selectedWorkspaceRoot={activeProject.cwd}
                              showResetToHome
                              onSelectProject={handleSelectProjectForEmptyDraft}
                              onCreateProjectFromPath={handleCreateProjectFromPickerPath}
                              onResetToHome={handleResetWorkspaceToHome}
                              renderTrigger={
                                <button
                                  type="button"
                                  data-testid="empty-landing-heading-project-trigger"
                                  className="cursor-pointer rounded-sm text-inherit underline decoration-dotted decoration-[1.5px] underline-offset-[6px] transition-colors duration-150 ease-out hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none"
                                >
                                  {activeProjectDisplayName ?? "this folder"}
                                </button>
                              }
                            />
                          ) : (
                            <span className="text-inherit">
                              {activeProjectDisplayName ?? "this folder"}
                            </span>
                          )}
                          ?
                        </>
                      )}
                    </h2>
                  </div>
                  {composerSection}
                  {(isGitRepo && !environmentEnabled && !isCenteredEmptyLanding) ||
                  relocateComposerLeadingControls ? (
                    <div className={COMPOSER_COLUMN_FRAME_CLASS_NAME}>
                      <div className="flex w-full items-center gap-1">
                        {relocateComposerLeadingControls ? (
                          <div className="flex shrink-0 items-center gap-1 pl-1">
                            {renderComposerLeadingControls({ iconOnly: true })}
                          </div>
                        ) : null}
                        {isGitRepo && !environmentEnabled && !isCenteredEmptyLanding ? (
                          <BranchToolbar {...branchToolbarProps} className="min-w-0 flex-1" />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {shouldRenderChatPaneContent && !isCenteredEmptyLanding ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  <ChatTranscriptPane
                    activeThreadId={activeThread.id}
                    activeTurnId={activeTurnIdForTranscript}
                    agentActivityDetail={openAgentActivityDetail}
                    hasMessages={timelineEntries.length > 0}
                    isWorking={hasLiveTurn}
                    worktreeSetup={activeWorktreeSetup}
                    activeTurnInProgress={activeTurnInProgress}
                    activeTurnStartedAt={activeWorkStartedAt}
                    listRef={legendListRef}
                    timelineControllerRef={timelineControllerRef}
                    pinnedMessageIds={pinnedMessageIds}
                    canPinMessage={canPinMessage}
                    onTogglePinMessage={handleTogglePinMessageGuarded}
                    threadMarkers={threadMarkers}
                    enteringUserMessageIds={enteringUserMessageIds}
                    tailAnchorMessageId={
                      tailAnchor !== null && tailAnchor.threadId === activeThread.id
                        ? tailAnchor.messageId
                        : null
                    }
                    tailAnchorScrollInFlightRef={tailAnchorScrollInFlightRef}
                    crossTaskOrigin={crossTaskOrigin}
                    timelineEntries={timelineEntries}
                    turnDiffSummaryByAssistantMessageId={turnDiffSummaryByAssistantMessageId}
                    onOpenTurnDiff={onOpenTurnDiff}
                    onOpenThread={onNavigateToThread}
                    onOpenAutomation={onOpenAutomation}
                    revertTurnCountByUserMessageId={revertTurnCountByUserMessageId}
                    onRevertUserMessage={onRevertUserMessage}
                    onUndoTurnFiles={onUndoTurnFiles}
                    isRevertingCheckpoint={isRevertingCheckpoint}
                    onExpandTimelineImage={onExpandTimelineImage}
                    followLiveOutput={hasStreamingAssistantText}
                    onIsAtEndChange={onIsAtEndChange}
                    markdownCwd={threadWorkspaceCwd ?? undefined}
                    resolvedTheme={resolvedTheme}
                    chatFontSizePx={settings.chatFontSizePx}
                    timestampFormat={timestampFormat}
                    workspaceRoot={threadArtifactWorkspaceRoot ?? undefined}
                    emptyStateContent={transcriptEmptyStateContent}
                    emptyStateProjectName={activeProjectDisplayName}
                    terminalWorkspaceTerminalTabActive={terminalWorkspaceTerminalTabActive}
                    onMessagesScroll={onMessagesScroll}
                    onMessagesClickCapture={onMessagesClickCapture}
                    onMessagesMouseUp={onMessagesMouseUp}
                    onMessagesWheel={onMessagesWheel}
                    onMessagesPointerDown={onMessagesPointerDown}
                    onMessagesPointerUp={onMessagesPointerUp}
                    onMessagesPointerCancel={onMessagesPointerCancel}
                    onMessagesTouchStart={onMessagesTouchStart}
                    onMessagesTouchMove={onMessagesTouchMove}
                    onMessagesTouchEnd={onMessagesTouchEnd}
                    onOpenAgentActivity={setOpenAgentActivityId}
                    onCloseAgentActivityDetail={() => setOpenAgentActivityId(null)}
                    scrollButtonVisible={showScrollToBottom}
                    onScrollToBottom={onScrollToBottom}
                    contentInsetRightPx={
                      environmentAppliesContentInset
                        ? ENVIRONMENT_DOCKED_CONTENT_INSET_PX
                        : undefined
                    }
                  />
                </div>

                <div
                  className={cn(
                    "relative z-10 -mt-5 w-full shrink-0 overflow-visible pt-0 sm:pt-0",
                    ENVIRONMENT_CONTENT_INSET_MOTION_CLASS,
                    CHAT_COLUMN_GUTTER_CLASS_NAME,
                    // A trailing BranchToolbar only renders for legacy git threads; otherwise the
                    // composer is the last element, so give it a comfortable bottom margin.
                    isGitRepo && !environmentEnabled ? "pb-0.5" : "pb-3 sm:pb-4",
                  )}
                  // Match the transcript's right inset so the composer stays aligned with chat
                  // content (and clear of the docked Environment overlay).
                  style={
                    environmentAppliesContentInset
                      ? { paddingRight: ENVIRONMENT_DOCKED_CONTENT_INSET_PX }
                      : undefined
                  }
                >
                  {composerSection}
                </div>
                {secondaryChromeReady &&
                ((isGitRepo && !environmentEnabled) || relocateComposerLeadingControls) ? (
                  <div className={CHAT_COLUMN_GUTTER_CLASS_NAME}>
                    <div className={COMPOSER_COLUMN_FRAME_CLASS_NAME}>
                      <div className="flex w-full items-center gap-1">
                        {relocateComposerLeadingControls ? (
                          <div className="flex shrink-0 items-center gap-1 pl-1">
                            {renderComposerLeadingControls({ iconOnly: true })}
                          </div>
                        ) : null}
                        {isGitRepo && !environmentEnabled ? (
                          <BranchToolbar {...branchToolbarProps} className="min-w-0 flex-1" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {shouldRenderChatPaneContent && secondaryChromeReady && pullRequestDialogState ? (
              <PullRequestThreadDialog
                key={pullRequestDialogState.key}
                open
                cwd={threadArtifactWorkspaceRoot}
                initialReference={pullRequestDialogState.initialReference}
                onOpenChange={(open) => {
                  if (!open) {
                    closePullRequestDialog();
                  }
                }}
                onPrepared={handlePreparedPullRequestThread}
              />
            ) : null}
          </div>

          {terminalWorkspaceOpen ? (
            <div
              aria-hidden={!terminalWorkspaceTerminalTabActive}
              className={cn(
                "absolute inset-0 min-h-0 min-w-0 transition-all duration-200 ease-out",
                terminalWorkspaceTerminalTabActive
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0",
              )}
            >
              <Suspense fallback={null}>
                <ThreadTerminalDrawer
                  key={`${activeThread.id}-workspace`}
                  {...terminalDrawerProps}
                  presentationMode="workspace"
                  isVisible={terminalWorkspaceTerminalTabActive}
                  onTogglePresentationMode={
                    terminalState.workspaceLayout === "both" ? collapseTerminalWorkspace : undefined
                  }
                />
              </Suspense>
            </div>
          ) : null}

          {/* Environment overlay — always mounted so open/close can transition in lockstep with inset. */}
          {environmentEnabled ? (
            <EnvironmentPanel
              {...environmentPanelProps}
              open={environmentPanelVisible}
              variant={environmentOverlayVariant}
            />
          ) : null}
        </div>
        {/* end chat column */}

        {/* Plan sidebar */}
        {planSidebarOpen ? (
          <PlanSidebar
            activeTaskList={activeTaskList}
            activeProposedPlan={sidebarProposedPlan}
            markdownCwd={threadWorkspaceCwd ?? undefined}
            workspaceRoot={threadArtifactWorkspaceRoot ?? undefined}
            timestampFormat={timestampFormat}
            onClose={() => {
              setPlanSidebarOpen(false);
              // Track that the user explicitly dismissed for this turn so auto-open won't fight them.
              const turnKey = activeTaskList?.turnId ?? sidebarProposedPlan?.turnId ?? null;
              if (turnKey) {
                planSidebarDismissedForTurnRef.current = turnKey;
              }
            }}
          />
        ) : null}
      </div>
      {/* end horizontal flex container */}

      {(() => {
        if (!terminalState.terminalOpen || terminalWorkspaceOpen) {
          return null;
        }
        return (
          <Suspense fallback={null}>
            <ThreadTerminalDrawer
              key={activeThread.id}
              {...terminalDrawerProps}
              presentationMode="drawer"
              onTogglePresentationMode={expandTerminalWorkspace}
            />
          </Suspense>
        );
      })()}

      <ThreadWorktreeHandoffDialog
        open={worktreeHandoffDialogOpen}
        worktreeName={worktreeHandoffName}
        busy={handoffBusy}
        onWorktreeNameChange={setWorktreeHandoffName}
        onOpenChange={setWorktreeHandoffDialogOpen}
        onConfirm={confirmWorktreeHandoff}
      />
      {isInactiveSplitPane ? null : (
        <TranscriptSelectionActionLayer
          action={pendingTranscriptSelectionAction}
          onHighlight={createHighlightFromPendingSelection}
          onUnderline={createUnderlineFromPendingSelection}
          onAddToChat={commitTranscriptAssistantSelection}
        />
      )}
      <ExpandedImageOverlay
        expandedImage={expandedImage}
        onClose={closeExpandedImage}
        onNavigate={navigateExpandedImage}
      />
    </div>
  );
}

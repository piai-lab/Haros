import {
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  ThreadMarkerId,
  TurnId,
  type DesktopHealthSnapshot,
  type ProductConversationReadModel,
  type ProductRuntimeActivity,
  type ProductWorkspaceSummary,
} from "@omnimind/contracts";

import type { QueuedComposerChatTurn, QueuedComposerTurn } from "./composerDraftStore";
import {
  getWorkbenchCopy,
  type WorkbenchCopy,
  type WorkbenchLocale,
} from "./i18n/workbenchCopy";
import type { ProductProjectionIssue } from "./store/productStore";
import type { ChatMessage } from "./types";
import {
  DEFAULT_INTERACTION_MODE,
  type ConversationPresentation,
  type Project,
} from "./types";

function fillCopy(
  template: string,
  fields: Readonly<Record<string, string | number>>,
): string {
  return Object.entries(fields).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function runtimeControlLabel(
  control: "steer" | "follow-up" | "abort" | "cancel",
  copy: WorkbenchCopy,
): string {
  switch (control) {
    case "steer":
      return copy.productControlSteer;
    case "follow-up":
      return copy.productControlFollowUp;
    case "abort":
      return copy.productControlAbort;
    case "cancel":
      return copy.productControlCancel;
  }
}

function runtimeLineageLabel(
  lineage: "continued" | "new" | "missing" | "divergent",
  copy: WorkbenchCopy,
): string {
  switch (lineage) {
    case "continued":
      return copy.productLineageContinued;
    case "new":
      return copy.productLineageNew;
    case "missing":
      return copy.productLineageMissing;
    case "divergent":
      return copy.productLineageDivergent;
  }
}

function runtimeActivitySummary(
  activity: ProductRuntimeActivity,
  copy: WorkbenchCopy,
): string {
  const detail = activity.detail;
  switch (detail.code) {
    case "session-bound":
      return fillCopy(copy.productActivitySessionBound, {
        lineage: runtimeLineageLabel(detail.lineage, copy),
      });
    case "package-loaded":
      return fillCopy(copy.productActivityPackagesLoaded, { count: detail.count });
    case "package-failed":
      return fillCopy(copy.productActivityPackagesFailed, { count: detail.count });
    case "thinking-delta":
      return detail.text;
    case "question-requested":
      return detail.question;
    case "control-applied":
      return fillCopy(copy.productActivityControlApplied, {
        control: runtimeControlLabel(detail.control, copy),
        text: detail.text === null ? "" : ` — ${detail.text}`,
      });
    case "tool-started":
      return fillCopy(copy.productActivityToolStarted, { tool: detail.toolName });
    case "tool-settled":
      return fillCopy(
        detail.outcome === "succeeded"
          ? copy.productActivityToolSucceeded
          : copy.productActivityToolFailed,
        { tool: detail.toolName },
      );
    case "usage-observed":
      return fillCopy(copy.productActivityUsage, detail);
    case "run-settled":
      return detail.outcome === "succeeded"
        ? copy.productActivitySettledSucceeded
        : detail.outcome === "cancelled"
          ? copy.productActivitySettledCancelled
          : copy.productActivitySettledFailed;
  }
}

/**
 * Stateless presentation into the existing message components. Product facts remain the source
 * of truth; this module has no cache, subscription, writer, or Engine state.
 */
export function presentProductConversationMessages(
  readModel: ProductConversationReadModel | undefined,
): ReadonlyArray<ChatMessage> {
  if (!readModel) return [];
  return readModel.entries.map((entry) => ({
    id: MessageId.makeUnsafe(entry.id),
    role: entry.role,
    text: entry.text,
    createdAt: entry.createdAt,
    streaming: readModel.streamingEntryIds.includes(entry.id),
    source: "native",
  }));
}

/** Stateless Queue-row presentation; ordering and ownership stay in Product Store. */
export interface ProductQueuedTurnPresentation {
  readonly id: string;
  readonly kind: "chat";
  readonly createdAt: string;
  readonly previewText: string;
  readonly prompt: string;
  readonly images: QueuedComposerChatTurn["images"];
  readonly files: QueuedComposerChatTurn["files"];
  readonly assistantSelections: QueuedComposerChatTurn["assistantSelections"];
  readonly browserAnnotations: QueuedComposerChatTurn["browserAnnotations"];
  readonly terminalContexts: QueuedComposerChatTurn["terminalContexts"];
  readonly fileComments: QueuedComposerChatTurn["fileComments"];
  readonly pastedTexts: QueuedComposerChatTurn["pastedTexts"];
  readonly skills: QueuedComposerChatTurn["skills"];
  readonly mentions: QueuedComposerChatTurn["mentions"];
  readonly requestedSelection: ProductConversationReadModel["queue"][number]["requestedSelection"];
  readonly runtimeMode: QueuedComposerChatTurn["runtimeMode"];
  readonly interactionMode: QueuedComposerChatTurn["interactionMode"];
  readonly envMode: QueuedComposerChatTurn["envMode"];
}

export type WorkbenchQueuedTurn = QueuedComposerTurn | ProductQueuedTurnPresentation;

export function presentProductConversationQueue(
  readModel: ProductConversationReadModel | undefined,
): ProductQueuedTurnPresentation[] {
  if (!readModel) return [];
  return readModel.queue.map((item) => ({
    id: item.id,
    kind: "chat",
    createdAt: item.createdAt,
    previewText: item.text,
    prompt: item.text,
    images: [],
    files: [],
    assistantSelections: [],
    browserAnnotations: [],
    terminalContexts: [],
    fileComments: [],
    pastedTexts: [],
    skills: [],
    mentions: [],
    requestedSelection: item.requestedSelection,
    runtimeMode: item.requestedSelection.permissionPolicy,
    interactionMode: "default",
    envMode: "local",
  }));
}

/**
 * View-only Thread-shaped props for the existing conversation component mother. This function
 * never enters either store and carries no authority; Product state is re-projected on render.
 */
export function presentProductConversationThread(
  readModel: ProductConversationReadModel | undefined,
  locale?: WorkbenchLocale,
): ConversationPresentation | undefined {
  if (!readModel) return undefined;
  const copy = getWorkbenchCopy(locale);
  const selection =
    readModel.runs.at(-1)?.requestedSelection ?? readModel.queue.at(-1)?.requestedSelection;
  const selectedModel =
    selection?.state === "selected"
      ? selection.runtimeModelId
      : selection?.requestedRuntimeModelId ?? "";
  return {
    id: ThreadId.makeUnsafe(readModel.conversation.id),
    codexThreadId: null,
    projectId: ProjectId.makeUnsafe(readModel.workspace.id),
    title: readModel.conversation.title,
    runtimeIdentity:
      selection?.state === "selected"
        ? {
            kind: "product",
            engineId: selection.engineId,
            runtimeModelId: selection.runtimeModelId,
            thinking: selection.thinking,
          }
        : null,
    // Thread requires a donor-shaped runtime mode, but Product has not selected
    // or verified one here. Fail closed; Product controls stay hidden until typed
    // execution facts exist.
    runtimeMode: selection?.permissionPolicy ?? "approval-required",
    interactionMode: DEFAULT_INTERACTION_MODE,
    session: null,
    messages: [],
    proposedPlans: [],
    error: null,
    createdAt: readModel.conversation.createdAt,
    archivedAt: readModel.conversation.archivedAt,
    settledAt:
      readModel.conversation.boardState === "done"
        ? readModel.conversation.boardStateChangedAt
        : null,
    isPinned: readModel.conversation.isPinned,
    pinnedMessages: readModel.entryPins.map((pin) => ({
      messageId: MessageId.makeUnsafe(pin.entryId),
      label: pin.label,
      done: pin.done,
      pinnedAt: pin.pinnedAt,
    })),
    threadMarkers: readModel.entryMarkers.map((marker) => ({
      id: ThreadMarkerId.makeUnsafe(marker.id),
      messageId: MessageId.makeUnsafe(marker.entryId),
      startOffset: marker.startOffset,
      endOffset: marker.endOffset,
      selectedText: marker.selectedText,
      style: marker.style,
      color: marker.color,
      label: marker.label,
      done: marker.done,
      createdAt: marker.createdAt,
      updatedAt: marker.updatedAt,
    })),
    notes: readModel.conversation.notes,
    updatedAt: readModel.conversation.updatedAt,
    latestTurn: null,
    lastVisitedAt: readModel.conversation.updatedAt,
    envMode: "local",
    branch: null,
    worktreePath: null,
    workingDirectory: null,
    handoff: null,
    turnDiffSummaries: [],
    activities: [
      ...(readModel.activities ?? []).map((activity) => ({
        id: EventId.makeUnsafe(`${activity.runId}:${activity.nativeSequence}`),
        tone:
          activity.kind === "tool"
            ? ("tool" as const)
            : activity.kind === "question"
              ? ("approval" as const)
              : ("info" as const),
        kind: `native.${activity.kind}`,
        summary: runtimeActivitySummary(activity, copy),
        payload: { source: "native-host" },
        turnId: TurnId.makeUnsafe(activity.runId),
        sequence: activity.nativeSequence,
        createdAt: activity.createdAt,
      })),
      ...(readModel.recoveries ?? []).map((recovery) => ({
        id: EventId.makeUnsafe(`${recovery.runId}:snapshot:${recovery.snapshotVersion}`),
        tone: "info" as const,
        kind: "native.recovery",
        summary: copy.productRuntimeRecoverySummary,
        payload: {
          source: "native-host",
          snapshotVersion: recovery.snapshotVersion,
          activityHistoryComplete: false,
        },
        turnId: TurnId.makeUnsafe(recovery.runId),
        createdAt: recovery.createdAt,
      })),
    ].toSorted((left, right) => left.createdAt.localeCompare(right.createdAt)),
  };
}

/** View-only project chrome input derived from Product workspace truth. */
export function presentProductConversationProject(
  readModel: ProductConversationReadModel | undefined,
): Project | undefined {
  if (!readModel) return undefined;
  const access = readModel.workspace.access;
  const cwd = access.primaryFolder ?? access.managedDirectory ?? "";
  const name = access.kind === "chat" ? "Chat" : readModel.conversation.title;
  return {
    id: ProjectId.makeUnsafe(readModel.workspace.id),
    kind: access.kind === "chat" ? "chat" : "project",
    name,
    remoteName: name,
    folderName: name,
    localName: null,
    cwd,
    expanded: true,
    createdAt: readModel.conversation.createdAt,
    updatedAt: readModel.conversation.updatedAt,
    scripts: [],
  };
}

/** View-only donor-shaped project chrome derived from a Product Workspace shell fact. */
export function presentProductWorkspaceProject(
  workspace: ProductWorkspaceSummary,
): Project | null {
  if (!workspace.visibleInSidebar || workspace.archivedAt !== null) return null;
  const cwd = workspace.access.primaryFolder ?? workspace.access.managedDirectory;
  if (!cwd) return null;
  return {
    id: ProjectId.makeUnsafe(workspace.id),
    kind: "project",
    name: workspace.title,
    remoteName: workspace.title,
    folderName: workspace.title,
    localName: null,
    cwd,
    expanded: true,
    isPinned: workspace.isPinned,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    scripts:
      workspace.runCommand === null
        ? []
        : [
            {
              id: "product-workspace-run",
              name: "Run",
              command: workspace.runCommand,
              icon: "play",
              runOnWorktreeCreate: false,
            },
          ],
  };
}

export function presentProductConversationError(
  readModel: ProductConversationReadModel | undefined,
): string | null {
  const receipt = readModel?.runs.at(-1)?.receipt.receipt;
  if (!receipt) return null;
  if (receipt.state === "rejected") return receipt.message;
  if (receipt.state === "delivery_unknown") {
    return "Delivery could not be confirmed. OmniMind will not replay this request automatically.";
  }
  if (receipt.state === "outcome_unknown") {
    return "The request outcome could not be confirmed. OmniMind will not replay it automatically.";
  }
  return null;
}

export type ProductConversationPresentation =
  | { readonly kind: "ready" }
  | {
      readonly kind:
        | "loading"
        | "unavailable"
        | "execution_unavailable"
        | "rejected"
        | "delivery_unknown"
        | "outcome_unknown";
      readonly label: string;
      readonly title: string;
      readonly description: string;
    };

function unavailableReason(snapshot: DesktopHealthSnapshot | null): string | null {
  if (snapshot?.service.reason) return snapshot.service.reason;
  if (snapshot?.nativeHost.reason) return snapshot.nativeHost.reason;
  if (snapshot?.engineSelection.reason) return snapshot.engineSelection.reason;
  return null;
}

/**
 * Pure presentation policy over typed Product/health facts. It deliberately exposes no replay
 * callback: rejected and uncertain receipts never become a generic retry action.
 */
export function presentProductConversationState(input: {
  readonly readModel: ProductConversationReadModel | undefined;
  readonly isKnownConversation: boolean;
  readonly projectionIssue: ProductProjectionIssue | null;
  readonly health: DesktopHealthSnapshot | null;
  readonly locale?: WorkbenchLocale | undefined;
}): ProductConversationPresentation {
  const copy = getWorkbenchCopy(input.locale);
  const receipt = input.readModel?.runs.at(-1)?.receipt.receipt;

  if (receipt?.state === "rejected") {
    return {
      kind: "rejected",
      label: copy.productRejectedLabel,
      title: copy.productRejectedTitle,
      description: receipt.message,
    };
  }
  if (receipt?.state === "delivery_unknown") {
    return {
      kind: "delivery_unknown",
      label: copy.productDeliveryUnknownLabel,
      title: copy.productDeliveryUnknownTitle,
      description: copy.productDeliveryUnknownDescription,
    };
  }
  if (receipt?.state === "outcome_unknown") {
    return {
      kind: "outcome_unknown",
      label: copy.productOutcomeUnknownLabel,
      title: copy.productOutcomeUnknownTitle,
      description: copy.productOutcomeUnknownDescription,
    };
  }
  if (input.projectionIssue !== null && input.readModel === undefined) {
    return {
      kind: "unavailable",
      label: copy.productUnavailableLabel,
      title: copy.productUnavailableTitle,
      description: copy.productUnavailableDescription,
    };
  }
  if (input.isKnownConversation && input.readModel === undefined) {
    return {
      kind: "loading",
      label: copy.productLoadingLabel,
      title: copy.productLoadingTitle,
      description: copy.productLoadingDescription,
    };
  }

  const health = input.health;
  if (health === null) {
    return {
      kind: "execution_unavailable",
      label: copy.executionUnavailableLabel,
      title: copy.executionUnavailableTitle,
      description: copy.executionUnavailableDescription,
    };
  }
  if (
    health.service.status !== "ready" ||
    health.nativeHost.status !== "ready" ||
    health.engineSelection.status !== "available"
  ) {
    const reason = unavailableReason(health);
    return {
      kind: "execution_unavailable",
      label: copy.executionUnavailableLabel,
      title: copy.executionUnavailableTitle,
      description: reason
        ? `${copy.executionUnavailableDescription} ${reason}`
        : copy.executionUnavailableDescription,
    };
  }
  return { kind: "ready" };
}

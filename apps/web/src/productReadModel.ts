import {
  MessageId,
  ProjectId,
  ThreadId,
  type DesktopHealthSnapshot,
  type ProductConversationReadModel,
} from "@omnimind/contracts";

import type { QueuedComposerTurn } from "./composerDraftStore";
import { getWorkbenchCopy, type WorkbenchLocale } from "./i18n/workbenchCopy";
import type { ProductProjectionIssue } from "./store/productStore";
import type { ChatMessage } from "./types";
import { DEFAULT_INTERACTION_MODE, type Project, type Thread } from "./types";

/**
 * T3 display-only presenter into the existing mother. Product facts remain the
 * source of truth; this module has no writer and must be deleted when the T4
 * Agent | Chat read model supplies native component props directly.
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
    streaming: false,
    source: "native",
  }));
}

/** T3-only projection into the approved Queue mother; ownership stays in Product Store. */
export function presentProductConversationQueue(
  readModel: ProductConversationReadModel | undefined,
  fallbackModelId: string,
): QueuedComposerTurn[] {
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
    selectedProvider: "pi",
    selectedModel: item.requestedSelection.modelId,
    selectedPromptEffort: item.requestedSelection.thinking,
    modelSelection: {
      provider: "pi",
      model: item.requestedSelection.modelId ?? fallbackModelId,
    },
    runtimeMode: item.requestedSelection.permissionPolicy,
    interactionMode: "default",
    envMode: "local",
  }));
}

/**
 * T3 deletion point: a view-only Thread-shaped adapter for Product conversations that no longer
 * have donor Thread state after reload. It is never inserted into either store.
 */
export function presentProductConversationThread(
  readModel: ProductConversationReadModel | undefined,
): Thread | undefined {
  if (!readModel) return undefined;
  const selection =
    readModel.runs.at(-1)?.requestedSelection ?? readModel.queue.at(-1)?.requestedSelection;
  return {
    id: ThreadId.makeUnsafe(readModel.conversation.id),
    codexThreadId: null,
    projectId: ProjectId.makeUnsafe(readModel.workspace.id),
    title: readModel.conversation.title,
    modelSelection: { provider: "pi", model: selection?.modelId ?? "unresolved-model" },
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
    updatedAt: readModel.conversation.updatedAt,
    latestTurn: null,
    lastVisitedAt: readModel.conversation.updatedAt,
    envMode: "local",
    branch: null,
    worktreePath: null,
    workingDirectory: null,
    handoff: null,
    turnDiffSummaries: [],
    activities: [],
  };
}

/** T3 deletion point: view-only project chrome input derived from Product workspace truth. */
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
    defaultModelSelection: null,
    expanded: true,
    createdAt: readModel.conversation.createdAt,
    updatedAt: readModel.conversation.updatedAt,
    scripts: [],
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
    return "The Engine accepted this request, but its final outcome could not be confirmed.";
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

// FILE: threadHandoff.ts
// Purpose: Builds client-side handoff commands and imported transcript payloads.
// Layer: Web handoff utilities
// Exports: target-engine, title, transcript, and model-selection helpers.

import {
  EventId,
  MessageId,
  type OrchestrationThreadActivity,
  type EngineSelection,
  type EngineKind,
  type ServerEngineStatus,
  type ServerSettingsView,
  type ThreadHandoffImportedMessage,
  type ThreadForkScope,
} from "@harnessos/contracts";
import { getDefaultModel } from "@harnessos/shared/model";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { sanitizeImportedUserMessageText } from "@harnessos/shared/importedTranscript";
import { type Thread } from "../types";
import { DEFAULT_PROVIDER_ORDER } from "../engineOrdering";
import { findEngineStatus, isProviderUsable } from "./engineAvailability";
import { randomUUID } from "./utils";

const IMPORTABLE_THREAD_ACTIVITY_KINDS = new Set([
  "account.rate-limits.updated",
  "account.rate-limited",
  "context-window.updated",
]);

function isImportableThreadMessage(
  message: Thread["messages"][number],
): message is Thread["messages"][number] & {
  role: "user" | "assistant";
} {
  return (message.role === "user" || message.role === "assistant") && message.streaming === false;
}

function isImportableThreadActivity(
  activity: Thread["activities"][number],
): activity is OrchestrationThreadActivity {
  return IMPORTABLE_THREAD_ACTIVITY_KINDS.has(activity.kind);
}

export function isEligibleHandoffTargetProvider(input: {
  readonly sourceEngine: EngineKind;
  readonly targetEngine: EngineKind;
  readonly targetEngineEnabled: boolean | null | undefined;
  readonly targetEngineStatus: ServerEngineStatus | null | undefined;
}): boolean {
  return (
    input.targetEngine !== input.sourceEngine &&
    input.targetEngineEnabled === true &&
    input.targetEngineStatus?.engine === input.targetEngine &&
    isProviderUsable(input.targetEngineStatus)
  );
}

export function resolveAvailableHandoffTargetProviders(input: {
  readonly sourceEngine: EngineKind;
  readonly engineSettings: ServerSettingsView["engines"] | null | undefined;
  readonly engineStatuses: readonly ServerEngineStatus[];
}): ReadonlyArray<EngineKind> {
  return DEFAULT_PROVIDER_ORDER.filter((targetEngine) =>
    isEligibleHandoffTargetProvider({
      sourceEngine: input.sourceEngine,
      targetEngine,
      targetEngineEnabled: input.engineSettings?.[targetEngine].enabled,
      targetEngineStatus: findEngineStatus(input.engineStatuses, targetEngine),
    }),
  );
}

export function resolveThreadHandoffBadgeLabel(thread: Pick<Thread, "handoff">): string | null {
  if (!thread.handoff) {
    return null;
  }
  return `Handoff from ${ENGINE_DISPLAY_NAMES[thread.handoff.sourceEngine]}`;
}

// Preserve the visible source thread name when creating the destination thread.
export function resolveThreadHandoffTitle(thread: Pick<Thread, "title">): string {
  const title = thread.title.trim().replace(/\s+/g, " ");
  return title.length > 0 ? title : "Handoff";
}

function buildImportedThreadMessage(
  message: Thread["messages"][number] & { role: "user" | "assistant" },
  includeSourceIdentity: boolean,
): ThreadHandoffImportedMessage {
  const importedMessageId = MessageId.makeUnsafe(randomUUID());
  let importedText = message.text;
  if (!includeSourceIdentity && message.role === "user") {
    // Browser annotation ids and tab ids are scoped to the source thread's
    // live browser session. Carrying them into a handoff would advertise an
    // exact-page navigation target that the destination thread cannot
    // resolve, so import only the visible user/context text.
    importedText = sanitizeImportedUserMessageText(message.text);
  }
  const importedMessage: ThreadHandoffImportedMessage = {
    messageId: importedMessageId,
    ...(includeSourceIdentity
      ? {
          sourceMessageId: message.id,
          sourceMessageUpdatedAt: message.completedAt ?? message.createdAt,
        }
      : {}),
    role: message.role,
    text: importedText,
    createdAt: message.createdAt,
    updatedAt: message.completedAt ?? message.createdAt,
  };
  const attachments =
    message.attachments && message.attachments.length > 0
      ? message.attachments.map((attachment) =>
          attachment.type === "assistant-selection"
            ? {
                type: attachment.type,
                id: attachment.id,
                assistantMessageId: attachment.assistantMessageId,
                text: attachment.text,
              }
            : {
                type: attachment.type,
                id: attachment.id,
                name: attachment.name,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
              },
        )
      : null;
  return attachments ? Object.assign(importedMessage, { attachments }) : importedMessage;
}

export function buildThreadHandoffImportedMessages(
  thread: Pick<Thread, "messages">,
): ReadonlyArray<ThreadHandoffImportedMessage> {
  return thread.messages
    .filter(isImportableThreadMessage)
    .map((message) => buildImportedThreadMessage(message, false));
}

export interface HistoryOnlyForkPayload {
  readonly forkScope: ThreadForkScope;
  readonly importedMessages: ReadonlyArray<ThreadHandoffImportedMessage>;
}

export function buildHistoryOnlyForkPayload(
  thread: Pick<Thread, "messages">,
  sourceMessageId: MessageId,
): HistoryOnlyForkPayload | null {
  const importableMessages = thread.messages.filter(isImportableThreadMessage);
  const cutoffIndex = importableMessages.findIndex((message) => message.id === sourceMessageId);
  const cutoffMessage = importableMessages[cutoffIndex];
  if (
    cutoffMessage === undefined ||
    cutoffMessage.role !== "assistant" ||
    cutoffIndex === importableMessages.length - 1
  ) {
    return null;
  }
  const sourcePrefix = importableMessages.slice(0, cutoffIndex + 1);
  if (sourcePrefix.some((message) => (message.attachments?.length ?? 0) > 0)) {
    return null;
  }
  const sourceMessageUpdatedAt = cutoffMessage.completedAt ?? cutoffMessage.createdAt;
  return {
    forkScope: {
      kind: "history-only",
      sourceMessageId,
      sourceMessageUpdatedAt,
      bootstrapStatus: "pending",
    },
    importedMessages: sourcePrefix.map((message) => buildImportedThreadMessage(message, true)),
  };
}

export function deriveHistoryOnlyForkableAssistantMessageIds(
  thread: Pick<Thread, "messages">,
): ReadonlySet<MessageId> {
  const importableMessages = thread.messages.filter(isImportableThreadMessage);
  const forkableIds = new Set<MessageId>();
  let prefixHasAttachments = false;
  importableMessages.slice(0, -1).forEach((message) => {
    prefixHasAttachments ||= (message.attachments?.length ?? 0) > 0;
    if (!prefixHasAttachments && message.role === "assistant") {
      forkableIds.add(message.id);
    }
  });
  return forkableIds;
}

export function buildThreadHandoffImportedActivities(
  thread: Pick<Thread, "activities">,
): ReadonlyArray<OrchestrationThreadActivity> {
  return thread.activities.filter(isImportableThreadActivity).map((activity) => {
    const { sequence: _sequence, ...rest } = activity;
    return {
      ...rest,
      id: EventId.makeUnsafe(randomUUID()),
    };
  });
}

export function hasNativeThreadHandoffMessages(thread: Pick<Thread, "messages">): boolean {
  return thread.messages.some(
    (message) => isImportableThreadMessage(message) && message.source === "native",
  );
}

export function canCreateThreadHandoff(input: {
  readonly thread: Pick<Thread, "handoff" | "messages" | "session">;
  readonly isBusy?: boolean;
  readonly hasPendingApprovals?: boolean;
  readonly hasPendingUserInput?: boolean;
}): boolean {
  if (input.isBusy || input.hasPendingApprovals || input.hasPendingUserInput) {
    return false;
  }
  const sessionStatus = input.thread.session?.orchestrationStatus;
  if (sessionStatus === "starting" || sessionStatus === "running") {
    return false;
  }
  const importedMessages = buildThreadHandoffImportedMessages(input.thread);
  if (importedMessages.length === 0) {
    return false;
  }
  if (input.thread.handoff !== null) {
    return hasNativeThreadHandoffMessages(input.thread);
  }
  return true;
}

export function resolveThreadHandoffEngineSelection(input: {
  readonly sourceThread: Pick<Thread, "engineSelection">;
  readonly targetEngine: EngineKind;
  readonly projectDefaultEngineSelection: EngineSelection | null | undefined;
  readonly stickyEngineSelectionByEngine: Partial<Record<EngineKind, EngineSelection>>;
}): EngineSelection {
  const isCompatibleSelection = (
    selection: EngineSelection | null | undefined,
  ): selection is EngineSelection => {
    if (!selection || selection.engine !== input.targetEngine) {
      return false;
    }
    return input.targetEngine !== "kilo" || selection.model.startsWith("kilo/");
  };

  const stickySelection = input.stickyEngineSelectionByEngine[input.targetEngine];
  if (isCompatibleSelection(stickySelection)) {
    return stickySelection;
  }
  if (isCompatibleSelection(input.projectDefaultEngineSelection)) {
    return input.projectDefaultEngineSelection;
  }
  const defaultModel = getDefaultModel(input.targetEngine);
  if (!defaultModel) {
    throw new Error("Select a Pi model before handing off to Pi.");
  }
  return {
    engine: input.targetEngine,
    model: defaultModel,
  };
}

import type { HistoricalModelSelection, HistoricalModelSlug } from "~/historicalModelSelection";
import type {
  ConversationHistoryPlanId,
  ConversationPullRequestSummary,
} from "~/historicalConversation";
// FILE: composerDraftPersistence.ts
// Purpose: Owns the first-public composer draft schema, partialization, strict decoding, and hydration.
// Exports: Persist middleware transitions and persisted state type.

import {
  ProjectId,
  ProviderMentionReference,
  ProviderSkillReference,
  ProductPutQueueItemInput,
  ProductRequestedSelection,
  RuntimeMode,
  ThreadId,
} from "@omnimind/contracts";
import * as Schema from "effect/Schema";
import type { DeepMutable } from "effect/Types";

import {
  hydrateImagesFromPersisted,
  persistQueuedComposerImages,
  toStorageSafePersistedAttachment,
} from "./composerDraftAttachments";
import {
  hydratePastedTextsFromPersisted,
  normalizeAssistantSelections,
  normalizeDraftThreadEntryPoint,
  normalizeFileComments,
  normalizeTerminalContextsForThread,
  PersistedComposerImageAttachment,
  ComposerInteractionModeSchema,
  type ComposerDraftStoreState,
  type ComposerPromptHistorySavedDraft,
  type ComposerThreadDraftState,
  type QueuedComposerTurn,
} from "./composerDraftDomain";
import {
  normalizeHistoricalSourceId,
  sanitizeHistoricalModelSelectionMap,
} from "./composerDraftModels";
import { type BrowserAnnotationDraft, normalizeBrowserAnnotations } from "./lib/browserAnnotations";

const DraftThreadEnvModeSchema = Schema.Literals(["local", "worktree"]);
const DraftThreadEntryPointSchema = Schema.Literals(["chat", "terminal"]);
const ConversationHistoryPlanIdSchema = Schema.String;
const HistoricalSourceIdSchema = Schema.String;
const HistoricalModelOptionsSchema = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Boolean]),
);
const HistoricalModelSelectionSchema = Schema.Struct({
  provider: HistoricalSourceIdSchema,
  model: Schema.String,
  options: Schema.optionalKey(HistoricalModelOptionsSchema),
  supportsAutoMode: Schema.optionalKey(Schema.Boolean),
});
const ConversationPullRequestSummarySchema = Schema.Struct({
  number: Schema.Number,
  title: Schema.String,
  url: Schema.String,
  baseBranch: Schema.String,
  headBranch: Schema.String,
  state: Schema.Literals(["open", "closed", "merged"]),
  isDraft: Schema.optionalKey(Schema.Boolean),
  mergeability: Schema.optionalKey(Schema.Literals(["mergeable", "conflicting", "unknown"])),
  additions: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  deletions: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  changedFiles: Schema.optionalKey(Schema.NullOr(Schema.Number)),
});

function cloneBrowserAnnotation(annotation: BrowserAnnotationDraft): BrowserAnnotationDraft {
  return {
    ...annotation,
    source: { ...annotation.source },
  };
}

function cloneProductQueueTransfer(
  transfer: ProductPutQueueItemInput,
): DeepMutable<ProductPutQueueItemInput> {
  return {
    ...transfer,
    requestedSelection: {
      ...transfer.requestedSelection,
      executionTarget: transfer.requestedSelection.executionTarget
        ? { ...transfer.requestedSelection.executionTarget }
        : null,
    },
    resources: transfer.resources.map((resource) => ({ ...resource })),
  };
}

const PersistedTerminalContextDraft = Schema.Struct({
  id: Schema.String,
  threadId: ThreadId,
  createdAt: Schema.String,
  terminalId: Schema.String,
  terminalLabel: Schema.String,
  lineStart: Schema.Number,
  lineEnd: Schema.Number,
});

type PersistedTerminalContextDraft = typeof PersistedTerminalContextDraft.Type;

const PersistedQueuedTerminalContextDraft = Schema.Struct({
  id: Schema.String,
  threadId: ThreadId,
  createdAt: Schema.String,
  terminalId: Schema.String,
  terminalLabel: Schema.String,
  lineStart: Schema.Number,
  lineEnd: Schema.Number,
  text: Schema.String,
});

type PersistedQueuedTerminalContextDraft = typeof PersistedQueuedTerminalContextDraft.Type;

const PersistedFileCommentDraft = Schema.Struct({
  id: Schema.String,
  path: Schema.String,
  startLine: Schema.Number,
  endLine: Schema.Number,
  text: Schema.String,
});

type PersistedFileCommentDraft = typeof PersistedFileCommentDraft.Type;

const PersistedPastedTextDraft = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  text: Schema.String,
});

type PersistedPastedTextDraft = typeof PersistedPastedTextDraft.Type;

const PersistedSourceProposedPlanReference = Schema.Struct({
  threadId: ThreadId,
  planId: ConversationHistoryPlanIdSchema,
});

const PersistedRestoredSourceProposedPlan = Schema.Struct({
  threadId: ThreadId,
  restoredPrompt: Schema.String,
  sourceProposedPlan: PersistedSourceProposedPlanReference,
});

const PersistedAssistantSelectionDraft = Schema.Struct({
  id: Schema.String,
  assistantMessageId: Schema.String,
  text: Schema.String,
});

type PersistedAssistantSelectionDraft = typeof PersistedAssistantSelectionDraft.Type;

const PersistedBrowserAnnotationDraft = Schema.Struct({
  id: Schema.String,
  ordinal: Schema.Number,
  tabId: Schema.String,
  documentKey: Schema.optionalKey(Schema.String),
  source: Schema.Struct({
    url: Schema.String,
    pageTitle: Schema.String,
  }),
  selector: Schema.String,
  tagName: Schema.String,
  role: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
  text: Schema.NullOr(Schema.String),
  fingerprint: Schema.String,
  comment: Schema.NullOr(Schema.String),
  capturedAt: Schema.String,
});

const PersistedQueuedComposerChatTurn = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literal("chat"),
  createdAt: Schema.String,
  previewText: Schema.String,
  prompt: Schema.String,
  images: Schema.Array(PersistedComposerImageAttachment),
  assistantSelections: Schema.optionalKey(Schema.Array(PersistedAssistantSelectionDraft)),
  browserAnnotations: Schema.optionalKey(Schema.Array(PersistedBrowserAnnotationDraft)),
  terminalContexts: Schema.Array(PersistedQueuedTerminalContextDraft),
  fileComments: Schema.optionalKey(Schema.Array(PersistedFileCommentDraft)),
  pastedTexts: Schema.optionalKey(Schema.Array(PersistedPastedTextDraft)),
  skills: Schema.Array(ProviderSkillReference),
  mentions: Schema.Array(ProviderMentionReference),
  selectedProvider: Schema.String,
  selectedModel: Schema.NullOr(Schema.String),
  selectedPromptEffort: Schema.NullOr(Schema.String),
  modelSelection: HistoricalModelSelectionSchema,
  sourceProposedPlan: Schema.optionalKey(PersistedSourceProposedPlanReference),
  runtimeMode: RuntimeMode,
  interactionMode: ComposerInteractionModeSchema,
  envMode: DraftThreadEnvModeSchema,
});

type PersistedQueuedComposerChatTurn = typeof PersistedQueuedComposerChatTurn.Type;

const PersistedQueuedComposerPlanFollowUp = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literal("plan-follow-up"),
  createdAt: Schema.String,
  previewText: Schema.String,
  text: Schema.String,
  interactionMode: ComposerInteractionModeSchema,
  selectedProvider: Schema.String,
  selectedModel: Schema.NullOr(Schema.String),
  selectedPromptEffort: Schema.NullOr(Schema.String),
  modelSelection: HistoricalModelSelectionSchema,
  runtimeMode: RuntimeMode,
});

type PersistedQueuedComposerPlanFollowUp = typeof PersistedQueuedComposerPlanFollowUp.Type;

const PersistedQueuedComposerTurn = Schema.Union([
  PersistedQueuedComposerChatTurn,
  PersistedQueuedComposerPlanFollowUp,
]);

type PersistedQueuedComposerTurn = typeof PersistedQueuedComposerTurn.Type;

const PersistedComposerPromptHistorySavedDraft = Schema.Struct({
  prompt: Schema.String,
  attachments: Schema.Array(PersistedComposerImageAttachment),
  assistantSelections: Schema.optionalKey(Schema.Array(PersistedAssistantSelectionDraft)),
  browserAnnotations: Schema.optionalKey(Schema.Array(PersistedBrowserAnnotationDraft)),
  terminalContexts: Schema.optionalKey(Schema.Array(PersistedTerminalContextDraft)),
  fileComments: Schema.optionalKey(Schema.Array(PersistedFileCommentDraft)),
  pastedTexts: Schema.optionalKey(Schema.Array(PersistedPastedTextDraft)),
  skills: Schema.optionalKey(Schema.Array(ProviderSkillReference)),
  mentions: Schema.optionalKey(Schema.Array(ProviderMentionReference)),
});

type PersistedComposerPromptHistorySavedDraft =
  typeof PersistedComposerPromptHistorySavedDraft.Type;

const PersistedComposerThreadDraftState = Schema.Struct({
  prompt: Schema.String,
  productQueueTransfer: Schema.optionalKey(ProductPutQueueItemInput),
  // Set only while composer prompt-history browsing is active: the user's real
  // draft snapshot, kept safe while `prompt` temporarily holds a recalled history entry.
  promptHistorySavedDraft: Schema.optionalKey(PersistedComposerPromptHistorySavedDraft),
  attachments: Schema.Array(PersistedComposerImageAttachment),
  assistantSelections: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        assistantMessageId: Schema.String,
        text: Schema.String,
      }),
    ),
  ),
  browserAnnotations: Schema.optionalKey(Schema.Array(PersistedBrowserAnnotationDraft)),
  terminalContexts: Schema.optionalKey(Schema.Array(PersistedTerminalContextDraft)),
  fileComments: Schema.optionalKey(Schema.Array(PersistedFileCommentDraft)),
  pastedTexts: Schema.optionalKey(Schema.Array(PersistedPastedTextDraft)),
  skills: Schema.optionalKey(Schema.Array(ProviderSkillReference)),
  mentions: Schema.optionalKey(Schema.Array(ProviderMentionReference)),
  queuedTurns: Schema.optionalKey(Schema.Array(PersistedQueuedComposerTurn)),
  restoredSourceProposedPlan: Schema.optionalKey(PersistedRestoredSourceProposedPlan),
  modelSelectionByProvider: Schema.optionalKey(
    Schema.Record(HistoricalSourceIdSchema, HistoricalModelSelectionSchema),
  ),
  activeProvider: Schema.optionalKey(Schema.NullOr(HistoricalSourceIdSchema)),
  runtimeMode: Schema.optionalKey(RuntimeMode),
  interactionMode: Schema.optionalKey(ComposerInteractionModeSchema),
});

type PersistedComposerThreadDraftState = typeof PersistedComposerThreadDraftState.Type;

const PersistedDraftThreadState = Schema.Struct({
  projectId: ProjectId,
  createdAt: Schema.String,
  runtimeMode: RuntimeMode,
  interactionMode: ComposerInteractionModeSchema,
  entryPoint: DraftThreadEntryPointSchema,
  branch: Schema.NullOr(Schema.String),
  worktreePath: Schema.NullOr(Schema.String),
  workingDirectory: Schema.optionalKey(Schema.NullOr(Schema.String)),
  lastKnownPr: Schema.optionalKey(Schema.NullOr(ConversationPullRequestSummarySchema)),
  envMode: DraftThreadEnvModeSchema,
  isTemporary: Schema.optionalKey(Schema.Boolean),
  promotedTo: Schema.optionalKey(ThreadId),
  requestedSelection: Schema.optionalKey(ProductRequestedSelection),
});

type PersistedDraftThreadState = typeof PersistedDraftThreadState.Type;

export const PersistedComposerDraftStoreStateSchema = Schema.Struct({
  draftsByThreadId: Schema.Record(ThreadId, PersistedComposerThreadDraftState),
  draftThreadsByThreadId: Schema.Record(ThreadId, PersistedDraftThreadState),
  projectDraftThreadIdByProjectId: Schema.Record(ProjectId, ThreadId),
  stickyModelSelectionByProvider: Schema.Record(
    HistoricalSourceIdSchema,
    HistoricalModelSelectionSchema,
  ),
  stickyActiveProvider: Schema.NullOr(HistoricalSourceIdSchema),
}).annotate({ parseOptions: { onExcessProperty: "error" } });

export type PersistedComposerDraftStoreState = typeof PersistedComposerDraftStoreStateSchema.Type;

export const EMPTY_PERSISTED_DRAFT_STORE_STATE = Object.freeze<PersistedComposerDraftStoreState>({
  draftsByThreadId: {},
  draftThreadsByThreadId: {},
  projectDraftThreadIdByProjectId: {},
  stickyModelSelectionByProvider: {},
  stickyActiveProvider: null,
});


export function partializeComposerDraftStoreState(
  state: ComposerDraftStoreState,
): PersistedComposerDraftStoreState {
  const persistedDraftsByThreadId: DeepMutable<
    PersistedComposerDraftStoreState["draftsByThreadId"]
  > = {};
  for (const [threadId, draft] of Object.entries(state.draftsByThreadId)) {
    if (typeof threadId !== "string" || threadId.length === 0) {
      continue;
    }
    const persistedQueuedTurns: DeepMutable<
      NonNullable<PersistedComposerThreadDraftState["queuedTurns"]>
    > = [];
    for (const queuedTurn of draft.queuedTurns) {
      if (queuedTurn.kind === "chat") {
        // File attachments are intentionally in-memory only; persisting the
        // queued turn without them would make a later send incomplete.
        if (queuedTurn.files.length > 0) {
          continue;
        }
        const images = persistQueuedComposerImages(queuedTurn.images);
        if (images.length !== queuedTurn.images.length) {
          continue;
        }
        persistedQueuedTurns.push({
          id: queuedTurn.id,
          kind: "chat",
          createdAt: queuedTurn.createdAt,
          previewText: queuedTurn.previewText,
          prompt: queuedTurn.prompt,
          images,
          assistantSelections: queuedTurn.assistantSelections.map((selection) => ({
            id: selection.id,
            assistantMessageId: selection.assistantMessageId,
            text: selection.text,
          })),
          ...(queuedTurn.browserAnnotations.length > 0
            ? {
                browserAnnotations: queuedTurn.browserAnnotations.map(cloneBrowserAnnotation),
              }
            : {}),
          terminalContexts: queuedTurn.terminalContexts.map((context) => ({
            id: context.id,
            threadId: context.threadId,
            createdAt: context.createdAt,
            terminalId: context.terminalId,
            terminalLabel: context.terminalLabel,
            lineStart: context.lineStart,
            lineEnd: context.lineEnd,
            text: context.text,
          })),
          ...(queuedTurn.fileComments.length > 0
            ? {
                fileComments: queuedTurn.fileComments.map((comment) => ({
                  id: comment.id,
                  path: comment.path,
                  startLine: comment.startLine,
                  endLine: comment.endLine,
                  text: comment.text,
                })),
              }
            : {}),
          ...(queuedTurn.pastedTexts.length > 0
            ? {
                pastedTexts: queuedTurn.pastedTexts.map((pasted) => ({
                  id: pasted.id,
                  createdAt: pasted.createdAt,
                  text: pasted.text,
                })),
              }
            : {}),
          skills: [...queuedTurn.skills],
          mentions: [...queuedTurn.mentions],
          selectedProvider: queuedTurn.selectedProvider,
          selectedModel: queuedTurn.selectedModel,
          selectedPromptEffort: queuedTurn.selectedPromptEffort,
          modelSelection: queuedTurn.modelSelection,
          ...(queuedTurn.sourceProposedPlan
            ? { sourceProposedPlan: queuedTurn.sourceProposedPlan }
            : {}),
          runtimeMode: queuedTurn.runtimeMode,
          interactionMode: queuedTurn.interactionMode,
          envMode: queuedTurn.envMode,
        });
        continue;
      }
      persistedQueuedTurns.push({
        id: queuedTurn.id,
        kind: "plan-follow-up",
        createdAt: queuedTurn.createdAt,
        previewText: queuedTurn.previewText,
        text: queuedTurn.text,
        interactionMode: queuedTurn.interactionMode,
        selectedProvider: queuedTurn.selectedProvider,
        selectedModel: queuedTurn.selectedModel,
        selectedPromptEffort: queuedTurn.selectedPromptEffort,
        modelSelection: queuedTurn.modelSelection,
        runtimeMode: queuedTurn.runtimeMode,
      });
    }
    const hasModelData =
      Object.keys(draft.modelSelectionByProvider).length > 0 || draft.activeProvider !== null;
    const hasQueuedTurns = persistedQueuedTurns.length > 0;
    const hasReferenceData = draft.skills.length > 0 || draft.mentions.length > 0;
    if (
      draft.prompt.length === 0 &&
      draft.productQueueTransfer == null &&
      draft.promptHistorySavedDraft === null &&
      draft.persistedAttachments.length === 0 &&
      draft.assistantSelections.length === 0 &&
      draft.browserAnnotations.length === 0 &&
      draft.terminalContexts.length === 0 &&
      draft.fileComments.length === 0 &&
      draft.pastedTexts.length === 0 &&
      !hasReferenceData &&
      !hasQueuedTurns &&
      draft.restoredSourceProposedPlan == null &&
      !hasModelData &&
      draft.runtimeMode === null &&
      draft.interactionMode === null
    ) {
      continue;
    }
    const persistedDraft: DeepMutable<PersistedComposerThreadDraftState> = {
      prompt: draft.prompt,
      ...(draft.productQueueTransfer != null
        ? { productQueueTransfer: cloneProductQueueTransfer(draft.productQueueTransfer) }
        : {}),
      ...(draft.promptHistorySavedDraft !== null
        ? {
            promptHistorySavedDraft: {
              prompt: draft.promptHistorySavedDraft.prompt,
              attachments: draft.promptHistorySavedDraft.persistedAttachments.map(
                toStorageSafePersistedAttachment,
              ),
              ...(draft.promptHistorySavedDraft.assistantSelections.length > 0
                ? {
                    assistantSelections: draft.promptHistorySavedDraft.assistantSelections.map(
                      (selection) => ({
                        id: selection.id,
                        assistantMessageId: selection.assistantMessageId,
                        text: selection.text,
                      }),
                    ),
                  }
                : {}),
              ...(draft.promptHistorySavedDraft.browserAnnotations.length > 0
                ? {
                    browserAnnotations:
                      draft.promptHistorySavedDraft.browserAnnotations.map(cloneBrowserAnnotation),
                  }
                : {}),
              ...(draft.promptHistorySavedDraft.terminalContexts.length > 0
                ? {
                    terminalContexts: draft.promptHistorySavedDraft.terminalContexts.map(
                      (context) => ({
                        id: context.id,
                        threadId: context.threadId,
                        createdAt: context.createdAt,
                        terminalId: context.terminalId,
                        terminalLabel: context.terminalLabel,
                        lineStart: context.lineStart,
                        lineEnd: context.lineEnd,
                      }),
                    ),
                  }
                : {}),
              ...(draft.promptHistorySavedDraft.fileComments.length > 0
                ? {
                    fileComments: draft.promptHistorySavedDraft.fileComments.map((comment) => ({
                      id: comment.id,
                      path: comment.path,
                      startLine: comment.startLine,
                      endLine: comment.endLine,
                      text: comment.text,
                    })),
                  }
                : {}),
              ...(draft.promptHistorySavedDraft.pastedTexts.length > 0
                ? {
                    pastedTexts: draft.promptHistorySavedDraft.pastedTexts.map((pasted) => ({
                      id: pasted.id,
                      createdAt: pasted.createdAt,
                      text: pasted.text,
                    })),
                  }
                : {}),
              ...(draft.promptHistorySavedDraft.skills.length > 0
                ? { skills: [...draft.promptHistorySavedDraft.skills] }
                : {}),
              ...(draft.promptHistorySavedDraft.mentions.length > 0
                ? { mentions: [...draft.promptHistorySavedDraft.mentions] }
                : {}),
            },
          }
        : {}),
      attachments: draft.persistedAttachments.map(toStorageSafePersistedAttachment),
      ...(draft.assistantSelections.length > 0
        ? {
            assistantSelections: draft.assistantSelections.map((selection) => ({
              id: selection.id,
              assistantMessageId: selection.assistantMessageId,
              text: selection.text,
            })),
          }
        : {}),
      ...(draft.browserAnnotations.length > 0
        ? {
            browserAnnotations: draft.browserAnnotations.map(cloneBrowserAnnotation),
          }
        : {}),
      ...(draft.terminalContexts.length > 0
        ? {
            terminalContexts: draft.terminalContexts.map((context) => ({
              id: context.id,
              threadId: context.threadId,
              createdAt: context.createdAt,
              terminalId: context.terminalId,
              terminalLabel: context.terminalLabel,
              lineStart: context.lineStart,
              lineEnd: context.lineEnd,
            })),
          }
        : {}),
      ...(draft.fileComments.length > 0
        ? {
            fileComments: draft.fileComments.map((comment) => ({
              id: comment.id,
              path: comment.path,
              startLine: comment.startLine,
              endLine: comment.endLine,
              text: comment.text,
            })),
          }
        : {}),
      ...(draft.pastedTexts.length > 0
        ? {
            pastedTexts: draft.pastedTexts.map((pasted) => ({
              id: pasted.id,
              createdAt: pasted.createdAt,
              text: pasted.text,
            })),
          }
        : {}),
      ...(draft.skills.length > 0 ? { skills: [...draft.skills] } : {}),
      ...(draft.mentions.length > 0 ? { mentions: [...draft.mentions] } : {}),
      ...(hasQueuedTurns ? { queuedTurns: persistedQueuedTurns } : {}),
      ...(draft.restoredSourceProposedPlan
        ? { restoredSourceProposedPlan: draft.restoredSourceProposedPlan }
        : {}),
      ...(hasModelData
        ? {
            modelSelectionByProvider: sanitizeHistoricalModelSelectionMap(
              draft.modelSelectionByProvider,
            ),
            activeProvider: draft.activeProvider,
          }
        : {}),
      ...(draft.runtimeMode ? { runtimeMode: draft.runtimeMode } : {}),
      ...(draft.interactionMode ? { interactionMode: draft.interactionMode } : {}),
    };
    persistedDraftsByThreadId[threadId as ThreadId] = persistedDraft;
  }
  return {
    draftsByThreadId: persistedDraftsByThreadId,
    draftThreadsByThreadId: state.draftThreadsByThreadId,
    projectDraftThreadIdByProjectId: state.projectDraftThreadIdByProjectId,
    stickyModelSelectionByProvider: sanitizeHistoricalModelSelectionMap(
      state.stickyModelSelectionByProvider,
    ),
    stickyActiveProvider: state.stickyActiveProvider,
  };
}

export function normalizeCurrentPersistedComposerDraftStoreState(
  persistedState: unknown,
): PersistedComposerDraftStoreState {
  const decoded = Schema.decodeUnknownSync(PersistedComposerDraftStoreStateSchema)(persistedState);
  for (const draft of Object.values(decoded.draftsByThreadId)) {
    const hasSelections = Object.hasOwn(draft, "modelSelectionByProvider");
    const hasActiveProvider = Object.hasOwn(draft, "activeProvider");
    if (hasSelections !== hasActiveProvider) {
      throw new Error("Composer draft model selection fields must be present together.");
    }
  }
  return decoded;
}

function hydrateQueuedTurnsFromPersisted(
  threadId: ThreadId,
  queuedTurns: ReadonlyArray<PersistedQueuedComposerTurn> | undefined,
): QueuedComposerTurn[] {
  if (!queuedTurns || queuedTurns.length === 0) {
    return [];
  }
  return queuedTurns.map((queuedTurn) => {
    if (queuedTurn.kind === "chat") {
      return {
        ...queuedTurn,
        images: hydrateImagesFromPersisted(queuedTurn.images),
        files: [],
        assistantSelections: normalizeAssistantSelections(queuedTurn.assistantSelections ?? []),
        browserAnnotations: normalizeBrowserAnnotations(queuedTurn.browserAnnotations ?? []),
        terminalContexts: normalizeTerminalContextsForThread(threadId, queuedTurn.terminalContexts),
        fileComments: normalizeFileComments(queuedTurn.fileComments ?? []),
        pastedTexts: hydratePastedTextsFromPersisted(queuedTurn.pastedTexts),
        skills: [...queuedTurn.skills],
        mentions: [...queuedTurn.mentions],
      };
    }
    return { ...queuedTurn };
  });
}

function hydratePromptHistorySavedDraft(
  savedDraft: PersistedComposerPromptHistorySavedDraft | undefined,
): ComposerPromptHistorySavedDraft | null {
  if (savedDraft === undefined) {
    return null;
  }
  const attachments = savedDraft.attachments ?? [];
  return {
    prompt: savedDraft.prompt,
    images: hydrateImagesFromPersisted(attachments),
    files: [],
    nonPersistedImageIds: [],
    persistedAttachments: [...attachments],
    assistantSelections: normalizeAssistantSelections(savedDraft.assistantSelections ?? []),
    browserAnnotations: normalizeBrowserAnnotations(savedDraft.browserAnnotations ?? []),
    terminalContexts:
      savedDraft.terminalContexts?.map((context) => ({
        ...context,
        text: "",
      })) ?? [],
    fileComments: normalizeFileComments(savedDraft.fileComments ?? []),
    pastedTexts: hydratePastedTextsFromPersisted(savedDraft.pastedTexts),
    skills: [...(savedDraft.skills ?? [])],
    mentions: [...(savedDraft.mentions ?? [])],
  };
}

export function toHydratedThreadDraft(
  threadId: ThreadId,
  persistedDraft: PersistedComposerThreadDraftState,
): ComposerThreadDraftState {
  // Strict generation-1 decoding has already established this shape.
  const modelSelectionByProvider: Partial<Record<string, HistoricalModelSelection>> =
    sanitizeHistoricalModelSelectionMap(persistedDraft.modelSelectionByProvider ?? {});
  const activeProvider = normalizeHistoricalSourceId(persistedDraft.activeProvider) ?? null;

  return {
    prompt: persistedDraft.prompt,
    productQueueTransfer: persistedDraft.productQueueTransfer ?? null,
    promptHistorySavedDraft: hydratePromptHistorySavedDraft(persistedDraft.promptHistorySavedDraft),
    images: hydrateImagesFromPersisted(persistedDraft.attachments),
    files: [],
    nonPersistedImageIds: [],
    persistedAttachments: [...persistedDraft.attachments],
    assistantSelections: normalizeAssistantSelections(persistedDraft.assistantSelections ?? []),
    browserAnnotations: normalizeBrowserAnnotations(persistedDraft.browserAnnotations ?? []),
    terminalContexts:
      persistedDraft.terminalContexts?.map((context) => ({
        ...context,
        text: "",
      })) ?? [],
    fileComments: normalizeFileComments(persistedDraft.fileComments ?? []),
    pastedTexts: hydratePastedTextsFromPersisted(persistedDraft.pastedTexts),
    skills: [...(persistedDraft.skills ?? [])],
    mentions: [...(persistedDraft.mentions ?? [])],
    queuedTurns: hydrateQueuedTurnsFromPersisted(threadId, persistedDraft.queuedTurns),
    restoredSourceProposedPlan: persistedDraft.restoredSourceProposedPlan ?? null,
    modelSelectionByProvider,
    activeProvider,
    runtimeMode: persistedDraft.runtimeMode ?? null,
    interactionMode: persistedDraft.interactionMode ?? null,
  };
}

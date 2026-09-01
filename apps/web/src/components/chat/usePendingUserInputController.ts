// FILE: usePendingUserInputController.ts
// Purpose: Own the Web lifecycle for canonical Ask User interactions.
// Layer: Chat controller; Product State and presentation remain external.

import {
  type ApprovalRequestId,
  type CanonicalUserInputDraftV1,
  type CanonicalUserInputResponse,
  type OrchestrationPendingInteraction,
  type OrchestrationThreadActivity,
  type ThreadId,
  type TurnId,
} from "@harnessos/contracts";
import { respondingInteractionReclaimAt } from "@harnessos/shared/pendingInteractions";
import { pendingRequestInstanceKey } from "@harnessos/shared/threadSummary";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "../../i18n";
import { readNativeApi } from "../../nativeApi";
import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
  derivePendingUserInputSinglePresetAction,
  dispatchClaimedPendingUserInputResponse,
  type PendingUserInputDraftAnswer,
} from "../../pendingUserInput";
import { derivePendingUserInputs, type PendingUserInput } from "../../pendingInteractionDerivation";
import { newCommandId } from "../../lib/utils";

const EMPTY_PENDING_USER_INPUT_ANSWERS: Record<string, PendingUserInputDraftAnswer> = {};

const pendingUserInputClientKey = (
  threadId: ThreadId,
  requestId: ApprovalRequestId,
  lifecycleGeneration: string | undefined,
) => `${threadId}:${pendingRequestInstanceKey(requestId, lifecycleGeneration)}`;

export interface PendingUserInputControllerInput {
  readonly threadId: ThreadId | null;
  readonly activities: ReadonlyArray<OrchestrationThreadActivity>;
  readonly pendingInteractions: ReadonlyArray<OrchestrationPendingInteraction> | undefined;
  readonly authoritativeHasPending: boolean | undefined;
  readonly latestTurnId: TurnId | undefined;
  readonly threadDetailReady: boolean;
  readonly isFocusedPane: boolean;
  readonly scheduleComposerFocus: () => void;
  readonly reportSubmissionError: (threadId: ThreadId, message: string) => void;
}

export interface PendingUserInputControllerActive {
  readonly request: PendingUserInput;
  readonly answers: Record<string, PendingUserInputDraftAnswer>;
  readonly progress: ReturnType<typeof derivePendingUserInputProgress>;
  readonly isResponding: boolean;
}

export interface PendingUserInputController {
  readonly pendingUserInputs: PendingUserInput[];
  readonly active: PendingUserInputControllerActive | null;
  readonly actions: {
    readonly changeAnswer: (questionId: string, answer: PendingUserInputDraftAnswer) => void;
    readonly selectSinglePreset: (questionId: string, answer: PendingUserInputDraftAnswer) => void;
    readonly advance: () => boolean;
    readonly previous: () => void;
    readonly cancel: () => void;
    readonly flushDraft: () => void;
  };
}

function localAnswersFromCanonicalDraft(
  draft: CanonicalUserInputDraftV1 | null,
): Record<string, PendingUserInputDraftAnswer> {
  if (!draft) return {};
  return Object.fromEntries(
    Object.entries(draft.answers).map(([questionId, answer]) => [
      questionId,
      {
        selectedOptionLabels: [...answer.selectedOptionLabels],
        ...(answer.customText !== undefined ? { customText: answer.customText } : {}),
        ...(answer.customSelected === true ? { customSelected: true } : {}),
      },
    ]),
  );
}

function canonicalDraftFromLocal(
  answers: Record<string, PendingUserInputDraftAnswer>,
  activeQuestionIndex: number,
): CanonicalUserInputDraftV1 {
  return {
    version: 1,
    activeQuestionIndex,
    answers: Object.fromEntries(
      Object.entries(answers).map(([questionId, answer]) => [
        questionId,
        {
          selectedOptionLabels: [...(answer.selectedOptionLabels ?? [])],
          ...(answer.customText !== undefined ? { customText: answer.customText } : {}),
          ...(answer.customSelected === true ? { customSelected: true } : {}),
        },
      ]),
    ),
  };
}

function nextUserInputResponseReclaimAt(
  pendingInteractions: ReadonlyArray<OrchestrationPendingInteraction> | undefined,
): string | null {
  let earliest: string | null = null;
  for (const interaction of pendingInteractions ?? []) {
    if (interaction.interactionKind !== "userInput" || interaction.status !== "responding") {
      continue;
    }
    if (interaction.responseRequestedAt === null) return new Date(0).toISOString();
    const reclaimAt = respondingInteractionReclaimAt(interaction.responseRequestedAt);
    if (earliest === null || reclaimAt < earliest) earliest = reclaimAt;
  }
  return earliest;
}

export function usePendingUserInputController(
  input: PendingUserInputControllerInput,
): PendingUserInputController {
  const {
    threadId,
    activities,
    pendingInteractions,
    authoritativeHasPending,
    latestTurnId,
    threadDetailReady,
    isFocusedPane,
    scheduleComposerFocus,
    reportSubmissionError,
  } = input;
  const { t } = useI18n();
  const [respondingKeys, setRespondingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [answersByRequestKey, setAnswersByRequestKey] = useState<
    Record<string, Record<string, PendingUserInputDraftAnswer>>
  >({});
  const answersByRequestKeyRef = useRef(answersByRequestKey);
  const [questionIndexByRequestKey, setQuestionIndexByRequestKey] = useState<
    Record<string, number>
  >({});
  const questionIndexByRequestKeyRef = useRef(questionIndexByRequestKey);
  const initializedDraftKeysRef = useRef<Set<string>>(new Set());
  const lastDurableDraftByKeyRef = useRef<Map<string, string>>(new Map());
  const latestDraftWriteSerialByKeyRef = useRef<Map<string, number>>(new Map());
  const dirtyDraftKeysRef = useRef<Set<string>>(new Set());
  const inFlightDraftWritesByKeyRef = useRef<
    Map<string, { readonly fingerprint: string; readonly promise: Promise<boolean> }>
  >(new Map());
  const draftWriteSerialRef = useRef(0);
  const draftWriteTimerRef = useRef<number | null>(null);
  const claimedResponseKeysRef = useRef<Set<string>>(new Set());
  const previousPendingKeysByThreadRef = useRef<Map<ThreadId, Set<string>>>(new Map());
  const previousActiveThreadRef = useRef<ThreadId | null>(null);

  const reclaimAt = useMemo(
    () => nextUserInputResponseReclaimAt(pendingInteractions),
    [pendingInteractions],
  );
  const [responseClaimReferenceAt, setResponseClaimReferenceAt] = useState(() =>
    new Date().toISOString(),
  );
  useEffect(() => {
    if (reclaimAt === null) return;
    const delayMs = Math.max(0, Date.parse(reclaimAt) - Date.now());
    const timeoutId = window.setTimeout(() => {
      setResponseClaimReferenceAt(new Date().toISOString());
    }, delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [reclaimAt]);

  const pendingUserInputs = useMemo(
    () =>
      derivePendingUserInputs(activities, pendingInteractions, {
        authoritativeHasPending,
        latestTurnId,
        responseClaimReferenceAt,
      }),
    [
      activities,
      authoritativeHasPending,
      latestTurnId,
      pendingInteractions,
      responseClaimReferenceAt,
    ],
  );
  const activeRequest = pendingUserInputs[0] ?? null;
  const activeRequestKey =
    activeRequest && threadId
      ? pendingUserInputClientKey(
          threadId,
          activeRequest.requestId,
          activeRequest.lifecycleGeneration,
        )
      : null;
  const activeAnswers = activeRequestKey
    ? (answersByRequestKey[activeRequestKey] ?? EMPTY_PENDING_USER_INPUT_ANSWERS)
    : EMPTY_PENDING_USER_INPUT_ANSWERS;
  const activeQuestionIndex = activeRequestKey
    ? (questionIndexByRequestKey[activeRequestKey] ?? 0)
    : 0;
  const activeProgress = useMemo(
    () =>
      activeRequest
        ? derivePendingUserInputProgress(
            activeRequest.questions,
            activeAnswers,
            activeQuestionIndex,
          )
        : null,
    [activeAnswers, activeQuestionIndex, activeRequest],
  );
  const activeIsResponding = activeRequestKey
    ? respondingKeys.has(activeRequestKey) || activeRequest?.responseClaimable === false
    : false;

  useEffect(() => {
    if (
      !activeRequestKey ||
      !activeRequest ||
      initializedDraftKeysRef.current.has(activeRequestKey)
    ) {
      return;
    }
    initializedDraftKeysRef.current.add(activeRequestKey);
    if (!activeRequest.draft) return;
    const restoredAnswers = localAnswersFromCanonicalDraft(activeRequest.draft);
    const nextAnswersByRequestKey = {
      ...answersByRequestKeyRef.current,
      [activeRequestKey]: restoredAnswers,
    };
    answersByRequestKeyRef.current = nextAnswersByRequestKey;
    setAnswersByRequestKey(nextAnswersByRequestKey);
    const nextQuestionIndexes = {
      ...questionIndexByRequestKeyRef.current,
      [activeRequestKey]: activeRequest.draft.activeQuestionIndex,
    };
    questionIndexByRequestKeyRef.current = nextQuestionIndexes;
    setQuestionIndexByRequestKey(nextQuestionIndexes);
    lastDurableDraftByKeyRef.current.set(activeRequestKey, JSON.stringify(activeRequest.draft));
  }, [activeRequest, activeRequestKey]);

  useEffect(() => {
    if (!threadId || !threadDetailReady) return;

    const threadKeyPrefix = `${threadId}:`;
    const currentKeys = new Set(
      pendingUserInputs.map((request) =>
        pendingUserInputClientKey(threadId, request.requestId, request.lifecycleGeneration),
      ),
    );
    const previousKeys = previousPendingKeysByThreadRef.current.get(threadId) ?? new Set<string>();
    const stayedOnSameActiveThread = previousActiveThreadRef.current === threadId;
    const locallyRetryableKeys = new Set(
      pendingUserInputs
        .filter(
          (request) =>
            request.settlementStatus === "retryable" ||
            request.settlementStatus === "uncertain" ||
            (request.settlementStatus === "responding" && request.responseClaimable === true),
        )
        .map((request) =>
          pendingUserInputClientKey(threadId, request.requestId, request.lifecycleGeneration),
        ),
    );

    let removedResolvedRequest = false;
    for (const key of previousKeys) {
      if (!currentKeys.has(key)) {
        removedResolvedRequest = true;
        claimedResponseKeysRef.current.delete(key);
        initializedDraftKeysRef.current.delete(key);
        lastDurableDraftByKeyRef.current.delete(key);
        latestDraftWriteSerialByKeyRef.current.delete(key);
        dirtyDraftKeysRef.current.delete(key);
        inFlightDraftWritesByKeyRef.current.delete(key);
      }
    }
    for (const key of locallyRetryableKeys) claimedResponseKeysRef.current.delete(key);

    const nextAnswers = { ...answersByRequestKeyRef.current };
    let answersChanged = false;
    for (const key of Object.keys(nextAnswers)) {
      if (key.startsWith(threadKeyPrefix) && !currentKeys.has(key)) {
        delete nextAnswers[key];
        answersChanged = true;
      }
    }
    if (answersChanged) {
      answersByRequestKeyRef.current = nextAnswers;
      setAnswersByRequestKey(nextAnswers);
    }
    setQuestionIndexByRequestKey((existing) => {
      let changed = false;
      const next = { ...existing };
      for (const key of Object.keys(next)) {
        if (key.startsWith(threadKeyPrefix) && !currentKeys.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      if (changed) questionIndexByRequestKeyRef.current = next;
      return changed ? next : existing;
    });
    setRespondingKeys((existing) => {
      const next = new Set(existing);
      for (const key of existing) {
        if (
          key.startsWith(threadKeyPrefix) &&
          (!currentKeys.has(key) || locallyRetryableKeys.has(key))
        ) {
          next.delete(key);
        }
      }
      return next.size === existing.size ? existing : next;
    });

    previousPendingKeysByThreadRef.current.set(threadId, currentKeys);
    previousActiveThreadRef.current = threadId;
    if (stayedOnSameActiveThread && removedResolvedRequest && isFocusedPane) {
      scheduleComposerFocus();
    }
  }, [isFocusedPane, pendingUserInputs, scheduleComposerFocus, threadDetailReady, threadId]);

  const setQuestionIndex = useCallback(
    (nextQuestionIndex: number) => {
      if (!activeRequestKey) return;
      const next = {
        ...questionIndexByRequestKeyRef.current,
        [activeRequestKey]: nextQuestionIndex,
      };
      questionIndexByRequestKeyRef.current = next;
      setQuestionIndexByRequestKey(next);
      dirtyDraftKeysRef.current.add(activeRequestKey);
    },
    [activeRequestKey],
  );

  const flushActiveDraft = useCallback(
    async (options: { readonly allowUnfocused?: boolean } = {}): Promise<boolean> => {
      if (draftWriteTimerRef.current !== null) {
        window.clearTimeout(draftWriteTimerRef.current);
        draftWriteTimerRef.current = null;
      }
      if (
        !threadId ||
        !activeRequest ||
        !activeRequestKey ||
        activeRequest.settlementStatus !== "pending" ||
        activeIsResponding ||
        (!isFocusedPane && options.allowUnfocused !== true)
      ) {
        return false;
      }
      if (!dirtyDraftKeysRef.current.has(activeRequestKey)) return true;
      const api = readNativeApi();
      if (!api) return false;
      const draft = canonicalDraftFromLocal(
        answersByRequestKeyRef.current[activeRequestKey] ?? {},
        questionIndexByRequestKeyRef.current[activeRequestKey] ?? 0,
      );
      const fingerprint = JSON.stringify(draft);
      if (lastDurableDraftByKeyRef.current.get(activeRequestKey) === fingerprint) return true;
      const existingWrite = inFlightDraftWritesByKeyRef.current.get(activeRequestKey);
      if (existingWrite?.fingerprint === fingerprint) return existingWrite.promise;

      const writeSerial = ++draftWriteSerialRef.current;
      latestDraftWriteSerialByKeyRef.current.set(activeRequestKey, writeSerial);
      const writePromise = api.orchestration
        .updatePendingUserInputDraft({
          threadId,
          requestId: activeRequest.requestId,
          lifecycleGeneration: activeRequest.lifecycleGeneration ?? null,
          draft,
        })
        .then((result) => {
          if (latestDraftWriteSerialByKeyRef.current.get(activeRequestKey) !== writeSerial) {
            return result.updated;
          }
          if (result.updated) {
            lastDurableDraftByKeyRef.current.set(activeRequestKey, fingerprint);
            const currentFingerprint = JSON.stringify(
              canonicalDraftFromLocal(
                answersByRequestKeyRef.current[activeRequestKey] ?? {},
                questionIndexByRequestKeyRef.current[activeRequestKey] ?? 0,
              ),
            );
            if (currentFingerprint === fingerprint)
              dirtyDraftKeysRef.current.delete(activeRequestKey);
          }
          return result.updated;
        })
        .catch(() => false);
      const write = { fingerprint, promise: writePromise };
      inFlightDraftWritesByKeyRef.current.set(activeRequestKey, write);
      try {
        return await writePromise;
      } finally {
        if (inFlightDraftWritesByKeyRef.current.get(activeRequestKey) === write) {
          inFlightDraftWritesByKeyRef.current.delete(activeRequestKey);
        }
      }
    },
    [activeIsResponding, activeRequest, activeRequestKey, isFocusedPane, threadId],
  );

  useEffect(() => {
    if (
      !isFocusedPane ||
      !activeRequestKey ||
      activeRequest?.settlementStatus !== "pending" ||
      activeIsResponding
    ) {
      return;
    }
    if (draftWriteTimerRef.current !== null) window.clearTimeout(draftWriteTimerRef.current);
    draftWriteTimerRef.current = window.setTimeout(() => {
      draftWriteTimerRef.current = null;
      void flushActiveDraft();
    }, 250);
    return () => {
      if (draftWriteTimerRef.current !== null) {
        window.clearTimeout(draftWriteTimerRef.current);
        draftWriteTimerRef.current = null;
      }
    };
  }, [
    activeAnswers,
    activeIsResponding,
    activeQuestionIndex,
    activeRequest?.settlementStatus,
    activeRequestKey,
    flushActiveDraft,
    isFocusedPane,
  ]);

  useEffect(() => {
    if (!isFocusedPane) return;
    return () => {
      void flushActiveDraft({ allowUnfocused: true });
    };
  }, [flushActiveDraft, isFocusedPane]);

  useEffect(() => {
    const flushForPageLoss = () => {
      if (document.visibilityState === "hidden") {
        void flushActiveDraft({ allowUnfocused: true });
      }
    };
    const flushForPageHide = () => void flushActiveDraft({ allowUnfocused: true });
    document.addEventListener("visibilitychange", flushForPageLoss);
    window.addEventListener("pagehide", flushForPageHide);
    return () => {
      document.removeEventListener("visibilitychange", flushForPageLoss);
      window.removeEventListener("pagehide", flushForPageHide);
    };
  }, [flushActiveDraft]);

  const changeAnswer = useCallback(
    (questionId: string, answer: PendingUserInputDraftAnswer) => {
      if (!activeRequestKey || activeIsResponding) return;
      const nextRequestAnswers = {
        ...answersByRequestKeyRef.current[activeRequestKey],
        [questionId]: answer,
      };
      const nextAnswersByRequestKey = {
        ...answersByRequestKeyRef.current,
        [activeRequestKey]: nextRequestAnswers,
      };
      answersByRequestKeyRef.current = nextAnswersByRequestKey;
      setAnswersByRequestKey(nextAnswersByRequestKey);
      dirtyDraftKeysRef.current.add(activeRequestKey);
    },
    [activeIsResponding, activeRequestKey],
  );

  const respond = useCallback(
    async (
      threadId: ThreadId,
      request: PendingUserInput,
      response: CanonicalUserInputResponse,
    ): Promise<boolean> => {
      const api = readNativeApi();
      if (!api) return false;
      const requestKey = pendingUserInputClientKey(
        threadId,
        request.requestId,
        request.lifecycleGeneration,
      );
      try {
        return await dispatchClaimedPendingUserInputResponse({
          claimedKeys: claimedResponseKeysRef.current,
          key: requestKey,
          dispatch: async () => {
            await flushActiveDraft({ allowUnfocused: true });
            setRespondingKeys((existing) => new Set(existing).add(requestKey));
            await api.orchestration.dispatchCommand({
              type: "thread.user-input.respond",
              commandId: newCommandId(),
              threadId,
              requestId: request.requestId,
              response,
              ...(request.lifecycleGeneration !== undefined
                ? { lifecycleGeneration: request.lifecycleGeneration }
                : {}),
              createdAt: new Date().toISOString(),
            });
          },
        });
      } catch {
        setRespondingKeys((existing) => {
          if (!existing.has(requestKey)) return existing;
          const next = new Set(existing);
          next.delete(requestKey);
          return next;
        });
        reportSubmissionError(threadId, t("pendingInput.submitFailed"));
        return false;
      }
    },
    [flushActiveDraft, reportSubmissionError, t],
  );

  const selectSinglePreset = useCallback(
    (questionId: string, answer: PendingUserInputDraftAnswer) => {
      if (
        !threadId ||
        !activeRequestKey ||
        !activeRequest ||
        !activeProgress ||
        activeIsResponding
      ) {
        return;
      }
      const currentAnswers = answersByRequestKeyRef.current[activeRequestKey] ?? activeAnswers;
      const action = derivePendingUserInputSinglePresetAction(
        activeRequest.questions,
        currentAnswers,
        activeProgress.questionIndex,
        questionId,
        answer,
      );
      changeAnswer(questionId, answer);
      if (action?.kind === "question") {
        setQuestionIndex(action.questionIndex);
      } else if (action?.kind === "submit") {
        void respond(threadId, activeRequest, {
          status: "answered",
          answers: action.answers,
        });
      }
    },
    [
      activeAnswers,
      activeIsResponding,
      activeProgress,
      activeRequest,
      activeRequestKey,
      changeAnswer,
      respond,
      setQuestionIndex,
      threadId,
    ],
  );

  const advance = useCallback((): boolean => {
    if (
      !threadId ||
      !activeRequest ||
      !activeRequestKey ||
      !activeProgress ||
      activeIsResponding ||
      !activeProgress.canAdvance
    ) {
      return false;
    }
    const draftAnswers = answersByRequestKeyRef.current[activeRequestKey] ?? activeAnswers;
    const resolvedAnswers = buildPendingUserInputAnswers(activeRequest.questions, draftAnswers);
    if (activeProgress.isLastQuestion) {
      if (!resolvedAnswers) return false;
      void respond(threadId, activeRequest, {
        status: "answered",
        answers: resolvedAnswers,
      });
      return true;
    }
    setQuestionIndex(activeProgress.questionIndex + 1);
    return true;
  }, [
    activeAnswers,
    activeIsResponding,
    activeProgress,
    activeRequest,
    activeRequestKey,
    respond,
    setQuestionIndex,
    threadId,
  ]);

  const previous = useCallback(() => {
    if (!activeProgress) return;
    setQuestionIndex(Math.max(activeProgress.questionIndex - 1, 0));
  }, [activeProgress, setQuestionIndex]);

  const cancel = useCallback(() => {
    if (!threadId || !activeRequest || activeIsResponding) return;
    void respond(threadId, activeRequest, { status: "cancelled" });
  }, [activeIsResponding, activeRequest, respond, threadId]);

  return {
    pendingUserInputs,
    active:
      activeRequest && activeProgress
        ? {
            request: activeRequest,
            answers: activeAnswers,
            progress: activeProgress,
            isResponding: activeIsResponding,
          }
        : null,
    actions: {
      changeAnswer,
      selectSinglePreset,
      advance,
      previous,
      cancel,
      flushDraft: () => void flushActiveDraft({ allowUnfocused: true }),
    },
  };
}

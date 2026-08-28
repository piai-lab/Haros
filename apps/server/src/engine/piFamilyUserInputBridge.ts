import crypto from "node:crypto";

import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { ASK_USER_TOOL_NAME, type AskUserResult, type AskUserToolInput } from "@harnessos/oa-ask";
import {
  ApprovalRequestId,
  type CanonicalUserInputResponse,
  type CanonicalUserInputSettlement,
  type EngineKind,
  type EngineRuntimeEvent,
  type EngineUserInputAnswers,
  EventId,
  RuntimeRequestId,
  type ThreadId,
  type TurnId,
  type UserInputQuestion,
} from "@harnessos/contracts";

import { askUserMetrics } from "./askUserMetrics.ts";
import { projectAskUserRequest, resolveAskUserResponse } from "./askUserHostBridge.ts";
import {
  canonicalUserInputRequestFromQuestions,
  encodeCanonicalUserInputResponse,
} from "./canonicalUserInput.ts";
import { userInputPresenterRegistry } from "./userInputPresenterRegistry.ts";

export interface PiPendingUserInput {
  readonly turnId?: TurnId;
  readonly resolve: (settlement: CanonicalUserInputSettlement) => void;
  readonly settleAborted: (emitRuntimeEvent?: boolean) => void;
}

export interface PiPendingProductUserInput {
  readonly requestId: ApprovalRequestId;
  readonly sessionGeneration?: string;
  readonly turnId?: TurnId;
  readonly toolCallId: string;
  readonly resolve: (response: CanonicalUserInputResponse) => boolean;
  readonly settleAborted: (emitRuntimeEvent?: boolean) => void;
  readonly settleStale: () => void;
}

export interface PiCanonicalUserInputToolCall {
  readonly toolName: string;
  canonicalUserInputLifecycle?: "candidate" | "projected";
}

export interface PiExtensionUserInputContext {
  readonly session: { readonly threadId: ThreadId };
  readonly lifecycleGeneration?: string;
  readonly activeTurnId: TurnId | undefined;
  readonly pendingUserInputs: Map<ApprovalRequestId, PiPendingUserInput>;
  readonly pendingProductUserInputs: Map<ApprovalRequestId, PiPendingProductUserInput>;
  readonly settledProductUserInputIds: Set<ApprovalRequestId>;
  readonly activeToolItems: ReadonlyMap<string, PiCanonicalUserInputToolCall>;
  readonly stopped: boolean;
}

export interface PiUserInputOptionMapping {
  readonly value: string;
  readonly option: UserInputQuestion["options"][number];
}

interface PiRuntimeEventBase {
  readonly eventId: EventId;
  readonly engine: EngineKind;
  readonly threadId: ThreadId;
  readonly createdAt: string;
  readonly lifecycleGeneration?: string;
  readonly turnId?: TurnId;
}

function trimToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function makePiUserInputOption(label: string): UserInputQuestion["options"][number] {
  const normalizedLabel = trimToUndefined(label) ?? "Option";
  return { label: normalizedLabel, description: normalizedLabel };
}

export function makePiUserInputOptions(
  labels: ReadonlyArray<string>,
): ReadonlyArray<PiUserInputOptionMapping> {
  const labelCounts = new Map<string, number>();
  return labels.map((label, index) => {
    const baseLabel = trimToUndefined(label) ?? `Option ${index + 1}`;
    const count = (labelCounts.get(baseLabel) ?? 0) + 1;
    labelCounts.set(baseLabel, count);
    const displayLabel = count === 1 ? baseLabel : `${baseLabel} (${count})`;
    return {
      value: label,
      option: { label: displayLabel, description: baseLabel },
    };
  });
}

function firstPiUserInputAnswer(
  answers: EngineUserInputAnswers,
  questionId: string,
): string | undefined {
  const answer = answers[questionId];
  if (typeof answer === "string") {
    return trimToUndefined(answer);
  }
  if (Array.isArray(answer)) {
    return trimToUndefined(answer.find((entry) => typeof entry === "string"));
  }
  return undefined;
}

export const PLAIN_PI_EXTENSION_THEME = {
  fg(_color: string, text: string) {
    return text;
  },
  bg(_color: string, text: string) {
    return text;
  },
  bold(text: string) {
    return text;
  },
  italic(text: string) {
    return text;
  },
  underline(text: string) {
    return text;
  },
  inverse(text: string) {
    return text;
  },
  strikethrough(text: string) {
    return text;
  },
  getFgAnsi() {
    return "";
  },
  getBgAnsi() {
    return "";
  },
  getColorMode() {
    return "truecolor";
  },
  getThinkingBorderColor() {
    return (text: string) => text;
  },
  getBashModeBorderColor() {
    return (text: string) => text;
  },
} as unknown as ExtensionUIContext["theme"];

/** Owns Pi Extension UI projection onto HarnessOS's canonical user-input lifecycle. */
export function makePiFamilyUserInputBridge<C extends PiExtensionUserInputContext>(config: {
  readonly displayName: string;
  readonly extensionLabel: string;
  readonly makeEventBase: (
    context: C,
    options?: { readonly includeTurnId?: boolean },
  ) => PiRuntimeEventBase;
  readonly offerRuntimeEvent: (event: EngineRuntimeEvent) => void;
}): {
  readonly makeExtensionUIContext: (context: C) => ExtensionUIContext;
  readonly requestProductAskUser: (
    context: C,
    input: {
      readonly toolCallId: string;
      readonly request: AskUserToolInput;
      readonly signal?: AbortSignal;
    },
  ) => Promise<AskUserResult>;
  readonly resolveExtensionUserInput: (
    context: C,
    requestId: ApprovalRequestId,
    response: CanonicalUserInputResponse,
  ) => boolean;
} {
  const resolveExtensionUserInput = (
    context: C,
    requestId: ApprovalRequestId,
    response: CanonicalUserInputResponse,
  ): boolean => {
    const pending = context.pendingUserInputs.get(requestId);
    if (!pending) return false;
    pending.resolve(response);
    return true;
  };

  const requestProductAskUser = (
    context: C,
    input: {
      readonly toolCallId: string;
      readonly request: AskUserToolInput;
      readonly signal?: AbortSignal;
    },
  ): Promise<AskUserResult> => {
    const requestId = ApprovalRequestId.makeUnsafe(crypto.randomUUID());
    const runtimeRequestId = RuntimeRequestId.makeUnsafe(requestId);
    const terminal = (status: Exclude<AskUserResult["status"], "answered">): AskUserResult => ({
      version: 1,
      requestId,
      status,
    });
    if (context.stopped) return Promise.resolve(terminal("stale"));
    if (input.signal?.aborted) return Promise.resolve(terminal("aborted"));
    const projection = projectAskUserRequest(input.request);
    const trackedToolCall = context.activeToolItems.get(input.toolCallId);
    if (
      trackedToolCall?.toolName === ASK_USER_TOOL_NAME &&
      trackedToolCall.canonicalUserInputLifecycle === "candidate"
    ) {
      trackedToolCall.canonicalUserInputLifecycle = "projected";
    }
    const requestedAt = Date.now();
    askUserMetrics.increment("requested");

    if (!userInputPresenterRegistry.available) {
      const result = terminal("unavailable");
      config.offerRuntimeEvent({
        ...config.makeEventBase(context),
        type: "user-input.requested",
        requestId: runtimeRequestId,
        payload: projection.request,
      });
      config.offerRuntimeEvent({
        ...config.makeEventBase(context),
        type: "user-input.resolved",
        requestId: runtimeRequestId,
        payload: { settlement: { status: "unavailable" } },
      });
      askUserMetrics.settle("unavailable", Date.now() - requestedAt);
      return Promise.resolve(result);
    }

    return new Promise((resolve) => {
      let settled = false;
      let removeUnavailableListener: () => void = () => undefined;
      let removeAbortListener: () => void = () => undefined;
      const cleanup = () => {
        removeUnavailableListener();
        removeAbortListener();
        context.pendingProductUserInputs.delete(requestId);
      };
      const finish = (
        result: AskUserResult,
        settlement: CanonicalUserInputSettlement,
        emitSettlement = true,
      ) => {
        if (settled) return;
        settled = true;
        askUserMetrics.settle(result.status, Date.now() - requestedAt);
        cleanup();
        context.settledProductUserInputIds.add(requestId);
        if (context.settledProductUserInputIds.size > 128) {
          const oldest = context.settledProductUserInputIds.values().next().value;
          if (oldest !== undefined) context.settledProductUserInputIds.delete(oldest);
        }
        if (emitSettlement) {
          config.offerRuntimeEvent({
            ...config.makeEventBase(context),
            type: "user-input.resolved",
            requestId: runtimeRequestId,
            payload: { settlement },
            raw: {
              source: "pi.sdk.event",
              method: "ask_user/settled",
              payload: { requestId, toolCallId: input.toolCallId, status: result.status },
            },
          });
        }
        resolve(result);
      };
      const settleStatus = (
        status: Exclude<AskUserResult["status"], "answered">,
        emitSettlement = true,
      ) => finish(terminal(status), { status }, emitSettlement);
      const respond = (response: CanonicalUserInputResponse): boolean => {
        if (settled) return false;
        if (response.status === "cancelled") {
          settleStatus("cancelled");
          return true;
        }
        const result = resolveAskUserResponse({
          request: input.request,
          projection,
          response,
          requestId,
        });
        if (!result || result.status !== "answered") return false;
        finish(result, { status: "answered", answers: response.answers });
        return true;
      };
      context.pendingProductUserInputs.set(requestId, {
        requestId,
        ...(context.lifecycleGeneration === undefined
          ? {}
          : { sessionGeneration: context.lifecycleGeneration }),
        ...(context.activeTurnId === undefined ? {} : { turnId: context.activeTurnId }),
        toolCallId: input.toolCallId,
        resolve: respond,
        settleAborted: (emitSettlement = true) => settleStatus("aborted", emitSettlement),
        settleStale: () => settleStatus("stale"),
      });
      removeUnavailableListener = userInputPresenterRegistry.onUnavailable(() =>
        settleStatus("unavailable"),
      );
      if (!userInputPresenterRegistry.available) {
        userInputPresenterRegistry.handoffUnavailable(() => settleStatus("unavailable"));
      }
      if (input.signal) {
        const abort = () => settleStatus("aborted");
        input.signal.addEventListener("abort", abort, { once: true });
        removeAbortListener = () => input.signal?.removeEventListener("abort", abort);
      }
      config.offerRuntimeEvent({
        ...config.makeEventBase(context),
        type: "user-input.requested",
        requestId: runtimeRequestId,
        payload: projection.request,
        raw: {
          source: "pi.sdk.event",
          method: "ask_user/requested",
          payload: {
            requestId,
            toolCallId: input.toolCallId,
            questionCount: projection.request.questions.length,
          },
        },
      });
    });
  };

  const requestExtensionUserInput = (
    context: C,
    input: {
      readonly method: string;
      readonly question: UserInputQuestion;
      readonly opts?: Parameters<ExtensionUIContext["select"]>[2];
      readonly rawPayload?: Record<string, unknown>;
    },
  ): Promise<EngineUserInputAnswers> => {
    if (context.stopped || input.opts?.signal?.aborted) {
      return Promise.resolve({});
    }

    const requestId = ApprovalRequestId.makeUnsafe(crypto.randomUUID());
    const runtimeRequestId = RuntimeRequestId.makeUnsafe(requestId);
    const canonicalRequest = canonicalUserInputRequestFromQuestions([input.question]);

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let abort: () => void = () => undefined;
      let removeUnavailableListener: () => void = () => undefined;

      const cleanup = () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        input.opts?.signal?.removeEventListener("abort", abort);
        removeUnavailableListener();
      };
      const finish = (settlement: CanonicalUserInputSettlement, emitRuntimeEvent = true) => {
        if (settled) return;
        settled = true;
        cleanup();
        context.pendingUserInputs.delete(requestId);
        if (emitRuntimeEvent) {
          config.offerRuntimeEvent({
            ...config.makeEventBase(context),
            type: "user-input.resolved",
            requestId: runtimeRequestId,
            payload: { settlement },
            raw: {
              source: "pi.sdk.event",
              method: `${input.method}/settled`,
              payload: { requestId, status: settlement.status },
            },
          });
        }
        resolve(
          settlement.status === "answered"
            ? encodeCanonicalUserInputResponse(settlement).answers
            : {},
        );
      };
      abort = () => finish({ status: "aborted" });

      context.pendingUserInputs.set(requestId, {
        ...(context.activeTurnId === undefined ? {} : { turnId: context.activeTurnId }),
        resolve: finish,
        settleAborted: (emitRuntimeEvent = true) => finish({ status: "aborted" }, emitRuntimeEvent),
      });
      if (typeof input.opts?.timeout === "number" && input.opts.timeout > 0) {
        timeoutId = setTimeout(() => finish({ status: "timed_out" }), input.opts.timeout);
      }
      input.opts?.signal?.addEventListener("abort", abort, { once: true });

      config.offerRuntimeEvent({
        ...config.makeEventBase(context),
        type: "user-input.requested",
        requestId: runtimeRequestId,
        payload: canonicalRequest,
        raw: {
          source: "pi.sdk.event",
          method: input.method,
          payload: input.rawPayload ?? { requestId, question: input.question },
        },
      });
      removeUnavailableListener = userInputPresenterRegistry.onUnavailable(() =>
        finish({ status: "unavailable" }),
      );
      if (!userInputPresenterRegistry.available) {
        userInputPresenterRegistry.handoffUnavailable(() => finish({ status: "unavailable" }));
      }
    });
  };

  const makeExtensionUIContext = (context: C): ExtensionUIContext => {
    const unsupportedWarnings = new Set<string>();
    const statusTexts = new Map<string, string>();
    let workingMessage: string | undefined;
    const warnUnsupported = (method: string) => {
      if (unsupportedWarnings.has(method)) return;
      unsupportedWarnings.add(method);
      config.offerRuntimeEvent({
        ...config.makeEventBase(context, { includeTurnId: false }),
        type: "runtime.warning",
        payload: {
          message: `${config.extensionLabel} UI API '${method}' is not supported in HarnessOS yet.`,
          detail: { method },
        },
        raw: {
          source: "pi.sdk.event",
          method: "extension/ui-unsupported",
          payload: { method },
        },
      });
    };
    const emitPluginProgress = (summary: string) => {
      const normalized = trimToUndefined(summary);
      if (!normalized) return;
      config.offerRuntimeEvent({
        ...config.makeEventBase(context),
        type: "tool.progress",
        payload: { toolName: config.extensionLabel, summary: normalized },
        raw: {
          source: "pi.sdk.event",
          method: "extension/ui-progress",
          payload: { summary: normalized },
        },
      });
    };

    const uiContext: ExtensionUIContext = {
      async select(title, options, opts) {
        const questionId = "selection";
        const optionMappings = makePiUserInputOptions(options);
        const answers = await requestExtensionUserInput(context, {
          method: "extension/ui/select",
          opts,
          question: {
            id: questionId,
            header: trimToUndefined(title) ?? config.extensionLabel,
            question: trimToUndefined(title) ?? "Choose an option.",
            options: optionMappings.map((mapping) => mapping.option),
          },
          rawPayload: { title, options },
        });
        const answer = firstPiUserInputAnswer(answers, questionId);
        return optionMappings.find((mapping) => mapping.option.label === answer)?.value;
      },
      async confirm(title, message, opts) {
        const questionId = "confirmation";
        const answers = await requestExtensionUserInput(context, {
          method: "extension/ui/confirm",
          opts,
          question: {
            id: questionId,
            header: trimToUndefined(title) ?? config.extensionLabel,
            question: trimToUndefined(message) ?? trimToUndefined(title) ?? "Confirm this action?",
            options: [makePiUserInputOption("Yes"), makePiUserInputOption("No")],
          },
          rawPayload: { title, message },
        });
        return firstPiUserInputAnswer(answers, questionId) === "Yes";
      },
      async input(title, placeholder, opts) {
        const questionId = "input";
        const answers = await requestExtensionUserInput(context, {
          method: "extension/ui/input",
          opts,
          question: {
            id: questionId,
            header: trimToUndefined(title) ?? config.extensionLabel,
            question: trimToUndefined(placeholder) ?? trimToUndefined(title) ?? "Type a response.",
            options: [],
          },
          rawPayload: { title, placeholder },
        });
        return firstPiUserInputAnswer(answers, questionId);
      },
      notify(message, type) {
        const normalized = trimToUndefined(message);
        if (!normalized) return;
        if (type === "warning" || type === "error") {
          config.offerRuntimeEvent({
            ...config.makeEventBase(context),
            type: "runtime.warning",
            payload: { message: normalized, detail: { type: type ?? "info" } },
            raw: {
              source: "pi.sdk.event",
              method: "extension/ui/notify",
              payload: { message: normalized, type },
            },
          });
          return;
        }
        emitPluginProgress(normalized);
      },
      onTerminalInput() {
        warnUnsupported("onTerminalInput");
        return () => undefined;
      },
      setStatus(key, text) {
        const normalizedKey = trimToUndefined(key) ?? "status";
        const normalizedText = trimToUndefined(text);
        if (!normalizedText) {
          statusTexts.delete(normalizedKey);
          return;
        }
        if (statusTexts.get(normalizedKey) === normalizedText) return;
        statusTexts.set(normalizedKey, normalizedText);
        emitPluginProgress(`${normalizedKey}: ${normalizedText}`);
      },
      setWorkingMessage(message) {
        const normalizedMessage = trimToUndefined(message);
        if (!normalizedMessage || normalizedMessage === workingMessage) return;
        workingMessage = normalizedMessage;
        emitPluginProgress(normalizedMessage);
      },
      setWorkingVisible() {},
      setWorkingIndicator() {},
      setHiddenThinkingLabel() {},
      setWidget() {
        warnUnsupported("setWidget");
      },
      setFooter() {
        warnUnsupported("setFooter");
      },
      setHeader() {
        warnUnsupported("setHeader");
      },
      setTitle(title) {
        if (title) emitPluginProgress(title);
      },
      async custom() {
        warnUnsupported("custom");
        return undefined as never;
      },
      pasteToEditor() {
        warnUnsupported("pasteToEditor");
      },
      setEditorText() {
        warnUnsupported("setEditorText");
      },
      getEditorText() {
        return "";
      },
      editor(title, prefill) {
        return uiContext.input(title, prefill);
      },
      addAutocompleteProvider() {
        warnUnsupported("addAutocompleteProvider");
      },
      setEditorComponent() {
        warnUnsupported("setEditorComponent");
      },
      getEditorComponent() {
        return undefined;
      },
      theme: PLAIN_PI_EXTENSION_THEME,
      getAllThemes() {
        return [];
      },
      getTheme() {
        return undefined;
      },
      setTheme() {
        return { success: false, error: `Themes are not available for ${config.displayName}.` };
      },
      getToolsExpanded() {
        return false;
      },
      setToolsExpanded() {},
    };
    return uiContext;
  };

  return { makeExtensionUIContext, requestProductAskUser, resolveExtensionUserInput };
}

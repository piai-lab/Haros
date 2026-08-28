// FILE: useTranscriptAssistantSelectionAction.ts
// Purpose: Own the assistant highlight -> floating action -> composer insertion flow for transcript selections.
// Layer: Chat transcript interaction controller

import { PROVIDER_SEND_TURN_MAX_ATTACHMENTS } from "@harnessos/contracts";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type MutableRefObject,
  type MouseEventHandler,
  type PointerEventHandler,
  type TouchEventHandler,
  type WheelEventHandler,
} from "react";
import { toastManager } from "../ui/toast";
import { type ComposerAssistantSelectionAttachment } from "../../composerDraftStore";
import {
  createAssistantSelectionAttachment,
  getAssistantSelectionValidationError,
} from "../../lib/assistantSelections";
import {
  readTranscriptAssistantSelection,
  resolveSelectionActionAnchor,
  type TranscriptAssistantSelectionContext,
  type TranscriptSelectionSnapshot,
} from "./chatSelectionActions";
import { useI18n } from "~/i18n";

export interface PendingTranscriptSelectionAction {
  selection: TranscriptSelectionSnapshot;
  anchorX: number;
  selectionTop: number;
  selectionBottom: number;
  placement: "top" | "bottom";
}

interface UseTranscriptAssistantSelectionActionOptions {
  threadId: string;
  enabled: boolean;
  composerImagesRef: MutableRefObject<ReadonlyArray<unknown>>;
  composerFilesRef: MutableRefObject<ReadonlyArray<unknown>>;
  composerAssistantSelectionsRef: MutableRefObject<
    ReadonlyArray<ComposerAssistantSelectionAttachment>
  >;
  addComposerAssistantSelectionToDraft: (
    selection: ComposerAssistantSelectionAttachment,
  ) => boolean;
  canReferenceAssistantSelection?: (selection: TranscriptSelectionSnapshot) => boolean;
  resolveAssistantSelectionContext?:
    | ((assistantMessageId: string) => TranscriptAssistantSelectionContext | null)
    | undefined;
  scheduleComposerFocus: () => void;
  onMessagesClickCaptureBase: MouseEventHandler<HTMLDivElement>;
  onMessagesPointerDownBase: PointerEventHandler<HTMLDivElement>;
  onMessagesPointerUpBase: PointerEventHandler<HTMLDivElement>;
  onMessagesPointerCancelBase: PointerEventHandler<HTMLDivElement>;
  onMessagesScrollBase: () => void;
  onMessagesWheelBase: WheelEventHandler<HTMLDivElement>;
  onMessagesTouchStartBase: TouchEventHandler<HTMLDivElement>;
  onMessagesTouchMoveBase: TouchEventHandler<HTMLDivElement>;
  onMessagesTouchEndBase: TouchEventHandler<HTMLDivElement>;
}

export function useTranscriptAssistantSelectionAction(
  options: UseTranscriptAssistantSelectionActionOptions,
) {
  const { t } = useI18n();
  const {
    threadId,
    enabled,
    composerImagesRef,
    composerFilesRef,
    composerAssistantSelectionsRef,
    addComposerAssistantSelectionToDraft,
    canReferenceAssistantSelection,
    resolveAssistantSelectionContext,
    scheduleComposerFocus,
    onMessagesClickCaptureBase,
    onMessagesPointerDownBase,
    onMessagesPointerUpBase,
    onMessagesPointerCancelBase,
    onMessagesScrollBase,
    onMessagesWheelBase,
    onMessagesTouchStartBase,
    onMessagesTouchMoveBase,
    onMessagesTouchEndBase,
  } = options;
  // Pending action keyed to its thread: a thread switch or disable derives
  // straight back to null with no state-resetting effects. The setter reads
  // the current thread from a ref so empty-deps callbacks never go stale.
  const [pendingActionState, setPendingActionState] = useState<{
    threadId: typeof threadId;
    action: PendingTranscriptSelectionAction;
  } | null>(null);
  const pendingActionThreadIdRef = useRef(threadId);
  const messagesContainerRef = useRef<HTMLElement | null>(null);
  const pointerSelectingRef = useRef(false);
  const selectionCaptureFrameRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    pendingActionThreadIdRef.current = threadId;
  }, [threadId]);
  const pendingTranscriptSelectionAction =
    enabled && pendingActionState !== null && pendingActionState.threadId === threadId
      ? pendingActionState.action
      : null;
  const setPendingTranscriptSelectionAction = (action: PendingTranscriptSelectionAction | null) =>
    setPendingActionState(
      action === null ? null : { threadId: pendingActionThreadIdRef.current, action },
    );

  const dismissTranscriptSelectionAction = () => {
    setPendingTranscriptSelectionAction(null);
  };

  const captureTranscriptSelection = useCallback(
    (container: HTMLElement | null, pointer: { x: number; y: number }) => {
      if (selectionCaptureFrameRef.current !== null) {
        window.cancelAnimationFrame(selectionCaptureFrameRef.current);
      }
      selectionCaptureFrameRef.current = window.requestAnimationFrame(() => {
        selectionCaptureFrameRef.current = null;
        if (!enabled || !container) {
          setPendingTranscriptSelectionAction(null);
          return;
        }

        const selectionState = readTranscriptAssistantSelection({
          container,
          resolveContext: resolveAssistantSelectionContext,
        });
        if (
          !selectionState ||
          (canReferenceAssistantSelection &&
            !canReferenceAssistantSelection(selectionState.selection))
        ) {
          setPendingTranscriptSelectionAction(null);
          return;
        }

        const anchor = resolveSelectionActionAnchor({
          selectionRect: selectionState.selectionRect,
          pointer,
        });
        setPendingTranscriptSelectionAction({
          selection: selectionState.selection,
          ...anchor,
        });
      });
    },
    [canReferenceAssistantSelection, enabled, resolveAssistantSelectionContext],
  );

  const onMessagesClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
    messagesContainerRef.current = event.currentTarget;
    dismissTranscriptSelectionAction();
    onMessagesClickCaptureBase(event);
  };

  const onMessagesPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    messagesContainerRef.current = event.currentTarget;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    pointerSelectingRef.current = true;
    dismissTranscriptSelectionAction();
    onMessagesPointerDownBase(event);
  };

  const onMessagesPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    messagesContainerRef.current = event.currentTarget;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    pointerSelectingRef.current = false;
    onMessagesPointerUpBase(event);
    captureTranscriptSelection(event.currentTarget, lastPointerRef.current);
  };

  const onMessagesPointerCancel: PointerEventHandler<HTMLDivElement> = (event) => {
    pointerSelectingRef.current = false;
    dismissTranscriptSelectionAction();
    onMessagesPointerCancelBase(event);
  };

  const onMessagesScroll = () => {
    dismissTranscriptSelectionAction();
    onMessagesScrollBase();
  };

  const onMessagesWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    dismissTranscriptSelectionAction();
    onMessagesWheelBase(event);
  };

  const onMessagesTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    messagesContainerRef.current = event.currentTarget;
    pointerSelectingRef.current = true;
    dismissTranscriptSelectionAction();
    onMessagesTouchStartBase(event);
  };

  const onMessagesTouchMove: TouchEventHandler<HTMLDivElement> = (event) => {
    dismissTranscriptSelectionAction();
    onMessagesTouchMoveBase(event);
  };

  const onMessagesTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    messagesContainerRef.current = event.currentTarget;
    pointerSelectingRef.current = false;
    onMessagesTouchEndBase(event);
    captureTranscriptSelection(event.currentTarget, lastPointerRef.current);
  };

  const onMessagesMouseUp: MouseEventHandler<HTMLDivElement> = (event) => {
    messagesContainerRef.current = event.currentTarget;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    pointerSelectingRef.current = false;
    captureTranscriptSelection(event.currentTarget, lastPointerRef.current);
  };

  const commitTranscriptAssistantSelection = () => {
    const pendingSelection = pendingTranscriptSelectionAction;
    if (!pendingSelection) {
      return;
    }

    if (
      canReferenceAssistantSelection &&
      !canReferenceAssistantSelection(pendingSelection.selection)
    ) {
      setPendingTranscriptSelectionAction(null);
      window.getSelection()?.removeAllRanges();
      return;
    }

    if (
      composerImagesRef.current.length +
        composerFilesRef.current.length +
        composerAssistantSelectionsRef.current.length >=
      PROVIDER_SEND_TURN_MAX_ATTACHMENTS
    ) {
      setPendingTranscriptSelectionAction(null);
      toastManager.add({
        type: "warning",
        title: t("selection.attachmentLimit", {
          count: PROVIDER_SEND_TURN_MAX_ATTACHMENTS,
        }),
      });
      return;
    }

    const attachmentInput = {
      assistantMessageId: pendingSelection.selection.assistantMessageId,
      text: pendingSelection.selection.visibleText,
    };
    const nextSelection = createAssistantSelectionAttachment(attachmentInput);
    if (!nextSelection) {
      setPendingTranscriptSelectionAction(null);
      if (getAssistantSelectionValidationError(attachmentInput) === "too-long") {
        toastManager.add({
          type: "warning",
          title: t("selection.tooLong"),
        });
      }
      return;
    }

    const inserted = addComposerAssistantSelectionToDraft(nextSelection);
    setPendingTranscriptSelectionAction(null);
    if (inserted) {
      window.getSelection()?.removeAllRanges();
      scheduleComposerFocus();
    }
  };

  useEffect(() => {
    const action = pendingTranscriptSelectionAction;
    const markerRange = action?.selection.markerRange;
    if (!action || !markerRange || !resolveAssistantSelectionContext) {
      return;
    }
    const context = resolveAssistantSelectionContext(action.selection.assistantMessageId);
    if (
      context?.markerEnabled === true &&
      context.rawText.slice(markerRange.startOffset, markerRange.endOffset) ===
        markerRange.selectedText
    ) {
      return;
    }
    setPendingTranscriptSelectionAction({
      ...action,
      selection: {
        assistantMessageId: action.selection.assistantMessageId,
        visibleText: action.selection.visibleText,
      },
    });
  }, [pendingTranscriptSelectionAction, resolveAssistantSelectionContext]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleSelectionChange = () => {
      if (pointerSelectingRef.current) {
        return;
      }
      captureTranscriptSelection(messagesContainerRef.current, lastPointerRef.current);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (selectionCaptureFrameRef.current !== null) {
        window.cancelAnimationFrame(selectionCaptureFrameRef.current);
        selectionCaptureFrameRef.current = null;
      }
    };
  }, [captureTranscriptSelection, enabled]);

  useEffect(() => {
    if (!pendingTranscriptSelectionAction) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-transcript-selection-action='true']")
      ) {
        return;
      }
      setPendingTranscriptSelectionAction(null);
    };
    const handleWindowChange = () => {
      setPendingTranscriptSelectionAction(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleWindowChange);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleWindowChange);
    };
  }, [pendingTranscriptSelectionAction]);

  return {
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
  };
}

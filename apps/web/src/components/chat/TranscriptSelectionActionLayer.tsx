import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "~/i18n";
import { SelectionChatError } from "~/lib/selectionChat";
import type { DraftThreadEnvMode } from "../../composerDraftStore";
import { toastManager } from "../ui/toast";
import type { TranscriptSelectionSnapshot } from "./chatSelectionActions";
import { SelectionNewChatComposer } from "./SelectionNewChatComposer";
import { type PendingTranscriptSelectionAction } from "./useTranscriptAssistantSelectionAction";
import { TranscriptSelectionAction } from "./TranscriptSelectionAction";

interface TranscriptSelectionActionLayerProps {
  action: PendingTranscriptSelectionAction | null;
  defaultEnvMode?: DraftThreadEnvMode;
  canUseWorktree?: boolean;
  canAddToSide?: boolean;
  onDismiss?: () => void;
  onAddToChat: () => void;
  onAddToSide?: ((selection: TranscriptSelectionSnapshot) => Promise<void>) | undefined;
  onNewChat?: (
    selection: TranscriptSelectionSnapshot,
    prompt: string,
    envMode: DraftThreadEnvMode,
    intent: "send" | "compose",
  ) => Promise<void>;
}

export function TranscriptSelectionActionLayer(props: TranscriptSelectionActionLayerProps) {
  const { t } = useI18n();
  const [composerAction, setComposerAction] = useState<PendingTranscriptSelectionAction | null>(
    null,
  );
  const [sideBusy, setSideBusy] = useState(false);
  const sideInFlightRef = useRef(false);

  if (composerAction && props.onNewChat) {
    return createPortal(
      <SelectionNewChatComposer
        action={composerAction}
        defaultEnvMode={props.defaultEnvMode ?? "local"}
        canUseWorktree={props.canUseWorktree ?? false}
        onSend={(prompt, envMode) =>
          props.onNewChat!(composerAction.selection, prompt, envMode, "send")
        }
        onOpenInChat={(prompt, envMode) =>
          props.onNewChat!(composerAction.selection, prompt, envMode, "compose")
        }
        onClose={() => setComposerAction(null)}
      />,
      document.body,
    );
  }
  const action = props.action;
  if (!action) return null;

  return (
    <TranscriptSelectionAction
      anchorX={action.anchorX}
      selectionTop={action.selectionTop}
      selectionBottom={action.selectionBottom}
      placement={action.placement}
      onAddToChat={props.onAddToChat}
      disabled={sideBusy}
      sideDisabled={!(props.canAddToSide ?? false)}
      {...(props.onAddToSide
        ? {
            onAddToSide: () => {
              if (sideInFlightRef.current) return;
              sideInFlightRef.current = true;
              setSideBusy(true);
              void props
                .onAddToSide!(action.selection)
                .then(() => {
                  props.onDismiss?.();
                  window.getSelection()?.removeAllRanges();
                })
                .catch((error: unknown) => {
                  toastManager.add({
                    type: "error",
                    title: t("selection.couldNotAddToSide"),
                    description:
                      error instanceof SelectionChatError && error.code === "side-from-side"
                        ? t("selection.openMainChatBeforeSide")
                        : error instanceof Error
                          ? error.message
                          : t("selection.tryAgain"),
                  });
                })
                .finally(() => {
                  sideInFlightRef.current = false;
                  setSideBusy(false);
                });
            },
          }
        : {})}
      {...(props.onNewChat
        ? {
            onAddToNewChat: () => {
              setComposerAction(action);
              props.onDismiss?.();
              window.getSelection()?.removeAllRanges();
            },
          }
        : {})}
    />
  );
}

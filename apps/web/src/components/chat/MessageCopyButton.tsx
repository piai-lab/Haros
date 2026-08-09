import { useRef, type RefObject } from "react";
import { CheckIcon, CopyIcon } from "~/lib/icons";
import { useCopyToClipboard } from "~/hooks/useCopyToClipboard";
import { anchoredToastManager } from "../ui/toast";
import { MessageActionButton, MESSAGE_ACTION_ICON_CLASS_NAME } from "./MessageActionButton";
import { useI18n } from "~/i18n";

const ANCHORED_TOAST_TIMEOUT_MS = 1000;

function showCopyToast(
  ref: RefObject<HTMLButtonElement | null>,
  title: string,
  description?: string,
): void {
  if (!ref.current) return;

  anchoredToastManager.add({
    data: {
      tooltipStyle: true,
    },
    positionerProps: {
      anchor: ref.current,
    },
    timeout: ANCHORED_TOAST_TIMEOUT_MS,
    title,
    ...(description ? { description } : {}),
  });
}

export function MessageCopyButton({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();
  const { copyToClipboard, isCopied } = useCopyToClipboard<void>({
    onCopy: () => showCopyToast(ref, t("timeline.copied")),
    onError: (error: Error) => showCopyToast(ref, t("timeline.copyFailed"), error.message),
    timeout: ANCHORED_TOAST_TIMEOUT_MS,
  });

  return (
    <MessageActionButton
      ref={ref}
      label={t("timeline.copyMessage")}
      tooltip={t("timeline.copyClipboard")}
      disabled={isCopied}
      className={className}
      onClick={() => copyToClipboard(text)}
    >
      {isCopied ? (
        <CheckIcon className={`${MESSAGE_ACTION_ICON_CLASS_NAME} text-success`} />
      ) : (
        <CopyIcon className={MESSAGE_ACTION_ICON_CLASS_NAME} />
      )}
    </MessageActionButton>
  );
}

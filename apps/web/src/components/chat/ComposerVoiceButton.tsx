// FILE: ComposerVoiceButton.tsx
// Purpose: Renders the composer mic control for recording and transcribing a voice note.
// Layer: Chat composer presentation
// Depends on: shared button styling and caller-owned voice recording state callbacks.

import { Loader2Icon, MicIcon } from "~/lib/icons";
import { useI18n } from "~/i18n";
import { Button } from "../ui/button";

export const ComposerVoiceButton = function ComposerVoiceButton(props: {
  disabled?: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  durationLabel: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const label = props.isTranscribing
    ? t("composer.transcribingVoice")
    : props.isRecording
      ? t("composer.stopVoice", { duration: props.durationLabel })
      : t("composer.recordVoice");

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className="shrink-0 rounded-md"
      disabled={props.disabled || props.isTranscribing}
      aria-label={label}
      title={label}
      onClick={props.onClick}
    >
      {props.isTranscribing ? (
        <Loader2Icon aria-hidden="true" className="size-4 animate-spin text-primary" />
      ) : (
        <MicIcon aria-hidden="true" className="size-4 text-primary" />
      )}
    </Button>
  );
};

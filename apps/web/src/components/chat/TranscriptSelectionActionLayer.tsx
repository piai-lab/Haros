// FILE: TranscriptSelectionActionLayer.tsx
// Purpose: Renders the transcript selection floating action from controller state.
// Layer: Chat transcript interaction UI

import { type PendingTranscriptSelectionAction } from "./useTranscriptAssistantSelectionAction";
import { TranscriptSelectionAction } from "./TranscriptSelectionAction";

interface TranscriptSelectionActionLayerProps {
  action: PendingTranscriptSelectionAction | null;
  onHighlight: () => void;
  onUnderline: () => void;
  onAddToChat: () => void;
}

export function TranscriptSelectionActionLayer(props: TranscriptSelectionActionLayerProps) {
  if (!props.action) {
    return null;
  }

  return (
    <TranscriptSelectionAction
      anchorX={props.action.anchorX}
      selectionTop={props.action.selectionTop}
      selectionBottom={props.action.selectionBottom}
      placement={props.action.placement}
      onHighlight={props.action.selection.markerRange ? props.onHighlight : undefined}
      onUnderline={props.action.selection.markerRange ? props.onUnderline : undefined}
      onAddToChat={props.onAddToChat}
    />
  );
}

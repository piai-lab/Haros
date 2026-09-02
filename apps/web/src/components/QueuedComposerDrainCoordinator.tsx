// FILE: QueuedComposerDrainCoordinator.tsx
// Purpose: Keep background queued Composer turns draining for the app session.
// Layer: Web app shell

import { useEffect } from "react";

import { resolveAssistantDeliveryMode } from "../engineSettings";
import { startQueuedComposerDrainWatcher } from "../lib/queuedComposerDrain";
import { useServerSettings } from "../serverSettings";

export function QueuedComposerDrainCoordinator() {
  const { settings } = useServerSettings();
  const assistantDeliveryMode = settings ? resolveAssistantDeliveryMode(settings) : null;

  useEffect(() => {
    if (assistantDeliveryMode === null) return;
    return startQueuedComposerDrainWatcher({ assistantDeliveryMode });
  }, [assistantDeliveryMode]);

  return null;
}

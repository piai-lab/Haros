// FILE: QueuedComposerDrainCoordinator.tsx
// Purpose: Keep background queued Composer turns draining for the app session.
// Layer: Web app shell

import { useEffect } from "react";

import { resolveAssistantDeliveryMode } from "../engineSettings";
import {
  setQueuedComposerDrainAssistantDeliveryMode,
  startQueuedComposerDrainWatcher,
} from "../lib/queuedComposerDrain";
import { useServerSettings } from "../serverSettings";

export function QueuedComposerDrainCoordinator() {
  const { settings, defaults } = useServerSettings();
  const assistantDeliveryMode = resolveAssistantDeliveryMode(settings ?? defaults);

  useEffect(() => startQueuedComposerDrainWatcher(), []);

  useEffect(() => {
    setQueuedComposerDrainAssistantDeliveryMode(assistantDeliveryMode);
  }, [assistantDeliveryMode]);

  return null;
}

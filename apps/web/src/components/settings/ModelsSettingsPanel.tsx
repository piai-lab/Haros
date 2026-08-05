// FILE: ModelsSettingsPanel.tsx
// Purpose: Re-entry surface for Host-owned runtime model selection.

import { SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

export function ModelsSettingsPanel({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <SettingsSection title="Runtime models">
      <SettingsRow
        title="Models are selected per Conversation"
        description="Available model IDs and thinking levels come from the Native Host runtime catalog. Static Provider defaults and custom CLI model lists are no longer authoritative."
      />
    </SettingsSection>
  );
}

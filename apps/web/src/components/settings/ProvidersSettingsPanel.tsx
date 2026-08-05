// FILE: ProvidersSettingsPanel.tsx
// Purpose: Truthful Settings re-entry for Native Host runtime availability.

import { SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

export function ProvidersSettingsPanel({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <SettingsSection title="Agents">
      <SettingsRow
        title="Runtime availability is Host-owned"
        description="OmniMind no longer probes, updates, configures, or authenticates Provider CLIs. Available runtime models and capabilities are reported by the isolated Native Host."
      />
    </SettingsSection>
  );
}

// FILE: SkillsSettingsPanel.tsx
// Purpose: Truthful Settings re-entry for Product-owned Package and Skill discovery.

import { SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

export function SkillsSettingsPanel() {
  return (
    <SettingsSection title="Skills">
      <SettingsRow
        title="Skill discovery unavailable"
        description="No Provider catalog is queried. Re-enter after Product-owned Package trust, compatibility, and activation are connected to Native Host facts."
      />
    </SettingsSection>
  );
}

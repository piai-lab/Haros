// FILE: ProviderUsageSettingsPanel.tsx
// Purpose: Truthful unavailable surface for Provider-private usage queries.

import { SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

export function ProviderUsageSettingsPanel() {
  return (
    <SettingsSection title="Runtime usage">
      <SettingsRow
        title="Live usage unavailable"
        description="OmniMind no longer reads Provider CLI credentials or private usage stores. Current Run usage is shown only when the Native Host reports a typed Product-visible fact."
      />
    </SettingsSection>
  );
}

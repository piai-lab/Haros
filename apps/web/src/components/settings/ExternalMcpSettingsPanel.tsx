// FILE: ExternalMcpSettingsPanel.tsx
// Purpose: Truthful re-entry surface for a future Product-owned external integration boundary.

import { SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

export function ExternalMcpSettingsPanel({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <SettingsSection title="External integrations">
      <SettingsRow
        title="External agent access unavailable"
        description="The retired execution gateway and pairing credentials are no longer exposed. Re-enter here only after scoped Product commands, permissions, receipts, and revocation are connected to a supported integration boundary."
      />
    </SettingsSection>
  );
}

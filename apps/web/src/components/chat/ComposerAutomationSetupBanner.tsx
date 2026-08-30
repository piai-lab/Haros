// FILE: ComposerAutomationSetupBanner.tsx
// Purpose: Slim control strip shown above the composer while Haros is gathering the
// missing details (task and/or schedule) for a chat-created automation. The actual
// back-and-forth renders as message bubbles in the transcript; this strip just marks
// setup mode and lets the user cancel (which restores their text).
// Layer: Chat composer UI
// Exports: ComposerAutomationSetupBanner

import { useI18n } from "~/i18n";

export const ComposerAutomationSetupBanner = function ComposerAutomationSetupBanner({
  onCancel,
}: {
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-4 sm:px-6 sm:pt-4.5 sm:pb-5">
      <span className="text-[11px] font-semibold text-muted-foreground/50">
        {t("automation.settingUp")}
      </span>
      <button
        type="button"
        aria-label={t("automation.cancelSetup")}
        onClick={onCancel}
        className="rounded-full border border-[color:var(--color-border-light)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-foreground-secondary)] transition-colors duration-150 hover:bg-[var(--color-background-button-secondary-hover)] hover:text-[var(--color-text-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)]"
      >
        {t("common.cancel")}
      </button>
    </div>
  );
};

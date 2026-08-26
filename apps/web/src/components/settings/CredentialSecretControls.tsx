// FILE: CredentialSecretControls.tsx
// Purpose: Keep reveal, copy, and clear controls consistent across local credential settings.
// Layer: Settings presentation

import { useState } from "react";

import { copyTextToClipboard } from "~/hooks/useCopyToClipboard";
import { useI18n } from "~/i18n";
import { CopyIcon, EyeIcon } from "~/lib/icons";

import { Button } from "../ui/button";
import { toastManager } from "../ui/toast";

export function CredentialSecretControls({
  visible,
  disabled = false,
  copyDisabled = false,
  clearDisabled = false,
  clearLabel,
  onToggleVisibility,
  resolveCopyValue,
  onClear,
}: {
  readonly visible: boolean;
  readonly disabled?: boolean;
  readonly copyDisabled?: boolean;
  readonly clearDisabled?: boolean;
  readonly clearLabel?: string;
  readonly onToggleVisibility: () => void | Promise<void>;
  readonly resolveCopyValue: () => string | null | Promise<string | null>;
  readonly onClear?: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [copying, setCopying] = useState(false);

  const copy = async () => {
    setCopying(true);
    try {
      const value = await resolveCopyValue();
      if (!value) return;
      await copyTextToClipboard(value);
      toastManager.add({ type: "success", title: t("common.copied") });
    } catch {
      toastManager.add({ type: "error", title: t("settings.copyFailed") });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="xs"
        variant="outline"
        aria-label={visible ? t("settings.hideSecret") : t("settings.showSecret")}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => void onToggleVisibility()}
      >
        <EyeIcon aria-hidden="true" className="size-3.5" />
      </Button>
      <Button
        size="xs"
        variant="outline"
        aria-label={t("settings.copySecret")}
        disabled={disabled || copyDisabled || copying}
        onClick={() => void copy()}
      >
        <CopyIcon aria-hidden="true" className="size-3.5" />
      </Button>
      {onClear ? (
        <Button
          size="xs"
          variant="outline"
          disabled={disabled || clearDisabled}
          onClick={() => void onClear()}
        >
          {clearLabel ?? t("settings.clear")}
        </Button>
      ) : null}
    </div>
  );
}

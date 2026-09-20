import { browserVaultErrorCode } from "@harnessos/contracts";
import type { useI18n } from "~/i18n";

export function browserVaultErrorMessage(
  error: unknown,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (browserVaultErrorCode(error)) {
    case "wrong_password":
      return t("browser.vaultWrongPassword");
    case "locked":
      return t("browser.savedLoginsLocked");
    case "os_unavailable":
      return t("browser.vaultOsUnavailable");
    case "storage_failed":
      return t("browser.vaultStorageFailed");
    case "capture_failed":
      return t("browser.vaultCaptureFailed");
    default:
      return t("browser.vaultChangeFailed");
  }
}

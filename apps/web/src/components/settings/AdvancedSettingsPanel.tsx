// FILE: AdvancedSettingsPanel.tsx
// Purpose: Own advanced settings state and workflows for auth, keybindings, and recovery.
// Layer: Settings UI components
// Exports: AdvancedSettingsPanel

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { logoutCurrentBrowserSession } from "~/authLogout";
import { APP_VERSION } from "~/branding";
import { resolveAndPersistPreferredEditor } from "~/editorPreferences";
import { DisclosureChevron } from "~/components/ui/DisclosureChevron";
import { DisclosureRegion } from "~/components/ui/DisclosureRegion";
import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { ensureNativeApi, readNativeApi } from "~/nativeApi";
import { serverAuthSessionQueryOptions, serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { cn } from "~/lib/utils";
import { SETTINGS_INSET_LIST_CLASS_NAME } from "~/settingsPanelStyles";
import { useStore } from "~/store";
import { createAllThreadsMessagelessSelector, createThreadShellsSelector } from "~/storeSelectors";
import { useI18n } from "~/i18n";
import { ADVANCED_SETTINGS_SEARCH } from "~/settingsMetadata/advancedSettings";
import { useSettingsRestoreSignal } from "./SettingControls";
import { SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

export function AdvancedSettingsPanel(props: { active: boolean; resetEpoch: number }) {
  const { t } = useI18n();
  const configQuery = useQuery(serverConfigQueryOptions());
  const authSessionQuery = useQuery(serverAuthSessionQueryOptions());
  const syncServerReadModel = useStore((store) => store.syncServerReadModel);
  // Keep these subscriptions inside the only panel that uses recovery eligibility.
  const threadShells = useStore(useMemo(() => createThreadShellsSelector(), []));
  const allThreadsMessageless = useStore(useMemo(() => createAllThreadsMessagelessSelector(), []));
  const projectCount = useStore((store) => store.projects.length);
  const threadsHydrated = useStore((store) => store.threadsHydrated);

  const [isOpeningKeybindings, setIsOpeningKeybindings] = useState(false);
  const [isRepairingLocalState, setIsRepairingLocalState] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showRecoveryTools, setShowRecoveryTools] = useState(false);
  const [openKeybindingsError, setOpenKeybindingsError] = useState<string | null>(null);

  useSettingsRestoreSignal(props.resetEpoch, () => {
    setShowRecoveryTools(false);
    setOpenKeybindingsError(null);
  });

  const keybindingsConfigPath = configQuery.data?.keybindingsConfigPath ?? null;
  const availableEditors = configQuery.data?.availableEditors;
  const shouldOfferRecoveryTools = useMemo(() => {
    if (!threadsHydrated || projectCount === 0) return false;
    return threadShells.length === 0 || allThreadsMessageless;
  }, [allThreadsMessageless, projectCount, threadShells.length, threadsHydrated]);

  const openKeybindingsFile = useCallback(() => {
    if (!keybindingsConfigPath) return;
    setOpenKeybindingsError(null);
    setIsOpeningKeybindings(true);
    const editor = resolveAndPersistPreferredEditor(availableEditors ?? []);
    if (!editor) {
      setOpenKeybindingsError(t("settings.noEditors"));
      setIsOpeningKeybindings(false);
      return;
    }
    void ensureNativeApi()
      .shell.openInEditor(keybindingsConfigPath, editor)
      .catch((error) => {
        setOpenKeybindingsError(
          error instanceof Error ? error.message : t("settings.openKeybindingsFailed"),
        );
      })
      .finally(() => {
        setIsOpeningKeybindings(false);
      });
  }, [availableEditors, keybindingsConfigPath, t]);

  const repairLocalState = useCallback(async () => {
    if (isRepairingLocalState) return;
    const api = readNativeApi() ?? ensureNativeApi();
    const confirmed = await api.dialogs.confirm(
      [
        t("settings.repairConfirm"),
        t("settings.repairConfirmDescription"),
        t("settings.repairConfirmPreservesChats"),
      ].join("\n"),
    );
    if (!confirmed) return;

    setIsRepairingLocalState(true);
    await api.orchestration
      .repairState()
      .then((snapshot) => {
        syncServerReadModel(snapshot);
        toastManager.add({
          type: "success",
          title: t("settings.localStateRepaired"),
          description: t("settings.localStateRepairedDescription"),
        });
      })
      .catch((error: unknown) => {
        toastManager.add({
          type: "error",
          title: t("settings.repairFailed"),
          description: error instanceof Error ? error.message : t("settings.repairUnknownError"),
        });
      })
      .finally(() => {
        setIsRepairingLocalState(false);
      });
  }, [isRepairingLocalState, syncServerReadModel, t]);

  const logoutCurrentSession = useCallback(async () => {
    if (isLoggingOut) return;
    const api = readNativeApi() ?? ensureNativeApi();
    setIsLoggingOut(true);
    const result = await logoutCurrentBrowserSession({
      confirm: () =>
        api.dialogs.confirm(
          [t("settings.signOutConfirm"), t("settings.signOutConfirmDescription")].join("\n\n"),
        ),
      logout: () => api.server.logoutAuthSession(),
      navigate: (path) => window.location.assign(path),
      onError: (error) =>
        toastManager.add({
          type: "error",
          title: t("settings.signOutFailed"),
          description: error instanceof Error ? error.message : t("settings.signOutUnknownError"),
        }),
    });
    if (result !== "redirecting") setIsLoggingOut(false);
  }, [isLoggingOut, t]);

  if (!props.active) return null;

  return (
    <div className="space-y-6">
      {authSessionQuery.data?.authenticated ? (
        <SettingsSection title={t("settings.session")}>
          <SettingsRow
            title={t("settings.thisBrowser")}
            description={t("settings.thisBrowserDescription")}
            status={t("settings.authenticatedAs", { role: authSessionQuery.data.role ?? "client" })}
            control={
              <Button
                size="xs"
                variant="destructive-outline"
                disabled={isLoggingOut}
                onClick={() => void logoutCurrentSession()}
              >
                {isLoggingOut ? t("settings.signingOut") : t("settings.signOut")}
              </Button>
            }
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title={t("settings.developerTools")}>
        <SettingsRow
          anchorId={ADVANCED_SETTINGS_SEARCH.keybindings.target}
          title={t("settings.keybindings")}
          description={t("settings.keybindingsDescription")}
          status={
            <>
              <span className="block break-all font-mono text-[11px] text-foreground">
                {keybindingsConfigPath ?? t("settings.resolvingKeybindingsPath")}
              </span>
              {openKeybindingsError ? (
                <span className="mt-1 block text-destructive">{openKeybindingsError}</span>
              ) : (
                <span className="mt-1 block">{t("settings.preferredEditor")}</span>
              )}
            </>
          }
          control={
            <Button
              size="xs"
              variant="outline"
              disabled={!keybindingsConfigPath || isOpeningKeybindings}
              onClick={openKeybindingsFile}
            >
              {isOpeningKeybindings ? t("settings.opening") : t("settings.openFile")}
            </Button>
          }
        />

        <SettingsRow
          anchorId={ADVANCED_SETTINGS_SEARCH.recoveryTools.target}
          title={t("settings.recoveryTools")}
          description={t("settings.recoveryToolsDescription")}
          status={
            shouldOfferRecoveryTools
              ? t("settings.recoveryToolsRelevant")
              : t("settings.recoveryToolsAutomatic")
          }
          control={
            <Button
              size="xs"
              variant="outline"
              disabled={!shouldOfferRecoveryTools || isRepairingLocalState}
              onClick={() => void repairLocalState()}
            >
              {isRepairingLocalState ? t("settings.repairing") : t("settings.repairState")}
            </Button>
          }
        >
          {shouldOfferRecoveryTools ? (
            <div className="mt-3 border-t border-border/70 pt-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                aria-expanded={showRecoveryTools}
                onClick={() => setShowRecoveryTools((current) => !current)}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {t("settings.whatThisDoes")}
                </span>
                <DisclosureChevron
                  open={showRecoveryTools}
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </button>
              <DisclosureRegion
                open={showRecoveryTools}
                contentClassName={cn(
                  "mt-3 px-3 py-3 text-xs text-muted-foreground",
                  SETTINGS_INSET_LIST_CLASS_NAME,
                )}
              >
                <div>{t("settings.repairExplanation")}</div>
              </DisclosureRegion>
            </div>
          ) : null}
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("settings.about")}>
        <SettingsRow
          anchorId={ADVANCED_SETTINGS_SEARCH.version.target}
          title={t("settings.version")}
          description={t("settings.versionDescription")}
          control={<code className="text-xs font-medium text-muted-foreground">{APP_VERSION}</code>}
        />
        <SettingsRow
          anchorId={ADVANCED_SETTINGS_SEARCH.releaseHistory.target}
          title={t("settings.releaseHistory")}
          description={t("settings.releaseHistoryUnavailable")}
          control={<Button disabled>{t("settings.unavailable")}</Button>}
        />
      </SettingsSection>
    </div>
  );
}

// FILE: DesktopSettingsPanels.tsx
// Purpose: Own settings panels whose behavior depends on browser or desktop-native lifecycles.
// Layer: Settings UI components
// Exports: NotificationsSettingsPanel, AppSnapSettingsPanel

import {
  type DesktopAppSnapPermission,
  type DesktopAppSnapState,
  type ResolvedKeybindingsConfig,
} from "@harnessos/contracts";
import { appSnapShortcutLabels } from "@harnessos/shared/appSnapShortcut";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useLocalPreferences } from "~/localPreferences";
import { createLatestAppSnapRequestGuard } from "~/appSnap.logic";
import { playAppSnapCaptureSound } from "~/lib/appSnapSound";
import { CentralIcon } from "~/lib/central-icons";
import { cn } from "~/lib/utils";
import { isElectron } from "~/env";
import {
  type BrowserNotificationPermissionState,
  readBrowserNotificationPermissionState,
  requestBrowserNotificationPermission,
} from "~/notifications/taskCompletion";
import {
  SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME,
  SETTINGS_CARD_ROW_TITLE_CLASS_NAME,
} from "~/settingsPanelStyles";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { toastManager } from "~/components/ui/toast";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { useI18n, type MessageKey } from "~/i18n";
import {
  APPSNAP_SETTINGS_SEARCH,
  NOTIFICATIONS_SETTINGS_SEARCH,
} from "~/settingsMetadata/desktopSettings";
import { AppSnapShortcutControl } from "./AppSnapShortcutControl";
import { SettingResetButton } from "./SettingControls";
import { SettingsCard, SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";

type SettingsTranslator = ReturnType<typeof useI18n>["t"];

function notificationSupportText(
  state: BrowserNotificationPermissionState,
  t: SettingsTranslator,
): string {
  if (isElectron) return t("settings.notificationDesktopCenter");
  const key: Record<BrowserNotificationPermissionState, MessageKey> = {
    granted: "settings.notificationGranted",
    denied: "settings.notificationDenied",
    insecure: "settings.notificationInsecure",
    unsupported: "settings.notificationUnsupported",
    default: "settings.notificationDefault",
  };
  return t(key[state]);
}

function appSnapStatusText(state: DesktopAppSnapState | null, t: SettingsTranslator): string {
  if (!state) return t("settings.appSnapDesktopAvailable");
  if (!state.supported) return state.message ?? t("settings.appSnapAvailableMac");
  if (state.status === "ready") {
    const shortcut = state.shortcut;
    const label = shortcut
      ? appSnapShortcutLabels(shortcut).join(" + ")
      : t("settings.appSnapShortcutGeneric");
    return t("settings.appSnapListening", { shortcut: label });
  }
  if (state.status === "disabled") return t("settings.appSnapOff");
  if (state.status === "starting") return t("settings.appSnapStarting");
  return state.message ?? t("settings.appSnapPermissionSetup");
}

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];

const APPSNAP_PERMISSION_LABEL_KEYS: Record<DesktopAppSnapPermission, MessageKey> = {
  granted: "settings.permissionGranted",
  denied: "settings.permissionDenied",
  "not-determined": "settings.permissionNotRequested",
  restricted: "settings.permissionRestricted",
  unknown: "settings.permissionUnknown",
};

function AppSnapPermissionBadge({ permission }: { permission: DesktopAppSnapPermission }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          permission === "granted"
            ? "bg-emerald-500"
            : permission === "denied" || permission === "restricted"
              ? "bg-red-500"
              : "bg-[color:var(--color-border)]",
        )}
      />
      {t(APPSNAP_PERMISSION_LABEL_KEYS[permission])}
    </span>
  );
}

export function NotificationsSettingsPanel({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const { preferences: settings, defaults, updatePreferences } = useLocalPreferences();
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(
    readBrowserNotificationPermissionState(),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setBrowserNotificationPermission(readBrowserNotificationPermissionState());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function setSystemNotificationsEnabled(nextEnabled: boolean) {
    if (!nextEnabled) {
      updatePreferences({ enableSystemTaskCompletionNotifications: false });
      return;
    }

    if (isElectron) {
      updatePreferences({ enableSystemTaskCompletionNotifications: true });
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    setBrowserNotificationPermission(permission);

    if (permission === "granted") {
      updatePreferences({ enableSystemTaskCompletionNotifications: true });
      return;
    }

    updatePreferences({ enableSystemTaskCompletionNotifications: false });
    toastManager.add({
      type: permission === "denied" ? "warning" : "error",
      title: t("settings.desktopNotificationsUnavailable"),
      description: notificationSupportText(permission, t),
    });
  }

  async function sendTestNotification() {
    const title = t("settings.activityNotification");
    const body = t("settings.notificationTestBody");

    if (window.desktopBridge) {
      const shown = await window.desktopBridge.notifications.show({ title, body, silent: false });
      toastManager.add({
        type: shown ? "success" : "warning",
        title: shown ? t("settings.testNotificationSent") : t("settings.notificationsUnavailable"),
        description: shown
          ? t("settings.osNotificationExpected")
          : t("settings.desktopNotificationsUnsupported"),
      });
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    setBrowserNotificationPermission(permission);
    if (permission !== "granted") {
      toastManager.add({
        type: permission === "denied" ? "warning" : "error",
        title: t("settings.desktopNotificationsUnavailable"),
        description: notificationSupportText(permission, t),
      });
      return;
    }

    const notification = new Notification(title, { body, tag: "omnimind:test-notification" });
    notification.addEventListener("click", () => {
      window.focus();
    });
    toastManager.add({
      type: "success",
      title: t("settings.testNotificationSent"),
      description: t("settings.browserNotificationExpected"),
    });
  }

  if (!active) return null;

  return (
    <div className="space-y-6">
      <SettingsSection title={t("settings.activityAlerts")}>
        <SettingsRow
          anchorId={NOTIFICATIONS_SETTINGS_SEARCH.activityToasts.target}
          title={t("settings.activityToasts")}
          description={t("settings.activityToastsDescription")}
          resetAction={
            settings.enableTaskCompletionToasts !== defaults.enableTaskCompletionToasts ? (
              <SettingResetButton
                label={t("settings.activityToasts")}
                onClick={() =>
                  updatePreferences({
                    enableTaskCompletionToasts: defaults.enableTaskCompletionToasts,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.enableTaskCompletionToasts}
              onCheckedChange={(checked) =>
                updatePreferences({ enableTaskCompletionToasts: Boolean(checked) })
              }
              aria-label={t("settings.activityToastAria")}
            />
          }
        />

        <SettingsRow
          anchorId={NOTIFICATIONS_SETTINGS_SEARCH.desktopNotifications.target}
          title={t("settings.desktopNotifications")}
          description={t("settings.desktopNotificationsDescription")}
          status={notificationSupportText(browserNotificationPermission, t)}
          resetAction={
            settings.enableSystemTaskCompletionNotifications !==
            defaults.enableSystemTaskCompletionNotifications ? (
              <SettingResetButton
                label={t("settings.desktopNotifications")}
                onClick={() =>
                  updatePreferences({
                    enableSystemTaskCompletionNotifications:
                      defaults.enableSystemTaskCompletionNotifications,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
              <Button size="xs" variant="outline" onClick={() => void sendTestNotification()}>
                {t("settings.test")}
              </Button>
              <Switch
                checked={settings.enableSystemTaskCompletionNotifications}
                onCheckedChange={(checked) => {
                  void setSystemNotificationsEnabled(Boolean(checked));
                }}
                aria-label={t("settings.desktopActivityNotifications")}
              />
            </div>
          }
        />
      </SettingsSection>
    </div>
  );
}

export function AppSnapSettingsPanel({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const { preferences: settings, defaults, updatePreferences } = useLocalPreferences();
  const [appSnapState, setAppSnapState] = useState<DesktopAppSnapState | null>(null);
  const appSnapRequestGuardRef = useRef(createLatestAppSnapRequestGuard());
  const serverConfigQuery = useQuery({ ...serverConfigQueryOptions(), enabled: active });
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;

  useEffect(() => {
    const bridge = window.desktopBridge?.appSnap;
    if (!bridge) return;
    let disposed = false;
    const unsubscribe = bridge.onState((state) => {
      if (!disposed) setAppSnapState(state);
    });
    void bridge
      .getState()
      .then((state) => {
        if (!disposed) setAppSnapState(state);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  async function setAppSnapEnabled(nextEnabled: boolean) {
    const requestGuard = appSnapRequestGuardRef.current;
    const requestId = requestGuard.begin();
    const bridge = window.desktopBridge?.appSnap;
    if (!bridge) {
      toastManager.add({
        type: "warning",
        title: t("settings.appsnapUnavailable"),
        description: t("settings.appsnapDesktopRequired"),
      });
      return;
    }

    try {
      if (nextEnabled) {
        const permissionState = await bridge.requestPermissions();
        if (!requestGuard.isCurrent(requestId)) return;
        setAppSnapState(permissionState);
      }
      if (!requestGuard.isCurrent(requestId)) return;
      const state = await bridge.setEnabled(nextEnabled);
      if (!requestGuard.isCurrent(requestId)) return;
      const localResult = updatePreferences({ enableAppSnap: nextEnabled });
      if (localResult.state === "failed") {
        const restoredState = await bridge.setEnabled(settings.enableAppSnap).catch(() => null);
        if (restoredState && requestGuard.isCurrent(requestId)) {
          setAppSnapState(restoredState);
        }
        toastManager.add({
          type: "error",
          title: t("settings.localPreferenceSaveFailed"),
          description: t("settings.localPreferenceSaveRecovery"),
        });
        return;
      }
      setAppSnapState(state);
      if (nextEnabled && (state.status === "permission-required" || state.status === "error")) {
        toastManager.add({
          type: "warning",
          title: t("settings.appsnapFinishSetup"),
          description: state.message ?? t("settings.appsnapPermissionRequired"),
        });
      }
    } catch (error) {
      if (!requestGuard.isCurrent(requestId)) return;
      toastManager.add({
        type: "error",
        title: t("settings.appsnapSetupFailed"),
        description: error instanceof Error ? error.message : t("settings.appsnapConfigureFailed"),
      });
    }
  }

  async function recheckAppSnapPermissions() {
    const bridge = window.desktopBridge?.appSnap;
    if (!bridge) return;
    const requestGuard = appSnapRequestGuardRef.current;
    const requestId = requestGuard.begin();
    try {
      await bridge.requestPermissions();
      const state = await bridge.setEnabled(settings.enableAppSnap);
      if (!requestGuard.isCurrent(requestId)) return;
      setAppSnapState(state);
    } catch (error) {
      if (!requestGuard.isCurrent(requestId)) return;
      toastManager.add({
        type: "error",
        title: t("settings.appsnapPermissionCheckFailed"),
        description:
          error instanceof Error ? error.message : t("settings.appsnapPermissionCheckUnknown"),
      });
    }
  }

  const supported = appSnapState?.supported === true;
  const enabled = supported && settings.enableAppSnap;

  if (!active) return null;

  return (
    <div className="space-y-6">
      <SettingsCard divided={false} className="flex items-start gap-3 px-4 py-3.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] text-muted-foreground">
          <CentralIcon name="screen-capture" className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className={SETTINGS_CARD_ROW_TITLE_CLASS_NAME}>{t("settings.appsnapIntroduction")}</p>
          <p className={SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME}>
            {t("settings.appsnapIntroductionDescription")}
          </p>
          {!supported ? (
            <p className={cn(SETTINGS_CARD_ROW_DESCRIPTION_CLASS_NAME, "pt-0.5")}>
              {appSnapState
                ? (appSnapState.message ?? t("settings.appsnapMacOnly"))
                : t("settings.appsnapDesktopRequired")}
            </p>
          ) : null}
        </div>
      </SettingsCard>

      <SettingsSection title={t("settings.capture")}>
        <SettingsRow
          anchorId={APPSNAP_SETTINGS_SEARCH.enable.target}
          title={t("settings.enableAppSnap")}
          description={t("settings.enableAppSnapDescription")}
          status={appSnapStatusText(appSnapState, t)}
          resetAction={
            settings.enableAppSnap !== defaults.enableAppSnap ? (
              <SettingResetButton
                label={t("settings.appsnap")}
                onClick={() => void setAppSnapEnabled(defaults.enableAppSnap)}
              />
            ) : null
          }
          control={
            <Switch
              checked={enabled}
              disabled={!supported}
              onCheckedChange={(checked) => void setAppSnapEnabled(Boolean(checked))}
              aria-label={t("settings.enableAppSnap")}
            />
          }
        />

        <SettingsRow
          anchorId={APPSNAP_SETTINGS_SEARCH.shortcut.target}
          title={t("settings.shortcut")}
          description={t("settings.appSnapShortcutDescription")}
          control={
            <AppSnapShortcutControl
              key={
                settings.appSnapShortcut.kind === "both-option-keys"
                  ? settings.appSnapShortcut.kind
                  : `${settings.appSnapShortcut.modifier}:${settings.appSnapShortcut.key}`
              }
              shortcut={settings.appSnapShortcut}
              enabled={enabled}
              reserved={enabled && appSnapState?.status === "ready"}
              keybindings={keybindings}
              onSaved={async (shortcut, state) => {
                const result = updatePreferences({ appSnapShortcut: shortcut });
                if (result.state === "failed") return false;
                setAppSnapState(state);
                return true;
              }}
            />
          }
        />

        <SettingsRow
          anchorId={APPSNAP_SETTINGS_SEARCH.destination.target}
          title={t("settings.destination")}
          description={t("settings.appSnapDestinationDescription")}
          control={
            <span className="text-xs font-medium text-muted-foreground">
              {t("settings.automatic")}
            </span>
          }
        />

        <SettingsRow
          anchorId={APPSNAP_SETTINGS_SEARCH.captureSound.target}
          title={t("settings.captureSound")}
          description={t("settings.captureSoundDescription")}
          resetAction={
            settings.appSnapPlaySound !== defaults.appSnapPlaySound ? (
              <SettingResetButton
                label={t("settings.captureSound")}
                onClick={() => updatePreferences({ appSnapPlaySound: defaults.appSnapPlaySound })}
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
              <Button size="xs" variant="outline" onClick={() => void playAppSnapCaptureSound()}>
                {t("settings.preview")}
              </Button>
              <Switch
                checked={settings.appSnapPlaySound}
                onCheckedChange={(checked) =>
                  updatePreferences({ appSnapPlaySound: Boolean(checked) })
                }
                aria-label={t("settings.captureSoundAria")}
              />
            </div>
          }
        />
      </SettingsSection>

      {supported ? (
        <SettingsSection title={t("settings.macosPermissions")}>
          <SettingsRow
            title={t("settings.inputMonitoring")}
            description={t("settings.inputMonitoringDescription")}
            control={<AppSnapPermissionBadge permission={appSnapState.inputMonitoringPermission} />}
          />
          <SettingsRow
            title={t("settings.screenRecording")}
            description={t("settings.screenRecordingDescription")}
            control={<AppSnapPermissionBadge permission={appSnapState.screenRecordingPermission} />}
          />
          <SettingsRow
            title={t("settings.permissionStatus")}
            description={t("settings.permissionStatusDescription")}
            control={
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => void recheckAppSnapPermissions()}
              >
                {t("settings.recheckPermissions")}
              </Button>
            }
          />
        </SettingsSection>
      ) : null}
    </div>
  );
}

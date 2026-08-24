import { defineSettingsSearchPanel, defineSettingsSearchRow } from "../settingsSearchMetadata";

export const NOTIFICATIONS_SETTINGS_SEARCH = {
  activityToasts: defineSettingsSearchRow({
    id: "notifications:activity-toasts",
    titleKey: "settings.activityToasts",
    keywords:
      "Show an in-app toast when a chat or managed terminal agent finishes or needs input. alerts",
  }),
  desktopNotifications: defineSettingsSearchRow({
    id: "notifications:desktop-notifications",
    titleKey: "settings.desktopNotifications",
    keywords:
      "Show an OS notification when a chat or managed terminal agent finishes or needs input while the app is in the background. alerts toast",
  }),
} as const;

export const APPSNAP_SETTINGS_SEARCH = {
  enable: defineSettingsSearchRow({
    id: "appsnap:enable",
    titleKey: "settings.enableAppSnap",
    keywords:
      "Capture the frontmost macOS app window with a configurable two-key shortcut and add it to a recent task. appshot screenshot snap window capture hotkey",
  }),
  shortcut: defineSettingsSearchRow({
    id: "appsnap:shortcut",
    titleKey: "settings.shortcut",
    keywords: "Press the left and right Option keys at the same time. hotkey chord alt keys",
  }),
  destination: defineSettingsSearchRow({
    id: "appsnap:destination",
    titleKey: "settings.destination",
    keywords:
      "Snaps join the task you interacted with in the last minute, otherwise a fresh task opens. automatic target composer",
  }),
  captureSound: defineSettingsSearchRow({
    id: "appsnap:capture-sound",
    titleKey: "settings.captureSound",
    keywords: "Play a short shutter cue when a window is captured. sound effect audio mute",
  }),
  permissions: defineSettingsSearchPanel({
    id: "appsnap:permissions",
    titleKey: "settings.permissionStatus",
    keywords:
      "Input Monitoring and Screen Recording permissions for AppSnap in macOS System Settings. privacy security recheck grant",
  }),
} as const;

// FILE: bootstrap.ts
// Purpose: Starts the renderer without reading any predecessor product storage.

import { bootstrapSignedOutScreen } from "./authSignedOut";
import { bootstrapPairingSession } from "./pairingBootstrap";
import { shouldInitializeDesktopStartupSplash } from "./startup/startupReadiness";
import { initializeStartupSplash } from "./startup/startupSplash";
import { applyStoredThemeState } from "./theme/theme.bootstrap";

applyStoredThemeState();

const desktopBridge = window.desktopBridge;
if (shouldInitializeDesktopStartupSplash(window.location.pathname, Boolean(desktopBridge))) {
  initializeStartupSplash(desktopBridge?.startupPresentation ?? "brief");
}

if (!bootstrapSignedOutScreen()) {
  void bootstrapPairingSession().then((result) => {
    if (result === "not-pairing") {
      return import("./main");
    }
  });
}

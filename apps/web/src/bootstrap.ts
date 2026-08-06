// FILE: bootstrap.ts
// Purpose: Completes synchronous renderer storage migration before any app store can hydrate.

import "./storageOriginUpgrade";
import "./composerDraftV2Transcode";

import { bootstrapSignedOutScreen } from "./authSignedOut";
import { bootstrapPairingSession } from "./pairingBootstrap";

if (!bootstrapSignedOutScreen()) {
  void bootstrapPairingSession().then((result) => {
    if (result === "not-pairing") {
      return import("./main");
    }
  });
}

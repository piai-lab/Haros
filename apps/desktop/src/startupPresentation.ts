// FILE: startupPresentation.ts
// Purpose: Selects one full startup presentation per Desktop process, then brief reopen motion.
// Layer: Desktop process lifecycle

export type StartupPresentation = "full" | "brief";

export function makeStartupPresentationOwner(): { claim(): StartupPresentation } {
  let fullPresentationClaimed = false;
  return {
    claim() {
      if (fullPresentationClaimed) return "brief";
      fullPresentationClaimed = true;
      return "full";
    },
  };
}

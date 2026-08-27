// FILE: startupPresentation.ts
// Purpose: Grants the startup presentation once per Desktop process.
// Layer: Desktop process lifecycle

export type StartupPresentation = "full" | "none";

export function makeStartupPresentationOwner(): { claim(): StartupPresentation } {
  let fullPresentationClaimed = false;
  return {
    claim() {
      if (fullPresentationClaimed) return "none";
      fullPresentationClaimed = true;
      return "full";
    },
  };
}

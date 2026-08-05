// FILE: PluginLibrary.tsx
// Purpose: Truthful re-entry surface while Product-owned Package discovery is unavailable.

import { RouteInsetSurface } from "./RouteInsetSurface";

export function PluginLibrary() {
  return (
    <RouteInsetSurface>
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-10">
        <h1 className="text-lg font-semibold text-foreground">Packages</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Package and Skill discovery is unavailable in this build. Runtime capabilities come from
          the Native Host; no Provider marketplace or cross-Provider fallback is queried.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Return here after a Product-owned catalog, trust, compatibility, and activation surface
          is connected.
        </p>
      </section>
    </RouteInsetSurface>
  );
}

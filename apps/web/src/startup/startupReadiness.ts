// FILE: startupReadiness.ts
// Purpose: Derives presentation-only startup terminal facts from canonical route and catalog owners.
// Layer: Web startup presentation

import type { ProviderModelCatalogState } from "../hooks/useProviderModelCatalog";

const NON_COMPOSER_PREFIXES = [
  "/settings",
  "/kanban",
  "/pull-requests",
  "/automations",
  "/plugins",
];

export function startupRouteExpectsComposer(pathname: string): boolean {
  return !NON_COMPOSER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldInitializeDesktopStartupSplash(
  pathname: string,
  hasDesktopBridge: boolean,
): boolean {
  return hasDesktopBridge && pathname !== "/pair" && pathname !== "/signed-out";
}

export function isTerminalStartupCatalogState(state: ProviderModelCatalogState): boolean {
  return state === "ready" || state === "empty" || state === "stale" || state === "error";
}

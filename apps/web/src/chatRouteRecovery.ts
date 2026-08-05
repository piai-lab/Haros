// Purpose: Give route restore one authoritative Product shell refresh before falling back.

import { EMPTY_ROUTE_RESTORE_FALLBACK_DELAY_MS } from "./chatRouteRestore";
import { useProductStore } from "./store/productStore";
import { readProductNativeApi, type ProductNativeApi } from "./wsNativeApi";

export function waitForEmptyRouteRestoreFallbackDelay(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, EMPTY_ROUTE_RESTORE_FALLBACK_DELAY_MS);
  });
}

export async function refreshEmptyRouteRestoreSnapshot(
  providedApi?: Pick<ProductNativeApi, "getShellSnapshot">,
): Promise<boolean> {
  let api = providedApi;
  try {
    api ??= readProductNativeApi();
  } catch {
    return false;
  }
  const shell = await api.getShellSnapshot();
  useProductStore.getState().setShellSnapshot(shell);
  return shell.conversations.length > 0;
}

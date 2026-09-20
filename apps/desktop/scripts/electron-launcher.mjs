import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const desktopDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Run the installed runtime unchanged. Editing a copied signed macOS bundle's
 * Info.plist invalidates its resource seal and can crash sandboxed helpers.
 * Haros owns its source window identity in main; packaged branding belongs to
 * the artifact builder, never an implicitly patched development runtime.
 */
export function resolveElectronPath() {
  return createRequire(import.meta.url)("electron");
}

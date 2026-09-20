import {
  BrowserCookieImportInput,
  BrowserVaultSettings,
  BrowserVaultError,
  browserVaultErrorCode,
} from "@harnessos/contracts";
import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { Schema } from "effect";
import type { DesktopBrowserManager } from "./browserManager";
import type { BrowserVault } from "./browserAutomation/browserVault";
import { BROWSER_IPC_CHANNELS } from "./ipcChannels";
import type { BrowserCookieImport } from "./browserAutomation/browserCookieImport";

const Response = Schema.Struct({ id: Schema.String, save: Schema.Boolean });
const Password = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(1024));
const Reveal = Schema.Struct({
  id: Schema.String.check(Schema.isMaxLength(256)),
  password: Password,
});
const CookieSource = Schema.Literals(["chrome", "safari", "edge"]);

export function registerBrowserVaultIpc(
  ipcMain: IpcMain,
  manager: DesktopBrowserManager,
  vault: BrowserVault,
  notify: (change: { logins: boolean }) => void,
  cookies?: BrowserCookieImport,
  retryCapture?: () => Promise<void>,
): () => Promise<void> {
  const channels = BROWSER_IPC_CHANNELS.vault;
  const active = new Set<Promise<unknown>>();
  let closed = false;
  const handle = (channel: string, action: (input: unknown) => unknown) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, input: unknown) => {
      if (
        !manager.isTrustedRenderer(event.sender.id) ||
        event.senderFrame !== event.sender.mainFrame
      ) {
        throw new Error("Browser vault access denied.");
      }
      if (closed) throw new BrowserVaultError("unavailable");
      const operation = Promise.resolve().then(() => action(input));
      active.add(operation);
      try {
        return await operation;
      } catch (error) {
        const code = browserVaultErrorCode(error);
        const storageRead = channel === channels.snapshot || channel === channels.listLogins;
        throw new BrowserVaultError(
          code === "unavailable" && storageRead ? "storage_failed" : code,
        );
      } finally {
        active.delete(operation);
      }
    });
  };
  handle(channels.snapshot, () => vault.snapshot());
  handle(channels.listLogins, () => vault.listLogins());
  handle(channels.retryCapture, () => {
    if (!retryCapture) throw new BrowserVaultError("unavailable");
    return retryCapture();
  });
  handle(channels.configure, (input) =>
    vault.configure(Schema.decodeUnknownSync(BrowserVaultSettings)(input)),
  );
  handle(channels.remove, (input) => vault.remove(Schema.decodeUnknownSync(Schema.String)(input)));
  handle(channels.respond, (input) => vault.respond(Schema.decodeUnknownSync(Response)(input)));
  handle(channels.setupMaster, (input) =>
    vault.setupMaster(Schema.decodeUnknownSync(Password)(input)),
  );
  handle(channels.unlock, (input) => vault.unlock(Schema.decodeUnknownSync(Password)(input)));
  handle(channels.lock, () => vault.lock());
  handle(channels.reveal, (input) => vault.reveal(Schema.decodeUnknownSync(Reveal)(input)));
  const requireCookies = () => {
    if (!cookies) throw new Error("Cookie import is unavailable.");
    return cookies;
  };
  handle(channels.cookieSources, () => requireCookies().sources());
  handle(channels.cookieProfiles, (input) =>
    requireCookies().profiles(Schema.decodeUnknownSync(CookieSource)(input)),
  );
  handle(channels.importCookies, (input) =>
    requireCookies().import(Schema.decodeUnknownSync(BrowserCookieImportInput)(input)),
  );
  handle(channels.cookieImportStatus, () => requireCookies().status());
  handle(channels.cancelCookieImport, (input) =>
    requireCookies().cancel(Schema.decodeUnknownSync(Schema.String)(input)),
  );
  const unsubscribe = vault.onChanged(notify);
  const unsubscribeImport = cookies?.onChanged(() => notify({ logins: false }));
  return async () => {
    closed = true;
    unsubscribe();
    unsubscribeImport?.();
    for (const channel of Object.values(channels))
      if (channel !== channels.changed) ipcMain.removeHandler(channel);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.allSettled(active),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Browser vault shutdown timed out.")), 10_000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
}

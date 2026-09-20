import { useEffect, useRef, useState } from "react";
import type { BrowserVaultSettings, ThreadId } from "@harnessos/contracts";
import { CentralIcon } from "~/lib/central-icons";
import { useI18n } from "~/i18n";
import { readNativeApi } from "~/nativeApi";
import { Button } from "./ui/button";
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "./ui/dialog";
import { DisclosureRegion } from "./ui/DisclosureRegion";
import { Switch } from "./ui/switch";
import { useBrowserVault } from "~/hooks/useBrowserVault";
import { browserVaultErrorMessage } from "~/lib/browserVaultErrorMessage";
import { BrowserVaultMaster } from "./BrowserVaultMaster";
import { BrowserCookieImport, type BrowserCookieDestination } from "./BrowserCookieImport";

const OPEN_EVENT = "haros:open-browser-vault";

export function BrowserVaultButton({
  destination,
}: {
  destination?: BrowserCookieDestination | undefined;
}) {
  const { t } = useI18n();
  if (!readNativeApi()?.browser.vault) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-7"
      aria-label={t("browser.savedLogins")}
      title={t("browser.savedLogins")}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(OPEN_EVENT, destination ? { detail: destination } : {}),
        )
      }
    >
      <CentralIcon name="key-1" className="size-3.5" />
    </Button>
  );
}

export function BrowserVaultDialog() {
  const { t } = useI18n();
  const api = readNativeApi()?.browser.vault;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [master, setMaster] = useState<
    { kind: "setup" | "unlock" } | { kind: "reveal"; id: string } | null
  >(null);
  const [destination, setDestination] = useState<BrowserCookieDestination>();
  const mounted = useRef(false);
  const { snapshot, logins, loadError, reload } = useBrowserVault(api, open, true);
  useEffect(() => {
    mounted.current = true;
    const show = (event: Event) => {
      setDestination((event as CustomEvent<BrowserCookieDestination | undefined>).detail);
      setError(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      mounted.current = false;
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);
  useEffect(() => {
    if (snapshot?.protection.locked) setMaster(null);
  }, [snapshot?.protection.locked]);

  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      if (mounted.current) setError(browserVaultErrorMessage(cause, t));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const configure = (changes: Partial<BrowserVaultSettings>) => {
    if (!snapshot || !api) return;
    void act(() => api.configure({ ...snapshot.settings, ...changes }));
  };

  if (!api) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDeleting(null);
          setMaster(null);
        }
      }}
    >
      <DialogPopup className="max-w-lg">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <CentralIcon name="key-1" className="size-4 text-muted-foreground" />
            {t("browser.savedLogins")}
          </DialogTitle>
        </DialogHeader>
        <DialogPanel>
          {error || loadError || snapshot?.error ? (
            <div
              className="flex items-center justify-between gap-3 py-3 text-sm text-destructive"
              role="alert"
            >
              <span>
                {error ??
                  (loadError
                    ? browserVaultErrorMessage(loadError, t)
                    : t("browser.vaultCaptureFailed"))}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  if (loadError) reload();
                  else if (snapshot?.error && api) void act(() => api.retryCapture());
                  else reload();
                }}
              >
                {t("browser.vaultRetry")}
              </Button>
            </div>
          ) : null}
          {!snapshot ? (
            loadError ? null : (
              <p className="py-6 text-sm text-muted-foreground" role="status">
                {t("browser.vaultLoading")}
              </p>
            )
          ) : (
            <>
              {snapshot.protection.locked ? (
                <div className="flex items-center justify-between gap-3 py-4 text-sm">
                  <span>{t("browser.savedLoginsLocked")}</span>
                  <Button
                    size="sm"
                    onClick={() =>
                      setMaster({ kind: snapshot.protection.configured ? "unlock" : "setup" })
                    }
                  >
                    {snapshot.protection.configured
                      ? t("browser.savedLoginsUnlock")
                      : t("browser.savedLoginsSetMaster")}
                  </Button>
                </div>
              ) : null}
              {open && master && master.kind !== "reveal" ? (
                <BrowserVaultMaster
                  key={master.kind}
                  api={api}
                  action={master}
                  onDone={() => {
                    setMaster(null);
                  }}
                />
              ) : null}
              <section aria-label={t("browser.vaultAccounts")} className="pt-3">
                <div className="flex items-center justify-between pb-2 text-xs font-medium text-muted-foreground">
                  <h3>{t("browser.vaultLogins")}</h3>
                  <span>{logins.length}</span>
                </div>
                {logins.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <CentralIcon name="keyhole" className="size-7 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">{t("browser.vaultEmpty")}</p>
                    <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                      {t("browser.vaultBack")}
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {logins.map((login) => (
                      <li key={login.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <CentralIcon name="key-1" className="mt-1 size-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium">{login.origin}</p>
                            <p className="break-words text-sm text-muted-foreground">
                              {login.username || t("browser.vaultNoUsername")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {login.source === "agent"
                                ? t("browser.vaultAgentSource")
                                : login.source === "user"
                                  ? t("browser.vaultUserSource")
                                  : t("browser.vaultUnknownSource")}
                            </p>
                            {login.status !== "saved" ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {login.status === "expired"
                                  ? t("browser.vaultExpired")
                                  : t("browser.vaultPending")}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("browser.vaultRevealFor", {
                              account: login.username || login.origin,
                            })}
                            title={t("browser.vaultReveal")}
                            disabled={busy}
                            onClick={() =>
                              setMaster(
                                snapshot.protection.configured
                                  ? { kind: "reveal", id: login.id }
                                  : { kind: "setup" },
                              )
                            }
                          >
                            <CentralIcon name="eye-open" className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("browser.vaultDeleteFor", {
                              account: login.username || login.origin,
                            })}
                            title={t("browser.vaultDelete")}
                            disabled={busy}
                            onClick={() => setDeleting(login.id)}
                          >
                            <CentralIcon name="trash-can" className="size-4" />
                          </Button>
                        </div>
                        <DisclosureRegion
                          open={open && master?.kind === "reveal" && master.id === login.id}
                        >
                          {open && master?.kind === "reveal" && master.id === login.id ? (
                            <BrowserVaultMaster
                              key={login.id}
                              api={api}
                              action={master}
                              onDone={() => setMaster(null)}
                            />
                          ) : null}
                        </DisclosureRegion>
                        <DisclosureRegion open={deleting === login.id}>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm">
                            <span>{t("browser.vaultDeleteConfirm")}</span>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => setDeleting(null)}
                              >
                                {t("browser.vaultCancel")}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={busy}
                                onClick={() => {
                                  void act(async () => {
                                    await api.remove(login.id);
                                    setDeleting(null);
                                  });
                                }}
                              >
                                {t("browser.vaultDeleteAction")}
                              </Button>
                            </div>
                          </div>
                        </DisclosureRegion>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section
                className="mt-3 space-y-4 border-t pt-4 pb-1 text-sm"
                aria-label={t("browser.vaultAccess")}
              >
                <h3 className="text-xs font-medium text-muted-foreground">
                  {t("browser.vaultAccess")}
                </h3>
                <div className="flex items-center justify-between gap-4">
                  <span>{t("browser.vaultMaster")}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || snapshot.protection.locked}
                    onClick={() => {
                      if (snapshot.protection.configured) {
                        setMaster(null);
                        void act(() => api.lock());
                      } else setMaster({ kind: "setup" });
                    }}
                  >
                    {snapshot.protection.configured
                      ? t("browser.vaultLock")
                      : t("browser.vaultSetup")}
                  </Button>
                </div>
                <label className="flex items-center justify-between gap-4">
                  <span>{t("browser.vaultAgentConsent")}</span>
                  <Switch
                    aria-label={t("browser.vaultAgentConsent")}
                    checked={snapshot.settings.agentUse}
                    disabled={busy}
                    onCheckedChange={(agentUse) => configure({ agentUse })}
                  />
                </label>
                <p className="text-xs text-muted-foreground">{t("browser.vaultNoAgentFill")}</p>
                <label className="flex items-center justify-between gap-4">
                  <span>{t("browser.vaultOfferSave")}</span>
                  <Switch
                    aria-label={t("browser.vaultOfferSave")}
                    checked={snapshot.settings.offerSave}
                    disabled={busy}
                    onCheckedChange={(offerSave) =>
                      configure({ offerSave, ...(offerSave ? {} : { autosave: false }) })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>{t("browser.vaultAutosave")}</span>
                  <Switch
                    aria-label={t("browser.vaultAutosave")}
                    checked={snapshot.settings.autosave}
                    disabled={busy || !snapshot.settings.offerSave}
                    onCheckedChange={(autosave) => configure({ autosave })}
                  />
                </label>
              </section>
              {open && destination ? (
                <BrowserCookieImport
                  key={`${destination.threadId}:${destination.tabId}:${destination.origin}`}
                  api={api}
                  destination={destination}
                />
              ) : null}
            </>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

/** Contextual save prompt: never opens a modal or moves keyboard focus. */
export function BrowserVaultSavePrompt({ threadId, tabId }: { threadId: ThreadId; tabId: string }) {
  const api = readNativeApi()?.browser.vault;
  const { t } = useI18n();
  const { snapshot } = useBrowserVault(api, true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompt = snapshot?.pending.find(
    (entry) => entry.threadId === threadId && entry.tabId === tabId,
  );
  useEffect(() => {
    setError(null);
    setBusy(false);
  }, [prompt?.id]);
  if (!api || !prompt) return null;
  const respond = async (save: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.respond({ id: prompt.id, save });
    } catch (cause) {
      setError(browserVaultErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label={t("browser.vaultSavePrompt")}
      className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-3 py-2 text-xs"
    >
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="font-medium">
          {prompt.mode === "update" ? t("browser.vaultUpdatePrompt") : t("browser.vaultSavePrompt")}
        </p>
        <p className="break-all text-muted-foreground">
          {prompt.origin} · {prompt.username}
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void respond(false)}>
        {t("browser.vaultNotNow")}
      </Button>
      <Button size="sm" disabled={busy} onClick={() => void respond(true)}>
        {prompt.mode === "update" ? t("browser.vaultUpdate") : t("browser.vaultSave")}
      </Button>
    </section>
  );
}

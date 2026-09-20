import type { DesktopSafariAccessInfo } from "@harnessos/contracts";
import { GlobeIcon, SettingsIcon } from "~/lib/icons";
import { useI18n } from "~/i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";

const OPEN_EVENT = "haros:safari-access-setup";

function useSafariAccessInfo() {
  const [info, setInfo] = useState<DesktopSafariAccessInfo | null>(null);
  useEffect(() => {
    let disposed = false;
    const bridge = window.desktopBridge?.safariAccess;
    const request = bridge ? bridge.getInfo() : Promise.resolve({ supported: false } as const);
    void request
      .then((value) => {
        if (!disposed) setInfo(value);
      })
      .catch(() => {
        if (!disposed) setInfo({ supported: false });
      });
    return () => {
      disposed = true;
    };
  }, []);
  return info;
}

export function SafariAccessSetupButton() {
  const { t } = useI18n();
  const info = useSafariAccessInfo();
  if (!info?.supported) return null;
  return (
    <Button size="sm" variant="outline" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      <SettingsIcon className="size-4" />
      {t("browser.safariImportSetup")}
    </Button>
  );
}

/** Permission help opens only on an explicit request; it never probes protected files. */
export function SafariAccessOnboarding({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const info = useSafariAccessInfo();
  const [revisit, setRevisit] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const open = info?.supported === true && revisit;

  useEffect(() => {
    const show = () => {
      setStatus(null);
      setRevisit(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      generation.current++;
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  const close = () => {
    generation.current++;
    setBusy(false);
    setStatus(null);
    setRevisit(false);
  };
  const run = async (action: "openSettings" | "revealApp") => {
    if (busy) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const opened = await window.desktopBridge?.safariAccess?.[action]();
      if (request !== generation.current) return;
      setStatus(
        opened
          ? action === "openSettings"
            ? t("browser.safariSettingsOpened")
            : t("browser.safariAppRevealed")
          : t("browser.safariOpenFailed"),
      );
    } catch {
      if (request === generation.current) setStatus(t("browser.safariOpenFailed"));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };

  return (
    <>
      {children}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogPopup showCloseButton={false} initialFocus={sheetRef} className="max-w-[400px]">
          <div ref={sheetRef} tabIndex={-1} className="min-h-0 overflow-y-auto outline-none">
            <DialogHeader className="items-center gap-3 px-6 pt-7 pb-0 text-center">
              <GlobeIcon aria-hidden className="size-16 text-foreground" />
              <DialogTitle className="mt-1">{t("browser.safariTitle")}</DialogTitle>
              <DialogDescription className="text-balance leading-relaxed">
                {t("browser.safariDescription")}
              </DialogDescription>
            </DialogHeader>

            {info?.supported ? (
              <ol className="mx-6 mt-5 space-y-3 text-sm leading-relaxed">
                <Step n={1}>{t("browser.safariStepSettings")}</Step>
                <Step n={2}>
                  {t("browser.safariStepEnable", { app: info.appName })}
                  {info.appPath ? (
                    <>
                      {" "}
                      {t("browser.safariNotListed")}{" "}
                      <button
                        type="button"
                        disabled={busy}
                        title={info.appPath}
                        onClick={() => {
                          void run("revealApp");
                        }}
                        className="rounded-sm underline decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                      >
                        {t("browser.safariReveal")}
                      </button>{" "}
                      {t("browser.safariDrag")}
                    </>
                  ) : null}
                </Step>
                <Step n={3}>{t("browser.safariRestart")}</Step>
              </ol>
            ) : null}

            <p className="mx-6 mt-5 text-xs leading-relaxed text-muted-foreground/80">
              {t("browser.safariPermissionDescription")}
            </p>

            {status ? (
              <p role="status" className="mx-6 mt-3 text-xs leading-relaxed text-muted-foreground">
                {status}
              </p>
            ) : null}

            <DialogFooter className="mt-5 px-6 pb-6 pt-0">
              <Button variant="ghost" onClick={close}>
                {t("browser.vaultNotNow")}
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  void run("openSettings");
                }}
              >
                {t("browser.safariOpenSettings")}
              </Button>
            </DialogFooter>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-muted-foreground">
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular-nums text-foreground/70"
      >
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

import { useEffect, useRef, useState } from "react";
import type {
  BrowserCookieImportResult,
  BrowserCookieImportStatus,
  BrowserVaultMethods,
  ThreadId,
} from "@harnessos/contracts";
import { useI18n } from "~/i18n";
import { Button } from "./ui/button";
import { SafariAccessSetupButton } from "./SafariAccessOnboarding";
import { DisclosureRegion } from "./ui/DisclosureRegion";

export interface BrowserCookieDestination {
  threadId: ThreadId;
  tabId: string;
  origin: string | null;
}
type Choice = { id: string; name: string };

function importFailure(
  result: Extract<BrowserCookieImportResult, { ok: false }>,
  browser: string,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (result.code === "permission_denied") {
    if (result.platform === "macos" && browser === "safari") return t("browser.cookieSafariDenied");
    if (result.platform === "macos") return t("browser.cookieMacDenied");
    return t("browser.cookieDenied");
  }
  if (result.code === "cancelled" || result.code === "target_changed")
    return t("browser.cookieStopped");
  if (result.code === "busy") return t("browser.cookieBusy");
  if (result.code === "timed_out") return t("browser.cookieTimeout");
  if (result.code === "source_missing") return t("browser.cookieMissing");
  if (result.code === "reader_unavailable") return t("browser.cookieReaderUnavailable");
  if (result.code === "persistence_failed") return t("browser.cookiePersistenceFailed");
  if (result.code === "reader_failed" && result.stage === "acquisition")
    return t("browser.cookieAcquisitionFailed");
  if (result.code === "reader_failed" && (result.stage === "parse" || result.stage === "decode"))
    return t("browser.cookieDecodeFailed");
  if (result.code === "reader_failed" && result.stage === "decrypt")
    return t("browser.cookieDecryptFailed");
  if (result.code === "reader_failed") return t("browser.cookieReaderFailed");
  return t("browser.cookieTransferFailed");
}

export function BrowserCookieImport({
  api,
  destination,
}: {
  api: BrowserVaultMethods;
  destination: BrowserCookieDestination;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<Choice[]>([]);
  const [profiles, setProfiles] = useState<Choice[]>([]);
  const [source, setSource] = useState("");
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [scope, setScope] = useState<"site" | "profile">(destination.origin ? "site" : "profile");
  const [confirmed, setConfirmed] = useState(false);
  const generation = useRef(0);
  const operation = useRef<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [phase, setPhase] = useState<BrowserCookieImportStatus["phase"]>("checking");
  useEffect(() => {
    let disposed = false;
    const unsubscribe = api.onChanged(() => {
      if (!operation.current) return;
      void api
        .cookieImportStatus()
        .then((value) => {
          if (!disposed && value?.operationId === operation.current) setPhase(value.phase);
        })
        .catch(() => {});
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [api]);
  useEffect(
    () => () => {
      generation.current++;
      if (operation.current) void api.cancelCookieImport(operation.current).catch(() => {});
    },
    [api, destination.threadId, destination.tabId, destination.origin],
  );

  const loadProfiles = async (browser: string) => {
    const request = ++generation.current;
    setSource(browser);
    setConfirmed(false);
    setProfile("");
    setProfiles([]);
    setBusy(true);
    setStatus(null);
    try {
      const choices = await api.cookieProfiles(browser);
      if (request !== generation.current) return;
      setProfiles(choices);
      setProfile(choices[0]?.id ?? "");
      if (!choices.length) setStatus(t("browser.cookieNoProfiles"));
    } catch {
      if (request === generation.current) setStatus(t("browser.cookieProfilesFailed"));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };

  const load = async () => {
    setOpen(true);
    setBusy(true);
    setStatus(null);
    const request = ++generation.current;
    try {
      const choices = await api.cookieSources();
      if (request !== generation.current) return;
      setSources(choices);
      if (choices[0]) await loadProfiles(choices[0].id);
      else {
        setStatus(t("browser.cookieUnsupported"));
        setBusy(false);
      }
    } catch {
      if (request === generation.current) {
        setStatus(t("browser.cookieUnavailable"));
        setBusy(false);
      }
    }
  };

  const run = async () => {
    if (
      busy ||
      !profile ||
      !["chrome", "safari", "edge"].includes(source) ||
      (scope === "profile" && !confirmed)
    )
      return;
    if (source !== "chrome" && source !== "safari" && source !== "edge") return;
    const request = ++generation.current;
    const operationId = crypto.randomUUID();
    operation.current = operationId;
    setPhase("checking");
    setBusy(true);
    setStatus(null);
    try {
      const target = {
        operationId,
        threadId: destination.threadId,
        tabId: destination.tabId,
        browser: source,
        profile,
      } as const;
      const result =
        scope === "profile"
          ? await api.importCookies({ ...target, scope: "profile", confirmed: true })
          : destination.origin
            ? await api.importCookies({ ...target, scope: "site", origin: destination.origin })
            : null;
      if (request === generation.current && result)
        setStatus(
          result.ok
            ? t(
                result.imported === 1 ? "browser.cookieImportedOne" : "browser.cookieImportedMany",
                { imported: result.imported, skipped: result.skipped },
              ) + (result.warnings.length ? t("browser.cookieImportWarnings") : "")
            : importFailure(result, source, t) +
                (result.mayHaveImported ? " " + t("browser.cookiePartial") : ""),
        );
    } catch {
      if (request === generation.current) setStatus(t("browser.cookieStopped"));
    } finally {
      if (operation.current === operationId) operation.current = null;
      if (request === generation.current) {
        setCancelling(false);
        setBusy(false);
        setConfirmed(false);
      }
    }
  };

  return (
    <section className="mt-4 border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => {
          if (open) setOpen(false);
          else void load();
        }}
      >
        {t("browser.cookieImport")}
      </Button>
      <DisclosureRegion open={open}>
        <div className="space-y-3 pt-3 text-sm">
          <label className="block space-y-1">
            <span>{t("browser.cookieScope")}</span>
            <select
              aria-label={t("browser.cookieScopeLabel")}
              className="h-8 w-full rounded-md border bg-background px-2"
              value={scope}
              disabled={busy}
              onChange={(event) => {
                setScope(event.target.value === "profile" ? "profile" : "site");
                setConfirmed(false);
                setStatus(null);
              }}
            >
              {destination.origin ? (
                <option value="site">
                  {t("browser.cookieThisSite", { origin: destination.origin })}
                </option>
              ) : null}
              <option value="profile">{t("browser.cookieAllProfile")}</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {scope === "profile"
              ? t("browser.cookieProfileDescription")
              : t("browser.cookieSiteDescription")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0 space-y-1">
              <span>{t("browser.cookieBrowser")}</span>
              <select
                aria-label={t("browser.cookieBrowserLabel")}
                className="h-8 w-full rounded-md border bg-background px-2"
                value={source}
                disabled={busy}
                onChange={(event) => {
                  void loadProfiles(event.target.value);
                }}
              >
                {sources.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-1">
              <span>{t("browser.cookieProfile")}</span>
              <select
                aria-label={t("browser.cookieProfileLabel")}
                className="h-8 w-full rounded-md border bg-background px-2"
                value={profile}
                disabled={busy}
                onChange={(event) => {
                  setProfile(event.target.value);
                  setConfirmed(false);
                }}
              >
                {profiles.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DisclosureRegion open={scope === "profile"}>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>{t("browser.cookieImportConsent")}</span>
            </label>
          </DisclosureRegion>
          {busy && operation.current ? (
            <p role="status" className="text-xs text-muted-foreground">
              {t(`browser.cookiePhase.${phase}`)}
            </p>
          ) : null}
          {status ? (
            <p role="status" className="text-xs text-muted-foreground">
              {status}
            </p>
          ) : null}
          {source === "safari" ? <SafariAccessSetupButton /> : null}
          <p className="text-xs text-muted-foreground">{t("browser.cookieAutomationPause")}</p>
          <div className="flex justify-end gap-2">
            {busy && operation.current ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={cancelling}
                onClick={() => {
                  const id = operation.current;
                  if (!id) return;
                  setCancelling(true);
                  void api.cancelCookieImport(id).catch(() => {
                    setStatus(t("browser.cookieStopped"));
                    setCancelling(false);
                  });
                }}
              >
                {cancelling ? t("browser.cookieCancelling") : t("common.cancel")}
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={busy || !profile || (scope === "profile" && !confirmed)}
              onClick={() => {
                void run();
              }}
            >
              {busy
                ? t("browser.savedLoginsWorking")
                : scope === "profile"
                  ? t("browser.cookieImportAllSites")
                  : t("browser.cookieImportThisSite")}
            </Button>
          </div>
        </div>
      </DisclosureRegion>
    </section>
  );
}

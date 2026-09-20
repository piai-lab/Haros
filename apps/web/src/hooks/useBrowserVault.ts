import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BrowserVaultMethods,
  BrowserVaultSnapshot,
  BrowserVaultLogin,
} from "@harnessos/contracts";

/** UI projection only. The native owner remains authoritative; events invalidate once. */
export function useBrowserVault(
  api: BrowserVaultMethods | undefined,
  enabled: boolean,
  accounts = false,
) {
  const [snapshot, setSnapshot] = useState<BrowserVaultSnapshot>();
  const [logins, setLogins] = useState<BrowserVaultLogin[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const request = useRef<(logins: boolean) => void>(() => {});
  const reload = useCallback(() => request.current(true), []);
  useEffect(() => {
    if (!api || !enabled) {
      setSnapshot(undefined);
      setLogins([]);
      setLoadError(null);
      return;
    }
    let disposed = false;
    let scheduled = false;
    let running = false;
    let dirty = false;
    let dirtyLogins = false;
    const refresh = (includeLogins: boolean) => {
      dirty = true;
      dirtyLogins ||= includeLogins;
      if (scheduled || running) return;
      scheduled = true;
      queueMicrotask(async () => {
        scheduled = false;
        if (disposed) return;
        running = true;
        try {
          while (dirty) {
            if (disposed) return;
            dirty = false;
            const readLogins = dirtyLogins;
            dirtyLogins = false;
            try {
              const next = await api.snapshot();
              const entries =
                accounts && readLogins && !next.protection.locked
                  ? await api.listLogins()
                  : undefined;
              if (disposed) return;
              // A newer event supersedes this read (especially a lock or removal).
              if (dirty) {
                dirtyLogins ||= readLogins;
                continue;
              }
              setSnapshot(next);
              if (next.protection.locked) setLogins([]);
              else if (entries) setLogins(entries);
              setLoadError(null);
            } catch (error) {
              if (!disposed) {
                setLogins([]);
                setLoadError(error);
              }
            }
          }
        } finally {
          running = false;
        }
      });
    };
    request.current = refresh;
    const unsubscribe = api.onChanged((change) => refresh(change.logins));
    refresh(true);
    return () => {
      disposed = true;
      request.current = () => {};
      unsubscribe();
    };
  }, [api, enabled, accounts]);
  return { snapshot, logins, loadError, reload };
}

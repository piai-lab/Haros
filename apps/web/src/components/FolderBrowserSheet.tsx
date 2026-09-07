import { useCallback, useEffect, useState } from "react";
import type { FilesystemBrowseResult } from "@harnessos/contracts";

import { readNativeApi } from "../nativeApi";
import { ArrowLeftIcon, CheckIcon, LoaderCircleIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { useI18n } from "../i18n";
import { FolderClosed } from "./FolderClosed";
import { Sheet, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";

function trimDirectoryPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return ".";
  if (trimmed === "/" || /^[A-Za-z]:[\\/]?$/.test(trimmed)) return trimmed;
  return trimmed.replace(/[\\/]+$/, "");
}

function trailingSeparator(value: string): string {
  return value.includes("\\") ? "\\" : "/";
}

function browsePath(value: string): string {
  const normalized = trimDirectoryPath(value);
  if (normalized === "/" || /^[A-Za-z]:[\\/]$/.test(normalized)) return normalized;
  return `${normalized}${trailingSeparator(normalized)}`;
}

function parentPath(value: string): string | null {
  const normalized = trimDirectoryPath(value);
  if (normalized === "." || normalized === "/" || /^[A-Za-z]:[\\/]?$/.test(normalized)) {
    return null;
  }
  const separatorIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (separatorIndex < 0) return null;
  if (separatorIndex === 0) return normalized.startsWith("/") ? "/" : null;
  return normalized.slice(0, separatorIndex);
}

export function FolderBrowserSheet(props: {
  readonly open: boolean;
  readonly initialPath: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (path: string) => void;
}) {
  const { t } = useI18n();
  const [currentPath, setCurrentPath] = useState(() => browsePath(props.initialPath));
  const [result, setResult] = useState<FilesystemBrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setCurrentPath(browsePath(props.initialPath));
      setResult(null);
      setError(null);
    }
  }, [props.initialPath, props.open]);

  const load = useCallback(
    async (path: string) => {
      const api = readNativeApi();
      if (!api) {
        setError(t("project.folderBrowserUnavailable"));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await api.filesystem.browse({ partialPath: browsePath(path) });
        setResult(next);
      } catch (cause) {
        setResult(null);
        setError(cause instanceof Error ? cause.message : t("project.folderBrowserLoadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!props.open) return;
    void load(currentPath);
  }, [currentPath, load, props.open]);

  const selectCurrent = () => {
    props.onSelect(trimDirectoryPath(currentPath));
    props.onOpenChange(false);
  };

  const parent = parentPath(currentPath);
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>{t("project.folderBrowserTitle")}</SheetTitle>
          <p
            className="truncate text-sm text-muted-foreground"
            title={trimDirectoryPath(currentPath)}
          >
            {trimDirectoryPath(currentPath)}
          </p>
        </SheetHeader>
        <SheetPanel className="pt-2">
          {parent ? (
            <button
              type="button"
              className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-foreground/5"
              onClick={() => setCurrentPath(browsePath(parent))}
            >
              <ArrowLeftIcon className="size-4 text-muted-foreground" />
              {t("project.folderBrowserUp")}
            </button>
          ) : null}
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              {t("project.folderBrowserLoading")}
            </div>
          ) : error ? (
            <p role="alert" className="px-3 py-4 text-sm text-destructive">
              {error}
            </p>
          ) : result && result.entries.length > 0 ? (
            <div className="space-y-1">
              {result.entries.map((entry) => (
                <button
                  type="button"
                  key={entry.fullPath}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                    "hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  )}
                  onClick={() => setCurrentPath(browsePath(entry.fullPath))}
                >
                  <FolderClosed className="size-4 text-muted-foreground" />
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {t("project.folderBrowserEmpty")}
            </p>
          )}
        </SheetPanel>
        <SheetFooter>
          <Button variant="prominent" onClick={selectCurrent} disabled={loading || Boolean(error)}>
            <CheckIcon className="size-4" />
            {t("project.folderBrowserSelect")}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}

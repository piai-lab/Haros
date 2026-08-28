// FILE: ShareDialog.tsx
// Purpose: Preview and locally copy/save the complete Usage Insights PNG.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfileStats, ProfileTokenStats } from "@harnessos/contracts";

import { Button } from "~/components/ui/button";
import { Dialog, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { useI18n } from "~/i18n";
import { CopyIcon, DownloadIcon } from "~/lib/icons";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, ShareCard } from "./ShareCard";
import { copyImageToClipboard, downloadBlob, renderNodeToPngBlob } from "./shareCardExport";

const PREVIEW_WIDTH = 480;

interface ShareDialogProps {
  readonly stats: ProfileStats;
  readonly tokenStats: ProfileTokenStats | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ stats, tokenStats, open, onOpenChange }: ShareDialogProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"copy" | "save" | null>(null);
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_WIDTH);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !previewRef.current) return;
    const node = previewRef.current;
    const update = (width: number) =>
      setPreviewWidth(Math.max(1, Math.min(PREVIEW_WIDTH, Math.floor(width))));
    update(node.clientWidth || PREVIEW_WIDTH);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) =>
      update(entries[0]?.contentRect.width ?? node.clientWidth),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  const render = useCallback(() => {
    const node = cardRef.current;
    return node
      ? renderNodeToPngBlob(node, {
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
        })
      : Promise.resolve(null);
  }, []);

  const handleCopy = useCallback(async () => {
    setBusy("copy");
    setStatus(null);
    const blob = await render();
    const copied = blob ? await copyImageToClipboard(blob) : false;
    setStatus(t(copied ? "settings.profileImageCopied" : "settings.profileImageCopyFailed"));
    setBusy(null);
  }, [render, t]);

  const handleSave = useCallback(async () => {
    setBusy("save");
    setStatus(null);
    const blob = await render();
    if (blob) downloadBlob(blob, `omnimind-usage-insights-${stats.timezone.today}.png`);
    setStatus(t(blob ? "settings.profileImageSaved" : "settings.profileImageRenderFailed"));
    setBusy(null);
  }, [render, stats.timezone.today, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-[560px]">
        <DialogTitle className="text-center text-xl">
          {t("settings.exportUsageInsights")}
        </DialogTitle>
        <div className="mt-5 flex flex-col items-center gap-5 px-2 pb-3">
          <div
            ref={previewRef}
            className="w-full max-w-[480px] overflow-hidden rounded-2xl border bg-background shadow-sm"
            style={{
              aspectRatio: `${SHARE_CARD_WIDTH} / ${SHARE_CARD_HEIGHT}`,
            }}
          >
            <div
              style={{
                width: SHARE_CARD_WIDTH,
                transform: `scale(${previewWidth / SHARE_CARD_WIDTH})`,
                transformOrigin: "top left",
              }}
            >
              <ShareCard ref={cardRef} stats={stats} tokenStats={tokenStats} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={busy !== null} onClick={() => void handleCopy()}>
              <CopyIcon />
              {busy === "copy" ? t("common.copying") : t("common.copy")}
            </Button>
            <Button disabled={busy !== null} onClick={() => void handleSave()}>
              <DownloadIcon />
              {busy === "save" ? t("common.saving") : t("common.save")}
            </Button>
          </div>
          <p className="min-h-4 text-center text-xs text-muted-foreground" aria-live="polite">
            {status}
          </p>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

// FILE: TurnChangedFilesEvidence.tsx
// Purpose: Settled Timeline evidence for the Checkpoint-owned cumulative Turn diff.
// Layer: Chat presentation composition

import type { ThreadId, TurnId } from "@harnessos/contracts";
import type { FileDiffMetadata } from "@pierre/diffs/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useCopyToClipboard } from "~/hooks/useCopyToClipboard";
import { useI18n } from "~/i18n";
import {
  buildFileDiffRenderKey,
  getRenderablePatch,
  rawPatchByFileRenderKey,
  resolveFileDiffPath,
} from "~/lib/diffRendering";
import { checkpointDiffQueryOptions } from "~/lib/engineReactQuery";
import { ChangesIcon, CheckIcon, CopyIcon } from "~/lib/icons";
import type { TimestampFormat } from "../../localPreferences";
import type { TurnDiffSummary } from "../../types";
import type { WorkLogEntry } from "../../workLog";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { DisclosureRegion } from "../ui/DisclosureRegion";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { toastManager } from "../ui/toast";
import { DiffStatLabel } from "./DiffStatLabel";
import { FileDiffCard, FileDiffSurface } from "./FileDiffView";
import { CodeBlockSurface } from "./MarkdownCodeBlock";
import { ToolCallDetailsContent } from "./ToolCallDetailsDialog";

function checkpointRange(summary: TurnDiffSummary): {
  fromTurnCount: number;
  toTurnCount: number;
  turnCounts: number[];
} | null {
  const turnCounts = [
    ...(summary.checkpointTurnCounts ?? []),
    ...(summary.checkpointTurnCount === undefined ? [] : [summary.checkpointTurnCount]),
  ]
    .filter((value) => Number.isInteger(value) && value > 0)
    .toSorted((left, right) => left - right);
  const uniqueTurnCounts = [...new Set(turnCounts)];
  const first = uniqueTurnCounts.at(0);
  const last = uniqueTurnCounts.at(-1);
  return first === undefined || last === undefined
    ? null
    : {
        fromTurnCount: Math.max(0, first - 1),
        toTurnCount: last,
        turnCounts: uniqueTurnCounts,
      };
}

export function TurnChangedFilesEvidence(props: {
  summary: TurnDiffSummary;
  threadId?: ThreadId | undefined;
  turnId: TurnId;
  resolvedTheme: "light" | "dark";
  fontSizePx: number;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
  onUndoTurnFiles?: ((turnCounts: readonly number[]) => void) | undefined;
  technicalEntries?: ReadonlyArray<WorkLogEntry> | undefined;
  timestampFormat: TimestampFormat;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const range = useMemo(() => checkpointRange(props.summary), [props.summary]);
  const files = props.summary.files;
  const totalAdditions = files.reduce((sum, file) => sum + (file.additions ?? 0), 0);
  const totalDeletions = files.reduce((sum, file) => sum + (file.deletions ?? 0), 0);
  return (
    <section data-turn-changed-files-evidence="true">
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-1.5 rounded-sm py-1 text-left outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/60"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChangesIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
        <span
          className="min-w-0 truncate font-system-ui font-normal text-foreground/92"
          style={{ fontSize: props.fontSizePx }}
        >
          {t("timeline.editedFiles")}
        </span>
        {totalAdditions + totalDeletions > 0 ? (
          <span className="ml-auto shrink-0 tabular-nums" style={{ fontSize: props.fontSizePx }}>
            <DiffStatLabel additions={totalAdditions} deletions={totalDeletions} />
          </span>
        ) : null}
        <DisclosureChevron open={open} className="shrink-0 text-muted-foreground/70" />
      </button>
      <DisclosureRegion open={open} contentClassName="pt-1.5">
        {open ? <TurnChangedFilesEvidenceBody {...props} range={range} /> : null}
      </DisclosureRegion>
    </section>
  );
}

function TurnChangedFilesEvidenceBody(
  props: Parameters<typeof TurnChangedFilesEvidence>[0] & {
    range: ReturnType<typeof checkpointRange>;
  },
) {
  const { t } = useI18n();
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const canReadPatch =
    props.threadId !== undefined &&
    props.range !== null &&
    props.summary.status !== "missing" &&
    props.summary.status !== "error";
  const diffQuery = useQuery(
    checkpointDiffQueryOptions({
      threadId: props.threadId ?? null,
      fromTurnCount: props.range?.fromTurnCount ?? null,
      toTurnCount: props.range?.toTurnCount ?? null,
      ignoreWhitespace: false,
      cacheScope: `timeline:${props.summary.turnId}`,
      gcTimeMs: 0,
      enabled: canReadPatch,
    }),
  );
  const patch = diffQuery.data?.diff;
  const renderablePatch = useMemo(
    () => getRenderablePatch(patch, `timeline:${props.summary.turnId}`),
    [patch, props.summary.turnId],
  );
  const rawPatchByFile = useMemo(
    () =>
      renderablePatch?.kind === "files"
        ? rawPatchByFileRenderKey(patch, renderablePatch.files, `timeline:${props.summary.turnId}`)
        : new Map<string, string>(),
    [patch, props.summary.turnId, renderablePatch],
  );
  const [collapsedFiles, setCollapsedFiles] = useState<ReadonlySet<string>>(() => new Set());
  const undoTurnCounts = props.range?.turnCounts;
  const canUndo =
    undoTurnCounts !== undefined &&
    props.summary.checkpointRef !== undefined &&
    !props.summary.checkpointRef.startsWith("agent-diff:") &&
    props.onUndoTurnFiles !== undefined;

  const toggleFile = (fileKey: string) => {
    setCollapsedFiles((current) => {
      const next = new Set(current);
      if (next.has(fileKey)) next.delete(fileKey);
      else next.add(fileKey);
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      {!canReadPatch ? (
        <TurnDiffStateLine text={t("timeline.turnDiffUnavailable")} fontSizePx={props.fontSizePx} />
      ) : diffQuery.isLoading ? (
        <TurnDiffStateLine text={t("diff.loadingCheckpoint")} fontSizePx={props.fontSizePx} />
      ) : diffQuery.isError ? (
        <TurnDiffStateLine text={t("timeline.turnDiffUnavailable")} fontSizePx={props.fontSizePx} />
      ) : renderablePatch?.kind === "files" ? (
        <div data-turn-diff-scroll-root="true">
          <FileDiffSurface className="max-h-[min(46vh,30rem)] overflow-auto py-1 pr-1">
            {renderablePatch.files.map((fileDiff) => {
              const fileKey = buildFileDiffRenderKey(fileDiff);
              const path = resolveFileDiffPath(fileDiff);
              return (
                <TimelineFileDiffCard
                  key={`${fileKey}:${props.resolvedTheme}`}
                  fileDiff={fileDiff}
                  filePatch={rawPatchByFile.get(fileKey)}
                  path={path}
                  collapsed={collapsedFiles.has(fileKey)}
                  theme={props.resolvedTheme}
                  onToggle={() => toggleFile(fileKey)}
                />
              );
            })}
          </FileDiffSurface>
        </div>
      ) : renderablePatch?.kind === "raw" ? (
        <RawTurnPatch patch={patch ?? renderablePatch.text} />
      ) : (
        <TurnDiffStateLine text={t("diff.noNetChanges")} fontSizePx={props.fontSizePx} />
      )}

      <div className="flex justify-end gap-1 pt-0.5">
        {canUndo && undoTurnCounts ? (
          <Button variant="ghost" size="xs" onClick={() => props.onUndoTurnFiles?.(undoTurnCounts)}>
            {t("timeline.undoChanges")}
          </Button>
        ) : null}
        <Button variant="ghost" size="xs" onClick={() => props.onOpenTurnDiff(props.turnId)}>
          {t("timeline.fullReview")}
        </Button>
      </div>

      {props.technicalEntries?.length ? (
        <div className="border-t border-[color:var(--color-border-light)] pt-1">
          <button
            type="button"
            className="flex items-center gap-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
            style={{ fontSize: props.fontSizePx }}
            aria-expanded={technicalOpen}
            onClick={() => setTechnicalOpen((current) => !current)}
          >
            <DisclosureChevron open={technicalOpen} />
            {t("timeline.toolTechnicalDetails")}
          </button>
          <DisclosureRegion open={technicalOpen} contentClassName="space-y-1 pb-1 pl-2 pt-1">
            {technicalOpen
              ? props.technicalEntries.map((entry) => (
                  <TechnicalToolEntry
                    key={entry.id}
                    entry={entry}
                    threadId={props.threadId}
                    timestampFormat={props.timestampFormat}
                    fontSizePx={props.fontSizePx}
                  />
                ))
              : null}
          </DisclosureRegion>
        </div>
      ) : null}
    </div>
  );
}

function TurnDiffStateLine(props: { text: string; fontSizePx: number }) {
  return (
    <p className="py-2 text-muted-foreground" style={{ fontSize: props.fontSizePx }}>
      {props.text}
    </p>
  );
}

function TimelineFileDiffCard(props: {
  fileDiff: FileDiffMetadata;
  filePatch?: string | undefined;
  path: string;
  collapsed: boolean;
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const { copyToClipboard, isCopied } = useCopyToClipboard({
    onError: () => toastManager.add({ type: "error", title: t("timeline.copyFailed") }),
  });
  const copyLabel = isCopied
    ? t("common.copied")
    : t("timeline.copyFileDiff", { path: props.path });
  return (
    <FileDiffCard
      className="mb-2 last:mb-0"
      fileDiff={props.fileDiff}
      theme={props.theme}
      collapsed={props.collapsed}
      onToggleCollapsed={props.onToggle}
      toggleLabel={t(props.collapsed ? "diff.expandFile" : "diff.collapseFile", {
        path: props.path,
      })}
      headerActions={
        props.filePatch ? (
          <IconButton
            label={copyLabel}
            tooltip={copyLabel}
            data-timeline-file-copy={props.path}
            onClick={() => copyToClipboard(props.filePatch ?? "", undefined)}
          >
            {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          </IconButton>
        ) : null
      }
    />
  );
}

function RawTurnPatch(props: { patch: string }) {
  const { t } = useI18n();
  return (
    <div className="chat-markdown">
      <CodeBlockSurface
        title={<span className="chat-markdown-codeblock__lang">diff</span>}
        copyText={props.patch}
        copyLabel={t("timeline.copyTurnDiff")}
        bodyProps={{ className: "max-h-[min(46vh,30rem)] overflow-auto overscroll-contain" }}
      >
        <pre className="p-3 font-chat-code text-[11px] leading-relaxed text-foreground/88">
          <code>{props.patch}</code>
        </pre>
      </CodeBlockSurface>
    </div>
  );
}

function TechnicalToolEntry(props: {
  entry: WorkLogEntry;
  threadId?: ThreadId | undefined;
  timestampFormat: TimestampFormat;
  fontSizePx: number;
}) {
  const [open, setOpen] = useState(false);
  const label = props.entry.toolTitle ?? props.entry.label;
  return (
    <div className="border-l border-border/45 pl-2">
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-1 py-1 text-left text-muted-foreground transition-colors hover:text-foreground"
        style={{ fontSize: props.fontSizePx }}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <DisclosureChevron open={open} />
        <span className="truncate">{label}</span>
      </button>
      <DisclosureRegion open={open} contentClassName="space-y-2 pb-1 pl-3 pt-1">
        {open ? (
          <ToolCallDetailsContent
            details={props.entry.toolDetails}
            activity={props.entry.liveActivity}
            expanded
            threadId={props.threadId}
            timestampFormat={props.timestampFormat}
          />
        ) : null}
      </DisclosureRegion>
    </div>
  );
}

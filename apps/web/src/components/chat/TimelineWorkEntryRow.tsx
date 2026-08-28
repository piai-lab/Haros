// FILE: TimelineWorkEntryRow.tsx
// Purpose: Renders transcript work/tool rows and their inline details.
// Layer: Web chat presentation component
// Exports: TimelineWorkEntryRow, EditedFileRowContent, prefersCompactWorkEntryRow

import type { TurnId } from "@harnessos/contracts";
import {
  createElement,
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { basenameOfPath } from "~/file-icons";
import type { TimestampFormat } from "../../localPreferences";
import {
  AskUserIcon,
  BackgroundTrayIcon,
  BotIcon,
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
  GitHubIcon,
  GlobeIcon,
  HammerIcon,
  type LucideIcon,
  McpIcon,
  PencilIcon,
  ReasoningIcon,
  SearchIcon,
  SkillCubeIcon,
  TerminalIcon,
  WebSearchIcon,
  ZapIcon,
} from "~/lib/icons";
import { describeLinkChip } from "~/lib/linkChips";
import {
  buildLocalImageUrl,
  isLocalImageMarkdownSrc,
  localImageFileName,
} from "~/lib/localImageUrls";
import { cn } from "~/lib/utils";

import { isFileChangeWorkLogEntry, type WorkLogEntry } from "../../session-logic";
import {
  formatAgentActivityEntryPreview,
  isAgentActivityWorkEntry,
  isCodexActivityStatusWorkEntry,
  isReasoningUpdateWorkEntry,
} from "./agentActivity.logic";
import { AutomationCreatedCard } from "./AutomationCreatedCard";
import ChatMarkdown from "../ChatMarkdown";
import { DiffStatLabel } from "./DiffStatLabel";
import { type ExpandedImagePreview } from "./ExpandedImagePreview";
import { LinkChipIcon } from "../LinkChipIcon";
import { normalizeCompactToolLabel } from "./MessagesTimeline.logic";
import { HarnessOSLogo } from "../HarnessOSLogo";
import { ToolCallDetailsContent } from "./ToolCallDetailsDialog";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { DisclosureRegion } from "../ui/DisclosureRegion";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { fileDiffStatsByPath, resolveFileDiffStatByChangedPath } from "~/lib/diffRendering";
import {
  extractToolArgumentField,
  isPrefixedToolArgumentSummary,
} from "../../lib/toolArgumentSummary";
import {
  deriveFriendlyCommandTarget,
  deriveHarnessOSMcpToolTitle,
  extractWebFetchUrl,
  isHarnessOSBrowserToolCall,
  normalizeToolTextForComparison,
  resolveCommandVisualKind,
  sanitizeHarnessOSMcpToolPreview,
  type HarnessOSMcpToolStatus,
} from "../../lib/toolCallLabel";
import { formatLiveActivityMeta, useLiveActivityNow } from "../../lib/liveActivityPresentation";
import { openWorkspaceFileReference, useWorkspaceFileOpener } from "../../lib/workspaceFileOpener";
import { useI18n } from "~/i18n";
import { MUTED_LABEL_TEXT_CLASS_NAME, MUTED_LABEL_TEXT_COLOR } from "~/surfaceStyles";

const TRANSCRIPT_DISCLOSURE_TRANSITION_MS = 220;
const TRANSCRIPT_DISCLOSURE_CLEANUP_BUFFER_MS = 40;
// Rest tone is the shared quiet-label gray (same one the composer pickers use for
// their effort/thinking labels) so a tool row and the picker below it read as one
// muted tone; hover still lifts the whole row to full foreground.
const WORK_ROW_MUTED_HOVER_TONE: Record<"tool-row" | "file-row", string> = {
  "tool-row": `${MUTED_LABEL_TEXT_CLASS_NAME} transition-colors group-hover/tool-row:text-foreground group-focus-visible/tool-row:text-foreground`,
  "file-row": `${MUTED_LABEL_TEXT_CLASS_NAME} transition-colors group-hover/file-row:text-foreground group-focus-visible/file-row:text-foreground`,
};
const EMPTY_FILE_DIFF_STATS: ReadonlyMap<string, { additions: number; deletions: number }> =
  new Map();

type TimelineWorkEntry = WorkLogEntry;

const AgentTaskIcon: LucideIcon = (props) => <BotIcon {...props} />;

const HarnessOSToolIcon: LucideIcon = ({ className, ...props }) => (
  <HarnessOSLogo {...props} className={cn("scale-[1.15] text-current", className)} />
);

function workToneIcon(tone: TimelineWorkEntry["tone"]): {
  icon: LucideIcon;
  className: string;
} {
  if (tone === "error") {
    return {
      icon: CircleAlertIcon,
      className: "text-muted-foreground/50",
    };
  }
  if (tone === "thinking") {
    return {
      icon: BotIcon,
      className: "text-muted-foreground/40",
    };
  }
  if (tone === "info") {
    return {
      icon: CheckIcon,
      className: "text-muted-foreground/50",
    };
  }
  return {
    icon: ZapIcon,
    className: "text-muted-foreground/45",
  };
}

/**
 * Try to extract a clean file path from a detail string that may contain JSON.
 * Handles patterns like:
 *   Read {"file_path":"/Users/foo/bar.ts","offset":10}
 *   {"file_path":"/path/to/file.ts"}
 */
function extractFilePathFromDetail(detail: string): string | null {
  const plainPathMatch = /^(.+?\.[A-Za-z0-9][A-Za-z0-9._-]*)(?::\d+)?(?::\d+)?$/u.exec(
    detail.trim(),
  );
  if (plainPathMatch?.[1]?.includes("/")) {
    return plainPathMatch[1].trim();
  }
  // "path" is generic enough that a nested match (e.g. inside a config object)
  // may not be the file the tool acted on — only regex-scan truncated JSON.
  return extractToolArgumentField(detail, ["file_path", "filePath", "path", "filename"], {
    fallbackScan: "whenUnparsed",
  });
}

function workEntryPreview(workEntry: TimelineWorkEntry): string | null {
  if (isReasoningUpdateWorkEntry(workEntry)) {
    return formatAgentActivityEntryPreview(workEntry);
  }
  const isFileRelated =
    workEntry.requestKind === "file-read" ||
    workEntry.requestKind === "file-change" ||
    workEntry.itemType === "file_change";

  if (workEntry.itemType === "command_execution" || workEntry.command || workEntry.rawCommand) {
    const command = workEntry.command ?? workEntry.rawCommand;
    // Running and settled command rows share one target so the row text only
    // swaps tense ("Searching for foo in src" → "Searched for foo in src").
    if (command) return deriveFriendlyCommandTarget(command);
  }

  if (workEntry.preview) return workEntry.preview;

  // Prefer clean basenames from changedFiles
  if (workEntry.changedFiles && workEntry.changedFiles.length > 0) {
    const names = workEntry.changedFiles.map((p) => basenameOfPath(p));
    if (names.length === 1) return names[0]!;
    return `${names.length} files`;
  }

  if (workEntry.itemType === "collab_agent_tool_call") {
    return workEntry.detail ?? workEntry.subagentAction?.prompt ?? null;
  }

  // For detail, try to extract a clean file path first
  if (workEntry.detail) {
    const filePath = extractFilePathFromDetail(workEntry.detail);
    if (filePath) return basenameOfPath(filePath);

    // For file-related entries, the heading alone is enough — don't show raw JSON
    if (isFileRelated) return null;

    // For other entries, if the detail looks like raw JSON, skip it
    const trimmedDetail = workEntry.detail.trim();
    if (trimmedDetail.startsWith("{") || trimmedDetail.startsWith("[")) return null;

    // Dynamic/MCP tool calls surface their arguments as `ToolName: {json}` —
    // transport detail, not a human summary. The raw call stays in toolDetails.
    // Failed calls keep their detail inline: it may carry the error text (e.g.
    // an MCP error serialized as `McpError: {json}`), and on a failure more
    // information beats a tidy row.
    if (toolWorkEntryStatus(workEntry) !== "failed" && isPrefixedToolArgumentSummary(trimmedDetail))
      return null;

    const readLinesMatch = /^Read\s+(\d+\s+lines?)$/i.exec(trimmedDetail);
    if (readLinesMatch?.[1]) return readLinesMatch[1];

    // Clean, non-JSON detail — show it
    return trimmedDetail;
  }

  return null;
}

// Engine read tools (e.g. Claude's `Read`) arrive as generic dynamic tool calls
// without a `file-read` requestKind, so match their tool name to surface the search icon
// instead of the generic tool/wrench fallback.
function isFileReadToolEntry(workEntry: TimelineWorkEntry): boolean {
  const name = (workEntry.toolName ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return name === "read" || name === "readfile" || name === "viewfile";
}

// Command rows reuse toolCallLabel's wrapper-aware classifier so wrapped git/gh
// commands get the GitHub mark while ordinary commands keep the terminal icon.
function commandWorkEntryIcon(workEntry: TimelineWorkEntry): LucideIcon {
  const command = workEntry.command ?? workEntry.rawCommand;
  switch (command ? resolveCommandVisualKind(command) : "terminal") {
    case "inspect":
      return SearchIcon;
    case "git":
    case "github":
      return GitHubIcon;
    case "terminal":
      return TerminalIcon;
  }
}

function workEntryIcon(workEntry: TimelineWorkEntry): LucideIcon {
  if (isReasoningUpdateWorkEntry(workEntry)) return ReasoningIcon;
  // Requested and terminal rows share one canonical two-way interaction identity;
  // structured settlement copy and tone distinguish their lifecycle states.
  if (
    workEntry.activityKind === "user-input.requested" ||
    workEntry.activityKind === "user-input.resolved"
  ) {
    return AskUserIcon;
  }
  // "Moved to background" notices read as a tray drop, not a warning check.
  if (workEntry.nativeEventType === "background_tasks_changed") return BackgroundTrayIcon;

  if (workEntry.requestKind === "command") return commandWorkEntryIcon(workEntry);
  if (workEntry.requestKind === "file-read") return SearchIcon;
  if (workEntry.requestKind === "file-change") return PencilIcon;

  if (workEntry.itemType === "command_execution" || workEntry.command) {
    return commandWorkEntryIcon(workEntry);
  }
  if (workEntry.itemType === "file_change") {
    return PencilIcon;
  }
  if (workEntry.itemType === "web_search") return WebSearchIcon;
  if (workEntry.itemType === "image_generation") return ZapIcon;
  if (workEntry.itemType === "image_view") return EyeIcon;
  if (isFileReadToolEntry(workEntry)) return SearchIcon;

  switch (workEntry.itemType) {
    case "mcp_tool_call":
      return SkillCubeIcon;
    case "dynamic_tool_call":
      return HammerIcon;
    case "collab_agent_tool_call":
      return AgentTaskIcon;
  }

  return workToneIcon(workEntry.tone).icon;
}

// Dynamic icon selection is data, not a component declaration. Keeping the
// createElement call in this module helper avoids presenting a render-local
// component binding to React Compiler.
export function renderWorkEntryIcon(Icon: LucideIcon, className: string): ReactElement {
  return createElement(Icon, { className });
}

// The leading glyph for a tool row: recognizable product and surface icons win
// over the kind-derived entry icon. Shared with the collapsed tool-group summary
// row, which borrows its first entry's icon.
export function workEntryLeftIcon(workEntry: TimelineWorkEntry): LucideIcon {
  if (workEntry.activityKind === "skill.instructions.failed") return CircleAlertIcon;
  if (workEntry.activityKind === "skill.instructions.delivered") return SkillCubeIcon;
  // Structure owns User Input identity. It deliberately wins over Engine,
  // Tool-name, MCP, browser, and brand marks so every truthful adapter shares
  // this projection without teaching the Web resolver native Ask aliases.
  if (
    workEntry.activityKind === "user-input.requested" ||
    workEntry.activityKind === "user-input.resolved"
  ) {
    return AskUserIcon;
  }
  if (isGitHubMcpToolCall(workEntry)) return GitHubIcon;
  if (isHarnessOSBrowserWorkEntry(workEntry)) return GlobeIcon;
  if (isHarnessOSToolCall(workEntry)) return HarnessOSToolIcon;
  if (workEntry.itemType === "mcp_tool_call") return McpIcon;
  return workEntryIcon(workEntry);
}

function isGitHubMcpToolCall(workEntry: TimelineWorkEntry): boolean {
  const toolName = workEntry.toolName?.trim().toLowerCase();
  return Boolean(toolName?.startsWith("mcp__codex_apps__github"));
}

// HarnessOS's own host-gateway tools (harnessos_list_threads, harnessos_create_thread,
// ...) get the HarnessOS mark instead of the generic MCP glyph. Engines report
// the call differently: Claude prefixes the MCP server (mcp__harnessos__*), ACP
// agents surface the bare tool name (harnessos_*), and Codex reports server/tool
// pairs that the label humanizer renders as "HarnessOS: ...".
function toolWorkEntryStatus(workEntry: TimelineWorkEntry): HarnessOSMcpToolStatus {
  if (workEntry.toolStatus) return workEntry.toolStatus;
  return workEntry.activityKind !== undefined && workEntry.activityKind !== "tool.completed"
    ? "running"
    : "completed";
}

function isHarnessOSBrowserWorkEntry(workEntry: TimelineWorkEntry): boolean {
  return isHarnessOSBrowserToolCall({
    toolName: workEntry.toolName,
    title: workEntry.toolTitle,
    fallbackLabel: workEntry.label,
    status: toolWorkEntryStatus(workEntry),
  });
}

function isHarnessOSToolCall(workEntry: TimelineWorkEntry): boolean {
  return (
    deriveHarnessOSMcpToolTitle({
      toolName: workEntry.toolName,
      title: workEntry.toolTitle,
      fallbackLabel: workEntry.label,
      status: toolWorkEntryStatus(workEntry),
    }) !== null
  );
}

// Render command, agent-task, file-change, and file-read rows at the tighter
// compact density so every tool-call line shares one height regardless of whether
// it carries a disclosure chevron.
export function prefersCompactWorkEntryRow(workEntry: TimelineWorkEntry): boolean {
  // Public reasoning is a peer Timeline activity heading, not prose at the
  // header level. Keep its leading column identical to the surrounding tool
  // rows; the expanded body continues to own its more generous text rhythm.
  if (isReasoningUpdateWorkEntry(workEntry)) {
    return true;
  }
  if (
    workEntry.activityKind === "user-input.requested" ||
    workEntry.activityKind === "user-input.resolved"
  ) {
    return true;
  }
  if (isCodexActivityStatusWorkEntry(workEntry)) {
    return true;
  }
  // Commands stay compact even when surfaced with a non-terminal icon (read-only
  // inspections like `cat` now use the file-read search icon).
  if (workEntry.itemType === "command_execution" || workEntry.command || workEntry.rawCommand) {
    return true;
  }
  const EntryIcon = workEntryIcon(workEntry);
  return (
    EntryIcon === TerminalIcon ||
    EntryIcon === HammerIcon ||
    EntryIcon === AgentTaskIcon ||
    EntryIcon === PencilIcon ||
    EntryIcon === SkillCubeIcon ||
    // File-read / inspect rows (e.g. `Read …`) surface the search icon and have no
    // disclosure chevron; keep them at the same compact height as command rows.
    EntryIcon === SearchIcon
  );
}

function capitalizePhrase(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return value;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function normalizeBundledWebAccessToolName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : null;
}

function toolWorkEntryHeading(workEntry: TimelineWorkEntry): string {
  const harnessosTitle = deriveHarnessOSMcpToolTitle({
    toolName: workEntry.toolName,
    title: workEntry.toolTitle,
    fallbackLabel: workEntry.label,
    status: toolWorkEntryStatus(workEntry),
  });
  if (harnessosTitle) {
    return harnessosTitle;
  }
  if (!workEntry.toolTitle) {
    return capitalizePhrase(normalizeCompactToolLabel(workEntry.label));
  }
  return capitalizePhrase(normalizeCompactToolLabel(workEntry.toolTitle));
}

function combineWorkEntryDisplayText(heading: string, preview: string | null): string {
  if (!preview) {
    return heading;
  }
  return normalizeToolTextForComparison(heading) === normalizeToolTextForComparison(preview)
    ? heading
    : `${heading} ${preview}`;
}

function isFileChangeWorkEntry(workEntry: TimelineWorkEntry): boolean {
  return isFileChangeWorkLogEntry(workEntry);
}

function commandTooltipContent(
  command: string,
  displayText: string,
  labels: { readonly summary: string; readonly rawCall: string },
) {
  return (
    <div className="max-w-96 whitespace-pre-wrap leading-tight">
      <div className="space-y-2">
        <div className="space-y-0.5">
          <div className="text-muted-foreground/70">{labels.summary}</div>
          <div>{displayText}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-muted-foreground/70">{labels.rawCall}</div>
          <code className="block whitespace-pre-wrap break-words font-chat-code text-[11px] text-foreground/92">
            {command}
          </code>
        </div>
      </div>
    </div>
  );
}

// Hover content for a tool-call row: the rich command card when a raw command is
// present, otherwise the plain label (used to reveal truncated text / file paths).
// Returns null when there's nothing worth showing so the row renders untouched.
function toolRowTooltipContent(
  rawCommand: string | null | undefined,
  displayText: string,
  fallback: string | undefined,
  labels: { readonly summary: string; readonly rawCall: string },
): ReactNode {
  if (rawCommand) {
    return commandTooltipContent(rawCommand, displayText, labels);
  }
  return fallback ? <span className="whitespace-pre-wrap">{fallback}</span> : null;
}

// Frosted hover tooltip for tool-call rows — the same surface (via the `default`
// variant) as the sidebar thread/project hover cards, so the rows read as one
// system. Replaces the native `title` tooltip; renders the trigger untouched when
// there's no content to show.
function ToolRowTooltip(props: { content: ReactNode; children: ReactElement }) {
  if (!props.content) {
    return props.children;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={props.children} />
      <TooltipPopup side="top" align="start" className="max-w-96 whitespace-normal">
        {props.content}
      </TooltipPopup>
    </Tooltip>
  );
}

function AttachmentTransferFailuresRow(props: {
  failures: NonNullable<WorkLogEntry["attachmentTransferFailures"]>;
  compact: boolean;
  rowFontSizePx: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("group/tool-row min-w-0", props.compact ? "py-0.5" : "py-1")}>
      <button
        type="button"
        className={cn(
          "flex w-full max-w-full items-center text-left focus-visible:outline-none",
          props.compact ? "gap-1.5" : "gap-2",
        )}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center",
            WORK_ROW_MUTED_HOVER_TONE["tool-row"],
            props.compact ? "size-4" : "size-5",
          )}
        >
          <CircleAlertIcon className={props.compact ? "size-3.5" : "size-4"} />
        </span>
        <span
          className={cn("min-w-0 flex-1 truncate", WORK_ROW_MUTED_HOVER_TONE["tool-row"])}
          style={{ fontSize: `${props.rowFontSizePx}px` }}
        >
          {t("chatToAgent.attachmentsPartial", {
            count: props.failures.length,
          })}
        </span>
        <DisclosureChevron open={open} />
      </button>
      <DisclosureRegion
        open={open}
        contentClassName={cn("ml-7 min-w-0 pt-1.5", props.compact && "ml-5")}
      >
        <ul className="space-y-1 text-[var(--color-text-foreground-secondary)]">
          {props.failures.map((failure) => (
            <li
              key={`${failure.targetMessageId}:${failure.attachmentIndex}`}
              className="flex min-w-0 items-baseline gap-2"
              style={{ fontSize: `${Math.max(11, props.rowFontSizePx - 1)}px` }}
            >
              <span className="min-w-0 truncate">{failure.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {t(`chatToAgent.attachmentFailure.${failure.reason}`)}
              </span>
            </li>
          ))}
        </ul>
      </DisclosureRegion>
    </div>
  );
}

export const TimelineWorkEntryRow = memo(function TimelineWorkEntryRow(props: {
  workEntry: TimelineWorkEntry;
  chatMetaFontSizePx: number;
  textFontSizePx?: number;
  density?: "default" | "compact";
  fileDiffStatByPath?: ReadonlyMap<string, { additions: number; deletions: number }>;
  markdownCwd: string | undefined;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  turnId?: TurnId;
  onOpenTurnDiff?: (turnId: TurnId, filePath?: string) => void;
  onOpenAgentActivity?: (activityId: string) => void;
  onOpenAutomation?: (automationId: string) => void;
  onOpenEngineWebSurface?: (surfaceId: string) => void;
  reasoningDefaultOpen?: boolean;
  reasoningOpenOverride?: boolean | undefined;
  onReasoningOpenChange?: (entryId: string, open: boolean) => void;
  reasoningIsLive?: boolean;
  timestampFormat: TimestampFormat;
}) {
  // Defaults are applied in the body (not in the destructuring pattern): a default
  // value inside a destructuring pattern makes React Compiler bail out on the whole
  // component, silently dropping memoization for every tool-call row.
  const {
    workEntry,
    chatMetaFontSizePx,
    textFontSizePx: textFontSizePxProp,
    density: densityProp,
    fileDiffStatByPath,
    markdownCwd,
    onImageExpand,
    turnId,
    onOpenTurnDiff,
    onOpenAgentActivity,
    onOpenAutomation,
    onOpenEngineWebSurface,
    reasoningDefaultOpen,
    reasoningOpenOverride,
    onReasoningOpenChange,
    reasoningIsLive,
    timestampFormat,
  } = props;
  const textFontSizePx = textFontSizePxProp ?? chatMetaFontSizePx;
  const density = densityProp ?? "default";
  const rowFontSizePx = textFontSizePx;
  const { t } = useI18n();
  const compact = density === "compact";
  const isCodexStatusRow =
    !isReasoningUpdateWorkEntry(workEntry) && isCodexActivityStatusWorkEntry(workEntry);
  const EntryIcon = workEntryIcon(workEntry);
  // Web-fetch tool calls surface the target site (favicon + URL) instead of the raw
  // `WebFetch: {json}` arguments, reusing the same link-chip icon/label path as
  // composer and markdown links so every site reference looks identical.
  const webFetchUrl = extractWebFetchUrl(workEntry);
  // Standard tool rows keep one discoverable left glyph. Codex status rows
  // deliberately skip it and reuse only the shared tool-label typography.
  const isGitHubToolRow = isGitHubMcpToolCall(workEntry);
  const isHarnessOSBrowserToolRow = !isGitHubToolRow && isHarnessOSBrowserWorkEntry(workEntry);
  const isHarnessOSToolRow =
    !isGitHubToolRow && !isHarnessOSBrowserToolRow && isHarnessOSToolCall(workEntry);
  const isMcpToolRow =
    workEntry.itemType === "mcp_tool_call" &&
    !isGitHubToolRow &&
    !isHarnessOSBrowserToolRow &&
    !isHarnessOSToolRow;
  const LeftIcon = workEntryLeftIcon(workEntry);
  const leftIconKind = webFetchUrl
    ? "web-fetch"
    : isGitHubToolRow || EntryIcon === GitHubIcon
      ? "github"
      : isHarnessOSBrowserToolRow
        ? "browser"
        : isHarnessOSToolRow
          ? "oa"
          : isMcpToolRow
            ? "mcp"
            : undefined;
  const bundledWebAccessHeading = (() => {
    switch (
      normalizeBundledWebAccessToolName(
        workEntry.toolName ?? workEntry.toolTitle ?? workEntry.label,
      )
    ) {
      case "web_search":
        return t("settings.webSearch.tool.webSearch");
      case "source_check":
        return t("settings.webSearch.tool.sourceCheck");
      case "fetch_content":
        return t("settings.webSearch.tool.fetchContent");
      case "get_search_content":
        return t("settings.webSearch.tool.getSearchContent");
      default:
        return null;
    }
  })();
  // Task progress is product copy, not a tool lifecycle suffix. Rendering the
  // structured count through the shared catalog both localizes it and keeps a
  // terminal "completed" from the compact heading normalizer.
  const heading = workEntry.askUserProvenanceUnavailable
    ? t("pendingInput.provenanceUnavailable")
    : workEntry.userInputSettlementStatus
      ? t(`pendingInput.receipt.${workEntry.userInputSettlementStatus}`)
      : workEntry.activityKind === "user-input.requested"
        ? t("pendingInput.waitingForAnswer")
        : workEntry.skillDelivery
          ? t(
              workEntry.activityKind === "skill.instructions.failed"
                ? "skill.instructionsFailed"
                : "skill.instructionsLoaded",
              { skillName: workEntry.skillDelivery.skillName },
            )
          : workEntry.itemType === "command_execution" ||
              workEntry.requestKind === "command" ||
              Boolean(workEntry.command ?? workEntry.rawCommand)
            ? t("tool.command.single")
            : workEntry.taskListProgress
              ? t("taskList.progress", workEntry.taskListProgress)
              : (bundledWebAccessHeading ?? toolWorkEntryHeading(workEntry));
  const rawPreview = workEntry.askUserProvenanceUnavailable
    ? ""
    : workEntry.userInputSettlementStatus
      ? ""
      : workEntryPreview(workEntry);
  const preview =
    isHarnessOSBrowserToolRow || isHarnessOSToolRow
      ? sanitizeHarnessOSMcpToolPreview({
          preview: rawPreview,
          heading,
          status: toolWorkEntryStatus(workEntry),
        })
      : rawPreview;
  const localizedActivityText =
    workEntry.nativeEventType === "model_request_retrying"
      ? t("timeline.modelRequestRetrying")
      : null;
  // One sentence per row, live or settled: the tool's own verb plus what it acted
  // on ("Searched for foo in src"). Lifecycle state is never spelled out here —
  // the verb already carries the tense and `liveActivityMetaText` covers the rest.
  const displayText = localizedActivityText
    ? localizedActivityText
    : webFetchUrl
      ? describeLinkChip(webFetchUrl).label
      : combineWorkEntryDisplayText(heading, preview);
  const showInlineAgentTaskPreview =
    workEntry.itemType === "collab_agent_tool_call" &&
    Boolean(preview) &&
    normalizeToolTextForComparison(heading) !== normalizeToolTextForComparison(preview ?? "");
  const rawCommand = workEntry.rawCommand ?? workEntry.command;
  const hoverText =
    rawCommand ?? (showInlineAgentTaskPreview ? heading : (webFetchUrl ?? displayText));
  const changedFiles = workEntry.changedFiles ?? [];
  const showEditedRows = isFileChangeWorkEntry(workEntry) && changedFiles.length > 0;
  const canOpenAgentActivity = Boolean(onOpenAgentActivity) && isAgentActivityWorkEntry(workEntry);
  const openAgentActivity = canOpenAgentActivity
    ? () => onOpenAgentActivity?.(workEntry.id)
    : undefined;
  const viewedImagePath =
    workEntry.itemType === "image_view" && isLocalImageMarkdownSrc(workEntry.detail)
      ? workEntry.detail
      : null;
  const canOpenViewedImage = viewedImagePath !== null;
  const openViewedImage = viewedImagePath
    ? () =>
        onImageExpand({
          images: [
            {
              src: buildLocalImageUrl({
                src: viewedImagePath,
                cwd: markdownCwd,
              }),
              name: localImageFileName(viewedImagePath) || t("timeline.viewedImage"),
            },
          ],
          index: 0,
        })
    : undefined;
  const hasToolDetails = Boolean(workEntry.toolDetails);
  // File-read rows open the referenced file in the in-app viewer when the
  // hosting surface provides an opener (right-dock file pane / editor pane).
  const opener = useWorkspaceFileOpener();
  // Per-file +N/-M parsed from this tool call's own patch, used as a fallback when
  // the turn-diff summary isn't in scope (e.g. standalone work rows) so every
  // "Edited <file>" row can still show diff stats.
  const toolDiffStatsByPath = useMemo(
    () =>
      isFileChangeWorkEntry(workEntry)
        ? fileDiffStatsByPath(workEntry.toolDetails?.diff)
        : EMPTY_FILE_DIFF_STATS,
    [workEntry],
  );
  const liveActivityNowMs = useLiveActivityNow(workEntry.liveActivity);
  const liveActivityMetaText = workEntry.liveActivity
    ? formatLiveActivityMeta(workEntry.liveActivity, liveActivityNowMs)
    : null;
  const engineWebSurfaceWaiting = workEntry.engineWebSurface?.status === "waiting-for-user";
  const engineWebSurfaceId = workEntry.engineWebSurface?.surfaceId;
  const canOpenEngineWebSurface =
    engineWebSurfaceWaiting && Boolean(engineWebSurfaceId && onOpenEngineWebSurface);

  // Reasoning is authored transcript content, not a tool row or a route into
  // AgentActivityDetailView. Keep this after the shared hooks so changing row
  // kinds never changes the parent component's hook order.
  if (isReasoningUpdateWorkEntry(workEntry)) {
    return (
      <ReasoningDisclosureRow
        workEntry={workEntry}
        compact={compact}
        defaultOpen={reasoningDefaultOpen ?? false}
        openOverride={reasoningOpenOverride}
        onOpenChange={onReasoningOpenChange}
        isLive={reasoningIsLive ?? false}
        textFontSizePx={textFontSizePx}
        markdownCwd={markdownCwd}
        onImageExpand={onImageExpand}
      />
    );
  }

  if (
    workEntry.activityKind === "user-input.requested" ||
    workEntry.activityKind === "user-input.resolved"
  ) {
    return (
      <UserInputInteractionRow
        workEntry={workEntry}
        compact={compact}
        textFontSizePx={textFontSizePx}
      />
    );
  }

  // A created-automation row renders as its own card instead of a tool-call line.
  // Kept after the hooks above so the early return never changes hook order.
  const automation = workEntry.automation;
  if (automation) {
    return (
      <div className={cn(compact ? "py-0.5" : "py-1")}>
        <AutomationCreatedCard
          automationId={automation.id}
          name={automation.name}
          cadenceLabel={automation.cadenceLabel}
          {...(automation.proposalState ? { proposalState: automation.proposalState } : {})}
          textFontSizePx={textFontSizePx}
          metaFontSizePx={chatMetaFontSizePx}
          {...(onOpenAutomation ? { onOpen: () => onOpenAutomation(automation.id) } : {})}
        />
      </div>
    );
  }

  if (workEntry.attachmentTransferFailures) {
    return (
      <AttachmentTransferFailuresRow
        failures={workEntry.attachmentTransferFailures}
        compact={compact}
        rowFontSizePx={rowFontSizePx}
      />
    );
  }

  const readFilePath =
    opener !== null &&
    !canOpenAgentActivity &&
    workEntry.detail &&
    (workEntry.requestKind === "file-read" || isFileReadToolEntry(workEntry))
      ? extractFilePathFromDetail(workEntry.detail)
      : null;
  const canOpenReadFile = readFilePath !== null;
  const canOpenToolDetails =
    !canOpenAgentActivity &&
    !canOpenViewedImage &&
    Boolean(workEntry.toolDetails || (workEntry.liveActivity && !canOpenReadFile));
  const openReadFile = readFilePath
    ? () => openWorkspaceFileReference(opener, readFilePath)
    : undefined;
  const prefetchReadFile =
    readFilePath && opener?.prefetchFile ? () => opener.prefetchFile?.(readFilePath) : undefined;

  return (
    <div className={cn(compact ? "py-0.5" : "rounded-lg py-1")}>
      {showEditedRows ? (
        <div className="space-y-0.5">
          {changedFiles.map((changedFilePath) => {
            // Prefer the turn-diff summary's per-file stat; fall back to the stat
            // parsed from this tool call's own patch so the +N/-M shows even when
            // no summary is in scope (standalone work rows) or it lacks the file.
            const summaryStat = fileDiffStatByPath?.get(changedFilePath);
            const changedFileStat =
              summaryStat && summaryStat.additions + summaryStat.deletions > 0
                ? summaryStat
                : (resolveFileDiffStatByChangedPath(
                    toolDiffStatsByPath,
                    changedFilePath,
                    changedFiles.length,
                  ) ?? summaryStat);
            const canOpenEditedDiff = Boolean(turnId && onOpenTurnDiff);
            const canOpenEditedRow = canOpenToolDetails || canOpenEditedDiff;
            const editedRowClassName = cn(
              "group/file-row flex w-full max-w-full items-center text-left transition-colors duration-150",
              compact ? "gap-1.5" : "gap-2",
              canOpenEditedRow ? "cursor-pointer focus-visible:outline-none" : "cursor-default",
            );
            const editedRowChildren = (
              <EditedFileRowContent
                filePath={changedFilePath}
                additions={changedFileStat?.additions}
                deletions={changedFileStat?.deletions}
                fontSizePx={rowFontSizePx}
                compact={compact}
              />
            );
            if (hasToolDetails || (canOpenToolDetails && !canOpenEditedDiff)) {
              return (
                <ToolDetailsDisclosure
                  key={`${workEntry.id}:${changedFilePath}`}
                  details={workEntry.toolDetails}
                  activity={workEntry.liveActivity}
                  compact={compact}
                  tooltip={<span className="whitespace-pre-wrap">{changedFilePath}</span>}
                  summaryClassName={editedRowClassName}
                  dataFileChangeRow
                  timestampFormat={timestampFormat}
                >
                  {editedRowChildren}
                </ToolDetailsDisclosure>
              );
            }
            return (
              <button
                key={`${workEntry.id}:${changedFilePath}`}
                type="button"
                data-file-change-row="true"
                className={editedRowClassName}
                title={changedFilePath}
                disabled={!canOpenEditedRow}
                onClick={() => {
                  if (!turnId || !onOpenTurnDiff) {
                    return;
                  }
                  onOpenTurnDiff(turnId, changedFilePath);
                }}
              >
                {editedRowChildren}
              </button>
            );
          })}
        </div>
      ) : (
        (() => {
          const rowContentChildren = (
            <>
              {!isCodexStatusRow ? (
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center",
                    WORK_ROW_MUTED_HOVER_TONE["tool-row"],
                    compact ? "size-4" : "size-5",
                  )}
                  data-tool-icon={leftIconKind}
                  data-work-entry-icon="true"
                >
                  {webFetchUrl ? (
                    <LinkChipIcon url={webFetchUrl} className={compact ? "size-3.5" : "size-4"} />
                  ) : (
                    renderWorkEntryIcon(LeftIcon, compact ? "size-3.5" : "size-4")
                  )}
                </span>
              ) : null}
              <div
                className={cn(
                  "min-w-0 overflow-hidden",
                  // Single-line tool labels size to their content so the disclosure
                  // chevron can sit right after the name; the multi-line markdown
                  // preview still needs the full row width.
                  showInlineAgentTaskPreview && "flex-1",
                )}
              >
                {showInlineAgentTaskPreview ? (
                  <div className={cn(compact ? "space-y-[1px]" : "space-y-0.5")}>
                    <p
                      className={cn("truncate font-medium leading-5", MUTED_LABEL_TEXT_CLASS_NAME)}
                      style={{ fontSize: `${rowFontSizePx}px` }}
                    >
                      <span data-work-entry-display-text="true">{heading}</span>
                      {liveActivityMetaText ? (
                        <span data-live-activity-meta="true"> · {liveActivityMetaText}</span>
                      ) : null}
                    </p>
                    <ChatMarkdown
                      text={preview ?? ""}
                      cwd={markdownCwd}
                      isStreaming={false}
                      className="leading-relaxed"
                      style={{
                        color: MUTED_LABEL_TEXT_COLOR,
                        fontSize: `${Math.max(11, rowFontSizePx - 1)}px`,
                        lineHeight: compact ? "18px" : "19px",
                      }}
                      onImageExpand={onImageExpand}
                    />
                  </div>
                ) : (
                  <p
                    className={cn(
                      compact ? "truncate leading-5" : "truncate leading-6",
                      // Match the leading icon's tone so the row reads as one muted unit, and
                      // brighten the whole row to foreground on hover/focus instead of a fill.
                      WORK_ROW_MUTED_HOVER_TONE["tool-row"],
                    )}
                    data-codex-status-row={isCodexStatusRow ? "true" : undefined}
                    style={{ fontSize: `${rowFontSizePx}px` }}
                  >
                    <span data-work-entry-display-text="true">{displayText}</span>
                    {liveActivityMetaText ? (
                      <span data-live-activity-meta="true"> · {liveActivityMetaText}</span>
                    ) : null}
                  </p>
                )}
              </div>
              {engineWebSurfaceWaiting ? (
                <span
                  className="shrink-0 text-[var(--color-text-foreground-secondary)]"
                  style={{ fontSize: `${Math.max(11, rowFontSizePx - 1)}px` }}
                  data-engine-web-surface-status="waiting-for-user"
                >
                  · {t("timeline.engineWebSurfaceWaiting")}
                </span>
              ) : null}
            </>
          );
          if (canOpenToolDetails && !canOpenEngineWebSurface) {
            return (
              <ToolDetailsDisclosure
                details={workEntry.toolDetails}
                activity={workEntry.liveActivity}
                compact={compact}
                timestampFormat={timestampFormat}
                tooltip={toolRowTooltipContent(rawCommand, displayText, displayText, {
                  summary: t("toolDetails.summary"),
                  rawCall: t("toolDetails.rawCall"),
                })}
              >
                {rowContentChildren}
              </ToolDetailsDisclosure>
            );
          }

          const rowContent = (
            <AgentActivityOpenSurface
              canOpen={
                canOpenAgentActivity ||
                canOpenViewedImage ||
                canOpenReadFile ||
                canOpenEngineWebSurface
              }
              compact={compact}
              onOpen={
                canOpenEngineWebSurface
                  ? () => onOpenEngineWebSurface?.(engineWebSurfaceId!)
                  : (openViewedImage ?? openAgentActivity ?? openReadFile)
              }
              onHover={prefetchReadFile}
              ariaLabel={
                canOpenEngineWebSurface
                  ? t("timeline.reopenEngineWebSurface")
                  : canOpenViewedImage
                    ? t("timeline.openViewedImage")
                    : undefined
              }
              tooltip={toolRowTooltipContent(
                rawCommand,
                displayText,
                canOpenViewedImage
                  ? viewedImagePath
                  : canOpenReadFile
                    ? (readFilePath ?? hoverText)
                    : hoverText,
                {
                  summary: t("toolDetails.summary"),
                  rawCall: t("toolDetails.rawCall"),
                },
              )}
            >
              {rowContentChildren}
            </AgentActivityOpenSurface>
          );

          return rowContent;
        })()
      )}
    </div>
  );
});

function UserInputInteractionRow(props: {
  workEntry: TimelineWorkEntry;
  compact: boolean;
  textFontSizePx: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const status = props.workEntry.userInputSettlementStatus;
  const questions = props.workEntry.userInputInteraction?.questions ?? [];
  const canExpand =
    status === "answered" && questions.some((question) => question.answer !== undefined);
  const heading = status ? t(`pendingInput.receipt.${status}`) : t("pendingInput.waitingForAnswer");
  const compact = props.compact;

  const headingChildren = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center text-muted-foreground/65",
          compact ? "size-4" : "size-5",
        )}
        data-work-entry-icon="true"
      >
        <AskUserIcon className={compact ? "size-3.5" : "size-4"} />
      </span>
      <span
        className="min-w-0 flex-1 truncate leading-5"
        data-work-entry-display-text="true"
        style={{ fontSize: `${props.textFontSizePx}px` }}
      >
        {heading}
      </span>
      {canExpand ? (
        <DisclosureChevron
          open={open}
          className="mr-0.5 size-3 shrink-0 text-muted-foreground/45"
        />
      ) : null}
    </>
  );

  return (
    <section
      className={cn("min-w-0 max-w-full overflow-hidden", compact ? "py-0.5" : "py-1")}
      data-user-input-interaction="true"
      data-user-input-status={status ?? "pending"}
    >
      {canExpand ? (
        <button
          type="button"
          className={cn(
            "group/user-input flex w-full min-w-0 items-center rounded-md text-left text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
            compact ? "gap-1.5" : "gap-2",
          )}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((current) => !current)}
        >
          {headingChildren}
        </button>
      ) : (
        <div
          className={cn(
            "flex w-full min-w-0 items-center text-muted-foreground",
            compact ? "gap-1.5" : "gap-2",
          )}
        >
          {headingChildren}
        </div>
      )}

      {canExpand ? (
        <div id={regionId}>
          <DisclosureRegion
            open={open}
            contentClassName={cn(
              "min-w-0 max-w-full overflow-hidden pr-1",
              compact ? "pl-[22px] pt-1" : "pl-7 pt-1.5",
            )}
          >
            <div
              className="min-w-0 space-y-3 text-foreground/85"
              data-user-input-details="true"
              style={{ fontSize: `${props.textFontSizePx}px` }}
            >
              {questions.map((question, index) => (
                <div key={question.id} className="min-w-0 space-y-1.5">
                  <p className="break-words font-medium leading-5">
                    {index + 1}. {question.prompt}
                  </p>
                  {question.answer?.selectedOptionLabels.length ? (
                    <ul className="min-w-0 space-y-0.5 pl-4">
                      {question.answer.selectedOptionLabels.map((label) => (
                        <li
                          key={`${question.id}:selected:${label}`}
                          className="list-disc break-words whitespace-pre-wrap"
                        >
                          {label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {question.answer?.customText !== undefined ? (
                    <div className="min-w-0 space-y-1">
                      <p className="text-[0.92em] text-muted-foreground">
                        {t(
                          question.kind === "text"
                            ? "pendingInput.timeline.answer"
                            : "pendingInput.timeline.customAnswer",
                        )}
                      </p>
                      <p className="break-words whitespace-pre-wrap">
                        {question.answer.customText}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </DisclosureRegion>
        </div>
      ) : null}
    </section>
  );
}

function ReasoningDisclosureRow(props: {
  workEntry: TimelineWorkEntry;
  compact: boolean;
  defaultOpen: boolean;
  openOverride: boolean | undefined;
  onOpenChange: ((entryId: string, open: boolean) => void) | undefined;
  isLive: boolean;
  textFontSizePx: number;
  markdownCwd: string | undefined;
  onImageExpand: (preview: ExpandedImagePreview) => void;
}) {
  const { t } = useI18n();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(props.defaultOpen);
  const interactionDirtyRef = useRef(false);
  const externallyControlled = props.onOpenChange !== undefined;
  const open = externallyControlled ? (props.openOverride ?? props.defaultOpen) : uncontrolledOpen;
  const regionId = useId();
  const entries =
    props.workEntry.reasoningEntries ??
    (() => {
      const text = formatAgentActivityEntryPreview(props.workEntry);
      return text ? [{ id: props.workEntry.id, text, truncated: false }] : [];
    })();

  useEffect(() => {
    if (!externallyControlled && !interactionDirtyRef.current) {
      setUncontrolledOpen(props.defaultOpen);
    }
  }, [externallyControlled, props.defaultOpen]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("min-w-0 max-w-full overflow-hidden", props.compact ? "py-0.5" : "py-1")}
      data-reasoning-disclosure="true"
    >
      <button
        type="button"
        className={cn(
          "group/reasoning flex w-full min-w-0 items-center rounded-md text-left text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          props.compact ? "gap-1.5" : "gap-2",
        )}
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => {
          if (props.onOpenChange) {
            props.onOpenChange(props.workEntry.id, !open);
            return;
          }
          interactionDirtyRef.current = true;
          setUncontrolledOpen((current) => !current);
        }}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground/65",
            props.compact ? "size-4" : "size-5",
          )}
          data-work-entry-icon="true"
        >
          {/* brain-2 is optically lighter than the dense brand/tool marks. At
              compact density it uses the full 16px slot while preserving the
              same slot center and text start as every peer activity row. */}
          <ReasoningIcon className="size-4" />
        </span>
        <span
          className="min-w-0 flex-1 truncate leading-5"
          data-work-entry-display-text="true"
          style={{ fontSize: `${props.textFontSizePx}px` }}
        >
          {t("agentActivity.reasoning")}
        </span>
        <DisclosureChevron
          open={open}
          className="mr-0.5 size-3 shrink-0 text-muted-foreground/45"
        />
      </button>

      <div id={regionId}>
        <DisclosureRegion
          open={open}
          contentClassName={cn(
            "min-w-0 max-w-full overflow-hidden pr-1",
            props.compact ? "pl-[22px] pt-1" : "pl-7 pt-1.5",
          )}
        >
          <ReasoningBodyViewport
            entries={entries}
            isLive={props.isLive}
            compact={props.compact}
            textFontSizePx={props.textFontSizePx}
            markdownCwd={props.markdownCwd}
            onImageExpand={props.onImageExpand}
          />
        </DisclosureRegion>
      </div>
    </section>
  );
}

type ReasoningPresentationEntry = NonNullable<WorkLogEntry["reasoningEntries"]>[number];

function reasoningSelectionIsInside(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }
  return (
    (selection.anchorNode !== null && element.contains(selection.anchorNode)) ||
    (selection.focusNode !== null && element.contains(selection.focusNode))
  );
}

function reasoningClickTargetIsInteractive(target: EventTarget | null, viewport: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }
  const interactive = target.closest(
    "a, button, input, textarea, select, summary, [contenteditable='true'], [role='button']",
  );
  return interactive !== null && interactive !== viewport;
}

function ReasoningBodyViewport(props: {
  entries: ReadonlyArray<ReasoningPresentationEntry>;
  isLive: boolean;
  compact: boolean;
  textFontSizePx: number;
  markdownCwd: string | undefined;
  onImageExpand: (preview: ExpandedImagePreview) => void;
}) {
  const { t } = useI18n();
  const [fullHeight, setFullHeight] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const followingTailRef = useRef(true);
  const repinAfterCompactRef = useRef(false);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    scrollTop: number;
  } | null>(null);
  const viewportId = useId();

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !props.isLive || fullHeight) {
      return;
    }
    if (followingTailRef.current || repinAfterCompactRef.current) {
      viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      followingTailRef.current = true;
      repinAfterCompactRef.current = false;
    }
  }, [props.entries, fullHeight, props.isLive]);

  // Streaming Markdown smooths its own text after the parent entry snapshot has
  // rendered. Observe that inner DOM growth so tail-follow runs when the height
  // actually changes, while a reader who scrolled upward remains undisturbed.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !props.isLive || fullHeight) {
      return;
    }
    let animationFrame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        if (followingTailRef.current) {
          viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        }
      });
    });
    observer.observe(viewport, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [fullHeight, props.isLive]);

  const toggleFullHeight = useCallback(() => {
    if (!props.isLive) {
      return;
    }
    if (fullHeight) {
      followingTailRef.current = true;
      repinAfterCompactRef.current = true;
    }
    setFullHeight(!fullHeight);
  }, [fullHeight, props.isLive]);

  const heightToggleLabel = fullHeight
    ? t("agentActivity.compactReasoning")
    : t("agentActivity.expandReasoningFully");

  return (
    <div className="relative min-w-0 max-w-full">
      {props.isLive ? (
        <button
          type="button"
          className="pointer-events-none absolute inset-0 z-10 rounded-md opacity-0 outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={heightToggleLabel}
          aria-expanded={fullHeight}
          aria-controls={viewportId}
          data-reasoning-height-toggle="true"
          onClick={toggleFullHeight}
        />
      ) : null}
      <div
        ref={viewportRef}
        id={viewportId}
        className={cn(
          "min-w-0 max-w-full space-y-2 break-words [overflow-wrap:anywhere]",
          props.isLive && !fullHeight
            ? "scroll-fade-y max-h-[126px] cursor-pointer overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] max-[520px]:max-h-[112px] [&::-webkit-scrollbar]:hidden"
            : "overflow-hidden",
          props.isLive && fullHeight ? "cursor-pointer" : null,
        )}
        data-reasoning-content="true"
        aria-busy={props.isLive}
        data-reasoning-scroll-viewport="true"
        data-reasoning-height-state={props.isLive ? (fullHeight ? "full" : "compact") : "settled"}
        onPointerDown={(event) => {
          if (!props.isLive || event.button !== 0) {
            pointerStartRef.current = null;
            return;
          }
          pointerStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            scrollTop: event.currentTarget.scrollTop,
          };
        }}
        onScroll={(event) => {
          if (!props.isLive || fullHeight) {
            return;
          }
          const viewport = event.currentTarget;
          followingTailRef.current =
            viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 2;
        }}
        onClick={(event) => {
          if (
            !props.isLive ||
            reasoningClickTargetIsInteractive(event.target, event.currentTarget)
          ) {
            return;
          }
          const pointerStart = pointerStartRef.current;
          pointerStartRef.current = null;
          if (
            reasoningSelectionIsInside(event.currentTarget) ||
            (pointerStart !== null &&
              (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 4 ||
                Math.abs(event.currentTarget.scrollTop - pointerStart.scrollTop) > 1))
          ) {
            return;
          }
          toggleFullHeight();
        }}
      >
        {props.entries.map((entry) => (
          <div key={entry.id} className="min-w-0 max-w-full">
            <div className="min-w-0 max-w-full" data-reasoning-engine-text="true">
              <ChatMarkdown
                text={entry.text}
                cwd={props.markdownCwd}
                isStreaming={props.isLive}
                className="min-w-0 max-w-full leading-relaxed text-muted-foreground/78 [&_*]:max-w-full"
                style={{
                  fontSize: `${props.textFontSizePx}px`,
                  lineHeight: props.compact ? "19px" : "20px",
                }}
                onImageExpand={props.onImageExpand}
              />
            </div>
            {entry.truncated ? (
              <p
                className="mt-1 min-w-0 max-w-full break-words text-muted-foreground/60"
                data-reasoning-truncation-notice="true"
                style={{
                  fontSize: `${Math.max(11, props.textFontSizePx - 1)}px`,
                }}
              >
                {t("agentActivity.contentTruncated")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// Inner content for an "Edited <file> +n/-m" row. Mirrors the tool-call row treatment
// (muted leading icon + label that brightens to foreground on hover/focus, same font
// size) so edited rows read as the same visual unit. Callers own the interactive wrapper
// (`group/file-row` button or disclosure summary) and pass the diff stat when available.
export function EditedFileRowContent(props: {
  filePath: string;
  additions: number | undefined;
  deletions: number | undefined;
  fontSizePx: number;
  compact: boolean;
}) {
  const { filePath, additions, deletions, fontSizePx, compact } = props;
  const hasStat = (additions ?? 0) + (deletions ?? 0) > 0;
  return (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center",
          WORK_ROW_MUTED_HOVER_TONE["file-row"],
          compact ? "size-4" : "size-5",
        )}
        data-tool-icon="edit"
      >
        <PencilIcon className={compact ? "size-3.5" : "size-4"} />
      </span>
      <span
        className={cn("font-system-ui shrink-0", WORK_ROW_MUTED_HOVER_TONE["file-row"])}
        style={{ fontSize: `${fontSizePx}px` }}
      >
        Edited
      </span>
      <span
        className={cn(
          "font-system-ui max-w-[28rem] truncate underline-offset-2",
          WORK_ROW_MUTED_HOVER_TONE["file-row"],
          // Filename doubles as a link affordance: underline on the same row hover/focus.
          "group-hover/file-row:underline group-focus-visible/file-row:underline",
        )}
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {basenameOfPath(filePath)}
      </span>
      {hasStat ? (
        <span
          className="font-system-ui shrink-0 tabular-nums whitespace-nowrap"
          style={{ fontSize: `${fontSizePx}px` }}
        >
          <DiffStatLabel additions={additions ?? 0} deletions={deletions ?? 0} />
        </span>
      ) : null}
    </>
  );
}

function AgentActivityOpenSurface(props: {
  canOpen: boolean;
  children: ReactNode;
  compact: boolean;
  /** Warm-up hook fired on hover/focus so opening feels instant. */
  onHover?: (() => void) | undefined;
  onOpen?: (() => void) | undefined;
  title?: string | undefined;
  /** Styled frosted hover tooltip (preferred over the native `title`). */
  tooltip?: ReactNode;
  dataToolDetailTrigger?: boolean | undefined;
  ariaLabel?: string | undefined;
}) {
  const className = cn(
    "group/tool-row flex w-full items-center text-left transition-[opacity,translate] duration-200",
    props.compact ? "gap-1.5" : "gap-2",
    props.canOpen ? "cursor-pointer focus-visible:outline-none" : "cursor-default",
  );

  // Wrap the real DOM element (not this component) so Base UI's tooltip trigger
  // can attach its hover handlers and compose with our own onClick/onPointerEnter.
  const surface = props.canOpen ? (
    <button
      type="button"
      className={className}
      title={props.title}
      aria-label={props.ariaLabel}
      onClick={props.onOpen}
      data-tool-detail-trigger={props.dataToolDetailTrigger ? "true" : undefined}
      {...(props.onHover ? { onPointerEnter: props.onHover, onFocus: props.onHover } : {})}
    >
      {props.children}
    </button>
  ) : (
    <div className={className} title={props.title}>
      {props.children}
    </div>
  );

  return <ToolRowTooltip content={props.tooltip}>{surface}</ToolRowTooltip>;
}

function ToolDetailsDisclosure(props: {
  children: ReactNode;
  compact: boolean;
  dataFileChangeRow?: boolean | undefined;
  details?: TimelineWorkEntry["toolDetails"] | undefined;
  activity?: TimelineWorkEntry["liveActivity"] | undefined;
  summaryClassName?: string | undefined;
  timestampFormat: TimestampFormat;
  tooltip?: ReactNode;
}) {
  const summaryClassName =
    props.summaryClassName ??
    cn(
      "group/tool-row flex w-full items-center text-left transition-[opacity,translate] duration-200",
      props.compact ? "gap-1.5" : "gap-2",
      "cursor-pointer focus-visible:outline-none",
    );
  const [open, setOpen] = useState(false);
  const [renderDetails, setRenderDetails] = useState(false);
  const [motionOpen, setMotionOpen] = useState(false);
  const openFrameRef = useRef<number | null>(null);
  const cleanupTimeoutRef = useRef<number | null>(null);

  const clearMotionTimers = useCallback(() => {
    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }
    if (cleanupTimeoutRef.current !== null) {
      window.clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  }, []);

  const setDetailsOpen = useCallback(
    (nextOpen: boolean) => {
      clearMotionTimers();
      setOpen(nextOpen);

      if (nextOpen) {
        setRenderDetails(true);
        setMotionOpen(false);
        openFrameRef.current = window.requestAnimationFrame(() => {
          openFrameRef.current = null;
          setMotionOpen(true);
        });
        return;
      }

      setMotionOpen(false);
      cleanupTimeoutRef.current = window.setTimeout(() => {
        cleanupTimeoutRef.current = null;
        setRenderDetails(false);
      }, TRANSCRIPT_DISCLOSURE_TRANSITION_MS + TRANSCRIPT_DISCLOSURE_CLEANUP_BUFFER_MS);
    },
    [clearMotionTimers],
  );

  useEffect(() => () => clearMotionTimers(), [clearMotionTimers]);

  const summaryButton = (
    <button
      type="button"
      className={summaryClassName}
      aria-expanded={open}
      data-file-change-row={props.dataFileChangeRow ? "true" : undefined}
      data-tool-detail-trigger="true"
      onClick={() => {
        setDetailsOpen(!open);
      }}
    >
      {props.children}
      <DisclosureChevron
        open={open}
        className="text-muted-foreground/70 group-hover/tool-row:text-foreground group-hover/file-row:text-foreground group-focus-visible/tool-row:text-foreground group-focus-visible/file-row:text-foreground"
      />
    </button>
  );

  return (
    <div className="group/tool-details min-w-0">
      <ToolRowTooltip content={props.tooltip}>{summaryButton}</ToolRowTooltip>
      {renderDetails ? (
        <DisclosureRegion
          open={motionOpen}
          contentClassName={cn("min-w-0 pt-2", props.compact ? "ml-5" : "ml-7")}
        >
          <div data-tool-details-inline="true">
            <ToolCallDetailsContent
              details={props.details}
              activity={props.activity}
              timestampFormat={props.timestampFormat}
            />
          </div>
        </DisclosureRegion>
      ) : null}
    </div>
  );
}

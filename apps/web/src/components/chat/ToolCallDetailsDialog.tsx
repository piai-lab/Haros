// FILE: ToolCallDetailsDialog.tsx
// Purpose: Inline details content for command and file-change transcript rows.
// Layer: Chat presentation component
// Exports: ToolCallDetailsContent
// Depends on: WorkLogEntry.toolDetails

import type { ThreadId, ToolResultFullReadResult, ToolTextPreviewV1 } from "@harnessos/contracts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import {
  formatShellCommand,
  formatShellTranscript,
  formatToolOutputText,
} from "~/lib/toolCallDetailsFormatting";
import { cn } from "~/lib/utils";
import type { TimestampFormat } from "../../localPreferences";
import type { WorkLogToolDetails, WorkLogToolOutputDetails } from "../../lib/toolCallDetails";
import type { WorkLogLiveActivity } from "../../workLog";
import {
  formatLiveActivityProgress,
  liveActivityElapsedMs,
  presentLiveActivityDuration,
  useLiveActivityNow,
} from "../../lib/liveActivityPresentation";
import { formatTimestamp } from "../../timestampFormat";
import ChatMarkdown from "../ChatMarkdown";
import { useI18n } from "../../i18n";
import { acquireToolResultRead } from "../../lib/toolResultRead";
import { CodeBlockSurface } from "./MarkdownCodeBlock";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { DisclosureRegion } from "../ui/DisclosureRegion";

const DETAIL_HEADER_CLASS_NAME = "border-b border-border/45 px-3 py-2 text-[10px] font-medium";
const DETAIL_CODE_BLOCK_CLASS_NAME =
  "whitespace-pre-wrap break-words font-chat-code text-[11px] leading-relaxed text-foreground/88";
const TOOL_DETAILS_MARKDOWN_CLASS_NAME =
  "text-[length:var(--app-font-size-ui,12px)] leading-relaxed";
const LIVE_ACTIVITY_STATE_KEYS = {
  starting: "toolDetails.stateStarting",
  thinking: "toolDetails.stateThinking",
  running_tool: "toolDetails.stateRunningTool",
  waiting: "toolDetails.stateWaiting",
  streaming: "toolDetails.stateStreaming",
  completed: "toolDetails.stateCompleted",
  failed: "toolDetails.stateFailed",
  cancelled: "toolDetails.stateCancelled",
} as const;

export function ToolCallDetailsContent({
  details,
  activity,
  expanded,
  threadId,
  timestampFormat,
}: {
  details: WorkLogToolDetails | undefined;
  activity?: WorkLogLiveActivity | undefined;
  expanded: boolean;
  threadId?: ThreadId | undefined;
  timestampFormat: TimestampFormat;
}) {
  const { t } = useI18n();
  const fullResult = useFullToolResult({
    expanded,
    threadId,
    toolCallId: details?.toolCallId,
  });
  const usesCommandTranscript = details?.kind === "command" && Boolean(details.command);
  if (!details && !activity) {
    return (
      <div className="rounded-lg border border-border/45 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
        {t("toolDetails.none")}
      </div>
    );
  }

  return (
    <>
      {details?.toolName ? (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-[11px]">
          <span className="font-medium text-muted-foreground/56">{t("toolDetails.toolName")}</span>
          <code className="min-w-0 break-all font-chat-code text-foreground/82">
            {details.toolName}
          </code>
        </div>
      ) : null}

      {usesCommandTranscript && details?.command ? (
        <ToolCommandTranscriptSection
          command={details.command}
          output={details.output}
          fullResult={fullResult}
        />
      ) : details?.input || details?.inputPreview ? (
        <ToolDetailSection title={t("toolDetails.input")}>
          <MarkdownToolCodeBlock
            language="json"
            copyText={details.input ?? previewText(details.inputPreview)}
            copyLabel={t("toolDetails.copyInput")}
            height="input"
          >
            {details.inputPreview
              ? previewDisplayText(details.inputPreview, t("toolDetails.clippedInline"))
              : (details.input ?? "")}
          </MarkdownToolCodeBlock>
        </ToolDetailSection>
      ) : null}

      {details && !usesCommandTranscript && hasOutputPresentation(details, fullResult) ? (
        <ToolOutputSection details={details} fullResult={fullResult} />
      ) : null}

      {activity ? (
        <LiveActivityMetadata
          activity={activity}
          exitCode={details?.output?.exitCode}
          timestampFormat={timestampFormat}
        />
      ) : null}
    </>
  );
}

function useFullToolResult(input: {
  expanded: boolean;
  threadId?: ThreadId | undefined;
  toolCallId?: string | undefined;
}): ToolResultFullReadResult | null {
  const key =
    input.threadId && input.toolCallId ? `${input.threadId}\u0000${input.toolCallId}` : null;
  const [state, setState] = useState<{
    key: string;
    result: ToolResultFullReadResult;
  } | null>(null);
  useEffect(() => {
    if (!input.expanded || !input.threadId || !input.toolCallId) return;
    const requestKey = `${input.threadId}\u0000${input.toolCallId}`;
    const read = acquireToolResultRead({
      threadId: input.threadId,
      toolCallId: input.toolCallId,
    });
    let active = true;
    void read.promise.then(
      (next) => {
        if (active) setState({ key: requestKey, result: next });
      },
      () => {
        if (active) {
          setState({
            key: requestKey,
            result: { status: "unavailable", reason: "read_failed" },
          });
        }
      },
    );
    return () => {
      active = false;
      read.release();
      setState((current) => (current?.key === requestKey ? null : current));
    };
  }, [input.expanded, input.threadId, input.toolCallId]);
  return input.expanded && key !== null && state?.key === key ? state.result : null;
}

function hasOutputPresentation(
  details: WorkLogToolDetails,
  fullResult: ToolResultFullReadResult | null,
): boolean {
  return Boolean(fullResult?.status === "found" || details.output || details.files?.length);
}

function formatActivityTimestamp(value: string, timestampFormat: TimestampFormat): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return formatTimestamp(value, timestampFormat);
}

function LiveActivityMetadata({
  activity,
  exitCode,
  timestampFormat,
}: {
  activity: WorkLogLiveActivity;
  exitCode?: number | undefined;
  timestampFormat: TimestampFormat;
}) {
  const { t } = useI18n();
  const stateLabel = t(LIVE_ACTIVITY_STATE_KEYS[activity.state]);
  const nowMs = useLiveActivityNow(activity);
  const elapsedMs = liveActivityElapsedMs(activity, nowMs);
  const duration = presentLiveActivityDuration(elapsedMs);
  const elapsed =
    duration?.kind === "subsecond"
      ? t("toolDetails.durationSubsecond")
      : duration?.kind === "seconds"
        ? t("toolDetails.durationSeconds", { seconds: duration.seconds })
        : null;
  const progress =
    activity.progress !== undefined ? formatLiveActivityProgress(activity.progress) : null;

  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-border/35 pt-1">
      <button
        type="button"
        className="flex w-full items-center gap-1 py-1 text-left text-[11px] text-muted-foreground/60 hover:text-foreground"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <DisclosureChevron open={open} />
        <span>{t("toolDetails.activity")}</span>
      </button>
      <DisclosureRegion open={open} contentClassName="pt-1">
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-l border-border/45 px-3 py-1.5 text-[11px]">
          <dt className="text-muted-foreground/56">{t("toolDetails.status")}</dt>
          <dd className="text-foreground/84">{stateLabel}</dd>
          {activity.startedAt ? (
            <>
              <dt className="text-muted-foreground/56">{t("toolDetails.started")}</dt>
              <dd className="text-foreground/84">
                <time dateTime={activity.startedAt} title={activity.startedAt}>
                  {formatActivityTimestamp(activity.startedAt, timestampFormat)}
                </time>
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground/56">{t("toolDetails.lastActivity")}</dt>
          <dd className="text-foreground/84">
            <time dateTime={activity.lastActivityAt} title={activity.lastActivityAt}>
              {formatActivityTimestamp(activity.lastActivityAt, timestampFormat)}
            </time>
          </dd>
          {elapsed ? (
            <>
              <dt className="text-muted-foreground/56">{t("toolDetails.elapsed")}</dt>
              <dd className="tabular-nums text-foreground/84">{elapsed}</dd>
            </>
          ) : null}
          {progress ? (
            <>
              <dt className="text-muted-foreground/56">{t("toolDetails.progress")}</dt>
              <dd className="tabular-nums text-foreground/84">{progress}</dd>
            </>
          ) : null}
          {activity.detail ? (
            <>
              <dt className="text-muted-foreground/56">{t("toolDetails.detail")}</dt>
              <dd className="break-words text-foreground/84">{activity.detail}</dd>
            </>
          ) : null}
          {exitCode !== undefined ? (
            <>
              <dt className="text-muted-foreground/56">{t("toolDetails.exitCodeLabel")}</dt>
              <dd className="tabular-nums text-foreground/84">{exitCode}</dd>
            </>
          ) : null}
        </dl>
      </DisclosureRegion>
    </section>
  );
}

function previewText(preview: ToolTextPreviewV1 | undefined): string {
  return preview ? `${preview.head}${preview.tail ?? ""}` : "";
}

function previewDisplayText(preview: ToolTextPreviewV1, clippedNotice: string): string {
  return preview.clipped
    ? `${preview.head}\n${clippedNotice}\n${preview.tail ?? ""}`
    : previewText(preview);
}

function usePayloadScrollAnchor(contentKey: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const previousRef = useRef<{
    key: string;
    scrollTop: number;
    distanceFromBottom: number;
    atBottom: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = previousRef.current;
    if (contentKey && previous && previous.key !== contentKey) {
      node.scrollTop = previous.atBottom
        ? Math.max(0, node.scrollHeight - node.clientHeight - previous.distanceFromBottom)
        : previous.scrollTop;
    }
    previousRef.current = readScrollAnchor(node, contentKey ?? "static");
  }, [contentKey]);

  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      previousRef.current = readScrollAnchor(event.currentTarget, contentKey ?? "static");
    },
    [contentKey],
  );

  return { ref, onScroll };
}

function MarkdownToolCodeBlock(props: {
  language: string;
  children: string;
  copyText: string;
  copyLabel: string;
  height: "input" | "output" | "command";
  contentKey?: string;
}) {
  const anchor = usePayloadScrollAnchor(props.contentKey);
  return <MarkdownToolCodeBlockWithAnchor {...props} anchor={anchor} />;
}

function MarkdownToolCodeBlockWithAnchor(
  props: {
    language: string;
    children: string;
    copyText: string;
    copyLabel: string;
    height: "input" | "output" | "command";
  } & { anchor: ReturnType<typeof usePayloadScrollAnchor> },
) {
  const { anchor } = props;
  return (
    <div
      className={cn(
        "chat-markdown",
        TOOL_DETAILS_MARKDOWN_CLASS_NAME,
        "tool-details-code-markdown",
      )}
    >
      <CodeBlockSurface
        title={<span className="chat-markdown-codeblock__lang">{props.language}</span>}
        copyText={props.copyText}
        copyLabel={props.copyLabel}
        defaultWrapped={false}
        rootProps={{
          className: "tool-details-code-surface",
          "data-tool-payload-panel": props.height,
        }}
        bodyProps={{
          className: "tool-details-code-surface__viewport",
          "data-tool-payload-scroll-root": "true",
          onScroll: anchor.onScroll,
        }}
        bodyRef={anchor.ref}
      >
        <pre className={DETAIL_CODE_BLOCK_CLASS_NAME}>{props.children}</pre>
      </CodeBlockSurface>
    </div>
  );
}

function resolvedCommandOutput(
  output: WorkLogToolOutputDetails | undefined,
  fullContent: Extract<ToolResultFullReadResult, { status: "found" }>["content"] | null,
): WorkLogToolOutputDetails | undefined {
  if (!fullContent) return output;
  const fullText = fullContent
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");
  return {
    ...(fullText ? { output: fullText } : {}),
    ...(output?.stdout ? { stdout: output.stdout } : {}),
    ...(output?.stderr ? { stderr: output.stderr } : {}),
    ...(output?.stdoutPreview ? { stdoutPreview: output.stdoutPreview } : {}),
    ...(output?.stderrPreview ? { stderrPreview: output.stderrPreview } : {}),
    ...(output?.exitCode !== undefined ? { exitCode: output.exitCode } : {}),
  };
}

function ToolCommandTranscriptSection({
  command,
  output,
  fullResult,
}: {
  command: string;
  output: WorkLogToolOutputDetails | undefined;
  fullResult: ToolResultFullReadResult | null;
}) {
  const { t } = useI18n();
  const fullContent = fullResult?.status === "found" ? fullResult.content : null;
  const imageUrls = useToolResultImageUrls(fullContent);
  const resolvedOutput = resolvedCommandOutput(output, fullContent);
  const clippedNotice =
    fullResult?.status === "unavailable"
      ? t("toolDetails.fullUnavailableInline")
      : t("toolDetails.clippedInline");
  const labels = {
    stdout: t("toolDetails.stdout"),
    stderr: t("toolDetails.stderr"),
  };
  const copyText = formatShellTranscript(command, resolvedOutput, labels);
  const displayText = formatShellTranscript(command, resolvedOutput, {
    ...labels,
    clippedNotice,
  });
  const contentKey = fullContent
    ? `full:${fullContent.length}:${copyText.length}`
    : `preview:${copyText.length}:${fullResult?.status ?? "loading"}`;
  const anchor = usePayloadScrollAnchor(contentKey);

  if (fullContent?.some((block) => block.type === "image")) {
    return (
      <ToolPayloadSurfaceWithAnchor
        contentType="bash"
        copyText={copyText}
        copyLabel={
          fullContent
            ? t("toolDetails.copyFullCommandTranscript")
            : t("toolDetails.copyCommandTranscriptPreview")
        }
        height="command"
        anchor={anchor}
      >
        <div className="space-y-3">
          <ToolCodeBlock bare tone="command">
            {formatShellCommand(command)}
          </ToolCodeBlock>
          {fullContent.map((block, index) =>
            block.type === "text" ? (
              <ToolCodeBlock key={`text:${index}`} bare>
                {block.text}
              </ToolCodeBlock>
            ) : (
              <img
                key={`image:${index}`}
                src={imageUrls.get(index)}
                alt={t("toolDetails.outputImage")}
                className="max-h-[26rem] max-w-full rounded-md px-3 object-contain"
              />
            ),
          )}
          {output?.stdout || output?.stdoutPreview ? (
            <LabeledCodeBlock title={labels.stdout} tone="output">
              {output.stdoutPreview
                ? previewDisplayText(output.stdoutPreview, clippedNotice)
                : (output.stdout ?? "")}
            </LabeledCodeBlock>
          ) : null}
          {output?.stderr || output?.stderrPreview ? (
            <LabeledCodeBlock title={labels.stderr} tone="error">
              {output.stderrPreview
                ? previewDisplayText(output.stderrPreview, clippedNotice)
                : (output.stderr ?? "")}
            </LabeledCodeBlock>
          ) : null}
        </div>
      </ToolPayloadSurfaceWithAnchor>
    );
  }

  return (
    <MarkdownToolCodeBlockWithAnchor
      language="bash"
      copyText={copyText}
      copyLabel={
        fullContent
          ? t("toolDetails.copyFullCommandTranscript")
          : t("toolDetails.copyCommandTranscriptPreview")
      }
      height="command"
      anchor={anchor}
    >
      {displayText}
    </MarkdownToolCodeBlockWithAnchor>
  );
}

function ToolDetailSection(props: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium text-muted-foreground/56">{props.title}</h3>
      {props.children}
    </section>
  );
}

function ToolOutputSection({
  details,
  fullResult,
}: {
  details: WorkLogToolDetails;
  fullResult: ToolResultFullReadResult | null;
}) {
  const { t } = useI18n();
  const output = details.output;
  const fullContent = fullResult?.status === "found" ? fullResult.content : null;
  const imageUrls = useToolResultImageUrls(fullContent);
  const naturalWebAccessOutput = details.kind === "web-access";
  const copyText = useMemo(() => {
    const fullText = fullContent
      ? fullContent
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n\n")
      : null;
    const processText = fullContent
      ? formatToolOutputText({
          ...(output?.stdout ? { stdout: output.stdout } : {}),
          ...(output?.stderr ? { stderr: output.stderr } : {}),
          ...(output?.stdoutPreview ? { stdoutPreview: output.stdoutPreview } : {}),
          ...(output?.stderrPreview ? { stderrPreview: output.stderrPreview } : {}),
        })
      : null;
    const parts = [
      fullText ??
        (output?.preview ? `${output.preview.head}${output.preview.tail ?? ""}` : output?.output),
      processText ??
        (output?.stdoutPreview
          ? `${output.stdoutPreview.head}${output.stdoutPreview.tail ?? ""}`
          : output?.stdout),
      fullContent
        ? null
        : output?.stderrPreview
          ? `${output.stderrPreview.head}${output.stderrPreview.tail ?? ""}`
          : output?.stderr,
    ].filter((value): value is string => Boolean(value));
    return parts.join("\n\n");
  }, [fullContent, output]);
  const scrollKey = fullContent
    ? `full:${fullContent.length}:${copyText.length}`
    : `preview:${copyText.length}:${fullResult?.status ?? "loading"}`;

  const contentType =
    fullContent?.length && fullContent.every((block) => block.type === "image") ? "image" : "text";

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium text-muted-foreground/56">
        {t("toolDetails.output")}
      </h3>
      <ToolPayloadSurface
        contentType={contentType}
        copyText={copyText}
        copyLabel={
          fullContent ? t("toolDetails.copyFullOutput") : t("toolDetails.copyOutputPreview")
        }
        contentKey={scrollKey}
        height="output"
        wrapControl={!naturalWebAccessOutput}
      >
        <div className="space-y-3">
          {fullContent ? (
            fullContent.map((block, index) =>
              block.type === "text" ? (
                naturalWebAccessOutput ? (
                  <ChatMarkdown
                    key={`text:${index}`}
                    text={block.text}
                    cwd={undefined}
                    isStreaming={false}
                    className="px-3 py-2.5"
                  />
                ) : (
                  <ToolCodeBlock key={`text:${index}`} bare>
                    {block.text}
                  </ToolCodeBlock>
                )
              ) : (
                <img
                  key={`image:${index}`}
                  src={imageUrls.get(index)}
                  alt={t("toolDetails.outputImage")}
                  className="max-h-[26rem] max-w-full rounded-md object-contain"
                />
              ),
            )
          ) : output?.preview ? (
            naturalWebAccessOutput ? (
              <WebAccessPreviewBlock
                preview={output.preview}
                unavailable={fullResult?.status === "unavailable"}
              />
            ) : (
              <PreviewCodeBlock
                preview={output.preview}
                unavailable={fullResult?.status === "unavailable"}
                bare
              />
            )
          ) : output?.output ? (
            naturalWebAccessOutput ? (
              <WebAccessPreviewBlock
                preview={{
                  head: output.output,
                  clipped: output.truncated === true,
                  originalBytes: new TextEncoder().encode(output.output).byteLength,
                }}
                unavailable={fullResult?.status === "unavailable"}
              />
            ) : (
              <PreviewCodeBlock
                preview={{
                  head: output.output,
                  clipped: output.truncated === true,
                  originalBytes: new TextEncoder().encode(output.output).byteLength,
                }}
                unavailable={fullResult?.status === "unavailable"}
                bare
              />
            )
          ) : null}
          {output?.stdout || output?.stdoutPreview ? (
            <LabeledCodeBlock title={t("toolDetails.stdout")} tone="output">
              {output.stdoutPreview
                ? `${output.stdoutPreview.head}${output.stdoutPreview.tail ?? ""}`
                : (output.stdout ?? "")}
            </LabeledCodeBlock>
          ) : null}
          {output?.stderr || output?.stderrPreview ? (
            <LabeledCodeBlock title={t("toolDetails.stderr")} tone="error">
              {output.stderrPreview
                ? `${output.stderrPreview.head}${output.stderrPreview.tail ?? ""}`
                : (output.stderr ?? "")}
            </LabeledCodeBlock>
          ) : null}
          {details.files?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {details.files.map((file) => (
                <span
                  key={file}
                  className="max-w-full rounded-md border border-border/45 bg-background/70 px-2 py-1 font-chat-code text-[11px] text-foreground/82"
                  title={file}
                >
                  {file}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </ToolPayloadSurface>
    </section>
  );
}

function WebAccessPreviewBlock(props: { preview: ToolTextPreviewV1; unavailable: boolean }) {
  const { t } = useI18n();
  return (
    <ChatMarkdown
      text={previewDisplayText(
        props.preview,
        props.unavailable ? t("toolDetails.fullUnavailableInline") : t("toolDetails.clippedInline"),
      )}
      cwd={undefined}
      isStreaming={false}
      className="px-3 py-2.5"
    />
  );
}

function PreviewCodeBlock({
  preview,
  unavailable = false,
  bare = false,
}: {
  preview: ToolTextPreviewV1;
  unavailable?: boolean;
  bare?: boolean;
}) {
  const { t } = useI18n();
  return (
    <pre
      data-tool-text-block="true"
      className={cn(
        DETAIL_CODE_BLOCK_CLASS_NAME,
        bare ? "px-3 py-2.5" : "rounded-lg border border-border/45 bg-background/70 px-3 py-2.5",
      )}
    >
      <span>{preview.head}</span>
      {preview.clipped ? (
        <span className="text-muted-foreground/62">
          {`\n${unavailable ? t("toolDetails.fullUnavailableInline") : t("toolDetails.clippedInline")}\n`}
        </span>
      ) : null}
      {preview.tail ? <span>{preview.tail}</span> : null}
    </pre>
  );
}

function ToolPayloadSurface(props: {
  contentType: string;
  copyText?: string;
  copyLabel: string;
  contentKey?: string;
  height: "input" | "output" | "command";
  wrapControl?: boolean | undefined;
  children: ReactNode;
}) {
  const anchor = usePayloadScrollAnchor(props.contentKey);
  return <ToolPayloadSurfaceWithAnchor {...props} anchor={anchor} />;
}

function ToolPayloadSurfaceWithAnchor(
  props: {
    contentType: string;
    copyText?: string;
    copyLabel: string;
    height: "input" | "output" | "command";
    wrapControl?: boolean | undefined;
    children: ReactNode;
  } & { anchor: ReturnType<typeof usePayloadScrollAnchor> },
) {
  const { anchor } = props;
  return (
    <div className="chat-markdown tool-details-code-markdown">
      <CodeBlockSurface
        title={<span className="chat-markdown-codeblock__lang">{props.contentType}</span>}
        copyText={props.copyText || undefined}
        copyLabel={props.copyLabel}
        defaultWrapped={false}
        wrapControl={props.wrapControl}
        rootProps={{
          className: "tool-details-code-surface",
          "data-tool-payload-panel": props.height,
        }}
        bodyProps={{
          className: "tool-details-code-surface__viewport",
          "data-tool-payload-scroll-root": "true",
          onScroll: anchor.onScroll,
        }}
        bodyRef={anchor.ref}
      >
        <div data-tool-payload-content="true">{props.children}</div>
      </CodeBlockSurface>
    </div>
  );
}

function readScrollAnchor(node: HTMLDivElement, key: string) {
  const distanceFromBottom = Math.max(0, node.scrollHeight - node.clientHeight - node.scrollTop);
  return {
    key,
    scrollTop: node.scrollTop,
    distanceFromBottom,
    atBottom: node.scrollTop > 0 && distanceFromBottom <= 8,
  };
}

function useToolResultImageUrls(
  content: ReadonlyArray<
    { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
  > | null,
) {
  const [urls, setUrls] = useState<ReadonlyMap<number, string>>(() => new Map());
  useEffect(() => {
    const urls = new Map<number, string>();
    if (content && typeof URL !== "undefined") {
      content.forEach((block, index) => {
        if (block.type !== "image") return;
        try {
          const binary = globalThis.atob(block.data);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          urls.set(index, URL.createObjectURL(new Blob([bytes], { type: block.mimeType })));
        } catch {
          // Malformed image data stays absent; text blocks and the preview remain usable.
        }
      });
    }
    setUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [content]);
  return urls;
}

function LabeledCodeBlock(props: { title: string; tone: "output" | "error"; children: string }) {
  return (
    <div className="overflow-hidden border-t border-border/45 first:border-t-0">
      <div
        className={cn(
          DETAIL_HEADER_CLASS_NAME,
          props.tone === "error" ? "text-destructive" : "text-muted-foreground/60",
        )}
      >
        {props.title}
      </div>
      <ToolCodeBlock bare>{props.children}</ToolCodeBlock>
    </div>
  );
}

function ToolCodeBlock(props: { children: string; tone?: "default" | "command"; bare?: boolean }) {
  return (
    <pre
      data-tool-text-block="true"
      className={cn(
        DETAIL_CODE_BLOCK_CLASS_NAME,
        props.tone === "command" && "text-[var(--info-foreground)]",
        props.bare
          ? "px-3 py-2.5"
          : "rounded-lg border border-border/45 bg-background/70 px-3 py-2.5",
      )}
    >
      {props.children}
    </pre>
  );
}

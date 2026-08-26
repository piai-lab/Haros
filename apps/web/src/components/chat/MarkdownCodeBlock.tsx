// FILE: MarkdownCodeBlock.tsx
// Purpose: Owns the shared shell and source actions for fenced Markdown code blocks.
// Layer: Web chat presentation internals

import { CheckIcon, CopyIcon, TextWrapIcon } from "~/lib/icons";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { CentralIcon } from "~/lib/central-icons";
import { getFileIconName } from "../../file-icons";
import { copyTextToClipboard } from "../../hooks/useCopyToClipboard";
import { useI18n } from "../../i18n";
import type { CodeFenceInfo } from "../../lib/codeFence";
import { IconButton } from "../ui/icon-button";

function CodeBlockHeaderTitle({ fence }: { fence: CodeFenceInfo }) {
  if (fence.isFileReference && fence.fileName) {
    return (
      <span className="chat-markdown-codeblock__file" title={fence.filePath ?? fence.fileName}>
        <CentralIcon
          name={getFileIconName(fence.filePath ?? fence.fileName)}
          className="chat-markdown-codeblock__file-icon"
        />
        <span className="chat-markdown-codeblock__file-name">{fence.fileName}</span>
        {fence.directory ? (
          <span className="chat-markdown-codeblock__file-dir">{fence.directory}</span>
        ) : null}
        {fence.lineRange ? (
          <span className="chat-markdown-codeblock__file-lines">{fence.lineRange}</span>
        ) : null}
      </span>
    );
  }
  return <span className="chat-markdown-codeblock__lang">{fence.language}</span>;
}

export function MarkdownCodeBlock({
  code,
  fence,
  children,
  beforeCopyActions,
  wrapControl: wrapControlProp,
  wrapped: wrappedProp,
  presentationId,
  variant = "code",
  copyEnabled = true,
  copyLabel,
}: {
  code: string;
  fence: CodeFenceInfo;
  children: ReactNode;
  beforeCopyActions?: ReactNode;
  wrapControl?: boolean;
  wrapped?: boolean;
  presentationId?: string;
  variant?: "code" | "diagram";
  copyEnabled?: boolean;
  copyLabel?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const wrapControl = wrapControlProp ?? true;
  const wrapped = wrappedProp ?? wrap;
  const showHeader = variant === "code" || Boolean(beforeCopyActions) || wrapControl || copyEnabled;
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = () => {
    void copyTextToClipboard(code)
      .then(() => {
        if (copiedTimerRef.current != null) clearTimeout(copiedTimerRef.current);
        setCopied(true);
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimerRef.current = null;
        }, 1200);
      })
      .catch(() => undefined);
  };

  useEffect(
    () => () => {
      if (copiedTimerRef.current != null) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    },
    [],
  );

  return (
    <div
      className="chat-markdown-codeblock"
      data-wrap={wrapped ? "true" : "false"}
      data-variant={variant}
      {...(presentationId ? { "data-mermaid-presentation": presentationId } : {})}
    >
      {showHeader ? (
        <div className="chat-markdown-codeblock__header">
          {variant === "code" ? <CodeBlockHeaderTitle fence={fence} /> : null}
          <div className="chat-markdown-codeblock__actions">
            {beforeCopyActions}
            {wrapControl ? (
              <IconButton
                className="chat-markdown-codeblock__action"
                onClick={() => setWrap((previous) => !previous)}
                title={wrap ? t("common.disableSoftWrap") : t("common.enableSoftWrap")}
                label={wrap ? t("common.disableSoftWrap") : t("common.enableSoftWrap")}
                aria-pressed={wrap}
                data-active={wrap ? "true" : "false"}
                size="icon-xs"
                variant="ghost"
              >
                <TextWrapIcon className="size-3" />
              </IconButton>
            ) : null}
            {copyEnabled ? (
              <IconButton
                className="chat-markdown-codeblock__action"
                onClick={handleCopy}
                title={copied ? t("common.copied") : (copyLabel ?? t("common.copyCode"))}
                label={copied ? t("common.copied") : (copyLabel ?? t("common.copyCode"))}
                size="icon-xs"
                variant="ghost"
              >
                {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
              </IconButton>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="chat-markdown-codeblock__body">{children}</div>
    </div>
  );
}

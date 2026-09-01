// FILE: MarkdownCodeBlock.tsx
// Purpose: Owns the shared shell and source actions for fenced Markdown code blocks.
// Layer: Web chat presentation internals

import { CheckIcon, CopyIcon, TextWrapIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import type { HTMLAttributes, ReactNode, Ref } from "react";
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

type CodeBlockDivProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  [attribute: `data-${string}`]: string | number | boolean | undefined;
};

export interface MarkdownCodeBlockPresentationProps {
  beforeCopyActions?: ReactNode;
  wrapControl?: boolean;
  wrapped?: boolean;
  defaultWrapped?: boolean;
  onWrappedChange?: (wrapped: boolean) => void;
  presentationId?: string;
  variant?: "code" | "diagram";
  copyEnabled?: boolean;
  copyText?: string;
  copyLabel?: string;
  rootProps?: CodeBlockDivProps;
  bodyProps?: CodeBlockDivProps;
  bodyRef?: Ref<HTMLDivElement>;
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
  copyText,
  copyLabel,
  defaultWrapped,
  onWrappedChange,
  rootProps,
  bodyProps,
  bodyRef,
}: {
  code: string;
  fence: CodeFenceInfo;
  children: ReactNode;
} & MarkdownCodeBlockPresentationProps) {
  return (
    <CodeBlockSurface
      title={variant === "code" ? <CodeBlockHeaderTitle fence={fence} /> : null}
      copyText={copyText ?? code}
      beforeCopyActions={beforeCopyActions}
      wrapped={wrappedProp}
      presentationId={presentationId}
      variant={variant}
      copyEnabled={copyEnabled}
      copyLabel={copyLabel}
      wrapControl={wrapControlProp}
      defaultWrapped={defaultWrapped}
      onWrappedChange={onWrappedChange}
      rootProps={rootProps}
      bodyProps={bodyProps}
      bodyRef={bodyRef}
    >
      {children}
    </CodeBlockSurface>
  );
}

export function CodeBlockSurface({
  title,
  copyText,
  children,
  beforeCopyActions,
  wrapControl: wrapControlProp,
  defaultWrapped: defaultWrappedProp,
  wrapped: wrappedProp,
  onWrappedChange,
  presentationId,
  variant = "code",
  copyEnabled: copyEnabledProp,
  copyLabel,
  rootProps,
  bodyProps,
  bodyRef,
}: {
  title: ReactNode;
  copyText?: string | undefined;
  children: ReactNode;
  beforeCopyActions?: ReactNode | undefined;
  wrapControl?: boolean | undefined;
  defaultWrapped?: boolean | undefined;
  wrapped?: boolean | undefined;
  onWrappedChange?: ((wrapped: boolean) => void) | undefined;
  presentationId?: string | undefined;
  variant?: "code" | "diagram" | undefined;
  copyEnabled?: boolean | undefined;
  copyLabel?: string | undefined;
  rootProps?: CodeBlockDivProps | undefined;
  bodyProps?: CodeBlockDivProps | undefined;
  bodyRef?: Ref<HTMLDivElement> | undefined;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [uncontrolledWrapped, setUncontrolledWrapped] = useState(defaultWrappedProp ?? false);
  const wrapControl = wrapControlProp ?? true;
  const wrapped = wrappedProp ?? uncontrolledWrapped;
  const copyEnabled = copyEnabledProp ?? copyText !== undefined;
  const showHeader = variant === "code" || Boolean(beforeCopyActions) || wrapControl || copyEnabled;
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = () => {
    if (copyText === undefined) return;
    void copyTextToClipboard(copyText)
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
      {...rootProps}
      className={cn("chat-markdown-codeblock", rootProps?.className)}
      data-wrap={wrapped ? "true" : "false"}
      data-variant={variant}
      {...(presentationId ? { "data-mermaid-presentation": presentationId } : {})}
    >
      {showHeader ? (
        <div className="chat-markdown-codeblock__header">
          {variant === "code" ? title : null}
          <div className="chat-markdown-codeblock__actions">
            {beforeCopyActions}
            {wrapControl ? (
              <IconButton
                className="chat-markdown-codeblock__action"
                onClick={() => {
                  const next = !wrapped;
                  if (wrappedProp === undefined) setUncontrolledWrapped(next);
                  onWrappedChange?.(next);
                }}
                title={wrapped ? t("common.disableSoftWrap") : t("common.enableSoftWrap")}
                label={wrapped ? t("common.disableSoftWrap") : t("common.enableSoftWrap")}
                aria-pressed={wrapped}
                data-active={wrapped ? "true" : "false"}
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
      <div
        {...bodyProps}
        ref={bodyRef}
        className={cn("chat-markdown-codeblock__body", bodyProps?.className)}
      >
        {children}
      </div>
    </div>
  );
}

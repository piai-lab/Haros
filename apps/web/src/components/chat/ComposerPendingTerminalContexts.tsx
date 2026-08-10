import { type TerminalContextDraft, isTerminalContextExpired } from "~/lib/terminalContext";
import { useI18n } from "~/i18n";
import { TerminalContextInlineChip } from "./TerminalContextInlineChip";

interface ComposerPendingTerminalContextChipProps {
  context: TerminalContextDraft;
}

export function ComposerPendingTerminalContextChip({
  context,
}: ComposerPendingTerminalContextChipProps) {
  const { t } = useI18n();
  const range =
    context.lineStart === context.lineEnd
      ? t("terminal.line", { line: context.lineStart })
      : t("terminal.lines", { start: context.lineStart, end: context.lineEnd });
  const label = `${context.terminalLabel} ${range}`;
  const expired = isTerminalContextExpired(context);
  const tooltipText = expired ? t("terminal.contextExpired", { label }) : context.text;

  return <TerminalContextInlineChip label={label} tooltipText={tooltipText} expired={expired} />;
}

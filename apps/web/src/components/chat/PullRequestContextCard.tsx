import { useState, type ComponentType } from "react";

import {
  ChatBubbleIcon,
  CircleAlertIcon,
  GitMergeConflictIcon,
  GitPullRequestIcon,
  HammerIcon,
} from "~/lib/icons";
import { type PullRequestContextScope } from "~/lib/pullRequestContext";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { AttachmentCard } from "./AttachmentCard";

const SCOPE_ICONS: Record<PullRequestContextScope, ComponentType<{ className?: string }>> = {
  reference: GitPullRequestIcon,
  comments: ChatBubbleIcon,
  checks: CircleAlertIcon,
  conflicts: GitMergeConflictIcon,
  everything: HammerIcon,
};

function PullRequestContextCardShell(props: {
  scope: PullRequestContextScope;
  title: string;
  subtitle: string;
  onRemove?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const Icon = SCOPE_ICONS[props.scope];
  return (
    <AttachmentCard
      size="md"
      className={cn("w-64", props.className)}
      icon={<Icon className="size-4" />}
      title={props.title}
      subtitle={
        props.subtitle.length > 0 ? <span className="truncate">{props.subtitle}</span> : undefined
      }
      {...(props.onRemove
        ? {
            onRemove: props.onRemove,
            removeLabel: t("composer.removePullRequestContext", { title: props.title }),
          }
        : {})}
    />
  );
}

export function ComposerPullRequestContextCard(props: {
  scope: PullRequestContextScope;
  title: string;
  subtitle: string;
  onRemove: () => void;
}) {
  return <PullRequestContextCardShell {...props} />;
}

export function UserMessagePullRequestContextCard(props: {
  scope: PullRequestContextScope;
  title: string;
  subtitle: string;
  text: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-expanded={expanded}
        title={expanded ? t("composer.hidePullRequestPrompt") : t("composer.showPullRequestPrompt")}
        className="cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => setExpanded((value) => !value)}
      >
        <PullRequestContextCardShell
          scope={props.scope}
          title={props.title}
          subtitle={props.subtitle}
        />
      </button>
      {expanded ? (
        <pre className="max-h-80 w-full max-w-full overflow-auto rounded-md border border-[color:var(--color-border-light)] bg-[var(--color-background-elevated-secondary)] p-2 font-mono text-[11px] leading-snug whitespace-pre-wrap break-words text-foreground">
          {props.text}
        </pre>
      ) : null}
    </div>
  );
}

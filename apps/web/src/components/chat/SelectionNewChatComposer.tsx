import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import type { DraftThreadEnvMode } from "../../composerDraftStore";
import { SelectionChatError } from "~/lib/selectionChat";
import type { PendingTranscriptSelectionAction } from "./useTranscriptAssistantSelectionAction";

interface SelectionNewChatComposerProps {
  action: PendingTranscriptSelectionAction;
  defaultEnvMode: DraftThreadEnvMode;
  canUseWorktree: boolean;
  onSend: (prompt: string, envMode: DraftThreadEnvMode) => Promise<void>;
  onOpenInChat: (prompt: string, envMode: DraftThreadEnvMode) => Promise<void>;
  onClose: () => void;
}

function selectionChatErrorMessage(
  t: ReturnType<typeof useI18n>["t"],
  cause: unknown,
): string {
  if (cause instanceof SelectionChatError) {
    switch (cause.code) {
      case "empty-prompt":
        return t("selection.writeMessageForNewChat");
      case "worktree-needs-branch":
        return t("selection.checkoutBranchBeforeWorktree");
      case "create-failed":
        return t("selection.couldNotOpenNewChat");
      default:
        return t("selection.couldNotStartChat");
    }
  }
  return cause instanceof Error ? cause.message : t("selection.couldNotStartChat");
}

export function SelectionNewChatComposer({
  action,
  defaultEnvMode,
  canUseWorktree,
  onSend,
  onOpenInChat,
  onClose,
}: SelectionNewChatComposerProps) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [envMode, setEnvMode] = useState<DraftThreadEnvMode>(
    canUseWorktree ? defaultEnvMode : "local",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const position = () => {
      const { width, height } = surface.getBoundingClientRect();
      const top = action.placement === "top" ? action.selectionTop - height : action.selectionBottom;
      surface.style.left = `${Math.max(8, Math.min(action.anchorX - width / 2, window.innerWidth - width - 8))}px`;
      surface.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
    };
    position();
    inputRef.current?.focus();
    const observer = new ResizeObserver(position);
    observer.observe(surface);
    window.addEventListener("resize", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
    };
  }, [action]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        !submittingRef.current &&
        event.target instanceof Node &&
        !surfaceRef.current?.contains(event.target)
      ) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const submit = async (intent: "send" | "compose") => {
    const nextPrompt = inputRef.current?.value ?? prompt;
    if (submittingRef.current || (intent === "send" && !nextPrompt.trim())) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await (intent === "send" ? onSend : onOpenInChat)(nextPrompt, envMode);
      onClose();
    } catch (cause) {
      setError(selectionChatErrorMessage(t, cause));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div
      ref={surfaceRef}
      role="dialog"
      aria-label={t("selection.newChatDialog")}
      className="fixed z-50 w-[min(28rem,calc(100vw-1rem))] rounded-xl border border-border bg-[var(--color-background-elevated-primary-opaque)] p-3 shadow-xl backdrop-blur-xl"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-3 min-w-0 text-[11px] text-muted-foreground">
          {action.selection.visibleText}
        </p>
        <button
          type="button"
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          {t("selection.closeNewChatComposer")}
        </button>
      </div>
      <textarea
        ref={inputRef}
        className="min-h-20 w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1.5 text-[12px] outline-none"
        aria-label={t("selection.messageForNewChat")}
        placeholder={t("selection.askAboutSelection")}
        value={prompt}
        disabled={busy}
        onChange={(event) => setPrompt(event.currentTarget.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submit("send");
          }
        }}
      />
      {canUseWorktree ? (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1",
              envMode === "local" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
            onClick={() => setEnvMode("local")}
          >
            {t("threadEnvironment.local")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1",
              envMode === "worktree" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
            onClick={() => setEnvMode("worktree")}
          >
            {t("threadEnvironment.newWorktree")}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void submit("compose")}
        >
          {t("selection.openInChat")}
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void submit("send")}>
          {t("selection.sendToNewChat")}
        </Button>
      </div>
    </div>
  );
}

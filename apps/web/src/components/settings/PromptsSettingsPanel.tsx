// FILE: PromptsSettingsPanel.tsx
// Purpose: Edit the single global Personal Strategy owned by the Agent context file.
// Layer: Settings UI composition

import {
  editableTextByteLength,
  hasDisallowedEditableTextControl,
  hasUnpairedUtf16Surrogate,
  type OAAgentPromptMutationResult,
  type OAAgentPromptSnapshot,
} from "@harnessos/contracts";
import { useEffect, useState } from "react";

import {
  SettingsCard,
  SettingsEmptyState,
  SettingsSectionShell,
} from "~/components/settings/SettingsPanelPrimitives";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import { PROMPTS_SETTINGS_SEARCH } from "~/settingsMetadata/promptSettings";

type Conflict = {
  readonly reason: "content_changed" | "source_changed" | "state_changed";
  readonly fresh: OAAgentPromptSnapshot;
};

export function PromptsSettingsPanel(props: { active: boolean }) {
  const { locale, t } = useI18n();
  const [snapshot, setSnapshot] = useState<OAAgentPromptSnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [baseVersion, setBaseVersion] = useState("");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const adoptSnapshot = (next: OAAgentPromptSnapshot) => {
    setSnapshot(next);
    setDraft(next.personalStrategy.content);
    setBaseVersion(next.personalStrategy.version ?? "");
    setConflict(null);
  };

  const load = async () => {
    adoptSnapshot(await ensureNativeApi().oaAgentPrompts.getSnapshot({ locale }));
  };

  useEffect(() => {
    if (!props.active || snapshot !== null) return;
    let cancelled = false;
    setLoadError(false);
    void ensureNativeApi()
      .oaAgentPrompts.getSnapshot({ locale })
      .then((next) => {
        if (!cancelled) adoptSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, props.active, snapshot]);

  if (!props.active) return null;

  const handleMutation = (result: OAAgentPromptMutationResult) => {
    if (result.state === "conflict") {
      setSnapshot(result.snapshot);
      setConflict({ reason: result.reason, fresh: result.snapshot });
      return;
    }
    adoptSnapshot(result.snapshot);
    toastManager.add({
      type: "success",
      title:
        result.state === "changed" ? t("settings.promptSaved") : t("settings.promptAlreadyCurrent"),
    });
  };

  const mutate = async (action: "setPersonalStrategy" | "restorePersonalStrategy") => {
    const strategy = snapshot?.personalStrategy;
    if (!strategy || strategy.availability !== "available" || pending) return;
    setPending(true);
    setConflict(null);
    try {
      const common = {
        sourceId: strategy.sourceId,
        expectedVersion: baseVersion,
        locale,
      } as const;
      handleMutation(
        await ensureNativeApi().oaAgentPrompts.mutate(
          action === "setPersonalStrategy"
            ? { action, ...common, content: draft }
            : { action, ...common },
        ),
      );
    } catch {
      toastManager.add({
        type: "error",
        title:
          action === "restorePersonalStrategy"
            ? t("settings.promptRestoreFailed")
            : t("settings.promptSaveFailed"),
        description: t("settings.promptSaveFailedDescription"),
      });
    } finally {
      setPending(false);
    }
  };

  if (loadError) {
    return (
      <SettingsEmptyState tone="destructive">
        <p>{t("settings.promptsUnavailable")}</p>
        <Button
          className="mt-3"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setPending(true);
            setLoadError(false);
            void load()
              .catch(() => setLoadError(true))
              .finally(() => setPending(false));
          }}
        >
          {pending ? t("common.loading") : t("common.retry")}
        </Button>
      </SettingsEmptyState>
    );
  }
  if (!snapshot) return <SettingsEmptyState>{t("common.loading")}</SettingsEmptyState>;

  const strategy = snapshot.personalStrategy;
  const unavailable = strategy.availability === "unavailable";
  const bytes = editableTextByteLength(draft);
  const invalid = hasDisallowedEditableTextControl(draft) || hasUnpairedUtf16Surrogate(draft);
  const tooLarge = bytes > snapshot.maxBytes;
  const unchanged =
    strategy.availability === "available" &&
    draft === strategy.content &&
    baseVersion === strategy.version;
  const canReveal = typeof window.desktopBridge?.showInFolder === "function";

  return (
    <SettingsSectionShell title={t("settings.personalStrategy")}>
      <SettingsCard divided={false}>
        <div id={PROMPTS_SETTINGS_SEARCH.personalStrategy.target} className="space-y-4 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("settings.personalStrategyDescription")}
          </p>
          <Textarea
            aria-label={t("settings.personalStrategy")}
            className="max-h-[min(48vh,28rem)] overflow-hidden [&_[data-slot=textarea]]:max-h-[min(48vh,28rem)] [&_[data-slot=textarea]]:overflow-y-auto"
            disabled={unavailable}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          {unavailable ? (
            <p className="text-xs leading-relaxed text-warning">
              {strategy.unavailableReason === "too_large"
                ? t("settings.personalStrategyTooLarge")
                : t("settings.personalStrategyUnavailable")}
            </p>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <code className="min-w-0 flex-1 select-text break-all">{strategy.displayPath}</code>
            {canReveal ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  void ensureNativeApi()
                    .shell.showInFolder(strategy.revealPath)
                    .catch(() =>
                      toastManager.add({ type: "error", title: t("settings.promptOpenFailed") }),
                    );
                }}
              >
                {t("common.open")}
              </Button>
            ) : null}
          </div>
          {!unavailable && invalid ? (
            <p className="text-xs leading-relaxed text-destructive">
              {t("settings.promptInvalidText")}
            </p>
          ) : null}
          {conflict ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/6 p-3 text-xs leading-relaxed">
              <p className="font-medium text-foreground">{t("settings.promptConflictTitle")}</p>
              <p className="mt-1 text-muted-foreground">
                {conflict.reason === "source_changed"
                  ? t("settings.promptSourceChanged")
                  : t("settings.promptContentChanged")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="xs" variant="outline" onClick={() => adoptSnapshot(conflict.fresh)}>
                  {t("settings.reloadPromptValue")}
                </Button>
                {conflict.reason !== "source_changed" ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setBaseVersion(conflict.fresh.personalStrategy.version ?? "");
                      setConflict(null);
                    }}
                  >
                    {t("settings.keepPromptDraft")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn("text-[11px] text-muted-foreground", tooLarge && "text-destructive")}
            >
              {t("settings.promptByteCount", {
                current: bytes.toLocaleString(),
                max: snapshot.maxBytes.toLocaleString(),
              })}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending || unavailable || conflict !== null}
                onClick={() => void mutate("restorePersonalStrategy")}
              >
                {t("settings.restoreFactoryDefault")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || unavailable}
                onClick={() => adoptSnapshot(snapshot)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                disabled={
                  pending || unavailable || invalid || tooLarge || unchanged || conflict !== null
                }
                onClick={() => void mutate("setPersonalStrategy")}
              >
                {pending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </SettingsCard>
    </SettingsSectionShell>
  );
}

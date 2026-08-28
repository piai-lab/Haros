// FILE: PromptsSettingsPanel.tsx
// Purpose: Edit OmniMind Agent's native default instruction segment and global custom rules.
// Layer: Settings UI composition

import {
  editableTextByteLength,
  hasDisallowedEditableTextControl,
  hasUnpairedUtf16Surrogate,
  type OmniMindAgentPromptMutationResult,
  type OmniMindAgentPromptSnapshot,
} from "@harnessos/contracts";
import { useEffect, useState } from "react";

import {
  SettingsCard,
  SettingsEmptyState,
  SettingsSectionShell,
} from "~/components/settings/SettingsPanelPrimitives";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import { PROMPTS_SETTINGS_SEARCH } from "~/settingsMetadata/promptSettings";

type EditorKind = "defaultPrompt" | "customRules";
type EditorConflict = {
  readonly reason: "content_changed" | "source_changed" | "state_changed";
  readonly fresh: OmniMindAgentPromptSnapshot;
};

export function PromptsSettingsPanel(props: { active: boolean }) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<OmniMindAgentPromptSnapshot | null>(null);
  const [defaultDraft, setDefaultDraft] = useState("");
  const [customRulesDraft, setCustomRulesDraft] = useState("");
  const [defaultBaseVersion, setDefaultBaseVersion] = useState("");
  const [customRulesBase, setCustomRulesBase] = useState<{
    readonly sourceId: OmniMindAgentPromptSnapshot["customRules"]["sourceId"];
    readonly version: string | null;
  }>({ sourceId: null, version: null });
  const [conflicts, setConflicts] = useState<Partial<Record<EditorKind, EditorConflict>>>({});
  const [pendingEditor, setPendingEditor] = useState<EditorKind | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadRetrying, setLoadRetrying] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const clearConflict = (editor: EditorKind) => {
    setConflicts((current) => {
      const next = { ...current };
      delete next[editor];
      return next;
    });
  };

  const adoptSnapshot = (next: OmniMindAgentPromptSnapshot, editor?: EditorKind) => {
    setSnapshot((current) => {
      if (editor === undefined || current === null) return next;
      return editor === "defaultPrompt"
        ? { ...current, defaultPrompt: next.defaultPrompt, maxBytes: next.maxBytes }
        : { ...current, customRules: next.customRules, maxBytes: next.maxBytes };
    });
    if (editor === undefined || editor === "defaultPrompt") {
      setDefaultDraft(next.defaultPrompt.content);
      setDefaultBaseVersion(next.defaultPrompt.version);
    }
    if (editor === undefined || editor === "customRules") {
      setCustomRulesDraft(next.customRules.content);
      setCustomRulesBase({
        sourceId: next.customRules.sourceId,
        version: next.customRules.version,
      });
    }
  };

  const load = async () => {
    const next = await ensureNativeApi().omnimindAgentPrompts.getSnapshot({});
    adoptSnapshot(next);
  };

  useEffect(() => {
    if (!props.active || snapshot !== null) return;
    let cancelled = false;
    setLoadError(false);
    void ensureNativeApi()
      .omnimindAgentPrompts.getSnapshot({})
      .then((next) => {
        if (!cancelled) adoptSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [props.active, snapshot]);

  if (!props.active) return null;

  const retryLoad = async () => {
    if (loadRetrying) return;
    setLoadRetrying(true);
    setLoadError(false);
    try {
      await load();
    } catch {
      setLoadError(true);
    } finally {
      setLoadRetrying(false);
    }
  };

  const handleMutation = (editor: EditorKind, result: OmniMindAgentPromptMutationResult) => {
    if (result.state === "conflict") {
      setSnapshot((current) => {
        if (current === null) return result.snapshot;
        return editor === "defaultPrompt"
          ? {
              ...current,
              defaultPrompt: result.snapshot.defaultPrompt,
              maxBytes: result.snapshot.maxBytes,
            }
          : {
              ...current,
              customRules: result.snapshot.customRules,
              maxBytes: result.snapshot.maxBytes,
            };
      });
      setConflicts((current) => ({
        ...current,
        [editor]: { reason: result.reason, fresh: result.snapshot },
      }));
      return;
    }
    adoptSnapshot(result.snapshot, editor);
    clearConflict(editor);
    toastManager.add({
      type: "success",
      title:
        result.state === "changed" ? t("settings.promptSaved") : t("settings.promptAlreadyCurrent"),
    });
  };

  const saveDefault = async () => {
    if (!snapshot || pendingEditor) return;
    setPendingEditor("defaultPrompt");
    clearConflict("defaultPrompt");
    try {
      handleMutation(
        "defaultPrompt",
        await ensureNativeApi().omnimindAgentPrompts.mutate({
          action: "setDefault",
          expectedVersion: defaultBaseVersion,
          content: defaultDraft,
        }),
      );
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.promptSaveFailed"),
        description: t("settings.promptSaveFailedDescription"),
      });
    } finally {
      setPendingEditor(null);
    }
  };

  const restoreDefault = async () => {
    if (!snapshot || pendingEditor || !snapshot.defaultPrompt.customized) return;
    setPendingEditor("defaultPrompt");
    try {
      handleMutation(
        "defaultPrompt",
        await ensureNativeApi().omnimindAgentPrompts.mutate({
          action: "restoreDefault",
          expectedVersion: defaultBaseVersion,
        }),
      );
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.promptRestoreFailed"),
        description: t("settings.promptSaveFailedDescription"),
      });
    } finally {
      setPendingEditor(null);
    }
  };

  const saveCustomRules = async () => {
    if (!snapshot || pendingEditor || snapshot.customRules.availability === "unavailable") return;
    setPendingEditor("customRules");
    clearConflict("customRules");
    try {
      const result =
        customRulesBase.sourceId && customRulesBase.version
          ? await ensureNativeApi().omnimindAgentPrompts.mutate({
              action: "updateCustomRules",
              sourceId: customRulesBase.sourceId,
              expectedVersion: customRulesBase.version,
              content: customRulesDraft,
            })
          : await ensureNativeApi().omnimindAgentPrompts.mutate({
              action: "createCustomRules",
              content: customRulesDraft,
            });
      handleMutation("customRules", result);
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.promptSaveFailed"),
        description: t("settings.promptSaveFailedDescription"),
      });
    } finally {
      setPendingEditor(null);
    }
  };

  const removeCustomRules = async () => {
    if (!customRulesBase.sourceId || !customRulesBase.version || pendingEditor) return;
    setPendingEditor("customRules");
    try {
      handleMutation(
        "customRules",
        await ensureNativeApi().omnimindAgentPrompts.mutate({
          action: "removeCustomRules",
          sourceId: customRulesBase.sourceId,
          expectedVersion: customRulesBase.version,
        }),
      );
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.promptRemoveFailed"),
        description: t("settings.promptRemoveFailedDescription"),
      });
    } finally {
      setPendingEditor(null);
    }
  };

  const resolveConflict = (editor: EditorKind, keepDraft: boolean) => {
    const conflict = conflicts[editor];
    if (!conflict) return;
    if (editor === "defaultPrompt") {
      setDefaultBaseVersion(conflict.fresh.defaultPrompt.version);
      if (!keepDraft) setDefaultDraft(conflict.fresh.defaultPrompt.content);
    } else {
      setCustomRulesBase({
        sourceId: conflict.fresh.customRules.sourceId,
        version: conflict.fresh.customRules.version,
      });
      if (!keepDraft) setCustomRulesDraft(conflict.fresh.customRules.content);
    }
    clearConflict(editor);
  };

  const renderConflict = (editor: EditorKind) => {
    const conflict = conflicts[editor];
    if (!conflict) return null;
    const canKeepDraft =
      conflict.reason === "content_changed" ||
      (editor === "defaultPrompt" && conflict.reason === "state_changed");
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/6 p-3 text-xs leading-relaxed">
        <p className="font-medium text-foreground">{t("settings.promptConflictTitle")}</p>
        <p className="mt-1 text-muted-foreground">
          {conflict.reason === "source_changed"
            ? t("settings.promptSourceChanged")
            : t("settings.promptContentChanged")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="xs" variant="outline" onClick={() => resolveConflict(editor, false)}>
            {t("settings.reloadPromptValue")}
          </Button>
          {canKeepDraft ? (
            <Button size="xs" variant="ghost" onClick={() => resolveConflict(editor, true)}>
              {t("settings.keepPromptDraft")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  if (loadError) {
    return (
      <SettingsEmptyState tone="destructive">
        <p>{t("settings.promptsUnavailable")}</p>
        <Button
          className="mt-3"
          size="sm"
          variant="outline"
          disabled={loadRetrying}
          onClick={() => void retryLoad()}
        >
          {loadRetrying ? t("common.loading") : t("common.retry")}
        </Button>
      </SettingsEmptyState>
    );
  }
  if (!snapshot) return <SettingsEmptyState>{t("common.loading")}</SettingsEmptyState>;

  const defaultBytes = editableTextByteLength(defaultDraft);
  const customRulesBytes = editableTextByteLength(customRulesDraft);
  const defaultInvalid =
    hasDisallowedEditableTextControl(defaultDraft) || hasUnpairedUtf16Surrogate(defaultDraft);
  const customRulesInvalid =
    hasDisallowedEditableTextControl(customRulesDraft) ||
    hasUnpairedUtf16Surrogate(customRulesDraft);
  const defaultTooLarge = defaultBytes > snapshot.maxBytes;
  const customRulesTooLarge = customRulesBytes > snapshot.maxBytes;
  const customRulesUnavailable = snapshot.customRules.availability === "unavailable";
  const canRevealCustomRules =
    typeof window.desktopBridge?.showInFolder === "function" &&
    snapshot.customRules.revealPath !== null;
  const defaultUnchanged =
    defaultDraft === snapshot.defaultPrompt.content &&
    defaultBaseVersion === snapshot.defaultPrompt.version;
  const customRulesUnchanged =
    customRulesDraft === snapshot.customRules.content &&
    customRulesBase.sourceId === snapshot.customRules.sourceId &&
    customRulesBase.version === snapshot.customRules.version;

  return (
    <div className="space-y-6">
      <SettingsSectionShell title={t("settings.defaultPrompt")}>
        <SettingsCard divided={false}>
          <div id={PROMPTS_SETTINGS_SEARCH.defaultPrompt.target} className="space-y-4 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("settings.defaultPromptDescription")}
            </p>
            <Textarea
              aria-label={t("settings.defaultPrompt")}
              className="max-h-[min(48vh,28rem)] overflow-hidden [&_[data-slot=textarea]]:max-h-[min(48vh,28rem)] [&_[data-slot=textarea]]:overflow-y-auto"
              value={defaultDraft}
              onChange={(event) => setDefaultDraft(event.currentTarget.value)}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {snapshot.defaultPrompt.customized
                ? t("settings.defaultPromptCustomizedNotice")
                : t("settings.defaultPromptSourceNotice")}
            </p>
            {defaultInvalid ? (
              <p className="text-xs leading-relaxed text-destructive">
                {t("settings.promptInvalidText")}
              </p>
            ) : null}
            {renderConflict("defaultPrompt")}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "text-[11px] text-muted-foreground",
                  defaultTooLarge && "text-destructive",
                )}
              >
                {t("settings.promptByteCount", {
                  current: defaultBytes.toLocaleString(),
                  max: snapshot.maxBytes.toLocaleString(),
                })}
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendingEditor !== null || !snapshot.defaultPrompt.customized}
                  onClick={() => void restoreDefault()}
                >
                  {t("settings.restoreFactoryDefault")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingEditor !== null}
                  onClick={() => {
                    setDefaultDraft(snapshot.defaultPrompt.content);
                    setDefaultBaseVersion(snapshot.defaultPrompt.version);
                    clearConflict("defaultPrompt");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={
                    pendingEditor !== null ||
                    defaultInvalid ||
                    defaultTooLarge ||
                    defaultUnchanged ||
                    conflicts.defaultPrompt !== undefined
                  }
                  onClick={() => void saveDefault()}
                >
                  {pendingEditor === "defaultPrompt" ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSectionShell>

      <SettingsSectionShell title={t("settings.customRules")}>
        <SettingsCard divided={false}>
          <div id={PROMPTS_SETTINGS_SEARCH.customRules.target} className="space-y-4 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("settings.customRulesDescription")}
            </p>
            <Textarea
              aria-label={t("settings.customRules")}
              className="max-h-[min(48vh,28rem)] overflow-hidden [&_[data-slot=textarea]]:max-h-[min(48vh,28rem)] [&_[data-slot=textarea]]:overflow-y-auto"
              disabled={customRulesUnavailable}
              value={customRulesDraft}
              onChange={(event) => setCustomRulesDraft(event.currentTarget.value)}
            />
            {customRulesUnavailable ? (
              <p className="text-xs leading-relaxed text-warning">
                {snapshot.customRules.unavailableReason === "too_large"
                  ? t("settings.customRulesTooLarge")
                  : t("settings.customRulesUnavailable")}
              </p>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {snapshot.customRules.exists && snapshot.customRules.displayPath ? (
                <>
                  <code className="min-w-0 flex-1 select-text break-all">
                    {snapshot.customRules.displayPath}
                  </code>
                  {canRevealCustomRules ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        void ensureNativeApi()
                          .shell.showInFolder(snapshot.customRules.revealPath!)
                          .catch(() =>
                            toastManager.add({
                              type: "error",
                              title: t("settings.promptOpenFailed"),
                            }),
                          );
                      }}
                    >
                      {t("common.open")}
                    </Button>
                  ) : null}
                </>
              ) : (
                <span>{t("settings.customRulesCreateNotice")}</span>
              )}
            </div>
            {!customRulesUnavailable && customRulesInvalid ? (
              <p className="text-xs leading-relaxed text-destructive">
                {t("settings.promptInvalidText")}
              </p>
            ) : null}
            {renderConflict("customRules")}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {customRulesUnavailable ? (
                <span />
              ) : (
                <span
                  className={cn(
                    "text-[11px] text-muted-foreground",
                    customRulesTooLarge && "text-destructive",
                  )}
                >
                  {t("settings.promptByteCount", {
                    current: customRulesBytes.toLocaleString(),
                    max: snapshot.maxBytes.toLocaleString(),
                  })}
                </span>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {snapshot.customRules.availability === "available" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pendingEditor !== null || conflicts.customRules !== undefined}
                    onClick={() => setRemoveDialogOpen(true)}
                  >
                    {t("common.delete")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingEditor !== null || customRulesUnavailable}
                  onClick={() => {
                    setCustomRulesDraft(snapshot.customRules.content);
                    setCustomRulesBase({
                      sourceId: snapshot.customRules.sourceId,
                      version: snapshot.customRules.version,
                    });
                    clearConflict("customRules");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={
                    pendingEditor !== null ||
                    customRulesUnavailable ||
                    customRulesInvalid ||
                    customRulesTooLarge ||
                    customRulesUnchanged ||
                    (!snapshot.customRules.exists && customRulesDraft.length === 0) ||
                    conflicts.customRules !== undefined
                  }
                  onClick={() => void saveCustomRules()}
                >
                  {pendingEditor === "customRules" ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSectionShell>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.removeCustomRulesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.removeCustomRulesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setRemoveDialogOpen(false);
                void removeCustomRules();
              }}
            >
              {t("common.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

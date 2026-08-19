// FILE: PromptsSettingsPanel.tsx
// Purpose: File-first editing for the global prompt resources used by OmniMind Agent.
// Layer: Settings UI composition

import {
  ThreadId,
  type OmniMindAgentPromptMutationResult,
  type OmniMindAgentPromptResourceKind,
  type OmniMindAgentPromptResourceSnapshot,
  type OmniMindAgentPromptSnapshot,
} from "@omnimind/contracts";
import { useEffect, useMemo, useState } from "react";

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
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "~/components/ui/collapsible";
import { DisclosureChevron } from "~/components/ui/DisclosureChevron";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { useI18n, type MessageKey } from "~/i18n";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import { SETTINGS_TARGETS } from "~/settingsNavigation";
import { resolvePromptReloadThreadId } from "./promptReloadTarget";

type EditorBase = {
  readonly sourceId: OmniMindAgentPromptResourceSnapshot["sourceId"];
  readonly version: string | null;
};
type ConflictState = {
  readonly reason: "content_changed" | "source_changed" | "state_changed";
  readonly fresh: OmniMindAgentPromptResourceSnapshot;
};
type ConfirmAction =
  | { readonly type: "create-system" }
  | { readonly type: "remove"; readonly resource: OmniMindAgentPromptResourceKind }
  | null;

const RESOURCE_COPY: Record<
  OmniMindAgentPromptResourceKind,
  { readonly title: MessageKey; readonly description: MessageKey }
> = {
  globalContext: {
    title: "settings.globalPersonalInstructions",
    description: "settings.globalPersonalInstructionsDescription",
  },
  appendSystem: {
    title: "settings.appendSystemInstructions",
    description: "settings.appendSystemInstructionsDescription",
  },
  system: {
    title: "settings.systemInstructions",
    description: "settings.systemInstructionsDescription",
  },
};

function resourceOf(
  snapshot: OmniMindAgentPromptSnapshot,
  resource: OmniMindAgentPromptResourceKind,
): OmniMindAgentPromptResourceSnapshot {
  return snapshot[resource];
}

function mergeSnapshot(
  previous: OmniMindAgentPromptSnapshot | null,
  next: OmniMindAgentPromptSnapshot,
): OmniMindAgentPromptSnapshot {
  if (!previous) return next;
  const preserveLoaded = (
    oldResource: OmniMindAgentPromptResourceSnapshot,
    newResource: OmniMindAgentPromptResourceSnapshot,
  ) =>
    !newResource.contentLoaded &&
    oldResource.contentLoaded &&
    oldResource.sourceId === newResource.sourceId
      ? oldResource
      : newResource;
  return {
    ...next,
    globalContext: preserveLoaded(previous.globalContext, next.globalContext),
    appendSystem: preserveLoaded(previous.appendSystem, next.appendSystem),
    system: preserveLoaded(previous.system, next.system),
  };
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function PromptsSettingsPanel(props: { active: boolean }) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<OmniMindAgentPromptSnapshot | null>(null);
  const [drafts, setDrafts] = useState<Record<OmniMindAgentPromptResourceKind, string>>({
    globalContext: "",
    appendSystem: "",
    system: "",
  });
  const [bases, setBases] = useState<Record<OmniMindAgentPromptResourceKind, EditorBase>>({
    globalContext: { sourceId: null, version: null },
    appendSystem: { sourceId: null, version: null },
    system: { sourceId: null, version: null },
  });
  const [adding, setAdding] = useState<Record<OmniMindAgentPromptResourceKind, boolean>>({
    globalContext: false,
    appendSystem: false,
    system: false,
  });
  const [conflicts, setConflicts] = useState<
    Partial<Record<OmniMindAgentPromptResourceKind, ConflictState>>
  >({});
  const [pendingResource, setPendingResource] = useState<OmniMindAgentPromptResourceKind | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [reloadThreadId, setReloadThreadId] = useState<ThreadId | null>(null);
  const [reloadState, setReloadState] = useState<
    "reloaded" | "no_active_session" | "different_engine" | "busy" | "failed" | null
  >(null);
  const [reloading, setReloading] = useState(false);

  const adoptResource = (
    nextSnapshot: OmniMindAgentPromptSnapshot,
    resource: OmniMindAgentPromptResourceKind,
    options: { readonly preserveDraft?: boolean } = {},
  ) => {
    const nextResource = resourceOf(nextSnapshot, resource);
    setSnapshot((current) => mergeSnapshot(current, nextSnapshot));
    setBases((current) => ({
      ...current,
      [resource]: { sourceId: nextResource.sourceId, version: nextResource.version },
    }));
    if (!options.preserveDraft) {
      setDrafts((current) => ({ ...current, [resource]: nextResource.content ?? "" }));
      setAdding((current) => ({ ...current, [resource]: false }));
    }
  };

  const loadResource = async (resource: OmniMindAgentPromptResourceKind) => {
    const next = await ensureNativeApi().omnimindAgentPrompts.getSnapshot({ resource });
    adoptResource(next, resource);
    return next;
  };

  useEffect(() => {
    if (!props.active) return;
    let cancelled = false;
    setLoadError(false);
    setReloadThreadId(resolvePromptReloadThreadId());
    void ensureNativeApi()
      .omnimindAgentPrompts.getSnapshot({ resource: "globalContext" })
      .then((next) => {
        if (!cancelled) adoptResource(next, "globalContext");
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [props.active]);

  const shadowedCandidates = useMemo(
    () =>
      snapshot?.globalContextCandidates.filter(
        (candidate) => candidate.exists && !candidate.active,
      ) ?? [],
    [snapshot],
  );

  if (!props.active) return null;

  const save = async (resource: OmniMindAgentPromptResourceKind) => {
    const current = snapshot ? resourceOf(snapshot, resource) : null;
    const base = bases[resource];
    if (!current || pendingResource) return;
    if (resource === "system" && !current.exists) {
      setConfirmAction({ type: "create-system" });
      return;
    }
    await performSave(resource);
  };

  const performSave = async (resource: OmniMindAgentPromptResourceKind) => {
    const current = snapshot ? resourceOf(snapshot, resource) : null;
    const base = bases[resource];
    if (!current || pendingResource) return;
    setPendingResource(resource);
    setConflicts((state) => ({ ...state, [resource]: undefined }));
    try {
      const result = await ensureNativeApi().omnimindAgentPrompts.mutate(
        base.sourceId && base.version
          ? {
              action: "update",
              resource,
              sourceId: base.sourceId,
              expectedVersion: base.version,
              content: drafts[resource],
            }
          : { action: "create", resource, content: drafts[resource] },
      );
      handleMutationResult(resource, result);
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.promptSaveFailed"),
        description: t("settings.promptSaveFailedDescription"),
      });
    } finally {
      setPendingResource(null);
    }
  };

  const handleMutationResult = (
    resource: OmniMindAgentPromptResourceKind,
    result: OmniMindAgentPromptMutationResult,
  ) => {
    if (result.state === "conflict") {
      const fresh = resourceOf(result.snapshot, resource);
      setSnapshot((current) => mergeSnapshot(current, result.snapshot));
      setConflicts((current) => ({
        ...current,
        [resource]: { reason: result.reason, fresh },
      }));
      return;
    }
    adoptResource(result.snapshot, resource);
    setConflicts((current) => ({ ...current, [resource]: undefined }));
    if (result.state === "changed") setReloadState(null);
    toastManager.add({
      type: "success",
      title:
        result.state === "changed" ? t("settings.promptSaved") : t("settings.promptAlreadyCurrent"),
    });
  };

  const remove = async (resource: OmniMindAgentPromptResourceKind) => {
    const base = bases[resource];
    if (!base.sourceId || !base.version || pendingResource) return;
    setPendingResource(resource);
    try {
      const result = await ensureNativeApi().omnimindAgentPrompts.mutate({
        action: "remove",
        resource,
        sourceId: base.sourceId,
        expectedVersion: base.version,
      });
      handleMutationResult(resource, result);
    } catch {
      toastManager.add({
        type: "error",
        title: t("settings.promptRemoveFailed"),
        description: t("settings.promptRemoveFailedDescription"),
      });
    } finally {
      setPendingResource(null);
    }
  };

  const reload = async () => {
    if (!reloadThreadId || reloading) return;
    setReloading(true);
    setReloadState(null);
    try {
      const result = await ensureNativeApi().omnimindEcosystem.reload({
        threadId: reloadThreadId,
      });
      setReloadState(result.state);
      if (result.state === "different_engine") setReloadThreadId(resolvePromptReloadThreadId());
    } catch {
      setReloadState("failed");
    } finally {
      setReloading(false);
    }
  };

  const renderEditor = (resource: OmniMindAgentPromptResourceKind) => {
    const current = snapshot ? resourceOf(snapshot, resource) : null;
    if (!current) return null;
    if (!current.contentLoaded) {
      return (
        <SettingsCard divided={false}>
          <SettingsEmptyState className="py-7">{t("common.loading")}</SettingsEmptyState>
        </SettingsCard>
      );
    }
    const isAdding = adding[resource];
    const visible = current.exists || isAdding;
    const conflict = conflicts[resource];
    const currentBytes = byteLength(drafts[resource]);
    const tooLarge = snapshot ? currentBytes > snapshot.maxBytes : false;
    const unchanged = current.exists
      ? drafts[resource] === (current.content ?? "") && bases[resource].version === current.version
      : drafts[resource].length === 0;

    return (
      <SettingsCard divided={false}>
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {t(RESOURCE_COPY[resource].title)}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(RESOURCE_COPY[resource].description)}
            </p>
          </div>
          {!visible ? (
            <SettingsEmptyState className="py-7">
              <p>{t("settings.promptFileNotCreated")}</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() =>
                  setAdding((currentAdding) => ({ ...currentAdding, [resource]: true }))
                }
              >
                {resource === "globalContext"
                  ? t("settings.addInstructions")
                  : t("settings.createPromptFile")}
              </Button>
            </SettingsEmptyState>
          ) : (
            <div className="space-y-3">
              <Textarea
                aria-label={t(RESOURCE_COPY[resource].title)}
                className="max-h-[min(48vh,28rem)]"
                value={drafts[resource]}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDrafts((currentDrafts) => ({
                    ...currentDrafts,
                    [resource]: value,
                  }));
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[11px] text-muted-foreground",
                    tooLarge && "text-destructive",
                  )}
                >
                  {t("settings.promptByteCount", {
                    current: currentBytes.toLocaleString(),
                    max: snapshot?.maxBytes.toLocaleString() ?? "—",
                  })}
                </span>
                <div className="flex flex-wrap justify-end gap-2">
                  {current.exists ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendingResource !== null}
                      onClick={() => setConfirmAction({ type: "remove", resource })}
                    >
                      {t("common.delete")}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingResource !== null}
                    onClick={() => {
                      setDrafts((draftState) => ({
                        ...draftState,
                        [resource]: current.content ?? "",
                      }));
                      setAdding((addingState) => ({ ...addingState, [resource]: false }));
                      setConflicts((state) => ({ ...state, [resource]: undefined }));
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={pendingResource !== null || tooLarge || unchanged || conflict != null}
                    onClick={() => void save(resource)}
                  >
                    {pendingResource === resource ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {conflict ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/6 p-3 text-xs leading-relaxed">
              <p className="font-medium text-foreground">{t("settings.promptConflictTitle")}</p>
              <p className="mt-1 text-muted-foreground">
                {conflict.reason === "source_changed"
                  ? t("settings.promptSourceChanged")
                  : t("settings.promptContentChanged")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    adoptResource(
                      { ...(snapshot as OmniMindAgentPromptSnapshot), [resource]: conflict.fresh },
                      resource,
                    );
                    setConflicts((state) => ({ ...state, [resource]: undefined }));
                  }}
                >
                  {t("settings.reloadPromptFile")}
                </Button>
                {conflict.reason === "content_changed" &&
                conflict.fresh.sourceId &&
                conflict.fresh.version ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setBases((state) => ({
                        ...state,
                        [resource]: {
                          sourceId: conflict.fresh.sourceId,
                          version: conflict.fresh.version,
                        },
                      }));
                      setConflicts((state) => ({ ...state, [resource]: undefined }));
                    }}
                  >
                    {t("settings.keepPromptDraft")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </SettingsCard>
    );
  };

  return (
    <div className="space-y-6">
      {loadError ? (
        <SettingsEmptyState tone="destructive">
          {t("settings.promptsUnavailable")}
        </SettingsEmptyState>
      ) : !snapshot ? (
        <SettingsEmptyState>{t("common.loading")}</SettingsEmptyState>
      ) : (
        <>
          <SettingsSectionShell title={t("settings.globalPersonalInstructions")}>
            <div id={SETTINGS_TARGETS.globalPersonalInstructions} className="space-y-3">
              {renderEditor("globalContext")}
              {shadowedCandidates.length > 0 ? (
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  {t("settings.shadowedPromptFiles", {
                    files: shadowedCandidates.map((candidate) => candidate.sourceId).join(", "),
                  })}
                </p>
              ) : null}
            </div>
          </SettingsSectionShell>

          <Collapsible
            open={advancedOpen}
            onOpenChange={(open) => {
              setAdvancedOpen(open);
              if (
                open &&
                (!snapshot.appendSystem.contentLoaded || !snapshot.system.contentLoaded)
              ) {
                void Promise.all([loadResource("appendSystem"), loadResource("system")]).catch(() =>
                  setLoadError(true),
                );
              }
            }}
          >
            <SettingsSectionShell title={t("settings.advancedPromptFiles")}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left">
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {t("settings.advancedPromptSection")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t("settings.advancedPromptFilesDescription")}
                  </span>
                </span>
                <DisclosureChevron open={advancedOpen} className="size-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsiblePanel className="space-y-4 pt-4">
                {renderEditor("appendSystem")}
                {renderEditor("system")}
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  {t("settings.projectPromptShadowNotice")}
                </p>
              </CollapsiblePanel>
            </SettingsSectionShell>
          </Collapsible>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <SettingsSectionShell title={t("settings.technicalDetails")}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left">
                <span className="text-sm font-medium text-foreground">
                  {t("settings.promptFileLocations")}
                </span>
                <DisclosureChevron open={detailsOpen} className="size-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsiblePanel className="pt-3">
                <SettingsCard>
                  {snapshot.globalContextCandidates
                    .filter(
                      (candidate) =>
                        candidate.exists || candidate.active || candidate.sourceId === "AGENTS.md",
                    )
                    .map((candidate) => (
                      <div
                        key={candidate.sourceId}
                        className="flex min-w-0 items-center gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground">
                            {candidate.sourceId} ·{" "}
                            {candidate.active
                              ? t("settings.activePromptFile")
                              : candidate.exists
                                ? t("settings.shadowedPromptFile")
                                : t("settings.defaultPromptFile")}
                          </div>
                          <code className="mt-1 block break-all text-[11px] text-muted-foreground">
                            {candidate.displayPath}
                          </code>
                        </div>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            void navigator.clipboard.writeText(candidate.displayPath).then(
                              () =>
                                toastManager.add({
                                  type: "success",
                                  title: t("settings.pathCopied"),
                                }),
                              () =>
                                toastManager.add({
                                  type: "error",
                                  title: t("settings.pathCopyFailed"),
                                }),
                            );
                          }}
                        >
                          {t("common.copy")}
                        </Button>
                      </div>
                    ))}
                  {(["appendSystem", "system"] as const).map((resource) => {
                    const current = resourceOf(snapshot, resource);
                    if (!current.displayPath) return null;
                    return (
                      <div key={resource} className="flex min-w-0 items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground">
                            {current.sourceId} ·{" "}
                            {current.exists
                              ? t("settings.activePromptFile")
                              : t("settings.promptFileNotCreatedShort")}
                          </div>
                          <code className="mt-1 block break-all text-[11px] text-muted-foreground">
                            {current.displayPath}
                          </code>
                        </div>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            void navigator.clipboard.writeText(current.displayPath!).then(
                              () =>
                                toastManager.add({
                                  type: "success",
                                  title: t("settings.pathCopied"),
                                }),
                              () =>
                                toastManager.add({
                                  type: "error",
                                  title: t("settings.pathCopyFailed"),
                                }),
                            );
                          }}
                        >
                          {t("common.copy")}
                        </Button>
                      </div>
                    );
                  })}
                </SettingsCard>
              </CollapsiblePanel>
            </SettingsSectionShell>
          </Collapsible>

          <SettingsSectionShell title={t("settings.currentConversationResources")}>
            <SettingsCard divided={false}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {reloadThreadId
                    ? t("settings.promptReloadAvailable")
                    : t("settings.promptReloadUnavailable")}
                </p>
                {reloadThreadId ? (
                  <Button size="sm" disabled={reloading} onClick={() => void reload()}>
                    {reloading
                      ? t("settings.reloadingResources")
                      : t("settings.reloadConversationResources")}
                  </Button>
                ) : null}
              </div>
              {reloadState ? (
                <p className="border-t border-border/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  {reloadState === "reloaded"
                    ? t("settings.promptReloaded")
                    : reloadState === "busy"
                      ? t("settings.promptReloadBusy")
                      : reloadState === "no_active_session"
                        ? t("settings.promptReloadNoSession")
                        : reloadState === "different_engine"
                          ? t("settings.promptReloadDifferentEngine")
                          : t("settings.promptReloadFailed")}
                </p>
              ) : null}
            </SettingsCard>
          </SettingsSectionShell>
        </>
      )}

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "create-system"
                ? t("settings.createSystemPromptTitle")
                : t("settings.removePromptFileTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "create-system"
                ? t("settings.createSystemPromptDescription")
                : confirmAction?.type === "remove" && confirmAction.resource === "globalContext"
                  ? t("settings.removeGlobalPromptFileDescription")
                  : t("settings.removePromptFileDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common.cancel")}
            </AlertDialogClose>
            <Button
              size="sm"
              variant={confirmAction?.type === "remove" ? "destructive" : "default"}
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action?.type === "create-system") void performSave("system");
                if (action?.type === "remove") void remove(action.resource);
              }}
            >
              {confirmAction?.type === "remove" ? t("common.delete") : t("common.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

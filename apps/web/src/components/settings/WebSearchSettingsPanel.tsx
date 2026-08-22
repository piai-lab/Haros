// FILE: WebSearchSettingsPanel.tsx
// Purpose: Edit the package-owned OmniMind Web Access configuration without duplicating runtime facts.
// Layer: Settings panel

import type {
  OmniMindWebSearchDraft,
  OmniMindWebSearchProbeResult,
  OmniMindWebSearchReadResult,
  OmniMindWebSearchSettingsSnapshot,
  OmniMindWebSearchWorkflow,
} from "@omnimind/contracts";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveAndPersistPreferredEditor } from "~/editorPreferences";
import { useI18n } from "~/i18n";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { ArrowLeftIcon, CopyIcon, EyeIcon, PlusIcon, WebSearchIcon } from "~/lib/icons";
import { ensureNativeApi } from "~/nativeApi";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SearchInput } from "../ui/search-input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { toastManager } from "../ui/toast";
import {
  SettingsCard,
  SettingsEmptyState,
  SettingsListRow,
  SettingsRow,
  SettingsSection,
  SettingsSectionShell,
  SettingsSelectPopup,
} from "./SettingsPanelPrimitives";

type ReadySnapshot = OmniMindWebSearchSettingsSnapshot;
type DraftState = {
  readonly provider: string | readonly string[];
  readonly workflow: OmniMindWebSearchWorkflow;
  readonly autoShowSearchProcess: boolean;
  readonly fields: Readonly<Record<string, string | null>>;
};
type View = { readonly kind: "overview" } | { readonly kind: "add" } | {
  readonly kind: "detail";
  readonly providerId: string;
};

const workflowOptions: readonly OmniMindWebSearchWorkflow[] = [
  "auto-summary",
  "summary-review",
  "none",
];

function draftFrom(snapshot: ReadySnapshot): DraftState {
  return {
    provider: snapshot.provider,
    workflow: snapshot.workflow,
    autoShowSearchProcess: snapshot.autoShowSearchProcess,
    fields: Object.fromEntries(
      snapshot.providers.flatMap((provider) =>
        provider.fields.map((field) => [field.configKey, field.value] as const),
      ),
    ),
  };
}

function mutationDraft(draft: DraftState): OmniMindWebSearchDraft {
  return {
    provider: draft.provider,
    workflow: draft.workflow,
    autoShowSearchProcess: draft.autoShowSearchProcess,
    fields: Object.entries(draft.fields).map(([configKey, value]) => ({ configKey, value })),
  };
}

function sameDraft(left: DraftState | null, right: DraftState | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function providerSelectionValue(provider: DraftState["provider"]): string {
  return typeof provider === "string" ? provider : "__selected_parallel__";
}

function ProviderMark({
  icon,
  label,
}: {
  readonly icon: ReadySnapshot["providers"][number]["icon"];
  readonly label: string;
}) {
  const fallbackMonogram = label
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      data-provider-icon-kind={icon.kind}
      className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-white text-muted-foreground"
    >
      {icon.kind === "local-asset" ? (
        <img alt="" className="size-5 object-contain" src={icon.assetPath} />
      ) : (
        <span className="text-[10px] font-semibold tracking-tight">{fallbackMonogram}</span>
      )}
    </span>
  );
}

export function WebSearchSettingsPanel({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const configQuery = useQuery(serverConfigQueryOptions());
  const [readResult, setReadResult] = useState<OmniMindWebSearchReadResult | null>(null);
  const [base, setBase] = useState<ReadySnapshot | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [conflict, setConflict] = useState<ReadySnapshot | null>(null);
  const [view, setView] = useState<View>({ kind: "overview" });
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"loading" | "saving" | "opening" | null>(null);
  const [probe, setProbe] = useState<OmniMindWebSearchProbeResult | null>(null);
  const [probeProvider, setProbeProvider] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<ReadonlySet<string>>(new Set());
  const [geminiDiagnostic, setGeminiDiagnostic] = useState<{
    readonly state: "available" | "unavailable";
    readonly browser: string | null;
    readonly profile: string | null;
    readonly account: string | null;
  } | null>(null);
  const probeRequestRef = useRef<Promise<void> | null>(null);

  const cleanDraft = useMemo(() => (base ? draftFrom(base) : null), [base]);
  const dirty = !sameDraft(draft, cleanDraft);

  const acceptSnapshot = useCallback((snapshot: ReadySnapshot) => {
    setReadResult(snapshot);
    setBase(snapshot);
    setDraft(draftFrom(snapshot));
    setConflict(null);
    setProbe(null);
    setProbeProvider(null);
  }, []);

  const applyReadResult = useCallback(
    (result: OmniMindWebSearchReadResult, preserveDirty: boolean) => {
      setReadResult(result);
      if (result.state === "recovery") return;
      if (preserveDirty && dirty && base && result.revision !== base.revision) {
        setConflict(result);
        return;
      }
      acceptSnapshot(result);
    },
    [acceptSnapshot, base, dirty],
  );

  const load = useCallback(
    async (mode: "open" | "refresh") => {
      if (busy === "loading") return;
      setBusy("loading");
      try {
        const api = ensureNativeApi();
        const result = mode === "open"
          ? await api.omnimindWebSearch.open()
          : await api.omnimindWebSearch.refresh(base ? { knownRevision: base.revision } : {});
        applyReadResult(result, mode === "refresh");
      } catch (error) {
        toastManager.add({
          type: "error",
          title: t("settings.webSearch.loadFailed"),
          description: error instanceof Error ? error.message : t("settings.webSearch.unknownError"),
        });
      } finally {
        setBusy(null);
      }
    },
    [applyReadResult, base, busy, t],
  );

  useEffect(() => {
    if (active && readResult === null) void load("open");
  }, [active, load, readResult]);

  useEffect(() => {
    if (!active) return;
    const onFocus = () => void load("refresh");
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [active, load]);

  const save = useCallback(
    async (overwrite = false) => {
      if (!draft || !base || busy === "saving") return;
      setBusy("saving");
      try {
        const expectedRevision = overwrite && conflict ? conflict.revision : base.revision;
        const result = await ensureNativeApi().omnimindWebSearch.mutate({
          expectedRevision,
          draft: mutationDraft(draft),
          ...(overwrite ? { allowOverwriteConflict: true } : {}),
        });
        if (result.state === "recovery") {
          setReadResult(result);
          return;
        }
        if (result.state === "conflict") {
          setConflict(result.snapshot);
          toastManager.add({ type: "warning", title: t("settings.webSearch.conflictTitle"), description: t("settings.webSearch.conflictDescription") });
          return;
        }
        acceptSnapshot(result.snapshot);
        toastManager.add({
          type: "success",
          title: result.state === "changed" ? t("settings.webSearch.saved") : t("settings.webSearch.noChanges"),
        });
      } catch (error) {
        toastManager.add({ type: "error", title: t("settings.webSearch.saveFailed"), description: error instanceof Error ? error.message : t("settings.webSearch.unknownError") });
      } finally {
        setBusy(null);
      }
    },
    [acceptSnapshot, base, busy, conflict, draft, t],
  );

  const runProviderTest = useCallback((providerId: string) => {
    if (!draft) return Promise.resolve();
    if (probeRequestRef.current) return probeRequestRef.current;
    const requestId = crypto.randomUUID();
    const request = (async () => {
      setProbe(null);
      setProbeProvider(providerId);
      try {
        setProbe(await ensureNativeApi().omnimindWebSearch.testProvider({
          requestId,
          providerId,
          draft: mutationDraft(draft),
        }));
      } catch {
        setProbe({ state: "failed", provider: providerId, reason: "provider-failed", durationMs: 0 });
      } finally {
        setProbeProvider(null);
      }
    })();
    probeRequestRef.current = request;
    void request.finally(() => {
      if (probeRequestRef.current === request) probeRequestRef.current = null;
    });
    return request;
  }, [draft]);

  const recheck = useCallback(() => {
    if (probeRequestRef.current) return probeRequestRef.current;
    const requestId = crypto.randomUUID();
    const request = (async () => {
      setProbe(null);
      setProbeProvider("__route__");
      try {
        setProbe(await ensureNativeApi().omnimindWebSearch.recheck({ requestId }));
      } catch {
        setProbe({ state: "degraded", provider: null, reason: "temporary-failure", durationMs: 0 });
      } finally {
        setProbeProvider(null);
      }
    })();
    probeRequestRef.current = request;
    void request.finally(() => {
      if (probeRequestRef.current === request) probeRequestRef.current = null;
    });
    return request;
  }, []);

  const openConfig = useCallback(async () => {
    const editor = resolveAndPersistPreferredEditor(configQuery.data?.availableEditors ?? []);
    if (!editor) {
      toastManager.add({ type: "error", title: t("settings.noEditors") });
      return;
    }
    setBusy("opening");
    try {
      await ensureNativeApi().omnimindWebSearch.openConfig({ editor });
    } catch (error) {
      toastManager.add({ type: "error", title: t("settings.webSearch.openConfigFailed"), description: error instanceof Error ? error.message : t("settings.webSearch.unknownError") });
    } finally {
      setBusy(null);
    }
  }, [configQuery.data?.availableEditors, t]);

  if (!active) return null;
  if (!readResult || busy === "loading" && !base) {
    return <SettingsEmptyState layout="status">{t("settings.webSearch.loading")}</SettingsEmptyState>;
  }
  if (readResult.state === "recovery") {
    return (
      <SettingsEmptyState tone="destructive" className="space-y-3">
        <div className="font-medium text-foreground">{t("settings.webSearch.recoveryTitle")}</div>
        <div>{readResult.message}</div>
        <div className="flex justify-center gap-2">
          <Button size="xs" variant="outline" onClick={() => void load("refresh")}>{t("common.refresh")}</Button>
          <Button size="xs" variant="outline" onClick={() => void openConfig()}>{t("settings.webSearch.openConfig")}</Button>
        </div>
      </SettingsEmptyState>
    );
  }
  if (!base || !draft) return null;

  const selectedProvider = view.kind === "detail"
    ? base.providers.find((provider) => provider.id === view.providerId) ?? null
    : null;
  const filteredProviders = base.providers.filter((provider) =>
    `${provider.displayName} ${provider.id}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const prerequisiteDescription = (prerequisite: ReadySnapshot["providers"][number]["prerequisite"]) => {
    switch (prerequisite) {
      case "none": return t("settings.webSearch.prerequisite.none");
      case "optional-key": return t("settings.webSearch.prerequisite.optionalKey");
      case "key": return t("settings.webSearch.prerequisite.key");
      case "endpoint": return t("settings.webSearch.prerequisite.endpoint");
      case "key-or-session": return t("settings.webSearch.prerequisite.keyOrSession");
      case "gemini": return t("settings.webSearch.prerequisite.gemini");
    }
  };

  const conflictNotice = conflict ? (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">
      <div className="font-medium">{t("settings.webSearch.conflictTitle")}</div>
      <p className="mt-1 text-muted-foreground">{t("settings.webSearch.conflictDescription")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="xs" variant="outline" onClick={() => acceptSnapshot(conflict)}>{t("settings.webSearch.reloadFile")}</Button>
        <Button size="xs" variant="outline" onClick={() => void save(true)}>{t("settings.webSearch.overwriteWithDraft")}</Button>
      </div>
    </div>
  ) : null;

  if (view.kind === "add") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button size="xs" variant="ghost" onClick={() => setView({ kind: "overview" })}><ArrowLeftIcon className="size-3.5" />{t("common.back")}</Button>
        </div>
        <SettingsSectionShell title={t("settings.webSearch.addProvider")}>
          <div className="mb-3"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("settings.webSearch.searchProviders")} /></div>
          <SettingsCard>
            {filteredProviders.map((provider) => (
              <SettingsListRow
                key={provider.id}
                title={<span className="flex items-center gap-2"><ProviderMark icon={provider.icon} label={provider.displayName} />{provider.displayName}</span>}
                description={`${prerequisiteDescription(provider.prerequisite)} · ${provider.configured ? t("settings.webSearch.configured") : t("settings.webSearch.notConfigured")}`}
                actions={<Button size="xs" variant="outline" onClick={() => setView({ kind: "detail", providerId: provider.id })}>{t("common.edit")}</Button>}
              />
            ))}
          </SettingsCard>
        </SettingsSectionShell>
      </div>
    );
  }

  if (view.kind === "detail" && selectedProvider) {
    const testingThis = probeProvider === selectedProvider.id;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button size="xs" variant="ghost" onClick={() => setView({ kind: "overview" })}><ArrowLeftIcon className="size-3.5" />{t("common.back")}</Button>
          <div className="flex gap-2">
            <Button size="xs" variant="outline" disabled={!dirty} onClick={() => setDraft(draftFrom(base))}>{t("common.cancel")}</Button>
            <Button size="xs" disabled={!dirty || busy === "saving" || Boolean(conflict)} onClick={() => void save()}>{busy === "saving" ? t("common.saving") : t("common.save")}</Button>
          </div>
        </div>
        {conflictNotice}
        <SettingsSectionShell title={selectedProvider.displayName}>
          <SettingsCard>
            <SettingsListRow
              title={<span className="flex items-center gap-2"><ProviderMark icon={selectedProvider.icon} label={selectedProvider.displayName} />{selectedProvider.displayName}</span>}
              description={t("settings.webSearch.providerRequestsMayCost")}
            />
            {selectedProvider.fields.map((field) => {
              const value = draft.fields[field.configKey] ?? "";
              const secret = field.kind === "secret";
              const visible = visibleSecrets.has(field.configKey);
              return (
                <SettingsRow
                  key={field.configKey}
                  title={field.qualifier ? `${field.qualifier} · ${field.configKey}` : field.configKey}
                  description={field.environmentVariable ? t("settings.webSearch.fieldEnv", { env: field.environmentVariable }) : t("settings.webSearch.fieldFile")}
                  status={field.invalidStoredValue ? <span className="text-destructive">{t("settings.webSearch.invalidStoredValue")}</span> : null}
                >
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label={field.configKey}
                      type={secret && !visible ? "password" : "text"}
                      value={value}
                      spellCheck={false}
                      autoComplete="off"
                      className="min-w-0 flex-1 font-mono text-xs"
                      placeholder={field.required ? t("settings.webSearch.requiredValue") : t("settings.webSearch.optionalValue")}
                      onChange={(event) => setDraft((current) => current ? { ...current, fields: { ...current.fields, [field.configKey]: event.target.value } } : current)}
                    />
                    <div className="flex gap-1.5">
                      {secret ? <Button size="xs" variant="outline" aria-label={visible ? t("settings.webSearch.hideKey") : t("settings.webSearch.showKey")} onClick={() => setVisibleSecrets((current) => { const next = new Set(current); if (next.has(field.configKey)) next.delete(field.configKey); else next.add(field.configKey); return next; })}><EyeIcon className="size-3.5" /></Button> : null}
                      <Button size="xs" variant="outline" aria-label={t("settings.webSearch.copyValue")} disabled={!value} onClick={() => void navigator.clipboard.writeText(value).then(() => toastManager.add({ type: "success", title: t("common.copied") }))}><CopyIcon className="size-3.5" /></Button>
                      <Button size="xs" variant="outline" disabled={!value} onClick={() => setDraft((current) => current ? { ...current, fields: { ...current.fields, [field.configKey]: null } } : current)}>{t("settings.webSearch.clear")}</Button>
                    </div>
                  </div>
                </SettingsRow>
              );
            })}
            {selectedProvider.advancedFileOnly.length > 0 ? (
              <SettingsRow title={t("settings.webSearch.advancedFileOnly")} description={selectedProvider.advancedFileOnly.join(", ")} control={<Button size="xs" variant="outline" onClick={() => void openConfig()}>{t("settings.webSearch.openConfig")}</Button>} />
            ) : null}
          </SettingsCard>
        </SettingsSectionShell>
        <SettingsSection title={t("settings.webSearch.testSection")}>
          <SettingsRow
            title={t("settings.webSearch.testCurrentDraft")}
            description={t("settings.webSearch.testDraftDescription")}
            status={probe && probeProvider === null ? t(`settings.webSearch.probe.${probe.state}` as const) : null}
            control={<Button size="xs" variant="outline" disabled={Boolean(probeProvider)} onClick={() => void runProviderTest(selectedProvider.id)}>{testingThis ? t("settings.webSearch.testing") : t("settings.webSearch.test")}</Button>}
          />
          {selectedProvider.id === "gemini" ? (
            <SettingsRow
              title={t("settings.webSearch.geminiAccount")}
              description={t("settings.webSearch.geminiAccountDescription")}
              status={geminiDiagnostic ? geminiDiagnostic.state === "available" ? [geminiDiagnostic.browser, geminiDiagnostic.profile, geminiDiagnostic.account].filter(Boolean).join(" · ") : t("settings.webSearch.geminiUnavailable") : null}
              control={<Button size="xs" variant="outline" onClick={() => void ensureNativeApi().omnimindWebSearch.diagnoseGemini({ draft: mutationDraft(draft) }).then(setGeminiDiagnostic)}>{t("settings.webSearch.inspectAccount")}</Button>}
            />
          ) : null}
        </SettingsSection>
      </div>
    );
  }

  const configuredProviders = base.providers.filter((provider) => provider.configured);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">OmniMind Web Access</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("settings.webSearch.capabilityDescription")}
        </p>
      </div>
      {conflictNotice}
      <SettingsSection title={t("settings.webSearch.defaults")}>
        <SettingsRow
          title={t("settings.webSearch.routing")}
          description={t("settings.webSearch.routingDescription")}
          control={
            <Select value={providerSelectionValue(draft.provider)} onValueChange={(value) => value && value !== "__selected_parallel__" && setDraft((current) => current ? { ...current, provider: value } : current)}>
              <SelectTrigger size="sm" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SettingsSelectPopup>
                {Array.isArray(draft.provider) ? <SelectItem value="__selected_parallel__">{t("settings.webSearch.selectedParallel")}</SelectItem> : null}
                <SelectItem value="auto">{t("settings.webSearch.routeAuto")}</SelectItem>
                <SelectItem value="all">{t("settings.webSearch.routeAll")}</SelectItem>
                {base.providers.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.displayName}</SelectItem>)}
              </SettingsSelectPopup>
            </Select>
          }
        />
        <SettingsRow
          title={t("settings.webSearch.workflow")}
          description={t("settings.webSearch.workflowDescription")}
          control={
            <Select value={draft.workflow} onValueChange={(value) => value && workflowOptions.includes(value as OmniMindWebSearchWorkflow) && setDraft((current) => current ? { ...current, workflow: value as OmniMindWebSearchWorkflow } : current)}>
              <SelectTrigger size="sm" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SettingsSelectPopup>{workflowOptions.map((workflow) => <SelectItem key={workflow} value={workflow}>{t(`settings.webSearch.workflow.${workflow}` as const)}</SelectItem>)}</SettingsSelectPopup>
            </Select>
          }
        />
        <SettingsRow
          title={t("settings.webSearch.autoShowSearchProcess")}
          description={t("settings.webSearch.autoShowSearchProcessDescription")}
          control={
            <Switch
              checked={draft.autoShowSearchProcess}
              aria-label={t("settings.webSearch.autoShowSearchProcess")}
              onCheckedChange={(checked) =>
                setDraft((current) => current
                  ? { ...current, autoShowSearchProcess: checked }
                  : current)
              }
            />
          }
        />
      </SettingsSection>

      <SettingsSectionShell
        title={t("settings.webSearch.providers")}
        action={<Button size="xs" variant="outline" onClick={() => setView({ kind: "add" })}><PlusIcon className="size-3.5" />{t("settings.webSearch.addProvider")}</Button>}
      >
        {configuredProviders.length > 0 ? (
          <SettingsCard>{configuredProviders.map((provider) => <SettingsListRow key={provider.id} title={<span className="flex items-center gap-2"><ProviderMark icon={provider.icon} label={provider.displayName} />{provider.displayName}</span>} description={t("settings.webSearch.configured")} actions={<Button size="xs" variant="outline" onClick={() => setView({ kind: "detail", providerId: provider.id })}>{t("common.edit")}</Button>} />)}</SettingsCard>
        ) : <SettingsEmptyState>{t("settings.webSearch.noConfiguredProviders")}</SettingsEmptyState>}
      </SettingsSectionShell>

      <SettingsSection title={t("settings.webSearch.statusAndFiles")}>
        <SettingsRow
          title={<span className="flex items-center gap-2"><WebSearchIcon className="size-4" />{t("settings.webSearch.searchCapability")}</span>}
          description={t("settings.webSearch.searchCapabilityDescription")}
          status={probe ? t(`settings.webSearch.probe.${probe.state}` as const) : t("settings.webSearch.possible")}
          control={<Button size="xs" variant="outline" disabled={Boolean(probeProvider)} onClick={() => void recheck()}>{probeProvider === "__route__" ? t("settings.webSearch.rechecking") : t("settings.webSearch.recheck")}</Button>}
        />
        <SettingsRow
          title={t("settings.webSearch.readCapability")}
          description={t("settings.webSearch.readCapabilityDescription")}
          status={t("settings.webSearch.readCapabilityStatus")}
        />
        <SettingsRow
          title={t("settings.webSearch.reviewCapability")}
          description={t("settings.webSearch.reviewCapabilityDescription")}
          status={t(`settings.webSearch.workflow.${draft.workflow}` as const)}
        />
        <SettingsRow title={t("settings.webSearch.configFile")} description={t("settings.webSearch.configFileDescription")} control={<Button size="xs" variant="outline" disabled={busy === "opening"} onClick={() => void openConfig()}>{t("settings.webSearch.openConfig")}</Button>} />
      </SettingsSection>

      <div className="flex justify-end gap-2">
        <Button size="xs" variant="outline" disabled={!dirty} onClick={() => setDraft(draftFrom(base))}>{t("common.cancel")}</Button>
        <Button size="xs" disabled={!dirty || busy === "saving" || Boolean(conflict)} onClick={() => void save()}>{busy === "saving" ? t("common.saving") : t("common.save")}</Button>
      </div>
    </div>
  );
}

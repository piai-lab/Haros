import {
  ProjectId,
  type ExternalMcpCapability,
  type ExternalMcpCreateIntegrationResult,
} from "@omnimind/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { DisclosureChevron } from "~/components/ui/DisclosureChevron";
import { DisclosureRegion } from "~/components/ui/DisclosureRegion";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { toastManager } from "~/components/ui/toast";
import { copyTextToClipboard } from "~/hooks/useCopyToClipboard";
import { cn } from "~/lib/utils";
import { ensureNativeApi } from "~/nativeApi";
import {
  buildExternalMcpClientConfiguration,
  buildExternalMcpExamplePrompt,
  buildExternalMcpSetupPrompt,
  externalMcpSetupAction,
} from "./externalMcpSetup";
import { SettingsListRow, SettingsRow, SettingsSection } from "./SettingsPanelPrimitives";
import { useI18n } from "~/i18n";

const INTEGRATIONS_QUERY_KEY = ["server", "externalMcpIntegrations"] as const;
const PROJECTS_QUERY_KEY = ["orchestration", "externalMcpProjects"] as const;
const CORE_CAPABILITIES: ReadonlyArray<ExternalMcpCapability> = [
  "projects:read",
  "tasks:create",
  "tasks:wait",
  "tasks:read",
];

function dateMillis(value: string): number {
  return Date.parse(value);
}

function formatDate(value: string | null, locale: "en" | "zh-CN", never: string): string {
  if (!value) return never;
  const milliseconds = dateMillis(value);
  return Number.isNaN(milliseconds) ? String(value) : new Date(milliseconds).toLocaleString(locale);
}

function copyWithToast(
  value: string,
  title: string,
  failureTitle: string,
  failureDescription: string,
): void {
  void copyTextToClipboard(value).then(
    () => toastManager.add({ type: "success", title }),
    (error: unknown) =>
      toastManager.add({
        type: "error",
        title: failureTitle,
        description: error instanceof Error ? error.message : failureDescription,
      }),
  );
}

export function ExternalMcpSettingsPanel(props: { active: boolean }) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const connectionName = name.trim() || t("settings.codingAgent");
  const [allProjects, setAllProjects] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<ReadonlySet<string>>(new Set());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [allowProjectRead, setAllowProjectRead] = useState(false);
  const [allowLocal, setAllowLocal] = useState(false);
  const [allowFullAccess, setAllowFullAccess] = useState(false);
  const [setup, setSetup] = useState<ExternalMcpCreateIntegrationResult | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!props.active) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [props.active]);

  const integrationsQuery = useQuery({
    queryKey: INTEGRATIONS_QUERY_KEY,
    queryFn: () => ensureNativeApi().server.listExternalMcpIntegrations(),
    enabled: props.active,
    staleTime: 5_000,
    refetchInterval: setup ? 2_000 : false,
  });
  const projectsQuery = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => ensureNativeApi().orchestration.getShellSnapshot(),
    enabled: props.active,
    staleTime: 5_000,
  });
  const capabilities = useMemo(() => {
    const next = [...CORE_CAPABILITIES];
    if (allowProjectRead) next.push("tasks:read-project");
    if (allowLocal) next.push("runtime:local");
    if (allowFullAccess) next.push("runtime:full-access");
    return next;
  }, [allowFullAccess, allowLocal, allowProjectRead]);

  const createMutation = useMutation({
    mutationFn: () =>
      ensureNativeApi().server.createExternalMcpIntegration({
        name: connectionName,
        projectScope: allProjects ? "all" : "selected",
        ...(allProjects
          ? {}
          : {
              projectIds: [...selectedProjects].map((projectId) => ProjectId.makeUnsafe(projectId)),
            }),
        capabilities,
        expiresInDays: 30,
      }),
    onSuccess: (result) => {
      setManualOpen(false);
      setSetup(result);
      void queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
      toastManager.add({
        type: "success",
        title: t("settings.connectionReady"),
        description: t("settings.connectionReadyDescription"),
      });
    },
    onError: (error: unknown) =>
      toastManager.add({
        type: "error",
        title: t("settings.connectionCreateFailed"),
        description: error instanceof Error ? error.message : t("settings.connectionCreateUnknown"),
      }),
  });

  const revokeMutation = useMutation({
    mutationFn: (integrationId: string) =>
      ensureNativeApi().server.revokeExternalMcpIntegration({ integrationId }),
    onSuccess: (_result, integrationId) => {
      setManualOpen(false);
      setSetup((current) =>
        current?.integration.integrationId === integrationId ? null : current,
      );
      void queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
      toastManager.add({
        type: "success",
        title: t("settings.connectionRevoked"),
        description: t("settings.connectionRevokedDescription"),
      });
    },
    onError: (error: unknown) =>
      toastManager.add({
        type: "error",
        title: t("settings.connectionRevokeFailed"),
        description: error instanceof Error ? error.message : t("settings.connectionRevokeUnknown"),
      }),
  });

  const refreshPairingMutation = useMutation({
    mutationFn: (integrationId: string) =>
      ensureNativeApi().server.refreshExternalMcpPairing({ integrationId }),
    onSuccess: (result) => {
      setSetup(result);
      void queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
      toastManager.add({
        type: "success",
        title: t("settings.pairingCodeReady"),
        description: t("settings.pairingCodeReadyDescription"),
      });
    },
    onError: (error: unknown) =>
      toastManager.add({
        type: "error",
        title: t("settings.pairingResumeFailed"),
        description: error instanceof Error ? error.message : t("settings.pairingResumeUnknown"),
      }),
  });

  const continuePairedSetup = (integration: NonNullable<typeof integrationsQuery.data>[number]) => {
    setManualOpen(false);
    setSetup({
      integration,
      pairingCode: "already-paired",
      pairingExpiresAt: integration.createdAt,
      setupCommand: "Pairing already completed",
      stdio: integration.stdio,
    });
  };

  const closeSetup = () => {
    setManualOpen(false);
    setSetup(null);
  };

  const setupIntegration = setup
    ? (integrationsQuery.data?.find(
        (integration) => integration.integrationId === setup.integration.integrationId,
      ) ?? setup.integration)
    : null;

  if (!props.active) return null;

  const projects = projectsQuery.data?.projects ?? [];
  const canCreate = (allProjects || selectedProjects.size > 0) && !createMutation.isPending;
  const paired = setupIntegration?.pairedAt != null;
  const connected = paired && setupIntegration?.lastUsedAt != null;
  const revoked = setupIntegration?.revokedAt != null;
  const integrationExpired = setupIntegration
    ? dateMillis(setupIntegration.expiresAt) <= nowMs
    : false;
  const pairingExpired = setup ? dateMillis(setup.pairingExpiresAt) <= nowMs : false;
  const setupUnavailable = revoked || integrationExpired || (!paired && pairingExpired);
  const setupAction = externalMcpSetupAction({
    revoked,
    integrationExpired,
    paired,
    pairingExpired,
  });
  const setupStatus = revoked
    ? t("settings.statusRevoked")
    : integrationExpired
      ? t("settings.statusExpired")
      : connected
        ? t("settings.statusConnected")
        : paired
          ? t("settings.statusPairedWaiting")
          : pairingExpired
            ? t("settings.statusPairingExpired")
            : t("settings.statusWaitingPairing");
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  const setupPrompt = setup
    ? buildExternalMcpSetupPrompt({
        setupCommand: paired ? null : setup.setupCommand,
        stdio: setup.stdio,
        platform,
      })
    : null;
  const manualConfiguration = setup
    ? buildExternalMcpClientConfiguration("other", setup.stdio, platform)
    : null;
  const examplePrompt = setup
    ? buildExternalMcpExamplePrompt(
        setup.integration.projectScope === "all"
          ? null
          : (setup.integration.allowedProjects[0]?.title ?? null),
      )
    : null;

  return (
    <div className="space-y-6">
      {!setup ? (
        <SettingsSection title={t("settings.connectCodingAgent")}>
          <SettingsRow
            title={t("settings.connectionName")}
            description={t("settings.connectionNameDescription")}
            control={
              <Input
                className="w-full sm:w-64"
                value={name}
                maxLength={120}
                placeholder={t("settings.codingAgent")}
                onChange={(event) => setName(event.target.value)}
              />
            }
          />
          <SettingsRow
            title={t("settings.accessAllOmniMind")}
            description={t("settings.accessAllOmniMindDescription")}
            control={<Switch checked={allProjects} onCheckedChange={setAllProjects} />}
          >
            <DisclosureRegion open={!allProjects} contentClassName="mt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {projects.map((project) => {
                  const checked = selectedProjects.has(project.id);
                  return (
                    <label
                      key={project.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs transition-colors",
                        checked ? "border-foreground/30 bg-muted/70" : "border-border/70",
                      )}
                    >
                      <span className="min-w-0 truncate">{project.title}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedProjects((current) => {
                            const next = new Set(current);
                            if (checked) next.delete(project.id);
                            else next.add(project.id);
                            return next;
                          })
                        }
                      />
                    </label>
                  );
                })}
                {projects.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {t("settings.noProjectsAvailable")}
                  </span>
                ) : null}
              </div>
            </DisclosureRegion>
          </SettingsRow>
          <SettingsRow
            title={t("settings.advancedPermissions")}
            description={t("settings.advancedPermissionsDescription")}
            control={
              <Button
                size="xs"
                variant="ghost"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                {t("settings.reviewAction")}
                <DisclosureChevron open={advancedOpen} className="ml-1 size-3.5" />
              </Button>
            }
          >
            <DisclosureRegion
              open={advancedOpen}
              contentClassName="mt-3 space-y-4 border-t border-border/70 pt-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium">{t("settings.readOtherProjectTasks")}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t("settings.readOtherProjectTasksDescription")}
                  </div>
                </div>
                <Switch checked={allowProjectRead} onCheckedChange={setAllowProjectRead} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium">{t("settings.useSharedCheckout")}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t("settings.useSharedCheckoutDescription")}
                  </div>
                </div>
                <Switch checked={allowLocal} onCheckedChange={setAllowLocal} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium">{t("settings.runWithoutApproval")}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t("settings.runWithoutApprovalDescription")}
                  </div>
                </div>
                <Switch checked={allowFullAccess} onCheckedChange={setAllowFullAccess} />
              </div>
            </DisclosureRegion>
          </SettingsRow>
          <SettingsRow
            title={t("settings.createConnection")}
            description={t("settings.createConnectionDescription")}
            control={
              <Button size="sm" disabled={!canCreate} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? t("settings.creating") : t("settings.createConnection")}
              </Button>
            }
          />
        </SettingsSection>
      ) : null}

      {setup && setupIntegration && setupPrompt && manualConfiguration && examplePrompt ? (
        <SettingsSection title={t("settings.connectNamedAgent", { agent: setupIntegration.name })}>
          <SettingsRow
            title={
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    setupUnavailable
                      ? "bg-destructive"
                      : connected
                        ? "bg-green-500"
                        : "bg-amber-500",
                  )}
                />
                {setupStatus}
              </span>
            }
            description={
              revoked
                ? t("settings.revokedDescription")
                : integrationExpired
                  ? t("settings.expiredDescription")
                  : connected
                    ? t("settings.connectedDescription")
                    : paired
                      ? t("settings.pairedDescription")
                      : pairingExpired
                        ? t("settings.pairingExpiredDescription")
                        : t("settings.waitingPairingDescription")
            }
            status={
              connected
                ? t("settings.lastConnected", {
                    time: formatDate(setupIntegration.lastUsedAt, locale, t("settings.never")),
                  })
                : t("settings.connectionExpires", {
                    time: formatDate(setupIntegration.expiresAt, locale, t("settings.never")),
                  })
            }
            control={
              setupAction === "revoke" ? (
                <Button
                  size="xs"
                  variant="destructive-outline"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(setupIntegration.integrationId)}
                >
                  {t("settings.revokeAndRestart")}
                </Button>
              ) : setupAction === "resume-pairing" ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={refreshPairingMutation.isPending}
                    onClick={() => refreshPairingMutation.mutate(setupIntegration.integrationId)}
                  >
                    {refreshPairingMutation.isPending
                      ? t("settings.resuming")
                      : t("settings.resumePairing")}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={closeSetup}>
                    {t("common.back")}
                  </Button>
                </div>
              ) : setupAction === "done" ? (
                <Button size="xs" variant="ghost" onClick={closeSetup}>
                  {t("settings.done")}
                </Button>
              ) : null
            }
          />
          <SettingsRow
            title={t("settings.setupPromptStep")}
            description={t("settings.setupPromptStepDescription")}
            status={
              paired
                ? t("settings.pairedPromptDescription")
                : t("settings.pairingCodeExpires", {
                    time: formatDate(setup.pairingExpiresAt, locale, t("settings.never")),
                  })
            }
            control={
              <Button
                size="xs"
                variant="outline"
                disabled={setupUnavailable}
                onClick={() =>
                  copyWithToast(
                    setupPrompt,
                    t("settings.setupPromptCopied"),
                    t("settings.copyFailed"),
                    t("settings.clipboardFailed"),
                  )
                }
              >
                {t("settings.copySetupPrompt")}
              </Button>
            }
          >
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
              {setupPrompt}
            </pre>
          </SettingsRow>
          <SettingsRow
            title={t("settings.manualSetup")}
            description={t("settings.manualSetupDescription")}
            control={
              <Button
                size="xs"
                variant="ghost"
                aria-expanded={manualOpen}
                onClick={() => setManualOpen((current) => !current)}
              >
                {t("settings.show")}
                <DisclosureChevron open={manualOpen} className="ml-1 size-3.5" />
              </Button>
            }
          >
            <DisclosureRegion
              open={manualOpen}
              contentClassName="mt-3 space-y-3 border-t border-border/70 pt-3"
            >
              {!paired ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium">{t("settings.pairingCommand")}</span>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={setupUnavailable}
                      onClick={() =>
                        copyWithToast(
                          setup.setupCommand,
                          t("settings.pairingCommandCopied"),
                          t("settings.copyFailed"),
                          t("settings.clipboardFailed"),
                        )
                      }
                    >
                      {t("settings.copy")}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
                    {setup.setupCommand}
                  </pre>
                </div>
              ) : null}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium">{t("settings.mcpConfiguration")}</span>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={revoked || integrationExpired}
                    onClick={() =>
                      copyWithToast(
                        manualConfiguration.value,
                        t("settings.configurationCopied"),
                        t("settings.copyFailed"),
                        t("settings.clipboardFailed"),
                      )
                    }
                  >
                    {t("settings.copy")}
                  </Button>
                </div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
                  {manualConfiguration.value}
                </pre>
              </div>
            </DisclosureRegion>
          </SettingsRow>
          <SettingsRow
            title={t("settings.tryConnectionStep")}
            description={t("settings.tryConnectionStepDescription")}
            status={
              connected ? t("settings.connectionVerified") : t("settings.connectionPendingFirstUse")
            }
            control={
              <Button
                size="xs"
                variant="outline"
                disabled={!paired || revoked || integrationExpired}
                onClick={() =>
                  copyWithToast(
                    examplePrompt,
                    t("settings.examplePromptCopied"),
                    t("settings.copyFailed"),
                    t("settings.clipboardFailed"),
                  )
                }
              >
                {t("settings.copyExamplePrompt")}
              </Button>
            }
          >
            {paired ? (
              <div className="mt-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                {examplePrompt}
              </div>
            ) : null}
          </SettingsRow>
        </SettingsSection>
      ) : null}

      <SettingsSection title={t("settings.connectedAgents")}>
        {integrationsQuery.isLoading ? (
          <SettingsListRow title={t("settings.loadingConnections")} />
        ) : integrationsQuery.data?.length ? (
          integrationsQuery.data.map((integration) => {
            const active =
              integration.revokedAt === null && dateMillis(integration.expiresAt) > nowMs;
            const status = active
              ? integration.lastUsedAt
                ? t("settings.statusConnected")
                : integration.pairedAt
                  ? t("settings.statusPairedUnused")
                  : t("settings.statusWaitingPairing")
              : integration.revokedAt
                ? t("settings.statusRevoked")
                : t("settings.statusExpired");
            const projectsDescription =
              integration.projectScope === "all"
                ? t("settings.allProjects")
                : integration.allowedProjects.length > 0
                  ? integration.allowedProjects.map((project) => project.title).join(", ")
                  : t("settings.noProjects");
            const permissionsDescription = [
              t("settings.permissionOwnTasks"),
              ...(integration.capabilities.includes("tasks:read-project")
                ? [t("settings.permissionReadProject")]
                : []),
              ...(integration.capabilities.includes("runtime:local")
                ? [t("settings.useSharedCheckout")]
                : []),
              ...(integration.capabilities.includes("runtime:full-access")
                ? [t("settings.runWithoutApproval")]
                : []),
            ].join(" · ");
            return (
              <SettingsListRow
                key={integration.integrationId}
                align="start"
                title={integration.name}
                description={
                  <div className="space-y-1">
                    <div>{status}</div>
                    <div>{t("settings.projectsLabel", { projects: projectsDescription })}</div>
                    <div>
                      {t("settings.permissionsLabel", { permissions: permissionsDescription })}
                    </div>
                    <div>
                      {t("settings.connectionDates", {
                        created: formatDate(integration.createdAt, locale, t("settings.never")),
                        lastUsed: formatDate(integration.lastUsedAt, locale, t("settings.never")),
                        expires: formatDate(integration.expiresAt, locale, t("settings.never")),
                      })}
                    </div>
                  </div>
                }
                actions={
                  active ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={refreshPairingMutation.isPending}
                        onClick={() => {
                          if (integration.pairedAt) continuePairedSetup(integration);
                          else refreshPairingMutation.mutate(integration.integrationId);
                        }}
                      >
                        {integration.pairedAt
                          ? t("settings.continueSetup")
                          : t("settings.resumePairing")}
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive-outline"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(integration.integrationId)}
                      >
                        {t("settings.revoke")}
                      </Button>
                    </div>
                  ) : null
                }
              />
            );
          })
        ) : (
          <SettingsListRow
            title={t("settings.noConnectedAgents")}
            description={t("settings.noConnectedAgentsDescription")}
          />
        )}
      </SettingsSection>
    </div>
  );
}

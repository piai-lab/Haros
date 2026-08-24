// FILE: PluginLibrary.tsx
// Purpose: Hosts the plugin and skill browser surfaced from provider discovery APIs.
// Layer: Route-level screen
// Exports: PluginLibrary

import {
  PROVIDER_DISPLAY_NAMES,
  type ThreadId,
  WS_OMNIMIND_ECOSYSTEM_CAPABILITY,
  type OmniMindPackageDescriptor,
  type OmniMindPackageResourceDescriptor,
  type ProviderKind,
  type ProviderPluginDescriptor,
  type ProviderSkillDescriptor,
} from "@omnimind/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, {
  useMemo,
  type ReactNode,
  useDeferredValue,
  useState,
  useSyncExternalStore,
} from "react";
import type { IconType } from "react-icons";
import {
  SiCanva,
  SiFigma,
  SiGithub,
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiHuggingface,
  SiLinear,
  SiNotion,
  SiSlack,
  SiStripe,
  SiVercel,
} from "react-icons/si";
import { PROVIDER_ICON_COMPONENT_BY_PROVIDER } from "./ProviderIcon";
import { useStore } from "~/store";
import { DEFAULT_PROVIDER_ORDER } from "~/providerOrdering";
import {
  buildPluginSearchFields,
  buildSkillSearchFields,
  formatSkillScope,
  isInstalledProviderPlugin,
  normalizeProviderDiscoveryText,
  rankProviderDiscoveryItems,
  resolveProviderDiscoveryCwd,
} from "~/lib/providerDiscovery";
import {
  createFirstProjectSelector,
  createProjectSelector,
  createThreadSelector,
} from "~/storeSelectors";
import {
  isProviderDiscoverySessionActive,
  providerComposerCapabilitiesQueryOptions,
  providerDiscoveryQueryKeys,
  providerPluginsQueryOptions,
  providerSkillsQueryOptions,
  supportsPluginDiscovery,
  supportsSkillDiscovery,
} from "~/lib/providerDiscoveryReactQuery";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { useFocusedChatContext } from "~/focusedChatContext";
import {
  CheckIcon,
  CircleAlertIcon,
  HammerIcon,
  ListChecksIcon,
  PluginIcon,
  SearchIcon,
} from "~/lib/icons";
import { cn } from "~/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "./ui/input-group";
import { SidebarInset } from "./ui/sidebar";
import { SidebarHeaderNavigationControls } from "./SidebarHeaderNavigationControls";
import {
  useDesktopTopBarTrafficLightGutterClassName,
  useDesktopTopBarWindowControlsGutterClassName,
} from "~/hooks/useDesktopTopBarGutter";
import { Skeleton } from "./ui/skeleton";
import { useI18n } from "~/i18n";
import {
  ensureNativeApi,
  onNativeApiServerCapabilitiesChange,
  readNativeApiServerCapabilityState,
} from "~/nativeApi";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────────

type DiscoveryTab = "plugins" | "skills" | "packages";
type ProviderCapabilities = { plugins: boolean; skills: boolean };
type PluginEntry = {
  marketplaceName: string;
  marketplacePath: string;
  plugin: ProviderPluginDescriptor;
  isFeatured: boolean;
};
type PluginBrandArtwork = {
  color: string;
  icon: IconType;
};
type PackageMutation =
  | { type: "install"; source: string }
  | { type: "update"; packageId: string }
  | { type: "remove"; packageId: string }
  | { type: "toggle"; resource: OmniMindPackageResourceDescriptor; enabled: boolean }
  | { type: "reload"; threadId: ThreadId };
type PackageReloadState = "reloaded" | "no_active_session" | "different_engine" | "busy";

// ── Constants ──────────────────────────────────────────────────────────────

const PROVIDER_ICON: Record<ProviderKind, React.FC<React.SVGProps<SVGSVGElement>>> = {
  ...PROVIDER_ICON_COMPONENT_BY_PROVIDER,
  codex: HammerIcon,
};
const KNOWN_PLUGIN_BRANDS: Record<string, PluginBrandArtwork> = {
  canva: { icon: SiCanva, color: "#00C4CC" },
  figma: { icon: SiFigma, color: "#F24E1E" },
  github: { icon: SiGithub, color: "#181717" },
  gmail: { icon: SiGmail, color: "#EA4335" },
  googlecalendar: { icon: SiGooglecalendar, color: "#4285F4" },
  googledrive: { icon: SiGoogledrive, color: "#0F9D58" },
  huggingface: { icon: SiHuggingface, color: "#FF9D00" },
  linear: { icon: SiLinear, color: "#5E6AD2" },
  notion: { icon: SiNotion, color: "#111111" },
  slack: { icon: SiSlack, color: "#4A154B" },
  stripe: { icon: SiStripe, color: "#635BFF" },
  vercel: { icon: SiVercel, color: "#111111" },
};
const ecosystemQueryKey = ["omnimind-ecosystem"] as const;

function subscribeToEcosystemCapability(listener: () => void): () => void {
  return onNativeApiServerCapabilitiesChange(listener);
}

function readEcosystemCapability(): boolean {
  return readNativeApiServerCapabilityState(WS_OMNIMIND_ECOSYSTEM_CAPABILITY) === true;
}

function readServerEcosystemCapability(): boolean {
  return false;
}

// ── Utilities ──────────────────────────────────────────────────────────────

function pluginEntryKey(entry: Pick<PluginEntry, "marketplacePath" | "plugin">): string {
  return `${entry.marketplacePath}::${entry.plugin.name}`;
}

function sectionTitle(value: string, fallback: string): string {
  const n = value.trim();
  return n.length === 0 ? fallback : n;
}

function resolvePluginAccent(plugin: ProviderPluginDescriptor): string | undefined {
  return plugin.interface?.brandColor?.trim() || undefined;
}

function normalizeBrandKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function resolvePluginLogo(plugin: ProviderPluginDescriptor): string | undefined {
  return plugin.interface?.logo?.trim() || undefined;
}

function resolvePluginBrand(plugin: ProviderPluginDescriptor): PluginBrandArtwork | undefined {
  const candidates = [
    plugin.interface?.composerIcon,
    plugin.interface?.displayName,
    plugin.name,
  ].map(normalizeBrandKey);

  for (const candidate of candidates) {
    if (!candidate) continue;
    const knownBrand = KNOWN_PLUGIN_BRANDS[candidate];
    if (knownBrand) return knownBrand;
  }

  return undefined;
}

/** Stable hue 0–359 from a string, for consistent per-item icon colors. */
function nameToHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
}

// ── Icon glyphs ────────────────────────────────────────────────────────────

function PluginGlyph({ plugin }: { plugin: ProviderPluginDescriptor }) {
  const accent = resolvePluginAccent(plugin);
  const logo = resolvePluginLogo(plugin);
  const brand = resolvePluginBrand(plugin);
  const hue = nameToHue(plugin.interface?.displayName ?? plugin.name);
  const [logoFailed, setLogoFailed] = useState(false);
  const style = accent
    ? {
        background: `linear-gradient(145deg, ${accent}cc, ${accent}77)`,
        boxShadow: `0 0 0 0.5px ${accent}35`,
      }
    : {
        background: `linear-gradient(145deg, hsl(${hue} 55% 30%), hsl(${hue} 45% 18%))`,
        boxShadow: `0 0 0 0.5px hsl(${hue} 40% 30% / 0.35)`,
      };

  // Prefer metadata-provided artwork so marketplace plugins keep their own branding.
  if (logo && !logoFailed) {
    return (
      <span
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border/60 bg-background"
        style={accent ? { boxShadow: `0 0 0 0.5px ${accent}25` } : undefined}
      >
        <img
          src={logo}
          alt=""
          className="size-6 object-contain"
          loading="lazy"
          onError={() => setLogoFailed(true)}
        />
      </span>
    );
  }

  if (brand) {
    const BrandIcon = brand.icon;
    return (
      <span
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border/60 bg-background"
        style={accent ? { boxShadow: `0 0 0 0.5px ${accent}25` } : undefined}
      >
        <BrandIcon className="size-5" style={{ color: brand.color }} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px]"
      style={style}
    >
      <PluginIcon className="size-5 text-white/80" />
    </span>
  );
}

function SkillGlyph({ skill }: { skill: ProviderSkillDescriptor }) {
  const hue = nameToHue(skill.interface?.displayName ?? skill.name);
  return (
    <span
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px]"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 55% 30%), hsl(${hue} 45% 18%))`,
        boxShadow: `0 0 0 0.5px hsl(${hue} 40% 30% / 0.35)`,
      }}
    >
      <ListChecksIcon className="size-5 text-white/80" />
    </span>
  );
}

// ── UI controls ────────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center border-b-2 px-1 text-[13px] font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground/80",
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ProviderToggleButton({
  label,
  active,
  disabled,
  onClick,
  provider,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  provider: ProviderKind;
}) {
  const Icon = PROVIDER_ICON[provider] ?? HammerIcon;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-[var(--color-text-foreground)] text-[var(--color-background-surface)] shadow-xs"
          : "text-muted-foreground hover:bg-[var(--sidebar-accent)] hover:text-foreground",
        disabled && "pointer-events-none opacity-35",
      )}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 px-5 py-6 text-center">
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function InlineWarning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/6 px-3 py-2.5 text-xs text-muted-foreground">
      <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
      <div>{children}</div>
    </div>
  );
}

function InstalledStatus({ installed }: { installed: boolean }) {
  if (!installed) return null;
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/40 text-muted-foreground/60">
      <CheckIcon className="size-3.5" />
    </span>
  );
}

// ── Grid items ─────────────────────────────────────────────────────────────

function PluginGridItem({ entry }: { entry: PluginEntry }) {
  const description =
    entry.plugin.interface?.shortDescription ??
    entry.plugin.interface?.longDescription ??
    entry.plugin.source.path;

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--sidebar-accent)]">
      <PluginGlyph plugin={entry.plugin} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug text-foreground">
          {entry.plugin.interface?.displayName ?? entry.plugin.name}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{description}</p>
      </div>
      <InstalledStatus installed={isInstalledProviderPlugin(entry.plugin)} />
    </div>
  );
}

function localizedSkillScope(
  scope: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const normalized = scope?.trim().toLowerCase();
  if (!normalized || normalized === "personal") return t("library.scopePersonal");
  if (normalized === "user") return t("library.scopeUser");
  if (normalized === "project") return t("library.scopeProject");
  if (normalized === "local") return t("library.scopeLocal");
  if (normalized === "managed") return t("library.scopeManaged");
  return formatSkillScope(scope);
}

function skillSourceLabel(
  skill: ProviderSkillDescriptor,
  providerLabel: string,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const segments = new Set(skill.path.split(/[\\/]+/));
  if (skill.scope === "omnimind" || segments.has(".omnimind")) {
    return t("library.omnimindLibrary");
  }
  if (skill.scope === "agents") {
    return t("library.compatibleSharedAsset");
  }
  return t("library.nativeSource", {
    provider: providerLabel,
    scope: localizedSkillScope(skill.scope, t),
  });
}

function SkillGridItem({
  skill,
  providerLabel,
}: {
  skill: ProviderSkillDescriptor;
  providerLabel: string;
}) {
  const { t } = useI18n();
  const description =
    skill.interface?.shortDescription ?? skill.description ?? t("library.noDescription");

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--sidebar-accent)]">
      <SkillGlyph skill={skill} />
      <div className="min-w-0 flex-1" title={skill.path}>
        <p className="text-[13px] font-semibold leading-snug text-foreground">
          {skill.interface?.displayName ?? skill.name}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{description}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
          {skillSourceLabel(skill, providerLabel, t)}
        </p>
      </div>
      <InstalledStatus installed={skill.enabled} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="px-3 pb-1 pt-2 text-[15px] font-semibold text-foreground">{title}</h2>;
}

function PackageRow({
  item,
  busy,
  onManage,
  onRemove,
  onUpdate,
}: {
  item: OmniMindPackageDescriptor;
  busy: boolean;
  onManage: () => void;
  onRemove: () => void;
  onUpdate: () => void;
}) {
  const { t } = useI18n();
  const canAct = item.manageable && item.installed;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/55 bg-background/45 px-3 py-3">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-foreground/[0.06]">
        <PluginIcon className="size-5 text-foreground/70" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{item.displayName}</p>
          {item.updateAvailable ? (
            <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
              {t("library.updateAvailable")}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {item.manageable ? item.kind.toUpperCase() : t("library.packageUnavailable")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={!canAct || busy} onClick={onManage}>
          {t("library.manageResources")}
        </Button>
        {item.updateAvailable ? (
          <Button variant="outline" size="sm" disabled={!canAct || busy} onClick={onUpdate}>
            {t("library.update")}
          </Button>
        ) : null}
        <Button
          variant="destructive-outline"
          size="sm"
          disabled={!canAct || busy}
          onClick={onRemove}
        >
          {t("common.remove")}
        </Button>
      </div>
    </div>
  );
}

function PackageResourceDialog({
  busy,
  error,
  loading,
  open,
  packageName,
  resources,
  onOpenChange,
  onToggle,
}: {
  busy: boolean;
  error: boolean;
  loading: boolean;
  open: boolean;
  packageName: string;
  resources: readonly OmniMindPackageResourceDescriptor[];
  onOpenChange: (open: boolean) => void;
  onToggle: (resource: OmniMindPackageResourceDescriptor, enabled: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("library.packageResources")}</DialogTitle>
          <DialogDescription>{packageName}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-2">
          {loading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : error ? (
            <InlineWarning>{t("library.packageResourcesFailed")}</InlineWarning>
          ) : resources.length === 0 ? (
            <EmptyPanel
              title={t("library.packageResources")}
              description={t("library.noPackageResources")}
            />
          ) : (
            resources.map((resource) => (
              <label
                key={`${resource.resourceType}:${resource.resourcePath}`}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/55 px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={resource.enabled}
                  disabled={busy}
                  onChange={(event) => onToggle(resource, event.currentTarget.checked)}
                  className="size-4 accent-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-foreground">
                    {t(`library.resourceType.${resource.resourceType}`)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {resource.resourcePath}
                  </span>
                </span>
              </label>
            ))
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.done")}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function PluginLibrary({ sourceThreadId = null }: { sourceThreadId?: ThreadId | null }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const desktopTopBarTrafficLightGutterClassName = useDesktopTopBarTrafficLightGutterClassName();
  const desktopTopBarWindowControlsGutterClassName =
    useDesktopTopBarWindowControlsGutterClassName();
  const firstProject = useStore(useMemo(() => createFirstProjectSelector(), []));
  const { activeProject: focusedProject, activeThread, focusedThreadId } = useFocusedChatContext();
  const sourceThread = useStore(
    useMemo(() => createThreadSelector(sourceThreadId), [sourceThreadId]),
  );
  const sourceProject = useStore(
    useMemo(
      () => createProjectSelector(sourceThread?.projectId ?? null),
      [sourceThread?.projectId],
    ),
  );
  const contextThread = activeThread ?? sourceThread ?? null;
  const activeProject = focusedProject ?? sourceProject ?? firstProject ?? null;

  const preferredProvider = contextThread?.modelSelection.provider ?? "omnimind";

  const [selectedProvider, setSelectedProvider] = useState<ProviderKind>(preferredProvider);
  const [selectedTab, setSelectedTab] = useState<DiscoveryTab>("skills");
  const [pluginSearch, setPluginSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [packageSource, setPackageSource] = useState("");
  const [managedPackageId, setManagedPackageId] = useState<string | null>(null);
  const [pendingRemovalPackage, setPendingRemovalPackage] =
    useState<OmniMindPackageDescriptor | null>(null);
  const [packageError, setPackageError] = useState(false);
  const [packageReloadState, setPackageReloadState] = useState<PackageReloadState | null>(null);
  const deferredPluginSearch = useDeferredValue(pluginSearch);
  const deferredSkillSearch = useDeferredValue(skillSearch);
  const providerThreadId = focusedThreadId ?? sourceThreadId;
  const reloadThreadId =
    sourceThread?.session?.provider === "omnimind" &&
    sourceThread.session.status !== "closed" &&
    sourceThread.session.status !== "error"
      ? sourceThread.id
      : null;
  const ecosystemAvailable = useSyncExternalStore(
    subscribeToEcosystemCapability,
    readEcosystemCapability,
    readServerEcosystemCapability,
  );

  const ecosystemQuery = useQuery({
    queryKey: ecosystemQueryKey,
    enabled: selectedTab === "packages" && ecosystemAvailable,
    queryFn: () => ensureNativeApi().omnimindEcosystem.list(),
  });
  const resourcesQuery = useQuery({
    queryKey: [...ecosystemQueryKey, "resources", managedPackageId],
    enabled: managedPackageId !== null && ecosystemAvailable,
    queryFn: () =>
      ensureNativeApi().omnimindEcosystem.listResources({ packageId: managedPackageId! }),
  });
  const ecosystemMutation = useMutation({
    mutationFn: async (action: PackageMutation) => {
      const ecosystem = ensureNativeApi().omnimindEcosystem;
      switch (action.type) {
        case "install":
          return ecosystem.install({ source: action.source });
        case "update":
          return ecosystem.update({ packageId: action.packageId });
        case "remove":
          return ecosystem.remove({ packageId: action.packageId });
        case "toggle":
          return ecosystem.setResourceEnabled({
            packageId: action.resource.packageId,
            resourceType: action.resource.resourceType,
            resourcePath: action.resource.resourcePath,
            enabled: action.enabled,
          });
        case "reload":
          return ecosystem.reload({ threadId: action.threadId });
      }
    },
    onMutate: (action) => {
      setPackageError(false);
      if (action.type === "reload") setPackageReloadState(null);
    },
    onSuccess: async (result, action) => {
      if (action.type === "install") setPackageSource("");
      if (action.type === "remove") setPendingRemovalPackage(null);
      if (action.type === "reload" && "state" in result) {
        setPackageReloadState(result.state);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ecosystemQueryKey }),
        // An install/update/remove/filter/reload can change the global Extension
        // providers registered into passive OmniMind model discovery. Keep the
        // existing provider-prefix invalidation as the single refresh boundary.
        queryClient.invalidateQueries({
          queryKey: providerDiscoveryQueryKeys.modelsForProvider("omnimind"),
        }),
      ]);
    },
    onError: () => setPackageError(true),
  });

  const checkPackageUpdates = async () => {
    setPackageError(false);
    try {
      const snapshot = await ensureNativeApi().omnimindEcosystem.list({ checkUpdates: true });
      queryClient.setQueryData(ecosystemQueryKey, snapshot);
    } catch {
      setPackageError(true);
    }
  };

  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const omniMindCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("omnimind"));
  const codexCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("codex"));
  const claudeCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("claudeAgent"));
  const cursorCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("cursor"));
  const antigravityCapabilitiesQuery = useQuery(
    providerComposerCapabilitiesQueryOptions("antigravity"),
  );
  const grokCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("grok"));
  const droidCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("droid"));
  const kiloCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("kilo"));
  const openCodeCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("opencode"));
  const piCapabilitiesQuery = useQuery(providerComposerCapabilitiesQueryOptions("pi"));

  const providerCapabilities: Record<ProviderKind, ProviderCapabilities> = {
    omnimind: {
      plugins: supportsPluginDiscovery(omniMindCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(omniMindCapabilitiesQuery.data),
    },
    codex: {
      plugins: supportsPluginDiscovery(codexCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(codexCapabilitiesQuery.data),
    },
    claudeAgent: {
      plugins: supportsPluginDiscovery(claudeCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(claudeCapabilitiesQuery.data),
    },
    cursor: {
      plugins: supportsPluginDiscovery(cursorCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(cursorCapabilitiesQuery.data),
    },
    antigravity: {
      plugins: supportsPluginDiscovery(antigravityCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(antigravityCapabilitiesQuery.data),
    },
    grok: {
      plugins: supportsPluginDiscovery(grokCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(grokCapabilitiesQuery.data),
    },
    droid: {
      plugins: supportsPluginDiscovery(droidCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(droidCapabilitiesQuery.data),
    },
    kilo: {
      plugins: supportsPluginDiscovery(kiloCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(kiloCapabilitiesQuery.data),
    },
    opencode: {
      plugins: supportsPluginDiscovery(openCodeCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(openCodeCapabilitiesQuery.data),
    },
    pi: {
      plugins: supportsPluginDiscovery(piCapabilitiesQuery.data),
      skills: supportsSkillDiscovery(piCapabilitiesQuery.data),
    },
  };

  // Library discovery stays bound to the Engine the user selected. Unsupported
  // tabs render an accurate unavailable state instead of reading another Engine.
  const effectiveProvider = selectedProvider;
  const hasActiveProviderDiscoverySession = isProviderDiscoverySessionActive({
    provider: effectiveProvider,
    session: contextThread?.session,
  });

  const discoveryCwd = resolveProviderDiscoveryCwd({
    activeThreadWorktreePath: contextThread?.worktreePath ?? null,
    activeProjectCwd: activeProject?.cwd ?? null,
    serverCwd: serverConfigQuery.data?.cwd ?? null,
  });

  const providerLabel = PROVIDER_DISPLAY_NAMES[effectiveProvider];
  const canListPlugins = providerCapabilities[effectiveProvider].plugins;
  const canListSkills = providerCapabilities[effectiveProvider].skills;

  const pluginsQuery = useQuery(
    providerPluginsQueryOptions({
      provider: effectiveProvider,
      cwd: discoveryCwd,
      threadId: providerThreadId,
      enabled: selectedTab === "plugins" && canListPlugins,
    }),
  );

  const skillsQuery = useQuery(
    providerSkillsQueryOptions({
      provider: effectiveProvider,
      cwd: discoveryCwd,
      threadId: providerThreadId,
      activeSession: hasActiveProviderDiscoverySession,
      enabled: selectedTab === "skills" && canListSkills && discoveryCwd !== null,
    }),
  );

  const discoveredSkills = skillsQuery.data?.skills ?? [];

  const featuredPluginIds = new Set(pluginsQuery.data?.featuredPluginIds ?? []);
  const pluginEntries: PluginEntry[] = (pluginsQuery.data?.marketplaces ?? []).flatMap((m) =>
    m.plugins.map((plugin) => ({
      marketplaceName: m.name,
      marketplacePath: m.path,
      plugin,
      isFeatured: featuredPluginIds.has(plugin.id),
    })),
  );

  const installedPluginEntries = pluginEntries.filter((entry) =>
    isInstalledProviderPlugin(entry.plugin),
  );

  const pluginSearchQuery = normalizeProviderDiscoveryText(deferredPluginSearch);
  const filteredPluginEntries = pluginSearchQuery
    ? rankProviderDiscoveryItems(installedPluginEntries, pluginSearchQuery, (entry) =>
        buildPluginSearchFields(entry.plugin),
      )
    : installedPluginEntries;

  const marketplaceSectionsByPath = new Map<string, { title: string; entries: PluginEntry[] }>();
  for (const entry of filteredPluginEntries) {
    const existing = marketplaceSectionsByPath.get(entry.marketplacePath);
    if (existing) {
      existing.entries.push(entry);
    } else {
      marketplaceSectionsByPath.set(entry.marketplacePath, {
        title: sectionTitle(entry.marketplaceName, t("library.unknownSource")),
        entries: [entry],
      });
    }
  }
  const marketplaceSections = Array.from(marketplaceSectionsByPath.entries()).map(([key, v]) => ({
    key,
    title: v.title,
    entries: v.entries,
  }));

  const skillSearchQuery = normalizeProviderDiscoveryText(deferredSkillSearch);
  const filteredSkills = skillSearchQuery
    ? rankProviderDiscoveryItems(discoveredSkills, skillSearchQuery, buildSkillSearchFields)
    : discoveredSkills;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden isolate">
      <div className="flex h-full flex-col">
        {/* ── Top nav ───────────────────────────────────────────────────── */}
        <div
          className={cn(
            "drag-region flex shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6",
            desktopTopBarTrafficLightGutterClassName,
            desktopTopBarWindowControlsGutterClassName,
          )}
        >
          <SidebarHeaderNavigationControls />
          <div className="flex items-end gap-3">
            <TabButton
              label={t("library.plugins")}
              active={selectedTab === "plugins"}
              onClick={() => setSelectedTab("plugins")}
            />
            <TabButton
              label={t("library.skills")}
              active={selectedTab === "skills"}
              onClick={() => setSelectedTab("skills")}
            />
            {ecosystemAvailable ? (
              <TabButton
                label={t("library.packages")}
                active={selectedTab === "packages"}
                onClick={() => setSelectedTab("packages")}
              />
            ) : null}
          </div>
          <div className="flex-1" />
          <div
            className={cn(
              "inline-flex rounded-full border border-border/60 bg-background/60 p-0.5",
              selectedTab === "packages" && "invisible pointer-events-none",
            )}
          >
            {DEFAULT_PROVIDER_ORDER.map((provider) => {
              const capabilities = providerCapabilities[provider];
              const label = PROVIDER_DISPLAY_NAMES[provider];
              return (
                <ProviderToggleButton
                  key={provider}
                  label={label}
                  provider={provider}
                  active={effectiveProvider === provider}
                  disabled={!capabilities.plugins && !capabilities.skills}
                  onClick={() => {
                    setSelectedProvider(provider);
                    if (selectedTab === "plugins" && !capabilities.plugins && capabilities.skills) {
                      setSelectedTab("skills");
                    }
                    if (selectedTab === "skills" && !capabilities.skills && capabilities.plugins) {
                      setSelectedTab("plugins");
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="px-6 py-10 text-center">
            <h1 className="text-[28px] font-semibold text-foreground">
              {selectedTab === "packages"
                ? t("library.packageTitle")
                : t("library.title", { provider: providerLabel })}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedTab === "packages" ? t("library.packageSubtitle") : t("library.subtitle")}
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto max-w-2xl px-6 pb-6">
            <InputGroup className="rounded-xl bg-background/70 shadow-xs">
              <InputGroupAddon>
                <InputGroupText>
                  <SearchIcon className="size-4 text-muted-foreground/60" />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                value={
                  selectedTab === "plugins"
                    ? pluginSearch
                    : selectedTab === "skills"
                      ? skillSearch
                      : packageSource
                }
                onChange={(e) => {
                  if (selectedTab === "plugins") setPluginSearch(e.target.value);
                  else if (selectedTab === "skills") setSkillSearch(e.target.value);
                  else setPackageSource(e.target.value);
                }}
                placeholder={
                  selectedTab === "plugins"
                    ? t("library.searchPlugins")
                    : selectedTab === "skills"
                      ? t("library.searchSkills")
                      : t("library.packageSourcePlaceholder")
                }
                className="text-sm"
              />
            </InputGroup>
            {selectedTab === "packages" ? (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ecosystemMutation.isPending}
                  onClick={() => void checkPackageUpdates()}
                >
                  {t("library.checkUpdates")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ecosystemMutation.isPending || reloadThreadId === null}
                  title={
                    reloadThreadId === null ? t("library.reloadRequiresActiveTask") : undefined
                  }
                  onClick={() => {
                    if (reloadThreadId !== null) {
                      ecosystemMutation.mutate({ type: "reload", threadId: reloadThreadId });
                    }
                  }}
                >
                  {t("library.reloadActiveTaskResources")}
                </Button>
                <Button
                  size="sm"
                  disabled={packageSource.trim().length === 0 || ecosystemMutation.isPending}
                  onClick={() =>
                    ecosystemMutation.mutate({ type: "install", source: packageSource.trim() })
                  }
                >
                  {t("library.installPackage")}
                </Button>
              </div>
            ) : null}
          </div>

          {/* Warnings */}
          {((!discoveryCwd && selectedTab === "skills") ||
            (selectedTab === "skills" && (skillsQuery.data?.warnings?.length ?? 0) > 0) ||
            (selectedTab === "plugins" && !!pluginsQuery.data?.remoteSyncError) ||
            (selectedTab === "plugins" &&
              (pluginsQuery.data?.marketplaceLoadErrors.length ?? 0) > 0)) && (
            <div className="mx-auto max-w-2xl space-y-1.5 px-6 pb-4">
              {!discoveryCwd && selectedTab === "skills" ? (
                <InlineWarning>{t("library.workspaceRequired")}</InlineWarning>
              ) : null}
              {selectedTab === "skills"
                ? (skillsQuery.data?.warnings ?? []).map((warning) => (
                    <InlineWarning key={`${warning.source}:${warning.reason}`}>
                      {warning.source === "engine-native"
                        ? t("library.nativeDiscoveryFailed", { provider: providerLabel })
                        : t("library.catalogDiscoveryFailed", { provider: providerLabel })}
                    </InlineWarning>
                  ))
                : null}
              {selectedTab === "plugins" && pluginsQuery.data?.remoteSyncError ? (
                <InlineWarning>{pluginsQuery.data.remoteSyncError}</InlineWarning>
              ) : null}
              {selectedTab === "plugins" &&
              (pluginsQuery.data?.marketplaceLoadErrors.length ?? 0) > 0 ? (
                <InlineWarning>
                  {pluginsQuery.data?.marketplaceLoadErrors
                    .map(
                      (err) =>
                        `${sectionTitle(err.marketplacePath, t("library.unknownSource"))}: ${err.message}`,
                    )
                    .join(" • ")}
                </InlineWarning>
              ) : null}
            </div>
          )}

          {/* Grid content */}
          <div className="px-3 pb-10 sm:px-5">
            {selectedTab === "packages" ? (
              <div className="mx-auto max-w-3xl space-y-2">
                {packageError ? (
                  <InlineWarning>{t("library.packageOperationFailed")}</InlineWarning>
                ) : null}
                {packageReloadState !== null ? (
                  <div aria-live="polite" className="text-xs text-muted-foreground">
                    {t(`library.reloadState.${packageReloadState}`)}
                  </div>
                ) : null}
                {!ecosystemAvailable ? (
                  <EmptyPanel
                    title={t("library.packagesUnavailable")}
                    description={t("library.packagesUnavailableDescription")}
                  />
                ) : ecosystemQuery.isLoading && !ecosystemQuery.data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[70px] w-full rounded-xl" />
                    <Skeleton className="h-[70px] w-full rounded-xl" />
                  </div>
                ) : (ecosystemQuery.data?.packages.length ?? 0) === 0 ? (
                  <EmptyPanel
                    title={t("library.noPackages")}
                    description={t("library.noPackagesDescription")}
                  />
                ) : (
                  ecosystemQuery.data?.packages.map((item) => (
                    <PackageRow
                      key={item.packageId}
                      item={item}
                      busy={ecosystemMutation.isPending}
                      onManage={() => setManagedPackageId(item.packageId)}
                      onUpdate={() =>
                        ecosystemMutation.mutate({ type: "update", packageId: item.packageId })
                      }
                      onRemove={() => setPendingRemovalPackage(item)}
                    />
                  ))
                )}
              </div>
            ) : selectedTab === "plugins" ? (
              <>
                {!canListPlugins ? (
                  <div className="mx-auto max-w-2xl">
                    <EmptyPanel
                      title={t("library.pluginsUnavailable", { provider: providerLabel })}
                      description={t("library.pluginDiscoveryUnsupported")}
                    />
                  </div>
                ) : pluginsQuery.isLoading && pluginEntries.length === 0 ? (
                  <div className="space-y-1">
                    {["1", "2", "3", "4", "5", "6"].map((k) => (
                      <Skeleton key={k} className="h-[68px] w-full rounded-xl" />
                    ))}
                  </div>
                ) : filteredPluginEntries.length === 0 ? (
                  <EmptyPanel
                    title={t("library.noPlugins")}
                    description={t("library.onlyInstalledPlugins", { provider: providerLabel })}
                  />
                ) : (
                  <div className="space-y-6">
                    {marketplaceSections.map((section) => (
                      <div key={section.key}>
                        <SectionHeader title={section.title} />
                        <div className="grid grid-cols-1 sm:grid-cols-2">
                          {section.entries.map((entry) => (
                            <PluginGridItem key={pluginEntryKey(entry)} entry={entry} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {!canListSkills ? (
                  <div className="mx-auto max-w-2xl">
                    <EmptyPanel
                      title={t("library.skillsUnavailable", { provider: providerLabel })}
                      description={t("library.skillDiscoveryUnsupported")}
                    />
                  </div>
                ) : skillsQuery.isLoading && discoveredSkills.length === 0 ? (
                  <div className="space-y-1">
                    {["1", "2", "3", "4", "5", "6"].map((k) => (
                      <Skeleton key={k} className="h-[68px] w-full rounded-xl" />
                    ))}
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <EmptyPanel
                    title={t("library.noSkills")}
                    description={t("library.noSkillMatch")}
                  />
                ) : (
                  <div>
                    <SectionHeader title={t("library.skills")} />
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      {filteredSkills.map((skill) => (
                        <SkillGridItem
                          key={skill.path}
                          skill={skill}
                          providerLabel={providerLabel}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <PackageResourceDialog
        open={managedPackageId !== null}
        onOpenChange={(open) => {
          if (!open) setManagedPackageId(null);
        }}
        packageName={
          ecosystemQuery.data?.packages.find((item) => item.packageId === managedPackageId)
            ?.displayName ?? ""
        }
        resources={resourcesQuery.data?.resources ?? []}
        loading={resourcesQuery.isLoading}
        error={resourcesQuery.isError}
        busy={ecosystemMutation.isPending}
        onToggle={(resource, enabled) =>
          ecosystemMutation.mutate({ type: "toggle", resource, enabled })
        }
      />
      <Dialog
        open={pendingRemovalPackage !== null}
        onOpenChange={(open) => {
          if (!open && !ecosystemMutation.isPending) setPendingRemovalPackage(null);
        }}
      >
        <DialogPopup className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("library.removePackageTitle", {
                package: pendingRemovalPackage?.displayName ?? "",
              })}
            </DialogTitle>
            <DialogDescription>{t("library.removePackageDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" autoFocus />}>
              {t("common.cancel")}
            </DialogClose>
            <Button
              variant="destructive"
              disabled={ecosystemMutation.isPending || pendingRemovalPackage === null}
              onClick={() => {
                if (pendingRemovalPackage !== null) {
                  ecosystemMutation.mutate({
                    type: "remove",
                    packageId: pendingRemovalPackage.packageId,
                  });
                }
              }}
            >
              {t("common.remove")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </SidebarInset>
  );
}

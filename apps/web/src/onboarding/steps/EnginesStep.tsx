import type { EngineKind } from "@harnessos/contracts";
import { ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";
import { useEffect, useMemo, useRef, useState } from "react";

import { EngineIcon } from "~/components/EngineIcon";
import { Checkbox } from "~/components/ui/checkbox";
import { DisclosureRegion } from "~/components/ui/DisclosureRegion";
import { useRefreshEngineStatusesNow } from "~/hooks/useEngineStatusRefresh";
import { useEngineStatusesForLocalConfig } from "~/hooks/useEngineStatusesForLocalConfig";
import { useI18n, type MessageKey } from "~/i18n";
import { setEngineHidden } from "~/engineOrdering";
import { findEngineStatus } from "~/lib/engineAvailability";
import { RefreshCwIcon, XIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { useLocalPreferences } from "~/localPreferences";
import { useWorkspacePathsStore } from "~/workspacePathsStore";
import { ONBOARDING_TILE_CLASS_NAME } from "../layout";
import { classifyEngineSetup, summarizeEngineSetup, type EngineSetupState } from "../logic";
import { EngineConnectTerminal } from "./EngineConnectTerminal";

const STATE_PRESENTATION: Record<EngineSetupState, { labelKey: MessageKey; dotClassName: string }> =
  {
    connected: { labelKey: "firstRun.engineConnected", dotClassName: "bg-status-success" },
    "needs-sign-in": { labelKey: "firstRun.engineNeedsSignIn", dotClassName: "bg-warning" },
    "not-installed": {
      labelKey: "firstRun.engineNotInstalled",
      dotClassName: "bg-muted-foreground/40",
    },
    disabled: { labelKey: "firstRun.engineHidden", dotClassName: "bg-muted-foreground/40" },
  };

const INLINE_ACTION_CLASS_NAME =
  "cursor-pointer text-foreground underline decoration-foreground/40 underline-offset-[3px] transition-colors hover:decoration-foreground motion-reduce:transition-none";

function useHiddenEnginesDraft(): {
  readonly hidden: ReadonlySet<EngineKind>;
  readonly setEngineHiddenInWorkbench: (engine: EngineKind, hidden: boolean) => void;
} {
  const { preferences, updatePreferences } = useLocalPreferences();
  const [draft, setDraft] = useState<ReadonlySet<EngineKind>>(
    () => new Set(preferences.hiddenEngines),
  );
  const writingRef = useRef(false);

  useEffect(() => {
    if (writingRef.current) return;
    setDraft(new Set(preferences.hiddenEngines));
  }, [preferences.hiddenEngines]);

  const setEngineHiddenInWorkbench = (engine: EngineKind, hidden: boolean) => {
    const next = new Set(setEngineHidden([...draft], engine, hidden));
    writingRef.current = true;
    setDraft(next);
    const result = updatePreferences({ hiddenEngines: [...next] });
    writingRef.current = false;
    if (result.state === "failed") {
      setDraft(new Set(preferences.hiddenEngines));
    }
  };

  return { hidden: draft, setEngineHiddenInWorkbench };
}

export function EnginesStep() {
  const { t } = useI18n();
  const statuses = useEngineStatusesForLocalConfig();
  const refresh = useRefreshEngineStatusesNow();
  const [refreshing, setRefreshing] = useState(false);
  const { hidden, setEngineHiddenInWorkbench } = useHiddenEnginesDraft();
  const homeDir = useWorkspacePathsStore((store) => store.homeDir);
  const [connectingEngine, setConnectingEngine] = useState<EngineKind | null>(null);
  const terminalRegionRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () =>
      ENGINE_DESCRIPTORS.map((descriptor) => ({
        descriptor,
        state: classifyEngineSetup({
          status: findEngineStatus(statuses, descriptor.kind),
          disabled: hidden.has(descriptor.kind),
        }),
      })),
    [hidden, statuses],
  );
  const summary = summarizeEngineSetup(
    rows.map((row) => ({ engine: row.descriptor.kind, state: row.state })),
  );
  const connecting = rows.find((row) => row.descriptor.kind === connectingEngine);
  const connectingSignInCommand = connecting?.descriptor.usage?.signInCommand;

  useEffect(() => {
    if (connectingEngine === null) return;
    const row = rows.find((entry) => entry.descriptor.kind === connectingEngine);
    if (row?.state === "connected") {
      setConnectingEngine(null);
    }
  }, [connectingEngine, rows]);

  useEffect(() => {
    if (!connectingSignInCommand) return;
    terminalRegionRef.current?.scrollIntoView({ block: "nearest" });
  }, [connectingSignInCommand]);

  const toggleConnect = (engine: EngineKind) => {
    setConnectingEngine((current) => (current === engine ? null : engine));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {rows.map(({ descriptor, state }) => {
          const presentation = STATE_PRESENTATION[state];
          const enabled = state !== "disabled";
          const canConnectInline =
            state === "needs-sign-in" &&
            descriptor.usage?.signInCommand !== undefined &&
            homeDir !== null;
          const isConnecting = connectingEngine === descriptor.kind;
          const checkboxId = `onboarding-engine-${descriptor.kind}`;
          return (
            <div
              key={descriptor.kind}
              className={cn(
                "flex h-[60px] items-center gap-3 px-3.5 transition-opacity motion-reduce:transition-none",
                ONBOARDING_TILE_CLASS_NAME,
                !enabled && "opacity-50",
              )}
            >
              <EngineIcon engine={descriptor.kind} className="size-5 shrink-0" />
              <label
                htmlFor={checkboxId}
                className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5"
              >
                <span className="truncate text-[length:var(--app-font-size-ui-lg,13px)] font-medium text-foreground">
                  {descriptor.displayName}
                </span>
                <span className="flex items-center gap-1.5 text-[length:var(--app-font-size-ui-sm,11px)] text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn("size-1.5 shrink-0 rounded-full", presentation.dotClassName)}
                  />
                  {t(presentation.labelKey)}
                  {canConnectInline ? (
                    <button
                      type="button"
                      className={cn("ml-1", INLINE_ACTION_CLASS_NAME)}
                      onClick={(event) => {
                        event.preventDefault();
                        toggleConnect(descriptor.kind);
                      }}
                    >
                      {isConnecting ? t("firstRun.engineSignInDone") : t("firstRun.engineSignIn")}
                    </button>
                  ) : null}
                  {state === "not-installed" && descriptor.usage?.learnMoreHref ? (
                    <a
                      href={descriptor.usage.learnMoreHref}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("ml-1", INLINE_ACTION_CLASS_NAME)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t("firstRun.engineGuide")}
                    </a>
                  ) : null}
                </span>
              </label>
              <Checkbox
                id={checkboxId}
                checked={enabled}
                aria-label={t(enabled ? "firstRun.hideEngine" : "firstRun.showEngine", {
                  engine: descriptor.displayName,
                })}
                onCheckedChange={(checked) =>
                  setEngineHiddenInWorkbench(descriptor.kind, checked !== true)
                }
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 text-[length:var(--app-font-size-ui,12px)] text-muted-foreground">
        <span>
          {t("firstRun.engineSummary", {
            connected: summary.connected,
            needsSignIn: summary.needsSignIn,
            notInstalled: summary.notInstalled,
          })}
        </span>
        <button
          type="button"
          disabled={refreshing}
          className="inline-flex cursor-pointer items-center gap-1.5 text-foreground/70 transition-colors hover:text-foreground disabled:opacity-60 motion-reduce:transition-none"
          onClick={() => {
            setRefreshing(true);
            void refresh({ silent: true }).finally(() => setRefreshing(false));
          }}
        >
          <RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
          {t("firstRun.reDetect")}
        </button>
      </div>

      <DisclosureRegion open={connecting !== undefined}>
        {connecting && connectingSignInCommand !== undefined && homeDir !== null ? (
          <div ref={terminalRegionRef} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[length:var(--app-font-size-ui,12px)] text-muted-foreground">
              <span>
                {t("firstRun.signingInTo", { engine: connecting.descriptor.displayName })} ·{" "}
                <code className="text-foreground/80">{connectingSignInCommand}</code>
              </span>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 text-foreground/70 transition-colors hover:text-foreground motion-reduce:transition-none"
                onClick={() => setConnectingEngine(null)}
              >
                <XIcon className="size-3.5" aria-hidden />
                {t("firstRun.engineSignInDone")}
              </button>
            </div>
            <EngineConnectTerminal
              key={connecting.descriptor.kind}
              engine={connecting.descriptor.kind}
              signInCommand={connectingSignInCommand}
              cwd={homeDir}
            />
          </div>
        ) : null}
      </DisclosureRegion>
    </div>
  );
}

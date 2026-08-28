// FILE: EngineUsagePanelContent.tsx
// Purpose: Render a engine usage summary panel that can show both classic
// rate-limit rows and archive-derived local usage lines in the same popover.

import type { EngineKind } from "@harnessos/contracts";
import { providerUsageLabel } from "@harnessos/shared/providerUsage";

import { ExternalLinkIcon, TriangleAlertIcon } from "~/lib/icons";
import type { OpenUsageUsageLine } from "~/lib/openUsageRateLimits";
import {
  deriveProviderUsageLearnMoreHref,
  deriveRateLimitLearnMoreHref,
  type EngineRateLimit,
} from "~/lib/rateLimits";
import { deriveProviderUsageDisplayRows } from "~/lib/providerUsageDisplay";
import { cn } from "~/lib/utils";

import { EngineUsageLimitRows } from "./EngineUsageLimitRows";
import { EngineUsageLineList } from "./EngineUsageLineList";

export { providerUsageLabel };

export function EngineUsagePanelContent(props: {
  engine: EngineKind | null | undefined;
  rateLimits: ReadonlyArray<EngineRateLimit>;
  usageLines?: ReadonlyArray<OpenUsageUsageLine> | undefined;
  notice?: string | null | undefined;
  isLoading?: boolean | undefined;
  learnMoreHref?: string | null | undefined;
  showUsageLines?: boolean | undefined;
  showTitle?: boolean | undefined;
  showLearnMore?: boolean | undefined;
  className?: string | undefined;
}) {
  const visibleRows = deriveProviderUsageDisplayRows(props.rateLimits);
  const learnMoreHref =
    props.learnMoreHref ??
    deriveRateLimitLearnMoreHref(props.rateLimits) ??
    deriveProviderUsageLearnMoreHref(props.engine);

  return (
    <div className={cn("space-y-2", props.className)}>
      {props.showTitle !== false ? (
        <div className="text-[length:var(--app-font-size-chat-meta,10px)] font-medium text-muted-foreground">
          {providerUsageLabel(props.engine)}
        </div>
      ) : null}
      {props.notice ? (
        <p className="flex items-start gap-1.5 text-[length:var(--app-font-size-chat-meta,10px)] leading-relaxed text-warning">
          <TriangleAlertIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{props.notice}</span>
        </p>
      ) : null}
      <EngineUsageLimitRows rows={visibleRows} surface="popover" />
      {props.showUsageLines !== false && props.usageLines && props.usageLines.length > 0 ? (
        <EngineUsageLineList
          className={cn(visibleRows.length > 0 && "pt-0.5")}
          lines={props.usageLines}
          surface="popover"
        />
      ) : visibleRows.length === 0 && props.isLoading ? (
        <p className="text-[length:var(--app-font-size-chat-meta,10px)] leading-relaxed text-muted-foreground">
          Scanning local usage data for the selected engine.
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="text-[length:var(--app-font-size-chat-meta,10px)] leading-relaxed text-muted-foreground">
          {props.engine
            ? "No local usage data was found yet for the selected engine."
            : "No local usage data was found yet."}
        </p>
      ) : null}
      {props.showLearnMore === true && learnMoreHref ? (
        <a
          href={learnMoreHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 pt-0.5 text-[length:var(--app-font-size-chat-meta,10px)] text-muted-foreground transition-colors hover:text-foreground"
        >
          Learn more
          <ExternalLinkIcon className="size-3" />
        </a>
      ) : null}
    </div>
  );
}

// FILE: EngineHealthBanner.tsx
// Purpose: Surfaces engine availability warnings above the active chat.
// Layer: Chat status presentation
// Exports: EngineHealthBanner

import type { ServerProviderStatus } from "@harnessos/contracts";
import { ENGINE_DISPLAY_NAMES } from "@harnessos/shared/engineMetadata";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../ui/alert";
import { IconButton } from "../ui/icon-button";
import {
  EXPANDED_NOTIFICATION_SURFACE_CLASS_NAME,
  NOTIFICATION_ICON_CLASS_NAME,
} from "../ui/notificationSurface";
import { CircleAlertIcon, TriangleAlertIcon, XIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { ChatColumnBannerFrame } from "./ChatColumnBannerFrame";

export const EngineHealthBanner = function EngineHealthBanner({
  onDismiss,
  status,
}: {
  onDismiss?: () => void;
  status: ServerProviderStatus | null;
}) {
  if (!status || status.status === "ready") {
    return null;
  }

  const providerLabel = ENGINE_DISPLAY_NAMES[status.engine] ?? status.engine;
  const defaultMessage =
    status.status === "error"
      ? `${providerLabel} engine is unavailable.`
      : `${providerLabel} engine has limited availability.`;
  const title = `${providerLabel} engine status`;
  const Icon = status.status === "error" ? CircleAlertIcon : TriangleAlertIcon;

  return (
    <ChatColumnBannerFrame>
      <Alert
        className={cn(EXPANDED_NOTIFICATION_SURFACE_CLASS_NAME, "pr-10")}
        variant={status.status === "error" ? "error" : "warning"}
      >
        <Icon className={NOTIFICATION_ICON_CLASS_NAME} />
        <AlertTitle className="font-normal text-[var(--notification-fg)]">{title}</AlertTitle>
        <AlertDescription
          className="line-clamp-3 text-[var(--notification-fg)]/72"
          title={status.message ?? defaultMessage}
        >
          {status.message ?? defaultMessage}
        </AlertDescription>
        {onDismiss ? (
          <AlertAction className="absolute top-2 right-2">
            <IconButton
              className="size-6 rounded-full text-[var(--notification-fg)]/65 hover:bg-[var(--notification-fg)]/10 hover:text-[var(--notification-fg)] focus-visible:ring-[var(--notification-fg)]/35 sm:size-6"
              label="Dismiss engine status"
              title="Dismiss engine status"
              onClick={onDismiss}
            >
              <XIcon className="size-3.5" />
            </IconButton>
          </AlertAction>
        ) : null}
      </Alert>
    </ChatColumnBannerFrame>
  );
};

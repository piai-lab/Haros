import type {
  EngineExecutionCapabilityReason,
  EngineRuntimeModeCapability,
} from "@harnessos/contracts";
import { isEngineRuntimeModeExecutable } from "@harnessos/shared/runtimeMode";

import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

export function runtimeModeAvailabilityMessageKey(input: {
  readonly structurallySupported: boolean;
  readonly status?: EngineRuntimeModeCapability["status"] | undefined;
  readonly reason?: EngineExecutionCapabilityReason | undefined;
}) {
  switch (input.reason) {
    case "mode-unsupported":
    case "model-unsupported":
      return "composer.runtimeModeUnsupported" as const;
    case "engine-not-installed":
      return "composer.runtimeModeProviderNotInstalled" as const;
    case "authentication-required":
      return "composer.runtimeModeAuthenticationRequired" as const;
    case "runtime-version-unsupported":
      return "composer.runtimeModeVersionUnsupported" as const;
    case "model-capability-unknown":
      return "composer.runtimeModeModelCapabilityUnknown" as const;
    case "adapter-unregistered":
      return "composer.runtimeModeAdapterUnavailable" as const;
    case "runtime-health-unknown":
      return "composer.runtimeModeHealthUnknown" as const;
    case "runtime-degraded":
      return "composer.runtimeModeDegraded" as const;
    case undefined:
      break;
  }
  return input.status === "degraded"
    ? ("composer.runtimeModeDegraded" as const)
    : ("composer.runtimeModeTemporarilyUnavailable" as const);
}

export function runtimeModeAvailabilityMessageKeyFromError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const code = error.code;
  if (
    code !== "adapter-unregistered" &&
    code !== "mode-unsupported" &&
    code !== "model-unsupported" &&
    code !== "model-capability-unknown" &&
    code !== "engine-not-installed" &&
    code !== "authentication-required" &&
    code !== "runtime-health-unknown" &&
    code !== "runtime-degraded" &&
    code !== "runtime-version-unsupported"
  ) {
    return null;
  }
  return runtimeModeAvailabilityMessageKey({
    structurallySupported: code !== "mode-unsupported" && code !== "model-unsupported",
    reason: code,
  });
}

export function RuntimeModeAvailabilityHint({
  capability,
  resolution = "resolved",
  className,
}: {
  readonly capability: EngineRuntimeModeCapability | undefined;
  readonly resolution?: "pending" | "failed" | "resolved" | undefined;
  readonly className?: string | undefined;
}) {
  const { t } = useI18n();
  if (!capability) {
    const message =
      resolution === "pending"
        ? t("composer.engineChecking")
        : t("composer.runtimeModeTemporarilyUnavailable");
    return (
      <span className={cn("text-xs font-normal text-muted-foreground", className)}>{message}</span>
    );
  }
  if (isEngineRuntimeModeExecutable(capability) && capability.status !== "degraded") {
    return null;
  }

  const message = t(runtimeModeAvailabilityMessageKey(capability));

  return (
    <span className={cn("text-xs font-normal text-muted-foreground", className)}>{message}</span>
  );
}

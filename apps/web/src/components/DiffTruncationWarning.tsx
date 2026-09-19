import type { HTMLAttributes } from "react";

import { useI18n } from "~/i18n";
import { TriangleAlertIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function DiffTruncationWarning({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { t } = useI18n();
  return (
    <Alert {...props} variant="warning" size="sm" className={cn("shrink-0", className)}>
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>{t("diff.partialTitle")}</AlertTitle>
      <AlertDescription>{children ?? t("diff.truncatedWarning")}</AlertDescription>
    </Alert>
  );
}

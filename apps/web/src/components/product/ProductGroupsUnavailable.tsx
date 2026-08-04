import { getWorkbenchCopy } from "../../i18n/workbenchCopy";

/** Product Group facts do not exist in T3; this intentionally accepts no mutation callback. */
export function ProductGroupsUnavailable() {
  return (
    <p
      className="px-2 py-2 text-xs leading-relaxed text-muted-foreground/55"
      data-product-domain="groups"
      aria-disabled="true"
    >
      {getWorkbenchCopy().groupsUnavailable}
    </p>
  );
}

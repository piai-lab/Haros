// FILE: OmniMindLogo.tsx
// Purpose: Render the OmniMind product mark while preserving the source SVG component contract.
// Layer: Shared app branding primitive

import type { SVGProps } from "react";
import { cn } from "~/lib/utils";

export function OmniMindLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  const ariaLabel = props["aria-label"];

  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaLabel ? undefined : true}
      {...props}
      className={cn("shrink-0", className)}
    >
      <image href="/omnimind-icon-light.svg" width="1024" height="1024" className="dark:hidden" />
      <image
        href="/omnimind-icon-dark.svg"
        width="1024"
        height="1024"
        className="hidden dark:block"
      />
    </svg>
  );
}

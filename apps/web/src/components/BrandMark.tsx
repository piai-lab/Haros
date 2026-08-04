// FILE: BrandMark.tsx
// Purpose: Render the temporary OmniMind product icon with the active theme.
// Layer: Shared app branding primitive

import type { HTMLAttributes } from "react";
import { cn } from "~/lib/utils";

export type BrandMarkProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export function BrandMark({ className, ...props }: BrandMarkProps) {
  const ariaLabel = props["aria-label"];

  return (
    <span
      aria-hidden={ariaLabel ? undefined : true}
      role={ariaLabel ? "img" : undefined}
      {...props}
      className={cn("relative inline-block aspect-square shrink-0 overflow-hidden", className)}
    >
      <img
        src="/omnimind-icon-light.svg"
        alt=""
        className="absolute inset-0 size-full object-contain dark:hidden"
        draggable={false}
      />
      <img
        src="/omnimind-icon-dark.svg"
        alt=""
        className="absolute inset-0 hidden size-full object-contain dark:block"
        draggable={false}
      />
    </span>
  );
}

// FILE: HarosLogo.tsx
// Purpose: Render the canonical Haros product mark with responsive light/dark assets.
// Layer: Shared app branding primitive

import { useId, type SVGProps } from "react";

import { cn } from "~/lib/utils";

export interface HarosLogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly size?: number;
  readonly title?: string;
}

export function HarosLogo({
  size = 32,
  title,
  className,
  style,
  "aria-label": ariaLabel,
  ...svgProps
}: HarosLogoProps) {
  const titleId = `harnessos-logo-${useId().replace(/:/g, "")}`;
  const isNamed = Boolean(title || ariaLabel);

  return (
    <svg
      {...svgProps}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      role={isNamed ? "img" : undefined}
      aria-label={ariaLabel}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={isNamed ? undefined : true}
      className={cn("shrink-0", className)}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <image href="/brand/harnessos-mark.svg" width="512" height="512" className="dark:hidden" />
      <image
        href="/brand/harnessos-mark-dark.svg"
        width="512"
        height="512"
        className="hidden dark:block"
      />
    </svg>
  );
}

export function OABadge({ size = 16, className, style, ...svgProps }: HarosLogoProps) {
  return (
    <svg
      {...svgProps}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-hidden={svgProps["aria-label"] ? undefined : true}
      className={cn("shrink-0", className)}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <image href="/brand/oa-badge.svg" width="64" height="64" className="dark:hidden" />
      <image href="/brand/oa-badge-dark.svg" width="64" height="64" className="hidden dark:block" />
    </svg>
  );
}

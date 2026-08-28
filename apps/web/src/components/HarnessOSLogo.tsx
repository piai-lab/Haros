// FILE: HarnessOSLogo.tsx
// Purpose: Render the canonical HarnessOS product mark with responsive light/dark assets.
// Layer: Shared app branding primitive

import { useId, type SVGProps } from "react";

import { cn } from "~/lib/utils";

export type HarnessOSLogoVariant = "satin" | "flat" | "mono";

export interface HarnessOSLogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly size?: number;
  readonly variant?: HarnessOSLogoVariant;
  readonly responsive?: boolean;
  readonly title?: string;
}

const LOGO_ASSETS: Record<HarnessOSLogoVariant, { readonly light: string; readonly dark: string }> =
  {
    satin: {
      light: "/brand/harnessos-logo-satin.svg",
      dark: "/brand/harnessos-logo-satin-dark.svg",
    },
    flat: {
      light: "/brand/harnessos-logo-flat.svg",
      dark: "/brand/harnessos-logo-flat-dark.svg",
    },
    mono: {
      light: "/brand/harnessos-logo-mono-brand.svg",
      dark: "/brand/harnessos-logo-mono-brand.svg",
    },
  };

export function HarnessOSLogo({
  size = 32,
  variant = "flat",
  responsive = true,
  title,
  className,
  style,
  "aria-label": ariaLabel,
  ...svgProps
}: HarnessOSLogoProps) {
  const titleId = `harnessos-logo-${useId().replace(/:/g, "")}`;
  const effectiveVariant = responsive && size <= 48 && variant === "satin" ? "flat" : variant;
  const assets = LOGO_ASSETS[effectiveVariant];
  const microTransform =
    size <= 32 ? "translate(256 256) scale(1.12) translate(-256 -256)" : undefined;
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
      <g transform={microTransform}>
        <foreignObject width="512" height="512" aria-hidden="true">
          <div className="size-full">
            <img src={assets.light} alt="" className="block size-full dark:hidden" />
            <img src={assets.dark} alt="" className="hidden size-full dark:block" />
          </div>
        </foreignObject>
      </g>
    </svg>
  );
}

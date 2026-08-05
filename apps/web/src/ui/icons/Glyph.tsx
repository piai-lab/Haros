// FILE: Glyph.tsx
// Purpose: Resolve and render the complete product glyph corpus through one source-neutral API.
// Layer: web UI primitive

import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactElement } from "react";
import { cn } from "~/lib/styles";
import { hasGlyph } from "./registry.generated";

const GLYPH_BASE_PATHS = {
  line: "/icons/line",
  fill: "/icons/fill",
} as const;

export type GlyphStyle = keyof typeof GLYPH_BASE_PATHS;

const DEFAULT_GLYPH_STYLE: GlyphStyle = "line";
const SVG_SUFFIX = ".svg";
const GLYPH_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const GLYPH_BASE_CLASS = "inline-block size-4 shrink-0 bg-current";

export const GLYPH_SLOT = "glyph";

export type GlyphProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  name: string;
  label?: string | undefined;
  glyphStyle?: GlyphStyle | undefined;
};

/** Build a public glyph URL without accepting traversal or path fragments. */
export function getGlyphUrl(
  name: string,
  glyphStyle: GlyphStyle = DEFAULT_GLYPH_STYLE,
): string | null {
  if (typeof name !== "string") {
    console.error("[glyph] non-string name", name);
    return null;
  }

  const normalizedName = name.endsWith(SVG_SUFFIX) ? name.slice(0, -SVG_SUFFIX.length) : name;
  if (!GLYPH_NAME_PATTERN.test(normalizedName)) return null;
  if (!hasGlyph(glyphStyle, normalizedName)) return null;

  return `${GLYPH_BASE_PATHS[glyphStyle]}/${encodeURIComponent(normalizedName)}${SVG_SUFFIX}`;
}

function glyphMaskValue(url: string): string {
  return `url("${url}") center / contain no-repeat`;
}

/** Mirror Button/Toggle child selectors for masked glyph spans. */
export function extendButtonGlyphChildSelectors(className: string): string {
  let result = className;

  result = result.replace(
    /\[&_svg:not\(\[class\*='opacity-'\]\)\]:([^\s"']+)/g,
    (match, util) => `${match} [&_[data-slot=${GLYPH_SLOT}]:not([class*='opacity-'])]:${util}`,
  );

  result = result.replace(
    /((?:sm:|not-in-data-\[slot=input-group\]:)?\[&_svg:not\(\[class\*='size-'\]\)\]:[^\s"']+)/g,
    (match) => {
      const glyph = match.replace("[&_svg:not", `[&_[data-slot=${GLYPH_SLOT}]:not`);
      return `${match} ${glyph}`;
    },
  );

  return result.replace(
    /\[&_svg\]:([a-z0-9\-/[\].]+)/g,
    (match, util) => `[&_svg,&_[data-slot=${GLYPH_SLOT}]]:${util}`,
  );
}

export const Glyph = forwardRef<HTMLSpanElement, GlyphProps>(function Glyph(
  { name, label, glyphStyle, className, style, ...props },
  ref,
) {
  const url = getGlyphUrl(name, glyphStyle);
  if (!url) return null;

  const mask = glyphMaskValue(url);
  const maskStyle = {
    WebkitMask: mask,
    mask,
    ...style,
  } satisfies CSSProperties;

  return (
    <span
      {...props}
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-slot={GLYPH_SLOT}
      className={cn(GLYPH_BASE_CLASS, className)}
      style={maskStyle}
    />
  );
});

export function createGlyphComponent(
  name: string,
  glyphStyle?: GlyphStyle,
): (props: { className?: string }) => ReactElement {
  function GlyphComponent({ className }: { className?: string }) {
    return <Glyph name={name} glyphStyle={glyphStyle} className={className} />;
  }
  GlyphComponent.displayName = `Glyph(${name})`;
  return GlyphComponent;
}

/** Imperative twin for Lexical and other non-React DOM surfaces. */
export function createGlyphElement(
  name: string,
  className?: string,
  glyphStyle?: GlyphStyle,
): HTMLSpanElement | null {
  const url = getGlyphUrl(name, glyphStyle);
  if (!url) return null;

  const element = document.createElement("span");
  element.setAttribute("aria-hidden", "true");
  element.dataset.slot = GLYPH_SLOT;
  element.className = cn(GLYPH_BASE_CLASS, className);
  const mask = glyphMaskValue(url);
  element.style.setProperty("-webkit-mask", mask);
  element.style.setProperty("mask", mask);
  return element;
}

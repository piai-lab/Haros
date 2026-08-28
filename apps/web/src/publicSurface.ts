// FILE: publicSurface.ts
// Purpose: Resolves the two separately configured outbound Public Surface boundaries.
// Layer: Web product boundary

export const CANONICAL_PUBLIC_SITE_ORIGIN = "https://harnessos.wisdomeyes.cn";
export const RESERVED_FEEDBACK_PATH = "/api/v1/feedback";
export const FEEDBACK_RECIPIENT_LABEL = "HarnessOS feedback service (harnessos.wisdomeyes.cn)";

export type PublicSiteSurface = "home" | "docs" | "changelog" | "download" | "privacy" | "support";

const PUBLIC_SITE_PATHS: Record<PublicSiteSurface, string> = {
  home: "/",
  docs: "/docs",
  changelog: "/changelog",
  download: "/download",
  privacy: "/privacy",
  support: "/support",
};

const PUBLIC_SITE_NAMES: Record<PublicSiteSurface, string> = {
  home: "home",
  docs: "Docs",
  changelog: "Changelog",
  download: "Download",
  privacy: "Privacy",
  support: "Support",
};

export interface PublicSiteLink {
  readonly href: string | null;
  readonly unavailableReason: string | null;
}

export interface PublicSurfaceActivation {
  readonly configuredOrigin?: string | null;
  readonly isProduction?: boolean;
}

export interface FeedbackSurfaceActivation {
  readonly configuredEndpoint?: string | null;
  readonly isProduction?: boolean;
}

function parseCredentialFreeHttpsUrl(value: string | null | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol !== "https:" ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.hash !== ""
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function resolvePublicSiteLink(
  surface: PublicSiteSurface,
  options: PublicSurfaceActivation = {},
): PublicSiteLink {
  const configuredOrigin =
    options.configuredOrigin === undefined
      ? import.meta.env.VITE_PUBLIC_SITE_ORIGIN
      : options.configuredOrigin;
  const parsed = parseCredentialFreeHttpsUrl(configuredOrigin);
  const validOrigin =
    (options.isProduction ?? import.meta.env.PROD) &&
    parsed !== null &&
    parsed.origin === CANONICAL_PUBLIC_SITE_ORIGIN &&
    parsed.pathname === "/" &&
    parsed.search === "";

  if (!validOrigin) {
    return {
      href: null,
      unavailableReason: `${PUBLIC_SITE_NAMES[surface]} is not available in this build.`,
    };
  }

  return {
    href: new URL(PUBLIC_SITE_PATHS[surface], CANONICAL_PUBLIC_SITE_ORIGIN).href,
    unavailableReason: null,
  };
}

export function resolveFeedbackEndpoint(options: FeedbackSurfaceActivation = {}): string | null {
  if (!(options.isProduction ?? import.meta.env.PROD)) return null;
  const configuredEndpoint =
    options.configuredEndpoint === undefined
      ? import.meta.env.VITE_FEEDBACK_ENDPOINT
      : options.configuredEndpoint;
  const parsed = parseCredentialFreeHttpsUrl(configuredEndpoint);
  if (
    parsed === null ||
    parsed.origin !== CANONICAL_PUBLIC_SITE_ORIGIN ||
    parsed.pathname !== RESERVED_FEEDBACK_PATH ||
    parsed.search !== ""
  ) {
    return null;
  }
  return parsed.href;
}

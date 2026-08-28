// FILE: publicSurface.ts
// Purpose: Owns HarnessOS's fixed public exits.
// Layer: Web product boundary

export const CANONICAL_GITHUB_REPOSITORY_URL = "https://github.com/piai-lab/HarnessOS";
export const FEEDBACK_RECIPIENT_LABEL = "GitHub Issues (piai-lab/HarnessOS)";

export type PublicSiteSurface = "home" | "docs" | "issues" | "discussions" | "security";

const PUBLIC_SITE_URLS: Record<PublicSiteSurface, string> = {
  home: CANONICAL_GITHUB_REPOSITORY_URL,
  docs: `${CANONICAL_GITHUB_REPOSITORY_URL}/tree/main/docs`,
  issues: `${CANONICAL_GITHUB_REPOSITORY_URL}/issues`,
  discussions: `${CANONICAL_GITHUB_REPOSITORY_URL}/discussions`,
  security: `${CANONICAL_GITHUB_REPOSITORY_URL}/security`,
};

export interface PublicSiteLink {
  readonly href: string;
  readonly unavailableReason: null;
}

export function resolvePublicSiteLink(surface: PublicSiteSurface): PublicSiteLink {
  return {
    href: PUBLIC_SITE_URLS[surface],
    unavailableReason: null,
  };
}

export function buildGitHubIssueDraftUrl(input: {
  readonly title: string;
  readonly body: string;
  readonly labels?: readonly string[];
}): string {
  const url = new URL(`${CANONICAL_GITHUB_REPOSITORY_URL}/issues/new`);
  url.searchParams.set("title", input.title);
  url.searchParams.set("body", input.body);
  if (input.labels && input.labels.length > 0) {
    url.searchParams.set("labels", input.labels.join(","));
  }
  return url.href;
}

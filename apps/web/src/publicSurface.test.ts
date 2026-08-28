import { describe, expect, it } from "vitest";

import {
  CANONICAL_GITHUB_REPOSITORY_URL,
  buildGitHubIssueDraftUrl,
  resolvePublicSiteLink,
} from "./publicSurface";

describe("public site exits", () => {
  it("resolves every public exit under the canonical GitHub repository", () => {
    expect(resolvePublicSiteLink("home").href).toBe(CANONICAL_GITHUB_REPOSITORY_URL);
    expect(resolvePublicSiteLink("docs").href).toBe(
      `${CANONICAL_GITHUB_REPOSITORY_URL}/tree/main/docs`,
    );
    expect(resolvePublicSiteLink("issues").href).toBe(`${CANONICAL_GITHUB_REPOSITORY_URL}/issues`);
    expect(resolvePublicSiteLink("discussions").href).toBe(
      `${CANONICAL_GITHUB_REPOSITORY_URL}/discussions`,
    );
    expect(resolvePublicSiteLink("security").href).toBe(
      `${CANONICAL_GITHUB_REPOSITORY_URL}/security`,
    );
  });

  it("builds a GitHub issue draft without a private feedback endpoint", () => {
    const draft = new URL(
      buildGitHubIssueDraftUrl({
        title: "Bug: queue stopped",
        body: "Steps to reproduce",
        labels: ["bug"],
      }),
    );

    expect(`${draft.origin}${draft.pathname}`).toBe(
      `${CANONICAL_GITHUB_REPOSITORY_URL}/issues/new`,
    );
    expect(draft.searchParams.get("title")).toBe("Bug: queue stopped");
    expect(draft.searchParams.get("body")).toBe("Steps to reproduce");
    expect(draft.searchParams.get("labels")).toBe("bug");
  });
});

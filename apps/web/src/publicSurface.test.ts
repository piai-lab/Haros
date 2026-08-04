import { describe, expect, it } from "vitest";

import {
  CANONICAL_PUBLIC_SITE_ORIGIN,
  RESERVED_FEEDBACK_PATH,
  resolveFeedbackEndpoint,
  resolvePublicSiteLink,
} from "./publicSurface";

describe("public site exits", () => {
  it("keeps Docs and Changelog unavailable without the canonical production config", () => {
    expect(resolvePublicSiteLink("docs", { configuredOrigin: null })).toEqual({
      href: null,
      unavailableReason: "Docs is not available in this build.",
    });
    expect(
      resolvePublicSiteLink("changelog", {
        configuredOrigin: CANONICAL_PUBLIC_SITE_ORIGIN,
        isProduction: false,
      }).href,
    ).toBeNull();
    expect(
      resolvePublicSiteLink("changelog", {
        configuredOrigin: "https://example.com",
        isProduction: true,
      }).href,
    ).toBeNull();
    expect(
      resolvePublicSiteLink("docs", {
        configuredOrigin: "http://omnimind.wisdomeyes.cn",
        isProduction: true,
      }).href,
    ).toBeNull();
    expect(
      resolvePublicSiteLink("docs", {
        configuredOrigin: `${CANONICAL_PUBLIC_SITE_ORIGIN}/not-the-origin`,
        isProduction: true,
      }).href,
    ).toBeNull();
  });

  it("resolves only fixed routes under the exact canonical HTTPS origin", () => {
    expect(
      resolvePublicSiteLink("docs", {
        configuredOrigin: CANONICAL_PUBLIC_SITE_ORIGIN,
        isProduction: true,
      }),
    ).toEqual({
      href: `${CANONICAL_PUBLIC_SITE_ORIGIN}/docs`,
      unavailableReason: null,
    });
    expect(
      resolvePublicSiteLink("changelog", {
        configuredOrigin: `${CANONICAL_PUBLIC_SITE_ORIGIN}/`,
        isProduction: true,
      }),
    ).toEqual({
      href: `${CANONICAL_PUBLIC_SITE_ORIGIN}/changelog`,
      unavailableReason: null,
    });
  });
});

describe("feedback endpoint", () => {
  it("is independent from the public-site origin and absent by default", () => {
    expect(resolveFeedbackEndpoint({ configuredEndpoint: null, isProduction: true })).toBeNull();
    expect(
      resolveFeedbackEndpoint({
        configuredEndpoint: `${CANONICAL_PUBLIC_SITE_ORIGIN}${RESERVED_FEEDBACK_PATH}`,
        isProduction: false,
      }),
    ).toBeNull();
    expect(
      resolveFeedbackEndpoint({
        configuredEndpoint: CANONICAL_PUBLIC_SITE_ORIGIN,
        isProduction: true,
      }),
    ).toBeNull();
  });

  it("accepts only the production-gated canonical HTTPS origin and reserved candidate path", () => {
    const approvedEndpoint = `${CANONICAL_PUBLIC_SITE_ORIGIN}${RESERVED_FEEDBACK_PATH}`;
    expect(
      resolveFeedbackEndpoint({ configuredEndpoint: approvedEndpoint, isProduction: true }),
    ).toBe(approvedEndpoint);
    expect(
      resolveFeedbackEndpoint({
        configuredEndpoint: `https://feedback.example.com${RESERVED_FEEDBACK_PATH}`,
        isProduction: true,
      }),
    ).toBeNull();
    expect(
      resolveFeedbackEndpoint({
        configuredEndpoint: `http://omnimind.wisdomeyes.cn${RESERVED_FEEDBACK_PATH}`,
        isProduction: true,
      }),
    ).toBeNull();
    expect(
      resolveFeedbackEndpoint({
        configuredEndpoint: `${CANONICAL_PUBLIC_SITE_ORIGIN}/api/feedback`,
        isProduction: true,
      }),
    ).toBeNull();
    expect(
      resolveFeedbackEndpoint({
        configuredEndpoint: `https://user:secret@omnimind.wisdomeyes.cn${RESERVED_FEEDBACK_PATH}`,
        isProduction: true,
      }),
    ).toBeNull();
  });
});

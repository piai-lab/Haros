import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relativeTime";

describe("formatRelativeTime", () => {
  it('returns "now" for timestamps less than 1 minute ago', () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("now");
  });

  it("returns minutes for timestamps under an hour", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("5m");
  });

  it("returns hours for timestamps under a day", () => {
    const iso = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("3h");
  });

  it("returns days for timestamps over a day", () => {
    const iso = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("2d");
  });

  it('returns "now" for future timestamps caused by clock skew', () => {
    const iso = new Date(Date.now() + 60_000).toISOString();
    expect(formatRelativeTime(iso)).toBe("now");
  });

  it("uses compact Chinese units for the Chinese product locale", () => {
    expect(formatRelativeTime(new Date(Date.now() - 30_000).toISOString(), "zh-CN")).toBe("刚刚");
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString(), "zh-CN")).toBe(
      "5分",
    );
    expect(formatRelativeTime(new Date(Date.now() - 3 * 60 * 60_000).toISOString(), "zh-CN")).toBe(
      "3小时",
    );
    expect(
      formatRelativeTime(new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString(), "zh-CN"),
    ).toBe("1周");
  });
});

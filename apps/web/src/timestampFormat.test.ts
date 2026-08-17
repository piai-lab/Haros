import { describe, expect, it } from "vitest";

import {
  formatDayAwareTimestamp,
  formatShortTimestamp,
  getTimestampFormatOptions,
} from "./timestampFormat";

describe("getTimestampFormatOptions", () => {
  it("omits hour12 when locale formatting is requested", () => {
    expect(getTimestampFormatOptions("locale", true)).toEqual({
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  });

  it("builds a 12-hour formatter with seconds when requested", () => {
    expect(getTimestampFormatOptions("12-hour", true)).toEqual({
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  });

  it("builds a 24-hour formatter without seconds when requested", () => {
    expect(getTimestampFormatOptions("24-hour", false)).toEqual({
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  });
});

function localDate(year: number, monthIndex: number, day: number, hour = 12, minute = 0): Date {
  return new Date(year, monthIndex, day, hour, minute);
}

describe("formatDayAwareTimestamp", () => {
  const format = "24-hour" as const;
  const now = localDate(2026, 2, 17, 12);

  it("uses only the configured time on the same calendar day", () => {
    const timestamp = localDate(2026, 2, 17, 8, 5);

    expect(formatDayAwareTimestamp(timestamp.toISOString(), format, now)).toBe(
      formatShortTimestamp(timestamp.toISOString(), format),
    );
  });

  it.each([
    [1, localDate(2026, 2, 16, 23, 59)],
    [6, localDate(2026, 2, 11, 8, 5)],
  ])("uses a weekday for a message %i calendar day(s) ago", (_daysAgo, timestamp) => {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
    }).format(timestamp);

    expect(formatDayAwareTimestamp(timestamp.toISOString(), format, now)).toBe(
      `${weekday}, ${formatShortTimestamp(timestamp.toISOString(), format)}`,
    );
  });

  it("switches to a date at exactly seven calendar days", () => {
    const timestamp = localDate(2026, 2, 10, 8, 5);
    const date = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(timestamp);

    expect(formatDayAwareTimestamp(timestamp.toISOString(), format, now)).toBe(
      `${date}, ${formatShortTimestamp(timestamp.toISOString(), format)}`,
    );
  });

  it("includes the year across calendar years", () => {
    const timestamp = localDate(2025, 11, 31, 23, 59);
    const date = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(timestamp);

    expect(formatDayAwareTimestamp(timestamp.toISOString(), format, now)).toBe(
      `${date}, ${formatShortTimestamp(timestamp.toISOString(), format)}`,
    );
  });

  it.each([localDate(2026, 2, 18, 8, 5), localDate(2027, 0, 2, 8, 5)])(
    "uses a date rather than a weekday for future messages",
    (timestamp) => {
      const date = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        ...(timestamp.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
      }).format(timestamp);

      expect(formatDayAwareTimestamp(timestamp.toISOString(), format, now)).toBe(
        `${date}, ${formatShortTimestamp(timestamp.toISOString(), format)}`,
      );
    },
  );

  it.each(["locale", "12-hour", "24-hour"] as const)(
    "preserves the %s time formatter for dated output",
    (timestampFormat) => {
      const timestamp = localDate(2026, 2, 10, 8, 5);

      expect(
        formatDayAwareTimestamp(timestamp.toISOString(), timestampFormat, now).endsWith(
          `, ${formatShortTimestamp(timestamp.toISOString(), timestampFormat)}`,
        ),
      ).toBe(true);
    },
  );
});

import { type TimestampFormat } from "./appSettings";

export function getTimestampFormatOptions(
  timestampFormat: TimestampFormat,
  includeSeconds: boolean,
): Intl.DateTimeFormatOptions {
  const baseOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  };

  if (timestampFormat === "locale") {
    return baseOptions;
  }

  return {
    ...baseOptions,
    hour12: timestampFormat === "12-hour",
  };
}

const timestampFormatterCache = new Map<string, Intl.DateTimeFormat>();
const calendarDateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimestampFormatter(
  timestampFormat: TimestampFormat,
  includeSeconds: boolean,
): Intl.DateTimeFormat {
  const cacheKey = `${timestampFormat}:${includeSeconds ? "seconds" : "minutes"}`;
  const cachedFormatter = timestampFormatterCache.get(cacheKey);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat(
    undefined,
    getTimestampFormatOptions(timestampFormat, includeSeconds),
  );
  timestampFormatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatTimestamp(isoDate: string, timestampFormat: TimestampFormat): string {
  return getTimestampFormatter(timestampFormat, true).format(new Date(isoDate));
}

export function formatShortTimestamp(isoDate: string, timestampFormat: TimestampFormat): string {
  return getTimestampFormatter(timestampFormat, false).format(new Date(isoDate));
}

function getCalendarDateFormatter(kind: "weekday" | "date" | "date-year"): Intl.DateTimeFormat {
  const cachedFormatter = calendarDateFormatterCache.get(kind);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat(
    undefined,
    kind === "weekday"
      ? { weekday: "long" }
      : {
          month: "short",
          day: "numeric",
          ...(kind === "date-year" ? { year: "numeric" } : {}),
        },
  );
  calendarDateFormatterCache.set(kind, formatter);
  return formatter;
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function calendarDaysBetween(earlier: Date, later: Date): number {
  const earlierMidnight = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const laterMidnight = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((laterMidnight.getTime() - earlierMidnight.getTime()) / 86_400_000);
}

/**
 * Keeps recent transcript timestamps compact without making older messages
 * ambiguous. Calendar-day comparisons are local-time based so a message from
 * just before midnight reads as yesterday even when less than 24 hours old.
 */
export function formatDayAwareTimestamp(
  isoDate: string,
  timestampFormat: TimestampFormat,
  now: Date = new Date(),
): string {
  const timestamp = new Date(isoDate);
  const time = formatShortTimestamp(isoDate, timestampFormat);

  if (isSameCalendarDay(timestamp, now)) {
    return time;
  }

  const daysAgo = calendarDaysBetween(timestamp, now);
  const date = getCalendarDateFormatter(
    daysAgo >= 1 && daysAgo <= 6
      ? "weekday"
      : timestamp.getFullYear() === now.getFullYear()
        ? "date"
        : "date-year",
  ).format(timestamp);

  return `${date}, ${time}`;
}

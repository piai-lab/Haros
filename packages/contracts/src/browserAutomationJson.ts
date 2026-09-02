import { Schema } from "effect";

import { utf8ByteLength } from "./browserAutomationBounds";

export const browserJsonDepth = (value: unknown, depth = 0): number => {
  if (value === null || typeof value !== "object") return depth;
  if (depth > 20) return depth;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return children.reduce(
    (maximum, child) => Math.max(maximum, browserJsonDepth(child, depth + 1)),
    depth,
  );
};

export const browserJsonBytes = (value: unknown): number => {
  try {
    return utf8ByteLength(JSON.stringify(value));
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

export const BrowserBoundedJson = Schema.Json.check(
  Schema.makeFilter(
    (value: Schema.Json) => browserJsonDepth(value) <= 20 && browserJsonBytes(value) <= 262_144,
  ),
);

export const BrowserBoundedJsonObject = BrowserBoundedJson.check(
  Schema.makeFilter(
    (value: Schema.Json) => value !== null && typeof value === "object" && !Array.isArray(value),
  ),
);

export type BrowserBoundedJson = typeof BrowserBoundedJson.Type;
export type BrowserBoundedJsonObject = typeof BrowserBoundedJsonObject.Type;

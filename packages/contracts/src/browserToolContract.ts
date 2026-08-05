import { Schema } from "effect";

export function strictBrowserStruct<Fields extends Schema.Struct.Fields>(fields: Fields) {
  return Schema.Struct(fields).annotate({ parseOptions: { onExcessProperty: "error" } });
}

export function boundedBrowserInteger(minimum: number, maximum: number) {
  return Schema.Int.check(Schema.isBetween({ minimum, maximum }));
}

export const BrowserLoadState = Schema.Literals([
  "commit",
  "domcontentloaded",
  "load",
  "networkidle",
]);

export type BrowserLoadState = typeof BrowserLoadState.Type;

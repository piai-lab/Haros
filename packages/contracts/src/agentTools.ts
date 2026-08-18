import { Schema } from "effect";

import { NonNegativeInt } from "./baseSchemas";

export const BUILT_IN_TOOL_GROUP_IDS = ["omnimind", "browser", "device"] as const;

export const BuiltInToolGroupId = Schema.Literals(BUILT_IN_TOOL_GROUP_IDS);
export type BuiltInToolGroupId = typeof BuiltInToolGroupId.Type;

export const BuiltInToolGroupAvailability = Schema.Literals([
  "available",
  "degraded",
  "unavailable",
]);
export type BuiltInToolGroupAvailability = typeof BuiltInToolGroupAvailability.Type;

export const BuiltInToolGroup = Schema.Struct({
  id: BuiltInToolGroupId,
  toolCount: NonNegativeInt,
  availableToolCount: NonNegativeInt,
  availability: BuiltInToolGroupAvailability,
  enabled: Schema.Boolean,
  effective: Schema.Boolean,
});
export type BuiltInToolGroup = typeof BuiltInToolGroup.Type;

export const BuiltInToolGroups = Schema.Array(BuiltInToolGroup);
export type BuiltInToolGroups = typeof BuiltInToolGroups.Type;

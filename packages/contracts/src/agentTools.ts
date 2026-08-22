import { Schema } from "effect";

import { NonNegativeInt } from "./baseSchemas";

export const BUILT_IN_TOOL_GROUP_IDS = [
  "tasks",
  "diagnostics",
  "goals",
  "automations",
  "browser",
  "device",
] as const;

export const BuiltInToolGroupId = Schema.Literals(BUILT_IN_TOOL_GROUP_IDS);
export type BuiltInToolGroupId = typeof BuiltInToolGroupId.Type;

export const BUILT_IN_TOOL_SURFACES = ["agent", "chat", "studio"] as const;
export const BuiltInToolSurface = Schema.Literals(BUILT_IN_TOOL_SURFACES);
export type BuiltInToolSurface = typeof BuiltInToolSurface.Type;

export const BuiltInToolGroupOverrideKey = Schema.String.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-z0-9-]+$/u),
);
export type BuiltInToolGroupOverrideKey = typeof BuiltInToolGroupOverrideKey.Type;

// One surface may need to preserve all 32 bounded legacy unknown ids plus the
// six currently known groups during the one-time settings migration.
export const BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS = 40;

export const BuiltInToolGroupOverrideMap = Schema.Record(
  BuiltInToolGroupOverrideKey,
  Schema.Boolean,
).check(
  Schema.makeFilter((value) => Object.keys(value).length <= BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS, {
    message: `built-in tool surface overrides must contain at most ${BUILT_IN_TOOL_GROUP_OVERRIDE_MAX_KEYS} group keys`,
  }),
);
export type BuiltInToolGroupOverrideMap = typeof BuiltInToolGroupOverrideMap.Type;

export const BuiltInToolGroupOverrides = Schema.Struct({
  agent: Schema.optionalKey(BuiltInToolGroupOverrideMap),
  chat: Schema.optionalKey(BuiltInToolGroupOverrideMap),
  studio: Schema.optionalKey(BuiltInToolGroupOverrideMap),
});
export type BuiltInToolGroupOverrides = typeof BuiltInToolGroupOverrides.Type;

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
  surfaces: Schema.Record(
    BuiltInToolSurface,
    Schema.Struct({
      supported: Schema.Boolean,
      defaultEnabled: Schema.Boolean,
      configuredEnabled: Schema.Boolean,
      effective: Schema.Boolean,
    }),
  ),
});
export type BuiltInToolGroup = typeof BuiltInToolGroup.Type;

export const BuiltInToolGroups = Schema.Array(BuiltInToolGroup);
export type BuiltInToolGroups = typeof BuiltInToolGroups.Type;

export const BuiltInToolGroupsResult = Schema.Struct({
  settingsRevision: NonNegativeInt,
  builtInGroupOverrides: BuiltInToolGroupOverrides,
  groups: BuiltInToolGroups,
});
export type BuiltInToolGroupsResult = typeof BuiltInToolGroupsResult.Type;

import {
  BUILT_IN_TOOL_GROUP_IDS,
  type BuiltInToolGroupId,
  type BuiltInToolGroupOverrides,
} from "@harnessos/contracts";

import type { ProductSurface } from "./productSurface";

export interface HostGroupSurfacePolicy {
  readonly supported: boolean;
  readonly defaultEnabled: boolean;
}

export const HOST_GROUP_SURFACE_POLICY = {
  tasks: {
    agent: { supported: true, defaultEnabled: true },
    chat: { supported: false, defaultEnabled: false },
    studio: { supported: true, defaultEnabled: true },
  },
  diagnostics: {
    agent: { supported: true, defaultEnabled: true },
    chat: { supported: false, defaultEnabled: false },
    studio: { supported: true, defaultEnabled: true },
  },
  goals: {
    agent: { supported: true, defaultEnabled: true },
    chat: { supported: true, defaultEnabled: false },
    studio: { supported: true, defaultEnabled: true },
  },
  automations: {
    agent: { supported: true, defaultEnabled: true },
    chat: { supported: true, defaultEnabled: false },
    studio: { supported: true, defaultEnabled: true },
  },
  browser: {
    agent: { supported: true, defaultEnabled: true },
    chat: { supported: true, defaultEnabled: true },
    studio: { supported: true, defaultEnabled: true },
  },
  device: {
    agent: { supported: true, defaultEnabled: false },
    chat: { supported: true, defaultEnabled: false },
    studio: { supported: true, defaultEnabled: false },
  },
} as const satisfies Record<BuiltInToolGroupId, Record<ProductSurface, HostGroupSurfacePolicy>>;

export function isBuiltInToolGroupId(value: string): value is BuiltInToolGroupId {
  return (BUILT_IN_TOOL_GROUP_IDS as readonly string[]).includes(value);
}

export function resolveHostGroupSurfacePolicy(
  group: BuiltInToolGroupId,
  surface: ProductSurface,
): HostGroupSurfacePolicy {
  return HOST_GROUP_SURFACE_POLICY[group][surface];
}

export function configuredHostGroupEnabled(input: {
  readonly group: BuiltInToolGroupId;
  readonly surface: ProductSurface;
  readonly overrides: BuiltInToolGroupOverrides;
}): boolean {
  const policy = resolveHostGroupSurfacePolicy(input.group, input.surface);
  if (!policy.supported) return false;
  const surfaceOverrides = input.overrides[input.surface];
  return surfaceOverrides && Object.hasOwn(surfaceOverrides, input.group)
    ? surfaceOverrides[input.group] === true
    : policy.defaultEnabled;
}

export function hostGroupEffective(input: {
  readonly group: BuiltInToolGroupId;
  readonly surface: ProductSurface;
  readonly overrides: BuiltInToolGroupOverrides;
  readonly available: boolean;
}): boolean {
  return input.available && configuredHostGroupEnabled(input);
}

import {
  BUILT_IN_TOOL_SURFACES,
  type BuiltInToolGroupOverrides,
  type ModelSelection,
  type ProviderStartOptions,
  type ServerSettings,
  type ServerSettingsPatch,
  type ServerSettingsView,
} from "@harnessos/contracts";
import { deepMerge, type DeepPartial } from "./Struct";
import { isBuiltInToolGroupId, resolveHostGroupSurfacePolicy } from "./hostToolSurfacePolicy";
import { getDefaultModel } from "./model";

function shouldReplaceTextGenerationModelSelection(
  patch: ServerSettingsPatch["textGenerationModelSelection"] | undefined,
): boolean {
  return Boolean(patch && (patch.provider !== undefined || patch.model !== undefined));
}

export function validateServerSettingsPatch(
  current: ServerSettings,
  patch: ServerSettingsPatch,
): string | null {
  const selectionPatch = patch.textGenerationModelSelection;
  if (
    selectionPatch?.provider !== undefined &&
    selectionPatch.provider !== current.textGenerationModelSelection.provider &&
    getDefaultModel(selectionPatch.provider) === null &&
    selectionPatch.model === undefined
  ) {
    return `text generation provider ${selectionPatch.provider} requires an explicit model when changing providers`;
  }
  const overrides = patch.agentTools?.builtInGroupOverrides;
  if (overrides !== undefined) {
    for (const surface of BUILT_IN_TOOL_SURFACES) {
      const currentSurface = current.agentTools.builtInGroupOverrides[surface];
      const nextSurface = overrides[surface];
      if (!nextSurface) continue;
      for (const [group, value] of Object.entries(nextSurface)) {
        if (!isBuiltInToolGroupId(group)) continue;
        if (resolveHostGroupSurfacePolicy(group, surface).supported) continue;
        const existed = currentSurface !== undefined && Object.hasOwn(currentSurface, group);
        if (!existed || currentSurface[group] !== value) {
          return `built-in tool group ${group} is unsupported on ${surface}`;
        }
      }
    }
  }
  return null;
}

export function normalizeBuiltInGroupOverrides(
  overrides: BuiltInToolGroupOverrides,
): BuiltInToolGroupOverrides {
  const normalized: Partial<
    Record<(typeof BUILT_IN_TOOL_SURFACES)[number], Record<string, boolean>>
  > = {};
  for (const surface of BUILT_IN_TOOL_SURFACES) {
    const values = overrides[surface];
    if (!values) continue;
    const entries = Object.entries(values).toSorted(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    if (entries.length === 0) continue;
    const surfaceValues: Record<string, boolean> = {};
    for (const [key, value] of entries) {
      if (!Object.hasOwn(values, key)) continue;
      surfaceValues[key] = value;
    }
    normalized[surface] = surfaceValues;
  }
  return normalized;
}

export function normalizeServerSettings(settings: ServerSettings): ServerSettings {
  return {
    ...settings,
    agentTools: {
      ...settings.agentTools,
      builtInGroupOverrides: normalizeBuiltInGroupOverrides(
        settings.agentTools.builtInGroupOverrides,
      ),
    },
  };
}

export function applyServerSettingsPatch(
  current: ServerSettings,
  patch: ServerSettingsPatch,
): ServerSettings {
  const selectionPatch = patch.textGenerationModelSelection;
  const merged = deepMerge(current, patch as DeepPartial<ServerSettings>);
  const next = normalizeServerSettings(
    patch.agentTools?.builtInGroupOverrides === undefined
      ? merged
      : {
          ...merged,
          agentTools: {
            ...merged.agentTools,
            builtInGroupOverrides: patch.agentTools.builtInGroupOverrides,
          },
        },
  );
  if (!selectionPatch) {
    return next;
  }
  if (validateServerSettingsPatch(current, patch) !== null) {
    return normalizeServerSettings({
      ...next,
      textGenerationModelSelection: current.textGenerationModelSelection,
    });
  }

  const provider = selectionPatch.provider ?? current.textGenerationModelSelection.provider;
  const providerDefaultModel = selectionPatch.provider
    ? getDefaultModel(selectionPatch.provider)
    : null;
  const model =
    selectionPatch.model ??
    (selectionPatch.provider !== undefined &&
    providerDefaultModel !== null &&
    selectionPatch.provider !== current.textGenerationModelSelection.provider
      ? providerDefaultModel
      : current.textGenerationModelSelection.model);
  const options = shouldReplaceTextGenerationModelSelection(selectionPatch)
    ? selectionPatch.options
    : (selectionPatch.options ?? current.textGenerationModelSelection.options);

  return normalizeServerSettings({
    ...next,
    textGenerationModelSelection: {
      provider,
      model,
      ...(options !== undefined ? { options } : {}),
    } as ModelSelection,
  });
}

/** Server-owned launch options derived from the persisted non-secret settings snapshot. */
export function providerStartOptionsFromServerSettings(
  settings: Pick<ServerSettingsView, "providers">,
): ProviderStartOptions {
  const { providers } = settings;
  return {
    omnimind: {},
    codex: {
      ...(providers.codex.binaryPath ? { binaryPath: providers.codex.binaryPath } : {}),
      ...(providers.codex.homePath ? { homePath: providers.codex.homePath } : {}),
    },
    claudeAgent: {
      ...(providers.claudeAgent.binaryPath ? { binaryPath: providers.claudeAgent.binaryPath } : {}),
    },
    cursor: {
      ...(providers.cursor.binaryPath ? { binaryPath: providers.cursor.binaryPath } : {}),
      ...(providers.cursor.apiEndpoint ? { apiEndpoint: providers.cursor.apiEndpoint } : {}),
    },
    antigravity: {
      ...(providers.antigravity.binaryPath ? { binaryPath: providers.antigravity.binaryPath } : {}),
    },
    grok: {
      ...(providers.grok.binaryPath ? { binaryPath: providers.grok.binaryPath } : {}),
    },
    droid: {
      ...(providers.droid.binaryPath ? { binaryPath: providers.droid.binaryPath } : {}),
    },
    kilo: {
      ...(providers.kilo.binaryPath ? { binaryPath: providers.kilo.binaryPath } : {}),
      ...(providers.kilo.serverUrl ? { serverUrl: providers.kilo.serverUrl } : {}),
    },
    opencode: {
      ...(providers.opencode.binaryPath ? { binaryPath: providers.opencode.binaryPath } : {}),
      ...(providers.opencode.serverUrl ? { serverUrl: providers.opencode.serverUrl } : {}),
      experimentalWebSockets: providers.opencode.experimentalWebSockets,
    },
    pi: {
      ...(providers.pi.binaryPath ? { binaryPath: providers.pi.binaryPath } : {}),
      ...(providers.pi.agentDir ? { agentDir: providers.pi.agentDir } : {}),
    },
  };
}

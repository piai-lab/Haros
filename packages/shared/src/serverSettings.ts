import {
  BUILT_IN_TOOL_SURFACES,
  type BuiltInToolGroupOverrides,
  type EngineSelection,
  type EngineStartOptions,
  type ServerSettings,
  type ServerSettingsPatch,
  type ServerSettingsView,
} from "@harnessos/contracts";
import { deepMerge, type DeepPartial } from "./Struct";
import { isBuiltInToolGroupId, resolveHostGroupSurfacePolicy } from "./hostToolSurfacePolicy";
import { getDefaultModel } from "./model";

function shouldReplaceTextGenerationEngineSelection(
  patch: ServerSettingsPatch["textGenerationEngineSelection"] | undefined,
): boolean {
  return Boolean(patch && (patch.engine !== undefined || patch.model !== undefined));
}

export function validateServerSettingsPatch(
  current: ServerSettings,
  patch: ServerSettingsPatch,
): string | null {
  const selectionPatch = patch.textGenerationEngineSelection;
  if (
    selectionPatch?.engine !== undefined &&
    selectionPatch.engine !== current.textGenerationEngineSelection.engine &&
    getDefaultModel(selectionPatch.engine) === null &&
    selectionPatch.model === undefined
  ) {
    return `text generation engine ${selectionPatch.engine} requires an explicit model when changing engines`;
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
  const selectionPatch = patch.textGenerationEngineSelection;
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
      textGenerationEngineSelection: current.textGenerationEngineSelection,
    });
  }

  const engine = selectionPatch.engine ?? current.textGenerationEngineSelection.engine;
  const providerDefaultModel = selectionPatch.engine
    ? getDefaultModel(selectionPatch.engine)
    : null;
  const model =
    selectionPatch.model ??
    (selectionPatch.engine !== undefined &&
    providerDefaultModel !== null &&
    selectionPatch.engine !== current.textGenerationEngineSelection.engine
      ? providerDefaultModel
      : current.textGenerationEngineSelection.model);
  const options = shouldReplaceTextGenerationEngineSelection(selectionPatch)
    ? selectionPatch.options
    : (selectionPatch.options ?? current.textGenerationEngineSelection.options);

  return normalizeServerSettings({
    ...next,
    textGenerationEngineSelection: {
      engine,
      model,
      ...(options !== undefined ? { options } : {}),
    } as EngineSelection,
  });
}

/** Server-owned launch options derived from the persisted non-secret settings snapshot. */
export function providerStartOptionsFromServerSettings(
  settings: Pick<ServerSettingsView, "engines">,
): EngineStartOptions {
  const { engines } = settings;
  return {
    oa: {},
    codex: {
      ...(engines.codex.binaryPath ? { binaryPath: engines.codex.binaryPath } : {}),
      ...(engines.codex.homePath ? { homePath: engines.codex.homePath } : {}),
    },
    claude: {
      ...(engines.claude.binaryPath ? { binaryPath: engines.claude.binaryPath } : {}),
    },
    cursor: {
      ...(engines.cursor.binaryPath ? { binaryPath: engines.cursor.binaryPath } : {}),
      ...(engines.cursor.apiEndpoint ? { apiEndpoint: engines.cursor.apiEndpoint } : {}),
    },
    antigravity: {
      ...(engines.antigravity.binaryPath ? { binaryPath: engines.antigravity.binaryPath } : {}),
    },
    grok: {
      ...(engines.grok.binaryPath ? { binaryPath: engines.grok.binaryPath } : {}),
    },
    droid: {
      ...(engines.droid.binaryPath ? { binaryPath: engines.droid.binaryPath } : {}),
    },
    kilo: {
      ...(engines.kilo.binaryPath ? { binaryPath: engines.kilo.binaryPath } : {}),
      ...(engines.kilo.serverUrl ? { serverUrl: engines.kilo.serverUrl } : {}),
    },
    opencode: {
      ...(engines.opencode.binaryPath ? { binaryPath: engines.opencode.binaryPath } : {}),
      ...(engines.opencode.serverUrl ? { serverUrl: engines.opencode.serverUrl } : {}),
      experimentalWebSockets: engines.opencode.experimentalWebSockets,
    },
    pi: {
      ...(engines.pi.binaryPath ? { binaryPath: engines.pi.binaryPath } : {}),
      ...(engines.pi.agentDir ? { agentDir: engines.pi.agentDir } : {}),
    },
  };
}

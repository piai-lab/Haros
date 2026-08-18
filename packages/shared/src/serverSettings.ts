import {
  type ModelSelection,
  type ProviderStartOptions,
  type ServerSettings,
  type ServerSettingsPatch,
} from "@omnimind/contracts";
import { deepMerge, type DeepPartial } from "./Struct";
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
  return null;
}

export function normalizeDisabledBuiltInGroups(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => (left < right ? -1 : left > right ? 1 : 0),
  );
}

export function normalizeServerSettings(settings: ServerSettings): ServerSettings {
  return {
    ...settings,
    agentTools: {
      ...settings.agentTools,
      disabledBuiltInGroups: normalizeDisabledBuiltInGroups(
        settings.agentTools.disabledBuiltInGroups,
      ),
    },
  };
}

export function applyServerSettingsPatch(
  current: ServerSettings,
  patch: ServerSettingsPatch,
): ServerSettings {
  const selectionPatch = patch.textGenerationModelSelection;
  const next = normalizeServerSettings(deepMerge(current, patch as DeepPartial<ServerSettings>));
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
  settings: ServerSettings,
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

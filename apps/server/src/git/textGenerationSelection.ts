import type { EngineSelection, EngineKind, EngineStartOptions } from "@harnessos/contracts";

export interface TextGenerationEngineInput {
  readonly engineSelection: EngineSelection;
  readonly engineOptions?: EngineStartOptions;
  readonly codexHomePath?: string;
}

export function hasDedicatedTextGenerationEngine(engine: EngineKind | undefined): boolean {
  return engine === "codex" || engine === "cursor" || engine === "kilo" || engine === "opencode";
}

export function resolveTextGenerationInputForSelection(
  engineSelection: EngineSelection | undefined,
  engineOptions: EngineStartOptions | undefined,
): TextGenerationEngineInput | null {
  if (!engineSelection || !hasDedicatedTextGenerationEngine(engineSelection.engine)) {
    return null;
  }

  if (engineSelection.engine === "codex") {
    return {
      engineSelection,
      ...(engineOptions ? { engineOptions } : {}),
      ...(engineOptions?.codex?.homePath ? { codexHomePath: engineOptions.codex.homePath } : {}),
    };
  }

  return {
    engineSelection,
    ...(engineOptions ? { engineOptions } : {}),
  };
}

export function buildGitTextGenerationCallInput(input: {
  readonly textGenerationModel?: string | undefined;
  readonly textGenerationEngineSelection?: EngineSelection | undefined;
  readonly codexHomePath?: string | undefined;
  readonly engineOptions?: EngineStartOptions | undefined;
}): {
  readonly model?: string;
  readonly engineSelection?: EngineSelection;
  readonly codexHomePath?: string;
  readonly engineOptions?: EngineStartOptions;
} {
  const engineSelection = input.textGenerationEngineSelection;
  const model = input.textGenerationModel?.trim() || engineSelection?.model;

  return {
    ...(model ? { model } : {}),
    ...(engineSelection ? { engineSelection } : {}),
    ...(input.codexHomePath ? { codexHomePath: input.codexHomePath } : {}),
    ...(input.engineOptions ? { engineOptions: input.engineOptions } : {}),
  };
}

import type {
  EngineComposerCapabilities,
  EngineGetComposerCapabilitiesInput,
  EngineListAgentsInput,
  EngineListAgentsResult,
  EngineListCommandsInput,
  EngineListCommandsResult,
  EngineListModelsInput,
  EngineListModelsResult,
  EngineListPluginsInput,
  EngineListPluginsResult,
  EngineListSkillsInput,
  EngineListSkillsResult,
  EngineReadPluginInput,
  EngineReadPluginResult,
} from "@harnessos/contracts";
import { ServiceMap } from "effect";
import type { Effect } from "effect";

import type {
  EngineAdapterError,
  EngineUnsupportedError,
  EngineValidationError,
} from "../Errors.ts";

export type EngineDiscoveryError =
  | EngineValidationError
  | EngineUnsupportedError
  | EngineAdapterError;

export interface EngineDiscoveryServiceShape {
  readonly getComposerCapabilities: (
    input: EngineGetComposerCapabilitiesInput,
  ) => Effect.Effect<EngineComposerCapabilities, EngineDiscoveryError>;
  readonly listCommands: (
    input: EngineListCommandsInput,
  ) => Effect.Effect<EngineListCommandsResult, EngineDiscoveryError>;
  readonly listSkills: (
    input: EngineListSkillsInput,
  ) => Effect.Effect<EngineListSkillsResult, EngineDiscoveryError>;
  readonly listPlugins: (
    input: EngineListPluginsInput,
  ) => Effect.Effect<EngineListPluginsResult, EngineDiscoveryError>;
  readonly readPlugin: (
    input: EngineReadPluginInput,
  ) => Effect.Effect<EngineReadPluginResult, EngineDiscoveryError>;
  readonly listModels: (
    input: EngineListModelsInput,
  ) => Effect.Effect<EngineListModelsResult, EngineDiscoveryError>;
  readonly listAgents: (
    input: EngineListAgentsInput,
  ) => Effect.Effect<EngineListAgentsResult, EngineDiscoveryError>;
}

export class EngineDiscoveryService extends ServiceMap.Service<
  EngineDiscoveryService,
  EngineDiscoveryServiceShape
>()("harnessos/engine/Services/EngineDiscoveryService") {}

import type {
  OAAgentPromptGetSnapshotInput,
  OAAgentPromptMutationInput,
  OAAgentPromptMutationResult,
  OAAgentPromptSnapshot,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OAAgentPromptFilesShape {
  readonly getSnapshot: (
    input?: OAAgentPromptGetSnapshotInput,
  ) => Effect.Effect<OAAgentPromptSnapshot, Error>;
  readonly mutate: (
    input: OAAgentPromptMutationInput,
  ) => Effect.Effect<OAAgentPromptMutationResult, Error>;
}

export class OAAgentPromptFiles extends ServiceMap.Service<
  OAAgentPromptFiles,
  OAAgentPromptFilesShape
>()("harnessos/provider/Services/OAAgentPromptFiles") {}

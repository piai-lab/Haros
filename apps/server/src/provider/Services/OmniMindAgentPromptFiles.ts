import type {
  OmniMindAgentPromptGetSnapshotInput,
  OmniMindAgentPromptMutationInput,
  OmniMindAgentPromptMutationResult,
  OmniMindAgentPromptSnapshot,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OmniMindAgentPromptFilesShape {
  readonly getSnapshot: (
    input?: OmniMindAgentPromptGetSnapshotInput,
  ) => Effect.Effect<OmniMindAgentPromptSnapshot, Error>;
  readonly mutate: (
    input: OmniMindAgentPromptMutationInput,
  ) => Effect.Effect<OmniMindAgentPromptMutationResult, Error>;
}

export class OmniMindAgentPromptFiles extends ServiceMap.Service<
  OmniMindAgentPromptFiles,
  OmniMindAgentPromptFilesShape
>()("harnessos/provider/Services/OmniMindAgentPromptFiles") {}

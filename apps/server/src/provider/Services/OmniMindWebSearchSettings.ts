import type {
  OmniMindWebSearchGeminiDiagnosticInput,
  OmniMindWebSearchGeminiDiagnosticResult,
  OmniMindWebSearchMutationInput,
  OmniMindWebSearchMutationResult,
  OmniMindWebSearchProbeResult,
  OmniMindWebSearchProviderTestInput,
  OmniMindWebSearchReadResult,
  OmniMindWebSearchRecheckInput,
  OmniMindWebSearchRefreshInput,
} from "@harnessos/contracts";
import type { EditorId } from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OmniMindWebSearchSettingsShape {
  readonly open: () => Effect.Effect<OmniMindWebSearchReadResult, Error>;
  readonly refresh: (
    input?: OmniMindWebSearchRefreshInput,
  ) => Effect.Effect<OmniMindWebSearchReadResult, Error>;
  readonly mutate: (
    input: OmniMindWebSearchMutationInput,
  ) => Effect.Effect<OmniMindWebSearchMutationResult, Error>;
  readonly testProvider: (
    input: OmniMindWebSearchProviderTestInput,
    requestScope: string,
  ) => Effect.Effect<OmniMindWebSearchProbeResult, Error>;
  readonly recheck: (
    input: OmniMindWebSearchRecheckInput,
    requestScope: string,
  ) => Effect.Effect<OmniMindWebSearchProbeResult, Error>;
  readonly diagnoseGemini: (
    input: OmniMindWebSearchGeminiDiagnosticInput,
  ) => Effect.Effect<OmniMindWebSearchGeminiDiagnosticResult, Error>;
  /** Server-only action: the Renderer never receives the canonical path. */
  readonly openConfig: (editor: EditorId) => Effect.Effect<void, Error>;
}

export class OmniMindWebSearchSettings extends ServiceMap.Service<
  OmniMindWebSearchSettings,
  OmniMindWebSearchSettingsShape
>()("harnessos/provider/Services/OmniMindWebSearchSettings") {}

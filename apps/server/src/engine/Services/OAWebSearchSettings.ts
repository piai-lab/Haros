import type {
  OAWebSearchGeminiDiagnosticInput,
  OAWebSearchGeminiDiagnosticResult,
  OAWebSearchMutationInput,
  OAWebSearchMutationResult,
  OAWebSearchProbeResult,
  OAWebSearchProviderTestInput,
  OAWebSearchReadResult,
  OAWebSearchRecheckInput,
  OAWebSearchRefreshInput,
} from "@harnessos/contracts";
import type { EditorId } from "@harnessos/contracts";
import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface OAWebSearchSettingsShape {
  readonly open: () => Effect.Effect<OAWebSearchReadResult, Error>;
  readonly refresh: (
    input?: OAWebSearchRefreshInput,
  ) => Effect.Effect<OAWebSearchReadResult, Error>;
  readonly mutate: (
    input: OAWebSearchMutationInput,
  ) => Effect.Effect<OAWebSearchMutationResult, Error>;
  readonly testProvider: (
    input: OAWebSearchProviderTestInput,
    requestScope: string,
  ) => Effect.Effect<OAWebSearchProbeResult, Error>;
  readonly recheck: (
    input: OAWebSearchRecheckInput,
    requestScope: string,
  ) => Effect.Effect<OAWebSearchProbeResult, Error>;
  readonly diagnoseGemini: (
    input: OAWebSearchGeminiDiagnosticInput,
  ) => Effect.Effect<OAWebSearchGeminiDiagnosticResult, Error>;
  /** Server-only action: the Renderer never receives the canonical path. */
  readonly openConfig: (editor: EditorId) => Effect.Effect<void, Error>;
}

export class OAWebSearchSettings extends ServiceMap.Service<
  OAWebSearchSettings,
  OAWebSearchSettingsShape
>()("harnessos/engine/Services/OAWebSearchSettings") {}

/**
 * EngineAdapter - Engine-specific runtime adapter contract.
 *
 * Defines the engine-native session/protocol operations that `EngineService`
 * routes to after resolving the target engine. Implementations should focus
 * on engine behavior only and avoid cross-engine orchestration concerns.
 *
 * @module EngineAdapter
 */
import type {
  ApprovalRequestId,
  CanonicalUserInputResponse,
  MessageDispatchOrigin,
  EngineApprovalDecision,
  EngineForkThreadInput,
  EngineForkThreadResult,
  EngineKind,
  EngineListAgentsInput,
  EngineListAgentsResult,
  EngineListCommandsInput,
  EngineListCommandsResult,
  EngineListModelsInput,
  EngineListModelsResult,
  EngineListPluginsInput,
  EngineListPluginsResult,
  EngineReadPluginInput,
  EngineReadPluginResult,
  EngineListSkillsResult,
  EngineListSkillsInput,
  EngineStartReviewInput,
  EngineRuntimeEvent,
  EngineInteractionMode,
  RuntimeMode,
  EngineSendTurnInput,
  EngineSteerTurnInput,
  EngineSession,
  EngineSessionStartInput,
  ServerVoicePrewarmInput,
  ServerVoicePrewarmResult,
  ServerVoiceTranscriptionInput,
  ServerVoiceTranscriptionResult,
  ThreadId,
  EngineTurnStartResult,
  TurnId,
} from "@harnessos/contracts";
import type { Effect } from "effect";
import type { Stream } from "effect";
import type { ProductSurface } from "@harnessos/shared/productSurface";

export type EngineSessionModelSwitchMode = "in-session" | "restart-session" | "unsupported";

/**
 * Per-adapter ingress budget. A bounded queue makes a slow durable consumer
 * apply backpressure to the engine instead of growing the process heap
 * without limit during a persistence outage.
 */
export const ENGINE_ADAPTER_RUNTIME_EVENT_BUFFER_CAPACITY = 2_048;

/**
 * Structured payload for steering a running subagent. Mirrors the turn-input
 * context fields so adapters can project attachments/skills/mentions into the
 * engine-native steering channel (which is typically text-only).
 */
export interface EngineSteerSubagentPayload {
  readonly input: string;
  readonly attachments?: EngineSendTurnInput["attachments"];
  readonly skills?: EngineSendTurnInput["skills"];
  readonly mentions?: EngineSendTurnInput["mentions"];
}
export type EngineConversationRollbackMode = "native" | "restart-session";
export type EngineSessionResourceReloadState = "reloaded" | "no_active_session" | "busy";

/** Server-internal dispatch truth; never crosses renderer RPC or persistence contracts. */
export interface EngineTurnDispatchContext {
  readonly turnKind: "user" | "goal-continuation";
  readonly dispatchOrigin: MessageDispatchOrigin;
  /** Authoritative, per-dispatch Product surface; never persisted in engine bindings. */
  readonly productSurface?: ProductSurface;
}

/** Canonical discovery trust resolved by the server from Thread -> Project.kind. */
export type EngineResourceDiscoveryScope =
  | { readonly kind: "global-only" }
  | { readonly kind: "project"; readonly authoritativeRoot: string };

/** Server-internal adapter admission. Public Engine RPC remains two-surface. */
export type EngineAdapterSessionStartInput = EngineSessionStartInput & {
  readonly productSurface?: ProductSurface;
};

export interface EngineAdapterCapabilities {
  /**
   * Declares whether changing the model on an existing session is supported.
   */
  readonly sessionModelSwitch: EngineSessionModelSwitchMode;
  /** Restart-session adapters cannot rewind engine history and must rebuild context locally. */
  readonly conversationRollback?: EngineConversationRollbackMode;
  readonly supportsSkillMentions?: boolean;
  readonly supportsSkillDiscovery?: boolean;
  readonly supportsNativeSlashCommandDiscovery?: boolean;
  readonly supportsPluginMentions?: boolean;
  readonly supportsPluginDiscovery?: boolean;
  readonly supportsRuntimeModelList?: boolean;
  readonly supportsThreadCompaction?: boolean;
  readonly supportsThreadImport?: boolean;
  readonly supportsTurnSteering?: boolean;
  /** Structurally executable modes for this exact adapter and Host bridge. */
  readonly supportedRuntimeModes?: ReadonlySet<RuntimeMode>;
  /** Structurally executable Product interaction modes for this adapter. */
  readonly supportedInteractionModes?: ReadonlySet<EngineInteractionMode>;
  /** True when `turn.diff.updated.payload.unifiedDiff` contains a parseable live patch. */
  readonly supportsLiveTurnDiffPatch?: boolean;
}

export interface EngineThreadTurnSnapshot {
  readonly id: TurnId;
  readonly items: ReadonlyArray<unknown>;
}

export interface EngineThreadSnapshot {
  readonly threadId: ThreadId;
  readonly turns: ReadonlyArray<EngineThreadTurnSnapshot>;
  readonly cwd?: string | null;
}

export interface EngineAdapterShape<TError> {
  /**
   * Engine kind implemented by this adapter.
   */
  readonly engine: EngineKind;
  readonly capabilities: EngineAdapterCapabilities;

  /**
   * Start a engine-backed session.
   */
  readonly startSession: (
    input: EngineAdapterSessionStartInput,
  ) => Effect.Effect<EngineSession, TError>;

  /**
   * Send a turn to an active engine session.
   */
  readonly sendTurn: (
    input: EngineSendTurnInput,
    dispatchContext?: EngineTurnDispatchContext,
  ) => Effect.Effect<EngineTurnStartResult, TError>;

  /**
   * Redirect an active turn toward a new prompt when the engine supports it.
   */
  readonly steerTurn?: (
    input: EngineSteerTurnInput,
  ) => Effect.Effect<EngineTurnStartResult, TError>;

  /**
   * Start a native engine review run when the adapter supports it.
   */
  readonly startReview?: (
    input: EngineStartReviewInput,
  ) => Effect.Effect<EngineTurnStartResult, TError>;

  /**
   * Interrupt an active turn.
   */
  readonly interruptTurn: (
    threadId: ThreadId,
    turnId?: TurnId,
    nativeThreadId?: string,
  ) => Effect.Effect<void, TError>;

  /**
   * Stop one engine-native background task when the adapter supports it.
   */
  readonly stopTask?: (threadId: ThreadId, taskId: string) => Effect.Effect<void, TError>;

  /**
   * Move one in-flight foreground task to the background when the adapter supports it.
   */
  readonly backgroundTask?: (threadId: ThreadId, toolUseId: string) => Effect.Effect<void, TError>;

  /**
   * Deliver a mid-task user message to a running subagent when the adapter supports it.
   */
  readonly steerSubagent?: (
    threadId: ThreadId,
    nativeThreadId: string,
    input: EngineSteerSubagentPayload,
  ) => Effect.Effect<void, TError>;

  /**
   * Respond to an interactive approval request.
   */
  readonly respondToRequest: (
    threadId: ThreadId,
    requestId: ApprovalRequestId,
    decision: EngineApprovalDecision,
  ) => Effect.Effect<void, TError>;

  /**
   * Respond to a structured user-input request.
   */
  readonly respondToUserInput: (
    threadId: ThreadId,
    requestId: ApprovalRequestId,
    response: CanonicalUserInputResponse,
  ) => Effect.Effect<void, TError>;

  /**
   * Stop one engine session.
   */
  /**
   * Stop and release every resource owned by a thread.
   *
   * This operation is idempotent: an already-stopped or unknown thread is a
   * successful no-op. Callers use it as a cleanup barrier after restarts, when
   * the persisted binding can outlive the adapter's in-memory session.
   */
  readonly stopSession: (threadId: ThreadId) => Effect.Effect<void, TError>;

  /** Reload resources on an already-live session without starting or recovering one. */
  readonly reloadSessionResources?: (
    threadId: ThreadId,
  ) => Effect.Effect<EngineSessionResourceReloadState, TError>;

  /**
   * List currently active engine sessions for this adapter.
   */
  readonly listSessions: () => Effect.Effect<ReadonlyArray<EngineSession>>;

  /**
   * Check whether this adapter owns an active session id.
   */
  readonly hasSession: (threadId: ThreadId) => Effect.Effect<boolean>;

  /**
   * Read a engine thread snapshot.
   */
  readonly readThread: (threadId: ThreadId) => Effect.Effect<EngineThreadSnapshot, TError>;

  /**
   * Read a persisted engine thread snapshot without requiring a local app thread binding.
   */
  readonly readExternalThread?: (input: {
    readonly externalThreadId: string;
    readonly cwd?: string;
  }) => Effect.Effect<EngineThreadSnapshot, TError>;

  /**
   * Roll back a engine thread by N turns.
   */
  readonly rollbackThread: (
    threadId: ThreadId,
    numTurns: number,
  ) => Effect.Effect<EngineThreadSnapshot, TError>;

  /**
   * Trigger engine-native context compaction for a thread when supported.
   */
  readonly compactThread?: (threadId: ThreadId) => Effect.Effect<void, TError>;

  /**
   * Fork one engine thread into another persisted thread cursor when supported.
   *
   * Adapters may omit this to signal that the caller should fall back to
   * conversation-history-only forking.
   */
  readonly forkThread?: (
    input: EngineForkThreadInput,
  ) => Effect.Effect<EngineForkThreadResult, TError>;

  /**
   * Stop all sessions owned by this adapter.
   */
  readonly stopAll: () => Effect.Effect<void, TError>;

  /**
   * Canonical runtime event stream emitted by this adapter.
   */
  readonly streamEvents: Stream.Stream<EngineRuntimeEvent>;

  /**
   * List skills available for a given cwd.
   */
  readonly listSkills?: (
    input: EngineListSkillsInput & {
      readonly resourceScope?: EngineResourceDiscoveryScope;
    },
  ) => Effect.Effect<EngineListSkillsResult, TError>;

  /**
   * List engine-native slash commands available for a given cwd.
   */
  readonly listCommands?: (
    input: EngineListCommandsInput & {
      readonly resourceScope?: EngineResourceDiscoveryScope;
    },
  ) => Effect.Effect<EngineListCommandsResult, TError>;

  /**
   * List plugins available for the current provider/runtime.
   */
  readonly listPlugins?: (
    input: EngineListPluginsInput,
  ) => Effect.Effect<EngineListPluginsResult, TError>;

  /**
   * Read one plugin in detail from a marketplace entry.
   */
  readonly readPlugin?: (
    input: EngineReadPluginInput,
  ) => Effect.Effect<EngineReadPluginResult, TError>;

  /**
   * List models directly from the engine runtime when supported.
   */
  readonly listModels?: (
    input: EngineListModelsInput,
  ) => Effect.Effect<EngineListModelsResult, TError>;

  /** Read engine-native account limits when the Engine protocol exposes them. */
  readonly readAccountRateLimits?: () => Effect.Effect<unknown, TError>;

  /**
   * List agents/subagents directly from the engine runtime when supported.
   */
  readonly listAgents?: (
    input: EngineListAgentsInput,
  ) => Effect.Effect<EngineListAgentsResult, TError>;

  /**
   * Warm engine state needed by voice transcription when supported.
   */
  readonly prewarmVoice?: (
    input: ServerVoicePrewarmInput,
  ) => Effect.Effect<ServerVoicePrewarmResult, TError>;

  /**
   * Transcribe one captured voice clip into plain text when supported.
   */
  readonly transcribeVoice?: (
    input: ServerVoiceTranscriptionInput,
  ) => Effect.Effect<ServerVoiceTranscriptionResult, TError>;
}

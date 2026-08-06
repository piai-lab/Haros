import { OpenCodeAcpSdkConnection, OpenCodeAcpError } from "./acpSdkConnection";
import { createOpenCodeChatScratch, type OpenCodeChatScratch } from "./chatScratch";
import { inspectOpenCodeInstallation, type OpenCodeInstallationEvidence } from "./installation";

const OPENCODE_POST_FINAL_NOTIFICATION_DRAIN_MS = 250;

export type OpenCodeReadinessReason =
  | "missing"
  | "version-mismatch"
  | "artifact-mismatch"
  | "process-unavailable"
  | "protocol-mismatch"
  | "initialize-failed"
  | "auth-required";

export type OpenCodeReadinessEvidence =
  | {
      readonly state: "available";
      readonly installation: Extract<OpenCodeInstallationEvidence, { readonly state: "available" }>;
    }
  | { readonly state: "unavailable"; readonly reason: OpenCodeReadinessReason };

export class OpenCodePreparationError extends Error {
  constructor(readonly reason: OpenCodeReadinessReason) {
    super(`OpenCode preparation is unavailable: ${reason}.`);
    this.name = "OpenCodePreparationError";
  }
}

class OpenCodeProtocolMismatchError extends Error {}

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const stringField = (value: unknown, key: string): string | null =>
  isObject(value) && typeof value[key] === "string" ? value[key] : null;
const objectField = (value: unknown, key: string): JsonObject | null =>
  isObject(value) && isObject(value[key]) ? value[key] : null;
const currentModelFromConfig = (value: unknown): string | null => {
  if (!isObject(value) || !Array.isArray(value.configOptions)) return null;
  for (const option of value.configOptions) {
    if (
      isObject(option) &&
      option.type === "select" &&
      option.category === "model" &&
      typeof option.currentValue === "string" &&
      option.currentValue.length > 0
    ) {
      return option.currentValue;
    }
  }
  return null;
};

export type OpenCodePromptFact =
  | { readonly kind: "message"; readonly messageId: string; readonly text: string }
  | { readonly kind: "thought"; readonly messageId: string; readonly text: string }
  | { readonly kind: "tool-started"; readonly toolCallId: string; readonly title: string }
  | {
      readonly kind: "tool-settled";
      readonly toolCallId: string;
      readonly title: string;
      readonly outcome: "succeeded" | "failed";
    }
  | { readonly kind: "plan"; readonly summary: string }
  | { readonly kind: "context-usage"; readonly used: number; readonly size: number }
  | { readonly kind: "permission-requested"; readonly toolCallId: string; readonly title: string }
  | {
      readonly kind: "permission-rejected";
      readonly toolCallId: string;
      readonly reason: "approval-ui-unavailable";
    };

export type OpenCodePromptResult =
  | {
      readonly state: "settled";
      readonly outcome: "succeeded" | "failed";
      readonly settledAt: string;
    }
  | { readonly state: "delivery_unknown" }
  | { readonly state: "outcome_unknown" };

export type PreparedOpenCodeSession = {
  readonly lineageRef: string;
  readonly runtimeModelId: string;
  readonly engineModeId: string | null;
  readonly prompt: (
    text: string,
    observer: (fact: OpenCodePromptFact) => void,
    markSent: () => Promise<void>,
  ) => Promise<OpenCodePromptResult>;
  readonly cancel: () => Promise<"requested" | "too-late">;
  readonly close: () => Promise<void>;
};

const boundedText = (value: unknown, maximum = 16_384): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= maximum ? value : null;
const finiteCounter = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const requireBounded = (value: unknown, label: string, maximum = 16_384): string => {
  const decoded = boundedText(value, maximum);
  if (!decoded) throw new Error(`OpenCode ACP emitted invalid ${label}.`);
  return decoded;
};

function mapPromptUpdate(update: unknown): OpenCodePromptFact | null {
  if (!isObject(update)) return null;
  const kind = stringField(update, "sessionUpdate");
  if (kind === "agent_message_chunk" || kind === "agent_thought_chunk") {
    const content = isObject(update.content) ? update.content : null;
    const text = requireBounded(content?.text, "message text");
    const messageId = requireBounded(update.messageId, "message identity", 1_024);
    return { kind: kind === "agent_message_chunk" ? "message" : "thought", messageId, text };
  }
  if (kind === "tool_call" || kind === "tool_call_update") {
    const toolCallId = requireBounded(update.toolCallId, "tool-call identity", 1_024);
    const title = requireBounded(update.title, "tool title", 512);
    if (kind === "tool_call") return { kind: "tool-started", toolCallId, title };
    const status = stringField(update, "status");
    if (status === "completed" || status === "failed") {
      return {
        kind: "tool-settled",
        toolCallId,
        title,
        outcome: status === "completed" ? "succeeded" : "failed",
      };
    }
  }
  if (kind === "plan") {
    if (
      !Array.isArray(update.entries) ||
      update.entries.length === 0 ||
      update.entries.length > 128
    )
      throw new Error("OpenCode ACP emitted an invalid plan.");
    const summary = update.entries
      .map((entry) => requireBounded(isObject(entry) ? entry.content : null, "plan entry", 1_024))
      .join("\n");
    if (summary.length > 16_384) throw new Error("OpenCode ACP plan exceeded the Product bound.");
    return { kind: "plan", summary };
  }
  if (kind === "usage_update") {
    const used = finiteCounter(update.used);
    const size = finiteCounter(update.size);
    if (used === null || size === null)
      throw new Error("OpenCode ACP emitted invalid context usage counters.");
    return { kind: "context-usage", used, size };
  }
  // available_commands_update and every unknown/raw update are intentionally diagnostic-only.
  return null;
}

export class OpenCodeExecutionBoundary {
  constructor(
    private readonly input: {
      readonly executable: string;
      readonly scratchBase: string;
      readonly environment?: NodeJS.ProcessEnv;
      readonly inspectInstallation?: () => Promise<OpenCodeInstallationEvidence>;
    },
  ) {}

  installation(): Promise<OpenCodeInstallationEvidence> {
    if (this.input.inspectInstallation) return this.input.inspectInstallation();
    return inspectOpenCodeInstallation({ executable: this.input.executable });
  }

  private async initialize(connection: OpenCodeAcpSdkConnection): Promise<void> {
    const initialized = await connection.initialize({
      protocolVersion: 1,
      clientCapabilities: { fs: {}, terminal: false },
      clientInfo: { name: "OmniMind", version: "0.1.0" },
    });
    const agent =
      isObject(initialized) && isObject(initialized.agentInfo) ? initialized.agentInfo : null;
    if (
      !isObject(initialized) ||
      initialized.protocolVersion !== 1 ||
      agent?.name !== "OpenCode" ||
      agent.version !== "1.14.40"
    ) {
      throw new OpenCodeProtocolMismatchError();
    }
  }

  private reasonFor(cause: unknown): OpenCodeReadinessReason {
    if (cause instanceof OpenCodeProtocolMismatchError) return "protocol-mismatch";
    if (cause instanceof OpenCodeAcpError) {
      if (cause.code === "ACP_AUTH_REQUIRED") return "auth-required";
      if (cause.code === "ACP_CLOSED" || cause.code === "ACP_WRITE_FAILED")
        return "process-unavailable";
    }
    return "initialize-failed";
  }

  async readiness(): Promise<OpenCodeReadinessEvidence> {
    const installation = await this.installation();
    if (installation.state !== "available") return installation;
    let scratch: OpenCodeChatScratch | null = null;
    let connection: OpenCodeAcpSdkConnection | null = null;
    try {
      scratch = await createOpenCodeChatScratch(this.input.scratchBase);
      connection = OpenCodeAcpSdkConnection.spawn({
        executable: installation.executable,
        cwd: scratch.directory,
        ...(this.input.environment ? { env: this.input.environment } : {}),
      });
      await this.initialize(connection);
      return { state: "available", installation };
    } catch (cause) {
      return { state: "unavailable", reason: this.reasonFor(cause) };
    } finally {
      await Promise.allSettled([connection?.close(), scratch?.close()]);
    }
  }

  async prepare(priorLineageRef: string | null = null): Promise<PreparedOpenCodeSession> {
    const installation = await this.installation();
    if (installation.state !== "available") {
      throw new OpenCodePreparationError(installation.reason);
    }
    const scratch = await createOpenCodeChatScratch(this.input.scratchBase);
    const connection = OpenCodeAcpSdkConnection.spawn({
      executable: installation.executable,
      cwd: scratch.directory,
      ...(this.input.environment ? { env: this.input.environment } : {}),
    });
    try {
      await this.initialize(connection);
      const session = priorLineageRef
        ? await connection.resumeSession({
            cwd: scratch.directory,
            mcpServers: [],
            sessionId: priorLineageRef,
          })
        : await connection.newSession({ cwd: scratch.directory, mcpServers: [] });
      const lineageRef = priorLineageRef ?? stringField(session, "sessionId");
      const models = objectField(session, "models");
      const modes = objectField(session, "modes");
      const runtimeModelId =
        currentModelFromConfig(session) ?? stringField(models, "currentModelId");
      if (!lineageRef || !runtimeModelId) {
        throw new Error("OpenCode ACP did not resolve its current Session model.");
      }
      return makePreparedSession({
        connection,
        scratch,
        lineageRef,
        runtimeModelId,
        engineModeId: stringField(modes, "currentModeId"),
      });
    } catch (cause) {
      await Promise.allSettled([connection.close(), scratch.close()]);
      throw cause instanceof OpenCodePreparationError
        ? cause
        : new OpenCodePreparationError(this.reasonFor(cause));
    }
  }
}

function makePreparedSession(input: {
  readonly connection: OpenCodeAcpSdkConnection;
  readonly scratch: OpenCodeChatScratch;
  readonly lineageRef: string;
  readonly runtimeModelId: string;
  readonly engineModeId: string | null;
}): PreparedOpenCodeSession {
  let inFlight = false;
  let promptUsed = false;
  let closed = false;
  let cancelWritten = false;
  let promptFinalReceived = false;
  return {
    lineageRef: input.lineageRef,
    runtimeModelId: input.runtimeModelId,
    engineModeId: input.engineModeId,
    prompt: async (text, observer, markSent) => {
      if (closed) throw new Error("The prepared OpenCode Session is closed.");
      if (promptUsed) {
        throw new Error(
          "A prepared OpenCode Session permits exactly one prompt; continuation requires a new prepared Session.",
        );
      }
      promptUsed = true;
      inFlight = true;
      promptFinalReceived = false;
      let observed = false;
      let lost = false;
      const failMalformed = () => {
        lost = true;
        void input.connection.close();
      };
      const removeNotification = input.connection.onSessionUpdate((notification) => {
        if (notification.sessionId !== input.lineageRef) return;
        let fact: OpenCodePromptFact | null;
        try {
          fact = mapPromptUpdate(notification.update);
        } catch {
          failMalformed();
          return;
        }
        if (!fact) return;
        observed = true;
        observer(fact);
      });
      const removeRequest = input.connection.onRequestPermission(async (request) => {
        const toolCall = isObject(request.toolCall) ? request.toolCall : null;
        const toolCallId = boundedText(toolCall?.toolCallId, 1_024);
        const title = boundedText(toolCall?.title, 512);
        if (!toolCallId || !title) {
          failMalformed();
          throw new Error("OpenCode ACP permission request was malformed.");
        }
        observed = true;
        observer({
          kind: "permission-requested",
          toolCallId,
          title,
        });
        observer({ kind: "permission-rejected", toolCallId, reason: "approval-ui-unavailable" });
        const reject = request.options.find(
          (option) => option.kind === "reject_once" || option.kind === "reject_always",
        );
        return reject
          ? { outcome: { outcome: "selected", optionId: reject.optionId } }
          : { outcome: { outcome: "cancelled" } };
      });
      const removeClose = input.connection.onClose(() => {
        lost = true;
      });
      try {
        await markSent();
        let result: Extract<OpenCodePromptResult, { readonly state: "settled" }>;
        try {
          await input.connection.prompt(
            { sessionId: input.lineageRef, prompt: [{ type: "text", text }] },
            10 * 60_000,
          );
          result = {
            state: "settled",
            outcome: "succeeded",
            settledAt: new Date().toISOString(),
          };
        } catch (cause) {
          if (
            lost ||
            (cause instanceof OpenCodeAcpError &&
              (cause.code === "ACP_CLOSED" ||
                cause.code === "ACP_WRITE_FAILED" ||
                cause.code === "ACP_REQUEST_TIMEOUT"))
          ) {
            return { state: observed ? "outcome_unknown" : "delivery_unknown" };
          }
          // A correlated JSON-RPC error is a failed settlement, not a transport unknown.
          result = {
            state: "settled",
            outcome: "failed",
            settledAt: new Date().toISOString(),
          };
        }

        // OpenCode's correlated final/error can overtake its global update stream. This bounded
        // grace is a mitigation, not a protocol barrier. Single-use prepared Sessions and process
        // disposal below prevent facts arriving after the grace from crossing into another Run.
        promptFinalReceived = true;
        observed = true;
        await new Promise<void>((resolve) =>
          setTimeout(resolve, OPENCODE_POST_FINAL_NOTIFICATION_DRAIN_MS),
        );
        return result;
      } finally {
        removeNotification();
        removeRequest();
        removeClose();
        await input.connection.close();
        inFlight = false;
      }
    },
    cancel: async () => {
      if (!inFlight || promptFinalReceived || cancelWritten || closed) return "too-late";
      cancelWritten = true;
      await input.connection.cancel(input.lineageRef);
      return "requested";
    },
    close: async () => {
      if (closed) return;
      closed = true;
      await input.connection.close();
      await input.scratch.close();
    },
  };
}

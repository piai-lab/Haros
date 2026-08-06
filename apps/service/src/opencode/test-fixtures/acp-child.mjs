#!/usr/bin/env node
import { Readable, Writable } from "node:stream";

import {
  PROTOCOL_VERSION,
  RequestError,
  agent,
  methods,
  ndJsonStream,
} from "@agentclientprotocol/sdk";

const mode = process.env.OMNIMIND_ACP_FIXTURE_MODE ?? "normal";
const sessionId = "opaque-session";
let finishCancelledPrompt;
let cancelRequested = false;
let promptCount = 0;

process.once("SIGTERM", () => process.exit(0));
process.once("SIGINT", () => process.exit(0));
if (mode === "malformed-frame") process.stdout.write(new Uint8Array([0xff, 0x0a]));
if (mode === "oversized-frame") process.stdout.write(`${"x".repeat(1024 * 1024 + 1)}\n`);
if (mode === "closed-process") process.exit(0);

const app = agent({ name: "omnimind-official-sdk-conformance-agent" })
  .onRequest(methods.agent.initialize, () => {
    if (mode === "slow-initialize") return new Promise(() => undefined);
    if (mode === "auth-required") {
      throw new RequestError(-32000, "private auth diagnostic", {
        credential: "must-not-cross",
      });
    }
    if (mode === "initialize-failed") {
      throw RequestError.internalError({ private: "must-not-cross" }, "private failure");
    }
    return {
      protocolVersion: mode === "protocol-mismatch" ? 999 : PROTOCOL_VERSION,
      agentCapabilities: { sessionCapabilities: { resume: {} } },
      agentInfo: { name: "OpenCode", version: "1.14.40" },
    };
  })
  .onRequest(methods.agent.session.new, async (context) => {
    if (mode === "auth-session") {
      throw new RequestError(-32000, "private session auth diagnostic", {
        credential: "must-not-cross",
      });
    }
    await context.client.notify(methods.client.session.update, {
      sessionId,
      update: { sessionUpdate: "available_commands_update", availableCommands: [] },
    });
    return {
      sessionId,
      configOptions: [
        {
          type: "select",
          id: "model",
          name: "Model",
          category: "model",
          currentValue: "provider/model",
          options: [{ value: "provider/model", name: "Fixture model" }],
        },
      ],
      modes: { currentModeId: "build", availableModes: [] },
    };
  })
  .onRequest(methods.agent.session.resume, () => ({
    configOptions: [
      {
        type: "select",
        id: "model",
        name: "Model",
        category: "model",
        currentValue: "provider/model",
        options: [{ value: "provider/model", name: "Fixture model" }],
      },
    ],
    modes: { currentModeId: "build", availableModes: [] },
  }))
  .onRequest(methods.agent.session.prompt, async (context) => {
    promptCount += 1;
    const notify = (update) =>
      context.client.notify(methods.client.session.update, {
        sessionId: context.params.sessionId,
        update,
      });
    if (mode === "correlated-error" || mode === "correlated-error-late-message") {
      if (mode === "correlated-error-late-message") {
        setTimeout(() => {
          void notify({
            sessionUpdate: "agent_message_chunk",
            messageId: "assistant-message-error",
            content: { type: "text", text: "visible-error-partial" },
          });
        }, 25);
      }
      throw RequestError.internalError(undefined, "fixture correlated error");
    }
    if (mode === "eof-before-fact") process.exit(0);
    if (mode === "malformed-product-fact") {
      await notify({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "missing identity" },
      });
      return new Promise(() => undefined);
    }
    if (mode === "oversized-product-fact") {
      await notify({
        sessionUpdate: "agent_message_chunk",
        messageId: "oversized",
        content: { type: "text", text: "x".repeat(16_385) },
      });
      return new Promise(() => undefined);
    }
    if (mode.startsWith("invalid-usage-")) {
      const update =
        mode === "invalid-usage-sentinel"
          ? {
              sessionUpdate: "usage_update",
              used: 1,
              privateSentinel: "OMNIMIND_ACP_PRIVATE_SENTINEL_7f3f9c",
              credential: "credential-private-value",
              path: "/private/fixture/path",
            }
          : mode === "invalid-usage-missing"
            ? { sessionUpdate: "usage_update", used: 1 }
            : mode === "invalid-usage-fractional"
              ? { sessionUpdate: "usage_update", used: 1.5, size: 10 }
              : mode === "invalid-usage-wrong-type"
                ? { sessionUpdate: "usage_update", used: "1", size: 10 }
                : mode === "invalid-usage-null"
                  ? { sessionUpdate: "usage_update", used: null, size: 10 }
                  : { sessionUpdate: "usage_update", used: -1, size: 10 };
      await notify(update);
      if (
        mode === "invalid-usage-sentinel" ||
        mode === "invalid-usage-missing" ||
        mode === "invalid-usage-wrong-type" ||
        mode === "invalid-usage-null"
      ) {
        setTimeout(() => process.exit(0), 10);
      }
      return new Promise(() => undefined);
    }
    if (mode === "product-facts") {
      await context.client.notify(methods.client.session.update, {
        sessionId: "global-other-session",
        update: {
          sessionUpdate: "agent_message_chunk",
          messageId: "global-message",
          content: { type: "text", text: "must-not-cross" },
        },
      });
      await notify({
        sessionUpdate: "plan",
        entries: [
          { content: "Inspect repository", priority: "high", status: "pending" },
          { content: "Apply bounded change", priority: "medium", status: "pending" },
        ],
      });
      await context.client.request(methods.client.session.requestPermission, {
        sessionId: context.params.sessionId,
        toolCall: { toolCallId: "tool-write-1", title: "Write file" },
        options: [{ optionId: "reject", name: "Reject", kind: "reject_once" }],
      });
      await notify({
        sessionUpdate: "usage_update",
        used: 17,
        size: 128000,
        cost: { amount: 9.99, currency: "USD" },
      });
    }
    if (mode === "late-message-after-final") {
      const messageNumber = promptCount;
      setTimeout(() => {
        void notify({
          sessionUpdate: "agent_message_chunk",
          messageId: `assistant-message-${messageNumber}`,
          content: { type: "text", text: `visible-${messageNumber}` },
          raw: "must-not-cross",
        });
      }, 25);
      return { stopReason: "end_turn" };
    }
    if (mode === "late-message-beyond-grace" && context.params.prompt[0]?.text === "first") {
      setTimeout(() => {
        void notify({
          sessionUpdate: "agent_message_chunk",
          messageId: "assistant-message-too-late",
          content: { type: "text", text: "must-not-cross-grace" },
        });
      }, 400);
      return { stopReason: "end_turn" };
    }
    if (mode === "empty-success-final") return { stopReason: "end_turn" };
    await notify({
      sessionUpdate: "agent_message_chunk",
      messageId: `assistant-message-${promptCount}`,
      content: { type: "text", text: `visible-${promptCount}` },
      raw: "must-not-cross",
    });
    if (mode === "eof-after-fact") {
      setTimeout(() => process.exit(0), 10);
      return new Promise(() => undefined);
    }
    if (mode === "late-final") {
      if (cancelRequested) return { stopReason: "cancelled" };
      await new Promise((resolve) => {
        finishCancelledPrompt = resolve;
      });
      return { stopReason: "cancelled" };
    }
    return { stopReason: "end_turn" };
  })
  .onNotification(methods.agent.session.cancel, () => {
    cancelRequested = true;
    finishCancelledPrompt?.();
    finishCancelledPrompt = undefined;
  });

const output = Writable.toWeb(process.stdout);
const input = Readable.toWeb(process.stdin);
const connection = app.connect(ndJsonStream(output, input));
void connection.closed.then(() => process.exit(0));

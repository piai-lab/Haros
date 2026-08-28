// FILE: verify-ask-user-live.ts
// Purpose: Proves Product Ask round-trip and Converge's Ask-first gate through real OmniMind Agent journeys.
// Layer: Maintainer-only live verification; credentials are accepted only through provider env vars.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { ApprovalRequestId, ThreadId, type ProviderRuntimeEvent } from "@harnessos/contracts";
import { Effect, Fiber, Layer, Stream } from "effect";

import { ServerConfig } from "../src/config.ts";
import { ServerSettingsService } from "../src/serverSettings.ts";
import { OmniMindAgentAdapter } from "../src/provider/Services/OmniMindAgentAdapter.ts";
import { PROVIDER_CONVERGE_MODE_ENVELOPE } from "../src/provider/interactionMode.ts";
import { makeOmniMindAgentAdapterLive } from "../src/provider/Layers/PiAdapter.ts";
import { userInputPresenterRegistry } from "../src/provider/userInputPresenterRegistry.ts";

const LIVE_CUSTOM_TEXT = "live custom answer  \n";
const TIMEOUT_MS = 120_000;

let failureTarget = "unknown";
let failureStage = "initialization";
let failureProviderRequests = 0;
let failureProvider2xxResponses = 0;
let failureRuntimeErrorClass: string | undefined;
let failureRuntimeErrorCategory: string | undefined;
const failureEventTypes = new Set<string>();

type LiveTarget = {
  readonly providerId: "deepseek" | "xiaomi-token-plan-cn";
  readonly modelId: "deepseek-v4-pro" | "mimo-v2.5-pro";
  readonly credentialEnv: "DEEPSEEK_API_KEY" | "XIAOMI_TOKEN_PLAN_CN_API_KEY";
};

type LiveScenario = "roundtrip" | "converge-gate";

function parseTarget(): LiveTarget {
  const target = process.argv[2];
  if (target === "deepseek") {
    return {
      providerId: "deepseek",
      modelId: "deepseek-v4-pro",
      credentialEnv: "DEEPSEEK_API_KEY",
    };
  }
  if (target === "mimo") {
    return {
      providerId: "xiaomi-token-plan-cn",
      modelId: "mimo-v2.5-pro",
      credentialEnv: "XIAOMI_TOKEN_PLAN_CN_API_KEY",
    };
  }
  throw new Error("Expected exactly one live target: deepseek or mimo");
}

function parseScenario(): LiveScenario {
  const scenario = process.argv[3];
  if (scenario === undefined || scenario === "roundtrip") return "roundtrip";
  if (scenario === "converge-gate") return "converge-gate";
  throw new Error("Expected live scenario: roundtrip or converge-gate");
}

function waitFor(predicate: () => boolean, label: string, timeoutMs = TIMEOUT_MS): Promise<void> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out while waiting for ${label}`));
        return;
      }
      setTimeout(poll, 25);
    };
    poll();
  });
}

function runtimeErrorCategory(message: string) {
  if (/auth|credential|api[ _-]?key|not configured|missing/i.test(message)) return "auth";
  if (/model.*(?:not found|unknown|unavailable)|unknown.*model/i.test(message)) {
    return "model-selection";
  }
  if (/network|fetch|connect|timeout|socket/i.test(message)) return "network";
  return "provider-runtime";
}

function gatewayFetch(_input: string | URL | Request, init?: RequestInit) {
  const body = JSON.parse(String(init?.body)) as {
    readonly id: string;
    readonly method: string;
  };
  return Promise.resolve(
    Response.json({
      jsonrpc: "2.0",
      id: body.id,
      result:
        body.method === "tools/list"
          ? { tools: [] }
          : { content: [{ type: "text", text: "unexpected gateway call" }] },
    }),
  );
}

function readRequestBody(input: string | URL | Request, init?: RequestInit) {
  if (input instanceof Request) {
    return input
      .clone()
      .json()
      .catch(() => undefined);
  }
  if (typeof init?.body !== "string") return Promise.resolve(undefined);
  try {
    return Promise.resolve(JSON.parse(init.body));
  } catch {
    return Promise.resolve(undefined);
  }
}

function toolNames(body: unknown): string[] {
  if (typeof body !== "object" || body === null || !("tools" in body)) return [];
  const tools = (body as { readonly tools?: unknown }).tools;
  if (!Array.isArray(tools)) return [];
  return tools.flatMap((tool) => {
    if (typeof tool !== "object" || tool === null) return [];
    const name = (tool as { readonly function?: { readonly name?: unknown } }).function?.name;
    return typeof name === "string" ? [name] : [];
  });
}

function answeredToolResult(body: unknown) {
  if (typeof body !== "object" || body === null || !("messages" in body)) return undefined;
  const messages = (body as { readonly messages?: unknown }).messages;
  if (!Array.isArray(messages)) return undefined;
  for (const message of messages) {
    if (typeof message !== "object" || message === null) continue;
    const candidate = message as { readonly role?: unknown; readonly content?: unknown };
    if (candidate.role !== "tool" || typeof candidate.content !== "string") continue;
    try {
      const result = JSON.parse(candidate.content) as {
        readonly version?: unknown;
        readonly status?: unknown;
        readonly answers?: ReadonlyArray<{
          readonly selectedValues?: unknown;
          readonly customText?: unknown;
        }>;
      };
      if (result.version === 1 && result.status === "answered") return result;
    } catch {
      // Other native tool results may be non-JSON text.
    }
  }
  return undefined;
}

async function run() {
  const target = parseTarget();
  const scenario = parseScenario();
  failureTarget = target.providerId;
  if (!process.env[target.credentialEnv]) {
    throw new Error(`Missing required credential environment: ${target.credentialEnv}`);
  }

  const root = mkdtempSync(path.join(tmpdir(), `omnimind-ask-live-${target.providerId}-`));
  const cwd = path.join(root, "workspace");
  const agentDir = path.join(root, "agent");
  mkdirSync(cwd, { recursive: true });
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    path.join(agentDir, "settings.json"),
    JSON.stringify({ retry: { enabled: false } }),
    { mode: 0o600 },
  );

  const originalFetch = globalThis.fetch;
  const modelBodies: unknown[] = [];
  const modelResponseStatuses: number[] = [];
  const capturedFetch = async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const body = await readRequestBody(input, init);
    if (typeof body === "object" && body !== null && "model" in body && "messages" in body) {
      modelBodies.push(body);
      failureProviderRequests = modelBodies.length;
    }
    const response = await originalFetch(input, init);
    if (body && typeof body === "object" && "model" in body && "messages" in body) {
      modelResponseStatuses.push(response.status);
      failureProvider2xxResponses = modelResponseStatuses.filter(
        (status) => status >= 200 && status < 300,
      ).length;
    }
    return response;
  };
  globalThis.fetch = Object.assign(capturedFetch, { preconnect: originalFetch.preconnect });

  const threadId = ThreadId.makeUnsafe(crypto.randomUUID());
  const events: ProviderRuntimeEvent[] = [];
  let presenterLease: ReturnType<typeof userInputPresenterRegistry.acquire> | undefined;

  try {
    presenterLease = userInputPresenterRegistry.acquire(`ask-live-${target.providerId}`, 1);
    const layer = makeOmniMindAgentAdapterLive({ agentGatewayFetch: gatewayFetch }).pipe(
      Layer.provideMerge(ServerConfig.layerTest(cwd, root)),
      Layer.provideMerge(ServerSettingsService.layerTest()),
      Layer.provideMerge(NodeServices.layer),
    );

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* OmniMindAgentAdapter;
          const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
            Effect.sync(() => {
              events.push(event);
              failureEventTypes.add(event.type);
              if (event.type === "runtime.error") {
                failureRuntimeErrorClass = event.payload.class;
                failureRuntimeErrorCategory = runtimeErrorCategory(event.payload.message);
              }
            }),
          ).pipe(Effect.forkChild);

          failureStage = "session-start";
          yield* adapter.startSession({
            provider: "oa",
            threadId,
            cwd,
            workSurface: "chat",
            modelSelection: {
              provider: "oa",
              model: `${target.providerId}/${target.modelId}`,
            },
            runtimeMode: "full-access",
          });
          failureStage = "first-model-request";
          const turn = yield* adapter.sendTurn({
            threadId,
            input:
              scenario === "converge-gate"
                ? `${PROVIDER_CONVERGE_MODE_ENVELOPE}\n\n我想成为世界最佳，应该怎么干？`
                : [
                    "This is a bounded product conformance journey.",
                    "Call ask_user exactly once before answering.",
                    "Ask one single-choice question with id live_runtime and exactly two concrete options.",
                    "Do not create an Other/Custom option; the Host owns that sentinel.",
                    "After the tool result, do not call another tool; reply with the exact token ASK_REPLAN_OK.",
                  ].join(" "),
            attachments: [],
            modelSelection: {
              provider: "oa",
              model: `${target.providerId}/${target.modelId}`,
            },
          });

          failureStage = "canonical-request";
          yield* Effect.promise(() =>
            waitFor(
              () =>
                events.some((event) => event.type === "user-input.requested") ||
                events.some(
                  (event) =>
                    (event.type === "turn.completed" || event.type === "turn.aborted") &&
                    event.turnId === turn.turnId,
                ),
              "canonical Ask projection",
            ),
          );
          const requestEvent = events.find((event) => event.type === "user-input.requested");
          if (!requestEvent || requestEvent.type !== "user-input.requested") {
            throw new Error("Canonical Ask request was not observable");
          }
          if (scenario === "converge-gate") {
            yield* adapter.stopSession(threadId);
            yield* Fiber.interrupt(eventFiber);
            return;
          }
          const question = requestEvent.payload.questions[0];
          if (!question || question.kind !== "choice" || question.options.length < 2) {
            throw new Error("Provider did not produce the required choice question");
          }
          failureStage = "answer-settlement";
          yield* adapter.respondToUserInput(
            threadId,
            ApprovalRequestId.makeUnsafe(String(requestEvent.requestId)),
            {
              status: "answered",
              answers: {
                [question.id]: {
                  selectedOptionLabels: [],
                  customText: LIVE_CUSTOM_TEXT,
                },
              },
            },
          );

          failureStage = "model-replan";
          yield* Effect.promise(() =>
            waitFor(
              () =>
                events.some(
                  (event) => event.type === "turn.completed" && event.turnId === turn.turnId,
                ),
              "post-answer model replan",
            ),
          );
          yield* adapter.stopSession(threadId);
          yield* Fiber.interrupt(eventFiber);
        }).pipe(Effect.provide(layer)),
      ),
    );

    const requestEventCount = events.filter(
      (event) => event.type === "user-input.requested",
    ).length;
    const resolvedEvent = events.find((event) => event.type === "user-input.resolved");
    const finalText = events
      .filter((event) => event.type === "content.delta")
      .map((event) => (event.type === "content.delta" ? event.payload.delta : ""))
      .join("");
    const result = modelBodies.map(answeredToolResult).find(Boolean);
    const askSchemaCount = modelBodies.filter((body) =>
      toolNames(body).includes("ask_user"),
    ).length;
    const isAssistantTextDelta = (event: ProviderRuntimeEvent) =>
      event.type === "content.delta" && event.payload.streamKind === "assistant_text";
    const firstAskEventIndex = events.findIndex((event) => event.type === "user-input.requested");
    const preAskText = events
      .slice(0, firstAskEventIndex < 0 ? events.length : firstAskEventIndex)
      .filter(isAssistantTextDelta)
      .map((event) => (event.type === "content.delta" ? event.payload.delta : ""))
      .join("");
    const preAskContainsPrematureDecision =
      /(?:I\s+(?:guess|think|recommend)|我(?:猜|认为|建议)|(?:路径|方案)\s*[A-DＡ-Ｄ一二三四])/iu.test(
        preAskText,
      );
    const selectedValues = result?.answers?.[0]?.selectedValues;
    const answeredSettlementObserved =
      resolvedEvent?.type === "user-input.resolved" &&
      "settlement" in resolvedEvent.payload &&
      resolvedEvent.payload.settlement.status === "answered";
    const providerRequestsSucceeded =
      modelResponseStatuses.length > 0 &&
      modelResponseStatuses.every((status) => status >= 200 && status < 300);
    const passed =
      scenario === "converge-gate"
        ? requestEventCount === 1 &&
          modelBodies.length >= 1 &&
          providerRequestsSucceeded &&
          askSchemaCount === modelBodies.length &&
          preAskText.length <= 160 &&
          !preAskContainsPrematureDecision
        : requestEventCount === 1 &&
          answeredSettlementObserved &&
          modelBodies.length >= 2 &&
          modelResponseStatuses.length >= 2 &&
          providerRequestsSucceeded &&
          askSchemaCount >= 1 &&
          Array.isArray(selectedValues) &&
          selectedValues.length === 0 &&
          result?.answers?.[0]?.customText === LIVE_CUSTOM_TEXT &&
          finalText.includes("ASK_REPLAN_OK");

    failureStage = "complete";
    process.stdout.write(
      `${JSON.stringify({
        target: target.providerId,
        scenario,
        passed,
        providerRequests: modelBodies.length,
        provider2xxResponses: modelResponseStatuses.filter(
          (status) => status >= 200 && status < 300,
        ).length,
        askSchemaObserved: askSchemaCount >= 1,
        canonicalRequestCount: requestEventCount,
        preAskTextChars: preAskText.length,
        preAskContainsPrematureDecision,
        briefLeadInOnly: preAskText.length <= 160 && !preAskContainsPrematureDecision,
        answeredSettlementObserved,
        structuredToolResultObserved: Boolean(result),
        losslessCustomTextObserved: result?.answers?.[0]?.customText === LIVE_CUSTOM_TEXT,
        replanMarkerObserved: finalText.includes("ASK_REPLAN_OK"),
      })}\n`,
    );
    if (!passed) process.exitCode = 1;
  } finally {
    presenterLease?.release();
    globalThis.fetch = originalFetch;
    rmSync(root, { recursive: true, force: true });
  }
}

run().catch(() => {
  process.stderr.write(
    `${JSON.stringify({
      target: failureTarget,
      passed: false,
      failureStage,
      providerRequests: failureProviderRequests,
      provider2xxResponses: failureProvider2xxResponses,
      runtimeErrorClass: failureRuntimeErrorClass,
      runtimeErrorCategory: failureRuntimeErrorCategory,
      eventTypes: [...failureEventTypes].toSorted(),
      providerDetailsSuppressed: true,
    })}\n`,
  );
  process.exitCode = 1;
});

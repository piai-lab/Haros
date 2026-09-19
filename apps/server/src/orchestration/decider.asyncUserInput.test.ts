import {
  CommandId,
  DEFAULT_ENGINE_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationEvent,
  type OrchestrationReadModel,
} from "@harnessos/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decideOrchestrationCommand } from "./decider.ts";
import { projectEvent } from "./projector.ts";

const NOW = "2026-09-16T12:00:00.000Z";
const THREAD_ID = ThreadId.makeUnsafe("thread-async-input");
const QUESTION_MESSAGE_ID = MessageId.makeUnsafe("assistant-question");
const ANSWER_MESSAGE_ID = MessageId.makeUnsafe("user-answer");
const TURN_ID = TurnId.makeUnsafe("turn-question");

function makeReadModel(
  input: {
    engine?: "codex" | "claude";
    answered?: boolean;
  } = {},
): OrchestrationReadModel {
  return {
    snapshotSequence: 42,
    updatedAt: NOW,
    spaces: [],
    projects: [],
    threads: [
      {
        id: THREAD_ID,
        projectId: ProjectId.makeUnsafe("project-async-input"),
        title: "Codex async questions",
        engineSelection: {
          engine: input.engine ?? "codex",
          model: input.engine === "claude" ? "claude-opus-4-6" : "gpt-5",
          supportsAutoMode: true,
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        parentThreadId: null,
        createdAt: NOW,
        updatedAt: NOW,
        latestTurn: null,
        handoff: null,
        messages: [
          {
            id: QUESTION_MESSAGE_ID,
            role: "assistant",
            text: "Need a choice.",
            asyncUserInput: {
              questions: [{ title: "Which option?", options: ["A", "B"] }],
              ...(input.answered
                ? {
                    response: {
                      messageId: MessageId.makeUnsafe("already-answered"),
                      answers: ["A"],
                    },
                  }
                : {}),
            },
            turnId: TURN_ID,
            streaming: false,
            source: "native",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        session: null,
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        deletedAt: null,
      },
    ],
  };
}

async function decide(command: OrchestrationCommand, readModel: OrchestrationReadModel) {
  const result = await Effect.runPromise(decideOrchestrationCommand({ command, readModel }));
  return Array.isArray(result) ? result : [result];
}

function answerCommand(
  overrides: Partial<Extract<OrchestrationCommand, { type: "thread.turn.start" }>> = {},
): Extract<OrchestrationCommand, { type: "thread.turn.start" }> {
  return {
    type: "thread.turn.start",
    commandId: CommandId.makeUnsafe("cmd-async-answer"),
    threadId: THREAD_ID,
    asyncUserInputResponse: {
      messageId: QUESTION_MESSAGE_ID,
      answers: ["B"],
    },
    message: {
      messageId: ANSWER_MESSAGE_ID,
      role: "user",
      text: " ",
      attachments: [],
    },
    interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
    runtimeMode: "full-access",
    createdAt: NOW,
    ...overrides,
  };
}

describe("decider Codex async user input", () => {
  it("writes the structured answer onto the assistant message and sends formatted user text", async () => {
    const events = await decide(answerCommand(), makeReadModel());
    expect(events.map((event) => event.type)).toEqual([
      "thread.message-sent",
      "thread.message-sent",
      "thread.turn-start-requested",
    ]);
    expect(events[0]).toMatchObject({
      payload: {
        messageId: ANSWER_MESSAGE_ID,
        role: "user",
        text: "Which option?\nB",
      },
    });
    expect(events[1]).toMatchObject({
      payload: {
        messageId: QUESTION_MESSAGE_ID,
        role: "assistant",
        asyncUserInput: {
          questions: [{ title: "Which option?", options: ["A", "B"] }],
          response: { messageId: ANSWER_MESSAGE_ID, answers: ["B"] },
        },
      },
    });

    let readModel = makeReadModel();
    for (const [index, event] of events.entries()) {
      readModel = await Effect.runPromise(
        projectEvent(readModel, {
          ...event,
          eventId: EventId.makeUnsafe(`evt-async-${index}`),
          sequence: 43 + index,
          causationEventId: null,
          correlationId: CommandId.makeUnsafe("cmd-async-answer"),
          metadata: {},
        } as OrchestrationEvent),
      );
    }
    expect(readModel.threads[0]?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: QUESTION_MESSAGE_ID,
          asyncUserInput: expect.objectContaining({
            response: { messageId: ANSWER_MESSAGE_ID, answers: ["B"] },
            responseSequence: 44,
          }),
        }),
        expect.objectContaining({
          id: ANSWER_MESSAGE_ID,
          role: "user",
          text: "Which option?\nB",
        }),
      ]),
    );
  });

  it("rejects a second answer and non-Codex threads", async () => {
    await expect(decide(answerCommand(), makeReadModel({ answered: true }))).rejects.toMatchObject({
      detail: "This asynchronous question has already been answered.",
    });
    await expect(
      decide(answerCommand(), makeReadModel({ engine: "claude" })),
    ).rejects.toMatchObject({
      detail: "This asynchronous question is unavailable in this Codex thread.",
    });
  });
});

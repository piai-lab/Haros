import {
  CommandId,
  DEFAULT_ENGINE_INTERACTION_MODE,
  EventId,
  ProjectId,
  ThreadId,
  type OrchestrationReadModel,
} from "@harnessos/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const NOW = "2026-07-25T18:00:00.000Z";
const THREAD_ID = ThreadId.makeUnsafe("thread-auto-claude");
const PROJECT_ID = ProjectId.makeUnsafe("project-auto-claude");

function makeReadModel(
  supportsAutoMode: boolean,
  threadOverrides?: { creationSource?: "provider_native" },
): OrchestrationReadModel {
  return {
    snapshotSequence: 1,
    updatedAt: NOW,
    spaces: [],
    projects: [],
    threads: [
      {
        id: THREAD_ID,
        projectId: PROJECT_ID,
        title: "Claude Auto",
        engineSelection: {
          engine: "claude",
          model: "claude-opus-4-6",
          supportsAutoMode,
        },
        interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
        runtimeMode: "auto",
        branch: null,
        worktreePath: null,
        createdAt: NOW,
        updatedAt: NOW,
        latestTurn: null,
        handoff: null,
        messages: [],
        session: null,
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        deletedAt: null,
        ...(threadOverrides?.creationSource !== undefined
          ? { creationSource: threadOverrides.creationSource }
          : {}),
      },
    ],
  };
}

async function makeProjectOnlyReadModel(): Promise<OrchestrationReadModel> {
  return Effect.runPromise(
    projectEvent(createEmptyReadModel(NOW), {
      sequence: 1,
      eventId: EventId.makeUnsafe("evt-project-create"),
      aggregateKind: "project",
      aggregateId: PROJECT_ID,
      type: "project.created",
      occurredAt: NOW,
      commandId: CommandId.makeUnsafe("cmd-project-create"),
      causationEventId: null,
      correlationId: CommandId.makeUnsafe("cmd-project-create"),
      metadata: {},
      payload: {
        projectId: PROJECT_ID,
        kind: "project",
        title: "Project",
        workspaceRoot: "/tmp/project",
        defaultEngineSelection: null,
        scripts: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    }),
  );
}

describe("decider Auto model compatibility", () => {
  it("preserves persisted Auto when a model change makes it unsupported", async () => {
    const event = await Effect.runPromise(
      decideOrchestrationCommand({
        command: {
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("cmd-unsupported-claude-model"),
          threadId: THREAD_ID,
          engineSelection: {
            engine: "claude",
            model: "claude-haiku-4-5",
            supportsAutoMode: false,
          },
        },
        readModel: makeReadModel(true),
      }),
    );

    expect("type" in event ? event.type : event[0]?.type).toBe("thread.meta-updated");
  });

  it("rejects enabling Auto when the current Claude model is reported as unsupported", async () => {
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          command: {
            type: "thread.runtime-mode.set",
            commandId: CommandId.makeUnsafe("cmd-enable-auto-unsupported-model"),
            threadId: THREAD_ID,
            runtimeMode: "auto",
            createdAt: NOW,
          },
          readModel: makeReadModel(false),
        }),
      ),
    ).rejects.toThrow("The selected model does not support Auto mode.");
  });

  it("allows a Claude model reported as Auto-compatible", async () => {
    const event = await Effect.runPromise(
      decideOrchestrationCommand({
        command: {
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("cmd-supported-claude-model"),
          threadId: THREAD_ID,
          engineSelection: {
            engine: "claude",
            model: "claude-fable-5",
            supportsAutoMode: true,
          },
        },
        readModel: makeReadModel(true),
      }),
    );

    expect("type" in event ? event.type : event[0]?.type).toBe("thread.meta-updated");
  });

  it("commits the engine Session and complete binding tuple in one internal command", async () => {
    const result = await Effect.runPromise(
      decideOrchestrationCommand({
        command: {
          type: "thread.session.set",
          commandId: CommandId.makeUnsafe("cmd-atomic-engine-binding"),
          threadId: THREAD_ID,
          session: {
            threadId: THREAD_ID,
            status: "ready",
            providerName: "claude",
            runtimeMode: "auto",
            activeTurnId: null,
            lastError: null,
            updatedAt: NOW,
          },
          binding: {
            engineSelection: {
              engine: "claude",
              model: "claude-fable-5",
              supportsAutoMode: true,
            },
            runtimeMode: "auto",
            interactionMode: "plan",
          },
          createdAt: NOW,
        },
        readModel: makeReadModel(true),
      }),
    );

    expect(Array.isArray(result) ? result : [result]).toMatchObject([
      { type: "thread.session-set", payload: { session: { providerName: "claude" } } },
      {
        type: "thread.meta-updated",
        payload: { engineSelection: { engine: "claude", model: "claude-fable-5" } },
      },
      { type: "thread.runtime-mode-set", payload: { runtimeMode: "auto" } },
      { type: "thread.interaction-mode-set", payload: { interactionMode: "plan" } },
    ]);
  });

  it("rejects a user-created Auto thread whose Claude model has no verified flag", async () => {
    const readModel = await makeProjectOnlyReadModel();

    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          command: {
            type: "thread.create",
            commandId: CommandId.makeUnsafe("cmd-user-auto-unverified"),
            threadId: ThreadId.makeUnsafe("thread-user-auto"),
            projectId: PROJECT_ID,
            title: "User Auto thread",
            engineSelection: {
              engine: "claude",
              model: "claude-fable-5",
            },
            interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
            runtimeMode: "auto",
            envMode: "local",
            branch: null,
            worktreePath: null,
            createBranchFlowCompleted: false,
            createdAt: NOW,
          },
          readModel,
        }),
      ),
    ).rejects.toThrow("The selected model has not been verified to support Auto mode.");
  });

  it("allows a engine-native subagent thread in Auto without a verified flag", async () => {
    // Engine-native threads mirror subagents the engine already runs;
    // rejecting them would durably poison the runtime journal replaying the
    // engine event (see EngineRuntimeIngestion), not stop any session.
    const readModel = await makeProjectOnlyReadModel();

    const result = await Effect.runPromise(
      decideOrchestrationCommand({
        command: {
          type: "thread.create",
          commandId: CommandId.makeUnsafe("cmd-subagent-auto-unverified"),
          threadId: ThreadId.makeUnsafe("subagent:thread-auto-claude:child"),
          projectId: PROJECT_ID,
          title: "Subagent",
          engineSelection: {
            engine: "claude",
            model: "claude-fable-5",
          },
          interactionMode: DEFAULT_ENGINE_INTERACTION_MODE,
          runtimeMode: "auto",
          envMode: "local",
          branch: null,
          worktreePath: null,
          createBranchFlowCompleted: false,
          parentThreadId: THREAD_ID,
          creationSource: "provider_native",
          sourceThreadId: THREAD_ID,
          createdAt: NOW,
        },
        readModel,
      }),
    );

    const event = Array.isArray(result) ? result[0] : result;
    expect(event?.type).toBe("thread.created");
  });

  it("allows model updates on engine-native threads without a verified flag", async () => {
    const event = await Effect.runPromise(
      decideOrchestrationCommand({
        command: {
          type: "thread.meta.update",
          commandId: CommandId.makeUnsafe("cmd-subagent-model-update"),
          threadId: THREAD_ID,
          engineSelection: {
            engine: "claude",
            model: "claude-fable-5",
          },
        },
        readModel: makeReadModel(true, { creationSource: "provider_native" }),
      }),
    );

    expect("type" in event ? event.type : event[0]?.type).toBe("thread.meta-updated");
  });
});

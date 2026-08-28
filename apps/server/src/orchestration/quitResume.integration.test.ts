import * as Fs from "node:fs/promises";
import * as Os from "node:os";
import * as Path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationEvent,
  type OrchestrationProject,
  type OrchestrationThread,
} from "@harnessos/contracts";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import type { OrchestrationEventStoreShape } from "../persistence/Services/OrchestrationEventStore";
import {
  claimQuitResumeRecord,
  isQuitResumeEligibleThread,
  makeQuitResumeTurnCommand,
  quitResumeWorkspaceFailureReason,
  readQuitResumeRecord,
  readExactQuitResumeBinding,
  sanitizeQuitResumeProviderOptions,
  writeQuitResumeRecord,
  type QuitResumeRecord,
} from "./quitResume";

const temporaryDirectories: string[] = [];

async function makeTemporaryPath(): Promise<string> {
  const directory = await Fs.mkdtemp(Path.join(Os.tmpdir(), "omnimind-quit-resume-"));
  temporaryDirectories.push(directory);
  await Fs.chmod(directory, 0o700);
  return Path.join(directory, "quit-resume.json");
}

function record(): QuitResumeRecord {
  return {
    version: 1,
    recordId: "record-1",
    recordedAt: "2026-08-26T10:00:00.000Z",
    continuationPrompt: "continue",
    threads: [
      {
        threadId: ThreadId.makeUnsafe("thread-1"),
        activeTurnId: TurnId.makeUnsafe("turn-1"),
        binding: {
          modelSelection: { provider: "codex", model: "gpt-5.4" },
          assistantDeliveryMode: "buffered",
          runtimeMode: "approval-required",
          interactionMode: "default",
        },
      },
    ],
  };
}

function runningThread(overrides: Partial<OrchestrationThread> = {}): OrchestrationThread {
  return {
    id: ThreadId.makeUnsafe("thread-1"),
    projectId: ProjectId.makeUnsafe("project-1"),
    archivedAt: null,
    deletedAt: null,
    parentThreadId: null,
    gatewayOperationId: null,
    subagentAgentId: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    worktreePath: null,
    latestTurn: {
      turnId: TurnId.makeUnsafe("turn-1"),
      state: "running",
      requestedAt: "2026-08-26T10:00:00.000Z",
      startedAt: "2026-08-26T10:00:01.000Z",
      completedAt: null,
      assistantMessageId: null,
    },
    session: {
      threadId: ThreadId.makeUnsafe("thread-1"),
      status: "running",
      providerName: "claude",
      runtimeMode: "approval-required",
      activeTurnId: TurnId.makeUnsafe("turn-1"),
      lastError: null,
      updatedAt: "2026-08-26T10:00:01.000Z",
    },
    ...overrides,
  } as OrchestrationThread;
}

function project(workspaceRoot: string): OrchestrationProject {
  return {
    id: ProjectId.makeUnsafe("project-1"),
    kind: "project",
    workspaceRoot,
    deletedAt: null,
  } as OrchestrationProject;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => Fs.rm(path, { recursive: true })));
});

describe("quit resume one-shot record", () => {
  it("writes a private record and atomically claims it once", async () => {
    const path = await makeTemporaryPath();
    await Effect.runPromise(
      writeQuitResumeRecord(path, record()).pipe(Effect.provide(NodeServices.layer)),
    );
    expect((await Fs.stat(path)).mode & 0o777).toBe(0o600);

    const [left, right] = await Promise.all([
      Effect.runPromise(claimQuitResumeRecord(path).pipe(Effect.provide(NodeServices.layer))),
      Effect.runPromise(claimQuitResumeRecord(path).pipe(Effect.provide(NodeServices.layer))),
    ]);
    expect([left.kind, right.kind].toSorted()).toEqual(["absent", "record"]);
    const claimed = left.kind === "record" ? left : right;
    expect(claimed).toEqual({ kind: "record", record: record() });
    await expect(Fs.access(path)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      Effect.runPromise(claimQuitResumeRecord(path).pipe(Effect.provide(NodeServices.layer))),
    ).resolves.toEqual({ kind: "absent" });
  });

  it("drops a claimed corrupt record instead of retrying it", async () => {
    const path = await makeTemporaryPath();
    await Fs.writeFile(path, "not json", { mode: 0o600 });
    await expect(
      Effect.runPromise(claimQuitResumeRecord(path).pipe(Effect.provide(NodeServices.layer))),
    ).resolves.toEqual({ kind: "invalid" });
    await expect(
      Effect.runPromise(readQuitResumeRecord(path).pipe(Effect.provide(NodeServices.layer))),
    ).resolves.toEqual({ kind: "absent" });
  });

  it("revalidates only active, visible top-level user tasks", () => {
    expect(isQuitResumeEligibleThread(runningThread())).toBe(true);
    for (const ineligible of [
      runningThread({ archivedAt: "2026-08-26T10:00:02.000Z" }),
      runningThread({ parentThreadId: ThreadId.makeUnsafe("parent") }),
      runningThread({ gatewayOperationId: "gateway-operation" }),
      runningThread({ subagentAgentId: "subagent" }),
      runningThread({ hasPendingApprovals: true }),
      runningThread({ hasPendingUserInput: true }),
      runningThread({ latestTurn: { ...runningThread().latestTurn!, state: "completed" } }),
      runningThread({ session: null, latestTurn: null }),
    ]) {
      expect(isQuitResumeEligibleThread(ineligible)).toBe(false);
    }
  });

  it("reads the exact turn admission and strips private provider locations", async () => {
    const rawProviderOptions = {
      codex: { binaryPath: "/private/codex", homePath: "/private/provider-home" },
      claude: {
        binaryPath: "/private/claude",
        permissionMode: "default",
        maxThinkingTokens: 24_000,
      },
      cursor: { apiEndpoint: "https://secret.invalid" },
      pi: { agentDir: "/private/pi-agent" },
    };
    const admission = {
      sequence: 7,
      type: "thread.turn-start-requested",
      payload: {
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: "message-1",
        modelSelection: {
          provider: "claude",
          model: "claude-opus-4-1",
          options: { thinking: true, effort: "max" },
        },
        providerOptions: rawProviderOptions,
        reviewTarget: { type: "baseBranch", branch: "main" },
        assistantDeliveryMode: "streaming",
        runtimeMode: "approval-required",
        interactionMode: "plan",
        createdAt: "2026-08-26T10:00:00.000Z",
      },
    } as unknown as OrchestrationEvent;
    const eventStore = {
      getThreadHighWaterSequence: () => Effect.succeed(7),
      readThreadEvents: () => Effect.succeed([admission]),
    } as unknown as OrchestrationEventStoreShape;

    await expect(readExactQuitResumeBinding(eventStore, runningThread())).resolves.toEqual({
      modelSelection: {
        provider: "claude",
        model: "claude-opus-4-1",
        options: { thinking: true, effort: "max" },
      },
      providerOptions: {
        claude: { permissionMode: "default", maxThinkingTokens: 24_000 },
      },
      reviewTarget: { type: "baseBranch", branch: "main" },
      assistantDeliveryMode: "streaming",
      runtimeMode: "approval-required",
      interactionMode: "plan",
    });
    expect(JSON.stringify(sanitizeQuitResumeProviderOptions(rawProviderOptions))).not.toMatch(
      /private|endpoint|binary|home|agentDir/iu,
    );
  });

  it("binds through the persisted active-turn admission when the live session timestamp differs", async () => {
    const admission = {
      sequence: 7,
      type: "thread.turn-start-requested",
      payload: {
        threadId: ThreadId.makeUnsafe("thread-1"),
        messageId: "message-1",
        modelSelection: { provider: "codex", model: "gpt-5.4" },
        assistantDeliveryMode: "streaming",
        runtimeMode: "full-access",
        interactionMode: "default",
        createdAt: "2026-08-26T10:00:00.000Z",
      },
    } as unknown as OrchestrationEvent;
    const eventStore = {
      getThreadHighWaterSequence: () => Effect.succeed(7),
      readThreadEvents: () => Effect.succeed([admission]),
    } as unknown as OrchestrationEventStoreShape;
    const liveThread = runningThread({
      latestTurn: {
        ...runningThread().latestTurn!,
        requestedAt: "2026-08-26T10:00:01.000Z",
      },
    });

    await expect(readExactQuitResumeBinding(eventStore, liveThread)).resolves.toMatchObject({
      modelSelection: { provider: "codex", model: "gpt-5.4" },
      runtimeMode: "full-access",
      interactionMode: "default",
    });
  });

  it("never falls back to Home when the exact workspace cannot be resolved", async () => {
    const workspace = await Fs.mkdtemp(Path.join(Os.tmpdir(), "omnimind-resume-workspace-"));
    temporaryDirectories.push(workspace);
    await expect(
      quitResumeWorkspaceFailureReason(runningThread(), [project(workspace)]),
    ).resolves.toBe(null);
    await expect(
      quitResumeWorkspaceFailureReason(runningThread(), [project(`${workspace}-missing`)]),
    ).resolves.toBe("workspace-missing");
    await expect(quitResumeWorkspaceFailureReason(runningThread(), [])).resolves.toBe(
      "project-unavailable",
    );
    await expect(
      quitResumeWorkspaceFailureReason(runningThread({ worktreePath: null }), [
        { ...project(workspace), kind: "chat" },
      ]),
    ).resolves.toBe("workspace-unavailable");
  });

  it("builds one deterministic ordinary user turn with the exact saved binding", () => {
    const saved = record();
    const command = makeQuitResumeTurnCommand({
      record: saved,
      entry: saved.threads[0]!,
      now: "2026-08-26T11:00:00.000Z",
    });
    expect(command).toMatchObject({
      type: "thread.turn.start",
      commandId: "quit-resume:record-1:thread-1",
      threadId: "thread-1",
      message: {
        messageId: "quit-resume:record-1:thread-1",
        role: "user",
        text: "continue",
      },
      modelSelection: { provider: "codex", model: "gpt-5.4" },
      runtimeMode: "approval-required",
      interactionMode: "default",
      dispatchMode: "queue",
      resumePrecondition: {
        recordedTurnId: "turn-1",
        recordedAt: "2026-08-26T10:00:00.000Z",
      },
    });
  });
});

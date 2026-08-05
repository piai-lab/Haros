/**
 * DevServerSupervisor - Server-owned dev-server process orchestration.
 *
 * Dev servers are first-class background processes keyed by project id, fully
 * decoupled from chat threads. Each runs in a managed PTY (via TerminalSupervisor)
 * under a synthetic `dev-server:<projectId>` thread so its lifetime survives
 * WebSocket reconnects and never clutters the thread list. The supervisor keeps an
 * in-memory registry, broadcasts changes over a PubSub for the
 * `project.devServerEvent` push channel, and reaps entries when their PTY exits.
 *
 * @module DevServerSupervisor
 */
import {
  DEFAULT_TERMINAL_ID,
  ProjectId,
  type ProjectDevServer,
  type ProjectDevServerEvent,
  type ProjectListDevServersResult,
  type ProjectRunDevServerInput,
  type ProjectRunDevServerResult,
  type ProjectStopDevServerInput,
  type ProjectStopDevServerResult,
  type ServerLocalServerProcess,
} from "@omnimind/contracts";
import { localServerMatchesRun } from "@omnimind/shared/localServers";
import { Effect, Layer, PubSub, Ref, ServiceMap, Stream } from "effect";

import { TerminalSupervisor, type TerminalError } from "./terminal/Services/Supervisor";

// Dev servers reuse the terminal infrastructure under a reserved synthetic
// thread namespace so their PTYs never collide with real chat-thread terminals.
const DEV_SERVER_THREAD_PREFIX = "dev-server:";
const DEV_SERVER_TERMINAL_COLS = 120;
const DEV_SERVER_TERMINAL_ROWS = 30;

const devServerThreadId = (projectId: ProjectId): string =>
  `${DEV_SERVER_THREAD_PREFIX}${projectId}`;

const parseDevServerProjectId = (threadId: string): ProjectId | null => {
  if (!threadId.startsWith(DEV_SERVER_THREAD_PREFIX)) {
    return null;
  }
  const raw = threadId.slice(DEV_SERVER_THREAD_PREFIX.length);
  return raw.length > 0 ? ProjectId.makeUnsafe(raw) : null;
};

export function findProjectDevServerForLocalServer(input: {
  localServer: ServerLocalServerProcess;
  devServers: readonly ProjectDevServer[];
}): ProjectDevServer | null {
  for (const devServer of input.devServers) {
    if (localServerMatchesRun(input.localServer, devServer)) {
      return devServer;
    }
  }
  return null;
}

export interface DevServerSupervisorShape {
  /** Start (or restart) the dev server for a project and return its descriptor. */
  readonly run: (
    input: ProjectRunDevServerInput,
  ) => Effect.Effect<ProjectRunDevServerResult, TerminalError>;
  /** Stop the dev server for a project. Resolves with whether one was running. */
  readonly stop: (input: ProjectStopDevServerInput) => Effect.Effect<ProjectStopDevServerResult>;
  /** Snapshot of all currently tracked dev servers. */
  readonly list: Effect.Effect<ProjectListDevServersResult>;
  /** Live stream of dev-server lifecycle events (excludes the initial snapshot). */
  readonly stream: Stream.Stream<ProjectDevServerEvent>;
}

export class DevServerSupervisor extends ServiceMap.Service<
  DevServerSupervisor,
  DevServerSupervisorShape
>()("omnimind/devServerSupervisor") {}

export const DevServerSupervisorLive = Layer.effect(
  DevServerSupervisor,
  Effect.gen(function* () {
    const terminalSupervisor = yield* TerminalSupervisor;
    const pubsub = yield* Effect.acquireRelease(
      PubSub.unbounded<ProjectDevServerEvent>(),
      PubSub.shutdown,
    );
    const registry = yield* Ref.make<Record<ProjectId, ProjectDevServer>>({});

    const publish = (event: ProjectDevServerEvent) => PubSub.publish(pubsub, event);

    // Reap a tracked dev server whose PTY exited or errored. Guarded so that a
    // deliberate stop (which removes the entry first) cannot double-publish, and
    // so a stale exit for an already-replaced project is ignored.
    const reapExited = (projectId: ProjectId) =>
      Ref.modify(registry, (current) => {
        if (!current[projectId]) {
          return [false, current] as const;
        }
        const next = { ...current };
        delete next[projectId];
        return [true, next] as const;
      }).pipe(
        Effect.flatMap((removed) =>
          removed ? publish({ type: "removed", projectId, reason: "exited" }) : Effect.void,
        ),
      );

    const unsubscribe = yield* terminalSupervisor.subscribe((event) => {
      if (event.type !== "exited" && event.type !== "error") {
        return;
      }
      const projectId = parseDevServerProjectId(event.threadId);
      if (!projectId) {
        return;
      }
      Effect.runFork(reapExited(projectId));
    });
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

    const run: DevServerSupervisorShape["run"] = (input) =>
      Effect.gen(function* () {
        const threadId = devServerThreadId(input.projectId);

        // If a dev server is already tracked for this project, tear its PTY down
        // first so the command always lands in a fresh shell. A deliberate close
        // emits no exit event, so the reaper stays quiet during the swap.
        const existing = (yield* Ref.get(registry))[input.projectId];
        if (existing) {
          yield* terminalSupervisor
            .close({ threadId, deleteHistory: true })
            .pipe(Effect.catch(() => Effect.void));
        }

        const snapshot = yield* terminalSupervisor.open({
          threadId,
          terminalId: DEFAULT_TERMINAL_ID,
          cwd: input.cwd,
          cols: DEV_SERVER_TERMINAL_COLS,
          rows: DEV_SERVER_TERMINAL_ROWS,
          // Dev servers are headless: drain + retain history, but never broadcast
          // their continuous output to clients that have no terminal UI for them.
          streamOutput: false,
          ...(input.env ? { env: input.env } : {}),
        });

        yield* terminalSupervisor.write({
          threadId,
          terminalId: DEFAULT_TERMINAL_ID,
          data: `${input.command}\r`,
        });

        const server: ProjectDevServer = {
          projectId: input.projectId,
          command: input.command,
          cwd: input.cwd,
          pid: snapshot.pid,
          startedAt: new Date().toISOString(),
          status: "running",
        };
        yield* Ref.update(registry, (current) => ({ ...current, [input.projectId]: server }));
        yield* publish({ type: "upserted", server });
        return { server };
      });

    const stop: DevServerSupervisorShape["stop"] = (input) =>
      Effect.gen(function* () {
        // Remove from the registry *before* closing so the PTY teardown cannot be
        // mistaken for a crash by the reaper.
        const removed = yield* Ref.modify(registry, (current) => {
          if (!current[input.projectId]) {
            return [false, current] as const;
          }
          const next = { ...current };
          delete next[input.projectId];
          return [true, next] as const;
        });
        if (!removed) {
          return { stopped: false };
        }
        yield* publish({ type: "removed", projectId: input.projectId, reason: "stopped" });
        yield* terminalSupervisor
          .close({ threadId: devServerThreadId(input.projectId), deleteHistory: true })
          .pipe(Effect.catch(() => Effect.void));
        return { stopped: true };
      });

    const list: DevServerSupervisorShape["list"] = Ref.get(registry).pipe(
      Effect.map((current) => ({ servers: Object.values(current) })),
    );

    return {
      run,
      stop,
      list,
      get stream() {
        return Stream.fromPubSub(pubsub);
      },
    } satisfies DevServerSupervisorShape;
  }),
);

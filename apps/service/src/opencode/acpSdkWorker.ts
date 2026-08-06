import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { MessageChannel, parentPort, type MessagePort, workerData } from "node:worker_threads";

import {
  RequestError,
  client,
  methods,
  ndJsonStream,
  type InitializeRequest,
  type NewSessionRequest,
  type PromptRequest,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type ResumeSessionRequest,
  type SessionNotification,
} from "@agentclientprotocol/sdk";

const MAX_FRAME_BYTES = 1024 * 1024;
const MAX_SESSION_UPDATES = 2048;

type WorkerCommand =
  | { readonly kind: "initialize"; readonly input: InitializeRequest }
  | { readonly kind: "new-session"; readonly input: NewSessionRequest }
  | { readonly kind: "resume-session"; readonly input: ResumeSessionRequest }
  | { readonly kind: "prompt"; readonly input: PromptRequest }
  | { readonly kind: "cancel"; readonly sessionId: string };

type WorkerRequest =
  | { readonly kind: "command"; readonly command: WorkerCommand; readonly replyPort: MessagePort }
  | { readonly kind: "shutdown" };

type WorkerErrorCode =
  | "ACP_CLOSED"
  | "ACP_FRAME_INVALID"
  | "ACP_FRAME_TOO_LARGE"
  | "ACP_MAILBOX_BOUND"
  | "ACP_AUTH_REQUIRED"
  | "ACP_REQUEST_FAILED"
  | "ACP_WRITE_FAILED";

class WorkerBoundaryError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode) {
    super(code);
    this.code = code;
  }
}

const workerInput = workerData as {
  readonly executable: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
};

if (!parentPort) throw new Error("OpenCode ACP worker requires a parent port.");
const workerParentPort = parentPort;

const child: ChildProcessWithoutNullStreams = spawn(workerInput.executable, ["acp"], {
  cwd: workerInput.cwd,
  env: workerInput.env,
  detached: true,
  stdio: ["pipe", "pipe", "pipe"],
});

child.stderr.on("data", (chunk: Buffer) => {
  workerParentPort.postMessage({ kind: "child-stderr", byteLength: chunk.byteLength });
});

let pendingFrameBytes = 0;
let terminalFrameCode: "ACP_FRAME_INVALID" | "ACP_FRAME_TOO_LARGE" | null = null;
const utf8 = new TextDecoder("utf-8", { fatal: true });
const incomingGuard = new TransformStream<Uint8Array, Uint8Array>(
  {
    transform: (chunk, controller) => {
      try {
        utf8.decode(chunk, { stream: true });
      } catch {
        terminalFrameCode = "ACP_FRAME_INVALID";
        throw new WorkerBoundaryError("ACP_FRAME_INVALID");
      }
      for (const byte of chunk) {
        if (byte === 0x0a) pendingFrameBytes = 0;
        else if (++pendingFrameBytes > MAX_FRAME_BYTES) {
          terminalFrameCode = "ACP_FRAME_TOO_LARGE";
          throw new WorkerBoundaryError("ACP_FRAME_TOO_LARGE");
        }
      }
      controller.enqueue(chunk);
    },
    flush: () => {
      try {
        utf8.decode();
      } catch {
        terminalFrameCode = "ACP_FRAME_INVALID";
        throw new WorkerBoundaryError("ACP_FRAME_INVALID");
      }
    },
  },
  new ByteLengthQueuingStrategy({ highWaterMark: MAX_FRAME_BYTES }),
  new ByteLengthQueuingStrategy({ highWaterMark: MAX_FRAME_BYTES }),
);

const childWriter = Writable.toWeb(child.stdin).getWriter();
const boundedOutput = new WritableStream<Uint8Array>({
  write: (chunk) => {
    if (chunk.byteLength > MAX_FRAME_BYTES) throw new WorkerBoundaryError("ACP_FRAME_TOO_LARGE");
    return childWriter.write(chunk);
  },
  close: () => childWriter.close(),
  abort: (cause) => childWriter.abort(cause),
});
const incoming = Readable.toWeb(child.stdout).pipeThrough(incomingGuard);

let updateCount = 0;
let activePrompt: { readonly sessionId: string; readonly replyPort: MessagePort } | null = null;
const delayBackgroundUpdate = workerInput.env.OMNIMIND_ACP_FIXTURE_MODE === "final-before-update";
const app = client({ name: "OmniMind" })
  .onNotification(methods.client.session.update, (context) => {
    updateCount += 1;
    if (updateCount > MAX_SESSION_UPDATES) throw new WorkerBoundaryError("ACP_MAILBOX_BOUND");
    const event = {
      kind: "session-update",
      notification: context.params satisfies SessionNotification,
    } as const;
    if (activePrompt?.sessionId === context.params.sessionId) {
      activePrompt.replyPort.postMessage(event);
    } else if (delayBackgroundUpdate) {
      setTimeout(() => workerParentPort.postMessage(event), 25);
    } else {
      workerParentPort.postMessage(event);
    }
  })
  .onRequest(methods.client.session.requestPermission, async (context) => {
    const { port1, port2 } = new MessageChannel();
    const response = new Promise<RequestPermissionResponse>((resolve) => {
      port1.once("message", (value: RequestPermissionResponse) => resolve(value));
    });
    workerParentPort.postMessage(
      {
        kind: "permission-request",
        request: context.params satisfies RequestPermissionRequest,
        replyPort: port2,
      },
      [port2],
    );
    try {
      return await response;
    } finally {
      port1.close();
    }
  });

const connection = app.connect(ndJsonStream(boundedOutput, incoming));
let shutdownStarted = false;

const closeChild = async (): Promise<void> => {
  if (child.exitCode !== null) return;
  const pid = child.pid;
  try {
    if (pid === undefined) throw new Error("missing pid");
    process.kill(-pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 750)),
  ]);
  if (child.exitCode === null) {
    try {
      if (pid === undefined) throw new Error("missing pid");
      process.kill(-pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
};

const shutdown = async (): Promise<void> => {
  if (shutdownStarted) return;
  shutdownStarted = true;
  connection.close();
  await closeChild();
  workerParentPort.postMessage({ kind: "cleanup-complete" });
  workerParentPort.close();
};

const errorCode = (cause: unknown): WorkerErrorCode => {
  if (cause instanceof WorkerBoundaryError) return cause.code;
  if (cause instanceof RequestError)
    return cause.code === -32000 ? "ACP_AUTH_REQUIRED" : "ACP_REQUEST_FAILED";
  return connection.signal.aborted ? "ACP_CLOSED" : "ACP_REQUEST_FAILED";
};

const execute = async (command: WorkerCommand, replyPort: MessagePort): Promise<unknown> => {
  if (command.kind === "initialize") {
    return connection.agent.request(methods.agent.initialize, command.input);
  }
  if (command.kind === "new-session") {
    return connection.agent.request(methods.agent.session.new, command.input);
  }
  if (command.kind === "resume-session") {
    return connection.agent.request(methods.agent.session.resume, command.input);
  }
  if (command.kind === "prompt") {
    if (activePrompt) throw new WorkerBoundaryError("ACP_REQUEST_FAILED");
    activePrompt = { sessionId: command.input.sessionId, replyPort };
    return connection.agent.request(methods.agent.session.prompt, command.input);
  }
  await connection.agent.notify(methods.agent.session.cancel, { sessionId: command.sessionId });
};

workerParentPort.on("message", (request: WorkerRequest) => {
  if (request.kind === "shutdown") {
    void shutdown();
    return;
  }
  void execute(request.command, request.replyPort)
    .then(
      (value) => request.replyPort.postMessage({ ok: true, value }),
      (cause) => request.replyPort.postMessage({ ok: false, code: errorCode(cause) }),
    )
    .finally(() => {
      if (activePrompt?.replyPort === request.replyPort) activePrompt = null;
      request.replyPort.close();
    });
});

void connection.closed.then(() => {
  if (!shutdownStarted) {
    workerParentPort.postMessage({
      kind: "closed",
      ...(terminalFrameCode ? { code: terminalFrameCode } : {}),
    });
  }
  void shutdown();
});

child.once("error", () => {
  if (!shutdownStarted) workerParentPort.postMessage({ kind: "closed" });
  void shutdown();
});
child.once("exit", () => {
  if (!shutdownStarted) workerParentPort.postMessage({ kind: "closed" });
  void shutdown();
});

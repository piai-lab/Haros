import { MessageChannel, type MessagePort, Worker } from "node:worker_threads";

import {
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type ResumeSessionRequest,
  type ResumeSessionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";

import { createLogger } from "../logger";

const MAX_STDERR_BYTES = 32 * 1024;
const SDK_DIAGNOSTIC_REASON = "sdk-diagnostic-isolated";
const logger = createLogger("opencode-acp");

type WorkerDiagnosticStream = Worker["stdout"] | Worker["stderr"] | null | undefined;

export const attachWorkerDiagnosticStream = (
  stream: WorkerDiagnosticStream,
  onData: (chunk: Buffer) => void,
): void => {
  stream?.on("data", onData);
};

export class OpenCodeAcpError extends Error {
  constructor(
    readonly code:
      | "ACP_CLOSED"
      | "ACP_FRAME_INVALID"
      | "ACP_FRAME_TOO_LARGE"
      | "ACP_MAILBOX_BOUND"
      | "ACP_AUTH_REQUIRED"
      | "ACP_REQUEST_FAILED"
      | "ACP_REQUEST_TIMEOUT"
      | "ACP_WRITE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "OpenCodeAcpError";
  }
}

type PermissionHandler = (
  request: RequestPermissionRequest,
) => Promise<RequestPermissionResponse> | RequestPermissionResponse;

type WorkerCommand =
  | { readonly kind: "initialize"; readonly input: InitializeRequest }
  | { readonly kind: "new-session"; readonly input: NewSessionRequest }
  | { readonly kind: "resume-session"; readonly input: ResumeSessionRequest }
  | { readonly kind: "prompt"; readonly input: PromptRequest }
  | { readonly kind: "cancel"; readonly sessionId: string };

type WorkerReply<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly code:
        | "ACP_CLOSED"
        | "ACP_FRAME_INVALID"
        | "ACP_FRAME_TOO_LARGE"
        | "ACP_MAILBOX_BOUND"
        | "ACP_AUTH_REQUIRED"
        | "ACP_REQUEST_FAILED"
        | "ACP_WRITE_FAILED";
    };

type PromptPortEvent = {
  readonly kind: "session-update";
  readonly notification: SessionNotification;
};

type WorkerEvent =
  | { readonly kind: "session-update"; readonly notification: SessionNotification }
  | {
      readonly kind: "permission-request";
      readonly request: RequestPermissionRequest;
      readonly replyPort: MessagePort;
    }
  | { readonly kind: "child-stderr"; readonly byteLength: number }
  | { readonly kind: "cleanup-complete" }
  | {
      readonly kind: "closed";
      readonly code?: "ACP_FRAME_INVALID" | "ACP_FRAME_TOO_LARGE";
    };

const reducedEnvironment = (source: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(
    [
      "HOME",
      "PATH",
      "USER",
      "LOGNAME",
      "SHELL",
      "TMPDIR",
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_STATE_HOME",
      "SSL_CERT_FILE",
      "SSL_CERT_DIR",
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "NO_PROXY",
      "OMNIMIND_ACP_FIXTURE_MODE",
    ]
      .filter((key) => typeof source[key] === "string")
      .map((key) => [key, source[key]]),
  );

const workerModuleUrl = (): URL =>
  import.meta.url.endsWith(".ts")
    ? new URL("./acpSdkWorker.ts", import.meta.url)
    : new URL("./opencode/acpSdkWorker.mjs", import.meta.url);

const errorMessage = (code: OpenCodeAcpError["code"]) =>
  code === "ACP_FRAME_INVALID"
    ? "OpenCode ACP emitted an invalid frame."
    : code === "ACP_FRAME_TOO_LARGE"
      ? "OpenCode ACP frame exceeded the byte bound."
      : code === "ACP_MAILBOX_BOUND"
        ? "OpenCode ACP update mailbox exceeded the bound."
        : code === "ACP_AUTH_REQUIRED"
          ? "OpenCode ACP authentication is required."
          : code === "ACP_REQUEST_FAILED"
            ? "OpenCode ACP request failed."
            : code === "ACP_WRITE_FAILED"
              ? "OpenCode ACP write failed."
              : "OpenCode ACP closed.";

export class OpenCodeAcpSdkConnection {
  private readonly updateListeners = new Set<(notification: SessionNotification) => void>();
  private readonly closeListeners = new Set<(cause: OpenCodeAcpError) => void>();
  private permissionHandler: PermissionHandler | null = null;
  private closed = false;
  private terminalCause: OpenCodeAcpError | null = null;
  private resolveTerminalCause!: (cause: OpenCodeAcpError) => void;
  private readonly terminalCauseSignal = new Promise<OpenCodeAcpError>((resolve) => {
    this.resolveTerminalCause = resolve;
  });
  private stderrBytes = 0;
  private diagnosticReported = false;
  private shutdownPromise: Promise<void> | null = null;
  private resolveCleanupComplete!: () => void;
  private readonly cleanupCompleteSignal = new Promise<void>((resolve) => {
    this.resolveCleanupComplete = resolve;
  });

  private constructor(private readonly worker: Worker) {
    worker.on("message", (event: WorkerEvent) => this.handleWorkerEvent(event));
    worker.once("error", () => {
      this.resolveCleanupComplete();
      this.failClosed(new OpenCodeAcpError("ACP_CLOSED", "OpenCode ACP worker failed."));
    });
    worker.once("exit", () => {
      this.resolveCleanupComplete();
      this.failClosed(new OpenCodeAcpError("ACP_CLOSED", "OpenCode ACP worker closed."));
    });
    attachWorkerDiagnosticStream(worker.stdout, (chunk) =>
      this.isolateSdkDiagnostic(chunk.byteLength),
    );
    attachWorkerDiagnosticStream(worker.stderr, (chunk) =>
      this.isolateSdkDiagnostic(chunk.byteLength),
    );
  }

  static spawn(input: {
    readonly executable: string;
    readonly cwd: string;
    readonly env?: NodeJS.ProcessEnv;
  }): OpenCodeAcpSdkConnection {
    const worker = new Worker(workerModuleUrl(), {
      workerData: {
        executable: input.executable,
        cwd: input.cwd,
        env: reducedEnvironment(input.env ?? process.env),
      },
      stdout: true,
      stderr: true,
    });
    return new OpenCodeAcpSdkConnection(worker);
  }

  get boundedStderrByteCount(): number {
    return this.stderrBytes;
  }

  onSessionUpdate(listener: (notification: SessionNotification) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  onRequestPermission(listener: PermissionHandler): () => void {
    this.permissionHandler = listener;
    return () => {
      if (this.permissionHandler === listener) this.permissionHandler = null;
    };
  }

  onClose(listener: (cause: OpenCodeAcpError) => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  initialize(input: InitializeRequest, timeoutMs = 15_000): Promise<InitializeResponse> {
    return this.request({ kind: "initialize", input }, timeoutMs);
  }

  newSession(input: NewSessionRequest, timeoutMs = 15_000): Promise<NewSessionResponse> {
    return this.request({ kind: "new-session", input }, timeoutMs);
  }

  resumeSession(input: ResumeSessionRequest, timeoutMs = 15_000): Promise<ResumeSessionResponse> {
    return this.request({ kind: "resume-session", input }, timeoutMs);
  }

  prompt(input: PromptRequest, timeoutMs: number): Promise<PromptResponse> {
    return this.request({ kind: "prompt", input }, timeoutMs);
  }

  cancel(sessionId: string): Promise<void> {
    return this.request({ kind: "cancel", sessionId }, 15_000);
  }

  private async request<T>(command: WorkerCommand, timeoutMs: number): Promise<T> {
    if (this.closed) throw this.terminalCause ?? new OpenCodeAcpError("ACP_CLOSED", "ACP closed.");
    const { port1, port2 } = new MessageChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resolveResponse!: (value: T) => void;
    let rejectResponse!: (cause: OpenCodeAcpError) => void;
    const response = new Promise<T>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    const handleMessage = (message: WorkerReply<T> | PromptPortEvent) => {
      if ("kind" in message) {
        this.dispatchSessionUpdate(message.notification);
        return;
      }
      if (message.ok) resolveResponse(message.value);
      else rejectResponse(new OpenCodeAcpError(message.code, errorMessage(message.code)));
    };
    port1.on("message", handleMessage);
    this.worker.postMessage({ kind: "command", command, replyPort: port2 }, [port2]);
    try {
      return await Promise.race([
        response,
        this.terminalCauseSignal.then((cause) => {
          throw cause;
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const cause = new OpenCodeAcpError(
              "ACP_REQUEST_TIMEOUT",
              "OpenCode ACP request timed out.",
            );
            this.failClosed(cause);
            reject(cause);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      port1.off("message", handleMessage);
      port1.close();
    }
  }

  private handleWorkerEvent(event: WorkerEvent): void {
    if (event.kind === "session-update") {
      this.dispatchSessionUpdate(event.notification);
      return;
    }
    if (event.kind === "permission-request") {
      const handler = this.permissionHandler;
      if (!handler) {
        event.replyPort.postMessage({ outcome: { outcome: "cancelled" } });
        event.replyPort.close();
        return;
      }
      void Promise.resolve(handler(event.request))
        .then(
          (response) => event.replyPort.postMessage(response),
          () => event.replyPort.postMessage({ outcome: { outcome: "cancelled" } }),
        )
        .finally(() => event.replyPort.close());
      return;
    }
    if (event.kind === "child-stderr") {
      this.stderrBytes = Math.min(MAX_STDERR_BYTES, this.stderrBytes + event.byteLength);
      return;
    }
    if (event.kind === "cleanup-complete") {
      this.resolveCleanupComplete();
      return;
    }
    this.failClosed(
      new OpenCodeAcpError(event.code ?? "ACP_CLOSED", errorMessage(event.code ?? "ACP_CLOSED")),
    );
  }

  private dispatchSessionUpdate(notification: SessionNotification): void {
    try {
      for (const listener of this.updateListeners) listener(notification);
    } catch {
      this.isolateSdkDiagnostic(0);
    }
  }

  private isolateSdkDiagnostic(byteLength: number): void {
    this.stderrBytes = Math.min(MAX_STDERR_BYTES, this.stderrBytes + byteLength);
    if (!this.diagnosticReported) {
      this.diagnosticReported = true;
      logger.error("ACP boundary failed closed.", { reason: SDK_DIAGNOSTIC_REASON });
    }
    this.failClosed(
      new OpenCodeAcpError("ACP_FRAME_INVALID", "OpenCode ACP diagnostic was isolated."),
    );
  }

  private failClosed(cause: OpenCodeAcpError): void {
    if (this.closed) return;
    this.closed = true;
    this.terminalCause = cause;
    this.resolveTerminalCause(cause);
    for (const listener of this.closeListeners) listener(cause);
    void this.shutdownWorker();
  }

  private shutdownWorker(): Promise<void> {
    this.shutdownPromise ??= this.performWorkerShutdown();
    return this.shutdownPromise;
  }

  private async performWorkerShutdown(): Promise<void> {
    if (this.worker.threadId === -1) return;
    this.worker.postMessage({ kind: "shutdown" });
    await Promise.race([
      this.cleanupCompleteSignal,
      new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
    ]);
    if (this.worker.threadId !== -1) await this.worker.terminate();
  }

  async close(): Promise<void> {
    this.failClosed(new OpenCodeAcpError("ACP_CLOSED", "OpenCode ACP closed by Product Service."));
    await this.shutdownWorker();
  }
}

// FILE: packaged-proof-cdp.ts
// Purpose: Drives the one packaged Renderer journey over Chromium's loopback CDP endpoint.
// Layer: Packaged verification

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CDP_COMMAND_TIMEOUT_MS = 5_000;
const CDP_CONNECT_POLL_MS = 100;

type CdpResult = Record<string, unknown>;

interface CdpResponse {
  readonly id?: number;
  readonly error?: { readonly code?: number; readonly message?: string };
  readonly result?: CdpResult;
}

interface PendingCommand {
  readonly method: string;
  readonly resolve: (value: CdpResult) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export type PackagedProofCdpSocketFactory = (url: string) => WebSocket;

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function asErrorMessage(value: unknown): string {
  return value instanceof Error && value.message.length > 0 ? value.message : String(value);
}

function assertLoopbackUrl(rawUrl: string, protocol: "http:" | "ws:"): URL {
  const url = new URL(rawUrl);
  if (
    url.protocol !== protocol ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost" && url.hostname !== "[::1]")
  ) {
    throw new Error(`Packaged proof refused a non-loopback ${protocol.slice(0, -1)} endpoint.`);
  }
  return url;
}

export function parseDevToolsActivePort(contents: string): number {
  const [rawPort] = contents.split(/\r?\n/u);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Packaged proof received an invalid DevTools port.");
  }
  return port;
}

async function waitForDevToolsPort(userDataPath: string, deadline: number): Promise<number> {
  const activePortPath = join(userDataPath, "DevToolsActivePort");
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      return parseDevToolsActivePort(readFileSync(activePortPath, "utf8"));
    } catch (error) {
      lastError = error;
      await delay(CDP_CONNECT_POLL_MS);
    }
  }
  throw new Error(
    `Packaged Renderer DevTools port was not ready before the deadline: ${asErrorMessage(lastError)}`,
  );
}

interface DevToolsTarget {
  readonly type?: unknown;
  readonly webSocketDebuggerUrl?: unknown;
}

async function waitForRendererTarget(port: number, deadline: number): Promise<string> {
  const endpoint = assertLoopbackUrl(`http://127.0.0.1:${port}/json/list`, "http:");
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const remainingMs = Math.max(1, deadline - Date.now());
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(1_000, remainingMs)),
      });
      if (!response.ok) {
        throw new Error(`DevTools target list returned HTTP ${response.status}.`);
      }
      const targets = (await response.json()) as ReadonlyArray<DevToolsTarget>;
      const pageTarget = targets.find(
        (target) => target.type === "page" && typeof target.webSocketDebuggerUrl === "string",
      );
      if (typeof pageTarget?.webSocketDebuggerUrl === "string") {
        return assertLoopbackUrl(pageTarget.webSocketDebuggerUrl, "ws:").toString();
      }
    } catch (error) {
      lastError = error;
    }
    await delay(CDP_CONNECT_POLL_MS);
  }
  throw new Error(
    `Packaged Renderer CDP target was not ready before the deadline: ${asErrorMessage(lastError)}`,
  );
}

export class PackagedProofCdpSession {
  readonly #socket: WebSocket;
  readonly #pending = new Map<number, PendingCommand>();
  #nextId = 1;
  #closed = false;

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => this.#handleMessage(event));
    socket.addEventListener("close", () => this.#handleClose());
    socket.addEventListener("error", () => this.#handleClose());
  }

  static async connect(
    webSocketDebuggerUrl: string,
    socketFactory: PackagedProofCdpSocketFactory = (url) => new WebSocket(url),
    timeoutMs = 10_000,
  ): Promise<PackagedProofCdpSession> {
    const socket = socketFactory(assertLoopbackUrl(webSocketDebuggerUrl, "ws:").toString());
    await new Promise<void>((resolveOpen, rejectOpen) => {
      const timer = setTimeout(() => {
        cleanup();
        socket.close();
        rejectOpen(new Error("Packaged Renderer CDP WebSocket timed out while opening."));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("close", onClose);
        socket.removeEventListener("error", onError);
      };
      const onOpen = () => {
        cleanup();
        resolveOpen();
      };
      const onClose = () => {
        cleanup();
        rejectOpen(new Error("Packaged Renderer CDP WebSocket closed while opening."));
      };
      const onError = () => {
        cleanup();
        rejectOpen(new Error("Packaged Renderer CDP WebSocket failed while opening."));
      };
      socket.addEventListener("open", onOpen, { once: true });
      socket.addEventListener("close", onClose, { once: true });
      socket.addEventListener("error", onError, { once: true });
    });
    return new PackagedProofCdpSession(socket);
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.#command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error("Packaged Renderer evaluation failed.");
    }
    const remoteObject = response.result;
    if (!remoteObject || typeof remoteObject !== "object" || !("value" in remoteObject)) {
      throw new Error("Packaged Renderer evaluation returned no value.");
    }
    return (remoteObject as { readonly value: T }).value;
  }

  async insertText(text: string): Promise<void> {
    await this.#command("Input.insertText", { text });
  }

  async bringToFront(): Promise<void> {
    await this.#command("Page.bringToFront", {});
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#rejectPending(new Error("Packaged Renderer CDP session closed."));
    this.#socket.close();
  }

  #command(method: string, params: Record<string, unknown>): Promise<CdpResult> {
    if (this.#closed) {
      return Promise.reject(new Error("Packaged Renderer CDP session is closed."));
    }
    const id = this.#nextId++;
    return new Promise<CdpResult>((resolveCommand, rejectCommand) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        rejectCommand(new Error(`Packaged Renderer CDP ${method} timed out.`));
      }, CDP_COMMAND_TIMEOUT_MS);
      this.#pending.set(id, {
        method,
        resolve: resolveCommand,
        reject: rejectCommand,
        timer,
      });
      try {
        this.#socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timer);
        this.#pending.delete(id);
        rejectCommand(
          new Error(`Packaged Renderer CDP ${method} could not send: ${asErrorMessage(error)}`),
        );
      }
    });
  }

  #handleMessage(event: MessageEvent): void {
    if (typeof event.data !== "string") return;
    let response: CdpResponse;
    try {
      response = JSON.parse(event.data) as CdpResponse;
    } catch {
      return;
    }
    if (!Number.isInteger(response.id)) return;
    const pending = this.#pending.get(response.id!);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.#pending.delete(response.id!);
    if (response.error) {
      pending.reject(
        new Error(
          `Packaged Renderer CDP ${pending.method} failed (${response.error.code ?? "unknown"}): ${response.error.message ?? "unknown error"}`,
        ),
      );
      return;
    }
    pending.resolve(response.result ?? {});
  }

  #handleClose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#rejectPending(new Error("Packaged Renderer CDP WebSocket disconnected."));
  }

  #rejectPending(error: Error): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }
}

export async function connectPackagedRendererCdp(input: {
  readonly userDataPath: string;
  readonly timeoutMs?: number;
  readonly socketFactory?: PackagedProofCdpSocketFactory;
}): Promise<PackagedProofCdpSession> {
  const deadline = Date.now() + (input.timeoutMs ?? 10_000);
  const port = await waitForDevToolsPort(input.userDataPath, deadline);
  const targetUrl = await waitForRendererTarget(port, deadline);
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new Error("Packaged Renderer CDP connection timed out.");
  }
  return PackagedProofCdpSession.connect(targetUrl, input.socketFactory, remainingMs);
}

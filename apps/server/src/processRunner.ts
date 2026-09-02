import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { prepareWindowsSafeProcess } from "@harnessos/shared/windowsProcess";

import { terminateProcessTree } from "./platform/processTreeController.ts";

export interface ProcessRunOptions {
  cwd?: string | undefined;
  timeoutMs?: number | undefined;
  env?: NodeJS.ProcessEnv | undefined;
  stdin?: string | undefined;
  signal?: AbortSignal | undefined;
  allowNonZeroExit?: boolean | undefined;
  maxBufferBytes?: number | undefined;
  outputMode?: "error" | "truncate" | undefined;
  onStdoutChunk?: ((chunk: string) => void) | undefined;
  onStderrChunk?: ((chunk: string) => void) | undefined;
}

export interface ProcessRunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdoutTruncated?: boolean | undefined;
  stderrTruncated?: boolean | undefined;
}

function commandLabel(command: string, args: readonly string[]): string {
  return [command, ...args].join(" ");
}

function normalizeSpawnError(command: string, args: readonly string[], error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(`Failed to run ${commandLabel(command, args)}.`);
  }

  const maybeCode = (error as NodeJS.ErrnoException).code;
  if (maybeCode === "ENOENT") {
    return new Error(`Command not found: ${command}`);
  }

  return new Error(`Failed to run ${commandLabel(command, args)}: ${error.message}`);
}

function isWindowsCommandNotFound(code: number | null, stderr: string): boolean {
  if (process.platform !== "win32") return false;
  if (code === 9009) return true;
  return /is not recognized as an internal or external command/i.test(stderr);
}

function normalizeExitError(
  command: string,
  args: readonly string[],
  result: ProcessRunResult,
): Error {
  if (isWindowsCommandNotFound(result.code, result.stderr)) {
    return new Error(`Command not found: ${command}`);
  }

  const reason = result.timedOut
    ? "timed out"
    : `failed (code=${result.code ?? "null"}, signal=${result.signal ?? "null"})`;
  const stderr = result.stderr.trim();
  const detail = stderr.length > 0 ? ` ${stderr}` : "";
  return new Error(`${commandLabel(command, args)} ${reason}.${detail}`);
}

function normalizeStdinError(command: string, args: readonly string[], error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(`Failed to write stdin for ${commandLabel(command, args)}.`);
  }
  return new Error(`Failed to write stdin for ${commandLabel(command, args)}: ${error.message}`);
}

function normalizeBufferError(
  command: string,
  args: readonly string[],
  stream: "stdout" | "stderr",
  maxBufferBytes: number,
): Error {
  return new Error(
    `${commandLabel(command, args)} exceeded ${stream} buffer limit (${maxBufferBytes} bytes).`,
  );
}

const DEFAULT_MAX_BUFFER_BYTES = 8 * 1024 * 1024;

function processAbortError(): Error {
  const error = new Error("Process execution was aborted.");
  error.name = "AbortError";
  return error;
}

function appendChunkWithinLimit(
  target: string,
  currentBytes: number,
  chunk: Buffer,
  maxBytes: number,
  decoder: StringDecoder,
): {
  next: string;
  nextBytes: number;
  truncated: boolean;
} {
  const remaining = maxBytes - currentBytes;
  if (remaining <= 0) {
    return { next: target, nextBytes: currentBytes, truncated: true };
  }
  const accepted = chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
  return {
    next: `${target}${decoder.write(accepted)}`,
    nextBytes: currentBytes + accepted.length,
    truncated: chunk.length > remaining,
  };
}

export async function runProcess(
  command: string,
  args: readonly string[],
  options: ProcessRunOptions = {},
): Promise<ProcessRunResult> {
  if (options.signal?.aborted) {
    throw processAbortError();
  }

  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxBufferBytes = options.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES;
  const outputMode = options.outputMode ?? "error";

  return new Promise<ProcessRunResult>((resolve, reject) => {
    const prepared = prepareWindowsSafeProcess(command, args, {
      cwd: options.cwd,
      env: options.env,
    });
    const child = spawn(prepared.command, prepared.args, {
      cwd: options.cwd,
      env: options.env,
      stdio: "pipe",
      shell: prepared.shell,
      windowsHide: prepared.windowsHide,
      windowsVerbatimArguments: prepared.windowsVerbatimArguments,
    });

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let aborted = false;
    let settled = false;
    let rootExited = false;
    let closeObserved = false;
    let terminationDone = false;
    let terminalFailure: Error | null = null;
    let closeCode: number | null = null;
    let closeSignal: NodeJS.Signals | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let termination: Promise<void> | null = null;
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");
    const stdoutObserverDecoder = options.onStdoutChunk ? new StringDecoder("utf8") : null;
    const stderrObserverDecoder = options.onStderrChunk ? new StringDecoder("utf8") : null;

    const flushOutput = (): void => {
      if (!stdoutTruncated) stdout += stdoutDecoder.end();
      if (!stderrTruncated) stderr += stderrDecoder.end();
      flushOutputObserver(options.onStdoutChunk, stdoutObserverDecoder);
      flushOutputObserver(options.onStderrChunk, stderrObserverDecoder);
    };

    const finishIfReady = (): void => {
      if (settled || (termination ? !terminationDone : !closeObserved)) return;
      flushOutput();
      const result: ProcessRunResult = {
        stdout,
        stderr,
        code: closeObserved ? closeCode : child.exitCode,
        signal: closeObserved ? closeSignal : child.signalCode,
        timedOut,
        stdoutTruncated,
        stderrTruncated,
      };
      finalize(() => {
        if (terminalFailure) {
          reject(terminalFailure);
          return;
        }
        if (aborted) {
          reject(processAbortError());
          return;
        }
        if (
          !options.allowNonZeroExit &&
          (timedOut || (result.code !== null && result.code !== 0))
        ) {
          reject(normalizeExitError(command, args, result));
          return;
        }
        resolve(result);
      });
    };

    const requestTermination = (): void => {
      if (termination) return;
      const pid = child.pid;
      termination =
        pid === undefined
          ? Promise.resolve()
          : terminateProcessTree(pid, {
              rootExited: () => rootExited || child.exitCode !== null || child.signalCode !== null,
              signalRoot: (processSignal) => child.kill(processSignal),
              graceMs: 1_000,
              timeoutMs: 3_000,
            }).then(
              () => undefined,
              () => undefined,
            );
      void termination.finally(() => {
        terminationDone = true;
        finishIfReady();
      });
    };

    const onAbort = (): void => {
      // The first terminal cause wins: a signal that arrives after the timeout fired must not
      // relabel the already-timed-out process as an explicit cancellation.
      if (settled || aborted || timedOut) return;
      aborted = true;
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      requestTermination();
    };

    timeoutTimer = setTimeout(() => {
      timedOut = true;
      requestTermination();
    }, timeoutMs);

    const finalize = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      options.signal?.removeEventListener("abort", onAbort);
      callback();
    };

    const fail = (error: Error): void => {
      terminalFailure ??= error;
      requestTermination();
    };

    const appendOutput = (stream: "stdout" | "stderr", chunk: Buffer | string): Error | null => {
      if (aborted) return null;
      const chunkBuffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      const byteLength = chunkBuffer.length;
      if (stream === "stdout") {
        if (outputMode === "truncate") {
          const appended = appendChunkWithinLimit(
            stdout,
            stdoutBytes,
            chunkBuffer,
            maxBufferBytes,
            stdoutDecoder,
          );
          stdout = appended.next;
          stdoutBytes = appended.nextBytes;
          stdoutTruncated = stdoutTruncated || appended.truncated;
          return null;
        }
        stdout += stdoutDecoder.write(chunkBuffer);
        stdoutBytes += byteLength;
        if (stdoutBytes > maxBufferBytes) {
          return normalizeBufferError(command, args, "stdout", maxBufferBytes);
        }
      } else {
        if (outputMode === "truncate") {
          const appended = appendChunkWithinLimit(
            stderr,
            stderrBytes,
            chunkBuffer,
            maxBufferBytes,
            stderrDecoder,
          );
          stderr = appended.next;
          stderrBytes = appended.nextBytes;
          stderrTruncated = stderrTruncated || appended.truncated;
          return null;
        }
        stderr += stderrDecoder.write(chunkBuffer);
        stderrBytes += byteLength;
        if (stderrBytes > maxBufferBytes) {
          return normalizeBufferError(command, args, "stderr", maxBufferBytes);
        }
      }
      return null;
    };

    const notifyOutputObserver = (
      observer: ((chunk: string) => void) | undefined,
      decoder: StringDecoder | null,
      chunk: Buffer | string,
    ): void => {
      if (!observer || !decoder) return;
      try {
        const text = decoder.write(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        if (text.length > 0) observer(text);
      } catch {
        // Live-output observers are best effort and must never crash the child-process lifecycle.
      }
    };

    const flushOutputObserver = (
      observer: ((chunk: string) => void) | undefined,
      decoder: StringDecoder | null,
    ): void => {
      if (!observer || !decoder) return;
      try {
        const text = decoder.end();
        if (text.length > 0) observer(text);
      } catch {
        // Live-output observers are best effort and must never crash the child-process lifecycle.
      }
    };

    child.stdout.on("data", (chunk: Buffer | string) => {
      notifyOutputObserver(options.onStdoutChunk, stdoutObserverDecoder, chunk);
      const error = appendOutput("stdout", chunk);
      if (error) {
        fail(error);
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      notifyOutputObserver(options.onStderrChunk, stderrObserverDecoder, chunk);
      const error = appendOutput("stderr", chunk);
      if (error) {
        fail(error);
      }
    });

    child.once("error", (error) => {
      terminalFailure ??= aborted ? processAbortError() : normalizeSpawnError(command, args, error);
      if (child.pid === undefined) {
        rootExited = true;
        closeObserved = true;
        finishIfReady();
      } else {
        requestTermination();
      }
    });

    child.once("close", (code, signal) => {
      rootExited = true;
      closeObserved = true;
      closeCode = code;
      closeSignal = signal;
      finishIfReady();
    });

    child.stdin.once("error", (error) => {
      if (aborted) return;
      fail(normalizeStdinError(command, args, error));
    });

    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) {
      onAbort();
      return;
    }

    if (options.stdin !== undefined) {
      child.stdin.write(options.stdin, (error) => {
        if (aborted) return;
        if (error) {
          fail(normalizeStdinError(command, args, error));
          return;
        }
        child.stdin.end();
      });
      return;
    }
    child.stdin.end();
  });
}

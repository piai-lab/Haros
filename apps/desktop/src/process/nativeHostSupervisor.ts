import { spawn, type ChildProcess } from "node:child_process";

import type { NativeHostHealthStatus } from "@omnimind/contracts";

import { nativeHostChildEnvironment, type NativeHostRendezvous } from "./nativeHostRendezvous";

export const NATIVE_HOST_READY_TEXT = "OMNIMIND_NATIVE_HOST_READY protocol=1";
export const NATIVE_HOST_MAX_CRASHES = 3;
export const NATIVE_HOST_RESTART_BASE_DELAY_MS = 250;
export const NATIVE_HOST_STABLE_RESET_MS = 60_000;
export const NATIVE_HOST_STDERR_TAIL_CHARS = 8_192;

export interface NativeHostSupervisorState {
  readonly status: NativeHostHealthStatus;
  readonly reason: string | null;
  readonly restartAttempt: number;
  readonly stderrTail: string;
  readonly pid: number | null;
}

export type NativeHostExitDecision =
  | { readonly kind: "ignore" }
  | { readonly kind: "restart"; readonly attempt: number; readonly delayMs: number }
  | { readonly kind: "circuitOpen"; readonly failures: number };

export class NativeHostRestartPolicy {
  #failures = 0;
  #readyAtMs: number | null = null;
  #circuitOpen = false;

  get failures(): number {
    return this.#failures;
  }

  reset(): void {
    this.#failures = 0;
    this.#readyAtMs = null;
    this.#circuitOpen = false;
  }

  recordReadiness(nowMs: number): void {
    this.#readyAtMs = nowMs;
  }

  respondToExit(input: {
    readonly nowMs: number;
    readonly quitting: boolean;
    readonly restartPending: boolean;
  }): NativeHostExitDecision {
    if (input.quitting || input.restartPending) return { kind: "ignore" };
    if (this.#circuitOpen) {
      return { kind: "circuitOpen", failures: this.#failures };
    }
    if (this.#readyAtMs !== null && input.nowMs - this.#readyAtMs >= NATIVE_HOST_STABLE_RESET_MS) {
      this.#failures = 0;
    }
    this.#readyAtMs = null;
    this.#failures += 1;
    if (this.#failures >= NATIVE_HOST_MAX_CRASHES) {
      this.#circuitOpen = true;
      return { kind: "circuitOpen", failures: this.#failures };
    }
    return {
      kind: "restart",
      attempt: this.#failures,
      delayMs: NATIVE_HOST_RESTART_BASE_DELAY_MS * 2 ** (this.#failures - 1),
    };
  }
}

export interface NativeHostProcessSupervisorOptions {
  readonly executable: string;
  readonly entry: string;
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly nodeArgs?: ReadonlyArray<string>;
  readonly rendezvous: NativeHostRendezvous;
  readonly onState: (state: NativeHostSupervisorState) => void;
  readonly onStdout?: (chunk: Buffer) => void;
  readonly onStderr?: (chunk: Buffer) => void;
}

export class NativeHostProcessSupervisor {
  readonly #options: NativeHostProcessSupervisorOptions;
  readonly #policy = new NativeHostRestartPolicy();
  #child: ChildProcess | null = null;
  #restartTimer: ReturnType<typeof setTimeout> | null = null;
  #quitting = false;
  #stderrTail = "";
  #state: NativeHostSupervisorState = {
    status: "unavailable",
    reason: null,
    restartAttempt: 0,
    stderrTail: "",
    pid: null,
  };

  constructor(options: NativeHostProcessSupervisorOptions) {
    this.#options = options;
  }

  snapshot(): NativeHostSupervisorState {
    return this.#state;
  }

  childPid(): number | null {
    return this.#child?.pid ?? null;
  }

  recordAuthenticatedReadiness(): void {
    if (!this.#child || this.#quitting) return;
    this.#policy.recordReadiness(Date.now());
    this.#publish("ready", null);
  }

  recordAuthenticatedUnavailable(reason: string): void {
    if (!this.#child || this.#quitting) return;
    this.#publish("unavailable", reason);
  }

  #publish(status: NativeHostHealthStatus, reason: string | null): void {
    this.#state = {
      status,
      reason,
      restartAttempt: this.#policy.failures,
      stderrTail: this.#stderrTail,
      pid: this.#child?.pid ?? null,
    };
    this.#options.onState(this.#state);
  }

  #appendStderr(chunk: Buffer): void {
    this.#stderrTail = `${this.#stderrTail}${chunk.toString("utf8").replace(/\r/gu, "")}`;
    if (this.#stderrTail.length > NATIVE_HOST_STDERR_TAIL_CHARS) {
      this.#stderrTail = this.#stderrTail.slice(-NATIVE_HOST_STDERR_TAIL_CHARS);
    }
    this.#options.onStderr?.(chunk);
  }

  start(kind: "lifecycle" | "restart" = "lifecycle"): void {
    if (this.#quitting || this.#child) return;
    if (kind === "lifecycle") this.#policy.reset();
    this.#publish(kind === "lifecycle" ? "starting" : "restarting", null);
    const child = spawn(
      this.#options.executable,
      [...(this.#options.nodeArgs ?? []), this.#options.entry],
      {
        cwd: this.#options.cwd,
        env: nativeHostChildEnvironment(this.#options.environment, this.#options.rendezvous),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    this.#child = child;
    let sessionClosed = false;
    const handleExitOnce = (reason: string) => {
      if (sessionClosed) return;
      sessionClosed = true;
      if (this.#child === child) this.#child = null;
      this.#handleExit(reason);
    };
    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      this.#options.onStdout?.(chunk);
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-1_024);
      if (stdout.includes(NATIVE_HOST_READY_TEXT) && this.#child === child) {
        this.#publish(kind === "lifecycle" ? "starting" : "restarting", null);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => this.#appendStderr(chunk));
    child.once("error", () => {
      handleExitOnce("spawn failed");
    });
    child.once("exit", (code, signal) => {
      handleExitOnce(`code=${code ?? "null"} signal=${signal ?? "null"}`);
    });
  }

  #handleExit(reason: string): void {
    const decision = this.#policy.respondToExit({
      nowMs: Date.now(),
      quitting: this.#quitting,
      restartPending: this.#restartTimer !== null,
    });
    if (decision.kind === "ignore") {
      if (this.#quitting) this.#publish("unavailable", null);
      return;
    }
    if (decision.kind === "circuitOpen") {
      this.#publish("circuitOpen", reason);
      return;
    }
    this.#publish("restarting", reason);
    this.#restartTimer = setTimeout(() => {
      this.#restartTimer = null;
      this.start("restart");
    }, decision.delayMs);
    this.#restartTimer.unref();
  }

  retry(): void {
    if (this.#quitting) return;
    if (this.#restartTimer) {
      clearTimeout(this.#restartTimer);
      this.#restartTimer = null;
    }
    this.#policy.reset();
    this.start("lifecycle");
  }

  async stop(timeoutMs = 5_000): Promise<void> {
    this.#quitting = true;
    if (this.#restartTimer) {
      clearTimeout(this.#restartTimer);
      this.#restartTimer = null;
    }
    const child = this.#child;
    this.#child = null;
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      this.#publish("unavailable", null);
      return;
    }
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      child.once("exit", finish);
      child.kill("SIGTERM");
      const timer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        finish();
      }, timeoutMs);
      timer.unref();
    });
    this.#publish("unavailable", null);
  }
}

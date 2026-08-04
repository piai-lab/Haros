import { spawn, spawnSync } from "node:child_process";

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function missingProcess(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ESRCH";
}

export function processTreeAlive(pid) {
  if (process.platform !== "win32") {
    return processGroupCommands(pid).length > 0;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (missingProcess(error)) return false;
    throw error;
  }
}

export function signalProcessTree(pid, signal) {
  if (process.platform === "win32") {
    const result = spawnSync(
      "taskkill",
      ["/pid", String(pid), "/t", ...(signal === "SIGKILL" ? ["/f"] : [])],
      {
        stdio: "ignore",
      },
    );
    return result.status === 0;
  }

  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (missingProcess(error)) return false;
    throw error;
  }
}

export function processGroupCommands(pid) {
  if (process.platform === "win32") return [];
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,pgid=,command="], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Unable to inspect smoke process group ${pid}.`);
  }
  return result.stdout
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/u))
    .filter(Boolean)
    .map((match) => ({
      pid: Number(match[1]),
      parentPid: Number(match[2]),
      processGroupId: Number(match[3]),
      command: match[4],
    }))
    .filter((process) => process.processGroupId === pid);
}

async function waitForTreeExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (processTreeAlive(pid) && Date.now() < deadline) {
    await delay(25);
  }
  return !processTreeAlive(pid);
}

function boundedOutput(value, maximumLength = 24_000) {
  return value.length <= maximumLength ? value : value.slice(-maximumLength);
}

export async function runBoundedSmokeProcess(options) {
  const startedAt = Date.now();
  const child = spawn(options.command, options.args ?? [], {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  if (!child.pid) throw new Error("Smoke child started without a process id.");
  options.onSpawn?.(child.pid);

  let output = "";
  let readinessObserved = false;
  const observe = (chunk) => {
    output = boundedOutput(output + chunk.toString());
  };
  child.stdout.on("data", observe);
  child.stderr.on("data", observe);

  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ kind: "exit", code, signal }));
    child.once("error", (error) => resolve({ kind: "error", error }));
  });
  let observationFinished = false;
  const readiness = (async () => {
    while (!observationFinished) {
      try {
        const outputReady = output.includes(options.readinessText);
        const externalReady =
          !options.readinessProbe || (await options.readinessProbe(boundedOutput(output)));
        if (outputReady && externalReady) {
          readinessObserved = true;
          return { kind: "ready" };
        }
      } catch (error) {
        return { kind: "error", error };
      }
      await delay(25);
    }
    return { kind: "cancelled" };
  })();
  const readinessTimeout = delay(options.readinessTimeoutMs).then(() => ({ kind: "timeout" }));
  const observation = await Promise.race([readiness, exited, readinessTimeout]);
  observationFinished = true;

  let verificationError;
  if (observation.kind === "ready" && options.verifyReadiness) {
    try {
      await options.verifyReadiness({ pid: child.pid, output: boundedOutput(output) });
    } catch (error) {
      verificationError = error;
    }
  }

  let forced = false;
  signalProcessTree(child.pid, "SIGTERM");
  let stopped = await waitForTreeExit(child.pid, options.termGraceMs);
  if (!stopped) {
    forced = true;
    signalProcessTree(child.pid, "SIGKILL");
    stopped = await waitForTreeExit(child.pid, options.killGraceMs);
  }

  if (!stopped) {
    throw new Error(`Smoke process tree ${child.pid} survived SIGKILL.\n${boundedOutput(output)}`);
  }
  await Promise.race([exited, delay(options.killGraceMs)]);

  if (verificationError) {
    const message =
      verificationError instanceof Error ? verificationError.message : String(verificationError);
    throw new Error(
      `Desktop smoke readiness verification failed: ${message}.\n${boundedOutput(output)}`,
    );
  }

  if (observation.kind !== "ready") {
    const reason =
      observation.kind === "timeout"
        ? `readiness text was not observed within ${options.readinessTimeoutMs}ms`
        : observation.kind === "error"
          ? `spawn failed: ${observation.error instanceof Error ? observation.error.message : String(observation.error)}`
          : `process exited before readiness (code=${String(observation.code)}, signal=${String(observation.signal)})`;
    throw new Error(`Desktop smoke failed: ${reason}.\n${boundedOutput(output)}`);
  }

  return {
    pid: child.pid,
    readinessObserved,
    forced,
    durationMs: Date.now() - startedAt,
    output: boundedOutput(output),
  };
}

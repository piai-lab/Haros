// FILE: ownedChildProcess.ts
// Purpose: Terminates Desktop-owned child trees without shell-mediated PID loss on Windows.

import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

import {
  prepareWindowsSafeProcess,
  resolveWindowsSystemRoot,
} from "@harnessos/shared/windowsProcess";

export type DesktopOwnedChildProcess = Pick<ChildProcess, "pid" | "kill">;

export function terminateDesktopOwnedChild(
  child: DesktopOwnedChildProcess,
  signal: NodeJS.Signals = "SIGTERM",
  platform: NodeJS.Platform = process.platform,
): void {
  if (platform !== "win32" || child.pid === undefined) {
    child.kill(signal);
    return;
  }

  const prepared = prepareWindowsSafeProcess(
    path.win32.join(resolveWindowsSystemRoot(process.env), "System32", "taskkill.exe"),
    ["/pid", String(child.pid), "/t", "/f"],
    { env: process.env, platform },
  );
  const killer = spawn(prepared.command, prepared.args, {
    env: process.env,
    stdio: "ignore",
    shell: prepared.shell,
    windowsHide: prepared.windowsHide,
    windowsVerbatimArguments: prepared.windowsVerbatimArguments,
  });
  let fallbackInvoked = false;
  const fallback = () => {
    if (fallbackInvoked) return;
    fallbackInvoked = true;
    try {
      child.kill(signal);
    } catch {
      // The child may have exited between taskkill launch and fallback.
    }
  };
  killer.once("error", fallback);
  killer.once("exit", (code) => {
    if (code !== 0) fallback();
  });
  killer.unref();
}

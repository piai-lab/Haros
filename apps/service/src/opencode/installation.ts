import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";

import { resolveExecutable } from "../executableLookup";

export const OPENCODE_VERSION = "1.14.40" as const;
export const OPENCODE_SHA256 =
  "4b261084514f625065296e972995bb8a7eeadd6277ea5a679dbcf269185e1edc" as const;
export const OPENCODE_EXECUTABLE =
  "/opt/homebrew/Cellar/opencode/1.14.40/libexec/lib/node_modules/opencode-ai/node_modules/opencode-darwin-arm64/bin/opencode" as const;

export type OpenCodeInstallationUnavailableReason =
  | "missing"
  | "version-mismatch"
  | "artifact-mismatch"
  | "process-unavailable";

export type OpenCodeInstallationEvidence =
  | {
      readonly state: "available";
      readonly executable: string;
      readonly version: typeof OPENCODE_VERSION;
      readonly sha256: typeof OPENCODE_SHA256;
      readonly size: number;
    }
  | {
      readonly state: "unavailable";
      readonly reason: OpenCodeInstallationUnavailableReason;
    };

const readVersion = (executable: string, timeoutMs: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, ["--version"], {
      stdio: ["ignore", "pipe", "ignore"],
      env: process.env,
    });
    let stdout = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(stdout.trim());
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("OpenCode version check timed out."));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 128) {
        child.kill("SIGKILL");
        finish(new Error("OpenCode version output exceeded the bound."));
      }
    });
    child.once("error", (cause) => finish(cause));
    child.once("exit", (code) =>
      code === 0 ? finish() : finish(new Error("OpenCode version check failed.")),
    );
  });

export async function inspectOpenCodeInstallation(input: {
  readonly executable: string;
  readonly timeoutMs?: number;
}): Promise<OpenCodeInstallationEvidence> {
  let executable: string;
  try {
    const resolved = resolveExecutable(input.executable);
    if (!resolved) return { state: "unavailable", reason: "missing" };
    await access(resolved, constants.X_OK);
    executable = await realpath(resolved);
  } catch {
    return { state: "unavailable", reason: "missing" };
  }

  let version: string;
  try {
    version = await readVersion(executable, input.timeoutMs ?? 5_000);
  } catch {
    return { state: "unavailable", reason: "process-unavailable" };
  }
  if (version !== OPENCODE_VERSION) {
    return { state: "unavailable", reason: "version-mismatch" };
  }

  let sha256: string;
  let size: number;
  try {
    const metadata = await stat(executable);
    if (!metadata.isFile()) return { state: "unavailable", reason: "artifact-mismatch" };
    size = metadata.size;
    const digest = createHash("sha256");
    for await (const chunk of createReadStream(executable)) digest.update(chunk);
    sha256 = digest.digest("hex");
  } catch {
    return { state: "unavailable", reason: "process-unavailable" };
  }
  if (sha256 !== OPENCODE_SHA256) {
    return { state: "unavailable", reason: "artifact-mismatch" };
  }
  return {
    state: "available",
    executable,
    version: OPENCODE_VERSION,
    sha256: OPENCODE_SHA256,
    size,
  };
}

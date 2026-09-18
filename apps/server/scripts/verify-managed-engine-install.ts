// Opt-in real-download acceptance check. No real Engine home or credentials are used.
import { RUNNABLE_ENGINE_DESCRIPTORS } from "@harnessos/shared/engineMetadata";
import { prepareWindowsSafeProcess } from "@harnessos/shared/windowsProcess";
import { Effect } from "effect";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installManagedEngine } from "../src/engine/managedEngineInstall.ts";

const root = await mkdtemp(join(tmpdir(), "haros-install-proof-"));
const userHome = join(root, "home");
await mkdir(userHome);
const env = {
  ...process.env,
  HOME: userHome,
  USERPROFILE: userHome,
  LOCALAPPDATA: join(userHome, "local"),
  APPDATA: join(userHome, "roaming"),
  XDG_CONFIG_HOME: join(userHome, "config"),
  CODEX_HOME: join(userHome, "codex"),
  CLAUDE_CONFIG_DIR: join(userHome, "claude"),
};
for (const directory of [
  env.LOCALAPPDATA,
  env.APPDATA,
  env.XDG_CONFIG_HOME,
  env.CODEX_HOME,
  env.CLAUDE_CONFIG_DIR,
]) {
  await mkdir(directory, { recursive: true });
}
const selected = new Set(process.argv.slice(2));
const results = [];
for (const descriptor of RUNNABLE_ENGINE_DESCRIPTORS.filter(
  (item) => item.installation && selected.has(item.kind),
)) {
  for (const action of ["install", "update"]) {
    const result = await Effect.runPromise(
      installManagedEngine({
        engine: descriptor.kind,
        root,
        run: (command, args) =>
          Effect.tryPromise({
            try: (signal) =>
              new Promise<{ stdout: string; stderr: string; exitCode: number }>(
                (resolve, reject) => {
                  const prepared = prepareWindowsSafeProcess(command, args, { env, cwd: userHome });
                  execFile(
                    prepared.command,
                    [...prepared.args],
                    {
                      env,
                      ...(prepared.cwd ? { cwd: prepared.cwd } : {}),
                      windowsHide: true,
                      ...(prepared.windowsVerbatimArguments
                        ? { windowsVerbatimArguments: true }
                        : {}),
                      signal,
                      timeout: 120_000,
                    },
                    (error, stdout, stderr) => {
                      if (error) reject(new Error(`${command}: ${error.message}\n${stderr}`));
                      else resolve({ stdout, stderr, exitCode: 0 });
                    },
                  );
                },
              ),
            catch: (error) => error,
          }),
        progress: (message) =>
          Effect.sync(() => console.log(`${descriptor.kind} ${action}: ${message}`)),
      }).pipe(Effect.scoped, Effect.result),
    );
    results.push({
      engine: descriptor.kind,
      action,
      result,
      ...(result._tag === "Failure" ? { error: String(result.failure) } : {}),
    });
    console.log(JSON.stringify(results.at(-1)));
    await writeFile(join(root, "results.json"), JSON.stringify(results, null, 2));
    if (result._tag === "Failure") process.exitCode = 1;
  }
}
console.log(`Evidence: ${join(root, "results.json")}`);

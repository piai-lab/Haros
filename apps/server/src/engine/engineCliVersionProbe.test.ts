import { Effect } from "effect";
import * as PlatformError from "effect/PlatformError";
import { describe, expect, it } from "vitest";

import { probeEngineCliVersion } from "./engineCliVersionProbe";
import { makeCommandMissingCause } from "./engineCliOutput";

const success = { stdout: "1.2.3", stderr: "", code: 0 } as const;

describe("probeEngineCliVersion", () => {
  it("classifies successful and nonzero command results", async () => {
    await expect(
      Effect.runPromise(probeEngineCliVersion(Effect.succeed(success), 100)),
    ).resolves.toEqual({ outcome: "success", result: success });

    const nonzero = { stdout: "", stderr: "failed", code: 2 } as const;
    await expect(
      Effect.runPromise(probeEngineCliVersion(Effect.succeed(nonzero), 100)),
    ).resolves.toEqual({ outcome: "nonzero", result: nonzero });
  });

  it("distinguishes missing commands from other execution failures", async () => {
    const missing = PlatformError.systemError({
      _tag: "NotFound",
      module: "ChildProcess",
      method: "spawn",
      description: "engine executable is absent",
    });
    await expect(
      Effect.runPromise(probeEngineCliVersion(Effect.fail(missing), 100)),
    ).resolves.toEqual({ outcome: "missing", cause: missing });

    const failure = PlatformError.systemError({
      _tag: "PermissionDenied",
      module: "ChildProcess",
      method: "spawn",
      description: "permission denied for /tools/notfound/provider",
    });
    await expect(
      Effect.runPromise(probeEngineCliVersion(Effect.fail(failure), 100)),
    ).resolves.toEqual({ outcome: "failure", cause: failure });

    const nodeMissing = Object.assign(new Error("spawn failed"), { code: "ENOENT" });
    await expect(
      Effect.runPromise(probeEngineCliVersion(Effect.fail(nodeMissing), 100)),
    ).resolves.toEqual({ outcome: "missing", cause: nodeMissing });

    const shellMissing = makeCommandMissingCause("engine-cli");
    await expect(
      Effect.runPromise(probeEngineCliVersion(Effect.fail(shellMissing), 100)),
    ).resolves.toEqual({ outcome: "missing", cause: shellMissing });
  });

  it("classifies timeouts", async () => {
    await expect(Effect.runPromise(probeEngineCliVersion(Effect.never, 1))).resolves.toEqual({
      outcome: "timeout",
    });
  });
});

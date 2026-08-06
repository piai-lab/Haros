import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { OPENCODE_SHA256, OPENCODE_VERSION } from "./installation";
import { runOpenCodeLiveJourneyProbe } from "./liveJourneyProbe";

const fixture = fileURLToPath(new URL("./test-fixtures/acp-child.mjs", import.meta.url));

describe("OpenCode live journey probe", () => {
  it("runs one fixture Chat through Product v2 and persists proof before cleanup", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-opencode-live-probe-"));
    const resultFile = path.join(root, "result.json");
    try {
      const result = await runOpenCodeLiveJourneyProbe({
        candidate: "fixture-candidate",
        probeRoot: root,
        resultFile,
        executable: fixture,
        environment: {
          ...process.env,
          OMNIMIND_ACP_FIXTURE_MODE: "late-message-after-final",
        },
        inspectInstallation: async () => ({
          state: "available",
          executable: fixture,
          version: OPENCODE_VERSION,
          sha256: OPENCODE_SHA256,
          size: 1,
        }),
        timeoutMs: 10_000,
      });
      expect(result).toMatchObject({
        candidate: "fixture-candidate",
        readiness: { state: "available", runtimeVersion: "1.14.40" },
        acceptance: "PASS",
        journey: {
          receipt: {
            state: "settled",
            evidenceKind: "observed-delivery",
            operationRefPresent: false,
          },
          product: { assistantEntryCount: 1, assistantBeforeSettlement: true },
          outbox: [{ state: "terminal", sendBoundary: "observed" }],
          counters: {
            prepareCount: 1,
            attemptCount: 1,
            engineAttemptGuardCount: 1,
            siblingPrepareCount: 0,
            siblingAttemptCount: 0,
          },
        },
        cleanup: {
          cleanupComplete: true,
          runtimeDisposed: true,
          scratchEmpty: true,
          stateRemoved: true,
        },
      });
      expect((await stat(resultFile)).mode & 0o777).toBe(0o600);
      expect((await stat(`${resultFile}.snapshot`)).mode & 0o777).toBe(0o600);
      expect(JSON.parse(await readFile(resultFile, "utf8"))).toEqual(result);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps an empty successful Engine final distinct from visible-journey acceptance", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "omnimind-opencode-empty-probe-"));
    const resultFile = path.join(root, "result.json");
    try {
      const result = await runOpenCodeLiveJourneyProbe({
        candidate: "fixture-candidate",
        probeRoot: root,
        resultFile,
        executable: fixture,
        environment: {
          ...process.env,
          OMNIMIND_ACP_FIXTURE_MODE: "empty-success-final",
        },
        inspectInstallation: async () => ({
          state: "available",
          executable: fixture,
          version: OPENCODE_VERSION,
          sha256: OPENCODE_SHA256,
          size: 1,
        }),
        timeoutMs: 10_000,
      });

      expect(result).toMatchObject({
        acceptance: "FAIL",
        journey: {
          receipt: {
            state: "settled",
            evidenceKind: "observed-delivery",
            outcome: "succeeded",
          },
          product: {
            assistantEntryCount: 0,
            assistantTextPresent: false,
            assistantBeforeSettlement: false,
          },
        },
        cleanup: {
          cleanupComplete: true,
          runtimeDisposed: true,
          scratchEmpty: true,
          stateRemoved: true,
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import { processTreeAlive, runBoundedSmokeProcess } from "./smoke-process.mjs";

test("forces an entire descendant tree down when both processes ignore TERM", async () => {
  let spawnedPid;
  const fixture = `
    const { spawn } = require("node:child_process");
    process.on("SIGTERM", () => {});
    const descendant = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], { stdio: "ignore" });
    console.log("SMOKE_READY descendant=" + descendant.pid);
    setInterval(() => {}, 1000);
  `;

  const result = await runBoundedSmokeProcess({
    command: process.execPath,
    args: ["-e", fixture],
    readinessText: "SMOKE_READY",
    readinessTimeoutMs: 2_000,
    termGraceMs: 100,
    killGraceMs: 2_000,
    onSpawn: (pid) => {
      spawnedPid = pid;
    },
  });

  assert.equal(result.readinessObserved, true);
  assert.equal(result.forced, true);
  assert.equal(processTreeAlive(spawnedPid), false);

  const descendantPid = Number(/descendant=(\d+)/u.exec(result.output)?.[1]);
  assert.ok(Number.isInteger(descendantPid));
  const probe = execFileSync("sh", ["-c", `kill -0 ${descendantPid} 2>/dev/null; printf '%s' $?`], {
    encoding: "utf8",
  });
  assert.equal(probe, "1");
});

test("fails in bounded time when readiness never appears", async () => {
  const startedAt = Date.now();
  await assert.rejects(
    runBoundedSmokeProcess({
      command: process.execPath,
      args: ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
      readinessText: "NEVER_READY",
      readinessTimeoutMs: 100,
      termGraceMs: 50,
      killGraceMs: 2_000,
    }),
    /readiness text was not observed/u,
  );
  assert.ok(Date.now() - startedAt < 3_000);
});

test("waits for external readiness and still tears down after verification failure", async () => {
  let spawnedPid;
  let rendererReady = false;
  setTimeout(() => {
    rendererReady = true;
  }, 75);

  await assert.rejects(
    runBoundedSmokeProcess({
      command: process.execPath,
      args: ["-e", 'console.log("SERVICE_READY"); setInterval(() => {}, 1000)'],
      readinessText: "SERVICE_READY",
      readinessProbe: () => rendererReady,
      verifyReadiness: () => {
        throw new Error("profile escaped");
      },
      readinessTimeoutMs: 2_000,
      termGraceMs: 500,
      killGraceMs: 2_000,
      onSpawn: (pid) => {
        spawnedPid = pid;
      },
    }),
    /readiness verification failed: profile escaped/u,
  );

  assert.equal(processTreeAlive(spawnedPid), false);
});

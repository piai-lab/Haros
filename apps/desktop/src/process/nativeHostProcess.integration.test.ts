import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createNativeHostRendezvous } from "./nativeHostRendezvous";
import { createNativeHostBaseEnvironment } from "./nativeHostEnvironment";
import {
  NATIVE_HOST_MAX_CRASHES,
  NativeHostProcessSupervisor,
  type NativeHostSupervisorState,
} from "./nativeHostSupervisor";

const productionEntry = fileURLToPath(
  new URL("../../../native-host/dist/index.mjs", import.meta.url),
);
const supervisors = new Set<NativeHostProcessSupervisor>();

async function waitForState(
  states: ReadonlyArray<NativeHostSupervisorState>,
  status: NativeHostSupervisorState["status"],
  timeoutMs = 5_000,
): Promise<NativeHostSupervisorState> {
  const started = Date.now();
  for (;;) {
    const match = [...states].reverse().find((state) => state.status === status);
    if (match) return match;
    if (Date.now() - started >= timeoutMs) {
      throw new Error(`Timed out waiting for Native Host state ${status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(async () => {
  await Promise.all([...supervisors].map((supervisor) => supervisor.stop(1_000)));
  supervisors.clear();
});

describe("real Native Host child supervision", () => {
  it("restarts independently, opens its circuit and re-enters through explicit retry", async () => {
    const states: NativeHostSupervisorState[] = [];
    const preservedProductSnapshot = {
      conversationId: "conversation-preserved",
      queue: ["draft-preserved"],
      workbench: { activePane: "timeline" },
    } as const;
    const supervisor = new NativeHostProcessSupervisor({
      executable: process.execPath,
      entry: productionEntry,
      cwd: process.cwd(),
      environment: createNativeHostBaseEnvironment(process.env, process.cwd()),
      rendezvous: createNativeHostRendezvous(),
      onState: (state) => states.push(state),
    });
    supervisors.add(supervisor);
    supervisor.start();
    await waitForState(states, "starting");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(states.some((state) => state.status === "ready")).toBe(false);
    supervisor.recordAuthenticatedReadiness();

    for (let crash = 1; crash <= NATIVE_HOST_MAX_CRASHES; crash += 1) {
      const ready = await waitForState(states, "ready");
      expect(ready.pid).toBeTypeOf("number");
      const previousReadyCount = states.filter((state) => state.status === "ready").length;
      process.kill(ready.pid as number, "SIGKILL");
      if (crash < NATIVE_HOST_MAX_CRASHES) {
        const started = Date.now();
        while (supervisor.childPid() === null || supervisor.childPid() === ready.pid) {
          if (Date.now() - started > 5_000) throw new Error("Native Host did not restart.");
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(states.filter((state) => state.status === "ready")).toHaveLength(previousReadyCount);
        supervisor.recordAuthenticatedReadiness();
      }
    }

    const circuit = await waitForState(states, "circuitOpen");
    expect(circuit.restartAttempt).toBe(NATIVE_HOST_MAX_CRASHES);
    expect(preservedProductSnapshot).toEqual({
      conversationId: "conversation-preserved",
      queue: ["draft-preserved"],
      workbench: { activePane: "timeline" },
    });

    supervisor.retry();
    const readyCountBeforeRetry = states.filter((state) => state.status === "ready").length;
    const started = Date.now();
    while (supervisor.childPid() === null) {
      if (Date.now() - started > 5_000) throw new Error("Native Host did not re-enter.");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(states.filter((state) => state.status === "ready")).toHaveLength(readyCountBeforeRetry);
    supervisor.recordAuthenticatedReadiness();
    expect(supervisor.snapshot()).toMatchObject({ status: "ready", restartAttempt: 0 });
  });
});

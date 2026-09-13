import { DEFAULT_SERVER_SETTINGS, type HarosModelServiceDescriptor } from "@harnessos/contracts";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { modelCatalogSyncCycle } from "./HarosModelCatalogSync";
import { MODEL_CATALOG_SYNC_INTERVAL_MS } from "../officialModelCatalog";

const service = (serviceId: string): HarosModelServiceDescriptor => ({
  serviceId,
  providerId: serviceId,
  displayName: serviceId,
  origin: "builtin",
  authMethods: [],
  authState: "configured",
  authSource: "stored",
  storedCredentialType: "api_key",
  knownModelCount: 1,
  availableModelCount: 1,
  supportsNetworkRefresh: true,
  catalogState: "ready",
  catalogErrorCode: null,
});
describe("automatic model synchronization", () => {
  it("honors disabled services and credentials, retries failures and does not interrupt other services", async () => {
    let now = MODEL_CATALOG_SYNC_INTERVAL_MS * 10;
    const entries = [
      service("disabled"),
      { ...service("expired"), authState: "refresh_required" as const },
      service("failing"),
      service("working"),
    ];
    let fail = true;
    const refresh = vi.fn(({ serviceId }: { serviceId: string }) =>
      serviceId === "failing" && fail
        ? Effect.die(new Error("simulated failure"))
        : Effect.succeed({ state: "success" as const, service: service(serviceId) }),
    );
    const lastSuccess = new Map<string, number>();
    const sync = modelCatalogSyncCycle(
      {
        list: () =>
          Effect.succeed({
            state: "ready",
            services: entries,
            connectableServices: [],
            errorCode: null,
          }),
        refresh,
      },
      {
        getSettings: Effect.succeed({
          ...DEFAULT_SERVER_SETTINGS,
          modelServices: { added: {}, autoSync: { disabled: false } },
        }),
      },
      lastSuccess,
      () => now,
    );
    await Effect.runPromise(sync);
    expect(refresh.mock.calls.map(([input]) => input.serviceId)).toEqual(["failing", "working"]);
    expect(lastSuccess.has("failing")).toBe(false);
    fail = false;
    await Effect.runPromise(sync);
    expect(refresh).toHaveBeenLastCalledWith({ serviceId: "failing", force: false });
    expect(refresh).toHaveBeenCalledTimes(3);
    await Effect.runPromise(sync);
    expect(refresh).toHaveBeenCalledTimes(3);
    now += MODEL_CATALOG_SYNC_INTERVAL_MS;
    await Effect.runPromise(sync);
    expect(refresh).toHaveBeenCalledTimes(5);
    expect(lastSuccess.size).toBe(2);
  });
});

import { Effect, Layer } from "effect";
import { ServerSettingsService, type ServerSettingsShape } from "../../serverSettings.ts";
import {
  HarosModelServices,
  type HarosModelServicesShape,
} from "../Services/HarosModelServices.ts";
import { MODEL_CATALOG_SYNC_INTERVAL_MS } from "../officialModelCatalog.ts";

export function modelCatalogSyncCycle(
  modelServices: Pick<HarosModelServicesShape, "list" | "refresh">,
  settings: Pick<ServerSettingsShape, "getSettings">,
  lastSuccess: Map<string, number>,
  now: () => number = Date.now,
) {
  return Effect.gen(function* () {
    const preferences = yield* settings.getSettings;
    const catalog = yield* modelServices.list();
    if (catalog.state !== "ready") return;
    for (const service of catalog.services) {
      if (
        service.origin !== "builtin" ||
        service.authState !== "configured" ||
        !service.supportsNetworkRefresh ||
        preferences.modelServices.autoSync[service.serviceId] === false ||
        now() - (lastSuccess.get(service.serviceId) ?? 0) < MODEL_CATALOG_SYNC_INTERVAL_MS
      )
        continue;
      const result = yield* modelServices
        .refresh({ serviceId: service.serviceId, force: false })
        .pipe(Effect.catchCause(() => Effect.succeed(null)));
      if (result?.state === "success") lastSuccess.set(service.serviceId, now());
    }
  }).pipe(Effect.catchCause(() => Effect.void));
}

/** Server lifetime owns polling; closing Settings does not disable synchronization. */
export const HarosModelCatalogSyncLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const modelServices = yield* HarosModelServices;
    const settings = yield* ServerSettingsService;
    const sync = modelCatalogSyncCycle(modelServices, settings, new Map());
    yield* Effect.gen(function* () {
      yield* Effect.sleep("1 minute");
      yield* Effect.forever(
        Effect.gen(function* () {
          yield* sync;
          yield* Effect.sleep("1 hour");
        }),
      );
    }).pipe(Effect.forkScoped);
  }),
);

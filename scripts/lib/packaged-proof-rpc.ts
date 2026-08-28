// FILE: packaged-proof-rpc.ts
// Purpose: Opens one typed Effect RPC session to the bundled Server for deterministic fixtures.
// Layer: Release verification

import { createRequire } from "node:module";

import type {
  ClientOrchestrationCommand,
  DispatchResult,
  WsBootstrapNegotiateResult as WsBootstrapNegotiateResultValue,
} from "@harnessos/contracts";
import { Effect, Exit, Layer, ManagedRuntime, Schema, Scope } from "effect";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import * as Socket from "effect/unstable/socket/Socket";

import { redactPackagedProofSecrets } from "./packaged-proof-secrets.ts";

const RPC_CONNECT_TIMEOUT_MS = 5_000;
const RPC_COMMAND_TIMEOUT_MS = 5_000;

type ContractsModule = typeof import("@harnessos/contracts");
export type PackagedProofRuntimeContracts = Pick<
  ContractsModule,
  | "ORCHESTRATION_WS_METHODS"
  | "WS_CLIENT_REQUIRED_CAPABILITIES"
  | "WS_COMPATIBILITY_QUERY"
  | "WS_FEATURE_PATH"
  | "WS_NEGOTIATE_HTTP_PATH"
  | "WS_NEGOTIATE_QUERY"
  | "WS_PROTOCOL_EPOCH"
  | "WS_PROTOCOL_MAX_REVISION"
  | "WS_PROTOCOL_MIN_REVISION"
  | "WsBootstrapNegotiateResult"
  | "WsFeatureRpcGroup"
>;

type DispatchRpc = (command: ClientOrchestrationCommand) => Effect.Effect<DispatchResult, unknown>;
type RpcClientInstance = Record<string, DispatchRpc>;

function loadPackagedProofRuntimeContracts(): PackagedProofRuntimeContracts {
  try {
    // Node cannot execute the package's extensionless TypeScript source graph.
    // The packaged build already emits the canonical CJS contract artifact;
    // require selects that declared package export without copying wire facts.
    return createRequire(import.meta.url)("@harnessos/contracts") as PackagedProofRuntimeContracts;
  } catch {
    throw new Error(
      "Packaged journey requires the built @harnessos/contracts runtime from the artifact build.",
    );
  }
}

function makeProtocolLayer(url: string) {
  const socketLayer = Socket.layerWebSocket(url).pipe(
    Layer.provide(Socket.layerWebSocketConstructorGlobal),
  );
  return RpcClient.layerProtocolSocket().pipe(
    Layer.provide(Layer.mergeAll(socketLayer, RpcSerialization.layerJson)),
  );
}

function assertLoopbackWsUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (
    url.protocol !== "ws:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost" && url.hostname !== "[::1]")
  ) {
    throw new Error("Packaged proof refused a non-loopback bundled Server endpoint.");
  }
  return url;
}

export { redactPackagedProofSecrets } from "./packaged-proof-secrets.ts";

export function makePackagedProofNegotiateUrl(
  rawWsUrl: string,
  clientBuild: string,
  contracts: PackagedProofRuntimeContracts,
): string {
  const url = assertLoopbackWsUrl(rawWsUrl);
  url.protocol = "http:";
  url.pathname = contracts.WS_NEGOTIATE_HTTP_PATH;
  url.searchParams.set(contracts.WS_NEGOTIATE_QUERY.clientBuild, clientBuild);
  url.searchParams.set(
    contracts.WS_NEGOTIATE_QUERY.protocolEpoch,
    String(contracts.WS_PROTOCOL_EPOCH),
  );
  url.searchParams.set(
    contracts.WS_NEGOTIATE_QUERY.minRevision,
    String(contracts.WS_PROTOCOL_MIN_REVISION),
  );
  url.searchParams.set(
    contracts.WS_NEGOTIATE_QUERY.maxRevision,
    String(contracts.WS_PROTOCOL_MAX_REVISION),
  );
  for (const capability of contracts.WS_CLIENT_REQUIRED_CAPABILITIES) {
    url.searchParams.append(contracts.WS_NEGOTIATE_QUERY.requiredCapability, capability);
  }
  return url.toString();
}

export function makePackagedProofFeatureUrl(
  rawWsUrl: string,
  clientBuild: string,
  compatibility: WsBootstrapNegotiateResultValue,
  contracts: PackagedProofRuntimeContracts,
): string {
  const url = assertLoopbackWsUrl(rawWsUrl);
  url.pathname = contracts.WS_FEATURE_PATH;
  url.searchParams.set(contracts.WS_COMPATIBILITY_QUERY.clientBuild, clientBuild);
  url.searchParams.set(
    contracts.WS_COMPATIBILITY_QUERY.protocolEpoch,
    String(compatibility.protocolEpoch),
  );
  url.searchParams.set(
    contracts.WS_COMPATIBILITY_QUERY.protocolRevision,
    String(compatibility.negotiatedRevision),
  );
  url.searchParams.set(
    contracts.WS_COMPATIBILITY_QUERY.serverInstanceId,
    compatibility.serverInstanceId,
  );
  return url.toString();
}

async function negotiatePackagedProof(
  rawWsUrl: string,
  clientBuild: string,
  contracts: PackagedProofRuntimeContracts,
): Promise<WsBootstrapNegotiateResultValue> {
  const response = await fetch(makePackagedProofNegotiateUrl(rawWsUrl, clientBuild, contracts), {
    cache: "no-store",
    signal: AbortSignal.timeout(RPC_CONNECT_TIMEOUT_MS),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Bundled Server negotiation returned HTTP ${response.status}.`);
  }
  return Schema.decodeUnknownSync(contracts.WsBootstrapNegotiateResult)(body);
}

export class PackagedProofRpcSession {
  readonly #client: RpcClientInstance;
  readonly #runtime: ManagedRuntime.ManagedRuntime<RpcClient.Protocol, never>;
  readonly #scope: Scope.Closeable;
  readonly #dispatchMethod: string;
  #closed = false;

  constructor(input: {
    readonly client: RpcClientInstance;
    readonly runtime: ManagedRuntime.ManagedRuntime<RpcClient.Protocol, never>;
    readonly scope: Scope.Closeable;
    readonly dispatchMethod: string;
  }) {
    this.#client = input.client;
    this.#runtime = input.runtime;
    this.#scope = input.scope;
    this.#dispatchMethod = input.dispatchMethod;
  }

  async dispatchCommand(command: ClientOrchestrationCommand): Promise<DispatchResult> {
    if (this.#closed) throw new Error("Packaged proof RPC session is closed.");
    try {
      return await this.#runtime.runPromise(
        this.#client[this.#dispatchMethod]!(command).pipe(Effect.timeout(RPC_COMMAND_TIMEOUT_MS)),
      );
    } catch (error) {
      // eslint-disable-next-line preserve-caught-error -- The source may contain the in-memory auth URL; only the redacted diagnostic may cross this boundary.
      throw new Error(
        `Packaged proof RPC ${this.#dispatchMethod} failed: ${redactPackagedProofSecrets(String(error))}`,
      );
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#runtime.runPromise(Scope.close(this.#scope, Exit.void)).catch(() => undefined);
    await this.#runtime.dispose().catch(() => undefined);
  }
}

export async function connectPackagedProofRpc(input: {
  readonly rawWsUrl: string;
  readonly clientBuild: string;
}): Promise<PackagedProofRpcSession> {
  const rawWsUrl = assertLoopbackWsUrl(input.rawWsUrl).toString();
  let runtime: ManagedRuntime.ManagedRuntime<RpcClient.Protocol, never> | null = null;
  let scope: Scope.Closeable | null = null;
  try {
    const contracts = loadPackagedProofRuntimeContracts();
    const compatibility = await negotiatePackagedProof(rawWsUrl, input.clientBuild, contracts);
    runtime = ManagedRuntime.make(
      makeProtocolLayer(
        makePackagedProofFeatureUrl(rawWsUrl, input.clientBuild, compatibility, contracts),
      ),
    );
    scope = runtime.runSync(Scope.make());
    const makeRpcClient = RpcClient.make(contracts.WsFeatureRpcGroup);
    const client = await runtime.runPromise(
      Scope.provide(scope)(makeRpcClient).pipe(Effect.timeout(RPC_CONNECT_TIMEOUT_MS)),
    );
    return new PackagedProofRpcSession({
      client: client as unknown as RpcClientInstance,
      runtime,
      scope,
      dispatchMethod: contracts.ORCHESTRATION_WS_METHODS.dispatchCommand,
    });
  } catch (error) {
    if (runtime && scope) {
      await runtime.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined);
    }
    await runtime?.dispose().catch(() => undefined);
    // eslint-disable-next-line preserve-caught-error -- The source may contain the in-memory auth URL; only the redacted diagnostic may cross this boundary.
    throw new Error(
      `Packaged proof could not connect to the bundled Server: ${redactPackagedProofSecrets(String(error))}`,
    );
  }
}

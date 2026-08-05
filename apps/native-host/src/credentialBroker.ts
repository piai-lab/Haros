import { randomUUID } from "node:crypto";
import type { Socket } from "node:net";

import {
  NATIVE_HOST_PROTOCOL_VERSION,
  encodeNativeHostFrame,
  type NativeHostBrokerAvailabilityRequest,
  type NativeHostBrokerAvailabilityResponse,
  type NativeHostBrokerCredentialRequest,
  type NativeHostBrokerCredentialResponse,
} from "@omnimind/contracts/native-host";

import type {
  PiCredentialAvailability,
  PiCredentialBroker,
  PiCredentialResult,
} from "./piRuntime";

const BROKER_RESPONSE_TIMEOUT_MS = 5_000;

type BrokerResponse = NativeHostBrokerAvailabilityResponse | NativeHostBrokerCredentialResponse;

interface PendingBrokerRequest {
  readonly resolve: (response: BrokerResponse) => void;
  readonly reject: () => void;
  readonly timeout: ReturnType<typeof setTimeout>;
  readonly expectedKind: BrokerResponse["kind"];
  readonly provider: string;
  readonly runId: string | null;
}

export class NativeCredentialBroker implements PiCredentialBroker {
  readonly #hostInstanceId: string;
  readonly #pending = new Map<string, PendingBrokerRequest>();
  #socket: Socket | null = null;
  #desktopInstanceId: string | null = null;

  constructor(hostInstanceId: string) {
    this.#hostInstanceId = hostInstanceId;
  }

  attach(socket: Socket, desktopInstanceId: string): void {
    this.disconnect();
    this.#socket = socket;
    this.#desktopInstanceId = desktopInstanceId;
    socket.once("close", () => {
      if (this.#socket === socket) this.disconnect();
    });
    socket.once("error", () => {
      if (this.#socket === socket) this.disconnect();
    });
  }

  receive(response: BrokerResponse): boolean {
    if (
      response.desktopInstanceId !== this.#desktopInstanceId ||
      response.hostInstanceId !== this.#hostInstanceId
    ) {
      return false;
    }
    const pending = this.#pending.get(response.brokerRequestId);
    if (!pending) return false;
    this.#pending.delete(response.brokerRequestId);
    clearTimeout(pending.timeout);
    if (
      response.kind !== pending.expectedKind ||
      response.provider !== pending.provider ||
      (pending.runId !== null &&
        (response.kind !== "broker.credential.response" || response.runId !== pending.runId))
    ) {
      pending.reject();
      return false;
    }
    pending.resolve(response);
    return true;
  }

  disconnect(): void {
    const socket = this.#socket;
    this.#socket = null;
    this.#desktopInstanceId = null;
    if (socket && !socket.destroyed) socket.destroy();
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject();
    }
    this.#pending.clear();
  }

  async #request(
    request:
      | Omit<
          NativeHostBrokerAvailabilityRequest,
          "protocolVersion" | "brokerRequestId" | "desktopInstanceId" | "hostInstanceId"
        >
      | Omit<
          NativeHostBrokerCredentialRequest,
          "protocolVersion" | "brokerRequestId" | "desktopInstanceId" | "hostInstanceId"
        >,
  ): Promise<BrokerResponse | null> {
    const socket = this.#socket;
    const desktopInstanceId = this.#desktopInstanceId;
    if (!socket || socket.destroyed || !desktopInstanceId) return null;
    const brokerRequestId = `broker-${randomUUID()}`;
    const response = new Promise<BrokerResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(brokerRequestId);
        reject(new Error("broker timeout"));
      }, BROKER_RESPONSE_TIMEOUT_MS);
      timeout.unref();
      this.#pending.set(brokerRequestId, {
        resolve,
        reject: () => reject(new Error("broker unavailable")),
        timeout,
        expectedKind:
          request.kind === "broker.availability.request"
            ? "broker.availability.response"
            : "broker.credential.response",
        provider: request.provider,
        runId: request.kind === "broker.credential.request" ? request.runId : null,
      });
    });
    socket.write(
      encodeNativeHostFrame({
        ...request,
        protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
        brokerRequestId,
        desktopInstanceId,
        hostInstanceId: this.#hostInstanceId,
      }),
    );
    return response.catch(() => null);
  }

  async available(provider: string): Promise<PiCredentialAvailability> {
    const response = await this.#request({
      kind: "broker.availability.request",
      provider,
    });
    if (response?.kind !== "broker.availability.response") return "unavailable";
    return response.available ? "configured" : "missing";
  }

  async credential(provider: string, runId: string): Promise<PiCredentialResult> {
    const response = await this.#request({
      kind: "broker.credential.request",
      provider,
      runId,
    });
    if (response?.kind !== "broker.credential.response" || response.runId !== runId) {
      return { status: "unavailable" };
    }
    return response.credential === null
      ? { status: "missing" }
      : { status: "configured", credential: response.credential };
  }
}

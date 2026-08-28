import {
  WS_GITHUB_PROJECT_PROVISIONING_CAPABILITY,
  WS_OMNIMIND_AGENT_PROMPTS_CAPABILITY,
  WS_OMNIMIND_ECOSYSTEM_CAPABILITY,
  WS_OMNIMIND_MODEL_SERVICES_CAPABILITY,
  type NativeApi,
} from "@harnessos/contracts";

import {
  createWsNativeApi,
  onWsServerCapabilitiesChange,
  readWsServerCapabilities,
} from "./wsNativeApi";
import {
  addWsTransportStateListener,
  readLatestWsTransportState,
  type WsTransportState,
} from "./wsTransportEvents";

let cachedDesktopApi: NativeApi | undefined;

export function readNativeApi(): NativeApi | undefined {
  if (typeof window === "undefined") return undefined;
  if (cachedDesktopApi && window.nativeApi === cachedDesktopApi) return cachedDesktopApi;

  if (window.nativeApi) {
    cachedDesktopApi = window.nativeApi;
    return cachedDesktopApi;
  }

  return createWsNativeApi();
}

export function ensureNativeApi(): NativeApi {
  const api = readNativeApi();
  if (!api) {
    throw new Error("Native API not found");
  }
  return api;
}

export function readNativeApiServerCapabilityState(capability: string): boolean | null {
  if (typeof window === "undefined") return null;
  if (window.nativeApi) {
    if (capability === WS_GITHUB_PROJECT_PROVISIONING_CAPABILITY) {
      return typeof window.nativeApi.projects?.provisionFromGitHub === "function";
    }
    if (capability === WS_OMNIMIND_MODEL_SERVICES_CAPABILITY) {
      return (
        typeof window.nativeApi.omnimindModelServices?.list === "function" &&
        typeof window.nativeApi.omnimindModelServices?.get === "function"
      );
    }
    if (capability === WS_OMNIMIND_ECOSYSTEM_CAPABILITY) {
      return (
        typeof window.nativeApi.omnimindEcosystem?.list === "function" &&
        typeof window.nativeApi.omnimindEcosystem?.listResources === "function"
      );
    }
    if (capability === WS_OMNIMIND_AGENT_PROMPTS_CAPABILITY) {
      return (
        typeof window.nativeApi.omnimindAgentPrompts?.getSnapshot === "function" &&
        typeof window.nativeApi.omnimindAgentPrompts?.mutate === "function"
      );
    }
    return false;
  }
  const capabilities = readWsServerCapabilities();
  return capabilities === null ? null : capabilities.includes(capability);
}

export function readNativeApiServerCapability(capability: string): boolean {
  return readNativeApiServerCapabilityState(capability) === true;
}

export function onNativeApiServerCapabilitiesChange(
  listener: () => void,
  options?: { readonly replayCurrent?: boolean },
): () => void {
  if (typeof window === "undefined") {
    if (options?.replayCurrent) listener();
    return () => undefined;
  }
  if (window.nativeApi) {
    if (options?.replayCurrent) listener();
    return () => undefined;
  }
  return onWsServerCapabilitiesChange(listener, options);
}

export function readNativeApiTransportState(): WsTransportState | null {
  if (typeof window === "undefined") return null;
  if (window.nativeApi) return "open";
  return readLatestWsTransportState();
}

export function onNativeApiTransportStateChange(
  listener: () => void,
  options?: { readonly replayCurrent?: boolean },
): () => void {
  if (typeof window === "undefined") {
    if (options?.replayCurrent) listener();
    return () => undefined;
  }
  if (window.nativeApi) {
    if (options?.replayCurrent) listener();
    return () => undefined;
  }
  return addWsTransportStateListener(() => listener(), options);
}

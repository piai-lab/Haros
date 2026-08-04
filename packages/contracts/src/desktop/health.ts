export const DESKTOP_HEALTH_PROTOCOL_VERSION = 1 as const;

export type RendererHealthStatus = "ready" | "crashed" | "recovering" | "unavailable";
export type ServiceHealthStatus = "starting" | "ready" | "degraded" | "restarting" | "unavailable";
export type NativeHostHealthStatus =
  | "starting"
  | "ready"
  | "restarting"
  | "circuitOpen"
  | "unavailable";
export type EngineSelectionHealthStatus =
  | "available"
  | "degraded"
  | "unsupported"
  | "unauthenticated"
  | "unknown";

export interface DesktopProcessHealth<State extends string> {
  readonly status: State;
  readonly reason: string | null;
  readonly restartAttempt: number;
}

export interface DesktopHealthSnapshot {
  readonly protocolVersion: typeof DESKTOP_HEALTH_PROTOCOL_VERSION;
  readonly renderer: DesktopProcessHealth<RendererHealthStatus>;
  readonly service: DesktopProcessHealth<ServiceHealthStatus>;
  readonly nativeHost: DesktopProcessHealth<NativeHostHealthStatus>;
  readonly engineSelection: {
    readonly status: EngineSelectionHealthStatus;
    readonly reason: string | null;
  };
  readonly updatedAt: string;
}

export interface DesktopHealthBridge {
  readonly health: {
    readonly getSnapshot: () => Promise<DesktopHealthSnapshot>;
    readonly retryNativeHost: () => Promise<DesktopHealthSnapshot>;
    readonly onSnapshot: (listener: (snapshot: DesktopHealthSnapshot) => void) => () => void;
  };
}

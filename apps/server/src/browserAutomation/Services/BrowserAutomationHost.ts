import type {
  BrowserToolName,
  EngineWebSurfacePresentationContext,
  ProviderKind,
  ThreadId,
} from "@omnimind/contracts";
import { ServiceMap, type Effect } from "effect";

import type { BrowserHostRpcError } from "../browserHostRpcClient.ts";

export interface BrowserAutomationHostCall {
  readonly sessionKey: string;
  readonly provider: ProviderKind;
  readonly threadId: ThreadId;
  readonly name: BrowserToolName;
  readonly arguments: Record<string, unknown>;
  /** Server-resolved authenticated thread workspace. Never accepted from MCP arguments. */
  readonly workspaceRoot?: string;
  readonly timeoutMs: number;
}

export interface BrowserAutomationHostShape {
  readonly available: boolean;
  readonly execute: (
    input: BrowserAutomationHostCall,
  ) => Effect.Effect<unknown, BrowserHostRpcError>;
  readonly getEngineWebSurfaceContext?: (
    sessionKey: string,
  ) => Effect.Effect<EngineWebSurfacePresentationContext, BrowserHostRpcError>;
  readonly presentEngineWebSurface?: (input: {
    readonly sessionKey: string;
    readonly threadId: ThreadId;
    readonly surfaceId: string;
    readonly url: string;
    readonly expiresAt: number;
  }) => Effect.Effect<{ readonly surfaceId: string; readonly tabId: string }, BrowserHostRpcError>;
  readonly settleEngineWebSurface?: (input: {
    readonly sessionKey: string;
    readonly threadId: ThreadId;
    readonly surfaceId: string;
	readonly preserveTab?: boolean;
  }) => Effect.Effect<void, BrowserHostRpcError>;
}

export class BrowserAutomationHost extends ServiceMap.Service<
  BrowserAutomationHost,
  BrowserAutomationHostShape
>()("omnimind/browserAutomation/Services/BrowserAutomationHost") {}

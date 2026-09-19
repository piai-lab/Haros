import type { EngineKind, ThreadId } from "@harnessos/contracts";

export const ONBOARDING_TERMINAL_SCOPE_PREFIX = "onboarding-terminal:";

const CLIENT_NONCE = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

export function onboardingTerminalThreadId(engine: EngineKind): ThreadId {
  return `${ONBOARDING_TERMINAL_SCOPE_PREFIX}${CLIENT_NONCE}:${engine}` as ThreadId;
}

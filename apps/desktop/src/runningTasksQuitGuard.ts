// Coordinates one renderer decision across concurrent window-close/before-quit requests.
import type {
  DesktopQuitConfirmationRequest,
  DesktopQuitConfirmationResponse,
} from "@harnessos/contracts";

const DEFAULT_READY_TIMEOUT_MS = 3_000;
const MAX_CONTINUATION_PROMPT_CHARS = 2_000;

export interface DesktopQuitGuardResult {
  readonly allow: boolean;
  readonly resumeIntent?: {
    readonly threadIds: ReadonlyArray<string>;
    readonly continuationPrompt: string;
  };
}

export function shouldPromptForRunningTasksBeforeQuit(reason: string): boolean {
  return reason === "window-close" || reason === "before-quit";
}

export function parseQuitConfirmationResponse(
  payload: unknown,
): DesktopQuitConfirmationResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (typeof value.requestId !== "string" || value.requestId.trim().length === 0) return null;
  if (value.phase === "ready") {
    if (!Number.isInteger(value.runningCount) || (value.runningCount as number) < 0) return null;
    const threads = Array.isArray(value.threads)
      ? value.threads.flatMap((entry) => {
          if (!entry || typeof entry !== "object") return [];
          const id = (entry as Record<string, unknown>).id;
          const title = (entry as Record<string, unknown>).title;
          return typeof id === "string" && id.trim()
            ? [{ id, title: typeof title === "string" ? title : "" }]
            : [];
        })
      : [];
    return {
      requestId: value.requestId,
      phase: "ready",
      runningCount: value.runningCount as number,
      threads,
    };
  }
  if (
    value.phase === "decision" &&
    typeof value.allow === "boolean" &&
    typeof value.resume === "boolean" &&
    typeof value.continuationPrompt === "string" &&
    value.continuationPrompt.length <= MAX_CONTINUATION_PROMPT_CHARS
  ) {
    return {
      requestId: value.requestId,
      phase: "decision",
      allow: value.allow,
      resume: value.resume,
      continuationPrompt: value.continuationPrompt,
    };
  }
  return null;
}

export interface RunningTasksQuitGuard {
  readonly hasAllowedQuit: () => boolean;
  readonly cancelPending: () => void;
  readonly failOpenPending: () => void;
  readonly receiveResponse: (payload: unknown) => void;
  readonly askRenderer: (input: {
    readonly send: (request: DesktopQuitConfirmationRequest) => void;
    readonly isRendererAvailable: () => boolean;
    readonly readyTimeoutMs?: number;
  }) => Promise<DesktopQuitGuardResult>;
}

export function makeRunningTasksQuitGuard(
  createRequestId: () => string = () => crypto.randomUUID(),
): RunningTasksQuitGuard {
  let allowed = false;
  let inFlight: Promise<DesktopQuitGuardResult> | null = null;
  let pending: {
    readonly requestId: string;
    threads: ReadonlyArray<{ readonly id: string; readonly title: string }>;
    waitingForDecision: boolean;
    readyTimer: ReturnType<typeof setTimeout> | null;
    readonly resolve: (result: DesktopQuitGuardResult) => void;
  } | null = null;

  const finish = (result: DesktopQuitGuardResult): void => {
    const current = pending;
    if (!current) return;
    pending = null;
    if (current?.readyTimer) clearTimeout(current.readyTimer);
    if (result.allow) allowed = true;
    current?.resolve(result);
  };

  return {
    hasAllowedQuit: () => allowed,
    cancelPending: () => finish({ allow: false }),
    failOpenPending: () => finish({ allow: true }),
    receiveResponse(payload): void {
      const response = parseQuitConfirmationResponse(payload);
      if (!response || !pending || response.requestId !== pending.requestId) return;
      if (response.phase === "ready") {
        if (pending.readyTimer) clearTimeout(pending.readyTimer);
        pending.readyTimer = null;
        pending.threads = response.threads;
        if (response.runningCount <= 0 || response.threads.length === 0) {
          finish({ allow: true });
        } else {
          pending.waitingForDecision = true;
        }
        return;
      }
      if (!pending.waitingForDecision) return;
      if (!response.allow) {
        finish({ allow: false });
        return;
      }
      const threadIds = pending.threads.map((thread) => thread.id);
      finish({
        allow: true,
        ...(response.resume && response.continuationPrompt.trim() && threadIds.length > 0
          ? {
              resumeIntent: {
                threadIds,
                continuationPrompt: response.continuationPrompt,
              },
            }
          : {}),
      });
    },
    askRenderer(input): Promise<DesktopQuitGuardResult> {
      if (allowed) return Promise.resolve({ allow: true });
      if (inFlight) return inFlight;
      if (!input.isRendererAvailable()) return Promise.resolve({ allow: true });
      inFlight = new Promise<DesktopQuitGuardResult>((resolve) => {
        const requestId = createRequestId();
        pending = {
          requestId,
          threads: [],
          waitingForDecision: false,
          readyTimer: setTimeout(() => {
            if (pending?.requestId === requestId && !pending.waitingForDecision) {
              finish({ allow: true });
            }
          }, input.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS),
          resolve: (result) => {
            inFlight = null;
            resolve(result);
          },
        };
        try {
          input.send({ requestId });
        } catch {
          finish({ allow: true });
        }
      });
      return inFlight;
    },
  };
}

// Host-neutral execution lifecycle adapted from
// @mrclrchtr/supi-ask-user@5.0.0 src/ask-user.ts.

import { AskUserController } from "./controller.js";
import { ActiveQuestionnaireLock } from "./lock.js";
import { normalizeQuestionnaire } from "./normalize.js";
import { buildStructuredResult } from "./result.js";
import type {
  AskUserInteractionResult,
  AskUserKernelResult,
  AskUserOutcome,
  NormalizedQuestionnaire,
  QuestionnaireInput,
} from "./types.js";

export interface AskUserInteractionPort {
  present(
    questionnaire: NormalizedQuestionnaire,
    controller: AskUserController,
    signal: AbortSignal | undefined,
  ): Promise<AskUserOutcome | AskUserInteractionResult>;
}

export interface AskUserKernelOptions {
  interaction?: AskUserInteractionPort;
  signal?: AbortSignal;
  lock?: ActiveQuestionnaireLock;
}

export class AskUserUnavailableError extends Error {
  constructor() {
    super("ask_user has no canonical user-input interaction available.");
    this.name = "AskUserUnavailableError";
  }
}

export class AskUserBusyError extends Error {
  constructor() {
    super("another ask_user interaction is already in flight.");
    this.name = "AskUserBusyError";
  }
}

export async function executeAskUserKernel(
  input: QuestionnaireInput,
  options: AskUserKernelOptions,
): Promise<AskUserKernelResult> {
  const questionnaire = normalizeQuestionnaire(input);
  if (!options.interaction) throw new AskUserUnavailableError();
  if (options.signal?.aborted) return { kind: "abort" };

  const lock = options.lock ?? new ActiveQuestionnaireLock();
  const lease = lock.acquire();
  if (!lease) throw new AskUserBusyError();

  const controller = new AskUserController(questionnaire);
  let settled = false;

  try {
    return await new Promise<AskUserKernelResult>((resolve, reject) => {
      const finish = (result: AskUserKernelResult): void => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      const fail = (error: unknown): void => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      const onAbort = (): void => {
        controller.abort();
        finish({ kind: "abort" });
      };

      options.signal?.addEventListener("abort", onAbort, { once: true });
      void options.interaction
        ?.present(questionnaire, controller, options.signal)
        .then((result) => {
          if ("kind" in result) {
            finish(result);
            return;
          }
          finish({ kind: "completed", details: buildStructuredResult(questionnaire, result) });
        }, fail)
        .finally(() => options.signal?.removeEventListener("abort", onAbort));
    });
  } finally {
    lock.release(lease);
  }
}

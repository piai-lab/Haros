import type { TurnId } from "@harnessos/contracts";

export function resolveStableMessageTurnId(input: {
  readonly existingTurnId?: TurnId | null | undefined;
  readonly incomingTurnId?: TurnId | null | undefined;
}): TurnId | null {
  return input.existingTurnId ?? input.incomingTurnId ?? null;
}

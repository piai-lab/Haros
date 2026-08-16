// FILE: stopPolicy.ts
// Purpose: Resolves the explicit consecutive-failure policy while preserving legacy booleans.

import {
  DEFAULT_AUTOMATION_STOP_AFTER_CONSECUTIVE_FAILURES,
  type AutomationDefinition,
} from "@omnimind/contracts";

export function resolveAutomationStopAfterConsecutiveFailures(input: {
  readonly stopAfterConsecutiveFailures?: number | null | undefined;
  readonly stopOnError?: boolean | undefined;
  readonly current?: AutomationDefinition["stopAfterConsecutiveFailures"];
}): number | null {
  if (input.stopAfterConsecutiveFailures !== undefined) {
    return input.stopAfterConsecutiveFailures;
  }
  if (input.stopOnError === false) {
    return null;
  }
  if (input.stopOnError === true) {
    // Old full-form clients resend true for every non-null policy. Preserve an already
    // explicit threshold instead of silently collapsing 3/5 back to the legacy value 1.
    return input.current ?? DEFAULT_AUTOMATION_STOP_AFTER_CONSECUTIVE_FAILURES;
  }
  return input.current ?? DEFAULT_AUTOMATION_STOP_AFTER_CONSECUTIVE_FAILURES;
}

// Adapted from @mrclrchtr/supi-ask-user@5.0.0 src/render/result.ts.
// The upstream Pi/TUI summary and truncation are deliberately absent.

import type { AskUserDetails, AskUserOutcome, NormalizedQuestionnaire } from "./types.js";

export function buildStructuredResult(
  questionnaire: NormalizedQuestionnaire,
  outcome: AskUserOutcome,
): AskUserDetails {
  return {
    ...(questionnaire.title === undefined ? {} : { title: questionnaire.title }),
    ...(questionnaire.intro === undefined ? {} : { intro: questionnaire.intro }),
    questions: questionnaire.questions,
    outcome: outcome.outcome,
    ...(outcome.comment === undefined ? {} : { comment: outcome.comment }),
    responses: outcome.responses,
  };
}

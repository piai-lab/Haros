import type {
  NormalizedChoiceQuestion,
  NormalizedQuestionnaire,
  QuestionnaireInput,
} from "../src/types.ts";
import { normalizeQuestionnaire } from "../src/normalize.ts";

export function questionnaireInput(): QuestionnaireInput {
  return {
    title: "Decision",
    intro: "Choose carefully",
    questions: [
      {
        type: "choice",
        id: "approach",
        header: "Approach",
        prompt: "Which approach?",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        recommendation: "b",
      },
      {
        type: "choice",
        id: "features",
        header: "Features",
        prompt: "Which features?",
        multi: true,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
        ],
        recommendation: ["x"],
      },
      {
        type: "text",
        id: "notes",
        header: "Notes",
        prompt: "Anything else?",
        recommendation: "suggested",
        placeholder: "type here",
      },
    ],
  };
}

export function questionnaire(): NormalizedQuestionnaire {
  return normalizeQuestionnaire(questionnaireInput());
}

export function choiceAt(value: NormalizedQuestionnaire, index: number): NormalizedChoiceQuestion {
  const question = value.questions[index];
  if (question.type !== "choice") throw new Error("fixture question is not choice");
  return question;
}

// upstream-adapted: supi-ask-user result.test.ts

import { describe, expect, it } from "vitest";
import { AskUserController, buildStructuredResult } from "../src/api.ts";
import { choiceAt, questionnaire } from "./fixtures.ts";

describe("buildStructuredResult", () => {
  it("returns the normalized questionnaire and exact structured outcome", () => {
    const value = questionnaire();
    const controller = new AskUserController(value);
    controller.selectChoiceOption(choiceAt(value, 0), 0);
    controller.toggleChoiceOption(choiceAt(value, 1), 1);
    controller.setTextAnswer("notes", "  exact\ntext  ");
    controller.setComment("  exact form comment  ");
    const outcome = controller.outcome();
    expect(buildStructuredResult(value, outcome)).toEqual({
      title: "Decision",
      intro: "Choose carefully",
      questions: value.questions,
      ...outcome,
    });
  });

  it("does not synthesize model-visible prose or mutate user text", () => {
    const value = questionnaire();
    const controller = new AskUserController(value);
    controller.setTextAnswer("notes", "\n  raw  \n");
    const result = buildStructuredResult(value, controller.outcome());
    expect(result.responses[2].answer).toEqual({
      kind: "text",
      answered: true,
      value: "\n  raw  \n",
    });
    expect(result).not.toHaveProperty("content");
  });
});

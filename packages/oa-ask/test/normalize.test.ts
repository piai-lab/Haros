// upstream-adapted: supi-ask-user normalize.test.ts

import { describe, expect, it } from "vitest";
import { AskUserValidationError, normalizeQuestionnaire } from "../src/normalize.ts";
import { questionnaireInput } from "./fixtures.ts";

describe("normalizeQuestionnaire", () => {
  it("accepts a valid mixed decision form with both choice and text questions", () => {
    const result = normalizeQuestionnaire(questionnaireInput());
    expect(result.questions.map((question) => question.type)).toEqual(["choice", "choice", "text"]);
  });

  it("preserves stable question ids and option values exactly", () => {
    const input = questionnaireInput();
    input.questions[0].id = " approach ";
    if (input.questions[0].type === "choice") input.questions[0].options[0].value = " a ";
    const result = normalizeQuestionnaire(input);
    expect(result.questions[0].id).toBe(" approach ");
    expect(result.questions[0].type === "choice" && result.questions[0].options[0].value).toBe(
      " a ",
    );
  });

  it("preserves display and optional text without trim or Unicode rewriting", () => {
    const input = questionnaireInput();
    input.title = "  title  ";
    input.intro = String.raw`  intro \u263A  `;
    input.questions[0].header = "  header  ";
    input.questions[0].prompt = "  prompt  ";
    if (input.questions[0].type === "choice") {
      input.questions[0].options[0] = {
        value: "a",
        label: "  A  ",
        description: "  desc  ",
        details: "  details  ",
      };
    }
    const result = normalizeQuestionnaire(input);
    expect(result.title).toBe("  title  ");
    expect(result.intro).toBe(String.raw`  intro \u263A  `);
    expect(result.questions[0].header).toBe("  header  ");
    expect(result.questions[0].prompt).toBe("  prompt  ");
    if (result.questions[0].type !== "choice") throw new Error("expected choice");
    expect(result.questions[0].options[0]).toEqual({
      value: "a",
      label: "  A  ",
      description: "  desc  ",
      details: "  details  ",
    });
  });

  it("keeps recommendation as metadata without creating an answer", () => {
    const result = normalizeQuestionnaire(questionnaireInput());
    expect(result.questions[0].type === "choice" && result.questions[0].recommendedValues).toEqual([
      "b",
    ]);
    expect(result.questions[2].type === "text" && result.questions[2].suggestedText).toBe(
      "suggested",
    );
    expect(result.questions[2].type === "text" && result.questions[2].placeholder).toBe(
      "type here",
    );
  });

  it("accepts a reasonable large form without product question or option caps", () => {
    const questions = Array.from({ length: 32 }, (_, questionIndex) => ({
      type: "choice" as const,
      id: `q-${questionIndex}`,
      header: `Question ${questionIndex}`,
      prompt: `Prompt ${questionIndex}`,
      options: Array.from({ length: 64 }, (_, optionIndex) => ({
        value: `v-${questionIndex}-${optionIndex}`,
        label: `Option ${optionIndex}`,
      })),
    }));
    expect(normalizeQuestionnaire({ questions }).questions).toHaveLength(32);
    expect(normalizeQuestionnaire({ questions }).questions[0].type === "choice").toBe(true);
  });

  it("requires at least one question", () => {
    expect(() => normalizeQuestionnaire({ questions: [] })).toThrow(AskUserValidationError);
  });

  it("requires at least one authored option for a choice question", () => {
    expect(() =>
      normalizeQuestionnaire({
        questions: [{ type: "choice", id: "q", header: "Q", prompt: "?", options: [] }],
      }),
    ).toThrow(/at least one authored option/);
  });

  it("rejects blank identity and display fields without rewriting valid values", () => {
    for (const field of ["id", "header", "prompt"] as const) {
      const input = questionnaireInput();
      input.questions[0][field] = "   ";
      expect(() => normalizeQuestionnaire(input)).toThrow(AskUserValidationError);
    }
  });

  it("rejects duplicate question ids by exact stable identity", () => {
    const input = questionnaireInput();
    input.questions[1].id = input.questions[0].id;
    expect(() => normalizeQuestionnaire(input)).toThrow(/Duplicate question id/);
  });

  it("does not collapse ids that differ only by surrounding whitespace", () => {
    const input = questionnaireInput();
    input.questions[0].id = "q";
    input.questions[1].id = " q ";
    expect(normalizeQuestionnaire(input).questions.map((question) => question.id)).toEqual([
      "q",
      " q ",
      "notes",
    ]);
  });

  it("rejects duplicate option values", () => {
    const input = questionnaireInput();
    if (input.questions[0].type !== "choice") throw new Error("expected choice");
    input.questions[0].options[1].value = "a";
    expect(() => normalizeQuestionnaire(input)).toThrow(/duplicate option value/);
  });

  it("rejects array recommendation on single-select choice", () => {
    const input = questionnaireInput();
    if (input.questions[0].type !== "choice") throw new Error("expected choice");
    input.questions[0].recommendation = ["a"];
    expect(() => normalizeQuestionnaire(input)).toThrow(/must be a string/);
  });

  it("rejects string recommendation on multi-select choice", () => {
    const input = questionnaireInput();
    if (input.questions[1].type !== "choice") throw new Error("expected choice");
    input.questions[1].recommendation = "x";
    expect(() => normalizeQuestionnaire(input)).toThrow(/must be an array/);
  });

  it("rejects duplicate and unknown recommendation values", () => {
    const input = questionnaireInput();
    if (input.questions[1].type !== "choice") throw new Error("expected choice");
    input.questions[1].recommendation = ["x", "x"];
    expect(() => normalizeQuestionnaire(input)).toThrow(/duplicate recommendation/);
    input.questions[1].recommendation = ["unknown"];
    expect(() => normalizeQuestionnaire(input)).toThrow(/does not match any option/);
  });

  it.each(["allowPartialSubmit", "required", "initial", "allowOther"])(
    "rejects deprecated field %s",
    (field) => {
      const input = questionnaireInput() as unknown as Record<string, unknown>;
      if (field === "allowPartialSubmit") input[field] = true;
      else
        ((input.questions as Array<Record<string, unknown>>)[0] as Record<string, unknown>)[field] =
          true;
      expect(() => normalizeQuestionnaire(input as never)).toThrow(AskUserValidationError);
    },
  );
});

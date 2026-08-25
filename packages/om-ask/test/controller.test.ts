// upstream-adapted: supi-ask-user controller.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { AskUserController } from "../src/api.ts";
import { choiceAt, questionnaire } from "./fixtures.ts";

describe("AskUserController", () => {
  let controller: AskUserController;

  beforeEach(() => {
    controller = new AskUserController(questionnaire());
  });

  describe("initialization", () => {
    it("starts at index 0", () => {
      expect(controller.currentIndex).toBe(0);
    });

    it("does not preselect a recommended single-select option", () => {
      expect(controller.isOptionSelected("approach", "b")).toBe(false);
      expect(controller.outcome().responses[0].answer.answered).toBe(false);
    });

    it("does not preselect recommended multi-select options", () => {
      expect(controller.isOptionSelected("features", "x")).toBe(false);
    });

    it("does not prefill suggested text as an answer", () => {
      expect(controller.getTextAnswer("notes")).toBe("");
      expect(controller.outcome().responses[2].answer.answered).toBe(false);
    });
  });

  describe("navigation", () => {
    it("goNext advances and stops at the last question", () => {
      expect(controller.goNext()).toBe(true);
      expect(controller.currentIndex).toBe(1);
      expect(controller.goNext()).toBe(true);
      expect(controller.goNext()).toBe(false);
    });

    it("goBack retreats and stops at the first question", () => {
      controller.goTo(2);
      expect(controller.goBack()).toBe(true);
      expect(controller.currentIndex).toBe(1);
      controller.goBack();
      expect(controller.goBack()).toBe(false);
    });

    it("goTo accepts valid and rejects out-of-range indexes", () => {
      expect(controller.goTo(2)).toBe(true);
      expect(controller.currentIndex).toBe(2);
      expect(controller.goTo(-1)).toBe(false);
      expect(controller.goTo(3)).toBe(false);
    });
  });

  describe("choice behavior", () => {
    it("selectChoiceOption selects one option", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.selectChoiceOption(choice, 0);
      expect(controller.isOptionSelected("approach", "a")).toBe(true);
      expect(controller.isOptionSelected("approach", "b")).toBe(false);
    });

    it("selecting a different option replaces the previous selection", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.selectChoiceOption(choice, 0);
      controller.selectChoiceOption(choice, 1);
      expect(controller.isOptionSelected("approach", "a")).toBe(false);
      expect(controller.isOptionSelected("approach", "b")).toBe(true);
    });

    it("toggle selects and deselects a multi option", () => {
      const choice = choiceAt(controller.questionnaire, 1);
      controller.toggleChoiceOption(choice, 0);
      expect(controller.isOptionSelected("features", "x")).toBe(true);
      controller.toggleChoiceOption(choice, 0);
      expect(controller.isOptionSelected("features", "x")).toBe(false);
    });

    it("deselecting preserves the option comment", () => {
      const choice = choiceAt(controller.questionnaire, 1);
      controller.toggleChoiceOption(choice, 0);
      controller.setChoiceOptionComment(choice, 0, "why");
      controller.toggleChoiceOption(choice, 0);
      expect(controller.getOptionComment("features", "x")).toBe("why");
    });

    it("ignores an invalid option index", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.selectChoiceOption(choice, 100);
      expect(controller.outcome().responses[0].answer.answered).toBe(false);
    });
  });

  describe("lossless text and comments", () => {
    it("preserves a text answer byte-for-byte", () => {
      const value = "  line one\nline two\t🙂  ";
      controller.setTextAnswer("notes", value);
      expect(controller.getTextAnswer("notes")).toBe(value);
      expect(controller.outcome().responses[2].answer).toEqual({
        kind: "text",
        answered: true,
        value,
      });
    });

    it("treats whitespace-only user text as intentional content", () => {
      controller.setTextAnswer("notes", "   ");
      expect(controller.outcome().responses[2].answer).toEqual({
        kind: "text",
        answered: true,
        value: "   ",
      });
    });

    it("stores and clears form-level comment without trimming", () => {
      controller.setComment("  form\ncomment  ");
      expect(controller.comment).toBe("  form\ncomment  ");
      controller.setComment("");
      expect(controller.comment).toBeUndefined();
    });

    it("stores and clears question comment without trimming", () => {
      controller.setQuestionComment("approach", "  question  ");
      expect(controller.getQuestionComment("approach")).toBe("  question  ");
      controller.setQuestionComment("approach", "");
      expect(controller.getQuestionComment("approach")).toBeUndefined();
    });

    it("stores and removes option comment without trimming", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.setChoiceOptionComment(choice, 0, "  option  ");
      expect(controller.getOptionComment("approach", "a")).toBe("  option  ");
      controller.setChoiceOptionComment(choice, 0, "");
      expect(controller.getOptionComment("approach", "a")).toBeUndefined();
    });

    it("keeps comments on unanswered options in the structured response", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.setChoiceOptionComment(choice, 1, "not this one");
      expect(controller.outcome().responses[0].answer).toEqual({
        kind: "choice",
        answered: false,
        options: [{ value: "b", label: "B", selected: false, comment: "not this one" }],
      });
    });
  });

  describe("unanswered and outcome", () => {
    it("marking unanswered clears selection but preserves comments", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.selectChoiceOption(choice, 0);
      controller.setQuestionComment("approach", "need discussion");
      controller.markCurrentQuestionUnanswered();
      expect(controller.isOptionSelected("approach", "a")).toBe(false);
      expect(controller.getQuestionComment("approach")).toBe("need discussion");
      expect(controller.isQuestionMarkedUnanswered("approach")).toBe(true);
    });

    it("returns submitted only when every question is answered", () => {
      controller.selectChoiceOption(choiceAt(controller.questionnaire, 0), 0);
      controller.toggleChoiceOption(choiceAt(controller.questionnaire, 1), 1);
      controller.setTextAnswer("notes", "done");
      expect(controller.outcome().outcome).toBe("submitted");
    });

    it("returns needs_discussion when a question is unanswered", () => {
      expect(controller.outcome().outcome).toBe("needs_discussion");
    });

    it("preserves original question order in responses", () => {
      expect(controller.outcome().responses.map((response) => response.questionId)).toEqual([
        "approach",
        "features",
        "notes",
      ]);
    });

    it("choice responses include only touched options", () => {
      const choice = choiceAt(controller.questionnaire, 1);
      controller.toggleChoiceOption(choice, 1);
      const response = controller.outcome().responses[1];
      expect(response.answer.kind === "choice" && response.answer.options).toEqual([
        { value: "y", label: "Y", selected: true },
      ]);
    });
  });

  describe("terminal fencing", () => {
    it("cancel and abort settle idempotently", () => {
      expect(controller.cancel()).toEqual({ kind: "cancel" });
      expect(controller.abort()).toEqual({ kind: "cancel" });
      expect(controller.getInteractionResult()).toEqual({ kind: "cancel" });
    });

    it("blocks navigation after terminal settlement", () => {
      controller.cancel();
      expect(controller.goNext()).toBe(false);
      expect(controller.goTo(1)).toBe(false);
    });

    it("ignores late answer and comment mutations after settlement", () => {
      const choice = choiceAt(controller.questionnaire, 0);
      controller.abort();
      controller.selectChoiceOption(choice, 0);
      controller.setTextAnswer("notes", "late");
      controller.setComment("late");
      controller.setQuestionComment("approach", "late");
      controller.setChoiceOptionComment(choice, 0, "late");
      expect(controller.outcome().responses.every((response) => !response.answer.answered)).toBe(
        true,
      );
      expect(controller.comment).toBeUndefined();
      expect(controller.getQuestionComment("approach")).toBeUndefined();
      expect(controller.getOptionComment("approach", "a")).toBeUndefined();
    });

    it("throws for unknown question ids", () => {
      expect(() => controller.getTextAnswer("missing")).toThrow(/Unknown question id/);
    });
  });
});

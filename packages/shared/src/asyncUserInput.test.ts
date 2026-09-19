import { MessageId, type AsyncUserInput } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import { clearRemovedAsyncUserInputResponses, mergeAsyncUserInput } from "./asyncUserInput";

describe("async user input merge", () => {
  const answered: AsyncUserInput = {
    questions: [{ title: "Which option?" }],
    response: { messageId: MessageId.makeUnsafe("answer"), answers: ["A"] },
    responseSequence: 2,
  };
  const pending = { questions: [{ title: "Which option?" }] };
  const reopened = { questions: [{ title: "Which option?" }], responseSequence: 3 };

  it("keeps an accepted answer until a later sequence reopens it", () => {
    expect(mergeAsyncUserInput(answered, pending)).toBe(answered);
    expect(mergeAsyncUserInput(answered, reopened)).toBe(reopened);
    expect(mergeAsyncUserInput(reopened, answered)).toBe(reopened);
  });

  it("clears answers whose response message left the retained set", () => {
    const messages = [{ id: "question", asyncUserInput: answered }];
    expect(
      clearRemovedAsyncUserInputResponses(messages, new Set(["question", "answer"]), 10)[0],
    ).toBe(messages[0]);
    expect(
      clearRemovedAsyncUserInputResponses(messages, new Set(["question"]), 10)[0]?.asyncUserInput,
    ).toEqual({ questions: answered.questions, responseSequence: 10 });
  });
});

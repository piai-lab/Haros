import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ChatAssistantSelectionAttachment,
  UploadChatAssistantSelectionAttachment,
} from "./orchestration";

describe("assistant selection attachment contracts", () => {
  it.each([ChatAssistantSelectionAttachment, UploadChatAssistantSelectionAttachment])(
    "preserves bounded nonblank selection text during decode and encode",
    (schema) => {
      const input = {
        type: "assistant-selection" as const,
        ...(schema === ChatAssistantSelectionAttachment ? { id: "selection-1" } : {}),
        assistantMessageId: "message-1",
        text: "\r\n  selected text  \r\n",
      };
      const decoded = Schema.decodeUnknownSync(schema)(input as never);

      expect(decoded.text).toBe(input.text);
      expect(Schema.encodeSync(schema)(decoded).text).toBe(input.text);
    },
  );

  it.each([ChatAssistantSelectionAttachment, UploadChatAssistantSelectionAttachment])(
    "rejects whitespace-only selection text",
    (schema) => {
      const input = {
        type: "assistant-selection",
        ...(schema === ChatAssistantSelectionAttachment ? { id: "selection-1" } : {}),
        assistantMessageId: "message-1",
        text: " \n\t ",
      };

      expect(() => Schema.decodeUnknownSync(schema)(input)).toThrow();
    },
  );
});

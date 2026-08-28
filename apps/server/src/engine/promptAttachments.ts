// FILE: promptAttachments.ts
// Purpose: Shared helpers for turning persisted chat attachments into engine-native prompt inputs.
// Layer: Engine adapter utilities
// Depends on: shared chat attachment contracts.

import type { ChatAttachment, ChatImageAttachment, EngineKind } from "@harnessos/contracts";
import { Effect } from "effect";

import { resolveEngineAttachmentPath } from "./engineAttachmentPaths.ts";
import { EngineAdapterRequestError } from "./Errors.ts";

// Assistant selections stay in history as attachments, but the composer serializes them into text.
export function filterProviderPromptImageAttachments(
  attachments: ReadonlyArray<ChatAttachment> | undefined,
): ChatImageAttachment[] {
  return (attachments ?? []).filter(
    (attachment): attachment is ChatImageAttachment => attachment.type === "image",
  );
}

export interface EnginePromptImageBlock {
  readonly type: "image";
  readonly mimeType: string;
  readonly data: string;
}

export function loadProviderPromptImageBlocks(input: {
  readonly attachments: ReadonlyArray<ChatAttachment> | undefined;
  readonly attachmentsDir: string;
  readonly engine: EngineKind;
  readonly method: string;
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, unknown>;
  readonly readErrorDetail?: (cause: unknown) => string;
  readonly invalidAttachmentError?: (
    attachment: ChatImageAttachment,
    cause: Error,
  ) => EngineAdapterRequestError;
}): Effect.Effect<EnginePromptImageBlock[], EngineAdapterRequestError> {
  return Effect.forEach(
    filterProviderPromptImageAttachments(input.attachments),
    (attachment) => {
      const attachmentPath = resolveEngineAttachmentPath({
        attachmentsDir: input.attachmentsDir,
        attachment,
      });
      if (!attachmentPath) {
        const cause = new Error(`Invalid attachment id '${attachment.id}'.`);
        return Effect.fail(
          input.invalidAttachmentError?.(attachment, cause) ??
            new EngineAdapterRequestError({
              engine: input.engine,
              method: input.method,
              detail: cause.message,
            }),
        );
      }
      return input.readFile(attachmentPath).pipe(
        Effect.mapError(
          (cause) =>
            new EngineAdapterRequestError({
              engine: input.engine,
              method: input.method,
              detail:
                input.readErrorDetail?.(cause) ??
                (cause instanceof Error ? cause.message : String(cause)),
              cause,
            }),
        ),
        Effect.map((bytes) => ({
          type: "image" as const,
          mimeType: attachment.mimeType,
          data: Buffer.from(bytes).toString("base64"),
        })),
      );
    },
    { concurrency: 4 },
  );
}

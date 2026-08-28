// FILE: engineAttachmentPaths.ts
// Purpose: Resolves persisted attachment identities to engine-readable storage paths.
// Layer: Orchestration/provider boundary utility
// Depends on: managed attachment persistence and the legacy attachment layout.

import { statSync } from "node:fs";

import type { ChatAttachment, EngineKind, ThreadId } from "@harnessos/contracts";
import { Effect, Option } from "effect";

import { resolveAttachmentRelativePath } from "../attachmentPaths.ts";
import { resolveAttachmentPath } from "../attachmentStore.ts";
import type { ManagedAttachmentRepositoryShape } from "../persistence/Services/ManagedAttachments.ts";
import { EngineAdapterValidationError } from "./Errors.ts";

const MANAGED_ATTACHMENT_ID_PATTERN = /^att_v2_[0-9a-f]{32}$/u;
const ENGINE_ATTACHMENT_STORAGE_PATH = Symbol("harnessos.engineAttachmentStoragePath");

type EngineResolvedAttachment = ChatAttachment & {
  readonly [ENGINE_ATTACHMENT_STORAGE_PATH]?: string;
};

function isRegularFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function markedStoragePath(attachment: unknown): string | null {
  if (typeof attachment !== "object" || attachment === null) {
    return null;
  }
  const storagePath = (attachment as EngineResolvedAttachment)[ENGINE_ATTACHMENT_STORAGE_PATH];
  return typeof storagePath === "string" && storagePath.length > 0 ? storagePath : null;
}

function withStoragePath(attachment: ChatAttachment, storagePath: string): ChatAttachment {
  const resolved = { ...attachment } as EngineResolvedAttachment;
  Object.defineProperty(resolved, ENGINE_ATTACHMENT_STORAGE_PATH, {
    configurable: false,
    enumerable: false,
    value: storagePath,
    writable: false,
  });
  return resolved;
}

function resolutionError(input: {
  readonly engine: EngineKind;
  readonly operation: string;
  readonly attachmentId: string;
}): EngineAdapterValidationError {
  return new EngineAdapterValidationError({
    engine: input.engine,
    operation: input.operation,
    issue: `Attachment '${input.attachmentId}' is unavailable for this message. Reattach the file and retry.`,
  });
}

/** Resolve an attachment already normalized for engine dispatch, falling back to the legacy layout. */
export function resolveEngineAttachmentPath(input: {
  readonly attachmentsDir: string;
  readonly attachment: ChatAttachment;
}): string | null {
  return (
    markedStoragePath(input.attachment) ??
    resolveAttachmentPath({
      attachmentsDir: input.attachmentsDir,
      attachment: input.attachment,
    })
  );
}

/**
 * Schema decoding intentionally drops server-only properties. Carry only the
 * unforgeable in-process storage marker from the validated raw input to the
 * decoded attachment objects before adapter dispatch.
 */
export function carryEngineAttachmentPaths(
  rawInput: unknown,
  attachments: ReadonlyArray<ChatAttachment>,
): ChatAttachment[] {
  const rawAttachments =
    typeof rawInput === "object" &&
    rawInput !== null &&
    "attachments" in rawInput &&
    Array.isArray((rawInput as { readonly attachments?: unknown }).attachments)
      ? (rawInput as { readonly attachments: ReadonlyArray<unknown> }).attachments
      : [];

  return attachments.map((attachment, index) => {
    const storagePath = markedStoragePath(rawAttachments[index]);
    return storagePath ? withStoragePath(attachment, storagePath) : attachment;
  });
}

/**
 * Resolve managed attachments through their claimed repository record exactly
 * once at the orchestration/provider boundary. Legacy IDs retain their
 * historical flat-file resolution.
 */
export function resolveProviderDispatchAttachments(input: {
  readonly attachments: ReadonlyArray<ChatAttachment> | undefined;
  readonly attachmentsDir: string;
  readonly repository: Pick<ManagedAttachmentRepositoryShape, "findClaimedById">;
  readonly threadId: ThreadId;
  readonly messageId: string;
  readonly engine: EngineKind;
  readonly operation: string;
}) {
  return Effect.forEach(
    input.attachments ?? [],
    (attachment) => {
      if (attachment.type === "assistant-selection") {
        return Effect.succeed<ChatAttachment>(attachment);
      }

      const existingStoragePath = markedStoragePath(attachment);
      if (existingStoragePath) {
        return isRegularFile(existingStoragePath)
          ? Effect.succeed<ChatAttachment>(attachment)
          : Effect.fail(
              resolutionError({
                engine: input.engine,
                operation: input.operation,
                attachmentId: attachment.id,
              }),
            );
      }

      if (!MANAGED_ATTACHMENT_ID_PATTERN.test(attachment.id)) {
        const legacyPath = resolveAttachmentPath({
          attachmentsDir: input.attachmentsDir,
          attachment,
        });
        return legacyPath && isRegularFile(legacyPath)
          ? Effect.succeed(withStoragePath(attachment, legacyPath))
          : Effect.fail(
              resolutionError({
                engine: input.engine,
                operation: input.operation,
                attachmentId: attachment.id,
              }),
            );
      }

      return input.repository.findClaimedById({ attachmentId: attachment.id }).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.fail(
                resolutionError({
                  engine: input.engine,
                  operation: input.operation,
                  attachmentId: attachment.id,
                }),
              ),
            onSome: (blob) => {
              const storagePath = resolveAttachmentRelativePath({
                attachmentsDir: input.attachmentsDir,
                relativePath: blob.relativePath,
              });
              const isAuthorizedClaim =
                blob.state === "claimed" &&
                blob.ownerThreadId === input.threadId &&
                blob.claimMessageId === input.messageId;
              const isCompatibleBlob =
                (blob.kind === "image" || blob.kind === "file") &&
                blob.kind === attachment.type &&
                blob.sizeBytes !== null;
              if (
                !isAuthorizedClaim ||
                !isCompatibleBlob ||
                !storagePath ||
                !isRegularFile(storagePath)
              ) {
                return Effect.fail(
                  resolutionError({
                    engine: input.engine,
                    operation: input.operation,
                    attachmentId: attachment.id,
                  }),
                );
              }

              return Effect.succeed<ChatAttachment>(
                withStoragePath(
                  {
                    type: blob.kind,
                    id: blob.attachmentId,
                    name: blob.originalName,
                    mimeType: blob.mimeType,
                    sizeBytes: blob.sizeBytes,
                  },
                  storagePath,
                ),
              );
            },
          }),
        ),
      );
    },
    { concurrency: 1 },
  );
}

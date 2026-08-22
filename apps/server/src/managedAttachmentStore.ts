import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { ChatFileAttachment, ChatImageAttachment } from "@omnimind/contracts";
import { Effect, Option } from "effect";

import { resolveAttachmentRelativePath } from "./attachmentPaths";
import { inferAttachmentExtension, inferImageExtension } from "./imageMime";
import type { ManagedAttachmentPrincipal } from "./managedAttachmentPrincipal";
import type {
  ManagedAttachmentBlob,
  ManagedAttachmentRepositoryShape,
} from "./persistence/Services/ManagedAttachments";
import {
  ensurePrivateDirectorySync,
  repairPrivateFile,
  syncDirectoryEntry,
} from "./privatePathPermissions";

export const MANAGED_ATTACHMENT_STAGING_TTL_MS = 60 * 60 * 1_000;
const MANAGED_ATTACHMENT_ID_PREFIX = "att_v2_";

export type BinaryChatAttachment = ChatImageAttachment | ChatFileAttachment;
export type ManagedAttachmentForkCloneFailureReason =
  | "missing"
  | "unreadable"
  | "limit"
  | "clone-failed";
export type ManagedAttachmentForkCloneResult =
  | { readonly status: "cloned"; readonly attachment: BinaryChatAttachment }
  | {
      readonly status: "failed";
      readonly reason: ManagedAttachmentForkCloneFailureReason;
    };

export class ManagedAttachmentStoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, options: { status: number; code: string; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ManagedAttachmentStoreError";
    this.status = options.status;
    this.code = options.code;
  }
}

function validateMetadata(input: {
  readonly type: "image" | "file";
  readonly name: string;
  readonly mimeType: string;
}) {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!mimeType || mimeType.length > 100) {
    throw new ManagedAttachmentStoreError("Attachment MIME type is invalid.", {
      status: 400,
      code: "attachment_metadata_invalid",
    });
  }
  if (input.type === "image" && !mimeType.startsWith("image/")) {
    throw new ManagedAttachmentStoreError("Image attachments require an image MIME type.", {
      status: 400,
      code: "attachment_metadata_invalid",
    });
  }
  const name = input.name.trim();
  if (!name || name.length > 255 || /[\u0000\r\n]/u.test(name)) {
    throw new ManagedAttachmentStoreError("Attachment name is invalid.", {
      status: 400,
      code: "attachment_metadata_invalid",
    });
  }
  return { name, mimeType };
}

function extensionFor(input: {
  readonly type: "image" | "file";
  readonly name: string;
  readonly mimeType: string;
}): string {
  return input.type === "image"
    ? inferImageExtension({ mimeType: input.mimeType, fileName: input.name })
    : inferAttachmentExtension({
        mimeType: input.mimeType,
        fileName: input.name,
      });
}

export function reserveManagedAttachmentUpload(input: {
  readonly type: "image" | "file";
  readonly threadId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly reservedBytes: number;
  readonly now: string;
  readonly principal: ManagedAttachmentPrincipal;
  readonly repository: ManagedAttachmentRepositoryShape;
}) {
  return Effect.gen(function* () {
    const metadata = yield* Effect.try({
      try: () => validateMetadata(input),
      catch: (cause) =>
        cause instanceof ManagedAttachmentStoreError
          ? cause
          : new ManagedAttachmentStoreError("Attachment metadata is invalid.", {
              status: 400,
              code: "attachment_metadata_invalid",
              cause,
            }),
    });
    const attachmentId = `${MANAGED_ATTACHMENT_ID_PREFIX}${randomUUID().replaceAll("-", "")}`;
    const extension = extensionFor({ type: input.type, ...metadata });
    const relativePath = `objects/${attachmentId.slice(MANAGED_ATTACHMENT_ID_PREFIX.length, MANAGED_ATTACHMENT_ID_PREFIX.length + 2)}/${attachmentId}${extension}`;
    const result = yield* input.repository.reserve({
      attachmentId,
      ownerThreadId: input.threadId,
      ownerKind: input.principal.ownerKind,
      ownerId: input.principal.ownerId,
      kind: input.type,
      originalName: metadata.name,
      mimeType: metadata.mimeType,
      reservedBytes: input.reservedBytes,
      relativePath,
      now: input.now,
    });
    if (result.status === "quota-exceeded") {
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Managed attachment storage quota exceeded.", {
          status: 507,
          code: "attachment_quota_exceeded",
        }),
      );
    }
    if (result.status !== "reserved") {
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Could not reserve attachment storage.", {
          status: 409,
          code: "attachment_reservation_conflict",
        }),
      );
    }
    return result.attachment;
  });
}

export function persistReservedManagedAttachment(input: {
  readonly reservation: ManagedAttachmentBlob;
  readonly bytes: Uint8Array;
  readonly attachmentsDir: string;
  readonly now: string;
  readonly principal: ManagedAttachmentPrincipal;
  readonly repository: ManagedAttachmentRepositoryShape;
}): Effect.Effect<BinaryChatAttachment, Error> {
  return Effect.gen(function* () {
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > input.reservation.reservedBytes) {
      yield* input.repository
        .cancelStaged({
          attachmentId: input.reservation.attachmentId,
          ownerKind: input.principal.ownerKind,
          ownerId: input.principal.ownerId,
          reason: "upload-size-mismatch",
          requestedAt: input.now,
        })
        .pipe(Effect.ignore);
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Attachment is empty or larger than its reservation.", {
          status: 413,
          code: "attachment_size_mismatch",
        }),
      );
    }
    const finalPath = resolveAttachmentRelativePath({
      attachmentsDir: input.attachmentsDir,
      relativePath: input.reservation.relativePath,
    });
    if (!finalPath) {
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Attachment storage path is invalid.", {
          status: 500,
          code: "attachment_path_invalid",
        }),
      );
    }
    const stagingDir = path.join(input.attachmentsDir, ".staging");
    const temporaryPath = path.join(stagingDir, `${input.reservation.attachmentId}.part`);
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");

    const writeResult = yield* Effect.exit(
      Effect.tryPromise({
        try: async () => {
          ensurePrivateDirectorySync(input.attachmentsDir);
          ensurePrivateDirectorySync(stagingDir);
          ensurePrivateDirectorySync(path.dirname(finalPath));
          const handle = await fs.open(temporaryPath, "wx", 0o600);
          try {
            await handle.writeFile(input.bytes);
            await handle.sync();
          } finally {
            await handle.close();
          }
          await repairPrivateFile(temporaryPath);
          await fs.rename(temporaryPath, finalPath);
          // The blob must be durable before the SQLite row can become staged.
          // Flush the final entry and every managed ancestor that may have
          // been created for this content-addressed path.
          const attachmentsRoot = path.resolve(input.attachmentsDir);
          let directoryToSync = path.dirname(finalPath);
          while (true) {
            await syncDirectoryEntry(directoryToSync);
            if (directoryToSync === attachmentsRoot) break;
            const parent = path.dirname(directoryToSync);
            if (
              parent === directoryToSync ||
              (parent !== attachmentsRoot && !parent.startsWith(`${attachmentsRoot}${path.sep}`))
            ) {
              throw new Error("Managed attachment directory escaped its storage root.");
            }
            directoryToSync = parent;
          }
        },
        catch: (cause) =>
          new ManagedAttachmentStoreError("Failed to persist attachment bytes.", {
            status: 500,
            code: "attachment_write_failed",
            cause,
          }),
      }),
    );
    if (writeResult._tag === "Failure") {
      yield* input.repository
        .cancelStaged({
          attachmentId: input.reservation.attachmentId,
          ownerKind: input.principal.ownerKind,
          ownerId: input.principal.ownerId,
          reason: "upload-write-failed",
          requestedAt: input.now,
        })
        .pipe(Effect.ignore);
      yield* Effect.tryPromise({
        try: () => fs.unlink(temporaryPath),
        catch: () => undefined,
      }).pipe(Effect.ignore);
      return yield* Effect.failCause(writeResult.cause);
    }

    const stagingExpiresAt = new Date(
      Date.parse(input.now) + MANAGED_ATTACHMENT_STAGING_TTL_MS,
    ).toISOString();
    const finalized = yield* input.repository.finalizeStaged({
      attachmentId: input.reservation.attachmentId,
      ownerThreadId: input.reservation.ownerThreadId,
      ownerKind: input.principal.ownerKind,
      ownerId: input.principal.ownerId,
      sizeBytes: input.bytes.byteLength,
      sha256,
      stagingExpiresAt,
      now: input.now,
    });
    if (finalized.status !== "staged") {
      yield* input.repository.cancelStaged({
        attachmentId: input.reservation.attachmentId,
        ownerKind: input.principal.ownerKind,
        ownerId: input.principal.ownerId,
        reason: "upload-finalize-failed",
        requestedAt: input.now,
      });
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Attachment reservation expired before finalization.", {
          status: 409,
          code: "attachment_reservation_expired",
        }),
      );
    }
    return {
      type: finalized.attachment.kind as "image" | "file",
      id: finalized.attachment.attachmentId,
      name: finalized.attachment.originalName,
      mimeType: finalized.attachment.mimeType,
      sizeBytes: finalized.attachment.sizeBytes!,
    };
  });
}

function managedAttachmentRelativePath(input: {
  readonly attachmentId: string;
  readonly type: "image" | "file";
  readonly name: string;
  readonly mimeType: string;
}): string {
  const extension = extensionFor(input);
  const objectKey = input.attachmentId.startsWith(MANAGED_ATTACHMENT_ID_PREFIX)
    ? input.attachmentId.slice(MANAGED_ATTACHMENT_ID_PREFIX.length)
    : input.attachmentId;
  return `objects/${objectKey.slice(0, 2)}/${input.attachmentId}${extension}`;
}

async function syncManagedAttachmentAncestors(attachmentsDir: string, finalPath: string) {
  const attachmentsRoot = path.resolve(attachmentsDir);
  let directoryToSync = path.dirname(finalPath);
  while (true) {
    await syncDirectoryEntry(directoryToSync);
    if (directoryToSync === attachmentsRoot) break;
    const parent = path.dirname(directoryToSync);
    if (
      parent === directoryToSync ||
      (parent !== attachmentsRoot && !parent.startsWith(`${attachmentsRoot}${path.sep}`))
    ) {
      throw new Error("Managed attachment directory escaped its storage root.");
    }
    directoryToSync = parent;
  }
}

function binaryAttachmentFromBlob(blob: ManagedAttachmentBlob): BinaryChatAttachment {
  return {
    type: blob.kind as "image" | "file",
    id: blob.attachmentId,
    name: blob.originalName,
    mimeType: blob.mimeType,
    sizeBytes: blob.sizeBytes!,
  };
}

async function hashManagedAttachmentFile(filePath: string): Promise<{
  readonly sizeBytes: number;
  readonly sha256: string;
}> {
  const handle = await fs.open(filePath, "r");
  const hash = createHash("sha256");
  const chunk = Buffer.allocUnsafe(1024 * 1024);
  let sizeBytes = 0;
  try {
    while (true) {
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      hash.update(chunk.subarray(0, bytesRead));
      sizeBytes += bytesRead;
    }
  } finally {
    await handle.close();
  }
  return { sizeBytes, sha256: hash.digest("hex") };
}

async function managedAttachmentFileMatches(input: {
  readonly filePath: string;
  readonly sizeBytes: number;
  readonly sha256: string;
}): Promise<boolean> {
  const integrity = await hashManagedAttachmentFile(input.filePath);
  return integrity.sizeBytes === input.sizeBytes && integrity.sha256 === input.sha256;
}

/**
 * Clone one already-claimed blob for a server-authoritative contextual fork.
 * The caller owns command ordering and claims the returned staged blob in the
 * same SQL transaction as the imported message events.
 */
export function cloneManagedAttachmentForFork(input: {
  readonly source: ManagedAttachmentBlob;
  readonly targetAttachmentId: string;
  readonly targetThreadId: string;
  readonly targetMessageId: string;
  readonly commandId: string;
  readonly attachmentsDir: string;
  readonly now: string;
  readonly principal: ManagedAttachmentPrincipal;
  readonly repository: ManagedAttachmentRepositoryShape;
}): Effect.Effect<ManagedAttachmentForkCloneResult, Error> {
  return Effect.gen(function* () {
    if (
      input.source.state !== "claimed" ||
      input.source.sizeBytes === null ||
      input.source.sha256 === null ||
      input.source.sizeBytes < 0 ||
      !/^[a-f0-9]{64}$/u.test(input.source.sha256)
    ) {
      return { status: "failed", reason: "missing" } as const;
    }
    const metadata = yield* Effect.try({
      try: () =>
        validateMetadata({
          type: input.source.kind as "image" | "file",
          name: input.source.originalName,
          mimeType: input.source.mimeType,
        }),
      catch: (cause) =>
        cause instanceof Error ? cause : new Error("Invalid managed attachment metadata."),
    });
    const relativePath = managedAttachmentRelativePath({
      attachmentId: input.targetAttachmentId,
      type: input.source.kind as "image" | "file",
      ...metadata,
    });
    const finalPath = resolveAttachmentRelativePath({
      attachmentsDir: input.attachmentsDir,
      relativePath,
    });
    const sourcePath = resolveAttachmentRelativePath({
      attachmentsDir: input.attachmentsDir,
      relativePath: input.source.relativePath,
    });
    if (!finalPath || !sourcePath) {
      return { status: "failed", reason: "unreadable" } as const;
    }

    const sourceReadable = yield* Effect.tryPromise({
      try: () =>
        managedAttachmentFileMatches({
          filePath: sourcePath,
          sizeBytes: input.source.sizeBytes!,
          sha256: input.source.sha256!,
        }),
      catch: (cause) => (cause instanceof Error ? cause : new Error("Attachment read failed.")),
    }).pipe(Effect.catch(() => Effect.succeed(false)));
    if (!sourceReadable) {
      return { status: "failed", reason: "unreadable" } as const;
    }

    const matchesExpected = (blob: ManagedAttachmentBlob) =>
      blob.ownerThreadId === input.targetThreadId &&
      blob.ownerKind === input.principal.ownerKind &&
      blob.ownerId === input.principal.ownerId &&
      blob.kind === input.source.kind &&
      blob.originalName === metadata.name &&
      blob.mimeType === metadata.mimeType &&
      blob.reservedBytes === input.source.sizeBytes &&
      blob.relativePath === relativePath &&
      (blob.sizeBytes === null || blob.sizeBytes === input.source.sizeBytes) &&
      (blob.sha256 === null || blob.sha256 === input.source.sha256);

    const existing = yield* input.repository.findById({
      attachmentId: input.targetAttachmentId,
    });
    if (Option.isSome(existing)) {
      const blob = existing.value;
      if (!matchesExpected(blob)) {
        return yield* Effect.fail(
          new ManagedAttachmentStoreError("Deterministic attachment recovery identity mismatch.", {
            status: 409,
            code: "attachment_recovery_conflict",
          }),
        );
      }
      if (blob.state === "claimed") {
        if (
          blob.claimCommandId !== input.commandId ||
          blob.claimMessageId !== input.targetMessageId
        ) {
          return yield* Effect.fail(
            new ManagedAttachmentStoreError("Claimed attachment belongs to another fork target.", {
              status: 409,
              code: "attachment_recovery_conflict",
            }),
          );
        }
        const claimedFileMatches = yield* Effect.tryPromise({
          try: () =>
            managedAttachmentFileMatches({
              filePath: finalPath,
              sizeBytes: input.source.sizeBytes!,
              sha256: input.source.sha256!,
            }),
          catch: (cause) =>
            cause instanceof Error
              ? cause
              : new Error("Claimed attachment integrity check failed."),
        }).pipe(Effect.catch(() => Effect.succeed(false)));
        if (!claimedFileMatches) {
          return yield* Effect.fail(
            new ManagedAttachmentStoreError(
              "Claimed attachment failed deterministic integrity recovery.",
              {
                status: 409,
                code: "attachment_recovery_conflict",
              },
            ),
          );
        }
        return {
          status: "cloned",
          attachment: binaryAttachmentFromBlob(blob),
        } as const;
      }

      const fileMatches = yield* Effect.tryPromise({
        try: () =>
          managedAttachmentFileMatches({
            filePath: finalPath,
            sizeBytes: input.source.sizeBytes!,
            sha256: input.source.sha256!,
          }),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error("Attachment integrity check failed."),
      }).pipe(Effect.catch(() => Effect.succeed(false)));
      if (blob.state === "staged" && blob.stagingExpiresAt! > input.now && fileMatches) {
        return {
          status: "cloned",
          attachment: binaryAttachmentFromBlob(blob),
        } as const;
      }
      if (blob.state === "uploading" && fileMatches) {
        const finalized = yield* input.repository.finalizeStaged({
          attachmentId: blob.attachmentId,
          ownerThreadId: input.targetThreadId,
          ownerKind: input.principal.ownerKind,
          ownerId: input.principal.ownerId,
          sizeBytes: input.source.sizeBytes,
          sha256: input.source.sha256,
          stagingExpiresAt: new Date(
            Date.parse(input.now) + MANAGED_ATTACHMENT_STAGING_TTL_MS,
          ).toISOString(),
          now: input.now,
        });
        if (finalized.status === "staged") {
          return {
            status: "cloned",
            attachment: binaryAttachmentFromBlob(finalized.attachment),
          } as const;
        }
      }

      const removed = yield* input.repository.deleteUnclaimedForRecovery({
        attachmentId: blob.attachmentId,
        ownerThreadId: input.targetThreadId,
        ownerKind: input.principal.ownerKind,
        ownerId: input.principal.ownerId,
      });
      if (Option.isNone(removed)) {
        return yield* Effect.fail(
          new ManagedAttachmentStoreError("Attachment recovery cleanup was not safe.", {
            status: 409,
            code: "attachment_recovery_conflict",
          }),
        );
      }
      yield* Effect.tryPromise({
        try: () => fs.unlink(finalPath),
        catch: () => undefined,
      }).pipe(Effect.ignore);
      yield* Effect.tryPromise({
        try: () =>
          fs.unlink(path.join(input.attachmentsDir, ".staging", `${blob.attachmentId}.part`)),
        catch: () => undefined,
      }).pipe(Effect.ignore);
    }

    const reservation = yield* input.repository.reserve({
      attachmentId: input.targetAttachmentId,
      ownerThreadId: input.targetThreadId,
      ownerKind: input.principal.ownerKind,
      ownerId: input.principal.ownerId,
      kind: input.source.kind,
      originalName: metadata.name,
      mimeType: metadata.mimeType,
      reservedBytes: input.source.sizeBytes,
      relativePath,
      now: input.now,
    });
    if (reservation.status === "quota-exceeded") {
      return { status: "failed", reason: "limit" } as const;
    }
    if (reservation.status !== "reserved") {
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Deterministic attachment reservation conflicted.", {
          status: 409,
          code: "attachment_recovery_conflict",
        }),
      );
    }

    const stagingDir = path.join(input.attachmentsDir, ".staging");
    const temporaryPath = path.join(stagingDir, `${input.targetAttachmentId}.part`);
    const copied = yield* Effect.tryPromise({
      try: async () => {
        ensurePrivateDirectorySync(input.attachmentsDir);
        ensurePrivateDirectorySync(stagingDir);
        ensurePrivateDirectorySync(path.dirname(finalPath));
        await fs.copyFile(sourcePath, temporaryPath, 1);
        if (
          !(await managedAttachmentFileMatches({
            filePath: temporaryPath,
            sizeBytes: input.source.sizeBytes!,
            sha256: input.source.sha256!,
          }))
        ) {
          throw new Error("Cloned attachment integrity mismatch.");
        }
        const handle = await fs.open(temporaryPath, "r");
        try {
          await handle.sync();
        } finally {
          await handle.close();
        }
        await repairPrivateFile(temporaryPath);
        await fs.rename(temporaryPath, finalPath);
        await syncManagedAttachmentAncestors(input.attachmentsDir, finalPath);
        return true;
      },
      catch: (cause) => (cause instanceof Error ? cause : new Error("Attachment copy failed.")),
    }).pipe(Effect.catch(() => Effect.succeed(false)));
    if (!copied) {
      yield* input.repository
        .deleteUnclaimedForRecovery({
          attachmentId: input.targetAttachmentId,
          ownerThreadId: input.targetThreadId,
          ownerKind: input.principal.ownerKind,
          ownerId: input.principal.ownerId,
        })
        .pipe(Effect.ignore);
      yield* Effect.tryPromise({
        try: () => fs.unlink(temporaryPath),
        catch: () => undefined,
      }).pipe(Effect.ignore);
      yield* Effect.tryPromise({
        try: () => fs.unlink(finalPath),
        catch: () => undefined,
      }).pipe(Effect.ignore);
      return { status: "failed", reason: "clone-failed" } as const;
    }

    const finalized = yield* input.repository.finalizeStaged({
      attachmentId: input.targetAttachmentId,
      ownerThreadId: input.targetThreadId,
      ownerKind: input.principal.ownerKind,
      ownerId: input.principal.ownerId,
      sizeBytes: input.source.sizeBytes,
      sha256: input.source.sha256,
      stagingExpiresAt: new Date(
        Date.parse(input.now) + MANAGED_ATTACHMENT_STAGING_TTL_MS,
      ).toISOString(),
      now: input.now,
    });
    if (finalized.status !== "staged") {
      return yield* Effect.fail(
        new ManagedAttachmentStoreError("Cloned attachment could not be finalized.", {
          status: 409,
          code: "attachment_recovery_conflict",
        }),
      );
    }
    return {
      status: "cloned",
      attachment: binaryAttachmentFromBlob(finalized.attachment),
    } as const;
  });
}

/** Remove only unclaimed staging that this fork prepared before a known SQL rollback. */
export function cleanupManagedAttachmentForkStaging(input: {
  readonly attachmentIds: ReadonlyArray<string>;
  readonly targetThreadId: string;
  readonly attachmentsDir: string;
  readonly principal: ManagedAttachmentPrincipal;
  readonly repository: ManagedAttachmentRepositoryShape;
}): Effect.Effect<void, never> {
  return Effect.forEach(
    input.attachmentIds,
    (attachmentId) =>
      input.repository
        .deleteUnclaimedForRecovery({
          attachmentId,
          ownerThreadId: input.targetThreadId,
          ownerKind: input.principal.ownerKind,
          ownerId: input.principal.ownerId,
        })
        .pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.void,
              onSome: (blob) => {
                const finalPath = resolveAttachmentRelativePath({
                  attachmentsDir: input.attachmentsDir,
                  relativePath: blob.relativePath,
                });
                const temporaryPath = path.join(
                  input.attachmentsDir,
                  ".staging",
                  `${blob.attachmentId}.part`,
                );
                return Effect.all(
                  [
                    ...(finalPath === null
                      ? []
                      : [
                          Effect.tryPromise({
                            try: () => fs.unlink(finalPath),
                            catch: () => undefined,
                          }).pipe(Effect.ignore),
                        ]),
                    Effect.tryPromise({
                      try: () => fs.unlink(temporaryPath),
                      catch: () => undefined,
                    }).pipe(Effect.ignore),
                  ],
                  { concurrency: 2, discard: true },
                );
              },
            }),
          ),
          Effect.catch(() => Effect.void),
        ),
    { concurrency: 2, discard: true },
  );
}

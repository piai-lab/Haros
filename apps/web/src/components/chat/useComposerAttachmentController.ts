// FILE: useComposerAttachmentController.ts
// Purpose: Owns Composer attachment admission, draft mutation, and paste/drop projection.
// Layer: Web Conversation Workbench controller

import { ENGINE_SEND_TURN_MAX_ATTACHMENTS, type ThreadId } from "@harnessos/contracts";
import { useCallback } from "react";

import { useComposerDraftStore, type ComposerFileAttachment } from "../../composerDraftStore";
import { useComposerDropzone, splitComposerDropzoneFiles } from "../../hooks/useComposerDropzone";
import { useI18n } from "../../i18n";
import { appendComposerPromptText } from "../../lib/chatReferences";
import { formatComposerMentionToken } from "../../lib/composerMentions";
import {
  buildComposerFileAttachmentsFromFiles,
  effectiveComposerAttachmentCount,
} from "../../lib/composerSend";
import { toastManager } from "../ui/toast";

export function useComposerAttachmentController(input: {
  readonly activeThreadId: ThreadId | null;
  readonly threadId: ThreadId;
  readonly pendingUserInputCount: number;
  readonly enqueueComposerImages: (files: readonly File[]) => void;
  readonly addComposerFilesToDraft: (files: ComposerFileAttachment[]) => number;
  readonly removeComposerImageFromDraft: (imageId: string) => void;
  readonly removeComposerDraftFile: (threadId: ThreadId, fileId: string) => void;
  readonly discardPromptHistoryNavigation: () => void;
  readonly setThreadError: (threadId: ThreadId | null, error: string | null) => void;
  readonly dragDepthRef: { current: number };
  readonly focusComposer: () => void;
  readonly setIsDragOverComposer: (dragging: boolean) => void;
}) {
  const { t } = useI18n();

  const addComposerImages = useCallback(
    (files: readonly File[]) => {
      if (!input.activeThreadId || files.length === 0) return;
      if (input.pendingUserInputCount > 0) {
        toastManager.add({
          type: "error",
          title: t("conversation.answerPlanBeforeImages"),
        });
        return;
      }
      input.enqueueComposerImages(files);
    },
    [input.activeThreadId, input.enqueueComposerImages, input.pendingUserInputCount, t],
  );

  const addComposerFiles = useCallback(
    (files: readonly File[]) => {
      if (!input.activeThreadId || files.length === 0) return;
      if (input.pendingUserInputCount > 0) {
        toastManager.add({
          type: "error",
          title: t("conversation.answerPlanBeforeFiles"),
        });
        return;
      }

      const { files: nextFiles, error } = buildComposerFileAttachmentsFromFiles({
        files,
        existingAttachmentCount: effectiveComposerAttachmentCount(
          useComposerDraftStore.getState().draftsByThreadId[input.activeThreadId],
        ),
      });
      const insertedCount = nextFiles.length > 0 ? input.addComposerFilesToDraft(nextFiles) : 0;
      input.setThreadError(
        input.activeThreadId,
        insertedCount < nextFiles.length
          ? t("browser.attachmentLimit", { count: ENGINE_SEND_TURN_MAX_ATTACHMENTS })
          : error,
      );
    },
    [
      input.activeThreadId,
      input.addComposerFilesToDraft,
      input.pendingUserInputCount,
      input.setThreadError,
      t,
    ],
  );

  const addComposerAttachments = useCallback(
    (files: readonly File[]) => {
      const { imageFiles, genericFiles } = splitComposerDropzoneFiles(files);
      if (imageFiles.length > 0) addComposerImages(imageFiles);
      if (genericFiles.length > 0) addComposerFiles(genericFiles);
    },
    [addComposerFiles, addComposerImages],
  );

  const removeComposerImage = useCallback(
    (imageId: string) => input.removeComposerImageFromDraft(imageId),
    [input.removeComposerImageFromDraft],
  );
  const removeComposerFile = useCallback(
    (fileId: string) => {
      input.discardPromptHistoryNavigation();
      input.removeComposerDraftFile(input.threadId, fileId);
    },
    [input.discardPromptHistoryNavigation, input.removeComposerDraftFile, input.threadId],
  );

  const dropzone = useComposerDropzone({
    addImages: addComposerImages,
    fileSupport: { genericFiles: "accept", addFiles: addComposerFiles },
    appendReferenceText: (referenceText) => appendComposerPromptText(input.threadId, referenceText),
    appendPathMentions: (paths) => {
      for (const absolutePath of paths) {
        appendComposerPromptText(input.threadId, formatComposerMentionToken(absolutePath));
      }
    },
    dragDepthRef: input.dragDepthRef,
    focusComposer: input.focusComposer,
    setIsDragOverComposer: input.setIsDragOverComposer,
  });

  return {
    addComposerAttachments,
    addComposerFiles,
    addComposerImages,
    removeComposerFile,
    removeComposerImage,
    ...dropzone,
  } as const;
}

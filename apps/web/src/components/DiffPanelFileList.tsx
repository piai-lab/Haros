// FILE: DiffPanelFileList.tsx
// Purpose: Multi-file diff list for the review panel, including per-file actions and previews.
// Layer: Diff panel UI

import type { FileDiffMetadata } from "@pierre/diffs/react";
import { isSupportedLocalImagePath } from "@harnessos/shared/localPreviewFiles";
import { CopyIcon, EllipsisIcon, MessageCircleIcon } from "~/lib/icons";

import { useCopyPathToClipboard } from "~/hooks/useCopyToClipboard";
import { useI18n } from "~/i18n";
import { buildFileDiffRenderKey, resolveFileDiffPath } from "~/lib/diffRendering";
import { FileDiffCard, FileDiffSurface } from "./chat/FileDiffView";
import { LocalImagePreview } from "./LocalImagePreview";
import { PanelStateMessage } from "./chat/PanelStateMessage";
import { ComposerPickerMenuPopup } from "./chat/ComposerPickerMenuPopup";
import { IconButton } from "./ui/icon-button";
import { Menu, MenuItem, MenuTrigger } from "./ui/menu";

type DiffRenderMode = "stacked" | "split";

export interface DiffFileChatActions {
  onReferenceInChat: (filePath: string) => void;
  onAskWhyChanged: (filePath: string) => void;
}

const DIFF_FILE_ACTIONS_MENU_ICON_CLASS_NAME = "size-3.5 shrink-0 text-muted-foreground";

// Per-file actions menu rendered independently from the header disclosure.
function DiffFileHeaderActionsMenu(props: { filePath: string; chatActions: DiffFileChatActions }) {
  const { t } = useI18n();
  const copyPath = useCopyPathToClipboard();
  return (
    <Menu>
      <MenuTrigger
        render={
          <IconButton
            variant="ghost"
            size="icon-xs"
            label={t("diff.fileActions")}
            title={t("diff.fileActions")}
            className="text-muted-foreground hover:text-foreground"
          >
            <EllipsisIcon className="size-3.5" />
          </IconButton>
        }
      />
      <ComposerPickerMenuPopup align="end" side="bottom" sideOffset={6} className="w-60 min-w-60">
        <MenuItem
          onClick={() => {
            props.chatActions.onReferenceInChat(props.filePath);
          }}
        >
          <MessageCircleIcon className={DIFF_FILE_ACTIONS_MENU_ICON_CLASS_NAME} />
          <span>{t("file.referenceInChat")}</span>
        </MenuItem>
        <MenuItem
          onClick={() => {
            props.chatActions.onAskWhyChanged(props.filePath);
          }}
        >
          <MessageCircleIcon className={DIFF_FILE_ACTIONS_MENU_ICON_CLASS_NAME} />
          <span>{t("file.askWhyChanged")}</span>
        </MenuItem>
        <MenuItem
          onClick={() => {
            copyPath(props.filePath);
          }}
        >
          <CopyIcon className={DIFF_FILE_ACTIONS_MENU_ICON_CLASS_NAME} />
          <span>{t("diff.copyPath")}</span>
        </MenuItem>
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

const DiffPanelFileRow = function DiffPanelFileRow(props: {
  fileDiff: FileDiffMetadata;
  resolvedTheme: "light" | "dark";
  diffRenderMode: DiffRenderMode;
  diffWordWrap: boolean;
  workspaceRoot: string | null;
  isCollapsed: boolean;
  onToggleFileCollapsed: (fileKey: string) => void;
  chatActions?: DiffFileChatActions | undefined;
}) {
  const { t } = useI18n();
  const filePath = resolveFileDiffPath(props.fileDiff);
  const fileKey = buildFileDiffRenderKey(props.fileDiff);
  const { chatActions, isCollapsed } = props;
  const shouldPreviewImage =
    !isCollapsed && props.workspaceRoot !== null && isSupportedLocalImagePath(filePath);

  return (
    <FileDiffCard
      className="mb-2 rounded-md first:mt-2 last:mb-0"
      fileDiff={props.fileDiff}
      theme={props.resolvedTheme}
      diffStyle={props.diffRenderMode === "split" ? "split" : "unified"}
      overflow={props.diffWordWrap ? "wrap" : "scroll"}
      collapsed={props.isCollapsed}
      onToggleCollapsed={() => props.onToggleFileCollapsed(fileKey)}
      toggleLabel={t(props.isCollapsed ? "diff.expandFile" : "diff.collapseFile", {
        path: filePath,
      })}
      headerActions={
        chatActions ? (
          <DiffFileHeaderActionsMenu filePath={filePath} chatActions={chatActions} />
        ) : null
      }
    >
      {shouldPreviewImage ? (
        <LocalImagePreview
          src={filePath}
          cwd={props.workspaceRoot}
          alt={t("diff.imagePreview", { path: filePath })}
          className="diff-render-file__image-preview"
          imageClassName="max-h-[320px]"
        />
      ) : null}
    </FileDiffCard>
  );
};

export const DiffPanelFileList = function DiffPanelFileList(props: {
  renderableFiles: ReadonlyArray<FileDiffMetadata>;
  resolvedTheme: "light" | "dark";
  diffRenderMode: DiffRenderMode;
  diffWordWrap: boolean;
  workspaceRoot: string | null;
  collapsedFiles: ReadonlySet<string>;
  onToggleFileCollapsed: (fileKey: string) => void;
  chatActions?: DiffFileChatActions | undefined;
}) {
  const { t } = useI18n();
  if (props.renderableFiles.length === 0) {
    return (
      <FileDiffSurface className="h-full min-h-0 overflow-auto px-2 pb-2">
        <PanelStateMessage density="compact" fill="flex">
          <p>{t("workbench.noFilesInDiff")}</p>
        </PanelStateMessage>
      </FileDiffSurface>
    );
  }

  return (
    <FileDiffSurface className="h-full min-h-0 overflow-auto px-2 pb-2">
      {props.renderableFiles.map((fileDiff) => {
        const fileKey = buildFileDiffRenderKey(fileDiff);
        // Include render mode so @pierre/diffs remounts when stacked ↔ split changes
        // (diffStyle is effectively mount-time config on FileDiff).
        const themedFileKey = `${fileKey}:${props.resolvedTheme}:${props.diffRenderMode}`;
        return (
          <DiffPanelFileRow
            key={themedFileKey}
            fileDiff={fileDiff}
            resolvedTheme={props.resolvedTheme}
            diffRenderMode={props.diffRenderMode}
            diffWordWrap={props.diffWordWrap}
            workspaceRoot={props.workspaceRoot}
            isCollapsed={props.collapsedFiles.has(fileKey)}
            onToggleFileCollapsed={props.onToggleFileCollapsed}
            chatActions={props.chatActions}
          />
        );
      })}
    </FileDiffSurface>
  );
};

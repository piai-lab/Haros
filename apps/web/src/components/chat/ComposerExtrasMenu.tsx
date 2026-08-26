// FILE: ComposerExtrasMenu.tsx
// Purpose: Hosts the composer `+` menu for attachments and quick composer mode toggles.
// Layer: Chat composer presentation
// Depends on: shared menu primitives, icon buttons, and caller-owned composer state callbacks.

import { type ProviderInteractionMode } from "@omnimind/contracts";
import { useId, useRef, type ChangeEvent } from "react";
import { GoTasklist } from "react-icons/go";

import { PaperclipIcon, PlusIcon } from "~/lib/icons";
import { useI18n } from "~/i18n";
import { ComposerPickerMenuPopup } from "./ComposerPickerMenuPopup";
import { Button } from "../ui/button";
import { Menu, MenuCheckboxItem, MenuItem, MenuSeparator, MenuTrigger } from "../ui/menu";

export const ComposerExtrasMenu = function ComposerExtrasMenu(props: {
  interactionMode: ProviderInteractionMode;
  planModeAvailable: boolean;
  onAddAttachments: (files: File[]) => void;
  onAddFileReference?: () => void;
  onAddFolderReference?: () => void;
  onSetPlanMode: (enabled: boolean) => void;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset the hidden input so selecting the same file twice still emits a change event.
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      props.onAddAttachments(files);
    }
    event.target.value = "";
  };

  return (
    <>
      <input
        id={inputId}
        ref={fileInputRef}
        data-testid="composer-file-input"
        type="file"
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={handleFileInputChange}
      />
      <Menu>
        <MenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="chrome"
              className="shrink-0 rounded-md"
              aria-label={t("composer.extras")}
            />
          }
        >
          <PlusIcon aria-hidden="true" className="size-4 text-primary" />
        </MenuTrigger>
        <ComposerPickerMenuPopup align="start">
          <MenuItem
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <PaperclipIcon className="size-4 shrink-0" />
            {t("composer.addFiles")}
          </MenuItem>
          {props.onAddFileReference ? (
            <MenuItem onClick={props.onAddFileReference}>
              <PaperclipIcon className="size-4 shrink-0" />
              {t("composer.addFileReference")}
            </MenuItem>
          ) : null}
          {props.onAddFolderReference ? (
            <MenuItem onClick={props.onAddFolderReference}>
              <PaperclipIcon className="size-4 shrink-0" />
              {t("composer.addFolderReference")}
            </MenuItem>
          ) : null}

          {props.planModeAvailable || props.interactionMode === "plan" ? <>
          <MenuSeparator />
          <MenuCheckboxItem
            checked={props.interactionMode === "plan"}
            variant="switch"
            onCheckedChange={(checked) => {
              props.onSetPlanMode(checked === true);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <GoTasklist className="size-4 shrink-0" />
              {t("composer.planMode")}
            </span>
          </MenuCheckboxItem>
          </> : null}
        </ComposerPickerMenuPopup>
      </Menu>
    </>
  );
};

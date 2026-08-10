import type { KeyboardEvent, ReactNode } from "react";

import { GitHubIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { useI18n } from "../i18n";

import { FolderClosed } from "./FolderClosed";
import { Button } from "./ui/button";
import { dialogFieldLabelClassName } from "./ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

export const PROJECT_DIALOG_FIELD_CONTROL_CLASS_NAME = "h-9 rounded-lg border-foreground/12";

export function CreateGitHubProjectFields(props: {
  readonly repositoryInputId: string;
  readonly destinationParentInputId: string;
  readonly directoryNameInputId: string;
  readonly errorId: string;
  readonly repositoryInput: string;
  readonly destinationParent: string;
  readonly directoryName: string;
  readonly finalClonePath: string;
  readonly formError: string | null;
  readonly provisionProgress: string | null;
  readonly isElectron: boolean;
  readonly isPickingFolder: boolean;
  readonly submitting: boolean;
  readonly onRepositoryChange: (value: string) => void;
  readonly onDestinationParentChange: (value: string) => void;
  readonly onDirectoryNameChange: (value: string) => void;
  readonly onBrowse: () => void;
  readonly onSubmitKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.025] px-3.5 py-3">
        <p className="text-[length:var(--app-font-size-ui,12px)] font-medium text-foreground">
          {t("project.githubRequirements")}
        </p>
        <ol className="mt-2.5 space-y-2">
          <GitHubRequirement index={1} title={t("project.repository")}>
            {t("project.githubRepositoryInstructionStart")}{" "}
            <span className="font-medium text-foreground">owner/repository</span>{" "}
            {t("project.githubRepositoryInstructionEnd")}
          </GitHubRequirement>
          <GitHubRequirement index={2} title={t("project.destination")}>
            {t("project.destinationInstruction")}
          </GitHubRequirement>
          <GitHubRequirement index={3} title={t("project.privateAccess")}>
            {t("project.privateAccessInstructionStart")}{" "}
            <code className="font-mono text-foreground">gh auth login</code>{" "}
            {t("project.privateAccessInstructionEnd")}
          </GitHubRequirement>
        </ol>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={props.repositoryInputId}
          className={cn(
            "block",
            dialogFieldLabelClassName,
            "text-[length:var(--app-font-size-ui,12px)] text-foreground",
          )}
        >
          {t("project.repository")}
        </label>
        <InputGroup className={PROJECT_DIALOG_FIELD_CONTROL_CLASS_NAME}>
          <InputGroupAddon className="w-10 self-stretch border-e border-foreground/12 ps-0">
            <GitHubIcon className="size-4 text-muted-foreground/70" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id={props.repositoryInputId}
            value={props.repositoryInput}
            aria-invalid={props.formError ? true : undefined}
            {...(props.formError ? { "aria-describedby": props.errorId } : {})}
            placeholder={t("project.repositoryPlaceholder")}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onChange={(event) => props.onRepositoryChange(event.target.value)}
            onKeyDown={props.onSubmitKeyDown}
          />
        </InputGroup>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={props.destinationParentInputId}
          className={cn(
            "block",
            dialogFieldLabelClassName,
            "text-[length:var(--app-font-size-ui,12px)] text-foreground",
          )}
        >
          {t("project.cloneInto")}
        </label>
        <div className="flex items-center gap-2">
          <InputGroup className={cn(PROJECT_DIALOG_FIELD_CONTROL_CLASS_NAME, "min-w-0 flex-1")}>
            <InputGroupAddon className="w-10 self-stretch border-e border-foreground/12 ps-0">
              <FolderClosed className="size-4 text-muted-foreground/70" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id={props.destinationParentInputId}
              value={props.destinationParent}
              placeholder="/parent/folder"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              onChange={(event) => props.onDestinationParentChange(event.target.value)}
              onKeyDown={props.onSubmitKeyDown}
            />
          </InputGroup>
          {props.isElectron ? (
            <Button
              type="button"
              variant="outline"
              className={cn(PROJECT_DIALOG_FIELD_CONTROL_CLASS_NAME, "shrink-0 px-3")}
              disabled={props.isPickingFolder || props.submitting}
              onClick={props.onBrowse}
            >
              {t("project.browse")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={props.directoryNameInputId}
          className={cn(
            "block",
            dialogFieldLabelClassName,
            "text-[length:var(--app-font-size-ui,12px)] text-foreground",
          )}
        >
          {t("project.folderName")}
        </label>
        <InputGroup className={PROJECT_DIALOG_FIELD_CONTROL_CLASS_NAME}>
          <InputGroupInput
            id={props.directoryNameInputId}
            value={props.directoryName}
            placeholder="repository"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onChange={(event) => props.onDirectoryNameChange(event.target.value)}
            onKeyDown={props.onSubmitKeyDown}
          />
        </InputGroup>
        {props.finalClonePath ? (
          <p className="truncate text-[length:var(--app-font-size-ui-xs,10px)] text-muted-foreground/70">
            {t("project.finalLocation", { path: props.finalClonePath })}
          </p>
        ) : null}
      </div>

      {props.provisionProgress ? (
        <p
          role="status"
          className="text-[length:var(--app-font-size-ui-xs,10px)] text-muted-foreground"
        >
          {props.provisionProgress}
        </p>
      ) : null}
    </div>
  );
}

function GitHubRequirement(props: {
  readonly index: number;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2 text-[length:var(--app-font-size-ui-xs,10px)] leading-4 text-muted-foreground">
      <span
        aria-hidden
        className="mt-px flex size-4 items-center justify-center rounded-full bg-foreground/7 text-[9px] font-semibold text-foreground/70"
      >
        {props.index}
      </span>
      <span>
        <span className="font-medium text-foreground">{props.title}.</span> {props.children}
      </span>
    </li>
  );
}

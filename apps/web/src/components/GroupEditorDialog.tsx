import { SPACE_NAME_MAX_LENGTH } from "@synara/contracts";
import { useEffect, useId, useRef, useState } from "react";

import { useI18n } from "../i18n";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  dialogFieldLabelClassName,
} from "./ui/dialog";
import { Input } from "./ui/input";

export function GroupEditorDialog(props: {
  readonly open: boolean;
  readonly initialName?: string | undefined;
  readonly existingNames: ReadonlyArray<string>;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (name: string) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openedRef = useRef(false);
  const fieldId = useId();
  const inputId = `${fieldId}-name`;
  const errorId = `${fieldId}-error`;

  useEffect(() => {
    if (props.open === openedRef.current) return;
    openedRef.current = props.open;
    if (!props.open) return;
    setName(props.initialName ?? "");
    setSubmitting(false);
    setSubmitError(null);
    const frame = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(frame);
  }, [props.initialName, props.open]);

  const trimmedName = name.trim();
  const duplicate = props.existingNames.some(
    (candidate) => candidate.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  );
  const nameError =
    trimmedName.length === 0
      ? t("groups.nameRequired")
      : duplicate
        ? t("groups.nameTaken")
        : null;

  const submit = async () => {
    if (nameError || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await props.onSubmit(trimmedName);
      props.onOpenChange(false);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : t("groups.saveGroupFailed"));
      setSubmitting(false);
    }
  };

  const editing = props.initialName !== undefined;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? t("groups.editTitle") : t("groups.createTitle")}</DialogTitle>
          <DialogDescription>
            {editing ? t("groups.editDescription") : t("groups.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-2">
          <label htmlFor={inputId} className={dialogFieldLabelClassName}>
            {t("groups.name")}
          </label>
          <Input
            id={inputId}
            ref={inputRef}
            value={name}
            maxLength={SPACE_NAME_MAX_LENGTH}
            aria-invalid={Boolean(name.length > 0 && nameError)}
            aria-describedby={name.length > 0 && nameError ? errorId : undefined}
            placeholder={t("groups.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void submit();
            }}
          />
          {name.length > 0 && nameError ? (
            <p id={errorId} role="alert" className="text-destructive">
              {nameError}
            </p>
          ) : null}
          {submitError ? <p role="alert" className="text-destructive">{submitError}</p> : null}
        </DialogPanel>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)} disabled={submitting}>
            {t("groups.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={Boolean(nameError) || submitting}>
            {submitting
              ? t("groups.saving")
              : editing
                ? t("groups.save")
                : t("groups.create")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

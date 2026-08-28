import { SPACE_ICON_NAMES, SPACE_NAME_MAX_LENGTH, type SpaceIconName } from "@harnessos/contracts";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useI18n, type MessageKey } from "../i18n";
import { CentralIcon } from "../lib/central-icons";
import { suggestGroupIcon } from "../lib/groupIconSuggestion";
import { cn } from "../lib/utils";
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
  readonly initialIcon?: SpaceIconName | undefined;
  readonly existingNames: ReadonlyArray<string>;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (value: {
    readonly name: string;
    readonly icon: SpaceIconName;
  }) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<SpaceIconName>(SPACE_ICON_NAMES[0]);
  const [iconPinned, setIconPinned] = useState(false);
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
    setIcon(props.initialIcon ?? SPACE_ICON_NAMES[0]);
    setIconPinned(props.initialName !== undefined);
    setSubmitting(false);
    setSubmitError(null);
    const frame = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(frame);
  }, [props.initialIcon, props.initialName, props.open]);

  const trimmedName = name.trim();
  const duplicate = props.existingNames.some(
    (candidate) => candidate.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  );
  const nameError =
    trimmedName.length === 0 ? t("groups.nameRequired") : duplicate ? t("groups.nameTaken") : null;

  const submit = async () => {
    if (nameError || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await props.onSubmit({ name: trimmedName, icon });
      props.onOpenChange(false);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : t("groups.saveGroupFailed"));
      setSubmitting(false);
    }
  };

  const handleIconKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const stepByKey: Record<string, number | "first" | "last"> = {
      ArrowLeft: -1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowDown: 1,
      Home: "first",
      End: "last",
    };
    const step = stepByKey[event.key];
    if (step === undefined) return;
    const cells = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-group-icon]"),
    );
    if (cells.length === 0) return;
    const currentIndex = cells.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      step === "first"
        ? 0
        : step === "last"
          ? cells.length - 1
          : (Math.max(currentIndex, 0) + step + cells.length) % cells.length;
    event.preventDefault();
    cells[nextIndex]?.focus();
    cells[nextIndex]?.click();
  }, []);

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
        <DialogPanel className="space-y-4">
          <div className="space-y-2">
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
              onChange={(event) => {
                setName(event.target.value);
                if (!iconPinned) setIcon(suggestGroupIcon(event.target.value));
              }}
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
          </div>
          <fieldset>
            <legend className={cn("mb-2", dialogFieldLabelClassName)}>{t("groups.icon")}</legend>
            <div
              role="radiogroup"
              aria-label={t("groups.icon")}
              onKeyDown={handleIconKeyDown}
              className="grid grid-cols-10 gap-1.5 max-sm:grid-cols-5"
            >
              {SPACE_ICON_NAMES.map((option) => {
                const selected = icon === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    data-group-icon
                    aria-checked={selected}
                    aria-label={t(GROUP_ICON_LABEL_KEYS[option])}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => {
                      setIcon(option);
                      setIconPinned(true);
                    }}
                    className={cn(
                      "flex aspect-square cursor-pointer items-center justify-center rounded-lg border text-muted-foreground outline-hidden transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                      selected
                        ? "border-foreground/25 bg-foreground/9 text-foreground"
                        : "border-transparent bg-foreground/3",
                    )}
                  >
                    <CentralIcon name={option} className="size-4" />
                  </button>
                );
              })}
            </div>
          </fieldset>
          {submitError ? (
            <p role="alert" className="text-destructive">
              {submitError}
            </p>
          ) : null}
        </DialogPanel>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)} disabled={submitting}>
            {t("groups.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={Boolean(nameError) || submitting}>
            {submitting ? t("groups.saving") : editing ? t("groups.save") : t("groups.create")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

const GROUP_ICON_LABEL_KEYS = {
  bag: "groups.iconBag",
  home: "groups.iconHome",
  "code-brackets": "groups.iconCode",
  rocket: "groups.iconRocket",
  "light-bulb": "groups.iconIdea",
  "color-palette": "groups.iconPalette",
  book: "groups.iconBook",
  lab: "groups.iconLab",
  heart: "groups.iconHeart",
  star: "groups.iconStar",
  globe: "groups.iconGlobe",
  cloud: "groups.iconCloud",
  hammer: "groups.iconHammer",
  "chart-2": "groups.iconChart",
  gamecontroller: "groups.iconGames",
  "camera-1": "groups.iconCamera",
  target: "groups.iconTarget",
  tree: "groups.iconTree",
  school: "groups.iconSchool",
  backpack: "groups.iconBackpack",
} as const satisfies Record<SpaceIconName, MessageKey>;

// FILE: ProjectMenuPicker.tsx
// Purpose: Shared searchable project picker over the complete Project list.

import type { ProjectId } from "@harnessos/contracts";
import { type ReactElement, type ReactNode, useMemo, useState } from "react";

import { ComposerPickerMenuPopup } from "~/components/chat/ComposerPickerMenuPopup";
import { PickerPanelShell } from "~/components/chat/PickerPanelShell";
import { Menu, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "~/components/ui/menu";
import { useI18n } from "~/i18n";

export interface ProjectMenuPickerOption {
  readonly id: ProjectId;
  readonly name: string;
}

export function ProjectMenuPicker(props: {
  projectOptions: ReadonlyArray<ProjectMenuPickerOption>;
  selectedProjectId: ProjectId | null;
  onProjectIdChange: (projectId: ProjectId) => void;
  /** Rendered through MenuTrigger's `render` slot so each surface owns its trigger chrome. */
  trigger: ReactElement;
  /** Content merged into the trigger element (label, chevron, …). */
  children?: ReactNode;
  align?: "start" | "center" | "end";
  popupClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger render={props.trigger}>{props.children}</MenuTrigger>
      <ComposerPickerMenuPopup
        align={props.align ?? "start"}
        className={props.popupClassName ?? "min-w-60"}
      >
        {/* The list is its own component so its store subscriptions mount with the popup
            and unmount with it: `projects` churns on every thread update, and a closed
            picker must stay completely inert rather than re-render on each tick. Query
            state lives here too, so closing the menu discards the search for free. */}
        {open ? (
          <ProjectMenuPickerList
            projectOptions={props.projectOptions}
            selectedProjectId={props.selectedProjectId}
            onProjectIdChange={props.onProjectIdChange}
          />
        ) : null}
      </ComposerPickerMenuPopup>
    </Menu>
  );
}

function ProjectMenuPickerList(props: {
  projectOptions: ReadonlyArray<ProjectMenuPickerOption>;
  selectedProjectId: ProjectId | null;
  onProjectIdChange: (projectId: ProjectId) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return props.projectOptions.filter(
      (option) =>
        normalizedQuery.length === 0 || option.name.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [props.projectOptions, query]);

  return (
    <PickerPanelShell
      searchPlaceholder={t("composer.searchProjects")}
      query={query}
      onQueryChange={setQuery}
      // Lets Arrow/Enter fall through to the menu so the search field and the
      // list behave as one keyboard surface.
      stopSearchKeyPropagation
      autoFocusSearch
      widthClassName="w-full"
      bleedParentPadding
      listMaxHeightClassName="max-h-64"
    >
      {filteredOptions.length > 0 ? (
        <MenuRadioGroup
          value={props.selectedProjectId ?? ""}
          onValueChange={(value) => {
            if (value === props.selectedProjectId) return;
            const option = props.projectOptions.find((candidate) => candidate.id === value);
            if (option) props.onProjectIdChange(option.id);
          }}
        >
          {filteredOptions.map((option) => (
            <MenuRadioItem key={option.id} value={option.id}>
              <span className="min-w-0 truncate">{option.name}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      ) : (
        <p className="px-3 py-6 text-center text-[length:var(--app-font-size-ui-sm,11px)] text-muted-foreground/60">
          {props.projectOptions.length === 0
            ? t("composer.noProjects")
            : t("composer.noMatchingProjects")}
        </p>
      )}
    </PickerPanelShell>
  );
}

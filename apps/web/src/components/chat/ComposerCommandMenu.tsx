import {
  type ProjectEntry,
  type ModelSlug,
  type ProviderNativeCommandDescriptor,
  type ProviderMentionReference,
  type ProviderKind,
  type ProviderPluginDescriptor,
  type ProviderSkillDescriptor,
} from "@omnimind/contracts";
import { memo, useEffect, useRef, type ReactNode } from "react";
import { type ComposerTriggerKind } from "../../composer-logic";
import { type ComposerSlashCommand } from "../../composerSlashCommands";
import {
  BotIcon,
  BrainIcon,
  ChangesIcon,
  DeviceLaptopIcon,
  GitBranchIcon,
  PluginIcon,
  SkillCubeIcon,
  WorktreeIcon,
} from "~/lib/icons";
import {
  builtInComposerSlashCommandIcon,
  resolveBuiltInComposerSlashCommandPresentation,
} from "~/composerSlashCommandPresentation";
import { formatSkillScope } from "~/lib/providerDiscovery";
import { cn } from "~/lib/utils";
import {
  Command,
  CommandGroup,
  CommandGroupLabel,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { FileEntryIcon } from "./FileEntryIcon";
import { ProviderIcon } from "../ProviderIcon";
import {
  COMPOSER_COMMAND_MENU_ITEM_ACTIVE_CLASS_NAME,
  COMPOSER_COMMAND_MENU_ITEM_CLASS_NAME,
  COMPOSER_COMMAND_MENU_SURFACE_CLASS_NAME,
} from "./composerPickerStyles";
import { useI18n } from "~/i18n";

function humanizeProviderCommandName(command: string): string {
  return command
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function commandMenuTitle(
  item: Extract<ComposerCommandItem, { type: "slash-command" | "provider-native-command" }>,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (item.type === "slash-command") {
    return resolveBuiltInComposerSlashCommandPresentation(item.command, t).title;
  }
  return humanizeProviderCommandName(item.command);
}

function commandMenuTrailingMeta(
  item: ComposerCommandItem,
  locale: ReturnType<typeof useI18n>["locale"],
  t: ReturnType<typeof useI18n>["t"],
): string | null {
  if (item.type === "agent") {
    return t("composer.command.delegateToSubagent");
  }

  if (item.type === "plugin") {
    return t("term.plugin");
  }

  if (item.type === "thread") {
    return null;
  }

  if (item.type === "local-root") {
    return t("composer.command.local");
  }

  if (item.type === "skill") {
    return formatSkillScope(item.skill.scope, locale);
  }

  if (item.type === "model") {
    return t("term.model");
  }

  if (item.type === "slash-command" || item.type === "provider-native-command") {
    return `/${item.command}`;
  }

  // Right-align the parent path so many same-named entries (e.g. worktrees) stay
  // distinguishable without crowding the name column.
  if (item.type === "path") {
    return item.description.length > 0 ? item.description : null;
  }

  return null;
}

function commandMenuSecondaryText(item: ComposerCommandItem): string | null {
  if (item.type === "slash-command" || item.type === "provider-native-command") {
    return item.description;
  }

  if (item.type === "agent") {
    return item.description;
  }

  if (
    item.type === "plugin" ||
    item.type === "skill" ||
    item.type === "local-root" ||
    item.type === "thread"
  ) {
    return item.description;
  }

  return null;
}

export type ComposerCommandItem =
  | {
      id: string;
      type: "path";
      path: string;
      pathKind: ProjectEntry["kind"];
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "local-root";
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "slash-command";
      command: ComposerSlashCommand;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "provider-native-command";
      provider: ProviderKind;
      command: ProviderNativeCommandDescriptor["name"];
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "fork-target";
      target: "local" | "worktree";
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "review-target";
      target: "changes" | "base-branch";
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "model";
      provider: ProviderKind;
      model: ModelSlug;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "plugin";
      plugin: ProviderPluginDescriptor;
      mention: ProviderMentionReference;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "thread";
      threadId: string;
      provider: ProviderKind;
      mention: ProviderMentionReference;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "skill";
      skill: ProviderSkillDescriptor;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "agent";
      provider: ProviderKind;
      alias: string;
      color: string;
      label: string;
      description: string;
    };

type ComposerCommandGroupModel = {
  id: string;
  label: string | null;
  items: ComposerCommandItem[];
};

type ComposerCommandGroupLabels = {
  plugins: string;
  tasks: string;
  local: string;
  subagents: string;
  builtIn: string;
  engine: string;
  skills: string;
};

const DEFAULT_GROUP_LABELS: ComposerCommandGroupLabels = {
  plugins: "Plugins",
  tasks: "Tasks",
  local: "Local",
  subagents: "Subagents",
  builtIn: "Built-in",
  engine: "Engine",
  skills: "Skills",
};

const COMPOSER_COMMAND_GROUP_LABEL_CLASSNAME =
  "px-2 pt-1.5 pb-1 text-[11px] font-normal text-muted-foreground/60";

export function groupCommandItems(
  items: ComposerCommandItem[],
  triggerKind: ComposerTriggerKind | null,
  groupSlashCommandSections: boolean,
  labels: ComposerCommandGroupLabels = DEFAULT_GROUP_LABELS,
): ComposerCommandGroupModel[] {
  if (triggerKind === "mention") {
    const pluginItems = items.filter((item) => item.type === "plugin");
    const threadItems = items.filter((item) => item.type === "thread");
    const localItems = items.filter((item) => item.type === "local-root" || item.type === "path");
    const agentItems = items.filter((item) => item.type === "agent");
    const otherItems = items.filter(
      (item) =>
        item.type !== "plugin" &&
        item.type !== "thread" &&
        item.type !== "local-root" &&
        item.type !== "path" &&
        item.type !== "agent",
    );

    const groups: ComposerCommandGroupModel[] = [];
    if (pluginItems.length > 0) {
      groups.push({ id: "plugins", label: labels.plugins, items: pluginItems });
    }
    if (threadItems.length > 0) {
      groups.push({ id: "chats", label: labels.tasks, items: threadItems });
    }
    if (localItems.length > 0) {
      groups.push({ id: "local", label: labels.local, items: localItems });
    }
    if (agentItems.length > 0) {
      groups.push({ id: "subagents", label: labels.subagents, items: agentItems });
    }
    if (otherItems.length > 0) {
      groups.push({ id: "other", label: null, items: otherItems });
    }
    return groups;
  }

  if (triggerKind !== "slash-command" || !groupSlashCommandSections) {
    return [{ id: "default", label: null, items }];
  }

  const builtInItems = items.filter((item) => item.type === "slash-command");
  const providerItems = items.filter((item) => item.type === "provider-native-command");
  const skillItems = items.filter((item) => item.type === "skill");
  const otherItems = items.filter(
    (item) =>
      item.type !== "slash-command" &&
      item.type !== "provider-native-command" &&
      item.type !== "skill",
  );

  const groups: ComposerCommandGroupModel[] = [];
  if (builtInItems.length > 0) {
    groups.push({ id: "built-in", label: labels.builtIn, items: builtInItems });
  }
  if (providerItems.length > 0) {
    groups.push({ id: "provider", label: labels.engine, items: providerItems });
  }
  if (skillItems.length > 0) {
    groups.push({ id: "skills", label: labels.skills, items: skillItems });
  }
  if (otherItems.length > 0) {
    groups.push({ id: "other", label: null, items: otherItems });
  }
  return groups;
}

export function ComposerCommandMenu(props: {
  items: ComposerCommandItem[];
  resolvedTheme: "light" | "dark";
  isLoading: boolean;
  triggerKind: ComposerTriggerKind | null;
  groupSlashCommandSections?: boolean;
  emptyStateText?: string;
  activeItemId: string | null;
  onHighlightedItemChange: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const { t } = useI18n();
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const groups = groupCommandItems(
    props.items,
    props.triggerKind,
    props.groupSlashCommandSections ?? true,
    {
      plugins: t("term.plugins"),
      tasks: t("term.tasks"),
      local: t("composer.command.local"),
      subagents: t("composer.command.subagents"),
      builtIn: t("composer.command.builtIn"),
      engine: t("term.engine"),
      skills: t("term.skills"),
    },
  );
  const shouldRenderList = props.items.length > 0 || props.triggerKind === "mention";

  useEffect(() => {
    if (!props.activeItemId) {
      return;
    }

    itemRefs.current[props.activeItemId]?.scrollIntoView({
      block: "nearest",
    });
  }, [props.activeItemId]);

  return (
    <Command
      autoHighlight={false}
      mode="none"
      onItemHighlighted={(highlightedValue) => {
        props.onHighlightedItemChange(
          typeof highlightedValue === "string" ? highlightedValue : null,
        );
      }}
    >
      <div className={COMPOSER_COMMAND_MENU_SURFACE_CLASS_NAME}>
        {shouldRenderList ? (
          <CommandList className="max-h-72 scroll-py-1 p-1">
            {groups.map((group, groupIndex) => (
              <div key={group.id}>
                {groupIndex > 0 ? <CommandSeparator className="my-0.5" /> : null}
                <CommandGroup>
                  {group.label ? (
                    <CommandGroupLabel className={COMPOSER_COMMAND_GROUP_LABEL_CLASSNAME}>
                      {group.label}
                    </CommandGroupLabel>
                  ) : null}
                  {group.items.map((item) => (
                    <ComposerCommandMenuItem
                      key={item.id}
                      item={item}
                      resolvedTheme={props.resolvedTheme}
                      isActive={props.activeItemId === item.id}
                      itemRef={(node) => {
                        itemRefs.current[item.id] = node;
                      }}
                      onHighlight={props.onHighlightedItemChange}
                      onSelect={props.onSelect}
                    />
                  ))}
                </CommandGroup>
              </div>
            ))}
            {props.triggerKind === "mention" ? (
              <>
                {groups.length > 0 ? <CommandSeparator className="my-0.5" /> : null}
                {/* This footer is informational copy, not a selectable result group. */}
                <div className="pt-0.5 pb-2">
                  <p
                    className={cn(
                      COMPOSER_COMMAND_GROUP_LABEL_CLASSNAME,
                      "px-2 py-0 font-medium text-muted-foreground text-xs",
                    )}
                  >
                    {t("term.files")}
                  </p>
                  <p className="px-2 pt-0.5 text-[11px] text-muted-foreground/55">
                    {t("composer.command.typeToSearchFiles")}
                  </p>
                </div>
              </>
            ) : null}
          </CommandList>
        ) : null}
        {props.items.length === 0 && (
          <p
            className={cn(
              "text-muted-foreground/50 text-[11px]",
              props.isLoading
                ? "flex h-[calc(1.625rem+0.5rem)] items-center px-2 text-left"
                : "px-2 py-1.5",
            )}
          >
            {props.isLoading
              ? props.triggerKind === "mention"
                ? t("composer.command.searchingMentions")
                : props.triggerKind === "skill"
                  ? t("composer.command.loadingSkills")
                  : t("composer.command.loadingCommands")
              : (props.emptyStateText ??
                (props.triggerKind === "mention"
                  ? t("composer.command.noMentionMatch")
                  : props.triggerKind === "skill"
                    ? t("composer.command.noSkillMatch")
                    : t("composer.command.noCommandMatch")))}
          </p>
        )}
      </div>
    </Command>
  );
}

// Single icon column shared by every menu row. Rows differ only by the glyph,
// its color, and the name — slot geometry stays constant so files, folders,
// skills, plugins, commands, and agents line up identically.
const COMPOSER_COMMAND_ITEM_ICON_SLOT_CLASSNAME =
  "flex size-4 shrink-0 items-center justify-center text-muted-foreground/60";

// Files mirror the recap / diff changed-files treatment (FileEntryIcon at
// size-3.5 with the same dimmed foreground) so a file reads identically whether
// it appears in a turn summary or in the composer.
const COMPOSER_COMMAND_ITEM_FILE_ICON_CLASSNAME = "size-3.5 text-[var(--color-icon-secondary)]";

const COMPOSER_COMMAND_ITEM_GLYPH_CLASSNAME = "size-3.5";

function commandMenuItemGlyph(item: ComposerCommandItem, theme: "light" | "dark"): ReactNode {
  const cls = COMPOSER_COMMAND_ITEM_GLYPH_CLASSNAME;
  switch (item.type) {
    case "path":
      return (
        <FileEntryIcon
          pathValue={item.path}
          kind={item.pathKind}
          theme={theme}
          className={
            item.pathKind === "directory" ? cls : COMPOSER_COMMAND_ITEM_FILE_ICON_CLASSNAME
          }
        />
      );
    case "local-root":
      return <DeviceLaptopIcon className={cls} />;
    case "fork-target":
      return item.target === "local" ? (
        <DeviceLaptopIcon className={cls} />
      ) : (
        <WorktreeIcon className={cls} />
      );
    case "review-target":
      return item.target === "changes" ? (
        <ChangesIcon className={cls} />
      ) : (
        <GitBranchIcon className={cls} />
      );
    case "slash-command": {
      const BuiltInCommandIcon = builtInComposerSlashCommandIcon(item.command);
      return <BuiltInCommandIcon className={cls} />;
    }
    case "provider-native-command":
      // Provider native commands surface skills (e.g. Claude exposes skills as
      // slash commands), so default to the skill block glyph used for skill
      // tokens in the composer/timeline — named commands still keep their icon.
      return <SkillCubeIcon className={cls} />;
    case "model":
      return <BrainIcon className={cls} />;
    case "agent":
      return <BotIcon className={cls} />;
    case "plugin":
      return <PluginIcon className={cls} />;
    case "thread":
      return <ProviderIcon provider={item.provider} className={cls} />;
    case "skill":
      return <SkillCubeIcon className={cls} />;
    default:
      return null;
  }
}

function ComposerCommandItemIcon(props: {
  item: ComposerCommandItem;
  resolvedTheme: "light" | "dark";
  isActive: boolean;
}) {
  return (
    <span
      className={cn(
        COMPOSER_COMMAND_ITEM_ICON_SLOT_CLASSNAME,
        props.isActive && "text-foreground/70",
      )}
    >
      {commandMenuItemGlyph(props.item, props.resolvedTheme)}
    </span>
  );
}

// Props are destructured rather than read off a `props` object: `itemRef` lands on a JSX `ref`,
// which makes React Compiler treat it as a ref — and through `props.itemRef` that verdict spreads
// to the whole `props` object, so every later `props.x` read looks like a ref access during render
// and the component bails out of compilation entirely. Separate bindings keep the verdict on
// `itemRef` alone. Do not collapse these back into a `props` parameter.
const ComposerCommandMenuItem = memo(function ComposerCommandMenuItem({
  item,
  resolvedTheme,
  isActive,
  itemRef,
  onHighlight,
  onSelect,
}: {
  item: ComposerCommandItem;
  resolvedTheme: "light" | "dark";
  isActive: boolean;
  itemRef: (node: HTMLElement | null) => void;
  onHighlight: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const { locale, t } = useI18n();
  const secondaryText = commandMenuSecondaryText(item);
  const trailingMeta = commandMenuTrailingMeta(item, locale, t);

  return (
    <CommandItem
      ref={itemRef}
      value={item.id}
      className={cn(
        COMPOSER_COMMAND_MENU_ITEM_CLASS_NAME,
        isActive && COMPOSER_COMMAND_MENU_ITEM_ACTIVE_CLASS_NAME,
      )}
      onMouseMove={() => {
        if (!isActive) onHighlight(item.id);
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={() => {
        onSelect(item);
      }}
    >
      <ComposerCommandItemIcon item={item} resolvedTheme={resolvedTheme} isActive={isActive} />
      <div className="min-w-0 flex flex-1 items-center gap-3">
        <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden">
          <span className="shrink-0 text-[length:var(--app-font-size-ui-xs,12px)] font-medium text-foreground/80">
            {item.type === "slash-command" || item.type === "provider-native-command"
              ? commandMenuTitle(item, t)
              : item.label}
          </span>
          {secondaryText ? (
            <span className="truncate text-[11px] text-muted-foreground/55">{secondaryText}</span>
          ) : null}
        </div>
        {trailingMeta ? (
          <span className="shrink-0 pl-2 text-right text-[length:var(--app-font-size-ui-2xs,11px)] text-muted-foreground/42">
            {trailingMeta}
          </span>
        ) : null}
      </div>
    </CommandItem>
  );
});

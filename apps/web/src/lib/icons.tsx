import { type CSSProperties, type FC, type SVGProps } from "react";
import { SiGithub } from "react-icons/si";
import { cn } from "./utils";
import { Glyph, type GlyphStyle } from "~/ui/icons";

// Keep the component-shaped API stable while one product glyph system owns functional icons.
export type GlyphComponent = FC<SVGProps<SVGSVGElement>>;

// Wraps a product glyph asset behind the GlyphComponent API. Rendering via CSS mask
// avoids stroke-on-stroke alpha summation that gave hand-drawn SVGs a
// "stamped twice" look on shared vertices (the previous PinIcon bug).
function glyphWrapper(name: string, glyphStyle?: GlyphStyle): GlyphComponent {
  return function GlyphWrapper({ className, style, ...rest }) {
    const ariaLabelRaw = (rest as { ["aria-label"]?: unknown })["aria-label"];
    const label = typeof ariaLabelRaw === "string" ? ariaLabelRaw : undefined;
    return (
      <Glyph
        name={name}
        glyphStyle={glyphStyle}
        className={typeof className === "string" ? className : undefined}
        style={style as CSSProperties | undefined}
        label={label}
      />
    );
  };
}

export const AppsIcon: GlyphComponent = glyphWrapper("apps");
// Composer stacked-panel glyphs (subagent strip / workflow run card).
export const BackgroundTrayIcon: GlyphComponent = glyphWrapper("arrow-down-wall");
export const PanelExpandIcon: GlyphComponent = glyphWrapper("expand-45");
export const PanelCollapseIcon: GlyphComponent = glyphWrapper("minimize-45");
export const BackToParentIcon: GlyphComponent = glyphWrapper("arrow-share-left");
export const WorkflowIcon: GlyphComponent = glyphWrapper("agents");
export const SteerIcon: GlyphComponent = glyphWrapper("arrow-corner-down-right");
export const ComposerSendArrowIcon: GlyphComponent = glyphWrapper("arrow-up");
export const HandoffIcon: GlyphComponent = glyphWrapper("arrow-left-right");
export const ExchangeIcon: GlyphComponent = glyphWrapper("arrow-left-right");
export const SkillCubeIcon: GlyphComponent = glyphWrapper("building-blocks");
export const NewThreadIcon: GlyphComponent = glyphWrapper("compose-pencil");
/** The "+" affordance behind every add/create action (Add project, activity header). */
export const AddPlusIcon: GlyphComponent = glyphWrapper("plus-medium");
export const EraserIcon: GlyphComponent = glyphWrapper("eraser");
export const ArrowLeftIcon = glyphWrapper("arrow-left");
export const ArrowRightIcon = glyphWrapper("arrow-right");
export const ArrowDownIcon = glyphWrapper("arrow-down");
export const ArrowUpIcon = glyphWrapper("arrow-up");
export const ArrowUpRightIcon = glyphWrapper("arrow-up-right");
export const SortIcon: GlyphComponent = glyphWrapper("arrow-top-bottom");
// Single source for the robot/agent glyph. Sourced from the product glyph set so
// every robot affordance (reasoning rows, agent-task rows, agent mention chips,
// subagent menus, agent-activity headers) renders one identical icon. Use
// BotIcon in React; AGENT_ROBOT_ICON_NAME for imperative DOM via
// createGlyphElement.
export const AGENT_ROBOT_ICON_NAME = "robot";
export const BotIcon: GlyphComponent = glyphWrapper(AGENT_ROBOT_ICON_NAME);
export const BookIcon: GlyphComponent = glyphWrapper("book-simple");
export const BugIcon = glyphWrapper("bug");
export const PointerIcon = glyphWrapper("pointer");
export const HandRaisedIcon = glyphWrapper("raising-hand-5-finger");
export const CameraIcon = glyphWrapper("camera-1");
export const CheckIcon = glyphWrapper("checkmark-1");
export const ChevronDownIcon = glyphWrapper("chevron-down-small");
export const ChevronLeftIcon = glyphWrapper("chevron-left-small");
export const ChevronRightIcon = glyphWrapper("chevron-right-small");
export const ChevronUpIcon = glyphWrapper("chevron-top-small");
export const ChevronsUpDownIcon = glyphWrapper("sort-arrow-up-down");
export const CircleAlertIcon = glyphWrapper("warning-sign");
export const CircleCheckIcon = glyphWrapper("circle-check");
// Completed/success status glyph sourced from the glyph set so it sits in the
// same visual language as the other trailing thread-row icons (worktree, fork,
// pull-request) instead of the react-icons outline check it replaced.
export const CheckCircle2Icon: GlyphComponent = glyphWrapper("check-circle-2");
// User-input rows: a question-mark circle while the agent waits for an answer,
// and an up-arrow circle once the answer is submitted. Both come from the same
// registry so they sit visually beside the other timeline glyphs.
export const CircleQuestionIcon: GlyphComponent = glyphWrapper("circle-questionmark");
export const ArrowUpCircleIcon: GlyphComponent = glyphWrapper("arrow-up-circle");
export const CloudSyncIcon = glyphWrapper("cloud-sync");
export const Columns2Icon = glyphWrapper("layout-column");
export const CompareIcon = glyphWrapper("chart-compare");
export const ChangesIcon = glyphWrapper("changes");
export const CopyIcon = glyphWrapper("square-behind-square-6");
export const LinkIcon = glyphWrapper("chain-link-3");
export const DiffIcon = glyphWrapper("difference-modified");
export const DownloadIcon = glyphWrapper("cloud-simple-download");
// The clock doubles as the automation glyph everywhere it appears (meta chip,
// Automations nav, slash command, created card, environment section), so it is
// sourced from the product glyph set rather than an unrelated stroke family.
export const BellIcon: GlyphComponent = glyphWrapper("notes");
export const ClockIcon = glyphWrapper("clock");
export const EllipsisIcon = glyphWrapper("circle-dots-center-1");
export const ExternalLinkIcon = glyphWrapper("arrow-up-right");
export const EyeIcon = glyphWrapper("eye-open");
export const PaperclipIcon = glyphWrapper("paperclip-1");
export const ArchiveIcon = glyphWrapper("archive");
export const BrainIcon = glyphWrapper("brain");
export const FileIcon = glyphWrapper("file-text");
export const FlagIcon = glyphWrapper("flag-1");
export const FlaskConicalIcon = glyphWrapper("test-tube");
export const FolderIcon = glyphWrapper("folder-2");
export const FolderOpenIcon = glyphWrapper("folder-open-front");
export const FolderAddIcon = glyphWrapper("folder-add-left");
// Stacked "folders" glyph used as the single representation of a file tree /
// explorer surface (right-dock explorer, editor Files activity, diff file-tree
// toggle). line outline asset so it matches the rest of the chrome.
export const FoldersIcon: GlyphComponent = glyphWrapper("folders");
export const GiftIcon: GlyphComponent = glyphWrapper("gift-2");
export const GitCommitIcon: GlyphComponent = glyphWrapper("commits");
export const GitBranchIcon: GlyphComponent = glyphWrapper("branch");
export const GitForkIcon = glyphWrapper("fork");
export const GitMergeIcon: GlyphComponent = glyphWrapper("merged");
export const GitMergedSimpleIcon: GlyphComponent = glyphWrapper("merged-simple");
export const PushIcon: GlyphComponent = glyphWrapper("cloud-simple-upload");
export const GitHubIcon: GlyphComponent = (props) => (
  <SiGithub className={props.className} style={props.style} />
);
export const GitPullRequestIcon = glyphWrapper("pull-request");
// Pull-request state glyphs from the same three-node glyph family as "pull-request",
// so draft/closed/merged read as variations of one icon rather than four styles.
export const GitPullRequestDraftIcon: GlyphComponent = glyphWrapper("draft");
export const GitPullRequestClosedIcon: GlyphComponent = glyphWrapper("request-closed");
export const GitMergeConflictIcon: GlyphComponent = glyphWrapper("merge-conflict");
// Three descending-width lines — the app's one "filter controls" glyph (pull
// request list filters, and anywhere else that opens a filter popover).
export const FilterIcon: GlyphComponent = glyphWrapper("filter-2");
// Two-person glyph for "reviewers"/"people" rows (pull request meta grid).
export const UsersIcon: GlyphComponent = glyphWrapper("user-group");
export const GlobeIcon = glyphWrapper("world");
export const WebSearchIcon: GlyphComponent = glyphWrapper("globe");
export const McpIcon: GlyphComponent = glyphWrapper("building-blocks");
export const PluginIcon: GlyphComponent = glyphWrapper("puzzle");
// Single hammer/build glyph (tool-call rows, codex provider, "build" scripts).
// Sourced from the glyph set so it matches the other work-row icons (pencil,
// terminal, skill cube) it sits beside, instead of an unrelated wrench family.
export const HammerIcon: GlyphComponent = glyphWrapper("hammer");
export const HistoryIcon = glyphWrapper("history");
export const InfoIcon = glyphWrapper("circle-info");
export const KanbanIcon = glyphWrapper("columns-3-wide");
export const KeyboardIcon: GlyphComponent = glyphWrapper("keyboard");
export const ListChecksIcon = glyphWrapper("checklist");
export const ListTodoIcon = glyphWrapper("square-checklist");
export const TaskListIcon = glyphWrapper("tasks");
export const Loader2Icon = glyphWrapper("loader");
export const LoaderCircleIcon = Loader2Icon;
export const LoaderIcon = Loader2Icon;
export const Maximize2 = glyphWrapper("expand");
export const Minimize2 = glyphWrapper("minimize");
export const MessageCircleIcon = glyphWrapper("bubble-text");
export const MinusIcon = glyphWrapper("minus-medium");
export const ChatBubbleIcon: GlyphComponent = glyphWrapper("bubble-text");
export const MicIcon: GlyphComponent = glyphWrapper("microphone");
export const SidebarHiddenRightWideIcon = glyphWrapper("sidebar-hidden-right-wide");
export const PanelLeftIcon = glyphWrapper("sidebar-simple-left-wide");
export const PanelRightCloseIcon = SidebarHiddenRightWideIcon;
export const WindowIcon: GlyphComponent = glyphWrapper("window");
export const LayoutSidebarIcon: GlyphComponent = glyphWrapper("layout-sidebar");
export const PencilIcon: GlyphComponent = glyphWrapper("pencil");
export const PinIcon: GlyphComponent = glyphWrapper("pin");
// Solid pin from the fill set — used wherever a pin reflects "pinned" status
// (project + thread rows and their hover cards) rather than a neutral action.
export const PinFilledIcon: GlyphComponent = glyphWrapper("pin", "fill");
export const PauseIcon: GlyphComponent = glyphWrapper("pause", "fill");
export const PlayIcon: GlyphComponent = glyphWrapper("play", "fill");
export const Plus = glyphWrapper("plus-medium");
export const PlusIcon = Plus;
export const RefreshCwIcon = glyphWrapper("arrow-rotate-clockwise");
export const RotateCcwIcon = glyphWrapper("arrow-rotate-counter-clockwise");
export const Rows3Icon = glyphWrapper("list-bullets");
export const SlidersIcon = glyphWrapper("settings-slider-hor");
export const ArrowDownToLineIcon = glyphWrapper("arrow-down-wall");
export const CornerLeftUpIcon = glyphWrapper("arrow-corner-left-up");
export const SearchIcon: GlyphComponent = glyphWrapper("magnifying-glass");
// Single source for the settings gear. Every settings affordance renders this
// one Product glyph so gears stay identical across the chrome.
export const SettingsIcon: GlyphComponent = glyphWrapper("settings-gear-4");
export const StarIcon = glyphWrapper("star");
export const StarFilledIcon = glyphWrapper("star", "fill");
export const SunIcon = glyphWrapper("sun");
export const MoonIcon = glyphWrapper("moon");
export const DeviceLaptopIcon = glyphWrapper("devices");
export const StopIcon: GlyphComponent = glyphWrapper("stop", "fill");
export const StopFilledIcon: GlyphComponent = glyphWrapper("stop", "fill");
export const SquareSplitHorizontal: GlyphComponent = glyphWrapper("layout-half");
export const SquareSplitVertical: GlyphComponent = glyphWrapper("layout-column");
const TemporaryThreadGlyph = glyphWrapper("bubble-annotation-5");
// Dotted "annotation" chat bubble — the temporary thread marker shown on the
// composer toggle and beside temporary threads in the sidebar.
export const TemporaryThreadIcon: GlyphComponent = ({ className, ...props }) => (
  <TemporaryThreadGlyph className={cn("size-3.5 shrink-0", className)} {...props} />
);
export const TerminalIcon = glyphWrapper("console");
export const TerminalSquare = glyphWrapper("console");
export const TerminalSquareIcon = glyphWrapper("console");
export const TextWrapIcon = glyphWrapper("paragraph");
export const Trash2 = glyphWrapper("trash-can-simple");
export const TriangleAlertIcon = glyphWrapper("warning-sign");
export const Undo2Icon = glyphWrapper("arrow-undo-up");
export const WorktreeIcon = glyphWrapper("arrow-split-right");
export const XIcon = glyphWrapper("cross-small");
export const ZapIcon = glyphWrapper("zap");
// Single source for the fast-mode glyph. Every fast-mode affordance (composer
// trait badges, the effort-header toggle, the /fast command) renders this one solid
// lightning bolt from the fill set instead of mixing unrelated icon systems.
export const FastModeIcon: GlyphComponent = glyphWrapper("zap", "fill");
// Outline twin of FastModeIcon (line glyph set) for the inactive toggle state.
export const FastModeOutlineIcon: GlyphComponent = glyphWrapper("zap");

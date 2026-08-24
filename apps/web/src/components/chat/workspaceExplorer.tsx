// FILE: workspaceExplorer.tsx
// Purpose: Shared workspace file-tree explorer + file-search building blocks used
//          by both the full editor view and the right-dock explorer pane.
// Layer: Chat workspace-browsing UI primitives
// Exports: WorkspaceFilesSidebar, WorkspaceSearchSidebar, WorkspaceExplorerSidebar,
//          ExplorerActivityBarButton, useExplorerEntryPrefetch, setFileReferenceDragData.

import type {
  ProjectContentMatch,
  ProjectEntry,
  ProjectFileSystemEntry,
} from "@omnimind/contracts";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeWorkspaceEntrySearchQuery } from "@omnimind/shared/searchQuery";
import {
  type ComponentPropsWithoutRef,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  forwardRef,
  useEffect,
} from "react";

import {
  CHAT_FILE_REFERENCE_DRAG_TYPE,
  formatChatFileReference,
  type ChatFileReference,
} from "~/lib/chatReferences";
import { useI18n } from "~/i18n";
import { splitRepoRelativePath } from "~/lib/diffRendering";
import {
  getFileContextMenuPosition,
  showFileReferenceContextMenu,
} from "~/lib/fileReferenceContextMenu";
import {
  projectListDirectoriesQueryOptions,
  prewarmProjectSearchIndex,
  projectReadFileQueryOptions,
  projectSearchContentQueryOptions,
  projectSearchEntriesQueryOptions,
} from "~/lib/projectReactQuery";
import { buildMatchSegments } from "~/lib/matchHighlight";
import { getSyntaxHighlighterPromise, getSyntaxLanguageForPath } from "~/lib/syntaxHighlighting";
import { cn } from "~/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { DisclosureChevron } from "../ui/DisclosureChevron";
import { SearchInput } from "../ui/search-input";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { EXPLORER_ROW_PROPS, useExplorerListNavigation } from "./explorerListNavigation";
import { FileEntryIcon } from "./FileEntryIcon";
import { fileRowClassName, fileRowIndentStyle } from "./fileRowStyles";
import { PanelStateMessage } from "./PanelStateMessage";

const EXPLORER_HIDDEN_DIRECTORY_NAMES = new Set([
  ".cache",
  ".next",
  ".nuxt",
  ".parcel-cache",
  ".pnpm-store",
  ".svelte-kit",
  ".turbo",
  ".vite",
  ".yarn",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
]);

// Mirrors the composer mention search: debounce keystrokes so they don't fan
// out into fuzzy-search RPCs, and cap results to keep the sidebar light.
const EXPLORER_SEARCH_QUERY_DEBOUNCE_MS = 120;
const EXPLORER_SEARCH_RESULTS_LIMIT = 80;
const EXPLORER_CONTENT_SEARCH_MIN_QUERY_LENGTH = 2;

// Default sidebar shell: a full-height column in the editor's wide row layout
// that collapses to a stacked block on narrow viewports. Surfaces with a fixed
// horizontal layout (e.g. the right dock) override this via `containerClassName`.
const EXPLORER_SIDEBAR_CONTAINER_CLASS =
  "flex min-h-[11rem] w-full shrink-0 flex-col border-b border-border/65 bg-[var(--color-background-surface)] lg:h-full lg:w-56 lg:border-b-0 lg:border-r";

// Marks the drag payload so the chat composer can accept it as a reference.
export function setFileReferenceDragData(dataTransfer: DataTransfer, path: string): void {
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(CHAT_FILE_REFERENCE_DRAG_TYPE, formatChatFileReference({ path }));
  dataTransfer.setData("text/plain", path);
}

function shouldShowExplorerEntry(entry: ProjectFileSystemEntry): boolean {
  if (entry.kind !== "directory") {
    return true;
  }
  if (entry.name.startsWith(".omnimind")) {
    return false;
  }
  return !EXPLORER_HIDDEN_DIRECTORY_NAMES.has(entry.name);
}

/**
 * Warms caches for an explorer entry before it is clicked: directory listings
 * for folders, file contents plus the matching syntax highlighter for files.
 */
export function useExplorerEntryPrefetch(cwd: string | null) {
  const queryClient = useQueryClient();
  return (entry: Pick<ProjectFileSystemEntry, "path" | "kind">) => {
    if (!cwd) {
      return;
    }
    if (entry.kind === "directory") {
      void queryClient.prefetchQuery(
        projectListDirectoriesQueryOptions({
          cwd,
          relativePath: entry.path,
          includeFiles: true,
        }),
      );
      return;
    }
    void queryClient.prefetchQuery(projectReadFileQueryOptions({ cwd, relativePath: entry.path }));
    void getSyntaxHighlighterPromise(getSyntaxLanguageForPath(entry.path)).catch(() => undefined);
  };
}

// Forwards its ref and spreads incoming props so directory rows can act as the
// Collapsible trigger (Base UI injects onClick/aria/data + ref onto this element).
const ExplorerRow = forwardRef<
  HTMLButtonElement,
  {
    entry: ProjectFileSystemEntry;
    depth: number;
    selected: boolean;
    expanded: boolean;
    onSelectFile: (path: string) => void;
    onPrefetchEntry: (entry: ProjectFileSystemEntry) => void;
    onEntryContextMenu: (entry: ProjectFileSystemEntry, position: { x: number; y: number }) => void;
  } & ComponentPropsWithoutRef<"button">
>(function ExplorerRow(
  {
    entry,
    depth,
    selected,
    expanded,
    onSelectFile,
    onPrefetchEntry,
    onEntryContextMenu,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const isDirectory = entry.kind === "directory";
  // Directory rows are the Collapsible trigger: chain Base UI's injected onClick
  // (which toggles open/close) and skip file selection. File rows open the preview.
  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (isDirectory) {
      return;
    }
    onSelectFile(entry.path);
  };
  const handlePrefetch = () => {
    onPrefetchEntry(entry);
  };
  const handleContextMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onEntryContextMenu(entry, getFileContextMenuPosition(event));
  };
  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>) => {
    setFileReferenceDragData(event.dataTransfer, entry.path);
  };

  return (
    <button
      {...rest}
      {...EXPLORER_ROW_PROPS}
      ref={ref}
      type="button"
      className={fileRowClassName(selected, cn("h-7 pr-2", className))}
      style={fileRowIndentStyle(depth)}
      title={entry.path}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onPointerEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onContextMenu={handleContextMenu}
    >
      {isDirectory ? (
        <DisclosureChevron open={expanded} className="opacity-75" />
      ) : (
        <FileEntryIcon
          pathValue={entry.path}
          kind={entry.kind}
          className="size-3.5 shrink-0 opacity-75"
        />
      )}
      <span className="min-w-0 truncate">{entry.name}</span>
    </button>
  );
});

const EXPLORER_SKELETON_ROW_WIDTHS = ["w-9/12", "w-6/12", "w-7/12"];

function ExplorerLoadingRows(props: { depth: number }) {
  const { t } = useI18n();
  return (
    <div
      className="space-y-1.5 py-1.5 pr-2"
      style={fileRowIndentStyle(props.depth)}
      role="status"
      aria-label={t("file.loadingDirectory")}
    >
      {EXPLORER_SKELETON_ROW_WIDTHS.map((width) => (
        <div key={width} className="flex h-5 items-center gap-1.5">
          <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          <Skeleton className={cn("h-3 rounded-full", width)} />
        </div>
      ))}
    </div>
  );
}

function WorkspaceDirectory(props: {
  cwd: string;
  relativePath: string | null;
  depth: number;
  selectedFilePath: string | null;
  expandedDirectories: ReadonlySet<string>;
  onSelectFile: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  onPrefetchEntry: (entry: ProjectFileSystemEntry) => void;
  onEntryContextMenu: (entry: ProjectFileSystemEntry, position: { x: number; y: number }) => void;
}) {
  const { t } = useI18n();
  const query = useQuery(
    projectListDirectoriesQueryOptions({
      cwd: props.cwd,
      relativePath: props.relativePath,
      includeFiles: true,
    }),
  );

  if (query.isLoading && !query.data) {
    return <ExplorerLoadingRows depth={props.depth} />;
  }

  if (query.error) {
    return (
      <div className="px-3 py-2 text-[11px] text-destructive/80">
        <p>{t("file.loadDirectoryFailed")}</p>
        {query.error instanceof Error && query.error.message ? (
          <details className="mt-1 text-muted-foreground">
            <summary className="cursor-pointer">{t("error.showDetails")}</summary>
            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words">
              {query.error.message}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {(query.data?.entries ?? []).filter(shouldShowExplorerEntry).map((entry) => {
        if (entry.kind !== "directory") {
          return (
            <ExplorerRow
              key={entry.path}
              entry={entry}
              depth={props.depth}
              selected={entry.path === props.selectedFilePath}
              expanded={false}
              onSelectFile={props.onSelectFile}
              onPrefetchEntry={props.onPrefetchEntry}
              onEntryContextMenu={props.onEntryContextMenu}
            />
          );
        }
        const expanded = props.expandedDirectories.has(entry.path);
        return (
          <Collapsible
            key={entry.path}
            open={expanded}
            onOpenChange={() => props.onToggleDirectory(entry.path)}
          >
            <CollapsibleTrigger
              render={
                <ExplorerRow
                  entry={entry}
                  depth={props.depth}
                  selected={false}
                  expanded={expanded}
                  onSelectFile={props.onSelectFile}
                  onPrefetchEntry={props.onPrefetchEntry}
                  onEntryContextMenu={props.onEntryContextMenu}
                />
              }
            />
            {/* Keep children mounted only while open (plus the closing transition Base UI
                manages) so the height animation plays and lazy listings stay cached. */}
            <CollapsiblePanel>
              <WorkspaceDirectory
                cwd={props.cwd}
                relativePath={entry.path}
                depth={props.depth + 1}
                selectedFilePath={props.selectedFilePath}
                expandedDirectories={props.expandedDirectories}
                onSelectFile={props.onSelectFile}
                onToggleDirectory={props.onToggleDirectory}
                onPrefetchEntry={props.onPrefetchEntry}
                onEntryContextMenu={props.onEntryContextMenu}
              />
            </CollapsiblePanel>
          </Collapsible>
        );
      })}
    </>
  );
}

// Opening the file-reference context menu from a tree row (full entry) or a
// search-result row (path only). Both wrap the same menu, so they live here
// instead of being re-declared in every sidebar that renders these rows.
function useTreeEntryContextMenu(
  onReferenceInChat: ((reference: ChatFileReference) => void) | undefined,
) {
  const { t } = useI18n();
  return (entry: ProjectFileSystemEntry, position: { x: number; y: number }) => {
    void showFileReferenceContextMenu({
      path: entry.path,
      position,
      onReferenceInChat,
      t,
    });
  };
}

function useResultEntryContextMenu(
  onReferenceInChat: ((reference: ChatFileReference) => void) | undefined,
) {
  const { t } = useI18n();
  return (path: string, position: { x: number; y: number }) => {
    void showFileReferenceContextMenu({ path, position, onReferenceInChat, t });
  };
}

// Scrollable file-tree body, shared by the standalone files sidebar and the
// combined explorer sidebar (which shows it whenever the search box is empty).
function WorkspaceFilesTreeBody(props: {
  workspaceRoot: string | null;
  selectedFilePath: string | null;
  expandedDirectories: ReadonlySet<string>;
  onSelectFile: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  onPrefetchEntry: (entry: ProjectFileSystemEntry) => void;
  onEntryContextMenu: (entry: ProjectFileSystemEntry, position: { x: number; y: number }) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="min-h-0 flex-1 overflow-auto px-1 py-1">
      {props.workspaceRoot ? (
        <WorkspaceDirectory
          cwd={props.workspaceRoot}
          relativePath={null}
          depth={0}
          selectedFilePath={props.selectedFilePath}
          expandedDirectories={props.expandedDirectories}
          onSelectFile={props.onSelectFile}
          onToggleDirectory={props.onToggleDirectory}
          onPrefetchEntry={props.onPrefetchEntry}
          onEntryContextMenu={props.onEntryContextMenu}
        />
      ) : (
        <PanelStateMessage density="compact" fill="flex">
          <p>{t("file.noWorkspaceShort")}</p>
        </PanelStateMessage>
      )}
    </div>
  );
}

export function WorkspaceFilesSidebar(props: {
  workspaceRoot: string | null;
  selectedFilePath: string | null;
  expandedDirectories: ReadonlySet<string>;
  containerClassName?: string;
  onSelectFile: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  onReferenceInChat: ((reference: ChatFileReference) => void) | undefined;
}) {
  const prefetchEntry = useExplorerEntryPrefetch(props.workspaceRoot);
  const handleEntryContextMenu = useTreeEntryContextMenu(props.onReferenceInChat);
  const handleListKeyDown = useExplorerListNavigation();
  return (
    <aside
      className={props.containerClassName ?? EXPLORER_SIDEBAR_CONTAINER_CLASS}
      onKeyDown={handleListKeyDown}
    >
      <WorkspaceFilesTreeBody
        workspaceRoot={props.workspaceRoot}
        selectedFilePath={props.selectedFilePath}
        expandedDirectories={props.expandedDirectories}
        onSelectFile={props.onSelectFile}
        onToggleDirectory={props.onToggleDirectory}
        onPrefetchEntry={prefetchEntry}
        onEntryContextMenu={handleEntryContextMenu}
      />
    </aside>
  );
}

function WorkspaceSearchResultRow(props: {
  entry: ProjectEntry;
  highlightQuery: string;
  selected: boolean;
  onSelectFile: (path: string) => void;
  onSelectDirectory: (path: string) => void;
  onPrefetchEntry: (entry: Pick<ProjectFileSystemEntry, "path" | "kind">) => void;
  onEntryContextMenu: (path: string, position: { x: number; y: number }) => void;
}) {
  const { entry, onEntryContextMenu, onPrefetchEntry, onSelectDirectory, onSelectFile } = props;
  const { dir, name } = splitRepoRelativePath(entry.path);
  const nameSegments = buildMatchSegments(name, props.highlightQuery);
  const handlePrefetch = () => {
    onPrefetchEntry(entry);
  };

  return (
    <button
      {...EXPLORER_ROW_PROPS}
      type="button"
      aria-current={props.selected ? "page" : undefined}
      className={fileRowClassName(props.selected, "h-8 px-2")}
      title={entry.path}
      draggable={entry.kind === "file"}
      onDragStart={(event) => {
        if (entry.kind === "file") setFileReferenceDragData(event.dataTransfer, entry.path);
      }}
      onClick={() =>
        entry.kind === "directory" ? onSelectDirectory(entry.path) : onSelectFile(entry.path)
      }
      onPointerEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onContextMenu={(event) => {
        event.preventDefault();
        onEntryContextMenu(entry.path, getFileContextMenuPosition(event));
      }}
    >
      <FileEntryIcon
        pathValue={entry.path}
        kind={entry.kind}
        className="size-3.5 shrink-0 opacity-75"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
        <span className="shrink-0 truncate font-medium">
          {nameSegments
            ? nameSegments.map((segment) =>
                segment.matched ? (
                  <mark
                    key={segment.start}
                    className="rounded-[3px] bg-warning/20 px-[1px] text-current"
                  >
                    {segment.text}
                  </mark>
                ) : (
                  <span key={segment.start}>{segment.text}</span>
                ),
              )
            : name}
        </span>
        {dir ? (
          <span className="min-w-0 truncate text-[11px] text-muted-foreground/55">{dir}</span>
        ) : null}
      </div>
    </button>
  );
}

function WorkspaceContentSearchResultRow(props: {
  match: ProjectContentMatch;
  onSelectFile: (path: string) => void;
  onPrefetchEntry: (entry: Pick<ProjectFileSystemEntry, "path" | "kind">) => void;
  onEntryContextMenu: (path: string, position: { x: number; y: number }) => void;
}) {
  const { t } = useI18n();
  const { match, onEntryContextMenu, onPrefetchEntry, onSelectFile } = props;
  const { dir, name } = splitRepoRelativePath(match.path);
  const entry = { path: match.path, kind: "file" as const };
  const handlePrefetch = () => onPrefetchEntry(entry);
  const lineLabel = t("file.line", { line: match.lineNumber });

  return (
    <button
      {...EXPLORER_ROW_PROPS}
      type="button"
      aria-label={`${match.path}, ${lineLabel}: ${match.lineText}`}
      className={fileRowClassName(false, "min-h-11 items-start px-2 py-1.5")}
      title={`${match.path}:${match.lineNumber}`}
      draggable
      onDragStart={(event) => {
        setFileReferenceDragData(event.dataTransfer, match.path);
      }}
      onClick={() => onSelectFile(match.path)}
      onPointerEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onContextMenu={(event) => {
        event.preventDefault();
        onEntryContextMenu(match.path, getFileContextMenuPosition(event));
      }}
    >
      <FileEntryIcon
        pathValue={match.path}
        kind="file"
        className="mt-0.5 size-3.5 shrink-0 opacity-75"
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
          <span className="shrink-0 truncate font-medium">{name}</span>
          <span className="min-w-0 truncate text-[11px] text-muted-foreground/55">
            {dir ? `${dir} · ${lineLabel}` : lineLabel}
          </span>
        </div>
        <div className="truncate font-mono text-[11px] leading-5 text-muted-foreground/70">
          {match.lineText}
        </div>
      </div>
    </button>
  );
}

type WorkspaceSearchMatch =
  | {
      readonly type: "entry";
      readonly path: string;
      readonly entry: ProjectEntry;
    }
  | {
      readonly type: "content";
      readonly path: string;
      readonly match: ProjectContentMatch;
    };

const EMPTY_WORKSPACE_SEARCH_MATCHES: ReadonlyArray<WorkspaceSearchMatch> = [];

interface WorkspaceSearchState {
  // Trimmed live input — drives the "is the box empty?" decision (tree vs results).
  inputQuery: string;
  matches: ReadonlyArray<WorkspaceSearchMatch>;
  searchResultsPending: boolean;
  searchResultsCurrent: boolean;
  isFetching: boolean;
  error: Error | null;
  truncated: boolean;
}

// One debounced projection shared by the standalone search sidebar and the
// combined explorer. Filename rank stays authoritative and content matches
// follow in deterministic path/line order inside the same keyboard list.
function useWorkspaceSearch(workspaceRoot: string | null, query: string): WorkspaceSearchState {
  useEffect(() => {
    prewarmProjectSearchIndex(workspaceRoot);
  }, [workspaceRoot]);
  const [debouncedQuery] = useDebouncedValue(query, {
    wait: EXPLORER_SEARCH_QUERY_DEBOUNCE_MS,
  });
  const inputQuery = query.trim();
  const trimmedQuery = debouncedQuery.trim();
  const contentSearchEnabled = trimmedQuery.length >= EXPLORER_CONTENT_SEARCH_MIN_QUERY_LENGTH;
  const entriesQuery = useQuery(
    projectSearchEntriesQueryOptions({
      cwd: workspaceRoot,
      query: trimmedQuery,
      limit: EXPLORER_SEARCH_RESULTS_LIMIT,
    }),
  );
  const contentQuery = useQuery(
    projectSearchContentQueryOptions({
      cwd: workspaceRoot,
      query: trimmedQuery,
      limit: EXPLORER_SEARCH_RESULTS_LIMIT,
      enabled: contentSearchEnabled,
    }),
  );
  // Results are tied to the debounced query. While the user is ahead of that
  // query, keep old results non-selectable so Enter cannot open a stale match.
  const isFetching = entriesQuery.isFetching || (contentSearchEnabled && contentQuery.isFetching);
  const searchResultsPending =
    inputQuery !== trimmedQuery ||
    isFetching ||
    (entriesQuery.isPlaceholderData && !entriesQuery.error) ||
    (contentSearchEnabled && contentQuery.isPlaceholderData && !contentQuery.error);
  const searchResultsCurrent = !searchResultsPending;
  const currentError = searchResultsCurrent
    ? (entriesQuery.error ?? (contentSearchEnabled ? contentQuery.error : null))
    : null;
  const allMatches: WorkspaceSearchMatch[] =
    searchResultsCurrent && !currentError
      ? [
          ...(entriesQuery.data?.entries ?? []).map(
            (entry): WorkspaceSearchMatch => ({
              type: "entry",
              path: entry.path,
              entry,
            }),
          ),
          ...(contentSearchEnabled ? (contentQuery.data?.matches ?? []) : []).map(
            (match): WorkspaceSearchMatch => ({
              type: "content",
              path: match.path,
              match,
            }),
          ),
        ]
      : [];
  const matches = searchResultsCurrent
    ? allMatches.slice(0, EXPLORER_SEARCH_RESULTS_LIMIT)
    : EMPTY_WORKSPACE_SEARCH_MATCHES;
  return {
    inputQuery,
    matches,
    searchResultsPending,
    searchResultsCurrent,
    isFetching,
    error: currentError,
    truncated:
      searchResultsCurrent &&
      !currentError &&
      ((entriesQuery.data?.truncated ?? false) ||
        (contentSearchEnabled && (contentQuery.data?.truncated ?? false)) ||
        allMatches.length > EXPLORER_SEARCH_RESULTS_LIMIT),
  };
}

// Search-box header: a fixed, full-width input that selects the top match on
// Enter and clears (returning to the tree, in the combined sidebar) on Escape.
function WorkspaceSearchInputHeader(props: {
  query: string;
  search: WorkspaceSearchState;
  autoFocus?: boolean;
  onQueryChange: (query: string) => void;
  onSelectFile: (path: string) => void;
  onSelectDirectory: (path: string) => void;
}) {
  const { t } = useI18n();
  const { onQueryChange, onSelectDirectory, onSelectFile, query, search } = props;
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!search.searchResultsCurrent) {
        return;
      }
      const topMatch = search.matches[0];
      if (topMatch) {
        if (topMatch.type === "entry" && topMatch.entry.kind === "directory") {
          onSelectDirectory(topMatch.path);
        } else {
          onSelectFile(topMatch.path);
        }
      }
      return;
    }
    if (event.key === "Escape" && query.length > 0) {
      event.stopPropagation();
      onQueryChange("");
    }
  };

  return (
    <div className="shrink-0 border-b border-border/65 p-2">
      <SearchInput
        value={query}
        autoFocus={props.autoFocus}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        placeholder={t("file.searchPlaceholder")}
        aria-label={t("workbench.searchFiles")}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleInputKeyDown}
      />
    </div>
  );
}

// Scrollable search-results body (matches list + truncation hint). Callers only
// mount it once the query is non-empty, so the empty-query state lives outside.
function WorkspaceSearchResultsBody(props: {
  workspaceRoot: string | null;
  search: WorkspaceSearchState;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  onSelectDirectory: (path: string) => void;
  onPrefetchEntry: (entry: Pick<ProjectFileSystemEntry, "path" | "kind">) => void;
  onEntryContextMenu: (path: string, position: { x: number; y: number }) => void;
}) {
  const { t } = useI18n();
  const { matches } = props.search;
  const statusText = props.search.error
    ? t("file.searchFailed")
    : props.search.searchResultsPending || props.search.isFetching
      ? t("common.loading")
      : t(matches.length === 1 ? "file.searchResultCount" : "file.searchResultCountPlural", {
          count: matches.length,
        });
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {statusText}
      </p>
      <div
        aria-busy={props.search.searchResultsPending || props.search.isFetching}
        className={cn(
          "min-h-0 flex-1 overflow-auto px-1 py-1",
          matches.length === 0 && "flex flex-col",
        )}
      >
        {!props.workspaceRoot ? (
          <PanelStateMessage density="compact" fill="flex">
            <p>{t("file.noWorkspaceShort")}</p>
          </PanelStateMessage>
        ) : props.search.searchResultsCurrent && props.search.error ? (
          <PanelStateMessage density="compact" fill="flex">
            <div className="text-destructive/85">
              <p>{t("file.searchFailed")}</p>
              {props.search.error instanceof Error && props.search.error.message ? (
                <details className="mt-1 text-muted-foreground">
                  <summary className="cursor-pointer">{t("error.showDetails")}</summary>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words">
                    {props.search.error.message}
                  </pre>
                </details>
              ) : null}
            </div>
          </PanelStateMessage>
        ) : matches.length === 0 ? (
          props.search.searchResultsPending || props.search.isFetching ? (
            <ExplorerLoadingRows depth={0} />
          ) : (
            <PanelStateMessage density="compact" fill="flex">
              <p>{t("file.noMatches")}</p>
            </PanelStateMessage>
          )
        ) : (
          matches.map((result) =>
            result.type === "entry" ? (
              <WorkspaceSearchResultRow
                key={`entry:${result.path}`}
                entry={result.entry}
                highlightQuery={normalizeWorkspaceEntrySearchQuery(props.search.inputQuery)}
                selected={result.path === props.selectedFilePath}
                onSelectFile={props.onSelectFile}
                onSelectDirectory={props.onSelectDirectory}
                onPrefetchEntry={props.onPrefetchEntry}
                onEntryContextMenu={props.onEntryContextMenu}
              />
            ) : (
              <WorkspaceContentSearchResultRow
                key={`content:${result.path}:${result.match.lineNumber}`}
                match={result.match}
                onSelectFile={props.onSelectFile}
                onPrefetchEntry={props.onPrefetchEntry}
                onEntryContextMenu={props.onEntryContextMenu}
              />
            ),
          )
        )}
      </div>
      {props.search.searchResultsCurrent && props.search.truncated ? (
        <p className="shrink-0 border-t border-border/45 px-3 py-1.5 text-[10px] text-muted-foreground/70">
          {t("file.topMatches")}
        </p>
      ) : null}
    </>
  );
}

export function WorkspaceSearchSidebar(props: {
  workspaceRoot: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  selectedFilePath: string | null;
  containerClassName?: string;
  onSelectFile: (path: string) => void;
  onSelectDirectory: (path: string) => void;
  onReferenceInChat: ((reference: ChatFileReference) => void) | undefined;
}) {
  const { t } = useI18n();
  const prefetchEntry = useExplorerEntryPrefetch(props.workspaceRoot);
  const handleEntryContextMenu = useResultEntryContextMenu(props.onReferenceInChat);
  const handleListKeyDown = useExplorerListNavigation();
  const search = useWorkspaceSearch(props.workspaceRoot, props.query);

  return (
    <aside
      className={props.containerClassName ?? EXPLORER_SIDEBAR_CONTAINER_CLASS}
      onKeyDown={handleListKeyDown}
    >
      <WorkspaceSearchInputHeader
        query={props.query}
        search={search}
        autoFocus
        onQueryChange={props.onQueryChange}
        onSelectFile={props.onSelectFile}
        onSelectDirectory={props.onSelectDirectory}
      />
      {search.inputQuery.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col px-1 py-1">
          <PanelStateMessage density="compact" fill="flex">
            <p>{t("file.searchInstruction")}</p>
          </PanelStateMessage>
        </div>
      ) : (
        <WorkspaceSearchResultsBody
          workspaceRoot={props.workspaceRoot}
          search={search}
          selectedFilePath={props.selectedFilePath}
          onSelectFile={props.onSelectFile}
          onSelectDirectory={props.onSelectDirectory}
          onPrefetchEntry={prefetchEntry}
          onEntryContextMenu={handleEntryContextMenu}
        />
      )}
    </aside>
  );
}

// Combined explorer: one panel with a fixed search box on top that shows the
// full file tree while empty and switches to fuzzy file-name results as soon as
// the user types — no separate Files/Search activity rail needed.
export function WorkspaceExplorerSidebar(props: {
  workspaceRoot: string | null;
  selectedFilePath: string | null;
  expandedDirectories: ReadonlySet<string>;
  query: string;
  onQueryChange: (query: string) => void;
  containerClassName?: string;
  onSelectFile: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  onReferenceInChat: ((reference: ChatFileReference) => void) | undefined;
}) {
  const prefetchEntry = useExplorerEntryPrefetch(props.workspaceRoot);
  const handleTreeEntryContextMenu = useTreeEntryContextMenu(props.onReferenceInChat);
  const handleResultEntryContextMenu = useResultEntryContextMenu(props.onReferenceInChat);
  const handleListKeyDown = useExplorerListNavigation();
  const search = useWorkspaceSearch(props.workspaceRoot, props.query);
  const handleSelectDirectory = (path: string) => {
    for (const directory of workspaceDirectoryChain(path)) {
      if (!props.expandedDirectories.has(directory)) props.onToggleDirectory(directory);
    }
    props.onQueryChange("");
  };

  return (
    <aside
      className={props.containerClassName ?? EXPLORER_SIDEBAR_CONTAINER_CLASS}
      onKeyDown={handleListKeyDown}
    >
      <WorkspaceSearchInputHeader
        query={props.query}
        search={search}
        onQueryChange={props.onQueryChange}
        onSelectFile={props.onSelectFile}
        onSelectDirectory={handleSelectDirectory}
      />
      {search.inputQuery.length === 0 ? (
        <WorkspaceFilesTreeBody
          workspaceRoot={props.workspaceRoot}
          selectedFilePath={props.selectedFilePath}
          expandedDirectories={props.expandedDirectories}
          onSelectFile={props.onSelectFile}
          onToggleDirectory={props.onToggleDirectory}
          onPrefetchEntry={prefetchEntry}
          onEntryContextMenu={handleTreeEntryContextMenu}
        />
      ) : (
        <WorkspaceSearchResultsBody
          workspaceRoot={props.workspaceRoot}
          search={search}
          selectedFilePath={props.selectedFilePath}
          onSelectFile={props.onSelectFile}
          onSelectDirectory={handleSelectDirectory}
          onPrefetchEntry={prefetchEntry}
          onEntryContextMenu={handleResultEntryContextMenu}
        />
      )}
    </aside>
  );
}

export function workspaceDirectoryChain(path: string): string[] {
  const segments = path.split("/").filter(Boolean);
  return segments.map((_segment, index) => segments.slice(0, index + 1).join("/"));
}

export function ExplorerActivityBarButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const button = (
    <button
      type="button"
      className={cn(
        "relative flex h-12 w-full cursor-pointer items-center justify-center text-muted-foreground/72 transition-colors hover:bg-[var(--color-background-button-secondary-hover)] hover:text-foreground",
        props.active && "bg-[var(--color-background-button-secondary)] text-foreground",
      )}
      aria-label={props.label}
      aria-pressed={props.active}
      title={props.label}
      onClick={props.onClick}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-transparent",
          props.active && "bg-foreground/85",
        )}
        aria-hidden="true"
      />
      {props.children}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipPopup side="right">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

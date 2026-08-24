// FILE: TerminalSearch.tsx
// Purpose: Provides the in-terminal find bar and navigation controls.
// Layer: Terminal presentation component
// Exports: TerminalSearch

import type { SearchAddon, ISearchOptions } from "@xterm/addon-search";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "~/components/ui/icon-button";
import { terminalSearchDecorationsFromTheme } from "~/components/terminal/terminalRuntimeAppearance";
import { useTheme } from "~/hooks/useTheme";
import { useI18n } from "~/i18n";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";

interface TerminalSearchProps {
  searchAddon: SearchAddon | null;
  isOpen: boolean;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 90;

export function TerminalSearch({ searchAddon, isOpen, onClose }: TerminalSearchProps) {
  const { t } = useI18n();
  const { activeTheme, resolvedTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [hasResults, setHasResults] = useState<boolean | null>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const searchDecorations = useMemo(
    () => terminalSearchDecorationsFromTheme(activeTheme, resolvedTheme),
    [activeTheme, resolvedTheme],
  );

  const searchOptions = useMemo<ISearchOptions>(
    () => ({
      caseSensitive,
      regex: false,
      decorations: searchDecorations,
    }),
    [caseSensitive, searchDecorations],
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && searchAddon) {
      searchAddon.clearDecorations();
    }
  }, [isOpen, searchAddon]);

  const handleSearch = (direction: "next" | "previous") => {
    if (!searchAddon || !query) return;
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    const found =
      direction === "next"
        ? searchAddon.findNext(query, searchOptions)
        : searchAddon.findPrevious(query, searchOptions);
    setHasResults(found);
  };

  const clearSearchTimer = useCallback(() => {
    if (searchTimerRef.current === null) return;
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
  }, []);

  const scheduleSearch = (nextQuery: string) => {
    clearSearchTimer();
    if (!searchAddon || !nextQuery) {
      setHasResults(null);
      searchAddon?.clearDecorations();
      return;
    }

    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      setHasResults(searchAddon.findNext(nextQuery, searchOptions));
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    scheduleSearch(newQuery);
  };

  // Re-run the active query when the addon or any resolved search option
  // changes. This keeps existing decorations in sync when the app theme
  // changes without making TerminalSearch interpret a theme preset itself.
  // Query edits remain owned by handleInputChange.
  const prevSearchOptionsRef = useRef(searchOptions);
  const prevSearchAddonRef = useRef<SearchAddon | null>(searchAddon);
  useEffect(() => {
    const searchOptionsChanged = prevSearchOptionsRef.current !== searchOptions;
    const searchAddonChanged = prevSearchAddonRef.current !== searchAddon;
    if (!searchOptionsChanged && !searchAddonChanged) return;

    prevSearchOptionsRef.current = searchOptions;
    prevSearchAddonRef.current = searchAddon;
    if (searchAddon && query) {
      // Inline debounce (rather than scheduleSearch) so every state write in
      // this effect happens inside the timer, keeping it compiler-eligible.
      clearSearchTimer();
      searchTimerRef.current = window.setTimeout(() => {
        searchTimerRef.current = null;
        setHasResults(searchAddon.findNext(query, searchOptions));
      }, SEARCH_DEBOUNCE_MS);
    }
  }, [searchAddon, query, clearSearchTimer, searchOptions]);

  useEffect(() => () => clearSearchTimer(), [clearSearchTimer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(e.shiftKey ? "previous" : "next");
    }
  };

  const handleClose = () => {
    setQuery("");
    setHasResults(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] items-center rounded bg-popover/95 pl-2 pr-0.5 shadow-lg ring-1 ring-border/40 backdrop-blur">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={t("terminal.find")}
        className="h-6 w-28 min-w-0 flex-shrink bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {hasResults === false && query && (
        <span className="whitespace-nowrap px-1 text-xs text-muted-foreground">
          {t("terminal.noResults")}
        </span>
      )}
      <div className="flex shrink-0 items-center">
        <IconButton
          onClick={() => setCaseSensitive((v) => !v)}
          label={t("terminal.matchCase")}
          className={cn(
            "size-6 rounded-sm border-transparent bg-transparent shadow-none sm:size-6",
            caseSensitive
              ? "bg-primary/20 text-foreground"
              : "text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground",
          )}
        >
          <span className="text-[10px] font-bold leading-none">Aa</span>
        </IconButton>
        <IconButton
          onClick={() => handleSearch("previous")}
          className="size-6 rounded-sm border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted-foreground/20 hover:text-foreground sm:size-6"
          label={t("terminal.previousMatch")}
        >
          <ChevronUpIcon className="size-3.5" />
        </IconButton>
        <IconButton
          onClick={() => handleSearch("next")}
          className="size-6 rounded-sm border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted-foreground/20 hover:text-foreground sm:size-6"
          label={t("terminal.nextMatch")}
        >
          <ChevronDownIcon className="size-3.5" />
        </IconButton>
        <IconButton
          onClick={handleClose}
          className="size-6 rounded-sm border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted-foreground/20 hover:text-foreground sm:size-6"
          label={t("terminal.closeSearch")}
        >
          <XIcon className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

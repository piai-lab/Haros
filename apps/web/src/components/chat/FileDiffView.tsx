// FILE: FileDiffView.tsx
// Purpose: Shared diff viewer chrome — a virtualized scroll surface plus a themed
//          per-file card — used by both the turn/repo DiffPanel and the source
//          control GitPanel so they share font/theme behavior, the Haros file
//          header, and the @pierre/diffs `unsafeCSS` theming.
// Layer: Chat/diff UI primitives
// Depends on: @pierre/diffs FileDiff/Virtualizer, diffRendering (theme + unsafeCSS), FileDiffHeader

import { FileDiff, type FileDiffMetadata, Virtualizer } from "@pierre/diffs/react";
import { type ReactNode } from "react";

import {
  buildDiffPanelUnsafeCSS,
  resolveDiffThemeName,
  resolveFileDiffPath,
} from "~/lib/diffRendering";
import { cn } from "~/lib/utils";
import { FileDiffHeader } from "./FileDiffHeader";

// Keep diff virtualization tuning in one place so every diff surface scrolls identically.
const DIFF_VIRTUALIZER_CONFIG = {
  overscrollSize: 400,
  intersectionObserverMargin: 600,
};

// Virtualized scroll container shared by single-file (GitPanel) and multi-file
// (DiffPanel/Timeline) diff lists. This is the only vertical scroll owner for a
// collection of rendered files.
export function FileDiffSurface(props: { className?: string; children: ReactNode }) {
  return (
    <Virtualizer
      className={cn("diff-render-surface", props.className)}
      config={DIFF_VIRTUALIZER_CONFIG}
    >
      {props.children}
    </Virtualizer>
  );
}

// A single themed file diff with Haros's custom file header. Bakes in the shared
// `unsafeCSS` theming so every surface renders with the chat code font and
// themed addition/deletion backgrounds.
export function FileDiffCard(props: {
  fileDiff: FileDiffMetadata;
  theme: "light" | "dark";
  diffStyle?: "unified" | "split";
  overflow?: "scroll" | "wrap";
  collapsed?: boolean;
  className?: string;
  children?: ReactNode;
  /** Header actions remain independent from the disclosure button. */
  headerActions?: ReactNode;
  onToggleCollapsed?: (() => void) | undefined;
  toggleLabel?: string | undefined;
}) {
  return (
    <div
      className={cn("diff-render-file", props.className)}
      data-diff-file-path={resolveFileDiffPath(props.fileDiff)}
    >
      <FileDiff
        fileDiff={props.fileDiff}
        options={{
          diffStyle: props.diffStyle ?? "unified",
          lineDiffType: "none",
          overflow: props.overflow ?? "scroll",
          theme: resolveDiffThemeName(props.theme),
          themeType: props.theme,
          unsafeCSS: buildDiffPanelUnsafeCSS(props.theme),
          ...(props.collapsed !== undefined ? { collapsed: props.collapsed } : {}),
        }}
        renderCustomHeader={(fileDiff) => (
          <FileDiffHeader
            fileDiff={fileDiff}
            theme={props.theme}
            collapsed={props.collapsed}
            onToggleCollapsed={props.onToggleCollapsed}
            toggleLabel={props.toggleLabel}
            trailing={props.headerActions}
          />
        )}
      />
      {props.children}
    </div>
  );
}

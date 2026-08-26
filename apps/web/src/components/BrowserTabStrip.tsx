// FILE: BrowserTabStrip.tsx
// Purpose: Present the current conversation's browser tabs and keep the active tab visible.
// Layer: Web UI component
// Depends on: Existing thread-local Browser state and BrowserPanel chrome styles

import { useLayoutEffect, useRef } from "react";
import type { BrowserTabState } from "@omnimind/contracts";
import { isBlankBrowserTabUrl } from "@omnimind/shared/browserSession";

import { useI18n } from "~/i18n";
import { GlobeIcon, PlusIcon, XIcon } from "~/lib/icons";
import { cn } from "~/lib/utils";

import {
  BROWSER_CHROME_CONTROL_CLASS_NAME,
  BROWSER_CHROME_CONTROL_FILLED_CLASS_NAME,
} from "./BrowserPanel.logic";
import { Button } from "./ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

interface BrowserTabStripStatus {
  tone: "default" | "error";
  label: string;
  title?: string;
}

export interface BrowserTabStripProps {
  tabs: readonly BrowserTabState[];
  activeTabId: string | null;
  status: BrowserTabStripStatus | null;
  dragRegion: boolean;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateTab: () => void;
}

function closeButtonClassName(isActive: boolean) {
  return cn(
    "ml-1 size-5 shrink-0 rounded-sm p-0 text-muted-foreground/70 hover:bg-background/80 hover:text-foreground",
    isActive ? "hover:bg-background" : "hover:bg-card",
  );
}

// Do not use scrollIntoView here: it can also move the dock or chat column.
export function scrollBrowserTabStripToActive(strip: HTMLElement, tab: HTMLElement): void {
  const stripRect = strip.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  const left = tabRect.left - stripRect.left + strip.scrollLeft;
  const right = left + tabRect.width;
  if (left < strip.scrollLeft) {
    strip.scrollLeft = left;
  } else if (right > strip.scrollLeft + strip.clientWidth) {
    strip.scrollLeft = right - strip.clientWidth;
  }
}

export function BrowserTabStrip(props: BrowserTabStripProps) {
  const { t } = useI18n();
  const stripRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || props.activeTabId === null) return;
    const activeTab = strip.querySelector<HTMLElement>('[data-browser-tab-active="true"]');
    if (activeTab) scrollBrowserTabStripToActive(strip, activeTab);
  }, [props.activeTabId]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-2 py-1.5",
        props.dragRegion && "drag-region",
      )}
    >
      <div ref={stripRef} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {props.tabs.map((tab) => {
          const isActive = tab.id === props.activeTabId;
          const tabIsBlank = isBlankBrowserTabUrl(tab);
          return (
            <div
              key={tab.id}
              data-browser-tab-active={isActive ? "true" : undefined}
              className={cn(
                "group flex min-w-0 max-w-[14rem] items-center px-2.5 text-left transition-colors",
                BROWSER_CHROME_CONTROL_CLASS_NAME,
                isActive
                  ? cn(BROWSER_CHROME_CONTROL_FILLED_CLASS_NAME, "text-foreground")
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/40 hover:text-foreground",
                tab.status === "suspended" && !tabIsBlank ? "opacity-75" : "",
              )}
            >
              <span className="mr-2 flex size-4 shrink-0 items-center justify-center rounded-sm">
                {tab.faviconUrl ? (
                  <img alt="" src={tab.faviconUrl} className="size-3 rounded-[2px]" />
                ) : (
                  <GlobeIcon className="size-3 text-muted-foreground" />
                )}
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => props.onSelectTab(tab.id)}
              >
                {tab.title || t("browser.untitled")}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={closeButtonClassName(isActive)}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onCloseTab(tab.id);
                }}
              >
                <XIcon className="size-3" />
                <span className="sr-only">{t("browser.closeTab")}</span>
              </Button>
            </div>
          );
        })}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={t("browser.newTab")}
                onClick={props.onCreateTab}
              />
            }
          >
            <PlusIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipPopup>{t("browser.newTab")}</TooltipPopup>
        </Tooltip>
      </div>
      {props.status ? (
        <div
          className={cn(
            "max-w-[13rem] shrink-0 truncate rounded-full border px-2.5 py-1 text-[11px] leading-none sm:max-w-[16rem]",
            props.status.tone === "error"
              ? "border-destructive/25 bg-destructive/8 text-destructive"
              : "border-border/60 bg-background/80 text-muted-foreground",
          )}
          title={props.status.title ?? props.status.label}
        >
          {props.status.label}
        </div>
      ) : null}
    </div>
  );
}

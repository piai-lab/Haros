// FILE: ThreadFindHighlights.tsx
// Purpose: Paint find hits in mounted transcript rows without rewriting React-owned DOM.

import { useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react";

import {
  collectCaseInsensitiveSubstringRanges,
  type ThreadFindHighlightStore,
  type ThreadFindMatch,
} from "./threadFind.logic";

type HighlightRegistryLike = {
  delete: (name: string) => void;
  set: (name: string, highlight: unknown) => void;
};

function registry(): HighlightRegistryLike | null {
  const css = CSS as typeof CSS & { highlights?: HighlightRegistryLike };
  return css.highlights ?? null;
}

function clearHighlights(store: ThreadFindHighlightStore): void {
  registry()?.delete(store.matchHighlightName);
  registry()?.delete(store.activeHighlightName);
}

function nearestBlock(node: Text): Element | null {
  return (
    node.parentElement?.closest(
      "address, article, aside, blockquote, div, dl, fieldset, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, tbody, td, tfoot, th, thead, tr, ul",
    ) ?? null
  );
}

function textRanges(root: ParentNode, query: string): Range[] {
  const ranges: Range[] = [];
  const textNodes: Array<{ node: Text; start: number; text: string }> = [];
  let combinedText = "";
  let previousBlock: Element | null = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("button, input, textarea, [aria-hidden='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    if (text.length === 0) continue;
    const block = nearestBlock(node as Text);
    if (combinedText.length > 0 && block !== previousBlock) combinedText += "\n";
    textNodes.push({ node: node as Text, start: combinedText.length, text });
    combinedText += text;
    previousBlock = block;
  }

  for (const { startOffset: start, endOffset: end } of collectCaseInsensitiveSubstringRanges(
    combinedText,
    query,
  )) {
    const startNode = textNodes.find(
      (entry) => start >= entry.start && start < entry.start + entry.text.length,
    );
    const endNode = textNodes.find(
      (entry) => end > entry.start && end <= entry.start + entry.text.length,
    );
    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode.node, start - startNode.start);
      range.setEnd(endNode.node, end - endNode.start);
      ranges.push(range);
    }
  }
  return ranges;
}

function paint(
  root: HTMLElement | null,
  store: ThreadFindHighlightStore,
  query: string,
  activeMatch: ThreadFindMatch | null,
  scrollRequestId: number | null,
  lastHandledScrollRequest: { current: number },
): void {
  clearHighlights(store);
  const usableQuery = query.trim();
  const highlightRegistry = registry();
  const HighlightConstructor = (globalThis as { Highlight?: new (...ranges: Range[]) => unknown })
    .Highlight;
  if (!root || !highlightRegistry || !HighlightConstructor || usableQuery.length === 0) return;

  const textRoots = Array.from(root.querySelectorAll<HTMLElement>("[data-chat-find-text-root]"));
  const matches = textRoots.flatMap((textRoot) => textRanges(textRoot, usableQuery));
  if (matches.length > 0) {
    highlightRegistry.set(store.matchHighlightName, new HighlightConstructor(...matches));
  }
  if (!activeMatch) return;
  const activeDocument = Array.from(
    root.querySelectorAll<HTMLElement>("[data-chat-find-document-id]"),
  ).find((element) => element.dataset.chatFindDocumentId === activeMatch.messageId);
  const activeTextRoot = activeDocument?.querySelector<HTMLElement>("[data-chat-find-text-root]");
  const activeRange = activeTextRoot
    ? textRanges(activeTextRoot, usableQuery)[activeMatch.occurrenceIndex]
    : undefined;
  if (activeRange) {
    highlightRegistry.set(store.activeHighlightName, new HighlightConstructor(activeRange));
    if (scrollRequestId !== null && scrollRequestId > lastHandledScrollRequest.current) {
      activeRange.startContainer.parentElement?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      lastHandledScrollRequest.current = scrollRequestId;
    }
  }
}

export function ThreadFindHighlights(props: {
  rootRef: RefObject<HTMLElement | null>;
  store: ThreadFindHighlightStore;
}) {
  const highlight = useSyncExternalStore(props.store.subscribe, props.store.get, props.store.get);
  const lastHandledScrollRequest = useRef(0);

  useLayoutEffect(() => {
    let frame = 0;
    const refresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        paint(
          props.rootRef.current,
          props.store,
          highlight?.query ?? "",
          highlight?.activeMatch ?? null,
          highlight?.scrollRequestId ?? null,
          lastHandledScrollRequest,
        );
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    if (props.rootRef.current) {
      observer.observe(props.rootRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      clearHighlights(props.store);
    };
  }, [highlight, props.rootRef, props.store]);

  return (
    <style>{`
      ::highlight(${props.store.matchHighlightName}) {
        color: inherit;
        background: color-mix(in srgb, #facc15 54%, transparent);
      }
      ::highlight(${props.store.activeHighlightName}) {
        color: inherit;
        background: color-mix(in srgb, #f97316 70%, transparent);
      }
    `}</style>
  );
}

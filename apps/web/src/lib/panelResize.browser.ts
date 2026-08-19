// FILE: panelResize.browser.ts
// Purpose: Browser-layout regression tests for panel resize composer probes.
// Layer: Web DOM behavior tests
// Depends on: panelResize, chatPaneScope

import { afterEach, describe, expect, it, vi } from "vitest";

import { SINGLE_CHAT_PANE_SCOPE_ID, dockSidechatPaneScopeId } from "./chatPaneScope";
import { canComposerHandlePanelWidth, createPanelResizeSession } from "./panelResize";

interface MountedComposer {
  viewport: HTMLDivElement;
}

function mountComposer(input: {
  scopeId: string;
  widthPx: number;
  displayContentsWrapper?: boolean;
  rightActionsWidthPx?: number;
}): MountedComposer {
  const viewport = document.createElement("div");
  viewport.style.width = `${input.widthPx}px`;
  viewport.style.padding = "0";
  viewport.style.boxSizing = "border-box";

  const wrapper = document.createElement("div");
  if (input.displayContentsWrapper) {
    wrapper.style.display = "contents";
  }

  const form = document.createElement("form");
  form.dataset.chatComposerForm = "true";
  form.dataset.chatPaneScope = input.scopeId;
  form.style.display = "block";
  form.style.width = "100%";
  form.style.boxSizing = "border-box";

  const footer = document.createElement("div");
  footer.dataset.chatComposerFooter = "true";
  footer.style.display = "flex";
  footer.style.columnGap = "8px";

  const leftControls = document.createElement("div");
  leftControls.style.flex = "1 1 auto";
  leftControls.style.minWidth = "0";

  const rightActions = document.createElement("div");
  rightActions.dataset.chatComposerActions = "right";
  rightActions.style.width = `${input.rightActionsWidthPx ?? 48}px`;
  rightActions.style.height = "20px";
  rightActions.style.flex = `0 0 ${input.rightActionsWidthPx ?? 48}px`;

  footer.append(leftControls, rightActions);
  form.append(footer);
  wrapper.append(form);
  viewport.append(wrapper);
  document.body.append(viewport);

  return { viewport };
}

describe("canComposerHandlePanelWidth", () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    vi.restoreAllMocks();
  });

  it("measures through display: contents composer wrappers", () => {
    const composer = mountComposer({
      scopeId: SINGLE_CHAT_PANE_SCOPE_ID,
      widthPx: 520,
      displayContentsWrapper: true,
    });

    const accepted = canComposerHandlePanelWidth({
      nextWidth: 420,
      applyWidth: (width) => {
        composer.viewport.style.width = `${width}px`;
      },
      resetWidth: () => {
        composer.viewport.style.width = "520px";
      },
    });

    expect(accepted).toBe(true);
    expect(composer.viewport.style.width).toBe("520px");
  });

  it("defaults to the single-chat composer when dock panes mount sidechat composers first", () => {
    const sidechatComposer = mountComposer({
      scopeId: dockSidechatPaneScopeId("pane-1"),
      widthPx: 520,
      rightActionsWidthPx: 520,
    });
    const singleComposer = mountComposer({
      scopeId: SINGLE_CHAT_PANE_SCOPE_ID,
      widthPx: 520,
      rightActionsWidthPx: 48,
    });

    const accepted = canComposerHandlePanelWidth({
      nextWidth: 360,
      applyWidth: (width) => {
        sidechatComposer.viewport.style.width = `${width}px`;
        singleComposer.viewport.style.width = `${width}px`;
      },
      resetWidth: () => {
        sidechatComposer.viewport.style.width = "520px";
        singleComposer.viewport.style.width = "520px";
      },
    });

    expect(accepted).toBe(true);
    expect(sidechatComposer.viewport.style.width).toBe("520px");
    expect(singleComposer.viewport.style.width).toBe("520px");
  });
});

describe("createPanelResizeSession", () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    vi.restoreAllMocks();
  });

  it("restores the exact prior document styles once when the window loses focus", () => {
    document.body.style.cursor = "crosshair";
    document.body.style.userSelect = "text";
    const onFinish = vi.fn();
    const session = createPanelResizeSession({ cursor: "col-resize", onFinish });

    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");

    window.dispatchEvent(new Event("blur"));
    session.finish("commit");

    expect(document.body.style.cursor).toBe("crosshair");
    expect(document.body.style.userSelect).toBe("text");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith("cancel");
  });

  it("cancels when the document becomes hidden", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const onFinish = vi.fn();
    createPanelResizeSession({ cursor: "row-resize", onFinish });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
    expect(onFinish).toHaveBeenCalledWith("cancel");
  });

  it("cancels the previous document owner before a different resize starts", () => {
    const firstFinish = vi.fn();
    const secondFinish = vi.fn();
    const firstSession = createPanelResizeSession({
      cursor: "col-resize",
      onFinish: firstFinish,
    });

    const secondSession = createPanelResizeSession({
      cursor: "row-resize",
      onFinish: secondFinish,
    });

    expect(firstFinish).toHaveBeenCalledTimes(1);
    expect(firstFinish).toHaveBeenCalledWith("cancel");
    expect(document.body.style.cursor).toBe("row-resize");
    expect(document.body.style.userSelect).toBe("none");

    firstSession.finish("commit");
    secondSession.finish("commit");

    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
    expect(secondFinish).toHaveBeenCalledTimes(1);
  });

  it("lets Escape cancel the active resize without leaving text selection disabled", () => {
    const onFinish = vi.fn();
    createPanelResizeSession({ cursor: "col-resize", onFinish });
    const escape = new KeyboardEvent("keydown", { cancelable: true, key: "Escape" });

    window.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
    expect(onFinish).toHaveBeenCalledWith("cancel");
  });
});

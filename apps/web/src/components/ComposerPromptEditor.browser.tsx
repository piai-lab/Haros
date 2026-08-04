// FILE: ComposerPromptEditor.browser.tsx
// Purpose: Real-editor IME regression proof for the shared Agent | Chat Composer.

import "../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";

import { ComposerPromptEditor } from "./ComposerPromptEditor";

describe("ComposerPromptEditor IME boundary", () => {
  afterEach(async () => cleanup());

  it("does not treat Enter during CJK composition as a command", async () => {
    const onCommandKeyDown = vi.fn(() => true);
    await render(
      <ComposerPromptEditor
        value="输入中"
        cursor={3}
        terminalContexts={[]}
        disabled={false}
        placeholder="输入消息"
        onRemoveTerminalContext={vi.fn()}
        onChange={vi.fn()}
        onCommandKeyDown={onCommandKeyDown}
        onPaste={vi.fn()}
      />,
    );

    const editor = document.querySelector<HTMLElement>('[data-testid="composer-editor"]');
    expect(editor).toBeTruthy();
    editor!.focus();
    editor!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        keyCode: 229,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onCommandKeyDown).not.toHaveBeenCalled();

    editor!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    await vi.waitFor(() =>
      expect(onCommandKeyDown).toHaveBeenCalledWith("Enter", expect.anything()),
    );
  });
});

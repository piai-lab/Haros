import * as FS from "node:fs";
import * as Path from "node:path";
import * as VM from "node:vm";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const mainSourcePath = Path.join(import.meta.dirname, "main.ts");
const mainSource = FS.readFileSync(mainSourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  mainSourcePath,
  mainSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function functionSource(name: string): string {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      return statement.getText(sourceFile);
    }
  }
  throw new Error(`Missing ${name} in Desktop Main.`);
}

function loadForegroundPolicy() {
  const source = [
    functionSource("isMainWindowForeground"),
    functionSource("shouldSuppressDesktopNotification"),
  ].join("\n");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return VM.runInNewContext(
    `${javascript}; ({ isMainWindowForeground, shouldSuppressDesktopNotification })`,
  ) as {
    isMainWindowForeground: (window: unknown) => boolean;
    shouldSuppressDesktopNotification: (policy: boolean, window: unknown) => boolean;
  };
}

function loadNotificationBoundary(window: ReturnType<typeof windowState>) {
  const source = [
    functionSource("isMainWindowForeground"),
    functionSource("shouldSuppressDesktopNotification"),
    functionSource("showDesktopNotification"),
  ].join("\n");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const shownNotifications: Array<Record<string, unknown>> = [];
  class FakeNotification {
    static isSupported() {
      return true;
    }

    constructor(readonly options: Record<string, unknown>) {}

    on() {}

    show() {
      shownNotifications.push(this.options);
    }
  }
  const showDesktopNotification = VM.runInNewContext(`${javascript}; showDesktopNotification`, {
    IPC: { menuAction: "menu-action" },
    Notification: FakeNotification,
    clearUnreadNotificationBadge() {},
    focusMainWindow() {},
    incrementUnreadNotificationBadge() {},
    mainWindow: window,
    resolveNotificationIconPath: () => null,
  }) as (input: { title: string; suppressWhenForeground?: boolean }) => boolean;
  return { showDesktopNotification, shownNotifications };
}

function windowState(input: { visible: boolean; minimized: boolean; focused: boolean }) {
  return {
    isDestroyed: () => false,
    isVisible: () => input.visible,
    isMinimized: () => input.minimized,
    isFocused: () => input.focused,
  };
}

describe("Desktop notification foreground boundary", () => {
  it("suppresses a background-only request from a focused BrowserWindow, including native guest focus", () => {
    const policy = loadForegroundPolicy();
    const focusedWindow = windowState({ visible: true, minimized: false, focused: true });
    expect(policy.isMainWindowForeground(focusedWindow)).toBe(true);
    expect(policy.shouldSuppressDesktopNotification(true, focusedWindow)).toBe(true);

    const boundary = loadNotificationBoundary(focusedWindow);
    expect(
      boundary.showDesktopNotification({ title: "Finished", suppressWhenForeground: true }),
    ).toBe(false);
    expect(boundary.shownNotifications).toHaveLength(0);
  });

  it("allows the request only when Desktop Main observes a background window", () => {
    const policy = loadForegroundPolicy();
    for (const backgroundWindow of [
      windowState({ visible: false, minimized: false, focused: false }),
      windowState({ visible: true, minimized: true, focused: false }),
      windowState({ visible: true, minimized: false, focused: false }),
    ]) {
      expect(policy.isMainWindowForeground(backgroundWindow)).toBe(false);
      expect(policy.shouldSuppressDesktopNotification(true, backgroundWindow)).toBe(false);

      const boundary = loadNotificationBoundary(backgroundWindow);
      expect(
        boundary.showDesktopNotification({ title: "Finished", suppressWhenForeground: true }),
      ).toBe(true);
      expect(boundary.shownNotifications).toEqual([{ body: "", silent: false, title: "Finished" }]);
    }
  });

  it("enforces suppression before constructing an OS Notification", () => {
    const showSource = functionSource("showDesktopNotification");
    expect(showSource.indexOf("shouldSuppressDesktopNotification")).toBeGreaterThan(-1);
    expect(showSource.indexOf("new Notification")).toBeGreaterThan(
      showSource.indexOf("shouldSuppressDesktopNotification"),
    );
    expect(showSource).not.toContain("rendererForeground");
  });
});

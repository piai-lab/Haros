import { describe, expect, it } from "vitest";

import { WINDOWS_COMPUTER_ROOT } from "@harnessos/shared/path";

import {
  expandProjectHomePath,
  getFolderBrowserParentPath,
  isFilesystemBrowseQuery,
  joinProjectPath,
  toFolderBrowserBrowsePath,
  toFolderBrowserSelectPath,
} from "./projectPaths";

describe("joinProjectPath", () => {
  it.each([
    ["/Users/test/Developer/", "codex", "/Users/test/Developer/codex"],
    ["/", "codex", "/codex"],
    ["C:\\Users\\test\\", "codex", "C:\\Users\\test\\codex"],
    ["C:\\", "codex", "C:\\codex"],
  ])("joins %s and %s", (parent, child, expected) => {
    expect(joinProjectPath(parent, child)).toBe(expected);
  });
});

describe("expandProjectHomePath", () => {
  it.each([
    ["~", "/Users/test", "/Users/test"],
    ["~/Developer", "/Users/test", "/Users/test/Developer"],
    ["~\\Developer", "C:\\Users\\test", "C:\\Users\\test\\Developer"],
    ["/srv/repos", "/Users/test", "/srv/repos"],
    ["~/Developer", null, "~/Developer"],
  ])("expands %s against %s", (value, homeDir, expected) => {
    expect(expandProjectHomePath(value, homeDir)).toBe(expected);
  });
});

describe("folder browser drive navigation", () => {
  it("goes from a Windows drive root to This PC", () => {
    expect(getFolderBrowserParentPath("C:\\")).toBe(WINDOWS_COMPUTER_ROOT);
    expect(getFolderBrowserParentPath("C:/")).toBe(WINDOWS_COMPUTER_ROOT);
    expect(getFolderBrowserParentPath("C:")).toBe(WINDOWS_COMPUTER_ROOT);
  });

  it("stops at This PC", () => {
    expect(getFolderBrowserParentPath(WINDOWS_COMPUTER_ROOT)).toBeNull();
  });

  it("keeps ordinary parent folders on the same drive", () => {
    expect(getFolderBrowserParentPath("C:\\Users\\YmY16")).toBe("C:\\Users\\");
  });

  it("does not invent a computer root on POSIX", () => {
    expect(getFolderBrowserParentPath("/")).toBeNull();
    expect(getFolderBrowserParentPath("/Users")).toBe("/");
  });

  it("normalizes browse and select paths for drives and This PC", () => {
    expect(toFolderBrowserBrowsePath(WINDOWS_COMPUTER_ROOT)).toBe(WINDOWS_COMPUTER_ROOT);
    expect(toFolderBrowserBrowsePath("C:")).toBe("C:\\");
    expect(toFolderBrowserBrowsePath("C:\\")).toBe("C:\\");
    expect(toFolderBrowserBrowsePath("C:\\Users\\YmY16")).toBe("C:\\Users\\YmY16\\");
    expect(toFolderBrowserSelectPath(WINDOWS_COMPUTER_ROOT)).toBeNull();
    expect(toFolderBrowserSelectPath("C:\\")).toBe("C:\\");
    expect(toFolderBrowserSelectPath("C:\\Users\\YmY16\\")).toBe("C:\\Users\\YmY16");
  });
});

describe("isFilesystemBrowseQuery", () => {
  it("recognizes a Windows-style home path on Windows", () => {
    expect(isFilesystemBrowseQuery("~\\Developer", "Win32")).toBe(true);
  });

  it("does not treat a Windows-style home path as a browse query on macOS", () => {
    expect(isFilesystemBrowseQuery("~\\Developer", "MacIntel")).toBe(false);
  });
});

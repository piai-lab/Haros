// FILE: workspaceExplorer.browser.tsx
// Purpose: Browser regressions for unified workspace filename/content search.
// Layer: Focused component integration tests

import "../../index.css";

import type { NativeApi, ProjectSearchContentInput } from "@harnessos/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

const harness = vi.hoisted((): { settings: { localePreference: "en" | "zh-CN" } } => ({
  settings: { localePreference: "en" },
}));

vi.mock("~/localPreferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/localPreferences")>()),
  useLocalPreferences: () => ({ preferences: harness.settings }),
}));

import { I18nProvider } from "~/i18n";
import type { ChatFileReference } from "~/lib/chatReferences";
import { projectQueryKeys } from "~/lib/projectReactQuery";
import { WorkspaceSearchSidebar } from "./workspaceExplorer";

function installNativeApi(api: NativeApi): () => void {
  const previousDescriptor = Object.getOwnPropertyDescriptor(window, "nativeApi");
  Object.defineProperty(window, "nativeApi", {
    configurable: true,
    value: api,
  });
  return () => {
    if (previousDescriptor) Object.defineProperty(window, "nativeApi", previousDescriptor);
    else Reflect.deleteProperty(window, "nativeApi");
  };
}

function makeNativeApi(overrides?: {
  searchEntries?: NativeApi["projects"]["searchEntries"];
  searchContent?: NativeApi["projects"]["searchContent"];
  showContextMenu?: NativeApi["contextMenu"]["show"];
}): NativeApi {
  return {
    contextMenu: {
      show: overrides?.showContextMenu ?? vi.fn(async () => null),
    },
    projects: {
      searchEntries:
        overrides?.searchEntries ??
        vi.fn(async ({ query }) => ({
          entries: query ? [{ path: `src/${query}.ts`, kind: "file" as const }] : [],
          truncated: false,
        })),
      searchContent:
        overrides?.searchContent ??
        vi.fn(async (input: ProjectSearchContentInput) => ({
          matches: [
            {
              path: "src/content.ts",
              lineNumber: 7,
              lineText: `const value = "${input.query}";`,
            },
          ],
          truncated: false,
        })),
      readFile: vi.fn(async ({ relativePath }) => ({
        relativePath,
        contents: "",
        truncated: false,
        version: null,
        encoding: null,
        lineEnding: null,
      })),
    },
  } as unknown as NativeApi;
}

function SearchHarness(props: {
  onSelectFile: (path: string) => void;
  onSelectDirectory?: (path: string) => void;
  onReferenceInChat?: (reference: ChatFileReference) => void;
  queryClient?: QueryClient;
}) {
  const [query, setQuery] = useState("");
  const [ownedQueryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const queryClient = props.queryClient ?? ownedQueryClient;
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <WorkspaceSearchSidebar
          workspaceRoot="/repo"
          query={query}
          onQueryChange={setQuery}
          selectedFilePath={null}
          onSelectFile={props.onSelectFile}
          onSelectDirectory={props.onSelectDirectory ?? vi.fn()}
          onReferenceInChat={props.onReferenceInChat}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  Reflect.deleteProperty(window, "nativeApi");
  harness.settings.localePreference = "en";
});

describe("workspace search", () => {
  it("keeps the localized reference action keyboard-accessible on existing rows", async () => {
    harness.settings.localePreference = "zh-CN";
    const showContextMenu = vi.fn(async () => "reference-in-chat");
    const restoreApi = installNativeApi(
      makeNativeApi({
        showContextMenu: showContextMenu as unknown as NativeApi["contextMenu"]["show"],
      }),
    );
    const onReferenceInChat = vi.fn();
    try {
      await render(<SearchHarness onSelectFile={vi.fn()} onReferenceInChat={onReferenceInChat} />);
      const input = page.getByRole("textbox", { name: "搜索工作区" });
      await userEvent.type(input, "needle");
      await vi.waitFor(() =>
        expect(document.querySelector('[title="src/needle.ts"]')).not.toBeNull(),
      );
      const row = document.querySelector<HTMLButtonElement>('[title="src/needle.ts"]')!;
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
        left: 24,
        right: 184,
        top: 40,
        bottom: 68,
        width: 160,
        height: 28,
        x: 24,
        y: 40,
        toJSON: () => ({}),
      });
      row.focus();

      row.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 0,
          clientY: 0,
        }),
      );

      await vi.waitFor(() => expect(showContextMenu).toHaveBeenCalledOnce());
      expect(showContextMenu).toHaveBeenCalledWith(
        [
          { id: "reference-in-chat", label: "在 Chat 中引用" },
          { id: "copy-path", label: "复制路径" },
        ],
        { x: 36, y: 68 },
      );
      await vi.waitFor(() =>
        expect(onReferenceInChat).toHaveBeenCalledWith({ path: "src/needle.ts" }),
      );
      expect(document.activeElement).toBe(row);
    } finally {
      restoreApi();
    }
  });

  it("renders one filename/content list and preserves keyboard focus semantics", async () => {
    const restoreApi = installNativeApi(makeNativeApi());
    const onSelectFile = vi.fn();
    try {
      await render(<SearchHarness onSelectFile={onSelectFile} />);
      const input = page.getByRole("textbox", { name: "Search workspace" });
      await userEvent.type(input, "needle");

      await vi.waitFor(() => {
        const rows = [...document.querySelectorAll<HTMLElement>("[data-explorer-row]")];
        expect(rows.map((row) => row.title)).toEqual(["src/needle.ts", "src/content.ts:7"]);
      });
      expect(
        page.getByRole("button", {
          name: 'src/content.ts, line 7: const value = "needle";',
        }),
      ).toBeInTheDocument();

      input.element().focus();
      await userEvent.keyboard("{ArrowDown}");
      expect(document.activeElement?.getAttribute("title")).toBe("src/needle.ts");
      await userEvent.keyboard("{End}");
      expect(document.activeElement?.getAttribute("title")).toBe("src/content.ts:7");
      await userEvent.keyboard("{Home}");
      expect(document.activeElement?.getAttribute("title")).toBe("src/needle.ts");
      await userEvent.keyboard("{End} ");
      expect(onSelectFile).toHaveBeenCalledWith("src/content.ts");

      input.element().focus();
      await userEvent.keyboard("{Enter}");
      expect(onSelectFile).toHaveBeenCalledWith("src/needle.ts");

      input.element().focus();
      await userEvent.keyboard("{Escape}");
      expect(input).toHaveValue("");
      expect(document.activeElement).toBe(input.element());
    } finally {
      restoreApi();
    }
  });

  it("routes directory matches to explorer reveal instead of opening them as files", async () => {
    const restoreApi = installNativeApi(
      makeNativeApi({
        searchEntries: vi.fn(async () => ({
          entries: [{ path: "src/components", kind: "directory" as const }],
          truncated: false,
        })),
        searchContent: vi.fn(async () => ({ matches: [], truncated: false })),
      }),
    );
    const onSelectFile = vi.fn();
    const onSelectDirectory = vi.fn();
    try {
      await render(
        <SearchHarness
          onSelectFile={onSelectFile}
          onSelectDirectory={onSelectDirectory}
        />,
      );
      const input = page.getByRole("textbox", { name: "Search workspace" });
      await userEvent.type(input, "components");
      await vi.waitFor(() =>
        expect(document.querySelector('[title="src/components"]')).not.toBeNull(),
      );

      await page.getByTitle("src/components").click();
      expect(onSelectDirectory).toHaveBeenCalledWith("src/components");
      expect(onSelectFile).not.toHaveBeenCalled();
    } finally {
      restoreApi();
    }
  });

  it("aborts an obsolete content request and never projects its late result", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveFirst:
      | ((value: {
          matches: Array<{
            path: string;
            lineNumber: number;
            lineText: string;
          }>;
          truncated: false;
        }) => void)
      | undefined;
    const searchContent = vi.fn(
      (input: ProjectSearchContentInput, options?: { readonly signal?: AbortSignal }) => {
        if (input.query === "first") {
          firstSignal = options?.signal;
          return new Promise<{
            matches: Array<{
              path: string;
              lineNumber: number;
              lineText: string;
            }>;
            truncated: false;
          }>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve({
          matches: [
            {
              path: "src/current.ts",
              lineNumber: 3,
              lineText: "second current result",
            },
          ],
          truncated: false,
        });
      },
    );
    const restoreApi = installNativeApi(makeNativeApi({ searchContent }));
    try {
      await render(<SearchHarness onSelectFile={vi.fn()} />);
      const input = page.getByRole("textbox", { name: "Search workspace" });
      await userEvent.type(input, "first");
      await vi.waitFor(() => expect(searchContent).toHaveBeenCalledTimes(1));
      expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();

      await userEvent.clear(input);
      await userEvent.type(input, "second");
      await vi.waitFor(() => expect(firstSignal?.aborted).toBe(true));
      await vi.waitFor(() => expect(document.body.textContent).toContain("second current result"));

      resolveFirst?.({
        matches: [
          {
            path: "src/stale.ts",
            lineNumber: 1,
            lineText: "first stale result",
          },
        ],
        truncated: false,
      });
      await Promise.resolve();
      expect(document.body.textContent).not.toContain("first stale result");
    } finally {
      restoreApi();
    }
  });

  it("keeps cached rows non-activatable while their current query is refetching", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let contentCalls = 0;
    let resolveRefresh:
      | ((value: {
          matches: Array<{
            path: string;
            lineNumber: number;
            lineText: string;
          }>;
          truncated: false;
        }) => void)
      | undefined;
    const searchContent = vi.fn(() => {
      contentCalls += 1;
      if (contentCalls === 1) {
        return Promise.resolve({
          matches: [
            {
              path: "src/old.ts",
              lineNumber: 1,
              lineText: "old cached result",
            },
          ],
          truncated: false as const,
        });
      }
      return new Promise<{
        matches: Array<{ path: string; lineNumber: number; lineText: string }>;
        truncated: false;
      }>((resolve) => {
        resolveRefresh = resolve;
      });
    });
    const restoreApi = installNativeApi(
      makeNativeApi({
        searchEntries: vi.fn(async () => ({ entries: [], truncated: false })),
        searchContent,
      }),
    );
    const onSelectFile = vi.fn();
    try {
      await render(<SearchHarness queryClient={queryClient} onSelectFile={onSelectFile} />);
      const input = page.getByRole("textbox", { name: "Search workspace" });
      await userEvent.type(input, "refresh");
      await vi.waitFor(() => expect(document.body.textContent).toContain("old cached result"));

      const invalidation = queryClient.invalidateQueries({
        queryKey: projectQueryKeys.searchContent("/repo", "refresh", 80),
      });
      await vi.waitFor(() => expect(searchContent).toHaveBeenCalledTimes(2));
      await vi.waitFor(() => {
        expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(document.body.textContent).not.toContain("old cached result");
      });
      input.element().focus();
      await userEvent.keyboard("{Enter}");
      expect(onSelectFile).not.toHaveBeenCalled();

      resolveRefresh?.({
        matches: [{ path: "src/new.ts", lineNumber: 2, lineText: "new current result" }],
        truncated: false,
      });
      await invalidation;
      await vi.waitFor(() => expect(document.body.textContent).toContain("new current result"));
      input.element().focus();
      await userEvent.keyboard("{Enter}");
      expect(onSelectFile).toHaveBeenCalledWith("src/new.ts");
    } finally {
      restoreApi();
      queryClient.clear();
    }
  });

  it("keeps one-character filename search, starts content at two characters, and preserves IME focus", async () => {
    const searchEntries = vi.fn(async () => ({
      entries: [],
      truncated: false,
    }));
    const searchContent = vi.fn(async () => ({
      matches: [],
      truncated: false,
    }));
    const restoreApi = installNativeApi(makeNativeApi({ searchEntries, searchContent }));
    try {
      await render(<SearchHarness onSelectFile={vi.fn()} />);
      const input = page.getByRole("textbox", { name: "Search workspace" });
      const element = input.element();
      element.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true, data: "内" }),
      );
      await userEvent.type(input, "内");
      await vi.waitFor(() => expect(searchEntries).toHaveBeenCalledTimes(1));
      expect(searchContent).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(element);

      await userEvent.type(input, "容");
      element.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "内容" }),
      );
      await vi.waitFor(() => expect(searchContent).toHaveBeenCalledTimes(1));
      expect(document.activeElement).toBe(element);
    } finally {
      restoreApi();
    }
  });

  it("renders incomplete and error states instead of misreporting them as empty", async () => {
    const emptyEntries = vi.fn(async () => ({ entries: [], truncated: false }));
    const incompleteContent = vi.fn(async () => ({
      matches: [],
      truncated: true,
    }));
    let restoreApi = installNativeApi(
      makeNativeApi({
        searchEntries: emptyEntries,
        searchContent: incompleteContent,
      }),
    );
    try {
      await render(<SearchHarness onSelectFile={vi.fn()} />);
      await userEvent.type(page.getByRole("textbox", { name: "Search workspace" }), "none");
      await vi.waitFor(() =>
        expect(document.body.textContent).toContain(
          "Search results are incomplete. Refine your search to narrow them down.",
        ),
      );
      expect(document.body.textContent).toContain("No matching files or contents.");
      expect(page.getByRole("status")).toHaveTextContent("0 search results");
    } finally {
      restoreApi();
    }

    document.body.innerHTML = "";
    const onSelectFile = vi.fn();
    restoreApi = installNativeApi(
      makeNativeApi({
        searchEntries: emptyEntries,
        searchContent: vi.fn(async () => {
          throw new Error("search failed");
        }),
      }),
    );
    try {
      await render(<SearchHarness onSelectFile={onSelectFile} />);
      const input = page.getByRole("textbox", { name: "Search workspace" });
      await userEvent.type(input, "error");
      await vi.waitFor(() =>
        expect(document.body.textContent).toContain("Could not search the workspace."),
      );
      expect(document.body.textContent).not.toContain("No matching files or contents.");
      await userEvent.keyboard("{Enter}");
      expect(onSelectFile).not.toHaveBeenCalled();
    } finally {
      restoreApi();
    }
  });

  it("keeps localized snippets and sidebar geometry bounded at 480, 960, and 1440", async () => {
    harness.settings.localePreference = "zh-CN";
    const restoreApi = installNativeApi(makeNativeApi());
    try {
      await page.viewport(480, 620);
      await render(<SearchHarness onSelectFile={vi.fn()} />);
      const input = page.getByRole("textbox", { name: "搜索工作区" });
      await userEvent.type(input, "内容needle");
      await vi.waitFor(() => expect(document.body.textContent).toContain("第 7 行"));

      for (const [width, expectedSidebarWidth] of [
        [480, 480],
        [960, 960],
        [1440, 224],
      ] as const) {
        await page.viewport(width, 720);
        const sidebar = document.querySelector("aside");
        expect(sidebar).not.toBeNull();
        expect(sidebar!.getBoundingClientRect().width).toBeCloseTo(expectedSidebarWidth, 0);
        expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);
      }
    } finally {
      restoreApi();
    }
  });
});

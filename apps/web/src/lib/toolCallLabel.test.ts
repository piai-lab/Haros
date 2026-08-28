import { describe, expect, it } from "vitest";
import {
  deriveFriendlyCommandTarget,
  deriveInlineCommandCall,
  deriveReadableCommandDisplay,
  deriveReadableToolTitle,
  deriveOmniMindMcpToolTitle,
  extractWebFetchUrl,
  isInspectCommand,
  isOmniMindBrowserToolCall,
  normalizeCompactToolLabel,
  resolveCommandVisualKind,
  sanitizeOmniMindMcpToolPreview,
} from "./toolCallLabel";

describe("extractWebFetchUrl", () => {
  it("pulls the url out of a WebFetch argument summary", () => {
    expect(
      extractWebFetchUrl({
        toolName: "WebFetch",
        detail: 'WebFetch: {"url":"https://ui.shadcn.com/docs/components","prompt":"List EVER..."}',
      }),
    ).toBe("https://ui.shadcn.com/docs/components");
  });

  it("recognizes alternate fetch tool names and the uri field", () => {
    expect(
      extractWebFetchUrl({
        toolName: "web_fetch",
        detail: '{"uri":"https://example.com/path"}',
      }),
    ).toBe("https://example.com/path");
  });

  it("falls back to a bare URL token when there is no json field", () => {
    expect(extractWebFetchUrl({ toolName: "fetch", detail: "Fetching https://example.com." })).toBe(
      "https://example.com",
    );
  });

  it("ignores non-fetch tools", () => {
    expect(
      extractWebFetchUrl({ toolName: "Read", detail: '{"url":"https://example.com"}' }),
    ).toBeNull();
  });

  it("ignores non-http(s) and missing urls", () => {
    expect(
      extractWebFetchUrl({ toolName: "WebFetch", detail: '{"url":"ftp://example.com"}' }),
    ).toBeNull();
    expect(extractWebFetchUrl({ toolName: "WebFetch", detail: '{"prompt":"hi"}' })).toBeNull();
    expect(extractWebFetchUrl({ toolName: "WebFetch", detail: undefined })).toBeNull();
  });
});

describe("normalizeCompactToolLabel", () => {
  it("removes trailing completion wording", () => {
    expect(normalizeCompactToolLabel("Tool call completed")).toBe("Tool call");
    expect(normalizeCompactToolLabel("Ran command done")).toBe("Ran command");
    expect(normalizeCompactToolLabel("Ran command started")).toBe("Ran command");
  });
});

describe("deriveOmniMindMcpToolTitle", () => {
  it("uses stable action-first names for OmniMind browser tools", () => {
    for (const status of ["running", "completed", "failed"] as const) {
      expect(
        deriveOmniMindMcpToolTitle({
          toolName: "mcp__harnessos__browser_open",
          status,
        }),
      ).toBe("Open browser tab");
    }

    expect(
      deriveOmniMindMcpToolTitle({
        title: "OmniMind: Browser Snapshot",
        status: "completed",
      }),
    ).toBe("Snapshot browser page");
  });

  it("has intentional running and completed copy for every OmniMind gateway action", () => {
    const cases = [
      ["harnessos_context", "OmniMind is checking its context", "OmniMind checked its context"],
      [
        "harnessos_capabilities",
        "OmniMind is checking available agents",
        "OmniMind checked available agents",
      ],
      ["harnessos_list_projects", "OmniMind is listing projects", "OmniMind listed projects"],
      ["harnessos_list_threads", "OmniMind is listing threads", "OmniMind listed threads"],
      ["harnessos_read_thread", "OmniMind is reading a thread", "OmniMind read a thread"],
      [
        "harnessos_read_thread_activity",
        "OmniMind is reading thread activity",
        "OmniMind read thread activity",
      ],
      [
        "harnessos_read_thread_events",
        "OmniMind is reading thread events",
        "OmniMind read thread events",
      ],
      [
        "harnessos_read_thread_runtime_events",
        "OmniMind is reading thread runtime events",
        "OmniMind read thread runtime events",
      ],
      [
        "harnessos_diagnose_thread",
        "OmniMind is diagnosing a thread",
        "OmniMind diagnosed a thread",
      ],
      ["harnessos_create_thread", "OmniMind is creating a thread", "OmniMind created a thread"],
      ["harnessos_create_threads", "OmniMind is creating threads", "OmniMind created threads"],
      [
        "harnessos_wait_for_threads",
        "OmniMind is waiting for threads",
        "OmniMind finished waiting for threads",
      ],
      ["harnessos_send_message", "OmniMind is sending a message", "OmniMind sent a message"],
      [
        "harnessos_interrupt_thread",
        "OmniMind is interrupting a thread",
        "OmniMind interrupted a thread",
      ],
      ["harnessos_set_thread_title", "OmniMind is renaming a thread", "OmniMind renamed a thread"],
      [
        "harnessos_set_thread_archived",
        "OmniMind is updating a thread",
        "OmniMind updated a thread",
      ],
      [
        "harnessos_create_automation",
        "OmniMind is creating an automation",
        "OmniMind created an automation",
      ],
      [
        "harnessos_list_automations",
        "OmniMind is listing automations",
        "OmniMind listed automations",
      ],
      [
        "harnessos_cancel_automation",
        "OmniMind is stopping an automation",
        "OmniMind stopped an automation",
      ],
      ["harnessos_overview", "OmniMind is gathering an overview", "OmniMind gathered an overview"],
      [
        "harnessos_list_allowed_projects",
        "OmniMind is listing allowed projects",
        "OmniMind listed allowed projects",
      ],
      ["harnessos_create_task", "OmniMind is creating a task", "OmniMind created a task"],
      [
        "harnessos_wait_for_task",
        "OmniMind is waiting for a task",
        "OmniMind finished waiting for a task",
      ],
      ["harnessos_read_task", "OmniMind is reading a task", "OmniMind read a task"],
    ] as const;

    for (const [toolName, running, completed] of cases) {
      expect(deriveOmniMindMcpToolTitle({ toolName, status: "running" })).toBe(running);
      expect(deriveOmniMindMcpToolTitle({ toolName, status: "completed" })).toBe(completed);
    }

    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "harnessos_create_threads",
        status: "failed",
      }),
    ).toBe("OmniMind couldn't create threads");
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "harnessos_create_thread",
        status: "cancelled",
      }),
    ).toBe("OmniMind stopped creating a thread");
  });

  it("turns provider-specific create-thread identifiers into activity sentences", () => {
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "OmniMind__harnessos_create_thread",
        status: "running",
      }),
    ).toBe("OmniMind is creating a thread");
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "mcp__harnessos__harnessos_create_thread",
        status: "completed",
      }),
    ).toBe("OmniMind created a thread");
  });

  it("recognizes bare and already-humanized OmniMind tool names", () => {
    expect(
      deriveOmniMindMcpToolTitle({ toolName: "harnessos_send_message", status: "running" }),
    ).toBe("OmniMind is sending a message");
    expect(
      deriveOmniMindMcpToolTitle({ title: "OmniMind: OmniMind List Threads", status: "completed" }),
    ).toBe("OmniMind listed threads");
  });

  it("ignores tools from other MCP servers", () => {
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "mcp__codex_apps__github_fetch_pr",
        status: "running",
      }),
    ).toBeNull();
  });

  it("keeps future OmniMind actions branded without exposing raw identifiers", () => {
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "mcp__harnessos__harnessos_delete_project",
        status: "running",
      }),
    ).toBe("OmniMind is handling delete project");
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "OmniMind__harnessos_delete_project",
        status: "completed",
      }),
    ).toBe("OmniMind handled delete project");
    expect(
      deriveOmniMindMcpToolTitle({
        toolName: "harnessos_is_handling_delete_project",
        status: "completed",
      }),
    ).toBe("OmniMind handled delete project");
  });

  it("does not reinterpret free text beginning with fallback status copy", () => {
    expect(
      deriveOmniMindMcpToolTitle({
        title: "OmniMind is handling delete project after recovery",
        status: "completed",
      }),
    ).toBeNull();
    expect(
      deriveOmniMindMcpToolTitle({
        title: "OmniMind handled delete project after recovery",
        status: "running",
      }),
    ).toBeNull();
    expect(
      deriveOmniMindMcpToolTitle({
        title: "OmniMind couldn't handle delete project after recovery",
        status: "failed",
      }),
    ).toBeNull();
  });

  it("leaves free-text activity summaries starting with OmniMind untouched", () => {
    expect(
      deriveOmniMindMcpToolTitle({
        title: "OmniMind recovered a stale running state",
        status: "completed",
      }),
    ).toBeNull();
    expect(
      deriveOmniMindMcpToolTitle({
        fallbackLabel: "OmniMind restarted the provider session",
        status: "running",
      }),
    ).toBeNull();
  });

  it("removes transport identifiers without hiding meaningful OmniMind details", () => {
    expect(
      sanitizeOmniMindMcpToolPreview({
        preview: "OmniMind__harnessos_create_threads",
        heading: "OmniMind created threads",
        status: "completed",
      }),
    ).toBeNull();
    expect(
      sanitizeOmniMindMcpToolPreview({
        preview: 'Unexpected key "reasoningEffort" for Claude Agent',
        heading: "OmniMind couldn't create threads",
        status: "failed",
      }),
    ).toBe('Unexpected key "reasoningEffort" for Claude Agent');
  });
});

describe("isOmniMindBrowserToolCall", () => {
  it("recognizes canonical presentation titles without a tool identifier", () => {
    expect(isOmniMindBrowserToolCall({ title: "Open browser tab" })).toBe(true);
    expect(isOmniMindBrowserToolCall({ fallbackLabel: "Snapshot browser page" })).toBe(true);
    expect(isOmniMindBrowserToolCall({ title: "OmniMind listed threads" })).toBe(false);
  });
});

describe("deriveReadableToolTitle", () => {
  it("humanizes search commands even when wrapped in shell -lc", () => {
    expect(
      deriveReadableToolTitle({
        title: "Ran command",
        fallbackLabel: "Ran command",
        itemType: "command_execution",
        requestKind: "command",
        command: `/bin/zsh -lc 'rg -n "tool call" apps/web/src'`,
      }),
    ).toBe("Searched");
  });

  it("humanizes file read commands", () => {
    expect(
      deriveReadableToolTitle({
        title: "Ran command",
        fallbackLabel: "Ran command",
        itemType: "command_execution",
        command: "sed -n '520,550p' apps/web/src/session-logic.ts",
      }),
    ).toBe("Read");
  });

  it("humanizes git status commands", () => {
    expect(
      deriveReadableToolTitle({
        title: "Ran command",
        fallbackLabel: "Ran command",
        itemType: "command_execution",
        command: "git status --short",
      }),
    ).toBe("Checked");
  });

  it("keeps explicit non-generic titles", () => {
    expect(
      deriveReadableToolTitle({
        title: "Bash",
        fallbackLabel: "Ran command",
        itemType: "command_execution",
        command: "echo hello",
      }),
    ).toBe("Bash");
  });

  it("turns provider tool identifiers into readable labels", () => {
    for (const [identifier, label] of [
      ["Web_search", "Web search"],
      ["Fetch_content", "Fetch content"],
      ["Get_search_content", "Get search content"],
      ["readLocalFile", "read Local File"],
    ] as const) {
      expect(
        deriveReadableToolTitle({
          title: identifier,
          fallbackLabel: identifier,
          itemType: "dynamic_tool_call",
        }),
      ).toBe(label);
    }
  });

  it("extracts a descriptor from payload when the title is generic", () => {
    expect(
      deriveReadableToolTitle({
        title: "Tool call",
        fallbackLabel: "Tool call",
        itemType: "dynamic_tool_call",
        payload: {
          data: {
            item: {
              toolName: "mcp__xcodebuildmcp__list_sims",
            },
          },
        },
      }),
    ).toBe("Xcodebuildmcp: List Sims");
  });

  it("treats Cursor placeholder titles as generic", () => {
    expect(
      deriveReadableToolTitle({
        title: "Find",
        fallbackLabel: "Find",
        itemType: "dynamic_tool_call",
        payload: { data: { kind: "search" } },
      }),
    ).toBe("Search");

    expect(
      deriveReadableToolTitle({
        title: "Read File",
        fallbackLabel: "Read File",
        itemType: "dynamic_tool_call",
        payload: { data: { kind: "read" } },
      }),
    ).toBe("Read");
  });

  it("formats MCP identifiers into readable tool names", () => {
    expect(
      deriveReadableToolTitle({
        title: "MCP tool call",
        fallbackLabel: "MCP tool call",
        itemType: "mcp_tool_call",
        payload: {
          data: {
            toolName: "mcp__codex_apps__github_fetch_pr",
          },
        },
      }),
    ).toBe("Codex Apps: Github Fetch Pr");
  });

  it("formats structured MCP server/tool payloads into readable tool names", () => {
    expect(
      deriveReadableToolTitle({
        title: "MCP tool call",
        fallbackLabel: "MCP tool call",
        itemType: "mcp_tool_call",
        payload: {
          data: {
            item: {
              type: "mcpToolCall",
              server: "computer-use",
              tool: "get_app_state",
            },
          },
        },
      }),
    ).toBe("Computer Use: Get App State");
  });
});

describe("deriveReadableCommandDisplay", () => {
  it("extracts search targets without leaking the full shell wrapper inline", () => {
    expect(deriveReadableCommandDisplay(`/bin/zsh -lc 'rg -n "tool call" apps/web/src'`)).toEqual({
      verb: "Searched",
      target: "for tool call in web/src",
      fullCommand: `/bin/zsh -lc 'rg -n "tool call" apps/web/src'`,
    });
  });

  it("compacts file paths for read commands", () => {
    expect(
      deriveReadableCommandDisplay(
        "sed -n '520,550p' apps/web/src/components/chat/MessagesTimeline.tsx",
      ),
    ).toEqual({
      verb: "Read",
      target: "chat/MessagesTimeline.tsx",
      fullCommand: "sed -n '520,550p' apps/web/src/components/chat/MessagesTimeline.tsx",
    });
  });

  it("unwraps zsh shell wrappers around read commands", () => {
    expect(
      deriveReadableCommandDisplay(
        `/bin/zsh -lc "sed -n '240,520p' src/components/provider-card.tsx"`,
      ),
    ).toEqual({
      verb: "Read",
      target: "components/provider-card.tsx",
      fullCommand: `/bin/zsh -lc "sed -n '240,520p' src/components/provider-card.tsx"`,
    });
  });

  it("keeps quoted paths intact when shell wrappers include cd chaining", () => {
    expect(
      deriveReadableCommandDisplay(
        `zsh -lc "cd '/tmp/my app' && sed -n '1,260p' src/pages/overview.tsx"`,
      ),
    ).toEqual({
      verb: "Read",
      target: "pages/overview.tsx",
      fullCommand: `zsh -lc "cd '/tmp/my app' && sed -n '1,260p' src/pages/overview.tsx"`,
    });
  });

  it("does not discard real chained commands after a shell wrapper", () => {
    expect(
      deriveReadableCommandDisplay(
        `/bin/zsh -lc 'rm -f /tmp/test.log && bun run --cwd apps/server test'`,
      ),
    ).toEqual({
      verb: "Removed",
      target: "/tmp/test.log",
      fullCommand: `/bin/zsh -lc 'rm -f /tmp/test.log && bun run --cwd apps/server test'`,
    });
  });

  it("removes env and timeout wrappers from inline command summaries", () => {
    expect(
      deriveReadableCommandDisplay(
        "env -u HARNESSOS_AUTH_TOKEN HARNESSOS_PORT_OFFSET=3158 timeout 180s bun run dev",
        true,
      ),
    ).toEqual({
      verb: "Running",
      target: "bun run dev",
      fullCommand:
        "env -u HARNESSOS_AUTH_TOKEN HARNESSOS_PORT_OFFSET=3158 timeout 180s bun run dev",
    });
  });

  it("summarizes inline script commands without leaking the script body", () => {
    expect(
      deriveReadableCommandDisplay(`node -e "const fs = require('fs'); console.log(fs.cwd)"`, true),
    ).toEqual({
      verb: "Running",
      target: "node script",
      fullCommand: `node -e "const fs = require('fs'); console.log(fs.cwd)"`,
    });

    expect(deriveReadableCommandDisplay("python3 - <<'PY'\nprint('hi')\nPY", true)).toEqual({
      verb: "Running",
      target: "python script",
      fullCommand: "python3 - <<'PY'\nprint('hi')\nPY",
    });
  });

  it("humanizes current-directory searches without leaking placeholder dots", () => {
    expect(deriveReadableCommandDisplay(`rg -n "model(s)?" .`)).toEqual({
      verb: "Searched",
      target: "for model(s)? in current directory",
      fullCommand: `rg -n "model(s)?" .`,
    });
  });

  it("falls back to a directory summary when the search token is only punctuation", () => {
    expect(deriveReadableCommandDisplay(`rg -n . src/lib`)).toEqual({
      verb: "Searched",
      target: "in src/lib",
      fullCommand: `rg -n . src/lib`,
    });
  });
});

describe("deriveFriendlyCommandTarget", () => {
  it("uses a friendly shell name instead of leaking the full wrapper command", () => {
    expect(
      deriveFriendlyCommandTarget(
        '"C:\\Users\\Example\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe" -Command "powershell -NoProfile -Command \\"1..8\\""',
      ),
    ).toBe("PowerShell");
  });

  it("reads as the object of the row's sentence", () => {
    expect(deriveFriendlyCommandTarget(`/bin/zsh -lc 'rg -n "tool call" apps/web/src'`)).toBe(
      "for tool call in web/src",
    );
  });

  it("keeps long targets short enough to sit inline", () => {
    const target = deriveFriendlyCommandTarget(`echo ${"a".repeat(200)}`);
    expect(target.length).toBeLessThanOrEqual(72);
    expect(target.endsWith("…")).toBe(true);
  });
});

describe("deriveInlineCommandCall", () => {
  it("shows the actual command call without the shell wrapper", () => {
    expect(deriveInlineCommandCall(`/bin/zsh -lc 'rg -n "tool call" apps/web/src'`)).toBe(
      `rg -n "tool call" apps/web/src`,
    );
  });
});

describe("isInspectCommand", () => {
  it("detects read-only inspection commands (read/search/find/list)", () => {
    expect(isInspectCommand("cat package.json")).toBe(true);
    expect(isInspectCommand("sed -n 1,40p src/app.ts")).toBe(true);
    expect(isInspectCommand("head -n 20 README.md")).toBe(true);
    expect(isInspectCommand(`rg -n "tool call" apps/web/src`)).toBe(true);
    expect(isInspectCommand("grep -R foo .")).toBe(true);
    expect(isInspectCommand("find . -name '*.ts'")).toBe(true);
    expect(isInspectCommand("ls -la src")).toBe(true);
    expect(isInspectCommand(`/bin/zsh -lc 'rg -n "x" src'`)).toBe(true);
  });

  it("does not treat mutating or executing commands as inspections", () => {
    expect(isInspectCommand("git status")).toBe(false);
    expect(isInspectCommand("node build.js")).toBe(false);
    expect(isInspectCommand("rm -rf dist")).toBe(false);
    expect(isInspectCommand("mkdir foo")).toBe(false);
  });
});

describe("resolveCommandVisualKind", () => {
  it("classifies git commands through shell and global-option wrappers", () => {
    expect(resolveCommandVisualKind("git status --short")).toBe("git");
    expect(resolveCommandVisualKind("git -C apps/web status --short")).toBe("git");
    expect(resolveCommandVisualKind(`/bin/zsh -lc "cd repo && git branch -vv"`)).toBe("git");
  });

  it("classifies GitHub CLI commands through env wrappers", () => {
    expect(resolveCommandVisualKind("gh pr view 274 --repo owner/repo")).toBe("github");
    expect(resolveCommandVisualKind("env -u GH_TOKEN gh pr status")).toBe("github");
    expect(resolveCommandVisualKind("hub pull-request -m test")).toBe("github");
  });

  it("keeps inspections and ordinary commands distinct", () => {
    expect(resolveCommandVisualKind(`rg -n "tool call" apps/web/src`)).toBe("inspect");
    expect(resolveCommandVisualKind("bun run build")).toBe("terminal");
  });
});

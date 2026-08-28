import type { EngineWebSurfaceThemeSnapshot } from "@harnessos/contracts";
import { describe, expect, it } from "vitest";
import {
  MERMAID_MAX_CONNECTORS,
  MERMAID_MAX_NONEMPTY_LINES,
  MermaidPresentationCache,
  createMermaidPresentationCacheKey,
  preflightMermaidSource,
} from "./mermaidPresentation";

const THEME: EngineWebSurfaceThemeSnapshot = {
  accent: "#2463eb",
  border: "#d1d5db",
  borderStrong: "#9ca3af",
  danger: "#dc2626",
  elevatedSurface: "#f3f4f6",
  hoverSurface: "#e5e7eb",
  primaryBackground: "#111827",
  primaryBackgroundHover: "#1f2937",
  primaryText: "#ffffff",
  secondaryBackground: "#eef2ff",
  secondaryBackgroundHover: "#e0e7ff",
  success: "#16a34a",
  surface: "#ffffff",
  surfaceUnder: "#f9fafb",
  text: "#111827",
  textDim: "#4b5563",
  textMuted: "#6b7280",
  warning: "#d97706",
};

describe("preflightMermaidSource", () => {
  it.each([
    ["flowchart", "flowchart LR\nA-->B"],
    ["graph", "graph TD\nA-->B"],
    ["sequence", "sequenceDiagram\nAlice->>Bob: Hello"],
    ["class", "classDiagram\nA <|-- B"],
    ["state", "stateDiagram-v2\n[*] --> Ready"],
    ["er", "erDiagram\nUSER ||--o{ ORDER : places"],
    ["mindmap", "mindmap\n  root((HarnessOS))"],
  ])("allows explicit %s diagrams", (_name, source) => {
    expect(preflightMermaidSource(source).ok).toBe(true);
  });

  it.each([
    "gantt\ntitle Work",
    "architecture-beta\ngroup api(cloud)[API]",
    "xychart-beta\nx-axis [1, 2]",
    "radar-beta\naxis a",
    "pie\nA: 1",
    "A-->B",
  ])("rejects unsupported diagram types before import", (source) => {
    expect(preflightMermaidSource(source)).toEqual({ ok: false, reason: "unsupported" });
  });

  it.each([
    "%%{init: {'theme': 'dark'}}%%\ngraph TD\nA-->B",
    "---\nconfig:\n  theme: dark\n---\ngraph TD\nA-->B",
    "graph TD\nclick A https://example.com",
    "graph TD\nA[href javascript:alert(1)]",
    "graph TD\nclassDef bad fill:url(//example.invalid/pixel)",
    "graph TD\nA[<img src=x>]",
    "graph TD\nA[<foreignObject>bad</foreignObject>]",
    "graph TD\nA[<span>bad</span>]",
  ])("rejects behavior, config and resource inputs before import", (source) => {
    expect(preflightMermaidSource(source)).toEqual({ ok: false, reason: "unsafe" });
  });

  it("allows ordinary labels, br tags and class styles inside the sandbox", () => {
    const source = "graph TD\nA[Hello<br>世界]-->B\nclassDef good fill:#fff,color:#111";
    expect(preflightMermaidSource(source).ok).toBe(true);
  });

  it("rejects line and every compressed connector family before import", () => {
    const long = [
      "graph TD",
      ...Array.from({ length: MERMAID_MAX_NONEMPTY_LINES }, () => "A"),
    ].join("\n");
    expect(preflightMermaidSource(long)).toEqual({ ok: false, reason: "budget" });
    for (const connector of [
      "-->",
      "---",
      "==>",
      "===",
      "-.->",
      "-.-",
      "~~~",
      "->>",
      "->",
      "<|--",
      "..|>",
      "..>",
      "..",
      "*--",
      "o--",
      "--o",
      "--x",
      "--",
    ]) {
      const compressed = `graph TD\n${`A${connector}B;`.repeat(MERMAID_MAX_CONNECTORS + 1)}`;
      expect(preflightMermaidSource(compressed), connector).toEqual({
        ok: false,
        reason: "budget",
      });
    }
  });
});

describe("Mermaid presentation cache", () => {
  it("uses source, projected theme and implementation versions in its SHA-256 key", async () => {
    const first = await createMermaidPresentationCacheKey("graph TD\nA-->B", THEME);
    const same = await createMermaidPresentationCacheKey("graph TD\nA-->B", { ...THEME });
    const changed = await createMermaidPresentationCacheKey("graph TD\nA-->C", THEME);
    const themed = await createMermaidPresentationCacheKey("graph TD\nA-->B", {
      ...THEME,
      accent: "#ff0000",
    });
    expect(first).toMatch(/^[a-f\d]{64}$/);
    expect(same).toBe(first);
    expect(changed).not.toBe(first);
    expect(themed).not.toBe(first);
  });

  it("evicts least-recently-used entries by count and bytes", () => {
    const cache = new MermaidPresentationCache(2, 10);
    const fallback = { kind: "fallback", reason: "invalid", retryable: true } as const;
    cache.set("a", fallback);
    cache.set("b", fallback);
    expect(cache.get("a")).toEqual(fallback);
    cache.set("c", fallback);
    expect(cache.get("b")).toBeUndefined();

    cache.set("large", {
      kind: "ready",
      srcDoc: "123456789",
      width: 10,
      height: 10,
      byteLength: 9,
    });
    expect(cache.byteLength).toBeLessThanOrEqual(10);
    expect(cache.size).toBeLessThanOrEqual(2);
  });
});

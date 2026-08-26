import type { EngineWebSurfaceThemeSnapshot } from "@omnimind/contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
  parseOfficialMermaidSandboxOutput,
  renderMermaidPresentation,
  resetMermaidPresentationForTests,
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

afterEach(() => {
  resetMermaidPresentationForTests();
});

describe("Mermaid sandbox output", () => {
  it.each([
    ["flowchart", "flowchart LR\nA[开始]-->B[Ready]"],
    ["sequence", "sequenceDiagram\nAlice->>Bob: Hello 世界"],
    ["class", "classDiagram\nAnimal <|-- Duck"],
    ["state", "stateDiagram-v2\n[*] --> Ready"],
    ["er", "erDiagram\nUSER ||--o{ ORDER : places"],
    ["mindmap", "mindmap\n  root((OmniMind))\n    Fast"],
  ])("rebuilds a locked-down Host srcDoc for %s", async (_name, source) => {
    const result = await renderMermaidPresentation({
      source,
      theme: THEME,
      signal: new AbortController().signal,
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.height).toBeGreaterThan(0);
    expect(result.srcDoc).toContain("default-src 'none'");
    expect(result.srcDoc).toContain("connect-src 'none'");
    expect(result.srcDoc).toContain("<svg");
    expect(result.srcDoc).not.toContain("allow-popups");
    expect(result.srcDoc).not.toContain("allow-top-navigation");
  });

  it("fails closed for extra nodes, changed permissions and non-data output", () => {
    const body = btoa('<body style="margin:0"><svg viewBox="0 0 10 10"></svg></body>');
    const valid = `<iframe style="width:100%;height:10px;border:0;margin:0;" src="data:text/html;charset=UTF-8;base64,${body}" sandbox="allow-top-navigation-by-user-activation allow-popups">fallback</iframe>`;
    expect(parseOfficialMermaidSandboxOutput(valid, THEME.surface).kind).toBe("ready");
    expect(parseOfficialMermaidSandboxOutput(`<p>extra</p>${valid}`, THEME.surface).kind).toBe(
      "fallback",
    );
    expect(
      parseOfficialMermaidSandboxOutput(valid.replace(" allow-popups", ""), THEME.surface).kind,
    ).toBe("fallback");
    const extraBody = btoa(
      '<body style="margin:0"><p>extra</p><svg viewBox="0 0 10 10"></svg></body>',
    );
    expect(
      parseOfficialMermaidSandboxOutput(valid.replace(body, extraBody), THEME.surface).kind,
    ).toBe("fallback");
    expect(
      parseOfficialMermaidSandboxOutput(
        valid.replace(/data:text[^"]+/, "https://example.com"),
        THEME.surface,
      ).kind,
    ).toBe("fallback");
    expect(parseOfficialMermaidSandboxOutput(valid, "red}</style><script>").kind).toBe("fallback");
  });

  it("rejects invalid geometry and oversized output without a geometry ceiling", () => {
    const body = btoa('<body style="margin:0"><svg viewBox="0 0 10 10"></svg></body>');
    const valid = `<iframe style="width:100%;height:10px;border:0;margin:0;" src="data:text/html;charset=UTF-8;base64,${body}" sandbox="allow-top-navigation-by-user-activation allow-popups">fallback</iframe>`;
    expect(
      parseOfficialMermaidSandboxOutput(valid.replace("height:10px", "height:0px"), THEME.surface)
        .kind,
    ).toBe("fallback");
    expect(
      parseOfficialMermaidSandboxOutput(valid.replace("height:10px", "height:-1px"), THEME.surface)
        .kind,
    ).toBe("fallback");
    const mismatchedBody = btoa('<body style="margin:0"><svg viewBox="0 0 10 11"></svg></body>');
    expect(
      parseOfficialMermaidSandboxOutput(valid.replace(body, mismatchedBody), THEME.surface).kind,
    ).toBe("fallback");
    expect(
      parseOfficialMermaidSandboxOutput(`${valid}${" ".repeat(1024 * 1024)}`, THEME.surface).kind,
    ).toBe("fallback");
  });

  it("cancels a task before loading or rendering Mermaid", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      renderMermaidPresentation({
        source: "graph TD\nA-->B",
        theme: THEME,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("serializes initialize and render so concurrent themes cannot contaminate each other", async () => {
    const darkTheme = {
      ...THEME,
      surface: "#101820",
      elevatedSurface: "#17212b",
      text: "#f4f7fa",
      textDim: "#b8c2cc",
    };
    const [light, dark] = await Promise.all([
      renderMermaidPresentation({
        source: "graph TD\nLight-->Ready",
        theme: THEME,
        signal: new AbortController().signal,
      }),
      renderMermaidPresentation({
        source: "graph TD\nDark-->Ready",
        theme: darkTheme,
        signal: new AbortController().signal,
      }),
    ]);
    expect(light.kind).toBe("ready");
    expect(dark.kind).toBe("ready");
    if (light.kind !== "ready" || dark.kind !== "ready") return;
    expect(light.srcDoc).toContain(THEME.surface);
    expect(dark.srcDoc).toContain(darkTheme.surface);
    expect(light.srcDoc).not.toContain(darkTheme.surface);
    const frame = document.createElement("iframe");
    frame.srcdoc = dark.srcDoc;
    document.body.append(frame);
    await new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, 500);
    });
    const frameDocument = frame.contentDocument;
    const svg = frameDocument?.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(frameDocument?.defaultView?.getComputedStyle(frameDocument.body).backgroundColor).toBe(
      "rgb(16, 24, 32)",
    );
    expect(frameDocument?.defaultView?.getComputedStyle(svg!).backgroundColor).toBe(
      "rgb(16, 24, 32)",
    );
    frame.remove();
  });

  it("keeps geometry independent from presentation eligibility", async () => {
    const edges = Array.from({ length: 100 }, (_, index) => `N${index}-->N${index + 1}`);
    const result = await renderMermaidPresentation({
      source: ["flowchart TD", ...edges].join("\n"),
      theme: THEME,
      signal: new AbortController().signal,
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.height).toBeGreaterThan(4096);
  });

  it.each(["-->", "---", "===", "-.-", "~~~", "->", "..>", "--"])(
    "rejects the 101st %s connector before importing or rendering Mermaid",
    async (connector) => {
      const importMarksBefore = performance.getEntriesByName("omnimind:mermaid-import").length;
      const renderMeasuresBefore = performance.getEntriesByName(
        "omnimind:mermaid-render-duration",
      ).length;
      const source = `flowchart TD\n${`A${connector}B;`.repeat(101)}`;
      const result = await renderMermaidPresentation({
        source,
        theme: THEME,
        signal: new AbortController().signal,
      });
      expect(result).toMatchObject({ kind: "fallback", reason: "budget" });
      expect(performance.getEntriesByName("omnimind:mermaid-import")).toHaveLength(
        importMarksBefore,
      );
      expect(performance.getEntriesByName("omnimind:mermaid-render-duration")).toHaveLength(
        renderMeasuresBefore,
      );
    },
  );

  it("contains hostile returned markup inside a scriptless opaque-origin frame", async () => {
    const remote = `https://example.invalid/mermaid-${crypto.randomUUID()}.png`;
    const body = btoa(
      `<body style="margin:0"><svg viewBox="0 0 10 10"><script>parent.document.body.dataset.mermaidEscaped='true';window.open('https://example.invalid/popup');top.location='https://example.invalid/top'</script><image href="${remote}" width="10" height="10"/></svg></body>`,
    );
    const official = `<iframe style="width:100%;height:10px;border:0;margin:0;" src="data:text/html;charset=UTF-8;base64,${body}" sandbox="allow-top-navigation-by-user-activation allow-popups">fallback</iframe>`;
    const result = parseOfficialMermaidSandboxOutput(official, THEME.surface);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;

    delete document.body.dataset.mermaidEscaped;
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "");
    frame.referrerPolicy = "no-referrer";
    frame.style.pointerEvents = "none";
    frame.srcdoc = result.srcDoc;
    document.body.append(frame);
    await new Promise<void>((resolve) => {
      frame.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, 500);
    });
    expect(document.body.dataset.mermaidEscaped).toBeUndefined();
    expect(location.hostname).not.toBe("example.invalid");
    expect(performance.getEntriesByType("resource").some((entry) => entry.name === remote)).toBe(
      false,
    );
    frame.remove();
  });
});

import { describe, expect, it } from "vitest";
import { buildDiagramStreamCorpus, buildMermaidDiagramSource } from "./workload";

describe("Mermaid transcript performance workloads", () => {
  it("builds the normal 100-edge fixture inside automatic budgets", () => {
    const source = buildMermaidDiagramSource(100);
    expect(source.match(/-->/g)).toHaveLength(100);
    expect(source.split("\n").filter(Boolean).length).toBe(101);
  });

  it("keeps the 101-edge fixture compressed so connector policy rejects it before import", () => {
    const source = buildMermaidDiagramSource(101);
    expect(source.match(/-->/g)).toHaveLength(101);
    expect(source.split("\n").filter(Boolean).length).toBe(2);
  });

  it("builds same-byte plain and Mermaid streaming corpora", () => {
    const mermaid = buildDiagramStreamCorpus(12_000, "mermaid");
    const plain = buildDiagramStreamCorpus(12_000, "plain");
    expect(mermaid).toHaveLength(12_000);
    expect(plain).toHaveLength(12_000);
    expect(mermaid.slice(10)).toBe(plain.slice(10));
  });
});

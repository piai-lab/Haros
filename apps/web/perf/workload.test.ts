import { describe, expect, it } from "vitest";
import { buildDiagramStreamCorpus, buildMermaidDiagramSource } from "./workload";

describe("Mermaid transcript performance workloads", () => {
  it("builds the normal 80-edge fixture inside automatic budgets", () => {
    const source = buildMermaidDiagramSource(80);
    expect(source.match(/-->/g)).toHaveLength(80);
    expect(source.split("\n").filter(Boolean).length).toBe(81);
  });

  it("keeps the 300-edge fixture compressed so connector policy, not line count, rejects it", () => {
    const source = buildMermaidDiagramSource(300);
    expect(source.match(/-->/g)).toHaveLength(300);
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

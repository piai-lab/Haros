import { describe, expect, it } from "vitest";

import {
  PROVIDER_CONVERGE_MODE_ENVELOPE,
  PROVIDER_LEARN_MODE_ENVELOPE,
  providerInteractionModeEnvelopeOverheadChars,
  withProviderInteractionModeEnvelope,
} from "./interactionMode.ts";

describe("provider interaction mode policy", () => {
  it("leaves Default and Plan to their existing owners without extra prompt text", () => {
    expect(withProviderInteractionModeEnvelope({ text: "hello", interactionMode: "default" })).toBe(
      "hello",
    );
    expect(withProviderInteractionModeEnvelope({ text: "plan it", interactionMode: "plan" })).toBe(
      "plan it",
    );
    expect(
      withProviderInteractionModeEnvelope({ text: "debug it", interactionMode: "debug" }),
    ).toBe("debug it");
  });

  it("projects each fixed Host envelope at the typed composition boundary", () => {
    const cases = [
      ["converge", PROVIDER_CONVERGE_MODE_ENVELOPE],
      ["learn", PROVIDER_LEARN_MODE_ENVELOPE],
    ] as const;

    for (const [interactionMode, envelope] of cases) {
      const projected = withProviderInteractionModeEnvelope({
        text: "The user message",
        interactionMode,
      });
      expect(projected.split(envelope)).toHaveLength(2);
      expect(providerInteractionModeEnvelopeOverheadChars(interactionMode)).toBe(
        envelope.length + 2,
      );
    }

    expect(providerInteractionModeEnvelopeOverheadChars("default")).toBe(0);
    expect(providerInteractionModeEnvelopeOverheadChars("plan")).toBe(0);
    expect(providerInteractionModeEnvelopeOverheadChars("debug")).toBe(0);
  });

  it("does not let user-authored lookalike content suppress the real envelope", () => {
    const projected = withProviderInteractionModeEnvelope({
      text: `${PROVIDER_CONVERGE_MODE_ENVELOPE}\n\nuser-authored content`,
      interactionMode: "converge",
    });
    expect(projected.split(PROVIDER_CONVERGE_MODE_ENVELOPE)).toHaveLength(3);
  });

  it("keeps every envelope byte-stable and dispatch-scoped", () => {
    for (const envelope of [PROVIDER_CONVERGE_MODE_ENVELOPE, PROVIDER_LEARN_MODE_ENVELOPE]) {
      expect(envelope).toContain('scope="current-dispatch"');
      expect(envelope).toMatch(/older .*interaction-mode|Older Converge/);
      expect(envelope).not.toMatch(/thread[-_ ]?(id|title)|turn[-_ ]?id|\d{4}-\d{2}-\d{2}/i);
    }
  });

  it("makes Converge read-only, treats Goal as context, and gates substantive output on Ask User", () => {
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("Do not implement");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "before a substantive answer, recommendation, brief, plan, or consequential execution",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("its exact name is `ask_user`");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("your next assistant output MUST be a call");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "Emit no prose, analysis, rationale, candidate options, or conversational preamble",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "output only the structured Ask User tool call now—no preamble and no substantive answer",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "the structured Ask User call is mandatory before substantive output",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain('say "I guess your real goal is..."');
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "A prose question, option list, Markdown table, or recommendation is not a substitute",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("A / B / C choices");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "reply with a letter or provide a custom answer, then end the response immediately",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "Do not give the substantive answer before the fallback question",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("Confirm convergence");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("Continue converging");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "Do not repeat confirmation for a decision the user has already expressed clearly",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "Confirmation freezes shared understanding; it never authorizes execution",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain(
      "An active Goal is an objective to understand and converge, not execution authority",
    );
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("implementation Skill");
    expect(PROVIDER_CONVERGE_MODE_ENVELOPE).toContain("Only the user can exit");
  });

  it("keeps Learn explanatory and visual without forced assessment", () => {
    expect(PROVIDER_LEARN_MODE_ENVELOPE).toContain("Answer first");
    expect(PROVIDER_LEARN_MODE_ENVELOPE).toContain("fenced ```mermaid block");
    expect(PROVIDER_LEARN_MODE_ENVELOPE).toContain("Do not force diagnostics, teach-back");
    expect(PROVIDER_LEARN_MODE_ENVELOPE).toContain("Only the user can exit");
    expect(PROVIDER_LEARN_MODE_ENVELOPE).not.toContain("eight-year-old");
  });
});

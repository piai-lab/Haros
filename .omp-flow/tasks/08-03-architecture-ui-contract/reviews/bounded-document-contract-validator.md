---
type: "Review"
title: "Bounded document-contract validator independent review"
verdict: "PASS"
work: "../work/bounded-document-contract-validator.md"
handoff: "../handoffs/bounded-document-contract-validator.md"
actor_id: "architecture_ui_qbd_2_1"
dispatch_receipt: "b8042f07b9a94feaacb427d220527294"
predecessor_receipt: "44cf61e57e74489190ca0643c4d3306a"
prior_review_receipt: "cca6eadd5f504e60b05bc3279a89577d"
---

# Bounded document-contract validator independent review

## Verdict and findings

**PASS.** No blocking or advisory finding remains. The current implementation closes both P1
classes from the prior review: all four complete-current-sentinel single-block Settings attacks
now return the exact single stable R4 finding, and complete executable-shaped source signatures
inside inert comments, escaped quoted strings or template literals now return the exact single
anchor finding. The fixed real source shapes still pass.

The dedicated suite passes 51/51; the combined suite, bounded root `npm test` and full
`npm run quality` each pass 74/74. The validator reads the same fixed twelve paths in deterministic
order, returns stable results, performs no write, and leaves its inputs and temporary fixture area
unchanged. Scope, syntax and whitespace checks are green.

This review changes no implementation, durable owner, source anchor, product/Campaign state or
shared test. It approves only the bounded Work Concept and does not claim semantic document, UI or
product completion.

## Predecessor and scope integrity

The supplied predecessor is valid and independent. The current
[handoff](../handoffs/bounded-document-contract-validator.md) is `DONE`, identifies implementer
`architecture_doc_qbd_3` with dispatch receipt
`44cf61e57e74489190ca0643c4d3306a`, links this
[Work](../work/bounded-document-contract-validator.md), and records the prior review receipt it
repairs. The reviewer actor is different from the implementer.

Relative to repository `HEAD`, the two implementation paths remain complete untracked additions,
so the review inspected their full contents rather than treating an empty tracked diff as proof:

| Path | SHA-256 reviewed |
| --- | --- |
| `scripts/document-contract.mjs` | `a0f4a3712589bf477f748991dcc782dc3b68d9bb41a5eb84f56365c830e5942a` |
| `test/document-contract.test.mjs` | `051fadfe958d03a4d0f8851323f9e5b97b6a08115c26b6a5b8194fd07c3c04ec` |

The implementation imports only path handling and `readFile`; it traverses no directory and owns
no writer. Its fixed inputs are the nine approved durable documents plus the three protected
Plugin/Skill anchors. No package, product, durable-owner, provenance, Campaign or donor source
path was changed by this Work.

## Prior P1 closure

### Complete Settings sentinel bags

The current Models, Agents, Packages and permission rules retain their approved consequence
clauses and now require those relationship groups to span respectively 3, 2, 3 and 4 distinct
blank-line-delimited blocks. The matching algorithm assigns clauses to distinct blocks rather
than merely counting blocks that contain arbitrary terms.

An independent injected-read probe replaced exactly one complete Workbench section per run with
one paragraph containing every string currently consumed by that rule. Every other input remained
byte-identical. Each attack was run twice and produced the same complete one-element result:

| Replaced section | Exact result |
| --- | --- |
| Models | `ui.models` · `architecture/workbench.md` · `Models settings contract is incomplete or contradictory` |
| Agents | `ui.agents` · `architecture/workbench.md` · `Agents settings contract is incomplete or contradictory` |
| Packages | `ui.packages` · `architecture/workbench.md` · `Packages settings contract is incomplete or contradictory` |
| Permission truth | `ui.permission` · `architecture/workbench.md` · `permission policy and enforcement-source contract is incomplete or contradictory` |

No unrelated finding masked a target result. This directly reproduces and closes the four exact
false positives from the prior review instead of relying only on shorter shipped label fixtures.

The new structure check does not turn headings or paragraph order into lifecycle state. A positive
counter-probe reversed the existing blank-line-delimited prose blocks inside all four real
Settings sections while preserving their content; validation still returned `[]`.

### Inert executable-shaped source text

`executableSource` now removes line and block comments and masks complete single-quoted,
double-quoted and template literals. It preserves only the seven exact route/tab values needed by
the three protected executable shapes. Source-specific structural checks then run on that bounded
lexical skeleton.

The independent probe first supplied each pseudo-source signature as active source and confirmed
that it was complete enough for the current structural recognizer. It then placed the same
complete signature in an inert carrier and ran every attack twice:

| Anchor | Inert carrier | Exact result |
| --- | --- | --- |
| `vendor/ui/apps/web/src/routes/_chat.plugins.tsx` | complete block comment | one `ui.plugin-skill-anchor` finding at this path |
| `vendor/ui/apps/web/src/routeTree.gen.ts` | double-quoted string with escaped inner quotes | one `ui.plugin-skill-anchor` finding at this path |
| `vendor/ui/apps/web/src/components/PluginLibrary.tsx` | complete template literal | one `ui.plugin-skill-anchor` finding at this path |

All three findings used the exact message `protected plugin and skill source anchor is missing or
no longer recognizable`. Prefixing each real protected source with a complete escaped-string
decoy and a complete comment decoy still returned `[]`, showing that quote escaping and inert
noise do not hide the real executable anchor that follows.

This is deliberately a recognizer for the current three protected source shapes, not a TypeScript
parser or control-flow proof. That limitation is consistent with the Work and handoff: an actual
source refactor must update the bounded recognizer and fixtures in the same semantic review.

## Determinism, read-only behavior and stable failures

Two independent real-repository runs captured exactly this ordered read set and no other path:

```text
AGENTS.md
README.md
architecture/README.md
architecture/workbench.md
architecture/product-state.md
architecture/execution.md
execution-brief.md
missions/independent-omnimind-v1.md
research/README.md
vendor/ui/apps/web/src/routes/_chat.plugins.tsx
vendor/ui/apps/web/src/routeTree.gen.ts
vendor/ui/apps/web/src/components/PluginLibrary.tsx
```

Both returned `[]`. The combined before/after digest of path names and bytes was
`8af8d12005b0b4480dd7df546550414c7194bd9d118b5cbc320208b7c7a9c39d`. A separately injected
missing `architecture/execution.md` returned the same exact single `document.required` finding on
two runs. The seven repaired adversarial cases likewise returned byte-for-byte equal findings on
two runs each.

The focused suite creates repositories only under `omnimind-document-contract-*` temporary
directories and registers recursive `t.after` cleanup. No matching directory existed before or
after the dedicated, combined, root-test and quality runs. Implementation hashes and the shared
porcelain-status digest were also identical before and after the complete gate sequence.

## Independent verification

| Command or probe | Result |
| --- | --- |
| `node --test test/document-contract.test.mjs` | pass, 51/51 |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | pass, 74/74 |
| exact bounded `npm test` | pass, 74/74 |
| exact `npm run quality` | pass, source 1/1, identity 6,580 source files / 0 generated findings / 6 rules, tests 74/74 |
| four complete-current-sentinel single-block Settings attacks | pass as review probes: exact single rule/path/message, stable across two runs |
| three complete executable-shaped inert-source attacks | pass as review probes: raw shapes recognized; inert carriers rejected with exact single finding, stable across two runs |
| harmless four-section multi-block editorial reorder | pass, `[]` |
| escaped quote/comment decoys followed by real anchors | pass, `[]` for all three protected paths |
| fixed-read/determinism/read-only probe | pass, 12 ordered paths, two identical runs and unchanged aggregate digest |
| missing-owner stable failure | pass, exact single finding across two runs |
| `node --check scripts/document-contract.mjs` and test file | pass |
| `git diff --check --` on both allowed paths | pass |
| full-file `git diff --no-index --check /dev/null <file>` on each untracked implementation file | pass, zero whitespace diagnostics |
| post-suite temporary-directory scan | pass, zero leftovers |

The shared working tree was already dirty with predecessor and user changes. This review neither
staged nor altered them; its before/after porcelain-status digest remained
`a18f16c26a1a5b1d8ad1a16b25519889692ef89d4a20a004f7a104047f6d8d8f` during verification.

## Acceptance boundary

Passing this Review means the bounded deletion/regression alarm satisfies its Work Concept on the
current implementation bytes. It does not make the validator a Markdown semantic parser, prove
that the UI contract is implemented, validate runtime behavior, promote a Campaign claim or
authorize donor-source deletion. Those remain governed by the linked Design, Workbench source
takeover gate and later frozen-candidate review.

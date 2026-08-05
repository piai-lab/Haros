---
type: "Implementation Review"
title: "Review: mandatory adopted-source route correction"
work: "../work/transplant-runnable-source-closure.md"
handoff: "../handoffs/transplant-runnable-source-closure.md"
verdict: "PASS"
actor_id: "agent_route_contract_reviewer_r1"
dispatch_receipt: "6cddc875a83f449ba8dd6a528b69052a"
predecessor_receipt: "843bd10a25e4467f9caadd2fbb5455b4"
---

# Review: mandatory adopted-source route correction

## Verdict

`PASS`. No material finding remains in the bounded r8 correction. The exact staged index contains
only the two-line `AGENTS.md` route required by the existing adopted-source intake contract. It
preserves the canonical `README.md` → `architecture/README.md` → `execution-brief.md` → active
Campaign reading order and sends maintainer-requested source review through read-only research,
human discussion and explicit approval of the current intake set before product mutation.

This verdict accepts only that uncommitted routing correction. It does not accept Freeze r3,
freeze a production SHA, inherit skipped browser/live/artifact evidence, promote a Campaign claim
or declare the first Pi-native vertical slice or OmniMind V1 complete. After an atomic commit, a
new Freeze must start from the new exact clean SHA and rerun its own gates.

Implementation receipt `843bd10a25e4467f9caadd2fbb5455b4` is completed and resolves to the
linked r8 handoff, authored by `agent_route_contract_implementer_r1`. Reviewer
`agent_route_contract_reviewer_r1` is different from the implementer. Review receipt
`6cddc875a83f449ba8dd6a528b69052a` names that implementation receipt as predecessor and this file
as its sole output.

## Findings

None.

## Reviewed boundary

The review inspected the index rather than treating the shared working tree as candidate source:

- `git diff --cached --name-status` contains only `M AGENTS.md`;
- `git diff --cached --numstat -- AGENTS.md` is exactly `2  0  AGENTS.md`;
- the staged delta adds only the adopted-source task route and its continuation line;
- `git diff -- AGENTS.md` still contains the maintainer's live-provider and secret-handling edits
  as a separate unstaged `+5/-1` working-tree delta;
- no Product, Runtime, test, asset, architecture owner, Campaign or release file is staged.

The exact staged tree reviewed here is `62c4ca693fcb62176035483e0cb0eefb4396710b` over committed base
`3c2d226c44530ef883964aaf81b849925cab59e9`. The r8 handoff and this Review Concept are workflow
outputs, not evidence that the user's unrelated working-tree hunks belong to the code candidate.

## Contract and correctness review

The staged route is a routing rule, not a second source-adoption owner. It points to the existing
`research/source-update-intake.md`, whose durable contract keeps actual adoption truth in the root
README, makes source review maintainer-initiated, separates read-only Gate A from explicitly
approved implementation Gate B, and requires exact revision/risk/rights investigation. The new
route summarizes those consequences without duplicating the protocol or granting automatic intake.

The staged blob keeps the original global read order unchanged. Direct staged-blob inspection found
the four canonical terms in order and exactly one `research/source-update-intake.md` route. The
route contains both required boundaries: read-only research plus human discussion first, and
product mutation only after the maintainer confirms the exact current intake set.

No execution authority, Provider catalog, Pi dependency, package capability, credential behavior
or public-surface state changes. The correction therefore needs contract and identity verification,
not a replay of previously accepted Product/Runtime suites.

## Freeze r3 evidence boundary

Freeze operation `abe2b131de554790a06a3288ec819799` is mechanically recorded as failed; its linked
handoff reports `BLOCKED` for candidate
`3c2d226c44530ef883964aaf81b849925cab59e9`. Frozen install, build, typecheck, quality, root tests
and the correctly routed focused Vitest boundary suite passed before the document gate. The first
real candidate red gate was the bounded document-contract command: candidate `AGENTS.md` lacked
`research/source-update-intake.md`, producing one stable `route.mandatory` finding and causing the
mutation fixtures to fail. Brand, browser, live-provider and artifact gates after that compound
command were not reached and remain unproven.

That attribution matches the current validator: `validateRoutes` requires the canonical four-term
read order and separately requires `research/source-update-intake.md` in `AGENTS.md`. Exporting the
exact staged index now makes all 72 document-contract tests pass, including the base repository
case and the negative adopted-source approval-boundary fixture. This closes the owning document
falsifier without weakening the validator.

The earlier `bun test` collection failure remains excluded from product evidence. The affected
macOS artifact configuration suite imports `assert`, `describe` and `it` from `@effect/vitest`, so
it belongs to Vitest rather than Bun's test runner. The Freeze handoff records that the corrected
Vitest invocation passed the nine-file suite `38/38`. Neither the invalid runner failure nor its
later corrected result is used to prove this two-line route correction.

## Independent verification

The reviewer materialized the complete Git index into a disposable directory using
`git checkout-index --all --prefix=<fixture>/`; the current working `AGENTS.md` was therefore not an
input to the following gates.

| Command / proof | Result |
| --- | --- |
| `git diff --cached --name-status` and `git diff --cached --numstat -- AGENTS.md` | PASS; only `AGENTS.md`, exactly `+2/-0` |
| direct `git show :AGENTS.md` order/count/gate assertion | PASS; canonical four-term order preserved, intake route exactly once, both approval boundaries present |
| exact-index fixture `node --test test/document-contract.test.mjs` | PASS, exit `0`; `72/72` tests |
| exact-index fixture `bun run brand:check` | PASS, exit `0`; `12` locked source/platform assets |
| `git diff --cached --check` | PASS, exit `0` |
| `git diff -- AGENTS.md` separation inspection | PASS; live-provider/secret rules remain unstaged and unclaimed |

No implementation, handoff, Work, runtime/session record, Evidence ledger, Campaign state, Git
index or user-owned working file was modified by this reviewer. The only authored output is this
Review Concept.

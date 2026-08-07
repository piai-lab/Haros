---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v7 meter (r2)"
work: "../work/product-truth-complexity-v7.md"
handoff: "../handoffs/product-truth-complexity-v7.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v7-r2"
actor_id: "product_truth_meter_v7_review_r2"
dispatch_receipt: "8ca1fad594a343328e006b369b080903"
predecessor_receipt: "0870230eeafa4332889b7d84d49af7ae"
predecessor_output: "../handoffs/product-truth-complexity-v7.md"
reviewed_candidate: "f6781eb940093b0be2e1c35cbf1164fe6f29b8d7"
reviewed_parent: "f6781eb940093b0be2e1c35cbf1164fe6f29b8d7^"
accepted_design: "1e6d80a2cf0edd67084a1f5dc20e996acc326bd6"
---

# Review: Authoritative Product-truth complexity v7 meter (r2)

## Verdict

`FAIL` — r2 closes r1's declared-path-only inventory P0, but a new independent P0 remains:
direct CommonJS raw terminals and global-object destructuring are not represented in the raw-effect
inventory. The completed predecessor handoff links this Work and candidate; implementer
`product_truth_meter_v7_r2` differs from reviewer `product_truth_meter_v7_review_r2`. No repair
was made and B1 is not authorized.

## Findings

### P0 — direct CommonJS and global-destructured raw terminals bypass the complete inventory

**Cause.** Raw binding collection at `measure-complexity-v7.mjs:826-841` recognizes CommonJS only
when a `VariableDeclaration` itself is initialized by literal `require`/`module.require`, and it
does not bind members destructured from `globalThis`/`global`/`self`/`window`. The use pass at
`:907-960` has no direct `require("node:fs").readFileSync(...)` case. For
`const { process } = globalThis; process.dlopen(...)`, `collectDeclaredNames` marks `process`
declared and `normalizedGlobal` returns `null` at `:750-751`; no ingress or violation is emitted.

**Consequence.** A single raw terminal can be added to a present frozen closure-only member without
changing `rawIngress` or `rawViolations`: for example,
`require("node:child_process").spawnSync(["true"])`, or the global-destructured
`process.dlopen(...)` form above. The baseline fingerprint remains unchanged, so the B0 branch
accepts it; later candidates receive no owner/class containment check. This violates the Work and
interface requirement to enumerate every raw ingress/binding reference in every frozen
production/direct-tool member.

**Smallest repair.** Record raw classes for direct literal `require`/`module.require` member/call
expressions and for destructured aliases of accepted global roots, preserving lexical scope when
deciding whether a root is shadowed. Add single-cause frozen-closure fixtures for direct CommonJS
raw terminal, global destructure, nested `globalThis.process[k]`/`Bun[k]`, and an unrelated-scope
shadowing adjacent positive. Keep this mechanical syntax/owner analysis only; no runtime semantic
interpreter is needed.

## r1 history

The prior r1 Review (`73111f8bee7241e19912909c070af9b1`) failed because inventory was limited to
`declaredProductionPaths`. R2 correctly changes it to every present frozen production/direct-tool
member and adds literal CommonJS graph edges. That r1 P0 is closed; this r2 finding is distinct.

## Independent verification

- Read the Work, v7 interface/repair decision, r2 predecessor handoff and immutable candidate
  diff. The r2 scope is three allowed v7-file modifications plus six allowed fixtures; no Product,
  dependency, Work, v1-v6 or user-state file changed.
- Source review of `measure-complexity-v7.mjs:783-785` confirms every present frozen production or
  direct-tool source is now selected. `:386-517` recognizes literal internal `require`,
  `module.require`, and bound `createRequire` graph edges; r1's closure omission is repaired.
- Source-derived hidden single-factor probes established the P0 above: neither direct CommonJS
  member terminals nor global destructuring reaches `record()`/`addViolation()`. This is an
  inventory omission, not a request for runtime behavior analysis.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=verbose` —
  authored suite `42/42` PASS. It covers closure-only `Bun` and CommonJS edge escape, but not the
  two omitted forms.
- Two `node scripts/product-truth/measure-complexity-v7.mjs --ref
  7582170a277477ba0d71cf70f53e4e0836874a72` executions — byte-identical; complete JSON SHA-256
  `ee593f6d935abd36001a8c919307dd78c4f627c357f183132aaf8442a749d849`.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).
- `git diff --check f6781eb940093b0be2e1c35cbf1164fe6f29b8d7^ f6781eb940093b0be2e1c35cbf1164fe6f29b8d7` — PASS.

## Required return

Return the Work for a new immutable meter candidate with the P0 repair and focused raw-inventory
fixtures. Do not relabel r2, and do not infer cleanup, refusal, locks, scheduling, fault, race or
crash behavior from this structural meter.

## Dispatch identity

- role: `check`
- actorId: `product_truth_meter_v7_review_r2`
- receipt: `8ca1fad594a343328e006b369b080903`
- predecessor: `0870230eeafa4332889b7d84d49af7ae`
- predecessor output: `../handoffs/product-truth-complexity-v7.md`
- verdict: `FAIL`
- explicitly allowed fix: none

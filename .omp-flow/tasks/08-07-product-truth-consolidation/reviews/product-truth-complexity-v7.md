---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v7 meter (r3)"
work: "../work/product-truth-complexity-v7.md"
handoff: "../handoffs/product-truth-complexity-v7.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v7-r3"
actor_id: "product_truth_meter_v7_review_r3"
dispatch_receipt: "04c8dca6c3284781a994bd286586429a"
predecessor_receipt: "aa39020d76a7462994667e95bc097b74"
predecessor_output: "../handoffs/product-truth-complexity-v7.md"
reviewed_candidate: "8429e2a4f6d21f5a8cec44e5cf67a33855d36e8e"
reviewed_parent: "8429e2a4f6d21f5a8cec44e5cf67a33855d36e8e^"
accepted_design: "1e6d80a2cf0edd67084a1f5dc20e996acc326bd6"
---

# Review: Authoritative Product-truth complexity v7 meter (r3)

## Verdict

`FAIL` — r3 closes both earlier P0s (full frozen inventory and direct CommonJS/global-destructure
forms), but assignment aliases still bypass the raw-effect inventory. The predecessor handoff
matches this Work and candidate; implementer `product_truth_meter_v7_r3` differs from reviewer
`product_truth_meter_v7_review_r3`. No repair was made and B1 is not authorized.

## Findings

### P0 — assignment aliases of global roots are not resolved

**Cause.** The r3 scoped-alias pass collects only initialized `VariableDeclaration` nodes at
`measure-complexity-v7.mjs:1004-1009` and binds only their declared names at `:1013-1035`.
`BinaryExpression` assignments are never considered. `resolveScopedAlias()` therefore returns
`null` for an assigned local; `normalizedGlobal()` sees that local as lexically shadowed and returns
`null` at `:821-822`.

**Witness and consequence.** In a present frozen closure-only member, this single change is
unobserved:

```ts
let v7Process: typeof process;
v7Process = globalThis.process;
export const v7AssignedGlobalRaw = () => v7Process.dlopen({} as NodeJS.Module, "x.node");
```

No path reaches `record()` or `addViolation()`, so B0's raw inventory fingerprint remains stable
and a later candidate receives no class/owner containment check. This violates the required
complete syntactic ingress inventory and the assignment-alias case expressly required for r3.

**Smallest repair.** Add scope-correct simple assignment binding for eligible local aliases (and
invalidate or fail closed on reassignment/unknown writes); cover global-root, wrapper and terminal
assignment aliases in a frozen closure-only member, with an adjacent benign assignment positive.
This remains finite AST binding analysis and needs no runtime semantic interpreter.

## Prior review history

- r1 (`73111f8bee7241e19912909c070af9b1`) failed the declared-production-only closure inventory;
  r2 closed it.
- r2 (`8ca1fad594a343328e006b369b080903`) failed direct CommonJS/global-destructure inventory;
  r3 closes those declaration forms.

## Independent verification

- Read the Work, v7 interface/repair decision, r3 handoff and immutable candidate diff. Scope is
  two allowed v7 modifications plus 12 fixture additions; no Product, dependency, config, Work,
  v1-v6 or user-state path changed.
- Confirmed r1's repair at `:841-843`: inventory selects every present frozen production/direct-tool
  source. Confirmed r2's direct CommonJS and scoped declaration handling at `:1075-1114` and
  `:932-1035`.
- Source-derived hidden single-factor assignment witness above follows the exact unhandled branch:
  it is not a runtime-semantic claim and does not depend on control-flow inference.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=verbose` —
  authored suite `54/54` PASS; it has no assignment-alias fixture.
- Two `node scripts/product-truth/measure-complexity-v7.mjs --ref
  7582170a277477ba0d71cf70f53e4e0836874a72` runs — byte-identical; full JSON SHA-256
  `17b6072bc1a8773eb5a1307952e09b298e935aa03c04b0aff426016819af0778`.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).
- `git diff --check 8429e2a4f6d21f5a8cec44e5cf67a33855d36e8e^ 8429e2a4f6d21f5a8cec44e5cf67a33855d36e8e` — PASS.

## Required return

Return the Work for a new immutable meter candidate with the P0 repair and bounded assignment
fixtures. Do not relabel r3 or infer cleanup, refusal, locking, scheduling, fault, race or crash
behavior from this structural meter.

## Dispatch identity

- role: `check`
- actorId: `product_truth_meter_v7_review_r3`
- receipt: `04c8dca6c3284781a994bd286586429a`
- predecessor: `aa39020d76a7462994667e95bc097b74`
- predecessor output: `../handoffs/product-truth-complexity-v7.md`
- verdict: `FAIL`
- explicitly allowed fix: none

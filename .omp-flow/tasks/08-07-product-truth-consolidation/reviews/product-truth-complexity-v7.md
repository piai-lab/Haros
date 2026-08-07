---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v7 meter (r4)"
work: "../work/product-truth-complexity-v7.md"
handoff: "../handoffs/product-truth-complexity-v7.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v7-r4"
actor_id: "product_truth_meter_v7_review_r4"
dispatch_receipt: "135c539ca5f84e3182560bb314ce3497"
predecessor_receipt: "4286c6cd27b04b3d8a0fdf020c18f9bc"
predecessor_output: "../handoffs/product-truth-complexity-v7.md"
reviewed_candidate: "4c1e33d411d9b7b2a5332e5f5211545fc1c721a1"
reviewed_handoff_commit: "b1cf21e2e4ae8fa68879feb4cd7d323545714aca"
reviewed_parent: "4c1e33d411d9b7b2a5332e5f5211545fc1c721a1^"
accepted_design: "1e6d80a2cf0edd67084a1f5dc20e996acc326bd6"
---

# Review: Authoritative Product-truth complexity v7 meter (r4)

## Verdict

`FAIL` — r4 closes r3's simple single-assignment alias P0, but assignment chains remain
unresolved and can hide a global raw terminal. The committed handoff at
`b1cf21e2e4ae8fa68879feb4cd7d323545714aca` links this Work and immutable candidate; implementer
`product_truth_meter_v7_r4` differs from reviewer `product_truth_meter_v7_review_r4`. No repair
was made and B1 is not authorized.

## Findings

### P0 — assignment-alias chains bypass raw inventory

**Cause.** `collectAliasDeclarations()` records both levels of `a = b = globalThis.process`, but
the alias fixed point at `measure-complexity-v7.mjs:1077-1081` calls `identityForExpression()` on
each assignment RHS. It resolves the inner `b = globalThis.process` to `b`, but a binary-expression
RHS is not an identity expression, so the outer assignment never binds `a`. The alias-write
validation ignores that unbound outer write because it validates only names already placed in
`scopedAliases`.

**Witness and consequence.** A single mutation in a present frozen closure-only member is accepted:

```ts
let v7Left: typeof process;
let v7Right: typeof process;
v7Left = v7Right = globalThis.process;
export const v7AssignmentChainRaw = () => v7Left.dlopen({} as NodeJS.Module, "x.node");
```

`v7Right` is a valid raw alias, while `v7Left` resolves to no alias and is a lexically declared
root, so the later call reaches neither `record()` nor `addViolation()`. The B0 raw fingerprint is
unchanged and a later candidate receives no class/owner containment check. This violates complete
raw ingress enumeration; r4's required assignment-chain probe is absent from the authored matrix.

**Smallest repair.** Either recursively resolve the RHS of simple assignment chains and bind every
eligible left identifier, or fail closed whenever a raw identity is nested in an assignment RHS.
Add a frozen closure-only chain negative and an adjacent non-raw chain positive. This is finite AST
syntax/binding work, not runtime CFG or semantic analysis.

## Prior review history

r1 fixed frozen-closure scope in r2; r2 fixed direct CommonJS/global destructuring in r3; r3 fixed
single simple assignment aliases in r4. The P0 above is a distinct r4 chain form.

## Independent verification

- Read the Work, interface/repair decisions, handoff commit, predecessor identity and candidate
  diff. Scope is two allowed v7 modifications plus 11 fixtures; Product, dependency, config, Work,
  v1-v6 and user-state paths are unchanged.
- Reviewed the r4 alias code at `measure-complexity-v7.mjs:1005-1103`. It correctly covers a
  single simple assignment, multiple/unknown writes, compound/update/destructure/property escape,
  hoisted `var`, and lexical shadow positives, but the source-derived chain witness follows the
  uncovered binary-RHS branch above.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=verbose` —
  authored suite `65/65` PASS; no assignment-chain fixture is present.
- Two `node scripts/product-truth/measure-complexity-v7.mjs --ref
  7582170a277477ba0d71cf70f53e4e0836874a72` runs — byte-identical; full JSON SHA-256
  `9eda5674438dc7c8e3e20dacb8afe8a03252ee8285f0b33c2fdd523f12bccfce`.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).
- `git diff --check 4c1e33d411d9b7b2a5332e5f5211545fc1c721a1^ 4c1e33d411d9b7b2a5332e5f5211545fc1c721a1` — PASS.

## Required return

Return the Work for a new immutable candidate with the P0 assignment-chain repair and focused
fixtures. Do not relabel r4 or infer runtime cleanup, refusal, locking, scheduling, fault, race or
crash behavior from this structural meter.

## Dispatch identity

- role: `check`
- actorId: `product_truth_meter_v7_review_r4`
- receipt: `135c539ca5f84e3182560bb314ce3497`
- predecessor: `4286c6cd27b04b3d8a0fdf020c18f9bc`
- predecessor output: `../handoffs/product-truth-complexity-v7.md`
- verdict: `FAIL`
- explicitly allowed fix: none

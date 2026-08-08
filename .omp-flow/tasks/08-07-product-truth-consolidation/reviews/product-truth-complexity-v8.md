---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r16)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r16"
actor_id: "product_truth_complexity_v8_review_r16"
dispatch_receipt: "7b9d09752b404864a9125e1ac3166f87"
predecessor_receipt: "ed24eb3c202a4ded8919128cb053d489"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "54771ec7a75b9d032b83be0b20386f5cee3bbc4e"
reviewed_handoff_commit: "b3b9010cd3c5b8adb6d885a14a32531772709d48"
reviewed_parent: "5c3130770ad75c6a7bb027097e29d64b82c39a48"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "888d94e2598fa014ba5701db910bd6b2589867f4f8dd0d13dc99582427ab59c3"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r16)

## Verdict

`FAIL` / changes requested for immutable r16 candidate
`54771ec7a75b9d032b83be0b20386f5cee3bbc4e`.

The predecessor operation and linked handoff match this Work and candidate; implementer
`product_truth_complexity_v8_impl_r16` differs from reviewer
`product_truth_complexity_v8_review_r16`. Scope, hashes, v1-v7 immutability, fences, authority,
official tuple, deterministic B0, authored gates, v7 regression, typecheck and syntax check
reproduce.

R16 closes r15's wrapper-qualified known-noninventory false rejects for direct, alias, assignment,
wrapper and conditional forms. One material direct/shared parity gap remains: a candidate-new known-
safe direct call does not inspect unsupported raw or unresolved-global subtrees in its arguments.
No implementation or handoff was repaired in this review.

## Findings

### P0 — known-safe direct calls skip raw argument subtrees

The direct call/new visitor at `scripts/product-truth/measure-complexity-v8.mjs:2381-2393` applies
strict wrapper normalization only to `node.expression`. After a known-noninventory callee is
accepted, recursive traversal reaches argument property nodes, but the visitor has no corresponding
global-chain gate for a bare property expression. By contrast, the shared finite-expression helper
at `:1810-1853` recursively checks all non-type children and rejects the same subtree when the whole
call is an alias initializer.

Two candidate-new direct variants unexpectedly exited 0:

```text
globalThis.console.log(Bun.file);
globalThis.console.log(globalThis.unknown.Bun.file);
```

The second is decisive: it embeds the exact unresolved raw-wrapper chain fixed in r15 as a value
argument instead of the callee. Its fresh report has `exactOutsideEquality=true`, no target ingress
and no target violation. The structurally identical call used as an alias initializer correctly
fails `RAW_ALIAS_WRITE_UNKNOWN`. The first direct case likewise drops an exact raw terminal, while
its alias-initializer form fails. A raw-free string argument passes as expected.

This violates the requested direct/shared unsupported-subtree parity and the interface's global
hard failure for unknown selectors/aliases. It also lets an exact raw handle disappear from the
structural inventory merely because it is passed to a known-safe call. The required correction is
finite child-syntax classification only; it needs no call semantics, value flow, CFG, SSA,
reachability or identity authentication.

Adjacent controls behave correctly: exact allowlisted `console.log`, `Math.max` and
`JSON.stringify` wrapper chains pass across globalThis/window/self/global, dot/computed/template/
optional, alias, assignment and conditional forms; unknown/deeper members and dynamic selectors
fail; lexical shadows and r1-r15 raw grammar controls retain their expected results.

## Independent verification

### Assignment, scope and authority

- Review receipt `7b9d09752b404864a9125e1ac3166f87` has role `check`, this Work/output and
  actor `product_truth_complexity_v8_review_r16`. Predecessor
  `ed24eb3c202a4ded8919128cb053d489` identifies the linked handoff by a different actor.
- Candidate `54771ec...` has parent `5c31307...` and exactly nine allowed changes: meter/test plus
  seven fixtures. No config, Product, dependency, Work/Design/decision, Harness, v1-v7 or
  user-state path changed. `git diff --check` passes.
- Handoff commit `b3b9010...` has the candidate as exact parent, changes only the handoff and retains
  the instrument blob.
- SHA-256 values match the handoff: script `67d0bb...6686`, config `8b80d4...4796`, focused test
  `8cc7f3...741c`, sorted 124-fixture manifest `89a7b6...9a88`.
- Fresh authority reproduces five Work fences (`0e1551...faae`, `c85e1d...6de5`,
  `dec2ee...ca4`, `2f3a86...a36a`, `124e32...79d9`) and v8 authority `578d98...6d29`.
  V1-v7 bytes remain immutable; no CFG/ICFG, SSA, points-to or semantic-verdict engine appears.

### Official report and gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `ce90d6c31bf5b1e91c0934db42fa14dae46a655bc6afdcfcd2b3940a1dcaf841`; JCS SHA-256
  `888d94e2598fa014ba5701db910bd6b2589867f4f8dd0d13dc99582427ab59c3`. The handoff's sole
  complete machine block is byte-identical.
- Official argv, ten-field tuple, actor separation, identity-claim false value, five rows, counts
  and accepted digests match the trust root. Authored coverage retains evidence/alternative-SHA,
  tuple/blob/report/ancestry, lexical/site/outside, binding-pattern and lifecycle/move controls.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  141/141 in 732.54s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 139.80s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior and hidden controls

Hidden fixtures existed only in `/tmp/omnimind-v8-r16-review.0y4Qwj/repo`; no worktree was created.

- The authored suite retains r1-r15 and r16's exact allowlist positives plus unknown/deeper direct
  and alias negatives.
- Fresh four-wrapper direct/alias/assignment, wrapped/conditional, dot/computed/template/optional,
  exact/unknown/deeper and lexical-shadow controls otherwise behave as intended.
- The two raw-argument direct forms above are unexpected PASS outcomes; corresponding alias forms
  fail and the raw-free direct form passes. No unrelated unexpected false rejection was observed.
- Occurrence matching, finite expressions, binding patterns, lifecycle, evidence, site and outside
  controls remain active in the authored suite.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.
This review claims neither runtime semantics nor selector/reviewer/human identity.

## Review boundary and required return

This verdict covers only candidate `54771ec7a75b9d032b83be0b20386f5cee3bbc4e`, handoff commit
`b3b9010cd3c5b8adb6d885a14a32531772709d48`, assigned Work and accepted authority. It does not
authorize B1 or destructive Product work.

No substantive fix is approved. Return the meter to the v8 Work so candidate-new direct uses and
shared atoms apply the same finite raw/unresolved-global subtree gate, add raw/raw-free paired
controls, freeze a new immutable candidate and obtain another different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r16`
- receipt: `7b9d09752b404864a9125e1ac3166f87`
- predecessor: `ed24eb3c202a4ded8919128cb053d489`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`

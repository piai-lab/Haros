---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r14)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r14"
actor_id: "product_truth_complexity_v8_review_r14"
dispatch_receipt: "9857044762ce4ceeab22a3571873efc7"
predecessor_receipt: "4afd4cc577f44643993e38a288025f2e"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "b28346cb03391c589788e634dc3c8c9cf5cd01a0"
reviewed_handoff_commit: "8e0e2e4398cff82337e9bad2cbc5385f80431830"
reviewed_parent: "fc5f754e944d9f9f4cff8a693177fb77b9f163d1"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "edede031ccd1fb0de2f265ee8aa82598968c106446d8492ad3050e50b51d161a"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r14)

## Verdict

`FAIL` / changes requested for immutable r14 candidate
`b28346cb03391c589788e634dc3c8c9cf5cd01a0`.

The predecessor operation resolves to the linked handoff, the handoff links back to this Work and
candidate, and implementer `product_truth_complexity_v8_impl_r14` differs from reviewer
`product_truth_complexity_v8_review_r14`. Scope, v1-v7 immutability, five Work fences, v8 authority,
official tuple, deterministic B0, authored gates, v7 regression, typecheck and syntax check
reproduce.

R14 closes the r13 selector-after-terminal gap for dot, computed, template, nonliteral and optional
forms. One material global-grammar parity gap remains: the ordinary direct-use visitor accepts an
unresolved `globalThis` chain, while the shared atom/subtree classifier rejects the corresponding
alias initializer. No implementation or handoff was repaired in this review.

## Findings

### P0 — direct visitor silently accepts unresolved global-wrapper chains

`normalizedGlobal` at `scripts/product-truth/measure-complexity-v8.mjs:1350-1366` handles a wrapper
root by removing its first selector. When that selector is not a frozen reserved root, `:1359-1360`
returns `null` immediately. That bypasses `normalizeGlobalParts`' intended
`unresolved-global-alias` result at `:1347-1348`. The ordinary call/new visitor at `:2314-2323`
then receives `null`, records neither ingress nor a global violation, and exits successfully.

Two fresh direct-use variants unexpectedly exited 0:

```text
return globalThis.unknownSelector("fixture");

return globalThis.unknown.Bun.file("fixture");
```

The second case is the stronger counterexample: a frozen `Bun.file` terminal sits behind one
unresolved wrapper segment. Its fresh report has `exactOutsideEquality=true`, no target ingress and
no target violation. The structurally corresponding alias initializer
`const raw = globalThis.unknown.Bun.file` correctly fails `RAW_ALIAS_WRITE_UNKNOWN`, because the
shared recursive subtree classifier reaches the wrapper root. Direct and shared routes therefore
disagree about the same frozen global grammar.

The Design requires unshadowed `globalThis`/`global`/`self`/`window` to normalize only through
static selectors to a reserved root and explicitly says unresolved chains fail. The v8 interface
lists `unknown-selector-or-global-alias` as a global hard failure. Treating the direct form as
raw-free violates both and could hide a reserved terminal behind an undeclared alias segment.

Adjacent controls behave correctly: repeated wrappers and dynamic wrapper selectors fail; r13's
terminal-following dot/computed/template/nonliteral/optional forms fail; exact wrapper terminals,
scoped global-root aliases and optional exact terminals pass; exact lexical shadows retain their
frozen behavior. This finding requires only direct/shared finite grammar parity, not runtime value,
CFG, SSA, reachability or identity authentication.

## Independent verification

### Assignment, immutable scope and authority

- Review receipt `9857044762ce4ceeab22a3571873efc7` has role `check`, this exact Work/output and
  actor `product_truth_complexity_v8_review_r14`. Predecessor receipt
  `4afd4cc577f44643993e38a288025f2e` identifies the linked handoff by different implementer actor.
- Candidate `b28346c...` has parent `fc5f754...` and exactly eight allowed changes: meter/test plus
  six bounded fixture additions. No config, Product, dependency, Work/Design/decision, Harness,
  v1-v7 or user-state path changed. `git diff --check` passes.
- Handoff commit `8e0e2e4...` has the candidate as exact parent, changes only the handoff and retains
  the instrument blob.
- SHA-256 values match the handoff: script `9d42cf...e786`, config `8b80d4...4796`, focused test
  `739686...5b2`, and sorted 111-fixture manifest `e320a9...6afd`.
- Fresh authority reproduces all five fences (`0e1551...faae`, `c85e1d...6de5`,
  `dec2ee...ca4`, `2f3a86...a36a`, `124e32...79d9`) and v8 authority `578d98...6d29`.
  V1-v7 bytes remain immutable; focused source inspection finds no CFG/ICFG, SSA, points-to or
  semantic-verdict engine.

### Official report and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `2cf2e1bbdea4b4cd1d8bb91e0fa0a61a3979f6616aa74c4c84b25d414f2e739f`; JCS SHA-256
  `edede031ccd1fb0de2f265ee8aa82598968c106446d8492ad3050e50b51d161a`. The handoff contains one
  complete machine block byte-identical to both reports.
- Exact official argv, ten-field tuple, actor separation, identity-claim false value, five rows,
  counts and accepted digests match the trust-root Decision. Authored coverage retains official
  cardinality/override/alternative-SHA, tuple/blob/report/ancestry, lexical/site/outside and
  lifecycle/move controls.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  128/128 in 628.30s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 141.41s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r14-review.PPaqIu/repo`; no worktree was
created.

- The authored suite retains the r1-r13 regression surface. R14's four selector-after-terminal
  negatives and exact computed-terminal/lexical-shadow positives behave as claimed.
- Fresh dot, computed string, template, nonliteral and optional extra selectors fail. Repeated and
  dynamic wrappers fail; exact wrapper/scoped-root terminals pass; nested wrapper/conditional,
  unsupported subtree, occurrence, binding-pattern, evidence, site, outside and lifecycle controls
  retain their intended results.
- The two unresolved direct-wrapper forms above are unexpected PASS outcomes, while their alias
  forms fail closed. No unrelated unexpected false rejection was observed.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.
This review makes no runtime-semantics or selector/reviewer/human identity claim.

## Review boundary and required return

This verdict covers only candidate `b28346cb03391c589788e634dc3c8c9cf5cd01a0`, handoff commit
`8e0e2e4398cff82337e9bad2cbc5385f80431830`, assigned Work and accepted authority. It does not
authorize B1 or destructive Product work.

No substantive fix is approved. Return the meter to the v8 Work so unresolved wrapper chains reach
the frozen global hard failure in both direct and shared routes, add paired direct/alias controls,
freeze a new immutable candidate, and obtain another different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r14`
- receipt: `9857044762ce4ceeab22a3571873efc7`
- predecessor: `4afd4cc577f44643993e38a288025f2e`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`

---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r15)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r15"
actor_id: "product_truth_complexity_v8_review_r15"
dispatch_receipt: "0683f1fd200d4a17887980ee991e044c"
predecessor_receipt: "685092e432e8448aa23ba93dea0613ef"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "9f7f05384c72238c12ed075eb942d79abf878b35"
reviewed_handoff_commit: "84315796613edea13b24f4337f11adb8971c0a7a"
reviewed_parent: "7088290818b8405c19b6b1adb86e6475d308b62c"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "187cb7b42c017b2a1033fab174a6987bf4cddd71e7dda04e591035c3b18fa10e"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r15)

## Verdict

`FAIL` / changes requested for immutable r15 candidate
`9f7f05384c72238c12ed075eb942d79abf878b35`.

The predecessor operation resolves to the linked handoff, the handoff links to this Work and
candidate, and implementer `product_truth_complexity_v8_impl_r15` differs from reviewer
`product_truth_complexity_v8_review_r15`. Scope, hashes, v1-v7 immutability, fences, authority,
official tuple, deterministic B0, authored gates, v7 regression, typecheck and syntax check
reproduce.

R15 closes the unresolved raw-wrapper direct-use escapes reported in r14. One material false-
rejection remains: strict wrapper handling treats every non-reserved first selector as an invalid
raw alias, including known non-inventory globals that the handoff says retain their prior harmless
behavior. No implementation or handoff was repaired in this review.

## Findings

### P0 — strict wrapper mode rejects known non-inventory globals

`normalizedGlobal` at `scripts/product-truth/measure-complexity-v8.mjs:1350-1373` now receives
`strictWrapper=true` for candidate-new direct uses. At `:1366-1369`, any wrapper whose first
selector is not a raw reserved root becomes `unresolved-global-alias`; there is no disposition for
a known non-inventory global. The direct visitor then emits `GLOBAL_ALIAS_INVALID`. The shared
atom/subtree route similarly treats the wrapper root as raw and rejects a harmless alias
initializer.

Five fresh known-safe variants unexpectedly failed:

```text
globalThis.console.log("fixture");
window.console["log"]("fixture");
self.Math.max(1, 2);
global.JSON.stringify({ value: 1 });
const log = globalThis.console.log;
```

The four direct forms fail `GLOBAL_ALIAS_INVALID`; the alias form fails
`RAW_ALIAS_WRITE_UNKNOWN`. These are candidate-new occurrences in the selected Work, not
predecessor-matched B0 sites. The authored `console.log("fixture")` control passes, proving
`console` is intentionally a known non-inventory global; adding an equivalent wrapper changes only
the spelling of the same global fact but changes the verdict.

This contradicts the r15 handoff's explicit statement that known non-inventory globals retain
their prior behavior and the dispatch's required wrapper/non-inventory parity. It also expands a
raw-effect hard failure into ordinary safe global APIs. A bounded known-noninventory disposition
is required before declaring an unknown wrapper selector invalid; this asks for no runtime lookup,
value flow, CFG, SSA or identity authentication.

Adjacent controls behave correctly: `globalThis.unknown.Bun.file(...)`, unknown first selectors and
unknown terminals now fail; exact `globalThis.Bun.file(...)`, computed reserved terminals, genuine
wrapper shadows and bare `console.log(...)` pass. Terminal-following dot/computed/template/
nonliteral/optional forms, aliases, nested wrappers/conditionals and unsupported raw subtrees retain
their intended gates.

## Independent verification

### Assignment, scope and authority

- Review receipt `0683f1fd200d4a17887980ee991e044c` has role `check`, this Work/output and actor
  `product_truth_complexity_v8_review_r15`. Predecessor `685092e432e8448aa23ba93dea0613ef`
  identifies the linked handoff by different implementer actor.
- Candidate `9f7f053...` has parent `7088290...` and exactly eight allowed changes: meter/test plus
  six fixtures. No config, Product, dependency, Work/Design/decision, Harness, v1-v7 or user-state
  path changed. `git diff --check` passes.
- Handoff commit `8431579...` has the candidate as exact parent, changes only the handoff and retains
  the candidate instrument blob.
- SHA-256 values match the handoff: script `75d095...4e8a`, config `8b80d4...4796`, focused test
  `9f6be7...c636`, and sorted 117-fixture manifest `213c3a...044f`.
- Fresh authority reproduces five Work fences (`0e1551...faae`, `c85e1d...6de5`,
  `dec2ee...ca4`, `2f3a86...a36a`, `124e32...79d9`) and v8 authority `578d98...6d29`.
  V1-v7 bytes remain immutable; no CFG/ICFG, SSA, points-to or semantic-verdict engine appears.

### Official report and gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `787a514e8fed2534c059fe609e48123ebe6b04eb301e5a1b658095a9bd7aafda`; JCS SHA-256
  `187cb7b42c017b2a1033fab174a6987bf4cddd71e7dda04e591035c3b18fa10e`. The handoff's sole
  complete machine block is byte-identical.
- Official argv, ten-field tuple, actor separation, identity-claim false value, five rows, counts
  and accepted digests match the trust root. Authored coverage retains input/alternative-SHA,
  tuple/blob/report/ancestry, lexical/site/outside, binding-pattern and lifecycle/move controls.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  134/134 in 639.86s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 139.68s.
- `bun run --cwd scripts typecheck` and
  `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior and hidden controls

Hidden fixtures existed only in `/tmp/omnimind-v8-r15-review.4WVFAU/repo`; no worktree was created.

- The authored suite retains the r1-r14 surface and r15's unknown-first/hidden-terminal/
  unknown-terminal negatives plus wrapper-shadow/exact-terminal/bare-console positives.
- Fresh globalThis/window/self/global, dot/computed and alias forms reproduce the five false
  rejections above. Raw unresolved chains, exact roots/terminals, shadows and prior selector cases
  otherwise behave as intended. No unrelated unexpected false rejection was observed.
- Occurrence matching, finite wrappers/conditionals, unsupported raw subtrees, binding patterns,
  lifecycle, evidence, site and outside controls remain active in the authored suite.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.
This review claims neither runtime semantics nor selector/reviewer/human identity.

## Review boundary and required return

This verdict covers only candidate `9f7f05384c72238c12ed075eb942d79abf878b35`, handoff commit
`84315796613edea13b24f4337f11adb8971c0a7a`, assigned Work and accepted authority. It does not
authorize B1 or destructive Product work.

No substantive fix is approved. Return the meter to the v8 Work so all four wrappers distinguish
known non-inventory globals from unresolved raw aliases in both direct and shared paths, add paired
positive/negative controls, freeze a new immutable candidate and obtain another different-actor
Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r15`
- receipt: `0683f1fd200d4a17887980ee991e044c`
- predecessor: `685092e432e8448aa23ba93dea0613ef`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`

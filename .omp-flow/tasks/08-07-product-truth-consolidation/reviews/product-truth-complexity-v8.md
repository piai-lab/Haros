---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r17)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r17"
actor_id: "product_truth_complexity_v8_review_r17"
dispatch_receipt: "b66c36a92e294dc5a530fdd0c97c62af"
predecessor_receipt: "8611f2ff63a34e539e86de3a2f49e4e8"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "9ead992939e5765d5b9a75a5e2249b898a71aea3"
reviewed_handoff_commit: "3f6c4c52be4ae4513aff3a86f34b5c7c4808d520"
reviewed_parent: "5117aad8eb8175d242482b309601f352a2f3bfa2"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "413d09f5093e3e466a50773f6392e6f68f9bb0fb77b4b795a72e5ec0fca1a85f"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r17)

## Verdict

`FAIL` / final stop-loss for immutable r17 candidate
`9ead992939e5765d5b9a75a5e2249b898a71aea3`.

The completed predecessor receipt resolves to the linked handoff, which links this Work and frozen
candidate. Implementer `product_truth_complexity_v8_impl_r17` differs from reviewer
`product_truth_complexity_v8_review_r17`. Exact scope, hashes, v1-v7 immutability, five Work fences,
authority tuple, deterministic B0, authored gates, v7 regression, typecheck and syntax check
reproduce.

R17 closes r16's two direct-argument false accepts. One material adjacent seam remains at the exact
anonymous-callback lexical boundary introduced by r17: bare global raw terminals and unresolved
wrapper chains inside that callback are neither rejected nor inventoried. Per the dispatch's
stop-loss rule, this Review returns `FAIL` and does not request another meter patch. No
implementation or handoff was repaired.

## Findings

### P0 — callback deferral drops bare global raw and unresolved expressions

`directExpressionContainsRaw` at `scripts/product-truth/measure-complexity-v8.mjs:2189-2200`
returns false for the complete subtree of every function-like direct argument. This correctly avoids
classifying a callback body as the caller's raw argument, but the promised independent owner scan is
not grammar-equivalent: `visitUses` at `:2403-2415` applies global normalization only when a global
property chain is the callee of a `CallExpression` or `NewExpression`. A bare terminal or unresolved
chain in a callback expression/default therefore reaches no global gate.

Fresh hidden fixtures produced four unexpected PASS outcomes:

```text
globalThis.console.log(() => Bun.file);
globalThis.console.log((value = Bun.file) => value);
globalThis.console.log(() => ({ nested: [Bun.file] }));
globalThis.console.log(() => globalThis.unknown.Bun.file);
```

All four exited 0 with `exactOutsideEquality=true`. The three exact-terminal reports contained no
`scripts/product-truth/sqlite-classifier.ts` ingress and retained total ingress 815; the unresolved
wrapper report likewise contained neither ingress nor a hard global violation. Thus the meter
cannot distinguish these expressions from the raw-free callback control.

Adjacent controls isolate the seam. `() => Bun.file("fixture")` passes but correctly records one
`Bun#file` filesystem ingress at the inherited `classifyLegacyDatabase` owner (total ingress 816);
`() => globalThis.unknown.Bun.file()` correctly fails `GLOBAL_ALIAS_INVALID`; `() => readFileSync`
correctly records the imported raw binding; a callback parameter named `Bun` and a known-
noninventory callback expression pass without ingress. A nested raw expression in an ordinary
non-callback argument correctly fails `RAW_ALIAS_WRITE_UNKNOWN`.

This contradicts the interface rule that anonymous callbacks inherit the nearest owner for raw-use
classification, the global hard failure for unknown selectors/aliases, and the r17 handoff claim
that callback bodies remain covered by the existing qualified-owner scan. It permits a candidate-
new raw handle or unresolved global chain to disappear from the canonical inventory solely by
placing it in an anonymous callback. The counterexample requires only AST/binding classification;
it asks for no callback execution, call graph, CFG, SSA, points-to, reachability, value or identity
semantics.

## Independent verification

### Assignment, scope and authority

- Review receipt `b66c36a92e294dc5a530fdd0c97c62af` has role `check`, this Work/output and
  actor `product_truth_complexity_v8_review_r17`. Predecessor
  `8611f2ff63a34e539e86de3a2f49e4e8` identifies the linked handoff by a different actor.
- Candidate `9ead992...` has parent `5117aad...` and exactly six allowed changes: meter/test plus
  four fixtures. No config, Product, dependency, Work/Design/decision, Harness, v1-v7 or user-state
  path changed. Handoff commit `3f6c4c5...` has the candidate as its exact parent and changes only
  the handoff. Both diffs pass `git diff --check`.
- SHA-256 values match the handoff: script `902efe...fa3b`, config `8b80d4...4796`, focused test
  `64dd51...56f7`, and sorted 128-fixture manifest `419c28...a095`. Every fixture parses and has a
  final newline.
- Fresh canonical extraction reproduces all five Work fences (`0e1551...faae`,
  `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...a36a`, `124e32...79d9`) and v8 authority
  `578d98...6d29`. V1-v7 bytes remain unchanged; the r17 diff and instrument add no CFG/ICFG, SSA,
  points-to or semantic-verdict engine.

### Commands and deterministic report

- The exact official command was run twice:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  Both runs pass and are byte-identical: 4,273,664 bytes, byte SHA-256
  `38678132439976e857ca04966e462883ab7ad1385da155dc3832e74e2b8949ec`; decoded-report JCS
  SHA-256 `413d09f5093e3e466a50773f6392e6f68f9bb0fb77b4b795a72e5ec0fca1a85f`. The
  handoff's sole complete machine block is byte-identical.
- Official argv, ten-field tuple, actor separation, identity-claim false value, five transition
  rows, B0 812/107 ingress and 712/93 violation counts/digests match the trust-root Decision.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  145/145 in 785.21s.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 140.37s.
- `bun run typecheck` — PASS, seven of seven packages in 6.423s.
- `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior regressions and bounded hidden controls

Hidden fixtures existed only in `/tmp/omnimind-v8-r17-review.92hVf5/repo`; no worktree was created.

- The authored suite retains the exact r1-r16 finding families and adjacent positives. R17's
  direct forms `globalThis.console.log(Bun.file)` and
  `globalThis.console.log(globalThis.unknown.Bun.file)` now fail as required, while raw-free and
  known-noninventory direct arguments pass.
- Fresh nested ordinary arguments, callback terminal call, unresolved call, imported binding,
  shadow and known-noninventory controls behave as described above. The unexpected outcomes are
  confined to bare global atoms/subtrees after the anonymous-callback boundary; no open-ended
  speculative grammar expansion was performed.
- Authored official-input/evidence, tuple/blob/ancestry, qualified owner, structural site/order,
  outside equality, lifecycle/move, binding-pattern, finite-expression and no-CFG controls remain
  active.

No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.
This Review claims neither runtime behavior nor selector/reviewer/human identity authentication.

## Review boundary and stop-loss return

This verdict covers only candidate `9ead992939e5765d5b9a75a5e2249b898a71aea3`, handoff commit
`3f6c4c52be4ae4513aff3a86f34b5c7c4808d520`, assigned Work and accepted authority. It does not
authorize B1 or destructive Product work.

No substantive fix is approved. Under Main's explicit r17 stop-loss, return this remaining finite
callback/global grammar mismatch to Occam/Design rather than dispatching an r18 implementation.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r17`
- receipt: `b66c36a92e294dc5a530fdd0c97c62af`
- predecessor: `8611f2ff63a34e539e86de3a2f49e4e8`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`
- explicitly allowed fix: none

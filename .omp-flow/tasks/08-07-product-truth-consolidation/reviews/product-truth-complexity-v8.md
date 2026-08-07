---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r8)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r8"
actor_id: "product_truth_complexity_v8_review_r8"
dispatch_receipt: "5e87456332444401bcdbbd2968135445"
predecessor_receipt: "d4ec453e630c4820a93d53fb24c8f91f"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "d2c31d4d5c9c85c4caa5f9033e091ec6fb6da4a6"
reviewed_handoff_commit: "1b1ee22e779c93f16993ee46a17c3fc089c6d650"
reviewed_parent: "a526e88c2f2e8442e18a4f38ab3b44d4d97109ee"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "ff99a7443f00914e2075f6f080641c5baf6bf0b1c217c057c311c6b57f4ae902"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r8)

## Verdict

`FAIL` / changes requested for immutable r8 candidate
`d2c31d4d5c9c85c4caa5f9033e091ec6fb6da4a6`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r8 candidate, and implementer `product_truth_complexity_v8_impl_r8` differs from
reviewer `product_truth_complexity_v8_review_r8`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 84-case suite, v7
regressions and typecheck reproduce.

R8 closes all six exact r7 assignment examples. Exact simple assignment across named terminal,
namespace, namespace destructuring and CommonJS sources reaches private-helper/export gates;
multiple/compound/update writes, initialized or unsupported targets, declaration order and lexical
shadow controls reach their intended outcomes. One material adjacent gap remains: a raw RHS wrapped
in an unsupported finite expression is neither propagated nor rejected. Because the raw reference
itself sits under the allowed owner, the assignment target can later escape to a private helper
without any violation. No implementation, handoff, meter, Product or user-state file was repaired
in this review.

## Findings

### P0 — unsupported raw assignment RHS silently drops identity instead of failing closed

`rawIdentityForAssignmentExpression` at
`scripts/product-truth/measure-complexity-v8.mjs:1601-1627` accepts parentheses, exact identifiers,
bounded members and direct CommonJS forms, then returns `null` for every other expression. The
assignment visitor at lines 1742-1759 hard-fails only when the unsupported RHS is itself a nested
simple assignment. `AsExpression`, `NonNullExpression`, `SatisfiesExpression`, conditional and
other unsupported shapes therefore take neither the propagation path nor a fail-closed path.

Four fresh variants unexpectedly exited 0 with exact outside comparison. Each assigns under the
exact allowed `classifyLegacyDatabase` owner and invokes the target under undeclared named
`hiddenHelper`:

```text
raw = readFileSync as typeof readFileSync;
raw = readFileSync!;
raw = readFileSync satisfies typeof readFileSync;
raw = true ? readFileSync : readFileSync;
```

Representative complete shape:

```text
import { readFileSync } from "node:fs";
let raw;
export function classifyLegacyDatabase() {
  raw = readFileSync as typeof readFileSync;
  return "safe";
}
function hiddenHelper() {
  return raw("forbidden");
}
export const observed = hiddenHelper();
```

The meter traverses and records `readFileSync` itself at the allowed owner, so there is no direct
owner error. Because the RHS resolver returns `null`, `raw` receives no declaration-scoped identity;
the later private call is invisible. An inner-declaration shadow assignment and the authored nearer
RHS-parameter shadow both exit 0, showing that real lexical shadows remain distinguishable.

This contradicts the interface rule that unresolved module/local raw aliases and unsupported
property/destructure/update escapes fail closed
(`interfaces/product-truth-complexity-v8.md:194,294-298`) and the r8 dispatch requirement that
unsupported assignment forms must fail closed without CFG/SSA. Type-only wrappers can be handled by
the same finite unwrapping already used elsewhere, while conditional or other unsupported RHS forms
can be rejected structurally. Neither response requires value flow, execution order, CFG, SSA or
runtime semantics.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `5e87456332444401bcdbbd2968135445` is active with role `check`, this exact
  Work/output and actor `product_truth_complexity_v8_review_r8`. Its predecessor operation
  `d4ec453e630c4820a93d53fb24c8f91f` is completed with role `implement`, actor
  `product_truth_complexity_v8_impl_r8`, and the required linked handoff output. The actors differ.
- Candidate `d2c31d4...` has parent `a526e88...` and exactly nine allowed changed paths: the v8 meter
  and focused test plus seven bounded fixture additions. No config, Product, dependency,
  direct-tool, Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check a526e88... d2c31d4...` — PASS. Candidate meter/config/test/fixture blobs at
  handoff commit `1b1ee22...` equal the reviewed candidate blobs, and the handoff is its direct
  descendant.
- Candidate SHA-256 values reproduce the handoff: script
  `82aad000335b92c38593332836b96a6e7968eddcb933dc159d6eecf303fc165f`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `a459e1b463f9e9ca35159f827deb569ebd3e20a7cb0100c7d0c168b5019bbf2b`; the sorted 67-fixture
  manifest reproduces `6703ad89...341f`.
- Candidate diff and authored immutable-byte assertions preserve every v1-v7
  instrument/config/test byte. The official report reproduces the five accepted Work-fence digests
  in authored order (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36`,
  `124e32...79d9`) and v8 predecessor authority `578d98...6d29`.
- Source inspection, focused assertion and `rg` find no CFG/ICFG, SSA, points-to, branch/value,
  Promise/task, Effect, lifetime or runtime-verdict engine.

### Official report, handoff and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Fresh outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `23627c20201be6fa912ce310e46a66a52b9083e0fa36566e24f8d76afb13dde0`; decoded JCS SHA-256
  `ff99a7443f00914e2075f6f080641c5baf6bf0b1c217c057c311c6b57f4ae902`.
  The handoff contains exactly one complete machine block, its decoded JCS equals both fresh reports,
  and frontmatter `report_sha256` matches.
- The report records the exact argv once, `fixtureMode=false`, `official=true`,
  `environmentFallbackUsed=false` and `identityAuthenticationClaimed=false`. Its ten-field tuple
  matches the trust-root Decision: Work id, B0 candidate, official evidence SHA, reviewed v7
  candidate, handoff/review blobs, predecessor report digest, distinct declared actors and receipt
  occupy the correct slots.
- The fresh report reproduces B0's 812 ingress / 107 paths and 712 owner violations / 93 paths with
  accepted ingress digest `d1b60f...2d3a` and violation digest `a3f100...e43`.
- `bunx vitest run scripts/product-truth/measure-complexity-v8.test.ts --reporter=dot` — PASS,
  84/84 in 353.79s after reviewer-only fixtures were removed from the temp fixture directory.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 142.80s.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).
- `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior reproductions, r8 controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r8-review.h9JuPf/repo`; no additional
worktree was created.

- R1-R7 negatives and positives retain their intended authored outcomes: outside measurement drift,
  undeclared deletion/materialization moves, repeated alias/private helper, finite wrapper move
  witnesses, raw binding-pattern escapes and all six r7 assignment escapes fail; import/local
  shadows, combined lifecycle positives, value-different wrapper compositions, exact
  deletion/materialization and the sole B1-to-C move pass.
- Independent r7 reproductions confirmed named-terminal single/multiple assignment, namespace
  destructuring/alias assignment, CommonJS assignment and assigned-terminal export all fail; the
  authored assignment shadow passes.
- Fresh controls confirmed compound assignment, update after raw assignment, initialized target,
  parameter target and declaration-after-assignment fail. A separate inner declaration with the
  same spelling remains an accepted lexical shadow. Unknown static namespace member/literal
  assignments do not pass. No unexpected false rejection was observed.
- Fresh `as`, non-null, `satisfies` and conditional RHS variants produced the four unexpected PASS
  outcomes in the finding.
- A duplicate official evidence argument fails `OFFICIAL_INVOCATION_INVALID`; internally consistent
  alternative SHA `68b9fd1...` fails `OFFICIAL_EVIDENCE_SHA_NOT_ACCEPTED_V7_BOOTSTRAP`; tuple drift
  fails `EVIDENCE_REVIEW_BLOB_MISMATCH`. Nontraced reorder, outside measurement and outside raw drift
  fail at their exact gates.
- The authored suite additionally covers missing/abbreviated/malformed/nonexistent evidence,
  override/fallback, report/actor/receipt/ancestry drift, lexical owner/default/class/overload/
  re-export cases, site relocation/replacement/order, outside equality/deletion/materialization/
  import/raw and dependency/no-CFG boundaries.

This review does not demand or claim runtime semantics or selector/reviewer/human identity
authentication. No real `~/.omnimind`, credential, provider, network or user-state resource was
read or changed.

## Review boundary and required return

This verdict covers only candidate `d2c31d4d5c9c85c4caa5f9033e091ec6fb6da4a6`, linked handoff
commit `1b1ee22e779c93f16993ee46a17c3fc089c6d650`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to recognize finite type-only RHS wrappers or fail them closed, reject every
other unsupported RHS containing resolved raw syntax, add focused private-helper/export and
harmless-shadow regressions, freeze a new immutable meter candidate, and obtain a new
different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r8`
- receipt: `5e87456332444401bcdbbd2968135445`
- predecessor: `d4ec453e630c4820a93d53fb24c8f91f`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`

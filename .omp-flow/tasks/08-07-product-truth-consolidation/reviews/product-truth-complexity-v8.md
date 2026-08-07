---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r7)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r7"
actor_id: "product_truth_complexity_v8_review_r7"
dispatch_receipt: "2855418ceea048098b6383418ca57e64"
predecessor_receipt: "73f2ef689dc649209ca779775e538fd6"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "c84fb9773eb6f8aba0627b2214f543481d179224"
reviewed_handoff_commit: "7ef39fa8c7af06fdbd76a750f92515fd015bb597"
reviewed_parent: "510726e54ca3418d48ad170b6d93f21bce939751"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "b281ba11e433b1ea2923afd48007f3d934dfd6f5a7557f84124a1053589c1196"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r7)

## Verdict

`FAIL` / changes requested for immutable r7 candidate
`c84fb9773eb6f8aba0627b2214f543481d179224`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r7 candidate, and implementer `product_truth_complexity_v8_impl_r7` differs from
reviewer `product_truth_complexity_v8_review_r7`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 77-case suite, v7
regressions and typecheck reproduce.

R7 closes the exact r6 declaration-initializer examples. Namespace, default-import, named-terminal
and CommonJS identities now share one binding-pattern rule; empty/array/rest/nested/default,
computed selector, export/private-helper and harmless-shadow controls reach their intended gates.
One material adjacent gap remains: assigning an already-resolved raw binding to an existing lexical
declaration does not propagate identity or fail closed. A raw RHS placed under the allowed owner can
therefore seed a public or private alias that the meter subsequently treats as harmless. No
implementation, handoff, meter, Product or user-state file was repaired in this review.

## Findings

### P0 — assignment from a resolved raw binding loses identity and bypasses owner/export/write gates

The declaration-scoped raw propagation loop handles only `VariableDeclaration` initializers at
`scripts/product-truth/measure-complexity-v8.mjs:1543-1550`. The separate assignment-write pass does
collect `BinaryExpression` assignments at lines 1676-1684, but its `identityForExpression` helper at
lines 1618-1633 resolves only its separate scoped-global alias model; it never consults
`resolvedBindingAt` for imported/namespace/CommonJS raw identities. Consequently the write's RHS is
recorded as raw at its own allowed owner by `visitUses`, while the assignment target receives no
declaration identity. The later private use and export checks cannot recognize that target, and the
single-/multi-/destructure-write hard failures do not fire.

Six fresh structural variants unexpectedly exited 0 with exact outside comparison:

1. a named `node:fs#readFileSync` binding assigned once to module `raw` inside
   `classifyLegacyDatabase`, followed by `raw(...)` in named `hiddenHelper`;
2. the same terminal assigned twice before the private-helper use, despite the explicit multi-write
   fail-closed rule;
3. `({ readFileSync: raw } = fs)` inside the allowed owner, followed by the private-helper use;
4. a namespace import assigned to `fsAlias` inside the allowed owner, followed by
   `fsAlias.readFileSync(...)` in the private helper;
5. `require("node:fs").readFileSync` assigned inside the allowed owner, followed by the private use;
6. a named terminal assigned to `raw` inside the allowed owner and exposed through
   `export { raw as publicReader }`.

Representative minimal form:

```text
import { readFileSync } from "node:fs";
let raw;
export function classifyLegacyDatabase() {
  raw = readFileSync;
  return "safe";
}
function hiddenHelper() {
  return raw("forbidden");
}
export const observed = hiddenHelper();
```

The raw RHS itself is structurally observed under the exact allowed owner, so this is not an
unclassified direct use; the bypass is the missing lexical identity on `raw`. A harmless assignment
from a nearer same-name local function exited 0, confirming that preserving declaration shadowing
does not require accepting raw-source assignments.

This contradicts the v8 interface's `aliasUseDisposition`, which requires module/local raw aliases
to resolve lexically and unresolved, multi-write, property/destructure/update escapes to fail
(`interfaces/product-truth-complexity-v8.md:194,294-298`). Finite binding of a single exact assignment
or fail-closed rejection of assignment/multi-write/destructure-write shapes is already part of the
meter's structural alias model; this finding requires no CFG, points-to analysis or runtime
semantics.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `2855418ceea048098b6383418ca57e64` is active with role `check`, this exact
  Work/output and actor `product_truth_complexity_v8_review_r7`. Its predecessor operation
  `73f2ef689dc649209ca779775e538fd6` is completed with role `implement`, actor
  `product_truth_complexity_v8_impl_r7`, and the required linked handoff output. The actors differ.
- Candidate `c84fb97...` has parent `510726e...` and exactly six allowed changed paths: the v8 meter
  and focused test plus four bounded fixture additions. No config, Product, dependency, direct-tool,
  Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 510726e... c84fb97...` — PASS. Candidate meter/config/test/fixture blobs at
  handoff commit `7ef39fa...` equal the reviewed candidate blobs, and the handoff is its direct
  descendant.
- Candidate SHA-256 values reproduce the handoff: script
  `afb7c5d0b4480ba6266ccdd98f757a31df4af1840230c759a3421c55259765c9`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `585b4ac2f2c6c20225f84cdd78b78ceeb70e29f3f462bd39594131bbefe688d6`; the sorted 60-fixture
  manifest reproduces `308b4c43...e121`.
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
  `f539851575204b328c56b4b5abaee61c26f3c15b1745f532f4212431ad53fcfd`; decoded JCS SHA-256
  `b281ba11e433b1ea2923afd48007f3d934dfd6f5a7557f84124a1053589c1196`.
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
  77/77 in 307.67s after reviewer-only fixtures were removed from the temp fixture directory.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 143.15s.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).
- `node --check scripts/product-truth/measure-complexity-v8.mjs` — PASS.

### Prior reproductions, r7 controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r7-review.IZQBAN/repo`; no additional
worktree was created.

- R1-R6 negatives and positives retain their intended authored outcomes: outside measurement drift,
  undeclared deletion/materialization moves, repeated alias/private helper, finite wrapper move
  witnesses, direct raw exports, namespace/default/terminal binding-pattern escapes and private raw
  helpers fail; import/local shadows, combined lifecycle positives, value-different wrapper
  compositions, exact deletion/materialization and the sole B1-to-C move pass.
- Independent selected reruns confirmed repeated-alias private-helper failure
  (`TRACED_OWNER_IDENTITY_INVALID`), nested wrapper move failure
  (`UNDECLARED_WORK_PATH_MOVE:...:normalized-literal-structure`), CommonJS namespace export failure,
  and import shadow, combined lifecycle and nested-wrapper value-different positives.
- Fresh declaration-pattern variants confirmed default-import private helper, default-import direct
  export and named-terminal export alias now fail, while the terminal-shaped shadow passes. Empty,
  array, rest, nested and non-namespace default patterns fail `RAW_ALIAS_WRITE_UNKNOWN`; a
  literal-computed terminal pattern reaches `RAW_BINDING_EXPORTED`; a nonliteral-computed pattern
  fails `COMPUTED_EFFECT_SELECTOR`. No unexpected false rejection was observed.
- Fresh assignment variants produced the six unexpected PASS outcomes in the finding. The
  adjacent harmless assignment/shadow positive passed. These variants cover named terminal,
  namespace, CommonJS, simple/multi/destructure assignment, private helper and export specifier.
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

This verdict covers only candidate `c84fb9773eb6f8aba0627b2214f543481d179224`, linked handoff
commit `7ef39fa8c7af06fdbd76a750f92515fd015bb597`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to propagate declaration-scoped raw identity through exact assignment aliases
or fail closed for unresolved/multi/destructure assignment writes, add focused private-helper and
public-export regressions across imported/namespace/CommonJS sources, freeze a new immutable meter
candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r7`
- receipt: `2855418ceea048098b6383418ca57e64`
- predecessor: `73f2ef689dc649209ca779775e538fd6`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`

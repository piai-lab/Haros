---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r6)"
work: "../work/product-truth-complexity-v8.md"
handoff: "../handoffs/product-truth-complexity-v8.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v8-r6"
actor_id: "product_truth_complexity_v8_review_r6"
dispatch_receipt: "fe99f3df9a6548d78ddc1e621f65b21e"
predecessor_receipt: "aeb9a17351a54057aa6d3ff1ebee4dc0"
predecessor_output: "../handoffs/product-truth-complexity-v8.md"
reviewed_candidate: "745473e86ef800ed6176529782cc1c249df9e20a"
reviewed_handoff_commit: "ec68b34a02b8039c3c60d77db94586d10103e1e1"
reviewed_parent: "2fa0538dadd5affc476f2acc24f617a2e212cb37"
accepted_design: "23b309b0da3ae65a7809002090a539f6c7ee7c51"
report_sha256: "306f62366963c6985d18d07f117f2a18add0aceabfaef3294138ef4a0b26591c"
---

# Review: Authoritative Product-truth complexity v8 predecessor-delta meter (r6)

## Verdict

`FAIL` / changes requested for immutable r6 candidate
`745473e86ef800ed6176529782cc1c249df9e20a`.

The completed predecessor operation resolves to the linked handoff, the handoff links back to the
assigned Work and r6 candidate, and implementer `product_truth_complexity_v8_impl_r6` differs from
reviewer `product_truth_complexity_v8_review_r6`. Candidate scope, v1-v7 immutability, five Work
fences, v8 authority, official evidence tuple, deterministic B0, authored 73-case suite, v7
regressions and typecheck reproduce.

R6 closes the exact r5 namespace-derived binding gap. ESM/CommonJS namespace aliases now propagate
through supported object-binding selectors; direct/member/literal-computed, default, nested, rest,
unknown/nonliteral, export/private-helper and harmless-shadow controls reach their intended gates.
One material adjacent gap remains: object destructuring from an already-classified raw binding that
is not marked `namespace` is silently ignored. That permits both raw use under an undeclared private
helper and raw public-export escapes. No implementation, handoff, meter, Product or user-state file
was repaired in this review.

## Findings

### P0 — destructuring a known non-namespace raw binding drops its identity and can pass the gate

The r6 helper starts with `if (!base?.namespace) return false` at
`scripts/product-truth/measure-complexity-v8.mjs:1464-1465`. The alias pass invokes it only when
`initializerBinding?.namespace` is true at lines 1531-1532. A default import such as `fs` is already
bound at lines 1404-1407 with the accepted raw classes for `node:fs#default`, and a named import such
as `readFileSync` is likewise a declaration-scoped raw binding, but neither identity has the
`namespace` flag. When either becomes an object-binding initializer, the introduced declarations
receive no identity and no fail-closed diagnostic. The later export check at line 1734 can reject
only declarations already present in `bindingIdentityByDeclaration`.

Three fresh structural variants unexpectedly exited 0 with an exact outside comparison:

```text
import fs from "node:fs";
function hiddenHelper() {
  const { readFileSync: raw } = fs;
  return raw("forbidden");
}
export function classifyLegacyDatabase() { return hiddenHelper(); }
```

```text
import fs from "node:fs";
export const { readFileSync: raw } = fs;
export function classifyLegacyDatabase() { return "safe"; }
```

```text
import { readFileSync } from "node:fs";
export const { call: invoke } = readFileSync;
export function classifyLegacyDatabase() { return "safe"; }
```

The first bypasses the exact declared-owner/private-helper rule. The second exposes a declaration
derived from the already-known `node:fs#default` raw binding. The third is the interface's explicit
property/destructure escape from an already-known raw terminal, which must fail closed regardless of
whether the selected property is interpreted. In all three reports, the mutated traced path has no
raw ingress or violation record. An adjacent local same-name object plus destructuring positive
exited 0, so preserving a real lexical shadow does not require accepting these raw-source cases.

This contradicts the v8 interface's `aliasUseDisposition`, which requires any unresolved,
property/destructure/update escape from a module/local raw alias to fail, and its rule that every raw
alias use is classified at the lexical use owner
(`interfaces/product-truth-complexity-v8.md:194,294-298`). Rejecting an object-binding initializer
that resolves to a known raw, non-namespace identity is finite lexical syntax handling; it requires
no CFG, points-to analysis or runtime semantics.

## Independent verification

### Assignment, immutable scope and authority

- Review operation `fe99f3df9a6548d78ddc1e621f65b21e` is active with role `check`, this exact
  Work/output and actor `product_truth_complexity_v8_review_r6`. Its predecessor operation
  `aeb9a17351a54057aa6d3ff1ebee4dc0` is completed with role `implement`, actor
  `product_truth_complexity_v8_impl_r6`, and the required handoff output. The actors differ.
- Candidate `745473e...` has parent `2fa0538...` and exactly six allowed changed paths: the v8 meter
  and focused test plus four bounded fixture additions. No config, Product, dependency, direct-tool,
  Work/Design/decision, Harness/schema, v1-v7 or user-state path changed.
- `git diff --check 2fa0538... 745473e...` — PASS. Candidate meter/config/test blobs at handoff
  commit `ec68b34...` equal the reviewed candidate blobs.
- Candidate SHA-256 values reproduce the handoff: script
  `0cb43837f0092272bbf8185757a12340d2712b075c9ccddf32f52080aed19570`, config
  `8b80d4eb401eefb36ed4597e2032e0c7eb25e13dbdd437d2b1e90e315d094796`, focused test
  `1da14722e4603d391b74da71a8f3c67ed1459555d823ccae457c605fa316629d`; the sorted 56-fixture
  manifest reproduces `0d9da3d6...59b34`.
- Candidate diff and authored immutable-byte assertions preserve every v1-v7
  instrument/config/test byte. The official report reproduces the five accepted Work-fence digests
  in authored order (`0e1551...faae`, `c85e1d...6de5`, `dec2ee...ca4`, `2f3a86...5a36`,
  `124e32...79d9`) and v8 predecessor authority `578d98...6d29`.
- Source inspection and the focused assertion find no CFG/ICFG, SSA, points-to, branch/value, task,
  Effect, lifetime or runtime-verdict engine.

### Official report, handoff and authored gates

- Exact official command:

  ```text
  node scripts/product-truth/measure-complexity-v8.mjs --ref 7582170a277477ba0d71cf70f53e4e0836874a72 --predecessor-evidence 5632f63603e6ae8b3fb95f759c793a09b16a1e44
  ```

  — PASS twice. Fresh outputs are byte-identical: 4,273,664 bytes, byte SHA-256
  `0cc1ee8cd0962d6deea925d0811c492f65579412970f7b0a6bd188a8882ce244`; decoded JCS SHA-256
  `306f62366963c6985d18d07f117f2a18add0aceabfaef3294138ef4a0b26591c`.
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
  73/73 in 279.29s after reviewer-only fixtures were removed from the temp fixture directory.
- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts --reporter=dot` — PASS,
  67/67 in 139.00s.
- `bun run --cwd scripts typecheck` — PASS (`tsc --noEmit`).

### Prior reproductions, r6 controls and hidden variants

All hidden fixtures existed only in `/tmp/omnimind-v8-r6-review.2zWlRN/repo`; no additional
worktree was created.

- R1-R5 negatives and positives retain their intended authored outcomes: outside measurement drift,
  undeclared deletion/materialization moves, repeated alias/private helper, all finite wrapper move
  witnesses, direct raw exports and namespace-derived exports fail; import/local shadows, combined
  lifecycle positives, value-different wrapper compositions, exact deletion/materialization and the
  sole B1-to-C move pass.
- Independent selected reruns confirmed repeated-alias private-helper failure
  (`TRACED_OWNER_IDENTITY_INVALID`), nested wrapper move failure
  (`UNDECLARED_WORK_PATH_MOVE:...:normalized-literal-structure`), namespace direct-export failure
  (`RAW_BINDING_EXPORTED`), namespace private-helper failure (`TRACED_OWNER_IDENTITY_INVALID`), and
  namespace shadow, combined lifecycle and nested-wrapper value-different positives.
- Fresh namespace/CJS variants confirmed direct and literal-computed member paths reach owner
  failures; alias chains retain identity; nested and rest binding patterns fail
  `RAW_ALIAS_WRITE_UNKNOWN`; a nonliteral selector fails `COMPUTED_EFFECT_SELECTOR`; an unknown
  static selector cannot become harmless; and a nearer harmless local namespace remains accepted.
  No unexpected false rejection was observed.
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

This verdict covers only candidate `745473e86ef800ed6176529782cc1c249df9e20a`, linked handoff
commit `ec68b34a02b8039c3c60d77db94586d10103e1e1`, assigned Work and accepted authority. It does not
authorize B1 or any Product/destructive work.

No substantive fix is approved within this reviewer operation. Return the candidate to the owning
v8 measurement Work to make any object-binding initializer that resolves to a known raw,
non-namespace identity fail closed (while retaining harmless lexical shadows), add focused
regressions for private-helper/direct-export/property-destructure variants, freeze a new immutable
meter candidate, and obtain a new different-actor Review.

## Dispatch identity

- role: `check`
- actorId: `product_truth_complexity_v8_review_r6`
- receipt: `fe99f3df9a6548d78ddc1e621f65b21e`
- predecessor: `aeb9a17351a54057aa6d3ff1ebee4dc0`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/handoffs/product-truth-complexity-v8.md`
- verdict: `FAIL`

---
type: "QbD Audit"
title: "Product-truth complexity v8 r3 authority audit"
verdict: "FAIL"
---

# Product-truth complexity v8 r3 authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`interfaces/product-truth-complexity-v8.md`](../interfaces/product-truth-complexity-v8.md)
- Evaluated measurement Work: [`work/product-truth-complexity-v8.md`](../work/product-truth-complexity-v8.md)
- Evaluated Product Works and order: [`work/index.md`](../work/index.md)
- Immutable r3 authority checkpoint: `853101422c8789df014480a4dc58004ca2091b5c`
- Audit output Concept: `qbd/product-truth-complexity-v8-audit.md`
- Actor ID: `product_truth_complexity_v8_qbd_r3`
- Dispatch receipt: `15a02a5d66c34a89bba6a948e1701c46`
- Predecessor receipt: `144cc41d49d3444aa448f073c2e84194`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`

## Verdict

**FAIL**

- Risk: **high** — an untrusted next-Work candidate can manufacture the sole Review-introduction
  commit that v8 treats as authenticated predecessor evidence.
- Decision-critical blocking findings: **1**
- Advisory observations: **0**
- Total findings: **1**

R3 removes the nonexistent `predecessorEvidenceCommitSha`, derives the honest historical witness
deterministically, and preserves all other audited boundaries. It does not close the authorization
gap: strict-v1 authenticates a predecessor operation receipt and its declared output path, but never
binds that operation's completion to any output bytes, Git blob or commit. Unique first-parent
introduction and later blob immutability constrain the shape of whichever evidence a candidate puts
in history; they cannot establish that those bytes were produced or accepted by the predecessor
operation.

This verdict authorizes no v8 implementation, B1 receipt, destructive execution, Product Work
transition or Campaign change.

## Confirmed evidence and passed regression checks

1. The audited Git tree is exactly `853101422c8789df014480a4dc58004ca2091b5c`; the worktree was
   clean at audit start. The r2→r3 diff changes only the linked PRD, Design, interface, measurement
   Work, five Product Works, Work map and prior audit. `git diff --check` passes; no production,
   dependency, meter, fixture, report or user-state byte changed.
2. The r3 predecessor-delta block parses as JSON without duplicate keys. Its canonical sorted-key
   SHA-256 is `8166ea4c611d8f10c7ad7cb38139f2208cbf8ac56af5bb0b761be67a9f2b885d`;
   the literal JSON payload SHA-256 is
   `b0ff86ad8606fe5ef4a9347509c1b36df38b087b691847c054bdbc3bf5bf7ad9`.
   It retains five unique predecessor rows, eleven qualified traced declarations and the finite
   predecessor-anchored structural-site identity.
3. All five Product Work boundary blocks parse without duplicate keys and are canonically identical
   to r2. Their digests, in execution order, remain
   `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`,
   `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`,
   `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`,
   `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`, and
   `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.
   Relative to accepted v7 evidence commit `5632f63603e6ae8b3fb95f759c793a09b16a1e44`,
   B1 adds exactly `scripts/release-smoke.ts` to `production`; every other B1 field and the other
   four fences are unchanged.
4. The requested strict-v1 historical witness is real and deterministic. Operation
   `e227012a8f134ff0b7de29dce9ed9259` has predecessor
   `ac877c8dbc3a425b91129f153deb61f9`; the predecessor operation's exact output is the v7 Review
   path. On current first-parent history, `5632f63603e6ae8b3fb95f759c793a09b16a1e44` is the unique
   commit that changes that path and introduces the matching `PASS` Review. Its reviewed candidate
   is `5c3e61999e1d406873c957dd9dbb6847cc2487b9`; both ancestry checks pass. Review blob
   `fa047d2bf3c62ce87483cea86f6e0b1ed2362eea` and handoff blob
   `fd31a236709a8e2482571423ac1e414cd7d84b40` have zero drift on every later first-parent commit
   through r3.
5. Two fresh B0 executions are byte-identical at SHA-256
   `aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c`.
   The v7 script/config/test remain byte-identical at
   `d2ee14dbe4be887d5e01efa76e57ae87cf435ba2ece5cb0280baf2e5e4682ad2`,
   `79832f82fe60e66cb8ba3f2bb0ed10e91d3557980795732c14ce81a9ff3a8712`, and
   `01b98f4adbece5ff14a31862d923b2b625f97c2b69fb1d985ec66870facc7a90`.
   V7 immutability and its accepted 812-ingress/712-violation B0 remain intact.
6. The earlier declaration/site blocker remains closed. The authority fixes allowed declaration
   kinds and qualified module owners; separates default, class/constructor, overload, re-export and
   nested same-name identities; classifies raw aliases at each lexical use owner; and gives anonymous
   callbacks inherited ownership plus their own AST path. Exact injective predecessor records bind
   lexical ancestry, AST child roles, expression/statement fingerprints, neighbor anchors and
   relative order, so delete-relocate, replacement and reorder cannot spend an old site count.
7. Outside-Work presence/mode/blob/import/ingress/violation equality, selected-Work nontraced
   deletion-only submultisets, exact deletion/materialization, the single B1→C move, unknown and
   forbidden loader/dependency/export/native-addon/raw-public-export failures, and the no-CFG/runtime-
   semantics boundary remain consistent across PRD, Design, interface, five Works and the map.
   Checked relative links resolve except the explicitly prospective handoff outputs of unexecuted
   Works.

## Blocking finding — strict-v1 receipt/output does not authenticate Review content

**Cause.** R3 defines `evidenceCommitSha` as the unique first-parent commit whose changed Review path
contains frontmatter matching the strict-v1 predecessor receipt/output and whose same-tree handoff,
candidate, report and actors agree
(`interfaces/product-truth-complexity-v8.md:85-165,234-262`). These predicates authenticate only
values copied into candidate-readable files. The operation store records the intended output path
at start (`.omp-flow/scripts/common/operation_store.py:80-128`), and dispatch derives
`predecessorOutput` from that record (`.omp-flow/scripts/omp_flow.py:158-183`). Completion validates
only operation state, actor ID and an opaque external action receipt; it neither reads the output
path nor records or validates a Git commit/blob (`operation_store.py:161-193`). The historical
`ac877...` record itself contains no output digest or Git identity
(`.omp-flow/.runtime/operations/ac877c8dbc3a425b91129f153deb61f9.json:1-13`).

The authority says a candidate-authored chain fails, but provides no finite observable that
distinguishes it. Git author/committer text is forgeable and is not bound to `actor_id`; the runtime
receipt is visible to the next assignment and can be copied verbatim into frontmatter.

**Concrete consequence.** A next-Work implementer can start from the claimed reviewed candidate on
a first-parent branch that omits the honest Review evidence, then commit one fabricated `PASS`
Review and matching handoff/report using the known predecessor receipt, output path, actor strings
and candidate SHA, followed by its candidate commit. That fabricated commit is the sole qualifying
introduction; reviewed-candidate→evidence→candidate ancestry passes; actors can be different strings;
and the two fabricated blobs can remain immutable thereafter. Zero/multiple, non-first-parent,
post-introduction mutation and self-review checks all pass, although the real predecessor operation
never produced or accepted either blob. The same construction selects a forged baseline for B1 or
any of the four downstream transitions.

**Affected decision.** V8 still cannot be the sole authorization gate for destructive B1 or later
Product Works. The honest `5632f636...` witness proves that the algorithm can find a good chain; it
does not prove that every accepted chain is good.

**Smallest repair.** Bind predecessor completion to content outside candidate authority: when the
Review operation finishes, the Harness must validate and record either (a) the full evidence commit
SHA plus exact Review/handoff blob IDs, or (b) an equivalently authenticated immutable digest tuple;
the next strict assignment must carry that bound value with the predecessor receipt/output, and v8
must require exact equality before history/ancestry checks. Add one focused negative that creates a
sole forged introduction with copied receipt/actor/frontmatter and proves rejection. Merely checking
Git author metadata is not sufficient.

**Why removal or safe degradation is insufficient.** Removing the binding or trusting a manually
selected/inferred commit restores candidate authority over the baseline. Disabling one path cannot
authenticate the comparison snapshot shared by all five transitions. The only safe degradation is
to keep B1 and all downstream Works stopped, which does not realize the selected v8 gate.

## Findings, assumptions and accepted risk

- Decision-critical findings: one, above.
- Advisory observations: none.
- Confirmed evidence is the honest historical derivation and immutable blobs; the rejected
  assumption is that matching a receipt string in a Git blob proves the operation produced that blob.
- The declaration/site repair and all listed structural regressions are closed in this scope; they
  are not residual risks carried forward.
- No prior human decision accepts candidate-authored predecessor evidence. V7 acceptance covers only
  immutable B0 structural evidence and cannot waive this authorization boundary.
- No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Exact next decision and options

Human calibration is required. Available directions are:

1. **Repair the content-binding blocker:** authorize the smallest Harness/operation binding above,
   preserve every r3 structural and Work boundary, and calibrate the linked repaired authority before
   assigning v8 implementation.
2. **Remove or safely degrade:** keep v8, B1 and all downstream Works stopped and remove the claim
   that strict-v1 receipt/output alone authenticates Review bytes or an evidence commit.
3. **Defer:** retain r3 as rejected design evidence and postpone Product truth consolidation and
   Remote transition.
4. **Stop:** abandon this Work sequence.

The unchanged r3 scope cannot proceed under accepted risk because the missing content binding is
the only distinction between genuine predecessor acceptance and candidate-authored baseline prose.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v8_qbd_r3`
- receipt: `15a02a5d66c34a89bba6a948e1701c46`
- predecessor: `144cc41d49d3444aa448f073c2e84194`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`
- verdict: `FAIL`

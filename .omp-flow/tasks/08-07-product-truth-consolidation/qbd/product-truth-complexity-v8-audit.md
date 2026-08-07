---
type: "QbD Audit"
title: "Product-truth complexity v8 r2 authority audit"
verdict: "FAIL"
---

# Product-truth complexity v8 r2 authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`interfaces/product-truth-complexity-v8.md`](../interfaces/product-truth-complexity-v8.md)
- Evaluated measurement Work: [`work/product-truth-complexity-v8.md`](../work/product-truth-complexity-v8.md)
- Evaluated Product Works: [`work/index.md`](../work/index.md)
- Prior audit: [`qbd/product-truth-complexity-v8-audit.md`](product-truth-complexity-v8-audit.md) at
  predecessor commit `83a62893ba81bf2e828ede2792e339dcef9b2a6e`
- Immutable repaired checkpoint: `52cd7916a1ca360a51a349b6ac6ff6d2cd263508`
- Audit output Concept: `qbd/product-truth-complexity-v8-audit.md`
- Actor ID: `product_truth_complexity_v8_qbd_r2`
- Dispatch receipt: `5942ffd35e944eab91fc318dd6c5c9f8`
- Predecessor receipt: `aece4b48c1714eeba511f0509150c0f1`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`

## Verdict

**FAIL**

- Risk: **high** — the repaired table defines the correct evidence relationship, but the only
  repository runtime cannot supply its required evidence-commit field.
- Decision-critical blocking findings: **1**
- Advisory observations: **0**
- Total findings: **1**

R2 closes the prior declaration/site-identity blocker and preserves every checked structural
boundary. The predecessor repair is conceptually correct but mechanically unrealizable against the
repository's sole operation protocol: v8 requires an authenticated `predecessorEvidenceCommitSha`,
while strict `ompFlowDispatch` v1 and its operation record contain no such field. Meter code would
therefore still need an unauthenticated or candidate-controlled source for the commit that contains
the exact handoff, PASS Review and report.

This verdict authorizes no v8 implementation, B1 receipt, destructive execution, Product Work
transition or Campaign change.

## Confirmed repairs and regression checks

1. The audited Git tree is exactly `52cd7916a1ca360a51a349b6ac6ff6d2cd263508`; the worktree was
   clean at audit start. R2 changes linked PRD/Design/interface/Work documents plus the prior audit,
   and no production, dependency, v1-v7 instrument, fixture, report or user-state byte.
2. The r2 predecessor-delta block parses as JSON with no duplicate key. Its canonical sorted-key
   SHA-256 is `ecdeb085bf0a8d0d049d5a7d56da75718f00b78acf8779e703289e8e6fd80821`;
   the literal JSON payload SHA-256 is
   `b2f5621e6529c9fb2c3caf76a8d5a14de178c87a0f430b43d13b75395ff6662b`.
   It contains five unique Work predecessor rows, eleven qualified traced declarations and a
   twelve-field structural-site record.
3. All five Work blocks parse without duplicate keys and are byte-semantically unchanged from r1.
   Their canonical digests remain, in execution order:
   `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`,
   `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`,
   `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`,
   `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`, and
   `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.
   Relative to the accepted pre-r1 B1 fence, B1 still adds only
   `scripts/release-smoke.ts`; the other four fences remain identical and no additional release
   test path is required.
4. Two fresh B0 executions reproduce byte-identical full JSON SHA-256
   `aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c` and the accepted
   812-ingress/712-violation counts and digests. V7 script/config/test hashes remain
   `d2ee14dbe4be887d5e01efa76e57ae87cf435ba2ece5cb0280baf2e5e4682ad2`,
   `79832f82fe60e66cb8ba3f2bb0ed10e91d3557980795732c14ce81a9ff3a8712`, and
   `01b98f4adbece5ff14a31862d923b2b625f97c2b69fb1d985ec66870facc7a90`.
   R2 therefore preserves v7 immutability and the observational B0 baseline.
5. The prior declaration/site blocker is closed. The machine block now permits only one resolved
   module-scope named-function or const-arrow declaration per frozen owner and assigns qualified
   identities. It explicitly rejects default exports, class members/constructors, overload groups,
   re-export aliases and nested same-name declarations; classifies every local/module raw alias at
   its lexical use owner; gives anonymous callbacks inherited ownership plus a distinct AST path;
   and requires injective predecessor-site matching with lexical ancestry, AST role path,
   expression/statement hashes, neighbor anchors and preserved relative order. Delete-plus-relocate,
   replacement and reorder cannot spend an old tuple count. These are finite AST/binding rules, not
   CFG, value, scheduler, resource-lifetime or runtime semantics.
6. Outside-Work presence/mode/blob/import/ingress/violation equality, selected-Work deletion and
   materialization, the sole Design-declared B1-to-C move, global forbidden/unknown loader,
   dependency/export/native-addon/raw-public-export failures and no-CFG boundary remain explicit and
   consistent across PRD, Design, interface, all five Works and the Work map. `git diff --check`
   passes for the r2 repair.

## Blocking finding — the required authenticated evidence commit does not exist in the operation protocol

**Cause.** R2 correctly distinguishes `reviewedCandidateSha` from `evidenceCommitSha`, freezes exact
handoff/Review/report paths for all five transitions, and requires
`reviewedCandidate -> evidenceCommit -> candidateUnderTest` ancestry
(`interfaces/product-truth-complexity-v8.md:85-154,223-246`). Its only permitted source for the
second SHA is an authenticated runtime operation-record field named
`predecessorEvidenceCommitSha` (`:87,225-230`); candidate, config and report input are expressly
forbidden.

That field does not exist in the repository's operation mechanism. The sole operation interface
accepts only task, entry, role, actor ID, objective, output and optional predecessor, then finishes
with actor/state/external receipt (`.omp-flow/workflow.md:110-125`). The strict v1 descriptor
producer emits only version, Bundle, entry, output, role, actor ID, objective, receipt, predecessor
and predecessor output (`.omp-flow/scripts/omp_flow.py:158-184`). Persistent operation records also
contain no Git/evidence SHA; the current r2 record is a direct witness
(`.omp-flow/.runtime/operations/5942ffd35e944eab91fc318dd6c5c9f8.json:1-13`). A whole-repository
search finds `predecessorEvidenceCommitSha` only in the new authority prose, not in Harness code,
schema, assignment or runtime state.

**Concrete consequence.** The v8 Work is allowed to create only meter/config/tests/fixtures and its
handoff. It cannot implement or extend the operation protocol. At invocation it can authenticate the
predecessor receipt and output path, but not the commit that contains the exact handoff, PASS Review
and report. To continue, meter code must accept a CLI/objective/config/candidate value, inspect the
candidate tree, infer a commit from Git history, or reinterpret the unbound external receipt. Every
option violates the r2 source rule and reopens candidate/branch/old-Review selection. The five-row
table and ancestry checks are then deterministic only after an unauthoritative commit has already
been selected.

**Affected decision.** The first prior blocker remains open at the mechanical handoff boundary.
V8 cannot yet be the sole gate that authorizes destructive B1 or any downstream Product Work, even
though its in-document evidence table is now complete.

**Smallest repair.** Extend the sole OMP operation schema and strict v1-or-new-version assignment so
the predecessor Review operation records a validated full evidence commit SHA at completion and
the next operation carries that exact field unchanged and bound to the predecessor receipt/output.
The runtime must verify the commit exists and contains the predecessor output before producing the
assignment. Then make the v8 Work consume that real field and add one focused Harness/descriptor
round-trip plus tamper negative. Because this changes `.omp-flow` Harness authority outside the
current meter-only Work, give the repair an explicit bounded owner rather than smuggling it into v8
config or objective prose.

**Why removal or safe degradation is insufficient.** Dropping the evidence SHA or accepting an
inferred/manual value defeats the purpose of distinguishing reviewed candidate from later evidence
commit. Hiding, disabling or narrowing candidate behavior cannot authenticate the baseline against
which all outside equality and inside delta decisions are made. The only safe degradation is to
keep B1 and later Works stopped, which does not realize the selected v8 gate.

## Findings, assumptions and accepted risk

- Decision-critical findings: one, above.
- Advisory observations: none.
- The declaration/site repair is accepted within this audit scope; it is not being carried forward
  as residual risk.
- No prior human decision accepts unauthenticated predecessor selection. V7 PASS applies only to
  immutable B0 structure/grammar/evidence and does not waive this v8 authorization boundary.
- No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Exact next decision and options

Human calibration is required. The available directions are:

1. **Repair the one mechanical blocker:** authorize the smallest operation-schema/dispatch change
   above, preserve every r2 Product/measurement boundary, then calibrate the resulting linked
   authority before any meter assignment.
2. **Remove or safely degrade the scope:** keep v8/B1/downstream Works stopped and remove the claim
   that current OMP receipts authenticate a Git evidence commit.
3. **Defer:** retain r2 as rejected design evidence and postpone Product truth consolidation and
   Remote transition.
4. **Stop:** abandon this Work sequence.

The unchanged r2 scope cannot proceed under accepted risk because the missing field is the sole
non-candidate source of the comparison baseline.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v8_qbd_r2`
- receipt: `5942ffd35e944eab91fc318dd6c5c9f8`
- predecessor: `aece4b48c1714eeba511f0509150c0f1`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`
- verdict: `FAIL`

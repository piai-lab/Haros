---
type: "QbD Audit"
title: "Product-truth complexity v8 r4 authority audit"
verdict: "PASS"
---

# Product-truth complexity v8 r4 authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Entry Concept: [`interfaces/product-truth-complexity-v8.md`](../interfaces/product-truth-complexity-v8.md)
- Trust-root Decision: [`decisions/product-truth-complexity-v8-trust-root-calibration.md`](../decisions/product-truth-complexity-v8-trust-root-calibration.md)
- Evaluated measurement Work: [`work/product-truth-complexity-v8.md`](../work/product-truth-complexity-v8.md)
- Evaluated Product Works and order: [`work/index.md`](../work/index.md)
- Immutable r4 authority checkpoint: `23b309b0da3ae65a7809002090a539f6c7ee7c51`
- Audit output Concept: `qbd/product-truth-complexity-v8-audit.md`
- Actor ID: `product_truth_complexity_v8_qbd_r4`
- Dispatch receipt: `c76378063b0e48a4a0aa739499792550`
- Predecessor receipt: `27437883db53468ab5e74788b1a30b75`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`

## Verdict

**PASS**

- Risk: **low** — the remaining trust is explicit Main/human selection of the official evidence
  commit, followed by a different-actor check of the recorded invocation; the meter makes no
  reviewer- or human-authentication claim.
- Decision-critical blocking findings: **0**
- Advisory observations: **0**
- Total findings: **0**

R4 closes the r3 false-authentication blocker. It no longer infers authority from a receipt or Git
history. Main/human orchestration supplies exactly one official full evidence SHA; the meter proves
only deterministic content consistency relative to that trust root, and the later independent
Review compares the recorded full invocation and tuple with the official selection and Decision.
Candidate-authored evidence at any other SHA cannot substitute for the selected commit.

This model verdict does not itself authorize implementation or a Product transition. Human
calibration remains required.

## Confirmed authority repair

1. The linked Decision explicitly accepts the r3 finding that strict-v1 receipt/output is only
   correlation, selects ordinary Main/human orchestration as the trust root, and forbids the meter
   from claiming cryptographic reviewer or human authentication
   (`decisions/product-truth-complexity-v8-trust-root-calibration.md:8-33`). This is an explicit
   authority boundary, not an inferred workflow fact.
2. The machine interface takes `--predecessor-evidence` exactly once, requires lowercase full
   40-hex resolving to a commit, and fails missing, duplicate, abbreviated, malformed or nonexistent
   input before measurement (`interfaces/product-truth-complexity-v8.md:85-98,152-162,255-263`). Its
   forbidden-source list excludes candidate tree, config, fixtures, report, handoff, Review prose,
   receipt, Git author/history inference and environment fallback. No second channel may default,
   replace or override the official input.
3. At the official SHA, v8 reads the five-row table's exact Review, handoff and report paths and
   records a closed ten-field tuple: candidate Work, candidate-under-test SHA, official evidence SHA,
   reviewed-candidate SHA, both blob IDs, report digest, both declared actors and receipt as
   correlation only (`interfaces/product-truth-complexity-v8.md:100-183`). It verifies PASS/content
   agreement, distinct declared actors, reviewed-candidate→evidence→candidate ancestry and exact
   post-evidence blob immutability. Those checks establish content consistency without claiming
   identity authentication.
4. The forged-introduction attack from r3 is closed by selection, not by history inference. A sole
   candidate-authored Review/handoff at a SHA different from the official input is a required hard
   negative in the interface and measurement Work
   (`interfaces/product-truth-complexity-v8.md:330-341`; `work/product-truth-complexity-v8.md:73-90`).
   A candidate cannot manufacture the already-selected Git object ID without changing its bytes; a
   forged alternative is never consulted.
5. The measurement Work is implementable within its bounded files. It owns the single CLI parser,
   exact Git/tree/blob checks, deterministic tuple and focused negatives; it adds no Harness field,
   configuration authority or runtime semantic engine. Its handoff must record the complete command,
   selected SHA and output tuple, and a different actor must compare all three with the official
   invocation and Decision before acceptance
   (`work/product-truth-complexity-v8.md:29-71,97-105`).
6. Each of the five Product Works and the authored map consumes the same official-input rule and
   preserves the later different-actor invocation check. Receipt and Git history remain explicitly
   non-authenticating. The B1 row alone binds the accepted v8 evidence to immutable B0; each later
   row binds the immediately preceding Product Work, with no filename or candidate-selected
   predecessor inference.

## Mechanical and regression evidence

1. The audited Git tree resolves exactly to
   `23b309b0da3ae65a7809002090a539f6c7ee7c51`; the worktree was clean at audit start. The r4 change is
   documentation authority only. No production, dependency, v1-v7 meter, fixture, report or
   user-state byte changed. Commit diff and audit diff pass `git diff --check`.
2. The r4 predecessor-delta authority block parses as JSON with no duplicate key. Its canonical
   sorted-key SHA-256 is
   `578d98e96bb531f41a54525ea0e86ecc586e16071528874fff4a82572ba36d29`; its literal payload SHA-256
   is `8e16ee9716f6cd57b93cd4f1643b31da19a9e450524f46c737eada3b0a1707ea`.
3. All five Product Work boundary blocks parse without duplicate keys and are canonically identical
   to r3. Their digests, in execution order, remain
   `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`,
   `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`,
   `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`,
   `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`, and
   `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.
   Relative to accepted v7 evidence commit `5632f63603e6ae8b3fb95f759c793a09b16a1e44`, B1 adds only
   `scripts/release-smoke.ts`; it removes no path and changes no other boundary field.
4. Two fresh B0 runs are byte-identical at SHA-256
   `aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c`.
   The v7 script/config/test remain byte-identical at
   `d2ee14dbe4be887d5e01efa76e57ae87cf435ba2ece5cb0280baf2e5e4682ad2`,
   `79832f82fe60e66cb8ba3f2bb0ed10e91d3557980795732c14ce81a9ff3a8712`, and
   `01b98f4adbece5ff14a31862d923b2b625f97c2b69fb1d985ec66870facc7a90`.
   V7's accepted 812-ingress/712-violation B0 and all v1-v7 bytes remain immutable.
5. The r3 declaration/site repair is unchanged: finite module-scope declaration kinds and qualified
   identities reject nested same-name, default, class/constructor, overload and re-export ambiguity;
   anonymous callbacks retain distinct AST paths; local/module aliases are classified at use-owner;
   and no undeclared named raw helper is admitted. Injective predecessor site records bind lexical
   ancestry, AST child roles, expression/statement fingerprints, sibling anchors and relative order,
   so relocation, replacement and reorder cannot spend an old site count.
6. Outside-Work presence/mode/blob/import/ingress/violation equality, selected-Work nontraced
   deletion-only submultisets, exact deletion/materialization, the sole B1→C move, global forbidden
   and unknown loader/dependency/export/native-addon/raw-public-export failures, and the no-CFG/
   runtime-semantics boundary are unchanged across PRD, Design, interface, all five Works and map.
7. Checked relative links resolve except the explicitly prospective handoff outputs of unexecuted
   Works. Those paths are exact expected outputs, not missing current authority.

## Findings, counter-evidence and accepted risk

- Decision-critical findings: none.
- Advisory observations: none.
- Strongest counter-case considered: a candidate supplies a forged PASS Review/handoff and chooses
  its commit through config, report, repository history, receipt copying or a fallback. R4 rejects
  every such selector and reads only the full SHA chosen by the official Main/human invocation; the
  focused forged-SHA negative and later invocation Review make the boundary verifiable.
- Accepted risk: Main/human can select the wrong official SHA. That is the deliberately named human
  trust root already used to select candidate SHAs and authorize destructive scope, not a meter claim
  or unresolved technical finding. The later different-actor Review is the required detection layer.
- No real `~/.omnimind`, credential, provider, network or user-state resource was read or changed.

## Exact next decision and options

Human calibration is required. Available directions are:

1. **Accept this PASS:** record the human decision and authorize only the bounded measurement-only v8
   implementation Work. Its candidate still needs the specified zero-finding different-actor Review
   of code, official invocation, handoff and tuple before B1 can start.
2. **Request repair:** reject the explicit trust-root model and identify the exact stronger authority
   required before implementation.
3. **Defer:** retain r4 and this audit as evidence without starting v8 implementation or B1.
4. **Stop:** abandon this Work sequence.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v8_qbd_r4`
- receipt: `c76378063b0e48a4a0aa739499792550`
- predecessor: `27437883db53468ab5e74788b1a30b75`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`
- verdict: `PASS`

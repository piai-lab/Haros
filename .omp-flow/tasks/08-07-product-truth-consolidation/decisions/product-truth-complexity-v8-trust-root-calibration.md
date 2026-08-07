---
type: "Decision"
title: "Product-truth complexity v8 evidence trust-root calibration"
---

# Product-truth complexity v8 evidence trust-root calibration

## Human calibration applied

The [v8 r3 QbD audit](../qbd/product-truth-complexity-v8-audit.md) correctly proves that the
repository's strict-v1 operation receipt and `predecessorOutput` are mechanical correlation values,
not cryptographic authentication of Git bytes or reviewer identity. The Bundle must not ask a
measurement script to manufacture that missing authentication from candidate-readable files, Git
author text or a copied receipt.

Under the maintainer's standing instruction to repair exact blockers and continue without routine
pauses, the selected minimal calibration is an explicit orchestration trust boundary:

- the Main/human orchestration that authorizes the official gate selects one full
  `predecessorEvidenceCommitSha` outside candidate/config/repository authority;
- that selected SHA is an invocation input, never a value inferred from candidate history or
  accepted because candidate-authored Review/handoff prose repeats a receipt;
- the meter validates that the selected commit exists and that its exact Work, handoff, PASS Review,
  report, reviewed-candidate SHA, blobs, actor separation and ancestry are internally consistent and
  remain unchanged through the candidate under test;
- the later different-actor Review independently records and checks the official invocation and its
  selected SHA against this Decision before accepting the meter candidate;
- neither the meter nor omp-flow receipt claims to authenticate a human or reviewer identity. The
  receipt remains only a correlation handle.

This is the same ordinary human trust root that selects the official candidate SHA, authorizes
destructive scope and accepts an independent Review. It is explicit here because pretending that a
local Git traversal can replace it is less safe than naming the boundary.

## Exact v8 repair

The next v8 Design revision must replace the rejected "derive/authenticate the evidence commit from
strict-v1 history" rule with a required official invocation field such as
`--predecessor-evidence <full-sha>` (the exact spelling is owned by the v8 interface). It must:

1. reject a missing, abbreviated, malformed or nonexistent SHA before candidate measurement;
2. reject any candidate/config/report attempt to define, override or infer the official value;
3. validate the selected commit's frozen row, exact handoff/Review/report blobs, PASS verdict,
   reviewed candidate, distinct actors and ancestry using the already repaired declaration/site and
   outside/inside delta rules;
4. include the selected SHA and verified blob/digest tuple in deterministic output;
5. add a negative proving that a sole candidate-authored forged Review/handoff introduction does not
   pass when it differs from the official selected commit;
6. require the different-actor Review to compare the recorded invocation SHA with this calibration
   and the implementation handoff.

The meter may prove content consistency relative to the selected trust root; it may not describe
that proof as cryptographic reviewer authentication.

## Preserved boundaries

This calibration does not modify the omp-flow Harness or operation schema, authorize a new external
service, widen a Product Work, restore CFG/ICFG/SSA semantics, change the accepted v7 instrument, or
expand destructive targets. All r3 qualified declaration/site rules, predecessor delta rules,
outside-Work byte/import/ingress equality, the exact five Work fences and the sole B1 addition of
`scripts/release-smoke.ts` remain unchanged.

No v8 implementation or B1 work may start until a fresh different-actor QbD returns `PASS` with zero
blockers and zero advisories on the repaired authority. A candidate/config-selected evidence SHA,
receipt-string inference or claim of authenticated reviewer identity is a hard failure.

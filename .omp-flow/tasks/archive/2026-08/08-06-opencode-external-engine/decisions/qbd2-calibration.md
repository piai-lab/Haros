---
type: "Decision"
title: "Calibrate QbD 2 ordering repair"
---

# Calibrate QbD 2 ordering repair

## Human decision

The maintainer recorded `REPAIR ordering only` in contract amendment
`omnimind-external-engine-20260806-r1.5` for the independent
[QbD 2 audit](../qbd/work-map-audit.md). The repaired Design and all other Work coverage are
accepted; QbD 2 is not repeated over the same finding.

## Binding ordering

1. Integrate all authorized implementation and pre-review evidence bytes, then create one atomic
   unpushed implementation candidate commit.
2. Run the affected gates, real OpenCode journey and focused real Pi changed-seam journey on that
   exact SHA. The Pi journey asserts zero OpenCode invocation.
3. Create exactly one different-actor implementation Review binding the candidate SHA and evidence.
4. Any byte-changing failure supersedes the unpushed candidate. Replace/amend it so final history
   retains one implementation commit; invalidate affected old-SHA proof and rerun only affected
   proof plus one Review on the replacement SHA.
5. Never rewrite a pushed/shared candidate or when another writer appears; return to Main.
6. After candidate PASS, do not amend it for self-referential metadata. Finish may use one separate
   metadata-only closure commit limited to `.omp-flow` and Campaign governance evidence. The F-13
   evidence SHA remains the reviewed implementation candidate.

This calibration releases Execute under the accepted Work. Campaign promotion and Finish remain
forbidden until candidate-SHA gates and the single independent Review pass.

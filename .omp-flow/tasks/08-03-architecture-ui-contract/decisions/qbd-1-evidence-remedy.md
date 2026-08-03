---
type: "Human Decision"
title: "QbD 1 evidence remedy"
---

# QbD 1 evidence remedy

The independent [repair re-audit](../qbd/design-repair-audit.md) returned
`NEEDS_EVIDENCE`: the repaired PRD and Design closed the substantive design blockers, but the
dirty pre-repair worktree made the architect-wide negative scope claim unreconstructable from the
recorded Bundle blobs alone.

On 2026-08-03 the human confirmed the recommended evidence remedy.

## Decision

Reproduce the exact repaired Bundle transition on an immutable clean Git lineage without changing
the current branch, current index, product/durable documents, tool installation, or `vendor/ui`.

The reproducer must:

1. use a temporary Git index or equivalent isolated plumbing;
2. freeze a complete predecessor commit and a candidate child commit under a dedicated evidence
   ref so an ordinary repository-only reviewer can reconstruct both;
3. keep every non-repair path identical between those commits;
4. make the candidate delta contain only `prd.md`, `design.md`, `index.md`, and the added
   repair-scope evidence Concept;
5. bind the known predecessor/repaired blobs and unchanged
   `vendor/ui=630f17e61abc478114bf83c1d740977c9f68b910` tree;
6. record exact commands, commit/tree/blob IDs, changed paths, ref, and current branch/index/worktree
   non-mutation checks in a new linked evidence Concept;
7. explicitly test and record that exact provenance roots and configured `toolRoots` must be
   ancestry-disjoint in the later governance implementation.

The evidence ref is repository proof, not a product branch and not authorization to implement the
future durable owner/governance repair.

## Next gate

After the replay evidence exists, dispatch a fresh independent auditor with scope limited to the
open E-01 attribution question, the exact replay delta, and the non-blocking cross-partition
ancestry advisory. A `PASS` still requires a new human calibration before Decompose.

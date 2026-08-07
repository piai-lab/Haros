---
type: "Decision"
title: "QbD 1 PASS approval"
---

# QbD 1 PASS approval

## Decision

The maintainer's [repair calibration](qbd1-repair-calibration.md) explicitly directed that a fresh
independent `PASS` with both blockers closed proceed immediately to decomposition and implementation.
The different-actor [repair audit](../qbd/design-repair-audit.md) returned `PASS`, with zero
decision-critical blockers and both prior findings closed. The conditional human authorization is
therefore active; no additional routine-choice pause is required.

This approval preserves the exact destructive boundary and ordering already accepted. It does not
authorize deleting an unclassified database, any nonzero/uncertain protected fact, current
first-public or Package state, credentials, attachment files, Pi-private state, external targets,
workspaces, Git, other homes or unknown paths. It also does not authorize a migration, backup,
restore, alias, wrapper or compatibility track.

## Advisory calibration

The three non-blocking implementation observations are accepted as required evidence shape rather
than scope expansion:

1. prove an exact fingerprint-registry bijection, including negative/unknown registry coverage;
2. trace the whole apply profile for incidental writes and fail the candidate on anything outside
   invocation-owned locks and the exact legacy keys;
3. make B1 mechanically unsplit, with zero production Store/Coordinator extraction surface, and
   record evidence without changing the immutable B1 commit being measured.

These conditions must appear in the bounded Work Concepts and QbD 2 audit. Failure remains
fail-closed during implementation.

## Transition

Proceed to decomposition. The work map must preserve two hard implementation waves: first reach a
green direct-first-public and compatibility-deleted, still-unsplit B1 checkpoint and freeze its full
SHA/clean metrics; only then may Product Store/Coordinator responsibility extraction begin. Native
Host transcript/root work may proceed independently where code ownership does not conflict.

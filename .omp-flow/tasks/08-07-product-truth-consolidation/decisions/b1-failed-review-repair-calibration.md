---
type: "Decision"
title: "B1 failed-review repair calibration"
---

# B1 failed-review repair calibration

## Human calibration applied

The maintainer's standing decision is to retain the approved first-public scope, repair critical
blockers immediately, preserve the exact default-`~/.omnimind` destructive boundary and avoid
another pause for ordinary implementation choices. Applied to the independent
[failed-review repair audit](../qbd/b1-failed-review-repair-audit.md), this selects option 1:
repair both blockers without removing Web or Package cleanup and without weakening A14.

This calibration adds no destructive target and relaxes no exclusion. Credentials, current
first-public state, current/LKG/validated/quarantined Package generations, active leases, Pi-native
state, attachments, external `ResourceRef` targets, user workspaces, Git, global configuration,
other homes and unknown paths remain excluded. Unknown identity or an unproved transition fails
closed. No migration, backup, restore, alias, wrapper, decoder, dual-read or compatibility fallback
may be introduced.

## Required repair

1. Web seals bind the pre-mutation profile/LevelDB identity and exact present v1/v2 target-value
   hashes. One atomic logical batch deletes all and only those present allowlisted keys. Abrupt-kill
   boundaries are before and after the batch. Reopen must prove v1/v2 absence and unchanged g1. The
   tool does not enumerate, hash or claim invariance for unknown logical keys; an API-level trace
   proves the batch contains no other operation.
2. Package cleanup uses immutable per-entry seals plus a deterministic expected transition graph
   computed from the sealed prior state. Each allowed unlink/rmdir transition has an exact next
   state; an unexpected state requires fresh classification and never becomes a new seal inside the
   same apply. Lifecycle, ancestry and invocation-lock proofs are repeated at every boundary.
3. The v2 complexity universe covers every production path owned by all five authored Work
   Concepts and the resolved production import closure that can carry those responsibilities. A
   machine-failing coverage report compares authored allowed production paths and resolved closure
   against the universe and rejects an omitted path, computed/unresolved import or out-of-universe
   responsibility move. Measurement files remain measurement, not direct-tool production.
4. Synchronize the Work-map next entry with this repair and state truthfully that inert,
   non-loadable `.discarding` tombstones block the rebuild tool until convergence but do not require
   a new ordinary-runtime compatibility sentinel.
5. Add a measurement-only Work before B1. It owns only the v2 script/config/universe,
   coverage/negative fixtures, immutable instrument commit and B0 report; it produces a linked
   handoff and receives different-actor review acceptance before any measured production repair.
   The B1 implementation receipt names that accepted meter operation as its predecessor and treats
   the frozen v2 bytes as read-only. This preserves A14 and removes every residual v1 instruction.

## Transition

The repaired PRD, Design, interface, Work and Work-map must receive a fresh different-actor QbD
audit. Only `PASS` with no blocking or advisory finding authorizes freezing v2. V2 is committed and
independently audited before any measured production repair; its B0, repaired B1 and C outputs use
the identical frozen bytes. The rejected `50deefc1f8e904805c5c990756f3048de33c7ad5` remains immutable
historical evidence and is never relabelled as repaired B1.

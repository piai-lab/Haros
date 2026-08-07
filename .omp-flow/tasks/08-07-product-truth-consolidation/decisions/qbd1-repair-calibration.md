---
type: "Decision"
title: "QbD 1 repair calibration"
---

# QbD 1 repair calibration

## Human decision

The maintainer selects option 1 from the first independent
[QbD 1 audit](../qbd/design-audit.md): retain the direct first-public scope, repair both critical
blockers, close both advisory observations in the Design, and submit the resulting Design to a new
independent audit. A fresh `PASS` with these repairs closed is pre-authorized to proceed immediately
to decomposition and implementation; routine implementation choices do not require another pause.

This decision does not broaden destructive authority. It preserves the exact deletion boundary in
[Direct first-public baseline](direct-first-public-baseline.md): only positively identified
pre-baseline state under the default `~/.omnimind` may be destroyed. Credentials, current
first-public state, the current canonical Package generation and its lease/LKG facts, Pi-native
state, attachment files and protected attachment metadata, external `ResourceRef` targets, user
workspaces, Git, global configuration, other homes and unknown paths remain excluded. Any inability
to prove that boundary fails closed. No legacy schema, migration, backup, restore, alias, wrapper or
dual compatibility path may be added as a repair.

## Required repair

1. Whole-file deletion receives a minimal, closed and schema-fixture-specific read-only
   protected-fact preflight on the ephemeral inspection copy. It returns only presence/count and a
   bounded blocker code, never business content. Unknown identity, active Package lease, uncertain
   Run, protected attachment metadata, contradictory closure, undecodable relevant facts or another
   explicitly excluded co-resident fact blocks all deletion.
2. One versioned canonical bidirectional HMAC transcript commits the protocol version, Service
   instance, single-use challenge and canonical `{ lane, packageRoot }`. The Host proof commits to
   the exact accepted binding. Parsing and handshake reject tampering, replay, old/missing/duplicate
   fields, a second binding, concurrent first binding and lane/root mismatch before catalog or
   Package access.
3. The B0/B1/C reduction proof freezes the measuring script version, path/import universe and
   immutable B1 reference SHA before implementation handoff.
4. `inspect` has a literally read-only source contract. It may not create, reap or remove lifecycle
   locks; any lock-mutating exclusivity belongs to `apply`, which repeats the full inspection under
   the declared exclusive locks.

## Closed observation

The older Pi single-chat concern about a constant sibling-zero proof or gateway bypass is closed by
the same-SHA g50 literal Pi/OpenCode gateway evidence with observed sibling prepare/attempt counters.
It is not part of this repair or the next audit unless new contradictory evidence appears.

## Transition

The repaired PRD, Design, decisions and interfaces must be challenged by a different QbD actor.
Only a fresh `PASS` that finds no unresolved blocking consequence activates the maintainer's
conditional authorization to decompose; a new material blocker returns for human calibration.

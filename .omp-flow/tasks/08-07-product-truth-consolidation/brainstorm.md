---
type: "Brainstorm"
title: "Brainstorm: Consolidate Product truth before Remote"
---

# Brainstorm: Consolidate Product truth before Remote

The observable problem is not merely that `ProductControlPlane` is large. OmniMind has no public
release or external compatibility obligation, yet the current production path contains development-
era schema migration and cross-store recovery machinery that can become permanent authority if the
first public baseline is not chosen deliberately. At the same time, existing developer data is real
and must not be destroyed merely because it is unpublished.

The provisional first-principles anchor is therefore: make development data recoverable first,
then replace unshipped steady-state compatibility with one explicit first-public schema, and only
then split the Product control plane along stable domain responsibilities. The principal
contradiction is safety versus simplicity: rebaseline too early and development work is lost;
preserve every historical path forever and the product ships a false compatibility burden plus a
monolithic authority.

The irreducible outcome is a generation-rotated candidate where every affected store has a tested
backup/export and restore proof, startup recognizes exactly the intended public baseline, removed
compatibility has no remaining runtime caller, `ProductControlPlane` delegates to smaller stable
owners without a second state machine, and both production line count and dependency/concept
complexity materially decrease. Failure of backup verification, discovery of a real public schema
consumer, or evidence that a proposed split duplicates transaction authority stops construction.

The strongest counter-hypothesis is that the migration layer already represents necessary durable
recovery and the monolith is an honest transaction boundary; deleting or splitting it would merely
move complexity and weaken atomicity. The linked research questions must actively try to prove that
counter-case before any design is selected.

The maintainer has already authorized rapid autonomous continuation toward the project goal. No
additional product-value choice is currently required; repository evidence will determine whether
the anchor is confirmed, revised, or rejected.

Research confirms the anchor and revises its ordering: the observed default development stores are
older than the current legacy coordinator can decode, so backup/export must be opaque and WAL-aware
before any application migration; isolated restore must precede generation install. Research also
rejects object/table/Engine repository splits: compound Product transactions remain under one State
Store authority, while Engine effects and volatile handles move to one Coordinator behind a thin
facade. No public OmniMind pre-baseline consumer was found. The only remaining human-supplied input
before destructive rotation is the complete list of explicit development homes used outside the
standard roots and the desired backup retention policy.

- [Development store and backup surface](research/development-store-surface.md)
- [Unshipped compatibility inventory](research/unshipped-compatibility.md)
- [Product control-plane responsibility map](research/product-control-plane-map.md)
- [Selected synthesis](research/synthesis.md)
